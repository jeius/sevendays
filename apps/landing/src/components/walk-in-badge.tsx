// Walk-in badge with BOTH states explicit (owner-ratified): customers on a
// booking-only branch must see the negative, not silence. Visible text so the
// CDP scenario can assert both states against the live seed.
export function WalkInBadge({ acceptsWalkIns }: { acceptsWalkIns: boolean }) {
  const label = acceptsWalkIns ? 'Walk-ins welcome' : 'No walk-ins';
  return <span className='rounded-full border px-2 py-0.5 text-xs'>{label}</span>;
}
