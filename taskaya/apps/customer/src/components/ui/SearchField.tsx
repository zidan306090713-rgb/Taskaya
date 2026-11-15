import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { tr } from '@/i18n';
import { colors, fonts, radius } from '@/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChangeText, placeholder }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, focused && styles.focus]}>
      <Ionicons name="search" size={20} color={focused ? colors.primaryLight : colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        autoCorrect={false}
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
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(5,16,34,0.72)',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
    shadowColor: colors.glow,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  focus: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(14,38,72,0.78)',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  input: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 16, color: colors.text },
});
