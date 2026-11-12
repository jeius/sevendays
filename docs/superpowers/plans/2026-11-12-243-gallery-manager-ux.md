# Post-flight T3 — Gallery Manager UX: Empty-category Instruction, Grid Captions, Title→Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Task 2 is UI-bearing and loads the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — the AGENTS.md rule, spec #94 amendment). **No variants round beyond the clarify that already happened:** the one new composition (the empty-category instruction line) was owner-picked from previewed renderings in the 2026-11-12 clarify round pinned in Global Constraints; the post-flight batch's owner re-walk (#239's disposition) covers these surfaces. Everything runs to the gates.

**Goal:** The gallery manager's three M7-demo UX refinements land (ticket #243, parent #239 items 8–10): an empty category **instructs** ("Drag photos into the grid to add them." below the kept label), the **grid cards label by the caption** (the #214 caption law on the management wall — title the fallback, "Untitled photo" the terminal), and the edit sheet's **Title vocabulary becomes Name** (field label + description line + a new "Photo name" placeholder).

**Architecture:** Three tasks, admin-only code (zero api / api-client / types / landing / db / ui files): (1) the lib seam, TDD — `photoCardLabel` in `gallery-state.ts` (the caption-first display chain; +3 its, admin floor 26 files / 262 → 265 tests); (2) the three refinements ride in `gallery-screen.tsx` — the card label renders through the seam, the empty-category state gains the owner-picked instruction child, and the sheet's Title vocabulary renames (label, description, placeholder); (3) gates + the live walkthrough (both themes) + docs rotation + PR + the v1 split + issue closes + `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs), zero migrations, zero `packages/` changes. The wire field `title` is untouched everywhere (API/types unchanged — this ticket renames DISPLAY vocabulary only). vitest 4.x plain-node lib-seam tests on admin (no component/DOM tests — the house law). pnpm + Turborepo, `gh` CLI. Admin's `test` script runs the FULL suite per invocation — positional filename filters do not filter through it (the #242 execution note, 2026-11-08), so every test step below runs the full suite and pins its counts.

**Spec:** Implements ticket [#243 "Post-flight T3 — gallery manager UX: empty-category instruction, grid captions, Title→Name (#239)"](https://github.com/jeius/sevendays/issues/243) (label `ready-for-agent`), whose parent is [#239 "M7 post-flight — the demo fix batch (#1–16) + the branch-Maps feature (#225)"](https://github.com/jeius/sevendays/issues/239). The three ruled items, verbatim from #239: **(8)** "The Gallery empty-category state gets an instruction ('drag photos into the grid') instead of the bare empty label. (step 12)" · **(9)** "The gallery GRID cards render the CAPTION instead of the title — aligning with the public walls' #214 caption law. (step 12)" · **(10)** "The gallery edit sheet's 'Title' field renames to 'Name' (check the placeholder + batch-tray copy too). (step 12)". The ticket's four acceptance criteria, verbatim: Empty category shows the drag instruction · Grid cards show captions (title remains the fallback where no caption exists) · The sheet + tray say Name · `pnpm check` green (the gallery-state seam suites updated if they pin the display vocabulary). Key recon facts (2026-11-12, main `a266d4a`, tree clean; every file below read whole or at the cited lines this session):

- **The screen today (`apps/admin/src/components/gallery/gallery-screen.tsx`, 1676 lines):** the three sites are (1) the card label at line 300 — `<p className='truncate text-sm font-medium'>{photo.title ?? 'Untitled photo'}</p>`; (2) the category empty state at lines 1433–1436 — `<EmptyState line='No photos in this category yet.' />` under a `TODO(owner-copy)` marker (line 1434); (3) the sheet's Title field at lines 1511–1518 (label line 1512, Input with NO placeholder) plus the description at line 1493 — `'Title, caption, category, and the active flag.'`. **The ticket's two "check" sweeps, answered at recon:** the Title input has NO placeholder on disk (nothing to rename — the owner ruled a new one IN, below), and the batch tray carries NO Title vocabulary anywhere (its copy is `Uploading N photos` / Queued / Uploading… / Committing… / Done / Canceled / `Failed: …` / Retry / Retry failed / Cancel / Done, over file names — the sweep's finding is "nothing to rename"; documented, no tray edit).
- **The caption-law precedent (#214, `apps/landing/src/components/mosaic-photo-grid.tsx:32-36`):** the public walls render `captions && photo.caption` — caption-only-when-present, NO fallback line otherwise. The ticket's AC explicitly does NOT import that stricter law to the admin: "title remains the fallback where no caption exists" — a management card always labels. The chain is `caption ?? title ?? 'Untitled photo'` (the terminal line pre-exists at line 300 and stays).
- **The seam home (`apps/admin/src/lib/gallery-state.ts`):** pure display/payload derivation, no React — `photoStateFromRead`, `buildPhotoPayload`, `titleFromFileName` (lines 160–171), `batchItemsFromFiles` (lines 199–217). `GalleryPhoto` is already imported (the type-import block at line 10). The suite (`gallery-state.test.ts`, 11 its) parses every fixture through the real schema — the `photo(n, overrides)` helper at lines 20–33 (`title: \`Photo ${n}\`` by default, `caption: null`).
- **Suites today (run this session):** admin **Test Files 26 passed (26) · Tests 262 passed (262)** — matches AGENTS.md's recorded floor. `gallery-state.test.ts` carries no display-vocabulary pins today (the AC's "updated if they pin" resolves to EXTENDED: Task 1 adds the display-law pins). No admin component/DOM suite exists (the house law), which is why the card-label chain lands in the seam, not inline.
- **No e2e blast radius:** `e2e/visual/` holds only the 16 landing-redesign baselines (ADR-0022) and `e2e/smoke` walks the landing; no admin surface has a committed baseline, and `pnpm test:e2e` is never part of `pnpm check`. Zero landing files change here.
- **Sibling fences (the post-flight's own cuts, #239's disposition):** NOT here, regardless of temptation: **the dark row accent + the Users-tab display set** — #244 (item 14 lives there, not here); **duplicate-save error surfacing** — #245; **site-logo PNG acceptance** — #246; **Socials brand SVG icons** — #247; **branch Maps** — #248; **every landing file** — #241 (T1, closed); **the all-photos empty state** — its `'No photos yet.'` line + Upload photos action and its `TODO(owner-copy)` marker (line 1426) stay exactly as they are (only the CATEGORY state was ruled here); **the sheet header (line 1492) + the deactivate/delete dialogs (lines 1577, 1609)** — they render the title VALUE as the entity name and already speak name vocabulary; **the card `<img alt>`** (line 224, title-derived — alt is not display vocabulary); **the wire field `title`** — API/types/db untouched.
- **Owner rulings (2026-11-12 clarify, this session — the copy law below quotes them):** the empty-category state keeps the label AND joins the instruction below it (picked from two previewed renderings); the renamed Name input gains the placeholder `Photo name`.

## Global Constraints

- **Branch & baseline:** `feat/243-gallery-manager-ux` off main `a266d4a` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#243)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, grep-gate output, the walkthrough narration + captures) lands in gitignored `.superpowers/sdd/2026-11-12-243-gallery-manager-ux/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs.** Every task commits only with the checks green for the packages it touched: every task runs `pnpm --filter @sevendays/admin fix` BEFORE committing (accept the rewrites) → `test -- --run` → `typecheck`. **No build step anywhere:** Task 2's one new symbol (`photoCardLabel`) comes from a module `gallery-screen.tsx` ALREADY imports (`#/lib/gallery-state`, import block lines 102–112) — no new module edge, the #242 Task-3 precedent. `pnpm build:packages` is NOT needed (no `@sevendays/api` dist change is consumed — nothing outside admin changes). Never stage `graphify-out/` churn. Never commit secrets. Tick checklist boxes with `- [✅]`, never plain `[x]` (this plan file and issue bodies alike). Run `graphify update .` at close (Task 3 — code was modified). Final gate: `pnpm check` green across the repo.
- **The copy law (owner-ratified verbatim, 2026-11-12 clarify round — pin these, never re-draft):** the category empty state renders the label + the instruction — `line='No photos in this category yet.'` (stays) with the child line `Drag photos into the grid to add them.` (new, muted `text-sm`, the `EmptyState` children slot); the sheet field label is `Name`; the sheet description is `'Name, caption, category, and the active flag.'`; the Name input carries `placeholder='Photo name'`. Pre-existing strings that stay byte-identical: `'Untitled photo'` (the terminal card fallback, lines 300/1492/1577/1609) and the all-photos empty state (`'No photos yet.'` + its Upload photos action + its `TODO(owner-copy)` marker).
- **The card-label law (binding, the ticket's AC):** the grid card label is `photoCardLabel(photo)` — `photo.caption ?? photo.title ?? 'Untitled photo'` — rendered through the seam, never an inline chain in the component. The public walls' stricter #214 law (caption-only, nothing otherwise) is deliberately NOT imported: the management wall always labels.
- **The vocabulary law (binding):** display vocabulary only — the field label, the description line, and the placeholder rename; the wire field `title`, the `titleId` input id, the editor-state key `title`, `titleFromFileName`, and every API/types/db spelling stay exactly as they are.
- **The theme law (binding, #217's ramp):** the instruction child renders from semantic tokens (`text-muted-foreground text-sm` — the same classes as the `EmptyState` line itself); no new palette, no `packages/ui` change, both themes render from the same markup.
- **Baselines (live, run this session):** admin **26 files / 262 tests** (matches AGENTS.md's floor); types/api/api-client/landing/db untouched by this ticket. After Task 1: admin **26 files / 265 tests** (+3 its in `gallery-state.test.ts` — no file-count change). Tasks 2–3 add no suite. (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)

## File Structure

```text
apps/admin/src/lib/
  gallery-state.ts               # modify (T1) — + photoCardLabel (the card display law)
  gallery-state.test.ts          # modify (T1) — +1 import specifier, +1 describe (3 its)
apps/admin/src/components/gallery/
  gallery-screen.tsx             # modify (T2) — the three refinements ride
docs/progress.md AGENTS.md docs/agents/v1-picks.md graphify-out/   # T3 (+ this plan file's ticks)
```

---

### Task 1: The seam — `photoCardLabel`, the caption-law card label (TDD)

The ticket's whole test surface, plus the function Task 2's card renders. Pure lib code — no component changes yet.

**Files:**
- Modify (test-first): `apps/admin/src/lib/gallery-state.test.ts`
- Modify: `apps/admin/src/lib/gallery-state.ts`

**Interfaces:**
- Produces (what Task 2 consumes): from `#/lib/gallery-state` — `photoCardLabel(photo: GalleryPhoto): string`, returning `photo.caption ?? photo.title ?? 'Untitled photo'`.
- Consumes: `GalleryPhoto` (already imported in both files' type graphs) and the suite's existing `photo(n, overrides)` helper (lines 20–33 — parses through the real `galleryPhotoSchema`).

**Not here:** any component edit (Task 2); any change to the existing seams or their JSDoc (`titleFromFileName` and neighbors stay byte-identical); the public walls' caption law (the landing's `MosaicPhotoGrid` is untouched — the admin chain keeps its fallbacks by the ticket's AC); the empty-state or sheet copy (Task 2).

- [✅] **Step 1: Write the failing tests**

(a) `apps/admin/src/lib/gallery-state.test.ts` — the value import from `./gallery-state` (lines 3–15) gains one specifier. Biome's case-insensitive order puts `photoCardLabel` between `isFileDrag` and `photoStateFromRead`:

```ts
import {
  batchItemsFromFiles,
  buildCategoryOrderPayload,
  buildPhotoFlipPayload,
  buildPhotoOrderPayload,
  buildPhotoPayload,
  buildTestimonialOrderPayload,
  isFileDrag,
  photoCardLabel,
  photoStateFromRead,
  reorderIds,
  reorderVisiblePhotos,
  titleFromFileName,
} from './gallery-state';
```

(Import nothing else — an unused specifier fails `typecheck`. If `fix` re-sorts, accept it.)

(b) Append this describe at the file's end:

```ts
describe('photoCardLabel (the card display law, #243 — the #214 caption law on the management wall)', () => {
  it('caption leads when present', () => {
    expect(photoCardLabel(photo(1, { caption: 'The kiss, golden hour' }))).toBe(
      'The kiss, golden hour'
    );
  });

  it('title remains the fallback where no caption exists', () => {
    expect(photoCardLabel(photo(2))).toBe('Photo 2');
  });

  it('both null → the terminal Untitled photo line (a management card always labels)', () => {
    expect(photoCardLabel(photo(3, { title: null, caption: null }))).toBe('Untitled photo');
  });
});
```

(The `photo()` helper defaults are `title: \`Photo ${n}\`` and `caption: null`, so the second it exercises the title fallback through the real schema, and the third overrides both to null — the terminal line.)

- [✅] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @sevendays/admin test -- --run
```

Expected: FAIL — vitest transforms without typechecking, so the missing export surfaces at call time, not compile time (the #242 precedent): the 3 new `photoCardLabel` its fail with `TypeError: photoCardLabel is not a function`; every pre-existing it still passes — **Test Files 26 passed (26) · Tests 3 failed | 262 passed (265)**. (Execution amendment 2026-11-12, SDD-ruled: this step's original text said `259 passed (262)` — a plan-arithmetic error; the true math is the 262 baseline + 3 new = 265, and the red run correctly showed `3 failed | 262 passed (265)`.) (If the module graph instead refuses the missing specifier at load, the file-level failure names the same cause — same defect, proceed.) Record the failure output in `.superpowers/sdd/2026-11-12-243-gallery-manager-ux/task-1-red.txt`.

- [✅] **Step 3: Write the minimal implementation**

`apps/admin/src/lib/gallery-state.ts` — insert directly after `titleFromFileName`'s closing brace (line 171) and before the `buildCategoryOrderPayload` JSDoc (line 173), keeping everything around it byte-identical:

```ts
/**
 * `#243 seam: the card display law`. The gallery grid's card label — the
 * #214 caption law on the management wall: the caption leads when
 * present, the title remains the fallback, and a photo carrying neither
 * still gets the terminal 'Untitled photo' line (a management card
 * always labels — unlike the public walls, which render no caption line
 * at all when the photo carries none). Display-only: the wire field
 * stays `title` everywhere.
 */
export function photoCardLabel(photo: GalleryPhoto): string {
  return photo.caption ?? photo.title ?? 'Untitled photo';
}
```

(`GalleryPhoto` is already in the file's type-import block — `buildPhotoOrderPayload` at line 187 takes `GalleryPhoto[]`.)

- [✅] **Step 4: Run the tests to verify they pass**

```bash
pnpm --filter @sevendays/admin test -- --run
```

Expected: PASS — **Test Files 26 passed (26) · Tests 265 passed (265)** (the 262 baseline + 3).

- [✅] **Step 5: Lint, format, typecheck**

```bash
pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/admin typecheck
```

Expected: both green (accept `fix`'s rewrites; re-run the suite from Step 4 if it rewrites anything).

- [✅] **Step 6: Commit**

```bash
git add apps/admin/src/lib/gallery-state.ts apps/admin/src/lib/gallery-state.test.ts
git commit -m "feat(admin): photoCardLabel — the caption-law card label seam (#243)"
```

### Task 2: The three refinements ride — the caption card, the empty-category instruction, Title→Name

All three ticket items land in the one screen file. The card label renders through the Task-1 seam; the empty state gains the owner-picked instruction child; the sheet's vocabulary renames (label + description + the new placeholder). Every edit below is a find/replace pinned verbatim.

**Files:**
- Modify: `apps/admin/src/components/gallery/gallery-screen.tsx` (header comment after line 14, the seam import block lines 102–112, the card label line 300, the empty category lines 1433–1436, the sheet description line 1493, the sheet field lines 1511–1518)

**Interfaces:**
- Consumes: `photoCardLabel(photo: GalleryPhoto): string` (Task 1, `#/lib/gallery-state` — the module is already imported; only the specifier is new, so no new module edge and no build gate).
- Produces: nothing a later task consumes.

**Not here:** the all-photos empty state (line 1427's `'No photos yet.'` + Upload photos action + its `TODO(owner-copy)` marker stay — only the category state was ruled); the sheet header (line 1492) and the deactivate/delete dialogs (lines 1577, 1609) — they render the title VALUE as the entity name and already speak name vocabulary; the card `<img alt>` (line 224 — title-derived alt is not display vocabulary); the batch tray (recon answered the ticket's sweep: NO Title vocabulary exists in the tray — its copy is statuses over file names; nothing to rename, no tray edit); the wire field `title` / `titleId` / the editor-state key / `titleFromFileName`; #244's dark accent + Users-tab set, #245's duplicate-save surfacing, #246's PNG acceptance, #247's Socials icons, #248's Maps — every one a sibling ticket.

- [✅] **Step 1: Load the UI/UX skill set**

Per AGENTS.md, load `prototype` + `ui-ux-pro-max` (plus `ui-styling` as relevant) before editing. The rendered shapes are pinned below — the skills inform judgment (muted-line hierarchy in the empty state, placeholder-vs-value posture), not re-composition.

- [✅] **Step 2: The header comment + the seam import**

(a) Append to the header comment, directly after line 14 (`// (AR-1); raw photoUrl never reaches the UI.`):

```tsx
// The M7 post-flight #243 refinements: the cards label by the #214
// caption law (photoCardLabel — caption leads, title the fallback), the
// empty-category state instructs (drag to add, below the label), and the
// editor's Title vocabulary is Name (placeholder included).
```

(b) In the `#/lib/gallery-state` import block, insert `photoCardLabel,` between `isFileDrag,` and `type PhotoEditorState,` (Biome's case-insensitive order — `photoC…` < `photoE…`):

```tsx
  isFileDrag,
  photoCardLabel,
  type PhotoEditorState,
```

- [✅] **Step 3: The card label renders through the seam**

Replace line 300:

```tsx
        <p className='truncate text-sm font-medium'>{photo.title ?? 'Untitled photo'}</p>
```

with:

```tsx
        <p className='truncate text-sm font-medium'>{photoCardLabel(photo)}</p>
```

- [✅] **Step 4: The empty category instructs**

Replace lines 1433–1436:

```tsx
              ) : (
                // TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)
                <EmptyState line='No photos in this category yet.' />
              )}
```

with:

```tsx
              ) : (
                // Owner-ratified 2026-11-12 (#243 round): the label stays,
                // the drag instruction joins below it — the drop zone covers
                // this empty state (#220), so the instruction is truthful.
                <EmptyState line='No photos in this category yet.'>
                  <p className='text-muted-foreground text-sm'>
                    Drag photos into the grid to add them.
                  </p>
                </EmptyState>
              )}
```

(The `TODO(owner-copy)` marker on the ALL-photos state at line 1426 stays — that string was not ruled here. `EmptyState` renders children in its `mt-4` slot, `apps/admin/src/components/cms/shared.tsx:193-200`.)

- [✅] **Step 5: The sheet's Title vocabulary becomes Name**

(a) Replace the description (line 1493):

```tsx
          description='Title, caption, category, and the active flag.'
```

with:

```tsx
          description='Name, caption, category, and the active flag.'
```

(b) Replace the field (lines 1511–1518) — label rename + the owner-ruled placeholder:

```tsx
          <Field>
            <FieldLabel htmlFor={titleId}>Title</FieldLabel>
            <Input
              id={titleId}
              value={editorState.title}
              onChange={(e) => setEditorState({ ...editorState, title: e.target.value })}
            />
          </Field>
```

with:

```tsx
          <Field>
            <FieldLabel htmlFor={titleId}>Name</FieldLabel>
            <Input
              id={titleId}
              placeholder='Photo name'
              value={editorState.title}
              onChange={(e) => setEditorState({ ...editorState, title: e.target.value })}
            />
          </Field>
```

(`titleId` and the `editorState.title` key stay — the vocabulary law: display only.)

- [✅] **Step 6: Grep gates — the three refinements present, the Title vocabulary gone**

```bash
grep -n 'photoCardLabel' apps/admin/src/components/gallery/gallery-screen.tsx
grep -c ">Title<\|'Title," apps/admin/src/components/gallery/gallery-screen.tsx
grep -c "Drag photos into the grid to add them." apps/admin/src/components/gallery/gallery-screen.tsx
grep -c "placeholder='Photo name'" apps/admin/src/components/gallery/gallery-screen.tsx
grep -c "No photos in this category yet." apps/admin/src/components/gallery/gallery-screen.tsx
```

Expected: `photoCardLabel` — **3 hits** (header comment + import specifier + the card-label render); the Title-vocabulary alternation — **0**; the instruction — **1**; the placeholder — **1**; the kept label — **1**. (Remaining `title` spellings in the file are prop names, the `titleId` key, and `photo.title` VALUE reads — the vocabulary law, not display strings.) Save the output to the evidence dir as `task-2-grep.txt`.

- [✅] **Step 7: Lint, format, test, typecheck**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test -- --run
pnpm --filter @sevendays/admin typecheck
```

Expected: all green; the suite stays at **Test Files 26 passed (26) · Tests 265 passed (265)** (no suite change in this task). No build — no new module edge (Global Constraints).

- [✅] **Step 8: Commit**

```bash
git add apps/admin/src/components/gallery/gallery-screen.tsx
git commit -m "feat(admin): the gallery manager's three refinements - empty-category instruction, caption cards, Title-to-Name (#243)"
```

### Task 3: Gates, the live walkthrough, docs rotation, PR, the v1 split, issues, graphify

**Files:**
- Modify: `docs/progress.md` (one dated entry, newest first), `AGENTS.md` (two pinned find/replace edits), this plan file (ticked boxes)
- Post-merge on main: `docs/agents/v1-picks.md` (one ledger row), `graphify-out/` (the graph update)

**Interfaces:** consumes the two code commits (Tasks 1–2); produces nothing code-facing.

**Not here:** any code change (a defect found by Step 2 goes back to its owning task's file with its own fix commit, then this task re-runs from Step 1); `docs/plan.md` (M7 is closed and the post-flight carries no roadmap box — #239's disposition cuts tickets, not plan.md boxes; the #242 precedent); visual-baseline regen (no admin baseline exists — the 16 committed baselines are landing-only, untouched); any landing/api/types file (zero blast radius outside admin).

- [✅] **Step 1: The full check**

```bash
pnpm check
```

Expected: green across the repo (lint + format + typecheck + test). Floors after this ticket: admin **26 files / 265 tests**; every other suite unchanged from AGENTS.md's recorded floors (api, api-client, landing, types, db — this ticket touches none of them).

- [✅] **Step 2: The live walkthrough (controller step — both themes, evidence for the PR)**

Bring up the local stack (`pnpm --filter @sevendays/api dev` + `pnpm --filter @sevendays/admin dev`); sign in with the controller's dev staff account (the owner's local credentials — never written to the evidence dir, never committed). The gallery tables were CMS-born-empty — **if the grid is empty, first upload 2–3 JPGs via the header's `Upload photos` button**; `apps/landing/public/photos/` carries the placeholder corpus (e.g. `gallery-04-family.jpg`, `cover-event.jpg`) and doubles as state 3's drag corpus. Drive a real browser — the `browser-use:control-browser` skill, or a throwaway headed Playwright script kept OUTSIDE the repo. Walk, in order, capturing each numbered state (screenshots + a short `walkthrough.md` narration) to `.superpowers/sdd/2026-11-12-243-gallery-manager-ux/` (light first):

1. **Caption leads:** `/gallery`, open any photo's edit sheet → set Caption to `Golden hour, the courtyard` → Save → the card's label line reads the CAPTION (not the title). Beside it, an uncaptioned card still shows its title.
2. **The fallbacks:** edit one photo → clear BOTH Name and Caption → Save → its card reads `Untitled photo` (the terminal line). Then restore the photo's original title/caption and save again (leave the live content unchanged — the #242 convention).
3. **The empty category instructs:** create a throwaway category (`ZZ sweep`) → select it in the rail → the empty state renders the kept label `No photos in this category yet.` with `Drag photos into the grid to add them.` below it. Then prove the instruction truthful: drop one JPG onto the grid (an OS drag, or a scripted `DataTransfer` drop event on the grid column — the same `isFileDrag(['Files'])` seam #220 walked) → the `Drop photos to upload` overlay → the tray commits → the card lands IN the category (AR-11: the open rail filter rode the enqueue). Clean up: delete the photo and the category (the guarded deletes).
4. **The sheet says Name:** open any photo's sheet — the field label is `Name`, the description reads `Name, caption, category, and the active flag.`, and with the field cleared the placeholder `Photo name` shows. Save round-trips (the wire field is unchanged — the saved card still labels correctly).

Then toggle dark (the admin topbar's theme toggle) and repeat 1–4 (the instruction line and the caption cards render from the same semantic tokens). Any deviation is a defect — fix it in the owning task's file, re-run that task's gates, commit a `fix(admin): … (#243)`, and restart this task from Step 1.

- [✅] **Step 3: `docs/progress.md` — the dated entry (newest first, pinned)**

Insert as the first entry under `# Progress` (replace `2026-11-XX` with the docs commit's date — the #242 plan's dated-annotation convention):

```markdown
- **2026-11-XX — M7 post-flight T3, the gallery manager UX refinements (#243) — build complete on `feat/243-gallery-manager-ux`, PR pending.** The gallery manager's three demo findings landed (#239 items 8–10): the empty-category state now instructs — the label stays ("No photos in this category yet.") with "Drag photos into the grid to add them." joined below (owner-picked 2026-11-12 from previewed renderings; the #220 drop zone covers the empty state, so the instruction is truthful); the grid cards label by the #214 caption law on the management wall — the new `photoCardLabel` seam (caption leads, title the fallback, terminal "Untitled photo") replaces the bare title line; and the edit sheet's Title vocabulary is Name (field label + the description line + the new "Photo name" placeholder — the wire field stays `title`, zero API/types changes; the tray sweep found no Title vocabulary on disk). Walked live on the dev stack in both themes. Admin-only — zero api/api-client/types/landing/db/ui changes; admin floor 26 files / 265 tests (+3 caption-law its).
```

- [✅] **Step 4: `AGENTS.md` — two pinned find/replace edits**

(a) In *Current status of `pnpm test`*, replace (verified this session: exactly one occurrence):

```text
admin floor 26 files / 262 tests (
```

with:

```text
admin floor 26 files / 265 tests (
```

(b) In the same admin floor clause, replace (verified this session: exactly one occurrence):

```text
+ #242's dirty-gate seam — isEditorStateDirty's structural law — and the Signing in…/Sending… label pins)
```

with:

```text
+ #242's dirty-gate seam — isEditorStateDirty's structural law — and the Signing in…/Sending… label pins; + #243's three caption-law card-label pins)
```

- [✅] **Step 5: The docs commit**

Tick this plan's executed boxes (`- [✅]`), then:

```bash
git add docs/progress.md AGENTS.md docs/superpowers/plans/2026-11-12-243-gallery-manager-ux.md
git commit -m "docs(post-flight): #243 lands the gallery manager UX refinements - progress, AGENTS floor + seam note (#243)"
```

- [✅] **Step 6: PR + squash merge**

Push `feat/243-gallery-manager-ux`; open the PR against main titled `Post-flight T3 — gallery manager UX: empty-category instruction, grid captions, Title→Name (#243)`; body: the four ACs each answered with its evidence pointer — (1) empty category: walkthrough state 3 (label + instruction, both themes) + `task-2-grep.txt`; (2) caption cards: the `photoCardLabel` seam (+3 its — caption leads / title fallback / the Untitled-photo terminal) + walkthrough states 1–2; (3) sheet + tray say Name: walkthrough state 4 (label, description, the `Photo name` placeholder) + the tray sweep documented in the plan's recon (no Title vocabulary existed — nothing to rename); (4) `pnpm check` green, admin 26 files / 265 tests. Squash-merge.

- [✅] **Step 7: The v1 split (per `docs/agents/v1-picks.md`)**

Run the path pass on the squash SHA:

```bash
node scripts/v1-triage.mjs <main-sha>
```

Expected: **SPLIT** — the #234/#235/#242 precedent for admin-only tickets (the classifier output is the truth over this expectation). v1-paths: the three `apps/admin/src/**` files (+ `AGENTS.md` through § Content pass — the floor/coverage prose is edition-neutral test-status prose, the #234 class); main-only, dropped: this plan file + `docs/progress.md`. Content pass: the admin code is edition-neutral (both editions run the same admin per ADR-0018 — the gallery screen exists on both, the #218/#242 class). Execute per § Executing a SPLIT, run § The locks (`pnpm check` + `pnpm build` green, the export audit exit 0), push, CI green. Append the ledger row on main, filling every bracketed value from the actual run:

```text
| <merge date> | #<PR> | `<main-sha>` | split | `<v1-sha>` | #243 — M7 post-flight T3: the gallery manager UX refinements (the empty-category drag instruction, caption-led grid cards via photoCardLabel, the Title→Name vocabulary + the Photo name placeholder). Classifier SPLIT — 3 v1-paths + <m> main-only (the plan file, docs/progress.md; AGENTS.md through § Content pass). Locks: <check/build/audit results>; run <run-id> green |
```

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #<PR> ledger row - the #243 split (gallery manager UX)"
```

- [✅] **Step 8: Issue closes + graphify**

Tick #243's four AC boxes in its body, then close it with the AC → evidence mapping:

```bash
gh issue view 243 --json body --jq .body | sed 's/^- \[ \]/- [✅]/' > /tmp/243-body.md
gh issue edit 243 --body-file /tmp/243-body.md
gh issue close 243 --comment "Landed in #<PR> (main <main-sha>, v1 split <v1-sha>). AC1 empty category: walkthrough state 3 (label + instruction, both themes — the owner-picked rendering, 2026-11-12). AC2 caption cards: photoCardLabel (+3 its — caption leads, title fallback, Untitled photo terminal) + walkthrough states 1–2. AC3 the sheet + tray say Name: walkthrough state 4 (field label, description line, the Photo name placeholder); the tray sweep found no Title vocabulary on disk — nothing to rename (the plan's recon records the finding). AC4 pnpm check green; admin 26 files / 265 tests."
gh issue comment 239 --body "Items 8, 9, 10 landed with #243 (PR #<PR>, main <main-sha>): the empty-category drag instruction, caption-led grid cards (photoCardLabel), and the Title→Name vocabulary (+ the Photo name placeholder)."
```

Then the graph (on main, after the ledger commit):

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#243 graph update"
```
