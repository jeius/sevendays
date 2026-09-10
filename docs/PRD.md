# Product Requirements — Sevendays

## Problem

Sevendays is a photography studio with 3 branches. The company previously only accepted scheduled appointments for shoots, but some branches now also accept walk-ins. The company needs:

1. A public landing site to showcase packages, services, and credibility, with calling or visiting a branch as the primary conversion action.
2. An internal admin site to manage that content — built to absorb future feature demands from the business, not just cover today's needs.

## Users

- **Customers** — browse packages/services and find their nearest branch (phone or walk-in). No accounts on the public site.
- **Admin/staff** — log in to the admin dashboard to edit site content. No distinction between roles today (see "Future" below).

## V1 Scope (must-have)

### Landing site (`apps/landing`)

- Home/marketing pages: packages, services offered, the 3 branches (with which accept walk-ins), credibility content (portfolio, testimonials).
- Branch pages as the conversion hub: every branch card carries the studio's phone number and a call link.

### Admin site (`apps/admin`)

- Auth-gated (BetterAuth). No public access.
- CMS: create/edit/deactivate service packages (name, description, price, duration, cover image).
- CMS: edit branch info (name, address, phone, walk-in flag).
- Image upload for package cover photos, stored in Cloudflare R2.

### Shared / platform

- All package/branch data validated with Zod (`packages/types`) at every boundary.
- Structured logging (Loglayer + Pino) in the API.
- Error monitoring (Sentry) in all three apps.
- Product analytics (PostHog) scaffolded in `landing`.

## User Stories

- As a **customer**, I can see what packages Sevendays offers and their prices at a glance, so I know what I'm paying for.
- As a **customer**, I can pick a branch and see whether it accepts walk-ins, so I know how to plan my visit.
- As a **customer**, I can call the branch I want to visit straight from its card, so reaching the studio takes one tap.
- As an **admin**, I can edit the packages and branch info shown on the landing site without a code deploy, so content changes don't require a developer.

## Out of Scope for V1 (future)

These are **not** built in v1, but the admin data model and permissions should not actively block adding them later:

- Walk-in queue/tracking per branch.
- Staff/photographer-level scheduling (assigning a specific photographer to a shoot).
- Per-branch admin roles (today: any authenticated admin can see/edit everything).
- Customer accounts.
- SMS notifications.

## Success Criteria

- An admin can update landing site content (packages, branch info) without a deploy.
