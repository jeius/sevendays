# ADR-0008: Integration tests against real Postgres

**Status:** Accepted
**Date:** 2026-09-01

## Context

Milestone 1's bug class was wrong column names — a Drizzle query built against a mistyped column compiles fine and only fails at the database. M1's seam ruling therefore fixed one seam: the composed Hono app's HTTP boundary. Mocks at the database boundary were rejected outright, because a mocked query builder cannot catch a wrong column name; it returns whatever the test scripted. That leaves two ways to exercise the seam: point the real app at a real Postgres, or skip tests when no database is reachable. The live Supabase project is PostgreSQL 17 (verified 2026-09-01), which pins what the local test database must match.

## Decision

Integration tests run against **real Postgres**: the composed app (all routes mounted, real db handles) is called over its HTTP seam, and its queries hit a real database. Locally that database is a `docker compose` service (`compose.yaml`) — `postgres:17` matching live Supabase's major version, static db `sevendays_test`, `pg_isready` healthcheck. CI runs the same suite against a Postgres service container. Migrations are applied before tests in vitest's global setup: it pings first (`select 1`, short timeout) and **fails loud** if unreachable with an actionable message ("Start the compose db: `docker compose up -d db`"), then applies migrations programmatically via `packages/db`'s `migrateDatabase` subpath export (its own postgres-js client, `prepare: false`, closed in a `finally`). Tests never read the Supabase env — the api's `DATABASE_URL` is supplied explicitly per request, and `TEST_DATABASE_URL` points at the compose db. Test files run serially (`fileParallelism: false`), with a `truncateAll` between tests and a clean-slate truncate in setup. Fixtures are minimal and hand-written; the compose db is **never** catalog-seeded — seed fidelity stays proven by `db:verify-seed` against the live db.

## Alternatives Considered

- **Mocked db / query builder** — rejected: a mock returns whatever the test scripts, so it cannot catch a wrong column name — precisely M1's bug class. It would let the suite go green against a shape the real database rejects.
- **Skipped-when-unreachable suites** (skip tests if no db, pass otherwise) — rejected: the miss degrades to a silent green, the exact shape ADR-0003 warns about. Failing loud on an unreachable db keeps the suite honest.
- **External CI migrate step** (separate `migrate` job in the pipeline) — rejected: local and CI would drift apart, and it is a step developers forget. The programmatic `migrateDatabase` export makes local and CI one self-contained path through the same code.

## Consequences

- The compose volume is tests-only — no catalog seed ever lands in it.
- Any new table must join the `truncateAll` list, or tests leak state between files. **(_Superseded 2026-09-04:_ candidate C (#19) made `apps/api/test/helpers/truncate.ts` derive the table list from the schema barrel via `is(v, PgTable)` + `getTableConfig`, so new tables are truncated automatically — this consequence now only applies if a table lives outside the default schema.)**
- Suites get slower as they grow (real round-trips to Postgres); accepted at this size.
- After a manifest edit (new devDependency, etc.), workers must run `pnpm install` or the test run breaks against stale deps — the lockfile-drift lesson from this run.

---
