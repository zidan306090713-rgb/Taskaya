import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { Category } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

// الأيقونة بالـ id (مش بالاسم) عشان تفضل ثابتة لو الاسم اتغير
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  '10000000-0000-0000-0000-000000000001': 'sparkles', // مغاسل السجاد
  '10000000-0000-0000-0000-000000000002': 'home', // هاوس كيبينج
  '10000000-0000-0000-0000-000000000003': 'construct', // الفنيين
};

const labelOf = (c: Category) => tr(c.name_ar, c.name_en);
const iconOf = (c: Category): keyof typeof Ionicons.glyphMap => ICONS[c.id] ?? 'apps';

// صف ثابت للأقسام الرئيسية (3 أقسام) موزّعين بالتساوي
export function CategoryCarousel({ data }: { data: Category[] }) {
  const { c: th } = useTheme();
  const styles = useMemo(() => makeStyles(th), [th]);

  if (data.length === 0) return null;

  return (
    <View style={styles.row}>
      {data.map((c) => (
        <View key={c.id} style={styles.item}>
          <Pressable
            onPress={() => router.push(`/category/${c.id}` as any)}
            accessibilityRole="button"
            accessibilityLabel={labelOf(c)}
            style={({ pressed }) => [styles.circleWrap, pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] }]}
          >
            <LinearGradient colors={th.circleGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circle}>
              <Ionicons name={iconOf(c)} size={32} color={th.accentText} />
            </LinearGradient>
          </Pressable>
          <Text style={styles.label} numberOfLines={2}>
            {labelOf(c)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (th: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 6 },
    item: { flex: 1, maxWidth: 120, alignItems: 'center', gap: 8 },
    circleWrap: { borderRadius: 36 },
    circle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: th.cardBorder,
      shadowColor: th.shadow,
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 0,
    },
    label: { fontFamily: fonts.bold, fontSize: 13, color: th.text, textAlign: 'center', paddingHorizontal: 4 },
  });
