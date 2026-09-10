# ADR-0016: Frontends call the API through a service binding in deployed environments

**Status:** Accepted
**Date:** 2026-09-11

## Context

The landing and admin server functions call the API over HTTP through `@sevendays/api-client` with a base URL (ADR-0006): `createApiClient({ baseUrl: getApiUrl(), fetch? })`, where `API_URL` is a fail-loud runtime var. The first teaser deploy put all three Workers on `*.workers.dev`, and the first real merge to `main` found every data route 500ing while static routes served fine. Ground-truth probes (Cloudflare API bindings read, `wrangler tail` runtime logging, a throwaway probe Worker) pinned the cause: **Cloudflare rejects Worker→Worker subrequests over `*.workers.dev` (error 1042 — same-zone rule)**, so the API's public URL is unreachable from a sibling Worker precisely in production. Local dev and `vite preview` fetch over the real network (loopback or egress) and never exercise the restriction — which is why every local gate and CI run had passed.

## Decision

Each frontend's wrangler config carries a **service binding** — `"services": [{ "binding": "API", "service": "sevendays-api" }]` — and `api.server.ts` passes `binding.fetch` into the client's existing custom-fetch seam (`CreateApiClientOptions.fetch`, the `toLoopbackFetch` precedent). The binding is resolved from `cloudflare:workers`' `env` via a runtime-constructed dynamic import, so Node contexts (vite dev, vitest) fail the resolution silently and keep the `API_URL` network path unchanged; `getApiUrl` stays required and fail-loud — the binding replaces the *transport*, not the configuration. `nodejs_compat_populate_process_env` rides along in the configs so `process.env.API_URL` is populated in the production runtime (probed: vars populate with the flag, service bindings never do — hence the import path). Cherry-pick coupling: the binding's service name follows the worker names — the v1 seed's rename rules must point it at `sevendays-v1-api` (the deploy workflow's `--name` pins cover only the deploy commands, not config contents).

## Alternatives Considered

- **A custom domain / route for the API** — the standard 1042 workaround, but blocked pre-handover: the teaser has no domain, and per the handover mechanics (#75) the zone is born inside the dedicated account at ship-time.
- **Serving the frontends off workers.dev while the API sits on a non-workers.dev URL** — same objection: every deployment posture this repo has until the client's domain exists keeps all Workers on `*.workers.dev`, where the restriction applies.
- **Rewiring the api-client to a binding-native transport** — unnecessary: `options.fetch` is the designed seam and is already exercised by the loopback tests.

## Consequences

- Deployment targets must keep the binding's service name and the API worker's name in lockstep — on `main` and on the `v1` branch (after the seed's rename), and at the M6 dedicated-account rotation (worker names carry over, so the binding carries over).
- Dev, preview, and vitest are unaffected: no binding exists there, and the fallback path is the one they always used.
- The 1042 constraint is now written down where the next posture change (custom domains at handover) will meet it: once the API has a real domain, the binding remains valid and the URL path remains the documented fallback.
