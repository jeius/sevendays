# Research #282 — Gallery thumbnail serving without per-image session-gated round trips

Branch: `research/thumb-serving` (findings-only; no production code changed). Ticket: #282. Map: #279 (owner rulings 2026-11-14).

## The problem, precisely

Every `<img>` in the admin gallery grid (`apps/admin/src/components/gallery/gallery-screen.tsx:228`) points at the thumb proxy (`apps/admin/src/routes/api/admin/gallery-photos/$id.thumb.ts`), which forwards the incoming cookie through the session-scoped client (`apps/admin/src/lib/api.server.ts:78`) over the service binding to the API's `GET /api/v1/admin/gallery-photos/:id/thumb` (`apps/api/src/routes/gallery-photos.ts:57`), which sits under `requireSession` and runs `servePhotoThumbnail` (`apps/api/src/services/media.ts:194`): one DB read (`r2Key` by id) + one R2 `get` + one Images-binding transform (400px WebP). So a grid of N photos = N session verifications + N DB reads + N R2 reads + N transforms — on **every grid render with an empty HTTP cache**, and the proxy deliberately adds no cache headers (the #136 agent ruling carried in the comment at `$id.thumb.ts:5-6`). Browsers send the session cookie on each of those N same-origin image requests.

## Recommendation — ONE mechanism

**Versioned immutable thumb URLs + browser private caching on the proxy.** Keep the exact request path and the exact auth model; make the *URL* the cache key and the *response* privately cacheable for a year.

### Cache-key design

```
/api/admin/gallery-photos/:id/thumb?v=<updatedAt epoch-ms>
```

- `v` is derived from `photo.updatedAt`, which is **already on the admin wire** (`galleryPhotoSchema`, `packages/types/src/gallery.ts:45`) — zero API change, zero new wire surface.
- `updatedAt` is bumped in the same `UPDATE` that swaps `r2Key` on replace (`apps/api/src/services/admin-gallery.ts:449-455`), so it is a faithful content version for the thumb.
- The server never reads `v`: the TanStack server-route handler matches on path only, so `?v=` flows through unvalidated and is ignored — it exists purely so a version change = a different URL = a browser cache miss. No RPC/client signature changes anywhere (`packages/api-client/src/routes/admin.ts:478` untouched).
- Global-bust escape hatch: if the transform spec ever changes (`THUMBNAIL_WIDTH_PX`, output format), rename the param (`v` → `v2`) — a one-line client change that orphans every cached entry deliberately. Document this beside the helper.
- Strict variant (optional, not recommended first): expose a `photoVersion` field derived from the `r2Key` UUID in `toPhotoRead` (`apps/api/src/services/admin-gallery.ts:300`). Zero false positives (see trade below) at the cost of a new wire field in `packages/types` + the read assembly. Take it only if the false-positive refetches below ever measure as annoying.

### Headers

On the proxy's 2xx passthrough (`$id.thumb.ts:25-30`):

```
Cache-Control: private, max-age=31536000, immutable
```

- `private` — browser-only storage; shared/proxy caches must not store it. This is MDN's stated posture for post-login, cookie-session responses, and it matches the map ruling's "browser private caching" wording exactly. (No `Vary: Cookie` needed: the versioned URL is the discriminator, not the cookie.)
- `max-age=31536000, immutable` — the URL is versioned, so the bytes at that exact URL never change; `immutable` additionally suppresses conditional revalidation on reload in supporting browsers. Browsers that don't recognize the directive ignore it and at worst revalidate — never a correctness issue, because the versioned URL is the invalidation mechanism, not the header.
- Error arms (401/404/502 JSON in the proxy): add `Cache-Control: no-store` so failures are never heuristically cached.
- No `Set-Cookie` is possible on the passthrough (the proxy constructs a fresh `Response` with only `content-type` today) — nothing inhibits caching. Keep it that way: do not start copying upstream headers wholesale.
- Alternative placement — the API could set the policy via the binding's `.response({ headers })` (the Cloudflare binding docs recommend exactly this) — but the browser only ever sees the proxy's response and the service-binding hop caches nothing, so the proxy is the single client-facing cache-policy owner. One header site, not two.

### Invalidation-on-re-upload proof (old thumbs structurally unreachable)

1. Replace is `PUT /api/v1/admin/gallery-photos/:id` with `r2Key` present → `commitStagingKey` → `commitUpload` promotes to **`gallery/<crypto.randomUUID()>.jpg`** — a fresh UUID every time, never an in-place overwrite (`apps/api/src/services/media.ts:177`; ADR-0019 "keys are immutable").
2. The same DB transaction writes `r2Key = finalKey` **and** `updatedAt = new Date()` (`admin-gallery.ts:449-455`); the old object is deleted only after the update + audit row commit (`admin-gallery.ts:470-472`).
3. Own-mutation invalidation (the ruled warm/cold contract) refetches the photos query → the wire now carries the new `updatedAt` → the grid re-renders `src` with the new `?v` → browser cache miss → proxy → API reads the row, which already points at the new key → transform of the NEW object.
4. The old URL can never be re-derived: it required the pre-replace `updatedAt`, which the same UPDATE overwrote. And if a stale tab requests it anyway, the origin object is deleted, so `servePhotoThumbnail` returns null → 404. The only surviving copy of the old bytes is a browser-private cache entry under a URL that no code path can ever emit again — acceptable per the ruling (client photos on staff devices).
5. Stale-tab window: a tab holding pre-reupload data shows the old thumb until its bounded-SWR refetch lands — inside the already-ruled warm/cold contract, not new staleness.

**Trade (disclosed):** `updatedAt` also bumps on metadata-only edits and on reorder (`setGalleryPhotoOrder` bumps every moved row, `admin-gallery.ts:492`), so those cause an unnecessary thumb refetch — correct, never stale, bounded by mutation frequency. The strict `photoVersion` variant eliminates this if it ever matters.

### File-level touch points

1. `apps/admin/src/routes/api/admin/gallery-photos/$id.thumb.ts` — add the `cache-control` header on the 2xx Response; `no-store` on the three error arms; rewrite the ruling comment (the #136 "no cache headers" agent ruling is superseded by the 2026-11-14 map #279 ruling).
2. `apps/admin/src/components/gallery/gallery-screen.tsx:227-232` — `src` gains `?v=${thumbVersion(photo)}`; add `decoding="async"` beside the already-present `loading="lazy"`.
3. New lib seam, house pattern: `apps/admin/src/lib/gallery-thumb.ts` exporting `thumbSrc(photo: GalleryPhoto): string` (with the param-rename escape hatch documented) + `gallery-thumb.test.ts` pinning: stable for unchanged `updatedAt`, changes when `updatedAt` changes, survives the admin lib-seam suite conventions (plain node, no DOM).
4. `apps/api` — untouched. `packages/types` — untouched (minimal variant). `packages/api-client` — untouched.

### What it does to the N-request flood

- **Warm revisit (the dominant staff-CMS pattern): 0 network requests.** All N thumbs serve from the browser's private disk cache — no cookies on the wire, no admin-Worker invocations, no service-binding subrequests, no session verifications, no DB reads, no R2 reads, no transforms. The 60s-staleTime data refetches keep running and cost nothing for images (URLs unchanged).
- **Cold first view: unchanged N**, already trimmed to viewport by `loading="lazy"` (seated at `gallery-screen.tsx:231`); `decoding="async"` additionally keeps decode off the critical path. The remaining cold-path session-verify + DB-read cost per request is exactly what the map's *separate* session-amortization ruling (token-hash→session cache, 60s TTL) addresses — the two rulings compose: browser cache kills repeat traffic, the session cache cheapens what remains.
- **Reload:** `immutable`-honoring browsers revalidate nothing; others revalidate/refetch at most today's behavior (the API thumb response carries no `ETag`/`Last-Modified`, so conditional requests wouldn't 304 today anyway — adding validators is optional future work, unnecessary once URLs are versioned). Hard reload bypasses cache = today's N fetches.

## Options investigated and rejected

### 1. Cache-Control without URL versioning
`private, max-age` on the unversioned `/thumb` URL would cache per-id — but a re-upload keeps the same id and URL, so a staff device would show the OLD thumb out of `max-age`'s window with no eviction hook (exactly why #136 ruled "no cache headers"). Violates "old thumbs must never be shown". Dead on arrival; versioning is the missing half that makes caching safe.

### 2. `loading="lazy"` / `decoding="async"` alone
Already half-seated (`loading="lazy"` at `gallery-screen.tsx:231`). Worth finishing (`decoding="async"`), but it only trims the cold burst to the visible viewport; every scroll still pays session+DB+transform per newly-visible photo, and revisits pay everything again. Baseline mitigation, not the mechanism.

### 3. Cloudflare Images direct-serve (bypass the proxy)
Rejected on three independent grounds, each pinned to primary docs:

- **The binding cannot deliver.** The Images binding is a transform pipeline over bytes it is handed — "Responses from the Images binding are not automatically cached", delivery is your Worker returning the Response (developers.cloudflare.com/images/transform-images/bindings/). There are no "binding variant URLs" to point an `<img>` at; the category doesn't exist.
- **Variant/delivery URLs (`imagedelivery.net/<account>/<id>/<variant>`) belong to Images-hosted uploads**, not R2 objects — a second store and a second upload path, contradicting ADR-0019's one-bucket topology. Their privacy mechanism (signed URLs: per-account HMAC-SHA256 over `exp` + path, `sig` appended — developers.cloudflare.com/images/optimization/hosted-images/serve-private-images/) applies to hosted delivery only.
- **`/cdn-cgi/image/...` URL transformations** (the R2-custom-domain route) require the source on a zone with transformations enabled — i.e. the ship-time `media.<domain>`, not today's r2.dev — are public by default with **no signing mechanism** (the docs' own mitigation is "restrict access via Workers in front"), and their optimized variants are cached on Cloudflare's shared CDN with a one-hour minimum and no individual purge (developers.cloudflare.com/images/transform-images/transform-via-url/). That moves staff-gated bytes (including deactivated photos — the thumb route is today the *only* session-gated media path; the grid deliberately never renders `photoUrl`) onto a shared public CDN — a privacy-posture change requiring an owner ruling, and it saves nothing over browser private caching for warm visits.

Revisit trigger: if the ship-time `media.<domain>` ever wants *landing-side* public thumbnails, `/cdn-cgi/image/` is the already-planned M6+ seam (ADR-0019 #6) — that is the public-read surface, not the admin gate.

## Cost notes from the docs (why the flood matters less than it looks, but still matters)

- Images-binding billing: "each unique combination of source image and parameters is billed only once per calendar month" — repeated transforms of the same photo are free (bindings doc). The flood's real cost is latency (PH→SG DB hop per request, per ADR-0011's per-request client), session-verify queries, and Worker CPU/invocations — all of which the browser cache eliminates for warm visits.
- The R2 objects already carry `public, max-age=31536000, immutable` from the commit contract (`media.ts:40,179`) — the immutability posture on the origin side has been in place since #136; this research extends it across the last hop.

## Standing rulings honored

- Map #279 (2026-11-14): "Thumbnail privacy: browser private caching + immutable versioned URLs for thumbs are acceptable (client photos on staff devices)" — the mechanism is exactly this, and nothing broader (no shared-CDN bytes).
- ADR-0019: keys immutable / replace = new key + delete; raw keys never leave the API (the `?v=` design leaks nothing — `updatedAt` is already on the wire).
- The #136 "no cache headers on the thumb" agent ruling is **superseded** by the map ruling above; its comment block must be rewritten in the implementation.

## Primary sources

- MDN `Cache-Control` (`private`, `immutable`, freshness/revalidation): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- Cloudflare Images binding (20 MB input, not auto-cached, unique-transform billing, transform-not-deliver): https://developers.cloudflare.com/images/transform-images/bindings/
- Cloudflare transform via URL (zone requirement, public by default, no signing, 1h-min CDN cache, purge semantics): https://developers.cloudflare.com/images/transform-images/transform-via-url/
- Cloudflare Images signed URLs (hosted delivery only, HMAC-SHA256 `exp`/`sig`, per-account key): https://developers.cloudflare.com/images/optimization/hosted-images/serve-private-images/
- Repo: ADR-0019, `docs/media-bucket-runbook.md`, `apps/api/src/services/media.ts`, `apps/api/src/services/admin-gallery.ts`, `apps/api/src/routes/gallery-photos.ts`, `apps/admin/src/routes/api/admin/gallery-photos/$id.thumb.ts`, `apps/admin/src/lib/api.server.ts`, `apps/admin/src/components/gallery/gallery-screen.tsx`, `packages/types/src/gallery.ts`, `packages/db/src/schema/gallery-photos.ts`, `packages/api-client/src/routes/admin.ts`.
