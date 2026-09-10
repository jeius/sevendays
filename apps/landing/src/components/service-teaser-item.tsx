import type { StudioServiceWithBranches } from '@sevendays/types';
import { peso } from '../lib/format';

// Home teaser item (owner-ratified shape): name + price.
export function ServiceTeaserItem({ service }: { service: StudioServiceWithBranches }) {
  return (
    <article className='flex flex-col gap-2 rounded-lg border p-4'>
      <h3 className='font-semibold'>{service.name}</h3>
      <p className='font-medium'>{peso(service.priceCents)}</p>
    </article>
  );
}
