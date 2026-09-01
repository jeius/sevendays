## Project

**Sevendays** — a photography studio with 3 branches. This monorepo contains:

- `apps/landing` — public marketing site + appointment booking (TanStack Start)
- `apps/admin` — internal dashboard for managing content and appointments (TanStack Start)
- `apps/api` — shared backend API (Hono on Cloudflare Workers)
- `packages/db` — Drizzle schema + client, shared by `api` (and by `admin`/`landing` server functions where needed)
- `packages/types` — Zod schemas + inferred types, shared across all apps
- `packages/ui` — shadcn/ui design tokens (CSS variables); apps are Tailwind v4 and own their `@theme` styles
- `packages/config` — shared tooling configs: `ts/{base,node,react,vite}.json` tsconfig variants, `biome/{base,vite,node,worker}.json` tier configs, and a built `@sevendays/config/vitest` entry (run `pnpm build:packages` after a fresh clone — `dist/` is gitignored). Consumers extend via package exports (`@sevendays/config/ts/node`, `@sevendays/config/biome/base` + tier fragment); see `packages/config/AGENTS.md`.

Each app is a **separate deployment** (Cloudflare Workers for all three — `landing`/`admin` are Worker-based TanStack Start via `@cloudflare/vite-plugin`, not Pages). See `docs/architecture.md` for how they connect.

## Commands

Run from the repo root unless noted. All commands are powered by Turborepo and fan out to every app/package that defines the script.

- Install: `pnpm install`
- Build packages: `pnpm build:packages`
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

### Current status of `pnpm test`

- `apps/api` has real vitest tests.
- `apps/landing` and `apps/admin` currently have a no-op `test` script — no test setup yet. Do not treat a passing `pnpm test` in those apps as real coverage until this is addressed (see `docs/progress.md`).

## Engineering Rules

- **Never commit secrets.** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `POSTHOG_API_KEY` are set via `wrangler secret put` per environment, never in `wrangler.toml`/`.env` files that get committed.
- **Validate all external input with Zod.** Use the schemas in `packages/types` rather than redefining shapes per app. If a new shape is needed, add it to `packages/types`, not inline in a route/component.
- **Database access goes through `packages/db`.** Don't hand-write SQL or open a second Postgres client elsewhere. Schema changes are Drizzle migrations, generated via `db:generate`, never edited by hand in `packages/db/migrations`.
- **The DB and auth are currently stubbed.** `packages/db`'s client works but nothing is provisioned yet, and BetterAuth is not wired in. Don't build features that assume a live database or a logged-in admin user until `docs/progress.md` says otherwise — check there before starting DB- or auth-dependent work.
- **Keep route handlers thin.** In `apps/api`, business logic belongs in a service/module, not inline in the Hono route. Routes: parse/validate input, call a function, return a response.
- **Use `async`/`await`** exclusively; avoid raw Promise chains or callbacks.
- **Each app owns its UI**, but shared tokens live in `packages/ui` (shadcn CSS variables). Apps are Tailwind v4 (CSS-first) — theme via `@theme` in each app's `styles.css`; don't duplicate token definitions between `landing` and `admin`.
- **Do not commit code that fails `pnpm check`** (lint + format + typecheck + test) for the packages/apps you touched.
- **Update `docs/progress.md`** at the end of any task that changes what's implemented vs. stubbed, so the next session (human or agent) doesn't have to rediscover it.
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
    ├── db/               # Drizzle schema + client (stubbed, no live DB yet)
    ├── types/             # Zod schemas, shared types
    ├── ui/               # shadcn tokens (CSS variables)
    └── config/           # shared ts/biome/vitest configs
```

## Agent skills

### Issue tracker

GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: root `CONTEXT-MAP.md` pointing at per-context `CONTEXT.md` files. See `docs/agents/domain.md`.
