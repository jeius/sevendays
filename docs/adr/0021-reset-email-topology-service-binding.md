# ADR-0021: Reset emails — a second email class over the API's Resend seam, via the service binding

**Status:** Accepted — extends ADR-0014; records the M4 email-exclusion reversal and the v1 env-shed amendment
**Date:** 2026-10-02

## Context

M4 ruled the admin Worker email-free: no email flows in the admin app, `RESEND_API_KEY` lives only on the API, and staff password resets were owner-operated CLI work (`docs/staff-provisioning.md`). The owner's 2026-09-30/10-02 rulings (maturation map #158, tickets #160 + its Site-tab amendment) reverse the flow but not the topology: staff get **self-serve forgot-password** (BetterAuth 1.7's `requestPasswordReset` token flow on `/login`), and Settings grows the owner-only Users tab — but the admin Worker still must not hold a Resend key (one email implementation; the key lives only on the API). BetterAuth's `sendResetPassword` callback must therefore cross from the admin Worker to the API. The two Workers already have the transport: the `API` service binding (ADR-0016). The token URL BetterAuth builds comes from the admin's own `BETTER_AUTH_URL` — no new origin env.

Meanwhile the Resend sender is still the sandbox `onboarding@resend.dev` (ADR-0014); a production reset email needs the verified sending domain, which the delivery-versions plan had parked under v2's booking-specific hardening. The reset flow pulls it forward: this milestone verifies the domain (it seats after M6 ships the client's custom domains, so the DNS groundwork exists), and with it the email pair (`RESEND_API_KEY`, `LANDING_ORIGIN`) returns to **v1's** API env — the env-shed ADR-0015/#76 established sheds the pair for booking-confirmations only; a reset email is auth machinery, present on both editions.

## Decision

**One email class per purpose, one sender implementation, on the API.** The admin's `sendResetPassword` forwards `{ to, url }` over the existing `API` service binding to a small internal send endpoint on the API Worker, which reuses the live Resend seam (SDK, typed `{ data, error }` failure, log-only catch — the ADR-0014 posture). The reset email is synchronous-request-scoped (the user clicked "send reset link"; a silent failure is a support ticket), unlike ADR-0014's waitUntil fire-and-forget — the endpoint returns the Resend result and the admin surfaces a generic success either way (anti-enumeration: the reset request answers identically whether or not the email exists). Sender local part `no-reply@` on the verified domain (`bookings@` stays reserved for booking confirmations). `revokeSessionsOnPasswordReset: true` stays configured — a completed reset kills every session, matching the CLI cascade.

**The sending domain verifies in this milestone**, ahead of v2: domain verification (DKIM etc.) plus the end-to-end inbox check for the reset email; booking confirmations re-verify on the same domain at v2. The email pair returns to v1's API env as part of this work — the v1-picks classification for the `env.ts` shed hunks flips to include them, and the absence audit's email-pair tokens retire from the inventory (their purpose — keeping booking-email content out of `v1` — remains covered by the booking-route/module tokens; `confirmation-email` and the booking endpoints stay absent and stay tokenized).

## Alternatives Considered

- **Resend key on the admin Worker** — rejected: two email implementations and the key on a second Worker, for one low-volume email; M4's "admin stays Resend-free" posture survives the reversal of its "no email flows" line.
- **The admin sends via `fetch` to Resend directly over the public internet** — rejected: the Workers subrequest block that birthed ADR-0016 applies; the service binding is the sanctioned Worker→Worker transport and already exists.
- **No emailed reset: owner-operated resets only (the M4 status quo)** — reversed by the owner: routine user operations delegate to the client-side owner (Users tab), and staff shouldn't need the owner (or the CLI) for their own password.
- **Keep the sandbox sender until v2** — rejected: a production auth email from `onboarding@resend.dev` is a phishing tell; the domain work is small and unblocks real deliverability for both editions' reset flows at once.

## Consequences

- The API gains its second email consumer (reset) with its own failure posture — the seam stays one (SDK + key on the API), the send policies differ per class and are documented at the endpoint.
- v1's `env.ts` un-sheds the email pair; the pick-runbook's conflict-policy line ("the appointments/email entries never return") amends to "the appointments entries never return; the email pair returns with M7"; the audit token list drops the two email tokens when that pick lands (a ruleset amendment recorded in `scripts/seed-v1/` + `scripts/audit-v1-absence.mjs`, both main-only).
- `docs/staff-provisioning.md` demotes to bootstrap + break-glass (create-first-owner, owner lockout recovery); routine creates/resets/bans move to the Users tab. Ruling #75 stands — the dev remains v1's operator for deploys, secrets, and migrations.
- The internal send endpoint is service-binding-only (unauthenticated from the public internet's perspective, reachable only from the two frontend Workers) — its exact route shape is M7 spec payload.
