create table if not exists public.app_meta (
  id smallint primary key default 1 check (id = 1),
  catalog_version bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.app_meta (id) values (1) on conflict do nothing;

alter table public.app_meta enable row level security;
drop policy if exists app_meta_read on public.app_meta;
create policy app_meta_read on public.app_meta for select using (true);

create or replace function public.bump_catalog_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update app_meta set catalog_version = catalog_version + 1, updated_at = now() where id = 1;
  return null;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['service_categories','service_subcategories','services',
                           'provider_profiles','provider_services','provider_coverage'] loop
    execute format('drop trigger if exists trg_bump_catalog on public.%I', t);
    execute format('create trigger trg_bump_catalog after insert or update or delete on public.%I
                    for each statement execute function public.bump_catalog_version()', t);
  end loop;
end $$;
