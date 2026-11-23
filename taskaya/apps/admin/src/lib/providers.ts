import { supabase } from './supabase';

export type PStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type Provider = {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  business_address: string | null;
  status: PStatus;
  is_verified: boolean;
  is_featured: boolean;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  rejection_reason: string | null;
  created_at: string;
  owner: { full_name: string | null; phone: string | null; email: string | null } | null;
  services: {
    id: string;
    title: string | null;
    base_price: number | null;
    pricing_model: string;
    is_active: boolean;
    service: { name_ar: string } | null;
  }[];
  coverage: { area: { name_ar: string } | null }[];
};

export const P_STATUS: Record<PStatus, { label: string; tone: string }> = {
  pending: { label: 'مستني موافقة', tone: 'amber' },
  approved: { label: 'معتمد', tone: 'green' },
  rejected: { label: 'مرفوض', tone: 'red' },
  suspended: { label: 'موقوف', tone: 'gray' },
};
export const P_ORDER: PStatus[] = ['pending', 'approved', 'suspended', 'rejected'];

export type PAction = { to: PStatus; label: string; kind: 'primary' | 'neutral' | 'danger'; needsReason?: boolean };

export const P_ACTIONS: Record<PStatus, PAction[]> = {
  pending: [
    { to: 'approved', label: 'موافقة واعتماد', kind: 'primary' },
    { to: 'rejected', label: 'رفض', kind: 'danger', needsReason: true },
  ],
  approved: [{ to: 'suspended', label: 'إيقاف مؤقت', kind: 'danger' }],
  suspended: [{ to: 'approved', label: 'إعادة تفعيل', kind: 'primary' }],
  rejected: [{ to: 'approved', label: 'اعتماد', kind: 'primary' }],
};

const SELECT = `id, business_name, description, logo_url, cover_url, business_address, status,
  is_verified, is_featured, is_available, rating_avg, rating_count, rejection_reason, created_at,
  owner:profiles!provider_profiles_id_fkey(full_name, phone, email),
  services:provider_services(id, title, base_price, pricing_model, is_active, service:services(name_ar)),
  coverage:provider_coverage(area:service_areas(name_ar))`;

export async function fetchProviders(): Promise<Provider[]> {
  const { data, error } = await supabase.from('provider_profiles').select(SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Provider[];
}

export async function updateProvider(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('provider_profiles').update(patch).eq('id', id);
  if (error) throw error;
}
