import { Skeleton } from '../components/Skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Ico } from '../components/Ico';
import { useAuth } from '../lib/auth';
import { money } from '../lib/bookings';
import {
  addEntry, deleteRule, fetchOverview, fetchRules, fetchStatement, KIND_LABEL, LEDGER_LABEL, previewRate, rpcError,
  saveRule, setProviderKind, toNum, type BalanceRow, type EntryKind, type Kind, type Rule,
} from '../lib/commission';

const DAYS = [7, 30, 90];
const dtf = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });
const fmtDate = (s: string | null) => (s ? dtf.format(new Date(s)) : '—');

function BalanceTag({ v }: { v: number }) {
  if (Math.abs(v) < 0.005) return <span className="badge t-gray">مفيش رصيد</span>;
  return v > 0
    ? <span className="badge t-red">عليه {money(v)}</span>
    : <span className="badge t-green">ليه {money(-v)}</span>;
}

function Kpi({ icon, label, value, sub, tone }: { icon: string; label: string; value: string; sub?: string; tone?: 'red' | 'green' }) {
  return (
    <div className={`card cm-kpi${tone ? ` ${tone}` : ''}`}>
      <div className="cm-kpi-top"><Ico e={icon} /> {label}</div>
      <div className="cm-kpi-val">{value}</div>
      {sub ? <div className="muted small">{sub}</div> : null}
    </div>
  );
}

export default function Commission() {
  const [tab, setTab] = useState<'balances' | 'rules'>('balances');
  const [days, setDays] = useState(30);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['commission', days], queryFn: () => fetchOverview(days) });

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.providers ?? []).filter((p) => !s || p.name.toLowerCase().includes(s));
  }, [data, q]);

  const open = data?.providers.find((p) => p.id === openId) ?? null;
  if (open) return <Statement p={open} onBack={() => setOpenId(null)} />;

  return (
    <>
      <div className="sub-head">
        <h1 className="page-title" style={{ margin: 0 }}>العمولات</h1>
        <div className="tabs cm-days">
          {DAYS.map((d) => (
            <button key={d} className={`tab${days === d ? ' on' : ''}`} onClick={() => setDays(d)}>{d} يوم</button>
          ))}
        </div>
      </div>

      {error ? <div className="alert">تعذّر التحميل: {rpcError(error)}</div> : null}

      <div className="cm-kpis">
        <Kpi icon="💰" label={`العمولة في آخر ${days} يوم`} value={money(data?.commission)}
          sub={data ? `${data.bookings} حجز · إجمالي ${money(data.volume)}` : undefined} />
        <Kpi icon="⏳" label="مديونيات لسه متدفعتش" value={money(data?.debt_total)} tone="red" />
        <Kpi icon="💵" label="مستحقات لازم تتحوّل" value={money(data?.owed_total)} tone="green" />
        <Kpi icon="✅" label={`اتسدد في آخر ${days} يوم`} value={money(data?.settled)} />
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'balances' ? ' on' : ''}`} onClick={() => setTab('balances')}>أرصدة مقدمي الخدمة</button>
        <button className={`tab${tab === 'rules' ? ' on' : ''}`} onClick={() => setTab('rules')}>شرائح العمولة</button>
      </div>

      {tab === 'rules' ? <Rules /> : (
        <>
          <div className="toolbar">
            <input className="inp search" placeholder="ابحث باسم مقدم الخدمة" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {isLoading ? <Skeleton kind="table" /> : null}
          {!isLoading && shown.length === 0 ? <div className="card muted">مفيش مقدمي خدمة هنا</div> : null}
          {shown.length ? (
            <div className="card cm-scroll">
              <table className="cm-table">
                <thead><tr><th>مقدم الخدمة</th><th>النوع</th><th>الرصيد</th><th>آخر حركة</th></tr></thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.id} className="cm-row" onClick={() => setOpenId(p.id)}>
                      <td><b>{p.name}</b></td>
                      <td><span className="badge t-gray">{KIND_LABEL[p.kind]}</span></td>
                      <td><BalanceTag v={p.balance} /></td>
                      <td className="muted small">{fmtDate(p.last_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

const MODES: { k: EntryKind; label: string; hint: string }[] = [
  { k: 'settlement', label: 'تسجيل سداد', hint: 'مقدم الخدمة دفعلك من المديونية اللي عليه' },
  { k: 'payout', label: 'تسجيل تحويل', hint: 'إنت حوّلت لمقدم الخدمة من مستحقاته' },
  { k: 'adjustment', label: 'تسوية يدوية', hint: 'تصحيح الرصيد بالزيادة أو النقص' },
];

function Statement({ p, onBack }: { p: BalanceRow; onBack: () => void }) {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canMoney = can('money', true);
  const canKind = can('providers', true);
  const { data, isLoading, error } = useQuery({ queryKey: ['statement', p.id], queryFn: () => fetchStatement(p.id) });
  const balance = data ? (data[0]?.balance ?? 0) : p.balance;
  const [mode, setMode] = useState<EntryKind>('settlement');
  const [amount, setAmount] = useState('');
  const [sign, setSign] = useState<1 | -1>(1);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['statement', p.id] });
    void qc.invalidateQueries({ queryKey: ['commission'] });
  };
  const add = useMutation({
    mutationFn: () => {
      const n = toNum(amount);
      if (!(n > 0)) throw new Error('BAD_AMOUNT');
      return addEntry(p.id, mode, mode === 'adjustment' ? n * sign : n, note);
    },
    onSuccess: () => { setAmount(''); setNote(''); setErr(''); setMsg('اتسجلت الحركة'); refresh(); },
    onError: (e) => { setMsg(''); setErr(rpcError(e)); },
  });
  const kindM = useMutation({
    mutationFn: (k: Kind) => setProviderKind(p.id, k),
    onSuccess: refresh,
    onError: (e) => setErr(rpcError(e)),
  });

  const quick = mode === 'settlement' && balance > 0 ? balance : mode === 'payout' && balance < 0 ? -balance : null;
  const cur = MODES.find((m) => m.k === mode) ?? MODES[0];

  return (
    <>
      <div className="cm-head">
        <button className="btn btn-neutral" onClick={onBack}>→ رجوع</button>
        <h1 className="page-title">{p.name}</h1>
        <BalanceTag v={balance} />
      </div>

      <div className="card cm-form">
        <div className="cm-form-row">
          <b>النوع:</b>
          <div className="tabs cm-days">
            {(['individual', 'company'] as Kind[]).map((k) => (
              <button key={k} className={`tab${p.kind === k ? ' on' : ''}`} disabled={!canKind || kindM.isPending}
                onClick={() => { if (p.kind !== k) kindM.mutate(k); }}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <span className="muted small">النوع بيحدد شريحة العمولة للحجوزات الجاية</span>
        </div>
      </div>

      {canMoney ? (
        <div className="card cm-form">
          <div className="tabs cm-days">
            {MODES.map((m) => (
              <button key={m.k} className={`tab${mode === m.k ? ' on' : ''}`}
                onClick={() => { setMode(m.k); setErr(''); setMsg(''); }}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="muted small">{cur.hint}</div>
          <div className="cm-form-row">
            {mode === 'adjustment' ? (
              <div className="tabs cm-days">
                <button className={`tab${sign === 1 ? ' on' : ''}`} onClick={() => setSign(1)}>يزوّد اللي عليه</button>
                <button className={`tab${sign === -1 ? ' on' : ''}`} onClick={() => setSign(-1)}>يقلّل اللي عليه</button>
              </div>
            ) : null}
            <input className="inp" inputMode="decimal" placeholder="المبلغ بالجنيه" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="inp" placeholder="ملاحظة (اختياري) — مثلاً: فودافون كاش" value={note} onChange={(e) => setNote(e.target.value)} />
            {quick ? <button className="btn btn-neutral" onClick={() => setAmount(String(quick))}>المبلغ كله ({money(quick)})</button> : null}
            <button className="btn btn-primary" disabled={add.isPending || !amount.trim()} onClick={() => add.mutate()}>
              {add.isPending ? '…' : 'تسجيل'}
            </button>
          </div>
          {err ? <div className="cm-err">{err}</div> : null}
          {msg ? <div className="note">{msg}</div> : null}
        </div>
      ) : null}

      <h3 className="cm-title"><Ico e="📋" /> كشف الحساب</h3>
      {error ? <div className="alert">تعذّر التحميل: {rpcError(error)}</div> : null}
      {isLoading ? <Skeleton kind="table" /> : null}
      {data && data.length === 0 ? <div className="card muted">مفيش حركات لسه</div> : null}
      {data?.length ? (
        <div className="card cm-scroll">
          <table className="cm-table">
            <thead><tr><th>التاريخ</th><th>الحركة</th><th>المبلغ</th><th>الرصيد بعدها</th></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td className="muted small">{fmtDate(r.created_at)}</td>
                  <td>
                    <div>{LEDGER_LABEL[r.kind]}</div>
                    <div className="muted small">
                      {r.booking_number ? `حجز #${r.booking_number}` : ''}
                      {r.price != null ? ` · ${money(r.price)}` : ''}
                      {r.rate != null && r.kind === 'commission' ? ` · ${r.rate}%` : ''}
                      {r.note ? ` · ${r.note}` : ''}
                    </div>
                  </td>
                  <td className={r.amount > 0 ? 'cm-plus' : 'cm-minus'}>{r.amount > 0 ? '+' : '−'} {money(Math.abs(r.amount))}</td>
                  <td><BalanceTag v={r.balance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="muted small cm-legend">+ بالأحمر = بيزوّد اللي على مقدم الخدمة · − بالأخضر = بيقلّله</div>
        </div>
      ) : null}
    </>
  );
}

const GROUPS: { k: Kind | null; title: string; hint: string }[] = [
  { k: 'individual', title: 'الأفراد', hint: 'مقدمي الخدمة الأفراد' },
  { k: 'company', title: 'المؤسسات', hint: 'مقدمي الخدمة من نوع شركة' },
  { k: null, title: 'القاعدة العامة', hint: 'بتتطبق على أي نوع مالوش شرايح' },
];

function Rules() {
  const qc = useQueryClient();
  const canEdit = useAuth().can('money', true);
  const { data, isLoading, error } = useQuery({ queryKey: ['commission-rules'], queryFn: fetchRules });
  const [tryPrice, setTryPrice] = useState('500');
  const general = (data ?? []).filter((r) => !r.provider_id && !r.category_id);
  const special = (data?.length ?? 0) - general.length;
  const reload = () => void qc.invalidateQueries({ queryKey: ['commission-rules'] });
  const price = toNum(tryPrice) || 0;

  return (
    <>
      <p className="note">
        النسبة بتتحدد لما الحجز يخلص: بنشوف نوع مقدم الخدمة، وبناخد أعلى شريحة سعر الحجز وصلها.
        لو نوعه مالوش شرايح بتتطبق القاعدة العامة. أي تغيير بيأثر على الحجوزات اللي هتخلص بعد كده بس.
      </p>
      {error ? <div className="alert">تعذّر التحميل: {rpcError(error)}</div> : null}
      {isLoading ? <Skeleton kind="table" /> : null}
      {data ? (
        <div className="cm-rules">
          {GROUPS.map((g) => {
            const rows = general.filter((r) => r.provider_kind === g.k);
            return (
              <div key={g.k ?? 'all'} className="card">
                <h3 className="cm-title">{g.title}</h3>
                <div className="muted small">{g.hint}</div>
                {rows.map((r) => (
                  <RuleRow key={r.id} r={r} kind={g.k} canEdit={canEdit} onDone={reload} last={g.k === null && rows.length === 1} />
                ))}
                {rows.length === 0 ? (
                  <div className="muted small cm-empty">
                    {g.k === null ? 'مفيش قاعدة عامة — النسبة هتبقى 0%' : 'مفيش شرايح — بتتطبق القاعدة العامة'}
                  </div>
                ) : null}
                {canEdit ? <RuleRow kind={g.k} canEdit onDone={reload} /> : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {data ? (
        <div className="card cm-try">
          <b><Ico e="🔍" /> جرّب سعر:</b>
          <input className="inp cm-num" inputMode="decimal" value={tryPrice} onChange={(e) => setTryPrice(e.target.value)} />
          <span className="muted small">ج</span>
          {(['individual', 'company'] as Kind[]).map((k) => {
            const rate = previewRate(general, k, price)?.rate_percent ?? 0;
            return (
              <span key={k} className="badge t-gray">
                {KIND_LABEL[k]}: {rate}% = {money(Math.round(price * rate) / 100)}
              </span>
            );
          })}
        </div>
      ) : null}
      {special > 0 ? (
        <p className="muted small">فيه {special} قاعدة خاصة بمقدم خدمة أو قسم معين، ودي ليها الأولوية على الشرايح دي.</p>
      ) : null}
    </>
  );
}

function RuleRow({ r, kind, canEdit, onDone, last }: { r?: Rule; kind: Kind | null; canEdit: boolean; onDone: () => void; last?: boolean }) {
  const [min, setMin] = useState(r ? String(r.min_price) : '');
  const [rate, setRate] = useState(r ? String(r.rate_percent) : '');
  const [err, setErr] = useState('');
  const dirty = !r || String(r.min_price) !== min || String(r.rate_percent) !== rate;

  const save = useMutation({
    mutationFn: () => {
      const m = toNum(min || '0');
      const t = toNum(rate);
      if (!(m >= 0) || !rate.trim() || !(t >= 0 && t <= 100)) throw new Error('BAD_RULE');
      return saveRule({ id: r?.id, provider_kind: kind, min_price: m, rate_percent: t });
    },
    onSuccess: () => { if (!r) { setMin(''); setRate(''); } setErr(''); onDone(); },
    onError: (e) => setErr(rpcError(e)),
  });
  const del = useMutation({
    mutationFn: () => deleteRule(r!.id),
    onSuccess: onDone,
    onError: (e) => setErr(rpcError(e)),
  });

  return (
    <div className={`cm-rule${r ? '' : ' cm-new'}`}>
      <span className="muted small">{r ? 'من' : 'شريحة جديدة: من'}</span>
      <input className="inp cm-num" inputMode="decimal" placeholder="0" value={min} disabled={!canEdit} onChange={(e) => setMin(e.target.value)} />
      <span className="muted small">ج ←</span>
      <input className="inp cm-num" inputMode="decimal" placeholder="10" value={rate} disabled={!canEdit} onChange={(e) => setRate(e.target.value)} />
      <span className="muted small">%</span>
      {canEdit && dirty ? (
        <button className="btn btn-primary cm-mini" disabled={save.isPending} onClick={() => save.mutate()}>
          {r ? 'حفظ' : 'إضافة'}
        </button>
      ) : null}
      {canEdit && r && !last ? (
        <button className="icon-btn" title="حذف" disabled={del.isPending}
          onClick={() => { if (window.confirm('تمسح الشريحة دي؟')) del.mutate(); }}>
          <Ico e="🗑" />
        </button>
      ) : null}
      {err ? <div className="cm-err">{err}</div> : null}
    </div>
  );
}
