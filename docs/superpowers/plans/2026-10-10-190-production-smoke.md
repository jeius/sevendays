# The production smoke — the verify gate's executable leg (#190) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the verify gate's executable second leg — a seven-assertion, presence/status-level Playwright suite in `e2e/smoke/` that walks a deployed environment end to end (api health, landing home, CMS-fed surface, a live media asset, the booking page serving, the admin sign-in page, and a real `smoke-staff` sign-in reaching the Analytics Dashboard), wired into the #189 foundation's nightly + dispatch workflow with baseURL and credentials parameterized from the chosen GitHub environment.

**Architecture:** One new spec file + one tiny env helper under `e2e/smoke/` (the root Playwright package is chromium-only and walks deployed environments only — never a webServer, never part of `pnpm check`). The suite reads five environment variables (`E2E_BASE_URL` from the config, plus `E2E_API_URL`, `E2E_ADMIN_URL`, `E2E_SMOKE_STAFF_EMAIL`, `E2E_SMOKE_STAFF_PASSWORD`); each is consumed by exactly the legs that need it and fails its own test with a curated message when unset — never a silent skip. The workflow derives the two URLs from the environment's own `API_URL`/`BETTER_AUTH_URL` vars (one source of truth) and passes the credentials from two new environment secrets. The dev `smoke-staff` account is provisioned owner-side per the staff runbook (least privilege: `--role staff`). #189's one-probe `foundation.spec.ts` is deleted — its own comment and the e2e README rule it superseded the moment the seven landed, and assertion 2 is its strict superset.

**Tech Stack:** `@playwright/test` 1.63.0 (pinned in the root `package.json` — `waitForResponse`, the `request` fixture, `waitForURL`, and `context().cookies()` all grep-verified in `playwright-core@1.63.0/types/types.d.ts`), GitHub Actions environment vars/secrets via `gh`, Biome root config (`pnpm fix:root`), the `gh` CLI + `scripts/v1-triage.mjs` for the v1 pick.

**Spec:** GitHub issue #190 (`ready-for-agent`), parent spec #182 → `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` § *The verify gate — the production smoke* (§ rulings: seven presence-level assertions never content-text; read-only plus exactly the one sign-in act; nightly walks teaser, dispatch walks any named target; one suite, env-parameterized). **Sibling fence:** #191 (the ship-provisioning runbook — its final step *invokes* this smoke but the doc is not written here) and #192 (M6 close-out) stay open after this lands; the v1-environment values (`E2E_BASE_URL`, the `smoke-staff` secrets for `v1`) are ship-side runbook steps, never this ticket's. Blockers #189 and #186 are closed.

## Recon state this plan starts from (verified live 2026-10-10, pre-plan)

- **Main is at `dee941d`** (the #188 ledger-row commit). Blockers closed: #189 (foundation, PR #194) and #186 (dashboard). Open M6 siblings: #190 (this), #191, #192.
- **The foundation on disk:** `playwright.config.ts` (chromium-only, `testDir: './e2e'`, `E2E_BASE_URL` fail-fast with a curated message, `forbidOnly` in CI, 1 retry in CI); `e2e/smoke/foundation.spec.ts` (one probe: `/` answers 200 over chromium); `e2e/README.md` (Running + Taxonomy + Rulings); `.github/workflows/e2e.yml` (nightly cron `7 19 * * *` + `workflow_dispatch` with an `environment` choice of `teaser`/`v1`, job-level `environment:` gate, `E2E_BASE_URL: ${{ vars.E2E_BASE_URL }}`, cached browsers, report artifact on failure).
- **GitHub environments (probed with `gh variable list`):** `teaser` carries `E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev`, `API_URL=https://sevendays-api.pahamajulius.workers.dev`, `BETTER_AUTH_URL=https://sevendays-admin.pahamajulius.workers.dev` — all slash-free (verified: no trailing slashes). `v1` carries `API_URL`/`BETTER_AUTH_URL` on the `sevendays-v1-*` workers but **no `E2E_BASE_URL` yet** — that is ship-side (#191's runbook step), fenced out of this plan.
- **Live probes against teaser (2026-10-10):** `GET /health` → 200; `GET /api/v1/gallery` → 200 with 4 categories and `photos[].photoUrl` values on `https://pub-0e2d375a0ded418f84366c03cf37e4a8.r2.dev/gallery/<uuid>.jpg` — **the gallery is stocked**, so assertion 4's premise (a live asset in the payload) holds today; an emptied gallery must fail the smoke by design, not skip.
- **The surfaces the assertions pin (exact):** the health route is root-level at `apps/api/src/index.ts:57` (`.get('/health', (c) => c.json({ status: 'ok' }))`); `/about` renders the static-chrome `Portfolio` `<h2>` at `apps/landing/src/routes/about.tsx:61` and its loader awaits the gallery + testimonial reads (a failing read fails the page — 200 proves the landing→api→db path served a ruled render); `/book`'s wizard starts at step 1 (`useState<1 | 2 | 3 | 4 | 5>(1)` at `apps/landing/src/lib/booking.ts:281`) so `section[data-step='1']` renders on load, and the page is only ever loaded, never submitted; the admin login form is `#login-email` (`login.tsx:114`) / `#login-password` (`:125`) / a `<Button type='submit'>Sign in</Button>`, posting via `authClient` to the admin origin's BetterAuth catch-all; the `_shell` gate (`_shell.tsx` `beforeLoad`) bounces sessionless arrivals to `/login`, so the dashboard rendering at `/` after sign-in IS a session-gated fetch having answered; the dashboard's `PageHeader` renders its title as the screen's `<h1>` (`apps/admin/src/components/cms/shared.tsx:59`) — `Analytics` on `/`.
- **Deliberately NOT pinned:** TanStack server-fn RPC URLs. `@tanstack/react-start` floats `latest` in the admin's `package.json`, so the smoke never asserts on the dashboard's internal fetch endpoints — the sign-in POST (`/api/auth/sign-in/email`, BetterAuth 1.7.5's fixed route) and the shell gate's observable behavior (render at `/` vs bounce to `/login`) are the stable seams.
- **The staff runbook (`docs/staff-provisioning.md`):** `pnpm --filter @sevendays/admin create-staff --email <email> --name "<name>"` prompts for the password interactively (it never rides a flag/file/argument — the runbook's ruling, which is why provisioning is an owner gate below); a trailing `--role staff` overrides the script's hardcoded admin role (spike-verified 2026-09-24); `minPasswordLength: 12`; the production session cookie is `__Secure-`-prefixed (`__Secure-better-auth.session_token`); dev-side sign-in verifies with `POST /api/auth/sign-in/email` → `200` + `set-cookie`.
- **v1-pick posture (pre-ruled in spec #182's pick table):** the Playwright foundation and the smoke suite are **MAIN-ONLY, never picked** — `scripts/seed-v1/paths.txt` already lists `e2e`, `playwright.config.ts`, `.github/workflows/e2e.yml`, and `docs/superpowers`, so the only v1-path this PR can touch is `docs/progress.md`, whose hunk names the teaser/nightly (edition mechanics → dropped) — expected final verdict **SKIP** (Task 5).
- **The root package is not a turbo workspace member** — `pnpm check`/`pnpm build` cannot see `e2e/` and cannot move; the gates that DO cover the new files are `pnpm fix:root` (root biome) and the suite's own runs. `playwright-report/`, `test-results/`, `playwright-browsers/` are all gitignored (`.gitignore:34-36`).
- **`docs/progress.md` is a head-log:** the newest entry sits directly under `# Progress` (line 3 is the #188 entry dated 2026-10-10) — Task 4's entry is inserted ABOVE it, not appended at a section tail.
- **No new dependencies.** The root `package.json` keeps exactly its current devDeps; the smoke needs nothing beyond `@playwright/test`. In particular `@sevendays/types`/zod is deliberately NOT added — the gallery payload read uses a structural guard-throw with a curated message (see Global Constraints), keeping the root package thin per the #189 ruling.

## Global Constraints

- **The seven assertions, verbatim names (the suite's whole content — nothing else is tested):** `api /health answers 200 with its fixed body` · `the landing home renders` · `the CMS-fed /about surface renders` · `a media asset loads from the live gallery payload` · `the booking form page serves` · `the admin sign-in page serves` · `a smoke-staff sign-in reaches the authenticated surface`. Presence/status-level only, never content-text — copy is CMS editorial state, empty states are legitimate renders; every selector pins app chrome (form ids, section landmarks) or a fixed route contract.
- **Mutation posture (AC + spec ruling):** read-only plus exactly ONE act — the sign-in (a session row, harmless by construction). No booking POSTs (real production rows), no CMS writes (the Audit Log would record junk). `/book` is loaded, never submitted; the spec file's only click is the `Sign in` button.
- **Pinned assertion literals:** `/health` must answer `200` with body exactly `{ status: 'ok' }` (the route's fixed code contract at `apps/api/src/index.ts:57`); the media asset comes from `photos[0].photoUrl` of the LIVE `GET /api/v1/gallery` payload — nothing hardcoded — and its GET must answer `200` with a `content-type` starting `image/`; the session cookie's exact production name is `__Secure-better-auth.session_token` (staff runbook).
- **The environment contract:** `E2E_API_URL`, `E2E_ADMIN_URL`, `E2E_SMOKE_STAFF_EMAIL`, `E2E_SMOKE_STAFF_PASSWORD` — read through `requiredEnv(name)` called INSIDE the consuming test (never module scope), failing only that leg with the curated message. CI wiring (Task 2): `E2E_API_URL: ${{ vars.API_URL }}`, `E2E_ADMIN_URL: ${{ vars.BETTER_AUTH_URL }}` (derived from the environment's own vars — one source of truth), credentials from the two environment secrets. All URL values are slash-free today; the suite joins paths with template literals and does not normalize.
- **smoke-staff provisioning (owner-operated, per `docs/staff-provisioning.md`):** role `staff` (least privilege — the dashboard is any-staff surface; owner-only screens stay unexercised), display name `Smoke Staff`, email owner-chosen (the value lives only in the GitHub environment, never the repo), password ≥ 12 chars generated by the owner (`openssl rand -base64 24` suggested) — sealed as `teaser` environment secrets via `gh secret set`. The credentials never enter the repo, a commit, or a log line; the executor verifies presence by NAME only (`gh secret list -e teaser`) and never needs the values — the authoritative full-suite proof is the dispatch run (Task 5).
- **Deletion ruling:** `e2e/smoke/foundation.spec.ts` is deleted in Task 1 — the file's own comment ("this file is their doorway, superseded as they land") and the e2e README anticipate it, and assertion 2 is its strict superset.
- **No TanStack RPC pinning** (recon ruling): the smoke asserts on BetterAuth's fixed `/api/auth/sign-in/email` route and on gate-observable behavior only.
- **Gates, per task:** `pnpm fix:root` clean on the touched files before every commit; full `pnpm check` (**35/35**) + `pnpm build` green before the PR (they cannot have moved — no workspace code is touched; run them anyway, the house gate); the local public-core run (Task 1) must show exactly **6 passed / 1 failed** with the curated `E2E_SMOKE_STAFF_EMAIL` message; the dispatch run (Task 5) must show **7 passed**.
- **Baselines (unchangeable by this plan — no app/package source moves):** api **27 files passed + 1 skipped / 338 passed + 3 skipped**; api-client **5 / 33**; admin **17 / 164**; landing + types suites unchanged. If any floor moved at Step 0, something is wrong with the branch — stop and re-derive before continuing.
- **Docs house rules:** `docs/progress.md` entry at the HEAD of the log (above the #188 entry); GitHub issue checkboxes flip with `- [x]` (#190's five AC boxes flip at close-out, Task 5); repo-docs checklist ticks are `- [✅]` (none here); every squash-merged PR gets its v1 triage (`docs/agents/v1-picks.md`) — this one's expected verdict is **SKIP**; `graphify update .` runs after the code lands but its churn is never committed by this plan (the pre-existing dirty `graphify-out/` state belongs to the owner's next graph commit; every `git add` names its files).
- **Scope fence ("not here"):** NO ship-provisioning runbook content (#191); NO M6 close-out (#192); NO `v1` GitHub-environment values (its `E2E_BASE_URL` + smoke-staff secrets are ship-side runbook steps); NO `e2e/visual/` (M7), NO firefox/webkit projects (later smoke-breadth addition per ADR-0022); NO PR-gating change (ci.yml untouched — commit-green and smoke-green stay separate verdicts); NO api/admin/landing/`packages/*` source change; NO local-dev-server smoke (deployed environments only); NO new dependencies; NO credential value anywhere in repo content.
- **Plan file target:** `docs/superpowers/plans/2026-10-10-190-production-smoke.md` (this file).

---

### Task 1: The seven-assertion suite

**Files:**
- Create: `e2e/smoke/env.ts` (the fail-fast environment reader)
- Create: `e2e/smoke/production.spec.ts` (the seven assertions)
- Delete: `e2e/smoke/foundation.spec.ts` (superseded — Global Constraints' deletion ruling)
- Modify: `e2e/README.md` (Running section + the Taxonomy `smoke/` bullet)

**Interfaces:**
- Consumes: the foundation's `playwright.config.ts` (`E2E_BASE_URL`, chromium-only, `testDir: './e2e'`) — untouched except a Task 2 comment refresh.
- Produces: `requiredEnv(name: string): string` from `e2e/smoke/env.ts`, and the four env-var names above — Task 2's workflow mappings and Task 5's dispatch verification target exactly these.

- [ ] **Step 0: Cut the branch and re-pin the baseline**

```bash
cd /home/jeius/Projects/sevendays
git checkout main && git pull --ff-only
git log --oneline -1   # expect dee941d or later
git checkout -b feat/190-production-smoke
pnpm install && pnpm build:packages
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: api `27 passed | 1 skipped (28)` files / `338 passed | 3 skipped (341)` tests — the AGENTS.md floor. If it moved, record the new floor in the PR body (Task 5 Step 2) and continue; this plan touches no workspace code, so nothing else derives from it.

- [ ] **Step 1: Write `e2e/smoke/env.ts`**

Create the file with exactly this content:

```ts
// The smoke's environment contract (M6 #190): the suite walks a DEPLOYED
// environment, so the api/admin targets and the sign-in credentials arrive
// as environment variables — the workflow passes them from the chosen
// GitHub environment's vars and secrets (.github/workflows/e2e.yml).
// Called inside the tests that consume each value, never at module scope:
// a missing value fails ONLY its own leg with this curated message — the
// same posture as E2E_BASE_URL in playwright.config.ts (a smoke run with a
// guessed target or a silently skipped leg is worse than a red test that
// names its fix).
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Locally: export it before pnpm test:e2e. In CI: it comes from the workflow's GitHub environment (teaser/v1) — see .github/workflows/e2e.yml.`,
    );
  }
  return value;
}
```

- [ ] **Step 2: Write `e2e/smoke/production.spec.ts`**

Create the file with exactly this content (let Step 5's `pnpm fix:root` reflow line breaks; never reword strings):

```ts
import { expect, test } from '@playwright/test';

import { requiredEnv } from './env';

// The production smoke (M6 #190) — the verify gate's executable leg (spec
// #182 § The verify gate — the production smoke; ADR-0022's second
// verdict: commit-green and smoke-green stay separate). Seven
// presence/status-level assertions over the deployed stack, NEVER
// content-text — copy is CMS editorial state and empty states are
// legitimate renders; every selector pins app chrome (form ids, section
// landmarks) or a fixed route contract. Mutation posture: read-only plus
// exactly ONE act — the sign-in (a session row, harmless by construction);
// no booking POSTs (real production rows), no CMS writes (the Audit Log
// would record junk). The nightly walks teaser; a dispatch run walks any
// named target — v1 at ship, the ship runbook's final step.
//
// Legs needing more than E2E_BASE_URL fail their own test with the curated
// requiredEnv message when their variable is unset — a missing credential
// is a red leg with a named fix, never a silent skip.

// (1) The api's root-level liveness route — the JSON body is the route's
// fixed contract (apps/api/src/index.ts), not editorial content.
test('api /health answers 200 with its fixed body', async ({ request }) => {
  const apiBaseUrl = requiredEnv('E2E_API_URL');
  const response = await request.get(`${apiBaseUrl}/health`);
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: 'ok' });
});

// (2) The landing home renders — the deployed frontend answers over
// chromium. Supersedes #189's one-probe foundation spec (deleted with this
// suite's landing): the hero h1 is app chrome, present in every state.
test('the landing home renders', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1').first()).toBeVisible();
});

// (3) A CMS-fed landing surface renders — /about's loader awaits the
// gallery + testimonial reads (the landing→api→db path on real domains);
// a failing read fails the page, so 200 + the Portfolio section proves a
// ruled render served (data or the pinned empty state — both legitimate).
test('the CMS-fed /about surface renders', async ({ page }) => {
  const response = await page.goto('/about');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Portfolio', exact: true })).toBeVisible();
});

// (4) A media asset loads — its URL pulled from the LIVE gallery payload
// and GET'd: nothing hardcoded, guarding the MEDIA_PUBLIC_BASE_URL flip
// and the copied-across gallery. An empty payload is a red leg by design —
// a shipped site with no work on the walls defeats the media copy (the
// ship runbook orders media before the smoke).
test('a media asset loads from the live gallery payload', async ({ request }) => {
  const apiBaseUrl = requiredEnv('E2E_API_URL');
  const payload = await request.get(`${apiBaseUrl}/api/v1/gallery`);
  expect(payload.status()).toBe(200);
  const body = (await payload.json()) as { photos?: { photoUrl?: string }[] };
  const assetUrl = body.photos?.[0]?.photoUrl;
  if (!assetUrl) {
    throw new Error(
      'the live gallery payload carries no photoUrl — an empty gallery is a red smoke, not a skip',
    );
  }
  const asset = await request.get(assetUrl);
  expect(asset.status()).toBe(200);
  expect(asset.headers()['content-type']?.startsWith('image/')).toBe(true);
});

// (5) The booking form page serves — loads, NEVER submits (one booking
// POST would plant a real row in the studio's calendar). The wizard's
// initial step section is app chrome.
test('the booking form page serves', async ({ page }) => {
  const response = await page.goto('/book');
  expect(response?.status()).toBe(200);
  await expect(page.locator("section[data-step='1']")).toBeVisible();
});

// (6) The admin sign-in page serves — public, outside the _shell gate.
test('the admin sign-in page serves', async ({ page }) => {
  const adminBaseUrl = requiredEnv('E2E_ADMIN_URL');
  const response = await page.goto(`${adminBaseUrl}/login`);
  expect(response?.status()).toBe(200);
  await expect(page.locator('#login-email')).toBeVisible();
});

// (7) A real smoke-staff sign-in works — the suite's ONE act. The
// BetterAuth email sign-in POST is version-pinned (1.7.5) at the admin
// origin's /api/auth catch-all; its 200 + the __Secure- session cookie +
// the dashboard rendering at / (the _shell gate's own session-gated
// getSession answered — a failed gate bounces to /login) together prove
// the authenticated surface lives. TanStack server-fn RPC URLs are
// deliberately NOT asserted: @tanstack/react-start floats latest, and the
// gate is the stable session-gated fetch by construction.
test('a smoke-staff sign-in reaches the authenticated surface', async ({ page }) => {
  const adminBaseUrl = requiredEnv('E2E_ADMIN_URL');
  const email = requiredEnv('E2E_SMOKE_STAFF_EMAIL');
  const password = requiredEnv('E2E_SMOKE_STAFF_PASSWORD');

  await page.goto(`${adminBaseUrl}/login`);
  const signIn = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/auth/sign-in/email' &&
      response.request().method() === 'POST',
  );
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  expect((await signIn).status()).toBe(200);
  await page.waitForURL(`${adminBaseUrl}/`);
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();

  // The production session cookie is __Secure--prefixed (the staff
  // runbook): its presence is the session row's client-side receipt.
  const sessionCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === '__Secure-better-auth.session_token',
  );
  expect(sessionCookie).toBeTruthy();
});
```

- [ ] **Step 3: Delete the superseded foundation spec**

```bash
cd /home/jeius/Projects/sevendays
git rm e2e/smoke/foundation.spec.ts
```

- [ ] **Step 4: The e2e README — Running + Taxonomy**

Replace the `## Running` section (old → new):

```markdown
## Running

```bash
pnpm exec playwright install chromium   # once per machine (~150 MB)
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev pnpm test:e2e
```

`E2E_BASE_URL` has no default on purpose: the config fails fast with a curated message when it is unset — a smoke run against the wrong target is worse than no run.
```

```markdown
## Running

```bash
pnpm exec playwright install chromium   # once per machine (~150 MB)
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
E2E_ADMIN_URL=https://sevendays-admin.pahamajulius.workers.dev \
pnpm test:e2e
```

`E2E_BASE_URL` has no default on purpose: the config fails fast with a curated message when it is unset — a smoke run against the wrong target is worse than no run. The three URLs cover the six public legs; the authenticated leg additionally wants `E2E_SMOKE_STAFF_EMAIL` + `E2E_SMOKE_STAFF_PASSWORD` (the dev `smoke-staff` account, provisioned per `docs/staff-provisioning.md`, sealed in the GitHub environment) — without them that one leg fails with the same curated posture, never a silent skip. In CI all five values arrive from the workflow's GitHub environment (`.github/workflows/e2e.yml`).
```

Replace the Taxonomy `smoke/` bullet (old → new):

```markdown
- `smoke/` — deployed-stack presence assertions. The one-probe foundation spec is #189's; #190 lands the seven production assertions (health, home, CMS-fed surface, live media asset, booking page serves, admin sign-in page, real staff sign-in).
```

```markdown
- `smoke/` — the production smoke (#190, spec #182 § The verify gate): seven presence/status-level assertions over the deployed stack — api health, the landing home, the CMS-fed /about surface, a live media asset URL'd from the gallery payload, the booking page serving (never submitting), the admin sign-in page, and a real `smoke-staff` sign-in reaching the Analytics Dashboard. #189's one-probe foundation spec was this suite's doorway and is superseded (deleted when the seven landed).
```

(The Rulings section's read-only bullet already names #190's posture — it stays.)

- [ ] **Step 5: Format + the local public-core run (the designed pre-gate observable)**

```bash
cd /home/jeius/Projects/sevendays
pnpm fix:root && pnpm lint:root
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
E2E_ADMIN_URL=https://sevendays-admin.pahamajulius.workers.dev \
pnpm test:e2e
```

Expected: biome clean (it may reflow the new files' line breaks — fine, strings are untouched); then the suite reports **6 passed, 1 failed** — the failure is `a smoke-staff sign-in reaches the authenticated surface` with the curated `E2E_SMOKE_STAFF_EMAIL is not set.` message (the owner gate is Task 3; the dispatch run in Task 5 is the full-suite proof). Any OTHER failure is a real defect — diagnose before committing. (First run on a machine needs `pnpm exec playwright install chromium`.)

- [ ] **Step 6: Commit**

```bash
cd /home/jeius/Projects/sevendays
git add e2e/smoke/env.ts e2e/smoke/production.spec.ts e2e/README.md
git commit -m "feat(e2e): the production smoke — the verify gate's seven-assertion executable leg (#190)"
```

(`foundation.spec.ts` is already staged by `git rm`.) The commit carries exactly three added/modified files plus the deletion — `git status --porcelain` shows nothing else swept in (the pre-existing dirty `graphify-out/`/CONTEXT files stay untouched).

**Not here:** no workflow wiring (Task 2); no smoke-staff provisioning (Task 3, owner gate); no `playwright.config.ts` edit (Task 2); no progress entry (Task 4).

---

### Task 2: The workflow wiring + the config comment refresh

**Files:**
- Modify: `.github/workflows/e2e.yml:31-33` (the job `env:` block)
- Modify: `playwright.config.ts:3-10` (the header comment — #190 has landed by the time this PR merges, so its future tense goes stale)

**Interfaces:**
- Consumes: Task 1's four env-var names + `requiredEnv`'s curated CI hint (it names `.github/workflows/e2e.yml` — this task is why that hint is true).
- Produces: the CI env contract Task 3's secrets and Task 5's dispatch run exercise.

- [ ] **Step 1: The `env:` block (e2e.yml)**

Replace the block (old → new):

```yaml
    env:
      PLAYWRIGHT_BROWSERS_PATH: ${{ github.workspace }}/playwright-browsers
      E2E_BASE_URL: ${{ vars.E2E_BASE_URL }}
```

```yaml
    env:
      PLAYWRIGHT_BROWSERS_PATH: ${{ github.workspace }}/playwright-browsers
      E2E_BASE_URL: ${{ vars.E2E_BASE_URL }}
      # The smoke's other two targets + the sign-in credentials (#190),
      # sourced from the SAME GitHub environment the job declared: the
      # api/admin URLs derive from the deployment's own vars (one source
      # of truth — the v1 environment carries its own values, and the
      # ship runbook owns setting them at cutover), and the smoke-staff
      # credentials are environment secrets, never repo content.
      E2E_API_URL: ${{ vars.API_URL }}
      E2E_ADMIN_URL: ${{ vars.BETTER_AUTH_URL }}
      E2E_SMOKE_STAFF_EMAIL: ${{ secrets.E2E_SMOKE_STAFF_EMAIL }}
      E2E_SMOKE_STAFF_PASSWORD: ${{ secrets.E2E_SMOKE_STAFF_PASSWORD }}
```

- [ ] **Step 2: The config comment (playwright.config.ts)**

Replace the header comment block (old → new):

```ts
// The Playwright pre-flight foundation (M6 #189, ADR-0022): one root config,
// chromium-only, walking DEPLOYED environments — no webServer orchestration
// by design (the smoke suite walks teaser/v1; #190 lands the seven production
// assertions on top). firefox/webkit arrive later for smoke breadth only,
// never for visual baselines. The root package is not a pnpm workspace
// member, so turbo's `test` task cannot see `test:e2e` — `pnpm check` stays
// browserless by construction, and that is the ruling, not an accident.
```

```ts
// The Playwright foundation (M6 #189, ADR-0022): one root config,
// chromium-only, walking DEPLOYED environments — no webServer orchestration
// by design (the #190 production smoke's seven assertions walk teaser/v1;
// e2e/smoke/env.ts carries their environment contract). firefox/webkit
// arrive later for smoke breadth only, never for visual baselines. The
// root package is not a pnpm workspace member, so turbo's `test` task
// cannot see `test:e2e` — `pnpm check` stays browserless by construction,
// and that is the ruling, not an accident.
```

- [ ] **Step 3: Sanity checks + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm fix:root && pnpm lint:root
grep -n "E2E_API_URL\|E2E_ADMIN_URL\|E2E_SMOKE_STAFF" .github/workflows/e2e.yml
git add .github/workflows/e2e.yml playwright.config.ts
git commit -m "ci(e2e): wire the smoke's env contract — URLs from the environment vars, credentials from secrets (#190)"
```

Expected: biome clean; the grep prints exactly the four new mapping lines (`E2E_API_URL`, `E2E_ADMIN_URL`, `E2E_SMOKE_STAFF_EMAIL`, `E2E_SMOKE_STAFF_PASSWORD` — the added comment block names none of them, and nothing else in the file does). YAML correctness is proven by Task 5's dispatch run (the workflow file only re-reads at dispatch); a malformed mapping surfaces there with the config's or `requiredEnv`'s curated message naming the missing variable.

**Not here:** no `v1`-environment values (ship-side, #191's runbook); no secrets creation (Task 3); no cron/trigger change (nightly + dispatch stay exactly as #189 ruled them).

---

### Task 3: The owner gate — `smoke-staff` + the teaser environment secrets

**Files:**
- Modify (infra, not repo): the dev database's `user` table (+ its cascaded `account` row) and the `teaser` GitHub environment's secret store. ZERO repo files.

**Interfaces:**
- Consumes: Task 1's credential env-var names; Task 2's secret mappings.
- Produces: the account + secrets Task 5's dispatch run authenticates with. Nothing downstream in-repo consumes the VALUES — only the names.

- [ ] **Step 1: Hand the owner the gate (the plan's ONE owner-operated step)**

The password prompt is interactive by the runbook's own ruling (it never rides a flag, file, or script argument — `docs/staff-provisioning.md`), so the owner runs, verbatim:

```bash
cd /home/jeius/Projects/sevendays
openssl rand -base64 24   # the password — ≥12 chars by construction; the owner keeps it
pnpm --filter @sevendays/admin create-staff --email <OWNER_CHOSEN_EMAIL> --name "Smoke Staff" --role staff
```

`<OWNER_CHOSEN_EMAIL>` is the owner's pick (any mailbox the owner controls — the address is sign-in identity only; it lands nowhere in this repo). The trailing `--role staff` is the least-privilege override (spike-verified in the runbook); the prompted password must be ≥ 12 chars (`minPasswordLength: 12`). Prerequisites are the runbook's own (the dev machine's `apps/admin/.env.local` with `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`; migrations applied — all standing).

- [ ] **Step 2: Seal the credentials in the `teaser` environment**

The owner runs (values never echoed into logs the executor reads):

```bash
gh secret set E2E_SMOKE_STAFF_EMAIL -e teaser --body "<OWNER_CHOSEN_EMAIL>"
gh secret set E2E_SMOKE_STAFF_PASSWORD -e teaser --body "<PASSWORD>"
```

- [ ] **Step 3: The executor's name-only verification**

```bash
gh secret list -e teaser
```

Expected: the list shows `E2E_SMOKE_STAFF_EMAIL` and `E2E_SMOKE_STAFF_PASSWORD` (values are unreadable by design — presence is the check). Optionally the owner may verify sign-in dev-side per the runbook (`POST /api/auth/sign-in/email` → `200` + `set-cookie`), but the authoritative proof that account + secrets + suite agree is Task 5's dispatch run — the executor never needs the credential values in any shell.

**Not here:** no `v1`-environment secrets (ship-side runbook step; spec #182's at-ship accounting puts the `smoke-staff` credentials into `v1` at cutover); no repo commit (this task writes nothing to the branch); no password rotation tooling.

---

### Task 4: The docs rotation + the graph refresh

**Files:**
- Modify: `docs/progress.md` (ONE entry at the head of the log — above the #188 entry at line 3)
- Add: `docs/superpowers/plans/2026-10-10-190-production-smoke.md` (this file — already on disk; it rides the branch and lands in this commit)
- Modify (refresh only, NEVER committed here): `graphify-out/` via `graphify update .`

**Interfaces:**
- Consumes: Tasks 1-3 (the entry describes the landed suite + the owner gate).
- Produces: the progress record Task 5's PR carries; nothing code-side.

- [ ] **Step 1: The progress entry**

In `docs/progress.md`, insert this entry as the NEW head of the log — directly under `# Progress` and ABOVE the `2026-10-10 — #188` entry — verbatim (date the landing day; `2026-10-10` if executing today):

```markdown
2026-10-10 — #190, M6 ticket 08, the production smoke — the verify gate's executable leg, landed: seven presence/status-level assertions in `e2e/smoke/production.spec.ts` walking a DEPLOYED environment (never local dev, never PR-gating — commit-green and smoke-green stay separate verdicts, ADR-0022): (1) api `/health` 200 with its fixed `{status:'ok'}` body; (2) the landing home renders; (3) the CMS-fed `/about` renders (its loader awaits the gallery + testimonial reads, so a failed landing→api→db read fails the page — 200 + the Portfolio section proves a ruled render, empty states included); (4) a live media asset — its URL pulled from the live `/api/v1/gallery` payload and GET'd (`image/` content-type), nothing hardcoded: the `MEDIA_PUBLIC_BASE_URL`-flip + copied-gallery guard, with an emptied gallery RED by design (a shipped site with no work on the walls defeats the media copy); (5) the `/book` page serves, never submits; (6) the admin `/login` page serves; (7) the real `smoke-staff` sign-in — the suite's ONE act (session creation, harmless by construction; no booking POSTs, no CMS writes): BetterAuth's fixed `/api/auth/sign-in/email` POST answers 200, the `__Secure-better-auth.session_token` cookie lands, and the Analytics Dashboard renders at `/` (the `_shell` gate's own session-gated getSession answered — a failed gate bounces to /login; TanStack server-fn RPC URLs are deliberately never pinned, `@tanstack/react-start` floats latest). Environment contract: `E2E_API_URL`/`E2E_ADMIN_URL` derive in `e2e.yml` from the chosen GitHub environment's own `API_URL`/`BETTER_AUTH_URL` vars (one source of truth), credentials as environment secrets; `e2e/smoke/env.ts`'s `requiredEnv` fails only its own leg with a curated message — a missing credential is a red leg with a named fix, never a silent skip. The dev `smoke-staff` account is provisioned per `docs/staff-provisioning.md` (`--role staff`, least privilege — the dashboard is any-staff surface); credentials live only in the `teaser` GitHub environment. #189's one-probe `foundation.spec.ts` is deleted — superseded by assertion 2, exactly its own comment's ruling. Gates: `pnpm check` 35/35 + `pnpm build` green (the root e2e package is invisible to turbo by construction — nothing moved); the dispatch run against teaser green at 7 passed. NOT landed: the ship-provisioning runbook (#191 — its final step invokes this smoke), the M6 close-out (#192).
```

- [ ] **Step 2: The graph refresh (churn stays uncommitted)**

```bash
cd /home/jeius/Projects/sevendays
graphify update .
```

Expected: the incremental AST update runs clean (no API cost). The resulting `graphify-out/` churn — mixing with the tree's PRE-EXISTING dirty graph state — is NOT committed by this plan: Step 3's `git add` names its files, and the churn belongs to the owner's next graph commit.

- [ ] **Step 3: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm fix:root && pnpm lint:root
git add docs/progress.md docs/superpowers/plans/2026-10-10-190-production-smoke.md
git commit -m "docs: #190 — production-smoke progress entry + the plan file (#190)"
```

Expected: biome clean; the commit carries exactly the two named files (`git status --porcelain` still shows the pre-existing dirty graphify-out/CONTEXT files — correct, leave them).

**Not here:** no AGENTS.md rotation (its `pnpm test` / e2e paragraph already describes the foundation + smoke posture from #189 — verify with a read; extend ONLY if a sentence is now factually wrong); no `docs/plan.md` tick (M6's boxes flip at #192's close-out, not per-ticket); no ADR (the smoke rides ADR-0022, decided at #189).

---

### Task 5: Full gates, the dispatch verification, the PR, the close-out, and the v1 pick (expected SKIP)

**Files:**
- Modify (bookkeeping): the PR, issue #190's body (checkbox flips), `docs/agents/v1-picks.md` (the ledger row)

**Interfaces:**
- Consumes: Tasks 1-4 (branch `feat/190-production-smoke` complete) + Task 3's secrets (the dispatch run reads them by name).
- Produces: the squash-merged PR, the green dispatch run (the smoke's own proof), the ticked issue, and the ledger row.

- [ ] **Step 1: The full gates**

```bash
cd /home/jeius/Projects/sevendays
pnpm install && pnpm build:packages
pnpm check   # expect 35/35 — the root e2e package is invisible to turbo; nothing can have moved
pnpm build   # expect green (7/7)
```

- [ ] **Step 2: The dispatch verification — green BEFORE merge**

The `teaser` environment carries no branch policy (probed: `protection_rules` empty), so a dispatch run from the PR branch reads its vars/secrets — the smoke proves itself on the branch, and the nightly inherits the same green config from `main`:

```bash
cd /home/jeius/Projects/sevendays
git push -u origin feat/190-production-smoke
gh workflow run e2e.yml --ref feat/190-production-smoke -f environment=teaser
sleep 15
gh run list --workflow e2e.yml --limit 1 --json databaseId,headBranch,status --jq '.[0]'
gh run watch <databaseId> --exit-status
```

Expected: the run (headBranch `feat/190-production-smoke`) goes green with **7 passed** — this is AC 1 + AC 2's executable proof (the nightly runs the identical job on schedule; the authenticated leg ran with the environment's secrets). If it fails, the report artifact (uploaded on failure) names the leg — diagnose on the branch, never merge a red smoke. Record the run URL for the PR body.

- [ ] **Step 3: The PR**

```bash
cd /home/jeius/Projects/sevendays
gh pr create --title "feat(e2e): the production smoke — the verify gate's seven-assertion executable leg (#190)" --body-file - <<'EOF'
Closes #190 (spec #182 § The verify gate — the production smoke; ADR-0022's separate smoke-green verdict).

- `e2e/smoke/production.spec.ts`: seven presence/status-level assertions over the deployed stack — api `/health` (200 + the fixed `{status:'ok'}` body), the landing home, the CMS-fed `/about` surface, a live media asset URL'd from the live `/api/v1/gallery` payload (nothing hardcoded — the `MEDIA_PUBLIC_BASE_URL`-flip + copied-gallery guard; an emptied gallery is red by design), the `/book` page serving (never submitting), the admin `/login` page, and a real `smoke-staff` sign-in (the suite's ONE act: BetterAuth's `/api/auth/sign-in/email` 200 + the `__Secure-` session cookie + the Analytics Dashboard rendering through the `_shell` gate — the stable session-gated fetch; TanStack RPC URLs never pinned).
- `e2e/smoke/env.ts`: `requiredEnv` — each of `E2E_API_URL`/`E2E_ADMIN_URL`/`E2E_SMOKE_STAFF_EMAIL`/`E2E_SMOKE_STAFF_PASSWORD` fails only its own leg with a curated message when unset; never a silent skip.
- `.github/workflows/e2e.yml`: the URLs derive from the environment's own `API_URL`/`BETTER_AUTH_URL` vars; the credentials are `teaser` environment secrets (the dev `smoke-staff` provisioned per `docs/staff-provisioning.md`, `--role staff` — owner gate, done).
- `e2e/smoke/foundation.spec.ts` deleted — superseded by assertion 2, per its own ruling.

Read-only plus exactly the one sign-in act: no booking POSTs, no CMS writes. Floors: nothing can move (the root e2e package is invisible to turbo) — check 35/35, build green. Dispatch run against teaser (branch): <RUN_URL> — 7 passed.
EOF
```

(Substitute the recorded run URL for `<RUN_URL>` before submitting.)

- [ ] **Step 4: Squash-merge + capture the SHA**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
git log --oneline -1   # record this SHA — the triage input
```

- [ ] **Step 5: The issue close-out — flip the five AC boxes**

The PR's "Closes #190" closed the issue; its acceptance checkboxes still read unticked. Fetch the body, flip the five `- [ ]` lines under `## Acceptance criteria` to `- [x]` (GitHub issue checkboxes use `[x]`, not the repo-docs `✅`), and write it back:

```bash
gh api repos/jeius/sevendays/issues/190 --jq .body > /tmp/190-body.md
# edit /tmp/190-body.md: the five Acceptance criteria lines `- [ ]` → `- [x]`
gh issue edit 190 --body-file /tmp/190-body.md
gh issue comment 190 --body "Verified: dispatch run against teaser green at 7 passed (linked in the PR); the suite's only mutation is the smoke-staff sign-in; the media URL is payload-derived; the credentials live in the teaser environment."
```

- [ ] **Step 6: The v1 pick — expected SKIP (no v1-side execution)**

```bash
cd /home/jeius/Projects/sevendays
node scripts/v1-triage.mjs <sha>
```

Expected path verdict: **SPLIT — 1 v1-path + 7 main-only.** The v1-path is `docs/progress.md` (client-safe-rewrite territory); the main-only paths are `e2e/smoke/env.ts`, `e2e/smoke/production.spec.ts`, the `foundation.spec.ts` deletion, `e2e/README.md`, `playwright.config.ts`, `.github/workflows/e2e.yml`, and the plan file (`e2e`, `playwright.config.ts`, `.github/workflows/e2e.yml`, `docs/superpowers` are all in `scripts/seed-v1/paths.txt`). Content pass on the one v1-path hunk: the progress entry names the teaser, the nightly, and GitHub environments — **edition mechanics → the hunk is dropped** — and with every v1-path hunk dropped the final verdict is **SKIP**, matching the spec's pre-ruled class ("Smoke suite (`e2e/smoke/`) — MAIN-ONLY, never picked"; "the v1 walk runs from main's workflow against v1's domain"). Nothing is executed in the v1 checkout; `v1` does not move.

- [ ] **Step 7: The ledger row**

Append one row to the `docs/agents/v1-picks.md` ledger table (a commit on main, itself a skip), per the table's shape — Merged date, the PR number from Step 3, the main SHA from Step 4, verdict `skip`, v1 SHA `—`. The notes must name: the payload (the seven-assertion smoke + the workflow env wiring), the classifier's SPLIT (1 v1-path `docs/progress.md` + 7 main-only), the content-pass drop (teaser/nightly/environment naming = edition mechanics), the spec's pre-ruled MAIN-ONLY class as the reason no execution happened, and the dispatch-run green at 7 passed. Commit:

```bash
cd /home/jeius/Projects/sevendays
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #190 ledger row — the production smoke skipped (main-only owner tooling) (#190)"
```

**Not here:** no v1-branch work of any kind (SKIP means `v1` does not move); no `v1` GitHub-environment provisioning (ship-side, #191's runbook + the spec's at-ship secrets accounting); no M6 close-out edits (#192 — the milestone box and `docs/plan.md` ticks are its); no nightly schedule change (19:07 UTC stands as #189 ruled it).


