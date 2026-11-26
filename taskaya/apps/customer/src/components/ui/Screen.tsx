import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, spacing } from '@/theme';

/**
 * padTop: المسافة من فوق (الافتراضي 56).
 * right: حاجة جنب العنوان في الهيدر الملوّن (زي الجرس).
 * hero: هيدر ملوّن بتدرّج لون التطبيق (نفس روح الشكل الجديد) بدل العنوان العادي.
 */
export function Screen({
  title,
  subtitle,
  padTop,
  hero,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  padTop?: number;
  hero?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (hero) {
    return (
      <ScrollView style={{ backgroundColor: 'transparent' }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <View style={[styles.heroInner, right ? styles.heroRow : null]}>
            <View style={{ flex: 1 }}>
              {title ? <Text style={styles.heroTitle} accessibilityRole="header">{title}</Text> : null}
              {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
            </View>
            {right}
          </View>
        </LinearGradient>
        <View style={styles.heroBody}>{children}</View>
      </ScrollView>
    );
  }
  return (
    <ScrollView
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={[styles.container, padTop !== undefined && { paddingTop: padTop }]}
      showsVerticalScrollIndicator={false}
    >
      {title ? <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">{title}</Text> : null}
      {subtitle ? <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text> : null}
      <View style={{ marginTop: spacing.lg }}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: 56, paddingBottom: 120, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 28 },
  subtitle: { fontFamily: fonts.regular, marginTop: spacing.xs },
  hero: { paddingHorizontal: 20, paddingBottom: 30, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroInner: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroTitle: { fontFamily: fonts.bold, fontSize: 24, color: '#FFFFFF' },
  heroSub: { fontFamily: fonts.regular, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroBody: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: spacing.lg, paddingTop: 18 },
});
