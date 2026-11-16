# M9 — Admin Notifications & Search Spec

*Drafted 2026-11-16 from wayfinder map [jeius/sevendays#298](https://github.com/jeius/sevendays/issues/298) — the six resolved decision tickets ([milestone posture #299](https://github.com/jeius/sevendays/issues/299), [notification model #300](https://github.com/jeius/sevendays/issues/300), [search research #301](https://github.com/jeius/sevendays/issues/301), [search scope #302](https://github.com/jeius/sevendays/issues/302), [search UX #303](https://github.com/jeius/sevendays/issues/303), [bell/panel UX #304](https://github.com/jeius/sevendays/issues/304)) plus the charting rulings. Status: **RATIFIED by the owner, 2026-11-16** (on [ticket #305](https://github.com/jeius/sevendays/issues/305), "All looks good" — including the copy pass in D5).*

## Problem Statement

The admin top bar has carried two inert controls since the M3 shell drew them (#59 variant A): a bell and a search Input. Neither does anything. Pending public testimonial submissions — v1's only inbound write surface, live since M7 — are invisible unless a staff member happens to visit the Testimonials screen; a submission can sit pending for days with nothing in the chrome saying so. And finding any catalog row means knowing which of the eight list screens holds it, then scanning by eye (or the browser's find). M7 ruled "No notifications — the queue is the notification" (its spec § Public testimonial form + Out of Scope), which correctly declined notification *machinery* but left the queue invisible from anywhere but its own tab.

## Solution

Wire the two inert controls, both thin by the #299 soft-ceiling mandate (client-side + derived-over-existing-reads presumed; meat justifies against handover delay):

1. **The Notification** (glossary: *Notification*) — a **derived view** over the pending-submissions queue, ruled at #300 and recorded as ADR-0028: the badge is the pending count and the panel lists the submissions themselves, with inline **confirm-guarded Accept/Reject** (anatomy ruled at #304, Variant C). No `notifications` table, no per-staff read state, no dismiss — an item leaves only by moderation. M7's ruling is **affirmed and extended**: making the thing M7 called the notification visible from every screen fulfills it; nothing M7 declined got built.
2. **Global Search** (glossary: *Global Search*) — the topbar Input becomes the typing surface of an **inline dropdown** (posture ruled at #302, anatomy picked at #303 over the rendered palette): a client-side **fuse.js** index built from the #288-cached admin list queries, with **cmdk as the headless listbox core**, results grouped under the four CMS content entities (packages, branches, testimonials, gallery), deactivated rows findable and marked, and a result landing on its entity's list screen scrolled into view and highlighted (`?focus=`), never auto-opening an editor.

Zero API, schema, or migration work; zero `packages/types` or `api-client` changes. The whole milestone is admin-app-local (one defaulted prop ports into `GuardedConfirm`), over reads the admin already holds.

## User Stories

1. As a Staff User, I want the bell to show how many submissions are pending from every screen, so that inbound work is visible without visiting the Testimonials screen.
2. As a Staff User, I want no badge at all when nothing is pending, so that a quiet queue reads as quiet — not as a zero.
3. As a Staff User, I want the count capped readably (9+), so that a backlog doesn't break the chrome.
4. As a Staff User using a screen reader, I want the count to ride the trigger's accessible name as one atomic status, so that I hear it once, not twice.
5. As a Staff User, I want the panel to show the submissions themselves — the quote, the person, the date — so that I can judge a submission where I see it.
6. As a Staff User, I want to accept a submission from the panel behind a confirm, so that publishing is deliberate, not a mis-click.
7. As a Staff User, I want to reject a submission from the panel behind a confirm, so that destroying-the-pending-state is equally deliberate.
8. As a Staff User, I want a failed panel action to keep the row and panel intact with a toast, so that retry is always safe.
9. As a Staff User, I want the pending vocabulary on the panel's actions (spinner in the icon's place, `aria-busy`), so that in-flight actions are legible.
10. As a Staff User, I want the panel's footer link in every state, so that the full vocabulary — accept-with-edit, delete — is one click away in the Submissions tab.
11. As a Staff User, I want no dismiss and no mark-read anywhere, so that the panel never becomes a second inbox to manage — items leave only by moderation.
12. As a Staff User, I want the panel to refetch when I open it, so that what I'm examining is fresh.
13. As a Staff User, I want all staff to see the same count, so that moderation is never accidentally duplicated or dropped.
14. As a Staff User, I want the empty panel to say so plainly with the footer persisting, so that zero-pending is a settled state, not a broken one.
15. As a Staff User, I want to type into the topbar Input I already see and get results beneath it, so that search lives where my cursor already goes.
16. As a Staff User, I want ⌘K and Ctrl+K (both, no platform sniffing) to focus the Input and open the dropdown, so that the expert gesture works from anywhere.
17. As a Staff User on a narrow viewport, I want the magnifier button to open the same results as a top sheet with its own autofocused input, so that search is not sm-only.
18. As a Staff User, I want results in a non-modal popover with the page visible around them, so that searching never blanks my working context.
19. As a Staff User, I want typing to stay responsive while results filter, so that search never feels slower than the lists it searches.
20. As a Staff User, I want identity matches (names, persons, titles) to rank above body matches (descriptions, quotes, captions), so that the row I mean is at the top.
21. As a Staff User, I want deactivated rows findable and marked with a "Deactivated" suffix, so that search mirrors the lists' All/Active/Deactivated vocabulary.
22. As a Staff User, I want a gallery photo to match its category's name, so that "graduation" finds graduation photos however they're captioned.
23. As a Staff User, I want a result to land on its entity's list screen scrolled into view and highlighted, so that the row is where my eye lands.
24. As a Staff User, I want search results never to auto-open an editor, so that navigation is never a surprise form.
25. As a Staff User, I want a hint line at zero query, filtering from the first character, five results per group with an "+N more" tail, and a muted no-results line, so that every state of the dropdown is settled.
26. As a Staff User, I want entity icons, peso on package rows, gallery thumbs, and the Deactivated suffix on every item, so that results are recognizable at a glance.
27. As a Staff User, I want the full keyboard model — arrows roving, Enter selecting, Escape closing — so that search is drivable without the mouse.
28. As a Staff User, I want both features in light and dark themes, so that M9 touches the chrome without breaking its palette.
29. As an Owner, I want zero API, schema, or migration work in this milestone, so that the soft ceiling holds and handover is not delayed by server work.
30. As an Owner, I want every user-facing string ratified in one copy table, so that nothing ships as placeholder copy.
31. As an Owner, I want the v2 fences (appointments notifications, the email channel, the stored inbox, server-side search, appointments/users/audit-log search) written down with graduation triggers, so that growing past v1 is a ruled act, not drift.
32. As an Owner, I want M7's "the queue is the notification" disposition recorded in an ADR, so that future contributors don't reach for a notifications table that was deliberately never built.
33. As an implementer, I want the search engine as a hand-wired lib seam with the prototype branch as primary source, so that ranking, capping, and grouping are testable without a DOM.
34. As an implementer, I want `GuardedConfirm.confirmVariant` to default to the destructive fill, so that every existing call site renders byte-identically until an accept dialog opts into primary.
35. As an implementer, I want freshness to inherit the #288 seam exactly (5-minute staleness, own-mutation invalidation, the shared query key), so that the bell adds no new fetch machinery.

## Implementation Decisions

**D1 — The Notification model: a derived view (ADR-0028, ruled at #300).** The badge count *is* the pending count (`status = 'pending'`) and the panel lists the pending submissions themselves; an item leaves only by moderation. No `notifications` table, no per-staff read state, no dismiss-without-moderating — the derived ruling ruled those absences. The v1 Notification is a surfacing of the queue in the chrome, not a message system. Audience: all staff (the panel rides `_shell`'s session gate, matching the Submissions tab's); if moderation itself should ever be owner-gated, that's a separate future ruling about the tab, not the bell's business.

**D2 — The bell + panel anatomy (Variant C "dense list + initials", ruled at #304 over the rendered variants).** Badge: an amber chip on the bell (the `SUBMISSION_STATUS_META.pending` family verbatim), **cap 9+**, **hidden at 0**; the visual badge is `aria-hidden` — the count rides the trigger's accessible name (`Notifications, {n} pending submissions` / `Notifications`), one atomic status, no competing live region. Trigger tooltip `{n} pending submissions` (`side='bottom'`), only at n > 0. Panel: a 400px popover, `p-0` — an uppercase-muted workbar header (title + count), divide-y dense rows (initials avatar via the letters-only initials rule, 2-line quote, person · `submittedOn` meta), icon-only ✓/✗ actions with hover hints, and the footer link rendering in **every** state. Empty: the single on-disk line, centered, footer persisting. One `TooltipProvider` hoisted over the surface so hints flow through the popover's portal.

**D3 — The panel's action contract: confirm-guarded, primary-on-accept (ruled at #304, re-ruling #300's single-call clause).** Both panel actions open the house `GuardedConfirm` before acting — "act where you see" became **"confirm where you see"**; the Submissions tab's contracts (accept-with-edit sheet, reject confirm, delete-any-status) are untouched. The reject dialog reuses the tab's strings verbatim; the accept dialog is new copy (D5). The accept dialog's confirm button takes the **primary fill** via a new optional `confirmVariant?: 'default' | 'destructive'` prop on `GuardedConfirm`, defaulting to `'destructive'` so every existing call site renders byte-identically — the polarity explicit: accept publishes = primary, reject destroys = destructive. The actions reuse the tab's pending-guarded mutations over the shared query (failure: dialog/row stays, toast, retry safe; badge + tab update together on success), with the pending vocabulary on every action (spinner takes the icon's place, `aria-busy`).

**D4 — Freshness + audience: the #288 seam, hoisted (ruled at #300).** The submissions query (`['admin', 'testimonial-submissions']` in the #288 factories) is hoisted to shell scope — the same query key, one shared cache entry, no extra fetches beyond the first — refreshed by window focus, navigation refetches, and the moderation mutations themselves; plus **refetch on panel-open** (invalidate when the popover opens) so the panel is always fresh when examined. The panel and the Submissions tab read the same key, so any accept/reject/delete anywhere updates both by construction. **60-second `refetchInterval` polling is the written-down escalation** (the Turnstile posture: adopt on evidence, not anticipation) — not built in v1.

**D5 — The copy pass (this spec is the ratifying record).** Three classes:

| String | Class | Value |
|---|---|---|
| Search hint line | ratified at #303 | `Type to search packages, branches, testimonials, gallery` |
| Search no-results | ratified at #303 | `No results for “{q}”.` |
| Search overflow tail | ratified at #303 | `+N more in {group}` |
| Search group headers | ruled at #302 | `Packages` / `Branches` / `Testimonials` / `Gallery` |
| Deactivated suffix | ruled at #302 | `Deactivated` |
| Panel empty line | on-disk verbatim (#216) | `No pending submissions.` |
| Reject dialog | on-disk verbatim (the tab's) | title `Reject this submission?` · description `The submission stays on record as rejected — nothing publishes, and the sender is never told.` |
| Busy labels | on-disk verbatim (save-contract) | `Accepting…` / `Rejecting…` |
| Bell accessible name | **new — drafted here** | `Notifications` at 0 · `Notifications, {n} pending submissions` at n > 0 |
| Bell tooltip (n > 0) | **new — drafted here** | `{n} pending submissions` |
| Panel header title | **new — drafted here** | `Pending submissions` + the count |
| Action hover hints | **new — drafted here** | `Accept` / `Reject` |
| Panel footer | **new — drafted here** | `Open Submissions` |
| Accept dialog | **new — drafted here** | title `Accept this submission?` · description `Accepting publishes it as a testimonial at the end of the list.` (the tab's accept-sheet clause as a new sentence) |

**D6 — Global Search posture: the inline dropdown (ruled at #302, picked at #303).** The topbar Input IS the typing surface; results drop from it in an anchored popover (`align='start'`, `sideOffset=8`, `w-[min(24rem,calc(100vw-1.5rem))]`); the page stays visible around results; no footer chrome (the kbd-hints bar died with the palette). Non-modal by construction. **⌘K and Ctrl+K both bound** (one rule, no platform sniffing) — the shortcut focuses the Input and opens the dropdown. Below `sm`, where the Input is hidden by the house law, a magnifier-icon button in the topbar opens the same results as a **top sheet with its own input inside**, autofocused on open (`sm:hidden`-gated, same width law).

**D7 — The engine: fuse.js with cmdk headless (ruled at #301/#302, justified + reshaped at #303).** fuse.js (6.8 kB gzip) drives matching — weighted multi-key, identity > body (D8); exact weights are execution tuning pinned at the seam. **cmdk's built-in filter cannot serve this posture** — it only filters items driven by its own `Command.Input` inside the cmdk tree, and the dropdown types into the topbar, outside it (the prototype's structural finding). So the engine is a **hand-wired seam** (the prototype's fuse matcher is the shape) and cmdk runs as the **headless listbox core** (`shouldFilter={false}`) for keyboard roving + selection only. Dependencies land in `apps/admin` only (`cmdk` + `fuse.js`); #302's "pull `shadcn add command` into `packages/ui`" is reshaped dead by #303 — nothing consumes a shared command wrapper, and the dropdown composes the already-shared `popover` + `input`. The cmdk-built-in-filter fallback stays *documented* (the zero-dep thin posture) but cannot serve the dropdown posture — recorded, never loaded in production. `useDeferredValue` keeps typing responsive.

**D8 — The index + searchable fields (ruled at #302).** The index builds from the #288-cached admin list queries — full unpaginated arrays, deactivated rows included — over a `useQueries`/cache-read composition at shell-topbar scope; a result can never disagree with the screen it lands on. Fields per entity (identity > body):

- **Packages:** `name` + `description` (body)
- **Branches:** `name` + `address` (body)
- **Testimonials:** `person` + `quote` (body)
- **Gallery photos:** `title` + `caption` (body) + **category name** (body-weight — a free client-side join over the separate cached categories query)

Excluded: slugs (system identifiers; only packages carry one), branch phone, frames/inclusions. Freshness inherits the #288 seam exactly (5-minute staleness + own-mutation invalidation — Warm Navigation's contract); no new fetches.

**D9 — Results anatomy, grouping, states (ruled at #302, ratified at #303).** Four fixed group headers, **5 per group** with an "+N more in {group}" tail. Zero query = one hint line, no browse-all (the sidebar already navigates); filtering from the first character (no min-length gate); no match = one muted no-results line. Item anatomy: entity icon (Package / MapPin / Quote / ImageIcon, muted), the identity line with the visible **Deactivated** suffix, a one-line truncated body snippet (gallery rows: `category · caption` — the ruled join, displayed), peso on package rows (unpriced = blank, ADR-0020), and the muted thumb slot on gallery rows (the #287 versioned thumb renders into it).

**D10 — Navigation: the `?focus=` deep-link law (ruled at #302).** A result lands on its entity's list screen with the row scrolled into view and highlighted — one uniform `?focus=<id>` mechanism across all four. Editors never auto-open: three of the four editors are local-state Sheets with no URL form, and packages' URL-native edit route stays one deliberate click away.

**D11 — Seating, ADR, charter (ruled at #299).** The effort seats as **M9 "Admin Notifications & Search"**; Handover renumbers to M10 — the fourth bounded renumber (after the M3, M7, and M8 seatings), justified by the delivery-versions rule that v1 hands over only once the polish milestones land. **ADR-0028** (written with this spec) records the notification model as the fulfillment of M7's ruling and the milestone seating. The `docs/plan.md` amendment — the new M9 section, the re-annotated Handover header, the amended v1-sequence line — lands with this ratified spec, per the M7/M8 house pattern. Estimated ticket split: the Notification (bell + panel + confirm guards incl. the `confirmVariant` port, 1), Global Search core (engine seam + dropdown + anatomy, 1), the narrow form + the `?focus=` deep-link across the four lists (1), verify (1) — 3–4 tickets plus the exit gate, comfortably a milestone charter (already ruled at #299; execution tickets cut via the spec → tickets loop). The soft ceiling holds as an invariant: if execution finds itself adding API, schema, or migration work, that is a re-ruling to bring back to the owner, not drift.

## Testing Decisions

Good tests here pin externally observable contracts at lib seams, not component internals — the house plain-node admin pattern (no component/DOM tests).

- **The search seam (new):** index construction from cached-shaped arrays (the four entities + the category-name join), the identity > body weighting (weights as pinned constants), group capping + the "+N more" tail, deactivated marking, the `?focus=` URL builder, and the zero-query/no-results state selection. Prior art: the admin lib-seam floor (`cms-queries`, `gallery-thumbs`).
- **The notification seam (new):** the count → badge/aria-name mapper (cap 9+, hidden at 0, the accessible-name law), and the panel's confirm-state machine (one dialog at a time; accept/reject kind; pending wiring).
- **`GuardedConfirm.confirmVariant`:** the defaulted-prop contract pinned (default destructive; override primary) — the port's test debt from #304's one production-file touch.
- **Existing floors untouched:** zero api / api-client / types / landing test changes — the no-API-work invariant made visible by the diff.
- **Owner-reacted rendered variants per UI-bearing ticket** (#94 amendment): the bell/panel anatomy per #304's ruled Variant C, the dropdown per #303's ruled Variant B — light judged first, dark counterpart alongside.
- **Exit gate (operational, never `pnpm check` — ADR-0022):** a live-stack walkthrough — a public submission badges the bell from an unrelated screen; panel accept publishes at the end of render order (the #216 flow); search finds a deactivated row and lands focused on its list screen; both themes; `pnpm check` green.

## v2 Fences

Named fences with graduation triggers — none built in v1; each graduates only by an owner ruling:

- **Appointments notifications** — arrive with v2's booking milestone (the appointments dashboard is v2's payload; the bell's source widens then, and with it the panel's content question re-opens).
- **The email channel** — staff email notifications ride #222's Resend infra + the ADR-0021 topology (the guarded internal send endpoint over the service binding); out of scope here beyond this fence.
- **The stored inbox** (per-staff rows, read state, dismiss) — deferred with named triggers (ADR-0028): a genuinely per-staff/event-shaped source arriving (v2's email channel, addressed alerts), or volume outrunning attention (M7's own escalation clause). Until either, the derived view is the model, not a stopgap.
- **Appointments / users / audit-log search** — v2-fence lines; the four CMS content entities are the v1 core.
- **Server-side search** (pg_trgm/FTS behind endpoints) — rejected for v1 at #301 (dozens of rows already client-held; per-keystroke Worker→Supabase latency re-fetching held data; a freshness paradox navigating into stale screens). Graduation triggers: gallery photos into the thousands, owner-demanded cross-entity ranking authority, or a too-big-to-prefetch entity entering scope.
- **60-second polling** — the written-down freshness escalation (adopt on evidence).
- **SMS** — never (PRD-parked beyond v2; ruled out at charting).

## Out of Scope

Per the map's Out of scope section, all owner-ruled at charting: SMS notifications (entirely); designing or building v2's appointments notifications + the email channel (v2's booking milestone owns them — this spec writes the fences only); landing/customer-facing notification surfaces (this effort is admin-only). Additionally: no API, schema, migration, `packages/types`, or `api-client` work of any kind (the soft ceiling, D11); no pagination/browse-all in search (the sidebar navigates); no new `packages/ui` primitives (the dropdown composes the shared `popover` + `input`; the `command` pull is dead, D7).

## Further Notes

- **The two prototype branches are the primary sources for the execution tickets** (throwaway, never merged — port values and rulings, don't cherry-pick): `prototype/bell-panel-variants` (local-only; plan + all three variants + the `GuardedConfirm` touch, variants A/B the losing anatomies) and `prototype/search-ux-variants` (local-only; plan + both postures + the engine axis, variant A the losing palette). Both cleared their gates at handover: typecheck 0, biome clean, admin suite green.
- **Glossary entries already landed** in `apps/admin/CONTEXT.md`: *Notification* (avoid: inbox, alert, message) and *Global Search* (avoid: command palette, omnibar, quick find).
- **v1-pick posture:** admin-only and additive — expected `PICK clean` across the board; per-PR triage per ADR-0015 still applies at merge time. The two new admin-local deps (`cmdk`, `fuse.js`) ride the pick.
- **Execution tickets** are cut next via the spec → tickets loop, native-blocked, after the map closes; this file is the canonical spec artifact (the `docs/specs` convention, per the M4/M8 precedent) and #305's resolution points here.
- ADR-0028 and the `docs/plan.md` seating amendment land in the same commit as this ratified spec.
