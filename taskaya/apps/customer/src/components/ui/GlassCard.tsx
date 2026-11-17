import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  blur?: boolean;
  strong?: boolean;
  navy?: boolean; // تدرج كحلي زي حقل البحث
  radiusSize?: number;
};

export function GlassCard({ children, style, blur = false, strong = false, navy = false, radiusSize = radius.lg }: Props) {
  const web =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)' } as any)
      : null;
  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: radiusSize, backgroundColor: strong ? colors.glassStrong : colors.glass },
        navy && styles.navy,
        !navy && web,
        style,
      ]}
    >
      {!navy && blur && Platform.OS !== 'web' ? <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient
        colors={navy ? ['#12397A', '#0A2250'] : [colors.glassHighlight, 'rgba(255,255,255,0)']}
        start={navy ? { x: 0, y: 0 } : { x: 0, y: 0 }}
        end={navy ? { x: 0, y: 1 } : { x: 0.7, y: 1 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderTopColor: colors.border,
    shadowColor: colors.glow,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  navy: {
    backgroundColor: '#0A2250',
    borderColor: '#08193D',
    borderTopColor: 'rgba(124,196,255,0.35)',
    shadowColor: '#0A2250',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
});
