import { useEffect, useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/providers/ThemeProvider';

// أبعاد الرسمة الأصلية (بتتكبر/تتصغر حسب size)
const W = 110;
const H = 96;
const CX = 55;
const CY = 48;
const RX = 46; // نص عرض المدار
const RY = 13; // نص ارتفاع المدار
const TILT = (-18 * Math.PI) / 180;
const PERIOD = 4500; // لفة كاملة كل 4.5 ثانية

// نقطة على المدار المايل
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
const BACK = arc(Math.PI, Math.PI * 2); // النص اللي ورا الـ T
const FRONT = arc(0, Math.PI); // النص اللي قدام الـ T

function Badge({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <G transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
      <Circle r={6.6} fill={fill} />
      <Path d="M-3 0.2 L-0.9 2.4 L3.2 -2" fill="none" stroke="#FFFFFF" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  );
}

/**
 * لوجو تاسكاية: حرف T + مدار مايل + علامة صح بتلف حواليه.
 * المدار بيتقطع حوالين علامة الصح (كأنها منفصلة عنه)، ولما بتلف من ورا بتعدي من ضهر الـ T.
 * بياخد لون التطبيق تلقائيًا (الـ T أغمق من المدار).
 */
export function OrbitLogo({ size = 110, animated = true }: { size?: number; animated?: boolean }) {
  const { c } = useTheme();
  const id = 'tl' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [t, setT] = useState(0.55);

  useEffect(() => {
    if (!animated) return;
    let raf = 0;
    const start = Date.now() - (0.55 / (Math.PI * 2)) * PERIOD;
    const tick = () => {
      setT((((Date.now() - start) % PERIOD) / PERIOD) * Math.PI * 2);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animated]);

  const [bx, by] = pt(t);
  const front = Math.sin(t) > 0;
  const k = size / W;

  return (
    <View style={{ width: W * k, height: H * k }} accessibilityRole="image" accessibilityLabel="Taskaya">
      <Svg width={W * k} height={H * k} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          {/* فراغ حوالين علامة الصح: المدار بيتقطع عندها */}
          <Mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <Rect x="0" y="0" width={W} height={H} fill="#FFFFFF" />
            <Circle cx={bx} cy={by} r={10.5} fill="#000000" />
          </Mask>
        </Defs>
        <Path d={BACK} fill="none" stroke={c.accentLight} strokeWidth={4} strokeLinecap="round" mask={`url(#${id})`} />
        {!front ? <Badge x={bx} y={by} fill={c.accent} /> : null}
        {/* حرف T */}
        <Rect x={37} y={23} width={36} height={10} rx={3} fill={c.accent} />
        <Rect x={50} y={29} width={10} height={42} rx={3} fill={c.accent} />
        <Path d={FRONT} fill="none" stroke={c.accentLight} strokeWidth={4} strokeLinecap="round" mask={`url(#${id})`} />
        {front ? <Badge x={bx} y={by} fill={c.accent} /> : null}
      </Svg>
    </View>
  );
}
