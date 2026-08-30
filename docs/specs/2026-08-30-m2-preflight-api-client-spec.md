# Spec: M2 pre-flight — shared API client (`@sevendays/api-client`) + TanStack Query wiring

_Decided 2026-08-30 (grill-with-docs session). Authoritative decision record: **ADR-0006**. Roadmap tracking: **Milestone 2 pre-flight block** in `docs/plan.md`. Related: ADR-0004 (auth session sharing), ADR-0003 (per-workspace vitest configs)._

## Problem Statement

Both frontends — the landing site (Milestone 2) and the admin dashboard (Milestone 4) — need to call the same REST API, and today there is no code in either app for doing so. Without a shared layer, each app would hand-roll its own fetch calls, base-URL handling, response parsing, and error handling, and the two implementations would drift. The project rule that all external input is validated with Zod at every boundary is silently violated by any HTTP response the frontends consume without parsing. And because the API's session model (ADR-0004) verifies BetterAuth tokens against shared tables, allowing browser-direct cross-origin calls would expose session tokens to browser JS, force CORS to be correct long before the hardening milestone, and leak base URLs into client bundles.

## Solution

A single shared client package (`@sevendays/api-client`) built on Hono RPC: its types are inferred directly from the API's exported route type, so a route change surfaces as a compile error in the client instead of a runtime bug. Every response is Zod-parsed at runtime; every non-2xx conforms to one error envelope and surfaces as one typed error class. All frontend→API calls originate in TanStack Start server functions (browser talks only to its own app), with the API base URL supplied from server-side env — no fallback. TanStack Query is installed in both apps above the client for caching and invalidation. Infrastructure only: verified by one sample call per app, not by building real features on it.

## User Stories

1. As a developer working on `apps/landing`, I want a single typed client for calling the API, so that I never hand-write fetch calls, URLs, or JSON parsing in route code.
2. As a developer working on `apps/admin`, I want the same client available, so that both frontends share one implementation of the calling conventions instead of two drifting ones.
3. As a developer, I want API response types inferred directly from the API's route definitions, so that a route change breaks my build where the client is affected, not production.
4. As a developer, I want every API response validated with Zod at runtime, so that a server returning unexpected data fails loudly instead of corrupting UI state.
5. As a developer, I want one uniform error envelope across all endpoints, so that client error handling is a single code path.
6. As a developer, I want a typed error class carrying the HTTP status and parsed error details, so that UI code can branch on failure kinds without string-matching messages.
7. As a developer, I want all frontend→API traffic to originate in server functions, so that auth tokens never reach browser JS and CORS between our own apps stops being a concern.
8. As a developer, I want the API base URL to come from server-side env with no default fallback, so that a misconfigured deployment fails loudly rather than silently calling localhost.
9. As a developer, I want TanStack Query installed with SSR integration in both apps, so that loaders prefetch into cache, components consume it, and mutations invalidate precisely what they changed.
10. As a maintainer of `apps/api`, I want routes organized as chained sub-apps with an exported app type, so that the RPC client can infer the full API surface without a hand-maintained duplicate.
11. As a maintainer of `apps/api`, I want the Worker env type exported explicitly instead of relying on the ambient generated global, so that cross-package type imports compile.
12. As a maintainer, I want the "errors are always JSON with an explicit status code" convention enforced by tests, so that a bare not-found can't silently degrade the client's response types to unknown.
13. As a developer, I want the client to accept an injectable fetch implementation, so that it can be tested loopback without a server or network.
14. As a developer, I want one sample call per app verified end to end (browser → own server functions → API), so that I can trust the infrastructure before building real features on it.
15. As a future agent or contributor picking the repo up cold, I want these conventions recorded in an ADR and the roadmap, so that I don't rediscover or contradict the design.

## Implementation Decisions

- **New shared package** `@sevendays/api-client` (workspace package, source-exported like the other packages), thin surface: a `createApiClient({ baseUrl, fetch? })` factory returning the wrapped Hono RPC client. Apps call route methods directly on it — no function-per-endpoint wrapper layer (that would reintroduce the drift RPC exists to remove).
- **Type-sharing via Hono RPC** ("using RPC with larger applications" pattern): the API's route sub-apps stay chained, and the API exports its app type (`AppType`). The client package takes the API as a **devDependency and imports only its types** — erased at runtime, no runtime coupling, no cycle. Consequence: any API route change re-typechecks the client package (intended), making "routes stay chained" a standing API review rule.
- **API restructure as a precondition**: export `AppType`; move the Worker `Env` from the ambient `worker-configuration.d.ts` global to an explicitly exported type (cross-package type imports cannot see ambient globals); adopt the convention that every non-2xx response is `c.json({ error, ... }, <explicit status>)` — never a bare not-found helper, which degrades RPC response inference to `unknown`.
- **Runtime validation**: success-response schemas and an `apiErrorSchema` (`{ error: string, details?: unknown }`) live in the shared types package (project rule: shapes are defined there, not per app). The client parses success payloads against the former and error responses against the latter, throwing a typed `ApiClientError` (status + parsed details) on non-2xx.
- **Server-mediated topology**: the browser talks only to its own app; all API calls run from TanStack Start server functions/loaders server-to-server. This composes with ADR-0004 (session token verified against shared tables, never present in browser JS) and makes inter-app CORS a non-issue ahead of the hardening milestone.
- **Base URL via server env**: `API_URL` per app (local dev: gitignored env file; production: Workers vars). No hardcoded fallback — missing env fails loudly at client creation.
- **TanStack Query** installed in both apps with SSR query integration (router context carries the query client; loaders prefetch with `ensureQueryData`; components use suspense queries; mutations invalidate what they changed). Query instances are per-request on the server.
- **Env/dev-env note**: the client must work in the Workers runtime; `API_URL` is a plain server-side var (no client-bundle prefix — it must not leak into client code by construction).

## Testing Decisions

- **What makes a good test here**: assert external behavior only — status codes returned, parsed payload shapes, the thrown error's type/status/details — never internal call ordering or private helpers.
- **Seam 1 (new, the only new seam): the client's public surface, tested loopback.** The injectable fetch is the hook: a chained Hono app mirroring the API's conventions (JSON errors with explicit statuses, envelope shape) is passed directly as the `fetch` implementation — Hono apps are fetch-compatible, so no server, no network, and no runtime dependency on the API app (which would violate the type-only rule). Covers: valid payload passes parsing; schema-mismatched payload throws; non-2xx maps to the typed error with status + details; type-level inference assertions.
- **Seam 2 (existing, extended): the API's HTTP surface** via its existing in-app request testing style. After the restructure: sub-apps still route correctly under the new chained/exported shape, and 404/401-class responses return the JSON envelope — the regression guard for the "no bare not-found" convention.
- **Prior art**: the API's existing vitest suite (the repo's only real tests today).
- The new package gets its **own vitest config** extending the shared config — per-workspace configs are mandatory on vitest 4 (ADR-0003); without one, the shared pass-with-no-tests setting turns a discovery miss into a silent green.

## Out of Scope

- Real feature call sites: landing pages/booking flow (Milestone 2 proper) and admin dashboard/auth (Milestone 4) — this spec delivers and verifies the infrastructure with one sample call per app only.
- Availability/slot endpoints (Milestone 3) and any new API routes beyond what the sample verification needs.
- BetterAuth integration itself (ADR-0004 describes the session model; wiring it is Milestone 4).
- CI changes (owned by Milestone 1 pre-flight), browser E2E infrastructure, OpenAPI/codegen machinery (rejected for now in ADR-0006, revisit if a third-party consumer appears), rate limiting (Milestone 6).

## Further Notes

- The API restructure and package creation must land before the first real endpoint call; the roadmap's Milestone 2 pre-flight block tracks them checkbox by checkbox.
- If editor type-checking slows as routes grow, the documented escape hatch is precompiling the client (precalculated client type) rather than specifying type arguments by hand — deliberately not applied preemptively.
- Workspace constraints that apply throughout: Node >= 24, Zod v4, Biome 2.x tiered configs (`node` tier for the new package), `pnpm build:packages` after fresh clone.
