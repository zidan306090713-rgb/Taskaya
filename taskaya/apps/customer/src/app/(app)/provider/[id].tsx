import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton, PageSkeleton } from '@/components/ui/Skeleton';
import { useEntrance, useFocusHide } from '@/hooks/use-screen-entrance';
import { lang, tr } from '@/i18n';
import { getProvider, peekProvider, ProviderSvc, seedProviderService } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, spacing } from '@/theme';

export default function ProviderScreen() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const uid = session?.user.id;
  const router = useRouter();

  // لو الكارت اتلمس قبل كده: الاسم والتقييم (أو الصفحة كلها) جاهزين فورًا
  const [data, setData] = useState(() => peekProvider(id));
  const [sel, setSel] = useState<string | undefined>(() => peekProvider(id)?.services?.[0]?.id);
  const [failed, setFailed] = useState(false);

  const heroAnim = useEntrance(0);
  const bodyAnim = useEntrance(80);
  // الشاشة شفافة: نخفيها أول ما صفحة الحجز تفتح فوقها عشان متبانش وراها
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

  const p = data?.profile;
  if (!p) {
    return (
      <Screen padTop={0}>
        <View style={styles.loading}>
          {failed ? (
            <Text style={styles.muted}>{tr('تعذّر التحميل، حاول تاني', 'Could not load, please try again')}</Text>
          ) : (
            <PageSkeleton />
          )}
        </View>
      </Screen>
    );
  }
  const services = data?.services ?? null;
  // نفس الصورة اللي بتظهر في كارت الرئيسية
  const coverUri = p.cover_url ?? p.logo_url ?? null;

  const priceLabel = (s: ProviderSvc) =>
    s.pricing_model === 'custom_quote'
      ? tr('حسب العرض', 'Custom quote')
      : `${s.pricing_model === 'starting_from' ? tr('يبدأ من', 'From') + ' ' : ''}${s.base_price} ${tr('ج.م', 'EGP')}`;

  const book = () => {
    const s = services?.find((x) => x.id === sel);
    if (!s) return;
    // صفحة الحجز تفتح فورًا ببيانات الخدمة اللي معانا
    seedProviderService({
      id: s.id,
      provider_id: p.id,
      pricing_model: s.pricing_model,
      base_price: s.base_price,
      estimated_duration_minutes: s.estimated_duration_minutes,
      provider_profiles: { business_name: p.business_name },
      services: s.services,
    });
    router.push(`/booking/${s.id}`);
  };

  const webGlass =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px) saturate(160%)', WebkitBackdropFilter: 'blur(8px) saturate(160%)' } as any)
      : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: p.business_name,
          headerTitleStyle: { fontFamily: fonts.bold, color: c.text },
          headerTransparent: false,
          headerStyle: { backgroundColor: c.headerBg },
          headerShadowVisible: false,
          headerTintColor: c.accentText,
        }}
      />
      <View style={[styles.fill, hide]}>
        <Screen padTop={0}>
          {/* ===== Hero ===== */}
          <Animated.View style={heroAnim}>
            <View style={[styles.hero, webGlass]}>
              <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
              {coverUri ? (
                <View style={styles.cover}><Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={24} /><Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="contain" transition={200} /></View>
              ) : null}
              <View style={[styles.heroBody, coverUri ? styles.heroBodyWithCover : null]}>
                {coverUri ? null : (
                  <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                    <Text style={styles.avatarText}>{p.business_name.charAt(0)}</Text>
                  </LinearGradient>
                )}
                <View style={styles.row}>
                  <Text style={styles.name}>{p.business_name}</Text>
                  {p.is_verified ? <Ionicons name="checkmark-circle" size={22} color={c.accentText} /> : null}
                </View>
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={15} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {Number(p.rating_avg).toFixed(1)} ({p.rating_count} {tr('تقييم', 'reviews')})
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={bodyAnim}>
            {/* ===== Description ===== */}
            {p.description ? (
              <View style={styles.descCard}>
                <Ionicons name="chatbox-ellipses-outline" size={20} color={c.accentText} />
                <Text style={styles.desc}>{p.description}</Text>
              </View>
            ) : null}

            {/* ===== Services ===== */}
            <View style={styles.sectionRow}>
              <LinearGradient colors={c.gradient} style={styles.sectionBar} />
              <Text style={styles.section}>{tr('الخدمات', 'Services')}</Text>
            </View>
            {services ? (
              services.map((s) => {
                const on = sel === s.id;
                return (
                  <Pressable key={s.id} onPress={() => setSel(s.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <View style={[styles.svc, on && styles.svcOn]}>
                      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? c.accentText : c.iconMuted} />
                      <Text style={styles.svcName} numberOfLines={2}>{lang === 'ar' ? s.services.name_ar : s.services.name_en}</Text>
                      <Text style={styles.svcPrice}>{priceLabel(s)}</Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <ListSkeleton rows={3} />
            )}

            <View style={{ height: spacing.lg }} />
            <Button title={tr('احجز الآن', 'Book now')} onPress={book} />
          </Animated.View>
        </Screen>
      </View>
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1 },
    loading: { paddingVertical: 8, alignItems: 'center' },
    hero: {
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: c.panelBg,
      borderWidth: 1,
      borderColor: c.panelBorder,
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.28 : 0.2,
      shadowRadius: 36,
      shadowOffset: { width: 0, height: 18 },
      elevation: 0,
    },
    accent: { height: 4 },
    cover: { width: '100%', aspectRatio: 16 / 10, overflow: 'hidden', backgroundColor: c.accentSoft },
    heroBody: { alignItems: 'center', gap: 12, paddingVertical: 28, paddingHorizontal: spacing.lg },
    heroBodyWithCover: { paddingVertical: 18 },
    avatar: {
      width: 92,
      height: 92,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.6)',
      shadowColor: c.accent,
      shadowOpacity: 0.5,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    avatarText: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 56, color: '#FFFFFF' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { fontFamily: fonts.bold, fontSize: 22, color: c.text, textAlign: 'center' },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(245,158,11,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245,158,11,0.35)',
    },
    ratingText: { fontFamily: fonts.semibold, color: c.ink, fontSize: 13 },
    muted: { fontFamily: fonts.regular, color: c.textSecondary },

    descCard: {
      flexDirection: 'row',
      gap: 12,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: 18,
      backgroundColor: c.chipBg,
      borderWidth: 1.5,
      borderColor: c.accentBorder,
    },
    desc: { flex: 1, fontFamily: fonts.regular, color: c.ink, lineHeight: 24 },

    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.lg, marginBottom: spacing.md },
    sectionBar: { width: 5, height: 22, borderRadius: 3 },
    section: { fontFamily: fonts.bold, fontSize: 18, color: c.text },

    svc: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.chipBg,
      borderWidth: 1.5,
      borderColor: c.accentBorder,
      borderRadius: 16,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    svcOn: {
      backgroundColor: c.fieldBgFocus,
      borderColor: c.accent,
      shadowColor: c.accent,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    svcName: { flex: 1, fontFamily: fonts.semibold, color: c.ink },
    svcPrice: { fontFamily: fonts.bold, color: c.accentText },
  });
