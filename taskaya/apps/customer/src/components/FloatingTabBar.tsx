import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

const BAR_HEIGHT = 66;
const BAR_MAX_WIDTH = 440;
const SIDE_GAP = 16;
const BALL = 50;
const BALL_TOP = -18;
const BALL_CY = BALL_TOP + BALL / 2;
const NOTCH_R = 31;

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

export default function FloatingTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(width - SIDE_GAP * 2, BAR_MAX_WIDTH);
  const side = Math.round((width - barWidth) / 2);
  const count = state.routes.length;
  const tabWidth = barWidth / count;

  const [x] = useState(() => new Animated.Value(state.index * tabWidth));
  const [cx, setCx] = useState(state.index * tabWidth + tabWidth / 2);

  useEffect(() => {
    const id = x.addListener(({ value }) => setCx(value + tabWidth / 2));
    return () => x.removeListener(id);
  }, [tabWidth, x]);

  useEffect(() => {
    Animated.timing(x, {
      toValue: state.index * tabWidth,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [state.index, tabWidth, x]);

  const activeRoute = state.routes[state.index];
  const activeOptions = descriptors[activeRoute.key].options;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: side, width: barWidth, bottom: Math.max(insets.bottom, 12), height: BAR_HEIGHT }}
    >
      <Svg width={barWidth} height={BAR_HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="navGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.tabGradient[0]} />
            <Stop offset="1" stopColor={c.tabGradient[1]} />
          </LinearGradient>
        </Defs>
        <Path
          d={buildPath(barWidth, BAR_HEIGHT, cx)}
          fill="url(#navGrad)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1.5}
        />
      </Svg>

      <View style={styles.row}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? '#FFFFFF' : 'rgba(255,255,255,0.72)';
          const label = options.title ?? route.name;
          const onPress = () => {
            if (focused) return;
            try {
              const event = navigation?.emit?.({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (event?.defaultPrevented) return;
            } catch {}
            if (navigation?.navigate) navigation.navigate(route.name, route.params);
            else router.navigate(('/' + (route.name === 'index' ? '' : route.name.replace(/\/index$/, ''))) as any);
          };
          return (
            <Pressable key={route.key} onPress={onPress} style={[styles.item, { outlineStyle: 'none' } as any]}>
              <View style={{ opacity: focused ? 0 : 1 }}>
                {options.tabBarIcon?.({ color, size: 24, focused })}
              </View>
              <Text style={[styles.label, { color, fontFamily: fonts.semibold }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[styles.ball, { left: tabWidth / 2 - BALL / 2, transform: [{ translateX: x }], backgroundColor: c.ballBg, borderColor: c.ballBorder, shadowColor: c.accent }]}
      >
        {activeOptions.tabBarIcon?.({ color: c.ballIcon, size: 24, focused: true })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 9, paddingTop: 14 },
  label: { fontSize: 11, marginTop: 2 },
  ball: {
    position: 'absolute',
    top: BALL_TOP,
    width: BALL,
    height: BALL,
    borderRadius: BALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#BFDBFE',
    shadowColor: '#2F80ED',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
});
