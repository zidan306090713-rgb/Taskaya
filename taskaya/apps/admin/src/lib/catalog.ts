import { supabase } from './supabase';

export type Svc = {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  is_active: boolean;
};
export type Sub = { id: string; name_ar: string; name_en: string; sort_order: number; is_active: boolean; services: Svc[] };
export type Cat = {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  subs: Sub[];
};

export type Kind = 'cat' | 'sub' | 'svc';
const TABLE: Record<Kind, string> = { cat: 'service_categories', sub: 'service_subcategories', svc: 'services' };

// أيقونات Ionicons اللي التطبيق هيعرضها للأقسام
export const ICONS: { value: string; label: string; emoji: string }[] = [
  { value: 'water-outline', label: 'غسيل / مياه', emoji: '💧' },
  { value: 'sparkles-outline', label: 'تنظيف', emoji: '✨' },
  { value: 'home-outline', label: 'بيت / هاوس كيبينج', emoji: '🏠' },
  { value: 'construct-outline', label: 'فنيين / صيانة', emoji: '🛠️' },
  { value: 'flash-outline', label: 'كهرباء', emoji: '⚡' },
  { value: 'snow-outline', label: 'تكييف', emoji: '❄️' },
  { value: 'hammer-outline', label: 'نجارة', emoji: '🔨' },
  { value: 'brush-outline', label: 'دهانات', emoji: '🖌️' },
  { value: 'leaf-outline', label: 'حدائق', emoji: '🌿' },
  { value: 'bug-outline', label: 'مكافحة حشرات', emoji: '🐞' },
  { value: 'car-outline', label: 'عربيات', emoji: '🚗' },
  { value: 'shirt-outline', label: 'مغاسل ملابس', emoji: '👕' },
  { value: 'cube-outline', label: 'نقل عفش', emoji: '📦' },
  { value: 'grid-outline', label: 'عام', emoji: '🔲' },
];
export const iconEmoji = (v: string | null) => ICONS.find((i) => i.value === v)?.emoji ?? '🔲';

export async function fetchCatalog(): Promise<Cat[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select(
      `id, name_ar, name_en, description_ar, description_en, icon, sort_order, is_active,
       subs:service_subcategories(id, name_ar, name_en, sort_order, is_active,
         services(id, name_ar, name_en, description_ar, description_en, is_active))`,
    )
    .order('sort_order');
  if (error) throw error;
  const cats = (data ?? []) as unknown as Cat[];
  for (const c of cats) {
    c.subs.sort((a, b) => a.sort_order - b.sort_order || a.name_ar.localeCompare(b.name_ar, 'ar'));
    for (const s of c.subs) s.services.sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
  }
  return cats;
}

// id موجود = تعديل، id = null = إضافة جديدة
export async function saveRow(kind: Kind, id: string | null, row: Record<string, unknown>) {
  const { error } = id
    ? await supabase.from(TABLE[kind]).update(row).eq('id', id)
    : await supabase.from(TABLE[kind]).insert(row);
  if (error) throw error;
}

export async function deleteRow(kind: Kind, id: string) {
  const { error } = await supabase.rpc('admin_delete_catalog', { p_kind: kind, p_id: id });
  if (error) throw error;
}

// IN_USE:<عدد مقدمي الخدمة>:<عدد الحجوزات> جاية من دالة الحذف
export function catalogError(e: unknown) {
  const err = e as { code?: string; message?: string };
  const m = err?.message ?? String(e);
  const used = m.match(/IN_USE:(\d+):(\d+)/);
  if (used) {
    const parts: string[] = [];
    if (Number(used[1])) parts.push(`${used[1]} مقدم خدمة بيقدّمها`);
    if (Number(used[2])) parts.push(`${used[2]} حجز عليها`);
    return `مش هينفع تتحذف: ${parts.join(' و')}. اقفلها بالمفتاح بدل الحذف.`;
  }
  if (err?.code === '23503' || m.includes('foreign key')) {
    return 'مش هينفع تتحذف لأنها مرتبطة ببيانات تانية. اقفلها بالمفتاح بدل الحذف.';
  }
  return m;
}
