-- 020: تسريع: فهارس للروابط اللي ملهاش فهرس + قواعد الحماية تتحسب مرة واحدة للاستعلام بدل كل صف

-- 1) فهارس الروابط
create index if not exists idx_addresses_area on public.addresses(area_id);
create index if not exists idx_attachments_booking on public.booking_attachments(booking_id);
create index if not exists idx_attachments_uploader on public.booking_attachments(uploaded_by);
create index if not exists idx_status_history_changer on public.booking_status_history(changed_by);
create index if not exists idx_bookings_address on public.bookings(address_id);
create index if not exists idx_bookings_pservice on public.bookings(provider_service_id);
create index if not exists idx_bookings_service on public.bookings(service_id);
create index if not exists idx_rules_category on public.commission_rules(category_id);
create index if not exists idx_rules_provider on public.commission_rules(provider_id);
create index if not exists idx_favorites_provider on public.favorites(provider_id);
create index if not exists idx_payments_booking on public.payment_records(booking_id);
create index if not exists idx_availability_provider on public.provider_availability(provider_id);
create index if not exists idx_documents_provider on public.provider_documents(provider_id);
create index if not exists idx_portfolio_provider on public.provider_portfolio(provider_id);
create index if not exists idx_psimages_pservice on public.provider_service_images(provider_service_id);
create index if not exists idx_quotations_booking on public.quotations(booking_id);
create index if not exists idx_quotations_provider on public.quotations(provider_id);
create index if not exists idx_reviews_customer on public.reviews(customer_id);
create index if not exists idx_service_areas_city on public.service_areas(city_id);
create index if not exists idx_subcategories_category on public.service_subcategories(category_id);
create index if not exists idx_services_subcategory on public.services(subcategory_id);
create index if not exists idx_tickets_booking on public.support_tickets(booking_id);
create index if not exists idx_tickets_user on public.support_tickets(user_id);

-- 2) قواعد الحماية: auth.uid() / is_admin() / staff_can(...) → (select ...) عشان تتحسب مرة واحدة
--    (آمنة لو اتشغلت تاني: اللي اتلف قبل كده مش بيتلف تاني)
do $$
declare
  r record; q text; c text; stmt text;
begin
  for r in select schemaname, tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    q := r.qual;
    c := r.with_check;
    q := regexp_replace(q, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
    q := regexp_replace(q, '(?<!select )is_admin\(\)', '(select is_admin())', 'gi');
    q := regexp_replace(q, '(?<!select )staff_can\(([^()]*)\)', '(select staff_can(\1))', 'gi');
    c := regexp_replace(c, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
    c := regexp_replace(c, '(?<!select )is_admin\(\)', '(select is_admin())', 'gi');
    c := regexp_replace(c, '(?<!select )staff_can\(([^()]*)\)', '(select staff_can(\1))', 'gi');
    if q is distinct from r.qual or c is distinct from r.with_check then
      stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
      if q is not null then stmt := stmt || ' using (' || q || ')'; end if;
      if c is not null then stmt := stmt || ' with check (' || c || ')'; end if;
      execute stmt;
    end if;
  end loop;
end $$;
