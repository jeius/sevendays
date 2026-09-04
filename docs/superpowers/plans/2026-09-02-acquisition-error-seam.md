# Acquisition / Error Seam — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Hono seam — an acquisition middleware scoped to `/api/v1/*`, a root `onError` that logs once and returns the uniform 500 JSON, and a root `notFound` that returns the uniform 404 JSON — replaces the per-route try/catch + self-acquisition + swallow cross-section across all four API routes, so every current and future route is db-free-at-the-top and every thrown error (including a missing `DATABASE_URL`) lands in the Worker logs with its route.

**Architecture:** The policy moves into Hono's own structure, where it holds by construction instead of convention. `routes/v1.ts` becomes an `ApiEnv` subapp (`Bindings: Env; Variables: { db: Database }`) and mounts one `acquireDb` middleware (`v1.use('*', ...)`) that calls `createApiDb(c.env.DATABASE_URL)` and `c.set('db', ...)`; route handlers drop their `try/catch` and `createApiDb` calls and read `c.get('db')`. `index.ts` gains a root `onError` (logs `console.error(\`[api] ${method} ${path} failed:\`, err)` then `internalError(c)`) and a root `notFound` (uniform JSON 404). Errors thrown from handlers **or** the acquisition middleware propagate to the root `onError` by Hono's composition rules; the root `notFound` catches both top-level and `/api/v1/*` misses. `app.get('/health')` stays mounted on the root app, outside `v1`, so it never runs the acquisition middleware — uptime probes stay db-independent. ADR-0011 is preserved exactly (one per-request client) and only relocated into the middleware.

**Tech Stack:** TypeScript 6 (strict, `noUncheckedIndexedAccess`), Hono 4 (`onError` / `notFound` / `MiddlewareHandler` / `c.set` / `c.get`), vitest 4 per-workspace config (ADR-0003), Biome 2.x, pnpm 11 + Turborepo, docker compose postgres:17 for the integration suite (ADR-0008), `gh` CLI for issue #16 evidence.

**Spec:** `docs/specs/2026-09-02-acquisition-error-seam-spec.md` (authoritative; GitHub issue **#16**).

## Global Constraints

- **Two committed increments, each independently testable (plan structure):** Task 1 ships the envelope — root `onError` + `notFound` — and proves the uniform 404 (the 404 half of the 404/405 ledger item) with the four routes still byte-identical. Task 2 moves acquisition into `v1.use('*')`, deletes every route's `try/catch` + `createApiDb` + inline log lines, and routes read `c.get('db')` — proving the 500 + log policy closes "log-before-500" fully (candidate D). Reviewers can reject Task 2 (route-layer churn) while approving Task 1 (envelope), or vice-versa.
- **`onError` + `notFound` live on the ROOT app (`index.ts`), not on `v1` (probe-verified):** a root `onError` catches thrown errors from `v1`'s middleware and handlers (Hono propagates up); a root `notFound` catches **both** `/nope` (top-level) and `/api/v1/unknown` (prefix-matched, no route) — the latter is the spec's "unknown path under the API returns uniform JSON 404." Mounting `notFound` only on `v1` would leave `/nope` as Hono's bare plain-text 404, which the api-client ADR (ADR-0006) forbids. The acquisition **middleware** is scoped to `v1` only.
- **Middleware registration order is load-bearing (probe-verified):** `v1.use('*', acquireDb)` MUST be called **before** `v1.route('/branches', branches)` etc. A middleware registered after the routes does not compose (Hono matches the route first and skips the late middleware) — the handler's `c.get('db')` would be `undefined`. Routes are mounted first in the current `v1.ts`; Task 2 must reorder so `use('*')` precedes every `route(...)`.
- **Health stays db-free (probe-verified):** `/health` is mounted on the root app, never inside `v1`, so the acquisition middleware never runs for it. A request with `DATABASE_URL: ''` to `/health` still returns 200 — the uptime probe never depends on the database.
- **`Env` binding type untouched; a new Hono app type is added (spec ruling):** the ambient `Env` interface (`worker-configuration.d.ts`) and env bindings/secrets are NOT modified. The plan adds `ApiEnv` (`{ Bindings: Env; Variables: { db: Database } }`) — a Hono app-level generic for the db variable, co-located with `createApiDb` in `services/db.ts`. Mixed generics are fine (probe-verified): current route files (`Hono<{ Bindings: Env }>`) mount cleanly under an `ApiEnv` parent, so Task 1's parent wiring compiles before the routes are migrated.
- **No `packages/types` changes, no success-path wire changes (spec):** the 500 body `{ error: 'Internal server error.' }` and 404 body `{ error: 'Not found.' }` already conform to `apiErrorSchema` (the shared uniform shape); statuses and 2xx payloads are unchanged. `errors.ts` keeps both `badRequest` (routes use it) and `internalError` (only `onError` uses it after Task 2 — routes stop importing it). `createApiDb` is still used, just by the middleware instead of the routes.
- **Supersedes #13's inline logging (spec):** the appointments route's `console.error('[appointments] ... failed:', error)` + `internalError(c)` lines (landed by the intake spec) are removed in Task 2 — one logging point in `onError`, no double-logging. The intake module's transactional write and typed (`ok: false`) failures are untouched; this plan touches only the route layer.
- **405 is deferred (spec + Out of Scope):** Hono has no built-in method-mismatch surface; a correct 405 needs per-route method-set knowledge that belongs to the M2 pre-flight restructure. The seam test asserts `POST /api/v1/branches` (a GET-only route) returns **404** (current, accepted behavior) — locking the deferral so a future change can't silently regress it, without claiming 405 works. The 404/405 ledger item is split: 404 closed here, 405 pointed at the M2 pre-flight.
- **Existing integration suites pass unchanged (ADR-0008):** all endpoint behavior is preserved; the appointments suite's 500-path expectations carry over (the uniform 500 is now produced by `onError`, not the route's catch). `pnpm --filter @sevendays/api test` must stay **32 existing tests, zero assertion edits**; the new seam file is additive.
- **Baselines (verified 2026-09-04):** `pnpm --filter @sevendays/api test` = **32 passed / 7 files** (compose db up; `apps/api/test/helpers/truncate.ts` is the 7th file). After this plan: **38 passed / 8 files** (6 additive seam tests; see Task 1 + Task 2 test steps). `pnpm check` (lint + format + typecheck + test) and `pnpm build` green on the branch.
- **Compose db for the api suite (ADR-0008):** `docker compose up -d db` first. `apps/api/test/global-setup.ts` defaults `TEST_DATABASE_URL` to the compose db, so no export needed locally; do **not** export a wrong value (auth fails loud). For the forced-500 seam tests, pass a deliberately unreachable `DATABASE_URL` inline to `app.request(...)` (a refused-port URL — postgres.js refuses in ~4–10ms, probe-verified) — never touch the real compose URL.
- **Vitest gotcha (ADR-0003):** run the api workspace's suite directly (`pnpm --filter @sevendays/api test`) and confirm the printed file + test counts — shared `passWithNoTests` turns a discovery miss into silent green.
- **Biome-clean commits:** `pnpm --filter @sevendays/api exec biome check --write <touched files>` before every commit; biome scripts call the `biome` bin, never pnpx.
- **Commit conventions:** unscoped conventional subjects (`feat:`/`refactor:`/`docs:`), wordy bullet bodies; commit locally on `feat/acquisition-error-seam` only — the user pushes and opens the PR.
- **Type hygiene:** no `!` non-null assertions (`c.get('db')` is typed `Database` via `ApiEnv`; guard with the generic, not `!`); `async`/`await` only.
- **ADR-0011 amendment (Task 3):** add a one-line Consequences note that the per-request client is now created in the acquisition middleware (`v1.use('*')`) instead of inside each route handler — same per-request semantics, relocated; no behavior change.

---

## File Structure

```text
apps/api/src/index.ts              (mod)  root app: + onError (log + 500 JSON) + notFound (404 JSON); /health unchanged, outside v1
apps/api/src/routes/v1.ts          (mod)  becomes ApiEnv subapp; v1.use('*', acquireDb) BEFORE the route mounts; acquireDb inline
apps/api/src/routes/branches.ts    (mod)  drop createApiDb + try/catch; read c.get('db'); generic -> ApiEnv
apps/api/src/routes/service-packages.ts (mod) same as branches
apps/api/src/routes/addon-services.ts    (mod) same as branches
apps/api/src/routes/appointments.ts      (mod) same; also delete the log-before-500 lines + both catches (supersedes #13)
apps/api/src/services/db.ts        (mod)  + export type ApiEnv { Bindings: Env; Variables: { db: Database } }
apps/api/test/error-seam.test.ts   (new)  6 policy tests through the HTTP seam (404 envelope, 500+log x2, db-free health, 405-deferred)
docs/adr/0011-per-request-db-client.md (mod) one-line relocation note in Consequences
docs/progress.md                    (mod)  close log-before-500 fully; 404/405 split (404 done, 405 -> M2 pre-flight); candidate-D landed line; Last-updated
```

No other files change: no `packages/types`, no `packages/db`, no schema/migrations, no env/secret handling (ADR-0007 URLs untouched), no CI.

Task map: 0 — branch + environment bootstrap + baselines → 1 — envelope (`onError`/`notFound`) + 404 seam tests (commit) → 2 — acquisition middleware + route delegation + remove catches/logs + 500+log tests (commit) → 3 — ADR-0011 amendment + progress.md + issue #16 evidence (commit) → 4 — full gate sweep (commit, biome-tidy final).

---

### Task 0: Branch and environment bootstrap

**Files:** none (session setup only).

- [ ] **Step 1: Fork the feature branch from main**

```bash
git switch main
git pull --ff-only
git switch -c feat/acquisition-error-seam
git log --oneline -1   # expect 260e08c (candidate C) or later
ls docs/specs/2026-09-02-acquisition-error-seam-spec.md
```

Expected: HEAD is on `feat/acquisition-error-seam`; the spec file exists on the branch (it is already on main).

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
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "
```

Expected: **32 passed / 7 files**. Record this total — every later gate compares against it (after Task 1: 35 / 8; after Task 2: 38 / 8; zero existing assertions edited).

---

### Task 1: The error envelope — root `onError` + `notFound`, and the uniform 404 (route layer unchanged)

**Files:**
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/test/error-seam.test.ts`

**Interfaces:**
- Consumes: `internalError` from `services/errors.ts` (unchanged signature `internalError(c: Context)` → 500 JSON).
- Produces: the envelope contract the Task 2 middleware + routes depend on — `onError` returns `internalError(c)`; `notFound` returns `c.json({ error: 'Not found.' }, 404)`. Task 2's `acquireDb` only needs `c.set('db', createApiDb(c.env.DATABASE_URL))`; the routes only need `c.get('db')`.

- [ ] **Step 1: Write the failing seam tests (404 envelope + db-free health)**

```ts
// apps/api/test/error-seam.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';

const url = process.env.TEST_DATABASE_URL as string;

// 404 half of the 404/405 ledger item: every unmounted path — top-level
// and under /api/v1 — returns the uniform JSON envelope, never Hono's
// bare plain-text default (which would degrade the M2 api-client to `unknown`).
describe('uniform 404 envelope', () => {
  it('returns uniform JSON 404 for an unknown path under /api/v1', async () => {
    const res = await app.request('/api/v1/unknown', undefined, { DATABASE_URL: url });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Not found.' });
  });

  it('returns uniform JSON 404 for a top-level unknown path', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found.' });
  });
});

// Health stays db-free (user story 5): the uptime probe never depends on the
// database, so a db outage is visible as 500s while monitoring sees the Worker up.
describe('GET /health', () => {
  it('stays 200 with no DATABASE_URL (db-independent)', async () => {
    const res = await app.request('/health', undefined, { DATABASE_URL: '' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run the new tests to verify they FAIL (envelope not yet added)**

```bash
pnpm --filter @sevendays/api exec vitest run test/error-seam.test.ts
```

Expected: FAIL — `/api/v1/unknown` and `/nope` return Hono's default 404 (plain text, `res.json()` throws or body is not `{ error: 'Not found.' }`); `/health` already 200 (that assertion may pass, the 404s fail). The suite exits non-zero.

- [ ] **Step 3: Add `onError` + `notFound` to the root app**

```ts
// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { v1 } from './routes/v1.js';
import { internalError } from './services/errors.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', cors({ origin: '*' })); // TODO(M6): restrict once domains exist.

// Uniform error envelope (candidate D / ADR-0006): every thrown error — from
// the versioned routes, the acquisition middleware (Task 2), or any future
// handler — lands here, is logged once (workerd-safe console.error, no new
// dependency) with the route that threw it, and returns the single 500 JSON
// shape. Replaces the per-route try/catch + silent swallow that let deploy
// blocker #2 ship invisible (M1.5). Health stays mounted outside v1, so a db
// outage is visible as 500s while uptime monitoring still sees the Worker up.
app.onError((error, c) => {
  console.error(`[api] ${c.req.method} ${c.req.path} failed:`, error);
  return internalError(c);
});

// Uniform 404 envelope (closes the 404 half of the 404/405 ledger item):
// every unmounted path — including under /api/v1 — returns the JSON shape,
// never Hono's bare plain-text default (which would degrade the M2 api-client's
// response inference to `unknown`).
app.notFound((c) => c.json({ error: 'Not found.' }, 404));

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/api/v1', v1);

export default app;
```

- [ ] **Step 4: Run the seam tests to verify they PASS, and the full suite for zero regression**

```bash
pnpm --filter @sevendays/api exec vitest run test/error-seam.test.ts
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "
```

Expected: seam file **3 passed**; full api suite **35 passed / 8 files** (the 32 pre-existing + these 3; no existing test failed or changed assertion). `index.test.ts`'s `GET /api/branches → 404` assertion still passes (status unchanged, now JSON).

- [ ] **Step 5: Typecheck + lint the touched files**

```bash
pnpm --filter @sevendays/api typecheck
pnpm --filter @sevendays/api exec biome check --write src/index.ts test/error-seam.test.ts
```

Expected: typecheck clean; biome clean (the `--write` may reorder imports — re-run typecheck after if it touched imports).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/index.ts apps/api/test/error-seam.test.ts
git commit -m "feat: uniform 500/404 error envelope on the API root app

- root onError logs once (console.error, workerd-safe) with the throwing
  route and returns the single 500 JSON shape; replaces the per-route
  try/catch + silent swallow that hid deploy blocker #2 (M1.5)
- root notFound returns uniform JSON 404 for every unmounted path,
  including under /api/v1 — closes the 404 half of the 404/405 ledger
  item (the api-client ADR forbids bare not-found)
- /health stays mounted outside v1, so it never depends on the database
- additive seam tests: uniform 404 (top-level + /api/v1) and db-free health
- four routes byte-identical this commit; acquisition moves into middleware
  in the next commit (candidate D, issue #16)"
```

---

### Task 2: Acquisition middleware + route delegation — close "log-before-500" fully

**Files:**
- Modify: `apps/api/src/services/db.ts` (add `ApiEnv` type)
- Modify: `apps/api/src/routes/v1.ts` (ApiEnv subapp + `acquireDb` middleware, registered before the route mounts)
- Modify: `apps/api/src/routes/branches.ts`
- Modify: `apps/api/src/routes/service-packages.ts`
- Modify: `apps/api/src/routes/addon-services.ts`
- Modify: `apps/api/src/routes/appointments.ts`
- Modify: `apps/api/test/error-seam.test.ts` (extend with the 500 + log tests)

**Interfaces:**
- Consumes: `createApiDb(connectionString: string): Database` from `services/db.ts` (unchanged). `internalError`/`badRequest` from `services/errors.ts` (unchanged).
- Produces: the `ApiEnv` type (imported by `v1.ts` and every route file); the `acquireDb` middleware (local to `v1.ts`); handlers that read `c.get('db')` typed as `Database`.

- [ ] **Step 1: Add the `ApiEnv` type next to `createApiDb`**

```ts
// apps/api/src/services/db.ts
import type { Database } from '@sevendays/db';
import { createDbClient } from '@sevendays/db';
import type { Env } from '../env.js';

// The API's request context (ADR-0011 + candidate D): the per-request db
// handle lives in Hono variables, set once by the acquisition middleware on
// /api/v1 and read by every route handler. Bindings stay the ambient Env.
export type ApiEnv = {
  Bindings: Env;
  Variables: { db: Database };
};

/**
 * The API's db handle (ADR-0007): the pooled DATABASE_URL — Workers cannot
 * open raw TCP; prepare:false is required under transaction pooling.
 * Created fresh per request: workerd scopes I/O objects to the request that
 * created them, so a client memoized per isolate throws "Cannot perform I/O
 * on behalf of a different request" on every later call. Under Supavisor
 * transaction pooling (ADR-0007) per-request connections are the documented
 * pattern; request-scoped sockets are reclaimed when the request context
 * ends. Revisit with Hyperdrive only if volume demands it.
 *
 * Called once per request by the acquisition middleware (routes/v1.ts);
 * a missing URL throws here and propagates to the root onError as the
 * uniform 500 (never the framework's plain-text default).
 */
export function createApiDb(connectionString: string): Database {
  if (!connectionString) {
    throw new TypeError(
      'DATABASE_URL is not set — the Worker needs the pooled connection secret per ADR-0007.'
    );
  }
  return createDbClient(connectionString);
}
```

- [ ] **Step 2: Make `v1` an `ApiEnv` subapp and mount the acquisition middleware FIRST**

```ts
// apps/api/src/routes/v1.ts
import { Hono } from 'hono';
import type { Env } from '../env.js';
import { createApiDb, type ApiEnv } from '../services/db.js';
import { addonServices } from './addon-services.js';
import { appointments } from './appointments.js';
import { branches } from './branches.js';
import { servicePackages } from './service-packages.js';

// Acquisition middleware (candidate D): runs for every /api/v1 request,
// creates the per-request db handle and stores it in context. A missing
// DATABASE_URL throws here and is caught by the root onError as the uniform
// 500 JSON — the acquisition-inside-the-try ruling, now structural instead
// of a per-route comment. MUST be registered before the route mounts so it
// composes with every handler.
export const acquireDb = async (c: import('hono').Context<ApiEnv>, next: () => Promise<void>) => {
  c.set('db', createApiDb(c.env.DATABASE_URL));
  await next();
};

export const v1 = new Hono<ApiEnv>();
v1.use('*', acquireDb);
v1.route('/branches', branches);
v1.route('/appointments', appointments);
v1.route('/service-packages', servicePackages);
v1.route('/addon-services', addonServices);
```

- [ ] **Step 3: Migrate `branches.ts` (drop `createApiDb` + `try/catch`, read `c.get('db')`)**

```ts
// apps/api/src/routes/branches.ts
import { Hono } from 'hono';
import { listBranches } from '../services/branches.js';
import type { ApiEnv } from '../services/db.js';

export const branches = new Hono<ApiEnv>();

branches.get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listBranches(db));
});
```

- [ ] **Step 4: Migrate `service-packages.ts` (same shape)**

```ts
// apps/api/src/routes/service-packages.ts
import { Hono } from 'hono';
import { listActivePackagesWithInclusions } from '../services/service-packages.js';
import type { ApiEnv } from '../services/db.js';

export const servicePackages = new Hono<ApiEnv>();

servicePackages.get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActivePackagesWithInclusions(db));
});
```

- [ ] **Step 5: Migrate `addon-services.ts` (same shape)**

```ts
// apps/api/src/routes/addon-services.ts
import { Hono } from 'hono';
import { listActiveAddonServices } from '../services/addon-services.js';
import type { ApiEnv } from '../services/db.js';

export const addonServices = new Hono<ApiEnv>();

addonServices.get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActiveAddonServices(db));
});
```

- [ ] **Step 6: Migrate `appointments.ts` — drop both catches + the log-before-500 lines (supersedes #13)**

```ts
// apps/api/src/routes/appointments.ts
import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { createAppointment, listAppointments } from '../services/appointments.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest } from '../services/errors.js';
import { validated } from '../services/validator.js';

export const appointments = new Hono<ApiEnv>();

appointments.get(
  '/',
  validated(z.object({ branchId: z.uuid().optional() }), 'query'),
  async (c) => {
    const { branchId } = c.req.valid('query');
    const db = c.get('db');
    const rows = await listAppointments(db, { branchId });
    return c.json(rows);
  }
);

appointments.post('/', validated(createAppointmentSchema, 'json'), async (c) => {
  const input = c.req.valid('json');
  const db = c.get('db');
  const result = await createAppointment(db, input);
  if (!result.ok) {
    return badRequest(c, result.message);
  }
  return c.json(result.record, 201);
});
```

- [ ] **Step 7: Extend the seam tests with the 500 + log policy (propagated acquisition + handler throw)**

```ts
// append to apps/api/test/error-seam.test.ts
// 500 + log policy (closes "log-before-500" fully, user stories 2 + 6):
// every thrown error — from the acquisition middleware or a handler — reaches
// the root onError, which logs it once with the route and returns the uniform
// 500. Two distinct paths are proven over real Postgres via the in-app
// request style: a missing DATABASE_URL (middleware throws on acquisition) and
// a db error (handler's module call throws on a refused connection).
describe('uniform 500 envelope + logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns uniform 500 JSON when a handler/db error is thrown, and logs it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Refused port: postgres.js fails fast (~4-10ms, probe-verified); the
    // middleware creates the client fine, the handler's query throws.
    const res = await app.request('/api/v1/branches', undefined, {
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
    expect(spy.mock.calls.some((call) => String(call[0]).startsWith('[api]'))).toBe(true);
  });

  it('returns uniform 500 JSON when DATABASE_URL is missing (acquisition throws), and logs it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await app.request('/api/v1/branches', undefined, { DATABASE_URL: '' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
    expect(spy.mock.calls.some((call) => String(call[0]).includes('/api/v1/branches'))).toBe(true);
  });
});

// 405 deferral (spec Out of Scope): Hono has no built-in method-mismatch
// surface, so a GET-only route hit with POST returns 404 (not 405) today.
// Lock the current behavior so a future M2-pre-flight change can't silently
// regress it — 405 belongs beside that restructure, not here.
describe('method mismatch (405 deferred)', () => {
  it('returns 404 for POST on a GET-only route', async () => {
    const res = await app.request('/api/v1/branches', { method: 'POST' }, { DATABASE_URL: url });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found.' });
  });
});
```

- [ ] **Step 8: Run the seam tests + full suite**

```bash
pnpm --filter @sevendays/api exec vitest run test/error-seam.test.ts
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "
```

Expected: seam file **6 passed** (3 from Task 1 + 3 new); full api suite **38 passed / 8 files**. The 32 pre-existing tests are unchanged — confirm zero assertion edits (Step 10).

- [ ] **Step 9: Typecheck + lint the touched files**

```bash
pnpm --filter @sevendays/api typecheck
pnpm --filter @sevendays/api exec biome check --write \
  src/services/db.ts src/routes/v1.ts src/routes/branches.ts \
  src/routes/service-packages.ts src/routes/addon-services.ts \
  src/routes/appointments.ts test/error-seam.test.ts
```

Expected: typecheck clean (`c.get('db')` is `Database` via `ApiEnv`; the `acquireDb` `Context<ApiEnv>` param compiles — if the inline `import('hono').Context` form is awkward, import `type { Context } from 'hono'` at top of `v1.ts` instead). Biome clean.

- [ ] **Step 10: Zero-assertion-edit audit**

```bash
git diff main...HEAD --stat -- \
  'apps/api/test/service-packages.test.ts' \
  'apps/api/test/appointments.test.ts' \
  'apps/api/test/branches.test.ts' \
  'apps/api/test/addon-services.test.ts'
```

Expected: **no output** — not a single existing test file changed. (The new file is additive; `index.test.ts` is untouched and still green.)

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/services/db.ts apps/api/src/routes/v1.ts \
  apps/api/src/routes/branches.ts apps/api/src/routes/service-packages.ts \
  apps/api/src/routes/addon-services.ts apps/api/src/routes/appointments.ts \
  apps/api/test/error-seam.test.ts
git commit -m "refactor: move db acquisition into /api/v1 middleware, routes read c.get('db')

- v1.ts is now an ApiEnv subapp; a single acquireDb middleware
  (v1.use('*'), registered before the route mounts) creates the
  per-request client and c.set('db'); routes drop createApiDb + try/catch
- appointments route loses its log-before-500 lines and both catches
  (supersedes #13) — every thrown error now reaches the root onError,
  which logs once with the route and returns the uniform 500
- closes 'log-before-500' fully (candidate D, issue #16): the invisible
  failure class is structurally impossible, not fixed on one route
- branches/service-packages/addon-services lose their silent swallows too
- additive seam tests prove the 500+log policy over real Postgres:
  missing DATABASE_URL (acquisition throws) and a refused-connection
  query (handler throws) both return uniform 500 and log the route
- 405 still deferred to the M2 pre-flight; POST-on-GET locked at 404"
```

---

### Task 3: ADR-0011 amendment + ledger + issue evidence

**Files:**
- Modify: `docs/adr/0011-per-request-db-client.md`
- Modify: `docs/progress.md`

- [ ] **Step 1: Amend ADR-0011 — note the relocation (no behavior change)**

Append one bullet to the **Consequences** section of `docs/adr/0011-per-request-db-client.md`:

```markdown
- **Relocated into the acquisition middleware (candidate D, 2026-09-04):** the
  per-request `createApiDb` call now lives in one `v1.use('*')` middleware
  (set into Hono context as `db`) instead of being repeated inside each route
  handler. Same per-request semantics — one client per request, request-scoped
  sockets reclaimed at request end — only the call site moved. Routes read
  `c.get('db')`; a missing `DATABASE_URL` throws in the middleware and is
  caught by the root `onError` as the uniform 500.
```

- [ ] **Step 2: Update `docs/progress.md`**

Update the `_Last updated:_` line at the top to:

```markdown
_Last updated: 2026-09-04 (acquisition/error seam (candidate D) landed on feat/acquisition-error-seam; prior: catalog row-shaping module (candidate C) landed; prior: read-stitch module (candidate B); prior: intake deepening (candidate A); prior: M1.5 exit gate verified.)_
```

Replace the current candidate-D "log-before-500" bullet (line ~72):

```markdown
- **log-before-500: CLOSED fully (candidate D landed, 2026-09-04):** the
  per-request acquisition + try/catch + silent-swallow cross-section is gone
  from all four routes. One `v1.use('*')` middleware creates the db handle and
  `c.set('db')`; one root `onError` logs every thrown error with its route and
  returns the uniform 500 JSON; the appointments route's inline log-before-500
  lines (from #13) are deleted — one logging point, no double-logging. The
  M1.5 invisible-failure class is now structurally impossible, not fixed on one
  route. 404/405 item split: **404 closed** here (root `notFound` returns uniform
  JSON for every unmount, including `/api/v1/*`); **405 deferred** to the M2
  pre-flight restructure (Hono has no built-in method-mismatch surface — it
  needs per-route method-set knowledge that belongs beside the typed-response
  conventions of that restructure). Per-route acquisition comments (the
  ADR-0011 rationale pasted 3×, the acquisition-inside-the-try ruling) are now
  obsolete — their ruling has a structural home in the middleware.
```

Add a candidate-D landed bullet to **Known Gaps / Not Yet Done** (after the candidate-C landed bullet), matching house style:

```markdown
- **Acquisition/error seam extracted (candidate D landed, 2026-09-04):** `apps/api/src/routes/v1.ts` is an `ApiEnv` subapp with one `acquireDb` middleware (`v1.use('*')`, before the route mounts) that creates the per-request client and `c.set('db')`; `index.ts` gains a root `onError` (logs once via `console.error` with the route, returns uniform 500 JSON) and a root `notFound` (uniform JSON 404 for every unmount incl. `/api/v1/*`); `ApiEnv` (`{ Bindings: Env; Variables: { db: Database } }`) lives in `services/db.ts` beside `createApiDb`. All four routes drop `createApiDb` + `try/catch` and read `c.get('db')`; the appointments route's log-before-500 lines (from #13) are gone. Closes "log-before-500" fully; 404 half of 404/405 closed, 405 deferred to the M2 pre-flight. Proofs: 6 additive seam tests (uniform 404 top-level + /api/v1, db-free /health, 500+log x2 over real Postgres — missing URL + refused-connection query); api integration suites **38 passed / 8 files** with **zero assertion edits** to the 32 pre-existing tests. ADR-0011 amended (relocation note, no behavior change).
```

- [ ] **Step 3: Close the loop on issue #16**

```bash
gh issue comment 16 --body "Implementation plan: docs/superpowers/plans/2026-09-02-acquisition-error-seam.md. Landed on feat/acquisition-error-seam — one v1.use('*') acquisition middleware + root onError (log + uniform 500) + root notFound (uniform 404); all four routes drop createApiDb + try/catch and read c.get('db'); appointments log-before-500 lines removed (supersedes #13). Proofs: 6 additive seam tests (404 envelope top-level + /api/v1, db-free /health, 500+log x2 over real Postgres) + api integration suites 38/8 with zero assertion edits to the 32 pre-existing tests. ADR-0011 amended (relocation note). pnpm check + pnpm build green."
```

(Leave the issue open — the user closes it when the PR merges, matching the #13/#14/#15 flow.)

- [ ] **Step 4: Commit the docs**

```bash
git add docs/adr/0011-per-request-db-client.md docs/progress.md
git commit -m "docs: record the acquisition/error seam (candidate D) in the ledger

- progress.md: close 'log-before-500' fully; split 404/405 (404 done,
  405 -> M2 pre-flight); per-route acquisition comments now obsolete
- ADR-0011: one-line relocation note — per-request client moved into the
  acquisition middleware, same per-request semantics, no behavior change
- candidate-D landed bullet + Last-updated line"
```

---

### Task 4: Full gate sweep

**Files:** none (verification only).

- [ ] **Step 1: The monorepo gate**

```bash
pnpm check   # lint + format + typecheck + test, all workspaces
pnpm build
```

Expected: all green. api test total **38 passed / 8 files**; the 32 pre-existing tests are unchanged. `pnpm build` (tsc) emits `dist/`.

- [ ] **Step 2: Confirm the branch state**

```bash
git status --short        # expect clean tree
git log --oneline main..HEAD
```

Expected: 4 commits (Task 1 envelope, Task 2 route-layer migration, Task 3 docs+ADR, and this gate commit only if a fixup was needed). Do **not** push — the user pushes and opens the PR.

---

## Self-Review

**1. Spec coverage** — mapped to spec sections:
- *Problem Statement* (copy-paste policy erosion, invisible failure class): closed by Task 2 (one middleware + `onError`, routes have zero try/catch) — verified by the 500+log tests.
- *Solution* (middleware + `onError` + `notFound`, routes shrink to essence): Tasks 1–2 implement exactly this; route files show validate/call/return with no acquisition or catch.
- *User Stories* 1 (future routes get the policy free), 2 (every error logged with route), 3 (404 in uniform shape for the api-client), 4 (rationale in one middleware), 5 (health db-free), 6 (policy exercised once via HTTP seam), 7 (seam in canonical Hono shape for the M2 restructure), 8 (route PRs free of try/catch) — all delivered: 1/7/8 by structure; 2 by `onError` log test; 3 by 404 test; 4 by `acquireDb` docstring; 5 by `/health` test; 6 by the single seam file.
- *Implementation Decisions*: middleware+error handler ✓ (Tasks 1–2); not-found joins envelope now, 405 deferred ✓ (Task 2 405 test + progress.md split); health db-free ✓ (mounted outside v1); supersedes #13 inline logging ✓ (Task 2 deletes the lines); env types untouched ✓ (only `ApiEnv` Hono generic added); no shared-types/wire changes ✓ (bodies already conform to `apiErrorSchema`).
- *Testing Decisions*: HTTP-external behavior only ✓; seam tested once over real Postgres ✓; existing suites pass unchanged ✓ (zero-assertion-edit audit); prior art carried ✓.
- *Out of Scope*: 405 ✓ deferred; env consolidation/app-type export ✓ untouched; structured logging ✓ not added; rate limiting/CORS ✓ untouched; intake/stitch/catalog modules ✓ untouched (routes only).
- *Further Notes*: ordering with A (lands after #13) — #13 already merged, this removes its inline lines ✓; ledger hygiene ✓ (Task 3).

**2. Placeholder scan** — no TBD/TODO/“implement later” in task steps; every step has concrete code or a verified command. The only prose caveats are the probe-verified notes (middleware-order load-bearing, 405 deferred) which are real constraints, not placeholders.

**3. Type consistency** — `ApiEnv` defined once in `services/db.ts`, imported by `v1.ts` and all four route files; `acquireDb` sets `db: Database` and every handler reads `c.get('db'): Database`; `onError` uses `internalError(c)` and `notFound` returns `c.json({ error: 'Not found.' }, 404)` — names match across Tasks 1/2/3. `createApiDb` signature unchanged (`connectionString: string`): `Database`). No renamed symbols between tasks.

**4. Probe-backed claims** (all run against this repo before writing the plan): root `onError` catches `v1` middleware/handler throws; root `notFound` catches `/nope` and `/api/v1/unknown`; `/health` with `DATABASE_URL: ''` stays 200 and never runs acquisition; middleware registered after routes does NOT compose (reorder enforced in Task 2 Step 2); missing-URL → `createApiDb` throws `TypeError` → 500+log; a refused-connection query throws in ~4–10ms (fast enough for the handler-throw test); `Hono<{ Bindings: Env }>` subapps mount cleanly under an `ApiEnv` parent (tsc clean) so Task 1 compiles before routes migrate; `tsc --noEmit` on the planned shapes passes. Baseline api suite = 32/7 (measured).
