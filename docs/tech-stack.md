# Tech Stack

## Monorepo

- **Turborepo** — task orchestration/caching across apps and packages (`turbo.json`).
- **pnpm workspaces** — package manager, pinned via `packageManager` in root `package.json`. Use `corepack enable` to get the right version automatically.
- **Node >= 24** — required by `engines` in the root `package.json` (raised from >=20 on 2026-08-30).

## Frontend (`apps/landing`, `apps/admin`)

- **TanStack Start** — full-stack React framework (file-based routing via TanStack Router, SSR, server functions). Scaffolded with the official `@tanstack/cli create` tool, not hand-written, so it tracks upstream conventions.
- **shadcn/ui** — the shadcn monorepo pattern (ADR-0017): one `components.json` per workspace (both apps + `packages/ui`, all pinning the same style/iconLibrary/baseColor), so `shadcn add` routes shared primitives into `packages/ui` on the Base UI base (`cn` comes from the `cn` package); composed brand/page components stay app-local. Themed by the shared semantic token layer plus each app's Tailwind v4 `@theme` styles.
- **Tailwind CSS v4** — as scaffolded by TanStack CLI (`@tailwindcss/vite`).
- **Cloudflare Workers** — deploy target for all three apps (`landing`/`admin` are Worker-based TanStack Start, not Pages), via `@cloudflare/vite-plugin` + Wrangler (`wrangler.jsonc` in each app; `deploy` runs `wrangler deploy`). Builds emit to `dist/` (TanStack Start 1.168 layout: `dist/client` + `dist/server/wrangler.json` — the deployable config, which `wrangler deploy` follows through the vite plugin's `.wrangler/deploy/config.json` redirect; the scaffold's `.output/` paths are obsolete).

## Backend (`apps/api`)

- **Hono** — HTTP router/framework, deployed as a Cloudflare Worker (`wrangler.toml`).
- **Zod v4** (^4.5.1) — request validation via `@hono/zod-validator`, using shared schemas from `packages/types`.
- **Loglayer + Pino** — structured logging. *Not yet wired in* — the API currently uses Hono's built-in `logger()` middleware as a placeholder. Swap this in when logging requirements firm up.

## Data Layer

- **PostgreSQL** — via Supabase (or another Postgres-compatible free tier — Neon is a reasonable alternative). (Supabase project provisioned; M1.3 applied migration 0000 and seeded the catalog).
- **Drizzle ORM** (^0.45) — schema and query builder, lives in `packages/db`. Schema is written; migrations 0000–0004 are applied to the live database and the catalog is seeded (0002–0004 are the M2 wave: studio services, applicability junctions, and the generalized offering model) — see docs/progress.md.

### Provisioning Postgres (done 2026-08-31 — record of how it was done)

1. Supabase project created; the previous project's 12 Payload tables were removed under owner authorization (public now holds only this project's 10 tables — 8 from migration 0000 plus `frames` and `package_inclusion_attires` from 0001).
2. **Session-mode pooler** string (Project Settings → Database → Connection pooling → Session mode, port 5432 — the plain direct host is IPv6-only) went into `packages/db/.env` as `DATABASE_MIGRATE_URL` for drizzle-kit and the seed scripts; the **transaction-pooled** string (port 6543) into `apps/api/.dev.vars` as `DATABASE_URL` for the Worker runtime.
3. Cloudflare Workers secret: `wrangler secret put DATABASE_URL` from `apps/api` (operator step — done during M1.5's deploy task if not already). _(Superseded 2026-09-11: the Worker's `DATABASE_URL` syncs from the `v1` GitHub environment secret on every deploy; see Continuous deploy below.)_
4. Migrations 0000 + 0001 generated from the current schema and applied over the session connection; the catalog was seeded and verified (`pnpm --filter @sevendays/db db:seed` / `db:verify-seed`).

### Continuous deploy (2026-09-11)

Deploys are branch-keyed GitHub Actions (`.github/workflows/ci.yml`), gated on CI green (`needs: check`). Pushes to the tracked branches deploy the three Workers — `sevendays-v1-api`, `sevendays-v1-landing`, `sevendays-v1-admin`. Per-target secrets live as GitHub **environment** secrets — `CLOUDFLARE_API_TOKEN` + `DATABASE_URL` (the api's `DATABASE_URL` syncs from the environment secret on every deploy) — and `API_URL` is an environment **variable** per target: a frontend Worker var that every deploy wipes, so it rides each deploy as `--var`. The `--name` flags pin all Worker targets in the workflow itself. Manual redeploy: `gh run rerun <run-id> --failed` on the latest run. Frontend→API routing in deployed environments goes through the `API` **service binding** (ADR-0016): Cloudflare rejects Worker→Worker subrequests over `*.workers.dev` (error 1042), so the binding — not the public URL — is the production transport; the binding's service name follows the API worker's name.

## Auth

- **BetterAuth 1.7.5** (`better-auth@^1.7.5`, integrated 2026-09-23 — Milestone 4) — `apps/admin` is the auth server: email+password staff login at `/login` with self-serve sign-up disabled; users are provisioned and reset by the owner CLI (`pnpm --filter @sevendays/admin create-staff`); routes mount at `/api/auth/*` with per-request instances over `@sevendays/db` (ADR-0011). `apps/api` runs a verification-only instance (the `bearer` plugin) over the same tables — `requireSession` verifies `Authorization: Bearer` tokens and returns the uniform 401 envelope (ADR-0004); one `BETTER_AUTH_SECRET` is shared across both apps' Workers. The auth tables (user/session/account/verification + rate limit) live in `packages/db/src/schema/auth.ts`, migration 0005.

## Storage

- **Cloudflare R2** — object storage for portfolio and package images, referenced via a Workers binding in `apps/api/wrangler.toml` (commented out until the bucket is created: `wrangler r2 bucket create sevendays-media`).

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
| `SENTRY_DSN` (×3 apps) | all apps | `wrangler secret put` / app env |
| `POSTHOG_API_KEY` (×2 apps) | `landing`, `admin` | app env |
