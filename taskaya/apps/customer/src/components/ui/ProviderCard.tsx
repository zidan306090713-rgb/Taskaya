import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { ProviderCard as P } from '@/lib/api';
import { colors, fonts, radius, spacing } from '@/theme';

export function ProviderCard({ p }: { p: P }) {
  return (
    <Link href={`/provider/${p.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{p.business_name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{p.business_name}</Text>
            {p.is_verified ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
          </View>
          <View style={styles.row}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.meta}>{p.rating_avg.toFixed(1)} ({p.rating_count})</Text>
          </View>
          <Text style={styles.price}>
            {p.min_price != null ? `${tr('يبدأ من', 'From')} ${p.min_price} ${tr('ج.م', 'EGP')}` : tr('السعر حسب العرض', 'Custom quote')}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, flexShrink: 1 },
  meta: { fontFamily: fonts.regular, color: colors.textSecondary, fontSize: 13 },
  price: { fontFamily: fonts.semibold, color: colors.primary, marginTop: 4, fontSize: 13 },
});
