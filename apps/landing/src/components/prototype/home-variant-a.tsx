import type { ServicePackageWithInclusions, StudioServiceWithBranches } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import { selectFeaturedPackages } from '../../lib/featured';
import { CARD_GRID, PrototypePackageCard } from './card-system';
import {
  GALLERY_DRAFT,
  HERO_BLURB_DRAFT,
  HERO_PHOTO,
  HERO_PHOTO_ALT,
  KICKERS_DRAFT,
  TESTIMONIALS_PLACEHOLDER,
} from './copy';

// PROTOTYPE (#111) Track 1 — Home variant A, "Cinema": a full-bleed photo
// hero, a horizontally scrolling gallery strip, then the ruled lineup
// (featured packages → services teaser → testimonials → emphasis strip).
// Same content as variant B; composition differs. Seams kept: data-strip
// values ride the sections; the branches body strip is DROPPED per the
// ruling (branch links live in footer + emphasis strip). All DRAFT copy
// awaits owner ratification.

export function HomeVariantA({
  packages,
  services,
}: {
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
}) {
  const { heading, packages: strip } = selectFeaturedPackages(packages);

  return (
    <div>
      {/* 1 — Image-led hero: the photo IS the opening argument. Text sits on
          the ink gradient (white on ink 18.6:1). */}
      <section className='relative isolate overflow-hidden bg-brand-ink'>
        <img
          src={HERO_PHOTO}
          alt={HERO_PHOTO_ALT}
          className='absolute inset-0 size-full object-cover opacity-55'
        />
        <div
          className='absolute inset-0 bg-gradient-to-r from-brand-ink via-brand-ink/80 to-brand-ink/20'
          aria-hidden='true'
        />
        <div className='relative mx-auto max-w-5xl px-6 py-24 md:py-36'>
          <p className='font-bold font-mono text-brand-300 text-xs uppercase tracking-[0.16em]'>
            Sevendays Photography
          </p>
          <h1 className='mt-4 max-w-2xl font-bold font-serif text-5xl text-white md:text-6xl'>
            Three branches. One standard of light.
          </h1>
          {/* DRAFT blurb — owner ratifies verbatim (#111 draft-and-ratify). */}
          <p className='mt-5 max-w-prose text-lg text-white/90'>{HERO_BLURB_DRAFT}</p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <Link
              to='/book'
              className={cn(
                buttonVariants({ size: 'lg' }),
                'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
              )}
            >
              Book now
            </Link>
            <Link
              to='/services'
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
              )}
            >
              View services
            </Link>
          </div>
          <p className='mt-10 font-mono text-[11px] text-white/60'>
            Stand-in image — the studio's own portfolio arrives at M5.
          </p>
        </div>
      </section>

      {/* 2 — Gallery strip (new seam value): scroll-snap row, mono captions. */}
      <section className='border-line-soft border-b' data-strip='gallery'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <div className='flex items-end justify-between gap-4'>
            <div>
              <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
                {KICKERS_DRAFT.gallery}
              </p>
              <h2 className='mt-2 font-semibold font-serif text-3xl text-brand-ink'>The work</h2>
            </div>
            <p className='hidden font-mono text-[11px] text-muted-text sm:block'>scroll →</p>
          </div>
          <div className='-mx-6 mt-8 flex snap-x gap-4 overflow-x-auto px-6 pb-4'>
            {GALLERY_DRAFT.map((item) => (
              <figure key={item.src} className='w-64 shrink-0 snap-start'>
                <div className='overflow-hidden rounded-xl border border-line-soft bg-card shadow-sm'>
                  <img
                    src={item.src}
                    alt={`${item.caption} — stand-in`}
                    className='h-80 w-full object-cover'
                    loading='lazy'
                  />
                </div>
                <figcaption className='mt-2 font-mono text-[11px] text-muted-text'>
                  {item.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — Featured packages: the unified card system, #92 density. */}
      <section className='mx-auto max-w-5xl px-6 py-16' data-strip='featured'>
        <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
          {KICKERS_DRAFT.packages}
        </p>
        <h2 className='mt-2 font-semibold font-serif text-3xl text-brand-ink'>{heading}</h2>
        <div className={cn(CARD_GRID.d92, 'mt-8')}>
          {strip.map((p) => (
            <PrototypePackageCard key={p.id} pkg={p} density='d92' />
          ))}
        </div>
      </section>

      {/* 4 — Services teaser: quiet editorial rows (convert quietly after
          the showcase). Deep links preserved per user story 7. */}
      <section className='border-line-soft border-y bg-wash-a' data-strip='services'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
            {KICKERS_DRAFT.services}
          </p>
          <div className='mt-6 grid gap-x-10 md:grid-cols-2'>
            {services.map((s) => (
              <Link
                key={s.id}
                to='/book'
                search={{ service: s.id }}
                className='group flex items-center justify-between gap-4 border-line-soft border-t py-4'
              >
                <span className='truncate font-medium text-brand-ink'>{s.name}</span>
                <span className='flex shrink-0 items-center gap-3'>
                  <span className='font-mono text-muted-text text-sm'>
                    {new Intl.NumberFormat('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    }).format(s.priceCents / 100)}
                  </span>
                  <span className='inline-flex items-center font-medium text-brand-700 text-sm group-hover:text-brand-800'>
                    Book
                    <ChevronRight className='size-4' aria-hidden='true' />
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <Link
            to='/services'
            className='mt-6 inline-block font-medium text-brand-700 text-sm underline underline-offset-4 hover:text-brand-800'
          >
            View all services
          </Link>
        </div>
      </section>

      {/* 5 — Testimonials: CLEARLY-placeholder fake data (owner ruling;
          real words arrive at M5). Ink band keeps the scroll cinematic. */}
      <section className='bg-brand-ink' data-strip='testimonials'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='font-bold font-mono text-brand-300 text-xs uppercase tracking-[0.16em]'>
            {KICKERS_DRAFT.testimonials}
          </p>
          <h2 className='mt-2 font-semibold font-serif text-3xl text-white'>Kind words</h2>
          <div className='mt-8 grid gap-4 md:grid-cols-3'>
            {TESTIMONIALS_PLACEHOLDER.map((t) => (
              <figure
                key={t.context}
                className='flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-5'
              >
                <span
                  className='font-serif text-4xl text-brand-300 leading-none'
                  aria-hidden='true'
                >
                  “
                </span>
                <blockquote className='text-white/90'>{t.quote}</blockquote>
                <figcaption className='mt-auto pt-2'>
                  <p className='font-bold font-mono text-brand-300 text-xs uppercase tracking-wider'>
                    {t.name}
                  </p>
                  <p className='mt-1 text-sm text-white/70'>{t.context}</p>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className='mt-6 font-mono text-[11px] text-white/60'>
            PLACEHOLDER TESTIMONIALS — REAL CLIENT WORDS ARRIVE AT M5.
          </p>
        </div>
      </section>

      {/* 6 — Emphasis strip ("Find a branch"): the ratified #92 gray-light
          band, unchanged. */}
      <section className='border-line-soft border-t bg-brand-gray-light' data-strip='call-visit'>
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='font-semibold font-serif text-brand-ink text-xl'>
              Not sure which session fits?
            </h2>
            <p className='mt-1 text-brand-700 text-sm'>
              Call or visit a branch — we will help you choose.
            </p>
          </div>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Find a branch
          </Link>
        </div>
      </section>
    </div>
  );
}
