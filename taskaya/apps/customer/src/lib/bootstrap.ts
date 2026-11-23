import { supabase } from '@/lib/supabase';

/**
 * طلب واحد بيجيب كل بيانات الرئيسية: بروفايلي + الأقسام + دليل مقدمي الخدمة.
 * أي مكان محتاج حاجة منهم بينادي bootstrap()، ولو كذا مكان نادوه مع بعض بيتبعت طلب واحد بس.
 * لو فشل بيرجّع null، وكل مكان بيرجع لطريقته القديمة.
 */
export type HomeData = {
  profile: { id: string; full_name: string | null; first_name: string | null; phone: string | null; avatar_url: string | null } | null;
  categories: unknown[];
  directory: unknown[];
};

const TTL = 6 * 60 * 60_000;
let cache: { at: number; data: HomeData } | null = null;
let inflight: Promise<HomeData | null> | null = null;

export function bootstrap(force = false): Promise<HomeData | null> {
  if (!force && cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.data);
  if (inflight) return inflight;
  const p = (async () => {
    try {
      const { data, error } = await supabase.rpc('app_home');
      if (error || !data) return null;
      cache = { at: Date.now(), data: data as HomeData };
      return cache.data;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  inflight = p;
  return p;
}
