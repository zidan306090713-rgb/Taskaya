insert into storage.buckets (id, name, public)
values ('providers', 'providers', true)
on conflict (id) do nothing;

drop policy if exists "providers admin insert" on storage.objects;
drop policy if exists "providers admin update" on storage.objects;
drop policy if exists "providers admin delete" on storage.objects;

create policy "providers admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'providers' and public.is_admin());
create policy "providers admin update" on storage.objects for update to authenticated
  using (bucket_id = 'providers' and public.is_admin());
create policy "providers admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'providers' and public.is_admin());
