# Plan: #337, Create-button polish: Plus on every CMS create action + the New service rename

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every admin CMS create action leads with the lucide `Plus` glyph (20 button sites added, the gallery's "New category" verified as the pre-existing 21st), and "New studio service" shortens to "New service" at all five code sites, pure composition over the shared Button primitive's existing icon law, zero `packages/ui` changes.

**Architecture:** No seam, no new module. The icon law is `packages/ui`'s Button primitive as-is: the base cva carries `[&_svg:not([class*='size-'])]:size-4` + `[&_svg]:shrink-0 [&_svg]:pointer-events-none` (verified at `packages/ui/src/components/button.tsx:6`), with per-size gaps (`gap-1.5` on default, `gap-1` on sm), so `<Plus aria-hidden='true' />` as a button's first child renders a 16px shrink-proof, pointer-transparent glyph with automatic spacing at BOTH registers (the h-8 full-size default and the h-7 `size='sm'` outline CardAction). Every change below is: add `Plus` to a lucide import, insert one JSX line, and (one screen only) swap one string at five sites.

**Tech Stack:** TanStack Start + Tailwind v4 (admin), lucide-react (already a dependency), zero new dependencies, zero test changes.

**Spec:** [GitHub issue #337](https://github.com/jeius/sevendays/issues/337), authoritatively settled by its parent spec, [issue #335](https://github.com/jeius/sevendays/issues/335), repo copy `docs/specs/2026-11-19-create-button-polish-spec.md` (D1 icon law, D2 census, D3 rename, D4 boundary). The rendered-variants gate is the sibling ticket #338 (teaser screenshot pass + owner reaction), NOT this plan.

**Controller pre-flight (2026-11-19, HEAD 3cfcb23):** every line anchor in the spec's D2/D3/D4 was re-read and verified byte-exact today; the admin floor was live-run and confirmed (34 files / 360 tests); the repo-wide case-insensitive census for "New studio service" returns exactly the 2 code files below plus historical records (`docs/superpowers/plans/2026-09-24-131-m5-prototype-admin-cms-compositions.md`, `docs/superpowers/plans/2026-09-26-140-m5-06-admin-screens-2.md`, and the M2 booking-flow spec's prose "A new Studio Service entity", a different string, not the label). All pinned line numbers in this plan are today's verified anchors.

**Execution amendment (controller, 2026-11-19, at SDD setup):** the plan's census commands as first written (`grep -rni "new studio service" apps/ packages/`) also match gitignored build artifacts, `apps/admin/dist/` carries the old label in its client+server assets until the next build. The census's intent is code sources, so both census commands (Task 1 Step 7, Task 5 Step 2) carry `--exclude-dir=dist --exclude-dir=node_modules`; the expected result is unchanged (zero lines). Every replace-target block in Tasks 1–4 was additionally re-verified byte-exact and count-unique at setup against HEAD 3cfcb23 (all 15 multi-line blocks + 6 import lines PASS).

## Scope fences

**In scope (admin UI code only):** 20 button sites across 7 files gaining the `Plus` icon (studio-services ×2, branches ×2, testimonials ×2, add-ons ×2, packages ×2, lookups ×10, gallery verify-only ×1); the "New studio service" → "New service" rename at exactly 5 sites across 2 files; `docs/progress.md`; graphify.

**NOT here (siblings / out of scope):**

- **#338**, the teaser screenshot pass (three named buttons, both themes) + the owner's reaction. The #94 rendered-variants gate lives entirely there; this plan has no visual-pass step. Nothing is "done done" until #338's owner reaction records.
- **"Create user"** (`users-tab.tsx:394` full-size, `:406` size-sm), staff provisioning, not a CMS entity action (D4). Verified today; untouched.
- **The other entities' create-mode editor titles**, "New branch" (`branches-screen.tsx:636`), "New testimonial" (`testimonials-screen.tsx:737`), "New add-on" (`addons-screen.tsx:683`), "New print size" (`lookups-screen.tsx:450`), "New attire" (`lookups-screen.tsx:498`), "New package" (`package-editor.tsx:755`), all verified today; untouched (D4).
- **`_shell.packages.new.tsx:10`**, the `New package | Sevendays Admin` head meta is a page title, not a create action (D4). Untouched.
- **`package-editor.tsx`'s existing `Plus`** (import `:73`, the frames/inclusions chip UI), untouched (D4).
- **Zero `packages/ui` changes**, the primitive already carries the whole icon law (D1); any edit there is a spec violation.
- **Zero test changes**, the spec's Testing Decisions: no lib-seam pins exist for button labels or icon children (grep-verified today: no admin test file mentions any of these strings), the suite is lib-seam-only, and the floors must hold exactly (admin 34 files / 360 tests, live-confirmed 2026-11-19). `AGENTS.md`'s floor sentence is NOT edited (counts don't move).
- **Historical docs** quoting the old label (the two M5 plans listed in the pre-flight; the M2 spec prose), records of executed plans, left as-is per the spec's Docs note; the census greps below scope to `apps/ packages/` so they never trip on `docs/`.
- **No ADR**, no architectural choice: the icon law is the primitive's existing one, the composition is the gallery precedent verbatim.
- **No v1 pick/ledger work in this branch**, post-merge, main-only per `docs/agents/v1-picks.md`.

## Owner rulings (settled at charting 2026-11-19, recorded in the spec)

- **The icon family is lucide**, the pinned `components.json` trio vocabulary (ADR-0017), over the ui-ux-pro-max skill's default-library recommendation (Phosphor). Recorded override (spec Further Notes, #111 discipline).
- **"Plus icon on ALL admin CMS create actions"**, the ruling's own words cover the census-delta eighth section (the lookups screen's **Attires**, byte-identical in shape to print sizes) that charting's seven-label enumeration missed. All 20 sites go.
- **One rename only**, "New studio service" → "New service"; every other owner-ratified string stays put.

## Global Constraints

- **Verbatim values this plan introduces (use exactly; do not paraphrase):**
  - The icon markup: `<Plus aria-hidden='true' />`, always the button's **first child**, label text after; never a `className` on the icon, never a `data-icon` attribute, never per-site sizing/spacing classes.
  - The rename string: `New studio service` → `New service` at exactly five sites (Task 1 lists all five).
  - Import forms per file (biome organize-imports alphabetical within braces): `import { Plus, SquarePen } from 'lucide-react';` (studio-services, addons, lookups), `import { Image, Plus, SquarePen } from 'lucide-react';` (branches, packages-table), `import { GripVertical, Plus, SquarePen } from 'lucide-react';` (testimonials), `import { Plus } from 'lucide-react';` (the new import in `_shell.packages.index.tsx`).
  - Every before/after block in the tasks is written out in full, land it verbatim; `pnpm fix` (biome format) is the arbiter if any block drifts.
- **Per-task gates:** `pnpm --filter @sevendays/admin test -- --run` AND `pnpm --filter @sevendays/admin typecheck`, both green before each task's commit. Final gate: `pnpm check` green at the repo root (lint + format + typecheck + test). Do not commit code that fails it for the packages/apps touched.
- **Floors (live-confirmed 2026-11-19):** admin 34 files / 360 tests. This plan adds zero tests, the count may NOT move. api / api-client / landing untouched, their floors may not move.
- On a fresh clone only, run `pnpm build:packages` first (AGENTS.md); `packages/ui`'s Button is consumed from source and unchanged.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits follow the repo's commit-work convention, each referencing #337. Prefix `feat(admin)` for the code tasks (affordance addition; both `feat(admin)`/`fix(admin)` have house precedent), `docs:`/`chore(graphify):` for Task 5's.
- UI-bearing work (AGENTS.md): execution loads the installed UI/UX skill set, **`ui-ux-pro-max`** for this ticket. No new composition exists (the icon joins established, owner-accepted buttons; the gallery's "New category" is the live in-repo precedent), so the #94/#111 rendered-variants round is #338's teaser pass, not this plan's; the audit below gates the review instead.

## UI skill audit (`ui-ux-pro-max`, run against this plan 2026-11-19)

The icons-domain search ("decorative icon aria hidden") returned the `icon-context-accessibility` guideline as the verified match; the plan passes it and the skill's icon rule set:

- **Contextual semantics:** every added icon is decorative beside visible text, the pinned markup `<Plus aria-hidden='true' />` is exactly the guideline's decorative clause, verbatim the gallery precedent (`gallery-screen.tsx:730`) the spec names. The button's accessible name stays the label text, unchanaged by the glyph.
- **One visual family per surface:** lucide everywhere (the pinned trio vocabulary, ADR-0017), the skill's Phosphor default is the recorded owner override; row edits already carry lucide `SquarePen`, so the create actions join the family the surface already speaks.
- **Consistent icon sizing as tokens:** the 16px glyph comes from the primitive's `[&_svg:not([class*='size-'])]:size-4` base law, one tokenized size at both registers, no arbitrary per-site values; `xs`-size buttons (the only size that steps to `size-3`) are not in the census.
- **Icon alignment/spacing:** the primitive's per-size gaps (`gap-1.5` default, `gap-1` sm) plus `[&_svg]:shrink-0 [&_svg]:pointer-events-none` carry alignment, crush-proofing, and click-through, the guideline's alignment rule satisfied without a single per-site class.
- **Contrast & theming:** the glyph inherits `currentColor` from the button variant (default/outline/ghost), no new colors, both themes ride the shared tokens; decorative icons carry no information, so no non-text-contrast duty attaches.
- **Touch targets & layout bounds:** buttons keep their existing h-8/h-7 sizes, no target shrinks; the icon adds no layout-shifting transform.

No anti-pattern trips: no emoji-as-icon, no raster assets, no filled/outline mixing.

---

## Task 1, studio-services: the icon ×2 + the complete "New service" rename (all five sites)

**Files:**
- Modify: `apps/admin/src/components/studio-services/studio-services-screen.tsx` (pre-flight 2026-11-19: import at `:39`, doc comment `:82`, PageHeader button `:457`, EmptyState button `:486`, editor title `:658`, all verified verbatim)
- Modify: `apps/admin/src/routes/_shell.studio-services.tsx` (pre-flight: header comment line `:3`, verified verbatim)

**Interfaces:**
- Consumes: `Plus` from `lucide-react` (already a dependency; the file imports `SquarePen` from it today).
- Produces: nothing downstream, this task lands the ticket's ENTIRE rename; Tasks 2–4 are icon-only.

- [ ] **Step 1: Extend the lucide import (line 39).**

```ts
import { Plus, SquarePen } from 'lucide-react';
```

- [ ] **Step 2: The PageHeader create button (lines 456–459).** Current block for exact match:

```tsx
            <StatusSegmented value={segment} onChange={setSegment} />
            <Button type='button' onClick={openCreate}>
              New studio service
            </Button>
```

Replace with:

```tsx
            <StatusSegmented value={segment} onChange={setSegment} />
            <Button type='button' onClick={openCreate}>
              <Plus aria-hidden='true' />
              New service
            </Button>
```

- [ ] **Step 3: The EmptyState create button (lines 486–488).** Current block for exact match:

```tsx
          <Button type='button' onClick={openCreate}>
            New studio service
          </Button>
```

Replace with:

```tsx
          <Button type='button' onClick={openCreate}>
            <Plus aria-hidden='true' />
            New service
          </Button>
```

- [ ] **Step 4: The create-mode editor title (line 658).** Change only the first string:

```tsx
          title={editing.mode === 'create' ? 'New service' : editing.row.name}
```

- [ ] **Step 5: The screen's mode-switch doc comment (line 82).** Current line for exact match:

```tsx
/** The editor's mode switch: create (from `New studio service`) or edit (a row snapshot). */
```

Replace with:

```tsx
/** The editor's mode switch: create (from `New service`) or edit (a row snapshot). */
```

- [ ] **Step 6: The route's header comment (`_shell.studio-services.tsx` line 3).** Current line for exact match:

```tsx
// composes its own PageHeader (the `New studio service` action toggles the
```

Replace with:

```tsx
// composes its own PageHeader (the `New service` action toggles the
```

- [ ] **Step 7: The rename census proof (the D3 acceptance check, runnable).**

Run: `grep -rni "new studio service" apps/ packages/ --exclude-dir=dist --exclude-dir=node_modules`
Expected: **zero lines**, no remaining occurrence in code. (Do NOT scope to `docs/`, the historical records there stay by design; `apps/ packages/` is the code census, minus the gitignored build artifacts the excludes carry.)

- [ ] **Step 8: Gate + commit.**

Run: `pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck`
Expected: green, 34 files / 360 tests, unchanged (no tests touch these strings). Per-task gates stay test + typecheck; formatting is normalized once in Task 5 (`pnpm fix` before the final `pnpm check`), which is the format arbiter.

```bash
git add apps/admin/src/components/studio-services/studio-services-screen.tsx apps/admin/src/routes/_shell.studio-services.tsx
git commit -m "feat(admin): #337, Plus on the studio-services create actions; the New service rename (all five sites)"
```

**Not here:** the editor's create-mode title keeps its LightEntityEditor shape (only the string moves); no other screen's title moves (D4, Task 1 deliberately lands the ticket's whole rename so the census proof is complete now).

## Task 2, branches, testimonials, add-ons: the icon ×6 (two sites each, icon only)

**Files:**
- Modify: `apps/admin/src/components/branches/branches-screen.tsx` (pre-flight: import `:32`, PageHeader `:424`, EmptyState `:461`, verified verbatim)
- Modify: `apps/admin/src/components/testimonials/testimonials-screen.tsx` (pre-flight: import `:54`, PageHeader `:500`, EmptyState `:546`, verified verbatim)
- Modify: `apps/admin/src/components/addons/addons-screen.tsx` (pre-flight: import `:46`, PageHeader `:480`, EmptyState `:509`, verified verbatim)

**Interfaces:**
- Consumes: `Plus` from `lucide-react` (all three files already import from it).
- Produces: nothing downstream.

- [ ] **Step 1: Extend the lucide imports.**

`branches-screen.tsx` line 32:

```ts
import { Image, Plus, SquarePen } from 'lucide-react';
```

`testimonials-screen.tsx` line 54:

```ts
import { GripVertical, Plus, SquarePen } from 'lucide-react';
```

`addons-screen.tsx` line 46:

```ts
import { Plus, SquarePen } from 'lucide-react';
```

- [ ] **Step 2: Branches, the PageHeader create button (lines 424–426).** Current block for exact match:

```tsx
            <Button type='button' onClick={openCreate}>
              New branch
            </Button>
```

Replace with:

```tsx
            <Button type='button' onClick={openCreate}>
              <Plus aria-hidden='true' />
              New branch
            </Button>
```

- [ ] **Step 3: Branches, the EmptyState create button (lines 461–463).** Current block for exact match (its shallower indent, 10 spaces, is what keeps it unique against Step 2's):

```tsx
          <Button type='button' onClick={openCreate}>
            New branch
          </Button>
```

Replace with:

```tsx
          <Button type='button' onClick={openCreate}>
            <Plus aria-hidden='true' />
            New branch
          </Button>
```

- [ ] **Step 4: Testimonials, the PageHeader create button (lines 500–502).** Current block for exact match (inside the `tab === 'testimonials' ?` ternary, the deeper indent is part of the match):

```tsx
              <Button type='button' onClick={openCreate}>
                New testimonial
              </Button>
```

Replace with:

```tsx
              <Button type='button' onClick={openCreate}>
                <Plus aria-hidden='true' />
                New testimonial
              </Button>
```

- [ ] **Step 5: Testimonials, the EmptyState create button (lines 546–548).** Current block for exact match:

```tsx
            <Button type='button' onClick={openCreate}>
              New testimonial
            </Button>
```

Replace with:

```tsx
            <Button type='button' onClick={openCreate}>
              <Plus aria-hidden='true' />
              New testimonial
            </Button>
```

- [ ] **Step 6: Add-ons, the PageHeader create button (lines 480–482).** Current block for exact match:

```tsx
            <Button type='button' onClick={openCreate}>
              New add-on
            </Button>
```

Replace with:

```tsx
            <Button type='button' onClick={openCreate}>
              <Plus aria-hidden='true' />
              New add-on
            </Button>
```

- [ ] **Step 7: Add-ons, the EmptyState create button (lines 509–511).** Current block for exact match:

```tsx
          <Button type='button' onClick={openCreate}>
            New add-on
          </Button>
```

Replace with:

```tsx
          <Button type='button' onClick={openCreate}>
            <Plus aria-hidden='true' />
            New add-on
          </Button>
```

- [ ] **Step 8: Gate + commit.**

Run: `pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck`
Expected: green, 34 files / 360 tests, unchanged.

```bash
git add apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/components/addons/addons-screen.tsx
git commit -m "feat(admin): #337, Plus on the branches/testimonials/add-ons create actions"
```

**Not here:** the three editor titles ("New branch" `:636`, "New testimonial" `:737`, "New add-on" `:683`) stay, D4; the testimonials PageHeader's `tab === 'testimonials'` ternary stays (the Submissions tab shows no create action, unchanged behavior).

## Task 3, packages: the icon ×2 (index route gains its first lucide import + the table's EmptyState)

**Files:**
- Modify: `apps/admin/src/routes/_shell.packages.index.tsx` (pre-flight: imports at `:11-16`, PageHeader action `:36`, verified verbatim; the file imports NO lucide today)
- Modify: `apps/admin/src/components/packages/packages-table.tsx` (pre-flight: import `:28`, EmptyState button `:198`, verified verbatim)

**Interfaces:**
- Consumes: `Plus` from `lucide-react`; `Link` from `@tanstack/react-router` (both already imported where needed).
- Produces: nothing downstream.

- [ ] **Step 1: `_shell.packages.index.tsx`, add the new lucide import.** It slots between `@tanstack/react-router` (line 12) and `#/components/cms/shared` (line 13), the biome order every lucide-importing file follows (`@tanstack/*` < `lucide-react` < `react` < `#/`):

```ts
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { PageHeader } from '#/components/cms/shared';
```

- [ ] **Step 2: `_shell.packages.index.tsx`, the PageHeader action (line 36).** Current line for exact match:

```tsx
        actions={<Button render={<Link to='/packages/new' />}>New package</Button>}
```

Replace with (the two-children body forces the multi-line form):

```tsx
        actions={
          <Button render={<Link to='/packages/new' />}>
            <Plus aria-hidden='true' />
            New package
          </Button>
        }
```

- [ ] **Step 3: `packages-table.tsx`, extend the lucide import (line 28).**

```ts
import { Image, Plus, SquarePen } from 'lucide-react';
```

- [ ] **Step 4: `packages-table.tsx`, the EmptyState create button (lines 197–199).** Current block for exact match:

```tsx
      <EmptyState line='No packages yet.'>
        <Button render={<Link to='/packages/new' />}>New package</Button>
      </EmptyState>
```

Replace with:

```tsx
      <EmptyState line='No packages yet.'>
        <Button render={<Link to='/packages/new' />}>
          <Plus aria-hidden='true' />
          New package
        </Button>
      </EmptyState>
```

- [ ] **Step 5: Gate + commit.**

Run: `pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck`
Expected: green, 34 files / 360 tests, unchanged.

```bash
git add apps/admin/src/routes/_shell.packages.index.tsx apps/admin/src/components/packages/packages-table.tsx
git commit -m "feat(admin): #337, Plus on the packages create actions (index route + empty state)"
```

**Not here:** the `New package | Sevendays Admin` head meta (`_shell.packages.new.tsx:10`) and the editor's create-mode title (`package-editor.tsx:755`) stay, D4; `package-editor.tsx`'s own `Plus` (the frames/inclusions chip UI, import `:73`) stays untouched; the `<Button render={…}>` Base-UI render-prop form is preserved at both sites (only children move inside).

## Task 4, lookups: the icon ×10 (print sizes ×5 + attires ×5, both sections, both registers)

The census-delta section (Attires) lives here, the owner ruling's "ALL admin CMS create actions" covers it; its five sites are byte-identical in shape to print sizes'. The four small outline CardAction buttons per section share one identical block, so each section's trio lands as ONE `replace_all` edit; the two loaded-posture CardAction buttons and the two full-size EmptyState buttons are individually unique.

**Files:**
- Modify: `apps/admin/src/components/lookups/lookups-screen.tsx` (pre-flight: import `:40`; print sizes, error `:668`, pending `:689`, empty `:716`, EmptyState `:724`, loaded `:743`; attires, error `:937`, pending `:957`, empty `:981`, EmptyState `:989`, loaded `:1008`; boundary editor titles `:450`/`:498`, all verified verbatim)

**Interfaces:**
- Consumes: `Plus` from `lucide-react` (the file imports `SquarePen` from it today).
- Produces: nothing downstream.

- [ ] **Step 1: Extend the lucide import (line 40).**

```ts
import { Plus, SquarePen } from 'lucide-react';
```

- [ ] **Step 2: Print sizes, the three small-outline CardAction buttons (lines 668, 689, 716).** All three share this byte-identical block, so ONE edit with `replace_all: true` (expected: 3 replacements). Current block for exact match:

```tsx
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              New print size
            </Button>
```

Replace with:

```tsx
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              <Plus aria-hidden='true' />
              New print size
            </Button>
```

- [ ] **Step 3: Print sizes, the loaded-posture CardAction button (lines 743–745).** Unique by its shallower indent (10 spaces) beside the section's `StatusSegmented`. Current block for exact match:

```tsx
          <Button onClick={onCreate} size='sm' type='button' variant='outline'>
            New print size
          </Button>
```

Replace with:

```tsx
          <Button onClick={onCreate} size='sm' type='button' variant='outline'>
            <Plus aria-hidden='true' />
            New print size
          </Button>
```

- [ ] **Step 4: Print sizes, the full-size EmptyState button (lines 724–726).** Current block for exact match (the `type='button'` prop signature + label keep it unique against Step 2's trio):

```tsx
            <Button type='button' onClick={onCreate}>
              New print size
            </Button>
```

Replace with:

```tsx
            <Button type='button' onClick={onCreate}>
              <Plus aria-hidden='true' />
              New print size
            </Button>
```

- [ ] **Step 5: Attires, the three small-outline CardAction buttons (lines 937, 957, 981).** One edit with `replace_all: true` (expected: 3 replacements). Current block for exact match:

```tsx
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              New attire
            </Button>
```

Replace with:

```tsx
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              <Plus aria-hidden='true' />
              New attire
            </Button>
```

- [ ] **Step 6: Attires, the full-size EmptyState button (lines 989–991).** Current block for exact match:

```tsx
            <Button type='button' onClick={onCreate}>
              New attire
            </Button>
```

Replace with:

```tsx
            <Button type='button' onClick={onCreate}>
              <Plus aria-hidden='true' />
              New attire
            </Button>
```

- [ ] **Step 7: Attires, the loaded-posture CardAction button (lines 1008–1010).** Current block for exact match:

```tsx
          <Button onClick={onCreate} size='sm' type='button' variant='outline'>
            New attire
          </Button>
```

Replace with:

```tsx
          <Button onClick={onCreate} size='sm' type='button' variant='outline'>
            <Plus aria-hidden='true' />
            New attire
          </Button>
```

- [ ] **Step 8: Site-count proof (runnable).**

Run: `grep -c "<Plus aria-hidden='true' />" apps/admin/src/components/lookups/lookups-screen.tsx`
Expected: `10`, four CardAction + one EmptyState per section (print sizes AND attires, the census-delta section covered).

- [ ] **Step 9: Gate + commit.**

Run: `pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck`
Expected: green, 34 files / 360 tests, unchanged.

```bash
git add apps/admin/src/components/lookups/lookups-screen.tsx
git commit -m "feat(admin): #337, Plus on the lookups create actions (print sizes + attires, both registers)"
```

**Not here:** the editor titles "New print size" (`:450`) and "New attire" (`:498`) stay, D4; the `size='sm' variant='outline'` prop signatures stay verbatim (the icon never changes a button's props, children only); no rename anywhere in this file (the rename lives solely in Task 1's two files).

## Task 5, the gallery verify-only + the full census + docs/progress.md + the final gate

**Files:**
- Verify-only (zero edits): `apps/admin/src/components/gallery/gallery-screen.tsx`
- Modify: `docs/progress.md` (append a dated section at file end, the house pattern)
- Local/commit: graphify output

**Interfaces:**
- Consumes: the finished Tasks 1–4; the green run's ACTUAL counts.
- Produces: the durable record; nothing code-side.

- [ ] **Step 1: Verify the precedent (gallery, verify-only, no edits).**

Run: `sed -n '723,732p' apps/admin/src/components/gallery/gallery-screen.tsx`
Expected: the "New category" button with `<Plus aria-hidden='true' />` (line 730) as its first child, the live precedent this ticket composed from, already carrying the icon. `gallery-screen.tsx` is NOT in any task's commit, if it appears in `git status`, something edited it wrongly.

- [ ] **Step 2: The full census proof (the D2 acceptance check, runnable).**

Run:

```bash
grep -rc "<Plus aria-hidden='true' />" \
  apps/admin/src/components/studio-services/studio-services-screen.tsx \
  apps/admin/src/components/branches/branches-screen.tsx \
  apps/admin/src/components/testimonials/testimonials-screen.tsx \
  apps/admin/src/components/addons/addons-screen.tsx \
  apps/admin/src/components/lookups/lookups-screen.tsx \
  apps/admin/src/components/packages/packages-table.tsx \
  apps/admin/src/routes/_shell.packages.index.tsx \
  apps/admin/src/components/gallery/gallery-screen.tsx
```

Expected, exactly this map (20 added + 1 pre-existing = 21 sites):

```text
studio-services-screen.tsx:2
branches-screen.tsx:2
testimonials-screen.tsx:2
addons-screen.tsx:2
lookups-screen.tsx:10
packages-table.tsx:1
_shell.packages.index.tsx:1
gallery-screen.tsx:1
```

And the rename census re-run (D3's other half):

Run: `grep -rni "new studio service" apps/ packages/ --exclude-dir=dist --exclude-dir=node_modules`
Expected: zero lines.

- [ ] **Step 3: Format + the final gate.**

Run: `pnpm fix` (normalizes any JSX formatting drift from the multi-line conversions, biome is the arbiter), then `pnpm check`
Expected: green at the repo root, lint + format + typecheck + test across every workspace; admin at its unchanged 34-file/360-test floor; api / api-client / landing floors unmoved.

- [ ] **Step 4: `docs/progress.md`, append this section verbatim at the end of the file:**

```markdown
## 2026-11-19, #337: the create-button polish, Plus on every CMS create action; the New service rename

Every admin CMS create action now leads with the lucide `Plus` glyph, 20 button sites across the polish spec's census (studio services, branches, testimonials, add-ons, packages, print sizes, attires, the census-delta eighth section the charting enumeration missed), with the gallery's "New category" verified as the pre-existing 21st site and the composition's precedent. The icon law is the shared Button primitive's own (`[&_svg:not([class*='size-'])]:size-4` + `shrink-0`/`pointer-events-none`, per-size gaps), the 16px glyph rides both registers (the h-8 full-size PageHeader/EmptyState buttons and the h-7 `size='sm'` outline CardAction buttons) with zero per-site sizing and zero `packages/ui` changes, the markup verbatim the gallery precedent (`<Plus aria-hidden='true' />` first child, label after). "New studio service" shortens to "New service" at all five code sites (both buttons, the create-mode editor title, the screen's mode-switch doc comment, the route's header comment), matching the "New package"/"New branch"/"New add-on" register; the case-insensitive code census (`apps/ packages/`) returns clean. The boundary held (D4): "Create user" (provisioning, not CMS content), the other entities' editor titles, the packages head meta, and the package editor's chip-UI Plus untouched. No new tests (the spec's Testing Decisions, no seam behind button labels/icon children); floors hold: admin 34 files / 360 tests; api/api-client/landing untouched. The rendered-variants gate is #338's teaser screenshot pass + owner reaction.
```

- [ ] **Step 5: Docs + graphify commits.**

```bash
git add docs/progress.md
git commit -m "docs: #337, progress section for the create-button polish"
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#337 graph update"
```

(The pre-existing dirty `graphify-out/cache/last_query_stamp` rides along, dirty graph files are expected, not a reason to skip.)

**Not here:** no `AGENTS.md` edit, the floors don't move (zero tests added/removed), so the floor sentence stays at its current counts; no `docs/plan.md` edit, no milestone box rides this polish; no issue-close in this plan's tasks, the controller closes #337 on the evidence (the merged PR + the acceptance criteria re-checked), and #338 stays open for the teaser pass + owner reaction; no v1 pick in-branch, post-merge, main-only.

---

## Self-review checklist (controller pass, run before handoff)

- [✅] Placeholder scan: no TBD/TODO/"as appropriate"/paraphrased strings, every value the executor must land is quoted verbatim. (grep 2026-11-19: the only hit is this line itself; no leftover APPEND anchors.)
- [✅] Step-checkbox count: `grep -c '^- \[ \] \*\*Step'` on this file = 35 (Task 1: 8, Task 2: 8, Task 3: 5, Task 4: 9, Task 5: 5). (Verified 2026-11-19; first draft claimed 25, corrected at the source.)
- [✅] Cross-task consistency: the icon markup `<Plus aria-hidden='true' />` identical at every site; import forms match Global Constraints; the rename appears ONLY in Task 1's two files; the census map matches the per-task edits (2+2+2+2+10+1+1 = 20 added across the seven edited files, +1 gallery pre-existing = 21, recounted from the actual task blocks).
- [✅] Boundary re-check: users-tab, the six editor titles, the head meta, package-editor's chip Plus, each named "not here" with its D4 line anchor.
- [✅] Spec coverage: D1 (icon law, zero packages/ui changes) = Global Constraints + the Architecture paragraph; D2 (20 sites + gallery verify-only) = Tasks 1–4 + Task 5 Steps 1–2; D3 (five sites + census) = Task 1 Steps 2–7 + Task 5 Step 2; D4 (boundary) = every task's Not-here + Scope fences; Testing Decisions (none) = Global Constraints floors + Task 5's unchanged-floor gate. No gap.


