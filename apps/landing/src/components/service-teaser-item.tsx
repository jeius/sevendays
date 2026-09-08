import type { StudioServiceWithBranches } from '@sevendays/types';
import { peso } from '../lib/format';

// Home teaser item (owner-ratified shape): name + price + Book now deep
// link — user story 7 (book from any page via service deep links).
export function ServiceTeaserItem({ service }: { service: StudioServiceWithBranches }) {
  return (
    <article className='flex flex-col gap-2 rounded-lg border p-4'>
      <h3 className='font-semibold'>{service.name}</h3>
      <p className='font-medium'>{peso(service.priceCents)}</p>
      {/* Plain anchor: /visit arrives with ticket #45; convert to typed Links then. */}
      <a
        href={`/visit?service=${service.id}`}
        className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'
      >
        Book now
      </a>
    </article>
  );
}
