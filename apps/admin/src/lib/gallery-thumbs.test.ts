import { galleryPhotoSchema } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { THUMB_CACHE_IMMUTABLE, THUMB_CACHE_NO_STORE, thumbUrl } from './gallery-thumbs';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STAMP = '2026-08-31T00:00:00.000Z';

// The fixture parses through the WIRE schema (the gallery-state.test.ts
// posture): what the builder consumes is exactly what the admin list read
// delivers — Date instances included, per the z.coerce.date() schema.
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

describe('thumbUrl — the versioned proxy URL (M8 #287)', () => {
  it('derives ?v= from the updatedAt on the wire row (epoch ms)', () => {
    const row = photo(1);
    expect(thumbUrl(row)).toBe(
      `/api/admin/gallery-photos/${row.id}/thumb?v=${row.updatedAt.getTime()}`
    );
  });

  it('the version moves with the timestamp — a bumped updatedAt is a DIFFERENT URL (structural invalidation)', () => {
    const before = thumbUrl(photo(2));
    const after = photo(2, { updatedAt: '2026-09-01T00:00:00.000Z' });
    expect(thumbUrl(after)).not.toBe(before);
    expect(thumbUrl(after)).toBe(
      `/api/admin/gallery-photos/${after.id}/thumb?v=${after.updatedAt.getTime()}`
    );
  });

  it('stable per unchanged updatedAt — the same row always yields the same URL (cacheable)', () => {
    const row = photo(3);
    expect(thumbUrl(row)).toBe(thumbUrl(photo(3)));
  });
});

describe('the proxy cache-control law (M8 #287 — supersedes the #136 no-cache ruling)', () => {
  it('2xx arms answer private + one year + immutable (browser-only; the Cache API never touches this response)', () => {
    expect(THUMB_CACHE_IMMUTABLE).toBe('private, max-age=31536000, immutable');
  });

  it('error arms answer no-store — a transient 401/502 can never be cached under a thumb URL', () => {
    expect(THUMB_CACHE_NO_STORE).toBe('no-store');
  });
});
