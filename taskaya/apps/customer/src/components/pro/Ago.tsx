import { useEffect, useState } from 'react';
import { tr } from '@/i18n';

export function agoOf(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (m < 1) return tr('دلوقتي', 'just now');
  if (m < 60) return tr(`من ${m} دقيقة`, `${m} min ago`);
  const h = Math.floor(m / 60);
  if (h < 24) return tr(`من ${h} ساعة`, `${h} h ago`);
  return tr(`من ${Math.floor(h / 24)} يوم`, `${Math.floor(h / 24)} d ago`);
}

// الأقدم الأول: الطلب اللي مستني من بدري يطلع فوق
export const oldestFirst = (a: { created_at: string }, b: { created_at: string }) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

/** "اتطلب من X دقيقة": بيتحدّث لوحده كل دقيقة */
export function Ago({ iso }: { iso: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const a = agoOf(iso, now);
  return <>{tr(`اتطلب ${a}`, `Requested ${a}`)}</>;
}
