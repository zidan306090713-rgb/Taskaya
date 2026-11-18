import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { ACCENTS, AccentKey, buildPalette, Palette, ThemeMode } from '@/theme';

const STORE_KEY = 'taskaya.theme.v1';

type Saved = { mode: ThemeMode; accent: AccentKey };
type Ctx = {
  mode: ThemeMode;
  accent: AccentKey;
  c: Palette;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentKey) => void;
};

const fallback: Ctx = {
  mode: 'light',
  accent: 'blue',
  c: buildPalette('light', 'blue'),
  setMode: () => {},
  setAccent: () => {},
};

const ThemeContext = createContext<Ctx>(fallback);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>({ mode: 'light', accent: 'blue' });
  const [ready, setReady] = useState(false);

  // قراءة الاختيار المحفوظ مرة واحدة عند الفتح
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORE_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const p = JSON.parse(raw);
        setSaved({
          mode: p?.mode === 'dark' ? 'dark' : 'light',
          accent: ACCENTS.some((a) => a.key === p?.accent) ? p.accent : 'blue',
        });
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // حفظ أي تغيير
  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORE_KEY, JSON.stringify(saved)).catch(() => {});
  }, [ready, saved]);

  const value = useMemo<Ctx>(
    () => ({
      mode: saved.mode,
      accent: saved.accent,
      c: buildPalette(saved.mode, saved.accent),
      setMode: (mode) => setSaved((s) => ({ ...s, mode })),
      setAccent: (accent) => setSaved((s) => ({ ...s, accent })),
    }),
    [saved]
  );

  if (!ready) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
