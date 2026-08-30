# Architecture

## System Overview

Three independently deployed apps, all on **Cloudflare Workers** (`landing` and `admin` are Worker-based TanStack Start apps via `@cloudflare/vite-plugin`, not Pages). Every database touch goes through `apps/api` + `packages/db`; the frontends depend only on shared packages (`packages/types`, `packages/api-client`) and shared config, so data shapes stay consistent without the frontends ever touching the database or hand-rolling API calls.

```text
   customers ─────────┐                         ┌───────── admin staff
                      ▼                         ▼
          ┌───────────────────────┐ ┌───────────────────────┐
          │  apps/landing         │ │  apps/admin           │
          │  (TanStack Start)     │ │  (TanStack Start)     │
          └───────────┬───────────┘ └───────────┬───────────┘
                      │                         │
                      └────────────┬────────────┘
                                   │ REST via @sevendays/api-client (server-to-server)
                                   ▼
                        ┌───────────────────────┐
                        │  apps/api             │  Cloudflare Workers
                        │  (Hono)               │
                        └───────────┬───────────┘
                                    │ Drizzle (packages/db) — the only direct DB client
                                    ▼
                        ┌───────────────────────┐
                        │  PostgreSQL           │  Supabase (or equivalent) — not yet provisioned
                        └───────────────────────┘

   Cloudflare R2 (planned) — package/portfolio images; uploads flow through
   apps/api (which holds the R2 binding), object keys referenced from Postgres.
```

## Why 3 separate apps instead of 1

- **Landing and admin have very different audiences, auth requirements, and caching/CDN needs.** Landing is mostly static/public and benefits from aggressive edge caching; admin is fully auth-gated and dynamic. Splitting them means the public site's deploys, uptime, and cache strategy aren't coupled to admin changes.
- **`apps/api` is the single source of truth for data access.** Both frontends talk to it over REST rather than each maintaining their own DB connection logic, so validation and business rules live in one place.

## Module Boundaries

- **`apps/api`** owns all writes to Postgres and all business logic (appointment status transitions, package activation rules, etc). Routes are thin; logic lives in per-domain modules (to be added as `apps/api/src/services/*` as the API grows past the current stub routes).
- **`packages/db`** owns the Drizzle schema and exports a `createDbClient(connectionString)` factory. No app should import `drizzle-orm` directly — always go through this package so schema changes propagate everywhere.
- **`packages/types`** owns Zod schemas and inferred TypeScript types for every domain object (`Branch`, `ServicePackage`, `Appointment`). Both the API (server-side validation) and the frontends (form validation) import from here so a schema change only happens in one place.
- **`packages/api-client`** owns how the frontends call `apps/api`: a thin Hono RPC client (`createApiClient`) whose types are inferred from the API's exported `AppType` (type-only dependency — no runtime coupling with the app), Zod-parses every response against `packages/types` schemas, and throws a typed `ApiClientError` on non-2xx. Neither frontend hand-rolls fetch calls to the API (ADR-0006).
- **`packages/ui`** owns the shadcn/ui CSS variables (`src/globals.css`) so `landing` and `admin` don't drift on tokens. Actual shadcn components are generated per-app (via the shadcn CLI) since they're copy-paste by design. Apps are Tailwind v4 (CSS-first): theme customization lives in each app's `styles.css` via `@theme`, and `packages/ui` holds shared variables only — there is no shared JS preset (the v3-era one was removed when the apps landed on v4).
- **`apps/landing`** and **`apps/admin`** each own their own routes, pages, and app-specific components. Neither should reach into the other's `src/`.

## Data Flow: Booking a Shoot

1. Customer fills out the booking form in `apps/landing` (branch, package, date/time, contact info).
2. Form is validated client-side against `createAppointmentSchema` from `packages/types`.
3. `apps/landing`'s server function calls `POST /api/appointments` on `apps/api` through `@sevendays/api-client` — the browser talks only to its own app; frontend→API calls are always server-to-server (ADR-0006).
4. `apps/api` re-validates with the same Zod schema (never trust the client), writes the row via `packages/db`, and triggers a Resend confirmation email.
5. Appointment appears in `apps/admin`'s dashboard, which fetches `GET /api/appointments` through `@sevendays/api-client` from its own server functions, cached by TanStack Query (ADR-0006).

## Auth (planned, not yet wired up)

`apps/admin` will use BetterAuth for staff login. `apps/api` will verify BetterAuth sessions on any mutating admin route (package/branch edits, appointment status changes). `apps/landing`'s booking flow stays unauthenticated by design (see PRD — guest booking is a v1 requirement). Session sharing is decided: `apps/api` verifies the BetterAuth session token against the shared auth tables (ADR-0004), and all frontend→API calls run server-to-server through `@sevendays/api-client` (ADR-0006), so the session token never reaches browser JS.

## Media Storage

Package cover images and portfolio photos are uploaded through `apps/api` (which will hold the R2 binding), initiated from the admin dashboard, and referenced by object key (not full URL) in Postgres (`service_packages.cover_image_key`). Both frontends resolve keys to a servable URL — the exact resolution strategy (public R2 bucket vs. signed URLs vs. a Worker route) is not yet decided; record the decision as an ADR when it's made, since it affects `apps/api`'s response shape.

## Observability

- **Logging:** `apps/api` uses Loglayer + Pino for structured logs (not yet wired into the current stub — see `docs/progress.md`).
- **Errors:** Sentry is scaffolded into all three apps via the TanStack CLI's `sentry` add-on (`landing`, `admin`) — `apps/api` will need Sentry added separately since it isn't a TanStack Start app.
- **Analytics:** PostHog is scaffolded into `landing` and `admin` via the CLI add-on. The booking funnel (view package → start booking → complete booking) is the primary metric to instrument once the booking flow is built.

## Deployment Targets

| App | Platform | Notes |
|---|---|---|
| `apps/landing` | Cloudflare Workers (via `@cloudflare/vite-plugin`, `wrangler deploy`) | Public, cacheable |
| `apps/admin` | Cloudflare Workers (via `@cloudflare/vite-plugin`, `wrangler deploy`) | Auth-gated, separate deployment from landing |
| `apps/api` | Cloudflare Workers (via Wrangler) | Bindings/secrets TODO — see `apps/api/wrangler.toml` |
