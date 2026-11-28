import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListSkeleton, PageSkeleton } from '@/components/ui/Skeleton';
import { StickyBar } from '@/components/ui/StickyBar';
import { useEntrance, useFocusHide } from '@/hooks/use-screen-entrance';
import { isRTL, lang, tr } from '@/i18n';
import { getProvider, isOpen, peekProvider, ProviderSvc, seedProviderService } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

const PRICING: Record<string, { ar: string; en: string }> = {
  fixed: { ar: 'سعر ثابت', en: 'Fixed price' },
  starting_from: { ar: 'يبدأ من', en: 'Starting from' },
  custom_quote: { ar: 'بعرض سعر', en: 'By quote' },
};
const duration = (m: number | null | undefined) => {
  if (!m) return null;
  if (m < 60) return tr(`حوالي ${m} دقيقة`, `~${m} min`);
  const h = Math.round((m / 60) * 10) / 10;
  return tr(`حوالي ${h} ساعة`, `~${h} h`);
};

const WEB_GLASS =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)', transition: 'border-color .2s ease, background-color .2s ease' } as any)
    : null;
const WEB_BTN = Platform.OS === 'web' ? ({ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } as any) : null;

/** كارت زجاجي بنفس قيم ProviderRow (طبقة الـ blur مقصوصة لوحدها عشان اللوجو يقدر يطلع برّه الكارت) */
function Glass({ style, radius = 18, children }: { style?: StyleProp<ViewStyle>; radius?: number; children?: ReactNode }) {
  const { c } = useTheme();
  const sheen = c.isDark ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] as const) : (['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)'] as const);
  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          backgroundColor: c.isDark ? 'rgba(30,36,52,0.55)' : Platform.OS === 'android' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)',
          borderColor: c.isDark ? 'rgba(255,255,255,0.12)' : Platform.OS === 'android' ? c.accentBorder : 'rgba(255,255,255,0.9)',
        },
        WEB_GLASS,
        style,
      ]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', pointerEvents: 'none' }]}>
        {Platform.OS === 'ios' ? <BlurView intensity={28} tint={c.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={sheen} style={{ height: '55%' }} />
      </View>
      {children}
    </View>
  );
}

/** صفحة مقدم الخدمة: غلاف + كارت زجاجي + الخدمات + شريط "احجز الآن" ثابت */
export default function ProviderScreen() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const uid = session?.user.id;
  const router = useRouter();

  // لو الكارت اتلمس قبل كده: الصفحة جاهزة فورًا
  const [data, setData] = useState(() => peekProvider(id));
  const [sel, setSel] = useState<string | undefined>(() => peekProvider(id)?.services?.[0]?.id);
  const [failed, setFailed] = useState(false);
  const bodyAnim = useEntrance(60);
  const hide = useFocusHide();

  useEffect(() => {
    let alive = true;
    getProvider(id)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setSel((s) => s ?? d.services[0]?.id);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [id, uid]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const floatBtn = (side: 'start' | 'end', icon: keyof typeof Ionicons.glyphMap, label: string, onPress?: () => void) => {
    const atRight = side === 'start' ? isRTL : !isRTL;
    return (
      <Pressable onPress={onPress} style={[styles.float, WEB_BTN, { top: insets.top + 10 }, atRight ? { right: 14 } : { left: 14 }]} accessibilityLabel={label}>
        {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </Pressable>
    );
  };
  const backBtn = floatBtn('start', isRTL ? 'arrow-forward' : 'arrow-back', tr('رجوع', 'Back'), back);

  const p = data?.profile;
  if (!p) {
    return (
      <View style={[{ flex: 1, paddingTop: insets.top + 70, paddingHorizontal: 16 }, hide]}>
        <Stack.Screen options={{ headerShown: false }} />
        {backBtn}
        {failed ? <Text style={styles.muted}>{tr('تعذّر التحميل، حاول تاني', 'Could not load, please try again')}</Text> : <PageSkeleton />}
      </View>
    );
  }

  const services = data?.services ?? null;
  const coverUri = p.cover_url ?? null;
  const logoUri = p.logo_url ?? null;
  const svcName = (s: ProviderSvc) => (lang === 'ar' ? s.services.name_ar : s.services.name_en);
  const priceOf = (s: ProviderSvc) => (s.pricing_model === 'custom_quote' ? tr('حسب العرض', 'Custom quote') : `${s.base_price} ${tr('ج.م', 'EGP')}`);
  const chosen = services?.find((x) => x.id === sel) ?? null;
  const open = isOpen(p);

  const book = () => {
    if (!chosen || !open) return;
    seedProviderService({
      id: chosen.id,
      provider_id: p.id,
      pricing_model: chosen.pricing_model,
      base_price: chosen.base_price,
      estimated_duration_minutes: chosen.estimated_duration_minutes,
      provider_profiles: { business_name: p.business_name, is_available: p.is_available, away_until: p.away_until ?? null },
      services: chosen.services,
    });
    router.push(`/booking/${chosen.id}`);
  };

  return (
    <View style={[{ flex: 1 }, hide]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* ===== الغلاف (كامل من غير قص + نسخة مغبّشة وراه) ===== */}
        <View style={[styles.cover, { height: 270 + insets.top }]}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={200} />
          ) : (
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={['rgba(5,12,32,0.4)', 'rgba(5,12,32,0)', 'rgba(5,12,32,0.75)']} locations={[0, 0.35, 1]} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} />
        </View>

        <Animated.View style={[styles.inner, bodyAnim]}>
          {/* ===== كارت البيانات الزجاجي + اللوجو في حلقة بيضا ===== */}
          <Glass radius={24} style={styles.who}>
            <View style={styles.logoRing}>
              <View style={styles.logo}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.center]}>
                    <Text style={styles.logoText}>{p.business_name.charAt(0)}</Text>
                  </LinearGradient>
                )}
              </View>
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{p.business_name}</Text>
              {p.is_verified ? <Ionicons name="checkmark-circle" size={20} color={c.accentText} /> : null}
            </View>
            {p.owner_name && p.owner_name.trim() !== p.business_name.trim() ? (
              <View style={styles.ownerRow}>
                <Ionicons name="person-circle-outline" size={16} color={c.textSecondary} />
                <Text style={styles.owner}>{p.owner_name}</Text>
              </View>
            ) : null}
            {p.description ? <Text style={styles.desc}>{p.description}</Text> : null}
            <View style={styles.pills}>
              <View style={[styles.pill, styles.pillStar]}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={[styles.pillText, { color: c.isDark ? '#FBBF24' : '#B45309' }]}>
                  {Number(p.rating_avg).toFixed(1)} · {p.rating_count} {tr('تقييم', 'reviews')}
                </Text>
              </View>
              {p.is_verified ? (
                <View style={styles.pill}>
                  <Ionicons name="shield-checkmark" size={13} color={c.accentText} />
                  <Text style={styles.pillText}>{tr('موثّق', 'Verified')}</Text>
                </View>
              ) : null}
              {!open ? (
                <View style={[styles.pill, { backgroundColor: '#64748B', borderColor: '#64748B' }]}>
                  <Ionicons name="moon" size={13} color="#FFFFFF" />
                  <Text style={[styles.pillText, { color: '#FFFFFF' }]}>{tr('مش متاح حاليًا', 'Unavailable now')}</Text>
                </View>
              ) : null}
            </View>
          </Glass>

          <View style={{ height: 18 }} />
          {services ? (
            services.map((s) => {
              const on = sel === s.id;
              const meta = [PRICING[s.pricing_model] ? (lang === 'ar' ? PRICING[s.pricing_model].ar : PRICING[s.pricing_model].en) : null, duration(s.estimated_duration_minutes)]
                .filter(Boolean)
                .join(' · ');
              return (
                <Pressable key={s.id} style={[{ borderRadius: 24 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} style={{ borderRadius: 24 }} onPress={() => setSel(s.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                  <Glass radius={24} style={[styles.svc, on && styles.svcOn]}>
                    <View style={[styles.radio, on && styles.radioOn]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.svcName} numberOfLines={2}>{svcName(s)}</Text>
                      {meta ? <Text style={styles.svcMeta}>{meta}</Text> : null}
                    </View>
                    <Text style={styles.svcPrice}>{priceOf(s)}</Text>
                  </Glass>
                </Pressable>
              );
            })
          ) : (
            <ListSkeleton rows={2} height={64} />
          )}
        </Animated.View>
      </ScrollView>

      {backBtn}
      {floatBtn('end', 'heart-outline', tr('المفضلة', 'Favorite'))}

      <StickyBar
        label={!open ? tr('مقدم الخدمة مش متاح حاليًا', 'This provider is unavailable now') : chosen ? svcName(chosen) : tr('اختار خدمة', 'Pick a service')}
        value={open && chosen ? priceOf(chosen) : null}
        title={open ? tr('احجز الآن', 'Book now') : tr('مش متاح حاليًا', 'Unavailable')}
        onPress={book}
        disabled={!chosen || !open}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    muted: { fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center' },
    center: { alignItems: 'center', justifyContent: 'center' },
    cover: { width: '100%', overflow: 'hidden', backgroundColor: c.accentSoft },
    float: {
      position: 'absolute',
      width: 42,
      height: 42,
      borderRadius: 14,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Platform.OS === 'ios' ? 'rgba(11,27,63,0.18)' : 'rgba(11,27,63,0.38)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.45)',
      zIndex: 5,
    },
    inner: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 14 },
    who: { marginTop: -36, paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16, alignItems: 'center' },
    logoRing: {
      position: 'absolute',
      top: -36,
      alignSelf: 'center',
      padding: 3,
      borderRadius: 23,
      backgroundColor: c.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.92)',
    },
    logo: { width: 64, height: 64, borderRadius: 20, overflow: 'hidden' },
    logoText: { fontFamily: fonts.bold, fontSize: 28, color: '#FFFFFF' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    owner: { fontFamily: fonts.semibold, fontSize: 13.5, color: c.textSecondary },
    name: { fontFamily: fonts.bold, fontSize: 20, color: c.text, textAlign: 'center' },
    pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
    },
    pillStar: { backgroundColor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.32)' },
    pillText: { fontFamily: fonts.semibold, fontSize: 12.5, color: c.accentText },
    desc: { marginTop: 6, maxWidth: 520, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 21, color: c.textSecondary, textAlign: 'center' },
    secRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20, marginBottom: 10 },
    secBar: { width: 5, height: 20, borderRadius: 3 },
    sec: { fontFamily: fonts.bold, fontSize: 17, color: c.text },
    svc: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 12 },
    svcOn: {
      borderWidth: 1.5,
      borderColor: c.accent,
      backgroundColor: c.isDark ? 'rgba(255,255,255,0.1)' : Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
      shadowColor: c.accent,
      shadowOpacity: c.isDark ? 0.35 : 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.iconMuted },
    radioOn: { borderWidth: 6, borderColor: c.accent },
    svcName: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
    svcMeta: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary, marginTop: 2 },
    svcPrice: { fontFamily: fonts.bold, fontSize: 15, color: c.accentText },
  });
