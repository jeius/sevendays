import type { StudioServiceWithBranches } from '@sevendays/types';
import { peso } from '../lib/format';

// Home teaser item (owner-ratified shape): name + price — the v1 card is
// CTA-less (services are browsed; conversion funnels through /branches).
export function ServiceTeaserItem({ service }: { service: StudioServiceWithBranches }) {
  return (
    <article className='flex flex-col gap-2 rounded-xl border border-brand-gray-cool bg-card p-4 shadow-sm'>
      <h3 className='font-semibold'>{service.name}</h3>
      <p className='font-medium'>{peso(service.priceCents)}</p>
    </article>
  );
}
