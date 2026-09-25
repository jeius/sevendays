# M5 Ticket 04 — Public Reads + Trim Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The landing's read surface learns what the CMS changed. The public package reads (`GET /api/v1/service-packages`, `GET /api/v1/service-packages/:slug`) re-order inclusions and attire junctions by `(position, id)` — the keys the atomic save maintains — and apply the **trim rules**: a deactivated attire trims from its inclusion's attire list (the inclusion still renders, even with `attires: []`), a deactivated print size hides its referencing inclusion entirely, privileges are unaffected; a package whose inclusions all trim away still lists with `inclusions: []`. Both public package reads swap their wire shape to the canonical `ServicePackageRead` (`coverImageUrl` resolved against `MEDIA_PUBLIC_BASE_URL`, the raw `coverImageKey` stripped — raw keys appear in no public payload). `GET /api/v1/branches` becomes active-only while the gated appointment reads keep resolving appointments at deactivated branches. A deactivated or unknown slug serves the existing uniform not-found. Two new public reads — `GET /api/v1/gallery` (one assembled `{categories, photos}`, active rows only, position-ordered, uncategorized photos absent) and `GET /api/v1/testimonials` (active, ordered) — mount on the public v1 surface and gain typed, Zod-parsed api-client wrappers (AC-1).

**Architecture:** Five tasks: (1) the public package read rework in `services/service-packages.ts` — a shared `fetchPublicComposition` (position ordering + both trim filters + active-size lookup) feeding ticket #137's exported `assemblePackageRead`, then a private `toPublicRead` projection through `resolveMediaUrl` — TDD'd with deactivations over real Postgres, (2) the wire swap's client follow-through — the api-client package wrapper re-parses with `servicePackageReadSchema` and the landing's seven source + four test files carry the mechanical `ServicePackageWithInclusions` → `ServicePackageRead` type sweep (zero behavior, zero UI), (3) the branches active-only flip plus the CMS-path round-trips — a branch deactivated through the admin PUT vanishes from the public read while the gated appointment read still returns the appointment booked there (names resolve; the add-on name join precedent), and a package deactivated through the admin PUT serves the uniform 404 by slug, (4) the two new public reads — `services/gallery.ts` + `services/testimonials.ts`, their routes chained on v1, the api-client wrappers + index wiring, integration-tested over the `loadGalleryFixtures` state ticket #137 landed, (5) full gates + docs rotation + PR/merge + the v1 pick + issue close. Zero `packages/types` changes (ticket 01 shipped every shape this ticket emits — proven schema-by-schema below), zero `packages/db` changes, zero new dependencies, zero migrations.

**Tech Stack:** hono `4.13.5`, zod `4.5.1`, drizzle-orm `0.45.2`, `@hono/zod-validator` `0.4.3`, better-auth `1.7.5`, vitest `4.1.11`, pnpm + Turborepo, `gh` CLI. **No new dependency anywhere in this ticket.**

**Spec:** Implements ticket [#138 "M5 ticket 04 — Public reads + trim rules"](https://github.com/jeius/sevendays/issues/138) (label `ready-for-agent`), whose parent is the M5 spec `docs/specs/2026-09-24-m5-admin-cms-spec.md` (issue #134 — this ticket's sections: § Read assembly and public reads (the whole section), § Mutation shapes (the read-shape rename context), § Testing posture, § Open items riding the build). Key recon facts (2026-09-26, branch `feat/136-m5-02-media-foundation` at `b7f5452`, compose db up; #137's plan-draft is the seam of record for the post-#137 state):

- **The dependency of record is ticket 03's PARKED PLAN** (`.superpowers/sdd/2026-09-26-137-m5-03/plan-draft.md`) layered on ticket 02's LANDED code. #136's artifacts are on this branch now (`routes/admin.ts` — the gated root chained to `adminMedia` + `galleryPhotos`; `services/media.ts` — `presignUpload`/`commitUpload`/`servePhotoThumbnail` + constants; `routes/gallery-photos.ts` — thumb only). #137 lands the admin write model and — load-bearing for this ticket — (a) appends `resolveMediaUrl(env, key) => key ? \`${env.MEDIA_PUBLIC_BASE_URL}/${key}\` : null` to `services/media.ts`, (b) adds `export` to `assemblePackageRead` in `services/service-packages.ts` with a docstring note ("callers own the ordering"), (c) lands `services/admin-packages.ts` whose private `fetchComposition` already orders inclusions AND junctions by `(position, id)` and whose `toRead` strips the key and resolves `coverImageUrl` — this ticket's public rework is the same two moves with activity filters added, (d) lands `loadGalleryFixtures` in `apps/api/test/helpers/fixtures.ts` (3 categories — 'Weddings' pos 1, 'Graduation' pos 2, 'Retired Tab' pos 3 inactive; 3 photos — photoA active in categoryA `gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg` pos 1, photoB active in categoryB `…0002.jpg` pos 2, photoRetired INACTIVE and UNCATEGORIZED pos 3; 3 testimonials — 'The photos came out better than we hoped.'/Maria, batch 2026 pos 1, 'Fast, friendly, and the prints are gorgeous.'/Jon & Riza pos 2, one inactive pos 3) returning `GalleryFixtureIds`. **The branch cuts off main ONLY after #137's PR merges — Task 1 Step 0 verifies both tickets' artifacts, else STOP.**
- **The wire swap is this ticket's, and it is load-bearing for the client sweep (Task 2).** Today's public package reads emit `ServicePackageWithInclusions` (which carries `coverImageKey: string | null` — a raw key, currently null everywhere in fixtures but a real `covers/<uuid>.jpg` the moment #137's CMS binds one) — #138's own AC says "Raw keys appear in no public payload", and `servicePackageReadSchema`'s types comment pins the swap to #138 ("#136/#137's wiring, #138's swap"). `ServicePackageRead` differs from `ServicePackageWithInclusions` in EXACTLY that one field (`coverImageKey` → `coverImageUrl: string | null`); both exist in `packages/types` since #135. The api-client's `routes/service-packages.ts` parses the list and by-slug reads with `servicePackageWithInclusionsSchema` — after the swap that parse would throw at runtime on every landing page load, so Task 2 re-parses with `servicePackageReadSchema` and sweeps the landing's type references. The landing reads NO cover field in any source file (the `CoverPanel` initials placeholder is unconditional until #142) — the sweep is type-mechanical: 7 source files import the type name as a prop/parameter type, 4 test files also build fixtures carrying `coverImageKey: null`. **The landing's behavior, copy, and CDP seams stay byte-identical.**
- **Today's public assembly (the code this ticket reworks):** `services/service-packages.ts` has `listActivePackagesWithInclusions` (packages `WHERE isActive ORDER BY name`; inclusions `ORDER BY id`; junctions joined to attires `ORDER BY (created_at, id)` with an inline comment saying the position keys wait for #138) and `getActivePackageWithInclusionsBySlug` (`AND isActive = true`, null → the route's uniform 404 `'Package not found.'`). Both fetch, then hand rows to the pure `assemblePackageRead` (assembly never re-sorts — the `groupChildren` contract). **`service_packages` has NO position column** — the spec's "(position, id)" pins the inclusions and junctions; the package list itself stays name-ordered (agent ruling AR4). `services/branches.ts` is a two-liner with NO activity filter — the flip is this ticket's exact deliverable. `services/studio-services.ts` / `addon-services.ts` already filter active — #137's gate suite pins them; this ticket touches them not.
- **The trim rules' mechanics over the real schema:** `packageInclusions.position` and `packageInclusionAttires.position` are NOT NULL integers since #135 (backfilled from id/(created_at, id) order, defaults dropped); the fixture builder (`buildJunctionPairs`) assigns junction positions 1..N per inclusion in catalog attire order. The junction query inner-joins `attires` — adding `eq(attires.isActive, true)` there trims deactivated attires from every inclusion's list uniformly (a privilege with attires trims too — agent ruling AR2), and the inclusion still renders because assembly defaults empty groups to `[]`. The print-size rule filters inclusion rows: fetch the referenced sizes ACTIVE-only, then drop every inclusion whose non-null `printSizeId` misses the active set (agent ruling AR1: an inclusion with `printSizeId = null` — every privilege — never hides; the spec's "privileges unaffected"). Print sizes are only fetched for the pre-trim inclusion set, so the trim cannot leak a stale lookup.
- **The branches flip cannot break the appointment reads — structurally, and now proven:** `services/appointments.ts`'s gated list/single-get select a 14-column projection that carries `branchId` but never joins `branches`; the only name-resolution in appointment reads is `fetchAddonEntries`' add-on join, which has NO `isActive` filter (deactivated add-on names keep resolving — the same principle this ticket pins for branches). On the landing, `lib/booking-read.ts`'s `branchNameFor` joins the branch display name from the PUBLIC branches read with a documented `'—' when unresolvable` fallback (the same fallback `offeringNameFor` documents for packages deactivated after booking) — so the flip changes nothing for active branches (walk-in badge/phone data survive; CDP seams byte-identical) and degrades a deactivated branch's confirmation name to the existing documented `'—'`. Deactivation-through-CMS → public-absence is proven in Task 3 through the real admin PUT, not just db-direct updates.
- **The public read shapes need zero `packages/types` work — proven schema-by-schema:** `galleryReadSchema` = `{ categories: PublicGalleryCategory[] (id, name), photos: PublicGalleryPhoto[] (id, photoUrl: z.url(), title, categoryId: z.uuid() — non-nullable, so uncategorized photos are structurally absent) }`; `publicTestimonialSchema` = `{ id, quote, person }` (the testimonials read is an ARRAY of these — the array is the read); `servicePackageReadSchema` (coverImageUrl, key stripped) as above. All shipped in #135; `apps/api/test/cms-schema-contracts.test.ts` already round-trips all three. Zero types edits this ticket, same proof standard as ticket 03's zero-types claim.
- **Test harness (unchanged, reused as-is):** `TEST_DATABASE_URL` defaults to the compose db; `global-setup.ts` migrates + truncates, NO teardown; per-file `beforeEach(truncateAll)` + `loadFixtures(db)` (2 active branches, 3 packages with compositions, inactive variants of three entities); `signUpSession(url, email)` + a `bearer(token)` helper mint staff sessions; env passes per request as `app.request(path, opts, testEnv(url))` where `testEnv` pins `MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev'` — every resolved-URL assertion below is exact, not a prefix match. `noUncheckedIndexedAccess` is ON — every indexed read is guarded; biome bans non-null assertions. The public reads need NO session — plain `app.request(path, undefined, testEnv(url))`.
- **Time-coupled test discipline:** the Task 3 appointment create carries `scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()` — now-relative, never a hard-coded future date (the create path's past-datetime floor rejects `<= Date.now()`; a pinned date rots the day it passes).
- **Sibling fences (spec § Tickets; `docs/plan.md` M5 block):** this ticket owns M5 checkbox 4 (the "Public reads + trim rules" line) exclusively and ticks it at close; checkbox 3 (write model, #137) stays unticked until that ticket's own close lands it, and checkboxes 5–10 (#139–#143) stay unticked. NOT here, regardless of temptation: the admin write model or any admin router (#137 — consumed, never edited); any landing UI/CDP work (#142 — the landing consumes these reads but renders nothing new here; the Task 2 sweep is compile-mechanical, not UI); the admin screens (#139–#141); the seed, `cms-reflection.mjs`, seed-contract demotion, admin lib-seam seating (#143); the four owner-copy strings ("No framed pictures in this frame yet." et al.) and the two design-token decisions (#134's open items — not this ticket's); booking-time semantics (v2 — agent ruling AR5 below); the media seam (no `presignUpload`/`commitUpload`/`servePhotoThumbnail` edits; `resolveMediaUrl` is consumed as #137 shipped it).
- **Baselines (live, 2026-09-26, branch `feat/136-m5-02-media-foundation` at `b7f5452`, compose db up — re-measured by this plan's author):** `apps/api` = **16 passed + 1 skipped files (17) / 153 passed + 3 skipped tests** — exactly the post-#136 floor ticket 03 pins; the vitest-4 "close timed out after 10000ms / Tests closed successfully" exit noise is pre-existing (judge the Test Files/Tests lines only). `packages/types` = 13 files / 112 tests; `packages/db` = 22 passed + 8 skipped; `pnpm check` = 35/35 turbo tasks. **This plan's post-state, derived task-by-task below: api = 24 files / 278 passed + 3 skipped; everything else unchanged in count; check 35/35.** Per-task cumulative pins: Task 1 → 23 files / 269; Task 2 → 23 / 269 (no test-count change); Task 3 → 23 / 272; Task 4 → 24 files / 278 (+3 skipped throughout). Task 1 Step 0 re-measures the post-#137 baseline before anything runs.
- **No clarify call (owner asleep):** owner-ratified literals come only from spec #134 and ticket #138's body. Where this ticket leaves a genuinely open choice, the plan pins a spec-consistent default labeled **agent ruling (overnight, owner-review pending)** — AR1–AR7 below, surfaced in the PR + closing comment for the owner's morning review.

## Global Constraints

- **Branch & ordering gate (binding):** `feat/138-m5-04-public-reads`, cut off **main** — but ONLY after the controller merges #137's PR (ticket 03's admin write model, which itself required #136's merge): the auto-deploy and the public reads' semantics assume #137's post-merge state (`resolveMediaUrl` exported, `assemblePackageRead` exported, `admin-packages.ts` live, `loadGalleryFixtures` + `admin-*` routers present, api suite at the 23-files/262 floor). If Task 1 Step 0's artifact check or baseline re-measure fails → **STOP and report** (ordering dependency violated; do not re-create #136/#137's work). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#138)` squash style; every commit below is pinned verbatim. Evidence (gate runs) lands in gitignored `.superpowers/sdd/2026-09-26-138-m5-04/`.
- **Trim rules (controller ruling 3, spec-verbatim, binding):** a deactivated **attire trims from its inclusion's attire list** — the inclusion still renders, even with `attires: []`; a deactivated **print size hides its referencing inclusion entirely** (a sizeless print states nothing); **privileges are unaffected**; a package whose inclusions all trim away still LISTS with the inclusions block omitted (`inclusions: []` on the wire — the omitted-block render is #142's), never an empty heading; **no CMS-side guard prevents that state**. Public inclusions order `(position, id)`; junctions `(position, id)` — today's `created_at` key dies. The admin reads' FULL composition (#137) is untouched.
- **Public gallery + testimonials (controller ruling 4, binding):** `GET /api/v1/gallery` returns ONE assembled payload `{ categories, photos }` — active rows only, position-ordered, uncategorized photos ABSENT; `GET /api/v1/testimonials` returns active rows in position order. Both are PUBLIC routes (no session) chained on the existing v1 surface, resolve absolute URLs (`photoUrl` per `publicGalleryPhotoSchema`; category payload `{ id, name }` per `publicGalleryCategorySchema`), and carry raw keys in NO payload (server-side strip — the same discipline #137 pins for admin reads).
- **Branches flip (controller ruling 5, binding):** `GET /api/v1/branches` becomes active-only. Gated appointment reads keep resolving appointments booked at deactivated branches — `services/appointments.ts` is a MUST-NOT-TOUCH file (verified: its projection never joins `branches`); the landing's `lib/booking-read.ts` `branchNameFor` keeps its documented `'—'` fallback — no landing behavior change, the walk-in badge / phone data survive for active branches, CDP seams stay byte-identical (the change is the filter, nothing else).
- **Slug 404 (controller ruling 6, binding):** a deactivated or unknown slug serves the EXISTING uniform not-found — the route's `notFound(c, 'Package not found.')` envelope, byte-identical wording. No route or page change beyond what the query needs (it already needs nothing: the `isActive` filter exists; Task 3 proves it through the CMS path).
- **Gates (repo AGENTS.md + controller rulings, verbatim duties — identical to ticket 03's):** after any manifest change run `pnpm install`. Before anything that typechecks the client or apps, run `pnpm build:packages && pnpm --filter @sevendays/api build` (the client resolves `AppType` from the built `dist/`); the per-task type-flow gate is `pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck` after the build. Every task commits only with `pnpm check` green for the packages it touched (api tests need the compose db up: `docker compose up -d db` first). Biome canonical form via `pnpm --filter <pkg> fix` (biome check --write) before committing — accept its rewrites. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Never commit secrets; workers never read `.env`/`.dev.vars`. Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **Baselines (binding, from ticket 03's committed plan — the post-#137 state this branch starts from):** `apps/api` = **23 test files / 262 tests passed + 3 skipped** (the 3 skips are #136's runIf-gated LIVE harness); `packages/types` = 13 files / 112 tests; `packages/db` = 22 passed + 8 skipped; `pnpm check` = 35/35 (no scripts added — count unchanged). **This plan's post-state, derived task-by-task below: api = 24 files / 278 passed + 3 skipped; everything else unchanged; check 35/35.** Per-task cumulative pins: Task 1 → 23 files / 269; Task 2 → 23 / 269; Task 3 → 23 / 272; Task 4 → 24 / 278. If any count differs at a gate, reconcile against the task's test blocks — do not loosen assertions.
- **Wire swap (binding, this ticket's AC):** the public package reads emit `ServicePackageRead` — `coverImageKey` stripped server-side, `coverImageUrl` resolved through #137's `resolveMediaUrl` (null key → null URL; never a fallback string). Raw keys appear in NO public payload (packages, gallery, testimonials). Task 2 is the swap's forced client follow-through and is behavior-free: the api-client wrapper re-parses with `servicePackageReadSchema`, and the landing's 11 files carry the exact mechanical type sweep pinned there — NO JSX, copy, layout, query-key, or CDP-seam change. Between Task 1's and Task 2's commits the tree's runtime parse of the package reads is temporarily broken (the old schema rejects the new payload at runtime; all typechecks stay green) — land the two commits adjacently and never deploy from the intermediate state.
- **Live-DB reality (binding):** the compose db is the integration database — `global-setup` migrates + truncates it and every test rebuilds its own fixtures per test; NO test may assume a writable seeded row, and the live Supabase catalog (3 branches, 11 packages — seeded, read-only inputs per spec) is never touched by this ticket. Deactivations in tests ride the real admin PUT where the CMS path is the point (Task 3) and direct `db.update(...).set({ isActive: false })` where the read filter is the point (Tasks 1, 3, 4) — both over the compose db, never the live one.
- **Version pins (probed 2026-09-26):** zod `4.5.1`, drizzle-orm `0.45.2`, hono `4.13.5`, `@hono/zod-validator` `0.4.3`, better-auth `1.7.5`, vitest `4.1.11`, node `v26.7.0` (verify with `pnpm --filter @sevendays/api list zod drizzle-orm hono @hono/zod-validator --depth 0` at Task 1 Step 0; anything else resolves → STOP and report). No new dependency anywhere in this ticket.
- **Agent rulings (overnight, owner-review pending — spec-consistent defaults, each reversible):**
  - **AR1 (trim-hide predicate):** an inclusion hides iff `printSizeId !== null` AND the referenced size row is inactive. An inclusion with `printSizeId = null` (every privilege) never hides — "privileges unaffected". A dangling size id cannot occur (FK).
  - **AR2 (attire trim is kind-uniform):** the active-attire filter lives on the junction query, so a deactivated attire trims from ANY inclusion's list — a privilege carrying attires trims too. "Privileges unaffected" refers to the print-size rule, not to attire trimming.
  - **AR3 (gallery category deactivation is not a photo filter):** an ACTIVE photo whose category is DEACTIVATED stays in the public payload — the spec pins "active rows only … uncategorized photos absent"; it names no category-activity rule for photos. (The landing's tab derivation is #142's concern.)
  - **AR4 (package list order):** `service_packages` has no position column; the list stays `ORDER BY name` — the spec's "(position, id)" pins inclusions and junctions only.
  - **AR5 (booking intake unchanged):** `createAppointment`'s branch resolve stays existence-only — a raw API caller can still book a deactivated branch id. Booking semantics are v2's (spec § Out of Scope); the landing can no longer OFFER deactivated branches because the public read is active-only.
  - **AR6 (public branch shape unchanged):** the branches read keeps emitting `branchSchema` rows (including the `isActive` field); the flip filters ROWS, never the shape — no client change.
  - **AR7 (gallery empty payload):** the CMS-born-empty gallery answers `{ categories: [], photos: [] }` with 200 (not 404) — the assembled read always answers; the landing's empty states (#142) consume the empty arrays. Same for zero testimonials → `[]`.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; `pnpm --filter @sevendays/<pkg> fix` (biome check --write) then normalizes quoting/ordering/import order to house style — accept its rewrite, commit the result. Test code respects `noUncheckedIndexedAccess` (guard every indexed read; no non-null assertions — biome flags those).
- **Scope fence (verbatim):** Tasks 1–4 edit only: `apps/api/src/services/service-packages.ts` (rework the two public fetchers + the private projection; `assemblePackageRead`'s body and export stay as #137 landed them), `apps/api/src/routes/service-packages.ts` (pass `c.env`), `apps/api/test/service-packages.test.ts` (two cast swaps + appended describes), `apps/api/test/helpers/fixtures.ts` (additive FixtureIds keys + `.returning` captures — nothing removed), `apps/api/src/services/branches.ts` (the activity filter), `apps/api/test/branches.test.ts` (appended tests + the authed helper), `apps/api/src/services/gallery.ts` (create), `apps/api/src/services/testimonials.ts` (create), `apps/api/src/routes/gallery.ts` (create), `apps/api/src/routes/testimonials.ts` (create), `apps/api/src/routes/v1.ts` (two chained route registrations), `apps/api/test/public-reads.test.ts` (create), `packages/api-client/src/routes/service-packages.ts` (schema + type swap), `packages/api-client/src/routes/gallery.ts` (create), `packages/api-client/src/routes/testimonials.ts` (create), `packages/api-client/src/index.ts` (wiring), `apps/landing/src/lib/booking.ts`, `apps/landing/src/lib/booking-read.ts`, `apps/landing/src/lib/featured.ts`, `apps/landing/src/components/inclusions-list.tsx`, `apps/landing/src/components/home-image-led.tsx`, `apps/landing/src/components/home-cards.tsx`, `apps/landing/src/components/package-card.tsx` (type-name swap only), `apps/landing/src/lib/booking.test.ts`, `apps/landing/src/lib/booking-read.test.ts`, `apps/landing/src/lib/featured.test.ts`, `apps/landing/src/lib/package-slug.test.ts` (type-name + fixture-field swap only). Task 5 rotates `docs/plan.md` (M5 checkbox 4), `docs/progress.md`, `AGENTS.md` (one appended sentence), and `docs/agents/v1-picks.md` (ledger row, post-merge). NOT here: any `packages/types` or `packages/db` change (zero — proven schema-by-schema in the recon); any admin route/service (#137's, consumed as-is); any landing UI/behavior change beyond the pinned type sweep (#142); the seed or `cms-reflection.mjs` (#143); owner-copy strings or token decisions; the appointments create path (AR5); the media seam beyond consuming `resolveMediaUrl`.

## File Structure

```text
apps/api/src/
  services/
    service-packages.ts        # modify (Task 1) — public fetchers reworked: fetchPublicComposition + toPublicRead; assemblePackageRead untouched
    branches.ts                # modify (Task 3) — the activity filter
    gallery.ts                 # create (Task 4) — getPublicGallery
    testimonials.ts            # create (Task 4) — listActiveTestimonials
  routes/
    service-packages.ts        # modify (Task 1) — both handlers pass c.env
    v1.ts                      # modify (Task 4) — .route('/gallery', …).route('/testimonials', …) before '/admin'
    gallery.ts                 # create (Task 4)
    testimonials.ts            # create (Task 4)
  test/
    helpers/fixtures.ts        # modify (Task 1) — additive FixtureIds keys (inclusion + junction ids)
    service-packages.test.ts   # modify (Tasks 1, 3) — cast swaps + the trim/order/URL describe + the admin-PUT slug round-trip
    branches.test.ts           # modify (Task 3) — the flip + appointment-resolution tests
    public-reads.test.ts       # create (Task 4) — gallery + testimonials integration suite
packages/api-client/src/
  routes/service-packages.ts   # modify (Task 2) — servicePackageReadSchema swap
  routes/gallery.ts            # create (Task 4)
  routes/testimonials.ts       # create (Task 4)
  index.ts                     # modify (Task 4) — the two route groups wire in
apps/landing/src/              # Task 2 ONLY — the mechanical type sweep (7 source files + 4 test files, pinned there)
```

---

### Task 1: The public package reads — trim rules, `(position, id)` ordering, resolved URLs

**Files:**
- Modify (test-first): `apps/api/test/helpers/fixtures.ts` (additive FixtureIds keys + id captures), `apps/api/test/service-packages.test.ts` (two cast swaps + the new describe)
- Modify: `apps/api/src/services/service-packages.ts` (the public fetchers reworked; `assemblePackageRead`'s body/export untouched — its docstring's stale parenthetical is refreshed)
- Modify: `apps/api/src/routes/service-packages.ts` (both handlers pass `c.env`)

**Interfaces:**
- Consumes: #137's exported `assemblePackageRead` (callers own ordering/filters — assembly stays pure); #137's `resolveMediaUrl(env, key)` from `services/media.js`; the `Env` type; ticket 01's `ServicePackageRead`.
- Produces: `listActivePackagesWithInclusions(db, env): Promise<ServicePackageRead[]>` and `getActivePackageWithInclusionsBySlug(db, env, slug): Promise<ServicePackageRead | null>` (signatures GAIN `env` — the routes are the only callers), plus module-private `fetchPublicComposition(db, packageRows)` and `toPublicRead(row, env)`.

**Not here:** the admin reads (`services/admin-packages.ts` — its `fetchComposition`/`toRead` stay as #137 landed them; the trim lives in the PUBLIC fetchers so the admin keeps the full composition); the studio-services/addon-services public reads (already active-only, pinned by #137's gate suite); any client package (Task 2 — after this task's commit the client's runtime parse of the package reads is temporarily wrong while every typecheck stays green; land Task 2 adjacently, never deploy in between); the branches flip (Task 3).

- [ ] **Step 0: The ordering gate + baseline re-measure (run before ANY edit)**

Run, from the repo root, on a fresh `main` checkout cut to `feat/138-m5-04-public-reads` (only AFTER #137's PR merged):

```bash
git checkout main && git pull && git checkout -b feat/138-m5-04-public-reads
ls apps/api/src/routes/admin-branches.ts apps/api/src/routes/admin-service-packages.ts apps/api/src/routes/admin-testimonials.ts && grep -n 'export function assemblePackageRead' apps/api/src/services/service-packages.ts && grep -n 'export function resolveMediaUrl' apps/api/src/services/media.ts && grep -n 'loadGalleryFixtures' apps/api/test/helpers/fixtures.ts
docker compose up -d db && pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm --filter @sevendays/api test
```

Expected: every artifact exists (`admin-branches.ts` etc. — #137's routers; the exported `assemblePackageRead`; the exported `resolveMediaUrl`; `loadGalleryFixtures`), and the suite reads **23 files / 262 passed + 3 skipped** (the post-#137 floor; the "close timed out" exit noise is pre-existing). ALSO probe the versions: `pnpm --filter @sevendays/api list zod drizzle-orm hono @hono/zod-validator --depth 0` must read zod `4.5.1`, drizzle-orm `0.45.2`, hono `4.13.5`, `@hono/zod-validator` `0.4.3`. Any miss → **STOP and report** (do not re-create #136/#137's work).

Commit the plan file as the branch's first commit:

```bash
git add docs/superpowers/plans/2026-09-26-138-m5-04-public-reads-trim-rules.md
git commit -m "docs(plan): M5 ticket 04 — public reads + trim rules implementation plan (#138)"
```

- [ ] **Step 1: The fixture ids the ordering tests need (verbatim, additive)**

Three exact edits in `apps/api/test/helpers/fixtures.ts` — nothing existing is removed or renamed (the gallery fixtures #137 appended below are untouched):

(a) In the `FixtureIds` type, replace:

```ts
  servicePortrait: string;
  serviceRetired: string;
  serviceStudio: string;
  serviceBranchLinks: string[];
};
```

with:

```ts
  servicePortrait: string;
  serviceRetired: string;
  serviceStudio: string;
  serviceBranchLinks: string[];
  // #138: the combined package's inclusion + junction row ids — its
  // ordering tests swap positions deterministically (id order would
  // contradict the swapped positions, created_at order would contradict
  // the swapped junction positions).
  inclusionFramed11x14: string;
  inclusionPrint2R: string;
  inclusionPrint2x2: string;
  junctionFramedFilipiniana: string;
  junctionFramedExecutive: string;
};
```

(b) Replace the combined-junction insert loop:

```ts
  const [framedEntry, print2REntry, print2x2Entry] = combinedEntries;
  const combinedPairs = buildJunctionPairs({
    inclusionIds: [inclusionFramedPicture.id, inclusionPrint2R.id, inclusionPrint2x2.id],
    entries: [framedEntry, print2REntry, print2x2Entry],
    attireId: attireIdMap,
  });
  for (const pair of combinedPairs) {
    await db.insert(packageInclusionAttires).values(pair);
  }
```

with:

```ts
  const [framedEntry, print2REntry, print2x2Entry] = combinedEntries;
  const combinedPairs = buildJunctionPairs({
    inclusionIds: [inclusionFramedPicture.id, inclusionPrint2R.id, inclusionPrint2x2.id],
    entries: [framedEntry, print2REntry, print2x2Entry],
    attireId: attireIdMap,
  });
  // Still one row per statement (distinct created_at — cheap, and any
  // created_at-sensitive reader stays deterministic); #138 captures the
  // framed inclusion's junction ids via .returning for its position-swap
  // tests.
  const insertedCombinedPairs: { id: string; inclusionId: string; attireId: string }[] = [];
  for (const pair of combinedPairs) {
    const [row] = await db
      .insert(packageInclusionAttires)
      .values(pair)
      .returning({
        id: packageInclusionAttires.id,
        inclusionId: packageInclusionAttires.inclusionId,
        attireId: packageInclusionAttires.attireId,
      });
    if (!row) throw new Error('fixtures: junction insert returned no row');
    insertedCombinedPairs.push(row);
  }
  const filipinianaId = attireIdMap.get('Filipiniana');
  const executiveId = attireIdMap.get('Executive');
  if (!filipinianaId || !executiveId) throw new Error('fixtures: attire lookup missing');
  const junctionFramedFilipiniana = insertedCombinedPairs.find(
    (p) => p.inclusionId === inclusionFramedPicture.id && p.attireId === filipinianaId
  );
  const junctionFramedExecutive = insertedCombinedPairs.find(
    (p) => p.inclusionId === inclusionFramedPicture.id && p.attireId === executiveId
  );
  if (!junctionFramedFilipiniana || !junctionFramedExecutive) {
    throw new Error('fixtures: framed inclusion junction rows missing');
  }
```

(c) In the return object, replace:

```ts
    servicePortrait: servicePortrait.id,
    serviceRetired: serviceRetired.id,
    serviceStudio: serviceStudio.id,
    serviceBranchLinks: serviceBranchLinks.map((l) => l.branchId),
  };
```

with:

```ts
    servicePortrait: servicePortrait.id,
    serviceRetired: serviceRetired.id,
    serviceStudio: serviceStudio.id,
    serviceBranchLinks: serviceBranchLinks.map((l) => l.branchId),
    inclusionFramed11x14: inclusionFramedPicture.id,
    inclusionPrint2R: inclusionPrint2R.id,
    inclusionPrint2x2: inclusionPrint2x2.id,
    junctionFramedFilipiniana: junctionFramedFilipiniana.id,
    junctionFramedExecutive: junctionFramedExecutive.id,
  };
```

Run `pnpm --filter @sevendays/api test` — expected: still **23 files / 262 passed + 3 skipped** (additive fixture keys break nothing; every existing consumer of `loadFixtures` receives a superset).

- [ ] **Step 2: Write the failing tests (the two cast swaps + the new describe, verbatim)**

In `apps/api/test/service-packages.test.ts`, replace the import line:

```ts
import type { ServicePackageWithInclusions } from '@sevendays/types';
```

with:

```ts
import type { ServicePackageRead } from '@sevendays/types';
```

and swap BOTH casts: line ~23 `const body = (await res.json()) as ServicePackageWithInclusions[];` → `as ServicePackageRead[]`, and line ~67 `const body = (await res.json()) as ServicePackageWithInclusions;` → `as ServicePackageRead`. Then extend the import block at the top (the file imports nothing from `@sevendays/db` today) with:

```ts
import {
  attires,
  eq,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
} from '@sevendays/db';
```

(biome orders the import block — accept its arrangement.) Append at the end of the file:

```ts
describe('public trim rules, position ordering, and resolved URLs (#138)', () => {
  it('a deactivated print size hides its referencing inclusion entirely', async () => {
    await db.update(printSizes).set({ isActive: false }).where(eq(printSizes.id, ids.printSize2x2));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const combined = body.find((p) => p.id === ids.packageCombined);
    expect(combined?.inclusions.map((i) => [i.kind, i.printSize?.code ?? null])).toEqual([
      ['framed_picture', '11x14'],
      ['print', '2R'],
      ['privilege', null],
    ]);
  });

  it('a deactivated attire trims from the list; the inclusion still renders', async () => {
    await db.update(attires).set({ isActive: false }).where(eq(attires.id, ids.attireToga));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const combined = body.find((p) => p.id === ids.packageCombined);
    const framed = combined?.inclusions.find((i) => i.kind === 'framed_picture');
    expect(framed?.attires.map((a) => a.name)).toEqual(['Filipiniana', 'Executive']);
    for (const print of combined?.inclusions.filter((i) => i.kind === 'print') ?? []) {
      expect(print.attires).toEqual([]);
    }
    // The privilege has no attires and no size — untouched by either rule.
    const privilege = combined?.inclusions.find((i) => i.kind === 'privilege');
    expect(privilege).toBeDefined();
    expect(privilege?.attires).toEqual([]);
  });

  it('a package whose inclusions all trim away still lists with inclusions: []', async () => {
    await db.update(printSizes).set({ isActive: false }).where(eq(printSizes.id, ids.printSize2R));
    await db.update(printSizes).set({ isActive: false }).where(eq(printSizes.id, ids.printSize2x2));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const simple = body.find((p) => p.id === ids.packageSimple);
    expect(simple).toBeDefined();
    expect(simple?.name).toBe('Simple Package');
    expect(simple?.priceCents).toBe(90000);
    expect(simple?.inclusions).toEqual([]);
    // Frames are not inclusions — the trim never touches them.
    expect(simple?.frames.map((f) => f.frameNumber)).toEqual([1]);
    // The combined package keeps its framed picture and its privilege.
    const combined = body.find((p) => p.id === ids.packageCombined);
    expect(combined?.inclusions.map((i) => i.kind)).toEqual(['framed_picture', 'privilege']);
  });

  it('inclusions order by (position, id), not by id', async () => {
    await db
      .update(packageInclusions)
      .set({ position: 1 })
      .where(eq(packageInclusions.id, ids.inclusionPrint2R));
    await db
      .update(packageInclusions)
      .set({ position: 2 })
      .where(eq(packageInclusions.id, ids.inclusionPrint2x2));
    await db
      .update(packageInclusions)
      .set({ position: 3 })
      .where(eq(packageInclusions.id, ids.inclusionFramed11x14));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const combined = body.find((p) => p.id === ids.packageCombined);
    // Insertion id order reads framed → 2R → 2x2; the swapped positions
    // must win.
    expect(combined?.inclusions.map((i) => i.printSize?.code ?? i.kind)).toEqual([
      '2R',
      '2x2',
      '11x14',
      'privilege',
    ]);
  });

  it('junction attires order by (position, id), not by created_at', async () => {
    // Fixtures insert Filipiniana first (strictly earlier created_at) at
    // position 1; swapping the POSITIONS must flip the read order — the
    // dead (created_at, id) key would keep Filipiniana first.
    await db
      .update(packageInclusionAttires)
      .set({ position: 2 })
      .where(eq(packageInclusionAttires.id, ids.junctionFramedFilipiniana));
    await db
      .update(packageInclusionAttires)
      .set({ position: 1 })
      .where(eq(packageInclusionAttires.id, ids.junctionFramedExecutive));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const framed = body
      .find((p) => p.id === ids.packageCombined)
      ?.inclusions.find((i) => i.kind === 'framed_picture');
    expect(framed?.attires.map((a) => a.name)).toEqual(['Executive', 'Filipiniana']);
  });

  it('coverImageUrl resolves against MEDIA_PUBLIC_BASE_URL and the raw key never appears', async () => {
    await db
      .update(servicePackages)
      .set({ coverImageKey: 'covers/01234567-0000-4000-8000-000000000001.jpg' })
      .where(eq(servicePackages.id, ids.packageCombined));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const combined = body.find((p) => p.id === ids.packageCombined);
    expect(combined).toBeDefined();
    expect(combined?.coverImageUrl).toBe(
      'https://pub-test.r2.dev/covers/01234567-0000-4000-8000-000000000001.jpg'
    );
    expect(body.find((p) => p.id === ids.packageSimple)?.coverImageUrl).toBeNull();
    expect(combined).not.toHaveProperty('coverImageKey');
  });

  it('the by-slug read applies the same trim and URL resolution', async () => {
    await db.update(printSizes).set({ isActive: false }).where(eq(printSizes.id, ids.printSize2R));
    await db
      .update(servicePackages)
      .set({ coverImageKey: 'covers/01234567-0000-4000-8000-000000000002.jpg' })
      .where(eq(servicePackages.id, ids.packageSimple));
    const res = await app.request('/api/v1/service-packages/simple-package', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead;
    // Simple's only inclusion referenced the deactivated 2R — the by-slug
    // read trims it away too (the all-trimmed package still renders).
    expect(body.inclusions).toEqual([]);
    expect(body.coverImageUrl).toBe(
      'https://pub-test.r2.dev/covers/01234567-0000-4000-8000-000000000002.jpg'
    );
  });
});
```

Run: `pnpm --filter @sevendays/api test`
Expected: FAIL — the seven new cases fail on the current assembly (the 2x2 inclusion still renders; `coverImageKey` still on the wire so `coverImageUrl` is undefined; orders still keyed on id/created_at). The file's four pre-existing cases stay green.

- [ ] **Step 3: The implementation (whole file, verbatim)**

Replace the ENTIRE content of `apps/api/src/services/service-packages.ts` with:

```ts
import type { Database } from '@sevendays/db';
import {
  attires,
  frames,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
} from '@sevendays/db';
import type {
  ResolvedPrintSize,
  ServicePackageRead,
  ServicePackageWithInclusions,
} from '@sevendays/types';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Env } from '../env.js';
import { groupChildren } from './group-children.js';
import { resolveMediaUrl } from './media.js';

// The junction-row projection both reads select (attire id + name keyed by
// inclusionId) — a projected shape, not a table row type.
type JunctionRow = { inclusionId: string; id: string; name: string };

type MediaEnv = Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>;

/**
 * Shared assembly for both package reads (M2 ticket 04): the list and the
 * by-slug getter must emit the identical ServicePackageWithInclusions shape,
 * so the stitch lives in ONE function both call. The print-size lookup map
 * is assembly (it joins fetched values, not rows), so it moved here with
 * the stitch — fetching (which queries, which ordering) stays in the
 * callers. Callers deliver rows in their pinned orders (inclusions by
 * (position, id), junctions by (position, id), frames by frameNumber — the
 * position keys are live since #137/#138; assembly never re-sorts, the
 * groupChildren contract). Exported for #137's admin reads: the admin
 * assembles the FULL composition (no activity filter) through this same
 * stitch — callers own the ordering, so the admin passes (position, id)-
 * ordered rows.
 */
export function assemblePackageRead(
  packageRows: (typeof servicePackages.$inferSelect)[],
  inclusionRows: (typeof packageInclusions.$inferSelect)[],
  junctionRows: JunctionRow[],
  printSizeRows: (typeof printSizes.$inferSelect)[],
  frameRows: (typeof frames.$inferSelect)[]
): ServicePackageWithInclusions[] {
  const printSizeById = new Map<string, ResolvedPrintSize>();
  for (const s of printSizeRows) {
    printSizeById.set(s.id, { id: s.id, code: s.code, description: s.description });
  }

  // Assembly = groupChildren (order-preserving, empty-group-defaulting);
  // the projections below are shape-building, which stays in this service.
  const attiresByInclusion = groupChildren(junctionRows, (row) => row.inclusionId);

  const framesByPackage = groupChildren(frameRows, (f) => f.servicePackageId);

  const inclusionsByPackage = groupChildren(inclusionRows, (i) => i.servicePackageId);

  return packageRows.map((p) => ({
    ...p,
    inclusions: inclusionsByPackage(p.id).map(
      (i): ServicePackageWithInclusions['inclusions'][number] => ({
        id: i.id,
        kind: i.kind,
        quantity: i.quantity,
        printSize: i.printSizeId ? (printSizeById.get(i.printSizeId) ?? null) : null,
        attires: attiresByInclusion(i.id).map((row) => ({ id: row.id, name: row.name })),
        frameId: i.frameId,
        description: i.description,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })
    ),
    frames: framesByPackage(p.id).map((f) => ({ id: f.id, frameNumber: f.frameNumber })),
  }));
}

/**
 * The wire rename (ADR-0019, #138's swap): the public read strips the raw
 * object key and resolves the absolute URL — a null key stays null (the
 * placeholder posture on the landing). Same projection as #137's admin
 * `toRead`, kept module-local here so the public service never imports from
 * the admin module (self-contained for the v1 split's transformed surface).
 */
function toPublicRead(
  row: ServicePackageWithInclusions,
  env: MediaEnv
): ServicePackageRead {
  const { coverImageKey, ...rest } = row;
  return { ...rest, coverImageUrl: resolveMediaUrl(env, coverImageKey) };
}

/**
 * The five reads + stitch scoped to the given package rows — the public
 * composition with the M5 trim rules (#138) and the (position, id) ordering
 * keys the atomic save maintains:
 * - inclusions order (position, id); the junction query joins attires with
 *   `isActive = true` and orders (position, id) — a deactivated attire
 *   trims from its inclusion's list while the inclusion still renders
 *   (groupChildren defaults the emptied group to []).
 * - print sizes fetch ACTIVE-only for the referenced set; any inclusion
 *   whose non-null printSizeId misses the active set is dropped BEFORE the
 *   stitch — a deactivated print size hides its referencing inclusion
 *   entirely (privileges carry printSizeId null and never hide).
 * - a package whose inclusions all trim away still lists (its inclusion
 *   array is simply empty).
 * The admin's fetchComposition (#137) is the full-composition counterpart —
 * no activity filter, no trim — never merge the two.
 */
async function fetchPublicComposition(
  db: Database,
  packageRows: (typeof servicePackages.$inferSelect)[]
): Promise<ServicePackageWithInclusions[]> {
  const packageIds = packageRows.map((p) => p.id);

  const inclusionRows = await db
    .select()
    .from(packageInclusions)
    .where(inArray(packageInclusions.servicePackageId, packageIds))
    .orderBy(asc(packageInclusions.position), asc(packageInclusions.id));

  const printSizeIds = [
    ...new Set(inclusionRows.map((i) => i.printSizeId).filter((id): id is string => id !== null)),
  ];
  const printSizeRows =
    printSizeIds.length > 0
      ? await db
          .select()
          .from(printSizes)
          .where(and(inArray(printSizes.id, printSizeIds), eq(printSizes.isActive, true)))
      : [];

  // The trim rule (print sizes): only active sizes resolve, so an inclusion
  // referencing a deactivated size drops here — before the stitch, so the
  // junction query never even sees its id.
  const activePrintSizeIds = new Set(printSizeRows.map((s) => s.id));
  const inclusionRowsTrimmed = inclusionRows.filter(
    (i) => i.printSizeId === null || activePrintSizeIds.has(i.printSizeId)
  );

  const inclusionIds = inclusionRowsTrimmed.map((i) => i.id);
  const junctionRows =
    inclusionIds.length > 0
      ? await db
          .select({
            inclusionId: packageInclusionAttires.inclusionId,
            id: attires.id,
            name: attires.name,
          })
          .from(packageInclusionAttires)
          .innerJoin(attires, eq(packageInclusionAttires.attireId, attires.id))
          .where(
            and(inArray(packageInclusionAttires.inclusionId, inclusionIds), eq(attires.isActive, true))
          )
          .orderBy(asc(packageInclusionAttires.position), asc(packageInclusionAttires.id))
      : [];

  const frameRows = await db
    .select()
    .from(frames)
    .where(inArray(frames.servicePackageId, packageIds))
    .orderBy(asc(frames.frameNumber));

  return assemblePackageRead(packageRows, inclusionRowsTrimmed, junctionRows, printSizeRows, frameRows);
}

/**
 * Active packages with server-resolved lookups (M1.4 Q1=B) under the M5
 * read contract (#138): trim rules, (position, id) ordering, and the
 * coverImageKey → coverImageUrl wire rename. Packages stay name-ordered
 * (no position column exists on the table).
 */
export async function listActivePackagesWithInclusions(
  db: Database,
  env: MediaEnv
): Promise<ServicePackageRead[]> {
  const packageRows = await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.isActive, true))
    .orderBy(asc(servicePackages.name));

  if (packageRows.length === 0) return [];

  const assembled = await fetchPublicComposition(db, packageRows);
  return assembled.map((row) => toPublicRead(row, env));
}

/**
 * One ACTIVE package by slug under the M5 read contract (#138): the same
 * trim rules, ordering, and resolved coverImageUrl as the list, assembled
 * by the same composition. Unknown slug OR inactive package → null (the
 * route turns it into the uniform 404 — deactivated is invisible on the
 * public surface). The single-slug fetch re-uses the list's exact
 * composition scoped to one package id, so ordering and projection stay
 * identical by construction.
 */
export async function getActivePackageWithInclusionsBySlug(
  db: Database,
  env: MediaEnv,
  slug: string
): Promise<ServicePackageRead | null> {
  const [packageRow] = await db
    .select()
    .from(servicePackages)
    .where(and(eq(servicePackages.slug, slug), eq(servicePackages.isActive, true)))
    .limit(1);
  if (!packageRow) return null;

  const [assembled] = await fetchPublicComposition(db, [packageRow]);
  return assembled ? toPublicRead(assembled, env) : null;
}
```

- [ ] **Step 4: The route passes env (whole file, verbatim)**

Replace the ENTIRE content of `apps/api/src/routes/service-packages.ts` with:

```ts
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { notFound } from '../services/errors.js';
import {
  getActivePackageWithInclusionsBySlug,
  listActivePackagesWithInclusions,
} from '../services/service-packages.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const servicePackages = new Hono<ApiEnv>()
  .get('/', async (c) => {
    const db = c.get('db');
    return c.json(await listActivePackagesWithInclusions(db, c.env));
  })
  // No param schema (Global Constraints): slug is an opaque text key — an
  // unknown slug is a plain service-level 404, and validating would add a
  // second error path for no benefit. The :id/:slug asymmetry is deliberate.
  // Unknown AND deactivated slugs take the same uniform 404 (#138).
  .get('/:slug', async (c) => {
    const db = c.get('db');
    const pkg = await getActivePackageWithInclusionsBySlug(db, c.env, c.req.param('slug'));
    if (!pkg) {
      return notFound(c, 'Package not found.');
    }
    return c.json(pkg);
  });
```

- [ ] **Step 5: Run the suite, then the gates, then commit**

Run: `pnpm --filter @sevendays/api test`
Expected: **23 files / 269 tests passed + 3 skipped** (262 + the seven new cases; the file's four pre-existing cases stay green). If any count differs, reconcile against Step 2's blocks — do not loosen assertions.

Run: `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api typecheck` → green (accept biome's import ordering). NOTE: `pnpm --filter @sevendays/api-client typecheck` also stays green here (the wrapper's schema is untouched until Task 2 — the runtime parse is what breaks, not the types). Commit:

```bash
git add apps/api/src/services/service-packages.ts apps/api/src/routes/service-packages.ts apps/api/test/service-packages.test.ts apps/api/test/helpers/fixtures.ts
git commit -m "feat(api): public package reads — trim rules, (position, id) ordering, resolved coverImageUrl (#138)"
```

---

### Task 2: The wire swap's client follow-through — the package wrapper + the landing type sweep

**Files:**
- Modify: `packages/api-client/src/routes/service-packages.ts` (schema + type swap)
- Modify (type-name swap ONLY, pinned below): `apps/landing/src/lib/booking.ts`, `apps/landing/src/lib/booking-read.ts`, `apps/landing/src/lib/featured.ts`, `apps/landing/src/components/inclusions-list.tsx`, `apps/landing/src/components/home-image-led.tsx`, `apps/landing/src/components/home-cards.tsx`, `apps/landing/src/components/package-card.tsx`
- Modify (type-name + fixture-field swap): `apps/landing/src/lib/booking.test.ts`, `apps/landing/src/lib/booking-read.test.ts`, `apps/landing/src/lib/featured.test.ts`, `apps/landing/src/lib/package-slug.test.ts`

**Interfaces:**
- Consumes: Task 1's swapped wire (the API now answers `ServicePackageRead`); `servicePackageReadSchema` (ticket 01).
- Produces: the wrapper's `list(): Promise<ServicePackageRead[]>` / `bySlug(...): Promise<ServicePackageRead>` re-parsed through `servicePackageReadSchema`; every landing reference to the retired type name moved to `ServicePackageRead`. **Zero behavior change anywhere on the landing** — no JSX, copy, layout, query-key, loader, or CDP-seam edit; the sweep exists so `pnpm check` stays green after the wire swap (the landing's source never reads a cover field — the `CoverPanel` placeholder is unconditional until #142).

**Not here:** the gallery/testimonial wrappers (Task 4); any admin app file (it consumes no public package read — swept); any `apps/landing` file beyond the eleven pinned (verified by `grep -rn 'ServicePackageWithInclusions\|coverImageKey' apps/landing/src` returning ONLY these files after the swap — the Step 3 gate re-runs that grep and expects zero hits).

- [ ] **Step 1: The wrapper swap (whole file, verbatim)**

Replace the ENTIRE content of `packages/api-client/src/routes/service-packages.ts` with:

```ts
import type { ServicePackageRead } from '@sevendays/types';
import { servicePackageReadSchema } from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

type BySlugEndpoint = RpcClient['api']['v1']['service-packages'][':slug']['$get'];

/**
 * The by-slug endpoint's declared input: `{ param: { slug: string } }` (the route
 * takes no param schema — slug is an opaque text key). Inferred, not
 * hand-typed, so the RPC surface remains the drift-kill.
 */
export type GetPackageBySlugArgs = InferRequestType<BySlugEndpoint>;

/** Service Package wrappers: list + by-slug under /api/v1/service-packages. */
export function servicePackagesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/service-packages — active packages, trim-ruled, coverImageUrl-resolved (#138). */
    async list(): Promise<ServicePackageRead[]> {
      const res = await raw.api.v1['service-packages'].$get();
      return unwrap(res, servicePackageReadSchema.array());
    },
    /** GET /api/v1/service-packages/:slug — one active package; 404 when unknown/inactive. */
    async bySlug(args: GetPackageBySlugArgs): Promise<ServicePackageRead> {
      const res = await raw.api.v1['service-packages'][':slug'].$get(args);
      return unwrap(res, servicePackageReadSchema);
    },
  };
}
```

- [ ] **Step 2: The landing type sweep (mechanical, exactly these eleven files)**

In each of these SEVEN source files, replace every occurrence of the identifier `ServicePackageWithInclusions` with `ServicePackageRead` (import members, type annotations, generics — grep-verified: every occurrence in each file is the type reference; no identifier substring collides):

```text
apps/landing/src/lib/booking.ts                (import member + the ReadCatalog-style packages field)
apps/landing/src/lib/booking-read.ts           (import member + ReadCatalog.packages)
apps/landing/src/lib/featured.ts               (import + selectFeaturedPackages' parameter/return/comparator types)
apps/landing/src/components/inclusions-list.tsx (import + the pkg prop)
apps/landing/src/components/home-image-led.tsx (import + the packages prop)
apps/landing/src/components/home-cards.tsx     (import member + PackageCoverCard's pkg + packageChips' pkg)
apps/landing/src/components/package-card.tsx   (import + the pkg prop)
```

In each of these FOUR test files, make the same identifier swap, and in the first three ALSO replace the fixture field line `coverImageKey: null,` with `coverImageUrl: null,` (each file has exactly one; `package-slug.test.ts` has no cover field — its fixture is a two-field cast — but DOES carry the name at its import and both `as` casts):

```text
apps/landing/src/lib/booking.test.ts           (import member + pkg()'s return type + the cover field)
apps/landing/src/lib/booking-read.test.ts      (import member + pkg()'s return type + the cover field)
apps/landing/src/lib/featured.test.ts          (import + pkg()'s parameter/return types + the cover field)
apps/landing/src/lib/package-slug.test.ts      (import + basicPackage()'s return type + its `as` cast)
```

- [ ] **Step 3: Gates, the zero-leftover proof, commit**

```bash
pnpm build:packages && pnpm --filter @sevendays/api build
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test
grep -rn 'ServicePackageWithInclusions\|coverImageKey' apps/landing/src packages/api-client/src || true
```

Expected: every typecheck and the landing suite green (landing test COUNT unchanged — no case added or removed); the grep prints nothing (the only remaining `coverImageKey` mentions in the tree belong to the API's create/update INPUT schemas and `apps/api/test/cms-schema-contracts.test.ts`, which are correct — inputs keep the staging-key field; reads never echo it). Then:

```bash
pnpm --filter @sevendays/api-client fix && pnpm --filter @sevendays/landing fix
git add packages/api-client/src/routes/service-packages.ts
git commit -m "feat(api-client): package wrappers parse the ServicePackageRead wire (#138)"
git add apps/landing/src
git commit -m "refactor(landing): follow the package read wire swap — ServicePackageRead type sweep (#138)"
```

(If biome's fix rewrites nothing, the commits stand as-is; accept whatever it does rewrite.)

---

### Task 3: Branches active-only + the appointment-resolution pin + the CMS-path slug 404

**Files:**
- Modify: `apps/api/src/services/branches.ts` (the activity filter — the flip itself)
- Modify (test-first): `apps/api/test/branches.test.ts` (the authed helper + two tests), `apps/api/test/service-packages.test.ts` (one appended test)

**Interfaces:**
- Consumes: `listBranches` (today filterless); the admin branch PUT (#137's `updateBranchSchema` — full-object `{ name, address, phone, acceptsWalkIns, isActive }`); the admin package POST/PUT (#137's minimal save payload — `{ name, description, priceCents, durationMinutes: null, isActive, isFeatured, frames: [], inclusions: [] }`); the gated appointment list/single-get; `signUpSession`/`bearer`.
- Produces: `listBranches(db)` returning active rows only (name-ordered, shape unchanged — AR6); the AC-3 proof (a branch deactivated through the admin PUT vanishes publicly while the gated appointment read still returns the appointment booked there, its `branchId` and add-on names intact) and the AC-4 CMS-path proof (a package deactivated through the admin PUT serves the uniform 404 by slug and vanishes from the list).

**Not here:** `services/appointments.ts` (MUST-NOT-TOUCH — its projection never joins `branches`; if an appointment test fails the defect is in the flip or the test, never "fixed" by filtering appointments); `lib/booking-read.ts` on the landing (its `'—'` fallback is the existing documented behavior — no edit); `createAppointment`'s existence-only branch resolve (AR5 — booking semantics are v2's).

- [ ] **Step 1: Write the failing tests (verbatim)**

In `apps/api/test/branches.test.ts`, replace the import block:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';
```

with:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';
```

and extend the module consts (after `let ids: FixtureIds;`) with:

```ts
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
```

Append at the end of the file:

```ts
describe('the branches read under the CMS (#138)', () => {
  it('excludes deactivated rows while active rows keep their full shape', async () => {
    // Deactivate through the real CMS path — the isActive flip via PUT.
    const { token } = await signUpSession(url, 'branches-flip@sevendays.test');
    const put = await app.request(
      `/api/v1/admin/branches/${ids.branchB}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch B',
          address: '2 Test St',
          phone: '+63 900 000 002',
          acceptsWalkIns: true,
          isActive: false,
        }),
      },
      testEnv(url)
    );
    expect(put.status).toBe(200);

    const res = await app.request('/api/v1/branches', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      name: string;
      phone: string;
      acceptsWalkIns: boolean;
    }[];
    expect(body).toHaveLength(1);
    expect(body[0]?.id).toBe(ids.branchA);
    // The walk-in badge / phone data survive for active branches — the
    // change is the filter, nothing else.
    expect(body[0]?.phone).toBe('+63 900 000 001');
    expect(body[0]?.acceptsWalkIns).toBe(false);
  });

  it('gated appointment reads still resolve appointments booked at a deactivated branch', async () => {
    // Book at branchA (package offering + one add-on — the add-on name
    // join is the read's only name resolution, itself filterless).
    const created = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          branchId: ids.branchA,
          servicePackageId: ids.packageCombined,
          studioServiceId: null,
          customerName: 'Flip Test Customer',
          customerEmail: 'flip-customer@sevendays.test',
          customerPhone: '+63 900 111 2222',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          addonServiceIds: [ids.addonMakeup],
        }),
      },
      testEnv(url)
    );
    expect(created.status).toBe(201);
    const booked = (await created.json()) as { id: string; branchId: string };

    // Deactivate branchA through the real CMS path.
    const { token } = await signUpSession(url, 'branches-appt@sevendays.test');
    const put = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch A',
          address: '1 Test St',
          phone: '+63 900 000 001',
          acceptsWalkIns: false,
          isActive: false,
        }),
      },
      testEnv(url)
    );
    expect(put.status).toBe(200);

    // The public branches read hides it…
    const publicBranches = await app.request('/api/v1/branches', undefined, testEnv(url));
    const publicBody = (await publicBranches.json()) as { id: string }[];
    expect(publicBody.some((b) => b.id === ids.branchA)).toBe(false);

    // …while the gated appointment reads keep resolving the record — the
    // history is untouched by any deactivation (spec: deactivated branch
    // names keep resolving in gated appointment reads).
    const list = await app.request(
      '/api/v1/appointments',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(list.status).toBe(200);
    const rows = (await list.json()) as {
      id: string;
      branchId: string;
      addonServices: { name: string }[];
    }[];
    const row = rows.find((r) => r.id === booked.id);
    expect(row).toBeDefined();
    expect(row?.branchId).toBe(ids.branchA);
    expect(row?.addonServices.map((a) => a.name)).toEqual(['Makeup']);

    const single = await app.request(
      `/api/v1/appointments/${booked.id}`,
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(single.status).toBe(200);
    expect(((await single.json()) as { branchId: string }).branchId).toBe(ids.branchA);
  });
});
```

In `apps/api/test/service-packages.test.ts`, append inside the existing `describe('public trim rules, position ordering, and resolved URLs (#138)', ...)` block from Task 1 (as its last case):

```ts
  it('a package deactivated through the admin PUT serves the uniform 404 by slug and vanishes from the list', async () => {
    const { token } = await signUpSession(url, 'slug-404@sevendays.test');
    const bearerHeader = { authorization: `Bearer ${token}` };
    const created = await app.request(
      '/api/v1/admin/service-packages',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearerHeader },
        body: JSON.stringify({
          name: 'Slug 404 Probe',
          description: 'Created to be deactivated.',
          priceCents: 120000,
          durationMinutes: null,
          isActive: true,
          isFeatured: false,
          frames: [],
          inclusions: [],
        }),
      },
      testEnv(url)
    );
    expect(created.status).toBe(201);
    const pkg = (await created.json()) as { id: string; slug: string };
    expect(pkg.slug).toBe('slug-404-probe');

    // Live by slug before the flip…
    const before = await app.request(
      `/api/v1/service-packages/${pkg.slug}`,
      undefined,
      testEnv(url)
    );
    expect(before.status).toBe(200);

    // …deactivated through the CMS path…
    const deactivated = await app.request(
      `/api/v1/admin/service-packages/${pkg.id}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearerHeader },
        body: JSON.stringify({
          name: 'Slug 404 Probe',
          description: 'Created to be deactivated.',
          priceCents: 120000,
          durationMinutes: null,
          isActive: false,
          isFeatured: false,
          frames: [],
          inclusions: [],
          slug: pkg.slug,
        }),
      },
      testEnv(url)
    );
    expect(deactivated.status).toBe(200);

    // …serves the EXISTING uniform not-found by slug, byte-identical wording.
    const after = await app.request(
      `/api/v1/service-packages/${pkg.slug}`,
      undefined,
      testEnv(url)
    );
    expect(after.status).toBe(404);
    expect(((await after.json()) as { error: string }).error).toBe('Package not found.');

    const list = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    const body = (await list.json()) as { slug: string }[];
    expect(body.some((p) => p.slug === pkg.slug)).toBe(false);
  });
```

This case needs the auth import — extend `service-packages.test.ts`'s import block with `import { signUpSession } from './helpers/auth.js';` (biome orders it).

- [ ] **Step 2: The flip (whole file, verbatim)**

Replace the ENTIRE content of `apps/api/src/services/branches.ts` with:

```ts
import type { Database } from '@sevendays/db';
import { branches } from '@sevendays/db';
import { asc, eq } from 'drizzle-orm';

/**
 * The public branches read (M5 #138): ACTIVE rows only, name-ordered, the
 * shape unchanged (the row-level flip, never a shape change). Gated
 * appointment reads resolve deactivated branches independently — they never
 * join this read (the appointments projection carries branchId; the
 * landing's confirmation join degrades to its documented '—' fallback).
 */
export async function listBranches(db: Database) {
  return db
    .select()
    .from(branches)
    .where(eq(branches.isActive, true))
    .orderBy(asc(branches.name));
}
```

- [ ] **Step 3: Run the suite, gates, commit**

Run: `pnpm --filter @sevendays/api test`
Expected: **23 files / 272 tests passed + 3 skipped** (269 + the two branches cases + the slug-404 case). Run `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api typecheck` → green. Commit:

```bash
git add apps/api/src/services/branches.ts apps/api/test/branches.test.ts apps/api/test/service-packages.test.ts
git commit -m "feat(api): public branches read goes active-only; CMS-path slug 404 + appointment-resolution pins (#138)"
```

---

### Task 4: `GET /api/v1/gallery` + `GET /api/v1/testimonials` — services, routes, wrappers

**Files:**
- Create (test-first): `apps/api/test/public-reads.test.ts`
- Create: `apps/api/src/services/gallery.ts`, `apps/api/src/services/testimonials.ts`, `apps/api/src/routes/gallery.ts`, `apps/api/src/routes/testimonials.ts`, `packages/api-client/src/routes/gallery.ts`, `packages/api-client/src/routes/testimonials.ts`
- Modify: `apps/api/src/routes/v1.ts` (two chained registrations), `packages/api-client/src/index.ts` (wiring)

**Interfaces:**
- Consumes: `loadGalleryFixtures` + `GalleryFixtureIds` (#137's helper — the exact fixture state is pinned in this plan's recon); `galleryReadSchema`/`publicTestimonialSchema` (ticket 01); `resolveMediaUrl`; the house wrapper pattern (`xRoutes(raw)` + `unwrap`).
- Produces: `getPublicGallery(db, env): Promise<GalleryRead>` and `listActiveTestimonials(db): Promise<PublicTestimonial[]>`; the two public routers (no session — plain v1 children between `/addon-services` and `/admin`); client wrappers `galleryRoutes(raw).list(): Promise<GalleryRead>` and `testimonialsRoutes(raw).list(): Promise<PublicTestimonial[]>`.

**Not here:** any admin gallery route (#137's `gallery-photos.ts`/`admin-gallery.ts` are untouched — the public read never consults them); the landing's `/about` consumption (#142 — no landing edit in this task); any shape change in `packages/types` (the schemas are #135's, already contract-tested).

- [ ] **Step 1: Write the failing tests (whole file, verbatim)**

`apps/api/test/public-reads.test.ts`:

```ts
import { galleryCategories, galleryPhotos, testimonials } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { GalleryFixtureIds } from './helpers/fixtures.js';
import { loadGalleryFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let gallery: GalleryFixtureIds;

beforeEach(async () => {
  await truncateAll(db);
  gallery = await loadGalleryFixtures(db);
});

describe('GET /api/v1/gallery (the assembled public read, #138)', () => {
  it('returns active categories + active categorized photos with resolved photoUrls', async () => {
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      categories: { id: string; name: string }[];
      photos: { id: string; photoUrl: string; title: string | null; categoryId: string }[];
    };
    // Active categories in position order; the deactivated third tab absent.
    expect(body.categories).toEqual([
      { id: gallery.categoryA, name: 'Weddings' },
      { id: gallery.categoryB, name: 'Graduation' },
    ]);
    // Active + categorized only: photoRetired is BOTH inactive and
    // uncategorized — absent on either count. Raw keys never appear.
    expect(body.photos).toHaveLength(2);
    const photoA = body.photos.find((p) => p.id === gallery.photoA);
    expect(photoA?.photoUrl).toBe(
      'https://pub-test.r2.dev/gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg'
    );
    expect(photoA?.categoryId).toBe(gallery.categoryA);
    expect(photoA?.title).toBeNull();
    const photoB = body.photos.find((p) => p.id === gallery.photoB);
    expect(photoB?.photoUrl).toBe(
      'https://pub-test.r2.dev/gallery/aaaaaaaa-0000-4000-8000-000000000002.jpg'
    );
    expect(photoB?.categoryId).toBe(gallery.categoryB);
    expect(photoA).not.toHaveProperty('r2Key');
    expect(photoB).not.toHaveProperty('r2Key');
  });

  it('an ACTIVE uncategorized photo is absent (the staff-only state)', async () => {
    await db.insert(galleryPhotos).values({
      r2Key: 'gallery/aaaaaaaa-0000-4000-8000-000000000009.jpg',
      position: 4,
    });
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { photos: { id: string }[] };
    expect(body.photos).toHaveLength(2);
    expect(body.photos.some((p) => p.id === gallery.photoRetired)).toBe(false);
  });

  it('positions decide the order, not ids', async () => {
    await db
      .update(galleryCategories)
      .set({ position: 1 })
      .where(eq(galleryCategories.id, gallery.categoryB));
    await db
      .update(galleryCategories)
      .set({ position: 2 })
      .where(eq(galleryCategories.id, gallery.categoryA));
    await db.update(galleryPhotos).set({ position: 1 }).where(eq(galleryPhotos.id, gallery.photoB));
    await db.update(galleryPhotos).set({ position: 2 }).where(eq(galleryPhotos.id, gallery.photoA));
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      categories: { id: string }[];
      photos: { id: string }[];
    };
    expect(body.categories.map((c) => c.id)).toEqual([gallery.categoryB, gallery.categoryA]);
    expect(body.photos.map((p) => p.id)).toEqual([gallery.photoB, gallery.photoA]);
  });

  it('the CMS-born-empty tables answer empty arrays with 200', async () => {
    await truncateAll(db);
    const res = await app.request('/api/v1/gallery', undefined, testEnv(url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ categories: [], photos: [] });
  });
});

describe('GET /api/v1/testimonials (the public read, #138)', () => {
  it('returns active testimonials in position order, projection stripped to the public shape', async () => {
    const res = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; quote: string; person: string }[];
    expect(body).toEqual([
      {
        id: gallery.testimonialA,
        quote: 'The photos came out better than we hoped.',
        person: 'Maria, batch 2026',
      },
      {
        id: gallery.testimonialB,
        quote: 'Fast, friendly, and the prints are gorgeous.',
        person: 'Jon & Riza',
      },
    ]);
    // The public projection carries no position/isActive/timestamps.
    expect(body[0]).not.toHaveProperty('position');
    expect(body[0]).not.toHaveProperty('isActive');
  });

  it('positions decide the order', async () => {
    await db.update(testimonials).set({ position: 1 }).where(eq(testimonials.id, gallery.testimonialB));
    await db.update(testimonials).set({ position: 2 }).where(eq(testimonials.id, gallery.testimonialA));
    const res = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string }[];
    expect(body.map((t) => t.id)).toEqual([gallery.testimonialB, gallery.testimonialA]);
  });
});
```

(the test file loads ONLY `loadGalleryFixtures` — the gallery/testimonial reads consult no catalog rows, and the unused-`ids` variant would trip biome's unused-variable lint. All three `@sevendays/db` imports are used.)

Run: `pnpm --filter @sevendays/api test`
Expected: FAIL — the six new cases get the unmounted-path 404 envelope `{ error: 'Not found.' }`; the other suites stay green.

- [ ] **Step 2: The two services (whole files, verbatim)**

`apps/api/src/services/gallery.ts`:

```ts
import type { Database } from '@sevendays/db';
import { galleryCategories, galleryPhotos } from '@sevendays/db';
import type { GalleryRead, PublicGalleryPhoto } from '@sevendays/types';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import type { Env } from '../env.js';
import { resolveMediaUrl } from './media.js';

type MediaEnv = Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>;

/**
 * The assembled public gallery read (#138): active categories (array order
 * = tab order) and active CATEGORIZED photos (categoryId non-null — the
 * uncategorized state is staff-only), both position-ordered with the id
 * tiebreak. One landing fetch feeds the about page. An ACTIVE photo whose
 * CATEGORY is deactivated stays in the payload (AR3): the spec filters on
 * row activity and categorized-ness, nothing else. Raw keys never leave —
 * photoUrl resolves here, server-side.
 */
export async function getPublicGallery(
  db: Database,
  env: MediaEnv
): Promise<GalleryRead> {
  const categoryRows = await db
    .select({ id: galleryCategories.id, name: galleryCategories.name })
    .from(galleryCategories)
    .where(eq(galleryCategories.isActive, true))
    .orderBy(asc(galleryCategories.position), asc(galleryCategories.id));

  const photoRows = await db
    .select({
      id: galleryPhotos.id,
      r2Key: galleryPhotos.r2Key,
      title: galleryPhotos.title,
      categoryId: galleryPhotos.categoryId,
    })
    .from(galleryPhotos)
    .where(and(eq(galleryPhotos.isActive, true), isNotNull(galleryPhotos.categoryId)))
    .orderBy(asc(galleryPhotos.position), asc(galleryPhotos.id));

  const photos: PublicGalleryPhoto[] = [];
  for (const row of photoRows) {
    // The WHERE already excluded nulls; the guard narrows the FK type.
    if (row.categoryId === null) continue;
    const photoUrl = resolveMediaUrl(env, row.r2Key);
    if (!photoUrl) {
      // Unreachable over a NOT NULL r2_key — loud rather than a silent ''.
      throw new Error('gallery read: a photo row carried no r2Key');
    }
    photos.push({ id: row.id, photoUrl, title: row.title, categoryId: row.categoryId });
  }

  return { categories: categoryRows, photos };
}
```

`apps/api/src/services/testimonials.ts`:

```ts
import type { Database } from '@sevendays/db';
import { testimonials } from '@sevendays/db';
import type { PublicTestimonial } from '@sevendays/types';
import { asc, eq } from 'drizzle-orm';

/**
 * The public testimonials read (#138): active rows in position order, the
 * projection stripped to the public shape (id, quote, person — no position,
 * no activity flag, no timestamps). Array order is the render order.
 */
export async function listActiveTestimonials(db: Database): Promise<PublicTestimonial[]> {
  return db
    .select({ id: testimonials.id, quote: testimonials.quote, person: testimonials.person })
    .from(testimonials)
    .where(eq(testimonials.isActive, true))
    .orderBy(asc(testimonials.position), asc(testimonials.id));
}
```

- [ ] **Step 3: The two routes + the v1 chain (verbatim)**

`apps/api/src/routes/gallery.ts`:

```ts
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { getPublicGallery } from '../services/gallery.js';

// Public gallery read (no session — #138): the assembled { categories,
// photos } payload; the CMS-born-empty tables answer empty arrays (AR7).
// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const gallery = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await getPublicGallery(db, c.env));
});
```

`apps/api/src/routes/testimonials.ts`:

```ts
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { listActiveTestimonials } from '../services/testimonials.js';

// Public testimonials read (no session — #138): active rows in position
// order; zero rows answer []. Chained registration (ADR-0006 Hono RPC) —
// see routes/branches.ts.
export const testimonials = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActiveTestimonials(db));
});
```

In `apps/api/src/routes/v1.ts`, extend the import block with:

```ts
import { gallery } from './gallery.js';
import { testimonials } from './testimonials.js';
```

(biome orders the block), and replace:

```ts
  .route('/addon-services', addonServices)
  .route('/admin', admin);
```

with:

```ts
  .route('/addon-services', addonServices)
  .route('/gallery', gallery)
  .route('/testimonials', testimonials)
  .route('/admin', admin);
```

(the gated admin subtree stays the chain's last link; chain position across distinct prefixes is functionally irrelevant — the grown chain's completeness is what the client's drift-kill proves).

- [ ] **Step 4: The api suite, then the client wrappers (whole files, verbatim) + wiring**

Run: `pnpm --filter @sevendays/api test`
Expected: **24 files / 278 tests passed + 3 skipped** (272 + the six new cases). Run `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api typecheck` → green.

`packages/api-client/src/routes/gallery.ts`:

```ts
import type { GalleryRead } from '@sevendays/types';
import { galleryReadSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Gallery wrappers: GET /api/v1/gallery (the assembled public read). */
export function galleryRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/gallery — active categories + active categorized photos, position-ordered. */
    async list(): Promise<GalleryRead> {
      const res = await raw.api.v1.gallery.$get();
      return unwrap(res, galleryReadSchema);
    },
  };
}
```

`packages/api-client/src/routes/testimonials.ts`:

```ts
import type { PublicTestimonial } from '@sevendays/types';
import { publicTestimonialSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Testimonial wrappers: GET /api/v1/testimonials (the public read). */
export function testimonialsRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/testimonials — active testimonials in position order. */
    async list(): Promise<PublicTestimonial[]> {
      const res = await raw.api.v1.testimonials.$get();
      return unwrap(res, publicTestimonialSchema.array());
    },
  };
}
```

In `packages/api-client/src/index.ts`, extend the import block with:

```ts
import { galleryRoutes } from './routes/gallery.js';
import { testimonialsRoutes } from './routes/testimonials.js';
```

(biome orders), add to the `ApiClient` interface after the `branches` member:

```ts
  gallery: ReturnType<typeof galleryRoutes>;
  testimonials: ReturnType<typeof testimonialsRoutes>;
```

and add to the factory's return object after the `branches` entry:

```ts
    gallery: galleryRoutes(raw),
    testimonials: testimonialsRoutes(raw),
```

- [ ] **Step 5: The full client type-flow gate + commit**

```bash
pnpm build:packages && pnpm --filter @sevendays/api build
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck
pnpm --filter @sevendays/api-client test
```

Expected: all green — AppType now carries the two public reads (the drift-kill suite compiles against the grown surface) and the api-client suite passes unchanged (no case added — the wrapper parse path is proven by this task's integration tests plus the typecheck, per the house precedent that wrappers carry no unit tests). Then:

```bash
pnpm --filter @sevendays/api-client fix
git add apps/api/src/services/gallery.ts apps/api/src/services/testimonials.ts apps/api/src/routes/gallery.ts apps/api/src/routes/testimonials.ts apps/api/src/routes/v1.ts apps/api/test/public-reads.test.ts packages/api-client/src/routes/gallery.ts packages/api-client/src/routes/testimonials.ts packages/api-client/src/index.ts
git commit -m "feat(api,api-client): public GET /gallery + GET /testimonials — assembled active reads with typed wrappers (#138)"
```

---

### Task 5: Full gates + docs rotation + PR/merge + v1 pick + issue close

**Files:**
- Modify: `docs/plan.md` (M5 checkbox 4 — this ticket owns it exclusively), `docs/progress.md` (What Exists entry), `AGENTS.md` (one appended sentence), `docs/agents/v1-picks.md` (ledger row, post-merge)

**Interfaces:**
- Consumes: every prior task green; the compose db up.

**Not here:** any further code edits (post-Task-4 fixes land as their own pinned commits — no silent scope growth); the admin screens (#139–#141), the landing UI integration (#142), the seed/`cms-reflection.mjs`/lib-seam seating (#143); owner-copy strings or token decisions.

- [ ] **Step 1: The full gate**

Run: `docker compose up -d db && pnpm check`
Expected: **35/35 turbo tasks**; `apps/api` = **24 files / 278 passed + 3 skipped**; `packages/types` = 13 files / 112 tests (unchanged); `packages/db` = 22 passed + 8 skipped (unchanged); landing + api-client green (landing test count unchanged from the Task 1 Step 0 re-measure — this ticket adds no landing case). If any count drifted, reconcile against the per-task pins — do not loosen assertions.

- [ ] **Step 2: Tick the roadmap checkbox (this ticket's exclusively)**

In `docs/plan.md`, replace the M5 block's line:

```text
- [ ] Public reads + trim rules: `GET /api/v1/gallery` + `GET /api/v1/testimonials`; deactivated attire trims from its inclusion while a deactivated print size hides its inclusion; the branches read becomes active-only; a deactivated slug serves the existing not-found page
```

with:

```text
- [✅] Public reads + trim rules: `GET /api/v1/gallery` + `GET /api/v1/testimonials`; deactivated attire trims from its inclusion while a deactivated print size hides its inclusion; the branches read becomes active-only; a deactivated slug serves the existing not-found page _(2026-09-26: ticket #138 landed — the public package reads re-assembled on (position, id) ordering with the trim rules (deactivated attire → `attires: []` with the inclusion rendering; deactivated print size → its inclusion hidden; the all-trimmed package still lists with `inclusions: []`), the wire swapped to `ServicePackageRead` (`coverImageUrl` resolved via `resolveMediaUrl`, raw keys stripped — no public payload carries a key); `GET /api/v1/gallery` (one assembled `{categories, photos}` — active rows only, position-ordered, uncategorized photos absent) and `GET /api/v1/testimonials` (active, position-ordered) chained publicly on v1 with typed, Zod-parsed api-client wrappers; the branches read active-only while gated appointment reads still resolve appointments booked at deactivated branches; a deactivated or unknown slug serves the existing uniform 404 — proven through the real admin PUT. Client follow-through: the package wrapper re-parses with `servicePackageReadSchema` and the landing carries the mechanical `ServicePackageRead` type sweep (zero UI change). api suite 262→278 (+3 gated skips) across 24 files; types/db untouched. Agent rulings for owner review: the trim-hide predicate (only non-null size references hide), kind-uniform attire trimming, gallery photos of deactivated categories stay public, package list stays name-ordered, booking-time branch intake stays existence-only, the branches read keeps its shape, the empty gallery/testimonials answer 200.)_
```

Checkboxes 5–10 stay unticked (#139–#143 own them). Checkbox 3 is #137's — ticked or unticked strictly per that ticket's own close.

- [ ] **Step 3: AGENTS.md — one appended sentence**

In `AGENTS.md`, extend the bullet starting `- **The DB is provisioned, the catalog is seeded, and auth is wired in.**` — append after the ticket-03 sentence (which ends `…every uniqueness collision a 400 with field details.`):

```text
 The public read surface is CMS-aware (M5 ticket 04): the package reads order by (position, id), apply the trim rules, and resolve coverImageUrl (raw keys never leave the API); the branches read is active-only while appointment reads still resolve deactivated branches; a deactivated or unknown slug serves the uniform not-found; GET /api/v1/gallery and GET /api/v1/testimonials are live.
```

- [ ] **Step 4: progress.md — the What Exists entry**

Insert at the TOP of `docs/progress.md`'s What Exists section (newest-first, the #137 precedent):

```text
2026-09-26 — #138 M5 ticket 04, public reads + trim rules, landed: the landing's read surface is CMS-aware. The public package reads (`services/service-packages.ts`) re-assemble through `fetchPublicComposition` — inclusions and junctions keyed on (position, id) (the created_at proxy is dead), the trim rules applied before the stitch (junctions inner-join active attires, so a deactivated attire leaves `attires: []` while the inclusion renders; print sizes fetch active-only and any inclusion referencing a missing size drops, so a deactivated print size hides its inclusion entirely; privileges never hide; the all-trimmed package still lists with `inclusions: []`) — and swap to the canonical `ServicePackageRead` wire (`toPublicRead`: `coverImageKey` stripped, `coverImageUrl` resolved through #137's `resolveMediaUrl`; no public payload carries a raw key). Two new public reads chained on v1 (no session): `GET /api/v1/gallery` → one assembled `{categories, photos}` (`services/gallery.ts` — active rows only, position-ordered, uncategorized photos structurally absent, `photoUrl` resolved server-side) and `GET /api/v1/testimonials` → active rows position-ordered (`services/testimonials.ts`) — both with typed, Zod-parsed api-client wrappers (`galleryRoutes`/`testimonialsRoutes`). `GET /api/v1/branches` is active-only (shape unchanged) while the gated appointment reads still resolve appointments booked at deactivated branches (their projection never joins branches — pinned end-to-end through the real admin PUT). A deactivated or unknown slug serves the existing uniform 404, byte-identical wording, proven through the real admin PUT. Client follow-through: the package wrapper re-parses with `servicePackageReadSchema`; the landing carries the mechanical `ServicePackageRead` type sweep across 11 files — zero UI/behavior change, CDP seams byte-identical. Agent rulings for owner review: trim-hide predicate (only non-null size references hide), kind-uniform attire trimming, gallery photos of deactivated categories stay public, package list stays name-ordered, booking-time branch intake stays existence-only, the branches read keeps its shape, empty gallery/testimonials answer 200. Tests: api 262→278 (+3 gated skips) across 24 files; types/db untouched. `pnpm check` 35/35. v1 pick + ledger row per the runbook.
```

- [ ] **Step 5: graphify + branch hygiene**

Run: `graphify update .` (code was modified — the AGENTS.md rule). Confirm `git status` shows only the intended docs edits; commit them:

```bash
git add docs/plan.md AGENTS.md docs/progress.md
git commit -m "docs: M5 ticket 04 — public reads + trim rules landed, status rotation (#138)"
```

- [ ] **Step 6: PR + merge**

```bash
gh pr create --title "feat: M5 ticket 04 — public reads + trim rules (gallery, testimonials, active-only branches, slug 404, resolved URLs)" --body "Implements #138 (M5 spec § Read assembly and public reads). Public package reads: (position, id) ordering, the trim rules (attire → attires: [] with the inclusion rendering; print size → its inclusion hidden; the all-trimmed package still lists), and the ServicePackageRead wire swap (coverImageUrl resolved, raw keys stripped — no public payload carries a key). New public reads GET /api/v1/gallery (assembled {categories, photos}, active rows only, position-ordered, uncategorized absent) and GET /api/v1/testimonials (active, ordered), with typed Zod-parsed api-client wrappers. Branches read active-only while gated appointment reads still resolve deactivated-branch bookings (proven end-to-end through the real admin PUT). Deactivated or unknown slug → the existing uniform 404. Client follow-through: the package wrapper re-parses with servicePackageReadSchema + the landing's mechanical type sweep (zero UI change). Zero types/db changes. pnpm check 35/35; api 262→278 (+3 gated skips) across 24 files. Agent rulings (owner-review pending) listed in the plan + progress note."
gh pr merge --squash --delete-branch
```

The push to main fires `deploy-teaser`. Watch it and spot-check the live gate (read-only):

```bash
gh run watch $(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId' -R jeius/sevendays) -R jeius/sevendays
curl -s -o /dev/null -w '%{http_code}\n' https://sevendays-api.pahamajulius.workers.dev/api/v1/gallery
curl -s -o /dev/null -w '%{http_code}\n' https://sevendays-api.pahamajulius.workers.dev/api/v1/testimonials
curl -s -o /dev/null -w '%{http_code}\n' https://sevendays-api.pahamajulius.workers.dev/api/v1/branches
```

Expected: the deploy job succeeds; the gallery/testimonials curls answer `200` (the live tables are CMS-born-empty → `{"categories":[],"photos":[]}` / `[]`), the branches curl answers `200`. If the workers.dev URL is disabled for the api Worker, the CI run alone stands as the verification.

- [ ] **Step 7: The v1 pick + ledger row (per `docs/agents/v1-picks.md`)**

In the v1 seed clone (`~/Projects/sevendays-v1-seed`, branch `v1`), cherry-pick the squash commit and triage. Expected classes (the audit is the authority):

- **PICK (predicted, clean):** the new files (`services/gallery.ts`, `services/testimonials.ts`, `routes/gallery.ts`, `routes/testimonials.ts`, `test/public-reads.test.ts`, the two new wrappers, `packages/api-client/src/index.ts` wiring), `services/branches.ts` (the filter — the v1 branch table has the same `is_active` column from #135), the fixtures ids, and the branches/service-packages test additions — every hunk is booking-free.
- **SPLIT (predicted, per spec § v1-pick posture):** `services/service-packages.ts`, `routes/service-packages.ts`, `test/service-packages.test.ts`, `packages/api-client/src/routes/service-packages.ts`, and any landing type-swept file that differs main↔v1 — the packages read assembly is the spec's named predicted split ("trim rules land near booking-bearing code in the same modules"); resolve per the runbook's transformed-surface classes.
- **SKIP (main-only):** `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, this plan file.

Gate the pick: `cd ~/Projects/sevendays-v1-seed && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` → exit 0 (if a token trips, STOP and bring the hit to the owner — never resolve in-loop). Lock: `pnpm check` + `pnpm build` green in the checkout, then push. Then the ledger row in `docs/agents/v1-picks.md` on main:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — M5 ticket 04 public reads + trim rules picked (#138)"
```

- [ ] **Step 8: Close the ticket with the owner-handoff note**

The PR's `Closes #138` auto-closes on merge; post the closing comment (the owner's morning read):

```text
Landed. The landing's read surface is CMS-aware: the public package reads order by (position, id), apply the trim rules (a deactivated attire leaves its inclusion rendering with an empty attire list; a deactivated print size hides its inclusion entirely; a package whose inclusions all trim away still lists), and resolve coverImageUrl — no public payload carries a raw R2 key anymore. GET /api/v1/gallery and GET /api/v1/testimonials are live (active rows only, position-ordered, uncategorized photos absent), with typed Zod-parsed wrappers in the shared client. The branches read is active-only; appointment history at deactivated branches still resolves (proven through the real admin PUT). A deactivated or unknown slug serves the existing uniform not-found. Agent rulings for your morning review (spec-consistent defaults, all reversible): the trim-hide predicate fires only on non-null print-size references (privileges never hide); attire trimming is kind-uniform; gallery photos of a deactivated category stay public; the package list stays name-ordered (the table has no position column); booking-time branch intake stays existence-only (v2 owns booking semantics); the branches read keeps its shape; the empty gallery/testimonials answer 200 with empty payloads. NOT in this ticket: the landing's gallery/testimonial/cover rendering (#142), admin screens (#139+), the CDP harness + seed demotion (#143). The api suite is the behavioral backbone: 278 tests over real Postgres (was 262).
```



