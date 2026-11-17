import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { tr } from '@/i18n';
import { fonts, radius } from '@/theme';

const NAVY_TOP = '#12397A';
const NAVY_BOTTOM = '#0A2250';
const NAVY_BORDER = '#08193D';
const ICON = '#9CC7FF';
const PLACEHOLDER = 'rgba(214,230,255,0.65)';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChangeText, placeholder }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.shadow, focused && styles.shadowFocus]}>
      <LinearGradient
        colors={[NAVY_TOP, NAVY_BOTTOM]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.wrap, focused && styles.focus]}
      >
        <Ionicons name="search" size={20} color={focused ? '#FFFFFF' : ICON} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor="#7CC4FF"
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
            <Ionicons name="close-circle" size={20} color={ICON} />
          </Pressable>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.lg,
    marginBottom: 4,
    shadowColor: '#0A2250',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  shadowFocus: {
    shadowColor: '#2F80ED',
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: NAVY_BORDER,
    borderTopColor: 'rgba(124,196,255,0.35)',
  },
  focus: {
    borderColor: '#2F80ED',
    borderTopColor: '#2F80ED',
  },
  input: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 16, color: '#FFFFFF' },
});
