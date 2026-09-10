# Roadmap

Phased so each milestone ends in something demoable and independently verifiable, per the "small, verifiable tasks" workflow in `AGENTS.md`. Items within a milestone are ordered in execution sequence; the last checkbox of each milestone is its verification step.

## Editions — delivery versions (owner rulings 2026-09-09/10, issue #62)

Delivery is versioned. **v1 is the free handover**: a booking-free artifact — landing site + admin auth + CMS + the v1 production slice — handed over whole (repo + accounts) exactly once, after the polish milestones land; post-handover work is paid-only. **v2 is the complete booking system**, delivered as new work after agreement and payment: the M2 booking build (complete on main) re-lands on the client's repo as a fresh change-set, together with the appointments dashboard, availability, and booking-specific hardening. Full ruling record: `docs/specs/2026-09-11-delivery-versions-spec.md` (GitHub issue #76); artifact mechanism: ADR-0015.

- **v1 sequence:** v1 artifact seed (next section) → Milestone 3 (UI/UX design system) → Milestone 4 (admin auth) → Milestone 5 (CMS) → Milestone 6 (v1 production slice) → Milestone 7 (Handover).
- **v2:** uncommissioned — its content is collected under "v2 — The Complete Booking System" below; charted when v2 is commissioned. The offer that commissions it is the money-free offer sheet (spec § The v2 Offer Sheet).

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

## v1 Artifact Seed — the two-edition mechanism (ADR-0015)

First item of the v1 edition: produce the booking-free artifact line once, while the absence inventory is fresh. Ruling record: `docs/specs/2026-09-11-delivery-versions-spec.md` (GitHub issue #76), § The Artifact Mechanism + § The v1 Absence Boundary.

- [ ] Seed the `v1` branch: one `git filter-repo` pass on a fresh clone — booking-only paths removed (`--invert-paths`), shared-file references scrubbed by content rules keyed to the absence inventory, transformed surfaces taking their content from the booking-off direction (spec § The Booking-Off Direction); history rewritten exactly once, at the seed
- [ ] CI on `v1`: `pnpm check` + `pnpm build` on every change to the branch (the typed cascade is the compile-time lock — an incomplete cut cannot typecheck)
- [ ] Continuous private deploy of `v1` to unadvertised owner infra — exercises the env-shed (`env.ts` without the Resend pair) for the whole polish window and feeds the Handover dry-runs
- [ ] Teaser: continuous auto-deploy of `main` to unadvertised owner infra (the owner's own booking-bearing deployment per #62; doubles as staging)
- [ ] Cherry-pick discipline in place from here on: every merged non-booking PR picked to `v1` with `-x`, booking PRs skipped, mixed PRs split; main stays a superset of `v1`
- [ ] Verify: the deployed `v1` artifact serves the booking-free landing (no `/book`, no `/booking/:id`, "Call us" CTAs, `/branches` as the conversion hub) with CI green on the branch

**Exit criteria:** the `v1` branch exists, builds, deploys, and is provably booking-free at HEAD; maintenance is the per-PR pick discipline.

## Milestone 3 — UI/UX Design System (the design milestone — wayfinder map #55)

The design-system milestone seated in the former Booking Availability slot (owner deferral 2026-09-09; seating made real 2026-09-11 per the delivery-versions spec). Its checkboxes land with its spec (map #55's spec task #61, in flight) — this section is the seat, not the scope. The milestone designs both variants of the shared landing surfaces: main's booking-present forms and the ruled v1 booking-off variants (#60 carries the mandate; direction in spec § The Booking-Off Direction).

**Booking Availability — deferred by the owner, 2026-09-09 — outside the current build scope.** It is v2's payload now: the milestone's original content lives under "v2 — The Complete Booking System" below, deferral annotation preserved. Until availability lands, bookings arrive validated only against the past-datetime floor and are reconciled manually by the studio.

**Exit criteria:** per the design milestone's spec (#61).

## Milestone 4 — Admin Auth (v1-track)

**Split made real 2026-09-11 (delivery-versions spec, GitHub issue #76):** BetterAuth is v1-track; the appointments dashboard moved out of this milestone to v2 (ruling 6 of #62).

- [ ] BetterAuth wired into `apps/admin` (staff login), with BetterAuth's tables generated into `packages/db/src/schema/` and a migration
- [ ] Set `BETTER_AUTH_SECRET` for `apps/api` and `apps/admin` (`wrangler secret put`)
- [ ] `apps/api` verifies BetterAuth sessions on mutating routes by checking the session token against the shared auth tables (ADR-0004 — no cross-domain cookies)
- [ ] Verify: an admin logs in against the real BetterAuth tables, and an unauthenticated request to a protected mutating route is rejected

**Exit criteria:** staff can log in, and mutating routes hold the session check.

## Milestone 5 — Admin CMS

- [ ] Admin can create/edit/**deactivate** service packages — deactivated means hidden from landing/booking; existing bookings on a deactivated package are untouched (they stay on the dashboard and remain fulfillable)
- [ ] Admin can edit branch info (name, address, phone, walk-in flag) — including business hours and slot capacity (seed-only until now)
- [ ] R2: create the `sevendays-media` bucket with public access and enable the storage binding in `apps/api` (per `docs/tech-stack.md`)
- [ ] Image upload to R2 for package cover photos; landing references public URLs directly
- [ ] Landing site reflects CMS changes without a deploy
- [ ] Verify: change a package's price (or add a new one), upload its cover photo, and confirm it appears on the landing site immediately

**Exit criteria:** an admin can change a package's price or add a new one, and it appears on the landing site immediately.

## Milestone 6 — Production Hardening (v1 production slice)

**Split made real 2026-09-11 (delivery-versions spec, GitHub issue #76):** domains, CORS, logging, and Sentry are the v1 production slice, joined by ship-time provisioning of the dedicated handover accounts (spec § Handover Mechanics); the booking-specific items — booking-endpoint rate limiting, Resend sending domain + email check, booking-funnel PostHog events — moved to v2.

- [ ] Real logging via Loglayer + Pino in `apps/api`
- [ ] Sentry wired into `apps/api` (Workers SDK)
- [ ] CORS locked down on `apps/api` (currently wide open — see `AGENTS.md` TODO)
- [ ] Ship-time provisioning: dedicated Cloudflare account + dedicated Supabase org/project created at ship-readiness; the three apps, their bindings, and the R2 media bucket provisioned there (teaser/dev infra never co-locates with them)
- [ ] Secrets rotate at ship, not handover: fresh `DATABASE_URL` (new project) + newly generated `BETTER_AUTH_SECRET` + `SENTRY_DSN` as Worker secrets in the dedicated account
- [ ] Real domains + Cloudflare custom domain setup for all three apps (Workers routes) in the dedicated account, verified in DNS
- [ ] Verify: `pnpm check`/`pnpm build` green in CI on the release commit; the v1 deployment (landing + admin + api) works on the production domain from the dedicated accounts

**Exit criteria:** the v1 app is safe to point real customers and the client's team at, running on ship-time-dedicated accounts.

## Milestone 7 — Handover (v1 → the client)

The full handover: repo + accounts, exactly once, after polish (#62 ruling 3). Model: **inherit-in-place** on the ship-time-dedicated accounts — the client is invited into what already runs; nothing rebuilds. The client's entire duty is clickable; the owner operates v1 for its life. Drafted from the delivery-versions spec § Handover Mechanics + § The Artifact Mechanism (ADR-0015).

Pre-handover (owner):

- [ ] Real branch phones from the client replace the `TODO(seed)` placeholders (handover-blocking — every "Call us" CTA funnels to `/branches`)
- [ ] Handover doc written: the client's duty list, the invite → accept → demote sequence, the client's lockout lever (revoke the owner's memberships — instant, zero outage), billing from handover day, and the Sentry-stays-owner-org disclosure
- [ ] Export prepared: a plain single-branch clone of `v1` (`git clone --single-branch --branch v1`)
- [ ] Export audit: `git log -S/-G` token sweeps keyed to the absence inventory (spec § The v1 Absence Boundary) over the exported artifact — zero hits (instrument: `scripts/audit-v1-absence.mjs`, #78 — `node scripts/audit-v1-absence.mjs HEAD --repo <export-clone>`; exit 0 is the gate)
- [ ] Dry-runs: the `v1` continuous private deploy is green through the polish window; `wrangler deploy` succeeds under the owner's scoped roles (fallback: `Administrator` if an operation proves role-starved)

Client guided work (clickable, owner-guided):

- [ ] Client registers the production domain and points nameservers into the dedicated Cloudflare account (the zone is born there — same-account rule)
- [ ] Client accepts the Cloudflare + Supabase invites, sets passwords, stores them in a password manager
- [ ] Client pays from handover day: Supabase Pro upgrade (day one — buys off the Free-tier pause risk), Cloudflare plan as needed, domain renewals

Handover day (owner):

- [ ] Invite the client as Cloudflare **Super Administrator** + Supabase **Owner** — before any demotion — then demote the owner's logins to scoped members (Cloudflare: `Workers Platform Admin` + `R2 Admin` + `DNS`; Supabase: `Developer`)
- [ ] Client's GitHub account created as guided work (~5 min); private repo seeded from the audited export, pushed once as `main`; owner added as write collaborator; no CI in the client's repo
- [ ] Production domain wired as Workers custom domains in the dedicated account; v1 serves on the client's domain
- [ ] Verify: v1 runs live from the client's accounts on the client's domain; a post-handover fix lands on the client's repo as a fast-forward from `v1`; the handover doc (incl. the lockout lever) is delivered

**Exit criteria:** v1 runs live in the client's own accounts on the client's domain; the client holds billing and super-authority; the owner holds scoped operator access + repo write; post-handover work is paid-only.

## v2 — The Complete Booking System (paid; uncommissioned)

Not scheduled. Built on main as normal work only after agreement and payment — the one upsell moment (#62 ruling 4), commissioned by the money-free offer sheet (spec § The v2 Offer Sheet; the polished sheet is produced at commissioning and lives at `docs/client/v2-offer-sheet.md`, main-only, never cherry-picked into `v1`). Delivered to the client's repo as a fresh change-set from main's tree — new commits on the client's own lineage; no merge, no patch-mining, no deploy-only (ADR-0015). The v2 build-out spec is charted when v2 is commissioned (availability's ADR-0005 client reconfirmation, dashboard design, booking-specific hardening).

**Appointments dashboard** (moved out of Milestone 4, 2026-09-11):

- [ ] Admin dashboard: list appointments, filter by branch/status
- [ ] Admin can update an appointment's status
- [ ] Verify: an admin sees the bookings created through the client's booking flow and changes a status

**Booking re-integration** (the M2 build returns):

- [ ] The booking flow re-lands on the client's repo as part of the fresh change-set — `/book`, `/booking/:id`, the `/appointments` mount, the confirmation email, and "Book now" back in header, homepage, and each service (the mirror of the booking-off direction)

**Booking Availability** (formerly Milestone 3 — real slot logic behind the booking form: branch business hours + per-slot capacity on a fixed hourly grid, see ADR-0005; package duration ignored — every booking occupies one slot. **Deferred by the owner, 2026-09-09 — outside the current build scope; v2's payload since 2026-09-11.** Until availability lands, bookings arrive validated only against the past-datetime floor and are reconciled manually by the studio):

- [ ] Confirm the hourly grid with the client (any off-grid exceptions?)
- [ ] Schema: branch business hours + hourly slot capacity in `packages/types` (Zod) and `packages/db` (Drizzle), via migration
- [ ] Availability API: `GET /api/branches/:id/availability?date=` returns open/closed slots with remaining capacity
- [ ] `POST /api/appointments` rejects out-of-hours and over-capacity bookings with a validation error
- [ ] Landing booking form: the date/time step offers only open slots for the chosen branch (branch → package → open slot → contact info)
- [ ] Seed script extended: real business hours + slot capacity per branch (seed-only editing until the Milestone 5 CMS)
- [ ] Verify: on the landing site, pick a branch and see real open slots; book one; confirm the API rejects a direct out-of-hours/over-capacity attempt

**Booking-specific hardening** (moved out of Milestone 6, 2026-09-11):

- [ ] Rate limiting on the public booking endpoint via the Cloudflare Workers Rate Limiting binding
- [ ] Resend sending domain verified (DKIM etc.) — replaces the Milestone 2 sandbox sender
- [ ] End-to-end email check: a booking confirmation sent from the production domain lands in a real inbox (not spam)
- [ ] PostHog booking-funnel events instrumented on `landing`
- [ ] `LANDING_ORIGIN` returns as a plain var pointed at the production domain (v1's email-free env-shed ends)

**Exit criteria:** the client's deployment takes bookings end-to-end on their domain — dashboard, availability, and hardened booking included.

## Explicitly Deferred (beyond v2, see PRD "Out of Scope")

- Walk-in queue/tracking per branch
- Staff/photographer scheduling
- Per-branch admin roles/permissions
- Customer accounts and self-service rescheduling
- SMS notifications

---

Plan notes:

- These checkboxes are the single source of truth for milestone progress — `docs/progress.md` narrates verification and dates but does not mirror this list (decided 2026-08-30).
- Milestone 3 (Booking Availability) was added after the original roadmap (2026-08-30); Milestones 4–6 were renumbered from 3–5.
- Booking Availability was deferred out of the build scope by the owner (2026-09-09); the UI/UX design-system milestone (wayfinder map #55) took the M3 slot when the editions restructure landed (2026-09-11).
- Delivery is versioned (owner rulings, 2026-09-09/10, recorded in issue #62): v1 = landing + admin auth + CMS as a booking-free artifact, handed over (repo + accounts) once the polish milestones land; v2 = booking + appointments dashboard + availability, paid. The delivery-versions map (#67) closed 2026-09-11 and this roadmap was restructured per its spec (`docs/specs/2026-09-11-delivery-versions-spec.md`, GitHub issue #76): editions manifest added, the design milestone seated in the M3 slot, the M4/M6 v1-track/v2-track splits made real (appointments dashboard + booking-specific hardening → v2), Booking Availability moved to v2 with its deferral annotation preserved, the v1 artifact seed and Milestone 7 (Handover) added. The two-edition mechanism is ADR-0015; #62 is closed as absorbed.
- Milestone 2's pre-flight block (shared API client, ADR-0006) was added 2026-08-30, decided at zero frontend call sites.
- Milestone 2's booking-flow checkboxes were red-penciled 2026-09-07 per the M2 booking-flow spec (`docs/specs/2026-09-07-m2-booking-flow-spec.md`, GitHub issue #37) — the output of the M2 wayfinder map (#31). Original seven-checkbox shape (2026-08-30): landing pages (packages/services/branches), form branch → package → date/time → contact, past-date rejection, POST persistence, Resend integration, confirmation page/state, end-to-end verify.
