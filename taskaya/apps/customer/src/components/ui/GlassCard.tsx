import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  blur?: boolean; // blur حقيقي على الموبايل (ثقيل في القوائم، استخدمه بحذر)
  strong?: boolean;
  radiusSize?: number;
};

export function GlassCard({ children, style, blur = false, strong = false, radiusSize = radius.lg }: Props) {
  const web =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)' } as any)
      : null;
  return (
    <View style={[styles.wrap, { borderRadius: radiusSize, backgroundColor: strong ? colors.glassStrong : colors.glass }, web, style]}>
      {blur && Platform.OS !== 'web' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient
        colors={[colors.glassHighlight, 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: 'rgba(255,255,255,0.28)',
    shadowColor: colors.glow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
});
