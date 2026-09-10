import type { Branch } from '@sevendays/types';
import { WalkInBadge } from './walk-in-badge';

// Full branch card (/branches): address, phone, walk-in badge, and the call
// CTA — the branch's own number, the studio's conversion path. Branch phones
// are TODO(seed) placeholders and render verbatim until the client supplies
// real numbers.
export function BranchCard({ branch }: { branch: Branch }) {
  return (
    <article className='flex flex-col gap-2 rounded-lg border p-6'>
      <h3 className='font-semibold text-xl'>{branch.name}</h3>
      <p className='text-neutral-700'>{branch.address}</p>
      <p className='text-neutral-700'>{branch.phone}</p>
      <WalkInBadge acceptsWalkIns={branch.acceptsWalkIns} />
      <a
        href={`tel:${branch.phone}`}
        className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'
      >
        Call {branch.name}
      </a>
    </article>
  );
}
