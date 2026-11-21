import type { PublicGalleryPhoto } from '@sevendays/types';
import type {
  CarouselSettings,
  ControllerSettings,
  DeepPartial,
  Labels,
  Slide,
} from 'yet-another-react-lightbox';
// Type-only: loads the Captions plugin's SlideImage.description module
// augmentation into the type graph (erased at runtime — the plain-node
// vitest graph never loads the plugin; the captions law typechecks without it).
import type {} from 'yet-another-react-lightbox/plugins/captions';

// The landing image viewer's pure seam (#336 D5): the slide mapping and the
// pinned option vocabulary, in the gallery-tabs.ts lib-seam shape. The wall
// and the viewer share ONE alt law — the fallback constant below is the
// single source both the grid's img and the slides map through.
export const GALLERY_ALT_FALLBACK = 'Studio gallery photograph';

// The cache win (D5, pinned): the slide src is the SAME photoUrl the wall
// already rendered (photoUrl has no variants on the public wire), so the
// first viewer open is served from the browser cache — no second download
// of a "full-size" variant that doesn't exist. The accepted trade-off: the
// public gallery payload carries no image dimensions, so the library
// discovers them on load (its loading placeholder covers the gap).

export function photoSlides(
  photos: PublicGalleryPhoto[],
  { captions = false }: { captions?: boolean } = {}
): Slide[] {
  return photos.map((photo) => ({
    src: photo.photoUrl,
    alt: photo.title ?? GALLERY_ALT_FALLBACK,
    // D3: the caption follows the surface's law — mapped ONLY where the
    // surface asks AND the photo carries one; the key stays absent
    // otherwise (the plugin renders the line only when a slide has one).
    ...(captions && photo.caption ? { description: photo.caption } : {}),
  }));
}

// The mosaic variant's pinned option vocabulary (D6). #340's cover variant
// adds its own constants beside these; nothing here is a variant switch.
export const MOSAIC_CONTROLLER: DeepPartial<ControllerSettings> = {
  closeOnEscape: true, // the library default — set explicit to name the gesture
  closeOnBackdropClick: true, // ruled ON — defaults FALSE upstream (D6)
  closeOnPullUp: false, // pull-close stays out of the ruled gesture set
  closeOnPullDown: false,
};

export const MOSAIC_CAROUSEL: DeepPartial<CarouselSettings> = {
  finite: false, // the wall loops
  preload: 2,
  padding: '16px',
  spacing: '30%',
  imageFit: 'contain',
};

export const VIEWER_LABELS: Labels = {
  Previous: 'Previous photo',
  Next: 'Next photo',
  Close: 'Close photo viewer',
};
