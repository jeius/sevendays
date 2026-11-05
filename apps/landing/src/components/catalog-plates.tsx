import type { ServicePackageRead } from '@sevendays/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { useState } from 'react';
import { peso } from '../lib/format';
import { useTruncated } from '../lib/use-truncated';
import { CoverPanel } from './cover-panel';
import { Reveal } from './reveal';

// The packages index, OWNER-RULED index A "the plates" (#164 Round 3 — "I
// love the index A"; the losing ledger variant stays on the prototype
// branch forever): a 2-column grid of cover-led compact plates — the D2
// image treatment scaled down. The catalog laws compose here: the index is
// a SHOWCASE (no booking CTA — M3), the whole plate clicks through to the
// detail, and an unpriced row renders NO price (the #163 law — peso(null)
// leaves the slot empty).
//
// The description treatment (Round 3's refinement chain, owner-ruled):
// clamped to two lines at a pinned two-line floor (uniform plate sizes);
// desktop reveals the FULL description in the shared Tier-1 tooltip — and
// ONLY when the text actually truncates (the measured gate: a fitting
// description gets no tooltip and no help cursor); mobile taps the
// description to expand IN PLACE (the plate grows in normal flow — never
// an inner scrollview; the tap never navigates).
export function CatalogPlates({ strip }: { strip: ServicePackageRead[] }) {
  return (
    <div className='grid gap-6 sm:grid-cols-2'>
      {strip.map((pkg, i) => (
        <Reveal key={pkg.id} delay={(i % 2) * 90}>
          <CatalogPlate pkg={pkg} />
        </Reveal>
      ))}
    </div>
  );
}

function CatalogPlate({ pkg }: { pkg: ServicePackageRead }) {
  const price = peso(pkg.priceCents);
  // Mobile tap-to-expand; desktop hover carries the reveal instead.
  const [expanded, setExpanded] = useState(false);
  const { ref: descRef, truncated } = useTruncated<HTMLParagraphElement>();
  const description = (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the tap-to-expand affordance is coarse-pointer-only by ruling (touch); keyboard users follow the link and read the full description on the detail page — a key handler here would double-fire navigation.
    <p
      ref={descRef}
      onClick={(e) => {
        // Coarse pointers expand in place; fine pointers read the tooltip
        // (this handler is inert for them).
        if (window.matchMedia('(pointer: coarse)').matches) {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((v) => !v);
        }
      }}
      className={cn(
        'mt-1 min-h-10 w-full text-left text-muted-foreground text-sm leading-5',
        expanded ? '' : 'line-clamp-2',
        truncated
          ? 'pointer-coarse:cursor-pointer pointer-fine:cursor-help'
          : 'pointer-coarse:cursor-pointer'
      )}
    >
      {pkg.description}
    </p>
  );

  return (
    <Link
      to='/packages/$slug'
      params={{ slug: pkg.slug }}
      className='group block overflow-hidden rounded-xl border border-line-soft bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0'
    >
      <div className='relative aspect-[4/3] overflow-hidden'>
        <CoverPanel
          name={pkg.name}
          coverImageUrl={pkg.coverImageUrl}
          className='absolute inset-0 size-full rounded-none object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100'
        />
      </div>
      <div className='relative p-5'>
        <div className='flex items-baseline justify-between gap-3'>
          <h3 className='font-semibold font-serif text-brand-ink text-xl dark:text-foreground'>
            {pkg.name}
          </h3>
          {/* The unpriced law: nothing renders where the price would be. */}
          {price && <p className='font-mono text-brand-700 text-sm dark:text-brand-300'>{price}</p>}
        </div>
        <TooltipProvider>
          {truncated ? (
            <Tooltip>
              <TooltipTrigger render={description} />
              <TooltipContent className='max-w-72 break-words'>
                <p className='leading-5'>{pkg.description}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            description
          )}
        </TooltipProvider>
      </div>
    </Link>
  );
}
