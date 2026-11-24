import { supabase } from './supabase';

export type Audience = 'all' | 'customers' | 'providers' | 'companies' | 'people';
export const AUDIENCES: { k: Audience; label: string }[] = [
  { k: 'all', label: 'الكل' },
  { k: 'customers', label: 'العملاء' },
  { k: 'providers', label: 'مقدمي الخدمة' },
  { k: 'companies', label: 'المؤسسات' },
  { k: 'people', label: 'أشخاص محددين' },
];
export const AUD_LABEL: Record<Audience, string> = Object.fromEntries(AUDIENCES.map((a) => [a.k, a.label])) as Record<Audience, string>;

export type Person = { id: string; full_name: string | null; phone: string | null; role: 'customer' | 'provider' };
export const ROLE_LABEL: Record<Person['role'], string> = { customer: 'عميل', provider: 'مقدم خدمة' };

export type Broadcast = { id: string; title: string; body: string; audience: Audience; sent_count: number; created_at: string };

// بحث بالاسم أو الموبايل (الموبايلات متخزنة 2010... من غير + ومن غير 0)
export async function searchPeople(q: string): Promise<Person[]> {
  const digits = q.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '').replace(/^0+/, '');
  const text = q.replace(/[%_\\]/g, ' ').trim();
  const base = supabase.from('profiles').select('id, full_name, phone, role').in('role', ['customer', 'provider']).limit(15);
  const { data, error } = digits.length >= 3 ? await base.ilike('phone', `%${digits}%`) : await base.ilike('full_name', `%${text}%`);
  if (error) throw error;
  return (data ?? []) as Person[];
}

export async function countRecipients(aud: Audience, ids: string[]): Promise<number> {
  const { data, error } = await supabase.rpc('admin_broadcast_count', { p_audience: aud, p_ids: aud === 'people' ? ids : null });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function sendBroadcast(title: string, body: string, aud: Audience, ids: string[]): Promise<number> {
  const { data, error } = await supabase.rpc('admin_send_broadcast', {
    p_title: title, p_body: body, p_audience: aud, p_ids: aud === 'people' ? ids : null,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function fetchBroadcasts(): Promise<Broadcast[]> {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('id, title, body, audience, sent_count, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Broadcast[];
}

export function msgError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (m.includes('FORBIDDEN')) return 'مالكش صلاحية تبعت رسائل';
  if (m.includes('EMPTY')) return 'اكتب العنوان ونص الرسالة';
  if (m.includes('NO_RECIPIENTS')) return 'مفيش حد هيستلم الرسالة دي';
  return m;
}
