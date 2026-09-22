# M4 Ticket 02 — Admin Auth Server Live (/api/auth routes, per-request instances, create-staff CLI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** Staff credentials verify against the real database through the admin app's own HTTP surface — BetterAuth's handler serves `/api/auth/*` on the admin Worker with every auth-serving path building its instance per request over a per-request `packages/db` client, the `/api/auth/ok` probe answers in dev, self-serve sign-up is refused, and the owner can create the first staff user from the command line (`create-staff`), proven by a curl sign-in that sets the session cookie and leaves a session row in Postgres.

**Architecture:** Seven tasks: (1) the `/api/auth/$` catch-all route + route-tree regeneration, (2) the `getSession`/`ensureSession` server functions, (3) the `create-staff` script + the in-repo provisioning/reset runbook, (4) local dev env values (gitignored — no commit), (5) the live dev verification (probe → sign-up refusal → staff creation → sign-in/wrong-password/session-row), (6) the full gate + docs rotation + PR/merge with the deploy watched, (7) the v1 pick + ledger row + issue close. Every mounting/inference claim was spike-proven against the installed toolchain during planning, and every response literal was read off the installed `better-auth@1.7.5` dist (see Global Constraints "Pinned runtime literals").

**Tech Stack:** better-auth `1.7.5` (lockfile-resolved; v1.7 docs line — `better-auth.com/docs/llms.txt`), the `auth` CLI at the lockstepped `auth@1.7.5` via `pnpm dlx`, TanStack Start/Router (resolved `@tanstack/react-start@1.168.56` / `@tanstack/react-router@1.170.38`), `@sevendays/db` (drizzle + postgres.js over the pooled Supabase URL), pnpm + Turborepo, GitHub Actions + Wrangler, `gh` CLI.

**Spec:** Implements ticket [#119 "M4 ticket 02 — Admin auth server live: /api/auth routes, per-request instances, create-staff CLI"](https://github.com/jeius/sevendays/issues/119) (label `ready-for-agent`), whose parent is the M4 spec `docs/specs/2026-09-22-m4-admin-auth-spec.md` (issue #117 — § The admin auth server, § Worker runtime posture, § Staff provisioning are this ticket's sections). Key recon facts (2026-09-22, main `35249a9` — #118's foundation is merged and applied):

- **The `/ok` literal amendment (the one AC drift this plan corrects):** ticket and spec both pin `GET /api/auth/ok` → `{"status":"ok"}`. The installed 1.7.5 dist does not return that shape — `dist/api/routes/ok.mjs` ends `return ctx.json({ ok: true })`, i.e. **HTTP 200 `{"ok":true}`**. The AC's intent (a live probe payload from the smoke endpoint) is met by the framework's own response; wrapping `/ok` to reshape it would fight the framework for no value. This plan verifies `{"ok":true}` and records the amendment in the docs annotations + PR body (the M4-01 config-pair precedent). #122's live gate inherits the corrected literal.
- **The mounting shape is spike-proven end-to-end (2026-09-22, this machine):** the `server.handlers` route option is typed by `@tanstack/start-client-core`'s `dist/esm/serverRoute.d.ts` — a `declare module '@tanstack/router-core'` augmentation of `FilebaseRouteOptionsInterface` adding `server?: RouteServerOptions` with `handlers?: Partial<Record<RouteMethod, RouteMethodHandlerFn>>` (`RouteMethodHandlerCtx` carries `request: Request`; the fn returns `Response | undefined | …`). A real `apps/admin/src/routes/api/auth/$.ts` using `createFileRoute('/api/auth/$')({ server: { handlers: { GET: ({ request }) => createAuth().handler(request), POST: … } } })` was created, `pnpm --filter @sevendays/admin generate-routes` (`tsr generate`, tsr.config.json `{"target":"react"}`) was run, and `tsc --noEmit` inside `apps/admin` returned **zero errors**; a negative spike (handler returning a string) confirmed the handler signature is genuinely enforced (`RouteMethodHandlerFn` mismatch). Both spike files were deleted; `routeTree.gen.ts` restored. Note: `tsc` alone does NOT regenerate the route tree — pre-generation, `createFileRoute('/api/auth/$')` fails with `Argument of type '"/api/auth/$"' is not assignable to parameter of type 'keyof FileRoutesByPath | undefined'`; the explicit `generate-routes` step is therefore load-bearing. `tsr generate` prints a benign `(node) Warning: Accessing non-existent property 'replaceRouteChunk' of module exports inside circular dependency` — expected noise, not a failure. This matches the repo's own `tanstack-start-best-practices` api-routes rule (server routes for external consumers use exactly this `server.handlers` shape).
- **The session server-fns shape is spike-proven:** `createServerFn({ method: 'GET' }).handler(async () => { return startSpan({ name: … }, async () => { const headers = getRequestHeaders(); return createAuth().api.getSession({ headers }); }); })` — with `getRequestHeaders` from `@tanstack/react-start/server` and the Sentry `startSpan` wrapper per the server-fn house rule (`apps/admin/src/lib/api.functions.ts` is the precedent) — typechecks clean in `apps/admin`. The spec assigns these helpers to ticket 2 (§ The admin auth server, "Session checks server-side") even though #119's AC list doesn't re-name them; #120's `_shell` gate consumes them.
- **The per-request rule is already encoded in the foundation:** `apps/admin/src/lib/auth.ts` (merged at #118) exports ONLY `createAuth(databaseUrl = process.env.DATABASE_URL)` — config-pure, `disableSignUp: true`, `minPasswordLength` 12, `admin()` + `tanstackStartCookies()` last, database-backed rate limiting — and its header comment carries the ADR-0011 rationale. `apps/admin/src/lib/auth.config.ts` exports the one-shot constructed instance FOR THE CLI ONLY (the 1.7.5 CLI reads an exported instance, never a factory — #118's recon-evidenced amendment); nothing may import it at runtime. This ticket adds the two consumers the foundation anticipated: the route handler and the session fns.
- **The `create-admin` CLI contract (v1.7 docs, concepts/cli):** `pnpm dlx auth@1.7.5 create-admin` takes `--config`, `--email`, `--name` (defaults to `admin`), `--password`, `--role` (defaults to `admin`), `--data`, `--no-email-verified`, `--force`, `--yes`. **If `--password` is omitted the CLI prompts for it interactively** — exactly the ticket's "never a flag or file" rule. It "requires the Admin plugin and a persistent database", goes through the same server-side `auth.api.createUser` path as the admin plugin (password hashed with scrypt, hooks run), marks the email verified, and **asks for confirmation when users already exist**. `--config` resolves against cwd — run from `apps/admin` (pnpm --filter sets script cwd there), so the value is `src/lib/auth.config.ts`. The CLI loads the config via jiti → `./auth` → `@sevendays/db` → **`packages/db/dist` must be built** (`pnpm build:packages` gate) — and needs a real `DATABASE_URL` in the environment (the config's stub fallback exists only for generation). Probed live: pnpm forwards everything after the script name to the script verbatim, so `pnpm --filter @sevendays/admin create-staff --email x --name "Y"` appends those flags to the wrapper.
- **Pinned runtime literals (read off the installed 1.7.5 dist):** with `disableSignUp: true`, `POST /api/auth/sign-up/email` throws `APIError.from("BAD_REQUEST", …)` → **HTTP 400** `{"message":"Email and password sign up is not enabled","code":"EMAIL_PASSWORD_SIGN_UP_DISABLED"}` (`dist/api/routes/sign-up.mjs:144`). A wrong password on `POST /api/auth/sign-in/email` → **HTTP 401** `{"code":"INVALID_EMAIL_OR_PASSWORD","message":"Invalid email or password"}` (`@better-auth/core/dist/error/codes.mjs:11`) — the ticket's "generic invalid-credentials response". A successful sign-in returns 200 with `{ token, user }` in the body and sets the session cookie; in dev (not production, no `__Secure-` prefix) the cookie name is **`better-auth.session_token`** (`dist/cookies/index.mjs:264-279`). The `session.token` column stores the bare 32-char token **verbatim, unhashed** (live-verified 2026-09-22 — this bullet's earlier "hash" text was the stale spec claim and is corrected here): the sign-in body's `token` equals the row verbatim, while the cookie value is `<token>.<signature>` — set via `setSignedCookie` (`dist/cookies/index.mjs:172`) — so a full-string cookie==row comparison is false by design and equality holds on the token segment. #121's no-hand-rolled-lookup ruling is thereby STRENGTHENED: the signature must be verified/stripped by better-auth's own session API; a hand-rolled cookie-string lookup can never match.
- **Repo state (live reads, 2026-09-22):** `apps/admin/package.json` has `dotenv-cli` (^11) in dependencies and scripts `dev` (dotenv `.env.local`, vite port 3000) and `generate-routes` (`tsr generate`) — no `create-staff` yet; admin has no vitest (spec § Testing posture: the admin auth wiring is verified by the live gate, not a suite — this ticket adds NO test files). `apps/admin/src/lib/` holds `api.server.ts` + `api.functions.ts` (the server-only seam + server-fn precedents), `auth.ts`, `auth.config.ts`, `queries.ts`. `apps/admin/src/routeTree.gen.ts` is git-tracked (regeneration = a committed diff). `apps/admin/.env.local` currently carries only `API_URL` (gitignored); `apps/api/.dev.vars` carries `DATABASE_URL` (the pooled transaction URL this plan copies for admin dev) + `LANDING_ORIGIN`/`RESEND_API_KEY`, no `BETTER_AUTH_SECRET` yet; `packages/db/.env` carries `DATABASE_MIGRATE_URL`/`DATABASE_URL` for the Postgres probes (Task 5's session-row probe reuses the M4-01 `node --env-file=.env -e` pattern — Node v26 auto-detects ESM syntax in `-e`, probed). `.gitignore:16-21` covers `.env.*`/`.dev.vars` with `!`-exceptions for the examples — the local values cannot be committed by accident. `pnpm dev` posture: process.env flows to the dev runtime through the dotenv-loaded vite process (the `API_URL` seam proves the path `DATABASE_URL` needs; `nodejs_compat_populate_process_env` covers the deployed Worker). `pnpm check` baseline is 35/35 turbo tasks (recorded at #118, unchanged since — this ticket adds no test files or check-pipeline scripts). The auth tables are live in the shared Supabase dev DB (migration 0005, 18 public tables).
- **Sibling fences (spec § Tickets; `docs/plan.md`'s M4 block):** #120 owns `/login`, the `_shell` `beforeLoad` gate, sign-out, `authClient` wiring, and every UI-bearing concern (variants per #94) — **not here**; this ticket's session fns are UI-free helpers #120 will call. #121 owns the api verification instance, `requireSession`, appointments-list gating, and the session-scoped client seam — **not here**. #122 owns the live secret/var puts on all four targets, the teaser/v1 live gates, and the docs rotation beyond progress/plan.md (tech-stack Auth section, AGENTS.md auth-state flip, CONTEXT glossaries) — **not here**. Shared roadmap checkbox discipline: M4 checkbox 2 ("Admin auth server: …") and checkbox 4 ("Staff provisioning: …") are exactly this ticket's deliverables → ticked with dated annotations in Task 6; checkbox 3 ("Env + secrets posture: …") spans #118's wiring + #122's live puts → **stays unticked until #122** (Task 6 adds only a dev-values note to its text).
- **v1-picks state:** the ledger (`docs/agents/v1-picks.md`) is drained through #118 (row commit `35249a9` covers `a221d2c` + #118's split; `f3f712e` — the spec/docs commit — may still lack its mechanical skip row: Task 7 reconciles main order before this ticket's pick). This PR is booking-free by construction → **PICK** expected (no SPLIT: `routes/appointments.ts` is untouched).

## Global Constraints

- **Branch & baseline:** `feat/119-admin-auth-server` off main `35249a9` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#119)` squash style; every commit below is pinned verbatim.
- **Gates (repo AGENTS.md, verbatim duties):** do not commit code that fails `pnpm check` (lint + format + typecheck + test; expected 35/35 turbo tasks — this ticket adds no test files and no check-pipeline scripts, so the count is unchanged from the #118-recorded baseline; if it differs, reconcile before proceeding). After any fresh clone, `pnpm build:packages` must precede `pnpm check` (the shared client resolves the API's built `dist/`; `packages/db`'s `dist/` is likewise gitignored — Task 5's CLI run and dev boot both need it). Tick checklist boxes with `- [✅]`, never `[x]`. Run `graphify update .` at close (code was modified). Evidence lands in gitignored `.superpowers/sdd/2026-09-22-119-admin-auth-server/`.
- **Version pins:** `better-auth` resolves `1.7.5` from the `^1.7.5` range #118 pinned (verify with `pnpm --filter @sevendays/admin list better-auth --depth 0` before Task 5; if anything other than 1.7.5 resolves, STOP and report). The TanStack mounting was spike-proven against the resolved `@tanstack/react-start@1.168.56` / `@tanstack/react-router@1.170.38` — the `server.handlers` shape and the `createServerFn`/`getRequestHeaders` imports in this plan are the spike-validated forms; do not substitute another mounting style. The `auth` CLI is invoked only as `pnpm dlx auth@1.7.5 …` (version-pinned, never `@latest`). Every BetterAuth doc consult during execution uses the **v1.7** line (`https://better-auth.com/docs/llms.txt`), never unversioned pages.
- **Pinned runtime literals (owner-ratified spec values, corrected where the dist disagrees):** the `/ok` probe expects **HTTP 200 `{"ok":true}`** — the ticket's `{"status":"ok"}` is an amended literal (dist `ok.mjs` evidence above; recorded in Task 6's annotations and the PR body). Sign-up refusal expects **400** + `EMAIL_PASSWORD_SIGN_UP_DISABLED` ("Email and password sign up is not enabled"). Wrong-password sign-in expects **401** + `INVALID_EMAIL_OR_PASSWORD` ("Invalid email or password"). The dev session cookie is **`better-auth.session_token`**. If any Task 5 probe returns a different shape, STOP and report — do not loosen the assertion to make it pass.
- **The per-request rule (ADR-0011, binding):** every auth-serving code path constructs its instance via `createAuth()` inside the request scope — the route handlers and both session server-fns. There is NO module-scope auth instance in any runtime path: the only permitted constructed-at-module-scope instance is `apps/admin/src/lib/auth.config.ts`'s CLI export, which nothing under `routes/`, no server fn, and no other app may import (Task 1 Step 4's grep gate enforces the no-importers half; #118's GC pinned the same fence).
- **The `create-staff` contract (spec § Staff provisioning, binding):** the script is a thin wrapper — `dotenv -e .env.local -- pnpm dlx auth@1.7.5 create-admin --config src/lib/auth.config.ts --role admin` — and the owner supplies `--email`/`--name` at invocation (pnpm forwards them verbatim, probed). The password reaches the CLI ONLY through its interactive prompt (stdin) — never a flag, never a file, never a script argument; `--force`/`--yes`/`--password` are never pinned anywhere. The CLI's confirmation prompt when users already exist stays ON (it is the reset path's safety).
- **Secrets (standing rule):** `DATABASE_URL`, `BETTER_AUTH_SECRET` values live only in gitignored files (`apps/admin/.env.local`, `apps/api/.dev.vars`, `packages/db/.env`) or Worker secrets. Task 4 generates a fresh dev secret with `openssl rand -base64 32` and mirrors the SAME value into admin's `.env.local` and the api's `.dev.vars` (ADR-0004: #121's verification instance must accept admin-issued sessions — one secret, two files, both gitignored). The staff dev password (Task 5) is generated in-session with `openssl rand -base64 18` (24 chars ≥ the 12-char minimum), lives only in that shell invocation's variables, and is NEVER echoed into the evidence file, the PR body, or any file.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/message block below lands verbatim in content; `pnpm --filter @sevendays/admin fix` (biome check --write) then normalizes quoting/ordering/line-wrapping to house style — accept its rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–3 edit only: `apps/admin/src/routes/api/auth/$.ts` (create), `apps/admin/src/routeTree.gen.ts` (regenerated), `apps/admin/src/lib/auth.functions.ts` (create), `apps/admin/package.json` (one script line), `docs/staff-provisioning.md` (create). Task 4 writes only gitignored `apps/admin/.env.local` + `apps/api/.dev.vars` (no commit exists for it). Task 6 additionally rotates `docs/progress.md` and `docs/plan.md` (M4 checkboxes 2 + 4 + the checkbox-3 note) and writes gitignored evidence. NOT here: `/login` or any UI, `authClient`, the `_shell` gate, sign-out (#120); the api verification instance / `requireSession` / appointments gating / session-scoped client (#121); live Worker secret puts, teaser/v1 live verification, tech-stack/AGENTS/CONTEXT rotation (#122); any `apps/landing` or `apps/api` source change; any `packages/db` change (the auth tables already exist); any test file (admin has no vitest — the spec's testing posture verifies this ticket's wiring by the live gate).
- **Type-error policy:** if `pnpm typecheck` flags anything in the new files, fix it at the type level without changing runtime semantics and without `any`; the spike-validated shapes are known-good, so a type error means something outside this plan's fence moved — reconcile it, do not reshape the mounting.

---

### Task 1: The `/api/auth/*` catch-all route — BetterAuth's handler, per request

**Files:**
- Create: `apps/admin/src/routes/api/auth/$.ts`
- Modify (tool-written): `apps/admin/src/routeTree.gen.ts` (via `generate-routes`)

**Interfaces:**
- Consumes: `createAuth(databaseUrl?)` from `apps/admin/src/lib/auth.ts` (#118's factory — config-pure, `disableSignUp`, `tanstackStartCookies()` last, database-backed rate limiting).
- Produces: the admin Worker's HTTP auth surface — every BetterAuth endpoint (`/api/auth/ok`, `/sign-in/email`, `/sign-out`, …) answers through `auth.handler(request)`; `tanstackStartCookies()` (last plugin inside `createAuth`) sets the session cookie through Start's request context. This is the surface Task 5 curls and #120's login form posts to.

**Not here:** any endpoint definition of our own (BetterAuth's internal router resolves method+path — the route file adds no handlers beyond the GET/POST pass-through; BetterAuth's endpoints are GET or POST, so those two methods cover the surface); the session server-fns (Task 2); any UI (#120).

- [ ] **Step 1: Create the route file**

Create `apps/admin/src/routes/api/auth/$.ts` with exactly this content (biome's `pnpm fix` may reflow it afterwards — content is the pin):

```ts
// BetterAuth's route surface (M4 spec § The admin auth server): the catch-all
// under /api/auth/* hands every request to auth.handler — BetterAuth's own
// router resolves the method+path (/ok, /sign-in/email, /sign-out, …). The
// instance is constructed PER REQUEST over a per-request db client (ADR-0011):
// the drizzle adapter captures the db it is given, so a module-scope instance
// would break every request after the first per isolate. tanstackStartCookies
// (the last plugin inside createAuth) sets the session cookie through
// TanStack Start's request context. #120's login form posts here; the session
// server-fns live in auth.functions.ts, not this file.
import { createFileRoute } from '@tanstack/react-router';

import { createAuth } from '#/lib/auth';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => createAuth().handler(request),
      POST: ({ request }) => createAuth().handler(request),
    },
  },
});
```

- [ ] **Step 2: Regenerate the route tree and typecheck**

`tsc` does not regenerate the route tree (pre-generation, `'/api/auth/$'` fails against `keyof FileRoutesByPath`), so the generate step is load-bearing and comes first:

```bash
pnpm --filter @sevendays/admin generate-routes
pnpm --filter @sevendays/admin typecheck
git status --short
```

Expected: `tsr generate` prints its benign `replaceRouteChunk` circular-dependency warning (Node warning text, not a failure); typecheck green; `git status` shows the new `apps/admin/src/routes/api/auth/$.ts` and a modified `apps/admin/src/routeTree.gen.ts` (the `/api/auth/$` entry joining the tree) — nothing else.

- [ ] **Step 3: Verify the generated tree carries the route**

```bash
grep -n "api/auth" apps/admin/src/routeTree.gen.ts | head -5
```

Expected: the generated tree references the `/api/auth/$` route id/path (the `ApiAuthRoute` interface or equivalent declaration block). If the tree does not carry it, STOP and report — the mounting claim was spike-proven against exactly this flow.

- [ ] **Step 4: The module-scope gate**

```bash
grep -rn "betterAuth(" apps/admin/src --include="*.ts" --include="*.tsx"
grep -rn "createAuth(" apps/admin/src --include="*.ts" --include="*.tsx"
grep -rn "auth.config" apps/admin/src --include="*.ts" --include="*.tsx" | grep -v "src/lib/auth.config.ts"
```

Expected: `betterAuth(` appears ONLY inside `src/lib/auth.ts` (the factory body); `createAuth(` appears in `src/lib/auth.ts` (the definition), `src/lib/auth.config.ts` (the fenced CLI one-shot — the single permitted module-scope construction, Node tooling only), and `src/routes/api/auth/$.ts` (called inside the handlers, per request); the third grep returns ZERO rows — nothing imports `auth.config.ts`. Any other hit is a STOP-and-report finding.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/routes/api/auth/$.ts apps/admin/src/routeTree.gen.ts
git commit -m "feat(admin): /api/auth/* live — BetterAuth's handler mounted per request (#119)

The catch-all route hands every /api/auth/* request to auth.handler
(BetterAuth's own router resolves /ok, /sign-in/email, /sign-out, …);
the instance is constructed inside the handler over a per-request
packages/db client (ADR-0011 — the drizzle adapter captures the db, so
module scope breaks after the first request per isolate). Spike-proven
mounting: server.handlers is typed by start-client-core's route
augmentation (react-start 1.168.56 / react-router 1.170.38); routeTree
regenerated via tsr generate."
```

---

### Task 2: The session server functions — `getSession` / `ensureSession`

**Files:**
- Create: `apps/admin/src/lib/auth.functions.ts`

**Interfaces:**
- Consumes: `createAuth` from `./auth` (the factory); `createServerFn` from `@tanstack/react-start`; `getRequestHeaders` from `@tanstack/react-start/server`; `startSpan` from `@sentry/tanstackstart-react` (the server-fn house rule — `api.functions.ts` is the precedent; no-op when Sentry is uninitialized in dev).
- Produces: `getSession()` → `{ session, user } | null` and `ensureSession()` → the same session or a thrown `Error('Unauthorized')` — the UI-free helpers #120's `_shell` `beforeLoad` gate and login round-trip consume (spec § The admin auth server, "Session checks server-side"; the ticket's AC list doesn't re-name them, but the spec's ticket-2 split assigns them here and #120 is fenced off from creating them).

**Not here:** any caller (nothing invokes these until #120 — they are exported and unused this ticket, which typecheck and lint both allow); touching `auth.ts`/`auth.config.ts` (#118's frozen pair); `authClient` (browser-side, #120).

- [ ] **Step 1: Create the file**

Create `apps/admin/src/lib/auth.functions.ts` with exactly this content (this exact shape typechecked clean in the pre-plan spike; biome may reflow formatting — content is the pin):

```ts
// Session checks (M4 spec § The admin auth server): TanStack Start server
// functions so the shell gate and login round-trip (#120) can ask "who is
// signed in" server-side. Per-request auth instance over a per-request db
// client (ADR-0011) — the same rule the /api/auth route follows; never a
// module-scope instance. Sentry span per the server-fn house rule (no-op
// when Sentry is uninitialized — dev without VITE_SENTRY_DSN).
import { startSpan } from '@sentry/tanstackstart-react';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { createAuth } from './auth';

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'auth getSession' }, async () => {
    const headers = getRequestHeaders();
    return createAuth().api.getSession({ headers });
  });
});

export const ensureSession = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'auth ensureSession' }, async () => {
    const headers = getRequestHeaders();
    const session = await createAuth().api.getSession({ headers });
    if (!session) {
      throw new Error('Unauthorized');
    }
    return session;
  });
});
```

- [ ] **Step 2: Typecheck + the per-request gate, extended**

```bash
pnpm --filter @sevendays/admin typecheck
grep -rn "createAuth(" apps/admin/src --include="*.ts" --include="*.tsx"
```

Expected: typecheck green; the grep now additionally shows `createAuth(` in `src/lib/auth.functions.ts` — twice, both INSIDE the `startSpan` callbacks (request scope), none at module top level. 

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/lib/auth.functions.ts
git commit -m "feat(admin): session server fns over per-request auth instances (#119)

getSession/ensureSession as TanStack Start server functions (the
documented Start pattern fitted to the factory): getRequestHeaders →
auth.api.getSession, one fresh instance per call over a per-request db
client (ADR-0011), Sentry span per the server-fn house rule. Consumed
by #120's _shell gate — nothing calls them yet."
```

---

### Task 3: The `create-staff` script + the in-repo provisioning/reset runbook

**Files:**
- Modify: `apps/admin/package.json` (one script line)
- Create: `docs/staff-provisioning.md`

**Interfaces:**
- Consumes: the CLI contract pinned in the header (`auth@1.7.5 create-admin`: interactive password when `--password` is omitted, confirmation when users exist, `auth.api.createUser` under the hood, requires the admin plugin + a live DB); `dotenv-cli` (already a dependency); `apps/admin/src/lib/auth.config.ts` (the CLI's config entry — reads `DATABASE_URL`/`BETTER_AUTH_SECRET` from `.env.local` via the script's dotenv).
- Produces: `pnpm --filter @sevendays/admin create-staff --email <email> --name "<name>"` — the ONLY user-creation path (self-serve sign-up is refused) and the v1 password-reset path, documented in-repo (the AC's "documented in-repo as the v1 provisioning **and** password-reset path"). Task 5 exercises it for real; #122 points the owner at the same doc for the teaser/v1 targets.

**Not here:** running the command (Task 5); `--password`/`--force`/`--yes` anywhere (GC); a Node script file that wraps the CLI (the spec's "script wrapping" is the package.json one-liner — `pnpm dlx` stays the pinned invocation, and pnpm's verbatim arg forwarding (probed) carries the owner's `--email`/`--name` through); a Settings→Users screen or any user-management UI (v1 out-of-scope); email flows (none in v1).

- [ ] **Step 1: Add the script**

In `apps/admin/package.json`'s `"scripts"` object, insert after the `"generate-routes": "tsr generate",` line:

```json
    "create-staff": "dotenv -e .env.local -- pnpm dlx auth@1.7.5 create-admin --config src/lib/auth.config.ts --role admin",
```

(`--config` resolves against the script's cwd — pnpm --filter runs it in `apps/admin`, so it names `src/lib/auth.config.ts`; `--role admin` is pinned in the wrapper per the spec's command shape — it is also the CLI's default, made explicit. The owner's `--email`/`--name` append verbatim at invocation.)

- [ ] **Step 2: Write the runbook**

Create `docs/staff-provisioning.md` with exactly this content:

````markdown
# Staff provisioning & password reset (v1)

The admin app has no self-serve sign-up (`disableSignUp: true` —
`apps/admin/src/lib/auth.ts`): the only way a staff user comes to exist is the
owner-run `create-staff` command, and the same command is the v1
password-reset path. There is no email flow — resets are owner-operated by
design (the #75 handover model: the owner operates v1's machinery for its
life). M4 spec: `docs/specs/2026-09-22-m4-admin-auth-spec.md` § Staff
provisioning.

## Creating a staff user

Prerequisites (the dev machine already has these; a fresh clone needs all):

1. `pnpm install && pnpm build:packages` — the CLI loads
   `apps/admin/src/lib/auth.config.ts`, which imports `@sevendays/db`'s
   built `dist/`.
2. `apps/admin/.env.local` carrying `DATABASE_URL` (the pooled transaction
   URL, ADR-0007), `BETTER_AUTH_SECRET` (32+ chars, shared with the api),
   and `BETTER_AUTH_URL` — see `apps/admin/.env.example`. For the deployed
   targets the same values live as Worker secrets/vars (#122's table).
3. The auth tables applied (migration 0005 — done on the shared database).

Run from anywhere in the repo:

```sh
pnpm --filter @sevendays/admin create-staff --email <email> --name "<name>"
```

- The command wraps the version-pinned BetterAuth CLI
  (`pnpm dlx auth@1.7.5 create-admin --config src/lib/auth.config.ts
  --role admin`); it creates the user through BetterAuth's own server-side
  `auth.api.createUser` path — password hashed with scrypt, `role` = admin,
  email marked verified.
- **The password is prompted interactively** — it never rides a flag, a
  file, or a script argument. Choose 12+ characters
  (`minPasswordLength: 12`).
- If users already exist, the CLI asks for confirmation before creating
  another.

## Resetting a staff password

1. Remove the stale row — its sessions and accounts cascade with it (the
   FKs are `on delete cascade`):

```sh
cd packages/db && node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const gone = await sql`delete from \"user\" where email = 'OWNER_EMAIL_HERE'`;
console.log('deleted', gone.count, 'user row(s); sessions and accounts cascaded');
await sql.end();
"
```

2. Re-run the create command above with a new password.

Every session died with the row, so the staff member signs in again with the
new password. (`revokeSessionsOnPasswordReset` in the config covers future
in-app resets; v1 resets are this path.)

## Verifying sign-in (dev)

With `pnpm --filter @sevendays/admin dev` running (port 3000):

```sh
curl -sS -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d '{"email":"<email>","password":"…"}'
```

→ `200` with a `set-cookie: better-auth.session_token=…` header (dev; the
cookie is `__Secure-`-prefixed in production). A wrong password returns
`401 {"code":"INVALID_EMAIL_OR_PASSWORD","message":"Invalid email or
password"}` — the generic response; the login UI never says which field was
wrong.
````

- [ ] **Step 3: Format + verify**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin lint
grep -n '"create-staff"' apps/admin/package.json
grep -c "better-auth.session_token" docs/staff-provisioning.md
git status --short
```

Expected: biome clean; the script line present exactly once; the runbook references the dev cookie name; `git status` shows exactly `apps/admin/package.json` modified + `docs/staff-provisioning.md` new.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/package.json docs/staff-provisioning.md
git commit -m "feat(admin): create-staff CLI wrapper + the provisioning/reset runbook (#119)

pnpm --filter @sevendays/admin create-staff wraps the pinned
auth@1.7.5 create-admin over .env.local (owner passes --email/--name;
the password is prompted interactively — never a flag or a file, and
the existing-users confirmation stays on). docs/staff-provisioning.md
is the in-repo v1 provisioning AND password-reset path: prerequisites,
the create command, the cascade-delete reset, and the dev sign-in
verification."
```

---

### Task 4: Local dev env values (gitignored — this task has NO commit)

**Files:**
- Modify (local only, gitignored): `apps/admin/.env.local` (append `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
- Modify (local only, gitignored): `apps/api/.dev.vars` (append the SAME `BETTER_AUTH_SECRET`)

**Interfaces:**
- Consumes: `apps/api/.dev.vars`'s existing `DATABASE_URL` (the pooled transaction URL — the same ADR-0007 topology admin's auth server needs); `apps/admin/.env.example`'s documented key set (#118).
- Produces: the dev environment Task 5 boots against — the admin dev server with `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` in process.env (the dotenv-loaded vite process — the same path `API_URL` already flows through), and the CLI's `.env.local` for `create-staff`. The api copy of the secret sits dormant until #121 wires the verification instance (one secret, two files — the ADR-0004 shared-secret note in the env example).

**Not here:** committing anything (`.gitignore:16-21` excludes both files — verify at the end); touching `.env.example`/`.dev.vars.example` (#118 landed them); generating Worker secrets (#122); writing any value into the plan/evidence/PR (GC secrets rule).

- [ ] **Step 1: Confirm the keys are absent, then fill `apps/admin/.env.local`**

```bash
cd /home/jeius/Projects/sevendays
grep -nE '^(DATABASE_URL|BETTER_AUTH_SECRET|BETTER_AUTH_URL)=' apps/admin/.env.local && echo "ALREADY PRESENT — dedupe before appending" || echo "absent — proceeding"
DBURL=$(grep -E '^DATABASE_URL=' apps/api/.dev.vars | cut -d= -f2-)
[ -n "$DBURL" ] || { echo "apps/api/.dev.vars has no DATABASE_URL — STOP"; exit 1; }
printf '\n# M4 (dev): the auth server env — see .env.example\nDATABASE_URL=%s\n' "$DBURL" >> apps/admin/.env.local
printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -base64 32)" >> apps/admin/.env.local
printf 'BETTER_AUTH_URL=http://localhost:3000\n' >> apps/admin/.env.local
```

- [ ] **Step 2: Mirror the secret into `apps/api/.dev.vars`**

```bash
SECRET=$(grep -E '^BETTER_AUTH_SECRET=' apps/admin/.env.local | cut -d= -f2-)
grep -q '^BETTER_AUTH_SECRET=' apps/api/.dev.vars || printf '\n# shared with apps/admin/.env.local (ADR-0004 — consumed by #121\'s verification instance)\nBETTER_AUTH_SECRET=%s\n' "$SECRET" >> apps/api/.dev.vars
```

- [ ] **Step 3: Verify — four keys, nothing staged**

```bash
grep -oE '^[A-Z_]+' apps/admin/.env.local
grep -oE '^[A-Z_]+' apps/api/.dev.vars
git status --short | grep -E 'env.local|dev.vars' && echo "LEAK — unstage and investigate" || echo "gitignored — clean"
git check-ignore apps/admin/.env.local apps/api/.dev.vars
```

Expected: admin's keys are `API_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`; api's gain `BETTER_AUTH_SECRET` beside `DATABASE_URL`/`LANDING_ORIGIN`/`RESEND_API_KEY`; the git-status grep finds nothing (both files check-ignore-confirmed). No values are printed by these commands — keep it that way in the evidence file.

---

### Task 5: The live dev verification — probe, refusal, provisioning, sign-in, Postgres rows

**Files:**
- Create (gitignored): `.superpowers/sdd/2026-09-22-119-admin-auth-server/evidence.md` (written at Step 6)

**Interfaces:**
- Consumes: Tasks 1–4 (the route, the env values); `packages/db`'s built `dist/` (`pnpm build:packages` — the CLI's jiti config-load and the dev boot both resolve `@sevendays/db` through it); `packages/db/.env`'s `DATABASE_MIGRATE_URL` for the Postgres probes.
- Produces: the ticket's verification ACs, evidenced — `/api/auth/ok` answering in dev, sign-up refused, a real staff user in the shared dev database, an HTTP sign-in that sets the session cookie, a wrong-password 401 with the generic body, and the session row visible in Postgres.

**Not here:** any browser/UI pass (#120 owns the visible vertical; this ticket's AC is explicitly curl-level); the teaser/v1 deployed targets (#122); revocation-after-sign-out proofs via `authClient` (the curl-level sign-out check here is optional color, not an AC — skip it rather than improvise UI); touching committed code (a failure here is a finding for Tasks 1–4, not an edit-permission).

**Pinned expectations (GC "Pinned runtime literals" + the token-storage finding):** `/ok` → 200 `{"ok":true}`; sign-up → 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`; sign-in ok → 200, `"token"` in body, `set-cookie: better-auth.session_token=…`; sign-in wrong → 401 `INVALID_EMAIL_OR_PASSWORD` / "Invalid email or password"; the stored `session.token` is the **bare 32-char token, verbatim and unhashed** (`dist/db/internal-adapter.mjs`: `token: generateId(32)`); the sign-in body's `token` equals the row verbatim (`dist/api/routes/sign-in.mjs` returns `token: session.token`), and the cookie value is `<token>.<signature>` (`setSignedCookie`, `dist/cookies/index.mjs:172`) — equality holds on the token segment, never the full cookie string (live-verified 2026-09-22; evidence file). The spec's "stored token is a BetterAuth hash" sentence is version-stale — Task 6 records the finding for #121 (whose no-hand-rolled-lookup RULING is strengthened by the signature: hand-rolled cookie-string lookup can never match).

- [ ] **Step 1: Build packages, boot the admin dev server, probe `/ok`**

```bash
cd /home/jeius/Projects/sevendays
pnpm build:packages
(pnpm --filter @sevendays/admin dev > /tmp/sevendays-admin-dev.log 2>&1 &)
for i in $(seq 1 60); do curl -fsS http://localhost:3000/api/auth/ok >/dev/null 2>&1 && break; sleep 2; done
curl -sS -i http://localhost:3000/api/auth/ok
tail -5 /tmp/sevendays-admin-dev.log
```

Expected: after the poll loop, `HTTP/1.1 200 OK` and body `{"ok":true}` — the **amended** probe literal (the ticket's `{"status":"ok"}` is corrected by this plan; GC evidence). If the loop times out, read the log tail: a `DATABASE_URL is not set` throw means Task 4's file didn't load (the dev script's dotenv reads `apps/admin/.env.local`) — fix Task 4, not the code.

- [ ] **Step 2: Self-serve sign-up refused**

```bash
curl -sS -i -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"email":"intruder@sevendays.test","password":"not-gonna-happen-123","name":"Intruder"}'
```

Expected: `HTTP/1.1 400 Bad Request` with `{"message":"Email and password sign up is not enabled","code":"EMAIL_PASSWORD_SIGN_UP_DISABLED"}` (field order may vary). Record status + body in the evidence file. (Rate-limit note: `/sign-in/email` allows ~3 attempts per 10s under the database-backed defaults — this whole task makes 2 sign-in attempts, under the limit; if a `429` ever appears, wait 10 seconds and re-run the single call.)

- [ ] **Step 3: Provision the staff user, sign in, fail wrong, inspect Postgres — ONE Bash invocation**

The password must live only in this invocation's shell variables (GC: never a flag, file, or durable artifact), so creation and both sign-ins run in one block. `owner@sevendays.test` / `Studio Owner` are pinned dev-row values (a dev credential in the shared dev database — not catalog data; reset is the documented runbook path):

```bash
set -o pipefail
cd /home/jeius/Projects/sevendays
STAFF_PASS=$(openssl rand -base64 18)
printf '%s\n%s\n' "$STAFF_PASS" "$STAFF_PASS" \
  | pnpm --filter @sevendays/admin create-staff --email owner@sevendays.test --name "Studio Owner" 2>&1 | tail -20
echo "=== SIGN-IN (correct password) ==="
RESP=$(curl -sS -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d "{\"email\":\"owner@sevendays.test\",\"password\":\"$STAFF_PASS\"}")
printf '%s\n' "$RESP" | grep -i '^HTTP/'
printf '%s\n' "$RESP" | grep -io 'set-cookie: better-auth.session_token=[^;]*' | sed -E 's/=(.{8}).*/=\1…(redacted)/'
printf 'body carries "token": '; printf '%s\n' "$RESP" | grep -c '"token"'
export COOKIE_TOKEN=$(printf '%s\n' "$RESP" | grep -io 'set-cookie: better-auth.session_token=[^;]*' | cut -d= -f2-)
echo "=== SIGN-IN (wrong password) ==="
curl -sS -w '\nHTTP %{http_code}\n' -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d "{\"email\":\"owner@sevendays.test\",\"password\":\"${STAFF_PASS}x\"}"
echo "=== SESSION + USER ROWS (Postgres) ==="
cd packages/db && COOKIE_TOKEN="$COOKIE_TOKEN" node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const users = await sql\`select id, email, name, role, email_verified from \"user\"\`;
const sessions = await sql\`select user_id, \"token\", expires_at from \"session\"\`;
console.log('users:', JSON.stringify(users, null, 1));
console.log('sessions:', JSON.stringify(sessions.map(s => ({ ...s, token: s.token.slice(0, 8) + '…(' + s.token.length + ' chars, redacted)' })), null, 1));
console.log('stored token equals the presented cookie value (verbatim in 1.7.5):', sessions.some(s => s.token === process.env.COOKIE_TOKEN));
await sql.end();
"
cd ../..
```

Expected, in order: the CLI tail shows its creation success (the user/email echoed, no error — `set -o pipefail` makes a CLI failure fail the block; the interactive password was fed twice on stdin — **if the prompt rejects non-TTY stdin** (hang or "cancelled" output), re-run just the `create-staff` pipeline as `printf '%s\n%s\n' "$STAFF_PASS" "$STAFF_PASS" | script -qec "pnpm --filter @sevendays/admin create-staff --email owner@sevendays.test --name 'Studio Owner'" /dev/null`, which gives the CLI a pty — the password still rides stdin to the prompt, never a flag or file); sign-in prints `HTTP/1.1 200 OK`, the redacted `set-cookie: better-auth.session_token=…` line, and `body carries "token": 1`; wrong-password prints the JSON body with `"code":"INVALID_EMAIL_OR_PASSWORD"` + `HTTP 401`; the Postgres probe shows ONE user row (`owner@sevendays.test`, `Studio Owner`, `role` = `admin`, `email_verified` = true), ≥1 session row whose `expires_at` is ~7 days out, and the token-relationship probe of record (superseded live-verified form, run 4): row token 32 chars verbatim/unhashed, sign-in body token == row token, cookie value = `<token>.<signature>` (79 chars, dot at index 32 — `setSignedCookie`, `dist/cookies/index.mjs:172`), so full-string cookie==row is false by design and equality holds on the token segment. Live note 2026-09-22: BOTH the plan's original non-TTY stdin feed and its pty fallback fail against this CLI's raw-mode prompt (the prompt consumes every piped line into one field → doubled password → 401; the pty run also echoed the password — that credential was burned and its row deleted per the runbook). The verified provisioning driver is TRUE interactive typing: a python pty driver (`task5-step3c.sh`/`task5-step3d.sh` in the SDD workspace) that waits for the prompt, types the password once with echo disabled, and lets the CLI submit on Enter.

- [ ] **Step 4: Stop the dev server**

```bash
pkill -f "vite dev --port 3000" && echo "admin dev stopped" || echo "already stopped"
```

- [ ] **Step 5: Write the evidence file**

Write `.superpowers/sdd/2026-09-22-119-admin-auth-server/evidence.md` with: Step 1's `/ok` response (status + body — the amended literal, noted), Step 2's 400 body, Step 3's outputs with every secret/password/token value redacted (the password is NOT recorded — record that it was generated in-session, stdin-fed, and discarded; the cookie token appears only as its 8-char prefix), and a line noting the token-storage finding for #121. Quote the same blocks into Task 6's PR body.

---

### Task 6: Full gate, docs rotation, PR, merge, and the watched deploy

**Files:**
- Modify: `docs/progress.md` (rotate the `_Last updated:` line + prepend the session paragraph)
- Modify: `docs/plan.md` (tick M4 checkboxes 2 and 4 with dated annotations; append the dev-values note to checkbox 3's text — it stays unticked)
- Create (gitignored): `.superpowers/sdd/2026-09-22-119-admin-auth-server/pr-body.md`
- The squash-merge PR `(#119)` + its watched deploy

**Interfaces:**
- Consumes: Tasks 1–5 (the branch state + evidence); the docs conventions (progress.md's single-paragraph session record; plan.md's `_(date: …)_` annotation style — #118's M4-box annotations are the direct precedent).
- Produces: the merged main whose push exercises the deploy legs; the docs state #120/#121's sessions read (progress says exactly what exists and carries the two dist-corrected literals forward); the evidence block Task 7's ledger row cites.

**Not here:** ticking M4 checkbox 3 (spans #122's live puts — only its dev-values note is added); checkbox 5 (login UI — #120), 6/7 (API verification/gating — #121), 8 (verify + picks close-out — #122's own rotation); tech-stack.md / AGENTS.md / CONTEXT.md (#122); closing any issue other than #119.

- [ ] **Step 1: The full gate**

```bash
pnpm check
graphify update .
```

Expected: `pnpm check` green, 35/35 turbo tasks (no test files or check-pipeline scripts were added — count unchanged from the #118-recorded baseline; if it differs, reconcile before proceeding). `graphify update .` rewrites `graphify-out/` (AST-only; the diff is expected house noise, commit it in Step 4).

- [ ] **Step 2: Rotate `docs/progress.md`**

Replace the current `_Last updated: 2026-09-22 (M4 ticket 01 landed — …` line (the one beginning `_Last updated: 2026-09-22 (M4 ticket 01 landed:`) with:

```markdown
_Last updated: 2026-09-22 (M4 ticket 02 landed — the admin auth server is live over HTTP: BetterAuth's handler serves `/api/auth/*` on the admin Worker (`server.handlers` catch-all; every auth-serving path builds its instance per request over a per-request db client, ADR-0011 — no module-scope instance anywhere except the fenced CLI entry); the `getSession`/`ensureSession` server fns exist for #120's gate; `create-staff` provisions real staff users (pinned `auth@1.7.5 create-admin` under the hood — password interactive-only) and `docs/staff-provisioning.md` is the in-repo create+reset runbook; the dev database holds the first staff user with a curl-verified session row. Two spec literals corrected by recon against the 1.7.5 dist: `/api/auth/ok` returns `{"ok":true}` (not `{"status":"ok"}`), and session tokens are stored VERBATIM, not hashed — recorded for #121's rationale. #120/#121 unblocked.)_
```

Then insert this paragraph directly under `# Progress` (above the #118 paragraph):

```markdown
2026-09-22 — #119 M4 ticket 02, the admin auth server, went live over HTTP ahead of any UI: `apps/admin/src/routes/api/auth/$.ts` mounts BetterAuth's handler as a TanStack Start server route (`server.handlers` GET/POST → `auth.handler(request)` per the BetterAuth Start integration — mounting spike-proven against the resolved react-start 1.168.56 / react-router 1.170.38: the `server` option is typed by start-client-core's route augmentation, and route file + `tsr generate` + typecheck ran clean end-to-end during planning); the instance is constructed inside the handler over a per-request `@sevendays/db` client (ADR-0011 — `createAuth()` per request, never module scope; the only module-scope construction left is `auth.config.ts`'s fenced CLI entry, which nothing at runtime imports — grep-gated). `apps/admin/src/lib/auth.functions.ts` adds the spec's session server fns (`getSession`/`ensureSession` — `createServerFn` + `getRequestHeaders` → `auth.api.getSession`, per-request instance, Sentry span per the server-fn house rule; #120's `_shell` gate consumes them, nothing calls them yet). `pnpm --filter @sevendays/admin create-staff` wraps the version-pinned `pnpm dlx auth@1.7.5 create-admin --config src/lib/auth.config.ts --role admin` over `.env.local` (owner passes `--email`/`--name`; the password is prompted interactively — never a flag or a file; the existing-users confirmation stays on as the reset path's safety), and `docs/staff-provisioning.md` documents it in-repo as the v1 provisioning AND password-reset path (create, cascade-delete reset, dev sign-in verification). Verified live in dev against the real tables: `/api/auth/ok` → 200 `{"ok":true}` (amended literal — the spec/ticket's `{"status":"ok"}` does not match the 1.7.5 dist's `ok.mjs`, which returns `{"ok":true}`); `POST /sign-up/email` refused 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED` (self-serve sign-up dead — the CLI is the only user-creation path); the first staff user provisioned (`owner@sevendays.test`, role admin, email verified) and an HTTP sign-in returned 200 with `set-cookie: better-auth.session_token=…` and a session row in Postgres (~7-day expiry); wrong password → 401 `INVALID_EMAIL_OR_PASSWORD` ("Invalid email or password" — the generic response). Recon finding recorded for #121: 1.7.5 stores `session.token` VERBATIM and unhashed (`internal-adapter.mjs` `token: generateId(32)`; the sign-in body's token equals the row verbatim) while the cookie value is `<token>.<signature>` (`setSignedCookie`, cookies/index.mjs:172) — the spec's "stored token is a BetterAuth hash" sentence is version-stale, cookie-vs-row equality holds only on the token segment, and the no-hand-rolled-lookup ruling is strengthened (hand-rolled cookie-string lookup can never match — expiry/refresh semantics and internals coupling rulings unchanged). Dev env values live in gitignored `.env.local`/`.dev.vars` (one `BETTER_AUTH_SECRET` mirrored to both per ADR-0004 — dormant in the api until #121). `pnpm check` 35/35; v1 pick + ledger row per the runbook. NOT yet true: no login UI or gate (#120), no api verification or appointments gating (#121), no live Worker secrets — the deployed teaser admin still cannot authenticate until #122 puts `BETTER_AUTH_SECRET`.
```

- [ ] **Step 3: Tick `docs/plan.md` M4 checkboxes 2 and 4 (+ checkbox 3's note)**

Three edits in the M4 block:

1. Checkbox 2 (`Admin auth server: …`): `- [ ]` → `- [✅]`, and append inside its trailing text (after `probe green`):

```markdown
 _(2026-09-22: ticket #119 landed — the route is `apps/admin/src/routes/api/auth/$.ts` (server.handlers GET/POST → auth.handler; mounting spike-proven on react-start 1.168.56), built per request over a per-request db client like the new `getSession`/`ensureSession` server fns (`auth.functions.ts` — #120's gate consumes them); probe green in dev with the corrected literal — `/api/auth/ok` returns `{"ok":true}` in 1.7.5, not the spec's `{"status":"ok"}`.)_
```

2. Checkbox 4 (`Staff provisioning: …`): `- [ ]` → `- [✅]`, and append inside its trailing text (after `(owner-operated, matching the #75 handover model)`):

```markdown
 _(2026-09-22: ticket #119 landed — `create-staff` wraps the pinned `auth@1.7.5 create-admin` (password interactive-only; existing-users confirmation on); `docs/staff-provisioning.md` is the in-repo create + reset runbook; the first staff user exists in the dev database, sign-in curl-verified with the session row visible in Postgres.)_
```

3. Checkbox 3 (`Env + secrets posture: …`) — STAYS `- [ ]`: append this note to the end of its text (after `dev .env.local/.dev.vars`):

```markdown
 _(2026-09-22 note via #119: the dev `.env.local`/`.dev.vars` values now exist locally — gitignored, uncommitted, one shared `BETTER_AUTH_SECRET`; only the live teaser/v1 puts remain, so the box stays unticked until #122.)_
```

- [ ] **Step 4: Commit docs, open the PR**

```bash
git add docs/progress.md docs/plan.md graphify-out
git commit -m "docs: M4 auth-server landed — progress rotation + checkboxes 2/4 ticked (#119)

progress.md carries the session record incl. the two dist-corrected
literals ({\"ok\":true} probe; verbatim token storage — flagged for
#121's rationale); plan.md's Admin auth server and Staff provisioning
boxes ticked with dated annotations; checkbox 3 stays open for #122's
live puts (dev-values note added)."
gh pr create --title "M4 ticket 02 — Admin auth server live: /api/auth routes, per-request instances, create-staff CLI" --body-file .superpowers/sdd/2026-09-22-119-admin-auth-server/pr-body.md
```

(The `pr-body.md` contents — fill the evidence quotes from Task 5's evidence file, then commit nothing from the sdd dir itself:)

```markdown
Implements #119 — the M4 admin auth server (routes, per-request instances, create-staff CLI). Spec: #117, plan: docs/superpowers/plans/2026-09-22-119-admin-auth-server.md.

## Acceptance criteria → evidence

- **BetterAuth's handler mounted per the TanStack Start integration** — `apps/admin/src/routes/api/auth/$.ts`: `server.handlers` GET/POST → `auth.handler(request)`, `tanstackStartCookies()` last inside `createAuth` (#118's factory, untouched). Mounting spike-proven at planning time against the resolved react-start 1.168.56 / react-router 1.170.38 (the `server` route option is typed by start-client-core's `FilebaseRouteOptionsInterface` augmentation; negative spike confirms the handler signature is enforced).
- **Per-request instances over per-request db clients; no module-scope auth instance** — `createAuth()` called inside the route handlers and inside both session-fn handlers; grep gate in Task 1 Step 4 (only the fenced CLI entry `auth.config.ts` constructs at module scope, and nothing imports it). <quote the three grep outputs>
- **`GET /api/auth/ok` in dev** — <quote Step 1's response>. One amendment: 1.7.5 returns `{"ok":true}`, not the ticket's `{"status":"ok"}` (dist `ok.mjs` evidence in the plan); verified against the installed package, recorded in the docs annotations.
- **Self-serve sign-up refused** — <quote Step 2's 400 + `EMAIL_PASSWORD_SIGN_UP_DISABLED` body>.
- **`create-staff` provisions a real staff user; documented in-repo as provisioning AND reset path** — `pnpm --filter @sevendays/admin create-staff --email owner@sevendays.test --name "Studio Owner"` (password stdin-prompted, never a flag/file); `docs/staff-provisioning.md` carries create + cascade-delete reset + verification. <quote the CLI tail>
- **HTTP sign-in sets the session cookie; wrong password generic; session row in Postgres** — <quote Step 3's three outputs, redacted>. Recon note for #121: the stored `session.token` is the bare 32-char token verbatim/unhashed in 1.7.5 (sign-in body token == row token) while the cookie value is `<token>.<signature>` (`setSignedCookie`) — the spec's "hash" sentence is version-stale and cookie-vs-row equality holds only on the token segment; a hand-rolled cookie-string lookup can never match (plan header records the dist citations + live evidence).
- **`pnpm check` green** — 35/35 turbo tasks.

## Not here (fences)

No login UI / gate / sign-out (#120), no api verification / gating / session-scoped client (#121), no live Worker secrets or teaser/v1 verification (#122), no landing/api/db source changes, no new tests (admin's vitest gap is standing — the spec's testing posture verifies this ticket by the live gate).
```

- [ ] **Step 5: Merge and watch the deploy run**

```bash
gh pr view --json url -q .url
gh pr merge --squash --delete-branch
gh run list --branch main --limit 1
gh run watch <run-id> --exit-status
```

Expected: the push-triggered run executes `check` then `Deploy teaser (main)` — all steps green, including `Deploy admin (sevendays-admin)` (the auth route rides the build; `BETTER_AUTH_URL` still deploys empty per #118's dormant-safe wiring). NOTE: the deployed teaser's `/api/auth/*` is NOT expected to answer until #122 puts `BETTER_AUTH_SECRET` on the Worker — the green deploy legs are this ticket's landing proof (the #118 precedent); the live auth gate is #122's AC. Record the run URL in the evidence file.

---

### Task 7: v1 pick + ledger row + issue close (the runbook tail)

**Files:**
- The pick executes ONLY in `~/Projects/sevendays-v1-seed` (never check `v1` out in the main workspace — runbook rule)
- Modify (on main, after the pick): `docs/agents/v1-picks.md` (ledger rows)

**Interfaces:**
- Consumes: the squash sha Task 6 merged (`git log origin/main -1 --format=%H` after the merge); the runbook `docs/agents/v1-picks.md` verbatim procedures (classifier `scripts/v1-triage.mjs`, locks incl. `node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed`).
- Produces: the v1 edition carrying the auth server (route, session fns, create-staff script, provisioning doc as the classifier rules it) so #120/#121's picks land onto it cleanly; the ledger row keeping main and v1 reconciled.

**Not here:** touching the database (the staff user and session row live in the SHARED dev database — the pick carries no data, and no migration runs); any v1-side auth verification (nothing can sign in on v1 until #122's secrets + #120's UI); closing any issue other than #119.

- [ ] **Step 1: Reconcile the backlog (main order)**

```bash
cd ~/Projects/sevendays-v1-seed && git status --short && git log --oneline -3
tail -5 ~/Projects/sevendays/docs/agents/v1-picks.md
```

Expected: the seed is clean at #118's pick sha or later; ledger rows are current through #118 (`35249a9`'s rows). If `f3f712e` (the M4 spec + tickets-cut commit) still lacks a row, record its mechanical skip row FIRST (docs/specs + plan/progress only — main-only paths; the row format follows the #113 mechanical-skip precedent), then proceed. Drain anything else pending before this ticket's pick — main order, always.

- [ ] **Step 2: Triage + pick this PR's squash**

Run the classifier per the runbook against the squash sha. Pre-mapped expectation: **PICK** (booking-free by construction; no appointments/api/db paths touched). v1-paths: `apps/admin/src/routes/api/auth/$.ts` (new — apply whole), `apps/admin/src/lib/auth.functions.ts` (new — apply whole), `apps/admin/package.json` (the one script-line hunk — applies clean), `apps/admin/src/routeTree.gen.ts` (apply the hunk, or drop it and run `pnpm --filter @sevendays/admin generate-routes` in the seed after the route file lands — either way the tree must carry `/api/auth/$` before the seed's typecheck); main-only: `docs/staff-provisioning.md`, `docs/progress.md`, `docs/plan.md` (checkbox annotations trip edition vocabulary — #122/#120 references; content-drop or drop whole per the classifier), `docs/superpowers/plans/*` (this file); `graphify-out/` — regenerated in the seed per the runbook's transformed-surface handling. The seed's `apps/admin/.env.local` is the owner's own — the pick never writes env values.

- [ ] **Step 3: Locks, push, watch (runbook verbatim)**

```bash
cd ~/Projects/sevendays-v1-seed && pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build && pnpm check && pnpm build
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed
cd ~/Projects/sevendays-v1-seed && git push
gh run watch <the-v1-push-run-id> --exit-status
curl -sS -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/
curl -sS -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/book
```

Expected: `pnpm check` green in the seed (the route file + regenerated tree + session fns typecheck there identically); audit exit 0 (none of this ticket's content trips the absence tokens — `BETTER_AUTH` appears nowhere in the audit's token list, confirmed against #118's pick); the push run shows `check` + `Deploy v1 (private)` success; live curls: landing `200`, `/book` `404`. Time-box one hour of conflict work per the runbook — beyond that, STOP and hand the row to the owner.

- [ ] **Step 4: Ledger row on main**

Back in the main workspace, append the row to `docs/agents/v1-picks.md`: date, #119, the squash sha, `pick`, the seed pick sha, and a notes cell covering: the two new files applied whole, the package.json script hunk, the routeTree handling (hunk or seed regeneration), the main-only docs drops, locks (check/build/audit results + run id), and the note that the shared dev database already carries the staff row (no v1 data step). Commit + push directly to main:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — #119 admin auth server picked (#119)"
git push
```

- [ ] **Step 5: Close the issue**

```bash
gh issue close 119 --comment "Auth server landed via PR #<pr-number> (squash <sha>): /api/auth/* serving on the admin Worker with per-request instances (ADR-0011), session fns for #120's gate, create-staff + docs/staff-provisioning.md as the v1 provisioning/reset path, and the dev-database verification quoted in the PR (probe, sign-up refusal, sign-in + cookie, wrong-password 401, Postgres session row). Two recon-corrected literals for the family: /api/auth/ok returns {\"ok\":true} in 1.7.5 (not {\"status\":\"ok\"}), and session tokens are stored verbatim (not hashed) — #121 should read the plan's header note before building its rationale. v1 picked as <seed-sha>, ledger row recorded. #120/#121 unblocked."
```

---

## Self-Review (recorded at planning time)

- **Spec coverage vs ticket AC:** handler mounted per the Start integration with `tanstackStartCookies()` last → Task 1 (the plugin ordering already lives inside #118's factory — untouched, verified by reading `apps/admin/src/lib/auth.ts`); per-request instances / no module-scope auth anywhere → Tasks 1–2 construction + the Task 1 Step 4 and Task 2 Step 2 grep gates; `/api/auth/ok` in dev → Task 5 Step 1 (with the amended `{"ok":true}` literal, GC-pinned with dist citation); `disableSignUp` refusal → Task 5 Step 2; `create-staff` + in-repo provisioning/reset documentation + a real staff user → Tasks 3 and 5; curl-verified sign-in with cookie, generic wrong-password response, session row in Postgres → Task 5 Step 3; `pnpm check` green → Task 6 Step 1. The spec's session-fn deliverable (not re-listed in the AC) → Task 2. Ticket deviations recorded: the `/ok` body literal, and the verbatim-token finding (flagged forward to #121 — this ticket verifies the REAL behavior either way).
- **Sibling fences:** #120's UI/gate/sign-out/authClient, #121's api instance/middleware/gating/session-scoped client, #122's live puts + milestone gate + docs rotation beyond progress/plan.md — each fenced in the header and in per-task Not-here blocks. Shared roadmap checkboxes: boxes 2 and 4 ticked (Task 6 Step 3); box 3 stays unticked with its note (Task 6 Step 3.3).
- **Type consistency:** `createAuth(databaseUrl = process.env.DATABASE_URL)` is #118's frozen definition — this plan only CALLS it (route handlers, session fns); no signature changes anywhere. File names referenced identically across tasks, commits, and docs: `apps/admin/src/routes/api/auth/$.ts`, `apps/admin/src/lib/auth.functions.ts`, `docs/staff-provisioning.md`. The spike-validated code blocks in Tasks 1–2 are the exact forms that typechecked in `apps/admin` on 2026-09-22.
- **Counts re-derived:** `pnpm check` 35/35 (no test files, no check-pipeline scripts — unchanged from #118's recorded baseline). Task 5 makes exactly 2 `/sign-in/email` attempts (1 good, 1 wrong) — under the ~3/10s sensitive-endpoint default, with the 429-remedy note pinned. Postgres probe expects exactly 1 user row (empty `user` table pre-ticket — migration 0005 applied greenfield at #118) and ≥1 session row. plan.md gains exactly 2 ticks (boxes 2, 4) + 1 annotation on an unticked box (3).
- **Mocked-boundary check:** no mocks exist in this plan — every Task 5 probe asserts against the real HTTP surface and the real database (the spec's testing posture for admin: live gate, not a suite); the only redaction transforms are display-only (`sed`/`slice` on printed output), never on the compared values (`sessions.some(s => s.token === process.env.COOKIE_TOKEN)` compares the full strings).



