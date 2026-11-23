import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

async function countOf(q: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function loadStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const head = { count: 'exact' as const, head: true };
  const [pending, todayCount, active, providersPending, providers, customers] = await Promise.all([
    countOf(supabase.from('bookings').select('id', head).eq('status', 'pending')),
    countOf(supabase.from('bookings').select('id', head).gte('created_at', today.toISOString())),
    countOf(supabase.from('bookings').select('id', head).in('status', ['accepted', 'confirmed', 'in_progress'])),
    countOf(supabase.from('provider_profiles').select('id', head).eq('status', 'pending')),
    countOf(supabase.from('provider_profiles').select('id', head).eq('status', 'approved')),
    countOf(supabase.from('profiles').select('id', head).eq('role', 'customer')),
  ]);
  return { pending, todayCount, active, providersPending, providers, customers };
}

export default function Home() {
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: loadStats, refetchInterval: 30_000 });

  const cards = [
    { label: 'حجوزات مستنية قبول', value: data?.pending, hot: true },
    { label: 'حجوزات النهارده', value: data?.todayCount },
    { label: 'حجوزات شغّالة', value: data?.active },
    { label: 'مقدمي خدمة مستنيين موافقة', value: data?.providersPending, hot: true },
    { label: 'مقدمي خدمة معتمدين', value: data?.providers },
    { label: 'العملاء', value: data?.customers },
  ];

  return (
    <>
      <h1 className="page-title">الرئيسية</h1>
      {error ? <div className="alert">تعذّر تحميل الأرقام: {String((error as Error).message ?? error)}</div> : null}
      <div className="stats">
        {cards.map((c) => (
          <div key={c.label} className={`stat${c.hot ? ' hot' : ''}`}>
            <div className="label">{c.label}</div>
            <div className="value">{isLoading ? '…' : (c.value ?? 0)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
