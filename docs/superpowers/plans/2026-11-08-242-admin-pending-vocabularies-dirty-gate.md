# Post-flight T2 — Admin Save/Sign-in Pending Vocabularies + the Dirty-state Save Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Tasks 2 and 3 are UI-bearing and load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — the AGENTS.md rule, spec #94 amendment). **No variants round:** no new compositions — three existing buttons adopt the already-owner-ratified #218 vocabulary verbatim, and every new string was ratified in the 2026-11-08 clarify round pinned in Global Constraints; the post-flight batch's owner re-walk (#239's disposition) covers these surfaces. Everything runs to the gates.

**Goal:** The #218 pending vocabulary completes its coverage on the three surfaces the M7 demo found lacking (ticket #242, parent #239 items 4–6): the Settings **Site tab's footer Save** gains the full pending vocabulary (lost in #221's relocation), the **login card's two submit buttons** gain the spinner + busy-label + `aria-busy` half they never rode, and the **package editor's Save stays disabled while the form is clean** behind a structural dirty-check seam.

**Architecture:** Four tasks, admin-only code (zero api / api-client / types / landing / db / ui files): (1) the lib seams, TDD — two new owner-ratified busy-label constants in `save-contract.ts` (`SIGNING_IN_LABEL`/`SENDING_LABEL`) + the pure `isEditorStateDirty` structural comparison in `package-editor-state.ts` (+8 its, +2 pinned expects; admin floor 26 files / 254 → 26 files / 262 tests); (2) the vocabulary rides — `site-tab.tsx`'s footer Save over `save.isPending`, `login.tsx`'s Sign-in and Send-reset-link buttons over `submitting` (the exact render shape `LightEntityEditor`'s footer and the package editor's Save already use); (3) the dirty gate — `package-editor.tsx` snapshots a `savedBaseline` (hydrate for edit, `newEditorState()` for create, the mutate-time state after a successful edit save via a ref that out-races react-query's latest-options closure), and the Save button disables on `savePending || !dirty`; (4) gates + docs rotation + PR + the v1 pick + issue closes + `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs), zero migrations, zero `packages/` changes. React Query v5's `isPending` (the on-disk pattern — `createSave.isPending` in `package-editor.tsx:598`, `isPending` in `site-tab.tsx:105`). `PendingSpinner` + `SAVING_LABEL` from the installed `#/components/cms/shared` + `#/lib/save-contract` (no `packages/ui` change — #218 placed the spinner in admin's shared CMS library; the settings tab already imports from it). vitest 4.1.11 plain-node lib-seam tests on admin (no component/DOM tests — the house law). pnpm + Turborepo, `gh` CLI. TypeScript without `noUncheckedIndexedAccess` (verified in `packages/config/ts/base.json` + `apps/admin/tsconfig.json` this session) — plain array indexing is the house style.

**Spec:** Implements ticket [#242 "Post-flight T2 — admin save/sign-in pending vocabularies + the dirty-state Save gate (#239)"](https://github.com/jeius/sevendays/issues/242) (label `ready-for-agent`), whose parent is [#239 "M7 post-flight — the demo fix batch (#1–16) + the branch-Maps feature (#225)"](https://github.com/jeius/sevendays/issues/239). The three ruled items, verbatim from #239: **(4)** "The Site tab's Save button gets the #218 pending vocabulary while saving (disabled + LoaderCircle + 'Saving…' + `aria-busy`) — it was lost in #221's relocation to the tab footer. (step 10)" · **(5)** "The login button gets the spinner while signing in — the `submitting` state disables but the visible half of the vocabulary never rode the login form. (step 11)" · **(6)** "The package editor's Save stays disabled while the form is clean (not dirty). (step 12)". The ticket's four acceptance criteria, verbatim: Site-tab Save: pending vocabulary during the save · Login: spinner + disabled during sign-in · Package editor: Save disabled until dirty; enables on change · `pnpm check` green; the seams' suites untouched or extended where they pin these affordances. Key recon facts (2026-11-08, main `7c41fb2`, tree clean — post-#240; every file below read whole or at the cited lines this session):

- **The vocabulary law (binding, #218 plan Global Constraints, quoted):** "pending = disabled + `LoaderCircle` spinner (`aria-hidden`, `animate-spin`, `currentColor`) + label swap + `aria-busy`. The three spec-pinned busy labels are constants in `save-contract.ts`… Icon-only buttons take the spinner IN PLACE of the icon (no label swap — there is no label)." The house render precedent — `LightEntityEditor`'s footer, `apps/admin/src/components/cms/shared.tsx:842-862` — is exactly: `<Button … disabled={saving} aria-busy={saving}>{saving ? <PendingSpinner /> : null}{saving ? SAVING_LABEL : (saveLabel ?? 'Save changes')}</Button>`. The package editor's Save (`package-editor.tsx:726-734`) renders the same shape over `savePending`. Tasks 2–3 copy this shape verbatim; nothing composes anew.
- **The Site tab today (`apps/admin/src/components/settings/site-tab.tsx`):** the footer Save at lines 396-400 is a plain `<Button type='button' onClick={handleSave}>Save changes</Button>` — no disabled, no `aria-busy`, no spinner, no label swap. The mutation is `const save = useMutation(…)` (line 167), so the pending flag is `save.isPending` (React Query v5). The file already imports `QUERY_ERROR_LINE, QueryErrorState` from `#/components/cms/shared` (line 23) — `PendingSpinner` joins that import; `SAVING_LABEL` arrives as a new `#/lib/save-contract` import (sorted between `#/lib/cover-upload` and `#/lib/site-settings-state`). The #221 plan explicitly fenced this maturity forward ("the Site tab's Save maturity (#218 vocabulary on a non-sheet surface — moves verbatim, fenced)") — this ticket is that fence's owner.
- **The login card today (`apps/admin/src/routes/login.tsx`):** ONE card, two modes (#221). The sign-in form's button (line 216) and the forgot-password form's button (line 171) are both `<Button type='submit' className='w-full' disabled={submitting}>` with a bare label (`Sign in` / `Send reset link`) — disabled-only, no visible half. Both modes share the one `submitting` state (set true on submit; false on failure / after the reset request resolves; the sign-in success path navigates away without resetting). The owner ratified BOTH buttons riding the vocabulary (2026-11-08) — killing the inconsistency one mode over would have re-created it. The `login.tsx` route's module graph gains two imports (`#/components/cms/shared`, `#/lib/save-contract`), so the production build joins Task 2's checks (the #218 execution ruling).
- **The package editor today (`apps/admin/src/components/packages/package-editor.tsx`):** the Save button (726-734) ALREADY renders the full vocabulary over `savePending = createSave.isPending || editSave.isPending` (598) — what it lacks is the dirty gate: nothing disables Save on a clean form. The wiring points: state init (290-292, `newEditorState()` for create / `null` for edit), the hydrate-once effect (312-316), `editSave.onSuccess` (584-595 — invalidates, toasts, stays on the route; the state is NOT re-seeded), `saveChanges` (600-621). The inputs remain EDITABLE while a save is in flight (only the Save button disables) — and React Query v5 fires `onSuccess` from the LATEST render's options, so an `onSuccess` closure over `state` can see a mid-flight edit: the re-baseline must snapshot the state at MUTATE time (a ref), never at success time. Create's success navigates to the edit route (568), so only `editSave` re-baselines.
- **The seam home (`apps/admin/src/lib/package-editor-state.ts`):** the editor's whole state is `PackageEditorState` (49-63) — scalars + `frames: { token }[]` + `inclusions: EditorInclusion[]`, plain data, no React. The encodings the dirty comparison must honor: `priceCents: NaN` is the unpriced/absent encoding (ADR-0020 — `NaN !== NaN` under `===`, so the comparison uses `Object.is`); `coverImageKey` is the three-state media encoding (`undefined` = unchanged, `null` = clear, string = a fresh staging key — ADR-0019; a bind or a clear is a REAL change, the "save to bind it" law); inclusions compare IN ARRAY ORDER (position is data, #137); row `key`s and frame tokens are client-stable identities that never change after hydrate (they only appear/disappear with their row), so a baseline SNAPSHOTTED from the state compares identity-stable — which is why the baseline is a snapshot of the state itself, never a second `editorStateFromRead` pass.
- **The seams' suites today:** `save-contract.test.ts` pins the vocabulary mapper + all five busy labels (the `ACCEPTING_LABEL`/`REJECTING_LABEL` expects at 32-33 are the precedent the two new pins join); `package-editor-state.test.ts` carries the `read()` fixture parsed through the real schema (one framed_picture inclusion, `attireIds: [uuid(1)]`, `priceCents: 90000`, `isFeatured: false`, `isActive: true`) + the `uuid(n)`/`STAMP` helpers — Task 1 extends both files in-style. No admin component/DOM suite exists (the house law), so the login + Site-tab button work carries no new suite; the ticket's "extended where they pin these affordances" lands entirely in the two lib suites.
- **No e2e blast radius:** `e2e/visual/` holds only `redesign.spec.ts` (the 16 landing-redesign baselines — ADR-0022) and `e2e/smoke` walks the landing; no admin surface has a committed baseline, and `pnpm test:e2e` is never part of `pnpm check`.
- **Sibling fences (the post-flight's own cuts):** NOT here, regardless of temptation: **duplicate-name error surfacing** (the envelope-unwrap root fix) — #245; **gallery manager UX** (empty-category instruction, grid captions, Title→Name) — #243; **site-logo PNG acceptance** — #246 (the Site tab's `accept='image/jpeg'` + the JPG-only line stay exactly as they are); **Socials brand SVG icons** — #247; **the Users-tab display set** — #244; **every landing file** — #241 (T1 owns the landing polish + the batch's variants round); **branch Maps** — #248; **a Site-tab dirty gate** — the ticket gives the Site tab the pending vocabulary ONLY (item 4), the dirty gate is the package editor's (item 6); **the packages table / light-entity sheets** — their Saves already carry the vocabulary (#218); **re-seeding the package editor's state after save** — #242 re-baselines the DIRTY comparison only; the editor's state/posture behavior is otherwise untouched.
- **Owner rulings (2026-11-08 clarify, this session — the copy + policy law below quotes them):** "Signing in…" as the sign-in busy label (the full vocabulary ride, not spinner-only); "Sending…" on the forgot-mode button too; the dirty gate in BOTH modes (create's Save starts disabled — the empty form is clean); re-baseline on successful edit save (Save re-disables until the next edit).

## Global Constraints

- **Branch & baseline:** `feat/242-pending-vocabularies-dirty-gate` off main `7c41fb2` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#242)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, grep-gate output, the dev-stack walkthrough narration) lands in gitignored `.superpowers/sdd/2026-11-08-242-pending-vocabularies-dirty-gate/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs.** Every task commits only with the checks green for the packages it touched: every task runs `pnpm --filter @sevendays/admin fix` BEFORE committing (accept the rewrites) → `test -- --run` → `typecheck`. Task 2 additionally runs `pnpm --filter @sevendays/admin build` (the #218 execution ruling: the production build joins the per-task checks whenever a route's module graph gains an import — `login.tsx` is itself a route gaining two, and `site-tab.tsx` feeds the settings route a new `#/lib/save-contract` edge). Task 3 adds no new module edge (both new symbols come from already-imported modules) — no build. `pnpm build:packages` is NOT needed (no `@sevendays/api` dist change is consumed — the client package is untouched). Never stage `graphify-out/` churn. Never commit secrets. Tick checklist boxes with `- [✅]`, never plain `[x]` (this plan file and issue bodies alike). Run `graphify update .` at close (Task 4 — code was modified). Final gate: `pnpm check` green across the repo.
- **The vocabulary law (binding, #218, quoted in recon):** pending = disabled + `LoaderCircle` spinner (`aria-hidden`, `animate-spin`, `currentColor` — the exported `PendingSpinner`) + label swap + `aria-busy`. Every button Task 2 touches renders exactly the house shape: `{pending ? <PendingSpinner /> : null}{pending ? BUSY_LABEL : idleLabel}` with `disabled={pending} aria-busy={pending}` — no variants, no icon-only legs (both buttons are labeled).
- **The copy law (owner-ratified verbatim, 2026-11-08 — pin these, never re-draft):** `SIGNING_IN_LABEL = 'Signing in…'` and `SENDING_LABEL = 'Sending…'` — new constants in `save-contract.ts` beside the five, with the dated ratification note in their JSDoc. The idle labels stay exactly on disk: `'Save changes'` (Site tab + package editor) and `'Sign in'` / `'Send reset link'` (login, the 2026-10-19 #221 ratifications). `SAVING_LABEL = 'Saving…'` is the #218 spec-pinned constant, reused as-is.
- **The dirty-gate law (binding, owner-ruled 2026-11-08):** the package editor's Save is disabled whenever `savePending || !dirty`. `dirty` is `isEditorStateDirty(state, savedBaseline)` — a STRUCTURAL comparison (never reference equality), both modes (create's baseline is its own `newEditorState()` instance, so the empty form is clean and Save starts disabled), re-baselined ONLY inside `editSave`'s `onSuccess`-ok branch to the MUTATE-TIME state snapshot (the `pendingBaselineRef` — react-query fires `onSuccess` from the latest render's options and the inputs stay editable mid-flight, so an `onSuccess` closure over `state` could snapshot an unsaved mid-flight edit; the ref cannot). A failed save (client veto, 400, transport) never touches the baseline — the form stays dirty, retry is safe (the #218 hold law). A cover bind (`undefined` → staging key) or clear (`undefined` → `null`) reads dirty — "save to bind it" is a real change. `priceCents` compares via `Object.is` (the unpriced `NaN` encoding equals itself). Inclusions and `attireIds` compare IN ARRAY ORDER; an attire uncheck+recheck (same membership, new order) reads dirty — the safe direction (the builders re-pin order; the gate may open on a no-op save, never block a real one). The `aria-busy` + spinner + label halves stay `savePending`-only — a clean-disabled Save renders no spinner and the idle label.
- **The theme law (binding, #217's ramp):** every touched surface already renders from semantic tokens; the vocabulary's spinner is `currentColor` by construction. No new classes beyond the pinned blocks, no `packages/ui` change, both themes render from the same markup.
- **Baselines (live, run this session):** admin **26 files / 254 tests** (matches AGENTS.md's floor); types/api/api-client/landing/db untouched by this ticket. After Task 1: admin **26 files / 262 tests** (+8 its in `package-editor-state.test.ts`; +2 pinned expects inside an existing it in `save-contract.test.ts` — no file-count change). Tasks 2–3 add no suite. (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)

## File Structure

```text
apps/admin/src/lib/
  save-contract.ts               # modify (T1) — + SIGNING_IN_LABEL / SENDING_LABEL (owner-ratified)
  save-contract.test.ts          # modify (T1) — +2 pinned expects inside the vocabulary it
  package-editor-state.ts        # modify (T1) — + isEditorStateDirty (the dirty-gate seam)
  package-editor-state.test.ts   # modify (T1) — +1 describe, +8 its
apps/admin/src/components/settings/
  site-tab.tsx                   # modify (T2) — the footer Save rides the vocabulary
apps/admin/src/routes/
  login.tsx                      # modify (T2) — both submit buttons ride the vocabulary
apps/admin/src/components/packages/
  package-editor.tsx             # modify (T3) — savedBaseline + the ref + the disabled gate
docs/progress.md AGENTS.md docs/agents/v1-picks.md graphify-out/   # T4
```

---

### Task 1: The lib seams — the login busy labels + `isEditorStateDirty` (TDD)

The ticket's whole test surface, plus the two constants Task 2 renders and the comparison Task 3 consumes. Pure lib code — no component changes yet.

**Files:**
- Modify (test-first): `apps/admin/src/lib/package-editor-state.test.ts`, `apps/admin/src/lib/save-contract.test.ts`
- Modify: `apps/admin/src/lib/package-editor-state.ts`, `apps/admin/src/lib/save-contract.ts`

**Interfaces:**
- Produces (what Tasks 2–3 consume): from `#/lib/save-contract` — `SIGNING_IN_LABEL: 'Signing in…'` and `SENDING_LABEL: 'Sending…'` (exported string constants). From `#/lib/package-editor-state` — `isEditorStateDirty(current: PackageEditorState, baseline: PackageEditorState): boolean` (structural; the encodings honored per the dirty-gate law).
- Consumes: nothing new — both modules are self-contained pure seams.

**Not here:** any component edit (Tasks 2–3); any change to the existing five labels or their `TODO(owner-copy)` marker comment (that marker is #218's open item, not this ticket's); `pendingVocabulary` itself (the mapper is pinned and unchanged).

- [ ] **Step 1: Write the failing tests**

(a) `apps/admin/src/lib/save-contract.test.ts` — the import block gains the two constants (alphabetical: `SAVING_LABEL, SENDING_LABEL, SIGNING_IN_LABEL, UPLOADING_LABEL`):

```ts
import {
  ACCEPTING_LABEL,
  blockerLines,
  closesOnEvent,
  DELETING_LABEL,
  idleSaveContract,
  pendingVocabulary,
  REJECTING_LABEL,
  reduceSaveContract,
  SAVING_LABEL,
  SENDING_LABEL,
  SIGNING_IN_LABEL,
  UPLOADING_LABEL,
} from './save-contract.js';
```

Then inside the existing `it('pending: disabled + aria-busy + the busy label swap …')` (currently lines 22-34), append after the `REJECTING_LABEL` expect:

```ts
    expect(SIGNING_IN_LABEL).toBe('Signing in…');
    expect(SENDING_LABEL).toBe('Sending…');
```

(b) `apps/admin/src/lib/package-editor-state.test.ts` — the value import from `./package-editor-state` gains exactly three specifiers: the seam + the two types the new tests use (Biome's case-insensitive order, the `package-editor.tsx:85-98` precedent — `EditorInclusion` sorts before `editorStateFromRead`, `isEditorStateDirty` after it, `PackageEditorState` before `quantityFromInput`):

```ts
import {
  buildCreatePayload,
  buildRowFlipPayload,
  buildUpdatePayload,
  conflictFieldErrors,
  durationFromInput,
  type EditorInclusion,
  editorStateFromRead,
  isEditorStateDirty,
  newEditorState,
  type PackageEditorState,
  quantityFromInput,
  tokenFor,
  validateEditorState,
} from './package-editor-state';
```

(Import nothing else — `noUnusedLocals` rejects an unused specifier, types included. If `fix` re-sorts, accept it.)

Then append this describe at the file's end:

```ts
describe('isEditorStateDirty (the dirty-gate seam, #242)', () => {
  it('a state equals its baseline structurally — two fromRead passes over one read are clean, not reference-equal', () => {
    const packageRead = read();
    expect(
      isEditorStateDirty(editorStateFromRead(packageRead), editorStateFromRead(packageRead))
    ).toBe(false);
  });

  it('the create-mode initial state is clean against a second newEditorState instance — the unpriced NaN encoding equals itself (Object.is)', () => {
    expect(isEditorStateDirty(newEditorState(), newEditorState())).toBe(false);
  });

  it('every scalar flip reads dirty: name, description, durationInput, slug, isFeatured, isActive', () => {
    const baseline = editorStateFromRead(read());
    const flip = (patch: Partial<PackageEditorState>) =>
      isEditorStateDirty({ ...baseline, ...patch }, baseline);
    expect(flip({ name: 'Renamed Package' })).toBe(true);
    expect(flip({ description: 'Rewritten description.' })).toBe(true);
    expect(flip({ durationInput: '45' })).toBe(true);
    expect(flip({ slug: 'renamed-package' })).toBe(true);
    expect(flip({ isFeatured: true })).toBe(true);
    expect(flip({ isActive: false })).toBe(true);
  });

  it('the price pair reads dirty: unchecking Priced (hasPrice false + the NaN re-entry contract) and a changed re-entered price', () => {
    const baseline = editorStateFromRead(read());
    expect(
      isEditorStateDirty({ ...baseline, hasPrice: false, priceCents: Number.NaN }, baseline)
    ).toBe(true);
    expect(
      isEditorStateDirty({ ...baseline, priceCents: baseline.priceCents + 100 }, baseline)
    ).toBe(true);
  });

  it('the three-state cover encoding reads dirty: a bind (undefined → staging key) and a clear (undefined → null)', () => {
    const baseline = editorStateFromRead(read());
    expect(
      isEditorStateDirty({ ...baseline, coverImageKey: 'staging/covers/new-key' }, baseline)
    ).toBe(true);
    expect(isEditorStateDirty({ ...baseline, coverImageKey: null }, baseline)).toBe(true);
  });

  it('composition changes read dirty: an added frame, an added print row, a removed row', () => {
    const base = editorStateFromRead(read());
    expect(
      isEditorStateDirty(
        { ...base, frames: [...base.frames, { token: crypto.randomUUID() }] },
        base
      )
    ).toBe(true);
    const print: EditorInclusion = {
      key: crypto.randomUUID(),
      kind: 'print',
      quantityInput: '1',
      printSizeId: uuid(20),
      frameToken: null,
      attireIds: [uuid(1)],
      description: '',
    };
    expect(isEditorStateDirty({ ...base, inclusions: [...base.inclusions, print] }, base)).toBe(
      true
    );
    // read() carries exactly one inclusion — removing it leaves none.
    expect(isEditorStateDirty({ ...base, inclusions: [] }, base)).toBe(true);
  });

  it('a reordered inclusion reads dirty — array order IS position (#137)', () => {
    const base = editorStateFromRead(read());
    const second: EditorInclusion = {
      key: crypto.randomUUID(),
      kind: 'print',
      quantityInput: '2',
      printSizeId: uuid(20),
      frameToken: null,
      attireIds: [uuid(1)],
      description: '',
    };
    const baseline = { ...base, inclusions: [...base.inclusions, second] };
    expect(isEditorStateDirty(baseline, baseline)).toBe(false);
    expect(
      isEditorStateDirty(
        { ...baseline, inclusions: [baseline.inclusions[1], baseline.inclusions[0]] },
        baseline
      )
    ).toBe(true);
  });

  it('an attire uncheck+recheck (same membership, new selection order) reads dirty — the safe direction, never the reverse', () => {
    const base = editorStateFromRead(read());
    const withTwo: PackageEditorState = {
      ...base,
      inclusions: [{ ...base.inclusions[0], attireIds: [uuid(1), uuid(2)] }],
    };
    const rechecked: PackageEditorState = {
      ...base,
      inclusions: [{ ...base.inclusions[0], attireIds: [uuid(2), uuid(1)] }],
    };
    expect(isEditorStateDirty(withTwo, withTwo)).toBe(false);
    expect(isEditorStateDirty(rechecked, withTwo)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @sevendays/admin test -- --run package-editor-state save-contract
```

Expected: FAIL — vitest transforms without typechecking, so the missing exports surface at call time, not compile time: the 8 new `isEditorStateDirty` its fail with `TypeError: isEditorStateDirty is not a function` (the two type specifiers already resolve — `EditorInclusion`/`PackageEditorState` are exported interfaces on disk, erased at transform); the extended `save-contract` it fails on `expected undefined to be 'Signing in…'`. Every pre-existing it in both files still passes. Record the failure output in `.superpowers/sdd/2026-11-08-242-pending-vocabularies-dirty-gate/task-1-red.txt`.

- [ ] **Step 3: Write the minimal implementation**

(a) `apps/admin/src/lib/save-contract.ts` — append after `REJECTING_LABEL` (leave the existing JSDoc + five constants byte-identical):

```ts
/** The login extensions — owner-ratified verbatim, 2026-11-08 (#242 round). */
export const SIGNING_IN_LABEL = 'Signing in…';
export const SENDING_LABEL = 'Sending…';
```

(b) `apps/admin/src/lib/package-editor-state.ts` — insert after `validateEditorState` (before `conflictFieldErrors`):

```ts
/**
 * `#242 seam: the dirty gate`. Structural comparison of the live state
 * against its save baseline — the Save affordance's clean-form gate
 * (owner ruling 2026-11-08: both modes; re-baseline on a successful edit
 * save; a failed save never touches the baseline — retry-safe, the #218
 * hold law). The baseline is a SNAPSHOT of the state (the hydrate for
 * edit, newEditorState() for create, the just-saved state after a
 * successful edit save), so row `key`s and frame tokens compare
 * identity-stable. `priceCents` compares via Object.is so the unpriced
 * `NaN` encoding equals itself; `coverImageKey` compares by its
 * three-state encoding (a bind or a clear is a real change). Inclusions
 * compare IN ARRAY ORDER — position is data (#137) — and `attireIds` in
 * array order too: an uncheck+recheck of the same attire (same
 * membership, new order) reads dirty, the safe direction (the builders
 * re-pin order anyway; the gate may open on a no-op save, never block a
 * real one).
 */
export function isEditorStateDirty(
  current: PackageEditorState,
  baseline: PackageEditorState
): boolean {
  if (
    current.name !== baseline.name ||
    current.description !== baseline.description ||
    current.hasPrice !== baseline.hasPrice ||
    !Object.is(current.priceCents, baseline.priceCents) ||
    current.durationInput !== baseline.durationInput ||
    current.isFeatured !== baseline.isFeatured ||
    current.isActive !== baseline.isActive ||
    current.slug !== baseline.slug ||
    current.coverImageUrl !== baseline.coverImageUrl ||
    current.coverImageKey !== baseline.coverImageKey ||
    current.frames.length !== baseline.frames.length ||
    current.frames.some((frame, index) => frame.token !== baseline.frames[index].token)
  ) {
    return true;
  }
  if (current.inclusions.length !== baseline.inclusions.length) {
    return true;
  }
  return current.inclusions.some((row, index) => {
    const other = baseline.inclusions[index];
    return (
      row.key !== other.key ||
      row.kind !== other.kind ||
      row.quantityInput !== other.quantityInput ||
      row.printSizeId !== other.printSizeId ||
      row.frameToken !== other.frameToken ||
      row.description !== other.description ||
      row.attireIds.length !== other.attireIds.length ||
      row.attireIds.some((id, attireIndex) => id !== other.attireIds[attireIndex])
    );
  });
}
```

(No `noUncheckedIndexedAccess` in the toolchain — plain indexing over the length-checked arrays is the house style.)

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm --filter @sevendays/admin test -- --run package-editor-state save-contract
```

Expected: PASS — exactly two files run (`package-editor-state.test.ts`, `save-contract.test.ts`), both green, the new describe's 8 its among them. Then the whole-suite floor:

```bash
pnpm --filter @sevendays/admin test -- --run
```

Expected: **Test Files 26 passed (26) · Tests 262 passed (262)** (the 254 baseline + 8).

- [ ] **Step 5: Lint, format, typecheck**

```bash
pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/admin typecheck
```

Expected: both green (accept `fix`'s rewrites; re-run the suite from Step 4 if it rewrites anything).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/lib/save-contract.ts apps/admin/src/lib/save-contract.test.ts apps/admin/src/lib/package-editor-state.ts apps/admin/src/lib/package-editor-state.test.ts
git commit -m "feat(admin): the login busy labels + the package editor dirty seam (#242)"
```

### Task 2: The vocabulary rides — the Site-tab Save + both login buttons

Ticket items 4 + 5. Three existing labeled buttons adopt the house render shape verbatim (`shared.tsx:842-862`'s footer, `package-editor.tsx:726-734`'s Save) — no new composition, no new classes. `login.tsx` imports `PendingSpinner` from the CMS shared library: it is the vocabulary's ONE spinner source (#218 placed it there; a second `LoaderCircle` render in the route would fork the law), and the production build gate below proves the route bundles with the new edges.

**Files:**
- Modify: `apps/admin/src/components/settings/site-tab.tsx` (header comment 1-6, import line 23, a new import after line 26, the footer Save 396-400)
- Modify: `apps/admin/src/routes/login.tsx` (header comment 1-8, imports 9-17, the forgot button 171-174, the sign-in button 216-218)

**Interfaces:**
- Consumes: `SIGNING_IN_LABEL`, `SENDING_LABEL` (Task 1, `#/lib/save-contract`); `SAVING_LABEL` (on disk, same module); `PendingSpinner` (on disk, `#/components/cms/shared`); `save.isPending` (React Query v5, site-tab's `useMutation` at line 167); `submitting` (login's `useState`, line 65).
- Produces: nothing a later task consumes.

**Not here:** a Site-tab dirty gate (item 6 is the package editor's alone); the logo upload's `accept`/JPG line (#246); the Socials fields (#247); the Upload/Remove logo buttons (their `logoUploading` gate is untouched); the login copy, the anti-enumeration flow, or the `submitting` state machine — the sign-in success path still navigates without resetting `submitting` (the button holds "Signing in…" until the route unmounts — the correct posture, no flash back to "Sign in"); the pre-existing shared-`submitting` quirk across modes (a mid-flight "Forgot password?" toggle renders the other mode's button busy — state sharing predates this ticket and stays unchanged).

- [ ] **Step 1: Load the UI/UX skill set**

Per AGENTS.md, load `prototype` + `ui-ux-pro-max` (plus `ui-styling` as relevant) before editing. The rendered shape is pinned below — the skills inform judgment (focus/disabled affordance, `aria-busy` semantics), not re-composition.

- [ ] **Step 2: `site-tab.tsx` — the footer Save rides the vocabulary**

(a) Replace the header comment's last two lines (5-6):

```tsx
// tab's footer when the header stopped being Site-only; its shape is
// otherwise the #215 build's.
```

with:

```tsx
// tab's footer when the header stopped being Site-only; its shape is
// the #215 build's plus #242's pending vocabulary on the footer Save.
```

(b) Replace line 23:

```tsx
import { QUERY_ERROR_LINE, QueryErrorState } from '#/components/cms/shared';
```

with:

```tsx
import { PendingSpinner, QUERY_ERROR_LINE, QueryErrorState } from '#/components/cms/shared';
```

(c) Insert after line 26 (`import { type CoverUploadStatus, uploadCover } from '#/lib/cover-upload';`):

```tsx
import { SAVING_LABEL } from '#/lib/save-contract';
```

(d) Replace the footer (396-400):

```tsx
      <div className='flex justify-end'>
        <Button type='button' onClick={handleSave}>
          Save changes
        </Button>
      </div>
```

with:

```tsx
      <div className='flex justify-end'>
        <Button
          type='button'
          disabled={save.isPending}
          aria-busy={save.isPending}
          onClick={handleSave}
        >
          {save.isPending ? <PendingSpinner /> : null}
          {save.isPending ? SAVING_LABEL : 'Save changes'}
        </Button>
      </div>
```

- [ ] **Step 3: `login.tsx` — both submit buttons ride the vocabulary**

(a) Append to the header comment (after line 8, `// aimed URL through the open-redirect guard.`):

```tsx
// Both submit buttons ride the one pending vocabulary (#218's, completed by
// the M7 post-flight #242): disabled + aria-busy + the spinner prefix + the
// "Signing in…" / "Sending…" swap while `submitting` holds.
```

(b) The imports: insert before `import { authClient } from '#/lib/auth-client';`:

```tsx
import { PendingSpinner } from '#/components/cms/shared';
```

and after it:

```tsx
import { SENDING_LABEL, SIGNING_IN_LABEL } from '#/lib/save-contract';
```

(c) Replace the forgot-mode button (171-174):

```tsx
                <Button type='submit' className='w-full' disabled={submitting}>
                  {/* Owner-ratified verbatim, 2026-10-19 (#221 round). */}
                  Send reset link
                </Button>
```

with:

```tsx
                <Button
                  type='submit'
                  className='w-full'
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? <PendingSpinner /> : null}
                  {/* Idle label owner-ratified verbatim, 2026-10-19 (#221 round); the busy label 2026-11-08 (#242). */}
                  {submitting ? SENDING_LABEL : 'Send reset link'}
                </Button>
```

(d) Replace the sign-in button (216-218):

```tsx
                <Button type='submit' className='w-full' disabled={submitting}>
                  Sign in
                </Button>
```

with:

```tsx
                <Button
                  type='submit'
                  className='w-full'
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? <PendingSpinner /> : null}
                  {submitting ? SIGNING_IN_LABEL : 'Sign in'}
                </Button>
```

- [ ] **Step 4: Grep gate — every touched button carries the vocabulary**

```bash
grep -c "aria-busy" apps/admin/src/components/settings/site-tab.tsx apps/admin/src/routes/login.tsx
grep -c "PendingSpinner" apps/admin/src/components/settings/site-tab.tsx apps/admin/src/routes/login.tsx
```

Expected: `aria-busy` — `site-tab.tsx:1`, `login.tsx:2` (neither file carried one before — recon grep); `PendingSpinner` — `site-tab.tsx:2` (import + render), `login.tsx:3` (import + two renders). Save the output to the evidence dir as `task-2-grep.txt`.

- [ ] **Step 5: Lint, format, test, typecheck, build**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test -- --run
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin build
```

Expected: all green; the suite stays at **Test Files 26 passed (26) · Tests 262 passed (262)** (no suite change in this task); the build succeeds with the login route's two new module edges.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/components/settings/site-tab.tsx apps/admin/src/routes/login.tsx
git commit -m "feat(admin): the Site-tab Save + both login buttons ride the pending vocabulary (#242)"
```

### Task 3: The package editor's dirty-state Save gate

Ticket item 6. The editor snapshots a `savedBaseline` and disables Save on `savePending || !dirty`. Sharing the hydrated instance between `state` and `savedBaseline` is safe because every state update in the editor is immutable — spreads, `map`, `filter`, `arrayMove`, and both `splice` sites (`addPrint`/`addPrivilege`) copy the array first (verified this session); nothing ever mutates the baseline in place.

**Files:**
- Modify: `apps/admin/src/components/packages/package-editor.tsx` (header comment after line 18, the seam import 85-98, after the state init 288-292, after the refs 296-299, the hydrate effect 310-316, `editSave.onSuccess` 584-595, `saveChanges` 615-620, after `uploading` at 700, the Save button 726-734)

**Interfaces:**
- Consumes: `isEditorStateDirty(current: PackageEditorState, baseline: PackageEditorState): boolean` (Task 1); `newEditorState`, `editorStateFromRead`, `PackageEditorState` (on disk, same module).
- Produces: nothing a later task consumes.

**Not here:** re-seeding the editor's state after save (the state/posture behavior is untouched — only the gate's baseline moves); `handleSaveFailure` and its toast/inline mapping (duplicate-name surfacing is #245's root fix); the cover buttons (they already ride `UPLOADING_LABEL`); the packages table + its row actions; any seam change (Task 1 owns the seam); the create path's navigation (create success unmounts into the edit route, which hydrates its own baseline).

- [ ] **Step 1: Load the UI/UX skill set**

Per AGENTS.md, load `prototype` + `ui-ux-pro-max` (plus `ui-styling` as relevant) before editing. The gate's rendered posture is pinned below (a clean-disabled Save renders the idle label, no spinner, no `aria-busy`).

- [ ] **Step 2: The header note + the seam import**

(a) Append to the header comment (after line 18, `// mode renders NO Advanced card (the server generates the slug — AQ-6).`):

```tsx
//
// The Save button's clean-form gate (M7 post-flight #242): disabled until
// the state structurally differs from its saved baseline (the seam's
// isEditorStateDirty); a successful edit save re-baselines.
```

(b) Replace the seam import (85-98) with (Biome's case-insensitive order — `InclusionFieldErrors` sorts before `isEditorStateDirty`, `in` < `is`):

```tsx
import {
  buildCreatePayload,
  buildUpdatePayload,
  conflictFieldErrors,
  DURATION_HELPER,
  type EditorFieldErrors,
  type EditorInclusion,
  editorStateFromRead,
  type InclusionFieldErrors,
  isEditorStateDirty,
  newEditorState,
  type PackageEditorState,
  PESO_HELPER,
  validateEditorState,
} from '#/lib/package-editor-state';
```

- [ ] **Step 3: The baseline state + the mutate-time ref**

(a) Insert directly after the state init (after line 292, the `useState<PackageEditorState | null>(() => mode === 'create' ? newEditorState() : null);` statement):

```tsx
  // #242: the dirty gate's baseline — the snapshot the live state compares
  // against (structurally, via isEditorStateDirty). The hydrate sets it for
  // edit; create's is its own initial state (the empty form is clean); a
  // successful edit save re-sets it to what was saved. A failed save never
  // touches it — the form stays dirty and retry is safe (#218's hold law).
  const [savedBaseline, setSavedBaseline] = useState<PackageEditorState | null>(() =>
    mode === 'create' ? newEditorState() : null
  );
```

(b) Insert directly after `const previewUrlRef = useRef<string | null>(null);` (line 299):

```tsx
  // #242: the MUTATE-time state snapshot the next re-baseline adopts. React
  // Query fires onSuccess from the latest render's options and the inputs
  // stay editable while a save is in flight, so an onSuccess closure over
  // `state` could adopt an unsaved mid-flight edit — the ref pins what was
  // actually sent; a mid-flight edit keeps the form dirty until its own save.
  const pendingBaselineRef = useRef<PackageEditorState | null>(null);
```

- [ ] **Step 4: The hydrate sets both**

Replace the hydrate effect (310-316):

```tsx
  // Hydrate once from the edit read — never on refetch (a post-save
  // invalidation must not clobber the editor's state).
  useEffect(() => {
    if (mode === 'edit' && packageQuery.data?.ok && state === null) {
      setState(editorStateFromRead(packageQuery.data.data));
    }
  }, [mode, packageQuery.data, state]);
```

with:

```tsx
  // Hydrate once from the edit read — never on refetch (a post-save
  // invalidation must not clobber the editor's state). The hydrated state
  // is also the dirty gate's first baseline (#242) — the same instance, so
  // row keys and frame tokens compare identity-stable.
  useEffect(() => {
    if (mode === 'edit' && packageQuery.data?.ok && state === null) {
      const hydrated = editorStateFromRead(packageQuery.data.data);
      setState(hydrated);
      setSavedBaseline(hydrated);
    }
  }, [mode, packageQuery.data, state]);
```

- [ ] **Step 5: The snapshot at mutate time + the re-baseline on success**

(a) In `saveChanges`, replace the dispatch (615-620):

```tsx
    setFieldErrors(null);
    if (mode === 'create') {
      createSave.mutate(buildCreatePayload(state, attiresQuery.data));
    } else {
      editSave.mutate(buildUpdatePayload(state, attiresQuery.data));
    }
```

with:

```tsx
    setFieldErrors(null);
    if (mode === 'create') {
      createSave.mutate(buildCreatePayload(state, attiresQuery.data));
    } else {
      pendingBaselineRef.current = state;
      editSave.mutate(buildUpdatePayload(state, attiresQuery.data));
    }
```

(b) In `editSave`'s `onSuccess` (584-595 — the block carrying `adminPackageQueries.byId(result.data.id)` and `// Stay on the route.`; createSave's `onSuccess` is NOT touched), replace:

```tsx
        toast.success('Saved.');
        // Stay on the route.
```

with:

```tsx
        toast.success('Saved.');
        // #242: what was sent is the new baseline — the form is clean again
        // and Save re-disables until the next edit.
        setSavedBaseline(pendingBaselineRef.current);
        // Stay on the route.
```

- [ ] **Step 6: The gate on the Save button**

(a) Insert directly after `const uploading = uploadStatus.phase === 'presigning' || uploadStatus.phase === 'uploading';` (line 700 — below the early returns, where `state` is already narrowed non-null):

```tsx
  // #242: the clean-form gate. savedBaseline is non-null wherever the editor
  // renders (it is set beside the state: hydrate for edit, the initial state
  // for create); the null guard keeps the types honest and errs ENABLED —
  // the seam's own direction (the gate may open on a no-op save, never
  // block a real one).
  const dirty = savedBaseline === null || isEditorStateDirty(state, savedBaseline);
```

(b) Replace the Save button's disabled prop (726-734) — the full button after the edit:

```tsx
          <Button
            type='button'
            disabled={savePending || !dirty}
            aria-busy={savePending}
            onClick={saveChanges}
          >
            {savePending ? <PendingSpinner /> : null}
            {savePending ? SAVING_LABEL : 'Save changes'}
          </Button>
```

(Only `disabled` changes — `aria-busy`, the spinner, and the label stay `savePending`-only per the dirty-gate law.)

- [ ] **Step 7: Grep gate — the seven wiring points**

```bash
grep -n "savedBaseline\|setSavedBaseline\|pendingBaselineRef\|isEditorStateDirty\|savePending || !dirty" apps/admin/src/components/packages/package-editor.tsx
```

Expected: hits at all seven wiring points — (1) the `isEditorStateDirty` import specifier, (2) the `savedBaseline`/`setSavedBaseline` `useState`, (3) the `pendingBaselineRef` `useRef`, (4) `setSavedBaseline(hydrated)` in the effect, (5) `pendingBaselineRef.current = state;` in `saveChanges`, (6) `setSavedBaseline(pendingBaselineRef.current);` in `editSave.onSuccess`, (7) the `dirty` const + `disabled={savePending || !dirty}` (comment lines naming the seam also match — expected). Save the output as `task-3-grep.txt`. Also confirm createSave's `onSuccess` is byte-identical: `git diff -U0 apps/admin/src/components/packages/package-editor.tsx | grep -c "navigate({ to: '/packages/\$packageId/edit'"` → `0` (the create path is untouched).

- [ ] **Step 8: Lint, format, test, typecheck**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test -- --run
pnpm --filter @sevendays/admin typecheck
```

Expected: all green; the suite stays at **Test Files 26 passed (26) · Tests 262 passed (262)**. No build (no new module edge — Global Constraints).

- [ ] **Step 9: Commit**

```bash
git add apps/admin/src/components/packages/package-editor.tsx
git commit -m "feat(admin): the package editor's dirty-state Save gate (#242)"
```

### Task 4: Gates, the live walkthrough, docs rotation, PR, the v1 split, issues, graphify

**Files:**
- Modify: `docs/progress.md` (one dated entry, newest first), `AGENTS.md` (two pinned find/replace edits), this plan file (ticked boxes)
- Post-merge on main: `docs/agents/v1-picks.md` (one ledger row), `graphify-out/` (the graph update)

**Interfaces:** consumes the three code commits (Tasks 1–3); produces nothing code-facing.

**Not here:** any code change (a defect found by Step 2 goes back to its owning task's file with its own fix commit, then this task re-runs from Step 1); `docs/plan.md` (M7 is closed and the post-flight carries no roadmap box — #239's disposition cuts tickets, not plan.md boxes; nothing in plan.md ticks or annotates for #242).

- [ ] **Step 1: The full check**

```bash
pnpm check
```

Expected: green across the repo (lint + format + typecheck + test). Floors after this ticket: admin **26 files / 262 tests**; every other suite unchanged from AGENTS.md's recorded floors (api, api-client, landing, types, db — this ticket touches none of them).

- [ ] **Step 2: The live walkthrough (controller step — both themes, evidence for the PR)**

Bring up the local stack (`pnpm --filter @sevendays/api dev` + `pnpm --filter @sevendays/admin dev`). Drive a real browser — the `browser-use:control-browser` skill, or a throwaway headed Playwright script kept OUTSIDE the repo — with an artificial ~2 s delay on the relevant requests so every busy state is observable and capturable (Playwright: `await page.route('**/api/auth/**', async (route) => { await new Promise((r) => setTimeout(r, 2000)); await route.continue(); })`, and the same for `**/_serverFn/**` POSTs). Sign-ins use the controller's dev staff account (the owner's local credentials — never written to the evidence dir, never committed). Walk, in order, capturing each numbered state to `.superpowers/sdd/2026-11-08-242-pending-vocabularies-dirty-gate/` (light first):

1. `/login`, WRONG password → Sign in: mid-flight the button is disabled + spinner + "Signing in…" + `aria-busy="true"` (DOM attribute check); after: the generic "Invalid email or password." line and the button back to an enabled "Sign in".
2. "Forgot password?" → an email that matches NO account (`nobody@example.com` — BetterAuth's timing-simulated miss sends nothing, so no outbound email) → Send reset link: mid-flight spinner + "Sending…" + disabled + `aria-busy="true"`; after: the generic "If that account exists, a reset link is on its way." line.
3. "Back to sign in" → the real credentials → Sign in: "Signing in…" holds until the shell renders (no flash back to "Sign in").
4. `/settings` → Site tab → edit any text field → Save changes: mid-flight spinner + "Saving…" + disabled + `aria-busy="true"`; after: the "Saved." toast, the button back to an enabled "Save changes". Revert the field and save again to leave the live content unchanged.
5. `/packages` → open any package's editor: on load Save is DISABLED with the idle "Save changes" label and NO spinner; type one character into Name → Save ENABLES; delete that character (the text equals the original again) → Save DISABLES (the structural law, not a "touched" flag); toggle Featured and Save → mid-flight "Saving…" → after success Save DISABLES again (the re-baseline). Toggle Featured back and Save to leave the live package unchanged.
6. `/packages/new`: Save DISABLED at first render; type a name → ENABLES. Leave the page without saving (nothing is created).

Then toggle dark (the admin topbar's theme toggle — the login page renders the persisted theme) and repeat 1–6. Write a short narration (`walkthrough.md`) listing each state's observed outcome. Any deviation is a defect — fix it in the owning task's file, re-run that task's gates, commit a `fix(admin): … (#242)`, and restart this task from Step 1.

- [ ] **Step 3: `docs/progress.md` — the dated entry (newest first, pinned)**

Insert as the first entry under `# Progress` (replace `2026-11-XX` with the docs commit's date — the #221 plan's dated-annotation convention):

```markdown
- **2026-11-XX — M7 post-flight T2, the admin pending vocabularies + the dirty-state Save gate (#242) — build complete on `feat/242-pending-vocabularies-dirty-gate`, PR pending.** The #218 pending vocabulary now covers the three surfaces the M7 demo found lacking (#239 items 4–6): the Settings Site tab's footer Save rides the full vocabulary over `save.isPending` (disabled + spinner + "Saving…" + `aria-busy` — lost in #221's relocation, now restored); the login card's two submit buttons ride it over the shared `submitting` state ("Signing in…" / "Sending…" — the two new busy labels, owner-ratified 2026-11-08, live beside the five in `save-contract.ts`); and the package editor's Save stays disabled while the form is clean — the new `isEditorStateDirty` lib seam compares the live state structurally against a snapshotted baseline (Object.is for the unpriced NaN encoding, the three-state cover, inclusions and attires in array order — a no-op attire re-toggle reads dirty, the safe direction), in both modes (create's Save starts disabled), re-baselined to the mutate-time snapshot after a successful edit save (a ref out-races React Query's latest-options onSuccess closure; a failed save never moves the baseline). Walked live on the dev stack in both themes. Admin-only — zero api/types/landing/db/ui changes; admin floor 26 files / 262 tests (+8 dirty-seam its, +2 label pins).
```

- [ ] **Step 4: `AGENTS.md` — two pinned find/replace edits**

(a) In *Current status of `pnpm test`*, replace the admin floor clause's head:

```text
admin floor 26 files / 254 tests (
```

with:

```text
admin floor 26 files / 262 tests (
```

and its tail:

```text
+ #221's settings/auth seams — the never-throwing reset-email forward, the lockout guards, the users row vocabulary)
```

with:

```text
+ #221's settings/auth seams — the never-throwing reset-email forward, the lockout guards, the users row vocabulary; + #242's dirty-gate seam — isEditorStateDirty's structural law — and the Signing in…/Sending… label pins)
```

(b) In the Engineering Rules status paragraph, replace:

```text
with the nonce machinery deleted, one pending vocabulary, guarded delete dialogs
```

with:

```text
with the nonce machinery deleted, one pending vocabulary (its coverage completed by the M7 post-flight #242 — the Site-tab Save and both login buttons — beside the package editor's dirty-state Save gate), guarded delete dialogs
```

(Each find string occurs exactly once in AGENTS.md — verified at plan time with `grep -c`.)

- [ ] **Step 5: The docs commit**

Tick this plan's executed boxes (`- [✅]`), then:

```bash
git add docs/progress.md AGENTS.md docs/superpowers/plans/2026-11-08-242-admin-pending-vocabularies-dirty-gate.md
git commit -m "docs(post-flight): #242 lands the pending vocabularies + the dirty-state Save gate - progress, AGENTS floor + coverage note (#242)"
```

- [ ] **Step 6: PR + squash merge**

Push `feat/242-pending-vocabularies-dirty-gate`; open the PR against main titled `Post-flight T2 — admin save/sign-in pending vocabularies + the dirty-state Save gate (#242)`; body: the four ACs each answered with its evidence pointer — (1) Site-tab Save: walkthrough state 4 (both themes) + `task-2-grep.txt`; (2) Login: walkthrough states 1–3 (both themes — incl. the forgot-mode button the owner ruled in) + `task-2-grep.txt`; (3) Package editor: walkthrough states 5–6 (incl. the structural revert-disables and the re-baseline) + `task-3-grep.txt`; (4) `pnpm check` green + the seams' suites extended (`isEditorStateDirty` +8 its, the two label pins; admin 26 files / 262 tests). Squash-merge.

- [ ] **Step 7: The v1 split (per `docs/agents/v1-picks.md`)**

Run the path pass on the squash SHA:

```bash
node scripts/v1-triage.mjs <main-sha>
```

Expected: **SPLIT** — the #234/#235 precedent for admin-only tickets (the classifier output is the truth over this expectation — the #237 row's precedent). v1-paths: the seven `apps/admin/src/**` files (+ `AGENTS.md` through § Content pass — the floor/coverage prose is edition-neutral test-status/design-system prose, the #234 class); main-only, dropped: this plan file + `docs/progress.md`. Content pass: the admin code is edition-neutral (both editions run the same admin per ADR-0018 — the login card and the CMS screens exist on both, the #218/#221 class). Execute per § Executing a SPLIT, run § The locks (`pnpm check` + `pnpm build` green, the export audit exit 0), push, CI green. Append the ledger row on main, filling every bracketed value from the actual run:

```text
| <merge date> | #<PR> | `<main-sha>` | split | `<v1-sha>` | #242 — M7 post-flight T2: the admin pending vocabularies (the Site-tab Save + both login buttons, "Signing in…"/"Sending…") + the package editor's dirty-state Save gate (isEditorStateDirty). Classifier SPLIT — <n> v1-paths + <m> main-only (the plan file, docs/progress.md). Locks: <check/build/audit results>; run <run-id> green |
```

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #<PR> ledger row - the #242 split (admin pending vocabularies + the dirty-state Save gate)"
```

- [ ] **Step 8: Issue closes + graphify**

Tick #242's four AC boxes in its body, then close it with the AC → evidence mapping:

```bash
gh issue view 242 --json body --jq .body | sed 's/^- \[ \]/- [✅]/' > /tmp/242-body.md
gh issue edit 242 --body-file /tmp/242-body.md
gh issue close 242 --comment "Landed in #<PR> (main <main-sha>, v1 split <v1-sha>). AC1 Site-tab Save: pending vocabulary over save.isPending (walkthrough state 4, both themes). AC2 Login: spinner + disabled + Signing in…/Sending… on both submit buttons (states 1–3). AC3 Package editor: Save disabled until dirty via isEditorStateDirty, both modes, re-baselined on successful save (states 5–6). AC4 pnpm check green; the seams' suites extended (+8 dirty-seam its, +2 label pins; admin 26 files / 262 tests)."
gh issue comment 239 --body "Items 4, 5, 6 landed with #242 (PR #<PR>, main <main-sha>): the Site-tab Save pending vocabulary, the login spinner (both submit buttons — Signing in…/Sending…, owner-ratified 2026-11-08), and the package editor's dirty-state Save gate."
```

Then the graph (on main, after the ledger commit):

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#242 graph update"
```
