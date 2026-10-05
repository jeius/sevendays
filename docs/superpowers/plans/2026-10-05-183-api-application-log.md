# M6 Ticket 01 — The api Application Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The api's structured, ephemeral event stream — the **Application Log** (`apps/api/CONTEXT.md` ## Observability) — becomes executable code: Loglayer + Pino behind a request-scoped child logger off Hono middleware, writing five PII-free event classes into Workers Logs — (a) an access line for every request except `/health`; (b) one admin-mutation event per CMS write (`entity`/`entityId`/`actorId`); (c) media failures (commit, thumbnail, presign) with successful presigns quiet; (d) email attempt + Resend outcome; (e) structured errors replacing today's two `console.error` sites. A `requestId` (`crypto.randomUUID()`) minted per request and echoed as `X-Request-Id`. The `[observability]` block enabled in the api's `wrangler.toml` (`wrangler tail` is the live viewer). In passing, the wildcard CORS middleware is dropped entirely — the CORS surface **closed**: no browser ever calls the api (every frontend call is server-side over the `API` service binding, ADR-0016), and the R2 presign allowlist stays the one real browser-CORS surface.

**Architecture:** Six tasks: (1) the observability module — the pino/browser sink + LogLayer factory + the five event emitters with their enumerated field schemas, TDD'd over the console capture seam; (2) the requestId middleware + the root-app wiring — access lines, the error-event rework of `onError`, the CORS + `hono/logger` removal, the `[observability]` block, and the wrangler dry-run bundle gate; (3) admin-mutation events across the nine entity routers (one line per committed write, none on 400/401); (4) media-failure events at the three seams (presign route catch, the two commit helpers via logger threading, the thumbnail null path); (5) email events in the confirmation-email seam + the PII sweep; (6) full gates + docs rotation + PR/merge + v1-pick ledger + issue close. Every route registration stays chained (ADR-0006 — a statement-style registration silently drops the route from AppType).

**Tech Stack:** hono `4.13.5` (installed), zod `4.5.1`, **loglayer `9.4.0` + `@loglayer/transport-pino` `3.3.0` + pino `10.4.0` (the only new dependencies — npm dist-tags probed 2026-10-05)**, wrangler `4.127.1`, vitest 4, pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#183 "M6 ticket 01: the api Application Log — five event classes, requestId, the closed CORS surface"](https://github.com/jeius/sevendays/issues/183) (label `ready-for-agent`), whose parent is the M6 spec `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` (issue #182 — § The api observability baseline — logging; § The closed CORS surface; § Testing Decisions). Key recon facts (2026-10-05, main `f0d8dd3`, compose db up, tree clean except the pre-existing `docs/progress.md` + graphify-out dirt):

- **The spike proved the whole sink chain live** (evidence: `.superpowers/sdd/2026-10-05-183-api-application-log/evidence/spike-line-shape.txt`): `new LogLayer({ transport: new PinoTransport({ logger: p }) })` over `p = pino({ level: 'trace', browser: { write: (o) => console.log(JSON.stringify(o)) } })` imported from **`pino/browser` (the explicit subpath — load-bearing)** emits one JSON object per event with **child + per-event metadata merged at the top level** beside pino's own `time`/`level`/`msg`: `{ time, level, requestId, evt, method, route, status, durationMs, msg }`. Levels: info `30`, warn `40`, error `50`. The transport (`@loglayer/transport-pino` 3.3.0's `dist/index.js`, read) calls `logger.info(data, message)` — LogLayer's compiled metadata object is pino's merge-object, which the browser build flattens into the line. Verified under vitest/node; the Worker bundles the same pure-JS entry (see next bullet).
- **`pino/browser` is workerd-safe by inspection and type-shimmed by declaration.** pino `10.4.0` ships NO `exports` map and no `browser.d.ts` beside `browser.js` (only `types: pino.d.ts` at the root), so under the api's `moduleResolution: nodenext` the subpath has no declarations — `apps/api/src/types/pino-browser.d.ts` declares it (Task 1, verbatim below). The explicit subpath import also sidesteps bundler-condition roulette: wrangler's esbuild may or may not honor pino's legacy `browser` field, but `pino/browser` resolves identically everywhere. The entry's whole graph is pure JS with zero Node builtins (`pino/browser.js` → `quick-format-unescaped@4.0.4` + `@pinojs/redact@0.4.0`, both dependency-free; loglayer's own packages likewise). Task 2 still runs the real bundle gate (`wrangler deploy --dry-run --outdir`, probed 2026-10-05: exits 0 offline, no upload).
- **Hono's compose makes after-`next()` code run on the error path with the final status** (`node_modules/.pnpm/hono@4.13.5/.../dist/compose.js`, read): each `dispatch(i)` catches handler throws at the deepest frame, runs `onError` there, and sets `context.res` — so the outer middleware's post-`next()` block sees the 500/503 response. The access middleware therefore covers success, 404, and error paths with one `await next()`. `c.header('x-request-id', …)` BEFORE `next()` flows into every `c.json`/onError/notFound response via Hono's prepared-headers merge; a raw `Response` return (the thumbnail route) misses that merge, so the middleware also sets the header on `c.res` after `next()` when absent (try/catch'd — a fetched Response's headers are immutable).
- **`c.req.routePath` returns the full mounted pattern** (probed live through a root→mid→leaf `.route()` chain 2026-10-05): `PUT /api/v1/admin/branches/abc-123` → `'/api/v1/admin/branches/:id'`. Unmatched paths (the 404 handler) yield `''` — the middleware falls back to `c.req.path` there. `routePath` exists in the installed hono 4.13.5 (`dist/types/request.d.ts:290`, `get routePath(): string`).
- **wrangler 4.127.1's config schema accepts `[observability]`** (`config-schema.json` → `definitions.Observability`: `enabled: boolean`, optional `head_sampling_rate` — probed). The block rides `wrangler.toml`, a transformed surface: per the spec's v1-pick ledger, logging (incl. the block) and the CORS drop are both **PICK clean** — no SPLIT, no main-only paths.
- **The mutation surface is 23 POST/PUT handler sites across nine routers** (no DELETE routes exist — M5's "delete nowhere", #159 reverses it in M7): branches/print-sizes/attires/addon-services/service-packages/testimonials each POST `/` + PUT `/:id` (testimonials also has `PUT /order` — pre-flight-verified 2026-10-05); gallery-photos + gallery-categories add `PUT /order`; studio-services adds `PUT /:id/branches` + `PUT /:id/addons`. The media presign POST writes nothing (excluded). Every mutation handler already returns `result.row` with an `id` (order PUTs return a list → `entityId: null`; matrix PUTs take the id from the `:id` param). A 400/401 result must emit NO mutation line — the emit sits after each handler's `result.ok` checks, mirroring the Audit Log's request-grain ruling (#185's durable twin).
- **The two `console.error` sites** (the seam class (e) replaces): `src/index.ts:25` (root onError) and `src/services/confirmation-email.ts:126` (the waitUntil catch). Four existing tests spy them and move to structured-line assertions in Tasks 2/4/5: `test/error-seam.test.ts:47,59`, `test/media-routes.test.ts:164`, `test/appointments.test.ts:747,764`.
- **The email seam's shapes:** `scheduleConfirmationEmail(executionCtx, env, db, record)` schedules `sendConfirmationEmail` in one `waitUntil`, rejection caught and logged inside the callback; resend@6 RESOLVES typed failures (`{ data, error }` — never throws), the error branch throws `resend rejected the send (${result.error.name}): ${result.error.message}`. Resend error **messages are free text that may echo the recipient address** — so the email event carries a classified `code` (`resend:<error.name>` | `send_failed`), never the message (PII-minimal by construction). The loud detail becomes #184's job (Sentry captures email-send failures at exactly this seam — its AC says so).
- **The commit-failure seams are the two module-private helpers**, not the routes: `commitStagingKey(env, stagingKey)` in `services/admin-gallery.ts:263` and `resolveCover(env, key)` in `services/admin-packages.ts:145` — both re-path `commitUpload`'s typed failure onto `reason: 'conflict'`, which at the route level is indistinguishable from a uniqueness collision (a slug 400 must NOT emit a media event). The logger threads into exactly these helpers and their four exported callers; everything else stays signature-clean.
- **No CORS test assertions exist to remove** (swept `apps/api/test` + `apps/api/src` for cors/access-control/ACAO — only the middleware itself and its TODO comment match). The AC's "removed/updated" is satisfied by ADDING the no-ACAO-header assertions (Task 2).
- **Sibling fences (spec § Sequencing; `docs/plan.md` M6 block):** this ticket owns plan.md M6 checkboxes **1** (logging) and **3** (CORS) exclusively and ticks both at close; checkboxes 2 (Sentry #184), 4 (Audit Log #185), 5 (dashboard #186/#187), 6 (Playwright #189), 7 (smoke #190), 8–10 (ship #191/#192), 11 (verify — #190/#192) stay unticked. NOT here, regardless of temptation: anything Sentry (no DSN reads, no capture calls — #184 rides this ticket's `logError` seam afterward), the Audit Log table or any DB schema change (#185 — no migration exists in this ticket), any metrics/dashboard/CF-GraphQL work (#186/#187), Playwright/smoke (#189/#190), the runbook (#191), any `packages/types` change (the event schemas are api-internal observability, not a wire contract — the spec's types-suite bullet covers #185's audit-event shape, not these), any landing/admin code, any new env var or secret (the sink is env-free — `console.log` — so `/health` and env-less tests keep working), and `worker-configuration.d.ts` (no cf-typegen).
- **Baselines (live, 2026-10-05, compose db up, spike reverted):** `apps/api` = **23 files passed + 1 skipped (24) / 290 tests passed + 3 skipped** (AGENTS.md floors confirmed; the "close timed out after 10000ms" vitest-4 exit noise is pre-existing — judge the Test Files/Tests lines only). After this ticket: **26 files passed + 1 skipped (27) / 317 tests passed + 3 skipped** (+7 Task 1, +6 Task 2, +8 Task 3, +4 Task 4, +2 Task 5; Task 5 rewrites two existing appointments tests in place). `pnpm check` currently 35/35 turbo tasks (count unchanged — no scripts added). If any gate count differs, reconcile before proceeding — do not loosen assertions.
- **Clarify ruling needed from the owner (one call, before Task 1 if possible; the plan defaults are safe to build):** none blocking — every literal below traces to the spec (#175/#176 rulings) or the probed library behavior. The evt vocabulary (`access` / `admin_mutation` / `media_failure` / `email` / `error`), the email `phase`/`code` fields, and the level assignments (media_failure warn, email failed error) are **agent rulings pinned in Global Constraints, owner-reviewable at PR** — they are internal log vocabulary, cheap to re-derive with a grep if the owner renames.

## Global Constraints

- **Branch & baseline:** `feat/183-api-application-log` off main `f0d8dd3` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#183)` squash style; every commit below is pinned verbatim. Evidence (test output, dry-run bundle manifest) lands in gitignored `.superpowers/sdd/2026-10-05-183-api-application-log/`.
- **Gates (repo AGENTS.md, verbatim duties):** after any manifest change run `pnpm install`. Before any work that typechecks `packages/api-client` or the apps, run `pnpm build:packages && pnpm --filter @sevendays/api build` (the client resolves `AppType` from the built `dist/`). Every task commits only with `pnpm check` green for the packages it touched (api tests need the compose db up: `docker compose up -d db` first). Biome canonical form via `pnpm --filter @sevendays/api fix` (biome check --write) before committing — accept its rewrites. Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **Version pins (probed 2026-10-05):** add exactly `loglayer@9.4.0`, `@loglayer/transport-pino@3.3.0`, `pino@10.4.0` to `apps/api` dependencies (`pnpm --filter @sevendays/api add loglayer@9.4.0 @loglayer/transport-pino@3.3.0 pino@10.4.0`) — verify with `pnpm --filter @sevendays/api list loglayer @loglayer/transport-pino pino --depth 0`; anything else resolves → STOP and report. `hono` resolves `4.13.5`, `wrangler` `4.127.1`, `zod` `4.5.1`. The ONLY pre-existing peer warning is `@hono/zod-validator` wanting zod 3 (long-standing, not this ticket's).
- **The sink (spike-pinned, binding):** `import { pino } from 'pino/browser'` (explicit subpath — load-bearing); `pino({ level: 'trace', browser: { write: (o) => console.log(JSON.stringify(o)) } })`; `new LogLayer({ transport: new PinoTransport({ logger: p }) })` built ONCE per isolate; per-request children via `appLogger.child().withContext({ requestId })` — **`child()` first is load-bearing: `withContext` MUTATES the instance it is called on (appendContext + `return this`), so calling it on the singleton would leak every prior request's id into the next line; `child()` clones the context manager into a fresh instance** (loglayer 9.4.0 `dist/index.js:381-400,478-484`, verified during the Task-1 salvage). Emitted line = `{ time, level, ...childMetadata, ...eventMetadata, msg }` — one JSON string per `console.log` (Workers Logs ingests it; tests spy `console.log`; context keys spread at top level because `contextFieldName` defaults to undefined). `pino/browser` has no shipped types — the declaration shim at `apps/api/src/types/pino-browser.d.ts` (Task 1, verbatim) is the one allowed module-declaration file, and its options type is `import('pino').LoggerOptions` (strict mode needs the contextual type for the `browser.write` callback parameter).
- **Event vocabulary (agent ruling, owner-reviewable; binding):** `evt` values exactly `access` | `admin_mutation` | `media_failure` | `email` | `error`. Enumerated field schemas per class (beyond `time`/`level`/`msg`/`requestId`): access = `method`, `route`, `status`, `durationMs`, `actorId` only when the session verified; admin_mutation = `method`, `route`, `entity`, `entityId` (`string | null`), `actorId`; media_failure = `op` (`presign` | `commit` | `thumbnail`), `reason` (`missing_credentials` | the CommitUploadResult reason | `not_found` respectively); email = `phase` (`attempt` | `sent` | `failed`), `appointmentId`, `code` on failed only (`resend:<error.name>` | `send_failed`); error = `method`, `route`, `name`, `message`, `stack` (omitted when absent). Levels: access/admin_mutation/email-attempt/email-sent = info (30); media_failure = warn (40); email-failed/error = error (50). Entity names: the nine kebab route segments (`branch`, `print-size`, `gallery-photo`, `attire`, `addon-service`, `studio-service`, `service-package`, `gallery-category`, `testimonial`). No event ever carries a raw body, email address, IP, User-Agent, or referrer — the email-failure classification exists precisely to keep resend's free-text messages out.
- **Access line (spec-verbatim duties, binding):** one line per request except exactly `c.req.path === '/health'` (the header still rides /health responses — every response carries `X-Request-Id`; only the line is suppressed). `route` = `c.req.routePath.includes('*') ? c.req.path : c.req.routePath` — a matched route reports its pattern; routePath resolves to the registering middleware's wildcard (`/*` or `/api/v1/*`) for 404s and middleware-thrown errors (Hono 4.13.5 `dist/request.js:282` + compose's routeIndex — the original `''`-when-unmatched claim was an inference the Task 2 run disproved), and the raw path stands in there. `durationMs` = `Date.now()` delta over the whole chain. `actorId` = `c.get('session')?.user.id` read AFTER `next()` (requireSession has run by then; BetterAuth's `SessionData` is `{ session, user }` and the id lives at `user.id` — salvaged during Task 1, the plan's original `?.userId` was wrong against the real shape).
- **CORS closure (spec-verbatim, binding):** the `hono/cors` import AND the `.use('*', cors(...))` line are deleted — not narrowed, no config left behind. No ACAO header may appear on any api response (asserted). The R2 bucket's presign allowlist (media runbook) is untouched — it is not api code.
- **PII floor (binding):** the PII sweep test (Task 5) runs a real booking POST carrying a distinctive customer email/phone plus `user-agent` and `x-forwarded-for` headers and asserts (a) every captured line parses as JSON, (b) every line's key set is within the five enumerated schemas, (c) no line's raw string contains the email, the phone, the UA, or the IP.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; `pnpm --filter @sevendays/api fix` then normalizes quoting/ordering/import order to house style — accept its rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–5 edit only: `apps/api/package.json` + `pnpm-lock.yaml` (the three adds), `apps/api/wrangler.toml` ([observability]), `apps/api/src/types/pino-browser.d.ts` (create), `apps/api/src/observability/logger.ts` + `events.ts` + `request-context.ts` + `events.test.ts` (create), `apps/api/src/index.ts`, `apps/api/src/services/db.ts`, `apps/api/src/services/confirmation-email.ts`, `apps/api/src/services/admin-gallery.ts`, `apps/api/src/services/admin-packages.ts`, `apps/api/src/routes/appointments.ts`, `apps/api/src/routes/admin-media.ts`, `apps/api/src/routes/gallery-photos.ts`, `apps/api/src/routes/admin-branches.ts`, `apps/api/src/routes/admin-print-sizes.ts`, `apps/api/src/routes/admin-attires.ts`, `apps/api/src/routes/admin-addon-services.ts`, `apps/api/src/routes/admin-studio-services.ts`, `apps/api/src/routes/admin-service-packages.ts`, `apps/api/src/routes/admin-gallery-categories.ts`, `apps/api/src/routes/admin-testimonials.ts`, `apps/api/test/application-log.test.ts` + `admin-mutation-log.test.ts` (create), `apps/api/test/error-seam.test.ts`, `apps/api/test/media-routes.test.ts`, `apps/api/test/appointments.test.ts`. Task 6 rotates `docs/plan.md` (M6 boxes 1 + 3), `docs/progress.md`, `AGENTS.md` (status bullet + the `pnpm check` floors line), and `docs/agents/v1-picks.md` (ledger rows, post-merge). NOT here: Sentry in any form (#184), the Audit Log or any migration (#185), metrics/dashboard (#186/#187), e2e/smoke (#189/#190), the runbook (#191), any `packages/types` file, any landing/admin file, any env schema change, `worker-configuration.d.ts`.

## File Structure

```text
apps/api/
  package.json / pnpm-lock.yaml            # modify (Task 1) — loglayer + transport-pino + pino
  wrangler.toml                            # modify (Task 2) — [observability] enabled
  src/
    types/pino-browser.d.ts                # create (Task 1) — the subpath type shim
    observability/
      logger.ts                            # create (Task 1) — the sink + LogLayer factory + RootEnv
      events.ts                            # create (Task 1) — the five emitters, enumerated schemas
      request-context.ts                   # create (Task 2) — requestId middleware
      events.test.ts                       # create (Task 1) — unit suite over the console capture seam
    index.ts                               # modify (Task 2) — requestLogging, logError in onError, cors+logger dropped
    services/
      db.ts                                # modify (Task 1) — ApiEnv Variables gains logger (moved from Task 2 by salvage ruling)
      confirmation-email.ts                # modify (Task 5) — log param, email events, ResendRejectionError
      admin-gallery.ts                     # modify (Task 4) — commitStagingKey logs commit failures
      admin-packages.ts                    # modify (Task 4) — resolveCover logs commit failures
    routes/
      appointments.ts                      # modify (Task 5) — pass the request logger to the scheduler
      admin-media.ts                       # modify (Task 4) — presign failure catch
      gallery-photos.ts                    # modify (Tasks 3+4) — mutation events + thumbnail failure
      admin-*.ts (8 files)                 # modify (Task 3) — mutation events at the 20 admin-router sites
  test/
    application-log.test.ts                # create (Task 2) — access/requestId/error/health/CORS
    admin-mutation-log.test.ts             # create (Task 3, extended Task 4) — mutation + commit events
    error-seam.test.ts                     # modify (Task 2) — two spy tests → structured lines
    media-routes.test.ts                   # modify (Task 4) — presign/thumb event assertions + the webp test's X-Request-Id
    appointments.test.ts                   # modify (Task 5) — two spy tests → email events + PII sweep
```

---

### Task 1: The observability module — sink, factory, the five emitters (TDD)

**Files:**
- Create (test-first): `apps/api/src/observability/events.test.ts`
- Create: `apps/api/src/observability/logger.ts`, `apps/api/src/observability/events.ts`, `apps/api/src/types/pino-browser.d.ts`
- Modify: `apps/api/package.json` + `pnpm-lock.yaml` (the three `pnpm add`s only), `apps/api/src/services/db.ts:11-14` (the ApiEnv type — moved here from Task 2 by salvage ruling: events.ts's `c.get('logger')` typechecks only once `logger` is in ApiEnv's Variables)

**Interfaces:**
- Consumes: nothing from earlier tasks (the module is self-contained; `import type { Env } from '../env.js'` for the RootEnv shape only).
- Produces (exact exports — Tasks 2–5 and #184 consume): from `logger.ts` — `type RequestLogger = LogLayer`, `buildAppLogger(): LogLayer`, `createRequestLogger(requestId: string): RequestLogger`, `type RootEnv = { Bindings: Env; Variables: { logger: RequestLogger; session?: { user: { id: string } } } }` (the `session` key is a structural slice — the real `SessionData` lands via `requireSession` on ApiEnv contexts at runtime; typing the slice keeps the middleware free of a services import cycle); from `events.ts` — `logAccess(log: RequestLogger, fields: { method: string; route: string; status: number; durationMs: number; actorId?: string }): void`, `logAdminMutation(c: Context<ApiEnv>, fields: { entity: AdminMutationEntity; entityId: string | null }): void` with `type AdminMutationEntity = 'branch' | 'print-size' | 'gallery-photo' | 'attire' | 'addon-service' | 'studio-service' | 'service-package' | 'gallery-category' | 'testimonial'`, `logMediaFailure(log: RequestLogger, fields: { op: 'presign' | 'commit' | 'thumbnail'; reason: string }): void`, `logEmail(log: RequestLogger, fields: { phase: 'attempt' | 'sent' | 'failed'; appointmentId: string; code?: string }): void`, `logError(c: Context<RootEnv>, error: Error): void`; PLUS the ApiEnv growth — `ApiEnv['Variables']` gains `logger: RequestLogger` (required) in `services/db.ts` (moved from Task 2: events.ts's `c.get('logger')` compiles against it; actorId reads `c.get('session')?.user.id` — BetterAuth's SessionData carries the id at `user.id`, verified in the Task-1 salvage).

**Not here:** the middleware or any route wiring (Task 2); any consumer of the emitters beyond the unit suite; `packages/types` (api-internal vocabulary).

- [ ] **Step 1: Write the failing unit tests**

Create `apps/api/src/observability/events.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logAccess, logEmail, logMediaFailure } from './events.js';
import { createRequestLogger } from './logger.js';

// The sink seam: every event lands on console.log as ONE JSON string (the
// pino/browser write inside logger.ts) — tests capture that string and parse
// it, so assertions run against exactly what `wrangler tail` would show.
const captureLines = () => {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(String(args[0]));
  });
  return lines;
};

const parse = (lines: string[]) =>
  lines.map((line) => JSON.parse(line) as Record<string, unknown>);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('event classes — enumerated field schemas (spec #175)', () => {
  it('access: exactly the ruled keys at info; actorId omitted when the session did not verify', () => {
    const lines = captureLines();
    logAccess(createRequestLogger('req-unit-1'), {
      method: 'GET',
      route: '/api/v1/branches',
      status: 200,
      durationMs: 5,
    });
    expect(lines).toHaveLength(1);
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'durationMs',
      'evt',
      'level',
      'method',
      'msg',
      'requestId',
      'route',
      'status',
      'time',
    ]);
    expect(line.evt).toBe('access');
    expect(line.requestId).toBe('req-unit-1');
    expect(line.route).toBe('/api/v1/branches');
    expect(line.status).toBe(200);
    expect(line.durationMs).toBe(5);
    expect(line.level).toBe(30); // pino info
  });

  it('access: actorId rides only when passed (the verified-session case)', () => {
    const lines = captureLines();
    logAccess(createRequestLogger('req-unit-2'), {
      method: 'GET',
      route: '/api/v1/admin/branches',
      status: 200,
      durationMs: 7,
      actorId: 'user-1',
    });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line)).toContain('actorId');
    expect(line.actorId).toBe('user-1');
  });

  it('media_failure: exactly op + reason at warn', () => {
    const lines = captureLines();
    logMediaFailure(createRequestLogger('req-unit-3'), {
      op: 'commit',
      reason: 'cap_violation',
    });
    expect(lines).toHaveLength(1);
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'evt',
      'level',
      'msg',
      'op',
      'reason',
      'requestId',
      'time',
    ]);
    expect(line.evt).toBe('media_failure');
    expect(line.op).toBe('commit');
    expect(line.reason).toBe('cap_violation');
    expect(line.level).toBe(40); // pino warn
  });

  it('email attempt: exactly phase + appointmentId at info', () => {
    const lines = captureLines();
    logEmail(createRequestLogger('req-unit-4'), {
      phase: 'attempt',
      appointmentId: 'apt-1',
    });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'appointmentId',
      'evt',
      'level',
      'msg',
      'phase',
      'requestId',
      'time',
    ]);
    expect(line.evt).toBe('email');
    expect(line.phase).toBe('attempt');
    expect(line.appointmentId).toBe('apt-1');
    expect(line.level).toBe(30);
  });

  it('email sent: same schema as attempt, phase flipped', () => {
    const lines = captureLines();
    logEmail(createRequestLogger('req-unit-5'), {
      phase: 'sent',
      appointmentId: 'apt-1',
    });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'appointmentId',
      'evt',
      'level',
      'msg',
      'phase',
      'requestId',
      'time',
    ]);
    expect(line.phase).toBe('sent');
  });

  it('email failed: code rides, at error level', () => {
    const lines = captureLines();
    logEmail(createRequestLogger('req-unit-6'), {
      phase: 'failed',
      appointmentId: 'apt-1',
      code: 'resend:internal_server_error',
    });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'appointmentId',
      'code',
      'evt',
      'level',
      'msg',
      'phase',
      'requestId',
      'time',
    ]);
    expect(line.phase).toBe('failed');
    expect(line.code).toBe('resend:internal_server_error');
    expect(line.level).toBe(50); // pino error
  });

  it('one request child stamps the same requestId on every event it emits', () => {
    const lines = captureLines();
    const log = createRequestLogger('req-unit-7');
    logAccess(log, { method: 'POST', route: '/api/v1/appointments', status: 201, durationMs: 12 });
    logEmail(log, { phase: 'sent', appointmentId: 'apt-9' });
    const parsed = parse(lines);
    expect(parsed).toHaveLength(2);
    expect(new Set(parsed.map((line) => line.requestId))).toEqual(new Set(['req-unit-7']));
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `docker compose up -d db` (if not up), then `pnpm --filter @sevendays/api test -- src/observability`
Expected: FAIL — the import cannot resolve (`./events.js` / `./logger.js` do not exist).

- [ ] **Step 3: Add the dependencies and the type shim**

Run: `pnpm --filter @sevendays/api add loglayer@9.4.0 @loglayer/transport-pino@3.3.0 pino@10.4.0`
Expected: `package.json` gains the three in dependencies; `pnpm --filter @sevendays/api list loglayer @loglayer/transport-pino pino --depth 0` resolves exactly 9.4.0 / 3.3.0 / 10.4.0 (anything else → STOP and report). `pnpm install` runs as part of add (the manifest-change gate).

Create `apps/api/src/types/pino-browser.d.ts`:

```ts
// pino 10.4.0 ships no exports map and no declarations beside browser.js, so
// `pino/browser` has no types under moduleResolution: nodenext. This shim
// declares the browser factory against the root pino types — the instance is
// runtime-compatible with everything @loglayer/transport-pino calls on it
// (the level methods only; spiking 2026-10-05, see the #183 plan). The
// options type is pino's real LoggerOptions (not Record<string, unknown>):
// strict mode needs the contextual type for the browser.write callback's
// object parameter.
declare module 'pino/browser' {
  import type { Logger } from 'pino';
  export function pino(options?: import('pino').LoggerOptions): Logger;
}
```

- [ ] **Step 4: Write logger.ts**

Create `apps/api/src/observability/logger.ts`:

```ts
import { PinoTransport } from '@loglayer/transport-pino';
import { LogLayer } from 'loglayer';
import { pino } from 'pino/browser';
import type { Env } from '../env.js';

// The Application Log's sink (M6 #183, spec § logging): LogLayer over pino's
// BROWSER build, one JSON string per event on console.log — the exact shape
// Workers Logs ingests when the [observability] block is enabled, and the
// seam the test suites spy. The explicit `pino/browser` subpath is
// load-bearing: the root entry resolves to the Node build (sonic-boom on
// fd 1, absent under workerd), while the browser entry is pure JS
// (quick-format-unescaped + @pinojs/redact, zero Node builtins — verified
// 2026-10-05) and resolves identically under wrangler's esbuild and vitest.
// The emitted line is { time, level, ...bindings, ...metadata, msg } —
// LogLayer's compiled metadata object is pino's merge-object.
export type RequestLogger = LogLayer;

export function buildAppLogger(): LogLayer {
  const p = pino({
    level: 'trace', // LogLayer filters per-transport; let every class through
    browser: { write: (o) => console.log(JSON.stringify(o)) },
  });
  return new LogLayer({ transport: new PinoTransport({ logger: p }) });
}

// One base instance per isolate; per-request children bind the requestId.
// child() first is LOAD-BEARING: withContext mutates the instance it is
// called on (contextManager.appendContext + return this), so calling it on
// the singleton would leak every prior request's id into the next line.
// child() clones the context manager into a fresh instance; the child's own
// withContext then stamps this request's id onto that child only.
const appLogger = buildAppLogger();

export function createRequestLogger(requestId: string): RequestLogger {
  return appLogger.child().withContext({ requestId });
}

// The root app's environment: the request logger (set by requestLogging) and
// a structural slice of the BetterAuth session for the access line's actorId
// — the real SessionData is { session, user } and the id lives at user.id;
// typing only the slice keeps this module free of a services/auth import
// cycle while staying structurally satisfied by the real session.
export type RootEnv = {
  Bindings: Env;
  Variables: { logger: RequestLogger; session?: { user: { id: string } } };
};
```

- [ ] **Step 5: Grow the ApiEnv variables, then write events.ts**

First, in `apps/api/src/services/db.ts`, change the type (lines 11–14) from:

```ts
export type ApiEnv = {
  Bindings: Env;
  Variables: { db: Database; session?: SessionData };
};
```

to:

```ts
export type ApiEnv = {
  Bindings: Env;
  Variables: { db: Database; session?: SessionData; logger: RequestLogger };
};
```

and add the import beside the existing `./auth.js` one:

```ts
import type { RequestLogger } from '../observability/logger.js';
```

Update the type's header comment's last sentence to instead end:

```text
// `logger` is set by requestLogging at the ROOT (M6 #183) — required, because
// the middleware precedes every route including /health.
```

(This edit moved here from Task 2 Step 5 by salvage ruling: events.ts below compiles `c.get('logger')` against ApiEnv, so the type must land in the same task.)

Create `apps/api/src/observability/events.ts`:

```ts
import type { Context } from 'hono';
import type { ApiEnv } from '../services/db.js';
import type { RequestLogger, RootEnv } from './logger.js';

// The five event classes (M6 #183, spec § logging) — nothing else is ever
// logged. Every class carries an enumerated field schema (asserted by the
// suites); optional fields are spread only when present so the key set IS
// the schema. PII floor: no raw bodies, no email addresses, no IP, no
// User-Agent, no referrer — the email-failure `code` is classified
// (`resend:<error.name>` | `send_failed`) precisely to keep resend's
// free-text error messages (which may echo the recipient) out of the log.
//
// Levels: access / admin_mutation / email-attempt / email-sent at info;
// media_failure at warn; email-failed and error at error.

export type AdminMutationEntity =
  | 'branch'
  | 'print-size'
  | 'gallery-photo'
  | 'attire'
  | 'addon-service'
  | 'studio-service'
  | 'service-package'
  | 'gallery-category'
  | 'testimonial';

export type MediaFailureOp = 'presign' | 'commit' | 'thumbnail';

export type EmailPhase = 'attempt' | 'sent' | 'failed';

export function logAccess(
  log: RequestLogger,
  fields: {
    method: string;
    route: string;
    status: number;
    durationMs: number;
    actorId?: string;
  }
): void {
  log
    .withMetadata({
      evt: 'access',
      method: fields.method,
      route: fields.route,
      status: fields.status,
      durationMs: fields.durationMs,
      ...(fields.actorId !== undefined ? { actorId: fields.actorId } : {}),
    })
    .info('access');
}

/**
 * One line per committed CMS write (the write model's evidence class; the
 * durable twin is #185's Audit Log). Called at the route layer AFTER the
 * service result came back ok — a 400/401 path never reaches it. The
 * context supplies method, route pattern, and the verified actor; the
 * order PUTs pass entityId null (they mutate the family, not one row).
 */
export function logAdminMutation(
  c: Context<ApiEnv>,
  fields: { entity: AdminMutationEntity; entityId: string | null }
): void {
  c.get('logger')
    .withMetadata({
      evt: 'admin_mutation',
      method: c.req.method,
      route: c.req.routePath,
      entity: fields.entity,
      entityId: fields.entityId,
      actorId: c.get('session')?.user.id,
    })
    .info('admin mutation');
}

/**
 * Media failures only — successful presigns stay quiet (the
 * highest-frequency admin call; its success is uninteresting). op +
 * classified reason; thrown errors ride logError instead.
 */
export function logMediaFailure(
  log: RequestLogger,
  fields: { op: MediaFailureOp; reason: string }
): void {
  log.withMetadata({ evt: 'media_failure', op: fields.op, reason: fields.reason }).warn(
    'media failure'
  );
}

/** The confirmation email's attempt + Resend outcome (no customer PII). */
export function logEmail(
  log: RequestLogger,
  fields: { phase: EmailPhase; appointmentId: string; code?: string }
): void {
  const line = log.withMetadata({
    evt: 'email',
    phase: fields.phase,
    appointmentId: fields.appointmentId,
    ...(fields.code !== undefined ? { code: fields.code } : {}),
  });
  if (fields.phase === 'failed') {
    line.error('email failed');
  } else if (fields.phase === 'sent') {
    line.info('email sent');
  } else {
    line.info('email attempt');
  }
}

/**
 * The structured replacement for the root onError's console.error: one
 * error-class line per thrown error, with the request's method/route and
 * the error's name/message/stack. #184's Sentry capture rides this seam.
 */
export function logError(c: Context<RootEnv>, error: Error): void {
  c.get('logger')
    .withMetadata({
      evt: 'error',
      method: c.req.method,
      route: c.req.routePath.includes('*') ? c.req.path : c.req.routePath,
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    })
    .error('unhandled error');
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @sevendays/api test -- src/observability`
Expected: PASS — 1 file / 7 tests. Then `pnpm --filter @sevendays/api typecheck`
Expected: green (the shim types the subpath; the Context imports resolve).

- [ ] **Step 7: Gates + commit**

Run: `pnpm --filter @sevendays/api fix` then `pnpm --filter @sevendays/api test` (full suite — nothing else imports the module yet, so the count is **24 files passed + 1 skipped / 297 tests passed + 3 skipped**), then commit:

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/types/pino-browser.d.ts apps/api/src/observability/ apps/api/src/services/db.ts
git commit -m "feat(api): the observability module — loglayer/pino sink + the five event emitters (#183)"
```

---

### Task 2: requestId middleware + the root wiring + the closed CORS surface + `[observability]`

**Files:**
- Create: `apps/api/src/observability/request-context.ts`, `apps/api/test/application-log.test.ts`
- Modify: `apps/api/src/index.ts` (whole file), `apps/api/wrangler.toml` (the observability block), `apps/api/test/error-seam.test.ts` (two spy tests), `apps/api/test/media-routes.test.ts` (the ONE out-of-scope test absorbed — the pinned index.ts removes the `console.error` channel its assertion spies), `apps/api/src/observability/events.ts` (logError's route joins the wildcard fallback — same one-line change as the middleware)

**Interfaces:**
- Consumes: Task 1's `createRequestLogger`/`logAccess`/`logError`/`RequestLogger`/`RootEnv`, PLUS Task 1's ApiEnv growth (`logger: RequestLogger` already in `services/db.ts`'s Variables — do NOT re-edit that file).
- Produces (Tasks 3–5 + #184 consume): `requestLogging` (`MiddlewareHandler<RootEnv>` — mints the `requestId`, stores the child logger as `c.var.logger`, echoes `X-Request-Id` on every response incl. raw `Response` returns, emits the access line for every path except `/health` with the final status incl. onError-produced 500/503s); the root app drops `hono/cors` + `hono/logger` entirely; `wrangler.toml` enables Workers Logs.

**Not here:** mutation/media/email emitters at any route (Tasks 3–5); Sentry (#184); the `[observability]` block on any other app's wrangler.toml (the frontends ride #184).

- [ ] **Step 1: Write the failing integration tests**

Create `apps/api/test/application-log.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

// The Application Log seam: the sink writes one JSON string per event to
// console.log (Task 1's logger.ts) — capture exactly that, parse it, and
// assert against what `wrangler tail` would show.
const captureLines = () => {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(String(args[0]));
  });
  return lines;
};

const parse = (lines: string[]) =>
  lines
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((line): line is Record<string, unknown> => line !== null);

const byEvt = (lines: string[], evt: string) => parse(lines).filter((line) => line.evt === evt);

beforeEach(async () => {
  await truncateAll(db);
  await loadFixtures(db);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the access line + requestId contract (M6 #183)', () => {
  it('GET /api/v1/branches → exactly one access line with the ruled keys; requestId matches X-Request-Id; no actorId on a public route', async () => {
    const lines = captureLines();
    const res = await app.request('/api/v1/branches', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const requestId = res.headers.get('x-request-id');
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    const access = byEvt(lines, 'access');
    expect(access).toHaveLength(1);
    const [line] = access;
    if (!line) throw new Error('expected one access line');
    expect(Object.keys(line).sort()).toEqual([
      'durationMs',
      'evt',
      'level',
      'method',
      'msg',
      'requestId',
      'route',
      'status',
      'time',
    ]);
    expect(line.requestId).toBe(requestId);
    expect(line.method).toBe('GET');
    expect(line.route).toBe('/api/v1/branches');
    expect(line.status).toBe(200);
    expect(typeof line.durationMs).toBe('number');
    expect(parse(lines).every((parsed) => parsed.evt !== 'error')).toBe(true);
  });

  it('/health → NO access line (uptime-probe noise stays out), but the response still carries X-Request-Id', async () => {
    const lines = captureLines();
    const res = await app.request('/health', undefined, { DATABASE_URL: '' });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(parse(lines)).toEqual([]); // nothing at all — /health is silent
  });

  it('an unmounted path → an access line with status 404 and the raw path as route', async () => {
    const lines = captureLines();
    const res = await app.request('/nope', undefined, testEnv(url));
    expect(res.status).toBe(404);
    const [line] = byEvt(lines, 'access');
    if (!line) throw new Error('expected one access line');
    expect(line.status).toBe(404);
    expect(line.route).toBe('/nope'); // routePath is the wildcard /* when unmatched → the raw path stands in
  });

  it('a thrown handler error → an access line at 500 PLUS one error line, both keyed to the response header; the error class carries name/message/stack', async () => {
    const lines = captureLines();
    // Refused port: the per-request client builds fine, the handler's query
    // throws (the error-seam precedent — postgres.js fails in ~4-10ms).
    const res = await app.request('/api/v1/branches', undefined, {
      ...testEnv(url),
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
    });
    expect(res.status).toBe(500);
    const requestId = res.headers.get('x-request-id');
    const [access] = byEvt(lines, 'access');
    const [error] = byEvt(lines, 'error');
    if (!access || !error) throw new Error('expected one access + one error line');
    expect(access.status).toBe(500);
    expect(access.requestId).toBe(requestId);
    expect(error.requestId).toBe(requestId);
    expect(Object.keys(error).sort()).toEqual([
      'evt',
      'level',
      'message',
      'method',
      'msg',
      'name',
      'requestId',
      'route',
      'stack',
      'time',
    ]);
    expect(error.name).toBe('Error'); // drizzle 0.45.2 wraps the driver failure as DrizzleQueryError but its constructor never sets .name — the line's name reads 'Error'
    expect(String(error.message)).toMatch(/Failed query/); // the wrapper-identifying message; the raw cause rides .cause
    expect(typeof error.stack).toBe('string');
  });

  it('a session-gated read → the access line carries actorId (the verified session), keyed to the token owner', async () => {
    const lines = captureLines();
    const { token, userId } = await signUpSession(url, 'access-actor@sevendays.test');
    const res = await app.request('/api/v1/appointments', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200);
    const [line] = byEvt(lines, 'access');
    if (!line) throw new Error('expected one access line');
    expect(line.actorId).toBe(userId);
  });

  it('no ACAO header anywhere — the wildcard CORS middleware is gone (the closed surface, #176)', async () => {
    const ok = await app.request('/api/v1/branches', undefined, testEnv(url));
    const missing = await app.request('/nope', undefined, testEnv(url));
    for (const res of [ok, missing]) {
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Rewrite the two error-seam spy tests (count unchanged: 2) + absorb the one out-of-scope breakage**

In `apps/api/test/error-seam.test.ts`, replace the body of the describe `'uniform 500 envelope + logging'` (lines 41–65) with:

```ts
describe('uniform 500 envelope + structured error events', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns uniform 500 JSON when a handler/db error is thrown, and emits the error event', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    // FULL env (the schema requires RESEND_API_KEY/LANDING_ORIGIN too — a
    // bare env dies as ZodError in the acquisition middleware before any
    // query) + a refused port: postgres.js fails fast (~4-10ms), the
    // handler's query throws, drizzle-orm 0.45.2 wraps it as DrizzleQueryError.
    const res = await app.request('/api/v1/branches', undefined, {
      ...testEnv(url),
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
    const errorLines = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((line) => line.evt === 'error');
    expect(errorLines).toHaveLength(1);
    // DrizzleQueryError's message names the failing query (the raw cause
    // rides .cause); its constructor never sets .name, so the line's name
    // reads 'Error' — assert the wrapper-identifying message instead.
    expect(String(errorLines[0]?.message)).toMatch(/Failed query/);
    expect(errorLines[0]?.route).toBe('/api/v1/branches'); // matched route → the pattern
  });

  it('returns uniform 500 JSON when DATABASE_URL is missing (acquisition throws), and emits the error event', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    const res = await app.request('/api/v1/branches', undefined, { DATABASE_URL: '' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
    const errorLines = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((line) => line.evt === 'error');
    expect(errorLines).toHaveLength(1);
    expect(errorLines[0]?.name).toBe('ZodError'); // parseEnv rejects the partial env
    expect(errorLines[0]?.route).toBe('/api/v1/branches'); // wildcard routePath falls back to the raw path
  });
});
```

Then in `apps/api/test/media-routes.test.ts` (the ONE out-of-scope test this task must absorb — the pinned index.ts removes the `console.error('[api] …')` channel its assertion spies), replace the presign-503 test (`'fails presign with the curated 503 + the loud log when the S3-token pair is absent (leak-safe detail, #155)'`) with:

```ts
  it('fails presign with the curated 503 + the structured error event when the S3-token pair is absent (leak-safe detail, #155)', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    const { token } = await signUpSession(url, 'presign-nocreds@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'gallery-photo', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      { ...testEnv(url), ...MEDIA_VARS }
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Media uploads are not configured.' });
    // The loud detail rides the structured error event now (M6 #183): the
    // thrown MissingR2CredentialsError with name/route/requestId — the
    // response keeps the curated 503, the env names never leave the Worker.
    const errorLines = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((line) => line.evt === 'error');
    expect(errorLines).toHaveLength(1);
    expect(errorLines[0]?.name).toBe('MissingR2CredentialsError');
    expect(errorLines[0]?.route).toBe('/api/v1/admin/media/presign');
    expect(errorLines[0]?.requestId).toBe(res.headers.get('x-request-id'));
  });
```

- [ ] **Step 3: Run to verify the new/rewritten tests fail**

Run: `pnpm --filter @sevendays/api test -- test/application-log test/error-seam`
Expected: FAIL — the access/mutation assertions find no lines (the app still uses `hono/logger`'s `console.log` text lines, which do not JSON-parse; the spy filters drop them all), the header assertions get null, the error-seam assertions find no `evt: 'error'` lines.

- [ ] **Step 4: Write the middleware**

Create `apps/api/src/observability/request-context.ts`:

```ts
import type { MiddlewareHandler } from 'hono';
import { logAccess } from './events.js';
import { createRequestLogger, type RootEnv } from './logger.js';

// The requestId seam (M6 #183, spec § logging): one uuid minted per request,
// echoed as X-Request-Id on every response (quotable by any guest or staff
// member), and bound to the request-scoped child logger every event class
// emits through. The access line fires AFTER next() — Hono's compose runs
// onError at the deepest dispatch frame and sets context.res there, so this
// block sees the final status on success, 404, AND error paths (read from
// hono 4.13.5's dist/compose.js). /health is the one silent path: the header
// still rides the response, but no line is emitted (uptime-probe noise).
export const requestLogging: MiddlewareHandler<RootEnv> = async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('logger', createRequestLogger(requestId));
  c.header('x-request-id', requestId);
  const start = Date.now();
  await next();
  if (!c.res.headers.has('x-request-id')) {
    try {
      c.res.headers.set('x-request-id', requestId);
    } catch {
      // A raw Response with immutable headers (e.g. a fetched one) cannot be
      // mutated — the access line still carries the requestId.
    }
  }
  if (c.req.path !== '/health') {
    logAccess(c.get('logger'), {
      method: c.req.method,
      route: c.req.routePath.includes('*') ? c.req.path : c.req.routePath,
      status: c.res.status,
      durationMs: Date.now() - start,
      actorId: c.get('session')?.user.id,
    });
  }
};
```

- [ ] **Step 5: Verify the ApiEnv growth landed in Task 1 (no edit)**

`apps/api/src/services/db.ts` already carries `logger: RequestLogger` in ApiEnv's Variables (Task 1 Step 5 — moved here by the salvage ruling). Verify with `grep -n "logger: RequestLogger" apps/api/src/services/db.ts` — if absent, STOP and report NEEDS_CONTEXT. Do NOT edit the file.

- [ ] **Step 6: Rewrite index.ts (whole file, verbatim)**

Replace the entire contents of `apps/api/src/index.ts` with:

```ts
import { Hono } from 'hono';
import { logError } from './observability/events.js';
import { requestLogging } from './observability/request-context.js';
import type { RootEnv } from './observability/logger.js';
import { v1 } from './routes/v1.js';
import { internalError, serviceUnavailable } from './services/errors.js';
import { MissingR2CredentialsError } from './services/media.js';

const app = new Hono<RootEnv>()
  .use('*', requestLogging)
  // The CORS surface is CLOSED (M6 #183, ruling #176): the wildcard
  // middleware is dropped, not narrowed — no browser ever calls this api
  // (every frontend call is server-side over the API service binding,
  // ADR-0016; the browser never holds the bearer token), so browsers stay
  // default-denied, the true posture. If a browser-facing surface ever
  // appears (v2 embedding), CORS arrives WITH that surface. The one real
  // browser-CORS surface stays the R2 bucket's presign allowlist
  // (docs/media-bucket-runbook.md).

  // All body/query validation goes through the validated* helpers so failures
  // carry the uniform { error, details } shape — never raw zValidator.
  // See services/validator.ts.

  // Uniform error envelope (candidate D / ADR-0006): every thrown error — from
  // the versioned routes, the acquisition middleware, or any future handler —
  // lands here, emits ONE structured error event through the request's child
  // logger (name/message/stack + requestId — the wrangler-tail answer), and
  // returns the single 500 JSON shape. Health stays mounted outside v1, so a
  // db outage is visible as 500s while uptime monitoring still sees the Worker
  // up. #184's Sentry capture rides this same seam.
  .onError((error, c) => {
    logError(c, error);
    // Leak-safe detail channel (#155): the one deploy-time misconfiguration
    // operators must tell apart from generic infra failure answers a curated
    // 503 line; every other throw keeps the uniform 500. The loud detail
    // (secret names, runbook path) stays in the error event above — never
    // the response.
    if (error instanceof MissingR2CredentialsError) {
      return serviceUnavailable(c, 'Media uploads are not configured.');
    }
    return internalError(c);
  })

  // Uniform 404 envelope (closes the 404 half of the 404/405 ledger item):
  // every unmounted path — including under /api/v1 — returns the JSON shape,
  // never Hono's bare plain-text default (which would degrade the M2 api-client's
  // response inference to `unknown`).
  .notFound((c) => c.json({ error: 'Not found.' }, 404))

  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/api/v1', v1);

export default app;

// Hono RPC type-sharing (ADR-0006): the client package type-imports this —
// a route change here re-typechecks the client, which is the drift-kill
// working as intended. Types-only: erased at runtime.
export type AppType = typeof app;
```

- [ ] **Step 7: Enable Workers Logs in wrangler.toml**

In `apps/api/wrangler.toml`, insert directly after the `[images]` block (`binding = "IMAGES"` line):

```toml

# Workers Logs (M6 #183, spec § logging): the Application Log's sink —
# `wrangler tail` is the live viewer; 3-day retention accepted as v1's bar
# (Logpush stays off, paid-only). No head_sampling_rate: v1 traffic is far
# under any cap, every line rides.
[observability]
enabled = true
```

- [ ] **Step 8: Run the suites, then the bundle gate**

Run: `pnpm --filter @sevendays/api test -- test/application-log test/error-seam src/index.test`
Expected: PASS (index.test.ts's `/health` + versioning tests stay green — the middleware adds no env dependency).
Run: `pnpm --filter @sevendays/api test`
Expected: **25 files passed + 1 skipped (26) / 303 tests passed + 3 skipped** (290 baseline + 7 Task 1 + 6 here; error-seam's two rewrites keep their count).

Run the wrangler bundle gate (the real esbuild pass over the workerd target — proves the pino/browser + loglayer graph bundles clean without uploading):

```bash
pnpm --filter @sevendays/api exec wrangler deploy --dry-run --outdir ../../.superpowers/sdd/2026-10-05-183-api-application-log/evidence/bundle
```

Expected: exits 0, prints `--dry-run: exiting now.` with the bindings table (probed 2026-10-05 — works offline, no upload). Then `rm -rf .superpowers/sdd/2026-10-05-183-api-application-log/evidence/bundle` (the artifact is the gate, not the deliverable).

- [ ] **Step 9: Gates + commit**

Run: `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api build` (the AppType export is unchanged — api-client keeps typechecking), then commit:

```bash
git add apps/api/src/observability/request-context.ts apps/api/src/index.ts apps/api/wrangler.toml apps/api/test/application-log.test.ts apps/api/test/error-seam.test.ts apps/api/test/media-routes.test.ts apps/api/src/observability/events.ts
git commit -m "feat(api): requestId middleware + access/error events; CORS middleware dropped; Workers Logs enabled (#183)"
```

---

### Task 3: Admin-mutation events across the nine routers

**Files:**
- Create (test-first): `apps/api/test/admin-mutation-log.test.ts`
- Modify: all nine entity-router files under `apps/api/src/routes/` (23 handler sites — `admin-branches.ts`, `admin-print-sizes.ts`, `admin-attires.ts`, `admin-addon-services.ts`, `admin-studio-services.ts`, `admin-service-packages.ts`, `admin-gallery-categories.ts`, `admin-testimonials.ts`, `gallery-photos.ts`)

**Interfaces:**
- Consumes: Task 1's `logAdminMutation(c, { entity, entityId })` + Task 2's `c.get('logger')` typing.
- Produces: one `admin_mutation` event per committed CMS write (entity/entityId/actorId/method/route/requestId) — #185's Audit Log correlates to this line via requestId; a 400/401 emits none.

**Not here:** the media presign POST (writes nothing); gallery-photo create/update events land here but their commit-failure media events are Task 4; DELETE routes (none exist — #159 is M7).

- [ ] **Step 1: Write the failing tests**

Create `apps/api/test/admin-mutation-log.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const captureLines = () => {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(String(args[0]));
  });
  return lines;
};

const mutations = (lines: string[]) =>
  lines
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((line) => line.evt === 'admin_mutation');

const authed = async (method: string, path: string, email: string, body?: unknown) => {
  const { token } = await signUpSession(url, email);
  return app.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(url)
  );
};

// The atomic-save body (admin-packages.test.ts's save() shape, fixture ids):
// frames/inclusions ride so the save exercises the full transaction.
const packageSave = (overrides: Record<string, unknown> = {}) => ({
  name: 'Deluxe Package',
  description: 'The full graduation set.',
  priceCents: 150000,
  durationMinutes: null,
  isActive: true,
  isFeatured: false,
  frames: [{ id: 'frame-1' }],
  inclusions: [
    {
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: ids.printSize11x14,
      frameId: 'frame-1',
      attireIds: [ids.attireFilipiniana, ids.attireExecutive],
      description: 'The framed 11x14',
    },
    {
      kind: 'print',
      quantity: 4,
      printSizeId: ids.printSize2R,
      attireIds: [ids.attireToga],
      description: null,
    },
  ],
  ...overrides,
});

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin_mutation events (M6 #183 — one per committed CMS write)', () => {
  it('POST branches → exactly one line: ruled keys, entity, entityId = the created row, actorId = the session owner', async () => {
    const lines = captureLines();
    // ONE session for both the POST and the actorId assertion — the event's
    // actor is whoever made the call.
    const { token, userId } = await signUpSession(url, 'mut-branch@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'Fifth Branch', address: '5 New St', phone: '+63 900 000 005' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: string };
    const events = mutations(lines);
    expect(events).toHaveLength(1);
    const [line] = events;
    if (!line) throw new Error('expected one mutation line');
    expect(Object.keys(line).sort()).toEqual([
      'actorId',
      'entity',
      'entityId',
      'evt',
      'level',
      'method',
      'msg',
      'requestId',
      'route',
      'time',
    ]);
    expect(line.entity).toBe('branch');
    expect(line.entityId).toBe(created.id);
    expect(line.actorId).toBe(userId);
    expect(line.method).toBe('POST');
    expect(line.route).toBe('/api/v1/admin/branches');
  });

  it('PUT branches → the line carries the param id and the :id route pattern', async () => {
    const lines = captureLines();
    const created = await authed('POST', '/api/v1/admin/branches', 'mut-put-a@sevendays.test', {
      name: 'Sixth Branch',
      address: '6 New St',
      phone: '+63 900 000 006',
    });
    const { id } = (await created.json()) as { id: string };
    const res = await authed(
      'PUT',
      `/api/v1/admin/branches/${id}`,
      'mut-put-b@sevendays.test',
      { name: 'Sixth Branch', address: '6B St', phone: '+63 900 000 006', isActive: false }
    );
    expect(res.status).toBe(200);
    const putLines = mutations(lines).filter((line) => line.method === 'PUT');
    expect(putLines).toHaveLength(1);
    expect(putLines[0]?.entityId).toBe(id);
    expect(putLines[0]?.route).toBe('/api/v1/admin/branches/:id');
  });

  it('a 400 (duplicate name) emits NO mutation line — only the write model\'s successes record', async () => {
    const lines = captureLines();
    const res = await authed('POST', '/api/v1/admin/branches', 'mut-dup@sevendays.test', {
      name: 'Test Branch A', // fixture name — the uniqueness collision
      address: 'X St',
      phone: '+63 900 000 000',
    });
    expect(res.status).toBe(400);
    expect(mutations(lines)).toEqual([]);
  });

  it('a 401 (anonymous) emits NO mutation line', async () => {
    const lines = captureLines();
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Nope', address: 'X', phone: 'y' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(mutations(lines)).toEqual([]);
  });

  it('the studio-service branch-matrix PUT → one line with the :id/branches pattern and the service id', async () => {
    const lines = captureLines();
    const created = await authed(
      'POST',
      '/api/v1/admin/studio-services',
      'mut-matrix-a@sevendays.test',
      { name: 'Photo Recovery', description: 'Recover old photos', priceCents: 5000 }
    );
    const { id } = (await created.json()) as { id: string };
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${id}/branches`,
      'mut-matrix-b@sevendays.test',
      { branchIds: [ids.branchA] }
    );
    expect(res.status).toBe(200);
    const matrixLines = mutations(lines).filter((line) => line.method === 'PUT');
    expect(matrixLines).toHaveLength(1);
    expect(matrixLines[0]?.entity).toBe('studio-service');
    expect(matrixLines[0]?.entityId).toBe(id);
    expect(matrixLines[0]?.route).toBe('/api/v1/admin/studio-services/:id/branches');
  });

  it('the atomic package save → exactly ONE line (request-grain, not per DB row)', async () => {
    const lines = captureLines();
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'mut-pkg@sevendays.test',
      packageSave()
    );
    expect(res.status).toBe(201);
    const events = mutations(lines);
    expect(events).toHaveLength(1);
    expect(events[0]?.entity).toBe('service-package');
  });

  it('the gallery-category order PUT → one line with entityId null (the family, not a row)', async () => {
    const lines = captureLines();
    const a = await authed('POST', '/api/v1/admin/gallery-categories', 'mut-cat-a@sevendays.test', {
      name: 'Ceremony',
    });
    const b = await authed('POST', '/api/v1/admin/gallery-categories', 'mut-cat-b@sevendays.test', {
      name: 'Reception',
    });
    const catA = ((await a.json()) as { id: string }).id;
    const catB = ((await b.json()) as { id: string }).id;
    const res = await authed(
      'PUT',
      '/api/v1/admin/gallery-categories/order',
      'mut-cat-order@sevendays.test',
      { categoryIds: [catB, catA] }
    );
    expect(res.status).toBe(200);
    const orderLines = mutations(lines).filter((line) => line.route?.endsWith('/order'));
    expect(orderLines).toHaveLength(1);
    expect(orderLines[0]?.entity).toBe('gallery-category');
    expect(orderLines[0]?.entityId).toBeNull();
  });

  it('every remaining entity family emits with its own entity name', async () => {
    const lines = captureLines();
    const ps = await authed('POST', '/api/v1/admin/print-sizes', 'mut-ps@sevendays.test', {
      code: '9x12',
      description: 'Nine by twelve',
    });
    const at = await authed('POST', '/api/v1/admin/attires', 'mut-at@sevendays.test', {
      name: 'Barong',
    });
    const ad = await authed(
      'POST',
      '/api/v1/admin/addon-services',
      'mut-ad@sevendays.test',
      { name: 'Hair Spray', description: 'Hold that updo', priceCents: 3000 }
    );
    const te = await authed('POST', '/api/v1/admin/testimonials', 'mut-te@sevendays.test', {
      quote: 'Wonderful shoot!',
      person: 'Ana R.',
    });
    expect([ps.status, at.status, ad.status, te.status]).toEqual([201, 201, 201, 201]);
    const entities = mutations(lines).map((line) => line.entity).sort();
    expect(entities).toEqual(['addon-service', 'attire', 'print-size', 'testimonial']);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/admin-mutation-log`
Expected: FAIL — every `mutations(lines)` expectation finds zero lines (no route emits yet; the 401/400 tests PASS already — their assertions hold trivially, note that in the run output).

- [ ] **Step 3: Wire the emitter into the routers**

Every router file gets this import (biome orders it; content verbatim):

```ts
import { logAdminMutation } from '../observability/events.js';
```

Then one insertion per successful mutation return. The exemplar — `apps/api/src/routes/admin-branches.ts` in full (the other files take the same one-line insertion at the same structural spot; the per-file table below pins each `entity` and `entityId` expression):

```ts
import { createBranchSchema, updateBranchSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { logAdminMutation } from '../observability/events.js';
import {
  createAdminBranch,
  getAdminBranch,
  listAdminBranches,
  updateAdminBranch,
} from '../services/admin-entities.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. Mounted
// behind routes/admin.ts's ONE requireSession: the uniform 401 envelope
// precedes every validator here (per-family proof: test/admin-entities.test.ts).
// validatedParam runs before validatedJson — path before body; both answer
// the uniform { error, details } 400. One admin_mutation event per committed
// write (M6 #183) — emitted only after result.ok, so 400/401 paths stay
// silent.
export const adminBranches = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminBranches(c.get('db')));
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminBranch(c.get('db'), id);
    if (!row) {
      return notFound(c, 'Branch not found.');
    }
    return c.json(row);
  })
  .post('/', validatedJson(createBranchSchema), async (c) => {
    const result = await createAdminBranch(c.get('db'), c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'branch', entityId: result.row.id });
    return c.json(result.row, 201);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateBranchSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminBranch(c.get('db'), id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Branch not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      logAdminMutation(c, { entity: 'branch', entityId: result.row.id });
      return c.json(result.row);
    }
  );
```

For each remaining file, insert the import above, then insert the single emitter line immediately BEFORE the handler's final success return (each old/new pair is exact — `result`/`row` names verified against the current sources):

| File | Handler | Insert before | Line to insert |
|---|---|---|---|
| `admin-print-sizes.ts` | POST `/` | `return c.json(result.row, 201);` | `logAdminMutation(c, { entity: 'print-size', entityId: result.row.id });` |
| `admin-print-sizes.ts` | PUT `/:id` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'print-size', entityId: result.row.id });` |
| `admin-attires.ts` | POST `/` | `return c.json(result.row, 201);` | `logAdminMutation(c, { entity: 'attire', entityId: result.row.id });` |
| `admin-attires.ts` | PUT `/:id` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'attire', entityId: result.row.id });` |
| `admin-addon-services.ts` | POST `/` | `return c.json(result.row, 201);` | `logAdminMutation(c, { entity: 'addon-service', entityId: result.row.id });` |
| `admin-addon-services.ts` | PUT `/:id` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'addon-service', entityId: result.row.id });` |
| `admin-testimonials.ts` | POST `/` | `return c.json(result.row, 201);` | `logAdminMutation(c, { entity: 'testimonial', entityId: result.row.id });` |
| `admin-testimonials.ts` | PUT `/order` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'testimonial', entityId: null });` |
| `admin-testimonials.ts` | PUT `/:id` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'testimonial', entityId: result.row.id });` |
| `admin-studio-services.ts` | POST `/` | `return c.json(result.row, 201);` | `logAdminMutation(c, { entity: 'studio-service', entityId: result.row.id });` |
| `admin-studio-services.ts` | PUT `/:id` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'studio-service', entityId: result.row.id });` |
| `admin-studio-services.ts` | PUT `/:id/branches` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'studio-service', entityId: id });` |
| `admin-studio-services.ts` | PUT `/:id/addons` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'studio-service', entityId: id });` |
| `admin-service-packages.ts` | POST `/` | `return c.json(result.row, 201);` | `logAdminMutation(c, { entity: 'service-package', entityId: result.row.id });` |
| `admin-service-packages.ts` | PUT `/:id` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'service-package', entityId: result.row.id });` |
| `admin-gallery-categories.ts` | POST `/` | `return c.json(result.row, 201);` | `logAdminMutation(c, { entity: 'gallery-category', entityId: result.row.id });` |
| `admin-gallery-categories.ts` | PUT `/order` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'gallery-category', entityId: null });` |
| `admin-gallery-categories.ts` | PUT `/:id` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'gallery-category', entityId: result.row.id });` |
| `gallery-photos.ts` | POST `/` | `return c.json(result.row, 201);` | `logAdminMutation(c, { entity: 'gallery-photo', entityId: result.row.id });` |
| `gallery-photos.ts` | PUT `/order` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'gallery-photo', entityId: null });` |
| `gallery-photos.ts` | PUT `/:id` | `return c.json(result.row);` | `logAdminMutation(c, { entity: 'gallery-photo', entityId: result.row.id });` |

Each PUT `/:id` and PUT `/order` handler has exactly one `return c.json(result.row);` success return, and each POST exactly one `return c.json(result.row, 201);` — the insertion point is unambiguous per handler (if a file's structure differs from the recon, STOP and report rather than guessing).

- [ ] **Step 4: Run the suite**

Run: `pnpm --filter @sevendays/api test -- test/admin-mutation-log`
Expected: PASS — 8 tests (the two negative tests were already green).

- [ ] **Step 5: Gates + commit**

Run: `pnpm --filter @sevendays/api test`
Expected: **26 files passed + 1 skipped (27) / 311 tests passed + 3 skipped** (303 + 8; every pre-existing admin suite stays green — the emitter only adds lines, no response changes).
Run: `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api typecheck`, then commit:

```bash
git add apps/api/src/routes/ apps/api/test/admin-mutation-log.test.ts
git commit -m "feat(api): admin-mutation events across the nine routers (#183)"
```

---

### Task 4: Media failure events — presign, commit, thumbnail

**Files:**
- Modify: `apps/api/src/routes/admin-media.ts` (whole file), `apps/api/src/routes/gallery-photos.ts` (two edits), `apps/api/src/routes/admin-service-packages.ts` (two call-site edits), `apps/api/src/services/admin-gallery.ts` (three signatures), `apps/api/src/services/admin-packages.ts` (three signatures), `apps/api/test/media-routes.test.ts` (one rewrite + two new), `apps/api/test/admin-mutation-log.test.ts` (two new)

**Interfaces:**
- Consumes: Task 1's `logMediaFailure(log, { op, reason })` + Task 2's `c.get('logger')`.
- Produces: `media_failure` events at the three seams — presign (the route catches `MissingR2CredentialsError`, emits, rethrows), commit (the two module-private helpers `commitStagingKey` / `resolveCover` emit on `commitUpload`'s typed failures; the logger threads through their four exported callers as an optional last param), thumbnail (the route's null path). Thrown media-path errors ride the error class (Task 2's onError) — the enumerated media events cover the typed/observable failures only. Service signature growth (optional `log?: RequestLogger` last param): `createAdminGalleryPhoto(db, env, input, log?)`, `updateAdminGalleryPhoto(db, env, id, input, log?)`, `createAdminPackage(db, env, input, log?)`, `updateAdminPackage(db, env, id, input, log?)`.

**Not here:** successful presigns/commits stay event-free; the R2 bucket's own CORS allowlist (bucket config, not api code); the Audit Log's media-commit row (#185 — it rides the same four signatures later, threading its own context).

- [ ] **Step 1: Write the failing tests**

In `apps/api/test/media-routes.test.ts`, replace the body of the presign-503 test (`'fails presign with the curated 503 + the structured error event when the S3-token pair is absent (leak-safe detail, #155)'` — landed in Task 2's salvage; grep by title, the line number has shifted) with:

```ts
  it('fails presign with the curated 503 + the presign media_failure and error events when the S3-token pair is absent (leak-safe detail, #155)', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    const { token } = await signUpSession(url, 'presign-nocreds@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'gallery-photo', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      { ...testEnv(url), ...MEDIA_VARS }
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Media uploads are not configured.' });
    const parsed = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const media = parsed.filter((line) => line.evt === 'media_failure');
    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({ op: 'presign', reason: 'missing_credentials' });
    expect(media[0]?.requestId).toBe(res.headers.get('x-request-id'));
    // The thrown MissingR2CredentialsError rides the error class (one line).
    const errors = parsed.filter((line) => line.evt === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.name).toBe('MissingR2CredentialsError');
  });
```

Then append two tests at the end of the same `describe('POST /api/v1/admin/media/presign', …)` block:

```ts
  it('a successful presign stays QUIET — no media event at all (the highest-frequency admin call)', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    const { token } = await signUpSession(url, 'presign-quiet@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'package-cover', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      withCreds()
    );
    expect(res.status).toBe(200);
    const parsed = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(parsed.filter((line) => line.evt === 'media_failure')).toEqual([]);
    expect(parsed.filter((line) => line.evt === 'access')).toHaveLength(1);
  });
```

And in the thumb `describe`, append:

```ts
  it('an unknown photo id → the 404 PLUS the thumbnail media_failure line', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    const { token } = await signUpSession(url, 'thumb-evt@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000/thumb',
      { headers: bearer(token) },
      withCreds()
    );
    expect(res.status).toBe(404);
    const media = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((line) => line.evt === 'media_failure');
    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({ op: 'thumbnail', reason: 'not_found' });
    expect(media[0]?.requestId).toBe(res.headers.get('x-request-id'));
  });
```

Also add one assertion to the EXISTING webp test (`'serves the transformed variant — width-capped webp from the Images binding (≤20 MB input)'`, line 220) — after `expect(res.status).toBe(200);`:

```ts
    // The raw-Response path (no c.json prepared-header merge) still gets the
    // echoed requestId from the middleware's post-next() header set.
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
```

In `apps/api/test/admin-mutation-log.test.ts`, add to the imports:

```ts
import { stubCommitBucket } from './helpers/r2-stub.js';
```

and append a new describe at the end of the file:

```ts
describe('the gallery-photo commit seam (media_failure × commit + the photo mutation line)', () => {
  const STAGING = 'tmp/00000000-0000-4000-8000-000000000009.jpg';

  it('POST with a foreign key → 400, a media_failure {op: commit, reason: foreign_key}, and NO mutation line', async () => {
    const lines = captureLines();
    const res = await authed(
      'POST',
      '/api/v1/admin/gallery-photos',
      'mut-photo-fk@sevendays.test',
      { r2Key: 'gallery/00000000-0000-4000-8000-000000000000.jpg' }
    );
    expect(res.status).toBe(400);
    const parsed = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const media = parsed.filter((line) => line.evt === 'media_failure');
    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({ op: 'commit', reason: 'foreign_key' });
    expect(parsed.filter((line) => line.evt === 'admin_mutation')).toEqual([]);
  });

  it('POST with a staged object (stubbed bucket) → 201 and the gallery-photo mutation line', async () => {
    const lines = captureLines();
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'mut-photo-ok@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/gallery-photos',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ r2Key: STAGING, title: 'Evt portrait', caption: null }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(201);
    const events = mutations(lines);
    expect(events).toHaveLength(1);
    expect(events[0]?.entity).toBe('gallery-photo');
    expect(lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((line) => line.evt === 'media_failure')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/media-routes test/admin-mutation-log`
Expected: FAIL — the media_failure assertions find zero lines; the rewritten 503 test fails at `expect(media).toHaveLength(1)`; the x-request-id assert on the webp test gets null; the two new admin-mutation-log tests fail on their event assertions.

- [ ] **Step 3: Wire the routes**

Replace the entire contents of `apps/api/src/routes/admin-media.ts` with:

```ts
import { mediaPresignRequestSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { logMediaFailure } from '../observability/events.js';
import type { ApiEnv } from '../services/db.js';
import { MissingR2CredentialsError, presignUpload } from '../services/media.js';
import { validatedJson } from '../services/validator.js';

// POST /presign (M5 #136, ADR-0019): purpose + contentType in → a server-
// assigned staging key + a type-enforced upload URL out. Size is not
// declarable (the schema has no such field); the commit is the size gate.
// Failure map: validator 400 (unsupported type, with field details) |
// MissingR2CredentialsError → the curated 503 via the root onError (#155:
// leak-safe detail channel — the loud message stays in the error event).
// Mounted behind the admin root's requireSession — see routes/admin.ts.
// M6 #183: presign FAILURES log a media_failure event (successful presigns
// stay quiet — the highest-frequency admin call); the throw still rides to
// onError for the curated 503 + the error event.
export const adminMedia = new Hono<ApiEnv>().post(
  '/presign',
  validatedJson(mediaPresignRequestSchema),
  async (c) => {
    try {
      return c.json(await presignUpload(c.env, c.req.valid('json')));
    } catch (error) {
      if (error instanceof MissingR2CredentialsError) {
        logMediaFailure(c.get('logger'), { op: 'presign', reason: 'missing_credentials' });
      }
      throw error;
    }
  }
);
```

In `apps/api/src/routes/gallery-photos.ts`, extend the observability import Task 3 added — from:

```ts
import { logAdminMutation } from '../observability/events.js';
```

to:

```ts
import { logAdminMutation, logMediaFailure } from '../observability/events.js';
```

Change the thumb handler's null path from:

```ts
    const response = await servePhotoThumbnail(db, c.env, id);
    if (!response) {
      return notFound(c, 'Photo not found.');
    }
```

to:

```ts
    const response = await servePhotoThumbnail(db, c.env, id);
    if (!response) {
      logMediaFailure(c.get('logger'), { op: 'thumbnail', reason: 'not_found' });
      return notFound(c, 'Photo not found.');
    }
```

And pass the logger at the two commit-riding call sites — from:

```ts
    const result = await createAdminGalleryPhoto(c.get('db'), c.env, c.req.valid('json'));
```

to:

```ts
    const result = await createAdminGalleryPhoto(c.get('db'), c.env, c.req.valid('json'), c.get('logger'));
```

and from:

```ts
      const result = await updateAdminGalleryPhoto(c.get('db'), c.env, id, c.req.valid('json'));
```

to:

```ts
      const result = await updateAdminGalleryPhoto(c.get('db'), c.env, id, c.req.valid('json'), c.get('logger'));
```

In `apps/api/src/routes/admin-service-packages.ts`, the same two call-site edits: `createAdminPackage(c.get('db'), c.env, c.req.valid('json'))` → `createAdminPackage(c.get('db'), c.env, c.req.valid('json'), c.get('logger'))`, and `updateAdminPackage(c.get('db'), c.env, id, c.req.valid('json'))` → `updateAdminPackage(c.get('db'), c.env, id, c.req.valid('json'), c.get('logger'))`.

- [ ] **Step 4: Thread the logger through the two commit helpers**

In `apps/api/src/services/admin-gallery.ts`: add the imports:

```ts
import { logMediaFailure } from '../observability/events.js';
import type { RequestLogger } from '../observability/logger.js';
```

Change `commitStagingKey`'s signature and failure branch from:

```ts
async function commitStagingKey(
  env: PhotoEnv,
  stagingKey: string
): Promise<{ ok: true; finalKey: string } | AdminWriteFailure> {
  const commit = await commitUpload(env.MEDIA_BUCKET, { stagingKey, purpose: 'gallery-photo' });
  if (!commit.ok) {
    return {
```

to:

```ts
async function commitStagingKey(
  env: PhotoEnv,
  stagingKey: string,
  log?: RequestLogger
): Promise<{ ok: true; finalKey: string } | AdminWriteFailure> {
  const commit = await commitUpload(env.MEDIA_BUCKET, { stagingKey, purpose: 'gallery-photo' });
  if (!commit.ok) {
    // M6 #183: the commit seam's typed failure — one media_failure event
    // (reason is commitUpload's vocabulary: foreign_key | not_found |
    // cap_violation). Emitted HERE, not at the route: 'conflict' at the
    // route level conflates this with uniqueness collisions.
    if (log) {
      logMediaFailure(log, { op: 'commit', reason: commit.reason });
    }
    return {
```

and the two exported signatures + their forwarding calls:

```ts
export async function createAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  input: CreateGalleryPhotoInput,
  log?: RequestLogger
): Promise<AdminCreateResult<GalleryPhoto>> {
```

(changing its `const commit = await commitStagingKey(env, input.r2Key);` to `const commit = await commitStagingKey(env, input.r2Key, log);`), and:

```ts
export async function updateAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  id: string,
  input: UpdateGalleryPhotoInput,
  log?: RequestLogger
): Promise<AdminWriteResult<GalleryPhoto>> {
```

(changing its `const commit = await commitStagingKey(env, input.r2Key);` to `const commit = await commitStagingKey(env, input.r2Key, log);`).

In `apps/api/src/services/admin-packages.ts`: same two imports, then `resolveCover` from:

```ts
async function resolveCover(
  env: SaveEnv,
  key: string | null | undefined
): Promise<CoverResolution> {
  if (key === undefined) return { ok: true, finalKey: undefined };
  if (key === null) return { ok: true, finalKey: null };
  const commit = await commitUpload(env.MEDIA_BUCKET, {
    stagingKey: key,
    purpose: 'package-cover',
  });
  if (!commit.ok) {
    return {
```

to:

```ts
async function resolveCover(
  env: SaveEnv,
  key: string | null | undefined,
  log?: RequestLogger
): Promise<CoverResolution> {
  if (key === undefined) return { ok: true, finalKey: undefined };
  if (key === null) return { ok: true, finalKey: null };
  const commit = await commitUpload(env.MEDIA_BUCKET, {
    stagingKey: key,
    purpose: 'package-cover',
  });
  if (!commit.ok) {
    // M6 #183: the cover-commit seam's typed failure (see admin-gallery's
    // commitStagingKey — the route-level 'conflict' cannot name it).
    if (log) {
      logMediaFailure(log, { op: 'commit', reason: commit.reason });
    }
    return {
```

and the two exported signatures + forwarding (`resolveCover(env, input.coverImageKey)` → `resolveCover(env, input.coverImageKey, log)` in both):

```ts
export async function createAdminPackage(
  db: Database,
  env: SaveEnv,
  input: CreateServicePackageInput,
  log?: RequestLogger
): Promise<AdminCreateResult<ServicePackageRead>> {
```

```ts
export async function updateAdminPackage(
  db: Database,
  env: SaveEnv,
  id: string,
  input: UpdateServicePackageInput,
  log?: RequestLogger
): Promise<AdminWriteResult<ServicePackageRead>> {
```

- [ ] **Step 5: Run the suites**

Run: `pnpm --filter @sevendays/api test -- test/media-routes test/admin-mutation-log test/admin-gallery test/admin-packages`
Expected: PASS — the four new/rewritten event tests green; the pre-existing admin-gallery/admin-packages suites unchanged (the optional param breaks no caller).

- [ ] **Step 6: Gates + commit**

Run: `pnpm --filter @sevendays/api test`
Expected: **26 files passed + 1 skipped (27) / 315 tests passed + 3 skipped** (311 + 4: two media-routes new + two admin-mutation-log new; the 503 rewrite and the webp-test assertion keep their counts).
Run: `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api typecheck`, then commit:

```bash
git add apps/api/src/routes/admin-media.ts apps/api/src/routes/gallery-photos.ts apps/api/src/routes/admin-service-packages.ts apps/api/src/services/admin-gallery.ts apps/api/src/services/admin-packages.ts apps/api/test/media-routes.test.ts apps/api/test/admin-mutation-log.test.ts
git commit -m "feat(api): media failure events — presign/commit/thumbnail seams (#183)"
```

---

### Task 5: Email events — attempt + Resend outcome — and the PII sweep

**Files:**
- Modify: `apps/api/src/services/confirmation-email.ts`, `apps/api/src/routes/appointments.ts` (one line), `apps/api/test/appointments.test.ts` (two rewrites + two new)

**Interfaces:**
- Consumes: Task 1's `logEmail(log, { phase, appointmentId, code? })` + `RequestLogger`; Task 2's `c.get('logger')`.
- Produces: `scheduleConfirmationEmail(executionCtx, env, db, record, log: RequestLogger)` (was 4 params — the logger is REQUIRED, every caller updated in the same task); `sendConfirmationEmail(env, db, record, log: RequestLogger)`; exported `class ResendRejectionError extends Error` with `readonly rejectionName: string` (the classified code's source — `resend:<rejectionName>`; #184's Sentry capture can read the original off the throw site). Email events: `attempt` before the SDK send, `sent` after success, `failed` (with classified `code`, never a free-text message) from the waitUntil catch.

**Not here:** Sentry capture of the send failure (#184); any change to the pure builder half or its unit suite (`src/services/confirmation-email.test.ts` — untouched); the email's copy or the Resend wire contract.

- [ ] **Step 1: Write the failing tests**

In `apps/api/test/appointments.test.ts`, inside the existing `describe('POST /api/v1/appointments — confirmation email (ticket 09)', …)` block: replace the two spy tests (lines 746–773, `'a typed Resend failure never fails the booking (logged, 201 stands)'` and `'a thrown send failure never fails the booking either (logged, 201 stands)'`) with:

```ts
  it('a typed Resend failure never fails the booking — the failed email event with the classified code, 201 stands', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    // The SDK's REAL failure shape: it resolves { data: null, error } — it
    // does not throw (resend@6 Response contract).
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'internal error', statusCode: 500, name: 'internal_server_error' },
    });
    const ctx = fakeExecCtx();
    const res = await postBooking(ctx);
    expect(res.status).toBe(201);
    const created = await res.json();
    await Promise.all(ctx.promises);
    const failed = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((line) => line.evt === 'email' && line.phase === 'failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({
      appointmentId: created.id,
      code: 'resend:internal_server_error',
    });
    expect(failed[0]?.requestId).toBe(res.headers.get('x-request-id'));
  });

  it('a thrown send failure never fails the booking either — code send_failed, 201 stands', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    sendMock.mockRejectedValue(new Error('network down'));
    const ctx = fakeExecCtx();
    const res = await postBooking(ctx);
    expect(res.status).toBe(201);
    await Promise.all(ctx.promises);
    const failed = lines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((line) => line.evt === 'email' && line.phase === 'failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ code: 'send_failed' });
  });
```

and append two new tests at the end of the same describe:

```ts
  it('email attempt + sent events ride the booking request (appointmentId + the request\'s requestId)', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    const ctx = fakeExecCtx();
    const res = await postBooking(ctx);
    expect(res.status).toBe(201);
    const created = await res.json();
    await Promise.all(ctx.promises);
    const parsed = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const emailLines = parsed.filter((line) => line.evt === 'email');
    expect(emailLines).toHaveLength(2); // attempt, then sent — nothing else
    expect(emailLines[0]).toMatchObject({ phase: 'attempt', appointmentId: created.id });
    expect(emailLines[1]).toMatchObject({ phase: 'sent', appointmentId: created.id });
    const requestId = res.headers.get('x-request-id');
    expect(emailLines.every((line) => line.requestId === requestId)).toBe(true);
    const access = parsed.find((line) => line.evt === 'access');
    expect(access?.requestId).toBe(requestId);
    expect(access?.route).toBe('/api/v1/appointments');
  });

  it('PII sweep: a booking carrying customer email/phone + UA + x-forwarded-for leaves NONE of them in any line, and every line fits the five schemas', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    const email = 'pii-sweep-customer@sevendays.test';
    const phone = '+63 917 555 0199';
    const ctx = fakeExecCtx();
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ customerEmail: email, customerPhone: phone })),
        headers: {
          'content-type': 'application/json',
          'user-agent': 'pii-sweep-agent/1.0',
          'x-forwarded-for': '203.0.113.7',
        },
      },
      testEnv(url),
      ctx
    );
    expect(res.status).toBe(201);
    await Promise.all(ctx.promises);
    expect(lines.length).toBeGreaterThan(0);
    // (a) none of the carried values appear anywhere in the raw stream
    const raw = lines.join('\n');
    for (const forbidden of [email, phone, 'pii-sweep-agent', '203.0.113.7']) {
      expect(raw.includes(forbidden)).toBe(false);
    }
    // (b) every line's key set is within the five enumerated schemas
    const allowed = new Set([
      'time',
      'level',
      'msg',
      'requestId',
      'evt',
      'method',
      'route',
      'status',
      'durationMs',
      'actorId',
      'entity',
      'entityId',
      'op',
      'reason',
      'phase',
      'appointmentId',
      'code',
      'name',
      'message',
      'stack',
    ]);
    for (const line of lines) {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      for (const key of Object.keys(parsed)) {
        expect(allowed.has(key)).toBe(true);
      }
    }
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/appointments`
Expected: FAIL at runtime — the four email-event tests find zero `evt: 'email'` lines (the route still runs the old seam: `scheduleConfirmationEmail` takes no logger, its failures log `console.error`, and the typed rejection throws the old generic Error). The PII sweep may already pass pre-change (no PII leaks today either) — it is the REGRESSION lock for the new seam and turns load-bearing the moment Step 3 lands; note the run output honestly.

- [ ] **Step 3: Rework the confirmation-email seam**

In `apps/api/src/services/confirmation-email.ts`: add the imports (beside the existing `../env.js` one):

```ts
import { logEmail } from '../observability/events.js';
import type { RequestLogger } from '../observability/logger.js';
```

Add the typed rejection class directly above `scheduleConfirmationEmail` (in the send-half section):

```ts
/**
 * resend@6's typed failure, reified: the SDK resolves { data, error } and
 * never throws, so the error branch THROWS this instead — the waitUntil
 * catch can classify the email event's code (`resend:<rejectionName>`)
 * without ever logging resend's free-text message (which may echo the
 * recipient address — the PII floor). #184's Sentry capture reads the
 * original error off the send seam.
 */
export class ResendRejectionError extends Error {
  readonly rejectionName: string;

  constructor(rejectionName: string) {
    super(`resend rejected the send (${rejectionName})`);
    this.name = 'ResendRejectionError';
    this.rejectionName = rejectionName;
  }
}
```

Change `scheduleConfirmationEmail` from:

```ts
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
```

to:

```ts
export function scheduleConfirmationEmail(
  executionCtx: ConfirmationEmailScheduler,
  env: Env,
  db: Database,
  record: AppointmentWithAddons,
  log: RequestLogger
): void {
  executionCtx.waitUntil(
    sendConfirmationEmail(env, db, record, log).catch((error: unknown) => {
      // Email failure = booking stands; the failed event carries a
      // CLASSIFIED code, never the error's free text (resend messages may
      // echo the recipient — the PII floor; the loud detail is #184's
      // Sentry capture at this same seam).
      logEmail(log, {
        phase: 'failed',
        appointmentId: record.id,
        code: error instanceof ResendRejectionError ? `resend:${error.rejectionName}` : 'send_failed',
      });
    })
  );
}
```

And `sendConfirmationEmail` from:

```ts
export async function sendConfirmationEmail(
  env: Env,
  db: Database,
  record: AppointmentWithAddons
): Promise<void> {
```

to:

```ts
export async function sendConfirmationEmail(
  env: Env,
  db: Database,
  record: AppointmentWithAddons,
  log: RequestLogger
): Promise<void> {
```

with two edits inside its body — before the SDK call (after the `const email = buildConfirmationEmail({...});` block):

```ts
  logEmail(log, { phase: 'attempt', appointmentId: record.id });
```

and the typed-failure throw + success line, replacing:

```ts
  const result = await new Resend(env.RESEND_API_KEY).emails.send(email, {
    idempotencyKey: `booking-confirm/${record.id}`,
  });
  if (result.error) {
    throw new Error(`resend rejected the send (${result.error.name}): ${result.error.message}`);
  }
}
```

with:

```ts
  const result = await new Resend(env.RESEND_API_KEY).emails.send(email, {
    idempotencyKey: `booking-confirm/${record.id}`,
  });
  if (result.error) {
    throw new ResendRejectionError(result.error.name);
  }
  logEmail(log, { phase: 'sent', appointmentId: record.id });
}
```

Finally update the route's call site in `apps/api/src/routes/appointments.ts` from:

```ts
    scheduleConfirmationEmail(c.executionCtx, c.env, db, result.record);
```

to:

```ts
    scheduleConfirmationEmail(c.executionCtx, c.env, db, result.record, c.get('logger'));
```

- [ ] **Step 4: Run the suites**

Run: `pnpm --filter @sevendays/api test -- test/appointments src/services/confirmation-email.test`
Expected: PASS — the four email-event tests green (two rewrites + two new), the builder unit suite untouched, every other appointments test green (the send-mock harness is unchanged — only the surrounding events are new).

- [ ] **Step 5: Gates + commit**

Run: `pnpm --filter @sevendays/api test`
Expected: **26 files passed + 1 skipped (27) / 317 tests passed + 3 skipped** (315 + 2; the two rewrites keep their count). The repo's last `console.error` CALL in src is gone — verify: `grep -rn "console\.error" apps/api/src --include='*.ts'` returns no call sites (a JSDoc mention in events.ts describing the replacement is fine; the pino sink's `console.log` in logger.ts is the intentional seam, which is why the original `console\.` pattern was wrong — Task 5 deviation, ruled 2026-10-05).
Run: `pnpm --filter @sevendays/api fix && pnpm --filter @sevendays/api typecheck`, then commit:

```bash
git add apps/api/src/services/confirmation-email.ts apps/api/src/routes/appointments.ts apps/api/test/appointments.test.ts
git commit -m "feat(api): confirmation-email events — attempt/sent/failed + the PII sweep (#183)"
```

---

### Task 6: Gates, docs rotation, PR/merge, the v1 pick, issue close

**Files:**
- Modify: `docs/plan.md` (M6 boxes 1 + 3), `docs/progress.md`, `AGENTS.md` (status bullet + floors line), `docs/agents/v1-picks.md` (ledger rows, post-merge)

**Interfaces:**
- Consumes: Tasks 1–5 merged on the branch.
- Produces: main carrying the Application Log; the v1 pick executed + ledgered; issue #183 closed.

**Not here:** Sentry (#184 — next, unblocked), the Audit Log (#185), anything in M6 boxes 2/4–11.

- [ ] **Step 1: Full repo gates**

Run: `docker compose up -d db`, then `pnpm check` then `pnpm build`.
Expected: check 35/35 turbo tasks; build green. The api floor line: **26 files passed + 1 skipped / 317 passed + 3 skipped**; api-client **5 files / 33 tests** (untouched); types, landing, admin unchanged.

- [ ] **Step 2: Rotate the docs**

(a) `docs/plan.md`, Milestone 6 block — tick boxes 1 and 3 (and only those): change

```markdown
- [ ] Real logging via Loglayer + Pino in `apps/api` → **Workers Logs, 3-day retention** — five PII-free event classes (access minus `/health`, admin-mutation, media failures, email, errors), `requestId` minted per request and echoed as `X-Request-Id`
```

to:

```markdown
- [✅] Real logging via Loglayer + Pino in `apps/api` → **Workers Logs, 3-day retention** — five PII-free event classes (access minus `/health`, admin-mutation, media failures, email, errors), `requestId` minted per request and echoed as `X-Request-Id` _(landed 2026-10-05 via #183 — loglayer 9.4.0 + @loglayer/transport-pino 3.3.0 + pino 10.4.0 over `pino/browser`; the `[observability]` block enabled; Sentry rides separately at #184)_
```

and

```markdown
- [ ] CORS surface **closed** — the wildcard middleware dropped (no browser ever calls the api; the R2 presign allowlist stays the one real browser-CORS surface)
```

to:

```markdown
- [✅] CORS surface **closed** — the wildcard middleware dropped (no browser ever calls the api; the R2 presign allowlist stays the one real browser-CORS surface) _(landed 2026-10-05 via #183 — no ACAO header on any api response, asserted)_
```

(b) `docs/progress.md` — in the Known Gaps list, DELETE these two bullets (both now resolved):

```markdown
- CORS on `apps/api` is wide open (`origin: "*"` in `src/index.ts`) — **M6 specced 2026-10-05 (issue #182): the middleware is dropped, not narrowed** — no browser ever calls the api (every frontend call is server-side over the `API` service binding); browsers stay default-denied.
- Logging is Hono's `logger()` middleware, not the planned Loglayer + Pino — **M6 specced 2026-10-05 (issue #182)**: five PII-free event classes into Workers Logs (3-day retention), requestId echoed as `X-Request-Id`.
```

and add this bullet in their place:

```markdown
- The api's **Application Log** is live (M6 #183, 2026-10-05): Loglayer + Pino (`pino/browser`) behind a request-scoped child logger, five PII-free event classes into Workers Logs (`[observability]` enabled; `wrangler tail` is the viewer; 3-day retention), a per-request `requestId` echoed as `X-Request-Id`, and the wildcard CORS middleware dropped (browsers default-denied — the closed surface). Sentry (#184) and the Audit Log (#185) ride next off the same seams.
```

and in "Immediate Next Steps" item 1, replace `**#183** (the api Application Log — five event classes, requestId, the closed CORS surface), ` with `#183 (landed 2026-10-05 — the Application Log + the closed CORS surface), ` and replace `then #184/#185 off #183` with `then #184/#185 (now unblocked off #183)`.

(c) `AGENTS.md` — two edits. In the "Current status of `pnpm test`" section, change `Floors: api 23 files passed + 1 skipped (24) / 290 passed + 3 skipped; api-client 5 files / 33 tests.` to `Floors: api 26 files passed + 1 skipped (27) / 317 passed + 3 skipped; api-client 5 files / 33 tests.` And append this sentence to the end of the "The DB is provisioned, the catalog is seeded, and auth is wired in." bullet (after the `docs/media-bucket-runbook.md` sentence): ` The api's Application Log is live (M6 #183): Loglayer + Pino → Workers Logs with five PII-free event classes and a per-request requestId echoed as X-Request-Id; the wildcard CORS middleware is dropped — browsers stay default-denied, and wrangler tail is the live viewer.`

- [ ] **Step 3: graphify + commit**

Run: `graphify update .` then commit:

```bash
git add docs/plan.md docs/progress.md AGENTS.md graphify-out
git commit -m "docs: #183 — M6 boxes 1+3 ticked, progress + AGENTS rotation (#183)"
```

- [ ] **Step 4: PR, review, squash-merge**

```bash
git push -u origin feat/183-api-application-log
gh pr create --base main --title "feat(api): the Application Log — five event classes, requestId, the closed CORS surface (#183)" --body-file - <<'EOF'
## What

Implements #183 (M6 ticket 01) — § The api observability baseline — logging + § The closed CORS surface of the M6 spec (#182).

- The observability module: Loglayer 9.4.0 + @loglayer/transport-pino 3.3.0 + pino 10.4.0 over the explicit `pino/browser` subpath, one JSON line per event on console.log (Workers Logs ingests it; spike evidence pinned the emitted shape).
- Five PII-free event classes with enumerated field schemas: access (every request except /health), admin_mutation (one per committed CMS write across the nine routers), media_failure (presign/commit/thumbnail; successful presigns quiet), email (attempt/sent/failed with a classified code — resend's free text never logs), error (name/message/stack — replaces both console.error sites).
- requestId minted per request, echoed as X-Request-Id on every response (incl. raw-Response thumbs), correlated across every line.
- The wildcard CORS middleware dropped entirely — no ACAO header anywhere (asserted); the R2 presign allowlist stays the one real browser-CORS surface.
- `[observability]` enabled in the api's wrangler.toml; wrangler tail is the live viewer.
- api suite: 23→26 files / 290→317 passed (+3 skipped unchanged); pnpm check 35/35, pnpm build green, wrangler dry-run bundle gate green.

Sentry is #184 (rides the logError seam); the Audit Log is #185.
EOF
```

After CI green on the PR (the repo's check workflow), squash-merge via the GitHub UI or `gh pr merge --squash --delete-branch`. The squash commit title: `feat(api): the Application Log — five event classes, requestId, the closed CORS surface (#183) (#PR_NUMBER)`.

- [ ] **Step 5: The v1 pick (per `docs/agents/v1-picks.md`)**

Classification (pre-ruled by the spec's ledger, confirmed by this diff):
- **PICK clean** — all `apps/api` paths EXCEPT the three booking-coupled files below (the observability module + events.test.ts, request-context + index + db.ts, all nine routers' mutation edits, the media seams incl. admin-gallery/admin-packages threading, wrangler.toml's `[observability]` block riding the transformed surface, package.json + lockfile, and the v1-present test files: application-log, admin-mutation-log, error-seam, media-routes).
- **Main-only, dropped** — `apps/api/src/routes/appointments.ts` + `apps/api/src/services/confirmation-email.ts` + `apps/api/test/appointments.test.ts` (the email-event half — v1 shed the appointments/resend seam, the #147 ruling recurring), the plan file, `docs/plan.md` + `docs/progress.md`, and `AGENTS.md` (content-dropped — v1's client-safe rewrite carries neither edited sentence, the #145/#146 ruling).

Follow the runbook's pick procedure (branch off v1, apply the clean paths, drop the main-only list, run the locks: frozen install + `pnpm build:packages && pnpm --filter @sevendays/api build` + `pnpm check` 35/35 + `pnpm build` + the audit), push v1, confirm the CI run's `check` + `Deploy v1 (private)` legs succeed with `Deploy teaser (main)` skipped. Note in the pick evidence: v1's api floor becomes 26 files + 1 skipped / 312 passed + 3 skipped (317 minus the five appointments.test.ts email/PII tests that don't exist there — reconcile against v1's actual file set before recording).

- [ ] **Step 6: Ledger + issue close**

Append one row to `docs/agents/v1-picks.md`'s ledger table (the format of rows 167–176) with the actual SHAs: date 2026-10-05, issue #183, main squash SHA, class `split` (PICK-clean core + the main-only email/docs drops), v1 pick SHA, and the description naming: the observability module + five event classes + requestId middleware + CORS drop + `[observability]` block; the email-class half main-only (booking-coupled); the classifier counts (v1-paths vs main-only); the locks' results; the CI run numbers. Commit the ledger row to main:

```bash
git checkout main && git pull && git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #183 ledger row — logging + CORS pick clean, email half main-only (#183)"
git push
```

Then close the issue:

```bash
gh issue close 183 --comment "Landed via #<PR_NUMBER> (main) + the v1 pick <v1_SHA>. api 26 files / 317 passed + 3 skipped on main; pnpm check 35/35 + pnpm build green; the dry-run bundle gate green. M6 boxes 1 + 3 ticked in docs/plan.md. Unblocks #184 (Sentry rides the logError seam) and #185 (the Audit Log threads the same service seams)."
```
