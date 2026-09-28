import type { GalleryRead, PublicGalleryCategory, PublicGalleryPhoto } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { ALL_TAB_ID, deriveGalleryTabs, hasPortfolioPhotos, photosForTab } from './gallery-tabs';

let n = 0;
function category(name: string): PublicGalleryCategory {
  n += 1;
  return { id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, name };
}
function photo(categoryId: string): PublicGalleryPhoto {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    photoUrl: `https://pub-test.r2.dev/gallery/${String(n).padStart(12, '0')}.jpg`,
    title: `Photo ${n}`,
    categoryId,
  };
}

describe('deriveGalleryTabs', () => {
  it('All first and default; only categories holding ≥1 photo hold a tab, payload order', () => {
    const weddings = category('Weddings');
    const graduation = category('Graduation');
    const emptyTab = category('Empty');
    const gallery: GalleryRead = {
      categories: [weddings, graduation, emptyTab],
      photos: [photo(weddings.id), photo(graduation.id), photo(weddings.id)],
    };
    expect(deriveGalleryTabs(gallery)).toEqual([
      { id: ALL_TAB_ID, label: 'All' },
      { id: weddings.id, label: 'Weddings' },
      { id: graduation.id, label: 'Graduation' },
    ]);
  });

  it('empty payload: the All tab alone and no portfolio photos', () => {
    const gallery: GalleryRead = { categories: [], photos: [] };
    expect(deriveGalleryTabs(gallery)).toEqual([{ id: ALL_TAB_ID, label: 'All' }]);
    expect(hasPortfolioPhotos(gallery)).toBe(false);
  });

  it('photos but zero category rows: All alone, the grid still renders under it', () => {
    // AR3 (#138): an active photo whose category is deactivated stays in the
    // payload — the tab derivation must not strand it.
    const gallery: GalleryRead = {
      categories: [],
      photos: [photo('00000000-0000-4000-8000-000000000099')],
    };
    expect(deriveGalleryTabs(gallery)).toEqual([{ id: ALL_TAB_ID, label: 'All' }]);
    expect(hasPortfolioPhotos(gallery)).toBe(true);
    expect(photosForTab(gallery, ALL_TAB_ID)).toHaveLength(1);
  });
});

describe('photosForTab', () => {
  it('All preserves the payload (position) order exactly', () => {
    const weddings = category('Weddings');
    const graduation = category('Graduation');
    const photos = [photo(weddings.id), photo(graduation.id), photo(weddings.id)];
    const gallery: GalleryRead = { categories: [weddings, graduation], photos };
    expect(photosForTab(gallery, ALL_TAB_ID)).toEqual(photos);
  });

  it('a category tab filters to exactly its photos, payload order', () => {
    const weddings = category('Weddings');
    const graduation = category('Graduation');
    const first = photo(weddings.id);
    const second = photo(graduation.id);
    const third = photo(weddings.id);
    const gallery: GalleryRead = {
      categories: [weddings, graduation],
      photos: [first, second, third],
    };
    expect(photosForTab(gallery, weddings.id)).toEqual([first, third]);
    expect(photosForTab(gallery, graduation.id)).toEqual([second]);
  });

  it('a photo whose categoryId is absent from categories renders under All, under no named tab', () => {
    const weddings = category('Weddings');
    const stray = photo('00000000-0000-4000-8000-000000000099');
    const gallery: GalleryRead = { categories: [weddings], photos: [stray] };
    expect(photosForTab(gallery, ALL_TAB_ID)).toEqual([stray]);
    expect(photosForTab(gallery, weddings.id)).toEqual([]);
  });
});
