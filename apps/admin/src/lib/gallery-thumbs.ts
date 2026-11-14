import type { GalleryPhoto } from '@sevendays/types';

// The gallery thumbnails' serving seam (M8 #287): ONE place builds the
// versioned thumb URL and owns the proxy's cache-control law, so the grid
// card, the editor preview, and the $id.thumb proxy route can never drift.
//
// The version is the photo's updatedAt — already on the admin wire
// (packages/types galleryPhotoSchema; no API or shared-schema change). The
// ADR-0019 replace flow is the invalidation half: a replace mints a fresh
// R2 key and bumps updatedAt in the same transaction, the old object is
// deleted post-commit (suite-pinned at apps/api/test/admin-gallery.test.ts),
// so a bumped timestamp is always a URL the browser has never cached —
// structural invalidation, no eviction machinery. A metadata-only save
// also bumps updatedAt (one thumb refetch per edit — the designed trade:
// timestamp versioning, not content hashing).
//
// Cache law (supersedes the #136 no-cache ruling, dated in the ADR-0019
// amendments): the proxy answers 2xx with `private, max-age=31536000,
// immutable` — private keeps session-gated bytes out of every shared
// cache, and the year-long immutable bound is safe because the URL itself
// versions the content. Error arms answer `no-store`. This response is
// returned straight to the browser — the Workers Cache API never touches
// it, so the ADR-0025/#286 public-container rule (Cache API puts reject
// `private`) is a different mechanism and does not apply here.
export const THUMB_CACHE_IMMUTABLE = 'private, max-age=31536000, immutable';

export const THUMB_CACHE_NO_STORE = 'no-store';

/** The versioned proxy URL for one wire photo row (?v= = updatedAt epoch ms). */
export function thumbUrl(photo: Pick<GalleryPhoto, 'id' | 'updatedAt'>): string {
  return `/api/admin/gallery-photos/${photo.id}/thumb?v=${photo.updatedAt.getTime()}`;
}
