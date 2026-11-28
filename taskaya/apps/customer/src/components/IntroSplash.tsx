import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import { t, tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

/**
 * أول 3 ثواني في الانترو: شاشة بتدرّج الهوية، كارت أبيض في حلقة زجاج واللوجو بيترسم جواه
 * (T → المدار → علامة الصح بتلف) → TASKAYA حرف حرف + الجملة → الشاشة بتطلع لفوق وتكشف الشرايح.
 * دوسة = تخطي. على أندرويد مفيش opacity في الدخول (scale بس).
 */
const ND = Platform.OS !== 'web';
const ANDROID = Platform.OS === 'android';
const LETTERS = 'TASKAYA'.split('');
const LEAVE_AT = 3400;
const LTR = Platform.OS === 'web' ? ({ writingDirection: 'ltr' } as object) : { direction: 'ltr' as const };

// ===== رياضة المدار (نفس اللوجو) =====
const CX = 55;
const CY = 48;
const RX = 46;
const RY = 13;
const TILT = (-18 * Math.PI) / 180;
function pt(a: number): [number, number] {
  const x = RX * Math.cos(a);
  const y = RY * Math.sin(a);
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
const seg = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeBack = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);

function DrawLogo({ start, size, c }: { start: number; size: number; c: Palette }) {
  const [tm, setTm] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setTm(Date.now() - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start]);

  const lg = seg(tm, 1150, 1900);
  const scale = 0.55 + 0.45 * easeBack(lg);
  const back = easeOut(seg(tm, 1350, 1950));
  const front = easeOut(seg(tm, 1700, 2300));
  const pop = seg(tm, 2200, 2550);
  const ang = 0.55 + (Math.max(0, tm - 2200) / 4500) * Math.PI * 2;
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
        <Mask id="splashMask" maskUnits="userSpaceOnUse" x="-20" y="-20" width="150" height="136">
          <Rect x="-20" y="-20" width="150" height="136" fill="#FFFFFF" />
          <Circle cx={bx} cy={by} r={pop > 0 ? 10.5 : 0} fill="#000000" />
        </Mask>
      </Defs>
      <Path d={BACK} fill="none" stroke={c.accentLight} strokeWidth={4} strokeLinecap="round" strokeDasharray={[ARC_LEN, ARC_LEN]} strokeDashoffset={ARC_LEN * (1 - back)} mask="url(#splashMask)" />
      {!isFront ? badge : null}
      <G opacity={clamp(lg * 3)} transform={`translate(55 47) scale(${scale.toFixed(3)}) translate(-55 -47)`}>
        <Rect x={37} y={23} width={36} height={10} rx={3} fill={c.accent} />
        <Rect x={50} y={29} width={10} height={42} rx={3} fill={c.accent} />
      </G>
      <Path d={FRONT} fill="none" stroke={c.accentLight} strokeWidth={4} strokeLinecap="round" strokeDasharray={[ARC_LEN, ARC_LEN]} strokeDashoffset={ARC_LEN * (1 - front)} mask="url(#splashMask)" />
      {isFront ? badge : null}
    </Svg>
  );
}

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const { c } = useTheme();
  const { height: h } = useWindowDimensions();
  const start = useRef(Date.now() - 900).current;
  const [ring] = useState(() => new Animated.Value(0));
  const [letters] = useState(() => LETTERS.map(() => new Animated.Value(0)));
  const [tag] = useState(() => new Animated.Value(0));
  const [city] = useState(() => new Animated.Value(0));
  const [out] = useState(() => new Animated.Value(0));
  const cb = useRef(onDone);
  useEffect(() => {
    cb.current = onDone;
  }, [onDone]);
  const leaving = useRef(false);
  const main = useRef<Animated.CompositeAnimation | null>(null);

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    main.current?.stop();
    Animated.timing(out, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: ND }).start(() => cb.current());
  }, [out]);

  useEffect(() => {
    main.current = Animated.parallel([
      Animated.spring(ring, { toValue: 1, friction: 6, tension: 55, useNativeDriver: ND }),
      ...letters.map((v, i) => Animated.spring(v, { toValue: 1, delay: 1350 + i * 70, friction: 7, tension: 70, useNativeDriver: ND })),
      Animated.timing(tag, { toValue: 1, delay: 2000, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
      Animated.spring(city, { toValue: 1, delay: 2300, friction: 7, tension: 70, useNativeDriver: ND }),
    ]);
    main.current.start();
    const timer = setTimeout(leave, LEAVE_AT);
    return () => {
      clearTimeout(timer);
      main.current?.stop();
    };
  }, [ring, letters, tag, city, leave]);

  return (
    <Animated.View style={[styles.root, { transform: [{ translateY: out.interpolate({ inputRange: [0, 1], outputRange: [0, -h] }) }] }]}>
      <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} />
      <View style={styles.glow2} />
      <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />

      <Pressable onPress={leave} style={styles.center} accessibilityRole="button" accessibilityLabel={tr('تخطي', 'Skip')}>
        <Animated.View style={[styles.ring, { transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
          <View style={styles.chip}>
            <DrawLogo start={start} size={104} c={c} />
          </View>
        </Animated.View>

        <View style={[styles.word, LTR]}>
          {LETTERS.map((ch, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.letter,
                {
                  opacity: ANDROID ? 1 : letters[i],
                  transform: [
                    { translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                    { scale: letters[i].interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }) },
                  ],
                },
              ]}
            >
              {ch}
            </Animated.Text>
          ))}
        </View>

        <Animated.Text
          style={[
            styles.tag,
            {
              opacity: ANDROID ? 1 : tag,
              transform: [
                { translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                { scale: tag.interpolate({ inputRange: [0, 1], outputRange: [ANDROID ? 0.01 : 0.9, 1] }) },
              ],
            },
          ]}
        >
          {t('tagline')}
        </Animated.Text>

        <Animated.View style={[styles.city, { opacity: ANDROID ? 1 : city, transform: [{ scale: city.interpolate({ inputRange: [0, 1], outputRange: [ANDROID ? 0.01 : 0.8, 1] }) }] }]}>
          <Ionicons name="location" size={14} color="#FFFFFF" />
          <Animated.Text style={styles.cityText}>{tr('العاشر من رمضان', '10th of Ramadan City')}</Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    overflow: 'hidden',
    backgroundColor: '#0B1B3F',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  glow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: -160, left: -140, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
  glow2: { position: 'absolute', width: 300, height: 300, borderRadius: 150, bottom: -120, right: -100, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%', pointerEvents: 'none' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { padding: 6, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  chip: {
    width: 132,
    height: 132,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  word: { flexDirection: 'row', marginTop: 24 },
  letter: { marginHorizontal: 4, fontFamily: fonts.bold, fontSize: 30, color: '#FFFFFF' },
  tag: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14.5, color: 'rgba(255,255,255,0.86)' },
  city: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  cityText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
});
