import type { ServicePackageWithInclusions, StudioServiceWithBranches } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { selectFeaturedPackages } from '../../lib/featured';
import { peso } from '../../lib/format';
import { packageChips, packageCover } from './card-system';
import {
  GALLERY_DRAFT,
  HERO_BLURB_DRAFT,
  HERO_PHOTO,
  HERO_PHOTO_ALT,
  KICKERS_DRAFT,
  TESTIMONIALS_PLACEHOLDER,
} from './copy';

// PROTOTYPE (#111) Track 1 — Home variant B, "Editorial mat": the studio's
// wall of framed work. Wash-mat hero with a photo collage (ink-framed mats
// + mono captions), masonry gallery, horizontal package cards, an editorial
// services index, an asymmetric testimonial band, and the ink emphasis
// strip as the inverted closing band. Same content as variant A; the
// composition is the argument. Seams kept; branches body strip dropped per
// the ruling. All DRAFT copy awaits owner ratification.

const MAT = 'bg-card border-line-soft overflow-hidden rounded-xl border shadow-sm';

export function HomeVariantB({
  packages,
  services,
}: {
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
}) {
  const { heading, packages: strip } = selectFeaturedPackages(packages);
  const [tall, ...rest] = GALLERY_DRAFT;

  return (
    <div>
      {/* 1 — Image-led hero, matted: text block left, framed collage right.
            The collage IS the portfolio argument (showcase-then-convert). */}
      <section className='border-line-soft border-b bg-wash-base'>
        <div className='mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-12 md:py-20'>
          <div className='md:col-span-5'>
            <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
              Sevendays Photography
            </p>
            <h1 className='mt-4 font-bold font-serif text-5xl text-brand-ink md:text-6xl'>
              Three branches. One standard of light.
            </h1>
            {/* DRAFT blurb — owner ratifies verbatim (#111 draft-and-ratify). */}
            <p className='mt-5 max-w-prose text-muted-text'>{HERO_BLURB_DRAFT}</p>
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
                  'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
                )}
              >
                View services
              </Link>
            </div>
            <p className='mt-10 font-mono text-[11px] text-muted-text'>
              Stand-in imagery — the studio's own portfolio arrives at M5.
            </p>
          </div>
          <div className='grid grid-cols-2 gap-3 md:col-span-7'>
            <figure className='col-span-2 sm:col-span-1 sm:row-span-2'>
              <div className={cn(MAT, 'h-full')}>
                <img
                  src={HERO_PHOTO}
                  alt={HERO_PHOTO_ALT}
                  className='h-72 w-full object-cover sm:h-full sm:min-h-96'
                />
              </div>
              <figcaption className='mt-2 font-mono text-[11px] text-muted-text'>
                {tall.caption}
              </figcaption>
            </figure>
            {rest.slice(0, 2).map((item) => (
              <figure key={item.src} className='max-sm:col-span-2 sm:col-span-1'>
                <div className={MAT}>
                  <img
                    src={item.src}
                    alt={`${item.caption} — stand-in`}
                    className='h-44 w-full object-cover'
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

      {/* 2 — Gallery strip (new seam value): masonry wall, varied heights —
            the anti-grid contrast to variant A's cinema row. */}
      <section data-strip='gallery'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
            {KICKERS_DRAFT.gallery}
          </p>
          <h2 className='mt-2 font-semibold font-serif text-3xl text-brand-ink'>The work</h2>
          <div className='mt-8 columns-2 gap-4 md:columns-3 [&>figure]:mb-4'>
            {GALLERY_DRAFT.map((item) => (
              <figure key={item.src} className='break-inside-avoid'>
                <div className={MAT}>
                  <img
                    src={item.src}
                    alt={`${item.caption} — stand-in`}
                    className='w-full object-cover'
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

      {/* 3 — Featured packages: the unified card system in a horizontal,
            2-col editorial orientation (same anatomy, wider mat). */}
      <section className='border-line-soft border-y bg-wash-a' data-strip='featured'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
            {KICKERS_DRAFT.packages}
          </p>
          <h2 className='mt-2 font-semibold font-serif text-3xl text-brand-ink'>{heading}</h2>
          <div className='mt-8 grid gap-5 lg:grid-cols-2'>
            {strip.map((p) => (
              <article
                key={p.id}
                className='flex flex-col gap-3 rounded-xl border border-brand-gray-cool bg-card p-5 shadow-sm sm:flex-row'
              >
                <div className='relative h-28 shrink-0 overflow-hidden rounded-lg border border-line-soft sm:w-44'>
                  <img
                    src={packageCover(p.id)}
                    alt={`Cover for ${p.name} — stand-in until R2 assets arrive`}
                    className='size-full object-cover'
                    loading='lazy'
                  />
                </div>
                <div className='flex min-w-0 flex-col gap-2'>
                  <h3 className='truncate font-semibold font-serif text-brand-ink text-lg'>
                    {p.name}
                  </h3>
                  <p className='font-mono text-muted-text text-sm'>{peso(p.priceCents)}</p>
                  <p className='line-clamp-2 text-muted-text text-sm'>{p.description}</p>
                  <div className='flex flex-wrap gap-1'>
                    {packageChips(p)
                      .slice(0, 3)
                      .map((chip) => (
                        <span
                          key={chip}
                          className='inline-flex max-w-44 items-center truncate rounded-full bg-secondary px-2.5 py-0.5 font-medium text-[11px] text-secondary-foreground'
                        >
                          {chip}
                        </span>
                      ))}
                  </div>
                  <Link
                    to='/book'
                    search={{ package: p.id }}
                    className={cn(
                      buttonVariants({ size: 'sm', variant: 'outline' }),
                      'mt-auto self-start focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
                    )}
                  >
                    Book now
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Services teaser: an editorial index — numbered rows, hairline
            rules, no cards at all. */}
      <section data-strip='services'>
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

      {/* 5 — Testimonials: CLEARLY-placeholder fake data (owner ruling);
            one large pull-quote, two smaller — asymmetric on wash. */}
      <section className='border-line-soft border-y bg-wash-b' data-strip='testimonials'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
            {KICKERS_DRAFT.testimonials}
          </p>
          <div className='mt-8 grid gap-8 md:grid-cols-5'>
            <figure className='md:col-span-3'>
              <blockquote className='font-semibold font-serif text-3xl text-brand-ink leading-snug'>
                “{TESTIMONIALS_PLACEHOLDER[0].quote}”
              </blockquote>
              <figcaption className='mt-4'>
                <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-wider'>
                  {TESTIMONIALS_PLACEHOLDER[0].name}
                </p>
                <p className='mt-1 text-muted-text text-sm'>
                  {TESTIMONIALS_PLACEHOLDER[0].context}
                </p>
              </figcaption>
            </figure>
            <div className='flex flex-col gap-6 md:col-span-2'>
              {TESTIMONIALS_PLACEHOLDER.slice(1).map((t) => (
                <figure key={t.context} className='border-line-soft border-l-2 pl-4'>
                  <blockquote className='text-brand-ink'>{t.quote}</blockquote>
                  <figcaption className='mt-2'>
                    <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-wider'>
                      {t.name}
                    </p>
                    <p className='mt-1 text-muted-text text-sm'>{t.context}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className='mt-6 font-mono text-[11px] text-muted-text'>
            PLACEHOLDER TESTIMONIALS — REAL CLIENT WORDS ARRIVE AT M5.
          </p>
        </div>
      </section>

      {/* 6 — Emphasis strip ("Find a branch"): the ink-band inversion, as a
            structural alternative to A's gray-light band. */}
      <section className='bg-brand-ink' data-strip='call-visit'>
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-10 md:flex-row md:items-center'>
          <div>
            <h2 className='font-semibold font-serif text-white text-xl'>
              Not sure which session fits?
            </h2>
            <p className='mt-1 text-sm text-white/85'>
              Call or visit a branch — we will help you choose.
            </p>
          </div>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Find a branch
          </Link>
        </div>
      </section>
    </div>
  );
}
