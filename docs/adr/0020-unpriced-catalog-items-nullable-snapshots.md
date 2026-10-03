# ADR-0020: Unpriced catalog items — nullable prices end to end, snapshots included

**Status:** Accepted — amends ADR-0013
**Date:** 2026-10-02

## Context

ADR-0013 pinned the generalized appointment model on a quoted-price invariant: every booked row carries the price the customer was quoted, snapshotted at intake, so catalog edits never rewrite a booked row's facts. That invariant assumed every catalog item has a price. The owner's 2026-09-30 audit ruled otherwise (maturation map #158, ticket #163): some real offerings are priced "on inquiry" — the studio wants them in the catalog and **fully bookable** without publishing a peso figure. All three priced entities are affected (Service Packages, Studio Services, Add-on Services), and by the snapshot design the booking path is affected with them: an unpriced item booked today snapshots… what? M5's CMS also made prices mandatory in every editor, so the state couldn't even be represented.

The catalog columns are live on the shared production database with real content, and so are the four snapshot columns — a metadata-only migration is required, not a table rewrite.

## Decision

**Null is the unpriced state, everywhere a price lives.** The three catalog `price_cents` columns and the four booking-path snapshot columns (`appointments.booked_price_cents`, `appointment_addon_services.price_cents` — each column nullable; ADR-0013's snapshot machinery unchanged otherwise) become nullable via a metadata-only `DROP NOT NULL` migration. The wire contract is `priceCents: number | null` on public reads and admin writes; there is no sentinel value and no second column. ADR-0013's invariant is amended to: **every appointment carries its quoted price when the booked item had one.** A catalog row that goes unpriced does not retroactively blank existing snapshots — a snapshot taken while the item was priced keeps that price, which is exactly the quoted-price guarantee ADR-0013 exists to make.

Rendering follows the null honestly: wherever a price would render, nothing renders (no placeholder, no "inquire" line, no CTA change), `peso()` becomes null-safe across the render sites, and a booking Total that would include an unpriced component is omitted entirely — priced add-ons keep their per-item lines. The CMS represents the state with a "has price" checkbox that is UI sugar over the nullable column (unchecked saves null; re-checking requires re-entry).

## Alternatives Considered

- **Zero as the unpriced sentinel** — rejected: "free" and "unpriced" are different business facts; totals arithmetic and the omission rule would both need sentinel checks that a nullable column makes structural.
- **Inquire-only (unpriced items not bookable)** — rejected by the owner (maturation #163, Q3/Q4 compound re-ask): the Book CTA stays; the studio converts inquiries through the same booking flow.
- **A separate `priced` boolean beside a mandatory price** — rejected: two sources of truth for one state; the checkbox belongs to the UI layer, not the schema.
- **Table-rewriting migration** — rejected: `DROP NOT NULL` is metadata-only on the live shared DB; nothing else is needed.

## Consequences

- Both editions share the schema, so the migration applies once; the v1-pick classes split by surface — catalog migrations/types/CMS checkbox/landing omission pick clean, while the booking-path (snapshot) columns and the summary/confirmation Total changes are main-only until v2 (ADR-0015).
- v2's prepaid flow (deposits) will meet unpriced appointments: a prepaid booking must require priced items or route unpriced ones to pay-on-arrival — a v2 ruling, parked; the schema permits the state from now on.
- Every price consumer must handle null once: the landing cards and detail sheets, the booking summary rail, the confirmation card, and the CMS editors. The confirmation email already renders no prices (ADR-0014's money-free construction), and the admin appointments list does not either — no ripple there.
- ADR-0013's "contract half (NOT NULL restoration) never became necessary" note ages further: with unpriced as a legal state, restoration is off the table permanently.
