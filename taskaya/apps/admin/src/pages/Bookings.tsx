import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import BookingDrawer from '../components/BookingDrawer';
import { fetchBookings, fmtDate, money, STATUS, STATUS_ORDER, type Status } from '../lib/bookings';

type Tab = 'all' | Status;

export default function Bookings() {
  const { data, isLoading, error } = useQuery({ queryKey: ['bookings'], queryFn: fetchBookings, refetchInterval: 20_000 });
  const [tab, setTab] = useState<Tab>('pending');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m: Partial<Record<Status, number>> = {};
    for (const b of data ?? []) m[b.status] = (m[b.status] ?? 0) + 1;
    return m;
  }, [data]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((b) => {
      if (tab !== 'all' && b.status !== tab) return false;
      if (!s) return true;
      return (
        String(b.booking_number).includes(s) ||
        (b.customer?.full_name ?? '').toLowerCase().includes(s) ||
        (b.customer?.phone ?? '').includes(s) ||
        (b.provider?.business_name ?? '').toLowerCase().includes(s)
      );
    });
  }, [data, tab, q]);

  const open = (data ?? []).find((b) => b.id === openId) ?? null;

  return (
    <>
      <h1 className="page-title">الحجوزات</h1>

      <div className="toolbar">
        <input
          className="inp search"
          placeholder="ابحث برقم الحجز، اسم العميل، الموبايل أو مقدم الخدمة"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'all' ? ' on' : ''}`} onClick={() => setTab('all')}>
          الكل <span className="count">{data?.length ?? 0}</span>
        </button>
        {STATUS_ORDER.map((s) => (
          <button key={s} className={`tab${tab === s ? ' on' : ''}`} onClick={() => setTab(s)}>
            {STATUS[s].label} <span className="count">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? <div className="alert">تعذّر تحميل الحجوزات: {(error as Error).message}</div> : null}

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>العميل</th>
              <th>الخدمة</th>
              <th>مقدم الخدمة</th>
              <th>الميعاد</th>
              <th>السعر</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="empty">جاري التحميل…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={7} className="empty">مفيش حجوزات هنا</td></tr>
            ) : (
              shown.map((b) => (
                <tr key={b.id} onClick={() => setOpenId(b.id)}>
                  <td className="num">{b.booking_number}</td>
                  <td>
                    <div className="strong">{b.customer?.full_name || '—'}</div>
                    <div className="muted small" dir="ltr">{b.customer?.phone || ''}</div>
                  </td>
                  <td>{b.service?.name_ar || '—'}</td>
                  <td>{b.provider?.business_name || <span className="muted">ترشيح</span>}</td>
                  <td className="small">{fmtDate(b.scheduled_at)}</td>
                  <td className="num">{money(b.final_price ?? b.quoted_price)}</td>
                  <td><span className={`badge t-${STATUS[b.status].tone}`}>{STATUS[b.status].label}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open ? <BookingDrawer key={open.id} b={open} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
