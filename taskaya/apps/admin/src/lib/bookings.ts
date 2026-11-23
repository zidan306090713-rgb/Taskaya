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

// اسم ولون كل حالة
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
  'accepted',
  'quotation_submitted',
  'awaiting_customer_approval',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'rejected',
];

export type Action = { to: Status; label: string; kind: 'primary' | 'neutral' | 'danger'; needsReason?: boolean };

const CANCEL: Action = { to: 'cancelled', label: 'إلغاء الحجز', kind: 'danger', needsReason: true };

// نفس الانتقالات المسموحة في trigger قاعدة البيانات (guard_booking_update)
export const ACTIONS: Record<Status, Action[]> = {
  pending: [
    { to: 'accepted', label: 'قبول', kind: 'primary' },
    { to: 'quotation_submitted', label: 'إرسال عرض سعر', kind: 'neutral' },
    { to: 'rejected', label: 'رفض', kind: 'danger', needsReason: true },
    CANCEL,
  ],
  accepted: [
    { to: 'confirmed', label: 'تأكيد الحجز', kind: 'primary' },
    { to: 'quotation_submitted', label: 'إرسال عرض سعر', kind: 'neutral' },
    CANCEL,
  ],
  quotation_submitted: [{ to: 'awaiting_customer_approval', label: 'إرسال للعميل للموافقة', kind: 'primary' }, CANCEL],
  awaiting_customer_approval: [
    { to: 'confirmed', label: 'تأكيد نيابةً عن العميل', kind: 'primary' },
    { to: 'quotation_submitted', label: 'تعديل عرض السعر', kind: 'neutral' },
    CANCEL,
  ],
  confirmed: [{ to: 'in_progress', label: 'بدء التنفيذ', kind: 'primary' }, CANCEL],
  in_progress: [{ to: 'completed', label: 'تم التنفيذ', kind: 'primary' }, CANCEL],
  completed: [],
  cancelled: [],
  rejected: [],
};

export const PRICING: Record<string, string> = {
  fixed: 'سعر ثابت',
  starting_from: 'يبدأ من',
  custom_quote: 'بعرض سعر',
};

const SELECT = `id, booking_number, status, method, details, scheduled_at, created_at, pricing_model,
  quoted_price, final_price, commission_amount, provider_earning, cancel_reason,
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

export async function updatePrices(id: string, quoted: number | null, final: number | null) {
  const { error } = await supabase.from('bookings').update({ quoted_price: quoted, final_price: final }).eq('id', id);
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

export function friendlyError(e: unknown) {
  const m = (e as { message?: string })?.message ?? String(e);
  if (m.includes('Invalid status transition')) return 'الحالة اتغيرت من مكان تاني — حدّث الصفحة وجرّب تاني';
  if (m.includes('Price is required')) return 'لازم تحدد السعر وتحفظه الأول';
  return m;
}
