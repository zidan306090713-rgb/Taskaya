// create-provider: بيتنادى من الداش بورد بس — بيعمل حساب دخول (موبايل) + ملف مقدم الخدمة + خدماته + مناطقه
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Pricing = 'fixed' | 'starting_from' | 'custom_quote';
type Svc = { service_id: string; pricing_model: Pricing; base_price: number | null; duration: number | null };
type Body = {
  full_name: string;
  phone: string; // +2010xxxxxxxx
  business_name: string;
  description?: string | null;
  business_address?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  is_verified?: boolean;
  is_featured?: boolean;
  services: Svc[];
  areas: string[];
};

const UUID = /^[0-9a-f-]{36}$/i;

function validate(b: Body): string | null {
  if (!b || typeof b !== 'object') return 'BAD_BODY';
  const name = (b.full_name ?? '').trim().replace(/\s+/g, ' ');
  if (name.split(' ').length < 3) return 'NAME_3_PARTS';
  if (!/^\+201[0125]\d{8}$/.test(b.phone ?? '')) return 'BAD_PHONE';
  if (!(b.business_name ?? '').trim()) return 'BUSINESS_NAME';
  if (!Array.isArray(b.services) || !Array.isArray(b.areas)) return 'BAD_BODY';
  for (const s of b.services) {
    if (!UUID.test(s.service_id)) return 'BAD_SERVICE';
    if (!['fixed', 'starting_from', 'custom_quote'].includes(s.pricing_model)) return 'BAD_PRICING';
    if (s.pricing_model !== 'custom_quote' && !(typeof s.base_price === 'number' && s.base_price >= 0)) return 'PRICE_REQUIRED';
  }
  if (b.areas.some((a) => !UUID.test(a))) return 'BAD_AREA';
  return null;
}

async function must(p: PromiseLike<{ error: unknown }>) {
  const { error } = await p;
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'METHOD' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1) لازم اللي بينادي يكون أدمن
  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: isAdmin, error: adminErr } = await asUser.rpc('is_admin');
  if (adminErr || isAdmin !== true) return json({ error: 'NOT_ADMIN' }, 403);

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'BAD_BODY' }, 400);
  }
  const bad = validate(b);
  if (bad) return json({ error: bad }, 400);

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const fullName = b.full_name.trim().replace(/\s+/g, ' ');

  // 2) حساب الدخول بالموبايل (هيدخل بكود SMS زي العميل)
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    phone: b.phone,
    phone_confirm: true,
    user_metadata: { role: 'provider', full_name: fullName },
  });
  if (createErr || !created?.user) {
    const m = createErr?.message ?? 'CREATE_FAILED';
    return json({ error: /already|registered|exists/i.test(m) ? 'PHONE_EXISTS' : m }, 400);
  }
  const uid = created.user.id;

  // 3) باقي البيانات — لو أي حاجة فشلت نمسح الحساب كله (الحذف بيمسح الباقي تلقائي)
  try {
    await must(db.from('profiles').update({ role: 'provider', full_name: fullName, phone: b.phone.replace('+', '') }).eq('id', uid));
    await must(
      db.from('provider_profiles').insert({
        id: uid,
        business_name: b.business_name.trim(),
        description: b.description?.trim() || null,
        business_address: b.business_address?.trim() || null,
        logo_url: b.logo_url || null,
        cover_url: b.cover_url || null,
        status: 'approved',
        is_verified: !!b.is_verified,
        is_featured: !!b.is_featured,
      }),
    );
    if (b.services.length) {
      await must(
        db.from('provider_services').insert(
          b.services.map((s) => ({
            provider_id: uid,
            service_id: s.service_id,
            pricing_model: s.pricing_model,
            base_price: s.pricing_model === 'custom_quote' ? null : s.base_price,
            estimated_duration_minutes: s.duration ?? null,
          })),
        ),
      );
    }
    if (b.areas.length) {
      await must(db.from('provider_coverage').insert(b.areas.map((a) => ({ provider_id: uid, area_id: a }))));
    }
    return json({ id: uid });
  } catch (err) {
    await db.auth.admin.deleteUser(uid);
    return json({ error: (err as { message?: string })?.message ?? String(err) }, 500);
  }
});
