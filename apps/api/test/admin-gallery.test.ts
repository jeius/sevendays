import { galleryCategories, galleryPhotos } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { GalleryFixtureIds } from './helpers/fixtures.js';
import { loadGalleryFixtures } from './helpers/fixtures.js';
import { stubCommitBucket } from './helpers/r2-stub.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: GalleryFixtureIds;

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
  ids = await loadGalleryFixtures(db);
});

describe('gallery categories admin CRUD', () => {
  it('GET / lists ALL rows including the deactivated one, position-ordered', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/gallery-categories',
      'admin-cats-list@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; position: number; isActive: boolean }[];
    expect(body.map((c) => c.name)).toEqual(['Weddings', 'Graduation', 'Retired Tab']);
    expect(body.find((c) => c.name === 'Retired Tab')?.isActive).toBe(false);
  });

  it('POST → 201 with the server-assigned position (max + 1)', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/gallery-categories',
      'admin-cats-post@sevendays.test',
      {
        name: 'Portraits',
      }
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; position: number; isActive: boolean };
    expect(body.position).toBe(4);
    expect(body.isActive).toBe(true);
  });

  it('POST duplicate name → 400 with the name field detail', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/gallery-categories',
      'admin-cats-dup@sevendays.test',
      {
        name: 'Weddings',
      }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('PUT renames and deactivates → 200 (full-object)', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/gallery-categories/${ids.categoryA}`,
      'admin-cats-put@sevendays.test',
      { name: 'Weddings & Events', isActive: false }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; isActive: boolean };
    expect(body.name).toBe('Weddings & Events');
    expect(body.isActive).toBe(false);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/gallery-categories/00000000-0000-4000-8000-000000000000',
      'admin-cats-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Gallery category not found.' });
  });

  it('PUT /order full-replace renumbers 1..N in payload order — deactivated rows included', async () => {
    const res = await authed(
      'PUT',
      '/api/v1/admin/gallery-categories/order',
      'admin-cats-order@sevendays.test',
      {
        categoryIds: [ids.categoryB, ids.categoryA, ids.categoryRetired],
      }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; position: number }[];
    expect(body.map((c) => c.name)).toEqual(['Graduation', 'Weddings', 'Retired Tab']);
    expect(body.map((c) => c.position)).toEqual([1, 2, 3]);
  });

  it('PUT /order with a missing row → 400 and positions untouched', async () => {
    const res = await authed(
      'PUT',
      '/api/v1/admin/gallery-categories/order',
      'admin-cats-orderbad@sevendays.test',
      {
        categoryIds: [ids.categoryA, ids.categoryB],
      }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['categoryIds']);
    expect(body.details[0]?.message).toContain(ids.categoryRetired);
    const rows = await db
      .select({ position: galleryCategories.position })
      .from(galleryCategories)
      .where(eq(galleryCategories.id, ids.categoryRetired));
    expect(rows[0]?.position).toBe(3);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-categories',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ position: 1 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('testimonials admin CRUD', () => {
  it('GET / lists ALL rows including the deactivated one, position-ordered', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/testimonials',
      'admin-testi-list@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { person: string; position: number; isActive: boolean }[];
    expect(body.map((t) => t.position)).toEqual([1, 2, 3]);
    expect(body.find((t) => t.person === 'Former Client')?.isActive).toBe(false);
  });

  it('POST → 201 with the server-assigned position (max + 1)', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/testimonials',
      'admin-testi-post@sevendays.test',
      {
        quote: 'Booking was painless and the gallery came fast.',
        person: 'Ana, class 2025',
      }
    );
    expect(res.status).toBe(201);
    expect(((await res.json()) as { position: number }).position).toBe(4);
  });

  it('PUT flips isActive → 200', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/testimonials/${ids.testimonialA}`,
      'admin-testi-put@sevendays.test',
      {
        quote: 'The photos came out better than we hoped.',
        person: 'Maria, batch 2026',
        isActive: false,
      }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { isActive: boolean }).isActive).toBe(false);
  });

  it('PUT /order full-replace renumbers truthfully', async () => {
    const res = await authed(
      'PUT',
      '/api/v1/admin/testimonials/order',
      'admin-testi-order@sevendays.test',
      {
        testimonialIds: [ids.testimonialB, ids.testimonialRetired, ids.testimonialA],
      }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { person: string; position: number }[];
    expect(body.map((t) => t.person)).toEqual(['Jon & Riza', 'Former Client', 'Maria, batch 2026']);
    expect(body.map((t) => t.position)).toEqual([1, 2, 3]);
  });

  it('PUT /order with an unknown id → 400 and positions untouched', async () => {
    const res = await authed(
      'PUT',
      '/api/v1/admin/testimonials/order',
      'admin-testi-orderbad@sevendays.test',
      {
        testimonialIds: [
          ids.testimonialA,
          ids.testimonialB,
          '00000000-0000-4000-8000-000000000000',
        ],
      }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['testimonialIds']);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/testimonials',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ position: 0 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('gallery photos admin CRUD', () => {
  const STAGING = 'tmp/00000000-0000-4000-8000-000000000000.jpg';
  const PHOTO_A_KEY = 'gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg';

  it('GET / lists ALL rows including the deactivated one — photoUrl resolved, NO raw key anywhere', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/gallery-photos',
      'admin-photos-list@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; photoUrl: string; isActive: boolean }[];
    expect(body).toHaveLength(3);
    const retired = body.find((p) => p.id === ids.photoRetired);
    expect(retired?.isActive).toBe(false);
    for (const photo of body) {
      expect(photo.photoUrl.startsWith('https://pub-test.r2.dev/gallery/')).toBe(true);
    }
    expect(JSON.stringify(body).includes('r2Key')).toBe(false);
  });

  it('POST with a staging key → 201; the key is commit-verified, promoted, and the row carries the final key', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const res = await app.request(
      '/api/v1/admin/gallery-photos',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${(await signUpSession(url, 'admin-photos-post@sevendays.test')).token}`,
        },
        body: JSON.stringify({
          r2Key: STAGING,
          title: 'Toga portrait',
          caption: null,
          categoryId: ids.categoryA,
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; photoUrl: string; position: number };
    expect(body.photoUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/gallery\/[0-9a-f-]{36}\.jpg$/);
    expect(body.position).toBe(4);
    expect(stub.deleteCalls).toEqual([STAGING]);
  });

  it('POST with a foreign key → 400 with the r2Key detail and NO row created', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/gallery-photos',
      'admin-photos-foreign@sevendays.test',
      {
        r2Key: 'gallery/00000000-0000-4000-8000-000000000000.jpg',
      }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['r2Key']);
    const rows = await db.select({ id: galleryPhotos.id }).from(galleryPhotos);
    expect(rows).toHaveLength(3);
  });

  it('POST with an unknown categoryId → 400 BEFORE any bucket call (no orphan promote)', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const res = await app.request(
      '/api/v1/admin/gallery-photos',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${(await signUpSession(url, 'admin-photos-badcat@sevendays.test')).token}`,
        },
        body: JSON.stringify({
          r2Key: STAGING,
          categoryId: '00000000-0000-4000-8000-000000000000',
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['categoryId']);
    expect(stub.putCalls).toEqual([]);
  });

  it('PUT metadata is full-object — null clears title/categoryId and isActive flips', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/gallery-photos/${ids.photoA}`,
      'admin-photos-put@sevendays.test',
      { title: null, caption: null, categoryId: null, isActive: false }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      title: string | null;
      categoryId: string | null;
      isActive: boolean;
    };
    expect(body.title).toBeNull();
    expect(body.categoryId).toBeNull();
    expect(body.isActive).toBe(false);
  });

  it('PUT with a new r2Key replaces the photo — new final key in the row, the OLD object deleted after', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${ids.photoA}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${(await signUpSession(url, 'admin-photos-replace@sevendays.test')).token}`,
        },
        body: JSON.stringify({
          title: null,
          caption: null,
          categoryId: ids.categoryB,
          isActive: true,
          r2Key: STAGING,
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { photoUrl: string };
    expect(body.photoUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/gallery\//);
    expect(stub.deleteCalls).toEqual([STAGING, PHOTO_A_KEY]);
  });

  it('PUT /order full-replace renumbers — the deactivated photo is renumbered too', async () => {
    const res = await authed(
      'PUT',
      '/api/v1/admin/gallery-photos/order',
      'admin-photos-order@sevendays.test',
      {
        photoIds: [ids.photoRetired, ids.photoB, ids.photoA],
      }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; position: number }[];
    expect(body.map((p) => p.id)).toEqual([ids.photoRetired, ids.photoB, ids.photoA]);
    expect(body.map((p) => p.position)).toEqual([1, 2, 3]);
  });

  it('PUT /order incomplete → 400 and positions untouched', async () => {
    const res = await authed(
      'PUT',
      '/api/v1/admin/gallery-photos/order',
      'admin-photos-orderbad@sevendays.test',
      {
        photoIds: [ids.photoA],
      }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['photoIds']);
    const rows = await db
      .select({ position: galleryPhotos.position })
      .from(galleryPhotos)
      .where(eq(galleryPhotos.id, ids.photoRetired));
    expect(rows[0]?.position).toBe(3);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000',
      'admin-photos-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Photo not found.' });
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-photos',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ r2Key: 42 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
