# #310, the deployed-teaser cold-isolate hydration census, plan

**Goal:** Answer #310's open question with evidence: does the cold-load hydration mismatch reproduce on the deployed teaser admin (`https://sevendays-admin.pahamajulius.workers.dev`), and with what signature? The committed probe (`scripts/probe-cold-hydration.mjs`) runs the census, two idle-spaced passes, the eight parameterless CMS routes each, race-class vs DOM-nesting messages counted separately. If race-class messages appear, the preserved #307 fix executes under this ticket (**client-only priming**, the preserved lever ruling carries, per #307's issuecomment-6893467148), with the AFTER arm against the **deployed teaser post-deploy** (not local, #310's whole point). If zero after the honest two-pass attempt, the miss is recorded and the owner rules close-vs-keep-open. **No fix code on an unreproduced before-state**, the #307 stop rule, carried.

**Spec:** #310's issue body (the carry record) + the agent brief (jeius/sevendays#310 issuecomment-6902276725, the contract, this plan its execution) + the preserved plan `docs/superpowers/plans/2026-11-15-307-cold-load-hydration-mismatch.md` (commit `5a6e048`, the mechanism trace, the four spike arms, the lever pick with the rejected alternatives + the pinned SSR-awaited re-rule recipe; **its Tasks 3–5 are this plan's Phase B, executed verbatim with the deltas pinned below**) + the lever ruling on #307 (issuecomment-6893467148). The owner's two unanswered triage questions resolved to the safe defaults: **auth = headed interactive** (no credentials ever shared; a clean timeout if the owner is away), **merge gated on the owner's lever re-ratification** (the preserved plan's veto-window law) even though Phase B code may proceed once reproduced.

**Architecture:** Phase A (Tasks 1–3) is verification-only, zero code files change, the notes live under gitignored `.superpowers/sdd/2026-11-16-310-teaser-cold-isolate-census/notes.md`, the evidence lands in #310 comments. Phase B (Tasks 4–8, only on reproduction) is the preserved plan's architecture byte-for-byte: the new seam sibling `primeCmsQueriesForClient` guards the unchanged fire-and-forget `primeCmsQueries` on `typeof window === 'undefined'` (the server SSR pass never primes); the nine CMS route loaders swap to it (import + call-site + comment, one edit each); the screens' server-side `useQuery` keeps the **pre-#288 streaming posture** (a render-time fetch hydrates as a PENDING entry, skeleton-vs-skeleton, and its dehydrated promise streams the data in after first render). ADR-0028 records the ruling. Touched files (Phase B only): `apps/admin/src/lib/cms-queries.ts`, `apps/admin/src/lib/cms-queries.test.ts` (2 new tests), the nine route files (`_shell.branches.tsx`, `_shell.packages.index.tsx`, `_shell.packages.$packageId.edit.tsx`, `_shell.packages.new.tsx`, `_shell.studio-services.tsx`, `_shell.add-ons.tsx`, `_shell.lookups.tsx`, `_shell.gallery.tsx`, `_shell.testimonials.tsx`), `docs/adr/0028-admin-ssr-priming-posture.md` (new), `docs/progress.md`, `AGENTS.md` (the admin floor line), this plan file. No `router.tsx`, no `_shell.tsx`, no api/api-client/types/db/ui files, no component files.

**Not UI-bearing (spec #94 amendment):** every path of this plan changes zero pixels, Phase A is a console census; Phase B changes only which pass starts a fetch (the Cold skeleton `isPending` vocabulary is confirmed, not rebuilt). No UI/UX skill set is named and no variants are rendered. No new composition for the owner to react to.

**Scope fence (sibling tickets):** #309 is CLOSED and deployed (its DOM-nesting signature is expected **0** on the teaser now, the census records it separately and never gates on it; a nesting reappearance is a #309 regression and stops the arm). #307 is CLOSED (its plan + lever ruling are Phase B's record, reuse, don't modify). No Sentry-plumbing work anywhere (reproduced mismatches will land in Sentry's sevendays `sevendays` project during the census, expected census noise, noted to the owner, never chased here). Analytics/Audit/Users routes and the shell's awaited site-settings prime carry no fire-and-forget priming and cannot race, untouched.

## Global Constraints

- Branch `fix/310-teaser-cold-isolate-census` off current `main` (at `7c91d6d` or later). The plan file rides the branch's first commit. Per-task commits with the subjects pinned per task, each ending `(#310)`. The working tree's pre-existing `M apps/admin/CONTEXT.md` (#300's glossary dirt) is **never staged or committed**, every `git add` in this plan is explicit-path.
- **The census is read-only + one login per pass**: GETs through the real sign-in form; the probe never writes a byte to any environment. Credentials never enter a file, a commit, or a script default; the pinned auth mode (`PROBE_HEADED=1`) uses **no credentials at all**, the owner signs in the visible Chromium (WSLg, `DISPLAY=:0` verified 2026-11-16) within `PROBE_LOGIN_TIMEOUT_MS` (default headed 180000). If the login times out, the probe exits non-zero → **stop and wait for the owner**, never fall back to headless `ADMIN_EMAIL`/`ADMIN_PASSWORD` without an explicit owner answer (the wait-for-owner-answers rule).
- **The probe is byte-identical reuse** (committed tooling at `5a6e048`, outside every suite per ADR-0022, never `pnpm check`, never `test:e2e`). A census defect is a stop-and-rule, never a silent script edit. Chromium is cached (`chromium-1243` + headless shell, verified 2026-11-16); `@playwright/test` 1.63.0 resolves from the repo root.
- **Two-pass census rule:** pass 1 (8 walks); if zero race-class → idle gap **≥ 10 minutes** → pass 2 (fresh login, 8 walks). If pass 2 is also zero → the honest-miss comment + **owner ruling** (close vs keep-open vs a third pass at another hour), never Phase B. The notes record per pass: the date/time, the teaser's last-deploy context, and the standing caveat: **isolate temperature is not externally observable**; the walk sequence deliberately mixes regimes (walk 1 may pay the Supavisor connect tax on a fresh isolate; walks 2–8 ride the pooled connection, either regime may be the mismatch window, and the census records counts, not regime claims).
- **On reproduction:** the census evidence comment on #310 carries the BEFORE arm + the lever re-ratification ask; the veto window opens; **Phase B code tasks may proceed while the window is open, but the PR does not merge until the owner has had the chance to rule** (the preserved plan's veto law). If the owner re-rules to SSR-awaited priming, the preserved plan's Global Constraints re-rule recipe governs the re-shape (Tasks 3/4's code blocks swap; this plan's Task 4 steps 1–2 swap with them).
- **Phase B gates (floors live-verified 2026-11-16 @ `7c91d6d`, the admin suite re-run: 30 files / 310 tests):** `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green **35/35** with **admin 30 files / 312** (the live 310 + exactly the 2 seam tests of the preserved plan's Task 3), **api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped**, **types 18 files / 188**, **db 4 files (2 + 2 skipped) / 22 passed + 8 skipped**, **api-client 5 files / 45**, **landing 17 files / 134**. A different moved count means the enumeration drifted: stop and reconcile against the test blocks, never by padding. (Fresh clone: `pnpm build:packages` then `pnpm --filter @sevendays/api build` first. The v1-side gate runs on **:5434**, the standalone container `docker start sevendays-test-db-5434`, never the compose db service, which squats 5432.)
- **Deploy through CI only.** The push to `main` fires the `Deploy teaser (main)` run, the `Deploy admin (sevendays-admin)` leg is the one the AFTER arm rides; the `Deploy api (sevendays-api)` leg must also go green (unchanged code). Verify the run's `headSha` equals the merge commit SHA before trusting any verdict. **Never run any local bare `wrangler deploy`** (the #263/#264 lesson, it wipes the CI-passed `--var`s; the only restore is `gh run rerun <merge-run-id>`).
- **Phase B executes the preserved plan's Tasks 3–5 code blocks verbatim** (at `5a6e048`), with exactly these deltas, nothing else may drift: (1) the branch name and the commit subjects end `(#310)`; (2) ADR-0028's Status line and one added Context sentence are replaced/augmented per the full texts pinned in Task 4 Step 3; (3) the progress bullet and the two AGENTS.md edits use the full texts pinned in Task 4 Step 3; (4) the seam's code comment and the test describe title **keep their `#307` wording byte-identically** (the law is #307's discovery; #310 lands it). The nine route-loader old-strings are expected byte-exact (#306 touched `__root.tsx`, #309 touched `components/testimonials/testimonials-screen.tsx`, neither touched a route loader; the nine `primeCmsQueries(` call sites grep-verified 2026-11-16); an anchor mismatch means drift, stop and reconcile, never re-anchor by eye.
- **The AFTER arm runs against the DEPLOYED teaser** (byte-identical probe, `PROBE_BASE_URL=https://sevendays-admin.pahamajulius.workers.dev`, after the deploy run greens). Expected: race-class total **0** across all 8 routes; the nesting class recorded separately (expected 0 post-#309); every screen still renders its rows through the streamed-promise path, a blank screen is a bug, not a pass.
- ADR-0028 is the next free number (`docs/adr/` ends at `0027-api-public-read-edge-cache`→`0027-session-verify-amortization` tail verified 2026-11-16). `docs/plan.md` has no #310 box (post-M8 standalone ticket), untouched.
- **HITL:** the post-merge owner walk (Task 7) is the operational evidence, if the owner is unavailable after Task 6, post nothing further, leave #310 open naming the pending walk, and stop, never self-serve the close (the preserved plan's HITL rule, carried).

### Not here

- **No fix code on a zero census**, the two-pass miss goes to the owner for a ruling; the plan terminates there on that branch.
- **No probe-script modification**, byte-identical reuse; a census defect stops the cycle for a ruling.
- **No lever change without an explicit owner re-rule**, the SSR-awaited recipe is pinned in the preserved plan; always-await and dehydrate-filter-only stay rejected.
- **No #309 work**, its nesting class is counted, recorded, and never chased; a reappearance stops the arm as a #309 regression.
- **No Sentry work**, census-time Sentry noise is the mismatch artifact, not a plumbing bug.
- **Phase B inherits the preserved plan's "Not here" list wholesale**: no `router.tsx`/`dehydrateOptions` edits (the integration's `() => true` default is load-bearing), no `_shell.tsx` edits (the awaited settings prime settles by construction), no api/api-client/types/db/AppType changes, no component edits, no Analytics/Audit/Users work, no component/DOM tests (the house rule, the two new tests are seam pins), no ADR-0025 amendment, no visual baselines or `e2e/` edits.

---

### Task 1: branch + plan commit

**Files:**
- Commit: this plan file (the branch's first commit)

- [ ] **Step 1: branch off main (explicit-path adds only, the #300 CONTEXT.md dirt never stages)**

  ```bash
  git checkout main && git pull --ff-only
  git checkout -b fix/310-teaser-cold-isolate-census
  git add docs/superpowers/plans/2026-11-16-310-teaser-cold-isolate-census.md
  git commit -m "docs: the #310 teaser cold-isolate census plan (#310)"
  ```

- [ ] **Step 2: nothing else in this task**, Task 2 posts the ruling; the census waits for the owner's presence (the headed login needs them at the keyboard).

### Task 2: the census ruling comment on #310

**Files:**
- Commit: none

**Interfaces:**
- Produces: the ruling comment on #310, the census mode, the two-pass rule, both decision paths, and the veto law on the record before any probe fires.

- [ ] **Step 1: post the comment verbatim** (write to a temp file, `gh issue comment 310 --body-file <file>`, delete the file after; the disclaimer header is part of the comment):

  ```markdown
  > *This was generated by AI during triage.*

  ## Census ruling (per the plan: docs/superpowers/plans/2026-11-16-310-teaser-cold-isolate-census.md)

  **What runs:** the committed cold-load probe (`scripts/probe-cold-hydration.mjs`, byte-identical since #307) walks the eight parameterless CMS routes on the deployed teaser admin as fresh document loads, counting **race-class** hydration messages (`Hydration failed…` / `A tree hydrated but…`) per route. The DOM-nesting class (`<div> cannot be a child of <tbody>`) is counted separately, #309's signature, fixed and deployed; it never counts toward the race verdict.

  **Auth:** headed interactive, a visible Chromium opens the teaser's `/login`; the owner signs in once within 180 s; the walk continues unattended. No credentials are shared, stored, or committed. If the login window times out (owner away), the pass aborts cleanly and waits.

  **The two-pass rule:** pass 1 now; a zero total → one idle gap (≥ 10 min) → pass 2. Both passes' per-route JSON + quoted texts land in the cycle notes and then in this ticket's evidence comments.

  **If race-class messages appear (reproduced):** this census is the fix's BEFORE arm. The fix executes under the preserved #307 plan, **client-only priming** (ADR-0028; the lever ruling + rejected alternatives live at #307 issuecomment-6893467148). The veto window opens with the evidence comment: **the PR will not merge until the owner has had the chance to rule** on the lever (a silence ruling may be given anytime; re-ruling to SSR-awaited priming re-shapes per the preserved recipe). The AFTER arm runs this same probe against the deployed teaser post-deploy, zero race-class expected, rows still rendering.

  **If zero after both passes:** the honest miss is posted with its environment caveat (isolate temperature is not externally observable; two idle-spaced passes, 16 walks) and the owner rules: close, keep open, or a third pass at another hour. No fix code lands on an unreproduced before-state.

  **Sentry note:** any reproduced mismatch lands in Sentry's `sevendays` project (the teaser's errors-only capture) during the census window, expected census noise, not new plumbing; it never gates anything here.
  ```

- [ ] **Step 2: nothing else**, the veto law and both paths are on the record; Task 3 fires only when the owner confirms presence.

### Task 3: the BEFORE census (two passes) + the decision gate

**Files:**
- Create (uncommitted, `.superpowers/` is gitignored, verified 2026-11-16): `.superpowers/sdd/2026-11-16-310-teaser-cold-isolate-census/notes.md`
- Test: none (the run is its verification; exit codes + the JSON verdict)

**Interfaces:**
- Consumes: the deployed teaser admin (`https://sevendays-admin.pahamajulius.workers.dev`, `/login` answered 200, verified 2026-11-16), the owner's presence for each headed login.
- Produces: the census record (per-route JSON + quoted texts + pass context) in the notes file, the BEFORE arm for Phase B's evidence comment, or the honest-miss record.

- [ ] **Step 1: create the notes file + record the pass-1 context**

  ```bash
  mkdir -p .superpowers/sdd/2026-11-16-310-teaser-cold-isolate-census
  ```
  In `notes.md`, record: today's date/time, the teaser's last-deploy context (`gh run list --workflow ci.yml --limit 5`, the last `Deploy teaser (main)` success), and the standing isolate-temperature caveat from Global Constraints.

- [ ] **Step 2: announce + run pass 1**

  Announce in chat: "Firing census pass 1, a Chromium window will open on your desktop; sign in to the teaser admin within 180 s." Then:

  ```bash
  PROBE_BASE_URL=https://sevendays-admin.pahamajulius.workers.dev PROBE_HEADED=1 \
    node scripts/probe-cold-hydration.mjs
  ```

  Append the full per-route JSON + the printed `[race]`/`[nesting]` lines to `notes.md` under a `## pass 1` heading. A login timeout (exit non-zero, no `[data-shell-main]`) = the owner is away: stop, report, wait, this is the wait-for-owner-answers block, not a failure to retry around.

- [ ] **Step 3: the decision gate**

  - **`total ≥ 1` race-class → REPRODUCED.** Post the census evidence comment on #310 (the BEFORE arm): the full per-route JSON, the quoted race-class texts, the pass context, the nesting-class counts recorded separately, and the lever re-ratification ask pinned verbatim:

    ```markdown
    > *This was generated by AI during triage.*

    ## Census BEFORE arm, reproduced

    <pass context + full per-route JSON + quoted texts>

    The race reproduces on the deployed teaser, #310's environment window is proven. The fix proceeds under the preserved #307 plan: **client-only priming** (the lever ruling + rejected alternatives at #307 issuecomment-6893467148; ADR-0028 lands it). **Veto window open, the PR will not merge until you have had the chance to rule.** Options: ratify client-only priming, re-rule to SSR-awaited priming (the pinned re-shape recipe), or stop the cycle.

    (DOM-nesting class recorded separately: <counts>, the fixed #309 signature; it never counts toward this verdict.)
    ```

    Then proceed to Task 4 (Phase B). Phase B code proceeds while the veto window is open; Task 5's merge step is the gate.
  - **`total = 0` → idle ≥ 10 minutes, then pass 2** (same command, fresh login, announce again). Append under `## pass 2`.
  - **Pass 2 `total = 0` → the honest miss.** Post the miss comment pinned verbatim, then **stop and wait for the owner's ruling** (close vs keep-open vs a third pass at another hour). No Phase B, no graphify, no v1 pick, the plan terminates here on this branch.

    ```markdown
    > *This was generated by AI during triage.*

    ## Census result, zero race-class after the honest two-pass attempt

    <both passes' per-route JSON + pass contexts>

    16 cold-document walks across the eight CMS routes, two idle-spaced passes against the deployed teaser: **zero race-class hydration messages**. (DOM-nesting class: <counts>, the fixed #309 signature, recorded separately.) Standing caveat: isolate temperature is not externally observable, the walks mix regimes (the first walk may pay the connect tax; the rest ride the pooled connection), and neither regime reproduced the #294 census's 4/4.

    No fix code lands on an unreproduced before-state (#307's stop rule). Owner ruling requested: **close #310**, keep it open for a third pass at another hour, or hand-walk a fresh incognito window with devtools open (cold-load 2–3 CMS routes) and paste anything console shows.
    ```

- [ ] **Step 4: nothing else in Phase A**, the notes file never commits (gitignored); every artifact that matters is in a #310 comment.

---

### Task 4: Phase B, the seam, the nine loaders, the docs (the preserved plan's Tasks 3–5, the pinned deltas)

**Files (all three steps):**
- Modify: `apps/admin/src/lib/cms-queries.ts`, `apps/admin/src/lib/cms-queries.test.ts`, the nine route files, `docs/adr/0028-admin-ssr-priming-posture.md` (new), `docs/progress.md`, `AGENTS.md`

**Interfaces:**
- Consumes: the preserved plan's Tasks 3–5 blocks at `5a6e048` (byte-verbatim execution).
- Produces: `primeCmsQueriesForClient(primes: ReadonlyArray<() => Promise<unknown>>): void`; zero route-level `primeCmsQueries(` call sites; admin floor 30/310 → **30/312**; ADR-0028.

- [ ] **Step 1: the seam (TDD), execute the preserved plan's Task 3 block byte-verbatim** (the two tests incl. the `describe('primeCmsQueriesForClient, the server pass never primes (#307)', …)` title, the import insertion, the implementation + the `// The #307 law…` comment block, the red→green verification commands, the admin-floor check). Commit:

  ```bash
  git add apps/admin/src/lib/cms-queries.ts apps/admin/src/lib/cms-queries.test.ts
  git commit -m "feat(admin): the client-only priming seam (#310)"
  ```

- [ ] **Step 2: the nine loaders, execute the preserved plan's Task 4 block byte-verbatim** (each route's old→new import + loader-block edit with its pinned flavor comment; then the grep for zero route-level `primeCmsQueries(` call sites, the typecheck, and the admin floor at 30/312). An anchor mismatch means drift: stop and reconcile against the live file, never re-anchor by eye. Commit:

  ```bash
  git add apps/admin/src/routes/_shell.branches.tsx apps/admin/src/routes/_shell.packages.index.tsx "apps/admin/src/routes/_shell.packages.\$packageId.edit.tsx" apps/admin/src/routes/_shell.packages.new.tsx apps/admin/src/routes/_shell.studio-services.tsx apps/admin/src/routes/_shell.add-ons.tsx apps/admin/src/routes/_shell.lookups.tsx apps/admin/src/routes/_shell.gallery.tsx apps/admin/src/routes/_shell.testimonials.tsx
  git commit -m "refactor(admin): the CMS loaders prime client-side only (#310)"
  ```

- [ ] **Step 3: the docs, the preserved plan's Task 5 block with exactly these replacement texts (everything else in its ADR body is byte-verbatim from the preserved plan):**

  ADR-0028's Status line:

  ```markdown
  ## Status

  Accepted (2026-11-16, #310, carrying #307's preserved lever ruling)
  ```

  ADR-0028's Context gains this sentence as the **last sentence of the first paragraph** (after "…0 warm loads. `main` carried the same race."):

  ```markdown
  The #307 cycle could not reproduce the mismatch locally (0/16 across two fresh dev boots, reads stayed pending at the dehydrate snapshot) and stopped at its evidence gate; the #310 census proved the environment window this decision rests on, the race reproduces on the deployed teaser's cold isolates, and that census is the BEFORE arm of this fix.
  ```

  The progress bullet, insert as the new first bullet under `# Progress` in `docs/progress.md` (newest-first, the house shape):

  ```markdown
  - **2026-11-16, the deployed-teaser cold-isolate census + the cold-load hydration fix (#310, carrying #307), build complete on `fix/310-teaser-cold-isolate-census`, PR pending.** The #310 probe census (the #307-preserved tool, byte-identical) reproduced the #294 census's race-class hydration mismatch on the deployed teaser, the environment window #307's local probe could not hit, and that census is the fix's BEFORE arm. Fixed by the **client-only priming** posture (ADR-0028, carrying #307's preserved lever ruling): the new `primeCmsQueriesForClient` seam guards the unchanged fire-and-forget `primeCmsQueries` on the environment, the server pass never primes, and the screens' server-side `useQuery` keeps the pre-#288 streaming posture (the render-time fetch hydrates pending, its dehydrated promise streams the data in after first render, one read, no mismatch); the nine CMS route loaders swapped to it, factory options + `cmsRoutePriming` lists byte-identical (all six existing seam pins pass untouched), client-side hover-intent behavior unchanged (the Warm/Cold contract's letter holds, a loader never blocks a navigation). The AFTER arm ran the same probe against the **deployed teaser post-deploy**: zero race-class messages, rows rendering through the streamed path. SSR awaited priming (content-first cold loads at a TTFB cost) is recorded as the evaluated alternative in ADR-0028. Admin-only, zero api/api-client/types/db/ui changes; admin floor 30 files / 312 tests (+2 client-only-priming pins). v1: PICK (triage run at close-out per the runbook).
  ```

  The AGENTS.md floor line, grep-verify each old string's uniqueness first (`grep -c "admin floor 30 files / 310 tests" AGENTS.md` → 1; `grep -c "+ the loader-priming thunks). The api and landing suites remain the behavioral backbones." AGENTS.md` → 1), then:

  ```text
  OLD: admin floor 30 files / 310 tests
  NEW: admin floor 30 files / 312 tests
  ```

  ```text
  OLD: + the loader-priming thunks). The api and landing suites remain the behavioral backbones.
  NEW: + the loader-priming thunks; + #310's two client-only-priming pins, the server pass never primes, the teaser-census-evidenced law carried from #307). The api and landing suites remain the behavioral backbones.
  ```

  Commit:

  ```bash
  git add docs/adr/0028-admin-ssr-priming-posture.md docs/progress.md AGENTS.md
  git commit -m "docs: ADR-0028 (the server pass never primes) + floors + progress (#310)"
  ```

### Task 5: Phase B, gates + PR + the gated merge + deploy watch

**Files:**
- Commit: none new (the gate run + the PR)

**Interfaces:**
- Consumes: the branch's Task 4 work; the owner's lever ruling (the veto gate).
- Produces: the squash merge on `main` (the merge SHA feeds Task 8's v1 pick); the deploy run watched sha-verified.

- [ ] **Step 1: the full gate**

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Expected: **35/35 packages green** with the floors byte-identical to Global Constraints: admin **30 files / 312**; api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped; types 18/188; db 4 files / 22 passed + 8 skipped; api-client 5/45; landing 17/134.

- [ ] **Step 2: the PR**

  ```bash
  gh pr create --title "fix(admin): cold loads stop hydrate-mismatching on the teaser, client-only priming (#310)" --body "The #310 census reproduced the #294 race-class hydration mismatch on the deployed teaser's cold isolates, the environment window #307's local probe could not hit; that census is this fix's BEFORE arm. Fix: **client-only priming** (ADR-0028, carrying #307's preserved lever ruling), the new \`primeCmsQueriesForClient\` seam guards the unchanged fire-and-forget law on the environment; the nine CMS route loaders swap to it; the screens' server-side useQuery keeps the pre-#288 streaming posture (pending hydrates as a skeleton; the dehydrated promise streams the data in after first render). Factory options + cmsRoutePriming lists byte-identical; the Warm/Cold contract's letter holds. The AFTER arm runs the same probe against the deployed teaser post-deploy (zero race-class expected). Floors: admin 30 files / 312 (+2)."
  ```

- [ ] **Step 3: the veto gate, check the owner's ruling before merging**

  Look for the owner's re-ratification (or re-rule) on #310 or in chat since the Task 3 evidence comment. **If absent: stop here, leave the PR open, report, and wait** (wait-for-owner-answers). If the owner re-ruled to SSR-awaited priming: stop-merge, re-shape Tasks 4 Steps 1–2 per the preserved plan's re-rule recipe, re-gate, re-PR, and re-ask.

- [ ] **Step 4: on a recorded ruling, squash merge + deploy watch**

  ```bash
  gh pr merge --squash
  gh run list --limit 3   # note the Deploy teaser (main) run id for the merge commit
  gh run watch <run-id>
  ```

  Expected: check success · **Deploy admin (sevendays-admin) success** · Deploy api (sevendays-api) success (unchanged code). Verify the run's `headSha` equals the merge commit SHA before trusting the verdict, never a re-run.

### Task 6: Phase B, the AFTER arm on the deployed teaser

**Files:**
- Modify: none (verification-only, the record appends to the notes file)

**Interfaces:**
- Consumes: Task 5's green deploy (the teaser admin serving the fix); the byte-identical probe; the owner's presence for the headed login.
- Produces: the AFTER census (Task 7's evidence-comment second half) appended to the notes file.

- [ ] **Step 1: announce + run the AFTER arm against the teaser**

  Announce in chat (the owner signs in again). Then:

  ```bash
  PROBE_BASE_URL=https://sevendays-admin.pahamajulius.workers.dev PROBE_HEADED=1 \
    node scripts/probe-cold-hydration.mjs
  ```

  Append the full JSON to `notes.md` under `## AFTER (deployed teaser)`.

- [ ] **Step 2: judge the verdict**

  Expected: **`total = 0`** race-class across all 8 routes, and the nesting class 0 too (post-#309; a nesting reappearance is a #309 regression, stop and diagnose before proceeding). Every screen still renders its rows through the streamed-promise path, a blank screen is a bug, not a pass. If any route reports a race-class message: stop, diagnose (a leftover `primeCmsQueries(` route call site, grep; a missed route; an unrelated message, quote and judge against the mismatch class), fix on the branch, re-gate, re-deploy, re-run. Record honestly either way.

### Task 7: Phase B, the evidence comment + the owner walk + close + graphify

**Files:**
- Modify: none on disk except the graphify output commit

**Interfaces:**
- Consumes: the deployed teaser admin (Task 5's merge); the census notes (BEFORE + AFTER); ADR-0028.
- Produces: the evidence comment; #310 closed completed; the graphify commit on `main`.

- [ ] **Step 1: post the evidence comment (stage one of the two-stage close)**

  Write to a temp file, post with `gh issue comment 310 --body-file <file>`, delete the file. In order: (1) the lever record, client-only priming landed (ADR-0028), the veto window's outcome (the owner's Task 5 ruling); (2) the BEFORE census, the reproducing pass's full JSON + quoted texts from Task 3; (3) the AFTER census, the deployed-teaser JSON from Task 6 (race-class 0); (4) the structural pins, factories + `cmsRoutePriming` byte-identical (all six existing seam pins pass untouched), the two new pins, the floor move 30/310 → 30/312; (5) the local-dev note, the preserved plan's local BEFORE/AFTER arms never ran for this fix; the teaser is the only environment the arms ran on, which is the point of #310.

- [ ] **Step 2: the owner walk (HITL, the owner performs it on the deployed teaser admin)**

  Ask the owner for one sitting (devtools open, fresh incognito):
  - **Cold arm:** cold-load Branches and Gallery in the fresh window, expect **zero** hydration-class console errors on both, rows rendering after the brief skeleton.
  - **Warm arms (the #288 three, re-run on Branches):** hover a sidebar nav item and watch the network tab fire that route's read before the click; navigate, then revisit within 5 minutes, expect instant render with **zero** refetches; wait past 5 minutes and revisit, expect **exactly one** background refetch.

  If the owner reports any failure: stop, diagnose on the branch, fix via a follow-up commit + re-deploy, re-walk. Never close on a failed walk. If the owner is unavailable: leave #310 open naming the pending walk, and stop.

- [ ] **Step 3: on PASS, close #310 (stage two)**

  ```bash
  gh issue close 310 --comment "Closed on the two-stage record: the reproducing teaser census + the deployed AFTER arm + the owner walk above; the lever record lives in ADR-0028 (carrying #307's preserved ruling). #307 stays closed, this ticket was its environment follow-up."
  ```

- [ ] **Step 4: graphify (code symbols changed)**

  ```bash
  git checkout main && git pull --ff-only
  graphify update .
  git add graphify-out/
  git commit -m "chore(graphify): post-#310 graph update"
  ```

### Task 8: Phase B, the v1 pick + the ledger row

**Files:**
- Modify: the `v1` branch (the pick commit), `docs/agents/v1-picks.md` (the ledger row, on `main`)

**Interfaces:**
- Consumes: the Task 5 merge SHA; the v1-picks runbook (`docs/agents/v1-picks.md`) + `scripts/v1-triage.mjs`; the v1 test DB on :5434 (the standalone container `docker start sevendays-test-db-5434`, the compose db service squats 5432).
- Produces: the v1 pick deployed; the ledger row on `main`.

- [ ] **Step 1: triage the merge**

  ```bash
  node scripts/v1-triage.mjs <merge-sha>
  ```

  Expected **SPLIT**, the preserved plan's Task 9 classification plus this plan file: v1-paths carry `apps/admin/src/lib/cms-queries.ts`, `apps/admin/src/lib/cms-queries.test.ts`, the nine route files, `docs/adr/0028-admin-ssr-priming-posture.md` (12 carry paths); main-only: `docs/progress.md` (deleted-in-v1, `git rm -f`, the #287 lesson), both plan files (this one + the preserved one, dropped), `AGENTS.md` (override-drop, v1's AGENTS.md is the v1-edition doc with no floor-lines section, the #289 pinned precedent), `scripts/probe-cold-hydration.mjs` (main-only, the v1 seed has no `scripts/` directory). The triage script's verdict governs; a drift is a ledger note, not a silent override.

- [ ] **Step 2: apply the pick on v1 + the lock gates**

  Cherry-pick the carry paths with a provenance line naming the merge SHA (the runbook's form), resolve the main-only resolutions, then:

  ```bash
  docker start sevendays-test-db-5434
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check
  ```

  Expected: v1 floors, admin **30 files / 312** (the +2 carried); api 31 files / 392 passed + 3 skipped (v1's own); types 18/188; db 4 files / 30 passed (v1's own, no skips); api-client 5 files / 38; landing 14 files / 83 (v1's own floors, per the #288 run's pinned values).

- [ ] **Step 3: push + CI watch + absence audit**

  ```bash
  git push origin v1
  gh run watch <v1 run-id>   # sha-verify headSha == the pick commit SHA
  node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed
  ```

  Expected: check success · Deploy v1 (private) success · teaser skipped; absence audit **PASS 0/18** exit 0 (run from the main repo root, the in-worktree invocation MODULE_NOT_FOUNDs, the #286 lesson).

- [ ] **Step 4: the ledger row on main**

  ```bash
  git checkout main
  # append the #310 row to docs/agents/v1-picks.md per the runbook's row shape,
  # naming the v1 pick commit SHA + the CI run id
  git add docs/agents/v1-picks.md
  git commit -m "docs(v1-picks): #310 ledger row - the cold-load hydration fix (carries)"
  git push origin main
  ```

---

## Self-review notes (plan-time)

- All literals probed at their source 2026-11-16 @ `7c91d6d`: the admin floor live-re-run (30 files / 310); the ADR tail (0027, ADR-0028 free); the AGENTS.md floor-line anchor strings present (uniqueness re-grepped at execution); the teaser `/login` 200 (and `/` 307 → `/?window=7d`, harmless to the probe's `/login`-first flow); chromium-1243 cached + `@playwright/test` 1.63.0 root-resolvable; WSLg `DISPLAY=:0`; the race surface intact (nine `primeCmsQueries(` call sites, no environment guard in the seam); `.superpowers/` gitignored (`.gitignore:39`).
- The probe script needs zero edits, every env knob it reads (`PROBE_BASE_URL`, `PROBE_HEADED`, `PROBE_LOGIN_TIMEOUT_MS`) is used as committed; `PROBE_ROUTES` stays at its default eight.
- The decision tree terminates: reproduced → Phase B with the merge veto gate; zero×2 → owner ruling (no fix code); owner AFK at any HITL moment → stop and wait, nothing self-served.
- Phase B is the preserved plan's Tasks 3–5 verbatim except the four pinned delta classes (branch/subjects, ADR status+sentence, progress bullet, AGENTS.md lines), all four replacement texts are written out in full above; the seam comment and describe title deliberately keep their `#307` wording (the law's discovery provenance).
- The counts: exactly +2 admin tests (enumerated in the preserved plan's Task 3), every other floor byte-pinned; the AFTER-arm expectation is 0 race-class + 0 nesting post-#309; the v1 floor table is the #288 run's pinned values + the same +2.
- Phase A commits nothing; Phase B's commits are explicit-path only; the #300 CONTEXT.md dirt never stages.

