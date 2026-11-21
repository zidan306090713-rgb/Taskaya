-- 008: app_provider بترجّع logo_url و cover_url عشان صفحة مقدّم الخدمة تعرض الصورة
create or replace function public.app_provider(p_id uuid)
returns json
language sql
stable
set search_path to 'public'
as $function$
  select json_build_object(
    'me', (select auth.uid()),
    'profile', (
      select row_to_json(x) from (
        select id, business_name, description, is_verified, is_available, rating_avg, rating_count, business_address,
               logo_url, cover_url
        from provider_profiles where id = p_id
      ) x
    ),
    'services', coalesce((
      select json_agg(x) from (
        select ps.id, ps.pricing_model, ps.base_price, ps.estimated_duration_minutes,
               json_build_object('name_ar', s.name_ar, 'name_en', s.name_en) as services
        from provider_services ps
        join services s on s.id = ps.service_id
        where ps.provider_id = p_id and ps.is_active
      ) x
    ), '[]'::json),
    'areas', coalesce((
      select json_agg(a order by a.name_en) from (select id, name_ar, name_en from service_areas) a
    ), '[]'::json),
    'addresses', coalesce((
      select json_agg(a order by a.created_at desc) from (
        select id, label, street, building, area_id, created_at
        from addresses where customer_id = (select auth.uid())
      ) a
    ), '[]'::json)
  );
$function$;
