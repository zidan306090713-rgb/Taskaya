import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// أول استخدام للتطبيق: الانترو + اختيار النوع بيظهروا مرة واحدة بس
const KEY = 'taskaya.onboarded.v1';
let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;

export function loadOnboarded(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (!pending) {
    pending = AsyncStorage.getItem(KEY)
      .then((v) => (cached = v === '1'))
      .catch(() => (cached = false));
  }
  return pending;
}

export async function setOnboarded() {
  cached = true;
  await AsyncStorage.setItem(KEY, '1').catch(() => {});
}

export function useOnboarded() {
  const [v, setV] = useState<boolean | null>(cached);
  useEffect(() => {
    if (v === null) void loadOnboarded().then(setV);
  }, [v]);
  return v;
}
