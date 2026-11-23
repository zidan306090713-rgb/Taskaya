import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { OrbitLogo } from '../components/OrbitLogo';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { admin, denied, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!loading && admin) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message === 'Invalid login credentials' ? 'الإيميل أو كلمة السر غلط' : err.message);
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">
          <OrbitLogo size={96} />
          <div className="brand-name big">TASKAYA</div>
        </div>
        <h1>لوحة التحكم</h1>
        <p className="sub">سجّل دخول بحساب الأدمن</p>

        {error ? <div className="alert">{error}</div> : null}
        {!error && denied ? <div className="alert">الحساب ده مش عنده صلاحية أدمن</div> : null}

        <label className="field">
          الإيميل
          <input type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          كلمة السر
          <input type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'جاري الدخول…' : 'دخول'}
        </button>
      </form>
    </div>
  );
}
