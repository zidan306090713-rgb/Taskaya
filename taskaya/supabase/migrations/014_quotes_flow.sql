-- Price can only change through a quote the customer approves (send_quote / answer_quote)
alter table public.bookings
  add column if not exists quote_prev_status booking_status,
  add column if not exists quote_prev_price numeric(10,2),
  add column if not exists quote_note text;

create or replace function public.guard_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  adm boolean := is_admin();
  trusted boolean := auth.uid() is null or coalesce(current_setting('taskaya.trusted', true), '') = '1';
  ok boolean;
  rate numeric;
  price numeric;
begin
  if not trusted and (new.quoted_price is distinct from old.quoted_price
                      or new.final_price is distinct from old.final_price
                      or new.pricing_model is distinct from old.pricing_model) then
    raise exception 'PRICE_NEEDS_QUOTE';
  end if;
  if actor is not null and not adm and not trusted then
    if new.customer_id <> old.customer_id
       or new.service_id <> old.service_id
       or new.provider_id is distinct from old.provider_id
       or new.provider_service_id is distinct from old.provider_service_id
       or new.commission_rate is distinct from old.commission_rate
       or new.commission_amount is distinct from old.commission_amount
       or new.provider_earning is distinct from old.provider_earning
       or new.idempotency_key is distinct from old.idempotency_key
       or new.quote_prev_status is distinct from old.quote_prev_status
       or new.quote_prev_price is distinct from old.quote_prev_price
       or new.quote_note is distinct from old.quote_note then
      raise exception 'Protected booking fields cannot be changed';
    end if;
  end if;
  if new.status <> old.status then
    ok := case old.status
      when 'pending' then new.status in ('accepted','quotation_submitted','awaiting_customer_approval','rejected','cancelled')
                          or (new.status = 'confirmed' and old.pricing_model is distinct from 'custom_quote')
      when 'accepted' then new.status in ('confirmed','quotation_submitted','awaiting_customer_approval','cancelled')
      when 'quotation_submitted' then new.status in ('awaiting_customer_approval','cancelled')
      when 'awaiting_customer_approval' then new.status in ('confirmed','in_progress','quotation_submitted','cancelled')
      when 'confirmed' then new.status in ('in_progress','awaiting_customer_approval','cancelled')
      when 'in_progress' then new.status in ('completed','awaiting_customer_approval','cancelled')
      else false end;
    if not ok then
      raise exception 'Invalid status transition % -> %', old.status, new.status;
    end if;
    if not trusted then
      if new.status = 'awaiting_customer_approval' then raise exception 'USE_SEND_QUOTE'; end if;
      if old.status = 'awaiting_customer_approval' and new.status <> 'cancelled' then raise exception 'USE_ANSWER_QUOTE'; end if;
    end if;
    if actor is not null and not adm and not trusted then
      if actor = old.customer_id then
        if new.status <> 'cancelled' then raise exception 'Customer cannot make this change'; end if;
      elsif actor is distinct from old.provider_id then
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

create or replace function public.send_quote(p_booking uuid, p_price numeric, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype;
begin
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (is_admin() or b.provider_id = auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
  if p_price is null or p_price < 0 then raise exception 'BAD_PRICE'; end if;
  if b.status not in ('pending','accepted','quotation_submitted','confirmed','in_progress','awaiting_customer_approval') then
    raise exception 'QUOTE_NOT_ALLOWED';
  end if;
  perform set_config('taskaya.trusted', '1', true);
  if b.provider_id is not null then
    update quotations set status = 'rejected' where booking_id = b.id and status = 'submitted';
    insert into quotations (booking_id, provider_id, price, notes)
    values (b.id, b.provider_id, p_price, nullif(trim(p_note), ''));
  end if;
  update bookings set
    quote_prev_status = case when b.status = 'awaiting_customer_approval' then b.quote_prev_status else b.status end,
    quote_prev_price  = case when b.status = 'awaiting_customer_approval' then b.quote_prev_price else b.quoted_price end,
    quote_note = nullif(trim(p_note), ''),
    quoted_price = p_price,
    status = 'awaiting_customer_approval'
  where id = b.id;
  perform set_config('taskaya.trusted', '0', true);
end; $$;

create or replace function public.answer_quote(p_booking uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  b bookings%rowtype;
  nxt booking_status;
begin
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (is_admin() or b.customer_id = auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
  if b.status <> 'awaiting_customer_approval' then raise exception 'NO_PENDING_QUOTE'; end if;
  perform set_config('taskaya.trusted', '1', true);
  if p_accept then
    update quotations set status = 'accepted' where booking_id = b.id and status = 'submitted';
    nxt := case when b.quote_prev_status = 'in_progress' then 'in_progress'::booking_status else 'confirmed'::booking_status end;
    update bookings set status = nxt, quote_prev_status = null, quote_prev_price = null where id = b.id;
  else
    update quotations set status = 'rejected' where booking_id = b.id and status = 'submitted';
    if b.quote_prev_status in ('confirmed','in_progress') then
      nxt := b.quote_prev_status;
      update bookings set status = nxt, quoted_price = b.quote_prev_price,
        quote_prev_status = null, quote_prev_price = null, quote_note = null
      where id = b.id;
    else
      nxt := 'cancelled';
      update bookings set status = 'cancelled', cancel_reason = 'رفض العميل عرض السعر',
        quote_prev_status = null, quote_prev_price = null
      where id = b.id;
    end if;
  end if;
  perform set_config('taskaya.trusted', '0', true);
  return nxt::text;
end; $$;

revoke execute on function public.send_quote(uuid, numeric, text) from anon;
revoke execute on function public.answer_quote(uuid, boolean) from anon;
grant execute on function public.send_quote(uuid, numeric, text) to authenticated;
grant execute on function public.answer_quote(uuid, boolean) to authenticated;
