import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = TextInputProps & { label: string; error?: string };

export function Input({ label, error, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, error ? { borderColor: colors.danger } : null]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontFamily: fonts.semibold, color: colors.text, marginBottom: spacing.xs, fontSize: 14 },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    color: colors.text,
    fontSize: 16,
  },
  error: { fontFamily: fonts.regular, color: colors.danger, marginTop: spacing.xs, fontSize: 12 },
});
