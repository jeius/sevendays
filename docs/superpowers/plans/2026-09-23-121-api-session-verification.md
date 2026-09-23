# M4 Ticket 04 — API Session Verification + Appointments-List Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The API answers "who is calling": a verification-only BetterAuth instance (the `bearer()` plugin) over the shared auth tables backs a `requireSession` middleware that returns the uniform 401 envelope — applied to `GET /api/v1/appointments` so the M2 public-PII stopgap closes, while the single-get (`uuid-opacity`) and the booking POST stay public — plus the admin server-fn seam's `getSessionScopedApiClient()` (httpOnly cookie read server-side, `Authorization: Bearer` injected through the existing service-binding fetch), all proven by apps/api integration tests over real Postgres: no header / garbage / bad-signature / expired / revoked → 401, a real harvested session → 200 through the actual middleware.

**Architecture:** Six tasks: (1) the optional `BETTER_AUTH_SECRET` env seam (test-first), (2) the verification service — `createVerificationAuth` + `requireSession` + the `session` context variable — with its proof suite over the compose database, (3) the list gating + the seven-site blast radius in `appointments.test.ts`, (4) the admin seam's session-scoped client, (5) the full gate + docs rotation + PR/merge with the deploy watched, (6) the v1 pick (SPLIT pre-mapped) + ledger row + issue close. Every type-inference claim in this plan was spike-proven in `apps/api` (the consuming package) on 2026-09-23 — typecheck clean AND the full middleware flow run green against the compose Postgres — and every runtime literal was read off the installed `better-auth@1.7.5` dist. All spike files were deleted; the tree was clean before this plan was written.

**Tech Stack:** better-auth `1.7.5` (lockfile-resolved from the `^1.7.5` range #118 pinned — already a dependency of `apps/api`; v1.7 docs line, `better-auth.com/docs/llms.txt`), Hono 4 + `@hono/zod-validator` (the existing api stack), zod 4 (`^4.5.1`), `@sevendays/db` (drizzle + postgres.js over the compose test DB per ADR-0008), vitest 4, pnpm + Turborepo, GitHub Actions + Wrangler, `gh` CLI.

**Spec:** Implements ticket [#121 "M4 ticket 04 — API session verification + appointments-list gating"](https://github.com/jeius/sevendays/issues/121) (label `ready-for-agent`), whose parent is the M4 spec `docs/specs/2026-09-22-m4-admin-auth-spec.md` (issue #117 — § API-side session verification, § Closing the public appointments reads, § Testing posture are this ticket's sections). Key recon facts (2026-09-23, main `ac872d2` — #118/#119/#120 are merged; the auth tables live in the shared DB, the admin auth server + login UI + shell gate exist, and one `BETTER_AUTH_SECRET` is already mirrored into gitignored `apps/admin/.env.local` + `apps/api/.dev.vars` by #119's Task 4):

- **The bearer plugin's mechanics (read off the installed 1.7.5 dist, `dist/plugins/bearer/index.mjs`, then spike-proven live):** the plugin installs a `before` hook that fires when an `authorization` header is present — `Bearer <token>` where the token contains a `.` is used directly (URL-decoded if it contains `%`): **the signed cookie value `<token>.<signature>` IS the expected bearer form**. A token with no `.` (bare) is locally re-signed via `serializeSignedCookie("", token, secret)` — unless `requireSignature: true`, which this plan does not set (the spec pins plain `bearer()`). Either way the HMAC signature is verified with `createHMAC("SHA-256", "base64urlnopad").verify(c.context.secret, token, signature)` — **against the instance's OWN secret**, which is the mechanical reason the admin issuer and the API verifier must share `BETTER_AUTH_SECRET` (ADR-0004). On failure the hook returns without a session cookie → `getSession` null → 401. An `after` hook mirrors the session cookie's value to a **`set-auth-token` response header** on any response that sets the session cookie (sign-in, sign-up) — the harvest path the spec's testing posture names, and what the admin seam forwards. #119's live-verified finding still holds and still strengthens the no-hand-rolled-lookup ruling: `session.token` stores the bare 32-char token verbatim while the cookie/bearer form is `<token>.<signature>` (dot at index 32), so a raw `WHERE token = $1` against the presented value can never match.
- **The full call chain is spike-proven end-to-end (2026-09-23, this machine, compose Postgres up):** a throwaway `apps/api/src/services/auth.ts` + `test/helpers/auth.ts` + `test/require-session.test.ts` typechecked clean under `tsc --noEmit` AND ran green — 9/9 tests (the 7 scratch-app middleware tests this plan pins in Task 2, PLUS two real-app gating tests on `/api/v1/appointments` whose assertions this plan re-expresses as Task 3's appointments-suite edits, keeping the picked file bookings-string-free) covering: no header → 401 `{ error: 'Authentication required.' }`; garbage bare token → 401; signed-form token with a bad signature → 401; db-expired session → 401; BetterAuth-`signOut`-revoked session → 401; a real `signUpEmail`-harvested token → 200 with the session's `user.id` readable from Hono context (both on the scratch app and through the real gated app); missing `BETTER_AUTH_SECRET` → the middleware throws (500 through the root `onError`). The inference claims specifically proven: `auth.api.getSession({ headers: c.req.raw.headers })` typechecks (Hono's request exposes the raw `Headers` at `c.req.raw.headers`); `ReturnType<typeof createVerificationAuth>['$Infer']['Session']` derives the session type; `c.set('session', …)` accepts it against `Variables: { db: Database; session?: SessionData }`; `requireSession` composes in the chained `.get(path, middleware, validator, handler)` without breaking Hono RPC inference.
- **The api-client drift check is proven too:** with the gate applied, `pnpm --filter @sevendays/api build` is green and the api-client suite passes 29/29 (incl. loopback) — no wrapper signature moved, so the ticket's "loopback tests unchanged" AC holds by construction (ADR-0006 discipline, no api-client edit in this plan).
- **The optional-secret ruling (this plan's one AC-shaping decision):** `BETTER_AUTH_SECRET` joins `envSchema` as `z.string().min(1).optional()` — NOT required. `acquireDb` parses the full schema for every `/api/v1` request, so a required key would turn a secretless Worker's public endpoints (branches, packages, single-get, booking POST) into uniform 500s. Instead `requireSession` owns the loud failure: a missing secret throws (the `createAuth`/`getApiUrl` "No fallback by design" posture) and the root `onError` answers the gated route with the uniform 500. Consequence to record in the PR body: between this ticket's merge and #122's one-time `wrangler secret put`, the deployed teaser's `GET /api/v1/appointments` answers 500 (not 401) — the same dormant-window shape #118/#119/#120 accepted (green deploy legs are the landing proof; the live gate is #122's AC), and nothing public degrades.
- **The blast radius is enumerated and was confirmed live (exactly 7 failing list-GET sites in `apps/api/test/appointments.test.ts`, nothing else in the repo):** 'returns the created appointment, newest first', 'filters by branch', 'returns an empty list for an unknown branch', 'rejects a malformed branchId with 400', 'caps the list at 200', 'serves through the api-client-free public surface (no auth yet — Known Gap)' (its assertion becomes FALSE — this ticket closes the gap it names), and 'returns the same shape as the list endpoint (single-get parity)' (its list call). Every POST test and single-get test in the file stayed green unauthenticated in the spike run — the stays-public halves of the AC are proven by the suite remaining unchanged there, plus one new explicit uuid-opacity test. `apps/landing` calls only `appointments.get({ param })` + `appointments.create` (single-get + POST, both public — zero landing changes); `apps/admin` has no appointments API caller today (the `_shell.appointments` screen is the M3 stub); `packages/api-client` is untouched.
- **Test-architecture ruling (audit-token discipline, `docs/agents/v1-picks.md`):** the middleware's semantics are proven on a scratch Hono app (acquireDb + requireSession + a probe route) inside `test/require-session.test.ts` + `test/helpers/auth.ts`, which carry **no appointments-path strings** — so the v1 pick can carry them and v1 keeps real coverage of the middleware (the spec's v1 posture: "the middleware exists and is proven by tests"). The real-app gating assertions (401 without auth / 200 with auth on `/api/v1/appointments`) live in `appointments.test.ts`, which is main-only at pick time (the file doesn't exist on v1). The scratch app mounts no `onError` — its missing-secret case asserts the bare 500; the root app's uniform-500 envelope is `test/error-seam.test.ts`'s coverage.
- **The test-shaped issuer (spec § Testing posture, spiked):** `createTestAuth(databaseUrl)` = betterAuth over its own `createDbClient(databaseUrl)` with sign-up ENABLED, `bearer()`, `rateLimit: { enabled: false }` (the ~3/10s sensitive-endpoint default would 429 a suite that signs up per test), and the SAME secret as `testEnv` — signature verification is why both sides must share it. Sessions are minted through `auth.handler(request)` (POST `/api/auth/sign-up/email` — the real HTTP surface) and harvested from `set-auth-token`; revocation goes through `auth.api.signOut({ headers })` (BetterAuth's own server API). The expiry case updates the row's `expires_at` to the past via drizzle (the bare token is `token.split('.')[0]` — the stored form) rather than mocking the clock: it reaches BetterAuth's own expiry comparison identically with zero global-mock risk (the spec's "where practical" satisfied; the `past_datetime` fake-clock precedent stays what it is — a module-seam test). `truncateAll` already covers the auth tables (the truncate list derives from the schema barrel, which exports them since #118) — every test starts with clean `user`/`session`/`account`/`verification`/`rate_limit` tables, so per-test sign-ups are deterministic.
- **The admin seam (Task 4) has no caller this ticket — by design:** the admin reads no gated endpoint today (the dashboard is v2), so `getSessionScopedApiClient(cookieHeader)` lands exported-and-unused (the #119 session-fns precedent: typecheck and lint allow it) for #122's live probe and M5's CMS routes. It takes the raw cookie header STRING as its parameter (callers pass `getRequestHeaders().get('cookie')`) so `api.server.ts` gains no TanStack import and stays the pure server-only lib it is. Admin has no vitest (standing gap, spec § Testing posture: "keep the seam logic thin … the api suite owns the logic it can reach") — the seam's verification is #122's live gate.
- **Baselines (live, 2026-09-23):** `apps/api` = **93 tests / 12 files, all passing** over the compose DB; after this ticket it must be **103 tests / 13 files** (+7 in the new `require-session.test.ts`, +2 in `src/env.test.ts`, +1 uuid-opacity test in `appointments.test.ts`, the Known-Gap test replaced 1:1 by the 401 test). `pnpm check` = 35/35 turbo tasks (no scripts added — count unchanged; the spec's "the api suite count grows by the auth tests" is the +10 visible inside the api package). Compose db: `docker compose up -d db` (CI runs the same suite against a postgres:17 service with `TEST_DATABASE_URL` — `.github/workflows/ci.yml`).
- **Sibling fences (spec § Tickets; `docs/plan.md`'s red-penciled M4 block):** #122 owns the live secret/var puts on all four targets, the teaser/v1 live gates (the authenticated read through the seam happens there), the v1-picks close-out for the whole milestone, and the docs rotation beyond `docs/progress.md`/`docs/plan.md` (tech-stack Auth section, AGENTS.md auth-state flip, CONTEXT glossaries) — **not here**. This ticket ticks M4 checkboxes 6 ("API session verification…") and 7 ("Public appointments list closed…") with dated annotations; checkbox 3 (Env + secrets posture) stays unticked until #122's live puts (its dev-values note from #119 already covers what exists); checkbox 8 (Verify + picks close-out) is #122's. Nothing in `apps/landing` changes.
- **v1-picks state:** the ledger (`docs/agents/v1-picks.md`) is current through #120 (seed at `199aad7`). This PR is booking-free in its middleware half but touches `routes/appointments.ts` → **SPLIT** pre-mapped (Task 6): v1-paths = the three new files applied whole (`apps/api/src/services/auth.ts`, `apps/api/test/helpers/auth.ts`, `apps/api/test/require-session.test.ts`) + four hunks (`env.ts`, `env.test.ts`, `services/db.ts`, `test/helpers/env.ts`); main-only = `routes/appointments.ts` + `test/appointments.test.ts` (both absent on v1 — edits drop), docs, plans, `graphify-out/` (regenerated in the seed). v1's `routes/v1.ts` exports `acquireDb` (booking-free infrastructure, present since the seed) so the picked test file resolves its import there.

## Global Constraints

- **Branch & baseline:** `feat/121-api-session-verification` off main `ac872d2` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#121)` squash style; every commit below is pinned verbatim.
- **Gates (repo AGENTS.md, verbatim duties):** do not commit code that fails `pnpm check` (lint + format + typecheck + test; expected 35/35 turbo tasks — no scripts are added, so the count is unchanged from the #118-recorded baseline; the api package's own suite must read 103 passed / 13 files at the final gate — if either count differs, reconcile before proceeding). Integration tests need the compose db up: `docker compose up -d db` first. After any fresh clone, `pnpm build:packages` must precede `pnpm check`. Tick checklist boxes with `- [✅]`, never `[x]`. Run `graphify update .` at close (code was modified). Evidence lands in gitignored `.superpowers/sdd/2026-09-23-121-api-session-verification/`.
- **Version pins:** `better-auth` resolves `1.7.5` from the `^1.7.5` range already in `apps/api/package.json` (verify with `pnpm --filter @sevendays/api list better-auth --depth 0` before Task 2; if anything other than 1.7.5 resolves, STOP and report). The `bearer` plugin imports from `better-auth/plugins` (dist-verified export); the drizzle adapter from `better-auth/adapters/drizzle` — the same subpaths `apps/admin/src/lib/auth.ts` already uses. Every BetterAuth doc consult during execution uses the **v1.7** line (`https://better-auth.com/docs/llms.txt`), never unversioned pages.
- **Pinned runtime literals (spike-proven 2026-09-23 against the installed 1.7.5 + compose Postgres; owner-ratified spec values):** the 401 body is exactly `{"error":"Authentication required."}` (`details` omitted by design); sign-up via the handler returns 200 and the `set-auth-token` response header carries the `<token>.<signature>` cookie value; the stored `session.token` is the bare token (`token.split('.')[0]`); a valid harvested token → 200 through the real middleware with the session in Hono context; a missing `BETTER_AUTH_SECRET` makes `requireSession` throw → the root `onError`'s uniform 500 (bare 500 on the scratch app, which mounts no onError). If any gate run returns a different shape, STOP and report — do not loosen the assertion to make it pass.
- **The per-request rule (ADR-0011, binding):** `requireSession` constructs the verification instance INSIDE the middleware over `c.get('db')` — the per-request handle `acquireDb` already placed in context. There is NO module-scope auth instance anywhere in `apps/api` (Task 2's grep gate enforces: `betterAuth(` appears only inside the factory body). The secret is passed explicitly (`createVerificationAuth({ database, secret })`) — never env-auto-read — because tests and the Worker both carry env through `c.env`, not `process.env`.
- **The optional-secret ruling (binding):** `BETTER_AUTH_SECRET` is `z.string().min(1).optional()` in `envSchema` — absent parses, empty rejects. It must NOT be made required (that would 500 every public `/api/v1` endpoint on the secretless teaser). The loud missing-secret failure belongs to `requireSession` (throw → uniform 500 on gated routes only). The teaser window (merge → #122's `wrangler secret put`: the deployed list answers 500, everything public unaffected) is expected, gets a line in the PR body, and is #122's to close.
- **Secrets (standing rule):** real secret values live only in gitignored files (`apps/admin/.env.local`, `apps/api/.dev.vars`) or Worker secrets. The ONLY secret-shaped string this plan commits is `TEST_AUTH_SECRET` in `apps/api/test/helpers/env.ts` — a pinned placeholder for the throwaway compose database (the `re_test_placeholder` pattern), shared verbatim by `testEnv` and `createTestAuth` because bearer-signature verification requires both sides to match. Nothing else secret lands in a commit, the PR body, or the evidence file.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/message block below lands verbatim in content; `pnpm --filter @sevendays/api fix` (biome check --write) then normalizes quoting/ordering/import order to house style — accept its rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–3 edit only: `apps/api/src/env.ts`, `apps/api/src/env.test.ts`, `apps/api/test/helpers/env.ts`, `apps/api/test/helpers/auth.ts` (create), `apps/api/src/services/auth.ts` (create), `apps/api/src/services/db.ts`, `apps/api/test/require-session.test.ts` (create), `apps/api/src/routes/appointments.ts`, `apps/api/test/appointments.test.ts`. Task 4 edits only `apps/admin/src/lib/api.server.ts`. Task 5 rotates `docs/progress.md` + `docs/plan.md` (M4 checkboxes 6 + 7) and writes gitignored evidence. NOT here: any `apps/landing` change; any `packages/db` change (the auth tables already exist); any `packages/api-client` change (drift-checked: none needed); live Worker secret puts, teaser/v1 live verification, tech-stack/AGENTS/CONTEXT rotation, the milestone's v1-picks close-out (#122); any caller of `getSessionScopedApiClient` (#122's live probe / M5's CMS); two-factor, password-reset flows, user-management UI (spec out-of-scope); `docs/staff-provisioning.md` (#119's frozen doc).
- **Audit-token discipline (binding for the v1 pick):** `apps/api/src/services/auth.ts`, `apps/api/test/helpers/auth.ts`, and `apps/api/test/require-session.test.ts` must contain NO appointments-path strings (`/api/v1/appointments`, `routes/appointments`, `.route('/appointments'`) — not even in comments — so they classify clean and the seed keeps them; Task 2 Step 5's grep gate enforces this at build time, Task 6 re-checks at pick time. The real-app gating assertions live only in `appointments.test.ts` (main-only).
- **Type-error policy:** if `pnpm typecheck` flags anything in the new files, fix it at the type level without changing runtime semantics and without `any`; the spike-validated shapes are known-good, so a type error means something outside this plan's fence moved — reconcile it, do not reshape the middleware or its mounting.

---

### Task 1: The optional `BETTER_AUTH_SECRET` env seam (test-first)

**Files:**
- Modify: `apps/api/src/env.ts` (envSchema + header comment)
- Modify: `apps/api/src/env.test.ts` (two new cases)
- Modify: `apps/api/test/helpers/env.ts` (export `TEST_AUTH_SECRET`; `testEnv` gains the key)

**Interfaces:**
- Consumes: the existing `parseEnv`/`envSchema` contract (`apps/api/src/env.ts` — every `/api/v1` request parses the full schema via `acquireDb`).
- Produces: `Env['BETTER_AUTH_SECRET']: string | undefined` (optional, min 1 when present) — what `requireSession` (Task 2) reads after `parseEnv`; `TEST_AUTH_SECRET` (exported const) and `testEnv(url).BETTER_AUTH_SECRET` — what `createTestAuth` (Task 2) shares with the API's verification instance; every existing `testEnv` consumer keeps parsing (the key is optional, so old three-key bindings still pass — no other test file changes).

**Not here:** the middleware or factory (Task 2 — the key is dead until then, which typecheck allows); making the key required (GC ruling); touching `.dev.vars`/`.env.example` (the local value exists since #119 Task 4; the example documents it since #118); any Worker secret put (#122).

- [ ] **Step 1: Write the two failing env tests**

In `apps/api/src/env.test.ts`, inside the existing `describe('parseEnv', …)` block, insert after the last test (`it('rejects a malformed URL', …)` — its closing is `  });` immediately before the describe's own `});` at end of file):

```ts
  it('parses without BETTER_AUTH_SECRET (optional — the auth middleware owns the loud failure)', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      RESEND_API_KEY: 're_test_placeholder',
      LANDING_ORIGIN: 'http://localhost:3000',
    });
    expect(env.BETTER_AUTH_SECRET).toBeUndefined();
  });

  it('rejects an empty BETTER_AUTH_SECRET when present', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'http://localhost:3000',
        BETTER_AUTH_SECRET: '',
      })
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd /home/jeius/Projects/sevendays && docker compose up -d db
pnpm --filter @sevendays/api exec vitest run src/env.test.ts
```

Expected: **exactly 1 failing** — the empty-string rejection. Pre-change, zod's object parse strips the unknown `BETTER_AUTH_SECRET` key entirely, so `''` parses without throwing and `toThrow` never fires. (The absent-key test PASSES both pre- and post-change by design — it asserts the parsed output `undefined`, the optional-key contract itself; the empty-string case is the behavior the schema change creates.) If BOTH pass pre-change, STOP and report — the schema already changed somewhere out-of-plan.

- [ ] **Step 3: Extend the schema and the header comment**

In `apps/api/src/env.ts`, replace the comment block + schema (the text from `// instead of surfacing` through the closing `});` of `envSchema`) with:

```ts
// instead of surfacing as a mid-request failure. DATABASE_URL is the pooled
// Supabase connection (ADR-0007). The email pair (issue #47) has no fallback
// by design — the API_URL posture: a deploy without either var fails every
// /api/v1 request (acquireDb parses the full schema) rather than silently
// dropping confirmation emails. BETTER_AUTH_SECRET (M4 ticket 04) is the one
// OPTIONAL key: requiring it here would fail every /api/v1 request on a
// Worker without the secret (the teaser until #122's puts) — instead the
// auth middleware owns the loud missing-secret failure, so only gated routes
// care. The exported Env derives from the schema; the ambient generated
// global in worker-configuration.d.ts is no longer load-bearing anywhere.
export const envSchema = z.object({
  DATABASE_URL: z.url(),
  RESEND_API_KEY: z.string().min(1),
  LANDING_ORIGIN: z.url(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
});
```

- [ ] **Step 4: Extend the test-env helper**

Replace the whole content of `apps/api/test/helpers/env.ts` with:

```ts
// The full Worker binding for integration tests (issue #47 made
// RESEND_API_KEY + LANDING_ORIGIN required env — parseEnv fails without
// them, so every /api/v1 request must carry the complete set). The key is a
// placeholder: the Resend SDK is vi.mock'ed in the suites, so no real key
// (and no network) is ever needed here. BETTER_AUTH_SECRET (M4 ticket 04)
// is a fixed placeholder shared by the API's verification instance and the
// test-shaped auth issuer (helpers/auth.ts) — same value on both sides is
// what makes issued sessions verifiable (ADR-0004's shared-secret rule,
// mirrored at test scale).
export const TEST_AUTH_SECRET = 'integration-test-secret-0123456789-0123456789-0123456789';

export function testEnv(databaseUrl: string) {
  return {
    DATABASE_URL: databaseUrl,
    RESEND_API_KEY: 're_test_placeholder',
    LANDING_ORIGIN: 'http://localhost:3000',
    BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
  };
}
```

- [ ] **Step 5: Run to verify green, then the full-suite no-regression check**

```bash
pnpm --filter @sevendays/api exec vitest run src/env.test.ts
pnpm --filter @sevendays/api exec vitest run
```

Expected: `src/env.test.ts` = 11 passed (9 existing + 2 new); the full suite = **93 passed / 12 files** — unchanged from baseline (the optional key breaks no existing binding; `testEnv`'s new key breaks no parse).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/env.ts apps/api/src/env.test.ts apps/api/test/helpers/env.ts
git commit -m "feat(api): optional BETTER_AUTH_SECRET env seam (#121)

z.string().min(1).optional() in envSchema — NOT required: acquireDb
parses the full schema on every /api/v1 request, and a required key
would 500 the secretless teaser's public endpoints. The loud
missing-secret failure belongs to the auth middleware (next commit);
empty-when-present still rejects. testEnv shares a pinned placeholder
with the upcoming test-shaped auth issuer (signature verification
needs both sides' secrets to match — ADR-0004 at test scale)."
```

### Task 2: The verification service + `requireSession` + its proof suite

**Files:**
- Create: `apps/api/src/services/auth.ts`
- Create: `apps/api/test/helpers/auth.ts`
- Create: `apps/api/test/require-session.test.ts`
- Modify: `apps/api/src/services/db.ts` (the `ApiEnv` Variables gain `session?`)

**Interfaces:**
- Consumes: `acquireDb` from `../src/routes/v1.js` (places the per-request `db` in context; mounted `'*'` on `/api/v1`); `parseEnv`/`Env` from Task 1; `createDbClient` + the `session` table from `@sevendays/db`; `TEST_AUTH_SECRET`/`testEnv` from Task 1's helper.
- Produces: `createVerificationAuth(options: { database: Database; secret: string })` — the verification-only instance factory; `SessionData` — the inferred `{ session, user }` type; `authenticationRequired(c)` — the uniform 401 envelope; `requireSession` — the Hono middleware Task 3 mounts on the list route (and M5 mounts behind CMS routes); `ApiEnv['Variables']['session']` — the context slot gated handlers read via `c.get('session')`. Test side: `createTestAuth(databaseUrl)` / `signUpSession(databaseUrl, email)` → `{ token, userId }` / `signOutSession(databaseUrl, token)` — Task 3's blast-radius edits consume `signUpSession`.

**Not here:** mounting the middleware on any route (Task 3 — the middleware is exported and unused this task, which typecheck allows); `apps/admin` anything (Task 4); touching `packages/db` (the tables exist since #118); gating `POST` or the single-get (the uuid-opacity ruling — spec § Closing the public appointments reads); any clock mocking for the expiry case (the db-update form is pinned — header recon).

- [ ] **Step 1: Create the test-shaped issuer helper**

Create `apps/api/test/helpers/auth.ts` with exactly this content (spike-validated verbatim on 2026-09-23):

```ts
import { createDbClient } from '@sevendays/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { TEST_AUTH_SECRET } from './env.js';

// The test-shaped auth issuer (M4 spec § Testing posture): sign-up ENABLED
// (the production instances refuse it), bearer() on so the harvest reads the
// set-auth-token response header, same secret as testEnv so the API's
// verification instance accepts what this instance issues (the bearer
// plugin HMAC-verifies against the instance's own secret — ADR-0004's
// shared-secret rule, mirrored at test scale). Built per call over its own
// db client — the ADR-0011 posture, mirrored in tests.
export function createTestAuth(databaseUrl: string) {
  return betterAuth({
    database: drizzleAdapter(createDbClient(databaseUrl), { provider: 'pg' }),
    secret: TEST_AUTH_SECRET,
    emailAndPassword: { enabled: true },
    plugins: [bearer()],
    rateLimit: { enabled: false }, // fixtures sign up repeatedly — the ~3/10s default would 429 the suite
  });
}

/**
 * Mint a real session through BetterAuth's own HTTP surface and harvest the
 * signed token from set-auth-token (the bearer plugin's after-hook mirrors
 * the set-cookie value there on sign-in/sign-up). The token is the
 * `<token>.<signature>` form — exactly what the admin seam forwards.
 */
export async function signUpSession(databaseUrl: string, email: string) {
  const auth = createTestAuth(databaseUrl);
  const res = await auth.handler(
    new Request('http://localhost:8787/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'test-password-123456', name: 'Test Staff' }),
    })
  );
  if (!res.ok) {
    throw new Error(`test sign-up failed: ${res.status} ${await res.text()}`);
  }
  const token = res.headers.get('set-auth-token');
  if (!token) {
    throw new Error('test sign-up response carried no set-auth-token header (bearer plugin)');
  }
  const body = (await res.json()) as { user?: { id?: string } };
  const userId = body.user?.id;
  if (!userId) {
    throw new Error('test sign-up response carried no user.id');
  }
  return { token, userId };
}

/** Revoke a session through BetterAuth's own sign-out server API. */
export async function signOutSession(databaseUrl: string, token: string) {
  const auth = createTestAuth(databaseUrl);
  await auth.api.signOut({ headers: new Headers({ authorization: `Bearer ${token}` }) });
}
```

- [ ] **Step 2: Create the proof suite (the red)**

Create `apps/api/test/require-session.test.ts` with exactly this content (spike-validated verbatim; note what it deliberately does NOT contain — no real-app requests, no booking-path strings — per the audit-token ruling in the header):

```ts
import { session as sessionTable } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { acquireDb } from '../src/routes/v1.js';
import { requireSession } from '../src/services/auth.js';
import type { ApiEnv } from '../src/services/db.js';
import { signUpSession, signOutSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

// The middleware's semantics are proven on a scratch app — acquireDb +
// requireSession + a probe route — because the gate is route-independent
// (M5 mounts CMS routes behind it). Deliberately free of booking-path
// strings so the v1 pick carries this file (the audit-token discipline);
// the gated-list application tests live in the appointments suite.
const scratch = new Hono<ApiEnv>()
  .use('*', acquireDb)
  .get('/protected', requireSession, (c) => c.json({ userId: c.get('session')?.user.id ?? null }));

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

beforeEach(async () => {
  await truncateAll(db);
});

describe('requireSession (scratch app, real Postgres)', () => {
  it('returns the uniform 401 envelope with no Authorization header', async () => {
    const res = await scratch.request('/protected', undefined, testEnv(url));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('returns 401 for a garbage bare token', async () => {
    const res = await scratch.request(
      '/protected',
      { headers: bearer('not-a-real-token') },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Authentication required.');
  });

  it('returns 401 for a signed-form token whose signature fails verification', async () => {
    const res = await scratch.request(
      '/protected',
      { headers: bearer('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.c2lnbmF0dXJl') },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Authentication required.');
  });

  it('returns 401 for an expired session (expires_at moved to the past)', async () => {
    const { token } = await signUpSession(url, 'expired@sevendays.test');
    // The stored row carries the BARE token; the harvested value is signed
    // (#119's verbatim-storage finding) — strip to the token segment to hit
    // the row, keep presenting the signed form to the middleware.
    await db
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(sessionTable.token, token.split('.')[0] ?? ''));
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(401);
  });

  it('returns 401 after sign-out revokes the session', async () => {
    const { token } = await signUpSession(url, 'revoked@sevendays.test');
    await signOutSession(url, token);
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(401);
  });

  it('passes a real session through and sets it into context', async () => {
    const { token, userId } = await signUpSession(url, 'valid@sevendays.test');
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId });
  });

  it('throws (500) when BETTER_AUTH_SECRET is missing — no silent allow', async () => {
    const { token } = await signUpSession(url, 'secretless@sevendays.test');
    const { BETTER_AUTH_SECRET: _omit, ...envWithoutSecret } = testEnv(url);
    const res = await scratch.request('/protected', { headers: bearer(token) }, envWithoutSecret);
    // The scratch app mounts no onError (the root app's uniform-500 envelope
    // is error-seam.test.ts's coverage) — the bare 500 proves the throw.
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 3: Run to verify the red**

```bash
pnpm --filter @sevendays/api exec vitest run test/require-session.test.ts
```

Expected: FAIL at import — `Cannot find module '../src/services/auth.js'` (or its typecheck-time equivalent surfaced by vitest's transform). That unresolved import IS the red; proceed.

- [ ] **Step 4: Create the service and extend the context type**

Create `apps/api/src/services/auth.ts` with exactly this content (spike-validated verbatim):

```ts
import type { Database } from '@sevendays/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { parseEnv } from '../env.js';
import type { ApiEnv } from './db.js';

// ADR-0004 made concrete (M4 ticket 04): the API answers "who is calling"
// by verifying the bearer token against the SAME tables the admin auth
// server writes — through BetterAuth's own session API, never a hand-rolled
// lookup: the presented value is `<token>.<signature>` (setSignedCookie)
// and the bearer plugin strips/verifies the signature against this
// instance's secret before the session read, so a raw `WHERE token = $1`
// against the presented value can never match (#119's live-verified
// finding; the secret must equal the admin issuer's — the ADR-0004 share).
export function createVerificationAuth(options: { database: Database; secret: string }) {
  return betterAuth({
    database: drizzleAdapter(options.database, { provider: 'pg' }),
    // Explicit, not env-auto-read: tests and the Worker both carry env
    // through c.env, never process.env on this path.
    secret: options.secret,
    plugins: [bearer()], // reads Authorization: Bearer; no cookies, no routes served
  });
}

type VerificationAuth = ReturnType<typeof createVerificationAuth>;

/** What a verified caller looks like (session + user, BetterAuth-inferred). */
export type SessionData = VerificationAuth['$Infer']['Session'];

// Module-owned copy (the REJECTION_MESSAGES class): the uniform 401 envelope.
// `details` omitted by design — there is exactly one reason.
export function authenticationRequired(c: import('hono').Context) {
  return c.json({ error: 'Authentication required.' }, 401);
}

/**
 * The session gate (M4 ticket 04): verifies the Authorization: Bearer token
 * through the verification instance and sets the session into context, or
 * returns the uniform 401 envelope. The instance is constructed per request
 * over the per-request db handle acquireDb already placed in context
 * (ADR-0011 — the drizzle adapter captures the db it is given). A missing
 * BETTER_AUTH_SECRET throws loudly (the createAuth posture): a deploy that
 * cannot verify anyone fails the gated route with the uniform 500, never a
 * silent allow.
 */
export const requireSession = async (
  c: import('hono').Context<ApiEnv>,
  next: () => Promise<void>
) => {
  const { BETTER_AUTH_SECRET } = parseEnv(c.env);
  if (!BETTER_AUTH_SECRET) {
    throw new Error(
      'BETTER_AUTH_SECRET is not set — the API cannot verify sessions. Set the Worker secret (ADR-0004, shared with the admin). No fallback by design.'
    );
  }
  const auth = createVerificationAuth({ database: c.get('db'), secret: BETTER_AUTH_SECRET });
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return authenticationRequired(c);
  }
  c.set('session', session);
  await next();
};
```

Then in `apps/api/src/services/db.ts`, replace the header comment + `ApiEnv` block (the text from `// The API's request context` through the type's closing `};`) with:

```ts
import type { Database } from '@sevendays/db';
import { createDbClient } from '@sevendays/db';
import type { Env } from '../env.js';
import type { SessionData } from './auth.js';

// The API's request context (ADR-0011 + candidate D): the per-request db
// handle lives in Hono variables, set once by the acquisition middleware on
// /api/v1 and read by every route handler. Bindings are the Zod-validated
// Env from src/env.ts. `session` is set ONLY by requireSession (M4 ticket
// 04) — optional so ungated routes don't carry a lying type.
export type ApiEnv = {
  Bindings: Env;
  Variables: { db: Database; session?: SessionData };
};
```

(The `SessionData` import is type-only — the db.ts ↔ auth.ts cycle never exists at runtime.)

- [ ] **Step 5: Run to verify green, then the gates**

```bash
pnpm --filter @sevendays/api exec vitest run test/require-session.test.ts
pnpm --filter @sevendays/api typecheck
grep -rn "betterAuth(" apps/api/src --include="*.ts"
grep -rniE "appointments" apps/api/src/services/auth.ts apps/api/test/helpers/auth.ts apps/api/test/require-session.test.ts
pnpm --filter @sevendays/api exec vitest run
```

Expected: the suite = **7 passed**; typecheck green (the spike proved every inference: `$Infer.Session`, `c.req.raw.headers`, the optional `Variables.session`, `c.set`); the first grep shows `betterAuth(` ONLY inside `createVerificationAuth`'s factory body in `services/auth.ts` (no module-scope instance — ADR-0011); the second grep returns **ZERO rows** (audit-token discipline — these three files must stay bookings-string-free for the v1 pick); the full suite = **102 passed / 13 files** (95 after Task 1 + 7).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/auth.ts apps/api/src/services/db.ts apps/api/test/helpers/auth.ts apps/api/test/require-session.test.ts
git commit -m "feat(api): verification-only auth instance + requireSession middleware (#121)

createVerificationAuth (drizzleAdapter over the per-request db handle,
bearer plugin, explicit secret — no routes served, no browser config)
behind requireSession: auth.api.getSession over the raw request headers,
null → the module-owned uniform 401, else the session joins Hono context
as an optional variable. Missing BETTER_AUTH_SECRET throws → the root
onError's uniform 500 (never a silent allow). Proof suite on a scratch
app over real Postgres: no-header/garbage/bad-signature/expired/revoked
→ 401, harvested real session → 200 with user.id in context, secretless
→ 500. Test issuer: sign-up enabled + bearer + rate limit off, sessions
minted through auth.handler and harvested from set-auth-token."
```

---

### Task 3: Gate the appointments list + the seven-site blast radius

**Files:**
- Modify: `apps/api/src/routes/appointments.ts` (one route line + imports + comment)
- Modify: `apps/api/test/appointments.test.ts` (import + helper + 8 edits + 1 replacement + 1 new test)

**Interfaces:**
- Consumes: `requireSession` from `../services/auth.js` (Task 2); `signUpSession` from `./helpers/auth.js` (Task 2).
- Produces: the closed list — `GET /api/v1/appointments` answers 401 to unauthenticated callers and 200 to sessions, through the actual middleware mounted in the real app; `GET /:id` and `POST /` provably unchanged-public. #122's live gate curls exactly this surface.

**Not here:** any change to the single-get or POST routes (the uuid-opacity ruling + guest booking — spec § Closing the public appointments reads); moving the real-app gating assertions into `require-session.test.ts` (they live HERE — this file is main-only at pick time by design); the admin seam (Task 4); landing's read-back (verified unchanged by recon — landing calls only `get`/`create`).

- [ ] **Step 1: Gate the list route**

In `apps/api/src/routes/appointments.ts`, replace the imports + chain head (the text from `import type { ApiEnv }` through the end of the `.get('/', …)` line) with:

```ts
import { requireSession } from '../services/auth.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { validatedJson, validatedParam, validatedQuery } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
// The list is session-gated (M4 ticket 04 — the M2 public-PII stopgap
// closes): requireSession runs BEFORE the query validator so an
// unauthenticated caller gets the 401 envelope, never a 400 that would
// leak validation detail. The single-get and POST stay public (the
// uuid-opacity ruling / guest booking).
export const appointments = new Hono<ApiEnv>()
  .get('/', requireSession, validatedQuery(z.object({ branchId: z.uuid().optional() })), async (c) => {
```

- [ ] **Step 2: Run the appointments suite to make the blast radius visible (the red)**

```bash
pnpm --filter @sevendays/api exec vitest run test/appointments.test.ts
```

Expected: **exactly 7 failing**, all in `GET /api/v1/appointments` + the parity test — 'returns the created appointment, newest first', 'filters by branch', 'returns an empty list for an unknown branch', 'rejects a malformed branchId with 400', 'caps the list at 200', 'serves through the api-client-free public surface (no auth yet — Known Gap)', 'returns the same shape as the list endpoint (single-get parity)' — each now receiving `{"error":"Authentication required."}` / 401 instead of a list. Every POST test and every other single-get test stays green (the stays-public halves, proven by the suite itself). If MORE than 7 fail, STOP and reconcile — something outside this plan's prediction moved.

- [ ] **Step 3: Fix the blast radius — import, helper, seven sites**

In `apps/api/test/appointments.test.ts`:

**3a.** Add the import (first line of the `./helpers/*` group, before `import { createTestDb } from './helpers/db.js';`):

```ts
import { signUpSession } from './helpers/auth.js';
```

**3b.** After the `FUTURE_ISO` definition (`const FUTURE_ISO = () => futureDate().toISOString();`), add:

```ts
// The list is session-gated (M4 ticket 04): every list read goes through a
// real BetterAuth session minted by the test issuer (helpers/auth.ts). The
// session is minted per call — AFTER beforeEach's truncateAll wiped the
// auth tables; a cached token would die with the truncate.
const authedListHeaders = async () => ({
  authorization: `Bearer ${(await signUpSession(url, 'list-reader@sevendays.test')).token}`,
});
```

**3c.** 'returns the created appointment, newest first' — replace:

```ts
    const res = await app.request('/api/v1/appointments', undefined, testEnv(url));
    expect(res.status).toBe(200);
```

with:

```ts
    const res = await app.request(
      '/api/v1/appointments',
      { headers: await authedListHeaders() },
      testEnv(url)
    );
    expect(res.status).toBe(200);
```

**3d.** 'filters by branch' — in its `app.request` call, replace `undefined,` with `{ headers: await authedListHeaders() },`.

**3e.** 'returns an empty list for an unknown branch' — same replacement as 3d.

**3f.** 'rejects a malformed branchId with 400' — same replacement as 3d (authenticating first is load-bearing: unauthenticated it would 401 before validation — the test asserts the 400 path, so it must present a session).

**3g.** 'caps the list at 200' — replace:

```ts
    const res = await app.request('/api/v1/appointments', undefined, testEnv(url));
    expect((await res.json()).length).toBe(200);
```

with:

```ts
    const res = await app.request(
      '/api/v1/appointments',
      { headers: await authedListHeaders() },
      testEnv(url)
    );
    expect((await res.json()).length).toBe(200);
```

**3h.** 'returns the same shape as the list endpoint (single-get parity)' — replace:

```ts
    const listed = await (
      await app.request('/api/v1/appointments', undefined, testEnv(url))
    ).json();
```

with:

```ts
    const listed = await (
      await app.request('/api/v1/appointments', { headers: await authedListHeaders() }, testEnv(url))
    ).json();
```

- [ ] **Step 4: Replace the Known-Gap test (its assertion is now false) and add the uuid-opacity proof**

**4a.** Replace the whole test:

```ts
  it('serves through the api-client-free public surface (no auth yet — Known Gap)', async () => {
    const res = await app.request('/api/v1/appointments', undefined, testEnv(url));
    expect(res.status).toBe(200);
  });
```

with:

```ts
  it('rejects an unauthenticated caller with the uniform 401 (M4 ticket 04)', async () => {
    const res = await app.request('/api/v1/appointments', undefined, testEnv(url));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
```

(M2 documented the list as "public until M4 closes both" — this test was the stopgap's guard; its inverse is the closure's guard.)

**4b.** In the `describe('GET /api/v1/appointments/:id', …)` block, after the 'rejects a non-uuid id with the uniform 400 envelope' test, add:

```ts
  it('stays public without a session (uuid-opacity ruling — M4 ticket 04)', async () => {
    const created = (await createViaApi(payload())) as { id: string };
    const res = await app.request(`/api/v1/appointments/${created.id}`, undefined, testEnv(url));
    expect(res.status).toBe(200);
  });
```

- [ ] **Step 5: Run to verify green, then the full suite**

```bash
pnpm --filter @sevendays/api exec vitest run test/appointments.test.ts
pnpm --filter @sevendays/api exec vitest run
pnpm --filter @sevendays/api typecheck
```

Expected: `appointments.test.ts` = **41 passed** (40 baseline − 1 replaced + 1 replaced-with + 1 new — net +1); the full suite = **103 passed / 13 files** (the GC-pinned count); typecheck green (the middleware-in-chain inference was spike-proven, and the api build + api-client drift check follows at the Task 5 gate).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/appointments.ts apps/api/test/appointments.test.ts
git commit -m "feat(api): appointments list session-gated — the M2 PII stopgap closes (#121)

requireSession mounts before the list's query validator (401 wins over
validation detail); the single-get stays public by uuid-opacity (new
explicit test + the unchanged unauthenticated suite) and POST stays
public (the guest suite untouched). The seven list-GET test sites now
mint real BetterAuth sessions through the test issuer; the Known-Gap
stopgap test is replaced by its inverse 401 assertion. api suite
93→103 tests."
```

### Task 4: The admin seam — `getSessionScopedApiClient`

**Files:**
- Modify: `apps/admin/src/lib/api.server.ts` (import line + one appended block)

**Interfaces:**
- Consumes: `serviceBindingFetch` + `getApiUrl()` (already in this file — the existing transport seam, ADR-0016); `createApiClient`/`ApiClient` from `@sevendays/api-client` (the custom-fetch option `CreateApiClientOptions.fetch` — the `toLoopbackFetch` precedent).
- Produces: `getSessionScopedApiClient(cookieHeader: string | null): ApiClient` — the session-scoped client #122's live probe and M5's CMS server fns call as `getSessionScopedApiClient(getRequestHeaders().get('cookie'))`. Exported-unused this ticket (the #119 session-fns precedent). The public `getApiClient()` stays alongside, untouched.

**Not here:** any caller (nothing in admin reads a gated endpoint today — the dashboard is v2; #122's authenticated probe / M5's CMS consume it); changing `getApiClient()` or `api.functions.ts`; any browser-side code (the raw token never reaches a client bundle — `api.server.ts` is server-only by its header comment and nothing imports it outside server fns); admin vitest (the standing gap — the spec's testing posture keeps this seam thin and leaves its verification to #122's live gate).

- [ ] **Step 1: Append the seam**

In `apps/admin/src/lib/api.server.ts`, first change the import line from `import { createApiClient } from '@sevendays/api-client';` to:

```ts
import { type ApiClient, createApiClient } from '@sevendays/api-client';
```

Then, after the existing `getApiClient` function (end of file), append exactly:

```ts

// Session-scoped client (M4 ticket 04, ADR-0004 + ADR-0016): server fns
// read the httpOnly session cookie from the INCOMING request server-side
// and forward it as Authorization: Bearer over the same transport every
// other admin→api call rides (the service-binding fetch in production, the
// API_URL network path in dev). The browser never holds the raw token, and
// no cookie header crosses apps — only the bearer credential does. The
// cookie value is forwarded VERBATIM (<token>.<signature>, possibly
// percent-encoded): the API's bearer plugin decodes and verifies the
// signature.
const SESSION_COOKIE_SUFFIX = 'session_token';

function extractSessionToken(cookieHeader: string | null): string {
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const name = part.slice(0, eq).trim();
      // Suffix-match, not equality: dev `better-auth.session_token`,
      // production `__Secure-better-auth.session_token` (session_data is a
      // different cookie — excluded by the exact suffix).
      if (name.endsWith(SESSION_COOKIE_SUFFIX)) {
        return part.slice(eq + 1).trim();
      }
    }
  }
  throw new Error(
    'No session cookie in the incoming request — the session-scoped API client cannot authenticate. The caller must run inside a signed-in request (the _shell gate guarantees it): pass getRequestHeaders().get("cookie"). No fallback by design.'
  );
}

export function getSessionScopedApiClient(cookieHeader: string | null): ApiClient {
  const token = extractSessionToken(cookieHeader);
  const underlying = serviceBindingFetch ?? fetch;
  const fetchWithBearer: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('authorization', `Bearer ${token}`);
    return underlying(input, { ...init, headers });
  };
  return createApiClient({ baseUrl: getApiUrl(), fetch: fetchWithBearer });
}
```

- [ ] **Step 2: Format, typecheck, lint, and the seam's own gates**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin lint
grep -nE "localStorage|set-auth-token" apps/admin/src/lib/api.server.ts && echo "STOP — token must never touch browser storage" || echo "clean"
grep -n "getSessionScopedApiClient" apps/admin/src -r --include="*.ts" --include="*.tsx"
```

Expected: biome clean (it may reflow the appended block — content is the pin); typecheck green (the wrapper's `typeof fetch` shape against `CreateApiClientOptions.fetch` is the `toLoopbackFetch`-proven contract); the third grep returns nothing; the fourth shows exactly ONE hit — the definition itself (no caller, per the fence).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/lib/api.server.ts
git commit -m "feat(admin): session-scoped api client — cookie read server-side, bearer injected (#121)

getSessionScopedApiClient(cookieHeader): suffix-match session_token
(dev/production cookie names both covered), forward the signed value
verbatim as Authorization: Bearer through the existing service-binding
fetch wrapper. The browser never holds the raw token; no cookie crosses
apps. Exported-unused — #122's live probe and M5's CMS server fns are
the callers; getApiClient stays alongside for anonymous calls."
```

---

### Task 5: Full gate, docs rotation, PR, merge, and the watched deploy

**Files:**
- Modify: `docs/progress.md` (rotate the `_Last updated:` line + prepend the session paragraph)
- Modify: `docs/plan.md` (tick M4 checkboxes 6 and 7 with dated annotations)
- Create (gitignored): `.superpowers/sdd/2026-09-23-121-api-session-verification/evidence.md` + `pr-body.md`
- The squash-merge PR `(#121)` + its watched deploy

**Interfaces:**
- Consumes: Tasks 1–4 (the branch state); the docs conventions (progress.md's single-paragraph session record; plan.md's `_(date: …)_` annotation style — #119's box-2/4 annotations are the direct precedent).
- Produces: the merged main whose push exercises the deploy legs; the docs state #122's session reads (progress says exactly what exists, incl. the bearer mechanics and the teaser window); the evidence block Task 6's ledger row cites.

**Not here:** ticking M4 checkboxes 3 (env/secrets — spans #122's live puts; its dev-values note from #119 already covers what exists) or 8 (verify + picks close-out — #122); `docs/tech-stack.md` / `AGENTS.md` / `CONTEXT.md` rotation (#122); closing any issue other than #121 (the close itself is Task 6, after the pick); any Worker secret put (#122 — the deploy lands with the gate live but the secret absent, by design).

- [ ] **Step 1: The full gate**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/api build
pnpm check
graphify update .
```

Expected: the api build green (refreshing `dist/` so the api-client's `AppType` import sees the gated app — the drift was spike-proven clean); `pnpm check` green, **35/35 turbo tasks**, with the api package's suite reading **103 passed / 13 files** (the two GC-pinned counts — if either differs, reconcile before proceeding); `graphify update .` rewrites `graphify-out/` (expected house noise — commit it in Step 4).

- [ ] **Step 2: Rotate `docs/progress.md`**

Replace the current `_Last updated: 2026-09-22 (M4 ticket 03 landed — …` line (the one beginning `_Last updated: 2026-09-22 (M4 ticket 03 landed:`) with:

```markdown
_Last updated: 2026-09-23 (M4 ticket 04 landed — the API answers "who is calling": a verification-only BetterAuth instance (bearer plugin, per-request over the shared tables) backs `requireSession`, now gating `GET /api/v1/appointments` — the M2 public-PII stopgap closes — while the single-get stays public by uuid-opacity and POST stays public for guests; the admin seam's `getSessionScopedApiClient` reads the httpOnly cookie server-side and forwards it as a bearer credential through the service binding. Proven over real Postgres: 401 for no-header/garbage/bad-signature/expired/revoked, 200 for a real harvested session. The deployed teaser's list answers 500 (not 401) until #122 puts `BETTER_AUTH_SECRET` — the dormant-window shape the M4 tickets accepted. #122 remains.)_
```

Then insert this paragraph directly under `# Progress` (above the #120 paragraph):

```markdown
2026-09-23 — #121 M4 ticket 04, API session verification + the appointments-list gate, landed: `apps/api/src/services/auth.ts` exports the verification-only factory `createVerificationAuth({ database, secret })` (drizzleAdapter over the per-request db handle `acquireDb` already places in context — ADR-0011; `bearer()` plugin; explicit secret, never env-auto-read; no routes served, no browser-facing config) and `requireSession` (`auth.api.getSession` over `c.req.raw.headers`; null → the module-owned uniform 401 `{"error":"Authentication required."}` with `details` omitted; else the session joins Hono context as the optional `Variables.session`; missing `BETTER_AUTH_SECRET` → loud throw → the root onError's uniform 500). The optional-key ruling: `envSchema` carries `BETTER_AUTH_SECRET: z.string().min(1).optional()` — requiring it would 500 every PUBLIC /api/v1 endpoint on the secretless teaser, so the loud failure lives in the middleware and only gated routes care. `GET /api/v1/appointments` is gated with `requireSession` BEFORE its query validator (unauthenticated callers get 401, never a validation-detail 400); `GET /:id` stays public by uuid-opacity (explicit new test + the unchanged unauthenticated single-get suite) and `POST` stays public (the guest suite untouched). The admin seam gains `getSessionScopedApiClient(cookieHeader)` in `apps/admin/src/lib/api.server.ts` (suffix-match `session_token` across the dev/production cookie names, signed value forwarded verbatim as `Authorization: Bearer` through the existing service-binding fetch wrapper — the browser never holds the raw token, no cookie crosses apps; exported-unused — #122's live probe and M5's CMS consume it; `getApiClient` stays alongside). Tests over the compose Postgres (ADR-0008): `test/require-session.test.ts` (7 scratch-app tests — deliberately route-independent and free of booking-path strings so the v1 pick carries them: no-header / garbage bare / bad-signature signed / db-expired / `signOut`-revoked → 401, a real `set-auth-token`-harvested session → 200 with `user.id` readable from context, secretless → 500), `test/helpers/auth.ts` (the test-shaped issuer: sign-up enabled, `bearer()` on, rate limit off, same secret as `testEnv` — minted through `auth.handler` HTTP, revoked through `auth.api.signOut`), two env-contract tests, and the appointments blast radius (the 7 list-GET sites now mint real sessions; the Known-Gap stopgap test replaced by its inverse 401 assertion; +1 uuid-opacity test — api suite 93→103 / 12→13 files). Bearer mechanics pinned from the 1.7.5 dist and spike-proven: the plugin accepts the signed cookie value `<token>.<signature>` directly (URL-decoding when needed) and re-signs bare tokens before HMAC-verifying against the INSTANCE's own secret — mechanically why admin and api must share one `BETTER_AUTH_SECRET` (ADR-0004) — and mirrors the cookie value to `set-auth-token` on sign-in/sign-up responses. Every claim was spike-proven at planning (typecheck clean; the middleware suite 9/9 green over real Postgres pre-plan; `apps/api` build + api-client 29/29 proved no client wrapper moved — ADR-0006 discipline, zero api-client edits). `pnpm check` 35/35. NOT yet true: the deployed teaser's list answers 500 until #122's `wrangler secret put` (public endpoints unaffected — the optional-key ruling); the live authenticated read / sign-out revocation on the teaser and the v1 leg are #122's gate.
```

- [ ] **Step 3: Tick `docs/plan.md` M4 checkboxes 6 and 7**

Two edits in the M4 block:

1. Checkbox 6 (`API session verification (ADR-0004): …`): `- [ ]` → `- [✅]`, and append inside its trailing text (after `no cross-domain cookies`):

```markdown
 _(2026-09-23: ticket #121 landed — `apps/api/src/services/auth.ts` (createVerificationAuth + requireSession, per-request over acquireDb's handle, bearer plugin, explicit secret; uniform 401 `{"error":"Authentication required."}`); BETTER_AUTH_SECRET optional in envSchema so a secretless Worker keeps its public endpoints — the middleware owns the loud 500; admin seam `getSessionScopedApiClient` exported for #122/M5; 7 scratch-app tests over real Postgres incl. expiry + signOut revocation + secretless-throw.)_
```

2. Checkbox 7 (`Public appointments list closed: …`): `- [ ]` → `- [✅]`, and append inside its trailing text (after `prove 401/expiry/revocation through the real middleware`):

```markdown
 _(2026-09-23: ticket #121 landed — requireSession mounts BEFORE the list's query validator; the single-get stays public by uuid-opacity (explicit test + unchanged suite) and POST stays public (unchanged guest suite); the M2 Known-Gap test inverted to its 401 assertion; api suite 93→103. The teaser's live 401/200/revocation leg + the secret puts are #122's.)_
```

Checkbox 3 (Env + secrets) and checkbox 8 (Verify + picks) STAY `- [ ]` — untouched.

- [ ] **Step 4: Commit docs, open the PR**

```bash
git add docs/progress.md docs/plan.md graphify-out
git commit -m "docs: M4 session-verification landed — progress rotation + checkboxes 6/7 ticked (#121)

progress.md carries the session record incl. the bearer mechanics
(signed/bare forms, HMAC against the instance secret, set-auth-token)
and the teaser dormant-window note; plan.md's API session verification
and Public appointments list boxes ticked with dated annotations;
checkboxes 3 + 8 stay open for #122."
gh pr create --title "M4 ticket 04 — API session verification + appointments-list gating" --body-file .superpowers/sdd/2026-09-23-121-api-session-verification/pr-body.md
```

(The `pr-body.md` contents — quote the gate outputs where marked, commit nothing from the sdd dir itself:)

```markdown
Implements #121 — M4 ticket 04, API session verification + appointments-list gating. Spec: #117 (§ API-side session verification, § Closing the public appointments reads, § Testing posture), plan: docs/superpowers/plans/2026-09-23-121-api-session-verification.md.

## Acceptance criteria → evidence

- **Verification-only BetterAuth instance (bearer plugin; per-request over the per-request db client — ADR-0011); no auth routes served, no browser-facing config** — `apps/api/src/services/auth.ts`: `createVerificationAuth({ database, secret })` with `drizzleAdapter(c.get('db'))` + `bearer()`; constructed INSIDE `requireSession`, never module scope (grep gate in Task 2 Step 5). The instance serves no routes — only `auth.api.getSession` is called.
- **`requireSession`: BetterAuth's own API, session into context, uniform 401 with module-owned wording** — `auth.api.getSession({ headers: c.req.raw.headers })`; null → `{"error":"Authentication required."}` (401, `details` omitted); else `c.set('session', …)`. No hand-rolled token lookup: the presented value is `<token>.<signature>` and the plugin verifies the signature before the session read (#119's verbatim-storage finding — a raw `WHERE token = $1` can never match).
- **List gated; single-get + POST public** — `requireSession` before the list's query validator in `routes/appointments.ts`; `:id` and POST routes untouched. Proof: the new 401 + uuid-opacity tests, the unchanged unauthenticated single-get suite, the unchanged guest POST suite. <quote the 41-passed appointments run + the 103/13 full-suite line>
- **Admin server-fn seam: cookie read server-side, Authorization through the service-binding fetch; browser never holds the raw token; public client stays** — `getSessionScopedApiClient(cookieHeader)` in `apps/admin/src/lib/api.server.ts` (suffix-match `session_token`; `Headers`-based bearer injection over `serviceBindingFetch ?? fetch`; `getApiClient` untouched beside it). Exported-unused — #122's live probe / M5's CMS are the callers.
- **Integration tests over real Postgres** — `test/require-session.test.ts` (7 tests, scratch app): no header → 401 envelope; garbage bare → 401; bad-signature signed → 401; db-expired → 401; `auth.api.signOut`-revoked → 401; a real session minted through the issuer's own HTTP handler and harvested from `set-auth-token` → 200 through the actual middleware with `user.id` from context; secretless → 500 throw. Plus the two env-contract tests and the seven-site blast radius in `appointments.test.ts`. <quote the 7-passed run>
- **`pnpm check` green; api-client loopback tests unchanged (no wrapper moved)** — 35/35 turbo tasks; api suite 93→103 / 12→13 files; zero api-client edits (drift-checked at planning AND at the Task 5 gate: api build + api-client 29/29). <quote the check tail>

## Known follow-ups (owned elsewhere)

- **Teaser dormant window:** until #122's one-time `wrangler secret put BETTER_AUTH_SECRET` on `sevendays-api`, the deployed list answers the uniform 500 (missing secret throws loudly — by design; every public endpoint unaffected by the optional-key ruling). Same shape #118–#120 accepted: green deploy legs are this ticket's landing proof; the live gate is #122's AC.
- v1 pick (Task 6, executed from this branch's session): SPLIT pre-mapped — middleware + its tests + env hunks land on `v1`; the appointments-route/test edits drop (absent there). Ledger row to follow.

## Not here (fences)

No landing change (single-get + POST verified unchanged), no packages/db change, no packages/api-client change, no Worker secret puts / live verification / milestone docs rotation (#122), no two-factor/email-reset/user-UI (spec out-of-scope).
```

- [ ] **Step 5: Merge and watch the deploy run**

```bash
gh pr view --json url -q .url
gh pr merge --squash --delete-branch
gh run list --branch main --limit 1
gh run watch <run-id> --exit-status
```

Expected: the push-triggered run executes `check` then `Deploy teaser (main)` — all steps green, including `Deploy api (sevendays-api)`. NOTE (do not file a bug): immediately after this merge the deployed teaser's `GET /api/v1/appointments` answers 500, not 401 — the Worker has no `BETTER_AUTH_SECRET` until #122's put; `GET /:id` and `POST` stay live and public. Record the run URL in the evidence file.

---

### Task 6: v1 pick (SPLIT) + ledger row + issue close (the runbook tail)

**Files:**
- The pick executes ONLY in `~/Projects/sevendays-v1-seed` (never check `v1` out in the main workspace — runbook rule)
- Modify (on main, after the pick): `docs/agents/v1-picks.md` (the ledger row)

**Interfaces:**
- Consumes: the squash sha Task 5 merged (`git log origin/main -1 --format=%H` after the merge); the runbook `docs/agents/v1-picks.md` verbatim procedures (classifier `scripts/v1-triage.mjs`; locks incl. `node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed`).
- Produces: the v1 edition carrying the middleware + its proof suite + the env seam (so M5 mounts CMS routes behind a TESTED gate there); the ledger row keeping main and v1 reconciled; #121 closed with the handoff note #122 reads.

**Not here:** any database step (the shared dev DB needs nothing; v1's `/api/v1/appointments` stays 404-by-absence — there is no route to gate); the milestone's remaining picks (#122 drains its own); secrets on the v1 Workers (#122); ticking plan.md boxes 3/8; closing any issue other than #121.

- [ ] **Step 1: Reconcile the backlog (main order)**

```bash
cd ~/Projects/sevendays-v1-seed && git status --short && git log --oneline -3
tail -3 ~/Projects/sevendays/docs/agents/v1-picks.md
```

Expected: the seed is clean at #120's pick `199aad7` or later; the ledger's last row is #120 (`95f0041`). Drain anything pending first — main order, always. (This PR touches no lockfile — no transformed-lockfile procedure this time.)

- [ ] **Step 2: Re-verify the audit-token fence, then triage + pick the squash**

```bash
cd /home/jeius/Projects/sevendays
grep -rniE "appointments" apps/api/src/services/auth.ts apps/api/test/helpers/auth.ts apps/api/test/require-session.test.ts && echo "STOP — fence broken, re-triage" || echo "fence holds"
node scripts/v1-triage.mjs <squash-sha>
```

Pre-mapped expectation: **SPLIT**. v1-paths (apply whole or as hunks): `apps/api/src/services/auth.ts` (new — whole), `apps/api/test/helpers/auth.ts` (new — whole), `apps/api/test/require-session.test.ts` (new — whole; resolves `acquireDb` from v1's own `routes/v1.ts`), `apps/api/src/env.ts` (the optional-key hunk + comment), `apps/api/src/env.test.ts` (the two new tests), `apps/api/src/services/db.ts` (the `session?` Variables hunk — type-only), `apps/api/test/helpers/env.ts` (the `TEST_AUTH_SECRET` + `testEnv` hunk). main-only (drop): `apps/api/src/routes/appointments.ts` + `apps/api/test/appointments.test.ts` (both ABSENT on v1 — the edits are no-ops there by construction), `docs/progress.md`, `docs/plan.md`, `docs/superpowers/plans/*`, `graphify-out/` (regenerated in the seed). Content pass: the code comments' ticket references (`M4 ticket 04`, `#119`) are the same class #119/#120 carried — no edition vocabulary; no content-drops expected.

- [ ] **Step 3: Locks, push, watch (runbook verbatim)**

```bash
cd ~/Projects/sevendays-v1-seed && pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build && pnpm check && pnpm build
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed
cd ~/Projects/sevendays-v1-seed && git push
gh run watch <the-v1-push-run-id> --exit-status
curl -sS -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/
curl -sS -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/book
curl -sS -o /dev/null -w '%{http_code}\n' https://sevendays-v1-api.pahamajulius.workers.dev/api/v1/appointments
```

Expected: `pnpm check` green in the seed — the picked `require-session.test.ts` passes there (7/7: the middleware is route-independent and the seed's db/env/helpers are byte-compatible); audit exit 0 (the fence grep in Step 2 is the pre-check — zero appointments strings in the picked files); the push run shows `check` + `Deploy v1 (private)` success; live curls: landing `200`, `/book` `404`, v1-api `/api/v1/appointments` `404` (by absence — nothing to gate there until M5). Time-box one hour of conflict work per the runbook — beyond that, STOP and hand the row to the owner.

- [ ] **Step 4: Ledger row on main**

Back in the main workspace, append the row to `docs/agents/v1-picks.md`: date 2026-09-23, #121, the squash sha, `split`, the seed pick sha, and a notes cell covering: the three new files applied whole, the four hunks (env/env.test/db Variables/test helper), the main-only drops (appointments route + test absent on v1; docs; graphify regenerated), the audit-token fence verified at both plan and pick time, locks (check/build/audit results + run id), and the v1 posture note (middleware + tests live on v1; M5 mounts CMS routes behind it; nothing to gate until then; no lockfile change). Commit + push directly to main:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — #121 api session verification split-picked (#121)"
git push
```

- [ ] **Step 5: Close the issue**

```bash
gh issue close 121 --comment "API session verification + appointments-list gating landed via PR #<pr-number> (squash <sha>): requireSession (verification-only BetterAuth instance, bearer plugin, per-request over acquireDb's handle) gates GET /api/v1/appointments behind the uniform 401; the single-get stays public by uuid-opacity and POST stays public for guests; the admin seam's getSessionScopedApiClient reads the cookie server-side and injects Authorization: Bearer through the service binding (exported for #122's probe / M5). Proven over real Postgres (api suite 93→103): no-header/garbage/bad-signature/expired/signOut-revoked → 401, harvested session → 200 through the real middleware, secretless → loud 500; no api-client wrapper moved (29/29 loopback). HANDOFF FOR #122: the teaser's list answers 500 (not 401) until the one-time BETTER_AUTH_SECRET put on sevendays-api — the optional-key ruling keeps every public endpoint live meanwhile; the live 401/200/revocation gate, the v1 secret puts, and the milestone docs rotation are yours. v1 split-picked as <seed-sha> (middleware + its 7 tests + env hunks; the appointments edits dropped — absent there), ledger row recorded."
```

---

## Self-Review (recorded at planning time)

- **Spec coverage vs ticket AC:** verification-only instance (bearer, per-request, no routes, no browser config) → Task 2 (factory + construction inside the middleware; grep-gated no module scope); `requireSession` via BetterAuth's own API, session into context, uniform 401 with module-owned wording → Task 2 (authenticationRequired + `c.set('session', …)`); list gated / `:id` public / POST public → Task 3 (+ the stays-public proofs: unchanged suites + the explicit uuid-opacity test); admin seam (cookie read server-side, Authorization through the service-binding fetch, browser never holds the token, public client stays) → Task 4; integration tests over real Postgres for no-header / garbage / expired / revoked / real-token-200 through the actual middleware → Task 2 (all five + bad-signature + secretless) riding the compose DB per ADR-0008; `pnpm check` green + api-client unchanged-unless-moved → Task 5 Step 1 (35/35; api 103/13; zero api-client edits, drift-checked both at planning and at the gate). Spec § Testing posture's "mocked clock where practical" satisfied by the db-update expiry form (reaches BetterAuth's own expiry comparison identically — deviation recorded in the header recon).
- **Sibling fences:** #122 owns the live secret puts, the live teaser gate (the authenticated read through the seam), the v1 login leg, the milestone picks close-out, and the tech-stack/AGENTS/CONTEXT rotation — fenced in the header and Task 5's Not-here; this ticket ticks exactly plan.md boxes 6 + 7 (Task 5 Step 3), boxes 3 + 8 stay open. Nothing in `apps/landing` (recon: landing calls only `get`/`create` — both public).
- **Type consistency:** `createVerificationAuth(options: { database: Database; secret: string })`, `SessionData`, `requireSession`, `authenticationRequired` are defined in Task 2 and consumed verbatim in Task 3's route edit; `signUpSession(databaseUrl, email)` → `{ token, userId }` defined in Task 2 Step 1 and consumed by both test files; `getSessionScopedApiClient(cookieHeader: string | null): ApiClient` defined in Task 4 and named identically in the fence greps, the PR body, and the #122 handoff; `TEST_AUTH_SECRET`/`testEnv` produced in Task 1 and consumed in Task 2. All Task 2/4 code blocks are the spike-validated verbatim forms that typechecked and ran green on 2026-09-23.
- **Counts re-derived:** api suite 93/12 baseline → Task 1 +2 (env, 95/12) → Task 2 +7 (scratch suite, 102/13) → Task 3 net +1 (−1 Known-Gap, +1 inverse-401 replacement, +1 uuid-opacity — appointments 40→41) = **103/13 at the gate** (pinned in GC + Task 5 Step 1 + the PR body). `pnpm check` 35/35 turbo tasks (no scripts added). plan.md gains exactly 2 ticks (boxes 6, 7); boxes 3 + 8 untouched. Task 3 Step 2's red = exactly 7 named tests; the appointments POST group (8 tests) and non-list single-get tests stay green unauthenticated — both enumerated from the live spike run, not estimated.
- **Mocked-boundary check:** no mocks anywhere in this plan — every new test drives the real BetterAuth HTTP handler (`auth.handler(new Request(…))`), the real Hono middleware chain, and the real Postgres tables (ADR-0008); the one mutation (the expiry case) writes through drizzle to the real `session` row and asserts through the middleware, and the one revocation goes through `auth.api.signOut`. The admin seam (Task 4) is untested by design (admin's standing vitest gap; the spec assigns its verification to #122's live gate) — stated, not hidden.
- **v1-pick pre-check:** the three pickable new files carry zero appointments strings (grep-fenced at Task 2 Step 5 AND re-checked at Task 6 Step 2); the dropped edits target files absent on v1 (no-op by construction); no lockfile change rides this PR.


