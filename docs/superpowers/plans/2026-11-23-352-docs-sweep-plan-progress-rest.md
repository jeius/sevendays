# Plan: #352: Handover polish: sweep docs (plan, progress, architecture, rest)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The em-dash sweep (spec #348 item 1) covers the docs leg that #351 does not: every tracked file under `docs/` outside #351's three trees (`docs/adr/`, `docs/specs/`, `docs/agents/`). That is 134 files carrying **20,886 em-dash occurrences on 14,365 lines** at the 2026-11-23 census: the seven reference docs (PRD, architecture, tech-stack, the two provisioning runbooks, staff provisioning, the drafts prototype), `docs/superpowers/plans/`'s **124 historical plans** (the single heaviest tree, 19,538 occurrences), the milestone `docs/plan.md` (321), and the cross-session record `docs/progress.md` (855). `docs/catalog.md` is verified already clean. The method is the #349 law unchanged: `scripts/em-dash-sweep.mjs fix` rewrites exactly the spaced form (space, U+2014, space) to `, `; everything else (line-end, line-start, double-space, unspaced placeholder literals) is enumerated hand work; the fix-up pass rewrites headings, checklist subjects, and list intros to colons where the mechanical comma reads wrong; en dashes (1,310, numeric ranges) are never touched; dates, numbers, ticket references, and record semantics stay intact, proven by count gates plus a letters-and-digits drift gate that must be byte-identical to the branch point.

**Architecture:** No new machinery. The only tool is #349's `scripts/em-dash-sweep.mjs` (check / fix / `--self-test`, `pnpm em-dash` alias), consumed exactly as built. This plan adds zero scripts, zero dependencies, zero code changes: it is the tool's largest application, split into four sweep tasks whose scopes are disjoint file sets, plus the closure task. The ticket's acceptance verdict is the **scoped check** with git pathspec exclusions (the tool passes pathspecs through to `git ls-files` verbatim, so `:(exclude)` magic scopes the run to this ticket's trees without touching the tool).

**Tech Stack:** zero new dependencies; plain Node + git + coreutils (`tr`, `md5sum`, `diff`) for the drift gate; pnpm/Turbo only for the closing `pnpm check`; `gh` CLI for the PR.

**Spec:** [GitHub issue #352](https://github.com/jeius/sevendays/issues/352), authoritatively settled by its parent spec, [issue #348](https://github.com/jeius/sevendays/issues/348), repo copy `docs/specs/2026-11-22-pre-handover-polish-spec.md` (item 1: scope, method, exclusions, en-dash law, no-DB-pass ruling Q5; Testing Decisions: the em-dash gate script + this ticket's scoped verdict).

**A note on this file:** the plan is **born em-dash-free by construction**, the same discipline as the tool's own source (which spells the character as `\u2014` escapes so the gate never flags its tool). Every em dash this document displays is written as the escape `\u2014`; the real files carry the actual character. The future repo-wide gate (#354) must never flag this plan, and no task needs to sweep the plan itself.

## Branch law

- Branch **`docs/352-docs-sweep`** off current `main` (`573f608` at plan time, 2026-11-23). It exists already, created in the worktree `.worktrees/docs/352-docs-sweep` (the house layout, gitignored); this plan file is the branch's first commit. Execution continues on that branch. If the branch or worktree was lost, recreate: `git worktree add .worktrees/docs/352-docs-sweep -b docs/352-docs-sweep main` and confirm `main` is still at `573f608` (if it moved, re-run the pre-flight census against the new base and reconcile before starting).
- One PR to `main` titled `Handover polish: sweep docs (plan, progress, architecture, rest) (#352)` (Closes #352). The merge is the owner's call; the v1 pick follows the picks runbook after merge (the sweep-split treatment the #349/#359 ledger row established).
- Sibling law: this ticket's verdict is the **scoped** check (the pathspec command in Global Constraints). The **unscoped** check is #354's CI invocation and stays *expected-red* until #350 (apps), #351 (adr/specs/agents), and #353 (root files) land; #354 wires the gate **last**. Record the unscoped check's output once in Task 5 as PR evidence: it must name only sibling trees.

## Controller pre-flight (live-run, record before Task 1)

All numbers below were measured 2026-11-23 at `573f608` (both from the main checkout and re-verified inside the worktree checkout). Re-run each and record; drift means something merged, reconcile before starting.

- **Floors (must not move anywhere in this ticket):** api 34 files / 482 passed + 3 skipped; types 18 files / 197 passed; api-client 5 files / 45; landing 19 files / 152; admin 34 files / 364; db 4 files / **30 passed + 0 skipped with `TEST_DATABASE_URL` set** (the with-var form; ruling #349-R4). A docs-only sweep cannot move any floor; the Task 5 closing gate proves it.
- **The in-scope file set:** `git ls-files docs/ | grep -vE '^docs/(adr|specs|agents)/'` → **134 swept files** (all `.md`; no other file types live under `docs/`) **plus this plan file itself: 135 tracked total**. The plan file is em-dash-free by construction and is never swept, never hand-edited, and EXCLUDED from every per-task gate by the `grep -v 352-docs-sweep-plan-progress-rest` filter (it is absent at the merge-base, so the drift gate would false-DRIFT on it). Re-derive and record at pre-flight. (Amendment, execution pre-flight 2026-11-23: the census was taken before the plan file existed; with the exclusion in place every pinned number below holds exactly, live-verified.)
- **Dash census (occurrences, per tree):**

  | tree | em occ | dash lines | spaced (scripted form) | line-end | line-start | dbl-space | en |
  |---|---|---|---|---|---|---|---|
  | A: reference docs (8 files) | 172 | 151 | 165 | 6 | 1 | 0 | 5 |
  | B: `docs/superpowers/plans/` (124 files) | 19,538 | 13,885 | 19,232 | 214 | 14 | 19 | 1,245 |
  | C: `docs/plan.md` | 321 | 141 | 321 | 0 | 0 | 0 | 23 |
  | D: `docs/progress.md` | 855 | 188 | 850 | 4 | 0 | 0 | 37 |
  | **total** | **20,886** | **14,365** | **20,568** | **224** | **15** | **19** | **1,310** |

  Reconciliation law per tree: spaced + non-spaced = occurrences, where non-spaced = line-end occurrences + line-start occurrences + double-space occurrences + unspaced-mid residue (tree A: 165+7=172, the 7 being exactly the 6 line-end + 1 line-start sites; tree B: 19,232+306=19,538; tree C: 321+0; tree D: 850+5, the 5 being 4 line-end occurrences + 1 unspaced-mid). Re-run commands (the characters are built at runtime by `printf`, keeping this file clean):

  ```bash
  EM=$(printf '\u2014'); EN=$(printf '\u2013')
  FILES=$(git ls-files docs/ | grep -vE '^docs/(adr|specs|agents)/' | grep -v 352-docs-sweep-plan-progress-rest)
  echo "occ=$(grep -ho "$EM" $FILES | wc -l) lines=$(grep -h "$EM" $FILES | wc -l) spaced=$(grep -ho " $EM " $FILES | wc -l) lineEnd=$(grep -hE "$EM$" $FILES | wc -l) en=$(grep -ho "$EN" $FILES | wc -l)"
  ```

  Expected: `occ=20886 lines=14365 spaced=20568 lineEnd=224 en=1310`.
- **Named hand-class sites (small trees, enumerated at plan time):** tree A line-end six: `docs/drafts/2026-09-10-v2-offer-sheet-PROTOTYPE.md:47` and `:55`, `docs/staff-provisioning.md:3`, `docs/architecture.md:16` (inside the ASCII box diagram, the diagram law in Global Constraints applies), `docs/ship-provisioning-runbook.md:70` and `:137`; tree A line-start one: `docs/ship-provisioning-runbook.md:99`. Tree D line-end four: `docs/progress.md:129`, `:155`, `:218`, `:237`. Tree C has **zero** hand-class lines (all 321 occurrences are the spaced form; its work is mechanical + the heading/subject fix-up). Tree B's hand classes are too many to enumerate (214 line-end + 14 line-start + 19 double-space lines + the placeholder-literal residue): the tool's leftover report is the authoritative site list there.
- **Placeholder-literal class (tree B):** the files `2026-09-09-m2-07-booking-wizard.md`, `2026-09-10-m2-08-booking-confirmation.md`, `2026-09-22-118-better-auth-foundation.md`, `2026-09-26-139-m5-05-admin-screens-core.md`, `2026-10-07-187-dashboard-audience-half.md`, `2026-10-13-214-branch-covers-gallery-captions.md`, `2026-10-18-221-settings-users-forgot.md`, `2026-11-22-349-em-dash-sweep-tool-and-trees.md` quote the unspaced `'\u2014'` empty-value glyph inside fenced code examples (the `?? '\u2014'` shape, and in-quote trailing dashes). Task 2 Step 4 handles them per the placeholder law.
- **Record-gate baselines (Task 3/Task 4 assert unchanged):** `docs/plan.md`: 129 checkbox lines (97 ticked `- [✅]`), 282 ticket references (`#\d+`), 170 dates (`20\d\d-\d\d-\d\d`), 16 headings, 23 en. `docs/progress.md`: 597 ticket references, 190 dates, 22 headings, 37 en (no checkbox lines).
- **Drift-gate probe:** the letters-and-digits stream of every in-scope file is byte-identical to the branch base today (probed on the four record files at plan time: all IDENTICAL). The gate command lives in Global Constraints.
- **The scoped verdict command (expected pre-sweep output):**

  ```bash
  node scripts/em-dash-sweep.mjs check docs ':(exclude)docs/adr' ':(exclude)docs/specs' ':(exclude)docs/agents'
  ```

  Expected: `EM DASH: 14365 line(s) in 133 file(s) still carry U+2014:` then the site list, exit 1. (133 of 134 files carry dashes; `docs/catalog.md` is clean.) After Task 4: `EM DASH: clean, 0 hits`, exit 0, the ticket's acceptance verdict.
- **Tool health:** `node scripts/em-dash-sweep.mjs --self-test` exits 0 (re-run at pre-flight).
- **Test DB:** `docker start sevendays-test-db-5433` if down (only the Task 5 closing `pnpm check` needs it).

## Scope fences

**In scope:** the 134 enumerated files under `docs/` outside #351's trees, the eight reference docs (`docs/PRD.md`, `docs/architecture.md`, `docs/catalog.md` verify-only, `docs/tech-stack.md`, `docs/media-bucket-runbook.md`, `docs/ship-provisioning-runbook.md`, `docs/staff-provisioning.md`, `docs/drafts/2026-09-10-v2-offer-sheet-PROTOTYPE.md`), `docs/superpowers/plans/**` (124 files), `docs/plan.md`, `docs/progress.md`; the end-of-round `docs/progress.md` entry (Task 5).

**NOT here (siblings / out of scope):**

- **#350: the apps tree.** All app prose, UI copy, and the live-code placeholder glyphs (the booking summary's empty scheduled time and friends) are #350's. Docs *quoting* such glyphs (the `'\u2014'` literals in historical plan examples) are this ticket's, handled per the placeholder law; the live code is not.
- **#351: `docs/adr/**`, `docs/specs/**`, `docs/agents/**`.** Its deliverable includes committing the round's still-untracked spec file. **That file (`docs/specs/2026-11-22-pre-handover-polish-spec.md`) stays untracked on this branch**, committing it would steal #351's deliverable and it would ride this PR's diff. Never `git add -A` in this ticket; stage named paths only (Global Constraints).
- **#353: the author-written root files** (`AGENTS.md`, `PRODUCT.md`, `CONTEXT-MAP.md`, `skills-lock.json`, root-level config comments: `.env.example`, CI workflows, playwright config).
- **#354: CI wiring** (the gate's both-ways demonstration, the exclusion list).
- **En dashes**, 1,310 occurrences preserved everywhere, by tool construction and by the fix-up rules. The per-tree totals are pinned in the census table and re-asserted per task.
- **Live DB rows (Q5)**, no database pass anywhere; the sweep is files-only.
- **Git history**, tree-state only, no rewrite. Commit messages may contain the character; the gate reads files, not history.
- **`.zcode/`, `.scratch/`**, gitignored, excluded by construction. **`graphify-out/`, `.agents/skills/`**, tool-excluded by construction. **No `graphify update`**: this ticket changes zero code files; the graph re-runs when code next changes.
- **`pnpm-lock.yaml`, `skills-lock.json`**, zero em dashes (verified 2026-11-23 for the former; the latter is #353's tree and is JSON data, not prose).
- **Visual baselines / e2e**, untouched; markdown under `docs/` feeds no test, no baseline, no runtime.
- **No ADR**, spec item 1 invents no architecture; the tool is #349's.

**Disclosed interpretations (the PR body carries all three verbatim; the owner rules at review):**

1. *"and the rest"* includes `docs/superpowers/plans/`: the 124 historical plans are author-written tracked docs and the spec's scope line ("every author-written tracked file") plus #354's repo-wide gate leave them nowhere else to go. They are swept **wholesale** like any doc: prose, headings, and fenced example blocks alike take the mechanical comma and the fix-up pass, so a historical plan's before/after examples lose their literal dashes. The execution evidence those examples carried lives permanently in the merged PRs and commits. If the owner prefers historical plans outside the gate instead, that is a #354 exclusion-list amendment, decided at this PR's review before merge.
2. The #349 plan file (`docs/superpowers/plans/2026-11-22-349-em-dash-sweep-tool-and-trees.md`, 97 occurrences) is swept like every other plan, including its fenced before/after blocks, which exist precisely to show the character being removed.
3. Docs *quoting* product strings sweep like prose (the mechanical comma). Where a quoted string is a live constant with a #349-rewritten form, the fix-up takes the live form so the quote mirrors the code.

## Global Constraints

- **Method law (spec #348, unchanged from #349):** fix mode rewrites exactly one shape, the spaced dash `\u0020\u2014\u0020` → `', '`. Line-end dashes, line-start dashes, double-space dashes, unspaced dashes, and placeholder glyphs are hand classes, never scripted. Spaced hyphens (` - `) are never used as replacements. En dashes are never touched, by tool or by hand.
- **The fix-up law:** wherever the mechanical comma reads wrong, rewrite with punctuation only: a dash that separated a title from its subtitle (headings, checklist subjects, list intros) becomes a **colon**; a parenthetical aside becomes a comma, parentheses, or a semicolon; a line-end continuation merges or splits with a period/semicolon. The only law: no dash, no comma splice, natural prose, punctuation-only changes. The letters-and-digits gate enforces "punctuation-only" mechanically.
- **The drift gate (the no-factual-drift proof), run per tree after each sweep task:**

  ```bash
  BASE=$(git merge-base main HEAD)
  for f in $(git ls-files <tree paths> | grep -v 352-docs-sweep-plan-progress-rest); do
    diff <(git show "$BASE:$f" | tr -cd '[:alnum:]') <(tr -cd '[:alnum:]' < "$f") >/dev/null || echo "DRIFT: $f"
  done; echo "drift check done"
  ```

  Expected: only `drift check done` (every swept file's alphanumeric stream byte-identical to the branch base). Any `DRIFT:` line is a hand fix that changed a letter or digit: revert that site and redo it as punctuation-only. If a site genuinely cannot be fixed without a word change, stop and record it in the PR body instead of breaking the gate. (The gate is case-sensitive: `tr -cd '[:alnum:]'` keeps letter case, so any case change is drift too, which is intended.)
- **The en-dash gate, run per tree after each sweep task:** the per-tree totals from the census table must hold exactly: A=5, B=1,245, C=23, D=37 (sum 1,310). Command shape (tree B shown):

  ```bash
  total=0; for f in $(git ls-files docs/superpowers/plans); do n=$(grep -o '–' "$f" | wc -l); total=$((total+n)); done; echo "en=$total"
  ```

  Named en contexts that must survive byte-identical: `docs/architecture.md` `0000–0014` (migration range), `docs/plan.md` `candidates A–D`, `docs/progress.md` `850–878`, `2–5`, `11–14`. En dash contexts are numeric ranges and correct typography; a fix-up that touches a line carrying one must not disturb it (the drift gate does not cover this; the en gate does).
- **Record laws:** `docs/plan.md` is the milestone plan: checkbox tick forms (`- [✅]`), dates, ticket references, floor numbers, and heading structure stay intact; only punctuation changes. `docs/progress.md` is the cross-session record: dates, numbers, ticket references, and record semantics stay intact; only punctuation changes. The count gates (Task 3 Step 3, Task 4 Step 3) assert the pinned baselines: plan.md 129/97/282/170/16 and en 23; progress.md 597/190/22 and en 37.
- **The scoped verdict (this ticket's acceptance command, verbatim):**

  ```bash
  node scripts/em-dash-sweep.mjs check docs ':(exclude)docs/adr' ':(exclude)docs/specs' ':(exclude)docs/agents'
  ```

  Per-task verdicts are the same command narrowed to the task's tree (given in each task). Exit 0 = clean; exit 1 prints `path:line` + the offending line for every remaining dash, the hand-work list.
- **The ASCII-diagram law:** `docs/architecture.md` carries a boxed ASCII diagram whose lines end in `│` borders. Fixing a dash inside a diagram line shortens it by one character (the spaced form is 3 chars, the comma form is 2): re-pad with one space so the right border column stays aligned, and never touch the border glyphs. The drift gate (alphanumerics only) is blind to spacing, so this law is a manual duty.
- **The placeholder law:** a quoted `'\u2014'` empty-value glyph (always unspaced, always inside a quoted code example) becomes `'-'` or a real word, picked per spot. This is the spec's rendered-placeholder ruling applied to docs; the live-code counterparts are #350's.
- **This plan file is em-dash-free by construction:** the character appears in this document only as the `\u2014` escape (en dashes appear literally, which is gate-legal). The gate must never flag this plan; no task sweeps it.
- **Staging discipline:** stage named paths only, never `git add -A`, the round's untracked spec file must remain untracked at every commit (`git status` checked at each commit: its only entry should ever be `?? docs/specs/2026-11-22-pre-handover-polish-spec.md`).
- **Floors do not move.** The Task 5 closing gate runs the full `pnpm check` and every suite must report exactly the pre-flight floors (a docs-only sweep cannot move any; a moved count means something else drifted: stop and reconcile).
- **Test DB:** the closing gate prefixes `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test` (start the standalone container first if down: `docker start sevendays-test-db-5433`). Port 5432 belongs to another project, never fall back.
- **Biome is not involved:** markdown is not biome-linted, the sweep creates no format drift, and `pnpm fix` is not required anywhere in this plan. `pnpm lint:root` remains pre-existing red at main and is NOT a gate (ruling #349-R3; turbo's `pnpm check` never runs it).
- **Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`**, untouched by this sweep, asserted unchanged by the Task 3 gate.
- **Commits** follow the repo's commit-work convention, each referencing #352. Prefixes: `chore(sweep):` (Tasks 1–4), `docs(progress):` (Task 5).
- **Run from the repo root** of the branch checkout (the worktree root). The tool reads `git ls-files` from cwd; the drift gate resolves the branch base via `git merge-base main HEAD`.

---

## Task 1: the eight reference docs (tree A)

`docs/PRD.md`, `docs/architecture.md`, `docs/catalog.md`, `docs/tech-stack.md`, `docs/media-bucket-runbook.md`, `docs/ship-provisioning-runbook.md`, `docs/staff-provisioning.md`, `docs/drafts/2026-09-10-v2-offer-sheet-PROTOTYPE.md`. Census: 172 occurrences / 151 dash lines / 165 spaced / 6 line-end / 1 line-start / 0 double-space / 5 en. `docs/catalog.md` is expected already clean (0/0 verified 2026-11-23), it rides the commands as the canary, never an edit.

**Files:** the eight above; `docs/catalog.md` verify-only.

**Interfaces:**
- Consumes: the pre-flight record, the tool (as built, untouched).
- Produces: tree A em-dash-free with en dashes and record content intact, `check` over the eight paths exits 0.

- [ ] **Step 1: Run the batch.** From the repo root:

  ```bash
  node scripts/em-dash-sweep.mjs fix docs/PRD.md docs/architecture.md docs/catalog.md docs/tech-stack.md docs/media-bucket-runbook.md docs/ship-provisioning-runbook.md docs/staff-provisioning.md docs/drafts
  ```

  Expected: per-file `fixed N:` lines totalling **165 replacement(s)**, then the leftover list, the 7 named hand sites (6 line-end + 1 line-start), and **exit 1** (leftovers need hands; that is the contract, not a failure). Reconcile: 165 + 7 = 172 census occurrences. A gap means drift: stop and reconcile. `docs/catalog.md` must appear nowhere in the output (it is clean).

- [ ] **Step 2: The fix-up pass.** Work the tool's leftover list top-down (the 7 sites are named in the pre-flight; the list is authoritative):

  - Line-end continuations (`docs/drafts/2026-09-10-v2-offer-sheet-PROTOTYPE.md:47`, `:55`; `docs/staff-provisioning.md:3`; `docs/ship-provisioning-runbook.md:70`, `:137`): merge the wrap or split with a period/semicolon, whichever reads naturally.

    Worked shape, `docs/staff-provisioning.md:3` (the real line, dash spelled `\u2014`):

    Before:
    ```md
    The admin app has no self-serve sign-up (`disableSignUp: true` \u2014
    ```
    After (merged with its continuation line; the executor picks the punctuation that reads):
    ```md
    The admin app has no self-serve sign-up (`disableSignUp: true`),
    ```

  - Line-start dash (`docs/ship-provisioning-runbook.md:99`, `\u2014 on the fresh DB it is the ruled baseline; …`): rewrite into the preceding sentence's continuation or a new sentence starting with a word.
  - The diagram line (`docs/architecture.md:16`): the line sits inside the boxed ASCII diagram. Fix the prose dash, then re-pad with one space so the trailing `│` border column stays aligned (the diagram law). The border glyphs themselves are untouched.
  - Then the artifact greps (expected empty in tree A, double-space count is 0, the greps prove it):

    ```bash
    git grep -n ' , ' -- docs/PRD.md docs/architecture.md docs/tech-stack.md docs/media-bucket-runbook.md docs/ship-provisioning-runbook.md docs/staff-provisioning.md docs/drafts
    grep -nE '^#+ ' docs/PRD.md docs/architecture.md docs/tech-stack.md docs/media-bucket-runbook.md docs/ship-provisioning-runbook.md docs/staff-provisioning.md | grep ', '
    ```

    The first must print nothing. The second lists headings whose dashes the batch comma-ized: wherever the comma reads wrong, promote to a colon (the fix-up law). The drafts prototype is excluded from the heading grep on purpose: it is an offer-sheet draft whose headings are client copy, apply the same law by reading it, not by pattern.

- [ ] **Step 3: The gates.** In order:

  ```bash
  node scripts/em-dash-sweep.mjs check docs/PRD.md docs/architecture.md docs/catalog.md docs/tech-stack.md docs/media-bucket-runbook.md docs/ship-provisioning-runbook.md docs/staff-provisioning.md docs/drafts
  ```

  Expected: `EM DASH: clean, 0 hits (…)`, exit 0, this task's verdict, `docs/catalog.md` included as the canary.

  ```bash
  total=0; for f in docs/PRD.md docs/architecture.md docs/catalog.md docs/tech-stack.md docs/media-bucket-runbook.md docs/ship-provisioning-runbook.md docs/staff-provisioning.md docs/drafts/2026-09-10-v2-offer-sheet-PROTOTYPE.md; do n=$(grep -o '–' "$f" | wc -l); total=$((total+n)); done; echo "en=$total"
  ```

  Expected: `en=5` (named contexts intact: `docs/architecture.md` `0000–0014`).

  ```bash
  BASE=$(git merge-base main HEAD)
  for f in $(git ls-files docs/PRD.md docs/architecture.md docs/catalog.md docs/tech-stack.md docs/media-bucket-runbook.md docs/ship-provisioning-runbook.md docs/staff-provisioning.md docs/drafts); do
    diff <(git show "$BASE:$f" | tr -cd '[:alnum:]') <(tr -cd '[:alnum:]' < "$f") >/dev/null || echo "DRIFT: $f"
  done; echo "drift check done"
  ```

  Expected: only `drift check done`.

- [ ] **Step 4: Commit.** `git status` first: the only untracked entry is the spec file. Then:

  ```bash
  git add docs/PRD.md docs/architecture.md docs/tech-stack.md docs/media-bucket-runbook.md docs/ship-provisioning-runbook.md docs/staff-provisioning.md docs/drafts/2026-09-10-v2-offer-sheet-PROTOTYPE.md
  git commit -m "chore(sweep): the reference docs em-dash-free (#352)"
  ```

  (`docs/catalog.md` is unstaged, untouched.)

---

## Task 2: the superpowers plans tree (tree B)

`docs/superpowers/plans/**`: 124 historical plans, census 19,538 occurrences / 13,885 dash lines / 19,232 spaced / 214 line-end / 14 line-start / 19 double-space lines / 1,245 en. This is the bulk of the ticket by volume but the lightest by judgment: historical plans take the mechanical comma and the structural fix-up; the disclosed interpretation (Scope fences) governs. No record gates here beyond the drift gate and the en gate.

**Files:** every dash-carrying file under `docs/superpowers/plans/` (124 at census; the 8 placeholder-literal files are named in the pre-flight).

**Interfaces:**
- Consumes: the tool, the census.
- Produces: `check docs/superpowers/plans` exit 0; the #349 plan file and every other historical plan clean; en total 1,245 intact.

- [ ] **Step 1: Run the batch.**

  ```bash
  node scripts/em-dash-sweep.mjs fix docs/superpowers/plans
  ```

  Expected: ~124 `fixed N:` lines (files whose dashes are all hand-class appear only in the leftover list) totalling **19232 replacement(s)**, then the leftover list (the 214 line-end + 14 line-start + 19 double-space lines + the placeholder residue) and **exit 1**. Reconcile: 19,232 + 306 = 19,538.

- [ ] **Step 2: The double-space artifacts.** The batch cannot touch the 19 double-space lines (they are not the spaced form); some may already sit in the leftover list. Find every comma artifact the batch did produce, and every double-space site:

  ```bash
  git grep -n ' , ' -- docs/superpowers/plans
  ```

  Fix the comma artifacts wherever a splice or space-comma reads wrong (colon where the dash introduced a usage/definition, else clean `, `). The 19 double-space sites are hand-class lines: they sit in the Step 1 leftover list; fix them per the fix-up law.

- [ ] **Step 3: The line-end / line-start loop.** Re-run the scoped check and work its output top-down:

  ```bash
  node scripts/em-dash-sweep.mjs check docs/superpowers/plans
  ```

  Every printed `path:line` is a hand site (unspaced, line-end, line-start, or double-space). Merge continuations or split with a period/colon per the fix-up law; re-run the check after each batch of edits until the printed list is only the placeholder-literal class. (The list starts at ~247 sites across 124 files, pace the work in file-sized chunks, committing nothing until Step 6.)

- [ ] **Step 4: The placeholder-literal class.** The 8 named files quote the `'\u2014'` empty-value glyph inside fenced code examples (the `?? '\u2014'` shape, and in-quote trailing dashes). Replace each with `'-'` or a real word per the placeholder law. Worked shape (real sites, `docs/superpowers/plans/2026-10-13-214-branch-covers-gallery-captions.md` around line 1070, dash spelled `\u2014`):

  Before:
  ```ts
      ? (catalog.packages.find((p) => p.id === offering.id)?.name ?? '\u2014')
  ```
  After:
  ```ts
      ? (catalog.packages.find((p) => p.id === offering.id)?.name ?? '-')
  ```

  (The live-code counterparts of such glyphs are #350's; the doc example takes the placeholder, never the scripted comma, these are unspaced anyway.)

- [ ] **Step 5: The gates.** In order:

  ```bash
  node scripts/em-dash-sweep.mjs check docs/superpowers/plans
  ```

  Expected: `EM DASH: clean, 0 hits (docs/superpowers/plans)`, exit 0.

  ```bash
  total=0; for f in $(git ls-files docs/superpowers/plans | grep -v 352-docs-sweep-plan-progress-rest); do n=$(grep -o '–' "$f" | wc -l); total=$((total+n)); done; echo "en=$total"
  ```

  Expected: `en=1245` (the plan file itself is excluded; it carries 23 gate-legal en dashes of its own).

  ```bash
  BASE=$(git merge-base main HEAD)
  for f in $(git ls-files docs/superpowers/plans | grep -v 352-docs-sweep-plan-progress-rest); do
    diff <(git show "$BASE:$f" | tr -cd '[:alnum:]') <(tr -cd '[:alnum:]' < "$f") >/dev/null || echo "DRIFT: $f"
  done; echo "drift check done"
  ```

  Expected: only `drift check done`.

- [ ] **Step 6: Commit.** `git status` first (the spec file stays untracked; nothing outside `docs/superpowers/plans` changed). Then:

  ```bash
  git add docs/superpowers/plans
  git commit -m "chore(sweep): the superpowers plans tree em-dash-free (#352)"
  ```

---

## Task 3: the milestone plan: `docs/plan.md` (tree C)

Census: 321 occurrences / 141 dash lines / **321 spaced / 0 line-end / 0 line-start / 0 double-space** / 23 en. The cleanest shape in the ticket: the batch makes it fully clean in one pass, and all remaining work is the heading/subject fix-up. The record law applies: checkbox ticks, dates, ticket references, floor numbers, and heading structure stay intact; the count gates prove it.

**Files:** `docs/plan.md`.

**Interfaces:**
- Consumes: the tool, the pinned record-gate baselines (129 checkbox lines / 97 ticks / 282 ticket refs / 170 dates / 16 headings / 23 en).
- Produces: `check docs/plan.md` exit 0 with every count gate identical.

- [ ] **Step 1: Run the batch.**

  ```bash
  node scripts/em-dash-sweep.mjs fix docs/plan.md
  ```

  Expected: `fixed 321: docs/plan.md`, `FIX: 321 replacement(s) across 1 file(s)`, then **`FIX: trees clean, exit 0`**, tree C has zero hand-class lines, so no leftover list. (If a leftover appears, the census drifted: stop and reconcile.)

- [ ] **Step 2: The heading/subject fix-up.** The batch comma-ized every dash; in headings and checklist subjects a comma usually reads wrong. Scan and fix per the law (colons; parenthetical commas stay commas when they read fine):

  ```bash
  grep -nE '^#+ ' docs/plan.md | grep ', '
  grep -nE '^- \[' docs/plan.md | grep ', ' | head -40
  git diff docs/plan.md | less
  ```

  Worked examples (real lines; the dash spelled `\u2014`):

  `docs/plan.md:5`, the mechanical comma reads wrong in a heading; promote to a colon:

  Before (as committed):
  ```md
  ## Editions \u2014 delivery versions (owner rulings 2026-09-09/10, issue #62)
  ```
  After the batch:
  ```md
  ## Editions, delivery versions (owner rulings 2026-09-09/10, issue #62)
  ```
  After the fix-up:
  ```md
  ## Editions: delivery versions (owner rulings 2026-09-09/10, issue #62)
  ```

  `docs/plan.md:12`, two dashes, two treatments (title separator becomes a colon; the parenthetical comma stays because it reads fine):

  Before (as committed):
  ```md
  ## Milestone 0 \u2014 Baseline (complete \u2014 exit criteria verified 2026-08-30)
  ```
  After the fix-up:
  ```md
  ## Milestone 0: Baseline (complete, exit criteria verified 2026-08-30)
  ```

  `docs/plan.md:20`, checklist subject: the backticked subject is the row's identity; colon, not comma:

  Before (as committed):
  ```md
  - [✅] `apps/api` \u2014 Hono skeleton with `/health`, stub `/api/branches`, stub `/api/appointments`
  ```
  After the fix-up:
  ```md
  - [✅] `apps/api`: Hono skeleton with `/health`, stub `/api/branches`, stub `/api/appointments`
  ```

  Then read the whole `git diff` once end to end (141 changed lines) and repair any remaining comma splice per the law. The long audit-note lines (e.g. line 61, which also carries the `A–D` en dash) get extra care: the en dash survives untouched while the em dashes around it become punctuation.

- [ ] **Step 3: The record gates.** In order:

  ```bash
  echo "checkbox=$(grep -cE '^- \[' docs/plan.md) ticks=$(grep -cE '^- \[✅\]' docs/plan.md)"
  echo "refs=$(grep -oE '#[0-9]+' docs/plan.md | wc -l) dates=$(grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}' docs/plan.md | wc -l) headings=$(grep -cE '^#{1,3} ' docs/plan.md)"
  echo "en=$(grep -o '–' docs/plan.md | wc -l)"
  node scripts/em-dash-sweep.mjs check docs/plan.md
  BASE=$(git merge-base main HEAD)
  diff <(git show "$BASE:docs/plan.md" | tr -cd '[:alnum:]') <(tr -cd '[:alnum:]' < docs/plan.md) >/dev/null && echo "ALNUM IDENTICAL" || echo "DRIFT"
  ```

  Expected, in order: `checkbox=129 ticks=97`; `refs=282 dates=170 headings=16`; `en=23` (`A–D` intact); `EM DASH: clean, 0 hits (docs/plan.md)` exit 0; `ALNUM IDENTICAL`.

- [ ] **Step 4: Commit.** `git status` first. Then:

  ```bash
  git add docs/plan.md
  git commit -m "chore(sweep): docs/plan.md em-dash-free (#352)"
  ```

---

## Task 4: the cross-session record: `docs/progress.md` (tree D)

Census: 855 occurrences / 188 dash lines / 850 spaced / 4 line-end lines / 1 unspaced-mid / 0 double-space / 37 en. The strictest law in the ticket: this file IS the record (dates, numbers, ticket references, record semantics). The entry headings carry a `date \u2014 #NNN:` pattern whose mechanical comma is usually correct (it reads as a date list); the line-end continuations and the one unspaced site are hands.

**Files:** `docs/progress.md`.

**Interfaces:**
- Consumes: the tool, the pinned record-gate baselines (597 ticket refs / 190 dates / 22 headings / 37 en).
- Produces: `check docs/progress.md` exit 0 with every count gate identical, ready for Task 5's appended entry.

- [ ] **Step 1: Run the batch.**

  ```bash
  node scripts/em-dash-sweep.mjs fix docs/progress.md
  ```

  Expected: `fixed 850: docs/progress.md`, `FIX: 850 replacement(s) across 1 file(s)`, then the leftover list, the 4 named line-end sites (`:129`, `:155`, `:218`, `:237`) plus the 1 unspaced-mid line the list names, and **exit 1**. Reconcile: 850 + 5 = 855.

- [ ] **Step 2: The fix-up pass.** The 4 line-end sites are wrapped-bullet continuations inside dense record lines. Worked shape, `docs/progress.md:129` (real lines, dash spelled `\u2014`):

  Before (as committed):
  ```md
    not catch either (Node env vs workerd). `DATABASE_URL` was already a Worker secret (2026-09-01 secret change) \u2014
  ```
  After (punctuation joins the wrap; the executor picks comma/semicolon per the sentence's read, punctuation only):
  ```md
    not catch either (Node env vs workerd). `DATABASE_URL` was already a Worker secret (2026-09-01 secret change),
  ```

  Same treatment for `:155`, `:218`, `:237` (all the same wrapped-continuation shape). Then the entry-heading class, read, don't blanket-fix; the mechanical comma is usually correct:

  ```bash
  grep -nE '^#+ [0-9]{4}' docs/progress.md | head -10
  git diff docs/progress.md | less
  ```

  Real example, `docs/progress.md:340`, the comma reads as a date list; it stays:

  Before (as committed):
  ```md
  ## 2026-11-13 \u2014 #247: social brand SVG icons + favicon sets (both apps), post-flight T7
  ```
  After the batch (no further fix-up needed):
  ```md
  ## 2026-11-13, #247: social brand SVG icons + favicon sets (both apps), post-flight T7
  ```

  Finally read the whole `git diff` end to end (188 changed lines, some extremely dense, line 3 alone carries dozens of commas now) and repair comma splices per the law.

- [ ] **Step 3: The record gates.** In order:

  ```bash
  echo "refs=$(grep -oE '#[0-9]+' docs/progress.md | wc -l) dates=$(grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}' docs/progress.md | wc -l) headings=$(grep -cE '^#{1,3} ' docs/progress.md)"
  echo "en=$(grep -o '–' docs/progress.md | wc -l)"
  node scripts/em-dash-sweep.mjs check docs/progress.md
  BASE=$(git merge-base main HEAD)
  diff <(git show "$BASE:docs/progress.md" | tr -cd '[:alnum:]') <(tr -cd '[:alnum:]' < docs/progress.md) >/dev/null && echo "ALNUM IDENTICAL" || echo "DRIFT"
  ```

  Expected, in order: `refs=597 dates=190 headings=22`; `en=37` (`850–878`, `2–5`, `11–14` intact); `EM DASH: clean, 0 hits (docs/progress.md)` exit 0; `ALNUM IDENTICAL`.

- [ ] **Step 4: Commit.** `git status` first. Then:

  ```bash
  git add docs/progress.md
  git commit -m "chore(sweep): docs/progress.md em-dash-free (#352)"
  ```

---

## Task 5: the full verdict, the closing gate, the records, the PR

**Files:**
- Modify: `docs/progress.md` (one entry, born em-dash-free, the text below must survive the gate it describes)
- Nothing else: no code, no graphify, no baselines.

**Interfaces:**
- Consumes: Tasks 1–4's green per-tree verdicts.
- Produces: the ticket's acceptance verdict (the scoped pathspec check, exit 0), the full `pnpm check` with floors identical, the progress entry, and the PR.

- [ ] **Step 1: The full scoped verdict + the sibling-law evidence.** In order:

  ```bash
  node scripts/em-dash-sweep.mjs check docs ':(exclude)docs/adr' ':(exclude)docs/specs' ':(exclude)docs/agents'
  ```

  Expected: `EM DASH: clean, 0 hits`, exit 0, acceptance criterion 1 proven.

  ```bash
  node scripts/em-dash-sweep.mjs check
  ```

  Expected: exit 1, and the named files must come ONLY from sibling trees (#350's apps, #351's `docs/adr`/`docs/specs`/`docs/agents` once #351 commits them, #353's root files). This branch's files must appear nowhere in the list. Record the output (its summary line + the named file set) as PR evidence, it is NOT a gate on this ticket.

- [ ] **Step 2: The en grand total.**

  ```bash
  total=0; for f in $(git ls-files docs/ | grep -vE '^docs/(adr|specs|agents)/' | grep -v 352-docs-sweep-plan-progress-rest); do n=$(grep -o '–' "$f" | wc -l); total=$((total+n)); done; echo "en=$total"
  ```

  Expected: `en=1310` (acceptance criterion 1's "en dashes kept" half; the plan file itself carries 23 gate-legal en dashes more, excluded here).

- [ ] **Step 3: The closing gate.** With the test container up:

  ```bash
  docker start sevendays-test-db-5433 2>/dev/null || true
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Expected: green across lint + format + typecheck + test for every workspace member, with every floor **identical** to the pre-flight record: api 34 files / 482 passed + 3 skipped; types 18 files / 197; api-client 5 files / 45; landing 19 files / 152; admin 34 files / 364; db 4 files / 30 passed + 0 skipped (with-var form; ruling #349-R4). Any count drift: stop and reconcile (nothing in this plan adds or removes a test).

- [ ] **Step 4: The progress entry.** Append at the end of `docs/progress.md` exactly (adjust the date only if execution lands on another day; the counts quoted are the census this plan pins, re-verify them against the live tree before committing):

  ```md
  ## 2026-11-23 #352: the docs sweep, the remaining docs de-dashed

  Handover polish item 1 (spec #348) docs leg: every tracked file under `docs/` outside #351's trees (`docs/adr`, `docs/specs`, `docs/agents`) is em-dash-free. `scripts/em-dash-sweep.mjs fix` + the fix-up pass swept 134 files (14,365 dash lines in 133 files at the 2026-11-23 census; 20,886 occurrences, 20,568 the spaced form the script rewrites): the seven reference docs, `docs/superpowers/plans`'s 124 historical plans (swept wholesale per the disclosed interpretation), `docs/plan.md`, and `docs/progress.md`; `docs/catalog.md` was verified already clean. Record semantics held: dates, numbers, ticket references, and checklist ticks verified unchanged by count gates, and every swept file's letters-and-digits stream is byte-identical to the branch point (the drift gate). En dashes preserved (1,310). The apps sweep is #350, the root files #353; the CI gate is #354, last.
  ```

- [ ] **Step 5: Commit.** `git status` first: the spec file is still the only untracked entry. Then:

  ```bash
  git add docs/progress.md
  git commit -m "docs(progress): the #352 docs-sweep line"
  ```

- [ ] **Step 6: Push + PR.** The merge stays the owner's call; the v1 pick follows the runbook after merge.

  ```bash
  git push -u origin docs/352-docs-sweep
  gh pr create --title "Handover polish: sweep docs (plan, progress, architecture, rest) (#352)" \
  --body-file <(cat <<'EOF'
Closes #352. Spec #348 item 1, the docs leg.

- docs/ swept em-dash-free via `scripts/em-dash-sweep.mjs fix` + the fix-up pass: the seven reference docs, `docs/superpowers/plans`'s 124 historical plans, `docs/plan.md`, and `docs/progress.md`; `docs/catalog.md` verified already clean. Census 2026-11-23: 20,886 occurrences on 14,365 lines in 133 files; 20,568 rewrites scripted, the rest hand-fixed (224 line-end, 15 line-start, 19 double-space, the placeholder literals, and the heading/subject fix-ups).
- The scoped verdict is green: `node scripts/em-dash-sweep.mjs check docs ':(exclude)docs/adr' ':(exclude)docs/specs' ':(exclude)docs/agents'` exits 0. The unscoped check stays expected-red until #350/#351/#353 land (its output names only sibling trees; #354 wires the gate last).
- Record laws held with evidence: plan.md 129 checkbox lines (97 ticks) / 282 ticket refs / 170 dates / 16 headings; progress.md 597 ticket refs / 190 dates / 22 headings; every swept file's letters-and-digits stream byte-identical to the branch point (the drift gate).
- En dashes preserved (1,310; `0000–0014`, `A–D`, `850–878` among the named contexts).
- Disclosed interpretations for owner review: (1) "the rest" includes `docs/superpowers/plans`, swept wholesale (example blocks' punctuation changes with the prose; the execution evidence lives in the merged PRs), preferring otherwise means a #354 exclusion-list amendment; (2) the #349 plan file swept like every plan; (3) docs quoting product strings take the mechanical comma, with live constants' quotes mirroring their #349-rewritten forms.
- Floors unchanged: api 34 files / 482+3sk, types 18 / 197, api-client 5 / 45, landing 19 / 152, admin 34 / 364, db 4 / 30 (with-var). Live DB rows untouched (Q5).
EOF
  )
  ```

  #352 closes on merge per the house pattern, with the issue's acceptance criteria ticked at close: criterion 1 = Step 1's scoped check green + Step 2's en total; criterion 2 = the Task 3/Task 4 count gates; criterion 3 = the drift gate plus the end-to-end diff reads in Task 2 Step 3 / Task 3 Step 2 / Task 4 Step 2, confirmed by the owner's PR review.

---

## Self-review record (written after the final append, 2026-11-23)

- Placeholder sweep: no `<!-- APPEND:` anchors remain; no TODO/placeholder markers; the file itself is **em-dash-free** (verified by grep: 0 literal U+2014; the character exists only as the `\u2014` escape text and inside `printf '\u2014'` runtime builders; the 23 en dashes are the gate-legal quoted contexts).
- Amendment (execution pre-flight, 2026-11-23): the committed plan file joins the tracked file set (135 total = 134 swept + this plan), so every loop-based gate now excludes it by the `grep -v 352-docs-sweep-plan-progress-rest` filter (it is absent at the merge-base, which would false-DRIFT the drift gate, and its 23 en dashes would inflate the en gates). With the exclusion, every pinned number holds exactly, live-verified at pre-flight (occ 20,886 / lines 14,365 / spaced 20,568 / lineEnd 224 / tree-B en 1,245 / grand en 1,310).
- Step-checkbox count: Task 1 has 4, Task 2 has 6, Task 3 has 4, Task 4 has 4, Task 5 has 6 (24 total, all `- [ ] **Step`).
- Cross-task names: the scoped verdict command is spelled identically in the pre-flight, Global Constraints, Task 5 Step 1, and the PR body (4 occurrences); the eight reference-doc paths are identical across Task 1's Steps 1/3/4; commit prefixes match Global Constraints (`chore(sweep):` Tasks 1–4, `docs(progress):` Task 5).
- Counts re-derived from the probes, not from memory: 20,886 occurrences / 14,365 dash lines / 133 carrying files of 134; 20,568 spaced; 224 line-end + 15 line-start + 19 double-space lines; 1,310 en; per-tree sums equal the totals (172+19,538+321+855; 151+13,885+141+188; 165+19,232+321+850; 5+1,245+23+37); the per-task reconcile laws (165+7, 19,232+306, 321+0, 850+5) follow the same census.
- Every machine-produced expectation was probed live before pinning (2026-11-23 at `573f608`, worktree-verified): the scoped pathspec check's output line and exit code, the tool's self-test pass, the drift-gate identity on the four record files, the record-gate baselines (129/97/282/170/16; 597/190/22), and the worked-example lines (read from the real files via `grep -n`).
- The plan-vs-sweep self-reference is closed: the plan carries zero literal em dashes, so no task sweeps it, and every command needing the character builds it at runtime (`printf '\u2014'`) instead of quoting it.
- The Task 5 PR heredoc is flush-left: a verbatim copy produces the exact body, and the `EOF` terminator sits at column 0.
- One fence note for the reviewer: this plan's own worked examples in Tasks 3 and 4 show `After` states as punctuation-rewritten lines; those are the real post-sweep forms the gates assert, not new copy for the executor to invent.
