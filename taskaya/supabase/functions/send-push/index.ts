// send-push: بتتنادى من قاعدة البيانات في حالتين:
//  1) {id}: إشعار حجز/مراجعة لمستخدم واحد (صف في notifications)
//  2) {broadcast_id}: رسالة جماعية = صف واحد في broadcasts → بنبعتها لكل موبايلات المستلمين على دفعات
// آمنة من غير مفتاح: بتاخد رقم بس وبتقرأ الباقي بنفسها، وكل حاجة بتتبعت مرة واحدة (pushed_at)
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Lang = 'ar' | 'en';
type Msg = { to: string; title: string; body: string; sound: 'default'; channelId: string; priority: 'high'; data: Record<string, unknown> };
const TZ = 'Africa/Cairo';
const SEP = ' · ';

function dayKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

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
      return [ar ? 'تم تنفيذ خدمتك 🎉' : 'Service completed 🎉', join(c.svc, ar ? 'شكرًا لاختيارك TASKAYA' : 'Thanks for choosing TASKAYA')];
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

// بيبعت على دفعات (Expo بيقبل 100 في الطلب) وبيشيل الموبايلات اللي التطبيق اتمسح منها
async function deliver(messages: Msg[]) {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk),
    });
    // deno-lint-ignore no-explicit-any
    const out: any = await res.json().catch(() => null);
    const dead = ((out?.data ?? []) as Array<{ status?: string; details?: { error?: string } }>)
      .map((r, j) => (r?.status === 'error' && r?.details?.error === 'DeviceNotRegistered' ? chunk[j].to : null))
      .filter((x): x is string => !!x);
    if (dead.length) await db.from('push_tokens').delete().in('token', dead);
  }
}

async function pushBroadcast(id: string) {
  const { data: b } = await db
    .from('broadcasts')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', id)
    .is('pushed_at', null)
    .select('title, body')
    .maybeSingle();
  if (!b) return new Response('skip');
  const { data: tokens } = await db.rpc('broadcast_tokens', { p_broadcast: id });
  const list = (tokens ?? []) as Array<{ token: string; lang: string }>;
  if (!list.length) return new Response('no devices');
  await deliver(
    list.map((t) => ({
      to: t.token,
      title: b.title,
      body: b.body,
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      data: { url: '/inbox', broadcast_id: id },
    })),
  );
  return new Response('ok');
}

async function pushNotification(id: string) {
  // deno-lint-ignore no-explicit-any
  const { data: n }: { data: any } = await db
    .from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', id)
    .is('pushed_at', null)
    .select('user_id, title, body, data')
    .maybeSingle();
  if (!n) return new Response('skip');

  const bookingId: string | null = n.data?.booking_id ?? null;
  // الموبايلات + الحجز (ومعاه اسم مقدم الخدمة) في نفس الوقت، بدل 3 طلبات ورا بعض
  // deno-lint-ignore no-explicit-any
  const [tokRes, bkRes]: any[] = await Promise.all([
    db.from('push_tokens').select('token, lang').eq('user_id', n.user_id),
    bookingId
      ? db
          .from('bookings')
          .select('status, quoted_price, customer_id, scheduled_at, cancel_reason, services(name_ar, name_en), provider_profiles(business_name)')
          .eq('id', bookingId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const tokens = (tokRes.data ?? []) as Array<{ token: string; lang: string }>;
  if (!tokens.length) return new Response('no devices');

  const booking = bkRes.data;
  const who: string | null = booking?.provider_profiles?.business_name?.trim() || null;
  const forCustomer = booking && booking.customer_id === n.user_id;

  const messages: Msg[] = tokens.map((t) => {
    const lang: Lang = t.lang === 'en' ? 'en' : 'ar';
    let pair: [string, string] | null = null;
    if (forCustomer) {
      const svc = (lang === 'ar' ? booking.services?.name_ar : booking.services?.name_en) ?? '';
      const price =
        booking.quoted_price != null ? new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US').format(Number(booking.quoted_price)) : null;
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
      data: { url: n.data?.url ?? '/orders', booking_id: bookingId },
    };
  });
  await deliver(messages);
  return new Response('ok');
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    if (typeof payload?.broadcast_id === 'string') return await pushBroadcast(payload.broadcast_id);
    if (typeof payload?.id === 'string') return await pushNotification(payload.id);
    return new Response('bad request', { status: 400 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
