# Product — Landing (public site)

<!-- impeccable:product-schema 1 -->

Extends the [studio-wide record](../../PRODUCT.md) — studio purpose, positioning, brand commitments, and evidence rules live there. The shared data vocabulary lives in `apps/api/CONTEXT.md`; landing-domain language (Guest booking, Booking flow, Studio Service, …) in this app's `CONTEXT.md`.

## Platform

web

## Users

**Primary: graduating students** — arrive around graduation season to book portrait/package shoots; judge the studio by visible craft and price clarity before committing. **Secondary: families & individuals** (portraits, ID photos, printing, photo recovery, framing — the walk-in regulars) **and celebration/event clients** (weddings, events). Everyone is anonymous: booking is Guest booking, no account, no sign-in anywhere in the flow.

## Product Purpose

Showcase what Sevendays offers — Service Packages, Studio Services, the 3 branches (with walk-in flags), credibility (portfolio/gallery, testimonials) — with appointment booking as the primary conversion action. In the booking-free v1 edition, conversion is calling or visiting a branch instead; the same pages must convert both ways.

## Operating Context

- **Booking flow:** Branch → the booked offering (a Service Package, or a Studio Service bookable at that Branch) → optional Add-on Services → date/time Slot → contact info → Confirmation (on-site state + email via Resend).
- **Two variants of every surface:** booking-present (main — "Book now" hero, "Book this package" detail CTA) and booking-free (v1 handover — "Call Us"/"Services" hero, CTA-less catalog cards, `tel:` CTAs on branches). Copy never presupposes online booking.
- **Surfaces:** home (hero + featured/services/branches strips), packages index + detail, Services page, Branches page, About (tabbed gallery + testimonials), the booking wizard + confirmation, and route-level not-found.
- **Content is CMS-driven:** catalog, covers, gallery, and testimonials come from the API; the landing owns no content of its own except chrome copy.

## Capabilities and Constraints

- Packages carry name, description, price, duration, inclusions, frames, and a cover image; deactivated packages are invisible everywhere (listings and direct URL).
- Prices render in pesos; an unpriced catalog row is a ruled-upcoming state (maturation milestone, map #158: renders nothing where the price would render, stays bookable) — not yet shipped.
- No customer accounts, no customer-driven rescheduling, no SMS (PRD out-of-scope for v1; email confirmations only).
- Booking funnel analytics (PostHog) is the key planned metric (M6 hardening).

## Product Principles

1. One primary action per surface per variant — the next step is never ambiguous.
2. Real work leads: imagery and proof over claims, honoring the studio-wide evidence rules.
3. The catalog reads as a showcase, not a checkout — browsing is welcome even where booking is absent.

## Accessibility & Inclusion

WCAG AA on every surface, including muted text on the tinted body wash and focus-visible states on dark band CTAs (M3 measured pairs).
