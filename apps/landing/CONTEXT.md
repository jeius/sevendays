# Landing

The public site: marketing content plus the booking flow. Customers here are anonymous; all data comes from or goes to the API (see its CONTEXT.md for the core vocabulary).

## Language

**Guest booking**:
A booking completed without an account — the only kind in v1.
_Avoid_: anonymous user, public booking

**Booking flow**:
The customer journey: Branch → Service Package → date/time Slot → contact info → Confirmation.
_Avoid_: checkout, funnel (except in analytics event names)

**Confirmation**:
The end state of the Booking flow — the on-site confirmation state plus the email the API sends.
_Avoid_: receipt, ticket

**Availability (customer view)**:
What the slot picker shows: only open Slots for the chosen Branch and date. Out-of-hours and full Slots are never offered as bookable.
_Avoid_: calendar

**Deactivated (Service Package)**:
A package that must not appear anywhere on the landing site — not in listings, not bookable by direct URL.
_Avoid_: sold out (that is a Slot-capacity state, not a package state)
