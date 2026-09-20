import type { ServicePackageWithInclusions } from '@sevendays/types';
import { peso } from '../lib/format';
import { CoverPanel } from './cover-panel';
import { InclusionsList } from './inclusions-list';

// Full-detail package card (spec: /packages shows full details, no separate
// detail navigation needed from listings) — reused on the home strip and the
// detail page. CTA-less on v1 by ruling (the catalog is a showcase, not a
// funnel).
export function PackageCard({ pkg }: { pkg: ServicePackageWithInclusions }) {
  return (
    <article className='flex flex-col gap-3 rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <CoverPanel name={pkg.name} />
      <h3 className='font-semibold text-brand-ink text-xl'>{pkg.name}</h3>
      <p className='font-medium text-lg'>{peso(pkg.priceCents)}</p>
      <p className='text-muted-text'>{pkg.description}</p>
      <InclusionsList pkg={pkg} />
    </article>
  );
}
