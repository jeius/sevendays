import type { ResolvedPackageInclusion, ServicePackageRead } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowLeft, CalendarPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { peso } from '../lib/format';
import { coverSlides } from '../lib/viewer';
import { CoverPanel } from './cover-panel';
import { inclusionPhrase } from './inclusions-list';
import { PhotoViewer } from './photo-viewer';

// The package detail on the ruled D2 split language (#164 Round 3): the
// cover as a full plate half (untouched photo — the CoverPanel law renders
// the ink→petrol placeholder when the row has no cover), a light panel carrying
// name, peso, duration, description, and THE one primary affordance (main:
// "Book this package" with CalendarPlus — the CTA law; the v1 arm's
// solid-primary "Call us" + Phone is a pick-time transform on the v1
// branch, never in this codebase). The #163 law composes: an unpriced
// package renders NO price line and stays fully bookable.
export function PackageDetail({ pkg }: { pkg: ServicePackageRead }) {
  const price = peso(pkg.priceCents);
  // The cover zoom (#336 D4): the lone-image variant opens at the one
  // slide; a coverless package maps to zero slides (the seam's law) and
  // renders no affordance at all — the placeholder is inert.
  const [viewerOpen, setViewerOpen] = useState(false);
  // A stable slides reference (the library's documented pitfall — the
  // detail re-renders on query refetches while the viewer is open).
  const slides = useMemo(() => coverSlides(pkg), [pkg]);

  return (
    <div className='mx-auto max-w-5xl px-6 pt-8 pb-16'>
      <Link
        to='/packages'
        className='inline-flex items-center gap-1.5 rounded-sm text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
      >
        <ArrowLeft className='size-4' aria-hidden='true' />
        All packages
      </Link>
      <div className='mt-6 grid overflow-hidden rounded-xl border border-line-soft bg-card shadow-sm md:grid-cols-5'>
        <div className='relative min-h-64 md:col-span-3 md:min-h-[26rem]'>
          {/* The zoom affordance exists ONLY when the row carries a photo —
              the initials placeholder is not a photograph and does not zoom
              (D4). The button is the positioning box (CoverPanel's absolute
              classes anchor to it); the ring is inset (the grid's
              overflow-hidden would clip an outset one); the accessible name
              is the img's alt = the package name (content-based). */}
          {pkg.coverImageUrl ? (
            <button
              type='button'
              onClick={() => setViewerOpen(true)}
              className='absolute inset-0 cursor-zoom-in rounded-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring focus-visible:ring-inset'
            >
              <CoverPanel
                name={pkg.name}
                coverImageUrl={pkg.coverImageUrl}
                className='absolute inset-0 size-full rounded-none object-cover'
              />
            </button>
          ) : (
            <CoverPanel
              name={pkg.name}
              coverImageUrl={pkg.coverImageUrl}
              className='absolute inset-0 size-full rounded-none object-cover'
            />
          )}
        </div>
        <div className='flex flex-col justify-center gap-1 p-6 md:col-span-2 md:p-8'>
          <h1 className='font-bold font-serif text-2xl text-brand-ink md:text-3xl dark:text-foreground'>
            {pkg.name}
          </h1>
          {/* The unpriced law: nothing renders where the price would be. */}
          {price && (
            <p className='font-medium font-mono text-brand-700 text-lg dark:text-brand-300'>
              {price}
            </p>
          )}
          {pkg.durationMinutes != null && (
            <p className='text-muted-foreground text-sm'>{pkg.durationMinutes} minutes</p>
          )}
          <p className='mt-3 text-foreground/85 text-sm leading-relaxed'>{pkg.description}</p>
          <Link
            to='/book'
            search={{ package: pkg.id }}
            className={cn(
              buttonVariants(),
              'mt-5 self-start focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book this package
          </Link>
        </div>
      </div>
      <PhotoViewer
        variant='cover'
        slides={slides}
        index={viewerOpen ? 0 : null}
        onClose={() => setViewerOpen(false)}
      />
      <section className='mt-10'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink dark:text-foreground'>
          What's included
        </h2>
        <InclusionsGrouped pkg={pkg} />
      </section>
    </div>
  );
}

// The detail's spec sheet (#164 Round 3 owner ruling: "a proper separation
// of the inclusions by specifying the framed, prints, and privileges"):
// one column per kind — framed pictures nested per frame (ADR-0009's
// structure made visible), prints, privileges — with mono headers, counts,
// hairline rules, and the shared phrase format. Empty groups collapse; a
// package with no inclusions at all renders nothing (the plate above
// already carries the pitch).
function InclusionsGrouped({ pkg }: { pkg: ServicePackageRead }) {
  const framed = pkg.inclusions.filter((i) => i.kind === 'framed_picture');
  const prints = pkg.inclusions.filter((i) => i.kind === 'print');
  const privileges = pkg.inclusions.filter((i) => i.kind === 'privilege');
  if (pkg.inclusions.length === 0) return null;

  return (
    <div className='mt-6 grid gap-10 md:grid-cols-3 md:gap-8'>
      {framed.length > 0 && (
        <div>
          <GroupHeader label='Framed' count={framed.length} />
          <div className='mt-3 space-y-4'>
            {pkg.frames.map((frame) => {
              const inFrame = framed.filter((i) => i.frameId === frame.id);
              if (inFrame.length === 0) return null;
              return (
                <div key={frame.id}>
                  {pkg.frames.length > 1 && (
                    <p className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]'>
                      Frame {frame.frameNumber}
                    </p>
                  )}
                  <ul className='mt-1.5 space-y-1.5'>
                    {inFrame.map((i) => (
                      <InclusionRow key={i.id} inclusion={i} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {prints.length > 0 && (
        <div>
          <GroupHeader label='Prints' count={prints.length} />
          <ul className='mt-3 space-y-1.5'>
            {prints.map((i) => (
              <InclusionRow key={i.id} inclusion={i} />
            ))}
          </ul>
        </div>
      )}
      {privileges.length > 0 && (
        <div>
          <GroupHeader label='Privileges' count={privileges.length} />
          <ul className='mt-3 space-y-1.5'>
            {privileges.map((i) => (
              <InclusionRow key={i.id} inclusion={i} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className='flex items-baseline justify-between border-line-soft border-b pb-2'>
      <h3 className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em] dark:text-brand-300'>
        {label}
      </h3>
      <span className='font-mono text-muted-foreground text-xs'>{count}</span>
    </div>
  );
}

function InclusionRow({ inclusion }: { inclusion: ResolvedPackageInclusion }) {
  return (
    <li className='flex items-start gap-2.5 text-foreground/85 text-sm leading-relaxed'>
      <span className='bg-primary mt-2 size-1 shrink-0 rounded-full' aria-hidden='true' />
      <span className='min-w-0'>{inclusionPhrase(inclusion)}</span>
    </li>
  );
}
