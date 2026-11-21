// ===== ثوابت قديمة (باقية لحد ما كل الشاشات تتحول للثيم الجديد) =====
export const colors = {
  primary: '#2F8CFF',
  primaryLight: '#3B9BFF',
  background: '#D9E7FA',
  surface: 'rgba(11,31,58,0.04)',
  text: '#2F80ED',
  textSecondary: '#5B6F8A',
  accent: 'rgba(47,140,255,0.12)',
  border: '#3B9BFF',
  danger: '#DC2626',
  success: '#16A34A',
  // glass tokens
  glass: 'rgba(255,255,255,0.72)',
  glassStrong: 'rgba(255,255,255,0.9)',
  glassHighlight: 'rgba(255,255,255,0.6)',
  glow: '#2F8CFF',
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 };
export const fonts = {
  regular: 'Cairo_400Regular',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
};

// ===== نظام الثيم =====
export type ThemeMode = 'light' | 'dark';
// "blue" فضل نفس المفتاح عشان اللي كان مختار الأزرق ياخد الأزرق اللافا تلقائيًا
export type AccentKey = 'violet' | 'gold' | 'blue' | 'burgundy' | 'pink';
export type Accent = {
  key: AccentKey;
  ar: string;
  en: string;
  main: string; // اللون الأساسي (كود المستخدم)
  light: string; // للنص/الأيقونات في الوضع الغامق + بداية التدرّج
  dark: string;
  deep: string;
  textLight: string; // لون النص/الأيقونات فوق الخلفية الفاتحة
};

export const ACCENTS: Accent[] = [
  { key: 'blue', ar: 'أزرق لافا', en: 'Lava Blue', main: '#1F5BFF', light: '#5C8DFF', dark: '#1645D9', deep: '#0B2A8F', textLight: '#1F5BFF' },
  { key: 'burgundy', ar: 'برجندي', en: 'Burgundy', main: '#8E1B3A', light: '#D0506F', dark: '#73122D', deep: '#4A0A1C', textLight: '#8E1B3A' },
  { key: 'violet', ar: 'بنفسجي غامق', en: 'Violet', main: '#5B21B6', light: '#9B6BFF', dark: '#4C1D95', deep: '#2E1065', textLight: '#5B21B6' },
  { key: 'gold', ar: 'أصفر ذهبي', en: 'Golden Yellow', main: '#E5A800', light: '#FFC93C', dark: '#B88500', deep: '#6B4A00', textLight: '#946B00' },
  { key: 'pink', ar: 'وردي', en: 'Pink', main: '#FF9CB5', light: '#FFC2D1', dark: '#E56A8A', deep: '#A8355A', textLight: '#C93F6A' },
];

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// t=0 يرجّع hex، t=1 يرجّع other
export function mix(hex: string, other: string, t: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return '#' + a.map((v, i) => clamp(v * (1 - t) + b[i] * t).toString(16).padStart(2, '0')).join('');
}

export function buildPalette(mode: ThemeMode, key: AccentKey) {
  const A = ACCENTS.find((x) => x.key === key) ?? ACCENTS[0];
  const dk = mode === 'dark';
  const accentText = dk ? A.light : A.textLight;
  return {
    isDark: dk,
    accentKey: A.key,
    accent: A.main,
    accentLight: A.light,
    accentDark: A.dark,
    accentText,
    gradient: [A.light, A.dark] as [string, string],
    tabGradient: (dk ? [A.dark, A.deep] : [A.main, A.deep]) as [string, string],
    accentSoft: rgba(A.main, dk ? 0.18 : 0.1),
    accentBorder: rgba(A.main, dk ? 0.4 : 0.25),
    accentLine: rgba(A.main, 0.14),

    background: dk ? '#0A0B0D' : '#F4F6FA',
    bgGradient: (dk
      ? ['#0A0B0D', '#14161A', '#0C0D10']
      : ['#FAFBFD', '#F2F4F8', '#F6F7FA']) as [string, string, string],

    text: accentText,
    ink: dk ? '#F3F5F8' : '#0B1F3A',
    textSecondary: dk ? '#A3ABB8' : '#5B6F8A',

    glassBg: dk ? 'rgba(28,31,38,0.62)' : 'rgba(255,255,255,0.4)',
    glassBorder: dk ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.85)',
    glassHighlight: (dk
      ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)']
      : ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']) as [string, string],
    panelBg: dk ? 'rgba(28,31,38,0.7)' : 'rgba(255,255,255,0.6)',
    panelBorder: dk ? 'rgba(255,255,255,0.10)' : rgba(A.main, 0.18),
    card: dk ? 'rgba(30,33,40,0.96)' : 'rgba(255,255,255,0.95)',
    cardBorder: dk ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
    circleGradient: (dk ? ['#2B2F38', '#1B1E24'] : ['#FFFFFF', '#EEF1F6']) as [string, string],
    placeholderGradient: [rgba(A.light, 0.55), rgba(A.main, 0.12)] as [string, string],

    ballBg: dk ? '#1B1E24' : '#FFFFFF',
    ballBorder: dk ? rgba(A.light, 0.55) : mix(A.main, '#FFFFFF', 0.75),
    ballIcon: dk ? A.light : A.main,
    switchOff: dk ? 'rgba(255,255,255,0.18)' : 'rgba(11,31,58,0.16)',
    starGlow: dk ? rgba(A.light, 0.55) : 'rgba(255,255,255,0)',
    shadow: dk ? A.main : '#64748B',

    fieldBg: dk ? '#1B1E24' : '#F4F8FF',
    fieldBgFocus: dk ? '#23262E' : '#FFFFFF',
    fieldBorder: dk ? 'rgba(255,255,255,0.12)' : '#DCE8FA',
    searchBg: dk ? '#1B1E24' : '#FFFFFF',
    iconMuted: dk ? '#7C8696' : '#8FA6C4',
    placeholder: dk ? '#6B7482' : '#A5B6CD',
    headerBg: dk ? '#0F1114' : '#F4F6FA',
    chipBg: dk ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.7)',
    chipBorder: dk ? 'rgba(255,255,255,0.14)' : rgba(A.main, 0.3),
    summaryBg: dk ? '#14161A' : A.deep,

    dangerText: dk ? '#F87171' : '#DC2626',
    dangerBg: 'rgba(220,38,38,0.08)',
    dangerBorder: 'rgba(220,38,38,0.3)',
  };
}

export type Palette = ReturnType<typeof buildPalette>;
