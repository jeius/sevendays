# Deepen the Appointment Intake Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen the Appointment intake module behind its unchanged interface — one transaction wraps reference resolution and both inserts, rejection failures carry their byte-identical user-facing message inside the module, the appointments route logs before the uniform 500, and the duplicated 13-column projection collapses to one constant — proven by a compose rollback test and a one-shot live probe over the Supabase transaction-mode pooler.

**Architecture:** No new modules. `createAppointment(db, input)` keeps its exact signature; internally the body becomes one `db.transaction(...)` (drizzle → postgres.js `sql.begin`) covering the three reference reads and both inserts. The failure variant of `CreateAppointmentResult` gains `message: string` (wording moved from the route's `REASON_MESSAGES` map into the module); the route's failure branch becomes `badRequest(c, result.message)` and its catch blocks gain `console.error` before `internalError(c)`. The projection literal shared by create (`returning`) and list (`select`) becomes one module-level constant. ADR-0011 untouched: the route still creates the per-request client; the transaction lives inside one request.

**Tech Stack:** Hono ^4.6, Drizzle ORM ^0.45.2 (`db.transaction` on the postgres-js driver), postgres.js ^3.4.9 (`sql.begin`, `reserve()`), Zod v4 via `@sevendays/types`, vitest ^4.1.11 (node env, per-workspace configs per ADR-0003), docker compose (postgres:17) for integration tests, Node >= 24 (native `--env-file`).

**Spec:** `docs/specs/2026-09-02-deepen-appointment-intake-spec.md` (authoritative; GitHub issue **#13**). Two rulings recorded when this plan was written (2026-09-02, owner-answered):
1. **Seam 3 probe target = the live transaction-mode pooler** — `DATABASE_URL` from `apps/api/.dev.vars` (port **6543**), the exact pool the deployed Worker books over. The spec's parenthetical "(the session-pooler URL used for migrations)" is a mislabel; transactions are trivially supported under session pooling, so a 5432 probe proves nothing. The probe script refuses non-6543/non-remote URLs.
2. **Branch base = `docs/architecture-review-specs`** (not main): `git switch docs/architecture-review-specs && git switch -c feat/deepen-appointment-intake`. The spec file (commit `c972df8`) travels with the implementation branch.

## Global Constraints

- **No wire-shape changes (spec):** status codes, payload shapes, and message text are unchanged. Every existing test passes without modification of its assertions except the two strengthened in Task 4 Step 1 (exact-message equalities that already hold today).
- **Rejection messages are byte-identical** to the current route map: `branch` → `'Unknown branchId.'`, `package` → `'Unknown servicePackageId.'`, `package_inactive` → `'Service Package is inactive.'`, `addon` → `'Unknown addonServiceId.'`, `addon_inactive` → `'Add-on Service is inactive.'`.
- **Interface unchanged (spec):** `createAppointment(db: Database, input: CreateAppointmentInput): Promise<CreateAppointmentResult>` keeps its parameters; only the failure variant gains `message`. `reason` stays in the type (tests assert on it; forward-compat hook for `details: { reason }`, which is out of scope).
- **Confirmation gate (spec):** the "insert txn" ledger item closes only when **both** the compose suite is green **and** the live probe PASSes. Compose-green alone does not close it. If the live probe fails, STOP before the module-transaction task and record the outcome per the spec's fallback (transaction decision reopens).
- **Secrets:** connection strings never enter chat, tickets, logs, or the repo. The probe prints derived facts (port, PASS/FAIL) only, following `scripts/check-env.mjs` precedent. Probe URL comes from gitignored `apps/api/.dev.vars` via `node --env-file`.
- **Real Postgres only (ADR-0008):** no db mocks. `packages/db` tests are guarded with `describe.skipIf(!TEST_DATABASE_URL)` (pattern: `src/verify-appointment-row.test.ts`); `apps/api` global setup fails loud when the db is unreachable.
- **`prepare: false` everywhere** (ADR-0007) — already set in `createDbClient`; test/probe clients set it explicitly.
- **`TEST_DATABASE_URL` is plumbed already:** job-level in `.github/workflows/ci.yml` (line 30), in turbo `globalPassThroughEnv`. Locally export it for direct `pnpm --filter` test runs (Task 0).
- **Fresh-clone bootstrap precedes gates:** `pnpm install && pnpm build:packages` before typecheck/tests anywhere (packages resolve from `dist/`).
- **Biome-clean commits (M1.3 ruling):** `pnpm exec biome check --write <touched files>` before every commit; biome scripts call the `biome` bin, never pnpx.
- **No stale-comment scope creep:** the only comment rewrite is the db client STUB block (Task 3) — the spec's own tiny commit.
- **Commit conventions:** unscoped conventional subjects (`feat:`, `test:`, `docs:`, `chore:`), wordy bullet bodies; commit locally on `feat/deepen-appointment-intake` only — the user commits/pushes final state.
- **Type hygiene:** no `!` non-null assertions (`noUncheckedIndexedAccess`); guard destructures (`rows[0]?.n`); `async`/`await` only.
- **Vitest gotcha (ADR-0003):** after touching either vitest workspace, run that workspace's suite directly and confirm the test count is >0 and includes the new tests (shared `passWithNoTests` turns a discovery miss into silent green).

---

## File Structure

```
packages/db/scripts/probe-pooler-transaction.mjs   (new)  one-shot live probe: explicit transactions over the transaction-mode pooler (Seam 3)
packages/db/src/client-transaction.test.ts         (new)  compose rollback/commit proof at the db-client layer (Seam 2)
packages/db/src/client.ts                          (mod)  STUB comment block → factual (M1.3 reality)
apps/api/src/services/appointments.ts              (mod)  appointmentProjection constant; REJECTION_MESSAGES + message-carrying failure; transaction wraps resolve+inserts
apps/api/src/routes/appointments.ts                (mod)  delete REASON_MESSAGES + CreateReason; 400 via result.message; console.error before internalError in both catches
apps/api/test/appointments.test.ts                 (mod)  new module-seam describe (all 5 rejection messages, transactional commit); exact-message strengthening on 2 existing tests
docs/adr/0007-database-connection-topology.md      (mod)  Amended line + Consequences bullet (probe outcome)
docs/progress.md                                   (mod)  insert-txn closure, log-before-500 partial closure, details:{reason} ruling, last-updated line
```

Task map: 0 — branch + env bootstrap → 1 — probe script (commit) → 2 — run probe live + ADR-0007 amendment + probe-outcome ledger line (commit; **confirmation gate part 1**) → 3 — STUB comment chore commit + compose transaction test (commit) → 4 — module deepening TDD (commit; **confirmation gate part 2**) → 5 — log-before-500 (commit) → 6 — Known Gaps finalization + issue #13 evidence (commit) → 7 — full gate + handoff.

---

### Task 0: Branch and environment bootstrap

**Files:** none (session setup only).

- [ ] **Step 1: Fork the feature branch from the docs branch**

```bash
git switch docs/architecture-review-specs
git switch -c feat/deepen-appointment-intake
git log --oneline -1   # expect c972df8 (the candidate-A spec commit) or later docs commit
```

Expected: HEAD is on `feat/deepen-appointment-intake`; `docs/specs/2026-09-02-deepen-appointment-intake-spec.md` exists.

- [ ] **Step 2: Bootstrap and start the compose db**

```bash
docker compose up -d db
docker compose ps          # db healthy (pg_isready passing)
pnpm install
pnpm build:packages
export TEST_DATABASE_URL='postgres://postgres:postgres@localhost:5432/sevendays_test'
```

Expected: install clean; `dist/` built for `packages/db` + `packages/config`.

- [ ] **Step 3: Baseline green**

```bash
pnpm --filter @sevendays/api test
pnpm --filter @sevendays/db test
```

Expected: all green (api: 21 integration tests + 4 index tests, guarded suites included; db: migrate + verify-appointment-row suites; skipped-if-unreachable guards must NOT swallow the suites — the printed counts must be >0 per ADR-0003).

---

### Task 1: Live pooler transaction probe script (Seam 3 tooling)

**Files:**
- Create: `packages/db/scripts/probe-pooler-transaction.mjs`

**Interfaces:**
- Consumes: `DATABASE_URL` env var (the transaction-mode pooler URL from `apps/api/.dev.vars`).
- Produces: exit 0 + `PROBE: PASS` line, or exit 1 + `PROBE: FAIL` line — the fact Task 2 records in ADR-0007. Script is one-shot CLI, never imported by app code.

- [ ] **Step 1: Write the script**

```javascript
// One-shot live probe (intake spec, Seam 3): proves explicit transactions —
// BEGIN / ROLLBACK / COMMIT via postgres.js — work through Supabase's
// TRANSACTION-MODE pooler (port 6543), the exact pool the deployed Worker
// books appointments over (ADR-0007). Every query the API has ever sent was
// autocommit; a module-internal transaction is the first multi-statement
// window, so pooler behavior must be proven before the intake module relies
// on it. Runs once per the spec's confirmation gate; not a test suite.
//
// Prints derived facts only (port, PASS/FAIL lines) — never the connection
// string (scripts/check-env.mjs precedent). Run from packages/db/:
//   node --env-file=../../apps/api/.dev.vars scripts/probe-pooler-transaction.mjs
//
// If this FAILS: the spec's fallback applies — the transaction decision
// reopens; record the outcome in ADR-0007 + progress.md either way.
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set — run with --env-file pointing at apps/api/.dev.vars');
  process.exit(1);
}
const parsed = new URL(url);
const port = parsed.port || '5432';
if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
  console.error('refusing: DATABASE_URL is localhost — this probe targets the LIVE transaction-mode pooler');
  process.exit(1);
}
if (port !== '6543') {
  console.error(
    `refusing: port ${port} is not the transaction-mode pooler (6543) — ` +
      'check-env.mjs maps the URLs: .dev.vars DATABASE_URL = transaction pooler, packages/db/.env DATABASE_MIGRATE_URL = session pooler'
  );
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
let failures = 0;
const check = (label, ok) => {
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${label}`);
  if (!ok) failures += 1;
};

try {
  // Leg 1 — manual BEGIN/ROLLBACK on a pinned connection (reserve() checks
  // out one connection for all three statements, so the temp table is
  // visible throughout): insert, fail mid-transaction, roll back, assert
  // the row never landed.
  const a = await sql.reserve();
  try {
    await a`create temp table probe_txn_a (i int)`;
    await a`begin`;
    await a`insert into probe_txn_a values (1)`;
    try {
      await a`select 1 / 0`; // deliberate runtime error inside the txn
      check('leg1: statement inside txn threw', false);
    } catch {
      await a`rollback`;
    }
    const rows = await a`select count(*)::int as n from probe_txn_a`;
    check('leg1: rollback erased the insert', (rows[0]?.n ?? -1) === 0);
  } finally {
    await a`drop table if exists probe_txn_a`;
    a.release();
  }

  // Leg 2 — sql.begin (the exact primitive drizzle's db.transaction calls):
  // a throwing callback must reject begin AND roll the insert back.
  const b = await sql.reserve();
  try {
    await b`create temp table probe_txn_b (i int)`;
    let threw = false;
    try {
      await b.begin(async (tx) => {
        await tx`insert into probe_txn_b values (1)`;
        await tx`select 1 / 0`;
      });
    } catch {
      threw = true;
    }
    check('leg2: sql.begin rejected the throwing callback', threw);
    const rows = await b`select count(*)::int as n from probe_txn_b`;
    check('leg2: callback failure rolled the insert back', (rows[0]?.n ?? -1) === 0);
  } finally {
    await b`drop table if exists probe_txn_b`;
    b.release();
  }

  // Leg 3 — commit sanity: the same primitive must also COMMIT a clean
  // callback over the pooler (compose proves commit on a direct connection;
  // this proves it under transaction pooling).
  const c = await sql.reserve();
  try {
    await c`create temp table probe_txn_c (i int)`;
    await c.begin(async (tx) => {
      await tx`insert into probe_txn_c values (1)`;
      await tx`insert into probe_txn_c values (2)`;
    });
    const rows = await c`select count(*)::int as n from probe_txn_c`;
    check('leg3: sql.begin commits a clean callback', (rows[0]?.n ?? -1) === 2);
  } finally {
    await c`drop table if exists probe_txn_c`;
    c.release();
  }
} finally {
  await sql.end({ timeout: 5 });
}

console.log(
  failures === 0
    ? 'PROBE: PASS — explicit transactions work over the transaction-mode pooler'
    : 'PROBE: FAIL — the transaction decision reopens (spec fallback); record the outcome in ADR-0007 + progress.md'
);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Lint the script**

Run: `pnpm exec biome check --write packages/db/scripts/probe-pooler-transaction.mjs`
Expected: no unfixable findings (script style matches `scripts/db-state.mjs`).

- [ ] **Step 3: Commit**

```bash
git add packages/db/scripts/probe-pooler-transaction.mjs
git commit -m "feat(db): add live transaction-mode pooler probe script

One-shot Seam 3 probe for the intake-deepening spec (issue #13): proves
BEGIN/ROLLBACK/COMMIT over postgres.js work through Supabase's transaction-mode
pooler (port 6543) — the pool the deployed Worker books over, where every query
so far has been autocommit. Three legs on pinned connections: manual
begin/rollback, sql.begin throwing-callback rollback, sql.begin commit sanity.
Derived-facts output only (port, PASS/FAIL — never the connection string, per
the check-env.mjs precedent). Owner ruling 2026-09-02: the probe targets the
transaction-mode pooler, not the session-mode migration URL."
```

---

### Task 2: Run the live probe + record the outcome (confirmation gate, part 1)

**Files:**
- Modify: `docs/adr/0007-database-connection-topology.md` (add Amended line + one Consequences bullet)
- Modify: `docs/progress.md` (probe-outcome line in Known Gaps)

**Interfaces:**
- Consumes: Task 1's script + `apps/api/.dev.vars` (user-maintained, gitignored).
- Produces: the recorded probe verdict Task 4 depends on (PASS → proceed; FAIL → STOP, spec fallback).

- [ ] **Step 1: Run the probe once, live**

Run (from `packages/db/`): `node --env-file=../../apps/api/.dev.vars scripts/probe-pooler-transaction.mjs`
Expected: three `[PASS]` lines + `PROBE: PASS`, exit 0. The script never prints the URL — verify the output you paste anywhere is free of secrets.

**⚠ If it FAILS:** STOP. Do not start Task 4. Write the failure outcome into ADR-0007 + progress.md (same edit slots as below, flipped wording) and surface to the owner — per the spec, the transaction decision reopens (fallback: transaction around the two inserts only, or revisit ADR-0007).

- [ ] **Step 2: Amend ADR-0007 with the probe outcome**

Directly under the `# Database connection topology` title, add:

```markdown
**Amended:** 2026-09-02 — explicit transactions verified live over the transaction-mode pooler (Seam 3 probe of the intake-deepening spec, issue #13): manual BEGIN/ROLLBACK and postgres.js `sql.begin` rollback + commit legs all PASS on the port-6543 URL the deployed Worker uses. The appointment-intake write (and M3's later capacity check-then-insert) may run one module-internal transaction per request. `prepare: false` remains the hard requirement.
```

As the first bullet under `## Consequences`, add:

```markdown
- Explicit transactions over the transaction-mode pooler are verified working (2026-09-02 probe: rollback + commit legs PASS; derived-facts output only). Under transaction pooling a transaction pins one pooled connection for its duration — keep statements per transaction small (the intake path is five), and `prepare: false` is still required.
```

- [ ] **Step 3: Record the probe outcome in progress.md Known Gaps**

Insert as a new bullet after the `- **log-before-500 is now load-bearing for M2:** ...` bullet:

```markdown
- **Live transaction-pooler probe PASSed (2026-09-02, intake spec Seam 3):** `packages/db/scripts/probe-pooler-transaction.mjs` proved manual BEGIN/ROLLBACK and postgres.js `sql.begin` rollback + commit over the transaction-mode pooler (port 6543) — recorded in ADR-0007's amendment. The intake module's transactional rewrite lands on `feat/deepen-appointment-intake`; the "insert txn" item closes when the compose rollback test (Seam 2) is green alongside this probe (the spec's confirmation gate).
```

- [ ] **Step 4: Commit**

```bash
git add docs/adr/0007-database-connection-topology.md docs/progress.md
git commit -m "docs: record live transaction-pooler probe PASS in ADR-0007

Seam 3 of the intake-deepening spec ran once against the live transaction-mode
pooler (port 6543): rollback legs (manual BEGIN + sql.begin throwing callback)
and the commit leg all PASSed, so explicit transactions are safe on the pool
the Worker books over. ADR-0007 gains the amendment line + a Consequences
bullet (small statements-per-transaction, prepare:false still required);
progress.md Known Gaps records the probe and the confirmation-gate wording.
The insert-txn ledger item closes with the implementation + compose proof, not
on this probe alone."
```

---

### Task 3: STUB comment fix + compose transaction proof (Seam 2)

**Files:**
- Modify: `packages/db/src/client.ts` (comment only)
- Create: `packages/db/src/client-transaction.test.ts`

**Interfaces:**
- Consumes: `createDbClient` (unchanged), `TEST_DATABASE_URL` (compose/CI), `db.transaction` (drizzle 0.45.2 postgres-js driver), `db.$client` (raw postgres.js handle, typed `$client: TClient` in driver.d.ts).
- Produces: pinned evidence that the client layer rolls back on a throwing callback and commits on a clean one — the semantics `createAppointment`'s transaction relies on.

- [ ] **Step 1: Chore commit — fix the stale STUB comment**

In `packages/db/src/client.ts`, replace lines 5–13's doc block:

```typescript
/**
 * STUB: no live database is provisioned yet.
 *
 * Once you have a Postgres connection string (e.g. from Supabase), set
 * `DATABASE_URL` in the consuming app's environment (for apps/api, this is a
 * Cloudflare Workers binding/secret, not a local .env at runtime) and this
 * client will work as-is.
 *
 * Usage: `createDbClient(env.DATABASE_URL)`
 */
```

with:

```typescript
/**
 * The one db client (ADR-0007): `prepare: false` is required under Supabase
 * transaction-mode pooling. Callers pass the URL their runtime owns — the
 * deployed Worker its pooled `DATABASE_URL` secret (per-request, ADR-0011),
 * test harnesses `TEST_DATABASE_URL` (compose/CI).
 *
 * Usage: `createDbClient(connectionString)`
 */
```

```bash
pnpm exec biome check --write packages/db/src/client.ts
pnpm --filter @sevendays/db typecheck
git add packages/db/src/client.ts
git commit -m "chore(db): replace the stale 'no live database' STUB comment

The client has run against the live Supabase database since M1.3 (migrations
0000+0001 applied, catalog seeded + verified) — the pre-M1.3 STUB block was
AI-navigability rot. Rides along per the intake spec's housekeeping note; zero
code change."
```

- [ ] **Step 2: Write the failing-seam test (red)**

Create `packages/db/src/client-transaction.test.ts`:

```typescript
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Database } from './client.js';

// Seam 2 of the intake spec: pin the rollback/commit semantics the
// createAppointment transaction relies on, at the db-client layer, over real
// Postgres (ADR-0008). The live-pooler twin is the one-shot
// scripts/probe-pooler-transaction.mjs — workerd/pooler behavior does not
// surface in Node-env compose tests (the M1.5 lesson).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)('db client transactions (compose, ADR-0008)', () => {
  let db: Database;

  const countScratch = async (): Promise<number> => {
    const rows = await db.$client`select count(*)::int as n from client_txn_scratch_test`;
    return Number(rows[0]?.n ?? -1);
  };

  beforeAll(async () => {
    db = createDbClient(TEST_DATABASE_URL as string);
    // A real scratch table, not TEMP: statements go through a pool, and a
    // temp table is only visible on the connection that created it.
    await db.execute(sql.raw('drop table if exists client_txn_scratch_test'));
    await db.execute(sql.raw('create table if not exists client_txn_scratch_test (i int)'));
  });

  afterAll(async () => {
    await db.execute(sql.raw('drop table if exists client_txn_scratch_test'));
    await db.$client.end({ timeout: 5 });
  });

  it('rolls the whole transaction back when the callback throws', async () => {
    await db.execute(sql.raw('delete from client_txn_scratch_test'));
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql.raw('insert into client_txn_scratch_test values (1)'));
        await tx.execute(sql.raw('select 1 / 0')); // fail mid-transaction
      })
    ).rejects.toThrow();
    await expect(countScratch()).resolves.toBe(0);
  });

  it('commits when the callback completes', async () => {
    await db.execute(sql.raw('delete from client_txn_scratch_test'));
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw('insert into client_txn_scratch_test values (1)'));
      await tx.execute(sql.raw('insert into client_txn_scratch_test values (2)'));
    });
    await expect(countScratch()).resolves.toBe(2);
  });
});
```

Note: this suite is guarded (`skipIf`), not fail-loud — `packages/db`'s vitest config has no global setup; the same pattern as `src/verify-appointment-row.test.ts`. CI always has `TEST_DATABASE_URL`, so the proof runs there every push.

- [ ] **Step 3: Run it green (the "failure" it pins is db-side, so it can land before the module change)**

Run: `pnpm --filter @sevendays/db test`
Expected: PASS — 2 new tests in the new file; total count >0 with both new test names visible in the output (ADR-0003 check).

- [ ] **Step 4: Lint + typecheck + commit**

```bash
pnpm exec biome check --write packages/db/src/client-transaction.test.ts
pnpm --filter @sevendays/db typecheck
git add packages/db/src/client-transaction.test.ts
git commit -m "test(db): pin drizzle transaction rollback/commit over compose

Seam 2 of the intake-deepening spec: open a transaction on the db client,
insert into a scratch table, throw mid-transaction, assert the row is absent —
plus the clean-commit twin. Uses a real scratch table (not TEMP) because
statements traverse a pool and a temp table is only visible on its creating
connection. Guarded on TEST_DATABASE_URL like the other db-package suites (CI
always sets it); the semantics this pins are what createAppointment's
module-internal transaction will rely on (issue #13)."
```

---

### Task 4: Deepen the intake module (confirmation gate, part 2)

**Files:**
- Modify: `apps/api/src/services/appointments.ts` (projection constant, rejection messages, transaction)
- Modify: `apps/api/src/routes/appointments.ts` (delete the reason→message map; 400 via `result.message`)
- Modify: `apps/api/test/appointments.test.ts` (module-seam tests + exact-message strengthening)

**Interfaces:**
- Consumes: `db.transaction` (Task 3's pinned semantics), `badRequest` from `../services/errors.js` (unchanged), `createAppointmentSchema` from `@sevendays/types`.
- Produces: `CreateAppointmentResult` failure variant becomes `{ ok: false; reason: 'branch' | 'package' | 'package_inactive' | 'addon' | 'addon_inactive'; message: string }`; `listAppointments` unchanged. These exact names/types are what Tasks 5–6 reference.

- [ ] **Step 1: Write the failing tests (red)**

In `apps/api/test/appointments.test.ts`:

(a) Add to the existing imports (top of file):

```typescript
import { appointmentAddonServices } from '@sevendays/db';
import { createAppointmentSchema } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import { createAppointment } from '../src/services/appointments.js';
```

(b) Inside the existing `'rejects an unknown branch with a per-entity 400'` test, replace:

```typescript
    expect((await res.json()).error).toMatch(/branch/i);
```

with:

```typescript
    expect((await res.json()).error).toBe('Unknown branchId.');
```

(c) Inside `'rejects an inactive Add-on Service reference'`, replace:

```typescript
    expect((await res.json()).error).toMatch(/add-on/i);
```

with:

```typescript
    expect((await res.json()).error).toBe('Add-on Service is inactive.');
```

(d) Append this describe block at the end of the file:

```typescript
// Seam 1 of the intake spec — the module's interface is the only place
// intake behavior is proven: rejection failures carry the module-owned
// message, and the happy path commits record + junction rows in one
// transaction. Complements the HTTP-level tests above (route = one call to
// badRequest with result.message).
describe('createAppointment module seam', () => {
  const moduleInput = (overrides: Record<string, unknown> = {}) =>
    createAppointmentSchema.parse(payload(overrides));

  it('carries the exact rejection message for all five reasons', async () => {
    await expect(
      createAppointment(db, moduleInput({ branchId: MISSING_UUID }))
    ).resolves.toEqual({ ok: false, reason: 'branch', message: 'Unknown branchId.' });
    await expect(
      createAppointment(db, moduleInput({ servicePackageId: MISSING_UUID }))
    ).resolves.toEqual({ ok: false, reason: 'package', message: 'Unknown servicePackageId.' });
    await expect(
      createAppointment(db, moduleInput({ servicePackageId: ids.packageRetired }))
    ).resolves.toEqual({
      ok: false,
      reason: 'package_inactive',
      message: 'Service Package is inactive.',
    });
    await expect(
      createAppointment(db, moduleInput({ addonServiceIds: [MISSING_UUID] }))
    ).resolves.toEqual({ ok: false, reason: 'addon', message: 'Unknown addonServiceId.' });
    await expect(
      createAppointment(db, moduleInput({ addonServiceIds: [ids.addonRetired] }))
    ).resolves.toEqual({ ok: false, reason: 'addon_inactive', message: 'Add-on Service is inactive.' });
  });

  it('commits the record and its junction rows through one transaction', async () => {
    const result = await createAppointment(db, moduleInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrows for TS; the line above already failed otherwise
    expect(result.record.packagePriceCents).toBe(150000);
    expect(result.record.addonServices).toEqual([
      { addonServiceId: ids.addonMakeup, name: 'Makeup', priceCents: 12000 },
    ]);
    const junction = await db
      .select({
        appointmentId: appointmentAddonServices.appointmentId,
        addonServiceId: appointmentAddonServices.addonServiceId,
      })
      .from(appointmentAddonServices)
      .where(eq(appointmentAddonServices.appointmentId, result.record.id));
    expect(junction).toHaveLength(1);
    expect(junction[0]?.addonServiceId).toBe(ids.addonMakeup);
  });
});
```

- [ ] **Step 2: Run to verify the expected red**

Run: `pnpm --filter @sevendays/api test`
Expected: the module-seam `toEqual` assertions FAIL — `CreateAppointmentResult` has no `message` property today (`{ ok: false, reason: 'branch' }` mismatches). The two strengthened HTTP assertions (b)/(c) already PASS (byte-identical requirement). Everything else stays green.

- [ ] **Step 3: Implement the module deepening**

In `apps/api/src/services/appointments.ts`:

(a) Below the imports, replace the current `CreateAppointmentResult` type with:

```typescript
/** The five intake rejections; wording is module-owned (route stays thin). */
const REJECTION_MESSAGES = {
  branch: 'Unknown branchId.',
  package: 'Unknown servicePackageId.',
  package_inactive: 'Service Package is inactive.',
  addon: 'Unknown addonServiceId.',
  addon_inactive: 'Add-on Service is inactive.',
} as const;

type CreateReason = keyof typeof REJECTION_MESSAGES;

export type CreateAppointmentResult =
  | { ok: true; record: AppointmentWithAddons }
  | { ok: false; reason: CreateReason; message: string };

function fail(reason: CreateReason): CreateAppointmentResult {
  return { ok: false, reason, message: REJECTION_MESSAGES[reason] };
}
```

(b) Below that, hoist the shared projection (currently duplicated at the top of `createAppointment`'s insert and inside `listAppointments`):

```typescript
// The one Appointment projection (13 columns) — create's `.returning()` and
// the list read select the same shape, so a column change lands here once.
const appointmentProjection = {
  id: appointments.id,
  branchId: appointments.branchId,
  servicePackageId: appointments.servicePackageId,
  customerName: appointments.customerName,
  customerEmail: appointments.customerEmail,
  customerPhone: appointments.customerPhone,
  scheduledAt: appointments.scheduledAt,
  status: appointments.status,
  kind: appointments.kind,
  packagePriceCents: appointments.packagePriceCents,
  notes: appointments.notes,
  createdAt: appointments.createdAt,
  updatedAt: appointments.updatedAt,
} as const;
```

(c) Replace `createAppointment` wholesale (keeps the noUncheckedIndexedAccess projection note, moves it to the constant's comment if preferred):

```typescript
/**
 * Resolve the referenced rows and persist the Appointment with booking-time
 * price snapshots (M1.4). One transaction wraps reference resolution and both
 * inserts (Appointment + add-on junction rows), so a failure anywhere leaves
 * nothing behind — and M3's Slot capacity check-then-insert can later join
 * this same transaction (ADR-0005). Reference resolution is validation: a
 * rejection returns a typed failure whose `message` is the caller-facing
 * wording (module-owned; the route forwards it verbatim). The client never
 * supplies a price — snapshots come from the resolved rows. ADR-0011
 * untouched: `db` is the per-request handle; the transaction lives inside
 * this one request (verified over the live pooler — ADR-0007 amendment).
 */
export async function createAppointment(
  db: Database,
  input: CreateAppointmentInput
): Promise<CreateAppointmentResult> {
  return db.transaction(async (tx) => {
    const [branchRow] = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.id, input.branchId));
    if (!branchRow) return fail('branch');

    const [packageRow] = await tx
      .select({
        id: servicePackages.id,
        isActive: servicePackages.isActive,
        priceCents: servicePackages.priceCents,
      })
      .from(servicePackages)
      .where(eq(servicePackages.id, input.servicePackageId));
    if (!packageRow) return fail('package');
    if (!packageRow.isActive) return fail('package_inactive');

    const addonRows =
      input.addonServiceIds.length > 0
        ? await tx
            .select({
              id: addonServices.id,
              name: addonServices.name,
              priceCents: addonServices.priceCents,
              isActive: addonServices.isActive,
            })
            .from(addonServices)
            .where(inArray(addonServices.id, input.addonServiceIds))
        : [];

    if (addonRows.length !== input.addonServiceIds.length) return fail('addon');
    if (addonRows.some((a) => !a.isActive)) return fail('addon_inactive');

    const [appointment] = await tx
      .insert(appointments)
      .values({ ...input, packagePriceCents: packageRow.priceCents, notes: input.notes ?? null })
      .returning(appointmentProjection);
    if (!appointment) {
      throw new Error('insert appointments: no row returned');
    }

    if (addonRows.length > 0) {
      await tx.insert(appointmentAddonServices).values(
        addonRows.map((a) => ({
          appointmentId: appointment.id,
          addonServiceId: a.id,
          priceCents: a.priceCents,
        }))
      );
    }

    const record: AppointmentWithAddons = {
      ...appointment,
      addonServices: addonRows.map((a) => ({
        addonServiceId: a.id,
        name: a.name,
        priceCents: a.priceCents,
      })),
    };
    return { ok: true, record };
  });
}
```

(d) In `listAppointments`, delete its local `const returning = { ... }` block (the second copy of the 13 columns) and change its select to use the constant:

```typescript
  const rows = await db
    .select(appointmentProjection)
    .from(appointments)
    .where(branchId ? eq(appointments.branchId, branchId) : undefined)
    .orderBy(desc(appointments.createdAt))
    .limit(200);
```

(e) In `apps/api/src/routes/appointments.ts`, delete the `CreateReason` type alias and the whole `REASON_MESSAGES` const (lines 13–21), drop the now-unused `import type { CreateAppointmentResult }` line, and change the failure branch of the POST handler:

```typescript
    if (!result.ok) {
      return badRequest(c, result.message);
    }
```

- [ ] **Step 4: Run to green**

Run: `pnpm --filter @sevendays/api test && pnpm --filter @sevendays/api typecheck`
Expected: all tests PASS — the new module-seam tests green, every pre-existing test untouched and green (byte-identical messages/shape), typecheck clean. Confirm the printed count grew by 2 over Task 0's baseline.

- [ ] **Step 5: Lint + commit**

```bash
pnpm exec biome check --write apps/api/src/services/appointments.ts apps/api/src/routes/appointments.ts apps/api/test/appointments.test.ts
git add apps/api/src/services/appointments.ts apps/api/src/routes/appointments.ts apps/api/test/appointments.test.ts
git commit -m "feat(api): transactional appointment intake with module-owned wording

The intake module deepens behind its unchanged interface (intake spec, issue
#13): one db.transaction wraps reference resolution (Branch, Service Package,
Add-on Services) and both inserts — Appointment + junction rows — closing the
partial-write window and the deactivate-between-read-and-insert TOCTOU, and
giving M3's capacity check-then-insert a transaction to join. The five
reference rejections now return typed failures carrying their user-facing
message (byte-identical to the route's old REASON_MESSAGES map, which is
deleted — the route's failure branch is one badRequest(c, result.message));
reason stays in the type as the discriminated failure tests assert on and the
forward-compat hook for details:{reason}. The 13-column Appointment projection
collapses to one module constant shared by create's returning and the list
select. No wire-shape changes: compose suite passes with pre-existing
assertions intact plus 2 new module-seam proofs (all five messages; record +
junction rows committed through one transaction). ADR-0007 amendment covers
the pooler; ADR-0011 is untouched."
```

---

### Task 5: Log-before-500 on the appointments route

**Files:**
- Modify: `apps/api/src/routes/appointments.ts` (both catch blocks)

**Interfaces:**
- Consumes: nothing new — `console.error` (no `noConsole` rule in any biome tier config; M6's Loglayer+Pino will replace it).
- Produces: log-before-500 on create + list handlers; the other three routes untouched (candidate D generalizes).

- [ ] **Step 1: Add the logging**

In `apps/api/src/routes/appointments.ts` — GET handler catch, replace:

```typescript
    } catch {
      return internalError(c);
    }
```

with:

```typescript
    } catch (error) {
      // Log before the uniform 500 (progress.md M2 item): the blocker-#2 class
      // of failure was invisible until wrangler tail. console.error is the
      // stopgap — M6 swaps in Loglayer + Pino; candidate D generalizes this
      // into middleware for the other routes.
      console.error('[appointments] list failed:', error);
      return internalError(c);
    }
```

POST handler catch, replace:

```typescript
  } catch {
    return internalError(c);
  }
```

with:

```typescript
  } catch (error) {
    // Same log-before-500 contract as the list handler above.
    console.error('[appointments] create failed:', error);
    return internalError(c);
  }
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @sevendays/api test && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api lint`
Expected: green (no behavioral change to any test — errors still surface as the uniform 500).

- [ ] **Step 3: Commit**

```bash
pnpm exec biome check --write apps/api/src/routes/appointments.ts
git add apps/api/src/routes/appointments.ts
git commit -m "feat(api): log errors before the uniform 500 on the appointments route

Both handlers (create, list) log the caught error via console.error before
returning the uniform 500 — the exact silence that hid deploy blocker #2
(369d4c8) until wrangler tail + temporary instrumentation surfaced it, marked
load-bearing for M2 in progress.md. Appointments only: the other three routes'
silent catches are candidate D's middleware seam (spec: generalize after the
hottest route proves the pattern). console.error is the stopgap until M6's
Loglayer + Pino."
```

---

### Task 6: Close the docs loop

**Files:**
- Modify: `docs/progress.md` (Known Gaps finalization + last-updated line)
- GitHub: comment evidence on issue #13 (via `gh`)

**Interfaces:**
- Consumes: Task 2's probe record, Task 4's landed implementation, Task 5's logging.
- Produces: the spec's full docs obligations discharged; issue #13 ready for the owner to close.

- [ ] **Step 1: Finalize progress.md Known Gaps**

(a) Replace the Task-2 probe bullet with the closed form:

```markdown
- **Appointment intake write is transactional (candidate A landed, 2026-09-02):** `createAppointment` resolves references and writes the Appointment + add-on junction rows inside one module-internal transaction (drizzle `db.transaction` → postgres.js `sql.begin`). Confirmed both ways per the spec's gate: compose rollback/commit proofs in `packages/db/src/client-transaction.test.ts` (Seam 2) and the live one-shot probe over the transaction-mode pooler, `packages/db/scripts/probe-pooler-transaction.mjs` (Seam 3, PASS — ADR-0007 amendment). **Insert-txn item closed.** Rejection wording moved into the module (failure variant carries `message`; route forwards verbatim); the 13-column projection is one constant. M3's capacity check-then-insert can join this transaction.
```

(b) Replace the `- **log-before-500 is now load-bearing for M2:** ...` bullet with:

```markdown
- **log-before-500: appointments route done (2026-09-02), generalization open (candidate D):** both `/api/v1/appointments` handlers log the caught error (`console.error` stopgap; M6 = Loglayer + Pino) before the uniform 500 — the blocker-#2 class of failure can no longer be silent on the booking path. The Branches/Service Packages/Add-on Services routes still swallow errors; the intake spec hands generalization to candidate D (one acquisition/error seam via middleware).
```

(c) Add this ruling bullet to Known Gaps:

```markdown
- **Ruling (2026-09-02, intake spec):** M2+ may add `details: { reason }` to 400 error payloads if the admin UI needs machine-readable reasons — adding later is backward-compatible; the module's typed `reason` is already the hook.
```

(d) Update the `_Last updated:_` line's parenthetical to lead with: `(2026-09-02 intake deepening (candidate A) landed; prior: M1.5 exit gate verified ...)`.

- [ ] **Step 2: Comment evidence on issue #13**

```bash
gh issue comment 13 --body "Implemented on \`feat/deepen-appointment-intake\` (forked from docs/architecture-review-specs per owner ruling).

- Seam 2: \`packages/db/src/client-transaction.test.ts\` — rollback-on-throw + clean-commit pinned over compose Postgres 17.
- Seam 3: \`packages/db/scripts/probe-pooler-transaction.mjs\` ran once against the live transaction-mode pooler (port 6543): 3/3 legs PASS (paste the [PASS]/PROBE lines from your run — no secrets in the output). ADR-0007 amended.
- Module: transaction wraps reference resolution + both inserts; failures carry module-owned messages (byte-identical); projection is one constant; route logs before the 500. Compose suite green with pre-existing assertions untouched.
- Confirmation gate: compose green + probe PASS → insert-txn closed; log-before-500 partially closed (appointments only; candidate D generalizes). Details in progress.md Known Gaps.

Commits: <fill the 5-6 hashes from git log>"
```

(Run `git log --oneline -8` first and paste the real hashes — never leave the placeholder.)

- [ ] **Step 3: Commit the docs**

```bash
pnpm exec biome check --write docs/progress.md 2>/dev/null || true
git add docs/progress.md
git commit -m "docs: close intake-spec Known Gaps in progress.md

Insert-txn item closed (confirmation gate met: compose Seam 2 + live Seam 3
probe, ADR-0007 amendment); log-before-500 marked partially closed —
appointments route only, candidate D generalizes; one-line ruling recorded:
M2+ may add details:{reason} to 400s if the admin UI needs machine-readable
reasons. Issue #13 carries the run evidence."
```

(Note: `biome check` may not cover `docs/` — the `|| true` keeps the step honest either way; formatting rules for markdown come from the repo's format script if configured.)

---

### Task 7: Full gate + handoff

**Files:** none (verification only).

- [ ] **Step 1: The whole-repo gate**

Run: `pnpm check && pnpm build`
Expected: all turbo tasks green (lint + format + typecheck + test across the workspace; builds emit `dist/`).

- [ ] **Step 2: ADR-0003 count check (per touched vitest workspace)**

Run: `pnpm --filter @sevendays/db test && pnpm --filter @sevendays/api test`
Expected: db count = baseline + 2 (both client-transaction tests visible); api count = baseline + 2 (both module-seam tests visible). No workspace silently reports 0 or a pre-change count.

- [ ] **Step 3: Spec-coverage sanity against `docs/specs/2026-09-02-deepen-appointment-intake-spec.md`**

Confirm each: transaction wraps resolution + both inserts (Task 4) · typed failure carries byte-identical message, route map deleted (Task 4) · log-before-500 on both appointments handlers, other routes untouched (Task 5) · one projection constant (Task 4) · Seam 2 compose rollback proof (Task 3) · Seam 3 live probe + ADR-0007 note (Tasks 1–2) · progress.md obligations incl. `details:{reason}` ruling (Task 6) · STUB comment housekeeping as its own tiny commit (Task 3 Step 1) · no schema/migration changes, no wire-shape changes, no shared-types changes (verify: `git diff main --stat -- packages/types packages/db/migrations` shows only the client.ts comment + test file under packages/db).

- [ ] **Step 4: Hand off**

Report to the owner: branch, commit list, probe output lines, test-count deltas, and that issue #13 carries the evidence — the user reviews, then commits/pushes/opens the PR themselves. On PR, tick the spec's tracking note and mention candidate D's now-mechanical follow-up (middleware acquisition/error seam).

---

## Self-Review (recorded at plan time)

- **Spec coverage:** all Solution bullets → Tasks 4–5; all three Testing seams → Tasks 1–3; both docs obligations + the ruling → Tasks 2/6; stale-comment commit → Task 3 Step 1; confirmation gate + fallback → Task 2 Step 1 (STOP hook) + Task 6 wording; Out-of-Scope items (details extension, other routes, stitch, M3, schema) appear in no task.
- **Placeholder scan:** none — every code step carries full file content or exact replacement snippets; the only fill-in is the real commit hashes in the issue comment, with the command to get them.
- **Type consistency:** `CreateReason`/`fail`/`appointmentProjection`/`message` names identical across Task 4's snippets; route references `result.message` only; Task 3's `db.$client`/`db.transaction` usage matches drizzle 0.45.2's typed `$client: TClient` and `transaction(cb)` signatures verified in `node_modules` at plan time.
