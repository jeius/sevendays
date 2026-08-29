# Architecture

## System Overview

Three independently deployed apps share two internal packages (`db`, `types`) so data shapes and persistence stay consistent without a shared runtime.

```text
                         ┌─────────────────────┐
   customers  ─────────▶ │  apps/landing        │  Cloudflare Pages
                         │  (TanStack Start)    │
                         └──────────┬───────────┘
                                    │ REST (fetch)
                                    ▼
                         ┌─────────────────────┐
                         │  apps/api            │  Cloudflare Workers
                         │  (Hono)              │
                         └──────────┬───────────┘
                                    │ Drizzle (packages/db)
                                    ▼
                         ┌─────────────────────┐
                         │  PostgreSQL          │  Supabase (or equivalent)
                         └─────────────────────┘
                                    ▲
                                    │ REST (fetch) + Drizzle where server functions need direct access
                         ┌──────────┴───────────┐
   admin staff ────────▶ │  apps/admin           │  Cloudflare Pages
                         │  (TanStack Start)    │
                         └─────────────────────┘

   Cloudflare R2 — package/portfolio images, referenced by key from Postgres,
                   written to by apps/admin, read by apps/landing + apps/admin.
```

## Why 3 separate apps instead of 1

- **Landing and admin have very different audiences, auth requirements, and caching/CDN needs.** Landing is mostly static/public and benefits from aggressive edge caching; admin is fully auth-gated and dynamic. Splitting them means the public site's deploys, uptime, and cache strategy aren't coupled to admin changes.
- **`apps/api` is the single source of truth for data access.** Both frontends talk to it over REST rather than each maintaining their own DB connection logic, so validation and business rules live in one place.

## Module Boundaries

- **`apps/api`** owns all writes to Postgres and all business logic (appointment status transitions, package activation rules, etc). Routes are thin; logic lives in per-domain modules (to be added as `apps/api/src/services/*` as the API grows past the current stub routes).
- **`packages/db`** owns the Drizzle schema and exports a `createDbClient(connectionString)` factory. No app should import `drizzle-orm` directly — always go through this package so schema changes propagate everywhere.
- **`packages/types`** owns Zod schemas and inferred TypeScript types for every domain object (`Branch`, `ServicePackage`, `Appointment`). Both the API (server-side validation) and the frontends (form validation) import from here so a schema change only happens in one place.
- **`packages/ui`** owns the shared Tailwind preset and shadcn/ui CSS variables so `landing` and `admin` don't visually drift or duplicate token definitions. Actual shadcn components are generated per-app (via the shadcn CLI) since they're copy-paste by design, but they consume the shared tokens.
- **`apps/landing`** and **`apps/admin`** each own their own routes, pages, and app-specific components. Neither should reach into the other's `src/`.

## Data Flow: Booking a Shoot

1. Customer fills out the booking form in `apps/landing` (branch, package, date/time, contact info).
2. Form is validated client-side against `createAppointmentSchema` from `packages/types`.
3. `apps/landing` calls `POST /api/appointments` on `apps/api`.
4. `apps/api` re-validates with the same Zod schema (never trust the client), writes the row via `packages/db`, and triggers a Resend confirmation email.
5. Appointment appears in `apps/admin`'s dashboard, which polls/fetches `GET /api/appointments` from `apps/api`.

## Auth (planned, not yet wired up)

`apps/admin` will use BetterAuth for staff login. `apps/api` will verify BetterAuth sessions on any mutating admin route (package/branch edits, appointment status changes). `apps/landing`'s booking flow stays unauthenticated by design (see PRD — guest booking is a v1 requirement). The exact session-sharing mechanism between `admin` (frontend) and `api` (backend, different origin) is an open decision — record it as an ADR in `docs/adr/` once resolved, since it affects CORS/cookie config in both apps.

## Media Storage

Package cover images and portfolio photos are uploaded from `apps/admin`, stored in Cloudflare R2, and referenced by object key (not full URL) in Postgres (`service_packages.cover_image_key`). Both frontends resolve keys to a servable URL — the exact resolution strategy (public R2 bucket vs. signed URLs vs. a Worker route) is not yet decided; record the decision as an ADR when it's made, since it affects `apps/api`'s response shape.

## Observability

- **Logging:** `apps/api` uses Loglayer + Pino for structured logs (not yet wired into the current stub — see `docs/progress.md`).
- **Errors:** Sentry is scaffolded into all three apps via the TanStack CLI's `sentry` add-on (`landing`, `admin`) — `apps/api` will need Sentry added separately since it isn't a TanStack Start app.
- **Analytics:** PostHog is scaffolded into `landing` and `admin` via the CLI add-on. The booking funnel (view package → start booking → complete booking) is the primary metric to instrument once the booking flow is built.

## Deployment Targets

| App | Platform | Notes |
|---|---|---|
| `apps/landing` | Cloudflare Pages/Workers (via `@cloudflare/vite-plugin`) | Public, cacheable |
| `apps/admin` | Cloudflare Pages/Workers (via `@cloudflare/vite-plugin`) | Auth-gated, separate deployment from landing |
| `apps/api` | Cloudflare Workers (via Wrangler) | Bindings/secrets TODO — see `apps/api/wrangler.toml` |
