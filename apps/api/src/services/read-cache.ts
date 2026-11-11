import { type Database, servicePackages } from '@sevendays/db';
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

// The read-through middleware (ADR-0025): mounted FIRST on the v1 chain, so
// a hit returns before acquireDb even constructs the per-request client.
// GET-only, allowlisted, query-string-free, 200-only storage — everything
// else passes through untouched (appointments/admin/auth never reach a store
// call). The stored copy is written by the default store's put (TTL header
// rewrite inside); the served response is returned exactly as the handler
// produced it.
export const publicReadCache: MiddlewareHandler<ApiEnv> = async (c, next) => {
  if (c.req.method !== 'GET' || !isCachedReadPath(c.req.path) || c.req.url.includes('?')) {
    return next();
  }
  const store = getReadCacheStore();
  if (!store) return next();
  const hit = await store.match(c.req.path);
  if (hit) {
    // A stored body replays the populating request's x-request-id; re-stamp
    // with THIS request's id (requestLogging minted it at the root, before
    // this middleware) so the echoed header always correlates to the request
    // that actually served — the hit then deviates from a fresh miss in
    // nothing (Task 2 review, minor #1).
    const res = responseFromCacheHit(hit);
    res.headers.set('x-request-id', c.get('requestId'));
    return res;
  }
  await next();
  if (c.res.status === 200) {
    await store.put(c.req.path, c.res);
  }
};

// The eviction contract (ADR-0025): every COMMITTED admin mutation request
// (non-GET, 2xx/3xx — the audit row's gate, M6 #185) evicts the public
// reads its entity feeds. The package family spans three admin segments:
// the public package read EMBEDS print sizes and attires (the trim rules),
// so a print-size or attire mutation changes package responses too — all
// three sweep the list key + every current slug's detail key. Renamed-away
// or deleted slugs' stale entries are unenumerable (the Cache API has no
// list) — they age out via TTL (≤60 s, ADR-0025's documented bound).
export type CachedPublicRead =
  | 'branches'
  | 'service-packages'
  | 'gallery'
  | 'testimonials'
  | 'site-settings';

const ADMIN_MUTATION_READS: Record<string, CachedPublicRead[]> = {
  branches: ['branches'],
  'print-sizes': ['service-packages'],
  attires: ['service-packages'],
  'service-packages': ['service-packages'],
  'gallery-categories': ['gallery'],
  'gallery-photos': ['gallery'],
  testimonials: ['testimonials'],
  'testimonial-submissions': ['testimonials'],
  'site-settings': ['site-settings'],
  // media (presign mints URLs; binds happen inside entity saves),
  // addon-services + studio-services (no cached read embeds them): absent.
};

export async function evictCachedReads(db: Database, reads: CachedPublicRead[]): Promise<void> {
  try {
    const store = getReadCacheStore();
    if (!store) return;
    const paths: string[] = [];
    for (const read of reads) {
      if (read === 'service-packages') {
        paths.push('/api/v1/service-packages');
        const rows = await db.select({ slug: servicePackages.slug }).from(servicePackages);
        paths.push(...rows.map((row) => `/api/v1/service-packages/${row.slug}`));
      } else {
        paths.push(`/api/v1/${read}`);
      }
    }
    await store.evict(...paths);
  } catch {
    // Best-effort (ADR-0025): the TTL backstop covers what this misses.
  }
}

export const adminEvictPublicReads: MiddlewareHandler<ApiEnv> = async (c, next) => {
  await next();
  if (c.req.method === 'GET' || c.req.method === 'HEAD') return;
  const status = c.res.status;
  if (status < 200 || status >= 400) return;
  const segment = c.req.path.split('/')[4];
  const reads = segment ? ADMIN_MUTATION_READS[segment] : undefined;
  if (!reads) return;
  await evictCachedReads(c.get('db'), reads);
};
