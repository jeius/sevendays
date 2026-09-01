# Roadmap

Phased so each milestone ends in something demoable and independently verifiable, per the "small, verifiable tasks" workflow in `AGENTS.md`. Items within a milestone are ordered in execution sequence; the last checkbox of each milestone is its verification step.

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

Move off stub data onto a real, migrated Postgres database, seeded with the studio's real catalog (`docs/catalog.md`). Spec: `docs/specs/2026-08-30-m1-real-data-layer-spec.md` (GitHub issue #2); tickets #3–#7.

Pre-flight — small debt from Milestone 0, cleared before the DB work (CI included so every later milestone is guarded):

- [x] CI via GitHub Actions: run `pnpm check` + `pnpm build` on push/PR to `main`
- [x] `.env.example` at the repo root and `.dev.vars.example` for the api Worker (`DATABASE_URL` pooled, `DATABASE_MIGRATE_URL` direct — see ADR-0007); `.dev.vars` gitignored
- [x] Replace `DATABASE_URI` with `DATABASE_URL` + `DATABASE_MIGRATE_URL` in `turbo.json` `globalPassThroughEnv` (everything reads the new names)
- [x] Bump `lucide-react` manifests to `^1.37.0` (lockfile already resolved 1.37.0)
- [x] Align `apps/landing`/`apps/admin` `@types/node` to `^26` (workspace standard)

Data layer:

- [ ] Catalog schema in `packages/types` (Zod: Print sizes, Attires, Inclusions, Add-on Services, appointment Kind) mirrored in `packages/db` (Drizzle), first migration generated (ADR-0009)
- [x] Create a Supabase project; wire the two connection strings per ADR-0007 (`DATABASE_MIGRATE_URL` for migrations, pooled `DATABASE_URL` as the api Worker secret and `.dev.vars`)
- [x] Apply the migration (`db:migrate`) over the direct connection
- [x] Seed script (`db:seed`): 3 real branches (details supplied by the client at seed time), 11 Service Packages with Inclusions from `docs/catalog.md`, Print size + Attire lookups, Add-on Services (Make-up, Hairstyle)
- [ ] Rewrite `/api/branches`, add `/api/service-packages` and `/api/addon-services` (thin routes, logic in service modules)
- [ ] `POST /api/appointments` persists with package + add-on price snapshots and Kind; minimal `GET /api/appointments?branchId=`
- [ ] Integration tests against real Postgres (docker compose locally, CI service container, migrations before tests, fail loud when unreachable — ADR-0008)
- [ ] Verify: create a row via the API, confirm it in Supabase, redeploy and confirm it survived

**Exit criteria:** a row created via the API is visible in the Postgres database, and survives a redeploy; CI runs `pnpm check` on every push.

## Milestone 2 — Public Booking Flow

The landing site's core feature per the PRD. Deliberately minimal on validation: reject past dates/times, nothing more — real availability logic is Milestone 3.

Pre-flight — shared API client infrastructure (ADR-0006), built once for both frontends before the first real endpoint call. Spec: `docs/specs/2026-08-30-m2-preflight-api-client-spec.md` (GitHub issue #1).

- [ ] `apps/api` restructure: chain route sub-apps, `export type AppType`, move `Env` to an explicit exported type (cross-package type imports can't see the ambient `worker-configuration.d.ts` global); adopt the "always `c.json({ error }, status)`, never bare `c.notFound()`" convention
- [ ] `packages/api-client` (`@sevendays/api-client`): `createApiClient({ baseUrl, fetch? })` over Hono RPC (`hc<AppType>`, type-only devDep on `@sevendays/api`), Zod-parsed responses, typed `ApiClientError`; `apiErrorSchema` (`{ error, details? }`) added to `packages/types`
- [ ] `API_URL` wired as server-side env in both apps (`.env.local` in dev, Workers vars in prod; no fallback — a missing env fails loudly)
- [ ] Install `@tanstack/react-query` in `apps/landing` + `apps/admin` with SSR query integration (loader `ensureQueryData` + `useSuspenseQuery` patterns)
- [ ] Verify: one sample call per app (branches list) flows browser → own server functions → `apps/api` through the client — type-inferred, Zod-parsed, end to end

Booking flow:

- [ ] Landing pages: packages, services, branches (reading from `apps/api`)
- [ ] Booking form: branch → package → date/time → contact info (guest flow, no account)
- [ ] Form + API reject past dates/times; all external input validated with `packages/types` Zod schemas
- [ ] `POST /api/appointments` persists and returns a real appointment
- [ ] Resend integration: confirmation email on successful booking (sandbox sender `onboarding@resend.dev` for now; `wrangler secret put RESEND_API_KEY`)
- [ ] Booking confirmation page/state on the landing site
- [ ] Verify: complete a real booking end-to-end and receive the confirmation email

**Exit criteria:** a real user can complete a booking end-to-end and receive a confirmation email.

## Milestone 3 — Booking Availability

Real slot logic behind the booking form: branch business hours + per-slot capacity on a fixed hourly grid (see ADR-0005). Package duration is ignored — every booking occupies one slot. First checkbox confirms the grid with the client before schema work.

- [ ] Confirm the hourly grid with the client (any off-grid exceptions?)
- [ ] Schema: branch business hours + hourly slot capacity in `packages/types` (Zod) and `packages/db` (Drizzle), via migration
- [ ] Availability API: `GET /api/branches/:id/availability?date=` returns open/closed slots with remaining capacity
- [ ] `POST /api/appointments` rejects out-of-hours and over-capacity bookings with a validation error
- [ ] Landing booking form: the date/time step offers only open slots for the chosen branch (branch → package → open slot → contact info)
- [ ] Seed script extended: real business hours + slot capacity per branch (seed-only editing until the Milestone 5 CMS)
- [ ] Verify: on the landing site, pick a branch and see real open slots; book one; confirm the API rejects a direct out-of-hours/over-capacity attempt

**Exit criteria:** on the landing site, a fully-booked or out-of-hours slot cannot be booked — the picker doesn't offer it, and the API rejects a direct attempt.

## Milestone 4 — Admin Auth + Dashboard

- [ ] BetterAuth wired into `apps/admin` (staff login), with BetterAuth's tables generated into `packages/db/src/schema/` and a migration
- [ ] Set `BETTER_AUTH_SECRET` for `apps/api` and `apps/admin` (`wrangler secret put`)
- [ ] `apps/api` verifies BetterAuth sessions on mutating routes by checking the session token against the shared auth tables (ADR-0004 — no cross-domain cookies)
- [ ] Admin dashboard: list appointments, filter by branch/status
- [ ] Admin can update an appointment's status
- [ ] Verify: an admin logs in, sees the appointment(s) created in Milestone 2, and changes a status

**Exit criteria:** an admin can log in, see the appointment(s) created in Milestone 2, and change their status.

## Milestone 5 — Admin CMS

- [ ] Admin can create/edit/**deactivate** service packages — deactivated means hidden from landing/booking; existing bookings on a deactivated package are untouched (they stay on the dashboard and remain fulfillable)
- [ ] Admin can edit branch info (name, address, phone, walk-in flag) — including business hours and slot capacity (seed-only until now)
- [ ] R2: create the `sevendays-media` bucket with public access and enable the storage binding in `apps/api` (per `docs/tech-stack.md`)
- [ ] Image upload to R2 for package cover photos; landing references public URLs directly
- [ ] Landing site reflects CMS changes without a deploy
- [ ] Verify: change a package's price (or add a new one), upload its cover photo, and confirm it appears on the landing site immediately

**Exit criteria:** an admin can change a package's price or add a new one, and it appears on the landing site immediately.

## Milestone 6 — Production Hardening

- [ ] Real logging via Loglayer + Pino in `apps/api`
- [ ] Sentry wired into `apps/api` (Workers SDK)
- [ ] PostHog booking-funnel events instrumented on `landing`
- [ ] CORS locked down on `apps/api` (currently wide open — see `AGENTS.md` TODO)
- [ ] Rate limiting on the public booking endpoint via the Cloudflare Workers Rate Limiting binding
- [ ] Real domains + Cloudflare custom domain setup for all three apps (Workers routes), verified in DNS
- [ ] Resend sending domain verified (DKIM etc.) — replaces the Milestone 2 sandbox sender
- [ ] End-to-end email check: a booking confirmation sent from the production domain lands in a real inbox (not spam)
- [ ] Verify: `pnpm check`/`pnpm build` green in CI on the release commit, booking works on the production domain

**Exit criteria:** the app is safe to point real customers and the client's team at.

## Explicitly Deferred (post-v1, see PRD "Out of Scope")

- Walk-in queue/tracking per branch
- Staff/photographer scheduling
- Per-branch admin roles/permissions
- Customer accounts and self-service rescheduling
- SMS notifications

---

Plan notes:

- These checkboxes are the single source of truth for milestone progress — `docs/progress.md` narrates verification and dates but does not mirror this list (decided 2026-08-30).
- Milestone 3 (Booking Availability) was added after the original roadmap (2026-08-30); Milestones 4–6 were renumbered from 3–5.
- Milestone 2's pre-flight block (shared API client, ADR-0006) was added 2026-08-30, decided at zero frontend call sites.
