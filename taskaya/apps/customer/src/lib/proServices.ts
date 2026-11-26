import { lang, tr } from '@/i18n';
import { supabase } from '@/lib/supabase';

// خدمات مقدم الخدمة: كل خدمة جديدة بتتراجع من الإدارة الأول (الـ trigger بيخليها pending + مقفولة)
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type PricingModel = 'fixed' | 'starting_from' | 'custom_quote';
type Named = { id: string; name_ar: string; name_en: string };
export type CatalogCat = Named & { subs: (Named & { services: Named[] })[] };
export type MyService = {
  id: string;
  service_id: string;
  title: string | null;
  description: string | null;
  pricing_model: PricingModel;
  base_price: number | null;
  estimated_duration_minutes: number | null;
  is_active: boolean;
  review_status: ReviewStatus;
  review_note: string | null;
  created_at: string;
  service: (Named & { sub: (Named & { cat: Named | null }) | null }) | null;
};
export type ServiceInput = {
  service_id: string;
  title: string;
  pricing_model: PricingModel;
  base_price: number | null;
  estimated_duration_minutes: number | null;
  description: string | null;
};

export const nameOf = (x: { name_ar: string; name_en: string } | null | undefined) =>
  x ? (lang === 'ar' ? x.name_ar : x.name_en) : '';

export const PRICING: Record<PricingModel, { ar: string; en: string; hint: [string, string] }> = {
  fixed: { ar: 'سعر ثابت', en: 'Fixed price', hint: ['العميل يعرف السعر النهائي من الأول', 'The customer sees the final price upfront'] },
  starting_from: { ar: 'يبدأ من', en: 'Starting from', hint: ['أقل سعر، والنهائي بيتحدد حسب الشغل', 'Minimum price; the final one depends on the job'] },
  custom_quote: { ar: 'بعد المعاينة', en: 'After inspection', hint: ['بتبعت عرض سعر للعميل بعد ما تشوف الشغل', 'You send the customer a quote after seeing the job'] },
};

export type ReviewKey = ReviewStatus | 'paused';
export const REVIEW: Record<ReviewKey, { ar: string; en: string; color: string; icon: string }> = {
  pending: { ar: 'قيد المراجعة', en: 'In review', color: '#D97706', icon: 'hourglass-outline' },
  approved: { ar: 'مفعّلة', en: 'Live', color: '#16A34A', icon: 'checkmark-circle' },
  paused: { ar: 'موقوفة مؤقتًا', en: 'Paused', color: '#64748B', icon: 'pause-circle-outline' },
  rejected: { ar: 'مرفوضة', en: 'Rejected', color: '#DC2626', icon: 'close-circle' },
};
export const reviewOf = (r: MyService): ReviewKey =>
  r.review_status === 'approved' && !r.is_active ? 'paused' : r.review_status;

export function durOf(m: number | null | undefined) {
  if (m == null) return '';
  if (m < 60) return tr(`${m} دقيقة`, `${m} min`);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (lang !== 'ar') return r ? `${h}h ${r}m` : `${h} h`;
  if (h === 1 && r === 30) return 'ساعة ونص';
  if (r) return `${h} س ${r} د`;
  return h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`;
}

let svcCache: { uid: string; at: number; data: MyService[] } | null = null;
let catCache: { at: number; data: CatalogCat[] } | null = null;

export function invalidateMyServices() {
  svcCache = null;
}

const SVC_SELECT =
  'id, service_id, title, description, pricing_model, base_price, estimated_duration_minutes, is_active, review_status, review_note, created_at, service:services(id, name_ar, name_en, sub:service_subcategories(id, name_ar, name_en, cat:service_categories(id, name_ar, name_en)))';

export async function getMyServices(uid: string, force = false): Promise<MyService[]> {
  if (!force && svcCache && svcCache.uid === uid && Date.now() - svcCache.at < 60_000) return svcCache.data;
  const { data, error } = await supabase
    .from('provider_services')
    .select(SVC_SELECT)
    .eq('provider_id', uid)
    .order('created_at', { ascending: false });
  if (error) console.warn('getMyServices', error.message);
  const list = ((data ?? []) as unknown as MyService[]).map((r) => ({
    ...r,
    base_price: r.base_price == null ? null : Number(r.base_price),
  }));
  svcCache = { uid, at: Date.now(), data: list };
  return list;
}

// شجرة الأقسام → الأنواع → الخدمات (بتتغير نادرًا: كاش نص ساعة)
export async function getCatalog(): Promise<CatalogCat[]> {
  if (catCache && Date.now() - catCache.at < 30 * 60_000) return catCache.data;
  const { data, error } = await supabase
    .from('service_categories')
    .select('id, name_ar, name_en, subs:service_subcategories(id, name_ar, name_en, services(id, name_ar, name_en))');
  if (error) console.warn('getCatalog', error.message);
  const by = (a: Named, b: Named) => nameOf(a).localeCompare(nameOf(b), lang);
  const list = ((data ?? []) as unknown as CatalogCat[])
    .map((c) => ({ ...c, subs: (c.subs ?? []).map((s) => ({ ...s, services: [...(s.services ?? [])].sort(by) })).sort(by) }))
    .sort(by);
  if (list.length) catCache = { at: Date.now(), data: list };
  return list;
}

function svcError(e: { code?: string; message: string }): string {
  if (e.code === '23505') return tr('الخدمة دي عندك بالفعل', 'You already have this service');
  if (e.code === '42501' || e.message.includes('row-level security'))
    return tr('مش مسموح بالتعديل ده', 'You are not allowed to do this');
  return tr('حصلت مشكلة، حاول تاني', 'Something went wrong, please try again');
}

// إضافة (من غير id) أو تعديل (بـ id). أي تغيير في السعر/الخدمة بيرجّعها للمراجعة من السيرفر
export async function saveService(uid: string, input: ServiceInput, id?: string): Promise<string | null> {
  const run = (row: ServiceInput) =>
    id
      ? supabase.from('provider_services').update(row).eq('id', id)
      : supabase.from('provider_services').insert({ ...row, provider_id: uid });
  let { error } = await run(input);
  // لو عمود السعر مايقبلش فاضي (تسعير بعد المعاينة) → نبعته صفر
  if (error && error.code === '23502' && input.base_price == null) ({ error } = await run({ ...input, base_price: 0 }));
  invalidateMyServices();
  return error ? svcError(error) : null;
}

export async function toggleService(id: string, active: boolean): Promise<string | null> {
  const { error } = await supabase.from('provider_services').update({ is_active: active }).eq('id', id);
  invalidateMyServices();
  return error ? svcError(error) : null;
}
