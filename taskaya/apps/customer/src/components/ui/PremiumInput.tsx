import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { isRTL, tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = TextInputProps & { label: string; icon: IconName; error?: string; highlighted?: boolean; labelInside?: boolean };

export function PremiumInput({ label, icon, error, highlighted = false, labelInside = false, secureTextEntry, onFocus, onBlur, ...props }: Props) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = !!secureTextEntry;
  const lit = focused || highlighted;

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
          transition: 'box-shadow .2s ease',
          boxShadow: lit
            ? `0 0 0 4px ${rgba(c.accent, 0.16)}, 0 8px 18px ${rgba(c.accent, 0.12)}`
            : 'inset 0 1px 2px rgba(11,31,58,0.06)',
        } as any)
      : null;

  return (
    <View style={styles.wrap}>
      {labelInside ? null : <Text style={styles.label}>{label}</Text>}
      {/* ستايل الصندوق ده ثابت ومش بيتغير مع الفوكس — تغييره كان بيطرد المؤشر على أندرويد */}
      <View style={[styles.field, !!error && styles.fieldError, webField]}>
        {/* الضوء الأزرق: طبقة منفصلة بتظهر بالشفافية بس */}
        <View style={[styles.ring, { opacity: lit && !error ? 1 : 0 }]} />
        <Ionicons name={icon} size={20} color={lit ? c.accentText : c.iconMuted} />
        <TextInput
          {...({ dataSet: { premium: '1' } } as any)}
          placeholderTextColor={c.placeholder}
          accessibilityLabel={label}
          selectionColor={c.accent}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          secureTextEntry={isPassword ? hidden : false}
          style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none', textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' } as any)]}
          {...props}
          placeholder={labelInside ? label : props.placeholder}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? tr('إظهار كلمة المرور', 'Show password') : tr('إخفاء كلمة المرور', 'Hide password')}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={21} color={lit ? c.accentText : c.iconMuted} />
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
    ring: {
      position: 'absolute',
      top: -1.5,
      left: -1.5,
      right: -1.5,
      bottom: -1.5,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: c.accent,
      backgroundColor: rgba(c.accent, 0.07),
      pointerEvents: 'none',
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
