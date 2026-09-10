# Roadmap

Phased so each milestone ends in something demoable and independently verifiable, per the "small, verifiable tasks" workflow in `AGENTS.md`. Items within a milestone are ordered in execution sequence; the last checkbox of each milestone is its verification step.

## Milestone 0 — Baseline (complete — exit criteria verified 2026-08-30)

Get the monorepo, apps, and shared packages scaffolded and booting locally. No real features yet.

- [✅] Turborepo + pnpm workspace scaffolded
- [✅] `packages/types` — Zod schemas for Branch, ServicePackage, Appointment
- [✅] `packages/db` — Drizzle schema (live: migrations 0000 + 0001 applied, catalog seeded)
- [✅] `packages/ui` — shared design tokens (v3-era JS preset removed when apps moved to Tailwind v4, 2026-08-30)
- [✅] `apps/api` — Hono skeleton with `/health`, stub `/api/branches`, stub `/api/appointments`
- [✅] `apps/landing`, `apps/admin` — scaffolded via official TanStack CLI (Cloudflare + shadcn + Sentry + PostHog add-ons)
- [✅] `AGENTS.md` + `docs/` written
- [✅] `pnpm install` verified clean at the root (2026-08-29; `--frozen-lockfile` re-verified 2026-08-30)
- [✅] `pnpm dev` boots all three apps locally without errors (verified 2026-08-30 — api :8787, admin :3000, landing :3001)
- [✅] `pnpm check` (lint + format + typecheck + test) passes across the whole repo (23/23 tasks, 2026-08-30; `pnpm build` also 5/5)
- [✅] Initial commit pushed to GitHub (2026-08-29)

**Exit criteria:** all three apps run locally, `pnpm check` is green, nothing is provisioned in the cloud yet. _(Verified 2026-08-30; the cloud posture changed under Milestone 1 — Supabase is provisioned and seeded, see the M1 checklist below.)_

## Milestone 1 — Real Data Layer

Move off stub data onto a real, migrated Postgres database, seeded with the studio's real catalog (`docs/catalog.md`). Spec: `docs/specs/2026-08-30-m1-real-data-layer-spec.md` (GitHub issue #2); tickets #3–#7.

Pre-flight — small debt from Milestone 0, cleared before the DB work (CI included so every later milestone is guarded):

- [✅] CI via GitHub Actions: run `pnpm check` + `pnpm build` on push/PR to `main`
- [✅] `.env.example` at the repo root and `.dev.vars.example` for the api Worker (`DATABASE_URL` pooled, `DATABASE_MIGRATE_URL` direct — see ADR-0007); `.dev.vars` gitignored
- [✅] Replace `DATABASE_URI` with `DATABASE_URL` + `DATABASE_MIGRATE_URL` in `turbo.json` `globalPassThroughEnv` (everything reads the new names)
- [✅] Bump `lucide-react` manifests to `^1.37.0` (lockfile already resolved 1.37.0)
- [✅] Align `apps/landing`/`apps/admin` `@types/node` to `^26` (workspace standard)

Data layer:

- [✅] Catalog schema in `packages/types` (Zod: Print sizes, Attires, Inclusions, Add-on Services, appointment Kind) mirrored in `packages/db` (Drizzle), first migration generated (ADR-0009)
- [✅] Create a Supabase project; wire the two connection strings per ADR-0007 (`DATABASE_MIGRATE_URL` for migrations, pooled `DATABASE_URL` as the api Worker secret and `.dev.vars`)
- [✅] Apply the migration (`db:migrate`) over the direct connection
- [✅] Seed script (`db:seed`): 3 real branches (details supplied by the client at seed time), 11 Service Packages with Inclusions from `docs/catalog.md`, Print size + Attire lookups, Add-on Services (Make-up, Hairstyle)
- [✅] Rewrite `/api/branches`, add `/api/service-packages` and `/api/addon-services` (thin routes, logic in service modules)
- [✅] `POST /api/appointments` persists with package + add-on price snapshots and Kind; minimal `GET /api/appointments?branchId=`
- [✅] Integration tests against real Postgres (docker compose locally, CI service container, migrations before tests, fail loud when unreachable — ADR-0008)
- [✅] Verify: create a row via the API, confirm it in Supabase, redeploy and confirm it survived

**Exit criteria:** a row created via the API is visible in the Postgres database, and survives a redeploy; CI runs `pnpm check` on every push. _(Verified 2026-09-02 via the M1.5 exit gate — see `docs/progress.md`.)_

## Milestone 2 — Public Booking Flow

The landing site's core feature per the PRD. Deliberately minimal on validation: reject past dates/times, nothing more — real availability logic is deferred (see the Milestone 3 deferral note).

Pre-flight — shared API client infrastructure (ADR-0006), built once for both frontends before the first real endpoint call. Spec: `docs/specs/2026-08-30-m2-preflight-api-client-spec.md` (GitHub issue #1).

- [✅] `apps/api` restructure: chain route sub-apps, `export type AppType`, move `Env` to an explicit exported type (cross-package type imports can't see the ambient `worker-configuration.d.ts` global); adopt the "always `c.json({ error }, status)`, never bare `c.notFound()`" convention _(2026-09-04 audit note: most of this landed early via M1.4 + candidates A–D — sub-app chaining (`routes/v1.ts`), explicit exported `Env` (`src/env.ts`), and the JSON-error/`notFound` convention are all in; the remaining open pieces are `export type AppType` (grep-verifiable at zero occurrences in `apps/api/src`), the root app's ambient-`Env` usage at `src/index.ts` (`new Hono<{ Bindings: Env }>()` → import from `src/env.js`), and Zod-validating `env.ts` per the amended spec. Tick when AppType lands. 2026-09-04: the three named pieces — AppType export + ./app subpath, Zod-validated Env, ambient-global retirement — landed in this pre-flight task (#21); tick at #25 close-out after end-to-end verification; ticked 2026-09-05 at #25 close-out after end-to-end verification — the named open pieces (AppType export + ./app subpath, Zod-validated Env, ambient-global retirement) landed via #21 and re-verified.)_
- [✅] `packages/api-client` (`@sevendays/api-client`): `createApiClient({ baseUrl, fetch? })` over Hono RPC (`hc<AppType>`, type-only devDep on `@sevendays/api`), Zod-parsed responses, typed `ApiClientError`; `apiErrorSchema` (`{ error, details? }`) added to `packages/types` _(2026-09-04 audit note: `apiErrorSchema` already landed in `packages/types/src/api-error.ts` (with tests) during M1.4 — do not re-create it; the remaining open piece is the client package itself. 2026-09-04: landed in this pre-flight task (#22) as the wrapper-surface client per the pre-plan ruling — route-tree wrapper methods over the raw hc<AppType> client (no parallel hand-typed API description), shared unwrap() gate, typed ApiClientError; tick at #25 close-out after end-to-end verification; ticked 2026-09-05 at #25 close-out — client package + wrapper surface landed #22, re-verified end to end in both apps.)_
- [✅] `API_URL` wired as server-side env in both apps (`.env.local` in dev, Workers vars in prod; no fallback — a missing env fails loudly) _(2026-09-05: admin half landed via #24 — `API_URL` read in `apps/admin/src/lib/api.server.ts` with no fallback, loud-failure verified in dev and under built-worker wrangler dev; `.env.example` added. Landing half landed via #23 — `API_URL` read in `apps/landing/src/lib/api.server.ts` with no fallback, loud-failure verified in dev and under built-worker wrangler dev; `.env.example` added. Tick at #25 close-out; ticked 2026-09-05 at #25 close-out — landing via #23 + admin via #24, both loud-fail-verified and re-verified in the #25 consolidated pass.)_
- [✅] Install `@tanstack/react-query` in `apps/landing` + `apps/admin` with SSR query integration (loader `ensureQueryData` + `useSuspenseQuery` patterns) _(2026-09-05: admin half landed via #24 — react-query ^5.102.8 + react-router-ssr-query ^1.167.2, per-request client in router context, loader `ensureQueryData` + `useSuspenseQuery` verified live. Landing half landed via #23 — same versions and patterns, verified live. Tick at #25 close-out; ticked 2026-09-05 at #25 close-out — landing #23 + admin #24, both verified live and re-verified in the #25 pass.)_
- [✅] Verify: one sample call per app (branches list) flows browser → own server functions → `apps/api` through the client — type-inferred, Zod-parsed, end to end _(2026-09-05: re-verified in one consolidated pass for both landing and admin — dev 200 with all three seeded branches, loud 500 on blank API_URL in both vite dev and built-worker workerd, zero API_URL/origin leakage; see #25.)_

Booking flow — red-penciled 2026-09-07 to match the M2 spec (`docs/specs/2026-09-07-m2-booking-flow-spec.md`, GitHub issue #37; "services" decoded as Studio Services, form flow re-sequenced, email content + mechanics pinned per the M2 wayfinder map):

- [✅] Schema: `studio_services` + `branch_studio_services` (per-branch bookability junction) + `studio_service_addon_services` (add-on applicability matrix); `appointments` generalized to package-or-service (nullable refs, exactly-one CHECK, `packagePriceCents` → `bookedPriceCents`); `service_packages.slug` (unique, backfilled) + `is_featured` — via `db:generate` + `db:migrate`, with re-runnable seed extensions (four studio services, applicability rows, featured flags) _(ticked 2026-09-09 at the docs audit — the schema landed across tickets 01–02 as migrations 0002–0004 + seed extensions; the #41/#42 intake/read work this box waited on closed 2026-09-08.)_
- [✅] API: `GET /api/v1/studio-services` (with embedded `bookableBranchIds`), `GET /api/v1/service-packages/:slug`, public `GET /api/v1/appointments/:id` (same posture as the list until M4 closes both); `POST /api/v1/appointments` generalized — exactly-one offering, service active + bookable-at-branch, add-on applicability on service bookings, all inside the existing intake transaction _(2026-09-08: ticket 04 (#42) landed the three reads + client wrappers; ticket 03 (#41) landed the service-path intake + typed rejections + floor — service path joins the one intake transaction (unknown → inactive → bookable-at-branch), service bookings accept only matrix-linked add-ons (activity-before-matrix owner ruling), `past_datetime` floor in the intake module (schema stays shape-only), REJECTION_MESSAGES 5→10 with module-owned wordings; both tickets compose-proven, full gate green.)_
- [✅] Form + API reject past dates/times — typed `past_datetime` rejection in the intake module (`createAppointmentSchema` stays shape-only); all external input validated with `packages/types` Zod schemas _(2026-09-08: landed with ticket 03 (#41) — at-or-before-now instant comparison in the intake transaction, mocked-clock tests prove the boundary both sides; wording owner-ratified.)_
- [✅] Landing pages: home (featured strip, Studio Services teaser, branches strip), packages list, package detail by slug, branches, services (Studio Services showcase), about — reading from `apps/api`
- [✅] Booking form (prototype variant C — one question per screen, auto-advance): branch → offering (package, or a Studio Service bookable at that branch) → conditional add-ons (screen skipped when none apply, "Skip — no add-ons" otherwise) → date/time (PHT note, hour chips) → contact info (guest flow, no account; deep links `?branch=&package=&service=`)
- [✅] Booking confirmation page `/booking/:id` — snapshot read-back fed by the public single-get (client `appointments.get(id)` + landing server fn) _(2026-09-10: ticket 08 (#46) — `/booking/$id` over the existing single-get + `appointments.get` wrapper (zero-API-diff ticket); snapshot card per the prototype (confirmation #, branch, offering, add-on snapshot prices, PHT schedule, Total, email line, call-the-branch note); names join from the sibling reads, prices never leave the record; unknown id → uniform not-found; `toNotFoundError` promoted to shared `api-404.ts`; typed wizard navigation. Copy veto-flags ride the PR.)_
- [✅] Resend integration: money-free confirmation email (content per the spec — "scheduled" copy, no prices, no booking fee) sent after the DB commit via `ctx.waitUntil` with `Idempotency-Key: booking-confirm/<appointmentId>` (sandbox sender `onboarding@resend.dev`; `wrangler secret put RESEND_API_KEY`; `LANDING_ORIGIN` env for the CTA) _(2026-09-10: ticket 09 (#47) — pure template-literal builder in `services/confirmation-email.ts` (money-free by structure — no price field in the input; pinned from/subject/copy; inline-styled table, Add-on rows name-only / section omitted when none, Notes only when non-null; single CTA to `{LANDING_ORIGIN}/booking/{id}`; uniform HTML escaping) + send-after-commit (`scheduleConfirmationEmail(c.executionCtx, …)` — catch-and-log inside the callback, email failure = booking stands; Resend SDK 6.x `idempotencyKey` option = the Idempotency-Key header; the SDK resolves typed `{ data, error }` failures — checked, not try/catch'd). `RESEND_API_KEY` + `LANDING_ORIGIN` are required env (no fallback — the API_URL posture; integration envs via `test/helpers/env.ts`). Suite 69 → 93. ADR for the send topology rides #48.)_
- [✅] Verify: complete a real booking end-to-end and receive the confirmation email at the Resend account owner's address (julius.porferio.pahama@gmail.com — the sandbox 403s every other recipient) _(2026-09-10: verified live on the local stack — API dev (8787, live Supabase db) + landing dev (3000) + the committed CDP harness: one package booking (with an add-on) and one studio-service booking (with notes) through the real /book wizard, 7/7 harness checks after the read-only regressions stayed green; both rows confirmed in Postgres via `verify-appointment-row.mjs`; Resend accepted both confirmation emails (no failure logs; the owner's key proved send-only so API enumeration 401s — the plan's documented exit-2 fallback applies and the owner's inbox check is the recorded receipt proof; recipient pahamajulius@gmail.com, owner-corrected 2026-09-10 — the roadmap line's julius.porferio.pahama@gmail.com pin has no Resend account, correction recorded in this annotation and in progress.md); rows deleted after the evidence was recorded (M1.5 Q3=A); ADR-0013 + ADR-0014 recorded; see #48.)_

**Exit criteria:** a real user can complete a booking end-to-end and receive a confirmation email.

## Milestone 3 — Booking Availability (deferred — not in current build scope)

Real slot logic behind the booking form: branch business hours + per-slot capacity on a fixed hourly grid (see ADR-0005). Package duration is ignored — every booking occupies one slot. First checkbox confirms the grid with the client before schema work.

**Deferred by the owner, 2026-09-09 — outside the current build scope.** Its slot in the sequence is expected to be taken by the UI/UX design-system milestone (wayfinder map #55). Until availability lands, bookings arrive validated only against the past-datetime floor and are reconciled manually by the studio.

- [ ] Confirm the hourly grid with the client (any off-grid exceptions?)
- [ ] Schema: branch business hours + hourly slot capacity in `packages/types` (Zod) and `packages/db` (Drizzle), via migration
- [ ] Availability API: `GET /api/branches/:id/availability?date=` returns open/closed slots with remaining capacity
- [ ] `POST /api/appointments` rejects out-of-hours and over-capacity bookings with a validation error
- [ ] Landing booking form: the date/time step offers only open slots for the chosen branch (branch → package → open slot → contact info)
- [ ] Seed script extended: real business hours + slot capacity per branch (seed-only editing until the Milestone 5 CMS)
- [ ] Verify: on the landing site, pick a branch and see real open slots; book one; confirm the API rejects a direct out-of-hours/over-capacity attempt

**Exit criteria:** on the landing site, a fully-booked or out-of-hours slot cannot be booked — the picker doesn't offer it, and the API rejects a direct attempt.

## Milestone 4 — Admin Auth + Dashboard

**Versioned-delivery note (2026-09-10):** under the v1/v2 delivery ruling (issue #62), BetterAuth stays v1-track and the appointments dashboard below is **v2-track** — this milestone splits at the post-M2 delivery-versions charting.

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

**Versioned-delivery note (2026-09-10):** booking-specific items below — booking-endpoint rate limiting, Resend sending domain + email check, booking-funnel PostHog events — are **v2-track** under the v1/v2 delivery ruling (issue #62); domains, CORS, logging, and Sentry are the v1 production slice. This milestone splits at the post-M2 delivery-versions charting.

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
- Booking Availability was deferred out of the build scope by the owner (2026-09-09); the UI/UX design-system milestone (wayfinder map #55) is expected to take the M3 slot at its spec close-out.
- Delivery is versioned (owner rulings, 2026-09-09/10): v1 = landing + admin auth + CMS as a booking-free artifact, handed over (repo + account) once the design milestone lands; v2 = booking + appointments admin + availability. Recorded in issue #62; M4/M6 split at the post-M2 delivery-versions charting.
- Milestone 2's pre-flight block (shared API client, ADR-0006) was added 2026-08-30, decided at zero frontend call sites.
- Milestone 2's booking-flow checkboxes were red-penciled 2026-09-07 per the M2 booking-flow spec (`docs/specs/2026-09-07-m2-booking-flow-spec.md`, GitHub issue #37) — the output of the M2 wayfinder map (#31). Original seven-checkbox shape (2026-08-30): landing pages (packages/services/branches), form branch → package → date/time → contact, past-date rejection, POST persistence, Resend integration, confirmation page/state, end-to-end verify.
