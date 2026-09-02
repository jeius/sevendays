# Database connection topology

**Amended:** 2026-09-02 — explicit transactions verified live over the transaction-mode pooler (Seam 3 probe of the intake-deepening spec, issue #13): manual BEGIN/ROLLBACK and postgres.js `sql.begin` rollback + commit legs all PASS on the port-6543 URL the deployed Worker uses. The appointment-intake write (and M3's later capacity check-then-insert) may run one module-internal transaction per request. `prepare: false` remains the hard requirement.

The runtime Worker cannot open raw TCP, so it must go through Supabase's transaction pooler (Supavisor, port 6543) — but drizzle-kit's `migrate` takes session-level advisory locks that break under transaction pooling, and the plain direct host (`db.<ref>.supabase.co`) is IPv6-only, unreachable from IPv4-only dev machines. We keep two connection strings under two names: `DATABASE_URL` is the pooled connection, used by the deployed `apps/api` Worker (`wrangler secret put DATABASE_URL`), by local `wrangler dev` via its gitignored `.dev.vars`; `DATABASE_MIGRATE_URL` is the **session-mode pooler** connection (port 5432 — same session semantics as the direct connection, IPv4-reachable), used by drizzle-kit (`db:generate` / `db:migrate` / `db:studio`) and by the seed/verify scripts from `packages/db/.env` (fallback `DATABASE_URL`; both reach the same database). The postgres client keeps `prepare: false`, which transaction pooling requires.

## Consequences

- Explicit transactions over the transaction-mode pooler are verified working (2026-09-02 probe: rollback + commit legs PASS; derived-facts output only). Under transaction pooling a transaction pins one pooled connection for its duration — keep statements per transaction small (the intake path is five), and `prepare: false` is still required.
- Local dev runs against the remote Supabase project. The free tier pauses projects after ~1 week of inactivity — when local dev or the API suddenly can't connect, revive the project from the Supabase dashboard.
- Connection strings contain the database password: the operator pastes them into gitignored files and Worker secrets; they never enter chat, tickets, or the repo.
