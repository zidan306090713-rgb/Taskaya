import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

const WEB_GLASS = Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)' } as any) : null;

/** شريط زجاجي عايم تحت: (عنوان صغير + قيمة) وزرار أساسي — نفس هوية FloatingTabBar */
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
  const sheen = c.isDark ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] as const) : (['rgba(255,255,255,0.75)', 'rgba(255,255,255,0)'] as const);
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 6 }]}>
      <View style={[styles.card, WEB_GLASS]}>
        <View style={[StyleSheet.absoluteFill, styles.layer]}>
          {Platform.OS === 'ios' ? <BlurView intensity={32} tint={c.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
          <LinearGradient colors={sheen} style={{ height: '55%' }} />
        </View>
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
    wrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 12, alignItems: 'center', pointerEvents: 'box-none' },
    card: {
      width: '100%',
      maxWidth: 720,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingStart: 18,
      paddingEnd: 10,
      borderRadius: 24,
      borderWidth: 1,
      backgroundColor: c.isDark
        ? Platform.OS === 'android' ? 'rgba(18,24,38,0.94)' : 'rgba(18,24,38,0.72)'
        : Platform.OS === 'android' ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.72)',
      borderColor: c.isDark ? 'rgba(255,255,255,0.12)' : Platform.OS === 'android' ? c.accentBorder : 'rgba(255,255,255,0.9)',
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.3 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    layer: { borderRadius: 24, overflow: 'hidden', pointerEvents: 'none' },
    label: { fontFamily: fonts.regular, fontSize: 12.5, color: c.textSecondary },
    value: { fontFamily: fonts.bold, fontSize: 18, color: c.text },
    btn: { height: 48, minWidth: 140, paddingHorizontal: 22, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    btnText: { fontFamily: fonts.bold, fontSize: 15.5, color: '#FFFFFF' },
  });
