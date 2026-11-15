# #294 — The admin Gallery rail renders full-width below `lg` — implementation plan

**Goal:** Below the `lg` breakpoint, the admin Gallery screen's category/filter rail (`CategoryRail`) renders as its intended full-width horizontally-scrollable strip — no element escapes the page column at any viewport width, every entry reachable, and rendering above `lg` byte-identical to today.

**Architecture:** one class token removed — the `self-start` alignment on the rail's root Card, the only such usage in the admin app, which overrides the mobile column-flex stretch and lets the card shrink to a fit-content width its `whitespace-nowrap` entries + mobile-always-visible mini-actions can push past a phone viewport (the triaged root cause on #294; the base Card primitive is `overflow-hidden`, so the Card element itself escapes and the CardContent's `overflow-x-auto` strip never engages). The restored posture is the composition of record's own — the ported prototype's "Horizontal scroll strip on narrow widths, vertical rail on lg+" comment has said so since #141. Above `lg` the token was dead weight, masked by the fixed `lg:w-[220px]` column + the parent's `lg:items-start`. No test changes (the admin house rule fences component/DOM tests); verification is a rendered walk on the local dev stack (before/after evidence) plus the owner's mobile confirm on the deployed teaser admin (HITL close).

**Tech Stack:** TanStack Start admin app (`@sevendays/admin`), Tailwind v4, the shared `packages/ui` Card primitive (untouched).

**Spec:** the #294 agent brief — https://github.com/jeius/sevendays/issues/294#issuecomment-6889131597 (triaged `bug` + `ready-for-agent` 2026-11-15; the brief is the contract, this plan its execution).

**UI ruling (the #94 amendment):** this ticket IS UI-bearing — pixels change below `lg`. Skill set at execution time: `ui-ux-pro-max` + `ui-styling` load for the rendered walk (Task 2/Task 4). It is **not** a new composition: the strip posture is the composition of record's already-ported design (prototype/131 → #141), so **no rendered-variants round** — the walk judges the restored posture against the brief's acceptance criteria, it does not shop for a new one.

## Global Constraints

- Branch `fix/294-gallery-rail-mobile` off current `main` (at `a31b7fc` or later). Per-task commits with the subjects pinned per task, each ending `(#294)`; the squash-merge appends the PR number.
- Gates: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green **35/35** with the floors **byte-identical** — this plan adds no tests (the admin no-DOM-tests house rule fences a class-law pin; there is nothing pure for a lib-seam test to assert): **admin 30 files / 310**; **api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped**; **types 18 files / 188**; **db 4 files (2 + 2 skipped) / 22 passed + 8 skipped**; **api-client 5 files / 45**; **landing 17 files / 134**. A moved floor means drift: stop and reconcile against the test tree, never pad. (Fresh clone: `pnpm build:packages` + `pnpm --filter @sevendays/api build` first — this plan changes no route, so `AppType` is untouched.)
- **The code change is exactly one class token** (plus its pinned comment). The executor must not "improve" adjacent markup: the entries' `w-full`, the strip's `overflow-x-auto`, `railEntryClass`, the mini-action visibility law, the drag sensors, and the pending-skeleton card all stay byte-identical. The only sanctioned second edit is Task 4's pinned contingency, and it triggers on a hard criterion failure only.
- **Deploy through CI only.** The push to main fires `Deploy admin (sevendays-admin)` in the `Deploy teaser (main)` run — **that leg is the one this ticket's change rides**; the `Deploy api (sevendays-api)` leg also fires and must go green (unchanged code). **Never run any local bare `wrangler deploy`** — the #263/#264 lesson (it wipes the CI-passed `--var`s; the only restore is `gh run rerun <merge-run-id>`).
- **Local dev stack posture:** `pnpm --filter @sevendays/admin dev` serves the admin on :3000 (`.env.local` via dotenv — already configured on this dev machine). The landing app is NEVER started alongside it (both pin :3000, and the ws debugger pins :9229 — serial only). The admin's server fns read over `packages/db` (ADR-0023), so the local `DATABASE_URL` is the only backend the walk needs — no api process.
- **Gallery content is CMS-born-empty** — the dev seed provisions no gallery categories. The walk's categories are created **through the admin UI at desktop width first** (the pre-fix rail is broken at mobile widths; creating content there before the fix would fight the very bug under test). The category names are throwaway dev-DB rows, not catalog data; the exact strings to type are pinned in Task 2.
- **Live-probed pins (2026-11-15 @ `a31b7fc` — current `main` HEAD; read from the installed sources, not memory):**
  - `self-start` appears **exactly once** in `apps/admin/src` — the rail Card (`gallery-screen.tsx`, inside `CategoryRail`). The rail's pending-skeleton Card reads `shrink-0 rounded-lg lg:w-[220px]` **without** `self-start` — the skeleton already stretches full-width below `lg`, which is why loading and loaded postures visibly disagree today.
  - The base Card primitive (`packages/ui`) is `overflow-hidden` — the escape is the Card element itself blowing past its parent, not clipped children.
  - Breakpoints: `useIsMobile` flips at **768px** (`max-width: 767px`, `packages/ui` hook); the strip↔column switch is Tailwind `lg` = **1024px**. The breakage window is **< 1024px**, worst **< 768px** where the per-entry mini-actions (rename / deactivate / delete) render always-visible (`isMobile ? 'opacity-100'`) and inflate the card's min-content further.
  - `self-start` landed with the original M5 composition (commit `1213e74`, ticket #141) — a long-standing latent defect, **not an M8 regression** (the issue body already says so; the git record confirms).
  - The ADR-0022 visual suite (`e2e/visual/redesign.spec.ts`) is **landing-only** (8 public surfaces × 2 themes) — no admin or mobile baseline interacts with this fix, and none is added (the brief fences it).
  - The admin suite is 22 lib-seam files, plain node, no DOM — nothing to update.
- **No new secret, no wrangler config change, no env var, no api/api-client/types/db change, no `packages/ui` change** — the lever is one app-local class token.
- **The close is HITL (Task 7):** the owner performs the one-glance mobile check on the deployed teaser admin (the reporter's own phone is the acceptance device — they reported it there). Never ask for credentials, never assume while the owner may be AFK. If the owner is unavailable after Task 6, post nothing further, leave #294 **open** naming the pending check, and stop.
- **No `docs/plan.md` box exists for #294** (post-M8 standalone fix — the M8 boxes all flipped at #289) — `docs/plan.md` is untouched. AGENTS.md is untouched (no floor movement, no contract change).

### Not here

- **No `packages/ui` edits** — the Card primitive is shared by every app; the defect is this call site's class usage, and the fix stays app-local.
- **No strip-posture redesign** — the composition of record governs (the `w-full` slice entries are its ported markup). Task 4's pinned contingency exists only to stop a persistent escape, and its application is flagged to the owner as a composition deviation for re-ruling — never silently kept.
- **No new ADR** — a one-token CSS fix records no architectural decision; the durable record is the progress bullet.
- **No visual baselines, no e2e edits** — `e2e/visual/` is landing-only (ADR-0022) and never joins `pnpm check`.
- **No component/DOM tests, no vitest changes at all** (house rule — the floors are byte-identical).
- **No other-screen work** — the other CMS screens' two-column layouts never used `self-start` (grep-pinned); nothing else moves.
- **No mini-action visibility law, DnD, upload-pool, or editor changes** — the walk must confirm they still behave, not refit them.
- **No `docs/architecture.md`/`docs/tech-stack.md`/AGENTS.md/`docs/plan.md` edits.** `graphify update .` **is** needed at close (a component symbol's markup changed — Task 7).

---

### Task 1: branch + plan commit

**Files:**
- Commit: this plan file (the branch's first commit)

- [ ] **Step 1: branch + plan commit**

  ```bash
  git checkout main && git pull --ff-only && git checkout -b fix/294-gallery-rail-mobile
  git add docs/superpowers/plans/2026-11-15-294-gallery-rail-mobile.md
  git commit -m "docs: the #294 gallery-rail-mobile implementation plan (#294)"
  ```

### Task 2: the rendered repro (the "before" evidence — red)

The triage verdict was static (code-path analysis); this task proves it live before any edit. If it fails to reproduce, the plan stops — a fix without a repro is a guess.

**Files:**
- None on the repo. Captures go to `/tmp/gallery-rail-walk/` (never committed).

**Interfaces:**
- Consumes: the local dev stack posture (Global Constraints), `docs/staff-provisioning.md`'s local sign-in path.
- Produces: the running stack + a signed-in session + 4 gallery categories, reused by Task 4's "after" walk; the pre-fix capture + the numeric overflow reading that Task 4's evidence comment quotes.

- [ ] **Step 1: start the stack**

  ```bash
  pnpm --filter @sevendays/admin dev
  ```

  Run it in the background and wait for the :3000 readiness line. Nothing else may be listening on :3000 (kill the landing first if it is — serial-only posture).

- [ ] **Step 2: sign in**

  In the browser (the `browser-use:web-gui-tester` skill drives it): open `http://localhost:3000`, land on the login screen, and sign in with the local staff account this dev machine already carries (past dev walks — #242/#286 — left staff rows in the dev DB). If no known local account signs in, create a throwaway one per `docs/staff-provisioning.md` — the password is prompted interactively and never rides a flag:

  ```bash
  printf '%s\n' '<local-12+-char-password>' | pnpm --filter @sevendays/admin create-staff --email gallery-walk@local.test --name 'Gallery Walk'
  ```

  then sign in as that account. This row is dev-DB-local and disposable; it never touches deployed environments.

- [ ] **Step 3: create the walk's categories (at desktop width, pre-fix)**

  At the 1280px viewport (where the rail renders correctly today), open the Gallery screen and create four categories via the rail's `New category` affordance, typing exactly:

  1. `Weddings`
  2. `Portraits`
  3. `Events`
  4. `Family and couple portraits — extended session`

  (The fourth is deliberately long — it is the min-content inflator. These are throwaway dev-DB rows.)

- [ ] **Step 4: capture the broken render at 375px**

  Narrow the viewport to **375×667**, open the Gallery screen fresh, let hydration settle, then record — via the browser tool's evaluate:

  ```js
  () => {
    const root = document.scrollingElement ?? document.documentElement;
    const rail = document.querySelector("[data-slot='card']");
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      railWidth: rail ? Math.round(rail.getBoundingClientRect().width) : null,
      gridWidth: rail?.parentElement
        ? Math.round(rail.parentElement.getBoundingClientRect().width)
        : null,
    };
  }
  ```

  Expected (the red signal): `scrollWidth > clientWidth` (page-level horizontal overflow) and `railWidth > gridWidth` (the card escaping its column). Capture a full-page screenshot to `/tmp/gallery-rail-walk/before-375-light.png`.

  **Stop rule:** if `scrollWidth <= clientWidth` here — the bug does not reproduce locally with 4 categories including a long one — **do not edit anything**. Post the readings on #294 as triage notes, flip it back to `needs-info`, and ask the owner what their production category list looks like (the local walk content may under-drive the min-content). The plan ends there.

- [ ] **Step 5: capture the dark theme + the lg regression baseline**

  Toggle the admin ThemeToggle to dark, re-record the 375px readings (same expected red), capture `/tmp/gallery-rail-walk/before-375-dark.png`. Then set the viewport to **1280×800** and record the same four numbers — expected green (`scrollWidth == clientWidth`, `railWidth` ≈ 220) — this is Task 4's above-`lg` comparison baseline. Capture `/tmp/gallery-rail-walk/before-1280-light.png` (toggle back to light first).

### Task 3: the one-token fix (green)

**Files:**
- Edit: `apps/admin/src/components/gallery/gallery-screen.tsx`

**Interfaces:**
- Consumes: nothing new — the edit removes one class from the `CategoryRail` root Card.
- Produces: the rail Card stretching to its container below `lg`; `lg+` markup unchanged (the token was masked there). Later tasks verify, nothing consumes the internals.

- [ ] **Step 1: remove the token + pin the why (content-anchored, exactly one match each)**

  The `self-start` occurrence is unique in the file (grep-pinned at plan time — `grep -c 'self-start' apps/admin/src/components/gallery/gallery-screen.tsx` must print `1` before this edit; anything else means drift, stop and reconcile):

  ```tsx
  OLD:
    <Card className='shrink-0 self-start rounded-lg lg:w-[220px]'>
      {/* Horizontal scroll strip on narrow widths, vertical rail on lg+. */}

  NEW:
    <Card className='shrink-0 rounded-lg lg:w-[220px]'>
      {/* Horizontal scroll strip on narrow widths, vertical rail on lg+.
          The card must STRETCH below lg (#294): a fit-content width here
          let the nowrap entries + the mobile-visible mini-actions push
          the card past the viewport — the page overflowed instead of the
          strip scrolling. Above lg the fixed lg:w-[220px] column governs. */}
  ```

  Nothing else in the file changes.

- [ ] **Step 2: typecheck + the admin suite (floors byte-identical)**

  ```bash
  pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin test
  ```

  Expected: typecheck clean; the suite **30 files / 310** — unchanged, no test moved.

- [ ] **Step 3: commit**

  ```bash
  git add apps/admin/src/components/gallery/gallery-screen.tsx
  git commit -m "fix(admin): the gallery rail stretches full-width below lg (#294)"
  ```

### Task 4: the rendered verification (the "after" walk — the brief's acceptance criteria)

The stack, session, and categories from Task 2 are still live (same dev process — if it died, restart it and re-sign in; the categories persist in the dev DB).

**Files:**
- None on the repo. Captures to `/tmp/gallery-rail-walk/`.

**Interfaces:**
- Consumes: Task 2's stack/session/categories and its "before" readings; Task 3's edit.
- Produces: the walk readings quoted verbatim in Task 7's evidence comment.

- [ ] **Step 1: the 375px green readings (both themes)**

  Viewport **375×667**, Gallery screen fresh, light theme, hydration settled — the same evaluate block as Task 2 Step 4:

  Expected (green): `scrollWidth == clientWidth` (no page-level overflow) and `railWidth ≈ gridWidth` (the card spans its column). Then, still at 375px, verify the brief's remaining criteria by driving the UI:

  - the strip scrolls horizontally: every entry (`All photos`, all four categories, `New category`) becomes fully visible by scrolling the rail's strip, none clipped mid-way in an unreachable region;
  - each entry's mini-action cluster (rename / deactivate / delete) is visible on mobile and each button is tappable;
  - the long-name entry truncates inside its slice (no raw overflow inside the strip);
  - inline create works: tap `New category`, type `Test mobile`, Enter — it appears (then delete it via its mini-action delete + the confirm, restoring the four);
  - inline rename works: tap an entry's rename action, the inline input replaces the row, cancel restores.

  Capture `/tmp/gallery-rail-walk/after-375-light.png`. Toggle dark, re-record the readings (same greens), capture `/tmp/gallery-rail-walk/after-375-dark.png`.

- [ ] **Step 2: the band + the lg regression**

  Viewport **900×700** (inside the 768–1023 strip band, hover-capable): same readings green; the strip posture holds. Viewport **1280×800**, light theme: same readings — and they must match Task 2 Step 5's `before-1280` baseline (`railWidth` ≈ 220; the vertical 220px column, full-width entries, layout unchanged). Capture `/tmp/gallery-rail-walk/after-1280-light.png`.

- [ ] **Step 3: the skeleton agreement**

  At **375×667**, hard-reload the Gallery screen and observe the pending posture: the skeleton rail card renders full-width, and the loaded rail lands full-width — no snap between them. (The skeleton never carried the token; this is the agreement criterion, now trivially true.)

- [ ] **Step 4: the decision table**

  - **All greens** → proceed to Task 5. The one-token fix stands; no contingency touched.
  - **A hard criterion fails — the escape persists** (`scrollWidth > clientWidth` at 375px after the fix) → apply the pinned contingency below (all three edits, content-anchored, one match each), re-run Steps 1–3, and **flag it in the Task 7 evidence comment as a composition deviation for the owner's re-ruling** (the `w-full` slices are the ported composition's markup; dropping them deviates from the composition of record and the owner re-rules, never silently keeps). Reasoning pinned: the three entry rows carry `w-full` for the vertical column, but at `lg+` the CardContent is `lg:flex-col` whose default cross-axis stretch already full-widths auto-width children — dropping the token leaves `lg+` rendering identical while making mobile entries content-sized chips that the strip scrolls to.

    Contingency edit 1 of 3 — the entry root (inside `cn()`):

    ```tsx
    OLD:
        'group/rail-entry flex w-full shrink-0 items-center gap-1',
    NEW:
        'group/rail-entry flex shrink-0 items-center gap-1',
    ```

    Contingency edit 2 of 3 — the renaming row:

    ```tsx
    OLD:
      <div ref={setNodeRef} className='flex w-full shrink-0 items-center gap-1'>
    NEW:
      <div ref={setNodeRef} className='flex shrink-0 items-center gap-1'>
    ```

    Contingency edit 3 of 3 — the create-input row:

    ```tsx
    OLD:
          <div className='flex w-full shrink-0 items-center gap-1'>
    NEW:
          <div className='flex shrink-0 items-center gap-1'>
    ```

    Commit the contingency separately: `git commit -am "fix(admin): the rail entries size to content below lg (#294)"`.
  - **Any OTHER failure** (a crash, the grid breaking, a dialog misbehaving) → **stop**. `git log` the state, post the finding + capture on #294, and leave the ticket open — never improvise beyond the pinned contingency.

- [ ] **Step 5: stop the stack**

  Kill the admin dev process (the :3000 serial posture frees the port).

### Task 5: the progress bullet

**Files:**
- Edit: `docs/progress.md` (insert one What-Exists bullet)

- [ ] **Step 1: insert the bullet** — directly after the #288 Warm/Cold bullet (the list's last entry; its tail is content-anchored — must match exactly once, immediately before the blank line preceding the `## Known Gaps / Not Yet Done` heading; after the edit the file gains exactly the one bullet):

  ```text
  OLD:  deferred to #289's closeout). Admin-local only — the api is untouched.

  ## Known Gaps / Not Yet Done
  NEW:  deferred to #289's closeout). Admin-local only — the api is untouched.
  - The admin **Gallery rail renders properly below `lg`** (2026-11-15, #294): the category/filter rail Card drops its `self-start` alignment — the only such usage in the admin app, masked above `lg` by the fixed 220px column — so below `lg` the card stretches to its container and the composition of record's horizontal scroll strip engages (the ported #141 posture): the `whitespace-nowrap` entries + the mobile-always-visible mini-actions can no longer push the card past the viewport, the strip's `overflow-x-auto` scrolls instead of the page, and the pending skeleton and loaded rail agree at every breakpoint. Verified by the rendered walk (375px / 900px / 1280px, both themes, before+after readings) + the owner's mobile confirm on the deployed teaser admin. Admin-local, one class token — no API, schema, package, or test changes.

  ## Known Gaps / Not Yet Done
  ```

- [ ] **Step 2: commit**

  ```bash
  git add docs/progress.md
  git commit -m "docs: the gallery-rail mobile-fix progress bullet (#294)"
  ```

### Task 6: gates, push, PR, merge, watch the deploy

**Files:** none new.

- [ ] **Step 1: gates** — from the repo root (on a fresh clone, `pnpm build:packages` + `pnpm --filter @sevendays/api build` first):

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Green 35/35 with the Global Constraints floors byte-identical (admin 30 files / 310 — no test moved).

- [ ] **Step 2: push + PR**:

  ```bash
  git push -u origin HEAD
  gh pr create --title "fix(admin): the gallery rail renders full-width below lg (#294)" --body-file - <<'EOF'
  #294, found incidentally during the M8 exit-gate walk (not an M8 regression — the token landed with the original #141 composition): on viewports below `lg`, the admin Gallery screen's category/filter rail Card carried a `self-start` alignment — the only such usage in the admin app — which overrode the mobile column-flex stretch. The card shrank to fit-content and its `whitespace-nowrap` entries + mobile-always-visible mini-actions pushed it past the phone viewport; the base Card being `overflow-hidden`, the Card element itself escaped its column and the strip's `overflow-x-auto` never engaged.

  - **The fix is one class token**: `self-start` removed from the rail Card. Below `lg` the card stretches to its container and the composition of record's horizontal scroll strip engages; above `lg` the token was dead weight (masked by the fixed `lg:w-[220px]` column + the parent's `lg:items-start`) — rendering there is unchanged.
  - **Verified by the rendered walk** on the local dev stack (375px / 900px / 1280px, light + dark, before+after readings: page `scrollWidth == clientWidth`, rail spanning its column, every entry + mini-action reachable, inline create/rename usable, skeleton agreement) — readings on #294. HITL close: the owner's mobile confirm on the deployed teaser admin.
  - Admin-local, one token + its pinning comment — no API, schema, package, or test changes; floors byte-identical (admin 30 files / 310).
  EOF
  ```

- [ ] **Step 3: CI check green on the PR, then squash-merge.** Record the merge SHA.

- [ ] **Step 4: watch the deploy** — `gh run list --branch main --limit 1`, verify the run's head SHA matches the merge SHA (the #271 lesson), then `gh run watch <run-id>` until the `Deploy teaser (main)` leg finishes. **Both legs must go green: `Deploy admin (sevendays-admin)` (this ticket's change) AND `Deploy api (sevendays-api)` (unchanged code — green is the expectation, never skipped).** Record the run id — the restore vehicle if anything var-shaped breaks later (`gh run rerun <run-id>`).

### Task 7: the HITL close + graphify

**Files:** none on disk until the graphify step.

- [ ] **Step 1: the owner ask** — send this ask and wait (never assume while the owner may be AFK):

  > #294 (the mobile Gallery filters-card overflow you reported during the exit-gate walk) is deployed to the teaser admin. Could you open the admin on your phone — the same viewport that showed the breakage — go to the Gallery screen, and glance at the category/filter card on the left: it should now span the screen width with the category strip scrolling horizontally inside it (instead of the card running off-screen), the rename/deactivate/delete buttons visible on each category, and everything above the desktop layout unchanged. A "renders properly on my phone" closes the ticket.

  Decision table:
  - **Confirmed** → post the evidence (Step 2) and close (Step 3).
  - **Still broken on their device** → reproduce locally per Task 2 (ask the owner for their production category list if the local content under-drives it), post findings on #294, leave open — the fix hypothesis re-enters triage with live evidence, never a silent second guess.
  - **Owner AFK after Task 6** → post nothing further, leave #294 open with a one-line comment naming the pending check ("deployed; awaiting the owner's mobile confirm — <run-id>"), and stop. The ticket closes only on the owner's confirm (or their re-ruling of a failure mode).

- [ ] **Step 2: post the evidence to #294** (only after a yes; fill the `<…>` slots — quote Task 2's before readings and Task 4's after readings verbatim):

  ```bash
  gh issue comment 294 --body "Rendered evidence (deploy run <run-id>):

  - Before (local dev, pre-fix): 375px viewport — page scrollWidth <before> vs clientWidth <before>, rail <before>px wide inside a <before>px column — the card escaped its container (the triaged fit-content mechanism, reproduced live).
  - After (local dev, post-fix): 375px — scrollWidth == clientWidth (<after>), rail spans its column (<after>px ≈ column <after>px); 900px band — green; 1280px — identical to the pre-fix baseline (rail ≈ 220px vertical column). Both themes green; inline create/rename usable; mini-actions visible and tappable; skeleton and loaded rail agree.
  - The fix is one class token: the rail Card's \`self-start\` removed (masked above lg by the fixed 220px column). <If the Task 4 contingency fired, name it here as a composition deviation for re-ruling — otherwise omit this line.>
  - Floors byte-identical (admin 30 files / 310); pnpm check 35/35. The owner's mobile confirm on the deployed teaser admin is the closing check."
  ```

- [ ] **Step 3: graphify + close #294**:

  ```bash
  git checkout main && git pull --ff-only
  graphify update .
  git add graphify-out/
  git commit -m "chore(graphify): post-#294 graph update"
  git push origin main
  gh issue close 294 --reason completed
  ```

  The brief's acceptance criteria all hold: no escape at 375px/768–1023px (Task 4 Steps 1–2), every entry reachable + create/rename usable (Task 4 Step 1), `lg+` unchanged (Task 4 Step 2 against the Task 2 baseline), skeleton agreement (Task 4 Step 3), both themes (Task 4 Step 1), `pnpm check` (Task 6). **No `docs/plan.md` box exists for this ticket** — nothing to tick there.

### Task 8: post-merge — the v1 pick + ledger row

**Files:**
- Edit: `docs/agents/v1-picks.md` (the ledger row — main-side, direct commit per the ledger precedent)

- [ ] **Step 1: triage per `docs/agents/v1-picks.md`** — `node scripts/v1-triage.mjs <merge-sha>` (the Task 6 merge SHA). Expected shape: **SPLIT** — v1-paths: `apps/admin/src/components/gallery/gallery-screen.tsx` (the v1 branch's admin carries the same CMS surface); main-only: `docs/progress.md`, this plan file (dropped). Record the classifier's actual output. Content pass expected clean: one removed class token + a pinning comment — zero booking-path strings, zero edition mechanics.

- [ ] **Step 2: execute the pick + locks** per the runbook — cherry-pick the squash commit onto `v1`, resolve the main-only paths as drops, then from the **main repo root**:

  ```bash
  pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check
  node scripts/audit-v1-absence.mjs HEAD --repo <v1-worktree-path>   # main-root invocation — the in-worktree run MODULE_NOT_FOUNDs (the #286 lesson); expect exit 0 / PASS 0/18 over full history
  git push origin v1
  ```

  Watch the run **sha-verified** (the #271 lesson): `check` success, `Deploy v1 (private)` success, `Deploy teaser (main)` skipped. Superset check: the merge SHA reachable from origin/main. v1 floors on the check: **admin 30 files / 310** (identical to main — the same surface, no test change) and **api 31 files (30 passed + 1 skipped) / 392 passed + 3 skipped** (v1's own floor).

- [ ] **Step 3: the ledger row** — one row appended to `docs/agents/v1-picks.md`, the #285–#289 rows as the format template (the `<…>` cells are execution-filled):

  ```text
  | 2026-11-<d> | #<PR> | <merge-sha> | <class — expected split> | <v1-sha> | #294 — the admin Gallery rail renders full-width below lg (the rail Card's self-start alignment — the only such usage in the admin app, masked above lg by the fixed 220px column — removed: below lg the card stretches to its container and the composition of record's horizontal scroll strip engages; the fit-content escape that pushed the nowrap entries + mobile-visible mini-actions past the phone viewport is gone; verified by the rendered walk (375/900/1280px, both themes, before+after readings) + the owner's mobile confirm on the deployed teaser admin; admin-local, one class token + its pinning comment, no API/schema/package/test changes). Classifier <actual class> — 1 v1-path (gallery-screen.tsx) + 2 main-only (docs/progress.md, the plan file — dropped). Content pass clean — one removed token + a comment, zero booking tokens, zero edition mechanics. Locks on <v1-sha>: frozen install/build:packages/api-build green; check 35/35 (TEST_DATABASE_URL :5434/sevendays_test); floors admin 30/310 (identical to main) and api 31 files / 392+3sk (v1's own); absence audit PASS 0/18 over full history; superset ok (<merge-sha> reachable). Run <run-id>: check success · Deploy v1 (private) success · Deploy teaser (main) skipped. Main side: PR #<PR> squash-merged after CI green; the before/after walk readings + the owner's mobile confirm on #294. |
  ```

  Commit:

  ```bash
  git add docs/agents/v1-picks.md
  git commit -m "docs(v1-picks): #294 ledger row - the gallery-rail mobile fix (carries)"
  git push origin main
  ```

---

## Self-review notes for the executor

- **Pin inventory (all read/probed 2026-11-15 @ `a31b7fc`):** the `self-start` uniqueness grep (1 occurrence in `apps/admin/src`); the skeleton Card's token-less twin; the base Card's `overflow-hidden`; `useIsMobile` = 768px vs the strip switch `lg` = 1024px (the <1024px window, worst <768px); the token's landing commit `1213e74` (#141); the visual suite's landing-only surface list; the admin suite's 22 lib-seam files / no DOM; the check floors (admin 30 files / 310, api 34 files / 471+3sk, types 18/188, db 4 files / 22+8sk, api-client 5/45, landing 17/134); the local stack posture (:3000 admin via `.env.local`, serial-only, no api process needed); the `create-staff` interactive-password path (`docs/staff-provisioning.md`).
- **No spike needed** — this plan makes no library type-inference claim; the one behavioral claim (fit-content + nowrap + always-visible mini-actions exceed a 375px viewport) is proven live by Task 2's repro BEFORE any edit. The pinned contingency's `lg+`-stretch claim (flex-col children stretch without `w-full`) is standard flexbox, verified visually by Task 4 Step 2's 1280px baseline comparison should the contingency ever fire.
- **Test-count arithmetic: nothing moves.** The admin floor is 30 files / 310 before and after — the plan adds no test (the no-DOM-tests house rule fences a class-law pin; there is no pure seam). If any floor moves, stop and reconcile — never pad.
- **If line numbers shifted** (an intervening commit): every OLD string here is content-anchored, not line-anchored — they still apply; a ≠1 match means drift, stop and reconcile.
- **The two-stage close is the designed path:** Tasks 1–6 are agent-only; only Task 7 waits on the owner. If the owner is AFK after Task 6, the evidence comment is *not* posted, #294 stays **open** with the pending-check note, and work stops there — the ticket closes only with the owner's mobile confirm (or their re-ruling of a failure mode).
- **The Task 2 stop rule is load-bearing:** the plan's honest record depends on the bug reproducing before the fix. A no-repro local walk is a finding (the local content under-drives the mechanism), not a license to edit.
- **Confound honesty:** the fix lands on `main` regardless of the M9 handover's state; the owner's exit-gate context (production walk, 2026-11-15) is the report's provenance, not this ticket's gate. This ticket's own evidence is the before/after readings + the owner's one-glance confirm.
- **Every deliberate non-feature has its pin:** no `packages/ui` change (call-site defect), no strip redesign (composition of record governs; the contingency is owner-flagged), no ADR (no architectural decision), no baselines (ADR-0022 is landing-only), no vitest changes (house rule), no AGENTS.md/plan.md edits (no floor movement, no milestone box). A reviewer proposing any should be pointed at the matching pin.


