-- 021: أزرار مقدم الخدمة في التطبيق (قبول / رفض بسبب / بدء / إنهاء / إلغاء بسبب)
-- العرض والسعر بيمشوا من send_quote الموجودة

create or replace function public.provider_set_status(p_booking uuid, p_status booking_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype;
begin
  select * into b from bookings where id = p_booking;
  if not found or b.provider_id is distinct from auth.uid() then raise exception 'NOT_YOURS'; end if;
  if p_status not in ('confirmed', 'rejected', 'in_progress', 'completed', 'cancelled') then raise exception 'BAD_STATUS'; end if;
  if p_status in ('rejected', 'cancelled') and coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  -- الحجز اللي محتاج عرض سعر مايتأكدش من غير سعر
  if p_status = 'confirmed' and b.pricing_model = 'custom_quote' then raise exception 'NEEDS_QUOTE'; end if;
  -- عرض مستني رد العميل: مقدم الخدمة يقدر يلغي بس (الموافقة للعميل)
  if b.status = 'awaiting_customer_approval' and p_status <> 'cancelled' then raise exception 'WAITING_CUSTOMER'; end if;

  perform set_config('taskaya.trusted', '1', true);
  update bookings
     set status = p_status,
         cancel_reason = case when p_status in ('rejected', 'cancelled') then trim(p_reason) else cancel_reason end
   where id = p_booking;
end; $$;

revoke execute on function public.provider_set_status(uuid, booking_status, text) from anon;
grant execute on function public.provider_set_status(uuid, booking_status, text) to authenticated;
