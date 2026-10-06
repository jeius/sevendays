# M6 Ticket 03 — The Audit Log's Write Side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The durable who/what/when record of CMS writes — the **Audit Log's write side** (`apps/api/CONTEXT.md` ## Observability, glossary term already landed with #175) — becomes executable code: a schema-born `audit_log` table whose rows are written **inside the mutation's own transaction**, one row per committed mutation *request* (a matrix full-replace and the atomic package save are each ONE row), across the nine entity routers plus the media commit. Fields: `occurredAt`, `actorId`, `actorEmail` (snapshotted at write), `entity`, `entityId`, `action` (create | update | deactivate | reorder), `summary` (name/slug, readable without joins), `requestId` (correlates the #183 Application Log's middleware-minted id). No before/after blobs. Only committed mutations record — a failed validation never opens a transaction; a mid-transaction failure rolls the row back with the write.

**Architecture:** Seven tasks: (1) `packages/db` — the `audit_log` table (schema file + generated migration 0008 + live apply + barrel export + the truncate-list pin, TDD'd through the derived truncate test); (2) `packages/types` — the audit vocabulary (the action/entity enums + the row schema) with contract tests; (3) `apps/api` — the audit module (`auditActor` + `writeAuditRow` + the spike-proven tx type), the `requestId` promoted into Hono Variables, and rows on the four simple families (branches, print-sizes, attires, addon-services) whose writes gain the transaction wrap; (4) studio-services CRUD + the two matrix full-replaces (audit inside the existing transactions); (5) the gallery families (categories, testimonials, photos — the media commit's row rides the photo persists) + the three order PUTs (reorder rows, `entityId` null); (6) the atomic package save (request-grain, the mid-tx rollback proof); (7) full gates + docs rotation + PR/merge + the v1 pick (pre-ruled PICK clean) + ledger row + issue close. No route, wire shape, or response changes anywhere — the write model's external behavior is byte-identical; the only observable additions are the table and its rows.

**Tech Stack:** drizzle-orm `0.45.2` + drizzle-kit `0.31.10` (installed — `pnpm --filter @sevendays/db list drizzle-orm drizzle-kit --depth 0`), zod `4.5.1`, hono `4.13.5`, vitest 4, pnpm + Turborepo, `gh` CLI. **Zero new dependencies.**

**Spec:** Implements ticket [#185 "M6 ticket 03: the Audit Log's write side — the transactional record"](https://github.com/jeius/sevendays/issues/185) (label `ready-for-agent`; blocked-by #183 — CLOSED 2026-10-05, unblocked), whose parent is the M6 spec `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` (issue #182 — § The Audit Log is this ticket's section; § Testing Decisions names the audit-row suites; § v1-pick classes pre-rule the payload PICK clean). Key recon facts (2026-10-06, main `94fe41e`, compose db up + healthy, tree clean outside the expected graphify-out dirt):

- **The mutation surface is exactly the #183 twin's 23 handler sites across nine routers** (`grep -n "logAdminMutation" apps/api/src/routes/*.ts` → 23 emit sites + 9 imports): branches/print-sizes/attires/addon-services/service-packages each POST `/` + PUT `/:id`; gallery-photos, gallery-categories, testimonials add `PUT /order`; studio-services adds `PUT /:id/branches` + `PUT /:id/addons`. No DELETE routes exist. Every audit write lands in the SERVICE (inside the transaction), not the route — the routes only build the actor context.
- **The transaction map (the load-bearing recon):** the two matrix full-replaces (`setStudioServiceBranchMatrix` / `setStudioServiceAddonMatrix` in `services/admin-entities.ts`), the three order PUTs (`setGalleryCategoryOrder` / `setTestimonialOrder` / `setGalleryPhotoOrder` in `services/admin-gallery.ts`), and the atomic package save (`runPackageSave` in `services/admin-packages.ts`) already run inside `db.transaction(...)` — the audit insert joins those bodies as their LAST statement. The simple creates/updates (branches, print-sizes, attires, addon-services, studio-services, gallery categories, testimonials, gallery photos) are **single autocommit statements today** — each gains a `db.transaction` wrap so the audit row rides the write's own commit/rollback (the spec's ruling: "the transaction is the gate"). `guardUnique` wrappers compose cleanly around the new transactions (a 23505 inside the tx rolls the audit insert back with the write; the mapper still resolves the 400).
- **The requestId seam exists but is not in context Variables:** `observability/request-context.ts`'s `requestLogging` (root-mounted before `/api/v1` in `src/index.ts`) mints `crypto.randomUUID()`, echoes it as `X-Request-Id`, and binds it to the child logger — but nothing `c.set`s it. This ticket adds `c.set('requestId', requestId)` + `requestId: string` to `RootEnv.Variables` (`observability/logger.ts`) and `ApiEnv.Variables` (`services/db.ts`), so `auditActor(c)` reads the SAME value the Application Log's lines and the response header carry — the correlation the spec rules.
- **The actor:** `requireSession` (the admin root's ONE gate, `routes/admin.ts:23`) sets `c.get('session')` — BetterAuth's `SessionData`, `{ session, user }` with `user.id` and `user.email` (the `user.email` column is `notNull` in `packages/db/src/schema/auth.ts`). `updateBranchSchema` & co. carry `isActive: z.boolean().default(true)` (photo update requires it — `z.boolean()` no default): **post-validation `input.isActive` is always a boolean**, so the deactivate rule reads it directly.
- **There is no standalone media-commit route** — `commitUpload` (`services/media.ts:100`) is bucket I/O only (HEAD → caps → promote → delete staging; no DB write), embedded in the gallery-photo persist (`commitStagingKey`) and the package-cover persist (`resolveCover`). The ticket's "plus the media commit" therefore means: the media-commit-carrying persists are in scope and their rows ARE the media commit's rows (the #183 ephemeral twin resolved it identically — `test/admin-mutation-log.test.ts`'s photo-commit test emits the `gallery-photo` mutation line). A dedicated `entity: 'media'` row does not exist and must not be invented.
- **The tx-handle type is spike-proven** (2026-10-06, `apps/api` typecheck, spike file deleted after): `type AuditTx = Parameters<Parameters<Database['transaction']>[0]>[0]` resolves to the REAL drizzle transaction object — `.insert(<schema table>).values(...).returning()` typechecks against it with the inferred row shape, and a negative control (`toEqualTypeOf<number>()`) failed with the structural mismatch error, proving the assertions enforce (the type did not collapse to `any`).
- **The truncate helper is barrel-derived:** `test/helpers/truncate.ts` walks `packages/db`'s schema barrel, so `audit_log` joins truncation automatically once exported — but `test/helpers/truncate.test.ts` pins the explicit 21-table list ("migrations 0000-0007") and must grow to 22 (Task 1, TDD entry point). Test isolation is preserved: `beforeEach` truncates `audit_log` with everything else.
- **The write-model failure contract is resolve-typed, never thrown** (`services/admin-shared.ts`): `{ ok: false, reason, message, details }` — the new tests assert resolved failures (400/404) and empty tables, never `.rejects`. `AdminSaveError` is the one throw-inside-a-transaction channel (the package save's rollback mechanism) — Task 6's mid-tx test leans on it exactly as the existing rollback test does (`test/admin-packages.test.ts:352`).
- **Baselines (live, 2026-10-06, compose db up):** `apps/api` = **27 files passed + 1 skipped (28) / 323 passed + 3 skipped** (AGENTS.md floors confirmed; the "close timed out after 10000ms" vitest-4 exit noise is pre-existing — judge the Test Files/Tests lines only). `packages/types` = **13 files / 112 tests**. `pnpm check` 35/35 turbo tasks. After this ticket: **api 27 files + 1 skipped / 338 passed + 3 skipped** (+4 Task 3, +3 Task 4, +5 Task 5, +3 Task 6 — no new api test FILES), **types 14 files / 116 tests** (+4 in Task 2's new file). v1's api floor after the pick: 25 files + 1 skipped / **272** passed + 3 skipped expected (257 + the 15 booking-free audit tests — executor reconciles actuals). If any gate count differs, reconcile before proceeding — do not loosen assertions.
- **Sibling fences (spec § Sequencing; `docs/plan.md` M6 block):** this ticket owns **M6 checkbox 4's write side ONLY — the box stays `- [ ]` until #188 (the owner-scoped viewer screen) lands it**; Task 7 annotates the box with the partial landing and leaves it unticked. NOT here, regardless of temptation: the Audit Log viewer screen, its nav entry, any admin/landing file at all, or **any read path for audit rows** (#188 — no GET route, no api-client wrapper, no server fn lands in #185); the metrics seam / dashboard / CF-GraphQL / PostHog (#186/#187); the smoke (#190); the runbook (#191); appointments/email/booking seams (outside the admin root; auth events are ruled out of the Audit Log's frame); `packages/api-client` (the wire is unchanged — no type drift to absorb); any new env var, secret, or binding (the audit write side is env-free); `worker-configuration.d.ts`; `packages/db/src/schema/relations.ts` (no FKs → no relations entries); the seed (the table is born empty — `packages/db/scripts/*` untouched); any ADR (the schema-based ruling is the spec's own — #175's closed fork + the landed glossary terms record it; this ticket implements, it does not fork); `observability/events.ts`'s emitter bodies beyond the one type alias (Task 3).

## Global Constraints

- **Branch & baseline:** `feat/185-audit-log-write-side` off main `94fe41e` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#185)` squash style; every commit below is pinned verbatim. Evidence (test output, the migration SQL read) lands in gitignored `.superpowers/sdd/2026-10-06-185-audit-log-write-side/`.
- **Gates (repo AGENTS.md, verbatim duties):** no manifest changes exist in this ticket — no `pnpm install` is owed. **After every `packages/db` or `packages/types` source change, run `pnpm build:packages` before any api typecheck/test run** (the api resolves both packages from built `dist/`; the test helpers import `@sevendays/db` and `@sevendays/db/migrate` the same way). Every task commits only with `pnpm check` green for the packages it touched (api + types tests need the compose db up: `docker compose up -d db` first). Biome canonical form via `pnpm --filter @sevendays/api fix` / `--filter @sevendays/types fix` / `--filter @sevendays/db fix` before committing — accept its rewrites. Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **Live-DB gate (binding, from the M5 precedent):** the one `db:migrate` run against live Supabase (Task 1) requires `DATABASE_MIGRATE_URL` (session-mode pooler, port 5432) in gitignored `packages/db/.env`. Verify first with `node packages/db/scripts/check-env.mjs` (expect `GATE: PASS`); never paste a connection string into chat, a commit, the PR body, or the evidence dir. The compose TEST database needs no manual migrate — `apps/api/test/global-setup.ts` applies pending migrations before every suite run.
- **Migration discipline (house rule, binding):** migrations are generated via `pnpm --filter @sevendays/db db:generate` and NEVER hand-edited in `packages/db/migrations`. Drizzle-kit names the file itself (`0008_<slug>.sql` — record the actual name in the Task 1 commit body and Task 7's progress note). After generating, read the emitted SQL against the shape pinned in Task 1: if drizzle emits something materially different (a different constraint form, extra statements), STOP and report — do not edit the file to match the plan. The table is born EMPTY on a live DB with no backfill concerns — there is deliberately no two-migration backfill variant in this ticket.
- **The row contract (spec-verbatim, binding):** table `audit_log`, one row per committed mutation REQUEST — a matrix full-replace and the atomic package save are each one row, never one per affected DB row. Fields exactly: `id` (uuid PK), `occurredAt` (timestamptz, `defaultNow()`), `actorId` (text — BetterAuth user id), `actorEmail` (text — snapshotted at write; the durable "who" even if the staff email later changes), `entity` (text — one of the nine names), `entityId` (text, NULLABLE — null for the family-level order PUTs, matching the #183 twin's `entityId: null` ruling), `action` (text — `create` | `update` | `deactivate` | `reorder`, the spec-pinned enum), `summary` (text, nullable), `requestId` (text — the #183 middleware-minted id; equals the served `X-Request-Id` and every Application Log line of the same request). **No before/after blobs. No FKs by design** — the record outlives both the actor (`actorId` unconstrained) and the row it names (`entityId` is polymorphic across nine families). One index only: `audit_log_occurred_at_idx` on `occurred_at` (the viewer's newest-first sort; #188 may add filter indexes if it needs them). Retention unbounded — no prune job.
- **The write-placement law (binding):** `writeAuditRow(tx, ...)` is called as the LAST statement of the mutation's transaction body, over the transaction's own `tx` handle — never a fresh `db` handle, never at the route layer after the fact. A write that cannot commit its audit row must not commit at all (an audit-insert failure aborts the whole transaction — correct and intentional). Failed validations resolve BEFORE any transaction opens and record nothing; the 401 path never reaches a service.
- **Vocabulary pins (agent rulings, owner-reviewable at PR — the spec pins the enum and the field set but not these mappings):** (a) `action` computation — POST → `create`; entity PUT → `current.isActive && input.isActive === false ? 'deactivate' : 'update'` (reactivation and edits of already-deactivated rows are `update`; a row born deactivated via POST `isActive: false` is still `create`); matrix PUTs → `update`; order PUTs → `reorder` with `entityId` null AND `summary` null (the family, not a row). (b) `summary` per entity — branch: `name`; print-size: `code`; attire: `name`; addon-service: `name`; studio-service: `name` (matrices included — the service row's name); service-package: `input.name`; gallery-category: `name`; testimonial: `person`; gallery-photo: `row.title ?? row.r2Key` (the immutable final key — a stable, join-free identifier for untitled photos). (c) table name `audit_log` singular with drizzle symbol `auditLog` (it names the log, the glossary term; BetterAuth's generated `user`/`session` already seat singular names in the barrel). (d) the types' `entityId` is `z.uuid().nullable()` (every domain id is a uuid; `actorId` stays free-text).
- **`packages/types` is the vocabulary's home (ticket-ruled):** the row's types land in `packages/types/src/audit.ts` (the action + entity enums, the row schema), exported from the barrel. `apps/api`'s `AdminMutationEntity` (observability/events.ts) becomes a type alias of the canonical `AuditEntity` — one list, no drift between the ephemeral and durable records.
- **The requestId correlation is structural:** `auditActor(c)` reads `c.get('requestId')` (set by `requestLogging` BEFORE `next()`), so the row's `requestId` equals the `X-Request-Id` header and the Application Log's lines by construction — asserted in the Task 3 and Task 6 tests via `res.headers.get('x-request-id')`.
- **PII stance (binding):** `actorEmail` in the audit TABLE is the spec's own ruling (the snapshot is the durable "who") — it is NOT a license for the Application Log: `logAdminMutation` and every other event class stay email-free (#183's enumerated schemas, unchanged). No raw request body, no IP/UA/referrer lands in any audit field; `summary` carries only the name/slug-class literals pinned above.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–6 edit only: `packages/db/src/schema/audit-log.ts` (create), `packages/db/src/schema/index.ts` (one export line), `packages/db/migrations/0008_*.sql` + `meta/_journal.json` (generated), `packages/types/src/audit.ts` + `audit.test.ts` (create), `packages/types/src/index.ts` (one export line), `apps/api/src/observability/request-context.ts` + `logger.ts` + `events.ts`, `apps/api/src/services/db.ts` (the ApiEnv Variables line), `apps/api/src/services/audit.ts` (create), `apps/api/src/services/admin-entities.ts` + `admin-gallery.ts` + `admin-packages.ts`, `apps/api/src/routes/admin-branches.ts` + `admin-print-sizes.ts` + `admin-attires.ts` + `admin-addon-services.ts` + `admin-studio-services.ts` + `admin-gallery-categories.ts` + `admin-testimonials.ts` + `gallery-photos.ts` + `admin-service-packages.ts`, `apps/api/test/helpers/truncate.test.ts`, `apps/api/test/admin-entities.test.ts` + `admin-studio-services.test.ts` + `admin-gallery.test.ts` + `admin-packages.test.ts`. Task 7 rotates `docs/plan.md` (M6 box 4 — ANNOTATED, not ticked), `docs/progress.md`, `AGENTS.md` (floors line + status bullet), and `docs/agents/v1-picks.md` (ledger row, post-merge). NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
packages/
  db/
    src/schema/audit-log.ts                 # create (Task 1) — the audit_log table
    src/schema/index.ts                     # modify (Task 1) — export the new module
    migrations/0008_*.sql + meta/           # generated (Task 1)
  types/
    src/audit.ts                            # create (Task 2) — enums + row schema
    src/audit.test.ts                       # create (Task 2) — contract tests
    src/index.ts                            # modify (Task 2) — one export line
apps/api/
  src/
    observability/
      request-context.ts                    # modify (Task 3) — c.set('requestId', …)
      logger.ts                             # modify (Task 3) — RootEnv gains requestId
      events.ts                             # modify (Task 3) — AdminMutationEntity = AuditEntity
    services/
      db.ts                                 # modify (Task 3) — ApiEnv gains requestId
      audit.ts                              # create (Task 3) — auditActor + writeAuditRow + AuditTx
      admin-entities.ts                     # modify (Tasks 3+4) — 8 simple fns + studio CRUD + 2 matrices
      admin-gallery.ts                      # modify (Task 5) — 9 fns incl. the 3 order PUTs
      admin-packages.ts                     # modify (Task 6) — the atomic save's audit ride
    routes/
      admin-branches.ts                     # modify (Task 3) — auditActor at 2 sites
      admin-print-sizes.ts                  # modify (Task 3) — 2 sites
      admin-attires.ts                      # modify (Task 3) — 2 sites
      admin-addon-services.ts               # modify (Task 3) — 2 sites
      admin-studio-services.ts              # modify (Task 4) — 4 sites
      gallery-photos.ts                     # modify (Task 5) — 3 sites
      admin-gallery-categories.ts           # modify (Task 5) — 3 sites
      admin-testimonials.ts                 # modify (Task 5) — 3 sites
      admin-service-packages.ts             # modify (Task 6) — 2 sites
  test/
    helpers/truncate.test.ts                # modify (Task 1) — 21 → 22 tables
    admin-entities.test.ts                  # modify (Task 3) — +4 audit tests
    admin-studio-services.test.ts           # modify (Task 4) — +3
    admin-gallery.test.ts                   # modify (Task 5) — +5
    admin-packages.test.ts                  # modify (Task 6) — +3
```

---

### Task 1: `packages/db` — the `audit_log` table, migration 0008, live apply (TDD through the truncate pin)

**Files:**
- Modify (test-first): `apps/api/test/helpers/truncate.test.ts`
- Create: `packages/db/src/schema/audit-log.ts`
- Modify: `packages/db/src/schema/index.ts` (one line)
- Generated: `packages/db/migrations/0008_*.sql` + `meta/_journal.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (what Tasks 2–6 + #188 rely on): exported drizzle table `auditLog` = `pgTable('audit_log', …)` with columns exactly `id` (uuid PK `defaultRandom`), `occurredAt` (timestamptz `notNull` `defaultNow`), `actorId` (text `notNull`), `actorEmail` (text `notNull`), `entity` (text `notNull`), `entityId` (text, nullable), `action` (text `notNull`), `summary` (text, nullable), `requestId` (text `notNull`), plus `index('audit_log_occurred_at_idx')` on `occurredAt`; the row type `typeof auditLog.$inferSelect` = `{ id: string; occurredAt: Date; actorId: string; actorEmail: string; entity: string; entityId: string | null; action: string; summary: string | null; requestId: string }`. Migration 0008 applied to live Supabase; the compose test db migrates itself.

**Not here:** `relations.ts` (no FKs → no relations entries); any enum type in PG (text columns + the Zod enums in Task 2 are the contract); the seed; Task 2's types.

- [ ] **Step 1: Write the failing truncate pin**

In `apps/api/test/helpers/truncate.test.ts`, change the second test to expect the new table (the list is `.sort()`ed — `audit_log` lands AFTER `attires`: ASCII sort orders `attires` < `audit_log`; the example order below is the actual sort output, corrected by controller ruling during execution):

```ts
  it('still truncates exactly the twenty-two known public tables (migrations 0000-0008)', () => {
    expect(publicTableNames()).toEqual([
      'account',
      'addon_services',
      'appointment_addon_services',
      'appointments',
      'attires',
      'audit_log',
      'branch_studio_services',
      'branches',
      'frames',
      'gallery_categories',
      'gallery_photos',
      'package_inclusion_attires',
      'package_inclusions',
      'print_sizes',
      'rate_limit',
      'service_packages',
      'session',
      'studio_service_addon_services',
      'studio_services',
      'testimonials',
      'user',
      'verification',
    ]);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm build:packages && pnpm --filter @sevendays/api exec vitest run test/helpers/truncate.test.ts`
Expected: FAIL — `publicTableNames()` returns the 21-entry list without `audit_log` (the barrel walk finds no such table). If the run instead fails on db reachability, start the compose db (`docker compose up -d db`) and rerun.

- [ ] **Step 3: Create the schema file and export it**

Create `packages/db/src/schema/audit-log.ts`:

```ts
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// The Audit Log (M6 #185, glossary — apps/api/CONTEXT.md ## Observability):
// the durable who/what/when of every committed CMS write — ONE row per
// mutation REQUEST (a matrix full-replace and the atomic package save are
// each one row), written INSIDE the mutation's own transaction so the row
// exists exactly when the write committed and never otherwise: failed
// validations resolve before any transaction opens, and a mid-transaction
// throw rolls the row back with the write. actorEmail is snapshotted at
// write (the durable "who" even after a staff email changes). No FKs by
// design — the record outlives both the actor and the row it names
// (entityId is polymorphic across the nine entity families, null for the
// family-level order PUTs). No before/after blobs (diffing is v2-if-ever).
// Retention unbounded: a 3-branch studio writes rows per week, not per
// minute (the spec's ruling — no prune job, no export in M6).
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    actorId: text('actor_id').notNull(),
    actorEmail: text('actor_email').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    action: text('action').notNull(),
    summary: text('summary'),
    requestId: text('request_id').notNull(),
  },
  (table) => [index('audit_log_occurred_at_idx').on(table.occurredAt)]
);
```

In `packages/db/src/schema/index.ts`, add the export in alphabetical position (BEFORE `auth.js` — `audit-log.js` sorts first; corrected by controller ruling during execution):

```ts
export * from './audit-log.js';
```

- [ ] **Step 4: Generate migration 0008 and read it against the pinned shape**

Run: `pnpm --filter @sevendays/db db:generate`
Expected: one new `packages/db/migrations/0008_<slug>.sql` (record the actual name) whose statements are materially this shape (formatting/ordering may differ; constraint and index names as pinned):

```sql
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" text NOT NULL,
	"actor_email" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"action" text NOT NULL,
	"summary" text,
	"request_id" text NOT NULL
);
CREATE INDEX "audit_log_occurred_at_idx" ON "audit_log" USING btree ("occurred_at");
```

If drizzle emits something materially different, STOP and report — do not edit the file.

- [ ] **Step 5: Apply to the live DB (owner-env gate)**

Run: `node packages/db/scripts/check-env.mjs` (expect `GATE: PASS`), then `pnpm --filter @sevendays/db db:migrate`.
Expected: migration 0008 applied to live Supabase (the table is born empty — nothing else changes there). The compose test db needs nothing: the api's global-setup migrates it on the next suite run.

- [ ] **Step 6: Run the truncate pin to verify it passes**

Run: `pnpm build:packages && pnpm --filter @sevendays/api exec vitest run test/helpers/truncate.test.ts`
Expected: PASS (2 tests) — the derived list now carries `audit_log`, and global-setup applied 0008 to the compose db before the run.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema packages/db/migrations apps/api/test/helpers/truncate.test.ts
git commit -m "feat(db): the audit_log table — migration 0008 + barrel + truncate pin (#185)"
```

### Task 2: `packages/types` — the audit vocabulary + contract tests (TDD)

**Files:**
- Create (test-first): `packages/types/src/audit.test.ts`
- Create: `packages/types/src/audit.ts`
- Modify: `packages/types/src/index.ts` (one line)

**Interfaces:**
- Consumes: Task 1's column contract (the schema mirrors the table exactly).
- Produces (what Tasks 3–6 + #188 rely on): `auditActionSchema: ZodEnum` over `'create' | 'update' | 'deactivate' | 'reorder'` + `type AuditAction`; `auditEntitySchema` over the nine names (`'branch' | 'print-size' | 'gallery-photo' | 'attire' | 'addon-service' | 'studio-service' | 'service-package' | 'gallery-category' | 'testimonial'`) + `type AuditEntity`; `auditLogRowSchema` (the full row: `id` uuid, `occurredAt` coerced date, `actorId`/`actorEmail` non-empty strings, `entity`/`action` the enums, `entityId` uuid-or-null, `summary` string-or-null, `requestId` non-empty string) + `type AuditLogRow`.

**Not here:** any wire/route schema (no API route serves these rows in #185 — #188 consumes them); `apps/api`'s events.ts (Task 3); the drizzle side (Task 1, done).

- [ ] **Step 1: Write the failing contract tests**

Create `packages/types/src/audit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { auditActionSchema, auditEntitySchema, auditLogRowSchema } from './audit.js';

// The Audit Log row's contract (M6 #185, spec § The Audit Log): the enum
// vocabulary is the spec's own pin; the row schema mirrors packages/db's
// audit_log table 1:1 so #188's reads parse what the write side stores.
// Assertions run on PARSED OUTPUT (zod strips unknown keys — the strip is
// proven by the output's key set, never by expecting a throw).

const fullRow = {
  id: '11111111-2222-4333-8444-555555555555',
  occurredAt: '2026-10-06T12:00:00.000Z',
  actorId: 'better-auth-text-id',
  actorEmail: 'staff@sevendays.test',
  entity: 'service-package',
  entityId: '66666666-7777-4888-9999-000000000000',
  action: 'deactivate',
  summary: 'Graduation Deluxe',
  requestId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
};

describe('auditActionSchema', () => {
  it('accepts exactly the four spec-pinned values', () => {
    for (const action of ['create', 'update', 'deactivate', 'reorder']) {
      expect(auditActionSchema.parse(action)).toBe(action);
    }
  });

  it('rejects anything else — delete is not in the vocabulary', () => {
    expect(auditActionSchema.safeParse('delete').success).toBe(false);
  });
});

describe('auditEntitySchema', () => {
  it('accepts the nine route-segment names', () => {
    for (const entity of [
      'branch',
      'print-size',
      'gallery-photo',
      'attire',
      'addon-service',
      'studio-service',
      'service-package',
      'gallery-category',
      'testimonial',
    ]) {
      expect(auditEntitySchema.parse(entity)).toBe(entity);
    }
  });

  it('rejects names outside the admin write model (appointments are not audited)', () => {
    expect(auditEntitySchema.safeParse('appointment').success).toBe(false);
  });
});

describe('auditLogRowSchema', () => {
  it('round-trips a full row: occurredAt coerced to Date, unknown keys stripped from the output', () => {
    const parsed = auditLogRowSchema.parse({ ...fullRow, sneaky: 'blob' });
    expect(parsed).toEqual({
      id: fullRow.id,
      occurredAt: new Date('2026-10-06T12:00:00.000Z'),
      actorId: fullRow.actorId,
      actorEmail: fullRow.actorEmail,
      entity: fullRow.entity,
      entityId: fullRow.entityId,
      action: fullRow.action,
      summary: fullRow.summary,
      requestId: fullRow.requestId,
    });
    expect('sneaky' in parsed).toBe(false);
  });

  it('entityId and summary are nullable (the order PUTs write null); ids must be uuids and actors non-empty', () => {
    const nullable = auditLogRowSchema.parse({ ...fullRow, entityId: null, summary: null });
    expect(nullable.entityId).toBeNull();
    expect(nullable.summary).toBeNull();
    expect(auditLogRowSchema.safeParse({ ...fullRow, entityId: 'not-a-uuid' }).success).toBe(false);
    expect(auditLogRowSchema.safeParse({ ...fullRow, actorEmail: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sevendays/types test`
Expected: FAIL — `Cannot find module './audit.js'` (or the runner's equivalent for a missing import).

- [ ] **Step 3: Create the schema module and export it**

Create `packages/types/src/audit.ts`:

```ts
import { z } from 'zod';

// The Audit Log row (M6 #185, spec § The Audit Log): the durable
// who/what/when of a committed CMS write. The action enum is the spec's
// pin (create | update | deactivate | reorder); the entity names are the
// nine admin-router segments (the same vocabulary the Application Log's
// admin_mutation events carry — one list, canonicalized here). This schema
// mirrors packages/db's audit_log table 1:1: the write side inserts rows
// that satisfy it, and the #188 viewer parses rows through it. No
// before/after fields exist anywhere in the contract (v2-if-ever).
export const auditActionSchema = z.enum(['create', 'update', 'deactivate', 'reorder']);

export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntitySchema = z.enum([
  'branch',
  'print-size',
  'gallery-photo',
  'attire',
  'addon-service',
  'studio-service',
  'service-package',
  'gallery-category',
  'testimonial',
]);

export type AuditEntity = z.infer<typeof auditEntitySchema>;

export const auditLogRowSchema = z.object({
  id: z.uuid(),
  occurredAt: z.coerce.date(),
  actorId: z.string().min(1),
  actorEmail: z.string().min(1),
  entity: auditEntitySchema,
  entityId: z.uuid().nullable(),
  action: auditActionSchema,
  summary: z.string().nullable(),
  requestId: z.string().min(1),
});

export type AuditLogRow = z.infer<typeof auditLogRowSchema>;
```

In `packages/types/src/index.ts`, add the export in alphabetical position (BETWEEN `attire.js` AND `branch.js` — `audit` sorts after `attire`, before `branch`; the plan's original "first line" was wrong, corrected by controller ruling during execution):

```ts
export * from './audit.js';
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sevendays/types test && pnpm --filter @sevendays/types typecheck`
Expected: PASS — **14 files / 116 tests** (13/112 + this file's 4). Then `pnpm build:packages` (the api consumes the enums from `dist/` starting Task 3).

- [ ] **Step 5: Commit**

```bash
git add packages/types/src
git commit -m "feat(types): the audit vocabulary — action/entity enums + the row schema (#185)"
```

### Task 3: `apps/api` — the audit module, requestId in Variables, rows on the four simple families (TDD)

**Files:**
- Modify (test-first): `apps/api/test/admin-entities.test.ts`
- Create: `apps/api/src/services/audit.ts`
- Modify: `apps/api/src/observability/request-context.ts`, `apps/api/src/observability/logger.ts`, `apps/api/src/observability/events.ts`, `apps/api/src/services/db.ts`
- Modify: `apps/api/src/services/admin-entities.ts` (branches, print-sizes, attires, addon-services — 8 functions)
- Modify: `apps/api/src/routes/admin-branches.ts`, `admin-print-sizes.ts`, `admin-attires.ts`, `admin-addon-services.ts` (8 call sites)

**Interfaces:**
- Consumes: Task 1's `auditLog` table; Task 2's `AuditAction`/`AuditEntity`; the #183 seams (`requestLogging`, `c.get('session')`, `c.get('logger')`).
- Produces (what Tasks 4–6 rely on, exact signatures): from `services/audit.ts` — `type AuditActor = { actorId: string; actorEmail: string; requestId: string }`, `type AuditWrite = { entity: AuditEntity; entityId: string | null; action: AuditAction; summary: string | null }`, `type AuditTx = Parameters<Parameters<Database['transaction']>[0]>[0]`, `auditActor(c: Context<ApiEnv>): AuditActor`, `writeAuditRow(tx: AuditTx, actor: AuditActor, entry: AuditWrite): Promise<void>`. Service signature convention for the whole ticket: **the `AuditActor` param sits second, after `db` (or after `env` where a service carries one), before ids/inputs** — `createAdminBranch(db, audit, input)`, `updateAdminBranch(db, audit, id, input)`. Context growth: `RootEnv['Variables']` and `ApiEnv['Variables']` each gain `requestId: string`.

**Not here:** studio-services/matrices (Task 4); the gallery families (Task 5); the package save (Task 6); any read path for audit rows.

- [ ] **Step 1: Write the failing tests**

In `apps/api/test/admin-entities.test.ts`: extend the import from `@sevendays/db` to include `auditLog`, extend the vitest import to include `vi`, and append this describe block at the end of the file (the `authed`/`app`/`db`/`url`/`testEnv`/`bearer`/`signUpSession` bindings are the file's existing ones):

```ts
describe('audit rows (M6 #185 — one per committed mutation, tx-gated)', () => {
  const rows = async () => db.select().from(auditLog);

  it('POST branches → exactly one row with the ruled fields; requestId = the served X-Request-Id AND the admin_mutation line (the Application Log correlation)', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    try {
      const { token, userId } = await signUpSession(url, 'audit-branch@sevendays.test');
      const res = await app.request(
        '/api/v1/admin/branches',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...bearer(token) },
          body: JSON.stringify({
            name: 'Audit Branch',
            address: '1 Audit St',
            phone: '+63 900 000 010',
          }),
        },
        testEnv(url)
      );
      expect(res.status).toBe(201);
      const created = (await res.json()) as { id: string };
      const all = await rows();
      expect(all).toHaveLength(1);
      const [row] = all;
      if (!row) throw new Error('expected one audit row');
      expect(row.entity).toBe('branch');
      expect(row.entityId).toBe(created.id);
      expect(row.action).toBe('create');
      expect(row.summary).toBe('Audit Branch');
      expect(row.actorId).toBe(userId);
      expect(row.actorEmail).toBe('audit-branch@sevendays.test');
      expect(row.requestId).toBe(res.headers.get('x-request-id'));
      expect(row.occurredAt).toBeInstanceOf(Date);
      const mutationLines = lines
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .filter((line) => line.evt === 'admin_mutation');
      expect(mutationLines).toHaveLength(1);
      expect(mutationLines[0]?.requestId).toBe(row.requestId);
    } finally {
      spy.mockRestore();
    }
  });

  it('PUT flipping isActive true→false records deactivate; a later reactivation records update', async () => {
    const created = await authed('POST', '/api/v1/admin/branches', 'audit-flip@sevendays.test', {
      name: 'Flip Branch',
      address: '2 Flip St',
      phone: '+63 900 000 011',
    });
    const { id } = (await created.json()) as { id: string };
    const body = {
      name: 'Flip Branch',
      address: '2 Flip St',
      phone: '+63 900 000 011',
    };
    const off = await authed('PUT', `/api/v1/admin/branches/${id}`, 'audit-flip@sevendays.test', {
      ...body,
      isActive: false,
    });
    expect(off.status).toBe(200);
    const afterOff = (await rows()).filter((row) => row.entityId === id);
    expect(afterOff.filter((row) => row.action === 'deactivate')).toHaveLength(1);
    const on = await authed('PUT', `/api/v1/admin/branches/${id}`, 'audit-flip@sevendays.test', {
      ...body,
      name: 'Flip Branch Renamed',
      isActive: true,
    });
    expect(on.status).toBe(200);
    const afterOn = (await rows()).filter((row) => row.entityId === id);
    expect(afterOn.filter((row) => row.action === 'deactivate')).toHaveLength(1);
    expect(afterOn.filter((row) => row.action === 'update')).toHaveLength(1);
  });

  it('failed writes record nothing: a 400 (duplicate name), a 404 (unknown id), and a 401 (anonymous) each leave the table empty', async () => {
    const dup = await authed('POST', '/api/v1/admin/branches', 'audit-dup@sevendays.test', {
      name: 'Test Branch A', // fixture name — the uniqueness collision
      address: 'X St',
      phone: '+63 900 000 000',
    });
    expect(dup.status).toBe(400);
    const missing = await authed(
      'PUT',
      '/api/v1/admin/branches/00000000-0000-4000-8000-000000000000',
      'audit-dup@sevendays.test',
      { name: 'Ghost', address: 'X St', phone: '+63 900 000 000' }
    );
    expect(missing.status).toBe(404);
    const anon = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Nope', address: 'X', phone: 'y' }),
      },
      testEnv(url)
    );
    expect(anon.status).toBe(401);
    expect(await rows()).toEqual([]);
  });

  it('print-size, attire, and add-on-service POSTs → one row each with the family summary (code or name)', async () => {
    const ps = await authed('POST', '/api/v1/admin/print-sizes', 'audit-ps@sevendays.test', {
      code: 'A4',
      description: 'Audit size',
    });
    const at = await authed('POST', '/api/v1/admin/attires', 'audit-at@sevendays.test', {
      name: 'Audit Barong',
    });
    const ad = await authed(
      'POST',
      '/api/v1/admin/addon-services',
      'audit-ad@sevendays.test',
      { name: 'Audit Spray', description: 'Hold that updo', priceCents: 3000 }
    );
    expect([ps.status, at.status, ad.status]).toEqual([201, 201, 201]);
    const all = await rows();
    expect(all.map((row) => [row.entity, row.summary]).sort()).toEqual([
      ['addon-service', 'Audit Spray'],
      ['attire', 'Audit Barong'],
      ['print-size', 'A4'],
    ]);
    expect(all.every((row) => row.action === 'create')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @sevendays/api exec vitest run test/admin-entities.test.ts`
Expected: FAIL — the four new tests find zero audit rows (`expected 1, received 0` class); the file's existing tests keep passing.

- [ ] **Step 3: Promote requestId into context Variables**

In `apps/api/src/observability/request-context.ts`, add the `c.set` line inside `requestLogging` (and extend the file-head comment's last sentence as pinned below the diff):

```ts
export const requestLogging: MiddlewareHandler<RootEnv> = async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.set('logger', createRequestLogger(requestId));
```

Append to the file-head comment block: ` #185's audit rows read this same value from Variables — the durable record correlates with the ephemeral lines and the header by construction.`

In `apps/api/src/observability/logger.ts`, grow `RootEnv`:

```ts
export type RootEnv = {
  Bindings: Env;
  Variables: { logger: RequestLogger; requestId: string; session?: { user: { id: string } } };
};
```

In `apps/api/src/services/db.ts`, grow `ApiEnv` (and extend the comment's `logger` sentence with: `; requestId is set by the same root middleware (#185 — the audit rows read it)`):

```ts
export type ApiEnv = {
  Bindings: Env;
  Variables: { db: Database; session?: SessionData; logger: RequestLogger; requestId: string };
};
```

- [ ] **Step 4: Create the audit module**

Create `apps/api/src/services/audit.ts`:

```ts
import { auditLog, type Database } from '@sevendays/db';
import type { AuditAction, AuditEntity } from '@sevendays/types';
import type { Context } from 'hono';
import type { ApiEnv } from './db.js';

// The Audit Log's write side (M6 #185, spec § The Audit Log): the durable
// who/what/when of every committed CMS write — ONE row per mutation
// REQUEST (a matrix full-replace and the atomic package save are each one
// row), written INSIDE the mutation's own transaction so the row exists
// exactly when the write committed and never otherwise: failed validations
// resolve before any transaction opens, and a mid-transaction throw rolls
// the row back with the write. The Application Log's admin_mutation event
// is the ephemeral twin (same requestId, emitted at the route); this table
// is the durable record — the standing split (#183).

/** The request-scoped facts every audit row carries (built at the route). */
export type AuditActor = {
  actorId: string;
  actorEmail: string;
  requestId: string;
};

/** One row's mutation facts (the service computes entity/action/summary). */
export type AuditWrite = {
  entity: AuditEntity;
  entityId: string | null;
  action: AuditAction;
  summary: string | null;
};

// The tx handle every audit insert rides, extracted from the db client's
// own transaction signature so it cannot drift (spike-proven 2026-10-06:
// the extraction yields the real drizzle transaction object — insert +
// returning infer against it, and a negative type control failed).
export type AuditTx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Build the AuditActor from the request context. Throws when the session
 * is absent — unreachable behind the admin root's requireSession
 * (routes/admin.ts), and a loud failure beats a silently anonymous row.
 * actorEmail is the snapshot source the spec names (BetterAuth's user row).
 */
export function auditActor(c: Context<ApiEnv>): AuditActor {
  const session = c.get('session');
  if (!session) {
    throw new Error(
      'auditActor: no session in context — the admin root gate must precede every audit write'
    );
  }
  return {
    actorId: session.user.id,
    actorEmail: session.user.email,
    requestId: c.get('requestId'),
  };
}

/**
 * The one insert every audit row rides — the LAST statement of the
 * mutation's transaction body, over that transaction's own tx handle
 * (never a fresh db handle: the row must commit or roll back WITH the
 * write it records).
 */
export async function writeAuditRow(
  tx: AuditTx,
  actor: AuditActor,
  entry: AuditWrite
): Promise<void> {
  await tx.insert(auditLog).values({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    summary: entry.summary,
    requestId: actor.requestId,
  });
}
```

- [ ] **Step 5: Canonicalize the entity vocabulary in events.ts**

In `apps/api/src/observability/events.ts`: add `import type { AuditEntity } from '@sevendays/types';` and replace the local literal union with the alias:

```ts
export type AdminMutationEntity = AuditEntity;
```

(Comment note rides the alias: `// #185 canonicalized the list in packages/types — the ephemeral events and the durable rows share one vocabulary.` The emitter body is untouched.)

- [ ] **Step 6: The four families' services — wrap each write in its transaction + audit row**

In `apps/api/src/services/admin-entities.ts`: add `import type { AuditAction } from '@sevendays/types';` and `import { type AuditActor, writeAuditRow } from './audit.js';`, then replace the eight functions. Branches (the pattern-setting pair — every other family is this shape with its table/unique/summary swapped):

```ts
export function createAdminBranch(
  db: Database,
  audit: AuditActor,
  input: CreateBranchInput
): Promise<AdminCreateResult<BranchRow>> {
  return guardUnique(BRANCH_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(branches).values(input).returning();
      if (!row) throw new Error('insert branches: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'branch',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
}

export async function updateAdminBranch(
  db: Database,
  audit: AuditActor,
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
  // M6 #185: deactivation is a RULING on the flip — only true→false is
  // 'deactivate'; reactivation and edits of deactivated rows are 'update'.
  const action: AuditAction = current.isActive && input.isActive === false ? 'deactivate' : 'update';
  return guardUnique(BRANCH_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(branches)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(branches.id, id))
        .returning();
      if (!row) throw new Error('update branches: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'branch',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
}
```

Print sizes (summary = `row.code`, unique map `PRINT_SIZE_UNIQUE`):

```ts
export function createAdminPrintSize(
  db: Database,
  audit: AuditActor,
  input: CreatePrintSizeInput
): Promise<AdminCreateResult<PrintSizeRow>> {
  return guardUnique(PRINT_SIZE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(printSizes).values(input).returning();
      if (!row) throw new Error('insert print_sizes: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'print-size',
        entityId: row.id,
        action: 'create',
        summary: row.code,
      });
      return row;
    })
  );
}

export async function updateAdminPrintSize(
  db: Database,
  audit: AuditActor,
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
  const action: AuditAction = current.isActive && input.isActive === false ? 'deactivate' : 'update';
  return guardUnique(PRINT_SIZE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(printSizes)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(printSizes.id, id))
        .returning();
      if (!row) throw new Error('update print_sizes: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'print-size',
        entityId: id,
        action,
        summary: row.code,
      });
      return row;
    })
  );
}
```

Attires (summary = `row.name`, unique map `ATTIRE_UNIQUE`):

```ts
export function createAdminAttire(
  db: Database,
  audit: AuditActor,
  input: CreateAttireInput
): Promise<AdminCreateResult<AttireRow>> {
  return guardUnique(ATTIRE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(attires).values(input).returning();
      if (!row) throw new Error('insert attires: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'attire',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
}

export async function updateAdminAttire(
  db: Database,
  audit: AuditActor,
  id: string,
  input: UpdateAttireInput
): Promise<AdminWriteResult<AttireRow>> {
  const current = await getAdminAttire(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: attires.id })
      .from(attires)
      .where(and(eq(attires.name, input.name), ne(attires.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  const action: AuditAction = current.isActive && input.isActive === false ? 'deactivate' : 'update';
  return guardUnique(ATTIRE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(attires)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(attires.id, id))
        .returning();
      if (!row) throw new Error('update attires: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'attire',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
}
```

Add-on services (summary = `row.name`, unique map `ADDON_UNIQUE`):

```ts
export function createAdminAddonService(
  db: Database,
  audit: AuditActor,
  input: CreateAddonServiceInput
): Promise<AdminCreateResult<AddonServiceRow>> {
  return guardUnique(ADDON_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(addonServices).values(input).returning();
      if (!row) throw new Error('insert addon_services: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'addon-service',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
}

export async function updateAdminAddonService(
  db: Database,
  audit: AuditActor,
  id: string,
  input: UpdateAddonServiceInput
): Promise<AdminWriteResult<AddonServiceRow>> {
  const current = await getAdminAddonService(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: addonServices.id })
      .from(addonServices)
      .where(and(eq(addonServices.name, input.name), ne(addonServices.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  const action: AuditAction = current.isActive && input.isActive === false ? 'deactivate' : 'update';
  return guardUnique(ADDON_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(addonServices)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(addonServices.id, id))
        .returning();
      if (!row) throw new Error('update addon_services: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'addon-service',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
}
```

Also extend the file-head comment with: ` M6 #185: every write now opens a transaction whose LAST statement is its audit row — the row commits exactly when the write does (the spec's transaction-is-the-gate ruling).`

- [ ] **Step 7: The four route files — build the actor at each call site**

In `apps/api/src/routes/admin-branches.ts`: add `import { auditActor } from '../services/audit.js';` and change the two service calls:

```ts
  .post('/', validatedJson(createBranchSchema), async (c) => {
    const result = await createAdminBranch(c.get('db'), auditActor(c), c.req.valid('json'));
```

```ts
      const result = await updateAdminBranch(c.get('db'), auditActor(c), id, c.req.valid('json'));
```

The same two-line shape lands in `admin-print-sizes.ts` (`createAdminPrintSize(c.get('db'), auditActor(c), …)` / `updateAdminPrintSize(c.get('db'), auditActor(c), id, …)`), `admin-attires.ts` (`createAdminAttire` / `updateAdminAttire`), and `admin-addon-services.ts` (`createAdminAddonService` / `updateAdminAddonService`) — each file gains the `auditActor` import and passes it as the second service argument at its POST and PUT sites. The `logAdminMutation` lines stay exactly where they are (the ephemeral twin keeps firing at the route; the durable row rides the transaction).

- [ ] **Step 8: Run the suite to verify the new tests pass**

Run: `pnpm --filter @sevendays/api exec vitest run test/admin-entities.test.ts`
Expected: PASS — the file's existing tests plus the 4 new ones.

- [ ] **Step 9: Full api suite (regression sweep) + fix + commit**

Run: `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api test`
Expected: **27 files passed + 1 skipped / 327 passed + 3 skipped** (323 + 4). The admin-gate/require-session/public-reads suites are untouched by construction (their routes never changed wire shapes).

```bash
git add apps/api/src apps/api/test/admin-entities.test.ts
git commit -m "feat(api): the audit module + requestId in context + rows on the four simple families (#185)"
```

### Task 4: `apps/api` — studio-services CRUD rows + the two matrix full-replaces (TDD)

**Files:**
- Modify (test-first): `apps/api/test/admin-studio-services.test.ts`
- Modify: `apps/api/src/services/admin-entities.ts` (4 functions), `apps/api/src/routes/admin-studio-services.ts` (4 call sites)

**Interfaces:**
- Consumes: Task 3's `AuditActor`/`writeAuditRow` + the second-param convention.
- Produces: `createAdminStudioService(db, audit, input)`, `updateAdminStudioService(db, audit, id, input)`, `setStudioServiceBranchMatrix(db, audit, id, branchIds)`, `setStudioServiceAddonMatrix(db, audit, id, addonServiceIds)` — return types unchanged.

**Not here:** the gallery families (Task 5); the package save (Task 6).

- [ ] **Step 1: Write the failing tests**

In `apps/api/test/admin-studio-services.test.ts`: extend the `@sevendays/db` import to include `auditLog`, and append:

```ts
describe('audit rows (M6 #185 — one per committed mutation, tx-gated)', () => {
  const rows = async () => db.select().from(auditLog);

  it('POST → one create row with the service name; the actor is the caller', async () => {
    const res = await authed('POST', '/api/v1/admin/studio-services', 'audit-svc@sevendays.test', {
      name: 'Audit Service',
      description: 'For the audit row',
      priceCents: 1000,
    });
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      entity: 'studio-service',
      entityId: id,
      action: 'create',
      summary: 'Audit Service',
      actorEmail: 'audit-svc@sevendays.test',
    });
  });

  it('PUT flipping isActive → deactivate; a later same-state PUT (no flip) → update', async () => {
    const created = await authed('POST', '/api/v1/admin/studio-services', 'audit-svc-flip@sevendays.test', {
      name: 'Flip Service',
      description: 'd',
      priceCents: 2000,
    });
    const { id } = (await created.json()) as { id: string };
    const body = { name: 'Flip Service', description: 'd', priceCents: 2000 };
    const off = await authed('PUT', `/api/v1/admin/studio-services/${id}`, 'audit-svc-flip@sevendays.test', {
      ...body,
      isActive: false,
    });
    expect(off.status).toBe(200);
    const stillOff = await authed('PUT', `/api/v1/admin/studio-services/${id}`, 'audit-svc-flip@sevendays.test', {
      ...body,
      description: 'edited while off',
      isActive: false,
    });
    expect(stillOff.status).toBe(200);
    const forSvc = (await rows()).filter((row) => row.entityId === id);
    expect(forSvc.filter((row) => row.action === 'create')).toHaveLength(1);
    expect(forSvc.filter((row) => row.action === 'deactivate')).toHaveLength(1);
    expect(forSvc.filter((row) => row.action === 'update')).toHaveLength(1);
  });

  it('the branch-matrix PUT → ONE update row (request-grain): entityId = the service, summary = its name; an unknown-branch 400 records nothing', async () => {
    const created = await authed('POST', '/api/v1/admin/studio-services', 'audit-matrix@sevendays.test', {
      name: 'Audit Matrix Service',
      description: 'd',
      priceCents: 3000,
    });
    const { id } = (await created.json()) as { id: string };
    const ok = await authed('PUT', `/api/v1/admin/studio-services/${id}/branches`, 'audit-matrix@sevendays.test', {
      branchIds: [ids.branchA],
    });
    expect(ok.status).toBe(200);
    const bad = await authed('PUT', `/api/v1/admin/studio-services/${id}/branches`, 'audit-matrix@sevendays.test', {
      branchIds: ['00000000-0000-4000-8000-0000000000ff'],
    });
    expect(bad.status).toBe(400);
    const matrixRows = (await rows()).filter((row) => row.entityId === id && row.action === 'update');
    expect(matrixRows).toHaveLength(1);
    expect(matrixRows[0]).toMatchObject({ entity: 'studio-service', summary: 'Audit Matrix Service' });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @sevendays/api exec vitest run test/admin-studio-services.test.ts`
Expected: FAIL — zero audit rows on all three new tests.

- [ ] **Step 3: The studio-service CRUD joins the transaction pattern**

In `apps/api/src/services/admin-entities.ts` (the Task 3 imports already carry `AuditActor`/`writeAuditRow`/`AuditAction`):

```ts
export async function createAdminStudioService(
  db: Database,
  audit: AuditActor,
  input: CreateStudioServiceInput
): Promise<AdminCreateResult<StudioServiceWithBranches>> {
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(studioServices).values(input).returning();
      if (!row) throw new Error('insert studio_services: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'studio-service',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
  if (!result.ok) return result;
  const [assembled] = await assembleAdminStudioServices(db, [result.row]);
  if (!assembled) throw new Error('studio service create: assembly lost the row');
  return { ok: true, row: assembled };
}

export async function updateAdminStudioService(
  db: Database,
  audit: AuditActor,
  id: string,
  input: UpdateStudioServiceInput
): Promise<AdminWriteResult<StudioServiceWithBranches>> {
  const [current] = await db
    .select()
    .from(studioServices)
    .where(eq(studioServices.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: studioServices.id })
      .from(studioServices)
      .where(and(eq(studioServices.name, input.name), ne(studioServices.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  const action: AuditAction = current.isActive && input.isActive === false ? 'deactivate' : 'update';
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(studioServices)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(studioServices.id, id))
        .returning();
      if (!row) throw new Error('update studio_services: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'studio-service',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
  if (!result.ok) return result;
  const [assembled] = await assembleAdminStudioServices(db, [result.row]);
  if (!assembled) throw new Error('studio service update: assembly lost the row');
  return { ok: true, row: assembled };
}
```

- [ ] **Step 4: The two matrices — the audit row joins the EXISTING transaction as its last statement**

In `setStudioServiceBranchMatrix`, add the `audit` param and the write at the end of the transaction body (the pre-checks and the `service` row read stay untouched above it):

```ts
export async function setStudioServiceBranchMatrix(
  db: Database,
  audit: AuditActor,
  id: string,
  branchIds: string[]
): Promise<AdminWriteResult<StudioServiceWithBranches>> {
```

```ts
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
    // M6 #185: ONE row per matrix REQUEST (request-grain) — the junction
    // churn is the write; the row records the save, not the row count.
    await writeAuditRow(tx, audit, {
      entity: 'studio-service',
      entityId: id,
      action: 'update',
      summary: service.name,
    });
  });
```

The same two edits land in `setStudioServiceAddonMatrix` — signature `(db: Database, audit: AuditActor, id: string, addonServiceIds: string[])` and the identical trailing write inside its transaction (`service.name` is that function's own pre-read).

- [ ] **Step 5: The route's four call sites**

In `apps/api/src/routes/admin-studio-services.ts`: add `import { auditActor } from '../services/audit.js';` and pass the actor second at all four sites:

```ts
    const result = await createAdminStudioService(c.get('db'), auditActor(c), c.req.valid('json'));
```

```ts
      const result = await updateAdminStudioService(c.get('db'), auditActor(c), id, c.req.valid('json'));
```

```ts
      const result = await setStudioServiceBranchMatrix(c.get('db'), auditActor(c), id, branchIds);
```

```ts
      const result = await setStudioServiceAddonMatrix(c.get('db'), auditActor(c), id, addonServiceIds);
```

- [ ] **Step 6: Run the suite, then the full api sweep + commit**

Run: `pnpm --filter @sevendays/api exec vitest run test/admin-studio-services.test.ts`
Expected: PASS — existing tests + the 3 new ones (the matrix round-trip/unknown-id/deactivation-blind tests keep passing: their assertions query junction tables, not audit rows).

Run: `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api test`
Expected: **27 files passed + 1 skipped / 330 passed + 3 skipped** (327 + 3).

```bash
git add apps/api/src apps/api/test/admin-studio-services.test.ts
git commit -m "feat(api): audit rows on studio-services + the two matrices (#185)"
```

### Task 5: `apps/api` — the gallery families, the three order PUTs, the media-commit row (TDD)

**Files:**
- Modify (test-first): `apps/api/test/admin-gallery.test.ts`
- Modify: `apps/api/src/services/admin-gallery.ts` (9 functions), `apps/api/src/routes/gallery-photos.ts` (3 sites), `apps/api/src/routes/admin-gallery-categories.ts` (3 sites), `apps/api/src/routes/admin-testimonials.ts` (3 sites)

**Interfaces:**
- Consumes: Task 3's `AuditActor`/`writeAuditRow`/`AuditAction`.
- Produces: `createAdminGalleryCategory(db, audit, input)`, `updateAdminGalleryCategory(db, audit, id, input)`, `setGalleryCategoryOrder(db, audit, categoryIds)`, `createAdminTestimonial(db, audit, input)`, `updateAdminTestimonial(db, audit, id, input)` (gains a pre-read of `current` — behavior unchanged, the not_found arm preserved), `setTestimonialOrder(db, audit, testimonialIds)`, `createAdminGalleryPhoto(db, env, audit, input, log?)`, `updateAdminGalleryPhoto(db, env, audit, id, input, log?)`, `setGalleryPhotoOrder(db, env, audit, photoIds)` — return types unchanged.

**Not here:** the package save (Task 6); any change to `commitStagingKey`/`commitUpload` (bucket I/O stays outside transactions — the audit row rides the DB persist that follows it).

- [ ] **Step 1: Write the failing tests**

In `apps/api/test/admin-gallery.test.ts`: extend the `@sevendays/db` import to include `auditLog`, and append:

```ts
describe('audit rows (M6 #185 — one per committed mutation, tx-gated)', () => {
  const rows = async () => db.select().from(auditLog);

  it('category POST → one create row with the name; a duplicate-name 400 records nothing', async () => {
    const res = await authed('POST', '/api/v1/admin/gallery-categories', 'audit-cat@sevendays.test', {
      name: 'Audit Tab',
    });
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };
    const dup = await authed('POST', '/api/v1/admin/gallery-categories', 'audit-cat@sevendays.test', {
      name: 'Weddings', // fixture name — the uniqueness collision
    });
    expect(dup.status).toBe(400);
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      entity: 'gallery-category',
      entityId: id,
      action: 'create',
      summary: 'Audit Tab',
      actorEmail: 'audit-cat@sevendays.test',
    });
  });

  it('the three order PUTs → one reorder row each (entityId null, summary null — the family, not a row); an incomplete payload records nothing', async () => {
    const cats = await authed(
      'PUT',
      '/api/v1/admin/gallery-categories/order',
      'audit-order-c@sevendays.test',
      { categoryIds: [ids.categoryB, ids.categoryRetired, ids.categoryA] }
    );
    const tes = await authed(
      'PUT',
      '/api/v1/admin/testimonials/order',
      'audit-order-t@sevendays.test',
      { testimonialIds: [ids.testimonialB, ids.testimonialRetired, ids.testimonialA] }
    );
    const pho = await authed(
      'PUT',
      '/api/v1/admin/gallery-photos/order',
      'audit-order-p@sevendays.test',
      { photoIds: [ids.photoB, ids.photoRetired, ids.photoA] }
    );
    expect([cats.status, tes.status, pho.status]).toEqual([200, 200, 200]);
    const bad = await authed(
      'PUT',
      '/api/v1/admin/gallery-categories/order',
      'audit-order-bad@sevendays.test',
      { categoryIds: [ids.categoryA] } // missing rows → 400 before any write
    );
    expect(bad.status).toBe(400);
    const all = await rows();
    expect(all.filter((row) => row.action === 'reorder')).toHaveLength(3);
    expect(all.every((row) => row.entityId === null && row.summary === null)).toBe(true);
    expect(new Set(all.map((row) => row.entity))).toEqual(
      new Set(['gallery-category', 'testimonial', 'gallery-photo'])
    );
  });

  it('testimonial PUT flipping isActive → deactivate with summary = person', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/testimonials/${ids.testimonialA}`,
      'audit-te@sevendays.test',
      {
        quote: 'The photos came out better than we hoped.',
        person: 'Maria, batch 2026',
        isActive: false,
      }
    );
    expect(res.status).toBe(200);
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      entity: 'testimonial',
      entityId: ids.testimonialA,
      action: 'deactivate',
      summary: 'Maria, batch 2026',
    });
  });

  it('photo POST with a staged object (the media commit) → one create row; summary = title, or the final key when untitled', async () => {
    const STAGING_TITLED = 'tmp/00000000-0000-4000-8000-0000000000b1.jpg';
    const STAGING_UNTITLED = 'tmp/00000000-0000-4000-8000-0000000000b2.jpg';
    const stub = stubCommitBucket({
      [STAGING_TITLED]: { size: 1024, contentType: 'image/jpeg' },
      [STAGING_UNTITLED]: { size: 1024, contentType: 'image/jpeg' },
    });
    const { token } = await signUpSession(url, 'audit-photo@sevendays.test');
    const post = (body: unknown) =>
      app.request(
        '/api/v1/admin/gallery-photos',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...bearer(token) },
          body: JSON.stringify(body),
        },
        { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
      );
    const titled = await post({ r2Key: STAGING_TITLED, title: 'Titled portrait', caption: null });
    const untitled = await post({ r2Key: STAGING_UNTITLED });
    expect(titled.status).toBe(201);
    expect(untitled.status).toBe(201);
    const untitledId = ((await untitled.json()) as { id: string }).id;
    const [untitledRow] = await db
      .select()
      .from(galleryPhotos)
      .where(eq(galleryPhotos.id, untitledId));
    const all = await rows();
    expect(all).toHaveLength(2);
    expect(all.find((row) => row.summary === 'Titled portrait')).toMatchObject({
      entity: 'gallery-photo',
      action: 'create',
    });
    const untitledAudit = all.find((row) => row.entityId === untitledId);
    expect(untitledAudit?.summary).toBe(untitledRow?.r2Key);
  });

  it('photo PUT with a fresh staging key (replace) → one update row, summary = the new final key (title null)', async () => {
    const STAGING_REPLACE = 'tmp/00000000-0000-4000-8000-0000000000b3.jpg';
    const stub = stubCommitBucket({ [STAGING_REPLACE]: { size: 2048, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'audit-photo-put@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${ids.photoA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          r2Key: STAGING_REPLACE,
          title: null,
          caption: null,
          categoryId: null,
          isActive: true,
        }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(200);
    const [photoRow] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, ids.photoA));
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ entity: 'gallery-photo', entityId: ids.photoA, action: 'update' });
    expect(all[0]?.summary).toBe(photoRow?.r2Key);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @sevendays/api exec vitest run test/admin-gallery.test.ts`
Expected: FAIL — zero audit rows on all five new tests.

- [ ] **Step 3: The gallery services join the pattern**

In `apps/api/src/services/admin-gallery.ts`: add `import type { AuditAction } from '@sevendays/types';` and `import { type AuditActor, writeAuditRow } from './audit.js';`, then make the nine edits.

Categories — create and update (the branches shape with `CATEGORY_UNIQUE`, summary `name`):

```ts
export async function createAdminGalleryCategory(
  db: Database,
  audit: AuditActor,
  input: CreateGalleryCategoryInput
): Promise<AdminCreateResult<CategoryRow>> {
  const position = await nextCategoryPosition(db);
  return guardUnique(CATEGORY_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .insert(galleryCategories)
        .values({ ...input, position })
        .returning();
      if (!row) throw new Error('insert gallery_categories: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'gallery-category',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
}

export async function updateAdminGalleryCategory(
  db: Database,
  audit: AuditActor,
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
  const action: AuditAction = current.isActive && input.isActive === false ? 'deactivate' : 'update';
  return guardUnique(CATEGORY_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(galleryCategories)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(galleryCategories.id, id))
        .returning();
      if (!row) throw new Error('update gallery_categories: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'gallery-category',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
}
```

The three order PUTs — the write lands at the end of the EXISTING transaction (shown for categories; testimonials and photos take the identical trailing write with their own `entity`):

```ts
export async function setGalleryCategoryOrder(
  db: Database,
  audit: AuditActor,
  categoryIds: string[]
  // The order service never returns not_found (it reads first, checks, then
  // writes) — the declared union carries only the invalid arm, so the thin
  // route's `!result.ok` narrows to badRequest without a 404 branch.
): Promise<{ ok: true; row: CategoryRow[] } | AdminWriteFailure> {
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
    // M6 #185: reorder is family-level — entityId AND summary are null
    // (the #183 twin's entityId ruling, carried to the durable record).
    await writeAuditRow(tx, audit, {
      entity: 'gallery-category',
      entityId: null,
      action: 'reorder',
      summary: null,
    });
  });
  return { ok: true, row: await listAdminGalleryCategories(db) };
}
```

(`setTestimonialOrder(db, audit, testimonialIds)` and `setGalleryPhotoOrder(db, env, audit, photoIds)` take the same trailing write with `entity: 'testimonial'` / `entity: 'gallery-photo'` inside their existing loops' transactions.)

Testimonials — create, and update with its new pre-read:

```ts
export async function createAdminTestimonial(
  db: Database,
  audit: AuditActor,
  input: CreateTestimonialInput
): Promise<AdminCreateResult<TestimonialRow>> {
  const position = await nextTestimonialPosition(db);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(testimonials)
      .values({ ...input, position })
      .returning();
    if (!row) throw new Error('insert testimonials: no row returned');
    await writeAuditRow(tx, audit, {
      entity: 'testimonial',
      entityId: row.id,
      action: 'create',
      summary: row.person,
    });
    return { ok: true as const, row };
  });
}

export async function updateAdminTestimonial(
  db: Database,
  audit: AuditActor,
  id: string,
  input: UpdateTestimonialInput
): Promise<AdminWriteResult<TestimonialRow>> {
  // M6 #185: the pre-read joins the other entities' pattern — the
  // deactivate ruling needs the BEFORE state; the not_found arm keeps its
  // current meaning (no row → no write, no audit row).
  const [current] = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const action: AuditAction = current.isActive && input.isActive === false ? 'deactivate' : 'update';
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(testimonials)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(testimonials.id, id))
      .returning();
    if (!row) return { ok: false as const, reason: 'not_found' as const };
    await writeAuditRow(tx, audit, {
      entity: 'testimonial',
      entityId: id,
      action,
      summary: row.person,
    });
    return { ok: true as const, row };
  });
}
```

Photos — create and update (bucket I/O stays BEFORE the transaction; the after-commit old-key delete stays AFTER it):

```ts
export async function createAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  audit: AuditActor,
  input: CreateGalleryPhotoInput,
  log?: RequestLogger
): Promise<AdminCreateResult<GalleryPhoto>> {
  // Category existence FIRST — an invalid payload must not touch the bucket
  // (a commit would promote the object and orphan it on the 400).
  if (input.categoryId !== undefined && input.categoryId !== null) {
    const failure = await assertCategoryExists(db, input.categoryId);
    if (failure) return failure;
  }
  const commit = await commitStagingKey(env, input.r2Key, log);
  if (!commit.ok) return commit;
  const position = await nextPhotoPosition(db);
  return db.transaction(async (tx) => {
    const [row] = await tx
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
    // M6 #185 (the media commit's row): the commit promoted the object
    // before this transaction; THIS row is the durable record of the whole
    // request. Untitled photos fall back to the immutable final key — a
    // stable, join-free identifier.
    await writeAuditRow(tx, audit, {
      entity: 'gallery-photo',
      entityId: row.id,
      action: 'create',
      summary: row.title ?? row.r2Key,
    });
    return { ok: true as const, row: toPhotoRead(env, row) };
  });
}

export async function updateAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  audit: AuditActor,
  id: string,
  input: UpdateGalleryPhotoInput,
  log?: RequestLogger
): Promise<AdminWriteResult<GalleryPhoto>> {
  const [current] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.categoryId !== null) {
    const failure = await assertCategoryExists(db, input.categoryId);
    if (failure) return failure;
  }
  let finalKey: string | null = current.r2Key;
  if (input.r2Key !== undefined) {
    const commit = await commitStagingKey(env, input.r2Key, log);
    if (!commit.ok) return commit;
    finalKey = commit.finalKey;
  }
  const action: AuditAction = current.isActive && input.isActive === false ? 'deactivate' : 'update';
  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
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
    if (!updated) throw new Error('update gallery_photos: no row returned');
    await writeAuditRow(tx, audit, {
      entity: 'gallery-photo',
      entityId: id,
      action,
      summary: updated.title ?? updated.r2Key,
    });
    return updated;
  });
  // Keys are immutable — replace is new key + row update + old-key delete,
  // the old object deleted only AFTER the update (and its audit row) committed.
  if (finalKey !== current.r2Key) {
    await env.MEDIA_BUCKET.delete(current.r2Key);
  }
  return { ok: true, row: toPhotoRead(env, row) };
}
```

Also extend the file-head comment with: ` M6 #185: every persist's transaction ends with its audit row; position reads and bucket I/O stay outside the transactions.`

- [ ] **Step 4: The three route files — nine call sites**

Each file gains `import { auditActor } from '../services/audit.js';` and passes the actor second (after `c.env` for the photo routes):

`apps/api/src/routes/gallery-photos.ts`:

```ts
    const result = await createAdminGalleryPhoto(
      c.get('db'),
      c.env,
      auditActor(c),
      c.req.valid('json'),
      c.get('logger')
    );
```

```ts
    const result = await setGalleryPhotoOrder(c.get('db'), c.env, auditActor(c), photoIds);
```

```ts
      const result = await updateAdminGalleryPhoto(
        c.get('db'),
        c.env,
        auditActor(c),
        id,
        c.req.valid('json'),
        c.get('logger')
      );
```

`apps/api/src/routes/admin-gallery-categories.ts`:

```ts
    const result = await createAdminGalleryCategory(c.get('db'), auditActor(c), c.req.valid('json'));
```

```ts
    const result = await setGalleryCategoryOrder(c.get('db'), auditActor(c), categoryIds);
```

```ts
      const result = await updateAdminGalleryCategory(c.get('db'), auditActor(c), id, c.req.valid('json'));
```

`apps/api/src/routes/admin-testimonials.ts`:

```ts
    const result = await createAdminTestimonial(c.get('db'), auditActor(c), c.req.valid('json'));
```

```ts
    const result = await setTestimonialOrder(c.get('db'), auditActor(c), testimonialIds);
```

```ts
      const result = await updateAdminTestimonial(c.get('db'), auditActor(c), id, c.req.valid('json'));
```

- [ ] **Step 5: Run the suite, then the full api sweep + commit**

Run: `pnpm --filter @sevendays/api exec vitest run test/admin-gallery.test.ts`
Expected: PASS — existing tests + the 5 new ones (the photo POST/PUT/order tests' existing assertions query `galleryPhotos`, unaffected by audit rows; the truncate between tests wipes them).

Run: `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api test`
Expected: **27 files passed + 1 skipped / 335 passed + 3 skipped** (330 + 5).

```bash
git add apps/api/src apps/api/test/admin-gallery.test.ts
git commit -m "feat(api): audit rows on the gallery families + the three order PUTs + the media commit (#185)"
```

### Task 6: `apps/api` — the atomic package save's audit row (TDD)

**Files:**
- Modify (test-first): `apps/api/test/admin-packages.test.ts`
- Modify: `apps/api/src/services/admin-packages.ts`, `apps/api/src/routes/admin-service-packages.ts` (2 call sites)

**Interfaces:**
- Consumes: Task 3's `AuditActor`/`writeAuditRow`/`AuditAction`.
- Produces: `createAdminPackage(db, env, audit, input, log?)`, `updateAdminPackage(db, env, audit, id, input, log?)` — return types unchanged; `runPackageSave`'s private `args` gains `audit: AuditActor`.

**Not here:** any read path; `resolveCover`/bucket hygiene (the after-commit old-cover delete stays outside the transaction, after the audit row commits).

- [ ] **Step 1: Write the failing tests**

In `apps/api/test/admin-packages.test.ts`: extend the `@sevendays/db` import to include `auditLog`, and append:

```ts
describe('audit rows (M6 #185 — one per committed mutation, tx-gated)', () => {
  const rows = async () => db.select().from(auditLog);

  it('the atomic save POST → exactly ONE row (request-grain — frames, inclusions, junctions are one committed request); requestId = the served X-Request-Id', async () => {
    const { token } = await signUpSession(url, 'audit-pkg@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/service-packages',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify(save()),
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: string };
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      entity: 'service-package',
      entityId: created.id,
      action: 'create',
      summary: 'Deluxe Package',
      actorEmail: 'audit-pkg@sevendays.test',
    });
    expect(all[0]?.requestId).toBe(res.headers.get('x-request-id'));
  });

  it('PUT → one update row; a PUT flipping isActive → one deactivate row', async () => {
    const edited = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'audit-pkg-put@sevendays.test',
      put({ name: 'Simple Package Renamed', slug: 'simple-package' })
    );
    expect(edited.status).toBe(200);
    const off = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'audit-pkg-put@sevendays.test',
      put({ name: 'Simple Package Off', slug: 'simple-package', isActive: false })
    );
    expect(off.status).toBe(200);
    const forPkg = (await rows()).filter((row) => row.entityId === ids.packageSimple);
    expect(forPkg.filter((row) => row.action === 'update')).toHaveLength(1);
    expect(forPkg.filter((row) => row.action === 'deactivate')).toHaveLength(1);
    expect(forPkg.every((row) => row.entity === 'service-package')).toBe(true);
  });

  it('a mid-transaction failure (unknown printSizeId) → NO audit row and the whole save rolled back', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      'audit-pkg-rollback@sevendays.test',
      put({
        name: 'Combined Package Renamed',
        slug: 'combined-package',
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
    expect(await rows()).toEqual([]);
    const name = await db
      .select({ name: servicePackages.name })
      .from(servicePackages)
      .where(eq(servicePackages.id, ids.packageCombined));
    expect(name[0]?.name).toBe('Combined Package'); // the rename rolled back — and nothing recorded it
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @sevendays/api exec vitest run test/admin-packages.test.ts`
Expected: FAIL — zero audit rows on all three new tests.

- [ ] **Step 3: Thread the actor through the save and write the row as the transaction's last statement**

In `apps/api/src/services/admin-packages.ts`: add `import type { AuditAction } from '@sevendays/types';` and `import { type AuditActor, writeAuditRow } from './audit.js';`, then make four edits.

(1) `runPackageSave`'s `args` type and the BEFORE-state capture:

```ts
async function runPackageSave(
  db: Database,
  env: SaveEnv,
  args: {
    audit: AuditActor;
    input: CreateServicePackageInput | UpdateServicePackageInput;
    slug: string;
    finalKey: string | null | undefined;
    updateId: string | null;
  }
): Promise<AdminWriteResult<ServicePackageRead>> {
  let packageId = args.updateId ?? '';
  let oldCoverKey: string | null = null;
  let wasActive = true; // M6 #185: the BEFORE state the deactivate ruling reads
```

(2) inside the update branch, beside the existing `oldCoverKey = current.coverImageKey;` line:

```ts
          oldCoverKey = current.coverImageKey;
          wasActive = current.isActive;
```

(3) the transaction's tail — replace the closing of the junction insert and the `return` with:

```ts
        if (junctionPairs.length > 0) {
          await tx.insert(packageInclusionAttires).values(junctionPairs);
        }
        // M6 #185: the atomic save is ONE committed request — entity row,
        // children, and this audit row commit together or not at all (an
        // AdminSaveError above has already rolled everything back, row
        // included — the mid-tx test's gate).
        const action: AuditAction =
          args.updateId === null
            ? 'create'
            : wasActive && args.input.isActive === false
              ? 'deactivate'
              : 'update';
        await writeAuditRow(tx, args.audit, {
          entity: 'service-package',
          entityId: packageId,
          action,
          summary: args.input.name,
        });
        return { ok: true };
```

(4) the two exported entry points gain the actor (second after `env`) and pass it through:

```ts
export async function createAdminPackage(
  db: Database,
  env: SaveEnv,
  audit: AuditActor,
  input: CreateServicePackageInput,
  log?: RequestLogger
): Promise<AdminCreateResult<ServicePackageRead>> {
  const cover = await resolveCover(env, input.coverImageKey, log);
  if (!cover.ok) return cover;
  const slug = slugifyName(input.name);
  const result = await runPackageSave(db, env, {
    audit,
    input,
    slug,
    finalKey: cover.finalKey,
    updateId: null,
  });
```

```ts
export async function updateAdminPackage(
  db: Database,
  env: SaveEnv,
  audit: AuditActor,
  id: string,
  input: UpdateServicePackageInput,
  log?: RequestLogger
): Promise<AdminWriteResult<ServicePackageRead>> {
```

with `runPackageSave(db, env, { audit, input, slug: input.slug, finalKey: cover.finalKey, updateId: id })` as its call (the function bodies are otherwise untouched).

Also extend the file-head comment with: ` M6 #185: the save's transaction now ends with its audit row — one per REQUEST (the spec's request-grain ruling).`

- [ ] **Step 4: The route's two call sites**

In `apps/api/src/routes/admin-service-packages.ts`: add `import { auditActor } from '../services/audit.js';` and pass the actor second after `c.env`:

```ts
    const result = await createAdminPackage(
      c.get('db'),
      c.env,
      auditActor(c),
      c.req.valid('json'),
      c.get('logger')
    );
```

```ts
      const result = await updateAdminPackage(
        c.get('db'),
        c.env,
        auditActor(c),
        id,
        c.req.valid('json'),
        c.get('logger')
      );
```

- [ ] **Step 5: Run the suite, then the full api sweep + commit**

Run: `pnpm --filter @sevendays/api exec vitest run test/admin-packages.test.ts`
Expected: PASS — existing tests (incl. the original rollback and no-partial-junctions tests, which keep proving the write-side semantics) + the 3 new ones.

Run: `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api test`
Expected: **27 files passed + 1 skipped / 338 passed + 3 skipped** (335 + 3 — the ticket's final api floor).

```bash
git add apps/api/src apps/api/test/admin-packages.test.ts
git commit -m "feat(api): audit rows on the atomic package save — request-grain, rollback-gated (#185)"
```

### Task 7: Gates, docs rotation, PR/merge, the v1 pick, ledger, issue close

**Files:**
- Modify: `docs/plan.md` (M6 box 4 — ANNOTATED, not ticked), `docs/progress.md`, `AGENTS.md` (floors line + status bullet), `docs/agents/v1-picks.md` (ledger row, post-merge)

**Interfaces:**
- Consumes: Tasks 1–6 merged on the branch.
- Produces: main carrying the Audit Log's write side; the v1 pick executed + ledgered; issue #185 closed (which unblocks #188).

**Not here:** the viewer screen and its checkbox tick (#188); anything in M6 boxes 5–11.

- [ ] **Step 1: Full repo gates**

Run: `docker compose up -d db`, then `pnpm check` then `pnpm build`.
Expected: check 35/35 turbo tasks; build green. The api floor line: **27 files passed + 1 skipped / 338 passed + 3 skipped**; types **14 files / 116 tests**; api-client **5 files / 33 tests**, landing **9 files / 73 tests**, admin **7 files / 59 tests**, db unchanged — all untouched by this ticket. If any count differs, reconcile before proceeding — do not loosen assertions.

- [ ] **Step 2: Rotate the docs**

(a) `docs/plan.md`, Milestone 6 block — box 4 is **SHARED with #188** (its text names the screen): it stays `- [ ]` and gains a partial-landing annotation. Change

```markdown
- [ ] The mutation **Audit Log** — schema-based, written in the mutation's transaction (the nine entity routers + media commit, request-grain, lean fields), with the owner-scoped Audit Log screen in the admin
```

to

```markdown
- [ ] The mutation **Audit Log** — schema-based, written in the mutation's transaction (the nine entity routers + media commit, request-grain, lean fields), with the owner-scoped Audit Log screen in the admin _(write side landed 2026-10-06 via #185 — the `audit_log` table (migration 0008) + transactional rows across the nine routers and the media commit, request-grain, requestId-correlated to the Application Log, +15 api tests +4 types tests; the box stays unticked until the owner screen lands at #188)_
```

(b) `docs/progress.md` — three edits. First, the dated entry at the very top (after the `# Progress` heading's blank line):

```markdown
2026-10-06 — #185, M6 ticket 03, the Audit Log's write side, landed: the durable who/what/when of every committed CMS write — a schema-born `audit_log` table (migration 0008, one `occurred_at` index, no FKs by design, unbounded retention) whose rows are written INSIDE the mutation's own transaction, one row per committed mutation REQUEST (the two matrix full-replaces and the atomic package save are each one row), across the nine entity routers plus the media commit (the commit rides the gallery-photo/package persists — its row IS the entity row, the #183 twin's resolution carried to the durable record). Fields per the spec: `occurredAt`, `actorId`, `actorEmail` snapshotted at write, `entity`, `entityId` (null on the family-level order PUTs), `action` (create | update | deactivate | reorder — deactivate only on the true→false flip), `summary` (name/code/person; photos fall back to the immutable final key; null on reorders), `requestId` equal to the served `X-Request-Id` and the Application Log's lines by construction (`requestLogging` now `c.set`s the id; RootEnv/ApiEnv carry it). The simple families' writes gained the transaction wrap (they were single autocommit statements); the transactional seams (matrices, order PUTs, package save) took the row as their body's last statement. Failed validations record nothing (they resolve before any tx opens); mid-transaction failures roll the row back with the write (the AdminSaveError path, test-pinned). The vocabulary is canonical in `packages/types` (`auditActionSchema`/`auditEntitySchema`/`auditLogRowSchema`; `AdminMutationEntity` is now an alias of `AuditEntity`). Gates: api 27 files + 1 skipped / 338 passed + 3 skipped (+15: entities 4, studio 3, gallery 5, packages 3), types 13→14 files / 112→116, `pnpm check` 35/35, `pnpm build` 7/7. NOT landed: any read path — the owner-scoped viewer screen (filters by entity/actor/action/date, pagination, the nav entry) is #188's, which this close unblocks.
```

Second, in the Known Gaps list, update the Application Log bullet's tail: replace `Sentry (#184) and the Audit Log (#185) ride next off the same seams.` with `The Audit Log's write side followed (M6 #185); its viewer is #188's.` and add this bullet directly below it:

```markdown
- The api's **Audit Log write side** is live (M6 #185, 2026-10-06): one `audit_log` row per committed admin mutation REQUEST — written inside the mutation's own transaction (create/update/deactivate/reorder; the actor email snapshotted; `requestId` correlated to the Application Log and the served `X-Request-Id`) across the nine entity routers plus the media commit; failed validations and mid-transaction failures record nothing. The owner-scoped viewer screen (filters, pagination, nav entry) is #188's; **no read path exists yet**.
```

Third, in "Immediate Next Steps" item 1, replace `then #184/#185 (now unblocked off #183), #187 off #186, #188 off #185,` with `then #187 off #186, #188 (now unblocked off #185 — the write side landed 2026-10-06),` (and if the sentence still lists #184/#185 as takeable frontier members, drop them — both landed).

(c) `AGENTS.md` — two edits. In the "Current status of `pnpm test`" section, change `Floors: api 27 files passed + 1 skipped (28) / 323 passed + 3 skipped; api-client 5 files / 33 tests.` to `Floors: api 27 files passed + 1 skipped (28) / 338 passed + 3 skipped; api-client 5 files / 33 tests.` And append this sentence to the end of the "The DB is provisioned, the catalog is seeded, and auth is wired in." bullet (after the Sentry sentence): ` The Audit Log's write side is live (M6 #185): one audit_log row per committed admin mutation request, written inside the mutation's transaction (create/update/deactivate/reorder, the actor email snapshotted at write, requestId correlated to the Application Log) across the nine entity routers plus the media commit — failed validations and rolled-back transactions record nothing; the owner viewer screen is #188's.`

- [ ] **Step 3: graphify + commit**

Run: `graphify update .` then commit:

```bash
git add docs/plan.md docs/progress.md AGENTS.md graphify-out
git commit -m "docs: #185 — M6 box 4 annotated (the screen rides #188), progress + AGENTS rotation (#185)"
```

- [ ] **Step 4: PR, review, squash-merge**

```bash
git push -u origin feat/185-audit-log-write-side
gh pr create --base main --title "feat(api): the Audit Log's write side — the transactional record (#185)" --body-file - <<'EOF'
## What

Implements #185 (M6 ticket 03) — § The Audit Log of the M6 spec (#182): the durable who/what/when of every committed CMS write.

- The `audit_log` table (generated migration 0008; one occurred_at index; no FKs by design; unbounded retention) + the vocabulary canonicalized in `packages/types` (action/entity enums + the row schema; `AdminMutationEntity` is now an alias).
- One row per committed mutation REQUEST, written INSIDE the mutation's own transaction as its last statement — across the nine entity routers plus the media commit (the commit rides the gallery-photo/package persists; its row is the entity row). The simple families' writes gained the transaction wrap; the matrices, order PUTs, and the atomic package save took the row into their existing transactions.
- Fields per the spec: occurredAt, actorId, actorEmail (snapshotted), entity, entityId (null on reorders), action (create|update|deactivate|reorder — deactivate only on the true→false flip), summary (name/code/person; photos fall back to the final key), requestId — structurally equal to the served X-Request-Id and the Application Log's admin_mutation lines (requestLogging now sets the id into context).
- Failed validations record nothing (they resolve before any tx opens); mid-transaction failures roll the row back with the write (the AdminSaveError path, test-pinned).
- No route, wire shape, or response changed anywhere. api 27 files + 1 skipped / 323→338 passed + 3 skipped (+15); types 13→14 files / 112→116 tests (+4); pnpm check 35/35, build green.

The owner-scoped viewer screen is #188 (now unblocked). The M6 roadmap box stays unticked until it lands.
EOF
```

After CI green on the PR (the repo's check workflow), squash-merge via the GitHub UI or `gh pr merge --squash --delete-branch`. The squash commit title: `feat(api): the Audit Log's write side — the transactional record (#185) (#PR_NUMBER)`.

- [ ] **Step 5: The v1 pick (per `docs/agents/v1-picks.md`)**

Classification (pre-ruled by the spec's v1-pick ledger: "Audit Log (table + transactional writes + owner screen) | **PICK clean** — the client's operating record from day 1; both editions by construction"; this ticket lands the table + writes, all booking-free):
- **PICK clean** — every code path: `packages/db/src/schema/audit-log.ts` + `schema/index.ts` + migration 0008 (carried WITHOUT re-migrate — the #118 precedent: editions share the live DB, already migrated from main), `packages/types/src/audit.ts` + `audit.test.ts` + `index.ts`, all `apps/api` src edits (observability plumbing, audit module, services, routes), and all four extended api test files + the truncate pin (admin routes are session-gated on both editions; nothing touches appointments/resend).
- **Main-only, dropped** — `docs/plan.md`, `docs/progress.md`, `AGENTS.md` (content-dropped — v1's client-safe rewrite carries neither edited sentence, the #145/#146 ruling recurring), the plan file, and `graphify-out`.

Follow the runbook's pick procedure (branch off v1, apply the clean paths, drop the main-only list, run the locks: frozen install + `pnpm build:packages && pnpm --filter @sevendays/api build` + `pnpm check` 35/35 + `pnpm build` + the audit), push v1, confirm the CI run's `check` + `Deploy v1 (private)` legs succeed with `Deploy teaser (main)` skipped. Note in the pick evidence: v1's api floor becomes **25 files + 1 skipped / 272 passed + 3 skipped** expected (257 + the 15 audit tests — all booking-free); reconcile against v1's actual suite before recording.

- [ ] **Step 6: Ledger + issue close**

Append one row to `docs/agents/v1-picks.md`'s ledger table (the established format) with the actual SHAs: date 2026-10-06, issue #185, main squash SHA, class per the runbook's vocabulary (expected `split` mechanically — the PICK-clean code core plus the docs-class main-only drops; the spec's pre-ruling stays PICK clean and the row says so), v1 pick SHA, and the description naming: the audit_log table + migration 0008 + the types vocabulary + the transactional rows across the nine routers and the media commit + the requestId context plumbing; the classifier counts (v1-paths vs main-only); the locks' results; the CI run numbers. Commit the ledger row to main:

```bash
git checkout main && git pull && git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #185 ledger row — the Audit Log write side picked clean (#185)"
git push
```

Then close the issue:

```bash
gh issue close 185 --comment "Landed via #<PR_NUMBER> (main) + the v1 pick <v1_SHA>. api 27 files / 338 passed + 3 skipped on main (types 14/116); pnpm check 35/35 + pnpm build green. The M6 roadmap box stays unticked until #188 (the owner viewer screen — now unblocked; it reads the rows this ticket writes)."
```
