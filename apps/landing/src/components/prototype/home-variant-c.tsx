import type { ServicePackageWithInclusions, StudioServiceWithBranches } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { selectFeaturedPackages } from '../../lib/featured';
import { peso } from '../../lib/format';
import { CARD_GRID, PrototypePackageCard } from './card-system';
import {
  GALLERY_DRAFT,
  HERO_BLURB_DRAFT,
  HERO_PHOTO,
  HERO_PHOTO_ALT,
  KICKERS_DRAFT,
  TESTIMONIALS_PLACEHOLDER,
} from './copy';

// PROTOTYPE (#111) Track 1 — Home variant C, "the combination": the owner
// asked for A and B merged, so this assembles the strongest piece of each
// composition per ruled lineup slot. Every section is a candidate — the
// owner swaps pieces until the mix is right:
//   1 hero:        A's full-bleed cinematic image hero
//   2 gallery:     B's masonry wall of work
//   3 packages:    A's 3-col unified cards (#92 density)
//   4 services:    B's numbered editorial index, on A's wash band
//   5 testimonials: A's ink band + B's pull-quote hierarchy
//   6 emphasis:    the ratified #92 gray-light band (A)
// Same seams and DRAFT copy as A/B; branches body strip stays dropped.

export function HomeVariantC({
  packages,
  services,
}: {
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
}) {
  const { heading, packages: strip } = selectFeaturedPackages(packages);

  return (
    <div>
      {/* 1 — Hero: A's full-bleed cinema opening (the image IS the ad). */}
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

      {/* 2 — Gallery: B's masonry wall (more work visible at once than A's
            scroll row). */}
      <section className='border-line-soft border-b' data-strip='gallery'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
            {KICKERS_DRAFT.gallery}
          </p>
          <h2 className='mt-2 font-semibold font-serif text-3xl text-brand-ink'>The work</h2>
          <div className='mt-8 columns-2 gap-4 md:columns-3 [&>figure]:mb-4'>
            {GALLERY_DRAFT.map((item) => (
              <figure
                key={item.src}
                className='break-inside-avoid overflow-hidden rounded-xl border border-line-soft bg-card shadow-sm'
              >
                <img
                  src={item.src}
                  alt={`${item.caption} — stand-in`}
                  className='w-full object-cover'
                  loading='lazy'
                />
                <figcaption className='mt-2 px-3 pb-2 font-mono text-[11px] text-muted-text'>
                  {item.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — Featured packages: A's 3-col unified grid (#92 density). */}
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

      {/* 4 — Services: B's numbered index on A's wash band. */}
      <section className='border-line-soft border-y bg-wash-a' data-strip='services'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
            {KICKERS_DRAFT.services}
          </p>
          <div className='mt-6'>
            {services.map((s, i) => (
              <Link
                key={s.id}
                to='/book'
                search={{ service: s.id }}
                className='group flex items-baseline gap-5 border-line-soft border-t py-5'
              >
                <span className='font-mono text-muted-text text-xs'>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className='min-w-0 flex-1 truncate font-semibold font-serif text-brand-ink text-xl'>
                  {s.name}
                </span>
                <span className='shrink-0 font-mono text-muted-text text-sm'>
                  {peso(s.priceCents)}
                </span>
                <span className='shrink-0 font-medium text-brand-700 text-sm group-hover:text-brand-800'>
                  Book
                </span>
              </Link>
            ))}
            <div className='border-line-soft border-t'>
              <Link
                to='/services'
                className='mt-5 inline-block font-medium text-brand-700 text-sm underline underline-offset-4 hover:text-brand-800'
              >
                View all services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5 — Testimonials: A's ink band + B's pull-quote hierarchy
            (one large serif quote, two smaller), CLEARLY placeholder. */}
      <section className='bg-brand-ink' data-strip='testimonials'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='font-bold font-mono text-brand-300 text-xs uppercase tracking-[0.16em]'>
            {KICKERS_DRAFT.testimonials}
          </p>
          <div className='mt-8 grid gap-10 md:grid-cols-5'>
            <figure className='md:col-span-3'>
              <blockquote className='font-semibold font-serif text-3xl text-white leading-snug'>
                “{TESTIMONIALS_PLACEHOLDER[0].quote}”
              </blockquote>
              <figcaption className='mt-4'>
                <p className='font-bold font-mono text-brand-300 text-xs uppercase tracking-wider'>
                  {TESTIMONIALS_PLACEHOLDER[0].name}
                </p>
                <p className='mt-1 text-sm text-white/70'>{TESTIMONIALS_PLACEHOLDER[0].context}</p>
              </figcaption>
            </figure>
            <div className='flex flex-col gap-6 md:col-span-2'>
              {TESTIMONIALS_PLACEHOLDER.slice(1).map((t) => (
                <figure key={t.context} className='border-white/15 border-l-2 pl-4'>
                  <blockquote className='text-white/90'>{t.quote}</blockquote>
                  <figcaption className='mt-2'>
                    <p className='font-bold font-mono text-brand-300 text-xs uppercase tracking-wider'>
                      {t.name}
                    </p>
                    <p className='mt-1 text-sm text-white/70'>{t.context}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className='mt-6 font-mono text-[11px] text-white/60'>
            PLACEHOLDER TESTIMONIALS — REAL CLIENT WORDS ARRIVE AT M5.
          </p>
        </div>
      </section>

      {/* 6 — Emphasis strip: the ratified #92 gray-light band. */}
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
