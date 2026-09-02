# Spec: One catalog row-shaping module, three consumers (architecture review, candidate C)

_Decided 2026-09-02 (architecture review session; candidate C of the 2026-09-02 HTML review, reshaped by the grilling after reading the seed mechanics — the review card's original "one writer" sketch was rejected). Related: ADR-0008 (integration tests vs real Postgres — minimal fixtures stance is preserved, not relaxed), ADR-0009 (normalized catalog lookups + junction in catalog order), ADR-0007 (connection topology — seed/verify still ride the session-mode URL). Tracking: `docs/progress.md` Known Gaps (TODO(seed) phones are user data in `catalog.ts`, untouched here)._

## Problem Statement

The catalog domain — Branches, Service Packages, Inclusions by Kind, Attires, the junction pairs that compose combined Attire contexts in catalog order, Frames, Print sizes, Add-on Services — is encoded independently by three modules that must agree without anything forcing them to. The seed's row-shaping (catalog entries + resolved code/name→id lookups → typed row values and junction pairs) is written once in the seeder. The API integration test fixtures re-derive the same mappings by hand for a smaller synthetic set — every Inclusion Kind's required fields, how `attireNames` become junction pairs, how a Frame links to its package and its framed-picture Inclusion. And the test harness's truncate list hand-names all ten tables, a mirror of the schema export that the integration-test ADR itself warns will drift the next time a migration adds a table. None of this is hypothetical duplication: the fixtures and the seeder already disagree in small ways (fixture phones vs seed phones, fixture descriptions), and every future table or Kind variant must now be encoded in three places plus a test-list, or state leaks between test files.

## Solution

Lift the row-shaping knowledge into one module inside the database package: pure functions from catalog-style entries plus resolved id lookups to typed row values and junction pairs — what an Inclusion row needs per Kind, how combined Attire contexts decompose into junction pairs in catalog order, how Frames attach, nothing about *how* or *when* rows are written. The seeder keeps its one-transaction upsert-and-rebuild flow; the API test fixtures keep their minimal synthetic dataset and plain inserts; the truncate list is derived from the exported schema instead of hand-named tables. Three thin consumers, one shape source, and the database package's main interface unchanged.

## User Stories

1. As a developer writing the M2 catalog-write routes, I want Inclusion and junction row shapes produced by one module, so that the server-side writes match the seeder's shapes by construction instead of by re-reading `docs/catalog.md`.
2. As a developer adding a catalog table or an Inclusion Kind variant (M2/M3), I want the change to land in one shaping module, so that the seeder, fixtures, and verify tooling all agree without a three-file hunt.
3. As a maintainer of the integration suite, I want the truncate list derived from the schema export, so that a new table is truncated automatically instead of leaking state between test files (the drift the integration-test ADR explicitly warns about).
4. As a developer debugging a seed discrepancy, I want one place that answers "what columns does this row get and why", so that verification against the catalog document is a one-module question.
5. As a future session seeding a staging environment or rehearsal database, I want the same shaping functions available outside the seed script, so that rehearsal data is shaped identically to production seed data.
6. As an agent (or human) navigating cold, I want the junction-ordering and Kind-field rules visible in one module's signatures and docs, so that I stop cross-referencing the seeder, the fixtures, and two ADRs to write one insert.
7. As a reviewer of catalog PRs, I want shape changes to be one diff, so that review checks the mapping once instead of diffing three hand-rolled copies against each other.
8. As the studio owner, I want the live catalog untouched by this refactor, so that the verified seed (line-for-line against the catalog document, re-run proven idempotent) keeps its exact behavior.

## Implementation Decisions

- **Pure row-shaping builders in the database package.** Functions from entries + resolved ids to row values and junction pairs — e.g. inclusion rows per Kind, junction pairs from an entry's attire-name list resolved through an id map in catalog order, frame rows from package + frame number. No I/O, no client creation, no transactions inside the module: it never writes, it only shapes.
- **The write layers stay separate — deliberately.** The seeder keeps its one-transaction natural-key upsert flow with per-package inclusion rebuild; the fixtures keep plain inserts capturing returned ids. Upsert-vs-insert is a real behavioral fork; folding it behind one writer would grow the interface a "how" knob — half-shallow — and drag test-harness concerns into the production package. The builders absorb exactly what deleting them would reappear: the shape mappings.
- **Fixtures stay minimal and synthetic.** The integration-test ADR's stance (minimal hand-written fixtures; the compose database is never catalog-seeded) is preserved. The builders are data-agnostic — they shape whatever entries they are handed, real catalog or synthetic test data. Fixture phones stay placeholders; the seed's TODO(seed) phones are user data in the catalog transcription, out of scope.
- **Three consumers adopt in the same change:** the seeder, the API test fixtures, and the truncate helper — whose table list is now derived from the exported Drizzle schema (filtering to the public tables) instead of a hand-kept array.
- **Opt-in subpath export** on the database package, following the precedent of the migrate subpath created for the test harness: the main entry keeps exporting schema + client + migrate only; scripts and tests import the builders explicitly.
- **The catalog transcription and its document are untouched.** The transcription remains the seed's source of truth, verified line-for-line against the catalog document; the builders consume entries shaped like theirs, they don't replace them.
- **The M1.5 rehearsal/verify gate scripts stay standalone.** Their independence (psql-equivalent SQL, direct client, run under the env-file entrypoint against the live database) is what made the exit gate trustworthy while package internals were under test — folding them in would couple the audit tool to the module it audits.

## Testing Decisions

- **What makes a good test here**: assert the builders' outputs — given these entries and these resolved ids, these exact row values and junction pairs come back, attires in catalog order, per-Kind fields complete. No database, no I/O, no call-order assertions.
- **Unit tests on the builders** in the database package's existing vitest harness (per-workspace config per the vitest ADR): table-driven over every Inclusion Kind, the combined-attire decomposition (order-sensitive), frame attachment, and the unknown-attire-name case, whose treatment (fail loudly vs skip) gets pinned as an explicit documented behavior rather than inherited accident.
- **Behavior-preservation proofs through existing seams:** the seed/verify flow (re-runnable upserts, verify-seed comparison against the catalog document) proves the seeder's output is unchanged; the API integration suite proves the fixtures still produce the shapes the endpoints' tests assert against; CI's first-run-green compose path covers the derived truncate list end to end.
- **Prior art**: the migrate module's focused unit test in the database package; the shared-types package's table-driven schema tests for the builder cases.

## Out of Scope

- **Seed data changes** — phones (TODO(seed)), print-size descriptions (the 8R/8x10 client confirmation), package contents: the catalog transcription is frozen here; only its *consumption* is refactored.
- **The catalog write routes themselves** (M2) — they will call the builders, but their route/service design is separate work.
- **Rehearsal/verify gate scripts** — deliberately standalone, per the ruling above.
- **Schema or migration changes** — none; the junction tables keep no position column (the M2 watch-item stays a future migration decision).
- **Fixture dataset redesign** — same synthetic branches, packages, attires, add-ons; only their shaping moves.
- **Wire shapes** — no API responses change.

## Further Notes

- **Correction from the review card:** the 2026-09-02 report's original sketch (one `loadCatalog` writer with three adapters) was drawn before the seed's upsert/rebuild mechanics were read; the grilling reshaped it into pure builders. The card's "two adapters make the seam real" still holds — the seam is now the shaping interface, with the seeder and the fixtures as its two real adapters.
- **Sequencing:** independent of #13 and #14 at the code level (different package), but benefits from landing after A: the M2 catalog-write routes that adopt the builders land after the intake module they'll sit beside.
- **Deletion test, for the record:** deleting the builders reappears the shape mappings in the seeder and the fixtures and the truncate mirror in the harness — three reappearances is the signature of a module earning its interface.
