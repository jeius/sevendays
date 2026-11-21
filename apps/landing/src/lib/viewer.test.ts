import type { PublicGalleryPhoto } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import {
  COVER_CAROUSEL,
  COVER_RENDER,
  coverSlides,
  GALLERY_ALT_FALLBACK,
  MOSAIC_CAROUSEL,
  MOSAIC_CONTROLLER,
  photoSlides,
  VIEWER_LABELS,
} from './viewer';

let n = 0;
function photo(overrides: Partial<PublicGalleryPhoto> = {}): PublicGalleryPhoto {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    photoUrl: `https://pub-test.r2.dev/gallery/${String(n).padStart(12, '0')}.jpg`,
    title: `Photo ${n}`,
    caption: null,
    categoryId: '00000000-0000-4000-8000-000000000001',
    ...overrides,
  };
}

describe('photoSlides', () => {
  it('maps every photo to one slide — payload order and count preserved, src = photoUrl', () => {
    const photos = [photo(), photo(), photo()];
    const slides = photoSlides(photos);
    expect(slides).toHaveLength(3);
    expect(slides.map((s) => s.src)).toEqual(photos.map((p) => p.photoUrl));
  });

  it("title → alt verbatim (the wall's alt law); a null title falls back to 'Studio gallery photograph'", () => {
    const slides = photoSlides([photo({ title: 'The last frame' }), photo({ title: null })]);
    expect(slides[0]?.alt).toBe('The last frame');
    expect(slides[1]?.alt).toBe(GALLERY_ALT_FALLBACK);
    expect(GALLERY_ALT_FALLBACK).toBe('Studio gallery photograph');
  });

  it('empty photos → empty slides', () => {
    expect(photoSlides([])).toEqual([]);
  });

  it('captions: true + a non-null caption → description carries it', () => {
    const slides = photoSlides([photo({ caption: 'The first look, 2026' })], { captions: true });
    expect(slides[0]?.description).toBe('The first look, 2026');
  });

  it('captions: true + a null caption → description absent (the plugin renders no line)', () => {
    const slides = photoSlides([photo({ caption: null })], { captions: true });
    expect('description' in (slides[0] ?? {})).toBe(false);
  });

  it('captions: false → description never set, even when the photo carries one (the home law)', () => {
    const slides = photoSlides([photo({ caption: 'The first look, 2026' })]);
    expect('description' in (slides[0] ?? {})).toBe(false);
  });
});

describe('the pinned option vocabulary (#336 D5/D6)', () => {
  it('MOSAIC_CONTROLLER: backdrop-close ON (upstream defaults false — set explicitly), Esc ON, both pull-closes OFF', () => {
    expect(MOSAIC_CONTROLLER).toEqual({
      closeOnEscape: true,
      closeOnBackdropClick: true,
      closeOnPullUp: false,
      closeOnPullDown: false,
    });
  });

  it('MOSAIC_CAROUSEL: the wall loops (finite false) on the library defaults — preload 2, 16px padding, 30% spacing, contain', () => {
    expect(MOSAIC_CAROUSEL).toEqual({
      finite: false,
      preload: 2,
      padding: '16px',
      spacing: '30%',
      imageFit: 'contain',
    });
  });

  it('VIEWER_LABELS: the three chrome strings', () => {
    expect(VIEWER_LABELS).toEqual({
      Previous: 'Previous photo',
      Next: 'Next photo',
      Close: 'Close photo viewer',
    });
  });
});

describe('coverSlides (the lone-image law, #336 D4/D5)', () => {
  it('a covered package maps to exactly one slide — src = coverImageUrl, alt = the package name, no title', () => {
    const slides = coverSlides({
      name: 'The Wedding Package',
      coverImageUrl: 'https://pub-test.r2.dev/covers/pkg.jpg',
    });
    expect(slides).toHaveLength(1);
    expect(slides[0]?.src).toBe('https://pub-test.r2.dev/covers/pkg.jpg');
    expect(slides[0]?.alt).toBe('The Wedding Package');
    expect('title' in (slides[0] ?? {})).toBe(false);
  });

  it('a null cover maps to ZERO slides — the placeholder is not a photograph (D4)', () => {
    expect(coverSlides({ name: 'The Wedding Package', coverImageUrl: null })).toEqual([]);
  });

  it('the cover slide never carries a description (the lone image has no caption law)', () => {
    const slides = coverSlides({
      name: 'The Wedding Package',
      coverImageUrl: 'https://pub-test.r2.dev/covers/pkg.jpg',
    });
    expect('description' in (slides[0] ?? {})).toBe(false);
  });
});

describe('the cover variant constants (#336 D4)', () => {
  it('COVER_CAROUSEL: the lone image cannot loop (finite true) on the shared defaults', () => {
    expect(COVER_CAROUSEL).toEqual({
      finite: true,
      preload: 2,
      padding: '16px',
      spacing: '30%',
      imageFit: 'contain',
    });
  });

  it('COVER_RENDER: both arrows render null — the library’s named hide (no arrows at all)', () => {
    expect(COVER_RENDER.buttonPrev?.()).toBe(null);
    expect(COVER_RENDER.buttonNext?.()).toBe(null);
  });
});
