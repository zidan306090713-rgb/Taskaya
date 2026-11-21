import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProviderCard } from '@/components/ui/ProviderCard';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { lang, tr } from '@/i18n';
import { Category, getCategoryPage, ProviderCard as P, Subcategory } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, spacing } from '@/theme';

// توحيد الحروف العربية للبحث: أ/إ/آ → ا، ة → ه، ى → ي، وشيل التشكيل
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();

// النص اللي بندوّر فيه لكل مقدّم خدمة: الاسم + الوصف
const searchText = (p: P) => {
  const pp = (p as any).provider_profiles ?? p;
  return norm(`${pp.business_name ?? ''} ${pp.description ?? ''}`);
};

export default function CategoryScreen() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cat, setCat] = useState<Category | null>(null);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [active, setActive] = useState<string | undefined>();
  const [list, setList] = useState<P[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    setList(null);
    getCategoryPage(id, active).then((r) => {
      if (!alive) return;
      setCat(r.category);
      setSubs(r.subcategories);
      setList(r.providers);
    });
    return () => {
      alive = false;
    };
  }, [id, active]);

  // فلترة فورية على الجهاز (مقدّمي الخدمة بتوع القسم محمّلين أصلًا)
  const q = norm(query);
  const shown = useMemo(() => {
    if (!list) return null;
    if (!q) return list;
    const words = q.split(/\s+/).filter(Boolean);
    return list.filter((p) => {
      const t = searchText(p);
      return words.every((w) => t.includes(w));
    });
  }, [list, q]);

  const name = (x: { name_ar: string; name_en: string }) => (lang === 'ar' ? x.name_ar : x.name_en);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: cat ? name(cat) : '',
          headerTitleStyle: { fontFamily: fonts.bold, color: c.text },
          headerStyle: { backgroundColor: c.headerBg },
          headerShadowVisible: false,
          headerTintColor: c.accentText,
        }}
      />
      <Screen padTop={0}>
        {/* ===== بحث داخل القسم ===== */}
        <View style={styles.search}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={cat ? tr(`ابحث في ${cat.name_ar}...`, `Search in ${cat.name_en}...`) : tr('ابحث...', 'Search...')}
          />
        </View>

        {cat ? <Text style={styles.desc}>{lang === "ar" ? cat.description_ar : cat.description_en}</Text> : null}
        {cat ? <Text style={styles.desc}>{lang === "ar" ? cat.description_ar : cat.description_en}</Text> : null}
        <View style={styles.chips}>
          <Chip label={tr('الكل', 'All')} on={!active} onPress={() => setActive(undefined)} />
          {!cat ? [0, 1, 2].map((i) => <Skeleton key={i} width={84} height={38} radius={999} />) : null}
          {subs.map((s) => (
            <Chip key={s.id} label={name(s)} on={active === s.id} onPress={() => setActive(s.id)} />
          ))}
        </View>

        {shown === null ? (
          <ListSkeleton rows={4} height={96} />
        ) : shown.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color={c.accentText} />
            </View>
            <Text style={styles.empty}>
              {q
                ? tr(`مفيش نتايج لـ "${query.trim()}"`, `No results for "${query.trim()}"`)
                : tr('لا يوجد مقدمو خدمة بعد', 'No providers yet')}
            </Text>
            {q ? (
              <Pressable onPress={() => setQuery('')} accessibilityRole="button" style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.8 }]}>
                <Text style={styles.clearText}>{tr('مسح البحث', 'Clear search')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {(shown ?? []).map((p) => <ProviderCard key={p.id} p={p} />)}
      </Screen>
    </>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    search: { marginBottom: spacing.md },
    desc: { fontFamily: fonts.regular, color: c.textSecondary, marginBottom: spacing.md, paddingHorizontal: 4 },
    desc: { fontFamily: fonts.regular, color: c.textSecondary, marginBottom: spacing.md, paddingHorizontal: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: c.chipBg,
      borderWidth: 1.5,
      borderColor: c.chipBorder,
    },
    chipOn: {
      backgroundColor: c.accent,
      borderColor: c.accent,
      shadowColor: c.accent,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    chipText: { fontFamily: fonts.semibold, color: c.ink, fontSize: 13 },
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
