-- Smart catalog delete: removes unused services first, refuses with IN_USE:<providers>:<bookings> if used
create or replace function public.admin_delete_catalog(p_kind text, p_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  svc_ids uuid[];
  n_ps int;
  n_bk int;
begin
  if not is_admin() then raise exception 'NOT_ADMIN'; end if;
  if p_kind = 'svc' then
    svc_ids := array[p_id];
  elsif p_kind = 'sub' then
    select coalesce(array_agg(id), '{}') into svc_ids from services where subcategory_id = p_id;
  elsif p_kind = 'cat' then
    select coalesce(array_agg(s.id), '{}') into svc_ids
    from services s join service_subcategories sc on sc.id = s.subcategory_id
    where sc.category_id = p_id;
  else
    raise exception 'BAD_KIND';
  end if;
  select count(*) into n_ps from provider_services where service_id = any(svc_ids);
  select count(*) into n_bk from bookings where service_id = any(svc_ids);
  if n_ps > 0 or n_bk > 0 then
    raise exception 'IN_USE:%:%', n_ps, n_bk;
  end if;
  delete from services where id = any(svc_ids);
  if p_kind = 'sub' then
    delete from service_subcategories where id = p_id;
  elsif p_kind = 'cat' then
    delete from commission_rules where category_id = p_id;
    delete from service_subcategories where category_id = p_id;
    delete from service_categories where id = p_id;
  end if;
end; $$;
revoke execute on function public.admin_delete_catalog(text, uuid) from anon;
grant execute on function public.admin_delete_catalog(text, uuid) to authenticated;
