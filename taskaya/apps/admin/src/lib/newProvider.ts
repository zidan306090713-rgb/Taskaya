import { supabase } from './supabase';

export type Pricing = 'fixed' | 'starting_from' | 'custom_quote';
export type Area = { id: string; name_ar: string; city: { name_ar: string } | null };

export type NewProviderBody = {
  full_name: string;
  phone: string;
  password: string;
  business_name: string;
  description: string | null;
  business_address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_verified: boolean;
  is_featured: boolean;
  services: { service_id: string; pricing_model: Pricing; base_price: number | null; duration: number | null }[];
  areas: string[];
};

// 01012345678 / +201012345678 / ٠١٠١٢٣٤٥٦٧٨ → +201012345678 (أو null لو مش صح)
export function toE164(raw: string): string | null {
  let n = raw
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '');
  if (n.startsWith('0020')) n = n.slice(4);
  else if (n.startsWith('20')) n = n.slice(2);
  if (n.startsWith('0')) n = n.slice(1);
  return /^1[0125]\d{8}$/.test(n) ? `+20${n}` : null;
}

export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase
    .from('service_areas')
    .select('id, name_ar, city:cities(name_ar)')
    .eq('is_active', true)
    .order('name_ar');
  if (error) throw error;
  return (data ?? []) as unknown as Area[];
}

export async function uploadImage(file: File, kind: 'logo' | 'cover'): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}/${kind}.${ext}`;
  const { error } = await supabase.storage.from('providers').upload(path, file, { contentType: file.type || 'image/jpeg' });
  if (error) throw new Error('تعذّر رفع الصورة: ' + error.message);
  return supabase.storage.from('providers').getPublicUrl(path).data.publicUrl;
}

const ERRORS: Record<string, string> = {
  PHONE_EXISTS: 'الرقم ده مسجّل قبل كده بحساب تاني (عميل أو مقدم خدمة)',
  NOT_ADMIN: 'حسابك مش أدمن',
  NAME_3_PARTS: 'الاسم لازم يكون ثلاثي',
  BAD_PHONE: 'رقم الموبايل مش صح',
  BUSINESS_NAME: 'اسم النشاط مطلوب',
  PRICE_REQUIRED: 'كل خدمة لازم يبقى ليها سعر (إلا اللي بعرض سعر)',
  WEAK_PASSWORD: 'كلمة السر لازم 8 حروف على الأقل',
  NOT_PROVIDER: 'الحساب ده مش مقدم خدمة',
};

// كلمة سر قوية عشوائية (من غير حروف بتتلخبط زي 0/O و 1/l)
export function genPassword(len = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join('');
}

// بيطلّع رسالة الخطأ الحقيقية من رد الـ Edge Function
async function fnError(error: { message: string }): Promise<Error> {
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
  return new Error(ERRORS[code] ?? code);
}

// كلمة سر جديدة لمقدم خدمة موجود
export async function setProviderPassword(id: string, password: string): Promise<void> {
  const { error } = await supabase.functions.invoke('create-provider', { body: { action: 'set_password', provider_id: id, password } });
  if (error) throw await fnError(error);
}

// بينادي الـ Edge Function (create-provider) — توكن الأدمن بيتبعت لوحده
export async function createProvider(body: NewProviderBody): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-provider', { body });
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
  return (data as { id: string }).id;
}
