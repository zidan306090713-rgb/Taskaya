import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

/**
 * فلاتر الأقسام جوه الهيدر: حلقة (carousel دايري).
 * - متوزعة بالتساوي على عرض السطر كله.
 * - السحب يمين/شمال بيلف الحلقة: الأيقونة اللي توصل للحافة بتصغر وتنزل تحتها
 *   وتطلع من الحافة التانية.
 * - الضغط على فلتر بيختاره ويلفه للنص من أقصر طريق.
 * - أي قسم جديد بياخد مكانه لوحده (المسافات محسوبة من العدد).
 */
const TILE_W = 72;
const BOX = 42;
const PAD_TOP = 6;
const ROW_H = 92;
const MIN_GAP = 76;
const WEB = Platform.OS === 'web';
const WEB_BLUR = WEB
  ? ({ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', transition: 'background-color .2s ease, border-color .2s ease, transform .2s ease' } as any)
  : null;
const WEB_ROW = WEB
  ? ({
      userSelect: 'none',
      touchAction: 'pan-y',
      maskImage: 'linear-gradient(90deg, transparent 0, #000 7%, #000 93%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 7%, #000 93%, transparent 100%)',
    } as any)
  : null;

const wrap = (v: number, n: number) => ((v % n) + n) % n;
/** أقصر فرق على الحلقة: من -n/2 لـ n/2 */
const ringDelta = (v: number, n: number) => wrap(v + n / 2, n) - n / 2;

type Props<T> = {
  cats: T[];
  catId: string | null;
  onPick: (id: string | null) => void;
  icon: (cat: T) => string;
  name: (cat: T) => string;
};

export function CatTiles<T extends { id: string }>({ cats, catId, onPick, icon, name }: Props<T>) {
  const { c } = useTheme();
  const items: (T | null)[] = [null, ...cats];
  const N = items.length;
  const sel = catId ?? 'all';
  const selIdx = Math.max(0, items.findIndex((it) => (it?.id ?? 'all') === sel));
  const dir = tr('rtl', 'ltr') === 'rtl' ? -1 : 1;

  const [W, setW] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [off] = useState(() => new Animated.Value(selIdx));
  const dragged = useRef(false);

  // كام فلتر يبان في نفس الوقت: عدد فردي لو الأقسام أكتر من المساحة
  let vis = Math.max(3, Math.floor(W / MIN_GAP));
  if (N > vis && vis % 2 === 0) vis -= 1;
  const shown = Math.min(N, vis);
  const sp = W > 0 ? W / shown : 0;

  const geo = useRef({ N, sp, dir });
  useEffect(() => {
    geo.current = { N, sp, dir };
  });

  const springTo = (to: number) =>
    Animated.spring(off, { toValue: to, useNativeDriver: false, speed: 14, bounciness: 6 }).start();

  const goTo = (i: number) =>
    off.stopAnimation((o) => {
      springTo(o + ringDelta(i - o, geo.current.N));
    });

  useEffect(() => {
    goTo(selIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selIdx, N]);

  const pan = useMemo(() => {
    let start = 0;
    const want = (_: unknown, g: { dx: number; dy: number }) =>
      geo.current.N > 1 && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy);
    const end = (_: unknown, g: { dx: number; vx: number }) => {
      const { sp: s, dir: d, N: n } = geo.current;
      if (!s) return;
      const cur = start - (g.dx * d) / s;
      let jump = -(g.vx * d * 180) / s;
      jump = Math.max(-n, Math.min(n, jump));
      springTo(Math.round(cur + jump));
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: want,
      onMoveShouldSetPanResponderCapture: want,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragged.current = true;
        off.stopAnimation((v) => {
          start = v;
        });
      },
      onPanResponderMove: (_, g) => {
        const { sp: s, dir: d } = geo.current;
        if (s) off.setValue(start - (g.dx * d) / s);
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [off]);

  const anims = useMemo(() => {
    const half = N / 2;
    const h = shown / 2;
    const inner = Math.max(0, h - 0.5);
    const inR = [0, half - h, half - inner, half + inner, half + h, N];
    return Array.from({ length: N }, (_, i) => {
      // u = مكان العنصر على الحلقة (0..N)، النص عند N/2
      const u = Animated.modulo(Animated.add(Animated.multiply(off, -1), i + half), N);
      return {
        tx: u.interpolate({ inputRange: [0, N], outputRange: [-half * sp * dir, half * sp * dir] }),
        sc: u.interpolate({ inputRange: inR, outputRange: [0.5, 0.5, 1, 1, 0.5, 0.5] }),
        op: u.interpolate({ inputRange: inR, outputRange: [0, 0, 1, 1, 0, 0] }),
        ty: u.interpolate({ inputRange: inR, outputRange: [18, 18, 0, 0, 18, 18] }),
      };
    });
  }, [off, N, shown, sp, dir]);

  return (
    <View style={[styles.row, WEB_ROW]} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      {W > 0
        ? items.map((cat, i) => {
            const id = cat?.id ?? null;
            const k = id ?? 'all';
            const on = k === sel;
            const hov = hover === k && !on;
            const a = anims[i];
            if (!a) return null;
            return (
              <Animated.View
                key={k}
                style={[
                  styles.slot,
                  { left: W / 2 - TILE_W / 2, opacity: a.op, transform: [{ translateX: a.tx }, { translateY: a.ty }, { scale: a.sc }] },
                ]}
              >
                <Pressable
                  onPressIn={() => {
                    dragged.current = false;
                  }}
                  onPress={() => {
                    if (dragged.current) return;
                    onPick(id);
                    goTo(i);
                  }}
                  onHoverIn={() => setHover(k)}
                  onHoverOut={() => setHover((x) => (x === k ? null : x))}
                  style={styles.tile}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <View style={[styles.box, on ? styles.boxOn : [styles.glass, WEB_BLUR], hov && styles.glassHover]}>
                    <Ionicons name={(cat ? icon(cat) : 'grid-outline') as any} size={19} color={on ? c.accent : '#FFFFFF'} />
                  </View>
                  <Text style={[styles.label, on && styles.labelOn]} numberOfLines={2}>
                    {cat ? name(cat) : tr('الكل', 'All')}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 6, height: ROW_H, overflow: 'hidden', alignSelf: 'stretch' },
  slot: { position: 'absolute', top: 0, width: TILE_W },
  tile: { width: TILE_W, alignItems: 'center', paddingTop: PAD_TOP, paddingBottom: 6, gap: 5 },
  box: { width: BOX, height: BOX, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  boxOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1B3F',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  glass: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.35)' },
  glassHover: { backgroundColor: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.6)', transform: [{ translateY: -2 }] },
  label: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, textAlign: 'center', color: 'rgba(255,255,255,0.85)', maxWidth: TILE_W - 4 },
  labelOn: { fontFamily: fonts.bold, color: '#FFFFFF' },
});
