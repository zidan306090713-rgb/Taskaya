import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const WEB_GLASS =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)', transition: 'border-color .2s ease, box-shadow .2s ease' } as any)
    : null;
import { isRTL, tr } from '@/i18n';
import { isOpen, prefetchProvider, ProviderCard as P } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

/**
 * كارت مقدم الخدمة: كارت أبيض فيه صورة مدوّرة جواه (بتبان كاملة ومتناسقة)
 * + لوجو راكب على ركن الصورة + الاسم والوصف والسعر وزرار مليان.
 */
export function ProviderRow({ p, height }: { p: P; height: number }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [scale] = useState(() => new Animated.Value(1));
  const press = (to: number) => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  const uri = p.cover_url ?? p.logo_url;
  const imgW = Math.round((height - 20) * 0.98);
  const initial = (p.business_name || '؟').trim().charAt(0);
  const closed = !isOpen(p);
  const [hover, setHover] = useState(false);
  const sheen = c.isDark ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] as const) : (['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)'] as const);

  return (
    <Link href={`/provider/${p.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closed ? `${p.business_name}، ${tr('مش متاح حاليًا', 'Unavailable now')}` : p.business_name}
        onPressIn={() => { prefetchProvider(p); press(0.97); }}
        onPressOut={() => press(1)}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
      >
        <Animated.View style={[styles.card, WEB_GLASS, hover && styles.cardHover, { height, transform: [{ scale }] }]}>
          {Platform.OS === 'ios' ? <BlurView intensity={28} tint={c.isDark ? 'dark' : 'light'} style={styles.blur} /> : null}
          <LinearGradient colors={sheen} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />
          <View style={[styles.image, { width: imgW }]}>
            {uri ? (
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <LinearGradient colors={c.placeholderGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.center]}>
                <Ionicons name="business" size={30} color={c.accentText} />
              </LinearGradient>
            )}
            <View style={styles.rating}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{p.rating_avg.toFixed(1)}</Text>
            </View>
          </View>

          {/* لوجو راكب على ركن الصورة */}
          <View style={styles.logo}>
            {p.logo_url && p.cover_url ? (
              <Image source={{ uri: p.logo_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={[styles.initial, { color: c.accentText }]}>{initial}</Text>
            )}
          </View>

          <View style={styles.info}>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{p.business_name}</Text>
                {p.is_verified ? <Ionicons name="checkmark-circle" size={17} color={c.accentText} /> : null}
              </View>
              {p.description ? <Text style={styles.desc} numberOfLines={2}>{p.description}</Text> : null}
            </View>
            <View style={styles.bottom}>
              {p.min_price != null ? (
                <Text style={styles.price} numberOfLines={1}>
                  <Text style={styles.from}>{tr('يبدأ من ', 'From ')}</Text>
                  {p.min_price} {tr('ج.م', 'EGP')}
                </Text>
              ) : (
                <Text style={styles.price} numberOfLines={1}>{tr('حسب العرض', 'Custom quote')}</Text>
              )}
              <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.go}>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={17} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </View>

          {/* مش متاح: طبقة رمادي ثابتة (من غير elevation ولا opacity متحركة) + شارة */}
          {closed ? (
            <>
              <View style={styles.dim} />
              <View style={styles.closed}>
                <Ionicons name="moon" size={12} color="#FFFFFF" />
                <Text style={styles.closedText}>{tr('مش متاح حاليًا', 'Unavailable now')}</Text>
              </View>
            </>
          ) : null}
        </Animated.View>
      </Pressable>
    </Link>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      padding: 10,
      borderRadius: 22,
      backgroundColor: c.isDark ? 'rgba(30,36,52,0.55)' : Platform.OS === 'android' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)',
      borderWidth: 1,
      borderColor: c.isDark ? 'rgba(255,255,255,0.12)' : Platform.OS === 'android' ? c.accentBorder : 'rgba(255,255,255,0.9)',
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.22 : 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 0,
    },
    image: { borderRadius: 16, overflow: 'hidden', backgroundColor: c.fieldBg },
    center: { alignItems: 'center', justifyContent: 'center' },
    cardHover: { borderColor: c.accent, shadowOpacity: c.isDark ? 0.32 : 0.2 },
    blur: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 22, overflow: 'hidden' },
    sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: 22, borderTopRightRadius: 22, pointerEvents: 'none' },
    rating: {
      position: 'absolute',
      bottom: 7,
      end: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: c.card,
    },
    ratingText: { fontFamily: fonts.semibold, fontSize: 12, color: c.ink },
    logo: {
      position: 'absolute',
      top: 4,
      ...(isRTL ? { right: 4 } : { left: 4 }),
      width: 34,
      height: 34,
      borderRadius: 11,
      overflow: 'hidden',
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.card,
      shadowColor: c.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    initial: { fontFamily: fonts.bold, fontSize: 16 },
    info: { flex: 1, paddingVertical: 4, justifyContent: 'space-between' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    name: { fontFamily: fonts.bold, fontSize: 16, color: c.text, flexShrink: 1 },
    desc: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: c.textSecondary, marginTop: 3 },
    bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    price: { fontFamily: fonts.bold, fontSize: 15, color: c.accentText, flexShrink: 1 },
    from: { fontFamily: fonts.regular, fontSize: 11.5, color: c.textSecondary },
    go: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dim: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      borderRadius: 22,
      backgroundColor: c.isDark ? 'rgba(20,24,32,0.62)' : 'rgba(226,230,238,0.66)',
      pointerEvents: 'none',
    },
    closed: {
      position: 'absolute',
      top: 10,
      ...(isRTL ? { left: 10 } : { right: 10 }),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: '#64748B',
      pointerEvents: 'none',
    },
    closedText: { fontFamily: fonts.semibold, fontSize: 11.5, color: '#FFFFFF' },
  });
