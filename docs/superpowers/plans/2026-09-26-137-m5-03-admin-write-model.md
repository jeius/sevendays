# M5 Ticket 03 — Admin Write Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The whole catalog becomes writable over one gated subtree: every entity the inventory names — service packages, branches, studio services, add-on services, print sizes, attires, gallery categories, gallery photos, testimonials — gets `GET /` (all rows incl. deactivated), `GET /:id`, `POST /` (→201), `PUT /:id` (→200), each returning the canonical admin read shape (deactivated rows included; every media reference resolved to an absolute URL — raw keys never leave the API). The package save is ONE atomic PUT/POST carrying entity fields + `coverImageKey` + `frames[]` + `inclusions[]` (`frameNumber` and inclusion/junction `position` = array order, renumbered server-side; children rewritten in-transaction; a bad nested payload rolls back the whole save; the cover HEAD-verifies through ticket 02's `commitUpload` only when a key is present, null clears). The two applicability matrices save as full-replace PUTs keyed by the studio service; the three positioned collections save reorders as full-replace order PUTs. Slugs are server-generated at create via `slugifyName(name)` and editable on PUT with a uniqueness check. Every uniqueness collision — pre-check AND the PG `23505` — maps to 400-with-field-details; no 409 anywhere; deactivation is an `isActive` flip through PUT; no delete endpoints; frames have no standalone routes.

**Architecture:** Ten tasks: (1) the shared write plumbing — `services/admin-shared.ts` (the resolved-union failure contract for admin mutations, the `conflict`/`invalid` vocabulary, the `23505`→400 mapper, `guardUnique`, `AdminSaveError`) + `resolveMediaUrl` appended to ticket 02's `services/media.ts`, (2) branches + print sizes admin CRUD (the pattern-defining pair: service, router, integration tests), (3) attires + add-on services admin CRUD (deltas of Task 2's pattern), (4) studio services admin CRUD + the two matrix full-replaces, (5) package admin reads + the atomic save (ordering renumbering, junction rewrite, slug lifecycle, reference-validation rollback), (6) the package cover lifecycle (commit-verified bind/clear/replace through `commitUpload`), (7) gallery categories + testimonials CRUD + their order PUTs, (8) gallery photos CRUD (growing ticket 02's thumb router) + the photo order PUT, (9) the gate sweep — the 401-before-validation envelope proven on every admin router + public-read round-trips + the api-client type-flow gate, (10) full gates + docs rotation + PR/merge + the v1 pick + ledger row + issue close. Zero new types, zero new dependencies, zero migration — ticket 01's `packages/types` vocabulary and schema are consumed as-is; every route registration stays chained (ADR-0006).

**Tech Stack:** hono `4.13.5` (installed; `^4.6.0` range — no change), zod `4.5.1`, drizzle-orm `0.45.2`, `@hono/zod-validator` `0.4.3`, better-auth `1.7.5` (the M4 `requireSession` — unchanged), vitest `4.1.11`, pnpm + Turborepo, `gh` CLI. **No new dependency anywhere in this ticket.**

**Spec:** Implements ticket [#137 "M5 ticket 03 — Admin write model"](https://github.com/jeius/sevendays/issues/137) (label `ready-for-agent`), whose parent is the M5 spec `docs/specs/2026-09-24-m5-admin-cms-spec.md` (issue #134 — this ticket's sections: § Route topology and authorization, § Mutation shapes, § Ordering and bulk operations, § Slugs and the conflict vocabulary, the admin half of § Read assembly, § Testing posture). Key recon facts (2026-09-26, branch `feat/136-m5-02-media-foundation` at `d2e3647`, compose db up):

- **The dependency of record is ticket 02's COMMITTED PLAN, not its working tree.** #136 is executing in parallel on `feat/136-m5-02-media-foundation` (no PR open at plan time); its plan (`docs/superpowers/plans/2026-09-26-136-m5-02-media-foundation.md`) pins the seams this ticket consumes: `apps/api/src/routes/admin.ts` — the gated sub-app root with ONE `use('*', requireSession)`, chained to `adminMedia` and `galleryPhotos`, mounted from `routes/v1.ts` via `.route('/admin', admin)`; `services/media.ts` exporting `presignUpload`, `commitUpload` (`CommitUploadResult = { ok: true; finalKey } | { ok: false; reason: 'foreign_key' | 'not_found' | 'cap_violation'; message; details? }`), `servePhotoThumbnail`, and the constants; the env schema with `MEDIA_BUCKET`/`IMAGES` bindings + `CLOUDFLARE_ACCOUNT_ID`/`MEDIA_PUBLIC_BASE_URL` REQUIRED; and `routes/gallery-photos.ts` seeded with ONLY `GET /:id/thumb` (its comment names #137 as the entity-CRUD author). **This branch is cut off main only AFTER #136's PR merges — Global Constraints carry the ordering gate, and Task 1 Step 0 re-verifies the #136 artifacts exist before anything else.**
- **The write-model vocabulary is already complete (ticket 01, merged):** `createX`/`updateX` pairs for all nine entities, the atomic package save (`createServicePackageSchema` / `updateServicePackageSchema` with frame TOKENS + the package-level `superRefine`), `studioServiceBranchMatrixSchema`/`studioServiceAddonMatrixSchema`, the three order payloads, and the read shapes (`servicePackageReadSchema` with `coverImageUrl`, `galleryPhotoSchema` with `photoUrl`, `testimonialSchema`, `studioServiceWithBranchesSchema`). **`packages/types` needs ZERO changes this ticket** (verified schema-by-schema against every route below). Media keys on inputs are presence-encoded by ticket 01: package create `coverImageKey?`, package update `string | null | absent`, photo create `r2Key` required, photo update `r2Key?` — which makes the "verify only when changed" rule STRUCTURAL: stored keys are immutable final keys (`covers/…`), inputs are staging keys (`tmp/…`), so a present string is always new (the staging-key regex rejects final keys — `commitUpload`'s foreign-key gate).
- **The house failure contract for service-level client errors is the resolved union, not a throw:** `services/appointments.ts` (`CreateAppointmentResult`, mapped by the route to `badRequest(c, result.message)`) and `commitUpload` both follow it. Task 1's `admin-shared.ts` extends the same pattern. The one place a THROW is correct is inside the package save's transaction: returning a failure value would COMMIT the rows already written — `AdminSaveError` thrown inside the tx makes the rollback real (drizzle rolls back on throw), caught outside and mapped to the same union. Drizzle wraps driver errors — the PG message sits on `err.cause` (the appointments CHECK precedent, `test/appointments.test.ts` `constraintError`).
- **401-before-validation is proven mechanics, not aspiration:** `requireSession` (`services/auth.ts`) returns the uniform envelope `{ error: 'Authentication required.' }` before any validator runs (M4 precedent, `test/require-session.test.ts`); ticket 02 proves the ordering with an INVALID body (`test/media-routes.test.ts` — purpose `avatar` + contentType `image/png` → 401, never the validator 400). This ticket repeats that proof per entity router (Tasks 2–8) and sweeps all nine routers anonymously (Task 9).
- **Today's public reads are active-only for packages / studio services / add-on services** (`eq(isActive, true)` in `services/service-packages.ts` + `services/studio-services.ts` + `services/addon-services.ts`) — the "absent from public reads" half of AC-2 is provable through the EXISTING public routes for those three. The **branches** public read has no activity filter yet — `GET /api/v1/branches` becoming active-only is #138's exact deliverable (spec § Read assembly); this ticket fences it (asserts the admin side only) so #138 owns the flip.
- **Slug mechanics:** `slugifyName(name)` is exported from `@sevendays/db/catalog-rows` (`packages/db/src/catalog-rows.ts` — lowercase, strip non-`[a-z0-9\s-]`, collapse dashes, trim edge dashes, random `package-<base36>` fallback on empty) and already used by the seed. The public by-slug read (`GET /api/v1/service-packages/:slug`) filters `isActive` and 404s unknown slugs — so "old slug 404s publicly" after a rename is provable TODAY through the existing route (no redirect infrastructure — out of scope per spec).
- **Unique constraints in play (migration-proven names):** `branches_name_unique`, `print_sizes_code_unique`, `attires_name_unique`, `addon_services_name_unique`, `studio_services_name_unique`, `service_packages_name_unique` + `service_packages_slug_unique`, `gallery_categories_name_unique`, `gallery_photos_r2_key_unique`. `gallery_photos.position` is NOT NULL with NO default (since 0007) — direct test inserts must supply it (ticket 02's `insertPhoto` helper already does).
- **Test harness (unchanged, reused as-is):** `TEST_DATABASE_URL` defaults to the compose db (`docker compose up -d db`); `global-setup.ts` migrates + truncates with NO teardown; every test file does `beforeEach(truncateAll)` + `loadFixtures(db)` (fixtures: 2 branches, 3 packages with compositions, 3 studio services incl. `serviceRetired` inactive, 3 add-ons incl. `addonRetired` inactive, 3 print sizes, 4 attires, junction links); sessions are minted per test via `signUpSession(url, email)` + a `bearer(token)` helper; env passes per request as `app.request(path, opts, testEnv(url))` — media-bearing tests spread binding stubs over `testEnv` (`MEDIA_BUCKET: stub`), the exact shape of ticket 02's `media-routes.test.ts`. `noUncheckedIndexedAccess` is ON — indexed reads are guarded (the `if (!row) throw` pattern).
- **Type-flow spike (pinned, 2026-09-26):** a chained route carrying `validatedParam` + `validatedJson` on ONE `.put()` — the shape of every admin PUT /:id — keeps BOTH `c.req.valid('param')` and `c.req.valid('json')` typed and infers `{ param: { id }, json: <payload> }` through `hc<typeof app>` (spiked under strict tsc with the api's exact deps; evidence in gitignored `.superpowers/sdd/2026-09-26-137-m5-03/spike/`). The client's drift-kill suite (`packages/api-client/src/app-type.test.ts`) enforces AppType health under typecheck; **no api-client edits** — the admin wrappers are #139+'s consumers.
- **Sibling fences (spec § Tickets; `docs/plan.md` M5 block):** this ticket owns M5 checkbox 3 (the "Admin write model" line) exclusively and ticks it at close; checkboxes 4–10 (public reads #138, screens #139–#141, landing #142, seed demotion + admin suite + verify #143) stay unticked. NOT here, regardless of temptation: any public read change or the trim rules (#138 — `services/branches.ts`' missing filter INCLUDED); any admin/landing UI or api-client wrapper (#139–#142); the `cms-reflection.mjs` harness, seed-contract demotion, or admin lib-seam seating (#143); ticket 02's media seam beyond the ONE additive function the read assembly requires (`resolveMediaUrl` — no presign/commit/thumb edits); the four unplanned owner-copy strings and the two design-token decisions (#134's open items); appointments/booking semantics (v2); availability (v2).

## Global Constraints

- **Branch & ordering gate (binding):** `feat/137-m5-03-admin-write-model`, cut off **main** — but ONLY after the controller merges #136's PR (ticket 02's media foundation): the auto-deploy and the shared-file history (`routes/admin.ts`, `routes/gallery-photos.ts`, `routes/v1.ts`, `services/media.ts`, `env.ts`) assume #136's post-merge state, which this plan pins from ITS committed plan. If `apps/api/src/routes/admin.ts` does not exist at Task 1 Step 0, or the api suite baseline below does not hold → **STOP and report** (ordering dependency violated; do not re-create #136's work). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#137)` squash style; every commit below is pinned verbatim. Evidence (spike output, gate runs) lands in gitignored `.superpowers/sdd/2026-09-26-137-m5-03/`.
- **Envelope + gating (controller ruling, verbatim duties):** all entity routes mount under ticket 02's gated admin root — anonymous requests get the uniform 401 envelope `{ error: 'Authentication required.' }` BEFORE any body/param validation (the M4 ordering; proven per entity family with at least one INVALID-body 401 test in Tasks 2–8, and by the nine-router anonymous sweep in Task 9). Status vocabulary stays {400, 401, 404, 500} — **every uniqueness collision (service pre-check AND the PG `23505`) maps to 400 with field details** (`badRequest(c, message, details)`); no 409, no 415 anywhere. POST → 201, PUT → 200, both (and every GET) return the canonical admin read shape the client Zod-parses.
- **Mutation shape (controller ruling, verbatim duties):** full-object PUT everywhere — `updateX` = `createX` (minus server-managed fields), no undefined-vs-null merge semantics. Deactivation = an `isActive` flip through the entity PUT; no separate endpoints; **no delete endpoints anywhere**. Frames have no standalone routes — they ride the atomic package save: `frameNumber` = frames array order and inclusion/junction `position` = array order, renumbered server-side; frames/inclusions/junctions are rewritten in-transaction; a bad nested payload rolls back the whole save (no partial junction writes — the reference checks throw `AdminSaveError` INSIDE the transaction so drizzle aborts; returning a failure value would commit).
- **Matrices + orders (controller ruling, verbatim duties):** the two matrices save as full-replace PUTs keyed by the studio service — `PUT /admin/studio-services/:id/branches` `{ branchIds: [] }`, `PUT /admin/studio-services/:id/addons` `{ addonServiceIds: [] }` — the server diffs and rewrites rows in ONE transaction (delete net-missing by id, insert net-new). The three order PUTs (`PUT /admin/gallery-photos/order` `{ photoIds }`, `PUT /admin/gallery-categories/order` `{ categoryIds }`, `PUT /admin/testimonials/order` `{ testimonialIds }`) renumber 1..N in one transaction.
- **Slugs (controller ruling, verbatim duties):** create generates via `slugifyName(name)` — a create-time collision is a name collision → 400; PUT accepts the advanced `slug` field with a uniqueness check (taken → 400 with the `slug` field detail); old slugs 404 publicly (no redirects — proven through the EXISTING public by-slug route, which already 404s unknown slugs).
- **Admin reads (controller ruling, verbatim duties):** every admin read includes deactivated rows and resolves absolute media URLs — `coverImageUrl` (packages) / `photoUrl` (photos) via the `resolveMediaUrl` helper appended to `services/media.ts` (ticket 02's plan implements NO resolver — resolving is the read assembly's job per its own comment; this ONE additive function is the fenced extension; presign/commit/thumb code is untouched). Raw keys never leave the API: read projections explicitly strip `coverImageKey`/`r2Key` (Zod would mask the mistake client-side — the strip is server-side and pinned).
- **Media interplay (controller ruling, verbatim duties):** the package save HEAD-verifies `coverImageKey` through ticket 02's `commitUpload` ONLY when a key is present (presence-encoding makes "changed" structural — see recon); `null` clears; the gallery-photo POST `{ r2Key, … }` verifies at persist. Reuse `commitUpload` — never re-implement the commit contract. On replace/clear the old cover object is deleted from the bucket only AFTER the save transaction commits (a rollback never deletes; never overwrite in place). A commit failure (foreign key / not found / cap violation) maps to the 400 with `commitUpload`'s message and its details re-pathed to the payload field (`coverImageKey` / `r2Key`).
- **Gates (repo AGENTS.md + controller rulings, verbatim duties):** after any manifest change run `pnpm install`. Before anything that typechecks the client or apps, run `pnpm build:packages && pnpm --filter @sevendays/api build` (the client resolves `AppType` from the built `dist/`); the per-task type-flow gate is `pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck` after the build. Every task commits only with `pnpm check` green for the packages it touched (api tests need the compose db up: `docker compose up -d db` first). Biome canonical form via `pnpm --filter @sevendays/api fix` (biome check --write) before committing — accept its rewrites. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Never commit secrets; workers never read `.env`/`.dev.vars`. Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **Baselines (binding, from ticket 02's committed plan — the post-#136 state this branch starts from):** `apps/api` = **17 test files / 153 tests passed + 3 skipped** (the 3 skips are #136's runIf-gated LIVE harness; judge the Test Files/Tests lines — the vitest-4 "close timed out" exit noise is pre-existing); `packages/types` = 13 files / 112 tests; `packages/db` = 22 passed + 8 skipped; `pnpm check` = 35/35 turbo tasks (no scripts added — count unchanged). **This plan's post-state, derived task-by-task below: api = 23 files / 262 passed + 3 skipped; everything else unchanged; check 35/35.** Per-task cumulative pins: Task 1 → 18 files / 166; Task 2 → 19 / 181; Task 3 → 19 / 193; Task 4 → 20 / 206; Task 5 → 21 / 220; Task 6 → 21 / 226; Task 7 → 22 / 240; Task 8 → 22 / 250; Task 9 → 23 / 262 (+3 skipped). If any count differs at a gate, reconcile against the task's test blocks — do not loosen assertions.
- **Live-DB reality (binding):** the compose db is the integration database — `global-setup` migrates + truncates it and every test rebuilds its own fixtures per test; NO test may assume a writable seeded row, and the live Supabase catalog (3 branches, 11 packages — seeded, read-only inputs per spec) is never touched by this ticket. The gallery/testimonial tables are CMS-born-empty: Task 7/8 add a `loadGalleryFixtures` helper rather than touching seed data.
- **Version pins (probed 2026-09-26):** zod `4.5.1`, drizzle-orm `0.45.2`, hono `4.13.5`, `@hono/zod-validator` `0.4.3`, better-auth `1.7.5`, drizzle-kit `0.31.10`, typescript `6.0.3`, vitest `4.1.11`, node `v26.7.0` (verify with `pnpm --filter @sevendays/api list zod drizzle-orm hono @hono/zod-validator --depth 0` before Task 1; anything else resolves → STOP and report). `drizzle-orm`'s `max` aggregate is exported (probed: `typeof max === 'function'`). No new dependency anywhere in this ticket.
- **Type-flow spike (pinned):** validatedParam + validatedJson on one chained `.put()` infers `{ param, json }` through `hc<AppType>` under strict tsc (spiked 2026-09-26 with the api's exact dependency versions — see recon). Evidence in `.superpowers/sdd/2026-09-26-137-m5-03/spike/`; if Task 2's client typecheck still trips, the ordering dependency is in the api build — rerun `pnpm build:packages && pnpm --filter @sevendays/api build` before diagnosing further.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; `pnpm --filter @sevendays/api fix` then normalizes quoting/ordering/import order to house style — accept its rewrite, commit the result. Test code respects `noUncheckedIndexedAccess` (guard every indexed read; no non-null assertions — biome flags those).
- **Scope fence (verbatim):** Tasks 1–9 edit only: `apps/api/src/services/admin-shared.ts` (create), `apps/api/src/services/admin-shared.test.ts` (create), `apps/api/src/services/media.ts` (append `resolveMediaUrl` ONLY), `apps/api/src/services/media.test.ts` (append its describe ONLY), `apps/api/src/services/admin-entities.ts` (create), `apps/api/src/services/admin-packages.ts` (create), `apps/api/src/services/admin-gallery.ts` (create), `apps/api/src/services/service-packages.ts` (add `export` to `assemblePackageRead` + one comment line ONLY), `apps/api/src/routes/admin.ts` (extend the chain), `apps/api/src/routes/admin-branches.ts` (create), `admin-print-sizes.ts` (create), `admin-attires.ts` (create), `admin-addon-services.ts` (create), `admin-studio-services.ts` (create), `admin-service-packages.ts` (create), `admin-gallery-categories.ts` (create), `admin-testimonials.ts` (create), `apps/api/src/routes/gallery-photos.ts` (extend with entity CRUD + order — thumb route untouched), `apps/api/test/helpers/fixtures.ts` (append `loadGalleryFixtures`), `apps/api/test/helpers/r2-stub.ts` (create), `apps/api/test/admin-entities.test.ts` (create), `apps/api/test/admin-studio-services.test.ts` (create), `apps/api/test/admin-packages.test.ts` (create), `apps/api/test/admin-gallery.test.ts` (create), `apps/api/test/admin-gate.test.ts` (create). Task 10 rotates `docs/plan.md` (M5 checkbox 3), `docs/progress.md`, `AGENTS.md` (one appended sentence), and `docs/agents/v1-picks.md` (ledger row, post-merge). NOT here: any `packages/types` or `packages/db` change (zero — ticket 01 shipped the vocabulary); any `packages/api-client` source change (typecheck-only); any public route or read-assembly change including the branches activity filter (#138); the trim rules (#138); any admin/landing UI or client wrapper (#139–#142); `cms-reflection.mjs`, seed-contract work, admin lib-seam seating (#143); the media seam beyond `resolveMediaUrl` (#136); owner-copy strings or token decisions; the appointments/booking surface (v2 — new files stay free of booking-path strings so the v1 pick carries them).

## File Structure

```text
apps/api/src/
  services/
    admin-shared.ts            # create (Task 1) — AdminWriteResult union, conflict/invalid, uniqueViolation, guardUnique, AdminSaveError
    admin-shared.test.ts       # create (Task 1)
    media.ts                   # modify (Task 1) — append resolveMediaUrl (the ONE fenced extension to #136's seam)
    media.test.ts              # modify (Task 1) — append the resolveMediaUrl describe
    admin-entities.ts          # create (Tasks 2–4) — branches, print sizes, attires, add-ons, studio services + the two matrices
    admin-packages.ts          # create (Tasks 5–6) — package admin reads + the atomic save + the cover lifecycle
    admin-gallery.ts           # create (Tasks 7–8) — categories, photos, testimonials + the three order PUTs
    service-packages.ts        # modify (Task 5) — export assemblePackageRead (+ one comment line)
  routes/
    admin.ts                   # modify (Tasks 2–8) — the gated root's chain grows to nine entity routers
    admin-branches.ts          # create (Task 2)
    admin-print-sizes.ts       # create (Task 2)
    admin-attires.ts           # create (Task 3)
    admin-addon-services.ts    # create (Task 3)
    admin-studio-services.ts   # create (Task 4) — CRUD + PUT /:id/branches + PUT /:id/addons
    admin-service-packages.ts  # create (Task 5) — GET /, GET /:id, POST /, PUT /:id
    admin-gallery-categories.ts# create (Task 7) — CRUD + PUT /order
    admin-testimonials.ts      # create (Task 7) — CRUD + PUT /order
    gallery-photos.ts          # modify (Task 8) — #136's thumb route stays; CRUD + PUT /order added (static paths before :id)
  test/
    helpers/fixtures.ts        # modify (Task 7) — append loadGalleryFixtures
    helpers/r2-stub.ts         # create (Task 5) — recording R2Bucket stub for commitUpload-riding tests
    admin-entities.test.ts     # create (Task 2; Task 3 appends)
    admin-studio-services.test.ts # create (Task 4)
    admin-packages.test.ts     # create (Task 5; Task 6 appends)
    admin-gallery.test.ts      # create (Task 7; Task 8 appends)
    admin-gate.test.ts         # create (Task 9)
```

---

### Task 1: The admin write plumbing — failure contract, 23505 mapper, media URL resolution

**Files:**
- Create (test-first): `apps/api/src/services/admin-shared.test.ts`
- Create: `apps/api/src/services/admin-shared.ts`
- Modify: `apps/api/src/services/media.ts` (append `resolveMediaUrl`), `apps/api/src/services/media.test.ts` (append its describe)

**Interfaces:**
- Consumes: the appointments/`commitUpload` resolved-union precedent; `Env['MEDIA_PUBLIC_BASE_URL']` (ticket 02's REQUIRED var, carried by `testEnv` as `https://pub-test.r2.dev`).
- Produces (what every later task consumes — exact exports):
  - `type AdminDetail = { path: string[]; message: string }`
  - `type AdminWriteFailure = { ok: false; reason: 'conflict' | 'invalid'; message: string; details: AdminDetail[] }` — the `ok` discriminant keeps the union narrowable in routes (`if (!result.ok)`); `conflict` = uniqueness collisions (→400 with field details), `invalid` = payload-reference/format failures (→400).
  - `type AdminCreateResult<T> = { ok: true; row: T } | AdminWriteFailure` (create cannot miss)
  - `type AdminWriteResult<T> = { ok: true; row: T } | { ok: false; reason: 'not_found' } | AdminWriteFailure` (updates/matrices can)
  - `conflict(field: string): AdminWriteFailure` — message `'That value is already in use.'`, details `[{ path: [field], message: 'already in use' }]`
  - `invalidRefs(message: string, details: AdminDetail[]): AdminWriteFailure` — reason `'invalid'`
  - `uniqueViolation(error: unknown, constraints: Record<string, string>): AdminWriteFailure | null` — unwraps `err.cause.message`, extracts the PG constraint name, maps it through `constraints` to the payload field; null for anything else
  - `guardUnique<T>(constraints: Record<string, string>, write: () => Promise<T>): Promise<{ ok: true; row: T } | AdminWriteFailure>` — runs `write`, maps a `23505` through `uniqueViolation`, rethrows anything else
  - `class AdminSaveError extends Error` — carries `readonly failure: AdminWriteFailure`; thrown INSIDE transactions to force rollback, caught outside and mapped
  - `resolveMediaUrl(env: Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>, key: string | null): string | null` (in `services/media.ts`)

**Not here:** any route or entity service (Tasks 2+); any change to `commitUpload`/`presignUpload`/`servePhotoThumbnail` (#136's seam is fenced — `resolveMediaUrl` is a pure additive function); any `packages/types` change (zero this ticket).

- [ ] **Step 0: Verify the ordering dependency**

Run: `test -f apps/api/src/routes/admin.ts && echo PRESENT || echo MISSING` → expect `PRESENT` (#136's gated root). Run: `pnpm --filter @sevendays/api list zod drizzle-orm hono @hono/zod-validator --depth 0` → expect the pinned versions. Run: `docker compose up -d db` then `pnpm --filter @sevendays/api test` → expect **17 files / 153 passed + 3 skipped**. Anything else → STOP and report.

- [ ] **Step 1: Write the failing tests**

`apps/api/src/services/admin-shared.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AdminSaveError, conflict, guardUnique, invalidRefs, uniqueViolation } from './admin-shared.js';

const pgDuplicate = (constraint: string) =>
  new Error(`Failed query: insert into "t"`, {
    cause: new Error(`duplicate key value violates unique constraint "${constraint}"`),
  });

describe('uniqueViolation', () => {
  it('maps a wrapped 23505 through the constraint map to the payload field', () => {
    const failure = uniqueViolation(pgDuplicate('branches_name_unique'), { branches_name_unique: 'name' });
    expect(failure).toEqual({
      ok: false,
      reason: 'conflict',
      message: 'That value is already in use.',
      details: [{ path: ['name'], message: 'already in use' }],
    });
  });

  it('returns null for a non-unique driver error (rethrow territory)', () => {
    const err = new Error('Failed query: insert', { cause: new Error('null value in column violates not-null') });
    expect(uniqueViolation(err, { branches_name_unique: 'name' })).toBeNull();
  });

  it('returns null for an unmapped constraint (never a guessed field)', () => {
    expect(uniqueViolation(pgDuplicate('some_other_unique'), { branches_name_unique: 'name' })).toBeNull();
  });
});

describe('conflict / invalidRefs', () => {
  it('conflict names the field that clashed', () => {
    expect(conflict('slug')).toEqual({
      ok: false,
      reason: 'conflict',
      message: 'That value is already in use.',
      details: [{ path: ['slug'], message: 'already in use' }],
    });
  });

  it('invalidRefs carries reason invalid with caller details', () => {
    const failure = invalidRefs('Unknown branch in branchIds.', [{ path: ['branchIds'], message: 'unknown id x' }]);
    expect(failure.reason).toBe('invalid');
    expect(failure.message).toBe('Unknown branch in branchIds.');
    expect(failure.details).toEqual([{ path: ['branchIds'], message: 'unknown id x' }]);
  });
});

describe('guardUnique', () => {
  it('passes the write through on success', async () => {
    const result = await guardUnique({}, async () => 42);
    expect(result).toEqual({ ok: true, row: 42 });
  });

  it('maps a 23505 from the write to the conflict failure', async () => {
    const result = await guardUnique({ attires_name_unique: 'name' }, async () => {
      throw pgDuplicate('attires_name_unique');
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('conflict');
    expect(result.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('rethrows anything that is not a mapped unique violation', async () => {
    await expect(
      guardUnique({}, async () => {
        throw new Error('connection refused');
      })
    ).rejects.toThrow('connection refused');
  });
});

describe('AdminSaveError', () => {
  it('carries the failure payload and a message', () => {
    const error = new AdminSaveError(conflict('name'));
    expect(error.name).toBe('AdminSaveError');
    expect(error.message).toBe('That value is already in use.');
    expect(error.failure.reason).toBe('conflict');
  });

  it('is thrown (not returned) — the transaction-rollback channel', async () => {
    await expect(
      (async () => {
        throw new AdminSaveError(invalidRefs('bad', []));
      })()
    ).rejects.toBeInstanceOf(AdminSaveError);
  });
});
```

Append to `apps/api/src/services/media.test.ts` (at the end of the file — the `resolveMediaUrl` import rides biome's import ordering):

```ts
describe('resolveMediaUrl', () => {
  const env = { MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev' };

  it('resolves a key to the absolute public URL', () => {
    expect(resolveMediaUrl(env, 'covers/00000000-0000-4000-8000-000000000000.jpg')).toBe(
      'https://pub-test.r2.dev/covers/00000000-0000-4000-8000-000000000000.jpg'
    );
  });

  it('passes a null key through as null (no cover is a null URL, never a string)', () => {
    expect(resolveMediaUrl(env, null)).toBeNull();
  });

  it('is a plain join — no trailing-slash normalization beyond what the var carries', () => {
    expect(resolveMediaUrl({ MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev/' }, 'gallery/a.jpg')).toBe(
      'https://pub-test.r2.dev//gallery/a.jpg'
    );
  });
});
```

(extend the existing import at the top of the file: add `resolveMediaUrl` to the `./media.js` import list.)

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- src/services/admin-shared src/services/media`
Expected: FAIL — both imports cannot resolve (`./admin-shared.js` does not exist; `resolveMediaUrl` not exported). The pre-existing media cases stay green.

- [ ] **Step 3: Implement `admin-shared.ts` (whole file, verbatim)**

```ts
// The admin write model's failure contract (M5 #137): the resolved-union
// precedent of services/appointments.ts and commitUpload, made uniform for
// every entity mutation — a service RESOLVES a typed failure and the thin
// route maps it (not_found → 404, conflict/invalid → 400 with field
// details). Status vocabulary {400, 401, 404, 500}; no 409 anywhere: every
// uniqueness collision — the deterministic pre-check AND the PG 23505 race
// backstop — resolves through `conflict` with the exact payload field named.
import type { Env } from '../env.js';

export type AdminDetail = { path: string[]; message: string };

export type AdminWriteFailure = {
  ok: false;
  reason: 'conflict' | 'invalid';
  message: string;
  details: AdminDetail[];
};

export type AdminCreateResult<T> = { ok: true; row: T } | AdminWriteFailure;

export type AdminWriteResult<T> =
  | { ok: true; row: T }
  | { ok: false; reason: 'not_found' }
  | AdminWriteFailure;

export function conflict(field: string): AdminWriteFailure {
  return {
    ok: false,
    reason: 'conflict',
    message: 'That value is already in use.',
    details: [{ path: [field], message: 'already in use' }],
  };
}

export function invalidRefs(message: string, details: AdminDetail[]): AdminWriteFailure {
  return { ok: false, reason: 'invalid', message, details };
}

/**
 * Map a failed write to the conflict failure when the driver rejected it as
 * a PG unique violation whose constraint is in the caller's map; null for
 * anything else (rethrow territory — the root onError owns the uniform 500).
 * Drizzle wraps driver errors: the PG message sits on err.cause (the
 * appointments CHECK precedent). The deterministic pre-check in each service
 * is the PRIMARY conflict path; this mapper is the race backstop that keeps
 * the 23505 inside the same 400-with-field-details vocabulary.
 */
export function uniqueViolation(
  error: unknown,
  constraints: Record<string, string>
): AdminWriteFailure | null {
  const cause = (error as { cause?: unknown })?.cause;
  const message = (cause as Error | undefined)?.message ?? '';
  const match = /duplicate key value violates unique constraint "([^"]+)"/.exec(message);
  const constraint = match?.[1];
  if (!constraint) return null;
  const field = constraints[constraint];
  if (!field) return null;
  return conflict(field);
}

/**
 * Run one write with the 23505 backstop armed: the write's unique clashes
 * resolve to the conflict failure, everything else propagates (the root
 * onError owns it). The write itself throws only on driver errors or the
 * no-row guard — validation happens BEFORE it.
 */
export async function guardUnique<T>(
  constraints: Record<string, string>,
  write: () => Promise<T>
): Promise<{ ok: true; row: T } | AdminWriteFailure> {
  try {
    return { ok: true, row: await write() };
  } catch (error) {
    const violation = uniqueViolation(error, constraints);
    if (violation) return violation;
    throw error;
  }
}

/**
 * Thrown INSIDE a transaction to force the rollback: drizzle commits when the
 * callback RESOLVES — a failure value returned mid-transaction would commit
 * the rows already written (the atomic-save trap). Caught by the save's
 * caller and mapped back into the same union. Not for the simple entities
 * (their checks run before any write); the atomic package save is the user.
 */
export class AdminSaveError extends Error {
  readonly failure: AdminWriteFailure;

  constructor(failure: AdminWriteFailure) {
    super(failure.message);
    this.name = 'AdminSaveError';
    this.failure = failure;
  }
}
```

`resolveMediaUrl` does NOT live here — it appends to `services/media.ts` (the media seam of record). In `apps/api/src/services/media.ts`, append at the end of the file:

```ts
/**
 * Read-time URL resolution (ADR-0019): the absolute public URL for an object
 * key, null passthrough for a null key. The ONLY place a key becomes a URL —
 * admin reads resolve here (#137); #138 reuses it for the public reads. Raw
 * keys never leave the API at any layer. (Added by #137 as the one fenced
 * extension to this seam; presign/commit/thumb are untouched.)
 */
export function resolveMediaUrl(
  env: Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>,
  key: string | null
): string | null {
  return key ? `${env.MEDIA_PUBLIC_BASE_URL}/${key}` : null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @sevendays/api test -- src/services/admin-shared src/services/media`
Expected: PASS — the ten new admin-shared cases + the three new resolveMediaUrl cases + the pre-existing media cases.

- [ ] **Step 5: Full suite + type-flow gate + commit**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck`
Expected: all green (no route changed — the gate is the standing hygiene).
Run: `pnpm --filter @sevendays/api test` → expect **18 files / 166 tests passed + 3 skipped** (153 + 10 admin-shared cases + 3 resolveMediaUrl cases).
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/src/services/admin-shared.ts apps/api/src/services/admin-shared.test.ts apps/api/src/services/media.ts apps/api/src/services/media.test.ts
git commit -m "feat(api): admin write plumbing — failure union, 23505 mapper, media URL resolution (#137)"
```

---

### Task 2: Branches + print sizes admin CRUD (the pattern-defining pair)

**Files:**
- Create: `apps/api/src/services/admin-entities.ts`, `apps/api/src/routes/admin-branches.ts`, `apps/api/src/routes/admin-print-sizes.ts`
- Modify: `apps/api/src/routes/admin.ts` (the chain grows)
- Create (test-first): `apps/api/test/admin-entities.test.ts`

**Interfaces:**
- Consumes: Task 1's `admin-shared` exports; `createBranchSchema`/`updateBranchSchema`/`createPrintSizeSchema`/`updatePrintSizeSchema` (ticket 01); the M4 `requireSession` already mounted at `routes/admin.ts`'s root (ticket 02); `validatedJson`/`validatedParam`; `badRequest`/`notFound`.
- Produces (exact exports): `adminBranches` + `adminPrintSizes` routers — `GET /` (all rows), `GET /:id`, `POST /` (201), `PUT /:id` (200) — mounted at `/api/v1/admin/branches` + `/api/v1/admin/print-sizes`; `services/admin-entities.ts` gains `listAdminBranches`/`getAdminBranch`/`createAdminBranch`/`updateAdminBranch` and the print-size quartet.

**Not here:** attires/add-ons (Task 3 — same file grows); studio services (Task 4); any public route (the public `GET /api/v1/branches` keeps NO activity filter — that flip is #138's, fenced).

- [ ] **Step 1: Write the failing tests**

`apps/api/test/admin-entities.test.ts`:

```ts
import { branches, printSizes } from '@sevendays/db';
import { signUpSession } from './helpers/auth.js';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

describe('branches admin CRUD', () => {
  it('GET / lists ALL rows including a deactivated one', async () => {
    await db.insert(branches).values({
      name: 'Ghost Branch',
      address: 'Nowhere St',
      phone: '+63 900 000 009',
      isActive: false,
    });
    const { token } = await signUpSession(url, 'admin-branches-list@sevendays.test');
    const res = await app.request('/api/v1/admin/branches', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; name: string; isActive: boolean }[];
    expect(body).toHaveLength(3);
    const ghost = body.find((b) => b.name === 'Ghost Branch');
    expect(ghost?.isActive).toBe(false);
  });

  it('GET /:id returns the row', async () => {
    const { token } = await signUpSession(url, 'admin-branches-get@sevendays.test');
    const res = await app.request(`/api/v1/admin/branches/${ids.branchA}`, { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; name: string };
    expect(body.id).toBe(ids.branchA);
    expect(body.name).toBe('Test Branch A');
  });

  it('GET /:id answers the per-entity 404 for an unknown id', async () => {
    const { token } = await signUpSession(url, 'admin-branches-404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches/00000000-0000-4000-8000-000000000000',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Branch not found.' });
  });

  it('POST → 201 canonical read; omitted defaulted fields exercise their defaults', async () => {
    const { token } = await signUpSession(url, 'admin-branches-post@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'Fourth Branch', address: '4 New St', phone: '+63 900 000 004' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      name: string;
      isActive: boolean;
      acceptsWalkIns: boolean;
    };
    expect(typeof body.id).toBe('string');
    expect(body.name).toBe('Fourth Branch');
    expect(body.isActive).toBe(true);
    expect(body.acceptsWalkIns).toBe(false);
  });

  it('POST duplicate name → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-branches-dup@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'Test Branch A', address: '1 Test St', phone: '+63 900 000 001' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details: { path: string[]; message: string }[] };
    expect(body.error).toBe('That value is already in use.');
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('PUT is full-object and flips isActive — deactivation through the entity PUT', async () => {
    const { token } = await signUpSession(url, 'admin-branches-put@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch A',
          address: '1 Test St',
          phone: '+63 900 000 001',
          acceptsWalkIns: true,
          isActive: false,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; isActive: boolean; acceptsWalkIns: boolean };
    expect(body.isActive).toBe(false);
    expect(body.acceptsWalkIns).toBe(true);
  });

  it('PUT unknown id → 404', async () => {
    const { token } = await signUpSession(url, 'admin-branches-put404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches/00000000-0000-4000-8000-000000000000',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'X', address: 'Y', phone: 'Z', isActive: true }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Branch not found.' });
  });

  it('PUT name taken by another row → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-branches-putdup@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch B',
          address: '1 Test St',
          phone: '+63 900 000 001',
          isActive: true,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details: { path: string[]; message: string }[] };
    expect(body.error).toBe('That value is already in use.');
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 42 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('print sizes admin CRUD', () => {
  it('GET / lists ALL rows including a deactivated one', async () => {
    await db.insert(printSizes).values({ code: 'A3', description: 'A3 print', isActive: false });
    const { token } = await signUpSession(url, 'admin-sizes-list@sevendays.test');
    const res = await app.request('/api/v1/admin/print-sizes', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: string; isActive: boolean }[];
    expect(body.map((s) => s.code)).toContain('A3');
    expect(body.find((s) => s.code === 'A3')?.isActive).toBe(false);
  });

  it('POST → 201 canonical read', async () => {
    const { token } = await signUpSession(url, 'admin-sizes-post@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/print-sizes',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ code: 'A4', description: 'A4 print' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; code: string; isActive: boolean };
    expect(body.code).toBe('A4');
    expect(body.isActive).toBe(true);
  });

  it('POST duplicate code → 400 with the code field detail', async () => {
    const { token } = await signUpSession(url, 'admin-sizes-dup@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/print-sizes',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ code: '2R', description: 'clash' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['code'], message: 'already in use' }]);
  });

  it('PUT flips isActive → 200', async () => {
    const { token } = await signUpSession(url, 'admin-sizes-put@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/print-sizes/${ids.printSize2R}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ code: '2R', description: '2R print (3.5x5 in)', isActive: false }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { isActive: boolean }).isActive).toBe(false);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const { token } = await signUpSession(url, 'admin-sizes-404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/print-sizes/00000000-0000-4000-8000-000000000000',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Print size not found.' });
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/print-sizes',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: null }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/admin-entities`
Expected: FAIL — every route case gets Hono's 404 (nothing mounted at `/api/v1/admin/branches` / `print-sizes` yet), so the 200/201/400 assertions miss; the two 401 cases pass only against the not-found envelope shape? No — an unmounted path answers `{ error: 'Not found.' }` with 404, so they FAIL too (401 expected). `signUpSession` itself passes.

- [ ] **Step 3: Implement the two services (whole file, verbatim)**

`apps/api/src/services/admin-entities.ts`:

```ts
import type { Database } from '@sevendays/db';
import { branches, printSizes } from '@sevendays/db';
import type { CreateBranchInput, CreatePrintSizeInput, UpdateBranchInput, UpdatePrintSizeInput } from '@sevendays/types';
import { and, asc, eq, ne } from 'drizzle-orm';
import {
  conflict,
  guardUnique,
  type AdminCreateResult,
  type AdminWriteResult,
} from './admin-shared.js';

// Admin CRUD for the simple catalog entities (M5 #137): list/get/create/
// update per entity — full-object PUTs, deactivation as the isActive flip,
// no deletes. Each entity's unique column rides BOTH conflict mechanisms:
// a deterministic pre-check answers the common case, guardUnique maps the
// PG 23505 race through the same 400-with-field-details vocabulary. Routes
// stay thin — every business fact lives here.

type BranchRow = typeof branches.$inferSelect;
type PrintSizeRow = typeof printSizes.$inferSelect;

const BRANCH_UNIQUE: Record<string, string> = { branches_name_unique: 'name' };
const PRINT_SIZE_UNIQUE: Record<string, string> = { print_sizes_code_unique: 'code' };

// --- branches ---------------------------------------------------------------

export async function listAdminBranches(db: Database): Promise<BranchRow[]> {
  // Admin read: ALL rows including deactivated (spec § Route topology).
  return db.select().from(branches).orderBy(asc(branches.name));
}

export async function getAdminBranch(db: Database, id: string): Promise<BranchRow | null> {
  const [row] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return row ?? null;
}

export function createAdminBranch(
  db: Database,
  input: CreateBranchInput
): Promise<AdminCreateResult<BranchRow>> {
  return guardUnique(BRANCH_UNIQUE, async () => {
    const [row] = await db.insert(branches).values(input).returning();
    if (!row) throw new Error('insert branches: no row returned');
    return row;
  });
}

export async function updateAdminBranch(
  db: Database,
  id: string,
  input: UpdateBranchInput
): Promise<AdminWriteResult<BranchRow>> {
  const current = await getAdminBranch(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.name, input.name), ne(branches.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  return guardUnique(BRANCH_UNIQUE, async () => {
    const [row] = await db
      .update(branches)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    if (!row) throw new Error('update branches: no row returned');
    return row;
  });
}

// --- print sizes ------------------------------------------------------------

export async function listAdminPrintSizes(db: Database): Promise<PrintSizeRow[]> {
  return db.select().from(printSizes).orderBy(asc(printSizes.code));
}

export async function getAdminPrintSize(db: Database, id: string): Promise<PrintSizeRow | null> {
  const [row] = await db.select().from(printSizes).where(eq(printSizes.id, id)).limit(1);
  return row ?? null;
}

export function createAdminPrintSize(
  db: Database,
  input: CreatePrintSizeInput
): Promise<AdminCreateResult<PrintSizeRow>> {
  return guardUnique(PRINT_SIZE_UNIQUE, async () => {
    const [row] = await db.insert(printSizes).values(input).returning();
    if (!row) throw new Error('insert print_sizes: no row returned');
    return row;
  });
}

export async function updateAdminPrintSize(
  db: Database,
  id: string,
  input: UpdatePrintSizeInput
): Promise<AdminWriteResult<PrintSizeRow>> {
  const current = await getAdminPrintSize(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.code !== current.code) {
    const [clash] = await db
      .select({ id: printSizes.id })
      .from(printSizes)
      .where(and(eq(printSizes.code, input.code), ne(printSizes.id, id)))
      .limit(1);
    if (clash) return conflict('code');
  }
  return guardUnique(PRINT_SIZE_UNIQUE, async () => {
    const [row] = await db
      .update(printSizes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(printSizes.id, id))
      .returning();
    if (!row) throw new Error('update print_sizes: no row returned');
    return row;
  });
}
```

(Task 3 appends the attires and add-on services sections to this same file with the identical shape.)

- [ ] **Step 4: The two routers + the chain (verbatim)**

`apps/api/src/routes/admin-branches.ts`:

```ts
import { createBranchSchema, updateBranchSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminBranch,
  getAdminBranch,
  listAdminBranches,
  updateAdminBranch,
} from '../services/admin-entities.js';
import { badRequest, notFound } from '../services/errors.js';
import type { ApiEnv } from '../services/db.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. Mounted
// behind routes/admin.ts's ONE requireSession: the uniform 401 envelope
// precedes every validator here (per-family proof: test/admin-entities.test.ts).
// validatedParam runs before validatedJson — path before body; both answer
// the uniform { error, details } 400.
export const adminBranches = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminBranches(c.get('db')));
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminBranch(c.get('db'), id);
    if (!row) {
      return notFound(c, 'Branch not found.');
    }
    return c.json(row);
  })
  .post('/', validatedJson(createBranchSchema), async (c) => {
    const result = await createAdminBranch(c.get('db'), c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateBranchSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminBranch(c.get('db'), id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Branch not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
```

`apps/api/src/routes/admin-print-sizes.ts` — same shape with the pinned substitutions: schemas `createPrintSizeSchema`/`updatePrintSizeSchema`; service functions `listAdminPrintSizes`/`getAdminPrintSize`/`createAdminPrintSize`/`updateAdminPrintSize`; 404 wording `'Print size not found.'`; router name `adminPrintSizes`; the path in comments `/api/v1/admin/print-sizes`. (The doc comment block is copied verbatim with those names.)

In `apps/api/src/routes/admin.ts`, extend the import block (alphabetical) and the chain — the whole file after this task:

```ts
import { Hono } from 'hono';
import { requireSession } from '../services/auth.js';
import type { ApiEnv } from '../services/db.js';
import { adminBranches } from './admin-branches.js';
import { adminMedia } from './admin-media.js';
import { adminPrintSizes } from './admin-print-sizes.js';
import { galleryPhotos } from './gallery-photos.js';

// The gated admin sub-app (M5 § Route topology): ONE requireSession at this
// root, so the uniform 401 envelope precedes every child route's validation
// (the M4 ordering precedent). #136 seeded the root with the media routes;
// #137 extends this same sub-app with the entity routers — no re-mount, no
// second gate. Chained registration (ADR-0006 Hono RPC): see
// routes/branches.ts — a statement-style registration would silently drop
// the subtree from AppType.
export const admin = new Hono<ApiEnv>()
  .use('*', requireSession)
  .route('/media', adminMedia)
  .route('/branches', adminBranches)
  .route('/print-sizes', adminPrintSizes)
  .route('/gallery-photos', galleryPhotos);
```

- [ ] **Step 5: Run the suite to verify everything passes**

Run: `pnpm --filter @sevendays/api test`
Expected: **19 files / 181 tests passed + 3 skipped** (166 + 15: branches 9 + print sizes 6).

- [ ] **Step 6: Type-flow gate + commit**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck`
Expected: all green — AppType carries the two new routers (the spike-pinned param+json inference; the client drift-kill suite enforces under typecheck).
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/src/services/admin-entities.ts apps/api/src/routes/admin-branches.ts apps/api/src/routes/admin-print-sizes.ts apps/api/src/routes/admin.ts apps/api/test/admin-entities.test.ts
git commit -m "feat(api): admin branches + print sizes CRUD behind the gated subtree (#137)"
```

---

### Task 3: Attires + add-on services admin CRUD (deltas of the Task 2 pattern)

**Files:**
- Modify: `apps/api/src/services/admin-entities.ts` (append the two sections), `apps/api/src/routes/admin.ts` (chain grows)
- Create: `apps/api/src/routes/admin-attires.ts`, `apps/api/src/routes/admin-addon-services.ts`
- Modify (test-first): `apps/api/test/admin-entities.test.ts` (append two describes)

**Interfaces:**
- Consumes/produces: identical to Task 2 with the per-entity deltas below.

**Per-entity delta table (every identifier pinned — implement exactly as branches/print sizes with these substitutions):**

| Slot | attires | add-on services |
| --- | --- | --- |
| Router name / mount | `adminAttires` / `'/attires'` | `adminAddonServices` / `'/addon-services'` |
| Route file | `routes/admin-attires.ts` | `routes/admin-addon-services.ts` |
| Table / row type | `attires` (`AttireRow`) | `addonServices` (`AddonServiceRow`) |
| Create/update schemas | `createAttireSchema` / `updateAttireSchema` | `createAddonServiceSchema` / `updateAddonServiceSchema` |
| Service quartet | `listAdminAttires` / `getAdminAttire` / `createAdminAttire` / `updateAdminAttire` | `listAdminAddonServices` / `getAdminAddonService` / `createAdminAddonService` / `updateAdminAddonService` |
| Unique payload field | `name` | `name` |
| Constraint map constant | `ATTIRE_UNIQUE = { attires_name_unique: 'name' }` | `ADDON_UNIQUE = { addon_services_name_unique: 'name' }` |
| List order | `asc(attires.name)` | `asc(addonServices.name)` |
| 404 wording (both GET + PUT) | `'Attire not found.'` | `'Add-on Service not found.'` |
| no-row guard messages | `'insert attires: no row returned'` / `'update attires: no row returned'` | `'insert addon_services: no row returned'` / `'update addon_services: no row returned'` |
| Insert values shape | `input` (attire create = `{ name, isActive? }`) | `input` (add-on create = `{ name, description, priceCents, isActive? }`) |

The routers are byte-copies of `admin-print-sizes.ts` with those substitutions (including its doc comment, name-adjusted); `admin.ts` grows by one import + one chained `.route('/attires', adminAttires)` and one chained `.route('/addon-services', adminAddonServices)` APPENDED to the end of the chain (chain position across distinct prefixes is functionally irrelevant; each task appends — the grown chain's completeness is what Task 9's nine-router sweep proves). Biome sorts the import block — accept its order.

**Not here:** studio services + matrices (Task 4); gallery (Tasks 7–8); any public route change.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/test/admin-entities.test.ts` (after the print-sizes describe; same imports, plus `attires, addonServices` from `@sevendays/db`):

`describe('attires admin CRUD')` — six its, mirroring the print-sizes describes with the delta-table substitutions:

1. `'GET / lists ALL rows including a deactivated one'` — insert via db: `db.insert(attires).values({ name: 'Barong', isActive: false })`; GET → 200; body contains `Barong` with `isActive false`.
2. `'POST → 201 canonical read'` — POST `{ name: 'Americana' }` → 201; body `name 'Americana'`, `isActive true` (default exercised).
3. `'POST duplicate name → 400 with the name field detail'` — POST `{ name: 'Toga' }` (fixture row) → 400; `details` `[{ path: ['name'], message: 'already in use' }]`.
4. `'PUT flips isActive → 200'` — PUT `/api/v1/admin/attires/${ids.attireToga}` `{ name: 'Toga', isActive: false }` → 200; body `isActive false`.
5. `'GET /:id unknown → the per-entity 404'` — `'Attire not found.'`.
6. `'anonymous POST with a validation-bait body → the 401 envelope BEFORE validation'` — body `{ name: 42 }` → 401 exact envelope.

`describe('add-on services admin CRUD')` — six its, same six shapes:

1. list incl deactivated — the FIXTURE's `addonRetired` already serves (`isActive false`, name `'Retired Add-on'`): GET → 200; body contains it; no new db insert needed.
2. `'POST → 201 canonical read'` — POST `{ name: 'Props Styling', description: 'On-set props', priceCents: 8000 }` → 201; body `priceCents 8000`, `isActive true`.
3. `'POST duplicate name → 400 with the name field detail'` — POST `{ name: 'Makeup', description: 'x', priceCents: 1 }` → 400 `[{ path: ['name'], message: 'already in use' }]`.
4. `'PUT flips isActive → 200'` — PUT `/api/v1/admin/addon-services/${ids.addonMakeup}` full object `{ name: 'Makeup', description: 'On-site makeup service', priceCents: 12000, isActive: false }` → 200; body `isActive false`.
5. `'GET /:id unknown → the per-entity 404'` — `'Add-on Service not found.'`.
6. anonymous invalid-body 401 — body `{ priceCents: 'free' }` → 401 exact envelope.

Each test uses a fresh unique `signUpSession` email (`admin-attires-list@sevendays.test`, `admin-attires-post@sevendays.test`, `admin-attires-dup@sevendays.test`, `admin-attires-put@sevendays.test`, `admin-attires-404@sevendays.test`, `admin-attires-401@sevendays.test`, and the `admin-addons-*` six).

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/admin-entities`
Expected: FAIL — the twelve new cases get the unmounted 404; the fifteen Task 2 cases stay green.

- [ ] **Step 3: Implement (the delta table IS the spec)**

Append the two service sections to `admin-entities.ts` (shape = the print-sizes section with the table's substitutions — unique field `name`, `and`/`eq`/`ne` pre-check on `name` excluding self, `updatedAt: new Date()` on update). Create the two routers as byte-copies of `admin-print-sizes.ts` with the table's substitutions. Extend `admin.ts` with the two imports and the two chained `.route()` calls appended to the end of the chain.

- [ ] **Step 4: Run the suite to verify everything passes**

Run: `pnpm --filter @sevendays/api test`
Expected: **19 files / 193 tests passed + 3 skipped** (181 + 12).

- [ ] **Step 5: Type-flow gate + commit**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck` → all green.
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/src/services/admin-entities.ts apps/api/src/routes/admin-attires.ts apps/api/src/routes/admin-addon-services.ts apps/api/src/routes/admin.ts apps/api/test/admin-entities.test.ts
git commit -m "feat(api): admin attires + add-on services CRUD behind the gated subtree (#137)"
```

---

### Task 4: Studio services admin CRUD + the two matrix full-replaces

**Files:**
- Create (test-first): `apps/api/test/admin-studio-services.test.ts`
- Modify: `apps/api/src/services/admin-entities.ts` (append the studio-services section)
- Create: `apps/api/src/routes/admin-studio-services.ts`
- Modify: `apps/api/src/routes/admin.ts` (chain grows)

**Interfaces:**
- Consumes: Task 1's union + `invalidRefs`; `groupChildren` (`services/group-children.ts`); `createStudioServiceSchema`/`updateStudioServiceSchema` + `studioServiceBranchMatrixSchema`/`studioServiceAddonMatrixSchema` (ticket 01); `StudioServiceWithBranches` (the canonical read — reused as the admin read, assembled WITHOUT the public read's activity filters).
- Produces: `adminStudioServices` router — `GET /`, `GET /:id`, `POST /` (201), `PUT /:id` (200), **`PUT /:id/branches`** + **`PUT /:id/addons`** (the two matrices, both →200 with the refreshed canonical read); service exports `listAdminStudioServices`, `getAdminStudioService`, `createAdminStudioService`, `updateAdminStudioService`, `setStudioServiceBranchMatrix`, `setStudioServiceAddonMatrix`.

**Not here:** the public read's add-on activity filter (`services/studio-services.ts` — untouched); package/branch services (other tasks); any UI.

- [ ] **Step 1: Write the failing tests**

`apps/api/test/admin-studio-services.test.ts`:

```ts
import { branchStudioServices, studioServiceAddonServices } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { signUpSession } from './helpers/auth.js';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const authed = async (method: string, path: string, email: string, body?: unknown) => {
  const { token } = await signUpSession(url, email);
  return app.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(url)
  );
};

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

describe('studio services admin CRUD', () => {
  it('GET / lists ALL rows including the deactivated fixture, links embedded', async () => {
    const res = await authed('GET', '/api/v1/admin/studio-services', 'admin-services-list@sevendays.test');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      name: string;
      isActive: boolean;
      bookableBranchIds: string[];
      applicableAddonServiceIds: string[];
    }[];
    expect(body).toHaveLength(3);
    const retired = body.find((s) => s.name === 'Retired Studio Service');
    expect(retired?.isActive).toBe(false);
    expect(retired?.bookableBranchIds).toEqual([ids.branchA]);
  });

  it('GET /:id returns the assembled read (links embedded regardless of add-on activity)', async () => {
    // serviceStudio carries a link to the RETIRED add-on — the admin read
    // shows it (the public read filters that link; this surface must not).
    const res = await authed(
      'GET',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'admin-services-get@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { applicableAddonServiceIds: string[]; bookableBranchIds: string[] };
    expect(body.applicableAddonServiceIds).toEqual([ids.addonRetired]);
    expect(body.bookableBranchIds).toEqual([ids.branchA]);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/studio-services/00000000-0000-4000-8000-000000000000',
      'admin-services-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Studio Service not found.' });
  });

  it('POST → 201 canonical read with empty link embeds (create carries no link fields)', async () => {
    const res = await authed('POST', '/api/v1/admin/studio-services', 'admin-services-post@sevendays.test', {
      name: 'Photo Restoration',
      description: 'Restore old photographs.',
      priceCents: 45000,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      bookableBranchIds: string[];
      applicableAddonServiceIds: string[];
    };
    expect(typeof body.id).toBe('string');
    expect(body.bookableBranchIds).toEqual([]);
    expect(body.applicableAddonServiceIds).toEqual([]);
  });

  it('POST duplicate name → 400 with the name field detail', async () => {
    const res = await authed('POST', '/api/v1/admin/studio-services', 'admin-services-dup@sevendays.test', {
      name: 'Portraits & ID Photo',
      description: 'clash',
      priceCents: 1,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('PUT flips isActive → 200', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'admin-services-put@sevendays.test',
      { name: 'Studio Portraits', description: 'Module-level service fixture.', priceCents: 70000, isActive: false }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { isActive: boolean }).isActive).toBe(false);
  });

  it('PUT unknown id → 404', async () => {
    const res = await authed(
      'PUT',
      '/api/v1/admin/studio-services/00000000-0000-4000-8000-000000000000',
      'admin-services-put404@sevendays.test',
      { name: 'X', description: 'Y', priceCents: 1, isActive: true }
    );
    expect(res.status).toBe(404);
  });
});

describe('the branch matrix (PUT /:id/branches — full-replace, one transaction)', () => {
  it('full-replace round-trips: trim to one branch, then grow back — the diff rewrite', async () => {
    const first = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-a@sevendays.test',
      { branchIds: [ids.branchA] }
    );
    expect(first.status).toBe(200);
    expect(((await first.json()) as { bookableBranchIds: string[] }).bookableBranchIds).toEqual([ids.branchA]);

    const second = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-b@sevendays.test',
      { branchIds: [ids.branchB, ids.branchA] }
    );
    expect(second.status).toBe(200);
    const body = (await second.json()) as { bookableBranchIds: string[] };
    expect(body.bookableBranchIds.sort()).toEqual([ids.branchA, ids.branchB].sort());
  });

  it('an unknown branch id → 400 with the invalid detail AND the junction rows unchanged', async () => {
    const before = await db
      .select({ id: branchStudioServices.id })
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, ids.servicePortrait));
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-bad@sevendays.test',
      { branchIds: [ids.branchA, '00000000-0000-4000-8000-000000000000'] }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['branchIds']);
    const after = await db
      .select({ id: branchStudioServices.id })
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, ids.servicePortrait));
    expect(after).toHaveLength(before.length);
  });

  it('an empty payload removes every link (a service bookable nowhere is legal)', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-empty@sevendays.test',
      { branchIds: [] }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { bookableBranchIds: string[] }).bookableBranchIds).toEqual([]);
  });
});

describe('the add-on matrix (PUT /:id/addons — full-replace, one transaction)', () => {
  it('full-replace round-trips truthfully', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/addons`,
      'admin-matrix-addon-a@sevendays.test',
      { addonServiceIds: [ids.addonMakeup, ids.addonHairstyle] }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { applicableAddonServiceIds: string[] };
    expect(body.applicableAddonServiceIds.sort()).toEqual([ids.addonMakeup, ids.addonHairstyle].sort());
  });

  it('an unknown add-on id → 400 with the invalid detail AND the junction rows unchanged', async () => {
    const before = await db
      .select({ id: studioServiceAddonServices.id })
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, ids.servicePortrait));
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/addons`,
      'admin-matrix-addon-bad@sevendays.test',
      { addonServiceIds: ['00000000-0000-4000-8000-000000000000'] }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['addonServiceIds']);
    const after = await db
      .select({ id: studioServiceAddonServices.id })
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, ids.servicePortrait));
    expect(after).toHaveLength(before.length);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/studio-services',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priceCents: 'free' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/admin-studio-services`
Expected: FAIL — every route case gets the unmounted-path 404 (`{ error: 'Not found.' }`), so the 200/201/400/wording assertions miss.

- [ ] **Step 3: Append the service section (verbatim)**

Append to `apps/api/src/services/admin-entities.ts`. Extend the imports: `@sevendays/db` gains `branchStudioServices, studioServiceAddonServices, studioServices`; `@sevendays/types` gains `CreateStudioServiceInput, StudioServiceWithBranches, UpdateStudioServiceInput`; `drizzle-orm` gains `inArray`; `./admin-shared.js` gains `invalidRefs`; add `import { groupChildren } from './group-children.js';`.

```ts
// --- studio services + the two applicability matrices ----------------------

type StudioServiceRow = typeof studioServices.$inferSelect;

const STUDIO_SERVICE_UNIQUE: Record<string, string> = { studio_services_name_unique: 'name' };

/**
 * The admin assembly: the StudioServiceWithBranches shape with ALL links
 * embedded (bare ids) — assembled WITHOUT the public read's activity
 * filters: a live link on a deactivated add-on is a staff-visible fact
 * here (the booking form's matrix keeps its own filter). Batched
 * two-embed read (no N+1); junction order = the createdAt proxy + id
 * tiebreak (the public read's convention — membership is the fact).
 */
async function assembleAdminStudioServices(
  db: Database,
  serviceRows: StudioServiceRow[]
): Promise<StudioServiceWithBranches[]> {
  const serviceIds = serviceRows.map((s) => s.id);
  const linkRows = await db
    .select({
      studioServiceId: branchStudioServices.studioServiceId,
      branchId: branchStudioServices.branchId,
    })
    .from(branchStudioServices)
    .where(inArray(branchStudioServices.studioServiceId, serviceIds))
    .orderBy(asc(branchStudioServices.createdAt), asc(branchStudioServices.id));
  const addonRows = await db
    .select({
      studioServiceId: studioServiceAddonServices.studioServiceId,
      addonServiceId: studioServiceAddonServices.addonServiceId,
    })
    .from(studioServiceAddonServices)
    .where(inArray(studioServiceAddonServices.studioServiceId, serviceIds))
    .orderBy(asc(studioServiceAddonServices.createdAt), asc(studioServiceAddonServices.id));
  const branchesByService = groupChildren(linkRows, (row) => row.studioServiceId);
  const addonsByService = groupChildren(addonRows, (row) => row.studioServiceId);
  return serviceRows.map((s) => ({
    ...s,
    bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
    applicableAddonServiceIds: addonsByService(s.id).map((l) => l.addonServiceId),
  }));
}

export async function listAdminStudioServices(db: Database): Promise<StudioServiceWithBranches[]> {
  const serviceRows = await db.select().from(studioServices).orderBy(asc(studioServices.name));
  if (serviceRows.length === 0) return [];
  return assembleAdminStudioServices(db, serviceRows);
}

export async function getAdminStudioService(
  db: Database,
  id: string
): Promise<StudioServiceWithBranches | null> {
  const [row] = await db.select().from(studioServices).where(eq(studioServices.id, id)).limit(1);
  if (!row) return null;
  const [assembled] = await assembleAdminStudioServices(db, [row]);
  return assembled ?? null;
}

export async function createAdminStudioService(
  db: Database,
  input: CreateStudioServiceInput
): Promise<AdminCreateResult<StudioServiceWithBranches>> {
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, async () => {
    const [row] = await db.insert(studioServices).values(input).returning();
    if (!row) throw new Error('insert studio_services: no row returned');
    return row;
  });
  if (!result.ok) return result;
  const [assembled] = await assembleAdminStudioServices(db, [result.row]);
  if (!assembled) throw new Error('studio service create: assembly lost the row');
  return { ok: true, row: assembled };
}

export async function updateAdminStudioService(
  db: Database,
  id: string,
  input: UpdateStudioServiceInput
): Promise<AdminWriteResult<StudioServiceWithBranches>> {
  const [current] = await db.select().from(studioServices).where(eq(studioServices.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: studioServices.id })
      .from(studioServices)
      .where(and(eq(studioServices.name, input.name), ne(studioServices.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, async () => {
    const [row] = await db
      .update(studioServices)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(studioServices.id, id))
      .returning();
    if (!row) throw new Error('update studio_services: no row returned');
    return row;
  });
  if (!result.ok) return result;
  const [assembled] = await assembleAdminStudioServices(db, [result.row]);
  if (!assembled) throw new Error('studio service update: assembly lost the row');
  return { ok: true, row: assembled };
}

/**
 * The branch matrix (spec § Route topology): full-replace keyed by the
 * service — diff the payload against the existing rows and rewrite inside
 * ONE transaction (delete net-missing by row id, insert net-new).
 * Duplicate payload ids collapse (presence-row semantics). The existence
 * check is DEACTIVATION-BLIND by ruling: the admin composes from admin
 * reads, which include deactivated rows; activity filtering is read-side.
 */
export async function setStudioServiceBranchMatrix(
  db: Database,
  id: string,
  branchIds: string[]
): Promise<AdminWriteResult<StudioServiceWithBranches>> {
  const [service] = await db.select().from(studioServices).where(eq(studioServices.id, id)).limit(1);
  if (!service) return { ok: false, reason: 'not_found' };
  const known = await db.select({ id: branches.id }).from(branches).where(inArray(branches.id, branchIds));
  const knownIds = new Set(known.map((b) => b.id));
  const unknown = [...new Set(branchIds)].filter((branchId) => !knownIds.has(branchId));
  if (unknown.length > 0) {
    return invalidRefs(
      'Unknown branch in branchIds.',
      unknown.map((branchId) => ({ path: ['branchIds'], message: `unknown id ${branchId}` }))
    );
  }
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: branchStudioServices.id, branchId: branchStudioServices.branchId })
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, id));
    const existingIds = new Set(existing.map((l) => l.branchId));
    const payloadIds = new Set(branchIds);
    const toRemove = existing.filter((l) => !payloadIds.has(l.branchId)).map((l) => l.id);
    if (toRemove.length > 0) {
      await tx.delete(branchStudioServices).where(inArray(branchStudioServices.id, toRemove));
    }
    const toAdd = [...payloadIds].filter((branchId) => !existingIds.has(branchId));
    if (toAdd.length > 0) {
      await tx
        .insert(branchStudioServices)
        .values(toAdd.map((branchId) => ({ studioServiceId: id, branchId })));
    }
  });
  const read = await getAdminStudioService(db, id);
  if (!read) throw new Error('matrix save: read-back found no service row');
  return { ok: true, row: read };
}

/** The add-on matrix — the branch matrix one junction over (same contract). */
export async function setStudioServiceAddonMatrix(
  db: Database,
  id: string,
  addonServiceIds: string[]
): Promise<AdminWriteResult<StudioServiceWithBranches>> {
  const [service] = await db.select().from(studioServices).where(eq(studioServices.id, id)).limit(1);
  if (!service) return { ok: false, reason: 'not_found' };
  const known = await db
    .select({ id: addonServices.id })
    .from(addonServices)
    .where(inArray(addonServices.id, addonServiceIds));
  const knownIds = new Set(known.map((a) => a.id));
  const unknown = [...new Set(addonServiceIds)].filter((addonId) => !knownIds.has(addonId));
  if (unknown.length > 0) {
    return invalidRefs(
      'Unknown add-on in addonServiceIds.',
      unknown.map((addonId) => ({ path: ['addonServiceIds'], message: `unknown id ${addonId}` }))
    );
  }
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: studioServiceAddonServices.id,
        addonServiceId: studioServiceAddonServices.addonServiceId,
      })
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, id));
    const existingIds = new Set(existing.map((l) => l.addonServiceId));
    const payloadIds = new Set(addonServiceIds);
    const toRemove = existing.filter((l) => !payloadIds.has(l.addonServiceId)).map((l) => l.id);
    if (toRemove.length > 0) {
      await tx.delete(studioServiceAddonServices).where(inArray(studioServiceAddonServices.id, toRemove));
    }
    const toAdd = [...payloadIds].filter((addonId) => !existingIds.has(addonId));
    if (toAdd.length > 0) {
      await tx
        .insert(studioServiceAddonServices)
        .values(toAdd.map((addonId) => ({ studioServiceId: id, addonServiceId: addonId })));
    }
  });
  const read = await getAdminStudioService(db, id);
  if (!read) throw new Error('matrix save: read-back found no service row');
  return { ok: true, row: read };
}
```

- [ ] **Step 4: The router (whole file, verbatim) + the chain**

`apps/api/src/routes/admin-studio-services.ts`:

```ts
import {
  createStudioServiceSchema,
  studioServiceAddonMatrixSchema,
  studioServiceBranchMatrixSchema,
  updateStudioServiceSchema,
} from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminStudioService,
  getAdminStudioService,
  listAdminStudioServices,
  setStudioServiceAddonMatrix,
  setStudioServiceBranchMatrix,
  updateAdminStudioService,
} from '../services/admin-entities.js';
import { badRequest, notFound } from '../services/errors.js';
import type { ApiEnv } from '../services/db.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. The two
// matrix PUTs ride the same gate (routes/admin.ts's ONE requireSession); each
// answers the refreshed canonical read, so the editor state round-trips.
export const adminStudioServices = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminStudioServices(c.get('db')));
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminStudioService(c.get('db'), id);
    if (!row) {
      return notFound(c, 'Studio Service not found.');
    }
    return c.json(row);
  })
  .post('/', validatedJson(createStudioServiceSchema), async (c) => {
    const result = await createAdminStudioService(c.get('db'), c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateStudioServiceSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminStudioService(c.get('db'), id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Studio Service not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  )
  .put(
    '/:id/branches',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(studioServiceBranchMatrixSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { branchIds } = c.req.valid('json');
      const result = await setStudioServiceBranchMatrix(c.get('db'), id, branchIds);
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Studio Service not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  )
  .put(
    '/:id/addons',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(studioServiceAddonMatrixSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { addonServiceIds } = c.req.valid('json');
      const result = await setStudioServiceAddonMatrix(c.get('db'), id, addonServiceIds);
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Studio Service not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
```

In `apps/api/src/routes/admin.ts`: add the import and append `.route('/studio-services', adminStudioServices)` to the end of the chain.

- [ ] **Step 5: Run the suite to verify everything passes**

Run: `pnpm --filter @sevendays/api test`
Expected: **20 files / 206 tests passed + 3 skipped** (193 + 13).

- [ ] **Step 6: Type-flow gate + commit**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck` → all green.
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/src/services/admin-entities.ts apps/api/src/routes/admin-studio-services.ts apps/api/src/routes/admin.ts apps/api/test/admin-studio-services.test.ts
git commit -m "feat(api): admin studio services CRUD + the two matrix full-replaces (#137)"
```

---

### Task 5: Package admin reads + the atomic save (ordering, junctions, slugs, rollback)

**Files:**
- Create (test-first): `apps/api/test/helpers/r2-stub.ts`, `apps/api/test/admin-packages.test.ts`
- Create: `apps/api/src/services/admin-packages.ts`
- Modify: `apps/api/src/services/service-packages.ts` (export `assemblePackageRead` + one comment sentence — the ONLY edit to this file), `apps/api/src/routes/admin.ts` (chain grows)
- Create: `apps/api/src/routes/admin-service-packages.ts`

**Interfaces:**
- Consumes: `assemblePackageRead` (now exported); `slugifyName` from `@sevendays/db/catalog-rows` (subpath export `./catalog-rows` — probed in `packages/db/package.json`); ticket 01's `createServicePackageSchema`/`updateServicePackageSchema` + `servicePackageReadSchema`; `commitUpload` + `resolveMediaUrl`; Task 1's union + `guardUnique` + `AdminSaveError`.
- Produces: `adminServicePackages` router — `GET /` (all rows, full composition, `coverImageUrl` resolved), `GET /:id`, `POST /` (201; slug generated), `PUT /:id` (200; slug editable) — and the service exports `listAdminPackages(db, env)`, `getAdminPackage(db, env, id)`, `createAdminPackage(db, env, input)`, `updateAdminPackage(db, env, id, input)` with `SaveEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>`.
- **Load-bearing ordering pin:** the admin composition reads order inclusions AND junctions by `(position, id)` — NOT by id. The save rewrites children with FRESH uuids, so an id-ordering scrambles after the first PUT; positions are the maintained order (contiguous since ticket 01's backfill). The public reads keep their `created_at`/id keys until #138 (untouched here).

**Not here:** the public package reads (untouched — #138 swaps them); the old-cover-key deletion + the presence-encoded cover tests (Task 6 — the bind path itself is complete here); any read-shape change (`servicePackageReadSchema` as-is).

- [ ] **Step 1: The one edit to the public read service (verbatim)**

In `apps/api/src/services/service-packages.ts`, change the assembly's declaration line from:

```ts
function assemblePackageRead(
```

to:

```ts
export function assemblePackageRead(
```

and extend its docstring — replace the final parenthetical sentence:

```text
 * junctions by created_at + id, frames by frameNumber — the position
 * columns exist since M5 #135 but become the read keys only when #138
 * switches the assembly); assembly never re-sorts (groupChildren contract).
```

with:

```text
 * junctions by created_at + id, frames by frameNumber — the position
 * columns exist since M5 #135 but become the read keys only when #138
 * switches the assembly); assembly never re-sorts (groupChildren contract).
 * Exported for #137's admin reads: the admin assembles the FULL
 * composition (no activity filter) through this same stitch — callers own
 * the ordering, so the admin passes (position, id)-ordered rows.
```

- [ ] **Step 2: The R2 stub helper (whole file, verbatim)**

`apps/api/test/helpers/r2-stub.ts`:

```ts
// Recording R2Bucket stub for the write tests that ride the commit contract
// (#137): the Map-backed shape of services/media.test.ts's stubBucket as a
// shared helper. head/get feed commitUpload's verify, put records the
// promote (key + options), delete records deletions — assertions run
// against the recorded calls, so promote/delete semantics are pinned
// without a mock's looseness.
export function stubCommitBucket(initial: Record<string, { size: number; contentType: string }> = {}) {
  const objects = new Map(Object.entries(initial).map(([key, meta]) => [key, { ...meta, deleted: false }]));
  const putCalls: { key: string; value: unknown; options: unknown }[] = [];
  const deleteCalls: string[] = [];
  const bucket = {
    async head(key: string) {
      const obj = objects.get(key);
      if (!obj || obj.deleted) return null;
      return { key, size: obj.size, httpMetadata: { contentType: obj.contentType } };
    },
    async get(key: string) {
      const obj = objects.get(key);
      if (!obj || obj.deleted) return null;
      return { key, size: obj.size, httpMetadata: { contentType: obj.contentType }, body: 'staging-bytes' };
    },
    async put(key: string, value: unknown, options: unknown) {
      putCalls.push({ key, value, options });
      objects.set(key, { size: 1, contentType: 'image/jpeg' });
      return { key };
    },
    async delete(keys: string | string[]) {
      for (const key of [keys].flat()) {
        deleteCalls.push(key);
        const existing = objects.get(key);
        if (existing) objects.set(key, { ...existing, deleted: true });
      }
    },
  };
  return { bucket: bucket as unknown as R2Bucket, putCalls, deleteCalls };
}
```

- [ ] **Step 3: Write the failing tests**

`apps/api/test/admin-packages.test.ts` (the save builders are module-local; every POST/PUT carries the FULL payload — full-object semantics):

```ts
import { frames, packageInclusionAttires, packageInclusions, servicePackages } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { signUpSession } from './helpers/auth.js';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const authed = async (method: string, path: string, email: string, body?: unknown) => {
  const { token } = await signUpSession(url, email);
  return app.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(url)
  );
};

const save = (overrides: Record<string, unknown> = {}) => ({
  name: 'Deluxe Package',
  description: 'The full graduation set.',
  priceCents: 150000,
  durationMinutes: null,
  isActive: true,
  isFeatured: false,
  frames: [{ id: 'frame-1' }],
  inclusions: [
    {
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: ids.printSize11x14,
      frameId: 'frame-1',
      attireIds: [ids.attireFilipiniana, ids.attireExecutive],
      description: 'The framed 11x14',
    },
    {
      kind: 'print',
      quantity: 4,
      printSizeId: ids.printSize2R,
      attireIds: [ids.attireToga],
      description: null,
    },
  ],
  ...overrides,
});

// The full-object PUT payload for the fixture package (its current fields).
const put = (overrides: Record<string, unknown> = {}) =>
  save({
    name: 'Combined Package',
    description: 'Framed picture with prints and privileges',
    priceCents: 150000,
    slug: 'combined-package',
    ...overrides,
  });

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

describe('package admin reads', () => {
  it('GET / lists ALL rows including the deactivated fixture, full composition, resolved null cover', async () => {
    const res = await authed('GET', '/api/v1/admin/service-packages', 'admin-pkg-list@sevendays.test');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      slug: string;
      isActive: boolean;
      coverImageUrl: string | null;
      coverImageKey?: string;
      inclusions: unknown[];
      frames: unknown[];
    }[];
    expect(body).toHaveLength(3);
    const retired = body.find((p) => p.slug === 'retired-package');
    expect(retired?.isActive).toBe(false);
    expect(retired?.inclusions).toHaveLength(0);
    const combined = body.find((p) => p.slug === 'combined-package');
    expect(combined?.inclusions).toHaveLength(4);
    expect(combined?.frames).toHaveLength(1);
    expect(combined?.coverImageUrl).toBeNull();
    expect('coverImageKey' in (combined ?? {})).toBe(false);
  });

  it('GET /:id returns the assembled read', async () => {
    const res = await authed(
      'GET',
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      'admin-pkg-get@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; slug: string };
    expect(body.id).toBe(ids.packageCombined);
    expect(body.slug).toBe('combined-package');
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/service-packages/00000000-0000-4000-8000-000000000000',
      'admin-pkg-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Package not found.' });
  });
});

describe('the atomic package save — create', () => {
  it('POST full save → 201; slug generated, frames renumbered, inclusions in array order, junctions in attire order', async () => {
    const res = await authed('POST', '/api/v1/admin/service-packages', 'admin-pkg-post@sevendays.test', save());
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      slug: string;
      coverImageUrl: string | null;
      frames: { id: string; frameNumber: number }[];
      inclusions: { kind: string; attires: { name: string }[] }[];
    };
    expect(body.slug).toBe('deluxe-package');
    expect(body.coverImageUrl).toBeNull();
    expect(body.frames).toHaveLength(1);
    expect(body.frames[0]?.frameNumber).toBe(1);
    expect(body.inclusions[0]?.kind).toBe('framed_picture');
    expect(body.inclusions[1]?.kind).toBe('print');
    expect(body.inclusions[0]?.attires.map((a) => a.name)).toEqual(['Filipiniana', 'Executive']);
  });

  it('POST name collision → 400 with the name field detail', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-dup@sevendays.test',
      save({ name: 'Combined Package' })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('POST a different name that slugs identically → 400 with the SLUG field detail (the OR pre-check names the field that clashed)', async () => {
    await authed('POST', '/api/v1/admin/service-packages', 'admin-pkg-slug-a@sevendays.test', save());
    // 'deluxe package' is a distinct NAME but slugifies to the SAME
    // 'deluxe-package' — the pre-check's OR query finds the row and names
    // the slug (the true 23505 race is the same vocabulary through
    // guardUnique, unit-proven in admin-shared.test.ts).
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-slug-b@sevendays.test',
      save({ name: 'deluxe package' })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['slug'], message: 'already in use' }]);
  });

  it('POST with an unknown printSizeId → 400 AND nothing written (no partial junction writes)', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-badref@sevendays.test',
      save({
        inclusions: [
          {
            kind: 'print',
            quantity: 1,
            printSizeId: '00000000-0000-4000-8000-000000000000',
            attireIds: [ids.attireToga],
            description: null,
          },
        ],
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['inclusions']);
    expect(body.details[0]?.message).toContain('00000000-0000-4000-8000-000000000000');
    const [frameRows, inclusionRows] = await Promise.all([
      db.select({ id: frames.id }).from(frames),
      db.select({ id: packageInclusions.id }).from(packageInclusions),
    ]);
    expect(frameRows).toHaveLength(2); // the fixtures' only frames
    expect(inclusionRows).toHaveLength(5); // the fixtures' only inclusions
    const saved = await db
      .select({ id: servicePackages.id })
      .from(servicePackages)
      .where(eq(servicePackages.name, 'Deluxe Package'));
    expect(saved).toHaveLength(0);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/service-packages',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priceCents: -1 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('the atomic package save — update', () => {
  it('PUT reorders frames and inclusions — array order becomes frameNumber/position, children rewritten', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      'admin-pkg-put@sevendays.test',
      put({
        frames: [{ id: 'fr-new-a' }, { id: 'fr-new-b' }],
        inclusions: [
          {
            kind: 'framed_picture',
            quantity: 1,
            printSizeId: ids.printSize11x14,
            frameId: 'fr-new-b',
            attireIds: [ids.attireExecutive, ids.attireFilipiniana],
            description: 'Moved frame',
          },
          {
            kind: 'framed_picture',
            quantity: 1,
            printSizeId: ids.printSize11x14,
            frameId: 'fr-new-a',
            attireIds: [ids.attireToga],
            description: null,
          },
          {
            kind: 'privilege',
            quantity: null,
            printSizeId: null,
            attireIds: [],
            description: 'High Resolution soft copies',
          },
        ],
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      frames: { frameNumber: number }[];
      inclusions: { kind: string; frameId: string | null; attires: { name: string }[] }[];
    };
    expect(body.frames.map((f) => f.frameNumber)).toEqual([1, 2]);
    expect(body.inclusions.map((i) => i.kind)).toEqual(['framed_picture', 'framed_picture', 'privilege']);
    expect(body.inclusions[0]?.attires.map((a) => a.name)).toEqual(['Executive', 'Filipiniana']);
    expect(body.inclusions[2]?.attires).toEqual([]);
    // children were REWRITTEN — the two framed inclusions ride fresh frame ids
    expect(body.inclusions[0]?.frameId).not.toBeNull();
    expect(body.inclusions[1]?.frameId).not.toBeNull();
    expect(body.inclusions[0]?.frameId).not.toBe(body.inclusions[1]?.frameId);
  });

  it('PUT slug taken by another row → 400 with the slug field detail', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'admin-pkg-slugtaken@sevendays.test',
      put({ slug: 'combined-package' })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['slug'], message: 'already in use' }]);
  });

  it('PUT slug failing the format → 400 with the slug field detail', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'admin-pkg-slugfmt@sevendays.test',
      put({ slug: 'Simple Package!' })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['slug']);
  });

  it('the old slug 404s publicly after a PUT rename — through the EXISTING public route', async () => {
    const created = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-slugmove@sevendays.test',
      save({ name: 'Fresh Package' })
    );
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { id: string };
    const publicBefore = await app.request('/api/v1/service-packages/fresh-package', undefined, testEnv(url));
    expect(publicBefore.status).toBe(200);
    const renamed = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${createdBody.id}`,
      'admin-pkg-slugmove2@sevendays.test',
      save({ name: 'Fresh Package', slug: 'renamed-package' })
    );
    expect(renamed.status).toBe(200);
    const publicOld = await app.request('/api/v1/service-packages/fresh-package', undefined, testEnv(url));
    expect(publicOld.status).toBe(404);
    expect(await publicOld.json()).toEqual({ error: 'Package not found.' });
    const publicNew = await app.request('/api/v1/service-packages/renamed-package', undefined, testEnv(url));
    expect(publicNew.status).toBe(200);
  });

  it('PUT with an unknown reference → 400 AND the whole save rolled back (entity fields included)', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'admin-pkg-rollback@sevendays.test',
      put({
        name: 'Simple Package Renamed',
        slug: 'simple-package',
        inclusions: [
          {
            kind: 'print',
            quantity: 2,
            printSizeId: '00000000-0000-4000-8000-000000000000',
            attireIds: [ids.attireToga],
            description: null,
          },
        ],
      })
    );
    expect(res.status).toBe(400);
    const rows = await db
      .select({ name: servicePackages.name })
      .from(servicePackages)
      .where(eq(servicePackages.id, ids.packageSimple));
    expect(rows[0]?.name).toBe('Simple Package'); // the rename rolled back too
    const inclusions = await db
      .select({ id: packageInclusions.id })
      .from(packageInclusions)
      .where(eq(packageInclusions.servicePackageId, ids.packageSimple));
    expect(inclusions).toHaveLength(1); // the original inclusion survives
  });

  it('the old junction rows are gone after a rewrite (junction pairs match the payload)', async () => {
    await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      'admin-pkg-junctions@sevendays.test',
      put({
        inclusions: [
          {
            kind: 'privilege',
            quantity: null,
            printSizeId: null,
            attireIds: [],
            description: 'High Resolution soft copies',
          },
        ],
        frames: [],
      })
    );
    const inclusionRows = await db
      .select({ id: packageInclusions.id })
      .from(packageInclusions)
      .where(eq(packageInclusions.servicePackageId, ids.packageCombined));
    expect(inclusionRows).toHaveLength(1);
    const junctions = await db
      .select({ id: packageInclusionAttires.id })
      .from(packageInclusionAttires)
      .where(
        inArray(
          packageInclusionAttires.inclusionId,
          inclusionRows.map((r) => r.id)
        )
      );
    // The cascaded rewrite left zero junction rows for the one remaining
    // (privilege) inclusion — the fixture's framed/print pairs are gone.
    expect(junctions).toHaveLength(0);
  });
});
```

(with `inArray` in the `drizzle-orm` import — already required by the file above; biome orders it.)

- [ ] **Step 4: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/admin-packages`
Expected: FAIL — every route case gets the unmounted-path 404.

- [ ] **Step 5: Implement the service (whole file, verbatim)**

`apps/api/src/services/admin-packages.ts`:

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
import { slugifyName } from '@sevendays/db/catalog-rows';
import type {
  CreateServicePackageInput,
  PackageSaveInclusionInput,
  ServicePackageRead,
  ServicePackageWithInclusions,
  UpdateServicePackageInput,
} from '@sevendays/types';
import { and, asc, eq, inArray, ne, or } from 'drizzle-orm';
import type { Env } from '../env.js';
import {
  AdminSaveError,
  conflict,
  guardUnique,
  type AdminCreateResult,
  type AdminWriteFailure,
  type AdminWriteResult,
} from './admin-shared.js';
import { commitUpload, resolveMediaUrl } from './media.js';
import { assemblePackageRead } from './service-packages.js';

// The package write model (M5 #137, spec § Mutation shapes): one atomic
// save — entity fields + coverImageKey + frames[] + inclusions[] in ONE
// transaction. Array order is the order: frameNumber = frames array order,
// inclusion position = array order, junction position = attire order per
// inclusion (all 1-based). Children are REWRITTEN (delete + insert) inside
// the transaction — nothing references frame/inclusion ids durably
// (appointments snapshot at the package level; reads re-assemble per
// request), so row-id churn is invisible. A bad reference throws
// AdminSaveError INSIDE the transaction — a returned failure value would
// COMMIT the rows already written; the throw is what makes drizzle roll
// back (the "no partial junction writes" guarantee). The whole transaction
// rides guardUnique so a raced 23505 lands in the same 400 vocabulary.

type PackageRow = typeof servicePackages.$inferSelect;
type Detail = { path: string[]; message: string };

export type SaveEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>;

const PACKAGE_UNIQUE: Record<string, string> = {
  service_packages_name_unique: 'name',
  service_packages_slug_unique: 'slug',
};

// The advanced-slug format (agent ruling): exactly the alphabet
// slugifyName emits — lowercase letters/digits joined by single dashes.
// Keeps the /packages/:slug URL space stable; the editor's break-links
// warning precedes this in the UI.
const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function toRead(row: ServicePackageWithInclusions, env: SaveEnv): ServicePackageRead {
  // The wire rename (ADR-0019): strip the raw key, resolve the absolute URL.
  const { coverImageKey, ...rest } = row;
  return { ...rest, coverImageUrl: resolveMediaUrl(env, coverImageKey) };
}

/**
 * The five reads + stitch scoped to the given rows — the public readers'
 * query bodies with NO activity filter anywhere (admin reads include
 * deactivated rows and always assemble the FULL composition). Order pin:
 * inclusions AND junctions by (position, id) — the save rewrites children
 * with fresh uuids, so an id-ordering would scramble after the first PUT;
 * positions are the maintained order. (The public reads keep created_at/id
 * until #138.)
 */
async function fetchComposition(
  db: Database,
  packageRows: PackageRow[]
): Promise<ServicePackageWithInclusions[]> {
  const packageIds = packageRows.map((p) => p.id);
  const inclusionRows = await db
    .select()
    .from(packageInclusions)
    .where(inArray(packageInclusions.servicePackageId, packageIds))
    .orderBy(asc(packageInclusions.position), asc(packageInclusions.id));
  const inclusionIds = inclusionRows.map((i) => i.id);
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
          .where(inArray(packageInclusionAttires.inclusionId, inclusionIds))
          .orderBy(asc(packageInclusionAttires.position), asc(packageInclusionAttires.id))
      : [];
  const printSizeIds = [
    ...new Set(inclusionRows.map((i) => i.printSizeId).filter((id): id is string => id !== null)),
  ];
  const printSizeRows =
    printSizeIds.length > 0
      ? await db.select().from(printSizes).where(inArray(printSizes.id, printSizeIds))
      : [];
  const frameRows = await db
    .select()
    .from(frames)
    .where(inArray(frames.servicePackageId, packageIds))
    .orderBy(asc(frames.frameNumber));
  return assemblePackageRead(packageRows, inclusionRows, junctionRows, printSizeRows, frameRows);
}

export async function listAdminPackages(db: Database, env: SaveEnv): Promise<ServicePackageRead[]> {
  const packageRows = await db.select().from(servicePackages).orderBy(asc(servicePackages.name));
  if (packageRows.length === 0) return [];
  const assembled = await fetchComposition(db, packageRows);
  return assembled.map((row) => toRead(row, env));
}

export async function getAdminPackage(
  db: Database,
  env: SaveEnv,
  id: string
): Promise<ServicePackageRead | null> {
  const [row] = await db.select().from(servicePackages).where(eq(servicePackages.id, id)).limit(1);
  if (!row) return null;
  const [assembled] = await fetchComposition(db, [row]);
  return assembled ? toRead(assembled, env) : null;
}

type CoverResolution = { ok: true; finalKey: string | null | undefined } | AdminWriteFailure;

/**
 * The cover commit (controller ruling): HEAD-verify through ticket 02's
 * commitUpload ONLY when a key is present — presence-encoding makes
 * "changed" structural (stored keys are immutable final keys, inputs are
 * staging keys, and the staging-key regex rejects final keys, so a present
 * string is always a new bind). undefined = unchanged, null = clear,
 * string = bind/replace. A commit failure re-paths its details onto the
 * payload field and resolves as the conflict failure (→ 400). Runs BEFORE
 * the transaction — bucket I/O never holds a tx open.
 */
async function resolveCover(env: SaveEnv, key: string | null | undefined): Promise<CoverResolution> {
  if (key === undefined) return { ok: true, finalKey: undefined };
  if (key === null) return { ok: true, finalKey: null };
  const commit = await commitUpload(env.MEDIA_BUCKET, { stagingKey: key, purpose: 'package-cover' });
  if (!commit.ok) {
    return {
      ok: false,
      reason: 'conflict',
      message: commit.message,
      details: (commit.details ?? [{ path: ['key'], message: commit.message }]).map(
        (detail): Detail => ({ path: ['coverImageKey'], message: detail.message })
      ),
    };
  }
  return { ok: true, finalKey: commit.finalKey };
}

function entityFields(input: CreateServicePackageInput | UpdateServicePackageInput) {
  return {
    name: input.name,
    description: input.description,
    priceCents: input.priceCents,
    durationMinutes: input.durationMinutes,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
  };
}

/**
 * The transaction body's order is deliberate: current-row resolve → name/
 * slug pre-checks → ROW WRITE → reference checks → children rewrite. The
 * reference checks run AFTER the row write so the rollback is observable —
 * an invalid reference throwing once the entity row is written is exactly
 * what the PUT-rollback test asserts (the rename did not stick).
 */
async function runPackageSave(
  db: Database,
  env: SaveEnv,
  args: {
    input: CreateServicePackageInput | UpdateServicePackageInput;
    slug: string;
    finalKey: string | null | undefined;
    updateId: string | null;
  }
): Promise<AdminWriteResult<ServicePackageRead>> {
  let packageId = args.updateId ?? '';
  let oldCoverKey: string | null = null;
  const outcome = await guardUnique(PACKAGE_UNIQUE, () =>
    db.transaction(async (tx): Promise<{ ok: true } | { ok: false; reason: 'not_found' }> => {
      if (args.updateId !== null) {
        const [current] = await tx
          .select()
          .from(servicePackages)
          .where(eq(servicePackages.id, args.updateId))
          .limit(1);
        if (!current) return { ok: false, reason: 'not_found' };
        oldCoverKey = current.coverImageKey;
        if (args.input.name !== current.name) {
          const [nameClash] = await tx
            .select({ id: servicePackages.id })
            .from(servicePackages)
            .where(and(eq(servicePackages.name, args.input.name), ne(servicePackages.id, args.updateId)))
            .limit(1);
          if (nameClash) throw new AdminSaveError(conflict('name'));
        }
        if (args.slug !== current.slug) {
          const [slugClash] = await tx
            .select({ id: servicePackages.id })
            .from(servicePackages)
            .where(and(eq(servicePackages.slug, args.slug), ne(servicePackages.id, args.updateId)))
            .limit(1);
          if (slugClash) throw new AdminSaveError(conflict('slug'));
        }
        const storedCover = args.finalKey === undefined ? current.coverImageKey : args.finalKey;
        await tx
          .update(servicePackages)
          .set({
            ...entityFields(args.input),
            slug: args.slug,
            coverImageKey: storedCover,
            updatedAt: new Date(),
          })
          .where(eq(servicePackages.id, args.updateId));
      } else {
        const [clash] = await tx
          .select({ name: servicePackages.name })
          .from(servicePackages)
          .where(or(eq(servicePackages.name, args.input.name), eq(servicePackages.slug, args.slug)))
          .limit(1);
        if (clash) {
          // The spec's ruling: a create-time slug collision IS a name
          // collision. They part ways only when a different name collapses
          // to the same slug — name whichever field actually clashed.
          throw new AdminSaveError(conflict(clash.name === args.input.name ? 'name' : 'slug'));
        }
        const [created] = await tx
          .insert(servicePackages)
          .values({ ...entityFields(args.input), slug: args.slug, coverImageKey: args.finalKey ?? null })
          .returning({ id: servicePackages.id });
        if (!created) throw new Error('insert service_packages: no row returned');
        packageId = created.id;
      }

      // Reference resolution (inside the tx — a throw rolls back everything).
      const printSizeIds = [
        ...new Set(
          args.input.inclusions.map((i) => i.printSizeId).filter((id): id is string => id !== null)
        ),
      ];
      if (printSizeIds.length > 0) {
        const known = await tx
          .select({ id: printSizes.id })
          .from(printSizes)
          .where(inArray(printSizes.id, printSizeIds));
        const knownIds = new Set(known.map((r) => r.id));
        const missing = printSizeIds.filter((lookupId) => !knownIds.has(lookupId));
        if (missing.length > 0) {
          throw new AdminSaveError({
            ok: false,
            reason: 'invalid',
            message: 'Unknown print size in inclusions.',
            details: missing.map(
              (lookupId): Detail => ({ path: ['inclusions'], message: `unknown printSizeId ${lookupId}` })
            ),
          });
        }
      }
      const attireIds = [...new Set(args.input.inclusions.flatMap((i) => i.attireIds))];
      if (attireIds.length > 0) {
        const known = await tx.select({ id: attires.id }).from(attires).where(inArray(attires.id, attireIds));
        const knownIds = new Set(known.map((r) => r.id));
        const missing = attireIds.filter((attireId) => !knownIds.has(attireId));
        if (missing.length > 0) {
          throw new AdminSaveError({
            ok: false,
            reason: 'invalid',
            message: 'Unknown attire in inclusions.',
            details: missing.map(
              (attireId): Detail => ({ path: ['inclusions'], message: `unknown attireId ${attireId}` })
            ),
          });
        }
      }

      // Rewrite the children. Deleting inclusions cascades their junction
      // rows (package_inclusion_attires.inclusion_id ON DELETE CASCADE);
      // the explicit order is inclusions BEFORE frames (inclusions hold the
      // frame FK).
      await tx.delete(packageInclusions).where(eq(packageInclusions.servicePackageId, packageId));
      await tx.delete(frames).where(eq(frames.servicePackageId, packageId));
      const frameRows =
        args.input.frames.length > 0
          ? await tx
              .insert(frames)
              .values(
                args.input.frames.map((frame, index) => ({
                  servicePackageId: packageId,
                  frameNumber: index + 1,
                }))
              )
              .returning({ id: frames.id })
          : [];
      const frameIdByToken = new Map<string, string>();
      args.input.frames.forEach((frame, index) => {
        const row = frameRows[index];
        if (row) frameIdByToken.set(frame.id, row.id);
      });
      const inclusionRows =
        args.input.inclusions.length > 0
          ? await tx
              .insert(packageInclusions)
              .values(
                args.input.inclusions.map((inclusion: PackageSaveInclusionInput, index) => ({
                  servicePackageId: packageId,
                  kind: inclusion.kind,
                  quantity: inclusion.quantity,
                  printSizeId: inclusion.printSizeId,
                  frameId: inclusion.frameId ? (frameIdByToken.get(inclusion.frameId) ?? null) : null,
                  description: inclusion.description,
                  position: index + 1,
                }))
              )
              .returning({ id: packageInclusions.id })
          : [];
      const junctionPairs = args.input.inclusions.flatMap(
        (inclusion: PackageSaveInclusionInput, index) => {
          const inclusionRow = inclusionRows[index];
          if (!inclusionRow) throw new Error('insert package_inclusions: fewer rows than entries');
          // Duplicate attire ids collapse (the booking schema's dedupe precedent).
          return [...new Set(inclusion.attireIds)].map((attireId, attireIndex) => ({
            inclusionId: inclusionRow.id,
            attireId,
            position: attireIndex + 1,
          }));
        }
      );
      if (junctionPairs.length > 0) {
        await tx.insert(packageInclusionAttires).values(junctionPairs);
      }
      return { ok: true };
    })
  );
  if (!outcome.ok) return outcome;
  const saved = outcome.row;
  if (!saved.ok) return saved;
  // After-commit bucket hygiene: the replaced/cleared cover's old object is
  // deleted only AFTER the save committed — a rolled-back save never deletes
  // (the row still points at it), and in-place overwrite never happens.
  const storedAfter = args.finalKey === undefined ? oldCoverKey : args.finalKey;
  if (oldCoverKey && storedAfter !== oldCoverKey) {
    await env.MEDIA_BUCKET.delete(oldCoverKey);
  }
  const read = await getAdminPackage(db, env, packageId);
  if (!read) throw new Error('package save: read-back after commit found no row');
  return { ok: true, row: read };
}

export async function createAdminPackage(
  db: Database,
  env: SaveEnv,
  input: CreateServicePackageInput
): Promise<AdminCreateResult<ServicePackageRead>> {
  const cover = await resolveCover(env, input.coverImageKey);
  if (!cover.ok) return cover;
  const slug = slugifyName(input.name);
  return runPackageSave(db, env, { input, slug, finalKey: cover.finalKey, updateId: null });
}

export async function updateAdminPackage(
  db: Database,
  env: SaveEnv,
  id: string,
  input: UpdateServicePackageInput
): Promise<AdminWriteResult<ServicePackageRead>> {
  if (!SLUG_FORMAT.test(input.slug)) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Invalid slug.',
      details: [{ path: ['slug'], message: 'must be lowercase letters, digits, and single dashes' }],
    };
  }
  const cover = await resolveCover(env, input.coverImageKey);
  if (!cover.ok) return cover;
  return runPackageSave(db, env, { input, slug: input.slug, finalKey: cover.finalKey, updateId: id });
}
```

- [ ] **Step 6: The router (whole file, verbatim) + the chain**

`apps/api/src/routes/admin-service-packages.ts`:

```ts
import { createServicePackageSchema, updateServicePackageSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminPackage,
  getAdminPackage,
  listAdminPackages,
  updateAdminPackage,
} from '../services/admin-packages.js';
import { badRequest, notFound } from '../services/errors.js';
import type { ApiEnv } from '../services/db.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. The
// atomic save rides the gate (routes/admin.ts's ONE requireSession); POST
// generates the slug, PUT accepts the advanced slug field. Both return the
// canonical servicePackageRead shape (coverImageUrl resolved, no raw key).
export const adminServicePackages = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminPackages(c.get('db'), c.env));
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const read = await getAdminPackage(c.get('db'), c.env, id);
    if (!read) {
      return notFound(c, 'Package not found.');
    }
    return c.json(read);
  })
  .post('/', validatedJson(createServicePackageSchema), async (c) => {
    const result = await createAdminPackage(c.get('db'), c.env, c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateServicePackageSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminPackage(c.get('db'), c.env, id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Package not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
```

In `apps/api/src/routes/admin.ts`: add the import and append `.route('/service-packages', adminServicePackages)` to the end of the chain.

- [ ] **Step 7: Run the suite to verify everything passes**

Run: `pnpm --filter @sevendays/api test`
Expected: **21 files / 220 tests passed + 3 skipped** (206 + 14).

- [ ] **Step 8: Type-flow gate + commit**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck` → all green.
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/src/services/admin-packages.ts apps/api/src/services/service-packages.ts apps/api/src/routes/admin-service-packages.ts apps/api/src/routes/admin.ts apps/api/test/helpers/r2-stub.ts apps/api/test/admin-packages.test.ts
git commit -m "feat(api): admin package reads + the atomic save — renumbering, junction rewrite, slugs (#137)"
```

---

### Task 6: The package cover lifecycle — commit-verified bind / clear / replace (tests-only task)

**Files:**
- Modify (test-first): `apps/api/test/admin-packages.test.ts` (append the cover describe)

**Interfaces:**
- Consumes: Task 5's complete cover path (`resolveCover` inside the save — commit-or-fail, `null` clears, absent unchanged, old-key deletion after commit) and `stubCommitBucket`. NO production code changes: Task 5 shipped the whole lifecycle; this task pins its observable behavior.

**Not here:** any service/route edit (a failing assertion means Task 5's code is wrong — fix THERE, never here); the gallery-photo commit (Task 8); any new schema.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/test/admin-packages.test.ts` (the imports gain `stubCommitBucket` from `./helpers/r2-stub.js`):

```ts
describe('the package cover lifecycle (commit-verified through ticket 02)', () => {
  const STAGING = 'tmp/00000000-0000-4000-8000-000000000000.jpg';
  const BASE = 'https://pub-test.r2.dev';

  const withBucket = () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    return { stub, env: { ...testEnv(url), MEDIA_BUCKET: stub.bucket } };
  };

  const putCover = async (email: string, cover: unknown, env: Record<string, unknown>) =>
    app.request(
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${(await signUpSession(url, email)).token}`,
        },
        body: JSON.stringify(
          cover === 'ABSENT'
            ? { name: 'Simple Package', description: 'Prints only', priceCents: 90000, slug: 'simple-package', isActive: true, isFeatured: false, durationMinutes: null, frames: [], inclusions: [] }
            : { name: 'Simple Package', description: 'Prints only', priceCents: 90000, slug: 'simple-package', isActive: true, isFeatured: false, durationMinutes: null, frames: [], inclusions: [], coverImageKey: cover }
        ),
      },
      env
    );

  it('PUT with a staging key binds it — HEAD-verified, promoted to covers/, staging deleted, URL resolved', async () => {
    const { stub, env } = withBucket();
    const res = await putCover('admin-cover-bind@sevendays.test', STAGING, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { coverImageUrl: string | null };
    expect(body.coverImageUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/covers\/[0-9a-f-]{36}\.jpg$/);
    expect(stub.putCalls).toHaveLength(1);
    expect(stub.putCalls[0]?.key).toBe((body.coverImageUrl ?? '').replace(`${BASE}/`, ''));
    expect(stub.deleteCalls).toEqual([STAGING]);
  });

  it('PUT null clears the cover — and the replaced object is deleted only after the save', async () => {
    const { stub, env } = withBucket();
    const bound = await putCover('admin-cover-clear-a@sevendays.test', STAGING, env);
    expect(bound.status).toBe(200);
    const finalKey = (((await bound.json()) as { coverImageUrl: string }).coverImageUrl ?? '').replace(`${BASE}/`, '');
    const cleared = await putCover('admin-cover-clear-b@sevendays.test', null, env);
    expect(cleared.status).toBe(200);
    expect(((await cleared.json()) as { coverImageUrl: string | null }).coverImageUrl).toBeNull();
    expect(stub.deleteCalls).toEqual([STAGING, finalKey]);
  });

  it('PUT without the field leaves the cover unchanged (absent = unchanged)', async () => {
    const { stub, env } = withBucket();
    const res = await putCover('admin-cover-absent@sevendays.test', 'ABSENT', env);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { coverImageUrl: string | null }).coverImageUrl).toBeNull();
    expect(stub.putCalls).toEqual([]);
  });

  it('PUT with a foreign key → the commit 400 with the coverImageKey detail — and NO delete call', async () => {
    const { stub, env } = withBucket();
    const res = await putCover(
      'admin-cover-foreign@sevendays.test',
      'covers/00000000-0000-4000-8000-000000000000.jpg',
      env
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['coverImageKey']);
    expect(stub.deleteCalls).toEqual([]);
  });

  it('PUT with a staging key that has no object → the commit not-found 400', async () => {
    const empty = stubCommitBucket();
    const res = await putCover(
      'admin-cover-missing@sevendays.test',
      'tmp/11111111-0000-4000-8000-000000000001.jpg',
      { ...testEnv(url), MEDIA_BUCKET: empty.bucket }
    );
    expect(res.status).toBe(400);
  });

  it('POST create with a coverImageKey → 201 with the resolved absolute URL', async () => {
    const { stub, env } = withBucket();
    const { token } = await signUpSession(url, 'admin-cover-create@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/service-packages',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(save({ coverImageKey: STAGING })),
      },
      env
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { coverImageUrl: string | null };
    expect(body.coverImageUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/covers\//);
    expect(stub.deleteCalls).toEqual([STAGING]);
  });
});
```

- [ ] **Step 2: Run the suite to verify the new describe passes**

Run: `pnpm --filter @sevendays/api test -- test/admin-packages`
Expected: PASS — all 20 cases (14 from Task 5 + 6 new). If any cover case fails, the defect is in Task 5's `runPackageSave`/`resolveCover` — fix there, never loosen here.

- [ ] **Step 3: Biome + full suite + commit**

Run: `pnpm --filter @sevendays/api test` → expect **21 files / 226 tests passed + 3 skipped** (220 + 6).
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/test/admin-packages.test.ts
git commit -m "test(api): package cover lifecycle — bind/clear/replace through commitUpload (#137)"
```

---

### Task 7: Gallery categories + testimonials CRUD + their order PUTs (+ the gallery fixtures)

**Files:**
- Create (test-first): `apps/api/test/admin-gallery.test.ts`
- Modify: `apps/api/test/helpers/fixtures.ts` (append `loadGalleryFixtures` — first consumer is this task's suite)
- Create: `apps/api/src/services/admin-gallery.ts` (the categories + testimonials sections; photos join in Task 8)
- Create: `apps/api/src/routes/admin-gallery-categories.ts`, `apps/api/src/routes/admin-testimonials.ts`
- Modify: `apps/api/src/routes/admin.ts` (chain grows)

**Interfaces:**
- Consumes: drizzle-orm's `max` aggregate (pinned: exported in 0.45.2); `createGalleryCategorySchema`/`updateGalleryCategorySchema`/`galleryCategoryOrderSchema`/`createTestimonialSchema`/`updateTestimonialSchema`/`testimonialOrderSchema` (ticket 01); Task 1's union.
- Produces: `adminGalleryCategories` router — `GET /`, `POST /` (201, position = max+1), **`PUT /order`** (registered BEFORE `/:id` — static before param), `GET /:id`, `PUT /:id` — and `adminTestimonials` likewise with `PUT /order` (`{ testimonialIds }`); service exports `listAdminGalleryCategories`, `getAdminGalleryCategory`, `createAdminGalleryCategory`, `updateAdminGalleryCategory`, `setGalleryCategoryOrder`, `listAdminTestimonials`, `getAdminTestimonial`, `createAdminTestimonial`, `updateAdminTestimonial`, `setTestimonialOrder`, plus the module-local `checkCompleteOrder` shared by all three order PUTs.

**Not here:** the photos CRUD + photo order (Task 8); the public gallery/testimonials reads (#138); any UI.

- [ ] **Step 1: Append the gallery fixtures to the helper (verbatim)**

Append to `apps/api/test/helpers/fixtures.ts`:

```ts
export type GalleryFixtureIds = {
  categoryA: string; // active, position 1
  categoryB: string; // active, position 2
  categoryRetired: string; // inactive, position 3
  photoA: string; // active, categoryA, position 1
  photoB: string; // active, categoryB, position 2
  photoRetired: string; // inactive, uncategorized, position 3
  testimonialA: string; // active, position 1
  testimonialB: string; // active, position 2
  testimonialRetired: string; // inactive, position 3
};

/**
 * The CMS-born-empty tables get their own fixture builder (the main
 * loadFixtures predates M5's gallery): 3 categories (one deactivated),
 * 3 photos (one deactivated, one uncategorized — the staff-only state),
 * 3 testimonials (one deactivated). Positions contiguous 1..3.
 */
export async function loadGalleryFixtures(db: TestDb): Promise<GalleryFixtureIds> {
  const { galleryCategories, galleryPhotos, testimonials } = await import('@sevendays/db');

  const [categoryA] = await db
    .insert(galleryCategories)
    .values({ name: 'Weddings', position: 1 })
    .returning({ id: galleryCategories.id });
  const [categoryB] = await db
    .insert(galleryCategories)
    .values({ name: 'Graduation', position: 2 })
    .returning({ id: galleryCategories.id });
  const [categoryRetired] = await db
    .insert(galleryCategories)
    .values({ name: 'Retired Tab', position: 3, isActive: false })
    .returning({ id: galleryCategories.id });
  if (!categoryA || !categoryB || !categoryRetired) {
    throw new Error('gallery fixtures: category insert returned no row');
  }

  const [photoA] = await db
    .insert(galleryPhotos)
    .values({ r2Key: 'gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg', categoryId: categoryA.id, position: 1 })
    .returning({ id: galleryPhotos.id });
  const [photoB] = await db
    .insert(galleryPhotos)
    .values({ r2Key: 'gallery/aaaaaaaa-0000-4000-8000-000000000002.jpg', categoryId: categoryB.id, position: 2 })
    .returning({ id: galleryPhotos.id });
  const [photoRetired] = await db
    .insert(galleryPhotos)
    .values({ r2Key: 'gallery/aaaaaaaa-0000-4000-8000-000000000003.jpg', position: 3, isActive: false })
    .returning({ id: galleryPhotos.id });
  if (!photoA || !photoB || !photoRetired) {
    throw new Error('gallery fixtures: photo insert returned no row');
  }

  const [testimonialA] = await db
    .insert(testimonials)
    .values({ quote: 'The photos came out better than we hoped.', person: 'Maria, batch 2026', position: 1 })
    .returning({ id: testimonials.id });
  const [testimonialB] = await db
    .insert(testimonials)
    .values({ quote: 'Fast, friendly, and the prints are gorgeous.', person: 'Jon & Riza', position: 2 })
    .returning({ id: testimonials.id });
  const [testimonialRetired] = await db
    .insert(testimonials)
    .values({ quote: 'Retired quote.', person: 'Former Client', position: 3, isActive: false })
    .returning({ id: testimonials.id });
  if (!testimonialA || !testimonialB || !testimonialRetired) {
    throw new Error('gallery fixtures: testimonial insert returned no row');
  }

  return {
    categoryA: categoryA.id,
    categoryB: categoryB.id,
    categoryRetired: categoryRetired.id,
    photoA: photoA.id,
    photoB: photoB.id,
    photoRetired: photoRetired.id,
    testimonialA: testimonialA.id,
    testimonialB: testimonialB.id,
    testimonialRetired: testimonialRetired.id,
  };
}
```

- [ ] **Step 2: Write the failing tests**

`apps/api/test/admin-gallery.test.ts`:

```ts
import { galleryCategories } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { signUpSession } from './helpers/auth.js';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { GalleryFixtureIds } from './helpers/fixtures.js';
import { loadGalleryFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: GalleryFixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const authed = async (method: string, path: string, email: string, body?: unknown) => {
  const { token } = await signUpSession(url, email);
  return app.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(url)
  );
};

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadGalleryFixtures(db);
});

describe('gallery categories admin CRUD', () => {
  it('GET / lists ALL rows including the deactivated one, position-ordered', async () => {
    const res = await authed('GET', '/api/v1/admin/gallery-categories', 'admin-cats-list@sevendays.test');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; position: number; isActive: boolean }[];
    expect(body.map((c) => c.name)).toEqual(['Weddings', 'Graduation', 'Retired Tab']);
    expect(body.find((c) => c.name === 'Retired Tab')?.isActive).toBe(false);
  });

  it('POST → 201 with the server-assigned position (max + 1)', async () => {
    const res = await authed('POST', '/api/v1/admin/gallery-categories', 'admin-cats-post@sevendays.test', {
      name: 'Portraits',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; position: number; isActive: boolean };
    expect(body.position).toBe(4);
    expect(body.isActive).toBe(true);
  });

  it('POST duplicate name → 400 with the name field detail', async () => {
    const res = await authed('POST', '/api/v1/admin/gallery-categories', 'admin-cats-dup@sevendays.test', {
      name: 'Weddings',
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('PUT renames and deactivates → 200 (full-object)', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/gallery-categories/${ids.categoryA}`,
      'admin-cats-put@sevendays.test',
      { name: 'Weddings & Events', isActive: false }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; isActive: boolean };
    expect(body.name).toBe('Weddings & Events');
    expect(body.isActive).toBe(false);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/gallery-categories/00000000-0000-4000-8000-000000000000',
      'admin-cats-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Gallery category not found.' });
  });

  it('PUT /order full-replace renumbers 1..N in payload order — deactivated rows included', async () => {
    const res = await authed('PUT', '/api/v1/admin/gallery-categories/order', 'admin-cats-order@sevendays.test', {
      categoryIds: [ids.categoryB, ids.categoryA, ids.categoryRetired],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; position: number }[];
    expect(body.map((c) => c.name)).toEqual(['Graduation', 'Weddings', 'Retired Tab']);
    expect(body.map((c) => c.position)).toEqual([1, 2, 3]);
  });

  it('PUT /order with a missing row → 400 and positions untouched', async () => {
    const res = await authed('PUT', '/api/v1/admin/gallery-categories/order', 'admin-cats-orderbad@sevendays.test', {
      categoryIds: [ids.categoryA, ids.categoryB],
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['categoryIds']);
    expect(body.details[0]?.message).toContain(ids.categoryRetired);
    const rows = await db
      .select({ position: galleryCategories.position })
      .from(galleryCategories)
      .where(eq(galleryCategories.id, ids.categoryRetired));
    expect(rows[0]?.position).toBe(3);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-categories',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ position: 1 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('testimonials admin CRUD', () => {
  it('GET / lists ALL rows including the deactivated one, position-ordered', async () => {
    const res = await authed('GET', '/api/v1/admin/testimonials', 'admin-testi-list@sevendays.test');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { person: string; position: number; isActive: boolean }[];
    expect(body.map((t) => t.position)).toEqual([1, 2, 3]);
    expect(body.find((t) => t.person === 'Former Client')?.isActive).toBe(false);
  });

  it('POST → 201 with the server-assigned position (max + 1)', async () => {
    const res = await authed('POST', '/api/v1/admin/testimonials', 'admin-testi-post@sevendays.test', {
      quote: 'Booking was painless and the gallery came fast.',
      person: 'Ana, class 2025',
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { position: number }).position).toBe(4);
  });

  it('PUT flips isActive → 200', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/testimonials/${ids.testimonialA}`,
      'admin-testi-put@sevendays.test',
      { quote: 'The photos came out better than we hoped.', person: 'Maria, batch 2026', isActive: false }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { isActive: boolean }).isActive).toBe(false);
  });

  it('PUT /order full-replace renumbers truthfully', async () => {
    const res = await authed('PUT', '/api/v1/admin/testimonials/order', 'admin-testi-order@sevendays.test', {
      testimonialIds: [ids.testimonialB, ids.testimonialRetired, ids.testimonialA],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { person: string; position: number }[];
    expect(body.map((t) => t.person)).toEqual(['Jon & Riza', 'Former Client', 'Maria, batch 2026']);
    expect(body.map((t) => t.position)).toEqual([1, 2, 3]);
  });

  it('PUT /order with an unknown id → 400 and positions untouched', async () => {
    const res = await authed('PUT', '/api/v1/admin/testimonials/order', 'admin-testi-orderbad@sevendays.test', {
      testimonialIds: [ids.testimonialA, ids.testimonialB, '00000000-0000-4000-8000-000000000000'],
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['testimonialIds']);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/testimonials',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ position: 0 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/admin-gallery`
Expected: FAIL — unmounted 404s on every route case (the fixtures helper exists from Step 1, so the harness itself runs).

- [ ] **Step 4: Implement the service sections (verbatim)**

`apps/api/src/services/admin-gallery.ts`:

```ts
import type { Database } from '@sevendays/db';
import { galleryCategories, testimonials } from '@sevendays/db';
import type {
  CreateGalleryCategoryInput,
  CreateTestimonialInput,
  UpdateGalleryCategoryInput,
  UpdateTestimonialInput,
} from '@sevendays/types';
import { and, asc, eq, max, ne } from 'drizzle-orm';
import {
  conflict,
  guardUnique,
  type AdminCreateResult,
  type AdminDetail,
  type AdminWriteResult,
} from './admin-shared.js';

// The positioned collections (M5 #137): position is SERVER-assigned and
// never client-supplied — create assigns max+1, the order PUT full-replaces
// 1..N in payload order. Reorder is atomic and TOTAL: the payload must list
// EVERY row of the collection exactly once (deactivated included — the
// admin grid manages them all); a mismatch answers 400 and touches nothing.
// No hard deletes anywhere. (The gallery-photos section joins in Task 8.)

type CategoryRow = typeof galleryCategories.$inferSelect;
type TestimonialRow = typeof testimonials.$inferSelect;
type Detail = { path: string[]; message: string };
type OrderCheck = { ok: true } | { ok: false; reason: 'invalid'; message: string; details: Detail[] };

const CATEGORY_UNIQUE: Record<string, string> = { gallery_categories_name_unique: 'name' };

/**
 * The full-replace guard shared by all three order PUTs: unknown ids,
 * missing rows, and duplicates are all named in the details — the editor
 * can mark exactly what drifted.
 */
function checkCompleteOrder(rows: { id: string }[], ids: string[], field: string): OrderCheck {
  const details: Detail[] = [];
  const rowIds = new Set(rows.map((r) => r.id));
  const seen = new Set<string>();
  for (const id of ids) {
    if (!rowIds.has(id)) details.push({ path: [field], message: `unknown id ${id}` });
    if (seen.has(id)) details.push({ path: [field], message: `duplicate id ${id}` });
    seen.add(id);
  }
  const payloadIds = new Set(ids);
  for (const row of rows) {
    if (!payloadIds.has(row.id)) details.push({ path: [field], message: `missing id ${row.id}` });
  }
  if (details.length > 0) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'The order payload must list every row exactly once.',
      details,
    };
  }
  return { ok: true };
}

// --- gallery categories -----------------------------------------------------

export async function listAdminGalleryCategories(db: Database): Promise<CategoryRow[]> {
  return db
    .select()
    .from(galleryCategories)
    .orderBy(asc(galleryCategories.position), asc(galleryCategories.id));
}

export async function getAdminGalleryCategory(db: Database, id: string): Promise<CategoryRow | null> {
  const [row] = await db.select().from(galleryCategories).where(eq(galleryCategories.id, id)).limit(1);
  return row ?? null;
}

async function nextCategoryPosition(db: Database): Promise<number> {
  const [row] = await db.select({ value: max(galleryCategories.position) }).from(galleryCategories);
  return (row?.value ?? 0) + 1;
}

export async function createAdminGalleryCategory(
  db: Database,
  input: CreateGalleryCategoryInput
): Promise<AdminCreateResult<CategoryRow>> {
  const position = await nextCategoryPosition(db);
  return guardUnique(CATEGORY_UNIQUE, async () => {
    const [row] = await db
      .insert(galleryCategories)
      .values({ ...input, position })
      .returning();
    if (!row) throw new Error('insert gallery_categories: no row returned');
    return row;
  });
}

export async function updateAdminGalleryCategory(
  db: Database,
  id: string,
  input: UpdateGalleryCategoryInput
): Promise<AdminWriteResult<CategoryRow>> {
  const current = await getAdminGalleryCategory(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: galleryCategories.id })
      .from(galleryCategories)
      .where(and(eq(galleryCategories.name, input.name), ne(galleryCategories.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  return guardUnique(CATEGORY_UNIQUE, async () => {
    const [row] = await db
      .update(galleryCategories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(galleryCategories.id, id))
      .returning();
    if (!row) throw new Error('update gallery_categories: no row returned');
    return row;
  });
}

export async function setGalleryCategoryOrder(
  db: Database,
  categoryIds: string[]
): Promise<AdminWriteResult<CategoryRow[]>> {
  const rows = await db.select().from(galleryCategories);
  const check = checkCompleteOrder(rows, categoryIds, 'categoryIds');
  if (!check.ok) return check;
  await db.transaction(async (tx) => {
    for (const [index, categoryId] of categoryIds.entries()) {
      await tx
        .update(galleryCategories)
        .set({ position: index + 1, updatedAt: new Date() })
        .where(eq(galleryCategories.id, categoryId));
    }
  });
  return { ok: true, row: await listAdminGalleryCategories(db) };
}

// --- testimonials -----------------------------------------------------------

export async function listAdminTestimonials(db: Database): Promise<TestimonialRow[]> {
  return db.select().from(testimonials).orderBy(asc(testimonials.position), asc(testimonials.id));
}

export async function getAdminTestimonial(db: Database, id: string): Promise<TestimonialRow | null> {
  const [row] = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return row ?? null;
}

async function nextTestimonialPosition(db: Database): Promise<number> {
  const [row] = await db.select({ value: max(testimonials.position) }).from(testimonials);
  return (row?.value ?? 0) + 1;
}

// No unique constraint on testimonials — create/update carry no conflict
// path (the no-row guards are the only throws, and unreachable in practice).
export async function createAdminTestimonial(
  db: Database,
  input: CreateTestimonialInput
): Promise<AdminCreateResult<TestimonialRow>> {
  const position = await nextTestimonialPosition(db);
  const [row] = await db
    .insert(testimonials)
    .values({ ...input, position })
    .returning();
  if (!row) throw new Error('insert testimonials: no row returned');
  return { ok: true, row };
}

export async function updateAdminTestimonial(
  db: Database,
  id: string,
  input: UpdateTestimonialInput
): Promise<AdminWriteResult<TestimonialRow>> {
  const [row] = await db
    .update(testimonials)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(testimonials.id, id))
    .returning();
  if (!row) return { ok: false, reason: 'not_found' };
  return { ok: true, row };
}

export async function setTestimonialOrder(
  db: Database,
  testimonialIds: string[]
): Promise<AdminWriteResult<TestimonialRow[]>> {
  const rows = await db.select().from(testimonials);
  const check = checkCompleteOrder(rows, testimonialIds, 'testimonialIds');
  if (!check.ok) return check;
  await db.transaction(async (tx) => {
    for (const [index, testimonialId] of testimonialIds.entries()) {
      await tx
        .update(testimonials)
        .set({ position: index + 1, updatedAt: new Date() })
        .where(eq(testimonials.id, testimonialId));
    }
  });
  return { ok: true, row: await listAdminTestimonials(db) };
}
```

- [ ] **Step 5: The two routers + the chain**

`apps/api/src/routes/admin-gallery-categories.ts`:

```ts
import {
  createGalleryCategorySchema,
  galleryCategoryOrderSchema,
  updateGalleryCategorySchema,
} from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminGalleryCategory,
  getAdminGalleryCategory,
  listAdminGalleryCategories,
  setGalleryCategoryOrder,
  updateAdminGalleryCategory,
} from '../services/admin-gallery.js';
import { badRequest, notFound } from '../services/errors.js';
import type { ApiEnv } from '../services/db.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. PUT
// /order is registered BEFORE /:id — static before param, so the order PUT
// can never be captured by the uuid-validated /:id route (an 'order' id
// would otherwise die in validatedParam as a 400).
export const adminGalleryCategories = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminGalleryCategories(c.get('db')));
  })
  .post('/', validatedJson(createGalleryCategorySchema), async (c) => {
    const result = await createAdminGalleryCategory(c.get('db'), c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put('/order', validatedJson(galleryCategoryOrderSchema), async (c) => {
    const { categoryIds } = c.req.valid('json');
    const result = await setGalleryCategoryOrder(c.get('db'), categoryIds);
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row);
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminGalleryCategory(c.get('db'), id);
    if (!row) {
      return notFound(c, 'Gallery category not found.');
    }
    return c.json(row);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateGalleryCategorySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminGalleryCategory(c.get('db'), id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Gallery category not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
```

`apps/api/src/routes/admin-testimonials.ts` — same shape with the pinned substitutions: schemas `createTestimonialSchema`/`updateTestimonialSchema`/`testimonialOrderSchema`; order service `setTestimonialOrder` destructuring `{ testimonialIds }`; CRUD quartet `listAdminTestimonials`/`getAdminTestimonial`/`createAdminTestimonial`/`updateAdminTestimonial`; router name `adminTestimonials`; mount `/testimonials`; the order route's mapping stays `if (!result.ok) return badRequest(...)` (no not_found arm — the order service never returns it); 404 wording `'Testimonial not found.'`; the doc comment copied with those names.

In `apps/api/src/routes/admin.ts`: add both imports and append `.route('/gallery-categories', adminGalleryCategories).route('/testimonials', adminTestimonials)` to the end of the chain.

- [ ] **Step 6: Run the suite to verify everything passes**

Run: `pnpm --filter @sevendays/api test`
Expected: **22 files / 240 tests passed + 3 skipped** (226 + 14).

- [ ] **Step 7: Type-flow gate + commit**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck` → all green.
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/src/services/admin-gallery.ts apps/api/src/routes/admin-gallery-categories.ts apps/api/src/routes/admin-testimonials.ts apps/api/src/routes/admin.ts apps/api/test/helpers/fixtures.ts apps/api/test/admin-gallery.test.ts
git commit -m "feat(api): admin gallery categories + testimonials CRUD + order PUTs (#137)"
```

---

### Task 8: Gallery photos CRUD + the photo order PUT (completing #136's thumb router)

**Files:**
- Modify (test-first): `apps/api/test/admin-gallery.test.ts` (append the photos describe)
- Modify: `apps/api/src/services/admin-gallery.ts` (append the photos section)
- Modify: `apps/api/src/routes/gallery-photos.ts` (whole-file rewrite — #136's thumb route preserved verbatim inside the grown router)
- No `admin.ts` change: `galleryPhotos` is already chained at `/gallery-photos` (Task 2's pinned file).

**Interfaces:**
- Consumes: `createGalleryPhotoSchema`/`updateGalleryPhotoSchema`/`galleryPhotoOrderSchema` (ticket 01); `commitUpload` + `resolveMediaUrl`; Task 7's `checkCompleteOrder`.
- Produces: the gallery-photos router grows to `GET /`, `POST /` (201; the staging key is commit-verified and promoted at persist), `PUT /order`, `GET /:id/thumb` (#136, untouched), `GET /:id`, `PUT /:id`; service exports `listAdminGalleryPhotos(db, env)`, `getAdminGalleryPhoto(db, env, id)`, `createAdminGalleryPhoto(db, env, input)`, `updateAdminGalleryPhoto(db, env, id, input)`, `setGalleryPhotoOrder(db, env, photoIds)` with `PhotoEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>`.

**Not here:** the thumb route's behavior (#136's, byte-preserved); the public gallery read (#138); batch-upload UX (#140).

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/test/admin-gallery.test.ts` (the imports gain `galleryPhotos` in the `@sevendays/db` import and `stubCommitBucket` from `./helpers/r2-stub.js`):

```ts
describe('gallery photos admin CRUD', () => {
  const STAGING = 'tmp/00000000-0000-4000-8000-000000000000.jpg';
  const PHOTO_A_KEY = 'gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg';

  it('GET / lists ALL rows including the deactivated one — photoUrl resolved, NO raw key anywhere', async () => {
    const res = await authed('GET', '/api/v1/admin/gallery-photos', 'admin-photos-list@sevendays.test');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; photoUrl: string; isActive: boolean }[];
    expect(body).toHaveLength(3);
    const retired = body.find((p) => p.id === ids.photoRetired);
    expect(retired?.isActive).toBe(false);
    for (const photo of body) {
      expect(photo.photoUrl.startsWith('https://pub-test.r2.dev/gallery/')).toBe(true);
    }
    expect(JSON.stringify(body).includes('r2Key')).toBe(false);
  });

  it('POST with a staging key → 201; the key is commit-verified, promoted, and the row carries the final key', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const res = await app.request(
      '/api/v1/admin/gallery-photos',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${(await signUpSession(url, 'admin-photos-post@sevendays.test')).token}` },
        body: JSON.stringify({ r2Key: STAGING, title: 'Toga portrait', caption: null, categoryId: ids.categoryA }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; photoUrl: string; position: number };
    expect(body.photoUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/gallery\/[0-9a-f-]{36}\.jpg$/);
    expect(body.position).toBe(4);
    expect(stub.deleteCalls).toEqual([STAGING]);
  });

  it('POST with a foreign key → 400 with the r2Key detail and NO row created', async () => {
    const res = await authed('POST', '/api/v1/admin/gallery-photos', 'admin-photos-foreign@sevendays.test', {
      r2Key: 'gallery/00000000-0000-4000-8000-000000000000.jpg',
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['r2Key']);
    const rows = await db.select({ id: galleryPhotos.id }).from(galleryPhotos);
    expect(rows).toHaveLength(3);
  });

  it('POST with an unknown categoryId → 400 BEFORE any bucket call (no orphan promote)', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const res = await app.request(
      '/api/v1/admin/gallery-photos',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${(await signUpSession(url, 'admin-photos-badcat@sevendays.test')).token}` },
        body: JSON.stringify({ r2Key: STAGING, categoryId: '00000000-0000-4000-8000-000000000000' }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['categoryId']);
    expect(stub.putCalls).toEqual([]);
  });

  it('PUT metadata is full-object — null clears title/categoryId and isActive flips', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/gallery-photos/${ids.photoA}`,
      'admin-photos-put@sevendays.test',
      { title: null, caption: null, categoryId: null, isActive: false }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { title: string | null; categoryId: string | null; isActive: boolean };
    expect(body.title).toBeNull();
    expect(body.categoryId).toBeNull();
    expect(body.isActive).toBe(false);
  });

  it('PUT with a new r2Key replaces the photo — new final key in the row, the OLD object deleted after', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${ids.photoA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${(await signUpSession(url, 'admin-photos-replace@sevendays.test')).token}` },
        body: JSON.stringify({ title: null, caption: null, categoryId: ids.categoryB, isActive: true, r2Key: STAGING }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { photoUrl: string };
    expect(body.photoUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/gallery\//);
    expect(stub.deleteCalls).toEqual([STAGING, PHOTO_A_KEY]);
  });

  it('PUT /order full-replace renumbers — the deactivated photo is renumbered too', async () => {
    const res = await authed('PUT', '/api/v1/admin/gallery-photos/order', 'admin-photos-order@sevendays.test', {
      photoIds: [ids.photoRetired, ids.photoB, ids.photoA],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; position: number }[];
    expect(body.map((p) => p.id)).toEqual([ids.photoRetired, ids.photoB, ids.photoA]);
    expect(body.map((p) => p.position)).toEqual([1, 2, 3]);
  });

  it('PUT /order incomplete → 400 and positions untouched', async () => {
    const res = await authed('PUT', '/api/v1/admin/gallery-photos/order', 'admin-photos-orderbad@sevendays.test', {
      photoIds: [ids.photoA],
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['photoIds']);
    const rows = await db
      .select({ position: galleryPhotos.position })
      .from(galleryPhotos)
      .where(eq(galleryPhotos.id, ids.photoRetired));
    expect(rows[0]?.position).toBe(3);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000',
      'admin-photos-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Photo not found.' });
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-photos',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ r2Key: 42 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/admin-gallery`
Expected: FAIL — the ten new cases hit the unmounted 404 (only `/:id/thumb` exists under gallery-photos).

- [ ] **Step 3: Append the service section (verbatim)**

Append to `apps/api/src/services/admin-gallery.ts`. Extend the imports: `@sevendays/db` gains `galleryPhotos`; `@sevendays/types` gains `CreateGalleryPhotoInput, GalleryPhoto, UpdateGalleryPhotoInput`; `../env.js` type-import `Env`; `./admin-shared.js` gains `type AdminWriteFailure`; `./media.js` import `commitUpload, resolveMediaUrl`.

```ts
// --- gallery photos ---------------------------------------------------------

type PhotoRow = typeof galleryPhotos.$inferSelect;
export type PhotoEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>;

function toPhotoRead(env: PhotoEnv, row: PhotoRow): GalleryPhoto {
  // The wire rename (ADR-0019): strip the raw key, resolve the absolute URL.
  const { r2Key, ...rest } = row;
  const photoUrl = resolveMediaUrl(env, r2Key);
  if (!photoUrl) throw new Error(`gallery photo ${row.id} has no r2Key`);
  return { ...rest, photoUrl };
}

export async function listAdminGalleryPhotos(db: Database, env: PhotoEnv): Promise<GalleryPhoto[]> {
  const rows = await db
    .select()
    .from(galleryPhotos)
    .orderBy(asc(galleryPhotos.position), asc(galleryPhotos.id));
  return rows.map((row) => toPhotoRead(env, row));
}

export async function getAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  id: string
): Promise<GalleryPhoto | null> {
  const [row] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).limit(1);
  return row ? toPhotoRead(env, row) : null;
}

async function nextPhotoPosition(db: Database): Promise<number> {
  const [row] = await db.select({ value: max(galleryPhotos.position) }).from(galleryPhotos);
  return (row?.value ?? 0) + 1;
}

/**
 * The commit step shared by create and replace: HEAD-verify the staging key
 * through ticket 02's commitUpload (verify → caps → promote to the immutable
 * gallery/<uuid>.jpg → delete staging), failures re-pathed onto the r2Key
 * payload field. Runs BEFORE any DB write.
 */
async function commitStagingKey(
  env: PhotoEnv,
  stagingKey: string
): Promise<{ ok: true; finalKey: string } | AdminWriteFailure> {
  const commit = await commitUpload(env.MEDIA_BUCKET, { stagingKey, purpose: 'gallery-photo' });
  if (!commit.ok) {
    return {
      ok: false,
      reason: 'conflict',
      message: commit.message,
      details: (commit.details ?? [{ path: ['key'], message: commit.message }]).map(
        (detail): Detail => ({ path: ['r2Key'], message: detail.message })
      ),
    };
  }
  return { ok: true, finalKey: commit.finalKey };
}

async function assertCategoryExists(
  db: Database,
  categoryId: string
): Promise<AdminWriteFailure | null> {
  const [known] = await db
    .select({ id: galleryCategories.id })
    .from(galleryCategories)
    .where(eq(galleryCategories.id, categoryId))
    .limit(1);
  if (!known) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Unknown category.',
      details: [{ path: ['categoryId'], message: `unknown id ${categoryId}` }],
    };
  }
  return null;
}

export async function createAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  input: CreateGalleryPhotoInput
): Promise<AdminCreateResult<GalleryPhoto>> {
  // Category existence FIRST — an invalid payload must not touch the bucket
  // (a commit would promote the object and orphan it on the 400).
  if (input.categoryId !== undefined && input.categoryId !== null) {
    const failure = await assertCategoryExists(db, input.categoryId);
    if (failure) return failure;
  }
  const commit = await commitStagingKey(env, input.r2Key);
  if (!commit.ok) return commit;
  const position = await nextPhotoPosition(db);
  const [row] = await db
    .insert(galleryPhotos)
    .values({
      r2Key: commit.finalKey,
      title: input.title ?? null,
      caption: input.caption ?? null,
      categoryId: input.categoryId ?? null,
      position,
    })
    .returning();
  if (!row) throw new Error('insert gallery_photos: no row returned');
  return { ok: true, row: toPhotoRead(env, row) };
}

export async function updateAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  id: string,
  input: UpdateGalleryPhotoInput
): Promise<AdminWriteResult<GalleryPhoto>> {
  const [current] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.categoryId !== null) {
    const failure = await assertCategoryExists(db, input.categoryId);
    if (failure) return failure;
  }
  let finalKey: string | null = current.r2Key;
  if (input.r2Key !== undefined) {
    const commit = await commitStagingKey(env, input.r2Key);
    if (!commit.ok) return commit;
    finalKey = commit.finalKey;
  }
  const [row] = await db
    .update(galleryPhotos)
    .set({
      r2Key: finalKey,
      title: input.title,
      caption: input.caption,
      categoryId: input.categoryId,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(galleryPhotos.id, id))
    .returning();
  if (!row) throw new Error('update gallery_photos: no row returned');
  // Keys are immutable — replace is new key + row update + old-key delete,
  // the old object deleted only AFTER the update committed.
  if (finalKey !== current.r2Key) {
    await env.MEDIA_BUCKET.delete(current.r2Key);
  }
  return { ok: true, row: toPhotoRead(env, row) };
}

export async function setGalleryPhotoOrder(
  db: Database,
  env: PhotoEnv,
  photoIds: string[]
): Promise<AdminWriteResult<GalleryPhoto[]>> {
  const rows = await db.select().from(galleryPhotos);
  const check = checkCompleteOrder(rows, photoIds, 'photoIds');
  if (!check.ok) return check;
  await db.transaction(async (tx) => {
    for (const [index, photoId] of photoIds.entries()) {
      await tx
        .update(galleryPhotos)
        .set({ position: index + 1, updatedAt: new Date() })
        .where(eq(galleryPhotos.id, photoId));
    }
  });
  return { ok: true, row: await listAdminGalleryPhotos(db, env) };
}
```

- [ ] **Step 4: The grown router (whole file, verbatim — #136's thumb route preserved byte-for-byte in its handler)**

`apps/api/src/routes/gallery-photos.ts`:

```ts
import {
  createGalleryPhotoSchema,
  galleryPhotoOrderSchema,
  updateGalleryPhotoSchema,
} from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminGalleryPhoto,
  getAdminGalleryPhoto,
  listAdminGalleryPhotos,
  setGalleryPhotoOrder,
  updateAdminGalleryPhoto,
} from '../services/admin-gallery.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { servePhotoThumbnail } from '../services/media.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// #136 seeded this router with the by-id thumbnail route only (keys stay
// server-side — the research's by-key sketch refined to by-id). #137's write
// model completes it: GET / (all rows incl. deactivated, photoUrl resolved),
// POST / (the staging key is commit-verified and promoted at persist), PUT
// /order, GET /:id, PUT /:id. Static paths are registered BEFORE /:id so the
// order PUT can never be captured by the uuid-validated /:id route (an
// 'order' id would otherwise die in validatedParam as a 400).
export const galleryPhotos = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminGalleryPhotos(c.get('db'), c.env));
  })
  .post('/', validatedJson(createGalleryPhotoSchema), async (c) => {
    const result = await createAdminGalleryPhoto(c.get('db'), c.env, c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put('/order', validatedJson(galleryPhotoOrderSchema), async (c) => {
    const { photoIds } = c.req.valid('json');
    const result = await setGalleryPhotoOrder(c.get('db'), c.env, photoIds);
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row);
  })
  .get(
    '/:id/thumb',
    validatedParam(z.object({ id: z.uuid() })),
    async (c) => {
      const { id } = c.req.valid('param');
      const db = c.get('db');
      const response = await servePhotoThumbnail(db, c.env, id);
      if (!response) {
        return notFound(c, 'Photo not found.');
      }
      return response;
    }
  )
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminGalleryPhoto(c.get('db'), c.env, id);
    if (!row) {
      return notFound(c, 'Photo not found.');
    }
    return c.json(row);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateGalleryPhotoSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminGalleryPhoto(c.get('db'), c.env, id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Photo not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
```

- [ ] **Step 5: Run the suite to verify everything passes**

Run: `pnpm --filter @sevendays/api test`
Expected: **22 files / 250 tests passed + 3 skipped** (240 + 10) — including #136's `media-routes.test.ts` thumb cases staying green (the router grew, the thumb route did not change).

- [ ] **Step 6: Type-flow gate + commit**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck` → all green.
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/src/services/admin-gallery.ts apps/api/src/routes/gallery-photos.ts apps/api/test/admin-gallery.test.ts
git commit -m "feat(api): admin gallery photos CRUD + the photo order PUT (#137)"
```

---

### Task 9: The gate sweep — 401 on every admin router + public round-trips

**Files:**
- Create (test-first): `apps/api/test/admin-gate.test.ts`

**Interfaces:**
- Consumes: every landed router; the three public reads that are ALREADY active-only (service-packages, studio-services, addon-services — recon-pinned).
- Produces: the AC-1 completeness proof (anonymous → the 401 envelope on EVERY admin router) and the AC-2 public-absence proofs. **The branches fence:** `GET /api/v1/branches` has NO activity filter until #138 — a deactivated-branch-in-public-read assertion is deliberately ABSENT here (owned by #138's flip; asserting today's unfiltered behavior would pin the wrong contract).

**Not here:** any production code (a failing gate means an earlier task's router missed the gate — fix THERE); the api-client wrappers (#139+; the type-flow gate is command-only).

- [ ] **Step 1: Write the tests (whole file, verbatim)**

`apps/api/test/admin-gate.test.ts`:

```ts
import { signUpSession } from './helpers/auth.js';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

// AC-1 (completeness half): EVERY admin router answers the uniform 401
// envelope for an anonymous caller — the per-router invalid-body proofs
// live in the entity suites; this sweep proves no router escaped the gate.
describe('the anonymous 401 envelope on every admin router', () => {
  const routers = [
    '/api/v1/admin/branches',
    '/api/v1/admin/service-packages',
    '/api/v1/admin/studio-services',
    '/api/v1/admin/addon-services',
    '/api/v1/admin/print-sizes',
    '/api/v1/admin/attires',
    '/api/v1/admin/gallery-categories',
    '/api/v1/admin/gallery-photos',
    '/api/v1/admin/testimonials',
  ];

  for (const router of routers) {
    it(`GET ${router} → 401 for an anonymous caller`, async () => {
      const res = await app.request(router, undefined, testEnv(url));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Authentication required.' });
    });
  }
});

// AC-2 (public-absence half): a deactivated row appears in the admin read
// and is ABSENT from the public read — proven for the three entities whose
// public reads are already active-only. The branches public read stays
// unfiltered until #138 (spec § Read assembly) — deliberately unasserted
// here; #138 owns the flip and its test.
describe('deactivate → admin read shows it, public read does not', () => {
  const authed = async (method: string, path: string, email: string, body?: unknown) => {
    const { token } = await signUpSession(url, email);
    return app.request(
      path,
      {
        method,
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      testEnv(url)
    );
  };

  it('a package: create → deactivate → admin shows it, public list hides it', async () => {
    const created = await authed('POST', '/api/v1/admin/service-packages', 'gate-pkg-a@sevendays.test', {
      name: 'Gate Probe Package',
      description: 'Created to be deactivated.',
      priceCents: 100000,
      durationMinutes: null,
      isActive: true,
      isFeatured: false,
      frames: [],
      inclusions: [],
    });
    expect(created.status).toBe(201);
    const { id, slug } = (await created.json()) as { id: string; slug: string };
    const deactivated = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${id}`,
      'gate-pkg-b@sevendays.test',
      {
        name: 'Gate Probe Package',
        description: 'Created to be deactivated.',
        priceCents: 100000,
        durationMinutes: null,
        isActive: false,
        isFeatured: false,
        frames: [],
        inclusions: [],
        slug,
      }
    );
    expect(deactivated.status).toBe(200);
    const adminRead = await authed('GET', `/api/v1/admin/service-packages/${id}`, 'gate-pkg-c@sevendays.test');
    expect(((await adminRead.json()) as { isActive: boolean }).isActive).toBe(false);
    const publicList = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    const publicBody = (await publicList.json()) as { slug: string }[];
    expect(publicBody.map((p) => p.slug)).not.toContain(slug);
  });

  it('a studio service: create → deactivate → public list hides it', async () => {
    const created = await authed('POST', '/api/v1/admin/studio-services', 'gate-svc-a@sevendays.test', {
      name: 'Gate Probe Service',
      description: 'Created to be deactivated.',
      priceCents: 20000,
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const deactivated = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${id}`,
      'gate-svc-b@sevendays.test',
      { name: 'Gate Probe Service', description: 'Created to be deactivated.', priceCents: 20000, isActive: false }
    );
    expect(deactivated.status).toBe(200);
    const publicList = await app.request('/api/v1/studio-services', undefined, testEnv(url));
    const publicBody = (await publicList.json()) as { name: string }[];
    expect(publicBody.map((s) => s.name)).not.toContain('Gate Probe Service');
  });

  it('an add-on service: create → deactivate → public list hides it', async () => {
    const created = await authed('POST', '/api/v1/admin/addon-services', 'gate-addon-a@sevendays.test', {
      name: 'Gate Probe Add-on',
      description: 'Created to be deactivated.',
      priceCents: 5000,
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const deactivated = await authed(
      'PUT',
      `/api/v1/admin/addon-services/${id}`,
      'gate-addon-b@sevendays.test',
      { name: 'Gate Probe Add-on', description: 'Created to be deactivated.', priceCents: 5000, isActive: false }
    );
    expect(deactivated.status).toBe(200);
    const publicList = await app.request('/api/v1/addon-services', undefined, testEnv(url));
    const publicBody = (await publicList.json()) as { name: string }[];
    expect(publicBody.map((a) => a.name)).not.toContain('Gate Probe Add-on');
  });
});
```

(the `bearer` helper sits beside the other module consts; biome orders imports.)

- [ ] **Step 2: Run the suite to verify everything passes**

Run: `pnpm --filter @sevendays/api test`
Expected: **23 files / 262 tests passed + 3 skipped** (250 + 12). If any 401-sweep case fails, a router mounted OUTSIDE the gate or missed the chain — fix the router, never the test.

- [ ] **Step 3: The full client type-flow gate + commit**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api-client typecheck` → all green (AppType now carries the full nine-router admin subtree; the drift-kill suite enforces it).
Run: `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/test/admin-gate.test.ts
git commit -m "test(api): admin gate sweep + public round-trips — 401 envelope on every admin route (#137)"
```

---

### Task 10: Full gates + docs rotation + PR/merge + v1 pick + issue close

**Files:**
- Modify: `docs/plan.md` (M5 checkbox 3 — this ticket owns it exclusively), `docs/progress.md` (What Exists entry), `AGENTS.md` (one appended sentence), `docs/agents/v1-picks.md` (ledger row, post-merge)

**Interfaces:**
- Consumes: every prior task green; #136 merged (the standing ordering gate).

**Not here:** any further code edits (post-Task-9 fixes land as their own pinned commits — no silent scope growth); the seed-contract demotion, admin lib-seam seating, and `cms-reflection.mjs` (#143); the public-read work (#138); any UI (#139–#142).

- [ ] **Step 1: The full gate**

Run: `docker compose up -d db && pnpm check`
Expected: **35/35 turbo tasks**; `apps/api` = **23 files / 262 passed + 3 skipped**; `packages/types` = 13 files / 112 tests (unchanged); `packages/db` = 22 passed + 8 skipped (unchanged); landing unchanged. If any count drifted, reconcile against the per-task pins above — do not loosen assertions.

- [ ] **Step 2: Tick the roadmap checkbox (this ticket's exclusively)**

In `docs/plan.md`, replace the M5 block's line:

```text
- [ ] Admin write model: gated `/api/v1/admin` subtree (one `requireSession` at its root) — full-object POST/PUT per entity, the one-atomic-save package PUT (cover + frames + inclusions, array order = position), matrix full-replace PUTs, collection order PUTs, server-generated slugs at create + editable-with-break-links-warning on PUT, every uniqueness collision a 400-with-field-details (no 409); api integration tests as the behavioral backbone
```

with:

```text
- [✅] Admin write model: gated `/api/v1/admin` subtree (one `requireSession` at its root) — full-object POST/PUT per entity, the one-atomic-save package PUT (cover + frames + inclusions, array order = position), matrix full-replace PUTs, collection order PUTs, server-generated slugs at create + editable-with-break-links-warning on PUT, every uniqueness collision a 400-with-field-details (no 409); api integration tests as the behavioral backbone _(2026-09-26: ticket #137 landed — nine entity routers behind #136's single `requireSession` root (`/branches`, `/service-packages`, `/studio-services` + the two matrix PUTs, `/addon-services`, `/print-sizes`, `/attires`, `/gallery-categories` + `/order`, `/gallery-photos` + `/order`, `/testimonials` + `/order`); the atomic package save rewrites frames/inclusions/junctions in-transaction with array order = position, reference checks THROW inside the tx so a bad payload rolls back the whole save; covers bind/clear/replace through #136's `commitUpload` — presence-encoded (string = new bind, null = clear, absent = unchanged), the old object deleted only after the save commits; slugs generated via `slugifyName` at create, format- + uniqueness-checked on PUT, the old slug 404s publicly through the existing route; every uniqueness collision — pre-check AND the PG `23505` — a 400 with field details, no 409; admin reads include deactivated rows and resolve `coverImageUrl`/`photoUrl` via the new `resolveMediaUrl` (raw keys never leave the API); order PUTs are total full-replaces (every row, deactivated included, exactly once); api suite 153→262 (+3 gated skips) across 23 files; types/db/landing untouched — the write-model vocabulary was #135's)_
```

Checkboxes 4–10 stay unticked (#138–#143 own them).

- [ ] **Step 3: AGENTS.md — one appended sentence**

In `AGENTS.md`, extend the bullet starting `- **The DB is provisioned, the catalog is seeded, and auth is wired in.**` — append after #136's sentence (which ends `...including the owner handoff for the scoped R2 S3-token secrets.`):

```text
 The `/api/v1/admin` write model is live (M5 ticket 03): nine entity routers behind the one root `requireSession` — full-object POST/PUT with deactivation as the `isActive` flip, the atomic package save (frames/inclusions/junctions renumbered in-transaction, the cover bound through the commit contract), the two matrix full-replaces, the three order PUTs, slugs generated at create and editable on PUT, every uniqueness collision a 400 with field details.
```

- [ ] **Step 4: progress.md — the What Exists entry**

Insert at the TOP of `docs/progress.md`'s What Exists section (newest-first, the #135 precedent):

```text
2026-09-26 — #137 M5 ticket 03, the admin write model, landed: the whole catalog is now writable over one gated subtree. Nine entity routers (`/branches`, `/service-packages`, `/studio-services`, `/addon-services`, `/print-sizes`, `/attires`, `/gallery-categories`, `/gallery-photos`, `/testimonials`) mount under #136's `/api/v1/admin` root whose single `requireSession` answers the uniform 401 envelope before any validation — proven per router with a validation-bait anonymous probe plus a nine-router sweep (`admin-gate.test.ts`). Every entity: `GET /` (all rows incl. deactivated), `GET /:id`, `POST /` →201, `PUT /:id` →200, all returning canonical reads (`servicePackageReadSchema`/`galleryPhotoSchema` shapes; `coverImageUrl`/`photoUrl` resolved by the new `resolveMediaUrl` in `services/media.ts` — the one fenced addition to #136's seam; raw keys stripped server-side). Deactivation is the `isActive` flip; no delete endpoints; frames have no standalone routes. The atomic package save (`services/admin-packages.ts`): entity fields + `coverImageKey` + `frames[]` + `inclusions[]` in ONE transaction — frameNumber/inclusion/junction positions renumbered from array order, children deleted+reinserted (fresh uuids by design; the admin assembly reads `(position, id)` since id order would scramble after a rewrite), reference checks throw `AdminSaveError` inside the tx so a bad payload rolls back the WHOLE save (proven: the rename does not stick), and the whole tx rides `guardUnique` so a raced `23505` lands as the same 400. Covers: presence-encoded through #136's `commitUpload` (string = new bind, null = clear, absent = unchanged), old objects deleted only after commit. Slugs: `slugifyName(name)` at create (collision = name collision → 400), format- (`^[a-z0-9]+(-[a-z0-9]+)*$`) + uniqueness-checked on PUT, old slug 404s publicly through the existing by-slug route. Matrices (`PUT /studio-services/:id/branches|addons`) diff+rewrite in one transaction, deactivation-blind existence checks; the three order PUTs are TOTAL full-replaces (every row exactly once — unknown/missing/duplicate ids named in the 400 details). Shared plumbing in `services/admin-shared.ts`: the resolved-union failure contract (`AdminWriteResult`), the `conflict`/`invalid` vocabulary, the 23505 constraint→field mapper, `guardUnique`. Gallery fixtures (`loadGalleryFixtures`) + a recording R2 stub (`r2-stub.ts`) joined the test helpers. Types/db/client untouched (the vocabulary was #135's; client wrappers are #139+). Agent rulings for owner review: the PUT slug format check, matrix acceptance of deactivated ids, total order-PUT payloads, create position = max+1, children full-rewrite (id churn), `attireIds` dedupe, per-entity 404 wordings, uniform conflict message. Tests: api 153→262 (+3 gated skips) across 23 files. `pnpm check` 35/35. v1 pick + ledger row per the runbook.
```

- [ ] **Step 5: graphify + branch hygiene**

Run: `graphify update .` (code was modified — the AGENTS.md rule). Confirm `git status` shows only the intended docs edits; commit them:

```bash
git add docs/plan.md AGENTS.md docs/progress.md
git commit -m "docs: M5 ticket 03 — admin write model landed, status rotation (#137)"
```

- [ ] **Step 6: PR + merge**

```bash
gh pr create --title "feat: M5 ticket 03 — admin write model (gated entity CRUD, atomic package save, matrices, orders, slugs)" --body "Implements #137 (M5 spec § Route topology + § Mutation shapes + § Ordering + § Slugs). Nine entity routers behind #136's single requireSession at /api/v1/admin — the 401 envelope proven per router plus a nine-router sweep; the atomic package save (array order = position, junction rewrite, reference checks throw inside the tx → whole-save rollback); covers bind/clear/replace through commitUpload with after-commit old-key deletion; slugs generated at create, format+uniqueness checked on PUT, old slug 404s publicly; matrices diff+rewrite in one tx; three total order PUTs; every uniqueness collision a 400 with field details (no 409); admin reads include deactivated rows and resolve media URLs (resolveMediaUrl — the one additive extension to #136's seam). Zero types/db/client changes. pnpm check 35/35; api 153→262 (+3 gated skips) across 23 files. Agent rulings (owner-review pending) listed in the plan + progress note."
gh pr merge --squash --delete-branch
```

The push to main fires `deploy-teaser`. Watch it and spot-check the live gate (read-only):

```bash
gh run watch $(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId' -R jeius/sevendays) -R jeius/sevendays
curl -s -o /dev/null -w '%{http_code}' https://sevendays-api.pahamajulius.workers.dev/api/v1/admin/branches
```

Expected: the deploy job succeeds; the curl answers `401` (the gated family live on the teaser — mounted, gated, NOT 404/500). If the workers.dev URL is disabled for the api Worker, the CI run alone stands as the verification.

- [ ] **Step 7: The v1 pick + ledger row (per `docs/agents/v1-picks.md`)**

In the v1 seed clone (`~/Projects/sevendays-v1-seed`, branch `v1`), cherry-pick the squash commit and triage. Expected classes (the audit is the authority):

- **PICK (predicted, clean):** everything code-side — the new services (`admin-shared.ts`, `admin-entities.ts`, `admin-packages.ts`, `admin-gallery.ts` + tests), the new routers, the grown `admin.ts`/`gallery-photos.ts`, the `media.ts`/`service-packages.ts`/`fixtures.ts` edits, the test helper (`r2-stub.ts`) and the five test files. Every touched path is a v1-path and every hunk is booking-free (no absence-inventory token — the write model never touches appointments).
- **SPLIT: none predicted.** (`wrangler.toml`/CI are not touched by this ticket.)
- **SKIP (main-only):** `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, this plan file.

Gate the pick: `cd ~/Projects/sevendays-v1-seed && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` → exit 0 (if a token trips, STOP and bring the hit to the owner — never resolve in-loop). Lock: `pnpm check` + `pnpm build` green in the checkout, then push. Then the ledger row in `docs/agents/v1-picks.md` on main:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — M5 ticket 03 admin write model picked (#137)"
```

- [ ] **Step 8: Close the ticket with the owner-handoff note**

The PR's `Closes #137` auto-closes on merge; post the closing comment (the owner's morning read):

```text
Landed. The whole catalog is writable behind the session gate: nine entity routers, the atomic package save (frames/inclusions renumbered from array order, junctions rewritten in-transaction, bad payloads roll back whole), covers bound through ticket 02's commit contract, matrices + order PUTs as full-replaces, slugs generated at create and editable (with the break-links trade) on PUT, every uniqueness collision a 400 with field details — no 409 anywhere. Admin reads include deactivated rows and resolve absolute media URLs; raw keys never leave the API. Agent rulings for your morning review (spec-consistent defaults, all reversible): PUT slug format check (^[a-z0-9]+(-[a-z0-9]+)*$ — the alphabet slugifyName emits); matrix PUTs accept deactivated branch/add-on ids (existence-only; admin composes from admin reads); order PUTs must list every row exactly once (total full-replace); create position = max+1; package children are fully rewritten per save (frame/inclusion ids churn — nothing references them durably); duplicate attireIds collapse; uniform conflict message ("That value is already in use." + per-field detail). NOT in this ticket: public reads/trim rules (#138), admin screens (#139+), the CDP harness + seed demotion (#143). The api suite is the behavioral backbone: 262 tests over real Postgres (was 153).
```






