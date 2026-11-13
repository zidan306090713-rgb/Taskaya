import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

const BLOBS = [
  { color: '#1D6FE0', size: 0.95, x: -0.25, y: -0.15, dx: 70, dy: 50, dur: 22000, op: 0.42 },
  { color: '#0EA5C6', size: 0.8, x: 0.45, y: 0.05, dx: -60, dy: 70, dur: 26000, op: 0.3 },
  { color: '#3B5BDB', size: 0.9, x: -0.1, y: 0.6, dx: 80, dy: -50, dur: 30000, op: 0.32 },
  { color: '#22D3EE', size: 0.6, x: 0.55, y: 0.7, dx: -50, dy: -60, dur: 24000, op: 0.22 },
];
const RINGS = [1, 0.75, 0.5, 0.28];

function Blob({ b, w, h, animate }: { b: (typeof BLOBS)[number]; w: number; h: number; animate: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: b.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(v, { toValue: 0, duration: b.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, b.dur, v]);

  const size = Math.max(w, h) * b.size;
  const tx = v.interpolate({ inputRange: [0, 1], outputRange: [0, b.dx] });
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, b.dy] });
  const web = Platform.OS === 'web' ? ({ filter: 'blur(40px)' } as any) : null;

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: w * b.x, top: h * b.y, width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: tx }, { translateY: ty }] },
        web,
      ]}
    >
      {RINGS.map((r) => (
        <View
          key={r}
          style={{ position: 'absolute', width: size * r, height: size * r, borderRadius: size, backgroundColor: b.color, opacity: b.op / RINGS.length }}
        />
      ))}
    </Animated.View>
  );
}

export function NebulaBackground() {
  const { width, height } = useWindowDimensions();
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => setAnimate(!r));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (r) => setAnimate(!r));
    return () => sub.remove();
  }, []);

  const stars = useMemo(() => {
    let s = 7;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 28 }, () => ({ x: rnd(), y: rnd(), r: 1 + rnd() * 1.4, o: 0.25 + rnd() * 0.55 }));
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <LinearGradient colors={['#0A1F3D', '#071629', '#050F1E']} style={StyleSheet.absoluteFill} />
      {BLOBS.map((b, i) => (
        <Blob key={i} b={b} w={width} h={height} animate={animate} />
      ))}
      {stars.map((s, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: s.x * width, top: s.y * height, width: s.r * 2, height: s.r * 2, borderRadius: s.r, backgroundColor: '#CFE8FF', opacity: s.o }}
        />
      ))}
    </View>
  );
}
