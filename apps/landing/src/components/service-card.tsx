import type { StudioServiceWithBranches } from '@sevendays/types';
import { Link } from '@tanstack/react-router';
import { peso } from '../lib/format';

// Studio Service card (/services): description + price + per-branch
// bookability chips + the add-on cross-reference rendered by the route
// (spec's /services row). Bookability names arrive pre-resolved — the
// component takes no branches prop (single call-site convention).
export function ServiceCard({
  service,
  branchNames,
}: {
  service: StudioServiceWithBranches;
  branchNames: string[];
}) {
  return (
    <article className='flex flex-col gap-2 rounded-lg border p-6'>
      <h3 className='font-semibold text-xl'>{service.name}</h3>
      <p className='font-medium text-lg'>{peso(service.priceCents)}</p>
      <p className='text-neutral-700'>{service.description}</p>
      <div className='flex flex-wrap gap-1'>
        {branchNames.map((name) => (
          <span key={name} className='rounded-full border px-2 py-0.5 text-xs'>
            {name}
          </span>
        ))}
      </div>
      <Link
        to='/visit'
        search={{ service: service.id }}
        className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'
      >
        Book now
      </Link>
    </article>
  );
}
