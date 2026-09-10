## Project

**Sevendays** — a photography studio with 3 branches. This monorepo contains:

- `apps/landing` — public marketing site (TanStack Start)
- `apps/admin` — internal dashboard for managing content (TanStack Start)
- `apps/api` — shared backend API (Hono on Cloudflare Workers)
- `packages/api-client` — shared API client: a Hono RPC wrapper over the API's exported `AppType` that Zod-parses every response (ADR-0006); the only supported path from the frontends to the API
- `packages/db` — Drizzle schema + client, shared by `api` (and by `admin`/`landing` server functions where needed)
- `packages/types` — Zod schemas + inferred types, shared across all apps
- `packages/ui` — shadcn/ui design tokens (CSS variables); apps are Tailwind v4 and own their `@theme` styles
- `packages/config` — shared tooling configs: `ts/{base,node,react,vite}.json` tsconfig variants, `biome/{base,vite,node,worker}.json` tier configs, and a built `@sevendays/config/vitest` entry (run `pnpm build:packages` after a fresh clone — `dist/` is gitignored). Consumers extend via package exports (`@sevendays/config/ts/node`, `@sevendays/config/biome/base` + tier fragment); see `packages/config/AGENTS.md`.

Each app is a **separate deployment** (Cloudflare Workers for all three — `landing`/`admin` are Worker-based TanStack Start via `@cloudflare/vite-plugin`, not Pages). See `docs/architecture.md` for how they connect.

## Current status

- The database is provisioned (Supabase) and the catalog is seeded: 3 branches, service packages with inclusions, studio services with per-branch applicability, add-on services. Branch phones are `TODO(seed)` placeholders.
- The `appointments` tables in `packages/db` (and their schemas in `packages/types`) ship as **inert schema** — documentation of the data model. No runtime path reads or writes them; treat them as read-only reference and never wire code to them without a decision record.
- BetterAuth is not wired in yet — no admin login exists. Don't build features that assume a logged-in admin user.
- The landing site is informational (packages, services, branches, about). The studio takes customers by phone and walk-in; every primary CTA funnels to `/branches`, where each branch card carries its phone and a `tel:` call link.
- `apps/admin` is scaffolded (auth + CMS come later); `apps/api` exposes read-only catalog endpoints under `/api/v1`.

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
- Everything (lint + format + typecheck + test): `pnpm check`
- DB schema changes: `pnpm --filter @sevendays/db db:generate` then `pnpm --filter @sevendays/db db:migrate` (requires `DATABASE_MIGRATE_URL` in `packages/db/.env` — the session-mode pooler URL per `docs/adr/0007-database-connection-topology.md`)
- Integration tests run against compose Postgres: `docker compose up -d` before `pnpm test` (`TEST_DATABASE_URL` defaults to `postgres://postgres:postgres@localhost:5432/sevendays_test`)

## Engineering Rules

- **Never commit secrets.** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `SENTRY_DSN` are set via `wrangler secret put` per environment, never in `wrangler.toml`/`.env` files that get committed.
- **Validate all external input with Zod.** Use the schemas in `packages/types` rather than redefining shapes per app. If a new shape is needed, add it to `packages/types`, not inline in a route/component.
- **Database access goes through `packages/db`.** Don't hand-write SQL or open a second Postgres client elsewhere. Schema changes are Drizzle migrations, generated via `db:generate`, never edited by hand in `packages/db/migrations`.
- **Keep route handlers thin.** In `apps/api`, business logic belongs in a service/module, not inline in the Hono route. Routes: parse/validate input, call a function, return a response.
- **Use `async`/`await`** exclusively; avoid raw Promise chains or callbacks.
- **Each app owns its UI**, but shared tokens live in `packages/ui` (shadcn CSS variables). Apps are Tailwind v4 (CSS-first) — theme via `@theme` in each app's `styles.css`; don't duplicate token definitions between `landing` and `admin`.
- **Do not commit code that fails `pnpm check`** (lint + format + typecheck + test) for the packages/apps you touched.
- **Log decisions.** Any nontrivial architectural choice (e.g. how auth sessions are shared across `landing`/`admin`/`api`, or how R2-stored images are served) gets an ADR in `docs/adr/`. Numbering gaps in the ADR directory are known and accepted.

## Directory Structure

```text
sevendays/
├── AGENTS.md
├── CONTEXT-MAP.md        # → per-app CONTEXT.md glossaries
├── turbo.json
├── pnpm-workspace.yaml
├── compose.yaml          # local Postgres for integration tests
├── docs/
│   ├── PRD.md
│   ├── architecture.md
│   ├── tech-stack.md
│   ├── catalog.md
│   └── adr/
├── apps/
│   ├── landing/          # TanStack Start — public site
│   ├── admin/            # TanStack Start — dashboard + CMS
│   └── api/              # Hono on Cloudflare Workers
└── packages/
    ├── api-client/        # shared API client — Hono RPC over the API's AppType (ADR-0006)
    ├── db/               # Drizzle schema + client
    ├── types/             # Zod schemas, shared types
    ├── ui/               # shadcn tokens (CSS variables)
    └── config/           # shared ts/biome/vitest configs
```
