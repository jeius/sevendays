# M7 Ticket 02 — Guarded DELETE: the Nine-Entity API + Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **No UI-bearing tasks exist here** — this ticket is API + typed client wrappers only; the CMS delete dialogs ride M7 ticket 07 (#218). No owner-reacted rendered-variants round applies (no composition is created).

**Goal:** M5's delete-nowhere reverses and refines (ticket #159, spec § Guarded DELETE everywhere): every one of the nine CMS entities gains a true `DELETE /api/v1/admin/<entity>/:id` behind the existing `requireSession` root, deletable **only while nothing references the row** — testimonials + gallery photos blocked by nothing (the photo's R2 object deletes with it); gallery categories by any photo in the category; print sizes by any inclusion resolving them; attires by any inclusion-attire; add-on services / branches / service packages / studio services by **any Appointment ever** (any status including cancelled/no-show). A blocked delete answers the house 400-with-field-details naming exactly what blocks (owner-ratified copy below); composition rows (frames, inclusions, inclusion-attires) and both matrices' rows cascade inside the delete transaction; covers and photos are ADR-0019 §5 lifecycle events — **DB commit first, then the object delete** (the #137 cover-replace precedent); history-bearing rows keep Deactivation as their only retire path, permanently; delete frees the unique name + slug. One guard service (`apps/api/src/services/admin-delete.ts`) shares the contract across the nine; the typed client wrappers (`packages/api-client`) gain `remove()` per group with loopback coverage; committed deletes join the Audit Log as a **`'delete'`** action (owner-confirmed 2026-10-12). The ticket's prose debt clears (the schema's "never deleted" comments, the M5 spec banner's built-note, plan.md's M5 header line). The M7 roadmap box stays **unticked** — it spans #218's dialogs (the shared-checkbox fence below).

**Architecture:** Five tasks: (1) `'delete'` joins the audit action vocabulary — `packages/types`' `auditActionSchema` widens (the db column is `text`, so **zero migrations**) and the #188 viewer's `AUDIT_ACTION_LABELS` gains the label the exhaustive `Record` forces; two existing negative pins flip (types' `safeParse('delete') === false` and admin filters' `'delete'` drop-fixture); (2) the guard service lands with its first half — the `AdminDeleteResult` union + `blocked()` factory + the five unguarded/lookup entities (testimonials, photos, categories, print sizes, attires) — each router gains its chained `.delete('/:id')`, and the new `apps/api/test/admin-delete.test.ts` suite pins this half (blocked/clean/404 + the five 401-before-validation its); (3) the appointment-bearing four (branches, add-ons, studio services, packages) — the "any Appointment ever" count guards (no status filter), in-transaction cascades (matrix rows and children deleted explicitly; only `package_inclusion_attires` rides its DB-level `ON DELETE CASCADE` on `inclusion_id`), the after-commit cover/photo object deletes, the name+slug-freeing pin, and this half's 401s + the `admin_mutation` log pin; (4) `packages/api-client` — nine `remove(): Promise<void>` wrappers (the **204 seam**: `unwrapError`-only on non-2xx, no body parse — the `thumbResponse` precedent), one typing pin, and loopback coverage over a minimal admin subtree added to the hand-maintained mock; (5) gates + docs rotation (the prose debt, plan.md's shared-box annotation, progress/AGENS floors) + PR/merge + the v1 pick (pre-ruled **PICK clean** by the spec's class ledger) + ledger row + issue close.

**Tech Stack:** zero new dependencies, zero manifest changes, **zero migrations** — drizzle-orm 0.45.2 (`count()` joins `eq`/`and` in the guard queries), hono 4.13.5 (chained `.delete()` registration — the client's `$delete` presence grep-proven in `packages/api-client/node_modules/hono/dist/types/client/types.d.ts:13`), zod 4.5.1, vitest 4 per-package, pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#213 "M7 ticket 02: guarded DELETE — the nine-entity API + guards"](https://github.com/jeius/sevendays/issues/213) (label `ready-for-agent`), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *Guarded DELETE everywhere (#159 — M5's delete-nowhere reversed and refined)* is this ticket's ruling). Key recon facts (2026-10-12, main `c238acb` — post-#212; all files read this session):

- **The write-model pattern this extends (landed code):** services resolve typed failures (`admin-shared.ts`'s `AdminWriteResult` — `{ok:true,row} | {ok:false,reason:'not_found'} | AdminWriteFailure`), thin routes map (`not_found` → per-entity 404, failure → `badRequest(c, message, details)`); every write opens a transaction whose LAST statement is its `writeAuditRow` (M6 #185); `logAdminMutation` fires at the route after `ok`. The delete contract ADDS a third failure reason — `'blocked'` — in its own `AdminDeleteResult` union inside the new `admin-delete.ts` (admin-shared stays the write-model's contract; delete is a new module, one file for all nine).
- **The FK ground truth (packages/db/src/schema, all read):** `appointments` references branches (`.notNull()`) + both offerings (nullable, no cascades); `appointment_addon_services` references appointments + addon_services (no cascades); `branch_studio_services.branchId` has **no** cascade but `.studioServiceId` **does** cascade; `studio_service_addon_services.addonServiceId` **no** cascade, `.studioServiceId` **does**; `package_inclusions.servicePackageId/.printSizeId/.frameId` all **no** cascade; `frames.servicePackageId` **no** cascade; `package_inclusion_attires.inclusionId` **does** cascade (`ON DELETE CASCADE`), `.attireId` **no**; `gallery_photos.categoryId` **no** cascade. Consequence (pinned in the service): every child/matrix delete is EXPLICIT in the transaction except the inclusion-attire junctions, which ride the DB cascade when their inclusions delete.
- **The object-lifecycle precedent (#137, `admin-packages.ts:426-432` + `admin-gallery.ts:464-468`):** the old object is deleted **only AFTER the transaction committed** — `env.MEDIA_BUCKET.delete(key)` post-commit; a rolled-back or failed save never touches the bucket. Deletes follow the same shape; the r2-stub's `deleteCalls` (apps/api/test/helpers/r2-stub.ts) is the assertion vehicle.
- **The audit vocabulary gap (owner-confirmed 2026-10-12):** `packages/types/src/audit.ts:11` — `z.enum(['create','update','deactivate','reorder'])` — has NO `'delete'`; the db column is `text('action')` (audit-log.ts:25) so widening is types-only, **no migration**. Two existing negative pins encode today's contract and must flip: `packages/types/src/audit.test.ts:30` (`safeParse('delete') === false`) and `apps/admin/src/lib/audit/filters.test.ts:50-54` (uses `'delete'` as the unknown-value drop fixture). The viewer's `AUDIT_ACTION_LABELS` (`filters.ts:111-116`) is an exhaustive `Record<AuditAction, string>` — typecheck forces the label once the enum widens (run `pnpm build:packages` in between).
- **Fixture ground truth (apps/api/test/helpers/fixtures.ts, read in full):** `loadFixtures` — branchA/branchB (branchB's only reference is the portrait matrix link), packages Combined/Simple/Retired (Retired has NO children and NO cover — the clean-delete + name/slug-free candidate; Simple owns frameSimple + one 2R inclusion + its Toga junction), ALL THREE print sizes are inclusion-referenced (a clean print-size delete needs a fresh row created via the admin POST first), attireToga/Filipiniana/Executive are junction-referenced while **attireUniform is not**, addonRetired carries the studio→addon matrix row, serviceStudio carries rows in BOTH matrices, servicePortrait carries two branch links + the makeup link. `loadGalleryFixtures` — categoryA/categoryB hold photos, **categoryRetired holds none** (clean delete), photoRetired is uncategorized. No fixture inserts appointments — the guard tests insert them directly (`db.insert(appointments)`, the #212 direct-db-state precedent).
- **Sibling fences (spec § Sequencing; docs/plan.md M7 block):** NOT here, regardless of temptation: **the CMS delete dialogs, the pending vocabulary over deletes, and the M7 roadmap box's tick** — #218's ("Delete dialogs wiring the DELETE routes (M7 ticket 02) on all nine screens" is #218's own AC; the shared plan.md box spans both tickets and **stays unticked until #218** — the fence is a Global Constraint); the packages expanded row (#219); branch covers + gallery captions (#214 — touches branches' schema/wire additively; nothing here conflicts); site settings (#215); dark mode (#216); the testimonial-submissions table and its delete-any-status route (#216's neighbor #216/#215 family — the submissions QUEUE is ticket 05, and `testimonial_submissions` does not exist yet; this ticket's testimonials delete touches only the EXISTING `testimonials` table); the live-stack reflection scenario + M7 close-out (#225); `create-staff`/staff-provisioning demotion (#221's neighborhood — the Users-tab ticket owns user deletion; **user/account rows are NOT among the nine catalog entities** and nothing here touches auth tables); the seed (deletes never run at seed time); `apps/admin/package.json` (the owner's uncommitted dev-port change rides above the branch — never staged).
- **Baselines (live, per AGENTS.md post-#212):** types **14 files / 129 tests**; api **27 passed + 1 skipped files (28) / 350 passed + 3 skipped**; api-client **5 files / 33 tests**; admin **17 files / 184 tests**; landing 9/83 (untouched); db 4 files (untouched). After this ticket: **types 14/129 + admin 17/184 + landing 9/83 unchanged** (Task 1 edits existing its, adds none), **api 28 passed + 1 skipped files (29) / 388 passed + 3 skipped** (the new 37-it `admin-delete.test.ts` + 1 `admin-mutation-log.test.ts` pin), **api-client 5 / 37** (+1 typing, +3 loopback). (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.) Migrations **0000–0009** applied; this ticket generates **none**.
- **The dev-db port wrinkle (this machine, verified 2026-10-12 via the #212 session):** an unrelated project's container (`lactalink-test-db`) squats host port 5432. The sevendays compose db runs remapped: `printf 'services:\n  db:\n    ports: !override\n      - "5433:5432"\n' > /tmp/sevendays-db-port.yml && docker compose -f compose.yaml -f /tmp/sevendays-db-port.yml up -d db`, and every api test command prefixes `TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test'`. If 5432 is free in the executor's session, plain `docker compose up -d db` and no prefix. **Never** point the suite at the lactalink container.

## Global Constraints

- **Branch & baseline:** `feat/213-guarded-delete` off main `c238acb` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#213)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, guard-response bodies) lands in gitignored `.superpowers/sdd/2026-10-12-213-guarded-delete/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs** (hono/drizzle/zod all installed). Every task commits only with the checks green **for the packages it touched** (AGENTS.md's letter); the per-task commands are pinned below. After any `packages/types/src` edit, run `pnpm build:packages` before downstream typecheck/tests (dist/ is gitignored; turbo `typecheck` builds `^` but `test` does not) — **Task 1's types+admin pair commits together precisely so no red window opens** (the admin label is forced by the widened enum). The api suite needs the compose db (the port recipe above). Biome canonical form via `pnpm --filter <pkg> fix` before committing — accept its rewrites. Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (Task 5 — code was modified).
- **The DELETE wire contract (owner-ratified 2026-10-12, binding):** success is **204 No Content, no body** — `return c.body(null, 204)` at every route; the first 204 in the codebase, ratified because nothing downstream needs the dead row (#218's dialogs already hold it) and the packages read-back would assemble a composition for a row about to die. The client wrapper is the **unwrapError-only seam** (the `thumbResponse` precedent): non-2xx throws `ApiClientError`, 2xx resolves `undefined`, **no `unwrap()` call — there is no body to parse**.
- **The blocked-delete copy (owner-ratified 2026-10-12, binding, lands verbatim in #218's dialog bodies):** HTTP 400 with `{ "error": "Blocked by existing references.", "details": [...] }` — `details` carries **one entry per blocking family, count-bearing**, exactly:
  - appointments (branches / packages / studio services / add-ons): `{ "path": ["appointments"], "message": "referenced by N appointment(s)" }`
  - photos in a category: `{ "path": ["photos"], "message": "contains N photo(s)" }`
  - print sizes: `{ "path": ["inclusions"], "message": "used by N package inclusion(s)" }`
  - attires: `{ "path": ["inclusions"], "message": "attached to N package inclusion(s)" }`
  N is the live count at guard time. No 409 anywhere (the house vocabulary `{400, 401, 404, 500}` stands).
- **The guard laws (spec § Guarded DELETE, binding):** "any Appointment ever" = a **row count over `appointments` with NO status filter** (cancelled and no_show block exactly like pending/confirmed/completed — pinned by test). Guards run BEFORE any transaction opens (a blocked delete records no audit row and never touches the bucket). Deletion order inside each transaction: **children and matrix rows first (explicit deletes), then the entity row, then the audit row** — `package_inclusions` before `frames` (inclusions hold the frame FK; the save's own order, `admin-packages.ts:340-341`); the `package_inclusion_attires` junctions ride the DB-level `ON DELETE CASCADE` on `inclusion_id` (never deleted explicitly). Object deletes (`gallery_photos.r2Key`, `service_packages.cover_image_key` when non-null) happen **only after the transaction committed** (ADR-0019 §5 + the #137 precedent); a blocked or rolled-back delete leaves the bucket untouched.
- **The audit law (owner-confirmed 2026-10-12, binding):** every committed delete writes ONE `audit_log` row inside the delete's transaction — `{ entity, entityId: <row id>, action: 'delete', summary: <name | code | person | title ?? r2Key> }` (the create-path summaries, mirrored); `auditActionSchema` widens to `['create','update','deactivate','reorder','delete']`; the viewer's label is `delete: 'Delete'`. Failed validations and blocked deletes record nothing. `logAdminMutation` fires at the route after `ok` (entity + the deleted id) — the ephemeral twin.
- **Delete frees the unique name + slug (binding):** no code change is needed (uniqueness lives on live rows) — the pin is the TEST: after deleting a row, creating a new row with the same name (packages: same name → same regenerated slug) answers 201. Deactivated rows keep squatting both — deletes are the only release. **Positions never compact** on delete (photos/testimonials/categories): positions are server-assigned max+1 and the order PUT full-replaces 1..N over whatever rows exist; gaps are invisible and harmless (YAGNI — recorded here so no executor "fixes" them).
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result.
- **Scope fence (verbatim):** Task 1 edits only `packages/types/src/{audit.ts,audit.test.ts}` + `apps/admin/src/lib/audit/{filters.ts,filters.test.ts}`. Task 2 creates `apps/api/src/services/admin-delete.ts` + `apps/api/test/admin-delete.test.ts` and edits only `apps/api/src/routes/{admin-testimonials,gallery-photos,admin-gallery-categories,admin-print-sizes,admin-attires}.ts`. Task 3 extends `admin-delete.ts` + `admin-delete.test.ts` and edits only `apps/api/src/routes/{admin-branches,admin-addon-services,admin-studio-services,admin-service-packages}.ts` + `apps/api/test/admin-mutation-log.test.ts`. Task 4 edits only `packages/api-client/src/routes/admin.ts` + `packages/api-client/test/{mock-api.ts,loopback.test.ts,typing.test.ts}`. Task 5 rotates `packages/db/src/schema/gallery-categories.ts`, `apps/api/src/services/admin-gallery.ts`, `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/specs/2026-09-24-m5-admin-cms-spec.md`, `graphify-out/`, `docs/agents/v1-picks.md` (post-merge), and works the PR/pick/issue — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
packages/types/src/
  audit.ts                                       # modify (T1) — auditActionSchema + 'delete'
  audit.test.ts                                  # modify (T1) — loop gains 'delete', negative pin re-seats
apps/admin/src/lib/audit/
  filters.ts                                     # modify (T1) — AUDIT_ACTION_LABELS + delete: 'Delete'
  filters.test.ts                                # modify (T1) — drop-fixture 'delete' → 'purge'
apps/api/
  src/services/admin-delete.ts                   # create (T2 half, T3 half) — the one guard service, all nine
  src/routes/admin-testimonials.ts               # modify (T2) — .delete('/:id')
  src/routes/gallery-photos.ts                   # modify (T2) — .delete('/:id')
  src/routes/admin-gallery-categories.ts         # modify (T2) — .delete('/:id')
  src/routes/admin-print-sizes.ts                # modify (T2) — .delete('/:id')
  src/routes/admin-attires.ts                    # modify (T2) — .delete('/:id')
  src/routes/admin-branches.ts                   # modify (T3) — .delete('/:id')
  src/routes/admin-addon-services.ts             # modify (T3) — .delete('/:id')
  src/routes/admin-studio-services.ts            # modify (T3) — .delete('/:id')
  src/routes/admin-service-packages.ts           # modify (T3) — .delete('/:id')
  test/admin-delete.test.ts                      # create (T2 half, T3 half) — the 37-it guard suite
  test/admin-mutation-log.test.ts                # modify (T3) — +1 the DELETE mutation-line pin
packages/api-client/
  src/routes/admin.ts                            # modify (T4) — nine remove() wrappers + Delete args types
  test/mock-api.ts                               # modify (T4) — minimal admin subtree (branches + print-sizes DELETE)
  test/loopback.test.ts                          # modify (T4) — +3 its over the delete wrappers
  test/typing.test.ts                            # modify (T4) — +1 the remove() typing pin
packages/db/src/schema/gallery-categories.ts     # modify (T5) — the "never deleted" comment amends
apps/api/src/services/admin-gallery.ts           # modify (T5) — the "No hard deletes" comment amends
docs/plan.md docs/progress.md AGENTS.md docs/specs/2026-09-24-m5-admin-cms-spec.md graphify-out/ docs/agents/v1-picks.md  # T5
```

---

### Task 1: `'delete'` joins the audit action vocabulary — `packages/types` + the viewer label (TDD)

**Files:**
- Modify (test-first): `packages/types/src/audit.test.ts`, `apps/admin/src/lib/audit/filters.test.ts`
- Modify: `packages/types/src/audit.ts`, `apps/admin/src/lib/audit/filters.ts`

**Interfaces:**
- Produces (what Tasks 2–3 consume): `AuditAction` widens to `'create' | 'update' | 'deactivate' | 'reorder' | 'delete'` — the delete services' `writeAuditRow` calls pass `action: 'delete'` type-safely. What the viewer consumes: `AUDIT_ACTION_LABELS.delete === 'Delete'` (the exhaustive `Record` + the `filters.test.ts` "every enum value is labeled" it keep it pinned).
- Consumes: nothing new (the enum, `writeAuditRow`, and the labels map all exist).

**Not here:** any api/api-client code (Tasks 2–4 — they typecheck against the built types after `pnpm build:packages`); any db migration (the `audit_log.action` column is `text` — widening the Zod enum is the whole change); the Audit Log viewer's UI (the label map is data; the filter dropdown derives from it).

- [ ] **Step 1: Flip the two negative pins + widen the loop (the failing tests)**

(a) `packages/types/src/audit.test.ts` — line 24, the positive loop gains `'delete'`:

```ts
    for (const action of ['create', 'update', 'deactivate', 'reorder', 'delete']) {
```

and line 30, the negative pin re-seats onto a word that stays invalid (once `'delete'` joins the enum, the old assertion inverts its meaning):

```ts
  it('rejects a non-action string', () => {
    expect(auditActionSchema.safeParse('purge').success).toBe(false);
  });
```

(If the surrounding `it` wording differs, keep the file's own wording — only the parsed value changes from `'delete'` to `'purge'`.)

(b) `apps/admin/src/lib/audit/filters.test.ts` — lines 50–54, the unknown-value drop fixture re-seats the same way: `action: 'delete'` becomes `action: 'purge'` (with `'delete'` about to become valid, the drop fixture must use a still-invalid word — the assertion `expect(dropped.action).toBeUndefined()` stands unchanged).

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/types test -- --run src/audit.test.ts` — FAILS (the loop now parses `'delete'`, which today's enum rejects). The admin test change is green-on-arrival (`'purge'` drops identically before and after the widening — it is Step 3's companion, changed here so Task 1 commits as one unit). Record the red in the evidence dir.

- [ ] **Step 3: Widen the enum + add the viewer label**

(a) `packages/types/src/audit.ts` — line 11, replace:

```ts
export const auditActionSchema = z.enum(['create', 'update', 'deactivate', 'reorder']);
```

with:

```ts
// 'delete' joined with M7 #213 (guarded DELETE, owner-confirmed 2026-10-12):
// a committed delete is a committed admin mutation — one audit row, in the
// delete's own transaction. The db column is text; no migration rides this.
export const auditActionSchema = z.enum(['create', 'update', 'deactivate', 'reorder', 'delete']);
```

(b) `apps/admin/src/lib/audit/filters.ts` — `AUDIT_ACTION_LABELS` (lines 111–116) gains the key the widened enum now forces (typecheck fails without it):

```ts
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Create',
  update: 'Update',
  deactivate: 'Deactivate',
  reorder: 'Reorder',
  delete: 'Delete',
};
```

and the comment block above `AUDIT_ENTITY_LABELS` (lines 97–98) — `the nine entity families and four actions` becomes `the nine entity families and five actions`.

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/types test -- --run` — **14 files / 129 tests** (counts unchanged; the same its, edited). Then `pnpm build:packages`, then `pnpm --filter @sevendays/admin test` — **17 files / 184 tests** (the "every enum value is labeled" it now covers five actions; the re-seated drop fixture stays green). Then `pnpm --filter @sevendays/types fix` + `pnpm --filter @sevendays/admin fix` (re-run both suites — fix must not change counts), `pnpm --filter @sevendays/types typecheck` + `pnpm --filter @sevendays/admin typecheck`. Commit:

```bash
git add packages/types/src/audit.ts packages/types/src/audit.test.ts apps/admin/src/lib/audit/filters.ts apps/admin/src/lib/audit/filters.test.ts
git commit -m "feat(types,admin): 'delete' joins the audit action vocabulary - enum + viewer label, both negative pins re-seated (#213)"
```

### Task 2: `apps/api` — the guard service + the five unguarded/lookup entities (TDD)

**Files:**
- Create (test-first): `apps/api/test/admin-delete.test.ts` (this task creates it with its first 18 its)
- Create: `apps/api/src/services/admin-delete.ts` (this task creates it with the union + factory + five functions)
- Modify: `apps/api/src/routes/admin-testimonials.ts`, `gallery-photos.ts`, `admin-gallery-categories.ts`, `admin-print-sizes.ts`, `admin-attires.ts`

**Interfaces:**
- Produces (what Task 3 extends and the routes consume): `admin-delete.ts` exports `AdminDeleteResult = { ok: true } | { ok: false; reason: 'not_found' } | AdminDeleteFailure` where `AdminDeleteFailure = { ok: false; reason: 'blocked'; message: string; details: AdminDetail[] }`; `deleteAdminTestimonial(db, audit, id)`, `deleteAdminGalleryPhoto(db, env: PhotoEnv, audit, id)`, `deleteAdminGalleryCategory(db, audit, id)`, `deleteAdminPrintSize(db, audit, id)`, `deleteAdminAttire(db, audit, id)` — all `Promise<AdminDeleteResult>`.
- Consumes: Task 1's widened `AuditAction` (the `'delete'` literal typechecks), `admin-shared.ts`'s `AdminDetail`, `audit.ts`'s `AuditActor`/`writeAuditRow`, `admin-gallery.ts`'s exported `PhotoEnv` type, the existing `validatedParam`/`badRequest`/`notFound`/`auditActor`/`logAdminMutation` route vocabulary.

**Not here:** the four appointment-bearing entities (Task 3 — their guards read `appointments`); the api-client wrappers (Task 4); any UI. The 401 its in this task's describe are green-on-arrival regression pins (the root `requireSession` gates unmatched routes too) — they pin the ordering contract, exactly like the existing per-family `validation-bait` its in `admin-entities.test.ts`.

- [ ] **Step 1: Write the failing suite (part one — the file's full first half)**

Create `apps/api/test/admin-delete.test.ts` with exactly:

```ts
import {
  attires as attiresTable,
  auditLog,
  galleryCategories as galleryCategoriesTable,
  galleryPhotos as galleryPhotosTable,
  testimonials as testimonialsTable,
} from '@sevendays/db';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds, GalleryFixtureIds } from './helpers/fixtures.js';
import { loadFixtures, loadGalleryFixtures } from './helpers/fixtures.js';
import { stubCommitBucket } from './helpers/r2-stub.js';
import { truncateAll } from './helpers/truncate.js';

// The guarded-DELETE contract suite (M7 #213): per-entity guard answers,
// cascades, object-delete ordering, the 401-before-validation ordering, and
// the freed name/slug. Appointments are inserted directly (the #212
// direct-db-state precedent) — the guard reads rows, not API history.
const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;
let gids: GalleryFixtureIds;

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
  gids = await loadGalleryFixtures(db);
});

describe('guarded DELETE — testimonials + gallery photos (blocked by nothing)', () => {
  it('testimonial deletes clean — 204 with no body, row gone, the audit row lands', async () => {
    const [row] = await db
      .select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.id, gids.testimonialA))
      .limit(1);
    if (!row) throw new Error('delete suite: testimonial fixture missing');
    const res = await authed(
      'DELETE',
      `/api/v1/admin/testimonials/${gids.testimonialA}`,
      'delete-testimonial-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    const remaining = await authed(
      'GET',
      '/api/v1/admin/testimonials',
      'delete-testimonial-list@sevendays.test'
    );
    const remainingIds = ((await remaining.json()) as { id: string }[]).map((t) => t.id);
    expect(remainingIds).not.toContain(gids.testimonialA);
    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, 'testimonial'), eq(auditLog.entityId, gids.testimonialA)))
      .limit(1);
    expect(auditRow?.action).toBe('delete');
    expect(auditRow?.summary).toBe(row.person);
  });

  it('testimonial unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/testimonials/00000000-0000-4000-8000-000000000000',
      'delete-testimonial-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Testimonial not found.' });
  });

  it('photo deletes clean — the R2 object goes with the row, exactly once, after the commit', async () => {
    const stub = stubCommitBucket();
    const [row] = await db
      .select()
      .from(galleryPhotosTable)
      .where(eq(galleryPhotosTable.id, gids.photoA))
      .limit(1);
    if (!row) throw new Error('delete suite: photo fixture missing');
    const { token } = await signUpSession(url, 'delete-photo-ok@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${gids.photoA}`,
      { method: 'DELETE', headers: bearer(token) },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(204);
    expect(stub.deleteCalls).toEqual([row.r2Key]);
    const [gone] = await db
      .select()
      .from(galleryPhotosTable)
      .where(eq(galleryPhotosTable.id, gids.photoA))
      .limit(1);
    expect(gone).toBeUndefined();
  });

  it('photo unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000',
      'delete-photo-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Photo not found.' });
  });
});

describe('guarded DELETE — the reference-guarded lookups', () => {
  it('category with photos → 400 naming the blocking family + count; nothing deleted', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/gallery-categories/${gids.categoryA}`,
      'delete-cat-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['photos'], message: 'contains 1 photo(s)' }],
    });
    const [row] = await db
      .select()
      .from(galleryCategoriesTable)
      .where(eq(galleryCategoriesTable.id, gids.categoryA))
      .limit(1);
    expect(row?.id).toBe(gids.categoryA);
  });

  it('category with no photos deletes clean (the deactivated one) — 204 + audit row', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/gallery-categories/${gids.categoryRetired}`,
      'delete-cat-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.entity, 'gallery-category'), eq(auditLog.entityId, gids.categoryRetired))
      )
      .limit(1);
    expect(auditRow?.action).toBe('delete');
  });

  it('category unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/gallery-categories/00000000-0000-4000-8000-000000000000',
      'delete-cat-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Gallery category not found.' });
  });

  it('print size resolved by inclusions → 400 with the inclusion count (fixture truth: 2)', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/print-sizes/${ids.printSize2R}`,
      'delete-print-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['inclusions'], message: 'used by 2 package inclusion(s)' }],
    });
  });

  it('a fresh print size deletes clean — create via POST, then DELETE → 204', async () => {
    const created = await authed('POST', '/api/v1/admin/print-sizes', 'delete-print-ok@sevendays.test', {
      code: 'Z9',
      description: 'Transient size.',
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const res = await authed(
      'DELETE',
      `/api/v1/admin/print-sizes/${id}`,
      'delete-print-ok2@sevendays.test'
    );
    expect(res.status).toBe(204);
  });

  it('print size unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/print-sizes/00000000-0000-4000-8000-000000000000',
      'delete-print-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Print size not found.' });
  });

  it('attire attached to inclusions → 400 with the junction count (fixture truth: 3)', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/attires/${ids.attireToga}`,
      'delete-attire-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['inclusions'], message: 'attached to 3 package inclusion(s)' }],
    });
  });

  it('attire with no junctions deletes clean — 204, row gone (the untouched fixture attire)', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/attires/${ids.attireUniform}`,
      'delete-attire-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const [gone] = await db
      .select()
      .from(attiresTable)
      .where(eq(attiresTable.id, ids.attireUniform))
      .limit(1);
    expect(gone).toBeUndefined();
  });

  it('attire unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/attires/00000000-0000-4000-8000-000000000000',
      'delete-attire-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Attire not found.' });
  });
});

describe('guarded DELETE — the 401 gate precedes validation (this half)', () => {
  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (testimonials)', async () => {
    const res = await app.request(
      '/api/v1/admin/testimonials/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (gallery-photos)', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-photos/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (gallery-categories)', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-categories/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (print-sizes)', async () => {
    const res = await app.request(
      '/api/v1/admin/print-sizes/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (attires)', async () => {
    const res = await app.request(
      '/api/v1/admin/attires/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
```

- [ ] **Step 2: Run red**

With the compose db up (the Global Constraints port recipe): `TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run test/admin-delete.test.ts` — the 13 guard/cascade its FAIL (the routes do not exist: every DELETE answers the root 404 `Not found.`), the 5 gate its pass (green-on-arrival pins — `requireSession` gates unmatched routes too; they pin the ordering contract, not the route's existence). Record the red in the evidence dir.

- [ ] **Step 3: Write the guard service's first half**

Create `apps/api/src/services/admin-delete.ts` with exactly:

```ts
import type { Database } from '@sevendays/db';
import {
  attires,
  galleryCategories,
  galleryPhotos,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  testimonials,
} from '@sevendays/db';
import { count, eq } from 'drizzle-orm';
import type { PhotoEnv } from './admin-gallery.js';
import type { AdminDetail } from './admin-shared.js';
import { type AuditActor, writeAuditRow } from './audit.js';

// The guarded-DELETE service (M7 #213, reversing M5's delete-nowhere per the
// M7 spec § Guarded DELETE everywhere): ONE contract across the nine CMS
// entities — a row is truly deletable only while nothing references it. A
// blocked delete resolves as the 'blocked' failure the thin routes map to
// the house 400-with-field-details (owner-ratified copy, 2026-10-12:
// 'Blocked by existing references.' + one count-bearing detail per blocking
// family). "Any Appointment ever" means ANY status including cancelled and
// no_show — the guards count rows, never filter status. Children and matrix
// rows cascade INSIDE the transaction as explicit deletes (only
// package_inclusion_attires rides its DB-level ON DELETE CASCADE on
// inclusion_id); covers and photos are ADR-0019 §5 lifecycle events — the
// DB commit lands FIRST, the object delete after (the #137 cover-replace
// precedent), so a blocked or rolled-back delete never touches the bucket.
// Every committed delete writes its audit row (action 'delete') as the
// transaction's last statement — the #185 law carried to the new action.

export type AdminDeleteFailure = {
  ok: false;
  reason: 'blocked';
  message: string;
  details: AdminDetail[];
};

export type AdminDeleteResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | AdminDeleteFailure;

/** The blocked-delete failure — the owner-ratified message, one detail per blocking family. */
function blocked(details: AdminDetail[]): AdminDeleteFailure {
  return { ok: false, reason: 'blocked', message: 'Blocked by existing references.', details };
}

// --- testimonials (blocked by nothing) ---------------------------------------

export async function deleteAdminTestimonial(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  await db.transaction(async (tx) => {
    await tx.delete(testimonials).where(eq(testimonials.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'testimonial',
      entityId: id,
      action: 'delete',
      summary: current.person,
    });
  });
  return { ok: true };
}

// --- gallery photos (blocked by nothing; the R2 object deletes with the row) -

export async function deleteAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  await db.transaction(async (tx) => {
    await tx.delete(galleryPhotos).where(eq(galleryPhotos.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'gallery-photo',
      entityId: id,
      action: 'delete',
      summary: current.title ?? current.r2Key,
    });
  });
  // ADR-0019 §5 lifecycle event: the row committed first; the object goes now.
  await env.MEDIA_BUCKET.delete(current.r2Key);
  return { ok: true };
}

// --- gallery categories (blocked by any photo in the category) ---------------

export async function deleteAdminGalleryCategory(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db
    .select()
    .from(galleryCategories)
    .where(eq(galleryCategories.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [photoCount] = await db
    .select({ value: count() })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.categoryId, id));
  const photos = photoCount?.value ?? 0;
  if (photos > 0) {
    return blocked([{ path: ['photos'], message: `contains ${photos} photo(s)` }]);
  }
  await db.transaction(async (tx) => {
    await tx.delete(galleryCategories).where(eq(galleryCategories.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'gallery-category',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}

// --- print sizes (blocked by any inclusion resolving them) -------------------

export async function deleteAdminPrintSize(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(printSizes).where(eq(printSizes.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [inclusionCount] = await db
    .select({ value: count() })
    .from(packageInclusions)
    .where(eq(packageInclusions.printSizeId, id));
  const inclusions = inclusionCount?.value ?? 0;
  if (inclusions > 0) {
    return blocked([{ path: ['inclusions'], message: `used by ${inclusions} package inclusion(s)` }]);
  }
  await db.transaction(async (tx) => {
    await tx.delete(printSizes).where(eq(printSizes.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'print-size',
      entityId: id,
      action: 'delete',
      summary: current.code,
    });
  });
  return { ok: true };
}

// --- attires (blocked by any inclusion-attire) -------------------------------

export async function deleteAdminAttire(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(attires).where(eq(attires.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [junctionCount] = await db
    .select({ value: count() })
    .from(packageInclusionAttires)
    .where(eq(packageInclusionAttires.attireId, id));
  const junctions = junctionCount?.value ?? 0;
  if (junctions > 0) {
    return blocked([
      { path: ['inclusions'], message: `attached to ${junctions} package inclusion(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    await tx.delete(attires).where(eq(attires.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'attire',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}
```

- [ ] **Step 4: The five route registrations**

Every router appends its DELETE route at the END of the existing chain (the DELETE method has no static-path conflict with `/order` or `/:id`), with the import `deleteAdmin<Entity>` joined into a new `import { … } from '../services/admin-delete.js';` line placed with the file's other service imports.

(a) `apps/api/src/routes/admin-testimonials.ts` — import `deleteAdminTestimonial`; append:

```ts
  .delete('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const result = await deleteAdminTestimonial(c.get('db'), auditActor(c), id);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return notFound(c, 'Testimonial not found.');
      }
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'testimonial', entityId: id });
    return c.body(null, 204);
  });
```

(b) `apps/api/src/routes/gallery-photos.ts` — import `deleteAdminGalleryPhoto`; append (note the `c.env` thread, the file's own PhotoEnv convention):

```ts
  .delete('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const result = await deleteAdminGalleryPhoto(c.get('db'), c.env, auditActor(c), id);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return notFound(c, 'Photo not found.');
      }
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'gallery-photo', entityId: id });
    return c.body(null, 204);
  });
```

(c) `apps/api/src/routes/admin-gallery-categories.ts` — import `deleteAdminGalleryCategory`; append the same shape as (a) with `'Gallery category not found.'` and `entity: 'gallery-category'`.

(d) `apps/api/src/routes/admin-print-sizes.ts` — import `deleteAdminPrintSize`; append the same shape as (a) with `'Print size not found.'` and `entity: 'print-size'`.

(e) `apps/api/src/routes/admin-attires.ts` — import `deleteAdminAttire`; append the same shape as (a) with `'Attire not found.'` and `entity: 'attire'`.

- [ ] **Step 5: Green + gates + commit**

`TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run test/admin-delete.test.ts` — **18 its green**. Then the full api suite: `TEST_DATABASE_URL=… pnpm --filter @sevendays/api test -- --run` — 28 passed + 1 skipped files (29) / **368 passed + 3 skipped** (350 + this task's 18). Then `pnpm --filter @sevendays/api fix` (re-run the suite — fix must not change counts), `pnpm --filter @sevendays/api typecheck`, and `pnpm build` is NOT this task's gate (api-client wrappers land in Task 4; nothing downstream imports the new routes yet). Commit:

```bash
git add apps/api/src/services/admin-delete.ts apps/api/test/admin-delete.test.ts apps/api/src/routes/admin-testimonials.ts apps/api/src/routes/gallery-photos.ts apps/api/src/routes/admin-gallery-categories.ts apps/api/src/routes/admin-print-sizes.ts apps/api/src/routes/admin-attires.ts
git commit -m "feat(api): guarded DELETE part one - the guard service + testimonials, photos, categories, print sizes, attires (#213)"
```

### Task 3: `apps/api` — the appointment-bearing four: any-Appointment-ever guards, cascades, cover lifecycle, name/slug freeing (TDD)

**Files:**
- Modify (test-first): `apps/api/test/admin-delete.test.ts` (appends its second half: 19 its)
- Modify: `apps/api/src/services/admin-delete.ts` (appends the four functions + extends the imports)
- Modify: `apps/api/src/routes/admin-branches.ts`, `admin-addon-services.ts`, `admin-studio-services.ts`, `admin-service-packages.ts`
- Modify: `apps/api/test/admin-mutation-log.test.ts` (appends the DELETE mutation-line pin)

**Interfaces:**
- Produces: `deleteAdminBranch(db, audit, id)`, `deleteAdminAddonService(db, audit, id)`, `deleteAdminStudioService(db, audit, id)`, `deleteAdminPackage(db, env: SaveEnv, audit, id)` — all `Promise<AdminDeleteResult>` (the Task 2 union).
- Consumes: Task 2's `AdminDeleteResult`/`blocked()`, `admin-packages.ts`'s exported `SaveEnv` type (join the import), the existing route vocabulary.

**Not here:** the api-client wrappers (Task 4); the Users-tab user deletion (#221's family — auth tables are not among the nine); position compaction (never — Global Constraints); the `cms-reflection.mjs` exit scenario (#225).

- [ ] **Step 1: Write the failing tests (the suite's second half)**

(a) Extend `admin-delete.test.ts`'s `@sevendays/db` import — replace Task 2's block with exactly this merged list (biome keeps it alphabetical; `addonServices` needs no import — the add-on assertions go through `studioServiceAddonServices` and the API):

```ts
import {
  appointmentAddonServices,
  appointments as appointmentsTable,
  attires as attiresTable,
  auditLog,
  branchStudioServices,
  frames as framesTable,
  galleryCategories as galleryCategoriesTable,
  galleryPhotos as galleryPhotosTable,
  packageInclusionAttires as junctionsTable,
  packageInclusions as inclusionsTable,
  servicePackages as servicePackagesTable,
  studioServiceAddonServices,
  testimonials as testimonialsTable,
} from '@sevendays/db';
```

(b) Append at file end:

```ts
const insertAppointment = async (overrides: Record<string, unknown> = {}) => {
  const [row] = await db
    .insert(appointmentsTable)
    .values({
      branchId: ids.branchA,
      servicePackageId: ids.packageCombined,
      customerName: 'History Holder',
      customerEmail: 'history@sevendays.test',
      customerPhone: '+63 900 000 000',
      scheduledAt: new Date('2026-01-15T09:00:00.000Z'),
      ...overrides,
    })
    .returning({ id: appointmentsTable.id });
  if (!row) throw new Error('delete suite: appointment insert returned no row');
  return row.id;
};

describe('guarded DELETE — the appointment-bearing entities (any Appointment ever)', () => {
  it('branch with any appointment → 400 with the appointment count', async () => {
    await insertAppointment({ branchId: ids.branchB, servicePackageId: ids.packageCombined });
    const res = await authed(
      'DELETE',
      `/api/v1/admin/branches/${ids.branchB}`,
      'delete-branch-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['appointments'], message: 'referenced by 1 appointment(s)' }],
    });
  });

  it('a CANCELLED appointment still blocks — "any Appointment ever" is status-blind', async () => {
    await insertAppointment({
      branchId: ids.branchB,
      servicePackageId: ids.packageCombined,
      status: 'cancelled',
    });
    const res = await authed(
      'DELETE',
      `/api/v1/admin/branches/${ids.branchB}`,
      'delete-branch-cancelled@sevendays.test'
    );
    expect(res.status).toBe(400);
  });

  it("branch with no appointments deletes clean — its matrix rows cascade, its siblings' stay, the audit row lands", async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/branches/${ids.branchB}`,
      'delete-branch-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const bLinks = await db
      .select()
      .from(branchStudioServices)
      .where(eq(branchStudioServices.branchId, ids.branchB));
    expect(bLinks).toHaveLength(0);
    const aLinks = await db
      .select()
      .from(branchStudioServices)
      .where(eq(branchStudioServices.branchId, ids.branchA));
    expect(aLinks).toHaveLength(3);
    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, 'branch'), eq(auditLog.entityId, ids.branchB)))
      .limit(1);
    expect(auditRow?.action).toBe('delete');
  });

  it('branch unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/branches/00000000-0000-4000-8000-000000000000',
      'delete-branch-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Branch not found.' });
  });

  it('add-on attached to any appointment → 400 (the snapshot junction is history)', async () => {
    const appointmentId = await insertAppointment({ servicePackageId: ids.packageCombined });
    await db
      .insert(appointmentAddonServices)
      .values({ appointmentId, addonServiceId: ids.addonMakeup });
    const res = await authed(
      'DELETE',
      `/api/v1/admin/addon-services/${ids.addonMakeup}`,
      'delete-addon-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['appointments'], message: 'referenced by 1 appointment(s)' }],
    });
  });

  it('add-on with no history deletes clean — its applicability-matrix rows cascade', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/addon-services/${ids.addonRetired}`,
      'delete-addon-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const retiredLinks = await db
      .select()
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.addonServiceId, ids.addonRetired));
    expect(retiredLinks).toHaveLength(0);
    const makeupLinks = await db
      .select()
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.addonServiceId, ids.addonMakeup));
    expect(makeupLinks).toHaveLength(1);
  });

  it('add-on unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/addon-services/00000000-0000-4000-8000-000000000000',
      'delete-addon-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Add-on Service not found.' });
  });

  it('studio service with any appointment → 400', async () => {
    await insertAppointment({ servicePackageId: null, studioServiceId: ids.servicePortrait });
    const res = await authed(
      'DELETE',
      `/api/v1/admin/studio-services/${ids.servicePortrait}`,
      'delete-service-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['appointments'], message: 'referenced by 1 appointment(s)' }],
    });
  });

  it("studio service with no history deletes clean — BOTH matrices' rows cascade", async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'delete-service-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const branchLinks = await db
      .select()
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, ids.serviceStudio));
    expect(branchLinks).toHaveLength(0);
    const addonLinks = await db
      .select()
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, ids.serviceStudio));
    expect(addonLinks).toHaveLength(0);
    const portraitBranchLinks = await db
      .select()
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, ids.servicePortrait));
    expect(portraitBranchLinks).toHaveLength(2);
  });

  it('studio service unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/studio-services/00000000-0000-4000-8000-000000000000',
      'delete-service-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Studio Service not found.' });
  });

  it('package with any appointment → 400 — and a blocked delete never touches the bucket', async () => {
    await db
      .update(servicePackagesTable)
      .set({ coverImageKey: 'covers/00000000-0000-4000-8000-0000000000c1.jpg' })
      .where(eq(servicePackagesTable.id, ids.packageCombined));
    await insertAppointment({ servicePackageId: ids.packageCombined });
    const stub = stubCommitBucket();
    const { token } = await signUpSession(url, 'delete-package-blocked@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      { method: 'DELETE', headers: bearer(token) },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['appointments'], message: 'referenced by 1 appointment(s)' }],
    });
    expect(stub.deleteCalls).toEqual([]);
  });

  it('package with no history deletes clean — frames, inclusions, and their junctions all go', async () => {
    const [inclusion] = await db
      .select({ id: inclusionsTable.id })
      .from(inclusionsTable)
      .where(eq(inclusionsTable.servicePackageId, ids.packageSimple))
      .limit(1);
    if (!inclusion) throw new Error('delete suite: simple-package inclusion missing');
    const res = await authed(
      'DELETE',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'delete-package-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const frames = await db
      .select()
      .from(framesTable)
      .where(eq(framesTable.servicePackageId, ids.packageSimple));
    expect(frames).toHaveLength(0);
    const inclusions = await db
      .select()
      .from(inclusionsTable)
      .where(eq(inclusionsTable.servicePackageId, ids.packageSimple));
    expect(inclusions).toHaveLength(0);
    // The junctions rode the DB-level ON DELETE CASCADE on inclusion_id.
    const junctions = await db
      .select()
      .from(junctionsTable)
      .where(eq(junctionsTable.inclusionId, inclusion.id));
    expect(junctions).toHaveLength(0);
    const combinedInclusions = await db
      .select()
      .from(inclusionsTable)
      .where(eq(inclusionsTable.servicePackageId, ids.packageCombined));
    expect(combinedInclusions).toHaveLength(4);
  });

  it("the cover object deletes only after the row's commit", async () => {
    await db
      .update(servicePackagesTable)
      .set({ coverImageKey: 'covers/00000000-0000-4000-8000-0000000000c2.jpg' })
      .where(eq(servicePackagesTable.id, ids.packageRetired));
    const stub = stubCommitBucket();
    const { token } = await signUpSession(url, 'delete-package-cover@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/service-packages/${ids.packageRetired}`,
      { method: 'DELETE', headers: bearer(token) },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(204);
    expect(stub.deleteCalls).toEqual(['covers/00000000-0000-4000-8000-0000000000c2.jpg']);
  });

  it('delete frees the unique name + slug — a new row may take both', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/service-packages/${ids.packageRetired}`,
      'delete-package-free@sevendays.test'
    );
    expect(res.status).toBe(204);
    const created = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'delete-package-free2@sevendays.test',
      {
        name: 'Retired Package',
        description: 'Back by popular demand.',
        priceCents: 100000,
        durationMinutes: null,
        isActive: true,
        isFeatured: false,
        frames: [],
        inclusions: [],
      }
    );
    expect(created.status).toBe(201);
    expect(((await created.json()) as { slug: string }).slug).toBe('retired-package');
  });

  it('package unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/service-packages/00000000-0000-4000-8000-000000000000',
      'delete-package-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Package not found.' });
  });
});

describe('guarded DELETE — the 401 gate precedes validation (appointment-bearing half)', () => {
  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (branches)', async () => {
    const res = await app.request(
      '/api/v1/admin/branches/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (addon-services)', async () => {
    const res = await app.request(
      '/api/v1/admin/addon-services/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (studio-services)', async () => {
    const res = await app.request(
      '/api/v1/admin/studio-services/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (service-packages)', async () => {
    const res = await app.request(
      '/api/v1/admin/service-packages/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
```

(The guard its fail red — the four routes do not exist yet. The cancelled-appointment insert rides `status: 'cancelled'` through drizzle's enum column directly.)

- [ ] **Step 2: Run red**

`TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run test/admin-delete.test.ts` — the 15 guard/cascade its of the new describes FAIL (root 404), the 4 gate its pass (green-on-arrival, Task 2's reasoning). Record the red.

- [ ] **Step 3: The service's second half**

(a) Extend `admin-delete.ts`'s `@sevendays/db` import (merged, alphabetical) and add the `SaveEnv` import:

```ts
import type { Database } from '@sevendays/db';
import {
  addonServices,
  appointments,
  appointmentAddonServices,
  attires,
  branchStudioServices,
  branches,
  frames,
  galleryCategories,
  galleryPhotos,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
  studioServiceAddonServices,
  studioServices,
  testimonials,
} from '@sevendays/db';
import { count, eq } from 'drizzle-orm';
import type { PhotoEnv } from './admin-gallery.js';
import type { SaveEnv } from './admin-packages.js';
import type { AdminDetail } from './admin-shared.js';
import { type AuditActor, writeAuditRow } from './audit.js';
```

(b) Append at file end:

```ts
// --- branches (blocked by any Appointment ever; matrix rows cascade) --------

export async function deleteAdminBranch(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [apptCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(eq(appointments.branchId, id));
  const blocking = apptCount?.value ?? 0;
  if (blocking > 0) {
    return blocked([
      { path: ['appointments'], message: `referenced by ${blocking} appointment(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    // branch_id carries no DB-level cascade — the explicit delete IS the cascade.
    await tx.delete(branchStudioServices).where(eq(branchStudioServices.branchId, id));
    await tx.delete(branches).where(eq(branches.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'branch',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}

// --- add-on services (blocked by any Appointment ever; matrix rows cascade) --

export async function deleteAdminAddonService(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(addonServices).where(eq(addonServices.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [attachmentCount] = await db
    .select({ value: count() })
    .from(appointmentAddonServices)
    .where(eq(appointmentAddonServices.addonServiceId, id));
  const blocking = attachmentCount?.value ?? 0;
  if (blocking > 0) {
    return blocked([
      { path: ['appointments'], message: `referenced by ${blocking} appointment(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.addonServiceId, id));
    await tx.delete(addonServices).where(eq(addonServices.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'addon-service',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}

// --- studio services (blocked by any Appointment ever; both matrices cascade)-

export async function deleteAdminStudioService(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db
    .select()
    .from(studioServices)
    .where(eq(studioServices.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [apptCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(eq(appointments.studioServiceId, id));
  const blocking = apptCount?.value ?? 0;
  if (blocking > 0) {
    return blocked([
      { path: ['appointments'], message: `referenced by ${blocking} appointment(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    // Both matrices' studio_service_id sides DO carry DB-level cascades —
    // the explicit deletes keep the transaction's writes observable and
    // uniform with every other entity here.
    await tx.delete(branchStudioServices).where(eq(branchStudioServices.studioServiceId, id));
    await tx
      .delete(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, id));
    await tx.delete(studioServices).where(eq(studioServices.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'studio-service',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}

// --- service packages (blocked by any Appointment ever; children cascade; ----
// --- the cover object deletes after the commit) ------------------------------

export async function deleteAdminPackage(
  db: Database,
  env: SaveEnv,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [apptCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(eq(appointments.servicePackageId, id));
  const blocking = apptCount?.value ?? 0;
  if (blocking > 0) {
    return blocked([
      { path: ['appointments'], message: `referenced by ${blocking} appointment(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    // Inclusions before frames (inclusions hold the frame FK — the atomic
    // save's own order); the inclusion-attire junctions ride the DB-level
    // ON DELETE CASCADE on inclusion_id.
    await tx.delete(packageInclusions).where(eq(packageInclusions.servicePackageId, id));
    await tx.delete(frames).where(eq(frames.servicePackageId, id));
    await tx.delete(servicePackages).where(eq(servicePackages.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'service-package',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  // ADR-0019 §5 + the #137 precedent: the cover object goes only after the
  // row's commit — a blocked or rolled-back delete never touches the bucket.
  if (current.coverImageKey) {
    await env.MEDIA_BUCKET.delete(current.coverImageKey);
  }
  return { ok: true };
}
```

- [ ] **Step 4: The four route registrations**

Same append-at-end-of-chain shape as Task 2, per file:

(a) `apps/api/src/routes/admin-branches.ts` — import `deleteAdminBranch`; `'Branch not found.'`; `entity: 'branch'`; service call `deleteAdminBranch(c.get('db'), auditActor(c), id)`.

(b) `apps/api/src/routes/admin-addon-services.ts` — import `deleteAdminAddonService`; `'Add-on Service not found.'`; `entity: 'addon-service'`.

(c) `apps/api/src/routes/admin-studio-services.ts` — import `deleteAdminStudioService`; `'Studio Service not found.'`; `entity: 'studio-service'`.

(d) `apps/api/src/routes/admin-service-packages.ts` — import `deleteAdminPackage`; `'Package not found.'`; `entity: 'service-package'`; service call `deleteAdminPackage(c.get('db'), c.env, auditActor(c), id)` (the `c.env` thread, this file's own convention).

The shared body (branches shown; the other three differ only in the named literals):

```ts
  .delete('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const result = await deleteAdminBranch(c.get('db'), auditActor(c), id);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return notFound(c, 'Branch not found.');
      }
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'branch', entityId: id });
    return c.body(null, 204);
  });
```

- [ ] **Step 5: The mutation-line pin**

`apps/api/test/admin-mutation-log.test.ts` — append at file end (the file's own `captureLines`/`mutations`/`authed`/`bearer` helpers and the `ids` fixture are module-level):

```ts
describe('delete mutation lines (M7 #213)', () => {
  it('DELETE → one admin_mutation line with method DELETE and the deleted id', async () => {
    const lines = captureLines();
    const res = await authed(
      'DELETE',
      `/api/v1/admin/branches/${ids.branchB}`,
      'mut-delete-branch@sevendays.test'
    );
    expect(res.status).toBe(204);
    const events = mutations(lines);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      evt: 'admin_mutation',
      entity: 'branch',
      entityId: ids.branchB,
      method: 'DELETE',
    });
  });
});
```

- [ ] **Step 6: Green + gates + commit**

`TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5433/sevendays_test' pnpm --filter @sevendays/api test -- --run` — **28 passed + 1 skipped files (29) / 388 passed + 3 skipped** (350 + the 37-it delete suite + the 1 mutation-line pin). Then `pnpm --filter @sevendays/api fix` (re-run — counts unchanged), `pnpm --filter @sevendays/api typecheck`. Commit:

```bash
git add apps/api/src/services/admin-delete.ts apps/api/test/admin-delete.test.ts apps/api/test/admin-mutation-log.test.ts apps/api/src/routes/admin-branches.ts apps/api/src/routes/admin-addon-services.ts apps/api/src/routes/admin-studio-services.ts apps/api/src/routes/admin-service-packages.ts
git commit -m "feat(api): guarded DELETE part two - the appointment-bearing four, cascades, cover lifecycle, name/slug freeing (#213)"
```

### Task 4: `packages/api-client` — the nine `remove()` wrappers + loopback coverage (TDD)

**Files:**
- Modify (test-first): `packages/api-client/test/typing.test.ts`, `test/loopback.test.ts`, `test/mock-api.ts`
- Modify: `packages/api-client/src/routes/admin.ts`

**Interfaces:**
- Produces (what #218's dialogs consume): every admin group object gains `async remove(args): Promise<void>` — the 204 seam (non-2xx throws `ApiClientError`; success resolves `undefined`, no body parse). Exported args types: `DeleteServicePackageArgs`, `DeleteAdminBranchArgs`, `DeleteAdminStudioServiceArgs`, `DeleteAdminAddonArgs`, `DeleteAdminPrintSizeArgs`, `DeleteAdminAttireArgs`, `DeleteAdminGalleryCategoryArgs`, `DeleteAdminGalleryPhotoArgs`, `DeleteAdminTestimonialArgs` — each `InferRequestType` of the group's `$delete` endpoint (structurally `{ param: { id: string } }`, derived not hand-typed).
- Consumes: Tasks 2–3's routes through the built `AppType` (`RpcClient['api']['v1']['admin']` — **run `pnpm --filter @sevendays/api build` before this task's typecheck**: the client resolves the API's types from its built `dist/`); `unwrapError` from `../unwrap.js` (joins the existing `unwrap` import).

**Not here:** any admin UI (#218); a `remove` on the media group (media has no delete route); unwrap on the 204 (there is no body — the seam is the point, pinned by the typing assertion `Promise<void>`).

- [ ] **Step 1: Write the failing tests**

(a) `packages/api-client/test/typing.test.ts` — append at file end (this file's its are type-level method references; the assertions enforce at `tsc` time — the package's `typecheck` script — which is this task's red/green instrument):

```ts
it('delete wrappers resolve void with the param-id args (the 204 seam)', () => {
  expectTypeOf(client.admin.branches.remove).returns.toEqualTypeOf<Promise<void>>();
  type DeleteBranchEndpoint = RpcClient['api']['v1']['admin']['branches'][':id']['$delete'];
  type DeleteBranchArgs = InferRequestType<DeleteBranchEndpoint>;
  expectTypeOf<DeleteBranchArgs>().toEqualTypeOf<{ param: { id: string } }>();
});
```

(b) `packages/api-client/test/mock-api.ts` — the mock gains its first admin subtree (insert before the `const v1 = new Hono<MockEnv>()` definition; two entities drive the whole wrapper class — clean/404 through branches, blocked-400 through print-sizes):

```ts
  // M7 #213: a minimal admin subtree — the delete wrappers' loopback leg.
  // The mock mirrors the real DELETE envelopes: 204 with no body on success,
  // the blocked 400 with details, the per-entity 404, and the uuid-param 400.
  const admin = new Hono<MockEnv>()
    .delete('/branches/:id', (c) => {
      const id = c.req.param('id');
      if (!z.uuid().safeParse(id).success) {
        return c.json(
          {
            error: 'Invalid request payload.',
            details: [{ path: ['id'], message: 'Invalid UUID' }],
          },
          400
        );
      }
      if (id !== '11111111-1111-4111-8111-111111111111') {
        return c.json({ error: 'Branch not found.' }, 404);
      }
      return c.body(null, 204);
    })
    .delete('/print-sizes/:id', (c) => {
      const id = c.req.param('id');
      if (id === '66666666-6666-4666-8666-666666666666') {
        return c.json(
          {
            error: 'Blocked by existing references.',
            details: [{ path: ['inclusions'], message: 'used by 3 package inclusion(s)' }],
          },
          400
        );
      }
      return c.body(null, 204);
    });
```

and the `v1` chain gains the mount as its last route: `.route('/appointments', appointments)` becomes `.route('/appointments', appointments).route('/admin', admin)`.

(c) `packages/api-client/test/loopback.test.ts` — append at file end:

```ts
it('admin.branches.remove resolves undefined on 204 — the delete seam never unwraps a body', async () => {
  const client = clientFor(mockApi);
  await expect(
    client.admin.branches.remove({ param: { id: '11111111-1111-4111-8111-111111111111' } })
  ).resolves.toBeUndefined();
});

it('a blocked delete surfaces as ApiClientError with status 400 and the blocked details', async () => {
  const client = clientFor(mockApi);
  const err = await client.admin.printSizes
    .remove({ param: { id: '66666666-6666-4666-8666-666666666666' } })
    .catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(400);
  expect((err as ApiClientError).details).toEqual({
    error: 'Blocked by existing references.',
    details: [{ path: ['inclusions'], message: 'used by 3 package inclusion(s)' }],
  });
});

it('admin delete 404 surfaces as ApiClientError through the unwrap gate', async () => {
  const client = clientFor(mockApi);
  const err = await client.admin.branches
    .remove({ param: { id: 'f0000000-0000-4000-8000-000000000000' } })
    .catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Branch not found.' });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/api build` first (fresh AppType dist carrying the nine `$delete` endpoints), then `pnpm --filter @sevendays/api-client typecheck` — FAILS (`remove` does not exist on the group types). And `pnpm --filter @sevendays/api-client test -- --run` — the three loopback its FAIL (the wrappers don't exist). Record both reds.

- [ ] **Step 3: The nine wrappers in `src/routes/admin.ts`**

First, the import: `import { unwrap, unwrapError } from '../unwrap.js';` replaces the bare-`unwrap` import line. Then, per group, the endpoint/args types join the group's type section and the method joins the group's returned object at its LAST position (after `update`, or after `setOrder`/`thumbResponse` where the group has them). The nine additions in file order — each args type carries the one-line doc `/** The <entity> DELETE args: `{ param: { id } }`. */`:

(a) service-packages — types after `UpdateServicePackageEndpoint`:

```ts
// service-packages delete (M7 #213).
type DeleteServicePackageEndpoint = AdminRpc['service-packages'][':id']['$delete'];
export type DeleteServicePackageArgs = InferRequestType<DeleteServicePackageEndpoint>;
```

method inside `adminServicePackages` after `update`:

```ts
    /** DELETE /api/v1/admin/service-packages/:id — 204 No Content (the delete seam: no body to unwrap); blocked → 400 naming what blocks; the cover object goes with the row. */
    async remove(args: DeleteServicePackageArgs): Promise<void> {
      const res = await raw.api.v1.admin['service-packages'][':id'].$delete(args);
      if (!res.ok) {
        await unwrapError(res);
      }
    },
```

(b) branches — types after `UpdateAdminBranchEndpoint` (`DeleteAdminBranchEndpoint = AdminRpc['branches'][':id']['$delete']`, `export type DeleteAdminBranchArgs = InferRequestType<DeleteAdminBranchEndpoint>;`), method inside `adminBranches` after `update`:

```ts
    /** DELETE /api/v1/admin/branches/:id — 204 (the delete seam); blocked → 400 with the appointment count. */
    async remove(args: DeleteAdminBranchArgs): Promise<void> {
      const res = await raw.api.v1.admin.branches[':id'].$delete(args);
      if (!res.ok) {
        await unwrapError(res);
      }
    },
```

(c) studio-services — types after `SetAddonMatrixEndpoint` (`DeleteAdminStudioServiceEndpoint = AdminRpc['studio-services'][':id']['$delete']`, `export type DeleteAdminStudioServiceArgs = InferRequestType<DeleteAdminStudioServiceEndpoint>;`), method inside `adminStudioServices` after `setAddonMatrix`:

```ts
    /** DELETE /api/v1/admin/studio-services/:id — 204 (the delete seam); blocked → 400; both matrices' rows go with the row. */
    async remove(args: DeleteAdminStudioServiceArgs): Promise<void> {
      const res = await raw.api.v1.admin['studio-services'][':id'].$delete(args);
      if (!res.ok) {
        await unwrapError(res);
      }
    },
```

(d) addon-services — types after `UpdateAdminAddonEndpoint` (`DeleteAdminAddonEndpoint = AdminRpc['addon-services'][':id']['$delete']`, `export type DeleteAdminAddonArgs = InferRequestType<DeleteAdminAddonEndpoint>;`), method inside `adminAddonServices` after `update`:

```ts
    /** DELETE /api/v1/admin/addon-services/:id — 204 (the delete seam); blocked → 400 with the appointment count. */
    async remove(args: DeleteAdminAddonArgs): Promise<void> {
      const res = await raw.api.v1.admin['addon-services'][':id'].$delete(args);
      if (!res.ok) {
        await unwrapError(res);
      }
    },
```

(e) print-sizes — types after `UpdateAdminPrintSizeEndpoint` (`DeleteAdminPrintSizeEndpoint = AdminRpc['print-sizes'][':id']['$delete']`, `export type DeleteAdminPrintSizeArgs = InferRequestType<DeleteAdminPrintSizeEndpoint>;`), method inside `adminPrintSizes` after `update`:

```ts
    /** DELETE /api/v1/admin/print-sizes/:id — 204 (the delete seam); blocked → 400 with the inclusion count. */
    async remove(args: DeleteAdminPrintSizeArgs): Promise<void> {
      const res = await raw.api.v1.admin['print-sizes'][':id'].$delete(args);
      if (!res.ok) {
        await unwrapError(res);
      }
    },
```

(f) attires — types after `UpdateAdminAttireEndpoint` (`DeleteAdminAttireEndpoint = AdminRpc['attires'][':id']['$delete']`, `export type DeleteAdminAttireArgs = InferRequestType<DeleteAdminAttireEndpoint>;`), method inside `adminAttires` after `update`:

```ts
    /** DELETE /api/v1/admin/attires/:id — 204 (the delete seam); blocked → 400 with the junction count. */
    async remove(args: DeleteAdminAttireArgs): Promise<void> {
      const res = await raw.api.v1.admin.attires[':id'].$delete(args);
      if (!res.ok) {
        await unwrapError(res);
      }
    },
```

(g) gallery-categories — types after `SetGalleryCategoryOrderEndpoint` (`DeleteAdminGalleryCategoryEndpoint = AdminRpc['gallery-categories'][':id']['$delete']`, `export type DeleteAdminGalleryCategoryArgs = InferRequestType<DeleteAdminGalleryCategoryEndpoint>;`), method inside `adminGalleryCategories` after `setOrder`:

```ts
    /** DELETE /api/v1/admin/gallery-categories/:id — 204 (the delete seam); blocked → 400 while any photo sits in the category. */
    async remove(args: DeleteAdminGalleryCategoryArgs): Promise<void> {
      const res = await raw.api.v1.admin['gallery-categories'][':id'].$delete(args);
      if (!res.ok) {
        await unwrapError(res);
      }
    },
```

(h) gallery-photos — types after `GetGalleryPhotoThumbEndpoint` (`DeleteAdminGalleryPhotoEndpoint = AdminRpc['gallery-photos'][':id']['$delete']`, `export type DeleteAdminGalleryPhotoArgs = InferRequestType<DeleteAdminGalleryPhotoEndpoint>;`), method inside `adminGalleryPhotos` after `thumbResponse`:

```ts
    /** DELETE /api/v1/admin/gallery-photos/:id — 204 (the delete seam); the image object goes with the row. */
    async remove(args: DeleteAdminGalleryPhotoArgs): Promise<void> {
      const res = await raw.api.v1.admin['gallery-photos'][':id'].$delete(args);
      if (!res.ok) {
        await unwrapError(res);
      }
    },
```

(i) testimonials — types after `SetTestimonialOrderEndpoint` (`DeleteAdminTestimonialEndpoint = AdminRpc['testimonials'][':id']['$delete']`, `export type DeleteAdminTestimonialArgs = InferRequestType<DeleteAdminTestimonialEndpoint>;`), method inside `adminTestimonials` after `setOrder`:

```ts
    /** DELETE /api/v1/admin/testimonials/:id — 204 (the delete seam); testimonials are blocked by nothing. */
    async remove(args: DeleteAdminTestimonialArgs): Promise<void> {
      const res = await raw.api.v1.admin.testimonials[':id'].$delete(args);
      if (!res.ok) {
        await unwrapError(res);
      }
    },
```

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/api-client typecheck` — green (the typing pin enforces `Promise<void>` + the args shape). `pnpm --filter @sevendays/api-client test -- --run` — **5 files / 37 tests** (33 + 1 typing + 3 loopback). Then `pnpm --filter @sevendays/api-client fix` (re-run — counts unchanged). This task restores the full-repo gate: with the compose db up, `pnpm check` — **35/35 turbo tasks green**, floors exactly **types 14/129 · api 28 passed + 1 skipped files (29) / 388 passed + 3 skipped · api-client 5/37 · admin 17/184 · landing 9/83 · db 4 files**. Commit:

```bash
git add packages/api-client/src/routes/admin.ts packages/api-client/test/mock-api.ts packages/api-client/test/loopback.test.ts packages/api-client/test/typing.test.ts
git commit -m "feat(api-client): the nine remove() wrappers + loopback coverage over a minimal admin mock (#213)"
```

### Task 5: Gates + the prose debt + docs rotation + PR/merge + the v1 pick + ledger + issue close

**Files:**
- Modify: `packages/db/src/schema/gallery-categories.ts` (comment), `apps/api/src/services/admin-gallery.ts` (comment), `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/specs/2026-09-24-m5-admin-cms-spec.md` (the banner's built-note)
- Generate: `graphify-out/` refresh (`graphify update .`)
- Post-merge: `docs/agents/v1-picks.md` (the ledger row), GitHub PR + issue #213

**Not here:** the M7 "Verify:" roadmap box and the live-stack reflection scenario (#225 — milestone exit verification); the M7 guarded-DELETE roadmap box's TICK (#218 owns it — Step 3 annotates, never ticks); the delete dialogs (#218); `docs/adr/` (the reversal rides the M7 spec + ADR-0020's neighbors — no new ADR was ruled for deletion); the Audit Log viewer's UI (the label map is data, landed in Task 1).

- [ ] **Step 1: The full-repo gate + graph refresh**

With the compose db up (the port recipe): `pnpm check` — **35/35 turbo tasks** green, floors exactly **types 14 files / 129 tests · api 28 passed + 1 skipped files (29) / 388 passed + 3 skipped · api-client 5 / 37 · admin 17 / 184 · landing 9 / 83 · db 4 files**. Then `pnpm build` (the full build, 7/7 per the ledger's lock vocabulary). Then `graphify update .` and stage the refreshed `graphify-out/` with the docs commit (dirty graphify files from hooks are expected — include them).

- [ ] **Step 2: The prose debt clears (the ticket's last AC)**

(a) `packages/db/src/schema/gallery-categories.ts` — the header comment's last two lines:

```ts
// Photos — one tab of the about grid, shown in a fixed order. Reordering is
// the collection order PUT ({ categoryIds }); position is server-assigned
// and never client-supplied. Deactivation is the reversible is_active flip —
// rows are never deleted (no hard deletes anywhere in the CMS).
```

become:

```ts
// Photos — one tab of the about grid, shown in a fixed order. Reordering is
// the collection order PUT ({ categoryIds }); position is server-assigned
// and never client-supplied. Deactivation is the reversible is_active flip;
// true deletion exists since M7 #213 (guarded DELETE) only while no photo
// references the category — the api's admin-delete service owns the guard.
```

(b) `apps/api/src/services/admin-gallery.ts` — the header comment's line `// No hard deletes anywhere. (The gallery-photos section joins in Task 8.)` becomes:

```ts
// Hard deletes live in the admin-delete service since M7 #213 (guarded:
// nothing may reference the row); this module keeps the positioned
// collections' reads and writes.
```

(c) `docs/specs/2026-09-24-m5-admin-cms-spec.md` — the amendment banner (line 5) ends `…(Problem Statement, Solution, user stories 18 and 25, the full-lifecycle decision, Out of Scope's hard-deletes line).` — append one sentence inside the same blockquote paragraph:

```text
 Built 2026-10-XX: the API half + the typed client wrappers landed in #213 (the nine guarded DELETE routes, the 204 contract, the audit 'delete' action); the CMS delete dialogs ride #218.
```

(d) `docs/plan.md` — the M5 header line (line ~126)'s existing reversal annotation `_(2026-10-02: "delete nowhere" reversed by Milestone 7's guarded-DELETE-everywhere ruling — #159; see the M7 spec § Implementation Decisions)_` gains the built note, reading in full:

```text
_(2026-10-02: "delete nowhere" reversed by Milestone 7's guarded-DELETE-everywhere ruling — #159; see the M7 spec § Implementation Decisions; built 2026-10-XX in #213 — the API + client wrappers, with the CMS delete dialogs in #218)_
```

(Fill XX with the merge date everywhere in this task.)

- [ ] **Step 3: `docs/plan.md` — the M7 box ANNOTATES, never ticks (the shared-checkbox fence)**

The `- [ ] API — guarded DELETE everywhere (M5's delete-nowhere reversed, #159): …` box (the M7 block's first box) **stays `- [ ]`** — its text names the DeactivateConfirm-style dialog, which is #218's deliverable, and #218's own AC ("Delete dialogs pending-guarded with blockers in-body across all nine entities") is the other half of this box. Append to the box line, after its closing text:

```text
_(2026-10-XX, #213: the API half is live — the nine DELETE routes behind the one requireSession root, the guard service's blocked-400s with count-bearing details, in-transaction cascades, ADR-0019 §5 object lifecycle, the freed name + slug, the audit 'delete' action, and the nine client remove() wrappers; the box stays unticked until #218 lands the delete dialogs on all nine screens — the shared checkbox)_
```

- [ ] **Step 4: `docs/progress.md` + `AGENTS.md`**

(a) `docs/progress.md` — insert at the top of the dated entries (above the #212 entry), in the file's established voice:

```text
2026-10-XX — #213, M7 ticket 02, guarded DELETE's API half live (M5's delete-nowhere reversed per #159): all nine CMS entities gained RESTful DELETE /api/v1/admin/<entity>/:id behind the existing requireSession root, each answering 204 No Content on success (the codebase's first 204, owner-ruled 2026-10-12 — nothing downstream needs the dead row; the client wrapper is the unwrapError-only seam after thumbResponse) and the house 400-with-field-details when blocked ('Blocked by existing references.' + one count-bearing detail per blocking family — the owner-ratified copy, landing verbatim in #218's dialog bodies). Guards: testimonials + gallery photos blocked by nothing (the photo's R2 object deletes with its row, post-commit per ADR-0019 §5 + the #137 precedent); categories by any photo; print sizes by any inclusion; attires by any inclusion-attire; branches/add-ons/studio services/packages by ANY appointment ever (status-blind — a cancelled appointment blocks, pinned). Cascades run in-transaction (matrix rows and children explicit; only the inclusion-attire junctions ride the DB FK cascade); history-bearing rows keep Deactivation as their only retire path; delete frees the unique name + slug (pinned: a new row retakes both); positions never compact. One guard service (apps/api/src/services/admin-delete.ts) shares the contract; committed deletes write an audit row — the 'delete' action joining auditActionSchema (types + the #188 viewer's label; the db column is text, zero migrations) — and the admin_mutation line. api-client gained the nine remove() wrappers with loopback coverage over a minimal admin mock subtree. Floors: api 28 passed + 1 skipped files (29) / 388 passed + 3 skipped (+38: the 37-it admin-delete suite + the mutation-line pin), api-client 5 / 37 (+4), types 14/129 + admin 17/184 edited-not-grown; the schema's two "never deleted" comments, the M5 spec banner's built-note, and plan.md's M5 header line amended. The M7 roadmap box stays unticked until #218's dialogs; the v1 pick is PICK clean per the spec's class ledger.
```

(b) `AGENTS.md` — three edits. In **Current status of `pnpm test`**: the api floor `api 27 files passed + 1 skipped (28) / 350 passed + 3 skipped (the #207/#208 pins + #212's ten unpriced pins)` becomes `api 28 files passed + 1 skipped (29) / 388 passed + 3 skipped (the #207/#208 pins + #212's ten unpriced pins + #213's 38 guarded-delete pins)`; the api-client floor `api-client 5 files / 33 tests` becomes `api-client 5 files / 37 tests`. In **Engineering Rules** (the DB bullet's write-model sentence): after `…every uniqueness collision a 400 with field details.`, insert: ` True deletion is live since #213 (guarded DELETE, M5's reversal): every entity carries `DELETE /api/v1/admin/<entity>/:id` answering 204, a blocked delete answers the house 400 naming what blocks (any Appointment ever = any status), composition rows + matrix rows cascade in-transaction, covers/photos delete post-commit per ADR-0019, and delete frees the unique name + slug.` And in the same bullet's audit sentence, `(create/update/deactivate/reorder, the actor email snapshotted at write` becomes `(create/update/deactivate/reorder/delete, the actor email snapshotted at write`.

- [ ] **Step 5: Commit, PR, squash-merge**

```bash
git add packages/db/src/schema/gallery-categories.ts apps/api/src/services/admin-gallery.ts docs/plan.md docs/progress.md AGENTS.md docs/specs/2026-09-24-m5-admin-cms-spec.md graphify-out
git commit -m "docs: #213 close-out - guarded DELETE's API half recorded, the delete-nowhere prose debt cleared, floors rotated (#213)"
git push -u origin feat/213-guarded-delete
```

Then `gh pr create` (title `feat: guarded DELETE everywhere — the nine-entity API + guards (#213)`, body: the Goal paragraph + the three owner rulings of 2026-10-12 (204 / the blocked copy / the audit 'delete' action) + the evidence-dir pointer + the floors), and squash-merge into `main` with the same title. Pull main. **Never stage `apps/admin/package.json`** (the owner's uncommitted port change rides above the branch).

- [ ] **Step 6: The v1 pick (the runbook governs; the class is pre-ruled)**

Follow `docs/agents/v1-picks.md` end to end (classifier → cherry-pick → locks → push → CI/deploy → ledger). The spec's class ledger pre-rules this payload **PICK clean** — "Catalog lifecycle; the 'any Appointment ever' guards read the shared `packages/db` schema…; no booking surface touched." Pre-ruled file classes for the classifier: PICK — every file this branch touches: `packages/types/src/{audit,audit.test}.ts`, `apps/admin/src/lib/audit/{filters,filters.test}.ts`, `apps/api/src/services/admin-delete.ts`, the nine route files, `apps/api/test/{admin-delete,admin-mutation-log}.test.ts`, all four api-client files, and the Task 5 docs set MINUS the main-only ones (`docs/agents/v1-picks.md` itself is main-only by construction; `docs/plan.md`/`docs/progress.md`/`AGENTS.md` pick per the runbook's docs precedent — annotate, and drop any M7-box line v1 cannot carry verbatim only if the runbook's conflict policy demands it; it does not here — the box text carries no booking tokens). One reconciliation to expect at the locks: v1's api suite grows by the same 38 its (its fixtures and the appointments table exist on the shared schema — the guard reads are exactly the ledger's pre-ruled class); the audit's absence-token grep must stay clean (no booking tokens enter this branch). Ledger row + provenance per the runbook's format (rev-parse the sha — never hand-type it, the #208 lesson).

- [ ] **Step 7: Close the issue**

Comment on #213 with: the merge sha, the floors, the three owner rulings as ratified (204 No Content; `Blocked by existing references.` + the four count-bearing detail strings; the audit `'delete'` action), the v1 pick sha, and an explicit pointer that the delete dialogs + the M7 roadmap box's tick ride #218 — then close as completed.

---

## Post-plan self-review (already applied)

The plan was self-reviewed at write time per the writing-implementation-plans skill: no stray authoring anchors or unfilled placeholders remain; the step-checkbox count is 26 real steps (`grep -c '^- \[ \] \*\*Step'` over this file — the raw `- [ ]` count is also 26, so no fenced example inflates it); every cross-task signature was re-derived from the consuming file (`deleteAdminGalleryPhoto(db, env: PhotoEnv, …)` consumed exactly as `gallery-photos.ts`'s route fences it; `deleteAdminPackage(db, env: SaveEnv, …)` as `admin-service-packages.ts` fences it; the nine `remove(args)` wrappers consumed with the args types Task 4 exports); the mocked boundaries were re-derived from the code they mock (the loopback its assert the MOCK's own 204/400/404 envelopes; the r2 assertions read the stub's `deleteCalls` against the row's actual key read pre-delete; no `toHaveBeenCalledWith` asserts an envelope the mocked layer never receives); the floor arithmetic (api 350+38=388, api-client 33+4=37, types 129 and admin 184 edited-not-grown) recounts the new its per task (+18 Task 2, +19 Task 3, +1 mutlog, +4 Task 4) against the live 2026-10-12 baselines — if any executor gate count differs, reconcile before proceeding, never by loosening an assertion. The fixture-truth literals (printSize2R → 2 inclusions, attireToga → 3 junctions, branchA → 3 matrix links, combined → 4 inclusions, the 'retired-package' slug regen) were each re-derived from `apps/api/test/helpers/fixtures.ts` read in full this session.
