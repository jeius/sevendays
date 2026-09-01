# ADR-0009: Normalized catalog lookups for Print sizes, Attires, and Inclusions

**Status:** Accepted
**Date:** 2026-08-31
**Amended:** 2026-09-01 (owner-sanctioned single revision)

## Context

The catalog (`docs/catalog.md`) describes packages in prose: picture lines like "2pcs 2R Toga" and "1pc 8x10 Filipiniana/Executive", a shared set of wardrobe privileges, and two sizes (8R and 8x10) that are nominally the same physical size yet both appear in the price list. The M1 data layer has to store all of this. Options in tension: JSONB blobs on `service_packages` are maximally flexible and trivially seedable but make nothing queryable or constrained; free-text columns are even weaker. Meanwhile the booking flow (M2) and the dashboard (M4) will need to render and filter by size, attire, and inclusion kind, and the studio edits prices and packages over time. The catalog also numbers its frames — "Frame 1", "Frame 2" (and unlabeled multi-line `Frame:` sections) — and states that a frame can contain a single or multiple pictures; the original revision stored frame identity only as seed comments.

## Decision

Model the catalog normalized: `print_sizes` and `attires` as lookup tables (unique `code` / `name`; attires are **atomic** — Toga, Filipiniana, Executive, Uniform — with combined contexts like `Filipiniana/Executive` composed per inclusion through the `package_inclusion_attires` junction, ordered by the catalog's attire list), and per-package `package_inclusions` rows discriminated by a `kind` enum (`framed_picture | print | privilege`) with nullable `quantity`, a nullable FK to print sizes, attire context via the junction, and a nullable **frame reference** (`frame_id` → `frames`). The **`frames` table** (same amendment) gives each package's frames first-class identity: unique `(service_package_id, frame_number)`; explicit "Frame 1/2/3" headings map as-is, unlabeled multi-line `Frame:` sections number in listed order, and a single frame gets 1. Framed pictures are still `kind = framed_picture` inclusion rows — frames add identity, not a parallel taxonomy. Privileges are quantityless inclusion rows seeded per package even though the catalog's list is universal — CMS-editable later rather than hard-coded. Picture inclusions carry ≥1 attire (kind-aware rule enforced by the create-shape schema); privileges carry 0..N (some usage grants name no attire). Price and inclusion facts stay data, not code. There is no finish column — framed pictures are laminated, loose prints are raw, decided structurally by `kind`. The 8R/8x10 duplicate remains two rows; the discrepancy is recorded in the print size description for client confirmation at seed review, not resolved by code.

## Alternatives Considered

- **JSONB inclusions array on `service_packages`** — rejected: no FK integrity to lookups, no uniqueness or type enforcement on shape, and filtering/aggregation ("which packages include an 8x10 frame?") becomes JSON surgery.
- **Free-text inclusion lines** (verbatim "2pcs 2R Toga" strings) — rejected: unqueryable, untranslatable for M2's booking UI, and invites drift from the lookup vocabularies.
- **Hard-coding the universal privilege list in application code** — rejected: the CMS (Milestone 5) must be able to edit packages' inclusions without a deploy.
- **Splitting combined attires (`Filipiniana/Executive`) into a junction** — originally deferred ("one row per catalog value is exactly the vocabulary the catalog uses; splitting later is a data migration, not a schema redesign"). **Adopted on the 2026-09-01 revision**: with the customize-package flow (M1.4) needing per-attire selection and the frames work opening the same migration window, the junction replaced both the `attire_id` column and the combined-name rows in one additive migration. The original deferral reasoning stands for the pre-revision window.
- **Nullable `frame_number` column on `package_inclusions`** — rejected (2026-09-01): identical expressiveness for identity, but no home for future frame attributes (material, label, per-frame photo) and it spreads frame semantics across a column convention.
- **A `frame_pictures` child table owned by frames** — rejected (2026-09-01): duplicates the inclusion concept; framed pictures already exist as inclusions, and nothing needs per-picture attributes beyond what inclusions carry.

## Consequences

- **Amended 2026-09-01** (owner-sanctioned single revision): the frames table and the attire junction joined the schema in additive migration `0001`; `package_inclusions` lost `attire_id` and gained `frame_id`. Seed and verify were extended in the same change (frames upsert idempotent by natural key; junction rebuilt with inclusions; verify checks frame count/partition and junction completeness).
- Seeding (M1.3) is more work: 11 packages × their inclusion lines must be decomposed into lookup ids (6 print sizes, 4 atomic attires) — the seed is verified line-for-line against `docs/catalog.md`, with junction order preserving the catalog's attire order.
- The API must join/structure inclusions for display (the `servicePackageWithInclusions` read shape) and resolve attire sets through the junction instead of returning a stored blob.
- If the client renames a size or attire, it's an update on one lookup row; if they add a ninth print size, it's an insert. Adding a frame attribute (material, label) is a column on `frames`.
- Combined attire contexts are junction-composed; the catalog's attire order (Toga, Filipiniana, Executive, Uniform) is the canonical rendering order — never alphabetize.
