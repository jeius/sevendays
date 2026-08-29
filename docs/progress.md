# Progress

_Last updated: 2026-08-29_

## Current Milestone: 0 — Baseline

## What Exists

- Monorepo structure (`apps/`, `packages/`) with pnpm + Turborepo wired up.
- `packages/types`: Zod schemas for `Branch`, `ServicePackage`, `Appointment` — considered stable, extend rather than replace.
- `packages/db`: Drizzle schema for the same 3 entities, plus a `createDbClient()` factory. **No live database is connected.** `drizzle.config.ts` points at a placeholder local connection string that will fail if you actually try to run it against nothing — this is expected until Milestone 1.
- `packages/ui`: shared Tailwind preset + shadcn CSS variables. Not yet consumed by either app's Tailwind config — that wiring is still TODO.
- `apps/api`: Hono app with `/health` (real), `/api/branches` (returns one hardcoded fixture), `/api/appointments` (`POST` validates input with Zod and echoes it back — does not persist). One vitest test for `/health`.
- `apps/landing`, `apps/admin`: freshly scaffolded via `@tanstack/cli create` with the `shadcn`, `sentry`, `posthog` add-ons and Cloudflare deployment target. Still contain the CLI's default starter content — no Sevendays-specific pages yet.
- `AGENTS.md` and `docs/{PRD,architecture,tech-stack,plan}.md` written and current as of this update.

## Known Gaps / Not Yet Done

- `pnpm install` has **not been run and verified** at the repo root since the apps were scaffolded — do this first before writing any new code, since dependency resolution across the workspace hasn't been confirmed clean.
- `pnpm dev` has not been verified to boot all three apps together.
- `packages/config`'s base tsconfig is not yet `extends`-ed by `apps/landing` or `apps/admin` (they currently use the tsconfig the TanStack CLI generated). Low priority — only matters if tsconfig settings drift between apps.
- No auth anywhere yet (BetterAuth not integrated).
- No CI (no `.github/workflows/`) — not set up yet.
- CORS on `apps/api` is wide open (`origin: "*"`) — fine for local dev, must be locked down before Milestone 5.
- Logging is Hono's default `logger()` middleware, not the planned Loglayer + Pino.

## Immediate Next Steps (in order)

1. Run `pnpm install` at the repo root; fix any dependency resolution issues.
2. Run `pnpm dev` and confirm all three apps boot without errors.
3. Run `pnpm check` and fix any lint/typecheck failures introduced by scaffolding.
4. Make the initial commit and push to `https://github.com/jeius/sevendays.git`.
5. Run `/setup-matt-pocock-skills` now that there's a real repo (issue tracker, domain docs).
6. Start Milestone 1 (real Postgres) — see `docs/plan.md`.

## Notes for Future Sessions

- If you're an agent picking this up cold: read `AGENTS.md` first, then this file, then `docs/plan.md` for the current milestone's task list. Don't assume the DB or auth work — check "Known Gaps" above first.
