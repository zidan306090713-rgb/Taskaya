import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = TextInputProps & { label: string; icon: IconName; error?: string };

export function PremiumInput({ label, icon, error, secureTextEntry, onFocus, onBlur, ...props }: Props) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = !!secureTextEntry;

  // يمنع لون الـ autofill بتاع Chrome، ويتبع الثيم الحالي
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let el = document.getElementById('premium-autofill-fix');
    if (!el) {
      el = document.createElement('style');
      el.id = 'premium-autofill-fix';
      document.head.appendChild(el);
    }
    el.textContent = `
      input[data-premium]:-webkit-autofill,
      input[data-premium]:-webkit-autofill:hover,
      input[data-premium]:-webkit-autofill:focus {
        -webkit-text-fill-color: ${c.ink} !important;
        caret-color: ${c.ink};
        -webkit-box-shadow: 0 0 0 1000px ${c.fieldBg} inset !important;
        transition: background-color 9999s ease-in-out 0s;
      }
    `;
  }, [c.ink, c.fieldBg]);

  const webField =
    Platform.OS === 'web'
      ? ({
          transition: 'box-shadow .2s ease, border-color .2s ease, background-color .2s ease',
          boxShadow: focused
            ? `0 0 0 4px ${rgba(c.accent, 0.16)}, 0 8px 18px ${rgba(c.accent, 0.12)}`
            : 'inset 0 1px 2px rgba(11,31,58,0.06)',
        } as any)
      : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && Platform.OS !== 'android' && styles.fieldFocus, !!error && styles.fieldError, webField]}>
        <Ionicons name={icon} size={20} color={focused ? c.accentText : c.iconMuted} />
        <TextInput
          {...({ dataSet: { premium: '1' } } as any)}
          placeholderTextColor={c.placeholder}
          accessibilityLabel={label}
          selectionColor={c.accent}
          onFocus={(e) => { console.log('🔵 FOCUS', label); setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { console.log('⚪ BLUR', label); setFocused(false); onBlur?.(e); }}
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
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={21} color={focused ? c.accentText : c.iconMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={15} color={c.dangerText} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { marginBottom: 18 },
    label: { fontFamily: fonts.semibold, color: c.text, fontSize: 13, marginBottom: 8, letterSpacing: 0.2 },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      height: 56,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: c.fieldBg,
      borderWidth: 1.5,
      borderColor: c.fieldBorder,
    },
    fieldFocus: {
      backgroundColor: c.fieldBgFocus,
      borderColor: c.accent,
      shadowColor: c.accent,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    fieldError: { borderColor: '#DC2626', backgroundColor: c.isDark ? 'rgba(220,38,38,0.1)' : '#FFF5F5' },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 },
    errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: c.dangerText, lineHeight: 18 },
    input: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 16, color: c.ink, backgroundColor: 'transparent' },
  });
