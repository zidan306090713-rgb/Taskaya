import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { NO_PERMS, type Level, type Perms } from '../lib/auth';
import { genPassword, staffAction, type Member } from '../lib/team';

const LEVEL_SECTIONS = [
  { k: 'bookings', icon: '📋', label: 'الحجوزات' },
  { k: 'providers', icon: '🏢', label: 'مقدمي الخدمة' },
  { k: 'catalog', icon: '🧰', label: 'الأقسام والخدمات' },
] as const;
const LEVELS: { v: Level; label: string }[] = [
  { v: 'none', label: '🚫 مخفي' },
  { v: 'view', label: '👁️ عرض' },
  { v: 'edit', label: '✏️ تعديل' },
];

export default function MemberModal({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = !member;
  const [name, setName] = useState(member?.full_name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => genPassword());
  const [perms, setPerms] = useState<Perms>(member?.perms ?? { ...NO_PERMS, home: true });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [newPw, setNewPw] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const refresh = () => void qc.invalidateQueries({ queryKey: ['team'] });
  const onError = (e: unknown) => setErr((e as Error).message);

  const save = useMutation({
    mutationFn: async () => {
      if (name.trim().split(/\s+/).filter(Boolean).length < 3) throw new Error('اكتب الاسم ثلاثي');
      if (isNew) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('الإيميل مش صح');
        if (password.length < 8) throw new Error('كلمة السر لازم 8 حروف على الأقل');
        await staffAction({ action: 'create', full_name: name, email: email.trim(), password, perms });
        return 'created';
      }
      await staffAction({ action: 'update', user_id: member.id, full_name: name, perms });
      return 'updated';
    },
    onSuccess: (r) => {
      refresh();
      if (r === 'created') setCreated({ email: email.trim().toLowerCase(), password });
      else onClose();
    },
    onError,
  });
  const toggleActive = useMutation({
    mutationFn: () => staffAction({ action: 'set_active', user_id: member?.id, active: !member?.is_active }),
    onSuccess: () => {
      refresh();
      onClose();
    },
    onError,
  });
  const resetPw = useMutation({
    mutationFn: async () => {
      if (!newPw || newPw.length < 8) throw new Error('كلمة السر لازم 8 حروف على الأقل');
      await staffAction({ action: 'reset_password', user_id: member?.id, password: newPw });
      return newPw;
    },
    onSuccess: (pw) => {
      setPwDone(pw);
      setNewPw(null);
    },
    onError,
  });
  const del = useMutation({
    mutationFn: () => staffAction<{ deactivated?: boolean }>({ action: 'delete', user_id: member?.id }),
    onSuccess: (r) => {
      refresh();
      if (r?.deactivated) {
        setConfirmDel(false);
        setInfo('العضو ده عدّل حجوزات قبل كده، فاتوقف بدل ما يتحذف عشان سجل الحجوزات يفضل كامل.');
      } else onClose();
    },
    onError,
  });
  const busy = save.isPending || toggleActive.isPending || resetPw.isPending || del.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const copyCreds = () => {
    if (!created) return;
    const text =
      `دخول لوحة تحكم TASKAYA\n` +
      `الرابط: ${window.location.origin}/login\n` +
      `الإيميل: ${created.email}\n` +
      `كلمة السر: ${created.password}\n` +
      `(غيّر كلمة السر من قايمة الحساب بعد أول دخول)`;
    void navigator.clipboard.writeText(text).then(() => setCopied(true));
  };

  return (
    <div className="drawer-overlay" onClick={busy ? undefined : onClose}>
      <aside className="drawer small-modal" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <div className="drawer-title">{isNew ? 'عضو جديد' : 'تعديل عضو'}</div>
            {!isNew ? <div className="muted small" dir="ltr">{member.email}</div> : null}
          </div>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="إغلاق">✕</button>
        </header>

        <div className="drawer-body single">
          {created ? (
            <section className="section success">
              <div className="big">✅</div>
              <h3>الحساب اتعمل</h3>
              <p className="muted">ابعت البيانات دي للعضو عشان يدخل:</p>
              <div className="creds" dir="ltr">
                <div><span>Email</span><b>{created.email}</b></div>
                <div><span>Password</span><b>{created.password}</b></div>
              </div>
              <div className="actions">
                <button className="btn btn-neutral" onClick={copyCreds}>{copied ? '✓ اتنسخت' : '📋 نسخ البيانات'}</button>
                <button className="btn btn-primary" onClick={onClose}>تمام</button>
              </div>
            </section>
          ) : (
            <>
              <section className="section">
                <label className="field">
                  الاسم الثلاثي
                  <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                {isNew ? (
                  <>
                    <label className="field">
                      الإيميل
                      <input className="inp" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </label>
                    <label className="field">
                      كلمة السر المبدئية
                      <div className="pw-row">
                        <input className="inp" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <button type="button" className="btn btn-neutral" onClick={() => setPassword(genPassword())} title="كلمة سر عشوائية">🎲</button>
                      </div>
                    </label>
                  </>
                ) : null}
              </section>

              <section className="section">
                <h3>الصلاحيات</h3>
                <label className="flag">
                  <div><b>🏠 الرئيسية</b><div className="muted small">الأرقام والرسم وآخر الحجوزات</div></div>
                  <input type="checkbox" className="switch" checked={perms.home} onChange={(e) => setPerms({ ...perms, home: e.target.checked })} />
                </label>
                <label className="flag">
                  <div><b>💰 الإيرادات والعمولة</b><div className="muted small">كروت الفلوس في الرئيسية</div></div>
                  <input type="checkbox" className="switch" checked={perms.money} onChange={(e) => setPerms({ ...perms, money: e.target.checked })} />
                </label>
                {LEVEL_SECTIONS.map((s) => (
                  <div key={s.k} className="perm-row">
                    <b>{s.icon} {s.label}</b>
                    <div className="seg small-seg">
                      {LEVELS.map((l) => (
                        <button key={l.v} type="button" className={perms[s.k] === l.v ? 'on' : ''} onClick={() => setPerms({ ...perms, [s.k]: l.v })}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <label className="flag">
                  <div><b>👥 إدارة الفريق</b><div className="muted small">يضيف ويعدّل الأعضاء (ماعدا حسابك وحسابه)</div></div>
                  <input type="checkbox" className="switch" checked={perms.team} onChange={(e) => setPerms({ ...perms, team: e.target.checked })} />
                </label>
              </section>

              {!isNew ? (
                <section className="section">
                  <h3>الحساب</h3>
                  {newPw === null ? (
                    <div className="actions">
                      <button className="btn btn-neutral" disabled={busy} onClick={() => { setErr(''); setPwDone(''); setNewPw(genPassword()); }}>🔑 كلمة سر جديدة</button>
                      <button className="btn btn-neutral" disabled={busy} onClick={() => { setErr(''); toggleActive.mutate(); }}>
                        {member.is_active ? '⏸️ إيقاف الحساب' : '▶️ تفعيل الحساب'}
                      </button>
                      <button className="btn btn-danger" disabled={busy} onClick={() => { setErr(''); setConfirmDel(true); }}>🗑️ حذف</button>
                    </div>
                  ) : (
                    <div className="reason">
                      <label className="field">
                        كلمة السر الجديدة
                        <div className="pw-row">
                          <input className="inp" dir="ltr" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                          <button type="button" className="btn btn-neutral" onClick={() => setNewPw(genPassword())}>🎲</button>
                        </div>
                      </label>
                      <div className="actions">
                        <button className="btn btn-neutral" disabled={busy} onClick={() => setNewPw(null)}>رجوع</button>
                        <button className="btn btn-primary" disabled={busy} onClick={() => { setErr(''); resetPw.mutate(); }}>حفظ كلمة السر</button>
                      </div>
                    </div>
                  )}
                  {pwDone ? <p className="note">✅ اتغيرت — ابعتها للعضو: <b dir="ltr">{pwDone}</b></p> : null}
                  {confirmDel ? (
                    <div className="del-confirm mt">
                      <b>متأكد إنك عايز تحذف العضو ده؟</b>
                      <div className="muted small">لو كان عدّل حجوزات قبل كده، هيتوقف بدل ما يتحذف عشان السجل يفضل كامل.</div>
                      <div className="actions">
                        <button className="btn btn-neutral" disabled={busy} onClick={() => setConfirmDel(false)}>رجوع</button>
                        <button className="btn btn-danger" disabled={busy} onClick={() => del.mutate()}>{del.isPending ? '…' : 'تأكيد الحذف'}</button>
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {info ? <p className="note">{info}</p> : null}
              {err ? <div className="alert">{err}</div> : null}
            </>
          )}
        </div>

        {!created ? (
          <footer className="wizard-foot">
            <button className="btn btn-neutral" onClick={onClose} disabled={busy}>إلغاء</button>
            <button className="btn btn-primary" disabled={busy} onClick={() => { setErr(''); save.mutate(); }}>
              {save.isPending ? '…' : isNew ? '✓ إنشاء الحساب' : 'حفظ التعديلات'}
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
