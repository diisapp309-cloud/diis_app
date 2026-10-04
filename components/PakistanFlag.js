// Flag of Pakistan, 3:2. Construction follows the official spec: white hoist = 1/4 of the width;
// crescent and star sit on the diagonal of the green field (atan(80/90) = 41.63°).
export const FLAG_GREEN = '#01411C';

const DIAGONAL = -41.63354;
const STAR_R = 8;
const STAR = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? STAR_R * 0.381966 : STAR_R;
  const a = ((i * 36 - 90) * Math.PI) / 180;
  return `${(r * Math.cos(a)).toFixed(3)},${(r * Math.sin(a)).toFixed(3)}`;
}).join(' ');

export default function PakistanFlag({ className, title = 'Flag of Pakistan', decorative = false, slice = false }) {
  return (
    <svg
      className={className}
      viewBox="-75 -40 120 80"
      preserveAspectRatio={slice ? 'xMidYMid slice' : 'xMidYMid meet'}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : title}
    >
      <rect x="-75" y="-40" width="120" height="80" fill="#ffffff" />
      <rect x="-45" y="-40" width="90" height="80" fill={FLAG_GREEN} />
      <circle r="24" fill="#ffffff" />
      <circle r="22" cx="8.2" fill={FLAG_GREEN} transform={`rotate(${DIAGONAL})`} />
      <polygon points={STAR} fill="#ffffff" transform={`rotate(${DIAGONAL}) translate(16) rotate(18)`} />
    </svg>
  );
}

// Just the crescent and star, for large watermarks.
export function CrescentStar({ className }) {
  return (
    <svg className={className} viewBox="-26 -26 52 52" aria-hidden="true">
      <mask id="crescent-cut">
        <rect x="-26" y="-26" width="52" height="52" fill="#fff" />
        <circle r="22" cx="8.2" fill="#000" transform={`rotate(${DIAGONAL})`} />
      </mask>
      <circle r="24" fill="currentColor" mask="url(#crescent-cut)" />
      <polygon points={STAR} fill="currentColor" transform={`rotate(${DIAGONAL}) translate(16) rotate(18)`} />
    </svg>
  );
}
