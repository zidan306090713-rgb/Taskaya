import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth, type Admin } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { ACCENTS, useTheme } from '../lib/theme';
import { OrbitLogo } from './OrbitLogo';

const LINKS = [
  { to: '/', label: 'الرئيسية', short: 'الرئيسية', icon: '🏠', end: true },
  { to: '/bookings', label: 'الحجوزات', short: 'الحجوزات', icon: '📋', end: false },
  { to: '/providers', label: 'مقدمي الخدمة', short: 'المقدمين', icon: '🏢', end: false },
  { to: '/catalog', label: 'الأقسام والخدمات', short: 'الأقسام', icon: '🧰', end: false },
];

// أول حرفين من الاسم (Zidan Ahmed → ZA)
function initials(a: Admin | null) {
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
  const { admin } = useAuth();
  const [menu, setMenu] = useState(false);
  const ini = initials(admin);

  return (
    <div className="shell">
      {/* موبايل: شريط علوي رفيع */}
      <header className="topbar">
        <Brand size={30} />
        <button className="avatar-btn" onClick={() => setMenu(true)} aria-label="الحساب والإعدادات">
          <span className="avatar">{ini}</span>
        </button>
      </header>

      {/* كمبيوتر: القايمة الجانبية (لينكات بس + صف الحساب) */}
      <aside className="sidebar">
        <Brand size={42} />
        <nav className="nav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <span>{l.icon}</span>
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

      {/* موبايل: شريط التابات العايم (زي التطبيق) */}
      <nav className="tabbar">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            <span>{l.icon}</span>
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="الحساب والإعدادات" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />

        <div className="sheet-head">
          <span className="avatar lg">{ini}</span>
          <div>
            <b>{admin?.full_name || 'أدمن'}</b>
            <div className="muted small" dir="ltr">{admin?.email}</div>
          </div>
        </div>

        <label className="sheet-row">
          <span>🌙 الوضع الغامق</span>
          <input type="checkbox" className="switch" checked={mode === 'dark'} onChange={toggle} />
        </label>

        <div className="sheet-row col">
          <span>
            🎨 لون التطبيق <span className="muted small">— {current?.ar}</span>
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

        <button className="btn btn-danger btn-block" onClick={() => void supabase.auth.signOut()}>
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
