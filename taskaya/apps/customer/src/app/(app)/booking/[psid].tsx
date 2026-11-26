import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chips } from '@/components/ui/Chips';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { StickyBar } from '@/components/ui/StickyBar';
import { isRTL, lang, tr } from '@/i18n';
import {
  Address, Area, forgetProvider, getAreas, getMyAddresses, getProviderService, invalidateAddresses, invalidateBookings,
  isOpen, peekAddresses, peekAreas, peekProviderService, ServiceOption,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

const SLOTS = [9, 11, 13, 15, 17, 19];
const locale = () => (lang === 'ar' ? 'ar-EG' : 'en-US');

/** صفحة الحجز: ملخص ثابت + الأيام في سطر + الأوقات + العنوان + التفاصيل + شريط "تأكيد الحجز" */
export default function Booking() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { psid } = useLocalSearchParams<{ psid: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';

  const [svc, setSvc] = useState<ServiceOption | null>(() => peekProviderService(psid));
  const [addresses, setAddresses] = useState<Address[]>(() => peekAddresses(uid) ?? []);
  const [areas, setAreas] = useState<Area[]>(() => peekAreas() ?? []);
  const [addrId, setAddrId] = useState<string | undefined>(() => {
    const a = peekAddresses(uid);
    return a ? a[0]?.id ?? 'new' : undefined;
  });
  const [areaId, setAreaId] = useState<string | null>(null);
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [details, setDetails] = useState('');
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const key = useRef<string | null>(null);

  useEffect(() => {
    getProviderService(psid).then(setSvc);
    getAreas().then(setAreas);
    getMyAddresses(uid).then((a) => {
      setAddresses(a);
      setAddrId((cur) => cur ?? a[0]?.id ?? 'new');
    });
  }, [psid, uid]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        return d;
      }),
    [],
  );
  const isPast = (h: number) => dayIdx === 0 && h <= new Date().getHours();
  const weekday = (d: Date, i: number) =>
    i === 0 ? tr('النهارده', 'Today') : i === 1 ? tr('بكرة', 'Tomorrow') : d.toLocaleDateString(locale(), { weekday: 'short' });
  const dayNum = (d: Date) => d.toLocaleDateString(locale(), { day: 'numeric' });
  const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });

  if (!svc) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <GradientHeader title={tr('احجز خدمتك', 'Book a service')} />
        <View style={{ padding: 16 }}>
          <PageSkeleton />
        </View>
      </View>
    );
  }

  const svcName = lang === 'ar' ? svc.services.name_ar : svc.services.name_en;
  const priceText =
    svc.pricing_model === 'custom_quote'
      ? tr('حسب العرض', 'Custom quote')
      : `${svc.pricing_model === 'starting_from' ? tr('يبدأ من', 'From') + ' ' : ''}${svc.base_price} ${tr('ج.م', 'EGP')}`;
  const note =
    svc.pricing_model === 'fixed'
      ? tr('سعر ثابت', 'Fixed price')
      : svc.pricing_model === 'starting_from'
      ? tr('السعر النهائي بعد المعاينة', 'Final after inspection')
      : tr('هيوصلك عرض سعر توافق عليه', "You'll approve a quote");
  const addrDone = addrId !== undefined && (addrId !== 'new' || (!!areaId && !!street.trim()));
  const step = 1 + (hour !== undefined ? 1 : 0) + (hour !== undefined && addrDone ? 1 : 0);

  const open = isOpen(svc.provider_profiles);
  const closedMsg = tr('مقدم الخدمة مش متاح حاليًا، جرّب مقدم تاني أو ارجع بعدين', 'This provider is unavailable right now. Try another provider or come back later.');

  const submit = async () => {
    setError('');
    if (!open) return setError(closedMsg);
    key.current ??= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (hour === undefined) return setError(tr('اختر الموعد المناسب', 'Pick a time slot'));
    if (addrId === 'new' && (!areaId || !street.trim())) return setError(tr('أكمل بيانات العنوان', 'Complete the address'));
    setLoading(true);

    let address_id = addrId;
    if (addrId === 'new') {
      const { data, error: addrErr } = await supabase
        .from('addresses')
        .insert({ customer_id: uid, label: tr('عنوان', 'Address'), area_id: areaId, street: street.trim(), building: building.trim() || null })
        .select('id')
        .single();
      if (addrErr || !data) {
        setLoading(false);
        return setError(addrErr?.message ?? 'Error');
      }
      address_id = data.id;
      invalidateAddresses(uid);
      setAddrId(data.id);
      setAddresses((a) => [{ id: data.id, label: null, street: street.trim(), building: building.trim() || null, area_id: areaId ?? null }, ...a]);
    }

    const when = new Date(days[dayIdx]);
    when.setHours(hour, 0, 0, 0);
    const { error: bookErr } = await supabase.from('bookings').insert({
      customer_id: uid,
      provider_service_id: psid,
      address_id,
      details: details.trim() || null,
      scheduled_at: when.toISOString(),
      idempotency_key: key.current,
    });
    setLoading(false);
    if (bookErr?.hint === 'PROVIDER_UNAVAILABLE') {
      // السيرفر رفض: المقدم قفل استقبال الطلبات — نحدّث بياناته عشان الصفحة تبان مقفولة
      forgetProvider(svc.provider_id, psid);
      getProviderService(psid).then(setSvc).catch(() => {});
      return setError(closedMsg);
    }
    if (bookErr && bookErr.code !== '23505') return setError(bookErr.message);
    invalidateBookings();
    router.dismissTo('/orders');
  };

  const Sec = ({ children }: { children: string }) => (
    <View style={styles.secRow}>
      <LinearGradient colors={c.gradient} style={styles.secBar} />
      <Text style={styles.sec}>{children}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <GradientHeader title={tr('احجز خدمتك', 'Book a service')} padBottom={54}>
        <View style={styles.steps}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.step, i <= step && styles.stepOn]} />
          ))}
        </View>
      </GradientHeader>

      <View style={styles.inner}>
        {/* ===== الملخص (ثابت) ===== */}
        <View style={styles.summary}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sumIcon}>
            <Ionicons name="construct" size={22} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.sumName} numberOfLines={1}>{svcName}</Text>
            <Text style={styles.sumSub} numberOfLines={1}>{svc.provider_profiles.business_name}</Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
            <Text style={styles.sumPrice}>{priceText}</Text>
            <Text style={styles.sumNote}>{note}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 130 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ===== اليوم ===== */}
        <Sec>{tr('اليوم', 'Day')}</Sec>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {days.map((d, i) => {
            const on = dayIdx === i;
            return (
              <Pressable key={i} onPress={() => { setDayIdx(i); setHour(undefined); }} style={[styles.day, on && styles.dayOn]}>
                <Text style={[styles.dayName, on && styles.onText]} numberOfLines={1}>{weekday(d, i)}</Text>
                <Text style={[styles.dayNum, on && styles.onText]}>{dayNum(d)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ===== الوقت ===== */}
        <Sec>{tr('الوقت', 'Time')}</Sec>
        <View style={styles.times}>
          {SLOTS.map((h) => {
            const past = isPast(h);
            const on = hour === h;
            return (
              <Pressable key={h} disabled={past} onPress={() => setHour(h)} style={[styles.time, on && styles.timeOn, past && { opacity: 0.4 }]}>
                <Text style={[styles.timeText, on && { color: c.accentText, fontFamily: fonts.bold }, past && { textDecorationLine: 'line-through' }]}>{hourLabel(h)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ===== العنوان ===== */}
        <Sec>{tr('العنوان', 'Address')}</Sec>
        {addresses.map((a) => {
          const on = addrId === a.id;
          return (
            <Pressable key={a.id} onPress={() => setAddrId(a.id)} style={[styles.addr, on && styles.addrOn]}>
              <Ionicons name="home-outline" size={18} color={c.accentText} />
              <Text style={styles.addrText} numberOfLines={1}>{[a.street, a.building].filter(Boolean).join(' · ') || a.label || '-'}</Text>
              <View style={[styles.radio, on && styles.radioOn]} />
            </Pressable>
          );
        })}
        <Pressable onPress={() => setAddrId('new')} style={[styles.newAddr, addrId === 'new' && styles.newAddrOn]}>
          <Ionicons name="add" size={18} color={c.accentText} />
          <Text style={styles.newText}>{tr('عنوان جديد', 'New address')}</Text>
        </Pressable>
        {addrId === 'new' ? (
          <View style={styles.newForm}>
            <Text style={styles.label}>{tr('المنطقة', 'Area')}</Text>
            <Chips items={areas.map((a) => ({ key: a.id, label: lang === 'ar' ? a.name_ar : a.name_en }))} value={areaId} onChange={setAreaId} />
            <View style={{ height: 10 }} />
            <PremiumInput icon="trail-sign-outline" label={tr('الشارع', 'Street')} value={street} onChangeText={setStreet} />
            <PremiumInput icon="business-outline" label={tr('العمارة / الشقة', 'Building / Apartment')} value={building} onChangeText={setBuilding} />
          </View>
        ) : null}

        {/* ===== التفاصيل ===== */}
        <Sec>{tr('تفاصيل الطلب', 'Request details')}</Sec>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          placeholder={tr('اكتب أي تفاصيل تساعد مقدم الخدمة...', 'Add any details for the provider...')}
          placeholderTextColor={c.placeholder}
          selectionColor={c.accent}
          style={[styles.textarea, { textAlign: isRTL ? 'right' : 'left' }, Platform.OS === 'web' ? ({ direction: isRTL ? 'rtl' : 'ltr' } as any) : null]}
        />

        {error ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={18} color={c.dangerText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <StickyBar
        label={hour !== undefined ? `${weekday(days[dayIdx], dayIdx)} ${dayNum(days[dayIdx])} · ${hourLabel(hour)}` : tr('اختار اليوم والوقت', 'Pick a day and time')}
        value={priceText}
        title={open ? tr('تأكيد الحجز', 'Confirm booking') : tr('مش متاح حاليًا', 'Unavailable')}
        onPress={() => void submit()}
        busy={loading}
        disabled={!open}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    inner: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16 },
    steps: { flexDirection: 'row', gap: 6, marginTop: 14 },
    step: { flex: 1, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)' },
    stepOn: { backgroundColor: '#FFFFFF' },
    summary: {
      marginTop: -36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
      shadowColor: c.accent,
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    sumIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    sumName: { fontFamily: fonts.bold, fontSize: 16, color: c.text },
    sumSub: { fontFamily: fonts.regular, fontSize: 12.5, color: c.textSecondary },
    sumPrice: { fontFamily: fonts.bold, fontSize: 15, color: c.accentText },
    sumNote: { fontFamily: fonts.regular, fontSize: 11, color: c.textSecondary },
    secRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20, marginBottom: 10 },
    secBar: { width: 5, height: 20, borderRadius: 3 },
    sec: { fontFamily: fonts.bold, fontSize: 16, color: c.text },
    days: { gap: 8, paddingVertical: 2 },
    day: { width: 70, paddingVertical: 10, borderRadius: 16, alignItems: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.accentBorder },
    dayOn: { backgroundColor: c.accent, borderColor: c.accent },
    dayName: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
    dayNum: { fontFamily: fonts.bold, fontSize: 20, color: c.text, marginTop: 2 },
    onText: { color: '#FFFFFF' },
    times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    time: { width: '31.5%', paddingVertical: 11, borderRadius: 14, alignItems: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.accentBorder },
    timeOn: { borderWidth: 1.5, borderColor: c.accent, backgroundColor: c.accentSoft },
    timeText: { fontFamily: fonts.semibold, fontSize: 13.5, color: c.text },
    addr: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 13,
      marginBottom: 8,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    addrOn: { borderWidth: 1.5, borderColor: c.accent, backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : '#F5F8FF' },
    addrText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: c.text },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: c.iconMuted },
    radioOn: { borderWidth: 5, borderColor: c.accent },
    newAddr: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.accentBorder,
    },
    newAddrOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
    newText: { fontFamily: fonts.semibold, fontSize: 14, color: c.accentText },
    newForm: { marginTop: 10 },
    label: { fontFamily: fonts.semibold, fontSize: 13.5, color: c.text },
    textarea: {
      minHeight: 100,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.card,
      padding: 14,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: c.ink,
      textAlignVertical: 'top',
    },
    error: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: c.dangerBg, borderWidth: 1, borderColor: c.dangerBorder },
    errorText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: c.dangerText },
  });
