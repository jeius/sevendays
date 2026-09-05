# M2 Pre-flight 3/5 — Landing: TanStack Query SSR wiring + API_URL + sample branches call (#23) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `apps/landing` to the API end to end — TanStack Query with SSR integration (per-request QueryClient in router context, loader `ensureQueryData` + `useSuspenseQuery`), `API_URL` as a fallback-less server-side env, and one sample call (branches list) flowing browser → own server functions → API through the shared `@sevendays/api-client`.

**Architecture:** ADR-0006 server-mediated topology: the browser talks only to its own app. Three new landing modules split by the repo's execution-context convention: `src/lib/api.server.ts` (server-only: reads `process.env.API_URL`, builds the shared client — the ONLY place allowed to know the base URL), `src/lib/api.functions.ts` (`createServerFn` wrappers, Sentry-spanned per `.cursorrules`), `src/lib/queries.ts` (queryOptions factory consumed by loaders and components). The root route migrates to `createRootRouteWithContext<{ queryClient }>()`; `getRouter()` creates the QueryClient per invocation (per-request under SSR) and hands SSR dehydration/hydration to `setupRouterSsrQueryIntegration`. The sample page (`routes/index.tsx`) prefetches in the loader and renders via `useSuspenseQuery`. No new pages — the real booking flow is Milestone 2 proper.

**Tech Stack:** TanStack Start 1.168.49 (Worker-based via `@cloudflare/vite-plugin` 1.54.2), `@tanstack/react-query` ^5.102.8, `@tanstack/react-router-ssr-query` ^1.167.2 (peer-checked against query-core ≥5.102), `@sevendays/api-client` (landed #22), Zod v4 (no new shapes needed), TypeScript 6 (`verbatimModuleSyntax` on), Biome 2.x (`vite` tier), Vite 8, pnpm + Turborepo.

**Spec:** `docs/specs/2026-08-30-m2-preflight-api-client-spec.md` (amended 2026-09-04). ADR-0006 (server-mediated topology, server-env base URL). Ticket: jeius/sevendays#23, parent #1. Roadmap: M2 pre-flight block in `docs/plan.md`. Predecessor plan (landed): `docs/superpowers/plans/2026-09-04-m2-preflight-2-api-client.md`.

## Global Constraints

- Node >= 24; pnpm workspace; run repo commands from the repo root unless noted.
- Work on a feature branch (suggested: `feat/landing-query-ssr`); never commit to `main`; leave pushing to the user.
- Do not commit code that fails `pnpm check` (lint + format + typecheck + test) for what you touched; `pnpm build` must also stay green (issue AC).
- `API_URL` is a **plain server-side var — no `VITE_` prefix, no fallback**. A missing/blank value throws at client creation (`api.server.ts`). Never import `api.server.ts` from client-reachable code (its only importer is `api.functions.ts`, whose `createServerFn` stubs are client-safe).
- `apps/landing/.env.local` is gitignored (`.env*` in root `.gitignore`) — never commit it. `.env.example` (the committed template) IS allowed by gitignore (`!.env.example`).
- `verbatimModuleSyntax` is on — `import type` for type-only imports (e.g. `QueryClient` in `__root.tsx`).
- Biome orders `@tanstack/react-query` imports before `@tanstack/react-router` imports — write imports in that order or `pnpm lint` rewrites them.
- No namespace imports (Biome `noNamespaceImport`): Sentry is imported as `import { startSpan } from '@sentry/tanstackstart-react'` even though `.cursorrules`'s example shows `import * as Sentry` — the named form is the verified compliant one.
- Server functions carry a Sentry span per `apps/landing/.cursorrules` (no-op when Sentry is uninitialized, e.g. dev without `VITE_SENTRY_DSN`).
- Zod v4 everywhere; no new shared shapes are needed (the branch payload is already `branchSchema` in `packages/types`, parsed inside the client's `unwrap()`).
- Do not regenerate `routeTree.gen.ts` — no route paths change (only components/loaders/context).
- Do not tick `docs/plan.md` checkboxes — annotate the landed half and leave ticking to #25 close-out (both lines cover landing + admin; admin is #24).
- `apps/landing` has a no-op `test` script by design (no vitest infra yet — AGENTS.md); verification here is typecheck + build + live runtime probes, not unit tests.

### Verified pre-plan facts (probed against the real toolchain 2026-09-05)

These were executed against this exact workspace — trust them, and don't re-derive:

1. **Deps + integration exist and typecheck:** `pnpm --filter @sevendays/landing add @tanstack/react-query @tanstack/react-router-ssr-query` resolved to `@tanstack/react-query@^5.102.8` + `@tanstack/react-router-ssr-query@^1.167.2` (peer range requires `query-core >=5.102`); `setupRouterSsrQueryIntegration({ router, queryClient })` from `@tanstack/react-router-ssr-query` typechecks and runs under the CF vite plugin dev.
2. **Root-route migration:** `createRootRoute` → `createRootRouteWithContext<{ queryClient: QueryClient }>()` typechecks clean; `Route.useParams`-style context access in loaders typechecks only AFTER the migration (`Property 'queryClient' does not exist on type '{}'` [TS2339] before it — that exact error is Task 2's RED).
3. **`process.env.API_URL` reaches Start server functions in BOTH run shapes:** (a) `vite dev` under `@cloudflare/vite-plugin` reads `apps/landing/.env.local` (vite watches the file and auto-restarts on change — observed); (b) the BUILT worker served by `wrangler dev --local` also picks up `.env.local` via wrangler's dev-vars loader. In production the value is a Workers var. (Bonus finding: the shell `API_URL` env var is NOT needed — the loader path is file-based.)
4. **Loud failure verified:** with a blank `API_URL`, SSR puts the route in error state carrying exactly `API_URL is not set — the landing server cannot call the API. …` — HTTP **500** under the built workerd, and the error text appears in the dev streamed payload. Restoring the env recovers 200 + data without a rebuild.
5. **E2E verified in dev:** `GET /` returned 200 with all three seeded branch rows (Calamba Main Branch, Dipolog Branch, Iligan Branch) server-rendered through loader → server fn → `createApiClient().branches.list()` → API; the route error state carries the dehydrated query payload.
6. **No leakage:** served HTML contained zero occurrences of `API_URL`, `8787`, or `127.0.0.1:8787`; `grep -rl` over `dist/client/` for `API_URL` and the origin came back empty.
7. **The built server output is a Cloudflare Worker** (`export default { fetch }`): `node dist/server/index.js` (the current `start` script) loads and exits silently — it is stale for the CF-plugin app. Prod-shaped local verification is `pnpm --filter @sevendays/landing exec wrangler dev --local --port 3000` over the built output (`.wrangler/deploy/config.json` points it at `dist/server/wrangler.json`). Do NOT pass the dist config path explicitly — wrangler errors with a double-config conflict (`Found both a user configuration file … and a deploy configuration file …`).
8. **Sentry span form:** `startSpan({ name }, fn)` named import typechecks, passes Biome, and serves 200 in dev (`* as Sentry` fails `noNamespaceImport`).
9. **Biome import order:** `@tanstack/react-query` sorts before `@tanstack/react-router` — all file contents below are already in compliant order (they pass `biome check` untouched).
10. **Live API for the probe:** compose db up → `pnpm --filter @sevendays/api dev` serves `/health` 200 and `/api/v1/branches` with the three seeded rows. The deployed Worker was NOT used pre-plan (kept out of scope); the compose-local API is the E2E target.

---

### Task 1: Deps + server-side API_URL seam + data layer

**Files:**
- Modify: `apps/landing/package.json` (dependencies block)
- Create: `apps/landing/src/lib/api.server.ts`
- Create: `apps/landing/src/lib/api.functions.ts`
- Create: `apps/landing/src/lib/queries.ts`
- Create: `apps/landing/.env.example`

**Interfaces:**
- Consumes: `createApiClient({ baseUrl })` → `ApiClient` with `branches.list(): Promise<Branch[]>` from `@sevendays/api-client` (landed #22; every response Zod-parsed, real `Date`s via `z.coerce.date`).
- Produces (Tasks 2–3 consume):
  - `getBranches: () => Promise<Branch[]>` — a TanStack Start server function (`api.functions.ts`), client-safe import.
  - `branchQueries.all(): queryOptions` — `{ queryKey: ['branches'], queryFn: () => getBranches() }` (`queries.ts`).

- [ ] **Step 1: Install the dependencies**

If not already present in `apps/landing/package.json`:

```bash
pnpm --filter @sevendays/landing add @sevendays/api-client@workspace:*
pnpm --filter @sevendays/landing add @tanstack/react-query @tanstack/react-router-ssr-query
```

Expected resulting dependencies (versions as resolved 2026-09-05):

```json
"@sevendays/api-client": "workspace:*",
"@tanstack/react-query": "^5.102.8",
"@tanstack/react-router-ssr-query": "^1.167.2",
```

- [ ] **Step 2: Create the server-only API seam**

Create `apps/landing/src/lib/api.server.ts`:

```ts
import { createApiClient } from '@sevendays/api-client';

// Server-only (ADR-0006): the API base URL and the client embedding it must
// never reach a client bundle. The server functions in api.functions.ts are
// the only permitted importers of this module.
export function getApiUrl(): string {
  const url = process.env.API_URL;
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error(
      'API_URL is not set — the landing server cannot call the API. Set it in apps/landing/.env.local (dev) or Workers vars (prod). No fallback by design.'
    );
  }
  return url;
}

export function getApiClient() {
  return createApiClient({ baseUrl: getApiUrl() });
}
```

- [ ] **Step 3: Create the server functions**

Create `apps/landing/src/lib/api.functions.ts`:

```ts
import { startSpan } from '@sentry/tanstackstart-react';
import { createServerFn } from '@tanstack/react-start';
import { getApiClient } from './api.server';

export const getBranches = createServerFn().handler(async () => {
  // .cursorrules: server functions get a Sentry span (no-op when Sentry is
  // uninitialized — dev without VITE_SENTRY_DSN). Named import per the repo
  // Biome rule (no namespace imports).
  return startSpan({ name: 'GET /api/v1/branches' }, async () => {
    return getApiClient().branches.list();
  });
});
```

- [ ] **Step 4: Create the query options**

Create `apps/landing/src/lib/queries.ts`:

```ts
import { queryOptions } from '@tanstack/react-query';
import { getBranches } from './api.functions';

// Query key factory (one resource today; grows with the booking flow).
export const branchQueries = {
  all: () =>
    queryOptions({
      queryKey: ['branches'],
      queryFn: () => getBranches(),
    }),
};
```

- [ ] **Step 5: Create the committed env template**

Create `apps/landing/.env.example`:

```bash
# Base URL of the sevendays API (ADR-0006: browser → this app → API, never
# browser → API). Dev: http://127.0.0.1:8787 (`pnpm --filter @sevendays/api dev`).
# Prod: a Workers var on the landing Worker — no fallback; missing = loud failure.
API_URL=
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @sevendays/landing typecheck`
Expected: PASS (the new modules compile; nothing imports them yet).

- [ ] **Step 7: Commit**

```bash
git add apps/landing/package.json pnpm-lock.yaml apps/landing/.env.example apps/landing/src/lib/
git commit -m "feat(landing): API_URL seam + server functions + query options for the branches sample

- src/lib/api.server.ts: the only module that knows the API base URL —
  process.env.API_URL with no fallback; missing/blank throws at client
  creation so a misconfigured deployment fails loudly (ADR-0006).
- src/lib/api.functions.ts: getBranches server function wrapping
  client.branches.list(), Sentry-spanned per .cursorrules (named startSpan
  import — Biome bans namespace imports).
- src/lib/queries.ts: branchQueries.all() queryOptions factory for the
  loader prefetch + useSuspenseQuery consumer.
- .env.example documents API_URL (value stays in gitignored .env.local)." 
```

### Task 2: Query SSR wiring + sample branches call

**Files:**
- Modify: `apps/landing/src/routes/index.tsx` (entire contents)
- Modify: `apps/landing/src/router.tsx` (entire contents)
- Modify: `apps/landing/src/routes/__root.tsx` (entire contents)

**Interfaces:**
- Consumes: `branchQueries.all()` from Task 1; `setupRouterSsrQueryIntegration` from `@tanstack/react-router-ssr-query`.
- Produces: router context type `{ queryClient: QueryClient }` (declared in `__root.tsx` as `RouterContext`) — every future loader reads `context.queryClient`; the SSR integration auto-dehydrates/hydrates the query cache around the SSR boundary and wraps the tree with `QueryClientProvider`.

- [ ] **Step 1: RED — write the sample page first**

Replace the entire contents of `apps/landing/src/routes/index.tsx` with:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { branchQueries } from '../lib/queries';

export const Route = createFileRoute('/')({
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(branchQueries.all());
  },
  component: Home,
});

function Home() {
  // PROBE PAGE — replaced by real content when the booking flow lands (M2)
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  return (
    <div className='p-8'>
      <h1 className='font-bold text-4xl'>Sevendays Photography</h1>
      <h2 className='mt-4 font-semibold text-xl'>Branches (API probe)</h2>
      <ul className='mt-2 list-disc pl-6'>
        {branches.map((b) => (
          <li key={b.id}>
            {b.name} — {b.address}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `pnpm --filter @sevendays/landing typecheck`
Expected: FAIL with `Property 'queryClient' does not exist on type '{}'` [TS2339] on the loader's context destructure — the root route still has no context type. If it fails for any other reason, stop and fix that first.

- [ ] **Step 3: GREEN — migrate the router and root route**

Replace the entire contents of `apps/landing/src/router.tsx` with:

```tsx
import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  // Per-request on the server (SSR safety: caches/observers must never be
  // shared across requests); one instance per app run in the browser.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Under SSR, 'static' stops every query refetching during hydration —
        // the dehydrated server data is authoritative on first render.
        refetchOnReconnect: false,
        staleTime: 60_000,
      },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Let TanStack Query own cache freshness (router preload just fills cache).
    defaultPreloadStaleTime: 0,
  });

  // Auto-dehydrate/hydrate the query cache across the SSR boundary and wrap
  // the tree with QueryClientProvider.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
```

Replace the entire contents of `apps/landing/src/routes/__root.tsx` with:

```tsx
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import PostHogProvider from '../integrations/posthog/provider';

import appCss from '../styles.css?url';

// The router context: carries the per-request QueryClient to every loader.
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Sevendays Photography',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <HeadContent />
      </head>
      <body>
        <PostHogProvider>
          {children}
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </PostHogProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run typecheck to verify it passes**

Run: `pnpm --filter @sevendays/landing typecheck`
Expected: PASS (exit 0).

- [ ] **Step 5: Lint the touched files**

Run: `pnpm --filter @sevendays/landing lint`
Expected: PASS with no findings (the file contents above are already in Biome-compliant order; a `Sort these imports` finding means the imports were retyped out of order).

- [ ] **Step 6: Commit**

```bash
git add apps/landing/src/router.tsx apps/landing/src/routes/__root.tsx apps/landing/src/routes/index.tsx
git commit -m "feat(landing): TanStack Query SSR wiring + sample branches call

- QueryClient is per-request on the server (fresh inside getRouter()) and
  flows through router context; the root route migrates to
  createRootRouteWithContext<{ queryClient }>() so loaders get typed access.
- setupRouterSsrQueryIntegration (@tanstack/react-router-ssr-query) owns
  cache dehydration/hydration across the SSR boundary and the
  QueryClientProvider wrap — no manual dehydrate/hydrate boilerplate.
- The index route loader prefetches branches via ensureQueryData; the
  component renders through useSuspenseQuery (data guaranteed, no loading
  state). defaultPreloadStaleTime 0 lets Query own freshness.
- Sample call only (issue #23): the probe page is replaced by the real
  booking flow in Milestone 2 proper."
```

### Task 3: End-to-end verification (dev + loud-fail + prod-shaped workerd + leak scan)

**Files:**
- Create (local only, gitignored): `apps/landing/.env.local`

No repo files change — this task produces the issue's verification evidence. Do it after Tasks 1–2 are committed.

**Interfaces:**
- Consumes: everything from Tasks 1–2; the compose db + `apps/api` dev server (task's Step 1).

- [ ] **Step 1: Boot the stack**

```bash
docker compose up -d db          # compose postgres:17 (skip if already healthy)
pnpm --filter @sevendays/api dev # API on http://127.0.0.1:8787 (background)
```

Copy the template and point at the local API:

```bash
cp apps/landing/.env.example apps/landing/.env.local
```

then set the value in `apps/landing/.env.local`:

```bash
API_URL=http://127.0.0.1:8787
```

```bash
pnpm --filter @sevendays/landing dev  # background — prints its port (3000, or 3001 if busy)
```

Sanity: `curl -sS http://127.0.0.1:8787/api/v1/branches | grep -o '"name":"[^"]*"'` → three names (Calamba Main Branch, Dipolog Branch, Iligan Branch).

- [ ] **Step 2: E2E — the sample call through the whole chain**

Run: `curl -sS --max-time 60 -o /tmp/landing-e2e.html http://127.0.0.1:3000/` (use whichever port the dev server printed)
Expected: exit 0, HTTP 200, and `grep -c Calamba /tmp/landing-e2e.html` ≥ 1 (all three names present: Calamba, Dipolog, Iligan). This proves browser-request → own SSR server → `getBranches` server fn → `createApiClient` → API → Zod-parsed rows → server-rendered HTML, with the query cache dehydrated into the payload for hydration.

If a real browser is available, also open `http://127.0.0.1:3000/` and confirm the three branch rows render after hydration (no console errors). The curl evidence is the required minimum.

- [ ] **Step 3: Loud failure — no fallback**

Set `apps/landing/.env.local` to a blank value (keep the key so dotenv finds it):

```bash
API_URL=
```

Vite watches the file and restarts itself (observed in dev output: `.env.local changed, restarting server…`). Then:

Run: `curl -sS --max-time 60 -o /tmp/landing-fail.html http://127.0.0.1:3000/`
Expected: `grep -c Calamba /tmp/landing-fail.html` = 0 AND the error text present: `grep -c "API_URL is not set" /tmp/landing-fail.html` = 1. In dev the route surfaces its error state in the streamed payload; under the built workerd (Step 5) the same blank env yields HTTP 500.

Restore the value (`API_URL=http://127.0.0.1:8787`), wait for the restart, and re-curl: 200 + branch names again (verified live: recovery needs no rebuild or manual restart).

- [ ] **Step 4: No-secrets check — the env never reaches the client**

Run: `grep -c "8787" /tmp/landing-e2e.html` and `grep -c "API_URL" /tmp/landing-e2e.html`
Expected: 0 for both. After Task 5's build (or now via `pnpm --filter @sevendays/landing build`), also: `grep -rl "API_URL\|127.0.0.1:8787" apps/landing/dist/client/` → no files.

- [ ] **Step 5: Prod-shaped verification — built worker under workerd**

```bash
pnpm --filter @sevendays/landing build
pnpm --filter @sevendays/landing exec wrangler dev --local --port 3000   # background; api dev server still up
```

Run: `curl -sS --max-time 30 -o /tmp/landing-prod.html http://127.0.0.1:3000/`
Expected: HTTP 200 + the three branch names (`grep -c Calamba /tmp/landing-prod.html` ≥ 1). Then blank `.env.local`, restart `wrangler dev`, re-curl: expected **HTTP 500** carrying `API_URL is not set` — the loud failure in the production runtime shape.

Probing notes (verified pre-plan): use bare `wrangler dev` — the build registers `.wrangler/deploy/config.json` pointing at `dist/server/wrangler.json`, and passing the dist path explicitly errors with a double-config conflict. `node dist/server/index.js` (the `start` script) exits silently by design of the CF-plugin output shape — do not use it here.

- [ ] **Step 6: Record the evidence**

No commit. Record in the eventual PR description: the Step 2 curl output (branch names), the Step 3/5 error outputs, and the Step 4 zero-leak greps.

### Task 4: Full gates + docs cross-linking

**Files:**
- Modify: `docs/progress.md` (the #22 bullet's trailing sentence + Known Gaps)
- Modify: `docs/plan.md` (the two pre-flight checkboxes' annotations)

**Interfaces:**
- Consumes: all landed tasks.

- [ ] **Step 1: Run the full gates**

Run: `pnpm check && pnpm build`
Expected: both green across the workspace (`landing` typecheck/lint/format inside `check`; `build` emits `dist/` 5/5).

- [ ] **Step 2: Amend `docs/progress.md`**

In the **What Exists** section, immediately after the `#22` client-package bullet, add:

```markdown
- **M2 pre-flight landing wiring (#23):** apps/landing speaks to the API end to
  end (browser → own server functions → API through `@sevendays/api-client`):
  TanStack Query ^5.102.8 + `@tanstack/react-router-ssr-query` ^1.167.2 with
  `setupRouterSsrQueryIntegration` (per-request QueryClient in router context,
  root route on `createRootRouteWithContext`); the index route's loader
  prefetches branches via `ensureQueryData` and renders through
  `useSuspenseQuery` over the `getBranches` server function (Sentry span per
  .cursorrules). `API_URL` is server-side env, no fallback —
  `src/lib/api.server.ts` throws at client creation; verified loud in dev AND
  under built-worker `wrangler dev` (HTTP 500 with the message), and
  `process.env` reaches server functions in both shapes (CF vite plugin reads
  `.env.local` in dev; wrangler's dev-vars loader locally; Workers var in
  prod). `apps/landing/.env.example` added. Zero `API_URL`/origin leakage into
  served HTML and `dist/client` (grep-verified).
```

In **Known Gaps / Not Yet Done**, add:

```markdown
- `apps/landing`'s `start` script (`node --import ./dist/server/instrument.server.mjs dist/server/index.js`) is stale for the CF-plugin app — the built server entry is a Worker (`export default {fetch}`), so `pnpm --filter @sevendays/landing start` exits silently. Prod-shaped local serving is `wrangler dev --local` over the built output. Fix (or repoint to wrangler) at next touch of `apps/landing/package.json`.
```

- [ ] **Step 3: Annotate `docs/plan.md` (no ticks)**

Both checkboxes stay `- [ ]` (they name landing + admin; admin is #24; ticks happen at #25 close-out per the block's convention). Append an audit note to each, matching the style of the #21/#22 notes:

Line `- [ ] \`API_URL\` wired as server-side env in both apps …` — append:

```markdown
_(2026-09-05: landing half landed via #23 — `API_URL` read in `src/lib/api.server.ts` with no fallback, loud-failure verified in dev and under built-worker wrangler dev; `.env.example` added; admin half is #24; tick at #25 close-out.)_
```

Line `- [ ] Install \`@tanstack/react-query\` in \`apps/landing\` + \`apps/admin\` with SSR query integration …` — append:

```markdown
_(2026-09-05: landing half landed via #23 — react-query ^5.102.8 + react-router-ssr-query ^1.167.2, per-request client in router context, loader `ensureQueryData` + `useSuspenseQuery` verified live; admin half is #24; tick at #25 close-out.)_
```

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md docs/plan.md
git commit -m "docs: record M2 pre-flight landing wiring (#23) in progress + plan annotations

- progress.md: #23 What-Exists bullet (Query SSR wiring, API_URL seam,
  loud-failure + leak-scan evidence, both run shapes) and a Known Gaps entry
  for the stale landing `start` script (built output is a Worker; node
  dist/server/index.js exits silently — wrangler dev --local is the
  prod-shaped local server).
- plan.md: annotate the two pre-flight checkboxes with the landed landing
  half; ticks stay deferred to #25 close-out (admin half = #24)."
```

---

## Self-Review (done pre-flight, 2026-09-05)

- **Spec coverage:** Query client per-request on the server + router context (Task 2), loader `ensureQueryData` + `useSuspenseQuery` through a server function using the shared client (Tasks 1–2), `API_URL` from server env with no fallback failing loudly at client creation (Tasks 1, 3), sample call verified end to end in dev + prod-shaped workerd (Task 3), `pnpm check` + `pnpm build` green (Task 4). All five issue ACs map to tasks. ADR-0006 topology (browser → own app → API) is structural: `api.server.ts` is imported only by `api.functions.ts`.
- **Placeholder scan:** none — every code step carries its full file content; every verification step names the exact command and expected output.
- **Type consistency:** `branchQueries.all()` (Task 1) is consumed verbatim in Task 2; `RouterContext` (Task 2, `__root.tsx`) is the context type the Task 2 loader destructures; `getBranches` (Task 1) is the exact `queryFn` in `queries.ts`.
