import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './lib/auth';
import Bookings from './pages/Bookings';
import Home from './pages/Home';
import Login from './pages/Login';
import Providers from './pages/Providers';
import Soon from './pages/Soon';

function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, admin } = useAuth();
  if (loading) return <div className="splash"><div className="spinner" /></div>;
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAdmin><Layout /></RequireAdmin>}>
        <Route index element={<Home />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="providers" element={<Providers />} />
        <Route path="catalog" element={<Soon title="الأقسام والخدمات" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
