# ADR-0009: Normalized catalog lookups for Print sizes, Attires, and Inclusions

**Status:** Accepted
**Date:** 2026-08-31

## Context

The catalog (`docs/catalog.md`) describes packages in prose: picture lines like "2pcs 2R Toga" and "1pc 8x10 Filipiniana/Executive", a shared set of wardrobe privileges, and two sizes (8R and 8x10) that are nominally the same physical size yet both appear in the price list. The M1 data layer has to store all of this. Options in tension: JSONB blobs on `service_packages` are maximally flexible and trivially seedable but make nothing queryable or constrained; free-text columns are even weaker. Meanwhile the booking flow (M2) and the dashboard (M4) will need to render and filter by size, attire, and inclusion kind, and the studio edits prices and packages over time.

## Decision

Model the catalog normalized: `print_sizes` and `attires` as lookup tables (unique `code` / `name`, one attire row per catalog value including the combined forms like `Filipiniana/Executive/Uniform`), and per-package `package_inclusions` rows discriminated by a `kind` enum (`framed_picture | print | privilege`) with nullable `quantity`, nullable FK references to the two lookups, and a nullable `description`. Privileges are quantityless inclusion rows seeded per package even though the catalog's list is universal — CMS-editable later rather than hard-coded. Price and inclusion facts stay data, not code: nothing in the schema hardcodes catalog values. There is no finish column — framed pictures are laminated, loose prints are raw, decided structurally by `kind`. The 8R/8x10 duplicate remains two rows; the discrepancy is recorded in the print size description for client confirmation at seed review, not resolved by code.

## Alternatives Considered

- **JSONB inclusions array on `service_packages`** — rejected: no FK integrity to lookups, no uniqueness or type enforcement on shape, and filtering/aggregation ("which packages include an 8x10 frame?") becomes JSON surgery.
- **Free-text inclusion lines** (verbatim "2pcs 2R Toga" strings) — rejected: unqueryable, untranslatable for M2's booking UI, and invites drift from the lookup vocabularies.
- **Hard-coding the universal privilege list in application code** — rejected: the CMS (Milestone 5) must be able to edit packages' inclusions without a deploy.
- **Splitting combined attires (`Filipiniana/Executive`) into separate rows joined via a bridge** — deferred: nothing in M1–M4 queries attire composition; one row per catalog value is exactly the vocabulary the catalog uses. Splitting later is a data migration, not a schema redesign.

## Consequences

- Seeding (M1.3) is more work: 11 packages × their inclusion lines must be decomposed into lookup ids (6 print sizes, 7 attires) — the seed is reviewed line-for-line against `docs/catalog.md`.
- The API must join/structure inclusions for display (the `servicePackageWithInclusions` read shape) instead of returning a stored blob.
- If the client renames a size or attire, it's an update on one lookup row; if they add a ninth print size, it's an insert.
- The attire combined-form representation is a known simplification — revisit with a bridge table only when a real query needs attire composition.
