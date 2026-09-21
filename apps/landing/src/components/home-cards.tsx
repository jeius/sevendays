import type {
  ResolvedPackageInclusion,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@sevendays/ui/components/popover';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { peso } from '../lib/format';

// The ruled card system (#111 Track 2, variant D build target): uniformity
// mechanics — 1-line titles, clamp-2 descriptions, fixed media heights,
// first-3 chips plus a "+K" chip opening a CLICK popover (mobile-safe).
// Card titles are SANS per the D reaction; serif stays at page h1/h2.

const CHIP = 'px-2.5 py-0.5 text-[11px]';

function ChipCluster({ chips }: { chips: string[] }) {
  const HEAD = 3;
  if (chips.length === 0) return null;
  const head = chips.slice(0, HEAD);
  const rest = chips.slice(HEAD);
  return (
    <div className='flex flex-wrap gap-1'>
      {head.map((chip) => (
        <span
          key={chip}
          className={cn(
            'inline-flex max-w-44 items-center truncate rounded-full bg-secondary font-medium text-secondary-foreground',
            CHIP
          )}
        >
          {chip}
        </span>
      ))}
      {rest.length > 0 && (
        <Popover>
          <PopoverTrigger
            className={cn(
              'inline-flex cursor-pointer items-center rounded-full border border-border bg-card font-medium text-foreground hover:bg-wash-base',
              CHIP
            )}
          >
            +{rest.length}
          </PopoverTrigger>
          <PopoverContent className='w-64 rounded-xl p-3'>
            <PopoverTitle className='font-mono text-[11px] text-muted-foreground uppercase tracking-wider'>
              The full list
            </PopoverTitle>
            <ul className='flex flex-col gap-1 text-foreground text-sm'>
              {chips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// Stand-in cover mapping (M5: R2 cover photos replace this wholesale).
// Seeded names are generic ("Basic Package", "Package A"…), so covers cycle
// deterministically per package instead of matching on keywords.
const COVERS = [
  '/photos/cover-portrait.jpg',
  '/photos/cover-event.jpg',
  '/photos/cover-commercial.jpg',
] as const;

export function packageCover(id: string): string {
  const hash = [...id].reduce((n, c) => n + c.charCodeAt(0), 0);
  return COVERS[hash % COVERS.length] ?? COVERS[0];
}

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
      aria-label={`Book ${service.name} (₱${(service.priceCents / 100).toFixed(0)})`}
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
        <span className='shrink-0 rounded-md border border-white/40 bg-brand-ink/60 px-3 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-brand-ink/80'>
          Book
        </span>
      </div>
    </Link>
  );
}

function BookNow({ id, kind }: { id: string; kind: 'package' | 'service' }) {
  return (
    <Link
      to='/book'
      search={kind === 'package' ? { package: id } : { service: id }}
      className={cn(
        buttonVariants({ size: 'sm' }),
        'mt-auto self-stretch text-center focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
      )}
    >
      Book now
    </Link>
  );
}

// The ruled package treatment (owner: "cover photos drive the cards"): the
// cover is the card's hero — edge-to-edge media with title + price
// overlaid on the same two-layer ink tint — while the text-heavy body
// (description, chips, +K popover, CTA) stays on white. Deliberately NOT
// full-image-with-all-text. Sans titles per D.
export function PackageCoverCard({ pkg }: { pkg: ServicePackageWithInclusions }) {
  return (
    // Hover (owner ask, D): one idea, layered — the card lifts while the
    // cover slowly zooms ("the photograph opens up"). Transforms only (no
    // layout shift), and both still under prefers-reduced-motion.
    <article className='group bg-card border-brand-gray-cool flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0'>
      <div className='border-line-soft relative h-56 shrink-0 overflow-hidden border-b'>
        <img
          src={packageCover(pkg.id)}
          alt={`Cover for ${pkg.name} — stand-in until R2 assets arrive`}
          className='absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100'
          loading='lazy'
        />
        <div className='bg-brand-ink/35 absolute inset-0' aria-hidden='true' />
        <div
          className='from-brand-ink via-brand-ink/55 to-transparent absolute inset-0 bg-gradient-to-t'
          aria-hidden='true'
        />
        <div className='absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5'>
          <div className='min-w-0'>
            <h3 className='truncate text-xl font-semibold text-white'>{pkg.name}</h3>
            <p className='text-brand-200 mt-1 font-mono text-sm'>{peso(pkg.priceCents)}</p>
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-3 p-5'>
        <p className='text-muted-text line-clamp-2 text-sm'>{pkg.description}</p>
        <ChipCluster chips={packageChips(pkg)} />
        <div className='mt-auto'>
          <BookNow id={pkg.id} kind='package' />
        </div>
      </div>
    </article>
  );
}

export function packageChips(pkg: ServicePackageWithInclusions): string[] {
  const framed = pkg.inclusions.filter((i) => i.kind === 'framed_picture');
  const prints = pkg.inclusions.filter((i) => i.kind === 'print');
  const privileges = pkg.inclusions.filter((i) => i.kind === 'privilege');
  const chips: string[] = [];
  const framedCount = framed.reduce((n, i) => n + (i.quantity ?? 1), 0);
  if (framedCount > 0) chips.push(`${framedCount} framed`);
  const printCount = prints.reduce((n, i) => n + (i.quantity ?? 1), 0);
  if (printCount > 0) chips.push(`${printCount} loose prints`);
  for (const p of privileges) {
    chips.push(privilegeLabel(p));
  }
  return chips;
}

function privilegeLabel(p: ResolvedPackageInclusion): string {
  if (p.attires.length > 0) {
    return `Attire: ${p.attires.map((a) => a.name).join(' & ')}`;
  }
  return p.description ?? 'Studio privilege';
}
