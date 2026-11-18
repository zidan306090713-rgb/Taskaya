import { useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const STAR_COUNT = 35;
const STAR_COLOR = '#2F80ED';

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

function Star({ x, y, size, drift, duration, delay }: StarData) {
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
        backgroundColor: STAR_COLOR,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
}

export function NebulaBackground() {
  const stars = useMemo<StarData[]>(() => {
    const rand = makeRand(20261117);
    return Array.from({ length: STAR_COUNT }, () => {
      const r = rand();
      const size = r < 0.55 ? 3 + rand() * 4 : r < 0.88 ? 8 + rand() * 8 : 14 + rand() * 10;
      return {
        x: rand() * width,
        y: rand() * height,
        size,
        drift: 25 + rand() * 55,
        duration: 2000 + rand() * 2200,
        delay: rand() * 1500,
      };
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E3EDFB', overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }]}>
      {stars.map((s, i) => (
        <Star key={i} {...s} />
      ))}
    </View>
  );
}

export default NebulaBackground;
