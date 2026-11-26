import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, L, toNum, useProStyles } from '@/components/pro/ProUI';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { tr } from '@/i18n';
import { isProvider } from '@/lib/provider';
import { CatalogCat, durOf, getCatalog, getMyServices, MyService, nameOf, PRICING, PricingModel, saveService } from '@/lib/proServices';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

const DURS = [30, 60, 90, 120, 180, 240];
const MODELS: PricingModel[] = ['fixed', 'starting_from', 'custom_quote'];

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const { c } = useTheme();
  const s = useProStyles();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.chip, on && { backgroundColor: c.accent, borderColor: c.accent }]}>
      <Text style={[s.chipText, on && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

// إضافة خدمة جديدة أو تعديل واحدة موجودة (?id=)
export default function ServiceForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { c } = useTheme();
  const s = useProStyles();
  const st = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';

  const [cats, setCats] = useState<CatalogCat[] | null>(null);
  const [orig, setOrig] = useState<MyService | null>(null);
  const [catId, setCatId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [svcId, setSvcId] = useState<string | null>(null);
  const [model, setModel] = useState<PricingModel>('fixed');
  const [price, setPrice] = useState('');
  const [dur, setDur] = useState<number | null>(60);
  const [desc, setDesc] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await getCatalog();
      if (!alive) return;
      setCats(list);
      if (!id || !uid) return;
      const r = (await getMyServices(uid)).find((x) => x.id === id);
      if (!r || !alive) return;
      setOrig(r);
      setCatId(r.service?.sub?.cat?.id ?? null);
      setSubId(r.service?.sub?.id ?? null);
      setSvcId(r.service_id);
      setModel(r.pricing_model);
      setPrice(r.base_price ? String(r.base_price) : '');
      setDur(r.estimated_duration_minutes);
      setDesc(r.description ?? '');
    })();
    return () => {
      alive = false;
    };
  }, [id, uid]);

  const cat = cats?.find((x) => x.id === catId) ?? null;
  const sub = cat?.subs.find((x) => x.id === subId) ?? null;
  const svc = sub?.services.find((x) => x.id === svcId) ?? null;

  if (session && !isProvider(session)) return <Redirect href="/" />;

  async function submit() {
    setErr(null);
    if (!svc) return setErr(tr('اختار القسم والنوع والخدمة', 'Choose the category, type and service'));
    const p = price.trim() ? toNum(price) : null;
    if (p != null && (isNaN(p) || p < 0)) return setErr(tr('السعر مش مظبوط', 'The price is not valid'));
    if (model !== 'custom_quote' && !(p && p > 0)) return setErr(tr('اكتب السعر', 'Enter the price'));
    setBusy(true);
    const e = await saveService(
      uid,
      { service_id: svc.id, title: svc.name_ar, pricing_model: model, base_price: p, estimated_duration_minutes: dur, description: desc.trim() || null },
      orig?.id,
    );
    setBusy(false);
    if (e) return setErr(e);
    router.back();
  }

  const priceLabel =
    model === 'custom_quote' ? tr('سعر تقريبي (اختياري)', 'Approximate price (optional)') : model === 'starting_from' ? tr('السعر يبدأ من', 'Price starts from') : tr('السعر', 'Price');

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <GradientHeader
        title={orig ? tr('تعديل خدمة', 'Edit service') : tr('إضافة خدمة', 'Add a service')}
        subtitle={tr('الإدارة بتراجعها قبل ما تظهر للعملاء', 'TASKAYA reviews it before customers can see it')}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[st.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          {cats === null ? (
            <ListSkeleton rows={3} height={90} />
          ) : (
            <>
              {orig?.review_status === 'approved' ? (
                <View style={s.box}>
                  <View style={s.boxHead}>
                    <Ionicons name="information-circle-outline" size={18} color={c.accentText} />
                    <Text style={s.boxTitle}>{tr('خلي بالك', 'Heads up')}</Text>
                  </View>
                  <Text style={s.boxText}>
                    {tr('لو غيّرت السعر أو طريقة التسعير أو الخدمة، هتقف لحد ما الإدارة تراجعها تاني.', 'Changing the price, pricing model or service pauses it until TASKAYA reviews it again.')}
                  </Text>
                </View>
              ) : null}
              {orig?.review_status === 'rejected' && orig.review_note ? (
                <View style={s.reason}>
                  <Ionicons name="alert-circle-outline" size={18} color={c.dangerText} />
                  <Text style={s.reasonText}>{tr(`سبب الرفض: ${orig.review_note}`, `Rejection reason: ${orig.review_note}`)}</Text>
                </View>
              ) : null}

              <View style={s.panel}>
                <Text style={st.label}>{tr('١ · القسم', '1 · Category')}</Text>
                <View style={s.chips}>
                  {cats.map((x) => (
                    <Chip key={x.id} on={x.id === catId} label={nameOf(x)} onPress={() => { setCatId(x.id); setSubId(null); setSvcId(null); }} />
                  ))}
                </View>
                {cat ? (
                  <>
                    <Text style={st.label}>{tr('٢ · النوع', '2 · Type')}</Text>
                    {cat.subs.length ? (
                      <View style={s.chips}>
                        {cat.subs.map((x) => (
                          <Chip key={x.id} on={x.id === subId} label={nameOf(x)} onPress={() => { setSubId(x.id); setSvcId(null); }} />
                        ))}
                      </View>
                    ) : (
                      <Text style={s.panelSub}>{tr('مفيش أنواع في القسم ده لسه.', 'No types in this category yet.')}</Text>
                    )}
                  </>
                ) : null}
                {sub ? (
                  <>
                    <Text style={st.label}>{tr('٣ · الخدمة', '3 · Service')}</Text>
                    {sub.services.length ? (
                      <View style={s.chips}>
                        {sub.services.map((x) => (
                          <Chip key={x.id} on={x.id === svcId} label={nameOf(x)} onPress={() => setSvcId(x.id)} />
                        ))}
                      </View>
                    ) : (
                      <Text style={s.panelSub}>{tr('مفيش خدمات هنا لسه.', 'No services here yet.')}</Text>
                    )}
                  </>
                ) : null}
              </View>

              <View style={s.panel}>
                <Text style={st.label}>{tr('طريقة التسعير', 'Pricing')}</Text>
                <View style={s.chips}>
                  {MODELS.map((m) => (
                    <Chip key={m} on={m === model} label={L(PRICING[m])} onPress={() => setModel(m)} />
                  ))}
                </View>
                <Text style={s.panelSub}>{tr(...PRICING[model].hint)}</Text>

                <Text style={st.label}>{priceLabel}</Text>
                <View style={st.priceRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={c.textSecondary}
                  />
                  <Text style={st.unit}>{tr('ج.م', 'EGP')}</Text>
                </View>

                <Text style={st.label}>{tr('المدة التقريبية', 'Approximate duration')}</Text>
                <View style={s.chips}>
                  {DURS.map((d) => (
                    <Chip key={d} on={d === dur} label={durOf(d)} onPress={() => setDur(d)} />
                  ))}
                </View>
              </View>

              <View style={s.panel}>
                <Text style={st.label}>{tr('وصف الخدمة (اختياري)', 'Description (optional)')}</Text>
                <TextInput
                  style={[s.input, st.area]}
                  value={desc}
                  onChangeText={setDesc}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  placeholder={tr('مثلًا: تنظيف بالبخار، والخامات علينا', 'e.g. Steam cleaning, materials included')}
                  placeholderTextColor={c.textSecondary}
                />
              </View>

              {err ? <Text style={s.err}>{err}</Text> : null}
              <Btn
                title={orig ? tr('حفظ وإرسال للمراجعة', 'Save and send for review') : tr('إرسال للمراجعة', 'Send for review')}
                icon="paper-plane-outline"
                busy={busy}
                onPress={submit}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    body: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 18, gap: 4 },
    label: { fontFamily: fonts.bold, fontSize: 14, color: c.text, marginTop: 6 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    unit: { fontFamily: fonts.semibold, fontSize: 14, color: c.textSecondary },
    area: { minHeight: 96, paddingTop: 12 },
  });
