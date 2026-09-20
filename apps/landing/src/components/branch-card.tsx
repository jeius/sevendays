import type { Branch } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { cn } from 'cn';
import { WalkInBadge } from './walk-in-badge';

// Full branch card (/branches): address, phone, walk-in badge, and the
// branch deep link — spec's /branches row verbatim. Branch phones are
// TODO(seed) placeholders and render verbatim until the client supplies
// real numbers. The Call {branch} tel: affordance (#98) is the v1 primary
// styled on system ground — rendered on BOTH editions as the quiet
// secondary (the number is useful on main too); the v1 scrub drops the
// booking CTA at pick time, leaving tel: primary — never a runtime branch
// (the #97 convention).
export function BranchCard({ branch }: { branch: Branch }) {
  return (
    <article className='flex flex-col gap-2 rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <h3 className='font-semibold text-brand-ink text-xl'>{branch.name}</h3>
      <p className='text-muted-text'>{branch.address}</p>
      <p className='text-muted-text'>{branch.phone}</p>
      <WalkInBadge acceptsWalkIns={branch.acceptsWalkIns} />
      <a
        href={`tel:${branch.phone.replace(/\s+/g, '')}`}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
        )}
      >
        Call {branch.name}
      </a>
    </article>
  );
}
