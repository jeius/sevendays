import type { Database } from '@sevendays/db';
import { galleryCategories, galleryPhotos, testimonials } from '@sevendays/db';
import type {
  CreateGalleryCategoryInput,
  CreateGalleryPhotoInput,
  CreateTestimonialInput,
  GalleryPhoto,
  UpdateGalleryCategoryInput,
  UpdateGalleryPhotoInput,
  UpdateTestimonialInput,
} from '@sevendays/types';
import { and, asc, eq, max, ne } from 'drizzle-orm';
import type { Env } from '../env.js';
import {
  type AdminCreateResult,
  type AdminWriteFailure,
  type AdminWriteResult,
  conflict,
  guardUnique,
} from './admin-shared.js';
import { commitUpload, resolveMediaUrl } from './media.js';

// The positioned collections (M5 #137): position is SERVER-assigned and
// never client-supplied — create assigns max+1, the order PUT full-replaces
// 1..N in payload order. Reorder is atomic and TOTAL: the payload must list
// EVERY row of the collection exactly once (deactivated included — the
// admin grid manages them all); a mismatch answers 400 and touches nothing.
// No hard deletes anywhere. (The gallery-photos section joins in Task 8.)

type CategoryRow = typeof galleryCategories.$inferSelect;
type TestimonialRow = typeof testimonials.$inferSelect;
type Detail = { path: string[]; message: string };
type OrderCheck =
  | { ok: true }
  | { ok: false; reason: 'invalid'; message: string; details: Detail[] };

const CATEGORY_UNIQUE: Record<string, string> = { gallery_categories_name_unique: 'name' };

/**
 * The full-replace guard shared by all three order PUTs: unknown ids,
 * missing rows, and duplicates are all named in the details — the editor
 * can mark exactly what drifted.
 */
function checkCompleteOrder(rows: { id: string }[], ids: string[], field: string): OrderCheck {
  const details: Detail[] = [];
  const rowIds = new Set(rows.map((r) => r.id));
  const seen = new Set<string>();
  for (const id of ids) {
    if (!rowIds.has(id)) details.push({ path: [field], message: `unknown id ${id}` });
    if (seen.has(id)) details.push({ path: [field], message: `duplicate id ${id}` });
    seen.add(id);
  }
  const payloadIds = new Set(ids);
  for (const row of rows) {
    if (!payloadIds.has(row.id)) details.push({ path: [field], message: `missing id ${row.id}` });
  }
  if (details.length > 0) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'The order payload must list every row exactly once.',
      details,
    };
  }
  return { ok: true };
}

// --- gallery categories -----------------------------------------------------

export async function listAdminGalleryCategories(db: Database): Promise<CategoryRow[]> {
  return db
    .select()
    .from(galleryCategories)
    .orderBy(asc(galleryCategories.position), asc(galleryCategories.id));
}

export async function getAdminGalleryCategory(
  db: Database,
  id: string
): Promise<CategoryRow | null> {
  const [row] = await db
    .select()
    .from(galleryCategories)
    .where(eq(galleryCategories.id, id))
    .limit(1);
  return row ?? null;
}

async function nextCategoryPosition(db: Database): Promise<number> {
  const [row] = await db.select({ value: max(galleryCategories.position) }).from(galleryCategories);
  return (row?.value ?? 0) + 1;
}

export async function createAdminGalleryCategory(
  db: Database,
  input: CreateGalleryCategoryInput
): Promise<AdminCreateResult<CategoryRow>> {
  const position = await nextCategoryPosition(db);
  return guardUnique(CATEGORY_UNIQUE, async () => {
    const [row] = await db
      .insert(galleryCategories)
      .values({ ...input, position })
      .returning();
    if (!row) throw new Error('insert gallery_categories: no row returned');
    return row;
  });
}

export async function updateAdminGalleryCategory(
  db: Database,
  id: string,
  input: UpdateGalleryCategoryInput
): Promise<AdminWriteResult<CategoryRow>> {
  const current = await getAdminGalleryCategory(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: galleryCategories.id })
      .from(galleryCategories)
      .where(and(eq(galleryCategories.name, input.name), ne(galleryCategories.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  return guardUnique(CATEGORY_UNIQUE, async () => {
    const [row] = await db
      .update(galleryCategories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(galleryCategories.id, id))
      .returning();
    if (!row) throw new Error('update gallery_categories: no row returned');
    return row;
  });
}

export async function setGalleryCategoryOrder(
  db: Database,
  categoryIds: string[]
  // The order service never returns not_found (it reads first, checks, then
  // writes) — the declared union carries only the invalid arm, so the thin
  // route's `!result.ok` narrows to badRequest without a 404 branch.
): Promise<{ ok: true; row: CategoryRow[] } | AdminWriteFailure> {
  const rows = await db.select().from(galleryCategories);
  const check = checkCompleteOrder(rows, categoryIds, 'categoryIds');
  if (!check.ok) return check;
  await db.transaction(async (tx) => {
    for (const [index, categoryId] of categoryIds.entries()) {
      await tx
        .update(galleryCategories)
        .set({ position: index + 1, updatedAt: new Date() })
        .where(eq(galleryCategories.id, categoryId));
    }
  });
  return { ok: true, row: await listAdminGalleryCategories(db) };
}

// --- testimonials -----------------------------------------------------------

export async function listAdminTestimonials(db: Database): Promise<TestimonialRow[]> {
  return db.select().from(testimonials).orderBy(asc(testimonials.position), asc(testimonials.id));
}

export async function getAdminTestimonial(
  db: Database,
  id: string
): Promise<TestimonialRow | null> {
  const [row] = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return row ?? null;
}

async function nextTestimonialPosition(db: Database): Promise<number> {
  const [row] = await db.select({ value: max(testimonials.position) }).from(testimonials);
  return (row?.value ?? 0) + 1;
}

// No unique constraint on testimonials — create/update carry no conflict
// path (the no-row guards are the only throws, and unreachable in practice).
export async function createAdminTestimonial(
  db: Database,
  input: CreateTestimonialInput
): Promise<AdminCreateResult<TestimonialRow>> {
  const position = await nextTestimonialPosition(db);
  const [row] = await db
    .insert(testimonials)
    .values({ ...input, position })
    .returning();
  if (!row) throw new Error('insert testimonials: no row returned');
  return { ok: true, row };
}

export async function updateAdminTestimonial(
  db: Database,
  id: string,
  input: UpdateTestimonialInput
): Promise<AdminWriteResult<TestimonialRow>> {
  const [row] = await db
    .update(testimonials)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(testimonials.id, id))
    .returning();
  if (!row) return { ok: false, reason: 'not_found' };
  return { ok: true, row };
}

export async function setTestimonialOrder(
  db: Database,
  testimonialIds: string[]
): Promise<{ ok: true; row: TestimonialRow[] } | AdminWriteFailure> {
  const rows = await db.select().from(testimonials);
  const check = checkCompleteOrder(rows, testimonialIds, 'testimonialIds');
  if (!check.ok) return check;
  await db.transaction(async (tx) => {
    for (const [index, testimonialId] of testimonialIds.entries()) {
      await tx
        .update(testimonials)
        .set({ position: index + 1, updatedAt: new Date() })
        .where(eq(testimonials.id, testimonialId));
    }
  });
  return { ok: true, row: await listAdminTestimonials(db) };
}

// --- gallery photos ---------------------------------------------------------

type PhotoRow = typeof galleryPhotos.$inferSelect;
export type PhotoEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>;

function toPhotoRead(env: PhotoEnv, row: PhotoRow): GalleryPhoto {
  // The wire rename (ADR-0019): strip the raw key, resolve the absolute URL.
  const { r2Key, ...rest } = row;
  const photoUrl = resolveMediaUrl(env, r2Key);
  if (!photoUrl) throw new Error(`gallery photo ${row.id} has no r2Key`);
  return { ...rest, photoUrl };
}

export async function listAdminGalleryPhotos(db: Database, env: PhotoEnv): Promise<GalleryPhoto[]> {
  const rows = await db
    .select()
    .from(galleryPhotos)
    .orderBy(asc(galleryPhotos.position), asc(galleryPhotos.id));
  return rows.map((row) => toPhotoRead(env, row));
}

export async function getAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  id: string
): Promise<GalleryPhoto | null> {
  const [row] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).limit(1);
  return row ? toPhotoRead(env, row) : null;
}

async function nextPhotoPosition(db: Database): Promise<number> {
  const [row] = await db.select({ value: max(galleryPhotos.position) }).from(galleryPhotos);
  return (row?.value ?? 0) + 1;
}

/**
 * The commit step shared by create and replace: HEAD-verify the staging key
 * through ticket 02's commitUpload (verify → caps → promote to the immutable
 * gallery/<uuid>.jpg → delete staging), failures re-pathed onto the r2Key
 * payload field. Runs BEFORE any DB write.
 */
async function commitStagingKey(
  env: PhotoEnv,
  stagingKey: string
): Promise<{ ok: true; finalKey: string } | AdminWriteFailure> {
  const commit = await commitUpload(env.MEDIA_BUCKET, { stagingKey, purpose: 'gallery-photo' });
  if (!commit.ok) {
    return {
      ok: false,
      reason: 'conflict',
      message: commit.message,
      details: (commit.details ?? [{ path: ['key'], message: commit.message }]).map(
        (detail): Detail => ({ path: ['r2Key'], message: detail.message })
      ),
    };
  }
  return { ok: true, finalKey: commit.finalKey };
}

async function assertCategoryExists(
  db: Database,
  categoryId: string
): Promise<AdminWriteFailure | null> {
  const [known] = await db
    .select({ id: galleryCategories.id })
    .from(galleryCategories)
    .where(eq(galleryCategories.id, categoryId))
    .limit(1);
  if (!known) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Unknown category.',
      details: [{ path: ['categoryId'], message: `unknown id ${categoryId}` }],
    };
  }
  return null;
}

export async function createAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  input: CreateGalleryPhotoInput
): Promise<AdminCreateResult<GalleryPhoto>> {
  // Category existence FIRST — an invalid payload must not touch the bucket
  // (a commit would promote the object and orphan it on the 400).
  if (input.categoryId !== undefined && input.categoryId !== null) {
    const failure = await assertCategoryExists(db, input.categoryId);
    if (failure) return failure;
  }
  const commit = await commitStagingKey(env, input.r2Key);
  if (!commit.ok) return commit;
  const position = await nextPhotoPosition(db);
  const [row] = await db
    .insert(galleryPhotos)
    .values({
      r2Key: commit.finalKey,
      title: input.title ?? null,
      caption: input.caption ?? null,
      categoryId: input.categoryId ?? null,
      position,
    })
    .returning();
  if (!row) throw new Error('insert gallery_photos: no row returned');
  return { ok: true, row: toPhotoRead(env, row) };
}

export async function updateAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  id: string,
  input: UpdateGalleryPhotoInput
): Promise<AdminWriteResult<GalleryPhoto>> {
  const [current] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.categoryId !== null) {
    const failure = await assertCategoryExists(db, input.categoryId);
    if (failure) return failure;
  }
  let finalKey: string | null = current.r2Key;
  if (input.r2Key !== undefined) {
    const commit = await commitStagingKey(env, input.r2Key);
    if (!commit.ok) return commit;
    finalKey = commit.finalKey;
  }
  const [row] = await db
    .update(galleryPhotos)
    .set({
      r2Key: finalKey,
      title: input.title,
      caption: input.caption,
      categoryId: input.categoryId,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(galleryPhotos.id, id))
    .returning();
  if (!row) throw new Error('update gallery_photos: no row returned');
  // Keys are immutable — replace is new key + row update + old-key delete,
  // the old object deleted only AFTER the update committed.
  if (finalKey !== current.r2Key) {
    await env.MEDIA_BUCKET.delete(current.r2Key);
  }
  return { ok: true, row: toPhotoRead(env, row) };
}

export async function setGalleryPhotoOrder(
  db: Database,
  env: PhotoEnv,
  photoIds: string[]
  // Same declared union as the other two order services (never not_found —
  // it reads first, checks, then writes): the thin route's `!result.ok`
  // narrows to badRequest without a 404 branch.
): Promise<{ ok: true; row: GalleryPhoto[] } | AdminWriteFailure> {
  const rows = await db.select().from(galleryPhotos);
  const check = checkCompleteOrder(rows, photoIds, 'photoIds');
  if (!check.ok) return check;
  await db.transaction(async (tx) => {
    for (const [index, photoId] of photoIds.entries()) {
      await tx
        .update(galleryPhotos)
        .set({ position: index + 1, updatedAt: new Date() })
        .where(eq(galleryPhotos.id, photoId));
    }
  });
  return { ok: true, row: await listAdminGalleryPhotos(db, env) };
}
