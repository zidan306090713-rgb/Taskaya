import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { lang } from '@/i18n';
import { Category } from '@/lib/api';
import { colors, fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const BLUE = '#2F80ED';
const ICONS: Record<string, IconName> = {
  Cleaning: 'sparkles',
  'Home Keeping': 'home',
  'Home Maintenance': 'construct',
};

export function CategoryTile({ c, size, height }: { c: Category; size: number; height: number }) {
  const [scale] = useState(() => new Animated.Value(1));
  const press = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 30, bounciness: 4 }).start();

  const icon = ICONS[c.name_en] ?? 'apps';
  const label = lang === 'ar' ? c.name_ar : c.name_en;

  const iconBox = Math.max(36, Math.min(48, Math.round(size * 0.22)));
  const fontSize = Math.max(12.5, Math.min(17, size / 9.5));

  return (
    <Link href={`/category/${c.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => press(0.95)}
        onPressOut={() => press(1)}
        style={{ width: size, height }}
      >
        <Animated.View style={[styles.card, { width: size, height, transform: [{ scale }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(235,243,255,0.85)']}
            style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          />
          <LinearGradient colors={['#4AA3FF', '#1D6FE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
          <LinearGradient
            colors={['#5BB0FF', '#1D6FE0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.iconWrap, { width: iconBox, height: iconBox, borderRadius: Math.round(iconBox * 0.34) }]}
          >
            <Ionicons name={icon} size={Math.round(iconBox * 0.52)} color="#FFFFFF" />
          </LinearGradient>
          <Text
            style={[styles.name, { fontSize, lineHeight: Math.round(fontSize * 1.25) }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: BLUE,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 0,
  },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: BLUE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  name: { fontFamily: fonts.bold, color: colors.text, textAlign: 'center', letterSpacing: 0.2 },
});
