import React, { useEffect, useId, useMemo, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layoutRTL } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

const BAR_HEIGHT = 66;
const BAR_MAX_WIDTH = 440;
const SIDE_GAP = 16;
const BALL = 50;
const BALL_TOP = -18;
const BALL_CY = BALL_TOP + BALL / 2;
const NOTCH_R = 31;
const NOTCH_DX = Math.sqrt(Math.max(NOTCH_R * NOTCH_R - BALL_CY * BALL_CY, 1));
const MIN_C = BAR_HEIGHT / 2 + NOTCH_DX + 2;
// شفافية الشريط: الويب عليه بلور حقيقي مقصوص بشكل التجويف، الموبايل شبه مصمت
const BAR_A = Platform.OS === 'web' ? 0.72 : 0.92;

function buildPath(w: number, h: number, cx: number) {
  const r = h / 2;
  const dy = BALL_CY;
  const dx = Math.sqrt(Math.max(NOTCH_R * NOTCH_R - dy * dy, 1));
  const c = Math.min(Math.max(cx, r + dx + 2), w - r - dx - 2);
  return [
    `M ${r} 0`,
    `L ${c - dx} 0`,
    `A ${NOTCH_R} ${NOTCH_R} 0 1 0 ${c + dx} 0`,
    `L ${w - r} 0`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `L ${w} ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ');
}

export default function FloatingTabBar({ state, descriptors, navigation, base }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(width - SIDE_GAP * 2, BAR_MAX_WIDTH);
  const side = Math.round((width - barWidth) / 2);
  const count = state.routes.length;
  // مسافة داخلية من الطرفين: عشان التجويف ميخبطش في الحواف الدايرية، فيفضل تحت الكورة بالظبط
  const pad = count > 1 ? Math.ceil(Math.max(0, (MIN_C - barWidth / (2 * count)) / (1 - 1 / count))) : 0;
  const tabWidth = (barWidth - pad * 2) / count;
  // في العربي التابات بتتقلب (الأول على اليمين)، فبنقلب مكان الكورة والتجويف معاها
  const vIndex = layoutRTL() ? count - 1 - state.index : state.index;

  // الكورة بتتحرك على الـ native thread (مش بتشغل JavaScript خالص أثناء الحركة)
  const [x] = useState(() => new Animated.Value(vIndex * tabWidth));

  // التجويف بيتحسب مرة واحدة لكل تاب — مش 60 مرة في الثانية
  const notchX = pad + vIndex * tabWidth + tabWidth / 2;
  const path = useMemo(() => buildPath(barWidth, BAR_HEIGHT, notchX), [barWidth, notchX]);
  // id مختلف لكل شريط: لو اتنين بنفس الـ id و الأول مخفي، Chrome مش بيرسم التدرّج (الشريط يبان شفاف)
  const gid = "navGrad" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    Animated.timing(x, {
      toValue: vIndex * tabWidth,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [state.index, tabWidth, x]);

  const activeRoute = state.routes[state.index];
  const activeOptions = descriptors[activeRoute.key].options;

  return (
    <View
      style={{ position: 'absolute', left: side, width: barWidth, bottom: Math.max(insets.bottom, 12), height: BAR_HEIGHT, pointerEvents: 'box-none', ...((Platform.OS === 'web' ? { writingDirection: 'ltr' } : { direction: 'ltr' }) as object) }}
    >
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)', clipPath: `path('${path}')` } as any]} />
      ) : null}
      <Svg width={barWidth} height={BAR_HEIGHT} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.tabGradient[0]} stopOpacity={BAR_A} />
            <Stop offset="1" stopColor={c.tabGradient[1]} stopOpacity={BAR_A} />
          </LinearGradient>
          <LinearGradient id={gid + 's'} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
            <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={path} fill={`url(#${gid})`} />
        <Path d={path} fill={`url(#${gid}s)`} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
      </Svg>

      <View style={[styles.row, { paddingHorizontal: pad }]}>
        {(layoutRTL() ? [...state.routes].reverse() : state.routes).map((route: any) => {
          const { options } = descriptors[route.key];
          const focused = route.key === state.routes[state.index].key;
          const color = focused ? '#FFFFFF' : 'rgba(255,255,255,0.72)';
          const label = options.title ?? route.name;
          const onPress = () => {
            if (focused) return;
            try {
              const event = navigation?.emit?.({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (event?.defaultPrevented) return;
            } catch {}
            // تابات جوه مسار (زي /pro): نروح للعنوان كامل
            if (base) {
              router.navigate((route.name === 'index' ? base : base + '/' + route.name) as any);
              return;
            }
            if (navigation?.navigate) navigation.navigate(route.name, route.params);
            else router.navigate(('/' + (route.name === 'index' ? '' : route.name.replace(/\/index$/, ''))) as any);
          };
          return (
            <Pressable key={route.key} onPress={onPress} style={[styles.item, { outlineStyle: 'none' } as any]}>
              <View style={{ opacity: focused ? 0 : 1 }}>
                {options.tabBarIcon?.({ color, size: 24, focused })}
              </View>
              <Text style={[styles.label, { color, fontFamily: fonts.semibold }, Platform.OS === 'web' ? ({ writingDirection: layoutRTL() ? 'rtl' : 'ltr' } as any) : null]} numberOfLines={Platform.OS === 'web' ? undefined : 1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.ball,
          {
            left: pad + tabWidth / 2 - BALL / 2,
            transform: [{ translateX: x }],
            backgroundColor: c.ballBg,
            borderColor: c.ballBorder,
            shadowColor: c.accent,
          },
        ]}
      >
        {activeOptions.tabBarIcon?.({ color: c.ballIcon, size: 24, focused: true })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 9, paddingTop: 14 },
  label: { fontSize: 11, marginTop: 2, alignSelf: 'stretch', textAlign: 'center' },
  ball: {
    position: 'absolute',
    top: BALL_TOP,
    width: BALL,
    height: BALL,
    borderRadius: BALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    shadowColor: '#2F80ED',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 0,
    pointerEvents: 'none',
  },
});
