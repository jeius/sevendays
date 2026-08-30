# ADR-0006: Shared API client via Hono RPC type-sharing, called server-to-server only

**Status:** Accepted
**Date:** 2026-08-30

## Context

`apps/landing` (Milestone 2) and `apps/admin` (Milestone 4) both consume `apps/api` over REST. No fetching code exists yet in either frontend — this decision was made at zero call sites, which makes it cheap now and expensive later. Three forces are in tension: `AGENTS.md` requires Zod validation at *every* boundary (which includes HTTP responses the frontends receive); two consumers mean parsing/error/base-URL logic would otherwise be duplicated and drift; and ADR-0004's session model (api verifies the BetterAuth token against shared tables) raises the question of where frontend→API calls originate — browser or server.

## Decision

- **New `packages/api-client` (`@sevendays/api-client`)**, thin surface: `createApiClient({ baseUrl, fetch? })` returning the wrapped Hono RPC client. Apps call route methods directly — no function-per-endpoint layer to keep in sync.
- **Types via Hono RPC**: the package type-imports `AppType` from `@sevendays/api` (devDependency, `import type` — erased at runtime, no cycle). This requires the API's standing restructure: chained route sub-apps (the "larger applications" pattern), an exported `AppType`, and an explicit exported `Env` (a cross-package type import cannot see the ambient `worker-configuration.d.ts` global).
- **Every response is Zod-parsed at runtime** against schemas in `packages/types`; non-2xx responses conform to a uniform envelope `{ error: string, details?: unknown }` (`apiErrorSchema`) and surface as a typed `ApiClientError`. API-side convention: always `c.json({ error }, status)` with an explicit status — never bare `c.notFound()`, which degrades RPC response inference to `unknown`.
- **Server-mediated topology**: the browser talks only to its own app; all API calls originate from TanStack Start server functions/loaders. The API base URL comes from server env (`API_URL` — no `VITE_` prefix, no fallback; a missing env fails loudly).
- **TanStack Query** (`@tanstack/react-query`) sits above the client in both apps for caching/invalidation.

## Alternatives Considered

- **`hc<AppType>` bare, no runtime parsing** — rejected: compile-time-only trust; the response is still external input at runtime.
- **Hand-written typed fetch functions per endpoint** — rejected: every route change touches two apps; reintroduces exactly the drift RPC removes.
- **OpenAPI codegen (`hono-openapi` + openapi-typescript)** — rejected for now: codegen pipeline to maintain for a three-app internal stack; revisit if a third-party consumer appears.
- **Browser-direct cross-origin calls** — rejected: the BetterAuth session token would be handled in JS (against ADR-0004's shape), CORS must be correct before Milestone 6 rather than becoming a formality, and base URLs leak into client bundles.
- **No shared layer (inline fetch per app)** — rejected: duplicates validation/error handling across two apps from day one.

## Consequences

- Editing API routes re-typechecks `packages/api-client` — that is the drift-kill working as intended, and it makes "routes stay chained" a permanent review rule for `apps/api`.
- The API restructure (AppType/Env export, JSON-error convention) must land before the first client call.
- Every read crosses an extra hop (browser → own server → api) and SSR must serialize data — standard TanStack Start patterns, accepted cost.
- If `tsserver` slows as routes grow, the compiled-client trick (`hcWithType`, per the Hono RPC guide) is the documented escape hatch — not applied preemptively.
