# #82 — Pick Discipline Stood Up: Runbook + First Real Picks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up ADR-0015's standing maintenance from day one — a main-only runbook (`docs/agents/v1-picks.md`) that pins the per-PR pick / skip / split triage, `-x` provenance, the conflict policy on the transformed surfaces, the superset standing rule, and the squashed-snapshot fallback trigger, backed by a path classifier (`scripts/v1-triage.mjs`) that reads the seed's own invert-paths list — then prove the loop with real traffic: the post-seed backlog triaged and ledgered (#86 skipped), a real booking PR walked to SKIP, a synthetic mixed commit split per the runbook on local branches, and the **first real pick** — a small real PR (per-route page titles on the five shared landing routes, #72's "non-blocking polish") squash-merged to main, cherry-picked with `-x` to `v1`, pushed, `v1` CI green, the private deploy updated (new `<title>`s served live on `sevendays-v1-landing`), the teaser leg untouched by the pick.

**Architecture:** Two main PRs plus one `v1` push. PR A (`feat/82-landing-route-titles`) is the pick source: five `head: () => ({ meta: [{ title }] })` additions on route files whose `createFileRoute` blocks are byte-identical between main and `v1` (the seed's transforms live further down in `index.tsx`/`services.tsx`, and `index.tsx` is not touched) — so the pick is expected to apply clean, and the titles are curl-observable on the deployed `v1` (concrete "private deploy updates" evidence). PR B (`feat/82-pick-discipline`) carries the runbook, the classifier, the `AGENTS.md` pointer, the ledger, the roadmap tick, and the progress record — every path main-only, so PR B is itself a skip under its own rules (recorded as such). The `v1` push happens from the seed clone kept as the owner's `v1` checkout (`~/Projects/sevendays-v1-seed`); the main workspace never checks `v1` out. Demos never push: the booking-PR skip is a worked retrospective (the PR predates the seed; its rewritten form is already in `v1`'s history), and the split drill runs on local branches that are deleted afterwards. The four locks are the runbook's: local `pnpm check` + `pnpm build`, the #78 export audit (exit 0 over `v1`'s full history), the `v1` run (`check` + `Deploy v1 (private)` success, `Deploy teaser (main)` skipped), and live curl. Push/merge authority for this ticket is owner-ratified (Global Constraints) — zero mid-plan gates; the owner reviews and merges PR B at the end.

**Tech Stack:** git 2.43 (`cherry-pick -x` / `-n`, `rm` for deleted-by-us resolution), `gh` 2.45.0 (`pr create` / `pr checks --watch` / `pr merge --squash` / `run watch` — repo has no branch protection, squash merges allowed, `delete_branch_on_merge` off), Node ≥ 24 for the classifier (`.mjs`, root Biome style), TanStack Router `@tanstack/react-router@1.170.33` / `@tanstack/router-core@1.171.28` (`head?:` on `UpdatableRouteOptions`, `route.d.ts:354`; `HeadContent`'s `buildTagsFromMatches` walks matches deepest-first and keeps the first `title`, so a child's `meta: [{ title }]` overrides the root's — exactly one `<title>` renders), pnpm 11, Turborepo, wrangler-deployed Workers via the existing `ci.yml` legs, curl.

**Spec:** GitHub issue **#82** (label `ready-for-agent`), parent **#76** (§ The Artifact Mechanism, § The v1 Absence Boundary, § The Booking-Off Direction — the copy constraint the titles obey), blocked-by **#80** (CLOSED — seed landed, `fb92ef9`). Governing docs: ADR-0015 (decision 2 = this ticket; decision 5 = the audit lock; Consequences = the `-x` provenance ruling), `docs/plan.md` § "v1 Artifact Seed" — the **"Cherry-pick discipline in place from here on"** checkbox is this ticket's (Task 7), the seed ruleset `scripts/seed-v1/paths.txt` (read live by the classifier), the audit `scripts/audit-v1-absence.mjs` (#78).

**Scope fence (siblings sharing the spec):** #82 owns: the runbook + classifier + ledger, the backlog triage from the seed point, the booking-PR skip example, the split drill, PR A (the titles — the first real pick's source), the pick itself and its live verification, `docs/plan.md`'s "Cherry-pick discipline" checkbox, and the progress record. **Not here:** #81 ("v1 first light") owns the seed-push green history, the full booking-free battery on `sevendays-v1-*`, the env-shed proof, and `docs/plan.md`'s "Continuous private deploy" + "Verify" checkboxes — **they stay unticked here whether or not #81 has merged** (this plan re-checks only what the pick can change: the run is green, `/book` is still 404, the teaser still serves `/book` 200). No changes to `v1` other than picks (the one-way door stays closed — no re-seed, no hot-fix, no force-push). No booking-route titles (`book.tsx`/`booking.$id.tsx` stay untouched — keeping PR A pure-pickable; titling them later is a skip by the runbook). No `index.tsx` title (home keeps the root title). No ADR (ADR-0015 already records the mechanism; the runbook is its operating manual). No M3 design work — titles are content the design milestone restyles on top of. No `gh` writes to issue #82 (the owner ticks its boxes).

## Global Constraints

- **Push/merge authority — owner-ratified 2026-09-11 for #82's execution ("fully pre-authorized"):** the agent pushes both feature branches, opens both PRs, waits for PR A's CI, **squash-merges PR A** (`gh pr merge --squash --delete-branch`), cherry-picks, and **pushes `v1`** — zero mid-plan gates. PR B is opened by the agent and **merged by the owner** (the review gate). Never push to `main` directly (PR + squash only); never force-push anything; `v1` receives fast-forward pushes of picks only. This authority is this ticket's; the runbook's standing rule is "whoever triages executes — the locks keep `v1` honest, ambiguity stops at the owner."
- **Owner-ratified strings (2026-09-11) — verbatim, never paraphrased:**
  - Title format: `<Page> | Sevendays Photography`. The five titles: `Packages | Sevendays Photography` (`/packages`), `` `${loaderData?.name ?? 'Package'} | Sevendays Photography` `` (`/packages/$slug` — the package's `name`; `Package | Sevendays Photography` on the not-found path), `Services | Sevendays Photography` (`/services`), `Branches | Sevendays Photography` (`/branches`), `About | Sevendays Photography` (`/about`). Home (`/`) keeps the root `Sevendays Photography` — no edit to `index.tsx` or `__root.tsx`.
  - Fallback trigger ("moderate thresholds"): (1) one pick needs more than one hour of conflict work, or its resolution re-authors a transformed surface instead of re-applying the change; (2) `v1` lags main by more than 10 pickable PRs, or the oldest untriaged merge is more than 4 weeks old; (3) two consecutive picks land red on `v1`'s `check` for content reasons. Any hit → owner review; the fallback decision is always the owner's.
- **Pinned SHAs and paths (plan time, 2026-09-11):** `origin/main` = `fb92ef9cdb1d86fe43c558950495929996afc418` (#86); `origin/v1` = `0f4f340fc1b621289e7062178334ae418d7a9f97` (the seed content commit; 37 rewritten commits beneath). Seed point: main `0bdfe82` ≡ `v1` `e314af3`. Post-seed backlog at plan time: exactly one squash commit, `fb92ef9` (#86). The `v1` checkout: `~/Projects/sevendays-v1-seed`, branch `v1` at `0f4f340`, tree clean, remote `origin` = `https://github.com/jeius/sevendays.git`. The booking worked example: main `abfa9d2` (#65, M2 ticket 09 — confirmation email + Resend), rewritten on `v1` as `0c01531`. Task 1 re-derives all of these; if main moved (e.g. #81's close-out merged), the new commits join the backlog triage in Task 3 — that is the discipline working, not drift.
- **Execution-time values** (named where discovered; every later quote substitutes the real value): `TITLES_PR` (PR A number), `TITLES_SHA` (PR A's squash SHA on main), `TEASER_RUN` (main's run id for that merge), `PICK_SHA` (the pick commit on `v1`), `PICK_RUN` (the `v1` run id for the pick push), `MIXED_SHA`/`SPLIT_SHA` (the drill commits — local only), `SLUG`/`NAME` (a real package's slug and name from the API), `CLOSEOUT_PR` (PR B number), `V1_RUNS_BEFORE` (the `v1` run count before the pick). Shell variables may not survive between steps in a harness — when a later step uses `$NAME`, re-export it from the working notes or substitute the recorded value.
- **Pinned live endpoints:** v1 — `https://sevendays-v1-landing.pahamajulius.workers.dev`, `https://sevendays-v1-api.pahamajulius.workers.dev`; teaser — `https://sevendays-landing.pahamajulius.workers.dev`, `https://sevendays-api.pahamajulius.workers.dev`. Probe mechanics (#81's lesson): the streamed HTML contains null bytes — always pipe (`curl -s --compressed <url> | grep …`), never command-substitute into a variable. Rendered attributes are double-quoted.
- **"Teaser unchanged" (AC 2) means unchanged *by the pick*:** the `v1` push's run shows `Deploy teaser (main): skipped` and the teaser still serves `/book` 200 with its appointments mount answering. PR A's own merge legitimately redeploys the teaser through main's pipeline (the titles appear there too) — that is the PR's normal life on main, not a pick effect. Both facts are recorded.
- **The audit is a lock, never weakened:** `node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` (run from the main workspace — the script is main-only) must exit 0 before every `v1` push. Its tokens do not change in this ticket.
- **The classifier reads the ruleset of record:** `scripts/v1-triage.mjs` loads `scripts/seed-v1/paths.txt` at run time (prefix match) plus the booking-cluster regexes and the `docs/client/` fence pinned in Task 2. Path verdicts are proven on real SHAs in Task 3 (execution-time outputs, controller-verified: `fb92ef9` → SKIP, 18 paths; `abfa9d2` → SPLIT, 12 v1-paths including `pnpm-lock.yaml` — the plan-time 11-path pin was stale, caught by the Task 2 review, amended throughout).
- **Split mechanics (spike-proven at plan time in throwaway clones):** `git cherry-pick -n <sha>` exits 1 on the deleted-by-us conflict for a main-only path (expected — `git status --short` shows `A` for a new main-only file, `DU` for an absent one, `M` for the v1-path hunk); `git rm -qrf --ignore-unmatch -- <main-only paths>` resolves both `A` and `DU`; the commit is written with `git commit -F -` (heredoc) so the message carries the original `%B`, the `(cherry picked from commit <sha>)` line, and the `Split:` line; the audit passes over the result.
- **Repo gates:** `pnpm install && pnpm build:packages && pnpm --filter @sevendays/api build` before any gate in a session (in the workspace and in the `v1` checkout); `pnpm check` green on every branch touching code (33/33-class baseline on main; the `v1` checkout's task count is legitimately lower — exit 0 is the gate); `pnpm exec biome check --write <files>` before every commit (scoped — never blanket `pnpm fix:root`; the classifier's gate is `pnpm exec biome check scripts/v1-triage.mjs`); `graphify update .` at close-out (workspace only — never in the `v1` checkout). `docs/plan.md` ticks use `- [✅]` with a dated italic annotation; **only the "Cherry-pick discipline" checkbox moves**. Leave the known untracked `graphify-out/cache/*` files alone.
- **Local render check (Task 5) runs the real dev stack:** api `wrangler dev` on 8787 (`apps/api/.dev.vars` exists — never print it), landing `vite dev --port 3000` (`apps/landing/.env.local` exists, `API_URL=http://127.0.0.1:8787`). Stop them with `pkill -f 'wrangler dev'` and `pkill -f 'vite dev --port 3000'` — nothing else on this machine matches. First requests compile — use `--max-time 60`.
- **Vocabulary in anything that could be picked:** PR A's commit message, code, and comments are client-safe (no booking/edition words — the message is `feat(landing): per-route page titles for the shared landing routes (#82)`; the `(#82)` issue ref is an accepted dangling ref per #80's ruling). PR B's content is main-only and may say anything.
- **Failure triage:** (a) PR A's CI red → fix on the branch before merge (it's ordinary main work). (b) The pick's `v1` run red for *content* → `git revert` the pick on `v1`, push, report — never force-push, never hot-fix; this is fallback-trigger event 3's first count. (c) Red for *infrastructure* (token, environment, worker) → owner-run ops; the pick stands; report. (d) A live probe mismatch that is not explained by the pick (e.g. `/book` no longer 404 on `v1`) → STOP, report as a triage-class-c finding to the owner (#81's rule). (e) Any conflict on the pick → the runbook's conflict policy; if it passes the one-hour box or needs re-authoring → STOP, owner.

---

## File Structure

```text
MAIN — PR A (feat/82-landing-route-titles, off origin/main; squash-merged by the agent in Task 5):
apps/landing/src/routes/packages/index.tsx      MODIFY — head(): 'Packages | Sevendays Photography'
apps/landing/src/routes/packages/$slug.tsx      MODIFY — head({ loaderData }): '<name> | Sevendays Photography'
apps/landing/src/routes/services.tsx            MODIFY — head(): 'Services | Sevendays Photography'
apps/landing/src/routes/branches.tsx            MODIFY — head(): 'Branches | Sevendays Photography'
apps/landing/src/routes/about.tsx               MODIFY — head(): 'About | Sevendays Photography'

MAIN — PR B (feat/82-pick-discipline, off origin/main; rebased onto post-PR-A main in Task 7; owner merges):
scripts/v1-triage.mjs                           CREATE — the path classifier (Task 2)
docs/agents/v1-picks.md                         CREATE — the runbook + ledger (Task 2; rows in Tasks 3, 4, 6, 7)
AGENTS.md                                       MODIFY — two-line pointer under Agent skills (Task 2)
docs/plan.md                                    MODIFY — one tick + annotation (Task 7)
docs/progress.md                                MODIFY — Last-updated splice, What Exists bullet, Current Milestone, Next Steps (Task 7)
graphify-out/*                                  MODIFY — graph refresh (Task 7)
docs/superpowers/plans/2026-09-11-82-pick-discipline.md   (this plan — rides PR B)

v1 (the checkout ~/Projects/sevendays-v1-seed, branch v1; pushed in Task 6):
<the five PR A files>                           PICKED — one commit, `-x` provenance

LOCAL ONLY (deleted at the end of Task 4):
workspace   branch drill/82-mixed               synthetic mixed commit off origin/main
checkout    branch drill/82-split               the split of it off v1
```

Nothing under `apps/api/`, `packages/`, or `.github/` changes on either branch. No file on `v1` changes except through the one pick.

Task map: 1 — pre-flight (SHAs, checkout sync, backlog, run history, branches) → 2 — classifier + runbook + `AGENTS.md` pointer (PR B's first commit) → 3 — backlog triage + the booking worked example (ledger rows) → 4 — the split drill (local, ledger row) → 5 — PR A: titles, local render check, gates, push, PR, CI, squash-merge → 6 — the first real pick: cherry-pick `-x`, gates + audit, push `v1`, run, live verification, ledger row → 7 — close-out: rebase, tick, record, graph, gates, push, PR B, own-PR ledger row, report.

Execution note for the orchestrator: Tasks 1–4 write only to PR B's branch and local drill branches; Task 5 is the only main merge; Task 6 is the only `v1` push; Task 7 stops at PR B open — the owner merges it and ticks #82's boxes. Record every command's actual output verbatim in the working notes — the ledger rows and the annotations quote them.

---

### Task 1: Pre-flight — SHAs, the `v1` checkout, the backlog, the branches

**Files:**
- None written yet (branch creation only).

**Interfaces:**
- Consumes: the pinned SHAs/paths in Global Constraints.
- Produces: the execution-time baseline, the backlog list Task 3 triages, and PR B's branch.

**Not here:** no fixes to anything found (a mismatch re-baselines or STOPs per Failure triage); no `git checkout` of `v1` in the workspace; no pushes.

- [ ] **Step 1: Origin SHAs and the backlog since the seed point**

```bash
cd ~/Projects/sevendays
git fetch origin
git rev-parse origin/main origin/v1
git log --oneline 0bdfe82..origin/main
```

Expected at plan time: `fb92ef9cdb1d86fe43c558950495929996afc418` then `0f4f340fc1b621289e7062178334ae418d7a9f97`; the log shows exactly one line — `fb92ef9 feat(scripts): #80 seed the v1 branch — … (#80) (#86)`. If more lines exist, main moved since plan time (e.g. #81's close-out): record each as backlog for Task 3 — every one is triaged and ledgered; any PICK/SPLIT among them is executed per Task 6's procedure *before* the titles pick, in main order. If `origin/v1` differs from `0f4f340…`, someone pushed `v1` outside this ticket: record the new HEAD, confirm its runs are green (Step 3), re-derive the ledger's starting rows from `git log --format='%h %s%n%b' 0f4f340..origin/v1` (every commit must carry a `cherry picked from commit` line — anything else is a one-way-door anomaly → STOP, owner).

- [ ] **Step 2: The `v1` checkout is the seed clone, clean, synced**

```bash
cd ~/Projects/sevendays-v1-seed
git remote -v | head -1
git branch --show-current
git status --porcelain
git pull --ff-only origin v1
git rev-parse HEAD
```

Expected: `origin https://github.com/jeius/sevendays.git (fetch)`; `v1`; empty status; the pull reports "Already up to date." (plan time) or fast-forwards to the Step 1 `origin/v1`; HEAD equals `origin/v1`. A non-fast-forward pull means the checkout and origin diverged — STOP, owner (never reset the checkout over a diverged `v1` without a ruling). If the directory does not exist (a fresh machine): `git clone --branch v1 https://github.com/jeius/sevendays.git ~/Projects/sevendays-v1-seed` and note it in the report — the runbook names this path as the working copy.

- [ ] **Step 3: The `v1` run history is green (no blemish before the first pick)**

```bash
gh run list --branch v1 --limit 30 --json databaseId,conclusion,headSha,createdAt,displayTitle \
  --jq '.[] | "\(.databaseId) \(.conclusion) \(.headSha[0:8]) \(.createdAt) \(.displayTitle)"'
```

Expected at plan time: exactly one line, `34558416379 success 0f4f340f 2026-09-11T03:26:02Z chore: studio site baseline — catalog site + admin scaffold`. Every line must be `success`. Record the count as `V1_RUNS_BEFORE` — Task 6 expects `V1_RUNS_BEFORE + 1` after the pick push.

- [ ] **Step 4: Toolchain and gates in the workspace**

```bash
cd ~/Projects/sevendays
node --version && pnpm --version && gh --version | head -1 && git --version
gh api repos/:owner/:repo --jq '{allow_squash_merge, default_branch}'
gh api repos/:owner/:repo/branches/main/protection 2>&1 | grep -o '"message":"[^"]*"' || true
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed | tail -1
```

Expected: Node ≥ 24, pnpm 11.x, gh 2.45.0, git 2.43; `{"allow_squash_merge":true,"default_branch":"main"}`; `"message":"Branch not protected"` (no protection — the pre-authorized squash-merge in Task 5 needs no override); installs/builds clean; the audit's last line is `AUDIT PASS — 0 hits across 18 tokens · v1 (0f4f340) is booking-free · exit 0` (SHA per Step 2). An audit FAIL here is a pre-existing lineage defect → STOP, owner (triage class c).

- [ ] **Step 5: PR B's branch**

```bash
cd ~/Projects/sevendays
git switch -c feat/82-pick-discipline origin/main
git status --porcelain
```

Expected: on `feat/82-pick-discipline` at the Step 1 `origin/main`; status shows only the pre-existing untracked files (`docs/superpowers/plans/2026-09-11-81-v1-first-light.md` if #81 hasn't merged, `graphify-out/cache/*`) — leave them alone.

### Task 2: The classifier, the runbook, the `AGENTS.md` pointer (PR B's first commit)

**Files:**
- Create: `scripts/v1-triage.mjs`
- Create: `docs/agents/v1-picks.md`
- Modify: `AGENTS.md` (two lines under Agent skills)

**Interfaces:**
- Consumes: `scripts/seed-v1/paths.txt` (read at run time by the classifier), the audit's token list (referenced, not duplicated), the owner-ratified fallback thresholds.
- Produces: `node scripts/v1-triage.mjs <commit> [--repo <path>]` — prints per-path `MAIN-ONLY`/`v1-path` lines and one `VERDICT SKIP|PICK|SPLIT …` line, exit 0 (exit 2 on usage/git errors); the runbook every later task follows; the ledger with its first row (#86).

**Not here:** no self-test flag on the classifier (Task 3 proves it on four real commits — two skips, the drill split, and later the titles pick); no changes to the audit script; no `docs/plan.md`/`progress.md` edits (Task 7); no worked-example rows beyond #86 (Tasks 3–4 add theirs from actual runs).

- [ ] **Step 1: Write `scripts/v1-triage.mjs`**

```js
// Owner tooling — main only. Never cherry-picked to `v1` (it lives under
// `scripts/`, a path the seed removed; the pick discipline skips it).
//
// The per-PR triage classifier for the v1 pick discipline (issue #82;
// ADR-0015 decision 2; runbook docs/agents/v1-picks.md). Given a commit on
// main, it classifies every path the commit touched as MAIN-ONLY or v1-path
// and prints the path-level verdict:
//   SKIP  — every touched path is main-only (nothing can enter v1)
//   PICK  — no touched path is main-only (candidate; content rules still apply)
//   SPLIT — both kinds (pick the v1-paths, drop the main-only ones)
//
// MAIN-ONLY = the seed's invert-paths list (scripts/seed-v1/paths.txt, read
// live so the ruleset of record drives the verdict) + the booking-cluster
// globs below (new files inside an absent cluster never existed on v1, so a
// path-existence check cannot catch them) + the docs/client main-only fence.
//
// Usage:
//   node scripts/v1-triage.mjs <commit> [--repo <path>]
// Exit codes: 0 verdict printed · 2 usage/environment error.
// The verdict is path-level only — apply the runbook's content rules before
// executing a PICK or SPLIT.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const CLUSTER = [
  /^apps\/landing\/src\/routes\/book/, // book.tsx, booking.$id.tsx, any future book*
  /^apps\/landing\/src\/lib\/booking/, // booking.ts, booking-read.ts (+tests); bookable-* never matches
  /^apps\/landing\/src\/components\/booking(\/|$)/,
  /^apps\/api\/src\/routes\/appointments/,
  /^apps\/api\/src\/services\/(appointments|confirmation-email)/,
  /^apps\/api\/test\/appointments/,
  /^packages\/api-client\/src\/routes\/appointments/,
  /^docs\/client(\/|$)/, // main-only fence (spec § Docs) — post-dates the seed, so not on paths.txt
];

function failUsage(message) {
  console.error(`error: ${message}`);
  console.error('usage: node scripts/v1-triage.mjs <commit> [--repo <path>]');
  process.exit(2);
}

function git(repoPath, args) {
  const r = spawnSync('git', args, { cwd: repoPath, encoding: 'utf8' });
  if (r.error) failUsage(`git not runnable: ${r.error.message}`);
  if (r.status !== 0) {
    console.error(`git ${args.join(' ')} failed in ${repoPath} (exit ${r.status}):`);
    console.error(r.stderr);
    process.exit(2);
  }
  return r.stdout;
}

function loadMainOnlyPrefixes() {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(join(here, 'seed-v1', 'paths.txt'), 'utf8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function isMainOnly(path, prefixes) {
  if (prefixes.some((p) => path === p || path.startsWith(`${p}/`))) return true;
  return CLUSTER.some((re) => re.test(path));
}

function main(argv) {
  let repoPath = '.';
  let commit;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repo') {
      repoPath = argv[++i];
      if (!repoPath) failUsage('--repo needs a path');
    } else if (commit === undefined) commit = argv[i];
    else failUsage(`unexpected argument: ${argv[i]}`);
  }
  if (!commit) failUsage('a commit is required');

  const prefixes = loadMainOnlyPrefixes();
  const sha = git(repoPath, ['rev-parse', '--verify', `${commit}^{commit}`]).trim();
  const subject = git(repoPath, ['log', '-1', '--format=%s', sha]).trim();
  const paths = git(repoPath, ['show', '--name-only', '--format=', sha])
    .split('\n')
    .filter(Boolean);

  console.log(`v1 triage — ${sha.slice(0, 7)} ${subject}`);
  let mainOnly = 0;
  let v1 = 0;
  for (const p of paths) {
    if (isMainOnly(p, prefixes)) {
      mainOnly++;
      console.log(`  MAIN-ONLY  ${p}`);
    } else {
      v1++;
      console.log(`  v1-path    ${p}`);
    }
  }
  if (paths.length === 0) console.log('  (no paths — empty commit)');

  let verdict;
  if (v1 === 0) verdict = `SKIP — all ${mainOnly} path(s) main-only`;
  else if (mainOnly === 0) verdict = `PICK — ${v1} v1-path(s); apply the content rules before picking`;
  else verdict = `SPLIT — ${v1} v1-path(s) + ${mainOnly} main-only; drop the main-only paths`;
  console.log(`VERDICT ${verdict}`);
}

main(process.argv.slice(2));
```

Then:

```bash
cd ~/Projects/sevendays
pnpm exec biome check --write scripts/v1-triage.mjs
node scripts/v1-triage.mjs fb92ef9 | tail -1
node scripts/v1-triage.mjs; echo "exit=$?"
```

Expected: biome clean (it may re-wrap nothing — the file is written in root style); `VERDICT SKIP — all 18 path(s) main-only`; the bare call prints `error: a commit is required` + the usage line on stderr and `exit=2`. (The plan-time run of this exact file printed 18 `MAIN-ONLY` lines for `fb92ef9`: `docs/plan.md`, `docs/progress.md`, the #80 plan file, 11 `graphify-out/*` paths, `scripts/audit-v1-absence.mjs`, the three `scripts/seed-v1/*` files.)

- [ ] **Step 2: Write `docs/agents/v1-picks.md` — the runbook**

Write the file exactly as below (the ledger holds its first row; later tasks append rows and fill the `#TITLES_PR` reference in § Worked examples):

````markdown
# v1 picks — the per-PR discipline (main-only runbook)

The standing maintenance of the two-edition delivery (ADR-0015 decision 2; spec `docs/specs/2026-09-11-delivery-versions-spec.md` § The Artifact Mechanism). `v1` is the booking-free artifact line seeded once by `git filter-repo` (#80); from that seed on, every PR squash-merged to `main` is triaged here — **pick**, **skip**, or **split** — executed, locked by CI + the private deploy + the export audit, and recorded in the ledger at the bottom. This file lives under `docs/agents/`, a path the seed removed from `v1`: it is main-only by construction and never enters the artifact (its own PRs are skips).

## The standing rule

**Main is a strict superset of `v1` by patch content.** Every commit on `v1` after the seed is either a cherry-pick of a main squash commit (carrying its `(cherry picked from commit …)` line), a split of one (that line plus a `Split:` line), or a revert of a pick. Nothing is authored on `v1` directly; main is never merged into `v1`; `v1` only ever moves by fast-forward pushes. Booking enters `v1` exactly once, as the paid v2 change-set — never through a pick.

Seed point: main `0bdfe82` ≡ `v1`'s rewritten `e314af3` (the seed content commit `0f4f340` sits on top). Everything merged to main after `0bdfe82` is triage backlog; the ledger starts there.

## The loop — on every squash merge to main

1. **Triage** (path pass + content pass, below) → PICK / SKIP / SPLIT.
2. **Execute** in the `v1` checkout — `~/Projects/sevendays-v1-seed`, branch `v1` (the seed clone kept as the working copy; any clone with `v1` checked out works). The main workspace never checks `v1` out.
3. **Lock**: local `pnpm check` + `pnpm build` green in the checkout, the export audit exit 0, then push; the push's run must show `check` + `Deploy v1 (private)` success and `Deploy teaser (main)` skipped.
4. **Record** the ledger row (this file, in a main PR — itself a skip).

Who runs it: whoever triages — agent or owner. The locks, not a reviewer, keep `v1` honest; anything the conflict policy calls ambiguous stops at the owner. Cadence: triage at merge time; a backlog is caught up in main order.

## Triage

### Path pass — `scripts/v1-triage.mjs`

```bash
node scripts/v1-triage.mjs <main-sha>
```

Classifies every path the squash commit touched as **MAIN-ONLY** (the seed's invert-paths list `scripts/seed-v1/paths.txt`, read live, plus the booking-cluster globs and the `docs/client/` fence) or **v1-path**, and prints the path-level verdict: all main-only → `SKIP`; none → `PICK`; both → `SPLIT`.

### Content pass — what never enters `v1` even on a v1-path

Read every v1-path hunk (`git show <sha> -- <path>`) against these rules; a hunk that trips one is dropped — and if every v1-path hunk trips, the PR is a SKIP:

- **Booking content** — anything carrying an absence-inventory token (`node scripts/audit-v1-absence.mjs --list-tokens`): the `RESEND_API_KEY`/`LANDING_ORIGIN` pair, the `resend` dependency, `appointmentQueries`, `createAppointment`/`getAppointment`, `phDateTime`, booking routes and links, the `/appointments` mount, `confirmation-email`. Also booking-coupled plumbing whose only purpose is the pair or the absent routes (test helpers that inject the pair, fixtures for absent endpoints). The audit is the mechanical backstop, not the first line.
- **Edition mechanics** — prose or config naming the editions, the teaser, the seed, picks, handover, `v1`/`v2`: `AGENTS.md`'s pick-discipline pointer, plan/progress prose, `docs/client/`. `v1`'s `AGENTS.md`, `docs/{PRD,architecture,tech-stack}.md`, ADR-0013/0016 and the CONTEXT glossaries are client-safe rewrites; only client-safe hunks may land on them.
- **Deployment identity** — `wrangler.toml`/`wrangler.jsonc` `name` fields and the `API` service binding stay `sevendays-v1-*` on `v1` (ADR-0016); a main hunk touching them is re-applied with the `v1` names.

Final verdict = the path verdict narrowed by the content pass. A real booking PR usually reads SPLIT on paths and SKIP on content (worked example #65 below).

### Transformed surfaces — pickable, expect conflicts

Files that exist on both branches with different content (the seed's booking-off rewrite): landing `components/{site-header,package-card,service-card,service-teaser-item,branch-card}.tsx`, `routes/{index,services}.tsx`, `lib/{queries,api.functions,format,format.test,api-404}.ts`; api `src/{routes/v1.ts,env.ts,env.test.ts}`, `package.json`, `wrangler.toml`, `.dev.vars.example`, `test/helpers/env.ts`; api-client `src/{index.ts,app-type.test.ts}`, `test/{mock-api,typing.test,loopback.test}.ts`; both frontends' `wrangler.jsonc`; `AGENTS.md`, `docs/{PRD,architecture,tech-stack}.md`, `docs/adr/{0013,0016}-*.md`, `CONTEXT-MAP.md`, `apps/*/CONTEXT.md`. Regenerables: `apps/landing/src/routeTree.gen.ts`, `pnpm-lock.yaml`.

## Executing a PICK

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1
git fetch origin main
git cherry-pick -x <main-sha>          # conflicts → § Conflict policy
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check && pnpm build
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed   # exit 0
cd ~/Projects/sevendays-v1-seed && git push origin v1
gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId'     # then: gh run watch <id> --exit-status
gh run view <id> --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'      # check: success · Deploy v1 (private): success · Deploy teaser (main): skipped
```

`-x` appends `(cherry picked from commit <main-sha>)` — the provenance line the superset check reads. The main SHA is absent from the export's history; accepted (ADR-0015 Consequences).

If the PR changed dependencies, `pnpm install --frozen-lockfile` fails or the lockfile conflicts (`v1` dropped `resend`): take `v1`'s lockfile (`git checkout v1 -- pnpm-lock.yaml`), run `pnpm install` to apply the PR's `package.json` changes, and commit the regenerated lockfile inside the pick — never hand-edit it. If the PR added or removed a landing route, regenerate the route tree on `v1` (`pnpm --filter @sevendays/landing generate-routes`) instead of resolving `routeTree.gen.ts` by hand.

## Executing a SPLIT

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1 && git fetch origin main
git cherry-pick -n <main-sha>          # exits 1 when a main-only path is "deleted by us" (DU) — expected
git status --short                     # A = new main-only file, DU = absent on v1, M = v1-path hunk
git rm -qrf --ignore-unmatch -- <main-only path> [<main-only path> …]
git commit -F - <<EOF
$(git log -1 --format=%B <main-sha>)
(cherry picked from commit $(git rev-parse <main-sha>))
Split: main-only paths dropped — <path>, <path>
EOF
```

Then the same locks as a PICK (gates, audit, push, run). A v1-path hunk the content pass rejected (a booking-coupled edit to a shared file) is reverted before the commit with `git restore --staged --worktree --source=HEAD -- <path>` and named in the `Split:` line as `content-dropped: <path>`.

## Conflict policy on transformed surfaces

The pick reproduces the PR's **intent** on `v1`'s variant; it never restores booking or edition content. Per class:

- **Landing booking-off surfaces** (header, hero, cards, `/services` copy): keep `v1`'s call-forward content (spec § The Booking-Off Direction — "Call us" → `/branches`, `tel:` CTAs on branch cards, no CTA rows on catalog cards); re-apply the PR's styling, structure, and copy changes around it. A hunk whose substance *is* the booking CTA is dropped (the pick becomes a split).
- **api env-shed, api-client group, `routes/v1.ts` mounts**: the appointments/email entries never return; re-apply everything else.
- **`wrangler.*` configs**: `sevendays-v1-*` names and the `sevendays-v1-api` binding stay; re-apply other config intent.
- **Client-safe docs and `AGENTS.md`**: re-apply only client-safe, mechanics-free hunks — usually nothing.
- **Regenerables**: never resolved by hand — regenerate (route tree, lockfile) after the other hunks land.

Time-box: if a single pick's conflict work passes one hour, or the resolution amounts to re-authoring a surface rather than re-applying a change, stop — the owner decides, and the event counts toward the fallback trigger. Never resolve a conflict by weakening the audit or the checks.

## The locks — after every push

- `check` green on the `v1` run (`pnpm check` + `pnpm build` — the typed cascade fails any incomplete cut).
- `Deploy v1 (private)` success and `Deploy teaser (main)` **skipped** on that run — the pick touched only `v1`'s pipeline; the teaser lives on main's own runs.
- Export audit exit 0 over `v1`'s full history (run before the push; re-runnable any time).
- Live curl once the deploy leg lands: the picked content is served on `https://sevendays-v1-landing.pahamajulius.workers.dev`, `/book` is still 404 there, and the teaser still serves `/book` 200 — the deployed artifact is booking-free and the teaser is untouched by the pick.
- Superset check (any time): every `(cherry picked from commit <sha>)` on `v1` after the seed names a commit reachable from `origin/main` —

  ```bash
  cd ~/Projects/sevendays-v1-seed && git fetch origin main
  git log --format=%B 0f4f340..v1 | grep -o 'cherry picked from commit [0-9a-f]*' | awk '{print $5}' | sort -u \
    | while read s; do git merge-base --is-ancestor "$s" origin/main && echo "ok $s" || echo "NOT ON MAIN $s"; done
  ```

A red `check` on a pick: if the cause is content (the cut was incomplete), `git revert` the pick on `v1`, push, and re-triage — never force-push, never hot-fix on `v1`. If the cause is infrastructure (token, environment, worker), it is an owner-run ops fix; the pick stands.

## Fallback — the squashed snapshot

ADR-0015 holds one escape hatch if the discipline proves too costly: replace the lineage with a squashed snapshot of `v1`'s tree (absence trivially satisfied, provenance discarded). It is a one-way door — after clients hold `v1`-SHA repos, only another full handover can change the mechanism — so the trigger is explicit and the decision is the owner's.

**Trigger (owner-ratified 2026-09-11) — any one of:**

1. A single pick needs more than one hour of conflict work, or its resolution re-authors a transformed surface instead of re-applying the change.
2. `v1` lags main by more than 10 pickable PRs, or the oldest untriaged merge is more than 4 weeks old.
3. Two consecutive picks land red on `v1`'s `check` for content reasons.

A hit means: stop picking, record the hit in the ledger's notes, and bring it to the owner. The owner either rules a fix (usually: catch up in main order, or re-scope a surface) or invokes the fallback — which is its own ticket, never an in-loop action.

## Worked examples

- **#86 `fb92ef9` — SKIP.** The seed's own PR: `scripts/seed-v1/*`, `scripts/audit-v1-absence.mjs`, `docs/plan.md`, `docs/progress.md`, a plan file, `graphify-out/*` — 18 paths, all main-only. Nothing to read.
- **#65 `abfa9d2` (confirmation email + Resend; pre-seed, worked retrospectively) — SPLIT on paths, SKIP on content.** Path pass: 12 v1-paths (`pnpm-lock.yaml`, `apps/api/src/env.ts`, `env.test.ts`, `package.json`, `.dev.vars.example`, `wrangler.toml`, `test/helpers/env.ts`, five api test files) beside 29 booking-cluster and docs/graph main-only paths. Content pass: every v1-path hunk adds the `RESEND_API_KEY`/`LANDING_ORIGIN` pair, the `resend` dependency (the `pnpm-lock.yaml` hunk is its lockfile resolution entries), or routes the pair into test envs via `helpers/env` — nothing stands alone as booking-free value. Final: SKIP. (Its rewritten form already lives in `v1`'s history as `0c01531`; this is the example, not an executed skip.)
- **The route-titles PR (#TITLES_PR) — PICK.** Five landing route files, all v1-paths, no tokens; the first real pick (ledger).
- **The split drill — SPLIT.** A synthetic mixed commit (a v1-path comment + a booking-cluster edit + a new booking-cluster file), split on a local branch of the checkout, never pushed: `git diff --stat v1..HEAD` showed the v1-path only; the audit passed; both branches deleted.

## Ledger

One row per squash merge to main since the seed point, in main order. `v1 SHA` is the pick/split commit (— for skips). Drills are marked.

| Merged | PR | Main SHA | Verdict | v1 SHA | Notes |
|---|---|---|---|---|---|
| 2026-09-11 | #86 | `fb92ef9` | skip | — | seed PR: ruleset + audit token fix + docs/graph — 18 paths, all main-only |
````

Then:

```bash
cd ~/Projects/sevendays
pnpm exec biome check --write docs/agents/v1-picks.md
grep -c '^| 2026' docs/agents/v1-picks.md
```

Expected: biome clean (markdown is format-checked only where configured — a no-op is fine); `1` ledger row.

- [ ] **Step 3: The `AGENTS.md` pointer**

In `AGENTS.md`, immediately before the line `## graphify`, insert (keeping one blank line on each side):

```markdown
### v1 pick discipline

Every PR squash-merged to `main` is triaged pick / skip / split for the booking-free `v1` branch (ADR-0015). Runbook + ledger: `docs/agents/v1-picks.md` — main-only, never picked.

```

Then:

```bash
grep -n "### v1 pick discipline" AGENTS.md
grep -n "^## graphify" AGENTS.md
```

Expected: the pointer's line number is three lines above `## graphify` (heading, blank, paragraph, blank, `## graphify`).

- [ ] **Step 4: Commit PR B's first commit**

```bash
cd ~/Projects/sevendays
pnpm exec biome check scripts/v1-triage.mjs
git add scripts/v1-triage.mjs docs/agents/v1-picks.md AGENTS.md docs/superpowers/plans/2026-09-11-82-pick-discipline.md
git commit -m "docs(agents): #82 v1 pick discipline — runbook + ledger + path classifier"
git status --porcelain
```

Expected: biome clean; one commit on `feat/82-pick-discipline`; status shows only the pre-existing untracked files.

### Task 3: Backlog triage + the booking worked example (ledger rows)

**Files:**
- Modify: `docs/agents/v1-picks.md` (ledger rows; § Worked examples numbers if execution differs from plan time)

**Interfaces:**
- Consumes: Task 1 Step 1's backlog list, the classifier.
- Produces: one ledger row per backlog commit (at plan time: #86 only — already seeded in Task 2; any newer commit gets its row here), the #65 worked-example transcript, and — if a backlog commit is PICK/SPLIT — its execution per Task 6's procedure before the titles pick.

**Not here:** no PR A work (Task 5); no pushes unless a backlog commit is genuinely pickable (then Task 6's procedure applies to it, in main order, and its row lands here).

- [ ] **Step 1: Classify every backlog commit**

```bash
cd ~/Projects/sevendays
for c in $(git rev-list --reverse 0bdfe82..origin/main); do node scripts/v1-triage.mjs "$c" | sed -n '1p;$p'; echo; done
```

Expected at plan time: one block — `v1 triage — fb92ef9 feat(scripts): #80 seed the v1 branch — … (#80) (#86)` / `VERDICT SKIP — all 18 path(s) main-only`. If #81's close-out has merged, its block reads `VERDICT SKIP — all N path(s) main-only` (its files: `docs/plan.md`, `docs/progress.md`, its plan file, `graphify-out/*` — #81's own Task 7 flags it as a clean skip); add its ledger row after #86's:

```markdown
| <merge date> | #<pr> | `<sha7>` | skip | — | #81 close-out: plan/progress ticks + plan file + graph — all main-only |
```

Any other block: run the full content pass (§ Content pass) on its v1-path hunks and record the final verdict; a PICK or SPLIT is executed now via Task 6 Steps 1–5 (then its row carries the `v1 SHA` and run id) — main order is preserved by doing it before Task 5's merge.

- [ ] **Step 2: The booking worked example — `abfa9d2` (#65), path pass then content pass**

```bash
cd ~/Projects/sevendays
node scripts/v1-triage.mjs abfa9d2 | grep -E '^  v1-path|^VERDICT'
for p in $(node scripts/v1-triage.mjs abfa9d2 | awk '$1=="v1-path"{print $2}'); do
  n=$(git show abfa9d2 -- "$p" | grep -E '^\+' | grep -cE 'RESEND_API_KEY|LANDING_ORIGIN|resend|confirmation-email|onboarding@resend\.dev|helpers/env')
  a=$(git show abfa9d2 -- "$p" | grep -cE '^\+[^+]')
  printf '%-45s added=%-3s booking-coupled=%s\n' "$p" "$a" "$n"
done
```

Expected (execution-time, controller-verified): the path pass lists 12 `v1-path` lines — `apps/api/.dev.vars.example`, `apps/api/package.json`, `apps/api/src/env.test.ts`, `apps/api/src/env.ts`, `apps/api/test/addon-services.test.ts`, `apps/api/test/branches.test.ts`, `apps/api/test/error-seam.test.ts`, `apps/api/test/helpers/env.ts`, `apps/api/test/service-packages.test.ts`, `apps/api/test/studio-services.test.ts`, `apps/api/wrangler.toml`, `pnpm-lock.yaml` — and `VERDICT SPLIT — 12 v1-path(s) + 29 main-only; drop the main-only paths`. (The plan-time pin said 11 + 30, omitting the lockfile; the Task 2 review caught it — the classifier is canonical: `pnpm-lock.yaml` exists on `v1`'s tree and is a regenerable transformed surface.) The content loop prints `booking-coupled` ≥ 1 for **every** one of the 12 (execution-time counts: 5, 1, 18, 2, 1, 1, 1, 4, 1, 1, 2 — and 3 for `pnpm-lock.yaml`, whose 30 added lines are the `resend` dependency's resolution entries; the loop's `resend` token was widened from the plan-time `"resend":` for exactly this hunk — each file's added lines carry the env pair, the `resend` dep, or the `helpers/env` switch that exists to inject the pair). That is the content pass turning SPLIT into SKIP: no v1-path hunk survives. Record the transcript; it is the runbook's worked example and this row:

```markdown
| 2026-09-10 (pre-seed) | #65 | `abfa9d2` | skip (example) | — | booking PR worked retrospectively: paths SPLIT (12 v1-paths + 29 main-only), content pass drops all 12 (env pair / resend dep incl. its lockfile entries / helpers-env) → SKIP; rewritten form already in v1 as `0c01531` |
```

Append it to the ledger **above** the #86 row (main order: #65 merged before the seed).

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/sevendays
pnpm exec biome check --write docs/agents/v1-picks.md
git add docs/agents/v1-picks.md
git commit -m "docs(agents): #82 ledger — backlog triage + the #65 worked example"
```

Expected: one more commit on `feat/82-pick-discipline`.

### Task 4: The split drill — a synthetic mixed commit, split per the runbook (local only)

**Files:**
- Workspace branch `drill/82-mixed` (local, deleted at the end): `apps/landing/src/routes/about.tsx` (+2 lines), `apps/landing/src/lib/booking.ts` (+2 lines), `apps/landing/src/lib/booking-drill.ts` (new) — never merged, never pushed.
- Checkout branch `drill/82-split` (local, deleted at the end).
- Modify: `docs/agents/v1-picks.md` (one ledger row).

**Interfaces:**
- Consumes: the runbook's § Executing a SPLIT (Task 2), the classifier.
- Produces: the AC 3 split evidence — classifier SPLIT verdict, the exact conflict shapes, the split commit's message and diff footprint, audit PASS over the drill branch — and the ledger row.

**Not here:** no push of either drill branch (CI on scratch branches is not configured and not wanted — the *procedure* is what this proves; CI on a real pick is Task 6); no `pnpm check` on the drill (comment-only change); no changes that survive — both branches are deleted in Step 5.

- [ ] **Step 1: The mixed commit on a local branch off `origin/main`**

```bash
cd ~/Projects/sevendays
git switch -c drill/82-mixed origin/main
printf '\n// drill: shared-surface change (never merged)\n' >> apps/landing/src/routes/about.tsx
printf '\n// drill: booking-cluster change (never merged)\n' >> apps/landing/src/lib/booking.ts
printf 'export const drill = true;\n' > apps/landing/src/lib/booking-drill.ts
git add -A apps/landing/src/routes/about.tsx apps/landing/src/lib/booking.ts apps/landing/src/lib/booking-drill.ts
git commit -m "feat(landing): drill mixed change (#0)"
MIXED_SHA=$(git rev-parse HEAD); echo "MIXED_SHA=$MIXED_SHA"
node scripts/v1-triage.mjs "$MIXED_SHA"
git switch feat/82-pick-discipline
```

Expected: the classifier prints `v1-path    apps/landing/src/routes/about.tsx`, `MAIN-ONLY  apps/landing/src/lib/booking-drill.ts`, `MAIN-ONLY  apps/landing/src/lib/booking.ts`, and `VERDICT SPLIT — 1 v1-path(s) + 2 main-only; drop the main-only paths` (plan-time output, exact). Record `MIXED_SHA`. The workspace is back on PR B's branch with a clean tree.

- [ ] **Step 2: Fetch the drill commit into the `v1` checkout and split it**

```bash
cd ~/Projects/sevendays-v1-seed
git fetch ~/Projects/sevendays drill/82-mixed
git switch -c drill/82-split v1
git cherry-pick -n "$MIXED_SHA"; echo "cherry-pick exit=$?"
git status --short
```

Expected (plan-time, exact): the cherry-pick prints `error: could not apply <sha7>... feat(landing): drill mixed change (#0)` with the resolve hint and `cherry-pick exit=1`; status is exactly:

```text
A  apps/landing/src/lib/booking-drill.ts
DU apps/landing/src/lib/booking.ts
M  apps/landing/src/routes/about.tsx
```

— the three shapes the runbook names: `A` (a new main-only file the pick would silently add — the path pass is what catches it), `DU` (deleted by us: absent on `v1`), `M` (the v1-path hunk, applied clean).

- [ ] **Step 3: Drop the main-only paths, commit with the split message**

```bash
cd ~/Projects/sevendays-v1-seed
git rm -qrf --ignore-unmatch -- apps/landing/src/lib/booking.ts apps/landing/src/lib/booking-drill.ts
git status --short
git commit -F - <<EOF
$(git log -1 --format=%B "$MIXED_SHA")
(cherry picked from commit $MIXED_SHA)
Split: main-only paths dropped — apps/landing/src/lib/booking.ts, apps/landing/src/lib/booking-drill.ts
EOF
SPLIT_SHA=$(git rev-parse HEAD); echo "SPLIT_SHA=$SPLIT_SHA"
git status --porcelain
```

Expected: after the `rm`, status shows only `M  apps/landing/src/routes/about.tsx`; the commit succeeds; status is empty afterwards (if `git status` reports a cherry-pick still in progress, `git cherry-pick --quit` clears the sequencer state without touching the commit — note it in the report).

- [ ] **Step 4: Prove the split — footprint, message, audit**

```bash
cd ~/Projects/sevendays-v1-seed
git diff --stat v1..HEAD
git log -1 --format=%B
git ls-tree -r --name-only HEAD | grep -c 'lib/booking' || true
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs drill/82-split --repo ~/Projects/sevendays-v1-seed | tail -1; echo "audit exit=$?"
```

Expected (plan-time, exact): the stat is one line — ` apps/landing/src/routes/about.tsx | 2 ++` then ` 1 file changed, 2 insertions(+)`; the message is four lines — `feat(landing): drill mixed change (#0)`, a blank line, `(cherry picked from commit <MIXED_SHA>)`, `Split: main-only paths dropped — apps/landing/src/lib/booking.ts, apps/landing/src/lib/booking-drill.ts`; the tree grep prints `0` (no `lib/booking*` path exists on the split result); the audit prints `AUDIT PASS — 0 hits across 18 tokens · drill/82-split (<SPLIT_SHA7>) is booking-free · exit 0` and `audit exit=0`.

- [ ] **Step 5: Delete both drill branches; ledger row; commit**

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git branch -D drill/82-split && git status --porcelain && git rev-parse HEAD
cd ~/Projects/sevendays
git branch -D drill/82-mixed && git branch --list 'drill/*'
```

Expected: the checkout is back on `v1` at the Task 1 Step 2 SHA with a clean tree; no `drill/*` branches remain in either repo (the deleted-branch warnings about unmerged commits are expected — the commits were local only).

Append to the ledger (after the #86 row — the drill is dated today):

```markdown
| 2026-09-11 (drill) | — | `<MIXED_SHA7>` (local) | split (drill) | `<SPLIT_SHA7>` (local, deleted) | synthetic mixed commit: about.tsx comment (v1-path) + booking.ts edit + new booking-drill.ts (booking cluster); classifier SPLIT 1+2; both main-only paths dropped (`A` + `DU`); footprint about.tsx only; audit PASS; never pushed |
```

```bash
pnpm exec biome check --write docs/agents/v1-picks.md
git add docs/agents/v1-picks.md
git commit -m "docs(agents): #82 ledger — the split drill"
```

### Task 5: PR A — per-route page titles on the five shared landing routes (the pick source)

**Files:**
- Modify: `apps/landing/src/routes/packages/index.tsx`, `apps/landing/src/routes/packages/$slug.tsx`, `apps/landing/src/routes/services.tsx`, `apps/landing/src/routes/branches.tsx`, `apps/landing/src/routes/about.tsx`

**Interfaces:**
- Consumes: the owner-ratified title strings (Global Constraints); TanStack Router's `head` route option (pinned).
- Produces: PR A merged to main as one squash commit `TITLES_SHA` — the first real pick's source; `TITLES_PR`; the teaser redeployed by main's own pipeline (`TEASER_RUN`) with the titles live there (the PR's normal life, recorded for the "teaser unchanged by the pick" contrast).

**Not here:** no `index.tsx` edit (home keeps the root title); no `__root.tsx` edit; no titles on `book.tsx`/`booking.$id.tsx`; no meta descriptions, OG tags, or per-route SEO beyond `<title>` (design-milestone discretion); no route additions (the route tree is unchanged — `routeTree.gen.ts` must not appear in the diff).

- [ ] **Step 1: Branch and the five edits**

```bash
cd ~/Projects/sevendays
git switch -c feat/82-landing-route-titles origin/main
```

`apps/landing/src/routes/branches.tsx` — replace:

```tsx
export const Route = createFileRoute('/branches')({
  loader: async ({ context: { queryClient } }) => {
```

with:

```tsx
export const Route = createFileRoute('/branches')({
  head: () => ({ meta: [{ title: 'Branches | Sevendays Photography' }] }),
  loader: async ({ context: { queryClient } }) => {
```

`apps/landing/src/routes/about.tsx` — replace:

```tsx
export const Route = createFileRoute('/about')({
  component: AboutPage,
});
```

with:

```tsx
export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | Sevendays Photography' }] }),
  component: AboutPage,
});
```

`apps/landing/src/routes/services.tsx` — replace:

```tsx
export const Route = createFileRoute('/services')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
```

with:

```tsx
export const Route = createFileRoute('/services')({
  head: () => ({ meta: [{ title: 'Services | Sevendays Photography' }] }),
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
```

`apps/landing/src/routes/packages/index.tsx` — replace:

```tsx
export const Route = createFileRoute('/packages/')({
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
```

with:

```tsx
export const Route = createFileRoute('/packages/')({
  head: () => ({ meta: [{ title: 'Packages | Sevendays Photography' }] }),
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
```

`apps/landing/src/routes/packages/$slug.tsx` — replace:

```tsx
  component: PackageDetail,
  // Unknown/inactive slug → uniform not-found (owner-ratified copy).
```

with:

```tsx
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.name ?? 'Package'} | Sevendays Photography` }],
  }),
  component: PackageDetail,
  // Unknown/inactive slug → uniform not-found (owner-ratified copy).
```

(`loaderData` is the loader's returned `ServicePackage`; it is `undefined` on the not-found path, hence the guard — `servicePackageSchema` in `packages/types/src/package.ts` carries `name: z.string().min(1)`.)

- [ ] **Step 2: Gates**

```bash
cd ~/Projects/sevendays
pnpm exec biome check --write apps/landing/src/routes/branches.tsx apps/landing/src/routes/about.tsx apps/landing/src/routes/services.tsx apps/landing/src/routes/packages/index.tsx 'apps/landing/src/routes/packages/$slug.tsx'
git status --porcelain
pnpm check 2>&1 | tail -3
```

Expected: biome clean; status shows exactly the five `M` files (no `routeTree.gen.ts`); `pnpm check` green (33/33-class). A typecheck error on `loaderData?.name` means the `head` context's `loaderData` type didn't flow — STOP and report with the error (the pinned d.ts says it does; do not cast around it).

- [ ] **Step 3: Local render check — one `<title>` per page, the deepest route wins**

```bash
cd ~/Projects/sevendays
nohup pnpm --filter @sevendays/api dev > /tmp/82-api.log 2>&1 &
nohup pnpm --filter @sevendays/landing dev > /tmp/82-landing.log 2>&1 &
sleep 25
curl -s -o /dev/null -w 'api /health -> %{http_code}\n' --max-time 30 http://127.0.0.1:8787/health
curl -s --max-time 30 http://127.0.0.1:8787/api/v1/service-packages \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s)[0];console.log("SLUG="+p.slug);console.log("NAME="+p.name)})'
for u in / /packages /services /branches /about; do printf '%-10s ' "$u"; curl -s --max-time 60 "http://localhost:3000$u" | grep -o '<title>[^<]*</title>'; done
curl -s --max-time 60 "http://localhost:3000/packages/<SLUG>" | grep -o '<title>[^<]*</title>'
curl -s -o /dev/null -w 'not-found -> %{http_code}\n' --max-time 60 http://localhost:3000/packages/no-such-package
curl -s --max-time 60 http://localhost:3000/packages/no-such-package | grep -o '<title>[^<]*</title>'
for u in / /packages /branches "/packages/<SLUG>"; do printf '%-24s titles=' "$u"; curl -s --max-time 60 "http://localhost:3000$u" | grep -c '<title>'; done
pkill -f 'wrangler dev'; pkill -f 'vite dev --port 3000'; sleep 2; pgrep -fl 'wrangler dev|vite dev' || echo "dev servers stopped"
```

Expected: `api /health -> 200`; `SLUG=`/`NAME=` printed (record both — substitute `<SLUG>` in the two commands); the five titles are exactly `<title>Sevendays Photography</title>` (`/`), `<title>Packages | Sevendays Photography</title>`, `<title>Services | Sevendays Photography</title>`, `<title>Branches | Sevendays Photography</title>`, `<title>About | Sevendays Photography</title>`; the slug page prints `<title><NAME> | Sevendays Photography</title>`; `not-found -> 404` and its title is either `<title>Package | Sevendays Photography</title>` (the route's `head` ran with `loaderData` undefined) or `<title>Sevendays Photography</title>` (the router skipped the not-found match's `head`) — record which; both satisfy the copy constraint. Every `titles=` count is `1` (the deepest-first resolution — one `<title>`, never two). The dev servers are stopped. A missing or doubled title is a real defect — fix on this branch before continuing (the `meta: [{ title }]` shape is the root's own; do not switch to a top-level `title` key).

- [ ] **Step 4: Commit, push, open PR A, wait for CI, squash-merge**

```bash
cd ~/Projects/sevendays
git add apps/landing/src/routes
git commit -m "feat(landing): per-route page titles for the shared landing routes (#82)"
git push -u origin feat/82-landing-route-titles
gh pr create --base main --head feat/82-landing-route-titles \
  --title "feat(landing): per-route page titles for the shared landing routes (#82)" \
  --body "Per-route \`<title>\`s for the five shared landing routes — \`/packages\`, \`/packages/:slug\` (the package name), \`/services\`, \`/branches\`, \`/about\` — via each route's \`head()\`; home keeps the root title. Format \`Page | Sevendays Photography\` (owner-ratified 2026-09-11). Verified locally in dev: one \`<title>\` per page, the deepest route's title wins.

Part of #82 — the first real pick to \`v1\`."
```

Record the PR number as `TITLES_PR`. Then:

```bash
gh pr checks <TITLES_PR> --watch --fail-fast
gh pr merge <TITLES_PR> --squash --delete-branch
git fetch origin
TITLES_SHA=$(git rev-parse origin/main); echo "TITLES_SHA=$TITLES_SHA"
git log -1 --format='%s' origin/main
git show --name-only --format= "$TITLES_SHA"
node scripts/v1-triage.mjs "$TITLES_SHA" | tail -1
git switch feat/82-pick-discipline
```

Expected: the checks watch ends with the `check` job passing; the merge succeeds (no branch protection; squash allowed — verified Task 1 Step 4); `origin/main` advanced by one squash commit whose subject is `feat(landing): per-route page titles for the shared landing routes (#82) (#<TITLES_PR>)`; the name-only list is exactly the five route files; the classifier says `VERDICT PICK — 5 v1-path(s); apply the content rules before picking` (the content pass is trivial: five `head` additions, no tokens — say so in the notes). `gh pr merge --delete-branch` removes the remote branch, deletes the local one, and leaves the workspace on `main`; the final `git switch` returns to PR B's branch.

- [ ] **Step 5: The teaser's own redeploy (the PR's normal life on main — recorded for the AC 2 contrast)**

```bash
TEASER_RUN=$(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'); echo "TEASER_RUN=$TEASER_RUN"
gh run watch "$TEASER_RUN" --exit-status
gh run view "$TEASER_RUN" --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
curl -s --compressed --max-time 15 https://sevendays-landing.pahamajulius.workers.dev/branches | grep -o '<title>[^<]*</title>'
curl -s -o /dev/null -w 'teaser /book -> %{http_code}\n' --max-time 15 https://sevendays-landing.pahamajulius.workers.dev/book
```

Expected: `check: success`, `Deploy teaser (main): success`, `Deploy v1 (private): skipped`; the teaser's `/branches` serves `<title>Branches | Sevendays Photography</title>`; `/book` is still `200` (booking-present, untouched). This run is main's — the pick in Task 6 must *not* produce another teaser deploy.

### Task 6: The first real pick — `-x` to `v1`, gates + audit, push, run green, deploy updated, teaser untouched

**Files:**
- `v1` (the checkout): the five PR A files, one pick commit `PICK_SHA`.
- Modify: `docs/agents/v1-picks.md` (the pick's ledger row).

**Interfaces:**
- Consumes: `TITLES_SHA`, `TITLES_PR`, `TEASER_RUN`, `V1_RUNS_BEFORE`; the runbook's § Executing a PICK and § The locks.
- Produces: the AC 2 evidence — a clean `-x` pick, local gates + audit green, `PICK_RUN` (`check` + `Deploy v1 (private)` success, `Deploy teaser (main)` skipped), the titles served live on `sevendays-v1-landing`, `/book` still 404 there, the teaser still booking-present with no new teaser run; `PICK_SHA`; the ledger row.

**Not here:** no conflict resolution is expected (the hunks land on regions byte-identical across branches — Global Constraints pins the diffs); if one appears anyway, apply § Conflict policy and report it as a finding (it changes the runbook's worked example, not the plan). No other commits on `v1`. No re-run of #81's full battery — only the invariants the pick could disturb.

- [ ] **Step 1: Pick with `-x` in the checkout**

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1 && git status --porcelain
git fetch origin main
git cherry-pick -x "$TITLES_SHA"; echo "cherry-pick exit=$?"
PICK_SHA=$(git rev-parse HEAD); echo "PICK_SHA=$PICK_SHA"
git log -1 --format=%B
git show --stat --format= HEAD
```

Expected: clean tree before; `cherry-pick exit=0` with no conflict output; the message is the squash subject `feat(landing): per-route page titles for the shared landing routes (#82) (#<TITLES_PR>)`, the squash body (if any), a blank line, then `(cherry picked from commit <TITLES_SHA>)`; the stat lists exactly the five route files (`+1` each for the four static routes; `$slug.tsx` carries the three-line `head` — `+3` unless biome wrapped it differently in Task 5, in which case quote what PR A's own stat shows). Record `PICK_SHA`.

- [ ] **Step 2: The pick landed on `v1`'s variants, not main's**

```bash
cd ~/Projects/sevendays-v1-seed
grep -c "Services | Sevendays Photography" apps/landing/src/routes/services.tsx
grep -c "call or visit a" apps/landing/src/routes/services.tsx
grep -c "Call Us" apps/landing/src/routes/index.tsx
grep -c "to='/book'" apps/landing/src/routes/index.tsx
git diff --stat "$TITLES_SHA^" "$TITLES_SHA" | tail -1
git diff --stat HEAD~1 HEAD | tail -1
```

Expected: `1` (the new title is on `v1`'s `services.tsx`), `1` (the booking-off copy line is intact), `1` (the hero's `Call Us` is intact — `index.tsx` untouched by the pick), `0` (no booking link came along); the two `--stat` summaries are **identical** (plan-time expectation `5 files changed, 7 insertions(+)`; the identity is the check — the same patch on both branches, by construction).

- [ ] **Step 3: Local gates in the checkout, then the audit from the workspace**

```bash
cd ~/Projects/sevendays-v1-seed
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check 2>&1 | tail -3
pnpm build 2>&1 | tail -2
git status --porcelain
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed | tail -1; echo "audit exit=$?"
```

Expected: install/build clean (the lockfile is unchanged by PR A — `--frozen-lockfile` holds); `pnpm check` and `pnpm build` exit 0 (the checkout's task count is lower than main's — expected, exit 0 is the gate); status empty (builds write only ignored `dist/`); `AUDIT PASS — 0 hits across 18 tokens · v1 (<PICK_SHA7>) is booking-free · exit 0` and `audit exit=0`. Any red here → Failure triage (b)/(c) — the pick is not pushed until the cause is understood.

- [ ] **Step 4: Push `v1`; the run is green with the teaser leg skipped**

```bash
cd ~/Projects/sevendays-v1-seed
git push origin v1
sleep 15
PICK_RUN=$(gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId'); echo "PICK_RUN=$PICK_RUN"
gh run view "$PICK_RUN" --json headSha --jq .headSha
gh run watch "$PICK_RUN" --exit-status
gh run view "$PICK_RUN" --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
gh run list --branch v1 --limit 30 --json conclusion --jq '[.[] | .conclusion] | "\(length) runs · \(map(select(. == "success")) | length) success"'
```

Expected: the push is a fast-forward (`0f4f340..<PICK_SHA7>  v1 -> v1`); the run's head SHA equals `PICK_SHA`; the watch exits 0; jobs are exactly `check: success`, `Deploy v1 (private): success`, `Deploy teaser (main): skipped`; the run list shows `V1_RUNS_BEFORE + 1` runs, all success (plan time: `2 runs · 2 success`). Record `PICK_RUN`.

- [ ] **Step 5: Live — the private deploy updated; the booking-free invariants hold; the teaser is untouched by the pick**

```bash
L=https://sevendays-v1-landing.pahamajulius.workers.dev
for u in / /packages /services /branches /about; do printf 'v1 %-10s ' "$u"; curl -s --compressed --max-time 15 "$L$u" | grep -o '<title>[^<]*</title>'; done
printf 'v1 /packages/%s ' "<SLUG>"; curl -s --compressed --max-time 15 "$L/packages/<SLUG>" | grep -o '<title>[^<]*</title>'
for u in /book /booking/abc; do printf 'v1 %-14s -> %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$L$u")"; done
echo "v1 home href /book: $(curl -s --compressed --max-time 15 "$L/" | grep -cE 'href="/book')"
echo "v1 home /booking:   $(curl -s --compressed --max-time 15 "$L/" | grep -c '/booking')"
curl -s -o /dev/null -w 'v1-api /api/v1/appointments -> %{http_code}\n' --max-time 15 https://sevendays-v1-api.pahamajulius.workers.dev/api/v1/appointments
echo '--- teaser (main) — untouched by the pick ---'
curl -s -o /dev/null -w 'teaser /book -> %{http_code}\n' --max-time 15 https://sevendays-landing.pahamajulius.workers.dev/book
curl -s --max-time 15 -X POST -H 'content-type: application/json' -d '{}' https://sevendays-api.pahamajulius.workers.dev/api/v1/appointments | head -c 60; echo
echo "latest main run: $(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId') (TEASER_RUN was ${TEASER_RUN})"
```

Expected: `v1 /` → `<title>Sevendays Photography</title>` (root, unchanged); `/packages`, `/services`, `/branches`, `/about` → `Packages | …`, `Services | …`, `Branches | …`, `About | Sevendays Photography`; the slug page → `<title><NAME> | Sevendays Photography</title>` — **these are the "private deploy updates" proof: content that did not exist on `sevendays-v1-landing` before the pick is served now.** `/book -> 404`, `/booking/abc -> 404`, both home counts `0`, `v1-api /api/v1/appointments -> 404` (the absence boundary is untouched). Teaser: `/book -> 200`, the POST body begins `{"error":"Invalid request payload."` (booking-present, main's own world), and the latest main run id equals `TEASER_RUN` — the pick produced **no** teaser run. Any `v1` invariant broken → Failure triage (d), STOP.

- [ ] **Step 6: The superset check, the ledger row, commit on PR B**

```bash
cd ~/Projects/sevendays-v1-seed && git fetch origin main
git log --format=%B 0f4f340..v1 | grep -o 'cherry picked from commit [0-9a-f]*' | awk '{print $5}' | sort -u \
  | while read s; do git merge-base --is-ancestor "$s" origin/main && echo "ok $s" || echo "NOT ON MAIN $s"; done
```

Expected: exactly one line, `ok <TITLES_SHA>` — the standing rule holds mechanically (plus one `ok` per backlog pick executed in Task 3, if any).

Append to the ledger (after the drill row — main order; substitute the recorded values):

```markdown
| 2026-09-11 | #<TITLES_PR> | `<TITLES_SHA7>` | pick | `<PICK_SHA7>` | **first real pick** — per-route page titles, five shared landing routes; `-x` clean apply (5 files, +7); local gates + audit PASS; run <PICK_RUN> `check` + `Deploy v1 (private)` success, `Deploy teaser (main)` skipped; titles live on sevendays-v1-landing, `/book` still 404, teaser untouched (no new main run) |
```

```bash
cd ~/Projects/sevendays
pnpm exec biome check --write docs/agents/v1-picks.md
git add docs/agents/v1-picks.md
git commit -m "docs(agents): #82 ledger — the first real pick (PR #<TITLES_PR> → v1)"
```

### Task 7: Close-out — rebase, the tick, the record, the graph, PR B, the report

**Files (workspace, on `feat/82-pick-discipline`):**
- Modify: `docs/agents/v1-picks.md` (fill `#TITLES_PR` in § Worked examples; PR B's own ledger row)
- Modify: `docs/plan.md` (exactly one tick + annotation)
- Modify: `docs/progress.md` (Last-updated splice, one What Exists bullet, Current Milestone line, Next Steps amendment)
- Modify: `graphify-out/*` (graph refresh)

**Interfaces:**
- Consumes: every recorded value (`TITLES_PR`, `TITLES_SHA`, `PICK_SHA`, `PICK_RUN`, `TEASER_RUN`, `MIXED_SHA`, `SPLIT_SHA`, `SLUG`/`NAME`) and transcript.
- Produces: PR B open against main with `Closes #82`; the completion report. The owner merges PR B and ticks #82's boxes.

**Not here:** no sibling ticks — "Continuous private deploy of `v1`" and "Verify: the deployed `v1` artifact…" are #81's and stay byte-identical here (whether or not #81 has merged); no merge of PR B; no `gh` writes to issue #82; no second `v1` push.

- [ ] **Step 1: Rebase PR B onto the post-PR-A main; fill the worked-example reference**

```bash
cd ~/Projects/sevendays
git switch feat/82-pick-discipline
git fetch origin && git rebase origin/main
git log --oneline origin/main..HEAD
sed -i "s/#TITLES_PR/#<TITLES_PR>/g" docs/agents/v1-picks.md
grep -c 'TITLES_PR' docs/agents/v1-picks.md
```

Expected: the rebase is clean (PR B's files are disjoint from PR A's); the log shows PR B's four commits (runbook, backlog ledger, drill ledger, pick ledger); after the `sed`, the grep prints `0` — no unresolved reference remains in the runbook.

- [ ] **Step 2: Tick the "Cherry-pick discipline" checkbox in `docs/plan.md`**

```bash
grep -n "Cherry-pick discipline in place from here on" docs/plan.md
```

The grep lands on one `- [ ]` line in § "v1 Artifact Seed". Replace:

```markdown
- [ ] Cherry-pick discipline in place from here on: every merged non-booking PR picked to `v1` with `-x`, booking PRs skipped, mixed PRs split; main stays a superset of `v1`
```

with (substituting the recorded values):

```markdown
- [✅] Cherry-pick discipline in place from here on: every merged non-booking PR picked to `v1` with `-x`, booking PRs skipped, mixed PRs split; main stays a superset of `v1` _(2026-09-11, #82: runbook + ledger at `docs/agents/v1-picks.md` (main-only; pointer in AGENTS.md) with the path classifier `scripts/v1-triage.mjs` reading the seed's invert-paths list + the booking-cluster globs; the content pass, the conflict policy per transformed-surface class, the `-x`/`Split:` provenance formats, the four locks (local gates, export audit, the `v1` run with the teaser leg skipped, live curl), the superset check, and the owner-ratified fallback trigger (>1 h conflict work or re-authoring; lag >10 pickable PRs or >4 weeks; two consecutive content-red picks) are pinned there. Proven live: backlog triaged from the seed point (#86 skip); the real booking PR #65 `abfa9d2` walked to SKIP (paths SPLIT 12+29, content pass drops all 12); a synthetic mixed commit split on local branches (audit PASS, never pushed); **first real pick** PR #<TITLES_PR> (per-route page titles, five shared landing routes) → `v1` `<PICK_SHA7>`, run <PICK_RUN> `check` + `Deploy v1 (private)` success with `Deploy teaser (main)` skipped, titles live on `sevendays-v1-landing`, `/book` still 404, teaser still booking-present with no new main run. Standing rule recorded: main is a strict superset of `v1` by patch content; every squash merge from here on gets a ledger row.)_
```

Every other checkbox in the file stays byte-identical (`git diff --stat docs/plan.md` → one file, one line changed).

- [ ] **Step 3: `docs/progress.md` — four edits (each anchor exists whether or not #81 has merged)**

Edit 1 — the first content line begins `_Last updated: 2026-09-11 (`. Replace exactly that prefix with:

```markdown
_Last updated: 2026-09-11 (pick discipline #82 — runbook + ledger `docs/agents/v1-picks.md` + classifier `scripts/v1-triage.mjs`; first real pick PR #<TITLES_PR> (route titles) → `v1` `<PICK_SHA7>` green + deployed, teaser leg skipped; #65 walked to SKIP, split drilled locally; fallback trigger pinned. Prior 2026-09-11: 
```

(the line's remainder — the previous entry's text — continues unchanged, so the line reads as one flowing entry).

Edit 2 — insert as the FIRST bullet under `## What Exists`:

```markdown
- **v1 pick discipline (2026-09-11, #82):** the standing maintenance is live. Runbook + ledger `docs/agents/v1-picks.md` (main-only, pointer in AGENTS.md): path pass via `scripts/v1-triage.mjs` (reads `scripts/seed-v1/paths.txt` live + booking-cluster globs + the `docs/client/` fence) → content pass (inventory tokens, edition mechanics, deployment identity) → PICK/SKIP/SPLIT; pinned pick + split procedures (`-x` provenance; `Split:` line), conflict policy per transformed-surface class, the four locks, the superset check, and the owner-ratified fallback trigger. Ledger seeded: #65 (skip, worked example — paths SPLIT, content SKIP), #86 (skip), the split drill, and the first real pick — PR #<TITLES_PR> (per-route `<title>`s, `Page | Sevendays Photography`, five shared routes; home keeps the root title) → `v1` `<PICK_SHA7>`: clean apply, local gates + audit PASS, run <PICK_RUN> `check` + `Deploy v1 (private)` success, `Deploy teaser (main)` skipped, titles served live on `sevendays-v1-landing`, `/book` still 404, teaser untouched by the pick. The `v1` working copy is `~/Projects/sevendays-v1-seed`. Next: every squash merge to main gets triaged + ledgered; M3 design-milestone picks flow through this loop.
```

Edit 3 — the `## Current Milestone:` line. Replace everything from the start of the line up to (not including) ` M2 (Public Booking Flow) is complete` with ONE of:

If #81's close-out has merged (its `docs/plan.md` ticks are on `origin/main`):

```markdown
## Current Milestone: v1 edition — the v1 artifact seed block is complete (seed #80, first light #81, pick discipline #82 — all 2026-09-11); next up Milestone 3 (UI/UX design system — spec task #61, wayfinder map #55), with every merge triaged per `docs/agents/v1-picks.md`.
```

Otherwise:

```markdown
## Current Milestone: v1 edition — the v1 artifact seed block is complete except #81's live verification (seed #80 + pick discipline #82 landed 2026-09-11); next up #81 first light, then Milestone 3 (UI/UX design system — spec task #61, wayfinder map #55), with every merge triaged per `docs/agents/v1-picks.md`.
```

Edit 4 — in `## Immediate Next Steps`, item 1's paragraph ends with `v2's hardening block now.)`. Append immediately after it:

```markdown
 Pick discipline stood up (#82): the runbook + ledger + classifier are live, the first real pick landed green and deployed, and every squash merge to main is triaged from here on — see `docs/agents/v1-picks.md`.
```

- [ ] **Step 4: graphify, gates, commit**

```bash
cd ~/Projects/sevendays
pnpm install --frozen-lockfile && pnpm build:packages
graphify update .
pnpm exec biome check --write docs/plan.md docs/progress.md docs/agents/v1-picks.md
git add graphify-out docs/plan.md docs/progress.md docs/agents/v1-picks.md
git commit -m "docs: #82 close-out — discipline tick, progress record, graph refresh"
pnpm check 2>&1 | tail -2
git diff --stat origin/main..HEAD -- docs/plan.md
git status --porcelain
```

Expected: graphify diff touches `graphify-out/` only; biome clean; `pnpm check` green (33/33-class — PR B adds one `.mjs` under `scripts/`, outside every turbo workspace, gated by its own scoped biome check in Task 2); `docs/plan.md` shows one file, one line changed; status clean apart from the known untracked files.

- [ ] **Step 5: Push PR B, open it, ledger its own triage, push again**

```bash
cd ~/Projects/sevendays
git push -u origin feat/82-pick-discipline
gh pr create --base main --head feat/82-pick-discipline \
  --title "docs(agents): #82 pick discipline stood up — runbook + ledger + classifier, first real picks" \
  --body "Stands up ADR-0015's per-PR pick discipline: \`docs/agents/v1-picks.md\` (triage: path pass via \`scripts/v1-triage.mjs\` + content pass; pick/split procedures with \`-x\` / \`Split:\` provenance; conflict policy per transformed-surface class; the four locks + superset check; owner-ratified fallback trigger; ledger) and a two-line \`AGENTS.md\` pointer.

Proven live: backlog triaged from the seed point (#86 skip); real booking PR #65 walked to SKIP (paths SPLIT 12+29, content pass drops all 12); synthetic mixed commit split on local branches (audit PASS, never pushed); **first real pick** PR #<TITLES_PR> → \`v1\` \`<PICK_SHA7>\` — run <PICK_RUN> \`check\` + \`Deploy v1 (private)\` success, \`Deploy teaser (main)\` skipped, titles live on sevendays-v1-landing, \`/book\` still 404, teaser untouched.

This PR is itself a skip under the runbook (every path main-only; the AGENTS.md hunk is edition mechanics) — ledgered as such.

Closes #82"
```

Record the number as `CLOSEOUT_PR`. Then append PR B's own row to the ledger (last row — it merges after everything above):

```markdown
| 2026-09-11 | #<CLOSEOUT_PR> | (squash SHA at merge) | skip | — | this runbook + classifier + AGENTS.md pointer + plan/progress/graph — every path main-only; the AGENTS.md hunk is edition mechanics (content rule) — the next triager fills the SHA |
```

```bash
pnpm exec biome check --write docs/agents/v1-picks.md
git add docs/agents/v1-picks.md
git commit -m "docs(agents): #82 ledger — this PR's own triage (skip)"
git push
gh pr view <CLOSEOUT_PR> --json url,title --jq '"\(.title)\n\(.url)"'
```

Expected: PR B open with six commits (runbook, backlog ledger, drill ledger, pick ledger, close-out, own-PR ledger); the ledger has five rows (#65, #86, drill, the pick, PR B — plus one per extra backlog commit from Task 3); the PR URL printed.

- [ ] **Step 6: The completion report — then STOP**

One message to the owner, containing:

1. **The evidence pack** (verbatim from the working notes): Task 3's classifier blocks + the #65 content-pass table; Task 4's `git status --short` shapes, the split message, the stat, the audit PASS line; Task 5's local title battery + `TITLES_PR`/`TITLES_SHA` + the teaser run's jobs; Task 6's pick message, the two identical `--stat` summaries, the checkout gates, the audit PASS, `PICK_RUN`'s three job conclusions, the live `v1` title battery, the invariants (`/book` 404 ×2, home counts 0, api 404), the teaser contrast (`/book` 200, the 400 body, no new main run), and the superset check's `ok <TITLES_SHA>`.
2. **The AC mapping:** AC 1 (main-only runbook: triage, `-x` provenance, conflict policy on transformed surfaces, fallback trigger; scrub-listed) → Task 2 (`docs/agents/` is on `scripts/seed-v1/paths.txt`; the runbook's own PR is ledgered as a skip). AC 2 (first real pick with `-x` → `v1` CI green → private deploy updates; teaser unchanged) → Tasks 5–6 (the titles served on `sevendays-v1-landing` are the "updates"; `Deploy teaser (main): skipped` + no new main run + `/book` 200 on the teaser are "unchanged by the pick"; PR A's own teaser redeploy is recorded as the PR's normal life). AC 3 (booking PR demonstrably skipped; mixed PR split per the runbook) → Task 3 Step 2 (#65: path SPLIT, content SKIP — transcript + ledger) and Task 4 (the drill — transcript + ledger). AC 4 (main a superset of `v1` by patch content, recorded as the standing rule) → runbook § The standing rule + § The locks' superset check, run green in Task 6 Step 6.
3. **State:** `origin/v1` = `PICK_SHA` (one pick on top of the seed; run history `V1_RUNS_BEFORE + 1`, all green); `origin/main` = post-PR-A; PR B (`CLOSEOUT_PR`) open with `Closes #82` — **the owner merges it and ticks #82's boxes**; after merging, the owner (or the next agent) fills PR B's squash SHA in its ledger row on the next triage pass.
4. **Flags:** (a) the standing rule from here on — every squash merge to main gets `node scripts/v1-triage.mjs <sha>` + a ledger row, with picks executed from `~/Projects/sevendays-v1-seed`; (b) #81's checkboxes were left untouched (state whether #81 had merged at execution and which Current-Milestone variant was written); (c) the not-found-title behaviour observed in Task 5 Step 3 (which of the two acceptable outcomes); (d) any deviation from plan-time expectations (moved SHAs, extra backlog commits and their verdicts, a conflict on the pick, re-derived counts) — stated plainly with what was done.

Then STOP. The turn ends with the report; nothing in this ticket runs after it.

