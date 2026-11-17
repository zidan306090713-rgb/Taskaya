import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { CategoryTile } from '@/components/ui/CategoryTile';
import { FeaturedTile } from '@/components/ui/FeaturedTile';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { TileGrid } from '@/components/ui/TileGrid';
import { t, tr } from '@/i18n';
import { Category, getCategories } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useDirectory, useProviderSearch } from '@/lib/useProviderSearch';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

export default function Home() {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const { dir, featured } = useDirectory();
  const results = useProviderSearch(q, dir);

  useEffect(() => {
    getCategories().then(setCats);
    if (session) {
      supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
        .then(({ data }) => setName(data?.full_name ?? ''));
    }
  }, [session]);

  const searching = q.trim().length > 0;

  return (
    <Screen title={`${t('greeting')} ${name}`} subtitle={t('tagline')}>
      <SearchField value={q} onChangeText={setQ} placeholder={tr('بتدور على أي', 'Looking for anything?')} />
      {searching ? (
        <>
          <Text style={styles.section}>{tr('نتائج البحث', 'Search results')}</Text>
          {results === null ? null : results.length === 0 ? (
            <Text style={styles.empty}>{tr('لا يوجد نتائج', 'No results')}</Text>
          ) : (
            <TileGrid data={results} keyOf={(p) => p.id} render={(p, size) => <FeaturedTile p={p} size={size} />} />
          )}
        </>
      ) : (
        <>
          <Text style={styles.section}>{t('categories')}</Text>
          <TileGrid data={cats} keyOf={(c) => c.id} aspect={0.6} render={(c, size, height) => <CategoryTile c={c} size={size} height={height} />} />
          <Text style={styles.section}>{tr('مقدمو خدمة مميزون', 'Featured providers')}</Text>
          <GlassCard strong radiusSize={radius.lg} style={styles.panel}>
            <TileGrid data={featured} keyOf={(p) => p.id} render={(p, size) => <FeaturedTile p={p} size={size} />} />
          </GlassCard>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  panel: { marginHorizontal: -spacing.md, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 12, backgroundColor: 'rgba(255,255,255,0.95)' },
  empty: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
});
