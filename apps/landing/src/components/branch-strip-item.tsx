import type { Branch } from '@sevendays/types';
import { WalkInBadge } from './walk-in-badge';

// Home branches-strip item: address + walk-in badge only (the strip's
// spec-pinned shape — the full card is /branches' job).
export function BranchStripItem({ branch }: { branch: Branch }) {
  return (
    <article className='flex flex-col gap-2 rounded-lg border p-4'>
      <h3 className='font-semibold'>{branch.name}</h3>
      <p className='text-neutral-700'>{branch.address}</p>
      <WalkInBadge acceptsWalkIns={branch.acceptsWalkIns} />
    </article>
  );
}
