import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { fetchCatalog } from '../lib/catalog';
import { createProvider, fetchAreas, toE164, uploadImage, type Area, type Pricing } from '../lib/newProvider';

type Pick = { pricing_model: Pricing; price: string; duration: string };

const STEPS = ['الحساب', 'النشاط', 'الخدمات والأسعار', 'المناطق'];
const PRICING_OPTS: { v: Pricing; label: string }[] = [
  { v: 'fixed', label: 'سعر ثابت' },
  { v: 'starting_from', label: 'يبدأ من' },
  { v: 'custom_quote', label: 'بعرض سعر' },
];
const MAX_IMG = 3 * 1024 * 1024;

function usePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

export default function NewProviderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: fetchCatalog });
  const areas = useQuery({ queryKey: ['areas'], queryFn: fetchAreas });

  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bizName, setBizName] = useState('');
  const [desc, setDesc] = useState('');
  const [addr, setAddr] = useState('');
  const [verified, setVerified] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const logoUrl = usePreview(logo);
  const coverUrl = usePreview(cover);

  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [catId, setCatId] = useState<string | null>(null);
  const [areaIds, setAreaIds] = useState<Set<string>>(new Set());

  const cats = (catalog.data ?? []).filter((c) => c.is_active);
  const cat = cats.find((c) => c.id === catId) ?? cats[0] ?? null;
  const pickedCount = Object.keys(picks).length;

  const cities = useMemo(() => {
    const m = new Map<string, Area[]>();
    for (const a of areas.data ?? []) {
      const k = a.city?.name_ar ?? 'أخرى';
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return [...m.entries()].map(([city, items]) => ({ city, items }));
  }, [areas.data]);

  const togglePick = (id: string) =>
    setPicks((p) => {
      const n = { ...p };
      if (n[id]) delete n[id];
      else n[id] = { pricing_model: 'fixed', price: '', duration: '' };
      return n;
    });
  const setPick = (id: string, patch: Partial<Pick>) => setPicks((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const toggleArea = (id: string) =>
    setAreaIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleCity = (ids: string[]) =>
    setAreaIds((s) => {
      const n = new Set(s);
      const all = ids.every((i) => n.has(i));
      ids.forEach((i) => (all ? n.delete(i) : n.add(i)));
      return n;
    });

  // التحقق من كل خطوة
  const check = (i: number): string => {
    if (i === 0) {
      if (fullName.trim().split(/\s+/).filter(Boolean).length < 3) return 'اكتب اسم صاحب النشاط ثلاثي';
      if (!toE164(phone)) return 'رقم الموبايل مش صح — مثال: 01012345678';
    }
    if (i === 1 && !bizName.trim()) return 'اكتب اسم النشاط';
    if (i === 2) {
      if (!pickedCount) return 'اختار خدمة واحدة على الأقل';
      for (const p of Object.values(picks)) {
        if (p.pricing_model !== 'custom_quote') {
          const n = Number(p.price);
          if (p.price.trim() === '' || isNaN(n) || n < 0) return 'اكتب سعر لكل خدمة (إلا اللي بعرض سعر)';
        }
        if (p.duration.trim() && (isNaN(Number(p.duration)) || Number(p.duration) <= 0)) return 'المدة لازم تكون عدد دقايق';
      }
    }
    if (i === 3 && areaIds.size === 0) return 'اختار منطقة واحدة على الأقل';
    return '';
  };

  const create = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < 4; i++) {
        const e = check(i);
        if (e) {
          setStep(i);
          throw new Error(e);
        }
      }
      const [logo_url, cover_url] = await Promise.all([
        logo ? uploadImage(logo, 'logo') : Promise.resolve(null),
        cover ? uploadImage(cover, 'cover') : Promise.resolve(null),
      ]);
      return createProvider({
        full_name: fullName.trim().replace(/\s+/g, ' '),
        phone: toE164(phone) as string,
        business_name: bizName.trim(),
        description: desc.trim() || null,
        business_address: addr.trim() || null,
        logo_url,
        cover_url,
        is_verified: verified,
        is_featured: featured,
        services: Object.entries(picks).map(([service_id, p]) => ({
          service_id,
          pricing_model: p.pricing_model,
          base_price: p.pricing_model === 'custom_quote' ? null : Number(p.price),
          duration: p.duration.trim() ? Number(p.duration) : null,
        })),
        areas: [...areaIds],
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['providers'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      setDone(bizName.trim());
    },
    onError: (e) => setErr((e as Error).message),
  });
  const busy = create.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const next = () => {
    const e = check(step);
    setErr(e);
    if (!e) setStep(step + 1);
  };

  const onImg = (set: (f: File | null) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setErr('اختار صورة بس');
    if (file.size > MAX_IMG) return setErr('الصورة أكبر من 3 ميجا');
    setErr('');
    set(file);
  };

  return (
    <div className="drawer-overlay" onClick={busy ? undefined : onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <div className="drawer-title">مقدم خدمة جديد</div>
            <div className="muted small">{done ? 'تم الإنشاء' : `الخطوة ${step + 1} من 4 — ${STEPS[step]}`}</div>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="إغلاق">✕</button>
        </header>

        {!done ? (
          <div className="stepper">
            {STEPS.map((s, i) => (
              <button
                key={s}
                className={`step${i === step ? ' on' : ''}${i < step ? ' done' : ''}`}
                disabled={i >= step || busy}
                onClick={() => {
                  setErr('');
                  setStep(i);
                }}
              >
                <span>{i < step ? '✓' : i + 1}</span>
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <div className="drawer-body single">
          {done ? (
            <section className="section success">
              <div className="big">✅</div>
              <h3>تم إنشاء «{done}»</h3>
              <p className="muted">
                معتمد وظاهر في التطبيق. يقدر يدخل بالرقم <b dir="ltr">{toE164(phone)}</b> بكود SMS.
              </p>
              <button className="btn btn-primary" onClick={onClose}>تمام</button>
            </section>
          ) : step === 0 ? (
            <section className="section">
              <label className="field">
                الاسم الثلاثي لصاحب النشاط
                <input className="inp" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </label>
              <label className="field">
                رقم الموبايل
                <input className="inp" dir="ltr" inputMode="tel" placeholder="01012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <p className="note">📱 مقدم الخدمة هيدخل بالرقم ده بكود SMS — مفيش كلمة سر.</p>
            </section>
          ) : step === 1 ? (
            <section className="section">
              <div className="img-row">
                <label className="img-box logo">
                  {logoUrl ? <img src={logoUrl} alt="" /> : <span>🖼️<small>اللوجو</small></span>}
                  <input type="file" accept="image/*" hidden onChange={onImg(setLogo)} />
                </label>
                <label className="img-box cover">
                  {coverUrl ? <img src={coverUrl} alt="" /> : <span>🏞️<small>صورة الغلاف</small></span>}
                  <input type="file" accept="image/*" hidden onChange={onImg(setCover)} />
                </label>
              </div>
              <p className="muted small">اختياري — لحد 3 ميجا لكل صورة. اضغط على المربع لاختيار صورة.</p>
              <label className="field">
                اسم النشاط
                <input className="inp" value={bizName} onChange={(e) => setBizName(e.target.value)} />
              </label>
              <label className="field">
                العنوان
                <input className="inp" value={addr} onChange={(e) => setAddr(e.target.value)} />
              </label>
              <label className="field">
                الوصف
                <textarea className="inp" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </label>
              <div className="flags">
                <label className="flag">
                  <div><b>موثّق ✔</b><div className="muted small">علامة توثيق جنب الاسم</div></div>
                  <input type="checkbox" className="switch" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
                </label>
                <label className="flag">
                  <div><b>مميز ⭐</b><div className="muted small">يظهر في الرئيسية</div></div>
                  <input type="checkbox" className="switch" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                </label>
              </div>
            </section>
          ) : step === 2 ? (
            <section className="section">
              {catalog.isLoading ? <p className="muted">جاري التحميل…</p> : null}
              <div className="chips">
                {cats.map((c) => (
                  <button key={c.id} className={`chip${c.id === cat?.id ? ' on' : ''}`} onClick={() => setCatId(c.id)}>
                    {c.name_ar}
                  </button>
                ))}
              </div>
              <div className="muted small mt">اخترت {pickedCount} خدمة</div>
              {cat?.subs
                .filter((s) => s.is_active)
                .map((s) => (
                  <div key={s.id} className="pick-group">
                    <div className="pick-sub">{s.name_ar}</div>
                    {s.services
                      .filter((v) => v.is_active)
                      .map((v) => {
                        const p = picks[v.id];
                        return (
                          <div key={v.id} className={`svc-pick${p ? ' on' : ''}`}>
                            <label className="svc-pick-head">
                              <input type="checkbox" className="check" checked={!!p} onChange={() => togglePick(v.id)} />
                              <b>{v.name_ar}</b>
                            </label>
                            {p ? (
                              <div className="pick-fields">
                                <select className="inp" value={p.pricing_model} onChange={(e) => setPick(v.id, { pricing_model: e.target.value as Pricing })}>
                                  {PRICING_OPTS.map((o) => (
                                    <option key={o.v} value={o.v}>{o.label}</option>
                                  ))}
                                </select>
                                <input
                                  className="inp"
                                  dir="ltr"
                                  inputMode="decimal"
                                  placeholder="السعر (ج.م)"
                                  disabled={p.pricing_model === 'custom_quote'}
                                  value={p.pricing_model === 'custom_quote' ? '' : p.price}
                                  onChange={(e) => setPick(v.id, { price: e.target.value })}
                                />
                                <input
                                  className="inp"
                                  dir="ltr"
                                  inputMode="numeric"
                                  placeholder="المدة (دقيقة)"
                                  value={p.duration}
                                  onChange={(e) => setPick(v.id, { duration: e.target.value })}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                ))}
            </section>
          ) : (
            <section className="section">
              {areas.isLoading ? <p className="muted">جاري التحميل…</p> : null}
              {!areas.isLoading && cities.length === 0 ? <p className="muted">مفيش مناطق متسجلة لسه</p> : null}
              {cities.map((g) => {
                const ids = g.items.map((a) => a.id);
                const all = ids.every((i) => areaIds.has(i));
                return (
                  <div key={g.city} className="pick-group">
                    <div className="pick-sub row">
                      <span>{g.city}</span>
                      <button className="mini" onClick={() => toggleCity(ids)}>{all ? 'إلغاء الكل' : 'تحديد الكل'}</button>
                    </div>
                    <div className="chips">
                      {g.items.map((a) => (
                        <button key={a.id} className={`chip${areaIds.has(a.id) ? ' on' : ''}`} onClick={() => toggleArea(a.id)}>
                          {a.name_ar}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="muted small mt">اخترت {areaIds.size} منطقة</div>
            </section>
          )}

          {err ? <div className="alert">{err}</div> : null}
        </div>

        {!done ? (
          <footer className="wizard-foot">
            {step > 0 ? (
              <button className="btn btn-neutral" disabled={busy} onClick={() => { setErr(''); setStep(step - 1); }}>رجوع</button>
            ) : (
              <button className="btn btn-neutral" onClick={onClose}>إلغاء</button>
            )}
            {step < 3 ? (
              <button className="btn btn-primary" onClick={next}>التالي</button>
            ) : (
              <button className="btn btn-primary" disabled={busy} onClick={() => { setErr(''); create.mutate(); }}>
                {busy ? 'جاري الإنشاء…' : '✓ إنشاء مقدم الخدمة'}
              </button>
            )}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
