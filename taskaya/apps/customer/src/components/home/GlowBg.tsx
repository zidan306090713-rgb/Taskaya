import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

/**
 * خلفية ملوّنة ناعمة ورا الكروت (عشان الزجاج يبان).
 * كل بقعة = دواير متداخلة شفافة (تدرّج دائري يشتغل على كل المنصات)، وعلى الويب بلور زيادة.
 */
const withA = (col: string, a: number) => {
  const m = /^#([0-9a-f]{6})$/i.exec(col);
  if (!m) return col;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const RINGS = 8;
const WEB_SOFT = Platform.OS === 'web' ? ({ filter: 'blur(30px)' } as any) : null;

function Blob({ color, size, alpha, pos }: { color: string; size: number; alpha: number; pos: ViewStyle }) {
  return (
    <View style={[styles.blob, { width: size, height: size }, pos, WEB_SOFT]}>
      {Array.from({ length: RINGS }, (_, i) => {
        const s = size * (1 - i / RINGS);
        return <View key={i} style={{ position: 'absolute', width: s, height: s, borderRadius: s / 2, backgroundColor: withA(color, alpha / RINGS) }} />;
      })}
    </View>
  );
}

export function GlowBg() {
  const { c } = useTheme();
  const g = c.gradient as readonly string[];
  const a = c.isDark ? 0.35 : 0.45;
  return (
    <View style={styles.fill}>
      <Blob color={c.accent} size={360} alpha={a} pos={{ top: '18%', left: -140 }} />
      <Blob color={g[g.length - 1] ?? c.accent} size={320} alpha={a * 0.8} pos={{ top: '48%', right: -130 }} />
      <Blob color={g[0] ?? c.accent} size={280} alpha={a * 0.7} pos={{ bottom: '2%', left: -60 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' },
  blob: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
