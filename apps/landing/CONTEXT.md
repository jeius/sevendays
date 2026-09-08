# Landing

The public site: marketing content plus the booking flow. Customers here are anonymous; all data comes from or goes to the API (see its CONTEXT.md for the core vocabulary).

## Language

**Guest booking**:
A booking completed without an account — the only kind in v1.
_Avoid_: anonymous user, public booking

**Booking flow**:
The customer journey: Branch → the booked offering (a Service Package, or a Studio Service bookable at that Branch) → optional Add-on Services → date/time Slot → contact info → Confirmation.
_Avoid_: checkout, funnel (except in analytics event names)

**Studio Service**:
A standalone studio offering (photo recovery, tarpaulin & bulletin printing, portraits & ID photo, picture framing) showcased on the Services page and bookable through the Booking flow at Branches where enabled. Distinct from an Add-on Service, which only attaches to a booking.
_Avoid_: service (unqualified), other service

**Services page**:
The landing page showcasing Studio Services. Never a list of Add-on Services — those appear only inside the Booking flow.
_Avoid_: offerings page

**Confirmation**:
The end state of the Booking flow — the on-site confirmation state plus the email the API sends.
_Avoid_: receipt, ticket

**Availability (customer view)**:
What the slot picker shows: only open Slots for the chosen Branch and date. Out-of-hours and full Slots are never offered as bookable.
_Avoid_: calendar

**Deactivated (Service Package)**:
A package that must not appear anywhere on the landing site — not in listings, not bookable by direct URL.
_Avoid_: sold out (that is a Slot-capacity state, not a package state)
