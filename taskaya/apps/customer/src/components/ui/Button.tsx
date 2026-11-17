import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import { GlassCard } from './GlassCard';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline';
};

export function Button({ title, onPress, loading, variant = 'primary' }: Props) {
  const outline = variant === 'outline';
  const content = loading ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={[styles.text, { color: '#fff' }]}>{title}</Text>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.shadow, pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] }]}
    >
      {outline ? (
        <GlassCard navy radiusSize={radius.md} style={styles.base}>{content}</GlassCard>
      ) : (
        <LinearGradient colors={['#4AA3FF', '#1D6FE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.base, styles.primary]}>
          {content}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { shadowColor: colors.glow, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  base: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primary: { borderWidth: 1, borderColor: 'rgba(124,196,255,0.5)', borderTopColor: 'rgba(255,255,255,0.4)' },
  text: { fontFamily: fonts.bold, fontSize: 16 },
});
