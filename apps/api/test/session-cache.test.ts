import { describe, expect, it } from 'vitest';
import type { SessionData } from '../src/services/auth.js';
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
import { TEST_AUTH_SECRET } from './helpers/env.js';

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
