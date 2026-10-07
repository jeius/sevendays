# M6 Ticket 05 — The Analytics Dashboard's Audience Half (Traffic + Storage & Media) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **UI-bearing tasks (4, 6) load the installed UI/UX skill set at execution time: `prototype` + `ui-ux-pro-max`, plus `design-system` / `ui-styling` as relevant (AGENTS.md rule, spec #94 amendment).**

**Goal:** The Analytics Dashboard's audience-facing half (§ The Analytics Dashboard of the M6 spec, riding #186's metrics seam) becomes executable code: **Traffic** — PostHog HogQL, landing-scoped by host filter — pageviews + unique visitors by day, top landing pages, Core Web Vitals p75 per route, with `$pageview` (initial + SPA history-change) and `$web_vitals` autocapture enabled on the **landing's provider only** (the admin's provider stays pageview/vitals-off; its events never join Traffic by construction of the host filter); **Storage & Media** — CF GraphQL R2 datasets (`r2StorageAdaptiveGroups` + `r2OperationsAdaptiveGroups`) — stored-bytes trend, object count, Class A/B op counts, and the free-tier budget markers (10 GB-month storage / 1M Class A / 10M Class B monthly — a cost signal, not a quota). Time windows 7d default with 24h/30d toggles; staleTime 5m (traffic) / 10m (storage); the same curated per-widget failure states; the page still never 500s. Owner-reacted rendered variants for the new compositions. The M6 roadmap box 5 — shared with #186, left unticked there — **is ticked by this ticket** (the dashboard is whole).

**Architecture:** Eight tasks: (1) the env reader's audience-half extension (the `r2` group; `posthog` gains `apiHost` + `landingHosts`) + the HogQL client `apps/admin/src/lib/metrics/posthog.ts` — four pinned HogQL documents (builders), host escaping, the columns/results zip, munging, failure mapping, TDD; (2) the R2 datasets client `apps/admin/src/lib/metrics/r2.ts` — two docs-verbatim GraphQL documents, the actionType→class classifier (the pricing-docs-pinned sets), storage/ops munging, TDD; (3) the seam's two new session-gated server fns + the query factories with the spec's staleTimes; (4) the widgets — `traffic-section.tsx` + `storage-media.tsx` composing into `/` (section order Traffic / System Health / Storage & Media / Content), two new formatters; (5) the landing provider's pageview + web-vitals enablement + the landing `.env.example` documentation; (6) the rendered variants the owner reacts to (temporary ungated prototype route, mock data, screenshots, ratification, adjust, delete); (7) the env + CI wiring — three new `--var`s on both ci.yml legs, the fail-soft notices updated, the owner's handoff comment, the live probes; (8) full gates + docs rotation (box 5 **ticked**) + PR/merge + the v1 pick (a plain SPLIT — no ruled divergence this time; the index/sidebar divergence was #197's) + ledger row + issue close.

**Tech Stack:** everything is already installed — **zero new dependencies** (the HogQL and R2 clients are plain `fetch`; recharts/shadcn chart, WidgetFrame, and TrendChart ride #186's app-local vocabulary). TanStack Start server functions behind the seam's own session gate (ADR-0023), TanStack Query v5 `queryOptions`, zod 4.5.1, posthog-js 1.422.5 on the landing (options grep-proven below), vitest 4 plain-node (the admin lib-seam pattern), pnpm + Turborepo, `gh` CLI, `@playwright/test` 1.63.0 as the Task 6 screenshot driver only.

**Spec:** Implements ticket [#187 "M6 ticket 05: the Analytics Dashboard's audience half — Traffic + Storage & Media"](https://github.com/jeius/sevendays/issues/187) (label `ready-for-agent`; blocked by #186 — **landed**), whose parent is the M6 spec `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` (issue #182 — § The Analytics Dashboard § Traffic / Storage & Media are this ticket's sections; § v1-pick classes pre-rules the payload **PICK with recorded SPLIT** and the landing provider wiring **PICK clean**; ADR-0023 rules the data path). Key recon facts (2026-10-07, main `d294c5d`, tree clean, admin suite re-run live: **11 files / 94 tests**):

- **The seam this ticket rides (#186, landed 2026-10-06):** `apps/admin/src/lib/metrics/` — `env.ts` (`readMetricsEnv` → `{ cf, posthog, dbUrl }`, tolerant by design), `cf.ts` (the pinned `workersInvocationsAdaptive` client + `METRICS_WINDOWS`/`metricsWindowSchema`/`windowToRange`), `db.ts`, `metrics.functions.ts` (`requireMetricsSession` helper + three session-gated fns), `metrics-queries.ts` (three factories, staleTime 60s/60s/5m). The screen: `_shell.index.tsx` renders SystemHealth + ContentCensusSection behind `PageHeader` (subline `System health, database, and content at a glance.`), the `WindowToggle` rides the `window` search param, `WidgetFrame`/`resolveWidgetState` carry the curated states, `TrendChart` (bars/line, `--chart-*` colors, `className` prop) is the chart vocabulary. The owner's variant ruling (#186 Task 5): **hierarchy-led** — one primary metric big per card, requests as LINE, errors as BARS.
- **The PostHog provider state (both apps, identical files):** `posthog-js` 1.422.5 + `@posthog/react` 1.10.5; init gated on `VITE_POSTHOG_KEY` with `api_host: VITE_POSTHOG_HOST || 'https://us.i.posthog.com'`, `person_profiles: 'identified_only'`, `capture_pageview: false`, `defaults: '2025-11-30'`. **Nothing captures `$pageview` anywhere today** (no manual captures, no router wiring) — Traffic's pageview source does not exist until Task 5 flips the landing's provider. Grep-proven from the installed `@posthog/types` 1.407.1 + `posthog-js` 1.422.5 dist types: `capture_pageview: 'history_change'` captures the initial pageview **and** SPA pathname changes (the HistoryAutocapture extension); `capture_performance: { web_vitals: true }` enables `$web_vitals`; the `$web_vitals` event carries `$current_url` + per-metric pairs **`$web_vitals_<NAME>_value`** for NAME ∈ LCP/CLS/FCP/INP (extracted from the runtime's capture call); `$host` = `location.host` (**port included** — dev hosts must carry it) and `$pathname` = `location.pathname`, both default capture properties.
- **The PostHog Query API (docs-pinned):** `POST {api_host}/api/projects/{project_id}/query/` (trailing slash; the numeric project id in the path), `Authorization: Bearer <personal API key>` (scope `query:read`), body `{ "query": { "kind": "HogQLQuery", "query": "<hogql>" }, "name": "…" }` (the docs recommend a `name` for query_log identification). The blocking response carries parallel **`columns: string[]` + `results` as rows** — rows are zipped with `columns` client-side. HogQL dialect facts: `toStartOfDay`/`toStartOfHour`/`toDateTime` are documented HogQL datetime functions; `count(distinct distinct_id)` is the canonical HogQL uniques idiom; `quantile(0.75)(expr)` is the ClickHouse-compatible p75 aggregate (PostHog's own web-vitals tooling queries exactly these `$web_vitals_*_value` properties) — the one dialect claim not doc-verbatim, carrying a documented fallback in Global Constraints.
- **The CF R2 datasets (docs-pinned from developers.cloudflare.com/r2/platform/metrics-analytics, GitHub-source-verbatim):** account-level under `viewer { accounts(filter: {accountTag: $accountTag}) }`; **`r2OperationsAdaptiveGroups(limit: 10000, filter: {datetime_geq, datetime_leq, bucketName})` → `dimensions { actionType }`, `sum { requests }`** (filter trio identical for both datasets; `actionType` is the operation NAME); **`r2StorageAdaptiveGroups(limit: 10000, filter: {…}, orderBy: [datetime_DESC])` → `dimensions { datetime }`, `max { objectCount uploadCount payloadSize metadataSize }`**. Max query range 31 days (the 30d window fits). The Class A/B classification is pinned from R2's pricing docs (Global Constraints carries the two sets verbatim). The `$since/$until` `Time!` scalar carries #186's still-open fallback note (its live probe was deferred — no dev token minted yet; both probes run in Task 7 of this plan).
- **No analytics tokens exist anywhere yet:** `apps/admin/.env.local` carries only `API_URL`/`BETTER_AUTH_*`/`DATABASE_URL` (names checked, not values); the teaser GitHub environment's fail-soft sync steps still emit their not-configured notices. The owner's dev-token handoff (the #186 issue comment) is pending — **the curated not-configured states are the designed interim, and Task 7's live probes carry the deferred pattern.**
- **Sibling fences (spec § Sequencing; docs/plan.md M6 box 5):** this ticket owns the dashboard's **audience half and TICKS box 5** (the annotation #186 left says "the box stays unticked until Traffic + Storage & Media land at #187" — this is that landing). NOT here, regardless of temptation: the Audit Log viewer screen (#188); the production smoke (#190 — its authenticated leg asserting the dashboard renders is untouched); the ship-provisioning runbook (#191 — it owns the production token swap, the dedicated v1 PostHog project, and the cutover values of `CF_ANALYTICS_BUCKET`/`POSTHOG_LANDING_HOSTS` on v1); the M6 close (#192); **any `apps/api` file at all** (the api stays domain-pure — zero api changes in this PR); `packages/db` (no probe changes — Traffic is PostHog, Storage is CF GraphQL; `probes.ts` is untouched); `packages/types` (the widget models stay admin-internal — the #186 precedent); `packages/ui` (nothing chart-shaped moves; the reversal stands); the admin provider's behavior (pageview/vitals stay OFF there — only a reader-facing comment lands beside the landing's, none on the admin's); the appointments stub/settings screens; `worker-configuration.d.ts`; any ADR (ADR-0023 already rules the path); the seed; any manifest change (zero new dependencies).
- **Baselines (live, 2026-10-07):** `apps/admin` = **11 files / 94 tests** (re-run this session). Per #198's ledger row: api 27 files + 1 skipped / 338 passed + 3 skipped, api-client 5 files / 33 tests, landing 9 files / 73 tests, types 14 files / 118 tests, `pnpm check` 35/35 turbo tasks. After this ticket: **admin 13 files / 132 tests** (+3 env cases, +19 posthog, +14 r2, +2 metrics-queries — executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions). Landing floor unchanged (the provider change is component-side; the landing suite is lib-seam only). v1's admin floor after the pick: 13 files / 132 tests expected (all booking-free; executor reconciles).

## Global Constraints

- **Branch & baseline:** `feat/187-dashboard-audience-half` off main `d294c5d` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#187)` squash style; every commit below is pinned verbatim. Evidence (test output, variant screenshots, any live-probe transcripts) lands in gitignored `.superpowers/sdd/2026-10-07-187-dashboard-audience-half/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes exist in this ticket — `pnpm-lock.yaml` is untouched and `pnpm install` never needs to run** (HogQL/R2 are plain fetch; recharts/chart vocabulary ride #186). Every task commits only with `pnpm check` green for the packages it touched (`docker compose up -d db` first — the api suite runs in `pnpm check` and needs the test db; the admin's new tests are plain-node and db-free). Biome canonical form via `pnpm --filter @sevendays/admin fix` / `--filter @sevendays/landing fix` before committing — accept its rewrites. Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **Never commit secrets (binding):** `POSTHOG_PERSONAL_API_KEY` and `CF_ANALYTICS_READ_TOKEN` stay wrangler secrets set per environment — never in `wrangler.jsonc`, `.env` files, ci.yml literals, the PR body, or the evidence dir. `.env.example` documents NAMES with empty values only. Dev values live in gitignored `apps/admin/.env.local`. The three NEW names below are NOT secrets — they are `--var`s (the `CF_ANALYTICS_SCRIPT_*` deployment-identity precedent from #186, owner-reviewable at PR).
- **The env contract additions (binding):** `readMetricsEnv` grows one group and two members — `CF_ANALYTICS_BUCKET` (the R2 bucket name the storage queries filter on; joins the existing token+account reads into a new `r2` group that nulls unless all three are present, while the `cf` workers group keeps its own null rule — a missing bucket degrades Storage & Media alone) and `POSTHOG_LANDING_HOSTS` (comma-separated allowlist of the landing's origins as PostHog's `$host` reports them — `location.host`, **port included in dev**; the posthog group now nulls without it: an unscoped Traffic widget would mix the admin's own events, so the filter is load-bearing) plus `POSTHOG_API_HOST` (optional region override; default `https://us.i.posthog.com`, matching the provider's own default; trailing slashes stripped in the reader). Env reading stays tolerant — a missing group is `null` and that section renders its curated state, never a thrown env error.
- **The result union + the never-500 law (binding, carried from #186 verbatim):** every metrics server fn resolves `MetricsResult<T> = { ok: true; data: T } | { ok: false; reason: 'not-configured' | 'unavailable' }`. Source fetch/query failures map to `{ ok: false, reason: 'unavailable' }` with the loud detail (HTTP status, GraphQL/HogQL error message) in ONE `console.error` line per failed source — log-only, never in the payload, never in the UI. The only throw a metrics fn permits is the session gate's `Unauthorized`. The dashboard page renders for any staff session regardless of source health; the widget components map a thrown query error to the curated `unavailable` line; no widget error state bubbles to a route-level error boundary.
- **Curated copy pins (spec-verbatim base, #186's landed lines):** unconfigured → `Analytics source not configured.`; failure → `Analytics source unavailable.` — the same two lines across every widget. Window labels: `24 hours` / `7 days` / `30 days` (the WindowToggle already renders them). New copy this ticket pins (completion owner-reviewable at the variants step): section headings `Traffic` and `Storage & Media`; the budget hints `Free tier: 10 GB-month storage — a cost signal, not a quota.`, `Free tier: 1M Class A ops / month — a cost signal, not a quota.`, `Free tier: 10M Class B ops / month — a cost signal, not a quota.`; the vitals table headers `Route` / `LCP` / `CLS` / `FCP` / `INP`; the top-pages and vitals fallback path label `(no path)`; the page subline becomes `Traffic, system health, storage, and content at a glance.`
- **The HogQL query contract (binding):** four pinned documents built by pure functions (never string-concatenated ad hoc at call sites): `pageviewSeriesQuery(window, range, hosts)` — `select <bucket>(timestamp) as day, count() as pageviews, count(distinct distinct_id) as uniques … group by day order by day` where `<bucket>` is `toStartOfHour(timestamp)` for `24h` and `toStartOfDay(timestamp)` otherwise (the spec's "by day" honored at 7d/30d; 24h needs hourly grain to be meaningful); `windowTotalsQuery(range, hosts)` — the same filter, `select count() as pageviews, count(distinct distinct_id) as uniques` (window-total uniques MUST be its own query — summing daily uniques double-counts visitors across days); `topPagesQuery(range, hosts)` — `select properties.$pathname as path, count() as pageviews … group by path order by pageviews desc limit 5`; `vitalsQuery(range, hosts)` — `select properties.$pathname as route, quantile(0.75)(properties.$web_vitals_LCP_value) as lcp_p75, … as cls_p75, … as fcp_p75, … as inp_p75 … where event = '$web_vitals' … group by route order by lcp_p75 desc limit 10`. The shared filter: `event = '<event>' and timestamp >= toDateTime('<YYYY-MM-DD HH:MM:SS>') and timestamp <= toDateTime('<…>') and properties.$host in ('h1', 'h2')` — range from `windowToRange(window)` (`./cf`), datetimes via `isoToHogqlDatetime` (ISO → `YYYY-MM-DD HH:MM:SS`), hosts single-quote-escaped (`'` → `''`). One request per document (four parallel fetches per Traffic query). Request: `POST {apiHost}/api/projects/{projectId}/query/`, Bearer personal key, body `{ query: { kind: 'HogQLQuery', query }, name: 'sevendays-admin-dashboard' }`. Response guard: `body.error` → throw; `columns`/`results` not both arrays → throw (the zip expects parallel arrays). **Documented fallbacks (live-probe-gated, Task 7):** if `quantile(0.75)(…)` is rejected by the live project, switch the four aggregates to `quantileTDigest(0.75)(…)` (same ClickHouse family) in the builder AND its shape test; if the blocking response returns rows as objects instead of parallel arrays, `zipHogqlRows` gains an objects-passthrough branch (test updated to match) — nothing else about the contract moves.
- **The R2 query contract (binding):** TWO pinned documents, field-structure-verbatim from the R2 metrics docs (operation names are ours): `R2_OPS_QUERY` — `query R2Operations($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) { viewer { accounts(filter: {accountTag: $accountTag}) { r2OperationsAdaptiveGroups(limit: 10000, filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}) { dimensions { actionType } sum { requests } } } } }`; `R2_STORAGE_QUERY` — the same shell with `r2StorageAdaptiveGroups(… orderBy: [datetime_DESC]) { dimensions { datetime } max { objectCount uploadCount payloadSize metadataSize } } }`. Variables: `accountTag` + `bucketName` from the `r2` env group, `since`/`until` from `windowToRange(window)` (ISO strings, exactly as `cf.ts` sends them). The `Time!` scalar carries #186's open fallback (switch to `string!` in the document AND its shape test if the live endpoint rejects it — one documented move). Envelope unwrap + failure mapping reuse the `cf.ts` pattern (`!res.ok` → throw `HTTP <status>`; `body.errors` non-empty → throw first message; catch → log-only unavailable).
- **The Class A/B classification (binding, pinned from R2's pricing docs):** Class A = `ListBuckets, PutBucket, ListObjects, PutObject, CopyObject, CompleteMultipartUpload, CreateMultipartUpload, LifecycleStorageTierTransition, ListMultipartUploads, UploadPart, UploadPartCopy, ListParts, PutBucketEncryption, PutBucketCors, PutBucketLifecycleConfiguration`; Class B = `HeadBucket, HeadObject, GetObject, UsageSummary, GetBucketEncryption, GetBucketLocation, GetBucketCors, GetBucketLifecycleConfiguration`. `DeleteObject`, `DeleteBucket`, `AbortMultipartUpload` and any unknown future name are the **free class — counted in neither total** (silently uncounted; they cost nothing). The classifier is a pure function over the `actionType` dimension rows.
- **The budget markers (binding, spec + pricing docs):** `R2_FREE_TIER = { storageBytes: 10_000_000_000, classAOps: 1_000_000, classBOps: 10_000_000 }` (decimal GB — R2 bills decimal; `formatBytes` already divides by 1000). Rendered as the pinned hint lines beside the values, plus a percentage-of-marker read on the ops cards. **The ops/storage widgets are window-scoped like every other windowed widget** (one `window` param flows through both documents; the markers are static monthly reference values labeled "monthly" — the ruling: rolling-window counts beside fixed monthly markers read as a pace signal, which is exactly the cost signal the spec wants; the rejected alternative, calendar-month-to-date totals, would fork the window model for one section).
- **staleTime pins (spec-verbatim):** traffic `staleTime: 300_000`, storage `staleTime: 600_000`, both `refetchOnWindowFocus: true` (the factories state it explicitly, as the existing three do). No server-side cache. No polling. Manual refresh keeps invalidating the `['metrics']` key prefix (the existing RefreshButton already does — no change).
- **The composition rules (binding):** the two new sections compose from #186's landed vocabulary only — `WidgetFrame` + `resolveWidgetState` (curated states), `TrendChart` (its `variant`/`color`/`className` props), the `format.ts` helpers (+ two new: `formatDurationMs` for LCP/FCP/INP milliseconds, `formatCls` for the unitless CLS). Hierarchy-led per the owner's #186 ruling: one primary metric big per card, trends as LINE (`--chart-1` / `--chart-4`); the lists (top pages, the vitals table) are tables, not charts. No new `--chart-*` tokens, no new chart components, no `packages/ui` touch. Section order on the page: **Traffic, System Health, Storage & Media, Content** (the spec's section order; System Health and Content are #186's, untouched).
- **The landing provider contract (binding):** the landing's provider alone flips `capture_pageview: 'history_change'` (initial + SPA history-change pageviews — the TanStack Router client-side navigations flow through the history API) and adds `capture_performance: { web_vitals: true }` (LCP/CLS/FCP/INP autocapture; the installed 1.422.5 surfaces `$web_vitals_<NAME>_value`). The ADMIN's provider is untouched — its `capture_pageview: false` stands (the ticket's "the admin's own events stay captured but host-filtered out": the admin's non-pageview events keep flowing to PostHog, and the host allowlist keeps every admin-origin event out of Traffic). The landing's `.env.example` documents `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST` (names only — the provider has consumed them since M2 undocumented).
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–7 edit only: `apps/admin/src/lib/metrics/env.ts` + `env.test.ts` + `posthog.ts` + `posthog.test.ts` (create the latter two) + `r2.ts` + `r2.test.ts` (create) + `metrics.functions.ts` + `metrics-queries.ts` + `metrics-queries.test.ts`, `apps/admin/src/components/dashboard/format.ts` + `traffic-section.tsx` (create) + `storage-media.tsx` (create), `apps/admin/src/routes/_shell.index.tsx`, `apps/admin/.env.example`, `apps/landing/src/integrations/posthog/provider.tsx`, `apps/landing/.env.example`, `.github/workflows/ci.yml`. Task 6 additionally creates then DELETES `apps/admin/src/routes/prototype-audience.tsx` (untracked throughout — never committed). Task 8 rotates `docs/plan.md` (M6 box 5 — **TICKED**), `docs/progress.md`, `AGENTS.md`, and `docs/agents/v1-picks.md` (ledger row, post-merge). NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
apps/admin/
  src/lib/metrics/
    env.ts                                     # modify (Task 1) — the r2 group; posthog gains apiHost + landingHosts
    env.test.ts                                # modify (Task 1) — exact edits below
    posthog.ts                                 # create (Task 1) — the HogQL client: builders, zip, munging, fetch
    posthog.test.ts                            # create (Task 1)
    r2.ts                                      # create (Task 2) — the R2 datasets client + classifier + munging
    r2.test.ts                                 # create (Task 2)
    metrics.functions.ts                       # modify (Task 3) — +2 session-gated server fns
  src/lib/metrics-queries.ts                   # modify (Task 3) — +2 factories (5m / 10m)
  src/lib/metrics-queries.test.ts              # modify (Task 3) — +2 cases
  src/components/dashboard/
    format.ts                                  # modify (Task 4) — +formatDurationMs +formatCls
    traffic-section.tsx                        # create (Task 4) — the four Traffic widgets
    storage-media.tsx                          # create (Task 4) — the four Storage & Media widgets
  src/routes/_shell.index.tsx                  # modify (Task 4) — the two sections join the page
  src/routes/prototype-audience.tsx            # temporary (Task 6 — untracked, deleted pre-PR)
  .env.example                                 # modify (Task 7) — the three new names
apps/landing/
  src/integrations/posthog/provider.tsx        # modify (Task 5) — pageviews + web vitals on, landing only
  .env.example                                 # modify (Task 5) — the VITE_POSTHOG_* names documented
.github/workflows/ci.yml                       # modify (Task 7) — both legs' --vars + notices
docs/plan.md docs/progress.md AGENTS.md docs/agents/v1-picks.md   # Task 8
```

---

### Task 1: `apps/admin` — the env extension + the PostHog HogQL client (TDD)

**Files:**
- Modify (test-first): `apps/admin/src/lib/metrics/env.test.ts`
- Create (test-first): `apps/admin/src/lib/metrics/posthog.test.ts`
- Modify: `apps/admin/src/lib/metrics/env.ts`
- Create: `apps/admin/src/lib/metrics/posthog.ts`

**Interfaces:**
- Consumes: `./cf`'s `MetricsWindow` + `windowToRange`; `./env`'s `MetricsResult` (extended here).
- Produces (what Tasks 3–4 consume): `MetricsEnv` gains `r2: R2AnalyticsConfig | null` and `PosthogConfig` becomes `{ personalApiKey: string; projectId: string; apiHost: string; landingHosts: string[] }`; `POSTHOG_DEFAULT_API_HOST`, `R2AnalyticsConfig`; from `./posthog`: `escapeHogqlString`, `isoToHogqlDatetime`, `zipHogqlRows`, `normalizeHogqlTimestamp`, `pageviewSeriesQuery`, `windowTotalsQuery`, `topPagesQuery`, `vitalsQuery`, `TrafficPoint`, `TopPage`, `VitalsRow`, `TrafficMetrics`, `mungeTrafficSeries`, `mungeWindowTotals`, `mungeTopPages`, `mungeVitals`, `fetchTrafficMetrics` — full shapes fenced below.

**Not here:** the R2 client (Task 2 — `R2AnalyticsConfig` is only *read* here); any server fn or query factory (Task 3); any UI (Task 4); the landing provider (Task 5).

- [ ] **Step 1: Rewrite `apps/admin/src/lib/metrics/env.test.ts` (the FULL fixture grows to nine cases; three new behaviors pin the new groups)**

The whole file becomes (the #186 cases keep their names; the shapes grow):

```ts
// The metrics env reader's contract (#186, extended at #187): tolerance.
// An unset source yields null for that source — the curated
// not-configured widget state — never a thrown env error. The spec-pinned
// tokens plus the deployment-identity vars (#186's script trio; #187's
// bucket + landing-hosts + region host — owner-reviewable at PR, the
// CF_ANALYTICS_SCRIPT_* precedent).
import { describe, expect, it } from 'vitest';
import { readMetricsEnv } from './env';

const FULL = {
  CF_ANALYTICS_READ_TOKEN: 'cf-token',
  CLOUDFLARE_ACCOUNT_ID: 'account-id',
  CF_ANALYTICS_SCRIPT_API: 'sevendays-api',
  CF_ANALYTICS_SCRIPT_LANDING: 'sevendays-landing',
  CF_ANALYTICS_SCRIPT_ADMIN: 'sevendays-admin',
  CF_ANALYTICS_BUCKET: 'sevendays-media',
  POSTHOG_PERSONAL_API_KEY: 'ph-key',
  POSTHOG_PROJECT_ID: 'ph-project',
  POSTHOG_LANDING_HOSTS: 'sevendays-landing.workers.dev, localhost:3000',
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
      r2: { token: 'cf-token', accountId: 'account-id', bucket: 'sevendays-media' },
      posthog: {
        personalApiKey: 'ph-key',
        projectId: 'ph-project',
        apiHost: 'https://us.i.posthog.com',
        landingHosts: ['sevendays-landing.workers.dev', 'localhost:3000'],
      },
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
    expect(readMetricsEnv({ ...FULL, CF_ANALYTICS_SCRIPT_LANDING: '  ' }).cf).toBeNull();
  });

  it('a missing bucket nulls the R2 group alone — the workers widgets stay live', () => {
    const env = readMetricsEnv({ ...FULL, CF_ANALYTICS_BUCKET: undefined });
    expect(env.r2).toBeNull();
    expect(env.cf).not.toBeNull();
  });

  it('a missing PostHog pair member nulls the posthog source', () => {
    expect(readMetricsEnv({ ...FULL, POSTHOG_PROJECT_ID: undefined }).posthog).toBeNull();
  });

  it('missing landing hosts null the posthog source (an unscoped filter would mix the admin in)', () => {
    expect(readMetricsEnv({ ...FULL, POSTHOG_LANDING_HOSTS: ' , ' }).posthog).toBeNull();
  });

  it('POSTHOG_API_HOST overrides the region and loses trailing slashes', () => {
    const env = readMetricsEnv({ ...FULL, POSTHOG_API_HOST: 'https://eu.i.posthog.com/' });
    expect(env.posthog?.apiHost).toBe('https://eu.i.posthog.com');
  });

  it('an empty env is all-null (every widget renders its curated state)', () => {
    expect(readMetricsEnv({})).toEqual({
      cf: null,
      r2: null,
      posthog: null,
      dbUrl: null,
    });
  });
});
```

- [ ] **Step 2: Create `apps/admin/src/lib/metrics/posthog.test.ts`**

```ts
// The PostHog HogQL half of the metrics seam (#187): the four pinned
// query documents (built by pure functions), the host escaping, the
// columns/results zip, the munging, and the fetch contract with its
// failure mapping. Plain-node over stubbed fetch — no network, no
// browser (the admin lib-seam pattern). Dialect facts pinned in the plan
// header; the quantile + parallel-arrays fallbacks live in Global
// Constraints and are live-probe-gated (Task 7), never speculative.
import { describe, expect, it } from 'vitest';
import type { MetricsEnv } from './env';
import {
  escapeHogqlString,
  fetchTrafficMetrics,
  isoToHogqlDatetime,
  mungeTopPages,
  mungeTrafficSeries,
  mungeVitals,
  mungeWindowTotals,
  normalizeHogqlTimestamp,
  pageviewSeriesQuery,
  topPagesQuery,
  vitalsQuery,
  windowTotalsQuery,
  zipHogqlRows,
} from './posthog';

const ENV: MetricsEnv = {
  cf: null,
  r2: null,
  posthog: {
    personalApiKey: 'ph-key',
    projectId: 'ph-project',
    apiHost: 'https://us.i.posthog.com',
    landingHosts: ['sevendays-landing.workers.dev'],
  },
  dbUrl: null,
};

const RANGE = { since: '2026-10-01T12:00:00.000Z', until: '2026-10-08T12:00:00.000Z' };

// The shared filter fragment every pageview document pins — asserted once
// here and reused by the document expectations below.
const FILTER = [
  "event = '$pageview'",
  "  and timestamp >= toDateTime('2026-10-01 12:00:00')",
  "  and timestamp <= toDateTime('2026-10-08 12:00:00')",
  "  and properties.$host in ('sevendays-landing.workers.dev')",
].join('\n');

describe('the pinned HogQL documents', () => {
  it('the pageview series is daily for 7d/30d and hourly for 24h (the spec pins by-day; 24h needs hour grain)', () => {
    const daily = `select toStartOfDay(timestamp) as day, count() as pageviews, count(distinct distinct_id) as uniques
from events
where ${FILTER}
group by day
order by day`;
    expect(pageviewSeriesQuery('7d', RANGE, ENV.posthog?.landingHosts ?? [])).toBe(daily);
    expect(pageviewSeriesQuery('30d', RANGE, ENV.posthog?.landingHosts ?? [])).toBe(daily);
    expect(pageviewSeriesQuery('24h', RANGE, ENV.posthog?.landingHosts ?? [])).toBe(
      daily.replace('toStartOfDay(timestamp)', 'toStartOfHour(timestamp)')
    );
  });

  it('the window totals re-pin the filter (window uniques are their own query — summed dailies double-count)', () => {
    expect(windowTotalsQuery(RANGE, ENV.posthog?.landingHosts ?? [])).toBe(
      `select count() as pageviews, count(distinct distinct_id) as uniques
from events
where ${FILTER}`
    );
  });

  it('the top-pages document groups by pathname, orders, and limits 5', () => {
    expect(topPagesQuery(RANGE, ENV.posthog?.landingHosts ?? [])).toBe(
      `select properties.$pathname as path, count() as pageviews
from events
where ${FILTER}
group by path
order by pageviews desc
limit 5`
    );
  });

  it('the vitals document swaps the event and pins the four p75 quantiles', () => {
    expect(vitalsQuery(RANGE, ENV.posthog?.landingHosts ?? [])).toBe(
      `select properties.$pathname as route,
  quantile(0.75)(properties.$web_vitals_LCP_value) as lcp_p75,
  quantile(0.75)(properties.$web_vitals_CLS_value) as cls_p75,
  quantile(0.75)(properties.$web_vitals_FCP_value) as fcp_p75,
  quantile(0.75)(properties.$web_vitals_INP_value) as inp_p75
from events
where ${FILTER.replace("event = '$pageview'", "event = '$web_vitals'")}
group by route
order by lcp_p75 desc
limit 10`
    );
  });

  it('host names are single-quote-escaped (HogQL doubled quotes)', () => {
    expect(escapeHogqlString("o'brien")).toBe("o''brien");
    expect(
      pageviewSeriesQuery('7d', RANGE, ["lo'alhost"]).includes(
        "properties.$host in ('lo''alhost')"
      )
    ).toBe(true);
  });
});

describe('the response helpers', () => {
  it('isoToHogqlDatetime slices ISO to the ClickHouse datetime literal', () => {
    expect(isoToHogqlDatetime('2026-10-01T12:34:56.789Z')).toBe('2026-10-01 12:34:56');
  });

  it('normalizeHogqlTimestamp treats HogQL DateTime strings as UTC and passes ISO through', () => {
    expect(normalizeHogqlTimestamp('2026-10-06 00:00:00')).toBe('2026-10-06T00:00:00.000Z');
    expect(normalizeHogqlTimestamp('2026-10-06T00:00:00.000Z')).toBe('2026-10-06T00:00:00.000Z');
    expect(normalizeHogqlTimestamp(null)).toBeNull();
  });

  it('zipHogqlRows zips the parallel columns/results arrays into keyed rows', () => {
    expect(zipHogqlRows(['day', 'pageviews'], [['2026-10-06 00:00:00', 3], ['2026-10-07 00:00:00', 5]])).toEqual([
      { day: '2026-10-06 00:00:00', pageviews: 3 },
      { day: '2026-10-07 00:00:00', pageviews: 5 },
    ]);
  });
});

describe('the munging', () => {
  it('mungeTrafficSeries normalizes, sorts, and numbers the daily rows', () => {
    expect(
      mungeTrafficSeries([
        { day: '2026-10-07 00:00:00', pageviews: '5', uniques: '2' },
        { day: '2026-10-06 00:00:00', pageviews: 3, uniques: 1 },
      ])
    ).toEqual([
      { bucketStart: '2026-10-06T00:00:00.000Z', pageviews: 3, uniques: 1 },
      { bucketStart: '2026-10-07T00:00:00.000Z', pageviews: 5, uniques: 2 },
    ]);
  });

  it('mungeTrafficSeries drops rows whose day does not parse', () => {
    expect(mungeTrafficSeries([{ day: 'not-a-date', pageviews: 1, uniques: 1 }])).toEqual([]);
  });

  it('mungeWindowTotals zeroes on an empty result', () => {
    expect(mungeWindowTotals([])).toEqual({ pageviews: 0, uniques: 0 });
    expect(mungeWindowTotals([{ pageviews: 41, uniques: 9 }])).toEqual({ pageviews: 41, uniques: 9 });
  });

  it('mungeTopPages keeps order and folds null paths to (no path)', () => {
    expect(
      mungeTopPages([
        { path: '/packages', pageviews: 12 },
        { path: null, pageviews: 2 },
      ])
    ).toEqual([
      { path: '/packages', pageviews: 12 },
      { path: '(no path)', pageviews: 2 },
    ]);
  });

  it('mungeVitals numbers present metrics, nulls absent ones, and folds null routes', () => {
    expect(
      mungeVitals([
        {
          route: '/book',
          lcp_p75: 2410.5,
          cls_p75: null,
          fcp_p75: 900,
          inp_p75: 180,
        },
        { route: null, lcp_p75: null, cls_p75: 0.05, fcp_p75: null, inp_p75: null },
      ])
    ).toEqual([
      { route: '/book', lcpP75: 2410.5, clsP75: null, fcpP75: 900, inpP75: 180 },
      { route: '(no path)', lcpP75: null, clsP75: 0.05, fcpP75: null, inpP75: null },
    ]);
  });
});

describe('fetchTrafficMetrics', () => {
  it('posts the four documents with bearer auth, one fetch each, and munges the union', async () => {
    const calls: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }> = [];
    const fetchImpl = async (url: unknown, init: RequestInit) => {
      calls.push({ url: String(url), init, body: JSON.parse(String(init.body)) });
      const which = calls.length;
      const columns = ['day', 'pageviews', 'uniques'];
      const results: unknown[][] =
        which === 1
          ? [['2026-10-06 00:00:00', 30, 8]]
          : which === 2
            ? [[30, 8]]
            : which === 3
              ? [['/packages', 12]]
              : [['/book', 2410.5, null, 900, 180]];
      return {
        ok: true,
        json: async () => ({
          columns:
            which === 2
              ? ['pageviews', 'uniques']
            : which === 3
              ? ['path', 'pageviews']
              : which === 4
                ? ['route', 'lcp_p75', 'cls_p75', 'fcp_p75', 'inp_p75']
                : columns,
          results,
        }),
      };
    };
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.totals).toEqual({ pageviews: 30, uniques: 8 });
    expect(result.data.series).toEqual([
      { bucketStart: '2026-10-06T00:00:00.000Z', pageviews: 30, uniques: 8 },
    ]);
    expect(result.data.topPages).toEqual([{ path: '/packages', pageviews: 12 }]);
    expect(result.data.vitals).toEqual([
      { route: '/book', lcpP75: 2410.5, clsP75: null, fcpP75: 900, inpP75: 180 },
    ]);
    expect(calls).toHaveLength(4);
    expect(calls[0]?.url).toBe('https://us.i.posthog.com/api/projects/ph-project/query/');
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe('Bearer ph-key');
    expect(calls[0]?.body).toMatchObject({
      query: { kind: 'HogQLQuery' },
      name: 'sevendays-admin-dashboard',
    });
  });

  it('an unconfigured posthog source resolves not-configured (no fetch at all)', async () => {
    let fetched = 0;
    const fetchImpl = async () => {
      fetched += 1;
      throw new Error('must not be called');
    };
    const result = await fetchTrafficMetrics(
      { cf: null, r2: null, posthog: null, dbUrl: null },
      '7d',
      fetchImpl as unknown as typeof fetch
    );
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetched).toBe(0);
  });

  it('a non-200 response maps to unavailable', async () => {
    const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({}) });
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a body-level error maps to unavailable — the loud detail is log-only', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ error: 'invalid query' }),
    });
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a non-array columns/results pair maps to unavailable (unexpected envelope)', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ results: {} }) });
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a thrown fetch (network) maps to unavailable', async () => {
    const fetchImpl = async () => {
      throw new Error('network down');
    };
    const result = await fetchTrafficMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});
```

- [ ] **Step 3: Run both files red**

`pnpm --filter @sevendays/admin test -- --run src/lib/metrics/env.test.ts src/lib/metrics/posthog.test.ts` — env fails on the new shapes (`r2` missing, posthog shape changed), posthog fails on the missing module. Record the red in the evidence dir.

- [ ] **Step 4: Write `apps/admin/src/lib/metrics/env.ts` (the audience-half extension)**

The file becomes (the #186 comment grows one dated paragraph; the `cf` block is untouched):

```ts
// The metrics seam's env reader + result vocabulary (#186, ADR-0023;
// extended at #187 for the audience half). Tolerant by design: an unset
// source is null and its widgets render the curated "Analytics source
// not configured." state — never a thrown env error (the inverted #155).
// #187 adds the r2 group (the storage queries' bucket — the deployment-
// identity class, owner-reviewable at PR like #186's script trio) and
// grows posthog with the region host + the landing-host allowlist ($host
// = location.host, port included — the filter is load-bearing: without
// it the admin's own events would mix into Traffic).
export type MetricsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not-configured' | 'unavailable' };

export type CfAnalyticsConfig = {
  token: string;
  accountId: string;
  scripts: { api: string; landing: string; admin: string };
};

// Consumed by #187's Storage & Media section; shares the CF token +
// account reads with the workers group but nulls independently — a
// missing bucket degrades Storage & Media alone.
export type R2AnalyticsConfig = {
  token: string;
  accountId: string;
  bucket: string;
};

export const POSTHOG_DEFAULT_API_HOST = 'https://us.i.posthog.com';

export type PosthogConfig = {
  personalApiKey: string;
  projectId: string;
  apiHost: string;
  landingHosts: string[];
};

export type MetricsEnv = {
  cf: CfAnalyticsConfig | null;
  r2: R2AnalyticsConfig | null;
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

function readHostList(
  env: Record<string, string | undefined>,
  key: string
): string[] {
  const raw = readTrimmed(env, key);
  if (raw === null) return [];
  return raw
    .split(',')
    .map((host) => host.trim())
    .filter((host) => host !== '');
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
  const bucket = readTrimmed(env, 'CF_ANALYTICS_BUCKET');
  const r2 =
    token !== null && accountId !== null && bucket !== null
      ? { token, accountId, bucket }
      : null;
  const personalApiKey = readTrimmed(env, 'POSTHOG_PERSONAL_API_KEY');
  const projectId = readTrimmed(env, 'POSTHOG_PROJECT_ID');
  const apiHostRaw = readTrimmed(env, 'POSTHOG_API_HOST');
  const landingHosts = readHostList(env, 'POSTHOG_LANDING_HOSTS');
  const posthog =
    personalApiKey !== null && projectId !== null && landingHosts.length > 0
      ? {
          personalApiKey,
          projectId,
          apiHost: (apiHostRaw ?? POSTHOG_DEFAULT_API_HOST).replace(/\/+$/, ''),
          landingHosts,
        }
      : null;
  return { cf, r2, posthog, dbUrl: readTrimmed(env, 'DATABASE_URL') };
}
```

- [ ] **Step 5: Write `apps/admin/src/lib/metrics/posthog.ts`**

```ts
// The PostHog HogQL half of the metrics seam (#187, ADR-0023): four
// pinned documents (pure builders — never ad-hoc concatenation at call
// sites), landing-scoped by the $host allowlist (the admin's own events
// stay captured but never join Traffic), one request per document over
// the Query API (POST {host}/api/projects/{id}/query/, Bearer personal
// key, HogQLQuery kind, a name for query_log). The blocking response is
// parallel columns/results arrays — zipped here. Failure mapping is the
// #155 class: resolve unavailable, one log-only line, never a throw.
// Dialect fallbacks (quantileTDigest; objects-rows) live in the plan's
// Global Constraints and are live-probe-gated only.
import type { MetricsResult, PosthogConfig } from './env';
import type { MetricsWindow } from './cf';
import { windowToRange } from './cf';

export const POSTHOG_QUERY_NAME = 'sevendays-admin-dashboard';

export type TrafficPoint = {
  bucketStart: string;
  pageviews: number;
  uniques: number;
};

export type TopPage = { path: string; pageviews: number };

export type VitalsRow = {
  route: string;
  lcpP75: number | null;
  clsP75: number | null;
  fcpP75: number | null;
  inpP75: number | null;
};

export type TrafficMetrics = {
  series: TrafficPoint[];
  totals: { pageviews: number; uniques: number };
  topPages: TopPage[];
  vitals: VitalsRow[];
};

export function escapeHogqlString(value: string): string {
  return value.replace(/'/g, "''");
}

export function isoToHogqlDatetime(iso: string): string {
  return iso.slice(0, 19).replace('T', ' ');
}

function hogqlHostList(hosts: string[]): string {
  return hosts.map((host) => `'${escapeHogqlString(host)}'`).join(', ');
}

function eventsFilter(
  event: '$pageview' | '$web_vitals',
  range: { since: string; until: string },
  hosts: string[]
): string {
  return [
    `event = '${event}'`,
    `timestamp >= toDateTime('${isoToHogqlDatetime(range.since)}')`,
    `timestamp <= toDateTime('${isoToHogqlDatetime(range.until)}')`,
    `properties.$host in (${hogqlHostList(hosts)})`,
  ].join('\n  and ');
}

// 24h buckets hourly (a day-bucketed 24h window is one point); 7d/30d
// bucket daily (the spec pins pageviews + uniques by day).
export function pageviewSeriesQuery(
  window: MetricsWindow,
  range: { since: string; until: string },
  hosts: string[]
): string {
  const bucket = window === '24h' ? 'toStartOfHour(timestamp)' : 'toStartOfDay(timestamp)';
  return [
    `select ${bucket} as day, count() as pageviews, count(distinct distinct_id) as uniques`,
    'from events',
    `where ${eventsFilter('$pageview', range, hosts)}`,
    'group by day',
    'order by day',
  ].join('\n');
}

// Window-total uniques are their own document — summing daily uniques
// would double-count visitors seen on multiple days.
export function windowTotalsQuery(
  range: { since: string; until: string },
  hosts: string[]
): string {
  return [
    'select count() as pageviews, count(distinct distinct_id) as uniques',
    'from events',
    `where ${eventsFilter('$pageview', range, hosts)}`,
  ].join('\n');
}

export function topPagesQuery(
  range: { since: string; until: string },
  hosts: string[]
): string {
  return [
    'select properties.$pathname as path, count() as pageviews',
    'from events',
    `where ${eventsFilter('$pageview', range, hosts)}`,
    'group by path',
    'order by pageviews desc',
    'limit 5',
  ].join('\n');
}

export function vitalsQuery(
  range: { since: string; until: string },
  hosts: string[]
): string {
  return [
    'select properties.$pathname as route,',
    '  quantile(0.75)(properties.$web_vitals_LCP_value) as lcp_p75,',
    '  quantile(0.75)(properties.$web_vitals_CLS_value) as cls_p75,',
    '  quantile(0.75)(properties.$web_vitals_FCP_value) as fcp_p75,',
    '  quantile(0.75)(properties.$web_vitals_INP_value) as inp_p75',
    'from events',
    `where ${eventsFilter('$web_vitals', range, hosts)}`,
    'group by route',
    'order by lcp_p75 desc',
    'limit 10',
  ].join('\n');
}

export function zipHogqlRows(
  columns: string[],
  results: unknown[][]
): Record<string, unknown>[] {
  return results.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      record[column] = row[index];
    });
    return record;
  });
}

export function normalizeHogqlTimestamp(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let text = String(raw).trim().replace(' ', 'T');
  if (!text.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(text)) {
    text = `${text}+00:00`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function numOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function pathOrNull(raw: unknown): string {
  return typeof raw === 'string' && raw !== '' ? raw : '(no path)';
}

export function mungeTrafficSeries(
  rows: Record<string, unknown>[]
): TrafficPoint[] {
  return rows
    .map((row) => ({
      bucketStart: normalizeHogqlTimestamp(row.day),
      pageviews: Number(row.pageviews ?? 0),
      uniques: Number(row.uniques ?? 0),
    }))
    .filter((point): point is TrafficPoint => point.bucketStart !== null)
    .sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
}

export function mungeWindowTotals(
  rows: Record<string, unknown>[]
): { pageviews: number; uniques: number } {
  const row = rows[0] ?? {};
  return { pageviews: Number(row.pageviews ?? 0), uniques: Number(row.uniques ?? 0) };
}

export function mungeTopPages(rows: Record<string, unknown>[]): TopPage[] {
  return rows.map((row) => ({
    path: pathOrNull(row.path),
    pageviews: Number(row.pageviews ?? 0),
  }));
}

export function mungeVitals(rows: Record<string, unknown>[]): VitalsRow[] {
  return rows.map((row) => ({
    route: pathOrNull(row.route),
    lcpP75: numOrNull(row.lcp_p75),
    clsP75: numOrNull(row.cls_p75),
    fcpP75: numOrNull(row.fcp_p75),
    inpP75: numOrNull(row.inp_p75),
  }));
}

async function runHogql(
  posthog: PosthogConfig,
  query: string,
  fetchImpl: typeof fetch
): Promise<Record<string, unknown>[]> {
  const res = await fetchImpl(
    `${posthog.apiHost}/api/projects/${posthog.projectId}/query/`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${posthog.personalApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: { kind: 'HogQLQuery', query },
        name: POSTHOG_QUERY_NAME,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    results?: unknown;
    columns?: unknown;
    error?: unknown;
  };
  if (body.error !== null && body.error !== undefined) {
    throw new Error(String(body.error));
  }
  if (!Array.isArray(body.columns) || !Array.isArray(body.results)) {
    throw new Error('unexpected response shape');
  }
  return zipHogqlRows(body.columns, body.results);
}

// The env parameter is structural ({ posthog }) so tests pass a minimal
// object and Task 3 passes the full MetricsEnv unchanged.
export async function fetchTrafficMetrics(
  env: { posthog: PosthogConfig | null },
  window: MetricsWindow,
  fetchImpl: typeof fetch = fetch
): Promise<MetricsResult<TrafficMetrics>> {
  const posthog = env.posthog;
  if (posthog === null) {
    return { ok: false, reason: 'not-configured' };
  }
  try {
    const range = windowToRange(window);
    const [seriesRows, totalsRows, topRows, vitalsRows] = await Promise.all([
      runHogql(posthog, pageviewSeriesQuery(window, range, posthog.landingHosts), fetchImpl),
      runHogql(posthog, windowTotalsQuery(range, posthog.landingHosts), fetchImpl),
      runHogql(posthog, topPagesQuery(range, posthog.landingHosts), fetchImpl),
      runHogql(posthog, vitalsQuery(range, posthog.landingHosts), fetchImpl),
    ]);
    return {
      ok: true,
      data: {
        series: mungeTrafficSeries(seriesRows),
        totals: mungeWindowTotals(totalsRows),
        topPages: mungeTopPages(topRows),
        vitals: mungeVitals(vitalsRows),
      },
    };
  } catch (error) {
    // The loud detail stays log-only (#155): one line naming the source.
    console.error(
      '[metrics] PostHog source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}
```

- [ ] **Step 6: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run src/lib/metrics` (Task 1's files green — 9 env + 19 posthog; the other metrics files stay green alongside), then `pnpm --filter @sevendays/admin fix`, then `pnpm check` (35/35; no other suite touched — cf/db-probes/metrics-queries are unchanged in this task). Admin floor now **12 files / 116 tests**. Commit:

```bash
git add apps/admin/src/lib/metrics/env.ts apps/admin/src/lib/metrics/env.test.ts apps/admin/src/lib/metrics/posthog.ts apps/admin/src/lib/metrics/posthog.test.ts
git commit -m "feat(admin): the metrics seam's PostHog HogQL client — env extension, query builders, munging, failure mapping (#187)"
```

### Task 2: `apps/admin` — the CF GraphQL R2 datasets client (TDD)

**Files:**
- Create (test-first): `apps/admin/src/lib/metrics/r2.test.ts`
- Create: `apps/admin/src/lib/metrics/r2.ts`

**Interfaces:**
- Consumes: Task 1's `R2AnalyticsConfig` + `MetricsResult`; `./cf`'s `CF_GRAPHQL_URL`, `MetricsWindow`, `windowToRange`.
- Produces (what Tasks 3–4 consume): `R2_OPS_QUERY`, `R2_STORAGE_QUERY`, `R2_FREE_TIER`, `classifyActionType`, `R2OpsRow`, `R2OpsTotals`, `R2StorageRow`, `R2StorageSample`, `R2StorageMunged`, `StorageMetrics`, `mungeR2Ops`, `storageBucketStart`, `mungeR2Storage`, `fetchStorageMetrics` — shapes fenced below.

**Not here:** server fns or factories (Task 3); UI (Task 4); any `cf.ts` change (the workers document is untouched — the R2 documents live here, side by side).

- [ ] **Step 1: Write the failing tests — `apps/admin/src/lib/metrics/r2.test.ts`**

```ts
// The R2 datasets half of the metrics seam (#187): the two docs-verbatim
// GraphQL documents (field structure pinned from Cloudflare's R2 metrics
// docs), the actionType→class classifier (pinned from R2's pricing docs),
// the gauge munging (storage samples are MAXes within buckets, latest =
// the freshest sample), and the fetch contract with its failure mapping.
// Plain-node over stubbed fetch — no network, no browser.
import { describe, expect, it } from 'vitest';
import type { MetricsEnv } from './env';
import { CF_GRAPHQL_URL, windowToRange } from './cf';
import {
  R2_FREE_TIER,
  R2_OPS_QUERY,
  R2_STORAGE_QUERY,
  classifyActionType,
  fetchStorageMetrics,
  mungeR2Ops,
  mungeR2Storage,
  storageBucketStart,
} from './r2';

const ENV: MetricsEnv = {
  cf: null,
  r2: { token: 'cf-token', accountId: 'account-id', bucket: 'sevendays-media' },
  posthog: null,
  dbUrl: null,
};

describe('the pinned GraphQL documents (R2 metrics docs-verbatim field structure)', () => {
  it('the operations document groups requests by actionType over the bucket filter', () => {
    expect(R2_OPS_QUERY).toBe(
      [
        'query R2Operations($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {',
        '  viewer {',
        '    accounts(filter: {accountTag: $accountTag}) {',
        '      r2OperationsAdaptiveGroups(',
        '        limit: 10000',
        '        filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}',
        '      ) {',
        '        dimensions { actionType }',
        '        sum { requests }',
        '      }',
        '    }',
        '  }',
        '}',
      ].join('\n')
    );
  });

  it('the storage document reads the max gauges, newest first', () => {
    expect(R2_STORAGE_QUERY).toBe(
      [
        'query R2Storage($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {',
        '  viewer {',
        '    accounts(filter: {accountTag: $accountTag}) {',
        '      r2StorageAdaptiveGroups(',
        '        limit: 10000',
        '        filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}',
        '        orderBy: [datetime_DESC]',
        '      ) {',
        '        dimensions { datetime }',
        '        max { objectCount uploadCount payloadSize metadataSize }',
        '      }',
        '    }',
        '  }',
        '}',
      ].join('\n')
    );
  });

  it('the free-tier markers are the spec-pinned decimal values', () => {
    expect(R2_FREE_TIER).toEqual({
      storageBytes: 10_000_000_000,
      classAOps: 1_000_000,
      classBOps: 10_000_000,
    });
  });
});

describe('classifyActionType (the pricing-docs-pinned sets)', () => {
  it('maps writes and lists to A, reads to B, deletes/unknowns to the uncounted free class', () => {
    expect(classifyActionType('PutObject')).toBe('A');
    expect(classifyActionType('ListObjects')).toBe('A');
    expect(classifyActionType('GetObject')).toBe('B');
    expect(classifyActionType('HeadObject')).toBe('B');
    expect(classifyActionType('DeleteObject')).toBeNull();
    expect(classifyActionType('AbortMultipartUpload')).toBeNull();
    expect(classifyActionType('SomeFutureOperation')).toBeNull();
    expect(classifyActionType(null)).toBeNull();
  });
});

describe('mungeR2Ops', () => {
  it('sums requests per class across rows and ignores the free class', () => {
    expect(
      mungeR2Ops([
        { dimensions: { actionType: 'PutObject' }, sum: { requests: 40 } },
        { dimensions: { actionType: 'GetObject' }, sum: { requests: 900 } },
        { dimensions: { actionType: 'DeleteObject' }, sum: { requests: 7 } },
        { dimensions: { actionType: 'PutObject' }, sum: { requests: 10 } },
      ])
    ).toEqual({ classA: 50, classB: 900 });
  });
});

describe('storageBucketStart (the audience-half rule: hourly for 24h, daily otherwise)', () => {
  it('24h buckets by hour; 7d and 30d bucket by day', () => {
    expect(storageBucketStart('2026-10-06T11:41:00.000Z', '24h')).toBe(
      '2026-10-06T11:00:00.000Z'
    );
    expect(storageBucketStart('2026-10-06T11:41:00.000Z', '7d')).toBe(
      '2026-10-06T00:00:00.000Z'
    );
    expect(storageBucketStart('2026-10-06T11:41:00.000Z', '30d')).toBe(
      '2026-10-06T00:00:00.000Z'
    );
  });
});

describe('mungeR2Storage', () => {
  const row = (datetime: string, objectCount: number, payloadSize: number) => ({
    dimensions: { datetime },
    max: { objectCount, uploadCount: 0, payloadSize, metadataSize: 1024 },
  });

  it('buckets samples by window, MAXes the gauges within a bucket, and sorts ascending', () => {
    expect(
      mungeR2Storage(
        [
          row('2026-10-06T11:04:00.000Z', 10, 1_000_000),
          row('2026-10-06T11:41:00.000Z', 12, 900_000),
          row('2026-10-06T09:20:00.000Z', 8, 700_000),
        ],
        '7d'
      ).trend
    ).toEqual([
      { bucketStart: '2026-10-06T00:00:00.000Z', objectCount: 12, payloadSizeBytes: 1_000_000 },
    ]);
  });

  it('latest is the freshest sample, not the first row', () => {
    const munged = mungeR2Storage(
      [row('2026-10-06T11:00:00.000Z', 10, 1_000_000), row('2026-10-07T09:00:00.000Z', 14, 2_000_000)],
      '7d'
    );
    expect(munged.latestObjectCount).toBe(14);
    expect(munged.latestPayloadSizeBytes).toBe(2_000_000);
  });

  it('an empty dataset munges to an empty trend and null latest values, not an error', () => {
    expect(mungeR2Storage([], '7d')).toEqual({
      trend: [],
      latestObjectCount: null,
      latestPayloadSizeBytes: null,
    });
  });
});

describe('fetchStorageMetrics', () => {
  it('posts both documents with bearer auth and the bucket-scoped variables, then munges the union', async () => {
    const calls: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }> = [];
    const fetchImpl = async (url: unknown, init: RequestInit) => {
      calls.push({ url: String(url), init, body: JSON.parse(String(init.body)) });
      const which = calls.length;
      return {
        ok: true,
        json: async () => ({
          data: {
            viewer: {
              accounts: [
                which === 1
                  ? {
                      r2OperationsAdaptiveGroups: [
                        { dimensions: { actionType: 'PutObject' }, sum: { requests: 40 } },
                        { dimensions: { actionType: 'GetObject' }, sum: { requests: 900 } },
                      ],
                    }
                  : {
                      r2StorageAdaptiveGroups: [
                        {
                          dimensions: { datetime: '2026-10-06T11:00:00.000Z' },
                          max: { objectCount: 12, uploadCount: 0, payloadSize: 1_000_000, metadataSize: 1024 },
                        },
                      ],
                    },
              ],
            },
          },
        }),
      };
    };
    const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({
      ok: true,
      data: {
        trend: [
          { bucketStart: '2026-10-06T00:00:00.000Z', objectCount: 12, payloadSizeBytes: 1_000_000 },
        ],
        latestObjectCount: 12,
        latestPayloadSizeBytes: 1_000_000,
        ops: { classA: 40, classB: 900 },
      },
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe(CF_GRAPHQL_URL);
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe('Bearer cf-token');
    expect(calls[0]?.body.variables).toEqual({
      accountTag: 'account-id',
      bucketName: 'sevendays-media',
      since: windowToRange('7d').since,
      until: windowToRange('7d').until,
    });
    expect(calls[1]?.body.query).toBe(R2_STORAGE_QUERY);
  });

  it('an unconfigured r2 group resolves not-configured (no fetch at all)', async () => {
    let fetched = 0;
    const fetchImpl = async () => {
      fetched += 1;
      throw new Error('must not be called');
    };
    const result = await fetchStorageMetrics(
      { cf: null, r2: null, posthog: null, dbUrl: null },
      '7d',
      fetchImpl as unknown as typeof fetch
    );
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetched).toBe(0);
  });

  it('a non-200 response maps to unavailable', async () => {
    const fetchImpl = async () => ({ ok: false, status: 403, json: async () => ({}) });
    const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a GraphQL errors array (HTTP 200) maps to unavailable — the loud detail is log-only', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ data: null, errors: [{ message: 'Unknown field' }] }),
    });
    const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a thrown fetch (network) maps to unavailable', async () => {
    const fetchImpl = async () => {
      throw new Error('network down');
    };
    const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/admin test -- --run src/lib/metrics/r2.test.ts` — fails on the missing module. Record the red.

- [ ] **Step 3: Write `apps/admin/src/lib/metrics/r2.ts`**

```ts
// The R2 datasets client of the metrics seam (#187, ADR-0023): TWO
// documents whose field structure is verbatim from Cloudflare's R2
// metrics docs (r2OperationsAdaptiveGroups grouped by actionType;
// r2StorageAdaptiveGroups max-gauges newest-first), scoped to the media
// bucket, over the same GraphQL endpoint + envelope the workers client
// uses. The Class A/B classification is pinned from R2's pricing docs —
// deletes/aborts and unknown future names are the free class, counted in
// neither total. If the live probe (Task 7) rejects the `Time!` scalar,
// switch both documents to `string!` HERE and in the shape tests — that
// is the one documented fallback (the #186 note, still open).
import type { MetricsResult, R2AnalyticsConfig } from './env';
import type { MetricsWindow } from './cf';
import { CF_GRAPHQL_URL, windowToRange } from './cf';

export const R2_OPS_QUERY = `query R2Operations($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      r2OperationsAdaptiveGroups(
        limit: 10000
        filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}
      ) {
        dimensions { actionType }
        sum { requests }
      }
    }
  }
}`;

export const R2_STORAGE_QUERY = `query R2Storage($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      r2StorageAdaptiveGroups(
        limit: 10000
        filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}
        orderBy: [datetime_DESC]
      ) {
        dimensions { datetime }
        max { objectCount uploadCount payloadSize metadataSize }
      }
    }
  }
}`;

// The free-tier budget markers (spec-pinned): decimal GB — R2 bills
// decimal, formatBytes divides by 1000. A COST SIGNAL, not a quota.
export const R2_FREE_TIER = {
  storageBytes: 10_000_000_000,
  classAOps: 1_000_000,
  classBOps: 10_000_000,
} as const;

// Pinned from developers.cloudflare.com/r2/pricing (2026-10-07).
const CLASS_A_ACTIONS = new Set([
  'ListBuckets',
  'PutBucket',
  'ListObjects',
  'PutObject',
  'CopyObject',
  'CompleteMultipartUpload',
  'CreateMultipartUpload',
  'LifecycleStorageTierTransition',
  'ListMultipartUploads',
  'UploadPart',
  'UploadPartCopy',
  'ListParts',
  'PutBucketEncryption',
  'PutBucketCors',
  'PutBucketLifecycleConfiguration',
]);

const CLASS_B_ACTIONS = new Set([
  'HeadBucket',
  'HeadObject',
  'GetObject',
  'UsageSummary',
  'GetBucketEncryption',
  'GetBucketLocation',
  'GetBucketCors',
  'GetBucketLifecycleConfiguration',
]);

export function classifyActionType(
  actionType: string | null | undefined
): 'A' | 'B' | null {
  if (typeof actionType !== 'string') return null;
  if (CLASS_A_ACTIONS.has(actionType)) return 'A';
  if (CLASS_B_ACTIONS.has(actionType)) return 'B';
  return null;
}

export type R2OpsRow = {
  dimensions: { actionType?: string | null };
  sum: { requests?: number };
};

export type R2OpsTotals = { classA: number; classB: number };

export function mungeR2Ops(rows: R2OpsRow[]): R2OpsTotals {
  const totals = { classA: 0, classB: 0 };
  for (const row of rows) {
    const r2Class = classifyActionType(row.dimensions?.actionType ?? null);
    if (r2Class === 'A') {
      totals.classA += row.sum?.requests ?? 0;
    } else if (r2Class === 'B') {
      totals.classB += row.sum?.requests ?? 0;
    }
  }
  return totals;
}

export type R2StorageRow = {
  dimensions: { datetime: string };
  max: {
    objectCount?: number;
    uploadCount?: number;
    payloadSize?: number;
    metadataSize?: number;
  };
};

export type R2StorageSample = {
  bucketStart: string;
  objectCount: number;
  payloadSizeBytes: number;
};

export type R2StorageMunged = {
  trend: R2StorageSample[];
  latestObjectCount: number | null;
  latestPayloadSizeBytes: number | null;
};

// The audience-half bucketing rule: hourly for 24h (a daily bucket over
// 24 hours is one point), daily for 7d/30d.
export function storageBucketStart(iso: string, window: MetricsWindow): string {
  const date = new Date(iso);
  const hours = window === '24h' ? date.getUTCHours() : 0;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours)
  ).toISOString();
}

export function mungeR2Storage(
  rows: R2StorageRow[],
  window: MetricsWindow
): R2StorageMunged {
  const buckets = new Map<string, R2StorageSample>();
  let latestAt = Number.NEGATIVE_INFINITY;
  let latestObjectCount: number | null = null;
  let latestPayloadSizeBytes: number | null = null;
  for (const row of rows) {
    const datetime = row.dimensions?.datetime ?? '';
    const at = new Date(datetime).getTime();
    if (Number.isNaN(at)) continue;
    if (at > latestAt) {
      latestAt = at;
      latestObjectCount = row.max?.objectCount ?? null;
      latestPayloadSizeBytes = row.max?.payloadSize ?? null;
    }
    const key = storageBucketStart(datetime, window);
    const bucket =
      buckets.get(key) ?? { bucketStart: key, objectCount: 0, payloadSizeBytes: 0 };
    bucket.objectCount = Math.max(bucket.objectCount, row.max?.objectCount ?? 0);
    bucket.payloadSizeBytes = Math.max(bucket.payloadSizeBytes, row.max?.payloadSize ?? 0);
    buckets.set(key, bucket);
  }
  return {
    trend: [...buckets.values()].sort((a, b) => a.bucketStart.localeCompare(b.bucketStart)),
    latestObjectCount,
    latestPayloadSizeBytes,
  };
}

export type StorageMetrics = R2StorageMunged & { ops: R2OpsTotals };

async function fetchR2Dataset<T>(
  r2: R2AnalyticsConfig,
  query: string,
  dataset: 'r2OperationsAdaptiveGroups' | 'r2StorageAdaptiveGroups',
  window: MetricsWindow,
  fetchImpl: typeof fetch
): Promise<T[]> {
  const { since, until } = windowToRange(window);
  const res = await fetchImpl(CF_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${r2.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { accountTag: r2.accountId, bucketName: r2.bucket, since, until },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: {
      viewer?: { accounts?: Array<Record<string, unknown>> };
    };
    errors?: Array<{ message?: string }>;
  };
  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors[0]?.message ?? 'GraphQL error');
  }
  const rows = body.data?.viewer?.accounts?.[0]?.[dataset];
  return Array.isArray(rows) ? (rows as T[]) : [];
}

export async function fetchStorageMetrics(
  env: { r2: R2AnalyticsConfig | null },
  window: MetricsWindow,
  fetchImpl: typeof fetch = fetch
): Promise<MetricsResult<StorageMetrics>> {
  const r2 = env.r2;
  if (r2 === null) {
    return { ok: false, reason: 'not-configured' };
  }
  try {
    const [opsRows, storageRows] = await Promise.all([
      fetchR2Dataset<R2OpsRow>(r2, R2_OPS_QUERY, 'r2OperationsAdaptiveGroups', window, fetchImpl),
      fetchR2Dataset<R2StorageRow>(r2, R2_STORAGE_QUERY, 'r2StorageAdaptiveGroups', window, fetchImpl),
    ]);
    return {
      ok: true,
      data: {
        ...mungeR2Storage(storageRows, window),
        ops: mungeR2Ops(opsRows),
      },
    };
  } catch (error) {
    // The loud detail stays log-only (#155): one line naming the source.
    console.error(
      '[metrics] R2 source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}
```

- [ ] **Step 4: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run src/lib/metrics` (14 r2 tests green alongside Task 1's), then `pnpm --filter @sevendays/admin fix`, then `pnpm check`. Admin floor now **13 files / 130 tests**. Commit:

```bash
git add apps/admin/src/lib/metrics/r2.ts apps/admin/src/lib/metrics/r2.test.ts
git commit -m "feat(admin): the metrics seam's R2 datasets client — the two documents, the class classifier, the gauge munging (#187)"
```

### Task 3: `apps/admin` — the two session-gated server fns + the query factories (TDD)

**Files:**
- Modify (test-first): `apps/admin/src/lib/metrics-queries.test.ts` (+2 cases)
- Modify: `apps/admin/src/lib/metrics/metrics.functions.ts`, `apps/admin/src/lib/metrics-queries.ts`

**Interfaces:**
- Consumes: Task 1's `fetchTrafficMetrics` + Task 2's `fetchStorageMetrics`; the existing `requireMetricsSession`, `metricsWindowSchema`, `readMetricsEnv`.
- Produces (what Task 4's screen consumes): server fns `fetchMetricsTraffic`, `fetchMetricsStorage` (each session-gated, startSpan-wrapped, validator `{ window }`); `metricsQueries.traffic(window)` (staleTime 300_000) and `metricsQueries.storage(window)` (staleTime 600_000).

**Not here:** UI (Task 4); the landing provider (Task 5); env/CI wiring (Task 7); any api change (the seam is admin-side by ADR-0023).

- [ ] **Step 1: Write the failing tests**

Append to `apps/admin/src/lib/metrics-queries.test.ts` (inside the existing describe; add nothing else):

```ts
  it('the traffic section stales at 5 minutes and keys on the window', () => {
    expect(metricsQueries.traffic('7d')).toMatchObject({
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    });
    expect(metricsQueries.traffic('24h').queryKey).toEqual(['metrics', 'traffic', '24h']);
    expect(metricsQueries.traffic('7d').queryKey).not.toEqual(
      metricsQueries.traffic('30d').queryKey
    );
  });

  it('the storage section stales at 10 minutes and keys on the window', () => {
    expect(metricsQueries.storage('7d')).toMatchObject({
      staleTime: 600_000,
      refetchOnWindowFocus: true,
    });
    expect(metricsQueries.storage('30d').queryKey).toEqual(['metrics', 'storage', '30d']);
  });
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/admin test -- --run src/lib/metrics-queries.test.ts` — fails on the missing factory properties. Record the red.

- [ ] **Step 3: Extend `apps/admin/src/lib/metrics/metrics.functions.ts`**

Two edits. First, the imports — add to the existing `./cf` import line and add a `./r2` line below the `./db` one, so the import block becomes:

```ts
import { fetchWorkerMetrics, metricsWindowSchema } from './cf';
import { collectContentCensus, collectDbProbes } from './db';
import { readMetricsEnv } from './env';
import { fetchTrafficMetrics } from './posthog';
import { fetchStorageMetrics } from './r2';
```

Second, append after `fetchMetricsContent`:

```ts
export const fetchMetricsTraffic = createServerFn({ method: 'GET' })
  .validator(z.object({ window: metricsWindowSchema }))
  .handler(async ({ data }) => {
    return startSpan({ name: 'metrics traffic' }, async () => {
      await requireMetricsSession();
      return fetchTrafficMetrics(readMetricsEnv(), data.window);
    });
  });

export const fetchMetricsStorage = createServerFn({ method: 'GET' })
  .validator(z.object({ window: metricsWindowSchema }))
  .handler(async ({ data }) => {
    return startSpan({ name: 'metrics storage' }, async () => {
      await requireMetricsSession();
      return fetchStorageMetrics(readMetricsEnv(), data.window);
    });
  });
```

(The fns pass the full `MetricsEnv` — the structural `{ posthog }` / `{ r2 }` parameters of Tasks 1–2 accept it unchanged.)

- [ ] **Step 4: Extend `apps/admin/src/lib/metrics-queries.ts`**

Two edits. First, the imports — the `metrics.functions` import grows to:

```ts
import {
  fetchMetricsContent,
  fetchMetricsDbProbes,
  fetchMetricsStorage,
  fetchMetricsTraffic,
  fetchMetricsWorkers,
} from './metrics/metrics.functions';
```

Second, inside the `metricsQueries` object, after the `content` entry, append:

```ts
  traffic: (window: MetricsWindow) =>
    queryOptions({
      queryKey: ['metrics', 'traffic', window],
      queryFn: () => fetchMetricsTraffic({ data: { window } }),
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    }),
  storage: (window: MetricsWindow) =>
    queryOptions({
      queryKey: ['metrics', 'storage', window],
      queryFn: () => fetchMetricsStorage({ data: { window } }),
      staleTime: 600_000,
      refetchOnWindowFocus: true,
    }),
```

(The header comment's "system 60s, content 5m" line becomes "system 60s, content 5m, traffic 5m, storage 10m" — the spec's four.)

- [ ] **Step 5: Green + gates + commit**

`pnpm --filter @sevendays/admin test` (green — **13 files / 132 tests**), then `pnpm --filter @sevendays/admin fix`, then `pnpm check`. Commit:

```bash
git add apps/admin/src/lib/metrics/metrics.functions.ts apps/admin/src/lib/metrics-queries.ts apps/admin/src/lib/metrics-queries.test.ts
git commit -m "feat(admin): the audience half's server fns + query factories — traffic 5m, storage 10m (#187)"
```

### Task 4: `apps/admin` — the Traffic + Storage & Media widgets, the page composition

> **Execution correction (2026-10-07, controller-ruled):** the two fenced section components below access the query payload ONE LEVEL SHALLOW (`traffic.data.totals`, `storage.data.latestObjectCount`, …) — the same plan defect #186's plan carried. The canonical access under the `MetricsResult` envelope is `traffic.data.data.totals` / `storage.data.data.latestObjectCount` (the `useQuery` `data` field holds the result union; `x.data?.ok ? x.data.data.<field>` narrows correctly), exactly as the landed `system-health.tsx` does (`workers.data.data.api.*`). Transcribe the fenced blocks with `.data.data.` at every payload access; everything else is verbatim.

**Skill set (AGENTS.md rule, loads at execution):** `prototype` + `ui-ux-pro-max`, plus `design-system` / `ui-styling` as relevant. The compositions below are the **provisional composition** — Task 6's owner reaction is the ratification gate and may adjust layout/chart modes/hints (never the curated lines' semantics, the data mapping, or the staleTimes). They compose from #186's landed vocabulary only (`WidgetFrame`, `resolveWidgetState`, `TrendChart`, the format helpers) — no new tokens, no new chart components, no new dependencies.

**Files:**
- Modify: `apps/admin/src/components/dashboard/format.ts` (+2 helpers)
- Create: `apps/admin/src/components/dashboard/traffic-section.tsx`, `apps/admin/src/components/dashboard/storage-media.tsx`
- Modify: `apps/admin/src/routes/_shell.index.tsx`

**Interfaces:**
- Consumes: Task 3's `metricsQueries.traffic(window)` / `.storage(window)`; Task 1's `TrafficMetrics` types; Task 2's `StorageMetrics` + `R2_FREE_TIER`; #186's `WidgetFrame`, `resolveWidgetState`, `TrendChart`, `MetricsWindow`, the `format.ts` helpers.
- Produces: the dashboard's audience half at `/` — section order Traffic / System Health / Storage & Media / Content (the spec's); `formatDurationMs` + `formatCls` (also Task 6's prototype).

**Not here:** the variants route (Task 6, untracked); any System Health / Content / Sentry / sidebar / styles.css change (#186's surfaces are untouched); the landing provider (Task 5).

- [ ] **Step 1: The two formatters — append to `apps/admin/src/components/dashboard/format.ts`**

```ts
// Web vitals display (#187): LCP/FCP/INP arrive in milliseconds (seconds
// read better above 1000); CLS is unitless.
export function formatDurationMs(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(1)} s`;
  return `${Math.round(value)} ms`;
}

export function formatCls(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(2);
}
```

- [ ] **Step 2: `apps/admin/src/components/dashboard/traffic-section.tsx` (the provisional composition)**

```tsx
// Traffic (#187): the dashboard's audience half, landing-scoped by the
// host allowlist (the admin's own events never join these numbers).
// Hierarchy-led per the owner's #186 ruling — one primary metric big per
// card, trends as LINE; the lists are lists, not charts. One query for
// the whole section; every card folds to its curated state; the page
// never 500s.
import { useQuery } from '@tanstack/react-query';

import type { MetricsWindow } from '#/lib/metrics/cf';
import { metricsQueries } from '#/lib/metrics-queries';
import { TrendChart } from '../charts/trend-chart';
import { formatCount, formatCls, formatDurationMs } from './format';
import { WidgetFrame, resolveWidgetState } from './widget-frame';

export function TrafficSection({ window }: { window: MetricsWindow }) {
  const traffic = useQuery(metricsQueries.traffic(window));
  const state = resolveWidgetState(
    traffic.isPending,
    traffic.isError,
    traffic.data?.ok,
    traffic.data?.ok === false ? traffic.data.reason : undefined
  );

  return (
    <section className='space-y-4' aria-label='Traffic'>
      <h2 className='text-lg font-semibold tracking-tight'>Traffic</h2>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <WidgetFrame title='Pageviews' badge={window} state={state}>
          {traffic.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(traffic.data.totals.pageviews)}
              </p>
              <TrendChart
                ariaLabel='Pageview trend'
                variant='line'
                data={traffic.data.series.map((point) => ({
                  bucketStart: point.bucketStart,
                  value: point.pageviews,
                }))}
              />
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Unique visitors' badge={window} state={state}>
          {traffic.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(traffic.data.totals.uniques)}
              </p>
              <TrendChart
                ariaLabel='Unique visitor trend'
                variant='line'
                color='var(--chart-4)'
                data={traffic.data.series.map((point) => ({
                  bucketStart: point.bucketStart,
                  value: point.uniques,
                }))}
              />
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Top landing pages' badge={window} state={state}>
          {traffic.data?.ok ? (
            traffic.data.topPages.length === 0 ? (
              <p className='text-muted-foreground h-16 text-xs'>No data in this window.</p>
            ) : (
              <ul className='divide-y'>
                {traffic.data.topPages.map((page) => (
                  <li
                    key={page.path}
                    className='flex items-center justify-between gap-4 py-2 text-sm'
                  >
                    <span className='truncate'>{page.path}</span>
                    <span className='tabular-nums'>{formatCount(page.pageviews)}</span>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Core Web Vitals (p75)' badge={window} state={state}>
          {traffic.data?.ok ? (
            traffic.data.vitals.length === 0 ? (
              <p className='text-muted-foreground h-16 text-xs'>No data in this window.</p>
            ) : (
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-muted-foreground text-left text-xs'>
                    <th className='py-1 font-medium'>Route</th>
                    <th className='py-1 text-right font-medium'>LCP</th>
                    <th className='py-1 text-right font-medium'>CLS</th>
                    <th className='py-1 text-right font-medium'>FCP</th>
                    <th className='py-1 text-right font-medium'>INP</th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {traffic.data.vitals.map((row) => (
                    <tr key={row.route}>
                      <td className='max-w-32 truncate py-1.5'>{row.route}</td>
                      <td className='py-1.5 text-right tabular-nums'>
                        {formatDurationMs(row.lcpP75)}
                      </td>
                      <td className='py-1.5 text-right tabular-nums'>{formatCls(row.clsP75)}</td>
                      <td className='py-1.5 text-right tabular-nums'>
                        {formatDurationMs(row.fcpP75)}
                      </td>
                      <td className='py-1.5 text-right tabular-nums'>
                        {formatDurationMs(row.inpP75)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : null}
        </WidgetFrame>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: `apps/admin/src/components/dashboard/storage-media.tsx` (the provisional composition)**

```tsx
// Storage & Media (#187): R2 stored-bytes trend + object count + the
// Class A/B operation counts with the free-tier budget markers — a COST
// SIGNAL, not a quota (the spec's words). Values are window-scoped; the
// markers are static monthly references labeled as such. One query for
// the whole section; every card folds to its curated state.
import { useQuery } from '@tanstack/react-query';

import type { MetricsWindow } from '#/lib/metrics/cf';
import { metricsQueries } from '#/lib/metrics-queries';
import { R2_FREE_TIER } from '#/lib/metrics/r2';
import { TrendChart } from '../charts/trend-chart';
import { formatBytes, formatCount, formatPercent } from './format';
import { WidgetFrame, resolveWidgetState } from './widget-frame';

export function StorageMediaSection({ window }: { window: MetricsWindow }) {
  const storage = useQuery(metricsQueries.storage(window));
  const state = resolveWidgetState(
    storage.isPending,
    storage.isError,
    storage.data?.ok,
    storage.data?.ok === false ? storage.data.reason : undefined
  );

  return (
    <section className='space-y-4' aria-label='Storage and Media'>
      <h2 className='text-lg font-semibold tracking-tight'>Storage &amp; Media</h2>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <WidgetFrame title='Stored bytes' badge={window} state={state}>
          {storage.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {storage.data.latestPayloadSizeBytes === null
                  ? '—'
                  : formatBytes(storage.data.latestPayloadSizeBytes)}
              </p>
              <TrendChart
                ariaLabel='Stored bytes trend'
                variant='line'
                data={storage.data.trend.map((sample) => ({
                  bucketStart: sample.bucketStart,
                  value: sample.payloadSizeBytes,
                }))}
              />
              <p className='text-muted-foreground text-xs'>
                Free tier: 10 GB-month storage — a cost signal, not a quota.
              </p>
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Objects' badge={window} state={state}>
          {storage.data?.ok ? (
            <p className='text-2xl font-semibold tabular-nums'>
              {storage.data.latestObjectCount === null
                ? '—'
                : formatCount(storage.data.latestObjectCount)}
            </p>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Class A operations' badge={window} state={state}>
          {storage.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(storage.data.ops.classA)}
              </p>
              <p className='text-muted-foreground text-xs'>
                {formatPercent(storage.data.ops.classA / R2_FREE_TIER.classAOps)} of the monthly
                marker
              </p>
              <p className='text-muted-foreground text-xs'>
                Free tier: 1M Class A ops / month — a cost signal, not a quota.
              </p>
            </>
          ) : null}
        </WidgetFrame>
        <WidgetFrame title='Class B operations' badge={window} state={state}>
          {storage.data?.ok ? (
            <>
              <p className='text-2xl font-semibold tabular-nums'>
                {formatCount(storage.data.ops.classB)}
              </p>
              <p className='text-muted-foreground text-xs'>
                {formatPercent(storage.data.ops.classB / R2_FREE_TIER.classBOps)} of the monthly
                marker
              </p>
              <p className='text-muted-foreground text-xs'>
                Free tier: 10M Class B ops / month — a cost signal, not a quota.
              </p>
            </>
          ) : null}
        </WidgetFrame>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: The page — `apps/admin/src/routes/_shell.index.tsx`**

Four edits. First, the header comment's last sentence `The window is a search param (shareable, SSR-stable); Traffic and Storage & Media (#187) compose into this same page later.` becomes `The window is a search param (shareable, SSR-stable); the four sections ride it in the spec's order: Traffic, System Health, Storage & Media, Content.` Second, the imports — add the two section imports (biome settles the alphabetical order: storage-media lands beside content-census/refresh-button, traffic-section after system-health):

```tsx
import { StorageMediaSection } from '#/components/dashboard/storage-media';
import { TrafficSection } from '#/components/dashboard/traffic-section';
```

Third, the subline `'System health, database, and content at a glance.'` becomes `'Traffic, system health, storage, and content at a glance.'`. Fourth, the component body's two section renders become four, in order:

```tsx
      <TrafficSection window={window} />
      <SystemHealth window={window} />
      <StorageMediaSection window={window} />
      <ContentCensusSection />
```

- [ ] **Step 5: Gates + commit**

`pnpm --filter @sevendays/admin fix`, then `pnpm check` (35/35; **13 files / 132 tests** — no test changes in this task), then `pnpm build` (the SSR build proves the sections compile into the Worker bundle; recharts renders empty server-side and paints on hydration — #186's known posture, the skeleton states own the first paint). Commit:

```bash
git add apps/admin/src/components/dashboard/format.ts apps/admin/src/components/dashboard/traffic-section.tsx apps/admin/src/components/dashboard/storage-media.tsx apps/admin/src/routes/_shell.index.tsx
git commit -m "feat(admin): the Analytics Dashboard's audience half — the Traffic + Storage & Media sections at / (#187)"
```

### Task 5: `apps/landing` — pageviews + web vitals on the landing's provider, landing only

**Files:**
- Modify: `apps/landing/src/integrations/posthog/provider.tsx`
- Modify: `apps/landing/.env.example`

**Interfaces:**
- Consumes: nothing from Tasks 1–4 (this is the capture side; the admin is the read side).
- Produces: the landing's `$pageview` (initial + SPA history-change) and `$web_vitals` (LCP/CLS/FCP/INP) events into the PostHog project Traffic reads; the documented `VITE_POSTHOG_*` names.

**Not here:** the admin's provider (untouched — `capture_pageview: false` stands there by ruling); any landing route/component change; any PostHog SDK version change (1.422.5 already supports everything); the dashboard side (Tasks 1–4).

- [ ] **Step 1: The provider — `apps/landing/src/integrations/posthog/provider.tsx` (the config block only changes)**

The file becomes:

```tsx
// #187: the landing's provider alone captures pageviews and Core Web
// Vitals — 'history_change' catches the initial load AND TanStack
// Router's SPA navigations (they flow through the history API), and
// web_vitals autocapture emits $web_vitals with $web_vitals_<NAME>_value
// (LCP/CLS/FCP/INP). The admin's provider deliberately stays
// pageview/vitals-off: Traffic is landing-scoped by the host allowlist,
// and the admin's own events never join it. Options grep-proven against
// the installed posthog-js 1.422.5 / @posthog/types 1.407.1.
import { PostHogProvider as BasePostHogProvider } from '@posthog/react';
import posthog from 'posthog-js';
import type { ReactNode } from 'react';

if (typeof window !== 'undefined' && import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_performance: { web_vitals: true },
    defaults: '2025-11-30',
  });
}

interface PostHogProviderProps {
  children: ReactNode;
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>;
}
```

(The ADMIN's provider keeps its current file byte-for-byte. Its `capture_pageview: false` is now load-bearing — do not "fix" the asymmetry.)

- [ ] **Step 2: `apps/landing/.env.example` — document the names the provider consumes**

Append:

```bash

# PostHog (the landing's audience analytics, #187): pageviews + web
# vitals ride VITE_POSTHOG_KEY — without it the provider stays dormant,
# by design. VITE_POSTHOG_HOST defaults to https://us.i.posthog.com.
# Dev values live in .env.local; prod: the teaser/v1 CI environments.
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
```

- [ ] **Step 3: Gates + commit**

`pnpm --filter @sevendays/landing fix`, then `pnpm check` (35/35 — landing 9 files / 73 tests unchanged: the provider is component-side, the landing suite is lib-seam only), then `pnpm build`. Commit:

```bash
git add apps/landing/src/integrations/posthog/provider.tsx apps/landing/.env.example
git commit -m "feat(landing): pageviews + $web_vitals autocapture on the landing's PostHog provider only (#187)"
```

### Task 6: The rendered variants — the owner's ratification gate

**Skill set:** `prototype` (the rendering discipline) — loaded at execution. This task is the ticket's "rendered variants" acceptance criterion; the #186 Task 5 pattern: compositions rendered as frames over mock data, the owner reacts, the ratified composition lands.

**Files:**
- Create (UNTRACKED — never committed, deleted at Step 5): `apps/admin/src/routes/prototype-audience.tsx`
- Evidence: `.superpowers/sdd/2026-10-07-187-dashboard-audience-half/variants/*.png`

**Not here:** any committed change in this task besides the applied adjustments to Task 4's files (the only durable outputs are those adjustments and the issue comment).

- [ ] **Step 1: The prototype route (ungated, mock data — the prototype-tokens precedent)**

Create `apps/admin/src/routes/prototype-audience.tsx` — a TOP-LEVEL route (outside `_shell`, so no session gate and `playwright screenshot` can reach it), rendering the audience-half composition candidates over inline mock data plus the failure rehearsal. Full file:

```tsx
// PROTOTYPE ONLY (#187 Task 6) — untracked, deleted before the PR. The
// owner-reacted rendered variants: the Traffic + Storage & Media
// composition candidates over mock data (no server fns, no env, no gate
// — the prototype-tokens precedent).
import { createFileRoute } from '@tanstack/react-router';

import { TrendChart } from '#/components/charts/trend-chart';
import { WidgetFrame } from '#/components/dashboard/widget-frame';

export const Route = createFileRoute('/prototype-audience')({
  head: () => ({ meta: [{ title: 'Audience-half variants | prototype' }] }),
  component: PrototypeAudiencePage,
});

const DAYS = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'];
const PAGEVIEWS = [42, 51, 38, 64, 73, 60, 88];
const UNIQUES = [12, 15, 11, 19, 22, 18, 26];

const TOP_PAGES = [
  { path: '/packages', pageviews: 164 },
  { path: '/', pageviews: 121 },
  { path: '/about', pageviews: 58 },
  { path: '/book', pageviews: 31 },
  { path: '/packages/lovestory', pageviews: 12 },
];

const VITALS = [
  { route: '/', lcp: '2.4 s', cls: '0.05', fcp: '0.9 s', inp: '180 ms' },
  { route: '/packages', lcp: '3.1 s', cls: '0.11', fcp: '1.2 s', inp: '210 ms' },
  { route: '/book', lcp: '1.8 s', cls: '0.03', fcp: '0.7 s', inp: '140 ms' },
];

const STORAGE_TREND = [7.2e9, 7.4e9, 7.4e9, 7.9e9, 8.1e9, 8.1e9, 8.4e9];

function SectionHeading({ children }: { children: string }) {
  return <h2 className='mt-10 mb-3 text-lg font-semibold'>{children}</h2>;
}

function VitalsTable() {
  return (
    <table className='w-full text-sm'>
      <thead>
        <tr className='text-muted-foreground text-left text-xs'>
          <th className='py-1 font-medium'>Route</th>
          <th className='py-1 text-right font-medium'>LCP</th>
          <th className='py-1 text-right font-medium'>CLS</th>
          <th className='py-1 text-right font-medium'>FCP</th>
          <th className='py-1 text-right font-medium'>INP</th>
        </tr>
      </thead>
      <tbody className='divide-y'>
        {VITALS.map((row) => (
          <tr key={row.route}>
            <td className='py-1.5'>{row.route}</td>
            <td className='py-1.5 text-right tabular-nums'>{row.lcp}</td>
            <td className='py-1.5 text-right tabular-nums'>{row.cls}</td>
            <td className='py-1.5 text-right tabular-nums'>{row.fcp}</td>
            <td className='py-1.5 text-right tabular-nums'>{row.inp}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrototypeAudiencePage() {
  return (
    <main className='mx-auto max-w-5xl space-y-4 p-6'>
      <h1 className='text-2xl font-semibold'>#187 audience-half variants</h1>

      <SectionHeading>Variant A — Task 4's provisional composition (four cards per section)</SectionHeading>
      <section className='space-y-3' aria-label='Traffic A'>
        <h3 className='font-semibold'>Traffic</h3>
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <WidgetFrame title='Pageviews' badge='7 days' state='ready'>
            <p className='text-2xl font-semibold tabular-nums'>416</p>
            <TrendChart
              ariaLabel='Pageview trend'
              variant='line'
              data={DAYS.map((day, index) => ({ bucketStart: `${day}T00:00:00.000Z`, value: PAGEVIEWS[index] ?? 0 }))}
            />
          </WidgetFrame>
          <WidgetFrame title='Unique visitors' badge='7 days' state='ready'>
            <p className='text-2xl font-semibold tabular-nums'>89</p>
            <TrendChart
              ariaLabel='Unique visitor trend'
              variant='line'
              color='var(--chart-4)'
              data={DAYS.map((day, index) => ({ bucketStart: `${day}T00:00:00.000Z`, value: UNIQUES[index] ?? 0 }))}
            />
          </WidgetFrame>
          <WidgetFrame title='Top landing pages' badge='7 days' state='ready'>
            <ul className='divide-y'>
              {TOP_PAGES.map((page) => (
                <li key={page.path} className='flex items-center justify-between gap-4 py-2 text-sm'>
                  <span className='truncate'>{page.path}</span>
                  <span className='tabular-nums'>{page.pageviews}</span>
                </li>
              ))}
            </ul>
          </WidgetFrame>
          <WidgetFrame title='Core Web Vitals (p75)' badge='7 days' state='ready'>
            <VitalsTable />
          </WidgetFrame>
        </div>
      </section>
      <section className='space-y-3' aria-label='Storage A'>
        <h3 className='font-semibold'>Storage &amp; Media</h3>
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <WidgetFrame title='Stored bytes' badge='7 days' state='ready'>
            <p className='text-2xl font-semibold tabular-nums'>8.4 GB</p>
            <TrendChart
              ariaLabel='Stored bytes trend'
              variant='line'
              data={DAYS.map((day, index) => ({ bucketStart: `${day}T00:00:00.000Z`, value: STORAGE_TREND[index] ?? 0 }))}
            />
            <p className='text-muted-foreground text-xs'>
              Free tier: 10 GB-month storage — a cost signal, not a quota.
            </p>
          </WidgetFrame>
          <WidgetFrame title='Objects' badge='7 days' state='ready'>
            <p className='text-2xl font-semibold tabular-nums'>1,204</p>
          </WidgetFrame>
          <WidgetFrame title='Class A operations' badge='7 days' state='ready'>
            <p className='text-2xl font-semibold tabular-nums'>340,211</p>
            <p className='text-muted-foreground text-xs'>34.02% of the monthly marker</p>
            <p className='text-muted-foreground text-xs'>
              Free tier: 1M Class A ops / month — a cost signal, not a quota.
            </p>
          </WidgetFrame>
          <WidgetFrame title='Class B operations' badge='7 days' state='ready'>
            <p className='text-2xl font-semibold tabular-nums'>2,120,882</p>
            <p className='text-muted-foreground text-xs'>21.21% of the monthly marker</p>
            <p className='text-muted-foreground text-xs'>
              Free tier: 10M Class B ops / month — a cost signal, not a quota.
            </p>
          </WidgetFrame>
        </div>
      </section>

      <SectionHeading>Variant B — stacked pairs (pageviews + uniques in one wide card; storage stat-led)</SectionHeading>
      <div className='grid gap-4 lg:grid-cols-2'>
        <WidgetFrame title='Pageviews + unique visitors' badge='7 days' state='ready'>
          <TrendChart
            ariaLabel='Pageviews'
            variant='line'
            className='h-12 w-full'
            data={DAYS.map((day, index) => ({ bucketStart: `${day}T00:00:00.000Z`, value: PAGEVIEWS[index] ?? 0 }))}
          />
          <TrendChart
            ariaLabel='Uniques'
            variant='line'
            color='var(--chart-4)'
            className='h-12 w-full'
            data={DAYS.map((day, index) => ({ bucketStart: `${day}T00:00:00.000Z`, value: UNIQUES[index] ?? 0 }))}
          />
        </WidgetFrame>
        <WidgetFrame title='Storage &amp; ops (the quiet half)' badge='7 days' state='ready'>
          <ul className='divide-y text-sm'>
            {[
              'Stored bytes — 8.4 GB (free tier 10 GB-month)',
              'Objects — 1,204',
              'Class A ops — 340,211 of 1M monthly marker',
              'Class B ops — 2,120,882 of 10M monthly marker',
            ].map((line) => (
              <li key={line} className='py-1.5'>{line}</li>
            ))}
          </ul>
        </WidgetFrame>
      </div>

      <SectionHeading>Variant C — the failure rehearsal (the new cards' curated + loading states)</SectionHeading>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <WidgetFrame title='Pageviews' badge='7 days' state='not-configured' />
        <WidgetFrame title='Core Web Vitals (p75)' badge='7 days' state='unavailable' />
        <WidgetFrame title='Stored bytes' badge='7 days' state='loading' />
        <WidgetFrame title='Class A operations' badge='7 days' state='unavailable' />
      </div>
    </main>
  );
}
```

(The `routeTree.gen.ts` regen this route triggers is EXPECTED and LOCAL ONLY — the file is untracked and deleted in Step 5; after deletion, `git checkout -- src/routeTree.gen.ts` restores the committed tree byte-identically. Nothing routeTree-shaped ever reaches the PR.)

- [ ] **Step 2: Render + frame**

With the dev server up (`pnpm --filter @sevendays/admin dev`, port 3000), frame all variants (chromium from #189's foundation):

```bash
mkdir -p .superpowers/sdd/2026-10-07-187-dashboard-audience-half/variants
pnpm exec playwright screenshot --viewport-size=1280,2400 http://localhost:3000/prototype-audience .superpowers/sdd/2026-10-07-187-dashboard-audience-half/variants/variants-desktop.png
pnpm exec playwright screenshot --viewport-size=390,2400 http://localhost:3000/prototype-audience .superpowers/sdd/2026-10-07-187-dashboard-audience-half/variants/variants-mobile.png
```

- [ ] **Step 3: The owner's reaction (the gate)**

Post the decision request on #187 (the frames stay local — the #186/#139 evidence precedent; the owner has the checkout):

```bash
gh issue comment 187 --body "Rendered variants for the dashboard's audience half are up (Task 6): .superpowers/sdd/2026-10-07-187-dashboard-audience-half/variants/ in the working checkout — run \`pnpm --filter @sevendays/admin dev\` and open http://localhost:3000/prototype-audience to react live. Decisions requested: (1) composition — A four-cards-per-section (Task 4's provisional, what / renders today) / B stacked pairs + the quiet list, or a mix; (2) the budget-marker presentation — percentage-of-marker line + pinned free-tier sentence, one or both; (3) the vitals table column order + whether to add Google's good/needs-improvement/poor rating tints (values-only today); (4) any copy nits on the new hint lines. React here; the ratified composition then lands and this prototype route is deleted."
```

The executor applies the owner's ruling to Task 4's files (composition/chart/hint adjustments — the curated lines' semantics, the data mapping, and the staleTimes are NOT variant-adjustable; a rating-tint ask adds threshold constants + tint classes to the vitals table only). Then:

- [ ] **Step 4: `pnpm check` re-run** (the adjustments keep it green — **13 files / 132 tests**).

- [ ] **Step 5: Delete the prototype + restore the tree**

```bash
rm apps/admin/src/routes/prototype-audience.tsx
git checkout -- apps/admin/src/routeTree.gen.ts
git status --short   # expects: nothing outside the known-modified Task 4/5 files
```

No commit exists for this task by design (the applied adjustments amend Task 4's files — stage and commit them as the ratification commit):

```bash
git add apps/admin
git commit -m "feat(admin): the owner-ratified audience-half composition — variants reacted (#187)"
```

(If the owner's reaction arrives after the PR opens, the same adjustment lands as a PR commit before merge — the PR body names the variants evidence; the merge gate includes the reaction.)

### Task 7: The env + CI wiring — the three new vars, the notices, the owner handoff, the live probes

**Files:**
- Modify: `apps/admin/.env.example`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the env names Task 1's reader consumes.
- Produces: the deployed teaser + v1 admin Workers carrying `CF_ANALYTICS_BUCKET` + `POSTHOG_LANDING_HOSTS` as `--var`s (the values are per-edition deployment identity; v1's are convention-shaped seeds the ship runbook verifies at cutover — the dedicated v1 PostHog project is born at ship, and v1's landing host flips to the client domain then); updated fail-soft notices; the owner's dev-token handoff; the live probes' evidence.

**Not here:** the v1 CI environment's secret VALUES (ship-day, #191's runbook); any api/landing CI change (the landing's `VITE_POSTHOG_*` ride the existing var-passing if the owner sets them — no new ci.yml plumbing); `.dev.vars` (dev uses `.env.local` via the dev script's dotenv — document, don't create).

- [ ] **Step 1: `apps/admin/.env.example` — document the three new names**

Append at the end of the file:

```bash

# The audience half's vars (#187) — NOT secrets (deployment identity, the
# CF_ANALYTICS_SCRIPT_* precedent): the R2 bucket the storage queries
# scope to; the landing's origins as PostHog's $host reports them
# (location.host — PORT INCLUDED in dev; comma-separated); the optional
# region override (default https://us.i.posthog.com).
CF_ANALYTICS_BUCKET=
POSTHOG_LANDING_HOSTS=
POSTHOG_API_HOST=
```

- [ ] **Step 2: ci.yml — the teaser leg**

Two edits. First, the admin deploy step's run line gains the two vars (full replacement):

```yaml
        run: pnpm exec wrangler deploy --name sevendays-admin --var "API_URL:$API_URL" --var "BETTER_AUTH_URL:$BETTER_AUTH_URL" --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "CF_ANALYTICS_SCRIPT_API:sevendays-api" --var "CF_ANALYTICS_SCRIPT_LANDING:sevendays-landing" --var "CF_ANALYTICS_SCRIPT_ADMIN:sevendays-admin" --var "CF_ANALYTICS_BUCKET:sevendays-media" --var "POSTHOG_LANDING_HOSTS:sevendays-landing.workers.dev"
```

Second, in the existing `Sync admin analytics secrets` step, the two notice lines become:

```yaml
            echo '::notice::CF_ANALYTICS_READ_TOKEN missing from the teaser GitHub environment — the CF-sourced widgets (System Health, Storage & Media) render their curated not-configured state (M6 #186/#187)'
```

and

```yaml
            echo '::notice::PostHog pair missing from the teaser GitHub environment — Traffic renders its curated not-configured state (M6 #187; POSTHOG_LANDING_HOSTS is already a deploy var)'
```

- [ ] **Step 3: ci.yml — the v1 leg mirrors (its own names, seeded values)**

The v1 admin deploy step's run line becomes:

```yaml
        run: pnpm exec wrangler deploy --name sevendays-v1-admin --var "API_URL:$API_URL" --var "BETTER_AUTH_URL:$BETTER_AUTH_URL" --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "CF_ANALYTICS_SCRIPT_API:sevendays-v1-api" --var "CF_ANALYTICS_SCRIPT_LANDING:sevendays-v1-landing" --var "CF_ANALYTICS_SCRIPT_ADMIN:sevendays-v1-admin" --var "CF_ANALYTICS_BUCKET:sevendays-v1-media" --var "POSTHOG_LANDING_HOSTS:sevendays-v1-landing.workers.dev"
```

(The v1 values are convention-shaped seeds: the bucket name + the workers.dev host hold until cutover, when #191's runbook points `POSTHOG_LANDING_HOSTS` at the client's real domain and verifies the bucket name against the provisioned one. The v1 sync step's notices get the same two-line update with `v1` in the environment name.)

- [ ] **Step 4: The owner's dev-token handoff (the R2-pattern handoff, extended)**

Post on #187 (owner-operated; nothing blocks this PR — the fail-soft steps ARE the interim):

```bash
gh issue comment 187 --body "Owner handoff to light the audience half up on teaser (dev-account values per the spec — extends #186's ask): (1) if not yet minted: the CF API token with **Account Analytics:Read** (one token covers Workers AND R2 datasets) + the PostHog **personal API key** (query:read) + the project's numeric id; (2) teaser GitHub-environment secrets: CF_ANALYTICS_READ_TOKEN, POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID (CF_ANALYTICS_BUCKET=sevendays-media and POSTHOG_LANDING_HOSTS=sevendays-landing.workers.dev ride as deploy vars already); (3) local dev: the same CF values + CF_ANALYTICS_BUCKET=sevendays-media + the PostHog pair + POSTHOG_LANDING_HOSTS=localhost:<your landing dev port> into apps/admin/.env.local, and VITE_POSTHOG_KEY (+ VITE_POSTHOG_HOST if eu) into apps/landing/.env.local so the landing starts capturing pageviews + vitals; (4) visit the teaser landing once after (3) — Traffic populates within the minute. Until then the new sections serve their curated not-configured states — the deploy notices name the gap on every run. docs/ship-provisioning-runbook.md (#191) owns the production swap (dedicated v1 PostHog project + real domain in POSTHOG_LANDING_HOSTS at cutover)."
```

- [ ] **Step 5: The live probes (when the dev values exist locally — else record deferred)**

**Probe A — HogQL** (proves the endpoint shape, the parallel-arrays response, `count(distinct)`, `toStartOfDay`, and `quantile(0.75)` acceptance — the one unpinned dialect claim):

```bash
node --env-file=apps/admin/.env.local -e '
(async () => {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
  const query = "select toStartOfDay(timestamp) as day, count() as pageviews, count(distinct distinct_id) as uniques, quantile(0.75)(properties.$web_vitals_LCP_value) as lcp_p75 from events where event = \x27$pageview\x27 and timestamp >= toDateTime(\x27" + since + "\x27) group by day order by day limit 3";
  const res = await fetch(`https://us.i.posthog.com/api/projects/${process.env.POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query }, name: "sevendays-plan-probe" }),
  });
  console.log("status:", res.status);
  console.log(JSON.stringify(await res.json(), null, 2).slice(0, 2000));
})();
'
```

Expected: HTTP 200 with `columns` + `results` as parallel arrays. **If `quantile(0.75)` errors**, apply the documented fallback: switch the four aggregates to `quantileTDigest(0.75)(…)` in `vitalsQuery` AND its shape test, re-run the admin suite, and note the change in the PR body. **If `results` is rows-as-objects**, add the objects-passthrough branch to `zipHogqlRows` (+ its test) instead. Save the transcript to the evidence dir.

**Probe B — the R2 datasets** (proves the field names, the `bucketName` filter, and the `Time!` scalar — #186's still-open question, now answered for all three documents):

```bash
node --env-file=apps/admin/.env.local -e '
(async () => {
  const until = new Date(Math.floor(Date.now() / 1000) * 1000);
  const since = new Date(until.getTime() - 24 * 3600 * 1000);
  const query = `query R2Storage($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {\n  viewer {\n    accounts(filter: {accountTag: $accountTag}) {\n      r2StorageAdaptiveGroups(\n        limit: 10000\n        filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}\n        orderBy: [datetime_DESC]\n      ) {\n        dimensions { datetime }\n        max { objectCount uploadCount payloadSize metadataSize }\n      }\n    }\n  }\n}`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CF_ANALYTICS_READ_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { accountTag: process.env.CLOUDFLARE_ACCOUNT_ID, bucketName: process.env.CF_ANALYTICS_BUCKET || "sevendays-media", since: since.toISOString(), until: until.toISOString() } }),
  });
  console.log("status:", res.status);
  console.log(JSON.stringify(await res.json(), null, 2).slice(0, 2000));
})();
'
```

Expected: HTTP 200 with a `data.viewer.accounts[0].r2StorageAdaptiveGroups` array (possibly empty on a quiet bucket — the shape is what is proven). **If the response's `errors` names the `Time!` scalar**, apply the documented fallback: switch `Time!` to `string!` in `R2_OPS_QUERY` + `R2_STORAGE_QUERY` AND both shape tests — and if the workers document was never probe-verified before, apply the same to `cf.ts`'s `WORKER_INVOCATIONS_QUERY` + its test (one fallback, all three documents, one commit). Save the transcript.

If the dev values do not exist yet, record `live probes deferred — no dev tokens minted (the #186 handoff pending)` in the evidence dir and proceed — the curated states + the two documented fallbacks carry the risk, exactly as #186 carried the workers probe.

- [ ] **Step 6: Gates + commit**

`pnpm --filter @sevendays/admin fix`, `pnpm check` (35/35 — CI YAML is not biome-checked; eyeball the indent against the neighboring steps), `pnpm build`. Commit:

```bash
git add apps/admin/.env.example .github/workflows/ci.yml
git commit -m "feat(admin): the audience half's env + CI wiring — the bucket/hosts/region vars on both legs, the notices, the handoff (#187)"
```

### Task 8: Gates, docs rotation (box 5 TICKED), PR/merge, the v1 pick, ledger, issue close

**Files:**
- Modify: `docs/plan.md` (M6 box 5 — **ticked**), `docs/progress.md`, `AGENTS.md` (admin floor + status bullet), `docs/agents/v1-picks.md` (ledger row, post-merge)

**Interfaces:**
- Consumes: Tasks 1–7 merged on the branch (+ Task 6's owner reaction recorded on the issue).
- Produces: main carrying the dashboard whole; the v1 pick landed (a plain SPLIT — no ruled divergence); issue #187 closed (which satisfies #190's dashboard dependency alongside #186's).

**Not here:** the Audit Log viewer (#188); the smoke (#190); the runbook (#191); the M6 close (#192).

- [ ] **Step 1: Full repo gates**

`docker compose up -d db`, then `pnpm check` then `pnpm build`. Expected: check 35/35 turbo tasks; build green. Floors: **admin 13 files / 132 tests** (the audience half's lib-seam coverage: the HogQL documents + munging + failure states, the R2 documents + classifier + munging, the env groups, the staleTimes), api 27 files + 1 skipped / 338 passed + 3 skipped, api-client 5 files / 33 tests, landing 9 files / 73 tests, types 14 files / 118 tests — all untouched. If any count differs, reconcile before proceeding — do not loosen assertions.

- [ ] **Step 2: Rotate the docs**

(a) `docs/plan.md`, Milestone 6 block — box 5 is **shared with #186 and THIS ticket ticks it**. Two edits to the line. First, `- [ ] The **Analytics Dashboard**` → `- [✅] The **Analytics Dashboard**`. Second, the annotation's tail — change

```markdown
; the box stays unticked until Traffic + Storage & Media land at #187)_
```

to

```markdown
; the audience half landed 2026-10-07 via #187 — Traffic (four pinned HogQL documents over the Query API, landing-scoped by the $host allowlist: pageviews/uniques by day, top landing pages, CWV p75 per route; the landing's provider alone captures pageviews + $web_vitals, the admin's stays off by ruling) + Storage & Media (the two R2 dataset documents, the pricing-docs Class A/B classifier, the free-tier budget markers — a cost signal, not a quota), staleTime 5m/10m, +38 admin lib-seam tests; the dashboard is whole)_
```

(b) `docs/progress.md` — three edits. First, the dated entry at the very top (after the `# Progress` heading's blank line):

```markdown
2026-10-07 — #187, M6 ticket 05, the Analytics Dashboard's audience half, landed: Traffic + Storage & Media join #186's dashboard at `/`, riding the same metrics seam (admin server fns, own session gate, ADR-0023 — zero api files touched again). Traffic is PostHog HogQL over the Query API (four pinned documents built by pure functions: the by-day pageviews/uniques series (hourly for 24h), the window-totals document (window uniques are their own query — summed dailies double-count), top-5 pages, CWV p75 per route via quantile(0.75) over $web_vitals_<METRIC>_value), landing-scoped by the $host allowlist (POSTHOG_LANDING_HOSTS — $host = location.host, port included; the admin's own events stay captured but never join Traffic). The landing's PostHog provider alone now captures pageviews ('history_change' — initial + SPA navigations) and web vitals (capture_performance web_vitals); the admin's provider deliberately stays off. Storage & Media is CF GraphQL R2 datasets (two docs-verbatim documents: r2OperationsAdaptiveGroups by actionType + r2StorageAdaptiveGroups max-gauges) with the pricing-docs Class A/B classifier and the free-tier budget markers (10 GB-month / 1M Class A / 10M Class B monthly — a cost signal, not a quota). New env: CF_ANALYTICS_BUCKET + POSTHOG_LANDING_HOSTS + optional POSTHOG_API_HOST (deployment-identity vars, fail-soft like everything in the seam); staleTime 5m (traffic) / 10m (storage); the same curated per-widget failure states; the page still never 500s. Owner-reacted rendered variants rode Task 6; the live HogQL/R2 probes ride the dev-token handoff (deferred pattern, with the quantile/Time-scalar fallbacks pre-ruled). Gates: admin 11→13 files / 94→132 tests, `pnpm check` 35/35, `pnpm build` green; zero new dependencies. The M6 dashboard box is TICKED — the dashboard is whole. NOT landed: the Audit Log viewer (#188).
```

Second, in the Known Gaps list, replace the #186 dashboard bullet (the one beginning `- The admin's **Analytics Dashboard system half** is live (M6 #186, 2026-10-06):` and ending `every CF widget serves its curated not-configured state.`) with:

```markdown
- The admin's **Analytics Dashboard** is live whole (M6 #186 + #187, 2026-10-07): the metrics seam (admin server fns, own session gate, ADR-0023) serving Traffic (PostHog HogQL, landing-scoped by the $host allowlist — pageviews/uniques by day, top landing pages, CWV p75 per route; the landing's provider alone captures pageviews + $web_vitals), System Health (CF GraphQL + DB probes + per-frontend error widgets), Storage & Media (the two R2 dataset documents with the free-tier budget markers — a cost signal, not a quota), Content, and the Sentry link-out at `/`, curated failure states throughout. The dev-account token values remain the owner's teaser-environment handoff (the #187 issue comment) until which every CF/PostHog widget serves its curated not-configured state; the ship-day swap (incl. the dedicated v1 PostHog project and the real domain in POSTHOG_LANDING_HOSTS) is the runbook's (#191).
```

Third, in "Immediate Next Steps" item 1, change `#189 (landed 2026-10-06 — the Playwright pre-flight foundation), **#191** (the ship-provisioning runbook), **#187** (now unblocked — Traffic + Storage & Media ride #186's seam), #188 (now unblocked off #185` to `#189 (landed 2026-10-06 — the Playwright pre-flight foundation), #187 (landed 2026-10-07 — the dashboard's audience half; the Analytics Dashboard is whole), **#191** (the ship-provisioning runbook), #188 (now unblocked off #185`.

(c) `AGENTS.md` — two edits. In the "Current status of `pnpm test`" section, change `The metrics seam's lib-seam suite joins them (M6 #186): CF GraphQL query shapes + widget munging + the DB probes + the curated failure states — admin floor 11 files / 94 tests.` to `The metrics seam's lib-seam suite joins them (M6 #186 + #187): the CF GraphQL + R2 dataset documents, the HogQL documents + munging, the DB probes, and the curated failure states — admin floor 13 files / 132 tests.` And in the "The DB is provisioned…" bullet, change the dashboard sentence's tail `; Traffic + Storage & Media are #187's.` to `; the audience half joined it (M6 #187): Traffic — four pinned HogQL documents landing-scoped by the $host allowlist (pageviews/uniques by day, top pages, CWV p75 per route) with the landing's provider alone capturing pageviews + $web_vitals — and Storage & Media (the two R2 dataset documents, the Class A/B classifier, the free-tier markers) at staleTime 5m/10m; the dashboard is whole.`

- [ ] **Step 3: graphify + commit**

Run: `graphify update .` then commit:

```bash
git add docs/plan.md docs/progress.md AGENTS.md graphify-out
git commit -m "docs: #187 — M6 box 5 TICKED (the dashboard is whole), progress + AGENTS rotation (#187)"
```

- [ ] **Step 4: PR, review, squash-merge**

```bash
git push -u origin feat/187-dashboard-audience-half
gh pr create --base main --title "feat(admin): the Analytics Dashboard's audience half — Traffic + Storage & Media (#187)" --body-file - <<'EOF'
## What

Implements #187 (M6 ticket 05) — § The Analytics Dashboard (Traffic; Storage & Media) of the M6 spec (#182); riding #186's metrics seam per ADR-0023.

- Traffic: four pinned HogQL documents over the PostHog Query API (by-day pageviews/uniques — hourly for the 24h window; window totals as their own document; top-5 pages; CWV p75 per route via quantile(0.75) over $web_vitals_<METRIC>_value), landing-scoped by the $host allowlist (POSTHOG_LANDING_HOSTS — the admin's own events never join).
- The landing's PostHog provider alone captures pageviews ('history_change': initial + SPA) and web vitals (capture_performance: web_vitals); the admin's provider deliberately stays off. The landing's .env.example documents VITE_POSTHOG_*.
- Storage & Media: two docs-verbatim R2 GraphQL documents (operations by actionType; storage max-gauges) + the pricing-docs Class A/B classifier + the free-tier budget markers (10 GB-month / 1M / 10M monthly — a cost signal, not a quota).
- New env (deployment identity, fail-soft): CF_ANALYTICS_BUCKET, POSTHOG_LANDING_HOSTS, optional POSTHOG_API_HOST — ci.yml --vars on both legs; notices updated; the owner handoff is the issue comment.
- staleTime 5m/10m; the same curated per-widget failure states; the page never 500s; zero new dependencies.
- Variants: owner-reacted (Task 6 evidence in .superpowers/). admin 11→13 files / 94→132 tests; pnpm check 35/35, build green. The M6 dashboard box is TICKED.

Live HogQL/R2 probes: [ran and green / deferred — no dev tokens yet; the quantile/Time-scalar fallbacks are pre-ruled in the plan].

The Audit Log viewer is #188's; the smoke #190's; the ship swap #191's.
EOF
```

After CI green on the PR AND the owner's variant reaction is recorded (Task 6's gate — the PR stays open for it if the reaction is pending), squash-merge. The squash commit title: `feat(admin): the Analytics Dashboard's audience half — Traffic + Storage & Media (#187) (#PR_NUMBER)`.

- [ ] **Step 5: The v1 pick (per `docs/agents/v1-picks.md`) — a plain SPLIT this time**

Classification (pre-ruled by the spec's ledger: "Analytics Dashboard | **PICK with recorded SPLIT**"; the SPLIT half — v1's index + sidebar divergence — was **executed at #197**: v1 already carries the dashboard at `/` and the Analytics nav item, so this pick has NO ruled divergence):

- **v1-paths, picked clean:** `apps/admin/src/lib/metrics/posthog.ts` + `posthog.test.ts` + `r2.ts` + `r2.test.ts` (new); `env.ts` + `env.test.ts` + `metrics.functions.ts` + `metrics-queries.ts` + `metrics-queries.test.ts` (modified — the context lines all reference shared metrics files, clean apply expected); `apps/admin/src/components/dashboard/format.ts` + `traffic-section.tsx` + `storage-media.tsx` (new/modified); `apps/admin/src/routes/_shell.index.tsx` (modified — v1's copy is main's dashboard post-#197, so the hunks apply); `apps/admin/.env.example`; `apps/landing/src/integrations/posthog/provider.tsx` + `apps/landing/.env.example` (the spec rules the provider wiring **PICK clean** — v1 reports into the dedicated project post-cutover via env, not code); `.github/workflows/ci.yml` (byte-identical file, both legs).
- **Main-only, dropped:** `docs/plan.md`, `docs/progress.md`, `AGENTS.md` (content-dropped — v1 keeps its client-safe rewrite, the #145/#146 ruling recurring; the AGENTS.md hunk will be a UU to resolve to v1's side), the plan file (`git rm` the clean-add), `graphify-out/`.
- **The `routeTree.gen.ts` codegen hazard does not fire:** no route file is added or removed (the prototype was deleted pre-PR). If the cherry-pick carries any routeTree hunk, restore v1's committed file (`git checkout v1 -- apps/admin/src/routeTree.gen.ts`).
- **No lockfile change exists** (zero new dependencies): `pnpm install --frozen-lockfile` must be green with NO `pnpm-lock.yaml` diff — a diff means the pick carried something extra; re-examine before committing.

Execute per the runbook: `cd ~/Projects/sevendays-v1-seed && git switch v1 && git pull --ff-only origin v1 && git fetch origin main`, `git cherry-pick -n <main-sha>`, drop the main-only paths (`git rm -qrf --ignore-unmatch -- docs/plan.md docs/progress.md AGENTS.md docs/superpowers/plans/2026-10-07-187-dashboard-audience-half.md graphify-out` — DU exits expected; resolve AGENTS.md UU to v1's version), commit with the provenance + `Split:` line:

```text
Split: main-only paths dropped — docs/plan.md, docs/progress.md, AGENTS.md, docs/superpowers/plans/…187….md, graphify-out/
No ruled divergence (the index/sidebar split was #197's); routeTree untouched (no route set change); lockfile untouched (zero new dependencies)
```

Then the locks: `pnpm install --frozen-lockfile` (assert no lockfile diff), `pnpm build:packages && pnpm --filter @sevendays/api build`, `pnpm check` (35/35; **v1 admin floor expected 13 files / 132 tests** — the audience-half tests are booking-free; reconcile actuals), `pnpm build`, the export audit (`cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` — exit 0), push v1, and confirm the run shows `check` + `Deploy v1 (private)` success with `Deploy teaser (main)` skipped. Note for the ledger: v1's CI environment still carries none of the analytics tokens (ship-day swap) — the deployed v1 dashboard serves the curated not-configured states by design; the v1 `--var` values (bucket + workers.dev hosts) are convention-shaped seeds #191 verifies at cutover.

- [ ] **Step 6: Ledger + issue close**

Append one row to `docs/agents/v1-picks.md`'s ledger table (the established format) with the actual SHAs: date 2026-10-07, issue #187, main squash SHA, verdict `split`, v1 SHA, and the description naming: the audience half (the HogQL client's four documents + the $host allowlist scope, the R2 datasets client + the pricing-docs classifier + the free-tier markers, the two server fns + 5m/10m factories, the Traffic/Storage sections at `/`, the landing provider's pageviews + web vitals PICK clean, the three deployment-identity vars + both CI legs' notices); the plain-SPLIT classification (no ruled divergence — #197 carried it; the main-only drops); the locks' results (incl. the v1 admin floor 13/134 and the no-lockfile-change assertion); the CI run numbers; the probe status (ran/deferred). Commit the ledger row to main:

```bash
git checkout main && git pull && git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #187 ledger row — the audience half picked, the provider wiring clean (#187)"
git push
```

Then close the issue:

```bash
gh issue close 187 --comment "Landed via #<PR_NUMBER> (main) + the v1 split <v1_SHA>. admin 13 files / 132 tests on main (the audience half's lib-seam suite); pnpm check 35/35 + pnpm build green; the M6 dashboard box is TICKED — the dashboard is whole. The dev-token handoff is the issue comment above (the curated not-configured states are the interim); the ship-day swap is #191's. The owner's variant reaction is recorded on this issue (Task 6)."
```

