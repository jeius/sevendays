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

**Unpriced**:
A catalog item whose price is deliberately unset (null) — it stays fully bookable, and nothing renders where its price would be: no placeholder, no inquire line, no CTA change. A booking with any Unpriced part shows no total. Set from the CMS by unchecking Priced.
_Avoid_: free (that is a ₱0 price), inquire-only

**Detail-first (packages)**:
Every package surface outside the Booking flow — the home featured plates and the /packages index — links to the package's detail page, never directly into the Booking flow; the detail page's "Book this package" CTA is the only carrier of the package param into `/book`. Contrast Studio Services, whose cards deep-link `/book` directly. Owner-ruled detail-first 2026-11-09 (#256 triage), confirming the #164 showcase rulings.
_Avoid_: package deep-link (ambiguous — reserve "deep-link" talk for the services' direct-book pattern)
