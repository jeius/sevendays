# Edition-aware pipelines — teaser live on main, v1 private-deploy leg dormant (#79) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the two-edition deploy posture from ADR-0015 before the seed, so the future `v1` branch is locked from its first push: CI triggers generalized past `main` (the future `v1` branch covered from birth, dormant until it exists), and a branch-keyed continuous deploy — push to `main` deploys the three existing owner Workers (`sevendays-landing`, `sevendays-admin`, `sevendays-api` — today's manual `wrangler deploy` automated, the teaser), push to `v1` deploys the `sevendays-v1-*` Workers (dormant until the seed lands). Per-target secrets (Cloudflare API token, per-target `DATABASE_URL`) live as GitHub environment secrets; deploys gate on CI green. The teaser leg is verified by a real merge reaching the teaser live (the issue's AC).

**Architecture:** One workflow file — the existing `.github/workflows/ci.yml` — carries both ADR-0015 locks. Its `on:` triggers generalize from `[main]` to `[main, v1]` (push + pull_request); the existing `check` job stays byte-identical; two new `needs: check` deploy jobs are appended: `deploy-teaser` (fires only on push to `refs/heads/main`, GitHub environment `teaser`) and `deploy-v1` (fires only on push to `refs/heads/v1`, GitHub environment `v1`). `needs:` is the CI-green gate the issue requires — a deploy job cannot start until the same push's check job is green. Environment-scoped secrets are the isolation mechanism: each job sees only its own environment's secrets, so teaser and v1 can never share a token or a `DATABASE_URL`. The deploy jobs mirror CI's proven prefix (install → `build:packages` → api build) and then build landing + admin, then `wrangler deploy` each app with an explicit `--name` (the six worker names are pinned in the workflow — the pipeline, not the per-branch config, guarantees the two editions never collide on a Worker; see fact 12), with `--var "API_URL:$API_URL"` on the two frontends (their `API_URL` is a per-target runtime Worker var — fact 4) and a `wrangler secret put DATABASE_URL` sync for the api from the environment's `DATABASE_URL` secret (the source of truth the issue names; fact 7). The v1 leg's Worker names come from this workflow regardless of what the seed's scrub rules do to the `wrangler.jsonc`/`wrangler.toml` names, so the v1 deploy can never overwrite a teaser Worker. ADR-0015 already records the mechanism decision (continuous deploy + CI as the two locks); this ticket executes it — no new ADR. Consequence of the single-file design: the `v1` branch inherits this same file at the seed and governs its own deploys from its own ref — workflow fixes reach `v1` through the standing cherry-pick discipline like any other non-booking PR.

**Tech Stack:** GitHub Actions (the existing `ci.yml`: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, Node 24, pnpm 11.24.0 from `packageManager`), Wrangler 4.127.1 (pinned by the apps' devDependencies; `--name`/`--var` overrides dry-run-probed 2026-09-11 — fact 3), Cloudflare Workers (three teaser Workers on the owner's account, workers.dev subdomain `pahamajulius`), GitHub environments (`gh` 2.45.0: `gh api` environment create, `gh secret set --env`, `gh variable set --env`), PyYAML for local workflow-file syntax validation.

**Spec:** GitHub issue jeius/sevendays#79 (`ready-for-agent`), parent #76 — the delivery-versions spec (`docs/specs/2026-09-11-delivery-versions-spec.md`), § The Artifact Mechanism (recorded as ADR-0015) and § Verification items 1–2 (CI on `v1`; continuous private deploy of `v1`). Roadmap: `docs/plan.md` "v1 Artifact Seed" block — this ticket owns the "CI on `v1`" and "Teaser" checkboxes; the "Seed", "Continuous private deploy of `v1`", "Cherry-pick discipline", and "Verify" checkboxes stay unticked (fenced in Task 6). Predecessor plans (all landed): `docs/superpowers/plans/2026-09-10-m2-10-e2e-verification-docs-closeout.md` and earlier.

## Global Constraints

- Node >= 24 (v26.7.0 on this machine; CI pins Node 24); pnpm 11.24.0 (root `packageManager`); run repo commands from the repo root unless a step's `working-directory` says otherwise. Wrangler is 4.127.1 everywhere (the apps' devDependency range resolves to it from the lockfile — CI installs `--frozen-lockfile`, so CI's wrangler matches the probed one exactly).
- Work on a feature branch off `main` (suggested: `feat/edition-aware-pipelines`; HEAD at plan time `b70314f`); never commit to `main`. The **owner** pushes the branch, opens the PR, and merges it — the merge to `main` IS the verification trigger (the issue's AC), and the standing posture applies: no executor `git push`, no executor PR merge, no issue edits (the issue's acceptance boxes are the owner's to tick).
- Do not commit code that fails `pnpm check` for what you touched. This ticket's file surface is `.github/workflows/ci.yml` + `docs/*` only — no app/package source changes — so the suite counts must not move: landing vitest 56, api suite 93/12 files, admin no-op (baseline: CI green on `main` HEAD `b70314f`, run 34511332528, 2026-09-10).
- **Secrets:** never print, echo, log, paste into a command, or commit any secret value (`CLOUDFLARE_API_TOKEN`, `DATABASE_URL`, `RESEND_API_KEY`). Every owner-supplied value enters through the owner-only STOP gates (Task 4); the executor verifies GitHub secrets by **name only** (`gh api …/secrets --jq`, values are unreadable by design) and Worker secrets by name only (`wrangler secret list`). The one class of values the executor may set freely is GitHub environment **variables** (`API_URL` — plain workers.dev URLs, not secrets).
- The teaser is the owner's booking-bearing deployment. The only live-deploying act in this plan is the owner's ordinary merge of the PR to `main` — the workflow does the rest. Never manufacture commits just to re-trigger; if the deploy leg fails, fix on the branch and let the owner merge again (Task 5 Step 5's loop).
- `docs/plan.md` ticks use the ✅ emoji (`- [✅]`) with a dated annotation, never plain `[x]`. Only the two checkboxes this ticket owns move; the sibling boxes stay byte-identical (Task 6 pins the exact before/after and Task 6's audit asserts the count of untouched boxes).
- **No new ADR.** ADR-0015 (accepted 2026-09-11) already records the two-lock mechanism this ticket implements; the GitHub-environment secret topology is its deployment mechanics, documented in `docs/tech-stack.md` (Task 6) — not a new architectural decision.
- graphify 0.9.34 is installed (`/home/jeius/.local/bin/graphify`); `graphify-out/` is git-tracked — after the docs changes, `graphify update .` and commit its diff alongside (AST-only, no API cost).
- Workflow YAML is validated locally with PyYAML after every edit: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('yaml ok')"` (PyYAML parses the `on:` key as boolean `True` — harmless for a syntax check). The PR's own CI run is the execution proof for the check job; the deploy jobs' first real execution is the post-merge push (unavoidable and exactly what Task 5 verifies — the fix loop is there for it).

## Verified pre-plan facts (probed against the real workspace 2026-09-11, HEAD `b70314f`)

Trust these; don't re-derive:

1. **Issue #79 is OPEN, `ready-for-agent`**, blocked by nothing. Its ACs map to this plan: triggers generalized (Task 1), teaser continuous deploy verified by a real merge (Tasks 2–5), `v1` leg configured for `sevendays-v1-landing`/`sevendays-v1-admin`/`sevendays-v1-api` with its own environment secrets (Tasks 2–4), separate Worker targets never sharing env or secrets (Tasks 2–3), `pnpm check` green (Task 6).
2. **GitHub repo state:** `jeius/sevendays` is **public** (environments are available on the free plan), default branch `main`, **no branch protection** on `main`, **zero GitHub environments**, **zero repo-level secrets**. `.github/` contains only `workflows/ci.yml`. CI today: one `check` job (postgres service → checkout → pnpm/node → install → `build:packages` → api build → `pnpm check` → `pnpm build`), triggered on push/PR to `main` only. CI is green on HEAD `b70314f` (run 34511332528).
3. **Deploy mechanics, dry-run-probed** (read-only `wrangler deploy --dry-run`): `wrangler deploy` in `apps/landing` reads `.wrangler/deploy/config.json` (written by the vite build) and follows it to the redirected config `dist/server/wrangler.json` (which carries the app root `wrangler.jsonc`'s `name: sevendays-landing`, `main: index.js`, `assets: ../client`) — `pnpm run build && wrangler deploy` is therefore the whole deploy for the TanStack apps; `--name <override>` is accepted with the redirected config; `--var "API_URL:<url>"` is accepted and appears in the binding summary. `apps/api`'s `wrangler deploy` bundles `src/index.ts` via `wrangler.toml` directly (no build step), and `--name` is accepted there too. Admin mirrors landing (same plugin layout, `dist/server/wrangler.json` present).
4. **Runtime env needs:** `apps/landing` and `apps/admin` both read `process.env.API_URL` server-side with a fail-loud no-fallback error (`src/lib/api.server.ts` in each: "Set it in … .env.local (dev) or Workers vars (prod). No fallback by design.") — in production this must be a per-target **Worker var**, hence `--var "API_URL:$API_URL"` on every frontend deploy. Neither frontend imports `@sevendays/db` (grep: zero hits) — **only `apps/api` needs `DATABASE_URL`**. `apps/api`'s `envSchema` requires `DATABASE_URL`, `RESEND_API_KEY`, `LANDING_ORIGIN` — every `/api/v1` request parses the full schema, so a missing var fails loudly per request. The `VITE_*` vars (posthog/sentry) are optional client-side and guarded — no build-time inputs are required for any deploy.
5. **Cloudflare live state (owner's account, wrangler OAuth'd locally as pahamajulius@gmail.com):** `sevendays-api` is deployed and live at `https://sevendays-api.pahamajulius.workers.dev` (`/health` → 200; `/api/v1/service-packages` serves the seeded catalog). It holds **exactly one secret: `DATABASE_URL`** (`wrangler secret list`, names only) — the current main code also requires `RESEND_API_KEY` + `LANDING_ORIGIN`, so those two are a one-time owner prerequisite before the teaser api can serve (Task 4 Step 2). `sevendays-landing` and `sevendays-admin` return 404 — never deployed; their first deploy creates them and their `sevendays-<name>.pahamajulius.workers.dev` URLs.
6. **Live-gate markers:** landing's root title is `Sevendays Photography` (`apps/landing/src/routes/__root.tsx:26`); the `/packages` route server-loads `servicePackageQueries.all()` (`routes/packages/index.tsx:10`) and `package-card.tsx:15` renders `peso(pkg.priceCents)` — so `curl https://sevendays-landing…/packages | grep -c '₱'` ≥ 1 proves the full chain (landing Worker → `API_URL` var → api Worker → Supabase) without pinning any seed name. Admin's root title is `Sevendays Admin` (`apps/admin/src/routes/__root.tsx:26`).
7. **Worker secret/var semantics:** `wrangler deploy` replaces committed `[vars]` but **persists existing Worker secrets** across deploys (deleting one requires `wrangler secret delete`) — so the owner-set `RESEND_API_KEY`/`LANDING_ORIGIN` survive every pipeline deploy, while `API_URL` must ride **every** frontend deploy as `--var` (the `wrangler.jsonc` files carry no `[vars]`, so a manual `wrangler … vars` would be wiped on the next deploy). The pipeline's `wrangler secret put DATABASE_URL` (from the GitHub environment secret) creates a new secret version per deploy — harmless churn, the price of the pipeline owning the sync; the alternative (owner-manual puts) is what the issue replaces.
8. **Live catalog reality:** the live api returns the seeded catalog (e.g. `Basic Package`, `priceCents: 90000` observed 2026-09-11) — but every live-gate check re-derives its marker structurally (`₱` count, branch count) and never pins a catalog name.
9. **`gh` 2.45.0 capabilities (probed):** `gh variable set --help` documents `--env` (environment variables), `gh secret set` documents `--env` (environment secrets), and environments are created via `gh api -X PUT repos/jeius/sevendays/environments/<name>`. Secret values are write-only through the API — verification is by name only.
10. **Turborepo/root scripts:** `pnpm build:packages` = `turbo run build --filter="{./packages/*}..."`; `pnpm check` = lint+format+typecheck+test. The deploy jobs reuse CI's exact proven prefix (install → `build:packages` → `pnpm --filter @sevendays/api build`) — the api build is kept even though `wrangler deploy` re-bundles, because it is the cheap, already-proven path (and keeps the two jobs' shapes aligned).
11. **Repo state at plan time:** HEAD `b70314f`, clean tree (only the untracked `graphify-out/cache/last_query_stamp`). Local workflow YAML validation is available (PyYAML present).
12. **The `sevendays-v1-*` names are pinned nowhere except issue #79's AC** (grep over `docs/specs/`, `docs/plan.md`, ADR-0015: zero hits) — so this workflow carries them itself via explicit `--name` flags on all six deploy steps. Whatever the seed's scrub rules later do to the config files' `name` fields, `--name` wins at deploy time and the two editions can never collide on a Worker target.
13. **`apps/api/wrangler.toml` carries `[vars] ENVIRONMENT = "development"`**, read by nothing in `apps/api/src` (grep: zero non-test hits). The teaser api deploys with it; harmless and untouched — not this ticket's surface.

---

### Task 1: Generalize the CI triggers past `main`

**Files:**
- Modify: `.github/workflows/ci.yml` (the `on:` block only)

**Interfaces:**
- Produces: CI running on push + pull_request for `main` **and** `v1`. The `v1` entries are dormant until the seed creates the branch (GitHub accepts unknown branch filters silently). The `check` job and every other line stay byte-identical.

**Not here:** no deploy jobs yet (Task 2); no job-body changes; no new workflow files; no runner/version bumps (Node 24, action versions, the postgres service block all stay exactly as they are).

- [ ] **Step 1: Edit the `on:` block**

In `.github/workflows/ci.yml`, replace:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

with:

```yaml
on:
  push:
    branches: [main, v1]
  pull_request:
    branches: [main, v1]
```

Then add this comment line directly above the `on:` block (ADR-0015's first lock, in-file):

```yaml
# CI is the first of ADR-0015's two locks: it runs on main and on the v1
# branch (the v1 triggers are dormant until the seed creates the branch, and
# the typed cascade then fails any incomplete booking cut). The second lock —
# the branch-keyed continuous deploy — lives in the deploy jobs below.
```

- [ ] **Step 2: Validate and commit**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('yaml ok')"` → `yaml ok`. Then `git diff --stat` → exactly `.github/workflows/ci.yml`, and the diff must touch only the `on:` block + the added comment (nothing else).

```bash
git add .github/workflows/ci.yml
git commit -m "ci: generalize triggers past main — push + PR on v1 covered from birth (#79)

The v1 entries are dormant until the artifact seed creates the branch
(ADR-0015); the check job is byte-identical. CI is the first of the two
locks — the branch-keyed continuous deploy lands next in this branch."
```

---

### Task 2: The branch-keyed continuous deploy legs

**Files:**
- Modify: `.github/workflows/ci.yml` (append two jobs; nothing else moves)

**Interfaces:**
- Consumes: the `check` job (Task 1's file) as the `needs:` gate; GitHub environments `teaser` and `v1` (created in Task 3) holding `CLOUDFLARE_API_TOKEN` + `DATABASE_URL` secrets and an `API_URL` variable each (Task 3/Task 4).
- Produces: push to `main` → `deploy-teaser` deploys `sevendays-api` (then syncs its `DATABASE_URL`), `sevendays-landing`, `sevendays-admin`; push to `v1` → `deploy-v1` deploys `sevendays-v1-api`, `sevendays-v1-landing`, `sevendays-v1-admin`. PR events and every other ref deploy nothing.

**Not here:** no app/wrangler-config changes (the `--name` flags pin the targets — fact 12); no api route/env changes; no separate deploy workflow file; no `workflow_dispatch` trigger (a redeploy is `gh run rerun` on the latest main run — noted in Task 5); no touching `ENVIRONMENT = "development"` in `apps/api/wrangler.toml` (fact 13).

- [ ] **Step 1: Append the two deploy jobs verbatim**

Append to the end of `.github/workflows/ci.yml` (exactly one blank line between the `check` job's last line and the new block):

```yaml
  # ADR-0015's second lock: the branch-keyed continuous deploy. Each leg is
  # gated on the same push's check job (needs:), fires only on its branch's
  # push, and draws its secrets from its own GitHub environment — the teaser
  # (main, the owner's booking-bearing deployment) and v1 (the private
  # booking-free deploy, dormant until the seed lands). The legs never share
  # a Worker target, a token, or a DATABASE_URL: the --name flags pin the six
  # targets and the environment scopes do the isolation. When M6 provisions
  # the dedicated accounts, the v1 leg rotates by swapping the v1
  # environment's secret values (token + DATABASE_URL + API_URL var) — no
  # workflow edit.
  deploy-teaser:
    name: Deploy teaser (main)
    needs: check
    if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
    runs-on: ubuntu-latest
    environment: teaser
    concurrency:
      group: deploy-teaser
      cancel-in-progress: false
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      API_URL: ${{ vars.API_URL }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build shared config package
        run: pnpm build:packages

      # Same proven prefix as the check job (see its in-file comment).
      - name: Build apps/api
        run: pnpm --filter @sevendays/api build

      - name: Build landing and admin
        run: |
          pnpm --filter @sevendays/landing run build
          pnpm --filter @sevendays/admin run build

      - name: Deploy api (sevendays-api)
        working-directory: apps/api
        run: pnpm exec wrangler deploy --name sevendays-api

      - name: Sync api DATABASE_URL from the environment secret
        working-directory: apps/api
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo '::error::DATABASE_URL secret missing from the teaser GitHub environment'
            exit 1
          fi
          printf '%s' "$DATABASE_URL" | pnpm exec wrangler secret put DATABASE_URL

      - name: Deploy landing (sevendays-landing)
        working-directory: apps/landing
        run: pnpm exec wrangler deploy --name sevendays-landing --var "API_URL:$API_URL"

      - name: Deploy admin (sevendays-admin)
        working-directory: apps/admin
        run: pnpm exec wrangler deploy --name sevendays-admin --var "API_URL:$API_URL"

  deploy-v1:
    name: Deploy v1 (private)
    needs: check
    if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/v1' }}
    runs-on: ubuntu-latest
    environment: v1
    concurrency:
      group: deploy-v1
      cancel-in-progress: false
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      API_URL: ${{ vars.API_URL }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build shared config package
        run: pnpm build:packages

      - name: Build apps/api
        run: pnpm --filter @sevendays/api build

      - name: Build landing and admin
        run: |
          pnpm --filter @sevendays/landing run build
          pnpm --filter @sevendays/admin run build

      - name: Deploy api (sevendays-v1-api)
        working-directory: apps/api
        run: pnpm exec wrangler deploy --name sevendays-v1-api

      - name: Sync api DATABASE_URL from the environment secret
        working-directory: apps/api
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo '::error::DATABASE_URL secret missing from the v1 GitHub environment'
            exit 1
          fi
          printf '%s' "$DATABASE_URL" | pnpm exec wrangler secret put DATABASE_URL

      - name: Deploy landing (sevendays-v1-landing)
        working-directory: apps/landing
        run: pnpm exec wrangler deploy --name sevendays-v1-landing --var "API_URL:$API_URL"

      - name: Deploy admin (sevendays-v1-admin)
        working-directory: apps/admin
        run: pnpm exec wrangler deploy --name sevendays-v1-admin --var "API_URL:$API_URL"
```

- [ ] **Step 2: Validate and audit the diff**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('yaml ok')"
grep -c 'wrangler deploy --name' .github/workflows/ci.yml      # 6 (three per leg)
grep -c 'environment:' .github/workflows/ci.yml                # 2 (teaser, v1)
git diff --stat                                                # ci.yml only
```
Expected: `yaml ok`, 6, 2, one file changed.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: branch-keyed continuous deploy — teaser on main, v1 private leg dormant (#79)

Two needs-gated deploy jobs: push to main deploys sevendays-{api,landing,
admin} (the teaser, unadvertised owner infra — today's manual wrangler
deploy automated); push to v1 deploys sevendays-v1-{api,landing,admin}
(dormant until the seed lands). Per-target secrets live as GitHub
environment secrets (CLOUDFLARE_API_TOKEN, DATABASE_URL) with API_URL as
an environment variable; the api's DATABASE_URL syncs from the
environment secret with a fail-loud empty guard. The --name flags pin
all six Worker targets, so the legs never collide regardless of what
the seed's scrub rules do to the config names."
```

---

### Task 3: GitHub environments `teaser` + `v1`, and their `API_URL` variables

**Files:**
- None in the repo (GitHub settings only — the executor-run half of the per-target setup; secret values stay owner-only, Task 4).

**Interfaces:**
- Consumes: nothing from Tasks 1–2 at GitHub's side (environments exist independently of the workflow file; creating them before the merge is what makes Task 5's first deploy leg runnable).
- Produces: two environments with **no protection rules** (continuous = autonomous), each holding one variable (`API_URL`). The workers.dev URLs are derivable from the account subdomain `pahamajulius` (fact 5).

**Not here:** no secret setting (Task 4, owner-only); no branch protection; no deployment-protection rules on either environment.

- [ ] **Step 1: Create the environments**

```bash
gh api -X PUT repos/jeius/sevendays/environments/teaser
gh api -X PUT repos/jeius/sevendays/environments/v1
gh api repos/jeius/sevendays/environments --jq '.environments[].name'
```
Expected: the two PUTs return 200, and the list prints `teaser` and `v1`.

- [ ] **Step 2: Set the `API_URL` variables (plain values, executor-settable)**

```bash
gh variable set API_URL --env teaser --body "https://sevendays-api.pahamajulius.workers.dev"
gh variable set API_URL --env v1 --body "https://sevendays-v1-api.pahamajulius.workers.dev"
gh api repos/jeius/sevendays/environments/teaser/variables --jq '.variables[] | [.name, .value]'
gh api repos/jeius/sevendays/environments/v1/variables --jq '.variables[] | [.name, .value]'
```
Expected: both lists show `API_URL` with the URL above. (These are public workers.dev URLs, not secrets. The v1 value is the v1 api Worker's future URL — correct from the first dormant deploy, and at M6 the value rotates with the account swap without a workflow edit.)

- [ ] **Step 3: Record the state (no commit — there is nothing repo-side in this task)**

`gh secret set` in Task 4 requires these environments to exist (done); Task 5's deploy job references them by name. Nothing to commit.

---

### Task 4: Owner secret gates (STOP steps — the executor never touches a secret value)

**Files:**
- None in the repo.

**Interfaces:**
- Consumes: the environments from Task 3; the owner's Cloudflare dashboard + locally OAuth'd wrangler; the existing secret values in the owner's custody (`apps/api/.dev.vars`'s `DATABASE_URL` + `RESEND_API_KEY` — both classified supabase-/resend-hosted, never printed).
- Produces: four GitHub environment secrets (`CLOUDFLARE_API_TOKEN` + `DATABASE_URL` on `teaser`, same pair on `v1`) and two one-time Worker secrets on `sevendays-api` (`RESEND_API_KEY`, `LANDING_ORIGIN`) — the full secret inventory the issue names, with nothing shared across targets.

**Not here:** no executor-typed secret values anywhere; no repo-level secrets (environment-scoped only — repo secrets would be visible to both legs and break the isolation AC); no changes to `apps/api/.dev.vars` (the local dev file stays as the owner keeps it).

- [ ] **Step 0: Precondition check (executor, read-only)**

```bash
gh api repos/jeius/sevendays/environments --jq '.environments[].name'   # teaser, v1
```
If either environment is missing, return to Task 3 before handing the owner anything.

- [ ] **Step 1: STOP — hand the owner these exact steps (GitHub-side secrets)**

Give the owner this block verbatim (the values never pass through the executor):

> **GitHub environment secrets (4) — run from the repo root, paste values at the prompts (they go to stdin, not shell history):**
>
> 1. **Two Cloudflare API tokens** (dash.cloudflare.com → My Profile → API Tokens → Create Token → Custom):
>    - Name them `github-actions-teaser` and `github-actions-v1` (distinct tokens — one per target, never reused across environments).
>    - Permissions: **Account | Workers Scripts | Edit**. Account Resources: Include → your (only) account. (Workers Scripts Edit covers `wrangler deploy` + `wrangler secret put`; keep each token scoped to the single account so wrangler needs no account id.)
> 2. Then, for each token:
>    ```bash
>    gh secret set CLOUDFLARE_API_TOKEN --env teaser   # paste the teaser token at the prompt
>    gh secret set CLOUDFLARE_API_TOKEN --env v1       # paste the v1 token at the prompt
>    ```
> 3. **Two DATABASE_URL values:** copy the transaction-pooled Supabase string (port 6543) from `apps/api/.dev.vars` (never print it):
>    ```bash
>    gh secret set DATABASE_URL --env teaser   # paste the pooled URL at the prompt
>    gh secret set DATABASE_URL --env v1       # see the note below before pasting
>    ```
>    **v1 note (owner's call, flagged):** pre-M6 there is exactly one Supabase project, so the v1 value is recommended to be the **same pooled URL** — a separate secret object in its own environment (the isolation the AC requires), whose VALUE rotates at M6's ship-time provisioning (#75: dedicated accounts, fresh project ⇒ new URL; secrets rotate at ship). The v1 api post-seed only reads the catalog (the appointment tables ship inert), so sharing the instance pre-rotation carries no booking write path.

- [ ] **Step 2: STOP — hand the owner these exact steps (one-time Worker secrets on `sevendays-api`)**

Give the owner this block verbatim:

> **Teaser api Worker prerequisites (one-time, owner-run; both survive every later pipeline deploy):**
> The current `main` code fails every `/api/v1` request without these (the envSchema has no fallbacks) and today's deployed Worker holds only `DATABASE_URL`. Run from `apps/api` (wrangler is OAuth'd as the owner):
>
> ```bash
> cd apps/api
> pnpm exec wrangler secret put RESEND_API_KEY   # paste the real key (same one as in .dev.vars)
> pnpm exec wrangler secret put LANDING_ORIGIN   # paste: https://sevendays-landing.pahamajulius.workers.dev
> ```
>
> (`LANDING_ORIGIN` is the landing teaser's URL — it does not exist until Task 5's first landing deploy, but the value is fixed by the account subdomain, so set it now; the email CTA is only exercised on real bookings, which are v2's concern.)

- [ ] **Step 3: Executor verification (names only)**

```bash
gh api repos/jeius/sevendays/environments/teaser/secrets --jq '.secrets[].name'
gh api repos/jeius/sevendays/environments/v1/secrets --jq '.secrets[].name'
cd apps/api && pnpm exec wrangler secret list | grep -c name; cd ../..
```
Expected: both environments list exactly `CLOUDFLARE_API_TOKEN` and `DATABASE_URL`; the Worker's secret list now counts 3 names (`DATABASE_URL`, `RESEND_API_KEY`, `LANDING_ORIGIN`). **No value may ever appear in any output** — if a command ever prints a value, stop and rotate the exposed secret before continuing. Task 5 is blocked until this step passes.

---

### Task 5: PR → CI green → the real merge reaching the teaser live

**Files:**
- None new. (If a live gate fails, the fix loop edits the branch's `ci.yml` — the only file that can be at fault, plus Task 4's secret state.)

**Interfaces:**
- Consumes: Tasks 1–4 complete (workflow on the branch; environments + variables + secrets in place); the owner for push/PR/merge.
- Produces: the issue's teaser AC evidenced — a real merge to `main` runs check → deploy-teaser, and the three teaser Workers serve live. **No commits in this task** (the evidence lands in `docs/progress.md` in Task 6 and the owner's PR description).

**Not here:** no force-pushes, no merge redirections, no manual `wrangler deploy` (the pipeline IS the deliverable — running one by hand would prove nothing about it), no v1-side actions (the branch does not exist; the v1 leg stays dormant).

- [ ] **Step 0: Preflight gates (executor, local)**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('yaml ok')"
pnpm check && pnpm build
```
Expected: `yaml ok`; both turbo runs green (the check/build jobs the PR will run, executed locally first — same commands CI runs).

- [ ] **Step 1: Hand off to the owner (push + PR + merge)**

Give the owner this block verbatim:

> ```bash
> git push -u origin feat/edition-aware-pipelines
> gh pr create --fill   # title: "ci: edition-aware pipelines — teaser live on main, v1 leg dormant (#79)"
> ```
> When the PR's CI is green, **merge it to `main`** (squash, repo convention). The merge push is the verification trigger: the same run's `check` → `Deploy teaser (main)` sequence is the AC. Do not tick the issue's acceptance boxes.

- [ ] **Step 2: Watch the main run (executor, read-only)**

After the owner merges:

```bash
gh run list --branch main --limit 1
gh run watch <run-id> --exit-status
gh run view <run-id> --json jobs --jq '.jobs[] | [.name, .conclusion]'
```

Expected: the run has two jobs — `check` and `Deploy teaser (main)` (the deploy job's display name; its id is `deploy-teaser`) — and the jobs list proves the gate: `check` → `success` and `Deploy teaser (main)` → `success`, with the deploy job's steps showing the three deploys + the DATABASE_URL sync in order. **If `Deploy teaser (main)` failed, go to Step 5's loop — the check job failing is not expected (Step 0 ran it locally).**

- [ ] **Step 3: The live gates (all read-only curls against the teaser)**

```bash
curl -s -o /dev/null -w 'api health: %{http_code}\n' --max-time 15 https://sevendays-api.pahamajulius.workers.dev/health
curl -s --max-time 15 https://sevendays-api.pahamajulius.workers.dev/api/v1/branches | grep -c '"id"'
curl -s -o /dev/null -w 'landing: %{http_code}\n' --max-time 15 https://sevendays-landing.pahamajulius.workers.dev/
curl -s --max-time 15 https://sevendays-landing.pahamajulius.workers.dev/ | grep -c 'Sevendays Photography'
curl -s --max-time 15 https://sevendays-landing.pahamajulius.workers.dev/packages | grep -c '₱'
curl -s -o /dev/null -w 'admin: %{http_code}\n' --max-time 15 https://sevendays-admin.pahamajulius.workers.dev/
curl -s --max-time 15 https://sevendays-admin.pahamajulius.workers.dev/ | grep -c 'Sevendays Admin'
```

Expected, line by line: `api health: 200`; `3` (the three seeded branches — also proves the synced `DATABASE_URL` **and** the owner-set `RESEND_API_KEY`/`LANDING_ORIGIN`: the envSchema parses per request, so any missing var would 500 this instead); `landing: 200`; `≥ 1` (the title); `≥ 1` (**the full chain** — landing Worker → `API_URL` var → api Worker → Supabase → peso-formatted prices in the SSR HTML); `admin: 200`; `≥ 1`. Workers.dev may take a minute to route a newly created Worker — if `landing`/`admin` 404 immediately after a green deploy, wait 60s and re-curl before investigating.

- [ ] **Step 4: Record the evidence (park it — no commit yet)**

Keep the run URL, the jobs conclusions, and the seven gate outputs (e.g. tee to `/tmp/editions-teaser-gate.txt`) — Task 6's progress bullet and the owner's PR description quote them.

- [ ] **Step 5: The fix loop (only if Step 2's deploy job or Step 3's gates failed)**

Diagnose from `gh run view <run-id> --log-failed` (read-only). The failure classes and their fixes:

- **`::error::DATABASE_URL secret missing…`** → Task 4 Step 1 was skipped for that environment; the owner runs the `gh secret set`, then re-run the deploy job: `gh run rerun <run-id> --failed` (re-runs keep the same merge — no new commit needed).
- **A wrangler auth error (401/`Authentication error`)** → the environment's `CLOUDFLARE_API_TOKEN` is wrong or under-scoped; the owner re-sets it (Task 4 Step 1's token recipe), then `gh run rerun <run-id> --failed`.
- **The api deploys but `/api/v1/*` 500s** → the owner-set Worker secrets (`RESEND_API_KEY`/`LANDING_ORIGIN`) are missing — Task 4 Step 2, then `gh run rerun` is NOT needed (secrets apply immediately; just re-curl).
- **The landing/admin builds fail in the deploy job but passed `pnpm build` locally** → a CI-env difference; fix the workflow or app on this same branch, and let the owner merge the fix commit (the continuous deploy makes every merge a retry — that is the point).
- **Anything else:** treat as a stop-and-investigate; the failing step's log names the cause.

When Step 2 and Step 3 all pass, return to Step 4 and record the FINAL green run (the evidence must be the run that left the teaser serving).

---

### Task 6: Docs close-out on a second branch + graphify + final gates + handoff

**Files:**
- Modify: `docs/plan.md` (two checkbox ticks), `docs/progress.md` (lead + one What Exists bullet), `docs/tech-stack.md` (one correction + one new subsection)
- Create (generated): `graphify-out/` diff

**Interfaces:**
- Consumes: Task 5's merge (the docs cite the merged PR and its live evidence — they cannot precede it) — hence the **second branch** off the post-merge `main`; the second PR's own merge to `main` triggers one more (no-op, identical-code) teaser deploy, which is continuous deploy working as designed.
- Produces: the issue's `pnpm check` AC (Step 7) and the recorded evidence.

**Not here:** no workflow edits in this task (the second PR touches docs only); no ticks outside the two owned checkboxes — "Seed the `v1` branch", "Continuous private deploy of `v1`", "Cherry-pick discipline", and the block's "Verify" line **stay unticked**: the first three belong to the seed pipeline (the deploy-leg checkbox claims the env-shed is "exercised for the whole polish window", which is only true once the branch exists and its deploys run — #79 configured the leg, it did not exercise it), and "Verify" is post-seed by definition. No sibling checkbox is touched, and none is ticked early.

- [ ] **Step 1: Branch off the post-merge `main`**

```bash
git fetch origin main
git checkout -b docs/edition-pipelines origin/main
```
Expected: branch created from the commit containing Task 2's workflow (spot-check: `grep -c 'deploy-teaser' .github/workflows/ci.yml` → 2).

- [ ] **Step 2: Refresh the `_Last updated:` lead in `docs/progress.md`**

The line currently opens `_Last updated: 2026-09-11 (delivery-versions map close-out #74 — …`. Insert this prefix directly after `_Last updated: 2026-09-11 (` (a pure prefix insertion — everything from the existing `delivery-versions map close-out #74` to the line's end stays byte-identical, it just becomes the "Prior" entry):

```markdown
edition-aware pipelines #79 — CI triggers generalized past main + the branch-keyed continuous deploy landed: teaser live on main after a real merge, v1 private deploy leg configured and dormant. Prior 2026-09-11: 
```

(Keep the trailing space in the prefix; the old text follows it directly.)

- [ ] **Step 3: Append the #79 bullet at the END of What Exists**

Insert immediately before the `## Known Gaps / Not Yet Done` heading (after the M2 close-out bullet):

```markdown
- **Edition-aware pipelines (#79 → ADR-0015):** the two-edition deploy posture stands before the seed, so the v1 branch is locked from its first push. `.github/workflows/ci.yml` now carries both ADR-0015 locks: triggers generalized past `main` (push + pull_request on `main` and `v1`; the v1 entries dormant until the seed creates the branch), and two `needs: check` deploy jobs — deploys gate on CI green. Push to `main` runs `deploy-teaser` (GitHub environment `teaser`): `sevendays-api` (deploy, then `DATABASE_URL` synced from the environment secret behind a fail-loud empty guard), `sevendays-landing` + `sevendays-admin` (each `--var "API_URL:$API_URL"` — the frontends' fail-loud runtime Worker var, which a bare deploy would otherwise wipe since the jsonc files carry no `[vars]`). Push to `v1` runs the mirrored `deploy-v1` (environment `v1`) for `sevendays-v1-api/-landing/-admin` — dormant until the seed lands. Per-target secrets live as GitHub environment secrets (`CLOUDFLARE_API_TOKEN` + `DATABASE_URL` on each of `teaser`/`v1`, distinct tokens, owner-set; the v1 `DATABASE_URL` value is the same pooled URL pre-M6 — a separate secret object in its own environment, rotating at ship-time provisioning per #75 — the v1 api post-seed only reads the catalog over inert appointment tables) with `API_URL` as an environment variable per target: the legs never share a Worker target, a token, or a secret's source, and the `--name` flags pin all six targets in the workflow itself so the editions can never collide regardless of what the seed's scrub rules do to the config names. One-time owner Worker secrets on `sevendays-api` (`RESEND_API_KEY`; `LANDING_ORIGIN` = the landing teaser URL) survive every pipeline deploy. Verified by the real merge (PR #<N>): check → deploy-teaser green on `main`; live gates — api `/health` 200, `/api/v1/branches` = 3 (proves the full envSchema parses, email pair included), landing 200 + peso-priced `/packages` SSR (the landing Worker → API_URL → api Worker → Supabase chain), admin 200. `docs/tech-stack.md` documents the pipeline + secret topology. The v1 leg's first real run is the seed's first push; workflow fixes reach `v1` through the standing cherry-pick discipline (the branch inherits this same file).
```

(Replace `PR #<N>` with Task 5's actual merged PR number — the one real run-time-known value in this task.)

- [ ] **Step 4: Tick the two owned checkboxes in `docs/plan.md`'s "v1 Artifact Seed" block**

Replace (line 85):

```markdown
- [ ] CI on `v1`: `pnpm check` + `pnpm build` on every change to the branch (the typed cascade is the compile-time lock — an incomplete cut cannot typecheck)
```

with:

```markdown
- [✅] CI on `v1`: `pnpm check` + `pnpm build` on every change to the branch (the typed cascade is the compile-time lock — an incomplete cut cannot typecheck) _(2026-09-11: #79 generalized the CI triggers — push + pull_request now cover `main` and `v1`; the check job is byte-identical and the v1 entries are dormant until the seed creates the branch, at which point the first push runs this same job. The branch-keyed continuous deploy, the block's other lock, landed alongside it (#79): the v1 deploy leg stands ready for `sevendays-v1-*`.)_
```

Replace (line 87):

```markdown
- [ ] Teaser: continuous auto-deploy of `main` to unadvertised owner infra (the owner's own booking-bearing deployment per #62; doubles as staging)
```

with:

```markdown
- [✅] Teaser: continuous auto-deploy of `main` to unadvertised owner infra (the owner's own booking-bearing deployment per #62; doubles as staging) _(2026-09-11: #79 landed `deploy-teaser` — push to `main` runs check → deploy of `sevendays-api` (+ `DATABASE_URL` sync), `sevendays-landing` + `sevendays-admin` (`--var API_URL`), gated on CI green; verified by the real merge PR #<N> reaching the teaser live — api `/health` 200, `/api/v1/branches` = 3, landing 200 with peso-priced `/packages`, admin 200.)_
```

Then `git diff --stat docs/plan.md` → exactly 1 file, 2 insertions, 2 deletions (same PR #<N> substitution in both).

- [ ] **Step 5: Update `docs/tech-stack.md`**

(a) In the Frontend section's Cloudflare Workers bullet, correct the emitted-layout claim to what the deploy actually follows — replace `dist/` (TanStack Start 1.168 layout: `dist/client`, `dist/server`, `dist/wrangler.json`) — the scaffold's `.output/` paths are obsolete.` with `dist/` (TanStack Start 1.168 layout: `dist/client` + `dist/server/wrangler.json` — the deployable config, which `wrangler deploy` follows through the vite plugin's `.wrangler/deploy/config.json` redirect; the scaffold's `.output/` paths are obsolete).`

(b) Annotate the provisioning record's item 3 — replace:

```markdown
3. Cloudflare Workers secret: `wrangler secret put DATABASE_URL` from `apps/api` (operator step — done during M1.5's deploy task if not already).
```

with:

```markdown
3. Cloudflare Workers secret: `wrangler secret put DATABASE_URL` from `apps/api` (operator step — done during M1.5's deploy task if not already). _(Superseded 2026-09-11 by #79 for the teaser: the Worker's `DATABASE_URL` now syncs from the `teaser` GitHub environment secret on every deploy; see Continuous deploy below.)_
```

(c) Insert a new subsection immediately after the Provisioning Postgres block (after its item 4, before `## Auth`):

```markdown
### Continuous deploy (2026-09-11, #79 — ADR-0015's second lock)

Deploys are branch-keyed GitHub Actions (`.github/workflows/ci.yml`), gated on CI green (`needs: check`). **Push to `main`** deploys the teaser — `sevendays-api`, `sevendays-landing`, `sevendays-admin` on the owner's account (workers.dev subdomain `pahamajulius`, unadvertised); **push to `v1`** deploys `sevendays-v1-api`, `sevendays-v1-landing`, `sevendays-v1-admin` (dormant until the artifact seed creates the branch). Per-target secrets live as GitHub **environment** secrets — `CLOUDFLARE_API_TOKEN` + `DATABASE_URL` on each of `teaser`/`v1` (distinct tokens; the api's `DATABASE_URL` syncs from the environment secret on every deploy, while `RESEND_API_KEY` + `LANDING_ORIGIN` on the teaser api are one-time owner `wrangler secret put`s that survive deploys) — and `API_URL` is an environment **variable** per target: a frontend Worker var that every deploy wipes, so it rides each deploy as `--var`. The `--name` flags pin all six Worker targets in the workflow itself, so the two editions never share a target, a token, or a secret's source. Manual redeploy: `gh run rerun <run-id> --failed` on the latest `main` run.
```

- [ ] **Step 6: Update the knowledge graph and commit**

```bash
graphify update .
git status --short graphify-out   # expect modified files; if empty, note it and drop graphify-out from the next command
git add docs/plan.md docs/progress.md docs/tech-stack.md graphify-out
git commit -m "docs: edition-aware pipelines close-out — plan.md ticks + progress/tech-stack (#79)

- plan.md: the seed block's CI-on-v1 + Teaser checkboxes ticked ✅ with the
  real-merge evidence; seed/continuous-private-deploy/cherry-pick/Verify
  stay unticked (the seed pipeline's).
- progress.md: the #79 What Exists bullet + lead refresh.
- tech-stack.md: deployable-config correction (dist/server/wrangler.json via
  the .wrangler/deploy redirect) + the Continuous deploy subsection
  (branch-keyed legs, GitHub environment secret topology)."
```

- [ ] **Step 7: Final gates**

```bash
docker compose up -d db && sleep 5   # the integration suites' Postgres (ADR-0008) — pings first if already up
pnpm check && pnpm build
```
Expected: both green across the workspace; the suite counts unmoved (landing 56, api 93/12 files) — this ticket's only executable change is CI YAML, which no workspace test reads.

- [ ] **Step 8: Handoff audits (all read-only), then hand off**

```bash
awk '/## v1 Artifact Seed/,/## Milestone 3/' docs/plan.md | grep -c '^- \[✅\]'   # 2 — exactly the two owned boxes
awk '/## v1 Artifact Seed/,/## Milestone 3/' docs/plan.md | grep -c '^- \[ \]'    # 4 — seed, private-deploy, cherry-pick, Verify stay unticked
git log --oneline -6
gh api repos/jeius/sevendays/environments --jq '.environments[].name'             # teaser, v1
```
Expected: 2 ticked, 4 unticked, the two commits (ci + docs) in the log, both environments present. Then hand the owner: `git push -u origin docs/edition-pipelines && gh pr create --fill` — and when its CI is green, **merge**. Expected and harmless: this second merge triggers one more check → deploy-teaser run redeploying identical code (the docs PR carries no executable change). The issue's acceptance boxes remain the owner's to tick.

---

## Self-Review (against issue #79 + ADR-0015)

- **Issue AC coverage:**
  - *CI runs on the future `v1` branch (triggers generalized; dormant)* → Task 1 (push + pull_request on `[main, v1]`; GitHub accepts unknown branch filters — dormancy is fact-backed).
  - *Push to `main` continuously deploys the teaser after CI green — verified by a real merge reaching the teaser live* → Tasks 2 + 5 (`needs: check` gate; the owner's merge is the trigger; seven live curls incl. the full-chain `₱` marker).
  - *`v1` deploy leg configured for the three `sevendays-v1-*` Workers with its own environment secrets; dormant* → Tasks 2 (the `deploy-v1` job + `--name` pins) + 3 (environment `v1`) + 4 (its own secrets).
  - *Teaser and v1 are separate Worker targets that never share env or secrets* → `--name` on all six steps (fact 12: the names exist nowhere else, so the workflow is the guarantee), environment-scoped secrets (`environment:` on each job — GitHub exposes only that environment's secrets), distinct tokens by Task 4 Step 1's recipe.
  - *`pnpm check` green* → Task 6 Step 7 (plus Task 5 Step 0's preflight).
- **Sibling fence:** the seed, the cherry-pick discipline, and the v1 leg's first real run are NOT this ticket's — the plan.md block's other four checkboxes stay unticked (Task 6 "Not here" + the 2/4 audit), no seed-side content (no filter-repo, no scrub rules, no booking-off changes, no `env.ts` shed), and the v1 leg is configured, never fired (the branch does not exist). The shared-block risk the skill warns about is discharged explicitly: "Continuous private deploy of `v1`" is configured-but-unticked with the reason recorded.
- **Probe-backed mechanics, not inference:** the vite-plugin deploy redirect + `--name` + `--var` were dry-run-probed (fact 3); the workers.dev subdomain, live api health, secret inventory, and 404-not-deployed state are probed facts (fact 5); the `₱` chain marker is derived from the actual rendering code (fact 6); `gh` capability and PyYAML probed (facts 9, 11).
- **Secrets posture:** every owner-supplied value enters through two STOP gates as verbatim owner-run blocks; the executor verifies by names only; no value is ever a command argument in an executor step. The one executor-set value class (`API_URL`) is public URLs. Repo-level secrets are explicitly fenced off (they would leak across legs).
- **Count consistency:** `wrangler deploy --name` appears exactly 6 times in the YAML (Task 2 Step 2's audit = 6; three per leg); `environment:` twice; plan.md seed block ends 2 ✅ / 4 unticked (stated in Task 6 Step 8 and here); the live gate is seven curl lines (Task 5 Step 3) with expectations stated line-by-line, and Step 4's "seven gate outputs" matches; suite counts pinned in exactly two places (Global Constraints and Task 6 Step 7), identically 56 / 93-12.
- **Name/signature consistency:** job names `deploy-teaser`/`deploy-v1` (YAML ↔ Task 5's watch/grep ↔ docs bullets); environment names `teaser`/`v1` (Tasks 3–5 ↔ workflow `environment:` keys); secret names `CLOUDFLARE_API_TOKEN`/`DATABASE_URL` and variable `API_URL` (Tasks 2–4 ↔ workflow `env:` blocks); Worker names `sevendays-{api,landing,admin}` + `sevendays-v1-{api,landing,admin}` (issue AC ↔ YAML ↔ progress bullet ↔ tech-stack subsection); branch names `feat/edition-aware-pipelines` (Tasks 1–5) and `docs/edition-pipelines` (Task 6) never conflated.
- **Mocked-boundary check:** nothing is mocked — the verification is the real stack through the real pipeline; the one non-obvious expectation (Workers.dev routing lag for a newly created Worker) is handled with a wait-and-recurl note in Task 5 Step 3.
- **Placeholder scan:** the only run-time-known values are the merged PR number (`PR #<N>`, Tasks 6 Steps 3–4) and the run id (`<run-id>`, Task 5) — both are produced by earlier steps of the same execution and cannot be known at plan time; every secret value is a prompt-paste in an owner-only block, never a literal.

