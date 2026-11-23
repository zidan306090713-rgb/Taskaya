-- pending -> confirmed directly when the price is known (not custom_quote): one step, one notification
create or replace function public.guard_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  adm boolean := is_admin();
  ok boolean;
  rate numeric;
  price numeric;
begin
  if actor is not null and not adm then
    if new.customer_id <> old.customer_id
       or new.service_id <> old.service_id
       or new.provider_id is distinct from old.provider_id
       or new.provider_service_id is distinct from old.provider_service_id
       or new.commission_rate is distinct from old.commission_rate
       or new.commission_amount is distinct from old.commission_amount
       or new.provider_earning is distinct from old.provider_earning
       or new.idempotency_key is distinct from old.idempotency_key then
      raise exception 'Protected booking fields cannot be changed';
    end if;
    if actor = old.customer_id and (
       new.quoted_price is distinct from old.quoted_price
       or new.final_price is distinct from old.final_price
       or new.pricing_model is distinct from old.pricing_model) then
      raise exception 'Customers cannot change prices';
    end if;
  end if;

  if new.status <> old.status then
    ok := case old.status
      when 'pending' then new.status in ('accepted','quotation_submitted','rejected','cancelled')
                          or (new.status = 'confirmed' and old.pricing_model is distinct from 'custom_quote')
      when 'accepted' then new.status in ('confirmed','quotation_submitted','cancelled')
      when 'quotation_submitted' then new.status in ('awaiting_customer_approval','cancelled')
      when 'awaiting_customer_approval' then new.status in ('confirmed','quotation_submitted','cancelled')
      when 'confirmed' then new.status in ('in_progress','cancelled')
      when 'in_progress' then new.status in ('completed','cancelled')
      else false end;
    if not ok then
      raise exception 'Invalid status transition % -> %', old.status, new.status;
    end if;

    if actor is not null and not adm then
      if actor = old.customer_id then
        if not (new.status = 'cancelled'
                or (new.status = 'confirmed' and old.status = 'awaiting_customer_approval')) then
          raise exception 'Customer cannot make this change';
        end if;
      elsif actor = old.provider_id then
        if new.status = 'confirmed' and old.status = 'awaiting_customer_approval' then
          raise exception 'Only the customer can approve a quotation';
        end if;
      else
        raise exception 'Not allowed';
      end if;
    end if;

    if new.status = 'completed' then
      price := coalesce(new.final_price, new.quoted_price);
      if price is null then raise exception 'Price is required to complete the booking'; end if;
      rate := coalesce(get_commission_rate(new.provider_id, new.service_id), 0);
      new.final_price := price;
      new.commission_rate := rate;
      new.commission_amount := round(price * rate / 100, 2);
      new.provider_earning := price - new.commission_amount;
    end if;
  end if;
  return new;
end; $$;
