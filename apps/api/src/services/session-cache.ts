import type { SessionData } from './auth.js';

// The session-verify cache (ADR-0027, #286): a token-hash → (session, user)
// read-through cache consulted by the session gate (services/auth.ts) BEFORE
// any verification work — a hit serves the verified identity with zero DB
// I/O and never constructs the per-request auth instance. Storage is the
// Workers Cache API beside the public read cache (ADR-0025): free, per-colo,
// TTL-evicted. The key is a SHA-256 digest over a secret fingerprint (itself
// a SHA-256 of the shared BETTER_AUTH_SECRET) plus the PRESENTED bearer
// value — neither the secret nor the token ever appears in a key or a log;
// the inner digest is fixed-length hex, so the outer hash has no
// length-extension surface. 401 outcomes are never cached; a hit re-checks
// the cached session's expiry before serving (a hit is never more permissive
// than a fresh verification). Revocation is TTL-only by the owner-ruled
// bound (≤60 s per colo — the signing-out browser itself is immediate): no
// eviction path exists, so this store carries no evict — the deliberate
// clone difference from services/read-cache.ts. The seam mirrors
// read-cache.ts: an injectable registry whose default is caches.default
// under workerd and null under plain Node/vitest — every existing suite runs
// uncached with the null store (the floors hold by construction). Cache I/O
// is best-effort throughout: match resolves undefined on error, put swallows
// — a cache failure degrades to uncached verification and never fails a
// request.

export interface SessionCacheStore {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
}

export const SESSION_CACHE_TTL_SECONDS = 60;

export const SESSION_CACHE_KEY_ORIGIN = 'https://session-cache.sevendays.internal';

// The stored container: the verified session as JSON under a storage
// freshness directive the Cache API honors at put() — PUBLIC, because the
// Cache API is a shared cache and a `private` directive makes the entry
// unstashable (put throws 413, the best-effort catch swallows, nothing
// ever caches). Per-user isolation comes from the token-hash key, not the
// directive: the container is Worker-internal colo storage and is never
// served to a client — the hit path parses the body server-side. The TTL
// is the revocation bound.
export function toSessionCacheEntry(session: SessionData): Response {
  return new Response(JSON.stringify(session), {
    headers: { 'cache-control': `public, max-age=${SESSION_CACHE_TTL_SECONDS}` },
  });
}

// The Date columns the adapter returns as Date instances and the JSON
// container stringified — revived so a cached hit satisfies the same
// SessionData shape a fresh verification produces.
const DATE_COLUMNS = new Set(['expiresAt', 'createdAt', 'updatedAt']);

function reviveDates(row: Record<string, unknown>): Record<string, unknown> {
  const revived = { ...row };
  for (const key of DATE_COLUMNS) {
    const value = revived[key];
    if (typeof value === 'string' || typeof value === 'number') {
      revived[key] = new Date(value);
    }
  }
  return revived;
}

// The hit projection: the parsed cached session, or null when anything is
// off (malformed JSON, missing halves, an expired session — the expiry
// guard). Best-effort: never throws.
export async function sessionFromCacheEntry(entry: Response): Promise<SessionData | null> {
  try {
    const raw = (await entry.json()) as {
      session?: Record<string, unknown>;
      user?: Record<string, unknown>;
    };
    if (!raw.session || !raw.user) return null;
    const expiresAt = new Date(raw.session.expiresAt as string).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return {
      session: reviveDates(raw.session),
      user: reviveDates(raw.user),
    } as SessionData;
  } catch {
    return null;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// The key: SHA-256 over a secret fingerprint (itself a SHA-256 of the shared
// auth secret) plus the presented bearer value. A secret rotation changes
// every key; old entries age out via the TTL — no migration.
export async function sessionCacheKey(secret: string, presentedToken: string): Promise<string> {
  const fingerprint = await sha256Hex(secret);
  return sha256Hex(`${fingerprint}:${presentedToken}`);
}

// The presented value exactly as the bearer plugin sees it (scheme stripped
// case-insensitively, value trimmed) — the cache-key input. Null for
// anything the gate would 401 anyway (no header, non-bearer scheme): those
// requests never consult the store.
export function presentedBearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  const value = match?.[1]?.trim();
  return value ? value : null;
}

// The Cache-API-backed default (workerd only). Never throws — see header.
function defaultStore(): SessionCacheStore | null {
  const cache = typeof caches !== 'undefined' ? caches.default : undefined;
  if (!cache) return null;
  const requestFor = (key: string) =>
    new Request(`${SESSION_CACHE_KEY_ORIGIN}/${key}`, { method: 'GET' });
  return {
    async match(key) {
      try {
        return await cache.match(requestFor(key));
      } catch {
        return undefined;
      }
    },
    async put(key, response) {
      try {
        await cache.put(requestFor(key), response);
      } catch {
        // Best-effort: an uncachable container degrades to uncached
        // verification.
      }
    },
  };
}

let override: SessionCacheStore | null = null;

export function getSessionCacheStore(): SessionCacheStore | null {
  return override ?? defaultStore();
}

export function setSessionCacheStore(store: SessionCacheStore | null): void {
  override = store;
}

export function resetSessionCacheStore(): void {
  override = null;
}
