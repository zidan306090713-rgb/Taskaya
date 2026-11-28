import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Animated, DeviceEventEmitter, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { isRTL, tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba } from '@/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  /** الحقل فوق خلفية ملوّنة (الهيدر الأزرق): شكل زجاجي وإضاءة بيضا */
  onDark?: boolean;
};

export function SearchField({ value, onChangeText, placeholder, onDark = false }: Props) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [focused, setFocused] = useState(false);
  const [f] = useState(() => new Animated.Value(0));

  // الإضاءة: طبقات منفصلة بس (مش بنغيّر شكل أبو الـ TextInput). أندرويد: من غير أنيميشن شفافية.
  useEffect(() => {
    Animated.timing(f, {
      toValue: focused ? 1 : 0,
      duration: Platform.OS === 'android' ? 0 : 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [focused, f]);

  const web = Platform.OS === 'web';
  const webField = web
    ? ({
        transition: 'box-shadow .2s ease, border-color .2s ease',
        boxShadow: focused
          ? `0 0 0 4px ${rgba(c.accent, 0.16)}, 0 8px 18px ${rgba(c.accent, 0.12)}`
          : `0 4px 14px ${rgba(c.accent, 0.1)}`,
      } as any)
    : null;
  const webGlass = web
    ? ({
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 10px 26px rgba(11,27,63,0.30)',
      } as any)
    : null;
  const webGlow = web ? ({ boxShadow: '0 0 30px rgba(255,255,255,0.16)' } as any) : null;

  const iconColor = focused ? c.accentText : c.iconMuted;

  return (
    <View>
      {onDark ? (
        <>
          <Animated.View
            style={[styles.glow, webGlow, { opacity: f, transform: [{ scale: f.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }]}
          />
          <View style={[styles.glass, webGlass]} />
          <Animated.View style={[styles.glassFocus, { opacity: f }]} />
          <View style={styles.sheen} />
        </>
      ) : null}
      <View style={[styles.wrap, onDark && styles.wrapDark, !onDark && focused && Platform.OS !== 'android' && styles.focus, !onDark && webField]}>
        <Ionicons name="search" size={20} color={iconColor} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          onFocus={() => {
            setFocused(true);
            if (Platform.OS === 'android') DeviceEventEmitter.emit('taskaya:kb', true);
          }}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={c.accent}
          accessibilityLabel={placeholder}
          style={[
            styles.input,
            onDark && styles.inputDark,
            { textAlign: isRTL ? 'right' : 'left' },
            web && ({ outlineStyle: 'none', textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' } as any),
          ]}
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

const R = 16;
const fill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

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
    focus: { borderColor: c.accent, shadowOpacity: 0.28 },
    // الزجاجي: الصف نفسه شفاف وثابت، والشكل كله في الطبقات اللي وراه
    wrapDark: { height: 48, borderRadius: R, gap: 10, backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0 },
    glass: {
      ...fill,
      borderRadius: R,
      backgroundColor: c.searchBg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      pointerEvents: 'none',
      ...Platform.select({
        ios: { shadowColor: '#0B1B3F', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
        default: {},
      }),
    },
    glassFocus: {
      ...fill,
      borderRadius: R,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: rgba(c.accent, 0.22),
      pointerEvents: 'none',
    },
    sheen: { position: 'absolute', top: 1, left: 18, right: 18, height: 1, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.18)', pointerEvents: 'none' },
    glow: {
      position: 'absolute',
      top: -5,
      left: -5,
      right: -5,
      bottom: -5,
      borderRadius: R + 5,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 0,
      borderColor: 'rgba(255,255,255,0.35)',
      pointerEvents: 'none',
      ...Platform.select({
        ios: { shadowColor: '#FFFFFF', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
        default: {},
      }),
    },
    input: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 16, color: c.ink, backgroundColor: 'transparent', paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' },
    inputDark: { color: c.ink },
  });
