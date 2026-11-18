import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProviderCard } from '@/components/ui/ProviderCard';
import { Screen } from '@/components/ui/Screen';
import { lang, tr } from '@/i18n';
import { Category, getCategory, getProviders, getSubcategories, ProviderCard as P, Subcategory } from '@/lib/api';
import { colors, fonts, spacing } from '@/theme';

const BLUE = '#2F80ED';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cat, setCat] = useState<Category | null>(null);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [active, setActive] = useState<string | undefined>();
  const [list, setList] = useState<P[]>([]);

  useEffect(() => {
    getCategory(id).then(setCat);
    getSubcategories(id).then(setSubs);
  }, [id]);

  useEffect(() => {
    getProviders({ categoryId: id, subcategoryId: active }).then(setList);
  }, [id, active]);

  const name = (x: { name_ar: string; name_en: string }) => (lang === 'ar' ? x.name_ar : x.name_en);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: cat ? name(cat) : '',
          headerTitleStyle: { fontFamily: fonts.bold, color: colors.text },
          headerStyle: { backgroundColor: '#E3EDFB' },
          headerShadowVisible: false,
          headerTintColor: BLUE,
        }}
      />
      <Screen subtitle={cat ? (lang === 'ar' ? cat.description_ar ?? '' : cat.description_en ?? '') : ''}>
        <View style={styles.chips}>
          <Chip label={tr('الكل', 'All')} on={!active} onPress={() => setActive(undefined)} />
          {subs.map((s) => (
            <Chip key={s.id} label={name(s)} on={active === s.id} onPress={() => setActive(s.id)} />
          ))}
        </View>
        {list.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color={BLUE} />
            </View>
            <Text style={styles.empty}>{tr('لا يوجد مقدمو خدمة بعد', 'No providers yet')}</Text>
          </View>
        ) : null}
        {list.map((p) => <ProviderCard key={p.id} p={p} />)}
      </Screen>
    </>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(47,128,237,0.3)',
  },
  chipOn: {
    backgroundColor: BLUE,
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  chipText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 13 },
  emptyWrap: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47,128,237,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(47,128,237,0.28)',
  },
  empty: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center' },
});
