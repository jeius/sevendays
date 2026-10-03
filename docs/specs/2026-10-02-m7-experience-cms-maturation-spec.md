# Milestone 7 — Experience & CMS Maturation (spec)

Consolidates every ruling of the Experience & CMS Maturation wayfinder map (#158, chartered 2026-09-30, closed 2026-10-02): the owner's real-site audit (map Notes, 2026-09-30) and its six charting rulings, catalog deletion (#159), self-serve password reset + the Settings screen shape incl. the Site-tab amendment (#160, reopened 2026-10-02), the public testimonial form (#161), dark mode (#162), no-price catalogs (#163), the landing redesign direction (#164 — six owner-reacted rounds on the throwaway branch `prototype/164-landing-redesign`, nothing merges; the build mines its values and rulings), and the CMS UX maturation system (#165). Two ADRs were written with this spec: **ADR-0020** (amends ADR-0013 — unpriced items, nullable snapshots) and **ADR-0021** (extends ADR-0014 — the reset-email topology over the API service binding; records the M4 email-exclusion reversal and the v1 env-shed amendment). Published as GitHub issue #172; `docs/plan.md` restructured 2026-10-02 to match: this milestone seats between Milestone 6 (Production Hardening) and Handover, Handover renumbered to Milestone 8, the editions manifest's v1-sequence line amended, and the v2-carrier lines that moved forward (Resend sending domain, `LANDING_ORIGIN`) annotated in place.

## Problem Statement

The CMS is live and the landing consumes it — and on 2026-09-30 the owner audited the real site and ruled the gap between "works" and "feels like a real photography studio's site" too wide to hand over. The audit, in the owner's own triage:

- **Critical:** the Settings screen is a stale stub still promising the closed M4; CMS async actions give no pending feedback (toasts are wired — `isPending`/disabled/skeletons are not); v2-teaser Dashboard/Appointments stubs are visible in v1's admin (deliberate M3 product content the owner now rules hidden); the landing has no branded global NotFound/Error (`__root` carries neither); home testimonials are stand-ins while real CMS testimonials render on `/about` only.
- **Need improvements:** a major landing UI rework (the owner revises M3's accepted state — owner prerogative, 2026-09-30); the packages table's expanded row should carry the description and the whole inclusions story; skeletons/loaders designed as a system; the upload UI matured.
- **Additional features, each a ruling reversal unless noted:** dark mode (parked by M3); self-serve password reset (reverses M4's owner-operated runbook; makes Settings real); a public testimonial form (the only public write surface v1 will ever have); catalog deletion (contradicts M5's delete-nowhere); no-price catalogs (schema + CMS + landing + booking ripple). The 2026-10-02 reopening added a sixth: site settings — brand and page copy hardcoded across both apps today, editable nowhere.

Every one of those is now ruled (map #158, tickets #159–#165). What's missing is the build: one milestone that matures the experience end to end — the landing redesigned on the live catalog in both editions and both themes, the CMS brought up to the interaction standard its screens promised, and the six reversals made real in schema, API, and both frontends.

## Solution

Seven interlocking payloads, built once, shared by both editions:

1. **The landing redesign** on the ruled direction — *"the proof is the page"*: a neighborhood studio leading every surface with the work itself (real photographs at real scale, named places, real attributions, peso prices — or nothing, once unpriced arrives), the interface quiet around it. Sticky glass ink chrome, a mosaic-gallery home with D2 light-split featured plates and a full-bleed services marquee, plate-style catalog indexes with a framed/prints/privileges spec sheet on detail, image-backed service rows, branch cover strips with walk-in tooltips, one CTA law across both editions, a branded global NotFound/Error, and a skeleton grammar as route pending components.
2. **Dark mode, from zero, all three surfaces** (landing main, landing v1, admin): the `.dark` block designed in `packages/ui` tokens from the owner-picked ruled values, default light, a shared sun/moon toggle, Sonner themed, and the dark AA counterpart table measured to the token discipline.
3. **Guarded DELETE everywhere** — M5's delete-nowhere reversed and refined: every entity deletable while nothing references it, blocked deletes answering 400-with-field-details in a dialog that stays open, covers/photos cascading as ADR-0019 lifecycle events, history-bearing rows keeping Deactivation as their only retire path.
4. **Unpriced catalogs** (ADR-0020): nullable prices on all three entities, unpriced items fully bookable with null snapshots, nothing rendered wherever a price would render, and the booking Total omitted when any component is unpriced.
5. **Settings made real** (ADR-0021): the Account tab for everyone, the owner-only Users tab (ADR-0018's deferred users page), and the all-staff Site tab (brand mark/name/tagline, page titles/descriptions driving h1 + SEO, the About story, social links, announcement banner, contact block) — plus staff-side forgot-password whose email rides the API service binding, and the Resend sending domain pulled forward from v2 so the reset email is deliverable.
6. **The public testimonial form, both editions**: hold-at-API submissions (the public never renders anything staff didn't accept), accept-with-edit moderation in a Submissions tab, abuse posture = the Workers Rate Limiting binding's first user + honeypot + length bounds, Turnstile written down as the escalation.
7. **The CMS UX maturation system**: the action-class law (optimistic flips/reorders, pending-guarded full writes and deletes), the async sheet-Save contract under one pending vocabulary, first-load-only skeletons, the packages expanded row, upload UI maturation (drag-and-drop, in-flight cancel, leaving-mid-upload confirmation), and the All/Active/Deactivated segment on every CMS list.

The two quick fixes the audit marked urgent landed ahead of the map (#167 stale Settings blurb, #168 v1 stub hiding) as did the upload accept/cap quick win (#170); this milestone carries the systems, not those.

## User Stories

**The landing redesign — customers, both editions**

1. As a customer, I want the studio's real photographs leading every surface at real scale, so the site proves the craft instead of describing it.
2. As a customer, I want a sticky ink header with glass blur that the hero tucks under, so navigation is always one tap away without stealing space from the work.
3. As a customer, I want the home page to open into a mosaic gallery with a deterministic span rhythm and viewport reveals, so the first scroll feels alive and photographic.
4. As a customer, I want the featured packages as light split plates — cover untouched on one side, name, peso price, dotted inclusions and primary ticks on the other — so I can judge a package in one glance.
5. As a customer, I want the studio services as a full-bleed looping marquee (hover to pause; a centered stepper on mobile), so the service range reads as abundance, not a list.
6. As a customer, I want home testimonials paginated three at a time with a reveal on page change, so real voices pace the page instead of stacking.
7. As a customer, I want catalog indexes as cover plates with hover lift, uniform line clamps, truncation-gated tooltips, and mobile tap-to-expand, so browsing feels like flipping through prints.
8. As a customer, I want the package detail as the split plate plus a framed/prints/privileges spec sheet nested per frame, so the whole offering is on one page.
9. As a customer, I want studio services as image-backed split rows with themed backgrounds, one-line descriptions on desktop (two on mobile), and bottom-right CTAs, so each service reads as its own small poster.
10. As a customer, I want branch pages as cover strips with walk-in badges as icon tooltips (hover on desktop, tap on mobile), so branch facts surface without clutter.
11. As a customer on main, I want icon-only call plus "Book at this branch" on each branch, so the two actions are distinct at a glance.
12. As a customer on v1, I want a single primary "Call {branch}" CTA and zero book words anywhere, so the booking-free artifact still converts — by phone.
13. As a customer on either edition, I want every call CTA carrying a phone icon and every book CTA a calendar icon, so affordances are recognizable before I read them.
14. As a customer hitting a wrong URL, I want a branded global NotFound — white body, ink serif headline, no logo — so even the dead end feels like the studio.
15. As a customer navigating between pages, I want structure-only skeleton silhouettes as route pending components with a brand-tinted sweep, so client navigation never flashes blank.
16. As a customer arriving at an empty surface, I want the ruled empty lines (with Back-to-home CTAs on whole-page ones), so absence reads as deliberate, not broken.
17. As a customer, I want gallery walls to render photo captions when they exist, so the work carries its story.
18. As a customer, I want branch pages wearing the studio's real branch photographs (managed in the CMS), so each location shows its actual space.

**Dark mode — everyone**

19. As a reader in a dark room, I want a light/dark toggle (defaulting to light) on the landing and the admin, so my eyes aren't floodlit.
20. As a reader in dark mode, I want the ruled ramp — elevation climbing in lightness, 87/60 text tiers, white-alpha hairlines, dimmed photographs — so dark feels designed, not inverted.
21. As an admin, I want the admin sidebar and every CMS pattern theme-aware from the start, so maturation systems never need a dark retrofit.

**Unpriced catalogs — staff + customers**

22. As a staff member, I want a "has price" checkbox in every priced entity's editor, so an inquiry-priced offering can live in the catalog (unchecked saves null; re-checking requires re-entry).
23. As a customer, I want nothing rendered wherever an unpriced item's price would be — no placeholder, no inquire line, no CTA change — so the absence reads as intentional.
24. As a customer, I want unpriced items fully bookable with the Book CTA unchanged, so inquiry pricing is not a dead end.
25. As a customer, I want the booking Total omitted whenever any component is unpriced (priced add-ons keep their per-item lines), so the summary never claims a number it can't stand behind.

**Settings real — staff + owner**

26. As a staff member, I want a forgot-password link on `/login` that emails a reset token, so a lost password isn't a support ticket.
27. As a staff member, I want the reset request to answer generically whether or not the email exists, so the form can't be used to enumerate staff.
28. As a staff member, I want an Account tab with my identity, an editable display name, a change-password form that verifies my current password, and sign-out-of-all-sessions, so I manage myself.
29. As the studio owner, I want a Users tab (owner-role only) listing staff, creating users with an in-person temporary password, resetting passwords, banning/unbanning with session revocation, auditing per-user sessions with individual revoke, and guarded delete, so routine user work no longer needs the dev.
30. As the studio owner, I want the UI to refuse deleting or banning myself and the last active owner (field-detailed 400s), so a click can't lock the studio out.
31. As any staff member, I want a Site tab — brand logo, name, tagline; page titles/descriptions for Packages, Branches, Services, About, and Home; the About story as plain paragraphs — so the site's words and marks are content, not code.
32. As any staff member, I want social links (empty hides the icon), a toggleable announcement banner, home section kickers, and a brand contact block in the footer, so the chrome stays current without deploys.
33. As a customer, I want unset site settings falling back to today's hardcoded defaults, so a born-empty settings row can never render a broken chrome.
34. As a customer, I want each page's editable title/description driving its visible h1/sub-copy and its `<title>`/meta description (brand name appended), so the pages and their search results tell the same story.

**Guarded deletion — staff**

35. As a staff member, I want to truly delete a catalog row once nothing references it, so mistakes and test rows stop cluttering lists forever.
36. As a staff member, I want a blocked delete to tell me exactly what blocks it (the house 400-with-field-details, rendered in the dialog body), so the refusal is an answer, not an error.
37. As a staff member, I want delete confirmations naming the row and stating that its cover/photo images go with it, so the irreversible is never accidental.
38. As the studio owner, I want rows with booking history permanently deactivate-only, so content work can never destroy or corrupt a booking record.

**Public testimonial form — customers + staff**

39. As a customer, I want a dedicated "share your experience" page reached from `/about`, so thanking the studio takes two minutes and no account.
40. As a customer, I want only a quote and a name asked for (length-bounded), so submitting is effortless — and bots costlier.
41. As a customer, I want a generic success response (and a silent discard for honeypot trips; ~5 per 10 min per IP), so abuse is throttled without me ever seeing a CAPTCHA.
42. As a staff member, I want a Submissions tab on the Testimonials screen with the pending queue, so moderation is a stop on an existing screen, not a new place to remember.
43. As a staff member, I want accept-with-edit (fixing a typo before publishing) with the testimonial appending at the end of render order, so published content is polished and ordered.
44. As a staff member, I want rejected submissions retained as an audit trail and deletion available regardless of status, so repeat submitters are spottable and spam is removable.

**CMS UX maturation — staff**

45. As a staff member, I want Save/Upload/Delete to show pending state (disabled + spinner + "Saving…"/"Uploading…"/"Deleting…" + `aria-busy`) and sheets to close only on success, so a failed save never silently discards my edits.
46. As a staff member, I want single-field flips and drag-reorders to stay instant and optimistic, so the frequent actions stay fast.
47. As a staff member, I want first-load skeletons echoing the loaded anatomy and muted boxes for lazy images — never background-refetch flashes — so loading reads as structure, not jitter.
48. As a staff member, I want the packages expanded row carrying the full description, a duration line, frames as chips, and inclusions as bullet points (label + print size + attires), so the table answers the whole question.
49. As a staff member, I want drag-and-drop onto the gallery grid (the picker stays), a cancel button for in-flight uploads, and a leaving-mid-upload confirmation, so big batches aren't hostage to one mistap.
50. As a staff member, I want an All/Active/Deactivated segment on every CMS list toolbar (defaulting to All each visit, counts unfiltered), so retired clutter is one click away from hidden.

**Developers**

51. As a developer, I want every new admin endpoint behind the one existing `requireSession` root and the moderation endpoints as action endpoints per the media precedent, so authorization stays one gate, not nine.
52. As a developer, I want deletion guards as one guard service answering the 400-with-field-details vocabulary, so nine endpoints share one contract.
53. As a developer, I want the unpriced migrations metadata-only and the wire `priceCents: number | null` end to end, so the live shared DB never rewrites and no sentinel ever exists.
54. As a developer, I want `site_settings` as a singleton full-object PUT (no per-field patching), so the settings screen is one save like every other editor.
55. As a developer, I want the `.dark` block in `packages/ui` tokens only — one source, both apps — with the dark AA counterpart table measured and recorded, so dark is a system, not per-app styling.
56. As a developer, I want the rate-limit binding as the submissions endpoint's gate (its first user) with binding-shaped test stubs, so abuse posture is testable in CI.
57. As a developer, I want the v1-pick class of every payload ruled up front (below), so no PR in this milestone is a pick surprise.

## Implementation Decisions

### The landing redesign — direction and surfaces (#164, ruled end to end)

- **Thesis (ratified verbatim):** *"The proof is the page."* A neighborhood studio proving trust + craft leads every surface with the work itself. What dies with M3's accepted look: placeholder-led surfaces, equal-rhythm strip monotony, stand-in testimonials presented as real, text-first cards burying photography, kicker-over-heading duplication. **What does NOT change** (map ruling 5): the petrol/ink oklch token layer, wash+cards+bands atmosphere, the typeface trio, shadcn/Base-UI primitives, WCAG AA. One voice per section — kickers retire; serif headings carry.
- **Chrome — pass C "sticky ink bar":** the ink band, sticky, glass at 90% ink + backdrop-blur with a white/10 hairline; the hero tucks under it on home; the incumbent wordmark (serif name + mono kicker) in header and footer, desktop-only; the footer carries the 3-branch contact truth; the mobile menu animates per Base UI's native transition contract.
- **NotFound/Error:** white body, no logo, ink serif headline, `min-h-full`, global at the root (the packages/$slug + booking/$id route-level `notFound()` overrides removed). Error = ink field + logo + Try again; the build may align it to the NotFound family. Dark NotFound returns the ink field.
- **Home:** incumbent hero photo under the glass bar → mosaic gallery (deterministic 2×2/2×1 span rhythm, viewport reveals, no title-captions) → featured as D2 light split plates (cover 60% untouched + light panel: serif name, mono peso, dotted inclusions list, primary ticks between plates) → services full-bleed looping marquee (3-copy track, hover-pause; mobile = JS transform stepper with centered cards) → paginated testimonials (3/page, lead + side rail, reveal on page change) → the emphasis strip.
- **Catalog:** index = A plates (2-col cover plates: reveals, hover lift, uniform 2-line clamps, truncation-gated tooltips, mobile tap-to-expand in-flow — never a scrollview) · detail = the D2 split plate + the framed/prints/privileges spec sheet (per-frame nesting) · services = image-backed split rows (themed backgrounds, reveals, 1.05 zoom, bottom-right CTAs, 1-line desktop / 2-line mobile descriptions).
- **Branches:** cover strips, walk-in badge as icon + tooltip (Footprints/CalendarClock; hover desktop, tap mobile), intro tail variant-aware. **Variant-split CTAs (ruled):** main = icon-only call (tooltip "Call {branch}") + "Book at this branch"; v1 = single primary "Call {branch}" — zero book words on the v1 page.
- **CTA law (site-wide, both editions):** v1's "Call us" is the solid primary wherever it is the one affordance; every call CTA carries a Phone icon, every book CTA a CalendarPlus; footer/NotFound CTAs keep outline weight.
- **States:** the skeleton grammar as route pendingComponents (client navigations only; brand-tinted sweep emphasis) · the muted CoverPanel placeholder (today's, unchanged) · the ruled empty lines with Back-to-home CTAs on whole-page ones (judgeable via branch-only `?empty=1` on the build) · the unpriced law (#163) verified at every price render site (the #164 round found and fixed one leak: home's featured plate).
- **Spec items inherited from the prototype (ruled there, built here):** **branch covers** — a `cover_image_key` on branches (schema), admin upload, API wire resolution, all per the packages-covers precedent (the prototype judged via a stand-in seam); **gallery captions** — the admin `caption` field onto the public gallery wire and the batch-upload tray, walls rendering captions when present.

### Dark mode — from zero, all three surfaces (#162)

- No `.dark` block exists today (the M3 spec's "carried, parked" line was stale — corrected 2026-10-02). The block is **designed from zero** in `packages/ui` tokens.css: the hue-225.078 ramp flipped onto the **owner-picked base** `oklch(0.2336 0.0089 255.6)` (`#1b1e22`) re-derived as shades **paired with brand-ink** (measured `oklch(0.185 0.0164 256.8)` — the same blue family; ink anchors the floor); the fixed brand points (`#06708e` petrol, `#0e131a` ink) unchanged; elevation climbs in lightness (cards +1, popovers +2); text tiers 87/60 (never pure white); hairlines white-alpha; photographs dimmed to 92%; the admin sidebar joins the ramp. Landing **and** admin.
- **Mechanics:** next-themes class strategy (dep already present); a shared sun/moon toggle primitive in `packages/ui` used by both apps; Sonner themed via `useTheme` (the admin's existing Toaster; a landing Toaster is **not** implied — landing has no toaster and gains none). **Default light** — M3's accepted first impression preserved; the toggle offers Light/Dark.
- **Contrast:** the spec carries the dark AA counterpart table to M3's measured light pairs (ink-on-light 13.85, white-on-primary 5.65, link-on-white 8.22, muted-on-wash 4.59), measured per the token layer's discipline (hexes canonical, oklch round-trips verified) at build; light pairs re-measured unchanged. No ADR (M3 ruled dark in its spec; the reversal is spec payload likewise).

### Guarded DELETE everywhere (#159 — M5's delete-nowhere reversed and refined)

- True deletion for all nine CMS entities, **only while nothing references the row**. Per-entity guards (live schema): Testimonials + Gallery Photos — blocked by nothing (a photo's R2 object deletes with it). Gallery Categories — blocked by any photo in the category. Print sizes — blocked by any Inclusion resolving them. Attires — blocked by any inclusion-attire. Add-on Services — blocked by an add-on attached to any Appointment ever; its studio-service matrix rows cascade. Branches — blocked by any Appointment ever; branch×service matrix rows cascade. Service Packages — blocked by any Appointment ever; Frames, Inclusions, inclusion-attires cascade; the cover key deletes with the row. Studio Services — blocked by any Appointment ever; both matrices' rows cascade. "Any Appointment ever" means any status including cancelled/no-show. History-bearing rows (blocked) keep Deactivation as their only retire path, permanently — cascade-delete of history was explicitly rejected (names join live; only `bookedPriceCents` is snapshotted).
- **Route shape:** RESTful `DELETE /api/v1/admin/<entity>/:id` behind the existing `requireSession` root; a blocked delete answers the house 400-with-field-details (no 409), listing exactly what blocks. **Object lifecycle:** covers/photos delete with their row per ADR-0019 §5, execution following the #137 cover-replace precedent (DB commit first, then the object delete). Delete frees the unique name + slug (a deactivated row keeps squatting both).
- **Confirmation UX:** the existing DeactivateConfirm dialog vocabulary — a dialog naming the row and stating its cover/photo images go with it; no typed-name gate (guarded deletes destroy no booking history). Delete dialogs are pending-guarded (below) and stay open on failure with the blocking references in-body.
- **Retired-row presentation** rides #165's system (below): dim/dot stays the language, always visible, plus the All/Active/Deactivated segment.
- **Prose debt this milestone clears:** the M5 spec's delete-nowhere lines carry a dated reversal note (landed with this spec); the schema's "never deleted" comments and plan.md's M5 header line amend at build.

### Unpriced catalogs (#163 — ADR-0020)

- All three priced entities nullable (`priceCents: number | null` wire); migration is metadata-only `DROP NOT NULL` on the three catalog columns + the two snapshot tables' columns (four snapshot columns total). Unpriced items **fully bookable**: Book CTA unchanged, null end-to-end through both booking snapshots; the appointment read types become `bookedPriceCents: number | null`. ADR-0013's invariant amended by **ADR-0020**: *every appointment carries its quoted price when the booked item had one*.
- **Rendering law:** wherever a price would render — landing cards, teasers, detail sheets, home featured, booking summary, confirmation — **nothing renders**: no placeholder, no inquire line, no CTA change. `peso()` null-safe across the render sites. The booking **Total is omitted** whenever any component is unpriced; priced add-ons keep per-item lines. (The confirmation email and admin appointments list render no prices — no ripple.)
- **CMS behavior:** the "has price" checkbox is UI sugar over the nullable column (unchecked saves null; re-checking requires re-entry before save; existing priced rows default to checked). The packages expanded row's price cell renders nothing when unpriced.

### Settings made real (#160 + the 2026-10-02 Site-tab amendment — ADR-0021)

- **Three tabs. Account (every staff member):** read-only identity (name, email, role), editable display name, change-password (verifies the current password), sign-out-of-all-sessions. **Users (owner-role only, hidden for staff):** ADR-0018's deferred users page, driven by the already-mounted `admin()` plugin server-side behind the role gate — list; create with an owner-chosen temporary password handed over in person (role picker owner/staff, warned on owner; no emailed invite — the temp password is the create path); direct password reset; ban/unban (revokes sessions); revoke-all-sessions; per-user session listing with individual revoke; hard delete behind a DeactivateConfirm-style dialog (sessions/accounts cascade; no catalog table references users). Impersonation ships no UI. **Site (all staff — content, not machinery, per ADR-0018):** brand logo (replaces the ruled #111 chip-size monogram slot's source; no full-lockup slot), brand name + tagline (wordmark + kicker in landing chrome and admin sidebar, document titles); page titles/descriptions for Packages, Branches, Services, About — and Home (hero headline + blurb) — each driving the visible h1/sub-copy **and** the route's `<title>`/meta description (brand name appended); the About story as plain multi-paragraph text (newlines = paragraphs; rich text stays parked); extras ruled in: social links (Instagram/Facebook/TikTok; empty hides the icon), a toggleable announcement banner (title + body + active switch; off renders nothing), home section kickers, and a brand-level contact block in the footer (studio email/phone; branch phones stay branch-owned).
- **Schema/wire:** `packages/types` SiteSettings Zod schema; `packages/db` singleton `site_settings` table (brand; pages × {title, description}; about story; extras) with the full-object PUT pattern — no singleton precedent exists yet, this creates it. Public `GET /api/v1/site-settings` joins the v1.ts read chain; admin `PUT /api/v1/admin/site-settings` behind `requireSession`. Logo upload reuses the ADR-0019 presign + commit pipeline (a logo purpose; served through the Images binding like covers). **Unset fields fall back to today's hardcoded defaults — the settings row is born-empty; defaults live in code**; the chrome never renders broken. Both apps consume via the SSR query pattern; the spec sequences consumption with the redesign (#164 composes around CMS-driven chrome) and #165's pending-states system covers the new tab. Brand edits never touch auth/email config (appName, sender identity stay env-owned).
- **Forgot-password (staff-side email):** BetterAuth 1.7's `requestPasswordReset({ email, redirectTo })` + `resetPassword({ newPassword, token })` on `/login`; `sendResetPassword` wired per **ADR-0021** — `{ to, url }` forwarded over the API service binding to a small internal send endpoint reusing the API's live Resend seam; the admin Worker stays Resend-free; the token URL builds from the admin's own `BETTER_AUTH_URL`; sender `no-reply@`; `revokeSessionsOnPasswordReset: true` keeps its cascade. Anti-enumeration: the reset request answers generically; rate limiting rides the already-enabled database-backed limiter.
- **Sending domain pulled forward:** the Resend domain verification (DKIM etc.) + end-to-end reset-email inbox check become **this milestone's** tasks (seated after M6 ships the client's custom domains); the email pair returns to v1's API env with it (ADR-0021's env-shed amendment; the pick ruleset amends — see v1-pick classes). Booking confirmations re-verify at v2.
- **Deletion guards (confirmed at the live re-ask):** no self-delete, no self-ban (your own row view-only in the list), and the last active owner-role user can be neither deleted nor banned from the UI — refusals are field-detailed 400s in the house style.
- **Runbook demotion:** `create-staff` + `docs/staff-provisioning.md` demote to bootstrap + break-glass (runbook rewrite at build); ruling #75 stands — the dev remains v1's operator (deploys, secrets, migrations); the owner-role lockout recovers through the CLI path.

### Public testimonial form (#161)

- **Both editions** — additive, booking-independent; **v1's only public write surface**. **Hold-at-API:** a separate `testimonial_submissions` table (`quote`, `person`, `status: pending | accepted | rejected`, timestamps); nothing the public writes ever renders; a Testimonial exists only after staff accept — the published catalog stays 100% staff-authored. Glossary: **Testimonial Submission**.
- **Form:** only `quote` + `person` mirroring the entity; bounds double as anti-spam — quote 20–600 chars, person 2–80. A **dedicated page** reached via a CTA on `/about`, existing on both edition variants; visual treatment per the redesign.
- **Abuse:** the Workers Rate Limiting binding **pulled forward from v2** as its first user (~5 per 10 min per IP) + a honeypot (filled → silent discard with a success-shaped response) + the length bounds. No CAPTCHA now; **Cloudflare Turnstile is the written-down escalation** if real spam beats the package.
- **Moderation:** **accept-with-edit** (staff may fix/trim text first; accept creates the Testimonial appended at the end of render order via the existing `nextTestimonialPosition` max+1; reorder via the existing order PUT); **reject retains** the row as `rejected` (audit trail, re-submission spotting); **deletion available regardless of status** per #159 (a submission references nothing). The queue is a **Submissions tab on the Testimonials screen**; its interaction patterns are governed by #165's system.
- **API:** public `POST /api/v1/testimonial-submissions` (generic success response, no row echo); admin behind the existing root `requireSession`: `GET /api/v1/admin/testimonial-submissions`, `POST /:id/accept` (optionally edited `{quote, person}`), `POST /:id/reject`, `DELETE /:id` — action endpoints per the media presign/commit precedent. **No notifications — the queue is the notification.**

### CMS UX maturation — the system (#165; all patterns theme-aware from the start)

- **The action-class law:** *optimistic* — single-field flips (activate/deactivate) and drag-reorders (instant UI, snapshot rollback + error toast on failure; never spinners); *pending-guarded* — full-object writes (create/update) and deletes (the server validates and completes: id, slug, resolved lookups, guard answers), the UI holds and shows pending. Future surfaces pre-sort: the Submissions tab's accept/reject are full-object writes → pending-guarded.
- **The async Save contract:** `LightEntityEditor.onSave` returns a promise; the shell awaits it; Save is pending (disabled) in flight; the sheet closes **only on success**; failure keeps it open with the error toast (state intact, retry safe). The `editorNonce`/`keepEditorOpen` remount machinery is **deleted, not extended**. All seven sheet surfaces + the Submissions tab. The package editor's bare `disabled={savePending}` upgrades to the same vocabulary.
- **One pending vocabulary:** disabled + `LoaderCircle` spinner (`animate-spin`, `currentColor`) + label swap — "Saving…" / "Uploading…" / "Deleting…" where a label exists; icon-only buttons take the spinner in place; `aria-busy` always. Theme-free by construction.
- **Confirm dialogs:** Deactivate keeps close-on-confirm (optimistic — the law covers it). Delete is pending-guarded: busy confirm, stays open on failure, blocking references in the dialog body (never toast-and-close).
- **Loads:** skeletons for structural first loads only, echoing the loaded anatomy (the on-disk pattern on all eight screens, ratified); never on background refetch; muted placeholders for media fills (`bg-muted` boxes); no per-card image skeletons — images lazy-load into the muted box.
- **The packages expanded row:** full description + a duration line (`durationMinutes` renders nowhere today) + frames as a chip row (frame numbers) + inclusions as bullet points (label + print size + attires). `ServicePackageRead` already carries it — pure rendering, zero API work. Unpriced = blank price cell. Packages table only; both postures (desktop panel + mobile stacked reveal).
- **Upload UI (NI-4):** drag-and-drop onto the grid (picker stays) · cancel for in-flight uploads (the abort seam exists) · a leaving-mid-upload confirmation while uploads are unsettled (in-app navigation block + `beforeunload`, with "Leave anyway"). Out: pre-commit metadata editing (title-from-filename stands). The accept/cap quick win (#170) already landed.
- **Retired rows + the Active filter + the status palette:** dim/dot stays the retired language (always visible, identifiable); every CMS list toolbar gains a three-state segmented control **All / Active / Deactivated** — packages, branches, lookups (both tabs), testimonials, add-ons, studio services, and the gallery grid; default All per visit (local state, no persistence); rail/grid counts stay unfiltered staff-truth totals. The `TODO(token-ruling)` status palette (status dots, reactivate icon) settles in the CMS-wide interaction ticket, both themes, via rendered variants.

### v1-pick classes (fog settled here; per-PR triage still applies)

| Payload | Class | Notes |
|---|---|---|
| Guarded DELETE (all nine) | **PICK clean** | Catalog lifecycle; the "any Appointment ever" guards read the shared `packages/db` schema (the seed's ruled-kept barrel-import class); no booking surface touched. |
| Unpriced — catalog side (migrations, types, CMS checkbox, landing omission) | **PICK clean** | The migrations apply to the shared DB regardless; the nullable columns land in both editions' schema. |
| Unpriced — booking path (snapshot reads, summary/confirmation Totals) | **MAIN-ONLY** | v1 has no booking; the columns exist but nothing on v1 reads them. |
| Site settings (schema, public GET, admin PUT, both apps' consumption) | **PICK clean** | Additive CMS + read chain; defaults-in-code keeps v1 rendering before any content exists. |
| Forgot-password + Users tab + API send endpoint | **PICK clean, with the ruled ruleset amendment** | ADR-0021: the email pair un-sheds from v1's `env.ts`; the audit's two email tokens retire from the absence inventory (booking tokens remain); the pick-runbook conflict-policy line amends ("appointments never return; the email pair returns with M7"). |
| Resend sending domain + email env (API) | **PICK** (same amendment) | Domain + DNS work is edition-shared; `LANDING_ORIGIN` returns as a plain var per the amended env-shed. |
| Testimonial submissions (table, public POST, admin queue, Submissions tab, `[[ratelimit]]`) | **PICK clean** | Ruled both editions — v1's only public write surface; the binding addition is edition-neutral (wrangler.toml already a transformed surface). |
| Dark mode (tokens `.dark`, toggle primitive, both apps' theming) | **PICK clean** | Edition-neutral design system; default light preserves v1's accepted first impression. |
| CMS UX system (interaction ticket, expanded row, upload UI) | **PICK clean** | Admin surfaces exist on both editions; the Submissions tab lands on both. |
| Landing redesign | **PICK with transformed-surface conflicts** | The established class: v1 keeps its booking-off direction inside the new structure (branch CTAs single Call — zero book words; hero CTA set call-forward; index CTA-less; CTA law's v1 arm: Call us solid primary). The `?v` variant-split mechanics previewed per surface in #164 are the ruled shapes. |
| Branch covers + gallery captions | **PICK clean** | Catalog + wire + CMS + landing walls. |
| Booking-adjacent renders (wizard Total, confirmation Total) | **MAIN-ONLY** | Booking surfaces are absent on v1 by construction. |

### Sequencing (workstream order; the ticket-cut pass slices precisely)

1. **API/schema foundation:** deletion endpoints + guard service; unpriced migrations + wire; `site_settings` + endpoints; `testimonial_submissions` + endpoints + rate-limit binding; branch covers schema/wire; gallery captions on the public wire.
2. **Dark-mode foundation:** the tokens `.dark` block from the ruled values, the toggle primitive, Sonner theming, both apps wired.
3. **CMS UX tickets** (the three #165 pre-named): the CMS-wide interaction system (async Save + vocabulary + delete posture + Active filter + Submissions tab + status palette, screen-by-screen, rendered variants), the packages expanded row, upload UI maturation — all theme-aware.
4. **Settings screens:** Account/Users/Site tabs + forgot-password + the sending-domain task + the env/ruleset amendment.
5. **The landing redesign build**, both editions both themes, with site-settings consumption stitched where the redesign lands the slots (hero copy, page titles, About story, social, banner, kickers, contact).
6. **Exit verification + docs rotation** (below).

## Testing Decisions

- **The api vitest suite stays the behavioral backbone** over the compose database: per-entity delete guards (blocked → 400 field details listing the blockers; cascade cases for compositions/matrices; object-delete ordering per the #137 precedent), the unpriced wire (nullable on every read/write shape; null snapshots at intake; priced-snapshot retention when a row goes unpriced later), `site_settings` GET/PUT round-trip + born-empty defaults, submissions lifecycle (public POST bounds + generic response + honeypot discard; accept-with-edit appending at `nextTestimonialPosition` max+1; reject retention; delete-any-status), the rate-limited endpoint behind binding-shaped stubs (limit → the shaped rejection), `requireSession` ordering for every new route (401 before validation).
- **api-client loopback suite** grows the new wrappers (deletes, submissions group, site-settings) per the ADR-0006 wrapper discipline.
- **Admin lib-seam tests** (plain-node, the M5-seated pattern): the async Save-contract state seam, the pending-vocabulary mapper, the Submissions-tab state, the expanded-row composition, the site-settings form seam; the `editorNonce` machinery's deletion is proven by the contract tests' new shape.
- **Landing lib-seam tests:** null-safe `peso()` across render sites, the no-price omission law per surface, caption presence pass-through, the ruled empty lines, the site-settings defaults seam.
- **packages/types contract tests** for every new/changed schema (nullable price, SiteSettings, Testimonial Submission, branch cover presence-encoding).
- **Owner-reacted rendered variants per UI-bearing ticket** (#94 amendment): every new composition renders variants the owner reacts to — light judged first, the dark counterpart in the same or the immediately following round per #162; the status palette and the Submissions tab settle via rendered variants.
- **Exit gate:** a live-stack reflection scenario in the `cms-reflection.mjs` class, extended to the new surfaces (delete → landing absence + name/slug freed; unpriced → nothing rendered end to end; submit → accept-with-edit → renders at the end of order; site copy → both apps' chrome; dark toggle → the ruled ramp live), plus **visual-regression coverage on the redesigned surfaces if the M6 pre-flight browser-test foundation has landed** — this milestone is that foundation's flagship consumer, and its verification posture is tool-neutral by ruling: the gates above hold either way, the visual layer rides whichever foundation exists at build time.
- Good tests assert external behavior (wire shapes, rendered outcomes, guard answers), never implementation internals; prior art: the M5 api write-model suite, the admin seam suites, the landing lib-seam suites, the CDP harnesses.

## Out of Scope

- **Booking-surface UI** (/book wizard, confirmation) and the appointments dashboard — v2's payload.
- **The browser-test (Playwright) foundation itself** — a separate M6 pre-flight workstream (ruled 2026-09-30); this milestone only consumes it.
- **v2's prepaid-vs-unpriced handling** — a v2 ruling (require priced items or route unpriced to pay-on-arrival); the schema permits the state from now on.
- **Booking-endpoint rate limiting** — stays v2; the binding lands here for submissions as its first user.
- **Booking-confirmation email re-verification** — v2; the sending domain verifies here for the reset email only.
- **Cloudflare Turnstile / CAPTCHA** — written-down escalation only, adopted if real spam beats the ruled package.
- **Rich text / free-form content blocks** — still parked on client copy; the About story is plain paragraphs.
- **Typed-name delete gates** — rejected (guarded deletes destroy no booking history; the confirm dialog suffices).
- **Staff email notifications for submissions** — the queue is the notification; revisit only if volume outruns attention.
- **Impersonation UI** — stays server-side-only. **Emailed staff invites** — the in-person temp password is the create path.
- **A landing Toaster** — Sonner theming applies to existing toasts; the landing gains none.
- **Pre-commit metadata editing in uploads** — title-from-filename + category-at-enqueue stand. **Per-card image skeletons** — muted box + lazy-load. **Filter persistence across visits** — per-visit default All stands.
- **Per-branch roles/permissions** — PRD-deferred beyond v2. **M6 hardening content** (logging, Sentry, CORS, domains, ship-time provisioning).
- **The two audit quick fixes (#167, #168) and the upload accept/cap quick win (#170)** — landed 2026-09-30 ahead of the map; carried by nothing here.

## Further Notes

- **Content gaps (owner-owned, recorded by #164):** real studio photos not yet acquired — all stand-ins (18 curated CC0 StockSnap files + the seam) live on the prototype branch only, never touching the database; package covers 2/12 real; 9 of 13 gallery photos uncategorized; one testimonial reuses the school quote's text. The redesign's thesis needs the real photography; acquisition is the owner's.
- **The prototype branch `prototype/164-landing-redesign`** (worktree `.worktrees/164-landing-redesign`, tip `b050334`) is throwaway per the M3 precedent: nothing merges; the build mines its values and rulings. Verbatim record: `.scratch/2026-09-30-164-rulings.md` + `.scratch/2026-09-30-164-direction-contract.md`; product truth captured in the `PRODUCT.md` trio (`.scratch` is gitignored — the durable rulings live in #164's resolution and this spec).
- **#152 absorption:** the upload-cancellation item is this milestone's upload-UI ticket; the position-race and suite-debt items stay #152's.
- **Docs landing with this spec:** the M5 spec's delete-nowhere reversal banner + inline notes; the M3 spec's dark-line correction; plan.md restructured (M7 seated, Handover → M8, editions manifest + v2 hardening carriers annotated). **At build time:** the schema's "never deleted" comments, `tokens.css`'s parked-dark comment, plan.md's M5 header line, `docs/staff-provisioning.md`'s demotion, and the pick-ruleset amendment (`scripts/seed-v1/` + `scripts/audit-v1-absence.mjs`, main-only) all amend with their owning tickets.
- **Glossary terms** landed in the CONTEXT files at their resolving tickets (Delete, Unpriced, Password Reset, Users Page, Site Settings, Testimonial Submission); no new term settles in this spec.
- **Execution tickets** are cut next via the spec → tickets → build loop, native-blocked; #165 pre-named the three CMS tickets (the CMS-wide interaction ticket, the expanded row, upload UI maturation).
