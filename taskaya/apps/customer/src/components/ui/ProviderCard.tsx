import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { ProviderCard as P } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, spacing } from '@/theme';

export function ProviderCard({ p }: { p: P }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const price =
    p.min_price != null ? `${tr('يبدأ من', 'From')} ${p.min_price} ${tr('ج.م', 'EGP')}` : tr('السعر حسب العرض', 'Custom quote');

  return (
    <Link href={`/provider/${p.id}`} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={p.business_name}>
        <View style={styles.card}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
          <View style={styles.body}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{p.business_name.charAt(0)}</Text>
            </LinearGradient>

            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.row}>
                <Text style={styles.name} numberOfLines={1}>{p.business_name}</Text>
                {p.is_verified ? <Ionicons name="checkmark-circle" size={18} color={c.accentText} /> : null}
              </View>
              <View style={styles.row}>
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>{p.rating_avg.toFixed(1)}</Text>
                </View>
                <Text style={styles.meta}>({p.rating_count})</Text>
              </View>
              <Text style={styles.price}>{price}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={c.iconMuted} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      borderRadius: 22,
      overflow: 'hidden',
      marginBottom: spacing.md,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.accentBorder,
      shadowColor: c.accent,
      shadowOpacity: c.isDark ? 0.24 : 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 0,
    },
    accent: { height: 4 },
    body: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.6)',
      shadowColor: c.accent,
      shadowOpacity: 0.4,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    avatarText: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 38, color: '#FFFFFF' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { fontFamily: fonts.bold, fontSize: 16, color: c.text, flexShrink: 1 },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: 'rgba(245,158,11,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245,158,11,0.35)',
    },
    ratingText: { fontFamily: fonts.semibold, fontSize: 12.5, color: c.ink },
    meta: { fontFamily: fonts.regular, color: c.textSecondary, fontSize: 12.5 },
    price: { fontFamily: fonts.bold, color: c.accentText, fontSize: 13.5 },
  });
