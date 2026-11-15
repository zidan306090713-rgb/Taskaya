import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { lang } from '@/i18n';
import { Category } from '@/lib/api';
import { colors, fonts, radius } from '@/theme';
import { GlassCard } from './GlassCard';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, IconName> = {
  Cleaning: 'sparkles',
  'Home Keeping': 'home',
  'Home Maintenance': 'construct',
};

export function CategoryTile({ c, size, height }: { c: Category; size: number; height: number }) {
  const icon = ICONS[c.name_en] ?? 'apps';
  const label = lang === 'ar' ? c.name_ar : c.name_en;

  const iconBox = Math.max(30, Math.min(42, Math.round(size * 0.18)));
  const fontSize = Math.max(14, Math.min(20, size / 9.5));

  return (
    <Link href={`/category/${c.id}`} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={label} style={{ width: size, height }}>
        <GlassCard strong radiusSize={radius.md} style={[styles.tile, { width: size, height, backgroundColor: 'rgba(5,16,34,0.82)' }]}>
          <View style={[styles.iconWrap, { width: iconBox, height: iconBox, borderRadius: Math.round(iconBox * 0.32) }]}>
            <Ionicons name={icon} size={Math.round(iconBox * 0.56)} color={colors.primaryLight} />
          </View>
          <Text
            style={[styles.name, { fontSize, lineHeight: Math.round(fontSize * 1.3) }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {label}
          </Text>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 8 },
  iconWrap: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.glow,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  name: { fontFamily: fonts.bold, color: colors.text, textAlign: 'center', letterSpacing: 0.2 },
});
