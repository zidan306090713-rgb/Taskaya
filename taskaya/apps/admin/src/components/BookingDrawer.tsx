import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ACTIONS,
  addressText,
  fetchHistory,
  fmtDate,
  friendlyError,
  money,
  PRICING,
  STATUS,
  updatePrices,
  updateStatus,
  type Action,
  type Booking,
  type Status,
} from '../lib/bookings';

const toNum = (s: string) => (s.trim() === '' ? null : Number(s));
const LOCKED: Status[] = ['completed', 'cancelled', 'rejected'];

export default function BookingDrawer({ b, onClose }: { b: Booking; onClose: () => void }) {
  const qc = useQueryClient();
  const history = useQuery({ queryKey: ['booking-history', b.id], queryFn: () => fetchHistory(b.id) });
  const [quoted, setQuoted] = useState(b.quoted_price?.toString() ?? '');
  const [final, setFinal] = useState(b.final_price?.toString() ?? '');
  const [ask, setAsk] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['bookings'] });
    void qc.invalidateQueries({ queryKey: ['booking-history', b.id] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const statusM = useMutation({
    mutationFn: (v: { to: Status; reason?: string }) => updateStatus(b.id, v.to, v.reason),
    onSuccess: () => {
      setAsk(null);
      setReason('');
      refresh();
    },
    onError: (e) => setErr(friendlyError(e)),
  });

  const priceM = useMutation({
    mutationFn: () => {
      const qn = toNum(quoted);
      const fn = toNum(final);
      if ((qn != null && (isNaN(qn) || qn < 0)) || (fn != null && (isNaN(fn) || fn < 0))) {
        throw new Error('اكتب السعر أرقام بس');
      }
      return updatePrices(b.id, qn, fn);
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      refresh();
    },
    onError: (e) => setErr(friendlyError(e)),
  });

  const price = b.final_price ?? b.quoted_price;
  const locked = LOCKED.includes(b.status);
  const busy = statusM.isPending || priceM.isPending;

  const run = (a: Action) => {
    setErr('');
    if ((a.to === 'completed' || a.to === 'quotation_submitted') && price == null) {
      return setErr('حدد السعر واضغط "حفظ السعر" الأول');
    }
    if (a.needsReason) return setAsk(a);
    statusM.mutate({ to: a.to });
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <div className="muted small">حجز رقم</div>
            <div className="drawer-title">#{b.booking_number}</div>
          </div>
          <span className={`badge t-${STATUS[b.status].tone}`}>{STATUS[b.status].label}</span>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">✕</button>
        </header>

        <div className="drawer-body">
          <section className="section">
            <div className="kv">
              <span>العميل</span>
              <b>{b.customer?.full_name || '—'}</b>
              <span>الموبايل</span>
              <b dir="ltr">{b.customer?.phone ? <a href={`tel:${b.customer.phone}`}>{b.customer.phone}</a> : '—'}</b>
              <span>الخدمة</span>
              <b>{b.service?.name_ar || '—'}</b>
              <span>مقدم الخدمة</span>
              <b>{b.provider?.business_name || 'لسه ما اتحددش (ترشيح)'}</b>
              <span>الميعاد</span>
              <b>{fmtDate(b.scheduled_at)}</b>
              <span>اتعمل في</span>
              <b>{fmtDate(b.created_at)}</b>
              <span>العنوان</span>
              <b>{addressText(b.address)}</b>
            </div>
            {b.address?.notes ? <p className="note">📍 {b.address.notes}</p> : null}
            {b.details ? <p className="note">📝 {b.details}</p> : null}
            {b.cancel_reason ? <p className="note danger">سبب الإلغاء / الرفض: {b.cancel_reason}</p> : null}
          </section>

          <section className="section">
            <h3>السعر <span className="muted small">({PRICING[b.pricing_model ?? ''] ?? '—'})</span></h3>
            <div className="price-row">
              <label className="field">
                السعر المعروض
                <input className="inp" inputMode="decimal" dir="ltr" disabled={locked} value={quoted} onChange={(e) => setQuoted(e.target.value)} />
              </label>
              <label className="field">
                السعر النهائي
                <input className="inp" inputMode="decimal" dir="ltr" disabled={locked} value={final} onChange={(e) => setFinal(e.target.value)} />
              </label>
            </div>
            {!locked ? (
              <button className="btn btn-neutral" disabled={busy} onClick={() => { setErr(''); priceM.mutate(); }}>
                {saved ? 'اتحفظ ✓' : 'حفظ السعر'}
              </button>
            ) : null}
            {b.status === 'completed' ? (
              <div className="kv mt">
                <span>العمولة</span>
                <b>{money(b.commission_amount)}</b>
                <span>نصيب مقدم الخدمة</span>
                <b>{money(b.provider_earning)}</b>
              </div>
            ) : null}
          </section>

          {err ? <div className="alert">{err}</div> : null}

          {ACTIONS[b.status].length ? (
            <section className="section">
              <h3>الإجراءات</h3>
              {ask ? (
                <div className="reason">
                  <label className="field">
                    {ask.to === 'rejected' ? 'سبب الرفض' : 'سبب الإلغاء'}
                    <textarea className="inp" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </label>
                  <div className="actions">
                    <button className="btn btn-neutral" disabled={busy} onClick={() => setAsk(null)}>رجوع</button>
                    <button
                      className="btn btn-danger"
                      disabled={busy || !reason.trim()}
                      onClick={() => statusM.mutate({ to: ask.to, reason: reason.trim() })}
                    >
                      {busy ? '…' : `تأكيد ${ask.label}`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="actions">
                  {ACTIONS[b.status].map((a) => (
                    <button key={a.to} className={`btn btn-${a.kind}`} disabled={busy} onClick={() => run(a)}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <section className="section">
            <h3>سجل الحالات</h3>
            {history.isLoading ? (
              <p className="muted">جاري التحميل…</p>
            ) : (
              <ol className="timeline">
                {(history.data ?? []).map((h) => (
                  <li key={h.id}>
                    <span className={`dot t-${STATUS[h.to_status].tone}`} />
                    <div>
                      <b>{STATUS[h.to_status].label}</b>
                      <div className="muted small">
                        {fmtDate(h.created_at)}
                        {h.changer ? ` · ${h.changer.full_name ?? ''}${h.changer.role === 'admin' ? ' (أدمن)' : ''}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
