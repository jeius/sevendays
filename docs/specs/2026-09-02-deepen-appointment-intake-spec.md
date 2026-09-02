# Spec: Deepen the Appointment intake module

_Decided 2026-09-02 (architecture review session; candidate A of the 2026-09-02 HTML review, top recommendation; grilled to an empty frontier). Authoritative decision record: none yet — ADR-0007 gains a transaction-pooling refinement note if the live probe passes. Related: ADR-0005 (Slot capacity), ADR-0006 (api-client), ADR-0007 (connection topology), ADR-0008 (integration tests vs real Postgres), ADR-0011 (per-request db client). Tracking: `docs/progress.md` M2 ledger — closes the "insert txn" item; partially closes "log-before-500"._

## Problem Statement

Booking an Appointment is the one write path customers will drive, and the module that owns it — Appointment intake — is shallow at exactly its load-bearing decisions. Three facts a caller must know but shouldn't:

- The create write is **not atomic**: it inserts the Appointment, then its Add-on Service junction rows, with a partial-write window between them. A junction failure leaves a persisted Appointment with no add-on rows — and ADR-0005's Slot capacity enforcement (M3) must bolt a check-then-insert onto this exact path, which is racy unless the path is transactional first.
- **Rejection wording is a caller concern**: the module returns a bare reason string and the route owns the reason→message map — interface complexity that belongs inside the module (a second fact every caller and test must learn).
- **Failures are silent**: every route catches errors and returns the uniform 500 without logging — the exact silence that hid deploy blocker #2 (per-isolate db client, ADR-0011) until wrangler tail + temporary instrumentation surfaced it. Progress.md marks log-before-500 load-bearing for M2's api-client work.

Additionally, the 13-column Appointment projection is hand-copied verbatim between the create and list reads in the same module — edit two places, nothing forces sync.

## Solution

Deepen the Appointment intake module behind its existing interface. `createAppointment` stays a single call taking the per-request database handle (ADR-0011); inside, one transaction now wraps reference resolution and both inserts. Reference rejections become typed failures carrying their user-facing message — the module owns the wording, byte-identical to today's — so the route's failure branch is one call to the uniform 400 helper. The route logs any thrown error before the uniform 500. The duplicated projection collapses to one shared constant. No wire-shape changes: status codes, payload shapes, and message text are unchanged.

## User Stories

1. As a customer booking through the landing site, I want my Add-on Service selections saved with my Appointment or not at all, so that I never pay for or arrive expecting add-ons the studio can't see.
2. As a customer, I want a booking against a deactivated Service Package rejected with a clear message, so that I understand why and can pick an active one.
3. As a customer, I want reference mistakes (unknown Branch, unknown or inactive Add-on Services) rejected with per-entity messages, so that support can understand a failed booking without engineering help.
4. As the studio owner (admin, M4), I want an Add-on Service deactivated today to be unbookable in the same instant, so that "inactive" is true the moment I flip it, not after some cache window.
5. As the studio owner, I want a booking to snapshot the price the catalog had at booking time, so that later price edits never rewrite what a customer was quoted (behavior preserved, now inside the transaction).
6. As a developer integrating the booking flow in M2, I want every failure logged server-side before the uniform 500, so that a bug report from production names the actual error instead of "500".
7. As a developer picking up the repo cold, I want booking rules (reference resolution, snapshots, atomicity, rejection wording) concentrated in one module, so that I read one file instead of bouncing between module and route.
8. As a developer, I want the Appointment write testable through the module's existing interface, so that atomicity and rejection behavior are proven without mocks or interface changes.
9. As a developer, I want the Appointment projection defined once, so that the M3 availability work and M4 auth fields don't have to remember to update two copies.
10. As a developer building M3's Slot capacity, I want the intake write transactional, so that a capacity check-then-insert can join the same transaction instead of racing across separate round trips.
11. As an agent (or human) triaging a production 500 on the booking endpoint, I want the error in the Worker logs, so that the M1.5 class of invisible failures can't recur.
12. As a maintainer of the API's routes, I want the reason→message translation gone from the route layer, so that route handlers stay thin (parse → call → respond) per the engineering rules.
13. As a future session planning candidate D (the acquisition/error seam), I want log-before-500 already proven on the hottest route, so that generalizing it into middleware is a mechanical follow-up rather than a new design.

## Implementation Decisions

- **Interface unchanged, depth grows behind it.** The intake module's interface stays one function taking the per-request database handle and the validated booking input, returning a typed result. Callers never learn transactions exist; the transaction opens inside the module.
- **Module-internal transaction.** One transaction wraps reference resolution (Branch, Service Package, Add-on Services) and both inserts (Appointment, junction rows). This also closes the TOCTOU where a Service Package is deactivated between its read and the insert. Statements per transaction: five, all cheap. ADR-0011 is untouched: the per-request client is acquired by the route exactly as today; the transaction lives inside one request.
- **Typed failure carries its message.** The failure variant of the module's result becomes `{ ok: false, reason, message }`; the module owns the wording. Message text is byte-identical to the route's current reason→message map, which is deleted. `reason` remains in the type — it is the discriminated failure the tests assert on and the forward-compat hook if the wire ever needs machine-readable reasons (see Out of Scope).
- **One projection.** The 13-column Appointment projection shared by create and list collapses to a single constant in the module.
- **Log-before-500 on the appointments route only.** Both of its handlers (create, list) log the caught error before returning the uniform 500. The other three routes are untouched; candidate D generalizes the policy into middleware.
- **No shared-types changes.** The result type is module-internal; the wire error payload keeps the existing uniform error shape with no `details` extension.

## Testing Decisions

- **What makes a good test here**: assert external behavior only — status codes, payload shapes, rejection messages, and what is (or is not) persisted. Never internal call ordering, transaction objects, or private helpers.
- **Seam 1 — the module's interface (the only place behavior is proven).** The existing compose integration suite already crosses this seam over real Postgres (ADR-0008); it is the whole test surface for this spec: message-identical rejections, snapshot writes, empty vs populated add-on lists. Its happy path now additionally proves a commit over postgres-js transactions.
- **Seam 2 — one new rollback proof, tested at the database layer.** In the db package's compose test suite: open a transaction, insert into a scratch/temp table, throw mid-transaction, assert the row is absent. This pins the rollback semantics the intake module will rely on.
- **Seam 3 — the live pooler probe (one-shot verification, not a suite).** Before this work is called done, a rehearsal-style probe runs once against the live Supabase transaction-mode pooler (the session-pooler URL used for migrations): open a transaction over a temp table, insert, throw, assert absence — proving explicit transactions work under transaction-mode pooling. Prints derived facts only, never a connection string. This is the M1.5 lesson applied: workerd/pooler behavior does not show up in Node-env compose tests (the class of gap that let deploy blocker #2 ship invisible).
- **Existing tests pass byte-identical.** The compose suite for the appointments endpoints must pass with message text unchanged; no test file is rewritten to accommodate new internals.
- **Prior art**: the existing real-Postgres integration suites (apps/api + packages/db), and the M1.5 rehearsal/verify probe pattern in packages/db for the live pooler probe.

## Out of Scope

- **Wire-shape additions** — `details: { reason }` on the 400 payload is deferred until a real consumer exists (M2's typed client error could want it; adding later is backward-compatible). The module's typed `reason` stays ready.
- **The other three routes** (Branches, Service Packages, Add-on Services) — their silent catches and acquisition idioms are candidate D (one acquisition/error seam via middleware).
- **The list side's stitch/ordering design** — `listAppointments` keeps its behavior; the shared projection constant lands with this spec, but stitch/ordering patterns are candidate B.
- **Availability/Slot capacity** (M3) — this spec makes the write transactional so M3's invariants *can* land inside it; it does not add them.
- **Logging generalization, 404/405 envelope shape, Env consolidation** — candidate D and the M2 pre-flight restructure (ADR-0006) own those.
- **Schema or migration changes** — none.

## Further Notes

- **Pooler caveat is the point**: under Supabase transaction-mode pooling, an explicit transaction pins one pooled connection for its duration — supported, but unproven on this project's live URL until the probe runs. `prepare: false` (already set everywhere) remains the hard requirement. If the probe fails, the transaction decision reopens (fallback: transaction around the two inserts only, or surface the finding to revisit ADR-0007); record the outcome in the ADR-0007 refinement note and progress.md either way.
- **Confirmation gate**: the composition of both a passing compose suite and a passing live probe is what closes the "insert txn" ledger item; compose-green alone does not.
- **Stale comment housekeeping** rides along as its own tiny commit: the db client still carries its pre-M1.3 "STUB: no live database is provisioned yet" comment — factually wrong, AI-navigability rot, zero code risk.
- **Docs obligations on landing**: progress.md Known Gaps updated (insert-txn closed; log-before-500 partially closed — appointments route only; one-line ruling: M2+ may add `details:{reason}` to 400s if the admin UI needs machine-readable reasons); ADR-0007 refinement note if the probe passes.
- **Candidate order** from the review: A (this spec) → B/C/D in later sessions; the walker's note that the Map-stitch abstraction should wait until M3's Availability becomes a fifth caller is recorded for B's session.
