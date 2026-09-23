# Admin

The staff site: managing Appointments and editing the content customers see. Core entity vocabulary is in `apps/api/CONTEXT.md`.

## Language

**CMS**:
The content-management area of the admin site: Service Packages, Branch info (including the Walk-in flag and Branch hours), and package cover images. Changes here appear on the landing site without a deploy.
_Avoid_: settings, config

**Deactivate**:
The catalog action of hiding a Service Package from the landing site while leaving existing Appointments untouched. Deliberately not "delete" — the package stays in the data model.
_Avoid_: delete, remove, archive

**Fulfillable**:
An Appointment staff still need to act on — pending or confirmed, not yet completed, cancelled, or no-show. Deactivating a Service Package never changes an Appointment's fulfillability.
_Avoid_: actionable, open

**Dashboard**:
The appointment-management view: the list of Appointments filterable by Branch and Status, where staff change Status.
_Avoid_: home, overview

**Staff User**:
A studio employee who signs in to the admin site with an email and password provisioned by the owner (`create-staff`, `docs/staff-provisioning.md`) — there is no self-serve sign-up. Carries a role (admin) for future gates.
_Avoid_: member, account (for the person), customer

**Session**:
A signed-in Staff User's server-side state — the row BetterAuth writes at sign-in and the API verifies from the forwarded bearer token on gated routes (ADR-0004). Ends at sign-out or expiry (~7 days).
_Avoid_: login (as a noun for the state), JWT, cookie (the API never sees cookies)
