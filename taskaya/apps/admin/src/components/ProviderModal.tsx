import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fmtDate, friendlyError, money, PRICING } from '../lib/bookings';
import { P_ACTIONS, P_STATUS, updateProvider, type PAction, type Provider } from '../lib/providers';

export function ProviderLogo({ p, size }: { p: Provider; size: number }) {
  if (p.logo_url) return <img className="plogo" src={p.logo_url} alt="" style={{ width: size, height: size }} />;
  return (
    <div className="plogo plogo-letter" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {p.business_name.trim().replace(/^ال/, '').charAt(0)}
    </div>
  );
}

const FLAGS = [
  { key: 'is_verified', label: 'موثّق ✔', hint: 'علامة توثيق جنب الاسم' },
  { key: 'is_featured', label: 'مميز ⭐', hint: 'يظهر في الأول في التطبيق' },
  { key: 'is_available', label: 'متاح', hint: 'يقدر يستقبل طلبات جديدة' },
] as const;

export default function ProviderModal({ p, onClose }: { p: Provider; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(p.business_name);
  const [desc, setDesc] = useState(p.description ?? '');
  const [addr, setAddr] = useState(p.business_address ?? '');
  const [ask, setAsk] = useState<PAction | null>(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const m = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateProvider(p.id, patch),
    onSuccess: () => {
      setAsk(null);
      setReason('');
      void qc.invalidateQueries({ queryKey: ['providers'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => setErr(friendlyError(e)),
  });

  const runStatus = (a: PAction) => {
    setErr('');
    if (a.needsReason) return setAsk(a);
    m.mutate({ status: a.to, rejection_reason: a.to === 'approved' ? null : p.rejection_reason });
  };

  const saveInfo = () => {
    setErr('');
    if (!name.trim()) return setErr('اسم النشاط مطلوب');
    m.mutate(
      { business_name: name.trim(), description: desc.trim() || null, business_address: addr.trim() || null },
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 1500); } },
    );
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head pm-head" style={p.cover_url ? { backgroundImage: `linear-gradient(135deg, var(--head-a), var(--head-b)), url(${p.cover_url})` } : undefined}>
          <ProviderLogo p={p} size={56} />
          <div>
            <div className="drawer-title">{p.business_name}</div>
            <div className="muted small">انضم {fmtDate(p.created_at)} · ★ {Number(p.rating_avg).toFixed(1)} ({p.rating_count} تقييم)</div>
          </div>
          <span className={`badge t-${P_STATUS[p.status].tone}`}>{P_STATUS[p.status].label}</span>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">✕</button>
        </header>

        <div className="drawer-body">
          <section className="section">
            <div className="kv">
              <span>صاحب الحساب</span>
              <b>{p.owner?.full_name || '—'}</b>
              <span>الموبايل</span>
              <b dir="ltr">{p.owner?.phone ? <a href={`tel:${p.owner.phone}`}>{p.owner.phone}</a> : '—'}</b>
              <span>الإيميل</span>
              <b dir="ltr">{p.owner?.email || '—'}</b>
              <span>المناطق</span>
              <b>{p.coverage.map((c) => c.area?.name_ar).filter(Boolean).join('، ') || '—'}</b>
            </div>
            {p.rejection_reason && p.status === 'rejected' ? <p className="note danger">سبب الرفض: {p.rejection_reason}</p> : null}
          </section>

          {err ? <div className="alert">{err}</div> : null}

          <section className="section">
            <h3>الحالة</h3>
            {ask ? (
              <div className="reason">
                <label className="field">
                  سبب الرفض (هيظهر لمقدم الخدمة)
                  <textarea className="inp" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                <div className="actions">
                  <button className="btn btn-neutral" disabled={m.isPending} onClick={() => setAsk(null)}>رجوع</button>
                  <button
                    className="btn btn-danger"
                    disabled={m.isPending || !reason.trim()}
                    onClick={() => m.mutate({ status: ask.to, rejection_reason: reason.trim() })}
                  >
                    تأكيد {ask.label}
                  </button>
                </div>
              </div>
            ) : (
              <div className="actions">
                {P_ACTIONS[p.status].map((a) => (
                  <button key={a.to} className={`btn btn-${a.kind}`} disabled={m.isPending} onClick={() => runStatus(a)}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flags">
              {FLAGS.map((f) => (
                <label key={f.key} className="flag">
                  <div>
                    <b>{f.label}</b>
                    <div className="muted small">{f.hint}</div>
                  </div>
                  <input
                    type="checkbox"
                    className="switch"
                    checked={p[f.key]}
                    disabled={m.isPending}
                    onChange={(e) => { setErr(''); m.mutate({ [f.key]: e.target.checked }); }}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="section">
            <h3>بيانات النشاط</h3>
            <label className="field">
              اسم النشاط
              <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              العنوان
              <input className="inp" value={addr} onChange={(e) => setAddr(e.target.value)} />
            </label>
            <label className="field">
              الوصف
              <textarea className="inp" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </label>
            <button className="btn btn-neutral" disabled={m.isPending} onClick={saveInfo}>{saved ? 'اتحفظ ✓' : 'حفظ البيانات'}</button>
          </section>

          <section className="section full">
            <h3>الخدمات ({p.services.length})</h3>
            {p.services.length === 0 ? (
              <p className="muted">لسه مضافش خدمات</p>
            ) : (
              <div className="svc-list">
                {p.services.map((s) => (
                  <div key={s.id} className={`svc${s.is_active ? '' : ' off'}`}>
                    <div>
                      <b>{s.title || s.service?.name_ar || '—'}</b>
                      <div className="muted small">{s.service?.name_ar} · {PRICING[s.pricing_model] ?? s.pricing_model}</div>
                    </div>
                    <span className="num">{s.pricing_model === 'custom_quote' ? 'بعرض سعر' : money(s.base_price)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
