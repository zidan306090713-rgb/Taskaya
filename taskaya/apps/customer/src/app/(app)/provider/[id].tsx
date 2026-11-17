import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { lang, tr } from '@/i18n';
import { getProvider } from '@/lib/api';
import { colors, fonts, spacing } from '@/theme';

const BLUE = '#2F80ED';

type Svc = { id: string; pricing_model: string; base_price: number | null; services: { name_ar: string; name_en: string } };

export default function ProviderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof getProvider>> | null>(null);

  const [sel, setSel] = useState<string | undefined>();
  const router = useRouter();

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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: p.business_name,
          headerTitleStyle: { fontFamily: fonts.bold, color: colors.text },
          headerTransparent: false,
          headerStyle: { backgroundColor: '#E3EDFB' },
          headerShadowVisible: false,
          headerTintColor: BLUE,
        }}
      />
      <Screen>
        <GlassCard navy radiusSize={24} style={styles.hero}>
          <LinearGradient colors={['#4AA3FF', '#1D6FE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>{p.business_name.charAt(0)}</Text>
          </LinearGradient>
          <View style={styles.row}>
            <Text style={styles.name}>{p.business_name}</Text>
            {p.is_verified ? <Ionicons name="checkmark-circle" size={22} color="#9CC7FF" /> : null}
          </View>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={15} color="#FBBF24" />
            <Text style={styles.ratingText}>
              {p.rating_avg.toFixed(1)} ({p.rating_count} {tr('تقييم', 'reviews')})
            </Text>
          </View>
        </GlassCard>

        {p.description ? (
          <View style={styles.descCard}>
            <Text style={styles.desc}>{p.description}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>{tr('الخدمات', 'Services')}</Text>
        {(data!.services as unknown as Svc[]).map((s) => {
          const on = sel === s.id;
          return (
            <Pressable key={s.id} onPress={() => setSel(s.id)} style={[styles.svc, on && styles.svcOn]}>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? BLUE : '#8FA6C4'} />
              <Text style={styles.svcName} numberOfLines={2}>{lang === 'ar' ? s.services.name_ar : s.services.name_en}</Text>
              <Text style={styles.svcPrice}>{priceLabel(s)}</Text>
            </Pressable>
          );
        })}
        <View style={{ height: spacing.lg }} />
        <Button title={tr('احجز الآن', 'Book now')} onPress={() => sel && router.push(`/booking/${sel}`)} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: spacing.lg },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: BLUE,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 54, color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.bold, fontSize: 22, color: '#FFFFFF', textAlign: 'center' },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(124,196,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(124,196,255,0.4)',
  },
  ratingText: { fontFamily: fonts.semibold, color: '#E6F0FF', fontSize: 13 },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
  descCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(47,128,237,0.25)',
  },
  desc: { fontFamily: fonts.regular, color: colors.text, lineHeight: 24 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  svc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(47,128,237,0.25)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  svcOn: {
    backgroundColor: '#FFFFFF',
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  svcName: { flex: 1, fontFamily: fonts.semibold, color: colors.text },
  svcPrice: { fontFamily: fonts.bold, color: BLUE },
});
