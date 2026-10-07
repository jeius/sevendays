## Project

**Sevendays** — a photography studio with 3 branches. This monorepo contains:

- `apps/landing` — public marketing site + appointment booking (TanStack Start)
- `apps/admin` — internal dashboard for managing content and appointments (TanStack Start)
- `apps/api` — shared backend API (Hono on Cloudflare Workers)
- `packages/api-client` — shared API client: a Hono RPC wrapper over the API's exported `AppType` that Zod-parses every response (ADR-0006); the only supported path from the frontends to the API
- `packages/db` — Drizzle schema + client, shared by `api` (and by `admin`/`landing` server functions where needed)
- `packages/types` — Zod schemas + inferred types, shared across all apps
- `packages/ui` — the shared design system (ADR-0017): semantic token layer (`@sevendays/ui/tokens.css`, imported by both apps) plus the shared shadcn/Base-UI primitive library — M3 #95 wired `shadcn add` from either app to route primitives here (`components.json` trio pinned `base-rhea`/lucide/zinc; the full Tier-1 pull-list live — 22 primitives on disk (`button` #95, 19 names at #100 incl. the transitive `tooltip`, `collapsible` #105, `popover` #111) plus the `use-mobile` hook; `cn` comes from the `cn` package). Apps are Tailwind v4 and own their `@theme` styles
- `packages/config` — shared tooling configs: `ts/{base,node,react,vite}.json` tsconfig variants, `biome/{base,vite,node,worker}.json` tier configs, and a built `@sevendays/config/vitest` entry (run `pnpm build:packages` after a fresh clone — `dist/` is gitignored). Consumers extend via package exports (`@sevendays/config/ts/node`, `@sevendays/config/biome/base` + tier fragment); see `packages/config/AGENTS.md`.

Each app is a **separate deployment** (Cloudflare Workers for all three — `landing`/`admin` are Worker-based TanStack Start via `@cloudflare/vite-plugin`, not Pages). See `docs/architecture.md` for how they connect.

## Commands

Run from the repo root unless noted. All commands are powered by Turborepo and fan out to every app/package that defines the script.

- Install: `pnpm install`
- Build packages: `pnpm build:packages` — on a fresh clone, also run `pnpm --filter @sevendays/api build` before `pnpm check` (the shared client resolves the API's `AppType` from the built `dist/`)
- Dev (all apps): `pnpm dev`
- Dev (single app): `pnpm --filter @sevendays/api dev` (or `@sevendays/landing`, `@sevendays/admin`)
- Build: `pnpm build`
- Lint: `pnpm lint`
- Format: `pnpm format`
- Lint/Format Fix: `pnpm fix` (or `pnpm fix:unsafe` for unsafe fixes)
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- E2E, browser smoke (chromium-only, walks a deployed environment via `E2E_BASE_URL`; never part of `pnpm check` — ADR-0022): first run `pnpm exec playwright install chromium`, then `E2E_BASE_URL=<deployment> pnpm test:e2e`
- Everything (lint + format + typecheck + test): `pnpm check`
- DB schema changes: `pnpm --filter @sevendays/db db:generate` then `pnpm --filter @sevendays/db db:migrate` (requires `DATABASE_MIGRATE_URL` in `packages/db/.env` — the session-mode pooler URL per `docs/adr/0007-database-connection-topology.md`)

### Current status of `pnpm test`

- `apps/api` has real vitest tests. The M5-pinned suite debt is paid (#154): the media, admin-entity, cover, order-guard, and public-read branch gaps are pinned, the api-client loopback suite covers the gallery/testimonials wrappers (+4 tests; 18 in the loopback file), and the live media harness is try/finally-safe with reason-observable HEAD failures. The Sentry capture seam adds four more (`test/sentry-capture.test.ts`, M6 #184), extended by the email + curated-503 capture tests in the appointments/media-routes suites. Floors: api 27 files passed + 1 skipped (28) / 338 passed + 3 skipped; api-client 5 files / 33 tests.
- `apps/landing` runs a real vitest suite (lib-seam tests, since M2 ticket 05).
- `apps/admin` runs a real vitest suite (since M5 ticket 09, #143): landing-style plain-node lib-seam tests over the pure seams (`src/lib/*.test.ts`, plus the `bulk-counts` confirm-naming seam from #155) — no component/DOM tests, vitest as the only test dependency. The metrics seam's lib-seam suite joins them (M6 #186 + #187): the CF GraphQL + R2 dataset documents, the HogQL documents + munging, the DB probes, and the curated failure states — admin floor 13 files / 132 tests. The api and landing suites remain the behavioral backbones.

The Playwright foundation (M6 #189) lives outside this umbrella: a root `test:e2e` script walks deployed environments (chromium-only; nightly + dispatch in `.github/workflows/e2e.yml`, cached browsers) and never joins `pnpm check` — commit-green and smoke-green stay separate verdicts (ADR-0022).

## Engineering Rules

- **Never commit secrets.** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `POSTHOG_API_KEY` are set via `wrangler secret put` per environment, never in `wrangler.toml`/`.env` files that get committed.
- **Validate all external input with Zod.** Use the schemas in `packages/types` rather than redefining shapes per app. If a new shape is needed, add it to `packages/types`, not inline in a route/component.
- **Database access goes through `packages/db`.** Don't hand-write SQL or open a second Postgres client elsewhere. Schema changes are Drizzle migrations, generated via `db:generate`, never edited by hand in `packages/db/migrations`.
- **The DB is provisioned, the catalog is seeded, and auth is wired in.** `packages/db`'s client works against the live Supabase database (migrations 0000–0007 applied, catalog seeded + verified; the M5 gallery/testimonials tables exist, CMS-born-empty). BetterAuth 1.7.5 is integrated (M4, closed 2026-09-23): staff email+password login at the admin, sessions verified by the API over the shared tables (ADR-0004), the appointments list session-gated. Staff provisioning and password resets are owner-operated — `docs/staff-provisioning.md` is the runbook. The `sevendays-media` bucket is provisioned and the API's media seam is wired (M5 ticket 02): `MEDIA_BUCKET` + `IMAGES` bindings, the session-gated presign endpoint and commit contract, thumbnails over the Images binding, a missing-credentials presign answers the curated 503 `Media uploads are not configured.` (#155 — the leak-safe detail channel; the loud detail stays log-only — since M6 #183, in the structured error event the onError emits, not a console line) — `docs/media-bucket-runbook.md` is the bucket runbook, including the owner handoff for the scoped R2 S3-token secrets. The api's Application Log is live (M6 #183): Loglayer + Pino → Workers Logs with five PII-free event classes and a per-request requestId echoed as X-Request-Id; the wildcard CORS middleware is dropped — browsers stay default-denied, and wrangler tail is the live viewer. Sentry is live on all three apps (M6 #184) under one "sevendays" project: the api via `@sentry/cloudflare` 10.72.0 (`withSentry` wraps the Hono app at `src/worker.ts`, the wrangler main and the SDK's only import site — the vitest graph stays SDK-free behind an injectable no-op-by-default capture seam; every 5xx + the curated 503 + email-send failures captured, 4xx log-only, errors + traces 100%), the frontends errors-only via one `src/instrument.ts` imported first from `router.tsx` (client + SSR + dev; no traces, no replay), `release` = the deployed git SHA via CI's `SENTRY_RELEASE` var, `environment` = dev/teaser/v1, per-app tags, `sendDefaultPii: false`; a deploy without `SENTRY_DSN` serves everything with captures no-op. The Audit Log's write side is live (M6 #185): one audit_log row per committed admin mutation request, written inside the mutation's transaction (create/update/deactivate/reorder, the actor email snapshotted at write, requestId correlated to the Application Log) across the nine entity routers plus the media commit — failed validations and rolled-back transactions record nothing; the owner viewer screen is #188's. The Analytics Dashboard's system half is live (M6 #186): the admin's metrics seam — CF GraphQL + DB probes over packages/db as session-gated server functions (ADR-0023, zero api routes) — serves System Health (incl. the per-frontend error widgets), Content, and the Sentry link-out at `/` behind curated failure states; chart components are the shadcn chart (recharts) vendored app-local on admin `@theme` --chart-* tokens (the #93 reversal; tokens.css amended); the audience half joined it (M6 #187): Traffic — four pinned HogQL documents landing-scoped by the $host allowlist (pageviews/uniques by day, top pages, CWV p75 per route) with the landing's provider alone capturing pageviews + $web_vitals — and Storage & Media (the two R2 dataset documents, the Class A/B classifier, the free-tier markers) at staleTime 5m/10m; the dashboard is whole. The `/api/v1/admin` write model is live (M5 ticket 03): nine entity routers behind the one root `requireSession` — full-object POST/PUT with deactivation as the `isActive` flip, the atomic package save (frames/inclusions/junctions renumbered in-transaction, the cover bound through the commit contract), the two matrix full-replaces, the three order PUTs, slugs generated at create and editable on PUT, every uniqueness collision a 400 with field details. The public read surface is CMS-aware (M5 ticket 04): the package reads order by (position, id), apply the trim rules, and resolve coverImageUrl (raw keys never leave the API); the branches read is active-only while appointment reads still resolve deactivated branches; a deactivated or unknown slug serves the uniform not-found; GET /api/v1/gallery and GET /api/v1/testimonials are live. The landing consumes them (M5 ticket 08): /about renders the tabbed gallery (All first, tabs derived from the fetched payload) and the testimonials slot; the CoverPanel rule (img on coverImageUrl, today's placeholder verbatim on null) governs the packages list, detail, and home featured surfaces; the ruled empty states render (packages line, home featured-strip collapse, portfolio placeholder with the hidden tab row, testimonial coming-soon line). The milestone closed with ticket 09 (#143): the admin lib-seam suite is seated, the `cms-reflection.mjs` exit gate passed on the local stack, and the seed is bootstrap/dev-only (see `packages/db/README.md`).
- **Keep route handlers thin.** In `apps/api`, business logic belongs in a service/module, not inline in the Hono route. Routes: parse/validate input, call a function, return a response.
- **Use `async`/`await`** exclusively; avoid raw Promise chains or callbacks.
- **Shared UI primitives + semantic tokens live in `packages/ui`** — the shadcn monorepo pattern (ADR-0017): `shadcn add` generates shared primitives there on the Base UI base, with one `components.json` per workspace. Brand and page-specific (composed) components stay in each app, app-local and PascalCase. Apps are Tailwind v4 (CSS-first) — theme via `@theme` in each app's `styles.css`; don't duplicate token definitions between `landing` and `admin`.
- **UI work loads the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `design` / `design-system` / `ui-styling` as relevant) — every UI-bearing ticket names its skill set, and new compositions get rendered variants the owner reacts to (spec #94 amendment, ruled in #111).
- **Do not commit code that fails `pnpm check`** (lint + format + typecheck + test) for the packages/apps you touched.
- **Update `docs/progress.md`** at the end of any task that changes what's implemented vs. stubbed, so the next session (human or agent) doesn't have to rediscover it.
- **Tick checklist boxes in `docs/*.md` with the ✅ emoji (`- [✅]`), never plain `[x]`.**
- **Log decisions.** Any nontrivial architectural choice (e.g., how auth sessions are shared across `landing`/`admin`/`api`, or how R2-stored images are served) gets an ADR in `docs/adr/`.

## Directory Structure

```text
sevendays/
├── AGENTS.md
├── turbo.json
├── pnpm-workspace.yaml
├── docs/
│   ├── PRD.md
│   ├── architecture.md
│   ├── tech-stack.md
│   ├── plan.md
│   ├── progress.md
│   ├── adr/
│   └── agents/          # written by /setup-matt-pocock-skills
├── apps/
│   ├── landing/          # TanStack Start — public site + booking
│   ├── admin/            # TanStack Start — dashboard + CMS
│   └── api/              # Hono on Cloudflare Workers
└── packages/
    ├── api-client/        # shared API client — Hono RPC over the API's AppType (ADR-0006)
    ├── db/               # Drizzle schema + client (live DB: migrations applied, catalog seeded)
    ├── types/             # Zod schemas, shared types
    ├── ui/               # shared design system — tokens + shadcn/Base-UI primitives (ADR-0017)
    └── config/           # shared ts/biome/vitest configs
```

## Agent skills

### Issue tracker

GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: root `CONTEXT-MAP.md` pointing at per-context `CONTEXT.md` files. See `docs/agents/domain.md`.

### v1 pick discipline

Every PR squash-merged to `main` is triaged pick / skip / split for the booking-free `v1` branch (ADR-0015). Runbook + ledger: `docs/agents/v1-picks.md` — main-only, never picked.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Better Auth

> The most comprehensive authentication framework for TypeScript

Use the documentation version that matches the Better Auth version installed in the project. Find a relevant page in an index, then fetch its `.md` URL for clean Markdown. Cite the canonical URL without the `.md` suffix.

## Documentation

- [Current documentation index](https://better-auth.com/docs/llms.txt): All pages for the latest stable release.
- [Documentation MCP server](https://mcp.better-auth.com/mcp): Search and retrieve Better Auth documentation from MCP-capable clients.

## Versions

- [v1.7 (Latest)](https://better-auth.com/docs/llms.txt): Documentation for the 1.7.x release line.
- [v1.6](https://better-auth.com/docs/1.6/llms.txt): Documentation for the 1.6.x release line.