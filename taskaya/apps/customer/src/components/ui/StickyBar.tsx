import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

/** شريط ثابت تحت: (عنوان صغير + قيمة) وزرار أساسي */
export function StickyBar({
  label,
  value,
  title,
  onPress,
  disabled,
  busy,
}: {
  label?: string | null;
  value?: string | null;
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + 10 }]}>
      <View style={styles.inner}>
        <View style={{ flex: 1 }}>
          {label ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
          {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
        </View>
        <Pressable onPress={onPress} disabled={disabled || busy} style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }, (disabled || busy) && { opacity: 0.6 }]}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>{title}</Text>}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 12,
      paddingHorizontal: 16,
      backgroundColor: c.isDark ? '#121826' : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: c.accentBorder,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
    },
    inner: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
    label: { fontFamily: fonts.regular, fontSize: 12.5, color: c.textSecondary },
    value: { fontFamily: fonts.bold, fontSize: 18, color: c.text },
    btn: { height: 50, minWidth: 140, paddingHorizontal: 22, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    btnText: { fontFamily: fonts.bold, fontSize: 15.5, color: '#FFFFFF' },
  });
