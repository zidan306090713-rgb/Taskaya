import { Ico } from './components/Ico';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth, type Section } from './lib/auth';
import Bookings from './pages/Bookings';
import Catalog from './pages/Catalog';
import Commission from './pages/Commission';
import Messages from './pages/Messages';
import Home from './pages/Home';
import Login from './pages/Login';
import Providers from './pages/Providers';
import Team from './pages/Team';

function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, admin } = useAuth();
  if (loading) return <div className="splash"><div className="spinner" /></div>;
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}

// القسم بيفتح بس لو العضو معاه صلاحيته — غير كده بيروح لأول قسم مسموح له
function Guard({ section, children }: { section: Section; children: ReactNode }) {
  const { can, firstPath } = useAuth();
  if (can(section)) return children;
  const to = firstPath();
  if (to) return <Navigate to={to} replace />;
  return (
    <div className="card no-perms">
      <div className="big"><Ico e="🔒" /></div>
      <h3>حسابك مالوش صلاحيات لسه</h3>
      <p className="muted">كلّم المسؤول عشان يدّيك صلاحية على قسم.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAdmin><Layout /></RequireAdmin>}>
        <Route index element={<Guard section="home"><Home /></Guard>} />
        <Route path="bookings" element={<Guard section="bookings"><Bookings /></Guard>} />
        <Route path="providers" element={<Guard section="providers"><Providers /></Guard>} />
        <Route path="commission" element={<Guard section="money"><Commission /></Guard>} />
        <Route path="messages" element={<Guard section="team"><Messages /></Guard>} />
        <Route path="catalog" element={<Guard section="catalog"><Catalog /></Guard>} />
        <Route path="team" element={<Guard section="team"><Team /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
