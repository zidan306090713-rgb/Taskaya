import { Ico } from './Ico';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth, type Admin, type Section } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { ACCENTS, useTheme } from '../lib/theme';
import { OrbitLogo } from './OrbitLogo';

const LINKS: { to: string; label: string; short: string; icon: string; end: boolean; section: Section }[] = [
  { to: '/', label: 'الرئيسية', short: 'الرئيسية', icon: '🏠', end: true, section: 'home' },
  { to: '/bookings', label: 'الحجوزات', short: 'الحجوزات', icon: '📋', end: false, section: 'bookings' },
  { to: '/providers', label: 'مقدمي الخدمة', short: 'المقدمين', icon: '🏢', end: false, section: 'providers' },
  { to: '/commission', label: 'العمولات', short: 'العمولات', icon: '💰', end: false, section: 'money' },
  { to: '/messages', label: 'الرسائل', short: 'الرسائل', icon: '📣', end: false, section: 'team' },
  { to: '/catalog', label: 'الأقسام والخدمات', short: 'الأقسام', icon: '🧰', end: false, section: 'catalog' },
  { to: '/team', label: 'الفريق', short: 'الفريق', icon: '👥', end: false, section: 'team' },
];

// أول حرفين من الاسم (Zidan Ahmed → ZA)
export function initials(a: { full_name: string | null; email: string | null } | null) {
  const parts = (a?.full_name || a?.email || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '؟';
}

function Brand({ size }: { size: number }) {
  return (
    <div className="brand">
      <span className="logo-chip">
        <OrbitLogo size={size} />
      </span>
      <div>
        <div className="brand-name">TASKAYA</div>
        <div className="brand-sub">لوحة التحكم</div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { admin, can } = useAuth();
  const [menu, setMenu] = useState(false);
  const ini = initials(admin);
  const links = LINKS.filter((l) => can(l.section));

  return (
    <div className="shell">
      <header className="topbar">
        <Brand size={30} />
        <button className="avatar-btn" onClick={() => setMenu(true)} aria-label="الحساب والإعدادات">
          <span className="avatar">{ini}</span>
        </button>
      </header>

      <aside className="sidebar">
        <Brand size={42} />
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <span><Ico e={l.icon} /></span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button className="acct-row" onClick={() => setMenu(true)}>
          <span className="avatar">{ini}</span>
          <div>
            <b>{admin?.full_name || 'أدمن'}</b>
            <small dir="ltr">{admin?.email}</small>
          </div>
          <span aria-hidden="true">⋯</span>
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <nav className="tabbar">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            <span><Ico e={l.icon} /></span>
            {l.short}
          </NavLink>
        ))}
      </nav>

      {menu ? <AccountMenu admin={admin} initials={ini} onClose={() => setMenu(false)} /> : null}
    </div>
  );
}

function AccountMenu({ admin, initials: ini, onClose }: { admin: Admin | null; initials: string; onClose: () => void }) {
  const { mode, toggle, accent, setAccent } = useTheme();
  const current = ACCENTS.find((a) => a.key === accent);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const savePw = async () => {
    if (pw.length < 8) return setPwMsg('كلمة السر لازم 8 حروف على الأقل');
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) return setPwMsg('تعذّر التغيير: ' + error.message);
    setPw('');
    setPwOpen(false);
    setPwMsg('كلمة السر اتغيرت');
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="الحساب والإعدادات" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />

        <div className="sheet-head">
          <span className="avatar lg">{ini}</span>
          <div>
            <b>{admin?.full_name || 'أدمن'}</b>
            <div className="muted small" dir="ltr">{admin?.email}</div>
            <div className="role-tag">{admin?.role === 'admin' ? 'المالك' : 'عضو فريق'}</div>
          </div>
        </div>

        <label className="sheet-row">
          <span><Ico e="🌙" /> الوضع الغامق</span>
          <input type="checkbox" className="switch" checked={mode === 'dark'} onChange={toggle} />
        </label>

        <div className="sheet-row col">
          <span>
            <Ico e="🎨" /> لون التطبيق <span className="muted small">— {current?.ar}</span>
          </span>
          <div className="swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                className={`sw${accent === a.key ? ' on' : ''}`}
                style={{ background: `linear-gradient(135deg, ${a.light}, ${a.dark})` }}
                title={a.ar}
                aria-label={a.ar}
                onClick={() => setAccent(a.key)}
              />
            ))}
          </div>
        </div>

        {pwOpen ? (
          <div className="sheet-row col">
            <span><Ico e="🔑" /> كلمة السر الجديدة</span>
            <input className="inp" type="password" dir="ltr" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <div className="actions">
              <button className="btn btn-neutral" onClick={() => { setPwOpen(false); setPwMsg(''); }}>رجوع</button>
              <button className="btn btn-primary" disabled={pwBusy} onClick={() => void savePw()}>{pwBusy ? '…' : 'حفظ'}</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-neutral btn-block" onClick={() => { setPwOpen(true); setPwMsg(''); }}><Ico e="🔑" /> تغيير كلمة السر</button>
        )}
        {pwMsg ? <div className="muted small">{pwMsg}</div> : null}

        <button className="btn btn-danger btn-block" onClick={() => void supabase.auth.signOut()}>
          <Ico e="🚪" /> تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
