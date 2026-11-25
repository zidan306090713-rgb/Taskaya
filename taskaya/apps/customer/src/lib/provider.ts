import type { Session } from '@supabase/supabase-js';
import { tr } from '@/i18n';
import { supabase } from '@/lib/supabase';

// مقدم الخدمة بيتعرف من بيانات تسجيل الدخول نفسها (من غير ما نسأل السيرفر)
export const isProvider = (s: Session | null | undefined) => s?.user?.user_metadata?.role === 'provider';

export type ProBooking = {
  id: string;
  booking_number: number;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  pricing_model: string | null;
  quoted_price: number | null;
  final_price: number | null;
  commission_amount: number | null;
  provider_earning: number | null;
  details: string | null;
  cancel_reason: string | null;
  quote_note: string | null;
  customer: { full_name: string | null; phone: string | null } | null;
  address: {
    street: string | null;
    building: string | null;
    floor: string | null;
    apartment: string | null;
    notes: string | null;
    area: { name_ar: string; name_en: string } | null;
  } | null;
  services: { name_ar: string; name_en: string } | null;
};
export type ProProfile = {
  id: string;
  business_name: string;
  is_available: boolean;
  kind: string;
  rating_avg: number;
  rating_count: number;
  logo_url: string | null;
};
export type LedgerRow = {
  id: string;
  created_at: string;
  kind: string;
  amount: number;
  note: string | null;
  booking: { booking_number: number } | null;
};

// كاش صغير: الشاشات مش بتسأل السيرفر كل مرة تتفتح
function store<T>(ttl: number) {
  const m = new Map<string, { at: number; data: T }>();
  return {
    get: (k: string) => {
      const h = m.get(k);
      return h && Date.now() - h.at < ttl ? h.data : undefined;
    },
    set: (k: string, data: T) => void m.set(k, { at: Date.now(), data }),
    clear: () => m.clear(),
  };
}
const bookingsStore = store<ProBooking[]>(30_000);
const meStore = store<ProProfile | null>(5 * 60_000);
const ledgerStore = store<LedgerRow[]>(60_000);

export function invalidateProBookings() {
  bookingsStore.clear();
  ledgerStore.clear();
}

const SELECT =
  'id, booking_number, status, scheduled_at, created_at, pricing_model, quoted_price, final_price, commission_amount, provider_earning, details, cancel_reason, quote_note, customer:profiles(full_name, phone), address:addresses(street, building, floor, apartment, notes, area:service_areas(name_ar, name_en)), services(name_ar, name_en)';

export async function getProBookings(uid: string, force = false): Promise<ProBooking[]> {
  const hit = force ? undefined : bookingsStore.get(uid);
  if (hit) return hit;
  const { data } = await supabase.from('bookings').select(SELECT).eq('provider_id', uid).order('created_at', { ascending: false }).limit(200);
  const list = (data ?? []) as unknown as ProBooking[];
  bookingsStore.set(uid, list);
  return list;
}

export function proError(m: string): string {
  if (m.includes('NOT_YOURS')) return tr('الطلب ده مش بتاعك', 'This request is not yours');
  if (m.includes('REASON_REQUIRED')) return tr('اكتب السبب', 'Please write the reason');
  if (m.includes('NEEDS_QUOTE')) return tr('الطلب ده محتاج عرض سعر الأول', 'This request needs a quote first');
  if (m.includes('WAITING_CUSTOMER')) return tr('مستنيين رد العميل على العرض', 'Waiting for the customer to reply');
  if (m.includes('Invalid status transition')) return tr('حالة الطلب اتغيرت، اسحب لتحت وحدّث', 'The request changed, please refresh');
  return tr('حصلت مشكلة، حاول تاني', 'Something went wrong, please try again');
}

export type ProStatus = 'confirmed' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
export async function setProStatus(id: string, status: ProStatus, reason?: string): Promise<string | null> {
  const { error } = await supabase.rpc('provider_set_status', { p_booking: id, p_status: status, p_reason: reason?.trim() || null });
  invalidateProBookings();
  return error ? proError(error.message) : null;
}

export async function sendProQuote(id: string, price: number, note: string): Promise<string | null> {
  const { error } = await supabase.rpc('send_quote', { p_booking: id, p_price: price, p_note: note.trim() || null });
  invalidateProBookings();
  return error ? proError(error.message) : null;
}

export async function getMyProvider(uid: string, force = false): Promise<ProProfile | null> {
  const hit = force ? undefined : meStore.get(uid);
  if (hit !== undefined) return hit;
  const { data } = await supabase
    .from('provider_profiles')
    .select('id, business_name, is_available, kind, rating_avg, rating_count, logo_url')
    .eq('id', uid)
    .maybeSingle();
  const me = (data ?? null) as ProProfile | null;
  meStore.set(uid, me);
  return me;
}

export async function setAvailable(uid: string, value: boolean): Promise<string | null> {
  const { error } = await supabase.from('provider_profiles').update({ is_available: value }).eq('id', uid);
  meStore.clear();
  return error ? proError(error.message) : null;
}

export async function getMyLedger(uid: string, force = false): Promise<LedgerRow[]> {
  const hit = force ? undefined : ledgerStore.get(uid);
  if (hit) return hit;
  const { data } = await supabase
    .from('provider_ledger')
    .select('id, created_at, kind, amount, note, booking:bookings(booking_number)')
    .eq('provider_id', uid)
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = ((data ?? []) as unknown as LedgerRow[]).map((r) => ({ ...r, amount: Number(r.amount) }));
  ledgerStore.set(uid, rows);
  return rows;
}
