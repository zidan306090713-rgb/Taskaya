import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export type Level = 'none' | 'view' | 'edit';
export type Perms = { home: boolean; money: boolean; bookings: Level; providers: Level; catalog: Level; team: boolean };
export type Section = keyof Perms;
export type Admin = { id: string; full_name: string | null; email: string | null; role: 'admin' | 'staff'; perms: Perms };

export const OWNER_PERMS: Perms = { home: true, money: true, bookings: 'edit', providers: 'edit', catalog: 'edit', team: true };
export const NO_PERMS: Perms = { home: false, money: false, bookings: 'none', providers: 'none', catalog: 'none', team: false };

type AuthState = { loading: boolean; session: Session | null; admin: Admin | null; denied: boolean };
type AuthCtx = AuthState & {
  can: (s: Section, edit?: boolean) => boolean;
  firstPath: () => string | null;
};

const initial: AuthState = { loading: true, session: null, admin: null, denied: false };
const Ctx = createContext<AuthCtx>({ ...initial, can: () => false, firstPath: () => null });

const PATHS: [Section, string][] = [
  ['home', '/'],
  ['bookings', '/bookings'],
  ['providers', '/providers'],
  ['catalog', '/catalog'],
  ['team', '/team'],
];

// المالك (admin) = كل الصلاحيات. عضو الفريق (staff) = من جدول staff_permissions
async function fetchAdmin(uid: string): Promise<Admin | null> {
  const { data } = await supabase.from('profiles').select('id, full_name, email, role, is_active').eq('id', uid).maybeSingle();
  if (!data || !data.is_active) return null;
  const base = { id: data.id, full_name: data.full_name, email: data.email };
  if (data.role === 'admin') return { ...base, role: 'admin', perms: OWNER_PERMS };
  if (data.role !== 'staff') return null;
  const { data: p } = await supabase
    .from('staff_permissions')
    .select('home, money, bookings, providers, catalog, team')
    .eq('user_id', uid)
    .maybeSingle();
  return { ...base, role: 'staff', perms: (p as Perms | null) ?? NO_PERMS };
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
        setState({ loading: false, session: null, admin: null, denied: true });
        await supabase.auth.signOut();
        return;
      }
      setState({ loading: false, session, admin, denied: false });
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
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

  const can = useCallback(
    (s: Section, edit = false) => {
      const p = state.admin?.perms;
      if (!p) return false;
      const v = p[s];
      if (typeof v === 'boolean') return v;
      return edit ? v === 'edit' : v !== 'none';
    },
    [state.admin],
  );
  const firstPath = useCallback(() => PATHS.find(([s]) => can(s))?.[1] ?? null, [can]);

  const value = useMemo(() => ({ ...state, can, firstPath }), [state, can, firstPath]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
