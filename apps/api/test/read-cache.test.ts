import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
import { createTestDb } from './helpers/db.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

// NOTE (import staging): this header carries ONLY what the unit block uses —
// noUnusedLocals is a gate. Tasks 3–4 add their imports as their describes
// land: Task 3 adds `app`, `eq` (drizzle-orm), `galleryPhotos`
// (@sevendays/db), `testEnv`, `loadFixtures`, `loadGalleryFixtures`;
// Task 4 adds `signUpSession` and the `bearer` const below.
// const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

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
    expect(isCachedReadPath('/api/v1/appointments')).toBe(false);
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
