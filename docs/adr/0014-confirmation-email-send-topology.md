# ADR-0014: Confirmation email — sent after the DB commit via waitUntil, deduped by idempotency key

**Status:** Accepted
**Date:** 2026-09-10

## Context

A booking must never fail because its email did (spec user story 28), and a retried request must never double-send to a customer (story 29). The API runs on Cloudflare Workers: there is no queue/cron infrastructure in M2, the response should not block on a third-party API, and `ctx.waitUntil` buys ~30s of post-response execution (~1 subrequest). The official Resend SDK runs on Workers (its `react` param does not — Node-only), and Resend stores idempotency keys for 24h: replaying one returns the original result instead of re-sending.

## Decision

After the intake transaction commits, the route schedules exactly one send: `c.executionCtx.waitUntil(...)` wrapping `sendConfirmationEmail`, which resolves the copy's names from the stored ids (the request's per-request db client stays valid past the response — ADR-0011), builds a pure template-literal HTML string (the builder input carries no price field — money-free by construction), and hands it to the Resend SDK with `idempotencyKey: booking-confirm/<appointmentId>`. The catch-and-log lives INSIDE the scheduled callback, so a failed send is logged (appointment id in the line) and the booking stands; the SDK's typed `{ data, error }` failure is checked, not try/catch'd. `RESEND_API_KEY` + `LANDING_ORIGIN` are required env with no fallback — a deploy missing either fails every `/api/v1` request loudly (the `API_URL` posture) instead of silently dropping emails. No retry, no outbox table in M2; the sender is the sandbox `onboarding@resend.dev` until the M6 domain swap (the `bookings@` local part is reserved).

## Alternatives Considered

- **Await the send before responding** — rejected: response latency becomes Resend's latency, and the email failure would have to fail (or lie about) a booking that already committed.
- **Send before the commit** — rejected: the email could describe a booking the transaction then rolls back.
- **Cloudflare Queues / Durable Objects for delivery + retry** — deferred: M2 volume is a rounding error against Resend's free tier; delivery infrastructure belongs to M6's production slice (real sending domain + the end-to-end inbox check), if retry semantics are ever wanted.
- **Raw `fetch` to `api.resend.com/emails`** — equivalent on Workers (the SDK is a thin fetch wrapper); the SDK won for the typed failure shape and the native `idempotencyKey` option.
- **An outbox table + poller** — deferred with Queues: the idempotency key is the only dedup M2 needs, and an outbox would add a write path to the intake transaction for no M2 benefit.

## Consequences

- A failed send is reconciled manually (the log line names the appointment id) until M6 adds real retry semantics — acceptable at volumes a human can read.
- Resend holds the dedup for 24h; a re-send of the same appointment after that window could double-send — the exposure is bounded by the no-retry ruling (M2 never re-sends deliberately).
- The email's facts are safe under catalog edits (names resolved from stored ids at send time); a branch-row edit between commit and send would surface, but the window is the same request's tail.
- Local/dev sends need the real key in `.dev.vars`; the sandbox delivers only to the account owner's address (403 for everyone else) — the M2 end-to-end proof books with that address (#48).
