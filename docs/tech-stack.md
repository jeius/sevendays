# Tech Stack

## Monorepo

- **Turborepo** — task orchestration/caching across apps and packages (`turbo.json`).
- **pnpm workspaces** — package manager, pinned via `packageManager` in root `package.json`. Use `corepack enable` to get the right version automatically.
- **Node >= 24** — required by `engines` in the root `package.json` (raised from >=20 on 2026-08-30).

## Frontend (`apps/landing`, `apps/admin`)

- **TanStack Start** — full-stack React framework (file-based routing via TanStack Router, SSR, server functions). Scaffolded with the official `@tanstack/cli create` tool, not hand-written, so it tracks upstream conventions.
- **shadcn/ui** — components generated per-app via the shadcn CLI (`components.json` present in both apps), themed by shared CSS variables from `packages/ui` plus each app's Tailwind v4 `@theme` styles.
- **Tailwind CSS v4** — as scaffolded by TanStack CLI (`@tailwindcss/vite`).
- **Cloudflare Workers** — deploy target for all three apps (`landing`/`admin` are Worker-based TanStack Start, not Pages), via `@cloudflare/vite-plugin` + Wrangler (`wrangler.jsonc` in each app; `deploy` runs `wrangler deploy`). Builds emit to `dist/` (TanStack Start 1.168 layout: `dist/client` + `dist/server/wrangler.json` — the deployable config, which `wrangler deploy` follows through the vite plugin's `.wrangler/deploy/config.json` redirect; the scaffold's `.output/` paths are obsolete).

## Backend (`apps/api`)

- **Hono** — HTTP router/framework, deployed as a Cloudflare Worker (`wrangler.toml`).
- **Zod v4** (^4.5.1) — request validation via `@hono/zod-validator`, using shared schemas from `packages/types`.
- **Loglayer + Pino** — structured logging. *Not yet wired in* — the API currently uses Hono's built-in `logger()` middleware as a placeholder. Swap this in when logging requirements firm up.

## Data Layer

- **PostgreSQL** — via Supabase (or another Postgres-compatible free tier — Neon is a reasonable alternative). (Supabase project provisioned; M1.3 applied migration 0000 and seeded the catalog).
- **Drizzle ORM** (^0.45) — schema and query builder, lives in `packages/db`. Schema is written; migrations 0000–0004 are applied to the live database and the catalog is seeded (0002–0004 are the M2 studio-services/appointments wave) — see docs/progress.md.

### Provisioning Postgres (done 2026-08-31 — record of how it was done)

1. Supabase project created; the previous project's 12 Payload tables were removed under owner authorization (public now holds only this project's 10 tables — 8 from migration 0000 plus `frames` and `package_inclusion_attires` from 0001).
2. **Session-mode pooler** string (Project Settings → Database → Connection pooling → Session mode, port 5432 — the plain direct host is IPv6-only) went into `packages/db/.env` as `DATABASE_MIGRATE_URL` for drizzle-kit and the seed scripts; the **transaction-pooled** string (port 6543) into `apps/api/.dev.vars` as `DATABASE_URL` for the Worker runtime.
3. Cloudflare Workers secret: `wrangler secret put DATABASE_URL` from `apps/api` (operator step — done during M1.5's deploy task if not already). _(Superseded 2026-09-11 by #79 for the teaser: the Worker's `DATABASE_URL` now syncs from the `teaser` GitHub environment secret on every deploy; see Continuous deploy below.)_
4. Migrations 0000 + 0001 generated from the current schema and applied over the session connection; the catalog was seeded and verified (`pnpm --filter @sevendays/db db:seed` / `db:verify-seed`).

### Continuous deploy (2026-09-11, #79 — ADR-0015's second lock)

Deploys are branch-keyed GitHub Actions (`.github/workflows/ci.yml`), gated on CI green (`needs: check`). **Push to `main`** deploys the teaser — `sevendays-api`, `sevendays-landing`, `sevendays-admin` on the owner's account (workers.dev subdomain `pahamajulius`, unadvertised); **push to `v1`** deploys `sevendays-v1-api`, `sevendays-v1-landing`, `sevendays-v1-admin` (dormant until the artifact seed creates the branch). Per-target secrets live as GitHub **environment** secrets — `CLOUDFLARE_API_TOKEN` + `DATABASE_URL` on each of `teaser`/`v1` (distinct tokens; the api's `DATABASE_URL` syncs from the environment secret on every deploy, while `RESEND_API_KEY` + `LANDING_ORIGIN` on the teaser api are one-time owner `wrangler secret put`s that survive deploys) — and `API_URL` is an environment **variable** per target: a frontend Worker var that every deploy wipes, so it rides each deploy as `--var`. The `--name` flags pin all six Worker targets (and both secret-syncs) in the workflow itself, so the two editions never share a target, a token, or a secret's source. Manual redeploy: `gh run rerun <run-id> --failed` on the latest `main` run. Frontend→API routing in deployed environments goes through the `API` **service binding** (ADR-0016): Cloudflare rejects Worker→Worker subrequests over `*.workers.dev` (error 1042), so the binding — not the public URL — is the production transport; the v1 seed must rename the binding's service name along with the worker names.

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
