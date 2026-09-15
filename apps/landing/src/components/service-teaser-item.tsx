import type { StudioServiceWithBranches } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { peso } from '../lib/format';

// Home teaser item (owner-ratified shape): name + price + Book now deep
// link — user story 7 (book from any page via service deep links).
export function ServiceTeaserItem({ service }: { service: StudioServiceWithBranches }) {
  return (
    <article className='flex flex-col gap-2 rounded-xl border border-brand-gray-cool bg-card p-4 shadow-sm'>
      <h3 className='font-semibold'>{service.name}</h3>
      <p className='font-medium'>{peso(service.priceCents)}</p>
      <Link to='/book' search={{ service: service.id }} className={buttonVariants()}>
        Book now
      </Link>
    </article>
  );
}
