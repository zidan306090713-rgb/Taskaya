import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

const { width, height } = Dimensions.get('window');
const STAR_COUNT = Platform.OS === 'android' ? 7 : 16;

// مولّد أرقام ثابت (pure): نفس التوزيع كل مرة
function makeRand(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type StarData = {
  x: number;
  y: number;
  size: number;
  drift: number;
  duration: number;
  delay: number;
};

type StarLook = { color: string; glow: string; glowColor: string };

function Star({ x, y, size, drift, duration, delay, color, glow, glowColor }: StarData & StarLook) {
  const [move] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(move, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(move, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [move, duration, delay]);

  const translateY = move.interpolate({ inputRange: [0, 1], outputRange: [0, -drift] });
  const translateX = move.interpolate({ inputRange: [0, 1], outputRange: [0, drift * 0.6] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 1,
        ...(Platform.OS === 'web'
          ? ({ boxShadow: `0 0 ${Math.round(size * 1.1)}px ${Math.round(size * 0.15)}px ${glow}` } as any)
          : {
              shadowColor: glowColor,
              shadowOpacity: 0.8,
              shadowRadius: size * 0.8,
              shadowOffset: { width: 0, height: 0 },
            }),
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
}

export function NebulaBackground() {
  const { c } = useTheme();
  const stars = useMemo<StarData[]>(() => {
    const rand = makeRand(20261117);
    return Array.from({ length: STAR_COUNT }, () => {
      const r = rand();
      const size = r < 0.55 ? 3 + rand() * 3 : r < 0.88 ? 7 + rand() * 6 : 14 + rand() * 8;
      return {
        x: rand() * width,
        y: rand() * height,
        size,
        drift: 20 + rand() * 40,
        duration: 2800 + rand() * 2400,
        delay: rand() * 1500,
      };
    });
  }, []);

  const look: StarLook = {
    color: c.isDark ? c.accentLight : c.accent,
    glow: c.starGlow,
    glowColor: c.isDark ? c.accentLight : 'transparent',
  };

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }]}>
      <LinearGradient
        colors={c.bgGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {stars.map((s, i) => (
        <Star key={i} {...s} {...look} />
      ))}
    </View>
  );
}

export default NebulaBackground;
