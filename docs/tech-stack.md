# Tech Stack

## Monorepo

- **Turborepo** — task orchestration/caching across apps and packages (`turbo.json`).
- **pnpm workspaces** — package manager, pinned via `packageManager` in root `package.json`. Use `corepack enable` to get the right version automatically.
- **Node >= 24** — required by `engines` in the root `package.json` (raised from >=20 on 2026-08-30).

## Frontend (`apps/landing`, `apps/admin`)

- **TanStack Start** — full-stack React framework (file-based routing via TanStack Router, SSR, server functions). Scaffolded with the official `@tanstack/cli create` tool, not hand-written, so it tracks upstream conventions.
- **shadcn/ui** — components generated per-app via the shadcn CLI (`components.json` present in both apps), themed by shared CSS variables from `packages/ui` plus each app's Tailwind v4 `@theme` styles.
- **Tailwind CSS v4** — as scaffolded by TanStack CLI (`@tailwindcss/vite`).
- **Cloudflare Workers** — deploy target for all three apps (`landing`/`admin` are Worker-based TanStack Start, not Pages), via `@cloudflare/vite-plugin` + Wrangler (`wrangler.jsonc` in each app; `deploy` runs `wrangler deploy`). Builds emit to `dist/` (TanStack Start 1.168 layout: `dist/client`, `dist/server`, `dist/wrangler.json`) — the scaffold's `.output/` paths are obsolete.

## Backend (`apps/api`)

- **Hono** — HTTP router/framework, deployed as a Cloudflare Worker (`wrangler.toml`).
- **Zod v4** (^4.5.1) — request validation via `@hono/zod-validator`, using shared schemas from `packages/types`.
- **Loglayer + Pino** — structured logging. *Not yet wired in* — the API currently uses Hono's built-in `logger()` middleware as a placeholder. Swap this in when logging requirements firm up.

## Data Layer

- **PostgreSQL** — via Supabase (or another Postgres-compatible free tier — Neon is a reasonable alternative). (Supabase project provisioned; M1.3 applied migration 0000 and seeded the catalog).
- **Drizzle ORM** (^0.45) — schema and query builder, lives in `packages/db`. Schema is written; migration 0000 (with the first-apply FK indexes + natural keys) is applied to the live database and the catalog is seeded — see docs/progress.md.

### Provisioning Postgres (done 2026-08-31 — record of how it was done)

1. Supabase project created; the previous project's 12 Payload tables were removed under owner authorization (public now holds only this project's 10 tables — 8 from migration 0000 plus `frames` and `package_inclusion_attires` from 0001).
2. **Session-mode pooler** string (Project Settings → Database → Connection pooling → Session mode, port 5432 — the plain direct host is IPv6-only) went into `packages/db/.env` as `DATABASE_MIGRATE_URL` for drizzle-kit and the seed scripts; the **transaction-pooled** string (port 6543) into `apps/api/.dev.vars` as `DATABASE_URL` for the Worker runtime.
3. Cloudflare Workers secret: `wrangler secret put DATABASE_URL` from `apps/api` (operator step — done during M1.5's deploy task if not already).
4. Migrations 0000 + 0001 generated from the current schema and applied over the session connection; the catalog was seeded and verified (`pnpm --filter @sevendays/db db:seed` / `db:verify-seed`).

## Auth

- **BetterAuth** — planned for `apps/admin` staff login. *Not yet integrated.* When wired up, BetterAuth's own tables will be generated into `packages/db/src/schema/` (see the TODO comment in `packages/db/src/schema/index.ts`).

## Storage

- **Cloudflare R2** — object storage for portfolio and package images, referenced via a Workers binding in `apps/api/wrangler.toml` (commented out until the bucket is created: `wrangler r2 bucket create sevendays-media`).

## Email

- **Resend** — transactional email for booking confirmations. Requires a `RESEND_API_KEY` secret on `apps/api` once wired in (`wrangler secret put RESEND_API_KEY`).

## Observability

- **Sentry** — error monitoring, scaffolded into `apps/landing` and `apps/admin` via the TanStack CLI add-on. `apps/api` needs its own Sentry Workers SDK setup separately.
- **PostHog** — product analytics, scaffolded into `apps/landing` and `apps/admin` via the TanStack CLI add-on.

## Validation

- **Zod v4** — single source of truth for data shapes, defined once in `packages/types` and consumed by both the API (server-side validation) and the frontends (form validation).

## Testing

- **Vitest 4** — every workspace that owns tests has its own `vitest.config.ts` extending `@sevendays/config/vitest` (a built entry — run `pnpm build:packages` after a fresh clone). See `docs/adr/0003-vitest-4-per-workspace-configs.md` for why per-workspace configs are mandatory.
- Root `vitest.config.ts` composes `packages/` and `apps/` projects for root-level runs and coverage merging; it does not discover a workspace's tests on its own.

## Secrets Checklist (none committed to the repo)

| Secret | Used by | Set via |
|---|---|---|
| `DATABASE_URL` | `apps/api` Worker runtime, local `wrangler dev` | `wrangler secret put` / local `.dev.vars` |
| `DATABASE_MIGRATE_URL` | drizzle-kit + seed/verify scripts (`packages/db`) | local `packages/db/.env` (gitignored) |
| `BETTER_AUTH_SECRET` | `apps/api`, `apps/admin` | `wrangler secret put` |
| `RESEND_API_KEY` | `apps/api` | `wrangler secret put` |
| `SENTRY_DSN` (×3 apps) | all apps | `wrangler secret put` / app env |
| `POSTHOG_API_KEY` (×2 apps) | `landing`, `admin` | app env |
