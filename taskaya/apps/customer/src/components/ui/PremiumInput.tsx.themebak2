import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { tr } from '@/i18n';
import { colors, fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = TextInputProps & { label: string; icon: IconName; error?: string };

const BLUE = '#2F80ED';

// يمنع لون الـ autofill الأصفر/الغامق بتاع Chrome
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('premium-autofill-fix')) {
  const el = document.createElement('style');
  el.id = 'premium-autofill-fix';
  el.textContent = `
    input[data-premium]:-webkit-autofill,
    input[data-premium]:-webkit-autofill:hover,
    input[data-premium]:-webkit-autofill:focus {
      -webkit-text-fill-color: #0B1F3A !important;
      caret-color: #0B1F3A;
      -webkit-box-shadow: 0 0 0 1000px #F4F8FF inset !important;
      transition: background-color 9999s ease-in-out 0s;
    }
  `;
  document.head.appendChild(el);
}

export function PremiumInput({ label, icon, error, secureTextEntry, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = !!secureTextEntry;

  const webField =
    Platform.OS === 'web'
      ? ({
          transition: 'box-shadow .2s ease, border-color .2s ease, background-color .2s ease',
          boxShadow: focused
            ? '0 0 0 4px rgba(47,128,237,0.16), 0 8px 18px rgba(47,128,237,0.12)'
            : 'inset 0 1px 2px rgba(11,31,58,0.06)',
        } as any)
      : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocus, !!error && styles.fieldError, webField]}>
        <Ionicons name={icon} size={20} color={focused ? BLUE : '#8FA6C4'} />
        <TextInput
          {...({ dataSet: { premium: '1' } } as any)}
          placeholderTextColor="#A5B6CD"
          accessibilityLabel={label}
          selectionColor={BLUE}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          secureTextEntry={isPassword ? hidden : false}
          style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          {...props}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? tr('إظهار كلمة المرور', 'Show password') : tr('إخفاء كلمة المرور', 'Hide password')}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={21} color={focused ? BLUE : '#8FA6C4'} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={15} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { fontFamily: fonts.semibold, color: colors.text, fontSize: 13, marginBottom: 8, letterSpacing: 0.2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F4F8FF',
    borderWidth: 1.5,
    borderColor: '#DCE8FA',
  },
  fieldFocus: {
    backgroundColor: '#FFFFFF',
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fieldError: { borderColor: '#DC2626', backgroundColor: '#FFF5F5' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: '#B91C1C', lineHeight: 18 },
  input: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 16, color: '#0B1F3A', backgroundColor: 'transparent' },
});
