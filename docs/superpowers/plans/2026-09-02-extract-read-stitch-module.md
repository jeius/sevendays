# Extract the Read-Stitch Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One API-owned pure module — `groupChildren(children, childKey)` returning a `(key) => Child[]` lookup — owns row-assembly for stitched list reads (order-preserving, empty-group-defaulting), adopted by both existing call sites in the same change, with response payloads byte-identical: proven by new pure unit tests plus the unchanged real-Postgres integration suites.

**Architecture:** New module `apps/api/src/services/group-children.ts` exports exactly one function. The four hand-rolled grouping `Map`s (three in the Service Package catalog read, one in the Appointment list read) collapse to `groupChildren(...)` calls over **raw rows**; call sites keep their SQL (including the `ORDER BY`s that pin the append-only `created_at` ordering proxies) and their spread-attach. **Projection moves to the attach pass:** the hand-rolled Maps projected during grouping, but `groupChildren`'s two-argument interface (spec-pinned) extracts only a key, and raw rows carry non-wire columns (`junctionRows.inclusionId`, `addonRows.appointmentId`, frame/inclusion DB columns) — so each group holds raw rows and the service projects per-read shape when attaching. That is exactly the spec's split: assembly is the module's; shape-building stays in the service. No `packages/db` interface change, no shared-types change, no wire change.

**Tech Stack:** TypeScript strict (`noUncheckedIndexedAccess`), vitest ^4.1.11 node env with per-workspace config (ADR-0003), Drizzle ORM service modules (SQL untouched), Biome 2.x, pnpm + Turborepo, docker compose postgres:17 for the integration siblings, `gh` CLI for issue evidence.

**Spec:** `docs/specs/2026-09-02-extract-read-stitch-module-spec.md` (authoritative; GitHub issue **#14**). Sequencing satisfied: candidate A (#13) landed via PR #17 (4219417) — `appointmentProjection` and module-owned rejection wording exist; this spec consumes them as-is and touches the read side only.

## Global Constraints

- **Wire byte-identical (spec: "No shared-types changes, no wire changes"):** no route edits, no `packages/types` edits, no `packages/db` edits. Every existing test passes **without assertion modification** — the integration suites are the behavior-preservation proof (ADR-0008).
- **Both call sites adopt in the same change (spec ruling):** all three grouping Maps in `service-packages.ts` and the add-on Map in `appointments.ts` — in **one commit**. Partial adoption is a plan failure.
- **Interface is exactly (spec: "one function, two arguments"):** `groupChildren<Child, Key extends string>(children: readonly Child[], childKey: (child: Child) => Key): (key: Key) => Child[]`. The lookup is the whole interface; call sites keep their object-spread attach.
- **Interface facts, stated and tested (spec: "Interface facts"):** children come back in incoming order (assembly never re-sorts); a key with no children yields `[]`, never `undefined`; keys come from the caller-supplied `childKey` function — no hardcoded column names.
- **The module never sees SQL (spec):** pure row-assembly over already-fetched arrays. No db mocks, no SQL seams introduced anywhere (ADR-0008).
- **SQL untouched (spec: Out of Scope):** every `ORDER BY` and the `created_at` append-only ordering proxies stay exactly where they are (`service-packages.ts:40,61,73`, `appointments.ts:172`). No persisted order columns.
- **Test surface (spec):** unit tests assert external behavior only — no Map inspection, no call-order assertions. Cases: incoming-order preservation, empty-group default, repeated keys, many-parent fan-out, single-child groups, caller-supplied key extraction, empty input.
- **Real Postgres for integration siblings (ADR-0008):** the api suite's global setup fails loud when the compose db is unreachable — even for the pure unit tests (globalSetup runs for the whole workspace). Start `docker compose up -d db` and export `TEST_DATABASE_URL` first.
- **Vitest gotcha (ADR-0003):** after adding the test file, run the api suite directly and confirm the printed count is baseline + 7 (the new unit tests) — shared `passWithNoTests` turns a discovery miss into silent green.
- **Fresh-clone bootstrap precedes gates:** `pnpm install && pnpm build:packages` (packages resolve from `dist/`).
- **Biome-clean commits:** `pnpm exec biome check --write <touched files>` before every commit; biome scripts call the `biome` bin, never pnpx.
- **Commit conventions:** unscoped conventional subjects (`feat:`, `refactor:`, `docs:`), wordy bullet bodies; commit locally on `feat/extract-read-stitch-module` only — the user pushes and opens the PR.
- **Type hygiene:** no `!` non-null assertions; guard destructures; `async`/`await` only (trivially satisfied — the module is pure).
- **Scope guards (spec: Out of Scope):** no M3 Availability adoption design, no write-path changes (candidate A owns those), no error-policy or acquisition changes (candidates D/A own those), no `docs/adr/` changes (this is a module extraction, not a new architectural decision — ADR-0003/0008/0009/0011 all stand).

---

## File Structure

```
apps/api/src/services/group-children.ts        (new)  the module: one exported function; its docstring IS the "how are children attached" answer
apps/api/src/services/group-children.test.ts   (new)  7 pure unit tests, colocated in src/ (vitest include `src/**/*.test.ts`; index.test.ts precedent)
apps/api/src/services/service-packages.ts      (mod)  3 grouping Maps → 3 lookups; inclusion projection becomes .map() then group
apps/api/src/services/appointments.ts          (mod)  add-on grouping Map → lookup
docs/progress.md                               (mod)  candidate-B landed line; junction-ordering watch-item gains the pinned-contract note; last-updated line
```

No new files anywhere else; no test-helper changes; no fixture changes (fixtures already use one statement per junction row — they stay).

Task map: 0 — branch + environment bootstrap + baseline → 1 — `groupChildren` TDD (commit) → 2 — adopt at both call sites, integration proof (commit) → 3 — progress.md + issue #14 evidence + full gate (commit).

---

### Task 0: Branch and environment bootstrap

**Files:** none (session setup only).

- [✅] **Step 1: Fork the feature branch from main**

```bash
git switch main
git pull --ff-only
git switch -c feat/extract-read-stitch-module
git log --oneline -1   # expect 4219417 (candidate A) or later; spec file must exist
ls docs/specs/2026-09-02-extract-read-stitch-module-spec.md
```

Expected: HEAD is on `feat/extract-read-stitch-module`; the spec file exists on the branch (it is already on main).

- [✅] **Step 2: Bootstrap and start the compose db**

```bash
docker compose up -d db
docker compose ps          # db healthy (pg_isready passing)
pnpm install
pnpm build:packages
export TEST_DATABASE_URL='postgres://postgres:***@localhost:5432/sevendays_test'
```

Expected: install clean; `dist/` built for `packages/db` + `packages/config`.

- [✅] **Step 3: Baseline green — record the count**

```bash
pnpm --filter @sevendays/api test
```

Expected: all green. **Record the printed test total** (integration + index tests; candidate A landed its module-seam suite, so the count exceeds the pre-A 25). Every later gate compares against this number: after Task 1 it must be baseline + 7; after Task 2 it must stay baseline + 7 with zero assertion edits.

---

### Task 1: The `groupChildren` module (TDD)

**Files:**
- Create: `apps/api/src/services/group-children.test.ts`
- Create: `apps/api/src/services/group-children.ts`

**Interfaces:**
- Consumes: nothing (pure; no imports besides vitest in the test).
- Produces: `groupChildren<Child, Key extends string>(children: readonly Child[], childKey: (child: Child) => Key): (key: Key) => Child[]` — Task 2's call sites consume exactly this.

- [✅] **Step 1: Write the failing tests**

Create `apps/api/src/services/group-children.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { groupChildren } from './group-children.js';

type Row = { parentId: string; label: string };

const row = (parentId: string, label: string): Row => ({ parentId, label });

describe('groupChildren', () => {
  it('returns children in incoming order for a repeated key', () => {
    const lookup = groupChildren(
      [row('p1', 'first'), row('p2', 'other'), row('p1', 'second')],
      (r) => r.parentId
    );
    expect(lookup('p1')).toEqual([row('p1', 'first'), row('p1', 'second')]);
  });

  it('preserves arbitrary incoming order (never re-sorts)', () => {
    const lookup = groupChildren(
      ['c', 'a', 'b'].map((label, i) => row(`p${i % 2}`, label)),
      (r) => r.parentId
    );
    expect(lookup('p0').map((r) => r.label)).toEqual(['c', 'b']);
    expect(lookup('p1').map((r) => r.label)).toEqual(['a']);
  });

  it('yields [] for a key with no children (never undefined)', () => {
    const lookup = groupChildren([row('p1', 'only')], (r) => r.parentId);
    expect(lookup('missing')).toEqual([]);
  });

  it('fans out across many parents, grouping each key separately', () => {
    const lookup = groupChildren(
      [row('p1', 'a'), row('p2', 'b'), row('p3', 'c'), row('p2', 'd')],
      (r) => r.parentId
    );
    expect(lookup('p1')).toHaveLength(1);
    expect(lookup('p2').map((r) => r.label)).toEqual(['b', 'd']);
    expect(lookup('p3')).toHaveLength(1);
  });

  it('groups a single child', () => {
    const lookup = groupChildren([row('p1', 'solo')], (r) => r.parentId);
    expect(lookup('p1')).toEqual([row('p1', 'solo')]);
  });

  it('returns [] for every key when there are no children at all', () => {
    const lookup = groupChildren([], (r: Row) => r.parentId);
    expect(lookup('p1')).toEqual([]);
  });

  it('extracts keys via the caller-supplied function (no fixed column)', () => {
    const lookup = groupChildren(
      [
        { key: 'k1', v: 1 },
        { key: 'k2', v: 2 },
      ],
      (c) => c.key
    );
    expect(lookup('k1')).toEqual([{ key: 'k1', v: 1 }]);
    expect(lookup('k2')).toEqual([{ key: 'k2', v: 2 }]);
  });
});
```

- [✅] **Step 2: Run the suite to verify it fails**

```bash
pnpm --filter @sevendays/api test src/services/group-children.test.ts
```

Expected: FAIL — vitest cannot resolve `./group-children.js` (module not written yet). Note the global setup still runs: the compose db must be up even for this red run.

- [✅] **Step 3: Write the module**

Create `apps/api/src/services/group-children.ts`:

```typescript
/**
 * Row-assembly for stitched list reads: group already-fetched child rows by
 * their parent key, then attach them to parent rows in a final pass.
 *
 * The contract (tested in group-children.test.ts):
 * - Order: each key's children come back in the order they arrived. Queries
 *   deliver children pre-ordered — the ORDER BY pins the append-only
 *   created_at proxies per the ADR-0009 revision; assembly never re-sorts.
 * - Empty groups: a key with no children yields [] — never undefined — so a
 *   parent with no children keeps an empty list after spread-attach.
 * - Keys: extracted by the caller-supplied `childKey` function; this module
 *   never sees SQL or column names.
 *
 * Groups hold raw rows — per-read projection (shape-building) stays in the
 * service, applied at the attach pass:
 *   parents.map((p) => ({ ...p, children: lookup(p.id).map(toChild) }))
 * (identity when the rows already carry exactly the wire shape).
 */
export function groupChildren<Child, Key extends string>(
  children: readonly Child[],
  childKey: (child: Child) => Key
): (key: Key) => Child[] {
  const groups = new Map<Key, Child[]>();
  for (const child of children) {
    const key = childKey(child);
    const list = groups.get(key);
    if (list) {
      list.push(child);
    } else {
      groups.set(key, [child]);
    }
  }
  return (key) => groups.get(key) ?? [];
}
```

- [✅] **Step 4: Run the suite to verify it passes**

```bash
pnpm --filter @sevendays/api test src/services/group-children.test.ts
```

Expected: PASS — 7/7.

- [✅] **Step 5: Full api suite — count gate**

```bash
pnpm --filter @sevendays/api test
```

Expected: all green; printed total = Task 0 baseline + 7. If the new file was not discovered (count unchanged), stop and fix discovery — do not proceed on a silent suite (ADR-0003 gotcha).

- [✅] **Step 6: Biome + typecheck, then commit**

```bash
pnpm exec biome check --write apps/api/src/services/group-children.ts apps/api/src/services/group-children.test.ts
pnpm --filter @sevendays/api typecheck
git add apps/api/src/services/group-children.ts apps/api/src/services/group-children.test.ts
git commit -m "feat: add groupChildren row-assembly module for stitched reads" -m "- one pure function: groupChildren(children, childKey) returns a (key) => Child[] lookup
- contract tested at the interface only: incoming-order preservation, [] default for keyless groups, caller-supplied key extraction
- docstring carries the how-are-children-attached answer (ordering responsibility stays at the queries' ORDER BY per ADR-0009)"
```

Expected: biome clean; typecheck green; commit lands.

---

### Task 2: Adopt at both call sites (one commit — spec ruling)

**Files:**
- Modify: `apps/api/src/services/service-packages.ts` (stitch section, ~lines 75–128)
- Modify: `apps/api/src/services/appointments.ts` (stitch section, ~lines 174–188)

**Interfaces:**
- Consumes: `groupChildren` from Task 1 (exact signature above).
- Produces: no exported-interface change in either service — `listActivePackagesWithInclusions(db)` and `listAppointments(db, { branchId })` keep their signatures; response payloads stay byte-identical.

- [✅] **Step 1: Rewrite the Service Package catalog read's stitch**

In `apps/api/src/services/service-packages.ts`:

1. Add the import: `import { groupChildren } from './group-children.js';`
2. Replace the three grouping Maps and the final return (everything from `const attiresByInclusion = new Map...` through the `return packageRows.map(...)` block) with the code below. **The grouping holds raw rows** (raw junction rows, raw frame rows, raw inclusion rows); **projection happens at the attach pass** — that is the shape-building the spec keeps in the service. Grouping projected objects instead would leak non-wire columns (`inclusionId`, drizzle timestamps on frame rows) into the JSON payloads.

```typescript
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
```

Keep unchanged: all five queries, the `printSizeById` Map (keyed single-object lookup, not grouping — not this spec's concern), and the ordering comment above the junction query.

- [✅] **Step 2: Rewrite the Appointment list read's stitch**

In `apps/api/src/services/appointments.ts`:

1. Add the import: `import { groupChildren } from './group-children.js';`
2. Replace the grouping Map and the final return (from `const addonsByAppointment = new Map...` through the end of the function) with:

```typescript
  // Raw rows carry appointmentId — group raw, project at the attach pass.
  const addonsByAppointment = groupChildren(addonRows, (row) => row.appointmentId);

  return rows.map((row) => ({
    ...row,
    addonServices: addonsByAppointment(row.id).map((a) => ({
      addonServiceId: a.addonServiceId,
      name: a.name,
      priceCents: a.priceCents,
    })),
  }));
```

Keep unchanged: both queries, the `orderBy(appointmentAddonServices.createdAt)` and its comment, the `listAppointments` docstring (its "stitched back in insertion order" statement remains true).

- [✅] **Step 3: Verify — integration suites green, unchanged**

```bash
pnpm --filter @sevendays/api test
```

Expected: all green; printed total = baseline + 7 (identical to the Task 1 gate). Zero test-file edits in this task — `git status` must show only the two service files. The catalog assertions (`['Filipiniana', 'Executive']` attire order, `[]` privilege attires, frames `[1]`) passing unmodified IS the behavior-preservation proof.

- [✅] **Step 4: Repo-wide static gates**

```bash
pnpm typecheck
pnpm lint
```

Expected: green. (No `?? []` remains at the adoption sites — the lookup guarantees the empty list; that deletion is the point of the change.)

- [✅] **Step 5: Biome + commit**

```bash
pnpm exec biome check --write apps/api/src/services/service-packages.ts apps/api/src/services/appointments.ts
pnpm exec biome check apps/api/src/services/
git add apps/api/src/services/service-packages.ts apps/api/src/services/appointments.ts
git commit -m "refactor: adopt groupChildren at both stitched reads" -m "- Service Package catalog read: the three grouping Maps become three groupChildren lookups over raw rows; projections happen at the attach pass (shape-building stays in the service)
- Appointment list read: the add-on grouping Map becomes one lookup over raw rows; addonServices project at attach, [] default preserved for appointmentless keys
- SQL, ORDER BYs, and created_at ordering proxies untouched; wire payloads byte-identical (integration suites pass with zero assertion edits)"
```

Expected: biome clean; commit lands.

---

### Task 3: Docs, issue evidence, full gate

**Files:**
- Modify: `docs/progress.md`

**Interfaces:**
- Consumes: everything landed in Tasks 1–2 (commit hashes for evidence).
- Produces: progress.md ledger current for the next session; evidence comment on issue #14.

- [✅] **Step 1: Full gate**

```bash
pnpm check
```

Expected: green (lint + format + typecheck + test across the repo). Nothing outside `apps/api` changed except progress.md, so this is a formality gate — but it is the commit gate per AGENTS.md.

- [✅] **Step 2: Update docs/progress.md**

1. **Last-updated line:** extend the existing `_Last updated: …_` line to lead with: `read-stitch module (candidate B) landed on feat/extract-read-stitch-module; prior: intake deepening (candidate A) merged via #17 …` (keep the existing history tail).
2. **Landed line** (in the landed/completed section, after the candidate-A bullet):
   `- **Read-stitch module extracted (candidate B landed, 2026-09-02):** apps/api/src/services/group-children.ts owns row-assembly for stitched reads — groupChildren(children, childKey) returns a lookup preserving the children's incoming order and defaulting missing keys to [] (never undefined). Both call sites adopted in the same change: the Service Package catalog read's three grouping Maps (inclusions, attires-by-inclusion, frames-by-package) and the Appointment list read's add-on Map; groups hold raw rows and projection happens at the attach pass (shape-building stays in the service). SQL and ORDER BYs untouched; wire payloads byte-identical (integration suites passed with zero assertion edits). 7 pure unit tests pin the interface contract.`
3. **Junction-ordering watch-item** (the M1.4 watch-item bullet about `package_inclusion_attires` having no position column): append to that bullet —
   `; 2026-09-02 (candidate B): assembly's order-preservation and empty-group rules are now pinned by apps/api/src/services/group-children.test.ts — introducing a persisted position column later means one module's documentation changes, not every call site's assumptions`

- [✅] **Step 3: Post evidence on issue #14**

```bash
gh issue comment 14 --body "$(cat <<'EOF'
Implemented on `feat/extract-read-stitch-module` (plan: `docs/superpowers/plans/2026-09-02-extract-read-stitch-module.md`).

- `apps/api/src/services/group-children.ts` — `groupChildren(children, childKey)` → `(key) => Child[]`; docstring states the contract (incoming-order preservation, `[]` default, caller-supplied key extraction).
- 7 pure unit tests in `apps/api/src/services/group-children.test.ts` pin the interface (order, empty groups, fan-out, single-child, empty input, key extraction).
- Both call sites adopted in one commit: the catalog read's three grouping Maps and the Appointment list read's add-on Map; the inclusion projection stays in the service as `.map()` + group.
- Behavior preservation: full api suite green with zero assertion edits (catalog attire-order and empty-attires assertions passing unchanged); SQL/ORDER BYs untouched per spec Out-of-Scope.
EOF
)"
```

Expected: comment posted (verify with `gh issue view 14 --comments | tail -20`). Leave the issue open — it closes when the user's PR merges (`Closes #14` in the PR body).

- [✅] **Step 4: Commit docs**

```bash
git add docs/progress.md
git commit -m "docs: record candidate-B read-stitch extraction in progress.md" -m "- landed line for the groupChildren module + both-call-site adoption
- junction-ordering watch-item notes the assembly contract is now pinned by tests (spec user story 9)
- evidence posted on issue #14; issue closes at PR merge"
git log --oneline -4
```

Expected: three feature commits on the branch (feat / refactor / docs); working tree clean.

---

## Self-Review (recorded at plan-writing time)

- **Spec coverage:** module + interface facts + docstring (Task 1); both-call-site adoption incl. the three catalog Maps and the add-on Map, with projection at the attach pass so shape-building stays in the service (Task 2, spec Implementation Decisions); no-types/no-wire/no-SQL changes (constraints + Task 2 gate: zero test edits — and the raw-rows/projection-at-attach design is what makes the wire byte-identical claim true, since raw drizzle rows carry non-wire columns); unit-test case list from spec Testing Decisions (Task 1 Step 1 covers all six listed cases); integration suites as the ADR-0008 proof (Task 0 baseline + Task 2 Step 3); junction-ordering watch-item tracking (Task 3 Step 2.3); prior art followed (types-package unit-test style, colocated api test precedent). M3 adoption, persisted order columns, write path, error policy: excluded by constraint lines — spec Out of Scope.
- **Placeholder scan:** every code step contains the full final code; docs steps contain the exact lines to add; no TBD/TODO.
- **Type consistency:** `groupChildren<Child, Key extends string>(children: readonly Child[], childKey: (child: Child) => Key): (key: Key) => Child[]` — identical in Task 1 definition, docstring contract, and Task 2 call sites. Call-site generics resolve structurally: `junctionRows` → joined select `{ inclusionId, id, name }` (Key = `string` from the uuid column); `frameRows` → drizzle frame select (Key = `string`); `inclusionRows` → drizzle inclusion select (Key = `string`); `addonRows` → joined select `{ appointmentId, addonServiceId, name, priceCents }`. Lookups return the raw row types; the attach-pass `.map()` lambdas carry explicit return annotations (`ServicePackageWithInclusions['inclusions'][number]`, and inline object literals matching `AppointmentAddonEntry`/`ResolvedFrame`) so the wire shape is checked at compile time even though the grouped values are raw rows.
