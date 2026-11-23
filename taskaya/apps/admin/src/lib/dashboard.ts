import type { Status } from './bookings';
import { supabase } from './supabase';

export type DayPoint = { day: string; created: number; completed: number; revenue: number };
export type MiniBooking = {
  id: string;
  booking_number: number;
  status: Status;
  service: string;
  customer: string | null;
  since?: string;
  created_at?: string;
};
export type Dash = {
  days: number;
  counts: {
    pending: number;
    awaiting: number;
    active: number;
    created: number;
    created_prev: number;
    completed: number;
    completed_prev: number;
  };
  money: {
    revenue: number;
    revenue_prev: number;
    commission: number;
    commission_prev: number;
    today_revenue: number;
    today_commission: number;
  } | null;
  can_money?: boolean;
  series: DayPoint[];
  needs_total: number;
  needs: MiniBooking[];
  top_providers: { name: string; n: number }[];
  top_services: { name: string; n: number }[];
  recent: MiniBooking[];
};

// طلب واحد بيجيب كل أرقام الرئيسية (بتتحسب جوه قاعدة البيانات)
export async function fetchDashboard(days: number): Promise<Dash> {
  const { data, error } = await supabase.rpc('admin_dashboard', { p_days: days });
  if (error) throw error;
  return data as Dash;
}
