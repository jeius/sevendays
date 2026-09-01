# Progress

_Last updated: 2026-09-01 (M1.3 provision/migrate/seed landed on feat/m1.3-provision-migrate-seed — live schema applied, catalog seeded + verified, seed/verify tooling committed; awaiting push/PR. Prior: M1.2 catalog schema landed on feat/m1.2-catalog-schema; 2026-08-30 toolchain consolidation.)_

## Current Milestone: 1 — Real Data Layer (next up; Milestone 0 exit criteria verified 2026-08-30)

## Gate status (all verified live on 2026-08-30)

- `pnpm install --frozen-lockfile` — clean; lockfile consistent with all manifests.
- `pnpm check` (lint + format + typecheck + test) — 23/23 turbo tasks green.
- `pnpm test` — `apps/api` runs its vitest 4 suite for real (1/1); `landing`/`admin` still no-op by design.
- `pnpm build` — 5/5 green. Frontends emit `dist/` (TanStack Start 1.168 output layout: `dist/client`, `dist/server`, `dist/wrangler.json`); `apps/api` emits real `dist/` output via `tsconfig.build.json`.
- `pnpm dev` — all three apps boot together: api on 8787 (`/health` → 200), admin on 3000, landing on 3001 (Vite auto-increments when 3000 is taken). Exit criteria met: nothing provisioned in the cloud.
- `pnpm --filter @sevendays/landing start` / `admin start` — boot the built output (`node --import ./dist/server/instrument.server.mjs dist/server/index.js`).
- Initial commit pushed to GitHub ✅ (2026-08-29); check `git status` — recent tooling commits may still be local-only.

## What Exists

- **M1.3 provision/migrate/seed (on feat/m1.3-provision-migrate-seed, awaiting PR):** Supabase provisioned; migration `0000_known_professor_monster.sql` applied over the session-mode pooler with 7 FK indexes + 3 natural keys folded in per the M1.2-review ruling (no migration #2). `db:seed` is a re-runnable natural-key upsert — 3 identical runs proven; `db:verify-seed` psql-equivalent verification PASSED, all 11 packages line-for-line against `docs/catalog.md`. Tooling: `scripts/check-env.mjs` env gate (prints ports only, never secrets) + `scripts/db-state.mjs` probe. Branch phones are `TODO(seed)` placeholders pending the client's real numbers; the 8R/8x10 merge confirmation is still open at seed review. Seed/verify ride `DATABASE_MIGRATE_URL` (session-mode) — refines ADR-0007's pooled-URL line.

- **M1.2 catalog schema (merged via #9):** packages/types gains Print size, Attire, PackageInclusion (plain object with a `kind` enum — deliberately not `z.discriminatedUnion`, all three kinds share one field set), AddonService schemas with a real vitest harness (24+1 tests; per-workspace config per ADR-0003). `appointmentSchema` gains `kind` (default `scheduled`) + `packagePriceCents` (server-written); `createAppointmentSchema` gains `addonServiceIds` (default `[]`, duplicate-rejecting refine) and `notes` optional (Task 4 ruling, recorded in the plan + commit 6ac3921); `servicePackageSchema.durationMinutes` nullable + `servicePackageWithInclusionsSchema` read shape. packages/db mirrors everything: `print_sizes`/`attires`/`package_inclusions`/`addon_services` tables, `appointment_addon_services` unique-pair join with price snapshot, `appointment_kind` enum, relations for the with-inclusions read. First migration `0000_elite_dormammu.sql` generated (offline) + reviewed against `docs/catalog.md`. ADR-0009 records normalized catalog lookups. Generated migrations are Biome-excluded (`!!migrations` in packages/db/biome.json).

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
- The previous project's tables (Payload CMS) were removed from the shared Supabase project under user authorization — public now holds exactly the 8 sevendays tables. The M4 BetterAuth naming note no longer applies: the old `users`/`sessions` tables are gone, so BetterAuth's table names won't collide.

- No auth anywhere yet (BetterAuth not integrated) — Milestone 4.
- CORS on `apps/api` is wide open (`origin: "*"` in `src/index.ts`) — must be locked down before Milestone 6.
- Logging is Hono's `logger()` middleware, not the planned Loglayer + Pino — Milestone 6.
- Root `.env.example` documents the database URLs (M1 pre-flight); the apps' dev scripts still read `.env.local` (gitignored) for app-level vars — per-app examples land with M2.
- `turbo.json` passes through `DATABASE_URL` + `DATABASE_MIGRATE_URL` (M1 pre-flight, ADR-0007); `drizzle.config.ts` reads `DATABASE_MIGRATE_URL` first (fallback `DATABASE_URL`) — seed/verify ride the session-mode connection (ADR-0007).

## Immediate Next Steps (in order)

1. Push local commits (`git status` to see how many; `git push`) on `feat/m1.3-provision-migrate-seed` and open the PR that closes #5 (M1.3 code-complete: migration applied over the session-mode pooler, catalog seeded + verified, seed/verify tooling committed; `pnpm check` + `pnpm build` green on HEAD). After merge, tick the five acceptance boxes on #5.
2. Run `wrangler secret put DATABASE_URL` from `apps/api` (the pooled URL is in `apps/api/.dev.vars`; never paste the value into chat).
3. Then **Milestone 1** continues: M1.4 real routes + integration tests (#6) → M1.5 exit verification (#7). Checklist lives in `docs/plan.md`; spec in `docs/specs/2026-08-30-m1-real-data-layer-spec.md`.

## Notes for Future Sessions

- Fresh clone: `pnpm install` → `pnpm build:packages` → anything else (the vitest config entry is built, not source).
- Vitest gotcha (ADR-0003): every workspace with tests needs its own `vitest.config.ts`. Vitest 4 does not reliably discover a workspace's tests from the root config alone, and the shared `passWithNoTests` turns a miss into a silent green. After any vitest upgrade, run the workspace's tests directly and confirm the suite count is >0.
- TanStack Start output: v1.168 emits `dist/` (`client/`, `server/`, `wrangler.json`), not the older `.output/`. Do not reintroduce `.output/` paths in scripts.
- If you're an agent picking this up cold: read `AGENTS.md` first, then this file, then `docs/plan.md` for the current milestone's task list. Don't assume the DB or auth work — check "Known Gaps" above first.
