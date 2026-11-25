-- 022: تسجيل مقدم الخدمة من التطبيق + مراجعة الخدمات من اللوحة قبل ما تظهر للعملاء

-- 1) لما مقدم خدمة يسجّل بنفسه من التطبيق: يتعمله ملف نشاط (مستني موافقة) باسمه
--    (حسابات اللوحة مش بتبعت self_signup، فمفيش تكرار مع create-provider)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r user_role := 'customer';
begin
  if new.raw_user_meta_data->>'role' = 'provider' then r := 'provider'; end if;
  insert into profiles (id, role, full_name, phone, email)
  values (new.id, r, new.raw_user_meta_data->>'full_name', nullif(new.phone, ''), new.email);
  if r = 'provider' and new.raw_user_meta_data->>'self_signup' = 'true' then
    insert into provider_profiles (id, business_name, status, kind)
    values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'مقدم خدمة'), 'pending', 'individual')
    on conflict (id) do nothing;
  end if;
  return new;
end; $$;

-- 2) حالة المراجعة لكل خدمة (القديم والمتضاف من اللوحة = مقبول)
alter table public.provider_services add column if not exists review_status text not null default 'approved'
  check (review_status in ('pending', 'approved', 'rejected'));
alter table public.provider_services add column if not exists review_note text;
alter table public.provider_services add column if not exists reviewed_at timestamptz;
create index if not exists idx_pservices_review on public.provider_services(review_status) where review_status = 'pending';

-- 3) حماية: مقدم الخدمة مايقدرش يفعّل خدمته بنفسه
create or replace function public.guard_provider_service()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or staff_can('providers', true) then return new; end if;
  if tg_op = 'INSERT' then
    new.review_status := 'pending';
    new.is_active := false;
    new.review_note := null;
    new.reviewed_at := null;
    return new;
  end if;
  if new.review_status is distinct from old.review_status
     or new.review_note is distinct from old.review_note
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'ADMIN_ONLY';
  end if;
  -- غيّر السعر أو نوعه أو الخدمة نفسها → ترجع للمراجعة
  if new.service_id is distinct from old.service_id
     or new.pricing_model is distinct from old.pricing_model
     or new.base_price is distinct from old.base_price then
    new.review_status := 'pending';
    new.is_active := false;
    return new;
  end if;
  -- يقدر يوقف خدمة مقبولة ويرجّعها، بس مايفعّلش حاجة لسه متراجعتش
  if new.is_active and not old.is_active and old.review_status <> 'approved' then
    raise exception 'NEEDS_REVIEW';
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_provider_service on public.provider_services;
create trigger trg_guard_provider_service before insert or update on public.provider_services
  for each row execute function public.guard_provider_service();

-- 4) مراجعة الخدمة من اللوحة: قبول (مع تعديل السعر لو حبيت) أو رفض بسبب
--    أول قبول لمقدم خدمة جديد بيفعّل حسابه كمان
create or replace function public.admin_review_service(p_id uuid, p_approve boolean, p_note text default null, p_price numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid; svc text;
begin
  if not staff_can('providers', true) then raise exception 'FORBIDDEN'; end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'REASON_REQUIRED'; end if;

  update provider_services
     set review_status = case when p_approve then 'approved' else 'rejected' end,
         is_active = p_approve,
         review_note = case when p_approve then null else trim(p_note) end,
         reviewed_at = now(),
         base_price = case when p_approve and p_price is not null then p_price else base_price end
   where id = p_id
  returning provider_id into pid;
  if pid is null then raise exception 'NOT_FOUND'; end if;

  if p_approve then
    update provider_profiles set status = 'approved', rejection_reason = null where id = pid and status = 'pending';
  end if;

  select coalesce(ps.title, s.name_ar) into svc
  from provider_services ps join services s on s.id = ps.service_id where ps.id = p_id;

  insert into notifications (user_id, title, body, data)
  values (
    pid,
    case when p_approve then 'تم قبول خدمتك ✅' else 'خدمتك محتاجة تعديل' end,
    case when p_approve then coalesce(svc, '') || ' · هتظهر للعملاء دلوقتي' else coalesce(svc, '') || ' · ' || trim(p_note) end,
    jsonb_build_object('kind', 'service_review', 'url', '/pro/services', 'provider_service_id', p_id)
  );
end; $$;

revoke execute on function public.admin_review_service(uuid, boolean, text, numeric) from anon;
grant execute on function public.admin_review_service(uuid, boolean, text, numeric) to authenticated;
