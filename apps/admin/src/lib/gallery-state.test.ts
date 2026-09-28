import { galleryPhotoSchema } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import {
  buildCategoryOrderPayload,
  buildPhotoFlipPayload,
  buildPhotoOrderPayload,
  buildPhotoPayload,
  buildTestimonialOrderPayload,
  photoStateFromRead,
  reorderIds,
  reorderVisiblePhotos,
  titleFromFileName,
} from './gallery-state';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STAMP = '2026-08-31T00:00:00.000Z';

function photo(n: number, overrides: Record<string, unknown> = {}) {
  return galleryPhotoSchema.parse({
    id: uuid(n),
    title: `Photo ${n}`,
    caption: null,
    categoryId: uuid(90),
    position: n,
    isActive: true,
    photoUrl: `https://pub-test.r2.dev/gallery/${n}.jpg`,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });
}

describe('photo state → payload', () => {
  it('buildPhotoPayload: empty strings null out; r2Key is ABSENT (presence-encoded replace stays unexposed, AR-6)', () => {
    const payload = buildPhotoPayload({
      title: '',
      caption: '',
      categoryId: uuid(90),
      isActive: true,
    });
    expect(payload).toEqual({ title: null, caption: null, categoryId: uuid(90), isActive: true });
    expect('r2Key' in payload).toBe(false);
  });

  it('buildPhotoFlipPayload: the read reshaped with ONLY isActive flipped, no r2Key', () => {
    const row = photo(1);
    expect(buildPhotoFlipPayload(row, false)).toEqual({
      title: 'Photo 1',
      caption: null,
      categoryId: uuid(90),
      isActive: false,
    });
  });

  it('photoStateFromRead nulls map to empty strings for the inputs', () => {
    expect(photoStateFromRead(photo(2, { title: null, caption: null }))).toEqual({
      title: '',
      caption: '',
      categoryId: uuid(90),
      isActive: true,
    });
  });
});

describe('reorder', () => {
  const ids = [uuid(1), uuid(2), uuid(3), uuid(4)];

  it('reorderIds moves by id and bails when either id is missing', () => {
    expect(reorderIds(ids, uuid(1), uuid(3))).toEqual([uuid(2), uuid(3), uuid(1), uuid(4)]);
    expect(reorderIds(ids, uuid(1), 'ghost')).toBe(ids);
    expect(reorderIds(ids, 'ghost', uuid(3))).toBe(ids);
  });

  it('reorderVisiblePhotos: a boundary-crossing filtered drag keeps invisible ids in their global slots', () => {
    // Global order 1,2,3,4; visible subset 1,3 (2 and 4 filtered out).
    // Drag 1 onto 3: the visible subsequence [1,3] becomes [3,1], written
    // back into the slots the visible items occupied.
    const result = reorderVisiblePhotos(ids, [uuid(1), uuid(3)], uuid(1), uuid(3));
    expect(result).toEqual([uuid(3), uuid(2), uuid(1), uuid(4)]);
  });

  it('reorderVisiblePhotos bails when either id is not in the visible set', () => {
    expect(reorderVisiblePhotos(ids, [uuid(1), uuid(3)], uuid(2), uuid(3))).toBe(ids);
  });

  it('reorderVisiblePhotos bails on a ghost visibleId absent from the global list (parity with reorderIds; TDD #143 sweep)', () => {
    expect(reorderVisiblePhotos(ids, [uuid(1), 'ghost'], uuid(1), 'ghost')).toBe(ids);
  });
});

describe('titles and order payloads', () => {
  it('titleFromFileName strips the LAST extension; a dotfile keeps its name; empty stays empty', () => {
    expect(titleFromFileName('report.2024.jpg')).toBe('report.2024');
    expect(titleFromFileName('.jpg')).toBe('.jpg');
    expect(titleFromFileName('')).toBe('');
  });

  it('the three order payloads are TOTAL id lists in array order (#137 full-replace)', () => {
    const rows = [photo(1), photo(2)];
    expect(buildPhotoOrderPayload(rows)).toEqual({ photoIds: [uuid(1), uuid(2)] });
    expect(
      buildCategoryOrderPayload([
        {
          id: uuid(90),
          name: 'Weddings',
          position: 1,
          isActive: true,
          createdAt: new Date(STAMP),
          updatedAt: new Date(STAMP),
        },
      ])
    ).toEqual({ categoryIds: [uuid(90)] });
    expect(
      buildTestimonialOrderPayload([
        {
          id: uuid(7),
          quote: 'q',
          person: 'p',
          position: 1,
          isActive: true,
          createdAt: new Date(STAMP),
          updatedAt: new Date(STAMP),
        },
      ])
    ).toEqual({ testimonialIds: [uuid(7)] });
  });
});
