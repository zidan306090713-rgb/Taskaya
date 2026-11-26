-- 029: send-push security: project URL + secret come from Vault, sent as x-push-secret header
create or replace function public.call_send_push(p_body jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_url text; v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_secret';
  if v_url is null or v_secret is null then
    raise warning 'call_send_push: vault secrets missing';
    return;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/send-push',
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret)
  );
end; $$;
revoke execute on function public.call_send_push(jsonb) from public, anon, authenticated;

create or replace function public.push_on_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.call_send_push(jsonb_build_object('id', new.id));
  return null;
exception when others then
  return null;
end; $$;

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
    perform public.call_send_push(jsonb_build_object('broadcast_id', b));
  exception when others then null;
  end;
  return n;
end; $$;
