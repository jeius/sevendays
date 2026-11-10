# ADR-0024: Hyperdrive fronts Supavisor

**Status:** Accepted
**Date:** 2026-11-10

## Context

On 2026-11-09 the free-plan CPU limit was killing the API Worker mid-request — every landing route 500ed (kills observed live in `wrangler tail`). The chain starts at the per-request postgres dial (ADR-0011): each request pays a full TLS handshake to Supavisor. Measured outside the runtime (Node on a dev machine, not workerd): a fresh connect+query costs 7.3–12.4 ms CPU against the free plan's 10 ms cap, while a reused connection costs 0.3–0.8 ms. The workerd I/O-scoping law forbids the memoized-client escape, so the handshake cost had to move, not the client. The admin Worker's DB-touching server functions pay the same dial and carry the same exposure. That the dial is the whole cause is inference — the deploy tests it. Spec: issue #260; change: PR #261.

## Decision

**Hyperdrive fronts Supavisor.** Both Workers carry a `HYPERDRIVE` binding (config `sevendays-db`, id `ce6e772397454dbd9806219b83585f4a` — `[[hyperdrive]]` in `apps/api/wrangler.toml`, `"hyperdrive"` in `apps/admin/wrangler.jsonc`), so the per-request postgres dial is a local handoff instead of a full TLS handshake.

- **Query caching is disabled** on the config — read-your-writes: a CMS save must reach the next page load.
- **The per-request client stays.** ADR-0011's workerd I/O-scoping law is unchanged — only the dial moved: the API's `createApiDb` (and the admin's server functions, through `resolveDbUrl`) still build a fresh client per request, now fed the binding's connection string.
- **Origin = the transaction pooler (port 6543), the same URL the `DATABASE_URL` secret holds** — it keeps `prepare: false` and shares the 60-connection budget. This is reasoning, not vendor-doc-confirmed.
- **`DATABASE_URL` stays the CI-synced fallback.** Code prefers the binding and falls back to the URL, so local dev, vitest, and break-glass rollback (revert the PR, redeploy) keep working untouched; `DATABASE_MIGRATE_URL` (ADR-0007) is unaffected.

## Consequences

- The Hyperdrive free tier's command budget (~100k commands/day, daily reset) is a new ceiling on DB traffic — no Workers plan change.
- Hyperdrive is the dial path on both editions (v1 at pick, on its own config).
- Supavisor's degraded connect path is bypassed, not explained — why it slowed stays open.
