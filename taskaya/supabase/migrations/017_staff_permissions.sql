-- ============================================================
-- 017: Team accounts (role 'staff') with per-section permissions
-- NOTE: run `alter type public.user_role add value if not exists 'staff';` ALONE first.
-- ============================================================

-- ===== 1) جدول الصلاحيات: سطر لكل عضو فريق =====
create table if not exists public.staff_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  home boolean not null default true,
  money boolean not null default false,
  bookings text not null default 'none' check (bookings in ('none','view','edit')),
  providers text not null default 'none' check (providers in ('none','view','edit')),
  catalog text not null default 'none' check (catalog in ('none','view','edit')),
  team boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.staff_permissions enable row level security;

-- ===== 2) السؤال المركزي: "المستخدم ده يقدر يعمل كذا؟" =====
-- المالك (admin) = كل حاجة. عضو الفريق = حسب الجدول (ولازم يكون مفعّل)
create or replace function public.staff_can(p_section text, p_edit boolean default false)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from profiles where id = auth.uid() and role = 'admin' and is_active) then true
    else coalesce((
      select case p_section
        when 'home' then sp.home
        when 'money' then sp.money
        when 'team' then sp.team
        when 'bookings' then sp.bookings = 'edit' or (not p_edit and sp.bookings = 'view')
        when 'providers' then sp.providers = 'edit' or (not p_edit and sp.providers = 'view')
        when 'catalog' then sp.catalog = 'edit' or (not p_edit and sp.catalog = 'view')
        else false end
      from staff_permissions sp join profiles p on p.id = sp.user_id
      where sp.user_id = auth.uid() and p.role = 'staff' and p.is_active
    ), false)
  end;
$$;
revoke execute on function public.staff_can(text, boolean) from anon;
grant execute on function public.staff_can(text, boolean) to authenticated;

-- ===== 3) قواعد الحماية لأعضاء الفريق (بتتضاف جنب قواعد المالك) =====
drop policy if exists staff_perm_read on public.staff_permissions;
create policy staff_perm_read on public.staff_permissions for select
  using (user_id = (select auth.uid()) or (select public.staff_can('team')));

do $$
declare t text;
begin
  -- الحجوزات: قراءة
  foreach t in array array['bookings','booking_status_history','addresses','quotations'] loop
    execute format('drop policy if exists staff_read on public.%I', t);
    execute format('create policy staff_read on public.%I for select using ((select public.staff_can(''bookings'')))', t);
  end loop;
  -- مقدمي الخدمة: قراءة
  foreach t in array array['provider_services','provider_coverage'] loop
    execute format('drop policy if exists staff_read on public.%I', t);
    execute format('create policy staff_read on public.%I for select using ((select public.staff_can(''providers'')))', t);
  end loop;
  execute 'drop policy if exists staff_read on public.provider_profiles';
  execute 'create policy staff_read on public.provider_profiles for select using ((select public.staff_can(''providers'')) or (select public.staff_can(''bookings'')))';
  -- أسماء العملاء/المقدمين/الفريق
  execute 'drop policy if exists staff_read on public.profiles';
  execute 'create policy staff_read on public.profiles for select using ((select public.staff_can(''bookings'')) or (select public.staff_can(''providers'')) or (select public.staff_can(''team'')))';
  -- الأقسام والمناطق: قراءة (حتى المقفول منها)
  foreach t in array array['service_categories','service_subcategories','services','cities','service_areas'] loop
    execute format('drop policy if exists staff_read on public.%I', t);
    execute format('create policy staff_read on public.%I for select using ((select public.staff_can(''catalog'')) or (select public.staff_can(''providers'')) or (select public.staff_can(''bookings'')))', t);
  end loop;

  -- تعديل الحجوزات
  execute 'drop policy if exists staff_write on public.bookings';
  execute 'create policy staff_write on public.bookings for update using ((select public.staff_can(''bookings'', true))) with check ((select public.staff_can(''bookings'', true)))';
  -- تعديل مقدمي الخدمة
  execute 'drop policy if exists staff_write on public.provider_profiles';
  execute 'create policy staff_write on public.provider_profiles for update using ((select public.staff_can(''providers'', true))) with check ((select public.staff_can(''providers'', true)))';
  -- تعديل الأقسام والخدمات (إضافة/تعديل/حذف)
  foreach t in array array['service_categories','service_subcategories','services'] loop
    execute format('drop policy if exists staff_write on public.%I', t);
    execute format('create policy staff_write on public.%I for all using ((select public.staff_can(''catalog'', true))) with check ((select public.staff_can(''catalog'', true)))', t);
  end loop;
end $$;

-- صور مقدمي الخدمة: الرفع لأي حد معاه "تعديل مقدمي الخدمة"
drop policy if exists "providers admin insert" on storage.objects;
drop policy if exists "providers admin update" on storage.objects;
drop policy if exists "providers admin delete" on storage.objects;
create policy "providers admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'providers' and public.staff_can('providers', true));
create policy "providers admin update" on storage.objects for update to authenticated
  using (bucket_id = 'providers' and public.staff_can('providers', true));
create policy "providers admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'providers' and public.staff_can('providers', true));

-- ===== 4) الدوال اللي كانت بتسأل is_admin() =====

-- حماية ملف مقدم الخدمة
create or replace function public.guard_provider_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.staff_can('providers', true)
     and coalesce(current_setting('app.bypass_guard', true), 'off') <> 'on' then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.is_verified := false;
      new.is_featured := false;
      new.rating_avg := 0;
      new.rating_count := 0;
      new.rejection_reason := null;
    else
      if new.status <> old.status
         or new.is_verified <> old.is_verified
         or new.is_featured <> old.is_featured
         or new.rating_avg <> old.rating_avg
         or new.rating_count <> old.rating_count
         or new.rejection_reason is distinct from old.rejection_reason then
        raise exception 'Not allowed to change admin-controlled fields';
      end if;
    end if;
  end if;
  return new;
end; $$;

-- حماية الحجز (نفس 014 — "adm" بقت: عنده صلاحية تعديل الحجوزات)
create or replace function public.guard_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  adm boolean := public.staff_can('bookings', true);
  trusted boolean := auth.uid() is null or coalesce(current_setting('taskaya.trusted', true), '') = '1';
  ok boolean;
  rate numeric;
  price numeric;
begin
  if not trusted and (new.quoted_price is distinct from old.quoted_price
                      or new.final_price is distinct from old.final_price
                      or new.pricing_model is distinct from old.pricing_model) then
    raise exception 'PRICE_NEEDS_QUOTE';
  end if;
  if actor is not null and not adm and not trusted then
    if new.customer_id <> old.customer_id
       or new.service_id <> old.service_id
       or new.provider_id is distinct from old.provider_id
       or new.provider_service_id is distinct from old.provider_service_id
       or new.commission_rate is distinct from old.commission_rate
       or new.commission_amount is distinct from old.commission_amount
       or new.provider_earning is distinct from old.provider_earning
       or new.idempotency_key is distinct from old.idempotency_key
       or new.quote_prev_status is distinct from old.quote_prev_status
       or new.quote_prev_price is distinct from old.quote_prev_price
       or new.quote_note is distinct from old.quote_note then
      raise exception 'Protected booking fields cannot be changed';
    end if;
  end if;
  if new.status <> old.status then
    ok := case old.status
      when 'pending' then new.status in ('accepted','quotation_submitted','awaiting_customer_approval','rejected','cancelled')
                          or (new.status = 'confirmed' and old.pricing_model is distinct from 'custom_quote')
      when 'accepted' then new.status in ('confirmed','quotation_submitted','awaiting_customer_approval','cancelled')
      when 'quotation_submitted' then new.status in ('awaiting_customer_approval','cancelled')
      when 'awaiting_customer_approval' then new.status in ('confirmed','in_progress','quotation_submitted','cancelled')
      when 'confirmed' then new.status in ('in_progress','awaiting_customer_approval','cancelled')
      when 'in_progress' then new.status in ('completed','awaiting_customer_approval','cancelled')
      else false end;
    if not ok then
      raise exception 'Invalid status transition % -> %', old.status, new.status;
    end if;
    if not trusted then
      if new.status = 'awaiting_customer_approval' then raise exception 'USE_SEND_QUOTE'; end if;
      if old.status = 'awaiting_customer_approval' and new.status <> 'cancelled' then raise exception 'USE_ANSWER_QUOTE'; end if;
    end if;
    if actor is not null and not adm and not trusted then
      if actor = old.customer_id then
        if new.status <> 'cancelled' then raise exception 'Customer cannot make this change'; end if;
      elsif actor is distinct from old.provider_id then
        raise exception 'Not allowed';
      end if;
    end if;
    if new.status = 'completed' then
      price := coalesce(new.final_price, new.quoted_price);
      if price is null then raise exception 'Price is required to complete the booking'; end if;
      rate := coalesce(get_commission_rate(new.provider_id, new.service_id), 0);
      new.final_price := price;
      new.commission_rate := rate;
      new.commission_amount := round(price * rate / 100, 2);
      new.provider_earning := price - new.commission_amount;
    end if;
  end if;
  return new;
end; $$;

-- إرسال عرض سعر
create or replace function public.send_quote(p_booking uuid, p_price numeric, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype;
begin
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (public.staff_can('bookings', true) or b.provider_id = auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
  if p_price is null or p_price < 0 then raise exception 'BAD_PRICE'; end if;
  if b.status not in ('pending','accepted','quotation_submitted','confirmed','in_progress','awaiting_customer_approval') then
    raise exception 'QUOTE_NOT_ALLOWED';
  end if;
  perform set_config('taskaya.trusted', '1', true);
  if b.provider_id is not null then
    update quotations set status = 'rejected' where booking_id = b.id and status = 'submitted';
    insert into quotations (booking_id, provider_id, price, notes)
    values (b.id, b.provider_id, p_price, nullif(trim(p_note), ''));
  end if;
  update bookings set
    quote_prev_status = case when b.status = 'awaiting_customer_approval' then b.quote_prev_status else b.status end,
    quote_prev_price  = case when b.status = 'awaiting_customer_approval' then b.quote_prev_price else b.quoted_price end,
    quote_note = nullif(trim(p_note), ''),
    quoted_price = p_price,
    status = 'awaiting_customer_approval'
  where id = b.id;
  perform set_config('taskaya.trusted', '0', true);
end; $$;

-- رد على عرض السعر
create or replace function public.answer_quote(p_booking uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  b bookings%rowtype;
  nxt booking_status;
begin
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (public.staff_can('bookings', true) or b.customer_id = auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
  if b.status <> 'awaiting_customer_approval' then raise exception 'NO_PENDING_QUOTE'; end if;
  perform set_config('taskaya.trusted', '1', true);
  if p_accept then
    update quotations set status = 'accepted' where booking_id = b.id and status = 'submitted';
    nxt := case when b.quote_prev_status = 'in_progress' then 'in_progress'::booking_status else 'confirmed'::booking_status end;
    update bookings set status = nxt, quote_prev_status = null, quote_prev_price = null where id = b.id;
  else
    update quotations set status = 'rejected' where booking_id = b.id and status = 'submitted';
    if b.quote_prev_status in ('confirmed','in_progress') then
      nxt := b.quote_prev_status;
      update bookings set status = nxt, quoted_price = b.quote_prev_price,
        quote_prev_status = null, quote_prev_price = null, quote_note = null
      where id = b.id;
    else
      nxt := 'cancelled';
      update bookings set status = 'cancelled', cancel_reason = 'رفض العميل عرض السعر',
        quote_prev_status = null, quote_prev_price = null
      where id = b.id;
    end if;
  end if;
  perform set_config('taskaya.trusted', '0', true);
  return nxt::text;
end; $$;

-- حذف من الأقسام والخدمات
create or replace function public.admin_delete_catalog(p_kind text, p_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  svc_ids uuid[];
  n_ps int;
  n_bk int;
begin
  if not public.staff_can('catalog', true) then raise exception 'NOT_ADMIN'; end if;
  if p_kind = 'svc' then
    svc_ids := array[p_id];
  elsif p_kind = 'sub' then
    select coalesce(array_agg(id), '{}') into svc_ids from services where subcategory_id = p_id;
  elsif p_kind = 'cat' then
    select coalesce(array_agg(s.id), '{}') into svc_ids
    from services s join service_subcategories sc on sc.id = s.subcategory_id
    where sc.category_id = p_id;
  else
    raise exception 'BAD_KIND';
  end if;
  select count(*) into n_ps from provider_services where service_id = any(svc_ids);
  select count(*) into n_bk from bookings where service_id = any(svc_ids);
  if n_ps > 0 or n_bk > 0 then
    raise exception 'IN_USE:%:%', n_ps, n_bk;
  end if;
  delete from services where id = any(svc_ids);
  if p_kind = 'sub' then
    delete from service_subcategories where id = p_id;
  elsif p_kind = 'cat' then
    delete from commission_rules where category_id = p_id;
    delete from service_subcategories where category_id = p_id;
    delete from service_categories where id = p_id;
  end if;
end; $$;

-- أرقام الرئيسية: لأي حد معاه "الرئيسية" — والفلوس بس لو معاه "الإيرادات والعمولة"
create or replace function public.admin_dashboard(p_days int default 7)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  tz constant text := 'Africa/Cairo';
  d int := greatest(1, least(coalesce(p_days, 7), 90));
  today date := (now() at time zone 'Africa/Cairo')::date;
  start_ts timestamptz;
  prev_ts timestamptz;
  today_ts timestamptz;
  can_money boolean;
begin
  if not public.staff_can('home') then raise exception 'NOT_ADMIN'; end if;
  can_money := public.staff_can('money');
  start_ts := (today - (d - 1))::timestamp at time zone tz;
  prev_ts  := (today - (2 * d - 1))::timestamp at time zone tz;
  today_ts := today::timestamp at time zone tz;

  return (
    with done as (
      select b.id, b.final_price, b.commission_amount, max(h.created_at) as done_at
      from booking_status_history h
      join bookings b on b.id = h.booking_id
      where h.to_status = 'completed' and b.status = 'completed' and h.created_at >= prev_ts
      group by b.id, b.final_price, b.commission_amount
    ),
    needs as (
      select b.id, b.booking_number, b.status,
             coalesce((select max(h.created_at) from booking_status_history h where h.booking_id = b.id), b.created_at) as since,
             s.name_ar as service, p.full_name as customer
      from bookings b
      join services s on s.id = b.service_id
      left join profiles p on p.id = b.customer_id
      where b.status in ('pending', 'awaiting_customer_approval')
    ),
    needs_f as (
      select * from needs where status = 'pending' or since < now() - interval '24 hours'
    )
    select json_build_object(
      'days', d,
      'can_money', can_money,
      'counts', json_build_object(
        'pending', (select count(*) from bookings where status = 'pending'),
        'awaiting', (select count(*) from bookings where status = 'awaiting_customer_approval'),
        'active', (select count(*) from bookings where status in ('accepted', 'confirmed', 'in_progress')),
        'created', (select count(*) from bookings where created_at >= start_ts),
        'created_prev', (select count(*) from bookings where created_at >= prev_ts and created_at < start_ts),
        'completed', (select count(*) from done where done_at >= start_ts),
        'completed_prev', (select count(*) from done where done_at < start_ts)
      ),
      'money', case when can_money then json_build_object(
        'revenue', (select coalesce(sum(final_price), 0) from done where done_at >= start_ts),
        'revenue_prev', (select coalesce(sum(final_price), 0) from done where done_at < start_ts),
        'commission', (select coalesce(sum(commission_amount), 0) from done where done_at >= start_ts),
        'commission_prev', (select coalesce(sum(commission_amount), 0) from done where done_at < start_ts),
        'today_revenue', (select coalesce(sum(final_price), 0) from done where done_at >= today_ts),
        'today_commission', (select coalesce(sum(commission_amount), 0) from done where done_at >= today_ts)
      ) else null end,
      'series', (
        select json_agg(json_build_object(
          'day', g.day,
          'created', (select count(*) from bookings b where (b.created_at at time zone tz)::date = g.day),
          'completed', (select count(*) from done x where (x.done_at at time zone tz)::date = g.day),
          'revenue', case when can_money then (select coalesce(sum(x.final_price), 0) from done x where (x.done_at at time zone tz)::date = g.day) else 0 end
        ) order by g.day)
        from (select gs::date as day from generate_series((today - (d - 1))::timestamp, today::timestamp, interval '1 day') gs) g
      ),
      'needs_total', (select count(*) from needs_f),
      'needs', coalesce((select json_agg(x order by x.since) from (
          select id, booking_number, status, since, service, customer from needs_f order by since limit 8) x), '[]'::json),
      'top_providers', coalesce((select json_agg(x) from (
          select pp.business_name as name, count(*) as n
          from bookings b join provider_profiles pp on pp.id = b.provider_id
          where b.created_at >= start_ts group by pp.business_name order by n desc limit 5) x), '[]'::json),
      'top_services', coalesce((select json_agg(x) from (
          select s.name_ar as name, count(*) as n
          from bookings b join services s on s.id = b.service_id
          where b.created_at >= start_ts group by s.name_ar order by n desc limit 5) x), '[]'::json),
      'recent', coalesce((select json_agg(x) from (
          select b.id, b.booking_number, b.status, b.created_at, s.name_ar as service, p.full_name as customer
          from bookings b join services s on s.id = b.service_id left join profiles p on p.id = b.customer_id
          order by b.created_at desc limit 5) x), '[]'::json)
    )
  );
end; $$;
revoke execute on function public.admin_dashboard(int) from anon;
grant execute on function public.admin_dashboard(int) to authenticated;
