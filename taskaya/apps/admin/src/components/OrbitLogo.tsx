// لوجو تاسكاية (نفس رسمة التطبيق): كوكب + مدار مايل + نجمة بتلف كل 6 ثواني
const W = 110;
const H = 96;
const CX = 55;
const CY = 48;
const RX = 46;
const RY = 13;
const ORBIT = `M ${CX - RX} ${CY} a ${RX} ${RY} 0 1 1 ${RX * 2} 0 a ${RX} ${RY} 0 1 1 ${-RX * 2} 0`;

export function OrbitLogo({ size = 44 }: { size?: number }) {
  return (
    <svg className="orbit-logo" width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Taskaya">
      <circle cx={CX} cy={CY} r={24} style={{ fill: 'var(--accent)' }} />
      <circle cx={CX - 8} cy={CY - 8} r={7} opacity={0.85} style={{ fill: 'var(--accent-light)' }} />
      <g transform={`rotate(-18 ${CX} ${CY})`}>
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" strokeWidth={4} style={{ stroke: 'var(--accent-light)' }} />
        <circle r={5.5} stroke="#FFFFFF" strokeWidth={2} style={{ fill: 'var(--accent)' }}>
          <animateMotion dur="6s" repeatCount="indefinite" path={ORBIT} />
        </circle>
      </g>
    </svg>
  );
}
