import { Ionicons } from '@expo/vector-icons';
import { BellButton } from '@/components/ui/BellButton';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProviderRow } from '@/components/ui/ProviderRow';
import { SearchField } from '@/components/ui/SearchField';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { lang, t, tr } from '@/i18n';
import { Category, getCategories, getCategoryPage, ProviderCard } from '@/lib/api';
import { checkCatalog, useCatalogVersion, wireCatalogChecks } from '@/lib/catalogVersion';
import { useMyProfile } from '@/lib/profile';
import { usePushSetup } from '@/lib/push';
import { useDirectory, useProviderSearch } from '@/lib/useProviderSearch';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function useEntrance(delay: number) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return {
    opacity: Platform.OS === 'android' ? 1 : v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
}

// على الويب: الخدمات بتذوب على حافة المنطقة وهي خارجة
const WEB_FADE =
  Platform.OS === 'web'
    ? ({
        maskImage: 'linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 18px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 18px), transparent 100%)',
      } as any)
    : null;

const catName = (c: Category) => (lang === 'ar' ? c.name_ar : c.name_en);
const catIcon = (c: Category): IconName => {
  const raw = ((c as { icon?: string | null }).icon || 'grid-outline').replace(/-outline$/, '');
  return `${raw}-outline` as IconName;
};

/**
 * الرئيسية: هيدر ملوّن + بحث عايم + كبسولات الأقسام (فلتر) + "الأعلى تقييمًا".
 * الجزء اللي فوق ثابت، والقايمة بس هي اللي بتتسحب.
 */
export default function Home() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  usePushSetup(session?.user.id);
  const me = useMyProfile();
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [hour] = useState(() => new Date().getHours());
  const [catId, setCatId] = useState<string | null>(null);
  const [byCat, setByCat] = useState<Record<string, ProviderCard[]>>({});
  const [listW, setListW] = useState(0);
  const { dir, featured } = useDirectory();
  const results = useProviderSearch(q, dir);
  const headAnim = useEntrance(0);
  const bodyAnim = useEntrance(80);

  const ver = useCatalogVersion();
  useEffect(() => {
    getCategories().then(setCats);
    setByCat({});
  }, [session, ver]);

  useFocusEffect(
    useCallback(() => {
      wireCatalogChecks();
      void checkCatalog();
    }, []),
  );

  // قسم بيتحمّل مرة واحدة وبعدها بيتحفظ
  const pickCat = (id: string | null) => {
    setCatId(id);
    if (id && !byCat[id]) {
      void getCategoryPage(id).then((pg) => setByCat((m) => ({ ...m, [id]: pg.providers })));
    }
  };

  const searching = q.trim().length > 0;
  const top = useMemo(() => [...featured].sort((a, b) => b.rating_avg - a.rating_avg), [featured]);
  const list: ProviderCard[] | null = searching ? results : catId ? byCat[catId] ?? null : dir ? top : null;
  const current = cats.find((x) => x.id === catId);
  const title = searching ? tr('نتائج البحث', 'Search results') : current ? catName(current) : tr('الأعلى تقييمًا', 'Top rated');
  const hello = hour < 12 ? tr('صباح الخير', 'Good morning') : hour < 18 ? tr('مساء الخير', 'Good afternoon') : tr('مساء النور', 'Good evening');
  const first = me?.first_name || '';
  const initial = (first || '؟').charAt(0).toUpperCase();
  const rowH = listW ? Math.max(140, Math.min(165, Math.round(((listW - 24) / 3) * 1.4))) : 145;

  return (
    <View style={styles.page}>
      {/* ===== الهيدر الملوّن ===== */}
      <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Animated.View style={[styles.inner, headAnim]}>
          <View style={styles.headRow}>
            <Pressable onPress={() => router.push('/profile' as never)} style={styles.avatar} accessibilityLabel={tr('حسابي', 'Profile')}>
              {me?.avatar_url ? <Image source={{ uri: me.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.avatarText}>{initial}</Text>}
            </Pressable>
            <BellButton />
          </View>
          <Text style={styles.hello} numberOfLines={1}>
            {hello}
            {first ? tr(`، ${first}`, `, ${first}`) : ''}
          </Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </Animated.View>
      </LinearGradient>

      <Animated.View style={[styles.inner, styles.body, { paddingBottom: Math.max(insets.bottom, 12) + 84 }, bodyAnim]}>
        {/* ===== البحث العايم ===== */}
        <View style={styles.search}>
          <SearchField value={q} onChangeText={setQ} placeholder={tr('بتدور على إيه؟', 'What are you looking for?')} />
        </View>

        {/* ===== كبسولات الأقسام ===== */}
        {!searching ? (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {[null, ...cats].map((cat) => {
                const id = cat?.id ?? null;
                const on = id === catId;
                return (
                  <Pressable key={id ?? 'all'} onPress={() => pickCat(id)} style={[styles.chip, on && styles.chipOn]}>
                    <Ionicons name={cat ? catIcon(cat) : 'grid-outline'} size={15} color={on ? '#FFFFFF' : c.accentText} />
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{cat ? catName(cat) : tr('الكل', 'All')}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* ===== العنوان ===== */}
        <View style={styles.secRow}>
          <View style={styles.secLeft}>
            <LinearGradient colors={c.gradient} style={styles.secBar} />
            <Text style={styles.sec}>{title}</Text>
          </View>
          {current && !searching ? (
            <Pressable onPress={() => router.push(`/category/${current.id}` as never)} hitSlop={8}>
              <Text style={styles.all}>{tr('عرض الكل', 'See all')}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* ===== القايمة: هي بس اللي بتتسحب ===== */}
        <View style={styles.listArea} onLayout={(e) => setListW(e.nativeEvent.layout.width)}>
          <ScrollView style={[{ flex: 1 }, WEB_FADE]} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {list === null ? <ListSkeleton rows={3} height={rowH} /> : null}
            {list !== null && list.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name={searching ? 'search-outline' : 'storefront-outline'} size={28} color={c.accentText} />
                </View>
                <Text style={styles.empty}>{searching ? tr('لا يوجد نتائج', 'No results') : tr('لسه مفيش مقدمي خدمة هنا', 'No providers here yet')}</Text>
              </View>
            ) : null}
            {(list ?? []).map((p) => (
              <ProviderRow key={p.id} p={p} height={rowH} />
            ))}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1 },
    inner: { width: '100%', maxWidth: 720, alignSelf: 'center' },
    header: { paddingHorizontal: 20, paddingBottom: 46, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 15,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.45)',
    },
    avatarText: { fontFamily: fonts.bold, fontSize: 19, color: '#FFFFFF' },
    hello: { fontFamily: fonts.bold, fontSize: 23, color: '#FFFFFF', marginTop: 16 },
    tagline: { fontFamily: fonts.regular, fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
    body: { flex: 1, paddingHorizontal: 16 },
    search: {
      marginTop: -28,
      borderRadius: 18,
      shadowColor: c.accent,
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 0,
    },
    chips: { gap: 8, paddingTop: 14, paddingBottom: 4 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      height: 38,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    chipOn: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { fontFamily: fonts.semibold, fontSize: 13, color: c.text },
    chipTextOn: { color: '#FFFFFF' },
    secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 4 },
    secLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    secBar: { width: 5, height: 20, borderRadius: 3 },
    sec: { fontFamily: fonts.bold, fontSize: 17, color: c.text },
    all: { fontFamily: fonts.semibold, fontSize: 13, color: c.accentText },
    listArea: { flex: 1, marginHorizontal: -16 },
    listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, gap: 12 },
    emptyWrap: { alignItems: 'center', marginTop: 30, gap: 12 },
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
