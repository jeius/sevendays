# ADR-0005: Hourly slot grid with per-slot capacity for booking availability

**Status:** Accepted
**Date:** 2026-08-30

## Context

The PRD's booking flow takes any date/time with no availability concept, so nothing stops two customers booking the same branch at the same time, or a booking at 3am. Milestone 3 adds availability. The stress-test scenarios ("double booking a Saturday 10:00", "booking at 3am") can be solved with anything from a simple hours table to a full duration-aware calendar. The tradeoff: duration-aware scheduling is what real studios eventually want (a 30-min passport photo vs. a 2-hr wedding package), but it requires overlapping-booking math, a calendar UI, and far more schema; capacity-per-fixed-slot solves both stress scenarios with one small table.

## Decision

Availability = **branch business hours + per-slot capacity on a fixed hourly grid**. Each branch has opening hours and a max-concurrent-bookings-per-hour; the API rejects out-of-hours and over-capacity bookings; the landing slot picker only offers open slots. Package duration is ignored — every booking occupies exactly one slot of the hour it starts in. The grid is fixed at hourly (first Milestone 3 checkbox re-confirms it with the client). Branch hours and capacity are seeded until the Milestone 5 CMS adds editing.

## Alternatives Considered

- **Duration-aware slots** (bookings occupy `package.duration`, calendar math for overlaps) — rejected for v1: disproportionate schema/UI cost, and no client requirement yet. If it's ever needed it supersedes this ADR; the hourly grid is a migration away, not a redesign.
- **Blackout dates only** (admin marks closures, no hours/capacity logic) — rejected: doesn't prevent double-booking or 3am bookings, which were the motivating scenarios.

## Consequences

- Cheap, explainable model: staff reason in "N bookings max per hour, per branch."
- A branch that genuinely books overlapping shoots of different lengths can't be modeled — hour capacity must absorb it (e.g. capacity = concurrent shoots, not time).
- Changing grid granularity later is a schema migration plus re-seeded hours; decide before real bookings exist.
