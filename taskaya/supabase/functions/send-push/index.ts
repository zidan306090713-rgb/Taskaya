// send-push: قاعدة البيانات بتناديها مع كل إشعار جديد → بتبعته لموبايلات صاحبه عن طريق Expo
// آمنة من غير مفتاح: بتاخد رقم الإشعار بس، وبتقرأ الباقي بنفسها، وكل إشعار بيتبعت مرة واحدة (pushed_at)
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Lang = 'ar' | 'en';

// نص الإشعار للعميل حسب الحالة الجديدة ولغته
function text(lang: Lang, status: string, n: number, svc: string, price: string | null): [string, string] | null {
  const ar = lang === 'ar';
  const tag = ar ? `حجز #${n} — ${svc}` : `Booking #${n} — ${svc}`;
  switch (status) {
    case 'accepted':
      return [ar ? 'تم قبول طلبك 👍' : 'Your request was accepted 👍', tag];
    case 'confirmed':
      return [ar ? 'تم تأكيد حجزك ✅' : 'Your booking is confirmed ✅', tag];
    case 'awaiting_customer_approval':
      return [
        ar ? 'عرض سعر جديد 💬' : 'New price quote 💬',
        ar ? `${tag}: ${price} ج.م — اضغط للرد` : `${tag}: ${price} EGP — tap to reply`,
      ];
    case 'in_progress':
      return [ar ? 'بدأ تنفيذ طلبك 🛠️' : 'Work has started 🛠️', tag];
    case 'completed':
      return [ar ? 'تم تنفيذ طلبك 🎉' : 'Your service is done 🎉', tag];
    case 'cancelled':
      return [ar ? 'تم إلغاء الحجز' : 'Booking cancelled', tag];
    case 'rejected':
      return [ar ? 'اعتذر مقدم الخدمة عن طلبك' : 'The provider declined your request', tag];
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
    if (bookingId) {
      const { data } = await db
        .from('bookings')
        .select('booking_number, status, quoted_price, customer_id, services(name_ar, name_en)')
        .eq('id', bookingId)
        .maybeSingle();
      booking = data;
    }
    const forCustomer = booking && booking.customer_id === n.user_id;

    const messages = tokens.map((t) => {
      const lang: Lang = t.lang === 'en' ? 'en' : 'ar';
      let pair: [string, string] | null = null;
      if (forCustomer) {
        const svc = (lang === 'ar' ? booking.services?.name_ar : booking.services?.name_en) ?? '';
        const price = booking.quoted_price != null ? String(booking.quoted_price) : null;
        pair = text(lang, n.data?.status ?? booking.status, booking.booking_number, svc, price);
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
