# ADR-0010: URL path versioning

**Status:** Accepted
**Date:** 2026-09-01

## Context

The API's public surface is unversioned `/api/*` with zero frontend consumers — the last free moment to add versioning cheaply. Milestone 2 introduces the shared api-client (`packages/api-client`, ADR-0006) whose Hono RPC client keys off a base URL path; once consumers exist, the base path is frozen in the client and in any cached URLs. Versioning decided now is a routing prefix; versioning decided later is a rename migration across consumers.

## Decision

Version by **URL path prefix**: the public API mounts as `app.route('/api/v1', api)`, so every public endpoint lives under `/api/v1/*`. `/health` stays top-level — infrastructure, not a versioned surface. There is no version header. Within v1 the contract is **additive-only**: new response fields and new params are optional or defaulted so Zod-parsing clients never break; breaking changes ship under `/v2`, with v1 kept serving until deprecation; response fields are never removed within a version.

## Alternatives Considered

- **Header-based versioning** (e.g. `Accept-version`) — rejected: the api-client keys off the base URL path, not headers; a header adds a protocol dimension to thread through the client and any middleware, for no routing clarity gain.
- **Deferring versioning to M2** — rejected: versioning after consumers exist costs a rename migration of the base path across the client and frontends, exactly the cost doing it now at zero call sites avoids.

## Consequences

- Every future public endpoint mounts inside the v1 router by default.
- The M2 pre-flight consumes `/api/v1/*` as-is — the base path the shared api-client is built against.
- `v1` accumulates optional fields and params over its life; a deliberate, documented breaking change is the trigger for a new version rather than an edit to v1's contract.

---
