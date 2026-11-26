import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Skeleton } from './Skeleton';
import { fetchServiceRequests, PRICING, reviewService, toNum, type ServiceRequest } from '../lib/serviceRequests';

const money = (n: number | null) => (n == null ? '—' : `${Number(n).toLocaleString('ar-EG')} ج.م`);
function durOf(m: number | null) {
  if (m == null) return '—';
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 1 && r === 30) return 'ساعة ونص';
  if (r) return `${h} س ${r} د`;
  return h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`;
}
function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `من ${mins} دقيقة`;
  const h = Math.round(mins / 60);
  if (h < 24) return `من ${h} ساعة`;
  return `من ${Math.round(h / 24)} يوم`;
}

export function invalidateServiceRequests(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['service-requests'] });
  qc.invalidateQueries({ queryKey: ['service-requests-count'] });
  qc.invalidateQueries({ queryKey: ['providers'] });
}

export default function ServiceRequests({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['service-requests'], queryFn: fetchServiceRequests });
  if (error) return <div className="alert">تعذّر التحميل: {(error as Error).message}</div>;
  if (isLoading) return <Skeleton kind="cards" />;
  if (!data?.length) return <div className="card muted">مفيش طلبات خدمات مستنية مراجعة</div>;
  return (
    <div className="sr-list">
      {data.map((r) => (
        <RequestCard key={r.id} r={r} canEdit={canEdit} />
      ))}
    </div>
  );
}

function RequestCard({ r, canEdit }: { r: ServiceRequest; canEdit: boolean }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'idle' | 'price' | 'reject'>('idle');
  const [price, setPrice] = useState(r.base_price ? String(r.base_price) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sub = r.service?.sub;
  const p = r.provider;
  const newProvider = p?.status === 'pending';

  async function act(approve: boolean, newPrice: number | null = null) {
    setBusy(true);
    setErr(null);
    try {
      await reviewService(r.id, approve, approve ? null : note.trim(), newPrice);
      invalidateServiceRequests(qc);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  function approveWithPrice() {
    const n = toNum(price);
    if (!(n > 0)) return setErr('اكتب سعر صحيح');
    act(true, n);
  }
  function reject() {
    if (!note.trim()) return setErr('اكتب سبب الرفض، هيوصل لمقدم الخدمة');
    act(false);
  }

  return (
    <div className="card sr-card">
      <div className="sr-head">
        <div>
          <div className="sr-title">{r.service?.name_ar ?? r.title ?? '—'}</div>
          <div className="muted small">{[sub?.cat?.name_ar, sub?.name_ar].filter(Boolean).join(' · ')}</div>
        </div>
        <span className={`badge ${newProvider ? 't-red' : 't-amber'}`}>
          {newProvider ? 'مزوّد جديد' : r.review_note ? 'إعادة إرسال' : 'خدمة جديدة'}
        </span>
      </div>

      <div className="sr-prov">
        <b>{p?.business_name ?? '—'}</b>
        <span className="muted">
          {p?.owner?.full_name ? ` · ${p.owner.full_name}` : ''}
          {p?.owner?.phone ? <> · <span dir="ltr">{p.owner.phone}</span></> : null}
        </span>
      </div>

      <div className="sr-facts">
        <span><span className="muted">التسعير</span>{PRICING[r.pricing_model] ?? r.pricing_model}</span>
        <span><span className="muted">السعر</span>{r.pricing_model === 'custom_quote' && !r.base_price ? '—' : money(r.base_price)}</span>
        <span><span className="muted">المدة</span>{durOf(r.estimated_duration_minutes)}</span>
        <span><span className="muted">اتبعت</span>{ago(r.created_at)}</span>
      </div>

      {r.description ? <p className="sr-desc">{r.description}</p> : null}
      {r.review_note ? <div className="sr-prev">اترفضت قبل كده: {r.review_note}</div> : null}
      {newProvider ? <div className="muted small">قبول الخدمة دي هيعتمد مقدم الخدمة كمان</div> : null}
      {err ? <div className="alert">{err}</div> : null}

      {!canEdit ? null : mode === 'idle' ? (
        <div className="sr-actions">
          <button className="btn btn-primary" disabled={busy} onClick={() => act(true)}>{busy ? 'جاري…' : 'قبول'}</button>
          <button className="btn" disabled={busy} onClick={() => { setErr(null); setMode('price'); }}>تعديل السعر وقبول</button>
          <button className="btn sr-danger" disabled={busy} onClick={() => { setErr(null); setMode('reject'); }}>رفض</button>
        </div>
      ) : mode === 'price' ? (
        <div className="sr-form">
          <input className="inp" inputMode="decimal" autoFocus value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر الجديد" />
          <span className="muted">ج.م</span>
          <button className="btn btn-primary" disabled={busy} onClick={approveWithPrice}>{busy ? 'جاري…' : 'اعتماد بالسعر ده'}</button>
          <button className="btn" disabled={busy} onClick={() => setMode('idle')}>إلغاء</button>
        </div>
      ) : (
        <div className="sr-form">
          <textarea className="inp" autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب الرفض (هيوصل لمقدم الخدمة في إشعار)" />
          <button className="btn sr-danger-fill" disabled={busy} onClick={reject}>{busy ? 'جاري…' : 'تأكيد الرفض'}</button>
          <button className="btn" disabled={busy} onClick={() => setMode('idle')}>إلغاء</button>
        </div>
      )}
    </div>
  );
}
