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
