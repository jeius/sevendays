import {
  attires as attiresTable,
  auditLog,
  galleryCategories as galleryCategoriesTable,
  galleryPhotos as galleryPhotosTable,
  testimonials as testimonialsTable,
} from '@sevendays/db';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds, GalleryFixtureIds } from './helpers/fixtures.js';
import { loadFixtures, loadGalleryFixtures } from './helpers/fixtures.js';
import { stubCommitBucket } from './helpers/r2-stub.js';
import { truncateAll } from './helpers/truncate.js';

// The guarded-DELETE contract suite (M7 #213): per-entity guard answers,
// cascades, object-delete ordering, the 401-before-validation ordering, and
// the freed name/slug. Appointments are inserted directly (the #212
// direct-db-state precedent) — the guard reads rows, not API history.
const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;
let gids: GalleryFixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const authed = async (method: string, path: string, email: string, body?: unknown) => {
  const { token } = await signUpSession(url, email);
  return app.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(url)
  );
};

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
  gids = await loadGalleryFixtures(db);
});

describe('guarded DELETE — testimonials + gallery photos (blocked by nothing)', () => {
  it('testimonial deletes clean — 204 with no body, row gone, the audit row lands', async () => {
    const [row] = await db
      .select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.id, gids.testimonialA))
      .limit(1);
    if (!row) throw new Error('delete suite: testimonial fixture missing');
    const res = await authed(
      'DELETE',
      `/api/v1/admin/testimonials/${gids.testimonialA}`,
      'delete-testimonial-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    const remaining = await authed(
      'GET',
      '/api/v1/admin/testimonials',
      'delete-testimonial-list@sevendays.test'
    );
    const remainingIds = ((await remaining.json()) as { id: string }[]).map((t) => t.id);
    expect(remainingIds).not.toContain(gids.testimonialA);
    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, 'testimonial'), eq(auditLog.entityId, gids.testimonialA)))
      .limit(1);
    expect(auditRow?.action).toBe('delete');
    expect(auditRow?.summary).toBe(row.person);
  });

  it('testimonial unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/testimonials/00000000-0000-4000-8000-000000000000',
      'delete-testimonial-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Testimonial not found.' });
  });

  it('photo deletes clean — the R2 object goes with the row, exactly once, after the commit', async () => {
    const stub = stubCommitBucket();
    const [row] = await db
      .select()
      .from(galleryPhotosTable)
      .where(eq(galleryPhotosTable.id, gids.photoA))
      .limit(1);
    if (!row) throw new Error('delete suite: photo fixture missing');
    const { token } = await signUpSession(url, 'delete-photo-ok@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${gids.photoA}`,
      { method: 'DELETE', headers: bearer(token) },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(204);
    expect(stub.deleteCalls).toEqual([row.r2Key]);
    const [gone] = await db
      .select()
      .from(galleryPhotosTable)
      .where(eq(galleryPhotosTable.id, gids.photoA))
      .limit(1);
    expect(gone).toBeUndefined();
  });

  it('photo unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000',
      'delete-photo-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Photo not found.' });
  });
});

describe('guarded DELETE — the reference-guarded lookups', () => {
  it('category with photos → 400 naming the blocking family + count; nothing deleted', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/gallery-categories/${gids.categoryA}`,
      'delete-cat-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['photos'], message: 'contains 1 photo(s)' }],
    });
    const [row] = await db
      .select()
      .from(galleryCategoriesTable)
      .where(eq(galleryCategoriesTable.id, gids.categoryA))
      .limit(1);
    expect(row?.id).toBe(gids.categoryA);
  });

  it('category with no photos deletes clean (the deactivated one) — 204 + audit row', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/gallery-categories/${gids.categoryRetired}`,
      'delete-cat-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.entity, 'gallery-category'), eq(auditLog.entityId, gids.categoryRetired))
      )
      .limit(1);
    expect(auditRow?.action).toBe('delete');
  });

  it('category unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/gallery-categories/00000000-0000-4000-8000-000000000000',
      'delete-cat-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Gallery category not found.' });
  });

  it('print size resolved by inclusions → 400 with the inclusion count (fixture truth: 2)', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/print-sizes/${ids.printSize2R}`,
      'delete-print-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['inclusions'], message: 'used by 2 package inclusion(s)' }],
    });
  });

  it('a fresh print size deletes clean — create via POST, then DELETE → 204', async () => {
    const created = await authed(
      'POST',
      '/api/v1/admin/print-sizes',
      'delete-print-ok@sevendays.test',
      {
        code: 'Z9',
        description: 'Transient size.',
      }
    );
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const res = await authed(
      'DELETE',
      `/api/v1/admin/print-sizes/${id}`,
      'delete-print-ok2@sevendays.test'
    );
    expect(res.status).toBe(204);
  });

  it('print size unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/print-sizes/00000000-0000-4000-8000-000000000000',
      'delete-print-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Print size not found.' });
  });

  it('attire attached to inclusions → 400 with the junction count (fixture truth: 3)', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/attires/${ids.attireToga}`,
      'delete-attire-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['inclusions'], message: 'attached to 3 package inclusion(s)' }],
    });
  });

  it('attire with no junctions deletes clean — 204, row gone (the untouched fixture attire)', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/attires/${ids.attireUniform}`,
      'delete-attire-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const [gone] = await db
      .select()
      .from(attiresTable)
      .where(eq(attiresTable.id, ids.attireUniform))
      .limit(1);
    expect(gone).toBeUndefined();
  });

  it('attire unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/attires/00000000-0000-4000-8000-000000000000',
      'delete-attire-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Attire not found.' });
  });
});

describe('guarded DELETE — the 401 gate precedes validation (this half)', () => {
  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (testimonials)', async () => {
    const res = await app.request(
      '/api/v1/admin/testimonials/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (gallery-photos)', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-photos/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (gallery-categories)', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-categories/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (print-sizes)', async () => {
    const res = await app.request(
      '/api/v1/admin/print-sizes/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (attires)', async () => {
    const res = await app.request(
      '/api/v1/admin/attires/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
