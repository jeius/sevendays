# API

The backend context: owns the data model and every read/write to it. The terms below are the project's canonical vocabulary — other contexts reference this file instead of redefining them.

## Language

**Branch**:
One of the studio's three physical photography locations.
_Avoid_: store, location, studio (unqualified)

**Service Package**:
A bookable offering with a name, description, price, duration, and cover image.
_Avoid_: plan, product, offering, package (unqualified — collides with npm packages)

**Appointment**:
A customer's reserved time at a Branch for a Service Package; the record a booking creates.
_Avoid_: reservation, order, booking (as a noun for the record)

**Status**:
The lifecycle state of an Appointment — the closed set pending, confirmed, completed, cancelled, no-show, defined in `packages/types`.
_Avoid_: ad-hoc state strings ("done", "closed")

**Walk-in flag**:
Per-Branch boolean marking whether that Branch accepts customers without an Appointment.
_Avoid_: walkinEnabled, acceptsWalkins (in prose)

**API client**:
The shared package (`@sevendays/api-client`) through which both apps call this API — the only supported path; frontends never hand-roll calls to it.
_Avoid_: SDK, fetcher, wrapper

## Availability (ADR-0005)

**Slot**:
One fixed hour of a Branch's schedule. Every Appointment occupies exactly one Slot, regardless of the Service Package's duration.
_Avoid_: timeslot, time window

**Branch hours**:
A Branch's weekly opening hours, defining which Slots exist on a given day.
_Avoid_: business hours, schedule

**Slot capacity**:
The maximum number of Appointments a Branch accepts in one Slot.
_Avoid_: quota, limit

**Availability**:
The Slots of a Branch on a date, within Branch hours, that still have remaining Slot capacity.
_Avoid_: free slots, open times

**Deactivated (Service Package)**:
Hidden from the landing site and new bookings, while existing Appointments on it remain valid and fulfillable. A catalog action, never a destructive one.
_Avoid_: deleted, archived, cancelled (for packages)
