import type { StudioServiceWithBranches } from '@sevendays/types';
import { Link } from '@tanstack/react-router';
import { CalendarPlus } from 'lucide-react';
import { bookAriaLabel, peso } from '../lib/format';

// The ruled card system (#111 Track 2, variant D build target), reduced to
// its surviving member at M7 #223: the service card. (The package-cover
// card, chip cluster, +K popover, and BookNow helper retired with the #223
// home redesign — featured packages render as D2 plates now.) Card titles
// are SANS per the D reaction; serif stays at page h1/h2.

// The full-image service-card backgrounds (stand-ins; M5 swaps for the
// studio's own service shots).
export function serviceBackground(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('recover')) return '/photos/service-recovery.jpg';
  if (n.includes('fram')) return '/photos/service-framing.jpg';
  if (n.includes('id') || n.includes('portrait')) return '/photos/service-id.jpg';
  if (n.includes('print') || n.includes('tarp')) return '/photos/service-printing.jpg';
  return '/photos/cover-portrait.jpg';
}

// The ruled service treatment: the photo IS the card — full-image
// background, ink gradient for legibility, system mechanics kept (1-line
// title, fixed height, one affordance, deep link preserved).
export function ServiceImageCard({ service }: { service: StudioServiceWithBranches }) {
  return (
    <Link
      to='/book'
      search={{ service: service.id }}
      aria-label={bookAriaLabel(service.name, service.priceCents)}
      className='group border-line-soft relative block h-64 overflow-hidden rounded-xl border shadow-sm focus-visible:ring-brand-focus-ring focus-visible:ring-3 focus-visible:outline-none'
    >
      <img
        src={serviceBackground(service.name)}
        alt=''
        aria-hidden='true'
        className='absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105'
        loading='lazy'
      />
      {/* Owner ruling (#111, variant D reaction): tints so the labels stay
          legible even when the photo's color matches the text. Two layers:
          a uniform ink wash dims the whole image, then a bottom-heavy ink
          scrim anchors the text zone — stacked worst case (pure-white
          photo) still leaves the label area ≈ ink, i.e. the measured
          white-on-ink 18.64:1 pair, never below AA in the text band. */}
      <div className='bg-brand-ink/35 absolute inset-0' aria-hidden='true' />
      <div
        className='from-brand-ink via-brand-ink/60 to-transparent absolute inset-0 bg-gradient-to-t'
        aria-hidden='true'
      />
      <div className='absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5'>
        <div className='min-w-0'>
          <h3 className='truncate text-xl font-semibold text-white'>{service.name}</h3>
          <p className='text-brand-200 mt-1 font-mono text-sm'>{peso(service.priceCents)}</p>
        </div>
        {/* The CTA law reaches the marquee chip with #224 (fenced from
            #223): every book affordance carries CalendarPlus — size-3.5
            fits the chip's compact register. */}
        <span className='inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/40 bg-brand-ink/60 px-3 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-brand-ink/80'>
          <CalendarPlus className='size-3.5' aria-hidden='true' />
          Book
        </span>
      </div>
    </Link>
  );
}
