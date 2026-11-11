import type { MiddlewareHandler } from 'hono';
import type { ApiEnv } from './db.js';

// The public-read cache (ADR-0025, #263): a read-through edge cache over the
// five public catalog reads, ABOVE the per-request db client (ADR-0011 — they
// compose). Storage is the Workers Cache API: free, no daily caps, per-colo.
// The TTL is the correctness backstop (delete evicts only the local colo);
// committed admin mutations evict early for the owner's read-your-writes.
// The seam mirrors observability/capture.ts: an injectable registry whose
// default is caches.default under workerd and null under plain Node/vitest —
// every existing suite runs uncached with the null store (the floors hold by
// construction). Cache I/O is best-effort throughout (ADR-0025): match
// resolves undefined on error, put/evict swallow — a cache failure degrades
// to uncached behavior and never fails a request.

export interface PublicReadStore {
  match(path: string): Promise<Response | undefined>;
  put(path: string, response: Response): Promise<void>;
  evict(...paths: string[]): Promise<void>;
}

export const PUBLIC_READ_TTL_SECONDS = 60;

export const READ_CACHE_KEY_ORIGIN = 'https://read-cache.sevendays.internal';

export function readCacheKey(path: string): string {
  return `${READ_CACHE_KEY_ORIGIN}${path}`;
}

function requestFor(path: string): Request {
  return new Request(readCacheKey(path), { method: 'GET' });
}

/** The stored copy: the served response cloned with the storage freshness
 * directive the Cache API needs (put() honors Cache-Control; no-store errors,
 * so the stored and served cache-control are deliberately different). */
export function toStoredResponse(response: Response): Response {
  const stored = new Response(response.clone().body, response);
  stored.headers.set('cache-control', `public, max-age=${PUBLIC_READ_TTL_SECONDS}`);
  return stored;
}

/** The hit projection: fresh Response over the stored body with the storage
 * directive stripped — the hit's wire is byte-identical to a fresh miss
 * (miss responses carry no cache directives, and none are added). */
export function responseFromCacheHit(hit: Response): Response {
  const res = new Response(hit.body, hit);
  res.headers.delete('cache-control');
  return res;
}

// The five owner-named surfaces (#263). The booking lookups (studio/addon
// services) stay uncached by the brief's fence — a follow-up extends this
// list if the owner wants them.
const CACHED_READ_PREFIXES = [
  '/api/v1/branches',
  '/api/v1/service-packages',
  '/api/v1/gallery',
  '/api/v1/testimonials',
  '/api/v1/site-settings',
] as const;

export function isCachedReadPath(path: string): boolean {
  return CACHED_READ_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

// The Cache-API-backed default (workerd only). Never throws — see the header.
function defaultStore(): PublicReadStore | null {
  const cache = typeof caches !== 'undefined' ? caches.default : undefined;
  if (!cache) return null;
  return {
    async match(path) {
      try {
        return await cache.match(requestFor(path));
      } catch {
        return undefined;
      }
    },
    async put(path, response) {
      try {
        await cache.put(requestFor(path), toStoredResponse(response));
      } catch {
        // Best-effort: an uncachable response (e.g. a future Set-Cookie)
        // degrades to uncached behavior.
      }
    },
    async evict(...paths) {
      await Promise.allSettled(paths.map((path) => cache.delete(requestFor(path))));
    },
  };
}

let override: PublicReadStore | null = null;

export function getReadCacheStore(): PublicReadStore | null {
  return override ?? defaultStore();
}

export function setReadCacheStore(store: PublicReadStore | null): void {
  override = store;
}

export function resetReadCacheStore(): void {
  override = null;
}
