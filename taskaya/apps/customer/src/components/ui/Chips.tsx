import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
export type ChipItem = { key: string | null; label: string; icon?: IconName };

/** كبسولات في سطر واحد بيتسحب بالعرض (فلتر) */
export function Chips({ items, value, onChange, loading }: { items: ChipItem[]; value: string | null; onChange: (k: string | null) => void; loading?: boolean }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key ?? 'all'} onPress={() => onChange(it.key)} style={[styles.chip, on && styles.on]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            {it.icon ? <Ionicons name={it.icon} size={15} color={on ? '#FFFFFF' : c.accentText} /> : null}
            <Text style={[styles.text, on && styles.textOn]}>{it.label}</Text>
          </Pressable>
        );
      })}
      {loading ? [0, 1, 2].map((i) => <Skeleton key={i} width={90} height={38} radius={999} />) : null}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: { gap: 8, paddingTop: 14, paddingBottom: 4 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 15,
      height: 38,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    on: { backgroundColor: c.accent, borderColor: c.accent },
    text: { fontFamily: fonts.semibold, fontSize: 13, color: c.text },
    textOn: { color: '#FFFFFF' },
  });
