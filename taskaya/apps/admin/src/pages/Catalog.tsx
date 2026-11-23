import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { catalogError, deleteRow, fetchCatalog, iconEmoji, ICONS, saveRow, type Kind } from '../lib/catalog';

type Field = { key: string; label: string; multiline?: boolean; ltr?: boolean; num?: boolean; icon?: boolean };

const FIELDS: Record<Kind, Field[]> = {
  cat: [
    { key: 'name_ar', label: 'الاسم بالعربي' },
    { key: 'name_en', label: 'الاسم بالإنجليزي', ltr: true },
    { key: 'icon', label: 'الأيقونة', icon: true },
    { key: 'description_ar', label: 'الوصف بالعربي', multiline: true },
    { key: 'description_en', label: 'الوصف بالإنجليزي', multiline: true, ltr: true },
    { key: 'sort_order', label: 'الترتيب (الأصغر الأول)', num: true },
  ],
  sub: [
    { key: 'name_ar', label: 'الاسم بالعربي' },
    { key: 'name_en', label: 'الاسم بالإنجليزي', ltr: true },
    { key: 'sort_order', label: 'الترتيب (الأصغر الأول)', num: true },
  ],
  svc: [
    { key: 'name_ar', label: 'الاسم بالعربي' },
    { key: 'name_en', label: 'الاسم بالإنجليزي', ltr: true },
    { key: 'description_ar', label: 'الوصف بالعربي', multiline: true },
    { key: 'description_en', label: 'الوصف بالإنجليزي', multiline: true, ltr: true },
  ],
};
const TITLE: Record<Kind, string> = { cat: 'قسم رئيسي', sub: 'قسم فرعي', svc: 'خدمة' };
const DELETE_HINT: Record<Kind, string> = {
  cat: 'هيتحذف القسم بكل أقسامه الفرعية وخدماته — بشرط محدش يكون بيستخدم أي خدمة منهم.',
  sub: 'هيتحذف القسم الفرعي والخدمات اللي جواه — بشرط محدش يكون بيستخدمها.',
  svc: 'هتتحذف الخدمة. لو عليها حجوزات أو مقدمي خدمة مش هتتحذف.',
};

type Editing = { kind: Kind; id: string | null; parent?: Record<string, string>; values: Record<string, string> };

export default function Catalog() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['catalog'], queryFn: fetchCatalog });
  const [catId, setCatId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);

  const cat = data?.find((c) => c.id === catId) ?? data?.[0] ?? null;

  const toggle = useMutation({
    mutationFn: (v: { kind: Kind; id: string; on: boolean }) => saveRow(v.kind, v.id, { is_active: v.on }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });

  const openEdit = (kind: Kind, row: Record<string, unknown> | null, parent?: Record<string, string>, defaults?: Record<string, string>) =>
    setEditing({
      kind,
      id: (row?.id as string | undefined) ?? null,
      parent,
      values: Object.fromEntries(
        FIELDS[kind].map((f) => [f.key, row?.[f.key] == null ? (defaults?.[f.key] ?? '') : String(row[f.key])]),
      ),
    });

  const newCat = () => {
    const next = Math.max(0, ...(data ?? []).map((c) => c.sort_order)) + 1;
    openEdit('cat', null, undefined, { sort_order: String(next), icon: 'grid-outline' });
  };

  const sw = (kind: Kind, id: string, on: boolean) => (
    <input
      type="checkbox"
      className="switch"
      checked={on}
      disabled={toggle.isPending}
      title={on ? 'شغّال — اضغط للقفل' : 'مقفول — اضغط للتشغيل'}
      onChange={(e) => toggle.mutate({ kind, id, on: e.target.checked })}
    />
  );

  return (
    <>
      <div className="sub-head">
        <h1 className="page-title" style={{ margin: 0 }}>الأقسام والخدمات</h1>
        <button className="btn btn-primary" onClick={newCat}>+ قسم رئيسي</button>
      </div>
      {error ? <div className="alert">تعذّر التحميل: {(error as Error).message}</div> : null}
      {isLoading ? <div className="card muted">جاري التحميل…</div> : null}

      <div className="cat-row">
        {data?.map((c) => (
          <div key={c.id} className={`cat-card${c.id === cat?.id ? ' on' : ''}${c.is_active ? '' : ' off'}`} onClick={() => setCatId(c.id)}>
            <div className="cat-top">
              <span className="cat-icon">{iconEmoji(c.icon)}</span>
              <div>
                <div className="cat-name">{c.name_ar}</div>
                <div className="small muted" dir="ltr">{c.name_en}</div>
              </div>
            </div>
            <div className="cat-stats">
              {c.subs.length} قسم فرعي · {c.subs.reduce((n, s) => n + s.services.length, 0)} خدمة
            </div>
            <div className="cat-tools" onClick={(e) => e.stopPropagation()}>
              <button className="mini" onClick={() => openEdit('cat', c)}>✏️ تعديل</button>
              {sw('cat', c.id, c.is_active)}
            </div>
          </div>
        ))}
      </div>

      {cat ? (
        <>
          <div className="sub-head">
            <h2>{iconEmoji(cat.icon)} {cat.name_ar}</h2>
            <button className="btn btn-neutral" onClick={() => openEdit('sub', null, { category_id: cat.id })}>+ قسم فرعي</button>
          </div>
          {cat.subs.length === 0 ? <div className="card muted">مفيش أقسام فرعية لسه — ابدأ بإضافة واحد</div> : null}

          <div className="subs">
            {cat.subs.map((s) => (
              <section key={s.id} className={`section sub${s.is_active ? '' : ' off'}`}>
                <div className="sub-title">
                  <div>
                    <b>{s.name_ar}</b> <span className="muted small" dir="ltr">{s.name_en}</span>
                  </div>
                  <div className="row-tools">
                    <button className="mini" onClick={() => openEdit('sub', s)}>✏️</button>
                    {sw('sub', s.id, s.is_active)}
                  </div>
                </div>

                <div className="svc-rows">
                  {s.services.length === 0 ? <div className="muted small">مفيش خدمات لسه</div> : null}
                  {s.services.map((v) => (
                    <div key={v.id} className={`svc-row${v.is_active ? '' : ' off'}`}>
                      <div>
                        <b>{v.name_ar}</b>
                        <div className="muted small">{v.description_ar || v.name_en}</div>
                      </div>
                      <div className="row-tools">
                        <button className="mini" onClick={() => openEdit('svc', v)}>✏️</button>
                        {sw('svc', v.id, v.is_active)}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="add-btn" onClick={() => openEdit('svc', null, { subcategory_id: s.id })}>+ إضافة خدمة</button>
              </section>
            ))}
          </div>
        </>
      ) : null}

      {editing ? (
        <EditModal
          editing={editing}
          onClose={() => setEditing(null)}
          onDeleted={() => {
            if (editing.kind === 'cat') setCatId(null);
          }}
        />
      ) : null}
    </>
  );
}

function EditModal({ editing, onClose, onDeleted }: { editing: Editing; onClose: () => void; onDeleted: () => void }) {
  const qc = useQueryClient();
  const [vals, setVals] = useState(editing.values);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['catalog'] });
    onClose();
  };

  const save = useMutation({
    mutationFn: () => {
      const row: Record<string, unknown> = { ...editing.parent };
      for (const f of FIELDS[editing.kind]) {
        const v = (vals[f.key] ?? '').trim();
        if (f.num) {
          const n = v === '' ? 0 : Number(v);
          if (isNaN(n)) throw new Error('الترتيب لازم يكون رقم');
          row[f.key] = n;
        } else {
          row[f.key] = v || null;
        }
      }
      if (!row.name_ar || !row.name_en) throw new Error('الاسم بالعربي والإنجليزي مطلوبين');
      return saveRow(editing.kind, editing.id, row);
    },
    onSuccess: done,
    onError: (e) => setErr(catalogError(e)),
  });

  const del = useMutation({
    mutationFn: () => deleteRow(editing.kind, editing.id as string),
    onSuccess: () => {
      onDeleted();
      done();
    },
    onError: (e) => {
      setConfirmDel(false);
      setErr(catalogError(e));
    },
  });

  const busy = save.isPending || del.isPending;
  const set = (k: string, v: string) => setVals({ ...vals, [k]: v });

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer small-modal" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <div className="drawer-title">{editing.id ? 'تعديل' : 'إضافة'} {TITLE[editing.kind]}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">✕</button>
        </header>
        <div className="drawer-body single">
          <section className="section">
            {FIELDS[editing.kind].map((f) => (
              <div key={f.key} className="field">
                {f.label}
                {f.icon ? (
                  <div className="icon-pick">
                    {ICONS.map((i) => (
                      <button
                        key={i.value}
                        type="button"
                        className={`icon-opt${vals.icon === i.value ? ' on' : ''}`}
                        onClick={() => set('icon', i.value)}
                        title={i.label}
                      >
                        <span>{i.emoji}</span>
                        <small>{i.label}</small>
                      </button>
                    ))}
                  </div>
                ) : f.multiline ? (
                  <textarea className="inp" rows={3} dir={f.ltr ? 'ltr' : undefined} value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input
                    className="inp"
                    dir={f.ltr || f.num ? 'ltr' : undefined}
                    inputMode={f.num ? 'numeric' : undefined}
                    value={vals[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {err ? <div className="alert">{err}</div> : null}

            {confirmDel ? (
              <div className="del-confirm">
                <b>متأكد إنك عايز تحذف؟</b>
                <div className="muted small">{DELETE_HINT[editing.kind]}</div>
                <div className="actions">
                  <button className="btn btn-neutral" disabled={busy} onClick={() => setConfirmDel(false)}>رجوع</button>
                  <button className="btn btn-danger" disabled={busy} onClick={() => { setErr(''); del.mutate(); }}>
                    {del.isPending ? '…' : 'تأكيد الحذف'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="actions">
                {editing.id ? (
                  <button className="btn btn-danger" disabled={busy} onClick={() => { setErr(''); setConfirmDel(true); }}>🗑️ حذف</button>
                ) : null}
                <button className="btn btn-neutral" disabled={busy} onClick={onClose}>إلغاء</button>
                <button className="btn btn-primary" disabled={busy} onClick={() => { setErr(''); save.mutate(); }}>
                  {save.isPending ? '…' : 'حفظ'}
                </button>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
