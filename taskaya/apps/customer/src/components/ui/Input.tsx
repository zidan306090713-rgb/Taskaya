import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ComponentProps, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { tr } from '@/i18n';
import { fonts, radius, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = TextInputProps & { label: string; error?: string; icon?: IconName };

const FIELD_BG = '#2F80ED';
const ICON = 'rgba(255,255,255,0.85)';

// يمنع لون الـ autofill بتاع Chrome على الويب
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('glass-autofill-fix')) {
  const el = document.createElement('style');
  el.id = 'glass-autofill-fix';
  el.textContent = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
      -webkit-text-fill-color: #FFFFFF !important;
      caret-color: #FFFFFF;
      -webkit-box-shadow: 0 0 0 1000px ${FIELD_BG} inset !important;
      transition: background-color 9999s ease-in-out 0s;
    }
  `;
  document.head.appendChild(el);
}

export function Input({ label, error, icon, onFocus, onBlur, secureTextEntry, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = !!secureTextEntry;
  const web = { outlineStyle: 'none' } as any;

  // ظل داخلي حقيقي على الويب
  const insetWeb =
    Platform.OS === 'web'
      ? ({
          boxShadow: focused
            ? 'inset 0 3px 8px rgba(8,36,100,0.6), inset 0 -1px 0 rgba(255,255,255,0.35), 0 0 0 3px rgba(255,255,255,0.35)'
            : 'inset 0 3px 8px rgba(8,36,100,0.6), inset 0 -1px 0 rgba(255,255,255,0.3)',
        } as any)
      : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocus, error ? styles.fieldError : null, insetWeb]}>
        {/* ظل داخلي من فوق (للموبايل، ومكمّل للويب) */}
        <LinearGradient
          colors={['rgba(8,36,100,0.5)', 'rgba(8,36,100,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.innerShadow}
          pointerEvents="none"
        />
        {icon ? (
          <View style={styles.leading} pointerEvents="none">
            <Ionicons name={icon} size={19} color={focused ? '#FFFFFF' : ICON} />
          </View>
        ) : null}
        <TextInput
          placeholderTextColor="rgba(255,255,255,0.7)"
          accessibilityLabel={label}
          selectionColor="#FFFFFF"
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          secureTextEntry={isPassword ? hidden : false}
          style={[styles.input, web, icon && styles.inputWithLeading, isPassword && styles.inputWithIcon]}
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
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={21} color={focused ? '#FFFFFF' : ICON} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontFamily: fonts.semibold, color: '#FFFFFF', marginBottom: 6, fontSize: 13, letterSpacing: 0.3 },
  field: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: FIELD_BG,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(8,36,100,0.55)',
    borderBottomColor: 'rgba(255,255,255,0.4)', // الحافة السفلية الفاتحة = إحساس الحفر
  },
  fieldFocus: {
    borderColor: '#FFFFFF',
    borderBottomColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  fieldError: { borderColor: '#F87171', borderBottomColor: '#F87171' },
  innerShadow: { position: 'absolute', top: 0, left: 0, right: 0, height: 20 },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    color: '#FFFFFF',
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  inputWithLeading: { paddingStart: 46 },
  inputWithIcon: { paddingEnd: 48 },
  leading: { position: 'absolute', start: 15, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  eye: { position: 'absolute', end: 14, top: 0, bottom: 0, justifyContent: 'center' },
  error: { fontFamily: fonts.regular, color: '#FCA5A5', marginTop: spacing.xs, fontSize: 12 },
});
