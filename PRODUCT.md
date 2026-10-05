# Product — Sevendays (studio-wide record)

<!-- impeccable:product-schema 1 -->

This is the shared studio record. Surface-specific truth lives in the app records, which extend it rather than restate it:

- [Landing](./apps/landing/PRODUCT.md) — the public site where customers browse and book
- [Admin](./apps/admin/PRODUCT.md) — the staff site for managing appointments and site content

The data-model vocabulary behind both (Appointment, Branch, Service Package, Slot, …) is owned by `apps/api/CONTEXT.md`.

## Platform

web

## Product Purpose

Sevendays is a photography studio with 3 branches. One product domain surfaces through two deployable web apps: the landing site (marketing content + appointment booking as the primary conversion action) and the admin site (auth-gated appointment management + the CMS that feeds the landing). Success: a customer completes a booking — or reaches a branch by phone or visit — without friction or admin intervention; staff change what the public sees without a code deploy.

## Users

- **Customers (landing, anonymous)** — primary: graduating students booking graduation-season shoots; secondary: families & individuals (portraits, ID photos, printing, recovery, framing) and celebration/event clients (weddings, events). No account in any delivered edition (guest booking).
- **Staff (admin)** — the studio owner (the one `admin`-role user) and studio employees (`staff` role), provisioned by the owner; no self-serve sign-up.

## Positioning

Owner-ruled twin claim (2026-09-30), both halves load-bearing: **neighborhood trust** — a long-established local studio people already know, 3 branches, walk-ins welcome — and **craft quality** — the photography itself is the proof, not a claim. Neither half alone is the position.

## Operating Context

- **Delivery is versioned** (ADR-0015): `main` ships the booking-present product; the free-handover `v1` artifact is booking-free (call/visit converts instead). Every shared landing surface exists in both variants from one codebase; every merge to main is pick/skip/split-triaged for v1.
- **Pricing is in Philippine pesos** (₱, `peso()`-formatted). Market is the Philippines — *inferred from peso pricing, tarpaulin & bulletin printing as studio services, and graduation-first demand, and evidenced by the branch roster*: Calamba (Misamis Occidental), Iligan (Lanao del Norte), and Dipolog (Zamboanga del Norte) — a Mindanao-side footprint.
- Booking is by scheduled appointment; some branches additionally take walk-ins (the two modes are distinct and never conflated).

## Brand Commitments

- **Identity is the owner's logo palette — rebranding is ruled out.** Fixed brand points: petrol `#06708e` (primary) and ink `#0e131a` only. The four other logo hexes (deep petrol `#084257`, light neutral `#dedede`, mid gray `#7e7f7f`, cool gray `#afb8ba`) are reference tones, never load-bearing. (M3 spec is the canonical record.)
- **Strictly cool palette** — no warm accent anywhere; destructive red remains the only warm semantic.
- **Typefaces: Figtree (sans — headings and body), Roboto Slab (serif — editorial/display reserve), Geist Mono**, all self-hosted; no render-blocking font CDN.
- The logo asset: `apps/landing/public/photos/logo.png`.

## Evidence on Hand

- **Photo set** (`apps/landing/public/photos/`: hero, gallery 01–06, package covers, service images): **mixed real work and stand-ins, per-photo provenance unconfirmed** (owner, 2026-09-30). Do not present any of these as the studio's own work until its provenance is confirmed per asset.
- **No confirmed-real testimonials yet** — the home slot renders stand-in copy and the CMS testimonials table was born empty. Future work must not fabricate testimonials or studio claims.
- **Live CMS catalog**: packages, branches, inclusions seeded and verifiable against the live database; the R2 media bucket is provisioned.

## Product Principles

1. **Low friction converts.** Guest booking with no account; a phone number or branch address is always one interaction away when online booking isn't present.
2. **The CMS is the landing's source of truth.** Content changes never require a developer or a deploy.
3. **Trust is earned with real proof only.** Never fabricate work, testimonials, or claims; placeholder evidence stays identifiable as placeholder.
4. **One studio, two editions.** Every public surface serves both the booking-present and booking-free variants without forking the product truth.
5. **The photography leads.** The product frames the studio's work; the interface recedes behind it.

## Accessibility & Inclusion

WCAG AA governs all shipped surfaces (M3 ruling; measured pair table lives in the M3 spec).
