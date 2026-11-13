import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { tr } from '@/i18n';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = TextInputProps & { label: string; error?: string };

// يمنع لون الـ autofill الفاتح بتاع Chrome على الويب
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('glass-autofill-fix')) {
  const el = document.createElement('style');
  el.id = 'glass-autofill-fix';
  el.textContent = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
      -webkit-text-fill-color: #EAF2FF !important;
      caret-color: #EAF2FF;
      -webkit-box-shadow: 0 0 0 1000px #0E2648 inset !important;
      transition: background-color 9999s ease-in-out 0s;
    }
  `;
  document.head.appendChild(el);
}

export function Input({ label, error, onFocus, onBlur, secureTextEntry, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = !!secureTextEntry;
  const web = { outlineStyle: 'none' } as any;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={label}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          secureTextEntry={isPassword ? hidden : false}
          style={[styles.input, web, isPassword && styles.inputWithIcon, focused && styles.focus, error ? { borderColor: colors.danger } : null]}
          {...props}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? tr('إظهار كلمة المرور', 'Show password') : tr('إخفاء كلمة المرور', 'Hide password')}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
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
    backgroundColor: 'rgba(7,22,41,0.55)',
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    color: colors.text,
    fontSize: 16,
  },
  inputWithIcon: { paddingEnd: 48 },
  eye: { position: 'absolute', end: 14, top: 0, bottom: 0, justifyContent: 'center' },
  focus: { borderColor: colors.primaryLight, shadowColor: colors.glow, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, backgroundColor: 'rgba(14,38,72,0.7)' },
  error: { fontFamily: fonts.regular, color: colors.danger, marginTop: spacing.xs, fontSize: 12 },
});
