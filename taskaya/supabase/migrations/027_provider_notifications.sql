-- 027: provider notifications
-- every booking notification now carries its own url (customer → /orders, provider → /pro/requests)
-- + 'quote' = accepted | rejected when a price quote is answered (answer_quote sets taskaya.quote for the trigger)

create or replace function public.after_booking_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  q text := null;
begin
  if tg_op = 'INSERT' then
    insert into booking_status_history (booking_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, actor);
    if new.provider_id is not null then
      insert into notifications (user_id, title, body, data)
      values (new.provider_id, 'طلب جديد', 'وصلك طلب خدمة جديد',
              jsonb_build_object('booking_id', new.id, 'status', new.status, 'url', '/pro/requests'));
    end if;
  elsif new.status <> old.status then
    insert into booking_status_history (booking_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, actor);

    -- the quote answer comes from answer_quote itself (taskaya.quote), not guessed from the price
    if old.status = 'awaiting_customer_approval' then
      q := nullif(current_setting('taskaya.quote', true), '');
    end if;

    if actor is distinct from new.customer_id then
      insert into notifications (user_id, title, body, data)
      values (new.customer_id, 'تحديث على طلبك', 'الحالة الجديدة: ' || new.status::text,
              jsonb_build_object('booking_id', new.id, 'status', new.status, 'url', '/orders'));
    end if;
    if new.provider_id is not null and actor is distinct from new.provider_id then
      insert into notifications (user_id, title, body, data)
      values (new.provider_id, 'تحديث على الطلب', 'الحالة الجديدة: ' || new.status::text,
              jsonb_build_object('booking_id', new.id, 'status', new.status, 'url', '/pro/requests')
                || case when q is null then '{}'::jsonb else jsonb_build_object('quote', q) end);
    end if;
    if new.status = 'completed' then
      insert into payment_records (booking_id, amount, method, status)
      values (new.id, new.final_price, 'cash', 'pending');
    end if;
  end if;
  return null;
end; $$;

-- my_inbox also returns quote (accepted | rejected | null)
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
           null::numeric as price, false as is_customer, null::uuid as booking_id, null::text as quote
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
           bk.quoted_price, coalesce(bk.customer_id = (select auth.uid()), false), bk.id, n.data->>'quote'
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

-- answer_quote (latest = 017, copied as is) + tells the trigger whether the quote was accepted or rejected
create or replace function public.answer_quote(p_booking uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  b bookings%rowtype;
  nxt booking_status;
begin
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (public.staff_can('bookings', true) or b.customer_id = auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
  if b.status <> 'awaiting_customer_approval' then raise exception 'NO_PENDING_QUOTE'; end if;
  perform set_config('taskaya.trusted', '1', true);
  perform set_config('taskaya.quote', case when p_accept then 'accepted' else 'rejected' end, true);
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
  perform set_config('taskaya.quote', '', true);
  perform set_config('taskaya.trusted', '0', true);
  return nxt::text;
end; $$;
