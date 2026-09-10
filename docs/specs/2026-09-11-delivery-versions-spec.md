# Delivery Versions — v1 (Free Handover) / v2 (Paid Booking System) (spec)

Consolidates the delivery-versions wayfinder map (GitHub issue #67) and its seven resolved tickets — Research: booking-free artifact mechanisms (#68), Research: Cloudflare + Supabase handover mechanics (#69), Grilling: artifact mechanism + two-edition maintenance model (#70), Grilling: the v1 absence boundary (#71), Grilling: booking-off landing direction (#72), Prototype: the money-free v2 offer sheet (#73), Grilling: handover mechanics must-decides (#75) — on top of the owner's pinned versioned-delivery rulings (#62). Decisions were settled 2026-09-09 → 2026-09-11; this document is the write-up. `docs/plan.md` is restructured to match on 2026-09-11 (editions manifest, the design milestone seated in the M3 slot, the M4/M6 v1-track/v2-track splits made real, the new Handover milestone); ADR-0015 records the artifact mechanism; #62 is closed as absorbed by this spec. Published as GitHub issue #76.

## Problem Statement

The owner delivers in two editions. v1 is the free handover: the landing site, admin auth, and CMS, booking-free at the artifact level, handed over whole (repo + accounts) exactly once, after the polish milestones land; post-handover work is paid-only. v2 is "the complete booking system" — the booking flow that Milestone 2 already built and merged, plus the appointments dashboard and availability — delivered as new work after agreement and payment. Booking is not a feature flag away: it lives in shared files (header/card/hero CTAs, the `/appointments` mount, `appointmentQueries`, `phDateTime`, the `env.ts` email pair, `CreateAppointmentArgs`) behind the typed cascade of ADR-0006, so producing a booking-free v1 is an artifact-production problem, and absence is the only lock that holds (#62 ruling 5 — the kill-switch was superseded). The map found the way: the exact surface-by-surface absence boundary, the booking-off direction for the surfaces that transform rather than vanish, the mechanism that produces and maintains the artifact across two editions, the account-by-account handover model, the v2 offer's content and its money-free boundary, and the roadmap restructure that carries it all. This spec consolidates every ruling so the v1 edition's remaining milestones and the v2 commissioning each consume their slice without re-deciding anything.

## The Editions

**v1 — the free handover (booking-free).** Sequence (each stage is its own pipeline; this spec decides the edition they ship inside, not their content): v1 artifact seed (ADR-0015) → Milestone 3 UI/UX design system (map #55) → Milestone 4 admin auth (BetterAuth, v1-track) → Milestone 5 CMS → Milestone 6 v1 production slice (incl. ship-time provisioning of dedicated accounts) → Milestone 7 Handover. The client receives the polished product exactly once; inert appointment tables ship (#62 ruling 2 — acceptable), and v1 runs with no booking anywhere: no routes, no API mount, no email, no copy that promises booking.

**v2 — the complete booking system (paid, uncommissioned).** Not scheduled. Built on main as normal work only after agreement and payment (one upsell moment — #62 ruling 4): booking re-integration plus the appointments dashboard (out of M4) plus availability (the former M3) plus booking-specific hardening (out of M6). Delivered to the client's repo as a fresh change-set from main's tree (ADR-0015). The offer that commissions it is the money-free offer sheet (#73, below).

**Constitution.** The six pinned rulings in #62 are standing decisions, never restated in the tickets or this spec's body — zoom #62 for the list.

## The v1 Absence Boundary (surface by surface) — #71

Every ruling below is a statement about the v1 artifact's content; main is untouched and keeps booking until v2 is commissioned.

**Landing pure-booking cluster — absent:** `/book`, `/booking/:id`, `lib/booking.ts` + `lib/booking-read.ts` (+ their tests), `components/booking/rejection-card.tsx` + `summary-rail.tsx`, `appointmentQueries`, `createAppointment`/`getAppointment`. Shared seams transform by stripping their appointment entries: `lib/queries.ts`, `lib/api.functions.ts`, `lib/format.ts` (`phDateTime` goes with the cluster; `peso` stays shared).

**API cluster — absent, env shed included:** the `/appointments` mount in `routes/v1.ts`, `routes/appointments.ts`, `services/appointments.ts`, the email path (`services/confirmation-email.ts` + its test), `test/appointments.test.ts`, the `resend` dependency. `env.ts` shrinks to `DATABASE_URL`-only, keeping the fail-loud parse posture; `env.test.ts` transforms to match.

**Typed seam — group absent, fixtures transform:** `packages/api-client` loses `routes/appointments.ts` + its `index.ts` registration; `test/typing.test.ts`, `test/loopback.test.ts`, `test/mock-api.ts` drop their appointment fixtures. The cut lands entirely inside the client group — nothing else in api-client references appointments.

**Data seam — inert, confirmed:** `schema/appointments.ts`, `schema/appointment-addon-services.ts`, the schema exports, migrations 0000–0004 verbatim, seed untouched, truncate helper untouched. `verify-appointment-row.test.ts` + `client-transaction.test.ts` stay (they pass against the inert tables and test shared client infra).

**`packages/types` — inert-kept**, mirroring the data seam: `appointment.ts`, `appointment-read.ts` (+ tests) ship as documentation of the inert tables; zero runtime cost, v2 re-lands as pure addition, and the seam is never split (tables present ⇔ types present).

**Shared landing surfaces — transformed** (direction in the next section): site-header, package-card / service-card / service-teaser-item / branch-card / home-hero CTAs, `/services` copy, bookable-branches chips.

**Tests — tests follow their code:** suites testing absent code go absent (api appointments/email, landing booking/booking-read); suites testing inert code stay (types, db); shared suites transform (api-client fixtures, api env/app-type). The per-file enumeration above is that rule applied.

**Docs — the artifact ships what runs, how to run it, and the decisions explaining what runs; strategy, roadmap, process notes, and decisions about absent features are scrubbed.** Keep: PRD, architecture, tech-stack, catalog, CONTEXT glossaries, ADRs 0001–0004 + 0006–0011, ADR-0013 kept-and-annotated (it explains the inert tables the artifact ships). Scrub: plan.md (**not client-safe** — editions manifest, upsell framing), progress.md, all of `docs/specs/`, ADR-0005 + 0012 + 0014 + **0015** (features/mechanism absent), `docs/agents/`, `docs/superpowers/`, `.agents/`, `graphify-out/`, `docs/drafts/`, `docs/client/` (never enters — main-only fence). AGENTS.md is rewritten client-safe. ADR-numbering gaps from scrubs are accepted in an export.

## The Booking-Off Direction (v1's transformed surfaces) — #72

**Posture: hybrid contact-forward.** "Call us" is the active verb, walk-in badges carry the passive signal, `/branches` is the conversion hub.

- **"Call us" is a route, not a dial** (no studio-wide phone exists): the header button and the hero's primary CTA navigate to `/branches`, where each branch card shows its phone plus its own `tel:` call CTA.
- **Site-header:** four plain nav links (Packages, Services, Branches, About) + one primary call-forward button ("Call us") → `/branches`. Exact label/styling: the design milestone.
- **Home hero:** primary "Call Us" → `/branches` + secondary "Services" → `/services`.
- **Catalog cards** (package-card, service-card, service-teaser-item): CTA rows vanish; cards purely informational. Page-level affordances on `/services`/`/packages`: design-milestone discretion under the posture.
- **Branch-card:** "Book at this branch" transforms to a "Call {branch}" `tel:` CTA on `branch.phone`. `branch-strip-item` unchanged.
- **Bookable-branches chips: stay** as applicability chips ("offered at" semantics); no internal rename — `bookableBranchNames`/`bookableBranchIds` stay aligned with the inert-kept schema column.
- **Dead routes** (`/book`, `/booking/:id`): plain 404 by pure absence — no stubs, no redirects, no coming-soon. The client's deployment is a fresh handover (these URLs were never publicly live there); stubs would weaken absence-as-the-only-lock; "coming soon" would promise booking on the client's site.
- **Copy/SEO constraint:** no user-facing copy in v1 promises or presupposes online booking; the `/services` "attach to your booking" line rewrites neutrally, call-or-visit flavored. Per-route titles/meta are non-blocking polish under the constraint.
- **Handover-blocking:** every primary CTA funnels to `/branches`, whose phones are seed placeholders — **real branch numbers from the client must land before handover.**

## The Artifact Mechanism — #70 (recorded as ADR-0015)

Compose: one `git filter-repo` seed (booking-only paths + scrub rules keyed to the #71 inventory, content from #72) rewrites history once to seed the long-lived `v1` branch in this monorepo; per-PR cherry-picks (`-x`) with CI and a continuous private deploy as the locks; full booking-free lineage is the history standard (the fallback if discipline proves too costly is a squashed snapshot — absence trivially satisfied, provenance discarded). The handover export is a plain single-branch clone sharing `v1`'s SHAs forever. Teaser = main, continuously deployed to unadvertised owner infra. Post-handover, the discipline never changes: paid fixes develop on main, land on `v1` as picks, and reach the client as fast-forwards; main stays a superset of `v1`. v2 lands as a fresh change-set advancing the client's tree to main's state on the client's own lineage — no merge, no patch-mining, no deploy-only. The `git log -S/-G` audit keyed to the inventory runs over the exported artifact before handover. Full detail: ADR-0015.

## Handover Mechanics — #75 (facts from #69)

**Model: inherit-in-place.** M6's v1 production slice provisions **dedicated** Cloudflare + Supabase accounts at ship-readiness (fresh project ⇒ new `DATABASE_URL`; a freshly generated `BETTER_AUTH_SECRET`; the R2 bucket recreated there — secrets rotate at ship, not at handover) and deploys there; teaser and dev infra never co-locate with the dedicated accounts. On handover day the client is invited in (Cloudflare **Super Administrator**, Supabase **Owner**) **before** the owner's logins demote to scoped members; nothing rebuilds, zero downtime, no domain ever moves between accounts (the zone is born inside the dedicated account — Worker custom domains require same-account).

- **The client's entire duty is clickable:** buy the domain + point nameservers into the dedicated account; accept invites + set passwords; pay bills (**Supabase Pro is the day-one checkbox** — it buys off the Free-tier pause-after-~7-days risk on a live low-traffic site). The client pays everything inherited from handover day; the owner pays the polish window and their own teaser/dev side.
- **The owner operates v1 for its life:** deploys are owner-run `wrangler` under the owner's scoped member login (Cloudflare: `Workers Platform Admin` + `R2 Admin` + `DNS`, fallback `Administrator` if a wrangler operation proves role-starved; Supabase: `Developer`), migrations run from the owner-held `DATABASE_MIGRATE_URL` (never in the client's repo). A handover dry-run verifies `wrangler deploy` under the scoped roles.
- **Repo:** client-owned GitHub account created at handover as guided work (~5 minutes of clicking); private repo; the single-branch `v1` export pushed once as `main`; the owner as **write collaborator** (fixes arrive as fast-forwards); **no CI in the client's repo** — the owner validates on `v1` before every push.
- **Domain:** the client registers after accepting the pitch, at a reputable registrar on the owner's suggestion; renewals theirs forever; the zone lives in the dedicated Cloudflare account.
- **Secrets & custody:** v1's secret set is exactly `DATABASE_URL` + `BETTER_AUTH_SECRET` + `SENTRY_DSN` (`RESEND_API_KEY`/`POSTHOG_API_KEY` are v2-track; `LANDING_ORIGIN` returns as a plain var pointed at the production domain when v2 re-lands). Owner holds the three secrets, `DATABASE_MIGRATE_URL`, CI, and repo write; client holds their logins, billing, and latent super-authority. The handover doc records the client's **lockout lever** — revoke the owner's memberships (Cloudflare, Supabase, GitHub) — instant and zero-outage, since deployed write-only secrets keep working.
- **Sentry stays in the owner's org, disclosed** in the handover doc: free monitoring for the client, the owner's fix/upsell signal; it ends naturally at v2's rebuild.

## The v2 Offer Sheet — #73

The offer that commissions v2. **Content (agreed as drafted, #73 Part A):** framed on the teaser demo ("what you saw in the demo" — rendered as "private preview site"); four items — (1) online booking (branch → service → date/time → contact → on-screen confirmation with booking reference + revisit page), (2) automatic confirmation email from the client's own domain linking back to the booking, (3) appointments dashboard (all bookings across the three branches, filter by branch/status, update status), (4) availability (opening hours + per-slot capacity; the form offers only genuinely open slots; the slot grid agreed with the client before building) — closing on the delivery shape: "This is new work: it begins after agreement and payment," with a scope fence (anything beyond the four items is its own conversation). The booking-on state mirrors #72 in reverse ("Book now" returns to header, homepage, each service).

**Boundary:** total money-silence beyond that one sanctioned phrase (no prices, quotes, payment schedules, validity windows, internal costs); name-neutral (the client never sees "v1"/"v2" or any edition label); no edition mechanics, no hint booking was ever built or is absent, no decision-trail leakage (no issue/ADR/milestone numbers, never "teaser"); hardening promised only as offer language ("completed, hardened"); one artifact, one moment.

**Home & timing:** the polished sheet is produced from the ruling **when v2 is commissioned** (not before — #73's production ruling) and lives in-repo at `docs/client/v2-offer-sheet.md` — **main-only, never cherry-picked into `v1`** (sales strategy even though the content is client-safe; it must never enter the handed-over export). Delivered to the client as a standalone document at the demo, post-handover. The throwaway prototype (`docs/drafts/2026-09-10-v2-offer-sheet-PROTOTYPE.md`, tracked on main — `docs/drafts/` is on the v1 scrub list, so it never enters an export; gist copy linked from #73) is the agreed content source — Part A is the content, Part B is the owner-only boundary ledger.

## Verification

Absence and readiness are proven mechanically, never asserted:

1. **CI on `v1`** — typecheck + test on every pick; the typed cascade makes an incomplete cut a compile failure.
2. **Continuous private deploy of `v1`** — the env-shed runs in production shape for the whole polish window; it feeds the Handover dry-run checkboxes.
3. **Export audit** — `git log -S/-G` token sweeps keyed to the #71 inventory (`appointments`, `Resend`, …) over the exported artifact; zero hits is handover-blocking.
4. **Handover dry-runs** — scoped-role `wrangler deploy` succeeds; the v1 branch's deploy history is green through the polish window.

## Out of Scope

- Executing v1 — the design milestone (map #55), M4 auth, M5 CMS, M6's v1 slice, the seed: their own pipelines.
- The v2 build-out spec (availability's ADR-0005 client reconfirmation, appointments dashboard design, booking-specific hardening) — charted when v2 is commissioned.
- Business terms of v2 — price, contract, payment mechanics (post-handoff-paid-only is already ruled; the number is not this map's).
- Pixel design of booking-off pages — the design milestone executes this spec's direction.
- The env kill-switch — superseded (#62 ruling 5); never built.
- Reopening the #62 rulings.

## Further Notes

- #62 is closed as absorbed by this spec (its own closing instruction).
- Map #55's "booking-off page state" fog item was cleared when #72 resolved: #60 (the landing-refactor scope ticket, formerly hard-blocked on #72) now carries the booking-off direction as scope notes, including the mandate to design the **v1 variants** of the shared surfaces alongside main's booking-present forms.
- Sequencing: the seed executes first in the v1 edition (the inventory is fresh); the design milestone's changes then flow to `v1` as ordinary picks.
- M1/M2's pattern (spec issue + `docs/specs/` document, `ready-for-agent` label, build via the plan → build pipeline) is the handoff model for this spec: `docs/plan.md` is already restructured to match.
