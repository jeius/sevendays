# Product — Admin (staff site)

<!-- impeccable:product-schema 1 -->

Extends the [studio-wide record](../../PRODUCT.md) — studio purpose, positioning, brand commitments, and evidence rules live there. The shared data vocabulary lives in `apps/api/CONTEXT.md`; admin-domain language (CMS, Deactivate, Fulfillable, Staff User, …) in this app's `CONTEXT.md`.

## Platform

web

## Users

**Staff Users only** — the studio owner (the one `admin`-role user BetterAuth's user-management endpoints answer to, ADR-0018) and studio employees (`staff` role). Sign-in is email + password; there is no self-serve sign-up, no public access, and no customer ever authenticates. The owner provisions and manages users; role distinctions beyond owner/staff are PRD-deferred.

## Product Purpose

The internal tool for running the studio's public presence and its appointments: manage scheduled Appointments (the Dashboard, delivered with the paid v2 edition) and edit everything the landing site renders — without a developer or a deploy. Built to absorb future feature demands from the business, not just cover today's needs.

## Operating Context

- **Daily-driver tool:** staff work in it all day, so tool-neutral comfort outranks marketing atmosphere (M3 ruling: flat surfaces, brand reduced to wordmark + primary).
- **Shell:** labeled collapsible sidebar — Overview (Dashboard, Appointments) · Catalog (Packages, Add-ons, Studio services) · Studio (Branches, Settings) — with a sticky top bar.
- **Trust model:** sessions are server-side (BetterAuth, ~7 days); the API verifies the forwarded bearer token on gated routes (ADR-0004). Owner lockout recovers through a break-glass CLI, never email.
- **Content changes appear on the landing without a deploy** — the CMS is the landing's source of truth, including cover images uploaded to R2.

## Capabilities and Constraints

- **Shipped (M5):** full-object create/edit over the nine catalog entities behind one session gate; deactivation hides a row from the landing while leaving history untouched; slugs generated at create, editable after; toasts on every action outcome.
- **Ruled-upcoming (maturation milestone, map #158 — decided, not yet shipped):** guarded Delete (nothing referenced may be deleted; images cascade), Unpriced rows (has-price checkbox), the owner-only Users tab in Settings with staff-side password reset, pending states/skeletons, the All/Active/Deactivated segment on list toolbars.
- No chart or KPI vocabulary exists yet — the data-viz surface belongs to v2's appointments dashboard effort.
- History-bearing rows retire by Deactivation, never Delete (standing rule).

## Product Principles

1. Nothing here can silently break the public site — deactivation before deletion, guards before writes.
2. Staff actions always answer: every async action shows its pending state and its outcome (toast or in-dialog error).
3. User management never locks itself out — the owner's own row is protected and the last owner can't be removed.
