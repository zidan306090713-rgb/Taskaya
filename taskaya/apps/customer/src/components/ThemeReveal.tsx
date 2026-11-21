import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { flushSync } from '@/lib/flush-sync';

type Reveal = (x: number, y: number, apply: () => void) => void;
type Ctx = { reveal: Reveal; prepare: () => void };

const RevealCtx = createContext<Ctx>({ reveal: (_x, _y, apply) => apply(), prepare: () => {} });
export const useThemeReveal = () => useContext(RevealCtx);

const MIN_SCALE = 0.01;
const DURATION = 520;
const SHOT = { format: 'jpg' as const, quality: 0.85 };
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Snap = { old: string; fresh?: string; x: number; y: number; r: number };

// ===================== الويب: View Transitions (المتصفح بيعمل الدايرة بنفسه) =====================
let webStyleAdded = false;
const lastPointer = { x: 0, y: 0 };

function webReveal(x: number, y: number, apply: () => void) {
  const doc: any = typeof document !== 'undefined' ? document : null;
  if (!doc?.startViewTransition) {
    apply();
    return;
  }
  if (!webStyleAdded) {
    const el = doc.createElement('style');
    el.textContent =
      '::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal;}';
    doc.head.appendChild(el);
    webStyleAdded = true;
  }
  // على الكمبيوتر الماوس مش بيبعت touch، فبنستخدم آخر مكان ضغطة
  const px = lastPointer.x || x;
  const py = lastPointer.y || y;
  const r = Math.hypot(Math.max(px, innerWidth - px), Math.max(py, innerHeight - py));
  const vt = doc.startViewTransition(() => flushSync(apply));
  vt.ready
    .then(() => {
      doc.documentElement.animate(
        { clipPath: [`circle(0px at ${px}px ${py}px)`, `circle(${r}px at ${px}px ${py}px)`] },
        { duration: DURATION, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    })
    .catch(() => {});
}

// ===================== الموبايل: صورتين + دايرة بتكبر =====================
export function ThemeRevealProvider({ children }: { children: ReactNode }) {
  const rootRef = useRef<View>(null);
  const busy = useRef(false);
  const size = useRef({ w: 0, h: 0 });
  const onImage = useRef<(() => void) | null>(null);
  const prepared = useRef<{ at: number; p: Promise<string> } | null>(null);
  const [scale] = useState(() => new Animated.Value(MIN_SCALE));
  const [inverse] = useState(() => Animated.divide(1, scale));
  const [snap, setSnap] = useState<Snap | null>(null);

  // الويب: نسجّل مكان أي ضغطة بالماوس
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onDown = (e: PointerEvent) => {
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
  };

  const imageLoaded = () =>
    Promise.race([new Promise<void>((r) => (onImage.current = r)), wait(400)]).finally(() => {
      onImage.current = null;
    });

  // بيتنادى أول ما الصباع يلمس: بياخد صورة الثيم القديم بدري عشان نوفّر وقت
  const prepare = useCallback(() => {
    if (Platform.OS === 'web' || busy.current || !rootRef.current) return;
    const p = captureRef(rootRef, SHOT);
    p.catch(() => {});
    prepared.current = { at: Date.now(), p };
  }, []);

  const reveal = useCallback<Reveal>(
    async (x, y, apply) => {
      if (Platform.OS === 'web') {
        webReveal(x, y, apply);
        return;
      }
      if (busy.current || !rootRef.current) {
        apply();
        return;
      }
      busy.current = true;
      let applied = false;
      try {
        const { w, h } = size.current;
        const r = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));

        const early = prepared.current && Date.now() - prepared.current.at < 2000 ? prepared.current.p : null;
        prepared.current = null;
        const old = early ? await early : await captureRef(rootRef, SHOT);

        const oldReady = imageLoaded();
        setSnap({ old, x, y, r });
        await oldReady;

        apply();
        applied = true;
        await nextFrame();
        await nextFrame();
        await wait(30);

        const fresh = await captureRef(rootRef, SHOT);
        scale.setValue(MIN_SCALE);
        const freshReady = imageLoaded();
        setSnap({ old, fresh, x, y, r });
        await freshReady;

        Animated.timing(scale, {
          toValue: 1,
          duration: DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setSnap(null);
          busy.current = false;
        });
      } catch (err) {
        console.warn('🔴 ThemeReveal failed:', String(err));
        if (!applied) apply();
        setSnap(null);
        busy.current = false;
      }
    },
    [scale]
  );

  const value = useMemo(() => ({ reveal, prepare }), [reveal, prepare]);
  const loaded = () => onImage.current?.();
  const { w, h } = size.current;

  return (
    <RevealCtx.Provider value={value}>
      <View style={styles.flex}>
        <View ref={rootRef} collapsable={false} style={styles.flex} onLayout={onLayout}>
          {children}
        </View>

        {snap ? (
          <View style={[StyleSheet.absoluteFill, { direction: 'ltr' }]}>
            <Image source={{ uri: snap.old }} style={{ width: w, height: h }} fadeDuration={0} onLoad={snap.fresh ? undefined : loaded} />
            {snap.fresh ? (
              <Animated.View
                style={{
                  position: 'absolute',
                  left: snap.x - snap.r,
                  top: snap.y - snap.r,
                  width: snap.r * 2,
                  height: snap.r * 2,
                  borderRadius: snap.r,
                  overflow: 'hidden',
                  transform: [{ scale }],
                }}
              >
                <Animated.View style={{ width: snap.r * 2, height: snap.r * 2, transform: [{ scale: inverse }] }}>
                  <Image
                    source={{ uri: snap.fresh }}
                    fadeDuration={0}
                    onLoad={loaded}
                    style={{ position: 'absolute', left: snap.r - snap.x, top: snap.r - snap.y, width: w, height: h }}
                  />
                </Animated.View>
              </Animated.View>
            ) : null}
          </View>
        ) : null}
      </View>
    </RevealCtx.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
