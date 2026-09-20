import type { StudioServiceWithBranches } from '@sevendays/types';
import { Badge } from '@sevendays/ui/components/badge';
import { peso } from '../lib/format';

// Studio Service card (/services): description + price + per-branch
// bookability chips + the add-on cross-reference rendered by the route
// (spec's /services row). Bookability names arrive pre-resolved — the
// component takes no branches prop (single call-site convention). Chips
// recomposed onto the shared badge (#98, the ruled per-surface call).
export function ServiceCard({
  service,
  branchNames,
}: {
  service: StudioServiceWithBranches;
  branchNames: string[];
}) {
  return (
    <article className='flex flex-col gap-2 rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <h3 className='font-semibold text-brand-ink text-xl'>{service.name}</h3>
      <p className='font-medium text-lg'>{peso(service.priceCents)}</p>
      <p className='text-muted-text'>{service.description}</p>
      <div className='flex flex-wrap gap-1'>
        {branchNames.map((name) => (
          <Badge key={name} variant='outline'>
            {name}
          </Badge>
        ))}
      </div>
    </article>
  );
}
