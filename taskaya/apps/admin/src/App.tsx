import { Skeleton } from './components/Skeleton';
import { Ico } from './components/Ico';
import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth, type Section } from './lib/auth';
import Login from './pages/Login';

// كل صفحة بتتحمّل لما تفتحها بس — أول فتحة للوحة أسرع
const Home = lazy(() => import('./pages/Home'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Providers = lazy(() => import('./pages/Providers'));
const Commission = lazy(() => import('./pages/Commission'));
const Messages = lazy(() => import('./pages/Messages'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Team = lazy(() => import('./pages/Team'));

function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, admin } = useAuth();
  if (loading) return <div className="splash"><div className="spinner" /></div>;
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}

// القسم بيفتح بس لو العضو معاه صلاحيته — غير كده بيروح لأول قسم مسموح له
function Guard({ section, children }: { section: Section; children: ReactNode }) {
  const { can, firstPath } = useAuth();
  if (can(section)) return <Suspense fallback={<Skeleton kind="page" />}>{children}</Suspense>;
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
