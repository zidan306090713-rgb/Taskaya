import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/theme';

export function Screen({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <ScrollView style={{ backgroundColor: 'transparent' }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={{ marginTop: spacing.lg }}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: 56, paddingBottom: 120, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  subtitle: { fontFamily: fonts.regular, color: colors.textSecondary, marginTop: spacing.xs },
});
