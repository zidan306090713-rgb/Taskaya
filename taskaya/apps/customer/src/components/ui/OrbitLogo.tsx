import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { useTheme } from '@/providers/ThemeProvider';

// أبعاد الرسمة الأصلية (بتتكبر/تتصغر حسب size)
const W = 110;
const H = 96;
const CX = 55;
const CY = 48;
const RX = 46; // نص عرض المدار
const RY = 13; // نص ارتفاع المدار
const TILT_DEG = -18;
const TILT = (TILT_DEG * Math.PI) / 180;
const STEPS = 36; // عدد النقط اللي بنحسبها على المدار (كل ما تزيد الحركة تبقى أنعم)

/**
 * لوجو تاسكاية: كوكب + مدار + نجمة بتلف.
 * بياخد لون التطبيق تلقائيًا، والحركة شغالة على معالج الرسم (مش بتتقّل الشاشة).
 */
export function OrbitLogo({ size = 110, animated = true }: { size?: number; animated?: boolean }) {
  const { c } = useTheme();
  const k = size / W;
  const star = Math.round(11 * k);
  const [t] = useState(() => new Animated.Value(0));

  // بنحسب مكان النجمة على المدار المايل مرة واحدة، والـ interpolate بيمشّيها بينهم
  const orbit = useMemo(() => {
    const input: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const th = (i / STEPS) * Math.PI * 2;
      const x = RX * Math.cos(th);
      const y = RY * Math.sin(th);
      input.push(i / STEPS);
      xs.push((CX + x * Math.cos(TILT) - y * Math.sin(TILT)) * k - star / 2);
      ys.push((CY + x * Math.sin(TILT) + y * Math.cos(TILT)) * k - star / 2);
    }
    return { input, xs, ys };
  }, [k, star]);

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })
    );
    loop.start();
    return () => loop.stop();
  }, [animated, t]);

  const translateX = t.interpolate({ inputRange: orbit.input, outputRange: orbit.xs });
  const translateY = t.interpolate({ inputRange: orbit.input, outputRange: orbit.ys });

  return (
    <View style={{ width: W * k, height: H * k }} accessibilityRole="image" accessibilityLabel="Taskaya">
      <Svg width={W * k} height={H * k} viewBox={`0 0 ${W} ${H}`}>
        {/* الكوكب + لمعة */}
        <Circle cx={CX} cy={CY} r={24} fill={c.accent} />
        <Circle cx={CX - 8} cy={CY - 8} r={7} fill={c.accentLight} opacity={0.85} />
        {/* المدار */}
          <Ellipse transform={`rotate(${TILT_DEG} ${CX} ${CY})`} cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke={c.accentLight} strokeWidth={4} />
      </Svg>
      {/* النجمة اللي بتلف */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: star,
          height: star,
          borderRadius: star / 2,
          backgroundColor: c.accent,
          borderWidth: Math.max(1.5, 2 * k),
          borderColor: '#FFFFFF',
          transform: [{ translateX }, { translateY }],
        }}
      />
    </View>
  );
}
