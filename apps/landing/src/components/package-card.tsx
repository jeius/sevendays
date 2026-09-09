import type { ServicePackageWithInclusions } from '@sevendays/types';
import { Link } from '@tanstack/react-router';
import { peso } from '../lib/format';
import { CoverPanel } from './cover-panel';
import { InclusionsList } from './inclusions-list';

// Full-detail package card (spec: /packages shows full details, no separate
// detail navigation needed from listings) — reused on the home strip and the
// detail page.
export function PackageCard({ pkg }: { pkg: ServicePackageWithInclusions }) {
  return (
    <article className='flex flex-col gap-3 rounded-lg border p-6'>
      <CoverPanel name={pkg.name} />
      <h3 className='font-semibold text-xl'>{pkg.name}</h3>
      <p className='font-medium text-lg'>{peso(pkg.priceCents)}</p>
      <p className='text-neutral-700'>{pkg.description}</p>
      <InclusionsList pkg={pkg} />
      <Link
        to='/visit'
        search={{ package: pkg.id }}
        className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'
      >
        Book now
      </Link>
    </article>
  );
}
