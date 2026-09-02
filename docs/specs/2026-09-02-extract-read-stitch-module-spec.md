# Spec: Extract the read-stitch module (architecture review, candidate B)

_Decided 2026-09-02 (architecture review session; candidate B of the 2026-09-02 HTML review). Related: ADR-0003 (per-workspace vitest configs), ADR-0008 (integration tests vs real Postgres), ADR-0009 (normalized catalog lookups + the ordering rules), ADR-0011 (per-request db client, untouched). Sequencing: lands after candidate A (#13) — same service module, opposite (read) side. Tracking: `docs/progress.md` watch-item on junction ordering._

## Problem Statement

Every list read in the API that returns parents with children — Service Packages with Inclusions, Inclusions with Attires, Service Packages with Frames, Appointments with Add-on Services — is assembled the same way: query children in a known order, group them into a `Map` keyed by parent, then join them back onto the parents in a final pass. That idiom is hand-rolled twice today (the Service Package catalog read carries four of these Maps; the Appointment list read carries one), and its subtleties are re-derived in a third place: the test fixtures, which use one statement per junction row specifically so the append-only `created_at` ordering proxy doesn't tie. The rules that make the stitch correct — children arrive pre-ordered and stay in that order, a parent with no children gets an empty list, not `undefined` — live only as scattered comments and correctly-guessed code, not as a tested contract. Every M2 stitched read (landing catalog pages, admin dashboard lists) starts by copying the idiom again.

## Solution

One small module in the API owns row-assembly: `groupChildren(children, childKey)` returns a lookup function from parent key to that parent's children, preserving the children's incoming order and returning an empty list for keys with no children. Call sites keep their SQL (including the `ORDER BY` that pins the append-only ordering proxies) and their one-line spread-attach; the Map plumbing, the empty-group default, and the order-preservation guarantee become one tested implementation instead of five hand-rolled copies. Both existing call sites adopt it in the same change.

## User Stories

1. As a developer building the landing catalog pages (M2), I want Service Package reads assembled by one proven module, so that my stitched reads inherit correct ordering and empty-list behavior instead of re-deriving them.
2. As a developer building the admin dashboard (M4), I want the same assembly module available for Appointment and catalog lists, so that both frontends' reads behave identically.
3. As a customer browsing the catalog, I want Inclusions, their Attires, and Frames to appear in the catalog's own order, so that what I see matches the price list I was shown (behavior preserved, now guaranteed in one place).
4. As a developer adding Availability reads in M3, I want a small assembly interface ready, so that Slot-count stitching is a call, not a fourth hand-rolled Map with freshly rediscovered edge cases.
5. As a maintainer, I want the order-preservation and empty-group rules tested once, so that a regression in assembly cannot silently reorder a customer-facing catalog or drop a package's inclusions to `undefined`.
6. As a developer editing the Appointment list read, I want the add-on stitch to be one call, so that my diff shows intent instead of fifteen lines of Map plumbing.
7. As an agent (or human) navigating the codebase cold, I want "how are children attached to parents" answerable by one module's docstring, so that I stop reconstructing the rule from comments in three files.
8. As a reviewer of catalog PRs, I want assembly correctness to be a property of one module's tests, so that read-feature PRs are reviewed for their SQL and shapes, not for a re-typed idiom.
9. As a future session touching the junction-ordering watch-item, I want the assembly contract pinned by tests, so that introducing a persisted order column later changes one module's documentation, not every call site's assumptions.

## Implementation Decisions

- **API-local module.** The module lives beside the service modules it serves. The database package's exported interface stays as-is: it owns schema, client, and migrations — row-assembly for the API's reads is not its concern, and moving it there would widen an interface for consumers that don't exist.
- **Interface: one function, two arguments.** `groupChildren(children, childKey) → (key) => Child[]`. The lookup function is the whole interface; call sites keep their one-line object-spread attach, which is where their per-read shape genuinely differs.
- **Interface facts (the deletion-test payload), stated and tested:** children are returned in the order they arrived (queries deliver them pre-ordered via `ORDER BY` — that responsibility stays at the query, where the append-only `created_at` proxies live per the ADR-0009 revision); a key with no children yields `[]`, never `undefined`; child keys are extracted by a caller-supplied function, not hardcoded column names.
- **Both call sites adopt in the same change.** The Appointment list read's add-on stitch and all three grouping Maps in the Service Package catalog read (inclusions, attires-by-inclusion, frames-by-package). Partial adoption would keep the duplication alive — the worst of both.
- **The module never sees SQL.** It is pure row-assembly over already-fetched arrays. The nested domain projection in the catalog read (building resolved attire/frame/print-size objects) stays in the service: it is shape-building, not assembly.
- **No shared-types changes, no wire changes.** Response payloads are byte-identical.

## Testing Decisions

- **What makes a good test here**: assert the lookup's external behavior — what comes back for a key with children, a key without, repeated keys, and whether incoming child order survives. Never internals (no Map inspection, no call-order assertions).
- **Unit tests, no database.** The module is pure, so its tests need no fixtures, no truncation, no compose: fast table-driven cases covering order preservation, empty-group default, many-parent fan-out, and single-child groups. They live in the API's existing vitest suite (per-workspace config per ADR-0003; the suite's global setup still expects the compose database for its integration siblings, which CI already provides).
- **Integration suites pass unchanged.** The real-Postgres suites for the Appointment list and Service Package catalog endpoints are the proof the refactor changed nothing observable (ADR-0008's stance — real DB over mocks — is why no SQL seam or mock is introduced anywhere here).
- **Prior art**: the shared types package's unit-test style for the pure-function cases; the existing endpoint integration suites for the behavior-preservation proof.

## Out of Scope

- **SQL and query changes** — `ORDER BY` clauses and the `created_at` append-only ordering proxies stay exactly where they are.
- **Persisted order columns** — the junction tables keep no position column; if M2's UI needs persisted per-inclusion attire order, that remains the future migration tracked in progress.md. This spec only guarantees that assembly preserves whatever order the query delivers.
- **M3 Availability adoption** — the future Slot-count read adopts the module; its design is M3's.
- **The write path** — candidate A (#13) owns the Appointment intake module and the shared Appointment projection constant; this spec's call sites consume them as-is.
- **Wire shapes, error policy, acquisition** — untouched here; D and A own those.

## Further Notes

- **Deliberate ruling, recorded:** the review's codebase walk suggested waiting for a fifth caller (M3 Availability) before abstracting. The user's ruling on 2026-09-02 overrides it: the two existing call sites already re-derive the ordering and empty-group subtleties three times including fixtures, and the module's interface is one function — the cost of waiting (a fourth, fifth hand-rolled copy) outweighs the cost of a small, fully-tested pure module now.
- **Sequencing:** implement after #13 — the two specs touch the same service module from opposite sides, and A's projection constant is an input to B's call sites.
- **Interface is the test surface:** all assembly behavior is proven through `groupChildren`; nothing tests past it. That is what keeps the SQL mock-free per ADR-0008.
