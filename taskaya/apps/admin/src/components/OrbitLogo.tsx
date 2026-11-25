import { useId } from 'react';

// لوجو تاسكاية (نفس رسمة التطبيق): حرف T + مدار مايل + علامة صح بتلف كل 4.5 ثانية
// المدار بيتقطع حوالين علامة الصح، ولما بتلف من ورا بتعدي من ضهر الـ T
const W = 110;
const H = 96;
const DUR = '4.5s';
// المدار في إطاره المايل: النص الأول (فوق) = ورا الـ T، والنص التاني (تحت) = قدامه
const ORBIT = 'M 9 48 A 46 13 0 0 1 101 48 A 46 13 0 0 1 9 48';
const BACK = 'M 9 48 A 46 13 0 0 1 101 48';
const FRONT = 'M 101 48 A 46 13 0 0 1 9 48';

function Badge({ visible }: { visible: string }) {
  return (
    <g>
      <circle r={6.6} style={{ fill: 'var(--accent)' }} />
      <path d="M-3 0.2 L-0.9 2.4 L3.2 -2" transform="rotate(18)" fill="none" stroke="#FFFFFF" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <animateMotion dur={DUR} repeatCount="indefinite" path={ORBIT} />
      <animate attributeName="opacity" values={visible} keyTimes="0;0.5" calcMode="discrete" dur={DUR} repeatCount="indefinite" />
    </g>
  );
}

export function OrbitLogo({ size = 44 }: { size?: number }) {
  const id = 'tl' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const arc = { fill: 'none', strokeWidth: 4, strokeLinecap: 'round' as const, mask: `url(#${id})`, style: { stroke: 'var(--accent-light)' } };
  return (
    <svg className="orbit-logo" width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Taskaya">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="-10" y="-10" width="130" height="116">
          <rect x="-10" y="-10" width="130" height="116" fill="#FFFFFF" />
          <circle r={10.5} fill="#000000">
            <animateMotion dur={DUR} repeatCount="indefinite" path={ORBIT} />
          </circle>
        </mask>
      </defs>
      <g transform="rotate(-18 55 48)">
        <path d={BACK} {...arc} />
        <Badge visible="1;0" />
      </g>
      <rect x={37} y={23} width={36} height={10} rx={3} style={{ fill: 'var(--accent)' }} />
      <rect x={50} y={29} width={10} height={42} rx={3} style={{ fill: 'var(--accent)' }} />
      <g transform="rotate(-18 55 48)">
        <path d={FRONT} {...arc} />
        <Badge visible="0;1" />
      </g>
    </svg>
  );
}
