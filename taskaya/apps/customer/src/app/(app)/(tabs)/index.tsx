import { Avatar } from '@/components/EditProfileSheet';
import { Ionicons } from '@expo/vector-icons';
import { BellButton } from '@/components/ui/BellButton';
import { CatTiles } from '@/components/home/CatTiles';
import { GlowBg } from '@/components/home/GlowBg';
import { BlurView } from 'expo-blur';
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
import { Category, getCategories, getCategoryPage, openFirst, ProviderCard } from '@/lib/api';
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
  const [avHover, setAvHover] = useState(false);
  const [headH, setHeadH] = useState(200);
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
  const raw: ProviderCard[] | null = searching ? results : catId ? byCat[catId] ?? null : dir ? top : null;
  // المتاحين الأول، واللي مش متاحين في الآخر
  const list = useMemo(() => (raw ? openFirst(raw) : null), [raw]);
  const current = cats.find((x) => x.id === catId);
  const title = searching ? tr('نتائج البحث', 'Search results') : current ? catName(current) : tr('الأعلى تقييمًا', 'Top rated');
  const hello = hour >= 5 && hour < 16 ? tr('صباح الخير', 'Good morning') : tr('مساء الخير', 'Good evening');
  const first = me?.first_name || '';
  const initial = (first || '؟').charAt(0).toUpperCase();
  const rowH = listW ? Math.max(140, Math.min(165, Math.round(((listW - 24) / 3) * 1.4))) : 145;

  return (
    <View style={styles.page}>
      <GlowBg />
      {/* ===== الهيدر الملوّن ===== */}
      <View onLayout={(e) => setHeadH(e.nativeEvent.layout.height)} style={[styles.header, WEB_FROST, { paddingTop: insets.top + 8 }]}>
        {Platform.OS === 'ios' ? <BlurView intensity={40} tint="default" style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: Platform.OS === 'android' ? 0.95 : 0.74 }]} />
        <View style={styles.glow} />
        <View style={styles.glow2} />
        <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />
        <Animated.View style={[styles.inner, headAnim]}>
          <View style={styles.headRow}>
            <View style={styles.helloRow}>
              <Pressable onPress={() => router.push('/profile' as never)} onHoverIn={() => setAvHover(true)} onHoverOut={() => setAvHover(false)} style={[styles.avatar, avHover && styles.avatarHover]} accessibilityLabel={tr('حسابي', 'Profile')}>
                <Avatar uri={me?.avatar_url} size={52} />
              </Pressable>
              <View style={styles.helloCol}>
                <Text style={[styles.hello, { textAlign: lang === 'ar' ? 'right' : 'left' }]} numberOfLines={1}>{hello}</Text>
                {first ? <Text style={[styles.name, { textAlign: lang === 'ar' ? 'right' : 'left' }]} numberOfLines={1} adjustsFontSizeToFit>{first}</Text> : null}
              </View>
            </View>
            <BellButton />
          </View>
          <Text style={styles.tagline}>{t('tagline')}</Text>
                    <View style={styles.tools}>
        {/* ===== البحث العايم ===== */}
        <View style={styles.search}>
          <SearchField onDark value={q} onChangeText={setQ} placeholder={tr('بتدور على إيه؟', 'What are you looking for?')} />
        </View>

        {/* ===== كبسولات الأقسام ===== */}
        {!searching ? <CatTiles cats={cats} catId={catId} onPick={pickCat} icon={catIcon} name={catName} /> : null}
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.inner, styles.body, bodyAnim]}>
        {/* ===== القايمة: هي بس اللي بتتسحب ===== */}
        <View style={styles.listArea} onLayout={(e) => setListW(e.nativeEvent.layout.width)}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.listContent, { paddingTop: headH + 12, paddingBottom: Math.max(insets.bottom, 12) + 100 }]} showsVerticalScrollIndicator={false}>
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

const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)' } as any) : null;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1 },
    inner: { width: '100%', maxWidth: 720, alignSelf: 'center' },
    header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 0, zIndex: 1, overflow: 'hidden', borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(255,255,255,0.28)', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%', pointerEvents: 'none' },
    glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -120, left: -80, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
    glow2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: -90, right: -50, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    avatar: { padding: 2, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)' },
    avatarText: { fontFamily: fonts.bold, fontSize: 19, color: '#FFFFFF' },
    avatarHover: { backgroundColor: 'rgba(255,255,255,0.32)', borderColor: '#FFFFFF', transform: [{ scale: 1.05 }] },
    helloRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    helloCol: { flexShrink: 1, justifyContent: 'center' },
    hello: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.85)' },
    name: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.8 },
    tagline: { fontFamily: fonts.regular, fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
    body: { flex: 1, paddingHorizontal: 16 },
    tools: { marginHorizontal: -4 },
    search: {
      marginTop: 4,
      borderRadius: 18,
      shadowColor: c.accent,
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 0,
    },
    chips: { gap: 8, paddingTop: 10, paddingBottom: 2 },
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
