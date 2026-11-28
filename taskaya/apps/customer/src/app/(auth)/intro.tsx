import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlowBg } from '@/components/home/GlowBg';
import { AuthHero } from '@/components/ui/AuthHero';
import { IntroSplash } from '@/components/IntroSplash';
import { tr } from '@/i18n';
import { setOnboarded } from '@/lib/onboarding';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

/**
 * الانترو (أول استخدام بس): هيدر زجاج (AuthHero) + 3 شرايح كروت زجاج بتتقلب بالسحب
 * + نقط + زرار التالي/ابدأ → صفحة التسجيل. "تخطي" و"عندي حساب" بيسجلوا إن الانترو اتشاف.
 */
type Icon = keyof typeof Ionicons.glyphMap;
type Slide = { icon: Icon; title: [string, string]; body: [string, string]; chips: [Icon, string, string][] };

const SLIDES: Slide[] = [
  {
    icon: 'grid',
    title: ['كل خدماتك في مكان واحد', 'All your services in one place'],
    body: ['سباكة وكهربا وتنضيف وأكتر، من مقدّمي خدمة موثوقين في العاشر من رمضان.', 'Plumbing, electrical, cleaning and more, from trusted providers in 10th of Ramadan City.'],
    chips: [['water-outline', 'سباكة', 'Plumbing'], ['flash-outline', 'كهربا', 'Electrical'], ['sparkles-outline', 'تنضيف', 'Cleaning']],
  },
  {
    icon: 'calendar',
    title: ['احجز في ثواني', 'Book in seconds'],
    body: ['اختار مقدّم الخدمة والميعاد اللي يناسبك، ولو الشغل محتاج معاينة هيوصلك عرض سعر توافق عليه الأول.', 'Pick a provider and a time that suits you. If the job needs a look first, you get a price quote to approve.'],
    chips: [['time-outline', 'ميعادك', 'Your time'], ['pricetag-outline', 'عرض سعر', 'Price quote'], ['star-outline', 'تقييمات', 'Ratings']],
  },
  {
    icon: 'notifications',
    title: ['تابع طلبك خطوة بخطوة', 'Track every step'],
    body: ['إشعار مع كل خطوة: اتأكد، اتبدأ، خلص. وكل طلباتك قدامك في مكان واحد.', 'A notification at every step: confirmed, started, done. All your orders in one place.'],
    chips: [['checkmark-circle-outline', 'اتأكد', 'Confirmed'], ['construct-outline', 'شغّال', 'In progress'], ['ribbon-outline', 'خلص', 'Done']],
  },
];

const ND = Platform.OS !== 'web';
const LTR = Platform.OS === 'web' ? ({ writingDirection: 'ltr' } as object) : { direction: 'ltr' as const };
const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)' } as object) : null;

export default function Intro() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: w } = useWindowDimensions();
  const dark = !!c.isDark;
  const ink = dark ? '#FFFFFF' : '#0B1B3F';
  const sub = dark ? 'rgba(255,255,255,0.72)' : 'rgba(11,27,63,0.66)';
  const glass = dark ? 'rgba(255,255,255,0.08)' : Platform.OS === 'android' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)';
  const edge = dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)';
  const chipBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)';
  const [x] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(0));
  const [page, setPage] = useState(0);
  const [splash, setSplash] = useState(true);
  const ref = useRef<ScrollView>(null);
  const done = useRef(false);
  const last = SLIDES.length - 1;

  useEffect(() => {
    if (splash) return;
    Animated.spring(rise, { toValue: 1, friction: 8, tension: 45, useNativeDriver: ND }).start();
  }, [rise, splash]);

  const leave = useCallback((to: '/register' | '/login') => {
    if (done.current) return;
    done.current = true;
    void setOnboarded();
    router.replace(to);
  }, []);

  const next = () => {
    if (page >= last) leave('/register');
    else ref.current?.scrollTo({ x: (page + 1) * w, animated: true });
  };
  const near = (i: number, a: number, b: number) =>
    x.interpolate({ inputRange: [(i - 1) * w, i * w, (i + 1) * w], outputRange: [a, b, a], extrapolate: 'clamp' });
  const up = (d: number) => ({ transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }] });

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: dark ? '#060D20' : '#F4F6FA' }]}>
      <GlowBg />
      <AuthHero compact />

      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const ox = e.nativeEvent.contentOffset.x;
          x.setValue(ox);
          const i = Math.round(ox / Math.max(1, w));
          if (i !== page) setPage(i);
        }}
        style={[styles.pager, LTR]}
        contentContainerStyle={LTR}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width: w }]}>
            <Animated.View style={[styles.card, WEB_FROST, { backgroundColor: glass, borderColor: edge }, up(40)]}>
              {Platform.OS === 'ios' ? <BlurView intensity={30} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
              <Animated.View
                style={[
                  styles.iconRing,
                  { backgroundColor: dark ? 'rgba(255,255,255,0.14)' : '#FFFFFF', transform: [{ scale: near(i, 0.72, 1) }] },
                ]}
              >
                <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.iconBall}>
                  <Ionicons name={s.icon} size={34} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
              <Text style={[styles.step, { color: c.accent }]}>{`${i + 1} / ${SLIDES.length}`}</Text>
              <Text style={[styles.title, { color: ink }]}>{tr(s.title[0], s.title[1])}</Text>
              <Text style={[styles.body, { color: sub }]}>{tr(s.body[0], s.body[1])}</Text>
              <View style={styles.chips}>
                {s.chips.map(([ic, ar, en]) => (
                  <View key={en} style={[styles.chip, { backgroundColor: chipBg, borderColor: edge }]}>
                    <Ionicons name={ic} size={15} color={c.accent} />
                    <Text style={[styles.chipText, { color: ink }]}>{tr(ar, en)}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      <Animated.View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }, up(70)]}>
        <View style={[styles.dots, LTR]}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => ref.current?.scrollTo({ x: i * w, animated: true })} hitSlop={8}>
              <Animated.View style={[styles.dot, { backgroundColor: c.accent, width: near(i, 8, 26), opacity: near(i, 0.3, 1) }]} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={next} accessibilityRole="button" style={({ pressed }) => [styles.btnWrap, pressed && { transform: [{ scale: 0.98 }] }]}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, LTR, { flexDirection: tr('row', 'row-reverse') as 'row' | 'row-reverse' }]}>
            <View style={styles.btnSheen} />
            <Text style={styles.btnText}>{page >= last ? tr('يلا نبدأ', "Let's start") : tr('التالي', 'Next')}</Text>
            <Ionicons name={page >= last ? 'checkmark' : (tr('arrow-forward', 'arrow-back') as Icon)} size={18} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => leave('/login')} hitSlop={8}>
          <Text style={[styles.login, { color: sub }]}>
            {tr('عندك حساب؟ ', 'Have an account? ')}
            <Text style={{ color: c.accent, fontFamily: fonts.bold }}>{tr('سجّل دخول', 'Log in')}</Text>
          </Text>
        </Pressable>
      </Animated.View>

      <Pressable
        onPress={() => leave('/register')}
        accessibilityRole="button"
        hitSlop={10}
        style={[styles.skip, WEB_FROST, { top: insets.top + 12 }, tr('l', 'r') === 'l' ? { left: 16 } : { right: 16 }]}
      >
        <Text style={styles.skipText}>{tr('تخطي', 'Skip')}</Text>
      </Pressable>
      {splash ? <IntroSplash onDone={() => setSplash(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 10, overflow: 'hidden' },
  pager: { flex: 1, marginTop: -62 },
  slide: { paddingHorizontal: 20 },
  card: {
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 24,
    shadowColor: '#0B1B3F',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  iconRing: {
    padding: 5,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#0B1B3F',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  iconBall: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  step: { marginTop: 16, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.5 },
  title: { marginTop: 6, fontFamily: fonts.bold, fontSize: 22, textAlign: 'center' },
  body: { marginTop: 8, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 24, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1 },
  chipText: { fontFamily: fonts.regular, fontSize: 13 },
  bottom: { paddingHorizontal: 20, paddingTop: 10, gap: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  btnWrap: { borderRadius: 18, overflow: 'hidden' },
  btn: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.12)' },
  btnText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },
  login: { fontFamily: fonts.regular, fontSize: 14, textAlign: 'center' },
  skip: {
    position: 'absolute',
    zIndex: 5,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  skipText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
});
