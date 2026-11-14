# Architecture

## System Overview

Three independently deployed apps, all on **Cloudflare Workers** (`landing` and `admin` are Worker-based TanStack Start apps via `@cloudflare/vite-plugin`, not Pages). Every database touch on the product's data path goes through `apps/api` + `packages/db`; the frontends depend on shared packages (`packages/types`, `packages/api-client`, `packages/ui`) and shared config, so data shapes stay consistent without hand-rolled API calls. Two sanctioned seams sit beside that path: the admin runs the BetterAuth auth server over `packages/db` (ADR-0004) and owns the ADR-0023 audit/metrics probes over it — `apps/landing` stays fully DB-free — and the one hand-rolled fetch anywhere is ADR-0021's internal reset-email forward over the `API` service binding.

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
                        │  PostgreSQL           │  Supabase — provisioned; migrations 0000–0014 applied; catalog seeded (M1.3) and CMS-owned since M5 (the seed is bootstrap/dev-only)
                        └───────────────────────┘

   Cloudflare R2 — the `sevendays-media` bucket (provisioned, M5): package/branch
   covers, the site logo, and gallery photos upload through apps/api (which holds
   the MEDIA_BUCKET binding), object keys referenced from Postgres, URLs resolved
   at read time (ADR-0019).
```

## Why 3 separate apps instead of 1

- **Landing and admin have very different audiences, auth requirements, and caching/CDN needs.** Landing is mostly static/public and benefits from aggressive edge caching; admin is fully auth-gated and dynamic. Splitting them means the public site's deploys, uptime, and cache strategy aren't coupled to admin changes.
- **`apps/api` is the single source of truth for data access.** Both frontends talk to it over REST rather than each maintaining their own DB connection logic, so validation and business rules live in one place.

## Module Boundaries

- **`apps/api`** owns all writes to Postgres and all business logic (catalog trim rules, deletion guards, etc). Routes are thin; logic lives in the per-domain modules under `apps/api/src/services/*` — the full public read chain (catalog, gallery, testimonials, site-settings; edge-cached per ADR-0025), the session-gated `/api/v1/admin` write subtree (nine entity routers with guarded DELETE, the media commit, the site-settings PUT, the submissions moderation), and the service-binding-only `/internal/reset-email` (ADR-0021), all against live Postgres via `packages/db`.
- **`packages/db`** owns the Drizzle schema and exports a `createDbClient(connectionString)` factory — the only Postgres client, and the only home of table definitions. Query operators (`eq`, `asc`, …) may be imported from `drizzle-orm` directly (as `apps/api`'s services do); schemas and clients may not — those always come through this package so schema changes propagate everywhere.
- **`packages/types`** owns Zod schemas and inferred TypeScript types for every domain object (`Branch`, `ServicePackage`, `Appointment`). Both the API (server-side validation) and the frontends (form validation) import from here so a schema change only happens in one place.
- **`packages/api-client`** owns how the frontends call `apps/api`: a thin Hono RPC client (`createApiClient`) whose types are inferred from the API's exported `AppType` (type-only dependency — no runtime coupling with the app), Zod-parses every response against `packages/types` schemas, and throws a typed `ApiClientError` on non-2xx. Neither frontend hand-rolls fetch calls to the API (ADR-0006).
- **`packages/ui`** is the shared design-system library (ADR-0017, the shadcn monorepo pattern): the semantic token layer (`src/tokens.css`, imported by both apps) plus the shared shadcn/Base-UI primitive library, generated into the package by `shadcn add` (one `components.json` per workspace, all pinning the same style/iconLibrary/baseColor; `cn` from the `cn` package). Brand and page-specific (composed) components stay app-local. Apps are Tailwind v4 (CSS-first): theme customization lives in each app's `styles.css` via `@theme` — there is no shared JS preset (the v3-era one was removed when the apps landed on v4).
- **`apps/landing`** and **`apps/admin`** each own their own routes, pages, and app-specific components. Neither should reach into the other's `src/`.

## Data Flow: Catalog Reads

1. A landing page's route loader prefetches its reads (TanStack Query `ensureQueryData` during SSR).
2. The page's server function (in `apps/landing`) calls `apps/api` through `@sevendays/api-client` — the browser talks only to its own app; frontend→API calls are always server-to-server (ADR-0006).
3. `apps/api` validates responses against the shared Zod schemas, reads through `packages/db`, and returns typed JSON.
4. The page renders from the query cache (`useSuspenseQuery`); a catalog edit appears on the next read without a deploy.

## Auth (live since Milestone 4, 2026-09-23)

`apps/admin` runs the BetterAuth auth server: email+password staff login at `/login` with self-serve sign-up disabled — users are provisioned through the owner-only Users tab (M7 #221), and the `create-staff` CLI remains the bootstrap/break-glass path until #222's demotion. Staff self-serve forgot-password sends its reset email over the `API` service binding to the guarded internal send endpoint (ADR-0021). `apps/api` verifies BetterAuth sessions on the gated routes: `requireSession` checks the `Authorization: Bearer` token against the shared auth tables (ADR-0004) and answers the uniform 401 envelope. The public site has no authentication by design. Session sharing: the session token never reaches browser JS — all frontend→API calls run server-to-server through `@sevendays/api-client` (ADR-0006), in production over the `API` service binding (ADR-0016).

## Media Storage

Package covers, branch covers, the site logo, and gallery photos are uploaded through `apps/api` (which holds the `MEDIA_BUCKET` + `IMAGES` bindings), initiated from the admin dashboard, and referenced by object key (not full URL) in Postgres. The resolution strategy is decided and implemented (ADR-0019, M5): presigned direct-to-R2 uploads with a verify/promote commit gate, object keys in the DB, absolute URLs resolved at read time against `MEDIA_PUBLIC_BASE_URL` (r2.dev for now; the custom-domain swap at ship is a var flip) — raw keys never leave the API. `docs/media-bucket-runbook.md` is the bucket runbook.

## Observability

- **Logging:** `apps/api` logs via Loglayer + Pino into Workers Logs (live since M6, #183): five PII-free event classes, a per-request `requestId` echoed as `X-Request-Id`; the wildcard CORS middleware is dropped — browsers stay default-denied. `wrangler tail` is the live viewer.
- **Errors:** Sentry is live on all three apps under one "sevendays" project (M6, #184): the api via `@sentry/cloudflare` (`withSentry` at `src/worker.ts`, the wrangler main), the frontends errors-only via one `src/instrument.ts` — errors-only everywhere since #263, `release` = the deployed git SHA via CI.
- **Analytics:** PostHog's landing provider captures pageviews + web vitals (M6, #187 — the audience half of the admin's Analytics Dashboard reads them via HogQL); the admin's provider stays off by ruling.

## Deployment Targets

| App | Platform | Notes |
|---|---|---|
| `apps/landing` | Cloudflare Workers (via `@cloudflare/vite-plugin`), deployed by branch-keyed CI (`pnpm build`, then `wrangler deploy`) | Public, cacheable |
| `apps/admin` | Cloudflare Workers (via `@cloudflare/vite-plugin`), deployed by branch-keyed CI (`pnpm build`, then `wrangler deploy`) | Auth-gated (staff auth arrives with M4), separate deployment from landing |
| `apps/api` | Cloudflare Workers (via Wrangler), deployed by branch-keyed CI (`pnpm build`, then `wrangler deploy`) | Secrets set per environment via `wrangler secret put` — checklist in `docs/tech-stack.md` § Secrets Checklist; the R2 media bindings are live (M5: `MEDIA_BUCKET` + `IMAGES`, ADR-0019) |

Deploys are branch-keyed CI: a push builds (`pnpm build`) and deploys (`wrangler deploy`) the Workers its branch owns, gated on the same push's CI green. The pipeline and its per-branch targets are detailed in `docs/tech-stack.md` § Continuous deploy.
