import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, spacing } from '@/theme';

/**
 * padTop: المسافة من فوق. الافتراضي 56 للشاشات اللي ملهاش هيدر،
 * والشاشات اللي ليها هيدر ممكن تقللها عشان متبقاش فيه مساحة فاضية.
 */
export function Screen({ title, subtitle, padTop, children }: { title?: string; subtitle?: string; padTop?: number; children: ReactNode }) {
  const { c } = useTheme();
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
});
