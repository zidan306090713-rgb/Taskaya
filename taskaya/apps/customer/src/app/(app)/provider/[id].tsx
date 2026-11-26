import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

/** صفحة مقدم الخدمة: غلاف بعرض الشاشة + كارت بيانات + الخدمات + شريط "احجز الآن" ثابت */
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
  const backBtn = (
    <Pressable onPress={back} style={[styles.float, { top: insets.top + 10 }, isRTL ? { right: 14 } : { left: 14 }]} accessibilityLabel={tr('رجوع', 'Back')}>
      <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#0B1F3A" />
    </Pressable>
  );

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
        <View style={[styles.cover, { height: 230 + insets.top }]}>
          {coverUri ? (
            <>
              <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={24} />
              <Image source={{ uri: coverUri }} style={[StyleSheet.absoluteFill, { top: insets.top }]} contentFit="contain" transition={200} />
            </>
          ) : (
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={['rgba(5,12,32,0.35)', 'rgba(5,12,32,0)', 'rgba(5,12,32,0.45)']} locations={[0, 0.4, 1]} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} />
        </View>

        <Animated.View style={[styles.inner, bodyAnim]}>
          {/* ===== كارت البيانات + اللوجو الراكب ===== */}
          <View style={styles.who}>
            <View style={styles.logo}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.center]}>
                  <Text style={styles.logoText}>{p.business_name.charAt(0)}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{p.business_name}</Text>
              {p.is_verified ? <Ionicons name="checkmark-circle" size={20} color={c.accentText} /> : null}
            </View>
            <View style={styles.pills}>
              <View style={[styles.pill, styles.pillStar]}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={[styles.pillText, { color: '#B45309' }]}>
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
                <View style={[styles.pill, { backgroundColor: '#64748B' }]}>
                  <Ionicons name="moon" size={13} color="#FFFFFF" />
                  <Text style={[styles.pillText, { color: '#FFFFFF' }]}>{tr('مش متاح حاليًا', 'Unavailable now')}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ===== الوصف ===== */}
          {p.description ? <Text style={styles.desc}>{p.description}</Text> : null}

          {/* ===== الخدمات ===== */}
          <View style={styles.secRow}>
            <LinearGradient colors={c.gradient} style={styles.secBar} />
            <Text style={styles.sec}>{tr('الخدمات', 'Services')}</Text>
          </View>
          {services ? (
            services.map((s) => {
              const on = sel === s.id;
              const meta = [PRICING[s.pricing_model] ? (lang === 'ar' ? PRICING[s.pricing_model].ar : PRICING[s.pricing_model].en) : null, duration(s.estimated_duration_minutes)]
                .filter(Boolean)
                .join(' · ');
              return (
                <Pressable key={s.id} onPress={() => setSel(s.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                  <View style={[styles.svc, on && styles.svcOn]}>
                    <View style={[styles.radio, on && styles.radioOn]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.svcName} numberOfLines={2}>{svcName(s)}</Text>
                      {meta ? <Text style={styles.svcMeta}>{meta}</Text> : null}
                    </View>
                    <Text style={styles.svcPrice}>{priceOf(s)}</Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <ListSkeleton rows={2} height={64} />
          )}
        </Animated.View>
      </ScrollView>

      {backBtn}
      <Pressable style={[styles.float, { top: insets.top + 10 }, isRTL ? { left: 14 } : { right: 14 }]} accessibilityLabel={tr('المفضلة', 'Favorite')}>
        <Ionicons name="heart-outline" size={20} color="#0B1F3A" />
      </Pressable>

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
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.88)',
      zIndex: 5,
    },
    inner: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 14 },
    who: {
      marginTop: -36,
      paddingTop: 46,
      paddingBottom: 16,
      paddingHorizontal: 16,
      borderRadius: 24,
      alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.22 : 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    logo: {
      position: 'absolute',
      top: -34,
      width: 68,
      height: 68,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: c.card,
      borderWidth: 3,
      borderColor: c.card,
      alignSelf: 'center',
    },
    logoText: { fontFamily: fonts.bold, fontSize: 28, color: '#FFFFFF' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { fontFamily: fonts.bold, fontSize: 20, color: c.text, textAlign: 'center' },
    pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: c.accentSoft },
    pillStar: { backgroundColor: 'rgba(245,158,11,0.12)' },
    pillText: { fontFamily: fonts.semibold, fontSize: 12.5, color: c.accentText },
    desc: {
      marginTop: 12,
      padding: 14,
      borderRadius: 18,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 22,
      color: c.textSecondary,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
      overflow: 'hidden',
    },
    secRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20, marginBottom: 10 },
    secBar: { width: 5, height: 20, borderRadius: 3 },
    sec: { fontFamily: fonts.bold, fontSize: 17, color: c.text },
    svc: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      marginBottom: 10,
      borderRadius: 18,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    svcOn: { borderWidth: 1.5, borderColor: c.accent, backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : '#F5F8FF' },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.iconMuted },
    radioOn: { borderWidth: 6, borderColor: c.accent },
    svcName: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
    svcMeta: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary, marginTop: 2 },
    svcPrice: { fontFamily: fonts.bold, fontSize: 15, color: c.accentText },
  });
