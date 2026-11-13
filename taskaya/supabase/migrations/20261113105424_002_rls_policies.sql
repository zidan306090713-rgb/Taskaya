-- ===== Helpers =====
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.is_approved_provider(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from provider_profiles where id = pid and status = 'approved');
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_touch before update on profiles
  for each row execute function touch_updated_at();
create trigger trg_provider_profiles_touch before update on provider_profiles
  for each row execute function touch_updated_at();
create trigger trg_bookings_touch before update on bookings
  for each row execute function touch_updated_at();

-- ===== New user -> profile =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r user_role := 'customer';
begin
  if new.raw_user_meta_data->>'role' = 'provider' then r := 'provider'; end if;
  insert into profiles (id, role, full_name, phone, email)
  values (new.id, r, new.raw_user_meta_data->>'full_name', nullif(new.phone, ''), new.email);
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Profile guard =====
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.role <> old.role or new.is_active <> old.is_active or new.id <> old.id then
      raise exception 'Not allowed to change role or active flag';
    end if;
  end if;
  return new;
end; $$;

create trigger trg_guard_profile before update on profiles
  for each row execute function guard_profile_update();

-- ===== Provider profile guard =====
create or replace function public.guard_provider_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin()
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

create trigger trg_guard_provider before insert or update on provider_profiles
  for each row execute function guard_provider_profile();

-- ===== Reviews =====
create or replace function public.prepare_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype;
begin
  select * into b from bookings where id = new.booking_id;
  if not found or b.status <> 'completed' then
    raise exception 'Booking must be completed before review';
  end if;
  if auth.uid() is not null and b.customer_id <> auth.uid() then
    raise exception 'Not your booking';
  end if;
  new.customer_id := b.customer_id;
  new.provider_id := b.provider_id;
  return new;
end; $$;

create trigger trg_review_prepare before insert on reviews
  for each row execute function prepare_review();

create or replace function public.refresh_provider_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.provider_id, old.provider_id);
begin
  perform set_config('app.bypass_guard', 'on', true);
  update provider_profiles set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from reviews
                           where provider_id = pid and not is_hidden), 0),
    rating_count = (select count(*) from reviews where provider_id = pid and not is_hidden)
  where id = pid;
  perform set_config('app.bypass_guard', 'off', true);
  return null;
end; $$;

create trigger trg_reviews_rating after insert or update or delete on reviews
  for each row execute function refresh_provider_rating();

-- ===== Commission lookup =====
create or replace function public.get_commission_rate(p_provider uuid, p_service uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select r.rate_percent from commission_rules r
  where r.is_active
    and (r.provider_id = p_provider or r.provider_id is null)
    and (r.category_id is null or r.category_id = (
      select sc.category_id from services s
      join service_subcategories sc on sc.id = s.subcategory_id
      where s.id = p_service))
  order by (r.provider_id is not null) desc, (r.category_id is not null) desc, r.created_at desc
  limit 1;
$$;

-- ===== Booking insert =====
create or replace function public.prepare_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare ps provider_services%rowtype;
begin
  if auth.uid() is not null and not is_admin() then
    new.customer_id := auth.uid();
  end if;
  new.status := 'pending';
  new.final_price := null;
  new.quoted_price := null;
  new.commission_rate := null;
  new.commission_amount := null;
  new.provider_earning := null;

  if new.provider_service_id is not null then
    select * into ps from provider_services where id = new.provider_service_id and is_active;
    if not found or not is_approved_provider(ps.provider_id) then
      raise exception 'Service not available';
    end if;
    new.provider_id := ps.provider_id;
    new.service_id := ps.service_id;
    new.pricing_model := ps.pricing_model;
    new.method := 'direct';
    if ps.pricing_model = 'fixed' then new.quoted_price := ps.base_price; end if;
  else
    new.pricing_model := 'custom_quote';
    if new.provider_id is null then new.method := 'recommended'; end if;
  end if;

  if new.provider_id is not null and not is_approved_provider(new.provider_id) then
    raise exception 'Provider not available';
  end if;
  if new.address_id is not null and not exists (
    select 1 from addresses where id = new.address_id and customer_id = new.customer_id) then
    raise exception 'Invalid address';
  end if;
  return new;
end; $$;

create trigger trg_booking_prepare before insert on bookings
  for each row execute function prepare_booking();

-- ===== Booking update: guards, transitions, commission =====
create or replace function public.guard_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  adm boolean := is_admin();
  ok boolean;
  rate numeric;
  price numeric;
begin
  if actor is not null and not adm then
    if new.customer_id <> old.customer_id
       or new.service_id <> old.service_id
       or new.provider_id is distinct from old.provider_id
       or new.provider_service_id is distinct from old.provider_service_id
       or new.commission_rate is distinct from old.commission_rate
       or new.commission_amount is distinct from old.commission_amount
       or new.provider_earning is distinct from old.provider_earning
       or new.idempotency_key is distinct from old.idempotency_key then
      raise exception 'Protected booking fields cannot be changed';
    end if;
    if actor = old.customer_id and (
       new.quoted_price is distinct from old.quoted_price
       or new.final_price is distinct from old.final_price
       or new.pricing_model is distinct from old.pricing_model) then
      raise exception 'Customers cannot change prices';
    end if;
  end if;

  if new.status <> old.status then
    ok := case old.status
      when 'pending' then new.status in ('accepted','quotation_submitted','rejected','cancelled')
      when 'accepted' then new.status in ('confirmed','quotation_submitted','cancelled')
      when 'quotation_submitted' then new.status in ('awaiting_customer_approval','cancelled')
      when 'awaiting_customer_approval' then new.status in ('confirmed','quotation_submitted','cancelled')
      when 'confirmed' then new.status in ('in_progress','cancelled')
      when 'in_progress' then new.status in ('completed','cancelled')
      else false end;
    if not ok then
      raise exception 'Invalid status transition % -> %', old.status, new.status;
    end if;

    if actor is not null and not adm then
      if actor = old.customer_id then
        if not (new.status = 'cancelled'
                or (new.status = 'confirmed' and old.status = 'awaiting_customer_approval')) then
          raise exception 'Customer cannot make this change';
        end if;
      elsif actor = old.provider_id then
        if new.status = 'confirmed' and old.status = 'awaiting_customer_approval' then
          raise exception 'Only the customer can approve a quotation';
        end if;
      else
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

create trigger trg_booking_guard before update on bookings
  for each row execute function guard_booking_update();

-- ===== Booking history + notifications + payment record =====
create or replace function public.after_booking_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into booking_status_history (booking_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, actor);
    if new.provider_id is not null then
      insert into notifications (user_id, title, body, data)
      values (new.provider_id, 'طلب جديد', 'وصلك طلب خدمة جديد',
              jsonb_build_object('booking_id', new.id, 'status', new.status));
    end if;
  elsif new.status <> old.status then
    insert into booking_status_history (booking_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, actor);
    if actor is distinct from new.customer_id then
      insert into notifications (user_id, title, body, data)
      values (new.customer_id, 'تحديث على طلبك', 'الحالة الجديدة: ' || new.status::text,
              jsonb_build_object('booking_id', new.id, 'status', new.status));
    end if;
    if new.provider_id is not null and actor is distinct from new.provider_id then
      insert into notifications (user_id, title, body, data)
      values (new.provider_id, 'تحديث على الطلب', 'الحالة الجديدة: ' || new.status::text,
              jsonb_build_object('booking_id', new.id, 'status', new.status));
    end if;
    if new.status = 'completed' then
      insert into payment_records (booking_id, amount, method, status)
      values (new.id, new.final_price, 'cash', 'pending');
    end if;
  end if;
  return null;
end; $$;

create trigger trg_booking_after after insert or update on bookings
  for each row execute function after_booking_change();

-- ===== Enable RLS everywhere + admin full access =====
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy admin_all on public.%I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- ===== Public reference data =====
do $$
declare t text;
begin
  foreach t in array array['cities','service_areas','service_categories','service_subcategories','services'] loop
    execute format('create policy public_read on public.%I for select using (is_active)', t);
  end loop;
end $$;

-- ===== profiles =====
create policy profiles_select_own on profiles for select using (id = auth.uid());
create policy profiles_select_for_provider on profiles for select using (
  exists (select 1 from bookings b where b.customer_id = profiles.id and b.provider_id = auth.uid()));
create policy profiles_update_own on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ===== addresses =====
create policy addresses_owner on addresses for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy addresses_provider_read on addresses for select using (
  exists (select 1 from bookings b where b.address_id = addresses.id and b.provider_id = auth.uid()));

-- ===== provider_profiles =====
create policy provider_public_read on provider_profiles for select
  using (status = 'approved' or id = auth.uid());
create policy provider_insert_own on provider_profiles for insert
  with check (id = auth.uid() and (select role from profiles where id = auth.uid()) = 'provider');
create policy provider_update_own on provider_profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ===== provider documents (private) =====
create policy docs_owner on provider_documents for all
  using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- ===== coverage / portfolio / availability =====
do $$
declare t text;
begin
  foreach t in array array['provider_coverage','provider_portfolio','provider_availability'] loop
    execute format('create policy public_read on public.%I for select using (is_approved_provider(provider_id) or provider_id = auth.uid())', t);
    execute format('create policy owner_write on public.%I for all using (provider_id = auth.uid()) with check (provider_id = auth.uid())', t);
  end loop;
end $$;

-- ===== provider services =====
create policy ps_public_read on provider_services for select
  using (is_active and is_approved_provider(provider_id));
create policy ps_owner on provider_services for all
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid() and is_approved_provider(provider_id));

create policy psi_read on provider_service_images for select using (
  exists (select 1 from provider_services ps where ps.id = provider_service_id));
create policy psi_owner on provider_service_images for all
  using (exists (select 1 from provider_services ps where ps.id = provider_service_id and ps.provider_id = auth.uid()))
  with check (exists (select 1 from provider_services ps where ps.id = provider_service_id and ps.provider_id = auth.uid()));

-- ===== bookings =====
create policy bookings_select on bookings for select
  using (customer_id = auth.uid() or provider_id = auth.uid());
create policy bookings_insert on bookings for insert
  with check (customer_id = auth.uid());
create policy bookings_update on bookings for update
  using (customer_id = auth.uid() or provider_id = auth.uid())
  with check (customer_id = auth.uid() or provider_id = auth.uid());

create policy history_read on booking_status_history for select using (
  exists (select 1 from bookings b where b.id = booking_id));

create policy quotations_read on quotations for select using (
  exists (select 1 from bookings b where b.id = booking_id));
create policy quotations_insert on quotations for insert with check (
  provider_id = auth.uid()
  and exists (select 1 from bookings b where b.id = booking_id and b.provider_id = auth.uid()));
create policy quotations_update on quotations for update using (
  provider_id = auth.uid()
  or exists (select 1 from bookings b where b.id = booking_id and b.customer_id = auth.uid()));

create policy attachments_read on booking_attachments for select using (
  exists (select 1 from bookings b where b.id = booking_id));
create policy attachments_insert on booking_attachments for insert with check (
  uploaded_by = auth.uid()
  and exists (select 1 from bookings b where b.id = booking_id));

-- ===== reviews / notifications / favorites / payments / support =====
create policy reviews_read on reviews for select
  using (not is_hidden or customer_id = auth.uid());
create policy reviews_insert on reviews for insert
  with check (customer_id = auth.uid());

create policy notifications_owner on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy favorites_owner on favorites for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

create policy payments_read on payment_records for select using (
  exists (select 1 from bookings b where b.id = booking_id));

create policy tickets_owner on support_tickets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
