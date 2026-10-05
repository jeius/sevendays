# M6 Ticket 07 — The Playwright pre-flight foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The browser-test foundation of ADR-0022 — standalone `@playwright/test` at a top-level `e2e/`: one root `playwright.config.ts` (chromium-only, walking deployed environments via `E2E_BASE_URL`), `@playwright/test` as a root devDependency, a root `test:e2e` script deliberately outside turbo's `test` so `pnpm check` stays browserless, the `e2e/smoke/` suite home born with one foundation probe, a nightly + `workflow_dispatch` GitHub workflow with cached browsers (`PLAYWRIGHT_BROWSERS_PATH`) that never PR-gates, and the three main-only paths recorded in `scripts/seed-v1/paths.txt` (the workflow path load-bearing — `.github/workflows/` is not seeded out).

**Architecture:** Four tasks: (1) the foundation at the root — the devDependency + script + config + `e2e/smoke/` probe + README + gitignore, proven by a local green run against the teaser deployment and a browserless `pnpm check`; (2) the CI leg — `.github/workflows/e2e.yml` (schedule + dispatch, cached browsers) plus the `E2E_BASE_URL` variable in the teaser GitHub environment; (3) the v1 fence — the three `paths.txt` paths, proven with the live classifier; (4) full gates + the CDP-harness green proof + docs rotation + PR/squash-merge + the post-merge dispatch verification + the v1-picks ledger row + issue close. The PR gate stays exactly `pnpm check` + `pnpm build` — `ci.yml` is byte-untouched.

**Tech Stack:** `@playwright/test` `1.63.0` (the only new dependency — npm dist-tag probed 2026-10-06), GitHub Actions (`actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4` node 24, `actions/cache@v4`, `actions/upload-artifact@v4` — `ci.yml`'s proven prefix), pnpm 11 + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#189 "M6 ticket 07: the Playwright pre-flight foundation"](https://github.com/jeius/sevendays/issues/189) (label `ready-for-agent`), whose parent is the M6 spec `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` (issue #182 — § The Playwright pre-flight (#179 — ADR-0022; the M2-pre-flight pattern)) and ADR-0022 `docs/adr/0022-standalone-playwright-browser-test-foundation.md`. Key recon facts (2026-10-06, main `4b96b5c`, tree clean):

- **The browserless mechanism is workspace membership, not task naming.** `pnpm-workspace.yaml` lists only `apps/*` + `packages/*` (9 projects) — the root package is NOT a workspace member, so `turbo run test` cannot see a root script at all. The script is still named `test:e2e` (never `test`) as belt-and-braces, and `turbo.json` is not touched. `pnpm exec turbo run lint format typecheck test --dry=json` counts **38 tasks** (probed 2026-10-06) — unchanged by this ticket.
- **`ci.yml` is the PR gate and stays byte-identical.** Its `check` job runs `pnpm check` + `pnpm build`; `.github/workflows/` currently holds `ci.yml` alone. GitHub fires scheduled workflows from the default branch only, and a `workflow_dispatch` can target a feature-branch ref (early signal; the binding proof is the post-merge dispatch, Task 4).
- **The teaser GitHub environment exists with four vars** (live 2026-10-06: `API_URL`, `BETTER_AUTH_URL`, `CLOUDFLARE_ACCOUNT_ID`, `MEDIA_PUBLIC_BASE_URL`) — `E2E_BASE_URL` is absent and lands with this ticket; `gh variable set --env teaser` is supported (probed). The teaser landing `https://sevendays-landing.pahamajulius.workers.dev` answers 200 (live).
- **`@playwright/test` 1.63.0 is the latest stable** (npm, probed 2026-10-06); `pnpm config get minimumReleaseAge` is `undefined` — no release-age filtering moves the pin. No `playwright`/`test:e2e` reference exists anywhere in the repo (swept) — zero naming collisions.
- **The CDP harnesses are `apps/landing/scripts/verify/*.mjs`** (main-only owner harnesses, plain Node over raw CDP per `lib.mjs`) — untouched by design: this ticket never edits under `apps/`. The read-only pair for the green proof: `packages-pages.mjs` and `content-pages.mjs`, which walk the LOCAL stack (landing dev `:3000`, api dev `:8787` over the live dev DB, chrome on CDP `:9222`) and exit 1 on any FAIL, printing `N/M checks passed`. Last recorded counts: packages-pages 17, content-pages 20 (ledger #151). After Task 1, the playwright-installed chromium (`~/.cache/ms-playwright/chromium-*/chrome-linux/chrome`) serves the CDP launch — a `chromium_headless_shell-1243` already sits in that cache, proving the machine has run playwright browsers before.
- **`scripts/v1-triage.mjs` reads `paths.txt` live** and prefix-matches (`e2e` covers everything under `e2e/`), printing `MAIN-ONLY  <path>` / `v1-path    <path>` lines and a final `VERDICT …` — the Task 3/4 proof command.
- **Baselines:** `pnpm check` = 38 turbo tasks over 9 workspace projects; every vitest floor unchanged (this ticket touches no test file): api 26 files passed + 1 skipped / 317 passed + 3 skipped, api-client 5 files / 33 tests, admin 6 files / 55 tests (AGENTS.md floors). If any gate count differs at execution, reconcile before proceeding — do not loosen.
- **Sibling fences (spec § Sequencing; `docs/plan.md` M6 block):** this ticket owns plan.md M6 checkbox **6** (the Playwright pre-flight) exclusively and ticks it at close; checkboxes 7 (the production smoke — #190) and 11 (verify — #190/#192) stay unticked. NOT here, regardless of temptation: the seven production-smoke assertions, the `smoke-staff` account, or any credential wiring (#190 — blocked-by this ticket AND #186); anything under `apps/` or `packages/`; any vitest suite/config (ADR-0003's umbrella unchanged); `e2e/visual/` (M7); `webServer` orchestration, `storageState`, `toHaveScreenshot` (capabilities Playwright owns — none configured yet); firefox/webkit engines (later, smoke breadth only, never visual baselines); any `ci.yml` edit (a PR-gating browser leg is a documented future option, deliberately not taken).
- **Clarify ruling needed from the owner:** none blocking — every structural literal traces to the spec/ADR-0022 or a probed fact. The nightly cron (`7 19 * * *`), the workflow filename (`e2e.yml`), the probe filename, and the README copy are **agent rulings pinned in Global Constraints, owner-reviewable at PR** (the #183 plan's precedent).

## Global Constraints

- **Branch & baseline:** `feat/189-playwright-preflight` off main `4b96b5c` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#189)` style; every commit below is pinned verbatim. Evidence (local run output, `gh run` URLs) lands in gitignored `.superpowers/sdd/2026-10-06-189-playwright-preflight/evidence/`.
- **Gates (repo AGENTS.md, verbatim duties):** after any manifest change run `pnpm install`. This ticket touches NO workspace package — the full-gate proof is Task 4's `pnpm check` + `pnpm build` (38/38 turbo tasks, every vitest floor unchanged, zero browser output). Biome over the new root files via the TARGETED `pnpm exec biome check --write package.json playwright.config.ts e2e` — never bare `pnpm fix:root` (it sweeps the whole tree). Never commit secrets: the workflow reads `E2E_BASE_URL` from the GitHub environment; no credential ever enters the repo (#190's smoke-staff secrets are NOT this ticket's). Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (code was modified; `graphify-out/graph.json` exists).
- **Version pins (probed 2026-10-06):** add exactly `@playwright/test@1.63.0` as a ROOT devDependency, exact — `pnpm add -D -w --save-exact @playwright/test@1.63.0`; verify with `pnpm list -w @playwright/test --depth 0` resolving 1.63.0 — anything else resolves → STOP and report. Actions pins: `actions/checkout@v4`, `pnpm/action-setup@v4` (reads `packageManager`), `actions/setup-node@v4` (node 24, `cache: pnpm`), `actions/cache@v4`, `actions/upload-artifact@v4` — `ci.yml`'s proven prefix, byte-copied.
- **The classification fence (spec-verbatim, binding):** `scripts/seed-v1/paths.txt` gains exactly three paths — `e2e`, `playwright.config.ts`, `.github/workflows/e2e.yml` — one edit, nothing else in that file. The workflow path is load-bearing: `.github/workflows/` is not seeded out, and a scheduled workflow picked to v1 would fire nightly against files that don't exist there.
- **CI posture (spec-verbatim, binding):** the workflow triggers on `schedule` + `workflow_dispatch` ONLY — never `push`/`pull_request`; `ci.yml` stays byte-identical; the PR gate stays exactly `pnpm check` + `pnpm build`. Browsers cached via job-env `PLAYWRIGHT_BROWSERS_PATH: ${{ github.workspace }}/playwright-browsers` + `actions/cache@v4` keyed on `hashFiles('pnpm-lock.yaml')` (the playwright version lives in the lockfile — the cache invalidates with it). Chromium-only: `pnpm exec playwright install --with-deps chromium`.
- **Agent rulings pinned, owner-reviewable at PR (binding):** nightly cron `7 19 * * *` (19:07 UTC = 03:07 Asia/Manila; the odd minute sits off GitHub's top-of-hour schedule congestion); workflow file `.github/workflows/e2e.yml`, display name `E2E (Playwright)`, single job `smoke`, `timeout-minutes: 15`; config `retries: process.env.CI ? 1 : 0`, `forbidOnly: !!process.env.CI`, `trace: 'on-first-retry'`, reporters `list` + `html { open: 'never' }`; report artifact uploaded on failure only, 7-day retention; the probe file `e2e/smoke/foundation.spec.ts`; the dispatch input `environment` (choice `teaser|v1`, default `teaser`).
- **The env wiring:** `E2E_BASE_URL` is a GitHub environment VARIABLE (teaser: `https://sevendays-landing.pahamajulius.workers.dev` — live 200 on 2026-10-06), set via `gh variable set E2E_BASE_URL --env teaser --body <url>` (flag probed). The config fails fast with the pinned curated message when the variable is unset — there is NO default baseURL on purpose: a smoke run against the wrong target is worse than no run. #190 later adds the smoke-staff SECRETS to the same environment; the v1 environment's own `E2E_BASE_URL` is ship-time (#191's runbook) — neither here.
- **Copy pins are semantic, formatting is biome's:** every fenced file below lands verbatim in content; the targeted biome check then normalizes quoting/import order to house style — accept its rewrite, commit the result.
- **Scope fence (verbatim):** Tasks 1–4 edit only: `package.json` (root — one devDep + one script), `pnpm-lock.yaml` (the add's resolution), `playwright.config.ts` (create), `e2e/README.md` + `e2e/smoke/foundation.spec.ts` (create), `.gitignore` (three lines under `# Testing`), `.github/workflows/e2e.yml` (create), `scripts/seed-v1/paths.txt` (three paths + comment), `docs/plan.md` (M6 box 6), `docs/progress.md` (one bullet), `AGENTS.md` (Commands line + one status sentence), `docs/agents/v1-picks.md` (ledger row, post-merge) — plus the out-of-repo teaser environment variable. Nothing else.

## File Structure

```text
. (repo root — the foundation's home; nothing lands inside any workspace)
  package.json                       # modify (Task 1) — @playwright/test devDep + test:e2e script
  pnpm-lock.yaml                     # modify (Task 1) — the add's resolution
  playwright.config.ts               # create (Task 1) — chromium-only, E2E_BASE_URL fail-fast
  e2e/
    README.md                        # create (Task 1) — the run loop, taxonomy, binding rulings
    smoke/
      foundation.spec.ts             # create (Task 1) — the one-probe green proof
  .gitignore                         # modify (Task 1) — playwright-report/ test-results/ playwright-browsers/
.github/workflows/e2e.yml            # create (Task 2) — nightly + dispatch, cached browsers
scripts/seed-v1/paths.txt            # modify (Task 3) — the three main-only paths
docs/plan.md                         # modify (Task 4) — M6 box 6 tick
docs/progress.md                     # modify (Task 4) — the session-record bullet
AGENTS.md                            # modify (Task 4) — Commands line + status sentence
docs/agents/v1-picks.md              # modify (Task 4, post-merge) — the ledger row
```

---

### Task 1: The foundation at the root — devDep, script, config, the smoke home

**Files:**
- Create (test-first): `e2e/smoke/foundation.spec.ts`
- Create: `playwright.config.ts`, `e2e/README.md`
- Modify: `package.json` (root) — one devDep + one script; `pnpm-lock.yaml` (via `pnpm add`); `.gitignore`

**Interfaces:**
- Consumes: nothing from earlier tasks (self-contained).
- Produces (Tasks 2–4 + #190 consume): the root script `test:e2e` → `playwright test`; the config contract — `baseURL` from `process.env.E2E_BASE_URL` (fail-fast with the pinned message), `testDir: './e2e'`, exactly one project `chromium` over `devices['Desktop Chrome']`, reporters `list` + `['html', { open: 'never' }]`, `trace: 'on-first-retry'`, `forbidOnly`/`retries` CI-gated; the suite home `e2e/smoke/`; gitignored outputs `playwright-report/` + `test-results/`; a locally installed chromium under `~/.cache/ms-playwright/chromium-*/` (Task 4's CDP harnesses borrow that binary).

**Not here:** the workflow (Task 2); `paths.txt` (Task 3); any #190 content (the seven assertions, smoke-staff, credentials); `webServer` orchestration (the suite walks deployments).

- [ ] **Step 1: Write the failing probe**

Create `e2e/smoke/foundation.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

// The foundation probe (M6 #189): one presence-level assertion proving the
// harness reaches the configured deployment — chromium launches, the baseURL
// resolves, the page answers 200. NOT the production smoke: #190 lands the
// seven ruled assertions (health, home, CMS-fed surface, live media asset,
// booking page, admin sign-in, staff sign-in) — this file is their doorway,
// superseded as they land. Presence/status-level only, never content-text
// (copy is CMS editorial state; empty states are legitimate renders).
test('the configured deployment answers over chromium', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e`
Expected: FAIL — pnpm exits 1 with `Missing script: test:e2e` (the script, the dependency, and the config do not exist yet).

- [ ] **Step 3: Add the dependency and the script**

Run: `pnpm add -D -w --save-exact @playwright/test@1.63.0`
Expected: root `package.json` gains `"@playwright/test": "1.63.0"` in devDependencies; `pnpm install` runs as part of the add (the manifest-change gate). Verify: `pnpm list -w @playwright/test --depth 0` resolves exactly 1.63.0 — anything else → STOP and report.

Then edit root `package.json`'s scripts block from:

```json
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
```

to:

```json
    "test": "turbo run test",
    "test:e2e": "playwright test",
    "typecheck": "turbo run typecheck",
```

- [ ] **Step 4: Write playwright.config.ts**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

// The Playwright pre-flight foundation (M6 #189, ADR-0022): one root config,
// chromium-only, walking DEPLOYED environments — no webServer orchestration
// by design (the smoke suite walks teaser/v1; #190 lands the seven production
// assertions on top). firefox/webkit arrive later for smoke breadth only,
// never for visual baselines. The root package is not a pnpm workspace
// member, so turbo's `test` task cannot see `test:e2e` — `pnpm check` stays
// browserless by construction, and that is the ruling, not an accident.
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) {
  throw new Error(
    'E2E_BASE_URL is not set — point it at the deployment under test (e.g. the teaser landing URL). The suites walk deployed environments, not local dev servers, so there is no default.'
  );
}

export default defineConfig({
  // e2e/smoke/ now; e2e/visual/ arrives with M7's regression (ADR-0022).
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

- [ ] **Step 5: Write e2e/README.md**

Create `e2e/README.md`:

````markdown
# e2e — the browser-test foundation (ADR-0022, M6 #189)

Standalone `@playwright/test`, chromium-only, walking **deployed** environments — never local dev servers, never part of `pnpm check` (the root package is not a pnpm workspace member, so turbo's `test` task cannot see `test:e2e`; the PR gate stays `pnpm check` + `pnpm build`, browserless).

## Running

```bash
pnpm exec playwright install chromium   # once per machine (~150 MB)
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev pnpm test:e2e
```

`E2E_BASE_URL` has no default on purpose: the config fails fast with a curated message when it is unset — a smoke run against the wrong target is worse than no run.

## Taxonomy

- `smoke/` — deployed-stack presence assertions. The one-probe foundation spec is #189's; #190 lands the seven production assertions (health, home, CMS-fed surface, live media asset, booking page serves, admin sign-in page, real staff sign-in).
- `visual/` — arrives with M7's redesign regression; deliberately absent now.

## Rulings that bind every suite here

- **Chromium-only** at landing; firefox/webkit are a later addition for smoke breadth only — never for visual baselines (per-engine snapshot matrices are the noise to avoid).
- **Never PR-gating** — CI is nightly + `workflow_dispatch` (`.github/workflows/e2e.yml`, cached browsers); local runs are the primary loop; commit-green and smoke-green stay separate verdicts.
- **Main-only, never picked to v1** — the CDP-harness class (`scripts/seed-v1/paths.txt`).
- **Read-only plus at most the sign-in act** (#190's posture) — the deployed environments hold the studio's real data.
````

- [ ] **Step 6: Extend .gitignore**

In `.gitignore`, change the Testing section from:

```text
# Testing
coverage/
```

to:

```text
# Testing
coverage/
playwright-report/
test-results/
playwright-browsers/
```

(`playwright-browsers/` only ever populates inside CI's workspace via `PLAYWRIGHT_BROWSERS_PATH`; the entry is safety parity for anyone who sets that variable locally.)

- [ ] **Step 7: Install chromium locally**

Run: `pnpm exec playwright install --with-deps chromium`
Expected: downloads chromium (+ ffmpeg) into `~/.cache/ms-playwright/` and the OS deps via apt. On WSL2, if the apt leg fails, split it: `pnpm exec playwright install chromium && pnpm exec playwright install-deps chromium`. Note: `playwright install` does NOT load the config, so it works with `E2E_BASE_URL` unset.

- [ ] **Step 8: Run the probe green against the teaser**

```bash
mkdir -p .superpowers/sdd/2026-10-06-189-playwright-preflight/evidence
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev pnpm test:e2e \
  2>&1 | tee .superpowers/sdd/2026-10-06-189-playwright-preflight/evidence/local-run.txt
```

Expected: PASS — `1 passed` (the chromium project, `e2e/smoke/foundation.spec.ts`). If chromium fails to launch on WSL2 over missing shared libs, re-run `pnpm exec playwright install-deps chromium` and retry.

- [ ] **Step 9: Run the fail-fast (the unset-env guard)**

Run: `pnpm test:e2e 2>&1 | tee .superpowers/sdd/2026-10-06-189-playwright-preflight/evidence/fail-fast.txt; echo "exit: ${PIPESTATUS[0]}"`
Expected: non-zero exit with exactly the pinned message `E2E_BASE_URL is not set — point it at the deployment under test (e.g. the teaser landing URL). The suites walk deployed environments, not local dev servers, so there is no default.` — this failure is the guard working; it is evidence, not a defect.

- [ ] **Step 10: Prove `pnpm check` stays browserless**

Run: `pnpm exec turbo run lint format typecheck test --dry=json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d.slice(d.indexOf('{')));console.log('tasks:',j.tasks.length);console.log(j.tasks.map(t=>t.taskId).filter(id=>/e2e|playwright/.test(id)))})"`
Expected: `tasks: 38` and an empty list — the root script is invisible to turbo (the root is not a workspace member; `turbo.json` untouched). If the count differs from 38, reconcile against the current workspace scripts before proceeding — do not proceed on an unexplained change.

- [ ] **Step 11: Biome-normalize the new root files, re-verify, commit**

Run: `pnpm exec biome check --write package.json playwright.config.ts e2e`
Expected: clean (or rewrites accepted). If biome touched `playwright.config.ts` or the spec file, re-run Step 8's green command once. Then:

```bash
git add package.json pnpm-lock.yaml playwright.config.ts e2e .gitignore
git commit -m "feat(e2e): the Playwright foundation — root @playwright/test, chromium-only config, the smoke home (#189)"
```

---

### Task 2: The CI leg — e2e.yml + the teaser E2E_BASE_URL

**Files:**
- Create: `.github/workflows/e2e.yml`
- Out-of-repo: the `E2E_BASE_URL` variable in the teaser GitHub environment

**Interfaces:**
- Consumes: Task 1's `test:e2e` script and the config's `E2E_BASE_URL` fail-fast contract.
- Produces (Task 4 + #190 consume): the nightly schedule (`7 19 * * *`, walking the teaser environment) and the dispatch leg (input `environment`, choice `teaser|v1`, default `teaser`) — #190's seven-assertion suite runs through this workflow unchanged, its smoke-staff secrets resolving from the same `environment:` scope; a v1 walk at ship needs only the v1 environment's own `E2E_BASE_URL` var (ship-time, #191's runbook — not here).

**Not here:** `ci.yml` (byte-untouched — the never-PR-gating ruling); any secret (smoke-staff is #190's); the v1 environment's var (ship-time).

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/e2e.yml`:

```yaml
name: E2E (Playwright)

# The Playwright pre-flight's CI leg (M6 #189, ADR-0022): nightly + on-demand
# against a deployed environment — NEVER PR-gating (the PR gate stays exactly
# pnpm check + pnpm build; ci.yml is untouched by this file). Scheduled
# workflows fire from the default branch only, and this whole file is
# main-only by classification (scripts/seed-v1/paths.txt — .github/workflows/
# is not seeded out), so v1 never sees it. #190's seven production assertions
# run through this same workflow against the chosen environment's E2E_BASE_URL.
on:
  schedule:
    # Nightly 19:07 UTC = 03:07 Asia/Manila (odd minute: off GitHub's
    # top-of-hour schedule congestion).
    - cron: '7 19 * * *'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment to walk (teaser now; v1 at ship per the runbook)'
        type: choice
        options: [teaser, v1]
        default: teaser

permissions:
  contents: read

jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    environment: ${{ inputs.environment || 'teaser' }}
    env:
      PLAYWRIGHT_BROWSERS_PATH: ${{ github.workspace }}/playwright-browsers
      E2E_BASE_URL: ${{ vars.E2E_BASE_URL }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # The playwright version lives in the lockfile, so this key invalidates
      # with it; restore-keys let a minor bump reuse the unchanged half of the
      # browser cache.
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ${{ github.workspace }}/playwright-browsers
          key: ${{ runner.os }}-playwright-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-playwright-

      - name: Install chromium (+ OS deps)
        run: pnpm exec playwright install --with-deps chromium

      # An unset E2E_BASE_URL fails here with the config's curated message —
      # the visible, named fix is the environment variable.
      - name: Run the e2e suite
        run: pnpm test:e2e

      - name: Upload Playwright report (failure only)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```

Structural self-check before committing (eyeball the fenced content above): the `on:` block carries exactly `schedule` and `workflow_dispatch` — no `push`, no `pull_request`. The real proof nothing joined the PR gate is Task 4's `gh pr checks` (a single `check` row).

- [ ] **Step 2: Set the teaser environment variable**

```bash
gh variable set E2E_BASE_URL --env teaser --body https://sevendays-landing.pahamajulius.workers.dev
gh variable list --env teaser
```

Expected: the list now shows five variables — `API_URL`, `BETTER_AUTH_URL`, `CLOUDFLARE_ACCOUNT_ID`, `MEDIA_PUBLIC_BASE_URL`, and `E2E_BASE_URL` = `https://sevendays-landing.pahamajulius.workers.dev`.

- [ ] **Step 3: Commit and push the branch**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci(e2e): nightly + dispatch workflow with cached browsers; never PR-gating (#189)"
git push -u origin feat/189-playwright-preflight
```

- [ ] **Step 4: Early dispatch signal (optional leg, both outcomes fine)**

```bash
gh workflow run e2e.yml --ref feat/189-playwright-preflight -f environment=teaser
```

GitHub discovers workflows from the default branch, so this may report `could not find any workflows named e2e.yml` before the file reaches main — if so, skip this step (Task 4's post-merge dispatch is the binding proof; nothing here depends on the early signal). If the run does start:

```bash
gh run list --workflow e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch <databaseId> --exit-status
```

Expected: the `smoke` job green, `Run the e2e suite` showing `1 passed`. Save the run URL to `.superpowers/sdd/2026-10-06-189-playwright-preflight/evidence/`.

---

### Task 3: The v1 fence — paths.txt records the three main-only paths

**Files:**
- Modify: `scripts/seed-v1/paths.txt` (three paths + the comment; nothing else)

**Interfaces:**
- Consumes: the three foundation paths landed by Tasks 1–2 (`e2e/`, `playwright.config.ts`, `.github/workflows/e2e.yml`).
- Produces: MAIN-ONLY classification for the three paths — and, by `v1-triage.mjs`'s prefix matching, for **every future file under `e2e/`** (ADR-0022's "every future file under e2e/ inherits main-only classification automatically").

**Not here:** any other `paths.txt` line (the file is the record of the one rewrite — only this ticket's paths are additive); executing any v1 pick (this ticket's own PR is triaged SKIP at close, Task 4).

- [ ] **Step 1: Edit paths.txt**

In `scripts/seed-v1/paths.txt`, directly after the `graphify-out` line (still inside the "Owner tooling + edition mechanics" group), append:

```text
# The Playwright pre-flight (M6 #189, ADR-0022) — main-only owner tooling;
# the workflow path is load-bearing: .github/workflows/ is not seeded out, and
# a scheduled workflow picked to v1 would fire nightly against missing files.
e2e
playwright.config.ts
.github/workflows/e2e.yml
```

- [ ] **Step 2: Prove the classifier reads it live**

```bash
node scripts/v1-triage.mjs $(git rev-parse HEAD~1)   # the Task 1 commit
node scripts/v1-triage.mjs $(git rev-parse HEAD~0)   # the Task 2 commit
```

Expected for the Task 1 commit — the paths classify and the verdict prints:

```text
v1 triage — <sha7> feat(e2e): the Playwright foundation — root @playwright/test, chromium-only config, the smoke home (#189)
  v1-path    .gitignore
  MAIN-ONLY  e2e/README.md
  MAIN-ONLY  e2e/smoke/foundation.spec.ts
  MAIN-ONLY  playwright.config.ts
  v1-path    package.json
  v1-path    pnpm-lock.yaml
VERDICT SPLIT — 3 v1-path(s) + 3 main-only; drop the main-only paths
```

Expected for the Task 2 commit:

```text
v1 triage — <sha7> ci(e2e): nightly + dispatch workflow with cached browsers; never PR-gating (#189)
  MAIN-ONLY  .github/workflows/e2e.yml
VERDICT SKIP — all 1 path(s) main-only
```

(Path order within a commit follows the classifier's `git show` output — match the classification of each path, not the row order. If `e2e/…` or the workflow path ever print `v1-path`, the paths.txt edit did not land — fix before proceeding.)

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-v1/paths.txt
git commit -m "chore(seed-v1): paths.txt records the Playwright foundation's three main-only paths (#189)"
```

---

### Task 4: Gates, the CDP-green proof, docs rotation, PR/merge, post-merge verification, ledger, close

**Files:**
- Modify: `docs/plan.md` (M6 box 6), `docs/progress.md` (dated entry + the frontier line), `AGENTS.md` (Commands line + one status sentence), `docs/agents/v1-picks.md` (ledger row — post-merge)

**Interfaces:**
- Consumes: Tasks 1–3's commits (the branch `feat/189-playwright-preflight`), Task 1's locally installed chromium, Task 2's workflow + teaser variable.
- Produces: the merged main state (foundation live, nightly registered, dispatch green), the ledger row, and the closed ticket — #190's starting point.

**Not here:** any #190 work that the merge "unblocks" (the seven assertions, smoke-staff) — the ticket closes on the foundation's own ACs.

- [ ] **Step 1: Full gates — the browserless PR-gate mirror**

Run: `docker compose up -d db` (if not up), then `pnpm check` and `pnpm build`.
Expected: `pnpm check` green — **38 turbo tasks succeeded, 0 failed**, every vitest floor unchanged (api 26 files passed + 1 skipped / 317 passed + 3 skipped; api-client 5 files / 33 tests; admin 6 files / 55 tests); `pnpm build` green. The output contains ZERO playwright/chromium/browser lines — this is the "nothing joins the PR gate / still browserless" acceptance criterion, executable.

- [ ] **Step 2: The CDP harnesses still green (untouched, re-proven)**

Run as ONE script block (shell state does not persist between calls):

```bash
set -o pipefail   # without it, $? after `node | tee` is tee's 0, not node's
EVIDENCE=.superpowers/sdd/2026-10-06-189-playwright-preflight/evidence
pnpm dev > "$EVIDENCE/dev.log" 2>&1 &
DEV_PID=$!
for i in $(seq 1 90); do curl -sf http://localhost:3000/ >/dev/null && break; sleep 2; done
curl -sf http://127.0.0.1:8787/health
CHROME=$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux/chrome 2>/dev/null | head -1)
[ -n "$CHROME" ] || CHROME=$(ls -d "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | head -1)
echo "CDP chrome: $CHROME"
"$CHROME" --headless --no-sandbox --disable-gpu --remote-debugging-port=9222 about:blank >/dev/null 2>&1 &
CHROME_PID=$!
sleep 2
curl -sf http://127.0.0.1:9222/json/version >/dev/null
node apps/landing/scripts/verify/packages-pages.mjs 2>&1 | tee "$EVIDENCE/cdp-packages-pages.txt"
PP=$?
node apps/landing/scripts/verify/content-pages.mjs 2>&1 | tee "$EVIDENCE/cdp-content-pages.txt"
CP=$?
kill "$CHROME_PID" "$DEV_PID" 2>/dev/null
pkill -f 'turbo run dev' 2>/dev/null; pkill -f 'vite dev' 2>/dev/null || true
exit $((PP + CP))
```

Expected: `17/17 checks passed` and `20/20 checks passed`, both exit 0 (the M2-prior-art loop — local stack + headless chrome on CDP 9222 — driven here by the foundation's own Task-1 chromium). The counts are the ledger's last recorded (#151's ruled edits); if they differ, count each script's `check(` calls and reconcile against the live run — do not loosen. If chrome fails to launch over missing libs: `pnpm exec playwright install-deps chromium` and retry the block.

- [ ] **Step 3: Docs rotation**

Three files, five verbatim edits.

**(a) `docs/plan.md`** — tick M6 box 6. Change:

```markdown
- [ ] The **Playwright pre-flight** — standalone `@playwright/test` at a top-level `e2e/` (ADR-0022), chromium-only, CI on-demand + nightly with cached browsers, never PR-gating, main-only never picked
```

to:

```markdown
- [✅] The **Playwright pre-flight** — standalone `@playwright/test` at a top-level `e2e/` (ADR-0022), chromium-only, CI on-demand + nightly with cached browsers, never PR-gating, main-only never picked _(landed 2026-10-06 via #189 — @playwright/test 1.63.0 at the root with `test:e2e` outside turbo (`pnpm check` stays browserless), `e2e/smoke/` born with the foundation probe, nightly 19:07 UTC + dispatch with cached browsers, the three main-only paths in paths.txt; the seven-assertion production smoke — the next box — is #190's)_
```

Boxes 7 (smoke) and 11 (verify) stay unticked — they belong to #190/#192.

**(b) `docs/progress.md`** — two edits. First, insert this dated entry directly under the `# Progress` heading (above the `2026-10-05 — #180` entry; newest first):

```markdown
2026-10-06 — #189, M6 ticket 07, the Playwright pre-flight foundation, landed per ADR-0022: standalone `@playwright/test` 1.63.0 as a ROOT devDependency with the `test:e2e` script deliberately invisible to turbo (the root is not a pnpm workspace member — `pnpm check` stays browserless, proven: 38/38 turbo tasks, zero browser output); `playwright.config.ts` chromium-only with the `E2E_BASE_URL` fail-fast contract (no default baseURL — a smoke against the wrong target is worse than no run; `e2e/smoke/` born with the one-probe foundation spec, presence-level 200 against the configured deployment — #190's seven assertions supersede it); `.github/workflows/e2e.yml` on schedule `7 19 * * *` (03:07 Manila) + `workflow_dispatch` (teaser|v1 choice) with `PLAYWRIGHT_BROWSERS_PATH`-cached browsers and a failure-only report artifact — never PR-gating (the PR's checks listed `check` alone; ci.yml byte-untouched), the post-merge dispatch green; `E2E_BASE_URL` set as a teaser environment variable via `gh`; the three foundation paths (`e2e`, `playwright.config.ts`, `.github/workflows/e2e.yml`) recorded main-only in `scripts/seed-v1/paths.txt` (the workflow path load-bearing — `.github/workflows/` is not seeded out; the PR triages SKIP — the manifest hunks exist only to serve the main-only foundation); and the CDP harnesses untouched + re-proven green (packages-pages 17/17, content-pages 20/20 over the local stack via the foundation's own chromium on CDP 9222). The nightly's first scheduled fire is the owner's next-day observation; #190 builds the seven-assertion production smoke on this foundation.
```

Second, in `## Immediate Next Steps` item 1, change the frontier phrase:

```markdown
**#189** (the Playwright pre-flight foundation),
```

to:

```markdown
#189 (landed 2026-10-06 — the Playwright pre-flight foundation),
```

(the rest of the line — including `#190 off {#189, #186}` — stays as is: #190 still needs #186).

**(c) `AGENTS.md`** — two edits. First, in Commands, change:

```markdown
- Test: `pnpm test`
- Everything (lint + format + typecheck + test): `pnpm check`
```

to:

```markdown
- Test: `pnpm test`
- E2E, browser smoke (chromium-only, walks a deployed environment via `E2E_BASE_URL`; never part of `pnpm check` — ADR-0022): first run `pnpm exec playwright install chromium`, then `E2E_BASE_URL=<deployment> pnpm test:e2e`
- Everything (lint + format + typecheck + test): `pnpm check`
```

Second, at the end of the "Current status of `pnpm test`" section, change:

```markdown
 The api and landing suites remain the behavioral backbones.
```

to:

```markdown
 The api and landing suites remain the behavioral backbones.

The Playwright foundation (M6 #189) lives outside this umbrella: a root `test:e2e` script walks deployed environments (chromium-only; nightly + dispatch in `.github/workflows/e2e.yml`, cached browsers) and never joins `pnpm check` — commit-green and smoke-green stay separate verdicts (ADR-0022).
```

- [ ] **Step 4: graphify + commit + push**

```bash
graphify update .
git add docs/plan.md docs/progress.md AGENTS.md graphify-out
git commit -m "docs: #189 close-out — plan.md M6 box 6, progress record, AGENTS e2e commands (#189)"
git push
```

(Dirty `graphify-out/` files after the update are expected — commit what the update changed.)

- [ ] **Step 5: Open the PR**

```bash
gh pr create --base main --title "feat(e2e): the Playwright pre-flight foundation — root @playwright/test, nightly+dispatch CI, the v1 fence (#189)" --body "$(cat <<'EOF'
Closes #189.

- The foundation: `@playwright/test` 1.63.0 as a root devDependency, `test:e2e` outside turbo (the root is not a workspace member — `pnpm check` stays browserless), `playwright.config.ts` chromium-only with the `E2E_BASE_URL` fail-fast contract, `e2e/smoke/` born with the one-probe foundation spec + README.
- The CI leg: `.github/workflows/e2e.yml` — nightly `7 19 * * *` + `workflow_dispatch` (teaser|v1), cached browsers, never PR-gating (ci.yml byte-untouched); `E2E_BASE_URL` set in the teaser GitHub environment.
- The v1 fence: `scripts/seed-v1/paths.txt` gains `e2e`, `playwright.config.ts`, `.github/workflows/e2e.yml` (main-only, never picked — the spec's class table).
- Proofs: local run green against teaser; the fail-fast guard; `pnpm check` 38/38 browserless; CDP harnesses untouched + green (packages-pages 17/17, content-pages 20/20); the PR gate shows `check` alone.

Evidence: `.superpowers/sdd/2026-10-06-189-playwright-preflight/evidence/` (local runs) + the post-merge dispatch run linked in #189's close comment.

Spec: #182 § The Playwright pre-flight; ADR-0022.
EOF
)"
```

- [ ] **Step 6: Prove nothing joined the PR gate, then merge**

```bash
gh pr checks
```

Expected: a single row — `check` (ci.yml) — passing. NO e2e row (the workflow has no `push`/`pull_request` triggers — this is the acceptance criterion "nothing joins the PR gate", executable). When `check` is green:

```bash
gh pr merge --squash --delete-branch
git switch main && git pull --ff-only
git rev-parse HEAD   # note this — the squash sha feeds Step 8's triage
```

- [ ] **Step 7: Post-merge verification — the dispatch works, the nightly is registered**

```bash
gh workflow list
```

Expected: `E2E (Playwright)` listed with state `active` (alongside `CI`).

```bash
gh workflow run e2e.yml -f environment=teaser
gh run list --workflow e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch <databaseId> --exit-status
```

Expected: the `smoke` job green — `Run the e2e suite` showing `1 passed`, the browser cache step reporting a miss-then-save on the first run and a hit on later ones. Save the run URL to the evidence dir and reference it in the close comment. The nightly's own first scheduled fire (tonight 19:07 UTC) is the owner's next-day observation — the acceptance criterion's "fires green on schedule" completes there; the dispatch run just proved the identical code path.

- [ ] **Step 8: v1 triage + the ledger row**

```bash
node scripts/v1-triage.mjs $(git rev-parse HEAD)
```

Expected verdict on the squash: `SPLIT` — the v1-paths are root `package.json`, `pnpm-lock.yaml`, `.gitignore`, `docs/plan.md`, `AGENTS.md` beside the main-only foundation paths. The content pass rules the whole PR **SKIP**: the docs hunks are edition mechanics (milestone/pick prose), and the manifest hunks (the devDep + the script + their lockfile entries) exist only to serve the main-only foundation — purpose-coupled tooling, the #65 worked-example logic; the spec's class table rules the Playwright foundation MAIN-ONLY, never picked. No v1 checkout work, no locks owed.

Append one row to the ledger table in `docs/agents/v1-picks.md` (fill `<PR>` and the main sha from Step 6):

```markdown
| 2026-10-06 | #<PR> | `<main sha>` | skip | — | #189 — M6 ticket 07, the Playwright pre-flight foundation: root `@playwright/test` 1.63.0 + `test:e2e` outside turbo (pnpm check stays browserless), `playwright.config.ts` chromium-only `E2E_BASE_URL` fail-fast, `e2e/smoke/foundation.spec.ts` + README, `.github/workflows/e2e.yml` (nightly 7 19 * * * + dispatch, cached browsers, never PR-gating), paths.txt +3 main-only paths, `E2E_BASE_URL` var in the teaser env. Classifier SPLIT — v1-paths (root package.json, pnpm-lock.yaml, .gitignore, docs/plan.md, AGENTS.md) beside main-only; content pass: the docs hunks are edition mechanics and the manifest hunks exist only to serve the main-only foundation (purpose-coupled tooling, the #65 worked-example logic; the spec's class table rules the foundation MAIN-ONLY, never picked) → SKIP. No v1 push, no locks owed; ci.yml byte-untouched — the PR gate showed `check` alone |
```

Commit the ledger row directly on main (the `4b96b5c` precedent — ledger rows land as their own docs commit post-merge; the docs-only push triggers a turbo-cached ci run and a no-op teaser deploy, both expected):

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — #189 Playwright foundation skipped (#189, #<PR>)"
git push origin main
```

- [ ] **Step 9: Close the ticket**

```bash
gh issue close 189 --comment "The foundation is live: \`pnpm test:e2e\` runs chromium-only against \`E2E_BASE_URL\` (teaser variable set), the workflow is registered nightly at 19:07 UTC with a green post-merge dispatch, \`paths.txt\` carries the three main-only paths, the CDP harnesses re-proven green (packages-pages 17/17, content-pages 20/20), and nothing joined the PR gate (\`check\` alone on the PR). The nightly's first scheduled fire — the last AC line — is the owner's next-day observation; #190 builds the seven-assertion production smoke on this foundation."
```

---

## Self-review record (planner)

- **Spec coverage:** every #189 "What to build" clause maps to a task — standalone `@playwright/test` at top-level `e2e/` + root config + root devDep + `test:e2e` outside turbo (Task 1), chromium-only + `e2e/smoke/` home (Task 1), nightly + `workflow_dispatch` with cached browsers + never PR-gating (Tasks 2 and 4 Step 6), the `paths.txt` trio with the load-bearing workflow path (Task 3). All four acceptance criteria have executable proofs: local spec via the root script with browserless `pnpm check` (Task 1 Steps 8–10), nightly/dispatch (Task 4 Step 7 + the next-day observation note), paths.txt + CDP harnesses green (Task 3 Step 2 + Task 4 Step 2), PR gate unchanged (Task 4 Steps 1 and 6).
- **Sibling fences:** #190's deliverables named as not-here in Global Constraints, Task 1, and Task 4; plan.md boxes 7 and 11 explicitly left unticked with their owners named.
- **Type/name consistency:** `test:e2e` → `playwright test`; `E2E_BASE_URL` spelled identically in config, workflow, `gh variable set`, README, and close comment; the workflow filename `.github/workflows/e2e.yml` identical in Task 2, Task 3's paths.txt block, the classifier expectation, and the ledger row; counts asserted in more than one place (38 turbo tasks, 17/17 + 20/20, `1 passed`) re-derived from the same sources (turbo dry probe, ledger #151, the single foundation spec).
- **Placeholder scan:** no TBD/TODO/"as appropriate" steps; every file edit carries verbatim content; the only fill-ins are execution-time facts (`<PR>`, `<main sha>`, `<databaseId>`, `<sha7>`) with the command that produces each.


