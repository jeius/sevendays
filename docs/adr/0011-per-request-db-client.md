# ADR-0011: Per-request database client

**Status:** Accepted
**Date:** 2026-09-02

## Context

The API memoized its postgres.js client per isolate (`services/db.ts`, "safe to reuse" comment). Under workerd, I/O objects (sockets) are scoped to the request that created them — a memoized client makes every request after the first per isolate fail with "Cannot perform I/O on behalf of a different request. (I/O type: Writable)" (captured verbatim during the M1.5 gate, 2026-09-02). Integration tests (Node env) cannot catch this class. The defect shipped unnoticed because the M1.4 routes had never taken live traffic until the M1.5 exit gate — the gate itself surfaced it. (Route catches returned uniform 500s with no log, which is why wrangler tail + temporary instrumentation were needed; log-before-500 is tracked for M2.)

## Decision

`createApiDb` returns a fresh postgres.js client per request (commit 369d4c8). Under Supavisor transaction pooling (ADR-0007) per-request connections are the documented pattern; request-scoped sockets are reclaimed when the request context ends; `prepare: false` unchanged.

## Alternatives Considered

- **Per-isolate memoized client** — rejected: workerd scopes sockets to the creating request, so every request after the first per isolate 500ed.

## Consequences

- No cross-request I/O scoping failures.
- Connection setup cost per request is acceptable at current volume — revisit Hyperdrive if API request volume (not just booking volume) demands it.
- Documented in `docs/progress.md` Known Gaps.
- **Relocated into the acquisition middleware (candidate D, 2026-09-04):** the
  per-request `createApiDb` call now lives in one `v1.use('*')` middleware
  (set into Hono context as `db`) instead of being repeated inside each route
  handler. Same per-request semantics — one client per request, request-scoped
  sockets reclaimed at request end — only the call site moved. Routes read
  `c.get('db')`; a missing `DATABASE_URL` throws in the middleware and is
  caught by the root `onError` as the uniform 500.

---
