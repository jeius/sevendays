# Gallery upload picker — JPG-only accept + the cap said up front (#170) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin gallery's batch-upload picker honest and up front about its constraint: the hidden input's `accept` narrows from `image/*` to `image/jpeg` (the OS picker stops offering PNG/HEIC files that could only fail the JPG-only courtesy pre-check), and the PageHeader's `Upload photos` affordance carries the muted caption `JPG files up to 50 MiB.` so the cap is said before failure, not at it.

**Architecture:** Two one-hunk edits in `apps/admin` plus bookkeeping. The hidden input lives in `gallery-screen.tsx` (the route's label opens it by id) — its `accept` flips to the package editor's cover-input literal and its ruling comment is rewritten (the #165 Q7(a) ruling supersedes the prototype's accept ruling). The caption lands beside the affordance in `_shell.gallery.tsx`'s PageHeader actions — the always-visible seat, plain `text-muted-foreground` so both themes carry it with no extra styling. No seam, test, or API movement: the pre-check stays as-is (client gates are courtesy; the server re-verifies — #136 discipline). Then the docs rotation, the PR, and the v1 pick (expected SPLIT).

**Tech Stack:** TanStack Start admin over the shared `packages/ui` primitives (`PageHeader` from `cms/shared.tsx`), Tailwind v4 semantic tokens (`text-muted-foreground`), Biome + tsc workspace gates, GitHub CLI + `scripts/v1-triage.mjs` (the v1 pick).

**Spec:** GitHub issue #170 (`ready-for-agent`), ruled at #165 round 1 Q7 a+f — "(a) the accept mismatch fix + (f) the 50 MiB cap said up front — cut now as a quick win outside the map". Sibling fence: the other Q7 in-scope items — drag-and-drop (b), in-flight cancel (d), the leaving-mid-upload confirmation (c) — belong to the #165-ruled "Upload UI maturation" milestone ticket and never land here.

## Recon state this plan starts from (verified live 2026-09-30, pre-plan)

- **Main is at `64e2af4`** (the #169 ledger-correction commit). Admin suite floor verified live: **6 files / 55 tests**. `pnpm check` **35/35** + `pnpm build` **7/7** (the #155-pinned baselines; #169 moved neither — copy-only).
- **The hidden input:** `apps/admin/src/components/gallery/gallery-screen.tsx:1154-1164` — `accept='image/*'` at `:1159`; the ruling comment at `:1151-1153` ends "The accept ruling is the prototype's: the pre-check is the JPG gate." Both are rewritten by Task 1 (the comment is now stale against the #165/#170 ruling).
- **The reference literal:** `apps/admin/src/components/packages/package-editor.tsx:854` carries `accept='image/jpeg'` — grep-verified the ONLY other `accept=` attribute in `apps/admin/src`.
- **The affordance:** `apps/admin/src/routes/_shell.gallery.tsx:23-45` — the `Upload photos` label-button in PageHeader `actions`. `PageHeader` (`apps/admin/src/components/cms/shared.tsx:49-67`) seats actions inside `<div className='flex items-center gap-2'>` — a fragment sibling lands beside the button with the row's own gap; the header's outer `flex flex-wrap` wraps the actions block under the title on narrow viewports, so button + caption stay together on mobile.
- **The pre-check:** `apps/admin/src/lib/batch-photo-upload.ts:97-105` (`preCheckFile`) — JPG-only (`file.type !== 'image/jpeg'` → `Only JPG files are supported.`) and `50 * 1024 * 1024` (→ `That file is over the 50 MiB cap.`). Its lib-seam tests (`apps/admin/src/lib/batch-photo-upload.test.ts:41-51`) pin those messages — both UNTOUCHED (the ticket: "The pre-check stays as-is").
- **The empty states:** `gallery-screen.tsx:1205-1217` — the `'No photos yet.'` variant carries its own upload button; both variants' lines carry `TODO(owner-copy)` markers (#134 open items) — NOT touched here (fenced in Global Constraints).
- **No component/DOM tests exist in admin** (lib-seam only, per #143) — this change has no seam to test; the gates are typecheck/lint/test plus the literal greps and the built-chunk check (Task 1 Steps 3/5).
- **`docs/progress.md`:** `## What Exists` (`:60`) … `## Known Gaps / Not Yet Done` (`:213`); the last What Exists bullet is the #167/#168 entry at `:211` — Task 2's entry appends directly after it.
- **The working tree carries pre-existing dirty `graphify-out/` + `apps/*/CONTEXT.md` files** (the AGENTS.md-expected state) — every `git add` in this plan names its files explicitly; the graphify churn is never swept in (the #157/#169 practice — their PRs carried only code + progress.md + the plan file).
- **Issue #170's body has no checkboxes** (`## What's wrong` / `## Fix` / `## Notes` prose only) — nothing flips on the issue; "Closes #170" in the PR body is the whole close-out.

## Global Constraints

- **Owner-proposed copy, VERBATIM (ticket #170, ruling #165 Q7 f):** the caption is exactly `JPG files up to 50 MiB.` — plain ASCII, trailing period, never re-worded, never "fixed".
- **The accept literal:** `accept='image/jpeg'` — byte-identical to `package-editor.tsx:854` (the ticket's named reference).
- **Caption styling:** `className='text-muted-foreground text-xs'` — the semantic muted token only (theme-free by construction, per the ticket's "plain `text-muted-foreground` so both themes carry it with no extra styling"); `text-xs` is the house caption scale (the upload tray's status line, `gallery-screen.tsx:467`, and the package editor's per-file status line both use it).
- **Placement ruling (this plan, exercising the ticket's "and/or" latitude):** ONE caption, beside the PageHeader action — the always-visible seat (the route mounts the header above the screen in every state, so both empty-state variants render under it). The empty-state variant gets NO caption of its own: its copy block is #134-owner-pending and stays untouched.
- **Scope fence ("not here"):** NO drag-and-drop onto the grid (Q7 b), NO in-flight cancel (Q7 d), NO leaving-mid-upload confirmation (Q7 c) — those are the "Upload UI maturation" milestone ticket's; NO `preCheckFile` change (client gates are courtesy, the server re-verifies — #136); NO package-editor or cover-upload change; NO empty-state copy change; NO new tests or lib seams (admin stays 6 files / 55 tests); NO AGENTS.md rotation (no status sentence names picker behavior); NO rendered-variant frames (not a new composition — a copy line on an existing composition, the #111 ruling's scope; the #169 copy-fix precedent).
- **Gates, per task:** `pnpm --filter @sevendays/admin typecheck` zero errors (HARD gate) before any commit; `pnpm --filter @sevendays/admin fix` then `pnpm --filter @sevendays/admin lint` clean on touched files; `pnpm --filter @sevendays/admin test` green at **6 files / 55 tests, unchanged**. Full `pnpm check` (**35/35**) + `pnpm build` (**7/7**) before the PR (Task 3).
- **Baselines:** admin **6 files / 55 tests**; api **290 passed + 3 skipped / 24 files**; landing **8 / 69**; api-client **5 / 33**; types **13 / 112**. Nothing but admin + docs moves in this plan.
- **Fresh-clone order (house):** `pnpm install && pnpm build:packages` before any typecheck — `@sevendays/config/vitest` is a built entry and the api-client resolves the API's `AppType` from the built `dist/`.
- **Docs house rules:** repo-docs checklist ticks are `- [✅]`, never `[x]`; GitHub issue checkboxes flip with `- [x]` (none exist on #170); `docs/progress.md` is main-only; every squash-merged PR gets its v1 triage (`docs/agents/v1-picks.md`).
- **No new dependencies. No new source files** — the footprint is two modified admin files, `docs/progress.md`, and this plan file.
- **Graphify:** `graphify update .` runs after the code lands (the AGENTS.md rule) but its churn is NOT committed into this PR — the dirty `graphify-out/` state predates this ticket and belongs to the owner's next graph commit.
- **Plan file target:** `docs/superpowers/plans/2026-09-30-170-gallery-upload-picker.md` (this file).

---

### Task 1: The JPG-only picker + the cap caption

**Files:**
- Modify: `apps/admin/src/components/gallery/gallery-screen.tsx:1151-1159` (the hidden input's comment + `accept`)
- Modify: `apps/admin/src/routes/_shell.gallery.tsx:23-45` (the PageHeader actions — the caption sibling)

**Interfaces:**
- Consumes: the existing `id='gallery-upload-input'` coupling (unchanged — the route's label still opens the screen's input by id); `PageHeader`'s actions slot (`cms/shared.tsx:64`).
- Produces: nothing downstream — Task 2/3 consume only the landed branch. The caption string is pinned in Global Constraints and inlined at its single consumer; it is deliberately NOT an exported constant (one consumer; the `QUERY_ERROR_LINE` precedent exports only because eight screens share it).

- [ ] **Step 0: Cut the branch and re-pin the baseline**

```bash
cd /home/jeius/Projects/sevendays
git checkout main && git pull --ff-only
git log --oneline -1   # expect 64e2af4 or later
git checkout -b fix/170-gallery-upload-picker
pnpm install && pnpm build:packages
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests "
```

Expected: admin `6 passed (6)` files / `55 passed (55)` tests. If the floor moved, record the new floor in the PR body (Task 3 Step 2) — this plan adds no tests, so nothing else derives from it.

- [ ] **Step 1: The input's `accept` + its ruling comment (`gallery-screen.tsx`)**

Replace the comment + input block (the current `:1151-1159` region), old → new:

```tsx
      {/* The hidden input + its ref live in the SCREEN — the route's
          `Upload photos` label opens it by id (no route logic). The accept
          ruling is the prototype's: the pre-check is the JPG gate. */}
      <input
        ref={fileInputRef}
        id='gallery-upload-input'
        type='file'
        multiple
        accept='image/*'
```

```tsx
      {/* The hidden input + its ref live in the SCREEN — the route's
          `Upload photos` label opens it by id (no route logic). The
          picker is JPG-only (#170, ruling #165 Q7 a): accept matches
          the pre-check's gate — the package editor's cover input is
          the reference. The pre-check stays the courtesy gate; the
          server re-verifies (#136). */}
      <input
        ref={fileInputRef}
        id='gallery-upload-input'
        type='file'
        multiple
        accept='image/jpeg'
```

(The input's remaining attributes — `className='hidden'`, `tabIndex={-1}`, `aria-hidden='true'`, `onChange={onFilesChosen}` — are untouched.)

- [ ] **Step 2: The caption beside the affordance (`_shell.gallery.tsx`)**

Replace the PageHeader `actions` block (the current `:23-45` region), old → new:

```tsx
        actions={
          // The label/htmlFor pair opens the screen's hidden input — the id
          // is this file's one coupling point (zero route logic). The label
          // carries the button's render prop: Base UI merges the Button's
          // classes/props onto it. nativeButton={false} tells Base UI the
          // render target is not a native <button> (suppresses the dev-mode
          // console error and applies the full useButton keyboard state),
          // and tabIndex={0} gives the label its tab stop.
          <Button
            nativeButton={false}
            render={
              <label
                htmlFor='gallery-upload-input'
                className='cursor-pointer'
                // biome-ignore lint/a11y/noNoninteractiveTabindex: this label is a Base UI <Button> render target (nativeButton={false}) — an interactive control at runtime, so it needs its own tab stop
                tabIndex={0}
              >
                <ImagePlus aria-hidden='true' />
                Upload photos
              </label>
            }
          />
        }
```

```tsx
        actions={
          // The label/htmlFor pair opens the screen's hidden input — the id
          // is this file's one coupling point (zero route logic). The label
          // carries the button's render prop: Base UI merges the Button's
          // classes/props onto it. nativeButton={false} tells Base UI the
          // render target is not a native <button> (suppresses the dev-mode
          // console error and applies the full useButton keyboard state),
          // and tabIndex={0} gives the label its tab stop.
          <>
            <Button
              nativeButton={false}
              render={
                <label
                  htmlFor='gallery-upload-input'
                  className='cursor-pointer'
                  // biome-ignore lint/a11y/noNoninteractiveTabindex: this label is a Base UI <Button> render target (nativeButton={false}) — an interactive control at runtime, so it needs its own tab stop
                  tabIndex={0}
                >
                  <ImagePlus aria-hidden='true' />
                  Upload photos
                </label>
              }
            />
            {/* #170 (ruling #165 Q7 f): the picker's constraint said up
                front — plain text-muted-foreground, so both themes carry
                it with no extra styling. The PageHeader's actions row
                (flex items-center gap-2) seats it beside the affordance;
                it renders in every screen state, the empty states
                included (the route always mounts the header above the
                screen). */}
            <p className='text-muted-foreground text-xs'>JPG files up to 50 MiB.</p>
          </>
        }
```

(The `Button` element and the biome-ignore line are byte-identical to the old block — only the fragment wrapper, the re-indent, and the caption `<p>` are new.)

- [ ] **Step 3: The literal greps**

```bash
cd /home/jeius/Projects/sevendays
grep -n "accept='image/jpeg'" apps/admin/src/components/gallery/gallery-screen.tsx
grep -rn "accept='image/\*" apps/admin/src || echo 'no image/* left'
grep -n 'JPG files up to 50 MiB\.' apps/admin/src/routes/_shell.gallery.tsx
```

Expected: line 1 prints exactly ONE hit (the gallery input; package-editor's is a different file); line 2 prints `no image/* left` (zero hits anywhere in admin); line 3 prints exactly ONE hit (the caption). Any other count means a typo landed — fix it at the source line, never by adding a second one.

- [ ] **Step 4: The workspace gates**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/admin lint
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests "
```

Expected: tsc zero errors; biome clean (`fix` may reflow the new JSX — let it, then re-run the Step 3 greps if it touched the strings' lines); tests `6 passed (6)` / `55 passed (55)` — unchanged, no seam moved.

- [ ] **Step 5: The built-chunk check — the string ships**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin build
grep -rFl 'JPG files up to 50 MiB.' apps/admin/dist/client | head -3
```

Expected: at least one built chunk path prints (the gallery route chunk carries the caption literal — TanStack Start emits `dist/client/`, per the v1.168 output shape pinned in `docs/progress.md`'s Notes). Zero hits = the edit landed somewhere the router doesn't reach, or the build failed — stop and re-check Step 2 before committing.

- [ ] **Step 6: Commit**

```bash
cd /home/jeius/Projects/sevendays
git add apps/admin/src/components/gallery/gallery-screen.tsx apps/admin/src/routes/_shell.gallery.tsx
git commit -m "fix: gallery upload picker — JPG-only accept + the 50 MiB cap said up front (#170)"
```

**Not here:** no `preCheckFile` edit; no empty-state copy; no package-editor touch; no tests added or moved; no AGENTS.md sentence.

---

### Task 2: The docs rotation + the graph refresh

**Files:**
- Modify: `docs/progress.md` (one bullet at the What Exists tail)
- Modify (refresh only, NEVER committed here): `graphify-out/` via `graphify update .`
- Add: `docs/superpowers/plans/2026-09-30-170-gallery-upload-picker.md` (this file — already on disk in the working tree; it rides the branch and lands in this commit)

**Interfaces:**
- Consumes: Task 1's landed code (the entry describes it).
- Produces: the progress record Task 3's PR carries; nothing code-side.

- [ ] **Step 1: The progress entry**

In `docs/progress.md`, insert this bullet immediately AFTER the `#167/#168` entry (the last `## What Exists` bullet, `:211` at plan time) and BEFORE the `## Known Gaps / Not Yet Done` heading, verbatim:

```markdown
- **The gallery upload picker's quick win landed (2026-09-30, #170 — ruling #165 Q7 a+f, cut outside the maturation map):** the batch-upload input's `accept` is `image/jpeg` (was `image/*` — the OS picker offered PNG/HEIC files that could only fail the JPG-only courtesy pre-check; the package editor's cover input is the reference literal), and the gallery PageHeader's `Upload photos` affordance carries the muted caption `JPG files up to 50 MiB.` so the cap is said up front, not only at failure — plain `text-muted-foreground` at the always-visible seat (both empty-state variants render under the header). The pre-check stays as-is (client gates are courtesy; the server re-verifies — #136 discipline). The other #165 Q7 items — drag-and-drop, in-flight cancel, the leaving-mid-upload confirmation — stay with the "Upload UI maturation" milestone ticket.
```

- [ ] **Step 2: The graph refresh (churn stays uncommitted)**

```bash
cd /home/jeius/Projects/sevendays
graphify update .
```

Expected: the incremental AST update runs clean (no API cost). The resulting `graphify-out/` churn — which mixes with the tree's PRE-EXISTING dirty graph state — is NOT committed by this plan: the Step 3 `git add` names its files, and the graphify churn belongs to the owner's next graph commit (the #157/#169 practice).

- [ ] **Step 3: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm fix && pnpm lint
git add docs/progress.md docs/superpowers/plans/2026-09-30-170-gallery-upload-picker.md
git commit -m "docs: #170 — gallery-picker progress entry + the plan file (#170)"
```

Expected: biome clean over the touched docs; the commit carries exactly the two named files (`git status --porcelain` still shows the pre-existing dirty graphify-out/CONTEXT.md files — that is correct, leave them).

**Not here:** no AGENTS.md rotation (no status sentence names picker behavior); no issue comment beyond the PR itself (the ticket already carries the copy — the PR + this progress entry are the record); no issue-checkbox flips (#170's body has none); no `docs/plan.md` tick (post-milestone quick win — the issue owns the tracking).

---

### Task 3: Full gates, the PR, the v1 pick, and the ledger

**Files:**
- Modify (bookkeeping): the PR + `docs/agents/v1-picks.md` ledger row

**Interfaces:**
- Consumes: Tasks 1-2 (all landed on `fix/170-gallery-upload-picker`).
- Produces: the squash-merged PR, its v1 pick (expected SPLIT), and the ledger row.

- [ ] **Step 1: The full gates**

```bash
cd /home/jeius/Projects/sevendays
pnpm install && pnpm build:packages
pnpm check   # expect 35/35 (admin suite real at 6 files / 55 tests, unchanged)
pnpm build   # expect 7/7
```

- [ ] **Step 2: The PR**

```bash
cd /home/jeius/Projects/sevendays
git push -u origin fix/170-gallery-upload-picker
gh pr create --title "fix: gallery upload picker — JPG-only accept + the 50 MiB cap said up front (#170)" --body-file - <<'EOF'
Closes #170 (ruling #165 Q7 a+f — the upload-UI quick win cut outside the maturation map).

- The gallery batch-upload input's `accept` narrows `image/*` → `image/jpeg` — the OS picker stops offering PNG/HEIC files that could only fail the JPG-only courtesy pre-check with "Only JPG files are supported." The package editor's cover input (`package-editor.tsx:854`) is the reference literal.
- The gallery PageHeader's `Upload photos` affordance carries the muted caption `JPG files up to 50 MiB.` — the cap said up front, not only at failure. Plain `text-muted-foreground` (theme-free by construction) at the always-visible seat: both empty-state variants render under the header.
- The pre-check stays as-is — client gates are courtesy, the server re-verifies (#136 discipline).

Floors: admin 6 files / 55 tests (unchanged — no seam movement); everything else untouched; check 35/35; build 7/7.
EOF
```

- [ ] **Step 3: Squash-merge + capture the SHA**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
git log --oneline -1   # record this SHA — the pick input
```

- [ ] **Step 4: The v1 pick — expected SPLIT**

Follow `docs/agents/v1-picks.md` § Executing a SPLIT exactly:

```bash
cd /home/jeius/Projects/sevendays
node scripts/v1-triage.mjs <sha>
```

Expected path verdict: **SPLIT — 2 v1-paths + 2 main-only.** The v1-paths are `apps/admin/src/components/gallery/gallery-screen.tsx` and `apps/admin/src/routes/_shell.gallery.tsx` (v1 carries the admin CMS whole — the #148-#150 picks); the main-only paths are `docs/progress.md` and this plan file (DU on v1). Content pass: **CLEAN** — the two hunks are an attribute value, two comments, and one copy line; zero booking tokens, zero edition vocabulary (`#170`/`#165`/`#136` in comments are ticket refs, the same class #169 picked clean). Neither file is on the runbook's transformed-surfaces list, and both last moved between the editions in the same direction (#157's pick for the screen, #150's for the route) — expect `git cherry-pick -n` to auto-merge clean; drop the two main-only paths (`git rm -qrf --ignore-unmatch -- docs/progress.md docs/superpowers/plans/2026-09-30-170-gallery-upload-picker.md`), commit with the `Split:` line naming both, then the full locks:

```bash
cd ~/Projects/sevendays-v1-seed
# ... cherry-pick -n + git rm per the runbook, then:
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check && pnpm build
cd ~/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed   # exit 0
cd ~/Projects/sevendays-v1-seed && git push origin v1
gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId'     # then: gh run watch <id> --exit-status
```

Locks: run shows `check` + `Deploy v1 (private)` success and `Deploy teaser (main)` skipped; live curl: v1 landing 200, `/book` 404, teaser `/book` 200 untouched. A conflict here would be unexpected (neither file is transformed) — if one appears anyway, stop at § Conflict policy; never resolve by weakening the audit or checks.

- [ ] **Step 5: The ledger row**

Append one row to the `docs/agents/v1-picks.md` ledger table (in a commit on main, itself a skip), per the table's shape — merged date `2026-09-30`, PR `#170`'s number, the main SHA from Step 3, verdict `split`, the v1 SHA from Step 4. The notes must name: the two v1-path hunks (accept + comment rewrite in `gallery-screen.tsx`; the PageHeader caption in `_shell.gallery.tsx`), the two dropped main-only paths, the clean content pass (copy/attribute only, zero tokens), the clean auto-merge, and the locks (check 35/35 + build 7/7, audit PASS, run id, `Deploy teaser (main)` skipped, the live curls). Commit:

```bash
cd /home/jeius/Projects/sevendays
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — #170 gallery-picker quick win split picked (#170)"
```

**Not here:** no v1 work beyond the pick; no release/deploy work; no opening of the "Upload UI maturation" ticket (the #165 sizing already cut it — the owner cuts milestone tickets per the map); no frames harness.


