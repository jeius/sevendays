# #309, the testimonials sortable's div-in-tbody, fix plan

**Goal:** relocate the testimonials desktop sortable's `DndContext` out of the `<tbody>` so dnd-kit's Accessibility subtree (the `DndDescribedBy` instructions div + the live-region div, both `display:none`) stops rendering as `<tbody>` children, zero hydration-class warnings on `/testimonials`, zero visual delta, drag wiring untouched.

**Architecture:** one structural JSX move in `apps/admin/src/components/testimonials/testimonials-screen.tsx`, the desktop `DndContext` wraps the `<Table>` (inside the existing `TooltipProvider`) instead of the `<TableBody>` children; `SortableContext` and the rows stay exactly where they are. React context flows through the tree regardless of DOM position, so `useSortable` wiring, sensors, and `onDragEnd` are byte-identical. Acceptance is scripted: `scripts/probe-cold-hydration.mjs` (the #307-preserved census harness, which counts the DOM-nesting class separately) runs a BEFORE arm on unfixed code and an AFTER arm on fresh boots, the nesting hit on `/testimonials` must vanish.

**Tech Stack:** TanStack Start admin app (`@sevendays/admin`), dnd-kit core 6.3.1 / sortable 10.0.0, react 19.2.8, Playwright chromium for the probe. No other surface.

**Spec:** the #309 agent brief, https://github.com/jeius/sevendays/issues/309 (triaged `bug` + `ready-for-agent` 2026-11-15, comment 6894573832; the brief is the contract, this plan its execution). Finding provenance: the #307 cold-load probe census, BEFORE arm run 1 (2026-11-15), the only hydration-class message on any of the 8 walked CMS routes; the #307 priming race itself is closed (not-reproducible locally, cycle stopped at the evidence gate) and #310 owns the deployed-teaser investigation.

**Triage ruling (already proven, do not re-diagnose):** the mechanism is pinned to source at triage, dnd-kit 6.3.1's `Accessibility` component returns `null` until client-mounted (`if (!mounted) return null` in `core.cjs.development.js`), then renders `HiddenText` (`<div id="DndDescribedBy-…" style="display:none">`) + `LiveRegion` **inline**, as children of `DndContext`'s React parent, because no `accessibility.container` is passed (no portal). Server HTML is clean (SSR renders null there, verified by the triage SSR repro); React dev's `validateDOMNesting` fires at the post-mount client render. The fix relocates where that markup mounts; nothing else.

**UI ruling (the #94 amendment):** this ticket is **not UI-bearing**, `DndContext` renders no wrapper DOM (proven in the triage repro: children render as siblings of the context's own output), so the only DOM change is the two hidden divs' parent. Pixels are byte-identical. If, and only if, the executed edit changes any rendered markup beyond those two hidden divs' DOM position, the executor stops, loads `ui-ux-pro-max` + `ui-styling` per #94, and re-rules with the owner before that edit.

**Scope fence (sibling tickets):** #307 is CLOSED (not-reproducible locally; its probe is this plan's harness, reuse, don't modify). #310 (the deployed-teaser cold-load census) is separate, this plan runs **fully local** and never pokes any deployed environment except the CI deploy watch. Race-class readings in the AFTER arm are recorded for the record, never gated or fixed here.

## Global Constraints

- Branch `fix/309-dnd-tbody-nesting` off current `main` (at `5a6e048` or later). Per-task commits with the subjects pinned per task, each ending `(#309)`.
- Gates: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green **35/35** with the floors **byte-identical** (the brief rules no new seam test, JSX structure is not a pure seam, and the no-DOM-tests house rule stands): **admin 30 files / 310**; **api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped**; **types 18 files / 188**; **db 4 files (2 + 2 skipped) / 22 passed + 8 skipped**; **api-client 5 files / 45**; **landing 17 files / 134**. (Floors read 2026-11-15 @ `6f74c36`; commits through `5a6e048` are docs/graphify-only, no test-tree movement. Fresh clone: `pnpm build:packages` + `pnpm --filter @sevendays/api build` first.)
- **Version pins (read from `apps/admin/node_modules` 2026-11-15 @ `5a6e048`):** `@dnd-kit/core` **6.3.1**; `@dnd-kit/sortable` **10.0.0**; `@dnd-kit/utilities` **3.2.2**; react / react-dom **19.2.8**. No version change anywhere in this plan.
- **Plan-time static probes (all verified 2026-11-15 @ `5a6e048`):**
  - The defect site (`apps/admin/src/components/testimonials/testimonials-screen.tsx`): `<TooltipProvider>` (:542) → `<Table className='@max-[700px]:hidden'>` (:543) → `<TableBody>` (:554) → `<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>` (:555) → `<SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>` (:560) → the rows → `</DndContext>` (:633) → `</TableBody>` (:634). The mobile stacked `DndContext` (:643) wraps a `div.hidden.flex-col`, already valid, untouched. The round-3 two-context law lives in the comment at :638-642.
  - Anchor uniqueness for the edit: exactly one `TooltipProvider` pair (:542/:636), exactly one `@max-[700px]:hidden` Table (:543), and the only `DndContext` preceded by `<TableBody>` is the desktop one, the mobile one is preceded by a `<div`. Every edit below is content-anchored; a ≠1 match means drift, stop and reconcile.
  - Scope (grep `DndContext apps/admin/src`): three consumer files, testimonials-screen (the only table-based sortable; this plan), gallery-screen (rail + grid, div-based), package-editor (three list contexts, div-based). None of the latter five need or get changes.
  - The probe harness (`scripts/probe-cold-hydration.mjs`, the #307-preserved census tool, main `5a6e048`): walks CMS routes as fresh document loads, counts **race-class** hydration messages per route and the **DOM-nesting class** (`/cannot be a child of/`) separately; `PROBE_ROUTES` scopes the walk (comma list, default the eight parameterless CMS routes); `PROBE_BASE_URL` defaults `http://localhost:3000`; headless needs `ADMIN_EMAIL`/`ADMIN_PASSWORD` (supplied at invocation, never committed); it signs in through the real form (the #306 guard) and asserts the `[data-shell-main]` shell. Arms compare **boots**, the script's own header pins: restart the stack between arms.
- **Local dev stack posture (the #294/#306-proven channels, reused verbatim):** the plan runs **fully isolated on the compose test DB** (`sevendays-test-db-5433`, migrations applied). **api**, `wrangler dev -e walk` over a gitignored `apps/api/.dev.vars.walk` (a `sed` copy of `.dev.vars` with `DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test`; deleted after, wrangler dev secrets outrank shell env AND `--var`). **admin**, a temporary, checksum-verified swap of the `DATABASE_URL` + `API_URL` lines in `apps/admin/.env.local` (`API_URL=http://localhost:8787`; the CF vite plugin resolves the worker's `process.env` from `.env.local`, shadowing shell env), record `sha256sum apps/admin/.env.local` before, restore byte-for-byte after, verify the sha. **The local api (:8787) joins the stack.** **:3000 is serial-only**, the landing app is never started (it also pins :3000); both admin dev processes pin ws :9229. Isolation proof before any probe: `GET :8787/api/v1/testimonials` answers **200 JSON**, and the table must be **POPULATED**. With zero rows the screen renders the ruled `<EmptyState>` (`testimonials-screen.tsx:530-534`) and the whole Table subtree (with the `TableBody`-nested `DndContext`) never mounts, no warning can fire. (AMENDMENT 1, controller-ruled at execution 2026-11-15: the plan originally claimed the row count irrelevant, falsified live when the first BEFORE arm read 0 nesting messages on an empty table; Task 2 Step 1b seeds one throwaway row through the supported path. The census run that caught the warning operated on a populated table.)
- **Staff account (test DB 5433):** try the prior walks' accounts (`gallery-walk@local.test` from #294, `login-probe@local.test` from #306), their interactive passwords were known only to those sessions, so if neither signs in, create a fresh throwaway per the documented path (the password is prompted interactively and never rides a flag): `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/admin create-staff --email dnd-walk@local.test --name 'Dnd Walk'`. Throwaway dev-DB rows only, nothing touches deployed environments.
- **Zero visual delta law:** `DndContext` renders no wrapper element; the only DOM change permitted by this plan is the two hidden divs' parent (from `<tbody>` to the context's new position inside the Card body). The rendered pixels must not change; the probe's screenshot-free walk plus the e2e visual suite's continued landing-side green are the backstops.
- **Deploy through CI only.** The push to main fires the `Deploy teaser (main)` run, both legs (`Deploy admin (sevendays-admin)`, `Deploy api (sevendays-api)`) must go green. **Never run any local bare `wrangler deploy`** (the #263/#264 lesson, it wipes the CI-passed `--var`s; the only restore is `gh run rerun <merge-run-id>`).
- `docs/plan.md` has no #309 box (post-M8 standalone bug), untouched. AGENTS.md is untouched (no floor movement, no contract change).

### Not here

- **No #307/#310 work**, race-class readings are recorded verbatim in the evidence file and never gated, chased, or fixed here; the priming race and the deployed-teaser census live on their tickets.
- **No drag-behavior tuning**, `sensors`, `collisionDetection`, `onDragEnd`, the `SortableContext` items/strategy, and every row component stay byte-identical; if the move appears to change drag behavior, the move was executed wrong, revert and re-read the edit steps, never compensate in sensor code.
- **No second-DndContext consolidation**, the round-3 law (two sibling contexts, same sortable ids registered once each, comment :638-642) stands untouched.
- **No a11y redesign**, the described-by instructions and live-region announcements are dnd-kit's contract; this plan only relocates where they mount. No aria attributes added or removed app-side.
- **No mobile-posture changes**, the stacked DndContext (:643) and its div rows are already valid; untouched.
- **No component/DOM test additions to the admin suite** (the no-DOM-tests house rule), the brief rules no new seam test; floors stay byte-identical.
- **No e2e/visual-suite edits**, `e2e/visual/` is landing-only (ADR-0022) and never joins `pnpm check`.
- **No `docs/architecture.md`/`docs/tech-stack.md` edits; no new ADR**, a DOM-position fix inside one component is not an architectural decision.

---

### Task 1: branch + plan commit

**Files:**
- Commit: this plan file (the branch's first commit)

- [ ] **Step 1: branch + plan commit**

  ```bash
  git checkout main && git pull --ff-only && git checkout -b fix/309-dnd-tbody-nesting
  git add docs/superpowers/plans/2026-11-15-309-dnd-tbody-nesting.md
  git commit -m "docs: the #309 div-in-tbody fix plan (#309)"
  ```

### Task 2: stack up + the BEFORE arm, the probe must see the defect (no commit)

The BEFORE arm is the harness's sanity gate: if the probe cannot see the nesting hit on unfixed code, its AFTER zero proves nothing, stop and reconcile, never proceed to the fix blind. Evidence lands in `.superpowers/sdd/2026-11-15-309-dnd-tbody-nesting/evidence.md` as the task runs (readings verbatim).

**Files:**
- None on the repo. Evidence in `.superpowers/sdd/2026-11-15-309-dnd-tbody-nesting/evidence.md` (gitignored, the #294/#306 precedent); the triage SSR repro stays at `/tmp/repro-309/` (never committed).

**Interfaces:**
- Consumes: the dev-stack posture + staff account (Global Constraints), `scripts/probe-cold-hydration.mjs` unchanged.
- Produces: the BEFORE reading (`nestingByRoute['/testimonials'] ≥ 1`, everything else 0), the baseline Task 4's AFTER arm clears.

- [ ] **Step 1: start the stack on the unfixed branch (the proven channels)**

  ```bash
  # Terminal A, the local API (:8787) over the env-scoped dev-vars copy:
  sed 's|^DATABASE_URL=.*|DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test|' apps/api/.dev.vars > apps/api/.dev.vars.walk
  cd apps/api && pnpm exec wrangler dev -e walk
  # Terminal B, the admin (:3000) after the checksum-verified .env.local swap:
  #   sha256sum apps/admin/.env.local   # record it in evidence.md
  #   swap DATABASE_URL → the 5433 test DB, API_URL → http://localhost:8787
  pnpm --filter @sevendays/admin dev
  ```

  Wait for both readiness lines. Isolation proof: `GET :8787/api/v1/testimonials` answers 200 JSON. Sign in once interactively (or via the probe's form fill) to confirm the staff account works; record which account in `evidence.md`.

- [ ] **Step 1b: seed one throwaway testimonial (AMENDMENT 1, the table must be populated)**

  The staff account first (the #306-ledgered non-interactive adaptation, AFTER the swap so it lands on 5433):

  ```bash
  pnpm --filter @sevendays/admin create-staff --email dnd-walk@local.test --name 'Dnd Walk' --password '<chosen throwaway>' --yes
  ```

  Then the seed through the supported path, sign in via the documented probe, POST through the session-gated admin API (create shape: `{ quote, person, isActive? }`; position is owned by the order PUT, not create):

  ```bash
  # sign in (Origin header required, the #242 lesson):
  curl -s -o /dev/null -w "sign-in → %{http_code}\n" -c <workspace>/cookies.txt \
    -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
    -d '{"email":"dnd-walk@local.test","password":"<chosen throwaway>"}' \
    http://localhost:3000/api/auth/sign-in/email
  # seed one testimonial (full-object POST):
  curl -s -o /dev/null -w "seed POST → %{http_code}\n" -b <workspace>/cookies.txt \
    -H "Content-Type: application/json" \
    -d '{"quote":"The gallery rail overflow fix (#294) shipped clean, our mobile bookings went up the same week.","person":"Dnd Walk Probe","isActive":true}' \
    http://localhost:8787/api/v1/admin/testimonials
  # verify the public read serves it (active-only):
  curl -s http://localhost:8787/api/v1/testimonials
  ```

  Expected: sign-in 200, seed POST 201, the public read returns the row. Throwaway test-DB data only; never hand-written SQL.

- [ ] **Step 2: run the BEFORE arm, scoped to the defect route**

  ```bash
  ADMIN_EMAIL=<account> ADMIN_PASSWORD=<password> \
    PROBE_ROUTES=/testimonials node scripts/probe-cold-hydration.mjs
  ```

  The script prints per-route buckets. **Expected (red, the harness sees the defect):** the `/testimonials` **nesting-class bucket holds ≥ 1** message matching `cannot be a child of` (the `DndDescribedBy` div-in-tbody warning); the race-class bucket for `/testimonials` is recorded verbatim but NOT gated (the #307 fence). **Stop rule:** if the nesting bucket reads **0**, the harness contradicts the triage repro, do not edit anything: post the full reading + stack posture on #309 as a triage note, flip it back to `needs-info`, stop. The plan ends there.

- [ ] **Step 3: write the evidence file**

  `evidence.md`: the stack posture (env swap shas, account used, isolation proof), the BEFORE per-route buckets verbatim. Commit nothing. Task 3's gates (typecheck/test) run without the stack, leave it up or down as convenient; Task 4 restarts the whole stack fresh per the arms-compare-boots contract regardless.

### Task 3: the fix, the desktop DndContext wraps the `<Table>` (one commit)

Three content-anchored replaces on `testimonials-screen.tsx`, then the fix-site comment, then biome normalizes indentation. No other file changes.

**Files:**
- Modify: `apps/admin/src/components/testimonials/testimonials-screen.tsx` (the :542-:636 desktop block only)

**Interfaces:**
- Consumes: nothing new, the existing `DndContext`/`SortableContext` imports and props are untouched; the mobile stacked `DndContext` (:643) keeps its own context.
- Produces: the corrected JSX, `<TooltipProvider><DndContext …><Table …>…</Table></DndContext></TooltipProvider>` with `<SortableContext>` still directly inside `<TableBody>`.

- [ ] **Step 1: edit A, lift the open tag above the `<Table>`**

  Find (unique: the only `<TooltipProvider>` immediately followed by the `@max-[700px]` Table):

  ```tsx
              <TooltipProvider>
                <Table className='@max-[700px]:hidden'>
  ```

  Replace with:

  ```tsx
              <TooltipProvider>
                {/* #309: DndContext wraps the <Table>, not the <tbody> children:
                    dnd-kit's Accessibility subtree (the display:none DndDescribedBy
                    instructions div and the live-region div) renders inline at the
                    context's React position post-mount (it renders null until
                    mounted, and no portal container is set). Inside <TableBody>
                    that landed two <div>s as <tbody> children: an invalid content
                    model React dev flags as a hydration-class warning. Context
                    flows through the React tree regardless of DOM position, the
                    rows' useSortable wiring is unchanged. The mobile stacked
                    DndContext below already wraps divs, so it stays. */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <Table className='@max-[700px]:hidden'>
  ```

- [ ] **Step 2: edit B, remove the old open tag from inside the `<TableBody>`**

  Find (unique: the only `<DndContext>` preceded by `<TableBody>`):

  ```tsx
                  <TableBody>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={onDragEnd}
                    >
                      <SortableContext
  ```

  Replace with:

  ```tsx
                  <TableBody>
                    <SortableContext
  ```

- [ ] **Step 3: edit C, move the close tag below the `</Table>`**

  Find (unique: the only `</DndContext>` immediately before `</TableBody>`):

  ```tsx
                      </SortableContext>
                    </DndContext>
                  </TableBody>
                </Table>
              </TooltipProvider>
  ```

  Replace with:

  ```tsx
                    </SortableContext>
                  </TableBody>
                </Table>
                </DndContext>
              </TooltipProvider>
  ```

- [ ] **Step 4: normalize formatting, verify the desktop block, run the scoped gates**

  ```bash
  pnpm --filter @sevendays/admin fix
  git diff --stat   # exactly one file: testimonials-screen.tsx
  pnpm --filter @sevendays/admin typecheck
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/admin test
  ```

  Expected: biome reformats the moved block (indentation only, the comment and JSX structure are yours to inspect); typecheck clean; the admin suite green at **30 files / 310**, floors byte-identical. Then read the final desktop block (`TooltipProvider → DndContext → Table → TableBody → SortableContext`) and the mobile block, the mobile `DndContext` (:643) and the round-3 comment must be untouched. Any diff beyond `testimonials-screen.tsx` is a plan violation, revert and re-read.

- [ ] **Step 5: commit**

  ```bash
  git add apps/admin/src/components/testimonials/testimonials-screen.tsx
  git commit -m "fix(admin): the testimonials sortable's accessibility divs move out of the tbody (#309)"
  ```

### Task 4: the AFTER arm + the full gate (no commit)

Arms compare boots (the probe's own header): **restart the whole stack**, kill both Terminals A/B, delete `.dev.vars.walk`, recreate it, reboot both processes (the `.env.local` swap stays in place for the whole session). This is also the fix's own fresh-boot proof: the admin dev server must serve the fixed component.

**Files:**
- None on the repo. Evidence appends to `.superpowers/sdd/2026-11-15-309-dnd-tbody-nesting/evidence.md`.

**Interfaces:**
- Consumes: the Task 3 commit live on the running stack; the BEFORE reading in `evidence.md`.
- Produces: the AFTER reading, the acceptance record.

- [ ] **Step 1: restart the stack fresh and re-isolate**

  Same commands as Task 2 Step 1 (the Step 1b seed row persists on 5433, the table stays populated for both arms). Isolation proof again: `GET :8787/api/v1/testimonials` answers 200 JSON **with the seed row present**.

- [ ] **Step 2: run the AFTER arm, the full 8-route walk (the census shape)**

  ```bash
  ADMIN_EMAIL=<account> ADMIN_PASSWORD=<password> node scripts/probe-cold-hydration.mjs
  ```

  No `PROBE_ROUTES`, the default eight routes. **Expected (green, the acceptance):** the **nesting-class bucket is 0 for `/testimonials` and 0 for all eight routes**; race-class buckets are recorded verbatim per route and NOT gated (the #307 fence, a nonzero race reading is a #307/#310 record, never a fix here). **Stop rule:** any surviving nesting-class message on `/testimonials` means the move did not relocate the markup, revert to Task 3, re-read the final block, and reconcile; never iterate blind.

- [ ] **Step 3: the full `pnpm check` gate + restore obligations**

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Green **35/35**, floors byte-identical per the Global Constraints. Then the `.env.local` swap stays until the session ends, record in `evidence.md` that restoration is Task 7's step (the sha + the verified restore are pinned there), so the walk evidence survives a mid-plan interruption.

### Task 5: the progress record

**Files:**
- Modify: `docs/progress.md` (one What-Exists bullet)

- [ ] **Step 1: append the record**

  Directly after the last What-Exists bullet (content-anchored: the `## Known Gaps / Not Yet Done` heading must still follow it):

  ```text
  - The **testimonials sortable table's invalid HTML nesting is fixed** (2026-11-15, #309): the desktop `DndContext` moved out of the `<tbody>` to wrap the `<Table>`, dnd-kit's Accessibility subtree (the `display:none` DndDescribedBy instructions div + the live-region div) renders inline at the context's position post-mount, so the tbody placement landed two divs as tbody children (the hydration-class warning the #307 census caught). Zero visual delta, drag wiring untouched; `scripts/probe-cold-hydration.mjs` reads the nesting class **0 on all eight CMS routes** across a fresh-boot BEFORE/AFTER pair.
  ```

  Commit:

  ```bash
  git add docs/progress.md
  git commit -m "docs: the #309 div-in-tbody fix record in progress.md (#309)"
  ```

### Task 6: gates recap, push, PR, merge, watch the deploy

**Files:** none new.

- [ ] **Step 1: gates**, already green from Task 4 Step 3 (`TEST_DATABASE_URL=…:5433/sevendays_test pnpm check`, 35/35, floors byte-identical); re-run only if any commit landed after it. From the repo root (fresh clone: `pnpm build:packages` + `pnpm --filter @sevendays/api build` first).

- [ ] **Step 2: push + PR**

  ```bash
  git push -u origin HEAD
  gh pr create --title "fix(admin): the testimonials sortable's accessibility divs move out of the tbody (#309)" --body-file - <<'EOF'
  #309, found during the #307 cold-load probe census (BEFORE arm run 1, the only hydration-class message on any of the 8 walked CMS routes): on `/testimonials`, React (dev) logged `In HTML, <div> cannot be a child of <tbody>`, dnd-kit 6.3.1's Accessibility subtree (the `display:none` DndDescribedBy instructions div + the live-region div) renders inline at the `DndContext`'s React position post-mount (it renders null until mounted; no portal container is set), and the desktop context sat inside `<TableBody>`, landing two `<div>`s as `<tbody>` children, an invalid content model.

  - **The change:** the desktop `DndContext` now wraps the `<Table>` (inside the existing `TooltipProvider`); `SortableContext`, the rows, sensors, and `onDragEnd` are byte-identical, React context flows through the tree regardless of DOM position. The mobile stacked `DndContext` (already div-wrapped) and the round-3 two-context law are untouched. Zero visual delta, the only DOM change is the two hidden divs' parent.
  - **Verified:** `scripts/probe-cold-hydration.mjs` BEFORE arm (unfixed boot): the `/testimonials` nesting bucket ≥ 1. AFTER arm (fresh-boot, full 8-route walk): nesting class **0 on all eight routes** (race-class recorded, not gated, the #307 fence). `pnpm check` 35/35, floors byte-identical (no new tests, JSX structure, not a pure seam).
  - **Scope:** the only table-based sortable in the app; gallery/package-editor contexts are div-based and untouched. #307/#310 race work is fenced to their tickets.
  EOF
  ```

- [ ] **Step 3: CI green on the PR, then squash-merge.** Record the merge SHA.

- [ ] **Step 4: watch the deploy**, `gh run list --branch main --limit 1`, verify the run's head SHA matches the merge SHA (the #271 lesson), then `gh run watch <run-id>` until the `Deploy teaser (main)` legs finish. **Both legs green: `Deploy admin (sevendays-admin)` AND `Deploy api (sevendays-api)`.** Record the run id (the restore vehicle: `gh run rerun <run-id>`).

### Task 7: the evidence comment, the close, restore, graphify, the v1 pick

**Files:**
- Edit: `docs/agents/v1-picks.md` (the ledger row, main-side, direct commit per the ledger precedent)

- [ ] **Step 1: restore the admin `.env.local`, verify the sha, delete `.dev.vars.walk`**

  ```bash
  # restore the swapped DATABASE_URL/API_URL lines byte-for-byte, then:
  sha256sum apps/admin/.env.local   # must equal the recorded pre-swap sha
  rm apps/api/.dev.vars.walk
  ```

- [ ] **Step 2: post the evidence comment on #309 and close it** (fill every `<…>` from `evidence.md` verbatim):

  ```bash
  gh issue comment 309 --body "Fixed (the full probe record is the plan's evidence file, key readings below).
  - Before (unfixed boot, scoped walk): /testimonials nesting bucket <the verbatim BEFORE reading>.
  - After (fresh-boot, full 8-route walk): nesting class 0 on all eight routes; race-class buckets <the verbatim AFTER reading, recorded, not gated>.
  - The change: the desktop DndContext wraps the <Table> (inside the TooltipProvider); SortableContext/rows/sensors/onDragEnd byte-identical; the mobile stacked context untouched. Zero visual delta.
  - PR #<PR>, merge <sha>, deploy run <run-id> both legs green."
  gh issue close 309 --reason completed
  ```

- [ ] **Step 3: graphify** (a symbol's position changed, the AGENTS.md rule):

  ```bash
  git checkout main && git pull --ff-only
  graphify update .
  git add graphify-out/
  git commit -m "chore(graphify): post-#309 graph update"
  git push origin main
  ```

- [ ] **Step 4: the v1 pick**, triage per `docs/agents/v1-picks.md`: `node scripts/v1-triage.mjs <merge-sha>`. Expected shape: **SPLIT**, `testimonials-screen.tsx` is v1-paths; `docs/progress.md` and the plan file are main-only drops. Execute the pick per the runbook (cherry-pick the squash commit onto `v1`, resolve main-only paths as drops), then from the **main repo root**:

  ```bash
  pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check
  node scripts/audit-v1-absence.mjs HEAD --repo <v1-worktree-path>   # main-root invocation, the in-worktree run MODULE_NOT_FOUNDs (the #286 lesson); expect exit 0 / PASS 0/18
  git push origin v1
  ```

  Watch the run **sha-verified** (the #271 lesson): `check` success, `Deploy v1 (private)` success, `Deploy teaser (main)` skipped. Record the actual v1 floors (expected: **admin 30 files / 310**; **api 31 files (30 passed + 1 skipped) / 392 passed + 3 skipped**, v1's own).

- [ ] **Step 5: the ledger row**, one row appended to `docs/agents/v1-picks.md` (the #294/#306 rows as the format template; `<…>` cells execution-filled):

  ```text
  | 2026-11-<d> | #<PR> | <merge-sha> | <actual classifier class> | <v1-sha | no-pick> | #309, the testimonials sortable's accessibility divs rendered as <tbody> children (dnd-kit's post-mount inline Accessibility subtree; the #307 census's only hydration-class hit). Fixed by moving the desktop DndContext out of the <tbody> to wrap the <Table>, zero visual delta, drag wiring byte-identical; probe BEFORE/AFTER arms on fresh boots (nesting 0 on all eight routes after). Classifier <actual>, <v1-paths + main-only drops>. Content pass <clean | findings>. Locks on <v1-sha>: <floors as recorded>. Run <run-id | ->: <leg verdicts>. Main side: PR #<PR> squash-merged after CI green; the evidence comment on #309. |
  ```

  Commit:

  ```bash
  git add docs/agents/v1-picks.md
  git commit -m "docs(v1-picks): #309 ledger row - the testimonials tbody-nesting fix (carries)"
  git push origin main
  ```

---

## Self-review notes for the executor

- **Pin inventory (all read/probed 2026-11-15 @ `5a6e048`):** the version pins; the defect-site nesting (:542-:636) + the mobile context (:643) + the round-3 comment (:638-642); the anchor uniqueness (one `TooltipProvider` pair, one `@max-[700px]` Table, one `TableBody`-preceded `DndContext`); the dnd-kit `Accessibility` mechanism (`if (!mounted) return null` → inline `HiddenText` + `LiveRegion`, no portal container); the triage SSR repro's SSR-clean server HTML (throwaway at `/tmp/repro-309/`, never committed); the DndContext-consumers scope grep (three files, only one table-based); the probe script's interface + arms-compare-boots contract; the check floors (admin 30/310, api 34 files / 471+3sk, types 18/188, db 4 files / 22+8sk, api-client 5/45, landing 17/134, read @ `6f74c36`, unchanged through `5a6e048`); the dev-stack posture channels (proven live in the #294/#306 walks); the 5433 staff-row precedent.
- **No type-inference spike needed**, the plan makes no library inference claim. The load-bearing library fact (`Accessibility` renders null until mounted, then inline) is pinned from the installed dist source at triage, and the BEFORE arm re-proves the whole chain live before any edit is trusted.
- **Why no new test:** JSX structure is not a pure seam; the admin suite is lib-seam-only over pure functions, and the no-DOM-tests house rule stands (the brief rules this explicitly). The acceptance is the probe's BEFORE/AFTER pair, a scripted, repeatable harness, not a prose claim. If a reviewer proposes a DOM test, the Global Constraint pins it out.
- **Test-count arithmetic:** every task moves nothing, floors byte-identical across the whole plan. Any floor movement is a plan violation to be reconciled, never padded.
- **The two stop rules are load-bearing:** Task 2 Step 2's zero-nesting stop (the harness must see the defect before the fix means anything) and Task 4 Step 2's surviving-nesting stop (the move failed, reconcile, never iterate blind). Both leave #309 open with the evidence trail.
- **If line numbers shifted** (an intervening commit): every edit/anchor here is content-anchored, not line-anchored; a ≠1 match means drift, stop and reconcile.
- **Every deliberate non-feature has its pin:** no race-class work, no sensor tuning, no context consolidation, no a11y redesign, no mobile changes, no DOM tests, no e2e edits, no ADR. A reviewer proposing any should be pointed at the matching pin.



