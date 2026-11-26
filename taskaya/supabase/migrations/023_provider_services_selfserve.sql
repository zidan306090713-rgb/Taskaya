-- 023: provider self-serve services
-- 1) pending (self-registered) providers can add services too, not only approved ones
alter policy ps_owner on public.provider_services
  using (provider_id = (select auth.uid()))
  with check (
    provider_id = (select auth.uid())
    and exists (select 1 from provider_profiles pp where pp.id = provider_id and pp.status in ('pending','approved'))
  );

-- 2) any provider edit on a REJECTED service sends it back to review
create or replace function public.guard_provider_service()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null or staff_can('providers', true) then return new; end if;
  if tg_op = 'INSERT' then
    new.review_status := 'pending';
    new.is_active := false;
    new.review_note := null;
    new.reviewed_at := null;
    return new;
  end if;
  if new.review_status is distinct from old.review_status
     or new.review_note is distinct from old.review_note
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'ADMIN_ONLY';
  end if;
  if old.review_status = 'rejected' then
    new.review_status := 'pending';
    new.is_active := false;
    return new;
  end if;
  if new.service_id is distinct from old.service_id
     or new.pricing_model is distinct from old.pricing_model
     or new.base_price is distinct from old.base_price then
    new.review_status := 'pending';
    new.is_active := false;
    return new;
  end if;
  if new.is_active and not old.is_active and old.review_status <> 'approved' then
    raise exception 'NEEDS_REVIEW';
  end if;
  return new;
end; $function$;
