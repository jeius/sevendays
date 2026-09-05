# M2 Pre-flight 4/5 — Admin: TanStack Query SSR wiring + API_URL + sample branches call (#24) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `apps/admin` to the API end to end — the same infrastructure as #23's landing slice, as its own verification unit: TanStack Query with SSR integration (per-request QueryClient in router context, loader `ensureQueryData` + `useSuspenseQuery`), `API_URL` as a fallback-less server-side env, and one sample call (branches list) flowing browser → own server functions → API through the shared `@sevendays/api-client`.

**Architecture:** ADR-0006 server-mediated topology: the browser talks only to its own app. Three new admin modules split by the repo's execution-context convention: `src/lib/api.server.ts` (server-only: reads `process.env.API_URL`, builds the shared client — the ONLY place allowed to know the base URL), `src/lib/api.functions.ts` (`createServerFn` wrappers, Sentry-spanned per `.cursorrules`), `src/lib/queries.ts` (queryOptions factory consumed by loaders and components). The root route migrates to `createRootRouteWithContext<{ queryClient }>()`; `getRouter()` creates the QueryClient per invocation (per-request under SSR) and hands SSR dehydration/hydration to `setupRouterSsrQueryIntegration`. The sample page (`routes/index.tsx`) prefetches in the loader and renders via `useSuspenseQuery`. No dashboard features — those are Milestone 4.

**Tech Stack:** TanStack Start 1.168.49 (Worker-based via `@cloudflare/vite-plugin` 1.54.2), `@tanstack/react-query` ^5.102.8, `@tanstack/react-router-ssr-query` ^1.167.2 (peer-checked against query-core ≥5.102), `@sevendays/api-client` (landed #22), Zod v4 (no new shapes needed), TypeScript 6 (`verbatimModuleSyntax` on), Biome 2.x (`vite` tier), Vite 8, pnpm + Turborepo.

**Spec:** `docs/specs/2026-08-30-m2-preflight-api-client-spec.md` (amended 2026-09-04). ADR-0006 (server-mediated topology, server-env base URL). Ticket: jeius/sevendays#24, parent #1. Roadmap: M2 pre-flight block in `docs/plan.md`. Predecessor plan (landed): `docs/superpowers/plans/2026-09-04-m2-preflight-2-api-client.md`. Sibling plan (landing, #23): `docs/superpowers/plans/2026-09-05-m2-preflight-3-landing-query-ssr.md` — same pattern; this plan is self-contained (no step refers to the sibling for content).

## Global Constraints

- Node >= 24; pnpm workspace; run repo commands from the repo root unless noted.
- Work on a feature branch (suggested: `feat/admin-query-ssr`); never commit to `main`; leave pushing to the user.
- Do not commit code that fails `pnpm check` (lint + format + typecheck + test) for what you touched; `pnpm build` must also stay green (issue AC).
- `API_URL` is a **plain server-side var — no `VITE_` prefix, no fallback**. A missing/blank value throws at client creation (`api.server.ts`). Never import `api.server.ts` from client-reachable code (its only importer is `api.functions.ts`, whose `createServerFn` stubs are client-safe).
- `apps/admin/.env.local` is gitignored (`.env*` in root `.gitignore`) — never commit it. `.env.example` (the committed template) IS allowed by gitignore (`!.env.example`).
- `verbatimModuleSyntax` is on — `import type` for type-only imports (e.g. `QueryClient` in `__root.tsx`).
- Biome orders `@tanstack/react-query` imports before `@tanstack/react-router` imports — write imports in that order or `pnpm lint` rewrites them.
- No namespace imports (Biome `noNamespaceImport`): Sentry is imported as `import { startSpan } from '@sentry/tanstackstart-react'` even though `.cursorrules`'s example shows `import * as Sentry` — the named form is the verified compliant one.
- Server functions carry a Sentry span per `apps/admin/.cursorrules` (no-op when Sentry is uninitialized, e.g. dev without `VITE_SENTRY_DSN`).
- Zod v4 everywhere; no new shared shapes are needed (the branch payload is already `branchSchema` in `packages/types`, parsed inside the client's `unwrap()`).
- Do not regenerate `routeTree.gen.ts` — no route paths change (only components/loaders/context).
- Do not tick `docs/plan.md` checkboxes — annotate the landed half and leave ticking to #25 close-out (both lines cover landing + admin; landing is #23).
- `apps/admin` has a no-op `test` script by design (no vitest infra yet — AGENTS.md); verification here is typecheck + build + live runtime probes, not unit tests.
- **Parallel-execution note (#23 ∥ #24):** both plans touch disjoint file sets (`apps/landing` vs `apps/admin`) EXCEPT the shared root `pnpm-lock.yaml`. If executed concurrently on one checkout, lockfile commits may conflict — serialize the two lockfile-touching commits (Task 1 in each), or execute on separate worktrees/branches and merge. Everything else is app-local.

## Verified pre-plan facts (probed against the real toolchain 2026-09-05)

These were executed against this exact workspace on the **admin** app — trust them, and don't re-derive:

1. **Deps + integration exist and typecheck:** `pnpm --filter @sevendays/admin add @sevendays/api-client@workspace:* @tanstack/react-query @tanstack/react-router-ssr-query` resolved to `@tanstack/react-query@^5.102.8` + `@tanstack/react-router-ssr-query@^1.167.2` (peer range requires `query-core >=5.102`); `setupRouterSsrQueryIntegration({ router, queryClient })` typechecks and runs under the CF vite plugin dev.
2. **Admin is byte-identical in shape to landing's pre-#23 state** (same starter `router.tsx`/`__root.tsx`/`index.tsx`, same scripts, same `.cursorrules`, same biome/tsconfig tiers), so the landing-verified mechanisms transfer; every step below was still re-run live on admin.
3. **RED confirmed on admin:** writing the sample page before the root-route migration yields exactly `Property 'queryClient' does not exist on type '{}'` [TS2339] (LSP-observed live).
4. **`process.env.API_URL` reaches admin server functions in BOTH run shapes:** (a) `vite dev` reads `apps/admin/.env.local` (vite watches the file and auto-restarts on change — observed twice); (b) the BUILT worker served by `wrangler dev --local` picks up `.env.local` via wrangler's dev-vars loader. In production the value is a Workers var.
5. **Loud failure verified twice:** blank `API_URL` → dev SSR 500 carrying `API_URL is not set — the admin server cannot call the API. …`, and built-worker workerd 500 with the same message. Restoring the env recovers 200 + data without a rebuild.
6. **E2E verified in dev:** `GET /` on admin returned 200 with the seeded branch rows (Calamba, Iligan names present) server-rendered through loader → server fn → `createApiClient().branches.list()` → API.
7. **No leakage:** admin dev HTML contained zero `API_URL`/`8787` occurrences; `grep -rl` over `apps/admin/dist/client/` for `API_URL` and `127.0.0.1:8787` came back empty.
8. **The built server output is a Cloudflare Worker** (`export default { fetch }`): the `start` script (`node dist/server/index.js`) loads and exits silently — stale for the CF-plugin app. Prod-shaped local verification is `pnpm --filter @sevendays/admin exec wrangler dev --local --port 3000` over the built output; do NOT pass the dist wrangler.json path explicitly (double-config conflict, verified on landing's identical build).
9. **Port-collision gotcha (hit live during the probe):** if the vite dev server is still running on 3000, `wrangler dev --local --port 3000` fails with `Address already in use` — kill the dev server first, or the "prod" curl silently tests the DEV server (a 200 proves nothing about workerd). Verify which process holds the port before trusting a prod-shape result.
10. **Live API for the probe:** compose db up → `pnpm --filter @sevendays/api dev` serves `/health` 200 and `/api/v1/branches` with the three seeded rows (Calamba Main Branch, Dipolog Branch, Iligan Branch).

---

### Task 1: Deps + server-side API_URL seam + data layer

**Files:**
- Modify: `apps/admin/package.json` (dependencies block)
- Create: `apps/admin/src/lib/api.server.ts`
- Create: `apps/admin/src/lib/api.functions.ts`
- Create: `apps/admin/src/lib/queries.ts`
- Create: `apps/admin/.env.example`

**Interfaces:**
- Consumes: `createApiClient({ baseUrl })` → `ApiClient` with `branches.list(): Promise<Branch[]>` from `@sevendays/api-client` (landed #22; every response Zod-parsed, real `Date`s via `z.coerce.date`).
- Produces (Tasks 2–3 consume):
  - `getBranches: () => Promise<Branch[]>` — a TanStack Start server function (`api.functions.ts`), client-safe import.
  - `branchQueries.all(): queryOptions` — `{ queryKey: ['branches'], queryFn: () => getBranches() }` (`queries.ts`).

- [ ] **Step 1: Install the dependencies**

```bash
pnpm --filter @sevendays/admin add @sevendays/api-client@workspace:* @tanstack/react-query @tanstack/react-router-ssr-query
```

Expected resulting dependencies (versions as resolved 2026-09-05):

```json
"@sevendays/api-client": "workspace:*",
"@tanstack/react-query": "^5.102.8",
"@tanstack/react-router-ssr-query": "^1.167.2",
```

- [ ] **Step 2: Create the server-only API seam**

Create `apps/admin/src/lib/api.server.ts`:

```ts
import { createApiClient } from '@sevendays/api-client';

// Server-only (ADR-0006): the API base URL and the client embedding it must
// never reach a client bundle. The server functions in api.functions.ts are
// the only permitted importers of this module.
export function getApiUrl(): string {
  const url = process.env.API_URL;
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error(
      'API_URL is not set — the admin server cannot call the API. Set it in apps/admin/.env.local (dev) or Workers vars (prod). No fallback by design.'
    );
  }
  return url;
}

export function getApiClient() {
  return createApiClient({ baseUrl: getApiUrl() });
}
```

- [ ] **Step 3: Create the server functions**

Create `apps/admin/src/lib/api.functions.ts`:

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

Create `apps/admin/src/lib/queries.ts`:

```ts
import { queryOptions } from '@tanstack/react-query';
import { getBranches } from './api.functions';

// Query key factory (one resource today; grows with the Dashboard/CMS).
export const branchQueries = {
  all: () =>
    queryOptions({
      queryKey: ['branches'],
      queryFn: () => getBranches(),
    }),
};
```

- [ ] **Step 5: Create the committed env template**

Create `apps/admin/.env.example`:

```bash
# Base URL of the sevendays API (ADR-0006: browser → this app → API, never
# browser → API). Dev: http://127.0.0.1:8787 (`pnpm --filter @sevendays/api dev`).
# Prod: a Workers var on the admin Worker — no fallback; missing = loud failure.
API_URL=
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @sevendays/admin typecheck`
Expected: PASS (the new modules compile; nothing imports them yet).

- [ ] **Step 7: Commit**

```bash
git add apps/admin/package.json pnpm-lock.yaml apps/admin/.env.example apps/admin/src/lib/
git commit -m "feat(admin): API_URL seam + server functions + query options for the branches sample

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
- Modify: `apps/admin/src/routes/index.tsx` (entire contents)
- Modify: `apps/admin/src/router.tsx` (entire contents)
- Modify: `apps/admin/src/routes/__root.tsx` (entire contents)

**Interfaces:**
- Consumes: `branchQueries.all()` from Task 1; `setupRouterSsrQueryIntegration` from `@tanstack/react-router-ssr-query`.
- Produces: router context type `{ queryClient: QueryClient }` (declared in `__root.tsx` as `RouterContext`) — every future loader reads `context.queryClient`; the SSR integration auto-dehydrates/hydrates the query cache around the SSR boundary and wraps the tree with `QueryClientProvider`.

- [ ] **Step 1: RED — write the sample page first**

Replace the entire contents of `apps/admin/src/routes/index.tsx` with:

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
  // PROBE PAGE — replaced by real Dashboard/CMS when Milestone 4 lands.
  // The branches read doubles as connectivity + parse verification (#24).
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  return (
    <div className='p-8'>
      <h1 className='font-bold text-4xl'>Sevendays Admin</h1>
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

Run: `pnpm --filter @sevendays/admin typecheck`
Expected: FAIL with `Property 'queryClient' does not exist on type '{}'` [TS2339] on the loader's context destructure — the root route still has no context type (LSP-reproduced live pre-plan). If it fails for any other reason, stop and fix that first.

- [ ] **Step 3: GREEN — migrate the router and root route**

Replace the entire contents of `apps/admin/src/router.tsx` with:

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

- [ ] **Step 4: Migrate the root route**

Replace the entire contents of `apps/admin/src/routes/__root.tsx` with:

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
        title: 'Sevendays Admin',
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

- [ ] **Step 5: Run typecheck to verify it passes**

Run: `pnpm --filter @sevendays/admin typecheck`
Expected: PASS (exit 0).

- [ ] **Step 6: Lint the touched files**

Run: `pnpm --filter @sevendays/admin lint`
Expected: PASS with no findings (the file contents above are already in Biome-compliant order; a `Sort these imports` finding means the imports were retyped out of order).

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/router.tsx apps/admin/src/routes/__root.tsx apps/admin/src/routes/index.tsx
git commit -m "feat(admin): TanStack Query SSR wiring + sample branches call

- QueryClient is per-request on the server (fresh inside getRouter()) and
  flows through router context; the root route migrates to
  createRootRouteWithContext<{ queryClient }>() so loaders get typed access.
- setupRouterSsrQueryIntegration (@tanstack/react-router-ssr-query) owns
  cache dehydration/hydration across the SSR boundary and the
  QueryClientProvider wrap — no manual dehydrate/hydrate boilerplate.
- The index route loader prefetches branches via ensureQueryData; the
  component renders through useSuspenseQuery (data guaranteed, no loading
  state). defaultPreloadStaleTime 0 lets Query own freshness.
- Sample call only (issue #24): the probe page is replaced by the real
  Dashboard/CMS in Milestone 4."
```

### Task 3: End-to-end verification (dev + loud-fail + prod-shaped workerd + leak scan)

**Files:**
- Create (local only, gitignored): `apps/admin/.env.local`

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
cp apps/admin/.env.example apps/admin/.env.local
```

then set the value in `apps/admin/.env.local`:

```bash
API_URL=http://127.0.0.1:8787
```

```bash
pnpm --filter @sevendays/admin dev  # background — port 3000 (or 3001 if busy)
```

Sanity: `curl -sS http://127.0.0.1:8787/api/v1/branches | grep -o '"name":"[^"]*"'` → three names (Calamba Main Branch, Dipolog Branch, Iligan Branch).

- [ ] **Step 2: E2E — the sample call through the whole chain**

Run: `curl -sS --max-time 60 -o /tmp/admin-e2e.html http://127.0.0.1:3000/` (use whichever port the dev server printed)
Expected: exit 0, HTTP 200, and `grep -c Calamba /tmp/admin-e2e.html` ≥ 1 (all three names present: Calamba, Dipolog, Iligan). This proves browser-request → own SSR server → `getBranches` server fn → `createApiClient` → API → Zod-parsed rows → server-rendered HTML, with the query cache dehydrated into the payload for hydration.

If a real browser is available, also open the URL and confirm the three branch rows render after hydration (no console errors). The curl evidence is the required minimum.

- [ ] **Step 3: Loud failure — no fallback**

Set `apps/admin/.env.local` to a blank value (keep the key so dotenv finds it):

```bash
API_URL=
```

Vite watches the file and restarts itself (observed in dev output: `.env.local changed, restarting server…`). Then:

Run: `curl -sS --max-time 60 -o /tmp/admin-fail.html http://127.0.0.1:3000/`
Expected: `grep -c Calamba /tmp/admin-fail.html` = 0 AND `grep -c "API_URL is not set" /tmp/admin-fail.html` = 1 (verified live: dev SSR returns 500 with the message). Restore the value (`API_URL=http://127.0.0.1:8787`), wait for the restart, and re-curl: 200 + branch names again (recovery needs no rebuild or manual restart).

- [ ] **Step 4: No-secrets check — the env never reaches the client**

Run: `grep -c "8787" /tmp/admin-e2e.html` and `grep -c "API_URL" /tmp/admin-e2e.html`
Expected: 0 for both. After Task 4's build (or now via `pnpm --filter @sevendays/admin build`), also: `grep -rl "API_URL\|127.0.0.1:8787" apps/admin/dist/client/` → no files.

- [ ] **Step 5: Prod-shaped verification — built worker under workerd**

Kill the admin dev server first (verified pitfall: a still-running dev server holds port 3000 and `wrangler dev` either errors with `Address already in use` or your curl silently tests the DEV server).

```bash
pnpm --filter @sevendays/admin build
pnpm --filter @sevendays/admin exec wrangler dev --local --port 3000   # background; api dev server still up
```

Run: `curl -sS --max-time 30 -o /tmp/admin-prod.html http://127.0.0.1:3000/`
Expected: HTTP 200 + the three branch names (`grep -c Calamba /tmp/admin-prod.html` ≥ 1). Then blank `.env.local`, restart `wrangler dev`, re-curl: expected **HTTP 500** carrying `API_URL is not set` — the loud failure in the production runtime shape (both directions verified live).

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
Expected: both green across the workspace.

- [ ] **Step 2: Amend `docs/progress.md`**

In **What Exists**, immediately after the `#22` client-package bullet, add:

```markdown
- **M2 pre-flight admin wiring (#24):** apps/admin speaks to the API end to
  end (browser → own server functions → API through `@sevendays/api-client`),
  the same pattern as landing (#23) but as its own verification unit:
  TanStack Query ^5.102.8 + `@tanstack/react-router-ssr-query` ^1.167.2 with
  `setupRouterSsrQueryIntegration` (per-request QueryClient in router
  context, root route on `createRootRouteWithContext`); the index route's
  loader prefetches branches via `ensureQueryData` and renders through
  `useSuspenseQuery` over the `getBranches` server function (Sentry span per
  .cursorrules). `API_URL` is server-side env, no fallback —
  `src/lib/api.server.ts` throws at client creation; verified loud in dev AND
  under built-worker `wrangler dev` (HTTP 500 with the message), and
  `process.env` reaches server functions in both shapes (CF vite plugin reads
  `.env.local` in dev; wrangler's dev-vars loader locally; Workers var in
  prod). `apps/admin/.env.example` added. Zero `API_URL`/origin leakage into
  served HTML and `dist/client` (grep-verified).
```

In **Known Gaps / Not Yet Done**, add:

```markdown
- `apps/admin`'s `start` script (`node --import ./dist/server/instrument.server.mjs dist/server/index.js`) is stale for the CF-plugin app — the built server entry is a Worker (`export default {fetch}`), so `pnpm --filter @sevendays/admin start` exits silently. Prod-shaped local serving is `wrangler dev --local` over the built output. Fix (or repoint to wrangler) at next touch of `apps/admin/package.json`.
```

- [ ] **Step 3: Annotate `docs/plan.md` (no ticks)**

Both checkboxes stay `- [ ]` (they name landing + admin; landing is #23; ticks happen at #25 close-out per the block's convention). Append an audit note to each, matching the style of the #21/#22 notes:

Line `- [ ] \`API_URL\` wired as server-side env in both apps …` — append:

```markdown
_(2026-09-05: admin half landed via #24 — `API_URL` read in `apps/admin/src/lib/api.server.ts` with no fallback, loud-failure verified in dev and under built-worker wrangler dev; `.env.example` added; landing half is #23; tick at #25 close-out.)_
```

Line `- [ ] Install \`@tanstack/react-query\` in \`apps/landing\` + \`apps/admin\` with SSR query integration …` — append:

```markdown
_(2026-09-05: admin half landed via #24 — react-query ^5.102.8 + react-router-ssr-query ^1.167.2, per-request client in router context, loader `ensureQueryData` + `useSuspenseQuery` verified live; landing half is #23; tick at #25 close-out.)_
```

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md docs/plan.md
git commit -m "docs: record M2 pre-flight admin wiring (#24) in progress + plan annotations

- progress.md: #24 What-Exists bullet (Query SSR wiring, API_URL seam,
  loud-failure + leak-scan evidence, both run shapes) and a Known Gaps entry
  for the stale admin `start` script (built output is a Worker; node
  dist/server/index.js exits silently — wrangler dev --local is the
  prod-shaped local server).
- plan.md: annotate the two pre-flight checkboxes with the landed admin
  half; ticks stay deferred to #25 close-out (landing half = #23)."
```

---

## Self-Review (done pre-flight, 2026-09-05)

- **Spec coverage:** Query client per-request on the server + router context (Task 2), loader `ensureQueryData` + `useSuspenseQuery` through a server function using the shared client (Tasks 1–2), `API_URL` from server env with no fallback failing loudly at client creation (Tasks 1, 3), sample call verified end to end in dev + prod-shaped workerd (Task 3), `pnpm check` + `pnpm build` green (Task 4). All five issue ACs map to tasks. ADR-0006 topology (browser → own app → API) is structural: `api.server.ts` is imported only by `api.functions.ts`.
- **Placeholder scan:** none — every code step carries its full file content; every verification step names the exact command and expected output.
- **Type consistency:** `branchQueries.all()` (Task 1) is consumed verbatim in Task 2; `RouterContext` (Task 2, `__root.tsx`) is the context type the Task 2 loader destructures; `getBranches` (Task 1) is the exact `queryFn` in `queries.ts`.
