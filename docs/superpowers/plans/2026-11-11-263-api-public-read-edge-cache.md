# API Public-Read Edge Cache (#263) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **This ticket is NOT UI-bearing** — zero frontend files change, so the UI/UX skill-set loading rule does not apply. The local test DB is the only long-running dependency (the suites connect to it per request); no dev stack needs to stay up.

**Goal:** The API's five public catalog reads (branches, service-packages list + detail, gallery, testimonials, site-settings) serve through a read-through edge cache — a hit makes no DB dial — with committed admin mutations evicting their entity's entries, plus Sentry moved to errors-only.

**Architecture:** Six tasks: (1) Sentry errors-only (one config literal + its comment, immediate CPU headroom); (2) the read-cache seam module — an injectable store interface defaulting to the Workers Cache API when present and to a no-op under plain Node/vitest, with the pure helpers (key derivation, TTL rewrite) unit-tested; (3) the read middleware mounted first on the v1 chain — GET-only, allowlisted to the five surfaces, stores only 200s, hits return the stored bytes without running the handler; (4) the eviction middleware on the admin sub-app — non-GET 2xx/3xx responses evict per a path-segment → cached-read map, with a slug sweep covering every package detail key (package reads embed print-sizes/attires, so those mutations sweep too); (5) ADR-0025 + docs rotation + the repo gates at recorded floors; (6) deploy + the live `wrangler tail` CPU battery, PR, v1-picks classification, issue close. One commit per task.

**Tech Stack:** zero new dependencies (`pnpm-lock.yaml` untouched, `pnpm install` never runs), zero migrations, zero `packages/` changes, zero wrangler config changes — the Workers **Cache API** (`caches.default`) is ambient in workerd, needs no binding, is free with no daily caps (the owner's ruling over KV's 1 k writes/day). Hono middleware over the existing per-request db client (ADR-0011 — the cache sits *above* it; they compose). Vitest with the existing integration harness (`app.request` + `testEnv` + the local test DB + the BetterAuth test-shaped issuer). `gh` CLI.

**Spec:** Implements issue [#263 "API: edge-cache the public catalog reads — cut the per-request DB dial (free-plan CPU margin + degraded-pooler latency; #260 follow-up)"](https://github.com/jeius/sevendays/issues/263) (labels `enhancement` + `ready-for-agent`); its contract is the [agent brief](https://github.com/jeius/sevendays/issues/263#issuecomment-6784699395). Key rulings and recon facts (main `ee5167b`, clean tree; every file below read whole this session):

- **The premise, measured live (2026-11-10/11, from the issue):** fresh connect + one query = 7.3–12.4 ms CPU vs the free plan's 10 ms cap; warm query = 0.3–0.8 ms; live `wrangler tail` over 30 reads showed cpuTime median 10 ms, max 30 ms; Supavisor's connect path degrades episodically (~2.3 s fresh connects) and pushed the 2026-11-09 P0. Hyperdrive deployed 2026-11-11, failed on a recurring Cloudflare platform fault, reverted same day (#260/#261/#262 — the ADR number 0024 was created by #261 and deleted by the revert; **it is burned — this work takes ADR-0025**). **Owner ruling (2026-11-11): free Workers plan until client handover; the fix must cut per-request DB work without Hyperdrive.**
- **The owner-approved direction (issue body):** read-through cache on the five public reads at the API service layer (above `packages/db` — no second data path); invalidation on admin mutation commit; short TTL 30–60 s as the correctness backstop (Cache API `delete` evicts only the local colo); prefer the Cache API over KV; never cache appointments, `/api/v1/admin`, the testimonial-submissions POST, or auth.
- **Cache API mechanics (probed against the live docs, <https://developers.cloudflare.com/workers/runtime-apis/cache/>):** `put()` respects the stored Response's `Cache-Control` (expired entries surface as a `match()` miss); `put()` never caches `Set-Cookie` responses and **errors** on `no-store` — so the stored copy must carry `public, max-age=60` while the served response carries no cache directives at all; the key may be a synthetic URL string that is never fetched; contents and `delete()` are **per-colo** (the TTL backstop exists for exactly this); `match()` needs a GET request key.
- **The five reads today:** each is a thin route over a service call — `GET /api/v1/branches` (`listBranches`), `GET /api/v1/service-packages` (`listActivePackagesWithInclusions`), `GET /api/v1/service-packages/:slug` (`getActivePackageWithInclusionsBySlug`, unknown/deactivated → the uniform 404), `GET /api/v1/gallery` (`getPublicGallery`), `GET /api/v1/testimonials` (`listActiveTestimonials`), `GET /api/v1/site-settings` (`getSiteSettings` — code-defaulted when the singleton is unset, still a 200). **None takes a query string** — the cache-key set is the five list paths + the live slug values.
- **The cross-entity eviction fact:** the public package read **embeds print-size and attire data** (`fetchPublicComposition`'s trim rules — a deactivated print size hides its referencing inclusion; a deactivated attire trims from an inclusion's list). Deactivating a print size or attire therefore changes package list AND detail responses. The eviction map must treat print-size, attire, and service-package mutations identically (package list + every detail key). Gallery reads embed categories + photos only; testimonials embed nothing; branches embed nothing; site-settings is the singleton.
- **The mutation surfaces:** every admin mutation is transactional in `services/` with the audit row as its last statement (M6 #185 — only committed mutations record; eviction adopts the same gate: post-commit, 2xx only). Admin routes live under `/api/v1/admin/<segment>/…`; the media presign POST changes no entity (binds happen inside entity saves) — it evicts nothing. The public testimonial-submissions POST creates a *pending* row that never renders until accept appends a Testimonial — nothing the public read returns changes, so it evicts nothing (and is never cached regardless).
- **The injectable-seam precedent:** `observability/capture.ts` — a module-level function-pointer registry, default no-op, `setErrorCapture`/`resetErrorCapture` for tests, so the vitest graph never loads the SDK. The read-cache seam mirrors this posture: default store resolves `caches.default` when the global exists (workerd) and `null` under plain Node — every existing suite runs unchanged with the null store (the floors hold by construction).
- **The eviction key space:** list keys are fixed; detail keys are `/api/v1/service-packages/<slug>` for **current** slugs. A renamed-away or deleted slug's cached entry cannot be enumerated (the Cache API has no list) — those specific keys age out via TTL (≤60 s staleness on a dead slug, owner-invisible in practice). The sweep covers every current slug (active AND deactivated — a deactivated slug's cached 200 must go so the uniform 404 takes over).
- **Test-harness facts:** integration tests call `app.request(path, init, testEnv(url))` against `TEST_DATABASE_URL` (the local main-branch test DB on **port 5433** — 5432 belongs to another project; never use it); `signUpSession(url, email)` mints a real BetterAuth session and the suites pass `{ authorization: \`Bearer ${token}\` }`; `truncateAll` + `loadFixtures` (catalog: `branchA`, packages with slugs `combined-package`/`simple-package` active and `retired-package` deactivated, `printSize2R`… , attires, addons, studio services) + `loadGalleryFixtures` (`categoryA`/`photoA`…) seed per test; `fileParallelism: false` and per-file module registries mean the injected fake store never leaks across suites.
- **Sentry today:** `apps/api/src/worker.ts` — `tracesSampleRate: 1` with the header comment claiming "v1 traffic is far under any cap"; the CPU-cap fact supersedes. The capture seam's contract (every 5xx + curated 503 + email failures; 4xx log-only) is untouched by turning traces off. *(Secondary item ruled to ride this issue, owner 2026-11-11.)*

## Global Constraints

- **Branch:** `feat/263-api-public-read-edge-cache` off main `ee5167b` (clean tree at plan time). If main has moved, branch off latest main — nothing below depends on line numbers.
- **Baseline-first floor:** Task 1 Step 1 records the api suite's passing count (expected at `ee5167b`: **437 passed + 3 skipped**; the issue's pinned floor). If the count differs, the recorded actual becomes the floor — reconcile never loosen. Every later gate compares against that baseline + this plan's new tests (the new file adds exactly **13 tests** — 5 unit + 4 read-path + 4 eviction, enumerated in Tasks 2–4; if the file's count differs at a gate, fix the plan-drift before committing). The admin (262) and landing (123) floors are untouched — no file outside `apps/api` changes except docs.
- **DB for tests (controller-resolved at setup, 2026-11-11):** the standalone container `sevendays-test-db-5433` (postgres:17, `sevendays_test` db) is STARTED and probed (`select 1` ok). Every suite run takes the URL inline: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test` — it is NOT in the shell profile and the vitest global-setup's 5432 default belongs to another project (never let it fall back). Suites self-migrate + truncate at global-setup; no env file reading needed anywhere. Fresh-clone law (AGENTS.md): `pnpm build:packages` + `pnpm --filter @sevendays/api build` before `pnpm check`.
- **Pinned literals (owner range resolved):** TTL = **60 s** (`PUBLIC_READ_TTL_SECONDS = 60` — the top of the owner's 30–60 range: fewest dials, which is the CPU-margin goal; same-colo is evicted on commit, so the TTL only bounds cross-colo staleness of content that changes on admin save). Key origin = `https://read-cache.sevendays.internal` (synthetic, never fetched, per-colo). Stored copy carries `Cache-Control: public, max-age=60`; served responses carry no cache directives (miss = today's wire byte-for-byte; hit = stored bytes with the storage directive stripped). `tracesSampleRate: 0`. ADR file = `docs/adr/0025-api-public-read-edge-cache.md`.
- **The best-effort law:** cache I/O never throws out of the seam — `match` resolves `undefined` on error, `put`/`evict` swallow failures (including the post-commit slug-sweep query). A cache failure degrades to uncached behavior; the TTL is the correctness backstop. Requests never fail because of the cache.
- **The caching gate:** only `GET`, only the five allowlisted path prefixes, only `c.req.url` with **no query string** (a future query-param read bypasses the cache — safe default), only status **200** responses stored. Never cached: appointments, everything under `/api/v1/admin`, the testimonial-submissions POST, auth, and (fence — see below) the studio-services/addon-services public reads.
- **Fences (NOT here, regardless of temptation):** Hyperdrive re-land (#260, blocked on the CF platform episode — the probe worker and configs stay on the account); caching the `studio-services`/`addon-services` public reads (the brief names five; the booking-lookup reads are a one-line-per-surface follow-up if the owner wants it — do not expand scope); PostgREST/supabase-js reads (ADR-0007/0009 one-data-path law); a Durable Object connection broker; any `packages/db` or `packages/types` change (zero wire-shape change — the api-client loopback suite must pass untouched); `wrangler.toml` (the Cache API needs no binding); the e2e suite and visual baselines (ADR-0022 — separate verdicts); frontends; the Sentry capture seam's contract (only trace sampling changes).
- **Tick law:** `- [✅]` in this file and the issue alike, never plain `[x]`. Never commit secrets. Conventional commits, one per task, all referencing #263. `graphify update .` at close; its `graphify-out/` changes commit as their own `chore(graphify): post-#263 graph update` commit (the `1b9285a` pattern).
- **Per-task gates:** after every task's edits — `pnpm --filter @sevendays/api fix` (format canonical), `pnpm --filter @sevendays/api typecheck`, the task's targeted vitest run, then commit. Task 5 runs the full `pnpm check` + `pnpm build` at the floors.

## File Structure

```text
apps/api/src/services/read-cache.ts        # NEW — the seam: store interface + Cache API default + set/reset,
                                           #   key derivation + TTL rewrite helpers, the two middlewares, the
                                           #   admin-segment → cached-read eviction map + slug sweep (Tasks 2–4)
apps/api/src/routes/v1.ts                  # mount publicReadCache FIRST in the chain (Task 3, one use() + comment)
apps/api/src/routes/admin.ts               # mount adminEvictPublicReads after requireSession (Task 4, one use() + comment)
apps/api/src/worker.ts                     # tracesSampleRate 0 + comment rewrite (Task 1)
apps/api/test/read-cache.test.ts           # NEW — 5 unit + 8 integration tests (Tasks 2–4)
docs/adr/0025-api-public-read-edge-cache.md  # NEW (Task 5)
docs/progress.md                           # rotation (Task 5)
AGENTS.md                                  # one status sentence + the api-floor amendment (Task 5)
docs/superpowers/plans/2026-11-11-263-api-public-read-edge-cache.md  # this file (branch's first commit)
```

### Task 1: Sentry errors-only + the baseline floor

**Files:**
- Modify: `apps/api/src/worker.ts` (the `tracesSampleRate` literal + the header comment sentence)

**Interfaces:**
- Consumes: nothing new.
- Produces: the recorded api-suite baseline count later tasks gate against.

- [ ] **Step 1: Record the baseline floor**

Run: `TEST_DATABASE_URL=<local-5433-url> pnpm --filter @sevendays/api test`
Expected: **437 passed + 3 skipped** (the issue's floor at `ee5167b`). Record the actual count if it differs — that recorded number is the floor for every later gate. If tests fail outright, STOP: the environment is wrong (check `TEST_DATABASE_URL` points at 5433), never the suite.

- [ ] **Step 2: Turn trace sampling off + rewrite its comment**

In `apps/api/src/worker.ts`, replace the config literal:

```text
    tracesSampleRate: 1,
```

with

```text
    tracesSampleRate: 0,
```

and in the file's header comment, replace the single line

```text
// request path (traces at 100% — v1 traffic is far under any cap), while the
```

with

```text
// request path (errors-only since #263 — trace sampling is OFF: every traced
// request cost CPU against the free plan's 10 ms cap, the same margin the
// public-read cache buys back; revisit only with a paid plan), while the
```

(Both find-blocks match exactly once — verify before replacing; STOP and reconcile if not.)

- [ ] **Step 3: Verify the Sentry seam suite holds (the seam's contract is untouched)**

Run: `pnpm --filter @sevendays/api test test/sentry-capture.test.ts`
Expected: PASS, unchanged count (4 tests — capture routing is SDK-free and unaffected by sampling config).

- [ ] **Step 4: Lint + typecheck + commit**

```bash
pnpm --filter @sevendays/api fix
pnpm --filter @sevendays/api typecheck
git add apps/api/src/worker.ts
git commit -m "perf(api): Sentry errors-only — trace sampling off (#263)"
```

Expected: `fix` rewrites nothing beyond the two edits; typecheck clean.

### Task 2: The read-cache seam — store, keys, TTL helpers

**Files:**
- Create: `apps/api/src/services/read-cache.ts`
- Test: `apps/api/test/read-cache.test.ts` (the unit block only — the integration describes land in Tasks 3–4)

**Interfaces:**
- Consumes: nothing new (no imports from the app yet beyond `@sevendays/db` types — none in this task).
- Produces (exact signatures Tasks 3–4 and the tests consume):
  - `export interface PublicReadStore { match(path: string): Promise<Response | undefined>; put(path: string, response: Response): Promise<void>; evict(...paths: string[]): Promise<void>; }`
  - `export function getReadCacheStore(): PublicReadStore | null` — the override if set, else the `caches.default`-backed default when the `caches` global exists, else `null` (plain Node/vitest).
  - `export function setReadCacheStore(store: PublicReadStore | null): void` / `export function resetReadCacheStore(): void` (the capture.ts registry posture).
  - `export const PUBLIC_READ_TTL_SECONDS = 60`
  - `export const READ_CACHE_KEY_ORIGIN = 'https://read-cache.sevendays.internal'`
  - `export function readCacheKey(path: string): string` — `` `${READ_CACHE_KEY_ORIGIN}${path}` ``
  - `export function toStoredResponse(response: Response): Response` — clone with `cache-control: public, max-age=60` set; the original untouched.
  - `export function responseFromCacheHit(hit: Response): Response` — fresh Response over the hit's body/status/headers with `cache-control` deleted.
  - `export function isCachedReadPath(path: string): boolean` — true for the five list paths exactly or any `/api/v1/service-packages/<slug>` continuation.

- [ ] **Step 1: Write the failing unit tests**

Create `apps/api/test/read-cache.test.ts` with the harness header and the first describe block (the integration describes are appended by Tasks 3–4 — do not write them yet):

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PUBLIC_READ_TTL_SECONDS,
  READ_CACHE_KEY_ORIGIN,
  getReadCacheStore,
  isCachedReadPath,
  readCacheKey,
  resetReadCacheStore,
  responseFromCacheHit,
  setReadCacheStore,
  toStoredResponse,
  type PublicReadStore,
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
    expect(stored.headers.get('cache-control')).toBe(
      `public, max-age=${PUBLIC_READ_TTL_SECONDS}`
    );
    expect(await stored.text()).toBe('{"ok":true}');
    // The served response keeps its body unread and carries no cache directive.
    expect(served.headers.get('cache-control')).toBeNull();
    expect(await served.text()).toBe('{"ok":true}');
    // The hit projection strips the storage directive — byte-identical wire.
    const hit = responseFromCacheHit(stored);
    expect(hit.headers.get('cache-control')).toBeNull();
    expect(hit.headers.get('content-type')).toBe('application/json');
    expect(await hit.text()).toBe('{"ok":true}');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @sevendays/api test test/read-cache.test.ts`
Expected: FAIL — `Cannot find module '../src/services/read-cache.js'` (or the equivalent resolution error).

- [ ] **Step 3: Write the seam module**

Create `apps/api/src/services/read-cache.ts`:

```ts
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
```

(The two middleware exports and the eviction map join this file in Tasks 3–4 — the module compiles without them.)

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `pnpm --filter @sevendays/api test test/read-cache.test.ts`
Expected: PASS — 5 tests (the unit describe).

- [ ] **Step 5: Lint + typecheck + commit**

```bash
pnpm --filter @sevendays/api fix
pnpm --filter @sevendays/api typecheck
git add apps/api/src/services/read-cache.ts apps/api/test/read-cache.test.ts
git commit -m "feat(api): the public-read cache seam — store, keys, TTL helpers (#263)"
```

### Task 3: The read middleware — cache the five public reads

**Files:**
- Modify: `apps/api/src/services/read-cache.ts` (add `publicReadCache`), `apps/api/src/routes/v1.ts` (mount it first)
- Test: `apps/api/test/read-cache.test.ts` (append the read-path describe)

**Interfaces:**
- Consumes: Task 2's `getReadCacheStore`, `isCachedReadPath`, `responseFromCacheHit`.
- Produces: `export const publicReadCache: MiddlewareHandler<ApiEnv>` — GET + allowlisted path + store present → `match`; hit → return the projection (the handler and `acquireDb` never run); miss → `next()`, then `put` the final response iff status is 200. Query strings and every other path bypass untouched.

- [ ] **Step 1: Write the failing integration tests**

First extend the test file's header (per the staging note in Task 2's header) — add these imports (Biome-organized: `drizzle-orm` and `@sevendays/db` above `vitest`, the helpers after the seam import) and the shared store:

```ts
import { eq } from 'drizzle-orm';
import { galleryPhotos } from '@sevendays/db';
// … existing vitest + seam imports stay …
import app from '../src/index.js';
// … existing helpers stay …
import { testEnv } from './helpers/env.js';
import { loadFixtures, loadGalleryFixtures } from './helpers/fixtures.js';

const store = fakeStore(); // shared by this and Task 4's describe
```

Then append the describe (it sets the store inside its `beforeEach`):

```ts
describe('publicReadCache (the read path)', () => {
  let gallery: Awaited<ReturnType<typeof loadGalleryFixtures>>;

  beforeEach(async () => {
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
    const unknown = await app.request(
      '/api/v1/service-packages/nope',
      undefined,
      testEnv(url)
    );
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @sevendays/api test test/read-cache.test.ts`
Expected: the three cache-behavior tests FAIL — no middleware is mounted, so `store.keys()` stays `[]` on the miss-population assertion. The no-store pass-through test passes trivially (it asserts the default posture, which is exactly what exists pre-middleware — its value is guarding the contract after). The Task 2 unit block still passes.

- [ ] **Step 3: Add the middleware and mount it**

Append to `apps/api/src/services/read-cache.ts`:

```ts
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
  if (hit) return responseFromCacheHit(hit);
  await next();
  if (c.res.status === 200) {
    await store.put(c.req.path, c.res);
  }
};
```

In `apps/api/src/routes/v1.ts`, mount it before the acquisition middleware — insert as the FIRST entry of the chain:

```ts
export const v1 = new Hono<ApiEnv>()
  .use('*', publicReadCache)
  .use('*', acquireDb)
```

with the import added alphabetically to the services import block:

```ts
import { publicReadCache } from '../services/read-cache.js';
```

and the acquisition middleware's comment extended — append ONE new comment line directly after the line `// composes with every handler.` (the last line of `acquireDb`'s comment block):

```ts
// The read cache (ADR-0025) registers BEFORE this — a cache hit returns
// without constructing the client at all.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @sevendays/api test test/read-cache.test.ts`
Expected: PASS — 9 tests (5 unit + 4 read-path).

- [ ] **Step 5: Run the FULL api suite — the floor must hold by construction**

Run: `TEST_DATABASE_URL=<local-5433-url> pnpm --filter @sevendays/api test`
Expected: baseline + 9 passed, 3 skipped, zero failures — every other suite file runs with the null store and unchanged behavior. Any failure here is a bypass bug in the middleware (a surface that should not have been cached, or a mutated response) — fix it before committing.

- [ ] **Step 6: Lint + typecheck + commit**

```bash
pnpm --filter @sevendays/api fix
pnpm --filter @sevendays/api typecheck
git add apps/api/src/services/read-cache.ts apps/api/src/routes/v1.ts apps/api/test/read-cache.test.ts
git commit -m "feat(api): read-through cache on the five public reads (#263)"
```

### Task 4: The eviction middleware — committed admin mutations invalidate

**Files:**
- Modify: `apps/api/src/services/read-cache.ts` (add the map + sweep + `adminEvictPublicReads`), `apps/api/src/routes/admin.ts` (mount after `requireSession`)
- Test: `apps/api/test/read-cache.test.ts` (append the eviction describe)

**Interfaces:**
- Consumes: Task 2–3's seam (`getReadCacheStore`), the per-request `db` from context, `@sevendays/db`'s `servicePackages` table (the sweep).
- Produces:
  - `type CachedPublicRead = 'branches' | 'service-packages' | 'gallery' | 'testimonials' | 'site-settings'`
  - `const ADMIN_MUTATION_READS: Record<string, CachedPublicRead[]>` — keyed by the admin path segment (`c.req.path.split('/')[4]`): `branches`→branches; `print-sizes`, `attires`, `service-packages`→service-packages (the trim-rule embedding — see Spec); `gallery-categories`, `gallery-photos`→gallery; `testimonials`, `testimonial-submissions`→testimonials; `site-settings`→site-settings. `media` (presign mints URLs, binds happen in entity saves), `addon-services`, `studio-services` → absent → no eviction.
  - `async function evictCachedReads(db: Database, reads: CachedPublicRead[]): Promise<void>` — best-effort, never throws; for `service-packages` evicts the list key + `/api/v1/service-packages/<slug>` for EVERY current slug (active and deactivated — a deactivated slug's cached 200 must go so the uniform 404 takes over).
  - `export const adminEvictPublicReads: MiddlewareHandler<ApiEnv>` — after `next()`: skip GET/HEAD, skip non-2xx/3xx (only committed mutations evict — the audit row's gate, M6 #185), map the segment, evict.

- [ ] **Step 1: Write the failing integration tests**

First extend the header once more (per the staging note): add the auth import and the bearer const —

```ts
import { signUpSession } from './helpers/auth.js';

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
```

Then append the describe:

```ts
describe('adminEvictPublicReads (the write path)', () => {
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
      await app.request(`/api/v1/admin/branches/${fixtures.branchA}`, { headers: bearer(token) }, testEnv(url))
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
```

(That is 4 integration tests here + 4 in Task 3 + 5 unit = **13** — the Global Constraints' pinned count.)

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @sevendays/api test test/read-cache.test.ts`
Expected: the three eviction tests FAIL — without the middleware nothing evicts, so `store.keys()` still holds the cached paths after the committed mutations. The failed-mutation test passes trivially pre-implementation (nothing evicts on a 400 with or without the middleware — its value is guarding the only-committed-writes contract after). Unit + read-path blocks still pass.

- [ ] **Step 3: Add the map, sweep, and middleware; mount**

Append to `apps/api/src/services/read-cache.ts` (add `import { servicePackages, type Database } from '@sevendays/db';` — merging into the existing import block per Biome's organizing):

```ts
// The eviction contract (ADR-0025): every COMMITTED admin mutation request
// (non-GET, 2xx/3xx — the audit row's gate, M6 #185) evicts the public
// reads its entity feeds. The package family spans three admin segments:
// the public package read EMBEDS print sizes and attires (the trim rules),
// so a print-size or attire mutation changes package responses too — all
// three sweep the list key + every current slug's detail key. Renamed-away
// or deleted slugs' stale entries are unenumerable (the Cache API has no
// list) — they age out via TTL (≤60 s, ADR-0025's documented bound).
export type CachedPublicRead = 'branches' | 'service-packages' | 'gallery' | 'testimonials' | 'site-settings';

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

export async function evictCachedReads(
  db: Database,
  reads: CachedPublicRead[]
): Promise<void> {
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
  const reads = ADMIN_MUTATION_READS[segment];
  if (!reads) return;
  await evictCachedReads(c.get('db'), reads);
};
```

In `apps/api/src/routes/admin.ts`, mount it directly after the session gate (the gate's 401 short-circuits before this middleware ever runs):

```ts
export const admin = new Hono<ApiEnv>()
  .use('*', requireSession)
  .use('*', adminEvictPublicReads)
```

with the import added alphabetically:

```ts
import { adminEvictPublicReads } from '../services/read-cache.js';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @sevendays/api test test/read-cache.test.ts`
Expected: PASS — 13 tests (5 unit + 4 read-path + 4 eviction).

- [ ] **Step 5: Run the FULL api suite — the floor holds**

Run: `TEST_DATABASE_URL=<local-5433-url> pnpm --filter @sevendays/api test`
Expected: baseline + 13 passed, 3 skipped, zero failures (every admin suite runs with the null store — `evictCachedReads` returns immediately, no sweep query).

- [ ] **Step 6: Lint + typecheck + commit**

```bash
pnpm --filter @sevendays/api fix
pnpm --filter @sevendays/api typecheck
git add apps/api/src/services/read-cache.ts apps/api/src/routes/admin.ts apps/api/test/read-cache.test.ts
git commit -m "feat(api): admin-mutation eviction of the public read cache (#263)"
```

### Task 5: ADR-0025 + docs rotation + the repo gates

**Files:**
- Create: `docs/adr/0025-api-public-read-edge-cache.md`
- Modify: `docs/progress.md`, `AGENTS.md`

**Interfaces:**
- Consumes: everything Tasks 1–4 landed.
- Produces: the ADR future sessions cite; the docs rotation AGENTS.md mandates.

- [ ] **Step 1: Write ADR-0025** (follow `docs/adr/0023-*.md`'s section shape — Status/Context/Decision/Alternatives Considered/Consequences; Date: 2026-11-11; title: "ADR-0025: Read-through edge cache on the API's public catalog reads"). The rulings, verbatim from this plan — the ADR's prose expands around them but invents nothing new:

  - **Context:** the measured CPU facts (fresh connect 7.3–12.4 ms vs the 10 ms free-plan cap; warm 0.3–0.8 ms; live median at the cap; the Supavisor degradation episodes + the 2026-11-09 P0), the Hyperdrive failure + revert (#260/#261/#262 — ADR-0024 burned), and the owner's free-plan-until-handover ruling (2026-11-11).
  - **Decision:** a read-through cache at the API's service layer over the five public reads, ABOVE ADR-0011's per-request client (they compose). Storage = the Workers Cache API (free, no daily caps, per-colo) under the synthetic key origin `https://read-cache.sevendays.internal`; stored copies carry `Cache-Control: public, max-age=60` (TTL = the correctness backstop; 60 s = the top of the owner's 30–60 s range — fewest dials); served responses carry no cache directives (miss and hit are byte-identical on the wire). Only GET, only the five allowlisted surfaces, only query-string-free requests, only 200s. The seam is injectable and null under plain Node/vitest (the capture.ts posture).
  - **The invalidation contract:** every committed admin mutation request (non-GET, 2xx/3xx — the audit row's gate) evicts per the segment map; the package family spans `service-packages` + `print-sizes` + `attires` (the public package read embeds both lookups — the trim rules) and sweeps the list key + every current slug's detail key; `media` presign binds nothing (binds live inside entity saves); never-cached list (appointments, `/api/v1/admin`, the submissions POST, auth). Best-effort throughout: cache I/O never fails a request; the TTL covers cross-colo misses (delete is colo-local), eviction failures, and renamed/deleted slugs' unenumerable stale entries (≤60 s bound — the documented edge).
  - **Alternatives:** Hyperdrive (blocked on the CF platform episode — composes later UNDER this cache when it re-lands), KV (1 k writes/day free cap — eviction traffic would breach it), a Durable Object connection broker (building private Hyperdrive), PostgREST/supabase-js reads (ADR-0007/0009 one-data-path law), caching in the frontends (each frontend duplicates; the API is the one choke point).
  - **Consequences:** cache-hit requests make no DB dial (CPU to the ~1 ms class; degradation episodes stop being user-visible on the public site); the studio-services/addon-services public reads stay uncached by the brief's five-surface fence (a one-line-per-surface follow-up); ADR-0011's client is untouched.

- [ ] **Step 2: Rotate `docs/progress.md`** — append a dated bullet to the "What Exists" api section (after the Analytics Dashboard bullet, the 2026-11-09 pattern):

```markdown
- The api's **public-read edge cache** is live (2026-11-11, #263 — ADR-0025): the five public catalog reads (branches, service-packages list + detail, gallery, testimonials, site-settings) serve read-through from the Workers Cache API (60 s TTL backstop, per-colo), committed admin mutations evict their entity's entries on commit (the package family sweeps every slug detail — package reads embed print-sizes/attires), cache I/O is best-effort and never fails a request, and the seam is null under plain Node so every vitest suite runs uncached unchanged (+13 seam tests, `test/read-cache.test.ts`). The api's Sentry moved to errors-only the same day (trace sampling off — the 10 ms-cap CPU margin). Hyperdrive stays blocked on the CF platform episode (#260); when it re-lands it composes UNDER this cache.
```

- [ ] **Step 3: Amend `AGENTS.md`** — two surgical edits: (a) in the Engineering Rules paragraph, insert ONE sentence into the long "DB is provisioned" paragraph, directly after the sentence ending "a deploy without `SENTRY_DSN` serves everything with captures no-op." and before "The Audit Log's write side is live (M6 #185)":

```markdown
The api's public catalog reads are edge-cached since #263 (ADR-0025 — read-through over the Workers Cache API, 60 s TTL backstop, committed admin mutations evict; the null-store default keeps every vitest suite uncached), and its Sentry is errors-only (traces off, the CPU-cap margin).
```

  (b) in "Current status of `pnpm test`", extend the api floor line's enumeration (the parenthetical after "the two email-purpose event pins") with: ` + #263's thirteen read-cache seam pins` and update the count `433 passed + 3 skipped` → the Task-1-baseline-plus-13 figure actually recorded at the Task 5 gate (use the number the full run prints — do not estimate).

- [ ] **Step 4: The full repo gates**

```bash
pnpm check
pnpm build
```

Expected: `pnpm check` green — api at baseline + 13, admin 26 files / 262, landing 16 files / 123, api-client 45 (floors from AGENTS.md; the api count is the only one that moves, +13). `pnpm build` green. If any floor moved unexpectedly, reconcile before committing — never loosen.

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0025-api-public-read-edge-cache.md docs/progress.md AGENTS.md
git commit -m "docs(api): ADR-0025 + the #263 rotation (#263)"
```

### Task 6: Deploy, the live CPU battery, PR, close

**Files:** none (operations + issue/PR work)

**Interfaces:**
- Consumes: the merged-to-be branch from Tasks 1–5.
- Produces: the deployed cache, the measured battery evidence, the PR, the v1-picks ledger row, the closed issue.

- [ ] **Step 1: Deploy the api**

```bash
pnpm --filter @sevendays/api deploy
```

Expected: clean deploy (no config change — `caches.default` needs no binding). Note the deployed URL: the workers.dev route for `sevendays-api` (from the deploy output).

- [ ] **Step 2: Run the CPU battery under `wrangler tail`**

In one shell (background, output to a gitignored path — `.scratch/` is gitignored):

```bash
wrangler tail --format json --name sevendays-api | tee .scratch/263-tail.jsonl
```

In another, 30 mixed reads against the deployed base (`$API` — the URL from Step 1) — five keys × several passes plus one detail (first fetch the list, take a slug from the response):

```bash
API=<deployed-base>
for pass in 1 2 3 4 5 6; do
  for path in branches service-packages gallery testimonials site-settings; do
    curl -s -o /dev/null "$API/api/v1/$path"
  done
done
slug=$(curl -s "$API/api/v1/service-packages" | jq -r '.[0].slug')
for i in 1 2 3 4 5; do curl -s -o /dev/null "$API/api/v1/service-packages/$slug"; done
# then stop the tail (Ctrl-C or kill)
```

Then the histogram (the #260 battery's method — `cpuTime` rides the tail JSON's per-request events; if the field is absent from this wrangler version's JSON, fall back to `wrangler tail --format pretty` and its per-request CPU lines — record which was used):

```bash
jq -r '.cpuTime' .scratch/263-tail.jsonl | sort -n | awk '{a[NR]=$1} END {print "n="NR, "min="a[1], "p50="a[int(NR/2)], "max="a[NR]}'
jq -r '.outcome' .scratch/263-tail.jsonl | sort | uniq -c
```

Expected: every outcome `ok` (zero kills/canceled); cpuTime bimodal — the first request per key near the historic ~10 ms (the dial), the 29 cache-hit requests in the ≈1–2 ms class. Any cache-hit request ≥5 ms or any non-ok outcome: investigate before proceeding (a likely bypass — check the path landed on the allowlist).

- [ ] **Step 3: Read-your-writes spot-check (owner-assist if no admin session at hand)**

Through the admin (or a session-tokened PUT against any admin entity, e.g. rename a gallery category back), verify the public read reflects the change on the NEXT request (not after 60 s), then revert. If executed without admin credentials, hand this step to the owner with the exact expectation.

- [ ] **Step 4: Push, PR, ledger, close**

```bash
git push -u origin feat/263-api-public-read-edge-cache
gh pr create --title "feat(api): edge-cache the public catalog reads — cut the per-request DB dial (#263)" --body-file .scratch/263-pr-body.md
```

The PR body carries: the measured before/after battery numbers (Step 2), the ADR link, the task list, and the floors. After review + squash-merge to main: `pnpm --filter @sevendays/api deploy` once from main (byte-identical rebuild — confirms the merged tree deploys clean), then run the v1-picks classification per `docs/agents/v1-picks.md` (expected pick-eligible — pure api perf, zero booking coupling, no wire change — but classify by the runbook, and note the Sentry errors-only change rides the same merge). Append the ledger row. Then post the battery summary as a closing comment on #263 (with the `> *This was generated by AI during triage.*` disclaimer), tick the brief's acceptance boxes `- [✅]`, close the issue, `git checkout main && git pull`, and refresh the graph:

```bash
graphify update .
git add graphify-out/
git commit -m "chore(graphify): post-#263 graph update"
```

---

## Self-Review (recorded at plan time)

1. **Spec coverage:** brief's acceptance criteria → five-reads-cached-on-hit (Task 3 + battery Step 2), byte-identical hit-vs-miss (Task 3 test 1), admin eviction + read-your-writes (Task 4 + battery Step 3), uncached-paths byte-identical (Task 3 Step 5 full-suite gate — no wire change exists to differ), Sentry errors-only (Task 1), ADR-0025 + docs rotation (Task 5), `pnpm check`/`build` floors (Tasks 3/4/5 gates), post-deploy battery (Task 6 Step 2), v1 classification (Task 6 Step 4). The brief's "no DB dial on hit, provable via tail" — the battery's cpuTime histogram is that proof; the middleware structure (return before `next()`) makes it structural.
2. **Type consistency:** `PublicReadStore`'s three methods match across Task 2's interface, default store, and the fake; `publicReadCache`/`adminEvictPublicReads` are `MiddlewareHandler<ApiEnv>` in both definition and mounts; `evictCachedReads(db, reads)`'s `CachedPublicRead[]` matches the map's value type; the test file imports only symbols Tasks 2–4 define.
3. **Recount:** 5 + 4 + 4 = 13 tests; the three gate references (Task 3 Step 4 "9", Task 4 Step 4 "13", Global Constraints "13") agree; floor deltas are expressed as baseline + N, never an absolute that the baseline step would invalidate.
4. **Mocked-boundary re-derivation:** the fake store's `put` snapshots `response.clone().text()` (the seam hands it the live `c.res`; the default store — not the fake — owns the TTL rewrite, so no test asserts max-age on the fake's entries); `match` builds a fresh Response per call because bodies are single-use; the admin requests carry both `bearer(token)` and `content-type` on every mutating call (the GETs need only the bearer).

