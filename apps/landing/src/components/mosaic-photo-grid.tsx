import type { PublicGalleryPhoto } from '@sevendays/types';
import { cn } from 'cn';
import { spanFor } from '../lib/mosaic';
import { Reveal } from './reveal';

// The mosaic photo wall (#164 Round 2, owner-ruled): fixed row heights, the
// deterministic 2×2/2×1 span rhythm (Task 1's seam), dense packing, and the
// shared viewport reveal staggered per column. Shared by the home gallery
// strip now and (#224) the about portfolio — the two surfaces speak one
// wall. Home ruled title-captions OFF; about renders them when present.
const ROW_HEIGHTS = 'auto-rows-[9rem] md:auto-rows-[11rem]';

export function MosaicPhotoGrid({
  photos,
  captions = false,
}: {
  photos: PublicGalleryPhoto[];
  /** Captions render only when a photo carries one AND the surface asks. */
  captions?: boolean;
}) {
  return (
    <div className={cn('mt-8 grid grid-flow-dense grid-cols-2 gap-4 md:grid-cols-4', ROW_HEIGHTS)}>
      {photos.map((photo, i) => (
        <Reveal key={photo.id} delay={(i % 4) * 90} className={spanFor(i)}>
          <figure className='border-line-soft bg-card h-full overflow-hidden rounded-xl border shadow-sm'>
            <img
              src={photo.photoUrl}
              alt={photo.title ?? 'Studio gallery photograph'}
              className='h-full w-full object-cover'
              loading='lazy'
            />
            {captions && photo.caption ? (
              <figcaption className='text-muted-foreground px-3 pb-2 font-mono text-[11px]'>
                {photo.caption}
              </figcaption>
            ) : null}
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
