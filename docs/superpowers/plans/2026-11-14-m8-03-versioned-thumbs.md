# M8 ticket 03 — Versioned immutable gallery thumbnails — implementation plan

**Goal:** A warm gallery grid makes zero network requests. The admin's gallery grid (and its editor preview) request thumbnails through a tiny client-side builder — `apps/admin/src/lib/gallery-thumbs.ts` — that appends the photo's last-updated timestamp as a version query parameter (`/api/admin/gallery-photos/<id>/thumb?v=<updatedAt epoch ms>`); the field already rides the admin wire (`galleryPhotoSchema.updatedAt`), so no API or shared-schema change exists anywhere. The admin-local thumb proxy (`apps/admin/src/routes/api/admin/gallery-photos/$id.thumb.ts`) answers 2xx with `Cache-Control: private, max-age=31536000, immutable` and `no-store` on every error arm — superseding the #136 no-cache ruling with a dated note appended to ADR-0019's Amendments. Invalidation is structural and already live: the ADR-0019 replace flow mints a fresh storage key and bumps `updatedAt` in the same transaction, the old object deleted post-commit (suite-pinned), so a replaced photo's URL can never collide with a cached one and the old object URL 404s at origin. Grid images gain `decoding="async"`; lazy-loading stays. Admin-local only — the api is untouched. Ticket #287 (spec § D3).

**Spec:** `docs/specs/2026-11-14-m8-admin-cms-latency-spec.md` (§ D3), ratified 2026-11-14 (grill #284). Inputs: the #282 research verdict (distilled into spec § D3 — no separate durable record to chase), ADR-0019 (the media topology the replace flow rides), the #136 no-cache ruling being superseded (its durable record is the proxy route's header comment, rewritten in Task 3, plus the dated ADR-0019 amendment in Task 4). Executed against existing issue **#287** — no new execution issue.

**Architecture:** one new admin lib seam + one route edit + two img-site edits in one component + their tests + one ADR amendment + one progress bullet. Touched files: `apps/admin/src/lib/gallery-thumbs.ts` (new), `apps/admin/src/lib/gallery-thumbs.test.ts` (new), `apps/admin/src/routes/api/admin/gallery-photos/$id.thumb.ts` (the cache law), `apps/admin/src/components/gallery/gallery-screen.tsx` (the two img sites + the import), `docs/adr/0019-r2-media-topology.md` (the dated supersession note), `docs/progress.md` (one What-Exists bullet), this plan file. No api files, no api-client files, no schema, no routes, no landing.

**Not UI-bearing (spec #94 amendment):** this ticket names no UI/UX skill set and renders no variants — the milestone's ruling is "touches only time, not pixels" (spec § user story 20). The component edits rewire an `img`'s `src` through the builder and add the `decoding="async"` hint: zero visual delta (same proxy path, same layout, same tokens), so there is no new composition for the owner to react to.

## Global Constraints

- Branch `m8/03-versioned-thumbs` off current `main` (at `3ed42bb` or later). Per-task commits with the subjects pinned per task, each ending `(#287)` — the one house exception is Task 7's ledger row, which follows the `docs(v1-picks): #287 ledger row - …` shape (the #285/#286 precedent); the squash-merge appends the PR number.
- Gates: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green **35/35** with the floors byte-identical to the values this plan pins: **admin 29 files / 304** (the before-floor 28 files / 299 moves by exactly the 5 tests in `lib/gallery-thumbs.test.ts` — 3 URL-builder + 2 cache-law, enumerated in Task 2); **api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped**; types 18 files / 188; db 4 files (2 + 2 skipped) / 22 passed + 8 skipped; api-client 5 files / 45; landing 17 files / 134. A different moved count means the enumeration drifted: stop and reconcile against the test blocks, never by padding. (`pnpm build:packages` on a fresh clone before check — the shared client resolves the API's `AppType` from built `dist/`; this plan changes no route, so `AppType` is untouched, but the standard fresh-clone `pnpm --filter @sevendays/api build` still runs.)
- **Deploy through CI only.** The push to main fires `Deploy admin (sevendays-admin)` in the `Deploy teaser (main)` run — **that leg is the one this ticket's change rides**; the `Deploy api (sevendays-api)` leg also fires and must go green (it deploys unchanged code). **Never run any local bare `wrangler deploy`** — the #263/#264 lesson (it wipes the CI-passed `--var`s; the only restore is `gh run rerun <merge-run-id>`).
- **Live-probed pins (2026-11-14 @ `3ed42bb` — current `main` HEAD; read from the installed sources, not memory).** Do not "improve" any of these from memory; the pinned value is the probed value:
  - **`updatedAt` rides the admin wire today:** `packages/types/src/gallery.ts` — `galleryPhotoSchema` (the admin read) carries `updatedAt: z.coerce.date()`; `apps/api/src/services/admin-gallery.ts` `toPhotoRead` spreads the full DB row (only `r2Key` is stripped), so the admin list/get responses carry it. No API, db, or types change exists or is wanted.
  - **The replace flow is already the structural invalidation:** `updateAdminGalleryPhoto` (`apps/api/src/services/admin-gallery.ts:424`) — a present `r2Key` commits to a FRESH final key, the row update (fresh key + `updatedAt: new Date()`) and audit row commit in one transaction, and the old object is deleted only after that commit; suite-pinned at `apps/api/test/admin-gallery.test.ts:379` ("PUT with a new r2Key replaces the photo — new final key in the row, the OLD object deleted after"). This ticket adds no replace machinery — it exploits this flow as the version source.
  - **The proxy's try-success arm is 2xx by construction:** `thumbResponse` (`packages/api-client/src/routes/admin.ts:478`) is the BINARY seam — a non-2xx upstream THROWS `ApiClientError` via `unwrapError`; the raw `Response` returns only on `res.ok`. So the success arm unconditionally gets the immutable header and the three catch arms unconditionally get `no-store` — no status classification helper is wanted.
  - **Dates cross the admin server-fn boundary as real `Date` instances:** house-proven by existing client-side consumption — `apps/admin/src/lib/users-state.ts:86` (`b.createdAt.getTime()` over wire session rows) and `apps/admin/src/lib/submissions-state.ts:79` (`row.createdAt.toLocaleDateString(...)` over wire submission rows); the serializer note at `apps/admin/src/lib/admin.functions.ts:157` states "the runtime payload is still JSON + Dates". `thumbUrl` may call `.getTime()` on the wire row directly; no string-tolerance shim is wanted.
  - **`updatedAt` bumps on EVERY photo PUT** — metadata-only saves included (`admin-gallery.ts:455` sets `updatedAt: new Date()` unconditionally). A caption edit therefore changes `?v=` and costs exactly one thumb refetch. That is the designed trade (timestamp versioning, not content hashing), stated in the ADR-0019 amendment and the progress bullet — never "fixed" by hashing content client-side.
  - **The Cache-API `private` lesson does NOT apply here:** ADR-0025/#286's public-container rule governs `caches.default.put` containers (the Cache API rejects `cache-control: private` on puts). The thumb proxy just RETURNS a `Response` to the browser — no Cache API call exists on this path — so `private` is correct and load-bearing: session-gated bytes must never enter a shared cache (Cloudflare's edge included). Do not "fix" the header to `public` off the #286 lesson.
  - **No `Vary` header is wanted** (a natural reviewer question): the response varies by nothing the cookie changes — the URL itself versions the content, and auth failures answer `no-store` and are never 2xx; `Vary: Cookie` would defeat browser caching of a session-gated resource.
  - **The `?v=` query param never reaches the upstream:** the proxy's upstream call passes `{ param: { id } }` alone (unchanged); the param is browser cache-key shaping only. Do not forward it.
- **No new secret, no wrangler config change, no env var** — the lever is headers + URLs on existing bindings.
- **The after-verification is HITL (Task 6):** the owner performs the devtools walk on the deployed teaser admin (never ask for credentials, never assume while the owner may be AFK). If the owner is unavailable after Task 5, post nothing, leave #287 open naming the pending check, and stop — do not self-serve the verification. The structural half (old object 404s at origin) is verified by citation: the api suite pin above — there is NO staff-facing replace UI (the editor deliberately never sends `r2Key`, AR-6), so the ticket's "re-upload" acceptance box is ticked on the citation + the live version-param check, recorded explicitly in the evidence comment.
- **AGENTS.md's admin floor line still reads 27/296** (the #286 deferred minor — the real floor is 28/299 before this ticket, 29/304 after). The floors in this plan pin ACTUAL values; the AGENTS.md line stays fenced out (Not here) per the #286 ruling — its own update path sits with #289's closeout.
- **The M8 plan.md box for this ticket stays unticked** (`docs/plan.md` "Versioned immutable gallery thumbnails… (#287)") — all five M8 boxes flip at #289 (its body owns the milestone-close ritual); this ticket never touches `docs/plan.md`.

### Not here

- **No api changes of any kind** — the version param rides the existing wire; the replace flow, the thumb route, and `servePhotoThumbnail` are existing behavior. No `apps/api` file appears in any diff.
- **No api-client changes** — `thumbResponse` stays the raw binary seam; no wrapper gains a URL builder (the builder is admin-local by the spec's "Admin-local only" ruling).
- **No client staleness/priming work** (the CMS query factories, loader priming — #288) and **no exit-gate judgment** (the ratified `cold median ≤ 1 s` target is **#289's** gate; never declare M8 success or failure from this ticket).
- **No `docs/plan.md` edits** (above), **no AGENTS.md edits** (the floor-line minor rides #289), **no `docs/architecture.md`/`docs/tech-stack.md` edits** (the ADR-0019 amendment is the canonical record), **no new ADR** — the charter allocated ADRs to #286; this lever records a dated note in ADR-0019's existing Amendments section (the spec's "ADR-adjacent note").
- **No eviction/invalidation machinery** — the versioned URL IS the invalidation; no cache-busting store, no bump-on-delete hook (a deleted photo's thumb URL simply 404s through the proxy — 404s answer `no-store`).
- **No visual baselines, no e2e edits** (`e2e/visual/` is landing-only; the smoke spec touches the admin sign-in page only) — and `pnpm check` never grows an e2e leg (ADR-0022).
- **No editor replace UI** (AR-6 stands — the editor never sends `r2Key`); **no upload-flow changes** (the pool, tray, drop zone untouched); **no other thumb consumer** exists (grep-verified: the grid card + the editor preview are the only two img sites).
- `graphify update .` **is** needed at close (code symbols changed — Task 6).

---

### Task 1: branch + plan commit

**Files:**
- Commit: this plan file (the branch's first commit)

- [ ] **Step 1: branch + plan commit**

  ```bash
  git checkout main && git pull --ff-only && git checkout -b m8/03-versioned-thumbs
  git add docs/superpowers/plans/2026-11-14-m8-03-versioned-thumbs.md
  git commit -m "docs(m8): the M8 ticket 03 implementation plan (#287)"
  ```

---

### Task 2: the gallery-thumbs seam — the versioned URL builder + the cache-control constants (TDD)

**Files:**
- Test: `apps/admin/src/lib/gallery-thumbs.test.ts` (new)
- Create: `apps/admin/src/lib/gallery-thumbs.ts`

**Interfaces (exact signatures Tasks 3 and both consumers use):**
- `export const THUMB_CACHE_IMMUTABLE = 'private, max-age=31536000, immutable'` — the 2xx directive, byte-verbatim the spec's.
- `export const THUMB_CACHE_NO_STORE = 'no-store'` — the error-arm directive.
- `export function thumbUrl(photo: Pick<GalleryPhoto, 'id' | 'updatedAt'>): string` — `/api/admin/gallery-photos/<id>/thumb?v=<updatedAt epoch ms>`; `updatedAt` is a real `Date` on the wire (the probed pin), so `.getTime()` is the whole derivation.

- [ ] **Step 1: write the failing tests**

Create `apps/admin/src/lib/gallery-thumbs.test.ts` with this exact content:

```ts
import { galleryPhotoSchema } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { THUMB_CACHE_IMMUTABLE, THUMB_CACHE_NO_STORE, thumbUrl } from './gallery-thumbs';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STAMP = '2026-08-31T00:00:00.000Z';

// The fixture parses through the WIRE schema (the gallery-state.test.ts
// posture): what the builder consumes is exactly what the admin list read
// delivers — Date instances included, per the z.coerce.date() schema.
function photo(n: number, overrides: Record<string, unknown> = {}) {
  return galleryPhotoSchema.parse({
    id: uuid(n),
    title: `Photo ${n}`,
    caption: null,
    categoryId: uuid(90),
    position: n,
    isActive: true,
    photoUrl: `https://pub-test.r2.dev/gallery/${n}.jpg`,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });
}

describe('thumbUrl — the versioned proxy URL (M8 #287)', () => {
  it('derives ?v= from the updatedAt on the wire row (epoch ms)', () => {
    const row = photo(1);
    expect(thumbUrl(row)).toBe(
      `/api/admin/gallery-photos/${row.id}/thumb?v=${row.updatedAt.getTime()}`
    );
  });

  it('the version moves with the timestamp — a bumped updatedAt is a DIFFERENT URL (structural invalidation)', () => {
    const before = thumbUrl(photo(2));
    const after = photo(2, { updatedAt: '2026-09-01T00:00:00.000Z' });
    expect(thumbUrl(after)).not.toBe(before);
    expect(thumbUrl(after)).toBe(
      `/api/admin/gallery-photos/${after.id}/thumb?v=${after.updatedAt.getTime()}`
    );
  });

  it('stable per unchanged updatedAt — the same row always yields the same URL (cacheable)', () => {
    const row = photo(3);
    expect(thumbUrl(row)).toBe(thumbUrl(photo(3)));
  });
});

describe('the proxy cache-control law (M8 #287 — supersedes the #136 no-cache ruling)', () => {
  it('2xx arms answer private + one year + immutable (browser-only; the Cache API never touches this response)', () => {
    expect(THUMB_CACHE_IMMUTABLE).toBe('private, max-age=31536000, immutable');
  });

  it('error arms answer no-store — a transient 401/502 can never be cached under a thumb URL', () => {
    expect(THUMB_CACHE_NO_STORE).toBe('no-store');
  });
});
```

- [ ] **Step 2: run the tests to verify they fail**

  ```bash
  pnpm --filter @sevendays/admin test src/lib/gallery-thumbs.test.ts
  ```

  Expected: FAIL — `Cannot find module './gallery-thumbs'` (or the equivalent resolution error).

- [ ] **Step 3: write the seam module**

Create `apps/admin/src/lib/gallery-thumbs.ts` with this exact content:

```ts
// The gallery thumbnails' serving seam (M8 #287): ONE place builds the
// versioned thumb URL and owns the proxy's cache-control law, so the grid
// card, the editor preview, and the $id.thumb proxy route can never drift.
//
// The version is the photo's updatedAt — already on the admin wire
// (packages/types galleryPhotoSchema; no API or shared-schema change). The
// ADR-0019 replace flow is the invalidation half: a replace mints a fresh
// R2 key and bumps updatedAt in the same transaction, the old object is
// deleted post-commit (suite-pinned at apps/api/test/admin-gallery.test.ts),
// so a bumped timestamp is always a URL the browser has never cached —
// structural invalidation, no eviction machinery. A metadata-only save
// also bumps updatedAt (one thumb refetch per edit — the designed trade:
// timestamp versioning, not content hashing).
//
// Cache law (supersedes the #136 no-cache ruling, dated in the ADR-0019
// amendments): the proxy answers 2xx with `private, max-age=31536000,
// immutable` — private keeps session-gated bytes out of every shared
// cache, and the year-long immutable bound is safe because the URL itself
// versions the content. Error arms answer `no-store`. This response is
// returned straight to the browser — the Workers Cache API never touches
// it, so the ADR-0025/#286 public-container rule (Cache API puts reject
// `private`) is a different mechanism and does not apply here.
export const THUMB_CACHE_IMMUTABLE = 'private, max-age=31536000, immutable';

export const THUMB_CACHE_NO_STORE = 'no-store';

/** The versioned proxy URL for one wire photo row (?v= = updatedAt epoch ms). */
export function thumbUrl(photo: Pick<GalleryPhoto, 'id' | 'updatedAt'>): string {
  return `/api/admin/gallery-photos/${photo.id}/thumb?v=${photo.updatedAt.getTime()}`;
}
```

- [ ] **Step 4: run the tests to verify they pass, then commit**

  ```bash
  pnpm --filter @sevendays/admin test src/lib/gallery-thumbs.test.ts
  git add apps/admin/src/lib/gallery-thumbs.ts apps/admin/src/lib/gallery-thumbs.test.ts
  git commit -m "feat(admin): the gallery-thumbs seam — versioned URL builder + cache-control constants (#287)"
  ```

---

### Task 3: the consumption — the proxy's cache law + the grid's versioned URLs

**Files:**
- Edit: `apps/admin/src/routes/api/admin/gallery-photos/$id.thumb.ts`
- Edit: `apps/admin/src/components/gallery/gallery-screen.tsx`

- [ ] **Step 1: rewrite the proxy route — this full file content, byte-verbatim** (the header comment is the #136 ruling's old durable record and carries the supersession forward; the three error arms each gain the no-store header; the success arm gains the immutable header):

```ts
// The gallery grid's thumbnail proxy (M5 #141, AR-1): the API's gated
// by-id thumb route needs the Bearer session, so a browser <img> cannot
// reach it directly — this admin server route forwards the INCOMING
// request's cookie through the session-scoped client and streams the
// binary response through untouched (content-type carried). Cache law
// (M8 #287 — supersedes the #136 no-cache ruling, dated in the ADR-0019
// amendments): 2xx answers `private, max-age=31536000, immutable` — the
// thumb URL carries the photo's updatedAt as ?v= (the gallery-thumbs
// seam builds it), so a cached entry can never outlive its content, and
// `private` keeps session-gated bytes out of every shared cache (this
// response never touches the Workers Cache API — the ADR-0025/#286
// public-container rule is about Cache API puts, a different mechanism).
// Every error arm answers `no-store` — a transient 401/502 is never
// cached under a thumb URL. The ?v= query param is browser cache-key
// shaping only: the upstream call passes the id alone, unchanged. The
// API's requireSession stays the only auth gate: an upstream error
// envelope → its status + body; no cookie → SessionMissingError → 401
// here; any other non-upstream throw → 502.
import { ApiClientError } from '@sevendays/api-client';
import { createFileRoute } from '@tanstack/react-router';

import { getSessionScopedApiClient, SessionMissingError } from '#/lib/api.server';
import { THUMB_CACHE_IMMUTABLE, THUMB_CACHE_NO_STORE } from '#/lib/gallery-thumbs';

export const Route = createFileRoute('/api/admin/gallery-photos/$id/thumb')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const cookie = request.headers.get('cookie');
          const client = getSessionScopedApiClient(cookie);
          const upstream = await client.admin.galleryPhotos.thumbResponse({
            param: { id: params.id },
          });
          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              'content-type': upstream.headers.get('content-type') ?? 'image/webp',
              'cache-control': THUMB_CACHE_IMMUTABLE,
            },
          });
        } catch (error) {
          if (error instanceof ApiClientError) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: error.status,
              headers: {
                'content-type': 'application/json',
                'cache-control': THUMB_CACHE_NO_STORE,
              },
            });
          }
          if (error instanceof SessionMissingError) {
            return new Response(JSON.stringify({ error: 'Authentication required.' }), {
              status: 401,
              headers: {
                'content-type': 'application/json',
                'cache-control': THUMB_CACHE_NO_STORE,
              },
            });
          }
          // Infra failure (binding hiccup, unexpected throw) — no longer
          // masked as a 401 (#143 sweep): name it a bad gateway.
          return new Response(JSON.stringify({ error: 'Internal server error.' }), {
            status: 502,
            headers: {
              'content-type': 'application/json',
              'cache-control': THUMB_CACHE_NO_STORE,
            },
          });
        }
      },
    },
  },
});
```

- [ ] **Step 2: the gallery screen's three edits** — apply exactly (content-anchored; the surrounding lines are the current file's):

  Edit A — the import (biome organize-imports order: `gallery-state` < `gallery-thumbs` < `save-contract`):

  ```ts
  OLD:
  } from '#/lib/gallery-state';
  import { blockerLines } from '#/lib/save-contract';

  NEW:
  } from '#/lib/gallery-state';
  import { thumbUrl } from '#/lib/gallery-thumbs';
  import { blockerLines } from '#/lib/save-contract';
  ```

  Edit B — the grid card img (the versioned URL + `decoding="async"`; `loading='lazy'` stays):

  ```tsx
  OLD:
      {/* The Task 5 thumb proxy (AR-1): the browser <img> cannot hold the
          Bearer session, so the gated by-id route is reached through the
          admin server-route proxy — never the raw photoUrl. */}
      <div className='bg-muted relative aspect-[4/3]'>
        <img
          src={`/api/admin/gallery-photos/${photo.id}/thumb`}
          alt={photo.title ?? 'Gallery photo'}
          className='absolute inset-0 h-full w-full object-cover'
          loading='lazy'
        />

  NEW:
      {/* The Task 5 thumb proxy (AR-1): the browser <img> cannot hold the
          Bearer session, so the gated by-id route is reached through the
          admin server-route proxy — never the raw photoUrl. M8 #287: the
          URL is the versioned builder's (?v=<updatedAt epoch ms>) so a
          warm grid serves from the browser cache with zero requests, and
          a replace's bumped timestamp changes the URL — structural
          invalidation, no eviction machinery. */}
      <div className='bg-muted relative aspect-[4/3]'>
        <img
          src={thumbUrl(photo)}
          alt={photo.title ?? 'Gallery photo'}
          className='absolute inset-0 h-full w-full object-cover'
          loading='lazy'
          decoding='async'
        />
  ```

  Edit C — the editor preview img (the same builder — one URL law or none):

  ```tsx
  OLD:
          {/* Thumb preview — the same gated proxy (AR-1). */}
          <div className='bg-muted relative aspect-[4/3] w-28 overflow-hidden rounded-md'>
            <img
              src={`/api/admin/gallery-photos/${editing.row.id}/thumb`}
              alt={editing.row.title ?? 'Gallery photo'}
              className='absolute inset-0 h-full w-full object-cover'
            />
          </div>

  NEW:
          {/* Thumb preview — the same gated proxy (AR-1), the same versioned
              builder (#287). */}
          <div className='bg-muted relative aspect-[4/3] w-28 overflow-hidden rounded-md'>
            <img
              src={thumbUrl(editing.row)}
              alt={editing.row.title ?? 'Gallery photo'}
              className='absolute inset-0 h-full w-full object-cover'
              decoding='async'
            />
          </div>
  ```

- [ ] **Step 3: typecheck + the admin suite, then commit**

  ```bash
  pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin test
  git add apps/admin/src/routes/api/admin/gallery-photos/\$id.thumb.ts apps/admin/src/components/gallery/gallery-screen.tsx
  git commit -m "feat(admin): versioned thumbs live — the proxy cache law + the grid's versioned URLs (#287)"
  ```

---

### Task 4: the dated #136 supersession note + the progress bullet

**Files:**
- Edit: `docs/adr/0019-r2-media-topology.md` (append one amendment bullet)
- Edit: `docs/progress.md` (insert one What-Exists bullet)

- [ ] **Step 1: append the ADR-0019 amendment** — the `## Amendments` section currently ends with the 2026-11-13 (#246) bullet (the file's last lines); append after it, matching that bullet's wrap style (content-anchored — the OLD string is the #246 bullet's tail, unique in the file):

  ```markdown
  OLD:
  - **2026-11-13 (#246):** the upload cap is 10 MiB (was 50 MiB), one global
    cap across all four purposes — the commit-time HEAD check and the admin
    client pre-check read the same exported constant
    (`MEDIA_UPLOAD_CAP_BYTES`, packages/types). The site-logo purpose
    additionally accepts `image/png` end to end (presign pair-check schema, staging-key
    regex, commit gate, `.png` final keys under `brand/`); package-cover,
    branch-cover, and gallery-photo remain JPG-only per the #170 ruling.

  NEW:
  - **2026-11-13 (#246):** the upload cap is 10 MiB (was 50 MiB), one global
    cap across all four purposes — the commit-time HEAD check and the admin
    client pre-check read the same exported constant
    (`MEDIA_UPLOAD_CAP_BYTES`, packages/types). The site-logo purpose
    additionally accepts `image/png` end to end (presign pair-check schema, staging-key
    regex, commit gate, `.png` final keys under `brand/`); package-cover,
    branch-cover, and gallery-photo remain JPG-only per the #170 ruling.
  - **2026-11-14 (#287, M8):** the #136-era no-cache posture on the admin
    thumbnail proxy is superseded — the proxy answers 2xx with
    `Cache-Control: private, max-age=31536000, immutable` and `no-store` on
    every error arm, and the admin grid + editor preview request thumbs
    through versioned URLs (`?v=<updatedAt epoch ms>`, built by
    `apps/admin/src/lib/gallery-thumbs.ts` — the field already rides the
    admin wire). Caching is BROWSER-ONLY: `private` keeps session-gated
    thumbs out of every shared cache, and this response never touches the
    Workers Cache API (the ADR-0025/#286 public-container rule governs
    Cache API puts — a different mechanism). Invalidation stays structural
    per this ADR's replace flow: fresh key + timestamp bump in one
    transaction, the old object deleted post-commit, so an old URL can
    never be re-derived and 404s at origin. A metadata-only save also
    bumps the timestamp — one thumb refetch per edit is the designed
    trade (timestamp versioning, not content hashing).
  ```

- [ ] **Step 2: the progress.md bullet** — insert directly after the #286 bullet (the `- Session verification is **amortized on both halves**…` line ends `…the api half's session-verify share rides the M8 exit gate (#289).`) and before the blank line preceding `## Known Gaps / Not Yet Done` (must match exactly once; after the edit the file gains exactly the one bullet):

  ```text
  OLD: the api half's session-verify share rides the M8 exit gate (#289).

  ## Known Gaps / Not Yet Done
  NEW: the api half's session-verify share rides the M8 exit gate (#289).
  - Gallery thumbnails are **versioned + immutable** (2026-11-14, #287 — the #136 no-cache ruling superseded, dated in the ADR-0019 amendments): the admin grid + editor preview request thumbs through `apps/admin/src/lib/gallery-thumbs.ts`'s `thumbUrl` (`/api/admin/gallery-photos/<id>/thumb?v=<updatedAt epoch ms>` — the field already rides the admin wire, no API or shared-schema change), the thumb proxy answers 2xx with `Cache-Control: private, max-age=31536000, immutable` and `no-store` on every error arm (browser-only caching — the response never touches the Workers Cache API, so the ADR-0025 public-container rule doesn't apply), and invalidation is structural (the ADR-0019 replace flow — fresh key + timestamp bump in one transaction, the old object deleted post-commit, suite-pinned in `admin-gallery.test.ts`; there is no staff-facing replace UI, so a metadata edit's bump exercises the same law). A warm gallery revisit makes zero thumb requests; grid images carry `decoding="async"`, lazy-loading stays. Admin-local only — the api is untouched.

  ## Known Gaps / Not Yet Done
  ```

- [ ] **Step 3: commit** (the ADR amendment + progress bullet, nothing else in the commit):

  ```bash
  git add docs/adr/0019-r2-media-topology.md docs/progress.md
  git commit -m "docs(m8): the #136 supersession note in ADR-0019 + the progress bullet (#287)"
  ```

---

### Task 5: gates, push, PR, merge, watch the deploy

**Files:** none new.

- [ ] **Step 1: gates** — from the repo root (on a fresh clone, `pnpm build:packages` + `pnpm --filter @sevendays/api build` first):

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Green 35/35 with the Global Constraints floors byte-identical — **admin 29 files / 304** (+5 gallery-thumbs tests over the 28/299 before-floor); every other floor unchanged (api 34 files / 471+3sk, types 18/188, db 4 files / 22+8sk, api-client 5/45, landing 17/134).

- [ ] **Step 2: push + PR**:

  ```bash
  git push -u origin HEAD
  gh pr create --title "feat(admin): versioned immutable gallery thumbnails — the warm grid, zero thumb requests (#287)" --body-file - <<'EOF'
  M8 ticket 03 (#287, spec D3): a warm gallery grid makes zero network requests.

  - **The gallery-thumbs seam** (`apps/admin/src/lib/gallery-thumbs.ts`): `thumbUrl` builds `/api/admin/gallery-photos/<id>/thumb?v=<updatedAt epoch ms>` — the version rides the admin wire's `updatedAt`, no API or shared-schema change; the two cache-law constants live beside it, lib-seam-pinned
  - **The thumb proxy's cache law:** 2xx answers `Cache-Control: private, max-age=31536000, immutable` (browser-only caching — the response never touches the Workers Cache API, so the ADR-0025 public-container rule doesn't apply); every error arm answers `no-store` — supersedes the #136 no-cache ruling, dated in the ADR-0019 amendments
  - **Invalidation is structural** (already live): the ADR-0019 replace flow mints a fresh key + bumps `updatedAt` in one transaction, the old object deleted post-commit (suite-pinned) — a replaced photo's URL can never collide with a cached one; a metadata edit also bumps (one refetch per edit — the designed trade)
  - **Grid + editor preview** request through the builder; `decoding="async"` on, `loading='lazy'` stays; admin-local only — the api is untouched

  Floors: admin 29 files / 304 (+5 gallery-thumbs tests). No api, no api-client, no schema — `AppType` untouched.
  EOF
  ```

- [ ] **Step 3: CI check green on the PR, then squash-merge.** Record the merge SHA.

- [ ] **Step 4: watch the deploy** — `gh run list --branch main --limit 1`, verify the run's head SHA matches the merge SHA (the #271 lesson), then `gh run watch <run-id>` until the `Deploy teaser (main)` leg finishes. **Both legs must go green: `Deploy admin (sevendays-admin)` (this ticket's change) AND `Deploy api (sevendays-api)` (unchanged code — green is the expectation, never skipped).** Record the run id — the restore vehicle if anything var-shaped breaks later (`gh run rerun <run-id>`).

---

### Task 6: the deployed verification (HITL) + close + graphify

**Files:** none on disk until the graphify step (evidence lands on #287).

- [ ] **Step 1: the owner ask** — send this ask and wait (never assume while the owner may be AFK):

  > M8 ticket 03 needs one two-minute check on the deployed admin — the gallery grid now caches its thumbnails in your browser, and I need to verify the caching actually lands. Could you sign in at the teaser admin as usual, then: (1) open devtools → Network tab, type `thumb` in the filter box, and make sure the "Disable cache" checkbox at the top of the Network panel is UNTICKED; (2) open the Gallery tab and let the photos load; (3) click into another tab (say Packages) and back to Gallery — on that second visit, tell me whether any `thumb` requests appear in the Network list (there should be NONE — zero is the win); (4) still in the gallery, open one photo's editor, tweak its caption, save, and close — exactly ONE fresh `thumb` request with a `?v=` parameter should appear (that's the versioned URL working; it's designed to re-fetch after an edit). While that fresh request is selected: one glance at its Response Headers — does `cache-control` say `private, max-age=31536000, immutable`? A "zero on revisit + one after the edit + that header" and you're done; the ticket closes on it.

  Decision table:
  - Zero on revisit + one `?v=` request after the edit + the immutable header → the lever is live; post the evidence (Step 2) and close (Step 3).
  - Thumb requests re-fire on revisit → first suspect the devtools posture: the "Disable cache" checkbox defeats the whole test — confirm it's unticked and re-walk. If it genuinely re-fires with the box unticked: inspect the thumb response's headers — `cache-control` MISSING → the deploy didn't carry the route change (suspect the var-wipe class first: `gh run rerun <Task-5-run-id>`, then re-ask); header PRESENT but requests re-fire → the `?v=` is missing from the request URL → the builder didn't land (re-run Task 3's typecheck locally, take the finding with the request-URL evidence).
  - The grid errors (broken images) → suspect the route rewrite first: reproduce locally (`pnpm --filter @sevendays/admin dev`, the :3000 posture — serial, per the local-stack quirks), check the browser console for the failing URL's shape, take the finding to the owner with evidence. The degradation posture is never correctness — the builder's URL is the same path the old code hard-coded plus a query param, and the old hard-coded shape never returns 404 for an existing photo.

- [ ] **Step 2: post the evidence to #287** (only after a yes; fill the `<…>` slots):

  ```bash
  gh issue comment 287 --body "Operational evidence (deploy run <run-id>):

  - Warm grid = zero thumb requests: the owner re-opened the Gallery tab at the teaser admin (<date>) after visiting another tab — the second visit shows NO thumb requests in the Network tab (devtools, filtered to thumb, Disable cache unticked); the immutable private cache serves them.
  - The version law live: one metadata edit (caption save) produced exactly ONE fresh thumb request under a new \`?v=<epoch ms>\` URL, and the refreshed thumb rendered — the designed trade (timestamp versioning, not content hashing), not a cache failure.
  - Proxy headers verified live: the 2xx thumb response carries \`cache-control: private, max-age=31536000, immutable\` (devtools, Response Headers).
  - Structural invalidation by citation: there is no staff-facing replace UI (the editor never sends r2Key, AR-6), so the re-upload box is evidenced by the api suite pin (apps/api/test/admin-gallery.test.ts:379 — a replaced photo's OLD object is deleted after the commit, so the old object URL 404s at origin) plus the live ?v= bump above exercising the same law: a bumped updatedAt is a URL the browser has never cached, and the proxy serves whatever the row's current key holds."
  ```

- [ ] **Step 3: graphify + close #287**:

  ```bash
  git checkout main && git pull --ff-only
  graphify update .
  git add graphify-out/
  git commit -m "chore(graphify): post-#287 graph update"
  git push origin main
  gh issue view 287 --json body -q .body > /tmp/m8-03-287-body.md
  # flip the five '- [ ]' acceptance lines to '- [✅]' (✅ emoji, never plain [x] — the AGENTS.md rule)
  gh issue edit 287 --body-file /tmp/m8-03-287-body.md
  gh issue close 287 --reason completed
  ```

  All five boxes now hold: the versioned URL + the zero-request revisit (Task 3 + Step 2's walk); the re-upload/structural box (Step 2's citation + the live bump); the proxy headers (Tasks 2–3 + the header glance); the seam tests + `pnpm check` (Tasks 2 + 5); the dated supersession note (Task 4). **Do not tick this ticket's plan.md M8 box** — all five flip at #289.

---

### Task 7: post-merge — the v1 pick + ledger row

**Files:**
- Edit: `docs/agents/v1-picks.md` (the ledger row — main-side, direct commit per the ledger precedent)

- [ ] **Step 1: triage per `docs/agents/v1-picks.md`** — `node scripts/v1-triage.mjs <merge-sha>` (the Task 5 merge SHA). Expected shape: **SPLIT** — v1-paths: `apps/admin/src/lib/gallery-thumbs.ts`, `apps/admin/src/lib/gallery-thumbs.test.ts`, `apps/admin/src/routes/api/admin/gallery-photos/$id.thumb.ts`, `apps/admin/src/components/gallery/gallery-screen.tsx`, `docs/adr/0019-r2-media-topology.md`; main-only: `docs/progress.md`, this plan file (dropped). Record the classifier's actual output. Content pass expected clean: a URL builder + header constants + two img-site rewires + a doc amendment — zero booking-path strings, zero edition mechanics.

- [ ] **Step 2: execute the pick + locks** per the runbook — cherry-pick the squash commit onto `v1`, resolve the main-only paths as drops (the ADR-0019 hunk applies against the Amendments section the #246 pick carried; if the v1 tree drifted around the anchor, resolve per the runbook and record it), then from the **main repo root**:

  ```bash
  pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check
  node scripts/audit-v1-absence.mjs HEAD --repo <v1-worktree-path>   # main-root invocation — the in-worktree run MODULE_NOT_FOUNDs (the #286 lesson); expect exit 0 / PASS 0/18 over full history
  git push origin v1
  ```

  Watch the run **sha-verified** (the #271 lesson): `check` success, `Deploy v1 (private)` success, `Deploy teaser (main)` skipped. Superset check: the merge SHA reachable from origin/main. v1 floors on the check: **admin 29 files / 304** (identical to main's admin — the same five tests land) and **api 31 files (30 passed + 1 skipped) / 392 passed + 3 skipped** (v1's own floor).

- [ ] **Step 3: the ledger row** — one row appended to `docs/agents/v1-picks.md`, the #285/#286 rows as the format template (the `<…>` cells are execution-filled):

  ```text
  | 2026-11-<d> | #<PR> | <merge-sha> | <class — expected split> | <v1-sha> | #287 — M8 ticket 03: versioned immutable gallery thumbnails (the admin-local gallery-thumbs seam — thumbUrl builds /api/admin/gallery-photos/<id>/thumb?v=<updatedAt epoch ms> over the existing admin wire + the two cache-law constants; the $id.thumb proxy answers 2xx with Cache-Control: private, max-age=31536000, immutable and no-store on every error arm — the #136 no-cache ruling superseded, dated in the ADR-0019 amendments; the grid + editor preview consume the builder, decoding="async" on, lazy stays; invalidation structural via the ADR-0019 replace flow, suite-pinned; admin-local only, the api untouched). Classifier <actual class> — 5 v1-paths (the seam + test, the proxy route, the gallery screen, the ADR-0019 amendment) + 2 main-only (docs/progress.md, the plan file — dropped). Content pass clean — a URL builder + header constants + two img-site rewires, zero booking tokens, zero edition mechanics. Locks on <v1-sha>: frozen install/build:packages/api-build green; check 35/35 (TEST_DATABASE_URL :5434/sevendays_test); floors admin 29/304 (+5 gallery-thumbs tests, identical to main) and api 31 files / 392+3sk (v1's own); absence audit PASS 0/18 over full history; superset ok (<merge-sha> reachable). Run <run-id>: check success · Deploy v1 (private) success · Deploy teaser (main) skipped. Main side: PR #<PR> squash-merged after CI green; the warm-grid zero-requests evidence on #287 (the owner's devtools walk). |
  ```

  Commit:

  ```bash
  git add docs/agents/v1-picks.md
  git commit -m "docs(v1-picks): #287 ledger row - the M8 versioned-thumbs pick (admin-local, carries)"
  git push origin main
  ```

---

## Self-review notes for the executor

- **Pin inventory (all read/probed 2026-11-14 @ `3ed42bb`):** `updatedAt` on the admin wire (`packages/types/src/gallery.ts` `galleryPhotoSchema` + `toPhotoRead`'s row spread); the replace flow's fresh-key + in-transaction timestamp bump + post-commit old-key delete (`admin-gallery.ts:424-474`) and its suite pin (`admin-gallery.test.ts:379`); `thumbResponse`'s non-2xx-throws contract (`packages/api-client/src/routes/admin.ts:478` — the success arm is 2xx by construction, so no status classifier exists in this plan); Dates crossing the admin server-fn boundary as real `Date` instances (`users-state.ts:86`, `submissions-state.ts:79`, the serializer note at `admin.functions.ts:157`); `updatedAt` bumping on every photo PUT (`admin-gallery.ts:455` — the metadata-edit refetch trade); the Cache-API-vs-response-header distinction (the #286 durable lesson governs `caches.default.put` containers, not returned Responses); the two img sites being the only thumb consumers (grep-verified).
- **Test-count arithmetic:** the admin floor moves 299 → 304 by exactly the 5 tests enumerated in Task 2 (3 URL-builder + 2 cache-law). If `pnpm check` reports anything else, stop and reconcile against the test blocks — never pad. The AGENTS.md floor line (still 27/296, the #286 deferred minor) is NOT this ticket's to fix — it rides #289's closeout.
- **If line numbers shifted** (an intervening commit): every OLD string here is content-anchored, not line-anchored — they still apply; a ≠1 match means drift, stop and reconcile.
- **The two-stage close is the designed path:** Tasks 1–5 are agent-only; only Task 6 waits on the owner. If the owner is AFK after Task 5, the evidence comment is *not* posted yet, #287 stays **open** with the pending-check note, and work stops there — the ticket closes only with the walk observed (or an owner re-ruling on the failure mode).
- **The "one request after an edit" is the designed signal, not a cache failure** — the evidence comment says so explicitly so a future reader never misreads it; the owner ask warns them the same way. The only failure shape on the revisit arm is re-fired requests with "Disable cache" unticked.
- **No `Vary` header, no `public` "fix", no status classifier, no NaN shim** — each is a deliberate non-feature with its reasoning pinned in Global Constraints; a reviewer proposing any of them should be pointed at the matching pin, not humored with code.
- **The editor preview rides the builder too** (Task 3 Edit C) — one URL law or none; leaving a hard-coded thumb URL next to the builder seam is exactly the drift the seam exists to prevent.
- **Confound honesty:** #288 may merge before #289's walk; the exit gate judges the milestone sum, never this ticket. This ticket's own evidence is the zero-request revisit + the version law, not a wall-clock claim.

