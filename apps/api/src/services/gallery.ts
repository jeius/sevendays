import type { Database } from '@sevendays/db';
import { galleryCategories, galleryPhotos } from '@sevendays/db';
import type { GalleryRead, PublicGalleryPhoto } from '@sevendays/types';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import type { Env } from '../env.js';
import { resolveMediaUrl } from './media.js';

type MediaEnv = Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>;

/**
 * The assembled public gallery read (#138): active categories (array order
 * = tab order) and active CATEGORIZED photos (categoryId non-null — the
 * uncategorized state is staff-only), both position-ordered with the id
 * tiebreak. One landing fetch feeds the about page. An ACTIVE photo whose
 * CATEGORY is deactivated stays in the payload (AR3): the spec filters on
 * row activity and categorized-ness, nothing else. Raw keys never leave —
 * photoUrl resolves here, server-side.
 */
export async function getPublicGallery(db: Database, env: MediaEnv): Promise<GalleryRead> {
  const categoryRows = await db
    .select({ id: galleryCategories.id, name: galleryCategories.name })
    .from(galleryCategories)
    .where(eq(galleryCategories.isActive, true))
    .orderBy(asc(galleryCategories.position), asc(galleryCategories.id));

  const photoRows = await db
    .select({
      id: galleryPhotos.id,
      r2Key: galleryPhotos.r2Key,
      title: galleryPhotos.title,
      categoryId: galleryPhotos.categoryId,
    })
    .from(galleryPhotos)
    .where(and(eq(galleryPhotos.isActive, true), isNotNull(galleryPhotos.categoryId)))
    .orderBy(asc(galleryPhotos.position), asc(galleryPhotos.id));

  const photos: PublicGalleryPhoto[] = [];
  for (const row of photoRows) {
    // The WHERE already excluded nulls; the guard narrows the FK type.
    if (row.categoryId === null) continue;
    const photoUrl = resolveMediaUrl(env, row.r2Key);
    if (!photoUrl) {
      // Unreachable over a NOT NULL r2_key — loud rather than a silent ''.
      throw new Error('gallery read: a photo row carried no r2Key');
    }
    photos.push({ id: row.id, photoUrl, title: row.title, categoryId: row.categoryId });
  }

  return { categories: categoryRows, photos };
}
