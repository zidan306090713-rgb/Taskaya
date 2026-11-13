import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProviderCard } from '@/components/ui/ProviderCard';
import { Screen } from '@/components/ui/Screen';
import { lang, t, tr } from '@/i18n';
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
      <View style={styles.grid}>
        {cats.map((c) => (
          <Link key={c.id} href={`/category/${c.id}`} asChild>
            <Pressable style={styles.cat}>
              <Text style={styles.catText}>{lang === 'ar' ? c.name_ar : c.name_en}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <Text style={styles.section}>{tr('مقدمو خدمة مميزون', 'Featured providers')}</Text>
      {featured.map((p) => <ProviderCard key={p.id} p={p} />)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  grid: { gap: spacing.md, marginBottom: spacing.md },
  cat: { backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.lg },
  catText: { fontFamily: fonts.semibold, fontSize: 18, color: colors.primary },
});
