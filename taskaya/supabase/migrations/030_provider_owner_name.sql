-- 030: provider owner's name on the provider page (name only, providers only)
create or replace function public.provider_owner_name(p_id uuid)
returns text language sql stable security definer set search_path to 'public' as $$
  select nullif(trim(p.full_name), '')
  from profiles p
  join provider_profiles pp on pp.id = p.id
  where pp.id = p_id;
$$;

-- app_provider (from 028) + owner_name
create or replace function public.app_provider(p_id uuid)
returns json language sql stable set search_path to 'public' as $function$
  select json_build_object(
    'me', (select auth.uid()),
    'profile', (
      select row_to_json(x) from (
        select id, business_name, description, is_verified, is_available, rating_avg, rating_count, business_address,
               away_until, is_available and (away_until is null or away_until <= now()) as available,
               logo_url, cover_url,
               public.provider_owner_name(id) as owner_name
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
