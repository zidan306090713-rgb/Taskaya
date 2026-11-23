import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

// ===== نفس هوية التطبيق بالظبط (apps/customer/src/theme/index.ts) =====
export type ThemeMode = 'light' | 'dark';
export type AccentKey = 'violet' | 'gold' | 'blue' | 'burgundy' | 'pink';
type Accent = { key: AccentKey; ar: string; main: string; light: string; dark: string; deep: string; textLight: string };

export const ACCENTS: Accent[] = [
  { key: 'blue', ar: 'أزرق لافا', main: '#1F5BFF', light: '#5C8DFF', dark: '#1645D9', deep: '#0B2A8F', textLight: '#1F5BFF' },
  { key: 'burgundy', ar: 'برجندي', main: '#8E1B3A', light: '#D0506F', dark: '#73122D', deep: '#4A0A1C', textLight: '#8E1B3A' },
  { key: 'violet', ar: 'بنفسجي غامق', main: '#5B21B6', light: '#9B6BFF', dark: '#4C1D95', deep: '#2E1065', textLight: '#5B21B6' },
  { key: 'gold', ar: 'أصفر ذهبي', main: '#E5A800', light: '#FFC93C', dark: '#B88500', deep: '#6B4A00', textLight: '#946B00' },
  { key: 'pink', ar: 'وردي', main: '#FF9CB5', light: '#FFC2D1', dark: '#E56A8A', deep: '#A8355A', textLight: '#C93F6A' },
];

function rgba(hex: string, a: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function cssVars(mode: ThemeMode, key: AccentKey): Record<string, string> {
  const A = ACCENTS.find((x) => x.key === key) ?? ACCENTS[0];
  const dk = mode === 'dark';
  return {
    '--accent': A.main,
    '--accent-light': A.light,
    '--accent-dark': A.dark,
    '--accent-deep': A.deep,
    '--accent-text': dk ? A.light : A.textLight,
    '--accent-soft': rgba(A.main, dk ? 0.18 : 0.1),
    '--accent-border': rgba(A.main, dk ? 0.4 : 0.25),
    '--grad-a': A.light,
    '--grad-b': A.dark,
    '--tab-a': dk ? A.dark : A.main,
    '--tab-b': A.deep,
    '--head-a': rgba(A.deep, 0.92),
    '--head-b': rgba(dk ? A.dark : A.main, 0.8),

    '--bg': dk ? '#0A0B0D' : '#F4F6FA',
    '--bg1': dk ? '#0A0B0D' : '#FAFBFD',
    '--bg2': dk ? '#14161A' : '#F2F4F8',
    '--bg3': dk ? '#0C0D10' : '#F6F7FA',

    '--ink': dk ? '#F3F5F8' : '#0B1F3A',
    '--muted': dk ? '#A3ABB8' : '#5B6F8A',
    '--panel-bg': dk ? 'rgba(28,31,38,0.7)' : 'rgba(255,255,255,0.6)',
    '--panel-border': dk ? 'rgba(255,255,255,0.10)' : rgba(A.main, 0.18),
    '--card': dk ? 'rgba(30,33,40,0.96)' : 'rgba(255,255,255,0.95)',
    '--card-border': dk ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
    '--surface': dk ? '#1B1E24' : '#F4F8FF',
    '--surface-focus': dk ? '#23262E' : '#FFFFFF',
    '--field-border': dk ? 'rgba(255,255,255,0.12)' : '#DCE8FA',
    '--line': dk ? 'rgba(255,255,255,0.08)' : rgba(A.main, 0.12),
    '--chip-bg': dk ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.7)',
    '--chip-border': dk ? 'rgba(255,255,255,0.14)' : rgba(A.main, 0.3),
    '--placeholder': dk ? '#6B7482' : '#A5B6CD',
    '--switch-off': dk ? 'rgba(255,255,255,0.18)' : 'rgba(11,31,58,0.16)',
    '--shadow': dk ? rgba(A.main, 0.22) : 'rgba(100,116,139,0.16)',
    '--star': dk ? A.light : A.main,
    '--star-glow': dk ? rgba(A.light, 0.55) : 'rgba(255,255,255,0)',

    '--danger': dk ? '#F87171' : '#DC2626',
    '--danger-bg': 'rgba(220,38,38,0.08)',
    '--danger-border': 'rgba(220,38,38,0.3)',
  };
}

type ThemeCtx = {
  mode: ThemeMode;
  accent: AccentKey;
  toggle: () => void;
  setAccent: (k: AccentKey) => void;
};
const Ctx = createContext<ThemeCtx>({ mode: 'light', accent: 'blue', toggle: () => {}, setAccent: () => {} });
const KEY = 'taskaya-admin-theme';

function readSaved(): { mode?: ThemeMode; accent?: AccentKey } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(readSaved);
  const [mode, setMode] = useState<ThemeMode>(
    saved.mode ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  );
  const [accent, setAccent] = useState<AccentKey>(
    saved.accent && ACCENTS.some((a) => a.key === saved.accent) ? saved.accent : 'blue',
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(cssVars(mode, accent))) root.style.setProperty(k, v);
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    try {
      localStorage.setItem(KEY, JSON.stringify({ mode, accent }));
    } catch {
      /* مش مشكلة */
    }
  }, [mode, accent]);

  const value = useMemo(
    () => ({ mode, accent, setAccent, toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')) }),
    [mode, accent],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
