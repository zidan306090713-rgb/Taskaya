import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { ProviderCard as P } from '@/lib/api';
import { colors, fonts, radius, spacing } from '@/theme';
import { GlassCard } from './GlassCard';

export function ProviderCard({ p }: { p: P }) {
  return (
    <Link href={`/provider/${p.id}`} asChild>
      <Pressable style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
        <GlassCard navy style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{p.business_name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>{p.business_name}</Text>
              {p.is_verified ? <Ionicons name="checkmark-circle" size={18} color="#9CC7FF" /> : null}
            </View>
            <View style={styles.row}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={styles.meta}>{p.rating_avg.toFixed(1)} ({p.rating_count})</Text>
            </View>
            <Text style={styles.price}>
              {p.min_price != null ? `${tr('يبدأ من', 'From')} ${p.min_price} ${tr('ج.م', 'EGP')}` : tr('السعر حسب العرض', 'Custom quote')}
            </Text>
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, marginBottom: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 22, color: colors.primaryLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF', flexShrink: 1 },
  meta: { fontFamily: fonts.regular, color: '#B7CDEE', fontSize: 13 },
  price: { fontFamily: fonts.semibold, color: '#9CC7FF', marginTop: 4, fontSize: 13 },
});
