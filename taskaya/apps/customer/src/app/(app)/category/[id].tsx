import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProviderCard } from '@/components/ui/ProviderCard';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { lang, tr } from '@/i18n';
import { Category, getCategory, getProviders, getSubcategories, ProviderCard as P, Subcategory } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, spacing } from '@/theme';

export default function CategoryScreen() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cat, setCat] = useState<Category | null>(null);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [active, setActive] = useState<string | undefined>();
  const [list, setList] = useState<P[] | null>(null);

  useEffect(() => {
    getCategory(id).then(setCat);
    getSubcategories(id).then(setSubs);
  }, [id]);

  useEffect(() => {
    let alive = true;
    setList(null);
    getProviders({ categoryId: id, subcategoryId: active }).then((r) => {
      if (alive) setList(r);
    });
    return () => {
      alive = false;
    };
  }, [id, active]);

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
      <Screen subtitle={cat ? (lang === 'ar' ? cat.description_ar ?? '' : cat.description_en ?? '') : ''}>
        <View style={styles.chips}>
          <Chip label={tr('الكل', 'All')} on={!active} onPress={() => setActive(undefined)} />
          {subs.map((s) => (
            <Chip key={s.id} label={name(s)} on={active === s.id} onPress={() => setActive(s.id)} />
          ))}
        </View>
        {list === null ? <ListSkeleton rows={4} height={96} /> : list.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color={c.accentText} />
            </View>
            <Text style={styles.empty}>{tr('لا يوجد مقدمو خدمة بعد', 'No providers yet')}</Text>
          </View>
        ) : null}
        {(list ?? []).map((p) => <ProviderCard key={p.id} p={p} />)}
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
  });
