// Placeholder cover panel (spec: initials block until R2 cover photos, M5).
// The placeholder line is VISIBLE text so the CDP check can assert it.
export function CoverPanel({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div className='flex h-40 flex-col items-center justify-center gap-1 rounded-md bg-neutral-200'>
      <span className='font-bold text-3xl text-neutral-500'>{initials}</span>
      <span className='text-neutral-500 text-xs'>Cover photo coming soon</span>
    </div>
  );
}
