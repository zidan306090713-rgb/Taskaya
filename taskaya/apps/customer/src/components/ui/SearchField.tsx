import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba } from '@/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChangeText, placeholder }: Props) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [focused, setFocused] = useState(false);

  const webField =
    Platform.OS === 'web'
      ? ({
          transition: 'box-shadow .2s ease, border-color .2s ease',
          boxShadow: focused
            ? `0 0 0 4px ${rgba(c.accent, 0.16)}, 0 8px 18px ${rgba(c.accent, 0.12)}`
            : `0 4px 14px ${rgba(c.accent, 0.1)}`,
        } as any)
      : null;

  return (
    <View style={[styles.wrap, focused && styles.focus, webField]}>
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
        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
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
      shadowColor: c.accent,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    focus: { borderColor: c.accent, shadowOpacity: 0.28 },
    input: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 16, color: c.ink, backgroundColor: 'transparent' },
  });
