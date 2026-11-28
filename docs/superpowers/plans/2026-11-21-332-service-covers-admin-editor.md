# Plan: #332, Service covers: admin editor Cover field, upload, replace, remove

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff manage a studio service's cover photo in the create/edit editor, the branch editor's Cover composition ported whole onto the studio-services editor: the four preview states (bound / pending-removal / stored / empty), picker-only JPG upload over the existing cover-upload seam wired to the presign server fn under the `'service-cover'` purpose, machine status lines, courtesy pre-checks, pending-remove-until-Save, and the tri-state carried by the state seam exactly like the branch builder.

**Architecture:** Zero api/types changes, the #331 spine already carries the whole contract (the split write schemas validate the tri-state; the api save runs the cover law). The work is two admin seams + one screen: (1) `light-entity-state.ts` grows the cover state fields and the **builder split** (`buildStudioServiceCreatePayload` / `buildStudioServiceUpdatePayload`, the #214 branch-builder law verbatim; the #331-era `buildStudioServicePayload` and its Task-3 JSDoc note retire), (2) `studio-services-screen.tsx` ports the branch editor's cover loop (state, handlers, open/reset lifecycle) and its Cover card JSX block verbatim with only the purpose changed, and (3) `cover-upload.ts` needs NO code change, the purpose parameter already accepts any `MediaPurpose` (widened in #331) and its non-site-logo branch is JPG-only; one purpose-passthrough pin joins its suite. Cover save conflicts surface through the ported mapped-or-toast channel (exactly the branch editor's behavior, see the audit note). The gallery drag-and-drop tray stays out (M7 #220, cover fields are picker-only).

**Tech Stack:** admin-only (TanStack Start + Tailwind v4, lucide-react, the shared `@sevendays/ui` primitives), zero new dependencies, zero `packages/ui` changes, zero api/types changes, vitest lib-seam pins (plain-node, the house rule: no component/DOM tests; the rendered behavior rides #334's teaser walk).

**Spec:** [GitHub issue #332](https://github.com/jeius/sevendays/issues/332), authoritatively settled by its parent spec, [issue #330](https://github.com/jeius/sevendays/issues/330), repo copy `docs/specs/2026-11-19-services-cover-photos-spec.md` (D7 admin UI; Testing Decisions §4). The rendered-variants gate is the sibling ticket #334 (teaser walk + owner reaction), NOT this plan.

## Worktree law (owner-ruled 2026-11-21): this plan continues on the shared spec branch

**Execution site:** `.worktrees/service-covers`, branch **`service-covers`**, the #331 cycle landed here (5 tasks + docs, tip **`b3a7eaf`**), the owner ruled to hold the branch locally and continue straight into #332. **BASE for this plan's first task = `b3a7eaf`.** No push/PR/rebase happens until the owner calls for it; #331's PR, close, and v1 pick are deferred with it. After THIS ticket, #333 continues on the same branch.

**Controller pre-flight (2026-11-21, HEAD b3a7eaf):** every before-block below was read byte-exact at the cited anchors today; the admin floor was live-confirmed **34 files / 360 tests** (unchanged by #331, its edits were fixture literals); `packages/types` dist carries the split schemas (`CreateStudioServiceInput.coverImageKey?: string` / `UpdateStudioServiceInput.coverImageKey?: string | null`).

## Scope fences

**In scope (admin app only):** `apps/admin/src/lib/light-entity-state.ts` (+ test), `apps/admin/src/lib/cover-upload.test.ts` (one pin; NOT `cover-upload.ts`, no code change), `apps/admin/src/components/studio-services/studio-services-screen.tsx`, `docs/progress.md`, `AGENTS.md` (admin floor), graphify.

**NOT here (siblings / out of scope):**

- **#333, landing consumption** (`home-cards.tsx`, `service-card.tsx`, the precedence helper). Nothing landing-side moves here.
- **#334, the teaser walk + owner reaction**, the #94 rendered-variants gate for BOTH this ticket and #333. Nothing here is "done done" until it records.
- **The api contract**, `resolveServiceCover`, the tri-state save, the presign endpoint: all live since #331 (b3a7eaf). No `apps/api` or `packages/types` edit; the admin server fns' validators already ride the split schemas (verified: `saveAdminStudioServiceCreate.validator(createStudioServiceSchema)`, `saveAdminStudioServiceUpdate.validator(z.object({ id, payload: updateStudioServiceSchema }))`, the cover field flows through untouched).
- **`cover-upload.ts` code**, the seam already takes `purpose: MediaPurpose` (default `'package-cover'`), routes non-site-logo purposes to JPG-only pre-checks and `contentType: 'image/jpeg'` presign requests. `'service-cover'` lands in that branch by construction (the Task 1 pin proves it).
- **`admin.functions.ts`**, zero edits (the validators carry the field; `presignAdminCoverUpload` exists and takes the presign request verbatim).
- **The branch/package/site-logo editors**, untouched (only the studio-services editor gains the block).
- **The gallery drag-and-drop tray**, M7 #220 ruling: cover fields are picker-only.
- **An inline cover-error slot**, the ported composition has none: upload-loop failures render in the Cover card's status lines; SAVE-time cover conflicts (the api's 400 with `['coverImageKey']` details) surface through the same mapped-or-toast channel as every other entity failure (name conflicts map inline; everything else toasts, the branch editor's exact behavior, ported whole).
- **No v1 pick/ledger work in this branch**, post-merge, main-only per `docs/agents/v1-picks.md`.
- **No ADR**, the composition is the #214 branch-editor port (a named precedent); no new mechanics.

## Owner rulings + skill audit

**Owner rulings carried from the spec (charting record, map #324):** picker-only upload (no drag-and-drop, M7 #220 law); JPG-only for this purpose (#170); the stand-in fallback posture is #333's concern, not this editor's. **The lucide icon family stays** (the pinned `components.json` trio vocabulary, ADR-0017), the ui-ux-pro-max Phosphor default is the recorded owner override (#111 discipline), consistent with every prior admin screen.

**UI skill audit (`ui-ux-pro-max`, run against this plan 2026-11-21):** the domain searches ("image upload preview form", "upload progress status feedback") returned the `submit-feedback` (loading → success/error state), `form-labels`, and `progress-indicators` guidelines. The ported block passes each, no new decisions to make, only compliance to verify:

- **Submit feedback:** every upload phase renders, `Presigning…`, `Uploading… N%`, `Cover ready, save to bind it.`, `Upload failed: <message>`, and the upload button flips to a `PendingSpinner` + `Uploading…` label with `aria-busy={coverUploading}`. Never a silent state.
- **Form labels:** the preview `<img>` carries `alt={`${editorState.name} cover`}`; the placeholder div is decorative (`aria-hidden` glyph, no false label); the picker input is wired through a real Button (no hidden-input-only interaction).
- **Progress indicators:** the N% line covers the multi-step loop (presign → upload → bound), per the progress-indicators guideline.
- **Icon family:** lucide everywhere (the `Image` placeholder glyph joins the file's existing `Plus`/`SquarePen`, the recorded Phosphor override).
- **Touch targets / states:** both Cover buttons keep the shared Button primitive's sizing; `disabled={coverUploading}` prevents double-uploads; no layout-shifting press states (primitive-owned).

No anti-pattern trips: no emoji icons, no raster assets, no filled/outline mixing.

## Global Constraints

- **Verbatim values this plan introduces (use exactly; do not paraphrase):**
  - The purpose string at the upload call: `'service-cover'` (the ONLY behavioral delta from the branch composition).
  - The new seam names: `buildStudioServiceCreatePayload(state): CreateStudioServiceInput` and `buildStudioServiceUpdatePayload(state): UpdateStudioServiceInput`, `buildStudioServicePayload` is DELETED in Task 2.
  - The state fields: `StudioServiceEditorState` gains `coverImageUrl: string | null` and `coverImageKey: string | null | undefined` (the `BranchEditorState` shapes verbatim).
  - The tri-state encodings: create includes `coverImageKey` ONLY when it's a string (`...(typeof state.coverImageKey === 'string' ? { coverImageKey: state.coverImageKey } : {})`); update includes it whenever NOT undefined (`...(state.coverImageKey !== undefined ? { coverImageKey: state.coverImageKey } : {})`); the flip payload NEVER carries it (the absence is the law).
  - The status copy (rendered by the ported block): `Presigning…` / `Uploading… <N>%` / `Cover ready, save to bind it.` / `Upload failed: <message>` / the helper line `JPG only, up to 10 MiB.` / button labels `Upload cover` / `Remove cover` / uploading label `Uploading…` (the `UPLOADING_LABEL` constant).
  - The new pins' names (Task 1 lists them verbatim).
- **BASE:** branch `service-covers` @ `b3a7eaf` (the #331 tip). The plan commits on the branch BEFORE the first dispatch.
- **Dist consumers:** admin typecheck consumes `packages/types` dist, already current from #331; no rebuild needed unless types change (they don't in this plan).
- **Test DB:** the admin suite is plain-node lib-seam (no DB), no `TEST_DATABASE_URL` needed for admin gates. The final `pnpm check` (Task 3) still prefixes `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test` for the api leg (container `sevendays-test-db-5433`, start if down).
- **Floors (live-confirmed 2026-11-21 @ b3a7eaf):** admin **34 files / 360 tests** → **34 files / 364 tests** after Task 1 (+4: one cover-upload purpose pin, three state-seam pins), unchanged by Task 2 (renames only) and Task 3 (docs). api 482+3skipped / types 197 / db 4 files (22+8 skipped; 30 passed under TEST_DATABASE_URL) / api-client 45 / landing 134, NONE may move. A differing count means drift: stop and reconcile.
- **Per-task gates:** `pnpm --filter @sevendays/admin test -- --run` AND `pnpm --filter @sevendays/admin typecheck`, both green before each task's commit. Final gate: `pnpm fix` then `pnpm check` green at the repo root.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits follow the repo's commit-work convention, each referencing #332. Prefixes: `feat(admin):` for the code tasks, `docs:` / `chore(graphify):` for Task 3.
- **Filtered-evidence command:** plan-filtered `pnpm test -- --run <files>` runs the WHOLE admin suite in this repo (the #331 lesson); for per-file RED evidence use `pnpm exec vitest run <files>` from the repo root (the #332 equivalent of the #331 lesson, pinned here for the executor).

---

## Task 1, the state seam: cover state + the builder split (+4 pins, TDD)

The branch seam's #214 law ported to the studio-service seam. The new builders land ALONGSIDE the retiring `buildStudioServicePayload` (the screen still calls it until Task 2, this task's gate stays green without touching the screen).

**Files:**
- Modify (test-first): `apps/admin/src/lib/light-entity-state.test.ts` (+3 pins)
- Modify (test-first): `apps/admin/src/lib/cover-upload.test.ts` (+1 pin)
- Modify: `apps/admin/src/lib/light-entity-state.ts` (state interface, the two from-read/new fns, the two new builders, the flip JSDoc)

**Interfaces:**
- Consumes: the #331 types dist (`CreateStudioServiceInput.coverImageKey?: string`, `UpdateStudioServiceInput.coverImageKey?: string | null`).
- Produces (Task 2 consumes exactly these): `StudioServiceEditorState.coverImageUrl: string | null` + `.coverImageKey: string | null | undefined`; `newStudioServiceState()` / `studioServiceStateFromRead(row)` carry them; `buildStudioServiceCreatePayload(state): CreateStudioServiceInput` (bind-only) + `buildStudioServiceUpdatePayload(state): UpdateStudioServiceInput` (tri-state); `buildStudioServiceFlipPayload` unchanged body, cover deliberately absent.

- [ ] **Step 1: Write the three failing state-seam pins.** In `apps/admin/src/lib/light-entity-state.test.ts`, inside the existing `describe('studio-service state', …)` block, add after the `studioServiceStateFromRead hands the editor its OWN branchIds copy` pin (which ends `expect(state.branchIds).not.toBe(service.bookableBranchIds);` + `});`):

```ts
  it('a studio-service read with a cover seeds coverImageUrl; the editor key starts undefined (a read never echoes keys)', () => {
    const covered = { ...service, coverImageUrl: 'https://pub-test.r2.dev/covers/aaaa.jpg' };
    const state = light.studioServiceStateFromRead(covered);
    expect(state.coverImageUrl).toBe('https://pub-test.r2.dev/covers/aaaa.jpg');
    expect(state.coverImageKey).toBeUndefined();
    const fresh = light.newStudioServiceState();
    expect(fresh.coverImageUrl).toBeNull();
    expect(fresh.coverImageKey).toBeUndefined();
  });

  it('studio-service CREATE payload includes the cover ONLY when the state carries a fresh staging key', () => {
    const state = light.studioServiceStateFromRead(service);
    expect('coverImageKey' in light.buildStudioServiceCreatePayload(state)).toBe(false);
    const bound = { ...state, coverImageKey: 'tmp/00000000-0000-4000-8000-00000000000c.jpg' };
    expect(light.buildStudioServiceCreatePayload(bound).coverImageKey).toBe(
      'tmp/00000000-0000-4000-8000-00000000000c.jpg'
    );
  });

  it('studio-service UPDATE payload encodes the cover tri-state: absent = property ABSENT, null = clear, string = bind', () => {
    const state = light.studioServiceStateFromRead(service);
    expect('coverImageKey' in light.buildStudioServiceUpdatePayload(state)).toBe(false);
    expect(
      light.buildStudioServiceUpdatePayload({ ...state, coverImageKey: null }).coverImageKey
    ).toBeNull();
    expect(
      light.buildStudioServiceUpdatePayload({
        ...state,
        coverImageKey: 'tmp/00000000-0000-4000-8000-00000000000c.jpg',
      }).coverImageKey
    ).toBe('tmp/00000000-0000-4000-8000-00000000000c.jpg');
  });
```

- [ ] **Step 2: Write the cover-upload purpose pin (expected PRE-GREEN, see Step 3).** In `apps/admin/src/lib/cover-upload.test.ts`, directly after the branch purpose pin (`passes the caller purpose through to presign (M7 #214: branch covers presign as branch-cover)`, which ends `});` after its `expect(presign).toHaveBeenCalledWith({…})`), add:

```ts
  it('passes the caller purpose through to presign (#332: service covers presign as service-cover)', async () => {
    const seen: CoverUploadStatus[] = [];
    const presign = vi.fn(() => Promise.resolve({ key: 'tmp/k.jpg', uploadUrl: 'https://r2/put' }));
    const promise = uploadCover(JPEG, presign, (s) => seen.push(s), 'service-cover');
    await vi.waitFor(() => expect(FakeXhr.last).toBeDefined());
    FakeXhr.last?.onload?.();
    await expect(promise).resolves.toBeUndefined();
    expect(presign).toHaveBeenCalledWith({
      purpose: 'service-cover',
      contentType: 'image/jpeg',
    });
  });
```

- [ ] **Step 3: Run the pins to verify the RED state (filtered, see Global Constraints).**

Run: `pnpm exec vitest run apps/admin/src/lib/light-entity-state.test.ts apps/admin/src/lib/cover-upload.test.ts`
Expected: the THREE state pins FAIL (RED), `light.buildStudioServiceCreatePayload` is not a function (TypeError on the missing builder), and the read-seeds pin's `state.coverImageUrl` assertions fail on undefined. The FOURTH pin (the cover-upload purpose passthrough) is expected **PRE-GREEN**: the seam already passes any caller purpose through verbatim (`purpose` is a parameter, `MediaPurpose` carries `'service-cover'` since #331), the pin characterizes the "no cover-upload.ts change" claim rather than driving one. Record all four states honestly; the TDD gate is the three RED state pins.

- [ ] **Step 4: Land the seam.** In `apps/admin/src/lib/light-entity-state.ts`:

(a) The state interface, current block (lines 62–76) for exact match:

```ts
/**
 * The studio-service editor's whole state. `#143 seam: the studio-service
 * state shape`. `branchIds` is in CLICK order (the prototype's toggle
 * appends): junction order is the fact, membership is what round-trips.
 */
export interface StudioServiceEditorState {
  name: string;
  description: string;
  /** ADR-0020: false = unpriced, the payload saves null and the entry is discarded. */
  hasPrice: boolean;
  /** NaN = nothing entered (the re-entry encoding, meaningful only when hasPrice). */
  priceCents: number;
  isActive: boolean;
  branchIds: string[];
}
```

Replace with:

```ts
/**
 * The studio-service editor's whole state. `#143 seam: the studio-service
 * state shape`. `branchIds` is in CLICK order (the prototype's toggle
 * appends): junction order is the fact, membership is what round-trips.
 * The cover fields carry the branch editor's tri-state law (#332, the
 * #214 port): `coverImageUrl` mirrors the read's resolved URL for the
 * preview; `coverImageKey`: undefined = unchanged, null = clear, string =
 * a fresh staging key (ADR-0019) to bind on the next save.
 */
export interface StudioServiceEditorState {
  name: string;
  description: string;
  /** ADR-0020: false = unpriced, the payload saves null and the entry is discarded. */
  hasPrice: boolean;
  /** NaN = nothing entered (the re-entry encoding, meaningful only when hasPrice). */
  priceCents: number;
  isActive: boolean;
  branchIds: string[];
  coverImageUrl: string | null;
  coverImageKey: string | null | undefined;
}
```

(b) `studioServiceStateFromRead`, current block (lines 271–284) for exact match:

```ts
export function studioServiceStateFromRead(
  row: StudioServiceWithBranches
): StudioServiceEditorState {
  return {
    name: row.name,
    description: row.description,
    hasPrice: row.priceCents !== null,
    priceCents: row.priceCents ?? Number.NaN,
    isActive: row.isActive,
    // The state owns its own copy, a push on editor state must never
    // mutate the React Query cache row (#143 sweep: replace, never push).
    branchIds: [...row.bookableBranchIds],
  };
}
```

Replace with:

```ts
export function studioServiceStateFromRead(
  row: StudioServiceWithBranches
): StudioServiceEditorState {
  return {
    name: row.name,
    description: row.description,
    hasPrice: row.priceCents !== null,
    priceCents: row.priceCents ?? Number.NaN,
    isActive: row.isActive,
    // The state owns its own copy, a push on editor state must never
    // mutate the React Query cache row (#143 sweep: replace, never push).
    branchIds: [...row.bookableBranchIds],
    // #332: a read never echoes keys, the cover is unchanged until the
    // editor says otherwise (the branch seam's law verbatim).
    coverImageUrl: row.coverImageUrl,
    coverImageKey: undefined,
  };
}
```

(c) `newStudioServiceState`, current block (lines 290–301) for exact match:

```ts
export function newStudioServiceState(): StudioServiceEditorState {
  return {
    name: '',
    description: '',
    // Owner ruling 2026-10-12: create defaults unchecked, pricing is an
    // explicit act; the fresh payload saves null.
    hasPrice: false,
    priceCents: Number.NaN,
    isActive: true,
    branchIds: [],
  };
}
```

Replace with:

```ts
export function newStudioServiceState(): StudioServiceEditorState {
  return {
    name: '',
    description: '',
    // Owner ruling 2026-10-12: create defaults unchecked, pricing is an
    // explicit act; the fresh payload saves null.
    hasPrice: false,
    priceCents: Number.NaN,
    isActive: true,
    branchIds: [],
    coverImageUrl: null,
    coverImageKey: undefined,
  };
}
```

(d) The builder split, the two new builders INSERT ALONGSIDE the retiring `buildStudioServicePayload` (lines 303–320, with its Task-3 #331 JSDoc): it SURVIVES this task untouched (the screen still calls it; Task 2 deletes it with its last caller, converging the file to the after-block below's end-state), and the flip's JSDoc gains the cover-absence law. Current block for exact match:

```ts
/**
 * `#143 seam: studio-service state → full-object PUT payload`. The four
 * entity fields ONLY, never the matrix ids; relations ride their own
 * full-replace PUTs (`buildBranchMatrixPayload` / the add-on diff).
 * Task-3 #331: typed as the CREATE input, the body is create-shaped (no
 * cover key), and Create assigns to the update fn at the screen's update
 * site (#332 supersedes this builder with the split + tri-state encoding).
 */
export function buildStudioServicePayload(
  state: StudioServiceEditorState
): CreateStudioServiceInput {
  return {
    name: state.name,
    description: state.description,
    priceCents: state.hasPrice ? state.priceCents : null,
    isActive: state.isActive,
  };
}
```

Replace with:

```ts
/**
 * `#143 seam: studio-service state → create payload` (#332, the #214
 * branch-builder split's law). The four entity fields ONLY, never the
 * matrix ids; relations ride their own full-replace PUTs
 * (`buildBranchMatrixPayload` / the add-on diff). `coverImageKey` is
 * included ONLY when the state carries a fresh staging key string.
 */
export function buildStudioServiceCreatePayload(
  state: StudioServiceEditorState
): CreateStudioServiceInput {
  return {
    name: state.name,
    description: state.description,
    priceCents: state.hasPrice ? state.priceCents : null,
    isActive: state.isActive,
    ...(typeof state.coverImageKey === 'string' ? { coverImageKey: state.coverImageKey } : {}),
  };
}

/**
 * `#143 seam: studio-service state → full-object PUT payload` (#332, the
 * create mapping plus the three-state cover encoding): `undefined` =
 * property ABSENT from the object (unchanged), `null` = explicit clear,
 * string = bind the fresh staging key (#137's update shape / ADR-0019).
 */
export function buildStudioServiceUpdatePayload(
  state: StudioServiceEditorState
): UpdateStudioServiceInput {
  return {
    name: state.name,
    description: state.description,
    priceCents: state.hasPrice ? state.priceCents : null,
    isActive: state.isActive,
    ...(state.coverImageKey !== undefined ? { coverImageKey: state.coverImageKey } : {}),
  };
}
```

(e) The flip JSDoc, current block (lines 322–326) for exact match:

```ts
/**
 * `#143 seam: read → studio-service flip payload`. The read reshaped
 * into the full-object update payload with ONLY `isActive` flipped:
 * every entity field carried, the flip never drops a field (#137).
 */
```

Replace with:

```ts
/**
 * `#143 seam: read → studio-service flip payload`. The read reshaped
 * into the full-object update payload with ONLY `isActive` flipped:
 * every entity field carried, the flip never drops a field (#137).
 * `coverImageKey` is deliberately ABSENT: the absence is what makes a
 * flip never re-verify or clobber media, the cover is untouched by the
 * PUT (the tri-state encoding; the read never echoes keys anyway).
 */
```

(The flip body itself is unchanged, it never carried a cover key.)

- [ ] **Step 5: Run the pins to verify they pass + the admin gate.**

Run: `pnpm exec vitest run apps/admin/src/lib/light-entity-state.test.ts apps/admin/src/lib/cover-upload.test.ts` → green (+4).
Run: `pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck`
Expected: green, **34 files / 364 tests** (+4); typecheck green (the retiring `buildStudioServicePayload` still exists, the screen still compiles).

- [ ] **Step 6: Commit.**

```bash
git add apps/admin/src/lib/light-entity-state.ts apps/admin/src/lib/light-entity-state.test.ts apps/admin/src/lib/cover-upload.test.ts
git commit -m "feat(admin): #332, the studio-service editor seam gains the cover state + the create/update builder split (the #214 law)"
```

**Not here:** no screen edit (Task 2, the retiring builder survives this task so the screen compiles); no `cover-upload.ts` code change (the pin proves the purpose flows); no `admin.functions.ts` change; no flip body change.

## Task 2, the screen: the Cover block port + the builder rewire (+0 pins, the composition)

The branch editor's cover loop and Cover card port element-for-element; the retiring builder's three call-site pins re-seat onto the split builders. One commit, the screen and the deletion are inseparable (the old name dies with its last caller).

**Files:**
- Modify: `apps/admin/src/components/studio-services/studio-services-screen.tsx` (imports, the cover loop, open/reset lifecycle, save-path builders, the Cover card, the header-comment seam vocabulary)
- Modify: `apps/admin/src/lib/light-entity-state.ts` (DELETE the retiring `buildStudioServicePayload` block, its Task-3 #331 JSDoc + function, exactly the block quoted as Task 1 Step 4(d)'s before-block; the two new builders and the flip stay)
- Modify (rename ripples): `apps/admin/src/lib/light-entity-state.test.ts` (the three `buildStudioServicePayload` call sites + the round-trip extension)

**Interfaces:**
- Consumes: Task 1's seam (`buildStudioServiceCreatePayload` / `buildStudioServiceUpdatePayload`, the state fields); the existing `uploadCover` seam + `presignAdminCoverUpload` server fn + `PendingSpinner` (`#/components/cms/shared`) + `UPLOADING_LABEL` (`#/lib/save-contract`).
- Produces: the complete editor feature, nothing downstream consumes from this task except the rendered editor (#334 walks it).

- [ ] **Step 1: The imports.** Four exact-match edits in `studio-services-screen.tsx`:

(a) Line 20:

```ts
import type { StudioServiceWithBranches } from '@sevendays/types';
```

Replace with:

```ts
import type {
  MediaPresignRequest,
  MediaPresignResponse,
  StudioServiceWithBranches,
} from '@sevendays/types';
```

(b) Line 39–40:

```ts
import { Plus, SquarePen } from 'lucide-react';
import { Fragment, useId, useState } from 'react';
```

Replace with:

```ts
import { Image, Plus, SquarePen } from 'lucide-react';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
```

(c) The cms/shared block (lines 43–59), add `PendingSpinner` alphabetically (between `PageHeader` and `QUERY_ERROR_LINE`):

```ts
  LightEntityEditor,
  PageHeader,
  QUERY_ERROR_LINE,
```

Replace with:

```ts
  LightEntityEditor,
  PageHeader,
  PendingSpinner,
  QUERY_ERROR_LINE,
```

(d) The lib imports, line 62 (`import type { AdminMutationResult } from '#/lib/admin.functions';`) stays; the light-entity-state block (lines 70–77) for exact match:

```ts
import type { LightFieldErrors, StudioServiceEditorState } from '#/lib/light-entity-state';
import {
  buildStudioServiceFlipPayload,
  buildStudioServicePayload,
  conflictFieldErrors,
  newStudioServiceState,
  studioServiceStateFromRead,
  validateStudioServiceState,
} from '#/lib/light-entity-state';
import { peso } from '#/lib/peso';
import { blockerLines } from '#/lib/save-contract';
```

Replace with:

```ts
import { type CoverUploadStatus, uploadCover } from '#/lib/cover-upload';
import type { LightFieldErrors, StudioServiceEditorState } from '#/lib/light-entity-state';
import {
  buildStudioServiceCreatePayload,
  buildStudioServiceFlipPayload,
  buildStudioServiceUpdatePayload,
  conflictFieldErrors,
  newStudioServiceState,
  studioServiceStateFromRead,
  validateStudioServiceState,
} from '#/lib/light-entity-state';
import { peso } from '#/lib/peso';
import { blockerLines, UPLOADING_LABEL } from '#/lib/save-contract';
```

(e) The header comment's seam vocabulary, the census in Step 6 expects ZERO `buildStudioServicePayload\b` hits on this file, and the file header names it. Current block (lines 11–13) for exact match:

```ts
// state seam (studioServiceStateFromRead / newStudioServiceState /
// buildStudioServicePayload / buildStudioServiceFlipPayload /
// validateStudioServiceState) driving the create/edit Sheet editor, and
```

Replace with:

```ts
// state seam (studioServiceStateFromRead / newStudioServiceState /
// buildStudioServiceCreatePayload / buildStudioServiceUpdatePayload /
// buildStudioServiceFlipPayload /
// validateStudioServiceState) driving the create/edit Sheet editor, and
```

And extend the admin.functions value import (lines 62–67) for exact match:

```ts
import {
  removeAdminStudioService,
  saveAdminStudioServiceBranchMatrix,
  saveAdminStudioServiceCreate,
  saveAdminStudioServiceUpdate,
} from '#/lib/admin.functions';
```

Replace with:

```ts
import {
  presignAdminCoverUpload,
  removeAdminStudioService,
  saveAdminStudioServiceBranchMatrix,
  saveAdminStudioServiceCreate,
  saveAdminStudioServiceUpdate,
} from '#/lib/admin.functions';
```

- [ ] **Step 2: The cover loop state + handlers (the branch editor's lines 130–187 port, purpose `'service-cover'`).** In `studio-services-screen.tsx`, current state block (lines 169–171 area) for exact match:

```ts
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<StudioServiceEditorState>(newStudioServiceState());
  const [fieldErrors, setFieldErrors] = useState<LightFieldErrors>({});
```

Replace with:

```ts
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<StudioServiceEditorState>(newStudioServiceState());
  const [fieldErrors, setFieldErrors] = useState<LightFieldErrors>({});
  // The cover loop (#332, the branch editor's M7 #214 loop, ported):
  // presign → XHR PUT → the staging key rides the NEXT save. The preview
  // object URL is revoked on replace/remove/unmount (the loop's contract).
  const [coverStatus, setCoverStatus] = useState<CoverUploadStatus>({ phase: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const coverUploading = coverStatus.phase === 'presigning' || coverStatus.phase === 'uploading';

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  async function presign(req: MediaPresignRequest): Promise<MediaPresignResponse> {
    const result = await presignAdminCoverUpload({ data: req });
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.data;
  }

  function handleCoverStatus(next: CoverUploadStatus) {
    setCoverStatus(next);
    if (next.phase === 'bound') {
      // Re-upload replaces the key (and revokes the replaced preview URL);
      // binding happens only through the save, the preview reflects
      // state, never commits.
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = next.previewUrl;
      setEditorState((prev) => ({ ...prev, coverImageKey: next.stagingKey }));
    }
  }

  async function startCoverUpload(file: File) {
    try {
      await uploadCover(file, presign, handleCoverStatus, 'service-cover');
    } catch {
      // XHR error/abort already emitted `failed` through onStatus, the
      // machine never stalls; nothing further to surface here.
    }
  }

  function removeCover() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCoverStatus({ phase: 'idle' });
    // Three-state encoding: null = explicit clear on the next save.
    setEditorState((prev) => ({ ...prev, coverImageKey: null }));
  }
```

- [ ] **Step 3: The open/reset lifecycle + the save-path builder swap.**

(a) `openCreate` (line 418), current block for exact match:

```ts
  function openCreate() {
    setEditorState(newStudioServiceState());
    setFieldErrors({});
```

Replace with:

```ts
  function openCreate() {
    // The Sheet's children stay mounted across the async Save contract's
    // held saves, so the upload state resets explicitly, a reopened
    // Sheet never shows a stale preview (the port's lifecycle law).
    setCoverStatus({ phase: 'idle' });
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setEditorState(newStudioServiceState());
    setFieldErrors({});
```

(b) `openEdit` (line 425), current block for exact match:

```ts
  function openEdit(row: StudioServiceWithBranches) {
    setEditorState(studioServiceStateFromRead(row));
    setFieldErrors({});
```

Replace with:

```ts
  function openEdit(row: StudioServiceWithBranches) {
    // Same explicit reset as openCreate (the port's lifecycle law).
    setCoverStatus({ phase: 'idle' });
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setEditorState(studioServiceStateFromRead(row));
    setFieldErrors({});
```

(c) The save path (lines 248–252), current block for exact match:

```ts
      const entityResult =
        input.mode === 'create'
          ? await saveAdminStudioServiceCreate({ data: buildStudioServicePayload(input.state) })
          : await saveAdminStudioServiceUpdate({
              data: { id: input.row.id, payload: buildStudioServicePayload(input.state) },
            });
```

Replace with:

```ts
      const entityResult =
        input.mode === 'create'
          ? await saveAdminStudioServiceCreate({
              data: buildStudioServiceCreatePayload(input.state),
            })
          : await saveAdminStudioServiceUpdate({
              data: { id: input.row.id, payload: buildStudioServiceUpdatePayload(input.state) },
            });
```

(d) The retiring builder deletion, in `apps/admin/src/lib/light-entity-state.ts`, delete the WHOLE `buildStudioServicePayload` block: its Task-3 #331 JSDoc (the block beginning `/**` above `export function buildStudioServicePayload(` through the function's closing `}`), exactly the block quoted as Task 1 Step 4(d)'s before-block. The two new builders and the flip (JSDoc + body) stay untouched; the file's builder order becomes fromRead → newState → Create → Update → flip.

- [ ] **Step 4: The Cover card (the branch editor's block ported verbatim, alt texts re-based).** In `studio-services-screen.tsx`, the editor's field sequence, current region (lines 743–756) for exact match:

```tsx
          <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={activeId}
              checked={editorState.isActive}
              onCheckedChange={(checked) =>
                setEditorState({ ...editorState, isActive: checked === true })
              }
            />
            Active
          </label>

          <section className='space-y-2'>
            <h3 className='text-sm font-medium'>Bookable at branches</h3>
```

Replace with (the Cover card slots between the Active label and the branches section, the branch editor's field order):

```tsx
          <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={activeId}
              checked={editorState.isActive}
              onCheckedChange={(checked) =>
                setEditorState({ ...editorState, isActive: checked === true })
              }
            />
            Active
          </label>
          <div className='space-y-3 rounded-lg border p-4'>
            <p className='text-sm font-medium'>Cover</p>
            {/* Preview precedence (the packages editor's law): a fresh
                bound upload shows the local object URL; a pending removal
                (coverImageKey: null) shows the placeholder; else the
                read's coverImageUrl; else the placeholder. The preview
                reflects state, never commits. */}
            {coverStatus.phase === 'bound' ? (
              <img
                src={coverStatus.previewUrl}
                alt={`${editorState.name} cover`}
                className='aspect-[3/2] w-full rounded-md object-cover'
              />
            ) : editorState.coverImageKey === null ? (
              <div className='bg-muted text-muted-foreground grid aspect-[3/2] w-full place-items-center rounded-md'>
                <Image aria-hidden='true' className='size-8' />
              </div>
            ) : editorState.coverImageUrl ? (
              <img
                src={editorState.coverImageUrl}
                alt={`${editorState.name} cover`}
                className='aspect-[3/2] w-full rounded-md object-cover'
              />
            ) : (
              <div className='bg-muted text-muted-foreground grid aspect-[3/2] w-full place-items-center rounded-md'>
                <Image aria-hidden='true' className='size-8' />
              </div>
            )}
            <div className='flex items-center gap-2'>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) {
                    void startCoverUpload(file);
                  }
                }}
              />
              <Button
                variant='outline'
                type='button'
                disabled={coverUploading}
                aria-busy={coverUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {coverUploading ? <PendingSpinner /> : null}
                {coverUploading ? UPLOADING_LABEL : 'Upload cover'}
              </Button>
              <Button variant='ghost' type='button' disabled={coverUploading} onClick={removeCover}>
                Remove cover
              </Button>
            </div>
            {coverStatus.phase === 'presigning' ? (
              <p className='text-muted-foreground text-xs'>Presigning…</p>
            ) : null}
            {coverStatus.phase === 'uploading' ? (
              <p className='text-muted-foreground text-xs'>
                Uploading…{' '}
                {coverStatus.total > 0
                  ? Math.round((coverStatus.sent / coverStatus.total) * 100)
                  : 0}
                %
              </p>
            ) : null}
            {coverStatus.phase === 'bound' ? (
              <p className='text-muted-foreground text-xs'>Cover ready, save to bind it.</p>
            ) : null}
            {coverStatus.phase === 'failed' ? (
              <p className='text-destructive text-xs'>Upload failed: {coverStatus.message}</p>
            ) : null}
            <p className='text-muted-foreground text-xs'>JPG only, up to 10 MiB.</p>
          </div>

          <section className='space-y-2'>
            <h3 className='text-sm font-medium'>Bookable at branches</h3>
```

- [ ] **Step 5: The rename ripples + the round-trip extension (light-entity-state.test.ts).** Three exact-match edits:

(a) The round-trip pin (lines 289–299), current block for exact match:

```ts
  it('studio-service payload round-trip and flip', () => {
    const state = light.studioServiceStateFromRead(service);
    expect(light.buildStudioServicePayload(state)).toEqual({
      name: 'Hair & Makeup',
      description: 'On-location styling.',
      priceCents: 150000,
      isActive: true,
    });
    expect(light.buildStudioServiceFlipPayload(service, false)).toEqual({
      name: 'Hair & Makeup',
      description: 'On-location styling.',
      priceCents: 150000,
      isActive: false,
    });
```

Replace with:

```ts
  it('studio-service payload round-trip and flip', () => {
    const state = light.studioServiceStateFromRead(service);
    expect(light.buildStudioServiceCreatePayload(state)).toEqual({
      name: 'Hair & Makeup',
      description: 'On-location styling.',
      priceCents: 150000,
      isActive: true,
    });
    expect(light.buildStudioServiceUpdatePayload(state)).toEqual({
      name: 'Hair & Makeup',
      description: 'On-location styling.',
      priceCents: 150000,
      isActive: true,
    });
    expect(light.buildStudioServiceFlipPayload(service, false)).toEqual({
      name: 'Hair & Makeup',
      description: 'On-location styling.',
      priceCents: 150000,
      isActive: false,
    });
    // The cover is deliberately ABSENT from a flip, the absence is what
    // makes a flip never re-verify or clobber media (the tri-state law).
    expect('coverImageKey' in light.buildStudioServiceFlipPayload(service, false)).toBe(false);
```

(b) The unpriced-read pin (line 448), current line for exact match:

```ts
    expect(light.buildStudioServicePayload(state).priceCents).toBeNull();
```

Replace with:

```ts
    expect(light.buildStudioServiceUpdatePayload(state).priceCents).toBeNull();
```

(c) The create-defaults pin (line 453), current line for exact match:

```ts
    expect(light.buildStudioServicePayload(light.newStudioServiceState()).priceCents).toBeNull();
```

Replace with:

```ts
    expect(light.buildStudioServiceCreatePayload(light.newStudioServiceState()).priceCents).toBeNull();
```

- [ ] **Step 6: The census + gate + commit.**

Run: `grep -c "buildStudioServicePayload\b" apps/admin/src/lib/light-entity-state.ts apps/admin/src/components/studio-services/studio-services-screen.tsx apps/admin/src/lib/light-entity-state.test.ts`, Expected: `0` for the first two files (the retiring name is GONE from seam + screen; word-boundary keeps the new longer names from matching); the test file may only match if a pinned STRING quotes it (it must not, the pins were renamed too; expect `0`).
Run: `grep -c "'service-cover'" apps/admin/src/components/studio-services/studio-services-screen.tsx apps/admin/src/lib/light-entity-state.test.ts apps/admin/src/lib/cover-upload.test.ts`, Expected: `1` (screen: the upload call), `0` (the state pins quote `tmp/…` staging keys and a `covers/…` preview URL, the purpose string never appears there), `1` (the Task-1 purpose pin).
Run: `pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck` → green, **34 files / 364 tests** (Task 1's +4 held; Task 2 adds none).

```bash
git add apps/admin/src/components/studio-services/studio-services-screen.tsx apps/admin/src/lib/light-entity-state.ts apps/admin/src/lib/light-entity-state.test.ts
git commit -m "feat(admin): #332, the studio-services editor gains the Cover field (the branch composition ported; the builder split rewired)"
```

**Not here:** no new pins in this task (the composition is a verbatim port, lib-seam pins cannot drive JSX per the house rule; the four preview states render from the SAME state machine Task 1 pinned, and the rendered gate is #334's teaser walk); no `admin.functions.ts` edit; no api/types edit; no branch/package editor touch.

## Task 3, docs rotation + floors + graphify + the final gate

**Files:**
- Modify: `docs/progress.md` (append one dated section at file end, the house pattern)
- Modify: `AGENTS.md` (the admin floor sentence: two exact-string edits)
- Local/commit: graphify output

**Interfaces:**
- Consumes: Tasks 1–2 landed; the green runs' ACTUAL counts.
- Produces: the durable record; nothing code-side.

- [ ] **Step 1: `docs/progress.md`, append this section verbatim at the end of the file:**

```markdown
## 2026-11-21, #332: service covers, the admin editor Cover field, upload, replace, remove

The studio-services editor gained the Cover field, the branch editor's composition ported whole (spec #330 D7, the #214 precedent): the four preview states (a fresh bound upload shows the local object URL; a pending removal shows the placeholder; else the stored coverImageUrl; else the placeholder, the preview reflects state, never commits), picker-only JPG upload (`accept='image/jpeg'`) over the existing cover-upload seam wired to the presign server fn under the new `'service-cover'` purpose (M9 #331's), riding the machine's status lines (Presigning… / Uploading… N% / "Cover ready, save to bind it." / the failure message) and its courtesy pre-checks (JPG-only, the 10 MiB cap, the commit re-verifies server-side). Remove sets the pending clear until Save; closing without saving keeps the stored cover (the open/reset lifecycle revokes the preview and resets the machine); the sheet's async Save contract (close-only-on-success) governs, and a save-time cover conflict surfaces through the ported mapped-or-toast channel (name conflicts map inline; everything else toasts, the branch editor's exact behavior). The state seam carries the tri-state exactly like the branch builder: `StudioServiceEditorState` gained `coverImageUrl` + the undefined/null/string `coverImageKey`, the builder SPLIT into `buildStudioServiceCreatePayload` (bind-only) and `buildStudioServiceUpdatePayload` (the full tri-state, the #331-era shared builder retired), and the flip payload never carries the key (the absence is the law, pinned). `cover-upload.ts` needed no code change (the purpose parameter already accepts the widened union; the passthrough pin proves it). The gallery drag-and-drop tray stays out (M7 #220, cover fields are picker-only). Pins: admin 364 (+4, the purpose passthrough + the read-seeds/create-only/ tri-state seam pins); api/types/db/api-client/landing floors unmoved. The landing consumption is #333 and the teaser owner-reaction pass #334, the editor is not "done done" until #334 records.
```

- [ ] **Step 2: `AGENTS.md`, the two floor edits.**

(a) Replace the exact string `admin floor 34 files / 360 tests` with `admin floor 34 files / 364 tests` (one occurrence, the admin suite's floor sentence).
(b) In the same sentence's parenthetical pin list, insert after the `#322's eight brand-lockup seam pins` clause's closing `)`, i.e. replace the exact string `+ the rail-posture/geometry/fit class vocabulary). The api and landing suites remain the behavioral backbones.` with `+ the rail-posture/geometry/fit class vocabulary; + #332's four service-cover editor seam pins, the purpose passthrough, the read-seeds/key-undefined law, the create bind-only encoding, the update tri-state). The api and landing suites remain the behavioral backbones.` (one occurrence).
(c) Verify both edits with: `grep -c "34 files / 364 tests" AGENTS.md` → `1`, and `grep -c "34 files / 360 tests" AGENTS.md` → `0`. (No other floor sentence changes: api 482+3 / types 197 / db / api-client / landing did not move.)

- [ ] **Step 3: Format + the final repo gate.**

Run: `pnpm fix` then `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check`
Expected: green at the repo root, lint + format + typecheck + test across every workspace, with floors: admin **364** (34 files); api **482 passed + 3 skipped** (34 files); types **197** (18 files); db **4 files** (22 passed + 8 skipped; 30 passed under TEST_DATABASE_URL); api-client **45** (5 files); landing **134** (17 files). Any other count means drift: stop and reconcile.

- [ ] **Step 4: Docs + graphify commits.**

```bash
git add docs/progress.md AGENTS.md
git commit -m "docs: #332, progress section + the admin floor for the service-covers editor"
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#332 graph update"
```

(Dirty `graphify-out/` files are expected, not a reason to skip.)

**Not here:** no issue-close in this plan's tasks, the controller closes #332 on the evidence (the merged PR + the acceptance criteria re-checked); #333/#334 stay open and continue on this same worktree/branch (the branch law, no rebase until the owner calls for the #331/#332 push); no v1 pick in-branch, post-merge, main-only per `docs/agents/v1-picks.md`; no `docs/plan.md` edit, no milestone box rides this ticket.

---

## Self-review checklist (controller pass, run before handoff)

- [✅] Placeholder scan: no TBD/TODO/"as appropriate"/paraphrased strings, every value the executor must land is quoted verbatim; no leftover APPEND anchors. (grep 2026-11-21: the only TBD/TODO/APPEND hits are this line and the fenced find/replace examples' unticked checkboxes.)
- [✅] Step-checkbox count: `grep -c '^- \[ \] \*\*Step'` on this file = **16** (Task 1: 6, Task 2: 6, Task 3: 4). (First draft's checklist claimed 13, the per-task sums were right, the total was wrong; corrected at the source and verified by grep at handoff.)
- [✅] Cross-task consistency: Task 1's produced names (`buildStudioServiceCreatePayload`, `buildStudioServiceUpdatePayload`, the state fields) are exactly what Task 2's imports/save-path/census reference; the retiring `buildStudioServicePayload` exists through Task 1 and dies in Task 2 with its last caller (the screen), every one of its five test call sites is accounted for (line 290 → the round-trip extension, 448 → Update rename, 453 → Create rename; the flip pins at 296/488 keep the unchanged flip body). Import order re-verified against biome's module-path sort (`cover-upload` before `light-entity-state`); `PendingSpinner` slots between `PageHeader` and `QUERY_ERROR_LINE`; the purpose-passthrough pin is honestly framed PRE-GREEN (the seam takes any purpose, the pin characterizes the no-change claim).
- [✅] Floor math recounted from the actual test blocks: admin 360 + 1 (cover-upload purpose pin) + 3 (state-seam pins) = **364** (Task 1), +0 (Task 2 renames/extension), matching Global Constraints, Task 1 Step 5, Task 2 Step 6, Task 3 Steps 2–3.
- [✅] Boundary re-check: #333's landing files, #334's walk, `cover-upload.ts` code, `admin.functions.ts`, the branch/package editors, the drag-and-drop tray, the inline cover-error slot, each named "not here" in its task or the scope fences.
- [✅] Spec coverage: D7's preview precedence = Task 2 Step 4 (the ported comment + the four-state ternary); upload picker-only JPG = Task 2 Step 4 (accept + the seam's pre-checks); status lines + pre-check messages = Task 2 Step 4 (verbatim copy); remove-pending-until-Save + close-keeps-stored = Task 2 Steps 2–3 (the encoding + the lifecycle); the async Save contract + conflict channel = Task 2 Step 3(c) + the mapped-or-toast fence note; the tri-state seam = Task 1 Step 4 (the builder split + state); flip unchanged = Task 1 Step 4(e) + Task 2 Step 5(a)'s absence pin. Testing Decisions §4 (the admin lib-seam pins) = Task 1 Steps 1–2 + Task 2 Step 5. No gap.


