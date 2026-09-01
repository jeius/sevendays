# Database connection topology

The runtime Worker cannot open raw TCP, so it must go through Supabase's transaction pooler (Supavisor, port 6543) — but drizzle-kit's `migrate` takes session-level advisory locks that break under transaction pooling, and the plain direct host (`db.<ref>.supabase.co`) is IPv6-only, unreachable from IPv4-only dev machines. We keep two connection strings under two names: `DATABASE_URL` is the pooled connection, used by the deployed `apps/api` Worker (`wrangler secret put DATABASE_URL`), by local `wrangler dev` via its gitignored `.dev.vars`; `DATABASE_MIGRATE_URL` is the **session-mode pooler** connection (port 5432 — same session semantics as the direct connection, IPv4-reachable), used by drizzle-kit (`db:generate` / `db:migrate` / `db:studio`) and by the seed/verify scripts from `packages/db/.env` (fallback `DATABASE_URL`; both reach the same database). The postgres client keeps `prepare: false`, which transaction pooling requires.

## Consequences

- Local dev runs against the remote Supabase project. The free tier pauses projects after ~1 week of inactivity — when local dev or the API suddenly can't connect, revive the project from the Supabase dashboard.
- Connection strings contain the database password: the operator pastes them into gitignored files and Worker secrets; they never enter chat, tickets, or the repo.
