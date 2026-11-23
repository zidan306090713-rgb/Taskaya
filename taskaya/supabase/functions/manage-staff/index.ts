// manage-staff: إنشاء/تعديل/إيقاف/حذف أعضاء فريق الإدارة
// مسموح بس لحد معاه صلاحية "إدارة الفريق". ومحدش يقدر يعدّل المالك أو يعدّل نفسه.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Level = 'none' | 'view' | 'edit';
type Perms = { home: boolean; money: boolean; bookings: Level; providers: Level; catalog: Level; team: boolean };
const LEVELS = ['none', 'view', 'edit'];

// deno-lint-ignore no-explicit-any
function cleanPerms(p: any): Perms | null {
  if (!p || typeof p !== 'object') return null;
  if (![p.bookings, p.providers, p.catalog].every((x) => LEVELS.includes(x))) return null;
  return { home: !!p.home, money: !!p.money, team: !!p.team, bookings: p.bookings, providers: p.providers, catalog: p.catalog };
}
const errMsg = (e: unknown) => (e as { message?: string })?.message ?? String(e);
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
  const authHeader = req.headers.get('Authorization') ?? '';

  // 1) اللي بينادي لازم يكون معاه صلاحية "إدارة الفريق"
  const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: canTeam } = await asUser.rpc('staff_can', { p_section: 'team' });
  if (canTeam !== true) return json({ error: 'NOT_ALLOWED' }, 403);
  const { data: who } = await asUser.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  const callerId = who.user?.id;

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  // deno-lint-ignore no-explicit-any
  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'BAD_BODY' }, 400);
  }

  // الهدف لازم يكون عضو فريق (مش المالك) ومش اللي بيعدّل نفسه
  const checkTarget = async (id: unknown): Promise<string | null> => {
    if (typeof id !== 'string' || !id) return 'BAD_BODY';
    if (id === callerId) return 'NOT_SELF';
    const { data } = await db.from('profiles').select('role').eq('id', id).maybeSingle();
    if (!data || data.role !== 'staff') return 'NOT_STAFF';
    return null;
  };
  const cleanName = (n: unknown) => String(n ?? '').trim().replace(/\s+/g, ' ');

  try {
    switch (b.action) {
      case 'create': {
        const name = cleanName(b.full_name);
        const email = String(b.email ?? '').trim().toLowerCase();
        const password = String(b.password ?? '');
        const perms = cleanPerms(b.perms);
        if (name.split(' ').length < 3) return json({ error: 'NAME_3_PARTS' }, 400);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'BAD_EMAIL' }, 400);
        if (password.length < 8) return json({ error: 'WEAK_PASSWORD' }, 400);
        if (!perms) return json({ error: 'BAD_PERMS' }, 400);

        const { data: c, error: e } = await db.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name },
        });
        if (e || !c?.user) {
          const m = e?.message ?? 'CREATE_FAILED';
          const code = (e as { code?: string })?.code;
          const exists = code === 'email_exists' || /already been registered/i.test(m);
          console.error('createUser failed:', code, m);
          return json({ error: exists ? 'EMAIL_EXISTS' : m }, 400);
        }
        const id = c.user.id;
        try {
          await must(db.from('profiles').update({ role: 'staff', full_name: name, email }).eq('id', id));
          await must(db.from('staff_permissions').insert({ user_id: id, ...perms }));
        } catch (err) {
          await db.auth.admin.deleteUser(id);
          return json({ error: errMsg(err) }, 500);
        }
        return json({ id });
      }

      case 'update': {
        const bad = await checkTarget(b.user_id);
        if (bad) return json({ error: bad }, 400);
        const perms = cleanPerms(b.perms);
        if (!perms) return json({ error: 'BAD_PERMS' }, 400);
        const name = cleanName(b.full_name);
        if (name) {
          if (name.split(' ').length < 3) return json({ error: 'NAME_3_PARTS' }, 400);
          await must(db.from('profiles').update({ full_name: name }).eq('id', b.user_id));
        }
        await must(
          db.from('staff_permissions').upsert({ user_id: b.user_id, ...perms, updated_at: new Date().toISOString() }),
        );
        return json({ ok: true });
      }

      case 'set_active': {
        const bad = await checkTarget(b.user_id);
        if (bad) return json({ error: bad }, 400);
        const active = !!b.active;
        await must(db.from('profiles').update({ is_active: active }).eq('id', b.user_id));
        // الإيقاف بيمنع الدخول كمان (مش بس الصلاحيات)
        await db.auth.admin.updateUserById(b.user_id, { ban_duration: active ? 'none' : '876000h' });
        return json({ ok: true });
      }

      case 'reset_password': {
        const bad = await checkTarget(b.user_id);
        if (bad) return json({ error: bad }, 400);
        const password = String(b.password ?? '');
        if (password.length < 8) return json({ error: 'WEAK_PASSWORD' }, 400);
        const { error } = await db.auth.admin.updateUserById(b.user_id, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      case 'delete': {
        const bad = await checkTarget(b.user_id);
        if (bad) return json({ error: bad }, 400);
        const { error } = await db.auth.admin.deleteUser(b.user_id);
        if (error) {
          // العضو عدّل حجوزات قبل كده (مربوط بالسجل) → نوقفه بدل ما نحذفه
          await db.from('profiles').update({ is_active: false }).eq('id', b.user_id);
          await db.auth.admin.updateUserById(b.user_id, { ban_duration: '876000h' });
          return json({ ok: true, deactivated: true });
        }
        return json({ ok: true });
      }

      default:
        return json({ error: 'BAD_ACTION' }, 400);
    }
  } catch (err) {
    return json({ error: errMsg(err) }, 500);
  }
});
