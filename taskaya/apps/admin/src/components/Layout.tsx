import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

const LINKS = [
  { to: '/', label: 'الرئيسية', icon: '🏠', end: true },
  { to: '/bookings', label: 'الحجوزات', icon: '📋', end: false },
  { to: '/providers', label: 'مقدمي الخدمة', icon: '🏢', end: false },
  { to: '/catalog', label: 'الأقسام والخدمات', icon: '🧰', end: false },
];

export default function Layout() {
  const { admin } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          تاسكاية
        </div>
        <nav className="nav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <span>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="me">
          <strong>{admin?.full_name || admin?.email || 'أدمن'}</strong>
          <button className="btn btn-ghost" onClick={() => void supabase.auth.signOut()}>
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
