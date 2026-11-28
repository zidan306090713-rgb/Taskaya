import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { isRTL, tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba } from '@/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  /** الحقل فوق خلفية ملوّنة (الهيدر الأزرق): الإضاءة بيضا بدل لون التطبيق */
  onDark?: boolean;
};

export function SearchField({ value, onChangeText, placeholder, onDark = false }: Props) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [focused, setFocused] = useState(false);

  const webField =
    Platform.OS === 'web'
      ? ({
          transition: 'box-shadow .2s ease, border-color .2s ease',
          boxShadow: onDark
            ? focused
              ? '0 14px 30px rgba(11,27,63,0.38)'
              : '0 6px 18px rgba(11,27,63,0.22)'
            : focused
              ? `0 0 0 4px ${rgba(c.accent, 0.16)}, 0 8px 18px ${rgba(c.accent, 0.12)}`
              : `0 4px 14px ${rgba(c.accent, 0.1)}`,
        } as any)
      : null;
  const webRing = Platform.OS === 'web' ? ({ transition: 'opacity .2s ease, transform .2s ease' } as any) : null;

  return (
    <View>
      {/* حلقة الإضاءة على الخلفية الملوّنة: طبقة منفصلة، مش بنغيّر شكل أبو الـ TextInput */}
      {onDark ? <View style={[styles.ring, webRing, { opacity: focused ? 1 : 0, transform: [{ scale: focused ? 1 : 0.98 }] }]} /> : null}
      <View style={[styles.wrap, onDark && styles.wrapDark, !onDark && focused && Platform.OS !== 'android' && styles.focus, webField]}>
        <Ionicons name="search" size={20} color={focused ? c.accentText : c.iconMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={c.accent}
          accessibilityLabel={placeholder}
          style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }, Platform.OS === 'web' && ({ outlineStyle: 'none', textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' } as any)]}
        />
        {value ? (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={tr('مسح البحث', 'Clear search')}
          >
            <Ionicons name="close-circle" size={20} color={c.iconMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      height: 56,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: c.searchBg,
      borderWidth: 1.5,
      borderColor: c.fieldBorder,
      shadowColor: c.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    wrapDark: { height: 46, borderRadius: 14, gap: 10, borderColor: 'rgba(255,255,255,0.9)', shadowColor: '#0B1B3F', shadowOpacity: 0.22 },
    focus: { borderColor: c.accent, shadowOpacity: 0.28 },
    ring: {
      position: 'absolute',
      top: -5,
      left: -5,
      right: -5,
      bottom: -5,
      borderRadius: 19,
      borderWidth: 2.5,
      borderColor: 'rgba(255,255,255,0.75)',
      backgroundColor: 'rgba(255,255,255,0.12)',
      pointerEvents: 'none',
    },
    input: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 16, color: c.ink, backgroundColor: 'transparent' },
  });
