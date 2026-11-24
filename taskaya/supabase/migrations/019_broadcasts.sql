-- 019: الرسائل الجماعية من اللوحة → صف في notifications لكل مستلم → send-push بيبعتها للموبايل

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 80),
  body text not null check (length(trim(body)) between 1 and 500),
  audience text not null check (audience in ('all', 'customers', 'providers', 'companies', 'people')),
  target_ids uuid[],
  sent_count int not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.broadcasts enable row level security;
drop policy if exists broadcasts_staff_read on public.broadcasts;
create policy broadcasts_staff_read on public.broadcasts for select using ((select staff_can('team', true)));

-- مين هيستلم (داخلية — محدش يناديها من بره)
create or replace function public.broadcast_recipients(p_audience text, p_ids uuid[])
returns table (user_id uuid) language sql stable security definer set search_path = public as $$
  select p.id from profiles p
  where p.is_active is not false
    and case p_audience
      when 'all' then p.role in ('customer', 'provider')
      when 'customers' then p.role = 'customer'
      when 'providers' then p.role = 'provider'
      when 'companies' then exists (select 1 from provider_profiles pp where pp.id = p.id and pp.kind = 'company')
      when 'people' then p.id = any(coalesce(p_ids, '{}'::uuid[]))
      else false
    end;
$$;
revoke execute on function public.broadcast_recipients(text, uuid[]) from public, anon, authenticated;

create or replace function public.admin_broadcast_count(p_audience text, p_ids uuid[] default null)
returns int language plpgsql stable security definer set search_path = public as $$
begin
  if not staff_can('team', true) then raise exception 'FORBIDDEN'; end if;
  return (select count(*) from broadcast_recipients(p_audience, p_ids));
end; $$;

create or replace function public.admin_send_broadcast(p_title text, p_body text, p_audience text, p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = public as $$
declare b uuid; n int;
begin
  if not staff_can('team', true) then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then raise exception 'EMPTY'; end if;

  insert into broadcasts (title, body, audience, target_ids)
  values (trim(p_title), trim(p_body), p_audience, case when p_audience = 'people' then p_ids end)
  returning id into b;

  insert into notifications (user_id, title, body, data)
  select r.user_id, trim(p_title), trim(p_body), jsonb_build_object('kind', 'broadcast', 'broadcast_id', b, 'url', '/')
  from broadcast_recipients(p_audience, p_ids) r;
  get diagnostics n = row_count;

  if n = 0 then raise exception 'NO_RECIPIENTS'; end if;
  update broadcasts set sent_count = n where id = b;
  return n;
end; $$;

revoke execute on function public.admin_broadcast_count(text, uuid[]) from anon;
revoke execute on function public.admin_send_broadcast(text, text, text, uuid[]) from anon;
grant execute on function public.admin_broadcast_count(text, uuid[]) to authenticated;
grant execute on function public.admin_send_broadcast(text, text, text, uuid[]) to authenticated;
