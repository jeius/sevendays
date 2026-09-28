import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { cn } from 'cn';
import { useState } from 'react';
import {
  ALL_TAB_ID,
  deriveGalleryTabs,
  hasPortfolioPhotos,
  photosForTab,
} from '../lib/gallery-tabs';
import { galleryQueries, testimonialQueries } from '../lib/queries';

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | Sevendays Photography' }] }),
  // SSR-prefetched like every route: a fresh page load renders current data
  // (the M5 "immediately" rule); default staleTime refetches per visit.
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(galleryQueries.all()),
      queryClient.ensureQueryData(testimonialQueries.all()),
    ]);
  },
  component: AboutPage,
});

function AboutPage() {
  const { data: gallery } = useSuspenseQuery(galleryQueries.all());
  const { data: testimonials } = useSuspenseQuery(testimonialQueries.all());
  const tabs = deriveGalleryTabs(gallery);
  const [selected, setSelected] = useState<string>(ALL_TAB_ID);
  // A refetch can empty the selected category mid-session; clamp to All.
  const activeId = tabs.some((tab) => tab.id === selected) ? selected : ALL_TAB_ID;
  const photos = photosForTab(gallery, activeId);

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink'>About</h1>
        {/* TODO(owner-copy): static studio story — replaced when the client supplies copy. */}
        <p className='mt-4 max-w-prose text-muted-foreground'>Our studio story is coming soon.</p>
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink'>Testimonials</h2>
        {testimonials.length === 0 ? (
          <div>
            {/* TODO(owner-copy): testimonial placeholders — client copy pending. M5 drop-in slot. */}
            <p className='mt-2 text-muted-foreground'>What clients say is coming soon.</p>
          </div>
        ) : (
          <div className='mt-6 flex flex-col gap-6'>
            {testimonials.map((t) => (
              <figure key={t.id} className='border-line-soft border-l-2 pl-4'>
                <blockquote className='text-brand-ink'>{t.quote}</blockquote>
                <figcaption className='text-muted-text mt-2 text-sm'>{t.person}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12 pb-12'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink'>Portfolio</h2>
        {!hasPortfolioPhotos(gallery) ? (
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
                    'rounded-full border px-4 py-1.5 text-sm font-medium',
                    tab.id === activeId
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-border bg-card text-foreground hover:bg-wash-base'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className='mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3' data-portfolio-grid>
              {photos.map((photo) => (
                <figure
                  key={photo.id}
                  className='border-line-soft bg-card overflow-hidden rounded-xl border shadow-sm'
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.title ?? 'Studio photograph'}
                    loading='lazy'
                    className='aspect-[4/3] w-full object-cover'
                  />
                  {photo.title && (
                    <figcaption className='text-muted-text mt-2 px-3 pb-2 font-mono text-[11px]'>
                      {photo.title}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
