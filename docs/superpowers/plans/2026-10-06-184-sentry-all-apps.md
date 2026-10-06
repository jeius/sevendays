# M6 Ticket 02 — Sentry Live on All Three Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** Sentry live on **all three apps** under one project ("sevendays"), exactly as the spec's § The api observability baseline — Sentry rules: the api via the Workers SDK (`@sentry/cloudflare`) — every 5xx, the curated media 503, and email-send failures captured at the #183 seams, 4xx log-only, errors + traces at 100%; the frontends errors-only at 100% (no traces, no session replay — PostHog owns web vitals/audience) with their dormant scaffold made actually live in the deployed Worker plus the missing client init. Tagging everywhere: `release` = the deployed git SHA via `SENTRY_RELEASE` riding CI's existing per-environment var passing, `environment` = `dev` / `teaser` / `v1`, a per-app tag (`app: api|landing|admin`), `sendDefaultPii: false`.

**Architecture:** Six tasks: (1) the api's injectable capture seam (`observability/capture.ts`, no-op by default) wired into the root `onError` beside `logError` — one call covers every 5xx **and** the curated 503, asserted over `app.request` with a stubbed client; (2) the remaining two capture sites — the email `waitUntil` catch (the original error, PII-free by construction) and the presign-503 proof, extending the appointments and media-routes suites; (3) the api's Worker wrap — a new `src/worker.ts` (the wrangler `main`, the ONLY `@sentry/cloudflare` import in the app, spike-proven shape) registering the SDK-backed capture at `withSentry` init, plus the `env.ts` trio and the `wrangler.toml` edits, gated by typecheck + build + a dry-run bundle proof; (4) the frontends — a pure options builder per app (TDD, the lib-seam pattern), one `src/instrument.ts` imported first from `src/router.tsx` (client + SSR + dev from one site), replacing the scaffold's provably-dead `instrument.server.mjs` mechanism, plus the turbo env-hash fix and a build-bake grep gate; (5) CI — `SENTRY_RELEASE`/`ENVIRONMENT` vars on both deploy legs, the `SENTRY_DSN` secret sync (skip-notice until the owner creates the project), and the `VITE_SENTRY_*` bake envs; (6) full gates + docs rotation + PR/merge + v1-pick ledger + issue close.

**Tech Stack:** `@sentry/cloudflare` **10.72.0** (the only new dependency — npm-published at exactly the version that version-mates the frontends' already-installed `@sentry/tanstackstart-react` 10.72.0), hono 4.13.5, wrangler 4.127.1, vitest 4, vite 7 (build-time env bake), pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#184 "M6 ticket 02: Sentry live on all three apps"](https://github.com/jeius/sevendays/issues/184) (label `ready-for-agent`), whose parent is the M6 spec `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` (issue #182 — § The api observability baseline — Sentry; § Testing Decisions). Key recon facts (2026-10-06, main `91cc7a3`, tree clean except graphify-out dirt; every probe below was run live and reverted):

- **The three capture seams are already marked in code by #183.** The root `onError` (`apps/api/src/index.ts:31-42`) calls `logError(c, error)` then answers the curated 503 for `MissingR2CredentialsError` or the uniform 500 — its comment says "#184's Sentry capture rides this seam." The email seam (`apps/api/src/services/confirmation-email.ts:145-158`) catches inside the one `waitUntil` and logs the classified failure — `ResendRejectionError` carries only `resend rejected the send (<name>)` (recipient-free by construction; the other throw sites name ids, never customers). **No 4xx ever reaches `onError`:** `requireSession` denies by `return c.json({ error: 'Authentication required.' }, 401)` (`services/auth.ts:34`) and every body/query validation failure returns through the `validated*` helpers — so one capture call at the top of `onError` satisfies "every 5xx + the curated 503, 4xx stays log-only" structurally.
- **The spike proved the Worker wrap's typing (2026-10-06, installed + typechecked + reverted clean).** `export default Sentry.withSentry<Env>((env) => ({ dsn: env.SENTRY_DSN, release: env.SENTRY_RELEASE, environment: env.ENVIRONMENT, tracesSampleRate: 1, sendDefaultPii: false, initialScope: { tags: { app: 'api' } } }), app)` compiles under the api's tsconfig **only with the explicit `<Env>` generic** — the default generic is `typeof cloudflareEnv` from `cloudflare:workers` (a TYPE-only import; the installed `@sentry/cloudflare@10.72.0` ESM build imports no `cloudflare:workers` at runtime — tarball-grepped; every reference is a `.d.ts`). The design still keeps the SDK out of the vitest graph entirely: only `src/worker.ts` (never imported by tests) imports it.
- **The default `honoIntegration` is inert — no double-capture.** `@sentry/cloudflare` 10.72.0 ships `honoIntegration()` in its default integrations, but its `handleHonoException` has **no caller inside this SDK** (read: `build/esm/integrations/hono.js`) — it exists to be invoked by `@sentry/hono`'s middleware, which we do not install. The explicit capture seam is therefore the only capture path; no deduping games needed. **(ERRATA, final review 2026-10-06: FALSE as written — the caller lives in `withSentry.js` (`instrumentHonoErrorHandler`), which this recon's read missed, so at the pinned version `withSentry` itself captures every onError error first and the seam's capture of the same object is dropped by core's same-object guard. Shipped fix: `worker.ts` filters the Hono integration out of the defaults, making the explicit seam the only capture path — commit `1c0d2a4`; the whole-branch reviewer reproduced the mechanism end-to-end.)**
- **The frontends' "dormant scaffold" is deader than the spec implies — proven.** `instrument.server.mjs` (both apps: `Sentry.init` at `tracesSampleRate: 0.1`, `dataCollection: { userInfo: false, httpBodies: [] }`) loads ONLY under node: dev via `NODE_OPTIONS='--import ./instrument.server.mjs'`, `start` via `node --import`, and a `cp` beside the SSR bundle at build. A `wrangler deploy --dry-run --outdir` (2026-10-06) shows the file riding the deployed bundle as a **dead module — nothing imports it** (zero `instrument` references in the entry graph), so it never executes in either deployed Worker; and **no client init exists at all**. The TanStack plugin has no instrument-file convention (grep of `@tanstack/start-plugin-core` + `@tanstack/react-start` dist: zero) and `sentryTanstackStart` injects nothing (its vite esm read: route patterns, optional tunnel, sourcemaps, middleware wrap — none touch init). Sentry's manual setup (docs.sentry.io `…/tanstackstart-react/manual-setup/`, fetched 2026-10-06) wires the client init as the first import of the client entry — and notes the node `--import` server variant "doesn't work on Cloudflare."
- **One init site covers client + SSR + dev: `src/router.tsx`.** `router.tsx` is in BOTH the browser bundle and the deployed SSR graph (proven: `dist/server/assets/router-*.js` contains the router factory), and `@sentry/tanstackstart-react`'s conditional exports resolve `browser` → client build, `workerd` → server build (package exports map, read). So `import './instrument'` as the FIRST import of `src/router.tsx` initializes Sentry in every runtime the router loads, with the right SDK build per environment. The `startSpan` calls in the server fns stay untouched (no-op under `tracesSampleRate: 0`).
- **Vite bakes `VITE_*` process env at build; turbo must hash them.** Env vars already present when Vite executes have the highest priority for `import.meta.env` (Vite docs) — CI's deploy legs export `VITE_SENTRY_*` and the baked client/SSR bundles carry them. But `turbo.json`'s `build` task hashes only `NODE_ENV` — the trio joins the task's `"env"` array, or a future remote cache would silently reuse DSN-less builds (the check job builds without a DSN; each deploy leg builds with one).
- **`import.meta.env` typing + the namespace-import ban.** Both apps' tsconfigs extend `@sevendays/config/ts/vite` whose `types` include `vite/client` — `ImportMetaEnv` has no `VITE_SENTRY_*` keys, so each app gains the canonical `src/vite-env.d.ts` declaring the three optional keys (interface merging; no assertions needed). Biome bans namespace imports at error level (`packages/config/src/biome/vite.json`: `noNamespaceImport`) — `worker.ts` and `instrument.ts` use **named imports** (`withSentry`, `captureException`, `init`), unlike the scaffold's `import * as Sentry` (which only passed because `.mjs` + a biome exclusion).
- **CI's existing per-environment var passing (read, `.github/workflows/ci.yml`):** both deploy legs draw `vars.*`/`secrets.*` into job env and pass them to `wrangler deploy --var`; the R2 S3-token step is the skip-notice pattern the `SENTRY_DSN` sync copies. `github.sha` is the release value — it cannot be a static GitHub environment variable, so the legs set `SENTRY_RELEASE: ${{ github.sha }}` in job env (this is "riding CI's existing per-environment var passing" made concrete for a per-push value).
- **Sibling fences (spec § Sequencing; `docs/plan.md` M6 block):** this ticket owns plan.md's M6 checkbox 2 ("Sentry wired into `apps/api` (Workers SDK) and the frontends' dormant scaffold initialized…") exclusively and ticks it at close; checkboxes 4 (Audit Log #185), 5 (dashboard #186/#187), 7 (smoke #190), 8–10 (ship #191/#192), 11 (verify) stay unticked — boxes 1, 3, 6 are already ✅ via #183/#189. NOT here, regardless of temptation: the Sentry **sourcemaps upload + `sentryTanstackStart` vite plugin** (needs `SENTRY_AUTH_TOKEN` — deliberately absent from the spec's at-ship accounting; unminified-error posture accepted for v1), the dashboard's Sentry link-out (#186/#187), anything PostHog (web vitals stay #186/#187's wiring), the Audit Log or any DB schema change (#185), any `packages/types` change (capture is api-internal observability, not a wire contract), `tunnelRoute`, session replay, frontends' traces, booking endpoints, any new e2e/ path (#190 owns `e2e/`), and `worker-configuration.d.ts` (no cf-typegen).
- **Baselines (AGENTS.md, 2026-10-06):** `apps/api` = **26 files passed + 1 skipped (27) / 317 tests passed + 3 skipped**; `packages/api-client` = 5 files / 33 tests. After this ticket: api = **27 files passed + 1 skipped (28) / 323 passed + 3 skipped** (+4 Task 1, +1 Task 2 in `media-routes.test.ts`, +1 Task 2 in `appointments.test.ts`); landing and admin each +1 file (`src/lib/sentry.test.ts`) / +4 tests. `pnpm check` stays at the #183-era task count (no scripts added — the build script *edit* in Task 4 changes no script name); if any gate count differs, reconcile before proceeding — do not loosen assertions.
- **Clarify ruling needed from the owner:** none blocking — every literal traces to the spec (§ Sentry rulings), the probed SDK behavior, or the existing scaffold. Two agent rulings are pinned in Global Constraints, owner-reviewable at PR: (a) the frontend scaffold **replacement** (delete `instrument.server.mjs` + its script wiring rather than keep a mechanism proven never to execute in deploys — the ticket's "the frontends' dormant scaffold initialized" is satisfied by init going live in the deployed Worker, which the scaffold's mechanism cannot do); (b) the env names `VITE_SENTRY_RELEASE` / `VITE_SENTRY_ENVIRONMENT` (new, computed in-workflow from `github.sha` + the leg name — not new GitHub inventory; the spec's accounting names `VITE_SENTRY_DSN` + `SENTRY_RELEASE`, and client-side release/environment must be baked at build to exist at all).

## Global Constraints

- **Branch & baseline:** `feat/184-sentry-all-apps` off main `91cc7a3` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#184)` squash style; every commit below is pinned verbatim. Evidence (test output, dry-run manifests, build-grep output) lands in gitignored `.superpowers/sdd/2026-10-06-184-sentry-all-apps/`.
- **Gates (repo AGENTS.md, verbatim duties):** after any manifest change run `pnpm install`. Before any work that typechecks `packages/api-client` or the apps, run `pnpm build:packages && pnpm --filter @sevendays/api build` (the client resolves `AppType` from the built `dist/`). Every task commits only with `pnpm check` green for the packages it touched (api tests need the compose db up: `docker compose up -d db` first). Biome canonical form via the touched package's `pnpm fix` before committing — accept its rewrites. Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]`. Run `graphify update .` at close (code was modified).
- **Version pin (probed 2026-10-06):** add exactly `@sentry/cloudflare@10.72.0` to `apps/api` dependencies (`pnpm --filter @sevendays/api add @sentry/cloudflare@10.72.0`) — verify with `pnpm --filter @sevendays/api list @sentry/cloudflare --depth 0`; anything else resolves → STOP and report. The frontends add NOTHING (`@sentry/tanstackstart-react` 10.72.0 already in both manifests — verify with `pnpm --filter @sevendays/landing list @sentry/tanstackstart-react --depth 0` and the admin twin). pnpm 11 prints a peers advisory on the add: the pre-existing `@hono/zod-validator`-wants-zod-3 warning stays; a *range* warning for `@sentry/cloudflare` peers is advisory — but a **missing-peer error** (a package that cannot resolve at all) → STOP and report.
- **Tagging + sampling (spec-verbatim, binding):** one Sentry project, named `sevendays`. Every init sets: `release` (the deployed git SHA), `environment` (`dev` | `teaser` | `v1`), the per-app tag via `initialScope: { tags: { app: … } }` (`api` | `landing` | `admin`), `sendDefaultPii: false`. Api: `sampleRate: 1`, `tracesSampleRate: 1` (errors + traces at 100% — traffic far under caps). Frontends: `sampleRate: 1`, `tracesSampleRate: 0`, **no** `replayIntegration`, **no** `sentryTanstackStart` plugin, and the scaffold's `dataCollection: { userInfo: false, httpBodies: [] }` kept (stricter than the PII umbrella).
- **Capture posture (spec-verbatim, binding):** exactly three capture call sites — the root `onError` (one call covers every 5xx AND the curated 503: `MissingR2CredentialsError` reaches `onError` before the 503 branch) and the email `waitUntil` catch (the original error — `ResendRejectionError`'s message is recipient-free by construction; assert that in Task 2). 4xx is captured NOWHERE (structural: `validated*` helpers and `requireSession` return, they never throw). No capture in `logError` itself — `events.ts` stays pure logging (one concern per module, and `events.ts` is imported by `events.test.ts` which must not gain a capture dependency).
- **The capture seam (binding):** `apps/api/src/observability/capture.ts` is a function-pointer registry — `setErrorCapture(fn)` / `resetErrorCapture()` / `captureError(error)`, default a no-op. `@sentry/cloudflare` is imported by `src/worker.ts` ONLY (tests never load the SDK; `src/index.ts` and every service stay SDK-free). Api tests inject stubs via `setErrorCapture` and reset in `afterEach` — no `vi.mock` of the SDK anywhere.
- **Env names (binding):** api = `SENTRY_DSN` (Worker secret, skip-notice sync from CI like the R2 pair; a deploy without it serves everything with captures no-op) + `SENTRY_RELEASE` + `ENVIRONMENT` (plain vars via `--var`; the committed `[vars]` default flips `"development"` → `"dev"` — nothing consumed the old value, swept). Frontends = `VITE_SENTRY_DSN` (public-by-design, from the GitHub environment) + `VITE_SENTRY_RELEASE` + `VITE_SENTRY_ENVIRONMENT` (computed per deploy leg; `environment` defaults to `'dev'` in code when unset — local dev needs nothing set). No `.dev.vars` / `.env.example` changes: unset locally is the no-op posture.
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the touched package's `pnpm fix` then normalizes quoting/ordering/import order to house style — accept its rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–3 edit only: `apps/api/package.json` + `pnpm-lock.yaml` (the one add), `apps/api/src/observability/capture.ts` (create), `apps/api/src/worker.ts` (create), `apps/api/src/env.ts`, `apps/api/src/index.ts`, `apps/api/src/services/confirmation-email.ts`, `apps/api/wrangler.toml`, `apps/api/test/sentry-capture.test.ts` (create), `apps/api/test/appointments.test.ts`, `apps/api/test/media-routes.test.ts`. Task 4 edits only: `apps/landing/src/lib/sentry.ts` + `sentry.test.ts` + `src/instrument.ts` + `src/vite-env.d.ts` (all create), `apps/landing/src/router.tsx`, `apps/landing/package.json`, `apps/landing/biome.json`, delete `apps/landing/instrument.server.mjs` — and the exact admin twins (`apps/admin/…`). Task 4 also edits root `turbo.json` (the build task's `env` array). Task 5 edits only `.github/workflows/ci.yml`. Task 6 rotates `docs/plan.md` (M6 box 2), `docs/progress.md`, `AGENTS.md` (status bullet + the api floors line), `docs/agents/v1-picks.md` (ledger row, post-merge), and closes #184. NOT here: sourcemaps/`SENTRY_AUTH_TOKEN`/the sentryTanstackStart plugin, the dashboard link-out (#186/#187), PostHog wiring, the Audit Log (#185), any `packages/types` file, `worker-configuration.d.ts`, anything under `e2e/` (#189/#190), the ship runbook (#191), and any landing/admin file beyond the fence list.

## File Structure

```text
apps/api/
  package.json / pnpm-lock.yaml            # modify (Task 3) — @sentry/cloudflare@10.72.0
  wrangler.toml                            # modify (Task 3) — main → src/worker.ts, ENVIRONMENT dev, comments
  src/
    observability/capture.ts               # create (Task 1) — the injectable capture seam
    index.ts                               # modify (Task 1) — captureError beside logError in onError
    services/confirmation-email.ts         # modify (Task 2) — captureError in the waitUntil catch
    env.ts                                 # modify (Task 3) — the optional Sentry trio
    worker.ts                              # create (Task 3) — withSentry wrap, the SDK boundary
  test/
    sentry-capture.test.ts                 # create (Task 1) — 5xx captured / no-op / 400 / 404
    media-routes.test.ts                   # modify (Task 2) — the curated-503 capture assertion
    appointments.test.ts                   # modify (Task 2) — the email-failure capture assertion
apps/landing/  (apps/admin/ — exact twins)
  src/lib/sentry.ts + sentry.test.ts       # create (Task 4) — the pure options builder + suite
  src/instrument.ts                        # create (Task 4) — the one init site
  src/vite-env.d.ts                        # create (Task 4) — the three VITE_SENTRY_* keys
  src/router.tsx                           # modify (Task 4) — './instrument' as the first import
  package.json                             # modify (Task 4) — scripts lose the scaffold wiring
  biome.json                               # modify (Task 4) — drop the instrument.server.mjs exclusion
  instrument.server.mjs                    # DELETE (Task 4) — proven dead in deploys
turbo.json                                 # modify (Task 4) — build env gains the VITE_SENTRY_* trio
.github/workflows/ci.yml                   # modify (Task 5) — release/env vars + DSN sync + bake envs
```

---

### Task 1: The api capture seam + the onError wiring (TDD)

**Files:**
- Create (test-first): `apps/api/test/sentry-capture.test.ts`
- Create: `apps/api/src/observability/capture.ts`
- Modify: `apps/api/src/index.ts:2` (the import) and `apps/api/src/index.ts:31-42` (the onError body)

**Interfaces:**
- Consumes: nothing from earlier tasks (`logError` from `./observability/events.js` already in place).
- Produces (exact exports — Tasks 2–3 and #185's requestId correlation consume): from `capture.ts` — `type ErrorCapture = (error: unknown) => void`, `setErrorCapture(fn: ErrorCapture): void`, `resetErrorCapture(): void`, `captureError(error: unknown): void`. The default is a no-op; only `src/worker.ts` (Task 3) ever registers the SDK-backed one.

**Not here:** `worker.ts`, `env.ts`, `wrangler.toml`, the dependency (all Task 3 — this task's code runs SDK-free); the email and media tests (Task 2); `events.ts` (untouched — logging stays pure).

- [ ] **Step 1: Write the failing tests**

Create `apps/api/test/sentry-capture.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { resetErrorCapture, setErrorCapture } from '../src/observability/capture.js';
import { testEnv } from './helpers/env.js';

const url = process.env.TEST_DATABASE_URL as string;

// The stubbed-client contract (M6 #184, AC 4): what the worker entry's
// withSentry registration receives, asserted at the seams the AC names. The
// 5xx + curated-503 captures ride the root onError; 4xx reaches it never
// (validated* helpers and requireSession return, they do not throw) — and
// the no-op default is the deployed posture before the owner sets SENTRY_DSN.
afterEach(() => {
  resetErrorCapture();
  vi.restoreAllMocks();
});

describe('Sentry capture at the onError seam (M6 #184)', () => {
  it('captures the thrown error on a forced 5xx', async () => {
    const captured: unknown[] = [];
    setErrorCapture((error) => captured.push(error));
    // Same forced 5xx as error-seam.test.ts: full env + a refused port —
    // the handler's query throws, drizzle wraps it as DrizzleQueryError.
    const res = await app.request('/api/v1/branches', undefined, {
      ...testEnv(url),
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
    });
    expect(res.status).toBe(500);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeInstanceOf(Error);
    expect((captured[0] as Error).message).toMatch(/Failed query/);
  });

  it('captures nothing by default — the no-op-before-registration posture', async () => {
    // No setErrorCapture call: the default capture is a no-op, so the same
    // 500 runs clean without a registered client (a deploy without
    // SENTRY_DSN, or any test that never injected a stub).
    const res = await app.request('/api/v1/branches', undefined, {
      ...testEnv(url),
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
    });
    expect(res.status).toBe(500);
  });

  it('never captures a 400 validation failure (4xx stays log-only)', async () => {
    const captured: unknown[] = [];
    setErrorCapture((error) => captured.push(error));
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify({ branchId: 'not-a-uuid' }),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    expect(captured).toHaveLength(0);
  });

  it('never captures a 404 (unmounted paths bypass onError)', async () => {
    const captured: unknown[] = [];
    setErrorCapture((error) => captured.push(error));
    const res = await app.request('/api/v1/unknown', undefined, testEnv(url));
    expect(res.status).toBe(404);
    expect(captured).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `docker compose up -d db && pnpm --filter @sevendays/api test -- test/sentry-capture.test.ts`
Expected: FAIL — `Cannot find module '../src/observability/capture.js'` (the import dies before any assertion).

- [ ] **Step 3: Write the capture seam + wire onError**

Create `apps/api/src/observability/capture.ts`:

```ts
// The Sentry capture seam (M6 #184, spec § Sentry): a function-pointer
// registry so the vitest graph never loads @sentry/cloudflare — the worker
// entry (src/worker.ts, the wrangler main) registers the SDK-backed capture
// inside withSentry's options callback; every runtime consumer (onError, the
// email waitUntil catch) and every test stays SDK-free, tests injecting a
// stub via setErrorCapture. The default is a no-op: a deploy without
// SENTRY_DSN — or any code before registration — captures nothing, the same
// no-op-without-DSN posture the frontends' scaffold codified.
export type ErrorCapture = (error: unknown) => void;

const noop: ErrorCapture = () => {};

let capture: ErrorCapture = noop;

export function setErrorCapture(fn: ErrorCapture): void {
  capture = fn;
}

export function resetErrorCapture(): void {
  capture = noop;
}

// Every thrown error IS a 5xx response (the curated media 503 or the uniform
// 500 — onError answers exactly those two); 4xx never reaches onError
// (validated* helpers and requireSession return, they do not throw), so this
// seam cannot over-capture.
export function captureError(error: unknown): void {
  capture(error);
}
```

Modify `apps/api/src/index.ts` — add the import beside the existing observability imports (after line 2's `logError` import):

```ts
import { captureError } from './observability/capture.js';
```

and inside `onError`, immediately after `logError(c, error);` (line 32):

```ts
    // Sentry capture (M6 #184): one call covers every 5xx AND the curated
    // 503 — MissingR2CredentialsError reaches onError before the branch
    // below answers 503 — while 4xx reaches onError never. Whether a client
    // is registered at all is the worker entry's call (no-op without
    // SENTRY_DSN).
    captureError(error);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @sevendays/api test -- test/sentry-capture.test.ts`
Expected: PASS — 4 tests. Then the whole suite: `pnpm --filter @sevendays/api test`
Expected: **27 files passed + 1 skipped (28) / 321 passed + 3 skipped** (317 + 4).

- [ ] **Step 5: Gate + commit**

Run: `pnpm --filter @sevendays/api fix && pnpm check`
Expected: green (api + untouched suites; the compose db stays up).

```bash
git add apps/api/src/observability/capture.ts apps/api/src/index.ts apps/api/test/sentry-capture.test.ts
git commit -m "feat(api): the Sentry capture seam — onError wiring, stubbed-client tests (#184)"
```

### Task 2: The email-send + curated-503 captures (TDD, extending two live suites)

**Files:**
- Create (test-first): one `it` in `apps/api/test/appointments.test.ts` (the `POST /api/v1/appointments — confirmation email (ticket 09)` describe, after the `a typed Resend failure never fails the booking` test at ~line 746) + its afterEach edit + two imports
- Create (test-first): one `it` in `apps/api/test/media-routes.test.ts` (the `POST /api/v1/admin/media/presign` describe, after the curated-503 test at ~line 163) + its file-level afterEach edit + two imports
- Modify: `apps/api/src/services/confirmation-email.ts:2` (import) and `:151-157` (the waitUntil catch)

**Interfaces:**
- Consumes: Task 1's `setErrorCapture` / `resetErrorCapture` / `captureError` (exact signatures above).
- Produces: nothing later tasks consume — this task closes two of the three capture seams' proofs (the third, onError, is Task 1's).

**Not here:** `worker.ts` or any `@sentry/cloudflare` import (Task 3); the requestId-correlation tag (out of scope — no spec ruling); any change to `logEmail`/`logMediaFailure`.

- [ ] **Step 1: Write the two failing tests**

In `apps/api/test/appointments.test.ts` — extend the imports (line 7 area and the helpers):

```ts
import {
  EMAIL_FROM,
  ResendRejectionError,
} from '../src/services/confirmation-email.js';
import { resetErrorCapture, setErrorCapture } from '../src/observability/capture.js';
```

extend the email describe's afterEach (currently `vi.restoreAllMocks()` only):

```ts
  afterEach(() => {
    resetErrorCapture();
    vi.restoreAllMocks();
  });
```

and add this test inside the `POST /api/v1/appointments — confirmation email (ticket 09)` describe, after the typed-Resend-failure test:

```ts
  it('a typed Resend failure is captured at the send seam (M6 #184) — the original error, recipient-free; a successful send is not captured', async () => {
    const captured: unknown[] = [];
    setErrorCapture((error) => captured.push(error));
    // Success leg first: the beforeEach default sendMock resolves ok — a
    // completed booking must never reach Sentry (failures only).
    const okCtx = fakeExecCtx();
    expect((await postBooking(okCtx)).status).toBe(201);
    await Promise.all(okCtx.promises);
    expect(captured).toHaveLength(0);
    // Failure leg: the SDK's real shape — it resolves { data: null, error },
    // and the send seam reifies it as ResendRejectionError.
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'internal error', statusCode: 500, name: 'internal_server_error' },
    });
    const failCtx = fakeExecCtx();
    const res = await postBooking(failCtx);
    expect(res.status).toBe(201); // booking stands — capture rides the catch
    await Promise.all(failCtx.promises);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeInstanceOf(ResendRejectionError);
    expect((captured[0] as ResendRejectionError).rejectionName).toBe('internal_server_error');
    // PII floor: the captured message is the classified line — resend's
    // free-text (which may echo the recipient) never rides the capture.
    expect((captured[0] as Error).message).not.toContain('ana@example.com');
  });
```

In `apps/api/test/media-routes.test.ts` — extend the imports (beside the existing `app` import at line 3):

```ts
import { resetErrorCapture, setErrorCapture } from '../src/observability/capture.js';
import { MissingR2CredentialsError } from '../src/services/media.js';
```

extend the file-level afterEach (line 89):

```ts
afterEach(() => {
  resetErrorCapture();
  vi.restoreAllMocks();
});
```

and add this test inside the `POST /api/v1/admin/media/presign` describe, after the curated-503 test:

```ts
  it('the curated 503 is captured at the onError seam (M6 #184) — MissingR2CredentialsError reaches Sentry', async () => {
    const captured: unknown[] = [];
    setErrorCapture((error) => captured.push(error));
    const { token } = await signUpSession(url, 'presign-sentry@sevendays.test');
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
    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeInstanceOf(MissingR2CredentialsError);
    // The loud detail rides the capture (Sentry is the loud channel; the
    // 503 line the guest sees stays curated — the leak-safe split).
    expect((captured[0] as Error).message).toContain('R2_S3_ACCESS_KEY_ID');
  });
```

- [ ] **Step 2: Run both to verify they fail**

Run: `pnpm --filter @sevendays/api test -- test/appointments.test.ts test/media-routes.test.ts`
Expected: the two new tests FAIL with `expected 0 received 1`-shaped capture-count errors (the capture calls don't exist yet — `captured` stays empty in the failure legs and the 503 leg: `Expected length: 1. Received length: 0`). The suites' pre-existing tests stay green.

- [ ] **Step 3: Wire the email capture**

In `apps/api/src/services/confirmation-email.ts`, add the import beside the existing observability import (line 13):

```ts
import { captureError } from '../observability/capture.js';
```

and inside `scheduleConfirmationEmail`'s `.catch`, immediately after the `logEmail(log, { phase: 'failed', … })` call (so the block reads):

```ts
      logEmail(log, {
        phase: 'failed',
        appointmentId: record.id,
        code:
          error instanceof ResendRejectionError ? `resend:${error.rejectionName}` : 'send_failed',
      });
      // #184: the Sentry capture at the send seam — no HTTP status signals
      // an email failure (the booking already answered 201), so the original
      // error is captured here: ResendRejectionError's message is classified
      // (recipient-free by construction); the other throw sites name ids,
      // never customers.
      captureError(error);
```

- [ ] **Step 4: Run both suites to verify they pass**

Run: `pnpm --filter @sevendays/api test -- test/appointments.test.ts test/media-routes.test.ts`
Expected: PASS — both new tests green (the 503 capture rides Task 1's onError call; the email capture rides this task's). Then the whole suite: `pnpm --filter @sevendays/api test`
Expected: **27 files passed + 1 skipped (28) / 323 passed + 3 skipped** (321 + 2).

- [ ] **Step 5: Gate + commit**

Run: `pnpm --filter @sevendays/api fix && pnpm check`
Expected: green.

```bash
git add apps/api/src/services/confirmation-email.ts apps/api/test/appointments.test.ts apps/api/test/media-routes.test.ts
git commit -m "feat(api): Sentry capture at the email-send and curated-503 seams (#184)"
```

### Task 3: The api's Worker wrap — `withSentry`, the env trio, the wrangler main

**Files:**
- Modify: `apps/api/package.json` + `pnpm-lock.yaml` (the one `pnpm add`)
- Modify: `apps/api/src/env.ts:36-38` (the optional Sentry trio inside `envSchema`)
- Create: `apps/api/src/worker.ts`
- Modify: `apps/api/wrangler.toml` (`main`, the `[vars]` ENVIRONMENT value, the secrets/plain-values comments)

**Interfaces:**
- Consumes: Task 1's `setErrorCapture(fn: ErrorCapture): void`; `app` + `type AppType` from `src/index.ts` (unchanged — tests and `packages/api-client` keep importing `index.ts`, never `worker.ts`); `type Env` from `src/env.ts`.
- Produces: the deployed Worker's default export — `Sentry.withSentry<Env>(optionsCallback, app)`. Nothing else imports `worker.ts` (it is exclusively the wrangler `main`); `AppType` and every existing import of `src/index.js` are untouched.

**Not here:** any test that imports `worker.ts` (the SDK stays out of the vitest graph by construction — that is this design's point); capture calls (Tasks 1–2 done); CI (Task 5).

- [ ] **Step 1: Add the dependency**

Run: `pnpm --filter @sevendays/api add @sentry/cloudflare@10.72.0 && pnpm --filter @sevendays/api list @sentry/cloudflare --depth 0`
Expected: `@sentry/cloudflare 10.72.0` (exactly — anything else → STOP and report). The pnpm peers advisory may print; only a missing-peer ERROR blocks (see Global Constraints).

- [ ] **Step 2: The env trio**

In `apps/api/src/env.ts`, extend `envSchema` — the three keys after the R2 pair (line 37), plus their comment block before the schema's closing:

```ts
  R2_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.string().min(1).optional(),
  SENTRY_RELEASE: z.string().min(1).optional(),
  ENVIRONMENT: z.string().min(1).optional(),
});
```

and extend the header comment's optional-keys ledger (after the R2 bullet, before the `MEDIA_BUCKET/IMAGES` paragraph) with:

```ts
// - The Sentry trio (M6 #184): all three OPTIONAL — a deploy without them
//   serves everything (Sentry stays disabled, captures no-op), the same
//   no-op-without-DSN posture the frontends codified. SENTRY_DSN is a Worker
//   secret; SENTRY_RELEASE (the deployed git SHA) and ENVIRONMENT
//   (dev/teaser/v1) ride `wrangler deploy --var` from CI; the committed
//   [vars] default is dev.
```

- [ ] **Step 3: Write `apps/api/src/worker.ts`**

```ts
// The Sentry Worker entry (M6 #184, spec § Sentry — the api via the Workers
// SDK). src/index.ts stays SDK-free (its test graph and the AppType export
// are untouched); this file is the wrangler main and the ONLY
// @sentry/cloudflare import in the api: withSentry initializes per request
// (env bindings are per-request under workerd) and auto-instruments the
// request path (traces at 100% — v1 traffic is far under any cap), while the
// explicit capture seam (observability/capture.ts) owns WHAT is captured:
// every 5xx + the curated 503 + email-send failures, never 4xx. A missing
// SENTRY_DSN leaves Sentry disabled (the no-op-without-DSN posture both
// frontends share). The explicit <Env> generic is load-bearing: the default
// generic is cloudflare:workers' env TYPE (a type-only import — the SDK's
// runtime build never imports the scheme). The default honoIntegration is
// inert here — nothing invokes it without @sentry/hono's middleware, so the
// capture seam is the only capture path (verified against
// @sentry/cloudflare 10.72.0's integrations/hono.js).
import { captureException, withSentry } from '@sentry/cloudflare';
import type { Env } from './env.js';
import app from './index.js';
import { setErrorCapture } from './observability/capture.js';

export default withSentry<Env>(
  (env) => {
    setErrorCapture((error) => captureException(error));
    return {
      dsn: env.SENTRY_DSN,
      release: env.SENTRY_RELEASE,
      environment: env.ENVIRONMENT ?? 'dev',
      sampleRate: 1,
      tracesSampleRate: 1,
      sendDefaultPii: false,
      initialScope: { tags: { app: 'api' } },
    };
  },
  app
);
```

- [ ] **Step 4: The wrangler.toml edits**

In `apps/api/wrangler.toml`: change `main = "src/index.ts"` to:

```toml
# The Sentry wrap (M6 #184): worker.ts wraps index.ts's Hono app in
# withSentry — the only @sentry/cloudflare import in the api.
main = "src/worker.ts"
```

change the `[vars]` ENVIRONMENT entry to:

```toml
[vars]
# The Sentry environment vocabulary (M6 #184): dev locally; CI passes
# --var ENVIRONMENT:teaser|v1 per deploy leg. Nothing else consumes it
# (swept 2026-10-06; the pre-#184 "development" value had no reader).
ENVIRONMENT = "dev"
```

and in the secrets/plain-values comment blocks: annotate the existing `SENTRY_DSN` line to read `SENTRY_DSN   (M6 #184 — live; CI-synced from the GitHub environment, skip-notice when unset)` and add `SENTRY_RELEASE` + `ENVIRONMENT` to the per-environment plain-values list beside `CLOUDFLARE_ACCOUNT_ID`/`MEDIA_PUBLIC_BASE_URL`.

- [ ] **Step 5: Typecheck + build + the dry-run bundle gate**

Run: `pnpm build:packages && pnpm --filter @sevendays/api build && pnpm --filter @sevendays/api typecheck`
Expected: all green (the spike proved this exact `withSentry<Env>` shape compiles).

Run: `cd apps/api && pnpm exec wrangler deploy --dry-run --outdir /tmp/184-api-dry && grep -c "captureException" /tmp/184-api-dry/index.js`
Expected: the dry-run bundles clean and the grep returns **a count ≥ 1** (the Sentry wrap is in the deployed bundle — save the manifest to `.superpowers/sdd/2026-10-06-184-sentry-all-apps/api-dry-run.txt`). Then `cd` back to the repo root.

- [ ] **Step 6: Full gate + commit**

Run: `pnpm check`
Expected: green (no test imports worker.ts; the suites are untouched by this task — counts stay at Task 2's 27 + 1 skipped / 323 + 3 skipped).

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/env.ts apps/api/src/worker.ts apps/api/wrangler.toml
git commit -m "feat(api): the Sentry Worker wrap — withSentry init, release + environment vars (#184)"
```

### Task 4: The frontends — the options builder (TDD), one init site, the scaffold replacement

**Files (landing shown; the admin set is the exact twin with `app: 'admin'`):**
- Create (test-first): `apps/landing/src/lib/sentry.test.ts` and `apps/admin/src/lib/sentry.test.ts`
- Create: `apps/landing/src/lib/sentry.ts`, `apps/admin/src/lib/sentry.ts`
- Create: `apps/landing/src/instrument.ts`, `apps/admin/src/instrument.ts`
- Create: `apps/landing/src/vite-env.d.ts`, `apps/admin/src/vite-env.d.ts`
- Modify: `apps/landing/src/router.tsx:1` + `apps/admin/src/router.tsx:1` (the first import)
- Modify: `apps/landing/package.json` + `apps/admin/package.json` (three scripts), `apps/landing/biome.json` + `apps/admin/biome.json` (drop the exclusion)
- DELETE: `apps/landing/instrument.server.mjs`, `apps/admin/instrument.server.mjs`
- Modify: root `turbo.json` (the build task's `env` array)

**Interfaces:**
- Consumes: `init` from `@sentry/tanstackstart-react` 10.72.0 (already installed — verify, don't add); `import.meta.env.VITE_SENTRY_*` declared by the new `vite-env.d.ts`.
- Produces: `buildSentryOptions(input: { dsn: string | undefined; release: string | undefined; environment: string | undefined })` returning the init options object or **`null` when `dsn` is missing** — `instrument.ts` is its only consumer; `init(options)` is called only on non-null. The `startSpan` calls in the server fns stay untouched.

**Not here:** the `sentryTanstackStart` vite plugin / sourcemaps (out of scope — no `SENTRY_AUTH_TOKEN`); any PostHog wiring (#186/#187); router tracing integrations (traces are OFF); the tunnel route; any route/component changes; deleting the `startSpan` calls (no-op under `tracesSampleRate: 0` — they stay).

- [ ] **Step 1: Write the failing builder tests (both apps)**

Create `apps/landing/src/lib/sentry.test.ts` (the admin twin differs only in the two `'landing'` literals):

```ts
import { describe, expect, it } from 'vitest';
import { buildSentryOptions } from './sentry';

// The errors-only posture as one asserted literal (M6 #184, spec § Sentry):
// frontends errors at 100%, traces OFF, no replay, PII off. The no-DSN
// no-op is the AC's dev posture — Sentry.init is never called on null.
describe('buildSentryOptions (M6 #184)', () => {
  it('returns null when the DSN is missing — init is never called', () => {
    expect(
      buildSentryOptions({ dsn: undefined, release: 'abc123', environment: 'teaser' })
    ).toBeNull();
  });

  it('builds the exact errors-only options with the app tag and full env', () => {
    expect(
      buildSentryOptions({
        dsn: 'https://key@o0.ingest.sentry.io/0',
        release: 'abc123',
        environment: 'teaser',
      })
    ).toEqual({
      dsn: 'https://key@o0.ingest.sentry.io/0',
      release: 'abc123',
      environment: 'teaser',
      sampleRate: 1,
      tracesSampleRate: 0,
      sendDefaultPii: false,
      dataCollection: { userInfo: false, httpBodies: [] },
      initialScope: { tags: { app: 'landing' } },
    });
  });

  it("defaults the environment to 'dev' when unset (local dev)", () => {
    const options = buildSentryOptions({
      dsn: 'https://key@o0.ingest.sentry.io/0',
      release: undefined,
      environment: undefined,
    });
    expect(options?.environment).toBe('dev');
  });

  it('omits the release key entirely when unset (no empty-string release tag)', () => {
    const options = buildSentryOptions({
      dsn: 'https://key@o0.ingest.sentry.io/0',
      release: undefined,
      environment: 'dev',
    });
    expect(options && 'release' in options).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/admin test`
Expected: both FAIL — `Cannot find module './sentry'` (or the equivalent unresolved import).

- [ ] **Step 3: Write the builders, the env declarations, the init, and the router imports**

Create `apps/landing/src/lib/sentry.ts` (the admin twin differs only in `APP` and the tag literal):

```ts
// The Sentry options seam (M6 #184, spec § Sentry): a pure builder so the
// errors-only posture is one asserted literal — frontends errors at 100%,
// traces OFF, no session replay (PostHog owns web vitals/audience), PII off
// (sendDefaultPii false + the scaffold's stricter dataCollection block).
// src/instrument.ts is the only consumer; the lib-seam suite owns the
// no-DSN no-op (null) and every pinned option.
export interface SentryFrontendInit {
  dsn: string;
  release?: string;
  environment: string;
  sampleRate: 1;
  tracesSampleRate: 0;
  sendDefaultPii: false;
  dataCollection: { userInfo: false; httpBodies: [] };
  initialScope: { tags: { app: 'landing' } };
}

const APP = 'landing' as const;

export function buildSentryOptions(input: {
  dsn: string | undefined;
  release: string | undefined;
  environment: string | undefined;
}): SentryFrontendInit | null {
  if (!input.dsn) return null;
  return {
    dsn: input.dsn,
    environment: input.environment ?? 'dev',
    ...(input.release !== undefined ? { release: input.release } : {}),
    sampleRate: 1,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    dataCollection: { userInfo: false, httpBodies: [] },
    initialScope: { tags: { app: APP } },
  };
}
```

Create `apps/landing/src/vite-env.d.ts` (identical in admin — the keys are shared):

```ts
/// <reference types="vite/client" />

// The public-by-design Sentry vars (M6 #184): Vite bakes VITE_-prefixed
// process env into import.meta.env at build (highest priority — CI's deploy
// legs export them; locally they are absent, which is the no-op posture).
interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
}
```

Create `apps/landing/src/instrument.ts` (the admin twin differs only in the `./lib/sentry` import's app tag inside that file):

```ts
// The Sentry init (M6 #184) — imported as the FIRST import of src/router.tsx
// so it runs before any route module, in every runtime the router loads:
// the browser bundle (client errors — the AC's forced client error), the
// deployed Worker's SSR graph, and vite dev. @sentry/tanstackstart-react's
// conditional exports resolve per environment (browser build on the client,
// server build under workerd), so ONE init site covers both sides. This
// REPLACES the scaffold's instrument.server.mjs (node --import), which
// provably never executed in the deployed Worker — nothing imported it
// (wrangler deploy --dry-run, 2026-10-06: the file rode the bundle as a
// dead module).
import { init } from '@sentry/tanstackstart-react';
import { buildSentryOptions } from './lib/sentry';

const options = buildSentryOptions({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_SENTRY_RELEASE,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
});

if (!options) {
  console.warn('VITE_SENTRY_DSN is not defined. Sentry is not running.');
} else {
  init(options);
}
```

Modify `apps/landing/src/router.tsx` and `apps/admin/src/router.tsx` — insert as line 1, before every other import:

```ts
import './instrument';
```

- [ ] **Step 4: Run the builder suites to verify they pass**

Run: `pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/admin test`
Expected: PASS — each app +1 file / +4 tests, all pre-existing green.

- [ ] **Step 5: Retire the dead scaffold**

Delete `apps/landing/instrument.server.mjs` and `apps/admin/instrument.server.mjs` (`git rm`). In BOTH `package.json`s, replace the three scaffold-wired scripts:

```json
    "dev": "dotenv -e .env.local -- vite dev --port 3000",
    "build": "vite build",
    "start": "node dist/server/index.js",
```

(leave every other script untouched). In BOTH `biome.json`s, drop the now-dead exclusion so the includes read:

```json
    "includes": ["!src/routeTree.gen.ts", "!!**/.output", "!!**/dist"]
```

- [ ] **Step 6: The turbo env-hash fix**

In root `turbo.json`, the build task's `env` array gains the trio (a future remote cache must never reuse a DSN-less build for a DSN-ful deploy — the check job builds without them, each deploy leg with them):

```json
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".output/**", "dist/**"],
      "env": ["NODE_ENV", "VITE_SENTRY_DSN", "VITE_SENTRY_RELEASE", "VITE_SENTRY_ENVIRONMENT"]
    },
```

- [ ] **Step 7: The bake gate — prove the DSN lands in both bundles**

Run:

```bash
VITE_SENTRY_DSN=https://probe-dsn@o0.ingest.sentry.io/0 VITE_SENTRY_RELEASE=probe-sha VITE_SENTRY_ENVIRONMENT=probe pnpm --filter @sevendays/landing run build
grep -rl "probe-dsn@o0.ingest.sentry.io" apps/landing/dist/client/ | head -3
grep -rl "probe-dsn@o0.ingest.sentry.io" apps/landing/dist/server/ | head -3
VITE_SENTRY_DSN=https://probe-dsn@o0.ingest.sentry.io/0 VITE_SENTRY_RELEASE=probe-sha VITE_SENTRY_ENVIRONMENT=probe pnpm --filter @sevendays/admin run build
grep -rl "probe-dsn@o0.ingest.sentry.io" apps/admin/dist/client/ | head -3
grep -rl "probe-dsn@o0.ingest.sentry.io" apps/admin/dist/server/ | head -3
```

Expected: every grep lists ≥1 file (the DSN is baked into the CLIENT bundle — client errors carry the DSN — and the SSR bundle — the Worker's init sees it). Save the output to `.superpowers/sdd/2026-10-06-184-sentry-all-apps/frontend-bake-grep.txt`. Then rebuild BOTH apps WITHOUT the probe env (`pnpm --filter @sevendays/landing run build && pnpm --filter @sevendays/admin run build`) so no probe DSN survives in any dist a later step might deploy.

- [ ] **Step 8: Gate + commit**

Run: `pnpm check && pnpm build`
Expected: green everywhere (biome/typecheck over the new files; the deleted `.mjs` had no importers).

```bash
git add apps/landing/src apps/admin/src apps/landing/package.json apps/admin/package.json apps/landing/biome.json apps/admin/biome.json turbo.json
git commit -m "feat(web): the frontends' Sentry init — errors-only, live in the deployed Worker (#184)"
```

(the `.mjs` deletions were already staged by Step 5's `git rm` — nothing further to add for them here)

### Task 5: CI — release/environment tagging + the DSN sync + the VITE bake envs

**Files:**
- Modify: `.github/workflows/ci.yml` — the `deploy-teaser` and `deploy-v1` jobs only (the `check` job is untouched)

**Interfaces:**
- Consumes: GitHub environment `teaser` / `v1` — **owner prerequisites, recorded in Task 6's close-out**: `SENTRY_DSN` (secret) and `VITE_SENTRY_DSN` (variable) in the teaser environment (v1 gets its own at cutover — the ship runbook's rotation list already accounts for it).
- Produces: deploys that tag releases as the deployed git SHA with dev/teaser/v1 distinguishable (AC 3) and bake the frontends' DSN (AC 2's deployed half).

**Not here:** the check job; any secrets value (the owner sets them — never in the file); the ship runbook (#191); workflow restructuring.

- [ ] **Step 1: The env-block additions (both legs)**

In `deploy-teaser`'s `env:` block, after the `R2_S3_SECRET_ACCESS_KEY` line:

```yaml
      SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
      SENTRY_RELEASE: ${{ github.sha }}
      VITE_SENTRY_DSN: ${{ vars.VITE_SENTRY_DSN }}
      VITE_SENTRY_RELEASE: ${{ github.sha }}
      VITE_SENTRY_ENVIRONMENT: teaser
```

In `deploy-v1`'s `env:` block, the same five lines with `VITE_SENTRY_ENVIRONMENT: v1`.

- [ ] **Step 2: The api deploy steps gain the two --var flags**

`deploy-teaser`'s api deploy step becomes:

```yaml
        run: pnpm exec wrangler deploy --name sevendays-api --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "MEDIA_PUBLIC_BASE_URL:$MEDIA_PUBLIC_BASE_URL" --var "SENTRY_RELEASE:$SENTRY_RELEASE" --var "ENVIRONMENT:teaser"
```

`deploy-v1`'s becomes the same with `--name sevendays-v1-api` and `--var "ENVIRONMENT:v1"`.

- [ ] **Step 3: The SENTRY_DSN sync steps (the R2 skip-notice pattern)**

In `deploy-teaser`, immediately after the R2 S3-token sync step:

```yaml
      - name: Sync api SENTRY_DSN secret (skip until the owner creates the Sentry project)
        working-directory: apps/api
        run: |
          if [ -z "$SENTRY_DSN" ]; then
            echo '::notice::SENTRY_DSN secret missing from the teaser GitHub environment — Sentry stays no-op on the api (one project "sevendays", M6 #184)'
            exit 0
          fi
          printf '%s' "$SENTRY_DSN" | pnpm exec wrangler secret put SENTRY_DSN --name sevendays-api
```

In `deploy-v1`, the same step with `--name sevendays-v1-api` and the notice naming the v1 environment.

- [ ] **Step 4: Re-read diff + commit**

The landing/admin deploy steps need NO edits (their DSN is baked at build from the job env — Step 1's additions reach the build steps by inheritance; Task 4's turbo env-hash makes the cache respect it). Re-read the full `git diff .github/workflows/ci.yml` once against the steps above — the file has no mechanical gate; the teaser deploy on merge (Task 6) is the live proof.

```bash
git add .github/workflows/ci.yml
git commit -m "ci: SENTRY_RELEASE + ENVIRONMENT ride the deploy legs; SENTRY_DSN syncs, VITE_SENTRY_* bakes (#184)"
```

### Task 6: Full gates, docs rotation, PR/merge, ledger, close

**Files:**
- Modify: `docs/plan.md` (M6 checkbox 2), `docs/progress.md`, `AGENTS.md` (status bullet + the api floors line)
- Post-merge on main: `docs/agents/v1-picks.md` (ledger row)
- No code files.

**Interfaces:**
- Consumes: Tasks 1–5 landed on `feat/184-sentry-all-apps`.
- Produces: the merged PR, the ticked M6 box, the ledger row, the closed ticket.

**Not here:** the smoke/runbook tickets' boxes; the Analytics Dashboard's Sentry link-out (#186/#187); the ship-time token rotation (#191 — the spec's accounting already lists `SENTRY_DSN`/`VITE_SENTRY_DSN`/`SENTRY_RELEASE` there).

- [ ] **Step 1: The full-repo gates**

Run: `docker compose up -d db && pnpm check && pnpm build`
Expected: green; api = **27 files passed + 1 skipped (28) / 323 passed + 3 skipped**; api-client 5 files / 33 tests (unchanged); landing +1 file / +4 tests; admin +1 file / +4 tests. Any different count → reconcile against the per-task expectations above — do not loosen assertions.

- [ ] **Step 2: `docs/plan.md` — tick M6 box 2**

Replace the unchecked Sentry box (line 147) with:

```markdown
- [✅] Sentry wired into `apps/api` (Workers SDK) **and the frontends' dormant scaffold initialized** — one project, `release` = git SHA, environments dev/teaser/v1; api errors + traces 100%, frontends errors-only _(landed 2026-10-06 via #184 — @sentry/cloudflare 10.72.0's withSentry wraps the Hono app at src/worker.ts, the wrangler main; capture rides the #183 onError seam + the email waitUntil catch through an injectable no-op-by-default seam (4xx never — structural); the frontends init at src/instrument.ts imported first from router.tsx — client + SSR + dev from one site — errors-only at sampleRate 1 / tracesSampleRate 0, PII off, the scaffold's instrument.server.mjs deleted (provably never executed in deploys); `release` = the `SENTRY_RELEASE` --var from github.sha, `ENVIRONMENT` var per leg, per-app tags, `VITE_SENTRY_*` baked at build with the turbo env-hash fix)_
```

- [ ] **Step 3: `docs/progress.md` + `AGENTS.md`**

In `docs/progress.md`'s M6 section, add the #184 landed bullet beside #183's (same voice: what is now live — Sentry live on all three apps, the tagging scheme, the capture posture, the no-op-without-DSN dev posture, and the owner prerequisites: one "sevendays" project + `SENTRY_DSN`/`VITE_SENTRY_DSN` in the teaser GitHub environment).

In `AGENTS.md`: extend the observability status sentence (the one naming the Application Log, M6 #183) with: Sentry live on all three apps (M6 #184) — the api via `@sentry/cloudflare` 10.72.0 (`withSentry` wrap at `src/worker.ts`; every 5xx + the curated 503 + email-send failures captured through the injectable seam, 4xx log-only, errors + traces 100%), the frontends errors-only via `src/instrument.ts` (no traces, no replay), one "sevendays" project, `release` = the deployed SHA via CI's `SENTRY_RELEASE` var, `environment` = dev/teaser/v1, per-app tags, `sendDefaultPii: false`. And update the floors line to: `Floors: api 27 files passed + 1 skipped (28) / 323 passed + 3 skipped; api-client 5 files / 33 tests.`

- [ ] **Step 4: PR + squash-merge**

```bash
git add docs/plan.md docs/progress.md AGENTS.md
git commit -m "docs: M6 box 2 ticked — Sentry live on all three apps (#184)"
gh pr create --title "feat: M6 ticket 02 — Sentry live on all three apps (#184)" --body "Implements #184. The api via @sentry/cloudflare 10.72.0 (withSentry wrap at src/worker.ts; onError + email-waitUntil captures through an injectable, no-op-by-default seam — 4xx log-only, errors + traces 100%); the frontends errors-only via src/instrument.ts imported first from router.tsx (client + SSR + dev, the dead instrument.server.mjs scaffold deleted); one project, release = github SHA via SENTRY_RELEASE, environment = dev/teaser/v1, per-app tags, sendDefaultPii false; CI tags + DSN sync + VITE_SENTRY_* bake with the turbo env-hash fix. pnpm check + pnpm build green; api 27+1 skipped files / 323+3 skipped tests." --base main
```

Squash-merge on green CI (the teaser deploy leg proves Task 5 live: the `--var` flags parse, the skip-notice fires while `SENTRY_DSN` is unset).

- [ ] **Step 5: The v1-pick ledger (post-merge, on main)**

Per the spec's v1-pick table this payload is **PICK clean** (`ci.yml` is byte-identical main↔v1; the var-passing hunk picks; `SENTRY_RELEASE` values differ per environment, not per branch). Add the ledger row to `docs/agents/v1-picks.md` following the #183 row's shape, then:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — #184 Sentry live on all three apps picked (#184)"
```

- [ ] **Step 6: graphify + close the ticket**

Run: `graphify update .` (code was modified). Then close #184 with a comment carrying the owner verification recipe (the AC's console checks, owner-operated once the Sentry project exists):

> **Owner steps to see events in the console (AC 1–3):** (1) create ONE Sentry project named `sevendays` (sentry.io, free tier); (2) put its DSN in the teaser GitHub environment as `SENTRY_DSN` (secret) + `VITE_SENTRY_DSN` (variable) — deploys after that capture (unset, everything stays no-op, by design); (3) forced api 5xx: stop the local db (`docker compose stop db`) and `curl http://localhost:8787/api/v1/branches` with `SENTRY_DSN` in `.dev.vars` — the DrizzleQueryError appears tagged `environment: dev, app: api` (release unset locally — CI deploys carry it as the git SHA); a 400 (garbage-body POST to `/api/v1/appointments`) never appears; (4) the curated 503 + email failures ride real traffic (presign without R2 tokens / a Resend outage); (5) a frontend client error: run the landing with `VITE_SENTRY_DSN` set and throw once from a component locally (never committed) — it appears with `app: landing`, no traces, no replay. The capture behavior itself is pinned by the vitest suites (`test/sentry-capture.test.ts`, the appointments + media-routes additions, both apps' `src/lib/sentry.test.ts`).

Then: `gh issue close 184 --comment "…"`.



