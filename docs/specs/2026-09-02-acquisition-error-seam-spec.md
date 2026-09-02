# Spec: One acquisition/error seam for the API (architecture review, candidate D)

_Decided 2026-09-02 (architecture review session; candidate D of the 2026-09-02 HTML review, folded as the last candidate). Related: ADR-0006 (shared api-client + the API restructure it preconditions — this spec stays ahead of it), ADR-0010 (URL path versioning — the seam mounts under the versioned subapp), ADR-0011 (per-request db client — preserved exactly, just relocated), ADR-0008 (integration tests vs real Postgres — the proof seam). Sequencing: lands after #13, whose inline log-before-500 lines it supersedes and removes. Tracking: `docs/progress.md` M2 ledger — closes "log-before-500" fully and splits off "404/405 shape" (404 here, 405 to the M2 pre-flight)._

## Problem Statement

Every route in the API re-implements the same five-line cross-section: acquire the per-request database handle, try the work, catch and return the uniform 500 — swallowing the error. The policy holds by copy-paste, so it erodes by copy-paste: the acquisition-inside-the-try ruling (a missing database URL must fail into the uniform JSON 500, never the framework's plain-text default) is written as a comment in only two of the four routes; the ADR-0011 rationale is pasted three times; and the silent catch is the documented reason deploy blocker #2 shipped invisible — a production failure class that took wrangler tail plus temporary instrumentation to diagnose. The 404 path, meanwhile, still returns the framework's bare default — exactly the non-JSON response the shared-client ADR forbids, since a bare not-found degrades the client's response inference to `unknown`. Every future route (M2 catalog writes, M3 availability, M4 admin) inherits all of this by copying the idiom again.

## Solution

Move the policy into Hono's own structure, where it holds by construction rather than convention: one middleware, mounted on the versioned API subapp, acquires the per-request database handle into context; one error handler logs any thrown error and returns the uniform 500 JSON; one not-found handler returns the uniform error JSON with an explicit 404. Route handlers shrink to their essence — validate, call the module, return the response — with zero try/catch, zero acquisition code, and no per-route policy comments. ADR-0011 is untouched: the client is still created fresh per request, just in one place.

## User Stories

1. As a developer adding any future route (M2 writes, M3 availability, M4 admin mutations), I want acquisition and error policy already in place around my handler, so that I write the module call and the response and nothing else.
2. As an agent (or human) triaging a production 500, I want every thrown error in the Worker logs with the route that threw it, so that the M1.5 invisible-failure class is structurally impossible, not just fixed on one route.
3. As a developer building the M2 api-client, I want every non-2xx response — including 404 — to be the uniform JSON error shape with an explicit status, so that the client's typed error handling has no `unknown` holes.
4. As a maintainer, I want the acquisition-inside-the-try ruling and the per-request-client rationale to live in one middleware's implementation and docs, so that the three pasted comment copies stop drifting.
5. As the studio owner, I want the health endpoint to stay db-free, so that a database misconfiguration is visible as API failures while uptime monitoring still reports the Worker itself as up.
6. As a developer writing route tests, I want the error policy exercised once through the HTTP seam, so that policy regressions are caught by one test file instead of per-route coverage.
7. As a future session doing the M2 pre-flight restructure (exporting the app type, consolidating env), I want this seam already in Hono's canonical shape, so that the restructure moves zero policy code.
8. As a reviewer, I want route PRs free of try/catch noise, so that diffs show behavior changes, not copied idioms.

## Implementation Decisions

- **Middleware + error handler as the seam.** One acquisition middleware scoped to the versioned API subapp sets the per-request database handle into request context (`c.set`); route handlers read it from context. One `onError` handler logs (`console.error` — workerd-compatible, no new dependency) and returns the uniform 500 JSON. Thrown errors propagate to it from handlers and middleware alike — including an acquisition failure on a missing database URL, which preserves the uniform-500 ruling by structure instead of by per-route try/catch placement.
- **Not-found joins the envelope now.** `app.notFound` returns the uniform error JSON with an explicit 404 status. **405 is explicitly deferred** to the M2 pre-flight route restructure: the framework has no built-in method-mismatch surface, so a correct 405 needs per-route method-set knowledge — real design that belongs beside the restructure it exists to serve (its typed-response conventions).
- **Health stays db-free.** The acquisition middleware is scoped to `/api/v1/*`; the health route is mounted outside it, so the uptime probe never depends on the database.
- **Supersedes #13's inline logging.** The appointments route's log-before-500 lines (landed by the intake spec) are removed when this lands — one logging point, no double-logging. The intake module's transactional write and typed failures are untouched; this spec is purely the route-layer seam.
- **Env types are untouched.** The ambient-generated vs strict env duplication is consolidated by the M2 pre-flight restructure (the shared-client ADR forces the explicit exported env + app type); this spec does not touch env definitions, bindings, or secrets handling.
- **No shared-types changes, no wire changes on success paths.** The 500 and 404 bodies conform to the existing uniform error shape already shared with the client spec; statuses and success payloads are unchanged.

## Testing Decisions

- **What makes a good test here**: assert HTTP-external behavior — status codes and body shapes for the failure paths the seam owns. Never framework internals or middleware ordering.
- **The seam is the test surface, once.** Through the API's existing in-app request style over real Postgres: a request that makes the module throw returns the uniform 500 and the error is observable in logs; a missing database URL returns the uniform 500 (the propagated-acquisition case); an unknown path under the API returns the uniform JSON 404; `/health` stays 200 and db-independent. These are policy tests — one file, covering every current and future route at once.
- **Existing integration suites pass unchanged.** All endpoint behavior is preserved (ADR-0008's real-Postgres suites are the regression proof); the appointments suite's 500-path expectations carry over from #13's work.
- **Prior art**: the existing endpoint integration suites, including #13's error-path coverage for the appointments route.

## Out of Scope

- **405 handling** — deferred to the M2 pre-flight route restructure, where per-route method sets are being reshaped anyway; the ledger item is split, not dropped.
- **Env consolidation / app-type export** — the M2 pre-flight restructure (shared-client ADR) owns them; this spec changes no env or export surface.
- **Structured logging, log levels, request IDs** — `console.error` is the agreed floor; richer observability is future work once the uniform seam exists to hang it on.
- **Rate limiting, CORS hardening** — Milestone 6 items, untouched.
- **The intake module, stitch module, and catalog builders** — candidates A (#13), B (#14), and C (#15) own those; this spec touches only the route layer around them.

## Further Notes

- **Ordering with A:** land after #13. A proves log-before-500 on the hottest route and closes the ledger item partially; D generalizes it, deletes A's inline lines, and closes it fully. If D lands first, A's logging decision is void — but A's transaction and typed-failure work is independent and unaffected.
- **Deletion test, for the record:** deleting the seam reappears the acquisition + try/catch + swallow cross-section in every current and future route handler — the complexity concentrates, which is the signature of a deep module. The four routes it replaces are the real adapters that justify the seam; the wrapper-function alternative was rejected because policy-by-convention erodes exactly the way the pasted comments did.
- **Ledger hygiene on landing:** progress.md updates the log-before-500 item to closed (fully), notes the 404 half of the 404/405 item as done with 405 explicitly pointed at the M2 pre-flight, and the per-route acquisition comments become obsolete (their ruling now has a structural home).
