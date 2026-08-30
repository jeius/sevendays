# ADR-0004: API verifies BetterAuth sessions via shared tables, not cookies

**Status:** Accepted
**Date:** 2026-08-30

## Context

BetterAuth will handle staff login on `apps/admin`, and `apps/api` must reject unauthenticated mutating requests (Milestone 4). The question is how `apps/api` — a separate Cloudflare Worker on a different domain from `apps/admin` — learns who's calling. `AGENTS.md` flagged "how auth sessions are shared across `landing`/`admin`/`api`" as a decision needing an ADR. Two forces are in tension: security/correctness of cross-origin credential sharing vs. operational simplicity on Workers, where configuring cookies across sibling domains is fiddly.

## Decision

BetterAuth's own tables live in `packages/db` (single shared Postgres). `apps/admin` runs BetterAuth server-side and creates sessions into those tables. `apps/api` verifies an incoming session **token** directly against those same tables (with expiry checked) — no shared cookie infrastructure, no session assertions between Workers. The landing site stays fully anonymous: customers never authenticate (PRD), so only admin→api traffic carries credentials.

## Alternatives Considered

- **Shared cookie on a common parent domain, each Worker running BetterAuth server-side** — rejected: puts all three apps on one registrable domain, requires careful cookie `Domain`/`Secure`/`SameSite` handling across Workers, and buys nothing for a product whose only authenticated actor is staff. Revisit if customer accounts ever land (they're explicitly deferred).

## Consequences

- `apps/api` gains a lightweight auth middleware doing one indexed DB lookup per mutating request; acceptable at this scale, but it couples api request latency to the DB (already true — every mutating route touches it anyway).
- BetterAuth's schema becomes load-bearing for two apps; regenerating it means a coordinated migration + deploy of both.
- If api and admin ever drift to different databases, this design breaks loudly — that's a feature.
