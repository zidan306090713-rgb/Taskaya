import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { ProviderCard as P } from '@/lib/api';
import { fonts, radius } from '@/theme';
import { GlassCard } from './GlassCard';

const ICON = '#9CC7FF';

export function FeaturedTile({ p, size }: { p: P; size: number }) {
  const uri = p.cover_url ?? p.logo_url;
  const fs = Math.max(9, Math.min(13, size / 10));
  const price =
    p.min_price != null ? `${tr('من', 'From')} ${p.min_price} ${tr('ج.م', 'EGP')}` : tr('حسب العرض', 'Custom quote');

  return (
    <Link href={`/provider/${p.id}`} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={p.business_name} style={{ width: size, height: size }}>
        <GlassCard navy radiusSize={radius.md} style={[styles.tile, { width: size, height: size }]}>
          <View style={styles.imageWrap}>
            {uri ? (
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={['rgba(47,140,255,0.55)', 'rgba(10,34,80,0.9)']}
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
              {p.is_verified ? <Ionicons name="checkmark-circle" size={fs} color={ICON} /> : null}
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
  imageWrap: { flex: 2, overflow: 'hidden', borderBottomWidth: 1.5, borderBottomColor: '#08193D' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.bold, color: '#DCEBFF' },
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
    backgroundColor: '#0A2250',
    borderWidth: 1.5,
    borderColor: 'rgba(124,196,255,0.45)',
  },
  ratingText: { fontFamily: fonts.semibold, color: '#FFFFFF' },
  info: { flex: 1, paddingHorizontal: 6, paddingVertical: 2, justifyContent: 'space-evenly' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  name: { fontFamily: fonts.bold, color: '#FFFFFF', flexShrink: 1 },
  desc: { fontFamily: fonts.regular, color: '#B7CDEE' },
  price: { fontFamily: fonts.semibold, color: '#9CC7FF' },
});
