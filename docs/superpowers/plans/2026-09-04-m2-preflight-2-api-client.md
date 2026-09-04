# M2 Pre-flight 2/5 — Shared API client over Hono RPC (#22) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@sevendays/api-client` — the shared, typed, Zod-parsing client factory (`createApiClient({ baseUrl, fetch? })`) over Hono RPC — and make the API's exported `AppType` actually carry its route schema so the drift-kill works.

**Architecture:** Two moves. (1) The API's route tree is re-registered in **chained** form (the Hono "larger applications" pattern): Hono merges a route into the parent's type schema only when `app.route()`'s return value is chained onward, so today's statement-style `app.get(...); app.route(...)` leaves `AppType` with an empty schema and `hc<AppType>` degrades to `unknown` members. This was verified by probe on 2026-09-04 against the real repo. (2) A new node-tier package wraps the raw RPC client with per-route wrapper methods (see Ruling below), each a one-liner that runs the response through one shared `unwrap()` gate: non-2xx → `apiErrorSchema` → typed `ApiClientError` (status + parsed details); 2xx → the route's shared `packages/types` schema → typed payload.

**Tech Stack:** Hono 4 (`hc<AppType>` RPC, chained), Zod v4 (`apiErrorSchema`, `ZodParseError`), TypeScript 6 (`nodenext`, `verbatimModuleSyntax`), Vitest 4 with a per-workspace config (ADR-0003), Biome 2.x (`node` tier), pnpm + Turborepo.

**Spec:** `docs/specs/2026-08-30-m2-preflight-api-client-spec.md` (amended 2026-09-04). ADR-0006 (client) + ADR-0003 (per-workspace vitest). Ticket: jeius/sevendays#22, parent #1. Roadmap: M2 pre-flight block in `docs/plan.md`. Predecessor plan (landed): `docs/superpowers/plans/2026-09-04-m2-preflight-1-api-restructure.md`.

## Global Constraints

- Node >= 24; pnpm workspace; run repo commands from the repo root unless noted.
- Work on a feature branch (suggested: `feat/api-client`); never commit to `main`; leave pushing to the user.
- Do not commit code that fails `pnpm check` (lint + format + typecheck + test).
- Zod v4 everywhere; external shapes live in `packages/types`, not per-app. `apiErrorSchema` **already exists** (`packages/types/src/api-error.ts`, with tests) — never re-create it.
- All code `async`/`await`; no Promise chains or callbacks.
- `verbatimModuleSyntax` is on — `import type` for type-only imports is mandatory.
- The API is consumed **type-only**: no runtime imports of `@sevendays/api/app` anywhere in `packages/api-client` (grep-enforced in Task 4).
- Never commit secrets; this package needs no env at all (its tests are in-memory loopback — no compose db, no `TEST_DATABASE_URL`).
- **Client surface ruling (2026-09-04, pre-plan):** `createApiClient` returns route-tree **wrapper methods** (`client.branches.list()`, `client.appointments.create(input)`) plus the raw client as `client.raw`. "No function-per-endpoint wrapper layer" is enforced as *no parallel hand-written API description*: every wrapper delegates to the raw `hc<AppType>` client (paths, params, and request/response types stay inferred from the API), and each wrapper is a one-liner that only interposes the shared parse/error gate. Call sites never touch `res.json()`; typed data comes out, `ApiClientError` is thrown automatically on non-2xx.

### Verified pre-plan facts (probed against the real toolchain 2026-09-04)

These were executed, not assumed — trust them:

1. **Unchained schema → `unknown` client.** With today's statement-style registrations, `hc<AppType>` resolves to `unknown` (Hono's `Client<T>` yields `never` → `UnionToIntersection` → `unknown`). Chaining every registration fixes it. Probe: a local chained mini-app under the **worker tier** (`apps/api`, workers-types present) typechecks `hc<ChainedApp>` and member calls cleanly; the same file with statement-style registrations fails `TS18046: 'rpc' is of type 'unknown'`.
2. **`validated(schema, 'json' | 'query')` pollutes RPC input.** The union-typed `target` makes zValidator's generic `Target` the union for **every** endpoint, so RPC input types demand `{ json: ..., query: ... }` both (verified: `TS2345 ... Property 'json' is missing`). Overloading `validated()` cannot fix it (`ReturnType<typeof zValidator<'json', S>>` is not a valid instantiation expression — `TS2635`). The verified fix is two functions with the target literal in the body (`validatedJson` / `validatedQuery`).
3. **`app.fetch` is not assignable to `typeof fetch`** (`(request: Request, env?, executionCtx?)` vs `(input: string | Request | URL, init?)`). The verified one-line adapter is: `const loopbackFetch: typeof fetch = async (input, init) => app.fetch(new Request(input, init));`
4. **Loopback runs without a server:** `hc<AppType>(base, { fetch })` with an in-memory Hono app returned 200 + parsed typed JSON + the 404 envelope in 3/3 vitest tests (no network, no workerd).
5. `ZodParseError` is exported from `zod@4.5.1` (runtime + `tsc` resolved).
6. `expectTypeOf` deep assertions work against RPC-derived types: `RpcClient['api']['v1']['appointments']['$post']` + `InferRequestType<...>['json']` compile under the node tier (probe file typechecked clean).
7. **Dates over JSON:** the read schemas use `z.coerce.date()` on `createdAt`/`updatedAt`/`scheduledAt`, so the client gets real `Date` objects from ISO strings — no hand-rolled revivers.

---

### Task 1: Chain the API so `AppType` carries its route schema (+ validator split)

**Files:**
- Modify: `apps/api/src/services/validator.ts`
- Modify: `apps/api/src/routes/branches.ts`
- Modify: `apps/api/src/routes/service-packages.ts`
- Modify: `apps/api/src/routes/addon-services.ts`
- Modify: `apps/api/src/routes/appointments.ts`
- Modify: `apps/api/src/routes/v1.ts`
- Modify: `apps/api/src/index.ts`
- Create (temporary, deleted in Task 1): `apps/api/src/__rpc-shape-probe.ts`

**Interfaces:**
- Consumes: the current `apps/api/src` tree (all handlers/services unchanged — this task only re-expresses registration).
- Produces: `AppType` (`typeof app` from `apps/api/src/index.ts`) whose type schema carries the full `/api/v1` route tree — the contract every later task consumes as `import type { AppType } from '@sevendays/api/app'` → `RpcClient = ReturnType<typeof hc<AppType>>` with **live** route members. Also produces `validatedJson(schema)` and `validatedQuery(schema)` (same uniform `{ error, details }` hook as today). Runtime behavior is unchanged: same validators, same handlers, same statuses.

- [ ] **Step 1: Prove the current failure mode (RED evidence)**

Create `apps/api/src/__rpc-shape-probe.ts`:

```ts
// TEMPORARY drift probe (deleted at the end of this task). It exists to prove
// the exported AppType does NOT carry the route schema today: hc<AppType>
// degrades to unknown, so member access fails. After the chaining rework this
// file typechecks green — that green is the task's proof, then the file goes.
import { hc } from 'hono/client';
import type { AppType } from './index.js';

export const probe = hc<AppType>('http://localhost/');

export async function probeBranches(): Promise<number> {
  const res = await probe.api.v1.branches.$get();
  return res.status;
}
```

Run: `pnpm --filter @sevendays/api typecheck`
Expected: FAIL — `src/__rpc-shape-probe.ts: 'probe' is of type 'unknown'` (TS18046), plus the same for `.api.v1.branches` access. If it unexpectedly passes, stop and re-investigate (the chaining may have already happened); do not write the rework blind.

- [ ] **Step 2: Split `validated()` by target**

Replace the entire contents of `apps/api/src/services/validator.ts` with:

```ts
import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';

// Uniform-error validator hooks (Q4): Zod failures emit { error, details }
// with per-field details, not zValidator's default shape.
//
// Two functions, not one target-parameterized helper: zValidator's Target must
// be an exact literal for Hono RPC input inference. The old union signature
// (`validated(schema, 'json' | 'query')`) typed every endpoint's RPC input as
// { json: ..., query: ... } regardless of target — verified pre-plan
// (2026-09-04). The hook body is duplicated: zValidator's Hook generic cannot
// be referenced as a standalone typed const without losing inference.
export const validatedJson = <S extends ZodSchema>(schema: S) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid request payload.',
          details: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        400
      );
    }
  });

export const validatedQuery = <S extends ZodSchema>(schema: S) =>
  zValidator('query', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid request payload.',
          details: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        400
      );
    }
  });
```

- [ ] **Step 3: Chain every route file in the /api/v1 tree**

Replace the entire contents of `apps/api/src/routes/branches.ts` with:

```ts
import { Hono } from 'hono';
import { listBranches } from '../services/branches.js';
import type { ApiEnv } from '../services/db.js';

// Chained registration (ADR-0006 Hono RPC): the route lives in this app's
// type schema only because the expression is chained. Every registration in
// the /api/v1 tree must stay chained — a statement-style registration here
// silently drops the route from AppType and breaks the client package (its
// drift-kill suite is the regression guard).
export const branches = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listBranches(db));
});
```

Replace the entire contents of `apps/api/src/routes/service-packages.ts` with:

```ts
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { listActivePackagesWithInclusions } from '../services/service-packages.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const servicePackages = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActivePackagesWithInclusions(db));
});
```

Replace the entire contents of `apps/api/src/routes/addon-services.ts` with:

```ts
import { Hono } from 'hono';
import { listActiveAddonServices } from '../services/addon-services.js';
import type { ApiEnv } from '../services/db.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const addonServices = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActiveAddonServices(db));
});
```

Replace the entire contents of `apps/api/src/routes/appointments.ts` with:

```ts
import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { createAppointment, listAppointments } from '../services/appointments.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest } from '../services/errors.js';
import { validatedJson, validatedQuery } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const appointments = new Hono<ApiEnv>()
  .get('/', validatedQuery(z.object({ branchId: z.uuid().optional() })), async (c) => {
    const { branchId } = c.req.valid('query');
    const db = c.get('db');
    const rows = await listAppointments(db, { branchId });
    return c.json(rows);
  })
  .post('/', validatedJson(createAppointmentSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const result = await createAppointment(db, input);
    if (!result.ok) {
      return badRequest(c, result.message);
    }
    return c.json(result.record, 201);
  });
```

Replace the entire contents of `apps/api/src/routes/v1.ts` with:

```ts
import { Hono } from 'hono';
import { parseEnv } from '../env.js';
import { type ApiEnv, createApiDb } from '../services/db.js';
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
  c.set('db', createApiDb(parseEnv(c.env).DATABASE_URL));
  await next();
};

// Chained registration (ADR-0006 Hono RPC): each .route() return value feeds
// the next — the sub-tree lands in v1's schema only through the chain.
export const v1 = new Hono<ApiEnv>()
  .use('*', acquireDb)
  .route('/branches', branches)
  .route('/appointments', appointments)
  .route('/service-packages', servicePackages)
  .route('/addon-services', addonServices);
```

- [ ] **Step 4: Chain the root app**

In `apps/api/src/index.ts`, replace the app construction and registration block (keep the existing comment blocks verbatim — they move with the code) so that the former statement sequence becomes one chained expression:

```ts
const app = new Hono<{ Bindings: Env }>()
  .use('*', logger())
  .use('*', cors({ origin: '*' })) // TODO(M6): restrict once domains exist.

  // All body/query validation goes through the validated* helpers so failures
  // carry the uniform { error, details } shape — never raw zValidator.
  // See services/validator.ts.

  // Uniform error envelope (candidate D / ADR-0006): every thrown error — from
  // the versioned routes, the acquisition middleware (Task 2), or any future
  // handler — lands here, is logged once (workerd-safe console.error, no new
  // dependency) with the route that threw it, and returns the single 500 JSON
  // shape. Replaces the per-route try/catch + silent swallow that let deploy
  // blocker #2 ship invisible (M1.5). Health stays mounted outside v1, so a db
  // outage is visible as 500s while uptime monitoring still sees the Worker up.
  .onError((error, c) => {
    console.error(`[api] ${c.req.method} ${c.req.path} failed:`, error);
    return internalError(c);
  })

  // Uniform 404 envelope (closes the 404 half of the 404/405 ledger item):
  // every unmounted path — including under /api/v1 — returns the JSON shape,
  // never Hono's bare plain-text default (which would degrade the M2 api-client's
  // response inference to `unknown`).
  .notFound((c) => c.json({ error: 'Not found.' }, 404))

  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/api/v1', v1);
```

`export default app;` and `export type AppType = typeof app;` (both already at file end) stay untouched. The chain is what makes the schema flow — `.use()`, `.onError()`, `.notFound()`, `.get()` and `.route()` all return the app, and the final `.route('/api/v1', v1)` return value is what AppType captures.

- [ ] **Step 5: GREEN — probe + full API suite**

Run: `pnpm --filter @sevendays/api typecheck`
Expected: exit 0 — the probe file now resolves `hc<AppType>` with live members (`probe.api.v1.branches.$get` typechecks).

Delete the probe:

```bash
rm apps/api/src/__rpc-shape-probe.ts
```

Run: `pnpm --filter @sevendays/api test`
Expected: PASS with a positive count, and **no fewer tests than the current suite** (env 5 + app-type 1 + index 4 + group-children + the compose-backed integration suites — record the number you see; it must be > 0 and not smaller than before this task). The `index.test.ts` assertions (versioned mount, unversioned 404, health) are the regression guard that chaining changed nothing at runtime. Note: the integration suites need the compose db up (`docker compose up -d db`); if the db is unreachable they fail loudly — start it, do not skip.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/routes/ apps/api/src/services/validator.ts
git commit -m "feat(api): chain every registration so AppType carries the route schema

- hc<AppType> degraded to unknown members: Hono merges a route into the
  parent's schema only through chained .route()/.get() return values — the
  statement-style registrations left AppType with BlankSchema (probe evidence
  in the pre-plan session, 2026-09-04).
- validated() split into validatedJson/validatedQuery: the union-typed target
  made zValidator's generic Target 'json' | 'query' for every endpoint,
  polluting each RPC input with { json, query } (overloads cannot fix it —
  ReturnType<typeof zValidator<...>> is not a valid instantiation expression).
- No runtime behavior change: same validators, handlers, and statuses; the
  existing index/group-children/env suites stay green."
```

### Task 2: Package scaffold + client core (createApiClient, unwrap, ApiClientError)

**Files:**
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/tsconfig.json`
- Create: `packages/api-client/tsconfig.build.json`
- Create: `packages/api-client/biome.json`
- Create: `packages/api-client/vitest.config.ts`
- Create: `packages/api-client/src/client.ts`
- Create: `packages/api-client/src/error.ts`
- Create: `packages/api-client/src/unwrap.ts`
- Create: `packages/api-client/src/index.ts`
- Create: `packages/api-client/src/routes/branches.ts` (stub)
- Create: `packages/api-client/src/routes/service-packages.ts` (stub)
- Create: `packages/api-client/src/routes/addon-services.ts` (stub)
- Create: `packages/api-client/src/routes/appointments.ts` (stub)
- Test: `packages/api-client/src/unwrap.test.ts`
- Test: `packages/api-client/src/create.test.ts`
- Test: `packages/api-client/src/app-type.test.ts`

**Interfaces:**
- Consumes: `AppType` from `@sevendays/api/app` (Task 1's chained type; types-only devDependency).
- Produces (the public surface later tasks and #23/#24 consume):
  - `createApiClient(options: CreateApiClientOptions): ApiClient`
  - `interface CreateApiClientOptions { baseUrl: string; fetch?: typeof fetch }` — missing/blank `baseUrl` throws at creation.
  - `type RpcClient = ReturnType<typeof hc<AppType>>` (the raw client; exposed as `client.raw`)
  - `class ApiClientError extends Error { readonly status: number; readonly details?: unknown }` — thrown on every non-2xx; `details` is the `apiErrorSchema`-parsed envelope.
  - `unwrap<T>(res: Response, schema: ZodType<T>): Promise<T>` — the single parse gate.
  - Re-exports from the package root: `AppType`, `RpcClient`, `CreateApiClientOptions`, `ApiClientError`, `hc`.

- [ ] **Step 1: Scaffold the package (configs first)**

Create `packages/api-client/package.json`:

```json
{
  "name": "@sevendays/api-client",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "lint": "biome lint",
    "format": "biome format",
    "fix": "biome check --fix .",
    "fix:unsafe": "biome check --fix --unsafe .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@sevendays/types": "workspace:*",
    "hono": "^4.6.0",
    "zod": "^4.5.1"
  },
  "peerDependencies": {
    "zod": "^4.5.1"
  },
  "devDependencies": {
    "@hono/zod-validator": "^0.4.0",
    "@sevendays/api": "workspace:*",
    "@sevendays/config": "workspace:*",
    "@types/node": "^26.4.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.11"
  }
}
```

Notes: **no build script** — the package is source-exported (`types` and `default` both point into `src/`), like `@sevendays/ui`; consumers are all workspace-internal TS. `@sevendays/api` is a **devDependency used with `import type` only** (runtime imports are a Task-4 grep violation). `zod` is a peer+dev dep (same shape as `@sevendays/types` — the client calls `schema.parse` at runtime, so the consuming app supplies zod). `@hono/zod-validator` is dev-only: only Task 3's loopback mock uses it (the real API's validator module is not runtime-importable by rule).

Create `packages/api-client/tsconfig.json` (node tier — **not** the api's worker tier; `@cloudflare/workers-types` and its CF-`Request` variance caused the type friction the node tier avoids):

```json
{
  "extends": "@sevendays/config/ts/node",
  "include": ["src", "*.config.ts", "**/*.test.ts", "**/*.spec.ts"],
  "exclude": ["node_modules", "dist", ".turbo", "coverage"]
}
```

Create `packages/api-client/tsconfig.build.json` (kept for symmetry with `@sevendays/types`, though the package is source-exported and nothing runs it today):

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "noEmit": false,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "node_modules", "dist", ".turbo", "coverage"]
}
```

Create `packages/api-client/biome.json`:

```json
{
  "root": false,
  "extends": ["@sevendays/config/biome/base", "@sevendays/config/biome/node"]
}
```

Create `packages/api-client/vitest.config.ts` (per-workspace config is **mandatory** — ADR-0003; without it a discovery miss is a silent green via the shared `passWithNoTests`):

```ts
import { baseConfig } from '@sevendays/config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Write the failing tests for the client core**

Create `packages/api-client/src/unwrap.test.ts`:

```ts
import { ZodParseError, z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ApiClientError } from './error.js';
import { unwrap } from './unwrap.js';

const schema = z.object({ name: z.string() });

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('unwrap', () => {
  it('returns the parsed payload on 2xx', async () => {
    const result = await unwrap(jsonResponse({ name: 'Main' }), schema);
    expect(result).toEqual({ name: 'Main' });
  });

  it('throws ApiClientError with status + parsed envelope on non-2xx', async () => {
    const err = await unwrap(
      jsonResponse({ error: 'Unknown branchId.', details: ['x'] }, 400),
      schema
    ).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).status).toBe(400);
    expect((err as ApiClientError).details).toEqual({
      error: 'Unknown branchId.',
      details: ['x'],
    });
    expect((err as ApiClientError).message).toBe('API 400: Unknown branchId.');
  });

  it('throws ZodParseError on a 2xx body that misses the schema', async () => {
    await expect(unwrap(jsonResponse({ wrong: true }), schema)).rejects.toBeInstanceOf(
      ZodParseError
    );
  });

  it('throws ZodParseError on a non-2xx body that is not the envelope', async () => {
    await expect(
      unwrap(jsonResponse({ not: 'the envelope' }, 500), schema)
    ).rejects.toBeInstanceOf(ZodParseError);
  });
});
```

Create `packages/api-client/src/create.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ApiClientError } from './error.js';
import { createApiClient } from './index.js';

describe('createApiClient', () => {
  it('throws when options carry no baseUrl', () => {
    expect(() => createApiClient({} as never)).toThrow(/baseUrl/);
  });

  it('throws when baseUrl is blank', () => {
    expect(() => createApiClient({ baseUrl: '   ' })).toThrow(/baseUrl/);
  });

  it('builds a client whose raw surface is the RPC client', () => {
    const client = createApiClient({ baseUrl: 'http://localhost:4949/' });
    expect(typeof client.raw.api.v1.branches.$get).toBe('function');
  });

  it('ApiClientError carries status and details', () => {
    const err = new ApiClientError(404, { error: 'Not found.' });
    expect(err.status).toBe(404);
    expect(err.details).toEqual({ error: 'Not found.' });
    expect(err.message).toBe('API 404: Not found.');
  });
});
```

Create `packages/api-client/src/app-type.test.ts` (the **drift-kill probe** — acceptance criterion "an API route change re-typechecks the package"):

```ts
import type { InferRequestType } from 'hono/client';
import { expectTypeOf, it } from 'vitest';
import type { RpcClient } from './client.js';

// Type-level only: proves the type-imported AppType carries a live route
// surface. A route removed/renamed/unchained in apps/api changes the indexed
// access below and this suite stops compiling — the drift-kill working.
it('AppType exposes the /api/v1 route surface via RPC', () => {
  type CreateEndpoint = RpcClient['api']['v1']['appointments']['$post'];
  type CreateInput = InferRequestType<CreateEndpoint>['json'];
  expectTypeOf<CreateInput>().not.toBeNever();
  expectTypeOf<CreateInput>().not.toBeUnknown();
  expectTypeOf<CreateInput['branchId']>().toEqualTypeOf<string>();
  expectTypeOf<CreateInput['customerEmail']>().toEqualTypeOf<string>();
});
```

- [ ] **Step 3: Run the suite — verify RED**

Link the workspace first (the new devDependency on `@sevendays/api` needs a pnpm pass):

```bash
pnpm install --no-frozen-lockfile
```

Run: `pnpm --filter @sevendays/api-client test`
Expected: FAIL — vitest reports module-not-found for `./unwrap.js` / `./index.js` (the sources do not exist yet). This is RED.

Run: `pnpm --filter @sevendays/api-client typecheck`
Expected: FAIL (missing modules) — same root cause.

- [ ] **Step 4: Implement the client core**

Create `packages/api-client/src/client.ts`:

```ts
import { hc } from 'hono/client';
import type { AppType } from '@sevendays/api/app';

/** The raw Hono RPC client over the API's exported route type (ADR-0006). */
export type RpcClient = ReturnType<typeof hc<AppType>>;

/** Factory options: baseUrl is required — no fallback (spec ruling). */
export interface CreateApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

export type { AppType };
```

Create `packages/api-client/src/error.ts`:

```ts
/** Thrown on any non-2xx API response (one uniform failure surface). */
export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, details?: unknown) {
    super(messageFor(status, details));
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

function messageFor(status: number, details?: unknown): string {
  const error =
    typeof details === 'object' &&
    details !== null &&
    'error' in details &&
    typeof (details as { error?: unknown }).error === 'string'
      ? (details as { error: string }).error
      : `API request failed with status ${status}`;
  return `API ${status}: ${error}`;
}
```

Create `packages/api-client/src/unwrap.ts`:

```ts
import { apiErrorSchema } from '@sevendays/types';
import type { ZodType } from 'zod';
import { ApiClientError } from './error.js';

/**
 * The single parsing gate (ADR-0006): every response passes through here.
 * Non-2xx → apiErrorSchema → ApiClientError(status, parsed envelope). A
 * non-2xx body that is not the envelope throws ZodParseError instead — also
 * loud (unwrap.test.ts pins the distinction). 2xx → schema.parse → typed
 * payload; a server drifting from the shared schema fails here.
 */
export async function unwrap<T>(res: Response, schema: ZodType<T>): Promise<T> {
  const body: unknown = await res.json();

  if (!res.ok) {
    const parsed = apiErrorSchema.parse(body);
    throw new ApiClientError(res.status, parsed);
  }

  return schema.parse(body);
}
```

Create `packages/api-client/src/index.ts`:

```ts
import { hc } from 'hono/client';
import type { AppType, CreateApiClientOptions, RpcClient } from './client.js';
import { ApiClientError } from './error.js';
import { addonServicesRoutes } from './routes/addon-services.js';
import { appointmentsRoutes } from './routes/appointments.js';
import { branchesRoutes } from './routes/branches.js';
import { servicePackagesRoutes } from './routes/service-packages.js';

/** The full client surface: raw RPC + one route-tree group per resource. */
export interface ApiClient {
  raw: RpcClient;
  branches: ReturnType<typeof branchesRoutes>;
  servicePackages: ReturnType<typeof servicePackagesRoutes>;
  addonServices: ReturnType<typeof addonServicesRoutes>;
  appointments: ReturnType<typeof appointmentsRoutes>;
}

/**
 * Build the shared API client (ADR-0006). Fails loudly when baseUrl is
 * missing — a misconfigured deployment never silently calls localhost.
 * The route groups are thin wrappers over `raw` (the pre-plan surface
 * ruling): each delegates to the RPC client so paths/params/types stay
 * inferred from AppType, and each runs its response through unwrap().
 */
export function createApiClient(options: CreateApiClientOptions): ApiClient {
  if (!options || typeof options.baseUrl !== 'string' || options.baseUrl.trim() === '') {
    throw new Error('createApiClient: baseUrl is required');
  }
  const raw: RpcClient = hc<AppType>(options.baseUrl, { fetch: options.fetch });
  return {
    raw,
    branches: branchesRoutes(raw),
    servicePackages: servicePackagesRoutes(raw),
    addonServices: addonServicesRoutes(raw),
    appointments: appointmentsRoutes(raw),
  };
}

export type { AppType, CreateApiClientOptions, RpcClient } from './client.js';
export { ApiClientError } from './error.js';
```

The wrapper route modules it imports are created next — create the stub versions NOW (empty group objects, filled in Task 3) so this file compiles:

`packages/api-client/src/routes/branches.ts`:

```ts
import type { RpcClient } from '../client.js';

/** Branch wrappers (bodies land with the loopback suite, Task 3). */
export function branchesRoutes(_raw: RpcClient) {
  return {};
}
```

`packages/api-client/src/routes/service-packages.ts`:

```ts
import type { RpcClient } from '../client.js';

/** Service Package wrappers (bodies land with the loopback suite, Task 3). */
export function servicePackagesRoutes(_raw: RpcClient) {
  return {};
}
```

`packages/api-client/src/routes/addon-services.ts`:

```ts
import type { RpcClient } from '../client.js';

/** Add-on Service wrappers (bodies land with the loopback suite, Task 3). */
export function addonServicesRoutes(_raw: RpcClient) {
  return {};
}
```

`packages/api-client/src/routes/appointments.ts`:

```ts
import type { RpcClient } from '../client.js';

/** Appointment wrappers (bodies land with the loopback suite, Task 3). */
export function appointmentsRoutes(_raw: RpcClient) {
  return {};
}
```

- [ ] **Step 5: Run the suite — verify GREEN**

Run: `pnpm --filter @sevendays/api-client test`
Expected: PASS — **9 tests** (unwrap 4 + create 4 + app-type 1) with a visible `Tests  9 passed` line. The app-type probe compiling is itself the subpath-export acceptance check: `RpcClient['api']['v1']['appointments']['$post']` resolving with real input fields proves `import type { AppType } from '@sevendays/api/app'` → chained schema flows.

Run: `pnpm --filter @sevendays/api-client typecheck` → exit 0.
Run: `pnpm --filter @sevendays/api-client lint` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/api-client pnpm-lock.yaml
git commit -m "feat(api-client): scaffold @sevendays/api-client — createApiClient, unwrap, ApiClientError

- Node-tier package, source-exported (no build), own vitest config per
  ADR-0003 (per-workspace configs are mandatory on vitest 4).
- @sevendays/api is a devDependency used types-only (import type AppType
  from '@sevendays/api/app') — zero runtime imports, grep-enforced in
  Task 4.
- unwrap() is the single parsing gate: non-2xx → apiErrorSchema →
  ApiClientError(status, details); 2xx → route schema → typed payload.
- The app-type probe is the drift-kill acceptance check: the indexed
  RpcClient[...]['\$post'] access compiles only while AppType carries
  the live route surface from Task 1's chained rework."
```

### Task 3: Route wrappers + Seam 1 loopback suite (mock API, injectable fetch)

**Files:**
- Modify: `packages/api-client/src/routes/branches.ts`
- Modify: `packages/api-client/src/routes/service-packages.ts`
- Modify: `packages/api-client/src/routes/addon-services.ts`
- Modify: `packages/api-client/src/routes/appointments.ts`
- Create: `packages/api-client/src/loopback.ts`
- Modify: `packages/api-client/src/index.ts` (one export line)
- Create: `packages/api-client/test/mock-api.ts`
- Test: `packages/api-client/test/loopback.test.ts`
- Test: `packages/api-client/test/typing.test.ts`

**Interfaces:**
- Consumes: everything Task 2 produced (exact names: `createApiClient`, `unwrap`, `ApiClientError`, `RpcClient`); the real shared schemas from `@sevendays/types` (`branchSchema`, `servicePackageWithInclusionsSchema`, `addonServiceSchema`, `appointmentWithAddonsSchema`, `createAppointmentSchema`).
- Produces (method names #23/#24 call):
  - `client.branches.list(): Promise<Branch[]>`
  - `client.servicePackages.list(): Promise<ServicePackageWithInclusions[]>`
  - `client.addonServices.list(): Promise<AddonService[]>`
  - `client.appointments.list(args?: { query: { branchId?: string } }): Promise<AppointmentWithAddons[]>`
  - `client.appointments.create(json: CreateAppointmentArgs): Promise<AppointmentWithAddons>` where `CreateAppointmentArgs = InferRequestType<RpcClient['api']['v1']['appointments']['$post']>['json']` — the RPC-inferred zod *input* shape (timestamps as ISO strings; `addonServiceIds`/`notes` optional; the server snapshots the price — never caller-supplied).
  - `toLoopbackFetch(app: { fetch(request: Request): Response | Promise<Response> }): typeof fetch` — the Seam-1 adapter (verified: `app.fetch` alone fails `typeof fetch` contravariance).

- [ ] **Step 1: Build the mock API (the loopback double)**

Create `packages/api-client/test/mock-api.ts` — a chained Hono app mirroring the API's conventions (JSON errors with explicit statuses, uniform envelope, chained registration). It deliberately does **not** import the real API app (the devDependency is types-only); it mirrors the conventions instead (spec Seam 1). It is also not typed against `hc` — only the real `AppType` feeds the client's types; the mock only needs to answer HTTP correctly:

```ts
import { zValidator } from '@hono/zod-validator';
import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';
import type { ZodSchema } from 'zod';

// Fixture rows shaped to the shared schemas (uuids are inert constants).
const NOW = new Date('2026-09-04T00:00:00.000Z');

const BRANCHES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Main Studio',
    address: '123 Main St',
    phone: '+63 917 000 0000',
    acceptsWalkIns: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'North Branch',
    address: '45 North Ave',
    phone: '+63 917 111 1111',
    acceptsWalkIns: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const ADDONS = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Makeup',
    description: 'Professional makeup',
    priceCents: 150000,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const PACKAGES = [
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Basic Package',
    description: 'The basic studio package',
    priceCents: 250000,
    durationMinutes: null,
    isActive: true,
    coverImageKey: null,
    createdAt: NOW,
    updatedAt: NOW,
    inclusions: [
      {
        id: '55555555-5555-5555-5555-555555555555',
        kind: 'framed_picture',
        quantity: 1,
        printSize: {
          id: '66666666-6666-6666-6666-666666666666',
          code: '8R',
          description: '8R print',
        },
        attires: [{ id: '77777777-7777-7777-7777-777777777777', name: 'Toga' }],
        frameId: '88888888-8888-8888-8888-888888888888',
        description: 'One framed 8R',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    frames: [
      {
        id: '88888888-8888-8888-8888-888888888888',
        servicePackageId: '44444444-4444-4444-4444-444444444444',
        frameNumber: 1,
      },
    ],
  },
];

const APPOINTMENTS = [
  {
    id: '99999999-9999-9999-9999-999999999999',
    branchId: '11111111-1111-1111-1111-111111111111',
    servicePackageId: '44444444-4444-4444-4444-444444444444',
    customerName: 'Ada Lovelace',
    customerEmail: 'ada@example.com',
    customerPhone: '+63 917 222 2222',
    scheduledAt: NOW,
    status: 'pending',
    kind: 'scheduled',
    packagePriceCents: 250000,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    addonServices: [] as { addonServiceId: string; name: string; priceCents: number }[],
  },
];

// The API's uniform-error hook, mirrored. Duplicated (not runtime-imported
// from apps/api) because the API is consumed types-only by rule.
const validatedJson = <S extends ZodSchema>(schema: S) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid request payload.',
          details: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        400
      );
    }
  });

// Chained registration, mirroring apps/api's registration style (the mock
// must answer exactly the surface AppType describes).
const makeApi = ({ brokenBranches = false }: { brokenBranches?: boolean } = {}) => {
  type MockEnv = { Bindings: Record<string, never> };

  const branches = new Hono<MockEnv>().get('/', (c) =>
    c.json(
      brokenBranches
        ? [{ unexpected: 'shape' }] // schema-mismatch fixture for the unwrap test
        : BRANCHES
    )
  );

  const servicePackages = new Hono<MockEnv>().get('/', (c) => c.json(PACKAGES));
  const addonServices = new Hono<MockEnv>().get('/', (c) => c.json(ADDONS));

  const appointments = new Hono<MockEnv>()
    .get('/', (c) => {
      const branchId = c.req.query('branchId');
      return c.json(
        branchId ? APPOINTMENTS.filter((a) => a.branchId === branchId) : APPOINTMENTS
      );
    })
    .post('/', validatedJson(createAppointmentSchema), async (c) => {
      const input = c.req.valid('json');
      if (!BRANCHES.some((b) => b.id === input.branchId)) {
        return c.json({ error: 'Unknown branchId.' }, 400);
      }
      const record = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        branchId: input.branchId,
        servicePackageId: input.servicePackageId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        scheduledAt: input.scheduledAt,
        status: 'pending',
        kind: 'scheduled',
        packagePriceCents: 250000,
        notes: input.notes ?? null,
        createdAt: NOW,
        updatedAt: NOW,
        addonServices: input.addonServiceIds.map((id) => {
          const addon = ADDONS.find((a) => a.id === id);
          return {
            addonServiceId: id,
            name: addon?.name ?? 'Unknown Add-on',
            priceCents: addon?.priceCents ?? 0,
          };
        }),
      };
      return c.json(record, 201);
    });

  const v1 = new Hono<MockEnv>()
    .use('*', async (_c, next) => {
      await next();
    })
    .route('/branches', branches)
    .route('/service-packages', servicePackages)
    .route('/addon-services', addonServices)
    .route('/appointments', appointments);

  return new Hono<MockEnv>()
    .use('*', async (_c, next) => {
      await next();
    })
    .onError((error, c) => {
      console.error(`[mock] ${c.req.method} ${c.req.path} failed:`, error);
      return c.json({ error: 'Internal server error.' }, 500);
    })
    .notFound((c) => c.json({ error: 'Not found.' }, 404))
    .route('/api/v1', v1);
};

export type MockApi = ReturnType<typeof makeApi>;
export const mockApi = makeApi();
export const mockApiBrokenBranches = makeApi({ brokenBranches: true });
```

Create `packages/api-client/src/loopback.ts`:

```ts
/**
 * The Seam-1 adapter (verified 2026-09-04): a Hono app's `fetch(request, env?,
 * executionCtx?)` is not assignable to the global `typeof fetch`, so tests
 * wrap it — one allocation, no server, no network, no workerd.
 */
export function toLoopbackFetch(app: {
  fetch(request: Request): Response | Promise<Response>;
}): typeof fetch {
  return async (input, init) => app.fetch(new Request(input, init));
}
```

Add one export line to `packages/api-client/src/index.ts` (after the ApiClientError export):

```ts
export { toLoopbackFetch } from './loopback.js';
```

- [ ] **Step 2: Write the wrapper tests (RED against the stubs)**

Create `packages/api-client/test/loopback.test.ts`:

```ts
import { branchSchema } from '@sevendays/types';
import { ZodParseError } from 'zod';
import { expect, it } from 'vitest';
import { ApiClientError } from '../src/error.js';
import { toLoopbackFetch } from '../src/loopback.js';
import { createApiClient } from '../src/index.js';
import { unwrap } from '../src/unwrap.js';
import { mockApi, mockApiBrokenBranches } from './mock-api.js';
import type { MockApi } from './mock-api.js';

const BASE = 'http://localhost:4949/';

function clientFor(app: MockApi) {
  return createApiClient({ baseUrl: BASE, fetch: toLoopbackFetch(app) });
}

it('branches.list parses the payload into typed data', async () => {
  const client = clientFor(mockApi);
  const rows = await client.branches.list();
  expect(rows).toHaveLength(2);
  expect(rows[0]?.name).toBe('Main Studio');
  expect(rows[0]?.acceptsWalkIns).toBe(true);
  expect(rows[0]?.createdAt).toBeInstanceOf(Date);
});

it('servicePackages.list carries resolved lookups as typed data', async () => {
  const client = clientFor(mockApi);
  const rows = await client.servicePackages.list();
  expect(rows).toHaveLength(1);
  expect(rows[0]?.inclusions[0]?.printSize?.code).toBe('8R');
  expect(rows[0]?.frames).toHaveLength(1);
});

it('addonServices.list returns active add-ons', async () => {
  const client = clientFor(mockApi);
  const rows = await client.addonServices.list();
  expect(rows[0]?.name).toBe('Makeup');
});

it('appointments.create returns the created record with add-ons (201)', async () => {
  const client = clientFor(mockApi);
  const record = await client.appointments.create({
    branchId: '11111111-1111-1111-1111-111111111111',
    servicePackageId: '44444444-4444-4444-4444-444444444444',
    customerName: 'Ada Lovelace',
    customerEmail: 'ada@example.com',
    customerPhone: '+63 917 222 2222',
    scheduledAt: '2026-10-01T09:00:00.000Z',
    addonServiceIds: ['33333333-3333-3333-3333-333333333333'],
  });
  expect(record.packagePriceCents).toBe(250000); // server snapshot, not caller input
  expect(record.addonServices[0]?.name).toBe('Makeup');
  expect(record.createdAt).toBeInstanceOf(Date);
});

it('appointments.list filters by branch', async () => {
  const client = clientFor(mockApi);
  const all = await client.appointments.list();
  const filtered = await client.appointments.list({
    query: { branchId: '22222222-2222-2222-2222-222222222222' },
  });
  expect(all).toHaveLength(1);
  expect(filtered).toHaveLength(0);
});

it('a schema-mismatched 2xx payload throws ZodParseError through the wrapper', async () => {
  const client = clientFor(mockApiBrokenBranches);
  await expect(client.branches.list()).rejects.toBeInstanceOf(ZodParseError);
});

it('a 400 envelope surfaces as ApiClientError with status + details', async () => {
  const client = clientFor(mockApi);
  const err = await client.appointments
    .create({
      branchId: '99999999-9999-9999-9999-999999999999',
      servicePackageId: '44444444-4444-4444-4444-444444444444',
      customerName: 'X',
      customerEmail: 'x@example.com',
      customerPhone: 'P',
      scheduledAt: '2026-10-01T09:00:00.000Z',
    })
    .catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(400);
  expect((err as ApiClientError).details).toEqual({ error: 'Unknown branchId.' });
});

it('a 404 envelope surfaces as ApiClientError through the unwrap gate', async () => {
  // Drive the mock's uniform notFound envelope through the exact gate the
  // wrappers use — same assertions the $url/raw path would hit.
  const res = await mockApi.request(`${BASE}api/v1/nope`);
  expect(res.status).toBe(404);
  const err = await unwrap(res, branchSchema.array()).catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Not found.' });
});
```

Create `packages/api-client/test/typing.test.ts`:

```ts
import type {
  AddonService,
  AppointmentWithAddons,
  Branch,
  ServicePackageWithInclusions,
} from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import { expectTypeOf, it } from 'vitest';
import type { RpcClient } from '../src/client.js';
import { createApiClient } from '../src/index.js';

const client = createApiClient({ baseUrl: 'http://localhost:4949/' });

// Type-level only — method REFERENCES (never invoked; expectTypeOf does not
// execute). The wrappers' return types flow from the API's AppType via RPC:
// the acceptance criterion "type-level inference assertions" plus the
// drift-kill visible at the wrapper level.
it('wrapper return types come from the shared schemas', () => {
  expectTypeOf(client.branches.list).returns.toEqualTypeOf<Promise<Branch[]>>();
  expectTypeOf(client.servicePackages.list).returns.toEqualTypeOf<
    Promise<ServicePackageWithInclusions[]>
  >();
  expectTypeOf(client.addonServices.list).returns.toEqualTypeOf<Promise<AddonService[]>>();
  expectTypeOf(client.appointments.list).returns.toEqualTypeOf<
    Promise<AppointmentWithAddons[]>
  >();
  expectTypeOf(client.appointments.create).returns.toEqualTypeOf<
    Promise<AppointmentWithAddons>
  >();
});

it('create input is the RPC-inferred zod input shape', () => {
  type CreateEndpoint = RpcClient['api']['v1']['appointments']['$post'];
  type CreateInput = InferRequestType<CreateEndpoint>['json'];
  expectTypeOf<CreateInput['branchId']>().toEqualTypeOf<string>();
  expectTypeOf<CreateInput['scheduledAt']>().toEqualTypeOf<string>();
});
```

- [ ] **Step 3: Run to verify RED**

Run: `pnpm --filter @sevendays/api-client test -- test/loopback.test.ts test/typing.test.ts`
Expected: FAIL — the stubs are empty objects (`client.branches.list is not a function`), and `typing.test.ts` fails to compile (`.list` has no `.returns` to assert). RED.

- [ ] **Step 4: Implement the wrappers**

Replace the entire contents of `packages/api-client/src/routes/branches.ts` with:

```ts
import type { Branch } from '@sevendays/types';
import { branchSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Branch wrappers: GET /api/v1/branches (the only method today). */
export function branchesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/branches — all branches, ordered by name. */
    async list(): Promise<Branch[]> {
      const res = await raw.api.v1.branches.$get();
      return unwrap(res, branchSchema.array());
    },
  };
}
```

Replace the entire contents of `packages/api-client/src/routes/service-packages.ts` with:

```ts
import type { ServicePackageWithInclusions } from '@sevendays/types';
import { servicePackageWithInclusionsSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Service Package wrappers: GET /api/v1/service-packages (the only method today). */
export function servicePackagesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/service-packages — active packages with resolved lookups. */
    async list(): Promise<ServicePackageWithInclusions[]> {
      const res = await raw.api.v1['service-packages'].$get();
      return unwrap(res, servicePackageWithInclusionsSchema.array());
    },
  };
}
```

Replace the entire contents of `packages/api-client/src/routes/addon-services.ts` with:

```ts
import type { AddonService } from '@sevendays/types';
import { addonServiceSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Add-on Service wrappers: GET /api/v1/addon-services (the only method today). */
export function addonServicesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/addon-services — active add-on services. */
    async list(): Promise<AddonService[]> {
      const res = await raw.api.v1['addon-services'].$get();
      return unwrap(res, addonServiceSchema.array());
    },
  };
}
```

Replace the entire contents of `packages/api-client/src/routes/appointments.ts` with:

```ts
import type { AppointmentWithAddons } from '@sevendays/types';
import { appointmentWithAddonsSchema } from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

type CreateEndpoint = RpcClient['api']['v1']['appointments']['$post'];

/**
 * Create input as the RPC surface declares it — the zod INPUT side of
 * createAppointmentSchema: timestamps as ISO strings, addonServiceIds and
 * notes optional, and NO price field (the server snapshots the price).
 */
export type CreateAppointmentArgs = InferRequestType<CreateEndpoint>['json'];

/** Appointment wrappers: list + create under /api/v1/appointments. */
export function appointmentsRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/appointments — newest-first, optional branch filter, 200 cap. */
    async list(args: { query: { branchId?: string } } = { query: {} }): Promise<
      AppointmentWithAddons[]
    > {
      const res = await raw.api.v1.appointments.$get(args);
      return unwrap(res, appointmentWithAddonsSchema.array());
    },
    /** POST /api/v1/appointments — 201 with the created record + add-ons. */
    async create(json: CreateAppointmentArgs): Promise<AppointmentWithAddons> {
      const res = await raw.api.v1.appointments.$post({ json });
      return unwrap(res, appointmentWithAddonsSchema);
    },
  };
}
```

- [ ] **Step 5: Run everything — verify GREEN**

Run: `pnpm --filter @sevendays/api-client test`
Expected: PASS — **19 tests** (9 from Task 2 + loopback 8 + typing 2), a visible `Tests  19 passed` line.

Run: `pnpm --filter @sevendays/api-client typecheck` → exit 0 (typing.test.ts's return-type assertions are the type-level half passing at compile time).
Run: `pnpm --filter @sevendays/api-client lint` → exit 0.

If `typing.test.ts` complains about `toEqualTypeOf` on the wrapper methods whose schemas carry `.default()` fields (input/output duality makes exact equality brittle), switch those assertions to `.toMatchTypeOf<...>()` — do not loosen to `not.toBeUnknown()`.

- [ ] **Step 6: Commit**

```bash
git add packages/api-client
git commit -m "feat(api-client): route-tree wrappers + Seam 1 loopback suite

- One wrapper per resource method (branches/service-packages/addon-services
  list, appointments list+create), each a one-liner delegating to the raw
  hc<AppType> client and running the response through unwrap() — no
  hand-written route descriptions (the pre-plan surface ruling).
- Seam 1: the injectable fetch is a chained in-memory Hono app mirroring the
  API's conventions (uniform envelopes, explicit statuses); toLoopbackFetch
  is the verified app.fetch → typeof fetch adapter. No server, no network,
  no runtime dependency on the API app.
- typing.test.ts asserts the drift-kill at the wrapper level: return types
  flow from the API's route definitions (method references, never invoked)."
```

### Task 4: Full gates, docs, ticket close-out

**Files:**
- Modify: `docs/plan.md` (M2 pre-flight checkbox 2 — annotate, do not tick)
- Modify: `docs/progress.md` (What Exists + Immediate Next Steps)
- Read-only verification of Tasks 1–3.

**Interfaces:**
- Consumes: everything Tasks 1–3 produced.
- Produces: the verified state #23/#24 start from (client exists; both frontends wire `API_URL` + React Query next).

- [ ] **Step 1: Full repo gates**

```bash
pnpm check
pnpm build
```

Expected: both exit 0, and `pnpm check`'s test output shows `@sevendays/api-client` with a **positive test count** (19 tests — never a silent `passWithNoTests`; ADR-0003). The API integration suites need the compose db up.

- [ ] **Step 2: Grep guards (the standing invariants)**

```bash
grep -rn "from '@sevendays/api" packages/api-client/src packages/api-client/test
```
Expected: only `import type` lines (`import type { AppType } from '@sevendays/api/app'`) — zero runtime imports.

```bash
grep -rn "new Hono<ApiEnv>().get\|new Hono<ApiEnv>().route" apps/api/src
```
Expected: ≥1 hit in each of the /api/v1 tree files (branches, service-packages, addon-services, appointments, v1) — registration stays chained; a statement-style registration here is the regression this greps for. (Root-app chaining is visible in `src/index.ts`: `new Hono<{ Bindings: Env }>()` followed by chained `.use/.onError/.notFound/.get/.route`.)

```bash
grep -rn "validatedJson\|validatedQuery" apps/api/src | grep -v validator.ts
```
Expected: hits only in `routes/appointments.ts` — no stale `validated(` call sites remain.

- [ ] **Step 3: Annotate docs/plan.md — do not tick the checkbox**

In `docs/plan.md`, M2 pre-flight checkbox 2 (the `- [ ] packages/api-client...` line whose audit note ends with `...the remaining open piece is the client package itself.)_`): insert immediately before the closing `)_`:

```markdown
2026-09-04: landed in this pre-flight task (#22) as the wrapper-surface client per the pre-plan ruling — route-tree wrapper methods over the raw hc<AppType> client (no parallel hand-typed API description), shared unwrap() gate, typed ApiClientError; tick at #25 close-out after end-to-end verification.
```

- [ ] **Step 4: Update docs/progress.md**

- Under **What Exists**, add a new bullet:

```markdown
- **M2 pre-flight client package (#22, merged via <PR#>):** `@sevendays/api-client` — `createApiClient({ baseUrl, fetch? })` over Hono RPC (`hc<AppType>`; type-only devDependency via the API's `./app` subpath). Client surface: wrapper methods per resource (`client.branches.list()`, `client.servicePackages.list()`, `client.addonServices.list()`, `client.appointments.list()/create()`) over the raw client (`client.raw`) — every response crosses one `unwrap()` gate: 2xx parsed against the shared `packages/types` schemas (real `Date`s via `z.coerce.date`), non-2xx parsed against `apiErrorSchema` and thrown as `ApiClientError` (status + envelope details); missing/blank `baseUrl` throws at creation; injectable fetch (Seam 1) tested loopback against a chained in-memory mock mirroring the API's conventions; own vitest config (ADR-0003). **Type-surface rework rode along (probe evidence 2026-09-04):** Hono merges routes into the parent's type schema only through chained registration — the API's statement-style `app.get(...)`/`app.route(...)` left `AppType`'s schema empty (`hc<AppType>` → `unknown` members), so every registration in the /api/v1 tree was re-expressed chained; and `validated()` split into `validatedJson`/`validatedQuery` because its union-typed target polluted every endpoint's RPC input with `{ json, query }`. `toLoopbackFetch` is the verified `app.fetch` adapter. No API runtime behavior change (existing suites green). #23/#24 wire `API_URL` + React Query on top.
```

- In **Immediate Next Steps**, item 1, replace the sentence

```markdown
What remains of the block: the shared API client package (`@sevendays/api-client`, #22), then per-app wiring — `API_URL` env + React Query SSR in landing and admin (#23/#24).
```

with:

```markdown
The client package (`@sevendays/api-client`) is closed (#22); what remains of the block is per-app wiring — `API_URL` env + React Query SSR in landing and admin (#23/#24, parallelizable), then #25 close-out.
```

- [ ] **Step 5: Commit**

```bash
git add docs/plan.md docs/progress.md
git commit -m "docs: record the shared API client + chained-API type surface (M2 pre-flight 2/5, #22)"
```

- [ ] **Step 6: Close the ticket**

Comment on #22 with the verification evidence (test counts from `pnpm check`, the app-type probe as the drift-kill proof, the grep outputs), then close it:

```bash
gh issue close 22 --comment "Verified: <test counts>, drift-kill probe green, grep guards clean. Plan: docs/superpowers/plans/2026-09-04-m2-preflight-2-api-client.md."
```

Then hand off to #23/#24 (parallelizable per-app wiring) and #25 (close-out ticks). Do **not** tick the plan.md checkboxes — #25 owns them.

---

## Self-Review

**Spec coverage:**
- "Thin surface: `createApiClient({ baseUrl, fetch? })` returning the wrapped Hono RPC client" → Task 2 (factory, `client.raw` = `hc<AppType>`); the wrapper-surface ruling is recorded in Global Constraints with its rationale (opt-in parsing on a raw return would violate "every response Zod-parsed"). ✅
- "Apps call route methods directly — no function-per-endpoint wrapper layer" → Global Constraints: no parallel hand-typed API description; wrappers delegate to the inferred RPC client; drift-kill intact (typing.test.ts). ✅
- "Every response Zod-parsed at runtime… non-2xx → typed `ApiClientError` carrying status + parsed details" → `unwrap()` (Task 2) + wrapper suite (Task 3). `apiErrorSchema` reused from `packages/types`, not re-created. ✅
- "Missing `baseUrl` fails loudly at client creation (no fallback)" → create.test.ts (missing + blank cases, guard handles absent options object). ✅
- "Injectable fetch for loopback tests (Seam 1): chained Hono app mirroring the API's conventions as the fetch — no server, no network, no runtime dependency" → `test/mock-api.ts` + `toLoopbackFetch` (verified adapter). ✅
- "Own vitest config extending the shared config; positive test count" → Task 2 scaffold + Task 4 gate (explicit count check). ✅
- "Type-level inference assertions" → `app-type.test.ts` + `typing.test.ts` (both shapes probed to compile; typing tests reference methods without invoking them). ✅
- "An API route change re-typechecks the package (the drift-kill)" → chained AppType (Task 1) + the indexed-access probe; Task 1's temporary RED probe proves the precondition was genuinely broken. ✅
- "Node-tier Biome config; source-exported like the other packages" → Task 2 scaffold. ✅
- Ticket #22 acceptance criteria: all five mapped (typed client + re-typecheck → T2 probe; Seam 1 suite → T3; missing baseUrl → T2; vitest config + count → T2/T4; check+build → T4). ✅

**Placeholder scan:** No TBDs/TODOs; every code step carries complete code; the non-code steps are verify-with-expected-outcome checks. ✅

**Type consistency:** `RpcClient`, `CreateApiClientOptions`, `ApiClientError`, `unwrap<T>(res, schema)` defined in Task 2 and consumed verbatim in Task 3; wrapper method names in the Interfaces block match the implemented files; `CreateAppointmentArgs` defined once (routes/appointments.ts) and derived identically in `typing.test.ts`; `validatedJson`/`validatedQuery` produced in Task 1 and consumed in Task 1's own route files + grep-checked in Task 4; `MockApi`/`mockApi`/`mockApiBrokenBranches` defined in mock-api.ts and consumed verbatim in loopback.test.ts. ✅

**Known risks (flagged for implementers):**
- `toEqualTypeOf` on RPC-derived return types can be brittle under zod's input/output duality — the fallback (`toMatchTypeOf`) is stated in Task 3 Step 5.
- The mock duplicates the `validatedJson` hook body (the real module is not runtime-importable by the type-only rule) — a comment in the file states why.
- If `hc<AppType>` inference strains tsserver as routes grow, the documented escape hatch (precompiled client per ADR-0006) stays out of scope here.
