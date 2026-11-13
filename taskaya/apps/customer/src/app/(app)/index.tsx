import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { lang, t } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

type Category = { id: string; name_ar: string; name_en: string };

export default function Home() {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('id, name_ar, name_en')
      .order('sort_order')
      .then(({ data }) => setCats(data ?? []));
    if (session) {
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => setName(data?.full_name ?? ''));
    }
  }, [session]);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>{t('greeting')} {name}</Text>
      <Text style={styles.tagline}>{t('tagline')}</Text>
      <Text style={styles.section}>{t('categories')}</Text>
      <View style={styles.grid}>
        {cats.map((c) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.cardText}>{lang === 'ar' ? c.name_ar : c.name_en}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: spacing.xl }} />
      <Button title={t('logout')} variant="outline" onPress={() => supabase.auth.signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: 64 },
  greeting: { fontFamily: fonts.bold, fontSize: 26, color: colors.text },
  tagline: { fontFamily: fonts.regular, color: colors.textSecondary, marginTop: spacing.xs },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  grid: { gap: spacing.md },
  card: { backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.lg },
  cardText: { fontFamily: fonts.semibold, fontSize: 18, color: colors.primary },
});
