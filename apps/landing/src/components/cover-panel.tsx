// Placeholder cover panel (spec: initials block until R2 cover photos, M5).
// The placeholder line is VISIBLE text so the CDP check can assert it.
// #97: the deep-petrol media gradient is the atmosphere's accent lane
// (deep petrol = media gradients only) — dark stops (600→800→deep) keep
// the white text AA on every stop.
export function CoverPanel({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div className='flex h-40 flex-col items-center justify-center gap-1 rounded-lg bg-[linear-gradient(135deg,var(--brand-600),var(--brand-800),var(--brand-deep))]'>
      <span className='font-bold text-3xl text-white'>{initials}</span>
      <span className='text-white/85 text-xs'>Cover photo coming soon</span>
    </div>
  );
}
