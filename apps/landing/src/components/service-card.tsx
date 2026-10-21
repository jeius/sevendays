import type { StudioServiceWithBranches } from '@sevendays/types';
import { Badge } from '@sevendays/ui/components/badge';
import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { peso } from '../lib/format';
import { useTruncated } from '../lib/use-truncated';
import { serviceBackground } from './home-cards';

// The studio-service row (/services), OWNER-RULED Round 3: the cover image
// IS the card — full-bleed themed background (the serviceBackground mapping
// the home marquee shares), the two-layer ink wash + bottom scrim keeping
// every text zone at the measured white-on-ink AA pair (#111's law),
// content anchored bottom, and the CTA PINNED at the bottom-right corner.
// Bookability chips ride the scrim as outline-on-dark badges. The CTA obeys
// the law (main books with CalendarPlus; the v1 arm's solid-primary "Call
// us" + Phone is a pick-time transform on the v1 branch, never runtime);
// an unpriced service renders no price line (#163 via peso).
//
// The description behaves like the packages plates (owner ruling): TWO-line
// clamp + tap-to-expand on mobile (coarse pointers, in-flow growth, never a
// scrollview), ONE line on desktop with the full text in the shared Tier-1
// tooltip — which opens ONLY when the line actually truncates (the
// useTruncated gate).
export function ServiceCard({
  service,
  branchNames,
}: {
  service: StudioServiceWithBranches;
  branchNames: string[];
}) {
  const price = peso(service.priceCents);
  const [expanded, setExpanded] = useState(false);
  const { ref: descRef, truncated } = useTruncated<HTMLParagraphElement>();
  const description = (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the tap-to-expand affordance is coarse-pointer-only by ruling (touch); keyboard users see the branch chips and the booking flow carries the full text — a key handler here would double-fire navigation.
    <p
      ref={descRef}
      onClick={(e) => {
        if (window.matchMedia('(pointer: coarse)').matches) {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((v) => !v);
        }
      }}
      className={cn(
        'mt-2 min-h-10 w-full text-left text-sm text-white/85 leading-5 md:min-h-5',
        expanded ? 'md:line-clamp-none' : 'line-clamp-2 md:line-clamp-1',
        truncated
          ? 'pointer-coarse:cursor-pointer pointer-fine:cursor-help'
          : 'pointer-coarse:cursor-pointer'
      )}
    >
      {service.description}
    </p>
  );

  return (
    <article className='group relative flex min-h-72 flex-col justify-end overflow-hidden rounded-xl shadow-sm'>
      <img
        src={serviceBackground(service.name)}
        alt=''
        aria-hidden='true'
        className='absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.05] motion-reduce:transition-none'
        loading='lazy'
      />
      <div className='absolute inset-0 bg-brand-ink/35' aria-hidden='true' />
      <div
        className='absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/60 to-brand-ink/10'
        aria-hidden='true'
      />
      <div className='relative flex flex-col gap-2 p-6'>
        <div className='flex flex-wrap items-baseline justify-between gap-x-3'>
          <h3 className='font-bold font-serif text-white text-xl'>{service.name}</h3>
          {/* The unpriced law: nothing renders where the price would be. */}
          {price && <p className='font-mono text-brand-300 text-sm'>{price}</p>}
        </div>
        <TooltipProvider>
          {truncated ? (
            <Tooltip>
              <TooltipTrigger render={description} />
              <TooltipContent className='max-w-72 break-words'>
                <p className='leading-5'>{service.description}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            description
          )}
        </TooltipProvider>
        <div className='mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-2'>
          <div className='flex min-w-0 flex-wrap gap-1'>
            {branchNames.map((name) => (
              <Badge
                key={name}
                variant='outline'
                className='border-white/40 bg-transparent text-white'
              >
                {name}
              </Badge>
            ))}
          </div>
          <Link
            to='/book'
            search={{ service: service.id }}
            className={cn(
              buttonVariants({ size: 'sm' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book now
          </Link>
        </div>
      </div>
    </article>
  );
}
