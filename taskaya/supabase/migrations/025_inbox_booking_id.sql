-- 025: my_inbox also returns booking_id (tap a notification → open that exact order)
create or replace function public.my_inbox()
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (
    select p.id, p.role::text as role, pp.kind::text as kind
    from profiles p left join provider_profiles pp on pp.id = p.id
    where p.id = (select auth.uid())
  ),
  bc as (
    select 'b:' || b.id::text as id, 'broadcast'::text as kind, b.title, b.body, b.created_at, '/inbox'::text as url,
           null::bigint as booking_number, null::text as status, null::text as svc_ar, null::text as svc_en,
           null::numeric as price, false as is_customer, null::uuid as booking_id
    from broadcasts b cross join me
    where b.created_at > now() - interval '90 days'
      and case b.audience
        when 'all' then me.role in ('customer', 'provider')
        when 'customers' then me.role = 'customer'
        when 'providers' then me.role = 'provider'
        when 'companies' then me.kind = 'company'
        when 'people' then me.id = any(coalesce(b.target_ids, '{}'::uuid[]))
        else false
      end
  ),
  nt as (
    select n.id::text,
           case when n.data ? 'booking_id' then 'booking'
                when n.data->>'kind' = 'service_review' then 'service_review'
                else 'other' end,
           n.title, n.body, n.created_at, n.data->>'url',
           bk.booking_number::bigint, coalesce(n.data->>'status', bk.status::text), s.name_ar, s.name_en,
           bk.quoted_price, coalesce(bk.customer_id = (select auth.uid()), false), bk.id
    from notifications n
    left join bookings bk on bk.id = case when n.data ? 'booking_id' then (n.data->>'booking_id')::uuid end
    left join services s on s.id = bk.service_id
    where n.user_id = (select auth.uid())
      and n.created_at > now() - interval '30 days'
      and coalesce(n.data->>'kind', '') <> 'broadcast'
  )
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
  from (select * from bc union all select * from nt order by created_at desc limit 100) x;
$$;
