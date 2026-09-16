import type { ServicePackageWithInclusions, StudioServiceWithBranches } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { selectFeaturedPackages } from '../../lib/featured';
import { CARD_GRID, PrototypePackageCoverCard, PrototypeServiceImageCard } from './card-system';
import {
  GALLERY_DRAFT,
  HERO_BLURB_DRAFT,
  HERO_PHOTO,
  HERO_PHOTO_ALT,
  KICKERS_DRAFT,
  TESTIMONIALS_PLACEHOLDER,
} from './copy';

// PROTOTYPE (#111) Track 1 — Home variant D, owner-specified mix:
//   1 hero:         A (full-bleed cinema)
//   2 gallery:      B (masonry wall)
//   3 packages:     cover-driven (photo heroes the card; title + price
//                   overlaid on the tinted cover, text-heavy body on
//                   white) + SANS card titles per the D reaction
//   4 services:     NEW — cards with FULL IMAGE backgrounds (photo IS the
//                   card; ink gradient carries legibility; system mechanics
//                   kept: 1-line title, fixed height, single affordance)
//   5 testimonials: B (wash band, asymmetric pull-quote)
//   6 emphasis:     A (the ratified #92 gray-light band)
// Same seams and DRAFT copy as A/B/C; branches body strip stays dropped.

export function HomeVariantD({
  packages,
  services,
}: {
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
}) {
  const { heading, packages: strip } = selectFeaturedPackages(packages);

  return (
    <div>
      {/* 1 — Hero: A's full-bleed cinema opening. */}
      <section className='bg-brand-ink relative isolate overflow-hidden'>
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
          <p className='text-brand-300 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            Sevendays Photography
          </p>
          <h1 className='mt-4 max-w-2xl font-serif text-5xl font-bold text-white md:text-6xl'>
            Three branches. One standard of light.
          </h1>
          {/* DRAFT blurb — owner ratifies verbatim (#111 draft-and-ratify). */}
          <p className='mt-5 max-w-prose text-lg text-white/90'>{HERO_BLURB_DRAFT}</p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <Link
              to='/book'
              className={cn(
                buttonVariants({ size: 'lg' }),
                'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
              )}
            >
              Book now
            </Link>
            <Link
              to='/services'
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-brand-focus-ring focus-visible:ring-3'
              )}
            >
              View services
            </Link>
          </div>
          <p className='text-white/60 mt-10 font-mono text-[11px]'>
            Photo from the studio — more of our work arrives at M5.
          </p>
        </div>
      </section>

      {/* 2 — Gallery: B's masonry wall. */}
      <section className='border-line-soft border-b' data-strip='gallery'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            {KICKERS_DRAFT.gallery}
          </p>
          <h2 className='text-brand-ink mt-2 font-serif text-3xl font-semibold'>The work</h2>
          <div className='mt-8 columns-2 gap-4 md:columns-3 [&>figure]:mb-4'>
            {GALLERY_DRAFT.map((item) => (
              <figure
                key={item.src}
                className='border-line-soft bg-card break-inside-avoid overflow-hidden rounded-xl border shadow-sm'
              >
                <img
                  src={item.src}
                  alt={`${item.caption} — stand-in`}
                  className='w-full object-cover'
                  loading='lazy'
                />
                <figcaption className='text-muted-text mt-2 px-3 pb-2 font-mono text-[11px]'>
                  {item.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — Featured packages: cover-driven cards (owner ruling) — the
            photo is the card's hero, title + price overlaid on the two-layer
            tint, text-heavy body on white. Sans titles per D. */}
      <section className='mx-auto max-w-5xl px-6 py-16' data-strip='featured'>
        <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
          {KICKERS_DRAFT.packages}
        </p>
        <h2 className='text-brand-ink mt-2 font-serif text-3xl font-semibold'>{heading}</h2>
        <div className={cn(CARD_GRID.d92, 'mt-8')}>
          {strip.map((p) => (
            <PrototypePackageCoverCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>

      {/* 4 — Services: full-image-background cards (the NEW treatment the
            owner asked to see). */}
      <section className='border-line-soft bg-wash-a border-y' data-strip='services'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            {KICKERS_DRAFT.services}
          </p>
          <div className='mt-8 grid gap-4 md:grid-cols-2'>
            {services.map((s) => (
              <PrototypeServiceImageCard key={s.id} service={s} />
            ))}
          </div>
          <Link
            to='/services'
            className='text-brand-700 hover:text-brand-800 mt-6 inline-block text-sm font-medium underline underline-offset-4'
          >
            View all services
          </Link>
        </div>
      </section>

      {/* 5 — Testimonials: B's wash band + pull-quote hierarchy, CLEARLY
            placeholder. */}
      <section className='bg-wash-b border-line-soft border-y' data-strip='testimonials'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            {KICKERS_DRAFT.testimonials}
          </p>
          <div className='mt-8 grid gap-8 md:grid-cols-5'>
            <figure className='md:col-span-3'>
              <blockquote className='text-brand-ink font-serif text-3xl leading-snug font-semibold'>
                “{TESTIMONIALS_PLACEHOLDER[0].quote}”
              </blockquote>
              <figcaption className='mt-4'>
                <p className='text-brand-700 font-mono text-xs font-bold tracking-wider uppercase'>
                  {TESTIMONIALS_PLACEHOLDER[0].name}
                </p>
                <p className='text-muted-text mt-1 text-sm'>
                  {TESTIMONIALS_PLACEHOLDER[0].context}
                </p>
              </figcaption>
            </figure>
            <div className='flex flex-col gap-6 md:col-span-2'>
              {TESTIMONIALS_PLACEHOLDER.slice(1).map((t) => (
                <figure key={t.context} className='border-line-soft border-l-2 pl-4'>
                  <blockquote className='text-brand-ink'>{t.quote}</blockquote>
                  <figcaption className='mt-2'>
                    <p className='text-brand-700 font-mono text-xs font-bold tracking-wider uppercase'>
                      {t.name}
                    </p>
                    <p className='text-muted-text mt-1 text-sm'>{t.context}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className='text-muted-text mt-6 font-mono text-[11px]'>
            PLACEHOLDER TESTIMONIALS — REAL CLIENT WORDS ARRIVE AT M5.
          </p>
        </div>
      </section>

      {/* 6 — Emphasis strip: the ratified #92 gray-light band. */}
      <section className='bg-brand-gray-light border-line-soft border-t' data-strip='call-visit'>
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='text-brand-ink font-serif text-xl font-semibold'>
              Not sure which session fits?
            </h2>
            <p className='text-brand-700 mt-1 text-sm'>
              Call or visit a branch — we will help you choose.
            </p>
          </div>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
            )}
          >
            Find a branch
          </Link>
        </div>
      </section>
    </div>
  );
}
