const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

// يقبل: 01012345678 | 1012345678 | +201012345678 | 201012345678 | 00201012345678 (وبأرقام عربية)
// يرجّع الصيغة الدولية +20XXXXXXXXXX أو null لو الرقم غير صالح.
export function normalizeEgyptPhone(input: string): string | null {
  let d = input
    .replace(/[٠-٩]/g, (c) => String(AR_DIGITS.indexOf(c)))
    .replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('0020')) d = d.slice(4);
  else if (d.startsWith('20')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^1[0125]\d{8}$/.test(d) ? `+20${d}` : null;
}

// +201012345678 -> 01012345678 (للعرض فقط)
export function toLocalDisplay(e164: string): string {
  return '0' + e164.replace(/^\+?20/, '');
}
