# ADR-0023: The observability data path — admin server functions own the analytics queries

**Status:** Accepted
**Date:** 2026-10-05

## Context

The M6 Analytics Dashboard (#177) draws on three source families, none of which is the studio's own data model: Cloudflare's GraphQL Analytics API (Workers + R2 datasets, one Analytics:Read token), PostHog's HogQL query API (a server-side personal key — the browser must never hold it), and live DB probes (latency, pooler census, size) over the existing `packages/db` client. ADR-0006 makes the shared api-client the only supported path from the frontends to **the API**, and the API is domain-pure around `/api/v1` — its env-shed discipline (ADR-0015/#76) keeps the v1 api Worker lean and single-purposed. Putting the queries on the API would mean platform tokens + a metrics route family on the Worker whose domain is catalog/appointments, serving exactly one consumer (the admin). Meanwhile the admin already owns TanStack Start server functions with a settled session-gate discipline (the CMS write fns are directly callable and gate themselves).

## Decision

**A dedicated metrics seam in `apps/admin`, as server functions.** The CF GraphQL client, the DB probes, and the PostHog HogQL fetch live admin-side, behind the seam's **own session gate** (the CMS write-fns discipline: server fns are callable directly, so they gate themselves). The API stays domain-pure — **no metrics routes join `/api/v1`** — and no platform token touches the API Worker. The credentials sit in the admin's environment (`CF_ANALYTICS_READ_TOKEN`, `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` — names pinned in the M6 spec).

This is legal under ADR-0006's own-server-functions clause: the shared client governs frontends→API traffic; the admin's server-side calls to third-party platforms are not that traffic, and never were (the landing's SSR reads already established server fns as an app-owned surface).

## Alternatives Considered

- **Metrics routes on the API** (`/api/v1/metrics…` or an admin-scoped sibling) — rejected: platform tokens and a query surface on the domain-pure Worker; a fourth concern in an env deliberately shed lean (ADR-0015); one consumer does not justify the route family.
- **Browser-side queries to the providers** — rejected: the PostHog personal key (and any token with it) in the browser, per-provider CORS surfaces, and no session gate — the exact posture the #176 CORS ruling just closed elsewhere.
- **A fourth metrics service/Worker** — rejected: the free-handover cost posture; three sources, one viewer, one screen.

## Consequences

- The admin Worker holds read-only platform credentials; its env grows the three pinned vars (both editions — dev-account values on main now, production values + the dedicated v1 PostHog project at ship per #177/#176).
- The seam is testable at the admin lib seams (plain-node, stubbed `fetch`): query shapes, widget munging, and the curated per-widget failure states — no browser needed for the data layer.
- Source discipline inherited unchanged from #174/#175: metrics are platform-derived (CF GraphQL, PostHog, DB probes); **Sentry stays capture-only** (its query API is Team-gated — the dashboard's Sentry widget is `sum.errors` + a console link-out, or nothing); **logs never feed the dashboard** (the Application Log is humans-only, and Workers Logs has no read API regardless).
- If a second consumer for these sources ever appears (a landing-facing surface, say), promotion to a shared package or the API is reconsidered then — one consumer does not design for two.
