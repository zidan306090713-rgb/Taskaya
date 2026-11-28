import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

/**
 * فلاتر الأقسام جوه الهيدر الأزرق: مربعات زجاج (أيقونة فوق + اسم تحت).
 * المختار عليه مربع أبيض بيتزحلق لمكانه بحركة spring.
 */
const TILE_W = 70;
const BOX = 42;
const PAD_TOP = 4;
const WEB_BLUR =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', transition: 'background-color .2s ease, border-color .2s ease, transform .2s ease' } as any)
    : null;

type Props<T> = {
  cats: T[];
  catId: string | null;
  onPick: (id: string | null) => void;
  icon: (cat: T) => string;
  name: (cat: T) => string;
};

export function CatTiles<T extends { id: string }>({ cats, catId, onPick, icon, name }: Props<T>) {
  const { c } = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const pos = useRef<Record<string, number>>({});
  const sel = catId ?? 'all';

  const slide = (to: number) => Animated.spring(x, { toValue: to, useNativeDriver: true, speed: 14, bounciness: 8 }).start();

  useEffect(() => {
    const to = pos.current[sel];
    if (to != null) slide(to);
  }, [sel]);

  const onTileLayout = (k: string, lx: number) => {
    pos.current[k] = lx;
    if (k !== sel) return;
    if (!ready) {
      x.setValue(lx);
      setReady(true);
    } else slide(lx);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      <Animated.View style={[styles.ind, { opacity: ready ? 1 : 0, transform: [{ translateX: x }] }]} />
      {[null, ...cats].map((cat) => {
        const id = cat?.id ?? null;
        const k = id ?? 'all';
        const on = k === sel;
        const hov = hover === k && !on;
        return (
          <Pressable
            key={k}
            onPress={() => onPick(id)}
            onHoverIn={() => setHover(k)}
            onHoverOut={() => setHover((h) => (h === k ? null : h))}
            onLayout={(e) => onTileLayout(k, e.nativeEvent.layout.x)}
            style={styles.tile}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.box, !on && styles.glass, !on && WEB_BLUR, hov && styles.glassHover]}>
              <Ionicons name={(cat ? icon(cat) : 'grid-outline') as any} size={19} color={on ? c.accent : '#FFFFFF'} />
            </View>
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={2}>
              {cat ? name(cat) : tr('الكل', 'All')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginTop: 6, marginBottom: 0, flexGrow: 0 },
  row: { gap: 4, flexGrow: 1, justifyContent: 'center', alignItems: 'flex-start' },
  tile: { width: TILE_W, alignItems: 'center', paddingTop: PAD_TOP, paddingBottom: 6, gap: 5 },
  box: { width: BOX, height: BOX, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  glass: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.35)' },
  glassHover: { backgroundColor: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.6)', transform: [{ translateY: -2 }] },
  ind: {
    position: 'absolute',
    top: PAD_TOP,
    left: (TILE_W - BOX) / 2,
    width: BOX,
    height: BOX,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1B3F',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    pointerEvents: 'none',
  },
  label: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, textAlign: 'center', color: 'rgba(255,255,255,0.85)', maxWidth: TILE_W - 4 },
  labelOn: { fontFamily: fonts.bold, color: '#FFFFFF' },
});
