# ADR-0012: Exactly-one booked offering, enforced on both sides

**Status:** Accepted
**Date:** 2026-09-07

## Context

The appointment model generalized from package-only to either a Service Package or a Studio Service (M2 booking-flow spec). Two invariants must hold together: every appointment books exactly one offering, and every consumer — the API intake, the booking form's payloads, future CMS writers — sees the same rule. The `appointments` table is the last line of defense (a rejected insert is safer than a corrupted row), while the shared Zod schemas are the first (a rejected payload never reaches the DB).

## Decision

Exactly-one is encoded twice, deliberately, from one formula — `(service_package_id is null) <> (studio_service_id is null)`:

- **Zod side:** `hasExactlyOneAppointmentOffering` + `EXACTLY_ONE_APPOINTMENT_MESSAGE` in `packages/types/src/appointment.ts`; all three appointment schemas refine with them.
- **SQL side:** the named `appointments_offering_exactly_one` CHECK on `appointments` (migration 0004).

The two are textual mirrors; changing one means changing both (pinned in the schema comments on both sides). The snapshot column renamed `package_price_cents` → `booked_price_cents` in the same migration — zero production rows made the rename free, and it will never be free again.

## Alternatives Considered

- **DB-only enforcement** — rejected: wire payloads would fail late (500-class or post-insert errors) instead of at the schema seam where the client can map reasons to friendly copy.
- **Zod-only enforcement** — rejected: any writer that bypasses the schemas (script, future CMS code path, manual SQL) could corrupt the table; the spec's user story 31 asks for the database to enforce it.
- **Two subtypes instead of nullable refs** (a `package_bookings`/`service_bookings` split or a discriminated union at the storage level) — deferred: one row per appointment keeps the M1.4 intake transaction, list read, and junction stitching intact; the expand half of expand–contract ships now and the contract half never became necessary.

## Consequences

- Migration 0004 stays a single generated migration because the table was zero-row — a later change to this constraint on a populated table will need the populated-table two-step.
- The exactly-one formula lives in two places by intent; the comment on each side names the other. A drift between them is a review-visible defect, not a silent one.
- Zod v4 chain rule: refinements ride the terminal link of every schema chain (`.omit()` throws on refined objects) — `appointmentFieldsSchema` is the shared unrefined basis for that reason.
