import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { Category } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

// احتياطي للأقسام القديمة لو عمود icon فاضي
const FALLBACK: Record<string, IconName> = {
  '10000000-0000-0000-0000-000000000001': 'sparkles',
  '10000000-0000-0000-0000-000000000002': 'home',
  '10000000-0000-0000-0000-000000000003': 'construct',
};

const labelOf = (c: Category) => tr(c.name_ar, c.name_en);

// الأيقونة جاية من الداش بورد (مثلاً car-outline) — بنستخدم النسخة المليانة (car) عشان تبقى زي باقي الشكل
function iconOf(c: Category): IconName {
  const raw = c.icon?.trim();
  if (raw) {
    const filled = raw.replace(/-outline$/, '');
    if (filled in Ionicons.glyphMap) return filled as IconName;
    if (raw in Ionicons.glyphMap) return raw as IconName;
  }
  return FALLBACK[c.id] ?? 'apps';
}

// لحد 4 أقسام: صف ثابت موزّع بالتساوي — أكتر من كده: شريط بيتسحب بالعرض
export function CategoryCarousel({ data }: { data: Category[] }) {
  const { c: th } = useTheme();
  const styles = useMemo(() => makeStyles(th), [th]);

  if (data.length === 0) return null;

  const items = data.map((c) => (
    <View key={c.id} style={data.length > 4 ? styles.itemFixed : styles.item}>
      <Pressable
        onPress={() => router.push(`/category/${c.id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={labelOf(c)}
        style={({ pressed }) => [styles.circleWrap, pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] }]}
      >
        <LinearGradient colors={th.circleGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circle}>
          <Ionicons name={iconOf(c)} size={30} color={th.accentText} />
        </LinearGradient>
      </Pressable>
      <Text style={styles.label} numberOfLines={2}>
        {labelOf(c)}
      </Text>
    </View>
  ));

  if (data.length > 4) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {items}
      </ScrollView>
    );
  }
  return <View style={styles.row}>{items}</View>;
}

const makeStyles = (th: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 6 },
    scroll: { paddingVertical: 6, paddingHorizontal: 4, gap: 4 },
    item: { flex: 1, maxWidth: 120, alignItems: 'center', gap: 8 },
    itemFixed: { width: 88, alignItems: 'center', gap: 8 },
    circleWrap: { borderRadius: 34 },
    circle: {
      width: 68,
      height: 68,
      borderRadius: 34,
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
