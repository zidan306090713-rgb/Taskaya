import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { prefetchProvider, ProviderCard as P } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

export function FeaturedTile({ p, size, height = size }: { p: P; size: number; height?: number }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [scale] = useState(() => new Animated.Value(1));
  const press = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 30, bounciness: 4 }).start();

  const uri = p.cover_url ?? p.logo_url;
  const fs = Math.max(11, Math.min(14.5, size / 10.5));
  const price =
    p.min_price != null ? `${tr('من', 'From')} ${p.min_price} ${tr('ج.م', 'EGP')}` : tr('حسب العرض', 'Custom quote');
  const circle = Math.round(size * 0.34);

  return (
    <Link href={`/provider/${p.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={p.business_name}
        onPressIn={() => { prefetchProvider(p); press(0.96); }}
        onPressOut={() => press(1)}
        style={{ width: size, height }}
      >
        <Animated.View style={[styles.card, { width: size, height, transform: [{ scale }] }]}>
          <View style={styles.imageWrap}>
            {uri ? (
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <LinearGradient
                colors={c.placeholderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.placeholder]}
              >
                <View style={[styles.circle, { width: circle, height: circle, borderRadius: circle / 2 }]}>
                  <Ionicons name="business" size={Math.round(circle * 0.5)} color={c.accentText} />
                </View>
              </LinearGradient>
            )}
            <LinearGradient
              colors={['rgba(10,34,80,0)', 'rgba(10,34,80,0.22)']}
              style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
            />
            <View style={styles.rating}>
              <Ionicons name="star" size={fs} color="#F59E0B" />
              <Text style={[styles.ratingText, { fontSize: fs - 1 }]}>{p.rating_avg.toFixed(1)}</Text>
            </View>
          </View>

          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { fontSize: fs, lineHeight: fs + 4 }]} numberOfLines={1}>
                {p.business_name}
              </Text>
              {p.is_verified ? <Ionicons name="checkmark-circle" size={fs + 1} color={c.accentText} /> : null}
            </View>
            {p.description ? (
              <Text style={[styles.desc, { fontSize: fs - 1.5, lineHeight: fs + 2 }]} numberOfLines={size < 130 ? 1 : 2}>
                {p.description}
              </Text>
            ) : null}
            <Text style={[styles.price, { fontSize: fs - 0.5, lineHeight: fs + 3 }]} numberOfLines={1}>
              {price}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </Link>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.cardBorder,
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.22 : 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 0,
    },
    imageWrap: { flex: 1, overflow: 'hidden' },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    circle: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    accent: { height: 2.5 },
    rating: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    ratingText: { fontFamily: fonts.semibold, color: c.ink },
    info: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: 9, gap: 3 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    name: { fontFamily: fonts.bold, color: c.text, flexShrink: 1 },
    desc: { fontFamily: fonts.regular, color: c.textSecondary },
    price: { fontFamily: fonts.bold, color: c.accentText },
  });
