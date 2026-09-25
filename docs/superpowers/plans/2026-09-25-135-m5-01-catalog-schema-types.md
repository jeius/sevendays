# M5 Ticket 01 — Catalog Schema + Shared Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The catalog's data model grows to its CMS shape — three new tables (`gallery_categories`, `gallery_photos`, `testimonials`), the deactivation columns (`is_active` on branches/print sizes/attires), the ordering columns (`position` on package inclusions + the attire junction, backfilled from today's render order via generated migrations only) — and `packages/types` gains the full write-model vocabulary (create/update schemas for all nine entities, the matrix payloads, the collection-order payloads, admin + public read shapes with the ADR-0019 wire rename: reads carry resolved absolute `coverImageUrl`/`photoUrl`, never raw R2 keys), proven by new schema-contract tests in the api suite.

**Architecture:** Seven tasks: (1) schema files + generated migration 0006 applied to the live Supabase DB, (2) the shared `catalog-rows` builders learn positions (seed + api fixtures both route through them — one edit site), (3) a one-off backfill script against live + generated migration 0007 dropping the backfill default, (4) types: the new-entity vocabulary (gallery, testimonials, lookup `is_active`, matrix payloads), (5) types: the atomic package-save payload + the canonical package read shape, (6) the api schema-contract suite, (7) full gates + docs rotation + PR/merge + the v1 pick + ledger row + issue close. Every migration is generated via `db:generate` (house rule — never hand-edited); the populated-table position backfill uses the **born-NOT-NULL-with-DEFAULT** variant, not the nullable→flip variant, because the api global-setup has **no teardown** (leftover compose rows persist between runs and would break a `SET NOT NULL` flip — see Global Constraints).

**Tech Stack:** drizzle-orm `0.45.2` + drizzle-kit `0.31.10` (lockfile-resolved), postgres.js (raw, for the one-off backfill script — the `db-state.mjs` precedent), zod `4.5.1`, vitest 4, pnpm + Turborepo, `gh` CLI, live Supabase via `DATABASE_MIGRATE_URL`.

**Spec:** Implements ticket [#135 "M5 ticket 01 — Catalog schema + shared types"](https://github.com/jeius/sevendays/issues/135) (label `ready-for-agent`), whose parent is the M5 spec `docs/specs/2026-09-24-m5-admin-cms-spec.md` (issue #134 — § Schema and migrations, § Mutation shapes, § Ordering and bulk operations, § The media pipeline, and § Read assembly and public reads are this ticket's sections). Key recon facts (2026-09-25, main `bcc95ef`, tree clean):

- **The migration inventory is the spec's § Schema and migrations verbatim:** new tables `gallery_categories` (id, `name` unique, `position`, `is_active`, timestamps), `gallery_photos` (id, `r2_key` unique, nullable `title`/`caption`, **nullable** `category_id` FK — uncategorized photos are staff-only, `position`, `is_active`, timestamps), `testimonials` (id, `quote`, `person`, `position`, `is_active`, timestamps); new columns `branches.is_active`, `print_sizes.is_active`, `attires.is_active` (backfill: active — the column lands `DEFAULT true NOT NULL`, so the backfill is the default itself), `package_inclusions.position`, `package_inclusion_attires.position` (backfill: today's order — script). `service_packages`/`studio_services`/`addon_services` already carry `is_active`; `service_packages.coverImageKey` already exists (migration 0000).
- **Why the backfill is default-variant, not nullable→flip (binding):** `apps/api/test/global-setup.ts` migrates the compose DB **before** its clean-slate truncate and has an explicit "no teardown" comment — rows from the previous run persist with `position = NULL` the moment migration 0006 adds a nullable column, and a `SET NOT NULL` 0007 would then fail the whole api suite. With `ADD COLUMN "position" integer DEFAULT 1 NOT NULL` (the exact pattern migration 0002 used for `is_featured`: `ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL`), leftover rows get 1, nothing can violate NOT NULL, and migration 0007 (generated after removing `.default(1)` from the schema) is `ALTER COLUMN "position" DROP DEFAULT` — valid on any data. The backfill script then rewrites the 1s into monotonic order. The end-state schema is `position: integer(…).notNull()` with no default — a forgetful insert fails loudly instead of silently tying everything at 1.
- **Today's render order (the backfill's ordering keys, read off `apps/api/src/services/service-packages.ts`):** inclusions are read `orderBy(asc(packageInclusions.id))` (lines 89/151) — so the inclusion backfill is `row_number() OVER (PARTITION BY service_package_id ORDER BY id)`; junctions are read `orderBy(asc(createdAt), asc(id))` (lines 110/171) — so the junction backfill is `row_number() OVER (PARTITION BY inclusion_id ORDER BY created_at, id)`. This is what the ticket's "positions monotonic from today's id/`created_at` order" names: id order for inclusions, created_at(+id) for junctions. Positions are **1-based** (the `frameNumber` min-1 precedent; the spec is silent and this plan rules it).
- **Every producer of the two position tables routes through one module:** `buildInclusionRowValues` + `buildJunctionPairs` in `packages/db/src/catalog-rows.ts` are used by both `packages/db/scripts/seed.ts` and `apps/api/test/helpers/fixtures.ts` (verified by sweep — no other insert site exists; `rehearsal-fixture.mjs` inserts none). Teaching the builders positions fixes both adapters with zero call-site edits; the only hand-built insert (`privilegeRow` in fixtures) also flows through the builder's values array.
- **The wire rename's forced payload shape (ADR-0019 ruling 3: "Every read resolves absolute URLs …; raw keys never leave the API"):** reads never echo keys, so the editor cannot send the current final key back — full-object echo is impossible by design. Therefore the media-key fields on payloads are **presence-encoded**: `coverImageKey` on the package create = optional staging key (absent = no cover); on the package update = `string | null | absent` (string = bind/replace via fresh staging key, null = clear, absent = unchanged); `r2Key` on the gallery-photo create = required staging key (the spec-pinned `{ r2Key, title?, caption?, categoryId? }`); on the photo update = optional (present = replace through a fresh staging key — keys are immutable, replace is new-key + row-update + old-key-delete). Entity fields stay full-object (null clears, never "leave alone").
- **The atomic package save's frame identity is a client-assigned string TOKEN:** the spec pins `frames[]` + `inclusions[]` as parallel arrays with "frameNumber = frames array order (renumbered)" server-side, and the #131 prototype's editor state used exactly this shape (frames `[{ id: 'fr-basic-1', frameNumber: 1 }]`, inclusions referencing `frameId: 'fr-basic-1'`). The payload schema takes `frames: [{ id: <string> }]` — existing frames echo their uuid from the read (`resolvedFrameSchema.id`), new frames mint fresh tokens; `packageSaveInclusionSchema.frameId` references a token (validated by a package-level `superRefine`: framed_picture ⇒ token present + known; other kinds ⇒ no frameId; tokens unique). The server rewrites real frame rows in #137.
- **Sibling fences (spec § Tickets; `docs/plan.md` M5 block):** #136 owns the bucket/bindings/secrets and every `MEDIA_*` env var — #135 adds **no env var** and resolves no URLs (it only *types* them: `z.url()`); #137 owns every route/service + slug generation + the presign/commit seam; #138 owns the read-assembly swap (ordering by `(position, id)`, active-only branches, trim rules) and is the ticket that points the public routes at the new read shape; #139–#142 own all UI; #143 owns the milestone-close docs rotation + seed-contract runbook note. The EXISTING `servicePackageSchema`/`servicePackageWithInclusionsSchema` keep `coverImageKey` untouched in this ticket — changing them now would break live api-client parsing (ADR-0006: the client Zod-parses every response, and URL resolution can't run before #136/#137 wire `MEDIA_PUBLIC_BASE_URL`); #138 retires that field when it swaps the assembly. Two sentences of now-stale comment in `services/service-packages.ts` get a minimal honesty edit (pinned verbatim in Task 1) — the queries themselves are #138's.
- **This ticket owns `docs/plan.md` M5 checkbox 2 exclusively** ("Schema + migrations: … `packages/types` Zod schemas with the `coverImageUrl`/`photoUrl` wire rename") — no sibling shares it; tick it with a dated annotation in Task 7. Checkboxes 1 (media) and 3 (write model) belong to #136/#137 and stay unticked.
- **v1 posture (spec § v1-pick posture):** "Expected clean PICKs: the schema/migration additions, `packages/types` additions" — every code path in this ticket is booking-free (the audit-v1-absence token set is untouched by schema/types work). The pick runs post-merge (Task 7) per `docs/agents/v1-picks.md`; migrations are carried WITHOUT re-migrate (the #118 precedent: editions share the live DB, already migrated from main). Docs/plan/progress/superpowers-plan/graphify-out are main-only and drop at pick time.
- **Baselines (live, 2026-09-25, main `bcc95ef`, compose db up):** `packages/types` = **10 files / 70 tests passed**; `packages/db` = **2 files passed + 2 skipped / 20 tests passed + 8 skipped** (the skipped are `TEST_DATABASE_URL`-gated `describe.runIf` blocks — same shape after this ticket); `apps/api` = **13 files / 103 tests passed** over the compose DB; `pnpm check` = 35/35 turbo tasks (no scripts added — count unchanged). After this ticket: types = **12 files / 105 tests**, db = **22 passed | 8 skipped**, api = **14 files / 121 tests**, check still 35/35. If any gate count differs, reconcile before proceeding — do not loosen assertions.
- **No clarify call needed:** the spec's four deferred owner strings are UI-ticket copy (#139/#140), not schema/types vocabulary; the only open convention (position base) is ruled above from the `frameNumber` precedent.

## Global Constraints

- **Branch & baseline:** `feat/135-catalog-schema-types` off main `bcc95ef` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#135)` squash style; every commit below is pinned verbatim. Evidence lands in gitignored `.superpowers/sdd/2026-09-25-135-catalog-schema-types/`.
- **Gates (repo AGENTS.md, verbatim duties):** do not commit code that fails `pnpm check` (lint + format + typecheck + test; expected 35/35 turbo tasks — no scripts are added). Integration tests need the compose db up: `docker compose up -d db` first. After any fresh clone, `pnpm build:packages` must precede `pnpm check`; after editing `packages/db` or `packages/types` mid-ticket, rebuild (`pnpm build:packages`) before running api tests — the api suite and api-client resolve `@sevendays/db`/`@sevendays/types` from built `dist/`. Tick checklist boxes with `- [✅]`, never `[x]`. Run `graphify update .` at close (code was modified). Checklist-tick emoji rule applies to `docs/plan.md` and this plan file alike.
- **Live-DB gate (binding):** every `db:migrate`/backfill run against live Supabase requires `DATABASE_MIGRATE_URL` (session-mode pooler, port 5432) in gitignored `packages/db/.env`. Verify first with `node packages/db/scripts/check-env.mjs` (expect `GATE: PASS`); never paste a connection string into chat, a commit, the PR body, or the evidence dir.
- **Migration discipline (house rule, binding):** migrations are generated via `pnpm --filter @sevendays/db db:generate` and NEVER hand-edited in `packages/db/migrations`. Drizzle-kit names files itself (`0006_<slug>.sql` — record the actual name in the commit body and Task 7's progress note). After each generate, read the emitted SQL against the statement shapes pinned in the task: if drizzle emits something materially different (a table rewrite, a different constraint form), STOP and report — do not edit the file to match the plan.
- **Position conventions (plan rulings; spec silent):** 1-based everywhere. Builder/backfill/write-model positions: inclusion `position` = array/entry order within its package (1..N); junction `position` = attire order within its inclusion, restarting at 1 per inclusion. Backfill keys are today's read keys (inclusions by `id`; junctions by `(created_at, id)` — recon-pinned above). Public gallery/testimonial payloads carry no position fields (array order is the render order); admin read shapes carry them.
- **Wire rename (ADR-0019, binding):** the shapes this ticket ships never expose a raw R2 key on a read — `coverImageUrl` (package read) and `photoUrl` (gallery-photo read) are `z.url()` fields (absolute, resolved at read time against `MEDIA_PUBLIC_BASE_URL` — #136/#137's wiring). Keys appear ONLY on inputs: `coverImageKey` (package create/update) and `r2Key` (gallery-photo create/update) as presence-encoded staging-key fields per the header ruling. `zod` `4.5.1` was probed live 2026-09-25: `typeof z.url === 'function'`, it accepts `'https://pub-0000.r2.dev/gallery/00000000-0000-4000-8000-000000000000.jpg'`, rejects `'gallery/1.jpg'`.
- **The existing-shape fence (binding):** `servicePackageSchema`, `servicePackageWithInclusionsSchema`, `resolvedInclusionSchema`, `resolvedPrintSizeSchema`, `resolvedAttireSchema`, `resolvedFrameSchema`, and `studioServiceWithBranchesSchema` are NOT reshaped in this ticket beyond adding `isActive` to the branch/print-size/attire row schemas (where `db.select()` already returns the column once 0006 applies, so every current parse keeps succeeding — default `true` keeps pre-column fixtures parsing). `servicePackageSchema.coverImageKey` stays until #138's swap. `createFrameSchema`/`CreateFrameInput` (frames.ts) and `createPackageInclusionSchema`/`CreatePackageInclusionInput` (inclusion.ts) are DEAD vocabulary replaced by the save payload — they are deleted in Task 5 (verified by sweep: no consumer outside `packages/types` tests and stale `dist/`).
- **Version pins:** `zod` `4.5.1` (probed), `drizzle-orm` resolves `0.45.2`, `drizzle-kit` resolves `0.31.10` from `packages/db/package.json` ranges (verify with `pnpm --filter @sevendays/db list drizzle-orm drizzle-kit --depth 0` before Task 1; anything else resolves → STOP and report). No new dependencies anywhere in this ticket.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; `pnpm --filter @sevendays/<pkg> fix` (biome check --write) then normalizes quoting/ordering/import order to house style — accept its rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–6 edit only: `packages/db/src/schema/gallery-categories.ts` (create), `gallery-photos.ts` (create), `testimonials.ts` (create), `schema/branches.ts`, `schema/print-sizes.ts`, `schema/attires.ts`, `schema/package-inclusions.ts`, `schema/package-inclusion-attires.ts`, `schema/index.ts`, `schema/relations.ts`, `packages/db/migrations/0006_*` + `0007_*` (generated), `packages/db/src/catalog-rows.ts`, `packages/db/src/catalog-rows.test.ts`, `packages/db/scripts/backfill-positions.mjs` (create), `apps/api/test/helpers/truncate.test.ts`, `apps/api/test/helpers/fixtures.ts` (comment-only), `apps/api/src/services/service-packages.ts` (comment-only), `packages/types/src/gallery.ts` (create), `testimonial.ts` (create), `gallery.test.ts` (create), `testimonial.test.ts` (create), `branch.ts`, `print-size.ts`, `attire.ts`, `addon-service.ts`, `studio-service.ts`, `package.ts`, `inclusion.ts`, `frames.ts`, `index.ts`, `attire.test.ts`, `print-size.test.ts`, `studio-service.test.ts`, `package.test.ts`, `inclusion.test.ts`, `frames.test.ts`, `apps/api/test/cms-schema-contracts.test.ts` (create). Task 7 rotates `docs/plan.md` (M5 checkbox 2), `docs/progress.md`, `AGENTS.md` (the migrations `0000–0005` count line only), and `docs/agents/v1-picks.md` (ledger row, post-merge). NOT here: any Hono route or service module beyond the pinned comment edits (#137); any env var, binding, or bucket work (#136); the read-assembly ordering/trim/active-only changes (#138); any admin/landing UI (#139–#142); the seed's contract or data (#143); owner-copy strings (#139/#140's `TODO(owner-copy)` items); appointment/slot work (v2); the appointments table (untouched).

---

### Task 1: Schema files — new tables, lookup `is_active`, position columns; generated migration 0006; live apply

**Files:**
- Create: `packages/db/src/schema/gallery-categories.ts`, `packages/db/src/schema/gallery-photos.ts`, `packages/db/src/schema/testimonials.ts`
- Modify: `packages/db/src/schema/branches.ts`, `print-sizes.ts`, `attires.ts`, `package-inclusions.ts`, `package-inclusion-attires.ts`, `index.ts`, `relations.ts`
- Modify (test-first): `apps/api/test/helpers/truncate.test.ts`
- Modify (comment-only honesty edit): `apps/api/src/services/service-packages.ts`
- Generated: `packages/db/migrations/0006_*.sql` + `meta/_journal.json`

**Interfaces:**
- Consumes: the existing schema-barrel export pattern (`schema/index.ts` star-exports; `truncate.ts` derives its table list from the barrel — nothing hand-listed there).
- Produces (what Tasks 2–7 + tickets #136–#142 rely on): exported drizzle tables `galleryCategories`, `galleryPhotos`, `testimonials` (columns exactly per the spec inventory; `galleryPhotos.categoryId` nullable FK → `galleryCategories.id`, `r2Key` unique, FK-lookup index on `categoryId`); `branches`/`printSizes`/`attires` gain `isActive: boolean('is_active').notNull().default(true)`; `packageInclusions`/`packageInclusionAttires` gain `position: integer('position').notNull().default(1)` (the default is dropped in Task 3); relations `galleryCategoriesRelations` (many `photos`) + `galleryPhotosRelations` (one `category`); migration 0006 applied to live Supabase.

**Not here:** the position backfill or the default drop (Task 3 — 0006 alone leaves live rows at position 1, which is legal and invisible until reads switch to position ordering in #138); the builders (Task 2 — `position` is optional in `$inferInsert` while the default exists, so the seed and fixtures keep compiling and running unchanged); any `packages/types` change (Tasks 4–5); any query change in `service-packages.ts` beyond the two comment sentences.

- [✅] **Step 1: Write the failing truncate-pin update**

In `apps/api/test/helpers/truncate.test.ts`, replace the second test wholesale (the pin — the list is the 21-table state after 0006; `gallery_categories`/`gallery_photos` sort after `frames`, `testimonials` after `studio_services`):

```ts
  it('still truncates exactly the twenty-one known public tables (migrations 0000-0006)', () => {
    expect(publicTableNames()).toEqual([
      'account',
      'addon_services',
      'appointment_addon_services',
      'appointments',
      'attires',
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

- [✅] **Step 2: Run the pin to verify it fails**

Run: `pnpm --filter @sevendays/api test -- truncate`
Expected: FAIL — `toEqual` mismatch (received the 18-table list, expected 21).

- [✅] **Step 3: Write the three new schema files**

`packages/db/src/schema/gallery-categories.ts`:

```ts
import { boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

// Gallery Category (M5, glossary): a staff-managed grouping of Gallery
// Photos — one tab of the about grid, shown in a fixed order. Reordering is
// the collection order PUT ({ categoryIds }); position is server-assigned
// and never client-supplied. Deactivation is the reversible is_active flip —
// rows are never deleted (no hard deletes anywhere in the CMS).
export const galleryCategories = pgTable(
  'gallery_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Natural key: category names are the tab labels — unique by ruling.
  },
  (table) => [unique('gallery_categories_name_unique').on(table.name)]
);
```

`packages/db/src/schema/gallery-photos.ts`:

```ts
import { boolean, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { galleryCategories } from './gallery-categories.js';

// Gallery Photo (M5, ADR-0019): the row stores the R2 object key; reads
// resolve photoUrl at read time — raw keys never leave the API. The
// category FK is NULLABLE by ruling: an uncategorized photo is staff-only
// and absent from public reads. Deactivation is the reversible is_active
// flip; replacing a photo is a new immutable key + row update + old-key
// delete, never an in-place overwrite.
export const galleryPhotos = pgTable(
  'gallery_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    r2Key: text('r2_key').notNull(),
    title: text('title'),
    caption: text('caption'),
    categoryId: uuid('category_id').references(() => galleryCategories.id),
    position: integer('position').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('gallery_photos_r2_key_unique').on(table.r2Key),
    // FK lookup index (the M1.2 review ruling): public reads filter by
    // category; the admin category panel lists a category's photos.
    index('gallery_photos_category_id_idx').on(table.categoryId),
  ]
);
```

`packages/db/src/schema/testimonials.ts`:

```ts
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Testimonial (M5, glossary): a structured customer quote — quote text,
// person attributed, display position. Array order (renumbered by the
// collection order PUT) is the render order; no lookups reference this
// table.
export const testimonials = pgTable('testimonials', {
  id: uuid('id').primaryKey().defaultRandom(),
  quote: text('quote').notNull(),
  person: text('person').notNull(),
  position: integer('position').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [✅] **Step 4: Add the columns to the five existing tables**

In `packages/db/src/schema/branches.ts`, insert after the `acceptsWalkIns` line (keeping the trailing `createdAt` line and comment block untouched):

```ts
    // Deactivation (M5): hidden from public reads (#138 makes them
    // active-only), reversible, never a delete — the same posture
    // service_packages has had since M1.
    isActive: boolean('is_active').notNull().default(true),
```

In `print-sizes.ts`, insert after the `description` line:

```ts
  // Deactivation (M5): a deactivated print size hides its referencing
  // inclusions from public reads (the trim rule, #138); admin reads always
  // assemble the full composition.
  isActive: boolean('is_active').notNull().default(true),
```

In `attires.ts`, insert after the `name` line:

```ts
  // Deactivation (M5): a deactivated attire trims from its inclusion's
  // attire list on public reads (the inclusion still renders, #138); admin
  // reads always assemble the full composition.
  isActive: boolean('is_active').notNull().default(true),
```

In `package-inclusions.ts`, insert after the `description` line:

```ts
    // Display order within the package (M5): array order under the atomic
    // package save (#137); lands DEFAULT 1 NOT NULL (populated-table-safe)
    // and is backfilled from today's id order (ticket #135 Task 3) before
    // the default drops.
    position: integer('position').notNull().default(1),
```

In `package-inclusion-attires.ts`, insert after the `attireId` line:

```ts
    // Attire order within the inclusion (M5): catalog attire order under the
    // atomic package save (#137); backfilled from today's (created_at, id)
    // order (ticket #135 Task 3) before the default drops.
    position: integer('position').notNull().default(1),
```

- [✅] **Step 5: Wire the barrel and relations**

In `packages/db/src/schema/index.ts`, add to the alphabetical star-export list (between `./frames.js` and `./package-inclusion-attires.js`, and after `./studio-services.js` respectively):

```ts
export * from './gallery-categories.js';
export * from './gallery-photos.js';
```

```ts
export * from './testimonials.js';
```

In `packages/db/src/schema/relations.ts`, extend the import block (the `galleryCategories` import sorts after `frames` and before `packageInclusionAttires`; `galleryPhotos` beside it) and append the two relation groups after `packageInclusionAttiresRelations`:

```ts
export const galleryCategoriesRelations = relations(galleryCategories, ({ many }) => ({
  photos: many(galleryPhotos),
}));

export const galleryPhotosRelations = relations(galleryPhotos, ({ one }) => ({
  category: one(galleryCategories, {
    fields: [galleryPhotos.categoryId],
    references: [galleryCategories.id],
  }),
}));
```

- [✅] **Step 6: Typecheck + build the package, then run the pin to verify it passes**

Run: `pnpm --filter @sevendays/db typecheck && pnpm --filter @sevendays/db build && pnpm build:packages`
Expected: all green (position is optional in `$inferInsert` while the default exists — seed and fixtures compile unchanged).
Run: `pnpm --filter @sevendays/api test -- truncate`
Expected: PASS (2 tests; the derived list now walks 21 tables).

- [✅] **Step 7: Generate migration 0006 and read it against the pinned shape**

Run: `pnpm --filter @sevendays/db db:generate`
Expected: one new `migrations/0006_*.sql` (record the name) whose statements are exactly this shape (order may differ; constraint names as pinned):

```sql
CREATE TABLE "gallery_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_categories_name_unique" UNIQUE("name")
);
CREATE TABLE "gallery_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"r2_key" text NOT NULL,
	"title" text,
	"caption" text,
	"category_id" uuid,
	"position" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_photos_r2_key_unique" UNIQUE("r2_key")
);
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote" text NOT NULL,
	"person" text NOT NULL,
	"position" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_category_id_gallery_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."gallery_categories"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "gallery_photos_category_id_idx" ON "gallery_photos" USING btree ("category_id");
ALTER TABLE "branches" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "print_sizes" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "attires" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "package_inclusions" ADD COLUMN "position" integer DEFAULT 1 NOT NULL;
ALTER TABLE "package_inclusion_attires" ADD COLUMN "position" integer DEFAULT 1 NOT NULL;
```

If drizzle emits a materially different shape (a table rewrite, `SET NOT NULL`, a hand-listed unnamed constraint), STOP and report.

- [✅] **Step 8: Apply to the live database (gated)**

Run: `node packages/db/scripts/check-env.mjs` → expect `GATE: PASS`.
Run: `pnpm --filter @sevendays/db db:migrate`
Expected: exit 0; the journal applies 0006. Then verify the live shape read-only:
Run: `cd packages/db && node --env-file=.env scripts/db-state.mjs; cd ../..`
Expected: the public table list includes `gallery_categories`, `gallery_photos`, `testimonials` (21 tables; counts may print zero rows for the new tables — they are CMS-born-empty).

- [✅] **Step 9: The two stale comment sentences in the read service (comment-only)**

In `apps/api/src/services/service-packages.ts`, replace this sentence inside the `assemblePackageRead` docstring:

```text
 * Callers deliver rows in their pinned orders (inclusions by id,
 * junctions by created_at + id, frames by frameNumber); assembly never
 * re-sorts (groupChildren contract).
```

with:

```text
 * Callers deliver rows in their pinned orders (inclusions by id,
 * junctions by created_at + id, frames by frameNumber — the position
 * columns exist since M5 #135 but become the read keys only when #138
 * switches the assembly); assembly never re-sorts (groupChildren contract).
```

and replace the junction-order comment above the junction query (appears twice, list and by-slug — apply to both):

```text
  // The junction has no position column; insertion order (created_at, then id
  // as tiebreak) is the render order. Distinct statements per junction row
  // (fixtures) give distinct created_at, so this ordering is deterministic.
```

with:

```text
  // The junction's position column exists since M5 (#135, backfilled from
  // this order), but the read still keys on (created_at, id) until #138
  // switches the assembly to (position, id). Distinct statements per junction
  // row (fixtures) give distinct created_at, so this ordering is deterministic.
```

- [✅] **Step 10: Run the touched suites and commit**

Run: `pnpm --filter @sevendays/api test` (compose db up) — expected 13 files / 103 tests PASS (nothing in the api's behavior moved; the pin test now walks 21 tables). Run `pnpm --filter @sevendays/api fix` and `pnpm --filter @sevendays/db fix`, then commit:

```bash
git add packages/db/src/schema packages/db/migrations apps/api/test/helpers/truncate.test.ts apps/api/src/services/service-packages.ts
git commit -m "feat(db): gallery/testimonials tables, lookup is_active, inclusion positions (0006) (#135)"
```

---

### Task 2: The catalog-rows builders supply positions (one edit site for seed + fixtures)

**Files:**
- Modify: `packages/db/src/catalog-rows.ts`
- Modify (test-first): `packages/db/src/catalog-rows.test.ts`
- Modify (comment-only): `apps/api/test/helpers/fixtures.ts`

**Interfaces:**
- Consumes: Task 1's columns (`position` is optional in `$inferInsert` while `DEFAULT 1` exists — both adapters compile and run unchanged before this task, and REQUIRE it after Task 3 drops the default).
- Produces: `buildInclusionRowValues` output rows carry `position: 1..N` in entry order; `buildJunctionPairs` output pairs carry `position: 1..M` per inclusion, restarting at 1 per inclusion. `InclusionRowValues`/`JunctionPairValues` types carry the field automatically (they are `$inferInsert` aliases). Callers (`seed.ts`, `apps/api/test/helpers/fixtures.ts`) change ZERO code — this task's fixtures edit is a stale-comment rewrite only.

**Not here:** the seed script itself (no edit — its inserts flow through the builders); the backfill (Task 3 — builders cover future inserts only, existing live rows keep their DEFAULT 1 until the script runs); `buildFrameRowValues` (frames keep `frameNumber`, no position column).

- [✅] **Step 1: Write the failing builder tests**

In `packages/db/src/catalog-rows.test.ts`:

(a) Inside `describe('buildInclusionRowValues')`, immediately after the `'preserves entry order across mixed kinds (the seeder cursor pairing depends on it)'` test, add:

```ts
  it('numbers positions 1..N in entry order (M5: array order is the position)', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [
        { kind: 'print', quantity: 2, printSizeCode: '2R', attireNames: ['Toga'] },
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeCode: '11x14',
          attireNames: ['Toga'],
          frameId: 'frame-1',
        },
        { kind: 'privilege', description: 'High Resolution soft copies', attireNames: [] },
      ],
      printSizeId,
    });
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3]);
  });
```

(b) In the same describe, REPLACE the `'sets only the six shape fields — id/createdAt/updatedAt stay DB defaults'` test with (title and key list gain `position`):

```ts
  it('sets only the seven shape fields — id/createdAt/updatedAt stay DB defaults', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [{ kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: [] }],
      printSizeId,
    });
    const first = rows[0];
    if (!first) throw new Error('expected one row');
    expect(Object.keys(first).sort()).toEqual([
      'description',
      'frameId',
      'kind',
      'position',
      'printSizeId',
      'quantity',
      'servicePackageId',
    ]);
  });
```

(c) Inside `describe('buildJunctionPairs')`, add after the `'walks entries in order…'` test:

```ts
  it('numbers positions per inclusion, restarting at 1 (attire order within the inclusion)', () => {
    const pairs = buildJunctionPairs({
      inclusionIds: ['inc-a', 'inc-c'],
      entries: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeCode: '8x10',
          attireNames: ['Toga'],
          frameId: 'f',
        },
        { kind: 'print', quantity: 4, printSizeCode: '2R', attireNames: ['Executive', 'Uniform'] },
      ],
      attireId: new Map([...attireId, ['Uniform', 'att-uniform']]),
    });
    expect(pairs.map((p) => p.position)).toEqual([1, 1, 2]);
  });
```

(d) The two existing deep-equal assertions gain the field — replace:

```ts
    expect(pairs).toEqual([
      { inclusionId: 'inc-1', attireId: 'att-fil' },
      { inclusionId: 'inc-1', attireId: 'att-exec' },
    ]);
```

with:

```ts
    expect(pairs).toEqual([
      { inclusionId: 'inc-1', attireId: 'att-fil', position: 1 },
      { inclusionId: 'inc-1', attireId: 'att-exec', position: 2 },
    ]);
```

and replace:

```ts
    expect(pairs).toEqual([
      { inclusionId: 'inc-a', attireId: 'att-toga' },
      { inclusionId: 'inc-c', attireId: 'att-exec' },
      { inclusionId: 'inc-c', attireId: 'att-uniform' },
    ]);
```

with:

```ts
    expect(pairs).toEqual([
      { inclusionId: 'inc-a', attireId: 'att-toga', position: 1 },
      { inclusionId: 'inc-c', attireId: 'att-exec', position: 1 },
      { inclusionId: 'inc-c', attireId: 'att-uniform', position: 2 },
    ]);
```

- [✅] **Step 2: Run the builder tests to verify they fail**

Run: `pnpm --filter @sevendays/db test -- catalog-rows`
Expected: FAIL — the two new `position` assertions fail (`undefined` where a number is expected), the rewritten keys test fails (`position` missing from keys), and the two edited deep-equals fail (received objects without `position`).

- [✅] **Step 3: Implement — positions in the builders**

In `packages/db/src/catalog-rows.ts`:

(a) Extend the module docstring's junction paragraph — replace:

```text
 * decompose an entry's attireNames in array order — 'Filipiniana/Executive'
 * is two pairs, Filipiniana first (the canonical catalog attire order, never
 * alphabetized). Unknown names fail loudly, never skip.
```

with:

```text
 * decompose an entry's attireNames in array order — 'Filipiniana/Executive'
 * is two pairs, Filipiniana first (the canonical catalog attire order, never
 * alphabetized). Positions are 1-based: inclusion position = entry order
 * within the package (M5 array-order-is-the-position), junction position =
 * attire order within its inclusion, restarting at 1 per inclusion. Unknown
 * names fail loudly, never skip.
```

(b) In `buildInclusionRowValues`, change the map callback to carry the index into `base` — replace:

```ts
  // biome-ignore lint/suspicious/useIterableCallbackReturn: exhaustive switch over InclusionEntry is deliberate — no default branch (adding a Kind becomes a compile error)
  return input.entries.map((entry) => {
    const base = { servicePackageId: input.servicePackageId };
```

with:

```ts
  // biome-ignore lint/suspicious/useIterableCallbackReturn: exhaustive switch over InclusionEntry is deliberate — no default branch (adding a Kind becomes a compile error)
  return input.entries.map((entry, index) => {
    const base = { servicePackageId: input.servicePackageId, position: index + 1 };
```

(c) In `buildJunctionPairs`, number the pairs per inclusion — replace:

```ts
  const pairs: JunctionPairValues[] = [];
  for (const [i, entry] of input.entries.entries()) {
    const inclusionId = input.inclusionIds[i];
    if (!inclusionId) throw new Error(`junction pairing: no inclusionId at index ${i}`);
    for (const name of entry.attireNames) {
      const id = input.attireId.get(name);
      if (!id) throw new Error(`Unknown attire name: ${name}`);
      pairs.push({ inclusionId, attireId: id });
    }
  }
  return pairs;
```

with:

```ts
  const pairs: JunctionPairValues[] = [];
  for (const [i, entry] of input.entries.entries()) {
    const inclusionId = input.inclusionIds[i];
    if (!inclusionId) throw new Error(`junction pairing: no inclusionId at index ${i}`);
    let position = 0;
    for (const name of entry.attireNames) {
      const id = input.attireId.get(name);
      if (!id) throw new Error(`Unknown attire name: ${name}`);
      position += 1;
      pairs.push({ inclusionId, attireId: id, position });
    }
  }
  return pairs;
```

- [✅] **Step 4: Run the builder tests to verify they pass**

Run: `pnpm --filter @sevendays/db test`
Expected: PASS — the db suite reads **22 passed | 8 skipped** (catalog-rows grew from 20 `it(` occurrences to 22; the two skipped `describe.runIf` files are unchanged).

- [✅] **Step 5: Rewrite the now-stale fixture comment (comment-only)**

In `apps/api/test/helpers/fixtures.ts`, replace:

```text
  // One row per statement (not one batch): the junction has no position
  // column, so render order falls back to insertion order via created_at —
  // rows written in a single INSERT share now() and would tie on an (id-
  // ordered) coin flip (Task 4 finding). Distinct statements give each
  // row a distinct timestamp, preserving catalog attire order
  // deterministically. The builder owns the pair order; these statements
  // preserve it.
```

with:

```text
  // One row per statement (kept from the pre-position era): the builder now
  // supplies junction position per inclusion (catalog attire order), and the
  // #138 read will order by (position, id) — until then the current read
  // still keys on created_at, and distinct statements keep each row's
  // created_at distinct so that ordering stays deterministic. The builder
  // owns the pair order; these statements preserve it.
```

- [✅] **Step 6: Run the api suite and commit**

Run: `pnpm --filter @sevendays/api test` — expected 13 files / 103 tests PASS (fixtures now supply positions into the DEFAULT-1 column; values are legal whatever they are until #138 re-keys the read).
Run `pnpm --filter @sevendays/db fix`, then commit:

```bash
git add packages/db/src/catalog-rows.ts packages/db/src/catalog-rows.test.ts apps/api/test/helpers/fixtures.ts
git commit -m "feat(db): catalog-rows builders supply inclusion + junction positions (#135)"
```

---

### Task 3: Live backfill + verify, then drop the backfill default (migration 0007)

**Files:**
- Create: `packages/db/scripts/backfill-positions.mjs`
- Modify: `packages/db/src/schema/package-inclusions.ts`, `package-inclusion-attires.ts` (comment + drop `.default(1)`)
- Modify: `apps/api/test/helpers/truncate.test.ts` (title: `0000-0006` → `0000-0007`)
- Generated: `packages/db/migrations/0007_*.sql` + `meta/_journal.json`

**Interfaces:**
- Consumes: Task 1's columns; Task 2's builders (so that after the default drops, `$inferInsert` REQUIRES `position` and both adapters already supply it — the rebuild typecheck in Step 6 is that proof).
- Produces: live rows positioned per today's render order (verified: all lookups active; positions contiguous 1..N per package and per inclusion; zero NULLs); end-state schema `position: integer(...).notNull()` with **no default**; migration 0007 applied to live.

**Not here:** the compose/CI databases (they get 0006+0007 through the normal migrate path — 0006's `DEFAULT 1` fills any persisted leftover rows, and 0007's `DROP DEFAULT` is data-agnostic, so no environment needs the script); any read change (positions are invisible to reads until #138); the gallery/testimonials tables (born empty — no backfill).

- [✅] **Step 1: Write the backfill + verify script**

`packages/db/scripts/backfill-positions.mjs` (plain node over postgres.js — the `db-state.mjs` script precedent; no drizzle typing concerns for a one-off):

```js
// One-off M5 backfill (ticket #135, Task 3): rewrites inclusion + junction
// positions from today's render order — inclusions by id (the list read's
// key), junctions by (created_at, id) per inclusion — then verifies the
// ticket's acceptance shape: all lookups active, positions contiguous 1..N
// per package and per inclusion, zero NULLs. Idempotent: row_number()
// re-derives the same values on rerun. Prints counts only — never a
// connection string.
// Run: node --env-file=.env scripts/backfill-positions.mjs  (exit 0 = verified)

import postgres from 'postgres';

const url = process.env.DATABASE_MIGRATE_URL;
if (!url) {
  console.error('DATABASE_MIGRATE_URL is not set (run scripts/check-env.mjs)');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
const failures = [];

function pass(line) {
  console.log(`[ok] ${line}`);
}

function fail(line) {
  failures.push(line);
  console.log(`[FAIL] ${line}`);
}

async function violations(label, query) {
  const rows = await query;
  const n = rows[0]?.n ?? 0;
  if (n === 0) pass(label);
  else fail(`${label} (${n} violations)`);
  return n;
}

const inclusionUpdates = await sql`
  UPDATE package_inclusions SET position = ranked.rn
  FROM (
    SELECT id, row_number() OVER (PARTITION BY service_package_id ORDER BY id) AS rn
    FROM package_inclusions
  ) AS ranked
  WHERE package_inclusions.id = ranked.id
`;
pass(`inclusion positions rewritten from id order (${inclusionUpdates.count} rows)`);

const junctionUpdates = await sql`
  UPDATE package_inclusion_attires SET position = ranked.rn
  FROM (
    SELECT id, row_number() OVER (PARTITION BY inclusion_id ORDER BY created_at, id) AS rn
    FROM package_inclusion_attires
  ) AS ranked
  WHERE package_inclusion_attires.id = ranked.id
`;
pass(`junction positions rewritten from (created_at, id) order (${junctionUpdates.count} rows)`);

await violations(
  'no NULL inclusion positions',
  sql`SELECT count(*)::int AS n FROM package_inclusions WHERE position IS NULL`
);
await violations(
  'no NULL junction positions',
  sql`SELECT count(*)::int AS n FROM package_inclusion_attires WHERE position IS NULL`
);
await violations(
  'inclusion positions contiguous 1..N per package',
  sql`
    SELECT count(*)::int AS n FROM (
      SELECT service_package_id
      FROM package_inclusions
      GROUP BY service_package_id
      HAVING min(position) <> 1
         OR max(position) <> count(*)
         OR count(DISTINCT position) <> count(*)
    ) AS bad
  `
);
await violations(
  'junction positions contiguous 1..N per inclusion',
  sql`
    SELECT count(*)::int AS n FROM (
      SELECT inclusion_id
      FROM package_inclusion_attires
      GROUP BY inclusion_id
      HAVING min(position) <> 1
         OR max(position) <> count(*)
         OR count(DISTINCT position) <> count(*)
    ) AS bad
  `
);
await violations(
  'all branches active (the ruled backfill)',
  sql`SELECT count(*)::int AS n FROM branches WHERE is_active = false`
);
await violations(
  'all print sizes active (the ruled backfill)',
  sql`SELECT count(*)::int AS n FROM print_sizes WHERE is_active = false`
);
await violations(
  'all attires active (the ruled backfill)',
  sql`SELECT count(*)::int AS n FROM attires WHERE is_active = false`
);

const [summary] = await sql`
  SELECT
    (SELECT count(*)::int FROM service_packages) AS packages,
    (SELECT count(*)::int FROM package_inclusions) AS inclusions,
    (SELECT count(*)::int FROM package_inclusion_attires) AS junctions,
    (SELECT count(*)::int FROM gallery_categories) AS categories,
    (SELECT count(*)::int FROM gallery_photos) AS photos,
    (SELECT count(*)::int FROM testimonials) AS testimonials
`;
if (summary) {
  pass(
    `row counts: ${summary.packages} packages / ${summary.inclusions} inclusions / ${summary.junctions} junctions / ${summary.categories} categories / ${summary.photos} photos / ${summary.testimonials} testimonials`
  );
}

await sql.end({ timeout: 5 });

if (failures.length > 0) {
  console.log(`GATE: FAIL — ${failures.length} violation(s) above`);
  process.exit(1);
}
console.log('GATE: PASS — backfill verified (lookups active; positions monotonic 1..N)');
```

- [✅] **Step 2: Run the backfill against live, twice (idempotence proof)**

Run: `node packages/db/scripts/check-env.mjs` → expect `GATE: PASS`.
Run: `cd packages/db && node --env-file=.env scripts/backfill-positions.mjs; cd ../..`
Expected: every line `[ok] …`, ending `GATE: PASS` — including `all branches active` / `all print sizes active` / `all attires active` (the ticket's "backfills verified (all lookups active; …)").
Run the script a second time — expected: identical `[ok]` lines and `GATE: PASS` (row_number re-derives the same values; this proves idempotence).
Any `[FAIL]` line → STOP and report; do not proceed to the flip.

- [✅] **Step 3: Drop the backfill default in the schema**

In `packages/db/src/schema/package-inclusions.ts`, replace:

```ts
    // Display order within the package (M5): array order under the atomic
    // package save (#137); lands DEFAULT 1 NOT NULL (populated-table-safe)
    // and is backfilled from today's id order (ticket #135 Task 3) before
    // the default drops.
    position: integer('position').notNull().default(1),
```

with:

```ts
    // Display order within the package (M5): array order under the atomic
    // package save (#137). Landed DEFAULT 1 NOT NULL (populated-table-safe)
    // and was backfilled from today's id order in #135 before the default
    // dropped — a forgetful insert now fails loudly instead of tying at 1.
    position: integer('position').notNull(),
```

In `packages/db/src/schema/package-inclusion-attires.ts`, replace:

```ts
    // Attire order within the inclusion (M5): catalog attire order under the
    // atomic package save (#137); backfilled from today's (created_at, id)
    // order (ticket #135 Task 3) before the default drops.
    position: integer('position').notNull().default(1),
```

with:

```ts
    // Attire order within the inclusion (M5): catalog attire order under the
    // atomic package save (#137). Landed DEFAULT 1 NOT NULL, was backfilled
    // from today's (created_at, id) order in #135 before the default
    // dropped — a forgetful insert now fails loudly instead of tying at 1.
    position: integer('position').notNull(),
```

- [✅] **Step 4: Generate migration 0007 and read it against the pinned shape**

Run: `pnpm --filter @sevendays/db db:generate`
Expected: one new `migrations/0007_*.sql` (record the name) containing exactly:

```sql
ALTER TABLE "package_inclusions" ALTER COLUMN "position" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "package_inclusion_attires" ALTER COLUMN "position" DROP DEFAULT;
```

Anything materially different (a `SET NOT NULL`, a `TYPE` change) → STOP and report.

- [✅] **Step 5: Apply to live + update the truncate pin's title**

Run: `pnpm --filter @sevendays/db db:migrate` → exit 0.
In `apps/api/test/helpers/truncate.test.ts`, replace the title string `'still truncates exactly the twenty-one known public tables (migrations 0000-0006)'` with `'still truncates exactly the twenty-one known public tables (migrations 0000-0007)'` (the list is unchanged — 0007 adds no table).

- [✅] **Step 6: Rebuild + prove the insert contract, run the suites, commit**

Run: `pnpm --filter @sevendays/db typecheck && pnpm --filter @sevendays/db build`
Expected: green — with no default, `$inferInsert` now REQUIRES `position`; this compiles only because Task 2's builders supply it (the proof the seed and fixtures are position-complete).
Run: `pnpm --filter @sevendays/db test` → **22 passed | 8 skipped**.
Run: `pnpm --filter @sevendays/api test` → **13 files / 103 tests** PASS (compose applies 0006+0007 through global-setup; `DEFAULT 1` filled any persisted leftovers, `DROP DEFAULT` is data-agnostic — no environment ever needed the script).
Run `pnpm --filter @sevendays/db fix` and `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add packages/db/scripts/backfill-positions.mjs packages/db/src/schema/package-inclusions.ts packages/db/src/schema/package-inclusion-attires.ts packages/db/migrations apps/api/test/helpers/truncate.test.ts
git commit -m "feat(db): backfill inclusion positions, drop the backfill default (0007) (#135)"
```

---

### Task 4: packages/types — the new-entity vocabulary (gallery, testimonials, lookup `is_active`, matrix payloads)

**Files:**
- Create: `packages/types/src/gallery.ts`, `packages/types/src/testimonial.ts`, `packages/types/src/gallery.test.ts`, `packages/types/src/testimonial.test.ts`
- Modify: `packages/types/src/branch.ts`, `print-size.ts`, `attire.ts`, `addon-service.ts`, `studio-service.ts`, `index.ts`
- Modify (test-first): `packages/types/src/attire.test.ts`, `print-size.test.ts`, `addon-service.test.ts`, `studio-service.test.ts`

**Interfaces:**
- Consumes: Task 1's columns (`isActive` on branches/print sizes/attires — the row schemas mirror them with `default(true)` so every pre-column fixture keeps parsing; `db.select()` already returns the column once 0006 applied).
- Produces (exact exports — #137/#138 and tickets #139–#142 consume these; Task 5 adds the package pair): from `gallery.ts` — `galleryCategorySchema`, `GalleryCategory`, `createGalleryCategorySchema`, `CreateGalleryCategoryInput`, `updateGalleryCategorySchema`, `UpdateGalleryCategoryInput`, `galleryPhotoSchema`, `GalleryPhoto`, `createGalleryPhotoSchema`, `CreateGalleryPhotoInput`, `updateGalleryPhotoSchema`, `UpdateGalleryPhotoInput`, `galleryCategoryOrderSchema`, `GalleryCategoryOrderInput`, `galleryPhotoOrderSchema`, `GalleryPhotoOrderInput`, `publicGalleryCategorySchema`, `PublicGalleryCategory`, `publicGalleryPhotoSchema`, `PublicGalleryPhoto`, `galleryReadSchema`, `GalleryRead`; from `testimonial.ts` — `testimonialSchema`, `Testimonial`, `createTestimonialSchema`, `CreateTestimonialInput`, `updateTestimonialSchema`, `UpdateTestimonialInput`, `testimonialOrderSchema`, `TestimonialOrderInput`, `publicTestimonialSchema`, `PublicTestimonial`; plus `updateBranchSchema`/`UpdateBranchInput`, `updatePrintSizeSchema`/`UpdatePrintSizeInput`, `updateAttireSchema`/`UpdateAttireInput`, `updateAddonServiceSchema`/`UpdateAddonServiceInput`, `updateStudioServiceSchema`/`UpdateStudioServiceInput`, `studioServiceBranchMatrixSchema`/`StudioServiceBranchMatrixInput`, `studioServiceAddonMatrixSchema`/`StudioServiceAddonMatrixInput`.

**Not here:** anything package-shaped (`servicePackageReadSchema`, the save payload, the deletion of the dead create schemas — Task 5); `branch.ts` gets no sibling test file (there is none today — branch coverage lands in Task 6's contract suite); admin-vs-public *list* semantics (both read the same shapes — the admin list simply includes deactivated rows; that's #137's query, not a schema); any UI.

- [✅] **Step 1: Write the failing tests for the two new files**

`packages/types/src/gallery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createGalleryCategorySchema,
  createGalleryPhotoSchema,
  galleryCategoryOrderSchema,
  galleryCategorySchema,
  galleryPhotoOrderSchema,
  galleryPhotoSchema,
  galleryReadSchema,
  updateGalleryCategorySchema,
  updateGalleryPhotoSchema,
} from './gallery.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const UUID2 = '00000000-0000-4000-8000-000000000001';
const DATE = '2026-09-25T00:00:00.000Z';
const PHOTO_URL = 'https://pub-0000.r2.dev/gallery/00000000-0000-4000-8000-000000000000.jpg';

describe('galleryCategorySchema', () => {
  it('parses a canonical category row (position 1-based, isActive, dates coerce)', () => {
    const result = galleryCategorySchema.safeParse({
      id: UUID,
      name: 'Graduation',
      position: 1,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(result.success).toBe(true);
  });

  it('create drops the server-assigned fields (id/position/timestamps — order PUTs own position)', () => {
    const parsed = createGalleryCategorySchema.parse({
      name: 'Graduation',
      isActive: true,
      id: UUID,
      position: 3,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
  });

  it('create defaults isActive true when omitted', () => {
    const parsed = createGalleryCategorySchema.parse({ name: 'Graduation' });
    expect(parsed.isActive).toBe(true);
  });

  it('create rejects an empty name', () => {
    const result = createGalleryCategorySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('update is the create schema (full-object PUT — the same client field set)', () => {
    expect(updateGalleryCategorySchema).toBe(createGalleryCategorySchema);
  });
});

describe('galleryPhotoSchema (the admin read)', () => {
  it('parses a canonical admin read (photoUrl is the absolute resolved URL)', () => {
    const result = galleryPhotoSchema.safeParse({
      id: UUID,
      title: 'Toga portrait',
      caption: null,
      categoryId: UUID2,
      position: 4,
      isActive: false,
      photoUrl: PHOTO_URL,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(result.success).toBe(true);
  });

  it('strips a smuggled r2Key from the parsed output (ADR-0019: raw keys never leave the API)', () => {
    const parsed = galleryPhotoSchema.parse({
      id: UUID,
      title: null,
      caption: null,
      categoryId: null,
      position: 1,
      isActive: true,
      photoUrl: PHOTO_URL,
      r2Key: 'gallery/00000000-0000-4000-8000-000000000000.jpg',
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('r2Key' in parsed).toBe(false);
  });

  it('create parses the spec-pinned payload { r2Key, title?, caption?, categoryId? }', () => {
    const result = createGalleryPhotoSchema.safeParse({
      r2Key: 'tmp/00000000-0000-4000-8000-000000000000.jpg',
      title: null,
      caption: 'Studio batch 1',
      categoryId: null,
    });
    expect(result.success).toBe(true);
  });

  it('create rejects a missing r2Key', () => {
    const result = createGalleryPhotoSchema.safeParse({ title: 'no key' });
    expect(result.success).toBe(false);
  });

  it('update requires the full metadata fields; r2Key is the optional replace field', () => {
    const full = {
      title: 'Toga portrait',
      caption: null,
      categoryId: UUID2,
      isActive: true,
    };
    expect(updateGalleryPhotoSchema.safeParse(full).success).toBe(true);
    expect(updateGalleryPhotoSchema.safeParse({ ...full, r2Key: 'tmp/new-staging.jpg' }).success).toBe(true);
    expect(updateGalleryPhotoSchema.safeParse({ ...full, title: undefined }).success).toBe(false);
  });
});

describe('gallery order payloads (collection full-replace PUTs)', () => {
  it('parses { categoryIds } and { photoIds }; rejects non-uuid entries', () => {
    expect(galleryCategoryOrderSchema.safeParse({ categoryIds: [UUID, UUID2] }).success).toBe(true);
    expect(galleryPhotoOrderSchema.safeParse({ photoIds: [UUID] }).success).toBe(true);
    expect(galleryPhotoOrderSchema.safeParse({ photoIds: ['not-a-uuid'] }).success).toBe(false);
  });
});

describe('galleryReadSchema (the public assembled read)', () => {
  it('parses an assembled payload — categories (tab order) + categorized photos', () => {
    const result = galleryReadSchema.safeParse({
      categories: [
        { id: UUID2, name: 'Graduation' },
        { id: UUID, name: 'Family' },
      ],
      photos: [
        { id: UUID, photoUrl: PHOTO_URL, title: 'Toga portrait', categoryId: UUID2 },
        { id: UUID2, photoUrl: PHOTO_URL, title: null, categoryId: UUID2 },
      ],
    });
    expect(result.success).toBe(true);
  });
});
```

`packages/types/src/testimonial.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createTestimonialSchema,
  publicTestimonialSchema,
  testimonialOrderSchema,
  testimonialSchema,
  updateTestimonialSchema,
} from './testimonial.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const UUID2 = '00000000-0000-4000-8000-000000000001';
const DATE = '2026-09-25T00:00:00.000Z';

describe('testimonialSchema', () => {
  it('parses a canonical row (quote, person, position, isActive)', () => {
    const result = testimonialSchema.safeParse({
      id: UUID,
      quote: 'The photos came out better than we hoped.',
      person: 'Maria, batch 2026',
      position: 2,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(result.success).toBe(true);
  });

  it('create rejects an empty quote and a missing person', () => {
    expect(createTestimonialSchema.safeParse({ quote: '', person: 'Maria' }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ quote: 'Loved it.' }).success).toBe(false);
  });

  it('create defaults isActive true and drops the server-assigned fields', () => {
    const parsed = createTestimonialSchema.parse({
      quote: 'Loved it.',
      person: 'Maria',
      id: UUID,
      position: 5,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(parsed.isActive).toBe(true);
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
  });

  it('update is the create schema (full-object PUT)', () => {
    expect(updateTestimonialSchema).toBe(createTestimonialSchema);
  });
});

describe('testimonialOrderSchema', () => {
  it('parses { testimonialIds }; rejects a non-uuid entry', () => {
    expect(testimonialOrderSchema.safeParse({ testimonialIds: [UUID2, UUID] }).success).toBe(true);
    expect(testimonialOrderSchema.safeParse({ testimonialIds: ['not-a-uuid'] }).success).toBe(false);
  });
});

describe('publicTestimonialSchema', () => {
  it('parses the trimmed public read (id, quote, person — array order is the render order)', () => {
    const result = publicTestimonialSchema.safeParse({
      id: UUID,
      quote: 'The photos came out better than we hoped.',
      person: 'Maria, batch 2026',
    });
    expect(result.success).toBe(true);
  });
});
```

- [✅] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/types test`
Expected: FAIL — `gallery.test.ts` and `testimonial.test.ts` fail to resolve their imports (modules don't exist).

- [✅] **Step 3: Write the two new schema files**

`packages/types/src/gallery.ts`:

```ts
import { z } from 'zod';

// Gallery Category (M5, glossary): a staff-managed grouping of Gallery
// Photos — one tab of the about grid. Reordering is the collection order PUT
// ({ categoryIds }); position is server-assigned and never client-supplied,
// so create/update carry no position field.
export const galleryCategorySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  position: z.number().int().min(1),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type GalleryCategory = z.infer<typeof galleryCategorySchema>;

export const createGalleryCategorySchema = galleryCategorySchema.omit({
  id: true,
  position: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateGalleryCategoryInput = z.infer<typeof createGalleryCategorySchema>;

// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateGalleryCategorySchema = createGalleryCategorySchema;

export type UpdateGalleryCategoryInput = CreateGalleryCategoryInput;

// Gallery Photo (M5, ADR-0019): the row stores the R2 object key; the wire
// carries photoUrl only — raw keys never leave the API. This is the admin
// read (deactivated rows included); the public read below is the trimmed
// active-only assembly. categoryId null = uncategorized = staff-only.
export const galleryPhotoSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  caption: z.string().nullable(),
  categoryId: z.uuid().nullable(),
  position: z.number().int().min(1),
  isActive: z.boolean().default(true),
  photoUrl: z.url(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type GalleryPhoto = z.infer<typeof galleryPhotoSchema>;

// Spec-pinned create payload (§ The media pipeline): the staging key the
// client just uploaded, plus optional metadata. The commit endpoint verifies
// and promotes the key (#136/#137) — a final key never appears on an input.
export const createGalleryPhotoSchema = z.object({
  r2Key: z.string().min(1),
  title: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
});

export type CreateGalleryPhotoInput = z.infer<typeof createGalleryPhotoSchema>;

// Full-object metadata edit; r2Key is presence-encoded (ADR-0019): present
// only to REPLACE the photo through a fresh staging key (keys are immutable;
// replace = new key + row update + old-key delete). title/caption/categoryId
// are full-object — null clears, never "leave alone".
export const updateGalleryPhotoSchema = z.object({
  r2Key: z.string().min(1).optional(),
  title: z.string().nullable(),
  caption: z.string().nullable(),
  categoryId: z.uuid().nullable(),
  isActive: z.boolean(),
});

export type UpdateGalleryPhotoInput = z.infer<typeof updateGalleryPhotoSchema>;

// Collection order PUTs (M5 § Ordering): one full-replace per positioned
// collection — the server renumbers in one transaction (#137).
export const galleryCategoryOrderSchema = z.object({
  categoryIds: z.array(z.uuid()),
});

export type GalleryCategoryOrderInput = z.infer<typeof galleryCategoryOrderSchema>;

export const galleryPhotoOrderSchema = z.object({
  photoIds: z.array(z.uuid()),
});

export type GalleryPhotoOrderInput = z.infer<typeof galleryPhotoOrderSchema>;

// Public read (GET /api/v1/gallery, #138): one assembled payload — active
// categories (array order = tab order) and active categorized photos.
// Positions are server-side ordering; the payload carries no position
// fields, and uncategorized photos never appear here.
export const publicGalleryCategorySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const publicGalleryPhotoSchema = z.object({
  id: z.uuid(),
  photoUrl: z.url(),
  title: z.string().nullable(),
  categoryId: z.uuid(),
});

export const galleryReadSchema = z.object({
  categories: z.array(publicGalleryCategorySchema),
  photos: z.array(publicGalleryPhotoSchema),
});

export type PublicGalleryCategory = z.infer<typeof publicGalleryCategorySchema>;
export type PublicGalleryPhoto = z.infer<typeof publicGalleryPhotoSchema>;
export type GalleryRead = z.infer<typeof galleryReadSchema>;
```

`packages/types/src/testimonial.ts`:

```ts
import { z } from 'zod';

// Testimonial (M5, glossary): a structured customer quote — quote text,
// person attributed, display position. The order PUT owns reordering, so
// create/update carry no position field; array order is the render order.
export const testimonialSchema = z.object({
  id: z.uuid(),
  quote: z.string().min(1),
  person: z.string().min(1),
  position: z.number().int().min(1),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Testimonial = z.infer<typeof testimonialSchema>;

export const createTestimonialSchema = testimonialSchema.omit({
  id: true,
  position: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;

// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateTestimonialSchema = createTestimonialSchema;

export type UpdateTestimonialInput = CreateTestimonialInput;

export const testimonialOrderSchema = z.object({
  testimonialIds: z.array(z.uuid()),
});

export type TestimonialOrderInput = z.infer<typeof testimonialOrderSchema>;

// Public read (GET /api/v1/testimonials, #138): active rows in position
// order; array order is the render order.
export const publicTestimonialSchema = z.object({
  id: z.uuid(),
  quote: z.string().min(1),
  person: z.string().min(1),
});

export type PublicTestimonial = z.infer<typeof publicTestimonialSchema>;
```

- [✅] **Step 4: Add `isActive` to the three lookup row schemas + the update aliases**

In `packages/types/src/branch.ts`, add to `branchSchema` after the `acceptsWalkIns` line:

```ts
  // Deactivation (M5): hidden from public reads once #138 makes them
  // active-only; reversible, never a delete. Defaulted so pre-column
  // fixtures keep parsing.
  isActive: z.boolean().default(true),
```

and after the `CreateBranchInput` type, append:

```ts
// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateBranchSchema = createBranchSchema;

export type UpdateBranchInput = CreateBranchInput;
```

In `print-size.ts`, add to `printSizeSchema` after the `description` field:

```ts
  // Deactivation (M5): a deactivated print size hides its referencing
  // inclusions from public reads (the trim rule, #138).
  isActive: z.boolean().default(true),
```

and append after `CreatePrintSizeInput`:

```ts
// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updatePrintSizeSchema = createPrintSizeSchema;

export type UpdatePrintSizeInput = CreatePrintSizeInput;
```

In `attire.ts`, add to `attireSchema` after `name`:

```ts
  // Deactivation (M5): a deactivated attire trims from its inclusion's
  // attire list on public reads (#138); the inclusion still renders.
  isActive: z.boolean().default(true),
```

and append after `CreateAttireInput`:

```ts
// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateAttireSchema = createAttireSchema;

export type UpdateAttireInput = CreateAttireInput;
```

In `addon-service.ts`, append after `CreateAddonServiceInput`:

```ts
// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateAddonServiceSchema = createAddonServiceSchema;

export type UpdateAddonServiceInput = CreateAddonServiceInput;
```

In `studio-service.ts`, append after the `StudioServiceWithBranches` type:

```ts
// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateStudioServiceSchema = createStudioServiceSchema;

export type UpdateStudioServiceInput = CreateStudioServiceInput;

// Applicability matrix payloads (M5 § Route topology): full-replace PUTs
// keyed by the studio service — the server diffs and rewrites the junction
// rows in one transaction (#137).
export const studioServiceBranchMatrixSchema = z.object({
  branchIds: z.array(z.uuid()),
});

export type StudioServiceBranchMatrixInput = z.infer<typeof studioServiceBranchMatrixSchema>;

export const studioServiceAddonMatrixSchema = z.object({
  addonServiceIds: z.array(z.uuid()),
});

export type StudioServiceAddonMatrixInput = z.infer<typeof studioServiceAddonMatrixSchema>;
```

- [✅] **Step 5: Export the new modules + write the four sibling-test edits**

In `packages/types/src/index.ts`, add to the alphabetical list (after `./frames.js`, and after `./studio-service.js` respectively):

```ts
export * from './gallery.js';
```

```ts
export * from './testimonial.js';
```

In `attire.test.ts`, extend the import to `{ attireSchema, createAttireSchema, updateAttireSchema }` and append inside `describe('attireSchema', …)`:

```ts
  it('parses a deactivated row (isActive is carried, not defaulted over)', () => {
    const result = attireSchema.safeParse({
      id: UUID,
      name: 'Toga',
      isActive: false,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isActive).toBe(false);
  });

  it('create defaults isActive true when omitted', () => {
    const parsed = createAttireSchema.parse({ name: 'Toga' });
    expect(parsed.isActive).toBe(true);
  });

  it('update is the create schema (full-object PUT)', () => {
    expect(updateAttireSchema).toBe(createAttireSchema);
  });
```

In `print-size.test.ts`, extend the import to `{ createPrintSizeSchema, printSizeSchema, updatePrintSizeSchema }` and append inside `describe('printSizeSchema', …)`:

```ts
  it('parses a deactivated row (isActive is carried, not defaulted over)', () => {
    const result = printSizeSchema.safeParse({
      id: UUID,
      code: '8R',
      description: '8R print',
      isActive: false,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isActive).toBe(false);
  });

  it('create defaults isActive true when omitted', () => {
    const parsed = createPrintSizeSchema.parse({ code: '2R', description: 'loose 2R prints' });
    expect(parsed.isActive).toBe(true);
  });

  it('update is the create schema (full-object PUT)', () => {
    expect(updatePrintSizeSchema).toBe(createPrintSizeSchema);
  });
```

In `addon-service.test.ts`, extend the import with `updateAddonServiceSchema` and append one test (inside the existing top-level describe):

```ts
  it('update is the create schema (full-object PUT)', () => {
    expect(updateAddonServiceSchema).toBe(createAddonServiceSchema);
  });
```

In `studio-service.test.ts`, extend the import with `studioServiceAddonMatrixSchema`, `studioServiceBranchMatrixSchema`, `updateStudioServiceSchema` and append at file end:

```ts
describe('studio-service matrix payloads (M5)', () => {
  it('studioServiceBranchMatrixSchema parses { branchIds }; rejects a non-uuid entry', () => {
    expect(studioServiceBranchMatrixSchema.safeParse({ branchIds: [UUID] }).success).toBe(true);
    expect(studioServiceBranchMatrixSchema.safeParse({ branchIds: ['not-a-uuid'] }).success).toBe(
      false
    );
  });

  it('studioServiceAddonMatrixSchema parses { addonServiceIds }; rejects a non-uuid entry', () => {
    expect(
      studioServiceAddonMatrixSchema.safeParse({ addonServiceIds: [UUID] }).success
    ).toBe(true);
    expect(
      studioServiceAddonMatrixSchema.safeParse({ addonServiceIds: ['not-a-uuid'] }).success
    ).toBe(false);
  });

  it('update is the create schema (full-object PUT)', () => {
    expect(updateStudioServiceSchema).toBe(createStudioServiceSchema);
  });
});
```

(If `UUID` is not already a const in `studio-service.test.ts`, declare `const UUID = '00000000-0000-4000-8000-000000000000';` beside the existing fixtures — it is; reuse it.)

- [✅] **Step 6: Run the types suite to verify it passes, then rebuild + commit**

Run: `pnpm --filter @sevendays/types test`
Expected: PASS — **12 files / 98 tests** (70 baseline + 12 gallery + 6 testimonial + 3 attire + 3 print-size + 1 addon + 3 studio-service).
Run: `pnpm --filter @sevendays/types build && pnpm build:packages` (downstream packages see the new vocabulary), then `pnpm --filter @sevendays/landing test` and `pnpm --filter @sevendays/api test` as the blast-radius check (the defaulted `isActive` fields keep every existing parse green; api stays 103/13).
Run `pnpm --filter @sevendays/types fix`, then commit:

```bash
git add packages/types/src
git commit -m "feat(types): gallery + testimonial vocabulary, lookup is_active, matrix payloads (#135)"
```

---

### Task 5: packages/types — the atomic package-save payload + the canonical read shape

**Files:**
- Modify: `packages/types/src/package.ts`, `inclusion.ts`, `frames.ts`
- Modify (test-first): `packages/types/src/package.test.ts`, `inclusion.test.ts`, `frames.test.ts`

**Interfaces:**
- Consumes: Task 4's vocabulary style; the untouched row/with-inclusions read shapes (`servicePackageSchema` keeps `coverImageKey` — #138's swap); `packageInclusionKindSchema` (inclusion.ts).
- Produces: `packageSaveFrameSchema`/`PackageSaveFrame` (`{ id: z.string().min(1) }` — client-assigned frame tokens); `packageSaveInclusionSchema`/`PackageSaveInclusionInput` (kind, quantity, printSizeId, frameId token, attireIds **required array**, description; inclusion-level `superRefine` ≥1 attire for picture kinds); `createServicePackageSchema`/`CreateServicePackageInput` **reshaped** to the full save (entity fields + `coverImageKey?` staging-bind + `frames[]` + `inclusions[]`, package-level `superRefine`: token uniqueness, framed_picture ⇒ known token, other kinds ⇒ no frameId); `updateServicePackageSchema`/`UpdateServicePackageInput` (= create + `slug` + `coverImageKey` nullish); `servicePackageReadSchema`/`ServicePackageRead` (row minus `coverImageKey` plus `coverImageUrl: z.url().nullable()` + resolved `inclusions[]`/`frames[]`). DELETED dead vocabulary: `createPackageInclusionSchema`/`CreatePackageInclusionInput` (inclusion.ts) and `createFrameSchema`/`CreateFrameInput` (frames.ts).

**Not here:** any consumer change (verified by sweep: nothing outside `packages/types` tests imports the deleted names — `apps/` matched only the read schemas and `coverImageKey` string literals in fixtures, which stay valid); slug *generation* (`slugifyName` stays db-side, #137 calls it); `servicePackageSchema`/`servicePackageWithInclusionsSchema` (untouched — #138); per-kind quantity/description normalization beyond the attire + frame rules (the editor sends well-formed rows; #137's service normalizes — do not over-constrain the payload).

- [✅] **Step 1: Write the failing package tests**

In `packages/types/src/package.test.ts`:

(a) Extend the import to include `packageSaveInclusionSchema`, `servicePackageReadSchema`, `updateServicePackageSchema`.

(b) REPLACE the existing `'createServicePackageSchema strips slug (omitted — seed/server-assigned)'` test (its fixture feeds `coverImageKey: null`, which the reshaped create rejects by design) with:

```ts
  it('createServicePackageSchema strips slug and every server-assigned field', () => {
    // z.object strips unknown keys, so a payload carrying them still parses —
    // the contract is that they never appear in the parsed create output.
    const parsed = createServicePackageSchema.parse({
      name: 'New Package',
      description: 'A fresh package.',
      priceCents: 100000,
      durationMinutes: null,
      slug: 'should-be-ignored',
      id: UUID,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
      frames: [{ id: 'frame-1' }],
      inclusions: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeId: UUID,
          frameId: 'frame-1',
          attireIds: [UUID],
          description: null,
        },
      ],
    });
    expect('slug' in parsed).toBe(false);
    expect('id' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
  });
```

(c) Append a new describe block at file end:

```ts
describe('the atomic package save payload (M5 § Mutation shapes)', () => {
  const savePayload = {
    name: 'Deluxe Package',
    description: 'The full graduation set.',
    priceCents: 150000,
    durationMinutes: null,
    isFeatured: true,
    frames: [{ id: 'frame-1' }, { id: 'frame-2' }],
    inclusions: [
      {
        kind: 'framed_picture',
        quantity: 1,
        printSizeId: UUID,
        frameId: 'frame-1',
        attireIds: [UUID],
        description: null,
      },
      {
        kind: 'framed_picture',
        quantity: 1,
        printSizeId: UUID,
        frameId: 'frame-2',
        attireIds: [UUID, '00000000-0000-4000-8000-000000000001'],
        description: null,
      },
      {
        kind: 'print',
        quantity: 4,
        printSizeId: UUID,
        frameId: null,
        attireIds: [UUID],
        description: null,
      },
      {
        kind: 'privilege',
        quantity: null,
        printSizeId: null,
        frameId: null,
        attireIds: [UUID],
        description: 'Usage of Toga and Hood',
      },
    ],
  };

  it('parses a full save: frames carry tokens, inclusions reference them', () => {
    const result = createServicePackageSchema.safeParse(savePayload);
    expect(result.success).toBe(true);
  });

  it('parses without coverImageKey (no cover at create)', () => {
    const result = createServicePackageSchema.safeParse(savePayload);
    expect(result.success).toBe(true);
    if (result.success) expect('coverImageKey' in result.data).toBe(false);
  });

  it('rejects coverImageKey: null on create (absent-or-staging-key; the null clear is update-only)', () => {
    const result = createServicePackageSchema.safeParse({ ...savePayload, coverImageKey: null });
    expect(result.success).toBe(false);
  });

  it('update requires slug; coverImageKey is presence-encoded (string/null/absent)', () => {
    expect(updateServicePackageSchema.safeParse({ ...savePayload, slug: 'deluxe-package' }).success).toBe(true);
    expect(
      updateServicePackageSchema.safeParse({
        ...savePayload,
        slug: 'deluxe-package',
        coverImageKey: 'tmp/00000000-0000-4000-8000-000000000000.jpg',
      }).success
    ).toBe(true);
    expect(
      updateServicePackageSchema.safeParse({ ...savePayload, slug: 'deluxe-package', coverImageKey: null }).success
    ).toBe(true);
    expect(updateServicePackageSchema.safeParse(savePayload).success).toBe(false);
  });

  it('rejects a framed_picture whose frameId is not a frames[] token', () => {
    const result = createServicePackageSchema.safeParse({
      ...savePayload,
      inclusions: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeId: UUID,
          frameId: 'frame-9',
          attireIds: [UUID],
          description: null,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a framed_picture without frameId', () => {
    const result = createServicePackageSchema.safeParse({
      ...savePayload,
      inclusions: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeId: UUID,
          frameId: null,
          attireIds: [UUID],
          description: null,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a print carrying frameId (only framed_picture carries one)', () => {
    const result = createServicePackageSchema.safeParse({
      ...savePayload,
      inclusions: [
        {
          kind: 'print',
          quantity: 4,
          printSizeId: UUID,
          frameId: 'frame-1',
          attireIds: [UUID],
          description: null,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate frame tokens', () => {
    const result = createServicePackageSchema.safeParse({
      ...savePayload,
      frames: [{ id: 'frame-1' }, { id: 'frame-1' }],
    });
    expect(result.success).toBe(false);
  });

  it('servicePackageReadSchema parses the canonical read; strips coverImageKey from the output (coverImageUrl is the wire field)', () => {
    const parsed = servicePackageReadSchema.parse({
      ...fullRow,
      coverImageUrl: 'https://pub-0000.r2.dev/covers/00000000-0000-4000-8000-000000000000.jpg',
      coverImageKey: 'covers/00000000-0000-4000-8000-000000000000.jpg',
      inclusions: [
        {
          id: UUID,
          kind: 'framed_picture',
          quantity: 1,
          frameId: UUID,
          description: null,
          createdAt: '2026-08-31T00:00:00.000Z',
          updatedAt: '2026-08-31T00:00:00.000Z',
          printSize: { id: UUID, code: '8R', description: '8R print' },
          attires: [{ id: UUID, name: 'Toga' }],
        },
      ],
      frames: [{ id: UUID, frameNumber: 1 }],
    });
    expect('coverImageKey' in parsed).toBe(false);
    expect(parsed.coverImageUrl).toBe(
      'https://pub-0000.r2.dev/covers/00000000-0000-4000-8000-000000000000.jpg'
    );
  });

  it('servicePackageReadSchema parses a null coverImageUrl (no cover)', () => {
    const result = servicePackageReadSchema.safeParse({
      ...fullRow,
      coverImageUrl: null,
      inclusions: [],
      frames: [],
    });
    expect(result.success).toBe(true);
  });
});

describe('packageSaveInclusionSchema (the inclusion row inside the save)', () => {
  it('rejects an unknown kind', () => {
    const result = packageSaveInclusionSchema.safeParse({
      kind: 'souvenir',
      quantity: 2,
      printSizeId: null,
      frameId: null,
      attireIds: [UUID],
      description: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer quantity', () => {
    const result = packageSaveInclusionSchema.safeParse({
      kind: 'print',
      quantity: 2.5,
      printSizeId: UUID,
      frameId: null,
      attireIds: [UUID],
      description: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a picture payload without attireIds (path pinned)', () => {
    const result = packageSaveInclusionSchema.safeParse({
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: UUID,
      frameId: 'frame-1',
      attireIds: [],
      description: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['attireIds']);
    }
  });

  it('accepts a privilege payload carrying attireIds — both granted and empty (seed reality)', () => {
    const granted = packageSaveInclusionSchema.safeParse({
      kind: 'privilege',
      quantity: null,
      printSizeId: null,
      frameId: null,
      attireIds: [UUID],
      description: 'Usage of Toga and Hood',
    });
    const ungranted = packageSaveInclusionSchema.safeParse({
      kind: 'privilege',
      quantity: null,
      printSizeId: null,
      frameId: null,
      attireIds: [],
      description: 'High Resolution soft copies',
    });
    expect(granted.success).toBe(true);
    expect(ungranted.success).toBe(true);
  });
});
```

- [✅] **Step 2: Trim the dead create-schema tests from inclusion.test.ts and frames.test.ts**

In `inclusion.test.ts`: change the import to `{ packageInclusionSchema }` (drop `createPackageInclusionSchema`) and DELETE these five tests — `'rejects an unknown kind'`, `'rejects a non-integer quantity'` (both inside `describe('packageInclusionSchema')`; their semantics moved to the `packageSaveInclusionSchema` block above), and the entire `describe('createPackageInclusionSchema attire rule', …)` block (3 tests — the ≥1-attire rule moved with the path assertion; the frame-token rules live at the package level). The file keeps `describe('packageInclusionSchema')` (3 tests) + `describe('resolvedInclusionSchema')` (2 tests) = **5 tests**.
In `frames.test.ts`: change the import to `{ frameSchema }` and DELETE the entire `describe('createFrameSchema', …)` block (2 tests) — the save payload's frame is `packageSaveFrameSchema`. The file keeps **2 tests**.

- [✅] **Step 3: Run the types suite to verify the new tests fail**

Run: `pnpm --filter @sevendays/types test`
Expected: FAIL — the new package describe blocks fail (`servicePackageReadSchema`, `packageSaveInclusionSchema`, `updateServicePackageSchema` unresolved; the reshaped-create expectations mismatch), while the trimmed inclusion/frames files pass.

- [✅] **Step 4: Implement — reshape package.ts, delete the dead exports**

In `packages/types/src/package.ts`:

(a) REPLACE the existing `createServicePackageSchema`/`CreateServicePackageInput` block (the `servicePackageSchema.omit({ id: true, slug: true, createdAt: true, updatedAt: true })` definition) with:

```ts
// The atomic package save (M5 § Mutation shapes): POST/PUT carries entity
// fields + coverImageKey + frames[] + inclusions[] in ONE payload — the
// inclusions editor is a screen, not a resource. Array order is the order:
// frameNumber = frames array order, inclusion position = array order
// (server-side, #137).
//
// Frame identity in the payload is a client-assigned string TOKEN: the
// editor echoes existing frame uuids from the read (resolvedFrameSchema.id)
// and mints fresh tokens for new frames; the server rewrites real frame
// rows. Tokens are strings, not uuids, by design.
export const packageSaveFrameSchema = z.object({
  id: z.string().min(1),
});

export type PackageSaveFrame = z.infer<typeof packageSaveFrameSchema>;

// One inclusion row inside the save. frameId references a frames[] token
// (framed_picture only — membership is enforced at the package level below,
// where the token set exists). attireIds is a required array: full-object,
// possibly empty (privileges with no grant; picture kinds need ≥1, enforced
// here where the path is the inclusion's own).
export const packageSaveInclusionSchema = z
  .object({
    kind: packageInclusionKindSchema,
    quantity: z.number().int().positive().nullable(),
    printSizeId: z.uuid().nullable(),
    frameId: z.string().min(1).nullable().optional(),
    attireIds: z.array(z.uuid()),
    description: z.string().min(1).nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'privilege') return;
    if (value.attireIds.length < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['attireIds'],
        message: `${value.kind} inclusions require at least one attire`,
      });
    }
  });

export type PackageSaveInclusionInput = z.infer<typeof packageSaveInclusionSchema>;

export const createServicePackageSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    priceCents: z.number().int().nonnegative(),
    // The catalog specifies no durations and availability (ADR-0005) ignores
    // duration — nullable until the client supplies real values.
    durationMinutes: z.number().int().positive().nullable(),
    isActive: z.boolean().default(true),
    // Home-page featured strip flag; the CMS editor owns it from M5 on.
    isFeatured: z.boolean().default(false),
    // Media-bind field (ADR-0019): a fresh STAGING key just uploaded via
    // presign. Absent = no cover at create. Presence-encoded by design —
    // reads never echo keys, so there is no full-object echo to make.
    coverImageKey: z.string().min(1).optional(),
    frames: z.array(packageSaveFrameSchema),
    inclusions: z.array(packageSaveInclusionSchema),
  })
  .superRefine((pkg, ctx) => {
    const tokens = new Set(pkg.frames.map((frame) => frame.id));
    if (tokens.size !== pkg.frames.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['frames'],
        message: 'frame tokens must be unique',
      });
    }
    for (const [i, inclusion] of pkg.inclusions.entries()) {
      if (inclusion.kind === 'framed_picture') {
        if (!inclusion.frameId) {
          ctx.addIssue({
            code: 'custom',
            path: ['inclusions', i, 'frameId'],
            message: 'framed_picture inclusions require a frame token',
          });
        } else if (!tokens.has(inclusion.frameId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['inclusions', i, 'frameId'],
            message: 'frameId must reference a frames[] token',
          });
        }
      } else if (inclusion.frameId != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['inclusions', i, 'frameId'],
          message: 'only framed_picture inclusions carry a frameId',
        });
      }
    }
  });

export type CreateServicePackageInput = z.infer<typeof createServicePackageSchema>;

// Full-object PUT plus the advanced fields: slug is server-generated at
// create (#137 calls slugifyName) and editable here behind the break-links
// warning; coverImageKey gains the null-clear case (string = bind/replace
// via a fresh staging key, null = clear, absent = unchanged).
export const updateServicePackageSchema = createServicePackageSchema.extend({
  slug: z.string().min(1),
  coverImageKey: z.string().min(1).nullable().optional(),
});

export type UpdateServicePackageInput = z.infer<typeof updateServicePackageSchema>;
```

(The file's existing import from `./inclusion.js` gains `packageInclusionKindSchema` alongside `packageInclusionSchema` if not already present.)

(b) Append the canonical read shape at **file end**, after the `ServicePackageWithInclusions` type — it composes `resolvedInclusionSchema`/`resolvedFrameSchema`, which the file defines BELOW the create block's position; placing it in the create block's spot would be a TDZ `ReferenceError` at module load:

```ts
// The canonical read shape (M5, ADR-0019): the wire never carries the raw R2
// object key — every read resolves coverImageUrl against MEDIA_PUBLIC_BASE_URL
// at read time (#136/#137's wiring, #138's swap). Admin reads (deactivated
// rows included) and public reads share this shape; trim rules are
// content-level (#138), not shape-level.
export const servicePackageReadSchema = servicePackageSchema
  .omit({ coverImageKey: true })
  .extend({
    coverImageUrl: z.url().nullable(),
    inclusions: z.array(resolvedInclusionSchema),
    frames: z.array(resolvedFrameSchema),
  });

export type ServicePackageRead = z.infer<typeof servicePackageReadSchema>;
```

(c) In `packages/types/src/inclusion.ts`, DELETE the `createPackageInclusionSchema` definition and `CreatePackageInclusionInput` type (the whole block from `export const createPackageInclusionSchema` through the type export). The row schema, kind enum, and their types stay.

(d) In `packages/types/src/frames.ts`, DELETE the `createFrameSchema` definition and `CreateFrameInput` type. The row schema stays.

- [✅] **Step 5: Run the types suite to verify it passes, then rebuild + blast-radius check + commit**

Run: `pnpm --filter @sevendays/types test`
Expected: PASS — **12 files / 105 tests** (Task 4's 98 + 14 new package tests − 5 trimmed inclusion tests − 2 trimmed frame tests = 105).
Run: `pnpm --filter @sevendays/types build && pnpm build:packages` then `pnpm typecheck` (whole repo — proves no consumer referenced the deleted exports) and `pnpm --filter @sevendays/api test` (103/13 — the api suite's fixtures carry `coverImageKey: null` on ROW fixtures, which the unchanged row schema still parses).
Run `pnpm --filter @sevendays/types fix`, then commit:

```bash
git add packages/types/src
git commit -m "feat(types): atomic package-save payload + canonical read shape (coverImageUrl) (#135)"
```

---

### Task 6: The api schema-contract suite (a canonical entity round-trips each schema pair)

**Files:**
- Create: `apps/api/test/cms-schema-contracts.test.ts`

**Interfaces:**
- Consumes: every Task 4–5 export from `@sevendays/types` (via the built `dist/` — `pnpm build:packages` is current from Task 5).
- Produces: the ticket's AC test — "a canonical entity round-trips each schema pair" — for all nine entities plus the matrix/order payloads and the two update schemas that differ from create. **18 tests** (9 round-trips + 2 wire-rename + 2 matrix + 3 order + 2 update-shapes), taking the api suite 103 → **121 tests / 13 → 14 files**.

**Not here:** any DB row or route call (the write model's behavioral proofs — uniqueness 400s, the atomic save's transaction, trim rules — are #137/#138's integration suites; this file is pure Zod over pinned fixtures but rides the api suite per the ticket's AC, so the write model's vocabulary is guarded where the write model lives); mutations of the tested schemas (fixtures only).

- [✅] **Step 1: Write the contract suite**

`apps/api/test/cms-schema-contracts.test.ts`:

```ts
// Schema-contract tests (ticket #135 AC): a canonical entity round-trips each
// create/read schema pair — parse the create payload (asserting the parsed
// output drops every server-assigned field), then complete the server-assigned
// fields by hand and parse the read shape. Pure Zod over pinned fixtures: no
// DB rows, no routes (global-setup still runs — the suite's standing posture).
import {
  addonServiceSchema,
  attireSchema,
  branchSchema,
  createAddonServiceSchema,
  createAttireSchema,
  createBranchSchema,
  createGalleryCategorySchema,
  createGalleryPhotoSchema,
  createPrintSizeSchema,
  createServicePackageSchema,
  createStudioServiceSchema,
  createTestimonialSchema,
  galleryCategoryOrderSchema,
  galleryCategorySchema,
  galleryPhotoOrderSchema,
  galleryPhotoSchema,
  galleryReadSchema,
  printSizeSchema,
  servicePackageReadSchema,
  studioServiceBranchMatrixSchema,
  studioServiceAddonMatrixSchema,
  studioServiceSchema,
  testimonialOrderSchema,
  testimonialSchema,
  updateGalleryPhotoSchema,
  updateServicePackageSchema,
} from '@sevendays/types';
import { describe, expect, it } from 'vitest';

const UUID = '00000000-0000-4000-8000-000000000000';
const UUID2 = '00000000-0000-4000-8000-000000000001';
const DATE = '2026-09-25T00:00:00.000Z';
const COVER_URL = 'https://pub-0000.r2.dev/covers/00000000-0000-4000-8000-000000000000.jpg';
const PHOTO_URL = 'https://pub-0000.r2.dev/gallery/00000000-0000-4000-8000-000000000000.jpg';

describe('create→read round-trips (the canonical fixtures, all nine entities)', () => {
  it('branch: create drops id/timestamps; a deactivated row parses the read (admin reads include them)', () => {
    const parsed = createBranchSchema.parse({
      name: 'Fourth Branch',
      address: '123 New Street',
      phone: '+63 900 000 004',
      acceptsWalkIns: true,
      isActive: false,
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
    const read = branchSchema.safeParse({
      id: UUID,
      name: 'Fourth Branch',
      address: '123 New Street',
      phone: '+63 900 000 004',
      acceptsWalkIns: true,
      isActive: false,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('print size: create drops server fields; a deactivated row parses the read', () => {
    const parsed = createPrintSizeSchema.parse({
      code: 'A4',
      description: 'A4 print',
      isActive: false,
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    const read = printSizeSchema.safeParse({
      id: UUID,
      code: 'A4',
      description: 'A4 print',
      isActive: false,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('attire: create drops server fields; a deactivated row parses the read', () => {
    const parsed = createAttireSchema.parse({ name: 'Barong', isActive: false, id: UUID });
    expect('id' in parsed).toBe(false);
    const read = attireSchema.safeParse({
      id: UUID,
      name: 'Barong',
      isActive: false,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('add-on service: create drops server fields; the row read parses', () => {
    const parsed = createAddonServiceSchema.parse({
      name: 'Hair Styling',
      description: 'Professional styling',
      priceCents: 15000,
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    const read = addonServiceSchema.safeParse({
      id: UUID,
      name: 'Hair Styling',
      description: 'Professional styling',
      priceCents: 15000,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('studio service: create drops server fields; the embedded read parses', () => {
    const parsed = createStudioServiceSchema.parse({
      name: 'Photo Restoration',
      description: 'Restore old photographs',
      priceCents: 50000,
      id: UUID,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    const read = studioServiceSchema.safeParse({
      id: UUID,
      name: 'Photo Restoration',
      description: 'Restore old photographs',
      priceCents: 50000,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('gallery category: create drops id/position/timestamps (position is never client-supplied)', () => {
    const parsed = createGalleryCategorySchema.parse({
      name: 'Graduation',
      id: UUID,
      position: 2,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    const read = galleryCategorySchema.safeParse({
      id: UUID,
      name: 'Graduation',
      position: 2,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('gallery photo: create is the spec payload { r2Key, title?, caption?, categoryId? }; the admin read carries photoUrl', () => {
    const parsed = createGalleryPhotoSchema.parse({
      r2Key: 'tmp/00000000-0000-4000-8000-000000000000.jpg',
      title: 'Toga portrait',
      caption: null,
      categoryId: UUID2,
      id: UUID,
      position: 1,
      photoUrl: PHOTO_URL,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    expect('photoUrl' in parsed).toBe(false);
    const read = galleryPhotoSchema.safeParse({
      id: UUID,
      title: 'Toga portrait',
      caption: null,
      categoryId: UUID2,
      position: 1,
      isActive: true,
      photoUrl: PHOTO_URL,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('testimonial: create drops id/position/timestamps; the row read parses', () => {
    const parsed = createTestimonialSchema.parse({
      quote: 'The photos came out better than we hoped.',
      person: 'Maria, batch 2026',
      id: UUID,
      position: 1,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    const read = testimonialSchema.safeParse({
      id: UUID,
      quote: 'The photos came out better than we hoped.',
      person: 'Maria, batch 2026',
      position: 1,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });

  it('service package: the full save payload (frame tokens) parses and drops id/slug/timestamps; the canonical read parses', () => {
    const save = {
      name: 'Deluxe Package',
      description: 'The full graduation set.',
      priceCents: 150000,
      durationMinutes: null,
      isFeatured: false,
      isActive: true,
      coverImageKey: 'tmp/00000000-0000-4000-8000-000000000001.jpg',
      frames: [{ id: 'frame-1' }],
      inclusions: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeId: UUID2,
          frameId: 'frame-1',
          attireIds: [UUID],
          description: null,
        },
      ],
      id: UUID,
      slug: 'should-be-ignored',
      createdAt: DATE,
      updatedAt: DATE,
    };
    const created = createServicePackageSchema.parse(save);
    expect('id' in created).toBe(false);
    expect('slug' in created).toBe(false);
    expect('createdAt' in created).toBe(false);
    const read = servicePackageReadSchema.safeParse({
      id: UUID,
      name: 'Deluxe Package',
      description: 'The full graduation set.',
      priceCents: 150000,
      durationMinutes: null,
      isActive: true,
      isFeatured: false,
      slug: 'deluxe-package',
      coverImageUrl: COVER_URL,
      inclusions: [
        {
          id: UUID,
          kind: 'framed_picture',
          quantity: 1,
          frameId: UUID2,
          description: null,
          createdAt: DATE,
          updatedAt: DATE,
          printSize: { id: UUID2, code: '11x14', description: '11x14 print' },
          attires: [{ id: UUID, name: 'Toga' }],
        },
      ],
      frames: [{ id: UUID2, frameNumber: 1 }],
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(read.success).toBe(true);
  });
});

describe('the wire rename (ADR-0019: no read shape exposes a raw R2 key)', () => {
  it('the package read strips coverImageKey and the photo read strips r2Key from their parsed outputs', () => {
    const pkg = servicePackageReadSchema.parse({
      id: UUID,
      name: 'Basic Package',
      description: 'Entry graduation portrait package.',
      priceCents: 90000,
      durationMinutes: null,
      isActive: true,
      isFeatured: false,
      slug: 'basic-package',
      coverImageUrl: COVER_URL,
      coverImageKey: 'covers/00000000-0000-4000-8000-000000000000.jpg',
      inclusions: [],
      frames: [],
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('coverImageKey' in pkg).toBe(false);
    const photo = galleryPhotoSchema.parse({
      id: UUID,
      title: null,
      caption: null,
      categoryId: null,
      position: 1,
      isActive: true,
      photoUrl: PHOTO_URL,
      r2Key: 'gallery/00000000-0000-4000-8000-000000000000.jpg',
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect('r2Key' in photo).toBe(false);
  });

  it('the public gallery read parses the assembled payload (categories + categorized photos)', () => {
    const result = galleryReadSchema.safeParse({
      categories: [{ id: UUID2, name: 'Graduation' }],
      photos: [{ id: UUID, photoUrl: PHOTO_URL, title: null, categoryId: UUID2 }],
    });
    expect(result.success).toBe(true);
  });
});

describe('matrix payloads (full-replace PUTs keyed by the studio service)', () => {
  it('studioServiceBranchMatrixSchema parses { branchIds }; rejects a non-uuid entry', () => {
    expect(studioServiceBranchMatrixSchema.safeParse({ branchIds: [UUID, UUID2] }).success).toBe(true);
    expect(studioServiceBranchMatrixSchema.safeParse({ branchIds: ['not-a-uuid'] }).success).toBe(false);
  });

  it('studioServiceAddonMatrixSchema parses { addonServiceIds }; rejects a non-uuid entry', () => {
    expect(studioServiceAddonMatrixSchema.safeParse({ addonServiceIds: [UUID] }).success).toBe(true);
    expect(studioServiceAddonMatrixSchema.safeParse({ addonServiceIds: ['not-a-uuid'] }).success).toBe(false);
  });
});

describe('collection order payloads (one full-replace order PUT per collection)', () => {
  it('galleryPhotoOrderSchema parses { photoIds }; rejects a non-uuid entry', () => {
    expect(galleryPhotoOrderSchema.safeParse({ photoIds: [UUID, UUID2] }).success).toBe(true);
    expect(galleryPhotoOrderSchema.safeParse({ photoIds: ['not-a-uuid'] }).success).toBe(false);
  });

  it('galleryCategoryOrderSchema parses { categoryIds }; rejects a non-uuid entry', () => {
    expect(galleryCategoryOrderSchema.safeParse({ categoryIds: [UUID] }).success).toBe(true);
    expect(galleryCategoryOrderSchema.safeParse({ categoryIds: ['not-a-uuid'] }).success).toBe(false);
  });

  it('testimonialOrderSchema parses { testimonialIds }; rejects a non-uuid entry', () => {
    expect(testimonialOrderSchema.safeParse({ testimonialIds: [UUID] }).success).toBe(true);
    expect(testimonialOrderSchema.safeParse({ testimonialIds: ['not-a-uuid'] }).success).toBe(false);
  });
});

describe('the two update schemas that differ from create', () => {
  it('updateServicePackageSchema requires slug and takes coverImageKey as string/null/absent', () => {
    const base = {
      name: 'Deluxe Package',
      description: 'The full graduation set.',
      priceCents: 150000,
      durationMinutes: null,
      frames: [],
      inclusions: [],
    };
    expect(updateServicePackageSchema.safeParse({ ...base, slug: 'deluxe-package' }).success).toBe(true);
    expect(
      updateServicePackageSchema.safeParse({
        ...base,
        slug: 'deluxe-package',
        coverImageKey: 'tmp/00000000-0000-4000-8000-000000000000.jpg',
      }).success
    ).toBe(true);
    expect(
      updateServicePackageSchema.safeParse({ ...base, slug: 'deluxe-package', coverImageKey: null }).success
    ).toBe(true);
    expect(updateServicePackageSchema.safeParse(base).success).toBe(false);
  });

  it('updateGalleryPhotoSchema requires the full metadata fields; r2Key is the optional replace field', () => {
    const full = { title: null, caption: 'Studio batch 1', categoryId: UUID2, isActive: false };
    expect(updateGalleryPhotoSchema.safeParse(full).success).toBe(true);
    expect(
      updateGalleryPhotoSchema.safeParse({ ...full, r2Key: 'tmp/00000000-0000-4000-8000-000000000000.jpg' })
        .success
    ).toBe(true);
    expect(updateGalleryPhotoSchema.safeParse({ ...full, title: undefined }).success).toBe(false);
  });
});
```

- [✅] **Step 2: Run the suite to verify it passes, then commit**

Run: `pnpm --filter @sevendays/api test`
Expected: PASS — **14 files / 121 tests** (103 + 18 here: 9 round-trips + 2 wire-rename + 2 matrix + 3 order + 2 update-shapes). If any contract test fails, the schema drifted from this plan — fix the schema, not the test.
Run `pnpm --filter @sevendays/api fix`, then commit:

```bash
git add apps/api/test/cms-schema-contracts.test.ts
git commit -m "test(api): schema-contract suite — every entity round-trips its schema pair (#135)"
```

---

### Task 7: Full gates, docs rotation, PR/merge, the v1 pick + ledger row, issue close

**Files:**
- Modify: `docs/plan.md` (M5 checkbox 2), `docs/progress.md`, `AGENTS.md` (the migration-count line), `docs/agents/v1-picks.md` (ledger row — post-merge), `graphify-out/` (regenerated)

**Interfaces:**
- Consumes: Tasks 1–6 landed on the branch; the v1-picks runbook `docs/agents/v1-picks.md` (current through `8142d41`).
- Produces: main carrying the schema/types + all suites green; `docs/plan.md` M5 checkbox 2 ticked with a dated annotation; progress.md rotated; the v1 branch carrying the pick (code paths only) with a ledger row; issue #135 closed with the AC checklist ticked.

**Not here:** M5 checkboxes 1/3+ (siblings' — stay unticked); the milestone-close docs rotation (#143 — tech-stack/AGENTS status flips beyond the migration-count line); the seed-contract runbook note (#143); any deploy expectation (no deployed surface changed — the API's routes and responses are byte-identical; CI's merge legs are the only deploys).

- [✅] **Step 1: The full gate**

Run: `docker compose up -d db` (idempotent), then `pnpm check`.
Expected: **35/35 turbo tasks green** — types **12 files / 105 tests**, db **22 passed | 8 skipped**, api **14 files / 121 tests**, landing suite unchanged, admin no-op (known). Reconcile any count mismatch before proceeding.

- [✅] **Step 2: Regenerate the graph**

Run: `graphify update .` — include `graphify-out/` in the docs commit below.

- [✅] **Step 3: Rotate the docs (three surgical edits + the session record)**

(a) `docs/plan.md` — tick M5 checkbox 2. Replace:

```text
- [ ] Schema + migrations: `gallery_categories`/`gallery_photos`/`testimonials` tables; `is_active` on branches/print sizes/attires; `position` on inclusions + the attire junction; backfills (lookups active, positions from id order); `packages/types` Zod schemas with the `coverImageUrl`/`photoUrl` wire rename
```

with (fill the migration suffixes from the actual generated names and today's date):

```text
- [✅] Schema + migrations: `gallery_categories`/`gallery_photos`/`testimonials` tables; `is_active` on branches/print sizes/attires; `position` on inclusions + the attire junction; backfills (lookups active, positions from id order); `packages/types` Zod schemas with the `coverImageUrl`/`photoUrl` wire rename _(2026-09-XX: ticket #135 landed — migrations `0006_<slug>`/`0007_<slug>` generated + applied to live (born-NOT-NULL DEFAULT 1 → idempotent backfill script → DROP DEFAULT; no SET NOT NULL anywhere — the api global-setup migrates before its clean-slate truncate with no teardown, so a nullable→flip pair would strand leftover compose rows); backfill verified live (lookups all active; positions contiguous 1..N per package/inclusion from today's id/created_at order); `packages/types` ships create/update pairs for all nine entities, the `{branchIds}`/`{addonServiceIds}` matrix payloads, the three order payloads, admin + public read shapes incl. presence-encoded `coverImageKey`/`r2Key` inputs and the `coverImageUrl`/`photoUrl` reads; api suite +18 schema-contract tests, 103→121.)_
```

(b) `AGENTS.md` — update the migration count. Replace:

```text
`packages/db`'s client works against the live Supabase database (migrations 0000–0005 applied, catalog seeded + verified).
```

with:

```text
`packages/db`'s client works against the live Supabase database (migrations 0000–0007 applied, catalog seeded + verified; the M5 gallery/testimonials tables exist, CMS-born-empty).
```

(c) `docs/progress.md` — four edits:

1. Insert a new dated paragraph immediately after `# Progress` (before the 2026-09-25 #133 paragraph), following the house session-record pattern — content: ticket #135 landed; migrations `0006_*`/`0007_*` via the house flow (record actual names) with the default-variant backfill ruling and WHY (the no-teardown global-setup finding); live backfill verified (the seven `[ok]` lines incl. lookups-active); `packages/types` vocabulary summary (nine create/update pairs incl. the frame-token atomic package save, matrix + order payloads, admin/public read shapes, the ADR-0019 wire rename with presence-encoded media keys); suites: types 70→104, db +2, api 103→119 (+16 contract tests); catalog-rows builders supply positions (seed + fixtures through one module); the existing read shapes untouched (#138's swap); v1 pick + ledger row (record the v1 SHA).
2. In Known Gaps, resolve watch-item (b) — append to the end of the `(b) the `package_inclusion_attires` junction has no position column …` sentence (after `(a later migration).`):

```text
 **Resolved 2026-09-XX (#135): both `package_inclusions` and the junction carry 1-based `position` (migrations 0006/0007, backfilled from today's render order — inclusions by id, junctions by (created_at, id)); the reads still key on id/created_at until #138 switches the assembly to (position, id).**
```

3. In Immediate Next Steps, replace `**#135** (catalog schema + shared types) is takeable now.` with `**#136** (media foundation) is takeable next — **#135** (catalog schema + shared types) landed 2026-09-XX.`
4. Update the trailing `_Last updated: …` line to carry this ticket's landing (date + one clause).

- [✅] **Step 4: Commit the docs + open the PR + squash-merge**

```bash
git add docs/plan.md docs/progress.md AGENTS.md graphify-out
git commit -m "docs: M5 ticket 01 close-out — plan tick, progress rotation, migration count (#135)"
```

Then `gh pr create --title "M5 ticket 01 — catalog schema + shared types" --body-file <evidence>/pr-body.md` — the PR body states: the AC checklist (all four, each with its evidence pointer — migration journal lines, the backfill `GATE: PASS` output, the export list, the suite counts); the no-deployed-surface-change note (routes and responses byte-identical; CI merge legs are the proof); the evidence dir path. Then squash-merge (`gh pr merge --squash --delete-branch`), watch both CI legs green (`Deploy teaser (main)` + `Deploy v1 (private)`).

- [✅] **Step 5: The v1 pick + ledger row (post-merge, per `docs/agents/v1-picks.md`)**

On a fresh local `v1` from `origin/v1`: classify the squash commit (expect **SPLIT** — v1-paths: the `packages/db` schema files + migrations + `catalog-rows.*` + `backfill-positions.mjs`, the `packages/types` files, `apps/api/test/helpers/truncate.test.ts` + `fixtures.ts` + `cms-schema-contracts.test.ts`, `service-packages.ts` comment hunks; main-only: docs, `plan.md`, the plan file, `graphify-out/`). Content pass: expect CLEAN (schema/types work carries none of the 18 audit tokens — verify with `node scripts/audit-v1-absence.mjs` expecting PASS 0/18). Apply the v1-paths (migrations carried **WITHOUT re-migrate** — the editions share the live DB, already migrated from main; the #118 precedent); no lockfile change (no deps moved). Locks: `pnpm install --frozen-lockfile` → `pnpm build:packages` → `pnpm --filter @sevendays/api build` → `pnpm check` → `pnpm build` green on v1; audit PASS; the CI run green (`Deploy v1 (private)` success, `Deploy teaser (main)` skipped). Append the ledger row (verdict `split`, the v1 pick SHA, notes: clean-pick content per the spec's v1 posture; migrations not re-migrated; the backfill script carried for fresh-environment parity but inert — v1's seed supplies positions through the builders). Push v1.

- [✅] **Step 6: Close the ticket**

`gh issue close 135 --comment …` — the comment ticks all four AC boxes with evidence pointers (migration names + journal, backfill `GATE: PASS` (run twice), the export inventory, `pnpm check` 35/35 with the three suite counts) and names the PR + pick SHAs. Then `git checkout main && git pull`, and this plan's own checkboxes are already ticked per-task by the executor.

---

## Self-Review (recorded at planning, 2026-09-25)

- **Spec coverage:** § Schema and migrations (Task 1 + 3 — every table, column, and backfill the section names); § Mutation shapes create/update for all nine entities (Tasks 4–5; the matrix payloads Task 4; order payloads Tasks 4; the atomic save + wire rename Task 5); the ticket's four ACs (migrations applied + backfills verified — Tasks 1/3; types exports — Tasks 4/5; no read shape exposes a raw key — Task 5's read shapes + Task 6's strip proofs; api schema-contract tests — Task 6; `pnpm check` green — Task 7). Trim rules / assembly ordering / slug generation / presign are explicitly fenced to #137/#138.
- **Counts (re-derived from the test blocks above):** types 70 → +12 gallery +6 testimonial +3 attire +3 print-size +1 addon +3 studio (Task 4: 98) → +14 package −5 inclusion −2 frames (Task 5: **105**); db catalog-rows 20 → 22 (suite 22 passed | 8 skipped); api 103 → **121** / 14 files (Task 6: 18 its — 9 round-trips + 2 wire-rename + 2 matrix + 3 order + 2 update-shapes). The header's baseline line, each task's gate line, and Task 7's plan.md annotation all state these same numbers.
- **Type consistency:** `packageSaveFrameSchema`/`packageSaveInclusionSchema`/`servicePackageReadSchema` names match between Task 5's implementation, its tests, Task 6's contract suite, and the Interfaces blocks; `z.url()` field names (`coverImageUrl`, `photoUrl`) match the spec's wire-rename vocabulary; builder output fields (`position`) match the drizzle columns added in Task 1.
- **No placeholders:** every code block is complete; the only executor-filled values are the generated migration suffixes and dates, each explicitly marked at its use site.


---

## Execution amendments (recorded at close-out, 2026-09-25)

The SDD execution (six implementer tasks + one fix round, MAX reviews per task and a final whole-branch review — all PASS) landed four rulings this file's text predates:

1. **D1 — Task 4's gate missed the landing fixtures.** `branchSchema`'s `isActive` addition made the field output-required (`z.infer`), breaking three landing test fixtures typed against the output shape. Task 4's blast-radius gate ran the suites but not the whole-repo typecheck, so the break surfaced in Task 5's gate (verified pre-existing at Task 4's HEAD via stash). Fixed in fix round 1 (`fix(landing): branch fixtures gain isActive…`) — three one-line insertions — and the whole-repo typecheck is now a standing gate for every task touching `packages/types` schemas.
2. **D2 — Task 6 gained a 19th test** (controller amendment from the Task 5 review): `updateServicePackageSchema` with duplicate frame tokens must fail, pinning refine-on-update. The api count is therefore **122**, not the 121 this plan's Global Constraints state (types 105 stands).
3. **T5 deviation (review-verified sound):** the update schema is built zod-4 refine-last (unrefined private base + one shared `refinePackageSave` applied to both create and update) rather than this file's `.extend()`-after-`.superRefine()` chain — the worker hit type/module-load resistance the controller's plain-node probe did not reproduce; the landed shape is semantically identical and test-pinned.
4. **Live-DB sequence:** the controller (not the workers) ran every live-Supabase step — check-env gate, `db:migrate` for 0006/0007, and the backfill (run twice, GATE: PASS both) — because workers never touch `.env`. The worker-side order (drop default + generate 0007 locally before the live backfill) preserved the plan's only live constraint: backfill verified before 0007 applied.
