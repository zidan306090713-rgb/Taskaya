-- 024: lean notifications inbox
-- broadcast = ONE row (no per-user rows); send-push fans it out; my_inbox() builds the list; read state lives on the device

alter table public.broadcasts add column if not exists pushed_at timestamptz;

-- tokens of a broadcast's recipients (send-push only)
create or replace function public.broadcast_tokens(p_broadcast uuid)
returns table (token text, lang text) language sql stable security definer set search_path = public as $$
  select distinct on (t.token) t.token, t.lang
  from broadcasts b
  cross join lateral broadcast_recipients(b.audience, b.target_ids) r
  join push_tokens t on t.user_id = r.user_id
  where b.id = p_broadcast;
$$;
revoke execute on function public.broadcast_tokens(uuid) from public, anon, authenticated;
grant execute on function public.broadcast_tokens(uuid) to service_role;

-- sending = count + 1 row + call send-push
create or replace function public.admin_send_broadcast(p_title text, p_body text, p_audience text, p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = public as $$
declare b uuid; n int;
begin
  if not staff_can('team', true) then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then raise exception 'EMPTY'; end if;
  select count(*) into n from broadcast_recipients(p_audience, p_ids);
  if n = 0 then raise exception 'NO_RECIPIENTS'; end if;
  insert into broadcasts (title, body, audience, target_ids, sent_count)
  values (trim(p_title), trim(p_body), p_audience, case when p_audience = 'people' then p_ids end, n)
  returning id into b;
  begin
    perform net.http_post(
      url := 'https://peljqaevvjwftzptfeta.supabase.co/functions/v1/send-push',
      body := jsonb_build_object('broadcast_id', b),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then null;
  end;
  return n;
end; $$;

-- old per-user copies of broadcasts are no longer needed (the broadcast row itself shows in the inbox)
delete from public.notifications where data->>'kind' = 'broadcast';

-- the inbox: broadcasts that match me (90 days) + my own notifications (30 days)
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
           null::numeric as price, false as is_customer
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
           bk.quoted_price, coalesce(bk.customer_id = (select auth.uid()), false)
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
revoke execute on function public.my_inbox() from public, anon;
grant execute on function public.my_inbox() to authenticated;

-- daily cleanup (02:30 UTC): notifications > 30 days, broadcasts > 90 days
create extension if not exists pg_cron;
select cron.schedule('taskaya-cleanup', '30 2 * * *', $c$
  delete from public.notifications where created_at < now() - interval '30 days';
  delete from public.broadcasts where created_at < now() - interval '90 days';
$c$);
