import type { Perms } from './auth';
import { supabase } from './supabase';

export type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  perms: Perms | null;
};

export async function fetchTeam(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, is_active, created_at, perms:staff_permissions(home, money, bookings, providers, catalog, team)')
    .eq('role', 'staff')
    .order('created_at');
  if (error) throw error;
  // deno-lint-ignore no-explicit-any
  return (data ?? []).map((r: any) => ({ ...r, perms: Array.isArray(r.perms) ? (r.perms[0] ?? null) : r.perms })) as Member[];
}

const ERRORS: Record<string, string> = {
  NOT_ALLOWED: 'مش مسموح لك تدير الفريق',
  NOT_SELF: 'مينفعش تعدّل حسابك انت من هنا',
  NOT_STAFF: 'الحساب ده مش عضو فريق',
  NAME_3_PARTS: 'الاسم لازم يكون ثلاثي',
  BAD_EMAIL: 'الإيميل مش صح',
  WEAK_PASSWORD: 'كلمة السر لازم 8 حروف على الأقل',
  BAD_PERMS: 'الصلاحيات مش صح',
  EMAIL_EXISTS: 'الإيميل ده مسجّل قبل كده',
};

export async function staffAction<T = { ok?: boolean; id?: string; deactivated?: boolean }>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-staff', { body });
  if (error) {
    let code = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const j = await ctx.json();
        if (j?.error) code = j.error;
      } catch {
        /* نسيب الرسالة الأصلية */
      }
    }
    throw new Error(ERRORS[code] ?? code);
  }
  return data as T;
}

// كلمة سر عشوائية سهلة النسخ (من غير حروف شبه بعض زي O و 0)
export function genPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const a = new Uint32Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join('');
}
