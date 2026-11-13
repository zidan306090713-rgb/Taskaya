import { useEffect, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { ProviderCard } from '@/components/ui/ProviderCard';
import { Screen } from '@/components/ui/Screen';
import { tr } from '@/i18n';
import { getProviders, ProviderCard as P } from '@/lib/api';
import { colors, fonts, radius, spacing } from '@/theme';

export default function Explore() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<P[]>([]);

  useEffect(() => {
    const id = setTimeout(() => getProviders({ search: q.trim() || undefined }).then(setList), 300);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <Screen title={tr('استكشاف', 'Explore')}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={tr('ابحث عن مقدم خدمة...', 'Search providers...')}
        placeholderTextColor={colors.textSecondary}
        style={styles.search}
      />
      {list.map((p) => <ProviderCard key={p.id} p={p} />)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(7,22,41,0.55)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
});
