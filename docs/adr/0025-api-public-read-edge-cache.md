# ADR-0025: Read-through edge cache on the API's public catalog reads

**Status:** Accepted
**Date:** 2026-11-11

## Context

The api's public catalog reads dial the Supabase database on every request through ADR-0011's per-request `postgres.js` client, and every fresh connection costs real CPU: the measured fresh-connect cost is **7.3–12.4 ms of CPU against the Workers free plan's 10 ms-per-request cap** (a warm request is 0.3–0.8 ms), and the live median sits at the cap. The public reads are the site's hottest surface — they are what a visitor's page load strikes — so the cap is being lived at, not under. Worse, the connection path has an availability story: the Supavisor pooler degradation episodes, including the **2026-11-09 P0**, turn the per-request dial into user-visible slowness on exactly the pages that must never be slow.

The first attempt at relief, Hyperdrive (#260), was blocked by a Cloudflare platform episode and reverted (#261/#262 — **ADR-0024 is burned** in history; this document takes 0025). Meanwhile the owner has ruled (2026-11-11) that the deployment **stays on the free plan until handover**, so the fix must be free-tier-native: no paid product, no daily-capped free tier that eviction traffic could breach.

## Decision

**A read-through cache at the API's service layer over the five public reads, ABOVE ADR-0011's per-request client — the two compose.** The five surfaces are branches, service-packages (list + detail), gallery, testimonials, and site-settings. A cache hit short-circuits before `acquireDb` even constructs the per-request client (the middleware mounts first on the v1 chain); a miss falls through to the unchanged read path. ADR-0011's client is untouched.

**Storage is the Workers Cache API** — free, no daily caps, per-colo — under the synthetic key origin `https://read-cache.sevendays.internal`. Stored copies carry `Cache-Control: public, max-age=60`; **served responses carry no cache directives** — a miss and a hit are byte-identical on the wire. The TTL is the **correctness backstop**, not the freshness policy, and 60 s is the top of the owner's 30–60 s range — fewest dials. Only GET, only the five allowlisted surfaces, only query-string-free requests, only 200s are stored or served; everything else (appointments, `/api/v1/admin`, auth, the submissions POST) passes through untouched.

**The seam is injectable and null under plain Node/vitest** (the `observability/capture.ts` posture): the default store resolves to `caches.default` under workerd and to null everywhere else, so every existing suite runs uncached and unchanged — the test floors hold by construction.

### The invalidation contract

Every **committed admin mutation request** (non-GET, 2xx/3xx — the audit row's gate, M6 #185) evicts per the entity→read segment map. The **package family spans `service-packages` + `print-sizes` + `attires`** — the public package read embeds both lookups (the trim rules), so a print-size or attire mutation changes package responses too — and sweeps the list key plus **every current slug's detail key**. The `media` presign binds nothing (binds live inside entity saves). Never-cached: appointments, `/api/v1/admin`, the submissions POST, auth.

The contract is **best-effort throughout**: cache I/O never fails a request. The TTL covers what eviction cannot — cross-colo misses (`delete` is colo-local), eviction failures, and the renamed/deleted slugs whose stale detail entries are unenumerable (the Cache API has no list) — a **≤60 s bound, the documented edge**.

## Alternatives Considered

- **Hyperdrive** — the right product shape, but blocked on the CF platform episode that killed #260 and forced the #261/#262 revert. When it re-lands it composes **UNDER** this cache (connection acceleration behind the edge hit), not instead of it.
- **Workers KV** — the free tier caps writes at 1 k/day; eviction traffic alone would breach it.
- **A Durable Object connection broker** — building private Hyperdrive, one ownership class heavier, on the same free plan.
- **PostgREST / supabase-js reads bypassing the api** — breaks the ADR-0007/0009 one-data-path law: the DB is reached through `packages/db` behind the api, full stop.
- **Caching in the frontends** — each frontend would duplicate the policy and the invalidation problem; the API is the one choke point both editions already share.

## Consequences

- **Cache-hit requests make no DB dial** — their CPU drops to the ~1 ms class, and Supavisor degradation episodes stop being user-visible on the public site: a colo holding a fresh copy serves regardless of the origin's connection health.
- **The studio-services/addon-services public reads stay uncached** by the brief's five-surface fence — a one-line-per-surface follow-up extends the allowlist if the owner wants them.
- **ADR-0011's per-request client is untouched** — misses behave exactly as before; the cache adds a front door, it does not remodel the house.
- A hit re-stamps the echoed `x-request-id` with the serving request's id (the stored body replays the populating request's), so log correlation stays per-request.
- The seam's null default means the vitest graph never touches the Cache API — no workerd-only globals in tests, and the floors move only when seam tests themselves are added (#263 adds thirteen, `test/read-cache.test.ts`).
