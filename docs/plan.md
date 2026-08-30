# Roadmap

Phased so each milestone ends in something demoable and independently verifiable, per the "small, verifiable tasks" workflow in `AGENTS.md`.

## Milestone 0 — Baseline (complete — exit criteria verified 2026-08-30)

Get the monorepo, apps, and shared packages scaffolded and booting locally. No real features yet.

- [✅] Turborepo + pnpm workspace scaffolded
- [✅] `packages/types` — Zod schemas for Branch, ServicePackage, Appointment
- [✅] `packages/db` — Drizzle schema (stubbed, no live DB)
- [✅] `packages/ui` — shared design tokens (v3-era JS preset removed when apps moved to Tailwind v4, 2026-08-30)
- [✅] `apps/api` — Hono skeleton with `/health`, stub `/api/branches`, stub `/api/appointments`
- [✅] `apps/landing`, `apps/admin` — scaffolded via official TanStack CLI (Cloudflare + shadcn + Sentry + PostHog add-ons)
- [✅] `AGENTS.md` + `docs/` written
- [✅] `pnpm install` verified clean at the root (2026-08-29; `--frozen-lockfile` re-verified 2026-08-30)
- [✅] `pnpm dev` boots all three apps locally without errors (verified 2026-08-30 — api :8787, admin :3000, landing :3001)
- [✅] `pnpm check` (lint + format + typecheck + test) passes across the whole repo (23/23 tasks, 2026-08-30; `pnpm build` also 5/5)
- [✅] Initial commit pushed to GitHub (2026-08-29)

**Exit criteria:** all three apps run locally, `pnpm check` is green, nothing is provisioned in the cloud yet.

## Milestone 1 — Real Data Layer

Move off stub data onto a real, migrated Postgres database.

- [ ] Provision Postgres (Supabase or equivalent) — see `docs/tech-stack.md`
- [ ] Run first Drizzle migration against it
- [ ] `apps/api`'s `/api/branches` and `/api/appointments` read/write real rows instead of stub data
- [ ] Seed script for at least the 3 real branches

**Exit criteria:** a row created via the API is visible in the Postgres database, and survives a redeploy.

## Milestone 2 — Public Booking Flow

The landing site's core feature per the PRD.

- [ ] Landing pages: packages, services, branches (reading from `apps/api`)
- [ ] Booking form: branch → package → date/time → contact info
- [ ] `POST /api/appointments` persists and returns a real appointment
- [ ] Resend integration: confirmation email on successful booking
- [ ] Booking confirmation page/state on the landing site

**Exit criteria:** a real user can complete a booking end-to-end and receive a confirmation email.

## Milestone 3 — Admin Auth + Dashboard

- [ ] BetterAuth wired into `apps/admin` (staff login)
- [ ] `apps/api` verifies BetterAuth sessions on mutating routes
- [ ] Admin dashboard: list appointments, filter by branch/status
- [ ] Admin can update an appointment's status

**Exit criteria:** an admin can log in, see the appointment(s) created in Milestone 2, and change their status.

## Milestone 4 — Admin CMS

- [ ] Admin can create/edit/deactivate service packages
- [ ] Admin can edit branch info (including the walk-in flag)
- [ ] Image upload to R2 for package cover photos
- [ ] Landing site reflects CMS changes without a deploy

**Exit criteria:** an admin can change a package's price or add a new one, and it appears on the landing site immediately.

## Milestone 5 — Production Hardening

- [ ] Real logging via Loglayer + Pino in `apps/api`
- [ ] Sentry wired into `apps/api` (Workers SDK)
- [ ] PostHog booking-funnel events instrumented on `landing`
- [ ] CORS locked down on `apps/api` (currently wide open — see `AGENTS.md` TODO)
- [ ] Basic rate limiting / abuse protection on the public booking endpoint
- [ ] Real domains + Cloudflare custom domain setup for all three apps (Workers routes)

**Exit criteria:** the app is safe to point real customers and the client's team at.

## Explicitly Deferred (post-v1, see PRD "Out of Scope")

- Walk-in queue/tracking per branch
- Staff/photographer scheduling
- Per-branch admin roles/permissions
- Customer accounts and self-service rescheduling
- SMS notifications
