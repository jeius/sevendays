# Frame Grouping & Attire Normalization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two folded schema revisions on one migration `0001`, both grill-settled with the owner on 2026-09-01: (a) frame identity via a `frames` table with `package_inclusions.frame_id`; (b) attire normalization — atomic `attires` rows (4: Toga, Filipiniana, Executive, Uniform) with a `package_inclusion_attires` junction replacing the combined-name rows and the `package_inclusions.attire_id` column.

**Architecture:** `frames(id, service_package_id FK, frame_number)` unique per pair; `package_inclusions` gains `frame_id` (nullable, framed pictures only) and **loses** `attire_id`; new junction `package_inclusion_attires(id, inclusion_id FK, attire_id FK)` unique per pair carrying every picture inclusion's attire set (≥1 enforced for framed_picture/print; privileges 0..N). Seed upserts frames idempotently (ids stable), junction-rebuilds with inclusions, and resolves attire sets by splitting structured catalog arrays. Verify adds frames-count, frame-partition, and attire-signature checks. Zod: `PackageInclusion` read shape gains `frameId` + `attireIds: uuid[]` (attire links leave the row shape); ADR-0009 revised in place (owner-sanctioned, once) to supersede the combined-form decision and record the frames deferral→decision.

**Tech Stack:** Drizzle ORM ^0.45.2 (pg-core, relations), Zod ^4.5.1 (v4 top-level formats, superRefine), tsx ^4.23.13 scripts, postgres-js client (`prepare: false`).

**Spec:** Grill decisions 2026-09-01 (owner-confirmed in-session): frames = catalog templates; shape (1) frames+frame_id; unlabeled frames numbered in listed order; `framed_picture` kind retained; attire = atomic rows + junction; `PackageInclusion` never 0 attire **except privileges (0..N)**; catalog.ts keeps verbatim `catalogLine` but structured `attireNames` arrays; ADR-0009 revised in place (owner granted, just this once — no ADR-0010); folded into M1.3 pre-PR with a scoped glm review. Catalog semantics: `docs/catalog.md` line 8. Doc responsibilities: `apps/api/CONTEXT.md` owns Frame + Attire glossary entries; `docs/catalog.md` stays verbatim.

## Global Constraints

- **Additive migration only, one migration `0001`.** `0000` is applied and frozen — Task 2 generates a single `0001_*.sql` covering frames + junction + the `attire_id` drop; never hand-edit `packages/db/migrations/**`; drizzle journal rows go 1 → 2 after apply.
- **Dropping `attire_id` is safe:** `package_inclusions` is live-seeded, but the seed rebuilds inclusions delete-then-insert every run — the Task 3 reseed repopulates everything through the junction; no data preservation needed beyond rerunning `db:seed`.
- **Live DB caution:** Tasks 2–4 touch the live session-mode connection. `node --env-file=.env scripts/check-env.mjs` must print `GATE: PASS` before each; env values never printed; drizzle-kit output redirected to a log, tail-only quoting.
- **Seed is re-runnable:** frames upsert by `(service_package_id, frame_number)`; inclusions delete-then-insert per package; junction rows inserted fresh with their inclusion (no separate rebuild needed).
- **Secret safety:** never print any connection string; never touch `.env`/`.dev.vars` contents.
- **Biome-clean commits** (M1.3 ruling): `pnpm exec biome check --write` on every created/modified code file before committing.
- **Fresh-clone bootstrap precedes typecheck/tests:** `pnpm install && pnpm build:packages` before any workspace gate.
- **Commit conventions:** unscoped conventional subjects, bullet bodies when wordy; each task commits on `feat/m1.3-provision-migrate-seed`.
- **Zod v4 style:** top-level `z.uuid()`; `superRefine` for the cross-field attire rule on the create shape; `safeParse` in tests; no `noUncheckedIndexedAccess` violations (guard destructures, no `!`).
- **Attire order canonicalization:** combined attire arrays follow the catalog's own attire-list order — Toga, Filipiniana, Executive, Uniform (`Filipiniana/Executive`, `Executive/Uniform`, `Filipiniana/Executive/Uniform`) — both in catalog.ts arrays and in any signature/canonical rendering; never alphabetize.

---

## File Structure

```
packages/types/src/frames.ts                     (new)  Zod frame read/create schemas
packages/types/src/frames.test.ts                (new)  schema tests
packages/types/src/inclusion.ts                  (mod)  frameId + attireIds + kind-aware create refine
packages/types/src/inclusion.test.ts             (mod)  fixtures for frameId/attireIds/refine
packages/types/src/index.ts                      (mod)  frames barrel export
packages/db/src/schema/frames.ts                 (new)  frames table + unique pair + FK index
packages/db/src/schema/package-inclusion-attires.ts (new) junction table
packages/db/src/schema/package-inclusions.ts     (mod)  +frame_id FK/index, −attire_id column+index
packages/db/src/schema/relations.ts              (mod)  frames relations; attire link moves to junction
packages/db/src/schema/index.ts                  (mod)  frames + junction barrel exports
packages/db/scripts/catalog.ts                   (mod)  frameNumber per framed picture; attireNames arrays; atomic attireSeeds (4); signature fn update
packages/db/scripts/seed.ts                      (mod)  frames upsert; attire set resolution; junction inserts
packages/db/scripts/verify-seed.ts               (mod)  frames count + partition; attire-aware signature compare
docs/adr/0009-normalized-catalog-lookups.md      (mod)  revised in place (owner-sanctioned)
apps/api/CONTEXT.md                              (mod)  Frame glossary entry + Attire entry update
docs/progress.md                                 (mod)  M1.3 bullet extension
```

Task map: 1 — Zod: frames schemas + inclusion reshape (TDD); 2 — Drizzle: frames + junction + migration 0001 + live apply; 3 — seed: catalog restructure + frames/junction seeding (live reseed ×2); 4 — verify: frames + attire checks (live verify); 5 — ADR-0009 revision + glossary + progress + full gate.

---

### Task 1: Zod — frames schemas + inclusion reshape (TDD)

**Files:**
- Create: `packages/types/src/frames.ts`, `packages/types/src/frames.test.ts`
- Modify: `packages/types/src/inclusion.ts`, `packages/types/src/inclusion.test.ts`, `packages/types/src/index.ts`

**Interfaces:**
- Produces: `frameSchema` (row: `id`, `servicePackageId`, `frameNumber` int ≥1), `createFrameSchema` (create: `servicePackageId` + `frameNumber`), types `PackageFrame`, `CreateFrameInput`. `packageInclusionSchema` (read): `frameId: z.uuid().nullable()`, `attireIds: z.array(z.uuid()).min(1)` — attire linkage leaves the row shape; `attireId`/`attireName`-style single refs are gone. `createPackageInclusionSchema` (create): `.extend({ frameId: z.uuid().nullable().optional(), attireIds: z.array(z.uuid()).optional() })` + `superRefine`: when `kind` is `framed_picture` or `print`, `attireIds` must exist with `length ≥ 1`; when `privilege`, `attireIds` may be 0..N. Types `PackageInclusion`, `CreatePackageInclusionInput` re-inferred.

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

- [ ] **Step 2: RED** — `pnpm --filter @sevendays/types test -- frames` → FAIL: cannot resolve `./frames.js`.

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

- [ ] **Step 4: Rewrite `packages/types/src/inclusion.ts`** with exactly:

```ts
import { z } from 'zod';

export const packageInclusionKindSchema = z.enum(['framed_picture', 'print', 'privilege']);

export type PackageInclusionKind = z.infer<typeof packageInclusionKindSchema>;

export const packageInclusionSchema = z.object({
  id: z.uuid(),
  kind: packageInclusionKindSchema,
  // Framed pictures and prints carry a count; privileges (wardrobe/accessory
  // usage, High-Resolution soft copies) are quantityless — null by design.
  quantity: z.number().int().positive().nullable(),
  // Structural finish rule (no finish column): framed_picture rows are
  // laminated, print rows are loose — the kind decides, not data.
  printSizeId: z.uuid().nullable(),
  // Attire context lives in the package_inclusion_attires junction (ADR-0009
  // revision): the read shape carries the resolved id array (≥1 for picture
  // inclusions; privileges 0..N — some usage grants name no attire).
  attireIds: z.array(z.uuid()).min(1),
  // Frame identity (ADR-0009 revision): which catalog frame this framed
  // picture belongs to — null for prints and privileges. Required-nullable
  // on the row shape; optional+nullable on the create shape.
  frameId: z.uuid().nullable(),
  description: z.string().min(1).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PackageInclusion = z.infer<typeof packageInclusionSchema>;

export const createPackageInclusionSchema = packageInclusionSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    frameId: z.uuid().nullable().optional(),
    attireIds: z.array(z.uuid()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'privilege') return;
    const attireIds = value.attireIds;
    if (!attireIds || attireIds.length < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['attireIds'],
        message: `${value.kind} inclusions require at least one attire`,
      });
    }
  });

export type CreatePackageInclusionInput = z.infer<typeof createPackageInclusionSchema>;
```

- [ ] **Step 5: Update `packages/types/src/inclusion.test.ts`** — rework fixtures: every `framed_picture`/`print` fixture gains `attireIds: [UUID]` and (framed only) `frameId: UUID`; every `privilege` fixture gains `attireIds: []` (or `[UUID]` for the Executive-attire grant) and `frameId: null`; framed fixtures without frames semantics stay `frameId: UUID` only where a frame exists — for row-shape tests any non-null uuid is fine. Add tests: (a) read-shape parse of a framed_picture with `attireIds: []` FAILS (min(1)); (b) create-shape parse of `{ kind: 'framed_picture', quantity: 1, printSizeId: UUID }` with no `attireIds` key FAILS with the custom message path `['attireIds']`; (c) create-shape parse of the same plus `attireIds: [UUID]` (frameId omitted) SUCCEEDS; (d) create-shape privilege with no `attireIds` key SUCCEEDS.

- [ ] **Step 6: GREEN + barrel** — `pnpm --filter @sevendays/types test` → all pass; add `export * from './frames.js';` to `packages/types/src/index.ts` (between `branch.js` and `inclusion.js`); `pnpm --filter @sevendays/types build` succeeds.

- [ ] **Step 7: Commit**

```bash
git add packages/types/src/frames.ts packages/types/src/frames.test.ts packages/types/src/inclusion.ts packages/types/src/inclusion.test.ts packages/types/src/index.ts
git commit -m "feat(types): frame schemas, junction-backed attireIds, kind-aware attire rule"
```

---

### Task 2: Drizzle — frames + junction, migration 0001, live apply

**Files:**
- Create: `packages/db/src/schema/frames.ts`, `packages/db/src/schema/package-inclusion-attires.ts`
- Modify: `packages/db/src/schema/package-inclusions.ts`, `packages/db/src/schema/relations.ts`, `packages/db/src/schema/index.ts`
- Create (generated): `packages/db/migrations/0001_*.sql` + snapshot + journal

**Interfaces:**
- Produces: `frames` table (as planned: uuid pk, `service_package_id` notNull FK, `frame_number` int notNull, timestamps; `frames_pair_unique` on `(service_package_id, frame_number)`; `frames_service_package_id_idx`). `packageInclusionAttires` table: `id uuid pk defaultRandom`, `inclusion_id uuid notNull fk→package_inclusions.id` (onDelete cascade — junction rows are children of inclusions), `attire_id uuid notNull fk→attires.id`, timestamps; unique `package_inclusion_attires_pair_unique` on `(inclusion_id, attire_id)`; index on `inclusion_id` (the pair unique already covers inclusion_id lookups — include the explicit index only if drizzle's unique doesn't create one; prefer the unique alone, add the FK index for `attire_id`). `package_inclusions`: ADD `frame_id uuid null fk→frames.id` + `package_inclusions_frame_id_idx`; DROP `attire_id` + `package_inclusions_attire_id_idx`. Relations: `framesRelations` (one servicePackage, many inclusions); `packageInclusionsRelations`: remove `attire`, add `frame` + `attireLinks: many(packageInclusionAttires)`; `packageInclusionAttiresRelations`: one inclusion, one attire.

- [ ] **Step 1: Write `packages/db/src/schema/frames.ts`** with exactly:

```ts
import { index, integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { servicePackages } from './service-packages.js';

// One row per catalog Frame line within a package (ADR-0009 revision): frame
// identity so a multi-picture frame = N inclusions sharing one frame_id.
// Numbering: explicit "Frame 1/2/3" headings map as-is; unlabeled multi-line
// "Frame:" sections number in listed order (1..N); a single frame gets 1.
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

- [ ] **Step 2: Write `packages/db/src/schema/package-inclusion-attires.ts`** with exactly:

```ts
import { index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { attires } from './attires.js';
import { packageInclusions } from './package-inclusions.js';

// Attire context per inclusion (ADR-0009 revision): replaces the single
// attire_id column and the combined-name attire rows. One row per
// (inclusion, attire) pair; combined contexts like Filipiniana/Executive are
// two rows in catalog attire order. Children of inclusions — cascade delete.
export const packageInclusionAttires = pgTable(
  'package_inclusion_attires',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inclusionId: uuid('inclusion_id')
      .notNull()
      .references(() => packageInclusions.id, { onDelete: 'cascade' }),
    attireId: uuid('attire_id')
      .notNull()
      .references(() => attires.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('package_inclusion_attires_pair_unique').on(table.inclusionId, table.attireId),
    index('package_inclusion_attires_attire_id_idx').on(table.attireId),
  ]
);
```

- [ ] **Step 3: Modify `packages/db/src/schema/package-inclusions.ts`** — remove the `attires` import; add `frames` import; replace the `attireId` column block with:

```ts
    // frameId (ADR-0009 revision): set on framed_picture rows only; prints
    // and privileges stay null.
    frameId: uuid('frame_id').references(() => frames.id),
```

  and in the third-callback array replace the `package_inclusions_attire_id_idx` line with `index('package_inclusions_frame_id_idx').on(table.frameId),`.

- [ ] **Step 4: Modify `packages/db/src/schema/relations.ts`** — imports gain `frames`, `packageInclusionAttires`; drop `attires`-based relation only (attires import stays if still referenced elsewhere in the file — check; after the change it is not). Add:

```ts
export const framesRelations = relations(frames, ({ one, many }) => ({
  servicePackage: one(servicePackages, {
    fields: [frames.servicePackageId],
    references: [servicePackages.id],
  }),
  inclusions: many(packageInclusions),
}));

export const packageInclusionAttiresRelations = relations(packageInclusionAttires, ({ one }) => ({
  inclusion: one(packageInclusions, {
    fields: [packageInclusionAttires.inclusionId],
    references: [packageInclusions.id],
  }),
  attire: one(attires, {
    fields: [packageInclusionAttires.attireId],
    references: [attires.id],
  }),
}));
```

  and inside `packageInclusionsRelations`: remove the `attire: one(attires, …)` entry; add `attireLinks: many(packageInclusionAttires)` and the `frame` one-relation:

```ts
  frame: one(frames, {
    fields: [packageInclusions.frameId],
    references: [frames.id],
  }),
  attireLinks: many(packageInclusionAttires),
```

  (keep the `attires` import — `packageInclusionAttiresRelations` uses it).

- [ ] **Step 5: Barrel** — `packages/db/src/schema/index.ts` gains `export * from './frames.js';` (between `branches.js` and `package-inclusions.js`) and `export * from './package-inclusion-attires.js';` (after `package-inclusions.js`).

- [ ] **Step 6: Build + typecheck** — `pnpm install && pnpm build:packages && pnpm --filter @sevendays/db build && pnpm --filter @sevendays/db typecheck` — all clean.

- [ ] **Step 7: Generate migration 0001** — from `packages/db`: `node --env-file=.env scripts/check-env.mjs` (GATE: PASS); then `pnpm --filter @sevendays/db db:generate > /tmp/frames-attire-generate.log 2>&1; tail -n 12 /tmp/frames-attire-generate.log` (sandbox fallback: gitignored in-repo log path; never quote URL lines). Expected statements: `CREATE TABLE "frames"`, `CREATE TABLE "package_inclusion_attires"`, `ALTER TABLE "package_inclusions" ADD COLUMN "frame_id"`, `ALTER TABLE "package_inclusions" DROP COLUMN "attire_id"`, DROP of the old attire_id index, ADD `frames_pair_unique` + `package_inclusion_attires_pair_unique`, CREATE INDEX ×3 (frames_service_package_id, package_inclusions_frame_id, package_inclusion_attires_attire_id). If drizzle proposes anything beyond these (unexpected drops/renames), STOP — BLOCKED, additive scope only (the attire_id drop is expected and sanctioned).

- [ ] **Step 8: Verify the generated SQL** — grep the 0001 file for the expected statements; confirm `frame_id` has no NOT NULL; confirm no `DROP TABLE`; `git status --short packages/db/migrations` = new 0001 files + journal/snapshot updates only.

- [ ] **Step 9: Live apply** — `pnpm --filter @sevendays/db db:migrate > /tmp/frames-attire-migrate.log 2>&1; tail -n 10 …` then `node --env-file=.env scripts/db-state.mjs` — `public tables:` now lists 10 entries (adds `frames`, `package_inclusion_attires`); journal `drizzle.__drizzle_migrations`. Quote outputs.

- [ ] **Step 10: Commit**

```bash
git add packages/db/src/schema/frames.ts packages/db/src/schema/package-inclusion-attires.ts packages/db/src/schema/package-inclusions.ts packages/db/src/schema/relations.ts packages/db/src/schema/index.ts packages/db/migrations
git commit -m "feat(db): frames table and attire junction replace combined-name rows" -m "- migration 0001 additive: frames + package_inclusion_attires; inclusions
  gain frame_id and lose attire_id (junction carries attire context)
- unique (service_package_id, frame_number) anchors seed numbering
- junction cascade-deletes with its inclusion; unique pair per attire"
```

---

### Task 3: Seed — catalog restructure + frames/junction seeding

**Files:**
- Modify: `packages/db/scripts/catalog.ts`, `packages/db/scripts/seed.ts`

**Interfaces:**
- Produces: `attireSeeds` = 4 atomic rows `[{ name: 'Toga' }, { name: 'Filipiniana' }, { name: 'Executive' }, { name: 'Uniform' }]`; `PackageSeed.framedPictures` entries `{ frameNumber, printSizeCode, attireNames: string[], catalogLine }`; `PackageSeed.prints` entries `{ quantity, printSizeCode, attireNames: string[], catalogLine }`; `privilegeSeeds` entries `{ description, attireNames: string[] }` (Executive grant `['Executive']`, others `[]`); `inclusionSignatures(pkg)` now emits `attireNames` joined with `/` in catalog order (privileges with no attires render `-`), signature format `kind|quantity|printSizeCode|attireNames-joined` / `privilege|0|<joined or ->|<description>` — byte-identical to the M1.3 verify expectations for every current line (the join reproduces the original strings). Seed imports `frames` and `packageInclusionAttires` from the barrel.

- [ ] **Step 1: Restructure `catalog.ts`** — (a) `attireSeeds` → the 4 atomic rows (keep the comment noting combined forms are now junction-composed per the ADR-0009 revision); (b) add `frameNumber: number` to every `framedPictures` entry and convert `attireName: 'X'` → `attireNames: ['X']`, combined → arrays following catalog order, e.g. `'Filipiniana/Executive'` → `['Filipiniana', 'Executive']`, `'Executive/Uniform'` → `['Executive', 'Uniform']`, `'Filipiniana/Executive/Uniform'` → `['Filipiniana', 'Executive', 'Uniform']`; (c) same conversion for `prints`; (d) `privilegeSeeds` → `{ description, attireNames }` with `['Executive']` for the Executive grant, `[]` for the other five; (e) frameNumber mapping (all 23): Basic 1×[1]; A 1×[1]; B [1],[2]; C 1×[1]; D [1],[2]; E [1],[2],[3]; F [1],[2],[3]; G [1],[2]; H [1],[2],[3]; CP-1 [1],[2],[3]; CP-2 [1],[2] — in each package's existing framedPictures order; (f) update `inclusionSignatures` to join `attireNames` with `'/'` (and `-` when empty) so every signature string stays byte-identical to the pre-change verify output; (g) update the header comment block (phones note stays).

- [ ] **Step 2: Modify `seed.ts`** — imports gain `frames`, `packageInclusionAttires`; the attire lookup map becomes `attireId: Map<string, string>` built from the 4 atomic rows. Frame upsert block (inside the package loop, before the inclusion rebuild):

```ts
      // Frames — upsert per (package, frameNumber); reseed keeps ids stable
      // for unchanged frames so CMS references survive (ADR-0009 revision).
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

  `framedValues`/`printValues` mappings: drop `attireId`, keep `frameId: frameId.get(f.frameNumber) ?? null` on framed only. After inserting inclusions, insert junction rows: capture `returning({ id: packageInclusions.id, kind: packageInclusions.kind })` from the inclusion insert, then for each returned inclusion resolve its attire set (framed/print → the source entry's `attireNames`; privilege → its `attireNames`) and insert:

```ts
      const inclusionRows = await tx
        .insert(packageInclusions)
        .values([...framedValues, ...printValues, ...privilegeValues])
        .returning({ id: packageInclusions.id, kind: packageInclusions.kind });
      const junctionValues: { inclusionId: string; attireId: string }[] = [];
      const framedAndPrints = [...pkg.framedPictures, ...pkg.prints];
      let pictureCursor = 0;
      for (const inclusion of inclusionRows) {
        if (inclusion.kind === 'privilege') continue;
        const source = framedAndPrints[pictureCursor];
        pictureCursor += 1;
        if (!source) throw new Error(`seed: more picture inclusions than sources for ${pkg.name}`);
        for (const name of source.attireNames) {
          const attireId = attireIdMap.get(name);
          if (!attireId) throw new Error(`seed: unknown attire ${name} for ${pkg.name}`);
          junctionValues.push({ inclusionId: inclusion.id, attireId });
        }
      }
      const privilegeSources = privilegeSeeds;
      let privilegeCursor = 0;
      for (const inclusion of inclusionRows) {
        if (inclusion.kind !== 'privilege') continue;
        const source = privilegeSources[privilegeCursor];
        privilegeCursor += 1;
        if (!source) throw new Error(`seed: more privilege inclusions than sources for ${pkg.name}`);
        for (const name of source.attireNames) {
          const attireId = attireIdMap.get(name);
          if (!attireId) throw new Error(`seed: unknown attire ${name} for ${pkg.name}`);
          junctionValues.push({ inclusionId: inclusion.id, attireId });
        }
      }
      if (junctionValues.length > 0) {
        await tx.insert(packageInclusionAttires).values(junctionValues);
      }
```

  (cursor-walk works because `[...framedValues, ...printValues, ...privilegeValues]` preserves source order; the returning order matches the values order. If Biome/lint flags the shadowed name `attireId`, rename the map to `attireIdMap` everywhere.)

- [ ] **Step 3: Attire upsert order** — the attires upsert loop stays (now 4 rows, onConflictDoNothing); no other lookup changes.

- [ ] **Step 4: Gate + reseed (live, twice)** — `node --env-file=.env scripts/check-env.mjs` (GATE: PASS); `pnpm --filter @sevendays/db db:seed` → `[ok] seeded: …` unchanged; run again → identical (idempotent across frames upsert + junction rebuild).

- [ ] **Step 5: Biome + typecheck + build** — `pnpm exec biome check --write packages/db/scripts && pnpm --filter @sevendays/db typecheck && pnpm --filter @sevendays/db build` — clean.

- [ ] **Step 6: Commit**

```bash
git add packages/db/scripts/catalog.ts packages/db/scripts/seed.ts
git commit -m "feat(db): seed atomic attires, frames, and inclusion-attire junction"
```

---

### Task 4: Verify — frames + attire-aware read-back

**Files:**
- Modify: `packages/db/scripts/verify-seed.ts`

**Interfaces:**
- Produces: `[ok] frames: 23/23`; per-package frame-partition lines; per-package attire-junction check; signature comparison unchanged in format (Task 3 kept signatures byte-identical).

- [ ] **Step 1: Frames count check** — import `frames`; after the attires check add:

```ts
const frameRows = await db.select().from(frames);
const expectedFrameCount = packageSeeds.reduce((n, p) => n + p.framedPictures.length, 0);
frameRows.length === expectedFrameCount
  ? pass(`frames: ${frameRows.length}/${expectedFrameCount}`)
  : fail(`frames: ${frameRows.length} != ${expectedFrameCount}`);
```

- [ ] **Step 2: Rework the inclusion select** — the per-package rows select loses `attireName` (column dropped); instead select `id: packageInclusions.id` and fetch junction rows:

```ts
  const rows = await db
    .select({
      id: packageInclusions.id,
      kind: packageInclusions.kind,
      quantity: packageInclusions.quantity,
      description: packageInclusions.description,
      printSizeCode: printSizes.code,
      frameId: packageInclusions.frameId,
    })
    .from(packageInclusions)
    .leftJoin(printSizes, eq(packageInclusions.printSizeId, printSizes.id))
    .where(eq(packageInclusions.servicePackageId, row.id));
  const junctionRows = await db
    .select({ inclusionId: packageInclusionAttires.inclusionId, attireName: attires.name })
    .from(packageInclusionAttires)
    .innerJoin(attires, eq(packageInclusionAttires.attireId, attires.id));
  const attireNamesByInclusion = new Map<string, string[]>();
  for (const j of junctionRows) {
    const list = attireNamesByInclusion.get(j.inclusionId);
    if (list) {
      list.push(j.attireName);
    } else {
      attireNamesByInclusion.set(j.inclusionId, [j.attireName]);
    }
  }
```

  (junction fetch can be hoisted above the package loop — one query total — since attire names are global; the plan leaves it per-loop for diff minimality; hoist if the reviewer prefers.)

- [ ] **Step 3: Signature comparison** — actual signature per row becomes:

```ts
  const actual = rows
    .map((r) => {
      const names = attireNamesByInclusion.get(r.id) ?? [];
      return r.kind === 'privilege'
        ? `privilege|0|${names.length > 0 ? names.join('/') : '-'}|${r.description ?? ''}`
        : `${r.kind}|${r.quantity}|${r.printSizeCode ?? '?'}|${names.length > 0 ? names.join('/') : '-'}`;
    })
    .sort();
```

  (junction insertion order preserves catalog order, so the join reproduces `'Filipiniana/Executive'` etc. exactly; lengths still enforced by the `expected.length !== actual.length` guard; the existing first-diff failure block stays.)

- [ ] **Step 4: Frame partition + attire-completeness checks** — inside the per-package loop after the signature block:

```ts
  // Frame partition (ADR-0009 revision): every framed_picture row references
  // one of this package's frames; each frame is referenced at least once.
  const pkgFrameRows = frameRows.filter((f) => f.servicePackageId === row.id);
  pkgFrameRows.length === seed.framedPictures.length
    ? pass(`${seed.name}: ${pkgFrameRows.length} frames`)
    : fail(`${seed.name}: ${pkgFrameRows.length} frames != ${seed.framedPictures.length}`);
  const includedFrameIds = new Set(
    rows.filter((r) => r.kind === 'framed_picture').map((r) => r.frameId).filter((id) => id !== null)
  );
  includedFrameIds.size === pkgFrameRows.length
    ? pass(`${seed.name}: every frame carries ≥1 framed picture`)
    : fail(`${seed.name}: framed pictures reference ${includedFrameIds.size}/${pkgFrameRows.length} frames`);

  // Attire completeness: every picture inclusion carries ≥1 junction row.
  const pictureRows = rows.filter((r) => r.kind !== 'privilege');
  const barePictures = pictureRows.filter((r) => (attireNamesByInclusion.get(r.id) ?? []).length === 0);
  barePictures.length === 0
    ? pass(`${seed.name}: all ${pictureRows.length} picture inclusions carry attire context`)
    : fail(`${seed.name}: ${barePictures.length} picture inclusions have no attire`);
```

- [ ] **Step 5: Biome + typecheck** — `pnpm exec biome check --write packages/db/scripts/verify-seed.ts && pnpm --filter @sevendays/db typecheck` — clean.

- [ ] **Step 6: Live verify** — `pnpm --filter @sevendays/db db:verify-seed` → `[ok] frames: 23/23`, 11× frames/partition lines, 11× attire-completeness lines, all inclusion comparisons pass, `VERIFY: PASSED`. Quote the new block + final line.

- [ ] **Step 7: Commit**

```bash
git add packages/db/scripts/verify-seed.ts
git commit -m "feat(db): verify frames, frame partition, and junction attire completeness"
```

---

### Task 5: ADR-0009 revision + glossary + progress + full gate

**Files:**
- Modify: `docs/adr/0009-normalized-catalog-lookups.md`, `apps/api/CONTEXT.md`, `docs/progress.md`

- [ ] **Step 1: Revise ADR-0009 in place** (owner-sanctioned, this once): Decision paragraph — replace the lookup clause with: "`print_sizes` and `attires` as lookup tables (unique `code` / `name`; attires are atomic — Toga, Filipiniana, Executive, Uniform — with combined contexts composed per inclusion through the `package_inclusion_attires` junction, ordered by the catalog's attire list)". Replace the kind/clause sentence's `nullable FK references to the two lookups` with `nullable FK to print sizes, attire context via the junction, and a nullable frame reference`. Alternatives — the last bullet ("Splitting combined attires… deferred") is replaced by: "**Splitting combined attires into a junction** — adopted on 2026-09-01 revision: `package_inclusions.attire_id` + combined-name rows were a known simplification; with the customize-package flow (M1.4) needing per-attire selection and the frames work touching the same migration window, the junction replaced both the column and the combined rows in the same additive migration. The original deferral reasoning stands for the pre-revision window." Consequences — replace the final bullet with: "Combined attire contexts are junction-composed; the catalog's attire order (Toga, Filipiniana, Executive, Uniform) is the canonical rendering order — never alphabetize." Add at the top of Consequences: "**Amended 2026-09-01** (owner-sanctioned single revision): frames table + attire junction added by the frame-grouping work; see the Decision and Alternatives for what changed." Keep Status Accepted, date 2026-08-31; add `**Amended:** 2026-09-01` under the date.

- [ ] **Step 2: Glossary** — `apps/api/CONTEXT.md`: (a) update **Attire**: "The wardrobe context a framed picture or print is shot in — stored atomically (Toga, Filipiniana, Executive, Uniform); combined contexts like Filipiniana/Executive are inclusions linked to multiple Attire rows in catalog order."; (b) add **Frame** (alphabetical): "**Frame** — One physical frame bundled with a Service Package, numbered per package (catalog "Frame 1/2/3"; unlabeled frames number in listed order). A frame holds one or more framed pictures; today every catalog frame holds exactly one. Distinct from loose picture Inclusions."

- [ ] **Step 3: progress.md** — extend the M1.3 What-Exists bullet: "Frame grouping and attire normalization landed on top (revised ADR-0009, migration 0001): a `frames` table seeds 23 frames across the 11 packages, `package_inclusions.frame_id` links framed pictures to frames, and the `package_inclusion_attires` junction replaces combined-name attire rows with atomic attires (Toga, Filipiniana, Executive, Uniform)."

- [ ] **Step 4: Full gate** — `pnpm check && pnpm build` — green; quote task counts.

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0009-normalized-catalog-lookups.md apps/api/CONTEXT.md docs/progress.md
git commit -m "docs: revise ADR-0009 for frames + attire junction, update glossary"
```

---

## Self-Review

**1. Spec coverage (grill answers):** frames-as-templates (no appointment linkage anywhere) ✓; shape (1) frames+frame_id ✓ (Task 2); unlabeled-frame ordering + all 23 mappings ✓ (Task 3 Step 1e); framed_picture kind retained ✓ (no kind change); privileges 0..N attire, pictures ≥1 ✓ (Task 1 superRefine + Task 4 completeness check + privilegeSeeds arrays); structured arrays with verbatim catalogLine ✓ (Task 3); signature byte-compatibility ✓ (Task 3 Step 1f join reproduces original strings; Task 4 Step 3 consumes junction order); ADR-0009 revised in place, no ADR-0010 ✓ (Task 5, amendment note included); folded into M1.3 pre-PR, scoped glm review after execution ✓ (process); migration 0001 single ✓ (Tasks 2). attire_id drop sanctioned + repopulated by reseed ✓ (constraints + Task 3 Step 4).

**2. Placeholder scan:** all code blocks complete; all 23 frame numbers enumerated; junction insert code complete with guards; no TBD/TODO; the two named lint contingencies (map rename, unused variable) carry explicit resolutions rather than vague notes.

**3. Type consistency:** `frameNumber` camel/`frame_number` snake consistent; `attireNames: string[]` used in catalog + seed + signatures; `attireIds: uuid[]` only in Zod shapes; `packageInclusionAttires` / `package_inclusion_attires` / junction naming consistent across schema/barrel/seed/verify; `frameId` consistent across all layers; signature format identical between Task 3 producer and Task 4 consumer; `expectedFrameCount` derived (23).
