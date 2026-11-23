import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export type Admin = { id: string; full_name: string | null; email: string | null };
type AuthState = { loading: boolean; session: Session | null; admin: Admin | null; denied: boolean };

const initial: AuthState = { loading: true, session: null, admin: null, denied: false };
const Ctx = createContext<AuthState>(initial);

// بيتأكد إن الحساب ده أدمن ومفعّل
async function fetchAdmin(uid: string): Promise<Admin | null> {
  const { data } = await supabase.from('profiles').select('id, full_name, email, role, is_active').eq('id', uid).maybeSingle();
  if (!data || data.role !== 'admin' || !data.is_active) return null;
  return { id: data.id, full_name: data.full_name, email: data.email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initial);

  useEffect(() => {
    let alive = true;

    const apply = async (session: Session | null) => {
      if (!session) {
        if (alive) setState((s) => ({ ...s, loading: false, session: null, admin: null }));
        return;
      }
      const admin = await fetchAdmin(session.user.id);
      if (!alive) return;
      if (!admin) {
        // مش أدمن: نطلّعه برّه
        setState({ loading: false, session: null, admin: null, denied: true });
        await supabase.auth.signOut();
        return;
      }
      setState({ loading: false, session, admin, denied: false });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // setTimeout: ممنوع نستنى طلبات supabase جوّه الـ callback نفسه
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setTimeout(() => void apply(session), 0);
      } else if (event === 'TOKEN_REFRESHED') {
        setState((s) => ({ ...s, session }));
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
