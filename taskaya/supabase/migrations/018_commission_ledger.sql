-- 018: نظام العمولة: نوع مقدم الخدمة (فرد/مؤسسة) + شرائح حسب السعر + دفتر حسابات لكل مقدم خدمة

-- 1) نوع مقدم الخدمة — يتغير من اللوحة بس
alter table public.provider_profiles
  add column if not exists kind text not null default 'individual' check (kind in ('individual', 'company'));

create or replace function public.guard_provider_kind()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or staff_can('providers', true) then return new; end if;
  if tg_op = 'INSERT' then
    new.kind := 'individual';
  elsif new.kind is distinct from old.kind then
    raise exception 'KIND_ADMIN_ONLY';
  end if;
  return new;
end; $$;

drop trigger if exists trg_provider_zkind on public.provider_profiles;
create trigger trg_provider_zkind before insert or update on public.provider_profiles
  for each row execute function public.guard_provider_kind();

-- 2) الشرائح: نوع مقدم الخدمة + أقل سعر للشريحة
alter table public.commission_rules
  add column if not exists provider_kind text check (provider_kind in ('individual', 'company'));
alter table public.commission_rules
  add column if not exists min_price numeric(12,2) not null default 0 check (min_price >= 0);

-- النسبة حسب: مقدم خدمة معين > قسم معين > نوع (فرد/مؤسسة) > أعلى شريحة السعر يعديها
create or replace function public.commission_rate_for(p_provider uuid, p_service uuid, p_price numeric)
returns numeric language sql stable security definer set search_path = public as $$
  select r.rate_percent from commission_rules r
  where r.is_active
    and (r.provider_id = p_provider or r.provider_id is null)
    and (r.category_id is null or r.category_id = (
      select sc.category_id from services s
      join service_subcategories sc on sc.id = s.subcategory_id
      where s.id = p_service))
    and (r.provider_kind is null or r.provider_kind = (select kind from provider_profiles where id = p_provider))
    and r.min_price <= coalesce(p_price, 0)
  order by (r.provider_id is not null) desc, (r.category_id is not null) desc,
           (r.provider_kind is not null) desc, r.min_price desc, r.created_at desc
  limit 1;
$$;

-- 3) لما الحجز يخلص: نعيد حساب العمولة بالشرائح (بيشتغل بعد trg_booking_guard)
create or replace function public.apply_commission()
returns trigger language plpgsql security definer set search_path = public as $$
declare price numeric; rate numeric;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.provider_id is not null then
    price := coalesce(new.final_price, new.quoted_price);
    if price is not null then
      rate := coalesce(commission_rate_for(new.provider_id, new.service_id, price), 0);
      new.final_price := price;
      new.commission_rate := rate;
      new.commission_amount := round(price * rate / 100, 2);
      new.provider_earning := price - new.commission_amount;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_booking_zcommission on public.bookings;
create trigger trg_booking_zcommission before update on public.bookings
  for each row execute function public.apply_commission();

-- 4) دفتر الحسابات: موجب = على مقدم الخدمة لينا، سالب = ليه عندنا
create table if not exists public.provider_ledger (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id),
  booking_id uuid references public.bookings(id) on delete set null,
  kind text not null check (kind in ('commission', 'online_earning', 'settlement', 'payout', 'adjustment')),
  amount numeric(12,2) not null,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists uq_ledger_booking_kind on public.provider_ledger(booking_id, kind) where booking_id is not null;
create index if not exists idx_ledger_provider on public.provider_ledger(provider_id, created_at desc);
alter table public.provider_ledger enable row level security;

drop policy if exists ledger_staff_read on public.provider_ledger;
create policy ledger_staff_read on public.provider_ledger for select using ((select staff_can('money', false)));
drop policy if exists ledger_own_read on public.provider_ledger;
create policy ledger_own_read on public.provider_ledger for select using (provider_id = (select auth.uid()));

-- كاش → مديونية بالعمولة. أونلاين (دفعة card/wallet مدفوعة) → صافي مقدم الخدمة ليه
create or replace function public.ledger_on_complete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed'
     and new.provider_id is not null and new.commission_amount is not null then
    if exists (select 1 from payment_records p
               where p.booking_id = new.id and p.status = 'paid' and p.method in ('card', 'wallet')) then
      insert into provider_ledger (provider_id, booking_id, kind, amount)
      values (new.provider_id, new.id, 'online_earning', -new.provider_earning)
      on conflict do nothing;
    else
      insert into provider_ledger (provider_id, booking_id, kind, amount)
      values (new.provider_id, new.id, 'commission', new.commission_amount)
      on conflict do nothing;
    end if;
  end if;
  return null;
end; $$;

drop trigger if exists trg_booking_zledger on public.bookings;
create trigger trg_booking_zledger after update on public.bookings
  for each row execute function public.ledger_on_complete();

-- 5) الحجوزات القديمة اللي خلصت → مديونية كاش (رصيد افتتاحي)
insert into public.provider_ledger (provider_id, booking_id, kind, amount, note, created_by, created_at)
select b.provider_id, b.id, 'commission',
       coalesce(b.commission_amount,
         round(coalesce(b.final_price, b.quoted_price)
           * coalesce(public.commission_rate_for(b.provider_id, b.service_id, coalesce(b.final_price, b.quoted_price)), 0) / 100, 2)),
       'رصيد افتتاحي (حجز قديم)', null, b.updated_at
from public.bookings b
where b.status = 'completed' and b.provider_id is not null
  and coalesce(b.commission_amount, b.final_price, b.quoted_price) is not null
on conflict do nothing;

-- 6) دوال اللوحة
create or replace function public.admin_commission_overview(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  if not staff_can('money', false) then raise exception 'FORBIDDEN'; end if;
  with bal as (
    select provider_id, sum(amount) as balance, max(created_at) as last_at
    from provider_ledger group by provider_id
  ), period as (
    select coalesce(sum(b.commission_amount), 0) as commission, count(*) as bookings,
           coalesce(sum(b.final_price), 0) as volume
    from provider_ledger l join bookings b on b.id = l.booking_id
    where l.kind in ('commission', 'online_earning') and l.created_at >= p_from and l.created_at < p_to
  )
  select jsonb_build_object(
    'commission', (select commission from period),
    'bookings', (select bookings from period),
    'volume', (select volume from period),
    'debt_total', (select coalesce(sum(balance), 0) from bal where balance > 0),
    'owed_total', (select coalesce(-sum(balance), 0) from bal where balance < 0),
    'settled', (select coalesce(-sum(amount), 0) from provider_ledger
                where kind = 'settlement' and created_at >= p_from and created_at < p_to),
    'providers', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.business_name, 'kind', p.kind, 'logo_url', p.logo_url,
               'balance', coalesce(bal.balance, 0), 'last_at', bal.last_at)
             order by coalesce(bal.balance, 0) desc, p.business_name)
      from provider_profiles p left join bal on bal.provider_id = p.id
      where p.status in ('approved', 'suspended') or bal.balance is not null), '[]'::jsonb)
  ) into res;
  return res;
end; $$;

create or replace function public.admin_provider_statement(p_provider uuid)
returns table (id uuid, created_at timestamptz, kind text, amount numeric, balance numeric, note text,
               booking_number bigint, booking_id uuid, price numeric, rate numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not staff_can('money', false) then raise exception 'FORBIDDEN'; end if;
  return query
  select l.id, l.created_at, l.kind, l.amount,
         sum(l.amount) over (order by l.created_at, l.id) as balance,
         l.note, b.booking_number, l.booking_id, b.final_price, b.commission_rate
  from provider_ledger l left join bookings b on b.id = l.booking_id
  where l.provider_id = p_provider
  order by l.created_at desc, l.id desc;
end; $$;

-- سداد (مقدم الخدمة دفعلك) / تحويل (إنت دفعتله) / تسوية يدوي (موجب = عليه، سالب = ليه)
create or replace function public.admin_ledger_entry(p_provider uuid, p_kind text, p_amount numeric, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not staff_can('money', true) then raise exception 'FORBIDDEN'; end if;
  if p_kind not in ('settlement', 'payout', 'adjustment') then raise exception 'BAD_KIND'; end if;
  if p_amount is null or p_amount = 0 or (p_kind <> 'adjustment' and p_amount < 0) then raise exception 'BAD_AMOUNT'; end if;
  insert into provider_ledger (provider_id, kind, amount, note)
  values (p_provider, p_kind, case when p_kind = 'settlement' then -p_amount else p_amount end, nullif(trim(p_note), ''));
end; $$;

revoke execute on function public.admin_commission_overview(timestamptz, timestamptz) from anon;
revoke execute on function public.admin_provider_statement(uuid) from anon;
revoke execute on function public.admin_ledger_entry(uuid, text, numeric, text) from anon;
grant execute on function public.admin_commission_overview(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_provider_statement(uuid) to authenticated;
grant execute on function public.admin_ledger_entry(uuid, text, numeric, text) to authenticated;

-- 7) أعضاء الفريق اللي معاهم صلاحية الفلوس يشوفوا/يعدّلوا الشرائح
drop policy if exists rules_staff_read on public.commission_rules;
create policy rules_staff_read on public.commission_rules for select using ((select staff_can('money', false)));
drop policy if exists rules_staff_write on public.commission_rules;
create policy rules_staff_write on public.commission_rules for all
  using ((select staff_can('money', true))) with check ((select staff_can('money', true)));
