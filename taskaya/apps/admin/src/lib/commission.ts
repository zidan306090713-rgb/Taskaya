import { supabase } from './supabase';

export type Kind = 'individual' | 'company';
export const KIND_LABEL: Record<Kind, string> = { individual: 'فرد', company: 'مؤسسة' };

export type BalanceRow = { id: string; name: string; kind: Kind; logo_url: string | null; balance: number; last_at: string | null };
export type Overview = {
  commission: number; bookings: number; volume: number;
  debt_total: number; owed_total: number; settled: number;
  providers: BalanceRow[];
};

// أرقام عربي/فواصل → رقم
export const toNum = (s: string) =>
  Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٫,]/g, '.').trim());

export async function fetchOverview(days: number): Promise<Overview> {
  const from = new Date(Date.now() - days * 86400000).toISOString();
  const to = new Date(Date.now() + 60000).toISOString();
  const { data, error } = await supabase.rpc('admin_commission_overview', { p_from: from, p_to: to });
  if (error) throw error;
  const o = data as Overview;
  return { ...o, providers: (o.providers ?? []).map((p) => ({ ...p, balance: Number(p.balance) })) };
}

export type LedgerKind = 'commission' | 'online_earning' | 'settlement' | 'payout' | 'adjustment';
export type EntryKind = 'settlement' | 'payout' | 'adjustment';
export const LEDGER_LABEL: Record<LedgerKind, string> = {
  commission: 'عمولة حجز كاش',
  online_earning: 'مستحقات حجز أونلاين',
  settlement: 'سداد من مقدم الخدمة',
  payout: 'تحويل لمقدم الخدمة',
  adjustment: 'تسوية يدوية',
};

export type StatementRow = {
  id: string; created_at: string; kind: LedgerKind; amount: number; balance: number; note: string | null;
  booking_number: number | null; booking_id: string | null; price: number | null; rate: number | null;
};

export async function fetchStatement(providerId: string): Promise<StatementRow[]> {
  const { data, error } = await supabase.rpc('admin_provider_statement', { p_provider: providerId });
  if (error) throw error;
  return ((data ?? []) as StatementRow[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
    balance: Number(r.balance),
    price: r.price == null ? null : Number(r.price),
    rate: r.rate == null ? null : Number(r.rate),
  }));
}

export async function addEntry(providerId: string, kind: EntryKind, amount: number, note: string) {
  const { error } = await supabase.rpc('admin_ledger_entry', { p_provider: providerId, p_kind: kind, p_amount: amount, p_note: note });
  if (error) throw error;
}

export async function setProviderKind(id: string, kind: Kind) {
  const { error } = await supabase.from('provider_profiles').update({ kind }).eq('id', id);
  if (error) throw error;
}

export type Rule = {
  id: string; provider_kind: Kind | null; min_price: number; rate_percent: number;
  is_active: boolean; provider_id: string | null; category_id: string | null;
};

export async function fetchRules(): Promise<Rule[]> {
  const { data, error } = await supabase
    .from('commission_rules')
    .select('id, provider_kind, min_price, rate_percent, is_active, provider_id, category_id')
    .order('min_price');
  if (error) throw error;
  return ((data ?? []) as Rule[]).map((r) => ({ ...r, min_price: Number(r.min_price), rate_percent: Number(r.rate_percent) }));
}

export async function saveRule(r: { id?: string; provider_kind: Kind | null; min_price: number; rate_percent: number }) {
  const row = { provider_kind: r.provider_kind, min_price: r.min_price, rate_percent: r.rate_percent, is_active: true };
  const { error } = r.id
    ? await supabase.from('commission_rules').update(row).eq('id', r.id)
    : await supabase.from('commission_rules').insert(row);
  if (error) throw error;
}

export async function deleteRule(id: string) {
  const { error } = await supabase.from('commission_rules').delete().eq('id', id);
  if (error) throw error;
}

// نفس منطق commission_rate_for في قاعدة البيانات (للشرائح العامة) — لزرار "جرّب سعر"
export function previewRate(rules: Rule[], kind: Kind, price: number): Rule | null {
  const ok = rules.filter(
    (r) => r.is_active && !r.provider_id && !r.category_id &&
      (r.provider_kind === null || r.provider_kind === kind) && r.min_price <= price,
  );
  ok.sort((a, b) => Number(b.provider_kind !== null) - Number(a.provider_kind !== null) || b.min_price - a.min_price);
  return ok[0] ?? null;
}

export function rpcError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (m.includes('FORBIDDEN')) return 'مالكش صلاحية على الفلوس';
  if (m.includes('BAD_AMOUNT')) return 'اكتب مبلغ صحيح أكبر من صفر';
  if (m.includes('BAD_RULE')) return 'اكتب سعر بداية صحيح ونسبة من 0 لـ 100';
  if (m.includes('KIND_ADMIN_ONLY')) return 'نوع مقدم الخدمة بيتغير من اللوحة بس';
  if (m.includes('row-level security')) return 'مالكش صلاحية تعدّل ده';
  return m;
}
