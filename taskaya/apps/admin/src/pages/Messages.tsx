import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Ico } from '../components/Ico';
import { OrbitLogo } from '../components/OrbitLogo';
import {
  AUD_LABEL, AUDIENCES, countRecipients, fetchBroadcasts, msgError, ROLE_LABEL, searchPeople, sendBroadcast,
  type Audience, type Person,
} from '../lib/messages';

const dtf = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });

export default function Messages() {
  const qc = useQueryClient();
  const [aud, setAud] = useState<Audience>('all');
  const [people, setPeople] = useState<Person[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');

  const ids = people.map((p) => p.id);
  const needIds = aud === 'people' && ids.length === 0;
  const count = useQuery({
    queryKey: ['bcount', aud, ids.join(',')],
    queryFn: () => countRecipients(aud, ids),
    enabled: !needIds,
  });
  const n = needIds ? 0 : count.data ?? null;
  const history = useQuery({ queryKey: ['broadcasts'], queryFn: fetchBroadcasts });

  const send = useMutation({
    mutationFn: () => sendBroadcast(title, body, aud, ids),
    onSuccess: (k) => {
      setDone(`اتبعتت لـ ${k} شخص`);
      setTitle(''); setBody(''); setPeople([]); setAsking(false); setErr('');
      void qc.invalidateQueries({ queryKey: ['broadcasts'] });
    },
    onError: (e) => { setErr(msgError(e)); setAsking(false); },
  });

  const ready = !!title.trim() && !!body.trim() && (n ?? 0) > 0;
  const reset = () => { setAsking(false); setDone(''); };

  return (
    <>
      <div className="sub-head">
        <h1 className="page-title" style={{ margin: 0 }}>الرسائل</h1>
      </div>

      <div className="ms-grid">
        <div className="card ms-form">
          <div className="ms-label">مين يستلمها؟</div>
          <div className="tabs cm-days">
            {AUDIENCES.map((a) => (
              <button key={a.k} className={`tab${aud === a.k ? ' on' : ''}`} onClick={() => { setAud(a.k); reset(); }}>{a.label}</button>
            ))}
          </div>
          {aud === 'people' ? <PeoplePicker value={people} onChange={(v) => { setPeople(v); reset(); }} /> : null}

          <label className="ms-label">العنوان <span className="muted small">{title.length}/80</span></label>
          <input className="inp" maxLength={80} placeholder="مثلاً: خصم 20% على تنظيف السجاد" value={title}
            onChange={(e) => { setTitle(e.target.value); reset(); }} />

          <label className="ms-label">نص الرسالة <span className="muted small">{body.length}/500</span></label>
          <textarea className="inp" maxLength={500} placeholder="اكتب الرسالة اللي هتوصل للناس…" value={body}
            onChange={(e) => { setBody(e.target.value); reset(); }} />

          <div className="ms-count">
            {n == null ? 'بنحسب عدد المستلمين…' : n === 0 ? 'مفيش حد هيستلمها لسه' : <>هتوصل لـ <b>{n}</b> شخص</>}
          </div>
          {err ? <div className="cm-err">{err}</div> : null}
          {done ? <div className="note"><Ico e="✅" /> {done}</div> : null}

          {asking ? (
            <div className="ms-confirm">
              <span>متأكد؟ هتتبعت إشعار لـ <b>{n}</b> شخص ومش هينفع ترجّعها.</span>
              <button className="btn btn-primary" disabled={send.isPending} onClick={() => send.mutate()}>
                {send.isPending ? 'جاري الإرسال…' : 'أيوه، ابعت'}
              </button>
              <button className="btn btn-neutral" disabled={send.isPending} onClick={() => setAsking(false)}>إلغاء</button>
            </div>
          ) : (
            <button className="btn btn-primary" disabled={!ready} onClick={() => { setErr(''); setDone(''); setAsking(true); }}>
              <Ico e="📣" /> إرسال
            </button>
          )}
        </div>

        <div className="card">
          <div className="ms-label">شكلها على الموبايل</div>
          <div className="ms-phone mt">
            <div className="ms-notif">
              <div className="ms-notif-top">
                <span className="ms-notif-icon"><OrbitLogo size={16} /></span> Taskaya · دلوقتي
              </div>
              <b>{title.trim() || 'عنوان الرسالة'}</b>
              <p>{body.trim() || 'نص الرسالة هيظهر هنا'}</p>
            </div>
          </div>
        </div>
      </div>

      <h3 className="cm-title"><Ico e="🕒" /> الرسائل اللي اتبعتت</h3>
      {history.error ? <div className="alert">تعذّر التحميل: {msgError(history.error)}</div> : null}
      {history.isLoading ? <div className="card muted">جاري التحميل…</div> : null}
      {history.data && history.data.length === 0 ? <div className="card muted">لسه مفيش رسائل اتبعتت</div> : null}
      {history.data?.length ? (
        <div className="card ms-hist">
          {history.data.map((b) => (
            <div key={b.id} className="ms-hist-item">
              <div className="ms-meta">
                <b>{b.title}</b>
                <span className="badge t-gray">{AUD_LABEL[b.audience]}</span>
                <span className="muted small">{b.sent_count} شخص · {dtf.format(new Date(b.created_at))}</span>
              </div>
              <div className="muted small">{b.body}</div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function PeoplePicker({ value, onChange }: { value: Person[]; onChange: (v: Person[]) => void }) {
  const [q, setQ] = useState('');
  const [deb, setDeb] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDeb(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const res = useQuery({ queryKey: ['people', deb], queryFn: () => searchPeople(deb), enabled: deb.length >= 2 });
  const picked = new Set(value.map((p) => p.id));
  const list = (res.data ?? []).filter((p) => !picked.has(p.id));

  return (
    <div>
      {value.length ? (
        <div className="ms-chips">
          {value.map((p) => (
            <button key={p.id} className="ms-chip" onClick={() => onChange(value.filter((x) => x.id !== p.id))}>
              {p.full_name || p.phone} <Ico e="✕" />
            </button>
          ))}
        </div>
      ) : null}
      <input className="inp" placeholder="ابحث بالاسم أو رقم الموبايل" value={q} onChange={(e) => setQ(e.target.value)} />
      {deb.length >= 2 ? (
        <div className="ms-results">
          {res.isLoading ? <div className="muted small">جاري البحث…</div> : null}
          {list.map((p) => (
            <button key={p.id} className="ms-result" onClick={() => onChange([...value, p])}>
              <Ico e="➕" /> <b>{p.full_name || '—'}</b>
              <span className="muted small" dir="ltr">{p.phone}</span>
              <span className="badge t-gray">{ROLE_LABEL[p.role]}</span>
            </button>
          ))}
          {res.data && list.length === 0 ? <div className="muted small">مفيش نتايج</div> : null}
        </div>
      ) : null}
    </div>
  );
}
