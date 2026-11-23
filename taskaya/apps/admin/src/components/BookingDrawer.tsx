import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  actionsFor,
  addressText,
  answerQuote,
  fetchHistory,
  fmtDate,
  friendlyError,
  money,
  PRICING,
  sendQuote,
  STATUS,
  updateStatus,
  type Action,
  type Booking,
  type Status,
} from '../lib/bookings';

export default function BookingDrawer({ b, onClose }: { b: Booking; onClose: () => void }) {
  const qc = useQueryClient();
  const canEdit = useAuth().can('bookings', true);
  const history = useQuery({ queryKey: ['booking-history', b.id], queryFn: () => fetchHistory(b.id) });
  const [ask, setAsk] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [qPrice, setQPrice] = useState('');
  const [qNote, setQNote] = useState('');
  const [err, setErr] = useState('');

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
  const onError = (e: unknown) => setErr(friendlyError(e));

  const statusM = useMutation({
    mutationFn: (v: { to: Status; reason?: string }) => updateStatus(b.id, v.to, v.reason),
    onSuccess: () => {
      setAsk(null);
      setReason('');
      refresh();
    },
    onError,
  });
  const quoteM = useMutation({
    mutationFn: () => {
      const n = Number(qPrice);
      if (qPrice.trim() === '' || isNaN(n) || n < 0) throw new Error('اكتب السعر الجديد أرقام');
      return sendQuote(b.id, n, qNote);
    },
    onSuccess: () => {
      setQuoting(false);
      setQNote('');
      refresh();
    },
    onError,
  });
  const answerM = useMutation({ mutationFn: (accept: boolean) => answerQuote(b.id, accept), onSuccess: refresh, onError });

  const busy = statusM.isPending || quoteM.isPending || answerM.isPending;
  const price = b.final_price ?? b.quoted_price;
  const awaiting = b.status === 'awaiting_customer_approval';
  // لو العميل رفض: يرجع بالسعر القديم ولا يتلغي؟
  const base = awaiting ? b.quote_prev_status : b.status;
  const keepsOnReject = base === 'confirmed' || base === 'in_progress';

  const run = (a: Action) => {
    setErr('');
    if (a.special === 'quote') {
      setQPrice(price != null ? String(price) : '');
      setQuoting(true);
      return;
    }
    if (a.special === 'approve') return answerM.mutate(true);
    if (a.special === 'decline') return answerM.mutate(false);
    if (!a.to) return;
    if (a.to === 'completed' && price == null) return setErr('مفيش سعر — ابعت عرض سعر الأول');
    if (a.needsReason) return setAsk(a);
    statusM.mutate({ to: a.to });
  };

  const actions = actionsFor(b);

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
            <div className="kv">
              <span>{awaiting ? 'العرض الجديد' : 'السعر'}</span>
              <b className="num">{money(price)}</b>
              {awaiting && b.quote_prev_price != null ? (
                <>
                  <span>قبل العرض</span>
                  <b className="num strike">{money(b.quote_prev_price)}</b>
                </>
              ) : null}
              {b.status === 'completed' ? (
                <>
                  <span>العمولة</span>
                  <b>{money(b.commission_amount)}</b>
                  <span>نصيب مقدم الخدمة</span>
                  <b>{money(b.provider_earning)}</b>
                </>
              ) : null}
            </div>
            {awaiting ? (
              <p className="note">
                💬 مستني رد العميل{b.quote_note ? ` — «${b.quote_note}»` : ''}.
                {keepsOnReject ? ' لو رفض: الحجز يرجع بالسعر القديم.' : ' لو رفض: الحجز يتلغي.'}
              </p>
            ) : null}
            <p className="muted small mt">🔒 السعر مايتغيرش غير بعرض سعر يوافق عليه العميل.</p>
          </section>

          {err ? <div className="alert">{err}</div> : null}

          {actions.length && canEdit ? (
            <section className="section">
              <h3>الإجراءات</h3>
              {quoting ? (
                <div className="reason">
                  <label className="field">
                    السعر الجديد (ج.م)
                    <input className="inp" dir="ltr" inputMode="decimal" value={qPrice} onChange={(e) => setQPrice(e.target.value)} />
                  </label>
                  <label className="field">
                    ملاحظة للعميل (اختياري)
                    <textarea className="inp" rows={2} placeholder="مثلاً: السجادة أكبر من المتفق عليه" value={qNote} onChange={(e) => setQNote(e.target.value)} />
                  </label>
                  <p className="muted small">
                    العميل لازم يوافق. {keepsOnReject ? 'لو رفض، الحجز يرجع بالسعر الحالي.' : 'لو رفض، الحجز يتلغي.'}
                  </p>
                  <div className="actions">
                    <button className="btn btn-neutral" disabled={busy} onClick={() => setQuoting(false)}>رجوع</button>
                    <button className="btn btn-primary" disabled={busy} onClick={() => { setErr(''); quoteM.mutate(); }}>
                      {quoteM.isPending ? '…' : 'إرسال العرض للعميل'}
                    </button>
                  </div>
                </div>
              ) : ask ? (
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
                      onClick={() => ask.to && statusM.mutate({ to: ask.to, reason: reason.trim() })}
                    >
                      {busy ? '…' : `تأكيد ${ask.label}`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="actions">
                  {actions.map((a) => (
                    <button key={a.label} className={`btn btn-${a.kind}`} disabled={busy} onClick={() => run(a)}>
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
