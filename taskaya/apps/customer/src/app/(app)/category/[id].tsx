import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chips } from '@/components/ui/Chips';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ProviderRow } from '@/components/ui/ProviderRow';
import { SearchField } from '@/components/ui/SearchField';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { lang, tr } from '@/i18n';
import { Category, getCategoryPage, ProviderCard as P, Subcategory } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// توحيد الحروف العربية للبحث: أ/إ/آ → ا، ة → ه، ى → ي، وشيل التشكيل
const norm = (s: string) =>
  s.toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
const searchText = (p: P) => norm(`${p.business_name ?? ''} ${p.description ?? ''}`);
const catIcon = (c: Category | null): IconName => `${((c?.icon || 'grid-outline') as string).replace(/-outline$/, '')}-outline` as IconName;

const WEB_FADE =
  Platform.OS === 'web'
    ? ({
        maskImage: 'linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 18px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 18px), transparent 100%)',
      } as any)
    : null;

/** صفحة القسم: هيدر ملوّن + بحث عايم + كبسولات الأقسام الفرعية + مقدمي الخدمة (القايمة بس بتتسحب) */
export default function CategoryScreen() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cat, setCat] = useState<Category | null>(null);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [list, setList] = useState<P[] | null>(null);
  const [query, setQuery] = useState('');
  const [listW, setListW] = useState(0);

  useEffect(() => {
    let alive = true;
    setList(null);
    getCategoryPage(id, active ?? undefined).then((r) => {
      if (!alive) return;
      setCat(r.category);
      setSubs(r.subcategories);
      setList(r.providers);
    });
    return () => {
      alive = false;
    };
  }, [id, active]);

  // فلترة فورية على الجهاز
  const q = norm(query);
  const shown = useMemo(() => {
    if (!list) return null;
    if (!q) return list;
    const words = q.split(/\s+/).filter(Boolean);
    return list.filter((p) => words.every((w) => searchText(p).includes(w)));
  }, [list, q]);

  const name = (x: { name_ar: string; name_en: string }) => (lang === 'ar' ? x.name_ar : x.name_en);
  const desc = cat ? (lang === 'ar' ? cat.description_ar : cat.description_en) : null;
  const rowH = listW ? Math.max(140, Math.min(165, Math.round(((listW - 24) / 3) * 1.4))) : 145;
  const n = shown?.length ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <GradientHeader title={cat ? name(cat) : ' '} subtitle={desc} icon={catIcon(cat)} />

      <View style={styles.body}>
        <View style={styles.search}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={cat ? tr(`ابحث في ${cat.name_ar}...`, `Search in ${cat.name_en}...`) : tr('ابحث...', 'Search...')}
          />
        </View>

        <View>
          <Chips
            items={[{ key: null, label: tr('الكل', 'All') }, ...subs.map((s) => ({ key: s.id, label: name(s) }))]}
            value={active}
            onChange={setActive}
            loading={!cat}
          />
        </View>

        <Text style={styles.count}>
          {shown === null ? ' ' : n === 1 ? tr('مقدم خدمة واحد', '1 provider') : tr(`${n} مقدمي خدمة`, `${n} providers`)}
        </Text>

        <View style={styles.listArea} onLayout={(e) => setListW(e.nativeEvent.layout.width)}>
          <ScrollView style={[{ flex: 1 }, WEB_FADE]} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {shown === null ? <ListSkeleton rows={3} height={rowH} /> : null}
            {shown !== null && shown.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={28} color={c.accentText} />
                </View>
                <Text style={styles.empty}>
                  {q ? tr(`مفيش نتايج لـ "${query.trim()}"`, `No results for "${query.trim()}"`) : tr('لا يوجد مقدمو خدمة بعد', 'No providers yet')}
                </Text>
                {q ? (
                  <Pressable onPress={() => setQuery('')} accessibilityRole="button" style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.8 }]}>
                    <Text style={styles.clearText}>{tr('مسح البحث', 'Clear search')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {(shown ?? []).map((p) => (
              <ProviderRow key={p.id} p={p} height={rowH} />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    body: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16 },
    search: {
      marginTop: -26,
      borderRadius: 18,
      shadowColor: c.accent,
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 0,
    },
    count: { fontFamily: fonts.semibold, fontSize: 13, color: c.textSecondary, marginTop: 14 },
    listArea: { flex: 1, marginHorizontal: -16 },
    listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, gap: 12 },
    emptyWrap: { alignItems: 'center', marginTop: 40, gap: 12 },
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
    clearBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder },
    clearText: { fontFamily: fonts.semibold, fontSize: 13, color: c.accentText },
  });
