import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { lang, tr } from '@/i18n';
import { getProvider } from '@/lib/api';
import { colors, fonts, radius, spacing } from '@/theme';

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
      <Stack.Screen options={{ headerShown: true, title: p.business_name, headerTitleStyle: { fontFamily: fonts.bold, color: colors.text }, headerTransparent: false }} />
      <Screen>
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{p.business_name.charAt(0)}</Text></View>
          <View style={styles.row}>
            <Text style={styles.name}>{p.business_name}</Text>
            {p.is_verified ? <Ionicons name="checkmark-circle" size={20} color={colors.primaryLight} /> : null}
          </View>
          <View style={styles.row}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.muted}>{p.rating_avg.toFixed(1)} ({p.rating_count} {tr('تقييم', 'reviews')})</Text>
          </View>
        </View>
        {p.description ? <Text style={styles.desc}>{p.description}</Text> : null}
        <Text style={styles.section}>{tr('الخدمات', 'Services')}</Text>
        {(data!.services as unknown as Svc[]).map((s) => (
          <Pressable key={s.id} onPress={() => setSel(s.id)} style={[styles.svc, sel === s.id && styles.svcOn]}>
            <Text style={styles.svcName}>{lang === 'ar' ? s.services.name_ar : s.services.name_en}</Text>
            <Text style={styles.svcPrice}>{priceLabel(s)}</Text>
          </Pressable>
        ))}
        <View style={{ height: spacing.lg }} />
        <Button title={tr('احجز الآن', 'Book now')} onPress={() => sel && router.push(`/booking/${sel}`)} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: spacing.sm },
  avatar: { width: 88, height: 88, borderRadius: radius.lg, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 36, color: colors.primaryLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
  desc: { fontFamily: fonts.regular, color: colors.text, marginTop: spacing.lg, lineHeight: 24 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  svc: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  svcOn: { backgroundColor: colors.accent, borderColor: colors.primaryLight },
  svcName: { fontFamily: fonts.semibold, color: colors.text },
  svcPrice: { fontFamily: fonts.bold, color: colors.primaryLight },
});
