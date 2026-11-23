-- Push notifications: device tokens + call send-push on every new notification row
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text,
  lang text not null default 'ar',
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_tokens_user on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;

create or replace function public.register_push_token(p_token text, p_platform text, p_lang text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  insert into push_tokens (token, user_id, platform, lang, updated_at)
  values (p_token, auth.uid(), p_platform, coalesce(p_lang, 'ar'), now())
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, lang = excluded.lang, updated_at = now();
end; $$;

create or replace function public.unregister_push_token(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.register_push_token(text, text, text) from anon;
revoke execute on function public.unregister_push_token(text) from anon;
grant execute on function public.register_push_token(text, text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

alter table public.notifications add column if not exists pushed_at timestamptz;
create extension if not exists pg_net;

create or replace function public.push_on_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://peljqaevvjwftzptfeta.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return null;
exception when others then
  return null;
end; $$;

drop trigger if exists trg_push_on_notification on public.notifications;
create trigger trg_push_on_notification after insert on public.notifications
  for each row execute function public.push_on_notification();
