# Admin

The staff site: editing the content customers see. Core entity vocabulary is in `apps/api/CONTEXT.md`.

## Language

**CMS**:
The content-management area of the admin site: Service Packages, Branch info (including the Walk-in flag), and package cover images. Changes here appear on the landing site without a deploy.
_Avoid_: settings, config

**Deactivate**:
The catalog action of hiding a Service Package from the landing site. Deliberately not "delete" — the package stays in the data model.
_Avoid_: delete, remove, archive

**Staff User**:
A studio employee who signs in to the admin site with an email and password provisioned by the owner (`create-staff`, `docs/staff-provisioning.md`) — there is no self-serve sign-up. Carries a role (ADR-0018): the owner holds `admin` — the only role BetterAuth's user-management endpoints answer to — staff hold `staff`.
_Avoid_: member, account (for the person), customer

**Session**:
A signed-in Staff User's server-side state — the row BetterAuth writes at sign-in and the API verifies from the forwarded bearer token on gated routes (ADR-0004). Ends at sign-out or expiry (~7 days).
_Avoid_: login (as a noun for the state), JWT, cookie (the API never sees cookies)

**Warm Navigation**:
Moving to an admin screen whose data the client already holds: the screen renders that data immediately, with a background refresh following. The latency contract's target case — warm navigation must feel instant. The bound: what's shown is at most the staleness bound (5 minutes) behind, and a staff member's own saves always invalidate immediately.
_Avoid_: cached visit, prefetch (a mechanism that warms, not the state)

**Cold Navigation**:
Moving to an admin screen with nothing held — the first visit in a session. The one case where skeletons and loading indicators are acceptable; the latency work shrinks this wait but never promises to eliminate it.
_Avoid_: slow path (unwarmed, not necessarily slow)
