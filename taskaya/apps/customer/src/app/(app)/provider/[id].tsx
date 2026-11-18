import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { lang, tr } from '@/i18n';
import { getProvider } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, spacing } from '@/theme';

type Svc = { id: string; pricing_model: string; base_price: number | null; services: { name_ar: string; name_en: string } };

function useEntrance(delay: number) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 650, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
  };
}

export default function ProviderScreen() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof getProvider>> | null>(null);
  const [sel, setSel] = useState<string | undefined>();
  const router = useRouter();

  const heroAnim = useEntrance(0);
  const bodyAnim = useEntrance(150);

  useEffect(() => {
    getProvider(id).then((d) => {
      setData(d);
      setSel((d.services as unknown as Svc[])[0]?.id);
    });
  }, [id]);
  const p = data?.profile;
  if (!p) return <Screen><Text style={styles.muted}>...</Text></Screen>;

  const priceLabel = (s: Svc) =>
    s.pricing_model === 'custom_quote'
      ? tr('حسب العرض', 'Custom quote')
      : `${s.pricing_model === 'starting_from' ? tr('يبدأ من', 'From') + ' ' : ''}${s.base_price} ${tr('ج.م', 'EGP')}`;

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
      <Screen>
        {/* ===== Hero ===== */}
        <Animated.View style={heroAnim}>
          <View style={[styles.hero, webGlass]}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
            <View style={styles.heroBody}>
              <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                <Text style={styles.avatarText}>{p.business_name.charAt(0)}</Text>
              </LinearGradient>
              <View style={styles.row}>
                <Text style={styles.name}>{p.business_name}</Text>
                {p.is_verified ? <Ionicons name="checkmark-circle" size={22} color={c.accentText} /> : null}
              </View>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={15} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {p.rating_avg.toFixed(1)} ({p.rating_count} {tr('تقييم', 'reviews')})
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
          {(data!.services as unknown as Svc[]).map((s) => {
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
          })}

          <View style={{ height: spacing.lg }} />
          <Button title={tr('احجز الآن', 'Book now')} onPress={() => sel && router.push(`/booking/${sel}`)} />
        </Animated.View>
      </Screen>
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hero: {
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: c.panelBg,
      borderWidth: 1,
      borderColor: c.panelBorder,
      shadowColor: c.accent,
      shadowOpacity: c.isDark ? 0.28 : 0.2,
      shadowRadius: 36,
      shadowOffset: { width: 0, height: 18 },
      elevation: 8,
    },
    accent: { height: 4 },
    heroBody: { alignItems: 'center', gap: 12, paddingVertical: 28, paddingHorizontal: spacing.lg },
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
