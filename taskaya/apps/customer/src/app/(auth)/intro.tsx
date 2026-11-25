import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { tr } from '@/i18n';
import { setOnboarded } from '@/lib/onboarding';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

/**
 * الانترو (أول استخدام بس): سرعة الضوء → ومضة → الـ T بيظهر والمدار بيترسم →
 * علامة الصح بتلف → TASKAYA + لمعة + "في العاشر من رمضان" → الكاميرا بتطير جوه اللوجو → صفحة التسجيل.
 */
const ND = Platform.OS !== 'web';
const LETTERS = 'TASKAYA'.split('');
const EXIT_AT = 5400;
const LTR = Platform.OS === 'web' ? ({ writingDirection: 'ltr' } as object) : { direction: 'ltr' as const };

// ===== رياضة المدار (نفس اللوجو) =====
const CX = 55;
const CY = 48;
const RX = 46;
const RY = 13;
const TILT = (-18 * Math.PI) / 180;
function pt(t: number): [number, number] {
  const x = RX * Math.cos(t);
  const y = RY * Math.sin(t);
  return [CX + x * Math.cos(TILT) - y * Math.sin(TILT), CY + x * Math.sin(TILT) + y * Math.cos(TILT)];
}
function arc(a: number, b: number) {
  let d = '';
  for (let i = 0; i <= 40; i++) {
    const [x, y] = pt(a + ((b - a) * i) / 40);
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d;
}
const BACK = arc(Math.PI, Math.PI * 2);
const FRONT = arc(0, Math.PI);
const ARC_LEN = 110;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeBack = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);

// اللوجو بيترسم قدامك (ليه ساعة لوحده)
function IntroLogo({ start, size, c }: { start: number; size: number; c: Palette }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setT(Date.now() - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start]);

  const lg = seg(t, 1150, 1900);
  const scale = 0.55 + 0.45 * easeBack(lg);
  const back = easeOut(seg(t, 1350, 1950));
  const front = easeOut(seg(t, 1700, 2300));
  const pop = seg(t, 2200, 2550);
  const ang = 0.55 + (Math.max(0, t - 2200) / 4500) * Math.PI * 2;
  const [bx, by] = pt(ang);
  const isFront = Math.sin(ang) > 0;
  const badge =
    pop > 0 ? (
      <G transform={`translate(${bx.toFixed(2)} ${by.toFixed(2)}) scale(${easeBack(pop).toFixed(3)})`}>
        <Circle r={6.6} fill={c.accent} />
        <Path d="M-3 0.2 L-0.9 2.4 L3.2 -2" fill="none" stroke="#FFFFFF" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    ) : null;
  const k = size / 110;

  return (
    <Svg width={110 * k} height={96 * k} viewBox="0 0 110 96">
      <Defs>
        <Mask id="introMask" maskUnits="userSpaceOnUse" x="-20" y="-20" width="150" height="136">
          <Rect x="-20" y="-20" width="150" height="136" fill="#FFFFFF" />
          <Circle cx={bx} cy={by} r={pop > 0 ? 10.5 : 0} fill="#000000" />
        </Mask>
      </Defs>
      <Path d={BACK} fill="none" stroke={c.accentLight} strokeWidth={4} strokeLinecap="round" strokeDasharray={[ARC_LEN, ARC_LEN]} strokeDashoffset={ARC_LEN * (1 - back)} mask="url(#introMask)" />
      {!isFront ? badge : null}
      <G opacity={clamp(lg * 3)} transform={`translate(55 47) scale(${scale.toFixed(3)}) translate(-55 -47)`}>
        <Rect x={37} y={23} width={36} height={10} rx={3} fill={c.accent} />
        <Rect x={50} y={29} width={10} height={42} rx={3} fill={c.accent} />
      </G>
      <Path d={FRONT} fill="none" stroke={c.accentLight} strokeWidth={4} strokeLinecap="round" strokeDasharray={[ARC_LEN, ARC_LEN]} strokeDashoffset={ARC_LEN * (1 - front)} mask="url(#introMask)" />
      {isFront ? badge : null}
    </Svg>
  );
}

// نجوم بتندفع من النص لبره (سرعة الضوء) وبعدين بتهدى وتقف مكانها
function seeded(n: number, w: number, h: number) {
  let s = 17;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const far = Math.hypot(w, h) * 0.6;
  return Array.from({ length: n }, () => ({ a: r() * Math.PI * 2, r0: 4 + r() * 30, r1: 70 + r() * far, size: 1 + r() * 1.8, o: 0.45 + r() * 0.55 }));
}

export default function Intro() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: w, height: h } = useWindowDimensions();
  const ox = w / 2;
  const oy = h * 0.42;
  const stars = useMemo(() => seeded(70, w, h), [w, h]);
  const start = useRef(Date.now()).current;
  const [warp] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));
  const [letters] = useState(() => LETTERS.map(() => new Animated.Value(0)));
  const [shine] = useState(() => new Animated.Value(0));
  const [city] = useState(() => new Animated.Value(0));
  const [tag] = useState(() => new Animated.Value(0));
  const [out] = useState(() => new Animated.Value(0));
  const [wordW, setWordW] = useState(280);
  const main = useRef<Animated.CompositeAnimation | null>(null);
  const done = useRef(false);

  const exit = useCallback(() => {
    if (done.current) return;
    done.current = true;
    main.current?.stop();
    void setOnboarded();
    Animated.timing(out, { toValue: 1, duration: 650, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(() =>
      router.replace('/register'),
    );
  }, [out]);

  useEffect(() => {
    const at = (v: Animated.Value, delay: number, duration: number, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue: 1, delay, duration, easing, useNativeDriver: ND });
    main.current = Animated.parallel([
      at(warp, 0, 1500),
      at(flash, 1050, 550, Easing.out(Easing.quad)),
      at(glow, 1150, 1050),
      ...letters.map((v, i) => Animated.spring(v, { toValue: 1, delay: 2450 + i * 80, friction: 7, tension: 70, useNativeDriver: ND })),
      at(shine, 3300, 800, Easing.inOut(Easing.quad)),
      at(city, 3350, 600),
      at(tag, 3700, 600),
    ]);
    main.current.start();
    const timer = setTimeout(exit, EXIT_AT);
    return () => {
      clearTimeout(timer);
      main.current?.stop();
    };
  }, [warp, flash, glow, letters, shine, city, tag, exit]);

  const fadeOut = out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const rise = (v: Animated.Value, d: number) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: out.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }) }]}>
      {/* سرعة الضوء */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeOut }]} pointerEvents="none">
        {stars.map((s, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: ox - s.size / 2,
              top: oy - s.size / 2,
              width: s.size,
              height: s.size,
              borderRadius: s.size,
              backgroundColor: '#DCE6FF',
              opacity: s.o,
              transform: [
                { translateX: warp.interpolate({ inputRange: [0, 1], outputRange: [Math.cos(s.a) * s.r0, Math.cos(s.a) * s.r1] }) },
                { translateY: warp.interpolate({ inputRange: [0, 1], outputRange: [Math.sin(s.a) * s.r0, Math.sin(s.a) * s.r1] }) },
                { rotate: `${s.a}rad` },
                { scaleX: warp.interpolate({ inputRange: [0, 0.08, 0.6, 1], outputRange: [1, 16, 4, 1] }) },
              ],
            }}
          />
        ))}
      </Animated.View>

      {/* توهّج ناعم ورا اللوجو */}
      <Animated.View
        pointerEvents="none"
        style={[styles.abs, { left: ox - 230, top: oy - 230, opacity: glow, transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }]}
      >
        <Svg width={460} height={460}>
          <Defs>
            <RadialGradient id="introGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c.accent} stopOpacity={0.5} />
              <Stop offset="0.4" stopColor={c.accent} stopOpacity={0.15} />
              <Stop offset="1" stopColor={c.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={230} cy={230} r={230} fill="url(#introGlow)" />
        </Svg>
      </Animated.View>

      {/* المشهد: اللوجو + الاسم + المكان + الجملة (وبيطير لقدام في الآخر) */}
      <Animated.View
        style={[
          styles.abs,
          styles.scene,
          { left: 0, right: 0, top: oy - 120, opacity: fadeOut, transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }] },
        ]}
      >
        <IntroLogo start={start} size={210} c={c} />

        <View style={[styles.word, LTR]} onLayout={(e) => setWordW(e.nativeEvent.layout.width)}>
          {LETTERS.map((ch, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.letter,
                { textShadowColor: c.accent },
                {
                  opacity: letters[i],
                  transform: [
                    { translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
                    { scale: letters[i].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                  ],
                },
              ]}
            >
              {ch}
            </Animated.Text>
          ))}
          {/* لمعة ضوء بتعدي على الحروف */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shine,
              { transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-70, wordW + 20] }) }, { rotate: '18deg' }] },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        <Animated.View style={[styles.cityRow, rise(city, 12)]}>
          <Ionicons name="location" size={15} color={c.accentLight} />
          <Text style={[styles.city, { color: c.accentLight }]}>{tr('في العاشر من رمضان', 'in 10th of Ramadan City')}</Text>
        </Animated.View>

        <Animated.Text style={[styles.tag, rise(tag, 10)]}>{tr('كل خدماتك. في مكان واحد.', 'All your services. One place.')}</Animated.Text>
      </Animated.View>

      {/* الومضة */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.abs,
          {
            left: ox - 30,
            top: oy - 30,
            opacity: flash.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 0] }),
            transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 14] }) }],
          },
        ]}
      >
        <Svg width={60} height={60}>
          <Defs>
            <RadialGradient id="introFlash" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="0.35" stopColor="#BED2FF" stopOpacity={0.85} />
              <Stop offset="1" stopColor="#BED2FF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={30} cy={30} r={30} fill="url(#introFlash)" />
        </Svg>
      </Animated.View>

      <Pressable onPress={exit} style={[styles.skip, { top: insets.top + 14 }]} accessibilityRole="button" hitSlop={10}>
        <Text style={styles.skipText}>{tr('تخطي', 'Skip')}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#030817', zIndex: 10, overflow: 'hidden' },
  abs: { position: 'absolute' },
  scene: { alignItems: 'center' },
  word: { flexDirection: 'row', marginTop: 4, overflow: 'hidden', paddingHorizontal: 6 },
  letter: {
    fontFamily: fonts.bold,
    fontSize: 36,
    color: '#FFFFFF',
    marginHorizontal: 5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  shine: { position: 'absolute', top: -10, bottom: -10, left: 0, width: 46 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  city: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: 0.3 },
  tag: { marginTop: 8, fontFamily: fonts.semibold, fontSize: 14, color: 'rgba(255,255,255,0.68)' },
  skip: {
    position: 'absolute',
    end: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  skipText: { fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
});
