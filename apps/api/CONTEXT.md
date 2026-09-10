# API

The backend context: owns the data model and every read/write to it. The terms below are the project's canonical vocabulary — other contexts reference this file instead of redefining them.

## Language

**Branch**:
One of the studio's three physical photography locations.
_Avoid_: store, location, studio (unqualified)

**Service Package**:
A catalog offering with a name, description, price, duration, and cover image. Its fixed contents are its Inclusions; paid extras attach as Add-on Services.
_Avoid_: plan, product, offering, package (unqualified — collides with npm packages)

**Inclusion**:
A fixed item or privilege bundled with a Service Package at no extra charge — framed pictures, prints, wardrobe/accessory use.
_Avoid_: freebie, bundle, "what's included" (in prose)

**Add-on Service**:
An optional paid extra — hairstyle, makeup — that can be attached to an offering; only the add-ons configured to apply to a Studio Service apply to it (the applicability matrix ships in the schema).
_Avoid_: service (unqualified), extra, option

**Studio Service**:
A standalone studio offering offered at the Branches where it is enabled (photo recovery, tarpaulin & bulletin printing, portraits & ID photo, picture framing). Not a Service Package (which bundles Inclusions) and not an Add-on Service (which attaches to an offering).
_Avoid_: service (unqualified), other service, ancillary service

**Appointment**:
The record type for a customer's reserved time at a Branch for a Service Package or a Studio Service, optionally with Add-on Services. The tables ship as inert schema — documentation of the data model; no runtime path reads or writes them.
_Avoid_: reservation, order

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
The wardrobe context a framed picture or print is shot in — stored atomically (Toga, Filipiniana, Executive, Uniform); combined contexts like Filipiniana/Executive are Inclusions linked to multiple Attire rows in catalog order.
_Avoid_: outfit, costume, wardrobe (that is the usage Inclusion)

**Frame**:
One physical frame bundled with a Service Package, numbered per package (catalog "Frame 1/2/3"; unlabeled frames number in listed order). A frame holds one or more framed pictures; today every catalog frame holds exactly one. Distinct from loose picture Inclusions.
_Avoid_: framed picture (that is the Inclusion inside a Frame), frame size (that is the Print size of the framed picture)

**API client**:
The shared package (`@sevendays/api-client`) through which both apps call this API — the only supported path; frontends never hand-roll calls to it.
_Avoid_: SDK, fetcher, wrapper

**Deactivated (Service Package)**:
Hidden from the landing site by catalog action, never destructive — historical records referencing it stay untouched.
_Avoid_: deleted, archived, cancelled (for packages)

**Deactivated (Studio Service)**:
The same catalog action for a Studio Service. Independent of Branch applicability — a service can be active yet offered at only some Branches.
_Avoid_: deleted, archived, cancelled (for catalog offerings)
