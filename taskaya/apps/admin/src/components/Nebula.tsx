import type { CSSProperties } from 'react';

// خلفية النجوم (نفس التوزيع والحركة اللي في التطبيق)
function makeRand(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rand = makeRand(20261117);
  return Array.from({ length: 16 }, () => {
    const r = rand();
    const size = r < 0.55 ? 3 + rand() * 3 : r < 0.88 ? 7 + rand() * 6 : 14 + rand() * 8;
    const x = rand() * 100;
    const y = rand() * 100;
    const drift = 20 + rand() * 40;
    const duration = 2800 + rand() * 2400;
    const delay = rand() * 1500;
    const style: Record<string, string | number> = {
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      animationDuration: `${duration}ms`,
      animationDelay: `${delay}ms`,
      '--dx': `${drift * 0.6}px`,
      '--dy': `${-drift}px`,
      '--g': `${Math.round(size * 1.1)}px`,
      '--s': `${Math.round(size * 0.15)}px`,
    };
    return style as CSSProperties;
  });
})();

export function Nebula() {
  return (
    <div className="nebula" aria-hidden="true">
      {STARS.map((s, i) => (
        <span key={i} className="star" style={s} />
      ))}
    </div>
  );
}
