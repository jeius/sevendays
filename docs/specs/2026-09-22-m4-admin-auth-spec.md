# Milestone 4 — Admin Auth (v1-track) (spec)

Consolidates the standing decisions that shape M4 — ADR-0004 (shared-tables token verification, no cross-domain cookies), the roadmap's M4 block, the delivery-versions v1-track ruling (issue #76: BetterAuth is v1-track, the appointments dashboard is v2), ADR-0011 (per-request DB clients on workerd), and ADR-0016 (frontends reach the API through the `API` service binding) — with this session's BetterAuth 1.7 integration research (npm `latest` = **1.7.5**, v1.7 docs line). No wayfinder map was chartered for M4: the topology was already decided by ADR-0004 and the roadmap; the remaining choices (login method, provisioning, verification mechanics, runtime posture) were resolved against the 1.7 docs and the repo's own ADRs, and are recorded here. Published as GitHub issue #117; `docs/plan.md`'s M4 checkboxes were red-penciled to match on 2026-09-22.

## Problem Statement

The admin app is a shell with no way in: every screen is a stub, nothing authenticates, and the API trusts every caller equally. Concretely, three gaps block the v1 edition's remaining milestones:

1. **No staff identity.** `apps/admin` has no login, no session, no user concept. M5's CMS cannot gate writes on anything.
2. **Public PII.** `GET /api/v1/appointments` reads customer names, phones, and emails with no credentials — a stopgap documented at M2 ("public until M4 closes both"). The appointments dashboard moved to v2 (issue #76), but the list exists on main today and its enumeration risk must close now (the single-get's disposition is ruled below).
3. **No verification seam.** `apps/api` has no middleware that can answer "who is calling" — M5's mutating routes need one to exist and be proven before they arrive.

The roadmap's original four M4 checkboxes name the parts (BetterAuth in admin, shared tables, secret, verify) but not the decisions this spec settles: which BetterAuth version and config shape, how sessions survive workerd's request-scoped I/O, how the first staff user exists without self-serve sign-up, how the session token travels admin→api, and what "mutating routes" means now that every admin mutation except the public booking POST lives in v2/M5.

## Solution

BetterAuth 1.7 (`^1.7.5`) wired server-side into `apps/admin` over the shared `packages/db` schema: email+password staff login with self-serve sign-up disabled, users provisioned by an owner-run CLI. BetterAuth's four core tables plus the admin plugin's fields generate into `packages/db/src/schema/` as Drizzle code and land as migration 0005 through the house `db:generate`/`db:migrate` flow. The admin Worker serves BetterAuth's routes at `/api/auth/*` behind a `/login` page on the design system; the `_shell` layout gates every admin screen on a session. `apps/api` gains a verification-only BetterAuth instance (bearer plugin) over the same tables and a `requireSession` middleware returning the uniform 401 envelope — applied immediately to the appointments list read, closing the public-PII stopgap (the single-get stays public by uuid-opacity, preserving the M2 confirmation read-back contract); `POST /api/v1/appointments` stays public (guest booking). The admin's server functions extract the httpOnly session cookie server-side and forward the token as `Authorization: Bearer` over the `API` service binding — the browser never holds the raw token, and no cookie crosses a domain (ADR-0004 intact). Both apps build their auth instance per request over a per-request DB client (ADR-0011). The milestone verifies live: staff login against the real tables on the teaser, authenticated read through the gate, unauthenticated rejection, sign-out revocation — then the same gates on the picked `v1` deployment.

## User Stories

1. As a staff member, I want to sign in with my email and password at the admin app, so I can reach the studio's management screens.
2. As a staff member, I want a session that survives navigation for days, so I don't re-login on every click.
3. As a staff member, I want to sign out from the shell's user card, so a shared computer doesn't stay signed in.
4. As a staff member arriving at an admin URL while signed out, I want to land on login and return to where I aimed after signing in, so deep links keep working.
5. As a staff member, I want wrong credentials rejected with a generic message, so nobody can probe which emails exist.
6. As the studio owner, I want to provision staff accounts myself via an owner-run command, so strangers can never self-register into the admin app.
7. As the studio owner, I want to reset a staff password the same way, so a forgotten password doesn't lock the studio out of its own tool.
8. As the studio owner, I want login attempts rate-limited, so credential stuffing against the admin URL fails cheap.
9. As a customer, I want my booking to work without an account, so booking stays low-friction (PRD: customers never authenticate).
10. As a customer, I want the appointments API closed to the public, so my name, phone, and email can't be enumerated.
11. As a developer, I want BetterAuth's tables living in `packages/db` behind the one migration flow, so auth state is governed by the same schema discipline as the catalog.
12. As a developer, I want the API to verify the session token against the shared tables with one DB lookup, so there's no cross-domain cookie infrastructure and no session-assertion hop (ADR-0004).
13. As a developer, I want the token forwarded as `Authorization: Bearer` inside the existing service-binding fetch seam, so the credential rides the same transport as every other admin→api call (ADR-0016) and no client code changes.
14. As a developer, I want a uniform typed 401 envelope from the auth middleware, so the admin app maps "signed out" to a redirect, not an error card.
15. As a developer, I want auth instances built per request over per-request DB clients, so the workerd "Cannot perform I/O on behalf of a different request" failure ADR-0011 captured can't recur in the auth path.
16. As a developer, I want the auth surface mounted before M5 needs it and proven by tests plus a live gate, so the CMS milestone builds on a verified seam instead of building the seam.

## Implementation Decisions

### Version and packages

- **`better-auth@^1.7.5`** (npm `latest`, v1.7 docs line — `better-auth.com/docs/llms.txt`) as a runtime dependency of **`apps/admin`** (the auth server) and **`apps/api`** (the verification instance). The workspace has no catalog convention for shared runtime deps of this kind — pin the same range in both manifests; a catalog entry is the ticket's call if it matches how other cross-app deps are pinned.
- The CLI ships as the **`auth`** package (`npx auth@latest …`), run via `pnpm dlx auth@1.7.5` with the version pinned in the ticket commands, so generation and admin-creation are deterministic. (The `betterauth-cli` name in the schema barrel's TODO comment is stale — the command is `auth`.) The repo's BetterAuth-version guidance in `AGENTS.md` already points at the v1.7 docs line; after install, the lockfile-resolved version confirms it.
- Documentation rule for every M4 ticket: consult the **v1.7** docs index, not unversioned pages — the repo's installed BetterAuth skills already encode this versioning guidance.

### The auth schema (`packages/db`)

- `pnpm dlx auth@1.7.5 generate --config apps/admin/src/lib/auth.ts --output packages/db/src/schema/auth.ts --adapter drizzle --dialect pg` — run from the repo root with explicit `--config`/`--output` (the CLI's autodiscovery only looks in `./`, `./lib`, `./utils` and their `src/` variants, so a cross-package layout must name both). Generation needs no live DB connection in this mode, but it **does** load the config — so the auth instance file must exist first and must not import anything that can't load outside a bundler (config purity is a constraint on `src/lib/auth.ts`).
- The generated file carries the four core tables — **`user`, `session`, `account`, `verification`** — plus the **admin plugin's** additions to `user` (`role`, `banned`, `banReason`, `banExpires`) and its session field, plus the table the configured rate-limit storage requires. Hand-adjust only to match house style (column formatting, `.js` import extensions); regenerate — never hand-edit — when plugins change.
- The file joins `packages/db/src/schema/index.ts`'s barrel (replacing the stale TODO comment) with relations added alongside the existing ones; **migration 0005** comes from the house flow (`pnpm --filter @sevendays/db db:generate` → `db:migrate` over `DATABASE_MIGRATE_URL`). Never `auth migrate` — that's the Kysely-only path; Drizzle migrations are drizzle-kit's (existing rule: migrations are generated, never hand-edited).
- `packages/types` does **not** mirror auth shapes. Auth types flow from `typeof auth.$Infer.Session` in each app that owns an instance; the shared-types package stays the catalog/appointment vocabulary. (Zod validation of *external input* still applies to every new route payload; auth's own endpoints validate themselves.)

### The admin auth server (`apps/admin`)

`apps/admin/src/lib/auth.ts` exports a **factory**, not a module-scope instance (see runtime posture below):

```ts
// Shape, not final code — the ticket owns the file.
export function createAuth() {
  return betterAuth({
    database: drizzleAdapter(createDbClient(env.DATABASE_URL), { provider: 'pg' }),
    // baseURL comes from BETTER_AUTH_URL; trustedOrigins = the admin origin itself
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,            // staff-only; provisioning is the owner CLI
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    plugins: [
      admin(),                        // role vocabulary + the createUser/CLI path
      tanstackStartCookies(),         // MUST be last (cookie-setting through Start)
    ],
    session: { expiresIn: 60*60*24*7, updateAge: 60*60*24 },  // defaults, pinned
    rateLimit: { enabled: true, storage: 'database' },         // memory is per-isolate on Workers — ineffective
  });
}
```

- **Login method: email + password.** No social providers, no magic links, no passkeys — a staff-only internal tool (the repo's email-and-password skill guidance applies; scrypt default hashing kept). **No email flows at all** in v1: email verification off (`create-admin` marks the address verified anyway), no `sendResetPassword` — password resets are the owner CLI (below), keeping the admin Worker Resend-free (`LANDING_ORIGIN`-class email env stays API-only).
- **`disableSignUp: true`** — the `/sign-up/email` endpoint refuses; the only user-creation path is the owner-run CLI. Account-enumeration resistance is BetterAuth's built-in (constant messages, dummy ops on invalid requests); the login UI never echoes which field was wrong.
- **The `admin()` plugin ships server-side only.** It exists for its documented provisioning path (`auth.api.createUser`, the `create-admin` CLI, `role`) — not for a user-management UI, which v1 doesn't have. No `adminClient` on the frontend (nothing calls admin methods from the browser).
- **Routes**: mounted per the TanStack Start integration — `apps/admin/src/routes/api/auth/$.ts` with `createFileRoute('/api/auth/$')` and `server.handlers` mapping GET/POST to `auth.handler(request)`, constructing the instance per request inside the handler. Probe: `GET /api/auth/ok` → `{"status":"ok"}` is the smoke endpoint for the verify gate.
- **Client**: `createAuthClient()` from `better-auth/react` (same-origin `/api/auth` default). Login submits via `authClient.signIn.email`; sign-out via `authClient.signOut()`.
- **Session checks server-side**: `getSession`/`ensureSession` helpers as TanStack Start server functions (`createServerFn` + `getRequestHeaders` → `auth.api.getSession({ headers })`), one per request over a fresh instance — the documented Start pattern, fitted to the factory.

### Worker runtime posture (the ADR-0011 lesson applied to auth)

workerd scopes sockets to the request that created them — a module-scope `postgres()` client breaks every request after the first per isolate (ADR-0011, captured live at the M1.5 gate). BetterAuth's `drizzleAdapter` **captures a single db instance**, and the `database` option has no lazy-function form (verified against 1.7's init-options types: pools | dialect | adapter instance | D1 | Kysely config — no factory). Therefore:

- **The auth instance is constructed per request** (in the route handler, the session server-fns, and the API middleware), each over `createDbClient(process.env.DATABASE_URL)` — the same per-request posture the API's acquisition middleware already applies to its own db. `betterAuth()` init does no I/O (Drizzle schema validation reads local metadata), so the cost is CPU-only at staff-tool volume — the same trade ADR-0011 already accepted for connection setup.
- The bootstrap CLI runs in Node (tsx), where a one-shot instance is unremarkable.
- If per-request init ever measures hot, the fallback to investigate is an upstream-sanctioned lazy mechanism at that BetterAuth version — not a module-scope client (proven broken) and not a hand-rolled adapter (internals coupling).

### Staff provisioning (owner-operated, matching the handover model)

- **`pnpm --filter @sevendays/admin create-staff`** — a script wrapping `pnpm dlx auth@1.7.5 create-admin --config <auth config> --email … --name … --role admin`, run by the owner with `DATABASE_URL` + `BETTER_AUTH_SECRET` in the environment (the `db:seed` `tsx --env-file` precedent for env loading; the CLI prompts for the password interactively — no password ever rides a flag or a file). The CLI asks for confirmation when users already exist, so additional staff and **password resets** (re-run with a new password after removing the stale row, or the admin plugin's server API once an admin session exists) are the same owner-operated path. This is deliberately consistent with ruling #75's shape: the owner operates v1's machinery for its life.
- No Settings→Users screen in v1 (out of scope below); `role` exists in the schema for M5+ to gate on if it ever needs to.

### Login UI + shell gate (the UI-bearing ticket)

- **`/login`** — a public route outside `_shell`, on the design system (`packages/ui` primitives: card, input, label, button — the Tier-1 pull-list already has them), petrol-wash body + white card per the M3 register. The ticket names its skill set per the AGENTS.md UI rule (`prototype` + `ui-ux-pro-max`, plus `design`/`design-system`/`ui-styling` as relevant) and gets **rendered variants the owner reacts to** before the build lands (spec #94 amendment — this is a new composition).
- **`_shell` gate** — the existing pathless layout's `beforeLoad` calls the session server-fn; no session → `redirect({ to: '/login', search: { redirect: location.href } })`. The login round-trip consumes `redirect` to return to the aimed URL (stories 4/14). The v2-stub screens stay stubs — the gate changes nothing about their content.
- **Sign-out** — an affordance in the shell's user card (M3's variant-A top bar/sidebar already reserves the slot); calls `authClient.signOut()` and redirects to `/login`.
- Signed-in identity (name/email) renders from the session the gate already fetched — no extra API call.

### API-side session verification (ADR-0004, made concrete)

- `apps/api/src/services/auth.ts` (or `services/session.ts`) exports the **verification instance factory**: same shape as the admin's minus browser-facing pieces — `drizzleAdapter` over the per-request db, **`bearer()` plugin**, no `tanstackStartCookies`, no baseURL requirement — plus a `requireSession` Hono middleware that calls `auth.api.getSession({ headers: c.req.headers })` and either sets the session into context or returns the **uniform 401 envelope** (`c.json({ error: 'Authentication required.' }, 401)` — wording joins `REJECTION_MESSAGES`-class module-owned copy; `details` omitted).
- **Why a BetterAuth instance and not a hand-rolled lookup**: the `session.token` column does not store the presented token verbatim (BetterAuth hashes tokens for storage), so a Drizzle-side `WHERE token = $1` silently never matches — the exact internals-coupling trap. Going through `auth.api.getSession` keeps the API on the supported surface while doing exactly what ADR-0004 specifies: the bearer token is checked against the shared tables with expiry handled (and session refresh/session-table semantics stay BetterAuth's).
- **Transport**: the admin's `api.server.ts` seam gains a session-scoped client — `getSessionScopedApiClient()` reads the incoming request's session cookie **server-side** (suffix-match `session_token`, not `session_data`; the `__Secure-`/`better-auth` prefix varies by environment, so match by suffix), then wraps the existing service-binding `fetch` to add `Authorization: Bearer <token>`. The browser never sees the raw token (no `localStorage`, no `set-auth-token` consumption — the bearer docs' own XSS caveat doesn't apply to this shape), and no cookie header crosses apps. The public `getApiClient()` stays for any anonymous call (none today, but the seam keeps both).
- `POST /api/v1/appointments` is **not** gated — it is the customer booking endpoint (v2's payload on main). The M4 middleware's first applications are the two admin-facing reads; M5's CMS mutations mount behind it from day one.

### Closing the public appointments reads

- `GET /api/v1/appointments` and `GET /api/v1/appointments/:id` gain `requireSession` — the M2-documented "public until M4 closes both" posture ends here. Customer-facing reading is unaffected: the confirmation page's read-back rides the landing app, which… also calls these endpoints server-side for `/booking/:id`. **Ruling required by this close** (recorded, not deferred): the landing `/booking/:id` server-fn keeps working by construction — it is a *server-to-server* call from the landing Worker, not a browser call, but it carries no credentials. Options: (a) scope the gate to the *list* only and leave the single-get public (a booking id is an unguessable uuid — the confirmation page's contract), or (b) gate both and give the landing Worker a scoped service credential. **Decision: (a)** — gate the list; leave `GET /:id` public with its existing uuid-opacity, matching M2's confirmation-read-back contract and the PRD's guest flow; the PII enumeration risk (the list) is what closes. `POST` unchanged. This refines the roadmap line "closes both" → "closes the list; the single-get stays public by uuid-opacity" — the red-penciled checkbox says so.
- The api-client surface is unchanged (the client already accepts a custom `fetch`; the Authorization injection lives in the admin's seam). If any appointments wrapper signature must react, loopback tests follow it (ADR-0006 discipline).

### Environments and secrets

| Where | What | How |
|---|---|---|
| `apps/admin` dev | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (=`http://localhost:3000`), existing `API_URL` | `.env.local` (vite dev) / `.dev.vars` for built-worker `wrangler dev`; extend `.env.example` |
| `apps/api` dev | `BETTER_AUTH_SECRET` (verification instance) | `.dev.vars` + `.dev.vars.example` |
| Teaser (main) | `BETTER_AUTH_SECRET` on `sevendays-admin` + `sevendays-api` — one-time `wrangler secret put` (the `RESEND_API_KEY` precedent); `DATABASE_URL` on `sevendays-admin` — extend the deploy workflow's env-secret sync step to also target the admin Worker (the api's sync is the pattern); `BETTER_AUTH_URL`=`https://sevendays-admin.pahamajulius.workers.dev` as a `--var` riding every admin deploy (the `API_URL` mechanism) | ci.yml deploy legs |
| v1 edition | same three, pointed at `sevendays-v1-admin`/`sevendays-v1-api` and the `v1` GitHub environment's own secret slots | same workflow, branch-keyed legs |
| Ship (M6) | fresh `BETTER_AUTH_SECRET` in the dedicated account — rotation-at-ship is already ruled (#75) | M6's checkbox |

- Secrets never land in committed files (standing rule). The secret is ≥32 chars (`openssl rand -base64 32`). BetterAuth reads `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` from env automatically — no in-config `secret`/`baseURL` duplication.
- The admin Worker talks to Postgres directly for auth (hence its new `DATABASE_URL`) — transaction-pooled, `prepare: false`, per request, exactly the api's topology (ADR-0007 + ADR-0011). `nodejs_compat` is already on.

### Testing posture

- **`apps/api` vitest suite** (real Postgres, ADR-0008): `requireSession` integration tests drive a test auth instance over the same compose database — a test-shaped config (`emailAndPassword` with sign-up **enabled**, `bearer()` on) so the fixture can `signUpEmail` and harvest the session token from the `set-auth-token` response header, then hit a protected route: no header → 401 envelope; garbage/expired token → 401; valid token → 200 through the real middleware; sign-out (session row revoked) → 401. Expiry-boundary case with a mocked clock where practical (the `past_datetime` precedent). The appointments-list gating rides the same fixtures.
- **Admin**: still no vitest setup (known gap, standing) — the auth wiring there is verified by the live gate, not a suite; keep the seam logic thin (cookie suffix-match + header wrap) so the api suite owns the logic it can reach.
- **api-client**: no surface change expected; loopback tests only if a wrapper moves.

### v1 edition posture (picks)

- Every M4 PR is booking-free by construction → **PICK** expected across the board, with one predicted **SPLIT**: the appointments-reads PR touches `routes/appointments.ts` (+ possibly its service module), which doesn't exist on `v1` — the auth-middleware module itself must land on `v1` (M5 mounts CMS routes behind it there), the appointments edits drop at pick time. Ledger rows per merge, as always (`docs/agents/v1-picks.md`).
- On `v1`, M4's visible outcome is: login works on `sevendays-v1-admin`, the middleware exists and is proven by tests, and the first *deployed* gated route arrives with M5's CMS. The verify gate covers v1's login + the teaser's full read-gating.

## Tickets

Five tickets, in execution order (create as issues when the build starts; numbering follows the M2/M3 convention):

1. **M4-01 — Foundation**: `better-auth@^1.7.5` in both apps; `src/lib/auth.ts` factory (config-pure, no bundler-hostile imports) so generation has a config to read; `auth generate` → `packages/db/src/schema/auth.ts`; barrel + relations; migration 0005 via the house flow; env files/examples (`apps/admin/.env.example`, `apps/api/.dev.vars.example`); deploy-workflow wiring (`BETTER_AUTH_URL` var + admin `DATABASE_URL` sync) landed dormant-safe for both editions.
2. **M4-02 — Admin auth server + provisioning**: `/api/auth/$` route with per-request instances; `tanstackStartCookies` last; session server-fns (`getSession`/`ensureSession`); `/api/auth/ok` probe green in dev; the `create-staff` CLI script (documented as the provisioning **and** reset path); a real staff user created against the live dev DB.
3. **M4-03 — Login UI + shell gate** (UI-bearing; skill set named on the ticket; owner-reacted variants per #94): `/login` page on the design system; `_shell` `beforeLoad` gate with `redirect` preservation; sign-out in the user card; `authClient` wiring; CDP/manual pass on the shell screens confirming the gate redirects and stubs render unchanged.
4. **M4-04 — API verification + closing the list**: verification-instance factory + `requireSession` middleware (uniform 401, module-owned wording); applied to `GET /api/v1/appointments` (list only — the single-get ruling above); the admin seam `getSessionScopedApiClient()` (suffix cookie parse → `Authorization` injection through the service-binding fetch); api integration tests per the testing posture; loopback coverage only if a wrapper moved.
5. **M4-05 — Verify + close-out**: the live gate below on the teaser; v1 picks for all M4 PRs (SPLIT expected on M4-04's appointments edits) + the v1 login leg verified on `sevendays-v1-admin`; docs rotation (`docs/progress.md`, `tech-stack.md` Auth section → integrated posture with versions, `AGENTS.md` auth-state line flips, `CONTEXT.md` glossaries gain Session/Staff User); ledger rows recorded.

Dependencies: 01 → 02 → {03, 04} → 05 (03 and 04 are parallelizable). Nothing in M4 touches `apps/landing` except the single-get ruling's *non*-change (documented).

## Verification (the milestone gate)

Live, on the teaser stack (real Supabase), recorded in `docs/progress.md`:

1. **Login against the real tables**: `GET /api/auth/ok` → ok; sign-in at the teaser admin with the CLI-provisioned user succeeds; a wrong password fails generically; the session row is visible in Postgres.
2. **The gate holds**: unauthenticated `GET /api/v1/appointments` → 401 `{"error":"Authentication required."}`; the same call through the admin's session-scoped client (signed-in browser hitting an admin data route, or an authenticated probe) → 200; `GET /api/v1/appointments/:id` still 200 for a known booking (uuid-opacity ruling); `POST /api/v1/appointments` still 201 (guest flow unbroken).
3. **Revocation**: after sign-out, the previously-working authenticated read → 401.
4. **v1 leg**: `v1` picked through M4; login works on `sevendays-v1-admin` against the same tables; its `/api/v1/appointments` stays 404-by-absence (nothing to gate there).
5. `pnpm check` green across touched packages; the api suite count grows by the auth tests.

**Exit criteria** (unchanged in substance, sharpened in wording): staff can log in, sessions verify on the API, the public appointments list is closed, and the sign-out revocation is proven — on main's teaser and on `v1`.

## Out of scope

- **Two-factor authentication** — staff-only tool at v1 scale; revisit as a hardening candidate if the client asks (the repo's two-factor skill set is the entry point when that day comes).
- **Password-reset email flow / email verification** — the owner CLI is the v1 reset path; no admin-side email dependency.
- **User-management UI** (Settings→Users), per-branch roles/permissions — the latter is PRD-deferred beyond v2.
- **Customer accounts** — PRD out-of-scope; landing stays anonymous (ADR-0004).
- **Session cookieCache, secondaryStorage, Hyperdrive** — default session semantics at staff-tool volume; measure before adding machinery.
- **Rate-limit custom rules beyond storage** — defaults (sensitive endpoints 3/10s) suffice; the booking-endpoint limiter is v2 hardening.
- **The appointments dashboard, status mutation** — v2 (issue #76 ruling 6); nothing in M4 builds toward it except the middleware M5/M5-v2 share.

## References

- ADR-0004 (shared-tables token verification), ADR-0007 (connection topology), ADR-0008 (integration tests), ADR-0011 (per-request db client), ADR-0016 (service binding), ADR-0015 + `docs/agents/v1-picks.md` (edition picks)
- `docs/specs/2026-09-11-delivery-versions-spec.md` (issue #76) — the v1-track ruling and the owner-operates-v1 handover model this spec's provisioning matches
- BetterAuth v1.7 docs: `llms.txt` index; pages consulted this session — integrations/tanstack, concepts/session-management, concepts/cli, concepts/database, plugins/bearer, plugins/admin, reference/options
- Repo skills consulted: `better-auth-best-practices`, `better-auth-security-best-practices`, `create-auth`, `email-and-password-best-practices`
