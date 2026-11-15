import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type SendArgs = { phone: string; fullName?: string; create: boolean };

// create = true  -> تسجيل حساب جديد (الاسم يتحفظ مع الحساب)
// create = false -> دخول لحساب موجود فقط
export function sendOtp({ phone, fullName, create }: SendArgs) {
  return supabase.auth.signInWithOtp({
    phone,
    options: {
      channel: 'sms',
      shouldCreateUser: create,
      data: create ? { full_name: (fullName ?? '').trim(), role: 'customer' } : undefined,
    },
  });
}

export function verifyOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({ phone, token, type: 'sms' });
}

// تسجيل حساب جديد بكلمة مرور: يرسل كود SMS للتأكد من الرقم، والحساب يتفعّل بعد verifyOtp
export function signUpWithPhone({ phone, password, fullName }: { phone: string; password: string; fullName: string }) {
  return supabase.auth.signUp({
    phone,
    password,
    options: { channel: 'sms', data: { full_name: fullName.trim(), role: 'customer' } },
  });
}

export function signInWithPhone(phone: string, password: string) {
  return supabase.auth.signInWithPassword({ phone, password });
}

// إعادة إرسال كود التأكيد لحساب لسه ما اتأكدش
export function resendSms(phone: string) {
  return supabase.auth.resend({ type: 'sms', phone });
}

// ---- بوابة تأخير الدخول: تسمح لشاشة الكود بعرض اللون الأخضر قبل التحويل للرئيسية ----
const gate: { held: boolean; pending: Session | null; apply: ((s: Session | null) => void) | null } = {
  held: false,
  pending: null,
  apply: null,
};

export function registerAuthApply(fn: (s: Session | null) => void) {
  gate.apply = fn;
}
// يرجّع true لو الجلسة اتحجزت مؤقتًا
export function interceptSession(s: Session | null): boolean {
  if (gate.held && s) {
    gate.pending = s;
    return true;
  }
  return false;
}
export function holdAuth() {
  gate.held = true;
  gate.pending = null;
}
export function cancelHold() {
  gate.held = false;
  gate.pending = null;
}
export function releaseAuth() {
  gate.held = false;
  const s = gate.pending;
  gate.pending = null;
  if (s && gate.apply) gate.apply(s);
}
