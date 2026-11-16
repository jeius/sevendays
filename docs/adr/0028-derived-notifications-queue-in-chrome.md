# ADR-0028: Notifications are a derived view — the queue stays the notification

**Status:** Accepted
**Date:** 2026-11-16

## Context

M7 ruled, when it built the public testimonial form: "**No notifications — the queue is the notification**" (spec § Public testimonial form + Out of Scope: "the queue is the notification; revisit only if volume outruns attention"). That ruling declined notification *machinery* — no table, no channel, no per-staff state — but it left the queue invisible outside its own tab: the admin top bar's bell (drawn inert by the M3 shell) badges nothing, and a pending submission waits silently until someone visits the Testimonials screen.

The notifications & search wayfinder map (#298) took the model as its first decision ticket. The fork was *work queue* vs *inbox*: a derived view over the pending submissions (badge = count, panel = the submissions themselves), or a stored `notifications` entity with per-staff rows and read state. The stored entity's genuine advantage — per-staff read state, so each staff member sees only what *they* haven't handled — was weighed against what it costs: a new table and write path for events that are already fully represented by one query over `testimonial_submissions`, plus a second thing to manage (dismiss, mark-read) beside the moderation queue it mirrors. The owner ruled the derived view (ticket #300, 2026-11-15, "all as recommended" both rounds); the anatomy and the confirm-guarded action contract were then ruled through the rendered variants (ticket #304).

## Decision

The admin's Notification is a **derived view over the pending-submissions queue**: the badge count is the pending count (`status = 'pending'`), the panel lists the submissions themselves with confirm-guarded Accept/Reject reusing the Submissions tab's mutations, and an item leaves only by moderation. No `notifications` table, no per-staff read state, no dismiss or mark-read — those absences are the model, not gaps. All staff share one truth (the count is global, not per-person); freshness rides the existing CMS query seam (5-minute staleness, own-mutation invalidation) plus a refetch on panel-open, and 60-second polling is a written-down escalation, not v1 behavior.

This **affirms and extends** M7's ruling rather than reversing it: the derived bell fulfills "the queue is the notification" by making the thing M7 called the notification visible from every screen — nothing M7 declined was built. The effort seats as its own milestone, **M9 "Admin Notifications & Search"** (Handover renumbers to M10 — the fourth bounded renumber), under a soft ceiling of client-side + derived-over-existing-reads only; that seating rides this ADR per the map's destination.

## Alternatives Considered

- **A stored notifications entity (per-staff rows, read state, dismiss)** — genuinely weighed and declined at #300. It buys per-staff triage visibility at the cost of a second representation of the same events, a write path, and inbox management mechanics beside the queue. Deferred, not dead: it enters the day a genuinely per-staff, event-shaped source arrives (v2's email channel, addressed alerts) or volume outruns attention — M7's own escalation clause. Graduation triggers recorded in the M9 spec's v2 Fences.
- **Email/push channels now** — SMS is out entirely (PRD-parked beyond v2); the email channel is fenced to v2, riding the ADR-0021 topology (the Resend infra and guarded internal send endpoint).
- **Badge-only (no panel) or panel without actions** — the ruled badge + panel with confirm-guarded actions came through the #304 rendered variants; "act where you see" was re-ruled to "confirm where you see."

## Consequences

- The bell is backed by no rows — surprising without this record; future contributors reaching for a notifications table will find this ADR instead.
- Moderation is all-staff by construction: the count and panel are shared, so two staff members see the same pending work (matching the Submissions tab's existing all-staff gate). Per-staff views arrive only with the stored-entity graduation.
- Freshness is bounded by the shared query seam: a submission submitted elsewhere becomes visible within the seam's contract (window focus, navigation refetch, panel-open refetch) — not instantly. The escalation is pre-ruled (60-second polling), adopted on evidence.
- Zero server surface: no API, schema, or migration work — the milestone stays admin-app-local, and the soft ceiling is an invariant (server work would be a re-ruling, not drift).
- The inbox model stays documented in the M9 spec's v2 Fences with its named triggers, so graduating to it is a deliberate act.
