import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import NewProviderModal from '../components/NewProviderModal';
import ProviderModal, { ProviderLogo } from '../components/ProviderModal';
import { fetchProviders, P_ORDER, P_STATUS, type PStatus } from '../lib/providers';

type Tab = 'all' | PStatus;

export default function Providers() {
  const { data, isLoading, error } = useQuery({ queryKey: ['providers'], queryFn: fetchProviders });
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const canEdit = useAuth().can('providers', true);

  const counts = useMemo(() => {
    const m: Partial<Record<PStatus, number>> = {};
    for (const p of data ?? []) m[p.status] = (m[p.status] ?? 0) + 1;
    return m;
  }, [data]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (tab !== 'all' && p.status !== tab) return false;
      if (!s) return true;
      return (
        p.business_name.toLowerCase().includes(s) ||
        (p.owner?.full_name ?? '').toLowerCase().includes(s) ||
        (p.owner?.phone ?? '').includes(s)
      );
    });
  }, [data, tab, q]);

  const open = (data ?? []).find((p) => p.id === openId) ?? null;

  return (
    <>
      <div className="sub-head">
        <h1 className="page-title" style={{ margin: 0 }}>مقدمي الخدمة</h1>
        {canEdit ? <button className="btn btn-primary" onClick={() => setAdding(true)}>+ مقدم خدمة جديد</button> : null}
      </div>

      <div className="toolbar">
        <input className="inp search" placeholder="ابحث باسم النشاط، صاحب الحساب أو الموبايل" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'all' ? ' on' : ''}`} onClick={() => setTab('all')}>
          الكل <span className="count">{data?.length ?? 0}</span>
        </button>
        {P_ORDER.map((s) => (
          <button key={s} className={`tab${tab === s ? ' on' : ''}`} onClick={() => setTab(s)}>
            {P_STATUS[s].label} <span className="count">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? <div className="alert">تعذّر التحميل: {(error as Error).message}</div> : null}
      {isLoading ? <div className="card muted">جاري التحميل…</div> : null}
      {!isLoading && shown.length === 0 ? <div className="card muted">مفيش مقدمي خدمة هنا</div> : null}

      <div className="pgrid">
        {shown.map((p) => (
          <button key={p.id} className="pcard" onClick={() => setOpenId(p.id)}>
            <div className="pcard-cover" style={p.cover_url ? { backgroundImage: `url(${p.cover_url})` } : undefined} />
            <div className="pcard-body">
              <ProviderLogo p={p} size={56} />
              <div className="pcard-name">
                {p.business_name} {p.is_verified ? <span title="موثّق" className="verified">✔</span> : null}
              </div>
              <div className="muted small">{p.owner?.full_name || '—'}</div>
              <div className="pcard-meta">
                <span className={`badge t-${P_STATUS[p.status].tone}`}>{P_STATUS[p.status].label}</span>
                {p.is_featured ? <span className="badge t-amber">⭐ مميز</span> : null}
                {!p.is_available ? <span className="badge t-gray">مش متاح</span> : null}
              </div>
              <div className="pcard-foot">
                <span>★ {Number(p.rating_avg).toFixed(1)} <span className="muted">({p.rating_count})</span></span>
                <span>{p.services.length} خدمة</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {open ? <ProviderModal key={open.id} p={open} onClose={() => setOpenId(null)} /> : null}
      {adding ? <NewProviderModal onClose={() => setAdding(false)} /> : null}
    </>
  );
}
