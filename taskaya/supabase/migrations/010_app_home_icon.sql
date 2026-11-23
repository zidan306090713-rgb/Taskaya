-- app_home now also returns service_categories.icon (chosen from the admin dashboard)
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
        select id, name_ar, name_en, description_ar, description_en, icon, sort_order
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
