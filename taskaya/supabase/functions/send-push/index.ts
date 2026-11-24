// send-push: قاعدة البيانات بتناديها مع كل إشعار جديد → بتبعته لموبايلات صاحبه عن طريق Expo
// آمنة من غير مفتاح: بتاخد رقم الإشعار بس، وبتقرأ الباقي بنفسها، وكل إشعار بيتبعت مرة واحدة (pushed_at)
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Lang = 'ar' | 'en';
const TZ = 'Africa/Cairo';
const SEP = ' · ';

// تاريخ اليوم بتوقيت مصر (YYYY-MM-DD) عشان نعرف "اليوم / غدًا"
function dayKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// الميعاد بشكل لطيف: "غدًا، ٥:٠٠ م" / "الخميس، ٥:٠٠ م" / "٢٧ نوفمبر، ٥:٠٠ م"
function when(lang: Lang, iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const ar = lang === 'ar';
  const loc = ar ? 'ar-EG' : 'en-US';
  const time = new Intl.DateTimeFormat(loc, { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(d);
  const diff = Math.round((Date.parse(dayKey(d)) - Date.parse(dayKey(new Date()))) / 86400000);
  let day: string;
  if (diff === 0) day = ar ? 'اليوم' : 'Today';
  else if (diff === 1) day = ar ? 'غدًا' : 'Tomorrow';
  else if (diff > 1 && diff < 7) day = new Intl.DateTimeFormat(loc, { timeZone: TZ, weekday: 'long' }).format(d);
  else day = new Intl.DateTimeFormat(loc, { timeZone: TZ, day: 'numeric', month: 'long' }).format(d);
  return `${day}${ar ? '، ' : ', '}${time}`;
}

type Ctx = { svc: string; when: string | null; who: string | null; price: string | null; reason: string | null };

const join = (...parts: Array<string | null | undefined | false>) => parts.filter(Boolean).join(SEP);

// نص الإشعار للعميل حسب الحالة الجديدة ولغته
function text(lang: Lang, status: string, c: Ctx): [string, string] | null {
  const ar = lang === 'ar';
  const withWho = c.who ? (ar ? `مع ${c.who}` : `with ${c.who}`) : null;
  switch (status) {
    case 'accepted':
      return [ar ? 'تم قبول طلبك 👍' : 'Request accepted 👍', join(c.svc, c.when, withWho)];
    case 'confirmed':
      return [ar ? 'حجزك مؤكد ✅' : 'Booking confirmed ✅', join(c.svc, c.when, withWho)];
    case 'awaiting_customer_approval':
      return [
        ar ? 'عرض سعر جديد 💬' : 'New price quote 💬',
        ar ? join(`${c.price} ج.م لخدمة ${c.svc}`, 'اضغط للرد') : join(`${c.price} EGP for ${c.svc}`, 'Tap to reply'),
      ];
    case 'in_progress':
      return [ar ? 'بدأ العمل على طلبك 🛠️' : 'Work has started 🛠️', join(c.svc, withWho)];
    case 'completed':
      return [
        ar ? 'تم تنفيذ خدمتك 🎉' : 'Service completed 🎉',
        join(c.svc, ar ? 'شكرًا لاختيارك TASKAYA' : 'Thanks for choosing TASKAYA'),
      ];
    case 'cancelled':
      return [ar ? 'تم إلغاء الحجز' : 'Booking cancelled', join(c.svc, c.reason ?? c.when)];
    case 'rejected':
      return [
        ar ? 'اعتذر مقدم الخدمة عن طلبك' : 'Provider declined your request',
        join(c.svc, ar ? 'يمكنك اختيار مقدم خدمة آخر' : 'You can choose another provider'),
      ];
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  try {
    const { id } = await req.json();
    if (typeof id !== 'string') return new Response('bad request', { status: 400 });

    // نعلّم الإشعار إنه اتبعت — لو كان اتبعت قبل كده مش هنبعته تاني
    // deno-lint-ignore no-explicit-any
    const { data: n }: { data: any } = await db
      .from('notifications')
      .update({ pushed_at: new Date().toISOString() })
      .eq('id', id)
      .is('pushed_at', null)
      .select('user_id, title, body, data')
      .maybeSingle();
    if (!n) return new Response('skip');

    const { data: tokens } = await db.from('push_tokens').select('token, lang').eq('user_id', n.user_id);
    if (!tokens?.length) return new Response('no devices');

    const bookingId: string | null = n.data?.booking_id ?? null;
    // deno-lint-ignore no-explicit-any
    let booking: any = null;
    let who: string | null = null;
    if (bookingId) {
      const { data } = await db
        .from('bookings')
        .select('status, quoted_price, customer_id, provider_id, scheduled_at, cancel_reason, services(name_ar, name_en)')
        .eq('id', bookingId)
        .maybeSingle();
      booking = data;
      if (booking?.provider_id) {
        const { data: p } = await db
          .from('provider_profiles')
          .select('business_name')
          .eq('id', booking.provider_id)
          .maybeSingle();
        who = p?.business_name?.trim() || null;
      }
    }
    const forCustomer = booking && booking.customer_id === n.user_id;

    const messages = tokens.map((t) => {
      const lang: Lang = t.lang === 'en' ? 'en' : 'ar';
      let pair: [string, string] | null = null;
      if (forCustomer) {
        const svc = (lang === 'ar' ? booking.services?.name_ar : booking.services?.name_en) ?? '';
        const price =
          booking.quoted_price != null
            ? new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US').format(Number(booking.quoted_price))
            : null;
        pair = text(lang, n.data?.status ?? booking.status, {
          svc,
          when: when(lang, booking.scheduled_at),
          who,
          price,
          reason: booking.cancel_reason?.trim() || null,
        });
      }
      const [title, body] = pair ?? [n.title, n.body ?? ''];
      return {
        to: t.token,
        title,
        body,
        sound: 'default',
        channelId: 'default',
        priority: 'high',
        data: { url: '/orders', booking_id: bookingId },
      };
    });

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    // deno-lint-ignore no-explicit-any
    const out: any = await res.json().catch(() => null);

    // الموبايلات اللي التطبيق اتمسح منها: نشيلها
    const dead = ((out?.data ?? []) as Array<{ status?: string; details?: { error?: string } }>)
      .map((r, i) => (r?.status === 'error' && r?.details?.error === 'DeviceNotRegistered' ? messages[i].to : null))
      .filter((x): x is string => !!x);
    if (dead.length) await db.from('push_tokens').delete().in('token', dead);

    return new Response('ok');
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
