import { session as sessionTable } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acquireDb } from '../src/routes/v1.js';
import type { SessionData } from '../src/services/auth.js';
import { requireSession } from '../src/services/auth.js';
import type { ApiEnv } from '../src/services/db.js';
import {
  getSessionCacheStore,
  presentedBearerToken,
  resetSessionCacheStore,
  SESSION_CACHE_TTL_SECONDS,
  type SessionCacheStore,
  sessionCacheKey,
  sessionFromCacheEntry,
  setSessionCacheStore,
  toSessionCacheEntry,
} from '../src/services/session-cache.js';
import { signOutSession, signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { TEST_AUTH_SECRET, testEnv } from './helpers/env.js';
import { truncateAll } from './helpers/truncate.js';

// NOTE (import staging): the header carries ONLY what the unit block uses —
// (kept honest by Biome's noUnusedVariables, not a tsconfig gate). Task 3's integration describe adds its imports as
// it lands (db, helpers, the scratch app). Deliberately free of booking-path
// strings so the v1 pick carries this file (the audit-token discipline,
// require-session.test.ts's note).

// The in-memory fake (the r2-stub posture): put snapshots status/headers/body,
// match returns a FRESH Response per call (bodies are single-use).
function fakeStore() {
  const entries = new Map<string, { status: number; headers: string[][]; body: string }>();
  const store: SessionCacheStore & { keys: () => string[] } = {
    async match(key) {
      const entry = entries.get(key);
      return entry
        ? new Response(entry.body, { status: entry.status, headers: entry.headers })
        : undefined;
    },
    async put(key, response) {
      entries.set(key, {
        status: response.status,
        headers: [...response.headers],
        body: await response.clone().text(),
      });
    },
    keys: () => [...entries.keys()],
  };
  return store;
}

// The verified-session fixture: the shape auth.api.getSession returns, with
// the Date columns real (toSessionCacheEntry stringifies them; the hit
// reviver must restore them). Cast: the tests only touch the core columns.
function sessionFixture(overrides?: { expiresAt?: Date }) {
  const expiresAt = overrides?.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000);
  return {
    session: {
      id: 'sess-1',
      userId: 'user-1',
      token: 'raw-token-value',
      expiresAt,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(Date.now() - 60_000),
    },
    user: {
      id: 'user-1',
      name: 'Test Staff',
      email: 'fixture@sevendays.test',
      emailVerified: false,
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(Date.now() - 60_000),
    },
  } as SessionData;
}

// The scratch app (the require-session.test.ts posture): acquireDb +
// requireSession + a probe route — the gate is route-independent; the
// file stays free of booking-path strings (the v1-pick note above).
const scratch = new Hono<ApiEnv>()
  .use('*', acquireDb)
  .get('/protected', requireSession, (c) => c.json({ userId: c.get('session')?.user.id ?? null }));

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const presented = 'presented.token.value';

describe('the session-cache seam (unit)', () => {
  it('has no store under plain Node — the vitest default is no-op', () => {
    expect(getSessionCacheStore()).toBeNull();
  });

  it('set/reset round-trips the override', () => {
    const store = fakeStore();
    setSessionCacheStore(store);
    expect(getSessionCacheStore()).toBe(store);
    resetSessionCacheStore();
    expect(getSessionCacheStore()).toBeNull();
  });

  it('keys are 64-hex digests that never carry the presented token or the secret', async () => {
    const key = await sessionCacheKey(TEST_AUTH_SECRET, presented);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain(presented);
    expect(key).not.toContain(TEST_AUTH_SECRET);
  });

  it('keys are stable per (secret, token) and secret-sensitive', async () => {
    const key = await sessionCacheKey(TEST_AUTH_SECRET, presented);
    expect(await sessionCacheKey(TEST_AUTH_SECRET, presented)).toBe(key);
    expect(await sessionCacheKey('a-different-secret-0123456789', presented)).not.toBe(key);
    expect(await sessionCacheKey(TEST_AUTH_SECRET, 'another.token')).not.toBe(key);
  });

  it('the TTL constant is the ruled 60 seconds', () => {
    expect(SESSION_CACHE_TTL_SECONDS).toBe(60);
  });

  it('toSessionCacheEntry stores a JSON container with the public 60 s directive', async () => {
    const entry = toSessionCacheEntry(sessionFixture());
    expect(entry.headers.get('cache-control')).toBe(`public, max-age=${SESSION_CACHE_TTL_SECONDS}`);
    const parsed = (await entry.json()) as { session: { id: string }; user: { id: string } };
    expect(parsed.session.id).toBe('sess-1');
    expect(parsed.user.id).toBe('user-1');
  });

  it('sessionFromCacheEntry revives the Date columns on a fresh entry and rejects stale/malformed ones', async () => {
    const revived = await sessionFromCacheEntry(toSessionCacheEntry(sessionFixture()));
    expect(revived).not.toBeNull();
    expect(revived?.session.expiresAt).toBeInstanceOf(Date);
    expect(revived?.user.createdAt).toBeInstanceOf(Date);
    expect(revived?.session.id).toBe('sess-1');
    const stale = sessionFixture({ expiresAt: new Date(Date.now() - 60_000) });
    expect(await sessionFromCacheEntry(toSessionCacheEntry(stale))).toBeNull();
    expect(await sessionFromCacheEntry(new Response('not-json'))).toBeNull();
  });

  it('presentedBearerToken extracts the presented value and refuses everything else', () => {
    expect(presentedBearerToken('Bearer abc.def')).toBe('abc.def');
    expect(presentedBearerToken('bearer abc.def')).toBe('abc.def');
    expect(presentedBearerToken('Bearer  spaced  ')).toBe('spaced');
    expect(presentedBearerToken(undefined)).toBeNull();
    expect(presentedBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(presentedBearerToken('Bearer')).toBeNull();
  });
});

describe('requireSession with the session cache (scratch app, real Postgres)', () => {
  let store: ReturnType<typeof fakeStore>;

  beforeEach(async () => {
    await truncateAll(db);
    store = fakeStore();
    setSessionCacheStore(store);
  });

  afterEach(() => {
    resetSessionCacheStore();
  });

  it('a miss verifies through BetterAuth and back-fills the store', async () => {
    const { token, userId } = await signUpSession(url, 'cache-miss@sevendays.test');
    expect(store.keys()).toEqual([]);
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId });
    expect(store.keys()).toEqual([await sessionCacheKey(TEST_AUTH_SECRET, token)]);
  });

  it('a hit serves without the database — even a revoked row passes within the TTL (the ruled pin)', async () => {
    const { token, userId } = await signUpSession(url, 'cache-hit@sevendays.test');
    expect(
      (await scratch.request('/protected', { headers: bearer(token) }, testEnv(url))).status
    ).toBe(200);
    expect(store.keys()).toHaveLength(1);
    await signOutSession(url, token); // the row is deleted — a fresh verification would 401
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200); // the cached hit answers — the ruled ≤60 s trade, deliberate
    expect((await res.json()) as { userId?: string }).toEqual({ userId });
    expect(store.keys()).toHaveLength(1); // no second verification — the hit never re-verified
  });

  it('401 outcomes never cache — garbage tokens leave the store empty', async () => {
    const res = await scratch.request(
      '/protected',
      { headers: bearer('not-a-real-token') },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(store.keys()).toEqual([]);
  });

  it('the 401 envelope is byte-identical with the cache in the path', async () => {
    const { token } = await signUpSession(url, 'cache-envelope@sevendays.test');
    await signOutSession(url, token); // revoked BEFORE any request — verification runs, caches nothing
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
    expect(store.keys()).toEqual([]);
  });

  it('the expiry guard rejects a stale entry — a hit is never more permissive than verification', async () => {
    const { token } = await signUpSession(url, 'cache-stale@sevendays.test');
    const key = await sessionCacheKey(TEST_AUTH_SECRET, token);
    // Seed an entry whose embedded expiresAt is already past (hand-built:
    // the gate's own back-fill only ever writes verified, unexpired sessions).
    await store.put(
      key,
      new Response(JSON.stringify(sessionFixture({ expiresAt: new Date(Date.now() - 1000) })), {
        headers: { 'cache-control': `public, max-age=${SESSION_CACHE_TTL_SECONDS}` },
      })
    );
    // The row is expired too (the require-session.test.ts method: expires_at
    // moved to the past; the stored row carries the BARE token) — a fresh
    // verification would also 401.
    await db
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(sessionTable.token, token.split('.')[0] ?? ''));
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(401);
    expect(store.keys()).toEqual([key]); // the stale entry was never served, and no fresh entry overwrote it (401s never cache)
  });

  it('with no store (the Node/vitest default), the gate stays uncached — revocation is immediate', async () => {
    resetSessionCacheStore();
    const { token } = await signUpSession(url, 'cache-null@sevendays.test');
    expect(
      (await scratch.request('/protected', { headers: bearer(token) }, testEnv(url))).status
    ).toBe(200);
    await signOutSession(url, token);
    expect(
      (await scratch.request('/protected', { headers: bearer(token) }, testEnv(url))).status
    ).toBe(401);
  });
});
