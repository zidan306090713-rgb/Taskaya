import { supabase } from '@/lib/supabase';

export type Category = { id: string; name_ar: string; name_en: string; description_ar: string | null; description_en: string | null };
export type Subcategory = { id: string; category_id: string; name_ar: string; name_en: string };
export type ProviderCard = {
  id: string;
  business_name: string;
  is_verified: boolean;
  is_featured: boolean;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  min_price: number | null;
};

export async function getCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from('service_categories')
    .select('id, name_ar, name_en, description_ar, description_en')
    .order('sort_order');
  return data ?? [];
}

export async function getCategory(id: string): Promise<Category | null> {
  const { data } = await supabase
    .from('service_categories')
    .select('id, name_ar, name_en, description_ar, description_en')
    .eq('id', id)
    .single();
  return data;
}

export async function getSubcategories(categoryId: string): Promise<Subcategory[]> {
  const { data } = await supabase
    .from('service_subcategories')
    .select('id, category_id, name_ar, name_en')
    .eq('category_id', categoryId)
    .order('sort_order');
  return data ?? [];
}

type Row = {
  provider_id: string;
  base_price: number | null;
  provider_profiles: Omit<ProviderCard, 'min_price'>;
};

export async function getProviders(opts: { categoryId?: string; subcategoryId?: string; search?: string }): Promise<ProviderCard[]> {
  let q = supabase
    .from('provider_services')
    .select(
      'provider_id, base_price, provider_profiles!inner(id, business_name, is_verified, is_featured, is_available, rating_avg, rating_count), services!inner(subcategory_id, service_subcategories!inner(category_id))'
    )
    .eq('is_active', true);
  if (opts.subcategoryId) q = q.eq('services.subcategory_id', opts.subcategoryId);
  if (opts.categoryId) q = q.eq('services.service_subcategories.category_id', opts.categoryId);
  if (opts.search) q = q.ilike('provider_profiles.business_name', `%${opts.search}%`);
  const { data } = await q;

  const map = new Map<string, ProviderCard>();
  ((data ?? []) as unknown as Row[]).forEach((r) => {
    const p = r.provider_profiles;
    const existing = map.get(p.id);
    const price = r.base_price;
    if (!existing) map.set(p.id, { ...p, min_price: price });
    else if (price != null && (existing.min_price == null || price < existing.min_price)) existing.min_price = price;
  });
  return [...map.values()].sort((a, b) => b.rating_avg - a.rating_avg);
}

export async function getProvider(id: string) {
  const { data: profile } = await supabase
    .from('provider_profiles')
    .select('id, business_name, description, is_verified, is_available, rating_avg, rating_count, business_address')
    .eq('id', id)
    .single();
  const { data: services } = await supabase
    .from('provider_services')
    .select('id, pricing_model, base_price, estimated_duration_minutes, services(name_ar, name_en)')
    .eq('provider_id', id)
    .eq('is_active', true);
  return { profile, services: services ?? [] };
}
