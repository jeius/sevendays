# M2 Pre-flight 1/5 — API restructure: AppType export + Zod-validated Env (#21) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the `apps/api` restructure so `@sevendays/api` exports its app type via a types-only subpath export and its Worker env is Zod-validated — the precondition ticket for the shared API client (#22).

**Architecture:** Three deltas to an already-chained Hono app: (1) an explicitly imported, Zod-parsed env type replaces the last ambient-global read at the root app; (2) `export type AppType = typeof app` makes the route surface importable; (3) a types-only `"./app"` subpath export exposes it without making the API a runtime-consumable package. No runtime behavior change except env validation failing loudly.

**Tech Stack:** Hono 4 (Workers), Zod v4, TypeScript 6 (`nodenext` resolution), Vitest 4 (per-workspace config per ADR-0003), pnpm + Turborepo, Biome 2.x (`worker` tier).

**Spec:** `docs/specs/2026-08-30-m2-preflight-api-client-spec.md` (amended 2026-09-04). ADR-0006. Ticket: jeius/sevendays#21. Roadmap: M2 pre-flight block in `docs/plan.md`.

## Global Constraints

- Node >= 24; pnpm workspace; run repo commands from the repo root unless noted.
- Zod v4 everywhere (`zod@^4.5.1`); Zod schemas for external shapes live in `packages/types`, not per-app (AGENTS.md rule).
- All code `async`/`await`; no Promise chains or callbacks.
- Never commit secrets; `DATABASE_URL` reaches the Worker as a secret/var, never in committed files.
- Typecheck-only builds: `verbatimModuleSyntax` + `isolatedModules` are on — `import type` for type-only imports is mandatory.
- Work on a feature branch; never commit to `main`; leave pushing to the user.
- Do not commit code that fails `pnpm check` (lint + format + typecheck + test).
- Every non-2xx response stays `c.json({ error, ... }, <explicit status>)` — never bare `c.notFound()` (ADR-0006 convention; regression-guarded by existing tests).
- The subpath export is **types-only**: no runtime imports of `@sevendays/api/app` may appear anywhere.

---

### Task 1: Zod-validated env — schema + tests (TDD)

**Files:**
- Create: `apps/api/src/env.test.ts`
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/src/services/db.ts` (import path + doc comment only)

**Interfaces:**
- Consumes: `zod` (already a dependency of `@sevendays/api`).
- Produces: `envSchema` (`z.ZodType<{ DATABASE_URL: string }>`, exported), `parseEnv(input: unknown): Env` (exported; throws `z.ZodError` on failure), and the derived `export type Env = z.infer<typeof envSchema>` replacing today's hand-written type. `services/db.ts` keeps exporting `ApiEnv` unchanged (its `Bindings: Env` now refers to the schema-derived type). Later tickets rely on the exported `Env` type deriving from the schema.

- [ ] **Step 1: Write the failing tests for the env parser**

Create `apps/api/src/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('parses a valid binding', () => {
    const env = parseEnv({ DATABASE_URL: 'postgres://u:p@host:5432/db' });
    expect(env.DATABASE_URL).toBe('postgres://u:p@host:5432/db');
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects an empty DATABASE_URL', () => {
    expect(() => parseEnv({ DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-string DATABASE_URL', () => {
    expect(() => parseEnv({ DATABASE_URL: 42 })).toThrow(/DATABASE_URL/);
  });

  it('rejects a malformed URL', () => {
    expect(() => parseEnv({ DATABASE_URL: 'not a url' })).toThrow(/postgres|URL/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @sevendays/api test -- src/env.test.ts`
Expected: FAIL — `parseEnv` does not exist yet (import/type error).

- [ ] **Step 3: Implement the schema and parser**

Replace the entire contents of `apps/api/src/env.ts` with:

```ts
import { z } from 'zod';

// The Worker's runtime env, Zod-parsed once per request (the binding object is
// per-request under workerd) — a missing or malformed DATABASE_URL fails
// loudly here instead of surfacing as a mid-request db error. The exported
// Env derives from the schema; the ambient generated global in
// worker-configuration.d.ts is no longer load-bearing anywhere.
export const envSchema = z.object({
  DATABASE_URL: z.url().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: unknown): Env {
  return envSchema.parse(input);
}
```

Note: `z.url()` already rejects empty strings, so the empty-string test passes via the same path as malformed. If the repo's Zod v4 convention differs (check `packages/types/src/*.ts` siblings), match it.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @sevendays/api test -- src/env.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Fix the ApiEnv import in services/db.ts**

`apps/api/src/services/db.ts` line 3 imports `Env` from `'../env.js'` — that path and name are unchanged, but its doc comment (lines 5–7) says "Bindings stay the ambient Env." Update the comment to reflect reality:

```ts
// The API's request context (ADR-0011 + candidate D): the per-request db
// handle lives in Hono variables, set once by the acquisition middleware on
// /api/v1 and read by every route handler. Bindings are the Zod-validated
// Env from src/env.ts.
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/env.ts apps/api/src/env.test.ts apps/api/src/services/db.ts
git commit -m "feat(api): Zod-validate the Worker env (envSchema + parseEnv, tests)"
```

### Task 2: Root app adopts the explicit Env

**Files:**
- Modify: `apps/api/src/index.ts:1-7`
- Modify: `apps/api/src/env.test.ts` (extend, if you folded Task 1's suite here — otherwise no change)

**Interfaces:**
- Consumes: `Env` (schema-derived) and `parseEnv` from Task 1; Hono's `Bindings` generic.
- Produces: a root app typed as `Hono<{ Bindings: Env }>` where `Env` is the **imported schema-derived type** — zero ambient-global reads. Task 3 wraps exactly this app instance as `AppType`.

- [ ] **Step 1: Make the ambient-global dependency visible (failing typecheck)**

First confirm the current failure mode exists. Run: `pnpm --filter @sevendays/api typecheck` — passes today *because* the ambient global exists. Now prove the dependency: temporarily remove `"worker-configuration.d.ts"` from the `include` array in `apps/api/tsconfig.json` (both `"include"` entries if present) and re-run `pnpm --filter @sevendays/api typecheck`.

Expected: FAIL with `TS2304: Cannot find name 'Env'` at `src/index.ts` line 7 (`new Hono<{ Bindings: Env }>()`). Restore the `include` entry before continuing (do not leave this modified).

This step exists to prove the ambient global is load-bearing today, so the task's diff is honest. If you skip it, Task 3's "zero ambient reads" acceptance check has no before/after evidence.

- [ ] **Step 2: Import and parse the explicit Env in the root app**

In `apps/api/src/index.ts`, change the imports and app construction:

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { type Env, parseEnv } from './env.js';
import { internalError } from './services/errors.js';
import { v1 } from './routes/v1.js';

const app = new Hono<{ Bindings: Env }>();
```

And wrap every handler/middleware that reads `c.env` to parse first. The only such site today is the acquisition middleware in `routes/v1.ts` (`c.env.DATABASE_URL`). Change it to:

```ts
export const acquireDb = async (
  c: import('hono').Context<ApiEnv>,
  next: () => Promise<void>
) => {
  c.set('db', createApiDb(parseEnv(c.env).DATABASE_URL));
  await next();
};
```

(`parseEnv` is imported from `../env.js` in `routes/v1.ts`.) Note `Env` no longer has `ENVIRONMENT`, `BETTER_AUTH_SECRET`, etc. — those optional ambient fields are not used by any current code path (grep `c.env` across `apps/api/src` to confirm; only `acquireDb` reads it). If your grep finds another reader, parse there too — do not widen the schema speculatively.

- [ ] **Step 3: Retire the ambient global declaration**

Delete the `interface Env { ... }` block from `apps/api/worker-configuration.d.ts` (the file may keep its regeneration comment, or be deleted outright — prefer keeping the file with only the comment so `cf-typegen` has a regeneration target). Re-verify the failure mode from Step 1 is gone: re-run the temporary tsconfig-include removal — `pnpm --filter @sevendays/api typecheck` must now **pass** with the ambient file removed from `include`.

This is the ticket's proof that the migration is complete, not merely relocated.

- [ ] **Step 4: Run the full API test suite**

Run: `pnpm --filter @sevendays/api test`
Expected: PASS, no new failures (env tests from Task 1 + existing `index.test.ts` + `group-children.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/routes/v1.ts apps/api/worker-configuration.d.ts
git commit -m "feat(api): root app imports the Zod-validated Env; retire the ambient global"
```

### Task 3: Export AppType via a types-only subpath export

**Files:**
- Modify: `apps/api/src/index.ts` (add one export line at the end)
- Modify: `apps/api/package.json` (add the `"./app"` export)
- Create: `apps/api/src/app-type.test.ts` (type-level assertion only)
- No tsconfig changes required (see Step 3)

**Interfaces:**
- Consumes: the root `app` instance from Task 2 (now explicitly typed).
- Produces: `export type AppType = typeof app` reachable as `import type { AppType } from '@sevendays/api/app'`. **This is the contract #22 consumes** — its `createApiClient` does `hc<AppType>` against exactly this type path. Also produces the grep-verifiable state: `AppType` occurrences in `apps/api/src` go from 0 to ≥1.

- [ ] **Step 1: Add the AppType export**

At the end of `apps/api/src/index.ts`:

```ts
// Hono RPC type-sharing (ADR-0006): the client package type-imports this —
// a route change here re-typechecks the client, which is the drift-kill
// working as intended. Types-only: erased at runtime.
export type AppType = typeof app;
```

- [ ] **Step 2: Declare the subpath export in package.json**

In `apps/api/package.json`, add (top-level, alongside `"main"`-style fields — the API has none today, so add an `exports` field):

```json
"exports": {
  "./app": {
    "types": "./src/index.ts"
  }
}
```

With `moduleResolution: nodenext`, a types-only export with no `default` condition is importable only as `import type` — a runtime import fails to resolve, which is the intended guard.

- [ ] **Step 3: Confirm the tsconfig pitfall does not apply**

`apps/api/tsconfig.build.json` has its own `include` that **replaces** the base's `["src", "worker-configuration.d.ts", "**.config.ts"]` with `["src", "worker-configuration.d.ts"]`. It already contains all of `src`, and `src/index.ts` plus its import graph are inside it — so the `./app` export's target file is covered without edits. Verify by running `pnpm --filter @sevendays/api build` and confirming it exits 0. (This documents the check the spec's include-replacement caveat asks for; no change is the expected outcome.)

- [ ] **Step 4: Write the type-level assertion test**

Create `apps/api/src/app-type.test.ts`:

```ts
import { expectTypeOf, it } from 'vitest';
import type { AppType } from './index.js';

// Type-level only: proves AppType exists and is the Hono app type the RPC
// client will consume. A route change in index.ts changes this type.
it('AppType is exported and resolvable', () => {
  expectTypeOf<AppType>().not.toBeNever();
  expectTypeOf<AppType>().not.toBeUnknown();
  expectTypeOf<AppType>().not.toBeAny();
});
```

- [ ] **Step 5: Run the new test + full gates**

Run: `pnpm --filter @sevendays/api test -- src/app-type.test.ts` → PASS
Run: `pnpm --filter @sevendays/api typecheck` → exit 0
Run: `pnpm --filter @sevendays/api build` → exit 0

- [ ] **Step 6: Annotate the plan.md checkbox — do not tick it**

In `docs/plan.md`, M2 pre-flight checkbox 1 (the italic audit note ends with `Tick when AppType lands.)_`): insert immediately before the closing `)_`:

```markdown
2026-09-04: the three named pieces — AppType export + ./app subpath, Zod-validated Env, ambient-global retirement — landed in this pre-flight task (#21); tick at #25 close-out after end-to-end verification.
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/index.ts apps/api/package.json apps/api/src/app-type.test.ts docs/plan.md
git commit -m "feat(api): export AppType via a types-only ./app subpath export (ADR-0006)"
```

### Task 4: Verification + ticket close-out

**Files:**
- Modify: `docs/progress.md` (What Exists / Immediate Next Steps wording)
- Read-only verification of all prior tasks

**Interfaces:**
- Consumes: everything Tasks 1–3 produced.
- Produces: the verified state #22 starts from.

- [ ] **Step 1: Full repo gates**

Run: `pnpm check` → green, **with a positive test count** (require `Test Files N passed` in the output — vitest 4's pass-with-no-tests must not be the reason it's green; ADR-0003).
Run: `pnpm build` → exit 0.
Run: `grep -rn "AppType" apps/api/src` → ≥1 hit, in `src/index.ts`.
Run: `grep -rn "worker-configuration" apps/api/tsconfig*.json` → optional file kept only for regeneration; zero ambient `Env` reads remain (grep `interface Env` in `apps/api` → no hits outside the d.ts comment).

- [ ] **Step 2: Verify the subpath export resolves as the client will consume it**

This is the #22-facing acceptance check. TypeScript resolves the `@sevendays/api/app` specifier through `node_modules`, so the probe must live **inside the repo** (a workspace file that's never imported by shipped code, or an `apps/api`-relative temp file):

```bash
cat > apps/api/src/__probe-app-type.ts <<'EOF'
import type { AppType } from '@sevendays/api/app';
export type Probe = AppType;
EOF
pnpm --filter @sevendays/api exec tsc --noEmit --strict src/__probe-app-type.ts
rm apps/api/src/__probe-app-type.ts
```

Expected: `tsc` exit 0 with the probe file present (self-import of the same package's export is legal for a probe; if the specifier fails to resolve, fix the `exports` map, not the probe). If the self-import form is unsatisfying, the same check runs for real in #22 Task 1 — this is the early-warning version.

- [ ] **Step 3: Update docs/progress.md**

- Under **What Exists**, extend the `apps/api` bullet: the app type is exported (`AppType` via a types-only subpath export) and the Worker env is Zod-validated.
- Under **Immediate Next Steps**, update the M2 pre-flight item: the restructure checkbox's three named pieces are closed; what remains of the block is the client package (#22) + per-app wiring (#23/#24).

- [ ] **Step 4: Commit + close the ticket**

```bash
git add docs/progress.md
git commit -m "docs: record the API restructure completion (M2 pre-flight 1/5, #21)"
```

Do **not** tick the plan.md M2 pre-flight checkbox 1 (that is #25's close-out job, and its own note says so). Comment on ticket #21 with the verification evidence (test counts, probe exit 0), then close it.

---

## Self-Review

**Spec coverage:**
- Spec "API restructure as a precondition" → Tasks 1–3 (Zod-validated env, ambient-Env retirement, AppType export). ✅
- Spec "Type-sharing via Hono RPC" (`./app` types-only subpath, `import type { AppType } from '@sevendays/api/app'`) → Task 3 Steps 1–2. ✅
- Spec "Testing Decisions" Seam 1b (env tests: missing/malformed fail loudly, valid parses) → Task 1 Steps 1–4. ✅
- Spec "Testing Decisions" Seam 2 (sub-apps still route; 404 JSON envelope regression guard) → Task 2 Step 4 (existing `index.test.ts` suite covers both: versioning-mount + 404-envelope tests already exist and must stay green). ✅
- Ticket #21 acceptance criteria: all five mapped (AppType grep → T3; zero ambient reads + schema-derived type → T2; env tests → T1; Seam 2 → T2 Step 4; check+build green → T4). ✅

**Placeholder scan:** No TBDs; every code step carries actual code; the one non-code step (tsconfig pitfall check) is an explicit verify-with-expected-outcome, not a placeholder. ✅

**Type consistency:** `Env`/`parseEnv`/`envSchema` names consistent between Tasks 1→2; `AppType` produced in Task 3 matches #22's documented consumption (`hc<AppType>` via `@sevendays/api/app`). ✅
