# The ship ceremony + M6 close-out (#192) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute `docs/ship-provisioning-runbook.md` end to end with the owner — Phase A's dedicated stack, the client-domain wait, Phase B's public stack ending at the seven-assertion production smoke — landing the ship-day cutover commit (ci.yml's two v1-leg value fixes + the Sentry edition note) as the release commit, then close Milestone 6: plan.md's five remaining M6 boxes ticked ✅, progress.md rotated with the exit criteria, both greens (commit-green + smoke-green) separately recorded.

**Architecture:** A ceremony-first ticket: most steps are owner-operated (dashboard actions, owner-held ship-born values) with this session running every CLI-runnable piece (gh environment writes, wrangler under the ship token, the db scripts, the two #191 ship scripts, curl probes) and recording every step's evidence in a gitignored walk log. Exactly one main-side code change exists, the B3 cutover commit: two `--var` value corrections on ci.yml's v1 leg + the header-comment narrowing + the Sentry link-out's completed-cutover note — squash-merged to main, then picked to `v1` with ONE ruled divergence (the v1-side `SENTRY_CONSOLE_URL` re-point to the `sevendays-studio` org), whose push is the first CI deploy onto the dedicated account and the ticket's commit-green. The dispatch-run smoke after it is smoke-green. Docs rotation and issue close-out finish the milestone. Two greens are never merged into one verdict.

**Tech Stack:** `gh` CLI (environment secrets/vars, run dispatch + watch, issue/PR operations), `wrangler` under the scoped ship token (r2 bucket ops, `deploy --dry-run` gate, `secret put`), `pnpm` + `packages/db` scripts (`db:migrate`, `db:seed`, `db:verify-seed`) + the two #191 owner-tooling scripts (`ship-content-carry.mjs`, `ship-media-copy.mjs`), `node` `postgres` one-liner probes (psql is not installed on this machine), curl, the `e2e.yml` workflow_dispatch, and the v1-picks loop (`scripts/v1-triage.mjs`, cherry-pick, export audit).

**Spec:** GitHub issue #192 (`ready-for-agent`), parent spec #182 → `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` § *Ship-time provisioning, topology, domains, secrets* + § *The verify gate — the production smoke*; **the executable artifact is `docs/ship-provisioning-runbook.md`** (written #191, executed here — its step ids A1–A7 / the wait / B1–B4 are this plan's coordinates). **Sibling fence:** every blocker #183–#191 is CLOSED (verified pre-plan) — this ticket consumes their payloads and ticks what they left unticked: ALL five remaining M6 boxes in `docs/plan.md` (lines 153–157) flip at this ticket's close-out, per the standing M6 rule (boxes flip at #192, not per-ticket — the #191 plan's fence). The #190 smoke suite and the #191 runbook + scripts are inputs, never re-authored here. The close-out PR's own v1 triage (docs-only → SKIP) is owed to the next ledger commit — noted in the issue-closing comment, the #112 pattern.

## Recon state this plan starts from (verified live 2026-10-11, pre-plan)

- **All blockers closed; #192 is the only open M6 ticket.** `gh issue list` confirms #183–#191 CLOSED (and the follow-ups #207/#208 landed). Main is at `7181206` (#208's ledger row). Floors: api 27 files + 1 skipped (28) / 340 passed + 3 skipped; api-client 5 files / 33 tests; admin 17 / 173; landing 9 / 74; `pnpm check` 35/35, `pnpm build` 7/7.
- **Pre-existing working-tree states this plan never stages:** `apps/admin/package.json`'s dev-port tweak (`--port 3000` → `--port 3001`, an owner-local change) and the `graphify-out/` churn. Every `git add` in this plan names its files.
- **`origin/v1` is current at `e856d4d`** (#208's pick). The v1 checkout `~/Projects/sevendays-v1-seed` sits on `v1` at `e856d4d` with pre-existing churn (modified `apps/{admin,landing}/src/routeTree.gen.ts` + untracked `docs/manual-audit.md` — the #206 row's "untouched" ruling; gates passed with them present). Its `apps/api/wrangler.toml` names `sevendays-v1-api` and binds `bucket_name = "sevendays-media"`; ci.yml is byte-identical to main's.
- **The live `v1` GitHub environment matches #191's probe exactly — ship has not started:** secrets `CLOUDFLARE_API_TOKEN` + `DATABASE_URL` only; vars `API_URL`/`BETTER_AUTH_URL` (the dev account's workers.dev URLs), `CLOUDFLARE_ACCOUNT_ID` (`436cc3a02b117ee2a2970681c9ac531e` — the dev account), `MEDIA_PUBLIC_BASE_URL` (`https://pub-0e2d375a0ded418f84366c03cf37e4a8.r2.dev`). The `teaser` environment is complete (incl. `E2E_BASE_URL`, the `E2E_SMOKE_STAFF_*` pair, the analytics trio, the `VITE_*` pair) and NEVER changes at ship — Task 6 asserts it byte-unchanged against a Task-1 snapshot.
- **The ceremony's inputs all exist on main:** `packages/db/scripts/ship-content-carry.mjs` (final report line `carry verified: 14 table(s), all counts match`, exit 1 on any count mismatch), `apps/api/scripts/ship-media-copy.mjs` (final line `n/n object(s), X MB`, exit 1 on any object failure), `e2e/smoke/production.spec.ts` (seven assertions confirmed by name), `.github/workflows/e2e.yml` (dispatch input `environment: teaser|v1`; the smoke reads `E2E_BASE_URL`/`E2E_API_URL: vars.API_URL`/`E2E_ADMIN_URL: vars.BETTER_AUTH_URL` + the two `E2E_SMOKE_STAFF_*` secrets from the chosen environment), `docs/media-bucket-runbook.md` § *Fresh bucket at ship*, `packages/db/.env` + `apps/admin/.env.local` (the backup/swap/restore targets), and `docs/plan.md`'s five unticked M6 boxes at lines 153–157.
- **The two latent ci.yml v1-leg defects, verbatim at line 280** (landed #187, owner-ratified fixes ride this ticket's cutover): `--var "CF_ANALYTICS_BUCKET:sevendays-v1-media"` names a bucket on no account (the binding is `sevendays-media`), and `--var "POSTHOG_LANDING_HOSTS:sevendays-v1-landing.pahamajulius.workers.dev"` is inline, so it goes stale at the account swap. The header comment (lines 67–74) claims the cutover needs "no workflow edit" — it narrows to the account swap.
- **The #206 ledger row's #192 handoff is live:** `sentry-link.tsx` (main, lines 1–10) ALREADY documents the edition split — "org slug jeius-dev — the dev/teaser org this edition reports to. (sevendays-studio is the ship-day v1 org; flipping this constant for v1 rides #191's cutover.)" — so the cutover's main-side hunk reduces to rewriting that now-stale parenthetical; the REAL edit is the v1-side `SENTRY_CONSOLE_URL` flip to `https://sevendays-studio.sentry.io/issues/` (#198's ruling), the pick's ruled divergence.
- **The #210 ledger row's OWNER FLAG is unresolved:** the old dev-account `sevendays-v1-landing` worker's workers.dev route now serves CF edge `error code: 1042` (route disabled dashboard-side between the #207/#208 picks). Nothing in the ceremony reads the old dev-account v1 workers — Task 1 resolves the flag with the owner (deliberate cutover prep → record; accidental → the owner re-enables or retires them; either answer unblocks, and their disposal stays the owner's post-ship decision, out of scope here).
- **psql is NOT installed on this machine** (`which psql` empty) — A2's evidence probe rides the pinned node `postgres` one-liner instead (Task 2 Step 3); the walk log records the substitution. `openssl` + `curl` are present.
- **The last e2e nightly is green** (run `38091347806`, 2026-10-10, teaser) — the smoke harness itself is proven; B4's v1 walk exercises the same suite against the flipped environment.
- **A runbook typo this plan corrects at close-out:** B3's post-condition names `https://<domain>/api/v1/gallery`, but the landing worker proxies nothing (no `/api` route exists in `apps/landing/src/routes/`); the gallery endpoint serves at `https://api.<domain>/api/v1/gallery` — exactly what the smoke's assertion 4 hits via `E2E_API_URL`. Tasks 9–10 probe the correct URL; Task 11 fixes the runbook line.

## Global Constraints

- **The runbook is the ceremony's document of record — this plan never re-orders it.** Every task names its runbook step ids (A1–A7, the wait, B1–B4). OWNER steps are the runbook's own "Owner, dashboard" actions plus every prompted credential — the executor surfaces them, waits for the owner's done-signal, then runs the pinned verification. AGENT steps are this session's commands, written in full. Where a runbook evidence command needs a tool this machine lacks (psql), the pinned node probe replaces it and the walk log notes the substitution.
- **Pinned identity literals:** workers `sevendays-v1-api` / `sevendays-v1-landing` / `sevendays-v1-admin`; bucket `sevendays-media` (per-account names — the fresh one lives on the dedicated account); pooler ports 6543 (transaction, `DATABASE_URL`) / 5432 (session, `DATABASE_MIGRATE_URL`) per ADR-0007; migrations `0000 → 0008` (latest); Sentry orgs `jeius-dev` (main/teaser — never changes) vs `sevendays-studio` (ship — born A5); the v1-side ruled divergence `SENTRY_CONSOLE_URL = 'https://sevendays-studio.sentry.io/issues/'`; the smoke dispatch `gh workflow run e2e.yml --ref main -f environment=v1 -R jeius/sevendays` expecting **7 passed**; `gh` targets `-R jeius/sevendays`; the v1 checkout is `~/Projects/sevendays-v1-seed`.
- **The values file:** `.scratch/192-ship-values.env` — shell-sourceable `KEY=value`, created `umask 077` (`.scratch/` is gitignored, line 24 of `.gitignore`), holding the ship-born identifiers + credentials the ceremony reuses (inventory pinned in Task 1 Step 4). No value from it is ever echoed, committed, or logged — evidence lines carry names, statuses, lengths, and booleans only. It lives through Task 10 and is deleted in Task 11; the walk log (non-secret evidence only) is retained for the owner, never committed.
- **No credential value ever enters the repo.** Secret-bearing writes ride `printf '%s' "$VAR" | wrangler secret put …` and `gh secret set … --body "$VAR"` with the value sourced from the values file — never an inline literal, never a committed file. The two `.env` swaps (A3) are backup → edit → restore dances on gitignored files, restoring the dev values before each task ends.
- **The ceremony is resumable.** Every task opens by re-verifying its precondition's evidence (idempotent probes: `gh` lists, curls, `wrangler` reads); an already-green step is marked `verified pre-done` in the walk log and skipped, never blindly re-run. The wait between phases (Task 7) is an explicit pause — the session may end there and resume at Task 8 days later. If the domain is already Active when Task 7 opens, record and continue.
- **The cutover commit (Task 9) is this ticket's only main-side code change:** `.github/workflows/ci.yml` (the two v1-leg `--var` values at line 280 + the header-comment sentence at lines 70–74) + `apps/admin/src/components/dashboard/sentry-link.tsx` (the stale-parenthetical rewrite) — exact old/new text pinned in the task. Nothing else rides it. Expected classifier verdict: **PICK** — 2 v1-paths (`ci.yml` exists byte-identical on `v1`; `sentry-link.tsx` landed there at #198's pick), 0 main-only. The pick carries ONE ruled divergence (the v1-side `SENTRY_CONSOLE_URL` re-point + its comment adaptation), recorded in the pick's `Split:` line per runbook B3.
- **Two greens, separately recorded, never merged:** commit-green = the cutover push's `v1` CI run (`check` + `Deploy v1 (private)` both success on the release commit); smoke-green = the B4 dispatch run (**7 passed**). Each run URL lands in the walk log, the progress.md entry, and Task 11's close-out.
- **House gates:** full `pnpm check` (**35/35**) + `pnpm build` (**7/7**) before the cutover PR and on the close-out docs commit; `pnpm --filter @sevendays/db fix` never needed (no code changes in Phase A/B tasks). Docs house rules: `docs/plan.md` ticks are `- [✅]`; #192's GitHub AC boxes flip `- [x]` at close-out; `docs/progress.md`'s new entry lands at the head of the log (line 3, above the #208 entry); **AGENTS.md is untouched** (nothing in it is factually wrong post-ship — main remains the booking-bearing dev-account edition; the ship state's durable home is progress.md). Markdown files ride the repo's docs conventions.
- **v1-picks discipline for this ticket's PRs:** the cutover PR's pick executes in Task 9 (locks: frozen install, build:packages + api build, `pnpm check` + `pnpm build`, `node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` exit 0, push, run watch with `Deploy teaser (main)` skipped); its ledger row lands in Task 11's docs commit. The close-out PR itself is docs-only → SKIP, its row owed to the next ledger commit (noted in the issue-closing comment). The pick's provenance sha is always `git rev-parse`-derived, never hand-typed (the #208 provenance-defect lesson).
- **`graphify update .`** runs after code lands (Task 9, Task 11) but its churn is never committed by this plan — the pre-existing dirty `graphify-out/` state belongs to the owner's next graph commit.
- **Scope fence ("not here"):** no booking/v2 work; no M7 arrivals (`RESEND_API_KEY` + `LANDING_ORIGIN` stay unseated, ADR-0021); no handover mechanics or post-handover cadence (M8); no staff provisioning beyond `smoke-staff` (`docs/staff-provisioning.md` owns the owner's own admin-role account and every later staff create/reset — the owner may run it any time post-ship, never a plan step); no `e2e/` edits; no teaser-environment writes (asserted unchanged in Task 6); no ADR (the ceremony executes ruled decisions — the carry, the ci fixes, and the Sentry split were all ratified at #191/#198); the old dev-account `v1` workers are neither updated nor deleted by this plan (their disposal is the owner's post-ship decision — recorded, not executed); the Dec 1 2026 CF Observability pricing change is re-verified and recorded read-only (Task 10), not acted on.
- **Plan file target:** `docs/superpowers/plans/2026-10-11-192-ship-milestone-closeout.md` (this file).

---

### Task 1: Pre-flight — the readiness gate, the values file, the walk log

**Files:**
- Create: `.scratch/192-ship-walk-log.md` (gitignored evidence log — retained for the owner, never committed)
- Create: `.scratch/192-ship-values.env` (gitignored, umask 077 — deleted at Task 11)
- Create: `.scratch/192-teaser-env-baseline.txt` (gitignored — Task 6's unchanged-assertion input)

**Interfaces:**
- Consumes: the #191 runbook + scripts, the #190 smoke suite + workflow, `packages/db/.env` + `apps/admin/.env.local` (existence only — never printed), the owner (dashboard values, the #210 flag's answer).
- Produces: the values file's env contract every later task sources — `SHIP_SUBDOMAIN`, `SHIP_ACCOUNT_ID`, `SHIP_TOKEN`, `SHIP_DB_URL_TX`, `SHIP_DB_URL_SESSION`, `SHIP_AUTH_SECRET`, `SMOKE_STAFF_EMAIL`, `SMOKE_STAFF_PASSWORD`, `SHIP_R2_KEY_ID`, `SHIP_R2_SECRET`, `SHIP_R2DEV_BASE`, `SHIP_SENTRY_DSN`, `SHIP_POSTHOG_KEY`, `SHIP_POSTHOG_PROJECT_ID`, `SHIP_POSTHOG_PERSONAL_KEY`, `SHIP_CF_ANALYTICS_TOKEN`, `SHIP_DOMAIN`, `DEV_R2_ACCOUNT_ID`, `DEV_R2_KEY_ID`, `DEV_R2_SECRET` — plus the walk log every later task appends to.

- [ ] **Step 1: Claim the ticket and verify the blockers**

```bash
cd /home/jeius/Projects/sevendays
gh issue view 192 --json state,labels --jq '{state, labels: [.labels[].name]}'
for n in 183 184 185 186 187 188 189 190 191; do
  gh issue view $n --json number,state --jq '"\(.number) \(.state)"'
done
```

Expected: #192 `OPEN` with `ready-for-agent`; all nine blockers `CLOSED`. If any blocker is open, stop — this plan cannot start.

- [ ] **Step 2: Baseline gates + floors on main**

```bash
git checkout main && git pull --ff-only
git log --oneline -1          # expect 7181206 or later
git status --short -- . ':!graphify-out'   # expect only apps/admin/package.json (the port tweak)
pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm check && pnpm build
```

Expected: check **35/35**, build **7/7**, api `27 passed | 1 skipped (28)` files / `340 passed | 3 skipped (341)` tests. If a floor moved, record the new floor in the close-out PR body (Task 11 Step 5) and continue — this ticket touches no workspace `src/` until the cutover.

- [ ] **Step 3: Verify every ceremony input exists**

```bash
test -f packages/db/scripts/ship-content-carry.mjs && echo carry-ok
test -f apps/api/scripts/ship-media-copy.mjs && echo copy-ok
test -f e2e/smoke/production.spec.ts && grep -c "^test(" e2e/smoke/production.spec.ts   # expect 7
test -f .github/workflows/e2e.yml && grep -c "workflow_dispatch" .github/workflows/e2e.yml  # expect ≥1
test -f docs/ship-provisioning-runbook.md && echo runbook-ok
test -f packages/db/.env && test -f apps/admin/.env.local && echo env-files-ok
git -C ~/Projects/sevendays-v1-seed log --oneline -1   # expect e856d4d or later, on v1
```

Expected: every line answers (`carry-ok`, `copy-ok`, `7`, `1`+, `runbook-ok`, `env-files-ok`, the v1 head).

- [ ] **Step 4: Open the walk log and the values file**

```bash
mkdir -p .scratch && umask 077
cat > .scratch/192-ship-walk-log.md <<'EOF'
# #192 ship walk log (scratch, gitignored, retained for the owner)

The evidence record for docs/ship-provisioning-runbook.md's execution
(#192). One `##` per runbook step, each carrying its **Evidence:** lines.
Values recorded by name/status/length/boolean only — never a credential,
never a value from 192-ship-values.env.

## Pre-flight (Task 1)
- date opened:
- blockers #183–#191 closed: true
- pnpm check / build: 35/35 / 7/7
- api floor: 27+1s files / 340+3s tests
- ceremony inputs present (2 scripts, 7-assertion suite, e2e.yml, runbook, 2 env files, v1 checkout at e856d4d+): true
- psql absent — A2's probe rides the node postgres one-liner (substitution recorded here)
- the #210 owner flag (old dev-account v1-landing workers.dev 1042): <owner's answer — deliberate cutover prep | accidental, owner re-enabled | accidental, owner retires at handover>
- teaser environment baseline snapshot: .scratch/192-teaser-env-baseline.txt

## A1 account + subdomain + ship token
## A2 Supabase org + project
## A3 fresh DB — migrations, seed, carry, smoke-staff
## A4 fresh bucket — create, CORS, lifecycle, r2.dev, S3 pair
## A5 observability orgs + the v1 environment write-up
## A6 deploy under the scoped roles (dry-run gate) + secrets
## A7 CI re-point
## The wait — client domain, zone Active
## B1 media copy
## B2 domains + DNS
## B3 var flips + cutover commit + v1 pick + push (commit-green)
## B4 production smoke (smoke-green) + r2.dev disable
## Close-out — docs rotation, ledger row, issue
EOF
```

Then the values file — the owner fills it (Task 1 Step 5); the executor creates the scaffold:

```bash
cat > .scratch/192-ship-values.env <<'EOF'
# #192 ship-born values — umask 077, gitignored, deleted at close-out.
# The owner fills each value at its runbook step; commands source it.
# Never echoed, never committed, never logged.
SHIP_SUBDOMAIN=
SHIP_ACCOUNT_ID=
SHIP_TOKEN=
SHIP_DB_URL_TX=
SHIP_DB_URL_SESSION=
SHIP_AUTH_SECRET=
SMOKE_STAFF_EMAIL=
SMOKE_STAFF_PASSWORD=
SHIP_R2_KEY_ID=
SHIP_R2_SECRET=
SHIP_R2DEV_BASE=
SHIP_SENTRY_DSN=
SHIP_POSTHOG_KEY=
SHIP_POSTHOG_PROJECT_ID=
SHIP_POSTHOG_PERSONAL_KEY=
SHIP_CF_ANALYTICS_TOKEN=
SHIP_DOMAIN=
DEV_R2_ACCOUNT_ID=436cc3a02b117ee2a2970681c9ac531e
DEV_R2_KEY_ID=
DEV_R2_SECRET=
EOF
chmod 600 .scratch/192-ship-values.env
```

- [ ] **Step 5: OWNER — the values checklist + the #210 flag**

OWNER (with the runbook at hand):

1. Answer the #210 flag: was disabling the old dev-account `sevendays-v1-landing` workers.dev route deliberate (cutover prep)? Record the answer in the walk log's Pre-flight section. Either answer unblocks — the ceremony never touches the old dev-account v1 workers.
2. Walk the values file's key list against the runbook's `<angle-bracket>` inventory and fill what is already known today (typically: `SHIP_SUBDOMAIN`, `SHIP_ACCOUNT_ID`, `SHIP_TOKEN` after A1; everything else fills at its step). `SHIP_DOMAIN` fills only when the client's domain is known (Task 7 at the latest). `DEV_R2_KEY_ID`/`DEV_R2_SECRET` re-mint per `docs/media-bucket-runbook.md` § Owner handoff if the dev pair is not at hand (B1 at the latest).

AGENT, after: `grep -c '=$' .scratch/192-ship-values.env` — expected: the count of still-empty keys (record it; it is the checklist, not a gate).

- [ ] **Step 6: Snapshot the teaser environment (Task 6's assertion input)**

```bash
{ gh secret list -e teaser -R jeius/sevendays; gh variable list -e teaser -R jeius/sevendays; } | sort > .scratch/192-teaser-env-baseline.txt
wc -l .scratch/192-teaser-env-baseline.txt
```

Expected: 16 lines (9 secrets + 7 vars, names + updatedAt/value columns — the live count probed pre-plan). Append the line count to the walk log's Pre-flight section.

- [ ] **Step 7: Append the pre-flight evidence to the walk log and commit nothing**

Fill the walk log's Pre-flight lines with this task's outputs (dates, the flag's answer, the snapshot count). No commit — `.scratch/` is gitignored by design.

---

### Task 2: A1 + A2 — the Cloudflare account, the subdomain, the ship token; the Supabase org + project

**Files:**
- Modify: nothing in the repo — cloud + dashboard state, plus the values file's A1/A2 keys
- Append: `.scratch/192-ship-walk-log.md` (§ A1, § A2)

**Interfaces:**
- Consumes: the owner (dashboard), the values file (`SHIP_SUBDOMAIN`, `SHIP_ACCOUNT_ID`, `SHIP_TOKEN`, `SHIP_DB_URL_TX`, `SHIP_DB_URL_SESSION`).
- Produces: a verified-active ship token (Task 4's wrangler auth + Task 6's deploy credential) and a reachable fresh Postgres (Task 3's migrate/seed/carry destination).

- [ ] **Step 1: OWNER — runbook A1 (the account, the subdomain, the ship token, the Images subscription)**

OWNER, dashboard, per runbook § A1 items 1–5: create the account (note `<account-id>`); set the account's workers.dev subdomain to `<subdomain>`; keep membership minimal (owner seat + at most one operator); mint the **ship token** (My Profile → API Tokens → Create Token, Custom) with exactly Account scopes `Workers Scripts:Edit`, `Workers R2 Storage:Edit`, `Cloudflare Images:Edit`, `Account Settings:Read`, `User Details:Read`; subscribe Images (free) if not already.

OWNER then fills the values file: `SHIP_ACCOUNT_ID`, `SHIP_SUBDOMAIN` (the **bare label** — the dashboard shows `<label>.workers.dev`; fill `<label>` only, commands append the suffix), `SHIP_TOKEN` (a user or account token both verify — the account-scoped probe endpoint `/accounts/<account-id>/tokens/verify` covers `cfat_`-prefixed account tokens).

- [ ] **Step 2: AGENT — verify the ship token (A1's evidence)**

```bash
set -a; source .scratch/192-ship-values.env; set +a
curl -sS -H "Authorization: Bearer $SHIP_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify
```

Expected: `"status":"active"` in the JSON body (the token works; the response carries no secret). Append the `success`/`status` fields (not the token) to the walk log § A1.

- [ ] **Step 3: OWNER — runbook A2 (the Supabase org + project); AGENT verifies with the node probe**

OWNER, dashboard, per runbook § A2: create the org (e.g. `Sevendays Studio`) + the project (free tier, the dev project's region), a strong `<db-password>` (owner-held, never committed — it embeds in the two connection strings); then Project Settings → Database → note the **transaction pooler** URL (port 6543) and the **session pooler** URL (port 5432). OWNER fills the values file: `SHIP_DB_URL_TX`, `SHIP_DB_URL_SESSION`.

AGENT — the probe (the runbook's `psql … -c 'select 1'`, which this machine lacks, replaced by the pinned node one-liner over `packages/db`'s pinned `postgres`):

```bash
cd /home/jeius/Projects/sevendays/packages/db
set -a; source ../../.scratch/192-ship-values.env; set +a
node --input-type=module -e "
import postgres from 'postgres';
const sql = postgres(process.env.SHIP_DB_URL_SESSION, { prepare: false });
const r = await sql\`select 1 as ok\`;
console.log('probe ok:', r.length === 1 && r[0].ok === 1);
await sql.end();
"
```

Expected: `probe ok: true`. Append to walk log § A2 (with the psql-substitution note). Also record the free-tier pause posture (the runbook's note: the project pauses after ~1 week idle; the client takes Pro at handover; between ship and handover the smoke + real traffic keep it warm).

---

### Task 3: A3 — the fresh database: migrations, seed, the carry, the smoke-staff

**Files:**
- Modify (temporarily, restored before the step ends): `packages/db/.env`, `apps/admin/.env.local` (both gitignored)
- Append: `.scratch/192-ship-walk-log.md` (§ A3)

**Interfaces:**
- Consumes: `SHIP_DB_URL_SESSION` / `SHIP_DB_URL_TX` / `SHIP_SUBDOMAIN` (values file), `packages/db` scripts (`db:migrate`, `db:seed`, `db:verify-seed`), `packages/db/scripts/ship-content-carry.mjs`, `apps/admin`'s `create-staff`.
- Produces: the fresh DB with migrations 0000→0008 + seed baseline + the dev-curated carry + the ship `smoke-staff` row (Task 5's `E2E_SMOKE_STAFF_*` inputs; assertion 7's sign-in), and `SHIP_AUTH_SECRET` (first used here, sealed at A5/A6).

- [ ] **Step 1: Generate the rotated auth secret + the smoke-staff credentials**

OWNER generates and fills the values file:

```bash
openssl rand -base64 32   # → SHIP_AUTH_SECRET
openssl rand -base64 24   # → SMOKE_STAFF_PASSWORD (≥12 chars by construction; also into the owner's password manager)
```

OWNER also sets `SMOKE_STAFF_EMAIL` (the ship twin of the teaser's — any deliverable address the owner controls). AGENT verifies presence without printing: `grep -c 'SMOKE_STAFF_PASSWORD=..*' .scratch/192-ship-values.env` → `1`.

- [ ] **Step 2: Migrations + seed + the carry (the .env swap dance)**

```bash
cd /home/jeius/Projects/sevendays/packages/db
cp .env .env.pre-ship.bak
DEV_SESSION_URL=$(grep '^DATABASE_MIGRATE_URL=' .env | cut -d= -f2-)
set -a; source ../../.scratch/192-ship-values.env; set +a
sed -i "s|^DATABASE_MIGRATE_URL=.*|DATABASE_MIGRATE_URL=${SHIP_DB_URL_SESSION}|" .env
pnpm db:migrate          # 0000 → 0008
pnpm db:seed             # the ruled catalog baseline
pnpm db:verify-seed
SOURCE_DATABASE_URL="$DEV_SESSION_URL" DATABASE_MIGRATE_URL="$SHIP_DB_URL_SESSION" \
  pnpm exec tsx scripts/ship-content-carry.mjs
mv .env.pre-ship.bak .env   # dev tooling restored — verify: grep -c '^DATABASE_MIGRATE_URL=' .env → 1
```

Expected: migrations apply clean; seed green; `db:verify-seed` green; the carry's own final line `carry verified: 14 table(s), all counts match` (any count mismatch exits 1 — a red carry is a stop, not a skip). `DEV_SESSION_URL` is the pre-swap dev value read before the sed — it never prints. If the carry fails on connectivity to the dev DB, check the dev project is not paused (Supabase dashboard) and re-run only the carry line.

- [ ] **Step 3: The ship-side smoke-staff (the .env.local swap dance; OWNER types the password)**

```bash
cd /home/jeius/Projects/sevendays/apps/admin
cp .env.local .env.local.pre-ship.bak
set -a; source ../../.scratch/192-ship-values.env; set +a
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${SHIP_DB_URL_TX}|" .env.local
sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${SHIP_AUTH_SECRET}|" .env.local
grep -q '^BETTER_AUTH_URL=' .env.local \
  && sed -i "s|^BETTER_AUTH_URL=.*|BETTER_AUTH_URL=https://sevendays-v1-admin.${SHIP_SUBDOMAIN}.workers.dev|" .env.local \
  || printf 'BETTER_AUTH_URL=https://sevendays-v1-admin.%s.workers.dev\n' "$SHIP_SUBDOMAIN" >> .env.local
pnpm create-staff --email "$SMOKE_STAFF_EMAIL" --name "Smoke Staff" --role staff
mv .env.local.pre-ship.bak .env.local   # dev tooling restored
```

The `create-staff` CLI prompts for the password — **OWNER types `SMOKE_STAFF_PASSWORD` at the prompt** (the trailing `--role staff` overrides the script's `--role admin` default; `minPasswordLength: 12` passes by construction). Expected: the CLI's own success output naming the created account. `--role staff` is load-bearing: the ADR-0018 model keeps `admin` for the owner's own account (provisioned later per `docs/staff-provisioning.md`, never by this plan).

- [ ] **Step 4: Record § A3's evidence**

Append to the walk log: `db:migrate` 0000→0008 green; `db:seed` + `db:verify-seed` green; the carry's final line verbatim (`carry verified: 14 table(s), all counts match`); the smoke-staff row created (the CLI's output line, email recorded, password by length only); both `.env` files restored (the backup `mv`s succeeded). Nothing committed.

---

### Task 4: A4 — the fresh bucket: create, CORS, lifecycle, r2.dev, the rotated S3 pair

**Files:**
- Create: `.scratch/192-cors.json` (gitignored scratch — the CORS rule)
- Modify: nothing in the repo — R2 state on the dedicated account
- Append: `.scratch/192-ship-walk-log.md` (§ A4)

**Interfaces:**
- Consumes: `SHIP_TOKEN` + `SHIP_ACCOUNT_ID` (wrangler auth), `SHIP_SUBDOMAIN` + `SHIP_DOMAIN` (CORS origins — `SHIP_DOMAIN` may still be empty; see Step 2).
- Produces: the fresh `sevendays-media` bucket with the dev bucket's rule shape + `SHIP_R2DEV_BASE` (Task 5's `MEDIA_PUBLIC_BASE_URL` var, Task 6's dry-run `--var`) + `SHIP_R2_KEY_ID`/`SHIP_R2_SECRET` (Task 5's env secrets, Task 6's api-worker secrets, Task 8's copy destination pair).

- [ ] **Step 1: Mirror the dev bucket's CORS rule shape (probe the literal live)**

The pinned JSON below mirrors `docs/media-bucket-runbook.md`'s field contract ("PUT + `content-type` + exposed `ETag`"). Confirm it against the live dev rule first — the live rule wins if it differs, and the walk log records the delta:

```bash
cd /home/jeius/Projects/sevendays   # wrangler here rides the owner's dev-account OAuth
pnpm --filter @sevendays/api exec wrangler r2 bucket cors list sevendays-media
```

Expected: one rule — `AllowedMethods` `["PUT"]`, `AllowedHeaders` `["content-type"]`, `ExposeHeaders` `["ETag"]`, the three dev origins. If the live shape differs from the pinned file in Step 2, edit Step 2's file to match it exactly (origins still swap per Step 2) and note the delta in the walk log.

- [ ] **Step 2: The bucket + CORS + lifecycle + r2.dev, under the ship token**

```bash
cd /home/jeius/Projects/sevendays
set -a; source .scratch/192-ship-values.env; set +a
export CLOUDFLARE_API_TOKEN="$SHIP_TOKEN" CLOUDFLARE_ACCOUNT_ID="$SHIP_ACCOUNT_ID"
pnpm --filter @sevendays/api exec wrangler r2 bucket create sevendays-media
cat > .scratch/192-cors.json <<EOF
{
  "rules": [
    {
      "allowed": {
        "origins": [
          "http://localhost:3000",
          "https://sevendays-v1-admin.${SHIP_SUBDOMAIN}.workers.dev",
          "https://admin.${SHIP_DOMAIN}"
        ],
        "methods": ["PUT"],
        "headers": ["content-type"]
      },
      "exposeHeaders": ["ETag"],
      "maxAgeSeconds": 3600
    }
  ]
}
EOF
pnpm --filter @sevendays/api exec wrangler r2 bucket cors set sevendays-media --file /home/jeius/Projects/sevendays/.scratch/192-cors.json -y
pnpm --filter @sevendays/api exec wrangler r2 bucket lifecycle add sevendays-media tmp-gc tmp/ --expire-days 1 -y
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url enable sevendays-media
pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url get sevendays-media
unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
```

If `SHIP_DOMAIN` is still empty (the client has not registered yet), delete the `https://admin.${SHIP_DOMAIN}` line from `.scratch/192-cors.json` before `cors set` — the two known origins stand for now, and Task 8 Step 1 re-runs `cors set` with the full three (record both runs in the walk log). The last command prints the fresh `pub-…r2.dev` base → fill `SHIP_R2DEV_BASE` in the values file (AGENT does this — it is public-by-design, safe to record).

- [ ] **Step 3: OWNER — mint the fresh S3 token pair**

OWNER, dashboard, per `docs/media-bucket-runbook.md` § Owner handoff against the **dedicated** account: R2 → Manage API Tokens → Create API Token — Object Read & Write, scoped to `sevendays-media` only, no TTL → fills `SHIP_R2_KEY_ID` + `SHIP_R2_SECRET`.

- [ ] **Step 4: Record § A4's evidence**

Append to the walk log: `cors list` / `lifecycle list` / `dev-url get` outputs (re-run the two `list` reads if you want their bodies in the log — they are public config), `SHIP_R2DEV_BASE` recorded, the S3 pair minted (names + scope only). Evidence lines match runbook A4 verbatim.

---

### Task 5: A5 — the observability orgs + the complete `v1` environment write-up

**Files:**
- Modify: nothing in the repo — the `v1` GitHub environment
- Append: `.scratch/192-ship-walk-log.md` (§ A5)

**Interfaces:**
- Consumes: the values file (the A1–A4 products + this task's three dashboard mints).
- Produces: the `v1` GitHub environment carrying every name Task 6's deploy legs read (9 secrets + 7 vars), exactly the runbook A5 list.

- [ ] **Step 1: OWNER — the three observability mints (runbook A5 items 1–3)**

OWNER, dashboard:

1. **Sentry:** create the `sevendays-studio` org + one `sevendays` project in it; mint a client key → fills `SHIP_SENTRY_DSN` (the teaser's `jeius-dev` org and keys never change).
2. **PostHog:** create the dedicated v1 project → fills `SHIP_POSTHOG_KEY` (public api key), `SHIP_POSTHOG_PROJECT_ID`, `SHIP_POSTHOG_PERSONAL_KEY` (a personal API key).
3. **Cloudflare:** mint the Analytics:Read token on the dedicated account (mirror the dev token's scope, the #186 mint) → fills `SHIP_CF_ANALYTICS_TOKEN`.

- [ ] **Step 2: AGENT — the 15 environment writes (values sourced, never printed)**

```bash
cd /home/jeius/Projects/sevendays
set -a; source .scratch/192-ship-values.env; set +a
gh secret set DATABASE_URL               -e v1 --body "$SHIP_DB_URL_TX"          -R jeius/sevendays
gh secret set R2_S3_ACCESS_KEY_ID        -e v1 --body "$SHIP_R2_KEY_ID"           -R jeius/sevendays
gh secret set R2_S3_SECRET_ACCESS_KEY    -e v1 --body "$SHIP_R2_SECRET"           -R jeius/sevendays
gh secret set SENTRY_DSN                 -e v1 --body "$SHIP_SENTRY_DSN"          -R jeius/sevendays
gh secret set CF_ANALYTICS_READ_TOKEN    -e v1 --body "$SHIP_CF_ANALYTICS_TOKEN"  -R jeius/sevendays
gh secret set POSTHOG_PERSONAL_API_KEY   -e v1 --body "$SHIP_POSTHOG_PERSONAL_KEY" -R jeius/sevendays
gh secret set POSTHOG_PROJECT_ID         -e v1 --body "$SHIP_POSTHOG_PROJECT_ID"  -R jeius/sevendays
gh secret set E2E_SMOKE_STAFF_EMAIL      -e v1 --body "$SMOKE_STAFF_EMAIL"        -R jeius/sevendays
gh secret set E2E_SMOKE_STAFF_PASSWORD   -e v1 --body "$SMOKE_STAFF_PASSWORD"     -R jeius/sevendays
gh variable set CLOUDFLARE_ACCOUNT_ID    -e v1 --body "$SHIP_ACCOUNT_ID"          -R jeius/sevendays
gh variable set API_URL                  -e v1 --body "https://sevendays-v1-api.${SHIP_SUBDOMAIN}.workers.dev"     -R jeius/sevendays
gh variable set BETTER_AUTH_URL          -e v1 --body "https://sevendays-v1-admin.${SHIP_SUBDOMAIN}.workers.dev"   -R jeius/sevendays
gh variable set MEDIA_PUBLIC_BASE_URL    -e v1 --body "$SHIP_R2DEV_BASE"          -R jeius/sevendays
gh variable set VITE_SENTRY_DSN          -e v1 --body "$SHIP_SENTRY_DSN"          -R jeius/sevendays
gh variable set VITE_POSTHOG_KEY         -e v1 --body "$SHIP_POSTHOG_KEY"         -R jeius/sevendays
```

Note what is deliberately NOT set here: `CLOUDFLARE_API_TOKEN` (A7 owns its rotation) and `E2E_BASE_URL` (B3 owns it).

- [ ] **Step 3: AGENT — verify by name (A5's evidence)**

```bash
gh secret list -e v1 -R jeius/sevendays
gh variable list -e v1 -R jeius/sevendays
```

Expected — secrets (10, alphabetical): `CF_ANALYTICS_READ_TOKEN`, `CLOUDFLARE_API_TOKEN` (pre-existing, rotated at A7), `DATABASE_URL`, `E2E_SMOKE_STAFF_EMAIL`, `E2E_SMOKE_STAFF_PASSWORD`, `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `R2_S3_ACCESS_KEY_ID`, `R2_S3_SECRET_ACCESS_KEY`, `SENTRY_DSN`. Vars (6): `API_URL`, `BETTER_AUTH_URL`, `CLOUDFLARE_ACCOUNT_ID` (now the dedicated account), `MEDIA_PUBLIC_BASE_URL` (the fresh r2.dev), `VITE_POSTHOG_KEY`, `VITE_SENTRY_DSN` — presence by name only; values are unreadable by design. Append both lists to the walk log § A5.

---

### Task 6: A6 + A7 — the dry-run-gated deploy + the CI re-point

**Files:**
- Modify: nothing in the repo (deploys run from the v1 checkout; worker secrets live on the Workers)
- Append: `.scratch/192-ship-walk-log.md` (§ A6, § A7)

**Interfaces:**
- Consumes: the A5 environment, `SHIP_TOKEN`/`SHIP_ACCOUNT_ID` (deploy auth), the v1 checkout at `origin/v1` head, `SHIP_DB_URL_TX`/`SHIP_AUTH_SECRET`/`SHIP_SENTRY_DSN`/`SHIP_R2_KEY_ID`/`SHIP_R2_SECRET`/`SHIP_CF_ANALYTICS_TOKEN`/`SHIP_POSTHOG_*` (worker secrets), `SHIP_R2DEV_BASE` (dry-run var), `SMOKE_STAFF_EMAIL`/`SMOKE_STAFF_PASSWORD` (the dashboard render check).
- Produces: the three `sevendays-v1-*` Workers live on the dedicated account's `*.workers.dev` (Phase A's end state), and the `v1` environment's deploy identity pointed at the dedicated account (Task 9's CI deploy precondition).

- [ ] **Step 1: AGENT — prepare the v1 checkout (read-only until the deploy)**

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1
git rev-parse HEAD    # → <v1-sha>; record in walk log § A6 (this is SENTRY_RELEASE)
git status --short    # expect the known churn only (2 routeTree.gen.ts + docs/manual-audit.md) — leave untouched
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
```

- [ ] **Step 2: AGENT — build the frontends with the ship env baked**

```bash
cd ~/Projects/sevendays-v1-seed
set -a; source /home/jeius/Projects/sevendays/.scratch/192-ship-values.env; set +a
export SENTRY_RELEASE="$(git rev-parse HEAD)"
export VITE_SENTRY_DSN="$SHIP_SENTRY_DSN" VITE_SENTRY_RELEASE="$SENTRY_RELEASE" VITE_SENTRY_ENVIRONMENT=v1 VITE_POSTHOG_KEY="$SHIP_POSTHOG_KEY"
pnpm --filter @sevendays/landing run build && pnpm --filter @sevendays/admin run build
```

- [ ] **Step 3: AGENT — the dry-run gate (all three green before any live deploy)**

```bash
cd ~/Projects/sevendays-v1-seed
set -a; source /home/jeius/Projects/sevendays/.scratch/192-ship-values.env; set +a
export CLOUDFLARE_API_TOKEN="$SHIP_TOKEN" CLOUDFLARE_ACCOUNT_ID="$SHIP_ACCOUNT_ID" SENTRY_RELEASE="$(git rev-parse HEAD)"
cd apps/api
pnpm exec wrangler deploy --dry-run --outdir .wrangler/ship-dry-run --name sevendays-v1-api --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "MEDIA_PUBLIC_BASE_URL:$SHIP_R2DEV_BASE" --var "SENTRY_RELEASE:$SENTRY_RELEASE" --var "ENVIRONMENT:v1"
cd ../landing
pnpm exec wrangler deploy --dry-run --outdir .wrangler/ship-dry-run --name sevendays-v1-landing --var "API_URL:https://sevendays-v1-api.${SHIP_SUBDOMAIN}.workers.dev"
cd ../admin
pnpm exec wrangler deploy --dry-run --outdir .wrangler/ship-dry-run --name sevendays-v1-admin --var "API_URL:https://sevendays-v1-api.${SHIP_SUBDOMAIN}.workers.dev" --var "BETTER_AUTH_URL:https://sevendays-v1-admin.${SHIP_SUBDOMAIN}.workers.dev" --var "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" --var "CF_ANALYTICS_SCRIPT_API:sevendays-v1-api" --var "CF_ANALYTICS_SCRIPT_LANDING:sevendays-v1-landing" --var "CF_ANALYTICS_SCRIPT_ADMIN:sevendays-v1-admin" --var "CF_ANALYTICS_BUCKET:sevendays-media" --var "POSTHOG_LANDING_HOSTS:sevendays-v1-landing.${SHIP_SUBDOMAIN}.workers.dev"
```

Expected: three clean dry-run outputs (the gate). Note the two already-corrected values: `CF_ANALYTICS_BUCKET:sevendays-media` (the binding's name — the fresh bucket keeps it) and the new account's host in `POSTHOG_LANDING_HOSTS` (narrowed to the apex at B3/cutover).

- [ ] **Step 4: AGENT — the live deploys (same commands minus `--dry-run --outdir …`)**

Re-run each of the three Step-3 commands from their directories without `--dry-run --outdir .wrangler/ship-dry-run`. Expected: three deploy outputs with version ids + `Deployed triggers` (workers.dev routes on the new subdomain). Keep the exports for Step 5.

- [ ] **Step 5: AGENT — the by-hand worker secrets (the ones CI does not sync, plus the first-sync set so the stack is whole pre-push)**

```bash
cd ~/Projects/sevendays-v1-seed/apps/api
set -a; source /home/jeius/Projects/sevendays/.scratch/192-ship-values.env; set +a
printf '%s' "$SHIP_DB_URL_TX"      | pnpm exec wrangler secret put DATABASE_URL            --name sevendays-v1-api
printf '%s' "$SHIP_AUTH_SECRET"    | pnpm exec wrangler secret put BETTER_AUTH_SECRET      --name sevendays-v1-api
printf '%s' "$SHIP_SENTRY_DSN"     | pnpm exec wrangler secret put SENTRY_DSN              --name sevendays-v1-api
printf '%s' "$SHIP_R2_KEY_ID"      | pnpm exec wrangler secret put R2_S3_ACCESS_KEY_ID     --name sevendays-v1-api
printf '%s' "$SHIP_R2_SECRET"      | pnpm exec wrangler secret put R2_S3_SECRET_ACCESS_KEY --name sevendays-v1-api
cd ../admin
printf '%s' "$SHIP_DB_URL_TX"            | pnpm exec wrangler secret put DATABASE_URL               --name sevendays-v1-admin
printf '%s' "$SHIP_AUTH_SECRET"          | pnpm exec wrangler secret put BETTER_AUTH_SECRET         --name sevendays-v1-admin
printf '%s' "$SHIP_CF_ANALYTICS_TOKEN"   | pnpm exec wrangler secret put CF_ANALYTICS_READ_TOKEN    --name sevendays-v1-admin
printf '%s' "$SHIP_POSTHOG_PERSONAL_KEY" | pnpm exec wrangler secret put POSTHOG_PERSONAL_API_KEY   --name sevendays-v1-admin
printf '%s' "$SHIP_POSTHOG_PROJECT_ID"   | pnpm exec wrangler secret put POSTHOG_PROJECT_ID         --name sevendays-v1-admin
unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
```

Expected: eleven `✨ Success!` outputs (values never printed). A changed worker secret is live immediately — no redeploy needed.

- [ ] **Step 6: AGENT + OWNER — the A6 evidence curls + the dashboard render**

```bash
set -a; source /home/jeius/Projects/sevendays/.scratch/192-ship-values.env; set +a
curl -sS -o /dev/null -w '%{http_code}\n' "https://sevendays-v1-api.${SHIP_SUBDOMAIN}.workers.dev/health"    # 200
curl -sS -o /dev/null -w '%{http_code}\n' "https://sevendays-v1-landing.${SHIP_SUBDOMAIN}.workers.dev/"      # 200
curl -sS -o /dev/null -w '%{http_code}\n' "https://sevendays-v1-admin.${SHIP_SUBDOMAIN}.workers.dev/login"   # 200
```

OWNER then signs in at `https://sevendays-v1-admin.<subdomain>.workers.dev/login` with `SMOKE_STAFF_EMAIL`/`SMOKE_STAFF_PASSWORD` and confirms the Analytics Dashboard renders at `/` (the smoke-staff account the owner created at A3 — the runbook's "owner-created account"; the owner's own admin-role account is a post-ship `docs/staff-provisioning.md` path, never a plan step). Record the three codes + `dashboard renders: true` in walk log § A6.

- [ ] **Step 7: AGENT — A7, the CI re-point + the teaser-unchanged assertion**

```bash
cd /home/jeius/Projects/sevendays
set -a; source .scratch/192-ship-values.env; set +a
gh secret   set CLOUDFLARE_API_TOKEN -e v1 --body "$SHIP_TOKEN"      -R jeius/sevendays
gh variable set CLOUDFLARE_ACCOUNT_ID -e v1 --body "$SHIP_ACCOUNT_ID" -R jeius/sevendays
{ gh secret list -e teaser -R jeius/sevendays; gh variable list -e teaser -R jeius/sevendays; } | sort | diff .scratch/192-teaser-env-baseline.txt - && echo teaser-unchanged
gh secret list -e v1 -R jeius/sevendays | head -3   # CLOUDFLARE_API_TOKEN's updatedAt is today
```

Expected: `teaser-unchanged` prints (the diff is empty — nothing under `teaser` moved all ceremony); the `v1` token's `updatedAt` is today. From here, pushes to `v1` deploy via CI onto the dedicated account — the cutover push (Task 9) is the first. Record in walk log § A7 (Phase A complete: v1 live on the dedicated account's `*.workers.dev`).

---

### Task 7: The wait — the client registers the domain (explicit pause)

**Files:**
- Append: `.scratch/192-ship-walk-log.md` (§ The wait)

**Interfaces:**
- Consumes: the client's registrar action + the owner's dashboard (runbook § The wait).
- Produces: `SHIP_DOMAIN` filled in the values file + an Active zone in the dedicated account (Task 8's precondition; also Task 8 Step 1's CORS re-set if Step A4-2 deferred the `admin.<domain>` origin).

- [ ] **Step 1: OWNER — register, zone, nameservers**

OWNER per runbook § The wait: the client registers `<domain>` at their registrar; the owner adds the zone to the **dedicated account** (DNS → Add a domain, free plan); the client points the registrar's nameservers at the assigned Cloudflare pair; the zone goes **Active** (dashboard Status). The zone must live in the same account as the bucket and the workers (R2 has no bucket-move; the media custom domain requires same-account placement — ADR-0019 #4, the #129 ruling). OWNER fills `SHIP_DOMAIN` in the values file.

- [ ] **Step 2: AGENT — record and pause (or continue)**

If the zone is already Active when this task opens (the resumability rule — re-check the dashboard state with the owner), mark `verified pre-done` and continue to Task 8 in the same session. Otherwise append to walk log § The wait: `paused at <date> — awaiting zone Active for <domain>` — and end the session here. Phase A's end state is stable (the runbook's shape: the dedicated stack live on `*.workers.dev`, no client dependency); resume at Task 8 when the owner reports the zone Active. Re-verify Task 6's three health curls on resume (the Supabase free-tier pause note: if the api `/health` fails on resume, wake the project in the Supabase dashboard first).

---

### Task 8: B1 + B2 — the media copy; the four domains + DNS

**Files:**
- Modify: nothing in the repo — R2 state + the dedicated account's zone
- Append: `.scratch/192-ship-walk-log.md` (§ B1, § B2)

**Interfaces:**
- Consumes: `DEV_R2_*` (the dev account's S3 pair — the media runbook's owner handoff) + `SHIP_R2_*`/`SHIP_R2_ACCOUNT_ID` (the fresh pair), `SHIP_TOKEN`/`SHIP_ACCOUNT_ID`, `SHIP_DOMAIN`.
- Produces: every committed object copied dev→fresh (Task 9's flip precondition + assertion 4's live-asset guard), one copied key recorded in the walk log (B2 + B3 probe input), and the four production hosts serving (Task 9's var flips point at them).

- [ ] **Step 1: AGENT — if A4 deferred it, complete the bucket CORS now**

If walk log § A4 records the two-origin CORS (the domain was unknown at A4), re-run Task 4 Step 2's `cors set` with the full three-origin file (`SHIP_DOMAIN` now set); verify with `cors list`. If A4 already set all three origins, mark this step `verified pre-done`.

- [ ] **Step 2: AGENT — the scripted media copy (B1)**

```bash
cd /home/jeius/Projects/sevendays/apps/api
set -a; source ../../.scratch/192-ship-values.env; set +a
export SOURCE_R2_ACCOUNT_ID="$DEV_R2_ACCOUNT_ID" \
  SOURCE_R2_ACCESS_KEY_ID="$DEV_R2_KEY_ID" \
  SOURCE_R2_SECRET_ACCESS_KEY="$DEV_R2_SECRET" \
  DEST_R2_ACCOUNT_ID="$SHIP_ACCOUNT_ID" \
  DEST_R2_ACCESS_KEY_ID="$SHIP_R2_KEY_ID" \
  DEST_R2_SECRET_ACCESS_KEY="$SHIP_R2_SECRET"
node scripts/ship-media-copy.mjs
```

If `DEV_R2_KEY_ID`/`DEV_R2_SECRET` are empty, OWNER re-mints the dev pair per `docs/media-bucket-runbook.md` § Owner handoff first (Object Read & Write, scoped to the dev `sevendays-media`, no TTL) and fills the values file. Expected: a per-object progress list, then the final line `n/n object(s), X MB` with exit 0 — any red object line + exit 1 is a stop (fix, re-run; the script re-puts nothing half-way, so a re-run is safe).

- [ ] **Step 3: AGENT — record one copied key + the B1 evidence probe**

```bash
set -a; source ../../.scratch/192-ship-values.env; set +a
KEY=$(curl -sS "https://sevendays-api.pahamajulius.workers.dev/api/v1/gallery" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);const p=j.photos?.[0]||j?.[0];const u=p?.photoUrl||p?.url;if(!u){console.error("no photoUrl in payload");process.exit(1)}console.log(new URL(u).pathname.replace(/^\//,""))})')
echo "$KEY"   # → e.g. gallery/<uuid>.jpg — record in walk log § B1
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' "${SHIP_R2DEV_BASE}/${KEY}"
```

Expected: a `gallery/<uuid>.jpg` key prints; the curl answers `200 image/jpeg` off the **fresh** r2.dev base (the copy is real). Record the key + the probe in walk log § B1 (B2's media evidence + Task 9's post-condition reuse it).

- [ ] **Step 4: OWNER — runbook B2 (the four hosts + the www redirect), dashboard**

OWNER, dashboard, per runbook § B2 items 1–5: apex Custom Domain `<domain>` on `sevendays-v1-landing`; the **www redirect** — proxied CNAME `www` → `<domain>`, then Redirect Rules → Single Redirect (`Hostname` equals `www.<domain>` → Dynamic 301 `concat("https://<domain>", http.request.uri.path)`, Preserve query string) — no redirect Worker, no Page Rule; `admin.<domain>` on `sevendays-v1-admin`; `api.<domain>` on `sevendays-v1-api`; `media.<domain>` connected on the R2 bucket (Settings → Public Development / Custom Domains; the in-account zone rides cert + DNS automatically). The r2.dev URL stays enabled until B4 verifies the flip.

- [ ] **Step 5: AGENT — the five B2 evidence probes (after cert issue)**

```bash
set -a; source ../../.scratch/192-ship-values.env; set +a
KEY=$(grep -oE 'gallery/[a-f0-9-]+\.jpg' .scratch/192-ship-walk-log.md | head -1)   # re-derive if a fresh shell — the key recorded at Step 3
curl -sS -o /dev/null -w 'apex %{http_code}\n'            "https://${SHIP_DOMAIN}"
curl -sS -o /dev/null -w 'www %{http_code} %{redirect_url}\n' "https://www.${SHIP_DOMAIN}"
curl -sS -w '\n'                                          "https://api.${SHIP_DOMAIN}/health"
curl -sS -o /dev/null -w 'admin %{http_code}\n'           "https://admin.${SHIP_DOMAIN}/login"
curl -sS -o /dev/null -w 'media %{http_code} %{content_type}\n' "https://media.${SHIP_DOMAIN}/${KEY}"
```

Expected: `apex 200`; `www 301 https://<domain>/…`; `{"status":"ok"}` from the api health; `admin 200`; `media 200 image/jpeg` (`$KEY` from Step 3 — same shell or re-read it from the walk log). Cert issue can take minutes — retry on 526/525 before concluding failure. Record all five in walk log § B2.

---

### Task 9: B3 — the var flips, the cutover commit, the v1 pick, the push (commit-green)

**Files:**
- Modify: `.github/workflows/ci.yml:280` (the two v1-leg `--var` values) + `.github/workflows/ci.yml:67-74` (the header-comment sentence)
- Modify: `apps/admin/src/components/dashboard/sentry-link.tsx:7-10` (the stale-parenthetical rewrite)
- Append: `.scratch/192-ship-walk-log.md` (§ B3)
- Modify (v1 checkout, via the pick): the same two files, plus the ruled divergence in `sentry-link.tsx`

**Interfaces:**
- Consumes: `SHIP_DOMAIN` (values file), the B2-live hosts, the A7-pointed `v1` environment, the v1-picks loop (`scripts/v1-triage.mjs`, `scripts/audit-v1-absence.mjs`).
- Produces: **commit-green** — the cutover push's `v1` CI run (`check` + `Deploy v1 (private)` success on the release commit), its URL recorded; the four production values live in the `v1` environment; the deploy vars corrected on both branches; the v1-side `SENTRY_CONSOLE_URL` in the `sevendays-studio` org.

- [ ] **Step 1: AGENT — the four var flips (production domains; effective with the cutover push)**

```bash
cd /home/jeius/Projects/sevendays
set -a; source .scratch/192-ship-values.env; set +a
gh variable set API_URL               -e v1 --body "https://api.${SHIP_DOMAIN}"    -R jeius/sevendays
gh variable set BETTER_AUTH_URL       -e v1 --body "https://admin.${SHIP_DOMAIN}"  -R jeius/sevendays
gh variable set MEDIA_PUBLIC_BASE_URL -e v1 --body "https://media.${SHIP_DOMAIN}"  -R jeius/sevendays
gh variable set E2E_BASE_URL          -e v1 --body "https://${SHIP_DOMAIN}"        -R jeius/sevendays
gh variable list -e v1 -R jeius/sevendays   # the four flipped values visible
```

- [ ] **Step 2: AGENT — the cutover branch + the three pinned edits**

```bash
cd /home/jeius/Projects/sevendays
git checkout main && git pull --ff-only && git checkout -b chore/192-ship-cutover
DOM=$(grep '^SHIP_DOMAIN=' .scratch/192-ship-values.env | cut -d= -f2-)
sed -i 's|CF_ANALYTICS_BUCKET:sevendays-v1-media"|CF_ANALYTICS_BUCKET:sevendays-media"|; s|POSTHOG_LANDING_HOSTS:sevendays-v1-landing.pahamajulius.workers.dev"|POSTHOG_LANDING_HOSTS:'"$DOM"'"|' .github/workflows/ci.yml
git diff --stat   # exactly one file so far: .github/workflows/ci.yml, one line changed
```

The changed line (ci.yml:280, deploy-v1's admin step) — before → after, the only two edits on it (`$DOM` = the real apex domain):

```text
… --var "CF_ANALYTICS_SCRIPT_ADMIN:sevendays-v1-admin" --var "CF_ANALYTICS_BUCKET:sevendays-v1-media" --var "POSTHOG_LANDING_HOSTS:sevendays-v1-landing.pahamajulius.workers.dev"
… --var "CF_ANALYTICS_SCRIPT_ADMIN:sevendays-v1-admin" --var "CF_ANALYTICS_BUCKET:sevendays-media" --var "POSTHOG_LANDING_HOSTS:$DOM"
```

Then the header-comment narrowing (ci.yml:67–74). Replace exactly this sentence pair —

```yaml
  # targets and the environment scopes do the isolation. When M6 provisions
  # the dedicated accounts, the v1 leg rotates by swapping the v1
  # environment's secret values (token + DATABASE_URL + API_URL var) — no
  # workflow edit.
```

— with:

```yaml
  # targets and the environment scopes do the isolation. The ship-day
  # cutover (#192) rotated the v1 leg by swapping the v1 environment's
  # values (token + DATABASE_URL + the URL vars) — the account swap alone
  # needed no workflow edit; the two inline deploy vars that could not ride
  # an environment (the Storage widget's bucket name + Traffic's
  # landing-host allowlist) were corrected in the same cutover commit.
```

Then `sentry-link.tsx` — replace exactly the trailing four-line comment block (the constant line below it stays untouched on main) —

```ts
// link opens in a new tab (owner ruling, 2026-10-06). URL owner-ratified
// (2026-10-07): org slug jeius-dev — the dev/teaser org this edition
// reports to. (sevendays-studio is the ship-day v1 org; flipping this
// constant for v1 rides #191's cutover.)
```

— with (the constant itself does NOT change on main):

```ts
// link opens in a new tab (owner ruling, 2026-10-06). URL owner-ratified
// (2026-10-07): org slug jeius-dev — the org the main/teaser editions
// report to. The ship deployment reports to the sevendays-studio org
// (#198's ruling); the v1-side constant flip rode #192's cutover pick.
```

Verify the footprint: `git diff --stat` → exactly two files, `ci.yml` (2 hunks) + `sentry-link.tsx` (1 hunk), nothing else.

- [ ] **Step 3: AGENT — gates, PR, squash-merge**

```bash
pnpm check && pnpm build
git add .github/workflows/ci.yml apps/admin/src/components/dashboard/sentry-link.tsx
git commit -m "chore: the ship-day cutover — ci.yml's v1 leg on the real bucket + apex host, the Sentry edition note (#192)"
git push -u origin chore/192-ship-cutover
gh pr create --title "chore: the ship-day cutover — ci.yml's v1 leg on the real bucket + apex host, the Sentry edition note (#192)" --body "The B3 cutover of the #192 ship ceremony: the two v1-leg deploy vars that could not ride the environment swap (CF_ANALYTICS_BUCKET names the binding's real bucket sevendays-media — the #187 latent defect; POSTHOG_LANDING_HOSTS carries the production apex host), the header comment's no-workflow-edit claim narrowed to the account swap, and the Sentry link-out's cutover note completed. Squash-merge, then the v1 pick with the ruled SENTRY_CONSOLE_URL divergence (runbook B3). Evidence: the #192 walk log."
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
MAIN_SHA=$(git log -1 --format=%H)   # the squash commit's sha — the pick's provenance, always rev-parse-derived
echo "cutover main sha: $MAIN_SHA"
```

Expected: check **35/35** + build **7/7** pre-PR; the squash merge lands (main's own run also goes green — the teaser leg deploys with the untouched teaser environment).

- [ ] **Step 4: AGENT — triage + the v1 pick with the ruled divergence**

```bash
cd /home/jeius/Projects/sevendays
MAIN_SHA=$(git log -1 --format=%H)   # re-derive if a fresh shell — the squash sha at main's head
node scripts/v1-triage.mjs "$MAIN_SHA"
```

Expected: **PICK** — 2 v1-paths (`.github/workflows/ci.yml`, `apps/admin/src/components/dashboard/sentry-link.tsx`), 0 main-only. Then:

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1 && git fetch origin main
git cherry-pick -n "$MAIN_SHA"    # expect a clean apply; the checkout's known churn stays unstaged, untouched
git status --short                # expect M on exactly the two picked files, beside the known churn (2 routeTree.gen.ts mods + untracked docs/manual-audit.md — leave untouched)
```

Now the ruled divergence (runbook B3, #198's ruling) in `apps/admin/src/components/dashboard/sentry-link.tsx`: the same three-line comment block as main's new text, adapted to the v1 perspective, plus the constant flip —

```ts
// link opens in a new tab (owner ruling, 2026-10-06). URL owner-ratified
// (2026-10-07): the ship deployment's org — sevendays-studio (#198's
// ruling; the flip rode #192's cutover pick). The main/teaser editions
// report to jeius-dev.
export const SENTRY_CONSOLE_URL = 'https://sevendays-studio.sentry.io/issues/';
```

Then commit with the provenance + Split line:

```bash
git add apps/admin/src/components/dashboard/sentry-link.tsx
git commit -F - <<EOF
$(git log -1 --format=%B "$MAIN_SHA")

(cherry picked from commit $(git rev-parse "$MAIN_SHA"))
Split: ruled divergence (runbook B3, #198's ruling) — the v1-side SENTRY_CONSOLE_URL re-pointed to https://sevendays-studio.sentry.io/issues/ with the comment adapted to the v1 perspective; no main-only paths to drop
EOF
```

(The blank line after the `%B` line is load-bearing — the v1-picks runbook's heredoc rule.)

- [ ] **Step 5: AGENT — the locks, the push, commit-green**

```bash
cd ~/Projects/sevendays-v1-seed
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check && pnpm build
cd /home/jeius/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed   # exit 0
cd ~/Projects/sevendays-v1-seed && git push origin v1
sleep 20
RUN_ID=$(gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId' -R jeius/sevendays)
gh run watch "$RUN_ID" --exit-status -R jeius/sevendays
gh run view "$RUN_ID" --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"' -R jeius/sevendays
```

Expected: local gates green (check 35/35, build 7/7, audit exit 0); the run shows `check: success` + `Deploy v1 (private): success` + `Deploy teaser (main): skipped`. **This run is commit-green** — record its URL (`https://github.com/jeius/sevendays/actions/runs/$RUN_ID`) + the release commit sha in walk log § B3. This is the first CI deploy onto the dedicated account.

- [ ] **Step 6: AGENT + OWNER — the B3 post-conditions**

```bash
set -a; source /home/jeius/Projects/sevendays/.scratch/192-ship-values.env; set +a
curl -sS "https://api.${SHIP_DOMAIN}/api/v1/gallery" | grep -o "https://media.${SHIP_DOMAIN}[^\"]*" | head -3
```

Expected: `photoUrl`s on `https://media.<domain>/…` — the `MEDIA_PUBLIC_BASE_URL` flip, live. (The runbook's B3 line names `https://<domain>/api/v1/gallery` — the landing proxies nothing; the endpoint serves on the api host. The walk log records the corrected probe; Task 11 fixes the runbook line.) OWNER then confirms the dashboard's Traffic section attributes the apex host (may take minutes of real traffic to populate — record when observed; not a B4 blocker). Record `gh variable list -e v1`'s four flipped values in walk log § B3.

---

### Task 10: B4 — the production smoke (smoke-green) + the r2.dev disable

**Files:**
- Modify: nothing in the repo — a workflow dispatch + one wrangler read
- Append: `.scratch/192-ship-walk-log.md` (§ B4 — the milestone's exit record)

**Interfaces:**
- Consumes: the B3 state (flipped environment, deployed cutover, `E2E_BASE_URL`/`API_URL`/`BETTER_AUTH_URL` + the `E2E_SMOKE_STAFF_*` secrets all live in `v1`), `SHIP_TOKEN`/`SHIP_ACCOUNT_ID` (the r2.dev disable).
- Produces: **smoke-green** — the green dispatch run URL (**7 passed**) against `https://<domain>`; the fresh bucket's r2.dev disabled (the flip's tail); the Dec 1 2026 pricing re-verify verdict.

- [ ] **Step 1: AGENT (owner-authorized) — dispatch + watch**

```bash
gh workflow run e2e.yml --ref main -f environment=v1 -R jeius/sevendays
sleep 15
RID=$(gh run list --workflow e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId' -R jeius/sevendays)
gh run watch "$RID" --exit-status -R jeius/sevendays
```

Expected: **7 passed** — the seven assertions of `e2e/smoke/production.spec.ts` against `https://<domain>`, including the live media asset off the flipped base (assertion 4 — the guard this whole phase exists for) and the ship `smoke-staff`'s sign-in reaching the Analytics Dashboard (assertion 7). A red leg uploads its Playwright report artifact naming the fix — **ship does not complete on a red gate**: fix (deploy-side or environment-side), re-deploy if code moved, re-dispatch. The smoke is re-runnable after any post-ship owner re-deploy with the same dispatch command.

- [ ] **Step 2: AGENT — disable the fresh bucket's r2.dev URL (after green)**

```bash
cd /home/jeius/Projects/sevendays
set -a; source .scratch/192-ship-values.env; set +a
CLOUDFLARE_API_TOKEN="$SHIP_TOKEN" CLOUDFLARE_ACCOUNT_ID="$SHIP_ACCOUNT_ID" \
  pnpm --filter @sevendays/api exec wrangler r2 bucket dev-url disable sevendays-media
```

Expected: the disable confirmation. **The dev account's bucket keeps its r2.dev URL** — the teaser reads it (media runbook's flip-tail ruling). Optional guard: re-curl the Step-8-3 key off `https://media.${SHIP_DOMAIN}/${KEY}` → still `200 image/jpeg` (reads now serve the custom domain only).

- [ ] **Step 3: AGENT — the Dec 1 2026 Cloudflare Observability pricing re-verify (read-only)**

Check the Workers Logs pricing posture (the spec's Further Notes item): search/fetch Cloudflare's current Workers pricing documentation for the Dec 1 2026 Observability change and record the verdict — one walk-log line of the shape `Dec 1 2026 pricing re-verify: <what changes for Workers Logs free tier> / <no action at ship — handover-day note>`. This is a record, not an action; anything material becomes an M8 handover note, never an inline change.

- [ ] **Step 4: Record § B4 — the exit record**

Append to walk log § B4: the green run URL; `7 passed`; the r2.dev disable confirmation; the pricing verdict. **The two greens now both exist and are separately recorded** — commit-green (Task 9 Step 5's run URL) and smoke-green (this task's run URL). Phase B is complete; the ceremony is walked end to end.

---

### Task 11: Close-out — the docs rotation, the ledger row, the issue

**Files:**
- Modify: `docs/plan.md:153-157` (the five M6 boxes flip `- [✅]` with landing annotations)
- Modify: `docs/progress.md` (the new head entry, line 3 — above the #208 entry)
- Modify: `docs/ship-provisioning-runbook.md:381` (the one-line probe-URL correction)
- Modify: `docs/agents/v1-picks.md` (the cutover PR's ledger row, at the table's tail)
- Delete: `.scratch/192-ship-values.env` (the values file — secrets die here)
- Keep: `.scratch/192-ship-walk-log.md` (the owner's evidence record, never committed)

**Interfaces:**
- Consumes: every walk-log evidence line (dates, counts, run URLs), `MAIN_SHA` + the pick's v1 sha + run ids from Task 9, the smoke run URL from Task 10.
- Produces: the milestone's durable record — plan.md's M6 block closed, progress.md's exit-criteria entry, the ledger row — and #192 closed.

- [ ] **Step 1: plan.md — the five boxes (substitute `<ship-date>` and the `<…>` values from the walk log; every other byte is pinned)**

Line 153 becomes:

```markdown
- [✅] The **production smoke** — the verify gate's second leg made executable: seven presence-level assertions (health, home, CMS-fed surface, live media asset, booking page serves, admin sign-in page, real `smoke-staff` sign-in), read-only plus the one sign-in act; nightly walks teaser, owner-run dispatch walks v1 _(suite landed 2026-10-10 via #190; the v1 walk green <ship-date> via #192 — 7 passed against https://<domain>, run <smoke-run-id>)_
```

Line 154 becomes:

```markdown
- [✅] Ship-time provisioning: dedicated Cloudflare account + dedicated Supabase org/project; the three apps, their bindings, and the R2 media bucket provisioned there; ordered by `docs/ship-provisioning-runbook.md` (owner-operated; the production smoke is its last step) _(landed <ship-date> via #192 — the runbook walked end to end, every step's evidence in the owner-held walk log: the dedicated account under the scoped ship token, the fresh DB with migrations 0000→0008 + the seed baseline + the owner-ratified content carry, the fresh `sevendays-media` bucket, the dry-run-gated deploy, the CI re-point with the teaser environment byte-unchanged)_
```

Line 155 becomes:

```markdown
- [✅] Secrets rotate at ship, not handover — the reconciled at-ship list: fresh `DATABASE_URL` (new project), `DATABASE_MIGRATE_URL` (owner-held), a newly generated `BETTER_AUTH_SECRET`, the R2 S3 token pair, `SENTRY_DSN`, the `smoke-staff` credentials; carried/pointed anew: `VITE_SENTRY_DSN`, `SENTRY_RELEASE`, `MEDIA_PUBLIC_BASE_URL` (→ `media.<domain>`), `API_URL`, `BETTER_AUTH_URL`, the dashboard's CF/PostHog tokens (dedicated v1 PostHog project born at ship) _(landed <ship-date> via #192 — every rotated-fresh value born at ship and sealed in the `v1` environment + the workers; the carried set re-pointed A5→B3; the dedicated v1 PostHog project + the fresh CF Analytics token live on the production dashboard)_
```

Line 156 becomes:

```markdown
- [✅] Real domains: apex (+ `www` redirect) / `admin.` / `api.` / `media.` as Workers custom domains in the dedicated account, verified in DNS; curated media copied across; `MEDIA_PUBLIC_BASE_URL` flips at ship (#129) _(landed <ship-date> via #192 — the four custom domains + the proxied-CNAME/Redirect-Rule www 301 verified by curl, <n>/<n> objects copied by ship-media-copy.mjs, the flip verified by smoke assertion 4 off the live gallery payload, the fresh bucket's r2.dev disabled after green)_
```

Line 157 becomes:

```markdown
- [✅] Verify: `pnpm check`/`pnpm build` green in CI on the release commit **+ the production smoke green on the production domain** (two separate greens) _(landed <ship-date> via #192 — commit-green: run <check-run-id> on the cutover push, check + Deploy v1 green; smoke-green: run <smoke-run-id>, 7 passed; recorded separately in progress.md)_
```

- [ ] **Step 2: progress.md — the close-out entry at the head of the log (line 3; substitute every `<…>` from the walk log)**

```markdown
2026-10-<DD> — #192, M6 ticket 10, the ship ceremony + close-out — MILESTONE 6 COMPLETE. `docs/ship-provisioning-runbook.md` walked end to end with the owner, every step's evidence in the owner-held walk log. Phase A (<date>): the dedicated Cloudflare account under the scoped ship token + the dedicated Supabase org/project; the fresh DB — migrations 0000→0008, the seed baseline, the owner-ratified content carry (`carry verified: 14 table(s), all counts match` — dev's curated catalog over the seed), and the ship-side `smoke-staff`; the fresh `sevendays-media` bucket (CORS/lifecycle/r2.dev + the rotated S3 pair); the complete `v1` environment write-up (the fresh DSN from the new `sevendays-studio` Sentry org, the dedicated v1 PostHog project, the fresh CF Analytics token, the smoke-staff secrets); the dry-run-gated deploy onto `sevendays-v1-*.<subdomain>.workers.dev`; the CI re-point (ship token + account id — the teaser environment byte-unchanged, asserted). The wait: the client-registered `<domain>`, the zone Active in the dedicated account. Phase B (<date>): the scripted media copy (`<n>/<n> object(s), <X> MB`), the four custom domains (apex landing + the www 301 Redirect Rule + admin + api + media), the var flips, and the cutover commit — ci.yml's v1 leg on the real bucket (`sevendays-media`) + the apex host in `POSTHOG_LANDING_HOSTS`, the Sentry link-out's edition note — squash-merged to main and picked to `v1` with the one ruled divergence (`SENTRY_CONSOLE_URL` → the `sevendays-studio` org). **Two greens, separately recorded:** commit-green — the cutover push's run (<check-run-url>: check + Deploy v1 green on the release commit) — and smoke-green — the owner-run dispatch of e2e.yml against v1 (<smoke-run-url>: **7 passed** on https://<domain>, incl. the live media asset off the flipped base and the ship smoke-staff's sign-in reaching the Analytics Dashboard); the fresh bucket's r2.dev disabled after green. Exit criteria met: v1 runs on ship-time-dedicated accounts, observably healthy (Workers Logs + Sentry in the ship org + the dashboard on production tokens incl. the dedicated PostHog project), fully audited on writes, verified by the executable smoke — safe for real customers and the client's team. The Dec 1 2026 CF Observability pricing change re-verified at ship: <verdict — handover-day note>. The #210 owner flag (the old dev-account v1-landing worker's 1042) resolved as <resolution>; the old dev-account v1 workers' disposal stays the owner's post-ship decision. Next: M7 (Experience & CMS Maturation).
```

- [ ] **Step 3: the runbook's one-line correction + the ledger row**

`docs/ship-provisioning-runbook.md` line 381 — replace `` `https://<domain>/api/v1/gallery` serves `` with `` `https://api.<domain>/api/v1/gallery` serves `` (the landing proxies nothing; the gallery endpoint serves on the api host — the correction this plan's Task 9 Step 6 recorded).

`docs/agents/v1-picks.md` — append at the ledger table's tail (substitute `<…>` from the walk log / Task 9):

```markdown
| 2026-10-<DD> | <PR#> | `<main-sha>` | pick (ruled divergence) | `<v1-sha>` | #192's ship-day cutover — ci.yml's v1-leg deploy vars corrected (`CF_ANALYTICS_BUCKET:sevendays-v1-media` → `sevendays-media`, the binding's name, the #187 latent defect; `POSTHOG_LANDING_HOSTS`: the dev-account workers.dev host → `<domain>`) + the header comment's no-workflow-edit claim narrowed to the account swap + sentry-link.tsx's cutover parenthetical completed (the edition split itself pre-documented at #198). Classifier PICK — 2 v1-paths (`.github/workflows/ci.yml`, `apps/admin/src/components/dashboard/sentry-link.tsx`), 0 main-only. ONE ruled divergence (runbook B3, #198's ruling): the v1-side `SENTRY_CONSOLE_URL` re-pointed to `https://sevendays-studio.sentry.io/issues/` + the comment adapted to the v1 perspective — recorded in the pick's Split line. Locks on `<v1-sha>`: frozen install/build:packages/api-build green, check 35/35 + build 7/7, audit PASS 0/18; run <run-id>: `check` + `Deploy v1 (private)` success — the first CI deploy onto the dedicated account, #192's commit-green — `Deploy teaser (main)` skipped. Superset: provenance rev-parse-derived. |
```

- [ ] **Step 4: the close-out PR**

```bash
cd /home/jeius/Projects/sevendays
git checkout main && git pull --ff-only && git checkout -b docs/192-m6-closeout
# apply Steps 1–3 (plan.md, progress.md, ship-provisioning-runbook.md, v1-picks.md)
pnpm check    # docs-only — turbo-cached, still the house gate; 35/35
git add docs/plan.md docs/progress.md docs/ship-provisioning-runbook.md docs/agents/v1-picks.md docs/superpowers/plans/2026-10-11-192-ship-milestone-closeout.md
git commit -m "docs: M6 closes — the ship ceremony walked, the smoke green, plan.md's boxes ticked (#192)"
git push -u origin docs/192-m6-closeout
gh pr create --title "docs: M6 closes — the ship ceremony walked, the smoke green, plan.md's boxes ticked (#192)" --body "The #192 close-out: plan.md's five remaining M6 boxes ticked ✅ with landing annotations, progress.md rotated with the exit criteria + both greens' run URLs, the cutover PR's ledger row, the runbook's B3 probe-URL correction, and the plan file. Commit-green: <check-run-url>. Smoke-green: <smoke-run-url> (7 passed)."
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
node scripts/v1-triage.mjs "$(git log -1 --format=%H)"   # expect SKIP — all five paths main-only
```

Expected: check 35/35; the squash lands; the classifier prints SKIP (`docs/*` is main-only per paths.txt). The close-out PR's own ledger row is **owed to the next ledger commit** — the #112 pattern; the issue-closing comment (Step 5) records the debt.

- [ ] **Step 5: flip #192's AC boxes, close the issue, clean the scratch**

```bash
gh issue view 192 --json body --jq .body | sed 's/^- \[ \]/- [x]/' > /tmp/192-body.md
gh issue edit 192 --body-file /tmp/192-body.md -R jeius/sevendays
gh issue close 192 --comment "M6 closed. The runbook walked end to end — every step's evidence in the owner-held walk log. Two greens, separately recorded: commit-green <check-run-url> (check + Deploy v1 on the release commit), smoke-green <smoke-run-url> (7 passed on https://<domain>). The dashboard serves on https://admin.<domain> with production tokens + the dedicated v1 PostHog project. Docs rotated: plan.md's M6 boxes ✅, progress.md exit criteria recorded. The close-out PR's own v1-picks row (docs-only SKIP) is owed to the next ledger commit. The old dev-account v1 workers' disposal stays the owner's post-ship decision (the #210 flag resolved as <resolution>)." -R jeius/sevendays
rm .scratch/192-ship-values.env .scratch/192-cors.json /tmp/192-body.md   # secrets die; the walk log stays, owner-held
```

Expected: #192 CLOSED with all four AC boxes `- [x]`; the values file deleted (verify: `test ! -f .scratch/192-ship-values.env && echo values-gone`); the walk log retained. Final: `graphify update .` runs (its churn stays uncommitted — the owner's next graph commit). The milestone's exit criteria stand recorded: **the v1 app is safe to point real customers and the client's team at** — observably healthy, fully audited on writes, running on ship-time-dedicated accounts, verified by the executable smoke.
