# API

The backend context: owns the data model and every read/write to it. The terms below are the project's canonical vocabulary — other contexts reference this file instead of redefining them.

## Language

**Branch**:
One of the studio's three physical photography locations.
_Avoid_: store, location, studio (unqualified)

**Service Package**:
A bookable offering with a name, description, price, duration, and cover image. Its fixed contents are its Inclusions; paid extras are attached at booking as Add-on Services.
_Avoid_: plan, product, offering, package (unqualified — collides with npm packages)

**Inclusion**:
A fixed item or privilege bundled with a Service Package at no extra charge — framed pictures, prints, wardrobe/accessory use.
_Avoid_: freebie, bundle, "what's included" (in prose)

**Add-on Service**:
An optional paid extra — hairstyle, makeup — attached to an Appointment at booking time. Always an addition to a Service Package, never bookable instead of one.
_Avoid_: service (unqualified), extra, option

**Appointment**:
A customer's reserved time at a Branch for a Service Package, optionally with Add-on Services; the record a booking creates.
_Avoid_: reservation, order, booking (as a noun for the record)

**Status**:
The lifecycle state of an Appointment — the closed set pending, confirmed, completed, cancelled, no-show, defined in `packages/types`.
_Avoid_: ad-hoc state strings ("done", "closed")

**Kind**:
The kind of an Appointment — scheduled, walk-in, or visitation — describing how the session happens. Independent of Status: a walk-in Appointment is still pending, confirmed, and so on.
_Avoid_: type, mode, channel

**Walk-in flag**:
Per-Branch boolean marking whether that Branch accepts customers without an Appointment.
_Avoid_: walkinEnabled, acceptsWalkins (in prose)

**Print size**:
A standard print dimension the studio offers (e.g. 1x1, 2x2, 2R, 8R), managed as a lookup with a description; print Inclusions reference it.
_Avoid_: size (unqualified), format

**Print finish**:
The finishing applied to printed Inclusions — currently laminated or raw. Not stored per line: framed pictures are laminated, loose prints are raw.
_Avoid_: lamination, coating

**Attire**:
The wardrobe context a framed picture or print is shot in — Toga, Filipiniana, Executive, Uniform — including combined contexts (e.g. Filipiniana/Executive), each stored as one lookup row.
_Avoid_: outfit, costume, wardrobe (that is the usage Inclusion)

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
