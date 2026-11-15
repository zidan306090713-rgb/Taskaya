import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { CategoryTile } from '@/components/ui/CategoryTile';
import { FeaturedTile } from '@/components/ui/FeaturedTile';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { TileGrid } from '@/components/ui/TileGrid';
import { t, tr } from '@/i18n';
import { Category, getCategories, getProviders, ProviderCard as P } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

export default function Home() {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [cats, setCats] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<P[]>([]);

  useEffect(() => {
    getCategories().then(setCats);
    getProviders({}).then((ps) => setFeatured(ps.filter((p) => p.is_featured)));
    if (session) {
      supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
        .then(({ data }) => setName(data?.full_name ?? ''));
    }
  }, [session]);

  return (
    <Screen title={`${t('greeting')} ${name}`} subtitle={t('tagline')}>
      <Text style={styles.section}>{t('categories')}</Text>
      <TileGrid data={cats} keyOf={(c) => c.id} aspect={0.6} render={(c, size, height) => <CategoryTile c={c} size={size} height={height} />} />
      <Text style={styles.section}>{tr('مقدمو خدمة مميزون', 'Featured providers')}</Text>
      <GlassCard strong radiusSize={radius.lg} style={styles.panel}>
        <TileGrid data={featured} keyOf={(p) => p.id} render={(p, size) => <FeaturedTile p={p} size={size} />} />
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  panel: { marginHorizontal: -spacing.md, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 12, backgroundColor: 'rgba(7,22,41,0.6)' },
});
