# M2 Ticket 09 — Confirmation email: builder + Resend send-after-commit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the DB commit, the API sends a money-free confirmation email via Resend — subject `Booking scheduled: {offeringName} — {phDateTime} (PHT)` ("scheduled", never "confirmed"), from `Sevendays Photography <onboarding@resend.dev>`, body per the spec's pinned copy with a plain inline-styled summary table and a single CTA link to `{LANDING_ORIGIN}/booking/{id}` (GitHub issue #47, parent spec #37). The send is one `c.executionCtx.waitUntil(...)` scheduled past the response with `Idempotency-Key: booking-confirm/<appointmentId>`; email failure = booking stands, logged only. `apps/api`'s env gains required `RESEND_API_KEY` + `LANDING_ORIGIN` (no fallback — the `API_URL` posture) and `.dev.vars.example` documents both.

**Architecture:** One new module, `apps/api/src/services/confirmation-email.ts`, with three seams. (1) `buildConfirmationEmail(input)` — a PURE template-literal builder (the Resend `react` param is Node-only; no JSX, no I/O, dependency-free): money-free is enforced structurally because `ConfirmationEmailInput` carries no price field, the same signature-enforcement move as ticket 08's `confirmationTotalCents(record)`. (2) `sendConfirmationEmail(env, db, record)` — resolves branch name/phone and offering name at send time (reads keyed by the stored ids, per the spec mechanic), builds the payload, and calls the official `resend` SDK with `{ idempotencyKey: 'booking-confirm/<id>' }` — the SDK's `idempotencyKey` send option IS the `Idempotency-Key` HTTP header (grep-proven in the installed 6.26.0 `.d.ts`, pinned below). (3) `scheduleConfirmationEmail(executionCtx, env, db, record)` — the route's single call: wraps the send in `executionCtx.waitUntil(...)` with the catch-and-log INSIDE the scheduled callback, so a failed send can never surface as an unhandled waitUntil rejection nor fail the booking. The route stays thin (one statement after the commit). The email payload is API-internal — it never crosses an app boundary — so it lives in `apps/api`, NOT in `packages/types` (AGENTS.md's "add shapes to packages/types" rule governs cross-app API shapes; there is no Zod boundary here and no client change). Wire-wise this is a ZERO-API-DIFF ticket: no route added, response shapes unchanged, `AppType` unaffected — the api-client and landing are untouched.

**Tech Stack:** Hono 4.13.5 on Cloudflare Workers (`c.executionCtx.waitUntil`, 30s post-response budget, ~1 subrequest), `resend` SDK ^6.26.0 (NEW dependency — runs on Workers per the spec; `nodejs_compat` is already on in `wrangler.toml`), Zod 4.5.1 (`envSchema` extension), `@sevendays/db` Drizzle tables for the send-time name reads, Vitest 4 (`vi.mock('resend')` at the module boundary + Hono's 4-argument `app.request` with a fake execution context), full-ICU `Intl.DateTimeFormat('en-PH', …)` pinned to the landing helper's exact output.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (§ Confirmation email, lines 113+, § Testing Decisions 4, § Mechanics) + ticket `.scratch/m2-booking-flow-tickets/09.md` (= GitHub issue #47, parent #37). The plan argues from the spec; executors read both. Every customer-facing string is pinned verbatim in Global Constraints — the spec's body blockquote is the owner-ratified copy artifact (ticket #34's email-content rounds); nothing is invented except the two interpretive calls veto-flagged below.

## Global Constraints

- **Feature branch only:** all work on `feat/m2-09-confirmation-email`, branched from up-to-date `main`. Never commit directly to `main`; the owner pushes/merges.
- **Scope fence (siblings share the roadmap):** ticket 09 delivers the env vars + builder + send/schedule + route wiring + their tests, and ticks the docs/plan.md "Resend integration" checkbox. NOT here: the milestone end-to-end email verification AND the ADR for the email send topology (both are #48 — ticket 10; the ADR is explicitly #48's acceptance box even though this ticket lands the code it will record); the docs/plan.md "Verify:" checkbox (#48); any landing / api-client / types / db / seed / migration change (zero-API-diff ticket — no Zod schema, no route shape, no client wrapper moves); any `EMAIL_FROM` env override (spec ruling: one constant, no override in M2; `bookings@` waits for the M6 domain swap); any retry logic (M2 ruling: failure = logged only, no retry); `List-Unsubscribe` headers (transactional ruling); any visual styling beyond the plain inline-styled table the spec pins.
- **`docs/plan.md`'s "Resend integration: money-free confirmation email …" checkbox (red-penciled Milestone 2 booking-flow block, the `- [ ]` line directly after the booking-confirmation checkbox — line 68) is THIS ticket alone** — Task 4 ticks it with the ✅ emoji only after Tasks 1–3 are committed. The neighboring checkboxes — "Booking confirmation page" (landed, ticket 08) and "Verify: complete a real booking end-to-end …" (#48) — may not be touched. GitHub issue #47's acceptance boxes stay owner-ticked — note the criterion→task mapping in the PR description, don't edit the issue.
- **Copy is pinned, verbatim everywhere it appears** (spec § Confirmation email; owner-ratified ticket-34 rulings):
  - From: `Sevendays Photography <onboarding@resend.dev>` — the single `EMAIL_FROM` constant.
  - Subject: `Booking scheduled: {offeringName} — {phDateTime(scheduledAt)} (PHT)` — sentence case, no emoji, "scheduled" never "confirmed". The subject is plain text: the offering name is interpolated UNescaped there (escaping would corrupt it); HTML escaping applies only to the HTML body.
  - Body paragraph: `Hi {customerName},` then `Your {offeringName} at {branchName} is scheduled for {phDateTime(scheduledAt)} (PHT) — please keep an eye on this email for any changes.`
  - Summary table labels, in order: `Branch` (always) · `Booking` = offering name, no price (always) · `Add-on` = name only, one row per add-on, the whole section omitted when there are none · `Schedule` (always, value `{phDateTime(scheduledAt)} (PHT)`) · `Notes` (only when non-null). No hero, no logo, no banner, no Total, no confirmation-# row.
  - Call line: `Need to change something? Call {branchName} at {branchPhone}.`
  - CTA line: `View your booking: {landingOrigin}/booking/{appointmentId}` — rendered as `<a href="{url}" style="color:#0b5cab;">View your booking</a>: {url}` — the single `<a>` in the whole email (spec: "single plain styled-text link"), whose rendered text is exactly the pinned copy line. **Veto-flag #1 in the PR** (the one interpretive call on the CTA: the spec's body blockquote and its "link text = View your booking" ruling are satisfied simultaneously by this markup; if the owner prefers the bare URL as link text, it's a one-line swap).
  - Footer: `{customerName} · {customerEmail} · {customerPhone}` (separator ` · `).
  - `phDateTime` = the landing's `apps/landing/src/lib/format.ts` semantics, reimplemented in the API module (separate app — no cross-app import): `Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })`. Pinned output, probed live on full-ICU Node (v26.7.0 local; CI runs Node 24, also full-ICU): `new Date('2026-12-25T01:30:00.000Z')` → `Dec 25, 2026, 9:30 AM` (the same instant the landing's format tests pin). If a pinned rendering ever misses on a runner, the fix is a full-ICU Node environment — never editing the expectation.
- **HTML escaping is uniform (veto-flag #2 in the PR):** every interpolated body value goes through a local `escapeHtml` (`& < > "` → entities). Customer name and notes are free-text user input; catalog names hit it too (`Portraits & ID Photo` renders `Portraits &amp; ID Photo`). The spec pins "pure template-literal string" — a pure escape helper inside the pure builder honors that; skipping escaping would let a customer inject HTML into their own email. The subject is exempt (plain text, see above).
- **`LANDING_ORIGIN` is normalized in the builder** (veto-flag #3): trailing slashes are stripped (`landingOrigin.replace(/\/+$/, '')`) before joining `/booking/{id}`, so a config value of `http://localhost:3000/` still yields a clean URL. No trailing-slash contract is otherwise enforceable via `z.url()`.
- **Resend SDK facts (pre-plan spike, `resend@6.26.0` installed and its `dist/index.d.mts` grepped 2026-09-10):** `resend.emails.send(payload: CreateEmailOptions, options?: CreateEmailRequestOptions)` with `CreateEmailRequestOptions extends IdempotentRequest` whose `idempotencyKey?: string` is documented "If provided, will be sent as the `Idempotency-Key` header" — the spec's key rides the SDK's native option, no raw-fetch fallback, no hand-built HTTP call. **Failure contract: the SDK RESOLVES typed failures** — `Response<T> = { data: T; error: null } | { error: ErrorResponse; data: null }` with `ErrorResponse = { message: string; statusCode: number | null; name: RESEND_ERROR_CODE_KEY }` — it does NOT throw on API errors. The send's failure path therefore CHECKS `result.error` and throws a plain Error (which `scheduleConfirmationEmail` catches and logs); the integration test feeds the mock the real typed shape, not a rejection, for that path. Pin `resend` with `^6.26.0`.
- **waitUntil mechanics:** the route calls `c.executionCtx.waitUntil(...)` exactly once, AFTER `createAppointment` resolves ok (the transaction has committed). Hono THROWS on `c.executionCtx` when the request carries no execution context — that is the test seam: `app.request(path, init, env, executionCtx)` takes the context as its 4th argument (verified in hono@4.13.5 `hono-base.d.ts`), and the suite passes a fake collector (`fakeExecCtx()` in Task 3) whose recorded promises tests await explicitly. The send's name-resolution reuses the REQUEST's per-request db client inside the waitUntil callback — waitUntil extends the request context's lifetime, so the ADR-0011 client stays valid past the response; the integration tests prove those reads over real Postgres inside the collected promise.
- **Money-free is structural, then asserted:** `ConfirmationEmailInput` has no price-bearing field — no offering price, no add-on prices, no total can reach the HTML because no price exists in the builder's input (the `confirmationTotalCents(record)` move). Unit tests still assert the output: no `₱` and no /total/i for every booking kind (package; service with add-ons — the kind that could leak add-on prices).
- **Env posture (loud, per the issue):** both vars join `envSchema` as REQUIRED — `acquireDb` parses the full schema on every `/api/v1` request, so a deployment missing either fails every request with the uniform 500 instead of silently dropping emails. Blast radius (enumerated, all in Task 1): the integration suites pass env as `app.request`'s 3rd argument — every `{ DATABASE_URL: url }` / multi-line `{ DATABASE_URL: url, }` literal in `apps/api/test/*.test.ts` becomes `testEnv(url)` from a new `test/helpers/env.ts` (6 files; `grep` verifies zero leftovers). EXEMPT and untouched: `error-seam.test.ts`'s two `{ DATABASE_URL: '' }` sites (one proves missing-DATABASE_URL → 500 — still 500 under the larger schema, same status + log assertion; one proves `/health` is db-free — health never parses env), and `src/index.test.ts` (its `/api/v1` probe accepts `[200, 500]` and its other calls never reach the parse or pass no env). The suites' `RESEND_API_KEY: 're_test_placeholder'` is inert: the SDK is module-mocked in Task 3 — no network, no real key, no secret committed.
- **`.dev.vars` / secrets hygiene:** `.dev.vars.example` gains both names with blank values + comments; `wrangler.toml` gains a comment only (LANDING_ORIGIN is a plain per-environment Worker var, NOT a `[vars]` entry — a committed localhost value would deploy a wrong CTA; RESEND_API_KEY is already listed in the file's secrets comment block). Never commit a real key.
- **Sandbox reality:** `onboarding@resend.dev` delivers ONLY to the Resend account's own address (julius.porferio.pahama@gmail.com). The suite never sends real email (module-mocked); the real-inbox verify is #48's, not this ticket's.
- **Testing posture (spec § Testing Decisions):** builder = pure unit suite, no I/O (seam 4); send mechanics = the HTTP seam in `test/appointments.test.ts` with `vi.mock('resend', …)` (hoisted `vi.hoisted` + factory), asserting the mocked layer's ACTUAL inputs — `sendMock(payload, { idempotencyKey })`, payload fields via `objectContaining` + stringContaining (the integration date is now-relative, so the subject's date segment can't be pinned there — the unit suite pins it). The module's typed-failure convention: rejection-path tests assert what RESOLVES, never `.rejects` (the `createAppointment` suites' precedent; the SDK mock resolves the typed `{ data: null, error }` shape).
- **Time-coupled tests:** no new hard-coded future dates — `appointments.test.ts`'s `futureDate()`/`FUTURE_ISO()` helpers carry the new POST tests (the ticket-03 ruling). The unit suite's dates are fixed instants (`2026-12-25T01:30:00.000Z`) because the builder is pure — no clock involved.
- **`noUncheckedIndexedAccess` is on:** every `[row]` destructure in the new module is guarded (`if (!row) throw …`), never `!`.
- **Fresh-clone gates:** on a fresh clone run `pnpm install` → `pnpm build:packages` → `pnpm --filter @sevendays/api build` before any typecheck (the shared client resolves the API's `AppType` from built `dist/`). Integration tests need the compose db: `docker compose up -d db` (`global-setup` pings `TEST_DATABASE_URL`, default `postgres://postgres:postgres@localhost:5432/sevendays_test`, and migrates — exit 1 when unreachable).
- **Biome-clean commits:** `pnpm exec biome check --write <files>` (from the repo root or with the api filter) on every created/modified code file before committing. Final gate per task: `pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api test`.
- **Suite counts:** the API suite stands at **69 tests / 11 files** (verified by running it 2026-09-10). This plan lands at **93 tests / 12 files**: env.test.ts 5 → 9 (+4), `confirmation-email.test.ts` new (+16), appointments.test.ts +4. Recount from the actual test blocks at each task's gate — never trust this line over a failing count.
- **Commit style:** scoped conventional subjects (`feat(api):`, `test(api):`, `docs:`), bullet bodies when wordy; one commit per task.

---

## File Structure

```
apps/api/src/env.ts                              (mod, Task 1) envSchema + required RESEND_API_KEY + LANDING_ORIGIN (no fallback)
apps/api/src/env.test.ts                         (mod, Task 1) 5 → 9 tests (3-var valid parse; per-var rejections)
apps/api/test/helpers/env.ts                     (new, Task 1) testEnv(url) — the full binding, single source
apps/api/test/appointments.test.ts               (mod, Task 1 env literals → testEnv(url); Task 3 fake ctx at POST sites + 4 send tests)
apps/api/test/branches.test.ts                   (mod, Task 1) env literals → testEnv(url)
apps/api/test/service-packages.test.ts           (mod, Task 1) env literals → testEnv(url)
apps/api/test/studio-services.test.ts            (mod, Task 1) env literals → testEnv(url)
apps/api/test/addon-services.test.ts             (mod, Task 1) env literals → testEnv(url)
apps/api/test/error-seam.test.ts                 (mod, Task 1) env literals → testEnv(url); the two { DATABASE_URL: '' } sites STAY
apps/api/.dev.vars.example                       (mod, Task 1) + RESEND_API_KEY / LANDING_ORIGIN (blank, commented)
apps/api/wrangler.toml                           (mod, Task 1) LANDING_ORIGIN comment (plain per-environment var; no [vars] entry)
apps/api/src/services/confirmation-email.test.ts (new, Task 2) pure-builder unit suite (16 tests)
apps/api/src/services/confirmation-email.ts      (new, Tasks 2–3) builder half (Task 2) + resolve/send/schedule half (Task 3)
apps/api/package.json                            (mod, Task 3) + resend ^6.26.0 (pnpm --filter @sevendays/api add resend)
apps/api/src/routes/appointments.ts              (mod, Task 3) scheduleConfirmationEmail(c.executionCtx, c.env, db, record) after commit
docs/plan.md                                     (mod, Task 4) Resend-integration checkbox → - [✅] with annotation
docs/progress.md                                 (mod, Task 4) ticket-09 bullet + _Last updated:_ line
```

Module rule: the builder never imports db, env, or resend (pure, dependency-free — spec § Testing Decisions 4); the send/schedule half imports them. Both halves share one file because they share the email types; Task 2 lands the file with only the builder half so the pure suite runs before any I/O exists.

---

### Task 1: Env — required `RESEND_API_KEY` + `LANDING_ORIGIN`, test-env conversion (TDD)

**Files:**
- Create: `apps/api/test/helpers/env.ts`
- Modify: `apps/api/src/env.ts`, `apps/api/src/env.test.ts`, `apps/api/test/appointments.test.ts`, `apps/api/test/branches.test.ts`, `apps/api/test/service-packages.test.ts`, `apps/api/test/studio-services.test.ts`, `apps/api/test/addon-services.test.ts`, `apps/api/test/error-seam.test.ts`, `apps/api/.dev.vars.example`, `apps/api/wrangler.toml`

**Interfaces:**
- Produces (Tasks 2–3 consume): `Env` gains `RESEND_API_KEY: string` and `LANDING_ORIGIN: string` (Zod-validated, required — `parseEnv` rejects without them); `testEnv(databaseUrl: string)` returning the full binding for integration tests.
- Not here: no email module (Task 2), no route change (Task 3), no resend dependency (Task 3), no docs (Task 4). The route is untouched this task — with the env schema extended but no `c.executionCtx` use yet, every existing suite must pass with literals converted only.

- [ ] **Step 1: Write the failing env tests** — in `apps/api/src/env.test.ts`, replace the `parses a valid binding` test and append four rejections (the four existing DATABASE_URL rejection tests stay untouched):

```ts
  it('parses a valid binding (all three vars)', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      RESEND_API_KEY: 're_test_placeholder',
      LANDING_ORIGIN: 'http://localhost:3000',
    });
    expect(env.DATABASE_URL).toBe('postgres://u:p@host:5432/db');
    expect(env.RESEND_API_KEY).toBe('re_test_placeholder');
    expect(env.LANDING_ORIGIN).toBe('http://localhost:3000');
  });

  it('rejects a missing RESEND_API_KEY', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        LANDING_ORIGIN: 'http://localhost:3000',
      })
    ).toThrow(/RESEND_API_KEY/);
  });

  it('rejects an empty RESEND_API_KEY', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: '',
        LANDING_ORIGIN: 'http://localhost:3000',
      })
    ).toThrow(/RESEND_API_KEY/);
  });

  it('rejects a missing LANDING_ORIGIN', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
      })
    ).toThrow(/LANDING_ORIGIN/);
  });

  it('rejects a malformed LANDING_ORIGIN', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://u:p@host:5432/db',
        RESEND_API_KEY: 're_test_placeholder',
        LANDING_ORIGIN: 'not a url',
      })
    ).toThrow(/LANDING_ORIGIN/i);
  });
```

- [ ] **Step 2: Run to verify the tests fail**

Run: `pnpm --filter @sevendays/api test src/env.test.ts`
Expected: FAIL — the 3-var parse succeeds only after the schema grows (the new `RESEND_API_KEY`/`LANDING_ORIGIN` assertions on the parsed result are undefined), and the four rejection tests fail because the current schema IGNORES unknown keys (nothing throws). The other 5 env tests stay green.

- [ ] **Step 3: Extend the schema** — `apps/api/src/env.ts` becomes exactly:

```ts
import { z } from 'zod';

// The Worker's runtime env, Zod-parsed once per request (the binding object is
// per-request under workerd) — a missing or malformed var fails loudly here
// instead of surfacing as a mid-request failure. DATABASE_URL is the pooled
// Supabase connection (ADR-0007). The email pair (issue #47) has no fallback
// by design — the API_URL posture: a deploy without either var fails every
// /api/v1 request (acquireDb parses the full schema) rather than silently
// dropping confirmation emails. The exported Env derives from the schema; the
// ambient generated global in worker-configuration.d.ts is no longer
// load-bearing anywhere.
export const envSchema = z.object({
  DATABASE_URL: z.url(),
  RESEND_API_KEY: z.string().min(1),
  LANDING_ORIGIN: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: unknown): Env {
  return envSchema.parse(input);
}
```

(`z.string().min(1)` is deliberate for the key — `z.string()` alone accepts `''`; `z.url()` already rejects `''` for the origin, and the progress.md `.min(1)`-on-`z.url()` note is why no link is chained there.)

- [ ] **Step 4: Create the test-env helper** — `apps/api/test/helpers/env.ts`:

```ts
// The full Worker binding for integration tests (issue #47 made
// RESEND_API_KEY + LANDING_ORIGIN required env — parseEnv fails without
// them, so every /api/v1 request must carry the complete set). The key is a
// placeholder: the Resend SDK is vi.mock'ed in the suites, so no real key
// (and no network) is ever needed here.
export function testEnv(databaseUrl: string) {
  return {
    DATABASE_URL: databaseUrl,
    RESEND_API_KEY: 're_test_placeholder',
    LANDING_ORIGIN: 'http://localhost:3000',
  };
}
```

- [ ] **Step 5: Convert the integration env literals** — in the six suite files (`test/appointments.test.ts`, `test/branches.test.ts`, `test/service-packages.test.ts`, `test/studio-services.test.ts`, `test/addon-services.test.ts`, `test/error-seam.test.ts`), add the import (biome sorts it):

```ts
import { testEnv } from './helpers/env.js';
```

and replace every env literal with the helper — the one-line `{ DATABASE_URL: url }` form AND the multi-line `{ DATABASE_URL: url, }` form:

```bash
perl -0pi -e 's/\{\s*DATABASE_URL: url,?\s*\}/testEnv(url)/g' \
  apps/api/test/appointments.test.ts \
  apps/api/test/branches.test.ts \
  apps/api/test/service-packages.test.ts \
  apps/api/test/studio-services.test.ts \
  apps/api/test/addon-services.test.ts \
  apps/api/test/error-seam.test.ts
```

Verify (both must hold):

```bash
grep -rn "DATABASE_URL: url" apps/api/test/   # → no matches (all became testEnv(url))
grep -rn "DATABASE_URL: ''" apps/api/test/error-seam.test.ts   # → 2 matches (KEPT: the missing-URL 500 proof and the db-free /health proof — see Global Constraints)
```

(`{ DATABASE_URL: '' }` never matches the pattern — it targets `url`, not `''`.)

- [ ] **Step 6: Update `.dev.vars.example`** — `apps/api/.dev.vars.example` becomes exactly:

```bash
# Local wrangler secrets — copy to .dev.vars (gitignored) and fill in.
# Pooled Supabase connection (Supavisor, port 6543) — see docs/adr/0007-database-connection-topology.md
DATABASE_URL=

# Resend API key (resend.com/api-keys) — confirmation-email sender (issue #47).
# Required env: the API fails every /api/v1 request without it (no fallback).
# Locally any non-empty string boots the app; sends fail loudly and are logged
# (the booking stands). Sandbox sender onboarding@resend.dev delivers ONLY to
# the Resend account's own address.
RESEND_API_KEY=

# Landing site origin — builds the email's "View your booking" link
# ({LANDING_ORIGIN}/booking/{id}). Required env, no fallback (the API_URL
# posture). Dev: http://localhost:3000 (pnpm --filter @sevendays/landing dev).
LANDING_ORIGIN=

# TEST_DATABASE_URL is compose-local for integration tests — never a Supabase URL here.
```

- [ ] **Step 7: Add the `wrangler.toml` comment** — under the `[vars]` section (`ENVIRONMENT = "development"`), append:

```toml
# LANDING_ORIGIN is a plain per-environment Worker var (the confirmation
# email's CTA origin — issue #47), not a committed [vars] entry: a localhost
# value here would deploy a wrong link. Dev value lives in .dev.vars;
# RESEND_API_KEY stays a secret (`wrangler secret put`).
```

- [ ] **Step 8: Run the full API suite**

Run: `pnpm --filter @sevendays/api test`
Expected: PASS — 73 tests (69 + 4 new env tests; the route is untouched, all suites ride `testEnv(url)`).

- [ ] **Step 9: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api exec biome check --write src/env.ts src/env.test.ts test/helpers/env.ts test/appointments.test.ts test/branches.test.ts test/service-packages.test.ts test/studio-services.test.ts test/addon-services.test.ts test/error-seam.test.ts
git add apps/api/src/env.ts apps/api/src/env.test.ts apps/api/test/helpers/env.ts apps/api/test/appointments.test.ts apps/api/test/branches.test.ts apps/api/test/service-packages.test.ts apps/api/test/studio-services.test.ts apps/api/test/addon-services.test.ts apps/api/test/error-seam.test.ts apps/api/.dev.vars.example apps/api/wrangler.toml
git commit -m "feat(api): required RESEND_API_KEY + LANDING_ORIGIN env vars (issue #47)"
```

(Body bullets: `Both vars join envSchema as required — no fallback, the API_URL posture: acquireDb parses the full schema per request, so a deploy without either fails loudly instead of silently dropping emails. Integration suites convert their env literals to testEnv() (test/helpers/env.ts, single source); error-seam's two DATABASE_URL:'' sites stay (missing-URL 500 proof / db-free health). .dev.vars.example + wrangler.toml comment updated; no secrets committed.`)

### Task 2: The pure builder — money-free HTML, pinned copy (TDD)

**Files:**
- Create: `apps/api/src/services/confirmation-email.ts` (builder half only), `apps/api/src/services/confirmation-email.test.ts`

**Interfaces:**
- Produces (Task 3 consumes these exact names):
  - `EMAIL_FROM: 'Sevendays Photography <onboarding@resend.dev>'` — the one constant.
  - `interface ConfirmationEmailInput { appointmentId, customerName, customerEmail, customerPhone, offeringName, branchName, branchPhone, scheduledAt: Date, notes: string | null, addonNames: string[], landingOrigin }` — NO price field (the structural money-free rule).
  - `interface ConfirmationEmail { from, to, subject, html }` — the Resend payload minus send options.
  - `buildConfirmationEmail(input: ConfirmationEmailInput): ConfirmationEmail` — pure; no imports beyond the module.
- Not here: no Resend SDK, no db reads, no Env, no route change (all Task 3) — this file must stay dependency-free and runnable before the I/O half exists.

- [ ] **Step 1: Write the failing unit suite** — create `apps/api/src/services/confirmation-email.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildConfirmationEmail,
  EMAIL_FROM,
  type ConfirmationEmailInput,
} from './confirmation-email.js';

// The builder is pure — fixed instants, no clock, no I/O. Every pinned
// string comes from the spec's § Confirmation email (owner-ratified
// ticket-34 copy); the phDateTime pins match the landing's format tests and
// were probed on full-ICU Node — fix path is a full-ICU environment, never
// editing the expectation.

const base = (overrides: Partial<ConfirmationEmailInput> = {}): ConfirmationEmailInput => ({
  appointmentId: '3f1d9c66-0000-4000-8000-000000000001',
  customerName: 'Juana Dela Cruz',
  customerEmail: 'juana@example.com',
  customerPhone: '+63 917 000 0000',
  offeringName: 'Combined Package',
  branchName: 'Calamba Branch',
  branchPhone: '+63 900 000 001',
  scheduledAt: new Date('2026-12-25T01:30:00.000Z'), // 09:30 same day in PHT
  notes: null,
  addonNames: [],
  landingOrigin: 'http://localhost:3000',
  ...overrides,
});

describe('buildConfirmationEmail — identity', () => {
  it('from is the sandbox EMAIL_FROM constant, exactly', () => {
    expect(buildConfirmationEmail(base()).from).toBe(
      'Sevendays Photography <onboarding@resend.dev>'
    );
    expect(EMAIL_FROM).toBe('Sevendays Photography <onboarding@resend.dev>');
  });

  it('to is the customer email', () => {
    expect(buildConfirmationEmail(base()).to).toBe('juana@example.com');
  });

  it('subject is exact: scheduled-never-confirmed wording with the PHT pin', () => {
    expect(buildConfirmationEmail(base()).subject).toBe(
      'Booking scheduled: Combined Package — Dec 25, 2026, 9:30 AM (PHT)'
    );
  });
});

describe('buildConfirmationEmail — body copy', () => {
  it('greets the customer and states the schedule in the pinned sentence', () => {
    const html = buildConfirmationEmail(base()).html;
    expect(html).toContain('<p>Hi Juana Dela Cruz,</p>');
    expect(html).toContain(
      'Your Combined Package at Calamba Branch is scheduled for Dec 25, 2026, 9:30 AM (PHT) — please keep an eye on this email for any changes.'
    );
  });

  it('carries the call-the-branch line with name and phone', () => {
    expect(buildConfirmationEmail(base()).html).toContain(
      'Need to change something? Call Calamba Branch at +63 900 000 001.'
    );
  });
});

describe('buildConfirmationEmail — summary table', () => {
  it('always carries Branch, Booking, and Schedule rows with their values', () => {
    const html = buildConfirmationEmail(base()).html;
    expect(html).toContain(
      '>Branch</td><td align="left" style="padding:4px 0;">Calamba Branch</td>'
    );
    expect(html).toContain(
      '>Booking</td><td align="left" style="padding:4px 0;">Combined Package</td>'
    );
    expect(html).toContain(
      '>Schedule</td><td align="left" style="padding:4px 0;">Dec 25, 2026, 9:30 AM (PHT)</td>'
    );
  });

  it('renders one name-only Add-on row per add-on, in order', () => {
    const html = buildConfirmationEmail(base({ addonNames: ['Makeup', 'Hairstyle'] })).html;
    expect(html).toContain('>Add-on</td><td align="left" style="padding:4px 0;">Makeup</td>');
    expect(html).toContain('>Add-on</td><td align="left" style="padding:4px 0;">Hairstyle</td>');
  });

  it('omits the Add-on section entirely when there are none', () => {
    expect(buildConfirmationEmail(base()).html).not.toContain('Add-on');
  });

  it('renders the Notes row when notes are non-null', () => {
    const withNotes = buildConfirmationEmail(base({ notes: 'Please shoot outdoors.' })).html;
    expect(withNotes).toContain(
      '>Notes</td><td align="left" style="padding:4px 0;">Please shoot outdoors.</td>'
    );
  });

  it('omits the Notes row when notes are null', () => {
    expect(buildConfirmationEmail(base()).html).not.toContain('Notes');
  });
});

describe('buildConfirmationEmail — money-free (spec ruling)', () => {
  it('a package booking shows no peso output, no total, no fee', () => {
    const html = buildConfirmationEmail(base()).html;
    expect(html).not.toContain('₱');
    expect(html).not.toMatch(/total/i);
    expect(html).not.toMatch(/fee/i);
  });

  it('a service booking with add-ons shows no peso output, no total, no fee either', () => {
    const html = buildConfirmationEmail(
      base({
        offeringName: 'Portraits & ID Photo',
        addonNames: ['Makeup', 'Hairstyle'],
      })
    ).html;
    expect(html).not.toContain('₱');
    expect(html).not.toMatch(/total/i);
    expect(html).not.toMatch(/fee/i);
    expect(html).toContain('Portraits &amp; ID Photo'); // uniform escaping (veto-flag #2)
  });
});

describe('buildConfirmationEmail — footer, CTA, escaping', () => {
  it('footer carries the customer contact exactly', () => {
    expect(buildConfirmationEmail(base()).html).toContain(
      'Juana Dela Cruz · juana@example.com · +63 917 000 0000'
    );
  });

  it('the CTA is the single link: View your booking → {origin}/booking/{id}', () => {
    const html = buildConfirmationEmail(base()).html;
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain(
      '<a href="http://localhost:3000/booking/3f1d9c66-0000-4000-8000-000000000001"'
    );
    expect(html).toContain(
      '>View your booking</a>: http://localhost:3000/booking/3f1d9c66-0000-4000-8000-000000000001</p>'
    );
  });

  it('normalizes a trailing slash on the origin (veto-flag #3)', () => {
    const html = buildConfirmationEmail(base({ landingOrigin: 'http://localhost:3000/' })).html;
    expect(html).toContain(
      'href="http://localhost:3000/booking/3f1d9c66-0000-4000-8000-000000000001"'
    );
    expect(html).not.toContain('//booking');
  });

  it('escapes interpolated values (customer input and catalog ampersands)', () => {
    const html = buildConfirmationEmail(
      base({
        customerName: 'Eve <script>alert(1)</script>',
        notes: 'Attire: "executive" & guest',
      })
    ).html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;executive&quot; &amp; guest');
  });
});
```

- [ ] **Step 2: Run to verify the tests fail**

Run: `pnpm --filter @sevendays/api test src/services/confirmation-email.test.ts`
Expected: FAIL — `./confirmation-email.js` cannot be resolved (import error; the 73 existing tests still pass).

- [ ] **Step 3: Implement the builder half** — create `apps/api/src/services/confirmation-email.ts`:

```ts
// The money-free confirmation email (issue #47). This first half is the PURE
// builder: a template-literal HTML string, no I/O, no dependencies (the
// Resend `react` param is Node-only — Workers takes `html`). Money-free is
// enforced structurally: the input carries no price field, so no price can
// reach the HTML. "Scheduled", never "confirmed" — the appointment's status
// is still pending at booking. The send/schedule half joins this file in
// Task 3.

/** Sandbox sender (M2): ONE constant, no env override — M6's domain swap
 * replaces it (the `bookings@` local part is reserved). */
export const EMAIL_FROM = 'Sevendays Photography <onboarding@resend.dev>';

const PH_DATE_TIME = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** The landing's phDateTime semantics (apps/landing/src/lib/format.ts),
 * reimplemented locally — separate app, no cross-app import. Pinned output:
 * 2026-12-25T01:30:00.000Z → "Dec 25, 2026, 9:30 AM" (full-ICU runtimes). */
function phDateTime(instant: Date): string {
  return PH_DATE_TIME.format(instant);
}

/** Uniform escaping for every interpolated BODY value: customer name and
 * notes are free-text input, and catalog names carry `&` (Portraits & ID
 * Photo → Portraits &amp; ID Photo in HTML). The SUBJECT is exempt — plain
 * text, never HTML-parsed. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export interface ConfirmationEmailInput {
  appointmentId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  offeringName: string;
  branchName: string;
  branchPhone: string;
  scheduledAt: Date;
  notes: string | null;
  /** Name-only rows — the money-free rule keeps prices out by type. */
  addonNames: string[];
  landingOrigin: string;
}

export interface ConfirmationEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
}

function summaryRow(label: string, value: string): string {
  return `<tr><td align="left" style="padding:4px 12px 4px 0;color:#666;">${label}</td><td align="left" style="padding:4px 0;">${value}</td></tr>`;
}

/**
 * Build the full Resend payload minus the send options: exact from/subject,
 * the pinned body copy, the plain inline-styled summary table (no hero, no
 * logo, no banner), a single CTA link, the contact footer. Pure — the unit
 * suite owns every copy rule; nothing here reads env, db, or the clock.
 */
export function buildConfirmationEmail(input: ConfirmationEmailInput): ConfirmationEmail {
  const origin = input.landingOrigin.replace(/\/+$/, '');
  const bookingUrl = `${origin}/booking/${input.appointmentId}`;
  const when = `${phDateTime(input.scheduledAt)} (PHT)`;

  const addonRows = input.addonNames.map((name) => summaryRow('Add-on', escapeHtml(name))).join('');
  const notesRow = input.notes === null ? '' : summaryRow('Notes', escapeHtml(input.notes));

  const html = `<p>Hi ${escapeHtml(input.customerName)},</p>
<p>Your ${escapeHtml(input.offeringName)} at ${escapeHtml(input.branchName)} is scheduled for ${when} — please keep an eye on this email for any changes.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
<tbody>${summaryRow('Branch', escapeHtml(input.branchName))}${summaryRow('Booking', escapeHtml(input.offeringName))}${addonRows}${summaryRow('Schedule', when)}${notesRow}</tbody>
</table>
<p>Need to change something? Call ${escapeHtml(input.branchName)} at ${escapeHtml(input.branchPhone)}.</p>
<p><a href="${bookingUrl}" style="color:#0b5cab;">View your booking</a>: ${bookingUrl}</p>
<p style="color:#666;">${escapeHtml(input.customerName)} · ${escapeHtml(input.customerEmail)} · ${escapeHtml(input.customerPhone)}</p>`;

  return {
    from: EMAIL_FROM,
    to: input.customerEmail,
    subject: `Booking scheduled: ${input.offeringName} — ${when}`,
    html,
  };
}
```

- [ ] **Step 4: Run the suite**

Run: `pnpm --filter @sevendays/api test`
Expected: PASS — 89 tests (73 + 16 new).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api exec biome check --write src/services/confirmation-email.ts src/services/confirmation-email.test.ts
git add apps/api/src/services/confirmation-email.ts apps/api/src/services/confirmation-email.test.ts
git commit -m "feat(api): money-free confirmation email builder — pure template literal (issue #47)"
```

(Body bullets: `buildConfirmationEmail — pure, dependency-free (react param is Node-only); money-free enforced structurally (no price field in the input), asserted per booking kind (no ₱ / total / fee); pinned from/subject/body copy per the spec; table-row rules (Add-on name-only rows, section omitted when none; Notes only when non-null); single CTA to {LANDING_ORIGIN}/booking/{id} with trailing-slash normalization; uniform HTML escaping (veto-flagged); phDateTime pinned to the landing helper's full-ICU output. 16 unit tests; api suite 73 → 89.`)

### Task 3: Send + schedule + route wiring — the email leaves inside `waitUntil` (TDD)

**Files:**
- Modify: `apps/api/package.json` (+ `resend`), `apps/api/src/services/confirmation-email.ts` (append the send/schedule half), `apps/api/src/routes/appointments.ts` (one statement after the commit), `apps/api/test/appointments.test.ts` (SDK mock + fake execution context at every POST site + 4 send tests)

**Interfaces:**
- Consumes: Task 2's `buildConfirmationEmail` / `ConfirmationEmailInput` / `EMAIL_FROM`; the `@sevendays/db` tables `branches` / `servicePackages` / `studioServices`; `Env` from `src/env.js` (Task 1).
- Produces:
  - `sendConfirmationEmail(env: Env, db: Database, record: AppointmentWithAddons): Promise<void>` — resolves names, builds, sends; THROWS on any failure (typed or thrown).
  - `scheduleConfirmationEmail(executionCtx: ConfirmationEmailScheduler, env: Env, db: Database, record: AppointmentWithAddons): void` — the route's one call; never throws, never rejects.
  - `interface ConfirmationEmailScheduler { waitUntil(promise: Promise<unknown>): void }` — the structural slice of `c.executionCtx` (test-friendly; no Hono/CF type import needed).
- Not here: no builder copy change (Task 2 owns every string — if an integration assert misses a copy rule, the fix is in the builder, never in the test's expectation), no new route/endpoint (zero-API-diff), no client or landing change, no real-email verification (#48).

- [ ] **Step 1: Add the dependency**

```bash
pnpm --filter @sevendays/api add resend
```

Expected: `package.json` gains `"resend": "^6.26.0"` (or the resolved 6.x — keep the caret; the spike pinned the API at 6.26.0), lockfile updated. The SDK runs on Workers (spec ruling); `nodejs_compat` is already on in `wrangler.toml`.

- [ ] **Step 2: Write the failing send tests** — in `apps/api/test/appointments.test.ts`:

(a) extend the vitest import to include `afterEach` (the new describe in 2h restores console spies with it), and add `EMAIL_FROM` to the imports:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
```

```ts
import { EMAIL_FROM } from '../src/services/confirmation-email.js';
```

(b) directly after the import block (before `const url = …`), add the SDK mock and the fake execution context:

```ts
// M2 ticket 09 — the confirmation email's send seam. The Resend SDK is
// mocked at the module boundary: these tests prove the wire contract
// (payload + idempotency key) and the waitUntil mechanics over real
// Postgres; the builder's copy rules are the pure unit suite's job
// (src/services/confirmation-email.test.ts).
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

// Hono throws on c.executionCtx unless the request carries an execution
// context (app.request's 4th argument) — the fake records waitUntil
// promises so a test can await the fire-and-forget send.
function fakeExecCtx() {
  const ctx = {
    promises: [] as Promise<unknown>[],
    waitUntil(promise: Promise<unknown>) {
      ctx.promises.push(promise);
    },
    passThroughOnException() {},
  };
  return ctx;
}
```

(c) extend the existing `beforeEach` (keeps its truncate + fixtures lines):

```ts
beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 'email-id' }, error: null });
});
```

(d) replace `createViaApi` with (adds the ctx + flushes the scheduled send):

```ts
const createViaApi = async (body: Record<string, unknown>) => {
  const ctx = fakeExecCtx();
  const res = await app.request(
    '/api/v1/appointments',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    },
    testEnv(url),
    ctx
  );
  expect(res.status).toBe(201);
  await Promise.all(ctx.promises); // the scheduled send resolves before the test ends
  return res.json();
};
```

(e) in the first test (`'persists with snapshots and embedded add-ons'`), replace the inline `app.request` block so it carries the ctx and flushes (assertions unchanged):

```ts
  it('persists with snapshots and embedded add-ons', async () => {
    const ctx = fakeExecCtx();
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload()),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url),
      ctx
    );
    expect(res.status).toBe(201);
    await Promise.all(ctx.promises);
    const body = await res.json();
```

(f) replace the service-path `post` helper with:

```ts
  const post = async (body: Record<string, unknown>) => {
    const ctx = fakeExecCtx();
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url),
      ctx
    );
    await Promise.all(ctx.promises);
    return res;
  };
```

(g) the remaining eight `method: 'POST'` call sites (the 400-path rejection tests in the first describe) each gain `fakeExecCtx()` as the request's 4th argument — mechanical, uniform: a 400 path never schedules anything (the collected promise list stays empty), but carrying the ctx everywhere means a future 400→201 edit can't trip Hono's missing-executionCtx throw.

(h) append the new describe at the file tail:

```ts
// M2 ticket 09 — the confirmation email at the HTTP seam: scheduled through
// the request's execution context AFTER the commit, never blocking the
// response, never failing the booking. Fixture facts asserted here come
// from loadFixtures(): branch 'Test Branch A', package 'Combined Package',
// add-on 'Makeup' — the send resolves the two names from the db AT SEND
// TIME (inside waitUntil), which is what these assertions prove.
describe('POST /api/v1/appointments — confirmation email (ticket 09)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const postBooking = async (ctx: ReturnType<typeof fakeExecCtx>) =>
    app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload()),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url),
      ctx
    );

  it('sends via the SDK inside waitUntil: resolved names, money-free html, idempotency key', async () => {
    const ctx = fakeExecCtx();
    const res = await postBooking(ctx);
    expect(res.status).toBe(201);
    const created = await res.json();

    // The send's db reads need real I/O turns — the SDK call cannot have
    // happened by response time (fire-and-forget, not awaited inline).
    expect(sendMock).not.toHaveBeenCalled();
    await Promise.all(ctx.promises);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: EMAIL_FROM,
        to: 'ana@example.com',
        subject: expect.stringContaining('Booking scheduled: Combined Package — '),
        html: expect.any(String),
      }),
      { idempotencyKey: `booking-confirm/${created.id}` }
    );
    const html = (sendMock.mock.calls[0]?.[0] as { html: string }).html;
    expect(html).toContain('Test Branch A'); // branch resolved at send time from branchId
    expect(html).toContain('Combined Package'); // offering resolved from servicePackageId
    expect(html).toContain('Makeup'); // add-on name rides the record's embedded entries
    expect(html).not.toContain('₱'); // money-free over the wire too
  });

  it("the response doesn't wait on the send (parked send, 201 first)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    sendMock.mockImplementation(() => gate.then(() => ({ data: { id: 'email-id' }, error: null })));
    const ctx = fakeExecCtx();
    const res = await postBooking(ctx);
    expect(res.status).toBe(201); // resolved while the send is still parked on the gate
    release();
    await Promise.all(ctx.promises);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('a typed Resend failure never fails the booking (logged, 201 stands)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // The SDK's REAL failure shape: it resolves { data: null, error } — it
    // does not throw (resend@6 Response contract).
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'internal error', statusCode: 500, name: 'internal_server_error' },
    });
    const ctx = fakeExecCtx();
    const res = await postBooking(ctx);
    expect(res.status).toBe(201);
    await Promise.all(ctx.promises);
    expect(spy.mock.calls.some((call) => String(call[0]).includes('confirmation email'))).toBe(
      true
    );
  });

  it('a thrown send failure never fails the booking either (logged, 201 stands)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMock.mockRejectedValue(new Error('network down'));
    const ctx = fakeExecCtx();
    const res = await postBooking(ctx);
    expect(res.status).toBe(201);
    await Promise.all(ctx.promises);
    expect(spy.mock.calls.some((call) => String(call[0]).includes('confirmation email'))).toBe(
      true
    );
  });
});
```

- [ ] **Step 3: Run to verify the new tests fail**

Run: `pnpm --filter @sevendays/api test`
Expected: FAIL — exactly the 4 new tests (the route doesn't schedule anything yet, so `sendMock` is never called; steps 2b–2g are inert until the wiring exists and nothing else regresses: 89 pass, 4 fail).

- [ ] **Step 4: Append the send/schedule half** — at the tail of `apps/api/src/services/confirmation-email.ts`, add the imports the half needs (the file's import block becomes):

```ts
import { type Database, branches, servicePackages, studioServices } from '@sevendays/db';
import type { AppointmentWithAddons } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import type { Env } from '../env.js';
```

(biome sorts; the builder half itself stays import-free) and append at the file tail:

```ts
// --- Send half (Task 3): resolve at send time, one waitUntil, booking stands ----

/**
 * Structural slice of the request's execution context — the route passes
 * `c.executionCtx`; tests pass a fake collector. (Hono throws on
 * `c.executionCtx` when the request carries no execution context, which is
 * exactly how a test proves the wiring exists.)
 */
export interface ConfirmationEmailScheduler {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Schedule the send past the response (spec mechanics): ONE waitUntil after
 * the commit, the rejection caught and logged INSIDE the scheduled callback
 * — email failure = booking stands, and a failed send can never surface as
 * an unhandled waitUntil rejection.
 */
export function scheduleConfirmationEmail(
  executionCtx: ConfirmationEmailScheduler,
  env: Env,
  db: Database,
  record: AppointmentWithAddons
): void {
  executionCtx.waitUntil(
    sendConfirmationEmail(env, db, record).catch((error: unknown) => {
      console.error(`[api] confirmation email for appointment ${record.id} failed:`, error);
    })
  );
}

async function resolveOfferingName(db: Database, record: AppointmentWithAddons): Promise<string> {
  if (record.servicePackageId !== null) {
    const [row] = await db
      .select({ name: servicePackages.name })
      .from(servicePackages)
      .where(eq(servicePackages.id, record.servicePackageId))
      .limit(1);
    if (!row) throw new Error(`confirmation email: package ${record.servicePackageId} not found`);
    return row.name;
  }
  if (record.studioServiceId !== null) {
    const [row] = await db
      .select({ name: studioServices.name })
      .from(studioServices)
      .where(eq(studioServices.id, record.studioServiceId))
      .limit(1);
    if (!row) throw new Error(`confirmation email: service ${record.studioServiceId} not found`);
    return row.name;
  }
  throw new Error(`confirmation email: appointment ${record.id} has no offering ref`);
}

/**
 * Resolve the copy's names at send time (spec: reads keyed by the stored
 * ids — a catalog edit after booking never rewrites the email's facts; the
 * add-on names ride the record's embedded entries) and hand the payload to
 * the Resend SDK with the idempotency key (≤256 chars, 24h retention — a
 * retried request can't double-send). resend@6 RESOLVES typed failures
 * ({ data, error }) — it does not throw on API errors, so the error branch
 * is checked, never try/catch'd. The db handle is the request's per-request
 * client (ADR-0011): waitUntil extends the request context's lifetime, so
 * the client stays valid past the response.
 */
export async function sendConfirmationEmail(
  env: Env,
  db: Database,
  record: AppointmentWithAddons
): Promise<void> {
  const [branch] = await db
    .select({ name: branches.name, phone: branches.phone })
    .from(branches)
    .where(eq(branches.id, record.branchId))
    .limit(1);
  if (!branch) throw new Error(`confirmation email: branch ${record.branchId} not found`);

  const email = buildConfirmationEmail({
    appointmentId: record.id,
    customerName: record.customerName,
    customerEmail: record.customerEmail,
    customerPhone: record.customerPhone,
    offeringName: await resolveOfferingName(db, record),
    branchName: branch.name,
    branchPhone: branch.phone,
    scheduledAt: record.scheduledAt,
    notes: record.notes,
    addonNames: record.addonServices.map((a) => a.name),
    landingOrigin: env.LANDING_ORIGIN,
  });

  const result = await new Resend(env.RESEND_API_KEY).emails.send(email, {
    idempotencyKey: `booking-confirm/${record.id}`,
  });
  if (result.error) {
    throw new Error(`resend rejected the send (${result.error.name}): ${result.error.message}`);
  }
}
```

- [ ] **Step 5: Wire the route** — in `apps/api/src/routes/appointments.ts`, add the import:

```ts
import { scheduleConfirmationEmail } from '../services/confirmation-email.js';
```

and replace the POST handler's tail — the exact block:

```ts
    if (!result.ok) {
      return badRequest(c, result.message);
    }
    return c.json(result.record, 201);
```

becomes:

```ts
    if (!result.ok) {
      return badRequest(c, result.message);
    }
    // Fire-and-forget (issue #47): the booking is committed; the email is
    // scheduled past the response — its failure never fails the booking.
    scheduleConfirmationEmail(c.executionCtx, c.env, db, result.record);
    return c.json(result.record, 201);
```

- [ ] **Step 6: Run the full API suite + typecheck**

Run: `pnpm --filter @sevendays/api test && pnpm --filter @sevendays/api typecheck`
Expected: PASS — 93 tests (89 + 4; the converts in 2d–2g keep every pre-existing test green through the now-real wiring), typecheck clean (the fake ctx structurally satisfies Hono's `ExecutionContext` param).

- [ ] **Step 7: Lint, commit**

```bash
pnpm --filter @sevendays/api exec biome check --write src/services/confirmation-email.ts src/routes/appointments.ts test/appointments.test.ts
git add apps/api/package.json pnpm-lock.yaml apps/api/src/services/confirmation-email.ts apps/api/src/routes/appointments.ts apps/api/test/appointments.test.ts
git commit -m "feat(api): send the confirmation email after the commit via waitUntil (issue #47)"
```

(Body bullets: `sendConfirmationEmail resolves branch/offering names at send time over the request's db client (valid inside waitUntil — ADR-0011); Resend SDK ^6.26 with idempotencyKey booking-confirm/<id> — the header per the SDK's native option; the SDK resolves typed { data, error } failures, so the error branch is checked and thrown; scheduleConfirmationEmail catches-and-logs INSIDE the scheduled callback — email failure = booking stands, no unhandled waitUntil rejection. Route stays thin: one call after the commit. Tests: vi.mock('resend') at the module boundary + fake execution context as app.request's 4th arg at every POST site; parked-send proves the response never waits; typed- and thrown-failure both leave the 201 standing. Suite 89 → 93.`)

### Task 4: Docs — tick the checkbox, log the landing

**Files:**
- Modify: `docs/plan.md`, `docs/progress.md`

**Not here:** no code; no ADR (the send-topology ADR is #48's acceptance box — recording it here would pre-empt the milestone close-out); no other plan.md checkbox (the "Verify:" line stays untouched — #48); no edits to GitHub issue #47 (owner ticks its boxes; the PR description maps criteria→tasks).

- [ ] **Step 1: Tick this ticket's checkbox** — in `docs/plan.md`, the line

```
- [ ] Resend integration: money-free confirmation email (content per the spec — "scheduled" copy, no prices, no booking fee) sent after the DB commit via `ctx.waitUntil` with `Idempotency-Key: booking-confirm/<appointmentId>` (sandbox sender `onboarding@resend.dev`; `wrangler secret put RESEND_API_KEY`; `LANDING_ORIGIN` env for the CTA)
```

becomes

```
- [✅] Resend integration: money-free confirmation email (content per the spec — "scheduled" copy, no prices, no booking fee) sent after the DB commit via `ctx.waitUntil` with `Idempotency-Key: booking-confirm/<appointmentId>` (sandbox sender `onboarding@resend.dev`; `wrangler secret put RESEND_API_KEY`; `LANDING_ORIGIN` env for the CTA) _(2026-09-10: ticket 09 (#47) — pure template-literal builder in `services/confirmation-email.ts` (money-free by structure — no price field in the input; pinned from/subject/copy; inline-styled table, Add-on rows name-only / section omitted when none, Notes only when non-null; single CTA to `{LANDING_ORIGIN}/booking/{id}`; uniform HTML escaping) + send-after-commit (`scheduleConfirmationEmail(c.executionCtx, …)` — catch-and-log inside the callback, email failure = booking stands; Resend SDK 6.x `idempotencyKey` option = the Idempotency-Key header; the SDK resolves typed `{ data, error }` failures — checked, not try/catch'd). `RESEND_API_KEY` + `LANDING_ORIGIN` are required env (no fallback — the API_URL posture; integration envs via `test/helpers/env.ts`). Suite 69 → 93. ADR for the send topology rides #48.)_
```

- [ ] **Step 2: Add the progress bullet** — in `docs/progress.md`, in the `## What Exists` section directly after the M2 ticket 08 bullet (the `**M2 ticket 08 — confirmation read-back…` line), insert:

```
- **M2 ticket 09 — confirmation email: builder + Resend send-after-commit (#47 → .scratch/m2-booking-flow-tickets/09.md):** the API now sends the money-free confirmation email past the response. `services/confirmation-email.ts` splits a PURE dependency-free builder (`buildConfirmationEmail` — pinned from/subject/body copy per the spec § Confirmation email; inline-styled table with Branch / Booking = offering name / Add-on name-only rows (section omitted when none) / Schedule / Notes only when non-null; footer with customer contact; single CTA `<a>View your booking</a>: {LANDING_ORIGIN}/booking/{id}`; money-free enforced structurally — the input carries no price field — and asserted (no `₱`/total/fee per booking kind); uniform HTML escaping (veto-flagged); `phDateTime` pinned to the landing helper's full-ICU output) from the send/schedule half (`sendConfirmationEmail` resolves branch name/phone + offering name at send time over the request's db client inside waitUntil; Resend SDK ^6.26.0 with `idempotencyKey: booking-confirm/<id>`; the SDK RESOLVES typed failures — the error branch is checked — and `scheduleConfirmationEmail` catches-and-logs inside the scheduled callback, so email failure = booking stands, no retry in M2). Route stays thin: one call after the commit. Env: `RESEND_API_KEY` + `LANDING_ORIGIN` join envSchema as required — no fallback, the API_URL posture (a deploy without either fails every /api/v1 request loudly); integration envs via `test/helpers/env.ts` (the error-seam `DATABASE_URL: ''` sites stay); `.dev.vars.example` + `wrangler.toml` comment updated, no secrets committed. Tests: api suite 69 → 93 (env 5 → 9; builder units +16; HTTP-seam send tests +4 — `vi.mock('resend')` at the module boundary, fake execution context as `app.request`'s 4th arg at every POST site, parked-send proves the response never waits on the email, typed- and thrown-failure both leave the 201 standing). Zero API diff on the wire (no route/shape change — client + landing untouched). Veto-flags ride the PR (CTA markup, uniform escaping, origin trailing-slash normalization). Full `pnpm check` green. NOT landed: milestone e2e-with-email verify + the send-topology ADR (#48).
```

Also update the `_Last updated:_` line at the top of the file: prepend `2026-09-10: M2 ticket 09 — confirmation email builder + Resend send-after-commit.` and demote the existing `M2 ticket 08 — …` segment to `Prior 2026-09-10: M2 ticket 08 — …`, keeping the line's established `Prior …` chaining pattern intact.

- [ ] **Step 3: Keep the knowledge graph current** — run `graphify update .` (AGENTS.md rule: after modifying code).

- [ ] **Step 4: Full gate, then commit**

```bash
pnpm check
git add docs/plan.md docs/progress.md
git commit -m "docs: tick the Resend-integration checkbox — M2 ticket 09 landed"
```

Expected: `pnpm check` (lint + format + typecheck + test across the workspace) green — the AGENTS.md gate for every touched package. `apps/landing`'s suite (56 lib-seam tests) and `apps/api`'s (93) are the suites that must not move.
