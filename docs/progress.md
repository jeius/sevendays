# Progress

_Last updated: 2026-09-02 (M1.5 exit gate verified; close-out landing on feat/m1.5-exit-verification. Prior: M1.4 real routes + integration tests merged via #11, 894d1c1; M1.3 provision/migrate/seed landed on feat/m1.3-provision-migrate-seed; M1.2 catalog schema landed on feat/m1.2-catalog-schema; 2026-08-30 toolchain consolidation.)_

## Current Milestone: 1 — Real Data Layer (complete — exit criteria verified live 2026-09-02; next up: Milestone 2 pre-flight, issue #1)

## Gate status (all verified live on 2026-08-30)

- `pnpm install --frozen-lockfile` — clean; lockfile consistent with all manifests.
- `pnpm check` (lint + format + typecheck + test) — 23/23 turbo tasks green.
- `pnpm test` — `apps/api` runs its vitest 4 suite for real (1/1); `landing`/`admin` still no-op by design.
- `pnpm build` — 5/5 green. Frontends emit `dist/` (TanStack Start 1.168 output layout: `dist/client`, `dist/server`, `dist/wrangler.json`); `apps/api` emits real `dist/` output via `tsconfig.build.json`.
- `pnpm dev` — all three apps boot together: api on 8787 (`/health` → 200), admin on 3000, landing on 3001 (Vite auto-increments when 3000 is taken). Exit criteria met: nothing provisioned in the cloud.
- `pnpm --filter @sevendays/landing start` / `admin start` — boot the built output (`node --import ./dist/server/instrument.server.mjs dist/server/index.js`).
- Initial commit pushed to GitHub ✅ (2026-08-29); check `git status` — recent tooling commits may still be local-only.

## Milestone 1 gate (verified live 2026-09-02 on feat/m1.5-exit-verification)

- **M1.5 exit verification (feat/m1.5-exit-verification):** the M1 gate executed live on 2026-09-02 against the
  deployed Worker (`https://sevendays-api.pahamajulius.workers.dev`). Appointment created via
  `POST /api/v1/appointments` (201, id `a93784e3-5296-4138-894e-f06da3fd96b8`; snapshots server-written: Service
  Package "Basic Package" ₱900.00 (`packagePriceCents` 90000, matches live catalog) + Add-on "Makeup" ₱120.00
  (`priceCents` 12000); kind scheduled, status pending, scheduledAt 2026-09-16T10:00+08:00). Row confirmed in
  Postgres via the new psql-equivalent probe (`packages/db/scripts/verify-appointment-row.mjs` — derived facts
  only), CONFIRM: PASS 15/15 checks (identity, Kind, Status, FKs, package price snapshot, scheduledAt, notes,
  add-on join rows with per-row snapshots). Worker redeployed (user-run, Cloudflare version 56c4018d → 5714379c,
  same URL) and the row re-confirmed 15/15 unchanged + read back through the public list (`GET
  /api/v1/appointments`, 200, verification row at position 0, newest-first, identical snapshots). Negative
  controls proved the uniform error shape on the final artifact (unknown servicePackageId → 400
  `Unknown servicePackageId.`; malformed payload → 400 `Invalid request payload.` + `details` with 6 per-issue
  entries). Verification row is deleted after this close-out lands (single-row, flag-gated probe delete + absence
  re-assert, per Q3=A). Deploy history: two deploy blockers found + fixed on this branch — (a) `3e67059` the db
  package root barrel re-exported the test-only migrator into the Worker bundle (`migrate.js` evaluated
  `import.meta.url` at module init, which workerd rejects — Cloudflare validation 10021; every deploy of main was
  failing); (b) `369d4c8` the API memoized its postgres.js client per isolate, but workerd scopes I/O objects to
  the creating request ("Cannot perform I/O on behalf of a different request"), so every request after the first
  per isolate 500ed in ~0ms — now one client per request. Both were caught by this gate; integration tests could
  not catch either (Node env vs workerd). `DATABASE_URL` was already a Worker secret (2026-09-01 secret change) —
  secret gap closed by observation.

## What Exists

- **M1.5 exit verification (feat/m1.5-exit-verification):** the M1 gate ran live on 2026-09-02 against the
  deployed Worker. Probe tooling: `packages/db/scripts/verify-appointment-row.mjs` (psql-equivalent
  confirm/delete/absent modes, derived facts only, expectations read from the saved POST response — asserts the
  API wrote what it returned) + compose rehearsal fixture + 4 guarded vitest proofs. Two deploy blockers found
  and fixed (see the Milestone 1 gate block above): `3e67059` (test-only migrator leaked into the Worker bundle —
  workerd rejected `import.meta.url` at module init, validation 10021) and `369d4c8` (per-isolate memoized
  postgres.js client broke on workerd's request-scoped I/O — now one client per request). Milestone 1 exit
  criteria met: an API-created row is confirmed in Postgres and survives a redeploy; `pnpm check` green.

- **M1.4 real routes + integration tests (merged via #11, 894d1c1):** API rewritten as thin route handlers over service modules, mounted under **`/api/v1`** (ADR-0010 URL-prefix versioning; `/health` stays top-level). Branch list, Service Package catalog (server-resolved lookups — `printSize` {id,code,description} | null, ordered `attires`, `frames` array — active-only packages), active Add-on Services. `POST /api/v1/appointments` persists with server-written price snapshots, rejects unresolvable refs (400 per-entity messages) and inactive package/add-on refs, returns 201 with embedded add-on entries; `GET /api/v1/appointments` lists newest-first, capped at 200, Branch-filtered. One uniform error shape (`apiErrorSchema` in packages/types, pulled forward from the M2 pre-flight; `validated()` hook in apps/api turns Zod failures into it — never raw zValidator). Integration tests per ADR-0008: compose postgres:17 locally, CI service container, migrations in vitest global setup via the db package's new `./migrate` subpath export (`migrateDatabase`), fail-loud on unreachable, serial files + truncate-between-tests, minimal hand-written fixtures (compose never catalog-seeded). 21 integration tests green on real Postgres. New packages/db test harness (own vitest config per ADR-0003). Supabase provisioned; migration `0000_known_professor_monster.sql` applied over the session-mode pooler with 7 FK indexes + 3 natural keys folded in per the M1.2-review ruling (no migration #2). `db:seed` is a re-runnable natural-key upsert — identical runs proven pre- and post-restructure (3× before the frame/attire wave, 2× after); `db:verify-seed` psql-equivalent verification PASSED, all 11 packages line-for-line against `docs/catalog.md`. Tooling: `scripts/check-env.mjs` env gate (prints ports only, never secrets) + `scripts/db-state.mjs` probe. Branch phones are `TODO(seed)` placeholders pending the client's real numbers; the 8R/8x10 merge confirmation is still open at seed review. Seed/verify ride `DATABASE_MIGRATE_URL` (session-mode) — refines ADR-0007's pooled-URL line. Frame grouping and attire normalization landed on top (revised ADR-0009, migration `0001_nice_firebrand`): a `frames` table seeds 23 frames across the 11 packages, `package_inclusions.frame_id` links framed pictures to frames, and the `package_inclusion_attires` junction replaces combined-name attire rows with atomic attires (Toga, Filipiniana, Executive, Uniform).

- **M1.2 catalog schema (merged via #9):** packages/types gains Print size, Attire, PackageInclusion (plain object with a `kind` enum — deliberately not `z.discriminatedUnion`, all three kinds share one field set), AddonService schemas with a real vitest harness (24+1 tests; per-workspace config per ADR-0003). `appointmentSchema` gains `kind` (default `scheduled`) + `packagePriceCents` (server-written); `createAppointmentSchema` gains `addonServiceIds` (default `[]`, duplicate-rejecting refine) and `notes` optional (Task 4 ruling, recorded in the plan + commit 6ac3921); `servicePackageSchema.durationMinutes` nullable + `servicePackageWithInclusionsSchema` read shape. packages/db mirrors everything: `print_sizes`/`attires`/`package_inclusions`/`addon_services` tables, `appointment_addon_services` unique-pair join with price snapshot, `appointment_kind` enum, relations for the with-inclusions read. First migration `0000_known_professor_monster.sql` (regenerated at M1.3 with the FK indexes + natural keys; never applied under its M1.2 name — see ADR-0007's session-pooler refinement) + reviewed against `docs/catalog.md`. ADR-0009 records normalized catalog lookups. Generated migrations are Biome-excluded (`!!migrations` in packages/db/biome.json).

- Monorepo structure (`apps/`, `packages/`) with pnpm 11 + Turborepo. `engines` requires **Node >= 24** (raised from >=20 on 2026-08-30).
- Toolchain: TypeScript `^6.0.3` in every manifest; Biome `2.5.11` (exact, root devDep); tiered Biome per ADR-0002; per-workspace vitest configs per ADR-0003. `pnpm check` includes format; `pnpm fix` / `pnpm fix:unsafe` for lint+format fixes.
- `packages/config`: exports `ts/{base,node,react,vite}.json`, `biome/{base,vite,node,worker}.json`, and a **built** `@sevendays/config/vitest` (now emitting `.d.ts` too). Fresh clones must run `pnpm build:packages` before `pnpm check` (dist/ is gitignored).
- `packages/types`: Zod **v4** schemas (`^4.5.1`, declared as devDep + peerDep) for `Branch`, `ServicePackage`, `Appointment` — stable, extend rather than replace. Upgraded from v3 workspace-wide on 2026-08-30.
- `packages/db`: Drizzle schema for the same 3 entities (`drizzle-orm ^0.45.2`) + `createDbClient()` factory. M1.3 applied migration 0000 to the live Supabase database and seeded the catalog; `drizzle.config.ts` reads `DATABASE_MIGRATE_URL` (session-mode pooler) first. `db:push` script added; `tsconfig.build.json` emits `dist/`.
- `packages/ui`: **tokens-only** — `src/globals.css` shadcn CSS variables. The v3-era JS `tailwind-preset.ts` was deleted on 2026-08-30: the apps are Tailwind v4 (CSS-first) and cannot consume a v3 preset. Apps style via `@theme` in their own `styles.css`.
- `apps/api`: Hono app with `/health` (real), `/api/branches` (one hardcoded fixture), `/api/appointments` (`POST` validates with Zod and echoes back — does not persist). Owns `vitest.config.ts` (node env, explicit include — required on vitest 4, see ADR-0003), `tsconfig.build.json` (emits `dist/`), and `worker-configuration.d.ts` included in both tsconfigs so the global `Env` resolves in every compile path.
- `apps/landing`, `apps/admin`: TanStack Start 1.168.49 + Vite 8 + React 19 + Tailwind v4 + Sentry/PostHog add-ons. Build/start scripts target `dist/` — the `.output/` paths the CLI generated were written for TanStack Start <1.141 and failed on this version. `routeTree.gen.ts` committed in its stable post-build state.
- Dependency refresh (2026-08-30): zod 4.5, vitest 4.1, wrangler 4.127, vite 8.2, `@cloudflare/vite-plugin` 1.54, `@cloudflare/workers-types` 5, drizzle-orm 0.45, drizzle-kit 0.31, tailwindcss 4.3, React 19.2, Sentry 10.72, posthog-js 1.42.

## Known Gaps / Not Yet Done

- **Branch phones are `TODO(seed)` placeholders** in `packages/db/scripts/catalog.ts` (`+63 900 000 00x`) — pending the client's real numbers; replace then re-run `db:seed`. The 8R/8x10 merge confirmation remains open at seed review.
- **M1.4 watch-items (from the frames + attire junction review, 2026-09-01):** (a) the create-shape `frameId` is optional — when the M1.4 routes write inclusions, the server must assign `frameId` (or a route-level rule must require it for `framed_picture`); the DB has no kind-aware CHECK to catch a null `frame_id` on a framed picture; (b) the `package_inclusion_attires` junction has no position column — verify's canonical re-sort covers rendering order for now, but if M2's UI needs persisted per-inclusion attire order, that means an ordinal column (a later migration). **M1.4 status:** (a) moot for now — M1.4's API writes no inclusions (read-only catalog + appointment writes); (b) confirmed live: the add-on stitch query pins order via `created_at` (append-only proxy) and the same will apply to attire rendering if M2 needs persisted order.
- **8R/8x10 description text now surfaces publicly** — the Print size description carries the seed's client-confirmation note ("both appear in the price list; client to confirm whether they merge") and M1.4's catalog endpoint serves it verbatim. Client confirmation owed before the M2 landing pages go live.
- **`GET /api/v1/appointments` is public until M4** — the list returns customer names/emails/phones with no auth (Q9=A decision: pre-production only, no domains until M6; M4's BetterAuth closes this).
- **log-before-500 is now load-bearing for M2:** deploy blocker #2 (`369d4c8`, per-isolate db client) was invisible in production until `wrangler tail` + temporary instrumentation surfaced it — the route's catch swallows the error before returning 500. Before M2's api-client work lands, ensure the error path logs before the 500 (and that logging survives workerd's request-scoped I/O).
- **Per-request db client cost is fine at current volume** — one postgres.js client per request (the `369d4c8` fix) is acceptable now; revisit Hyperdrive only if M2 booking volume warrants it.
- The previous project's tables (Payload CMS) were removed from the shared Supabase project under user authorization — public now holds exactly the 10 tables (8 from 0000 + `frames` + `package_inclusion_attires` from 0001). The M4 BetterAuth naming note no longer applies: the old `users`/`sessions` tables are gone, so BetterAuth's table names won't collide.

- No auth anywhere yet (BetterAuth not integrated) — Milestone 4.
- CORS on `apps/api` is wide open (`origin: "*"` in `src/index.ts`) — must be locked down before Milestone 6.
- Logging is Hono's `logger()` middleware, not the planned Loglayer + Pino — Milestone 6.
- Root `.env.example` documents the database URLs (M1 pre-flight); the apps' dev scripts still read `.env.local` (gitignored) for app-level vars — per-app examples land with M2.
- turbo.json passes through `DATABASE_URL` + `DATABASE_MIGRATE_URL` (M1 pre-flight, ADR-0007); `drizzle.config.ts` reads `DATABASE_MIGRATE_URL` first (fallback `DATABASE_URL`) — seed/verify ride the session-mode connection (ADR-0007). `TEST_DATABASE_URL` is also passed through (M1.4) for the integration-test harness (compose default locally, CI sets it at job level).

## Immediate Next Steps (in order)

1. Push local commits (`git status` to see how many; `git push`) on `feat/m1.5-exit-verification` and open the PR that closes #7 and #2 (M1.5 close-out: roadmap ticked, gate narrated, probe tooling committed; `pnpm check` + `pnpm build` green on HEAD). After merge, tick the acceptance boxes on #7.
2. Then **Milestone 2** pre-flight (#1) — shared API client (`@sevendays/api-client`), `API_URL` env wiring, React Query SSR in landing + admin. Checklist lives in `docs/plan.md`; spec in `docs/specs/2026-08-30-m2-preflight-api-client-spec.md`.

## Notes for Future Sessions

- If you're picking this up cold: read `AGENTS.md` first, then this file, then `docs/plan.md` for the current milestone's task list. Don't assume the DB or auth state — check "Known Gaps" first.
- Fresh clone: `pnpm install` → `pnpm build:packages` → anything else (the vitest config entry is built, not source).
- Vitest gotcha (ADR-0003): every workspace with tests needs its own `vitest.config.ts`. Vitest 4 does not reliably discover a workspace's tests from the root config alone, and the shared `passWithNoTests` turns a miss into a silent green. After any vitest upgrade, run the workspace's tests directly and confirm the suite count is >0.
- TanStack Start output: v1.168 emits `dist/` (`client/`, `server/`, `wrangler.json`), not the older `.output/`. Do not reintroduce `.output/` paths in scripts.
- If you're an agent picking this up cold: read `AGENTS.md` first, then this file, then `docs/plan.md` for the current milestone's task list. Don't assume the DB or auth work — check "Known Gaps" above first.
