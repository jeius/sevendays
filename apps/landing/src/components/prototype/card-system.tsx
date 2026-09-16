import type {
  Branch,
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
import { Camera, FileText, Frame, ImageUp, MapPin, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { peso } from '../../lib/format';

// PROTOTYPE (#111) Track 2 — the ONE card system (Package / Service /
// Branch + compact strip item) with the ruled uniformity mechanics:
// 1-line titles, clamp-2 descriptions, fixed media heights, first-3 chips
// plus a "+K" chip opening a CLICK popover (mobile-safe). Two densities:
// 'd92' = the #92 mock's relaxed pass (p-5, serif titles); 'tight' = the
// tighter comparator (p-3.5, sans titles) — density AND title register are
// both on the owner's ruling agenda, so the two are shown together.

export type CardDensity = 'd92' | 'tight';

type BookSearch = { package?: string; service?: string; branch?: string };

const DENSITY: Record<
  CardDensity,
  {
    card: string;
    media: string;
    title: string;
    meta: string;
    desc: string;
    chip: string;
  }
> = {
  d92: {
    card: 'p-5 gap-3',
    media: 'h-28',
    title: 'font-serif text-lg font-semibold',
    meta: 'font-mono text-sm',
    desc: 'text-sm',
    chip: 'px-2.5 py-0.5 text-[11px]',
  },
  tight: {
    card: 'p-3.5 gap-2',
    media: 'h-24',
    title: 'text-base font-semibold',
    meta: 'font-mono text-xs',
    desc: 'text-[13px]',
    chip: 'px-2 py-0.5 text-[10px]',
  },
};

export const CARD_GRID: Record<CardDensity, string> = {
  d92: 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3',
  tight: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
};

const CARD_BASE = 'bg-card border-brand-gray-cool flex flex-col rounded-xl border shadow-sm';

function ChipCluster({
  chips,
  density,
  demoOpen,
}: {
  chips: string[];
  density: CardDensity;
  demoOpen?: boolean;
}) {
  const HEAD = 3;
  if (chips.length === 0) return null;
  const head = chips.slice(0, HEAD);
  const rest = chips.slice(HEAD);
  const d = DENSITY[density];
  return (
    <div className='flex flex-wrap gap-1'>
      {head.map((chip) => (
        <span
          key={chip}
          className={cn(
            'inline-flex max-w-44 items-center truncate rounded-full bg-secondary font-medium text-secondary-foreground',
            d.chip
          )}
        >
          {chip}
        </span>
      ))}
      {rest.length > 0 && (
        <Popover defaultOpen={demoOpen}>
          <PopoverTrigger
            className={cn(
              'inline-flex cursor-pointer items-center rounded-full border border-border bg-card font-medium text-foreground hover:bg-wash-base',
              d.chip
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

function MediaFrame({
  density,
  children,
  label,
}: {
  density: CardDensity;
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-lg border border-line-soft bg-wash-a',
        DENSITY[density].media
      )}
    >
      {children}
      {label && (
        <span className='absolute right-1.5 bottom-1.5 rounded-full bg-brand-ink/75 px-2 py-0.5 font-mono text-[10px] text-white/85'>
          {label}
        </span>
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

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('fram')) return Frame;
  if (n.includes('print') || n.includes('tarp')) return Printer;
  if (n.includes('recover')) return ImageUp;
  if (n.includes('id')) return FileText;
  return Camera;
}

// Variant D's full-image service-card backgrounds (stand-ins; M5 swaps for
// the studio's own service shots).
export function serviceBackground(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('recover')) return '/photos/service-recovery.jpg';
  if (n.includes('fram')) return '/photos/service-framing.jpg';
  if (n.includes('id') || n.includes('portrait')) return '/photos/service-id.jpg';
  if (n.includes('print') || n.includes('tarp')) return '/photos/service-printing.jpg';
  return '/photos/cover-portrait.jpg';
}

// The variant-D service treatment: the photo IS the card — full-image
// background, ink gradient for legibility, system mechanics kept (1-line
// title, fixed height, one affordance, deep link preserved).
export function PrototypeServiceImageCard({
  service,
}: {
  service: StudioServiceWithBranches;
}) {
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
          {/* D ruling: card titles go sans (Figtree) — serif stays for
              page-level h1/h2 and the Track-2 density comparison. */}
          <h3 className='truncate text-xl font-semibold text-white'>
            {service.name}
          </h3>
          <p className='text-brand-200 mt-1 font-mono text-sm'>{peso(service.priceCents)}</p>
        </div>
        <span className='shrink-0 rounded-md border border-white/40 bg-brand-ink/60 px-3 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-brand-ink/80'>
          Book
        </span>
      </div>
    </Link>
  );
}

// The variant-D package treatment (owner: "cover photos drive the cards"):
// the cover is the card's hero — edge-to-edge media with title + price
// overlaid on the same two-layer ink tint as the service cards — while the
// text-heavy body (description, chips, +K popover, CTA) stays on white.
// Deliberately NOT full-image-with-all-text: too much text for a photo
// (clutter + unpredictable legibility per cover). Sans titles per D.
export function PrototypePackageCoverCard({
  pkg,
  demoOpen,
}: {
  pkg: ServicePackageWithInclusions;
  demoOpen?: boolean;
}) {
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
        <ChipCluster chips={packageChips(pkg)} density='d92' demoOpen={demoOpen} />
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

export function inclusionLines(pkg: ServicePackageWithInclusions): string[] {
  return pkg.inclusions.map((i) => {
    const size = i.printSize ? i.printSize.code : null;
    const attires = i.attires.length > 0 ? i.attires.map((a) => a.name).join(', ') : null;
    const parts = [
      i.quantity !== null ? `×${i.quantity}` : null,
      size,
      i.description,
      attires,
    ].filter((part): part is string => part !== null);
    return parts.join(' · ');
  });
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

export function PrototypePackageCard({
  pkg,
  density,
  cta = true,
  demoOpen,
}: {
  pkg: ServicePackageWithInclusions;
  density: CardDensity;
  cta?: boolean;
  demoOpen?: boolean;
}) {
  const d = DENSITY[density];
  return (
    <article className={cn(CARD_BASE, d.card)}>
      <MediaFrame density={density} label='stand-in cover'>
        <img
          src={packageCover(pkg.id)}
          alt={`Cover for ${pkg.name} — stand-in until R2 assets arrive`}
          className='size-full object-cover'
          loading='lazy'
        />
      </MediaFrame>
      <h3 className={cn('truncate text-brand-ink', d.title)}>{pkg.name}</h3>
      <p className={cn('text-muted-text', d.meta)}>{peso(pkg.priceCents)}</p>
      <p className={cn('line-clamp-2 text-muted-text', d.desc)}>{pkg.description}</p>
      <ChipCluster chips={packageChips(pkg)} density={density} demoOpen={demoOpen} />
      {cta && <BookNow id={pkg.id} kind='package' />}
    </article>
  );
}

export function PrototypeServiceCard({
  service,
  branchNames,
  density,
  cta = true,
}: {
  service: StudioServiceWithBranches;
  branchNames: string[];
  density: CardDensity;
  cta?: boolean;
}) {
  const d = DENSITY[density];
  const Icon = serviceIcon(service.name);
  return (
    <article className={cn(CARD_BASE, d.card)}>
      <MediaFrame density={density}>
        <div className='flex size-full items-center justify-center bg-[linear-gradient(135deg,var(--brand-600),var(--brand-800),var(--brand-deep))]'>
          <Icon className='size-8 text-white/85' aria-hidden='true' />
        </div>
      </MediaFrame>
      <h3 className={cn('truncate text-brand-ink', d.title)}>{service.name}</h3>
      <p className={cn('text-muted-text', d.meta)}>{peso(service.priceCents)}</p>
      <p className={cn('line-clamp-2 text-muted-text', d.desc)}>{service.description}</p>
      <ChipCluster chips={branchNames} density={density} />
      {cta && <BookNow id={service.id} kind='service' />}
    </article>
  );
}

export function PrototypeBranchCard({ branch, density }: { branch: Branch; density: CardDensity }) {
  const d = DENSITY[density];
  return (
    <article className={cn(CARD_BASE, d.card)}>
      <MediaFrame density={density}>
        <div className='flex size-full items-center justify-center bg-[linear-gradient(135deg,var(--brand-800),var(--brand-900),var(--brand-ink))]'>
          <MapPin className='size-7 text-brand-300' aria-hidden='true' />
        </div>
      </MediaFrame>
      <h3 className={cn('truncate text-brand-ink', d.title)}>{branch.name}</h3>
      <p className={cn('line-clamp-2 text-muted-text', d.desc)}>{branch.address}</p>
      <ChipCluster
        chips={[branch.acceptsWalkIns ? 'Walk-ins welcome' : 'No walk-ins', branch.phone]}
        density={density}
      />
      <div className='mt-auto flex gap-2 pt-1'>
        <a
          href={`tel:${branch.phone.replace(/\s+/g, '')}`}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'flex-1 text-center focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          )}
        >
          Call
        </a>
        <Link
          to='/book'
          search={{ branch: branch.id }}
          className={cn(
            buttonVariants({ size: 'sm' }),
            'flex-1 text-center focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          )}
        >
          Book
        </Link>
      </div>
    </article>
  );
}

// The compact strip item (home strips / teasers): same anatomy, no media,
// no description — the system's compact variant.
export function PrototypeStripItem({
  title,
  meta,
  chips,
  search,
}: {
  title: string;
  meta: string;
  chips: string[];
  search: BookSearch;
}) {
  return (
    <article className={cn(CARD_BASE, 'gap-1.5 p-4')}>
      <h3 className='truncate font-semibold text-brand-ink'>{title}</h3>
      <p className='font-mono text-muted-text text-xs'>{meta}</p>
      {chips.length > 0 && <ChipCluster chips={chips} density='tight' />}
      <Link
        to='/book'
        search={search}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'mt-auto self-start focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
        )}
      >
        Book now
      </Link>
    </article>
  );
}
