const FOLD: Record<string, string> = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي' };
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

// نفس قواعد الدالة ar_norm في قاعدة البيانات، علشان نتيجة البحث المحلي والسيرفر تتطابق
export function normalizeAr(input?: string | null): string {
  return (input ?? '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱةىؤئ]/g, (c) => FOLD[c])
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
