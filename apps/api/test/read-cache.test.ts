import { galleryPhotos } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import {
  getReadCacheStore,
  isCachedReadPath,
  PUBLIC_READ_TTL_SECONDS,
  type PublicReadStore,
  READ_CACHE_KEY_ORIGIN,
  readCacheKey,
  resetReadCacheStore,
  responseFromCacheHit,
  setReadCacheStore,
  toStoredResponse,
} from '../src/services/read-cache.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { loadFixtures, loadGalleryFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
const store = fakeStore(); // shared by this and Task 4's describe

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

// NOTE (import staging): imports land as their describes do — noUnusedLocals
// is a gate. All staged imports are in (`app`, `eq` (drizzle-orm),
// `galleryPhotos` (@sevendays/db), `signUpSession` (./helpers/auth.js), the
// `bearer` const, `testEnv`, `loadFixtures`, `loadGalleryFixtures`, and the
// shared `store` const above).

// The in-memory fake (the r2-stub posture): put snapshots status/headers/body,
// match returns a FRESH Response per call (bodies are single-use).
function fakeStore() {
  const entries = new Map<string, { status: number; headers: string[][]; body: string }>();
  const store: PublicReadStore & { keys: () => string[] } = {
    async match(path) {
      const entry = entries.get(path);
      return entry
        ? new Response(entry.body, { status: entry.status, headers: entry.headers })
        : undefined;
    },
    async put(path, response) {
      entries.set(path, {
        status: response.status,
        headers: [...response.headers],
        body: await response.clone().text(),
      });
    },
    async evict(...paths) {
      for (const path of paths) entries.delete(path);
    },
    keys: () => [...entries.keys()],
  };
  return store;
}

beforeEach(async () => {
  await truncateAll(db);
});

afterEach(() => {
  resetReadCacheStore();
});

describe('the read-cache seam (unit)', () => {
  it('has no store under plain Node — the vitest default is no-op', () => {
    expect(getReadCacheStore()).toBeNull();
  });

  it('set/reset round-trips the override', () => {
    const store = fakeStore();
    setReadCacheStore(store);
    expect(getReadCacheStore()).toBe(store);
    resetReadCacheStore();
    expect(getReadCacheStore()).toBeNull();
  });

  it('keys are the synthetic origin + the request path', () => {
    expect(readCacheKey('/api/v1/gallery')).toBe(`${READ_CACHE_KEY_ORIGIN}/api/v1/gallery`);
  });

  it('the allowlist is the five list paths plus package detail continuations', () => {
    expect(isCachedReadPath('/api/v1/branches')).toBe(true);
    expect(isCachedReadPath('/api/v1/service-packages')).toBe(true);
    expect(isCachedReadPath('/api/v1/service-packages/combined-package')).toBe(true);
    expect(isCachedReadPath('/api/v1/gallery')).toBe(true);
    expect(isCachedReadPath('/api/v1/testimonials')).toBe(true);
    expect(isCachedReadPath('/api/v1/site-settings')).toBe(true);
    // Everything else bypasses — the booking lookups, appointments, admin.
    expect(isCachedReadPath('/api/v1/studio-services')).toBe(false);
    expect(isCachedReadPath('/api/v1/addon-services')).toBe(false);
    expect(isCachedReadPath('/api/v1/branches-other')).toBe(false);
    expect(isCachedReadPath('/api/v1/admin/branches')).toBe(false);
  });

  it('toStoredResponse rewrites cache-control for storage and leaves the original untouched', async () => {
    const served = Response.json({ ok: true }, { status: 200 });
    const stored = toStoredResponse(served);
    expect(stored.headers.get('cache-control')).toBe(`public, max-age=${PUBLIC_READ_TTL_SECONDS}`);
    expect(await stored.text()).toBe('{"ok":true}');
    // The served response keeps its body unread and carries no cache directive.
    expect(served.headers.get('cache-control')).toBeNull();
    expect(await served.text()).toBe('{"ok":true}');
    // The hit projection strips the storage directive — byte-identical wire.
    const hit = responseFromCacheHit(
      toStoredResponse(Response.json({ ok: true }, { status: 200 }))
    );
    expect(hit.headers.get('cache-control')).toBeNull();
    expect(hit.headers.get('content-type')).toBe('application/json');
    expect(await hit.text()).toBe('{"ok":true}');
  });
});

describe('publicReadCache (the read path)', () => {
  let gallery: Awaited<ReturnType<typeof loadGalleryFixtures>>;

  beforeEach(async () => {
    // Shared-store hygiene: the module-level Map persists across tests and
    // the exact-match keys() assertions below need a clean one per test.
    store.evict(...store.keys());
    setReadCacheStore(store);
    gallery = await loadGalleryFixtures(db);
  });

  it('populates on miss and serves the hit without re-reading', async () => {
    const first = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(first.status).toBe(200);
    expect(store.keys()).toEqual(['/api/v1/gallery']);
    // The DB moves on; a cached hit must NOT.
    await db
      .update(galleryPhotos)
      .set({ caption: 'changed-under-the-cache' })
      .where(eq(galleryPhotos.id, gallery.photoA));
    const second = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(second.status).toBe(200);
    // Byte-identical body + content-type; no cache directive on the wire.
    expect(await second.text()).toBe(await first.text());
    expect(second.headers.get('content-type')).toBe(first.headers.get('content-type'));
    expect(second.headers.get('cache-control')).toBeNull();
    // The hit re-stamps x-request-id with its OWN request's id (Task 2
    // review, minor #1) — consecutive responses never share one.
    expect(second.headers.get('x-request-id')).not.toBe(first.headers.get('x-request-id'));
  });

  it('caches package details by slug, never 404s', async () => {
    await loadFixtures(db);
    const detail = await app.request(
      '/api/v1/service-packages/combined-package',
      undefined,
      testEnv(url)
    );
    expect(detail.status).toBe(200);
    expect(store.keys()).toEqual(['/api/v1/service-packages/combined-package']);
    const unknown = await app.request('/api/v1/service-packages/nope', undefined, testEnv(url));
    expect(unknown.status).toBe(404);
    expect(store.keys()).toEqual(['/api/v1/service-packages/combined-package']);
  });

  it('bypasses uncached surfaces and query strings entirely', async () => {
    await loadFixtures(db);
    const lookup = await app.request('/api/v1/studio-services', undefined, testEnv(url));
    expect(lookup.status).toBe(200);
    const queried = await app.request('/api/v1/gallery?x=1', undefined, testEnv(url));
    expect(queried.status).toBe(200);
    expect(store.keys()).toEqual([]);
  });

  it('with no store (the Node/vitest default), reads pass through uncached', async () => {
    resetReadCacheStore();
    const res = await app.request('/api/v1/site-settings', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body).length).toBeGreaterThan(0); // code-defaulted singleton
  });
});

describe('adminEvictPublicReads (the write path)', () => {
  beforeEach(() => {
    // Shared-store hygiene (the Task 3 pattern): exact-match keys() asserts
    // need a clean Map regardless of who populated it last.
    store.evict(...store.keys());
  });

  it('a committed gallery-category rename evicts the gallery read (read-your-writes)', async () => {
    setReadCacheStore(store);
    const gallery = await loadGalleryFixtures(db);
    const { token } = await signUpSession(url, 'evict-gallery@test.local');
    expect((await app.request('/api/v1/gallery', undefined, testEnv(url))).status).toBe(200);
    expect(store.keys()).toEqual(['/api/v1/gallery']);

    const current = (await (
      await app.request(
        `/api/v1/admin/gallery-categories/${gallery.categoryA}`,
        { headers: bearer(token) },
        testEnv(url)
      )
    ).json()) as { name: string; isActive: boolean };
    const put = await app.request(
      `/api/v1/admin/gallery-categories/${gallery.categoryA}`,
      {
        method: 'PUT',
        headers: { ...bearer(token), 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Renamed Weddings', isActive: current.isActive }),
      },
      testEnv(url)
    );
    expect(put.status).toBe(200);
    expect(store.keys()).toEqual([]);
    const after = (await (
      await app.request('/api/v1/gallery', undefined, testEnv(url))
    ).json()) as { categories: { name: string }[] };
    expect(after.categories[0].name).toBe('Renamed Weddings');
  });

  it('a failed mutation evicts nothing (only committed writes count)', async () => {
    setReadCacheStore(store);
    const gallery = await loadGalleryFixtures(db);
    const { token } = await signUpSession(url, 'evict-fail@test.local');
    expect((await app.request('/api/v1/gallery', undefined, testEnv(url))).status).toBe(200);
    const put = await app.request(
      `/api/v1/admin/gallery-categories/${gallery.categoryA}`,
      {
        method: 'PUT',
        headers: { ...bearer(token), 'content-type': 'application/json' },
        body: JSON.stringify({ name: 123, isActive: true }), // wrong type → validatedJson 400
      },
      testEnv(url)
    );
    expect(put.status).toBe(400);
    expect(store.keys()).toEqual(['/api/v1/gallery']);
  });

  it('a print-size deactivation sweeps the package list AND every detail key (the trim-rule embedding)', async () => {
    setReadCacheStore(store);
    const fixtures = await loadFixtures(db);
    const { token } = await signUpSession(url, 'evict-sweep@test.local');
    for (const path of [
      '/api/v1/service-packages',
      '/api/v1/service-packages/combined-package',
      '/api/v1/service-packages/simple-package',
    ]) {
      expect((await app.request(path, undefined, testEnv(url))).status).toBe(200);
    }
    expect(store.keys().sort()).toEqual(
      [
        '/api/v1/service-packages',
        '/api/v1/service-packages/combined-package',
        '/api/v1/service-packages/simple-package',
      ].sort()
    );

    const size = (await (
      await app.request(
        `/api/v1/admin/print-sizes/${fixtures.printSize2R}`,
        { headers: bearer(token) },
        testEnv(url)
      )
    ).json()) as { code: string; description: string | null; isActive: boolean };
    const put = await app.request(
      `/api/v1/admin/print-sizes/${fixtures.printSize2R}`,
      {
        method: 'PUT',
        headers: { ...bearer(token), 'content-type': 'application/json' },
        body: JSON.stringify({ ...size, isActive: false }),
      },
      testEnv(url)
    );
    expect(put.status).toBe(200);
    expect(store.keys()).toEqual([]);
  });

  it('a committed branch rename evicts the branches read; a testimonial create evicts the testimonials read', async () => {
    setReadCacheStore(store);
    const fixtures = await loadFixtures(db);
    const { token } = await signUpSession(url, 'evict-rest@test.local');
    expect((await app.request('/api/v1/branches', undefined, testEnv(url))).status).toBe(200);
    expect((await app.request('/api/v1/testimonials', undefined, testEnv(url))).status).toBe(200);

    const branch = (await (
      await app.request(
        `/api/v1/admin/branches/${fixtures.branchA}`,
        { headers: bearer(token) },
        testEnv(url)
      )
    ).json()) as { address: string; phone: string; acceptsWalkIns: boolean; isActive: boolean };
    const branchPut = await app.request(
      `/api/v1/admin/branches/${fixtures.branchA}`,
      {
        method: 'PUT',
        headers: { ...bearer(token), 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Renamed Main',
          address: branch.address,
          phone: branch.phone,
          acceptsWalkIns: branch.acceptsWalkIns,
          isActive: branch.isActive,
        }),
      },
      testEnv(url)
    );
    expect(branchPut.status).toBe(200);
    expect(store.keys()).toEqual(['/api/v1/testimonials']); // branches gone, testimonials kept

    const testimonialPost = await app.request(
      '/api/v1/admin/testimonials',
      {
        method: 'POST',
        headers: { ...bearer(token), 'content-type': 'application/json' },
        body: JSON.stringify({
          quote: 'The cache evicts when we publish.',
          person: 'Test Person',
          isActive: true,
        }),
      },
      testEnv(url)
    );
    expect(testimonialPost.status).toBe(201);
    expect(store.keys()).toEqual([]);
  });
});
