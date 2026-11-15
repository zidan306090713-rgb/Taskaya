import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { ProviderCard as P } from '@/lib/api';
import { colors, fonts, radius } from '@/theme';
import { GlassCard } from './GlassCard';

export function FeaturedTile({ p, size }: { p: P; size: number }) {
  const uri = p.cover_url ?? p.logo_url;
  const fs = Math.max(9, Math.min(13, size / 10));
  const price =
    p.min_price != null ? `${tr('من', 'From')} ${p.min_price} ${tr('ج.م', 'EGP')}` : tr('حسب العرض', 'Custom quote');

  return (
    <Link href={`/provider/${p.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={p.business_name}
        style={{ width: size, height: size }}
      >
        <GlassCard strong radiusSize={radius.md} style={[styles.tile, { width: size, height: size, backgroundColor: 'rgba(5,16,34,0.82)' }]}>
          <View style={styles.imageWrap}>
            {uri ? (
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={['rgba(47,140,255,0.45)', 'rgba(7,22,41,0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.placeholder]}
              >
                <Text style={[styles.initial, { fontSize: size * 0.3 }]}>{p.business_name.charAt(0)}</Text>
              </LinearGradient>
            )}
            <View style={styles.rating}>
              <Ionicons name="star" size={fs} color="#FBBF24" />
              <Text style={[styles.ratingText, { fontSize: fs - 1 }]}>{p.rating_avg.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { fontSize: fs, lineHeight: fs + 2 }]} numberOfLines={1}>
                {p.business_name}
              </Text>
              {p.is_verified ? <Ionicons name="checkmark-circle" size={fs} color={colors.primaryLight} /> : null}
            </View>
            {p.description ? (
              <Text style={[styles.desc, { fontSize: fs - 1.5, lineHeight: fs + 1 }]} numberOfLines={1}>
                {p.description}
              </Text>
            ) : null}
            <Text style={[styles.price, { fontSize: fs - 0.5, lineHeight: fs + 2 }]} numberOfLines={1}>
              {price}
            </Text>
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1 },
  imageWrap: { flex: 2, overflow: 'hidden' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.bold, color: colors.primaryLight },
  rating: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(5,16,34,0.72)',
  },
  ratingText: { fontFamily: fonts.semibold, color: colors.text },
  info: { flex: 1, paddingHorizontal: 6, paddingVertical: 2, justifyContent: 'space-evenly' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  name: { fontFamily: fonts.bold, color: colors.text, flexShrink: 1 },
  desc: { fontFamily: fonts.regular, color: colors.textSecondary },
  price: { fontFamily: fonts.semibold, color: colors.primaryLight },
});
