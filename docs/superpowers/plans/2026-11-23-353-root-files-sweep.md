# Plan: #353 (Handover polish: sweep the author-written root files)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The seven author-written root files named in ticket #353 (AGENTS.md, PRODUCT.md, CONTEXT-MAP.md, .env.example, playwright.config.ts, .github/workflows/ci.yml, .github/workflows/e2e.yml) swept to zero em dashes. One string literal is hand-rewritten first (the E2E_BASE_URL curated failure message in playwright.config.ts), then the #349 sweep tool runs fix mode scoped to the seven files (136 mechanical comma replacements expected), the two line-end dashes get their hand fixes, and the seven fix-up sites pre-pinned at plan time take their final forms. Ticket numbers, test floors, and command lines are byte-preserved, proven by per-file digit- and backtick-multiset identity checks against HEAD. En dashes are preserved. No test file changes; every suite floor is frozen.

**Architecture:** No new code. The sweep machinery already exists on main (`scripts/em-dash-sweep.mjs` from #349: `check`/`fix`/`--self-test` over git-tracked text files, `graphify-out/` and `.agents/skills/` excluded by construction, binaries skipped, the spaced em dash the only scripted replacement). This ticket is file edits only: one hand-rewritten string, the scoped mechanical batch, two line-end fixes, seven pre-pinned fix-up rewrites, plus the standard records (a progress.md entry, a graphify update). The YAML workflows' structural integrity is guarded by a local parse probe (python3 + pyyaml, present at plan time) and definitively by CI's own workflow parse on push; the only run-block content in scope is ci.yml's eight single-quoted `::notice::` echo strings, whose quote balance a comma replacement cannot break.

**Tech Stack:** zero new dependencies; the existing `pnpm em-dash` alias (root package.json, #349); python3 + pyyaml for the belt-and-braces YAML parse probe (fallback: CI's parse on push); Playwright `--list` for config compile sanity; `gh` CLI for the PR.

**Spec:** [GitHub issue #353](https://github.com/jeius/sevendays/issues/353), authoritatively settled by its parent spec, [issue #348](https://github.com/jeius/sevendays/issues/348), repo copy `docs/specs/2026-11-22-pre-handover-polish-spec.md` (item 1: scope, method, exclusions, en-dash law, no-DB-pass ruling Q5; Testing Decisions: the em-dash gate script + copy-pinning suites updated in place). The repo copy is uncommitted on main at plan time; it lands with #351's spec sweep.

## Branch law

- Branch **`root-files-sweep`** off current `main` (`573f608` at plan time, 2026-11-23), checked out in the worktree `.worktrees/root-files-sweep`. All three tasks commit there; one PR to `main` titled `Handover polish: sweep the author-written root files (#353)` (Closes #353).
- The sibling sweeps are disjoint by file set: #350 owns `apps/**`, #351/#352 own `docs/**`; this ticket owns ONLY the seven root files plus the records. Any merge order works; a rebase onto main is trivial. #354 (the CI gate) lands **last**, after every sweep: until then the tool's unscoped check is *expected* to fail on the unswept trees, and this ticket's verdict is the **scoped** check (`pnpm em-dash check` with the seven paths).
- The tool's exclusions already fence vendored skills (`.agents/skills/`) and generated graph output (`graphify-out/`); the acceptance criterion "vendored skills and generated graph output untouched" holds by construction, and Task 3 verifies no file outside the seven (plus the records) changed.

## Controller pre-flight (live-run, record before Task 1)

- **Floors (must not move anywhere in this ticket; nothing touches a test file):** api 34 files / 482 passed + 3 skipped; types 18 files / 197 passed; api-client 5 files / 45; landing 19 files / 152; admin 34 files / 364; db 4 files / **30 passed + 0 skipped with `TEST_DATABASE_URL` set** (the with-var form every gate in this plan uses; ruling #349-R4). Live-run each and record; any drift means something merged: reconcile before starting.
- **Scoped check probe:** `pnpm em-dash check AGENTS.md PRODUCT.md CONTEXT-MAP.md .env.example playwright.config.ts .github/workflows/ci.yml .github/workflows/e2e.yml` exits 1 with `61 line(s) in 7 file(s)` (measured 2026-11-23 at `573f608`). Re-run and record.
- **Census (measured 2026-11-23):** 139 em-dash glyphs across those 61 lines: 137 in the spaced form (fix-mode class) + 2 line-end dashes (`.github/workflows/ci.yml:5`, `.github/workflows/e2e.yml:70`). Zero unspaced, zero decorative separators, zero double-space dashes in scope. Per file: AGENTS.md 25 lines / 97 spaced; PRODUCT.md 12 / 17; CONTEXT-MAP.md 2 / 3; .env.example 2 / 2; playwright.config.ts 3 / 3 (one of which is Task 1's string); ci.yml 13 (12 spaced + 1 line-end); e2e.yml 4 (3 spaced + 1 line-end). After Task 1 removes the string's dash, fix mode must report exactly **136 replacement(s)**; any other count means the tree drifted: reconcile.
- **En-dash inventory:** exactly **2** en dashes in scope, both numeric ranges, both must survive byte-identical: `AGENTS.md:47` (`migrations 0000–0014 applied`) and `PRODUCT.md:44` (`gallery 01–06`). The tool's self-test already proves it never rewrites an en dash; Task 2 pins the survival greps.
- **Command-line safety (probed 2026-11-23):** zero em dashes inside backtick spans in AGENTS.md (the command inventory is untouched by construction); the only run-block content in scope is ci.yml's eight `echo '::notice::…'` lines (single-quoted strings; the comma replacement preserves quote balance); .env.example's two dashes are comment-only.
- **Test DB:** the final full gate needs the standalone container up: `docker start sevendays-test-db-5433` (port 5432 belongs to another project; never fall back).

## Scope fences

**In scope:** the seven root files; `docs/progress.md` (one closing entry, written em-dash-free); `graphify-out/**` (regenerated by `graphify update .`; a code file changed: playwright.config.ts).

**NOT here (siblings / out of scope):**

- **#350 (the apps tree) and #351/#352 (the docs):** zero files under `apps/` or `docs/` change in this ticket. Explicit handoff: the historical plan doc `docs/superpowers/plans/2026-10-06-189-playwright-preflight.md` quotes the OLD error string verbatim (its lines 132 and 225); it is #352's sweep scope and stays untouched here. After #352's mechanical sweep, its quote will read the comma form while the live string is the colon form: an accepted historical-record divergence, named here so #352's diff skim is not surprised.
- **Every other root-level tracked file** (`skills-lock.json`, `pnpm-lock.yaml`, `.gitignore`, `.zcodeignore`, `biome.json`, `compose.yaml`, `package.json`, `turbo.json`, `vitest.config.ts`, `pnpm-workspace.yaml`): probed 2026-11-23, zero em dashes; nothing to sweep. `pnpm-lock.yaml` is generated and stays untouched.
- **AGENTS.md instructions-of-record:** ticket numbers, test floors, and command lines do not change. The digit- and backtick-multiset identity checks are the hard gate; any diff there stops the task.
- **No test file changes; floors frozen.** The playwright string pins no test (verified by grep at plan time: the only other hits are the historical #189 plan doc, #352's tree).
- **En dashes, git history, the live DB (Q5, no data pass), vendored skills, generated graph output** stay untouched, by construction and by the gates.
- **No ADR:** spec item 1 invents no architecture; this ticket is file edits only.
- **Visual baselines:** untouched (no spec file, no rendered copy, no baseline name changes); no re-baselining anywhere in this ticket.

## Global Constraints

- **The one hand-rewritten string (use exactly; do not paraphrase):** `playwright.config.ts` line 15 becomes `'E2E_BASE_URL is not set: point it at the deployment under test (e.g. the teaser landing URL). The suites walk deployed environments, not local dev servers, so there is no default.'`: the explanation-intro dash becomes a colon (the #349 failure-string law). This is a developer-facing string rewritten by hand before fix mode ever runs on the file; no owner ratification is needed (method-ruled fix-up class, not product copy).
- **Method law:** the string literal is hand-rewritten FIRST (Task 1) so fix mode never touches it; comments and the notice strings take fix mode's mechanical comma plus the fix-up pass. A spaced hyphen (` - `) is never a replacement. En dashes are never touched.
- **The fix-up law (spec #348 method, #349 precedent):** parentheticals become parentheses; list intros and explanation intros become colons; independent-clause comma splices become semicolons or colons; line-end dashes merge or split naturally. The executor upgrades a mechanical comma only where it reads wrong; the seven sites named in Task 2 Step 3 are pre-pinned and not discretionary.
- **Integrity gates are hard gates:** per-file digit-multiset and backtick-multiset identity vs HEAD for all seven files, the `::notice::` count (8), the YAML parse probe, the en-dash byte survival, and the scoped check exit 0. Any integrity diff: stop and reconcile; never hand-wave.
- **Biome covers only `playwright.config.ts` among the touched files** (root `biome.json` spans every non-gitignored path): `pnpm exec biome check playwright.config.ts` stays green after every task that touches it. `pnpm lint:root` is pre-existing red at main (the `useSortedClasses` nursery findings across `apps/admin` components, plus generated `graphify-out/`) and is NOT a gate (ruling #349-R3; turbo's `pnpm check` never runs root biome).
- **Do NOT run blanket `pnpm fix` in this ticket** (a deliberate deviation from #349's Task 4 Step 1, this plan's ruling): root biome's `check --write` would auto-fix the pre-existing FIXABLE `useSortedClasses` findings in `apps/admin`, producing out-of-scope churn in #350's tree. Format healing is scoped to the touched biome-covered file only (Task 3 Step 1).
- **Floors do not move.** Every suite's file/test count is identical before and after. A count that differs at any gate means something else drifted: stop and reconcile.
- **Commits** follow the repo's commit-work convention, each referencing #353. Prefixes: `chore(copy):` (Task 1), `chore(sweep):` (Task 2), `docs(progress):` + `chore(graphify):` (Task 3).
- **Run from the repo root** (the worktree root). The tool reads `git ls-files` from cwd.
- **The plan file itself** keeps its prose em-dash-free so #352's mechanical sweep never alters it; the only glyphs it carries are verbatim artifacts (Task 1's before-state bytes and the house commit-message literal), whose later comma-izing by #352 is accepted drift for a historical plan.

---

## Task 1: the hand-rewritten string

Product-adjacent and developer-facing strings are hand-rewritten FIRST so fix mode (Task 2) never touches them. Here there is exactly one: the E2E_BASE_URL curated failure message, a string literal (not a comment), which no test pins.

**Files:**
- Modify: `playwright.config.ts` (one string literal, line 15)

**Interfaces:**
- Consumes: nothing (first edit of the branch).
- Produces: the de-dashed curated failure message that Task 2's scoped check, the e2e probes, and the #354 CI gate all inherit; `e2e.yml`'s comment ("the config's curated message") stays accurate without quoting it.

- [ ] **Step 1: The string rewrite.** In `playwright.config.ts`, replace lines 14–16.

Before:
```ts
  throw new Error(
    'E2E_BASE_URL is not set, point it at the deployment under test (e.g. the teaser landing URL). The suites walk deployed environments, not local dev servers, so there is no default.'
  );
```

After:
```ts
  throw new Error(
    'E2E_BASE_URL is not set: point it at the deployment under test (e.g. the teaser landing URL). The suites walk deployed environments, not local dev servers, so there is no default.'
  );
```

(Only the string changes; the `throw new Error(` / `);` lines are context anchors. Lines 4 and 9 of the same file carry comment dashes that stay for Task 2's mechanical sweep.)

- [ ] **Step 2: No other quoting site exists.** Verify the blast radius closed:

```bash
grep -rn "E2E_BASE_URL is not set" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.yml" --include="*.md" . | grep -v node_modules | grep -v graphify-out
```

Expected: hits only in this file (now the new string) and in plan docs' verbatim quotes: the historical `docs/superpowers/plans/2026-10-06-189-playwright-preflight.md` (its quote of the old string; #352's tree, untouched here per the Scope fence) and this plan's own artifacts (the Global Constraint line, the Before/After blocks, the probe commands). (Ruling #353-R1, at execution: the original "exactly two hits" expectation forgot that this plan doc itself quotes the string seven times; the intent of the gate is unchanged.) Any hit outside those three files is a missed quoting site: fix it in this task before committing.

- [ ] **Step 3: The failure probe.** Prove the curated failure still fires with the new wording:

```bash
pnpm exec playwright test --list > /tmp/e2e-list-fail.log 2>&1; echo "exit=$?"
grep -c "E2E_BASE_URL is not set: point it at the deployment under test" /tmp/e2e-list-fail.log
rm /tmp/e2e-list-fail.log
```

Expected: `exit=1` (the config throw; probed at plan time: the pre-edit run prints `Error: E2E_BASE_URL is not set …` to stderr) and grep count `1` (the new message, verbatim).

- [ ] **Step 4: The load probe.** Prove the config still loads and the suites still collect:

```bash
E2E_BASE_URL=http://127.0.0.1:9 E2E_API_URL=http://127.0.0.1:9 E2E_SMOKE_STAFF_EMAIL=probe@example.com E2E_SMOKE_STAFF_PASSWORD=probe pnpm exec playwright test --list | tail -1
```

Expected: `Total: 23 tests in 2 files` (smoke + visual; probed at plan time). `--list` needs no browser.

- [ ] **Step 5: Biome (touched file).** `pnpm exec biome check playwright.config.ts` exits 0.

- [ ] **Step 6: Commit.** `git add playwright.config.ts && git commit -m "chore(copy): the E2E_BASE_URL error string hand-rewritten (#353)"` (`git status` must show nothing else).

---

## Task 2: the mechanical batch, the hand fixes, and the fix-up pass

Fix mode runs over the seven files; the hand classes it deliberately leaves (here exactly the two line-end dashes) get their hand fixes; the pre-pinned fix-up sites take their final forms; the integrity gates prove the instructions-of-record survived. Task 1's string is already clean, so fix mode never touches a string literal.

**Files:** `AGENTS.md`, `PRODUCT.md`, `CONTEXT-MAP.md`, `.env.example`, `playwright.config.ts`, `.github/workflows/ci.yml`, `.github/workflows/e2e.yml` (the census's seven; nothing else).

**Interfaces:**
- Consumes: Task 1's hand rewrite.
- Produces: `pnpm em-dash check` over the seven paths exits 0: this ticket's acceptance verdict, and one of the seven scoped-green verdicts #354's repo-wide gate waits on.

- [ ] **Step 1: Run the batch.** From the repo root:

```bash
pnpm em-dash fix AGENTS.md PRODUCT.md CONTEXT-MAP.md .env.example playwright.config.ts .github/workflows/ci.yml .github/workflows/e2e.yml
```

Expected: per-file `fixed N:` lines summing to `FIX: 136 replacement(s) across 7 file(s)` (per file: AGENTS.md 97, PRODUCT.md 17, CONTEXT-MAP.md 3, .env.example 2, playwright.config.ts 2, ci.yml 12, e2e.yml 3), then the leftover list (exactly 2 lines: `ci.yml:5`, `e2e.yml:70`, both the line-end class) and **exit 1** (leftovers need hands; that is the contract, not a failure). Reconcile the arithmetic against the census: 136 replacements + 1 string dash hand-removed in Task 1 + 2 hand-class glyphs = the census's 139. A gap means the tree drifted: stop and reconcile.

- [ ] **Step 2: The two line-end hand fixes.** Fix mode cannot see a line-end dash; both are comment lines whose dash is a line-wrap artifact of one sentence.

In `.github/workflows/ci.yml` line 5: delete the trailing space + em dash so the line ends `...The second lock`. Line 6 (already mechanically fixed in Step 1) reads `# the branch-keyed continuous deploy, lives in the deploy jobs below.`: the wrapped sentence becomes the comma-apposition `The second lock, the branch-keyed continuous deploy, lives in the deploy jobs below.` Verify:

```bash
grep -n "The second lock$" .github/workflows/ci.yml
```

Expected: exactly 1 hit (line 5, no trailing dash).

In `.github/workflows/e2e.yml` line 70: replace the trailing space + em dash with `: ` so the line ends `...the config's curated message:`. Line 71 (`# the visible, named fix is the environment variable.`) is unchanged: the dash introduced an explanation, so the fix-up law gives it a colon. Verify:

```bash
grep -n "curated message:$" .github/workflows/e2e.yml
```

Expected: exactly 1 hit (line 70, colon-ended).

- [ ] **Step 3: The seven pre-pinned fix-up sites.** Each Before block is the state Step 1's mechanical comma left; each After is the final form (parentheticals become parentheses; list and explanation intros become colons). Apply exactly; these are not discretionary.

In `PRODUCT.md`:

Site 1, line 1 (a title does not take an apposition comma):

Before:
```md
# Product, Sevendays (studio-wide record)
```
After:
```md
# Product: Sevendays (studio-wide record)
```

Site 2, line 27 (the double-apposition collapses into a comma pile-up; the law's parentheses form):

Before:
```md
Owner-ruled twin claim (2026-09-30), both halves load-bearing: **neighborhood trust**, a long-established local studio people already know, 3 branches, walk-ins welcome, and **craft quality**, the photography itself is the proof, not a claim. Neither half alone is the position.
```
After:
```md
Owner-ruled twin claim (2026-09-30), both halves load-bearing: **neighborhood trust** (a long-established local studio people already know, 3 branches, walk-ins welcome) and **craft quality** (the photography itself is the proof, not a claim). Neither half alone is the position.
```

Site 3, line 32, the sentence inside the pricing bullet (the dash introduced the evidence clause, so its comma becomes a colon; the trailing summary comma stays):

Before:
```md
Market is the Philippines, *inferred from peso pricing, tarpaulin & bulletin printing as studio services, and graduation-first demand, and evidenced by the branch roster*: Calamba (Misamis Occidental), Iligan (Lanao del Norte), and Dipolog (Zamboanga del Norte), a Mindanao-side footprint.
```
After:
```md
Market is the Philippines: *inferred from peso pricing, tarpaulin & bulletin printing as studio services, and graduation-first demand, and evidenced by the branch roster*: Calamba (Misamis Occidental), Iligan (Lanao del Norte), and Dipolog (Zamboanga del Norte), a Mindanao-side footprint.
```

Site 4, line 37 (the dash joined two independent clauses):

Before:
```md
**Identity is the owner's logo palette, rebranding is ruled out.**
```
After:
```md
**Identity is the owner's logo palette: rebranding is ruled out.**
```

Site 5, line 45 (the dash introduced the explanation):

Before:
```md
**No confirmed-real testimonials yet, the home slot renders stand-in copy and the CMS testimonials table was born empty.**
```
After:
```md
**No confirmed-real testimonials yet: the home slot renders stand-in copy and the CMS testimonials table was born empty.**
```

In `CONTEXT-MAP.md`:

Site 6, line 3 (the double-dash parenthetical insert becomes parentheses; the comma before `and the other contexts` is the list separator and stays):

Before:
```md
Sevendays is one product domain surfaced through three deployable apps. The core vocabulary (Appointment, Branch, Service Package, Slot, …) lives in `apps/api/CONTEXT.md`, the shared data model in `packages/db`/`packages/types` is owned there, and the other contexts reference it rather than restate it.
```
After:
```md
Sevendays is one product domain surfaced through three deployable apps. The core vocabulary (Appointment, Branch, Service Package, Slot, …) lives in `apps/api/CONTEXT.md` (the shared data model in `packages/db`/`packages/types` is owned there), and the other contexts reference it rather than restate it.
```

Site 7, line 7 (the dash introduced the enumeration, so the list-intro law gives it a colon):

Before:
```md
- [API](./apps/api/CONTEXT.md): owns the shared data model and every read/write to it, appointments, availability, catalog
```
After:
```md
- [API](./apps/api/CONTEXT.md): owns the shared data model and every read/write to it: appointments, availability, catalog
```

- [ ] **Step 4: The comma-splice skim.** Read the full diff end to end with context:

```bash
git diff -- AGENTS.md PRODUCT.md CONTEXT-MAP.md .env.example playwright.config.ts .github/workflows/ci.yml .github/workflows/e2e.yml
```

AGENTS.md's 97 mechanical commas follow the gloss pattern (a bullet item or clause, then the dash, then its gloss or ticket reference), pre-verified at plan time to read naturally as commas. Upgrade a mechanical comma only where it reads wrong, per the fix-up law (parentheses / colon / semicolon per spot); leave everything else mechanical. Digits, ticket references, backtick spans, and floor text never move (the next step's gates catch any violation).

- [ ] **Step 5: Artifact grep + the integrity gates.** In order:

```bash
git grep -n ' , ' -- AGENTS.md PRODUCT.md CONTEXT-MAP.md .env.example playwright.config.ts .github/workflows/ci.yml .github/workflows/e2e.yml
```
Expected: empty (the double-space-dash artifact class; zero existed in the census, so fix mode cannot produce one; the grep is the guard).

The digit + backtick identity loop (HEAD at this point is Task 1's commit, whose diff carries no digits or backticks, so HEAD is the correct baseline for all seven files):

```bash
for f in AGENTS.md PRODUCT.md CONTEXT-MAP.md .env.example playwright.config.ts .github/workflows/ci.yml .github/workflows/e2e.yml; do
  diff <(git show HEAD:"$f" | grep -oE '[0-9]+' | sort | uniq -c) <(grep -oE '[0-9]+' "$f" | sort | uniq -c) > /dev/null && echo "DIGITS OK: $f" || echo "DIGIT DRIFT: $f"
  diff <(git show HEAD:"$f" | grep -oE '`[^`]+`' | sort | uniq -c) <(grep -oE '`[^`]+`' "$f" | sort | uniq -c) > /dev/null && echo "BACKTICKS OK: $f" || echo "BACKTICK DRIFT: $f"
done
```

Expected: 14 `OK` lines, zero `DRIFT` lines. (The check form was dry-run green against untouched AGENTS.md at plan time: `DIGITS-IDENTICAL` / `BACKTICKS-IDENTICAL`.) A DRIFT line: stop, inspect, reconcile: this is the "ticket numbers, test floors, and command lines unchanged" acceptance criterion made mechanical.

The notice-string count and the YAML parse:

```bash
grep -c '::notice::' .github/workflows/ci.yml
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); yaml.safe_load(open('.github/workflows/e2e.yml')); print('YAML PARSE OK')"
```

Expected: `8` and `YAML PARSE OK` (both probed green at plan time). If a future environment lacks pyyaml, the fallback verdict is CI's own workflow parse on push.

The en-dash survival (both numeric ranges, byte-level):

```bash
grep -c '0000–0014' AGENTS.md
grep -c '01–06' PRODUCT.md
```

Expected: `1` and `1`.

Biome on the one biome-covered touched file (fix mode shortened its comment lines):

```bash
pnpm exec biome check playwright.config.ts
```

Expected: exit 0.

- [ ] **Step 6: The scoped check is green.** This is the ticket's acceptance verdict:

```bash
pnpm em-dash check AGENTS.md PRODUCT.md CONTEXT-MAP.md .env.example playwright.config.ts .github/workflows/ci.yml .github/workflows/e2e.yml
```

Expected: `EM DASH: clean, 0 hits (AGENTS.md, PRODUCT.md, CONTEXT-MAP.md, .env.example, playwright.config.ts, .github/workflows/ci.yml, .github/workflows/e2e.yml)`, exit 0.

- [ ] **Step 7: The e2e probes still hold.** The sweep touched the config's comments; re-prove both behaviors:

```bash
pnpm exec playwright test --list > /tmp/e2e-list-fail.log 2>&1; echo "exit=$?"
grep -c "E2E_BASE_URL is not set: point it at the deployment under test" /tmp/e2e-list-fail.log
rm /tmp/e2e-list-fail.log
E2E_BASE_URL=http://127.0.0.1:9 E2E_API_URL=http://127.0.0.1:9 E2E_SMOKE_STAFF_EMAIL=probe@example.com E2E_SMOKE_STAFF_PASSWORD=probe pnpm exec playwright test --list | tail -1
```

Expected: `exit=1`, grep count `1`, and `Total: 23 tests in 2 files`.

- [ ] **Step 8: Commit.** `git add AGENTS.md PRODUCT.md CONTEXT-MAP.md .env.example playwright.config.ts .github/workflows/ci.yml .github/workflows/e2e.yml && git commit -m "chore(sweep): the author-written root files em-dash-free (#353)"` (`git status` first: only the seven files, no app/doc strays).

---

## Task 3: the full gate + the records + the PR

**Files:**
- Modify: `docs/progress.md` (one entry, written em-dash-free)
- Generated: `graphify-out/**` (via `graphify update .`)

- [ ] **Step 1: Scoped format healing.** If Task 2's mechanical commas left any biome format drift on the one biome-covered touched file, heal it scoped, never repo-wide (the no-blanket-`pnpm fix` ruling in Global Constraints):

```bash
pnpm exec biome check --write playwright.config.ts
pnpm exec biome check playwright.config.ts
```

Expected: both exit 0. If the write changed the file (`git status --porcelain playwright.config.ts` non-empty), fold it into the sweep commit: `git add playwright.config.ts && git commit --amend --no-edit`.

- [ ] **Step 2: The full gate.** With the test container up (and, on a fresh clone, `pnpm build:packages` plus `pnpm --filter @sevendays/api build` first):

```bash
docker start sevendays-test-db-5433 2>/dev/null || true
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
```

Expected: green across lint + format + typecheck + test for every workspace member, with every floor **identical** to the pre-flight record: api 34 files / 482 passed + 3 skipped; types 18 files / 197; api-client 5 files / 45; landing 19 files / 152; admin 34 files / 364; db 4 files / 30 passed + 0 skipped (with-var form; ruling #349-R4). Any count drift: stop and reconcile (nothing in this plan adds or removes a test).

- [ ] **Step 3: The progress.md entry.** Append at the end of `docs/progress.md` (matching the house entry format; the text is deliberately em-dash-free so it survives every later sweep untouched):

```md
## 2026-11-23 #353: the author-written root files de-dashed

Handover polish item 1 (spec #348) root-files leg: the seven author-written root files (AGENTS.md, PRODUCT.md, CONTEXT-MAP.md, .env.example, playwright.config.ts, .github/workflows/ci.yml, .github/workflows/e2e.yml) are em-dash-free (61 dash lines at the 2026-11-23 census: 136 mechanical comma replacements, 2 line-end hand fixes, 7 pre-pinned fix-up sites, 1 hand-rewritten string). The E2E_BASE_URL curated failure message is hand-rewritten (explanation dash to a colon) and pins no test; the historical #189 plan doc's verbatim quote of the old string stays for #352's sweep. Ticket numbers, test floors, and command lines are byte-preserved, proven by per-file digit- and backtick-multiset identity checks against HEAD; en dashes preserved (the 0000–0014 migration range and the 01–06 gallery range). Floors unchanged across all six suites. The apps sweep is #350, the docs sweeps are #351/#352, and the CI gate wiring is #354, which lands last.
```

Commit: `git add docs/progress.md && git commit -m "docs(progress): the #353 root-files sweep line"`.

- [ ] **Step 4: Graphify.** `graphify update .` (AST-only, no API cost; playwright.config.ts is a code file the graph indexes). Commit: `git add graphify-out && git commit -m "chore(graphify): graph update for #353"`.

- [ ] **Step 5: The changed-file set is exactly the scope.** The acceptance criterion "vendored skills and generated graph output untouched" plus the sibling fences, made mechanical:

```bash
git diff --name-only main...HEAD | grep -vE '^(docs/progress.md|docs/superpowers/plans/|graphify-out/)'
```

Expected: exactly the seven swept files, each once. Any other path: stop and reconcile before the PR.

- [ ] **Step 6: Push + PR.**

```bash
git push -u origin root-files-sweep
gh pr create --title "Handover polish: sweep the author-written root files (#353)" \
  --body-file <(cat <<'EOF'
Closes #353. Spec #348 item 1, the root-files leg.

- The seven author-written root files (AGENTS.md, PRODUCT.md, CONTEXT-MAP.md, .env.example, playwright.config.ts, .github/workflows/ci.yml, .github/workflows/e2e.yml) are em-dash-free: the scoped `pnpm em-dash check` over those paths is green (61 dash lines swept at the 2026-11-23 census: 136 mechanical comma replacements, 2 line-end hand fixes, 7 pre-pinned fix-up sites).
- The one string literal (the E2E_BASE_URL curated failure message) was hand-rewritten first, explanation dash to a colon; it pins no test (verified). Vendored skills and generated graph output untouched (the tool's exclusions by construction; the changed-file set verified in-task).
- Ticket numbers, test floors, and command lines byte-preserved: per-file digit- and backtick-multiset identity vs HEAD, the ::notice:: count (8), a YAML parse probe, and the en-dash byte survival (0000–0014, 01–06).
- Handoff note for #352: docs/superpowers/plans/2026-10-06-189-playwright-preflight.md quotes the old string verbatim; after #352's mechanical sweep its quote will read the comma form while the live string is the colon form (accepted historical-record divergence).

Floors unchanged: api 34 files / 482+3sk, types 18 / 197, api-client 5 / 45, landing 19 / 152, admin 34 / 364, db 4 / 30 (with-var). En dashes preserved. Live DB rows untouched (Q5). After merge: the standard v1 picks (the handover artifact is v1); this sweep's pick may conflict per the spec's Process note and follows the picks runbook.
EOF
)
```

#353 closes on merge per the house pattern, with the acceptance criteria ticked (`- [✅]`) in the issue at close. The plan doc (`docs/superpowers/plans/2026-11-23-353-root-files-sweep.md`) rides the branch's first commit (`docs(plan): the #353 SDD plan, the author-written root files sweep`), committed by the controller before execution starts.

---

## Self-review record (written after the final append, 2026-11-23)

- Placeholder sweep: no `<!-- APPEND:` anchors remain; no TODO/placeholder markers; every before/after block is byte-exact from the recon probes of 2026-11-23 (fix-up Before blocks quote the post-fix-mode comma forms, the states the executor actually edits; Task 1's Before block quotes the original bytes, em dash included, as #349's plan did). The prose-dash discipline was enforced after the final append: 25 prose dashes rewritten at source (colons, semicolons, parentheses per the fix-up law), leaving exactly 2 verbatim artifacts (Task 1's before-state bytes and the house commit-message literal), verified by grep.
- Step-checkbox count: Task 1 has 6, Task 2 has 8, Task 3 has 6 (20 total, all `- [ ] **Step`).
- Cross-task names: the seven file paths, the census numbers (61 lines / 139 glyphs / 137 spaced / 136 replacements), the hand-rewritten string, the probe commands, and the seven fix-up sites are spelled identically everywhere they appear; Task 2's expected `fixed N:` per-file counts (97/17/3/2/2/12/3) sum to the pinned 136, and 136 + 1 (Task 1's string dash) + 2 (line-end) = 139 (the census).
- Counts re-derived from the probes, not from memory: 61 lines / 7 files (the tool's scoped check, run at plan time), 137 spaced + 2 line-end (the classification probe), 2 en dashes (the per-file grep), 8 notice lines (grep -c), 23 tests in 2 files (the with-vars `--list` probe), 7 fix-up sites (PRODUCT.md 5 + CONTEXT-MAP.md 2), 6 suites' floors (the #349 merged-state record).
- Boundary check: the integrity loop's HEAD baseline is correct at its point of execution (Task 1's commit precedes Task 2 and its diff carries no digits or backticks, verified against the probed string content); the ` , ` artifact grep is the only artifact class fix mode can introduce here (zero double-space dashes in the census), and the line-end dash class is covered by the scoped check rather than a redundant grep.
- The pre-existing-red `pnpm lint:root` and the no-blanket-`pnpm fix` ruling are disclosed in Global Constraints, and the #189-plan-doc quote divergence is disclosed in both the Scope fences and the PR body rather than silently assumed.

