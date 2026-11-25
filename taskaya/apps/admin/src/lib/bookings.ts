import { supabase } from './supabase';

export type Status =
  | 'pending'
  | 'accepted'
  | 'quotation_submitted'
  | 'awaiting_customer_approval'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type Booking = {
  id: string;
  booking_number: number;
  status: Status;
  method: 'direct' | 'recommended';
  details: string | null;
  scheduled_at: string | null;
  created_at: string;
  pricing_model: 'fixed' | 'starting_from' | 'custom_quote' | null;
  quoted_price: number | null;
  final_price: number | null;
  commission_amount: number | null;
  provider_earning: number | null;
  cancel_reason: string | null;
  quote_prev_status: Status | null;
  quote_prev_price: number | null;
  quote_note: string | null;
  customer: { full_name: string | null; phone: string | null } | null;
  provider: { business_name: string } | null;
  service: { name_ar: string } | null;
  address: {
    label: string | null;
    street: string | null;
    building: string | null;
    floor: string | null;
    apartment: string | null;
    notes: string | null;
    area: { name_ar: string } | null;
  } | null;
};

export type HistoryRow = {
  id: string;
  from_status: Status | null;
  to_status: Status;
  created_at: string;
  changer: { full_name: string | null; role: string } | null;
};

export const STATUS: Record<Status, { label: string; tone: string }> = {
  pending: { label: 'مستني قبول', tone: 'amber' },
  accepted: { label: 'مقبول', tone: 'blue' },
  quotation_submitted: { label: 'عرض سعر', tone: 'violet' },
  awaiting_customer_approval: { label: 'مستني موافقة العميل', tone: 'violet' },
  confirmed: { label: 'مؤكد', tone: 'teal' },
  in_progress: { label: 'جاري التنفيذ', tone: 'sky' },
  completed: { label: 'تم', tone: 'green' },
  cancelled: { label: 'ملغي', tone: 'gray' },
  rejected: { label: 'مرفوض', tone: 'red' },
};

export const STATUS_ORDER: Status[] = [
  'pending',
  'awaiting_customer_approval',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'rejected',
  'accepted',
  'quotation_submitted',
];

// to = تغيير حالة عادي ، special = عرض سعر / رد على عرض
export type Action = {
  to?: Status;
  special?: 'quote' | 'approve' | 'decline';
  label: string;
  kind: 'primary' | 'neutral' | 'danger';
  needsReason?: boolean;
};

const CANCEL: Action = { to: 'cancelled', label: 'إلغاء الحجز', kind: 'danger', needsReason: true };
const REJECT: Action = { to: 'rejected', label: 'رفض', kind: 'danger', needsReason: true };
const QUOTE: Action = { special: 'quote', label: 'إرسال عرض سعر', kind: 'neutral' };

export function actionsFor(b: Booking): Action[] {
  switch (b.status) {
    case 'pending':
      return b.pricing_model === 'custom_quote'
        ? [{ ...QUOTE, kind: 'primary' }, REJECT, CANCEL]
        : [{ to: 'confirmed', label: 'قبول وتأكيد', kind: 'primary' }, QUOTE, REJECT, CANCEL];
    case 'accepted':
      return [{ to: 'confirmed', label: 'تأكيد الحجز', kind: 'primary' }, QUOTE, CANCEL];
    case 'quotation_submitted':
      return [{ ...QUOTE, kind: 'primary' }, CANCEL];
    case 'awaiting_customer_approval':
      return [
        { special: 'approve', label: 'موافقة نيابةً عن العميل', kind: 'primary' },
        { special: 'decline', label: 'رفض نيابةً عن العميل', kind: 'neutral' },
        { ...QUOTE, label: 'تعديل العرض' },
        CANCEL,
      ];
    case 'confirmed':
      return [{ to: 'in_progress', label: 'بدء التنفيذ', kind: 'primary' }, QUOTE, CANCEL];
    case 'in_progress':
      return [{ to: 'completed', label: 'تم التنفيذ', kind: 'primary' }, QUOTE, CANCEL];
    default:
      return [];
  }
}

export const PRICING: Record<string, string> = {
  fixed: 'سعر ثابت',
  starting_from: 'يبدأ من',
  custom_quote: 'بعرض سعر',
};

const SELECT = `id, booking_number, status, method, details, scheduled_at, created_at, pricing_model,
  quoted_price, final_price, commission_amount, provider_earning, cancel_reason,
  quote_prev_status, quote_prev_price, quote_note,
  customer:profiles!bookings_customer_id_fkey(full_name, phone),
  provider:provider_profiles(business_name),
  service:services(name_ar),
  address:addresses(label, street, building, floor, apartment, notes, area:service_areas(name_ar))`;

export async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from('bookings').select(SELECT).order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Booking[];
}

export async function fetchHistory(bookingId: string): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from('booking_status_history')
    .select('id, from_status, to_status, created_at, changer:profiles(full_name, role)')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as HistoryRow[];
}

export async function updateStatus(id: string, to: Status, reason?: string) {
  const patch: Record<string, unknown> = { status: to };
  if (reason) patch.cancel_reason = reason;
  const { error } = await supabase.from('bookings').update(patch).eq('id', id);
  if (error) throw error;
}

export async function sendQuote(id: string, price: number, note: string) {
  const { error } = await supabase.rpc('send_quote', { p_booking: id, p_price: price, p_note: note.trim() || null });
  if (error) throw error;
}

export async function answerQuote(id: string, accept: boolean) {
  const { error } = await supabase.rpc('answer_quote', { p_booking: id, p_accept: accept });
  if (error) throw error;
}

// ---------- تنسيق ----------
const dtf = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });
export const fmtDate = (s: string | null) => (s ? dtf.format(new Date(s)) : '—');
export const money = (n: number | null | undefined) => (n == null ? '—' : `${Number(n).toLocaleString('en-US')} ج.م`);

export function addressText(a: Booking['address']) {
  if (!a) return '—';
  const parts = [
    a.area?.name_ar,
    a.street,
    a.building && `عمارة ${a.building}`,
    a.floor && `دور ${a.floor}`,
    a.apartment && `شقة ${a.apartment}`,
  ].filter(Boolean);
  return parts.join('، ') || '—';
}

const MESSAGES: Record<string, string> = {
  PRICE_NEEDS_QUOTE: 'السعر مايتغيرش غير بعرض سعر يوافق عليه العميل',
  USE_SEND_QUOTE: 'استخدم زرار "إرسال عرض سعر"',
  USE_ANSWER_QUOTE: 'الحجز مستني رد العميل على عرض السعر',
  NO_PENDING_QUOTE: 'مفيش عرض سعر مستني رد',
  QUOTE_NOT_ALLOWED: 'مينفعش تبعت عرض سعر في الحالة دي',
  BAD_PRICE: 'اكتب سعر صحيح',
  NOT_ALLOWED: 'مش مسموح',
};

export function friendlyError(e: unknown) {
  const m = (e as { message?: string })?.message ?? String(e);
  for (const k of Object.keys(MESSAGES)) if (m.includes(k)) return MESSAGES[k];
  if (m.includes('Invalid status transition')) return 'الحالة اتغيرت من مكان تاني — حدّث الصفحة وجرّب تاني';
  if (m.includes('Price is required')) return 'لازم يكون فيه سعر الأول';
  return m;
}

// حجز واحد بالتفاصيل (للرئيسية: بدل تحميل كل الحجوزات عشان نفتح واحد)
type OneBooking = Awaited<ReturnType<typeof fetchBookings>>[number];
export async function fetchBooking(id: string): Promise<OneBooking | null> {
  const { data, error } = await supabase.from('bookings').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as OneBooking | null;
}
