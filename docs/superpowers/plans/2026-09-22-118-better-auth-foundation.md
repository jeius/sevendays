# M4 Ticket 01 — BetterAuth Foundation (deps, auth schema, migration 0005, env posture) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The repo can build against BetterAuth 1.7.5 and the live database can hold auth state, before any auth behavior exists — deps in both apps, the config-pure auth factory (+ the CLI instance file it needs, see GC "The config-pair amendment"), BetterAuth's five tables generated into `packages/db` and applied as migration 0005 through the house flow, and the dev/deploy env posture (examples + workflow wiring) landed green and dormant-safe.

**Architecture:** Seven tasks: (1) the dependency pins, (2) the two-file auth config in `apps/admin` + `auth generate` + house adjustments into `packages/db`, (3) migration 0005 generated + applied + probed live, (4) the two dev env examples, (5) the deploy-workflow wiring for both editions, (6) the full gate + docs rotation + PR/merge with the teaser deploy watched, (7) the v1 pick + ledger row. Every generated artifact's expected content was verified against the real toolchain during planning (spike output pinned in Task 2; CLI source citations in Global Constraints).

**Tech Stack:** better-auth `^1.7.5` (npm `latest` verified 1.7.5 on 2026-09-22; v1.7 docs line — `better-auth.com/docs/llms.txt`), the `auth` CLI at the lockstepped `auth@1.7.5` via `pnpm dlx`, Drizzle ORM/Kit (house versions), pnpm + Turborepo, GitHub Actions + Wrangler, Supabase Postgres (live, shared by both editions), `gh` CLI.

**Spec:** Implements ticket [#118 "M4 ticket 01 — BetterAuth foundation: deps, auth schema, migration 0005, env posture"](https://github.com/jeius/sevendays/issues/118) (label `ready-for-agent`), whose parent is the M4 spec `docs/specs/2026-09-22-m4-admin-auth-spec.md` (issue #117 — § Version and packages, § The auth schema, § Environments and secrets are this ticket's sections). Key recon facts (2026-09-22, main `f3f712e`):

- **The CLI-factory finding (the one spec amendment this plan makes):** the spec's § The auth schema pins `auth generate --config apps/admin/src/lib/auth.ts`, assuming the CLI can read a factory file. It cannot. The 1.7.5 CLI's config loader (`auth` package dist, `getConfig` → `resolveAuthModule`) picks the auth instance as `m?.auth ?? m?.default?.auth ?? m?.default ?? mod` — it never *invokes* an exported factory — and then requires `.options` on the result, else it exits 1 with `Couldn't read your auth config in <path>. Make sure to default export your auth instance or to export as a variable named auth.` A factory-only `auth.ts` hands the CLI the raw module namespace (no `.options`) → hard fail. **Verified live by spike** (2026-09-22, /tmp): a config file exporting `const auth = createAuth(<url>)`, where `createAuth` lives in a sibling TS file importing `better-auth`, `better-auth/adapters/drizzle`, `better-auth/plugins`, `better-auth/tanstack-start`, and a workspace-style package with `dist/` exports (mimicking `@sevendays/db`) — loads and generates successfully through jiti. **Amendment:** `--config` points at a second, tiny file — `apps/admin/src/lib/auth.config.ts` — that exports the constructed instance; the factory file stays exactly the spec's § The admin auth server shape. The spec's config-purity constraint now applies to **both** files. Ticket #119's `create-staff` CLI and #121's verification instance inherit this shape.
- **Import paths verified against the 1.7.5 package exports map:** the drizzle adapter is `better-auth/adapters/drizzle` (NOT `drizzle-adapter` — the subpath is `./adapters/drizzle`, which maps to `dist/adapters/drizzle-adapter`); the TanStack Start cookie plugin is `better-auth/tanstack-start` exporting `tanstackStartCookies` (NOT `better-auth/tanstack`); `admin()` comes from `better-auth/plugins`. The `tanstack-start` module lazy-imports `@tanstack/react-start/server` only inside its hook (`await import(...)`, dist line 43), so constructing the instance in Node (CLI) is safe.
- **The generated schema is known exactly** (spike output, pinned verbatim in Task 2 Step 3): five tables — `user` (with the admin plugin's `role`, `banned`, `banReason`, `banExpires`), `session` (with `impersonatedBy`), `account`, `verification`, `rateLimit` (`key`/`count`/`lastRequest` — emitted because `rateLimit.storage === 'database'`, per `@better-auth/core`'s `getAuthTables`: `shouldAddRateLimitTable = options.rateLimit?.storage === "database"`) — plus three inline relation blocks. Model names are singular and the adapter matches them by exported const name (`schema[model]`), resolved from `config.schema || db._.fullSchema`; `createDbClient` attaches the full barrel as `fullSchema`, so the factory needs no explicit `schema` option **provided the barrel exports `user`/`session`/`account`/`verification`/`rateLimit` under exactly those names** (it will — those are the generated const names; no existing catalog export collides).
- **CLI invocation verified:** `pnpm dlx auth@1.7.5 generate --config <path> --output <path> --adapter drizzle --dialect pg -y` — `--dialect` is *required* with `--adapter drizzle` ("postgresql maps to 'pg'"), `-y` answers both the overwrite and the generate confirmation prompts (fully non-interactive; there is no dependency-install step). `--config`/`--output` resolve against cwd — run from the repo root. Generation loads dotenv (`.env`, `.env.local`) from cwd but needs no DATABASE_URL and no DB connection; expected non-fatal log lines are pinned in Task 2 Step 2 (a baseURL WARN and a pre-barrel "Drizzle schema mismatch — Missing tables" ERROR are both expected and harmless at generation time).
- **Repo state (live reads, 2026-09-22):** no `catalog:` convention in `pnpm-workspace.yaml` — cross-app deps pin the same range per manifest (e.g. `zod: ^4.5.1` in both apps) → `better-auth: ^1.7.5` goes in each manifest. `apps/admin/package.json` has NO `@sevendays/db` dependency today — the factory needs `createDbClient`, so admin gains `"@sevendays/db": "workspace:*"` in `dependencies`. `packages/db/src/schema/index.ts:1-14` is the alphabetical barrel, `:16-18` the stale TODO (names `betterauth-cli` — the command is `auth`); relations all live in `src/schema/relations.ts`. `packages/db/migrations/` ends at `0004_supreme_magdalene.sql` (journal idx 4) → next is 0005. The live Supabase DB (via `DATABASE_MIGRATE_URL` in gitignored `packages/db/.env`) currently exposes exactly 13 public tables (the catalog), no auth tables — migration 0005 is greenfield CREATE TABLE on empty tables, no backfill dance. `apps/admin/.env.example` today carries only `API_URL=`; `apps/api/.dev.vars.example` carries `DATABASE_URL`/`RESEND_API_KEY`/`LANDING_ORIGIN`. `.github/workflows/ci.yml` has two branch-keyed deploy legs (teaser on main, v1 on `v1`), each with an `env:` block (`CLOUDFLARE_API_TOKEN`/`DATABASE_URL`/`API_URL`), an api `DATABASE_URL` secret-sync step (the `if [ -z … ] exit 1` + `wrangler secret put` pattern), and admin deploys riding `--var "API_URL:$API_URL"`. Admin dev env is `.env.local` (the dev script's `dotenv -e .env.local`), admin port 3000. `process.env.X` with a loud no-fallback throw is the house env posture (`apps/admin/src/lib/api.server.ts:6-14`). wrangler accepts an empty `--var "BETTER_AUTH_URL:"` value (dry-run verified, exit 0) — the deploy legs land green even before the GitHub-environment vars exist.
- **Sibling fences (spec § Tickets; roadmap checkboxes in `docs/plan.md`'s M4 block):** #119 owns the `/api/auth/$` route, session server-fns, the `/api/auth/ok` probe, and the `create-staff` script + a real staff user — **not here**. #120 owns `/login` + the `_shell` gate — **not here**. #121 owns the api verification instance, `requireSession`, appointments gating, and the session-scoped client seam — **not here** (this ticket only installs the dep in `apps/api`; nothing imports it yet). #122 owns the live secret/var puts on all four targets, the live milestone gate, and the docs rotation beyond progress/plan (tech-stack Auth section, AGENTS.md auth-state flip, CONTEXT glossaries) — **not here**. Shared roadmap checkbox discipline: M4 checkbox 1 ("Foundation: …") is exactly this ticket's deliverables → ticked with a dated annotation in Task 6; M4 checkbox 3 ("Env + secrets posture: …") **spans this ticket's wiring and #122's live puts — it stays unticked until #122** (Task 6 leaves an explicit note). The plan.md checkbox text quotes the spec's original `--config apps/admin/src/lib/auth.ts` command; Task 6's annotation records the config-pair amendment rather than rewriting checkbox history.
- **v1-picks state:** the ledger (`docs/agents/v1-picks.md`) backlog is drained as of 2026-09-22 (rows 153–154 executed: `6aff692`, #115's `6ceee8f` → `8c133b6`), so this PR's squash is next in main order. Two newer main commits (`a221d2c` skills-docs, `f3f712e` M4 spec + tickets cut) have no ledger rows yet — Task 7 records their mechanical skip rows first if still unrowed at execution time (both are docs/specs/skills-only → main-only paths). Migration 0005 applies once to the shared Supabase database — the v1 pick carries the migration *files* but never re-runs `db:migrate`.

## Global Constraints

- **Branch & baseline:** `feat/118-better-auth-foundation` off main `f3f712e` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#118)` squash style; every commit below is pinned verbatim.
- **Gates (repo AGENTS.md, verbatim duties):** do not commit code that fails `pnpm check` (lint + format + typecheck + test; expected 35/35 turbo tasks — this ticket adds no test files or scripts, so the count is unchanged from the #101-recorded baseline). After any fresh clone, `pnpm build:packages` must precede `pnpm check` (the shared client resolves the API's built `dist/`; `packages/db`'s `dist/` is likewise gitignored — Task 2's barrel probe rebuilds it). Schema changes go through `pnpm --filter @sevendays/db db:generate` then `db:migrate`, requiring `DATABASE_MIGRATE_URL` in gitignored `packages/db/.env` (the session-mode pooler URL per ADR-0007); migrations are generated, never hand-edited. Tick checklist boxes with `- [✅]`, never `[x]`. Run `graphify update .` at close (code was modified). Evidence lands in gitignored `.superpowers/sdd/2026-09-22-118-better-auth-foundation/`.
- **Version pins (spec § Version and packages):** `better-auth: ^1.7.5` as a `dependencies` entry of BOTH `apps/admin` and `apps/api` — same range in each manifest, no catalog entry (the workspace has none for shared runtime deps); the lockfile must resolve 1.7.5 (npm `latest` = 1.7.5, verified 2026-09-22). Every BetterAuth doc consult during execution uses the **v1.7** line (`https://better-auth.com/docs/llms.txt`), never unversioned pages. The CLI is invoked only as `pnpm dlx auth@1.7.5 …` (version-pinned, never `@latest`).
- **The config-pair amendment (recon finding, binding):** `apps/admin/src/lib/auth.ts` exports ONLY the factory `createAuth` (per-request construction per ADR-0011 — the drizzle adapter captures the db instance, and the `database` option has no lazy-function form); `apps/admin/src/lib/auth.config.ts` is the CLI entry that exports the constructed `const auth` instance (the 1.7.5 CLI reads `.options` off an exported instance — it cannot invoke a factory). Nothing under `apps/admin/src/routes/`, no server fn, and nothing in the other apps may import `auth.config.ts` — it is a Node tooling surface (`auth generate`, and #119's `auth create-admin`). Both files stay config-pure: their import graph may contain only `better-auth` subpaths and `@sevendays/db` — no `import.meta.env`, no `server-only`, no bundler-hostile specifier (the CLI loads them via jiti outside any bundler).
- **Secrets (standing rule):** `BETTER_AUTH_SECRET`, `DATABASE_URL`, and every other secret stay out of committed files. The env-example edits add empty `KEY=` lines with comments only. No `wrangler secret put` happens in this ticket (#122 owns the live puts). The GitHub-environment `BETTER_AUTH_URL` *variables* (Task 5's optional pre-step) are non-secret deploy URLs.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/message block below lands verbatim in content; `pnpm fix` (biome check --write) then normalizes quoting/ordering/line-wrapping to house style — accept its rewrite, commit the result. The generated `packages/db/src/schema/auth.ts` is CLI output: the only hand-edits are (a) the provenance header, (b) deleting the three relation blocks (moved to `relations.ts`), (c) `pnpm fix` formatting. Never rename tables/columns (the adapter matches BetterAuth's singular model names — `user`, not `users`).
- **Scope fence (verbatim):** Tasks 1–5 edit only: `apps/admin/package.json`, `apps/api/package.json`, `pnpm-lock.yaml` (via install), `apps/admin/src/lib/auth.ts` (create), `apps/admin/src/lib/auth.config.ts` (create), `packages/db/src/schema/auth.ts` (generate), `packages/db/src/schema/relations.ts`, `packages/db/src/schema/index.ts`, `packages/db/migrations/*` (via db:generate), `apps/admin/.env.example`, `apps/api/.dev.vars.example`, `.github/workflows/ci.yml`. Task 6 additionally rotates `docs/progress.md` and `docs/plan.md` (M4 checkbox 1 + the stays-unticked note) and writes gitignored evidence. NOT here: any `/api/auth` route or server fn (#119), `create-staff` (#119), login UI / shell gate (#120), the api verification instance / `requireSession` / appointments gating / session-scoped client (#121), live secret puts + milestone gate + tech-stack/AGENTS/CONTEXT rotation (#122), and any `apps/landing` change (nothing in M4 touches landing).
- **Type-error policy:** if `pnpm typecheck` flags anything in the two new `apps/admin/src/lib` files, fix it at the type level without changing runtime semantics and without `any`; if a fix would change the spec's pinned options, STOP and report — do not silently reshape the config.

---

### Task 1: Dependency pins — `better-auth` in both apps, `@sevendays/db` in admin

**Files:**
- Modify: `apps/admin/package.json` (dependencies block)
- Modify: `apps/api/package.json` (dependencies block)
- Modify: `pnpm-lock.yaml` (via `pnpm install` — never by hand)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the import targets Tasks 2 depends on — `better-auth` (runtime dep of both apps, resolvable from `apps/admin`), `@sevendays/db` resolvable from `apps/admin` (needed because the factory calls `createDbClient`; admin currently has no `@sevendays/db` entry). Nothing imports them yet — `apps/api`'s `better-auth` sits unused until #121, which is exactly this ticket's AC ("dependency of both apps").

**Not here:** no `packages/db` dependency changes (it already has drizzle-orm + postgres); no code files; no `auth` CLI install anywhere (it is invoked per-run via `pnpm dlx auth@1.7.5`).

- [ ] **Step 1: Add the three dependency entries**

In `apps/admin/package.json`, in the `"dependencies"` object, insert (keeping the block's alphabetical order — they land among the `@fontsource…`/`@sentry…`/`@sevendays…` entries):

```json
    "@sevendays/api-client": "workspace:*",
    "@sevendays/db": "workspace:*",
    "@sevendays/types": "workspace:*",
```

(that is: the existing three `@sevendays/*` lines gain `"@sevendays/db": "workspace:*",` between `api-client` and `types`), and add the better-auth entry in its alphabetical slot (after `"@tailwindcss/vite"` — `b` < `c` — before `"class-variance-authority"`):

```json
    "better-auth": "^1.7.5",
```

In `apps/api/package.json`, in the `"dependencies"` object, add (alphabetically first, before `"@hono/zod-validator"`):

```json
    "better-auth": "^1.7.5",
```

- [ ] **Step 2: Install and verify the resolution**

```bash
pnpm install
pnpm --filter @sevendays/admin list better-auth --depth 0
pnpm --filter @sevendays/api list better-auth --depth 0
grep -n 'better-auth@1.7.5' pnpm-lock.yaml | head -3
```

Expected: install clean (lockfile updated); both `list` outputs show `better-auth 1.7.5`; the lockfile contains resolved `better-auth@1.7.5` entries (importer blocks for both apps plus the resolution record). If the lockfile resolves anything other than 1.7.5, STOP and report — the AC pins the exact resolution.

- [ ] **Step 3: Verify nothing else moved**

```bash
pnpm build:packages && pnpm --filter @sevendays/api build && pnpm check
git status --short
```

Expected: `pnpm check` green (35/35 turbo tasks — deps alone add no tasks); `git status` shows exactly `apps/admin/package.json`, `apps/api/package.json`, `pnpm-lock.yaml` modified.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/package.json apps/api/package.json pnpm-lock.yaml
git commit -m "chore(deps): better-auth@^1.7.5 in admin+api; admin gains @sevendays/db (#118)

M4 foundation: the auth server (admin) and the future verification
instance (api) both build against better-auth 1.7.5 (lockfile resolves
1.7.5 — npm latest, v1.7 docs line). The admin factory talks to Postgres
through packages/db like the api does (ADR-0007 topology), so admin
gains the workspace dep. Nothing imports these yet — tickets #119/#121
do."
```

---

### Task 2: The auth factory + CLI instance file, `auth generate`, and the schema's house adjustments

**Files:**
- Create: `apps/admin/src/lib/auth.ts`
- Create: `apps/admin/src/lib/auth.config.ts`
- Create (CLI-written): `packages/db/src/schema/auth.ts`
- Modify: `packages/db/src/schema/relations.ts`
- Modify: `packages/db/src/schema/index.ts:1-18` (barrel insert + stale TODO removal)

**Interfaces:**
- Consumes: Task 1's deps (`better-auth`, `@sevendays/db` resolvable from `apps/admin`); `createDbClient(connectionString: string)` + `Database` from `@sevendays/db` (`packages/db/src/client.ts:13`).
- Produces: `createAuth(databaseUrl?)` — the factory #119's route handler / session server-fns and (in shape) #121's verification instance construct per request; `auth` (the constructed instance) exported from `auth.config.ts` for the CLI; the five drizzle tables (`user`, `session`, `account`, `verification`, `rateLimit`) + three relation objects exported from the `@sevendays/db` barrel — the names #119/#121/#120's `$Infer.Session` types flow from.

**Not here:** mounting any route or server fn (#119); the api-side instance (#121); touching `packages/types` (auth shapes flow from `typeof auth.$Infer.Session`, never mirrored into shared Zod — spec § The auth schema); renaming generated tables to the catalog's plural convention (the adapter matches singular model names).

- [ ] **Step 1: Write `apps/admin/src/lib/auth.ts` — the factory**

Create the file with exactly this content (biome's `pnpm fix` may reflow it afterwards — content is the pin):

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { createDbClient } from '@sevendays/db';

// ADR-0011: workerd scopes sockets to the request that created them, and the
// drizzle adapter CAPTURES the db instance it is given (the `database` option
// has no lazy-function form in 1.7) — so this factory must be called PER
// REQUEST (route handler, session server-fn), never hoisted to module scope.
// `betterAuth()` init does no I/O (drizzle schema validation reads local
// metadata), so per-request construction is CPU-only at staff-tool volume.
// `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` are read from env by BetterAuth
// itself — never duplicated here. Config purity: only better-auth subpaths
// and @sevendays/db may appear in this file's import graph — the CLI loads
// it via jiti outside any bundler (see auth.config.ts next to it).
export function createAuth(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set — the admin auth server cannot reach Postgres. Set it in apps/admin/.env.local (vite dev), apps/admin/.dev.vars (wrangler dev), or the Worker secret (prod). No fallback by design.'
    );
  }
  return betterAuth({
    database: drizzleAdapter(createDbClient(databaseUrl), { provider: 'pg' }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // staff-only; provisioning is the owner CLI (M4 ticket 02)
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    plugins: [
      admin(), // role vocabulary + the createUser/create-admin provisioning path
      tanstackStartCookies(), // MUST be last (cookie-setting through TanStack Start)
    ],
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 }, // 7 days, refresh daily — spec-pinned
    rateLimit: { enabled: true, storage: 'database' }, // memory is per-isolate on Workers — ineffective
  });
}
```

- [ ] **Step 2: Write `apps/admin/src/lib/auth.config.ts` — the CLI instance export**

Create the file with exactly this content:

```ts
// CLI entry for BetterAuth's tooling (`auth generate` today; `auth
// create-admin` in M4 ticket 02): the 1.7.5 CLI's config loader reads an
// exported INSTANCE's options — it picks `auth` / `default` / `default.auth`
// and never invokes a factory — so this file constructs a one-shot instance
// through the same factory the runtime uses. Node-only tooling surface:
// nothing in routes or server fns may import this file (the runtime builds
// per-request instances instead, ADR-0011). The stub URL mirrors
// drizzle.config.ts's fallback — generation needs no database; create-admin
// (#119) runs with a real DATABASE_URL in the environment.
import { createAuth } from './auth';

export const auth = createAuth(
  process.env.DATABASE_URL ?? 'postgres://stub:stub@localhost:5432/sevendays_stub'
);
```

- [ ] **Step 3: Run the pinned generation**

From the repo root (the CLI resolves `--config`/`--output` against cwd; the spec's autodiscovery note is why both flags are explicit):

```bash
pnpm dlx auth@1.7.5 generate --config apps/admin/src/lib/auth.config.ts --output packages/db/src/schema/auth.ts --adapter drizzle --dialect pg -y
```

Expected output (three log lines matter; the first two are NON-FATAL — the config constructs without `BETTER_AUTH_URL` in the CLI's env, and the schema-mismatch ERROR reflects the pre-barrel state by construction — generation runs before the auth tables join `@sevendays/db`'s barrel):

```text
WARN [Better Auth]: [better-auth] Base URL is not set. Set the baseURL option or BETTER_AUTH_URL env, or use a dynamic baseURL with allowedHosts for multi-host setups. Without it the origin is derived from the incoming request, and callbacks and redirects may not work correctly.
ERROR [Better Auth]: Drizzle schema mismatch
  Missing tables
    user, session, account, verification, rateLimit
  help: Run `npx auth generate` to refresh the Drizzle schema, then apply it with your migration tool.
🚀 Schema was generated successfully!
```

- [ ] **Step 4: Diff the generated file against the pinned expectation**

`packages/db/src/schema/auth.ts` must match this EXACTLY (verified by spike against this CLI version + these config options on 2026-09-22 — double quotes and all; formatting gets normalized in Step 5). Any table/column/relations drift is a STOP-and-report finding, not something to edit into place:

```ts
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  bigint,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
```

- [ ] **Step 5: House-adjust the generated file**

Two edits to `packages/db/src/schema/auth.ts`, nothing else:

1. Prepend this provenance header above the imports:

```ts
// BetterAuth 1.7 schema — generated via `pnpm dlx auth@1.7.5 generate
// --config apps/admin/src/lib/auth.config.ts --output
// packages/db/src/schema/auth.ts --adapter drizzle --dialect pg -y`
// (user/session/account/verification core + the admin plugin's fields +
// rateLimit for database-backed rate limiting). Regenerate — never hand-edit —
// when plugins change; the relations blocks live in relations.ts (house
// style), so a regeneration re-moves them.
```

2. DELETE the three relation blocks (`userRelations`, `sessionRelations`, `accountRelations`) and the now-unneeded `relations` import from `drizzle-orm` — they move to `relations.ts` in Step 6.

Then normalize formatting:

```bash
pnpm --filter @sevendays/db fix
```

Expected: biome rewrites the file to house style (single quotes, 2-space, sorted imports, wrapped long lines). `git diff packages/db/src/schema/auth.ts` should show only formatting deltas beyond the header + relation removal.

- [ ] **Step 6: Move the relations into `packages/db/src/schema/relations.ts`**

In `relations.ts`, add the auth import in the alphabetically-sorted import block (between the existing `attires.js` and `branch-studio-services.js` lines):

```ts
import { account, session, user } from './auth.js';
```

and append at the end of the file:

```ts
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
```

(Semantics are byte-for-byte the CLI's own relation output — one(FK→id) forward, many() reverse; only the location and formatting are house.)

- [ ] **Step 7: Barrel join — replace the stale TODO**

In `packages/db/src/schema/index.ts`: insert the auth export in alphabetical position (after `attires.js`, before `branch-studio-services.js` — `a-t-t` < `a-u-t` < `b`):

```ts
export * from './auth.js';
```

and delete the three trailing TODO lines (16–18):

```ts
// TODO: BetterAuth tables (users, sessions, accounts) will be generated via
// `pnpm --filter @sevendays/db exec betterauth-cli generate` once auth is wired up.
// See docs/adr/ for the decision record when that happens.
```

- [ ] **Step 8: Verify — build, barrel exports, typecheck**

```bash
pnpm --filter @sevendays/db fix
pnpm --filter @sevendays/db build
cd packages/db && node -e "import('./dist/index.js').then(m => { const need=['user','session','account','verification','rateLimit','userRelations','sessionRelations','accountRelations']; const missing=need.filter(n=>!(n in m)); if(missing.length){console.error('MISSING FROM BARREL:',missing);process.exit(1)} console.log('BARREL OK — 5 tables + 3 relations exported'); })"
cd ../.. && pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/db typecheck
```

Expected: `BARREL OK — 5 tables + 3 relations exported`; both typechecks green (the factory file typechecks against better-auth's own 1.7.5 types; per GC, a type error is fixed at the type level only). `packages/db`'s own vitest suite is covered by Task 6's full `pnpm check`.

- [ ] **Step 9: Commit**

```bash
git add apps/admin/src/lib/auth.ts apps/admin/src/lib/auth.config.ts packages/db/src/schema/auth.ts packages/db/src/schema/relations.ts packages/db/src/schema/index.ts
git commit -m "feat(db): BetterAuth 1.7 schema + the admin auth factory it generates from (#118)

src/lib/auth.ts is the spec's factory (per-request instances over
per-request db clients, ADR-0011; disableSignUp; admin() +
tanstackStartCookies() last; database-backed rate limiting). The 1.7.5 CLI
reads an exported instance, not a factory, so auth.config.ts constructs the
one-shot instance the CLI (and #119's create-admin) loads — the spec's
generate command now points there. Generated: user/session/account/
verification + the admin plugin's fields + rateLimit; relations moved to
relations.ts per house style; the schema barrel's stale TODO replaced."
```

---

### Task 3: Migration 0005 — generate through the house flow, apply, verify live

**Files:**
- Create (drizzle-kit-written): `packages/db/migrations/0005_<generated-name>.sql` + `packages/db/migrations/meta/0005_snapshot.json` + the journal update (all via `db:generate`)

**Interfaces:**
- Consumes: Task 2's schema files (drizzle-kit's config globs `./src/schema/*.ts` — `auth.ts` joins automatically; no config edit).
- Produces: migration 0005, applied to the live Supabase database — the tables #119 provisions a staff user into and #121 verifies sessions against. NOTE for Task 7: the editions share this database; the v1 pick carries the migration files but never re-runs `db:migrate`.

**Not here:** `auth migrate` (the Kysely-only path — spec § The auth schema forbids it); any hand-edit to generated SQL; seeds (no auth rows ever get seeded — provisioning is #119's owner CLI).

- [ ] **Step 1: Generate the migration**

```bash
pnpm --filter @sevendays/db db:generate
```

Expected: a new `packages/db/migrations/0005_*.sql` plus `meta/0005_snapshot.json` and an idx-5 journal entry (`packages/db/migrations/meta/_journal.json`). Generation is offline (no DB connection needed — the stub fallback in `drizzle.config.ts` covers it; if a local `packages/db/.env` with `DATABASE_MIGRATE_URL` exists it is simply unused by generate).

- [ ] **Step 2: Inspect the generated SQL**

```bash
grep -c 'CREATE TABLE' packages/db/migrations/0005_*.sql
grep -c 'ADD CONSTRAINT' packages/db/migrations/0005_*.sql
grep -c 'ON DELETE cascade' packages/db/migrations/0005_*.sql
grep -n 'session_userId_idx\|account_userId_idx\|verification_identifier_idx' packages/db/migrations/0005_*.sql
grep -c 'DROP' packages/db/migrations/0005_*.sql || echo "0 drops"
grep -cE 'appointments|branches|service_packages|attires|frames|print_sizes|studio_services|addon_services|package_inclusions|branch_studio' packages/db/migrations/0005_*.sql || echo "0 — no pre-existing table named"
```

Expected: exactly 5 `CREATE TABLE` (`account`, `rate_limit`, `session`, `user`, `verification`); exactly 2 `ADD CONSTRAINT` lines — the FK statements `account_user_id_user_id_fk` / `session_user_id_user_id_fk`, which drizzle-kit 0.31 emits as post-CREATE `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` on tables created in the SAME migration (amended 2026-09-22 after the first implementer's literal-gate stop — the original zero-ALTER expectation misread drizzle-kit's emission style; the safety property is "no pre-existing table touched, nothing destructive", ledger-recorded) — each with `ON DELETE cascade`; all three named indexes present; 0 DROP; 0 mentions of any pre-existing catalog table. Unique constraints appear as named `CONSTRAINT … UNIQUE(...)` lines inside the CREATE TABLE bodies (`user_email_unique`, `session_token_unique`, `rate_limit_key_unique`) — expected, not findings. Anything else is a STOP-and-report finding. `$onUpdate` is a drizzle runtime feature and correctly does NOT appear as SQL.

- [ ] **Step 3: Apply to the live database**

```bash
pnpm --filter @sevendays/db db:migrate
```

Gate: `DATABASE_MIGRATE_URL` (session-mode pooler URL, ADR-0007) must be present in gitignored `packages/db/.env` — it exists on the dev machine that has run migrations 0000–0004. If it is missing, STOP: that value is owner-held, never invented here.

- [ ] **Step 4: Verify the tables are live**

```bash
cd packages/db && node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const rows = await sql\`select table_name from information_schema.tables where table_schema='public' order by table_name\`;
const names = rows.map(r => r.table_name);
console.log(names.join('\n'));
const need = ['account', 'rate_limit', 'session', 'user', 'verification'];
const missing = need.filter(n => !names.includes(n));
if (missing.length) { console.error('MISSING LIVE TABLES:', missing); process.exit(1); }
console.log('LIVE OK —', names.length, 'tables (was 13 catalog-only)');
await sql.end();
" && cd ../..
```

Expected: 18 tables listed — the 13 catalog tables plus `account`, `rate_limit`, `session`, `user`, `verification`; final line `LIVE OK — 18 tables (was 13 catalog-only)`.

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations
git commit -m "feat(db): migration 0005 — BetterAuth's five auth tables (#118)

drizzle-kit generate over the generated auth schema (house flow, never
auth migrate): user/session/account/verification + rate_limit, the
session/account FKs cascading to user, three named indexes. Applied to
the live Supabase database via db:migrate (18 public tables now)."
```

---

### Task 4: Dev env examples — admin gains three vars, api gains one

**Files:**
- Modify: `apps/admin/.env.example` (append the three new blocks after the existing `API_URL=` block)
- Modify: `apps/api/.dev.vars.example` (append one block after the `LANDING_ORIGIN=` block, before the trailing TEST_DATABASE_URL comment)

**Interfaces:**
- Consumes: the spec § Environments and secrets table (owner-ratified values: admin dev `BETTER_AUTH_URL` = `http://localhost:3000`; secret ≥32 chars via `openssl rand -base64 32`; the secret is SHARED across admin+api so the api's verification instance accepts admin-issued sessions).
- Produces: the committed documentation surface for every env var #119+ consumes — later tickets do zero env archaeology. The live local values (`.env.local`, `.dev.vars`) are the developer's own; nothing here needs them to exist yet.

**Not here:** writing any real `.env.local`/`.dev.vars` values (secrets never committed; dev instances can be filled when #119 first boots the auth server); a `apps/admin/.dev.vars.example` (the ticket AC names exactly two files; the admin built-worker dev parity is covered by a comment instead); the deploy-side env (Task 5); the live Worker secret puts (#122).

- [ ] **Step 1: Extend `apps/admin/.env.example`**

Append exactly (after the existing `API_URL=` line and its comments):

```text

# Pooled Supabase connection (transaction mode, port 6543) — the admin app
# talks to Postgres directly for auth (M4; the api's ADR-0007 topology:
# per-request client, prepare: false). Dev: this file's .env.local copy
# (the dev script's dotenv). Built-worker `wrangler dev` reads .dev.vars
# instead — same values there.
DATABASE_URL=

# BetterAuth session signing — 32+ chars, `openssl rand -base64 32`.
# MUST equal apps/api's BETTER_AUTH_SECRET (the api's verification instance
# validates admin-issued sessions against the shared tables, ADR-0004).
# Never commit the real value.
BETTER_AUTH_SECRET=

# The admin app's own origin — BetterAuth's baseURL (dev: the vite port).
BETTER_AUTH_URL=http://localhost:3000
```

- [ ] **Step 2: Extend `apps/api/.dev.vars.example`**

Append exactly (after the `LANDING_ORIGIN=` block, before the `# TEST_DATABASE_URL …` closing comment):

```text

# BetterAuth session-token signing — MUST equal apps/admin's
# BETTER_AUTH_SECRET (M4, ADR-0004: this Worker's verification instance
# checks admin-issued bearer tokens against the shared session table).
# 32+ chars; `openssl rand -base64 32`. Unused until M4 ticket 04 wires
# the verification instance.
BETTER_AUTH_SECRET=
```

- [ ] **Step 3: Verify — no secrets, examples parse as comments+keys**

```bash
git diff apps/admin/.env.example apps/api/.dev.vars.example
grep -c 'BETTER_AUTH_SECRET=$\|DATABASE_URL=$\|BETTER_AUTH_URL=http://localhost:3000$' apps/admin/.env.example
grep -c 'BETTER_AUTH_SECRET=$' apps/api/.dev.vars.example
```

Expected: the diff shows only the two appended blocks; admin example matches 3 greps (2 empty keys + the localhost default), api example 1. No value in either diff is a secret (the only literal is the non-secret dev origin).

- [ ] **Step 4: Commit**

```bash
git add apps/admin/.env.example apps/api/.dev.vars.example
git commit -m "docs(env): dev examples carry the M4 auth vars (#118)

admin: DATABASE_URL (direct-to-Postgres auth, ADR-0007 topology),
BETTER_AUTH_SECRET (shared with the api — ADR-0004 verification),
BETTER_AUTH_URL (dev origin 3000). api: BETTER_AUTH_SECRET (the
verification instance, wired in ticket 04). Empty keys + comments only."
```

---

### Task 5: Deploy-workflow posture — `BETTER_AUTH_URL` vars + admin `DATABASE_URL` sync, both editions

**Files:**
- Modify: `.github/workflows/ci.yml:82-85` and `:141-144` (both legs' `env:` blocks — add `BETTER_AUTH_URL`)
- Modify: `.github/workflows/ci.yml:128-130` and `:186-188` (both admin deploy steps — add the `--var`) plus a new sync step after each

**Interfaces:**
- Consumes: the existing mechanisms this extends verbatim — `API_URL`'s (`env: vars.API_URL` → `--var "API_URL:$API_URL"`, no guard) and the api's DATABASE_URL sync (`if [ -z … ] exit 1` + `printf | wrangler secret put --name <worker>`). Verified during recon: `wrangler deploy --dry-run --var "BETTER_AUTH_URL:"` exits 0 — an unset GitHub-environment var yields an empty deploy var, so both legs land green before the owner sets anything (dormant-safe; #122 verifies the vars live).
- Produces: the deployed-env contract #119+ run against — admin Workers with `DATABASE_URL` (secret) + `BETTER_AUTH_URL` (var) + the existing `API_URL`; api Workers unchanged until #122 puts `BETTER_AUTH_SECRET`.

**Not here:** any `BETTER_AUTH_SECRET` workflow line (one-time owner `wrangler secret put`, the `RESEND_API_KEY` precedent — #122); any wrangler.jsonc/toml edit (vars/secrets need no config entries); any guard on `BETTER_AUTH_URL` (deliberately the `API_URL` mechanism, not the sync-step mechanism); touching the landing deploy steps.

- [ ] **Step 1 (owner-optional, before merge): set the two GitHub-environment vars**

Non-secret deploy URLs from the spec's env table. If the session's `gh` token lacks repo-admin scope, skip — Step 4's greenness does not depend on it (#122's AC owns the live check):

```bash
gh api -X POST repos/jeius/sevendays/environments/teaser/variables \
  -f name=BETTER_AUTH_URL -f value='https://sevendays-admin.pahamajulius.workers.dev' \
  || gh api -X PATCH repos/jeius/sevendays/environments/teaser/variables/BETTER_AUTH_URL \
       -f value='https://sevendays-admin.pahamajulius.workers.dev'
gh api -X POST repos/jeius/sevendays/environments/v1/variables \
  -f name=BETTER_AUTH_URL -f value='https://sevendays-v1-admin.pahamajulius.workers.dev' \
  || gh api -X PATCH repos/jeius/sevendays/environments/v1/variables/BETTER_AUTH_URL \
       -f value='https://sevendays-v1-admin.pahamajulius.workers.dev'
```

- [ ] **Step 2: Teaser leg — env block, admin deploy step, admin sync step**

In `.github/workflows/ci.yml`'s `deploy-teaser` job, change the `env:` block to:

```yaml
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      API_URL: ${{ vars.API_URL }}
      BETTER_AUTH_URL: ${{ vars.BETTER_AUTH_URL }}
```

and replace the teaser's admin deploy step with these two steps:

```yaml
      - name: Deploy admin (sevendays-admin)
        working-directory: apps/admin
        run: pnpm exec wrangler deploy --name sevendays-admin --var "API_URL:$API_URL" --var "BETTER_AUTH_URL:$BETTER_AUTH_URL"

      - name: Sync admin DATABASE_URL from the environment secret
        working-directory: apps/admin
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo '::error::DATABASE_URL secret missing from the teaser GitHub environment'
            exit 1
          fi
          printf '%s' "$DATABASE_URL" | pnpm exec wrangler secret put DATABASE_URL --name sevendays-admin
```

- [ ] **Step 3: v1 leg — the same three edits, v1-named**

In `deploy-v1`: the same one-line `BETTER_AUTH_URL: ${{ vars.BETTER_AUTH_URL }}` addition to its `env:` block; and:

```yaml
      - name: Deploy admin (sevendays-v1-admin)
        working-directory: apps/admin
        run: pnpm exec wrangler deploy --name sevendays-v1-admin --var "API_URL:$API_URL" --var "BETTER_AUTH_URL:$BETTER_AUTH_URL"

      - name: Sync admin DATABASE_URL from the environment secret
        working-directory: apps/admin
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo '::error::DATABASE_URL secret missing from the v1 GitHub environment'
            exit 1
          fi
          printf '%s' "$DATABASE_URL" | pnpm exec wrangler secret put DATABASE_URL --name sevendays-v1-admin
```

- [ ] **Step 4: Structural verification**

```bash
grep -c 'BETTER_AUTH_URL: \${{ vars.BETTER_AUTH_URL }}' .github/workflows/ci.yml
grep -c -- '--var "BETTER_AUTH_URL:$BETTER_AUTH_URL"' .github/workflows/ci.yml
grep -c 'Sync admin DATABASE_URL from the environment secret' .github/workflows/ci.yml
grep -c 'wrangler secret put DATABASE_URL' .github/workflows/ci.yml
grep -c '^ *- name:' .github/workflows/ci.yml
git show HEAD:.github/workflows/ci.yml | grep -c '^ *- name:'
```

Expected: `2` / `2` / `2` / `4` (2 new admin syncs + the 2 existing api syncs); the current file's step count is exactly the HEAD count + 2 (two new named steps — the two admin syncs; the deploy steps are edits, not additions). The YAML's real proof is Step 5's commit + the PR's `check` job and the merge push exercising both deploy legs.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: admin deploys carry the M4 auth env posture, both editions (#118)

BETTER_AUTH_URL rides each admin deploy as a --var (the API_URL
mechanism — the api verification instance and BetterAuth's baseURL
consume it from M4 ticket 02 on) and both admin Workers join the
DATABASE_URL env-secret sync (the api's pattern — the admin Worker
talks to Postgres directly for auth). Dormant-safe: an unset var
deploys empty (verified), no runtime auth code exists yet."
```

---

### Task 6: Full gate, docs rotation, PR, merge, and the watched teaser deploy

**Files:**
- Modify: `docs/progress.md` (rotate the `_Last updated:` line + prepend the session paragraph)
- Modify: `docs/plan.md:113` (tick M4 checkbox 1 with a dated annotation; the stays-unticked note for checkbox 3 at line 115 rides the annotation)
- Create (gitignored): `.superpowers/sdd/2026-09-22-118-better-auth-foundation/evidence.md`
- The squash-merge PR `(#118)` + its watched deploy

**Interfaces:**
- Consumes: Tasks 1–5 (the branch state); the docs conventions (progress.md's single-paragraph session record; plan.md's `_(date: …)_` annotation style, e.g. its M2 line 70).
- Produces: the merged main whose push exercises Task 5's legs (the AC's "landing green"); the docs state #119's session reads (progress says exactly what exists); the evidence block Task 7's ledger row cites.

**Not here:** ticking M4 checkbox 3 (spans #122's live puts — only the note is added); tech-stack.md / AGENTS.md / CONTEXT.md rotation (#122); closing any issue other than #118.

- [ ] **Step 1: The full gate**

```bash
pnpm check
graphify update .
```

Expected: `pnpm check` green, 35/35 turbo tasks (no new test files or scripts were added — count unchanged from the #101-recorded baseline; if it differs, reconcile before proceeding: a count change means something outside this plan's fence moved). `graphify update .` rewrites `graphify-out/` (AST-only; the diff is expected house noise, commit it).

- [ ] **Step 2: Rotate `docs/progress.md`**

Replace the current `_Last updated: 2026-09-22 (M4 spec session: …` line (the one beginning `_Last updated: 2026-09-22 (M4 spec session:`) with:

```markdown
_Last updated: 2026-09-22 (M4 ticket 01 landed — the BetterAuth foundation: `better-auth@^1.7.5` resolved 1.7.5 in both apps + `@sevendays/db` gained by admin; the spec's generate command amended by recon — the 1.7.5 CLI reads an exported instance, never a factory, so `src/lib/auth.ts` (factory, config-pure) is paired with `src/lib/auth.config.ts` (the CLI's instance export); migration 0005 applied — the five auth tables live in Supabase (18 public tables); dev examples + deploy-workflow wiring landed dormant-safe; tickets #119–#121 unblocked)._
```

Then insert this paragraph directly under `# Progress` (above the previous session's paragraph):

```markdown
2026-09-22 — #118 M4 ticket 01, the BetterAuth foundation, landed ahead of any auth behavior: deps (`better-auth@^1.7.5` in `apps/admin` + `apps/api`, lockfile-verified 1.7.5; admin gains `@sevendays/db` — its auth server talks to Postgres directly, the api's ADR-0007 topology); the auth factory `createAuth()` in `apps/admin/src/lib/auth.ts` (spec § The admin auth server shape — `disableSignUp`, `minPasswordLength` 12, `admin()` + `tanstackStartCookies()` last, database-backed rate limiting, per-request construction documented in-file per ADR-0011) plus `auth.config.ts`, the CLI-instance file the spec's command needed amending for (the 1.7.5 `auth` CLI's loader picks an exported instance and cannot invoke a factory — verified against the CLI dist's `resolveAuthModule` and proven by a pre-plan spike; config purity holds across both files); `auth generate` (pinned `pnpm dlx auth@1.7.5 … --adapter drizzle --dialect pg -y`) produced `packages/db/src/schema/auth.ts` — user/session/account/verification + the admin plugin's fields + `rateLimit` — relations moved to `relations.ts` (house style), the barrel's stale TODO replaced; migration 0005 through the house `db:generate`/`db:migrate` flow, applied to live Supabase (18 public tables, no alters/drops — greenfield); env examples extended (admin: `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`; api: `BETTER_AUTH_SECRET` — the shared-secret ADR-0004 note); both CI deploy legs carry `BETTER_AUTH_URL` as an admin `--var` (the `API_URL` mechanism) and both admin Workers join the `DATABASE_URL` env-secret sync — legs verified green on merge with the vars still unset (empty `--var` deploys clean, dry-run-proven; #122 owns the live puts + verification). `pnpm check` 35/35; v1 pick + ledger row per the runbook. NOT yet true: no auth route, session fn, or verification instance exists — #119 is next (blocking #120/#121), and `BETTER_AUTH_SECRET` is not yet set anywhere outside dev examples.
```

- [ ] **Step 3: Tick `docs/plan.md` M4 checkbox 1 (+ the checkbox-3 note)**

In `docs/plan.md`'s M4 block, change the Foundation checkbox from `- [ ]` to `- [✅]` and append this annotation inside its existing trailing text (after `env examples extended`):

```markdown
 _(2026-09-22: ticket #118 landed — deps pinned `^1.7.5` both apps (lockfile 1.7.5); the schema generated via the config-purity pair `apps/admin/src/lib/auth.ts` (factory) + `auth.config.ts` (CLI instance export — the 1.7.5 CLI reads an exported instance, not a factory, so the spec's `--config` points at the latter file now); migration 0005 applied — five tables live; env examples + the deploy-workflow wiring (BETTER_AUTH_URL var + admin DATABASE_URL sync) landed, legs green. The checkbox-3 live secret/var puts remain for #122 — that box stays unticked until then.)_
```

- [ ] **Step 4: Evidence file (gitignored)**

Write `.superpowers/sdd/2026-09-22-118-better-auth-foundation/evidence.md` with: the Task 1 `list` outputs, Task 2 Step 3's CLI log + the diff-vs-pin result, Task 3 Step 4's 18-table probe output, Task 5 Step 4's counts, Task 6 Step 1's `pnpm check` tail, and (after Step 6) the watched deploy run URL. Quote the same blocks into the PR body.

- [ ] **Step 5: Commit docs + open the PR**

```bash
git add docs/progress.md docs/plan.md graphify-out
git commit -m "docs: M4 foundation landed — progress rotation + Foundation checkbox ticked (#118)

progress.md carries the session record (the CLI-factory amendment
included); plan.md's M4 Foundation box ticked with the dated
annotation; checkbox 3 explicitly stays open for #122's live puts."
gh pr create --title "M4 ticket 01 — BetterAuth foundation: deps, auth schema, migration 0005, env posture" --body-file .superpowers/sdd/2026-09-22-118-better-auth-foundation/pr-body.md
```

(The `pr-body.md` contents — fill the evidence quotes from Step 4's file, then commit nothing from the sdd dir itself:)

```markdown
Implements #118 — the M4 BetterAuth foundation (deps, auth schema, migration 0005, env posture). Spec: #117, plan: docs/superpowers/plans/2026-09-22-118-better-auth-foundation.md.

## Acceptance criteria → evidence

- **`better-auth@^1.7.5` dep of both apps, lockfile 1.7.5** — <quote Task 1 Step 2's two `list` outputs + lockfile grep>
- **The auth factory (config-pure, per-request rule in-file)** — `apps/admin/src/lib/auth.ts` (factory only) + `auth.config.ts` (CLI instance). One spec amendment, recon-evidenced: the 1.7.5 CLI's loader picks an exported instance (`m?.auth ?? m?.default?.auth ?? m?.default ?? mod`) and never invokes a factory, so `--config` points at `auth.config.ts`, not `auth.ts`. Spike-proven pre-plan; import paths verified against the 1.7.5 exports map (`better-auth/adapters/drizzle`, `better-auth/tanstack-start`).
- **Schema generated + barrel + relations** — <quote Task 2 Step 4's match-vs-pin conclusion + Step 8's BARREL OK line>
- **Migration 0005 through the house flow, tables live** — <quote Task 3 Step 2's grep counts + Step 4's 18-table probe output>
- **Dev env examples** — admin `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`, api `BETTER_AUTH_SECRET`; empty keys + comments only (diff quoted).
- **Deploy posture both editions, landing green** — `BETTER_AUTH_URL` as an admin `--var` (the `API_URL` mechanism) + both admin Workers on the `DATABASE_URL` env-secret sync. Empty-var deploy dry-run-proven; merge-push run: <run URL + step results>.
- **`pnpm check` green** — 35/35 turbo tasks.

## Not here (fences)

No auth route/server-fn/CLI (#119), no login UI (#120), no api verification/gating (#121), no live secret puts or docs rotation beyond progress/plan.md (#122). `apps/landing` untouched.
```

- [ ] **Step 6: Merge and watch the teaser deploy (the workflow's live proof)**

```bash
gh pr view --json url -q .url
gh pr merge --squash --delete-branch
gh run list --branch main --limit 1
gh run watch <run-id> --exit-status
```

Expected: the push-triggered run executes `check` then `Deploy teaser (main)` — all steps green, including `Deploy admin (sevendays-admin)` with its new `--var` and `Sync admin DATABASE_URL from the environment secret` (the secret exists in the teaser environment — the api sync has consumed it since #79). The v1 leg does not run on main. Record the run URL in the evidence file. This green run is the AC's "landing green before any runtime auth code exists".

---

### Task 7: v1 pick + ledger rows (the runbook tail)

**Files:**
- The pick executes ONLY in `~/Projects/sevendays-v1-seed` (never check `v1` out in the main workspace — runbook rule)
- Modify (on main, after the pick): `docs/agents/v1-picks.md` (ledger rows)

**Interfaces:**
- Consumes: the squash sha Task 6 merged (`git log origin/main -1 --format=%H` after the merge); the runbook `docs/agents/v1-picks.md` verbatim procedures (classifier `scripts/v1-triage.mjs`, locks incl. the export audit `node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` from the main repo).
- Produces: the v1 edition carrying the foundation (deps, schema, migration files, env examples, both workflow legs) so #119's pick lands onto it cleanly; ledger rows keeping main and v1 reconciled.

**Not here:** running `db:migrate` in the seed (the editions share the live database — 0005 applied once in Task 3); any v1-side verification of auth behavior (nothing runtime exists — #119+); M4-04-style split-prep for appointments files (nothing here touches them).

- [ ] **Step 1: Reconcile the backlog (main order)**

```bash
cd ~/Projects/sevendays-v1-seed && git status --short && git log --oneline -3
tail -5 ~/Projects/sevendays/docs/agents/v1-picks.md
```

Expected: the seed is clean at `8c133b6` (#115's pick) or a later pick; ledger rows are current through `6ceee8f`. If `a221d2c` (skills-docs) and/or `f3f712e` (M4 spec + tickets) still lack rows, record their mechanical skip rows FIRST (both are docs/specs/skills-only — main-only paths per the classifier; the row format follows the #113 mechanical-skip precedent), then proceed. Drain anything else pending before this ticket's pick — main order, always.

- [ ] **Step 2: Triage + pick this PR's squash**

Run the classifier per the runbook (`node scripts/v1-triage.mjs` from the main repo against the squash sha). Pre-mapped expectation: **SPLIT** — v1-paths: `apps/admin/package.json`, `apps/api/package.json`, `pnpm-lock.yaml` (the transformed-lockfile procedure per the #100 row: cherry-pick the manifest hunks into the seed, then `pnpm install` there to regenerate v1's lockfile — do NOT hand-merge the lockfile), `apps/admin/src/lib/auth.ts` + `auth.config.ts` (new files — apply whole), `packages/db/src/schema/auth.ts` (new), `relations.ts` + `schema/index.ts` (v1's variants are expected identical to main's pre-#118 state; the barrel hunk applies, the TODO deletion rides it), `packages/db/migrations/0005_*` + meta (new files — apply; do NOT run db:migrate), both env examples (v1 has `apps/api/.dev.vars.example`; `apps/admin/.env.example` rides the admin tree), `.github/workflows/ci.yml` (both legs exist on v1 — applies clean); main-only: `docs/superpowers/plans/*` (this file), `docs/progress.md`; `docs/plan.md`'s hunk — the checkbox-1 tick + annotation trips edition vocabulary (#122 references) → content-drop the annotation, apply the tick only if v1's M4 block carries the same checkbox (verify in the seed; if v1's variant differs, drop the hunk whole and note it in the row). `graphify-out/` — regenerated in the seed per the runbook's transformed-surface handling.

- [ ] **Step 3: Locks, push, watch (runbook verbatim)**

```bash
cd ~/Projects/sevendays-v1-seed && pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build && pnpm check && pnpm build
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed
cd ~/Projects/sevendays-v1-seed && git push
gh run watch <the-v1-push-run-id> --exit-status
curl -sS -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/
curl -sS -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/book
```

Expected: `pnpm check` green in the seed; audit exit 0 (18 tokens — none of this ticket's content trips them: verify `BETTER_AUTH` appears nowhere in the audit's token list); the push run shows `check` + `Deploy v1 (private)` success, `Deploy teaser (main)` skipped — including the seed's NEW admin sync step `Sync admin DATABASE_URL from the environment secret` (green: the v1 environment's `DATABASE_URL` secret already exists — the api sync has consumed it since #81); live curls: landing `200`, `/book` `404`. Time-box one hour of conflict work per the runbook — beyond that, STOP and hand the row to the owner.

- [ ] **Step 4: Ledger rows on main**

Back in the main workspace, append the row(s) to `docs/agents/v1-picks.md`: the Step 1 skip rows (if any were owed) + this ticket's row — columns per the table: date, #118, the squash sha, `split`, the seed pick sha, and a notes cell covering: the config-pair files applied whole, the transformed-lockfile procedure used, migration files carried without re-migrate (shared DB), the plan.md annotation content-drop, the ci.yml both-legs apply, locks (check/build/audit results + run id), and the live curl results. Commit + push directly to main:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — #118 foundation split executed (#118)"
git push
```

- [ ] **Step 5: Close the issue**

```bash
gh issue close 118 --comment "Foundation landed via PR #<pr-number> (squash <sha>): deps 1.7.5 both apps, auth schema + migration 0005 applied (5 tables live), env examples + deploy-workflow wiring green on merge. v1 picked (split) as <seed-sha>, ledger row recorded. The factory/CLI-instance pair and the pinned generate invocation live in the plan doc; #119 unblocked."
```

---

## Self-Review (recorded at planning time)

- **Spec coverage vs ticket AC:** deps in both apps + lockfile 1.7.5 → Task 1; factory (config-pure, per-request rule in-file) → Task 2 Steps 1–2; generated schema via pinned invocation + barrel TODO replaced + relations added → Task 2 Steps 3–7; migration 0005 through house flow + live tables → Task 3; dev env examples (admin 3 vars, api 1) → Task 4; deploy posture both editions (`--var` + admin sync) landing green → Tasks 5–6; `pnpm check` green → Task 6. Ticket deviation recorded: the spec's `--config apps/admin/src/lib/auth.ts` → `auth.config.ts` (CLI-source-evidenced, in GC + Task 2 + docs annotations).
- **Sibling fences:** #119's route/server-fns/CLI, #120's UI, #121's api instance/gating, #122's live puts + docs rotation — each named in the plan header's fence paragraph and in per-task Not-here blocks. Shared roadmap checkboxes: box 1 ticked (Task 6), box 3's stays-unticked note pinned (Task 6 Step 3).
- **Type consistency:** `createAuth(databaseUrl = process.env.DATABASE_URL)` in Task 2 Step 1 is the only definition; Task 2 Step 2 and the Task 2 Step 9 commit message reference it; #119/#121 references are descriptive only. Table/const names (`user`, `session`, `account`, `verification`, `rateLimit`, `*Relations`) match between the pinned generated file (Step 4), the relations move (Step 6), the barrel probe (Step 8), and the migration greps (Task 3 Step 2).
- **Counts re-derived:** Task 5 Step 4 expects `2/2/2/4` and +2 named steps — matches two legs × (one env line, one --var, one sync step) plus the two pre-existing api syncs. Task 3 Step 4 expects 18 tables = 13 catalog + 5 auth (live-probed baseline 13 during recon). Task 6 expects 35/35 (no new tasks added by this plan — no test files, no scripts).




