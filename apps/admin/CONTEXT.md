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

**Delete**:
The CMS action that permanently removes an entity and what it owns (a package's Frames and Inclusions, its cover image; a photo and its image) — offered only when nothing references the row; otherwise it reports what blocks and Deactivate is the path. The confirm dialog names the row and states that its images go with it. History-bearing rows retire by Deactivation, never Delete.
_Avoid_: hard delete, remove, purge

**Unpriced**:
The CMS state of a catalog row whose "has price" checkbox is unchecked: the price input is hidden and the row saves without a price. Unpriced rows stay bookable and render no price line on the landing site. Checking the box again requires entering a price before saving.
_Avoid_: free, inquire-only

**Dashboard**:
The appointment-management view: the list of Appointments filterable by Branch and Status, where staff change Status.
_Avoid_: home, overview

**Staff User**:
A studio employee who signs in to the admin site with an email and password — there is no self-serve sign-up; the owner provisions users (Users Page; the CLI runbook is the bootstrap/break-glass path). Carries a role (ADR-0018): the owner holds `admin` — the only role BetterAuth's user-management endpoints answer to — staff hold `staff`.
_Avoid_: member, account (for the person), customer

**Password Reset**:
Replacing a Staff User's password, by either channel: the owner sets a new one on the Users Page, or the staff member follows the reset link's emailed token from the sign-in page. Every reset ends all of that user's Sessions. The owner-role user's own lockout recovers through the break-glass CLI, not email.
_Avoid_: forgot-password (the screen's feature name, not the act), credential recovery

**Users Page**:
The owner-only tab of Settings where the studio owner manages Staff Users: list, create (hand-over temporary password plus the role choice), reset password, deactivate (BetterAuth's ban — which ends Sessions), revoke Sessions, and Delete. Your own row is view-only, and the last owner can't be deleted or deactivated — user management never locks itself out.
_Avoid_: accounts screen, admin panel

**Site Settings**:
The Settings tab holding the site-wide content the studio owns once: the Brand (logo mark, name, tagline) that both the admin and the landing render; the page titles and descriptions (Packages, Branches, Services, About), the Home hero, and the About story the landing serves; and the site-wide extras (announcement banner, footer social and contact links). Unset fields fall back to the built-in defaults — the chrome never renders broken.
_Avoid_: theme, configuration (when meaning content), preferences

**Session**:
A signed-in Staff User's server-side state — the row BetterAuth writes at sign-in and the API verifies from the forwarded bearer token on gated routes (ADR-0004). Ends at sign-out or expiry (~7 days).
_Avoid_: login (as a noun for the state), JWT, cookie (the API never sees cookies)
