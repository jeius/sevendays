import { galleryCategories } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { GalleryFixtureIds } from './helpers/fixtures.js';
import { loadGalleryFixtures } from './helpers/fixtures.js';
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
