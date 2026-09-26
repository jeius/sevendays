import { galleryCategories, galleryPhotos, testimonials } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { GalleryFixtureIds } from './helpers/fixtures.js';
import { loadGalleryFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let gallery: GalleryFixtureIds;

beforeEach(async () => {
  await truncateAll(db);
  gallery = await loadGalleryFixtures(db);
});

describe('GET /api/v1/gallery (the assembled public read, #138)', () => {
  it('returns active categories + active categorized photos with resolved photoUrls', async () => {
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      categories: { id: string; name: string }[];
      photos: { id: string; photoUrl: string; title: string | null; categoryId: string }[];
    };
    // Active categories in position order; the deactivated third tab absent.
    expect(body.categories).toEqual([
      { id: gallery.categoryA, name: 'Weddings' },
      { id: gallery.categoryB, name: 'Graduation' },
    ]);
    // Active + categorized only: photoRetired is BOTH inactive and
    // uncategorized — absent on either count. Raw keys never appear.
    expect(body.photos).toHaveLength(2);
    const photoA = body.photos.find((p) => p.id === gallery.photoA);
    expect(photoA?.photoUrl).toBe(
      'https://pub-test.r2.dev/gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg'
    );
    expect(photoA?.categoryId).toBe(gallery.categoryA);
    expect(photoA?.title).toBeNull();
    const photoB = body.photos.find((p) => p.id === gallery.photoB);
    expect(photoB?.photoUrl).toBe(
      'https://pub-test.r2.dev/gallery/aaaaaaaa-0000-4000-8000-000000000002.jpg'
    );
    expect(photoB?.categoryId).toBe(gallery.categoryB);
    expect(photoA).not.toHaveProperty('r2Key');
    expect(photoB).not.toHaveProperty('r2Key');
  });

  it('an ACTIVE uncategorized photo is absent (the staff-only state)', async () => {
    await db.insert(galleryPhotos).values({
      r2Key: 'gallery/aaaaaaaa-0000-4000-8000-000000000009.jpg',
      position: 4,
    });
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { photos: { id: string }[] };
    expect(body.photos).toHaveLength(2);
    expect(body.photos.some((p) => p.id === gallery.photoRetired)).toBe(false);
  });

  it('positions decide the order, not ids', async () => {
    await db
      .update(galleryCategories)
      .set({ position: 1 })
      .where(eq(galleryCategories.id, gallery.categoryB));
    await db
      .update(galleryCategories)
      .set({ position: 2 })
      .where(eq(galleryCategories.id, gallery.categoryA));
    await db.update(galleryPhotos).set({ position: 1 }).where(eq(galleryPhotos.id, gallery.photoB));
    await db.update(galleryPhotos).set({ position: 2 }).where(eq(galleryPhotos.id, gallery.photoA));
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      categories: { id: string }[];
      photos: { id: string }[];
    };
    expect(body.categories.map((c) => c.id)).toEqual([gallery.categoryB, gallery.categoryA]);
    expect(body.photos.map((p) => p.id)).toEqual([gallery.photoB, gallery.photoA]);
  });

  it('the CMS-born-empty tables answer empty arrays with 200', async () => {
    await truncateAll(db);
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ categories: [], photos: [] });
  });
});

describe('GET /api/v1/testimonials (the public read, #138)', () => {
  it('returns active testimonials in position order, projection stripped to the public shape', async () => {
    const res = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; quote: string; person: string }[];
    expect(body).toEqual([
      {
        id: gallery.testimonialA,
        quote: 'The photos came out better than we hoped.',
        person: 'Maria, batch 2026',
      },
      {
        id: gallery.testimonialB,
        quote: 'Fast, friendly, and the prints are gorgeous.',
        person: 'Jon & Riza',
      },
    ]);
    // The public projection carries no position/isActive/timestamps.
    expect(body[0]).not.toHaveProperty('position');
    expect(body[0]).not.toHaveProperty('isActive');
  });

  it('positions decide the order', async () => {
    await db
      .update(testimonials)
      .set({ position: 1 })
      .where(eq(testimonials.id, gallery.testimonialB));
    await db
      .update(testimonials)
      .set({ position: 2 })
      .where(eq(testimonials.id, gallery.testimonialA));
    const res = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string }[];
    expect(body.map((t) => t.id)).toEqual([gallery.testimonialB, gallery.testimonialA]);
  });
});
