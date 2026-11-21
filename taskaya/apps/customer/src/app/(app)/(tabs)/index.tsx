import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CategoryCarousel } from '@/components/ui/CategoryCarousel';
import { CategoriesSkeleton, TilesSkeleton } from '@/components/ui/Skeleton';
import { FeaturedTile } from '@/components/ui/FeaturedTile';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { TileGrid } from '@/components/ui/TileGrid';
import { t, tr } from '@/i18n';
import { Category, getCategories } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useDirectory, useProviderSearch } from '@/lib/useProviderSearch';
import { useMyProfile } from '@/lib/profile';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, spacing } from '@/theme';

function useEntrance(delay: number) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return {
    opacity: Platform.OS === 'android' ? 1 : v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
  };
}

function useThemed() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return { c, styles };
}

// كارت زجاجي موحّد (نفس ستايل كارت الترحيب) نستخدمه للهيرو وللأقسام
function Panel({ children, bodyStyle }: { children: ReactNode; bodyStyle?: StyleProp<ViewStyle> }) {
  const { c, styles } = useThemed();
  const webGlass =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px) saturate(160%)', WebkitBackdropFilter: 'blur(8px) saturate(160%)' } as any)
      : null;
  return (
    <View style={[styles.hero, webGlass]}>
      <LinearGradient colors={c.glassHighlight} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} />
      <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accentTop} />
      <View style={[styles.heroBody, bodyStyle]}>{children}</View>
    </View>
  );
}

function SectionTitle({ children, first }: { children: string; first?: boolean }) {
  const { c, styles } = useThemed();
  return (
    <View style={[styles.sectionRow, first && { marginTop: 0 }]}>
      <LinearGradient colors={c.gradient} style={styles.sectionBar} />
      <Text style={styles.section}>{children}</Text>
    </View>
  );
}

export default function Home() {
  const { c, styles } = useThemed();
  const { session } = useAuth();
  const me = useMyProfile();
  const [firstName, setFirstName] = useState('');
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [hour] = useState(() => new Date().getHours());
  const { dir, featured } = useDirectory();
  const results = useProviderSearch(q, dir);

  const heroAnim = useEntrance(0);
  const bodyAnim = useEntrance(60);

  useEffect(() => {
    getCategories().then(setCats);
  }, [session]);

  const searching = q.trim().length > 0;
  const hello =
    hour < 12 ? tr('صباح الخير', 'Good morning') : hour < 18 ? tr('مساء الخير', 'Good afternoon') : tr('مساء النور', 'Good evening');
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '';

  return (
    <Screen>
      <Animated.View style={[{ marginTop: -40, marginHorizontal: -12 }, heroAnim]}>
        {/* ===== كارت واحد: ترحيب + بحث + تصنيفات + مقدمو خدمة ===== */}
        <Panel bodyStyle={styles.mergedBody}>
          <View style={styles.header}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={styles.hello}>{hello}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {(me?.first_name || firstName).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.tagline}>{t('tagline')}</Text>
          <View style={{ height: 16 }} />
          <SearchField value={q} onChangeText={setQ} placeholder={tr('بتدور على أي', 'Looking for anything?')} />

          <Animated.View style={[{ marginTop: spacing.lg }, bodyAnim]}>
            {searching ? (
              <>
                <SectionTitle>{tr('نتائج البحث', 'Search results')}</SectionTitle>
                {results === null ? null : results.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <View style={styles.emptyIcon}>
                      <Ionicons name="search-outline" size={28} color={c.accentText} />
                    </View>
                    <Text style={styles.empty}>{tr('لا يوجد نتائج', 'No results')}</Text>
                  </View>
                ) : (
                  <TileGrid data={results} keyOf={(p) => p.id} columns={3} aspect={1.4} render={(p, size, h) => <FeaturedTile p={p} size={size} height={h} />} />
                )}
              </>
            ) : (
              <>
                {cats.length ? <CategoryCarousel data={cats} /> : <CategoriesSkeleton />}

                <View style={{ height: spacing.lg }} />
                {!dir ? <TilesSkeleton columns={3} aspect={1.4} count={6} /> : null}
                <TileGrid data={featured} keyOf={(p) => p.id} columns={3} aspect={1.4} render={(p, size, h) => <FeaturedTile p={p} size={size} height={h} />} />
              </>
            )}
          </Animated.View>
        </Panel>
      </Animated.View>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hero: {
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: c.glassBg,
      borderWidth: 1.5,
      borderColor: c.glassBorder,
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.28 : 0.2,
      shadowRadius: 36,
      shadowOffset: { width: 0, height: 18 },
      elevation: 0,
    },
    accentTop: { height: 4 },
    heroBody: { padding: 20 },
    mergedBody: { padding: 16, paddingBottom: 20 },
    divider: { height: 1, backgroundColor: c.accentLine, marginTop: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.6)',
      shadowColor: c.shadow,
      shadowOpacity: 0.45,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    avatarText: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 36, color: '#FFFFFF' },
    hello: { fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary },
    name: { fontFamily: fonts.bold, fontSize: 24, color: c.text, marginTop: -4 },
    tagline: { fontFamily: fonts.regular, color: c.textSecondary, marginTop: 12, fontSize: 13.5 },

    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.lg, marginBottom: spacing.md },
    sectionBar: { width: 5, height: 22, borderRadius: 3 },
    section: { fontFamily: fonts.bold, fontSize: 18, color: c.text },

    emptyWrap: { alignItems: 'center', marginTop: 36, gap: 12 },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
      borderWidth: 1.5,
      borderColor: c.accentBorder,
    },
    empty: { fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center' },
  });
