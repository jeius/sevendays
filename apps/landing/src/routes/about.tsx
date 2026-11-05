import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { cn } from 'cn';
import { PenLine } from 'lucide-react';
import { useState } from 'react';
import { MosaicPhotoGrid } from '../components/mosaic-photo-grid';
import { AboutSkeleton } from '../components/skeletons';
import { isEmptyJudgingParam } from '../lib/empty-override';
import {
  ALL_TAB_ID,
  deriveGalleryTabs,
  hasPortfolioPhotos,
  photosForTab,
} from '../lib/gallery-tabs';
import { pageMetaFor } from '../lib/page-head';
import { galleryQueries, siteSettingsQueries, testimonialQueries } from '../lib/queries';
import { storyParagraphs } from '../lib/story-paragraphs';

export const Route = createFileRoute('/about')({
  // SSR-prefetched like every route: a fresh page load renders current data
  // (the M5 "immediately" rule); default staleTime refetches per visit. The
  // settings ensure never throws (#215's law — the head + copy degrade to
  // code defaults).
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(galleryQueries.all()),
      queryClient.ensureQueryData(testimonialQueries.all()),
    ]);
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    return { settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    return { meta: pageMetaFor(settings.aboutTitle, settings.aboutDescription, settings) };
  },
  component: AboutPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only.
  pendingComponent: AboutSkeleton,
});

function AboutPage() {
  // The ?empty=1 judging aid (M7 #223): DEV-gated. The about empties are
  // in-page sections — the Round-5 ruling keeps them CTA-less.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().searchStr);
  const { settings } = Route.useLoaderData();
  const { data: gallery } = useSuspenseQuery(galleryQueries.all());
  const { data: testimonials } = useSuspenseQuery(testimonialQueries.all());
  const tabs = isEmpty ? [] : deriveGalleryTabs(gallery);
  const [selected, setSelected] = useState<string>(ALL_TAB_ID);
  // A refetch can empty the selected category mid-session; clamp to All.
  const activeId = tabs.some((tab) => tab.id === selected) ? selected : ALL_TAB_ID;
  const photos = photosForTab(gallery, activeId);
  // The spec's ruling: the story is plain multi-paragraph text — newlines
  // are paragraphs, rich text stays parked (the seam trims + drops
  // empties; the born-empty default renders the coming-soon line).
  const paragraphs = storyParagraphs(settings.aboutStory);

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.aboutTitle}
        </h1>
        {settings.aboutDescription && (
          <p className='mt-2 max-w-prose text-muted-foreground'>{settings.aboutDescription}</p>
        )}
        {paragraphs.length > 0 && (
          <div className='mt-4 max-w-prose space-y-3'>
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className='text-muted-foreground leading-relaxed'>
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* The portfolio — the artifact leads: the shared mosaic wall over
          the LIVE read (home + about speak one wall — #223 built it; the
          captions render here per the Round-4 ruling and #214's wire), All
          first, tabs derived (#142's behavior; the CDP-asserted seams
          data-gallery-tabs / data-portfolio-grid stand). */}
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink dark:text-foreground'>
          Portfolio
        </h2>
        {isEmpty || !hasPortfolioPhotos(gallery) ? (
          // Zero photos (or no photo-holding categories): the tab row hides
          // and the spec-verbatim placeholder renders. No grid, no tabs.
          <p className='mt-4 text-muted-foreground'>Portfolio coming soon.</p>
        ) : (
          <>
            {/* biome-ignore lint/a11y/useSemanticElements: AR4's ruled hand-rolled tab row — a fieldset would drag in form semantics; the group + aria-pressed buttons are the composition the CDP script asserts */}
            <div
              role='group'
              aria-label='Portfolio categories'
              data-gallery-tabs
              className='mt-4 flex flex-wrap gap-2'
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type='button'
                  aria-pressed={tab.id === activeId}
                  onClick={() => setSelected(tab.id)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring',
                    tab.id === activeId
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-line-soft bg-card text-foreground hover:bg-wash-a'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div data-portfolio-grid>
              <MosaicPhotoGrid photos={photos} captions />
            </div>
          </>
        )}
      </section>

      {/* Kind words — the full set as the quote wall (#164 Round 4): a
          two-column serif read with mono attributions, then the
          submissions CTA closing the page. */}
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12 pb-12'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink dark:text-foreground'>
          Kind words
        </h2>
        {isEmpty || testimonials.length === 0 ? (
          <p className='mt-2 text-muted-foreground'>What clients say is coming soon.</p>
        ) : (
          <div className='mt-6 columns-1 gap-6 md:columns-2 [&>figure]:mb-6 [&>figure]:break-inside-avoid'>
            {testimonials.map((t) => (
              <figure key={t.id} className='border-line-soft border-l-2 pl-4'>
                <blockquote className='font-serif text-brand-ink leading-relaxed dark:text-foreground'>
                  “{t.quote}”
                </blockquote>
                <figcaption className='mt-2 font-bold font-mono text-brand-700 text-xs uppercase tracking-wider dark:text-brand-300'>
                  {t.person}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {/* The submissions CTA (M7 #216, the #164 Round-4-ruled card): the
            only door to /share-your-story — v1's only public write surface. */}
        <div className='mt-10 flex flex-col items-start justify-between gap-4 rounded-xl border border-line-soft bg-card p-6 shadow-sm sm:flex-row sm:items-center'>
          <div>
            <h3 className='font-semibold font-serif text-brand-ink text-xl dark:text-foreground'>
              Shot with us recently?
            </h3>
            <p className='mt-1 text-muted-foreground text-sm'>
              Share a few words about your session — we'd love to hear it.
            </p>
          </div>
          <Link
            to='/share-your-story'
            className={cn(
              buttonVariants(),
              'shrink-0 focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <PenLine className='size-4' aria-hidden='true' />
            Share your story
          </Link>
        </div>
      </section>
    </div>
  );
}
