import { Ico } from '../components/Ico';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingDrawer from '../components/BookingDrawer';
import { useAuth } from '../lib/auth';
import { fetchBooking, money, STATUS } from '../lib/bookings';
import { fetchDashboard, type DayPoint, type MiniBooking } from '../lib/dashboard';

const nf = new Intl.NumberFormat('en-US');
const fullDate = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' });
const shortDay = new Intl.DateTimeFormat('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', numberingSystem: 'latn' });

const greeting = () => (new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير');

function ago(ts?: string) {
  if (!ts) return '';
  const m = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (m < 60) return `من ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'من ساعة' : h === 2 ? 'من ساعتين' : `من ${h} ساعات`;
  const d = Math.round(h / 24);
  return d === 1 ? 'من يوم' : d === 2 ? 'من يومين' : `من ${d} أيام`;
}

// نسبة التغيير عن الفترة اللي قبلها (null = مفيش فترة قبلها نقارن بيها)
function pct(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const max = Math.max(1, ...values);
  const w = 100;
  const h = 30;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={`0,${h} ${pts} ${w},${h}`} className="spark-fill" />
      <polyline points={pts} className="spark-line" />
    </svg>
  );
}

function Kpi(props: {
  icon: string;
  label: string;
  value: ReactNode;
  change?: number | null;
  sub?: string;
  spark?: number[];
  to?: string;
  hot?: boolean;
}) {
  const nav = useNavigate();
  const { icon, label, value, change, sub, spark, hot } = props;
  const allowed = useAuth().can('bookings');
  const to = allowed ? props.to : undefined;
  return (
    <button className={`kpi${hot ? ' hot' : ''}${to ? '' : ' static'}`} onClick={to ? () => nav(to) : undefined} tabIndex={to ? 0 : -1}>
      <div className="kpi-top">
        <span className="kpi-icon"><Ico e={icon} /></span>
        {to ? <span className="kpi-go" aria-hidden="true">‹</span> : null}
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {change != null ? (
          <span className={`delta ${change >= 0 ? 'up' : 'down'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
          </span>
        ) : null}
        {sub ? <span className="muted small">{sub}</span> : null}
      </div>
      {spark ? <Spark values={spark} /> : null}
    </button>
  );
}

function BarChart({ data }: { data: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.created, d.completed)));
  const step = data.length > 14 ? 5 : 1;
  return (
    <div className="chart">
      <div className="chart-bars">
        {data.map((d, i) => (
          <div
            key={d.day}
            className={`chart-col${hover === i ? ' on' : ''}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover(hover === i ? null : i)}
          >
            {hover === i ? (
              <div className="chart-tip">
                <b>{shortDay.format(new Date(d.day))}</b>
                <span><i className="lg a" /> جديدة: {d.created}</span>
                <span><i className="lg b" /> تمت: {d.completed}</span>
                {d.revenue ? <span><Ico e="💰" /> {money(d.revenue)}</span> : null}
              </div>
            ) : null}
            <div className="chart-pair">
              <span className="bar a" style={{ height: `${(d.created / max) * 100}%` }} />
              <span className="bar b" style={{ height: `${(d.completed / max) * 100}%` }} />
            </div>
            <span className="chart-x">{i % step === 0 || i === data.length - 1 ? new Date(d.day).getDate() : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Rank({ items, empty }: { items: { name: string; n: number }[]; empty: string }) {
  if (!items.length) return <p className="muted small">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <ol className="rank">
      {items.map((it, i) => (
        <li key={it.name}>
          <span className={`rank-n r${i + 1}`}>{i + 1}</span>
          <div className="rank-body">
            <div className="rank-row">
              <b>{it.name}</b>
              <span className="num">{it.n}</span>
            </div>
            <div className="rank-bar">
              <span style={{ width: `${(it.n / max) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function MiniRow({ b, meta, onOpen }: { b: MiniBooking; meta: string; onOpen: () => void }) {
  return (
    <button className="mini-row" onClick={onOpen}>
      <span className={`dot t-${STATUS[b.status].tone}`} />
      <div className="mini-body">
        <div className="mini-top">
          <b>#{b.booking_number} · {b.service}</b>
          <span className={`badge t-${STATUS[b.status].tone}`}>{STATUS[b.status].label}</span>
        </div>
        <div className="muted small">
          {b.customer || '—'} · {meta}
        </div>
      </div>
      <span className="mini-go" aria-hidden="true">‹</span>
    </button>
  );
}

export default function Home() {
  const { admin, can } = useAuth();
  const showMoney = can('money');
  const nav = useNavigate();
  const [days, setDays] = useState<7 | 30>(7);
  const [openId, setOpenId] = useState<string | null>(null);
  // المفتاح بيبدأ بـ 'stats' عشان أي تعديل في حجز يحدّث الرئيسية لوحده
  const { data, isLoading, error } = useQuery({ queryKey: ['stats', days], queryFn: () => fetchDashboard(days) });
  // الحجز بيتجاب لوحده لما تدوس عليه (بدل تحميل 500 حجز)

  const first = (admin?.full_name ?? '').trim().split(/\s+/)[0] || '';
  const s = data?.series ?? [];
  const c = data?.counts;
  const m = data?.money;
  const v = (x: number | undefined, f: (n: number) => string = (n) => nf.format(n)) => (isLoading || x == null ? '…' : f(x));

  const one = useQuery({ queryKey: ['bookings', 'one', openId], queryFn: () => fetchBooking(openId as string), enabled: Boolean(openId) });
  const open = one.data ?? null;
  const openBooking = (id: string) => {
    if (!can('bookings')) return;
    setOpenId(id);
  };

  return (
    <>
      <header className="dash-head">
        <div>
          <h1 className="hello">
            {greeting()}{first ? ` يا ${first}` : ''}
          </h1>
          <p className="muted">
            {fullDate.format(new Date())}
            {data ? (data.needs_total ? ` · عندك ${data.needs_total} حاجة مستنياك` : ' · مفيش حاجة مستنياك') : ''}
          </p>
        </div>
        <div className="seg" role="tablist" aria-label="الفترة">
          <button className={days === 7 ? 'on' : ''} onClick={() => setDays(7)}>7 أيام</button>
          <button className={days === 30 ? 'on' : ''} onClick={() => setDays(30)}>30 يوم</button>
        </div>
      </header>

      {error ? <div className="alert">تعذّر تحميل الأرقام: {(error as Error).message}</div> : null}

      <div className="kpis">
        <Kpi icon="⏳" label="مستني قبول" value={v(c?.pending)} hot={!!c?.pending} to="/bookings?tab=pending" />
        <Kpi icon="💬" label="مستني رد العميل" value={v(c?.awaiting)} to="/bookings?tab=awaiting_customer_approval" />
        <Kpi icon="🛠" label="شغّالة دلوقتي" value={v(c?.active)} to="/bookings?tab=confirmed" />
        <Kpi
          icon="✅"
          label={`تمت (${days === 7 ? '7 أيام' : '30 يوم'})`}
          value={v(c?.completed)}
          change={c ? pct(c.completed, c.completed_prev) : null}
          spark={s.map((d) => d.completed)}
          to="/bookings?tab=completed"
        />
        {showMoney ? (
          <>
        <Kpi
          icon="💵"
          label="الإيرادات"
          value={v(m?.revenue, (n) => money(n))}
          change={m ? pct(m.revenue, m.revenue_prev) : null}
          sub={m ? `النهارده ${money(m.today_revenue)}` : undefined}
          spark={s.map((d) => d.revenue)}
        />
        <Kpi
          icon="💰"
          label="عمولتك"
          value={v(m?.commission, (n) => money(n))}
          change={m ? pct(m.commission, m.commission_prev) : null}
          sub={m ? `النهارده ${money(m.today_commission)}` : undefined}
          hot
        />
          </>
        ) : null}
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h3><Ico e="📈" /> الحجوزات</h3>
            <div className="legend">
              <span><i className="lg a" /> جديدة {c ? `(${nf.format(c.created)})` : ''}</span>
              <span><i className="lg b" /> تمت</span>
              {c && pct(c.created, c.created_prev) != null ? (
                <span className={`delta ${(pct(c.created, c.created_prev) ?? 0) >= 0 ? 'up' : 'down'}`}>
                  {(pct(c.created, c.created_prev) ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(pct(c.created, c.created_prev) ?? 0)}%
                </span>
              ) : null}
            </div>
          </div>
          {s.length ? <BarChart data={s} /> : <div className="chart-empty muted">{isLoading ? 'جاري التحميل…' : 'مفيش بيانات'}</div>}
        </section>

        <section className="panel needs">
          <div className="panel-head">
            <h3><Ico e="⚡" /> محتاج تحرّك {data?.needs_total ? <span className="count-pill">{data.needs_total}</span> : null}</h3>
          </div>
          {data && !data.needs.length ? (
            <div className="all-good">
              <span><Ico e="🎉" /></span>
              <b>كله تمام</b>
              <span className="muted small">مفيش حجوزات مستنياك</span>
            </div>
          ) : (
            <div className="mini-list">
              {(data?.needs ?? []).map((b) => (
                <MiniRow
                  key={b.id}
                  b={b}
                  meta={b.status === 'pending' ? `مستني ${ago(b.since).replace('من ', '')}` : `العرض من ${ago(b.since).replace('من ', '')}`}
                  onOpen={() => openBooking(b.id)}
                />
              ))}
              {data && data.needs_total > data.needs.length ? (
                <button className="add-btn" onClick={() => nav('/bookings?tab=pending')}>عرض الكل ({data.needs_total})</button>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <div className="dash-row3">
        <section className="panel">
          <div className="panel-head"><h3><Ico e="🏆" /> أكتر مقدمي الخدمة</h3></div>
          <Rank items={data?.top_providers ?? []} empty="مفيش حجوزات في الفترة دي" />
        </section>
        <section className="panel">
          <div className="panel-head"><h3><Ico e="🧰" /> أكتر الخدمات طلبًا</h3></div>
          <Rank items={data?.top_services ?? []} empty="مفيش حجوزات في الفترة دي" />
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3><Ico e="🕒" /> آخر الحجوزات</h3>
            <button className="mini" onClick={() => nav('/bookings?tab=all')}>الكل</button>
          </div>
          <div className="mini-list">
            {(data?.recent ?? []).map((b) => (
              <MiniRow key={b.id} b={b} meta={ago(b.created_at)} onOpen={() => openBooking(b.id)} />
            ))}
          </div>
        </section>
      </div>

      {open ? <BookingDrawer key={open.id} b={open} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
