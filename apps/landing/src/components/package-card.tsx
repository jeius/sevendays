import type { ServicePackageRead } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { peso } from '../lib/format';
import { CoverPanel } from './cover-panel';
import { InclusionsList } from './inclusions-list';

// Full-detail package card (spec: /packages shows full details, no separate
// detail navigation needed from listings) — reused on the home strip and the
// detail page. The cta prop scopes the booking affordance per surface
// (#98): omitted = CTA-less (the /packages index is a showcase, not a
// funnel); 'card' = strip teaser ("Book now"); 'detail' = the detail page's
// exactly-one primary affordance ("Book this package"). The v1 scrub swaps
// the detail CTA for "Call us" → /branches at pick time — never a runtime
// branch (the #97 convention).
export function PackageCard({
  pkg,
  cta,
}: {
  pkg: ServicePackageRead;
  cta?: 'card' | 'detail';
}) {
  return (
    <article className='flex flex-col gap-3 rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <CoverPanel name={pkg.name} />
      <h3 className='font-semibold text-brand-ink text-xl'>{pkg.name}</h3>
      <p className='font-medium text-lg'>{peso(pkg.priceCents)}</p>
      <p className='text-muted-text'>{pkg.description}</p>
      <InclusionsList pkg={pkg} />
      {cta && (
        <Link
          to='/book'
          search={{ package: pkg.id }}
          className={cn(
            buttonVariants(),
            'self-start focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          )}
        >
          {cta === 'detail' ? 'Book this package' : 'Book now'}
        </Link>
      )}
    </article>
  );
}
