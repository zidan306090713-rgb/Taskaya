-- 004: أداء — قواعد الصلاحيات بتتحسب مرة واحدة للطلب بدل كل صف + فهارس ناقصة
begin;

-- ===== 1) تعديل كل قواعد RLS الموجودة (المنطق نفسه مش بيتغير) =====
do $$
declare
  r record;
  q text;
  c text;
  stmt text;
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    q := r.qual;
    c := r.with_check;

    if q is not null then
      if position('SELECT auth.uid()' in q) = 0 then
        q := replace(q, 'auth.uid()', '(select auth.uid())');
      end if;
      if position('SELECT is_admin()' in q) = 0 then
        q := replace(q, 'is_admin()', '(select is_admin())');
      end if;
      q := replace(q, 'is_approved_provider(provider_id)',
                   '(provider_id in (select pp.id from provider_profiles pp where pp.status = ''approved''))');
    end if;

    if c is not null then
      if position('SELECT auth.uid()' in c) = 0 then
        c := replace(c, 'auth.uid()', '(select auth.uid())');
      end if;
      if position('SELECT is_admin()' in c) = 0 then
        c := replace(c, 'is_admin()', '(select is_admin())');
      end if;
    end if;

    if q is distinct from r.qual or c is distinct from r.with_check then
      stmt := format('alter policy %I on public.%I', r.policyname, r.tablename);
      if q is not null then stmt := stmt || ' using (' || q || ')'; end if;
      if c is not null then stmt := stmt || ' with check (' || c || ')'; end if;
      execute stmt;
    end if;
  end loop;
end $$;

-- ===== 2) فهارس ناقصة =====
create index if not exists idx_services_subcategory      on services(subcategory_id);
create index if not exists idx_subcategories_category    on service_subcategories(category_id);
create index if not exists idx_pp_status                 on provider_profiles(status);
create index if not exists idx_pp_featured               on provider_profiles(is_featured) where is_featured;
create index if not exists idx_ps_active_provider        on provider_services(provider_id) where is_active;
create index if not exists idx_bookings_customer_created on bookings(customer_id, created_at desc);
create index if not exists idx_bookings_provider_created on bookings(provider_id, created_at desc);
create index if not exists idx_bookings_address          on bookings(address_id);
create index if not exists idx_quotations_booking        on quotations(booking_id);
create index if not exists idx_payments_booking          on payment_records(booking_id);
create index if not exists idx_attachments_booking       on booking_attachments(booking_id);
create index if not exists idx_reviews_customer          on reviews(customer_id);
create index if not exists idx_favorites_provider        on favorites(provider_id);
create index if not exists idx_notifications_user_created on notifications(user_id, created_at desc);
create index if not exists idx_addresses_customer_created on addresses(customer_id, created_at desc);
create index if not exists idx_service_areas_city        on service_areas(city_id);
create index if not exists idx_availability_provider     on provider_availability(provider_id);
create index if not exists idx_portfolio_provider        on provider_portfolio(provider_id);
create index if not exists idx_documents_provider        on provider_documents(provider_id);
create index if not exists idx_psi_service               on provider_service_images(provider_service_id);
create index if not exists idx_commission_provider       on commission_rules(provider_id);
create index if not exists idx_commission_category       on commission_rules(category_id);
create index if not exists idx_tickets_user              on support_tickets(user_id);

commit;

-- تحديث إحصائيات الجداول عشان Postgres يختار أسرع طريقة
analyze;
