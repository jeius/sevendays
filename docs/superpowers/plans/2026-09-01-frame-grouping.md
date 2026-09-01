# Frame Grouping (Frames Table) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give catalog frames first-class identity — a `frames` table seeded from the catalog's Frame lines, with `package_inclusions.frame_id` linking each framed picture to its frame — per the 2026-09-01 grill ruling (Q1–Q6 as recommended).

**Architecture:** A new `frames` table (`id`, `service_package_id` FK, `frame_number` int) with unique `(service_package_id, frame_number)`; additive migration `0001` against the applied-and-frozen `0000`. `package_inclusions` gains a nullable `frame_id` FK (set only on `framed_picture` rows; prints/privileges stay NULL). The seed upserts frames by natural key and rebuilds inclusions with `frame_id` resolved; the verify script adds a frames-count check plus frame-partition checks per package. Zod read/create schemas gain `frameId` (nullable). Docs: ADR-0010 + `Frame` glossary entry.

**Tech Stack:** Drizzle ORM ^0.45.2 (pg-core, relations), Zod ^4.5.1, tsx ^4.23.13 seed/verify scripts, postgres (postgres-js) client with `prepare: false`.

**Spec:** The 2026-09-01 grill decision (owner-confirmed in-session): frames are catalog templates (not fulfillment instances); table shape (1) — `frames` + nullable `frame_id` on inclusions; unlabeled frames numbered by listed order; `framed_picture` kind retained; folded into the M1.3 branch pre-PR with a scoped glm review. Catalog semantics source: `docs/catalog.md` line 8 ("A Frame can sometimes contain a single or multiple pictures"). Doc responsibilities: `apps/api/CONTEXT.md` owns the Frame glossary entry; `docs/catalog.md` stays verbatim.

## Global Constraints

- **Additive migration only.** `0000` is applied and frozen — Task 2 generates `0001_*.sql` via `db:generate`; never hand-edit `packages/db/migrations/**`; the `drizzle` schema journal row count goes 1 → 2 after apply.
- **Live DB is already provisioned and seeded.** Tasks 2 (apply) and 3–4 (reseed + verify) run against the live session-mode connection — `node --env-file=.env scripts/check-env.mjs` must print `GATE: PASS` before any of them; env values never printed.
- **Seed is re-runnable.** The frames upsert must be idempotent (natural key `(service_package_id, frame_number)`); inclusion rebuild stays delete-then-insert per package.
- **Secret safety:** never print any connection string; never touch `.env`/`.dev.vars` contents; drizzle-kit output redirected to a log file, tail-only quoting, never `cat` the log.
- **Biome-clean commits** (M1.3 ruling): `pnpm exec biome check --write` on every created/modified code file before committing; Biome canonical form outranks byte-exact plan copying.
- **Fresh-clone bootstrap precedes typecheck/tests** (dist-resolving exports): `pnpm install && pnpm build:packages` before any workspace gate.
- **Commit conventions:** unscoped conventional subjects, bullet bodies when wordy; every task ends in its own commit on `feat/m1.3-provision-migrate-seed`.
- **Zod v4 style:** top-level `z.uuid()` formats; unified `error` param; `safeParse` in tests; no `noUncheckedIndexedAccess` violations (guard destructures loudly, no `!` assertions).

---

## File Structure

```
packages/types/src/frames.ts                     (new)  Zod frame read/create schemas
packages/types/src/frames.test.ts                (new)  schema tests
packages/types/src/inclusion.ts                  (mod)  frameId on read/create shapes
packages/types/src/inclusion.test.ts             (mod)  frameId fixtures + tests
packages/types/src/index.ts                      (mod)  frames barrel export
packages/db/src/schema/frames.ts                 (new)  frames table + unique pair + FK index
packages/db/src/schema/package-inclusions.ts     (mod)  frame_id FK + index
packages/db/src/schema/relations.ts              (mod)  frames relations + inclusion.frame
packages/db/src/schema/index.ts                  (mod)  frames barrel export
packages/db/scripts/catalog.ts                   (mod)  frameNumber per framed picture (grouping from catalog headings)
packages/db/scripts/seed.ts                      (mod)  frames upsert + frameId resolution
packages/db/scripts/verify-seed.ts               (mod)  frames count + per-package frame-partition checks
docs/adr/0010-frame-grouping-via-frames-table.md (new)
apps/api/CONTEXT.md                              (mod)  Frame glossary entry
```

Task map: 1 — Zod frames schema (TDD); 2 — Drizzle frames table + `frame_id` FK + migration 0001 + live apply; 3 — seed: frameNumber in catalog, frames upsert, frameId resolution (live reseed); 4 — verify: frames count + frame-partition checks (live verify); 5 — ADR-0010 + glossary + handoff.

---

### Task 1: Zod — frames schema + `frameId` on inclusions (TDD)

**Files:**
- Create: `packages/types/src/frames.ts`
- Test: `packages/types/src/frames.test.ts`
- Modify: `packages/types/src/inclusion.ts`, `packages/types/src/inclusion.test.ts`, `packages/types/src/index.ts`

**Interfaces:**
- Produces: `frameSchema` (row shape: `id`, `servicePackageId`, `frameNumber`), `createFrameSchema` (create shape: `servicePackageId` + `frameNumber`, both required), types `PackageFrame` and `CreateFrameInput`; `packageInclusionSchema.frameId: z.uuid().nullable()` (required-nullable on the row shape); `createPackageInclusionSchema.frameId` optional+nullable. Later tasks consume: none programmatically (seed/verify scripts read the DB directly); these schemas serve M1.4 route validation and the CMS. The barrel exports `./frames.js`.

- [ ] **Step 1: Write the failing tests** — create `packages/types/src/frames.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { createFrameSchema, frameSchema } from './frames.js';

const UUID = '00000000-0000-4000-8000-000000000000';

describe('frameSchema', () => {
  it('parses a frame row', () => {
    const result = frameSchema.safeParse({
      id: UUID,
      servicePackageId: UUID,
      frameNumber: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects frameNumber 0 and negatives', () => {
    for (const n of [0, -1]) {
      const result = frameSchema.safeParse({
        id: UUID,
        servicePackageId: UUID,
        frameNumber: n,
      });
      expect(result.success).toBe(false);
    }
  });
});

describe('createFrameSchema', () => {
  it('parses a minimal create payload', () => {
    const result = createFrameSchema.safeParse({ servicePackageId: UUID, frameNumber: 2 });
    expect(result.success).toBe(true);
  });

  it('rejects a missing frameNumber', () => {
    const result = createFrameSchema.safeParse({ servicePackageId: UUID });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify RED** — `pnpm --filter @sevendays/types test -- frames` → FAIL: cannot resolve `./frames.js`.

- [ ] **Step 3: Write `packages/types/src/frames.ts`** with exactly:

```ts
import { z } from 'zod';

export const frameSchema = z.object({
  id: z.uuid(),
  servicePackageId: z.uuid(),
  frameNumber: z.number().int().min(1),
});

export type PackageFrame = z.infer<typeof frameSchema>;

export const createFrameSchema = frameSchema.omit({ id: true });
export type CreateFrameInput = z.infer<typeof createFrameSchema>;
```

- [ ] **Step 4: Extend `packages/types/src/inclusion.ts`** — after the `attireId` line add:

```ts
  // Frame identity (ADR-0010): which catalog frame this framed picture
  // belongs to — null for prints and privileges. Required-nullable on the
  // row shape; optional+nullable on the create shape.
  frameId: z.uuid().nullable(),
```

  and replace the `createPackageInclusionSchema` block with:

```ts
export const createPackageInclusionSchema = packageInclusionSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ frameId: z.uuid().nullable().optional() });

export type CreatePackageInclusionInput = z.infer<typeof createPackageInclusionSchema>;
```

- [ ] **Step 5: Update `packages/types/src/inclusion.test.ts`** — add `frameId: UUID` to every `framed_picture` fixture and `frameId: null` to every `print`/`privilege` fixture in `packageInclusionSchema` tests (the row shape is now required-nullable). Inside `describe('createPackageInclusionSchema', …)` add one test: parsing `{ kind: 'framed_picture', quantity: 1, printSizeId: UUID, attireId: UUID }` (no `frameId` key) succeeds — proving the create shape still accepts omitted frameId.

- [ ] **Step 6: GREEN + barrel** — `pnpm --filter @sevendays/types test` → all pass (4 new frame tests + updated inclusion tests); add `export * from './frames.js';` to `packages/types/src/index.ts` (alphabetical, after `attire.js`… note `branch.ts` sorts before `frames.js`: place between `branch.js` and `inclusion.js`); `pnpm --filter @sevendays/types build` succeeds.

- [ ] **Step 7: Commit**

```bash
git add packages/types/src/frames.ts packages/types/src/frames.test.ts packages/types/src/inclusion.ts packages/types/src/inclusion.test.ts packages/types/src/index.ts
git commit -m "feat(types): frame schemas and frameId on inclusions"
```

---

### Task 2: Drizzle — `frames` table, `frame_id` FK, migration 0001, live apply

**Files:**
- Create: `packages/db/src/schema/frames.ts`
- Modify: `packages/db/src/schema/package-inclusions.ts`, `packages/db/src/schema/relations.ts`, `packages/db/src/schema/index.ts`
- Create (generated, never hand-edited): `packages/db/migrations/0001_*.sql` + snapshot + journal entry

**Interfaces:**
- Consumes: M1.2/M1.3 schema files as they exist on this branch.
- Produces: `frames` table (`id uuid pk defaultRandom`, `service_package_id uuid notNull fk→service_packages.id`, `frame_number integer notNull`, `created_at`/`updated_at` timestamptz notNull default now()); `frames_pair_unique` on `(service_package_id, frame_number)`; `frames_service_package_id_idx`; `package_inclusions.frame_id` nullable FK→`frames.id` (plain references — seed deletes inclusions before frames could conflict, no cascade needed) + `package_inclusions_frame_id_idx`; relations `framesRelations` and `packageInclusionsRelations.frame`.

- [ ] **Step 1: Write `packages/db/src/schema/frames.ts`** with exactly:

```ts
import { index, integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { servicePackages } from './service-packages.js';

// One row per catalog Frame line within a package (ADR-0010): frame identity
// so a multi-picture frame = N inclusions sharing one frame_id. Numbering:
// explicit "Frame 1/2/3" headings map as-is; unlabeled multi-line "Frame:"
// sections number in listed order (1..N); a single frame gets 1.
export const frames = pgTable(
  'frames',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    servicePackageId: uuid('service_package_id')
      .notNull()
      .references(() => servicePackages.id),
    frameNumber: integer('frame_number').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('frames_pair_unique').on(table.servicePackageId, table.frameNumber),
    index('frames_service_package_id_idx').on(table.servicePackageId),
  ]
);
```

- [ ] **Step 2: Modify `packages/db/src/schema/package-inclusions.ts`** — import `frames` from `./frames.js`; add the column after `attireId` (keep the existing structural comment, append one line):

```ts
    // frameId (ADR-0010): set on framed_picture rows only; prints and
    // privileges stay null.
    frameId: uuid('frame_id').references(() => frames.id),
```

  and extend the third-callback array with:

```ts
    index('package_inclusions_frame_id_idx').on(table.frameId),
```

- [ ] **Step 3: Modify `packages/db/src/schema/relations.ts`** — import `frames`; add:

```ts
export const framesRelations = relations(frames, ({ one, many }) => ({
  servicePackage: one(servicePackages, {
    fields: [frames.servicePackageId],
    references: [servicePackages.id],
  }),
  inclusions: many(packageInclusions),
}));
```

  and inside `packageInclusionsRelations` add:

```ts
  frame: one(frames, {
    fields: [packageInclusions.frameId],
    references: [frames.id],
  }),
```

- [ ] **Step 4: Barrel** — add `export * from './frames.js';` to `packages/db/src/schema/index.ts` (alphabetical, between `branches.js` and `package-inclusions.js`).

- [ ] **Step 5: Build + typecheck** — `pnpm install && pnpm build:packages && pnpm --filter @sevendays/db build && pnpm --filter @sevendays/db typecheck` — all clean (build precedes typecheck per the dist-resolving exports).

- [ ] **Step 6: Generate migration 0001** — from `packages/db`:
  `node --env-file=.env scripts/check-env.mjs` (GATE: PASS), then
  `pnpm --filter @sevendays/db db:generate > /tmp/m1.3-frames-generate.log 2>&1; tail -n 8 /tmp/m1.3-frames-generate.log`
  (if opencode's sandbox rejects /tmp, redirect into a gitignored path such as `packages/db/generate.log` — check `git check-ignore` first; never commit the log; never quote URL lines from the tail).
  Expected tail: `CREATE TABLE "frames"` / `ALTER TABLE "package_inclusions" ADD COLUMN "frame_id"` / ADD CONSTRAINT frames_pair_unique / CREATE INDEX ×2. If drizzle proposes anything else (drops, renames), STOP and report BLOCKED — additive only.

- [ ] **Step 7: Verify the generated SQL** — `grep -c "CREATE INDEX\|ADD CONSTRAINT \"frames_pair_unique\"" packages/db/migrations/0001_*.sql` and `grep -n "CREATE TABLE \"frames\"\|frame_id\|frames_pair_unique" packages/db/migrations/0001_*.sql`. Expected: exactly 2 indexes + 1 unique constraint; `frame_id` nullable (no NOT NULL); no destructive statements. `git status --short packages/db/migrations` shows only new-file additions + the journal/snapshot updates.

- [ ] **Step 8: Live apply** — `pnpm --filter @sevendays/db db:migrate > /tmp/m1.3-frames-migrate.log 2>&1; tail -n 10 /tmp/m1.3-frames-migrate.log` (same /tmp fallback rule). Then `node --env-file=.env scripts/db-state.mjs` — unchanged public tables (frames has its own table: `public tables:` line now lists 9 entries including `frames`), journal still `drizzle.__drizzle_migrations`. Quote both outputs.

- [ ] **Step 9: Commit**

```bash
git add packages/db/src/schema/frames.ts packages/db/src/schema/package-inclusions.ts packages/db/src/schema/relations.ts packages/db/src/schema/index.ts packages/db/migrations
git commit -m "feat(db): frames table with per-package numbering and inclusion linkage" -m "- additive migration 0001 over the applied-and-frozen 0000
- unique (service_package_id, frame_number) natural key anchors the seed
- package_inclusions.frame_id nullable FK + index; framed pictures only"
```

---

### Task 3: Seed — frameNumber in catalog, frames upsert, frameId resolution

**Files:**
- Modify: `packages/db/scripts/catalog.ts` (frameNumber on every framed picture + grouping comments), `packages/db/scripts/seed.ts` (frames upsert + frameId)

**Interfaces:**
- Consumes: `frames` + `packageInclusions.frameId` from Task 2.
- Produces: `PackageSeed.framedPictures` entries gain `frameNumber: number` (1-based, per package); seed log line unchanged in counts but now includes frames: `[ok] seeded: ... packages with frames and inclusions`. Verify (Task 4) imports nothing new from catalog for frames — it reads the DB.

- [ ] **Step 1: Numbering pass over `catalog.ts`** — change the `framedPictures` entry type to:

```ts
  // Framed pictures: one row per catalog Frame line (quantity 1). frameNumber
  // is the catalog grouping (ADR-0010): explicit "Frame 1/2/3" headings map
  // as-is; unlabeled multi-line "Frame:" sections number in listed order.
  framedPictures: { frameNumber: number; printSizeCode: string; attireName: string; catalogLine: string }[];
```

  then add `frameNumber` to every `framedPictures` entry across all 11 packages, keeping existing catalogLine comments, updating them where the heading names the number. The full mapping (from docs/catalog.md, catalog order preserved):

  - Basic Package: 1 frame → `[1] 8x10 Toga`
  - Package A: `[1] 11x14 Toga`
  - Package B (unlabeled 2 lines): `[1] 8x10 Toga`, `[2] 8x10 Filipiniana/Executive`
  - Package C: `[1] 11x14 Toga`
  - Package D (labeled): `[1] 11x14 Toga`, `[2] 8x10 Filipiniana/Executive`
  - Package E (unlabeled 3 lines): `[1] 8x10 Toga`, `[2] 8x10 Filipiniana`, `[3] 8x10 Executive`
  - Package F (labeled): `[1] 8x10 Toga`, `[2] 8x10 Filipiniana`, `[3] 8x10 Executive`
  - Package G (unlabeled): `[1] 11x14 Toga`, `[2] 11x14 Filipiniana/Executive/Uniform`
  - Package H (unlabeled): `[1] 11x14 Toga`, `[2] 8x10 Filipiniana`, `[3] 8x10 Executive`
  - CP-1 (labeled): `[1] 11x14 Toga`, `[2] 8x10 Filipiniana`, `[3] 8x10 Executive/Uniform`
  - CP-2 (labeled): `[1] 11x14 Toga`, `[2] 11x14 Filipiniana/Executive/Uniform`

- [ ] **Step 2: Modify `seed.ts`** — import `frames` from `../src/index.js`; inside the package loop, BEFORE the inclusion rebuild, upsert the package's frames and build the frameId map:

```ts
      // Frames — upsert per (package, frameNumber); reseed keeps ids stable
      // for unchanged frames so CMS references survive (ADR-0010).
      const frameId = new Map<number, string>();
      for (const fp of pkg.framedPictures) {
        const [frameRow] = await tx
          .insert(frames)
          .values({ servicePackageId: row.id, frameNumber: fp.frameNumber })
          .onConflictDoUpdate({
            target: [frames.servicePackageId, frames.frameNumber],
            set: { frameNumber: fp.frameNumber },
          })
          .returning({ id: frames.id });
        if (!frameRow) throw new Error(`seed: upsert returned no frame for ${pkg.name} #${fp.frameNumber}`);
        frameId.set(fp.frameNumber, frameRow.id);
      }
```

  then in `framedValues` mapping add `frameId: frameId.get(f.frameNumber) ?? null` (with the ?? null fallback consistent with the lookup maps), and leave printValues/privilegeValues without frameId (column default null).

- [ ] **Step 3: Update the delete-ordering safety** — the inclusion rebuild (`tx.delete(packageInclusions).where(eqPackageInclusions(row.id))`) already runs before inserts each iteration; frames rows are never deleted by the seed (upsert-only), so no FK hazard exists. Confirm no change needed; note it in the report.

- [ ] **Step 4: Gate + reseed (live)** — `node --env-file=.env scripts/check-env.mjs` (GATE: PASS), then `pnpm --filter @sevendays/db db:seed` → expect `[ok] seeded: 3 branches, 6 print sizes, 7 attires, 2 add-on services, 11 packages with inclusions` and zero errors; run it a SECOND time → identical output (idempotency across the frames upsert).

- [ ] **Step 5: Biome + typecheck + build** — `pnpm exec biome check --write packages/db/scripts` then `pnpm --filter @sevendays/db typecheck && pnpm --filter @sevendays/db build` — clean.

- [ ] **Step 6: Commit**

```bash
git add packages/db/scripts/catalog.ts packages/db/scripts/seed.ts
git commit -m "feat(db): seed frames with per-package numbering and link framed pictures"
```

---

### Task 4: Verify — frames count + per-package frame-partition checks

**Files:**
- Modify: `packages/db/scripts/verify-seed.ts`

**Interfaces:**
- Consumes: frames rows + `packageInclusions.frameId` in the live DB (Task 3 seeded); `packageSeeds` for expected counts.
- Produces: `[ok] frames: 23/23` line; per-package frame-partition checks; exit-code semantics unchanged (`VERIFY: PASSED` / exit 1 on any [FAIL]).

- [ ] **Step 1: Add the frames count check** — import `frames` from `../src/index.js`; after the attires check add:

```ts
const frameRows = await db.select().from(frames);
const expectedFrameCount = packageSeeds.reduce((n, p) => n + p.framedPictures.length, 0);
frameRows.length === expectedFrameCount
  ? pass(`frames: ${frameRows.length}/${expectedFrameCount}`)
  : fail(`frames: ${frameRows.length} != ${expectedFrameCount}`);
```

- [ ] **Step 2: Add per-package frame-partition checks** — inside the existing per-package loop (after the inclusion comparison block), add:

```ts
  // Frame partition (ADR-0010): every framed_picture row must reference one
  // of this package's frames; each frame must be referenced at least once
  // (today 1:1 — the check enforces the invariant, not the ratio).
  const pkgFrameRows = frameRows.filter((f) => f.servicePackageId === row.id);
  const framedInclusionRows = rows.filter((r) => r.kind === 'framed_picture');
  const includedFrameIds = new Set(
    (
      await db
        .select({ frameId: packageInclusions.frameId })
        .from(packageInclusions)
        .where(eq(packageInclusions.servicePackageId, row.id))
    )
      .map((r) => r.frameId)
      .filter((id) => id !== null)
  );
  pkgFrameRows.length === seed.framedPictures.length
    ? pass(`${seed.name}: ${pkgFrameRows.length} frames`)
    : fail(`${seed.name}: ${pkgFrameRows.length} frames != ${seed.framedPictures.length}`);
  if (includedFrameIds.size !== pkgFrameRows.length) {
    fail(`${seed.name}: framed pictures reference ${includedFrameIds.size}/${pkgFrameRows.length} frames`);
  } else {
    pass(`${seed.name}: every frame carries ≥1 framed picture`);
  }
```

  (`rows` is the loop's existing inclusion select — the partition check reuses it for kind counting and makes one extra frameId select. `framedInclusionRows` feeds nothing today; drop the variable and keep only the `includedFrameIds` select if the linter flags it unused.)

- [ ] **Step 3: Biome + typecheck** — `pnpm exec biome check --write packages/db/scripts/verify-seed.ts && pnpm --filter @sevendays/db typecheck` — clean.

- [ ] **Step 4: Live verify** — `pnpm --filter @sevendays/db db:verify-seed` → expect `[ok] frames: 23/23`, 11 `frames`/partition lines, and `VERIFY: PASSED`. Quote the frames block and the final line.

- [ ] **Step 5: Commit**

```bash
git add packages/db/scripts/verify-seed.ts
git commit -m "feat(db): verify frame counts and framed-picture partition per package"
```

---

### Task 5: ADR-0010 + Frame glossary + handoff

**Files:**
- Create: `docs/adr/0010-frame-grouping-via-frames-table.md`
- Modify: `apps/api/CONTEXT.md`, `docs/progress.md`

- [ ] **Step 1: Write ADR-0010** — follow the house ADR format (see `docs/adr/0009-normalized-catalog-lookups.md`): title `0010 — Frame grouping via a frames table`; Status Accepted, date 2026-09-01; Context: catalog line 8 semantics ("a frame can contain a single or multiple pictures"), Frame 1/2/3 headings, the M1.2 "recorded, not stored" deferral, and this grill's decision; Decision: dedicated `frames` table (catalog templates, not fulfillment instances), unique `(service_package_id, frame_number)`, `package_inclusions.frame_id` nullable FK, `framed_picture` kind retained, unlabeled frames numbered in listed order, single frames get 1; Alternatives considered: nullable `frame_number` column on inclusions (no home for future frame attributes), `frame_pictures` child table (duplicates the inclusion concept without a current consumer); Consequences: migration 0001 additive; seed upserts frames idempotently; verify enforces the frame partition; M1.4 read routes may join frames; future multi-picture frames = N inclusions sharing frame_id.

- [ ] **Step 2: Glossary entry** — in `apps/api/CONTEXT.md`, add to the data-model terms (alphabetical placement per that file's structure):

```markdown
**Frame** — One physical frame bundled with a Service Package, numbered per package (catalog "Frame 1/2/3"; unlabeled frames number in listed order). A frame holds one or more framed pictures; today every catalog frame holds exactly one. Distinct from loose picture Inclusions.
```

- [ ] **Step 3: progress.md** — extend the M1.3 "What Exists" bullet with one sentence: "Frame grouping is stored: a `frames` table (ADR-0010, migration 0001) seeds 23 frames across the 11 packages, and `package_inclusions.frame_id` links each framed picture to its frame." Remove/adjust any now-false "recorded, not stored" phrasing in Known Gaps if present.

- [ ] **Step 4: Full gate** — `pnpm check && pnpm build` — green (quote task counts).

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0010-frame-grouping-via-frames-table.md apps/api/CONTEXT.md docs/progress.md
git commit -m "docs: ADR-0010 frame grouping and the Frame glossary entry"
```

---

## Self-Review

**1. Spec coverage (the six grill answers):** Q1 catalog-template scope → frames table has no appointment linkage (Task 2). Q2 shape (1) → `frames` + nullable `frame_id` (Tasks 2–3); child-table rejected and recorded in ADR (Task 5). Q3 numbering rule → Task 3 mapping (all 23 frames enumerated) + verify partition (Task 4). Q4 kind retained → no kind change anywhere; framed rows gain frameId only (Tasks 1–3). Q5 plan-first, fold into M1.3 branch pre-PR → this plan; branch named in constraints; scoped glm review after execution. Q6 docs → ADR-0010 + CONTEXT.md entry (Task 5). Catalog semantics (line 8) and the 23-frame count cross-checked against docs/catalog.md.

**2. Placeholder scan:** all code blocks complete; the Task 3 numbering list enumerates every package's frames explicitly (no "same as Basic"); no TBDs; Task 4's `framedInclusionRows` carries an explicit drop-if-unused instruction rather than a vague note.

**3. Type consistency:** `frameNumber` (camelCase in TS, `frame_number` in SQL) used identically in frames.ts, catalog.ts, seed.ts; `frameId` on both schema layers; `PackageFrame`/`CreateFrameInput` named once; seed's `frameId` Map<number, string> keyed by frameNumber matching `f.frameNumber`; verify imports `frames` from the same barrel the seed uses; `expectedFrameCount` derived from packageSeeds (23).
