import type {
  GalleryRead,
  PublicTestimonial,
  ServicePackageRead,
  SiteSettings,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { selectFeaturedPackages } from '../lib/featured';
import { paginateTestimonials } from '../lib/home-testimonials';
import { FeaturedPlates } from './featured-plates';
import { ServiceImageCard } from './home-cards';
import { HERO_PHOTO, HERO_PHOTO_ALT } from './home-copy';
import { MosaicPhotoGrid } from './mosaic-photo-grid';

// The ruled home composition (#164 Round 2, closed "all goods" 2026-10-01;
// built M7 #223), one voice per section (kickers retired; serif headings
// carry — the settings kicker fields drive the heading TEXT now, defaults
// in code). Slot map: 1 hero under the glass bar (-mt-14 — the photo reads
// through the bar) → 2 the LIVE mosaic gallery (no title-captions on home)
// → 3 featured as D2 light split plates → 4 the full-bleed 3-copy services
// marquee (desktop) / JS transform stepper (mobile) → 5 REAL testimonials,
// paginated 3/page with a page-change reveal → 6 the #92 emphasis strip.
// The copy consumes site settings end to end (hero title/blurb, eyebrow,
// the four section headings) — defaults when unset.
const SIDES_COUNT = 2;

export function HomeImageLed({
  settings,
  packages,
  services,
  gallery,
  testimonials,
}: {
  settings: SiteSettings;
  packages: ServicePackageRead[];
  services: StudioServiceWithBranches[];
  gallery: GalleryRead;
  testimonials: PublicTestimonial[];
}) {
  const selection = selectFeaturedPackages(packages);
  // The read arrives resolved (defaults applied at the server-fn seam), but
  // SiteSettings keeps nullability at the type level — coalesce to the
  // selection's own ruled heading (byte-identical to the #215 default).
  const featuredHeading = selection.isFeatured
    ? (settings.kickerPackages ?? selection.heading)
    : selection.heading;
  // Round 2 owner ruling: paginated testimonials — 3 per page (a
  // pull-quote lead + side rail on every page), non-looping.
  const pages = paginateTestimonials(testimonials);
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, Math.max(0, pages.length - 1));
  const current = pages[safePage]?.items ?? [];
  const lead = current[0];
  const sides = current.slice(1, SIDES_COUNT + 1);
  // OWNER-RULED: the services carousel on MOBILE is a JS transform stepper
  // — each card CENTERED in the viewport, one card per 3.5s interval, drag
  // with snap-to-nearest on release, wrapping seamlessly through the
  // identical loop copies. Scroll-snap + programmatic smooth scrolling
  // proved browser-fragile twice in the arc, so NO native scrolling is
  // involved: the track moves by transform, the container never scrolls.
  // DESKTOP keeps the pure CSS marquee — the md: animation overrides the
  // inline transform, and every stepper path early-returns at md. Reduced
  // motion = instant steps, still on the interval (auto-scroll is the
  // owner's explicit ask).
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const vIndex = useRef(0);
  const dragRef = useRef<{ startX: number; baseV: number; lastDx: number } | null>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    const track = trackRef.current;
    if (!carousel || !track) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

    const apply = (smooth: boolean) => {
      const first = track.children[0] as HTMLElement | undefined;
      if (!first) return;
      const cardW = first.offsetWidth;
      const centerOffset = Math.max(0, (carousel.clientWidth - (cardW - 16)) / 2);
      track.style.transition = smooth && !reduced ? 'transform 500ms ease-out' : 'none';
      track.style.transform = `translateX(${centerOffset - vIndex.current * cardW}px)`;
    };
    const count = services.length;

    const id = setInterval(() => {
      if (dragRef.current || isDesktop()) return;
      vIndex.current += 1;
      apply(true);
      if (vIndex.current >= count) {
        // Slid into the identical first loop copy — normalize silently
        // once the transition has settled (identical pixels, invisible).
        window.setTimeout(() => {
          vIndex.current -= count;
          apply(false);
        }, 540);
      }
    }, 3500);

    const onDown = (e: PointerEvent) => {
      if (isDesktop()) return;
      dragRef.current = { startX: e.clientX, baseV: vIndex.current, lastDx: 0 };
      carousel.setPointerCapture?.(e.pointerId);
      track.style.transition = 'none';
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const first = track.children[0] as HTMLElement | undefined;
      if (!first) return;
      const cardW = first.offsetWidth;
      const centerOffset = Math.max(0, (carousel.clientWidth - (cardW - 16)) / 2);
      d.lastDx = e.clientX - d.startX;
      track.style.transform = `translateX(${centerOffset - (d.baseV * cardW + d.lastDx)}px)`;
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      const first = track.children[0] as HTMLElement | undefined;
      if (!first) return;
      const cardW = first.offsetWidth;
      let v = Math.max(0, Math.round(d.baseV + d.lastDx / cardW));
      if (v >= count) v -= count;
      vIndex.current = v;
      apply(true);
    };
    const onResize = () => {
      if (!isDesktop()) apply(false);
    };

    carousel.addEventListener('pointerdown', onDown);
    carousel.addEventListener('pointermove', onMove);
    carousel.addEventListener('pointerup', onUp);
    carousel.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', onResize);
    apply(false);
    return () => {
      clearInterval(id);
      carousel.removeEventListener('pointerdown', onDown);
      carousel.removeEventListener('pointermove', onMove);
      carousel.removeEventListener('pointerup', onUp);
      carousel.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', onResize);
    };
    // The stepper owns the carousel's whole mobile behavior; the card list
    // is its only data dependency. The refs are never stale; apply/step
    // helpers close over them.
    // biome-ignore lint/correctness/useExhaustiveDependencies: the stepper reads refs (never stale) and services.length; apply/step helpers close over refs.
  }, [services.length]);

  return (
    <div>
      {/* 1 — Hero under the glass bar: the photo reads through the ruled
          chrome (-mt-14 = the 56px bar). Copy consumes settings (title,
          blurb, brand eyebrow) — the incumbent photo and CTAs stand. */}
      <section className='relative isolate overflow-hidden bg-brand-ink -mt-14'>
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
          <p className='text-brand-300 font-mono text-xs font-bold uppercase tracking-[0.16em]'>
            {settings.brandName} {settings.brandTagline}
          </p>
          <h1 className='mt-4 max-w-2xl font-serif text-5xl font-bold text-white md:text-6xl'>
            {settings.homeTitle}
          </h1>
          <p className='mt-5 max-w-prose text-lg text-white/90'>{settings.homeDescription}</p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <Link
              to='/book'
              className={cn(
                buttonVariants({ size: 'lg' }),
                'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
              )}
            >
              <CalendarPlus className='size-4' aria-hidden='true' />
              Book now
            </Link>
            <Link
              to='/services'
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
              )}
            >
              Services
            </Link>
          </div>
        </div>
      </section>

      {/* 2 — Gallery: the LIVE read's mosaic wall — no title-captions on
          home (ruled; captions render on about's wall, #224). */}
      <section className='border-line-soft border-b' data-strip='gallery'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <h2 className='font-semibold font-serif text-3xl text-brand-ink dark:text-foreground'>
            {settings.kickerGallery}
          </h2>
          {gallery.photos.length > 0 ? (
            <MosaicPhotoGrid photos={gallery.photos} />
          ) : (
            // The shared wall's ruled line (about's placeholder law) — a
            // zero-photo read still reads as deliberate.
            <p className='text-muted-foreground mt-8'>Portfolio coming soon.</p>
          )}
          <Link
            to='/about'
            className='text-brand-700 hover:text-brand-800 mt-6 inline-block text-sm font-medium underline underline-offset-4 dark:text-brand-300 dark:hover:text-brand-200'
          >
            More of the work on About
          </Link>
        </div>
      </section>

      {/* 3 — Featured packages: the ruled D2 plates. The M5 empty-state
          rule stands: zero ACTIVE packages collapse the strip ENTIRELY. */}
      {packages.length > 0 && (
        <FeaturedPlates heading={featuredHeading} strip={selection.packages} />
      )}

      {/* 4 — Services: the full-bleed 3-copy marquee (desktop) — the track
          holds the list three times so -33.3333% is one copy-width (two
          full copies always remain behind the loop point on any screen);
          hover pauses; the edge mask fades the cards at the viewport. A
          zero-service read collapses the section (the featured-collapse
          precedent). */}
      {services.length > 0 && (
        <section className='border-line-soft border-y bg-wash-a' data-strip='services'>
          <div className='mx-auto max-w-5xl px-6 pt-16'>
            <h2 className='font-semibold font-serif text-3xl text-brand-ink dark:text-foreground'>
              {settings.kickerServices}
            </h2>
          </div>
          <div
            ref={carouselRef}
            className='group mt-8 touch-pan-y overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%_-_1.5rem),transparent)] md:[mask-image:linear-gradient(to_right,transparent,black_4rem,black_calc(100%_-_4rem),transparent)]'
          >
            <div
              ref={trackRef}
              className='flex w-max md:animate-[marquee_45s_linear_infinite] motion-reduce:md:animate-none group-hover:[animation-play-state:paused]'
            >
              {services.map((s) => (
                <div key={s.id} className='w-80 shrink-0 pr-4 md:w-96'>
                  <ServiceImageCard service={s} />
                </div>
              ))}
              {services.map((s) => (
                <div
                  key={`loop-1-${s.id}`}
                  aria-hidden='true'
                  className='w-80 shrink-0 pr-4 md:w-96'
                >
                  <ServiceImageCard service={s} />
                </div>
              ))}
              {services.map((s) => (
                <div
                  key={`loop-2-${s.id}`}
                  aria-hidden='true'
                  className='w-80 shrink-0 pr-4 md:w-96'
                >
                  <ServiceImageCard service={s} />
                </div>
              ))}
            </div>
          </div>
          <div className='mx-auto max-w-5xl px-6 pb-16'>
            <Link
              to='/services'
              className='text-brand-700 hover:text-brand-800 mt-6 inline-block text-sm font-medium underline underline-offset-4 dark:text-brand-300 dark:hover:text-brand-200'
            >
              View all services
            </Link>
          </div>
        </section>
      )}

      {/* 5 — Testimonials: REAL client words (the audit's stand-in gap
          closes), paginated with a page-change reveal. */}
      <section className='border-line-soft border-y bg-wash-b' data-strip='testimonials'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <h2 className='font-semibold font-serif text-3xl text-brand-ink dark:text-foreground'>
            {settings.kickerTestimonials}
          </h2>
          {lead ? (
            <>
              {/* The page content re-reveals on every page change (keyed by
                  page id; reduced motion swaps to a plain fade). */}
              <div
                key={pages[safePage]?.id ?? 'page-empty'}
                className='mt-8 grid gap-8 motion-safe:animate-[reveal_500ms_ease-out_both] md:grid-cols-5'
              >
                <figure className='md:col-span-3'>
                  <blockquote className='font-semibold font-serif text-3xl text-brand-ink leading-snug dark:text-foreground'>
                    “{lead.quote}”
                  </blockquote>
                  <figcaption className='mt-4'>
                    <p className='text-brand-700 font-mono text-xs font-bold uppercase tracking-wider dark:text-brand-400'>
                      {lead.person}
                    </p>
                  </figcaption>
                </figure>
                <div className='flex flex-col gap-6 md:col-span-2'>
                  {sides.map((t) => (
                    <figure key={t.id} className='border-line-soft border-l-2 pl-4'>
                      <blockquote className='text-brand-ink dark:text-foreground'>
                        {t.quote}
                      </blockquote>
                      <figcaption className='mt-2'>
                        <p className='text-brand-700 font-mono text-xs font-bold uppercase tracking-wider dark:text-brand-400'>
                          {t.person}
                        </p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
              {pages.length > 1 && (
                <div className='mt-8 flex items-center gap-4'>
                  <button
                    type='button'
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    aria-label='Previous testimonials'
                    className='border-line-soft bg-card text-brand-ink inline-flex size-9 items-center justify-center rounded-full border transition-opacity hover:bg-wash-a focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring disabled:opacity-40 dark:text-foreground'
                  >
                    <ChevronLeft className='size-4' aria-hidden='true' />
                  </button>
                  <div className='flex gap-2'>
                    {pages.map((p, i) => (
                      <button
                        key={p.id}
                        type='button'
                        onClick={() => setPage(i)}
                        aria-label={`Testimonials page ${i + 1}`}
                        aria-current={i === safePage ? 'true' : undefined}
                        className={cn(
                          'focus-visible:ring-brand-focus-ring size-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3',
                          i === safePage ? 'bg-brand-ink' : 'bg-brand-gray-cool hover:bg-brand-700'
                        )}
                      />
                    ))}
                  </div>
                  <button
                    type='button'
                    onClick={() => setPage(Math.min(pages.length - 1, safePage + 1))}
                    disabled={safePage === pages.length - 1}
                    aria-label='Next testimonials'
                    className='border-line-soft bg-card text-brand-ink inline-flex size-9 items-center justify-center rounded-full border transition-opacity hover:bg-wash-a focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring disabled:opacity-40 dark:text-foreground'
                  >
                    <ChevronRight className='size-4' aria-hidden='true' />
                  </button>
                </div>
              )}
              <Link
                to='/about'
                className='text-brand-700 hover:text-brand-800 mt-6 inline-block text-sm font-medium underline underline-offset-4 dark:text-brand-300 dark:hover:text-brand-200'
              >
                More kind words — and share your own
              </Link>
            </>
          ) : (
            // The ruled empty line — real rows arrive with the CMS.
            <p className='text-muted-foreground mt-6'>
              Client words are on their way — check back soon.
            </p>
          )}
        </div>
      </section>

      {/* 6 — Emphasis strip: the ratified #92 gray-light band. */}
      <section className='border-line-soft border-t bg-brand-gray-light' data-strip='call-visit'>
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='font-semibold font-serif text-brand-ink text-xl dark:text-foreground'>
              Not sure which session fits?
            </h2>
            <p className='text-brand-700 mt-1 text-sm dark:text-brand-400'>
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
