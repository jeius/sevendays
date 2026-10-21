import type { BranchRead } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarClock, CalendarPlus, Footprints, Phone } from 'lucide-react';
import { useState } from 'react';
import { CoverPanel } from './cover-panel';

// The branch card (/branches) on the ruled language (#164 Round 4): the
// #214 cover as a 16:9 strip atop the card (the CoverPanel law — null
// renders today's muted placeholder), the walk-in badge as an icon tooltip
// beside the name, the phone as a mono tel: link, CTAs under a hairline.
//
// The variant-split CTAs (OWNER-RULED): MAIN = the icon-only outline call
// (aria-labeled, its previous text as the tooltip content — hover/focus
// opens, touch taps through to the call, which is what the icon promises)
// beside the primary "Book at this branch" (CalendarPlus — the CTA law).
// The v1 arm — a single solid-primary "Call {branch}" with Phone, ZERO
// book words on the page — is a pick-time transform on the v1 branch,
// never a runtime branch in this codebase (the #97 convention).
export function BranchCard({ branch }: { branch: BranchRead }) {
  return (
    <article className='group flex flex-col overflow-hidden rounded-xl border border-line-soft bg-card shadow-sm'>
      <div className='relative aspect-[16/9]'>
        <CoverPanel
          name={branch.name}
          coverImageUrl={branch.coverImageUrl}
          className='absolute inset-0 size-full rounded-none object-cover'
        />
      </div>
      <div className='flex flex-1 flex-col gap-2 p-6'>
        <div className='flex items-start justify-between gap-3'>
          <h3 className='font-semibold font-serif text-brand-ink text-xl dark:text-foreground'>
            {branch.name}
          </h3>
          <WalkInIndicator acceptsWalkIns={branch.acceptsWalkIns} />
        </div>
        <p className='text-muted-foreground'>{branch.address}</p>
        <a
          href={`tel:${branch.phone.replace(/\s+/g, '')}`}
          className='w-fit rounded-sm font-mono text-brand-700 text-sm transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring dark:text-brand-300 dark:hover:text-brand-200'
        >
          {branch.phone}
        </a>
        <div className='mt-3 flex flex-wrap gap-2 border-line-soft border-t pt-4'>
          {/* OWNER-RULED: the icon-only call affordance carries its
              previous text as a tooltip — hover (fine pointers) or focus
              (keyboard) opens it; on touch the tap just calls, which is
              what the icon promises. */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                    aria-label={`Call ${branch.name}`}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'icon' }),
                      'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
                    )}
                  >
                    <Phone className='size-4' aria-hidden='true' />
                  </a>
                }
              />
              <TooltipContent>Call {branch.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link
            to='/book'
            search={{ branch: branch.id }}
            className={cn(
              buttonVariants(),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book at this branch
          </Link>
        </div>
      </div>
    </article>
  );
}

// The walk-in indicator, OWNER-RULED Round 4: the text badge recomposes as
// an ICON with the shared tooltip — hover opens on fine pointers, TAP
// toggles on coarse ones (a controlled Tooltip: Base UI's hover alone
// doesn't fire reliably on touch). Both state texts survive verbatim in
// the tooltip copy and the trigger's aria-label. Branches-page-local BY
// DESIGN: the booking wizard's step keeps the text WalkInBadge (M7 leaves
// v2's booking surfaces untouched — the divergence is deliberate, and the
// v1 pick drops the negative tooltip's "or book online" clause there).
function WalkInIndicator({ acceptsWalkIns }: { acceptsWalkIns: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          render={
            <button
              type='button'
              aria-label={acceptsWalkIns ? 'Walk-ins welcome' : 'By appointment'}
              onClick={() => setOpen((v) => !v)}
              className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring',
                acceptsWalkIns
                  ? 'bg-brand-700/10 text-brand-700'
                  : 'bg-brand-ink/5 text-muted-foreground'
              )}
            >
              {acceptsWalkIns ? (
                <Footprints className='size-4' aria-hidden='true' />
              ) : (
                <CalendarClock className='size-4' aria-hidden='true' />
              )}
            </button>
          }
        />
        <TooltipContent className='max-w-56'>
          <p>
            {acceptsWalkIns
              ? 'Walk-ins welcome — come by anytime.'
              : 'By appointment — call ahead or book online.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
