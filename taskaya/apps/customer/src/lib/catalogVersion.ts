import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { clearCatalogCaches } from '@/lib/api';
import { loadDirectory } from '@/lib/directory';
import { supabase } from '@/lib/supabase';

/**
 * رقم نسخة الأقسام والخدمات (جدول app_meta — صف واحد).
 * قاعدة البيانات بتزوّده لوحدها مع أي تعديل من الداش بورد.
 * التطبيق بيقراه بس لما المستخدم يفتح الرئيسية أو يرجع للتطبيق — مفيش أي طلبات بتوقيت.
 * لو الرقم اتغير: نمسح الكاش ونحمّل من جديد، وكل الشاشات المشتركة بتتحدث.
 */
const MIN_GAP = 30_000; // ما نسألش أكتر من مرة كل 30 ثانية

let known: number | null = null;
let lastCheck = 0;
let checking: Promise<void> | null = null;
let wired = false;
const listeners = new Set<() => void>();

async function readVersion(): Promise<number | null> {
  const { data, error } = await supabase.from('app_meta').select('catalog_version').eq('id', 1).maybeSingle();
  if (error || !data) return null;
  return Number(data.catalog_version);
}

export function checkCatalog(): Promise<void> {
  if (checking) return checking;
  if (Date.now() - lastCheck < MIN_GAP) return Promise.resolve();
  lastCheck = Date.now();

  checking = (async () => {
    try {
      const v = await readVersion();
      if (v == null) return;
      if (known === null) {
        known = v; // أول مرة: البيانات لسه متحملة حالًا
        return;
      }
      if (v === known) return; // مفيش جديد — ولا طلب تاني
      known = v;
      clearCatalogCaches();
      await loadDirectory(true); // بيحدّث bootstrap (الأقسام + الدليل) في طلب واحد
      listeners.forEach((l) => l());
    } catch {
      // من غير نت مثلاً: نكمّل بالكاش
    } finally {
      checking = null;
    }
  })();
  return checking;
}

// بيتنادى مرة واحدة: يشيك لما التطبيق يرجع من الخلفية
export function wireCatalogChecks() {
  if (wired) return;
  wired = true;
  AppState.addEventListener('change', (s) => {
    if (s === 'active') void checkCatalog();
  });
}

// رقم بيزيد كل ما البيانات تتحدث — حطه في deps عشان الشاشة تعيد القراءة
export function useCatalogVersion(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const l = () => setN((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return n;
}
