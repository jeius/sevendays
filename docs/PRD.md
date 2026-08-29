# Product Requirements — Sevendays

## Problem

Sevendays is a photography studio with 3 branches. The company previously only accepted scheduled appointments for shoots, but some branches now also accept walk-ins. The company needs:

1. A public landing site to showcase packages, services, and credibility, with appointment booking as the primary conversion action.
2. An internal admin site to manage that content and view/manage scheduled appointments — built to absorb future feature demands from the business, not just cover today's needs.

## Users

- **Customers** — browse packages/services, pick a branch, book an appointment. No account required for v1 (booking is a guest flow).
- **Admin/staff** — log in to the admin dashboard to manage appointments and edit site content. No distinction between roles in v1 (see "Future" below).

## V1 Scope (must-have)

### Landing site (`apps/landing`)

- Home/marketing pages: packages, services offered, the 3 branches (with which accept walk-ins), credibility content (portfolio, testimonials).
- Appointment booking flow: select branch → select service package → select date/time → enter contact info → confirm.
- Booking confirmation email sent via Resend on successful booking.

### Admin site (`apps/admin`)

- Auth-gated (BetterAuth). No public access.
- Dashboard: list of scheduled appointments, filterable by branch and status (pending/confirmed/completed/cancelled/no-show).
- Ability to update an appointment's status.
- CMS: create/edit/deactivate service packages (name, description, price, duration, cover image).
- CMS: edit branch info (name, address, phone, walk-in flag).
- Image upload for package cover photos, stored in Cloudflare R2.

### Shared / platform

- All appointment/package/branch data validated with Zod (`packages/types`) at every boundary.
- Structured logging (Loglayer + Pino) in the API.
- Error monitoring (Sentry) in all three apps.
- Product analytics (PostHog) at least in `landing` (booking funnel is the key metric).

## User Stories

- As a **customer**, I can see what packages Sevendays offers and their prices before booking, so I know what I'm paying for.
- As a **customer**, I can pick a branch and see whether it accepts walk-ins, so I know if I need to book ahead.
- As a **customer**, I can book an appointment in one flow without creating an account, so booking is low-friction.
- As a **customer**, I receive an email confirming my appointment, so I have a record of it.
- As an **admin**, I can log in and see all upcoming appointments across branches, so I can plan staffing.
- As an **admin**, I can mark an appointment as confirmed/completed/cancelled/no-show, so the dashboard reflects reality.
- As an **admin**, I can edit the packages and branch info shown on the landing site without a code deploy, so content changes don't require a developer.

## Out of Scope for V1 (future)

These are **not** built in v1, but the admin data model and permissions should not actively block adding them later:

- Walk-in queue/tracking per branch (distinct from scheduled appointments).
- Staff/photographer-level scheduling (assigning a specific photographer to a booking).
- Per-branch admin roles (today: any authenticated admin can see/edit everything).
- Customer accounts / booking history / rescheduling by the customer themselves.
- SMS notifications (only email via Resend in v1).

## Success Criteria

- A customer can complete a booking end-to-end (browse → pick branch/package/time → confirm → receive email) without admin intervention.
- An admin can see and act on a new booking without needing developer help.
- Admin can update landing site content (packages, branch info) without a deploy.
