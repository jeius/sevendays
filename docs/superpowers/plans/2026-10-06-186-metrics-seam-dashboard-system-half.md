# M6 Ticket 04 — The Metrics Seam + the Analytics Dashboard's System Half Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **UI-bearing tasks (4–5) load the installed UI/UX skill set at execution time: `prototype` + `ui-ux-pro-max`, plus `design-system` / `ui-styling` as relevant (AGENTS.md rule, spec #94 amendment).**

**Goal:** The Analytics Dashboard's foundation and system-facing half (§ The Analytics Dashboard of the M6 spec, `apps/admin/CONTEXT.md` ## Analytics Dashboard) becomes executable code: a dedicated **metrics seam in `apps/admin` as server functions** — the CF GraphQL client and the DB probes over the existing `packages/db` client — behind its **own session gate** (the CMS write-fns discipline, ADR-0023); the three tokens (`CF_ANALYTICS_READ_TOKEN`, `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`) in the admin's env with dev-account values on main; the dashboard shell at `/` with nav "Analytics" in the Overview group (the #93 Dashboard stub dies); the **#93 reversal made real** — chart components app-local in the admin, `--chart-*` tokens in the admin's `@theme`, `packages/ui/src/tokens.css`'s no-chart clause amended. Sections landing here: **System Health** (api requests + error-rate trend, CPU p50/p99, DB latency probe, pooler census, DB size, plus one error-rate widget per frontend) and **Content** (entity counts + last-updated per family), plus the **Sentry link-out** (`sum.errors` + a console link — never a rebuild). Caching: none server-side; TanStack Query `staleTime` 60s (system) / 5m (content); revalidate on focus + manual refresh. Per-widget curated failure states (the #155 leak-safe pattern); **the page never 500s**. Owner-reacted rendered variants for the compositions.

**Architecture:** Seven tasks: (1) `packages/db` — the probe module (static SQL constants + a structural exec seam + pure munging; no new client, no drizzle types leaking into the admin) with the admin-side SQL-shape/munging tests; (2) the CF GraphQL client in `apps/admin/src/lib/metrics/` — the env reader (tolerant, curated-state-bearing — NOT loud-fail), the pinned `workersInvocationsAdaptive` query builder, envelope unwrap, failure mapping, and the bucketing/CPU/error-rate munging; (3) the seam's server fns (each gated by the seam's own session check) + the `metrics-queries.ts` factories with the spec's staleTimes + the DB result-union wrapper; (4) the screen — the shadcn chart component generated app-local (recharts), the `@theme` `--chart-*` block feeding it, the widget compositions with curated states, the route rewrite at `/`, the sidebar's Analytics label, the tokens.css amendment; (5) the rendered variants the owner reacts to (temporary ungated prototype route, mock data, screenshots, ratification, adjust, delete); (6) the env + CI wiring — `.env.example`, the admin wrangler observability block, both ci.yml legs' fail-soft token syncs and script-name vars, the owner's dev-token handoff; (7) full gates + docs rotation + PR/merge + the **v1 SPLIT with the owner-ruled divergence** (v1: dashboard at `/`, Analytics nav re-added — the #168 reversal reversed; the `routeTree.gen.ts` codegen hazard carried) + ledger row + issue close.

**Tech Stack:** TanStack Start (createServerFn, getRequestHeaders), TanStack Query v5 (queryOptions), zod 4.5.1, drizzle-orm 0.45.2 over postgres-js via `@sevendays/db`, **the shadcn chart component (a `ChartContainer` wrapper over recharts) generated app-local in the admin** (the owner's 2026-10-06 ruling), vitest 4 plain-node (the admin lib-seam pattern), pnpm + Turborepo, `gh` CLI, `@playwright/test` 1.63.0 (already installed at the root, #189 — used only as the screenshot driver in Task 5). **One new dependency: `recharts`, into `apps/admin` at an exact pin** (the shadcn chart's engine — the ruling below).

**Spec:** Implements ticket [#186 "M6 ticket 04: the metrics seam + the Analytics Dashboard's system half"](https://github.com/jeius/sevendays/issues/186) (label `ready-for-agent`; blocked by nothing), whose parent is the M6 spec `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` (issue #182 — § The Analytics Dashboard is this ticket's section; § Testing Decisions names the admin lib-seam metrics tests; § v1-pick classes pre-rules the payload **PICK with recorded SPLIT**; ADR-0023 rules the data path). Key recon facts (2026-10-06, main `e1b3085`, tree clean, compose db up + healthy, admin suite re-run live: **7 files / 59 tests**):

- **The admin's server-fn discipline** (ADR-0023's "own session gate"): server fns are directly callable, so they gate themselves. The house pattern (auth.functions.ts:20-29) is `createAuth().api.getSession({ headers: getRequestHeaders() })` → `throw new Error('Unauthorized')` on null — createAuth is per-request over a per-request db client (ADR-0011), never module scope. Every server fn body wraps in a Sentry `startSpan` (no-op without a DSN). The metrics fns have **no API in their path** (unlike the CMS fns whose gate is the forwarded cookie + the API's 401) — the gate is the seam's first statement.
- **The `/` route today is the #93 stub** (`apps/admin/src/routes/_shell.index.tsx` — `StubScreen title='Dashboard' … milestone='v2'`); `/appointments` is the same stub shape and is **untouched** (the v2 teaser stays). The sidebar (`components/admin-sidebar.tsx:79-105`) has Overview = `{ Dashboard '/', Appointments '/appointments' }`; its comment (lines 76-78) says "Overview is wholly future scope — both destinations are later-milestone stubs" — both get rewritten. `StubScreen` itself stays (appointments + settings still use it).
- **Spike-proven drizzle facts** (2026-10-06, against the compose test db, spike files deleted): `db.execute('<sql string>')` accepts a plain string and returns **the rows array directly** (`[{"one":1}]`); `count(*)::int` parses as a JS `number` but bare `count(*)` is int8 → **string** (so the content census casts); `pg_database_size()` (int8) → **string** ("10573491" — the munging parses); `max(updated_at)` → a **PG timestamp string** ("2026-10-06 09:05:17.721406+00") that normalizes via `replace(' ', 'T').replace(/\+00$/, '+00:00')` to a `Date`-parseable ISO (verified: `new Date(...)` → `2026-10-06T09:05:17.721Z`); `createDbClient` with a dead URL constructs lazily without connecting.
- **The CF GraphQL shape is documentation-pinned** (Cloudflare's "Query Workers invocation metrics via GraphQL" tutorial, developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics): `viewer { accounts(filter: {accountTag: $accountTag}) { workersInvocationsAdaptive(limit: 100, filter: {scriptName: $scriptName, datetime_geq: $since, datetime_leq: $until}) { dimensions { datetime scriptName status } sum { requests errors subrequests } quantiles { cpuTimeP50 cpuTimeP99 } } } }`, endpoint `https://api.cloudflare.com/client/v4/graphql`, `Authorization: Bearer <token>`, account-level dataset, CPU quantiles in **microseconds**, `$accountTag: string` (CF's lowercase scalar). The scalar type of the datetime variables is the one unpinned detail — see the Task 2 fallback note.
- **The env plumbing that already exists:** `process.env` works inside the admin Worker (`nodejs_compat_populate_process_env`, the `DATABASE_URL` secret precedent in `lib/auth.ts:17-22`); dev reads `.env.local` via the dev script's dotenv; `CLOUDFLARE_ACCOUNT_ID` is already a `--var` on **both** ci.yml legs (teaser + v1) for the api's R2 use — this ticket reuses the same name as the admin's GraphQL scope var (no new secret, ADR-0019's env precedent). The admin deploy currently passes only `--var API_URL + BETTER_AUTH_URL` (ci.yml:159/255) plus the `DATABASE_URL` secret sync (ci.yml:161-168/257-264); the api's wrangler.toml carries the `[observability] enabled = true` block (#183) — the admin's wrangler.jsonc has none.
- **Sibling fences (spec § Sequencing; docs/plan.md M6 box 5):** this ticket owns the dashboard's **system half ONLY — the box stays `- [ ]` until #187 (Traffic + Storage & Media) lands it**; Task 7 annotates the box and leaves it unticked. NOT here, regardless of temptation: **Traffic** (any HogQL query, `$web_vitals`, pageview/visitor/top-page widgets — #187), **Storage & Media** (any `r2StorageAdaptiveGroups`/`r2OperationsAdaptiveGroups` query, the budget markers — #187), any **consumer** of the PostHog token pair beyond its env presence (the pair lands here because the ticket pins all three tokens; the queries are #187's); the Audit Log viewer screen (#188); the production smoke (#190); the ship-provisioning runbook (#191); **any `apps/api` file at all** (the api stays domain-pure — zero api changes in this PR); `packages/api-client` (no `/api/v1` route exists or appears); `packages/types` (the widget models are admin-internal — the editor-state zod precedent; the spec's "any metrics response schemas that land in types" = **none land**); the appointments stub/settings screens (untouched); `worker-configuration.d.ts`; any ADR (ADR-0023 already rules the data path — this ticket implements it); the seed.
- **Baselines (live, 2026-10-06):** `apps/admin` = **7 files / 59 tests** (re-run this session). Per #185's close-out: api 27 files + 1 skipped / 338 passed + 3 skipped, api-client 5 files / 33 tests, landing 9 files / 73 tests, types 14 files / 118 tests, `pnpm check` 35/35 turbo tasks. After this ticket: **admin 11 files / 94 tests** (+6 env, +14 cf, +12 db-probes — 10 in Task 1 + 2 in Task 3, +3 metrics-queries; executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions). v1's admin floor after the split: 11 files / 94 tests expected (all booking-free; executor reconciles).

## Global Constraints

- **Branch & baseline:** `feat/186-metrics-seam-dashboard` off main `e1b3085` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#186)` squash style; every commit below is pinned verbatim. Evidence (test output, variant screenshots, the live-probe transcript) lands in gitignored `.superpowers/sdd/2026-10-06-186-metrics-seam-dashboard-system-half/`.
- **Gates (repo AGENTS.md, verbatim duties):** **one manifest change exists — Task 4 adds `recharts` to `apps/admin` at an exact pin (the owner's shadcn-chart ruling); `pnpm install` runs there once and `pnpm-lock.yaml` rides the PR — the v1 split regenerates it per the runbook's transformed-lockfile procedure.** **After every `packages/db` source change (Task 1), run `pnpm build:packages` before any admin typecheck/test run** (the admin resolves `@sevendays/db` from built `dist/`). Every task commits only with `pnpm check` green for the packages it touched (`docker compose up -d db` first — the api suite runs in `pnpm check` and needs the test db; the admin's new tests are plain-node and db-free). Biome canonical form via `pnpm --filter @sevendays/admin fix` / `--filter @sevendays/db fix` before committing — accept its rewrites. Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **Never commit secrets (binding):** `CF_ANALYTICS_READ_TOKEN`, `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, and `DATABASE_URL` reach the admin Worker as wrangler secrets, set per environment — never in `wrangler.jsonc`, `.env` files, ci.yml literals, the PR body, or the evidence dir. `.env.example` documents NAMES with empty values only. Dev values live in gitignored `apps/admin/.env.local`.
- **The env contract (binding):** the admin Worker gains, besides the spec-pinned three: `CLOUDFLARE_ACCOUNT_ID` (a `--var`, same name/value the api already consumes on both CI legs — the GraphQL scope, not a secret) and three script-name `--var`s `CF_ANALYTICS_SCRIPT_API` / `CF_ANALYTICS_SCRIPT_LANDING` / `CF_ANALYTICS_SCRIPT_ADMIN` (agent ruling, owner-reviewable at PR — the per-edition Worker names differ, `sevendays-*` on teaser vs `sevendays-v1-*` on v1, so they cannot be code constants; the deployment-identity class). Env reading is **tolerant by design** — a missing source config yields that widget's curated `not-configured` state, never a thrown env error (the inverted #155: the sentinel becomes a curated state, not a 503; the existing loud-fail `getApiUrl` pattern does NOT apply here).
- **The result union (binding, the #155 leak-safe pattern):** every metrics server fn resolves `MetricsResult<T> = { ok: true; data: T } | { ok: false; reason: 'not-configured' | 'unavailable' }`. Source fetch/query failures map to `{ ok: false, reason: 'unavailable' }` with the loud detail (HTTP status, GraphQL error message, probe error class) in ONE `console.error` line per failed source — log-only, never in the payload, never in the UI (the spec's "loud detail stays log-only"; the admin Worker's Workers Logs retention is enabled by Task 6's observability block). The only throw a metrics fn permits is the session gate's `Unauthorized`.
- **The never-500 law (binding):** the dashboard page renders for any staff session regardless of source health. Server fns resolve result unions; the widget components additionally map a *thrown* query error (a gate throw or an SSR transport fault) to the curated `unavailable` line — belt and suspenders. No widget error state may bubble to a route-level error boundary.
- **Curated copy pins (spec-verbatim base, completion owner-reviewable at the variants step):** unconfigured → `Analytics source not configured.`; failure → `Analytics source unavailable.` — the same two lines across every widget (which source is named by the widget's own title). Window label copy: `24 hours` / `7 days` / `30 days`. Content family labels: `Packages`, `Add-ons`, `Gallery photos`, `Testimonials`. The Sentry link-out URL: `https://sevendays-studio.sentry.io/issues/` (**owner-ratified 2026-10-06** in the plan session — org slug `sevendays-studio`; the variants step may still flag it).
- **The chart ruling (owner, 2026-10-06, answered in the plan session):** chart components are **the shadcn chart component** — `ChartContainer` + recharts primitives — **generated APP-LOCAL in `apps/admin`** (`apps/admin/src/components/ui/chart.tsx`), NOT into `packages/ui`: the reversal rules data-viz admin-local, and the components.json trio's aliases deliberately route `shadcn add` output to the shared package (ADR-0017), so the executor generates with a scratch destination (or moves the emitted file) and adapts two things — `cn` imports become `import { cn } from 'cn'` (the #102 consolidation), and `recharts` lands in `apps/admin/package.json` at an exact pin (record the registry-resolved version in the Task 4 commit body + evidence). The `--chart-1..5` vocabulary is exactly the CSS-variable contract the shadcn chart consumes — the admin `@theme` block feeds `ChartContainer` directly; provisional values derive from existing tokens (`--chart-1: var(--brand-primary)`, `--chart-2: var(--destructive)` for errors, `--chart-3: var(--brand-gray-mid)`, `--chart-4: var(--brand-500)`, `--chart-5: var(--brand-900)`, `--chart-grid: var(--border)`, `--chart-text: var(--muted-foreground)`); the variants step may adjust values/count before merge, the components reference `var(--chart-N)` so value changes don't ripple. Known SSR posture: recharts' `ResponsiveContainer` renders empty on the server and paints on hydration — expected, not a defect (the skeleton states own the first paint). `packages/ui/src/tokens.css`'s clause is amended (Task 4) to record the reversal and name the new home.
- **The query contract (binding):** ONE pinned GraphQL document per script, **three parallel scriptName-filtered fetches** (api, landing, admin — the tutorial-verbatim filter shape; rows are tiny; `limit: 10000`). Time windows: `['24h','7d','30d']`, default `7d`, carried as the route's `window` search param (zod-validated, shareable, SSR-stable); `windowToRange(window, now)` computes `{ since, until }` as millisecond-truncated ISO strings. Bucketing: 24h and 7d → hourly buckets, 30d → daily buckets (client-side re-bucketing of whatever granularity `datetime` returns — adaptive datasets coarsen with age and the munging must not care). CPU quantiles convert µs → ms (÷1000, one decimal); the CPU headline = the **max** across in-window buckets (conservative ops posture). Error rate = `sum.errors / sum.requests` with a zero-guard. The DB-probe and Content widgets are **point-in-time, windowless** (spec ruling).
- **The probe contract (binding, spike-proven):** the probe SQL lives in `packages/db/src/probes.ts` as static strings over a structural `exec` seam (`(statement: string) => Promise<Record<string, unknown>[]>` — drizzle types never leak into the admin; the server fn passes `db.execute.bind(db)`, tests pass fakes): latency = timed `select 1`; census = `select state, count(*)::int as count from pg_stat_activity where datname = current_database() group by state order by state` (a null state munges to `unknown`); size = `select pg_database_size(current_database()) as bytes` (string → number); content = one statement per family `(count(*) filter (where is_active))::int as active, max(updated_at) as last_updated` (the ::int cast is load-bearing — bare count(*) is int8 → string through postgres-js). The pooler ceiling display: `POOLER_CLIENT_CEILING = 200` (research-pinned Supavisor Micro-compute reference — a cost signal, not a quota; commented as such). `last-updated` = max over ALL rows (deactivations count as updates); counts = active rows. The DB client stays per-request `createDbClient(process.env.DATABASE_URL)` (ADR-0011 — the auth.ts pattern), never module scope.
- **staleTime pins (spec-verbatim):** system widgets (worker metrics + DB probes) `staleTime: 60_000`; content `staleTime: 300_000`; both with explicit `refetchOnWindowFocus: true` (the spec's revalidate-on-focus; the router's QueryClient default leaves it on — the factories state it anyway). No server-side cache. No polling. Manual refresh = one button invalidating the `['metrics']` key prefix.
- **The session gate (binding):** every metrics server fn's first statement (inside `startSpan`) is the seam's own gate — `createAuth().api.getSession({ headers: getRequestHeaders() })`, `throw new Error('Unauthorized')` on null (the `ensureSession` semantics hoisted into the seam; the fn validator stays input-strict). The `_shell` beforeLoad stays the page's gate; the fn-level gate exists because server fns are directly callable (ADR-0023's exact words).
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–6 edit only: `packages/db/src/probes.ts` (create), `packages/db/src/index.ts` (one export line), `apps/admin/src/lib/metrics/env.ts` + `env.test.ts` + `cf.ts` + `cf.test.ts` + `db.ts` + `db-probes.test.ts` + `metrics.functions.ts` (create), `apps/admin/src/lib/metrics-queries.ts` + `metrics-queries.test.ts` (create), `apps/admin/src/components/charts/trend-chart.tsx` + `stat-card.tsx` (create), `apps/admin/src/components/dashboard/widget-frame.tsx` + `system-health.tsx` + `frontend-error-widget.tsx` + `sentry-link.tsx` + `content-census.tsx` + `window-toggle.tsx` (create), `apps/admin/src/components/admin-sidebar.tsx`, `apps/admin/src/routes/_shell.index.tsx` (rewrite), `apps/admin/src/styles.css`, `packages/ui/src/tokens.css` (the clause amendment), `apps/admin/wrangler.jsonc`, `apps/admin/.env.example`, `.github/workflows/ci.yml`. Task 5 additionally creates then DELETES `apps/admin/src/routes/prototype-dashboard.tsx` (untracked throughout — never committed). Task 7 rotates `docs/plan.md` (M6 box 5 — ANNOTATED, not ticked), `docs/progress.md`, `AGENTS.md` (floors line + status bullet), and `docs/agents/v1-picks.md` (ledger row, post-merge). NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
packages/db/
  src/probes.ts                               # create (Task 1) — SQL constants + exec seam + pure munging
  src/index.ts                                # modify (Task 1) — one export line
apps/admin/
  src/lib/metrics/
    env.ts                                    # create (Task 2) — readMetricsEnv (tolerant)
    env.test.ts                               # create (Task 2)
    cf.ts                                     # create (Task 2) — query builder + client + munging
    cf.test.ts                                # create (Task 2)
    db.ts                                     # create (Task 3) — result-union wrapper over the probes
    db-probes.test.ts                         # create (Task 1; Task 3 adds the wrapper tests)
    metrics.functions.ts                      # create (Task 3) — the session-gated server fns
  src/lib/metrics-queries.ts                  # create (Task 3) — queryOptions factories
  src/lib/metrics-queries.test.ts             # create (Task 3)
  src/components/charts/
    ui/chart.tsx                                 # create (Task 4) — the shadcn chart component, vendored APP-LOCAL
    trend-chart.tsx                           # create (Task 4) — the trend chart over ChartContainer/recharts
    stat-card.tsx                             # create (Task 4) — app-local stat card
  src/components/dashboard/
    widget-frame.tsx                          # create (Task 4) — title/window badge/curated states
    system-health.tsx                         # create (Task 4)
    frontend-error-widget.tsx                 # create (Task 4)
    sentry-link.tsx                           # create (Task 4)
    content-census.tsx                        # create (Task 4)
    window-toggle.tsx                         # create (Task 4)
  src/components/admin-sidebar.tsx            # modify (Task 4) — Analytics label + comment
  src/routes/_shell.index.tsx                 # rewrite (Task 4) — the dashboard at /
  src/routes/prototype-dashboard.tsx          # temporary (Task 5 — untracked, deleted pre-PR)
  src/styles.css                              # modify (Task 4) — the @theme --chart-* block
  wrangler.jsonc                              # modify (Task 6) — observability block
  .env.example                                # modify (Task 6) — the new key names
packages/ui/src/tokens.css                    # modify (Task 4) — the no-chart clause amendment
.github/workflows/ci.yml                      # modify (Task 6) — both legs
docs/plan.md docs/progress.md AGENTS.md docs/agents/v1-picks.md   # Task 7
```

---

### Task 1: `packages/db` — the probe module + the admin SQL-shape tests (TDD)

**Files:**
- Create (test-first): `apps/admin/src/lib/metrics/db-probes.test.ts`
- Create: `packages/db/src/probes.ts`
- Modify: `packages/db/src/index.ts` (one export line)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (what Tasks 3 + the screen rely on): `packages/db` exports `SqlExec`, `POOLER_CLIENT_CEILING`, `PROBE_LATENCY_SQL`, `PROBE_CENSUS_SQL`, `PROBE_SIZE_SQL`, `CONTENT_CENSUS_SQL` (a `Record<ContentFamilyKey, string>`), `PoolerCensus`, `SystemProbes`, `ContentFamilyKey`, `ContentCensusRow`, `ContentCensus`, `mungeCensus(rows)`, `parseSizeBytes(raw)`, `parsePgTimestamp(raw)`, `mungeContentRow(key, row)`, `runSystemProbes(exec)`, `runContentCensus(exec)` — full shapes fenced in Step 3.

**Not here:** any drizzle query-builder code (the probes are static SQL strings by design — `pg_stat_activity`/`pg_database_size` have no schema tables, and strings keep the exec seam drizzle-free); any server fn (Task 3); any CF/PostHog code (Task 2); the two-migration anything (no schema change — **`packages/db/migrations/` is untouched, no `db:generate` runs**).

- [ ] **Step 1: Write the failing tests**

Create `apps/admin/src/lib/metrics/db-probes.test.ts`:

```ts
// The DB-probe seams of the metrics module (#186): the SQL shapes live in
// packages/db (the "DB access goes through packages/db" rule — the raw SQL
// for system views has no schema table, so it ships as pinned constants),
// the munging is pure, and everything runs plain-node over fakes (the
// admin lib-seam pattern — no db, no browser).
import { describe, expect, it } from 'vitest';
import {
  CONTENT_CENSUS_SQL,
  POOLER_CLIENT_CEILING,
  PROBE_CENSUS_SQL,
  PROBE_LATENCY_SQL,
  PROBE_SIZE_SQL,
  mungeCensus,
  mungeContentRow,
  parsePgTimestamp,
  parseSizeBytes,
} from '@sevendays/db';

describe('the probe SQL shapes (spike-proven against the compose db)', () => {
  it('latency is the timed round-trip statement', () => {
    expect(PROBE_LATENCY_SQL).toBe('select 1');
  });

  it('census counts by state for the current database only', () => {
    expect(PROBE_CENSUS_SQL).toBe(
      'select state, count(*)::int as count from pg_stat_activity where datname = current_database() group by state order by state'
    );
  });

  it('size reads the current database size in bytes', () => {
    expect(PROBE_SIZE_SQL).toBe(
      'select pg_database_size(current_database()) as bytes'
    );
  });

  it('content census counts active rows and last-updated per family (the ::int cast is load-bearing — bare count(*) is int8 → string through postgres-js)', () => {
    expect(CONTENT_CENSUS_SQL.packages).toBe(
      'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from service_packages'
    );
    expect(CONTENT_CENSUS_SQL.addons).toBe(
      'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from addon_services'
    );
    expect(CONTENT_CENSUS_SQL.photos).toBe(
      'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from gallery_photos'
    );
    expect(CONTENT_CENSUS_SQL.testimonials).toBe(
      'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from testimonials'
    );
  });
});

describe('mungeCensus', () => {
  it('maps rows to by-state counts with a total and a null state folding to unknown', () => {
    const census = mungeCensus([
      { state: 'active', count: 2 },
      { state: 'idle', count: 5 },
      { state: null, count: 1 },
    ]);
    expect(census).toEqual({
      byState: { active: 2, idle: 5, unknown: 1 },
      total: 8,
      ceiling: POOLER_CLIENT_CEILING,
    });
  });
});

describe('parseSizeBytes', () => {
  it('parses the int8 string postgres-js hands back', () => {
    expect(parseSizeBytes([{ bytes: '10573491' }])).toBe(10573491);
  });

  it('tolerates an already-numeric driver', () => {
    expect(parseSizeBytes([{ bytes: 10573491 }])).toBe(10573491);
  });
});

describe('parsePgTimestamp', () => {
  it('normalizes the PG timestamptz string to an ISO string (spike-verified round-trip)', () => {
    expect(parsePgTimestamp('2026-10-06 09:05:17.721406+00')).toBe(
      '2026-10-06T09:05:17.721Z'
    );
  });
});

describe('mungeContentRow', () => {
  it('keeps the active count and normalizes last-updated', () => {
    expect(
      mungeContentRow('packages', [
        { active: 2, last_updated: '2026-10-06 09:05:17.721406+00' },
      ])
    ).toEqual({
      key: 'packages',
      activeCount: 2,
      lastUpdated: '2026-10-06T09:05:17.721Z',
    });
  });

  it('an empty table munges to zero-and-null (max() over no rows is null)', () => {
    expect(mungeContentRow('photos', [{ active: 0, last_updated: null }])).toEqual(
      { key: 'photos', activeCount: 0, lastUpdated: null }
    );
  });
});
```

- [ ] **Step 2: Run the suite red**

`pnpm build:packages` first (the admin test imports `@sevendays/db` from `dist/`), then `pnpm --filter @sevendays/admin test -- --run src/lib/metrics/db-probes.test.ts`. Expected: the file fails to resolve the named exports (red — the module does not exist yet). Record the red in the evidence dir.

- [ ] **Step 3: Write `packages/db/src/probes.ts`**

```ts
// The metrics probe module (#186, ADR-0023): the DB half of the admin's
// metrics seam. DB access goes through packages/db — the system-view SQL
// (pg_stat_activity, pg_database_size) has no schema table, so it ships as
// pinned static strings executed over the caller's client. Everything is
// deliberately drizzle-free at the seam: callers pass a structural `exec`
// (drizzle's db.execute satisfies it; tests pass fakes), so no drizzle
// type ever reaches apps/admin. Spike-proven 2026-10-06 against the compose
// db: execute returns the rows array; ::int parses as number, int8 as
// string; timestamptz as a PG string needing normalization.
export type SqlExec = (
  statement: string
) => Promise<Record<string, unknown>[]>;

// Supavisor's session-pooler client ceiling at Micro compute (the dev/studio
// plan) — a REFERENCE marker for the census widget, not a quota (research
// #174: ceilings are compute-tied and hard-coded).
export const POOLER_CLIENT_CEILING = 200;

export const PROBE_LATENCY_SQL = 'select 1';
export const PROBE_CENSUS_SQL =
  'select state, count(*)::int as count from pg_stat_activity where datname = current_database() group by state order by state';
export const PROBE_SIZE_SQL =
  'select pg_database_size(current_database()) as bytes';

export type ContentFamilyKey = 'packages' | 'addons' | 'photos' | 'testimonials';

export const CONTENT_CENSUS_SQL: Record<ContentFamilyKey, string> = {
  packages:
    'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from service_packages',
  addons:
    'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from addon_services',
  photos:
    'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from gallery_photos',
  testimonials:
    'select (count(*) filter (where is_active))::int as active, max(updated_at) as last_updated from testimonials',
};

export type PoolerCensus = {
  byState: Record<string, number>;
  total: number;
  ceiling: number;
};

export type SystemProbes = {
  latencyMs: number;
  census: PoolerCensus;
  sizeBytes: number;
};

export type ContentCensusRow = {
  key: ContentFamilyKey;
  activeCount: number;
  lastUpdated: string | null;
};

export type ContentCensus = ContentCensusRow[];

export function mungeCensus(
  rows: Record<string, unknown>[]
): PoolerCensus {
  const byState: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const state =
      typeof row.state === 'string' && row.state !== '' ? row.state : 'unknown';
    const count = Number(row.count);
    byState[state] = (byState[state] ?? 0) + count;
    total += count;
  }
  return { byState, total, ceiling: POOLER_CLIENT_CEILING };
}

export function parseSizeBytes(rows: Record<string, unknown>[]): number {
  return Number(rows[0]?.bytes);
}

export function parsePgTimestamp(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  // PG's timestamptz text form ("2026-10-06 09:05:17.721406+00") → ISO.
  const normalized = String(raw)
    .replace(' ', 'T')
    .replace(/\+00$/, '+00:00');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function mungeContentRow(
  key: ContentFamilyKey,
  rows: Record<string, unknown>[]
): ContentCensusRow {
  return {
    key,
    activeCount: Number(rows[0]?.active),
    lastUpdated: parsePgTimestamp(rows[0]?.last_updated),
  };
}

export async function runSystemProbes(exec: SqlExec): Promise<SystemProbes> {
  const start = performance.now();
  await exec(PROBE_LATENCY_SQL);
  const latencyMs = Math.round((performance.now() - start) * 10) / 10;
  const censusRows = await exec(PROBE_CENSUS_SQL);
  const sizeRows = await exec(PROBE_SIZE_SQL);
  return {
    latencyMs,
    census: mungeCensus(censusRows),
    sizeBytes: parseSizeBytes(sizeRows),
  };
}

export async function runContentCensus(exec: SqlExec): Promise<ContentCensus> {
  const keys = Object.keys(CONTENT_CENSUS_SQL) as ContentFamilyKey[];
  const rows = await Promise.all(
    keys.map((key) => exec(CONTENT_CENSUS_SQL[key]))
  );
  return keys.map((key, index) => mungeContentRow(key, rows[index]));
}
```

Then add the barrel export to `packages/db/src/index.ts` (below the existing line):

```ts
export * from './probes.js';
```

- [ ] **Step 4: Green + gates + commit**

`pnpm build:packages`, then `pnpm --filter @sevendays/admin test -- --run src/lib/metrics/db-probes.test.ts` (green — 10 tests), then `pnpm --filter @sevendays/db fix` and `pnpm --filter @sevendays/admin fix`, then `pnpm check` (35/35 expected; the api/landing/types suites are untouched). Commit:

```bash
git add packages/db/src/probes.ts packages/db/src/index.ts apps/admin/src/lib/metrics/db-probes.test.ts
git commit -m "feat(db): the metrics probe module — latency, pooler census, size, content census (#186)"
```

### Task 2: `apps/admin` — the env reader + the CF GraphQL client + munging (TDD)

**Files:**
- Create (test-first): `apps/admin/src/lib/metrics/env.test.ts`, `apps/admin/src/lib/metrics/cf.test.ts`
- Create: `apps/admin/src/lib/metrics/env.ts`, `apps/admin/src/lib/metrics/cf.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (the CF half is env-only).
- Produces (what Task 3's server fns consume): `MetricsResult<T>`, `MetricsEnv`, `CfAnalyticsConfig`, `PosthogConfig`, `readMetricsEnv(env?)`; `CF_GRAPHQL_URL`, `WORKER_INVOCATIONS_QUERY`, `METRICS_WINDOWS`, `MetricsWindow`, `metricsWindowSchema`, `windowToRange(window, now?)`, `InvocationsRow`, `WorkerSeries`, `WorkerMetrics`, `mungeWorkerSeries(scriptName, rows, window)`, `errorRate(series)`, `fetchWorkerMetrics(env, window, fetchImpl?)`. `POSTHOG_*` is read here but consumed by #187 — no HogQL code lands.

**Not here:** any HogQL/PostHog query (`$web_vitals`, pageviews — #187); any R2 dataset (`r2StorageAdaptiveGroups` — #187); server fns (Task 3); UI (Task 4).

- [ ] **Step 1: Write the failing tests**

Create `apps/admin/src/lib/metrics/env.test.ts`:

```ts
// The metrics env reader's contract (#186): tolerance. An unset source
// yields null for that source — the curated not-configured widget state —
// never a thrown env error. The spec-pinned three tokens plus the account
// id and the three script-name vars (the deployment-identity ruling).
import { describe, expect, it } from 'vitest';
import { readMetricsEnv } from './env';

const FULL = {
  CF_ANALYTICS_READ_TOKEN: 'cf-token',
  CLOUDFLARE_ACCOUNT_ID: 'account-id',
  CF_ANALYTICS_SCRIPT_API: 'sevendays-api',
  CF_ANALYTICS_SCRIPT_LANDING: 'sevendays-landing',
  CF_ANALYTICS_SCRIPT_ADMIN: 'sevendays-admin',
  POSTHOG_PERSONAL_API_KEY: 'ph-key',
  POSTHOG_PROJECT_ID: 'ph-project',
  DATABASE_URL: 'postgres://example',
};

describe('readMetricsEnv', () => {
  it('a fully configured deployment resolves every source', () => {
    expect(readMetricsEnv(FULL)).toEqual({
      cf: {
        token: 'cf-token',
        accountId: 'account-id',
        scripts: {
          api: 'sevendays-api',
          landing: 'sevendays-landing',
          admin: 'sevendays-admin',
        },
      },
      posthog: { personalApiKey: 'ph-key', projectId: 'ph-project' },
      dbUrl: 'postgres://example',
    });
  });

  it('a missing CF token nulls the whole CF source (partial never half-works)', () => {
    const env = readMetricsEnv({ ...FULL, CF_ANALYTICS_READ_TOKEN: '' });
    expect(env.cf).toBeNull();
    expect(env.posthog).not.toBeNull();
  });

  it('a missing account id nulls the CF source', () => {
    expect(readMetricsEnv({ ...FULL, CLOUDFLARE_ACCOUNT_ID: undefined }).cf).toBeNull();
  });

  it('one missing script name nulls the CF source (the widgets are a set)', () => {
    expect(
      readMetricsEnv({ ...FULL, CF_ANALYTICS_SCRIPT_LANDING: '  ' }).cf
    ).toBeNull();
  });

  it('a missing PostHog pair member nulls the posthog source', () => {
    expect(
      readMetricsEnv({ ...FULL, POSTHOG_PROJECT_ID: undefined }).posthog
    ).toBeNull();
  });

  it('an empty env is all-null (every widget renders its curated state)', () => {
    expect(readMetricsEnv({})).toEqual({ cf: null, posthog: null, dbUrl: null });
  });
});
```

Create `apps/admin/src/lib/metrics/cf.test.ts`:

```ts
// The CF GraphQL half of the metrics seam (#186): the pinned query shape
// (the tutorial-verbatim workersInvocationsAdaptive document), the fetch
// contract, the envelope + failure mapping, and the widget munging
// (bucketing, error rate, CPU µs→ms). Plain-node over stubbed fetch —
// no network, no browser (the admin lib-seam pattern).
import { describe, expect, it } from 'vitest';
import type { MetricsEnv } from './env';
import {
  CF_GRAPHQL_URL,
  METRICS_WINDOWS,
  WORKER_INVOCATIONS_QUERY,
  errorRate,
  fetchWorkerMetrics,
  mungeWorkerSeries,
  windowToRange,
} from './cf';

const ENV: MetricsEnv = {
  cf: {
    token: 'cf-token',
    accountId: 'account-id',
    scripts: {
      api: 'sevendays-api',
      landing: 'sevendays-landing',
      admin: 'sevendays-admin',
    },
  },
  posthog: null,
  dbUrl: null,
};

function row(
  datetime: string,
  sum: { requests: number; errors: number },
  cpu: { p50: number; p99: number }
) {
  return {
    dimensions: { datetime, scriptName: 'sevendays-api' },
    sum: { ...sum, subrequests: 0 },
    quantiles: { cpuTimeP50: cpu.p50, cpuTimeP99: cpu.p99 },
  };
}

describe('the pinned GraphQL document', () => {
  it('is the tutorial-verbatim account-level workersInvocationsAdaptive shape', () => {
    expect(WORKER_INVOCATIONS_QUERY).toBe(
      [
        'query WorkerInvocations($accountTag: string!, $scriptName: string!, $since: Time!, $until: Time!) {',
        '  viewer {',
        '    accounts(filter: {accountTag: $accountTag}) {',
        '      workersInvocationsAdaptive(',
        '        limit: 10000',
        '        filter: {scriptName: $scriptName, datetime_geq: $since, datetime_leq: $until}',
        '      ) {',
        '        dimensions { datetime scriptName }',
        '        sum { requests errors subrequests }',
        '        quantiles { cpuTimeP50 cpuTimeP99 }',
        '      }',
        '    }',
        '  }',
        '}',
      ].join('\n')
    );
  });
});

describe('windowToRange', () => {
  const now = new Date('2026-10-06T12:34:56.789Z');

  it('24h: since is exactly 24 hours before the ms-truncated until', () => {
    expect(windowToRange('24h', now)).toEqual({
      since: '2026-10-05T12:34:56.000Z',
      until: '2026-10-06T12:34:56.000Z',
    });
  });

  it('7d: seven days', () => {
    expect(windowToRange('7d', now).since).toBe('2026-09-29T12:34:56.000Z');
  });

  it('30d: thirty days, and the windows are exactly the pinned enum', () => {
    expect(windowToRange('30d', now).since).toBe('2026-09-06T12:34:56.000Z');
    expect(METRICS_WINDOWS).toEqual(['24h', '7d', '30d']);
  });
});

describe('mungeWorkerSeries', () => {
  it('buckets 7d rows by hour, summing requests/errors and max-ing the CPU quantiles', () => {
    const series = mungeWorkerSeries('sevendays-api', [
      row('2026-10-06T11:04:00Z', { requests: 10, errors: 1 }, { p50: 1000, p99: 9000 }),
      row('2026-10-06T11:41:00Z', { requests: 5, errors: 0 }, { p50: 2000, p99: 7000 }),
      row('2026-10-06T10:20:00Z', { requests: 2, errors: 2 }, { p50: 500, p99: 3000 }),
    ], '7d');
    expect(series.points).toHaveLength(2);
    const eleven = series.points.find((p) => p.bucketStart === '2026-10-06T11:00:00.000Z');
    expect(eleven).toMatchObject({ requests: 15, errors: 1, cpuTimeP50Us: 2000, cpuTimeP99Us: 9000 });
    expect(series.totals).toEqual({ requests: 17, errors: 3 });
  });

  it('buckets 30d rows by day', () => {
    const series = mungeWorkerSeries('sevendays-api', [
      row('2026-10-05T09:00:00Z', { requests: 4, errors: 0 }, { p50: 0, p99: 0 }),
      row('2026-10-05T21:00:00Z', { requests: 6, errors: 0 }, { p50: 0, p99: 0 }),
    ], '30d');
    expect(series.points).toHaveLength(1);
    expect(series.points[0]).toMatchObject({
      bucketStart: '2026-10-05T00:00:00.000Z',
      requests: 10,
    });
  });

  it('the CPU headline is the max across buckets, converted µs→ms at one decimal', () => {
    const series = mungeWorkerSeries('sevendays-api', [
      row('2026-10-06T11:00:00Z', { requests: 1, errors: 0 }, { p50: 1500, p99: 9000 }),
      row('2026-10-06T12:00:00Z', { requests: 1, errors: 0 }, { p50: 2500, p99: 4000 }),
    ], '24h');
    expect(series.cpu).toEqual({ p50MsMax: 2.5, p99MsMax: 9 });
  });

  it('an empty dataset munges to a zeroed series, not an error', () => {
    const series = mungeWorkerSeries('sevendays-api', [], '7d');
    expect(series.points).toEqual([]);
    expect(series.totals).toEqual({ requests: 0, errors: 0 });
    expect(series.cpu).toEqual({ p50MsMax: 0, p99MsMax: 0 });
  });
});

describe('errorRate', () => {
  it('is errors over requests with a zero-guard', () => {
    expect(errorRate({ totals: { requests: 200, errors: 1 } })).toBe(0.005);
    expect(errorRate({ totals: { requests: 0, errors: 0 } })).toBeNull();
  });
});

describe('fetchWorkerMetrics', () => {
  it('posts the pinned document with bearer auth, one fetch per script, and munges each', async () => {
    const calls: Array<{ url: unknown; init: RequestInit }> = [];
    const fetchImpl = async (url: unknown, init: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: true,
        json: async () => ({
          data: {
            viewer: {
              accounts: [
                {
                  workersInvocationsAdaptive: [
                    row('2026-10-06T11:00:00Z', { requests: 3, errors: 0 }, { p50: 0, p99: 0 }),
                  ],
                },
              ],
            },
          },
        }),
      };
    };
    const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.api.scriptName).toBe('sevendays-api');
    expect(result.data.landing.scriptName).toBe('sevendays-landing');
    expect(result.data.admin.scriptName).toBe('sevendays-admin');
    expect(calls).toHaveLength(3);
    const first = calls[0];
    expect(first.url).toBe(CF_GRAPHQL_URL);
    expect(new Headers(first.init.headers).get('authorization')).toBe('Bearer cf-token');
    const body = JSON.parse(String(first.init.body));
    expect(body.query).toBe(WORKER_INVOCATIONS_QUERY);
    expect(body.variables).toEqual({
      accountTag: 'account-id',
      scriptName: 'sevendays-api',
      since: windowToRange('7d').since,
      until: windowToRange('7d').until,
    });
  });

  it('an unconfigured CF source resolves not-configured (no fetch at all)', async () => {
    let fetched = 0;
    const fetchImpl = async () => {
      fetched += 1;
      throw new Error('must not be called');
    };
    const result = await fetchWorkerMetrics(
      { cf: null, posthog: null, dbUrl: null },
      '7d',
      fetchImpl as unknown as typeof fetch
    );
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetched).toBe(0);
  });

  it('a non-200 response maps to unavailable', async () => {
    const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({}) });
    const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a GraphQL errors array (HTTP 200) maps to unavailable — the loud detail is log-only', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ data: null, errors: [{ message: 'Unknown field' }] }),
    });
    const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a thrown fetch (network) maps to unavailable', async () => {
    const fetchImpl = async () => {
      throw new Error('network down');
    };
    const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});
```

- [ ] **Step 2: Run both files red**

`pnpm --filter @sevendays/admin test -- --run src/lib/metrics/env.test.ts src/lib/metrics/cf.test.ts` — both fail on the missing modules. Record the red.

- [ ] **Step 3: Write `apps/admin/src/lib/metrics/env.ts`**

```ts
// The metrics seam's env reader + result vocabulary (#186, ADR-0023).
// Tolerant by design: an unset source is null and its widgets render the
// curated "Analytics source not configured." state — never a thrown env
// error (the inverted #155: the sentinel became a curated state; the
// loud-fail getApiUrl pattern does not apply here). The spec pins the
// three token names; CLOUDFLARE_ACCOUNT_ID reuses the var the api
// already consumes on both CI legs; the CF_ANALYTICS_SCRIPT_* trio is the
// deployment-identity ruling (Worker names differ per edition, so they
// cannot be code constants).
export type MetricsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not-configured' | 'unavailable' };

export type CfAnalyticsConfig = {
  token: string;
  accountId: string;
  scripts: { api: string; landing: string; admin: string };
};

// Consumed by #187 (Traffic); read here so the seam's env surface lands
// whole with the tokens the ticket pins.
export type PosthogConfig = {
  personalApiKey: string;
  projectId: string;
};

export type MetricsEnv = {
  cf: CfAnalyticsConfig | null;
  posthog: PosthogConfig | null;
  dbUrl: string | null;
};

function readTrimmed(
  env: Record<string, string | undefined>,
  key: string
): string | null {
  const value = env[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function readMetricsEnv(
  env: Record<string, string | undefined> = process.env
): MetricsEnv {
  const token = readTrimmed(env, 'CF_ANALYTICS_READ_TOKEN');
  const accountId = readTrimmed(env, 'CLOUDFLARE_ACCOUNT_ID');
  const scriptApi = readTrimmed(env, 'CF_ANALYTICS_SCRIPT_API');
  const scriptLanding = readTrimmed(env, 'CF_ANALYTICS_SCRIPT_LANDING');
  const scriptAdmin = readTrimmed(env, 'CF_ANALYTICS_SCRIPT_ADMIN');
  const cf =
    token !== null &&
    accountId !== null &&
    scriptApi !== null &&
    scriptLanding !== null &&
    scriptAdmin !== null
      ? {
          token,
          accountId,
          scripts: { api: scriptApi, landing: scriptLanding, admin: scriptAdmin },
        }
      : null;
  const personalApiKey = readTrimmed(env, 'POSTHOG_PERSONAL_API_KEY');
  const projectId = readTrimmed(env, 'POSTHOG_PROJECT_ID');
  const posthog =
    personalApiKey !== null && projectId !== null
      ? { personalApiKey, projectId }
      : null;
  return { cf, posthog, dbUrl: readTrimmed(env, 'DATABASE_URL') };
}
```

- [ ] **Step 4: Write `apps/admin/src/lib/metrics/cf.ts`**

```ts
// The CF GraphQL Analytics client (#186, ADR-0023): ONE pinned
// workersInvocationsAdaptive document, three parallel scriptName-filtered
// fetches (api, landing, admin), envelope unwrap, and the widget munging.
// Document shape pinned from Cloudflare's "Query Workers invocation
// metrics via GraphQL" tutorial (account-level viewer/accounts; sum
// requests/errors/subrequests; quantiles cpuTimeP50/P99 in MICROSECONDS).
// If the live probe (Task 6) rejects the `Time!` scalar on the datetime
// variables, switch both to `string!` HERE and in the shape test — that
// is the one documented fallback, nothing else about the doc moves.
import { z } from 'zod';

import type { CfAnalyticsConfig, MetricsEnv, MetricsResult } from './env';

export const CF_GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

export const WORKER_INVOCATIONS_QUERY = `query WorkerInvocations($accountTag: string!, $scriptName: string!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      workersInvocationsAdaptive(
        limit: 10000
        filter: {scriptName: $scriptName, datetime_geq: $since, datetime_leq: $until}
      ) {
        dimensions { datetime scriptName }
        sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP99 }
      }
    }
  }
}`;

export const METRICS_WINDOWS = ['24h', '7d', '30d'] as const;
export type MetricsWindow = (typeof METRICS_WINDOWS)[number];

export const metricsWindowSchema = z.enum(METRICS_WINDOWS);

const WINDOW_MS: Record<MetricsWindow, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// Adaptive datasets coarsen their `datetime` granularity as data ages, so
// the range boundaries are ms-truncated ISO strings and the munging
// re-buckets client-side — the incoming granularity never matters.
export function windowToRange(
  window: MetricsWindow,
  now: Date = new Date()
): { since: string; until: string } {
  const untilMs = Math.floor(now.getTime() / 1000) * 1000;
  const sinceMs = untilMs - WINDOW_MS[window];
  return {
    since: new Date(sinceMs).toISOString(),
    until: new Date(untilMs).toISOString(),
  };
}

export type InvocationsRow = {
  dimensions: { datetime: string; scriptName: string };
  sum: { requests: number; errors: number; subrequests: number };
  quantiles: { cpuTimeP50: number; cpuTimeP99: number };
};

export type WorkerSeriesPoint = {
  bucketStart: string;
  requests: number;
  errors: number;
  cpuTimeP50Us: number;
  cpuTimeP99Us: number;
};

export type WorkerSeries = {
  scriptName: string;
  points: WorkerSeriesPoint[];
  totals: { requests: number; errors: number };
  cpu: { p50MsMax: number; p99MsMax: number };
};

export type WorkerMetrics = {
  api: WorkerSeries;
  landing: WorkerSeries;
  admin: WorkerSeries;
};

function bucketStart(iso: string, window: MetricsWindow): string {
  const date = new Date(iso);
  if (window === '30d') {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    ).toISOString();
  }
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours()
    )
  ).toISOString();
}

export function mungeWorkerSeries(
  scriptName: string,
  rows: InvocationsRow[],
  window: MetricsWindow
): WorkerSeries {
  const buckets = new Map<string, WorkerSeriesPoint>();
  const totals = { requests: 0, errors: 0 };
  let p50UsMax = 0;
  let p99UsMax = 0;
  for (const row of rows) {
    const key = bucketStart(row.dimensions.datetime, window);
    const bucket =
      buckets.get(key) ??
      ({
        bucketStart: key,
        requests: 0,
        errors: 0,
        cpuTimeP50Us: 0,
        cpuTimeP99Us: 0,
      } satisfies WorkerSeriesPoint);
    bucket.requests += row.sum.requests;
    bucket.errors += row.sum.errors;
    bucket.cpuTimeP50Us = Math.max(bucket.cpuTimeP50Us, row.quantiles.cpuTimeP50);
    bucket.cpuTimeP99Us = Math.max(bucket.cpuTimeP99Us, row.quantiles.cpuTimeP99);
    buckets.set(key, bucket);
    totals.requests += row.sum.requests;
    totals.errors += row.sum.errors;
    p50UsMax = Math.max(p50UsMax, row.quantiles.cpuTimeP50);
    p99UsMax = Math.max(p99UsMax, row.quantiles.cpuTimeP99);
  }
  return {
    scriptName,
    points: [...buckets.values()].sort((a, b) =>
      a.bucketStart.localeCompare(b.bucketStart)
    ),
    totals,
    cpu: {
      p50MsMax: Math.round((p50UsMax / 1000) * 10) / 10,
      p99MsMax: Math.round((p99UsMax / 1000) * 10) / 10,
    },
  };
}

export function errorRate(series: {
  totals: { requests: number; errors: number };
}): number | null {
  if (series.totals.requests <= 0) return null;
  return series.totals.errors / series.totals.requests;
}

async function fetchOneSeries(
  cf: CfAnalyticsConfig,
  scriptName: string,
  window: MetricsWindow,
  fetchImpl: typeof fetch
): Promise<WorkerSeries> {
  const { since, until } = windowToRange(window);
  const res = await fetchImpl(CF_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${cf.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: WORKER_INVOCATIONS_QUERY,
      variables: {
        accountTag: cf.accountId,
        scriptName,
        since,
        until,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: {
      viewer?: {
        accounts?: Array<{
          workersInvocationsAdaptive?: InvocationsRow[];
        }>;
      };
    };
    errors?: Array<{ message?: string }>;
  };
  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors[0]?.message ?? 'GraphQL error');
  }
  const rows =
    body.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
  return mungeWorkerSeries(scriptName, rows, window);
}

export async function fetchWorkerMetrics(
  env: MetricsEnv,
  window: MetricsWindow,
  fetchImpl: typeof fetch = fetch
): Promise<MetricsResult<WorkerMetrics>> {
  const cf = env.cf;
  if (cf === null) {
    return { ok: false, reason: 'not-configured' };
  }
  try {
    const [api, landing, admin] = await Promise.all([
      fetchOneSeries(cf, cf.scripts.api, window, fetchImpl),
      fetchOneSeries(cf, cf.scripts.landing, window, fetchImpl),
      fetchOneSeries(cf, cf.scripts.admin, window, fetchImpl),
    ]);
    return { ok: true, data: { api, landing, admin } };
  } catch (error) {
    // The loud detail stays log-only (#155): one line naming the source.
    console.error(
      '[metrics] CF GraphQL source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}
```

- [ ] **Step 5: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run src/lib/metrics` (Task 1's file stays green alongside), then `pnpm --filter @sevendays/admin fix`, then `pnpm check`. Admin floor now **9 files / 79 tests** (7/59 + 6 env + 14 cf). Commit:

```bash
git add apps/admin/src/lib/metrics/env.ts apps/admin/src/lib/metrics/env.test.ts apps/admin/src/lib/metrics/cf.ts apps/admin/src/lib/metrics/cf.test.ts
git commit -m "feat(admin): the CF GraphQL analytics client — query builders, munging, failure mapping (#186)"
```

### Task 3: `apps/admin` — the DB result-union wrapper, the session-gated server fns, the query factories (TDD)

**Files:**
- Modify (test-first): `apps/admin/src/lib/metrics/db-probes.test.ts` (+2 tests)
- Create (test-first): `apps/admin/src/lib/metrics-queries.test.ts`
- Create: `apps/admin/src/lib/metrics/db.ts`, `apps/admin/src/lib/metrics/metrics.functions.ts`, `apps/admin/src/lib/metrics-queries.ts`

**Interfaces:**
- Consumes: Task 1's probe module (`runSystemProbes`, `runContentCensus`, types) and Task 2's env/result vocabulary + `fetchWorkerMetrics`.
- Produces (what Task 4's screen consumes): `collectDbProbes(exec)`, `collectContentCensus(exec)` (result unions, log-only loud detail); server fns `fetchMetricsWorkers`, `fetchMetricsDbProbes`, `fetchMetricsContent` (each session-gated, startSpan-wrapped, RPC-serializable plain-object results); `metricsQueries.workers(window)` / `.dbProbes()` / `.content()` queryOptions factories with the spec's staleTimes.

**Not here:** UI (Task 4); the prototype route (Task 5); env/CI wiring (Task 6); any HogQL or R2 query (#187); any api change (the seam is admin-side by ADR-0023 — the API stays domain-pure, no metrics route joins `/api/v1`).

**Spike-proven test-graph fact (2026-10-06, spike files deleted): a plain-node admin test CAN import a module that calls `createServerFn` at module scope (module load is safe — 1 passed), but must NOT *call* the resulting fn directly (the RPC wrapper needs request context — fails).** The tests below assert option objects and wrappers, never invoke fns.

- [ ] **Step 1: Write the failing tests**

Append to `apps/admin/src/lib/metrics/db-probes.test.ts` (inside no new describe — two new describes after the existing ones; add `collectDbProbes` and `collectContentCensus` to the import list from `./db`):

```ts
describe('the result-union wrappers (the #155 class — failures resolve, never throw)', () => {
  it('collectDbProbes maps an exec failure to unavailable', async () => {
    const exec = async () => {
      throw new Error('connection refused');
    };
    expect(await collectDbProbes(exec)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('collectContentCensus passes a healthy exec through unmunged', async () => {
    const exec = async (statement: string) =>
      statement === CONTENT_CENSUS_SQL.packages
        ? [{ active: 2, last_updated: '2026-10-06 09:05:17.721406+00' }]
        : [{ active: 0, last_updated: null }];
    const result = await collectContentCensus(exec);
    expect(result).toEqual({
      ok: true,
      data: [
        { key: 'packages', activeCount: 2, lastUpdated: '2026-10-06T09:05:17.721Z' },
        { key: 'addons', activeCount: 0, lastUpdated: null },
        { key: 'photos', activeCount: 0, lastUpdated: null },
        { key: 'testimonials', activeCount: 0, lastUpdated: null },
      ],
    });
  });
});
```

(The import line becomes: `import { collectDbProbes, collectContentCensus } from './db';` beside the existing `@sevendays/db` import — `CONTENT_CENSUS_SQL` is already imported.)

Create `apps/admin/src/lib/metrics-queries.test.ts`:

```ts
// The dashboard's query-contract tests (#186): the spec's staleTimes
// (system 60s, content 5m), revalidate-on-focus stated explicitly, and
// window-keyed cache identity. Asserts the OPTIONS objects only — the
// server fns are never invoked from a plain-node test (the RPC wrapper
// needs request context; module import is safe, spike-proven).
import { describe, expect, it } from 'vitest';
import { metricsQueries } from './metrics-queries';

describe('metricsQueries (spec-verbatim caching posture)', () => {
  it('the system widgets stale at 60s and revalidate on focus', () => {
    expect(metricsQueries.workers('7d')).toMatchObject({
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    });
    expect(metricsQueries.dbProbes()).toMatchObject({
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    });
  });

  it('the content census stales at 5 minutes', () => {
    expect(metricsQueries.content()).toMatchObject({
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    });
  });

  it('the workers key carries the window (a toggle is a new cache entry)', () => {
    expect(metricsQueries.workers('24h').queryKey).toEqual([
      'metrics',
      'workers',
      '24h',
    ]);
    expect(metricsQueries.workers('7d').queryKey).not.toEqual(
      metricsQueries.workers('30d').queryKey
    );
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/admin test -- --run src/lib/metrics src/lib/metrics-queries.test.ts` — the new describes/files fail on missing modules.

- [ ] **Step 3: Write `apps/admin/src/lib/metrics/db.ts`**

```ts
// The DB half of the metrics seam (#186): result-union wrappers over
// packages/db's probe module. The exec passed in is the per-request
// drizzle client's bound execute (metrics.functions constructs the client
// per call — ADR-0011, the auth.ts pattern; never module scope). A probe
// failure resolves unavailable with one log-only loud line (#155).
import type {
  ContentCensus,
  SystemProbes,
} from '@sevendays/db';
import { runContentCensus, runSystemProbes } from '@sevendays/db';

import type { MetricsResult } from './env';

export type { ContentCensus, SystemProbes };

export async function collectDbProbes(
  exec: Parameters<typeof runSystemProbes>[0]
): Promise<MetricsResult<SystemProbes>> {
  try {
    return { ok: true, data: await runSystemProbes(exec) };
  } catch (error) {
    console.error(
      '[metrics] DB probe source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}

export async function collectContentCensus(
  exec: Parameters<typeof runContentCensus>[0]
): Promise<MetricsResult<ContentCensus>> {
  try {
    return { ok: true, data: await runContentCensus(exec) };
  } catch (error) {
    console.error(
      '[metrics] content census source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}
```

- [ ] **Step 4: Write `apps/admin/src/lib/metrics/metrics.functions.ts`**

```ts
// The metrics seam's server functions (#186, ADR-0023): the CF GraphQL
// client and the DB probes live ADMIN-SIDE — the api stays domain-pure,
// no metrics route joins /api/v1. Behind the seam's OWN session gate (the
// CMS write-fns discipline: server fns are directly callable, so they
// gate themselves — the ensureSession semantics hoisted into the seam).
// Results are plain-object unions so the RPC boundary serializes them
// without the #155 class-erasure problem. Sentry span per the house rule
// (no-op when Sentry is uninitialized — dev without VITE_SENTRY_DSN).
import { startSpan } from '@sentry/tanstackstart-react';
import { createServerFn, getRequestHeaders } from '@tanstack/react-start';
import { createDbClient } from '@sevendays/db';
import { z } from 'zod';

import { createAuth } from '../auth';
import { fetchWorkerMetrics, metricsWindowSchema } from './cf';
import { collectContentCensus, collectDbProbes } from './db';
import { readMetricsEnv } from './env';

async function requireMetricsSession(): Promise<void> {
  const session = await createAuth().api.getSession({
    headers: getRequestHeaders(),
  });
  if (!session) {
    throw new Error('Unauthorized');
  }
}

export const fetchMetricsWorkers = createServerFn({ method: 'GET' })
  .validator(z.object({ window: metricsWindowSchema }))
  .handler(async ({ data }) => {
    return startSpan({ name: 'metrics workers' }, async () => {
      await requireMetricsSession();
      return fetchWorkerMetrics(readMetricsEnv(), data.window);
    });
  });

export const fetchMetricsDbProbes = createServerFn({ method: 'GET' }).handler(
  async () => {
    return startSpan({ name: 'metrics db-probes' }, async () => {
      await requireMetricsSession();
      const env = readMetricsEnv();
      if (env.dbUrl === null) {
        return { ok: false as const, reason: 'not-configured' as const };
      }
      const db = createDbClient(env.dbUrl);
      return collectDbProbes(db.execute.bind(db));
    });
  }
);

export const fetchMetricsContent = createServerFn({ method: 'GET' }).handler(
  async () => {
    return startSpan({ name: 'metrics content' }, async () => {
      await requireMetricsSession();
      const env = readMetricsEnv();
      if (env.dbUrl === null) {
        return { ok: false as const, reason: 'not-configured' as const };
      }
      const db = createDbClient(env.dbUrl);
      return collectContentCensus(db.execute.bind(db));
    });
  }
);
```

- [ ] **Step 5: Write `apps/admin/src/lib/metrics-queries.ts`**

```ts
// The dashboard's query factories (#186): staleTime per the spec — system
// 60s, content 5m — revalidate on focus stated explicitly (the router's
// QueryClient leaves it on; the spec rules it, the factories say it), no
// polling. Manual refresh invalidates the ['metrics'] prefix. No
// server-side cache exists anywhere (single-viewer admin).
import { queryOptions } from '@tanstack/react-query';

import type { MetricsWindow } from './metrics/cf';
import {
  fetchMetricsContent,
  fetchMetricsDbProbes,
  fetchMetricsWorkers,
} from './metrics/metrics.functions';

export const metricsQueries = {
  workers: (window: MetricsWindow) =>
    queryOptions({
      queryKey: ['metrics', 'workers', window],
      queryFn: () => fetchMetricsWorkers({ data: { window } }),
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    }),
  dbProbes: () =>
    queryOptions({
      queryKey: ['metrics', 'db-probes'],
      queryFn: fetchMetricsDbProbes,
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    }),
  content: () =>
    queryOptions({
      queryKey: ['metrics', 'content'],
      queryFn: fetchMetricsContent,
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    }),
};
```

- [ ] **Step 6: Green + gates + commit**

`pnpm --filter @sevendays/admin test` (green — **11 files / 94 tests**), then `pnpm --filter @sevendays/admin fix`, then `pnpm check`. Commit:

```bash
git add apps/admin/src/lib/metrics/db.ts apps/admin/src/lib/metrics/metrics.functions.ts apps/admin/src/lib/metrics/db-probes.test.ts apps/admin/src/lib/metrics-queries.ts apps/admin/src/lib/metrics-queries.test.ts
git commit -m "feat(admin): the metrics seam — session-gated server fns + query factories (#186)"
```

### Task 4: `apps/admin` + `packages/ui` — the dashboard screen, the app-local charts, the `--chart-*` tokens, the #93 stub's death

**Skill set (AGENTS.md rule, loads at execution):** `prototype` + `ui-ux-pro-max`, plus `design-system` / `ui-styling` as relevant. The compositions below are the **provisional composition** — Task 5's owner reaction is the ratification gate and may adjust layout/chart mode/token values (never the curated lines' semantics, the data mapping, or the staleTimes).

**Files:**
- Create (generated + adapted app-local): `apps/admin/src/components/ui/chart.tsx` (the shadcn chart component)
- Create: `apps/admin/src/components/charts/trend-chart.tsx`, `apps/admin/src/components/charts/stat-card.tsx`
- Create: `apps/admin/src/components/dashboard/format.ts`, `apps/admin/src/components/dashboard/widget-frame.tsx`, `apps/admin/src/components/dashboard/window-toggle.tsx`, `apps/admin/src/components/dashboard/refresh-button.tsx`, `apps/admin/src/components/dashboard/system-health.tsx`, `apps/admin/src/components/dashboard/frontend-error-widget.tsx`, `apps/admin/src/components/dashboard/sentry-link.tsx`, `apps/admin/src/components/dashboard/content-census.tsx`
- Rewrite: `apps/admin/src/routes/_shell.index.tsx`
- Modify: `apps/admin/src/components/admin-sidebar.tsx`, `apps/admin/src/styles.css`, `apps/admin/package.json` (+ root `pnpm-lock.yaml` — the recharts pin), `packages/ui/src/tokens.css`

**Interfaces:**
- Consumes: Task 3's `metricsQueries` + the `MetricsResult` unions (`WorkerMetrics`, `SystemProbes`, `ContentCensus` types), `errorRate`, `METRICS_WINDOWS`.
- Produces: the dashboard at `/` (any staff session, any source health); the app-local chart vocabulary; the admin `@theme` `--chart-*` block; the tokens.css amendment recording the reversal. #187's Traffic/Storage sections compose into the same page later.

**Not here:** the variants route (Task 5, untracked); Traffic/Storage widgets (#187); the appointments stub and settings screens (untouched — `StubScreen` stays for them); any `packages/ui` component (the reversal rules charts admin-local — `packages/ui` gets ONLY the comment amendment).

- [ ] **Step 1: The `--chart-*` home — `apps/admin/src/styles.css`**

Append after the `@custom-variant dark` line (before the body styles):

```css
/* The #93 reversal made real (#186): data-viz tokens are ADMIN-LOCAL —
   the admin is data-viz's only consumer, so --chart-* lives here in the
   admin's @theme, not in packages/ui (whose header clause records the
   reversal). These feed the app-local shadcn chart component
   (ChartContainer themes by exactly this --chart-1..5 contract — the
   owner's 2026-10-06 ruling); values derive from the shared brand tokens
   (hexes/oklch stay canonical there); the vocabulary/count is ratified
   via the #186 rendered variants. Promotion to packages/ui reopens only
   if a second consumer appears (the spec's standing rule). */
@theme inline {
  --chart-1: var(--brand-primary); /* the primary series — requests, CPU */
  --chart-2: var(--destructive); /* errors — the warm signal */
  --chart-3: var(--brand-gray-mid); /* neutral/secondary series */
  --chart-4: var(--brand-500); /* the lighter petrol (ramp 500) */
  --chart-5: var(--brand-900); /* deepest petrol, emphasis */
  --chart-grid: var(--border); /* hairlines */
  --chart-text: var(--muted-foreground); /* axis + legend text */
}
```

- [ ] **Step 2: The tokens.css amendment — `packages/ui/src/tokens.css`**

In the header comment, replace the no-chart sentence (lines 8–10 of the current file) — change

```text
No --chart-* tokens ship
   (data-viz belongs to the v2 effort; #93 steering only).
```

to

```text
Data-viz tokens are admin-local (the #186
   reversal of #93's steering): --chart-* lives in apps/admin's @theme —
   promote to this shared file only if a second consumer appears.
```

(The following "Dark mode is parked…" sentence is untouched. The amendment deliberately drops the edition-vocabulary term — the v1 content-pass reads clean by construction.)

- [ ] **Step 3: The chart engine + vocabulary — the shadcn chart APP-LOCAL, then the trend/stat components**

**(a) Generate the shadcn chart component into `apps/admin` — not `packages/ui`.** The owner's ruling (2026-10-06): charts are the shadcn chart component (`ChartContainer` + recharts). The reversal rules it app-local, but the components.json trio's aliases route `shadcn add` output into `packages/ui` (ADR-0017) — exactly where charts must NOT go. Procedure:

1. From `apps/admin`: `pnpm dlx shadcn@latest add chart --path src/components/__scratch__ --yes` (a scratch destination; if the CLI refuses the path override beside the alias, generate wherever the alias points and MOVE the file — the destination is what matters).
2. Move the emitted `chart.tsx` to `apps/admin/src/components/ui/chart.tsx`; delete the scratch directory; `git status` must show **no `packages/ui` source change** (revert any stray file the CLI wrote there — the reversal holds).
3. Adapt the imports to the repo's conventions: `cn` comes from the `cn` package (`import { cn } from 'cn'` — the #102 consolidation); `lucide-react` and `recharts` imports stay as generated.
4. Add the engine at an exact pin: `pnpm --filter @sevendays/admin add recharts@<X.Y.Z>` where `<X.Y.Z>` is the version the registry just resolved (check the scratch file's import or the CLI output) — house style is exact pins (the `motion@13.4.2` precedent). Record the version in the commit body and the evidence dir.
5. `pnpm install` (repo root) to settle the lockfile.

**(b) `stat-card.tsx`** (no recharts involved):

```tsx
// The dashboard's stat card (#186): label + value + optional hint, on the
// shared Card primitive. App-local per the #93 reversal — data-viz has
// exactly one consumer (the admin dashboard) and no shared primitive is
// warranted for it.
import type { ReactNode } from 'react';

import { Card, CardContent } from '@sevendays/ui/components/card';

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className='p-4'>
        <p className='text-muted-foreground text-xs font-medium'>{label}</p>
        <p className='text-2xl font-semibold tabular-nums'>{value}</p>
        {hint ? <p className='text-muted-foreground text-xs'>{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
```

**(c) `trend-chart.tsx`** — the same props seam as the plan's components consume, implemented over the shadcn chart (bars for counts, a line for rates; animations OFF for deterministic SSR/hydration and CDP frames; the empty-window line stays):

```tsx
// The dashboard's trend chart (#186): the shadcn chart component
// (ChartContainer over recharts) — the owner's 2026-10-06 ruling —
// app-local per the #93 reversal. Colors come from the admin-local
// --chart-* tokens (the exact CSS-variable contract ChartContainer
// themes by). Animations are disabled: deterministic SSR/hydration and
// stable screenshot frames.
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart';

export type TrendDatum = { bucketStart: string; value: number };

export function TrendChart({
  data,
  variant = 'bars',
  color = 'var(--chart-1)',
  ariaLabel,
}: {
  data: TrendDatum[];
  variant?: 'bars' | 'line';
  color?: string;
  ariaLabel: string;
}) {
  if (data.length === 0) {
    return (
      <p className='text-muted-foreground h-16 text-xs'>No data in this window.</p>
    );
  }
  const config = { series: { label: ariaLabel, color } } satisfies ChartConfig;
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
      <XAxis dataKey='bucketStart' hide />
      <YAxis hide domain={[0, 'dataMax']} />
      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
    </>
  );
  return (
    <ChartContainer
      config={config}
      className='h-16 w-full'
      aria-label={`${ariaLabel} — latest ${String(data.at(-1)?.value ?? 0)}, peak ${String(Math.max(...data.map((datum) => datum.value)))}`}
    >
      {variant === 'bars' ? (
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          {axes}
          <Bar dataKey='value' fill={color} radius={2} isAnimationActive={false} />
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          {axes}
          <Line
            dataKey='value'
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </ChartContainer>
  );
}
```

(The exact shape of the generated `chart.tsx`'s exports — `ChartConfig`, `ChartTooltipContent`'s props — belongs to the registry version Step 3(a) pins; if that version's API differs from the calls above (e.g. `indicator`/`hideLabel` props), adapt the CALLS to the generated file, not the other way around — the registry file is vendored app-local and stays registry-faithful.)

- [ ] **Step 4: The widget chrome — `apps/admin/src/components/dashboard/`**

`format.ts`:

```ts
// Deterministic formatters for the dashboard (#186): every output is a
// pure function of its input so SSR and hydration render byte-identical
// strings (no locale-dependent Intl for dates, no relative "3h ago" —
// those would mismatch across the SSR/client boundary).
export function formatUtc(iso: string | null): string {
  if (iso === null) return '—';
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${unit === 0 ? String(value) : value.toFixed(1)} ${units[unit]}`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(2)}%`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en').format(value);
}
```

`widget-frame.tsx`:

```tsx
// The dashboard's widget chrome (#186): one Card per widget with a title,
// an optional window badge, and the CURATED failure states — the #155
// leak-safe pattern carried to the dashboard. A widget never throws, never
// bubbles: pending renders skeletons, a resolved not-ok result renders its
// pinned line, a thrown query error (the gate, or an SSR transport fault)
// folds to the unavailable line — the never-500 law, structurally.
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@sevendays/ui/components/card';
import { Skeleton } from '@sevendays/ui/components/skeleton';

export const NOT_CONFIGURED_LINE = 'Analytics source not configured.';
export const UNAVAILABLE_LINE = 'Analytics source unavailable.';

export type WidgetState = 'loading' | 'ready' | 'not-configured' | 'unavailable';

// isPending/isError come straight from useQuery; the result is the seam's
// MetricsResult union. A thrown error is deliberately indistinguishable
// from a resolved unavailable in the UI (the loud detail is log-only).
export function resolveWidgetState(
  isPending: boolean,
  isError: boolean,
  ok: boolean | undefined,
  reason: 'not-configured' | 'unavailable' | undefined
): WidgetState {
  if (isPending) return 'loading';
  if (isError) return 'unavailable';
  if (ok === undefined) return 'unavailable';
  return ok ? 'ready' : reason === 'not-configured' ? 'not-configured' : 'unavailable';
}

export function WidgetFrame({
  title,
  badge,
  state,
  children,
}: {
  title: string;
  badge?: string;
  state: WidgetState;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between gap-2'>
          <CardTitle className='text-sm font-medium'>{title}</CardTitle>
          {badge ? (
            <span className='text-muted-foreground text-xs'>{badge}</span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {state === 'loading' ? (
          <div className='space-y-2'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-16 w-full' />
          </div>
        ) : state === 'not-configured' ? (
          <p className='text-muted-foreground text-sm'>{NOT_CONFIGURED_LINE}</p>
        ) : state === 'unavailable' ? (
          <p className='text-muted-foreground text-sm'>{UNAVAILABLE_LINE}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
```

`window-toggle.tsx`:

```tsx
// The time-window toggle (#186): 24h/7d/30d as route search params
// (shareable, SSR-stable), 7d the spec's default. The DB-probe and Content
// widgets are point-in-time and windowless — the toggle visually scopes
// only the windowed widgets (each carries its own badge).
import { Link } from '@tanstack/react-router';

import type { MetricsWindow } from '#/lib/metrics/cf';

const WINDOWS: Array<{ value: MetricsWindow; label: string }> = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

export function WindowToggle({ window }: { window: MetricsWindow }) {
  return (
    <div
      role='group'
      aria-label='Time window'
      className='border-input bg-background inline-flex overflow-hidden rounded-lg border'
    >
      {WINDOWS.map(({ value, label }) => {
        const active = value === window;
        return (
          <Link
            key={value}
            to='/'
            search={{ window: value }}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium'
                : 'hover:bg-accent hover:text-accent-foreground px-3 py-1.5 text-xs'
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
```

`refresh-button.tsx`:

```tsx
// The manual refresh (#186): one button invalidating the ['metrics']
// prefix — every widget refetches (revalidate-on-focus is the passive
// path; this is the active one; there is no polling).
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { Button } from '@sevendays/ui/components/button';

export function RefreshButton() {
  const queryClient = useQueryClient();
  return (
    <Button
      variant='outline'
      size='sm'
      onClick={() => {
        void queryClient.invalidateQueries({ queryKey: ['metrics'] });
      }}
    >
      <RefreshCw aria-hidden />
      Refresh
    </Button>
  );
}
```

- [ ] **Step 5: The section compositions (provisional — Task 5 ratifies)**

`frontend-error-widget.tsx`:

```tsx
// One error-rate widget per frontend (#178's addition, landed at #186):
// the frontends' only countable server-error home — the same CF GraphQL
// source, the same workersInvocationsAdaptive shape, scoped to the
// frontend's own Worker name. It receives the already-fetched series from
// SystemHealth (one workers query = one cache entry, never three) plus
// the shared widget state, so an unavailable source still renders both
// widgets' frames with their curated lines.
import { errorRate } from '#/lib/metrics/cf';
import type { MetricsWindow, WorkerSeries } from '#/lib/metrics/cf';
import { formatCount, formatPercent } from './format';
import { TrendChart } from '../charts/trend-chart';
import { WidgetFrame, type WidgetState } from './widget-frame';

export function FrontendErrorWidget({
  window,
  app,
  series,
  state = 'ready',
}: {
  window: MetricsWindow;
  app: 'landing' | 'admin';
  series: WorkerSeries;
  state?: WidgetState;
}) {
  return (
    <WidgetFrame
      title={app === 'landing' ? 'Landing errors' : 'Admin errors'}
      badge={window}
      state={state}
    >
      <p className='text-2xl font-semibold tabular-nums'>
        {formatCount(series.totals.errors)}
      </p>
      <p className='text-muted-foreground text-xs'>
        {formatPercent(errorRate(series))} of {formatCount(series.totals.requests)} requests
      </p>
      <TrendChart
        ariaLabel={`Error count trend, ${app}`}
        color='var(--chart-2)'
        data={series.points.map((point) => ({
          bucketStart: point.bucketStart,
          value: point.errors,
        }))}
      />
    </WidgetFrame>
  );
}
```

`system-health.tsx`:

```tsx
// System Health (#186): the api's request/error-rate trends + CPU
// quantiles, the DB probes (latency, pooler census, size), the two
// per-frontend error widgets (#178), and the Sentry link-out — one
// workers query (shared cache with the Sentry + frontend widgets) + one
// probes query. Every widget folds to its curated state; the page never
// 500s.
import { useQuery } from '@tanstack/react-query';

import { errorRate } from '#/lib/metrics/cf';
import type { MetricsWindow, WorkerSeries } from '#/lib/metrics/cf';
import { metricsQueries } from '#/lib/metrics-queries';
import { TrendChart } from '../charts/trend-chart';
import { FrontendErrorWidget } from './frontend-error-widget';
import { SentryLinkWidget } from './sentry-link';
import { formatBytes, formatCount, formatPercent } from './format';
import { WidgetFrame, resolveWidgetState } from './widget-frame';

// The frontend widgets render their own curated states off the shared
// workersState; the empty series only satisfies the prop when not ready,
// so its numbers never paint.
const EMPTY_SERIES: WorkerSeries = {
  scriptName: '',
  points: [],
  totals: { requests: 0, errors: 0 },
  cpu: { p50MsMax: 0, p99MsMax: 0 },
};

export function SystemHealth({ window }: { window: MetricsWindow }) {
  const workers = useQuery(metricsQueries.workers(window));
  const workersState = resolveWidgetState(
    workers.isPending,
    workers.isError,
    workers.data?.ok,
    workers.data?.ok === false ? workers.data.reason : undefined
  );
  const probes = useQuery(metricsQueries.dbProbes());
  const probesState = resolveWidgetState(
    probes.isPending,
    probes.isError,
    probes.data?.ok,
    probes.data?.ok === false ? probes.data.reason : undefined
  );

  return (
    <section className='space-y-4' aria-label='System Health'>
      <h2 className='text-lg font-semibold tracking-tight'>System Health</h2>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <WidgetFrame title='API requests' badge={window} state={workersState}>
          {workers.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(workers.data.api.totals.requests)}
              </p>
              <TrendChart
                ariaLabel='API request trend'
                color='var(--chart-1)'
                data={workers.data.api.points.map((point) => ({
                  bucketStart: point.bucketStart,
                  value: point.requests,
                }))}
              />
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='API error rate' badge={window} state={workersState}>
          {workers.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatPercent(errorRate(workers.data.api))}
              </p>
              <p className='text-muted-foreground text-xs'>
                {formatCount(workers.data.api.totals.errors)} errors
              </p>
              <TrendChart
                ariaLabel='API error-rate trend'
                color='var(--chart-2)'
                variant='line'
                data={workers.data.api.points.map((point) => ({
                  bucketStart: point.bucketStart,
                  value: point.requests > 0 ? point.errors / point.requests : 0,
                }))}
              />
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='CPU time (max)' badge={window} state={workersState}>
          {workers.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {workers.data.api.cpu.p99MsMax} ms
              </p>
              <p className='text-muted-foreground text-xs'>
                p99 · p50 {workers.data.api.cpu.p50MsMax} ms
              </p>
            </>
          ) : null}
        </WidgetFrame>
        <SentryLinkWidget window={window} state={workersState} errors={
          workers.data?.ok ? workers.data.api.totals.errors : null
        } />
        <FrontendErrorWidget
          window={window}
          app='landing'
          series={workers.data?.ok ? workers.data.landing : EMPTY_SERIES}
          state={workersState === 'ready' ? 'ready' : workersState}
        />
        <FrontendErrorWidget
          window={window}
          app='admin'
          series={workers.data?.ok ? workers.data.admin : EMPTY_SERIES}
          state={workersState === 'ready' ? 'ready' : workersState}
        />
        <WidgetFrame title='DB latency' state={probesState}>
          {probes.data?.ok ? (
            <p className='text-2xl font-semibold tabular-nums'>
              {probes.data.latencyMs} ms
            </p>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='DB size' state={probesState}>
          {probes.data?.ok ? (
            <p className='text-2xl font-semibold tabular-nums'>
              {formatBytes(probes.data.sizeBytes)}
            </p>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Pooler connections' state={probesState}>
          {probes.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {probes.data.census.total} / {probes.data.census.ceiling}
              </p>
              <p className='text-muted-foreground text-xs'>
                {Object.entries(probes.data.census.byState)
                  .map(([state, count]) => `${state} ${count}`)
                  .join(' · ')}
              </p>
              <p className='text-muted-foreground text-xs'>
                Ceiling is the Micro-compute reference, not a quota.
              </p>
            </>
          ) : null}
        </WidgetFrame>
      </div>
    </section>
  );
}
```

(The provisional composition uses `WidgetFrame` throughout; `StatCard` exists for Task 5's ratified composition — if the ratification adopts it, the executor adds the import then. Biome's unused-import rule keeps this honest.)

`sentry-link.tsx`:

```tsx
// The Sentry link-out (#186, ADR-0023's source discipline): Sentry is
// capture-only — its query API is Team-gated — so this widget shows the
// count CF's sum.errors already gave us and LINKS to the console for
// drill-down. Never a rebuild. The URL is owner-ratified (2026-10-06,
// plan session): org slug sevendays-studio.
import type { MetricsWindow } from '#/lib/metrics/cf';
import { formatCount } from './format';
import { WidgetFrame, type WidgetState } from './widget-frame';

export const SENTRY_CONSOLE_URL = 'https://sevendays-studio.sentry.io/issues/';

export function SentryLinkWidget({
  window,
  state,
  errors,
}: {
  window: MetricsWindow;
  state: WidgetState;
  errors: number | null;
}) {
  return (
    <WidgetFrame title='Sentry' badge={window} state={state}>
      <p className='text-2xl font-semibold tabular-nums'>
        {errors === null ? '—' : formatCount(errors)}
      </p>
      <p className='text-muted-foreground text-xs'>errors captured, all apps</p>
      <a
        href={SENTRY_CONSOLE_URL}
        target='_blank'
        rel='noreferrer noopener'
        className='text-primary text-sm underline-offset-4 hover:underline'
      >
        Open Sentry console
      </a>
    </WidgetFrame>
  );
}
```

`content-census.tsx`:

```tsx
// Content (#186): entity counts (active rows) + last-updated (max
// updated_at over ALL rows — a deactivation is an update) per family.
// Point-in-time, windowless, staleTime 5m.
import { useQuery } from '@tanstack/react-query';

import type { ContentCensus } from '#/lib/metrics/db';
import { metricsQueries } from '#/lib/metrics-queries';
import { formatUtc } from './format';
import { WidgetFrame, resolveWidgetState } from './widget-frame';

const FAMILY_LABELS: Record<ContentCensus[number]['key'], string> = {
  packages: 'Packages',
  addons: 'Add-ons',
  photos: 'Gallery photos',
  testimonials: 'Testimonials',
};

export function ContentCensusSection() {
  const content = useQuery(metricsQueries.content());
  const state = resolveWidgetState(
    content.isPending,
    content.isError,
    content.data?.ok,
    content.data?.ok === false ? content.data.reason : undefined
  );
  return (
    <section className='space-y-4' aria-label='Content'>
      <h2 className='text-lg font-semibold tracking-tight'>Content</h2>
      <WidgetFrame title='Catalog + content census' state={state}>
        {content.data?.ok ? (
          <ul className='divide-y'>
            {content.data.data.map((family) => (
              <li
                key={family.key}
                className='flex items-center justify-between gap-4 py-2 text-sm'
              >
                <span>{FAMILY_LABELS[family.key]}</span>
                <span className='tabular-nums'>
                  {family.activeCount} active · updated {formatUtc(family.lastUpdated)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </WidgetFrame>
    </section>
  );
}
```

- [ ] **Step 6: The route — `apps/admin/src/routes/_shell.index.tsx` (full rewrite)**

```tsx
// The Analytics Dashboard (#186, ADR-0023): the admin's landing screen —
// the #93 Dashboard stub dies here (the appointments stub at
// /appointments stays; it is v2 payload). Any staff session sees it; every
// source failure renders its widget's curated state; the page never 500s.
// The window is a search param (shareable, SSR-stable); Traffic and
// Storage & Media (#187) compose into this same page later.
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { PageHeader } from '#/components/cms/shared';
import { ContentCensusSection } from '#/components/dashboard/content-census';
import { RefreshButton } from '#/components/dashboard/refresh-button';
import { SystemHealth } from '#/components/dashboard/system-health';
import { WindowToggle } from '#/components/dashboard/window-toggle';
import { metricsWindowSchema } from '#/lib/metrics/cf';

const analyticsSearchSchema = z.object({
  window: metricsWindowSchema.default('7d'),
});

export const Route = createFileRoute('/_shell/')({
  validateSearch: analyticsSearchSchema,
  head: () => ({ meta: [{ title: 'Analytics | Sevendays Admin' }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { window } = Route.useSearch();
  return (
    <div className='space-y-8'>
      <PageHeader
        title='Analytics'
        subline='System health, database, and content at a glance.'
        actions={
          <>
            <WindowToggle window={window} />
            <RefreshButton />
          </>
        }
      />
      <SystemHealth window={window} />
      <ContentCensusSection />
    </div>
  );
}
```

- [ ] **Step 7: The sidebar — `apps/admin/src/components/admin-sidebar.tsx`**

Two edits. First, the lucide import block — replace `LayoutDashboard,` with `Activity,` (alphabetical: `Activity` sorts before `CalendarDays`, so it becomes the list's first entry). Second, the comment + the Overview item — change

```tsx
// The ruled taxonomy (#59), icons carried from the prototype unchanged.
// Overview is wholly future scope — both destinations are later-milestone
// stubs; Catalog and Studio carry the live CMS surfaces.
const navGroups: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
```

to

```tsx
// The ruled taxonomy (#59), icons carried from the prototype unchanged.
// Overview carries the Analytics dashboard (#186 — the #93 stub's
// replacement); Appointments stays the v2 teaser stub; Catalog and Studio
// carry the live CMS surfaces.
const navGroups: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Analytics', icon: Activity },
      { to: '/appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
```

(`NavTo` needs no change on main — `'/'` and `'/appointments'` are both already in the union.)

- [ ] **Step 8: Gates + commit**

`pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/ui fix`, then `pnpm check` (35/35; suites unchanged — **11 files / 94 tests**; biome does not lint the generated `chart.tsx`'s registry style beyond the import adaptation — if `fix` rewrites it, accept), then `pnpm build` (the SSR build proves the route + components compile into the Worker bundle). Commit (the commit body records the recharts version Step 3(a) pinned):

```bash
git add apps/admin/src/styles.css apps/admin/src/routes/_shell.index.tsx apps/admin/src/components/admin-sidebar.tsx apps/admin/src/components/ui/chart.tsx apps/admin/src/components/charts apps/admin/src/components/dashboard apps/admin/package.json pnpm-lock.yaml packages/ui/src/tokens.css
git commit -m "feat(admin): the Analytics Dashboard screen — System Health, Content, the Sentry link-out (#186)" -m "Chart engine: the shadcn chart component vendored app-local (the #93 reversal holds — nothing in packages/ui); recharts pinned at <X.Y.Z> per the owner's 2026-10-06 ruling."
```

### Task 5: The rendered variants — the owner's ratification gate

**Skill set:** `prototype` (the rendering discipline) — loaded at execution. This task is the spec's "Owner-reacted rendered variants" acceptance criterion; the M5 pattern (#131/#139/#140/#141): compositions rendered as frames over mock data, the owner reacts, the ratified composition lands.

**Files:**
- Create (UNTRACKED — never committed, deleted at Step 5): `apps/admin/src/routes/prototype-dashboard.tsx`
- Evidence: `.superpowers/sdd/2026-10-06-186-metrics-seam-dashboard-system-half/variants/*.png`

**Not here:** any committed change in this task (the only durable outputs are the applied adjustments to Task 4's files and the issue comment); Traffic/Storage variants (#187 renders its own when its widgets exist).

- [ ] **Step 1: The prototype route (ungated, mock data — the prototype-tokens precedent)**

Create `apps/admin/src/routes/prototype-dashboard.tsx` — a TOP-LEVEL route (outside `_shell`, so no session gate and `playwright screenshot` can reach it), rendering the three composition candidates over inline mock data plus the two vocabulary strips. Full file:

```tsx
// PROTOTYPE ONLY (#186 Task 5) — untracked, deleted before the PR. The
// owner-reacted rendered variants: three dashboard compositions over mock
// data (no server fns, no env, no gate — the prototype-tokens precedent).
import { createFileRoute } from '@tanstack/react-router';

import { StatCard } from '#/components/charts/stat-card';
import { TrendChart } from '#/components/charts/trend-chart';
import { WidgetFrame } from '#/components/dashboard/widget-frame';
import type { WorkerSeries } from '#/lib/metrics/cf';

export const Route = createFileRoute('/prototype-dashboard')({
  head: () => ({ meta: [{ title: 'Dashboard variants | prototype' }] }),
  component: PrototypeDashboardPage,
});

const SERIES: WorkerSeries = {
  scriptName: 'sevendays-api',
  points: Array.from({ length: 24 }, (_, hour) => ({
    bucketStart: `2026-10-0${hour < 12 ? 5 : 6}T${String(hour % 24).padStart(2, '0')}:00:00.000Z`,
    requests: 40 + Math.round(60 * Math.abs(Math.sin(hour / 3))),
    errors: hour % 7 === 0 ? 2 : 0,
    cpuTimeP50Us: 1200 + hour * 20,
    cpuTimeP99Us: 8000 + hour * 90,
  })),
  totals: { requests: 2418, errors: 8 },
  cpu: { p50MsMax: 1.7, p99MsMax: 10.1 },
};

function SectionHeading({ children }: { children: string }) {
  return <h2 className='mt-10 mb-3 text-lg font-semibold'>{children}</h2>;
}

function PrototypeDashboardPage() {
  return (
    <main className='mx-auto max-w-5xl space-y-4 p-6'>
      <h1 className='text-2xl font-semibold'>#186 dashboard variants</h1>

      <SectionHeading>Variant A — chart-led (Task 4's provisional composition)</SectionHeading>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <WidgetFrame title='API requests' badge='7 days' state='ready'>
          <p className='text-2xl font-semibold tabular-nums'>2,418</p>
          <TrendChart
            ariaLabel='API request trend'
            data={SERIES.points.map((p) => ({ bucketStart: p.bucketStart, value: p.requests }))}
          />
        </WidgetFrame>
        <WidgetFrame title='API error rate' badge='7 days' state='ready'>
          <p className='text-2xl font-semibold tabular-nums'>0.33%</p>
          <TrendChart
            ariaLabel='API error-rate trend'
            color='var(--chart-2)'
            variant='line'
            data={SERIES.points.map((p) => ({
              bucketStart: p.bucketStart,
              value: p.requests > 0 ? p.errors / p.requests : 0,
            }))}
          />
        </WidgetFrame>
        <WidgetFrame title='Landing errors' badge='7 days' state='ready'>
          <p className='text-2xl font-semibold tabular-nums'>3</p>
          <TrendChart
            ariaLabel='Landing error trend'
            color='var(--chart-2)'
            data={SERIES.points.map((p) => ({ bucketStart: p.bucketStart, value: p.errors }))}
          />
        </WidgetFrame>
        <WidgetFrame title='Sentry' badge='7 days' state='ready'>
          <p className='text-2xl font-semibold tabular-nums'>8</p>
          <p className='text-muted-foreground text-xs'>errors captured, all apps</p>
          <a href='https://sevendays-studio.sentry.io/issues/' className='text-primary text-sm underline-offset-4 hover:underline'>
            Open Sentry console
          </a>
        </WidgetFrame>
        <WidgetFrame title='DB latency' state='ready'>
          <p className='text-2xl font-semibold tabular-nums'>1.8 ms</p>
        </WidgetFrame>
        <WidgetFrame title='DB size' state='ready'>
          <p className='text-2xl font-semibold tabular-nums'>10.6 MB</p>
        </WidgetFrame>
        <WidgetFrame title='Pooler connections' state='ready'>
          <p className='text-2xl font-semibold tabular-nums'>8 / 200</p>
          <p className='text-muted-foreground text-xs'>active 2 · idle 5 · unknown 1</p>
        </WidgetFrame>
        <WidgetFrame title='Content census' state='ready'>
          <ul className='divide-y text-sm'>
            {['Packages — 6 active · updated 2026-10-06 09:05', 'Add-ons — 4 active · updated 2026-10-05 22:11', 'Gallery photos — 0 active · updated —', 'Testimonials — 0 active · updated —'].map((line) => (
              <li key={line} className='py-1.5'>{line}</li>
            ))}
          </ul>
        </WidgetFrame>
      </div>

      <SectionHeading>Variant B — stat-led (stat cards first, one wide trend row)</SectionHeading>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='API requests (7 days)' value='2,418' />
        <StatCard label='API error rate' value='0.33%' hint='8 errors' />
        <StatCard label='CPU p99 max' value='10.1 ms' hint='p50 1.7 ms' />
        <StatCard label='DB latency / size' value='1.8 ms' hint='10.6 MB' />
      </div>
      <div className='grid gap-4 lg:grid-cols-2'>
        <WidgetFrame title='Requests + errors, 7 days' state='ready'>
          <TrendChart
            ariaLabel='Requests trend'
            data={SERIES.points.map((p) => ({ bucketStart: p.bucketStart, value: p.requests }))}
          />
          <TrendChart
            ariaLabel='Errors trend'
            color='var(--chart-2)'
            data={SERIES.points.map((p) => ({ bucketStart: p.bucketStart, value: p.errors * 20 }))}
          />
        </WidgetFrame>
        <WidgetFrame title='Content + DB (the quiet half)' state='ready'>
          <ul className='divide-y text-sm'>
            {['Packages — 6 active · updated 2026-10-06 09:05', 'Add-ons — 4 active · updated 2026-10-05 22:11', 'Pooler — 8 / 200 (active 2 · idle 5 · unknown 1)'].map((line) => (
              <li key={line} className='py-1.5'>{line}</li>
            ))}
          </ul>
        </WidgetFrame>
      </div>

      <SectionHeading>Variant C — A's grid with the curated + loading states shown (failure rehearsal)</SectionHeading>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <WidgetFrame title='API requests' badge='7 days' state='not-configured' />
        <WidgetFrame title='API error rate' badge='7 days' state='unavailable' />
        <WidgetFrame title='DB latency' state='loading' />
        <WidgetFrame title='Pooler connections' state='unavailable' />
      </div>

      <SectionHeading>Chart vocabulary strip — bars vs line, and the --chart-* series</SectionHeading>
      <div className='grid gap-4 lg:grid-cols-2'>
        <WidgetFrame title='Bars (counts)' state='ready'>
          <TrendChart ariaLabel='Bars demo' data={SERIES.points.map((p) => ({ bucketStart: p.bucketStart, value: p.requests }))} />
        </WidgetFrame>
        <WidgetFrame title='Line (rates)' state='ready'>
          <TrendChart ariaLabel='Line demo' color='var(--chart-4)' variant='line' data={SERIES.points.map((p) => ({ bucketStart: p.bucketStart, value: p.requests }))} />
        </WidgetFrame>
      </div>
      <div className='flex flex-wrap gap-2 pt-2'>
        {['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'].map((token) => (
          <div key={token} className='flex items-center gap-2 rounded-lg border p-2 text-xs'>
            <span className='inline-block h-4 w-8 rounded' style={{ background: `var(${token})` }} />
            {token}
          </div>
        ))}
      </div>
    </main>
  );
}
```

(The `routeTree.gen.ts` regen this route triggers is EXPECTED and LOCAL ONLY — the file is untracked and deleted in Step 5; after deletion, `git checkout -- src/routeTree.gen.ts` restores the committed tree byte-identically. Nothing routeTree-shaped ever reaches the PR.)

- [ ] **Step 2: Render + frame**

With the dev server up (`pnpm --filter @sevendays/admin dev`, port 3000), frame all variants (chromium from #189's foundation — `pnpm exec playwright install chromium` once if missing):

```bash
mkdir -p .superpowers/sdd/2026-10-06-186-metrics-seam-dashboard-system-half/variants
pnpm exec playwright screenshot --viewport-size=1280,2400 http://localhost:3000/prototype-dashboard .superpowers/sdd/2026-10-06-186-metrics-seam-dashboard-system-half/variants/variants-desktop.png
pnpm exec playwright screenshot --viewport-size=390,2400 http://localhost:3000/prototype-dashboard .superpowers/sdd/2026-10-06-186-metrics-seam-dashboard-system-half/variants/variants-mobile.png
```

- [ ] **Step 3: The owner's reaction (the gate)**

Post the decision request on #186 (the frames stay local — the repo is public and GitHub has no scriptable issue-image upload; the #139 evidence precedent; the owner has the checkout):

```bash
gh issue comment 186 --body "Rendered variants for the dashboard are up (Task 5): .superpowers/sdd/2026-10-06-186-metrics-seam-dashboard-system-half/variants/ in the working checkout — run \`pnpm --filter @sevendays/admin dev\` and open http://localhost:3000/prototype-dashboard to react live. Decisions requested: (1) composition — A chart-led / B stat-led / a mix; (2) chart modes — bars for counts + line for rates, or one mode; (3) the --chart-* strip — keep the five derived values or adjust; (4) the Sentry link-out URL (pinned https://sevendays-studio.sentry.io/issues/ per your 2026-10-06 ruling — flag here if it should differ); (5) any copy nits. React here; the ratified composition then lands and this prototype route is deleted."
```

The executor applies the owner's ruling to Task 4's files (composition/chart/token-value adjustments — the curated lines' semantics, the data mapping, and the staleTimes are NOT variant-adjustable). If the owner's reaction names Sentry URL corrections, fix the one constant. Then:

- [ ] **Step 4: `pnpm check` re-run** (the adjustments keep it green — **11 files / 94 tests**).

- [ ] **Step 5: Delete the prototype + restore the tree**

```bash
rm apps/admin/src/routes/prototype-dashboard.tsx
git checkout -- apps/admin/src/routeTree.gen.ts
git status --short   # expects: nothing outside the known-modified Task 4 files
```

No commit exists for this task by design (the applied adjustments amend Task 4's commit files — stage and commit them as the ratification commit):

```bash
git add apps/admin packages/ui
git commit -m "feat(admin): the owner-ratified dashboard composition — variants reacted (#186)"
```

(If the owner's reaction arrives after the PR opens, the same adjustment lands as a PR commit before merge — the PR body names the variants evidence; the merge gate includes the reaction.)

### Task 6: The env + CI wiring — the three tokens, the script vars, observability on

**Files:**
- Modify: `apps/admin/.env.example`, `apps/admin/wrangler.jsonc`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the env names Task 2's reader consumes.
- Produces: the deployed teaser admin Worker with the three secrets (once the owner mints them) + the account/script vars + Workers Logs retention; the same wiring on the v1 leg (values arrive at cutover per the spec).

**Not here:** the v1 CI environment's secret VALUES (ship-day, #191's runbook owns the swap); any api/landing wrangler or CI change; `.dev.vars` (dev uses `.env.local` via the dev script's dotenv — document, don't create).

- [ ] **Step 1: `.env.example` — document the five new names**

Append to `apps/admin/.env.example`:

```bash
# The metrics seam (#186, ADR-0023) — the Analytics Dashboard's sources.
# All five are optional-by-design: missing = that widget's curated
# "Analytics source not configured." state, never a crash.
# Dev values live in .env.local (this file documents names only).
# Prod: secrets/vars on the admin Worker via ci.yml.

# Cloudflare Analytics:Read token (Account Analytics:Read permission,
# minted in the dev CF account) — the workersInvocationsAdaptive source.
CF_ANALYTICS_READ_TOKEN=

# The GraphQL scope + the three Workers the dashboard watches (NOT
# secrets — deployment identity; passed as --vars at deploy, per-edition
# values in ci.yml: sevendays-* on teaser, sevendays-v1-* on v1).
CLOUDFLARE_ACCOUNT_ID=
CF_ANALYTICS_SCRIPT_API=
CF_ANALYTICS_SCRIPT_LANDING=
CF_ANALYTICS_SCRIPT_ADMIN=

# PostHog server-side query credentials (#187's Traffic section consumes
# these; the seam reads them now so the env surface lands whole).
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=
```

- [ ] **Step 2: `apps/admin/wrangler.jsonc` — Workers Logs on**

Add the observability block (the api's #183 pattern, JSON form) after the `services` line — the metrics seam's log-only loud detail needs retention to be quotable:

```jsonc
  // The metrics seam's failure detail lands on console.error (#186) —
  // Workers Logs retains it (3-day, free tier; wrangler tail is live).
  "observability": { "enabled": true }
```

(An inline `//` comment is legal in wrangler.jsonc — the file's `$schema`-documented format. If wrangler rejects it, move the comment above the block.)

- [ ] **Step 3: ci.yml — the teaser leg**

Three edits to the `deploy-teaser` job. First, the env block (after the `VITE_SENTRY_ENVIRONMENT: teaser` line):

```yaml
      CF_ANALYTICS_READ_TOKEN: ${{ secrets.CF_ANALYTICS_READ_TOKEN }}
      POSTHOG_PERSONAL_API_KEY: ${{ secrets.POSTHOG_PERSONAL_API_KEY }}
      POSTHOG_PROJECT_ID: ${{ secrets.POSTHOG_PROJECT_ID }}
```

Second, the admin deploy step gains the script-name vars:

```yaml
      - name: Deploy admin (sevendays-admin)
        working-directory: apps/admin
        run: pnpm exec wrangler deploy --name sevendays-admin --var "API_URL:$API_URL" --var "BETTER_AUTH_URL:$BETTER_AUTH_URL" --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "CF_ANALYTICS_SCRIPT_API:sevendays-api" --var "CF_ANALYTICS_SCRIPT_LANDING:sevendays-landing" --var "CF_ANALYTICS_SCRIPT_ADMIN:sevendays-admin"
```

Third, after the existing admin `DATABASE_URL` sync step, the fail-soft token sync (the R2/SENTRY_DSN pattern — the curated not-configured states are the designed interim):

```yaml
      - name: Sync admin analytics secrets (skip until the owner mints them)
        working-directory: apps/admin
        run: |
          if [ -z "$CF_ANALYTICS_READ_TOKEN" ]; then
            echo '::notice::CF_ANALYTICS_READ_TOKEN missing from the teaser GitHub environment — System Health renders its curated not-configured state (M6 #186)'
            exit 0
          fi
          printf '%s' "$CF_ANALYTICS_READ_TOKEN" | pnpm exec wrangler secret put CF_ANALYTICS_READ_TOKEN --name sevendays-admin
          if [ -n "$POSTHOG_PERSONAL_API_KEY" ] && [ -n "$POSTHOG_PROJECT_ID" ]; then
            printf '%s' "$POSTHOG_PERSONAL_API_KEY" | pnpm exec wrangler secret put POSTHOG_PERSONAL_API_KEY --name sevendays-admin
            printf '%s' "$POSTHOG_PROJECT_ID" | pnpm exec wrangler secret put POSTHOG_PROJECT_ID --name sevendays-admin
          else
            echo '::notice::PostHog pair missing from the teaser GitHub environment — Traffic lands with #187; put both then.'
          fi
```

- [ ] **Step 4: ci.yml — the v1 leg mirrors (its own names)**

The same three edits in `deploy-v1`: the same env additions; the admin deploy step with the v1 script names —

```yaml
      - name: Deploy admin (sevendays-v1-admin)
        working-directory: apps/admin
        run: pnpm exec wrangler deploy --name sevendays-v1-admin --var "API_URL:$API_URL" --var "BETTER_AUTH_URL:$BETTER_AUTH_URL" --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "CF_ANALYTICS_SCRIPT_API:sevendays-v1-api" --var "CF_ANALYTICS_SCRIPT_LANDING:sevendays-v1-landing" --var "CF_ANALYTICS_SCRIPT_ADMIN:sevendays-v1-admin"
```

— and the same fail-soft sync step targeting `--name sevendays-v1-admin` (notice text naming the v1 environment; the values themselves arrive at ship per the spec — until then v1's dashboard serves the curated states, by design).

- [ ] **Step 5: The owner's dev-token handoff (the R2-pattern handoff)**

Post on #186 (owner-operated; nothing blocks this PR — the fail-soft steps ARE the interim):

```bash
gh issue comment 186 --body "Owner handoff to light System Health up on teaser (dev-account values per the spec): (1) mint a CF API token with **Account Analytics:Read** on the dev account; (2) mint a PostHog **personal API key** (query:read) + note the project id; (3) set teaser GitHub-environment secrets: CF_ANALYTICS_READ_TOKEN, POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID (CLOUDFLARE_ACCOUNT_ID is already a teaser variable); (4) local dev: the same CF values into apps/admin/.env.local. Until then the dashboard serves its curated not-configured states — the deploy notices name the gap on every run. docs/ship-provisioning-runbook.md (#191) owns the production swap."
```

- [ ] **Step 6: The live probe (when the dev token exists locally)**

If `apps/admin/.env.local` carries `CF_ANALYTICS_READ_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` at this point, run the one-off probe (evidence dir, deleted after) proving the pinned document against the real endpoint:

```bash
node --env-file=apps/admin/.env.local -e '
const query = `query WorkerInvocations($accountTag: string!, $scriptName: string!, $since: Time!, $until: Time!) {\n  viewer {\n    accounts(filter: {accountTag: $accountTag}) {\n      workersInvocationsAdaptive(\n        limit: 10000\n        filter: {scriptName: $scriptName, datetime_geq: $since, datetime_leq: $until}\n      ) {\n        dimensions { datetime scriptName }\n        sum { requests errors subrequests }\n        quantiles { cpuTimeP50 cpuTimeP99 }\n      }\n    }\n  }\n}`;
const until = new Date(Math.floor(Date.now() / 1000) * 1000);
const since = new Date(until.getTime() - 7 * 24 * 3600 * 1000);
const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.CF_ANALYTICS_READ_TOKEN}`, "content-type": "application/json" },
  body: JSON.stringify({ query, variables: { accountTag: process.env.CLOUDFLARE_ACCOUNT_ID, scriptName: "sevendays-api", since: since.toISOString(), until: until.toISOString() } }),
});
console.log("status:", res.status);
console.log(JSON.stringify(await res.json(), null, 2).slice(0, 2000));
' 
```

Expected: HTTP 200 with a `data.viewer.accounts[0].workersInvocationsAdaptive` array (possibly empty on a quiet dev account — the shape is what is proven). **If the response's `errors` names the `Time!` scalar** (validation error on `$since`/`$until`), apply the documented fallback: switch both `Time!` to `string!` in `WORKER_INVOCATIONS_QUERY` AND in the cf.test.ts shape assertion, re-run the admin suite, and note the change in the PR body. If the token does not exist yet, record "live probe deferred — no dev token minted" in the evidence dir and proceed (the curated states + fallback note carry the risk).

- [ ] **Step 7: Gates + commit**

`pnpm --filter @sevendays/admin fix`, `pnpm check` (35/35 — CI YAML is not biome-checked; eyeball the indent against the neighboring steps). Commit:

```bash
git add apps/admin/.env.example apps/admin/wrangler.jsonc .github/workflows/ci.yml
git commit -m "feat(admin): the metrics env + CI wiring — the three tokens, script vars, observability on (#186)"
```

### Task 7: Gates, docs rotation, PR/merge, the v1 SPLIT (with the ruled divergence), ledger, issue close

**Files:**
- Modify: `docs/plan.md` (M6 box 5 — ANNOTATED, not ticked), `docs/progress.md`, `AGENTS.md` (admin suite bullet + status bullet), `docs/agents/v1-picks.md` (ledger row, post-merge)

**Interfaces:**
- Consumes: Tasks 1–6 merged on the branch (+ Task 5's owner reaction recorded on the issue).
- Produces: main carrying the metrics seam + the dashboard's system half; the v1 split executed + ledgered (the #168 reversal reversed on v1); issue #186 closed (which unblocks #187 and half of #190's dependency on #186).

**Not here:** Traffic + Storage & Media and their roadmap tick (#187); the Audit Log viewer (#188); the smoke (#190); the runbook (#191); the M6 close (#192).

- [ ] **Step 1: Full repo gates**

`docker compose up -d db`, then `pnpm check` then `pnpm build`. Expected: check 35/35 turbo tasks; build green. Floors: **admin 11 files / 94 tests** (the ticket's lib-seam coverage: query shapes + widget munging + failure states), api 27 files + 1 skipped / 338 passed + 3 skipped, api-client 5 files / 33 tests, landing 9 files / 73 tests, types 14 files / 118 tests — all untouched. If any count differs, reconcile before proceeding — do not loosen assertions.

- [ ] **Step 2: Rotate the docs**

(a) `docs/plan.md`, Milestone 6 block — box 5 is **SHARED with #187** (its text names all four sections): it stays `- [ ]` and gains a partial-landing annotation. Change

```markdown
- [ ] The **Analytics Dashboard** at `/` — Traffic (PostHog, landing-scoped) / System Health (CF GraphQL + DB probes, incl. per-frontend error rates) / Storage & Media (R2 + free-tier budget markers) / Content (counts + last-updated) + the Sentry link-out; admin server fns own the queries (ADR-0023); both editions (v1 index/sidebar = recorded SPLIT); #93's data-viz deferral reversed (app-local charts, `--chart-*` in the admin `@theme`)
```

to

```markdown
- [ ] The **Analytics Dashboard** at `/` — Traffic (PostHog, landing-scoped) / System Health (CF GraphQL + DB probes, incl. per-frontend error rates) / Storage & Media (R2 + free-tier budget markers) / Content (counts + last-updated) + the Sentry link-out; admin server fns own the queries (ADR-0023); both editions (v1 index/sidebar = recorded SPLIT); #93's data-viz deferral reversed (app-local charts, `--chart-*` in the admin `@theme`) _(system half landed 2026-10-06 via #186 — the metrics seam admin-side behind its own session gate (ADR-0023; the three tokens + account/script vars in the admin env, fail-soft in CI), the shell at `/` with Analytics in the Overview group (the #93 stub dead), System Health + the per-frontend error widgets + Content + the Sentry link-out, the shadcn chart component (recharts) vendored app-local on admin-local `--chart-*` tokens (tokens.css clause amended), staleTime 60s/5m, curated per-widget failure states, +35 admin lib-seam tests across 4 files; the box stays unticked until Traffic + Storage & Media land at #187)_
```

(b) `docs/progress.md` — three edits. First, the dated entry at the very top (after the `# Progress` heading's blank line):

```markdown
2026-10-06 — #186, M6 ticket 04, the metrics seam + the Analytics Dashboard's system half, landed: the admin's server-fn metrics seam per ADR-0023 — the CF GraphQL client (one pinned workersInvocationsAdaptive document, three parallel scriptName-filtered fetches, envelope + failure mapping, hourly/daily re-bucketing, CPU µs→ms) and the DB probes over `packages/db` (a new `probes.ts`: timed `select 1` latency, `pg_stat_activity` census against the 200-connection Micro reference, `pg_database_size`, the four-family content census — static SQL over a structural exec seam so no drizzle type reaches the admin), each server fn behind the seam's OWN session gate (the ensureSession semantics hoisted; the api stays domain-pure — zero api files touched). The dashboard shell at `/` (nav "Analytics" in Overview; the #93 Dashboard stub dead; `/appointments` untouched): System Health (api requests + error-rate trends, CPU p50/p99, DB latency/size/pooler, one error-rate widget per frontend per #178) + Content (active counts + last-updated per family) + the Sentry link-out (`sum.errors` + the console URL, never a rebuild). The #93 reversal made real: the shadcn chart component (recharts at an exact pin, the owner's 2026-10-06 ruling) vendored app-local in the admin — nothing chart-shaped entered packages/ui — with `--chart-*` in the admin's `@theme` derived from the brand tokens, and `packages/ui` tokens.css's no-chart clause amended to record the reversal. Caching: none server-side; staleTime 60s (system) / 5m (content), revalidate on focus + the Refresh button (no polling). Curated per-widget failure states (the #155 leak-safe pattern — "Analytics source not configured." / "Analytics source unavailable."; loud detail log-only into the now-observability-enabled admin Worker); the page never 500s. Env: the spec-pinned three tokens as fail-soft CI secrets + `CLOUDFLARE_ACCOUNT_ID` and the three per-edition script-name vars (deployment identity) — dev-account values are the owner's handoff (issue comment; the runbook owns the ship-day swap). Owner-reacted rendered variants rode Task 5. Gates: admin 7→11 files / 59→94 tests, `pnpm check` 35/35, `pnpm build` 7/7. NOT landed: Traffic + Storage & Media (#187, riding this seam); the Audit Log viewer (#188).
```

Second, in the Known Gaps list, directly below the Audit Log write-side bullet, add:

```markdown
- The admin's **Analytics Dashboard system half** is live (M6 #186, 2026-10-06): the metrics seam (admin server fns, own session gate, ADR-0023) serving System Health (CF GraphQL + DB probes + per-frontend error widgets), Content, and the Sentry link-out at `/`, curated failure states throughout. **Traffic + Storage & Media are #187's** (the PostHog token pair is already read by the seam's env but has no consumer yet); the dev-account token values are the owner's teaser-environment handoff until which every CF widget serves its curated not-configured state.
```

Third, in "Immediate Next Steps" item 1, replace `**#186** (the metrics seam + the Analytics Dashboard's system half), #189 (landed 2026-10-06 — the Playwright pre-flight foundation), **#191** (the ship-provisioning runbook); then #187 off #186,` with `#189 (landed 2026-10-06 — the Playwright pre-flight foundation), **#191** (the ship-provisioning runbook), **#187** (now unblocked — Traffic + Storage & Media ride #186's seam);` and drop `#186` from the takeable frontier list (it landed).

(c) `AGENTS.md` — two edits. In the "Current status of `pnpm test`" section, change `The api and landing suites remain the behavioral backbones.` (the admin bullet's last sentence) to `The metrics seam's lib-seam suite joins them (M6 #186): CF GraphQL query shapes + widget munging + the DB probes + the curated failure states — admin floor 11 files / 94 tests. The api and landing suites remain the behavioral backbones.` And append this sentence to the end of the "The DB is provisioned, the catalog is seeded, and auth is wired in." bullet (after the Audit Log sentence): ` The Analytics Dashboard's system half is live (M6 #186): the admin's metrics seam — CF GraphQL + DB probes over packages/db as session-gated server functions (ADR-0023, zero api routes) — serves System Health (incl. the per-frontend error widgets), Content, and the Sentry link-out at `/` behind curated failure states; chart components are the shadcn chart (recharts) vendored app-local on admin `@theme` --chart-* tokens (the #93 reversal; tokens.css amended); Traffic + Storage & Media are #187's.`

- [ ] **Step 3: graphify + commit**

Run: `graphify update .` then commit:

```bash
git add docs/plan.md docs/progress.md AGENTS.md graphify-out
git commit -m "docs: #186 — M6 box 5 annotated (the audience half rides #187), progress + AGENTS rotation (#186)"
```

- [ ] **Step 4: PR, review, squash-merge**

```bash
git push -u origin feat/186-metrics-seam-dashboard
gh pr create --base main --title "feat(admin): the metrics seam + the Analytics Dashboard's system half (#186)" --body-file - <<'EOF'
## What

Implements #186 (M6 ticket 04) — § The Analytics Dashboard of the M6 spec (#182); the data path per ADR-0023.

- The metrics seam in apps/admin as server functions behind its own session gate: the CF GraphQL client (one pinned workersInvocationsAdaptive document, three parallel scriptName-filtered fetches, envelope + failure mapping, hourly/daily re-bucketing, CPU µs→ms) and the DB probes over a new packages/db probes module (timed select 1, pg_stat_activity census, pg_database_size, the four-family content census — static SQL over a structural exec seam). Zero api files touched — the api stays domain-pure.
- The dashboard at `/`: System Health (api requests + error-rate trends, CPU p50/p99, DB latency/size/pooler census, one error-rate widget per frontend), Content (active counts + last-updated per family), the Sentry link-out (sum.errors + console URL). The #93 Dashboard stub is dead; /appointments untouched.
- The #93 reversal: the shadcn chart component (recharts, exact pin) vendored app-local — nothing chart-shaped in packages/ui; --chart-* in the admin's @theme, packages/ui tokens.css amended. staleTime 60s/5m, revalidate on focus + manual refresh, no server-side cache.
- Curated per-widget failure states (the #155 pattern); the page never 500s; loud detail log-only (admin Worker observability enabled).
- Env: CF_ANALYTICS_READ_TOKEN / POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID as fail-soft CI secrets on both legs + CLOUDFLARE_ACCOUNT_ID and the three per-edition script-name vars. Dev-account values are the owner's handoff (issue comment) — the curated states are the interim by design.
- Variants: owner-reacted (Task 5 evidence in .superpowers/). admin 7→11 files / 59→94 tests; pnpm check 35/35, build green.

Traffic + Storage & Media are #187's (riding this seam); the Audit Log viewer is #188's. The M6 roadmap box stays unticked until #187 lands.
EOF
```

After CI green on the PR AND the owner's variant reaction is recorded (Task 5's gate — the PR stays open for it if the reaction is pending), squash-merge. The squash commit title: `feat(admin): the metrics seam + the Analytics Dashboard's system half (#186) (#PR_NUMBER)`.

- [ ] **Step 5: The v1 SPLIT (per `docs/agents/v1-picks.md`) — with the owner-ruled divergence**

Classification (pre-ruled by the spec's v1-pick ledger: "Analytics Dashboard | **PICK with recorded SPLIT** — v1's index + sidebar hunks (dashboard at `/`, Analytics nav re-added); ship-day token swap into the v1 CI env"):

- **v1-paths, picked clean:** `packages/db/src/probes.ts` + `src/index.ts` (no migration — nothing to apply, editions share the schema); all `apps/admin/src/lib/metrics/*` + `metrics-queries.*` (new files); `apps/admin/src/components/ui/chart.tsx` + `components/charts/*` + `components/dashboard/*` (new files); `apps/admin/package.json` + `pnpm-lock.yaml` (the recharts pin — regenerate per the runbook's transformed-lockfile procedure: take v1's lockfile, `pnpm install` to apply the one resolution, commit inside the pick); `apps/admin/src/routes/_shell.index.tsx` (see the ruled divergence); `apps/admin/src/components/admin-sidebar.tsx` (see the ruled divergence); `apps/admin/src/styles.css`; `packages/ui/src/tokens.css` (the amendment replaces the clause that carried the edition term — content-pass clean by construction); `apps/admin/wrangler.jsonc` (the observability block is name-agnostic; v1's own `sevendays-v1-admin` name in ci.yml is untouched by the pick); `apps/admin/.env.example`; `.github/workflows/ci.yml` (byte-identical file — every hunk applies, both legs).
- **Main-only, dropped:** `docs/plan.md`, `docs/progress.md`, `AGENTS.md` (content-dropped — v1's client-safe rewrite carries none of the edited sentences, the #145/#146 ruling recurring), the plan file (the recurring clean-add wrinkle — proactively `git rm` it from the index), `graphify-out/`.
- **The owner-ruled v1-side divergence (the #168 reversal reversed — spec § Editions, "v1's / redirect is replaced by the dashboard route; the index + sidebar hunks ride as a recorded SPLIT"):**
  1. `_shell.index.tsx`: v1's current file is #168's `beforeLoad` redirect to `/packages` — REPLACE it with main's dashboard file whole (the redirect's purpose is spent; post-login lands on the dashboard).
  2. `admin-sidebar.tsx`: v1 has NO Overview group (dropped at #169's split). RE-ADD the group with **ONLY the Analytics item** — `{ to: '/', label: 'Analytics', icon: Activity }` — Appointments stays absent on v1 (the #169 ruling; it is booking-class content there). `NavTo` gains `'/'` only (`'/appointments'` stays out of the union). The nav comment on v1 reads: the Overview group carries the Analytics dashboard (#186/#168-reversal); appointments destinations remain out of scope in this build (#168).
  3. **The `routeTree.gen.ts` codegen hazard (carried per the ticket):** this PR's route SET is identical on both branches (the index route file already exists on v1 as the redirect; no route is added or removed), so the pick should NOT touch `routeTree.gen.ts` — if the cherry-pick carries any routeTree hunk, restore v1's committed file (`git checkout v1 -- apps/admin/src/routeTree.gen.ts` — main's tree contains `/appointments` and `/login` registrations identical to v1's at this path… if a hunk DID apply, regenerate on v1 instead: `pnpm --filter @sevendays/admin generate-routes`, then verify the `Register` interface footer survives (the #169 `b4203af` provenance repair — a regen that drops the footer is the known trap; diff against v1's pre-pick file and restore the footer verbatim if the regen ate it).

Execute per the runbook's SPLIT procedure: `cd ~/Projects/sevendays-v1-seed && git switch v1 && git pull --ff-only origin v1 && git fetch origin main`, `git cherry-pick -n <main-sha>`, drop the main-only paths (`git rm -qrf --ignore-unmatch -- docs/plan.md docs/progress.md AGENTS.md docs/superpowers/plans/2026-10-06-186-metrics-seam-dashboard-system-half.md graphify-out` — the DU exit on never-existing paths is expected), apply the two ruled divergences (index + sidebar), commit with the provenance + `Split:` line:

```text
Split: main-only paths dropped — docs/plan.md, docs/progress.md, AGENTS.md, docs/superpowers/plans/…186….md, graphify-out/
Ruled v1 divergence (spec § The Analytics Dashboard / § Editions): Overview nav re-added with Analytics only (#168's hide reversed for the dashboard; Appointments stays absent per #169); _shell.index.tsx's #168 redirect replaced by the dashboard route
```

Then the locks: `pnpm install --frozen-lockfile` (the lockfile carries exactly one new resolution — recharts; a conflict means the regen was skipped — redo the transformed-lockfile procedure above), `pnpm build:packages && pnpm --filter @sevendays/api build`, `pnpm check` (35/35; **v1 admin floor expected 11 files / 94 tests** — the metrics tests are booking-free; reconcile actuals), `pnpm build`, the export audit (`cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` — exit 0), push v1, and confirm the run shows `check` + `Deploy v1 (private)` success with `Deploy teaser (main)` skipped. Note for the ledger: v1's CI environment carries none of the three tokens yet (ship-day swap per the spec) — the deployed v1 dashboard serves the curated not-configured states, by design; the fail-soft deploy notices name the gap on every v1 run.

- [ ] **Step 6: Ledger + issue close**

Append one row to `docs/agents/v1-picks.md`'s ledger table (the established format) with the actual SHAs: date 2026-10-06, issue #186, main squash SHA, verdict `split`, v1 SHA, and the description naming: the metrics seam admin-side (probes module + CF client + gated server fns + queries) + the dashboard's system half at `/` (System Health incl. the per-frontend error widgets + Content + the Sentry link-out) + the #93 reversal (the shadcn chart component app-local on recharts, admin @theme --chart-*, tokens.css amendment, the lockfile regen) + the env/CI wiring (fail-soft token syncs both legs, script-name vars, admin observability); the ruled v1 divergence (Overview re-added with Analytics only, the #168 redirect replaced — the spec's recorded SPLIT); the classifier counts (v1-paths vs main-only drops); the locks' results (incl. the v1 admin floor and the tokens-absent-by-design note); the CI run numbers. Commit the ledger row to main:

```bash
git checkout main && git pull && git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #186 ledger row — the Analytics Dashboard split, the #168 reversal carried (#186)"
git push
```

Then close the issue:

```bash
gh issue close 186 --comment "Landed via #<PR_NUMBER> (main) + the v1 split <v1_SHA>. admin 11 files / 94 tests on main (the metrics lib-seam suite); pnpm check 35/35 + pnpm build green. The M6 roadmap box stays unticked until #187 (Traffic + Storage & Media — now unblocked on this seam); the dev-account token handoff is the issue comment above. The owner's variant reaction is recorded on this issue (Task 5)."
```

