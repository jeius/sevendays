# Milestone 1 — Real Data Layer (spec)

_Decided 2026-08-30 (grill-with-docs session, Q1–Q24). Authoritative decision records: **ADR-0007** (connection topology), **ADR-0008** (integration tests vs real Postgres), **ADR-0009** (normalized catalog lookups) — authored with their respective PRs. Roadmap tracking: **Milestone 1 block** in `docs/plan.md`. Catalog source of truth: `docs/catalog.md`. Tracking issue: **#2**._

**Scope note**: covers both M1 PRs (pre-flight, then data layer). Closes at the M1 exit criteria in `docs/plan.md`. `docs/catalog.md` is the catalog source of truth.

## Problem Statement

Everything the product will show or record — Branches, Service Packages, Appointments — is currently stubbed. The API returns one hardcoded Branch and echoes Appointments back without persisting them; the database is a schema sketch with no migration and no live database; there is no CI to guard any of the work that follows. Nothing built in later milestones (booking flow, availability, dashboard) can be real until data is real, and the studio's actual catalog — packages, their Inclusions, Add-on Services — exists only in the client's price list, not in the system.

## Solution

Move the product off stub data onto a real, migrated Postgres database (Supabase). Model and seed the studio's real catalog from `docs/catalog.md`: 11 Service Packages (Basic, A–H, CP-1, CP-2) with their framed pictures, prints, and privilege Inclusions; Print size and Attire lookups; Make-up and Hairstyle as Add-on Services. Rewrite the API to read and write real rows through the shared db package — Branch list, Service Package catalog, Add-on Services, and Appointment creation with price snapshots plus a minimal Appointment list. Before any of that, clear the pre-flight debt: CI on every push/PR, committed env examples, config cleanups, and ADRs recording the connection-topology, testing, and catalog-modeling decisions.

## User Stories

1. As a developer, I want CI to run lint, format, typecheck, tests, and build on every push and PR to main, so that regressions are caught before they reach the data layer.
2. As a developer, I want a committed env example at the repo root, so that a fresh clone tells me which environment variables the apps need.
3. As a developer, I want the local Worker secrets file pattern gitignored and documented with a committed example, so that the database password can't be committed by accident.
4. As a developer, I want the task runner to pass through the real database environment variable names, so that db scripts receive the connection strings they read.
5. As a developer, I want manifest version inconsistencies fixed (icon library, Node types), so that the next dependency re-resolution doesn't silently downgrade or diverge.
6. As a developer, I want the database provisioned on Supabase with connection strings wired per environment, so that all workloads talk to the same Postgres.
7. As a developer, I want migrations generated and applied via drizzle-kit over a session-capable connection, so that schema changes are repeatable, versioned, and lock-safe.
8. As a developer, I want the runtime Worker and local Worker dev to use the transaction-pooled connection, so that they work under Cloudflare's no-raw-TCP constraint.
9. As a developer, I want ADRs for connection topology, DB test strategy, and catalog modeling, so that future sessions understand why there are two connection strings, why tests use real Postgres, and why the catalog is normalized as it is.
10. As a customer, I want the Branch list served from the database, so that I see the studio's real locations.
11. As a customer, I want to browse the real Service Package catalog with prices and Inclusions, so that I know what I'm paying for.
12. As a customer, I want Print sizes and Attires described, so that I understand catalog terms like "2R" or "Filipiniana".
13. As a customer, I want to see the Add-on Services (Make-up, Hairstyle) with their flat prices, so that I can decide whether to add them to my booking.
14. As a customer, I want my Appointment to persist with my chosen Service Package and any Add-on Services, so that the studio actually receives my booking.
15. As a customer, I want the price I was quoted recorded on my Appointment, so that a later price change doesn't change what I was told.
16. As a customer, I want booking to reference a real Branch and a real Service Package, so that I can't submit an Appointment the studio can't fulfill.
17. As a staff member, I want Appointments to record their Kind (scheduled, walk-in, visitation), so that the future dashboard can distinguish how sessions happen.
18. As a staff member, I want Appointments readable from the API with a Branch filter, so that Milestone 4's dashboard has data to list.
19. As a studio owner, I want the catalog seeded from the documented catalog file, so that the site content matches the printed price list.
20. As a studio owner, I want the three real Branches seeded with names, addresses, phones, and walk-in flags, so that customers see accurate locations.
21. As a studio owner, I want package prices stored as the documented approximations, so that final quotes varying by Branch or shoot location can be settled in person.
22. As a developer, I want integration tests that run against real Postgres, so that route changes are verified against real SQL, not mocks.
23. As a developer, I want tests to fail loudly when the test database is unreachable, so that a broken environment never looks like a green check.
24. As a developer, I want the seed script re-runnable, so that re-seeding after schema tweaks is safe.
25. As a developer, I want an explicit exit verification protocol, so that we can prove a row created via the API survives a Worker redeploy.

## Implementation Decisions

**Delivery structure.** Two PRs on the order settled in grilling: PR1 pre-flight (CI live and green first, so the data layer lands guarded), PR2 the data layer. The user commits and pushes; work happens on feature branches, never main directly.

**Pre-flight (PR1).**
- CI via GitHub Actions on push/PR to main: the same gates as local `pnpm check` plus `pnpm build`, Node 24, pnpm with frozen lockfile, packages built before dependent tasks (fresh-clone requirement of the shared config package).
- Committed env examples: repo-root env example, plus an example for the Worker's local secrets file; the Worker secrets file itself gets gitignored.
- Turborepo: drop the obsolete `DATABASE_URI` passthrough; pass through `DATABASE_URL` and `DATABASE_MIGRATE_URL` instead (db scripts read them from the environment).
- Manifest aligns: icon library bumped to the version the lockfile already resolves; frontend Node types aligned to the workspace standard `^26`.
- `docs/plan.md`'s M1 checklist updated to match what M1 now includes (add-on tables, lookups, Kind, the two added GET routes, the migrate URL) — the roadmap stays the single source of truth.

**Database connection topology (ADR-0007).** Two connection strings, one secret name each:
- `DATABASE_MIGRATE_URL` — the direct/session connection (port 5432) — used by drizzle-kit generate/migrate/studio, because drizzle-kit's session-level advisory locks break over a transaction-pooled connection.
- `DATABASE_URL` — the Supavisor transaction-pooled connection (port 6543) — used by the deployed Worker, by local `wrangler dev` via its secrets file, and by the seed script. Workers cannot open raw TCP; pooling is mandatory.
- The db client keeps `prepare: false` (required under transaction pooling; already in place).
- Local dev runs against the remote Supabase project (single environment, seed-only pre-launch). Documented caveat: Supabase free tier pauses the project after ~1 week of inactivity; reopening the dashboard revives it.
- Secret handling: the user pastes URLs into the gitignored files and runs the Worker secret put themselves; connection strings never enter chat. The agent reads the gitignored files for downstream verification and runs everything else.

**Schema (PR2, one migration).** All entities mirrored in the shared Zod package. Additions/changes versus the M0 draft:
- `service_packages`: `duration_minutes` becomes **nullable** — the catalog specifies no durations, and availability (ADR-0005) ignores duration anyway. No fabricated placeholder values. Canonical single `price_cents` (catalog-declared approximation; per-branch pricing deferred).
- `print_sizes` lookup: `code` (catalog vocabulary: 1x1, 2x2, 2R, 8R, 8x10, 11x14) + `description`. The 8R-vs-8x10 discrepancy (nominally the same physical size, both used in the catalog) is recorded in the description for client confirmation at seed review, not resolved by code.
- `attires` lookup: `name` — one row per catalog value including combos (Toga, Filipiniana, Executive, Uniform, Filipiniana/Executive, Filipiniana/Executive/Uniform, Executive/Uniform).
- `package_inclusions`: per-Service-Package Inclusion rows — `kind` (`framed_picture` | `print` | `privilege`), nullable `quantity`, nullable FKs to `print_sizes`/`attires`, nullable `description`. Privileges (wardrobe/accessory usage, High-Resolution soft copies) are quantityless rows, seeded per package even though the catalog's list is universal — CMS-editable later rather than hard-coded.
- `addon_services`: `name`, `description`, flat `price_cents` (Make-up ₱120, Hairstyle ₱60 from the catalog), `is_active`. Flat per-service pricing — no per-package price variants.
- `appointments`: existing columns plus `kind` enum (`scheduled` | `walk_in` | `visitation`, default `scheduled`) and a `package_price_cents` snapshot.
- `appointment_addon_services` join: Appointment ↔ Add-on Service with a `price_cents` snapshot (booking-time price), unique pair. Any Add-on Service may attach to any Service Package (no allowlist).
- **No finish column**: finish is encoded structurally — framed pictures are laminated, loose prints are raw.
- Wardrobe/accessory use is an **Inclusion** (free privilege); hairstyle/makeup are **Add-on Services** (paid, attached at booking). The glossary in the API context file now states this split; use its vocabulary throughout.

**API surface after M1** (thin route handlers; business logic in service modules per the engineering rules):
- `GET /api/branches` — real Branch rows.
- `GET /api/service-packages` — real catalog with Inclusions (joined/structured).
- `GET /api/addon-services` — active Add-on Services.
- `POST /api/appointments` — validates via the shared Zod schemas (now including `kind` and optional `addonServiceIds`), writes the Appointment, snapshots package and add-on prices, returns the created record.
- `GET /api/appointments` — minimal list with optional `?branchId=` filter (dashboard filtering/UX is Milestone 4; this is the minimal read the data layer needs to prove itself).
- No availability logic, no date/time validation, no email — later milestones by design.

**Seeding.** A `db:seed` script in the db package, re-runnable, populating: 3 Branches (real details supplied by the client at seed time; obvious placeholders with TODOs if not yet available), 11 Service Packages with all Inclusions transcribed from `docs/catalog.md`, 6 Print sizes, 7 Attires, 2 Add-on Services. The catalog file is the source of truth; the seed is reviewed against it.

## Testing Decisions

**The seam.** One test seam: the composed Hono app's HTTP boundary — tests issue real requests against the app (prior art: the existing health-check test uses exactly this pattern). No mocking of the db client or query builder: a mocked query builder can't catch a wrong column name, which is precisely the class of bug M1 can introduce. Route handlers stay thin so the HTTP seam exercises service modules and SQL together. Migrations and the seed script are operational tooling verified by running them for real (CI applies migrations before tests; exit verification checks rows directly via psql) — they are not a second test seam.

**Environment.** Integration tests run against real Postgres: a committed docker compose service locally, a Postgres service container in CI. Tests never read the Supabase env — locally they target the committed docker default; CI overrides via environment. Migrations are applied before the suite runs (global setup). When the database is unreachable, tests **fail loudly** with an actionable message ("start the compose db") — no silent skips; a skipped suite is the same silent-green shape ADR-0003 warns about.

**What makes a good test here.** External behavior only: HTTP status codes and response JSON. Assert the catalog endpoint returns packages with structured Inclusions; assert POST /api/appointments persists and echoes a record carrying correct price snapshots; assert a nonexistent Branch/Service Package reference is rejected; assert invalid payloads 400; assert the Appointment list honors the Branch filter. Do not assert SQL strings, call counts, or internal module structure.

**Coverage.** Existing health test stays. New: branches read, service-packages read (inclusions shape), addon-services read, appointments POST happy path (persistence + snapshots + add-on attach), POST validation failures (bad payload, unknown FK), appointments list + filter. CI runs the suite with the service container on every push/PR.

**ADRs to write.** ADR-0008 "Integration tests against real Postgres" (why mocks at the db boundary were rejected; compose + CI service container; migrations-then-tests; fail-loud rule). ADR-0009 "Normalized catalog lookups" (lookup tables + inclusion rows over JSONB or free text; Attire as a lookup per user decision). ADR-0007 as above. All three land with their respective PRs (0007 in PR1, 0008/0009 in PR2).

## Out of Scope

- Availability/slot logic, branch hours, capacity, any date/time validation (Milestones 2–3).
- Resend integration and confirmation emails (Milestone 2).
- The shared API client package, TanStack Query, and the API restructure (M2 pre-flight, tracked separately).
- Admin auth and dashboard UX (Milestone 4); CMS and R2 image upload (Milestone 5); CORS lockdown, Loglayer/Pino, Sentry/PostHog in the API, domains (Milestone 6).
- Landing/admin UI changes of any kind.
- Per-branch pricing (catalog declares prices approximate; deferred until the client asks), cashback/promotions (no rates exist), walk-in queue and Visitation booking flows (deferred features — the `kind` column only records how an Appointment happens), walk-in *booking*.
- Real duration data (column exists, values stay null until the client supplies durations); cover images (`coverImageKey` stays null until Milestone 5).

## Further Notes

- Glossary terms **Inclusion**, **Add-on Service**, **Attire**, **Kind**, **Print size**, and **Print finish** were added to the API context file during this session; the spec uses that vocabulary deliberately.
- The 8R/8x10 duplicate size needs client confirmation at seed review; tracked in the print size description, not by code.
- Exit criteria (from the roadmap): a row created via the API is visible in the Postgres database and survives a redeploy; CI runs `pnpm check` on every push. Verification protocol: create an Appointment via the API → confirm the row via psql → the user runs `wrangler deploy` → confirm the row survived.
- Issue #1 (M2 pre-flight) already exists; this issue is M1 and must land before that work starts per the roadmap ordering.
