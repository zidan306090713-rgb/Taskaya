-- 006: طلب واحد لكل شاشة — كل دالة بترجّع كل اللي الشاشة محتاجاه
-- security invoker: بتشتغل بصلاحيات المستخدم نفسه، فقواعد RLS بتتطبق عادي

-- ===== الرئيسية: بروفايلي + الأقسام + دليل مقدمي الخدمة =====
create or replace function public.app_home()
returns json language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'profile', (
      select row_to_json(p) from (
        select id, full_name, first_name, phone, avatar_url
        from profiles where id = (select auth.uid())
      ) p
    ),
    'categories', coalesce((
      select json_agg(c order by c.sort_order) from (
        select id, name_ar, name_en, description_ar, description_en, sort_order
        from service_categories
      ) c
    ), '[]'::json),
    'directory', coalesce((
      select json_agg(r) from (
        select
          ps.base_price,
          json_build_object(
            'id', pp.id, 'business_name', pp.business_name, 'is_verified', pp.is_verified,
            'is_featured', pp.is_featured, 'is_available', pp.is_available,
            'rating_avg', pp.rating_avg, 'rating_count', pp.rating_count,
            'logo_url', pp.logo_url, 'cover_url', pp.cover_url, 'description', pp.description
          ) as provider_profiles,
          json_build_object(
            'name_ar', s.name_ar, 'name_en', s.name_en,
            'service_subcategories', json_build_object(
              'name_ar', sc.name_ar, 'name_en', sc.name_en,
              'service_categories', json_build_object('name_ar', cat.name_ar, 'name_en', cat.name_en)
            )
          ) as services
        from provider_services ps
        join provider_profiles pp on pp.id = ps.provider_id
        join services s on s.id = ps.service_id
        join service_subcategories sc on sc.id = s.subcategory_id
        join service_categories cat on cat.id = sc.category_id
        where ps.is_active
        limit 1000
      ) r
    ), '[]'::json)
  );
$$;

-- ===== صفحة مقدم الخدمة (+ تجهيز صفحة الحجز: المناطق وعناويني) =====
create or replace function public.app_provider(p_id uuid)
returns json language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'me', (select auth.uid()),
    'profile', (
      select row_to_json(x) from (
        select id, business_name, description, is_verified, is_available, rating_avg, rating_count, business_address
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
$$;

-- ===== صفحة القسم: القسم + الأقسام الفرعية + مقدمي الخدمة (مع فلتر القسم الفرعي) =====
create or replace function public.app_category(p_id uuid, p_sub uuid default null)
returns json language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'category', (
      select row_to_json(x) from (
        select id, name_ar, name_en, description_ar, description_en from service_categories where id = p_id
      ) x
    ),
    'subcategories', coalesce((
      select json_agg(x order by x.sort_order) from (
        select id, category_id, name_ar, name_en, sort_order from service_subcategories where category_id = p_id
      ) x
    ), '[]'::json),
    'providers', coalesce((
      select json_agg(r) from (
        select
          ps.provider_id,
          ps.base_price,
          json_build_object(
            'id', pp.id, 'business_name', pp.business_name, 'is_verified', pp.is_verified,
            'is_featured', pp.is_featured, 'is_available', pp.is_available,
            'rating_avg', pp.rating_avg, 'rating_count', pp.rating_count,
            'logo_url', pp.logo_url, 'cover_url', pp.cover_url, 'description', pp.description
          ) as provider_profiles
        from provider_services ps
        join provider_profiles pp on pp.id = ps.provider_id
        join services s on s.id = ps.service_id
        join service_subcategories sc on sc.id = s.subcategory_id
        where ps.is_active and sc.category_id = p_id and (p_sub is null or s.subcategory_id = p_sub)
      ) r
    ), '[]'::json)
  );
$$;

grant execute on function public.app_home() to anon, authenticated;
grant execute on function public.app_provider(uuid) to anon, authenticated;
grant execute on function public.app_category(uuid, uuid) to anon, authenticated;
