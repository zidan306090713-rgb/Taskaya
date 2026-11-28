import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

const R = 26;
const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)' } as any) : null;

/** كارت زجاجي لصفحات الدخول والتسجيل — نفس قيم ProviderRow */
export function AuthCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const sheen = c.isDark ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] as const) : (['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)'] as const);
  return (
    <View
      style={[
        styles.card,
        WEB_FROST,
        {
          backgroundColor: c.isDark ? 'rgba(30,36,52,0.55)' : Platform.OS === 'android' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)',
          borderColor: c.isDark ? 'rgba(255,255,255,0.12)' : Platform.OS === 'android' ? c.accentBorder : 'rgba(255,255,255,0.9)',
          shadowColor: c.accent,
          shadowOpacity: c.isDark ? 0.22 : 0.12,
        },
        style,
      ]}
    >
      <View style={styles.clip}>
        {Platform.OS === 'ios' ? <BlurView intensity={28} tint={c.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={sheen} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: R, borderWidth: 1, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 0 },
  clip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: R, overflow: 'hidden', pointerEvents: 'none' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
});
