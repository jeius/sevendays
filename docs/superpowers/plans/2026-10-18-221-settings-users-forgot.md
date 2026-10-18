# M7 Ticket 10 — Settings: the Account + Users Tabs + Forgot-Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Tasks 2, 4, and 5 are UI-bearing and load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule, spec #94 amendment): Task 2 composes the forgot/reset forms on the login surface, Task 4 the three-tab strip + the Account tab, Task 5 the Users tab (table, expanded sessions row, create sheet, the dialogs). **Task 6 renders the round for owner reaction in BOTH themes and proves the reset flow live on the dev stack** (the ticket's fourth AC; light judged first, the dark counterpart in the same round per #162). Task 6 is the only controller interaction inside the build; everything else runs to the gates.

**Goal:** Staff manage themselves; the owner manages the team (ticket #221, spec § *Settings made real* — #160's ruling + ADR-0021's topology): **forgot-password** on `/login` (`requestPasswordReset` with generic anti-enumeration responses on the already-enabled database-backed limiter; `resetPassword` consuming the emailed token on a new `/login/reset`), the reset email forwarded `{ to, url }` over the `API` service binding to a small internal send endpoint on the API Worker reusing the live Resend seam (the admin Worker stays Resend-free; sender `no-reply@` when the verified domain arrives — #222's), and the **Settings screen grows up**: the Account tab (every staff member — read-only identity, editable display name, change-password verifying the current password, sign-out-of-all-sessions) and the owner-only **Users tab** (ADR-0018's deferred users page: list, create with an owner-chosen temp password handed over in person, direct password reset, ban/unban, revoke-all-sessions, per-user session listing with individual revoke, guarded hard delete). Lockout guards: no self-delete, no self-ban, the last active owner protected from both. Impersonation ships no UI. The email's actual deliverability verifies in #222.

**Architecture:** Seven tasks over three packages: (1) `packages/types` + `apps/api` — the `{ to, url }` wire schema, the pure reset-email builder, and the guarded internal endpoint `POST /internal/reset-email` (outside `/api/v1` — no db acquisition; the `x-internal-token` shared-secret guard, the curated 503 when unprovisioned, Resend-result-returning posture per ADR-0021; the email event class grows a `purpose`), TDD; (2) `apps/admin` — the reset-email forward seam over the service-binding transport (`api.server.ts` exports its internal-fetch deps; the seam never throws — anti-enumeration), `createAuth` gains the injected sender behind its config-purity rule, `/login` grows the forgot toggle, `/login/reset` consumes the token; (3) `apps/admin` — the Users lib seams (`users-guards` — the self/last-active-owner refusals, one pure module shared by the server fns and the UI affordances; `users-state` — the role vocabulary + row shaping) + the `users.functions.ts` server fns over the already-mounted `admin()` plugin with forwarded headers, TDD; (4) the Settings restructure — the three-tab strip (Account | Users owner-only | Site), the Account tab over `authClient` browser calls, the Site panel moved verbatim; (5) the Users tab UI — the table with the own-row view-only law, the expanded sessions row (tokens never render), the create Sheet on #218's async-Save contract, the ban/reset/delete dialogs; (6) the owner-reacted variants round both themes + the live dev-stack reset-flow proof; (7) gates + docs rotation (this ticket ticks plan.md's *Settings made real* box and **annotates — not ticks — the reset-email box**), the PR, the v1 pick, the issues, `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes, zero migrations (the BetterAuth schema already carries `role`/`banned`/`ban_reason`/`ban_expires` on `user` + the `rate_limit` table — read whole this session, `packages/db/src/schema/auth.ts`), zero ci.yml changes (**reserved for #192's cutover** — the new secret rides `wrangler secret put`, never a committed var). **better-auth 1.7.5** — every claim below probed against the installed `apps/admin/node_modules/better-auth/dist` this session: `requestPasswordReset` answers the SAME 200 `{ status: true, message: "If this email exists in our system, check your email for the reset link" }` whether or not the email exists (with timing-attack simulation on the miss — `api/routes/password.mjs:56-64`); the token URL is `${baseURL}/reset-password/${token}?callbackURL=${encodeURIComponent(redirectTo)}` (`password.mjs:81`) and the GET callback 302s to `callbackURL?token=VALID_TOKEN` or `?error=INVALID_TOKEN`; `resetPassword` enforces min/max length, consumes the verification row, and — with `revokeSessionsOnPasswordReset: true` (already configured, `auth.ts:30`) — deletes every session (`password.mjs:129-166`); the built-in limiter's special rule caps `/request-password-reset` at **3 per 60s** (probed, `api/rate-limiter/index.mjs:303-316`) — nothing new to configure; the admin plugin refuses self-ban/self-delete itself (`routes.mjs` `banUser`/`removeUser`: `YOU_CANNOT_BAN_YOURSELF` / `YOU_CANNOT_REMOVE_YOURSELF`) and `banUser` revokes sessions — **the last-active-owner guard is ours, not theirs**; `setUserPassword({ userId, newPassword })`, `listUserSessions({ userId })`, `revokeUserSession({ sessionId })`, `revokeUserSessions({ userId })`, `createUser({ email, password, name, role })`, `listUsers({ query })` all exist (grep-proofed in `plugins/admin/admin.d.mts`; the server-side `{ headers }` call shape typechecks — **spiked live as a vitest expectTypeOf file run through `pnpm --filter @sevendays/admin typecheck`, deleted before this plan's commit**); the inferred client surface carries `requestPasswordReset({ email, redirectTo? })`, `resetPassword({ newPassword, token? })`, `updateUser`, `changePassword({ currentPassword, newPassword, revokeOtherSessions? })`, `revokeSessions` — **same spike, no client plugins added, and `authClient.admin` does NOT exist** (the Users tab rides the server-side plugin API only, per ADR-0018). `@sevendays/ui` primitives as on disk (22 + theme pair — `Tabs` is NOT among them; the tab strip follows the testimonials-screen local-tab precedent). lucide-react for icons already in the app's set. vitest 4.1.11 plain-node lib-seam tests on admin; the api suite's real-Postgres style for the endpoint. pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#221 "M7 ticket 10: Settings — the Account + Users tabs + forgot-password (ADR-0021)"](https://github.com/jeius/sevendays/issues/221), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *Settings made real* pins the three-tab split, the Users-tab capability list, the deletion guards "confirmed at the live re-ask", and the forgot-password mechanics incl. `no-reply@`, the admin-stays-Resend-free law, and "anti-enumeration: the reset request answers generically; rate limiting rides the already-enabled database-backed limiter"; § *v1-pick classes* pre-rules the payload **"PICK clean, with the ruled ruleset amendment"** — the ruleset amendment itself is #222's, fenced below). ADR-0021 pins the topology (the send endpoint over the `API` service binding, `{ to, url }`, the endpoint "returns the Resend result and the admin surfaces a generic success either way", the sync-request-scoped posture, sender local part `no-reply@` on the verified domain). ADR-0018 pins the role mapping (owner → the `admin` literal; the users page calls the plugin "server-side over the per-request instance behind a role gate"; the plugin's own role gate). The ticket's four acceptance criteria, verbatim: Forgot/reset flows with generic responses + rate limiting; the send endpoint over the service binding (api tests) · The Account tab complete · The Users tab complete with every lockout guard pinned · Owner-reacted rendered variants, both themes. Key recon facts (2026-10-18, main `9e08fe1` — post-#220; every file below read whole this session):

- **The auth server today (`apps/admin/src/lib/auth.ts`):** `createAuth(databaseUrl)` builds the per-request instance (ADR-0011) with `emailAndPassword` (min 12 / max 128, `revokeSessionsOnPasswordReset: true`, `disableSignUp: true`), `admin()` + `tanstackStartCookies()` (last), 7-day sessions, and `rateLimit: { enabled: true, storage: 'database' }` — the limiter the spec says the reset flow rides. **Config purity is a ruled constraint:** "only better-auth subpaths and @sevendays/db may appear in this file's import graph — the CLI loads it via jiti outside any bundler" — so `sendResetPassword`'s implementation cannot import `api.server.ts`; it arrives as an **injected optional parameter** (Task 2), with `auth.config.ts` (the CLI entry) passing nothing. The `/api/auth/$` catch-all (`routes/api/auth/$.ts`) is the one runtime construction site that wires the real sender.
- **The reset flow's moving parts:** `sendResetPassword({ user, url, token }, request)` runs INSIDE the request await (`runInBackgroundOrAwait` with no waitUntil configured — the sync posture ADR-0021 wants; a throw from it would 500 and leak existence, so the injected sender NEVER throws — it resolves `{ sent: boolean }` and logs failures). `redirectTo` passes through BetterAuth's `originCheck` — an absolute same-origin URL (`${window.location.origin}/login/reset`) passes. The token TTL defaults to 1 hour (`resetPasswordTokenExpiresIn` unset).
- **The service-binding transport (`apps/admin/src/lib/api.server.ts`):** the binding fetch resolves at module scope in production builds only (`cloudflare:workers` runtime-constructed import; dev + vitest keep the `API_URL` network path) — `serviceBindingFetch` is module-PRIVATE today. Task 2 exports one `getInternalFetchDeps(): { fetch: typeof fetch; baseUrl: string; token: string | undefined }` (reading `process.env.INTERNAL_SEND_TOKEN` — vars/secrets populate `process.env` under `nodejs_compat_populate_process_env`; service bindings never do) so the reset-email seam rides the same transport rule as every other admin→api call. The internal endpoint is NOT wrapped by `@sevendays/api-client` (ADR-0006 wraps the `/api/v1` contract; this is Worker-to-Worker internal machinery over ADR-0016's transport — a plain fetch is the seam, ruled in Global Constraints).
- **The API's email seam today (`apps/api/src/services/confirmation-email.ts`):** `EMAIL_FROM = 'Sevendays Photography <onboarding@resend.dev>'` (ONE constant, the sandbox sender — the domain swap is #222's), resend@6 resolves `{ data, error }` and never throws (`ResendRejectionError` reifies the rejection name; the classified-code PII floor), `logEmail` events carry `appointmentId` (the reset email has none — Task 1 widens the field set with a `purpose`), and the endpoint failure posture differs from ADR-0014's waitUntil **by ADR-0021's own ruling** (sync, result-returning). Tests mock the SDK with the `vi.mock('resend', …)` pattern (`test/branches.test.ts:19-24`).
- **The internal guard (plan ruling, recorded in Global Constraints + an ADR-0021 dated note):** ADR-0021 describes the endpoint as "service-binding-only (unauthenticated from the public internet's perspective)" — but the API Worker serves a public `*.workers.dev` URL (no `workers_dev = false` anywhere; the frontends' binding transport doesn't need the public route), so a literally unauthenticated send endpoint would be an open relay: anyone could POST `{ to, url }` with an attacker-chosen `url` and make the studio's Resend account send phishing-shaped reset emails. The plan enforces the ADR's intent — "reachable only from the two frontend Workers" — with a **shared secret**: `INTERNAL_SEND_TOKEN` (a Worker secret on `sevendays-api` + `sevendays-admin`, and on the v1 twins at pick time), forwarded as the `x-internal-token` header, compared strictly on the API. Unprovisioned API → the curated 503 `'Reset emails are not configured.'` (the #155 leak-safe pattern); wrong/missing header → a uniform 401. The token's absence never breaks the public surface — the reset request still answers generic success.
- **The sender env (plan ruling):** `RESET_EMAIL_FROM` — an OPTIONAL plain per-environment var on the API (the `LANDING_ORIGIN` pattern), unset at this ticket (the sandbox `EMAIL_FROM` fallback sends; deliverability is #222's AC), set to `no-reply@<verified-domain>` by #222 with zero code churn. The fallback is loud in code (a named constant + the dated comment), not silent.
- **The Settings screen today (`components/settings/settings-screen.tsx`, 413 lines):** header + the Site panel only — its own header comment says "The Account + Users tabs and the three-tab strip are #221's — this screen is header + the Site panel by design." The Save rides a plain Button in the PageHeader's `actions` (no #218 pending vocabulary — the #215 note claimed #218 covers it; the Site panel moves VERBATIM in Task 4, its Save shape included — maturing it is fenced out). The screen reads `siteSettingsQuery.all()`; the route (`routes/_shell.settings.tsx`) renders it plain. The `_shell` gate already returns `user: { name, email, role }` in route context — the strip's role check and the Account tab's identity rows read exactly that (no new fetch).
- **The role-gate precedents:** the audit-log route re-gates server-side (`context.user.role !== 'admin'` → redirect home, `routes/_shell.audit-log.tsx`) — the Users tab needs no route of its own (it is a tab on `/settings`), and the server fns gate themselves through the plugin's `adminMiddleware` (the caller's session rides the forwarded headers — spiked). `nav.ts` is untouched (no nav entry changes). The staff-hidden law: the tab strip omits Users for `role !== 'admin'` (the `visibleNavGroups` vocabulary, applied locally).
- **The Users tab's data path (ADR-0018's pattern):** server fns in a new `lib/users.functions.ts` call `createAuth().api.<method>({ headers: getRequestHeaders(), … })` — the plugin's own role gate reads the caller from those headers; refusals resolve as the house result-value union (never throw across the RPC boundary — the #155 ruling). The lockout guards run **server-side over a fresh `listUsers` read** (a client-passed list could be stale), and the same pure module runs client-side to shape affordances (own row view-only, last-owner actions annotated). `listUsers` returns `{ users, total }`; the tab fetches `limit: 100` (a 3-branch studio's staff list; no pagination UI — fenced). Session rows from `listUserSessions` carry `token` — **tokens never render** (shaped away in `users-state.ts`, pinned by test).
- **Sibling fences (spec § Sequencing; the tickets' own bodies):** NOT here, regardless of temptation: **the Resend sending-domain verification + the end-to-end inbox check** — #222; **the email pair's return to v1's env** (`RESEND_API_KEY`/`LANDING_ORIGIN` un-shed, `env.ts` flip) — #222 (the pair already exists on main's env; nothing flips here); **the audit/pick ruleset amendment** (`scripts/seed-v1/`, `scripts/audit-v1-absence.mjs`, the conflict-policy line) — #222; **the `docs/staff-provisioning.md` demotion + `create-staff` script changes** — #222 (the CLI stays the bootstrap/break-glass path untouched; only its stale auth.ts COMMENT updates here); **`.github/workflows/ci.yml`** — reserved for #192's cutover (the new secret rides `wrangler secret put`, never CI); **the landing redesign + site-settings consumption** — #223/#224 (zero landing files); **the M7 close-out box** — #225; **impersonation UI** (ships no UI, per the ticket); **role changes after create** (the role picker is at create; editing roles post-create is not in the ticket); **emailed invites** (the temp password handed over in person IS the create path); **audit_log rows for user mutations** (the Audit Log's write side is an API-transaction seam over `/api/v1/admin` mutations; user management rides BetterAuth in the admin app — the Application Log + the Users tab itself are the record; a rules change would be an ADR, not this ticket); **the Site tab's Save maturity** (#218 vocabulary on a non-sheet surface — moves verbatim, fenced); **password policies** (min 12 / max 128 stand as configured).
- **The `docs/plan.md` boxes (Task 7):** `docs/plan.md:169` — `- [ ] Admin — Settings made real (#160): the Account tab (…), the owner-only Users tab (…), the all-staff Site tab; staff-side forgot-password on /login (generic anti-enumeration responses, database-backed rate limiting)` — flips to `- [✅]` with a dated annotation (the Site tab landed in #215; this ticket completes the box). `docs/plan.md:170` — `- [ ] API — the reset email + the sending domain (ADR-0021): the internal send endpoint over the API service binding reusing the live Resend seam (…)` — gets a DATED NOT-TICKED annotation (the endpoint half landed here; the domain verification, the env return, the ruleset amendment, and the runbook demotion stay #222's — the #216 precedent). Nothing else in the M7 block changes; the milestone-level "Verify: owner-accepted rendered variants" box stays unticked until #225.
- **Baselines (live, per AGENTS.md post-#220):** types 17 files / 167 tests; api 31 files (30 passed + 1 skipped) / 422 passed + 3 skipped; api-client 5 files / 45 tests; admin 23 files / 240 tests; landing 10 files / 92 tests; db 4 files. After Task 1: types **18 files / 170 tests** (+1 file, +3 its), api **32 files (31 passed + 1 skipped) / 433 passed + 3 skipped** (+1 file — `reset-email.test.ts` +9 its, `events.test.ts` +2 its). After Tasks 2–3: admin **26 files / 254 tests** (+3 files — `reset-email.test.ts` +4, `users-guards.test.ts` +6, `users-state.test.ts` +4; +14 its over the 240 baseline). Tasks 4–5 add no suite (component-side). (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)

## Global Constraints

- **Branch & baseline:** `feat/221-settings-users-forgot` off main `9e08fe1` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#221)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, grep-gate output, variants screenshots, the live flow narration, the owner's rulings) lands in gitignored `.superpowers/sdd/2026-10-18-221-settings-users-forgot/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs** (better-auth/react/ui primitives all installed). Every task commits only with the checks green **for the packages it touched**: Task 1 runs `pnpm --filter @sevendays/types fix` then `pnpm --filter @sevendays/api fix` BEFORE committing (accept the rewrites) → each package's `test -- --run` → `typecheck`; Tasks 2–5 run `pnpm --filter @sevendays/admin fix` → `test -- --run` → `typecheck`, and Tasks 2, 4, 5 additionally run `pnpm --filter @sevendays/admin build` (the #218 execution ruling: the production build joins the per-task checks whenever a route's module graph gains an import — every one of these tasks adds one). `pnpm build:packages` is NOT needed (no `@sevendays/api` dist change is consumed — the client package is untouched). Never stage `graphify-out/` churn. Never commit secrets — `INTERNAL_SEND_TOKEN` is `wrangler secret put` / `.dev.vars` / `.env.local` only. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file, `docs/plan.md`, and issue bodies alike). Run `graphify update .` at close (Task 7 — code was modified).
- **The anti-enumeration law (binding):** the reset request answers the SAME generic shape for every outcome — unknown email (BetterAuth's built-in timing-simulated miss), send failure, unprovisioned token, limiter 429 (BetterAuth answers its own 429 JSON; the form renders one fixed failure line, see the copy law). The injected sender NEVER throws into BetterAuth (a 500 would leak existence); it resolves `{ sent: boolean; status?: number }` and logs failures `console.error`-only (the #186 metrics-seam posture — Workers Logs retains it). The API endpoint's error bodies carry NO recipient text and NO Resend free-text (classified codes only — the ADR-0014 PII floor).
- **The guard law (binding):** `POST /internal/reset-email` — outside `/api/v1` (no `acquireDb`; the root `requestLogging` + `onError` still cover it); body Zod-validated via `validatedJson(resetEmailSendSchema)` (the `{ to: z.email(), url: z.url() }` schema from `packages/types`); `INTERNAL_SEND_TOKEN` absent from the API env → 503 `'Reset emails are not configured.'` (curated, leak-safe); header `x-internal-token` missing/wrong → uniform 401 (a new `unauthorized` errors.ts helper, the house envelope); the compare is strict equality over a high-entropy secret (≥ 32 chars — timing attacks on a random token are impractical; the runbook note pins the entropy). Valid → build + send synchronously; a Resend rejection → `ResendRejectionError` captured (Sentry, the #184 email-seam posture) + `logEmail` failed with the classified code + 502 `'Email send failed.'`; sent → `logEmail` sent + `200 { status: true }`. No idempotency key (every request mints a fresh token by design — a double-click sends twice, each link valid).
- **The sender law (binding):** the builder's `from` is `env.RESET_EMAIL_FROM ?? EMAIL_FROM` (the new OPTIONAL env key, `z.string().min(1)` in `env.ts` — the `LANDING_ORIGIN` per-environment-var pattern; #222 sets `no-reply@<verified-domain>` with zero code churn). The reset email's copy is pinned verbatim in Task 1's fenced block (owner-ratified at Task 6's round); the recipient NAME is `escapeHtml`'d (free text — the confirmation email's law); the URL is BetterAuth-built machine text (not escaped, the booking-URL precedent).
- **The auth.ts purity law (binding):** `apps/admin/src/lib/auth.ts`'s import graph stays better-auth-subpaths + `@sevendays/db` ONLY. The sender arrives as `createAuth`'s second optional parameter — **controller-ratified at execution (Task 2, 2026-10-18): BetterAuth's own callback data shape, `sendResetEmail?: (input: { user: { email: string; name: string }; url: string; token: string }) => Promise<void>`, so `makeSendResetPassword` stays the single user→wire mapping** (the plan's earlier flat `{ to, url, name }` param sketch composed but would have double-mapped; dist-verified that 1.7.5 declares and passes `{ user, url, token }`); the inline `sendResetPassword` callback wraps it in try/catch-everything (anti-enumeration) and is ABSENT-safe for the CLI (`auth.config.ts` passes nothing — a reset request through the CLI-shaped instance errors loudly like BetterAuth's own unconfigured case, and nothing CLI-side ever makes one). The seam itself resolves failures silently; the WRAPPER (`makeSendResetPassword`) logs the one console.error (the brief's own pinned test forced this — a seam-side log would double it). No other construction site changes behavior (`auth.functions.ts`'s getSession/ensureSession never reset).
- **The lockout law (binding):** one pure module — `apps/admin/src/lib/users-guards.ts` — computes refusals from `(actorId, target, users)`: self (`actorId === target.id`) refuses BOTH delete and ban; deleting or banning the last active owner refuses (`target.role === 'admin' && target.banned !== true` and no OTHER user with `role === 'admin' && banned !== true`); nothing else refuses (a banned-only admin target is deletable/bannable; a staff target always is; "active" means `banned !== true` — an expired ban edge is accepted and noted). The server fns run the guard over a FRESH `listUsers` read before the plugin call; the refusal resolves `{ ok: false, status: 400, message, blockers: string[] }` (the dialog renders `blockers` in-body — the #218 law). The plugin's own self-guards remain the backstop; ours answer first with the house copy. `setUserPassword`/`revokeUserSessions`/`unbanUser` carry no lockout guard (an owner may reset or sign out anyone, including themselves).
- **The Users-tab data law (binding):** every plugin call rides a server fn with `headers: getRequestHeaders()` (the plugin's `adminMiddleware` gates role from the caller's session — ADR-0018's pattern, spiked). All mutations resolve the house result-value union — never throw across the RPC boundary. Session tokens NEVER render (`users-state.ts` shapes session rows to `{ id, createdAt, expiresAt, ipAddress, userAgent }` — pinned by test). The role vocabulary renders Owner/Staff (`'admin'` → Owner; `'staff'` and null → Staff — ADR-0018's domain-vocabulary ruling), never the gate literal in UI copy.
- **The copy law:** every string the executor must produce lands verbatim in this plan's fenced blocks. New unrated staff-facing copy carries the house `TODO(owner-copy)` marker per the on-disk convention — Task 6's round ratifies or retunes; markers retire as ruled; if copy retunes, the code changes in the same commit (no suite pins component-side strings; the API-side email copy IS suite-pinned and retunes land in the same commit as the test edit).
- **The theme law (binding, #217's ramp):** every new surface uses semantic tokens + tailwind utilities only — no new tokens, no `packages/ui` change, both themes render from the same classes; the round verifies dark, never a second class set.
- **Scope fence (verbatim):** Task 1 edits only `packages/types/src/{reset-email.ts (new), reset-email.test.ts (new), index.ts (one line)}` + `apps/api/src/{env.ts, services/errors.ts, services/reset-email.ts (new), routes/internal.ts (new), observability/events.ts, index.ts}` + `apps/api/test/{reset-email.test.ts (new), helpers/env.ts (comment only)}` + `apps/api/src/observability/events.test.ts`. Task 2 edits only `apps/admin/src/lib/{api.server.ts, reset-email.ts (new), reset-email.test.ts (new), auth.ts, auth.config.ts (comment only), auth-client.ts (comment only if needed)}` + `apps/admin/src/routes/api/auth/$.ts` + `apps/admin/src/routes/{login.tsx, login.reset.tsx (new)}`. Task 3 edits only `apps/admin/src/lib/{users-guards.ts (new), users-guards.test.ts (new), users-state.ts (new), users-state.test.ts (new), users.functions.ts (new)}`. Task 4 edits only `apps/admin/src/components/settings/{settings-screen.tsx, site-tab.tsx (new), account-tab.tsx (new)}` + `apps/admin/src/routes/_shell.settings.tsx`. Task 5 edits only `apps/admin/src/components/settings/users-tab.tsx (new)` + (only if the round retunes) files Tasks 1–4 landed. Task 6 edits only copy/classes in the files Tasks 1–5 landed + writes evidence. Task 7 rotates `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/adr/0021-…md` (the dated guard note), `graphify-out/`, `docs/agents/v1-picks.md` (post-merge), and works the PR/pick/issues — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
packages/types/src/
  reset-email.ts               # new (T1) — resetEmailSendSchema { to: z.email(), url: z.url() } + the inferred input type
  reset-email.test.ts          # new (T1) — +3 its
  index.ts                     # modify (T1) — one export line
apps/api/src/
  env.ts                       # modify (T1) — RESET_EMAIL_FROM? + INTERNAL_SEND_TOKEN? (both optional, commented)
  services/errors.ts           # modify (T1) — the unauthorized() helper
  services/reset-email.ts      # new (T1) — buildResetEmail (pure) + sendResetEmailRoute (the guarded handler)
  routes/internal.ts           # new (T1) — POST /reset-email, thin
  observability/events.ts      # modify (T1) — logEmail gains purpose/optional appointmentId
  index.ts                     # modify (T1) — mount .route('/internal', internalRoutes)
apps/api/test/
  reset-email.test.ts          # new (T1) — +9 its (builder 3, route 6)
  helpers/env.ts               # modify (T1) — comment line only (the two new optional keys)
apps/api/src/observability/events.test.ts  # modify (T1) — +2 its
apps/admin/src/lib/
  api.server.ts                # modify (T2) — export getInternalFetchDeps()
  reset-email.ts               # new (T2) — sendResetEmailOverApi (never-throws forward seam) + makeSendResetPassword
  reset-email.test.ts          # new (T2) — +4 its
  auth.ts                      # modify (T2) — the injected sendResetEmail param + the inline sendResetPassword wrapper
  users-guards.ts              # new (T3) — deleteRefusal/banRefusal (the lockout law)
  users-guards.test.ts         # new (T3) — +6 its
  users-state.ts               # new (T3) — roleLabel/statusLabel/shapeUserRows/shapeSessionRows
  users-state.test.ts          # new (T3) — +4 its
  users.functions.ts           # new (T3) — the nine server fns over the plugin, guards server-side
apps/admin/src/routes/
  api/auth/$.ts                # modify (T2) — pass the real sender into createAuth
  login.tsx                    # modify (T2) — the Forgot password? toggle + the request form
  login.reset.tsx              # new (T2) — the token-consuming new-password page
apps/admin/src/components/settings/
  settings-screen.tsx          # modify (T4) — the three-tab strip (replaces the Site-only body)
  site-tab.tsx                 # new (T4) — the Site panel moved verbatim (+ its own Save row)
  account-tab.tsx              # new (T4) — identity + display name + change-password + sign-out-everywhere
  users-tab.tsx                # new (T5) — the table, expanded sessions row, create Sheet, the dialogs
docs/plan.md docs/progress.md AGENTS.md docs/adr/0021-… graphify-out/ docs/agents/v1-picks.md  # T7
```

---

### Task 1: `packages/types` + `apps/api` — the guarded internal send endpoint (TDD)

The reset email's send half, entirely on the API: the wire schema, the pure builder (copy suite-pinned), and the guarded route. No db, no landing, no admin. This task alone makes the ticket's first AC's "the send endpoint over the service binding (api tests)" runnable.

**Files:**
- Write (test-first): `packages/types/src/reset-email.test.ts`, `apps/api/test/reset-email.test.ts`
- Write: `packages/types/src/reset-email.ts`, `apps/api/src/services/reset-email.ts`, `apps/api/src/routes/internal.ts`
- Modify: `packages/types/src/index.ts`, `apps/api/src/env.ts`, `apps/api/src/services/errors.ts`, `apps/api/src/observability/events.ts`, `apps/api/src/observability/events.test.ts`, `apps/api/src/index.ts`, `apps/api/test/helpers/env.ts` (comment only)

**Interfaces:**
- Produces (what Task 2 consumes): from `@sevendays/types` — `resetEmailSendSchema` (`z.object({ to: z.email(), url: z.url() })`) + `ResetEmailSendInput`. From the API — the route `POST /internal/reset-email` (its contract pinned by test: 200 `{ status: true }` / 401 / curated 503 / 502; the `x-internal-token` header). `buildResetEmail(input: { to: string; url: string; name: string; from: string }): { from, to, subject, html }` (pure, exported for the suite).
- Consumes: `validatedJson` from `services/validator.ts`; `badRequest`-family + the new `unauthorized` from `services/errors.ts`; `EMAIL_FROM` + `ResendRejectionError` from `services/confirmation-email.ts`; `logEmail` from `observability/events.ts`; `captureError` from `observability/capture.ts`; `parseEnv` from `env.ts`; the Resend SDK.

**Not here:** any admin/landing file; any BetterAuth behavior (the flow's halves are Task 2's); the sending-domain/env-pair/ruleset work (#222); `workers_dev` posture changes (the guard answers the public-route reality instead); any audit_log write (user/auth machinery is not a `/api/v1/admin` mutation — the fence).

- [ ] **Step 1: Write the failing types test**

`packages/types/src/reset-email.test.ts` (new file):

```ts
// The internal send endpoint's wire schema (M7 #221, ADR-0021): the admin
// forwards exactly { to, url } — the recipient and BetterAuth's built token
// URL. Internal Worker-to-Worker machinery, not a public /api/v1 contract
// (ADR-0006 wraps that surface; this rides ADR-0016's transport), but the
// same validate-external-input-with-Zod law applies, so the schema lives
// here with the rest of the wire vocabulary.
import { resetEmailSendSchema } from './reset-email.js';
import { describe, expect, it } from 'vitest';

describe('resetEmailSendSchema (M7 #221)', () => {
  it('parses { to, url, name } and strips unknown keys on the parsed output', () => {
    const parsed = resetEmailSendSchema.parse({
      to: 'owner@sevendays.ph',
      url: 'https://admin.example.workers.dev/api/auth/reset-password/tok?callbackURL=%2Flogin%2Freset',
      name: 'Test Owner',
      extra: 'stripped',
    });
    expect(parsed).toEqual({
      to: 'owner@sevendays.ph',
      url: 'https://admin.example.workers.dev/api/auth/reset-password/tok?callbackURL=%2Flogin%2Freset',
      name: 'Test Owner',
    });
  });

  it('rejects a non-email to', () => {
    expect(
      resetEmailSendSchema.safeParse({ to: 'not-an-email', url: 'https://x.dev/t', name: 'A' }).success
    ).toBe(false);
  });

  it('rejects a non-url url', () => {
    expect(resetEmailSendSchema.safeParse({ to: 'a@b.ph', url: 'not-a-url', name: 'A' }).success).toBe(
      false
    );
  });
});
```

- [ ] **Step 2: Write the failing api test**

`apps/api/test/reset-email.test.ts` (new file). The Resend mock follows the `branches.test.ts:19-24` pattern. No DB helpers — the route never touches the db (that is itself an assertion: it works with the plain `testEnv` object and no `createTestDb` import):

```ts
// The internal reset-email send endpoint (M7 #221, ADR-0021): guarded by the
// INTERNAL_SEND_TOKEN shared secret (the ADR's "reachable only from the two
// frontend Workers" made enforceable — the API Worker serves a public
// workers.dev URL), synchronous/result-returning (unlike ADR-0014's
// waitUntil), and PII-floor-clean (classified codes only, never recipient
// text). The builder's copy is pinned here; the route's contract is pinned
// here; no db is involved or imported.
import { EMAIL_FROM } from '../src/services/confirmation-email.js';
import { buildResetEmail } from '../src/services/reset-email.js';
import { describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { testEnv } from './helpers/env.js';

// The Resend SDK is vi.mock'ed (the appointments/branches posture): no key,
// no network. `send` is a spy the route tests drive per-case.
const sendMock = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn(function Resend() {
    return { emails: { send: sendMock } };
  }),
}));

const URL_IN = 'https://admin.example.workers.dev/api/auth/reset-password/tok123?callbackURL=%2Flogin%2Freset';
const BODY = JSON.stringify({ to: 'owner@sevendays.ph', url: URL_IN, name: 'Test Owner' });

const post = (env: Record<string, unknown>, body = BODY, token?: string) =>
  app.request(
    '/internal/reset-email',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { 'x-internal-token': token } : {}),
      },
      body,
    },
    env
  );

describe('buildResetEmail (M7 #221 — the pinned copy)', () => {
  it('renders the pinned subject, greeting, link, and expiry line; the name is HTML-escaped', () => {
    const email = buildResetEmail({
      to: 'owner@sevendays.ph',
      url: URL_IN,
      name: 'Owner & Co <studio>',
      from: EMAIL_FROM,
    });
    expect(email.subject).toBe('Reset your Sevendays Admin password');
    expect(email.from).toBe(EMAIL_FROM);
    expect(email.to).toBe('owner@sevendays.ph');
    expect(email.html).toContain('Hi Owner &amp; Co &lt;studio&gt;,');
    expect(email.html).toContain(`href="${URL_IN}"`);
    expect(email.html).toContain('This link expires in 1 hour.');
    expect(email.html).toContain('If you didn&rsquo;t request this, ignore this email');
  });

  it('uses the RESET_EMAIL_FROM override verbatim when provided', () => {
    const email = buildResetEmail({
      to: 'a@b.ph',
      url: URL_IN,
      name: 'A',
      from: 'Sevendays Photography <no-reply@sevendays.ph>',
    });
    expect(email.from).toBe('Sevendays Photography <no-reply@sevendays.ph>');
  });

  it('the URL is machine text and rides unescaped (the booking-URL precedent)', () => {
    const email = buildResetEmail({ to: 'a@b.ph', url: URL_IN, name: 'A', from: EMAIL_FROM });
    expect(email.html).toContain(`"${URL_IN}"`);
  });
});

describe('POST /internal/reset-email (M7 #221 — the guarded route)', () => {
  it('answers the curated 503 when INTERNAL_SEND_TOKEN is not provisioned', async () => {
    sendMock.mockClear();
    const res = await post(testEnv('postgres://stub:stub@localhost/db'));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Reset emails are not configured.' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('answers a uniform 401 when the header is missing or wrong', async () => {
    const env = { ...testEnv('postgres://stub:stub@localhost/db'), INTERNAL_SEND_TOKEN: 't'.repeat(40) };
    const noHeader = await post(env);
    expect(noHeader.status).toBe(401);
    expect(await noHeader.json()).toEqual({ error: 'Unauthorized.' });
    const wrong = await post(env, BODY, 'x'.repeat(40));
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual({ error: 'Unauthorized.' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid body with the house 400 (zod details through validatedJson)', async () => {
    const env = { ...testEnv('postgres://stub:stub@localhost/db'), INTERNAL_SEND_TOKEN: 't'.repeat(40) };
    const res = await post(env, JSON.stringify({ to: 'nope', url: 'nope' }), 't'.repeat(40));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details?: unknown };
    expect(body.error).toBeTruthy();
  });

  it('sends through the Resend seam and answers 200 { status: true } — payload pinned (from/to/subject, no idempotency key)', async () => {
    sendMock.mockClear();
    sendMock.mockResolvedValue({ data: { id: 're-1' }, error: null });
    const env = {
      ...testEnv('postgres://stub:stub@localhost/db'),
      INTERNAL_SEND_TOKEN: 't'.repeat(40),
      RESET_EMAIL_FROM: 'Sevendays Photography <no-reply@sevendays.ph>',
    };
    const res = await post(env, BODY, 't'.repeat(40));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [payload, options] = sendMock.mock.calls[0] as [
      { from: string; to: string; subject: string },
      Record<string, unknown> | undefined,
    ];
    expect(payload.from).toBe('Sevendays Photography <no-reply@sevendays.ph>');
    expect(payload.to).toBe('owner@sevendays.ph');
    expect(payload.subject).toBe('Reset your Sevendays Admin password');
    expect(options).toBeUndefined();
  });

  it('falls back to the sandbox EMAIL_FROM when RESET_EMAIL_FROM is unset', async () => {
    sendMock.mockClear();
    sendMock.mockResolvedValue({ data: { id: 're-2' }, error: null });
    const env = { ...testEnv('postgres://stub:stub@localhost/db'), INTERNAL_SEND_TOKEN: 't'.repeat(40) };
    await post(env, BODY, 't'.repeat(40));
    const [payload] = sendMock.mock.calls[0] as [{ from: string }];
    expect(payload.from).toBe(EMAIL_FROM);
  });

  it('a Resend rejection answers 502 with no free-text echo (the PII floor)', async () => {
    sendMock.mockClear();
    sendMock.mockResolvedValue({ data: null, error: { name: 'validation_error' } });
    const env = { ...testEnv('postgres://stub:stub@localhost/db'), INTERNAL_SEND_TOKEN: 't'.repeat(40) };
    const res = await post(env, BODY, 't'.repeat(40));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Email send failed.' });
  });
});
```

- [ ] **Step 3: Extend the failing events test**

In `apps/api/src/observability/events.test.ts`, extend the existing email describe with (after the `email failed` it, matching the file's `captureLines()`/`parse()` idiom — the email event is FLAT: `line.evt === 'email'`, fields at the top level, and the sibling its pin the exact sorted key array, so the two new its pin theirs):

```ts
  it('email attempt (reset): purpose rides, appointmentId absent at info', () => {
    const lines = captureLines();
    logEmail(createRequestLogger('req-unit-7'), { phase: 'attempt', purpose: 'reset' });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'evt',
      'level',
      'msg',
      'phase',
      'purpose',
      'requestId',
      'time',
    ]);
    expect(line.evt).toBe('email');
    expect(line.phase).toBe('attempt');
    expect(line.purpose).toBe('reset');
    expect(line.appointmentId).toBeUndefined();
    expect(line.level).toBe(30);
  });

  it('email failed (reset): purpose + the classified code, still no free text', () => {
    const lines = captureLines();
    logEmail(createRequestLogger('req-unit-8'), {
      phase: 'failed',
      purpose: 'reset',
      code: 'resend:validation_error',
    });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'code',
      'evt',
      'level',
      'msg',
      'phase',
      'purpose',
      'requestId',
      'time',
    ]);
    expect(line.purpose).toBe('reset');
    expect(line.code).toBe('resend:validation_error');
    expect(line.level).toBe(50);
  });
```

*(One more assertion lands in the SAME edit — the existing three email its pin their exact key arrays, and the purpose field defaults to `'confirmation'` on every emitted line, so each of their `Object.keys(line).sort()).toEqual([...])` arrays gains `'purpose',` — add it to all three (alphabetically between `phase` and `requestId`).)*

- [ ] **Step 4: Run red**

`pnpm --filter @sevendays/types test -- --run` (3 its fail — the module doesn't exist) and `pnpm --filter @sevendays/api test -- --run` (the new file's its fail; the events its fail). Capture the red output to the evidence dir.

- [ ] **Step 5: Implement `packages/types/src/reset-email.ts`**

```ts
// The internal reset-email send contract (M7 #221, ADR-0021): the ADMIN's
// sendResetPassword forwards exactly this shape over the API service
// binding. Not a public /api/v1 surface (ADR-0006's client wraps that
// contract; this is Worker-to-Worker machinery over ADR-0016's transport)
// — but external input is external input: Zod at the boundary, schema
// shared by both sides. `name` rides the request (BetterAuth hands the
// admin `user` at sendResetPassword time) — the send path never touches
// Postgres, by design.
import { z } from 'zod';

export const resetEmailSendSchema = z.object({
  /** The staff member's email — the reset recipient. */
  to: z.email(),
  /** BetterAuth's built token URL (baseURL + /api/auth/reset-password/<token>?callbackURL=…). */
  url: z.url(),
  /** The recipient's display name (BetterAuth's `user.name`) — escaped into the greeting. */
  name: z.string().min(1).max(200),
});

export type ResetEmailSendInput = z.infer<typeof resetEmailSendSchema>;
```

In `packages/types/src/index.ts`, add the export line `export * from './reset-email.js';` between the `./print-size.js'` and `./site-settings.js'` lines (alphabetical; biome's fix pass is the backstop).

- [ ] **Step 6: Implement the API side**

(a) `apps/api/src/env.ts` — extend `envSchema` with the two optional keys (after the `SENTRY_*`/`ENVIRONMENT` block, before the closing paren; the header comment gains the bullet below):

```ts
  // - The reset-email pair (M7 #221, ADR-0021): INTERNAL_SEND_TOKEN is the
  //   shared secret guarding the internal send endpoint (a Worker secret on
  //   the api AND the admin — `wrangler secret put`, never committed; unset
  //   = the endpoint answers the curated 503 and nothing else degrades);
  //   RESET_EMAIL_FROM is the per-environment sender (the LANDING_ORIGIN
  //   pattern — #222 sets no-reply@<verified-domain>; until then the
  //   sandbox EMAIL_FROM fallback sends).
  INTERNAL_SEND_TOKEN: z.string().min(1).optional(),
  RESET_EMAIL_FROM: z.string().min(1).optional(),
```

(b) `apps/api/src/services/errors.ts` — append the helper (matching the file's existing shape):

```ts
export function unauthorized(c: Context, message = 'Unauthorized.') {
  return c.json({ error: message }, 401);
}
```

(c) `apps/api/src/services/reset-email.ts` (new file):

```ts
// The reset email (M7 #221, ADR-0021): the API's second email consumer,
// with its own failure posture — synchronous and result-returning (the user
// clicked "send reset link"; a silent failure is a support ticket), unlike
// ADR-0014's waitUntil booking-confirmation. The BUILDER half is pure (the
// suite pins every copy rule); the ROUTE half guards with the shared
// INTERNAL_SEND_TOKEN secret — ADR-0021's "reachable only from the two
// frontend Workers" made enforceable, because the API Worker serves a
// public workers.dev URL and a literally unauthenticated sender would be an
// open relay (an attacker-chosen `url` in a studio-sent reset email is a
// phishing vector). PII floor: classified codes only, never Resend's
// free text, never the recipient.
import { Resend } from 'resend';
import type { Context } from 'hono';
import type { RootEnv } from '../observability/logger.js';
import type { ResetEmailSendInput } from '@sevendays/types';
import { captureError } from '../observability/capture.js';
import { logEmail } from '../observability/events.js';
import { EMAIL_FROM, ResendRejectionError } from './confirmation-email.js';
import { badGateway, serviceUnavailable, unauthorized } from './errors.js';
import { parseEnv } from '../env.js';

/** The escape law is the confirmation email's: free-text names carry &<>";
 * the URL is BetterAuth-built machine text and rides unescaped. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export interface ResetEmailInput {
  to: string;
  url: string;
  name: string;
  from: string;
}

export interface ResetEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
}

/** Pure: the pinned reset-email copy. The subject is exempt from escaping
 * (plain text); the body greets by display name (escaped), states the 1-hour
 * token TTL (BetterAuth's default `resetPasswordTokenExpiresIn`), links the
 * BetterAuth-built URL once, and closes with the didn't-request-this line. */
export function buildResetEmail(input: ResetEmailInput): ResetEmail {
  const html = `<p>Hi ${escapeHtml(input.name)},</p>
<p>We received a request to reset your Sevendays Admin password. This link expires in 1 hour.</p>
<p><a href="${input.url}" style="color:#0b5cab;">Reset your password</a></p>
<p style="color:#666;">If you didn&rsquo;t request this, ignore this email &mdash; your password stays unchanged.</p>`;
  return {
    from: input.from,
    to: input.to,
    subject: 'Reset your Sevendays Admin password',
    html,
  };
}

/**
 * The guarded internal send (ADR-0021 § Decision): validate the shared
 * secret, build, send synchronously, return the result. No idempotency key
 * — every request mints a fresh BetterAuth token upstream, so a double-send
 * is two valid links by design. A missing INTERNAL_SEND_TOKEN answers the
 * curated 503 (the #155 leak-safe pattern — the loud detail stays in the
 * error event, never the response); a wrong token answers the uniform 401;
 * a Resend rejection is captured (the #184 email-seam posture) and answers
 * 502 with no free text. The display name rides the validated body — the
 * send path NEVER touches Postgres (the route is outside /api/v1, no
 * acquireDb, and no user read is needed: BetterAuth gave the admin
 * `user.name` at sendResetPassword time).
 */
export async function sendResetEmail(
  c: Context<RootEnv>,
  input: ResetEmailSendInput
): Promise<Response> {
  const env = parseEnv(c.env);
  if (!env.INTERNAL_SEND_TOKEN) {
    return serviceUnavailable(c, 'Reset emails are not configured.');
  }
  const token = c.req.header('x-internal-token');
  if (typeof token !== 'string' || token !== env.INTERNAL_SEND_TOKEN) {
    return unauthorized(c);
  }
  logEmail(c.var.logger, { phase: 'attempt', purpose: 'reset' });
  const email = buildResetEmail({
    to: input.to,
    url: input.url,
    name: input.name,
    from: env.RESET_EMAIL_FROM ?? EMAIL_FROM,
  });
  const result = await new Resend(env.RESEND_API_KEY).emails.send(email);
  if (result.error) {
    const rejection = new ResendRejectionError(result.error.name);
    logEmail(c.var.logger, {
      phase: 'failed',
      purpose: 'reset',
      code: `resend:${rejection.rejectionName}`,
    });
    captureError(rejection);
    return badGateway(c, 'Email send failed.');
  }
  logEmail(c.var.logger, { phase: 'sent', purpose: 'reset' });
  return c.json({ status: true });
}
```

(The `(c)` handler in `routes/internal.ts` below extracts the validated body and passes it as an argument — the thin-route house rule, the same shape `routes/site-settings.ts` uses.)

(d) `apps/api/src/services/errors.ts` — also append the 502 helper:

```ts
export function badGateway(c: Context, message: string) {
  return c.json({ error: message }, 502);
}
```

(e) `apps/api/src/routes/internal.ts` (new file):

```ts
import { Hono } from 'hono';
import type { RootEnv } from '../observability/logger.js';
import { resetEmailSendSchema } from '@sevendays/types';
import { validatedJson } from '../services/validator.js';
import { sendResetEmail } from '../services/reset-email.js';

// The internal Worker-to-Worker surface (M7 #221, ADR-0021): mounted at the
// app root OUTSIDE /api/v1 — no versioned public contract, no db
// acquisition (the send path never touches Postgres), the shared-secret
// guard inside the handler. The root requestLogging + onError cover it like
// every other route.
export const internalRoutes = new Hono<RootEnv>().post(
  '/reset-email',
  validatedJson(resetEmailSendSchema),
  (c) => sendResetEmail(c, c.req.valid('json'))
);
```

(f) `apps/api/src/index.ts` — mount beside the health route (after `.get('/health', …)`):

```ts
  .route('/internal', internalRoutes)
```

with the import `import { internalRoutes } from './routes/internal.js';` in the import block (biome orders it).

(g) `apps/api/src/observability/events.ts` — widen `logEmail`'s field set (the only change to this file; the PII-floor comment gains one line "the reset purpose carries no appointmentId"):

```ts
export function logEmail(
  log: RequestLogger,
  fields: {
    phase: EmailPhase;
    /** Which email class — the booking confirmation (default) or the staff reset (#221). */
    purpose?: 'confirmation' | 'reset';
    /** Present for confirmations only — the reset flow has no appointment. */
    appointmentId?: string;
    code?: string;
  }
): void {
```

The function body treats `purpose` as one more emitted field (default `'confirmation'` when absent — emit the default so the line shape stays uniform) and `appointmentId` as the optional it already effectively is for reset. **Match the file's actual existing signature/body** (read it first) — the pin above is the field-set delta, not a full-body rewrite; the two existing call sites in `confirmation-email.ts` compile unchanged (they pass `appointmentId`, no `purpose`).

(h) `apps/api/test/helpers/env.ts` — extend only the header comment with one line after the RATE_LIMITER paragraph:
```ts
// The reset-email pair (M7 #221) is intentionally absent here: the optional
// INTERNAL_SEND_TOKEN / RESET_EMAIL_FROM stay unset unless a suite spreads
// its own values (the reset-email suite does) — the 503 path is the default
// posture every other suite sees, which is exactly the deployment's.
```

- [ ] **Step 7: Green + gates + commit**

`pnpm --filter @sevendays/types test -- --run` — **18 files / 170 tests** (167 + 3). `pnpm --filter @sevendays/api test -- --run` — **32 files (31 passed + 1 skipped) / 433 passed + 3 skipped** (reset-email.test.ts +9, events.test.ts +2). Then `pnpm --filter @sevendays/types fix` → `pnpm --filter @sevendays/api fix` → re-run both suites → `pnpm --filter @sevendays/types typecheck` → `pnpm --filter @sevendays/api typecheck`. Commit:

```bash
git add packages/types/src/reset-email.ts packages/types/src/reset-email.test.ts packages/types/src/index.ts apps/api/src/env.ts apps/api/src/services/errors.ts apps/api/src/services/reset-email.ts apps/api/src/routes/internal.ts apps/api/src/observability/events.ts apps/api/src/observability/events.test.ts apps/api/src/index.ts apps/api/test/reset-email.test.ts apps/api/test/helpers/env.ts
git commit -m "feat(api): the internal reset-email send endpoint - shared-secret guard, the pinned copy, the Resend seam reused (#221)"
```

### Task 2: `apps/admin` — the forward seam, the auth wiring, the forgot/reset forms (UI-bearing)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule) before composing the two forms. The seam and the wiring are TDD (Step 1 red first); the forms follow the login card's established composition (the skill set's pass retunes what Task 6's round rules).

**Files:**
- Write (test-first): `apps/admin/src/lib/reset-email.test.ts`
- Write: `apps/admin/src/lib/reset-email.ts`, `apps/admin/src/routes/login.reset.tsx`
- Modify: `apps/admin/src/lib/api.server.ts`, `apps/admin/src/lib/auth.ts`, `apps/admin/src/lib/auth.config.ts` (comment only), `apps/admin/src/routes/api/auth/$.ts`, `apps/admin/src/routes/login.tsx`

**Interfaces:**
- Produces: `getInternalFetchDeps(): { fetch: typeof fetch; baseUrl: string; token: string | undefined }` (from `api.server.ts` — the binding-or-network transport + the shared secret, one export); `ResetEmailDeps` + `sendResetEmailOverApi(input: ResetEmailSendInput, deps): Promise<{ sent: boolean; status?: number }>` + `makeSendResetPassword(deps)` (from `reset-email.ts`); the `/login?reset=1` success line; the `/login/reset` page.
- Consumes: Task 1's `POST /internal/reset-email` contract + `ResetEmailSendInput`; `authClient.requestPasswordReset` / `authClient.resetPassword` (the spiked inferred client methods); `createAuth`'s new optional second parameter.

**Not here:** the Users tab (Tasks 3+); the Settings screen (Tasks 4+); any landing file; the email copy (Task 1's, suite-pinned); the sending domain (#222); any api-client change (the internal seam is a plain fetch, not an ADR-0006 route group).

- [ ] **Step 1: Write the failing test**

`apps/admin/src/lib/reset-email.test.ts` (new file):

```ts
// The reset-email forward seam (M7 #221, ADR-0021): BetterAuth's
// sendResetPassword on the admin Worker forwards { to, url, name } over the
// API service binding to Task 1's internal endpoint. The seam NEVER throws
// (anti-enumeration: a 500 from the auth route leaks account existence) —
// every failure resolves { sent: false } and the caller logs. The mocked
// boundary is the deps.fetch the seam actually calls.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { makeSendResetPassword, sendResetEmailOverApi } from './reset-email';

const input = {
  to: 'owner@sevendays.ph',
  url: 'https://admin.example.workers.dev/api/auth/reset-password/tok?callbackURL=%2Flogin%2Freset',
  name: 'Test Owner',
};

const deps = (fetchImpl: typeof fetch) => ({
  fetch: fetchImpl,
  baseUrl: 'http://api.test',
  token: 'shared-secret-token',
});

describe('sendResetEmailOverApi (M7 #221 — the never-throwing forward seam)', () => {
  it('POSTs the pinned URL with the shared-secret header and the exact body', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: true }), { status: 200 }));
    const result = await sendResetEmailOverApi(input, deps(fetchImpl));
    expect(result).toEqual({ sent: true, status: 200 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('http://api.test/internal/reset-email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': 'shared-secret-token',
      },
      body: JSON.stringify(input),
    });
  });

  it('resolves { sent: false, status } on the guarded failures (401) — never throws', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401 }));
    const result = await sendResetEmailOverApi(input, deps(fetchImpl));
    expect(result).toEqual({ sent: false, status: 401 });
  });

  it('resolves { sent: false } when fetch itself rejects (binding down) — never throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('binding unavailable');
    });
    const result = await sendResetEmailOverApi(input, deps(fetchImpl));
    expect(result).toEqual({ sent: false });
  });
});

describe('makeSendResetPassword (M7 #221 — the BetterAuth callback wrapper)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards { to, url, name } from BetterAuth params and swallows a failed send (logs, never throws)', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: 'Email send failed.' }), { status: 502 }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sendResetPassword = makeSendResetPassword(deps(fetchImpl));
    await expect(
      sendResetPassword({
        user: { email: 'owner@sevendays.ph', name: 'Test Owner' },
        url: input.url,
        token: 'tok',
      })
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/admin test -- --run` — the 4 new its fail (`./reset-email` doesn't exist). Capture the red output.

- [ ] **Step 3: Implement `lib/api.server.ts`'s export**

Append at the file's end (the module-private `serviceBindingFetch` and `getApiUrl` are its inputs — no behavior change to any existing export):

```ts
// The internal-send transport (M7 #221, ADR-0021): Task 1's
// /internal/reset-email endpoint is Worker-to-Worker machinery outside the
// /api/v1 contract, so it does NOT ride @sevendays/api-client — it rides
// the same transport rule as every other admin→api call (the service
// binding in production, the API_URL network path in dev/vitest) plus the
// INTERNAL_SEND_TOKEN shared secret (a Worker secret on the admin too;
// vars/secrets populate process.env under nodejs_compat_populate_process_env).
export function getInternalFetchDeps(): {
  fetch: typeof fetch;
  baseUrl: string;
  token: string | undefined;
} {
  return {
    fetch: serviceBindingFetch ?? fetch,
    baseUrl: getApiUrl(),
    token: process.env.INTERNAL_SEND_TOKEN,
  };
}
```

- [ ] **Step 4: Implement `lib/reset-email.ts`**

```ts
// The reset-email forward seam (M7 #221, ADR-0021): the admin Worker stays
// Resend-free — sendResetPassword forwards over the API service binding to
// the internal send endpoint. NEVER THROWS: anti-enumeration means the auth
// request answers identically whether the email exists, the send failed,
// or the secret is unprovisioned — a throw here would 500 the request and
// leak existence. Failures resolve { sent: false } and log console.error
// (the #186 metrics-seam posture — Workers Logs retains it).
import type { ResetEmailSendInput } from '@sevendays/types';

export interface ResetEmailDeps {
  fetch: typeof fetch;
  baseUrl: string;
  /** The INTERNAL_SEND_TOKEN shared secret; undefined = the API answers the curated 503. */
  token: string | undefined;
}

export interface ResetEmailOutcome {
  sent: boolean;
  status?: number;
}

export async function sendResetEmailOverApi(
  input: ResetEmailSendInput,
  deps: ResetEmailDeps
): Promise<ResetEmailOutcome> {
  try {
    const response = await deps.fetch(`${deps.baseUrl}/internal/reset-email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(deps.token ? { 'x-internal-token': deps.token } : {}),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      console.error(`[reset-email] send rejected: ${response.status}`);
      return { sent: false, status: response.status };
    }
    return { sent: true, status: response.status };
  } catch (error) {
    console.error('[reset-email] send failed', error instanceof Error ? error.message : error);
    return { sent: false };
  }
}

/** BetterAuth's sendResetPassword callback shape (1.7.5, probed in dist):
 * ({ user, url, token }, request) — we consume user.email/user.name + url. */
export interface SendResetPasswordParams {
  user: { email: string; name: string };
  url: string;
  token: string;
}

export function makeSendResetPassword(
  deps: ResetEmailDeps
): (params: SendResetPasswordParams) => Promise<void> {
  return async ({ user, url }) => {
    const outcome = await sendResetEmailOverApi({ to: user.email, url, name: user.name }, deps);
    if (!outcome.sent) {
      console.error(`[reset-email] the reset email to ${'<recipient redacted>'} did not send (status ${outcome.status ?? 'n/a'})`);
    }
  };
}
```

*(The redacted-recipient literal is deliberate — the PII floor: Workers Logs never carries the address.)*

- [ ] **Step 5: Wire `auth.ts` + the route handler**

(a) `apps/admin/src/lib/auth.ts` — the signature gains the injected sender (after the existing doc comment, before the body; the purity rule is untouched — the parameter is a FUNCTION, not an import):

```ts
export function createAuth(
  databaseUrl = process.env.DATABASE_URL,
  // M7 #221 (ADR-0021): the reset-email sender, INJECTED to preserve this
  // file's config purity (only better-auth subpaths + @sevendays/db may
  // appear in the import graph — the CLI loads it via jiti). The /api/auth
  // route passes the service-binding forward seam (lib/reset-email.ts);
  // auth.config.ts (the CLI shape) passes nothing and never sends.
  sendResetEmail?: (input: { to: string; url: string; name: string }) => Promise<void>
) {
```

(b) In the `emailAndPassword` block, after `revokeSessionsOnPasswordReset: true,`:

```ts
    sendResetPassword: async ({ user, url }) => {
      if (!sendResetEmail) {
        // The CLI-shaped instance (auth.config.ts) — reset requests never
        // reach it; fail loud if they ever do.
        throw new Error('Reset emails are not wired on this instance (see lib/reset-email.ts).');
      }
      try {
        await sendResetEmail({ to: user.email, url, name: user.name });
      } catch (error) {
        // Anti-enumeration backstop: the seam resolves failures itself, but
        // a throw here would 500 the auth request and leak existence.
        console.error('[reset-email] unexpected send error', error instanceof Error ? error.message : error);
      }
    },
```

(c) The stale comment on `disableSignUp` — replace `// staff-only; provisioning is the owner CLI (M4 ticket 02)` with:

```ts
      // staff-only; provisioning is the Users tab (M7 #221) — the CLI stays
      // the bootstrap/break-glass path (docs/staff-provisioning.md, #222's
      // demotion)
```

(d) `apps/admin/src/routes/api/auth/$.ts` — both handlers pass the wired sender; extend the file's import block and replace the two handler lines:

```ts
import { getInternalFetchDeps } from '#/lib/api.server';
import { createAuth } from '#/lib/auth';
import { makeSendResetPassword } from '#/lib/reset-email';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      // M7 #221: the runtime instance wires the reset-email forward seam
      // (ADR-0021 — the admin Worker stays Resend-free; the send crosses
      // the API service binding). The CLI shape (auth.config.ts) stays
      // unwired by design.
      GET: ({ request }) => createAuth(undefined, makeSendResetPassword(getInternalFetchDeps())).handler(request),
      POST: ({ request }) => createAuth(undefined, makeSendResetPassword(getInternalFetchDeps())).handler(request),
    },
  },
});
```

(e) `apps/admin/src/lib/auth.config.ts` — one comment line appended to the header block (after the `create-admin (#119) runs with a real DATABASE_URL…` sentence): `// M7 #221: reset emails are NOT wired on this CLI shape (the runtime /api/auth route injects lib/reset-email.ts's seam); nothing CLI-side requests one.` No code change.

- [ ] **Step 6: `/login` grows the forgot toggle**

In `apps/admin/src/routes/login.tsx`: add `mode` state (`'signin' | 'forgot'`) beside the existing state; the card's form switches on it. The sign-in form is untouched (its fields, the generic failure line, the redirect round-trip). The forgot form + the toggle copy, verbatim (all `TODO(owner-copy)` — Task 6's round ratifies):

```tsx
{/* The forgot-password toggle (M7 #221): one card, two modes — the
    anti-enumeration law is ONE generic line for every outcome (unknown
    email, limiter 429, send failure — BetterAuth already answers 200
    identically for the miss; the UI matches). */}
{mode === 'forgot' ? (
  <form
    className='space-y-4'
    onSubmit={async (event) => {
      event.preventDefault();
      setSubmitting(true);
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/login/reset`,
      });
      setSent(true); // every outcome — see the anti-enumeration note above
      setSubmitting(false);
    }}
  >
    <div className='space-y-2'>
      <Label htmlFor='login-email'>Email</Label>
      <Input
        id='login-email'
        type='email'
        autoComplete='email'
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
    </div>
    {sent && (
      <p role='status' className='text-muted-foreground text-sm'>
        {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
        If that account exists, a reset link is on its way.
      </p>
    )}
    <Button type='submit' className='w-full' disabled={submitting}>
      {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
      Send reset link
    </Button>
    <button
      type='button'
      className='text-muted-foreground w-full text-center text-xs underline-offset-4 hover:underline'
      onClick={() => {
        setMode('signin');
        setSent(false);
      }}
    >
      {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
      Back to sign in
    </button>
  </form>
) : (
  … the existing sign-in form verbatim, with one link appended after the "Accounts are provisioned…" paragraph …
  <button
    type='button'
    className='text-muted-foreground w-full text-center text-xs underline-offset-4 hover:underline'
    onClick={() => {
      setMode('forgot');
      setFailure(false);
    }}
  >
    {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
    Forgot password?
  </button>
)}
```

The card header swaps with the mode: `mode === 'forgot'` renders `<h1 …>Reset your password</h1>` + `<CardDescription>Enter your account email and we’ll send a reset link.</CardDescription>` (both `TODO(owner-copy)`); the sign-in header is untouched. `sent` is new state (`useState(false)`). The `?reset=1` arrival: at the top of `LoginPage`, read `Route.useSearch()` (extend `loginSearchSchema` with `reset: z.string().optional()`) and render, above the Card, when present:

```tsx
{reset === '1' && (
  <p role='status' className='text-muted-foreground max-w-sm text-center text-sm'>
    {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
    Password updated. Sign in with your new password.
  </p>
)}
```

- [ ] **Step 7: `/login/reset` — the token-consuming page**

`apps/admin/src/routes/login.reset.tsx` (new file):

```tsx
// /login/reset (M7 #221): the far end of the emailed token link. BetterAuth's
// GET /api/auth/reset-password/:token 302s here with ?token=VALID_TOKEN (or
// ?error=INVALID_TOKEN) after validating; the form POSTs the new password
// through authClient.resetPassword — a success revokes every session
// (revokeSessionsOnPasswordReset) and bounces to /login?reset=1. A minimal
// standalone card on the wash canvas (both themes; the login band stays on
// /login — this page is one purpose, one form).
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader } from '@sevendays/ui/components/card';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { authClient } from '#/lib/auth-client';

const resetSearchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute('/login/reset')({
  validateSearch: resetSearchSchema,
  head: () => ({ meta: [{ title: 'Reset password | Sevendays Admin' }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token, error } = Route.useSearch();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [failure, setFailure] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMismatch(false);
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token: token ?? '',
    });
    setSubmitting(false);
    if (resetError) {
      setFailure(true);
      return;
    }
    // Every session was just revoked (revokeSessionsOnPasswordReset) —
    // straight to the door with the success line.
    await navigate({ href: '/login?reset=1' });
  };

  return (
    <main className='bg-background flex min-h-svh items-center justify-center p-6'>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <h1 className='text-lg font-semibold'>Choose a new password</h1>
          <CardDescription>
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            At least 12 characters. Every signed-in session is signed out when the password changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error || !token ? (
            <div className='space-y-3'>
              <p role='alert' className='text-destructive text-sm'>
                {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
                This reset link is invalid or has expired. Request a new one.
              </p>
              <Button variant='outline' className='w-full' type='button' onClick={() => void navigate({ href: '/login' })}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form className='space-y-4' onSubmit={(event) => void onSubmit(event)}>
              <div className='space-y-2'>
                <Label htmlFor='reset-password'>New password</Label>
                <Input
                  id='reset-password'
                  type='password'
                  autoComplete='new-password'
                  required
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='reset-confirm'>Confirm password</Label>
                <Input
                  id='reset-confirm'
                  type='password'
                  autoComplete='new-password'
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </div>
              {mismatch && (
                <p role='alert' className='text-destructive text-sm'>
                  {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
                  The passwords don’t match.
                </p>
              )}
              {failure && (
                <p role='alert' className='text-destructive text-sm'>
                  {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
                  Could not reset the password — the link may have expired. Request a new one.
                </p>
              )}
              <Button type='submit' className='w-full' disabled={submitting}>
                {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
                Reset password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 8: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run` — **24 files / 244 tests** (240 + 4). Then `pnpm --filter @sevendays/admin fix` → re-run `test -- --run` → `typecheck` → `pnpm --filter @sevendays/admin build`. Commit:

```bash
git add apps/admin/src/lib/api.server.ts apps/admin/src/lib/reset-email.ts apps/admin/src/lib/reset-email.test.ts apps/admin/src/lib/auth.ts apps/admin/src/lib/auth.config.ts apps/admin/src/routes/api/auth/$.ts apps/admin/src/routes/login.tsx apps/admin/src/routes/login.reset.tsx
git commit -m "feat(admin): forgot-password end to end - the service-binding send seam, the wired auth server, /login's request form + /login/reset (#221)"
```

### Task 3: `apps/admin` — the Users lib seams + the server fns (TDD)

The lockout law and the row vocabulary as pure modules (both the server fns and the Task 5 UI consume them), then the server fns over the already-mounted `admin()` plugin. No UI in this task.

**Files:**
- Write (test-first): `apps/admin/src/lib/users-guards.test.ts`, `apps/admin/src/lib/users-state.test.ts`
- Write: `apps/admin/src/lib/users-guards.ts`, `apps/admin/src/lib/users-state.ts`, `apps/admin/src/lib/users.functions.ts`

**Interfaces:**
- Produces (what Task 5 consumes): `AdminUserSummary` (`{ id, name, email, role: string | null, banned: boolean | null, banReason: string | null }` — the plugin's listUsers row, trimmed); `deleteRefusal(actorId, target, users): string[]`; `banRefusal(actorId, target, users): string[]` (empty = allowed); `roleLabel(role): 'Owner' | 'Staff'`; `statusLabel(user): 'Active' | 'Banned'`; `shapeUserRows(users, actorId): AdminUserRow[]` (`+ roleLabel/statusLabel/isSelf`); `shapeSessionRows(sessions): AdminSessionRow[]` (`{ id, createdAt, expiresAt, ipAddress, userAgent }` — **token stripped by shape**); the server fns `fetchAdminUsers`, `createAdminUser`, `resetAdminUserPassword`, `banAdminUser`, `unbanAdminUser`, `fetchAdminUserSessions`, `revokeAdminUserSession`, `revokeAdminUserSessions`, `removeAdminUser` and the `UsersActionResult` union.
- Consumes: `createAuth().api.<plugin method>` with `headers: getRequestHeaders()` (the spiked shape); `getRequestHeaders` from `@tanstack/react-start/server`; `startSpan` per the server-fn house rule.

**Not here:** any component (Task 5); the Settings screen (Task 4); role changes after create (fenced); pagination UI (limit 100 pinned); audit rows (fenced).

- [ ] **Step 1: Write the failing guards test**

`apps/admin/src/lib/users-guards.test.ts` (new file):

```ts
// The lockout law (M7 #221, spec "confirmed at the live re-ask"): no
// self-delete, no self-ban, the last ACTIVE owner protected from both —
// one pure module shared by the server fns (fresh-list, authoritative) and
// the UI affordances (query-list, presentational). "Active" = banned !==
// true (an expired-ban edge counts as banned here — accepted + noted).
import { describe, expect, it } from 'vitest';
import { banRefusal, deleteRefusal, type AdminUserSummary } from './users-guards';

const owner = (id: string, banned = false): AdminUserSummary => ({
  id,
  name: `Owner ${id}`,
  email: `${id}@sevendays.ph`,
  role: 'admin',
  banned,
  banReason: null,
});
const staff = (id: string): AdminUserSummary => ({
  id,
  name: `Staff ${id}`,
  email: `${id}@sevendays.ph`,
  role: 'staff',
  banned: false,
  banReason: null,
});

describe('deleteRefusal (M7 #221 — the lockout law)', () => {
  it('refuses deleting yourself', () => {
    const me = owner('me');
    expect(deleteRefusal('me', me, [me, staff('s1')])).toEqual([
      'You cannot delete your own account.',
    ]);
  });

  it('refuses deleting the last active owner', () => {
    const last = owner('last');
    expect(deleteRefusal('other', last, [last, staff('s1')])).toEqual([
      'The last active owner cannot be deleted. Promote another owner first.',
    ]);
  });

  it('allows deleting a second owner and any staff row', () => {
    const a = owner('a');
    const b = owner('b');
    const s = staff('s1');
    expect(deleteRefusal('a', b, [a, b, s])).toEqual([]);
    expect(deleteRefusal('a', s, [a, b, s])).toEqual([]);
  });

  it('allows deleting an owner who is the only one left but already banned — and a banned co-owner', () => {
    const bannedOnly = owner('x', true);
    expect(deleteRefusal('other', bannedOnly, [bannedOnly, staff('s1')])).toEqual([]);
    const activeA = owner('a');
    const bannedB = owner('b', true);
    expect(deleteRefusal('a', bannedB, [activeA, bannedB])).toEqual([]);
  });
});

describe('banRefusal (M7 #221 — the same law, the ban side)', () => {
  it('refuses banning yourself', () => {
    const me = owner('me');
    expect(banRefusal('me', me, [me, staff('s1')])).toEqual([
      'You cannot ban your own account.',
    ]);
  });

  it('refuses banning the last active owner; a second owner and staff are bannable', () => {
    const last = owner('last');
    const a = owner('a');
    const b = owner('b');
    expect(banRefusal('other', last, [last, staff('s1')])).toEqual([
      'The last active owner cannot be banned. Promote another owner first.',
    ]);
    expect(banRefusal('a', b, [a, b])).toEqual([]);
    expect(banRefusal('a', staff('s1'), [a, staff('s1')])).toEqual([]);
  });
});
```

- [ ] **Step 2: Write the failing state test**

`apps/admin/src/lib/users-state.test.ts` (new file):

```ts
// The Users tab's row vocabulary (M7 #221): the domain role words render
// (ADR-0018 — Owner/Staff in UI copy, never the 'admin' gate literal);
// session rows are SHAPED — the plugin's token never crosses the seam into
// anything a component could render.
import { describe, expect, it } from 'vitest';
import { roleLabel, shapeSessionRows, shapeUserRows, statusLabel } from './users-state';

const baseUser = {
  name: 'Test Owner',
  email: 'owner@sevendays.ph',
  banReason: null as string | null,
};

describe('roleLabel + statusLabel (M7 #221)', () => {
  it('maps admin→Owner; staff and null→Staff (the nullable role column)', () => {
    expect(roleLabel('admin')).toBe('Owner');
    expect(roleLabel('staff')).toBe('Staff');
    expect(roleLabel(null)).toBe('Staff');
    expect(roleLabel(undefined)).toBe('Staff');
  });

  it('statusLabel reads banned truthy as Banned, everything else Active', () => {
    expect(statusLabel({ ...baseUser, id: '1', role: 'admin', banned: true })).toBe('Banned');
    expect(statusLabel({ ...baseUser, id: '2', role: 'staff', banned: false })).toBe('Active');
    expect(statusLabel({ ...baseUser, id: '3', role: 'staff', banned: null })).toBe('Active');
  });
});

describe('shapeUserRows (M7 #221)', () => {
  it('carries id/name/email/role/banned + roleLabel/statusLabel/isSelf; preserves input order', () => {
    const rows = shapeUserRows(
      [
        { ...baseUser, id: 'a', role: 'admin', banned: false },
        { ...baseUser, id: 'me', role: 'staff', banned: false },
      ],
      'me'
    );
    expect(rows.map((r) => r.id)).toEqual(['a', 'me']);
    expect(rows[0]).toMatchObject({ roleLabel: 'Owner', statusLabel: 'Active', isSelf: false });
    expect(rows[1]).toMatchObject({ roleLabel: 'Staff', isSelf: true });
  });

  it('shapeSessionRows strips the token — the shaped row carries no token key at all', () => {
    const rows = shapeSessionRows([
      {
        id: 'sess-1',
        token: 'secret-token-value',
        createdAt: new Date('2026-10-18T08:00:00Z'),
        expiresAt: new Date('2026-10-25T08:00:00Z'),
        ipAddress: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
        userId: 'a',
        updatedAt: new Date('2026-10-18T08:00:00Z'),
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      id: 'sess-1',
      createdAt: new Date('2026-10-18T08:00:00Z'),
      expiresAt: new Date('2026-10-25T08:00:00Z'),
      ipAddress: '203.0.113.9',
      userAgent: 'Mozilla/5.0',
    });
    expect(Object.hasOwn(rows[0] as object, 'token')).toBe(false);
  });
});
```

- [ ] **Step 3: Run red**

`pnpm --filter @sevendays/admin test -- --run` — the 10 new its fail (`./users-guards` / `./users-state` don't exist; 6 its in the guards file, 4 in the state file). Capture the red output.

- [ ] **Step 4: Implement the two seams**

(a) `apps/admin/src/lib/users-guards.ts` (new file):

```ts
// The lockout law (M7 #221, spec "deletion guards, confirmed at the live
// re-ask"): no self-delete, no self-ban (your own row is view-only), and
// the last ACTIVE owner is protected from both — refusals are the house
// field-detailed 400 lines. Pure: the server fns run it over a FRESH
// listUsers read (authoritative); the UI runs the same module over its
// query data for affordances (disabled actions, view-only own row). The
// plugin's own self-guards (YOU_CANNOT_*_YOURSELF) remain the backstop —
// ours answer first with the house copy. "Active" = banned !== true; an
// expired temporary ban counts as banned here (accepted edge — temporary
// bans are not the studio's shape).
export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
}

const isActiveOwner = (user: AdminUserSummary): boolean =>
  user.role === 'admin' && user.banned !== true;

function refusalLines(
  selfLine: string,
  lastOwnerLine: string,
  actorId: string,
  target: AdminUserSummary,
  users: readonly AdminUserSummary[]
): string[] {
  if (actorId === target.id) {
    return [selfLine];
  }
  if (isActiveOwner(target)) {
    const otherActiveOwners = users.filter((u) => u.id !== target.id && isActiveOwner(u));
    if (otherActiveOwners.length === 0) {
      return [lastOwnerLine];
    }
  }
  return [];
}

export function deleteRefusal(
  actorId: string,
  target: AdminUserSummary,
  users: readonly AdminUserSummary[]
): string[] {
  return refusalLines(
    'You cannot delete your own account.',
    'The last active owner cannot be deleted. Promote another owner first.',
    actorId,
    target,
    users
  );
}

export function banRefusal(
  actorId: string,
  target: AdminUserSummary,
  users: readonly AdminUserSummary[]
): string[] {
  return refusalLines(
    'You cannot ban your own account.',
    'The last active owner cannot be banned. Promote another owner first.',
    actorId,
    target,
    users
  );
}
```

(b) `apps/admin/src/lib/users-state.ts` (new file):

```ts
// The Users tab's row vocabulary (M7 #221): ADR-0018's domain words in UI
// copy (Owner/Staff — the 'admin' gate literal never renders), the
// Active/Banned status pair, the own-row marker, and the session-row shape
// that strips the plugin's session TOKEN by construction (a component
// cannot render what the shape does not carry).
import type { AdminUserSummary } from './users-guards';

export function roleLabel(role: string | null | undefined): 'Owner' | 'Staff' {
  return role === 'admin' ? 'Owner' : 'Staff';
}

export function statusLabel(user: AdminUserSummary): 'Active' | 'Banned' {
  return user.banned === true ? 'Banned' : 'Active';
}

export interface AdminUserRow extends AdminUserSummary {
  roleLabel: 'Owner' | 'Staff';
  statusLabel: 'Active' | 'Banned';
  isSelf: boolean;
}

export function shapeUserRows(
  users: readonly AdminUserSummary[],
  actorId: string
): AdminUserRow[] {
  return users.map((user) => ({
    ...user,
    roleLabel: roleLabel(user.role),
    statusLabel: statusLabel(user),
    isSelf: user.id === actorId,
  }));
}

/** The plugin's session row minus the token — never shaped, never shipped. */
export interface AdminSessionRow {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export function shapeSessionRows(
  sessions: ReadonlyArray<{
    id: string;
    createdAt: Date;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }>
): AdminSessionRow[] {
  return sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    ipAddress: session.ipAddress ?? null,
    userAgent: session.userAgent ?? null,
  }));
}
```

- [ ] **Step 5: Implement `lib/users.functions.ts`**

The whole file (new). The result union mirrors `AdminMutationResult`'s shape with `blockers` for the dialogs; every plugin call forwards the incoming request's headers — the plugin's own `adminMiddleware` reads the caller's session and gates role (ADR-0018's pattern, spiked). The guard-running mutations fetch a fresh list first (the client's list could be stale):

```ts
// The Users tab's server fns (M7 #221, ADR-0018's pattern): every call
// rides the already-mounted admin() plugin SERVER-SIDE over the per-request
// instance (ADR-0011), the caller's session forwarded through the incoming
// request headers — the plugin's own role gate does the enforcement. The
// browser never gains admin client methods (authClient.admin does not
// exist; the client plugin is deliberately NOT added). Mutations resolve
// the result-value union (never throw across the RPC boundary — the #155
// ruling); lockout guards run HERE over a fresh listUsers read before the
// plugin call, with the refusal lines riding `blockers` for the in-body
// dialog law (#218).
import { startSpan } from '@sentry/tanstackstart-react';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { createAuth } from './auth';
import { banRefusal, deleteRefusal, type AdminUserSummary } from './users-guards';

export type UsersActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; blockers?: string[] };

const TEMP_PASSWORD_MIN = 12; // matches emailAndPassword.minPasswordLength

async function pluginErrorToResult(error: unknown): Promise<never> {
  // BetterAuth's APIError carries status/message; anything else rethrows —
  // not a user-management refusal (serialization, session loss) — loud.
  const { APIError } = await import('better-auth/api');
  if (error instanceof APIError) {
    return { ok: false, status: error.status, message: error.message } as never;
  }
  throw error;
}

const summariesFrom = (users: ReadonlyArray<Record<string, unknown>>): AdminUserSummary[] =>
  users.map((u) => ({
    id: String(u.id),
    name: String(u.name ?? ''),
    email: String(u.email ?? ''),
    role: (u.role as string | null) ?? null,
    banned: (u.banned as boolean | null) ?? null,
    banReason: (u.banReason as string | null) ?? null,
  }));

// One per-request instance per fn (ADR-0011): the guarded fns pass the SAME
// auth + headers into the session read, the list, and the action.
async function listSummaries(
  auth: ReturnType<typeof createAuth>,
  headers: Headers
): Promise<AdminUserSummary[]> {
  const result = await auth.api.listUsers({
    headers,
    query: { limit: 100, sortBy: 'createdAt', sortDirection: 'desc' },
  });
  return summariesFrom(result.users);
}

export const fetchAdminUsers = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'auth admin listUsers' }, async () => {
    const auth = createAuth();
    return listSummaries(auth, getRequestHeaders());
  });
});

export const createAdminUser = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(
    z.object({
      name: z.string().min(1).max(200),
      email: z.email(),
      password: z.string().min(TEMP_PASSWORD_MIN).max(128),
      role: z.enum(['admin', 'staff']),
    })
  )
  .handler(async ({ data }): Promise<UsersActionResult<AdminUserSummary>> => {
    return startSpan({ name: 'auth admin createUser' }, async () => {
      try {
        const result = await createAuth().api.createUser({
          headers: getRequestHeaders(),
          body: { name: data.name, email: data.email, password: data.password, role: data.role },
        });
        return { ok: true, data: summariesFrom([result.user as Record<string, unknown>])[0] };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const resetAdminUserPassword = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ userId: z.string().min(1), newPassword: z.string().min(TEMP_PASSWORD_MIN).max(128) }))
  .handler(async ({ data }): Promise<UsersActionResult<{ userId: string }>> => {
    return startSpan({ name: 'auth admin setUserPassword' }, async () => {
      try {
        await createAuth().api.setUserPassword({
          headers: getRequestHeaders(),
          body: { userId: data.userId, newPassword: data.newPassword },
        });
        return { ok: true, data: { userId: data.userId } };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const banAdminUser = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<AdminUserSummary>> => {
    return startSpan({ name: 'auth admin banUser' }, async () => {
      try {
        const auth = createAuth();
        const headers = getRequestHeaders();
        // The actor is the signed-in caller — the self-guard reads the
        // session, never the target row.
        const session = await auth.api.getSession({ headers });
        if (!session) {
          return { ok: false, status: 401, message: 'No session.' };
        }
        const users = await listSummaries(auth, headers);
        const target = users.find((u) => u.id === data.userId);
        if (!target) {
          return { ok: false, status: 404, message: 'User not found.' };
        }
        const blockers = banRefusal(session.user.id, target, users);
        if (blockers.length > 0) {
          return { ok: false, status: 400, message: 'Blocked by the lockout guards.', blockers };
        }
        const result = await auth.api.banUser({
          headers,
          body: { userId: data.userId },
        });
        return { ok: true, data: summariesFrom([result.user as Record<string, unknown>])[0] };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const unbanAdminUser = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<AdminUserSummary>> => {
    return startSpan({ name: 'auth admin unbanUser' }, async () => {
      try {
        const result = await createAuth().api.unbanUser({
          headers: getRequestHeaders(),
          body: { userId: data.userId },
        });
        return { ok: true, data: summariesFrom([result.user as Record<string, unknown>])[0] };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const fetchAdminUserSessions = createServerFn({ method: 'GET' })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    return startSpan({ name: 'auth admin listUserSessions' }, async () => {
      const result = await createAuth().api.listUserSessions({
        headers: getRequestHeaders(),
        body: { userId: data.userId },
      });
      return result.sessions;
    });
  });

export const revokeAdminUserSession = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<{ sessionId: string }>> => {
    return startSpan({ name: 'auth admin revokeUserSession' }, async () => {
      try {
        await createAuth().api.revokeUserSession({
          headers: getRequestHeaders(),
          body: { sessionId: data.sessionId },
        });
        return { ok: true, data: { sessionId: data.sessionId } };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const revokeAdminUserSessions = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<{ userId: string }>> => {
    return startSpan({ name: 'auth admin revokeUserSessions' }, async () => {
      try {
        await createAuth().api.revokeUserSessions({
          headers: getRequestHeaders(),
          body: { userId: data.userId },
        });
        return { ok: true, data: { userId: data.userId } };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const removeAdminUser = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<{ userId: string }>> => {
    return startSpan({ name: 'auth admin removeUser' }, async () => {
      try {
        const auth = createAuth();
        const headers = getRequestHeaders();
        const session = await auth.api.getSession({ headers });
        if (!session) {
          return { ok: false, status: 401, message: 'No session.' };
        }
        const users = await listSummaries(auth, headers);
        const target = users.find((u) => u.id === data.userId);
        if (!target) {
          return { ok: false, status: 404, message: 'User not found.' };
        }
        const blockers = deleteRefusal(session.user.id, target, users);
        if (blockers.length > 0) {
          return { ok: false, status: 400, message: 'Blocked by the lockout guards.', blockers };
        }
        await auth.api.removeUser({
          headers,
          body: { userId: data.userId },
        });
        return { ok: true, data: { userId: data.userId } };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });
```

- [ ] **Step 6: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run` — **26 files / 254 tests** (244 + 10: guards 6, state 4). Then `pnpm --filter @sevendays/admin fix` → re-run `test -- --run` → `typecheck` → `pnpm --filter @sevendays/admin build` (the fns join the route graph via Task 5's imports only after Task 5 — the build gate rides Task 5; here run it anyway to catch import-protection early). Commit:

```bash
git add apps/admin/src/lib/users-guards.ts apps/admin/src/lib/users-guards.test.ts apps/admin/src/lib/users-state.ts apps/admin/src/lib/users-state.test.ts apps/admin/src/lib/users.functions.ts
git commit -m "feat(admin): the Users-tab seams + server fns - the lockout law, the row vocabulary, the plugin calls behind forwarded sessions (#221)"
```

### Task 4: `apps/admin` — the Settings restructure: the three-tab strip + the Account tab (UI-bearing)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant). One structural move + one new tab: the Site panel becomes a sibling component VERBATIM (its Save shape included — maturing it is fenced), the screen becomes the strip, the Account tab lands over `authClient` browser calls. The Users tab itself is Task 5 (the strip renders its slot empty-but-hidden this task — no, see Step 1: the strip ships complete with the Users tab gated to Task 5's file, which lands next task; to keep every commit green, Task 4's strip renders Account + Site and the OWNER-only Users entry arrives WITH Task 5's component in the same strip array — the strip's tab list gains its Users entry in Task 5's commit, not this one).

**Files:**
- Write: `apps/admin/src/components/settings/site-tab.tsx`, `apps/admin/src/components/settings/account-tab.tsx`
- Modify: `apps/admin/src/components/settings/settings-screen.tsx`, `apps/admin/src/routes/_shell.settings.tsx`

**Interfaces:**
- Consumes: the `_shell` route context's `user` ({ name, email, role } — already returned by the gate's beforeLoad); `authClient.updateUser` / `changePassword` / `revokeSessions` (the spiked client methods); `useRouter().invalidate()` (refreshes the shell context after a display-name change); `GuardedConfirm` + `EmptyState`/`PageHeader` from `#/components/cms/shared`.
- Produces: `SiteTab` (the moved panel), `AccountTab` (props: `{ user: { name: string; email: string; role: string | null } }`), the restructured `SettingsScreen` (props: `{ user: { name: string; email: string; role: string | null } }`).

**Not here:** the Users tab (Task 5 — the strip's Users entry lands with it); any Site-panel behavior change (verbatim move); nav changes (none — Settings already routes); the wire/API (none).

- [ ] **Step 1: `site-tab.tsx` — the verbatim move**

Create `apps/admin/src/components/settings/site-tab.tsx` with the file-header comment below, then move into it EVERYTHING from `SettingsScreen`'s current body below the PageHeader (the five Cards, the logo loop, the save mutation, the editor-state machinery, `Row`, the field lists — the whole 300-line block, imports adjusted to the new file, zero behavior edits). The moved component's signature: `export function SiteTab()`. The Save button — currently the PageHeader's `actions` — becomes the tab's own footer row (the strip's header carries no per-tab action):

```tsx
// The Site tab (M7 #215, moved verbatim at #221 when the Settings screen
// became the three-tab strip): the all-staff singleton editor — ONE
// full-object save, unset fields fall back to the defaults pinned in
// packages/types. The Save button moved from the screen header to this
// tab's footer when the header stopped being Site-only; its shape is
// otherwise the #215 build's.
```

The footer row, rendered as the tab's last element (replacing `actions={…}` on the PageHeader — the button's label, handler, and behavior are untouched):

```tsx
<div className='flex justify-end'>
  <Button type='button' onClick={handleSave}>
    Save changes
  </Button>
</div>
```

- [ ] **Step 2: `account-tab.tsx` — the new tab**

`apps/admin/src/components/settings/account-tab.tsx` (new file). Every mutation rides the browser authClient (same-origin cookies — the login form's own posture); pending states follow the #218 vocabulary (disabled + `LoaderCircle` + the …ing word) at the affordance scale this tab uses; copy verbatim with `TODO(owner-copy)` markers:

```tsx
// The Account tab (M7 #221): every staff member manages themselves —
// read-only identity, editable display name, change-password (verifies the
// current password server-side through BetterAuth's own endpoint),
// sign-out-of-all-sessions. All three actions ride the browser authClient
// (same-origin /api/auth, cookies ride themselves — the login form's
// posture); no server fns, no API surface.
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { toast } from '@sevendays/ui/components/sonner';
import { LoaderCircle, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { authClient } from '#/lib/auth-client';
import { roleLabel } from '#/lib/users-state';

export interface AccountUser {
  name: string;
  email: string;
  role: string | null;
}

export function AccountTab({ user }: { user: AccountUser }) {
  const navigate = useNavigate();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function saveName() {
    setSavingName(true);
    const { error } = await authClient.updateUser({ name: displayName });
    setSavingName(false);
    if (error) {
      toast.error('Could not save the display name.');
      return;
    }
    toast.success('Saved.');
    await router.invalidate(); // the shell's context (topbar user card) refreshes
  }

  async function changePassword() {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('The passwords don’t match.');
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError('The new password needs at least 12 characters.');
      return;
    }
    setSavingPassword(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });
    setSavingPassword(false);
    if (error) {
      // BetterAuth answers a generic failure for a wrong current password —
      // one line, never which field.
      setPasswordError('Could not change the password. Check the current password and try again.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password changed.');
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    const { error } = await authClient.revokeSessions();
    if (error) {
      setSigningOut(false);
      toast.error('Could not sign out.');
      return;
    }
    await navigate({ href: '/login' }); // every session — including this one — is gone
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Identity</h2>
          <p className='text-muted-foreground text-sm'>
            {user.email} · {roleLabel(user.role)}
          </p>
          <div className='flex items-end gap-2 pt-2'>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='account-name'>Display name</Label>
              <Input
                id='account-name'
                className='h-8 text-sm'
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <Button
              type='button'
              size='sm'
              disabled={savingName || displayName.trim() === '' || displayName === user.name}
              onClick={() => void saveName()}
            >
              {savingName ? <LoaderCircle aria-hidden='true' className='size-4 animate-spin' /> : null}
              {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
              {savingName ? 'Saving…' : 'Save name'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Change password</h2>
          <div className='grid max-w-md gap-3 pt-2 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='account-current-password'>Current password</Label>
              <Input
                id='account-current-password'
                type='password'
                autoComplete='current-password'
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='account-new-password'>New password</Label>
              <Input
                id='account-new-password'
                type='password'
                autoComplete='new-password'
                minLength={12}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='account-confirm-password'>Confirm new password</Label>
              <Input
                id='account-confirm-password'
                type='password'
                autoComplete='new-password'
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
          {passwordError && (
            <p role='alert' className='text-destructive text-xs'>
              {passwordError}
            </p>
          )}
          <Button
            type='button'
            size='sm'
            className='mt-2'
            disabled={savingPassword || currentPassword === '' || newPassword === '' || confirmPassword === ''}
            onClick={() => void changePassword()}
          >
            {savingPassword ? <LoaderCircle aria-hidden='true' className='size-4 animate-spin' /> : null}
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            {savingPassword ? 'Changing…' : 'Change password'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Sessions</h2>
          <p className='text-muted-foreground text-sm'>
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            Signs this account out of every session, on every device — including this one.
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            disabled={signingOut}
            onClick={() => void signOutEverywhere()}
          >
            {signingOut ? (
              <LoaderCircle aria-hidden='true' className='size-4 animate-spin' />
            ) : (
              <LogOut aria-hidden='true' className='size-4' />
            )}
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            {signingOut ? 'Signing out…' : 'Sign out of all sessions'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: `settings-screen.tsx` — the strip**

Replace the whole component file with the strip (the testimonials screen's local-tab pattern — `useState<'account' | 'site'>` this task; Task 5 widens the union + the array). The header comment rewrites:

```tsx
// The Settings screen (M7 #215 + #221): the three-tab strip — Account
// (every staff member), Users (owner-only, #221's Task 5), Site (all
// staff, the #215 singleton editor moved verbatim). Tabs are local state,
// no routes (the testimonials precedent); the strip hides the Users entry
// for staff (role !== 'admin') the way nav.ts hides owner-only nav — the
// server fns gate themselves regardless (the plugin's role gate).
```

The component (this task's shape — Task 5 adds the Users entry + import). **Controller amendment, 2026-10-18 pre-flight:** the strip rides the house `SegmentedControl` from `#/components/cms/shared` — the testimonials screen's ACTUAL local-tab idiom (options/value/onChange/ariaLabel, `role='group'` + `aria-pressed`, the owner-ratified #218 active stop), NOT raw `role='tablist'` buttons (the earlier sketch here drifted from its own cited precedent — ruled at setup, ledgered):

```tsx
export function SettingsScreen({ user }: { user: AccountUser }) {
  const [tab, setTab] = useState<'account' | 'site'>('account');
  const subline =
    tab === 'account'
      ? 'Your account and security.'
      : 'The site’s words and marks — editable without a deploy.';
  return (
    <div className='space-y-6'>
      <PageHeader title='Settings' subline={subline} />
      {/* The strip is the testimonials screen's SegmentedControl (local
          state, no routes); Task 5 widens the union + the options array. */}
      <SegmentedControl
        options={[
          { value: 'account', label: 'Account' },
          { value: 'site', label: 'Site' },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel='Settings sections'
      />
      {tab === 'account' ? <AccountTab user={user} /> : <SiteTab />}
    </div>
  );
}
```

(`SegmentedControl` joins the file's existing `#/components/cms/shared` import — `PageHeader` already comes from there.)

- [ ] **Step 4: The route passes the user**

`apps/admin/src/routes/_shell.settings.tsx` — the route component reads the shell context and hands it down (the gate's session fetch stays the identity source):

```tsx
import { createFileRoute, useRouteContext } from '@tanstack/react-router';
import { SettingsScreen } from '#/components/settings/settings-screen';

export const Route = createFileRoute('/_shell/settings')({
  head: () => ({ meta: [{ title: 'Settings | Sevendays Admin' }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useRouteContext({ from: '/_shell' });
  return <SettingsScreen user={user} />;
}
```

- [ ] **Step 5: Gates + commit**

`pnpm --filter @sevendays/admin fix` → `test -- --run` (**26 files / 254 tests** unchanged — no suite this task) → `typecheck` → `pnpm --filter @sevendays/admin build`. Commit:

```bash
git add apps/admin/src/components/settings/settings-screen.tsx apps/admin/src/components/settings/site-tab.tsx apps/admin/src/components/settings/account-tab.tsx apps/admin/src/routes/_shell.settings.tsx
git commit -m "feat(admin): the Settings three-tab strip + the Account tab - the Site panel moves verbatim (#221)"
```

### Task 5: `apps/admin` — the Users tab (UI-bearing)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant). The ticket's biggest surface: the owner-only table, the expanded sessions row, the create Sheet on the async-Save contract, and the three dialogs. All state lives in the component; the query + mutations ride Task 3's fns; affordances (own-row view-only, last-owner annotations) re-derive from the same pure seams.

**Files:**
- Write: `apps/admin/src/components/settings/users-tab.tsx`
- Modify: `apps/admin/src/components/settings/settings-screen.tsx` (the strip's Users entry + the widened union), `apps/admin/src/routes/_shell.tsx` (the context gains the user id — Step 6), `apps/admin/src/components/settings/account-tab.tsx` (the `AccountUser` interface gains `id` — Step 6)

**Interfaces:**
- Consumes: Task 3's fns + `AdminUserRow`/`AdminSessionRow`/`shapeUserRows`/`shapeSessionRows` + the guards (`deleteRefusal`/`banRefusal` for affordance annotations over the query list); `useQuery`/`useMutation`/`useQueryClient`; the house `Sheet` + `GuardedConfirm` + `EmptyState` + `PageHeader` + the `Table` primitives; `Select` for the role picker.
- Produces: `UsersTab` (props: `{ actorId: string }`) — the strip renders it for owners.

**Not here:** role changes after create (fenced); pagination (limit 100); impersonation (no UI, ever); audit rows (fenced); any API/wire change.

- [ ] **Step 1: The tab's query + row shaping**

The component's data spine:

```tsx
const { data: users, isPending, isError, refetch } = useQuery({
  queryKey: ['admin', 'users'],
  queryFn: () => fetchAdminUsers(),
});
const rows = shapeUserRows(users ?? [], actorId);
```

The skeleton/error/pending states follow the Site tab's exact posture (first-load-only Skeleton rows; `QueryErrorState` on error). The table columns: **Name** (`{row.name}{row.isSelf ? ' (you)' : ''}`), **Email**, **Role** (`row.roleLabel`), **Status** (`row.statusLabel` — a `Badge` variant: default for Active, destructive for Banned), **Actions**. The own row renders NO actions cell content — `—` — and the `(you)` suffix (the view-only law, client-side; the server guard backstops).

- [ ] **Step 2: The affordance annotations (the same pure seams)**

Per row, compute over the query list:

```tsx
const deleteBlockers = deleteRefusal(actorId, row, rows);
const banBlockers = banRefusal(actorId, row, rows);
```

Rows with non-empty blockers render their Delete/Ban actions **disabled with a `Tooltip` carrying the refusal line** (the `tooltip` primitive is on disk); empty blockers render normally. (The dialogs still render whatever the SERVER answers — these annotations are affordance-only; the server's fresh-list refusal is authoritative.)

- [ ] **Step 3: The expanded sessions row**

One expanded row at a time (`expandedId` state — the #219 pattern). The expander chevron in the Name cell. Expanding fetches the sessions:

```tsx
const sessionsQuery = useQuery({
  queryKey: ['admin', 'users', expandedId, 'sessions'],
  queryFn: () => fetchAdminUserSessions({ data: { userId: expandedId } }),
  enabled: expandedId !== null,
});
```

The expanded cell (colspan the full table) renders the shaped rows — `shapeSessionRows(sessions)` — as a compact list: created date, expires date, `ipAddress ?? '—'`, `userAgent` (trimmed to 48 chars + ellipsis), and per-session **Revoke** (`revokeAdminUserSession`), plus a **Revoke all sessions** button at the row's head (`revokeAdminUserSessions`). Revokes invalidate the sessions query + toast on failure. **The token never renders — it is not in the shaped row** (Task 3's test pins the strip).

- [ ] **Step 4: The create Sheet**

The `Sheet` (the house editor posture) titled `Create user`, fields: Name, Email, Role (`Select`: Staff default, Owner), Temporary password (`type='password'`, minLength 12, with the handover note). The Owner option carries the warning line under the picker. Save follows the #218 async contract: `onSave` returns the mutation's promise; the sheet closes ONLY on `ok`; field-level failures (a duplicate email answers the plugin's message) surface inline. On success: invalidate `['admin','users']` + a toast reminding the handover. Copy verbatim (all `TODO(owner-copy)`):

- `Create user` (the trigger + the sheet title)
- `Role` / `Staff` / `Owner`
- `Owners hold user management and the Audit Log — grant only when the account should manage the team.`
- `Temporary password` / `At least 12 characters. Hand the password over in person — it is not emailed.`
- `Saving…` (busy) / `Create user` (confirm)
- `User created. Hand over the temporary password in person.` (toast)
- `Could not create the user.` (failure toast)

- [ ] **Step 5: The three dialogs**

(a) **Reset password** — a `Dialog` titled `Set a new temporary password`, body: the handover note + `New temporary password` (minLength 12) + confirm field; confirm → `resetAdminUserPassword`; success closes + toast `Password set. Hand it over in person.`; failure stays open with the line (both `TODO(owner-copy)`).

(b) **Ban / Unban** — `GuardedConfirm`: title `Ban {name}?` / `Unban {name}?`; description `Banning signs them out everywhere and locks sign-in until unbanned.` / `Unban restores sign-in access.`; blockers in-body when the server refuses (the last-owner line renders from `blockers`); confirm labels `Ban` / `Unban` with busy labels `Banning…` / `Unbanning…` (all `TODO(owner-copy)`).

(c) **Delete** — `GuardedConfirm`: title `Delete {name}?`; description `This removes the account and every session. This cannot be undone.`; confirm `Delete user`, busy `Deleting…`; the server's `blockers` render in-body on refusal (the #218 law). (All `TODO(owner-copy)`.)

Every mutation: result-value handling (ok → invalidate + toast + close; !ok → blockers/line + stay open), pending-guarded buttons.

- [ ] **Step 6: The actor id threads through the shell + the strip's Users entry**

The Users tab needs the CALLER's user id (the own-row law + the affordance guards) — the shell context carries name/email/role but not the id today. Three small edits land together in this commit:

(a) `apps/admin/src/routes/_shell.tsx` — the gate's return gains the id (one line):

```tsx
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role ?? null,
      },
    };
```

(b) Task 4's `AccountUser` interface (in `account-tab.tsx`) gains `id: string;` as its first field — the Account tab itself ignores it (its render is unchanged); `SettingsScreen`'s prop type and the route's threading follow the same object, no signature change.

(c) `settings-screen.tsx`: widen the union to `'account' | 'users' | 'site'`; the entry AFTER Account, BEFORE Site, owners only:

```tsx
// Owners only (the 2026-10-18 amendment): the options array gains the Users
// entry between Account and Site — SegmentedControl takes the whole array.
const options = [
  { value: 'account', label: 'Account' },
  ...(user.role === 'admin' ? [{ value: 'users' as const, label: 'Users' }] : []),
  { value: 'site', label: 'Site' },
];
```

The subline map gains `'users': 'The studio’s staff accounts.'` (`TODO(owner-copy)`); the panel render gains the `{tab === 'users' ? <UsersTab actorId={user.id} /> : …}` branch.

- [ ] **Step 7: Gates + commit**

`pnpm --filter @sevendays/admin fix` → `test -- --run` (**26 files / 254 tests** unchanged — component-side) → `typecheck` → `pnpm --filter @sevendays/admin build`. Commit:

```bash
git add apps/admin/src/components/settings/users-tab.tsx apps/admin/src/components/settings/settings-screen.tsx apps/admin/src/components/settings/account-tab.tsx apps/admin/src/routes/_shell.tsx
git commit -m "feat(admin): the owner-only Users tab - list/create/reset/ban/sessions/delete over the plugin, every lockout guard pinned (#221)"
```

### Task 6: The owner-reacted variants round + the live reset-flow proof (controller interaction)

The ticket's fourth AC: "Owner-reacted rendered variants, both themes" (light judged first, the dark counterpart in the same round per #162). The round is the design gate for every `TODO(owner-copy)` string this plan carries and the two forms'/tab compositions' first cuts. The live proof exercises the whole flow on the dev stack — email deliverability itself stays #222's AC (the sandbox sender restricts recipients); the flow is proven end to end by driving the token through the dev database, which is delivery-independent.

**Files:**
- Modify (only if the round retunes): the files Tasks 1–5 landed (copy/classes); `apps/api/src/services/reset-email.ts` + its test in the same commit if the email copy retunes
- Write: the evidence dir `.superpowers/sdd/2026-10-18-221-settings-users-forgot/` (captures, the flow narration, the rulings)

**Interfaces:** none new — string/class-level retunes and evidence only.

**Not here:** the milestone-level "Verify: owner-accepted rendered variants" box (the close-out ticket's); any seam/suite change beyond a copy-retune's same-commit test edit; the real-inbox deliverability check (#222); any other screen.

- [ ] **Step 1: Seed the states and capture both themes**

Run the dev stack (`pnpm dev` — all three apps; the admin's send seam needs the api up). Seed through the UI itself as the owner (the dev owner account per the local stack); create one throwaway staff account through the NEW Users tab (that's the create Sheet's own capture) to populate a second row. Capture, in BOTH themes (the topbar toggle):

1. **/login** — the sign-in card (unchanged — regression-check the composition), the Forgot-password toggle, the forgot form, and the sent state's generic line.
2. **/login/reset** — the valid-token form (drive a token per Step 2's DB path), and the invalid/expired state (`?error=INVALID_TOKEN`).
3. **Settings · Account** — identity + display name, change-password, sessions card.
4. **Settings · Users** — the table (owner row view-only with `(you)`, the staff row with actions), the expanded sessions row, the create Sheet (both role options, the owner warning), the reset-password dialog, the ban confirm, the delete confirm with the last-owner blocker line rendered in-body (drive it: attempt deleting the owner row's... no — the LAST-OWNER blocker fires for the only active owner: with the throwaway staff + one owner, deleting the OWNER row shows the blocker — capture that refusal in-body).
5. **Settings · Site** — the moved panel renders identically to the #215 round (a regression capture, not a re-judging).

Save every capture to the evidence dir; delete the throwaway account through the Users tab after the round (its own delete dialog — the cleanup exercises the happy delete).

- [ ] **Step 2: The live reset-flow proof (narrated to the evidence dir)**

With `INTERNAL_SEND_TOKEN` set in BOTH `apps/api/.dev.vars` and `apps/admin/.env.local` (same value — a throwaway 40+ char string; never committed), and the api's `RESEND_API_KEY` from the local `.dev.vars`:

1. On /login, request a reset for the owner's dev email → the generic line renders (identically — request one for a NONEXISTENT email too and capture that the line is byte-identical; the limiter's 3/60s cap will throttle the third+ request — that's the rate limit proving itself: narrate the 429-backed generic line too).
2. The dev Workers Logs (`wrangler tail` on the api) show the email attempt + either sent (if the sandbox recipient allows) or the classified failure — narrate what appears; EITHER outcome is a pass (deliverability is #222's).
3. Pull the fresh token from the dev database (`node -e` over `packages/db`'s client: select the newest `verification` row whose identifier starts `reset-password:` — the token is the identifier's suffix after `reset-password:`).
4. Build the URL by hand if the email didn't arrive: `http://localhost:3000/login/reset?token=<token>` — the same URL the callback would have redirected to.
5. Set a new password (12+), land on `/login?reset=1` with the success line, sign in with the NEW password, and confirm the OLD one is refused.
6. In the Users tab, confirm the flow's side effects: the account's sessions were revoked by the reset (the sessions row from before the reset is gone).

Narrate the whole sequence with what proved what; note the token's 1-hour TTL default.

- [ ] **Step 3: The owner reacts; apply the rulings**

Present the captures (light first, dark in the same round). Record the rulings in the evidence dir. Then apply: (a) copy retunes edit the pinned strings in place — the email copy (`reset-email.ts`) retunes in the SAME commit as its suite edit; the UI strings retire their `TODO(owner-copy)` markers as ruled (each replaced by the dated house note, or surviving verbatim where the owner defers); (b) composition retunes (the tab strip's weight, the Users table's density, the Sheet's field order) edit the components in place; (c) if a retune lands interactive text on off-token palette classes, re-measure contrast first (≥ 4.5 for text — the #218 discipline); the composed classes are token-based by construction.

- [ ] **Step 4: Cleanup + gates + commit**

Delete the round's throwaway account through the Users tab (if not already), `pnpm --filter @sevendays/admin fix` → `test -- --run` → `typecheck`; if the email copy retuned, also `pnpm --filter @sevendays/api test -- --run`. Commit (skip if the round changed nothing — fold the evidence into Task 7):

```bash
git add -A apps/admin/src apps/api/src
git commit -m "chore(admin): the Settings/forgot variants round settled - copy and compositions as ruled, both themes (#221)"
```

### Task 7: Gates, docs rotation, PR, v1 pick, issues, graphify

- [ ] **Step 1: The full check**

`pnpm check` (lint + format + typecheck + test across the repo — green). Floors after this ticket: types **18 files / 170 tests**; api **32 files (31 passed + 1 skipped) / 433 passed + 3 skipped**; api-client 5/45 unchanged; admin **26 files / 254 tests**; landing 10/92 unchanged; db 4 unchanged.

- [ ] **Step 2: `docs/plan.md` — one tick, one annotation (pinned edits)**

(a) `docs/plan.md:169` flips from `- [ ] Admin — Settings made real (#160): …` to `- [✅]` with this annotation appended at its line's end:

```text
 _(2026-10-XX, #221: the Account tab (read-only identity, editable display name over updateUser, change-password verifying the current password, sign-out-of-all-sessions over revokeSessions), the owner-only Users tab over the already-mounted admin() plugin server-side behind its own role gate (list; create with an in-person temp password, role picker warned on owner; direct reset; ban/unban revoking sessions; per-user session listing with individual revoke — tokens never render; guarded hard delete), every lockout guard pinned (no self-delete, no self-ban — the own row view-only; the last active owner protected from both — one pure module shared by the server fns and the affordances), and forgot-password on /login (requestPasswordReset generic anti-enumeration over the already-enabled database-backed limiter at its built-in 3/60s, the reset email over the API service binding per ADR-0021 to the guarded internal send endpoint, /login/reset consuming the token, revokeSessionsOnPasswordReset's cascade); the Site tab landed in #215; owner-reacted both themes + the flow proven live on the dev stack)_
```

(b) `docs/plan.md:170` — the reset-email box gains a DATED NOT-TICKED annotation at its line's end (the #216 precedent):

```text
 _(2026-10-XX, #221: the internal send endpoint half is live — POST /internal/reset-email over the API service binding, guarded by the INTERNAL_SEND_TOKEN shared secret (ADR-0021's reachable-only-from-the-frontends made enforceable; the ADR carries the dated note), reusing the live Resend seam with the sandbox sender fallback until RESET_EMAIL_FROM is set; the sending-domain verification, the end-to-end inbox check, the email pair's env return, the pick-ruleset amendment, and the runbook demotion stay #222's)_
```

Nothing else in the M7 block changes.

- [ ] **Step 3: `docs/progress.md` + `AGENTS.md` + the ADR note**

(a) progress.md gains a dated entry (newest first, the #220 entry's shape) narrating: the internal endpoint + its guard ruling, the forward seam + the wiring (auth.ts purity preserved by injection), the forgot/reset forms, the three-tab strip + Account + Users tabs, the lockout law, the live proof, the round's outcome, and the floors.

(b) AGENTS.md, two edits: in *Current status of `pnpm test`*, the admin sentence's floor clause becomes `admin floor 26 files / 254 tests (…; + #220's upload-maturation seams — the abort law, the tray/guard predicates, the shared enqueue + file-drag gate; + #221's settings/auth seams — the never-throwing reset-email forward, the lockout guards, the users row vocabulary)` and the api/types clauses update to their new floors; and in the Engineering Rules block, the auth paragraph's sentence `Staff provisioning and password resets are owner-operated — docs/staff-provisioning.md is the runbook.` becomes `Staff provisioning is owner-operated through the Users tab (M7 #221 — the CLI + docs/staff-provisioning.md stay the bootstrap/break-glass path until #222's demotion); password resets are self-serve (the forgot-password flow over the API service binding per ADR-0021 — the guarded internal send endpoint answers to the INTERNAL_SEND_TOKEN shared secret).`

(c) `docs/adr/0021-reset-email-topology-service-binding.md` — one dated note appended to § Consequences:

```text
- _(2026-10-XX, #221: the send endpoint ships with an INTERNAL_SEND_TOKEN shared-secret header guard. This ADR's "unauthenticated from the public internet's perspective" posture is unenforceable as written — the API Worker serves a public `*.workers.dev` URL, so a literally unauthenticated sender would be an open relay (an attacker-chosen `url` in a studio-sent reset email is a phishing vector). The guard enforces the ADR's own intent — "reachable only from the two frontend Workers" — with one secret on both Workers; unprovisioned, the endpoint answers the curated 503 and nothing else degrades.)_
```

- [ ] **Step 4: The docs commit**

```bash
git add docs/plan.md docs/progress.md AGENTS.md docs/adr/0021-reset-email-topology-service-binding.md
git commit -m "docs(m7): #221 closes Settings made real - plan box + the reset-email annotation, progress, AGENTS floors, the ADR-0021 guard note (#221)"
```

- [ ] **Step 5: PR + squash merge**

Push `feat/221-settings-users-forgot`; open the PR against main titled `Settings — the Account + Users tabs + forgot-password (#221)`; body: the four ACs each answered with its evidence pointer (the api suite output for the send endpoint + the never-throwing seam; the Account-tab captures; the Users-tab captures incl. the in-body lockout blocker + the suite pins for the guards; the both-themes captures + the live flow narration). Squash-merge.

- [ ] **Step 6: The v1 pick (pre-ruled PICK clean; the ruleset amendment stays #222's)**

Per the spec's class ledger ("Forgot-password + Users tab + API send endpoint — **PICK clean, with the ruled ruleset amendment**" — the amendment itself is #222's, blocked on #192) and `docs/agents/v1-picks.md`: run `node scripts/v1-triage.mjs <main-sha>` — the code paths are `apps/admin/**`, `apps/api/**`, and `packages/types/**`, all edition-neutral (both editions run the same auth surfaces per ADR-0018; the endpoint + schema are shared machinery), so the expected verdict is **pick** with zero content-drops; docs/ADR/graph files are main-only and never pick. Execute per the runbook (cherry-pick `-x`, `pnpm check` + `pnpm build` green, the export audit exit 0, push, CI green). **Post-pick owner note (goes in the PR/pick ledger row, not code):** the v1 twins need `INTERNAL_SEND_TOKEN` provisioned (`wrangler secret put` on `sevendays-v1-api` + `sevendays-v1-admin`, same value) before reset emails send — until then the endpoint answers the curated 503 and the flow degrades gracefully (generic success, logged failure). Append the ledger row (date, PR #, main SHA, `pick`, v1 SHA, the one-line summary: "#221 — M7 ticket 10, Settings made real: the Account + Users tabs + forgot-password over the guarded internal send endpoint"). Commit the ledger on main.

- [ ] **Step 7: Issue closes + graphify**

Close #221 with a comment mapping each of the four ACs to its evidence. Then `graphify update .` and commit the graph churn (`chore(graphify): post-#221 graph update (code modified: the settings/auth surfaces across admin + the api internal send endpoint)`).
