# Catalog Row-Shaping Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One pure row-shaping module in `packages/db` — `buildInclusionRowValues`, `buildJunctionPairs`, `buildFrameRowValues`, `assertAllKnownAttires` — becomes the single source of catalog row shapes, adopted by the seeder, the API test fixtures, and a schema-derived truncate helper in the same change, with the seed's verified output unchanged and the integration suites' asserted shapes intact.

**Architecture:** New `packages/db/src/catalog-rows.ts` exports four pure functions from catalog-style entries + resolved id lookups to typed insert-row values and junction pairs — per-Kind field rules, combined-attire decomposition in catalog order, frame attachment. No I/O, no client creation, no transactions: it never writes, it only shapes. Consumers keep their own write strategies — the seeder keeps its one-transaction natural-key upsert flow with per-package inclusion rebuild; the fixtures keep plain inserts capturing returned ids; the truncate helper derives its table list from the exported Drizzle schema (`is` + `Table` + `getTableConfig`) instead of a hand-named array. Opt-in subpath export `@sevendays/db/catalog-rows` (precedent: `./migrate`); the main entry keeps exporting schema + client only.

**Tech Stack:** TypeScript 6 (strict, `noUncheckedIndexedAccess`), Drizzle ORM 0.45 (schema objects, `$inferInsert`, `is`/`Table`/`getTableConfig` introspection), vitest 4 per-workspace configs (ADR-0003), Biome 2.x, pnpm 11 + Turborepo, docker compose postgres:17 for the integration siblings, `gh` CLI for issue #15 evidence.

**Spec:** `docs/specs/2026-09-02-catalog-row-shaping-module-spec.md` (authoritative; GitHub issue **#15**).

## Global Constraints

- **One shaping module, three consumers in the same change (spec ruling):** the seeder, the API test fixtures, and the truncate helper all adopt in this plan. Partial adoption is a plan failure.
- **Builders are pure (spec):** no I/O, no client creation, no transactions inside `catalog-rows.ts`; it never writes, it only shapes. Upsert-vs-insert stays with the caller.
- **Main entry unchanged (spec):** `@sevendays/db` main keeps exporting schema + client only (`migrate` already rides its own subpath). Builders ride the new opt-in `./catalog-rows` subpath. `packages/db/src/index.ts` is not modified in this plan.
- **Unknown attire names fail loudly (spec ruling, pinned by test):** `assertAllKnownAttires` throws naming the offender; `buildJunctionPairs` re-checks per pair as a backstop. Never a silent skip.
- **Fixture dataset stays minimal and synthetic (ADR-0008):** same branches, packages, attires, add-ons. Builder output canonicalizes picture-inclusion `description` to `null` (seed parity) — the current fixture-invented picture descriptions (`'Framed picture'`, `'2R print x4'`, `'2x2 print x5'`) are asserted nowhere (verified: only `addon-services.test.ts` asserts descriptions, and those are add-on rows) and disappear. The privilege description `'High Resolution soft copies'` is fixture-authored, stays.
- **Fixture junction inserts stay one statement per row** in the builder's order: the junction has no position column, so render order falls back to `created_at`; a single batch INSERT shares `now()` and would tie on the id coin flip (the M1.4 plan's Task 4 finding, preserved in the fixtures file's own comment). The builder owns the order; the per-row statements preserve it.
- **Wire byte-identical:** no route edits, no `packages/types` edits, no `apps/api/src/` edits. Every existing api test passes with **zero assertion edits** (audit command in Task 5 Step 2 — diff of the four existing test files against `main` must be empty).
- **Catalog transcription and verify script untouched (spec):** `packages/db/scripts/catalog.ts` and `packages/db/scripts/verify-seed.ts` are not modified. TODO(seed) phones, 8R/8x10, package contents out of scope. No schema or migration changes (the junction position column stays a future decision). Rehearsal/verify gate scripts stay standalone.
- **Accepted wording change:** the seeder's unknown-attire error changes from `seed: unknown attire X for PKG` to the module's `Unknown attire name: X` (the assert runs per package inside the loop, so the failure still localizes to the package being seeded). No test or verify tooling greps that message.
- **Baselines (verified 2026-09-04):** `pnpm --filter @sevendays/db test` = **8 tests (1 passed, 7 skipped without `TEST_DATABASE_URL`)**; `pnpm --filter @sevendays/api test` = **30 passed / 6 files** (compose db up). After this plan: db = **24 tests (16 passed, 8 skipped without `TEST_DATABASE_URL`)**; api = **32 passed / 7 files** (2 new truncate pins). Every gate compares against these.
- **Bootstrap precedes gates:** `pnpm install && pnpm build:packages` (packages resolve from `dist/`). Re-run `pnpm build:packages` after Task 1 lands the subpath export, so `apps/api` resolves `@sevendays/db/catalog-rows` from `dist/`.
- **Compose db for the api suite (ADR-0008):** `docker compose up -d db` first. `apps/api/test/global-setup.ts` already defaults `TEST_DATABASE_URL` to the compose db, so no export is needed locally; do **not** export a wrong value (auth fails loud: `password authentication failed for user "postgres"`).
- **Vitest gotcha (ADR-0003):** run each touched workspace's suite directly and confirm the printed counts — shared `passWithNoTests` turns a discovery miss into silent green.
- **Biome-clean commits:** `pnpm exec biome check --write <touched files>` before every commit; biome scripts call the `biome` bin, never pnpx.
- **Commit conventions:** unscoped conventional subjects (`feat:`, `refactor:`, `docs:`), wordy bullet bodies; commit locally on `feat/catalog-row-shaping-module` only — the user pushes and opens the PR.
- **Type hygiene:** no `!` non-null assertions (guard indexed access — `noUncheckedIndexedAccess` makes `array[i]` possibly-undefined; the plan's code guards it); `async`/`await` only.

---

## File Structure

```
packages/db/src/catalog-rows.ts         (new)  the module: 3 builders + assert + module doc = the "what columns and why" answer
packages/db/src/catalog-rows.test.ts    (new)  15 unit tests + 1 runIf live case, colocated in src/ (vitest include src/**/*.test.ts)
packages/db/package.json                (mod)  opt-in subpath export ./catalog-rows (precedent: ./migrate)
packages/db/scripts/seed.ts             (mod)  inclusion/frame/junction shaping → builders; upsert/rebuild flow intact
apps/api/test/helpers/truncate.ts       (mod)  table list derived from the schema barrel; exports publicTableNames
apps/api/test/helpers/truncate.test.ts  (new)  2 pins: equals-schema-barrel + the known 10-table list
apps/api/test/helpers/fixtures.ts       (mod)  inclusion/junction shaping → builders; same synthetic dataset
docs/progress.md                        (mod)  candidate-C landed line in Known Gaps; Last-updated line
```

No other files change: no `apps/api/src/`, no `packages/types`, no schema, no migrations, no CI (the workflow's service container + job-level `TEST_DATABASE_URL` already cover the derived truncate list end to end — the spec's "CI's first-run-green compose path").

Task map: 0 — branch + environment bootstrap + baselines → 1 — builders TDD (incl. `assertAllKnownAttires`) + subpath export (commit) → 2 — derived truncate helper (commit) → 3 — fixtures adoption (commit) → 4 — seeder adoption + live proof (commit) → 5 — full gates (commit) → 6 — progress.md + issue #15 evidence (commit).

---
### Task 0: Branch and environment bootstrap

**Files:** none (session setup only).

- [ ] **Step 1: Fork the feature branch from main**

```bash
git switch main
git pull --ff-only
git switch -c feat/catalog-row-shaping-module
git log --oneline -1   # expect 97925e2 (candidate B) or later
ls docs/specs/2026-09-02-catalog-row-shaping-module-spec.md
```

Expected: HEAD is on `feat/catalog-row-shaping-module`; the spec file exists on the branch (it is already on main).

- [ ] **Step 2: Bootstrap and start the compose db**

```bash
pnpm install
pnpm build:packages
docker compose up -d db
docker compose ps   # db healthy (pg_isready passing)
```

Expected: install clean; `dist/` built for `packages/db` + `packages/config`. No `TEST_DATABASE_URL` export needed — `apps/api/test/global-setup.ts` defaults to the compose db.

- [ ] **Step 3: Baseline green — record the counts**

```bash
pnpm --filter @sevendays/db test 2>&1 | grep -E "Test Files|Tests "
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "
```

Expected: db = 1 passed / 7 skipped (8 total); api = 30 passed / 6 files. **Record both totals** — every later gate compares against them (after Task 1: db 16 passed + 8 skipped / 24 total; after Task 2: api 32 / 7 files; after Tasks 3–4: unchanged 32 / 7 with zero assertion edits).

---

### Task 1: The row-shaping builders (TDD) + opt-in subpath export

**Files:**
- Create: `packages/db/src/catalog-rows.test.ts`
- Create: `packages/db/src/catalog-rows.ts`
- Modify: `packages/db/package.json` (exports map)

**Interfaces:**
- Consumes: nothing but drizzle-orm type helpers (`is`, `Table` are only needed in Task 3's helper, not here).
- Produces (Tasks 4 and 5 consume exactly these signatures):

```typescript
// packages/db/src/catalog-rows.ts
import type { attires, frames, packageInclusionAttires, packageInclusions } from './schema/index.js';

export type InclusionKind = 'framed_picture' | 'print' | 'privilege';

export type PictureEntry = {
  kind: 'framed_picture' | 'print';
  quantity: number;            // framed_picture callers pass 1 (catalog: one row per Frame line)
  printSizeCode: string | null;
  attireNames: string[];
  frameId?: string | null;     // required non-null for framed_picture (asserted by the builder)
};

export type PrivilegeEntry = {
  kind: 'privilege';
  description: string;
  attireNames: string[];
};

export type InclusionEntry = PictureEntry | PrivilegeEntry;

export type AttireIdLookup = ReadonlyMap<string, string>;          // attire name -> attire id
export type PrintSizeIdLookup = ReadonlyMap<string, string>;       // print size code -> print size id

export type InclusionRowValues = typeof packageInclusions.$inferInsert;
export type JunctionPairValues = typeof packageInclusionAttires.$inferInsert;
export type FrameRowValues = typeof frames.$inferInsert;

export function buildInclusionRowValues(input: {
  servicePackageId: string;
  entries: readonly InclusionEntry[];
  printSizeId: PrintSizeIdLookup;
}): InclusionRowValues[];

export function buildJunctionPairs(input: {
  inclusionIds: readonly string[];        // same order as the entries array was given
  entries: readonly InclusionEntry[];
  attireId: AttireIdLookup;
}): JunctionPairValues[];

export function buildFrameRowValues(input: {
  servicePackageId: string;
  frameNumbers: readonly number[];
}): FrameRowValues[];

export function assertAllKnownAttires(input: {
  entries: readonly InclusionEntry[];
  attireId: AttireIdLookup;
}): void;  // throws Error(`Unknown attire name: ${name}`) on the first offender
```

Contract notes the implementer must honor (these ARE the module's docs):
- **Per-Kind field rules** (ADR-0009): `framed_picture` → `quantity: 1`, `printSizeId` from the code lookup (unknown code → throw `Unknown print size code: X`), `frameId` required non-null (throw `framed_picture entry is missing frameId`), `description: null`; `print` → `quantity` from the entry, `printSizeId` from the code lookup, `frameId: null`, `description: null`; `privilege` → `quantity: null`, `printSizeId: null`, `frameId: null`, `description` from the entry. `createdAt`/`updatedAt`/`id` are DB defaults — never set.
- **Junction decomposition in catalog order**: for entry `i` in `entries` order, one pair per name in that entry's `attireNames` array order — `Filipiniana/Executive` becomes two pairs, Filipiniana first. The returned array's order across all entries is entries-then-names; the caller preserves it (fixtures: one INSERT per pair; seeder: batch INSERT, junction order not load-bearing there because the rebuild's read-back re-sorts canonically).
- **Unknown attire name** → throw `Unknown attire name: X` (loud, never skip).
- **Purity**: no I/O, no client creation, no transactions. A `switch (entry.kind)` is exhaustive over `InclusionEntry` — do not widen with a default branch.

- [ ] **Step 1: Write the failing tests**

Create `packages/db/src/catalog-rows.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  assertAllKnownAttires,
  buildFrameRowValues,
  buildInclusionRowValues,
  buildJunctionPairs,
} from './catalog-rows.js';

// Synthetic lookups — the builders are data-agnostic (spec: they shape real
// catalog entries and minimal test data identically).
const printSizeId = new Map([
  ['2R', 'ps-2r'],
  ['11x14', 'ps-11x14'],
]);
const attireId = new Map([
  ['Toga', 'att-toga'],
  ['Filipiniana', 'att-fil'],
  ['Executive', 'att-exec'],
]);

describe('buildInclusionRowValues', () => {
  it('shapes a framed_picture row: quantity 1, resolved printSizeId, frameId, null description', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeCode: '11x14',
          attireNames: ['Toga'],
          frameId: 'frame-1',
        },
      ],
      printSizeId,
    });
    expect(rows).toEqual([
      {
        servicePackageId: 'pkg-1',
        kind: 'framed_picture',
        quantity: 1,
        printSizeId: 'ps-11x14',
        frameId: 'frame-1',
        description: null,
      },
    ]);
  });

  it('shapes a print row: entry quantity, resolved printSizeId, null frameId, null description', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [
        { kind: 'print', quantity: 4, printSizeCode: '2R', attireNames: ['Toga'] },
      ],
      printSizeId,
    });
    expect(rows).toEqual([
      {
        servicePackageId: 'pkg-1',
        kind: 'print',
        quantity: 4,
        printSizeId: 'ps-2r',
        frameId: null,
        description: null,
      },
    ]);
  });

  it('shapes a privilege row: nulls everywhere, description carried', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [
        { kind: 'privilege', description: 'Usage of Toga and Hood', attireNames: ['Toga'] },
      ],
      printSizeId,
    });
    expect(rows).toEqual([
      {
        servicePackageId: 'pkg-1',
        kind: 'privilege',
        quantity: null,
        printSizeId: null,
        frameId: null,
        description: 'Usage of Toga and Hood',
      },
    ]);
  });

  it('preserves entry order across mixed kinds (the seeder cursor pairing depends on it)', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [
        { kind: 'print', quantity: 2, printSizeCode: '2R', attireNames: ['Toga'] },
        { kind: 'privilege', description: 'High Resolution soft copies', attireNames: [] },
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeCode: '11x14',
          attireNames: ['Toga'],
          frameId: 'frame-1',
        },
      ],
      printSizeId,
    });
    expect(rows.map((r) => r.kind)).toEqual(['print', 'privilege', 'framed_picture']);
  });

  it('sets only the six shape fields — id/createdAt/updatedAt stay DB defaults', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [
        { kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: [] },
      ],
      printSizeId,
    });
    const first = rows[0];
    if (!first) throw new Error('expected one row');
    expect(Object.keys(first).sort()).toEqual([
      'description',
      'frameId',
      'kind',
      'printSizeId',
      'quantity',
      'servicePackageId',
    ]);
  });

  it('throws on an unknown print size code, naming it', () => {
    expect(() =>
      buildInclusionRowValues({
        servicePackageId: 'pkg-1',
        entries: [{ kind: 'print', quantity: 1, printSizeCode: '999', attireNames: [] }],
        printSizeId,
      })
    ).toThrow('Unknown print size code: 999');
  });

  it('throws on a framed_picture entry without a frameId', () => {
    expect(() =>
      buildInclusionRowValues({
        servicePackageId: 'pkg-1',
        entries: [
          {
            kind: 'framed_picture',
            quantity: 1,
            printSizeCode: '11x14',
            attireNames: ['Toga'],
            frameId: null,
          },
        ],
        printSizeId,
      })
    ).toThrow('framed_picture entry is missing frameId');
  });
});

describe('buildJunctionPairs', () => {
  it('decomposes combined contexts into one pair per attire, in the entry attire order', () => {
    const pairs = buildJunctionPairs({
      inclusionIds: ['inc-1'],
      entries: [
        {
          kind: 'print',
          quantity: 6,
          printSizeCode: '2x2',
          attireNames: ['Filipiniana', 'Executive'],
        },
      ],
      attireId,
    });
    expect(pairs).toEqual([
      { inclusionId: 'inc-1', attireId: 'att-fil' },
      { inclusionId: 'inc-1', attireId: 'att-exec' },
    ]);
  });

  it('walks entries in order and pairs each with its inclusionId (entries-then-names order)', () => {
    const pairs = buildJunctionPairs({
      inclusionIds: ['inc-a', 'inc-b', 'inc-c'],
      entries: [
        { kind: 'framed_picture', quantity: 1, printSizeCode: '8x10', attireNames: ['Toga'], frameId: 'f' },
        { kind: 'privilege', description: 'Usage of Barong', attireNames: [] },
        { kind: 'print', quantity: 4, printSizeCode: '2R', attireNames: ['Executive', 'Uniform'] },
      ],
      attireId: new Map([...attireId, ['Uniform', 'att-uniform']]),
    });
    expect(pairs).toEqual([
      { inclusionId: 'inc-a', attireId: 'att-toga' },
      { inclusionId: 'inc-c', attireId: 'att-exec' },
      { inclusionId: 'inc-c', attireId: 'att-uniform' },
    ]);
  });

  it('yields zero pairs for an empty attireNames list (privileges with no grant)', () => {
    const pairs = buildJunctionPairs({
      inclusionIds: ['inc-1'],
      entries: [{ kind: 'privilege', description: 'Usage of Ladies Accessories', attireNames: [] }],
      attireId,
    });
    expect(pairs).toEqual([]);
  });

  it('throws on an unknown attire name, naming it (pinned loud-fail behavior)', () => {
    expect(() =>
      buildJunctionPairs({
        inclusionIds: ['inc-1'],
        entries: [{ kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: ['Kimono'] }],
        attireId,
      })
    ).toThrow('Unknown attire name: Kimono');
  });
});

describe('buildFrameRowValues', () => {
  it('shapes one row per frame number, in the given order', () => {
    const rows = buildFrameRowValues({ servicePackageId: 'pkg-1', frameNumbers: [2, 1] });
    expect(rows).toEqual([
      { servicePackageId: 'pkg-1', frameNumber: 2 },
      { servicePackageId: 'pkg-1', frameNumber: 1 },
    ]);
  });

  it('yields no rows for a package with no frames', () => {
    expect(buildFrameRowValues({ servicePackageId: 'pkg-1', frameNumbers: [] })).toEqual([]);
  });
});

describe('assertAllKnownAttires', () => {
  it('passes silently when every attire name resolves', () => {
    expect(() =>
      assertAllKnownAttires({
        entries: [
          { kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: ['Toga', 'Executive'] },
        ],
        attireId,
      })
    ).not.toThrow();
  });

  it('throws naming the first unknown attire across entries', () => {
    expect(() =>
      assertAllKnownAttires({
        entries: [
          { kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: ['Toga'] },
          { kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: ['Saya', 'Kimono'] },
        ],
        attireId,
      })
    ).toThrow('Unknown attire name: Saya');
  });
});
```

Plus the `runIf` live probe (append after the last `describe` block in the same file):

```typescript
// Live probe (ADR-0008 pattern: skipped unless a reachable test db is
// configured) — proves the builders' values insert cleanly against the real
// schema, i.e. the shapes match the tables, not just the type signatures.
// package_inclusions.service_package_id is a NOT-NULL FK, so the probe
// inserts a real parent service package first and rolls the whole thing
// back in a transaction: no leftover rows, re-runnable despite unique keys
// (attires.name, service_packages.name, frames natural key).
describe.runIf(process.env.TEST_DATABASE_URL)('live insert-compatibility', async () => {
  it('accepts builder output as drizzle insert values for all three tables', async () => {
    const {
      attires,
      createDbClient,
      frames,
      packageInclusionAttires,
      packageInclusions,
      servicePackages,
    } = await import('./index.js');
    const db = createDbClient(process.env.TEST_DATABASE_URL as string);
    try {
      await db.transaction(async (tx) => {
        const [attireRow] = await tx
          .insert(attires)
          .values({ name: 'BuilderProbe' })
          .returning({ id: attires.id });
        const probeAttireId = attireRow?.id;
        expect(probeAttireId).toBeDefined();
        if (!probeAttireId) throw new Error('probe: attire insert returned no id');

        const [pkgRow] = await tx
          .insert(servicePackages)
          .values({
            name: 'BuilderProbe Package',
            description: 'probe',
            priceCents: 1,
            isActive: false,
          })
          .returning({ id: servicePackages.id });
        const probePkgId = pkgRow?.id;
        expect(probePkgId).toBeDefined();
        if (!probePkgId) throw new Error('probe: package insert returned no id');

        const [frameRow] = await tx
          .insert(frames)
          .values(buildFrameRowValues({ servicePackageId: probePkgId, frameNumbers: [1] }))
          .returning({ id: frames.id });
        const probeFrameId = frameRow?.id;
        expect(probeFrameId).toBeDefined();
        if (!probeFrameId) throw new Error('probe: frame insert returned no id');

        const inclusionValues = buildInclusionRowValues({
          servicePackageId: probePkgId,
          entries: [
            { kind: 'print', quantity: 1, printSizeCode: null, attireNames: [] },
            {
              kind: 'framed_picture',
              quantity: 1,
              printSizeCode: null,
              attireNames: [],
              frameId: probeFrameId,
            },
          ],
          printSizeId: new Map(),
        });
        const inserted = await tx
          .insert(packageInclusions)
          .values(inclusionValues)
          .returning({ id: packageInclusions.id, kind: packageInclusions.kind });
        expect(inserted).toHaveLength(2);

        const pairs = buildJunctionPairs({
          inclusionIds: inserted.map((r) => r.id),
          entries: [
            { kind: 'print', quantity: 1, printSizeCode: null, attireNames: ['BuilderProbe'] },
            { kind: 'privilege', description: 'probe', attireNames: [] },
          ],
          attireId: new Map([['BuilderProbe', probeAttireId]]),
        });
        expect(pairs).toHaveLength(1);
        await tx.insert(packageInclusionAttires).values(pairs);
        // No assert needed on the insert: it either succeeds or throws the
        // test red. Transaction rollback restores the pre-probe state.
      });
    } finally {
      await db.$client.end();
    }
  });
});
```

> **Amended during execution (2026-09-04, controller ruling on implementer finding):** drizzle's
> `db.transaction` COMMITs on success — there is no rollback-on-success primitive — so the probe as written
> above leaves `BuilderProbe%` rows behind and a second run dies on `attires_name_unique`. The landed probe
> (see `packages/db/src/catalog-rows.test.ts`) drops the transaction and **pre-cleans** any committed probe rows
> first (five FK-safe deletes on `name LIKE 'BuilderProbe%'`: junction → inclusions → frames →
> service_packages → attires), then runs plain inserts. The snippet above is kept for the record; the landed
> test file is authoritative.

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @sevendays/db exec vitest run src/catalog-rows.test.ts 2>&1 | tail -5
```

Expected: FAIL — cannot resolve `./catalog-rows.js` (module not yet created).

- [ ] **Step 3: Write the module**

Create `packages/db/src/catalog-rows.ts`:

```typescript
/**
 * The catalog row-shaping module (candidate C, 2026-09-02 spec): pure
 * functions from catalog-style entries plus resolved id lookups to typed row
 * values and junction pairs. What an Inclusion row needs per Kind, how
 * combined Attire contexts decompose into junction pairs in catalog order,
 * how Frames attach — nothing about HOW or WHEN rows are written: no I/O, no
 * client creation, no transactions. The seeder (upsert-and-rebuild) and the
 * API test fixtures (plain inserts) are its two write adapters.
 *
 * Per-Kind rules (ADR-0009): framed_picture → quantity 1, printSizeId
 * resolved, frameId required, description null; print → entry quantity,
 * printSizeId resolved, frameId null, description null; privilege →
 * quantity/printSizeId/frameId null, description carried. Junction pairs
 * decompose an entry's attireNames in array order — 'Filipiniana/Executive'
 * is two pairs, Filipiniana first (the canonical catalog attire order, never
 * alphabetized). Unknown names fail loudly, never skip.
 */
import type {
  frames,
  packageInclusionAttires,
  packageInclusions,
} from './schema/index.js';

export type InclusionKind = 'framed_picture' | 'print' | 'privilege';

export type PictureEntry = {
  kind: 'framed_picture' | 'print';
  quantity: number;
  printSizeCode: string | null;
  attireNames: string[];
  frameId?: string | null;
};

export type PrivilegeEntry = {
  kind: 'privilege';
  description: string;
  attireNames: string[];
};

export type InclusionEntry = PictureEntry | PrivilegeEntry;

export type AttireIdLookup = ReadonlyMap<string, string>;
export type PrintSizeIdLookup = ReadonlyMap<string, string>;

export type InclusionRowValues = typeof packageInclusions.$inferInsert;
export type JunctionPairValues = typeof packageInclusionAttires.$inferInsert;
export type FrameRowValues = typeof frames.$inferInsert;

export function assertAllKnownAttires(input: {
  entries: readonly InclusionEntry[];
  attireId: AttireIdLookup;
}): void {
  for (const entry of input.entries) {
    for (const name of entry.attireNames) {
      if (!input.attireId.has(name)) {
        throw new Error(`Unknown attire name: ${name}`);
      }
    }
  }
}

export function buildInclusionRowValues(input: {
  servicePackageId: string;
  entries: readonly InclusionEntry[];
  printSizeId: PrintSizeIdLookup;
}): InclusionRowValues[] {
  return input.entries.map((entry) => {
    const base = { servicePackageId: input.servicePackageId };
    switch (entry.kind) {
      case 'framed_picture': {
        if (!entry.frameId) {
          throw new Error('framed_picture entry is missing frameId');
        }
        return {
          ...base,
          kind: 'framed_picture' as const,
          quantity: 1,
          printSizeId: resolvePrintSize(entry.printSizeCode, input.printSizeId),
          frameId: entry.frameId,
          description: null,
        };
      }
      case 'print':
        return {
          ...base,
          kind: 'print' as const,
          quantity: entry.quantity,
          printSizeId: resolvePrintSize(entry.printSizeCode, input.printSizeId),
          frameId: null,
          description: null,
        };
      case 'privilege':
        return {
          ...base,
          kind: 'privilege' as const,
          quantity: null,
          printSizeId: null,
          frameId: null,
          description: entry.description,
        };
    }
  });
}

export function buildJunctionPairs(input: {
  inclusionIds: readonly string[];
  entries: readonly InclusionEntry[];
  attireId: AttireIdLookup;
}): JunctionPairValues[] {
  if (input.inclusionIds.length !== input.entries.length) {
    throw new Error(
      `junction pairing mismatch: ${input.inclusionIds.length} ids for ${input.entries.length} entries`
    );
  }
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
}

export function buildFrameRowValues(input: {
  servicePackageId: string;
  frameNumbers: readonly number[];
}): FrameRowValues[] {
  return input.frameNumbers.map((frameNumber) => ({
    servicePackageId: input.servicePackageId,
    frameNumber,
  }));
}

function resolvePrintSize(
  code: string | null,
  lookup: PrintSizeIdLookup
): string | null {
  if (code === null) return null;
  const id = lookup.get(code);
  if (!id) throw new Error(`Unknown print size code: ${code}`);
  return id;
}
```

Notes for the implementer:
- The `frames` type import in the module snippet is already correct (used by `buildFrameRowValues`'s return type).
- The exhaustive `switch` (no default) is deliberate: adding a Kind variant becomes a compile error here, which is the point of the module (spec user story 2).
- `buildInclusionRowValues` returns rows in `entries` order; the caller pairs them with `buildJunctionPairs` using the same array (the seeder's returning-order cursor walk stays valid).

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @sevendays/db exec vitest run src/catalog-rows.test.ts 2>&1 | grep -E "Test Files|Tests "
```

Expected (no `TEST_DATABASE_URL`): **15 passed, 1 skipped** (16 total). With the compose db's URL exported, the live probe runs too (16 passed).

- [ ] **Step 5: Add the opt-in subpath export**

In `packages/db/package.json`, extend the exports map (leave `.` and `./migrate` untouched):

```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./migrate": {
      "types": "./dist/migrate.d.ts",
      "default": "./dist/migrate.js"
    },
    "./catalog-rows": {
      "types": "./dist/catalog-rows.d.ts",
      "default": "./dist/catalog-rows.js"
    }
  },
```

- [ ] **Step 6: Build, typecheck, full db suite, commit**

```bash
pnpm --filter @sevendays/db build
pnpm --filter @sevendays/db typecheck
pnpm --filter @sevendays/db exec biome check --write src/catalog-rows.ts src/catalog-rows.test.ts
pnpm --filter @sevendays/db build   # biome --write may reorder; rebuild dist/
pnpm --filter @sevendays/db test 2>&1 | grep -E "Test Files|Tests "
pnpm build:packages                  # apps/api resolves @sevendays/db/catalog-rows from dist/
```

Expected: db suite = **16 passed / 8 skipped** (24 total — 8 pre-existing + 16 new) without `TEST_DATABASE_URL`.

```bash
git add packages/db/src/catalog-rows.ts packages/db/src/catalog-rows.test.ts packages/db/package.json
git commit -m "feat: add the catalog row-shaping module as an opt-in db subpath

- buildInclusionRowValues / buildJunctionPairs / buildFrameRowValues /
  assertAllKnownAttires: pure entry+lookup → row-values shapers, the one
  source of per-Kind field rules, combined-attire junction decomposition in
  catalog order, and frame attachment (candidate C spec)
- no I/O, no client, no transactions — the seeder and the api fixtures stay
  separate write adapters (upsert-vs-insert is a real behavioral fork)
- unknown attire names and print size codes fail loudly, pinned by tests
- opt-in @sevendays/db/catalog-rows subpath (./migrate precedent); the main
  entry keeps exporting schema + client only
- 15 unit tests + a TEST_DATABASE_URL-gated live insert-compatibility probe
  (transaction-rolled-back so it leaves no rows and re-runs clean)"
```

---
### Task 2: Derive the truncate table list from the exported schema

**Files:**
- Modify: `apps/api/test/helpers/truncate.ts`
- Test: `apps/api/test/helpers/truncate.test.ts` (new)

**Interfaces:**
- Consumes: `is`, `sql` from `drizzle-orm`; `PgTable`, `getTableConfig` from `drizzle-orm/pg-core`; the schema barrel via the `@sevendays/db` main entry (it re-exports `./schema/index.js`).
- Produces (Tasks 3–5 + `global-setup.ts` keep calling): `truncateAll(db: TestDb): Promise<void>` — signature unchanged — plus the new exported `publicTableNames(): string[]`.

Background facts (verified on drizzle-orm 0.45.2 in this repo — statically in the `.d.ts` files and at runtime via `import('drizzle-orm/pg-core')`):
- `is(value, Table)` is the exported runtime type-guard (`drizzle-orm/entity.js`, re-exported from the root barrel — `index.js` does `export * from "./entity.js"`); `Table` (the dialect-neutral base class) exports from the root barrel too.
- **`PgTable` exports only from `drizzle-orm/pg-core`** (the root barrel does not re-export dialect classes — runtime-verified: `typeof PgTable === 'function'`, `typeof getTableConfig === 'function'`). `getTableConfig<TTable extends PgTable>(table)` returns `{ columns, indexes, foreignKeys, checks, primaryKeys, uniqueConstraints, name, schema }` and is re-exported from `drizzle-orm/pg-core`'s index (`export * from "./utils.js"`).
- **Narrow with `PgTable`, not root `Table`**: `getTableConfig`'s parameter is constrained to `PgTable`, so `is(v, Table)` narrowing would not typecheck the `getTableConfig(v)` call. `is()` walks the prototype chain comparing `entityKind`, so `is(v, PgTable)` matches exactly the pg table instances in the barrel.
- The barrel's non-table exports (the `relations` objects, the `packageInclusionKindEnum` builder) fail the `is(v, PgTable)` guard. `getTableConfig(...).schema` is `undefined` for all ten public tables (default schema) — that filter excludes any future namespaced table (e.g. BetterAuth's).

- [ ] **Step 1: Write the failing tests**

Create `apps/api/test/helpers/truncate.test.ts`:

```typescript
import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import * as schema from '@sevendays/db';
import { publicTableNames } from './truncate.js';

describe('publicTableNames', () => {
  it('equals a fresh schema-barrel walk: every exported pg Table, default schema only', () => {
    const fromBarrel = Object.entries(schema)
      .filter(([, v]) => is(v, PgTable) && getTableConfig(v).schema === undefined)
      .map(([, v]) => getTableConfig(v).name)
      .sort();
    expect(publicTableNames()).toEqual(fromBarrel);
  });

  it('still truncates exactly the ten known public tables (migrations 0000+0001)', () => {
    expect(publicTableNames()).toEqual([
      'addon_services',
      'appointment_addon_services',
      'appointments',
      'attires',
      'branches',
      'frames',
      'package_inclusion_attires',
      'package_inclusions',
      'print_sizes',
      'service_packages',
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @sevendays/api exec vitest run test/helpers/truncate.test.ts 2>&1 | tail -5
```

Expected: FAIL — `publicTableNames` does not exist in `./truncate.js` (import error).

- [ ] **Step 3: Replace the hand-named list with the derived one**

Rewrite `apps/api/test/helpers/truncate.ts` in full:

```typescript
import * as schema from '@sevendays/db';
import { is, sql } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import type { TestDb } from './db.js';

/**
 * The truncate list is derived, not hand-kept (candidate C spec): every
 * public table exported by packages/db's schema barrel — `is(v, PgTable)`
 * and default-schema only. A new table added by a future migration is
 * truncated automatically once the schema barrel exports it; the mirror
 * drift the integration-test ADR (0008) warned about is structurally
 * closed.
 */
export function publicTableNames(): string[] {
  const names: string[] = [];
  for (const value of Object.values(schema)) {
    if (is(value, PgTable)) {
      const config = getTableConfig(value);
      if (config.schema === undefined) {
        names.push(config.name);
      }
    }
  }
  return names.sort();
}

export async function truncateAll(db: TestDb): Promise<void> {
  await db.execute(sql.raw(`TRUNCATE ${publicTableNames().join(', ')} RESTART IDENTITY CASCADE`));
}
```

(`publicTableNames` sorts so the SQL and the pinned expectation are deterministic; TRUNCATE order is irrelevant anyway because of `CASCADE`.)

- [ ] **Step 4: Run the helper tests, then the whole api suite**

```bash
pnpm --filter @sevendays/api exec vitest run test/helpers/truncate.test.ts 2>&1 | grep -E "Test Files|Tests "
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "
```

Expected: helper file = 2 passed; whole suite = **32 passed / 7 files** (30 baseline + 2 new), compose db up.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @sevendays/api exec biome check --write test/helpers/truncate.ts test/helpers/truncate.test.ts
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "   # still 32 / 7
git add apps/api/test/helpers/truncate.ts apps/api/test/helpers/truncate.test.ts
git commit -m "test: derive the truncate table list from the exported db schema

- publicTableNames() walks the @sevendays/db schema barrel with is(v, Table)
  + getTableConfig, default-schema only — a table added by a future migration
  is truncated automatically instead of leaking state between test files
  (the drift ADR-0008 warned about; candidate C spec, user story 3)
- two pins: the derived list equals a fresh barrel walk, and the ten public
  tables of migrations 0000+0001 stay exactly that list
- truncateAll signature and RESTART IDENTITY CASCADE behavior unchanged"
```

---

### Task 3: Adopt the builders in the API test fixtures

**Files:**
- Modify: `apps/api/test/helpers/fixtures.ts`
- Test: `apps/api/test/service-packages.test.ts` (unchanged — the behavior-preservation seam)

**Interfaces:**
- Consumes (from Task 1, via `@sevendays/db/catalog-rows`, resolving from `packages/db/dist/` after `pnpm build:packages`): `buildInclusionRowValues`, `buildJunctionPairs`, type `InclusionEntry`.
- Produces: `loadFixtures(db: TestDb): Promise<FixtureIds>` — same signature, same `FixtureIds` shape, same dataset, same insertion sequence (junction per-row statements preserved for the `created_at` render-order invariant).

- [ ] **Step 1: Add the builder imports**

At the top of `apps/api/test/helpers/fixtures.ts`, alongside the existing type import:

```typescript
import {
  buildInclusionRowValues,
  buildJunctionPairs,
  type InclusionEntry,
} from '@sevendays/db/catalog-rows';
```

(The dynamic `await import('@sevendays/db')` for schema tables stays as-is.)

- [ ] **Step 2: Replace the inclusion + junction section**

Replace everything from `const [inclusionFramedPicture] = await db` (fixtures.ts line ~151) through the last `packageInclusionAttires` insert (line ~217, the `inclusionPrint2x2`/`attireToga` one) — i.e. the five inclusion inserts and the four junction inserts — with:

```typescript
  // Inclusion + junction shaping goes through the db builders (candidate C):
  // one source for per-Kind fields and attire decomposition. Ids are still
  // captured per row — the stitch read orders junction rows by created_at,
  // and autocommit gives each insert its own timestamp.
  const printSizeIdMap = new Map([
    ['2R', printSize2R.id],
    ['2x2', printSize2x2.id],
    ['11x14', printSize11x14.id],
  ]);
  const attireIdMap = new Map([
    ['Toga', attireToga.id],
    ['Filipiniana', attireFilipiniana.id],
    ['Executive', attireExecutive.id],
    ['Uniform', attireUniform.id],
  ]);

  const combinedEntries: InclusionEntry[] = [
    {
      kind: 'framed_picture',
      quantity: 1,
      printSizeCode: '11x14',
      attireNames: ['Filipiniana', 'Executive'],
      frameId: frameCombined.id,
    },
    { kind: 'print', quantity: 4, printSizeCode: '2R', attireNames: ['Toga'] },
    { kind: 'print', quantity: 5, printSizeCode: '2x2', attireNames: ['Toga'] },
    { kind: 'privilege', description: 'High Resolution soft copies', attireNames: [] },
  ];
  const combinedValues = buildInclusionRowValues({
    servicePackageId: packageCombined.id,
    entries: combinedEntries,
    printSizeId: printSizeIdMap,
  });

  // Guard the indexed reads (noUncheckedIndexedAccess); the per-row inserts
  // keep the original fixture sequence.
  const [framedRow, print2RRow, print2x2Row, privilegeRow] = combinedValues;
  if (!framedRow || !print2RRow || !print2x2Row || !privilegeRow) {
    throw new Error('fixtures: builder returned fewer rows than entries');
  }

  const [inclusionFramedPicture] = await db
    .insert(packageInclusions)
    .values(framedRow)
    .returning({ id: packageInclusions.id });
  const [inclusionPrint2R] = await db
    .insert(packageInclusions)
    .values(print2RRow)
    .returning({ id: packageInclusions.id });
  const [inclusionPrint2x2] = await db
    .insert(packageInclusions)
    .values(print2x2Row)
    .returning({ id: packageInclusions.id });
  await db.insert(packageInclusions).values(privilegeRow);

  const simpleEntries: InclusionEntry[] = [
    { kind: 'print', quantity: 2, printSizeCode: '2R', attireNames: ['Toga'] },
  ];
  const [simpleRow] = buildInclusionRowValues({
    servicePackageId: packageSimple.id,
    entries: simpleEntries,
    printSizeId: printSizeIdMap,
  });
  if (!simpleRow) throw new Error('fixtures: builder returned no simple-package row');
  const [simplePrintRow] = await db
    .insert(packageInclusions)
    .values(simpleRow)
    .returning({ id: packageInclusions.id });

  // One row per statement (not one batch): the junction has no position
  // column, so render order falls back to insertion order via created_at —
  // rows written in a single INSERT share now() and would tie on an
  // (id-ordered) coin flip (Task 4 finding). Distinct statements give each
  // row a distinct timestamp, preserving catalog attire order
  // deterministically. The builder owns the pair order; these statements
  // preserve it.
  const [framedEntry, print2REntry, print2x2Entry] = combinedEntries;
  const combinedPairs = buildJunctionPairs({
    inclusionIds: [inclusionFramedPicture.id, inclusionPrint2R.id, inclusionPrint2x2.id],
    entries: [framedEntry, print2REntry, print2x2Entry],
    attireId: attireIdMap,
  });
  for (const pair of combinedPairs) {
    await db.insert(packageInclusionAttires).values(pair);
  }
  const simplePairs = buildJunctionPairs({
    inclusionIds: [simplePrintRow.id],
    entries: simpleEntries,
    attireId: attireIdMap,
  });
  for (const pair of simplePairs) {
    await db.insert(packageInclusionAttires).values(pair);
  }
```

What changed vs. the old block, and why each is safe:
- **Picture-inclusion `description` values disappear** (`'Framed picture'`, `'2R print x4'`, `'2x2 print x5'`, `'2R print x2'` → canonical `null`): asserted nowhere (verified — only `addon-services.test.ts` asserts descriptions, all add-on rows). The privilege keeps its fixture-authored `'High Resolution soft copies'`.
- **Junction pair order is identical to the old hand-written statements**: framed → [Filipiniana, Executive], print-2R → [Toga], print-2x2 → [Toga]; simple → [Toga]. The per-row statements preserve the created_at ordering the catalog-read test asserts (`['Filipiniana', 'Executive']`).
- **`packageRetired` still gets no inclusions**; **`Uniform` stays insert-only** (the ids map carries it for future cases, exactly like the old code captured `attireUniform` without linking it).
- The `const [x] = await ... .returning()` destructures follow the file's existing pattern (array destructuring is unaffected by `noUncheckedIndexedAccess`; direct indexed reads are the ones guarded above).

- [ ] **Step 3: Run the integration suite (zero assertion edits)**

```bash
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "
git diff --stat -- apps/api/test/service-packages.test.ts apps/api/test/appointments.test.ts apps/api/test/branches.test.ts apps/api/test/addon-services.test.ts
```

Expected: **32 passed / 7 files** — same as after Task 2 — and the diff output is **empty**: `service-packages.test.ts` (attire order `['Filipiniana', 'Executive']`, privilege attires `[]`, `printSize` null on privileges, frames `[1]`), `appointments.test.ts`, `branches.test.ts`, `addon-services.test.ts` all pass **without a single assertion change**. That is the fixtures-adoption proof.

- [ ] **Step 4: Commit**

```bash
pnpm --filter @sevendays/api exec biome check --write test/helpers/fixtures.ts
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "   # still 32 / 7
git add apps/api/test/helpers/fixtures.ts
git commit -m "refactor: shape the api fixture inclusions and junction pairs via the db builders

- buildInclusionRowValues + buildJunctionPairs now produce the fixture rows;
  the synthetic dataset, id captures, and insertion sequence are unchanged
  (ADR-0008 minimal fixtures preserved)
- picture-inclusion descriptions canonicalize to null (seed parity); the old
  invented strings were asserted nowhere
- junction pairs still insert one statement per row in builder order — the
  created_at render-order invariant (no position column) is preserved
- integration suites pass with zero assertion edits (wire byte-identical)"
```

---
### Task 4: Adopt the builders in the seeder

**Files:**
- Modify: `packages/db/scripts/seed.ts`
- Test: `packages/db/scripts/verify-seed.ts` (unchanged — the behavior-preservation seam, run live)

**Interfaces:**
- Consumes (from Task 1): `buildInclusionRowValues`, `buildJunctionPairs`, `buildFrameRowValues`, `assertAllKnownAttires`, and types `InclusionEntry`/`PictureEntry` — imported from `'../src/catalog-rows.js'` (scripts are in-workspace; same pattern as `seed.ts` importing `../src/index.js`).
- Produces: the same seeded rows — proven by `db:verify-seed` PASSED on the live database after a re-run.

- [ ] **Step 1: Rewire the seeder's shaping to the builders**

In `packages/db/scripts/seed.ts`:

1. Add the builder imports:

```typescript
import {
  assertAllKnownAttires,
  buildFrameRowValues,
  buildInclusionRowValues,
  buildJunctionPairs,
  type InclusionEntry,
  type PictureEntry,
  type PrivilegeEntry,
} from '../src/catalog-rows.js';
```

2. Replace the frame upsert's values line (inside the `for (const fp of pkg.framedPictures)` loop, lines ~105–112) — the `values({...})` literal becomes:

```typescript
          .values(...buildFrameRowValues({ servicePackageId: row.id, frameNumbers: [fp.frameNumber] }))
```

(The upsert/returning/frameId.set mechanics stay exactly as they are — the builder only shapes the values.)

3. Replace the inclusion + junction shaping block (lines ~123–182) with:

```typescript
      await tx.delete(packageInclusions).where(eqPackageInclusions(row.id));

      // Entries in the catalog's own order: framed pictures, then prints,
      // then the universal privileges. The builders shape rows and junction
      // pairs; the returning-order cursor pairing below stays valid because
      // the values array order matches the returning order.
      const entries: InclusionEntry[] = [
        ...pkg.framedPictures.map(
          (f, i): PictureEntry => ({
            kind: 'framed_picture',
            quantity: 1,
            printSizeCode: f.printSizeCode,
            attireNames: [...f.attireNames],
            frameId: frameId.get(f.frameNumber) ?? null,
          })
        ),
        ...pkg.prints.map(
          (p): PictureEntry => ({
            kind: 'print',
            quantity: p.quantity,
            printSizeCode: p.printSizeCode,
            attireNames: [...p.attireNames],
          })
        ),
        ...privilegeSeeds.map(
          (p): PrivilegeEntry => ({
            kind: 'privilege',
            description: p.description,
            attireNames: [...p.attireNames],
          })
        ),
      ];
      assertAllKnownAttires({ entries, attireId: attireIdMap });

      const inclusionValues = buildInclusionRowValues({
        servicePackageId: row.id,
        entries,
        printSizeId: printSizeIdMap,
      });

      const inclusionRows = await tx
        .insert(packageInclusions)
        .values(inclusionValues)
        .returning({ id: packageInclusions.id, kind: packageInclusions.kind });

      const junctionValues = buildJunctionPairs({
        inclusionIds: inclusionRows.map((r) => r.id),
        entries,
        attireId: attireIdMap,
      });
      if (junctionValues.length > 0) {
        await tx.insert(packageInclusionAttires).values(junctionValues);
      }
```

Transcription notes:
- `printSizeIdMap` is the existing `printSizeId` Map (rename avoided — keep the seeder's existing names: it is `printSizeId` at line 56; use it as-is).
- The old hand-rolled cursor walk (`pictureCursor`/`privilegeCursor`, lines 156–182) is **deleted** — `buildJunctionPairs` replaces it. The `kind` field is no longer needed from `.returning()` but keeping it is harmless; keep the projection as-is to minimize diff noise.
- The `InclusionKind` import is **not** needed; only `InclusionEntry`, `PictureEntry`, `PrivilegeEntry` types plus the four functions.
- `attireNames: [...x.attireNames]` spreads the `readonly` seed tuples into `string[]` (the `as const` catalog arrays are readonly; the entry types want mutable arrays).
- The per-package framing above sits inside the existing `for (const pkg of packageSeeds)` loop; the print-size/attire lookup Maps (`printSizeId`, `attireIdMap`) are built before the loop (lines 54–57) — unchanged.

4. Note the error-wording change (accepted, Global Constraints): unknown attire now throws `Unknown attire name: X` from `assertAllKnownAttires`/`buildJunctionPairs` instead of `seed: unknown attire X for PKG`. The assert runs per package inside the loop, so the failure still localizes.

- [ ] **Step 2: Typecheck, lint, unit suite**

```bash
pnpm --filter @sevendays/db typecheck
pnpm --filter @sevendays/db exec biome check --write scripts/seed.ts
pnpm --filter @sevendays/db typecheck   # biome --write may reorder imports; re-verify
pnpm --filter @sevendays/db test 2>&1 | grep -E "Test Files|Tests "
```

Expected: all green; db suite still **16 passed / 8 skipped** (24 total). (The seed script is not in the vitest include path — `src/**/*.test.ts` — so the count is unchanged; this gate is against accidental breakage.)

- [ ] **Step 3: Live proof — re-run the seed and verify against the catalog document**

The compose db is a test db — the seed rides the **live Supabase** URL from `packages/db/.env` (`DATABASE_MIGRATE_URL`, session-mode pooler per ADR-0007; the script reads it via `--env-file=.env`). This is the spec's behavior-preservation proof: the verified seed keeps its exact behavior.

```bash
pnpm --filter @sevendays/db db:seed
pnpm --filter @sevendays/db db:seed     # second run: idempotency stays proven
pnpm --filter @sevendays/db db:verify-seed
```

Expected: first seed `[ok] seeded: 3 branches, 6 print sizes, 4 attires, 2 add-on services, 11 packages with frames and inclusions`; second run identical (no duplicate rows); `db:verify-seed` prints its PASSED summary — all 11 packages line-for-line against `docs/catalog.md`, exit 0. **If the live DB is unreachable from this environment, stop and flag the gap in the PR description and progress.md — do not claim the proof.**

- [ ] **Step 4: Commit**

```bash
git add packages/db/scripts/seed.ts
git commit -m "refactor: shape seed inclusions, junction pairs, and frames via the builders

- the seeder keeps its one-transaction natural-key upsert flow with
  per-package inclusion rebuild; only the shaping moves to catalog-rows
- the hand-rolled junction cursor walk (picture/privilege cursors) is
  replaced by buildJunctionPairs over the returning ids in entries order
- assertAllKnownAttires runs per package before any insert — unknown
  attire names fail loudly with the module's pinned message
- behavior preservation proven live: db:seed re-run twice, db:verify-seed
  PASSED line-for-line against docs/catalog.md"
```

---

### Task 5: Full gates — every consumer proven together

**Files:** none (verification only).

- [ ] **Step 1: The monorepo gate**

```bash
pnpm check   # lint + format + typecheck + test, all workspaces
pnpm build
```

Expected: all green. Test totals: db **24 total (16 passed / 8 skipped without `TEST_DATABASE_URL`)**, api **32 / 7 files**, shared-types untouched. If the api count moved, an assertion was edited — find and revert it.

- [ ] **Step 2: Zero-assertion-edit audit**

```bash
git diff main...HEAD --stat -- 'apps/api/test/service-packages.test.ts' 'apps/api/test/appointments.test.ts' 'apps/api/test/branches.test.ts' 'apps/api/test/addon-services.test.ts'
```

Expected: **no output** — not a single existing test file changed. (The new `truncate.test.ts` is additive.)

- [ ] **Step 3: Diff-shape audit (the spec's one-diff review story)**

```bash
git diff main...HEAD -- packages/db/scripts/seed.ts | grep -cE "^-.*attireNames" || true
grep -rn "kind: 'framed_picture'" apps/api/test/helpers/fixtures.ts packages/db/scripts/seed.ts | wc -l
```

Expected: the seeder diff removes all hand-shaped `attireNames` consumption; exactly **one** occurrence of `kind: 'framed_picture'` remains across both write adapters (inside each file's entries array) — the shape rules now live in `catalog-rows.ts` alone.

- [ ] **Step 4: Confirm the branch state**

```bash
git status --short        # expect clean tree
git log --oneline main..HEAD
```

Expected: 4 commits (Task 1 builders, Task 2 truncate, Task 3 fixtures, Task 4 seeder) — 5 if a fixup commit was needed. Do **not** push — the user pushes and opens the PR. Task 6 adds the docs commit on top.

---

### Task 6: Ledger + issue evidence

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: Update docs/progress.md**

Add to **Known Gaps / Not Yet Done** (after the candidate-B landed bullet, matching the house style):

```markdown
- **Catalog row-shaping module extracted (candidate C landed, 2026-09-04):** `packages/db/src/catalog-rows.ts`
  owns catalog row shapes — `buildInclusionRowValues` (per-Kind fields), `buildJunctionPairs` (combined-attire
  decomposition in catalog order, unknown names throw), `buildFrameRowValues`, `assertAllKnownAttires`; opt-in
  subpath `@sevendays/db/catalog-rows` (main entry still schema + client only). Three consumers adopted in the
  same change: the seeder (upsert/rebuild flow intact), the api fixtures (minimal synthetic dataset intact; per-row
  junction statements preserve the created_at render-order invariant), and the truncate helper (table list now
  derived from the schema barrel via `is(v, PgTable)` + `getTableConfig`, default-schema only — a future table is
  truncated automatically). Behavior preserved: integration suites 32/32 with zero assertion edits; `db:seed`
  re-run twice + `db:verify-seed` PASSED line-for-line. 15 builder unit tests + live insert-compatibility probe
  (TEST_DATABASE_URL-gated, transaction-rolled-back). M2 catalog-write routes (next) call the builders — shape
  parity with the seed by construction.
```

Update the `_Last updated:_` line at the top to:

```markdown
_Last updated: 2026-09-04 (catalog row-shaping module (candidate C) landed on feat/catalog-row-shaping-module; prior: read-stitch module (candidate B) landed; prior: intake deepening (candidate A) landed; prior: M1.5 exit gate verified.)_
```

- [ ] **Step 2: Close the loop on issue #15**

```bash
gh issue comment 15 --body "Implementation plan: docs/superpowers/plans/2026-09-04-catalog-row-shaping-module.md. Landed on feat/catalog-row-shaping-module — builders in packages/db/src/catalog-rows.ts (opt-in ./catalog-rows subpath), three consumers adopted in the same change (seeder, api fixtures, schema-derived truncate list). Proofs: 15 builder unit tests + TEST_DATABASE_URL-gated live insert probe; api integration suites 32/32 with zero assertion edits; db:seed re-run idempotent + db:verify-seed PASSED line-for-line against docs/catalog.md. pnpm check + pnpm build green."
```

(Leave the issue open — the user closes it when the PR merges, matching the #13/#14 flow.)

- [ ] **Step 3: Commit the ledger update**

```bash
git add docs/progress.md
git commit -m "docs: record the catalog row-shaping module (candidate C) in the ledger

- Known Gaps gains the landed bullet: one shaping module, three consumers,
  the proofs (zero assertion edits, verify-seed PASSED, 15 unit tests +
  gated live probe)
- Last-updated line now leads with candidate C"
```

- [ ] **Step 4: Final verification sweep**

```bash
pnpm check 2>&1 | tail -3
git status --short
git log --oneline main..HEAD
```

Expected: everything green, tree clean, 5 commits on the branch (4 code + 1 docs). Hand the branch to the user: push, open the PR (closing #15), review, merge.
