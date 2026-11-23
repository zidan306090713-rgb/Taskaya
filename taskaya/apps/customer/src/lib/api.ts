import { bootstrap } from '@/lib/bootstrap';
import { supabase } from '@/lib/supabase';

export type Category = { id: string; name_ar: string; name_en: string; description_ar: string | null; description_en: string | null; icon?: string | null };
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
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
};

// ---------- كاش بسيط في الذاكرة: بيمنع تكرار نفس الطلب، وبيرجّع النتيجة فورًا لو لسه جديدة ----------
type Entry<T> = { at: number; data?: T; p?: Promise<T> };

function cached<T>(store: Map<string, Entry<T>>, key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const e = store.get(key);
  if (e?.data !== undefined && Date.now() - e.at < ttl) return Promise.resolve(e.data);
  if (e?.p) return e.p;
  const p = load()
    .then((data) => {
      store.set(key, { at: Date.now(), data });
      return data;
    })
    .catch((err) => {
      if (e?.data !== undefined) store.set(key, { at: e.at, data: e.data });
      else store.delete(key);
      throw err;
    });
  store.set(key, { at: e?.at ?? 0, data: e?.data, p });
  return p;
}

// ---------- الأقسام (جاية مع طلب الرئيسية الواحد) ----------
export async function getCategories(): Promise<Category[]> {
  const boot = await bootstrap();
  if (boot) return boot.categories as Category[];
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

// بيجمع صفوف (خدمة لكل صف) لمقدم خدمة واحد بأقل سعر
function aggregateProviders(rows: Row[]): ProviderCard[] {
  const map = new Map<string, ProviderCard>();
  rows.forEach((r) => {
    const p = r.provider_profiles;
    if (!p) return;
    const existing = map.get(p.id);
    const price = r.base_price;
    if (!existing) map.set(p.id, { ...p, min_price: price });
    else if (price != null && (existing.min_price == null || price < existing.min_price)) existing.min_price = price;
  });
  return [...map.values()].sort((a, b) => b.rating_avg - a.rating_avg);
}

export async function getProviders(opts: { categoryId?: string; subcategoryId?: string; search?: string }): Promise<ProviderCard[]> {
  let q = supabase
    .from('provider_services')
    .select(
      'provider_id, base_price, provider_profiles!inner(id, business_name, is_verified, is_featured, is_available, rating_avg, rating_count, logo_url, cover_url, description), services!inner(subcategory_id, service_subcategories!inner(category_id))'
    )
    .eq('is_active', true);
  if (opts.subcategoryId) q = q.eq('services.subcategory_id', opts.subcategoryId);
  if (opts.categoryId) q = q.eq('services.service_subcategories.category_id', opts.categoryId);
  if (opts.search) q = q.ilike('provider_profiles.business_name', `%${opts.search}%`);
  const { data } = await q;
  return aggregateProviders((data ?? []) as unknown as Row[]);
}

// ---------- صفحة القسم: طلب واحد ----------
export type CategoryPage = { category: Category | null; subcategories: Subcategory[]; providers: ProviderCard[] };

export async function getCategoryPage(id: string, sub?: string): Promise<CategoryPage> {
  const { data, error } = await supabase.rpc('app_category', { p_id: id, p_sub: sub ?? null });
  if (!error && data) {
    const d = data as { category: Category | null; subcategories: Subcategory[]; providers: Row[] };
    return { category: d.category, subcategories: d.subcategories ?? [], providers: aggregateProviders(d.providers ?? []) };
  }
  // احتياطي: الطريقة القديمة
  const [category, subcategories, providers] = await Promise.all([
    getCategory(id),
    getSubcategories(id),
    getProviders({ categoryId: id, subcategoryId: sub }),
  ]);
  return { category, subcategories, providers };
}

// ---------- مقدم الخدمة ----------
export type PricingModel = 'fixed' | 'starting_from' | 'custom_quote';
export type ProviderProfile = {
  logo_url?: string | null;
  cover_url?: string | null;
  id: string;
  business_name: string;
  description: string | null;
  is_verified: boolean;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  business_address?: string | null;
};
export type ProviderSvc = {
  id: string;
  pricing_model: PricingModel;
  base_price: number | null;
  estimated_duration_minutes: number | null;
  services: { name_ar: string; name_en: string };
};
export type ProviderData = { profile: ProviderProfile | null; services: ProviderSvc[] };

const PROVIDER_TTL = 2 * 60_000;
const providerStore = new Map<string, Entry<ProviderData>>();
const providerSeed = new Map<string, ProviderProfile>();

export function getProvider(id: string): Promise<ProviderData> {
  return cached(providerStore, id, PROVIDER_TTL, async () => {
    // طلب واحد: بيانات مقدم الخدمة + خدماته + (تجهيز الحجز) المناطق وعناويني
    const { data, error } = await supabase.rpc('app_provider', { p_id: id });
    if (!error && data) {
      const d = data as {
        me: string | null;
        profile: ProviderProfile | null;
        services: ProviderSvc[];
        areas: Area[];
        addresses: Address[];
      };
      areasStore.set('all', { at: Date.now(), data: d.areas ?? [] });
      if (d.me) addrStore.set(d.me, { at: Date.now(), data: d.addresses ?? [] });
      return { profile: d.profile, services: d.services ?? [] };
    }
    // احتياطي: الطريقة القديمة
    const [{ data: profile }, { data: services }] = await Promise.all([
      supabase
        .from('provider_profiles')
        .select('id, business_name, description, is_verified, is_available, rating_avg, rating_count, business_address')
        .eq('id', id)
        .single(),
      supabase
        .from('provider_services')
        .select('id, pricing_model, base_price, estimated_duration_minutes, services(name_ar, name_en)')
        .eq('provider_id', id)
        .eq('is_active', true),
    ]);
    return { profile: profile as ProviderProfile | null, services: (services ?? []) as unknown as ProviderSvc[] };
  });
}

// بيتنادى أول ما الصباع يلمس الكارت: بيحفظ بيانات الكارت ويبدأ يحمّل الباقي
export function prefetchProvider(card: ProviderCard) {
  providerSeed.set(card.id, {
    id: card.id,
    business_name: card.business_name,
    description: card.description,
    is_verified: card.is_verified,
    is_available: card.is_available,
    rating_avg: card.rating_avg,
    rating_count: card.rating_count,
  });
  getProvider(card.id).catch(() => {});
}

// اللي موجود عندنا دلوقتي فورًا (كامل، أو بيانات الكارت بس من غير الخدمات)
export function peekProvider(id: string): { profile: ProviderProfile | null; services: ProviderSvc[] | null } | null {
  const full = providerStore.get(id)?.data;
  if (full) return full;
  const seed = providerSeed.get(id);
  return seed ? { profile: seed, services: null } : null;
}

// ---------- خدمة معينة (صفحة الحجز) ----------
export type ServiceOption = {
  id: string;
  provider_id: string;
  pricing_model: PricingModel;
  base_price: number | null;
  estimated_duration_minutes: number | null;
  provider_profiles: { business_name: string };
  services: { name_ar: string; name_en: string };
};

const psStore = new Map<string, Entry<ServiceOption | null>>();

export function getProviderService(id: string): Promise<ServiceOption | null> {
  return cached(psStore, id, PROVIDER_TTL, async () => {
    const { data } = await supabase
      .from('provider_services')
      .select('id, provider_id, pricing_model, base_price, estimated_duration_minutes, provider_profiles(business_name), services(name_ar, name_en)')
      .eq('id', id)
      .single();
    return data as unknown as ServiceOption | null;
  });
}

export function seedProviderService(s: ServiceOption) {
  psStore.set(s.id, { at: Date.now(), data: s });
}

export function peekProviderService(id: string): ServiceOption | null {
  return psStore.get(id)?.data ?? null;
}

// ---------- المناطق والعناوين ----------
export type Area = { id: string; name_ar: string; name_en: string };

const areasStore = new Map<string, Entry<Area[]>>();

export function getAreas(): Promise<Area[]> {
  return cached(areasStore, 'all', 30 * 60_000, async () => {
    const { data } = await supabase.from('service_areas').select('id, name_ar, name_en').order('name_en');
    return data ?? [];
  });
}

export function peekAreas(): Area[] | null {
  return areasStore.get('all')?.data ?? null;
}

export type Address = {
  id: string;
  label: string | null;
  street: string | null;
  building: string | null;
  area_id: string | null;
  floor?: string | null;
  apartment?: string | null;
  notes?: string | null;
};

const addrStore = new Map<string, Entry<Address[]>>();

export function getMyAddresses(uid: string): Promise<Address[]> {
  return cached(addrStore, uid, 60_000, async () => {
    const { data } = await supabase
      .from('addresses')
      .select('id, label, street, building, floor, apartment, notes, area_id')
      .eq('customer_id', uid)
      .order('created_at', { ascending: false });
    return data ?? [];
  });
}

export function peekAddresses(uid: string): Address[] | null {
  return addrStore.get(uid)?.data ?? null;
}

export function invalidateAddresses(uid: string) {
  addrStore.delete(uid);
}

// ---------- الحجوزات ----------
export type Booking = {
  id: string;
  booking_number: number;
  status: string;
  scheduled_at: string | null;
  quoted_price: number | null;
  final_price: number | null;
  pricing_model: string | null;
  provider_profiles: { business_name: string } | null;
  services: { name_ar: string; name_en: string } | null;
};

export async function getMyBookings(uid: string): Promise<Booking[]> {
  const { data } = await supabase
    .from('bookings')
    .select('id, booking_number, status, scheduled_at, quoted_price, final_price, pricing_model, provider_profiles(business_name), services(name_ar, name_en)')
    .eq('customer_id', uid)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as Booking[];
}

// ---------- إدارة العناوين ----------
export type AddressInput = {
  label: string | null;
  area_id: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  notes: string | null;
};

export async function saveAddress(uid: string, input: AddressInput, id?: string) {
  const { error } = id
    ? await supabase.from('addresses').update(input).eq('id', id)
    : await supabase.from('addresses').insert({ ...input, customer_id: uid });
  invalidateAddresses(uid);
  return { error };
}

export async function deleteAddress(uid: string, id: string) {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  invalidateAddresses(uid);
  return { error };
}

// ---------- بيتنادى لما رقم نسخة الأقسام يتغير ----------
export function clearCatalogCaches() {
  providerStore.clear();
  providerSeed.clear();
  psStore.clear();
}
