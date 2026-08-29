# Tech Stack

## Monorepo

- **Turborepo** — task orchestration/caching across apps and packages (`turbo.json`).
- **pnpm workspaces** — package manager, pinned via `packageManager` in root `package.json`. Use `corepack enable` to get the right version automatically.

## Frontend (`apps/landing`, `apps/admin`)

- **TanStack Start** — full-stack React framework (file-based routing via TanStack Router, SSR, server functions). Scaffolded with the official `@tanstack/cli create` tool, not hand-written, so it tracks upstream conventions.
- **shadcn/ui** — components generated per-app via the shadcn CLI (`components.json` present in both apps), styled with the shared preset in `packages/ui`.
- **Tailwind CSS v4** — as scaffolded by TanStack CLI (`@tailwindcss/vite`).
- **Cloudflare Workers/Pages** — deploy target, via `@cloudflare/vite-plugin` + Wrangler (`wrangler.jsonc` in each app).

## Backend (`apps/api`)

- **Hono** — HTTP router/framework, deployed as a Cloudflare Worker (`wrangler.toml`).
- **Zod** — request validation via `@hono/zod-validator`, using shared schemas from `packages/types`.
- **Loglayer + Pino** — structured logging. *Not yet wired in* — the API currently uses Hono's built-in `logger()` middleware as a placeholder. Swap this in when logging requirements firm up.

## Data Layer

- **PostgreSQL** — via Supabase (or another Postgres-compatible free tier — Neon is a reasonable alternative). *Not yet provisioned.*
- **Drizzle ORM** — schema and query builder, lives in `packages/db`. Schema is written; migrations have not been generated or run against a real database yet.

### Provisioning Postgres (when ready)

1. Create a Supabase project (or Neon, or any Postgres host).
2. Copy the connection string.
3. Set it locally for `packages/db` in a `.env` file (see `drizzle.config.ts`) for running `db:generate`/`db:migrate` from your machine.
4. Set it as a Cloudflare Workers secret for `apps/api`: `wrangler secret put DATABASE_URL` (run from `apps/api`).
5. Run `pnpm --filter @sevendays/db db:generate` to produce the first migration from the current schema, then `pnpm --filter @sevendays/db db:migrate` to apply it.

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

- **Zod** — single source of truth for data shapes, defined once in `packages/types` and consumed by both the API (server-side validation) and the frontends (form validation).

## Secrets Checklist (none committed to the repo)

| Secret | Used by | Set via |
|---|---|---|
| `DATABASE_URL` | `apps/api`, local `packages/db` scripts | `wrangler secret put` / local `.env` |
| `BETTER_AUTH_SECRET` | `apps/api`, `apps/admin` | `wrangler secret put` |
| `RESEND_API_KEY` | `apps/api` | `wrangler secret put` |
| `SENTRY_DSN` (×3 apps) | all apps | `wrangler secret put` / app env |
| `POSTHOG_API_KEY` (×2 apps) | `landing`, `admin` | app env |
