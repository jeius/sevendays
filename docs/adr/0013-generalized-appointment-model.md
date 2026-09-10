# ADR-0013: One appointments table, nullable offering refs, booked-price snapshots

**Status:** Accepted
**Date:** 2026-09-10

> **Note:** the `appointments` tables ship in `packages/db` as inert schema — documentation of the data model; no runtime path reads or writes them. This ADR is kept because it explains those tables.

## Context

The PRD's "services offered" turned out to be a distinct entity — Studio Services (photo recovery, tarpaulin & bulletin printing, portraits & ID photo, picture framing) — not the catalog's Add-on Services, and until M2 the `appointments` table could represent only Service Package bookings (`service_package_id` NOT NULL; snapshot column `package_price_cents`). The M2 booking flow records either offering kind through one guest flow, the intake must stay one transaction (M1.4), and catalog prices change over time while each booking must keep the price the customer was quoted (M2 spec user story 23). The table was young — zero production rows when the model moved (migration 0004, 2026-09-09).

## Decision

One `appointments` table books both kinds: `service_package_id` became nullable, a nullable `studio_service_id` FK joined it, and the snapshot column renamed to `booked_price_cents` — server-written at intake from the live catalog price. Exactly-one offering is enforced on both the Zod and SQL sides (ADR-0012's subject, not repeated here). Add-on selections remain junction rows carrying per-row `price_cents` snapshots; which add-ons may attach is uniform for packages (any active add-on) and matrix-gated for services (`studio_service_addon_services`). Every later read renders names by joining the referenced rows and prices only from the snapshots: a catalog edit never rewrites a booked row's facts.

## Alternatives Considered

- **Split tables (`package_bookings` / `service_bookings`) or a storage-level discriminated union** — rejected: it would split the intake transaction, the list read, and add-on junction stitching across two shapes for one business object; one row per appointment keeps all of M1.4's machinery intact. (Full ruling in ADR-0012's alternatives.)
- **Live-price joins at read time (no snapshots)** — rejected: the quoted price must not drift when the catalog changes, and the M5 CMS makes prices editable, which would otherwise silently rewrite history.
- **A JSONB "offering" column** — rejected: no FK integrity to the catalog, no CHECK-enforceable exactly-one, no typed shape for consumers.

## Consequences

- Names always join at read time (consumers pull them from the sibling catalog reads) — every consumer needs the record AND the catalog reads to render.
- Deactivating a package or service (M5 CMS) leaves booked rows untouched and fulfillable — the snapshot design buys that for free.
- The expand half of expand–contract shipped while the table was empty; the contract half (NOT NULL restoration) never became necessary and would now cost the populated-table two-step.
- A third offering kind would mean a new nullable ref plus extending the exactly-one formula in both its mirrors (ADR-0012) — deliberate friction.
