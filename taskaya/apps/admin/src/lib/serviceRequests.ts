import { supabase } from './supabase';

// طلبات الخدمات اللي مقدمي الخدمة ضافوها ومستنية مراجعة
export type PricingModel = 'fixed' | 'starting_from' | 'custom_quote';
export type ServiceRequest = {
  id: string;
  provider_id: string;
  title: string | null;
  description: string | null;
  pricing_model: PricingModel;
  base_price: number | null;
  estimated_duration_minutes: number | null;
  review_note: string | null;
  created_at: string;
  service: { name_ar: string; sub: { name_ar: string; cat: { name_ar: string } | null } | null } | null;
  provider: {
    id: string;
    business_name: string;
    status: string;
    owner: { full_name: string | null; phone: string | null } | null;
  } | null;
};

export const PRICING: Record<PricingModel, string> = {
  fixed: 'سعر ثابت',
  starting_from: 'يبدأ من',
  custom_quote: 'بعد المعاينة',
};

const SELECT = `id, provider_id, title, description, pricing_model, base_price, estimated_duration_minutes, review_note, created_at,
  service:services(name_ar, sub:service_subcategories(name_ar, cat:service_categories(name_ar)))`;

export async function fetchServiceRequests(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('provider_services')
    .select(SELECT)
    .eq('review_status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Omit<ServiceRequest, 'provider'>[];
  const ids = [...new Set(rows.map((r) => r.provider_id))];
  let provs: ServiceRequest['provider'][] = [];
  if (ids.length) {
    const res = await supabase
      .from('provider_profiles')
      .select('id, business_name, status, owner:profiles!provider_profiles_id_fkey(full_name, phone)')
      .in('id', ids);
    if (res.error) throw res.error;
    provs = (res.data ?? []) as unknown as ServiceRequest['provider'][];
  }
  return rows.map((r) => ({ ...r, provider: provs.find((p) => p?.id === r.provider_id) ?? null }));
}

export async function countServiceRequests(): Promise<number> {
  const { count, error } = await supabase
    .from('provider_services')
    .select('id', { count: 'exact', head: true })
    .eq('review_status', 'pending');
  if (error) throw error;
  return count ?? 0;
}

export async function reviewService(id: string, approve: boolean, note: string | null, price: number | null) {
  const { error } = await supabase.rpc('admin_review_service', { p_id: id, p_approve: approve, p_note: note, p_price: price });
  if (!error) return;
  const m = error.message;
  if (m.includes('REASON_REQUIRED')) throw new Error('اكتب سبب الرفض');
  if (m.includes('FORBIDDEN')) throw new Error('مش عندك صلاحية تعديل مقدمي الخدمة');
  if (m.includes('NOT_FOUND')) throw new Error('الطلب ده مبقاش موجود');
  throw new Error(m);
}

export const toNum = (s: string) =>
  Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٫,]/g, '.').trim());
