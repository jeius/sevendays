import type { PublicGalleryPhoto } from '@sevendays/types';
import { cn } from 'cn';
import { useMemo, useState } from 'react';
import { spanFor } from '../lib/mosaic';
import { GALLERY_ALT_FALLBACK, photoSlides } from '../lib/viewer';
import { PhotoViewer } from './photo-viewer';
import { Reveal } from './reveal';

// The mosaic photo wall (#164 Round 2, owner-ruled): fixed row heights, the
// deterministic 2×2/2×1 span rhythm (Task 1's seam), dense packing, and the
// shared viewport reveal staggered per column. Shared by the home gallery
// strip now and (#224) the about portfolio, the two surfaces speak one
// wall. Home ruled title-captions OFF; about renders them when present.
// The image viewer (#336) lives here: each photo's button opens the shared
// PhotoViewer at that photo, both surfaces, unchanged call sites. The
// button's accessible name is the wrapped img's alt (the seam's one alt
// law); the figcaption stays OUTSIDE the button (phrasing-only content).
const ROW_HEIGHTS = 'auto-rows-[9rem] md:auto-rows-[11rem]';

export function MosaicPhotoGrid({
  photos,
  captions = false,
}: {
  photos: PublicGalleryPhoto[];
  /** Captions render only when a photo carries one AND the surface asks. */
  captions?: boolean;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  // An unstable slides reference would re-sync the carousel while open
  // (the library's documented pitfall), memoize over the payload.
  const slides = useMemo(() => photoSlides(photos, { captions }), [photos, captions]);

  return (
    <div className={cn('mt-8 grid grid-flow-dense grid-cols-2 gap-4 md:grid-cols-4', ROW_HEIGHTS)}>
      {photos.map((photo, i) => (
        <Reveal key={photo.id} delay={(i % 4) * 90} className={spanFor(i)}>
          <figure className='border-line-soft bg-card h-full overflow-hidden rounded-xl border shadow-sm'>
            <button
              type='button'
              onClick={() => setViewerIndex(i)}
              className='block h-full w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring focus-visible:ring-inset'
            >
              <img
                src={photo.photoUrl}
                alt={photo.title ?? GALLERY_ALT_FALLBACK}
                className='h-full w-full object-cover'
                loading='lazy'
              />
            </button>
            {captions && photo.caption ? (
              <figcaption className='text-muted-foreground px-3 pb-2 font-mono text-[11px]'>
                {photo.caption}
              </figcaption>
            ) : null}
          </figure>
        </Reveal>
      ))}
      <PhotoViewer slides={slides} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </div>
  );
}
