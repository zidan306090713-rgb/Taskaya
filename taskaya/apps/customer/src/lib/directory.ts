import type { ProviderCard } from '@/lib/api';
import { normalizeAr } from '@/lib/arabic';
import { bootstrap } from '@/lib/bootstrap';
import { supabase } from '@/lib/supabase';

export type DirItem = ProviderCard & { text: string; nameN: string };
export type Directory = { items: DirItem[]; large: boolean };

export const MAX_PROVIDERS = 400; // فوق العدد ده البحث يتحول للسيرفر تلقائيًا
export const MIN_SERVER_CHARS = 2;
export const SERVER_DEBOUNCE_MS = 400;
const MAX_ROWS = 1000;
const DIR_TTL = 5 * 60_000;
const SEARCH_TTL = 2 * 60_000;
const SEARCH_CACHE_MAX = 50;
const LOCAL_RESULTS_MAX = 40;

type ProfileRow = Omit<ProviderCard, 'min_price'>;
type Row = {
  base_price: number | null;
  provider_profiles: ProfileRow;
  services?: {
    name_ar: string;
    name_en: string;
    service_subcategories?: {
      name_ar: string;
      name_en: string;
      service_categories?: { name_ar: string; name_en: string };
    };
  };
};

const PROFILE_COLS =
  'id, business_name, is_verified, is_featured, is_available, rating_avg, rating_count, logo_url, cover_url, description';

function aggregate(rows: Row[]) {
  const map = new Map<string, { p: ProfileRow; min: number | null; parts: string[] }>();
  for (const r of rows) {
    const p = r.provider_profiles;
    if (!p) continue;
    let e = map.get(p.id);
    if (!e) {
      e = { p, min: null, parts: [p.business_name, p.description ?? ''] };
      map.set(p.id, e);
    }
    if (r.base_price != null && (e.min == null || r.base_price < e.min)) e.min = r.base_price;
    const s = r.services;
    if (s) {
      e.parts.push(s.name_ar, s.name_en);
      const sc = s.service_subcategories;
      if (sc) {
        e.parts.push(sc.name_ar, sc.name_en);
        const c = sc.service_categories;
        if (c) e.parts.push(c.name_ar, c.name_en);
      }
    }
  }
  return map;
}

// ---------- الدليل (طلب واحد يخدم الرئيسية والبحث) ----------
let dirCache: { at: number; data: Directory } | null = null;
let dirInflight: Promise<Directory> | null = null;

export function loadDirectory(force = false): Promise<Directory> {
  if (!force && dirCache && Date.now() - dirCache.at < DIR_TTL) return Promise.resolve(dirCache.data);
  if (dirInflight) return dirInflight;

  dirInflight = (async () => {
    const boot = await bootstrap(force);
    const { data, error } = boot ? { data: boot.directory, error: null } : await supabase
      .from('provider_services')
      .select(
        `base_price, provider_profiles!inner(${PROFILE_COLS}), services!inner(name_ar, name_en, service_subcategories!inner(name_ar, name_en, service_categories!inner(name_ar, name_en)))`
      )
      .eq('is_active', true)
      .limit(MAX_ROWS);

    if (error || !data) return dirCache?.data ?? { items: [], large: false };

    const rows = data as unknown as Row[];
    const map = aggregate(rows);
    const large = rows.length >= MAX_ROWS || map.size > MAX_PROVIDERS;
    const items: DirItem[] = large
      ? []
      : [...map.values()]
          .map((e) => ({ ...e.p, min_price: e.min, text: normalizeAr(e.parts.join(' ')), nameN: normalizeAr(e.p.business_name) }))
          .sort((a, b) => b.rating_avg - a.rating_avg);

    const result = { items, large };
    dirCache = { at: Date.now(), data: result };
    return result;
  })().finally(() => {
    dirInflight = null;
  });

  return dirInflight;
}

// ---------- البحث المحلي (بدون أي طلب للسيرفر) ----------
export function searchLocal(items: DirItem[], term: string): DirItem[] {
  const words = normalizeAr(term).split(' ').filter(Boolean);
  if (!words.length) return [];
  const first = words[0];
  return items
    .filter((i) => words.every((w) => i.text.includes(w)))
    .sort((a, b) => Number(b.nameN.includes(first)) - Number(a.nameN.includes(first)) || b.rating_avg - a.rating_avg)
    .slice(0, LOCAL_RESULTS_MAX);
}

// ---------- المميزون من السيرفر (عند الوضع الكبير فقط) ----------
export async function loadFeaturedServer(): Promise<ProviderCard[]> {
  const { data } = await supabase
    .from('provider_services')
    .select(`base_price, provider_profiles!inner(${PROFILE_COLS})`)
    .eq('is_active', true)
    .eq('provider_profiles.is_featured', true)
    .limit(100);
  const map = aggregate((data ?? []) as unknown as Row[]);
  return [...map.values()]
    .map((e) => ({ ...e.p, min_price: e.min }))
    .sort((a, b) => b.rating_avg - a.rating_avg)
    .slice(0, 12);
}

// ---------- بحث السيرفر (وضع الأعداد الكبيرة) مع تخزين النتايج ----------
const searchCache = new Map<string, { at: number; rows: ProviderCard[] }>();

export function peekServerSearch(term: string): ProviderCard[] | null {
  const key = normalizeAr(term);
  const hit = searchCache.get(key);
  return hit && Date.now() - hit.at < SEARCH_TTL ? hit.rows : null;
}

export async function searchServer(term: string, signal: AbortSignal): Promise<ProviderCard[]> {
  const key = normalizeAr(term);
  const cached = peekServerSearch(term);
  if (cached) return cached;

  const { data, error } = await supabase.rpc('search_providers', { term: key, max_results: 20 }).abortSignal(signal);
  if (error) throw error;

  const rows = (data ?? []) as unknown as ProviderCard[];
  searchCache.set(key, { at: Date.now(), rows });
  if (searchCache.size > SEARCH_CACHE_MAX) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  return rows;
}
