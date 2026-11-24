import { Ico } from '../components/Ico';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { initials } from '../components/Layout';
import MemberModal from '../components/MemberModal';
import { useAuth, type Perms } from '../lib/auth';
import { fetchTeam, type Member } from '../lib/team';

const SECTIONS = [
  { k: 'home', icon: '🏠', label: 'الرئيسية' },
  { k: 'money', icon: '💰', label: 'الإيرادات' },
  { k: 'bookings', icon: '📋', label: 'الحجوزات' },
  { k: 'providers', icon: '🏢', label: 'المقدمين' },
  { k: 'catalog', icon: '🧰', label: 'الأقسام' },
  { k: 'team', icon: '👥', label: 'الفريق' },
] as const;

function PermChips({ p }: { p: Perms | null }) {
  const chips = p
    ? SECTIONS.flatMap((s) => {
        const v = p[s.k];
        if (v === false || v === 'none') return [];
        const mode = v === 'edit' ? <Ico e="✏" /> : v === 'view' ? <Ico e="👁" /> : null;
        return [<span key={s.k} className="pchip"><Ico e={s.icon} /> {s.label} {mode}</span>];
      })
    : [];
  return chips.length ? <div className="pchips">{chips}</div> : <span className="muted small">بدون صلاحيات</span>;
}

export default function Team() {
  const { admin } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ['team'], queryFn: fetchTeam });
  const [edit, setEdit] = useState<Member | 'new' | null>(null);

  return (
    <>
      <div className="sub-head">
        <h1 className="page-title" style={{ margin: 0 }}>الفريق</h1>
        <button className="btn btn-primary" onClick={() => setEdit('new')}>+ عضو جديد</button>
      </div>
      <p className="muted small team-hint">
        <Ico e="👑" /> المالك عنده كل الصلاحيات ومش بيظهر هنا. أعضاء الفريق بيشوفوا ويعدّلوا اللي مسموح لهم بيه بس —
        <Ico e="✏" /> = عرض وتعديل، <Ico e="👁" /> = عرض بس.
      </p>

      {error ? <div className="alert">تعذّر التحميل: {(error as Error).message}</div> : null}
      {isLoading ? <div className="card muted">جاري التحميل…</div> : null}
      {data && !data.length ? (
        <div className="card team-empty">
          <div className="big"><Ico e="👥" /></div>
          <b>لسه مفيش أعضاء</b>
          <span className="muted small">ضيف أول عضو في فريق الإدارة</span>
        </div>
      ) : null}

      <div className="team-grid">
        {(data ?? []).map((m) => {
          const self = m.id === admin?.id;
          return (
            <button key={m.id} className={`member${m.is_active ? '' : ' off'}`} onClick={() => !self && setEdit(m)} title={self ? 'ده حسابك' : 'تعديل'}>
              <div className="member-top">
                <span className="avatar lg">{initials(m)}</span>
                <div className="member-name">
                  <b>{m.full_name}{self ? ' (انت)' : ''}</b>
                  <div className="muted small" dir="ltr">{m.email}</div>
                </div>
                <span className={`badge ${m.is_active ? 't-green' : 't-gray'}`}>{m.is_active ? 'مفعّل' : 'موقوف'}</span>
              </div>
              <PermChips p={m.perms} />
            </button>
          );
        })}
      </div>

      {edit ? <MemberModal member={edit === 'new' ? null : edit} onClose={() => setEdit(null)} /> : null}
    </>
  );
}
