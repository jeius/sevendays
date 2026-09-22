# Architecture

## System Overview

Three independently deployed apps, all on **Cloudflare Workers** (`landing` and `admin` are Worker-based TanStack Start apps via `@cloudflare/vite-plugin`, not Pages). Every database touch goes through `apps/api` + `packages/db`; the frontends depend only on shared packages (`packages/types`, `packages/api-client`, `packages/ui`) and shared config, so data shapes stay consistent without the frontends ever touching the database or hand-rolling API calls.

```text
   customers ─────────┐                         ┌───────── admin staff
                      ▼                         ▼
          ┌───────────────────────┐ ┌───────────────────────┐
          │  apps/landing         │ │  apps/admin           │
          │  (TanStack Start)     │ │  (TanStack Start)     │
          └───────────┬───────────┘ └───────────┬───────────┘
                      │                         │
                      └────────────┬────────────┘
                                   │ @sevendays/api-client, server-to-server (ADR-0006) —
                                   │ production transport: the `API` service binding (ADR-0016);
                                   │ dev + vitest: the API_URL network path
                                   ▼
                        ┌───────────────────────┐
                        │  apps/api             │  Cloudflare Workers
                        │  (Hono)               │
                        └───────────┬───────────┘
                                    │ Drizzle (packages/db) — the only direct DB client
                                    ▼
                        ┌───────────────────────┐
                        │  PostgreSQL           │  Supabase — provisioned, migrations applied, catalog seeded (M1.3, 2026-08-31)
                        └───────────────────────┘

   Cloudflare R2 (planned) — package/portfolio images; uploads flow through
   apps/api (which holds the R2 binding), object keys referenced from Postgres.
```

## Why 3 separate apps instead of 1

- **Landing and admin have very different audiences, auth requirements, and caching/CDN needs.** Landing is mostly static/public and benefits from aggressive edge caching; admin is fully auth-gated and dynamic. Splitting them means the public site's deploys, uptime, and cache strategy aren't coupled to admin changes.
- **`apps/api` is the single source of truth for data access.** Both frontends talk to it over REST rather than each maintaining their own DB connection logic, so validation and business rules live in one place.

## Module Boundaries

- **`apps/api`** owns all writes to Postgres and all business logic (appointment status transitions, package activation rules, etc). Routes are thin; logic lives in the per-domain modules under `apps/api/src/services/*` (real routes since M1.4 — branches, service-packages, addon-services, appointments, all against live Postgres via `packages/db`).
- **`packages/db`** owns the Drizzle schema and exports a `createDbClient(connectionString)` factory — the only Postgres client, and the only home of table definitions. Query operators (`eq`, `asc`, …) may be imported from `drizzle-orm` directly (as `apps/api`'s services do); schemas and clients may not — those always come through this package so schema changes propagate everywhere.
- **`packages/types`** owns Zod schemas and inferred TypeScript types for every domain object (`Branch`, `ServicePackage`, `Appointment`). Both the API (server-side validation) and the frontends (form validation) import from here so a schema change only happens in one place.
- **`packages/api-client`** owns how the frontends call `apps/api`: a thin Hono RPC client (`createApiClient`) whose types are inferred from the API's exported `AppType` (type-only dependency — no runtime coupling with the app), Zod-parses every response against `packages/types` schemas, and throws a typed `ApiClientError` on non-2xx. Neither frontend hand-rolls fetch calls to the API (ADR-0006).
- **`packages/ui`** is the shared design-system library (ADR-0017, the shadcn monorepo pattern): the semantic token layer (`src/tokens.css`, imported by both apps) plus the shared shadcn/Base-UI primitive library, generated into the package by `shadcn add` (one `components.json` per workspace, all pinning the same style/iconLibrary/baseColor; `cn` from the `cn` package). Brand and page-specific (composed) components stay app-local. Apps are Tailwind v4 (CSS-first): theme customization lives in each app's `styles.css` via `@theme` — there is no shared JS preset (the v3-era one was removed when the apps landed on v4).
- **`apps/landing`** and **`apps/admin`** each own their own routes, pages, and app-specific components. Neither should reach into the other's `src/`.

## Data Flow: Booking a Shoot

1. Customer fills out the booking form in `apps/landing` (branch, package, date/time, contact info).
2. The wizard validates each step client-side with Zod schemas in `apps/landing/src/lib/booking.ts` (contact info, slot gating); the submit payload is typed as `CreateAppointmentArgs`, and the full shared-schema parse happens server-side (step 4).
3. `apps/landing`'s server function calls `POST /api/v1/appointments` on `apps/api` (ADR-0010 path-versioned mount; `/health` stays top-level) through `@sevendays/api-client` — the browser talks only to its own app; frontend→API calls are always server-to-server (ADR-0006).
4. `apps/api` re-validates the payload with `createAppointmentSchema` from `packages/types` (never trust the client), writes the appointment and its chosen offering in a single intake transaction via `packages/db`, and schedules the Resend confirmation email after the commit via `ctx.waitUntil` (ADR-0014) — the response never waits on the send.
5. The customer lands on `/booking/:id`, which reads the appointment snapshot back through the public single-get endpoint (`appointments.get` via `apps/landing`'s server functions). The admin appointments dashboard is future work (v2): it will fetch `GET /api/v1/appointments` through the same `@sevendays/api-client` from its own server functions, cached by TanStack Query (ADR-0006).

## Auth (planned, not yet wired up)

`apps/admin` will use BetterAuth for staff login. `apps/api` will verify BetterAuth sessions on any mutating admin route (package/branch edits, appointment status changes). `apps/landing`'s booking flow stays unauthenticated by design (see PRD — guest booking is a v1 requirement). Session sharing is decided: `apps/api` verifies the BetterAuth session token against the shared auth tables (ADR-0004), and all frontend→API calls run server-to-server through `@sevendays/api-client` (ADR-0006), so the session token never reaches browser JS.

## Media Storage

Package cover images and portfolio photos are uploaded through `apps/api` (which will hold the R2 binding), initiated from the admin dashboard, and referenced by object key (not full URL) in Postgres (`service_packages.cover_image_key`). Both frontends resolve keys to a servable URL — the exact resolution strategy (public R2 bucket vs. signed URLs vs. a Worker route) is not yet decided; record the decision as an ADR when it's made, since it affects `apps/api`'s response shape.

## Observability

- **Logging:** `apps/api` uses Loglayer + Pino for structured logs (planned for M6 — the API currently uses Hono's built-in `logger()` middleware as a placeholder; see `docs/progress.md`).
- **Errors:** Sentry is scaffolded into all three apps via the TanStack CLI's `sentry` add-on (`landing`, `admin`) — `apps/api` will need Sentry added separately since it isn't a TanStack Start app.
- **Analytics:** PostHog is scaffolded into `landing` and `admin` via the CLI add-on. The booking funnel (view package → start booking → complete booking) is the primary metric to instrument once the booking flow is built.

## Deployment Targets

| App | Platform | Notes |
|---|---|---|
| `apps/landing` | Cloudflare Workers (via `@cloudflare/vite-plugin`), deployed by branch-keyed CI (`pnpm build`, then `wrangler deploy`) | Public, cacheable |
| `apps/admin` | Cloudflare Workers (via `@cloudflare/vite-plugin`), deployed by branch-keyed CI (`pnpm build`, then `wrangler deploy`) | Auth-gated (staff auth arrives with M4), separate deployment from landing |
| `apps/api` | Cloudflare Workers (via Wrangler), deployed by branch-keyed CI (`pnpm build`, then `wrangler deploy`) | Secrets set per environment via `wrangler secret put` — checklist in `docs/tech-stack.md` § Secrets Checklist; the R2 binding stays commented out until M5 (`apps/api/wrangler.toml`) |

Deploys are branch-keyed CI: a push builds (`pnpm build`) and deploys (`wrangler deploy`) the Workers its branch owns, gated on the same push's CI green. The pipeline and its per-branch targets are detailed in `docs/tech-stack.md` § Continuous deploy.
