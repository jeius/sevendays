# Milestone 2 — Public Booking Flow (spec)

Consolidates the M2 booking-flow wayfinder map (GitHub issue #31) and its four resolved tickets: Landing site information architecture (#32), Booking form + confirmation prototype (#33), Confirmation email content (#34), Resend on Cloudflare Workers — send mechanics (#36). Decisions were settled 2026-09-05 → 2026-09-06 (charting grilling, IA grilling, prototype reaction rounds, owner email-content rounds); this document is the write-up, produced so the to-spec pass is pure synthesis. Published as GitHub issue #37; `docs/plan.md`'s M2 booking-flow checkboxes were red-penciled to match (wayfinder Q2) on 2026-09-07.

## Problem Statement

The landing site is wired to the API end to end (M2 pre-flight: shared client, React Query SSR, loud env failures) but shows almost no real content and offers no way to book — the PRD's primary conversion action. The roadmap's original M2 shape ("packages, services, branches") also carried an unresolved ambiguity: the PRD's "services offered" is not the catalog's Add-on Services but a separate set of standalone studio offerings, and the appointment data model can only represent package bookings. The wayfinder map settled what "services" means, what the eight landing routes are, how the booking form behaves (validated by a clickable prototype), what the confirmation email says, and how email sending works on Workers; this spec carries all of it into one implementation-ready brief.

## Solution

Eight landing routes over the live API: home (featured packages, services teaser, branches strip), packages list, package detail by slug, services showcase, branches, about, the booking form, and the confirmation read-back page. Booking is a guest flow — one question per screen (prototype variant C): branch → offering (a Service Package, or a Studio Service bookable at that branch) → conditional add-ons → date/time → contact → confirmation. A new Studio Service entity (per-branch bookability junction, add-on applicability matrix) joins the catalog; the appointment model generalizes to either offering (exactly-one CHECK, snapshot column renamed `bookedPriceCents`). The API gains three read endpoints (studio services, package by slug, appointment single-get), a typed `past_datetime` floor in the intake module, and a money-free confirmation email sent via Resend after the DB commit (`ctx.waitUntil`, idempotency key). The milestone verifies with a real booking end-to-end and a received email at the Resend account owner's address.

## User Stories

1. As a customer, I want featured packages on the home page, so I can quickly see the studio's entry-tier options with prices.
2. As a customer, I want a packages page listing every active package with full details (description, price, inclusions), so I know exactly what I'm paying for.
3. As a customer, I want a stable shareable URL per package (keyed on slug, not id), so links survive catalog renames.
4. As a customer, I want a services page showcasing the Studio Services (photo recovery, tarpaulin & bulletin printing, portraits & ID photo, picture framing) with prices and where each is bookable, so I can see what the studio offers beyond packages.
5. As a customer, I want a branches page showing each branch's address, phone, and whether it accepts walk-ins, so I know if I need to book ahead.
6. As a customer, I want an about page with the studio story and testimonial placeholders, so I can trust the studio before booking.
7. As a customer, I want to start booking from any page (hero CTA, branch/package/service deep links), so I never have to find the form twice.
8. As a customer, I want to choose a branch first and see what's bookable there, so I only see offerings that branch actually offers.
9. As a customer, I want to book either a Service Package or a Studio Service in the same flow, so I don't need two different booking paths.
10. As a customer arriving via a service deep link, I want the branch step filtered to branches where that service is bookable, so I can't pick a branch that doesn't offer it.
11. As a customer, I want the add-ons step to show only add-ons that apply to my chosen offering, so I'm never offered something that can't attach.
12. As a customer, I want the add-ons step skipped entirely when nothing applies to my offering, so the flow stays short.
13. As a customer, I want a "Skip — no add-ons" affordance on the add-ons step, so I can decline without hunting for a way forward.
14. As a customer, I want single-select steps to advance on my choice itself, so I don't click Continue after every answer.
15. As a customer, I want a date input plus hour chips with a persistent "all times are Philippine time (PHT)" note, so I schedule in my own clock.
16. As a customer, I want an inline "already passed" hint the moment I pick a past slot, so I can correct it before submitting.
17. As a customer, I want a clear, polite rejection card when the API rejects my booking (typed reasons mapped to friendly copy), so I know what to fix instead of seeing a raw error.
18. As a customer, I want to enter my name, email, phone, and an optional note, so the studio can reach me and honor special requests.
19. As a customer, I want a sticky summary of my booking with a running total while I choose, so I always know what I'm about to pay.
20. As a customer, I want a confirmation page after booking showing my appointment as recorded (branch, offering, add-ons with prices, schedule, total), so I have proof of the booking.
21. As a customer, I want a confirmation email with my schedule, branch, add-ons, and a link back to my booking page, so I have a record in my inbox.
22. As a customer, I want to book without creating an account, so booking is low-friction.
23. As a customer, I want the price I was quoted recorded at booking time, so a later catalog price change doesn't change what I was told.
24. As a studio owner, I want Studio Services modeled as their own bookable entity with per-branch bookability, so "services" finally means what my business offers.
25. As a studio owner, I want the add-on applicability matrix enforced API-side (only configured add-ons attach to a service booking), so the rule doesn't depend on the UI behaving.
26. As a studio owner, I want no booking-fee concept anywhere in the system, so customers are never quoted a fee that doesn't exist.
27. As a studio owner, I want the email to say my booking is "scheduled" — never "confirmed" — while its status is still pending, so the copy never overstates.
28. As a studio owner, I want a booking to persist even when its email fails, so the booking record is always the source of truth.
29. As a studio owner, I want an idempotency key on the confirmation email, so a retried request can't double-send to a customer.
30. As a studio owner, I want featured packages and per-branch service bookability controlled by seed data, so content is right before the CMS exists.
31. As a developer, I want the database to enforce exactly-one booked offering (CHECK), so no row can book both or neither.
32. As a developer, I want the past-date/time floor implemented in the intake module as a typed rejection (schema stays shape-only), so the API validates instants, not shapes, and the client can map reasons to copy.
33. As a developer, I want route handlers to stay thin with rejection wording module-owned, so the form's error mapping has a stable contract.
34. As a developer, I want a public single-get appointment endpoint with the same posture as the existing public list until M4, so the confirmation page reads back without auth machinery.
35. As a developer, I want the new client wrappers (studio services, package by slug, appointment single-get) type-inferred through the shared Hono RPC client, so no hand-typed API description appears.
36. As a developer, I want the email built as a pure template-literal HTML string (the Resend `react` param is Node-only), so it runs on Workers and is unit-testable.
37. As a developer, I want the send wrapped in `ctx.waitUntil` after the DB commit, so the response isn't blocked on email delivery and the booking can't fail because email did.
38. As a developer, I want a real end-to-end verification (live booking + received email at the account owner's address), so the milestone's exit criterion is proven, not assumed.

## Implementation Decisions

### Information architecture (ticket #32)

Eight routes on `apps/landing`:

| Route | Shows |
|---|---|
| `/` | Home: hero + Book-now CTA, featured packages (`is_featured`, price ascending; fallback first-4-by-price if none flagged), Studio Services teaser strip, branches strip (address + walk-in badge), static credibility blurb |
| `/packages` | All active packages as full-detail cards (no separate detail navigation needed from listings) |
| `/packages/:slug` | Package detail: description, price, inclusions (frames, print sizes, attires), placeholder cover panel (initials block until R2 cover photos, M5) |
| `/branches` | All 3 branches: address, phone, walk-in badge, "Book at this branch" deep link |
| `/services` | Studio Services showcase: the four offerings with description + price + per-branch bookability; one-line cross-reference to Add-on Services |
| `/about` | Static studio story + testimonial placeholders + empty portfolio grid as an M5 drop-in slot |
| `/book` | Booking form — single route, client-side steps (below). Deep-link params `?branch=&package=&service=` (ids, all optional) |
| `/booking/:id` | Confirmation read-back via the public single-get: full summary from the server snapshot, "confirmation email sent" line, "need to change? call the branch" note |

Glossary terms (Studio Service, generalized Add-on Service / Appointment, Services page, Deactivated (Studio Service)) are already drafted in both contexts' CONTEXT.md on the `docs/booking-flow-glossary` branch — that branch merges (or its content lands) before or with the build.

### Schema changes (Drizzle migration via `db:generate`; never hand-edited)

- **`service_packages`**: add `slug` (unique, not null — generated from names, backfilled in the migration/seed; listed in API responses so detail URLs are stable under renames) and `is_featured` (boolean, default false).
- **`studio_services`** (new): id, name, description, `price_cents`, `is_active` (default true), timestamps.
- **`branch_studio_services`** (new junction): presence-row = the service is bookable at that branch (no boolean column). Unique pair.
- **`studio_service_addon_services`** (new junction): presence-row = the add-on applies to that Studio Service booking. Unique pair.
- **`appointments` generalized**: `service_package_id` becomes nullable; add nullable `studio_service_id`; a table CHECK enforces exactly-one of the two set. Snapshot column `package_price_cents` renames to **`booked_price_cents`** (`bookedPriceCents` in Drizzle/types) — the table is young with zero production rows, so the rename is free now and never again.
- Seed extensions (natural-key upsert, re-runnable, existing `db:seed` style): the four Studio Services (placeholder prices marked `TODO(seed)` like branch phones, active, bookable at all 3 branches — the prototype's "not Calamba" stub was demo-only), applicability rows (Makeup + Hairstyle apply to Portraits & ID photo only; the other three services get none), slug backfill for the 11 packages, `is_featured` on Basic, A, B, C. `db:verify-seed` extends to assert the new rows.
- Zod schemas in `packages/types` mirror everything (extend, don't redefine): generalized create/read appointment shapes (nullable offering refs, exactly-one refine, `bookedPriceCents`), `StudioService` read shape with embedded `bookableBranchIds`, slug/`isFeatured` on package schemas.

### API surface (`/api/v1`, thin routes over service modules)

- **`GET /api/v1/studio-services`** — active services with embedded `bookableBranchIds`.
- **`GET /api/v1/service-packages/:slug`** — one active package with inclusions, keyed on slug; 404 (uniform JSON error) when unknown.
- **`GET /api/v1/appointments/:id`** — single appointment with stitched add-on entries (same `AppointmentWithAddons` read shape as the list). Public, deliberately: the list is already public until M4 (standing decision), and this endpoint serves the customer's own confirmation read-back; M4's BetterAuth closes both together.
- **`POST /api/v1/appointments` generalized** — accepts exactly one of `servicePackageId` / `studioServiceId` (400 otherwise, schema-level refine). For a service booking: the service must be active (400 when not) and bookable at the chosen branch (400 `That service isn't offered at the branch you picked.`-class message). Add-ons: package bookings accept all active add-ons (uniform rule, no matrix); service bookings accept only junction-linked add-ons (400 when not applicable). The existing intake transaction (reference resolution + appointment insert + add-on junction rows, all-or-nothing) stays the one write seam; the new checks join it.
- **Past-date/time floor** — a `scheduledAt` at or before the current instant (Asia/Manila framing; PH is fixed UTC+8, so it's an instant comparison) rejects with the typed reason `past_datetime` and customer-presentable module-owned wording. Lives in the intake module; `createAppointmentSchema` stays shape-only.
- **Typed rejections** — the intake failure reasons gain the new cases and each carries its customer-presentable message (module-owned, route forwards verbatim — existing convention). The client maps API reasons/messages to friendly copy per the prototype contract:

```ts
// From the prototype (wayfinder #33) — the rejection contract the form renders.
export type RejectionReason =
  | 'past_datetime'
  | 'package_inactive'
  | 'service_not_bookable_at_branch'
  | 'addon_inactive'
  | 'addon_not_applicable'
  | 'unknown';
```

- Error shape unchanged (`apiErrorSchema`); `Env` gains no new Zod fields except the email vars below.

### Booking form (prototype variant C rulings, ticket #33)

One question per screen: progress bar, big question headings, choice cards, sticky "Your booking" summary rail (branch / offering / add-ons / schedule / running total). Single-select steps auto-advance on choice. Offering step: Service Packages grid first, Studio Services (bookable at the chosen branch) below. Deep-linked `?service=` filters the branch step to bookable branches before anything is chosen. Add-ons screen shows only when the chosen offering has applicable add-ons (packages: uniform; services: matrix-gated); "no applicable add-ons" lands directly on date/time and Back from date/time returns to the offering step; the step carries a Continue button once something is selected and "Skip — no add-ons" when nothing is. Date/time: date input + hour-chip grid (placeholder grid — real slots are M3 per ADR-0005), PHT note on every date screen, inline "already passed" hint on a past pick, typed rejection card on submit. Contact: full name / email / phone + optional notes textarea, summary line above the confirm button, submitting state on the button. The pre-submit total (button + rail) is intake UX and keeps live prices — the money-free email rule does not touch it.

### Confirmation read-back (`/booking/:id`)

Snapshot read-back card from the single-get: confirmation #, branch, offering, add-ons with snapshot prices, PHT schedule, **Total row (kept)**, "confirmation email sent to …", "need to change? call the branch". Reuses the prototype's formatting helpers (`peso`, `phDateTime` — `en-PH` / `Asia/Manila`, medium date + short time) as the landing's shared helpers. New `appointments.get(id)` client method + landing server function (Sentry span per `.cursorrules`).

### Confirmation email (content per ticket #34, mechanics per ticket #36)

- **Money-free**: no Total, no sum, no offering price, no add-on prices (name-only rows), and no booking fee anywhere — service bookings included. The form and the `/booking/:id` read-back keep their money rows; the lighter artifact is email-only.
- **From**: `Sevendays Photography <onboarding@resend.dev>` (sandbox). One `EMAIL_FROM` constant in the email module; the `bookings@` local part is reserved for the M6 domain swap. No env override in M2.
- **Subject**: `Booking scheduled: {offeringName} — {phDateTime(scheduledAt)} (PHT)` — "scheduled", never "confirmed" (status is pending at booking). Sentence case, no emoji.
- **Body** (en-PH, warm-professional; transactional — no `List-Unsubscribe`):

  > Hi {customerName},
  >
  > Your {offeringName} at {branchName} is scheduled for {phDateTime(scheduledAt)} (PHT) — please keep an eye on this email for any changes.
  >
  > {summary table}
  >
  > Need to change something? Call {branchName} at {branchPhone}.
  >
  > View your booking: {landingOrigin}/booking/{appointmentId}

- **Summary table**: plain inline-styled label/value rows (no hero, no logo, no banner). Branch (always) · Booking = offering name, no price (always) · Add-on = name only, one row per add-on, section omitted when none · Schedule (always) · Notes (only when non-null). Footer: {customerName} · {customerEmail} · {customerPhone}.
- **CTA**: single plain styled-text link "View your booking" → `{LANDING_ORIGIN}/booking/{appointmentId}`. The origin is a new `LANDING_ORIGIN` var on `apps/api` (Worker var in prod, `.dev.vars` locally, added to `.dev.vars.example`; no fallback — same loud-failure posture as `API_URL`). It lives in the API (server-side), not under a Vite-prefixed name.
- **Mechanics**: the official `resend` SDK runs on Workers (raw `fetch` to `https://api.resend.com/emails` is equivalent); `react` param is Node-only → a plain template-literal HTML string built by a pure module function. One send **after the DB commit**, wrapped in `c.executionCtx.waitUntil(...)` (30s post-response budget, ~1 subrequest), with `Idempotency-Key: booking-confirm/<appointmentId>` (≤256 chars, 24h retention) so a retry can't double-send. Email failure = booking stands, logged only, no retry in M2. The branch name + phone the copy needs resolve at send time (read keyed by the stored `branchId`); every displayed value comes from the appointment snapshot + joins — a catalog edit after booking never rewrites the email's facts.
- **Sandbox reality**: `onboarding@resend.dev` delivers ONLY to the Resend account's own address (403 for everyone else). The account owner's address — pinned by the owner at spec time — is **julius.porferio.pahama@gmail.com**; the end-to-end verify books with this recipient. Free-tier limits (10 req/s, 100 emails/day) are far above M2's volume. `RESEND_API_KEY` is a Worker secret (`wrangler secret put`), never committed; the API's env schema gains `RESEND_API_KEY` + `LANDING_ORIGIN`.

### Shared client (`packages/api-client`)

New wrapper methods over the raw Hono RPC client, through the one `unwrap()` gate: `studioServices.list()`, `servicePackages.bySlug(slug)`, `appointments.get(id)`. Existing `branches.list()`, `servicePackages.list()`, `addonServices.list()`, `appointments.create()` carry over. The prototype's landing server functions (`getServicePackages` / `getAddonServices` / `createAppointment`, shared-schema-validated at the seam) and query-key factories fold into the real build deliberately (prototype ruling) — extended with `getStudioServices`, `getServicePackageBySlug`, `getAppointment`, and the new query options. The prototype's state machine is re-derived against the real schema (its Studio Service stubs and simulated floor die on the throwaway branch; `prototype/booking-form-33` merges nothing).

## Testing Decisions

Good tests here assert external behavior only — wire payloads, status codes, and user-visible copy — never module internals. Seams (owner-confirmed):

1. **`packages/types` unit tests** — generalized appointment schemas: exactly-one refine accepts package-only/service-only and rejects both/neither; `bookedPriceCents` rename; slug/`isFeatured` presence. Prior art: `appointment.test.ts`, `package.test.ts`.
2. **Real-Postgres integration tests (ADR-0008 compose harness)** — the generalized intake through the HTTP seam: package booking (201 + snapshots), studio-service booking (201, service bookable at branch), both/neither offerings → 400, inactive service → 400, service not bookable at branch → 400, non-applicable add-on on a service booking → 400, past `scheduledAt` → 400 `past_datetime`; new reads: studio-services list shape (`bookableBranchIds`), package-by-slug (200/404), appointment single-get (200 with add-on entries / 404 unknown). Existing suites keep passing with the rename. Prior art: `apps/api` appointment suites, serial files + truncate-between-tests.
3. **api-client loopback tests** — the three new wrapper methods against the in-memory chained mock (typed, Zod-parsed, `ApiClientError` on error shapes). Prior art: `packages/api-client` loopback suite.
4. **Email builder unit tests** — money-free assertions (no peso output, no price-bearing rows for any booking kind), exact from/subject, table-row rules (add-on name-only rows, section omitted when none, Notes row only when non-null), CTA URL from `LANDING_ORIGIN`. Pure function, no I/O.
5. **Landing UI — no unit harness in M2.** The wizard's behavior is verified by the milestone's end-to-end verification: a real booking against the live stack plus scripted browser checks (CDP-style, prior art: the prototype's `prototype-verify` scripts) at build time, not a permanent suite.

## Out of Scope

- Slot grid / availability — Milestone 3 per `docs/plan.md` (ADR-0005); the date step's hour chips are a placeholder grid.
- Admin dashboard + BetterAuth (M4) — closes the public appointment endpoints; CMS editing (M5); R2 cover photos (M5 — landing ships placeholder imagery).
- Production hardening (M6): rate limiting, real logging stack, CORS lockdown, real domains, real sending domain.
- Visual design pass on the landing pages — M2's bar is data-complete, visually-rough (standing charting decision).
- Package pricing optionality in the CMS (prices becoming removable/optional) — M5 territory; when it lands, the form total, the email, and the read-back adapt together under that future ruling.
- Studio Services CRUD, featured toggle, slug editing, per-branch bookability / applicability editing — deferred to the CMS (M5); seed-only until then.

## Further Notes

- **Spec residuals settled here** (they were fog on the map): rejection surfacing = typed reasons mapped to module-owned copy (above); peso/date display = the prototype's `peso` / `phDateTime` helpers promoted to shared landing helpers; confirmation-route caching = no special cache posture in M2 — server-function read per request, TanStack Query defaults.
- **Go-live reminders from Known Gaps**: branch phones are `TODO(seed)` placeholders (the email copy calls the branch — fine while testing, not fine for real customers), and the 8R/8x10 print-size merge confirmation still owes the client (its description text now surfaces publicly on the packages pages).
- **Documentation duties at build time**: update `docs/progress.md` when the milestone lands; record an ADR for the generalized-appointment model + the email send topology (send-after-commit + idempotency) when the code lands — both are nontrivial architectural choices per AGENTS.md.
- M1's pattern (spec issue + `docs/specs/` document, `ready-for-agent` label, build via the plan → build pipeline) is the handoff model for this spec.
