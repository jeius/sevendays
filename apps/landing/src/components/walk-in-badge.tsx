import { Badge } from '@sevendays/ui/components/badge';

// Walk-in badge with BOTH states explicit (owner-ratified): customers on a
// booking-only branch must see the negative, not silence. Visible text so the
// CDP scenario can assert both states against the live seed. Thin wrapper
// over the shared badge primitive (#98) — the styling vehicle changes, the
// contract (prop + texts) does not.
export function WalkInBadge({ acceptsWalkIns }: { acceptsWalkIns: boolean }) {
  const label = acceptsWalkIns ? 'Walk-ins welcome' : 'No walk-ins';
  return <Badge variant='outline'>{label}</Badge>;
}
