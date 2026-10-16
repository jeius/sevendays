# M7 Ticket 07 — The CMS-Wide Interaction System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Tasks 7 and 8 are UI-bearing and load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule, spec #94 amendment): **Task 7 renders the Submissions tab for an owner-reacted variants round, and Task 8 renders the status palette in BOTH themes for its own owner round** (the ticket's fourth AC demands both). Those two rounds are the only controller interactions inside the build; everything else runs to the gates.

**Goal:** The CMS brought to the interaction standard its screens promised (ticket #218, spec § *CMS UX maturation — the system* — #165's pre-named interaction ticket): the **async sheet-Save contract** on all seven sheet surfaces (`onSave` returns `Promise<boolean>`; the shell holds Save pending — disabled + spinner + "Saving…" + `aria-busy` — and closes **only on success**; failure keeps the sheet open, state intact, retry safe; the `editorNonce`/`keepEditorOpen` remount machinery **deleted, not extended**), **one pending vocabulary** (disabled + `LoaderCircle` spinner + label swap "Saving…"/"Uploading…"/"Deleting…" + `aria-busy`; icon-only buttons take the spinner in place), the **action-class law** verified screen-by-screen (single-field flips + drag-reorders stay exactly as optimistic as they already are — never spinners; full-object writes + deletes become pending-guarded), **delete dialogs** wiring the live #213 DELETE routes on all nine entities (busy confirm, stays open on failure, the blocking references rendered in-body), the **Submissions tab** on the Testimonials screen over #216's moderation endpoints (pending-guarded accept-with-edit, reject-retains, delete-any-status), the **All/Active/Deactivated segment** on every CMS list toolbar including the gallery grid (default All per visit, rail/grid counts stay unfiltered), and the **`TODO(token-ruling)` status palette** settled via rendered variants in both themes. Loads (first-load-only skeletons, muted media boxes, no background-refetch flash) are already the on-disk pattern on every screen — this ticket verifies them and extends the pattern to the one new surface (the Submissions tab).

**Architecture:** Nine tasks, admin-only code (zero api / api-client / types / landing / db changes — the nine `remove()` wrappers and the whole `adminTestimonialSubmissions` group already live in `packages/api-client/src/routes/admin.ts` from #213/#216, and the blocked-delete 400 contract is already the API's): (1) the interaction system's pure lib seams, TDD — `save-contract.ts` (the contract reducer + close rule, the pending-vocabulary mapper, the blocker-line derivation), `status-segment.ts` (the three-state segment filter), `submissions-state.ts` (the tab's segment/filter/accept-edit/date seams), 3 new suites (+22 its; admin floor 18/195 → 21/217); (2) the server fns — nine `removeAdmin<Entity>` result-valued mutations over the existing wrappers + `fetchAdminTestimonialSubmissions`/`acceptAdminTestimonialSubmission`/`rejectAdminTestimonialSubmission`/`removeAdminTestimonialSubmission` + the `adminTestimonialSubmissionQueries` factory; (3) `shared.tsx`'s additive compositions — `PendingSpinner`, `StatusSegmented` (the WindowToggle recipe as pressed buttons), the `GuardedConfirm` busy-confirm engine + `DeleteGuardDialog` composition, `SubmissionStatusBadge`, and the optional `onDelete` slot on `RowIconActions`/`RowActionsCluster`; (4) the async Save contract everywhere — `LightEntityEditor`'s footer awaits, and the type wall (`onSave: () => Promise<boolean>`) forces all seven call sites (testimonials, print sizes, attires, add-ons, branches, studio services, gallery photo) into the same commit; the nonce machinery dies, proven by a grep gate; (5) delete wiring + the segment on the five light-entity screens; (6) gallery (grid + rail segments, card + rail deletes) and packages (table segment + row delete, the editor's Save and both cover-upload buttons upgraded to the vocabulary); (7) the Submissions tab as a new component beside the testimonials screen — the two-tab switch, the pending-first segment, the accept-with-edit sheet, reject/delete confirms, its own first-load skeleton; (8) the status-palette variants round in both themes + the loads verification sweep (the round may retune the candidate classes; the `TODO(token-ruling)` markers retire here); (9) gates + docs rotation — this ticket ticks **three** `docs/plan.md` M7 boxes (its own interaction-system box, plus the guarded-DELETE box that has waited on #218's dialogs, plus the testimonial-form box that has waited on #218's tab) — then the PR, the pre-ruled **PICK clean** v1 pick, the issue close, and `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes, zero migrations, zero api/types/api-client/landing work — lucide-react **1.37.0** (probed live against the installed dist: `loader-circle.mjs` and `trash-2.mjs` both exist — `LoaderCircle` + `Trash2` are the two new icons), `@tanstack/react-query` **^5.102.8** (`mutateAsync` returns the promise the contract awaits; `isPending` drives the busy states), motion/react (the existing popup recipe), the Base UI sheet/alert-dialog primitives via `@sevendays/ui`, vitest plain-node (the admin lib-seam posture — no component/DOM tests), pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#218 "M7 ticket 07: the CMS-wide interaction system — async Save, pending vocabulary, segments, the Submissions tab"](https://github.com/jeius/sevendays/issues/218) (label `ready-for-agent`), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *CMS UX maturation — the system (#165)* is this ticket's ruling, User Stories 45–47 + 50 its acceptance, stories 42–44 the Submissions tab's; § *Guarded DELETE everywhere* § *Confirmation UX* pins the delete-dialog posture; § *Testing Decisions* pins "the async Save-contract state seam, the pending-vocabulary mapper, the Submissions-tab state" as admin lib-seam law and "the `editorNonce` machinery's deletion is proven by the contract tests' new shape"; § *v1-pick classes* pre-rules this payload **PICK clean** — "Admin surfaces exist on both editions; the Submissions tab lands on both"). The ticket's four acceptance criteria, verbatim: the async Save contract on all sheet surfaces + the Submissions tab, the nonce machinery gone (proven by the contract tests' new shape) · the action-class law applied screen-by-screen; admin lib-seam tests over the state seams · delete dialogs pending-guarded with blockers in-body across all nine entities · the segment on every toolbar; the status palette owner-reacted via rendered variants, both themes. Key recon facts (2026-10-15, main `8bed7f2` — post-#217; every file below read this session):

- **The machinery this ticket deletes (swept — six screens, seven sheets):** the `editorNonce`/`keepEditorOpen` pair lives at `testimonials-screen.tsx:226,370,649` · `studio-services-screen.tsx:160,400,648` · `branches-screen.tsx:112,335,590` · `lookups-screen.tsx:147,349,425,474` (two sheets — print sizes + attires) · `gallery-screen.tsx:662,1085,1266` (the photo sheet) · `addons-screen.tsx:169,421,675`. Every screen runs the same law: `editing`/`editorOpen`/`editorNonce` state triple; `handleEditorSave` validates and **veto-throws** (`throw new Error('<entity>-editor-validation-hold')` — the throw is the current keep-open channel, swallowed by the shell); the save mutation's `onSuccess` maps `!ok` to conflict fields + `keepEditorOpen(input)` which re-arms `editing`, re-sets `editorOpen`, and bumps the nonce; the `LightEntityEditor` mounts with `key={editorNonce}`. The async contract replaces the whole mechanism: `onSave` resolves `true` (close) or `false` (hold, state intact — no throw, no remount); add-ons and studio services keep their AQ-4 create→edit promotion on a `matrix-failed` outcome by re-`setEditing` the created row and resolving `false`.
- **The optimistic law already holds — untouched:** every screen's single-row flip (activate/deactivate) and drag-reorder are already optimistic with snapshot rollback + toast (the `flip`/`order` mutations with `onMutate`/`onError`/`onSettled`); `DeactivateConfirm` already closes on confirm. This ticket changes none of them — the action-class law's optimistic half is verification, not construction.
- **The wrappers are already here (zero client work):** `packages/api-client/src/routes/admin.ts` carries `remove()` on all nine entity groups (`servicePackages.remove`, `branches.remove`, `studioServices.remove`, `addons.remove`, `printSizes.remove`, `attires.remove`, `galleryCategories.remove`, `galleryPhotos.remove`, `testimonials.remove`) plus the whole `testimonialSubmissions` group (`list()` newest-first, `accept(id, json?)`, `reject(id)`, `remove(id)`) from #216. Nothing in `packages/` changes in this ticket.
- **The blocked-delete contract (pinned, owner-ratified 2026-10-12):** a blocked delete answers the house 400 with message **`'Blocked by existing references.'`** and one `{ path: string[], message: string }` detail per blocking family — `apps/api/src/services/admin-delete.ts` pins the exact messages: gallery categories `contains ${n} photo(s)` on `['photos']`; print sizes `used by ${n} package inclusion(s)` on `['inclusions']`; attires `attached to ${n} package inclusion(s)` on `['inclusions']`; branches/add-ons/studio services/packages `referenced by ${n} appointment(s)` on `['appointments']`. Testimonials and gallery photos are blocked by nothing (always deletable). The admin server fn surfaces these as `AdminMutationResult`'s `{ ok: false, status, message, details }` — the dialog renders `blockerLines(details)` in-body.
- **The server-fn pattern (pinned):** every mutation server fn in `apps/admin/src/lib/admin.functions.ts` is `createServerFn({ method: 'POST', strict: { output: false } }).validator(...)` → result-valued `AdminMutationResult<T>` with the `ApiClientError → { ok: false, status, message, details }` catch. The nine removes + four submissions fns copy `saveAdminSiteSettings`'s exact shape (`admin.functions.ts:289-313` is the shortest canonical).
- **Loads are already compliant on disk (verified this session):** every list screen renders skeletons only under `isPending || !data` (first load — react-query v5 `isPending` is false on background refetch, so no refetch flash), echoing its row anatomy; the gallery thumb is a `bg-muted` box with `loading='lazy'` (`gallery-screen.tsx:191-197`); the upload tray already speaks "Uploading…/Committing…/Done" (`trayStatusText`). This ticket's loads work = the same pattern on the one new surface (the Submissions tab) + a Task 8 verification sweep.
- **The palette sites (swept — `TODO(token-ruling)` appears at exactly three palette sites):** `shared.tsx:77` (the `StatusBadge` dot: `bg-green-500`/`bg-gray-400`), `shared.tsx:254` (the reactivate icon's `text-green-600`), `bulk-bar.tsx:138` (the bulk reactivate's `text-green-600`). The other nine `TODO(token-ruling)` hits are the unrelated card-radius step-down — NOT this ticket's. **Measured contrast (this session, against white and the ruled dark base `#1b1e22`):** the current `text-green-600` is **3.30:1** on white — existing AA debt for interactive text; the candidates fix it: `text-green-700` (`#15803d`) **5.02:1** light ✓, `dark:text-green-400` (`#4ade80`) **9.60:1** dark ✓; dot candidates (decorative, `aria-hidden`, sr-only text carries the signal): active `bg-green-500 dark:bg-green-400` (2.28/7.34), deactivated `bg-gray-400 dark:bg-zinc-500` (2.56/3.46 — visible, decorative). The audit viewer's `AUDIT_ACTION_BADGE_CLASSES` (audit-log-screen.tsx:57-68) is the badge-palette precedent for the new `SubmissionStatusBadge` (pending → amber family, accepted → green family, rejected → slate — the #216 controller ruling's hue discipline).
- **The segmented-control precedent:** `components/dashboard/window-toggle.tsx` — `role='group'` + `aria-label` on an `inline-flex overflow-hidden rounded-lg border` container, active segment `bg-brand-800 text-primary-foreground px-3 py-1.5 text-xs font-medium`, inactive `hover:bg-accent px-3 py-1.5 text-xs`. `StatusSegmented` ports the recipe to pressed buttons (`aria-pressed`, local state — no search params).
- **Sibling fences (spec § Sequencing; the tickets' own bodies):** NOT here, regardless of temptation: **the packages expanded row** — #219's whole ticket (frames chips, inclusions bullets, duration line — the packages table's expand panel keeps rendering today's description-only content); **upload UI maturation** — #220 (drag-and-drop, in-flight cancel, leave-confirm; the tray and picker stay exactly as they are); **the Account/Users tabs + forgot-password** — #221; **the Resend/sending-domain work** — #222; **the landing redesign** — #223/#224 (no landing file changes at all); **the Site tab** — already #215's, untouched; **booking-endpoint rate limiting** — v2's. The `settings-screen.tsx` (not a sheet surface — a full-screen form) is out of the Save-contract sweep by construction.
- **Baselines (live, per AGENTS.md post-#217; admin re-verified by running the suite this session):** types 17 files / 167 tests; api 30 passed + 1 skipped files (31) / 422 passed + 3 skipped; api-client 5 files / 45 tests; **admin 18 files / 195 tests**; landing 10 files / 92 tests; db 4 files. After Task 1: **admin 21 files / 217 tests** (+22 its: save-contract 10, status-segment 4, submissions-state 8). Every other package's floor is untouched by this ticket. (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)
- **The three `docs/plan.md` boxes this ticket ticks (Task 9):** (a) `- [ ] Admin — the CMS-wide interaction system (#165)` — this ticket's own; (b) `- [ ] API — guarded DELETE everywhere` — its annotation already says "the box stays unticked until #218 lands the delete dialogs on all nine screens — the shared checkbox"; (c) `- [ ] API + admin — the public testimonial form (#161)` — its annotation already says "the box waits for #218's Submissions tab." All three flip to `- [✅]` with dated annotations; nothing else in the M7 block changes.

## Global Constraints

- **Branch & baseline:** `feat/218-cms-interaction-system` off main `8bed7f2` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#218)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, grep-gate output, variants screenshots) lands in gitignored `.superpowers/sdd/2026-10-15-218-cms-interaction-system/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs** (lucide/react-query/motion all installed). Every task commits only with the checks green **for the packages it touched** (this ticket touches only `apps/admin` + docs — `pnpm --filter @sevendays/admin fix` then `test -- --run` then `typecheck` is the per-task gate; run `pnpm --filter @sevendays/admin fix` BEFORE committing and accept its rewrites). No `pnpm build:packages` is needed (no `packages/` source changes). Never stage `graphify-out/` churn (dirty graph files are expected, per AGENTS.md). Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file and `docs/plan.md` alike). Run `graphify update .` at close (Task 9 — code was modified).
- **The contract law (binding, spec § the async Save contract):** `LightEntityEditor.onSave` becomes `() => Promise<boolean>` — resolve `true` = success (the shell closes), resolve `false` = hold (the sheet stays open, state intact, retry safe), throw = hold (swallowed by the shell; the screen's toast owns the signal). The shell holds `saving` state: Save is disabled + `aria-busy` + spinner + the "Saving…" label swap while in flight; Cancel is disabled while saving. The `editorNonce`/`keepEditorOpen` machinery is **deleted, not extended** — Task 4 ends with a grep gate proving zero hits. The seven sheet surfaces are: testimonials, print sizes, attires, add-ons, branches, studio services, gallery photo. The Submissions tab's accept sheet rides the same component; the package editor (a full screen, not a sheet) upgrades only its Save button's vocabulary.
- **The vocabulary law (binding, spec § one pending vocabulary):** pending = disabled + `LoaderCircle` spinner (`aria-hidden`, `animate-spin`, `currentColor`) + label swap + `aria-busy`. The three spec-pinned busy labels are constants in `save-contract.ts`: `SAVING_LABEL = 'Saving…'`, `UPLOADING_LABEL = 'Uploading…'`, `DELETING_LABEL = 'Deleting…'`. Icon-only buttons take the spinner IN PLACE of the icon (no label swap — there is no label). Theme-free by construction (`currentColor` + tokens only).
- **The action-class law (binding, spec § the action-class law):** single-field flips (activate/deactivate) and drag-reorders stay exactly as they are — optimistic, instant, snapshot rollback + toast on failure, NEVER spinners (Task 8 verifies, no code change). Full-object writes (create/update, the accept/reject moderation verbs) and deletes are pending-guarded. `DeactivateConfirm` keeps close-on-confirm untouched.
- **The delete-dialog law (binding, spec § Confirmation UX):** busy confirm (the confirm button disabled + spinner + "Deleting…" + `aria-busy`), the dialog **stays open on failure** with the blocking references rendered in-body as `blockerLines(details)` (never toast-and-close); success clears the dialog + invalidates + toasts `'Deleted.'`. The dialog names the row; where the entity carries media, the body states the images go with it (the per-entity `mediaNote` prop).
- **The segment law (binding, spec § retired rows + the Active filter):** every CMS list toolbar gains **All / Active / Deactivated** — packages, branches, lookups (BOTH sections), testimonials, add-ons, studio services, and the gallery grid. Default **All** per visit (local `useState`, no persistence); rail/grid counts stay **unfiltered** staff-truth totals; the filtered view is a render-time derivation — the underlying query caches and all mutations keep operating on the full lists. Segmented ≠ All disables nothing: drag-reorder under a filter uses the gallery's slot-swap law (reorder over the filtered view producing the complete global order — `reorderVisiblePhotos` from `gallery-state.ts`, reused by the testimonials drag).
- **Copy pins are semantic, formatting is biome's:** every fenced file/comment/code block below lands verbatim in content; the package `fix` scripts then normalize quoting/ordering/import order to house style — accept the rewrite, commit the result. Spec-pinned strings (the three busy labels, the segment labels All/Active/Deactivated, 'Deleted.', 'Saved.') land verbatim with no marker. New unrated staff-facing copy carries the house `TODO(owner-copy)` marker per the on-disk convention and is pinned verbatim in this plan: the delete-dialog body lines, the accept-sheet description, the `ACCEPTING_LABEL`/reject busy label, the Submissions tab's empty/queue lines, and the two accept-edit min-error lines (reused verbatim from the landing form's `TODO(owner-copy)` pair: 'Tell us a little more — at least 20 characters.' / 'Your name needs at least 2 characters.'). The two owner rounds (Tasks 7–8) may retune any of them.
- **The palette discipline:** the candidate classes land with their `TODO(token-ruling)` comments INTACT through Tasks 3–7; Task 8's owner round settles them (retune as ruled), and only then do the three palette `TODO(token-ruling)` comments retire (replaced by an owner-reacted note carrying the date). The six card-radius `TODO(token-ruling)` comments are NOT this ticket's and never move.
- **Scope fence (verbatim):** Task 1 edits only `apps/admin/src/lib/{save-contract.ts (new), save-contract.test.ts (new), status-segment.ts (new), status-segment.test.ts (new), submissions-state.ts (new), submissions-state.test.ts (new)}`. Task 2 edits only `apps/admin/src/lib/{admin.functions.ts, cms-queries.ts}`. Task 3 edits only `apps/admin/src/components/cms/shared.tsx`. Task 4 edits only `apps/admin/src/components/cms/shared.tsx` (the `LightEntityEditor` contract) + the seven call-site files `apps/admin/src/components/{testimonials/testimonials-screen.tsx, lookups/lookups-screen.tsx, addons/addons-screen.tsx, branches/branches-screen.tsx, studio-services/studio-services-screen.tsx, gallery/gallery-screen.tsx}`. Task 5 edits only `apps/admin/src/components/{testimonials/testimonials-screen.tsx, lookups/lookups-screen.tsx, addons/addons-screen.tsx, branches/branches-screen.tsx, studio-services/studio-services-screen.tsx, cms/bulk-bar.tsx}`. Task 6 edits only `apps/admin/src/components/{gallery/gallery-screen.tsx, packages/packages-table.tsx, packages/package-editor.tsx, branches/branches-screen.tsx}`. Task 7 edits only `apps/admin/src/components/testimonials/{testimonials-screen.tsx, submissions-tab.tsx (new)}`. Task 8 edits only palette class strings at the sites Tasks 3–7 landed (plus screenshot evidence). Task 9 rotates `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/agents/v1-picks.md` (post-merge), `graphify-out/`, and works the PR/pick/issue — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
apps/admin/src/lib/
  save-contract.ts                     # create (T1) — the contract reducer + close rule, the vocabulary mapper, blockerLines
  save-contract.test.ts                # create (T1) — the 10-it contract suite
  status-segment.ts                    # create (T1) — StatusSegment + the filter (the segment's pure half)
  status-segment.test.ts               # create (T1) — the 4-it segment suite
  submissions-state.ts                 # create (T1) — the tab's segment/filter, accept-edit state/validation/payload, submittedOn
  submissions-state.test.ts            # create (T1) — the 8-it tab suite
  admin.functions.ts                   # modify (T2) — nine removes + the four submissions fns
  cms-queries.ts                       # modify (T2) — adminTestimonialSubmissionQueries
apps/admin/src/components/cms/
  shared.tsx                           # modify (T3+T4) — PendingSpinner, StatusSegmented, GuardedConfirm, DeleteGuardDialog,
                                       #   SubmissionStatusBadge, the row-actions onDelete slot; the async LightEntityEditor
  bulk-bar.tsx                         # modify (T5) — the palette candidates (round-retunable)
apps/admin/src/components/
  testimonials/testimonials-screen.tsx # modify (T4+T5+T7) — the async save, delete + segment, the two-tab switch
  testimonials/submissions-tab.tsx     # create (T7) — the Submissions tab composition
  lookups/lookups-screen.tsx           # modify (T4+T5) — both sheets async; per-section delete + segment
  addons/addons-screen.tsx             # modify (T4+T5)
  branches/branches-screen.tsx         # modify (T4+T5+T6) — + the cover button's vocabulary
  studio-services/studio-services-screen.tsx # modify (T4+T5)
  gallery/gallery-screen.tsx           # modify (T4+T6) — the photo sheet async; grid + rail segments; card + rail deletes
  packages/packages-table.tsx          # modify (T6) — the segment row + the row delete
  packages/package-editor.tsx          # modify (T6) — the Save + cover buttons' vocabulary
docs/plan.md docs/progress.md AGENTS.md graphify-out/ docs/agents/v1-picks.md  # T9
```

---

### Task 1: The interaction system's pure lib seams (TDD)

Three modules, three suites, plain data in and out — the components in Tasks 3–7 render these; the modules never import React. This is the ticket's "admin lib-seam tests over the state seams" acceptance criterion.

**Files:**
- Create (test-first): `apps/admin/src/lib/save-contract.test.ts`, `apps/admin/src/lib/status-segment.test.ts`, `apps/admin/src/lib/submissions-state.test.ts`
- Create: `apps/admin/src/lib/save-contract.ts`, `apps/admin/src/lib/status-segment.ts`, `apps/admin/src/lib/submissions-state.ts`

**Interfaces:**
- Produces (what Tasks 3–7 consume): from `save-contract.ts` — `SAVING_LABEL`/`UPLOADING_LABEL`/`DELETING_LABEL` (the three spec-pinned busy labels) + `ACCEPTING_LABEL`/`REJECTING_LABEL` (the moderation extensions, `TODO(owner-copy)`), `pendingVocabulary({ pending, idleLabel, busyLabel }) → { disabled, ariaBusy, label }`, `SaveContractState`/`idleSaveContract`/`SaveContractEvent`/`reduceSaveContract(state, event)`, `closesOnEvent(event) → boolean`, `blockerLines(details: unknown) → string[]`. From `status-segment.ts` — `StatusSegment` (`'all' | 'active' | 'deactivated'`), `STATUS_SEGMENTS` (the ordered label triple), `filterByStatusSegment<T extends { isActive: boolean }>(rows, segment) → T[]`. From `submissions-state.ts` — `SubmissionSegment` (`'pending' | 'accepted' | 'rejected' | 'all'`), `SUBMISSION_SEGMENTS`, `filterSubmissions(rows, segment)`, `AcceptEditState`, `acceptEditStateFromSubmission(row)`, `validateAcceptEdit(state) → { quote?: string; person?: string }`, `buildAcceptPayload(state) → AcceptTestimonialSubmissionInput`, `submittedOn(row) → string`.
- Consumes: `@sevendays/types`' `TestimonialSubmission`, `AcceptTestimonialSubmissionInput`, and the four bounds constants (`TESTIMONIAL_QUOTE_MIN/MAX`, `TESTIMONIAL_PERSON_MIN/MAX`) — imported, never re-declared.

**Not here:** any component (`shared.tsx` is Task 3); any server fn (Task 2); the packages expanded row (#219); upload maturation (#220).

- [ ] **Step 1: Write the failing tests (a)**

Create `apps/admin/src/lib/save-contract.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import {
  ACCEPTING_LABEL,
  DELETING_LABEL,
  REJECTING_LABEL,
  SAVING_LABEL,
  UPLOADING_LABEL,
  blockerLines,
  closesOnEvent,
  idleSaveContract,
  pendingVocabulary,
  reduceSaveContract,
} from './save-contract.js';

describe('pendingVocabulary (the one pending vocabulary mapper, #218)', () => {
  it('idle: enabled, not aria-busy, the idle label', () => {
    expect(
      pendingVocabulary({ pending: false, idleLabel: 'Save changes', busyLabel: SAVING_LABEL })
    ).toEqual({ disabled: false, ariaBusy: false, label: 'Save changes' });
  });

  it('pending: disabled + aria-busy + the busy label swap (Saving…/Uploading…/Deleting… pinned)', () => {
    expect(
      pendingVocabulary({ pending: true, idleLabel: 'Save changes', busyLabel: SAVING_LABEL })
    ).toEqual({ disabled: true, ariaBusy: true, label: 'Saving…' });
    expect(
      pendingVocabulary({ pending: true, idleLabel: 'Upload cover', busyLabel: UPLOADING_LABEL })
    ).toEqual({ disabled: true, ariaBusy: true, label: 'Uploading…' });
    expect(
      pendingVocabulary({ pending: true, idleLabel: 'Delete', busyLabel: DELETING_LABEL })
    ).toEqual({ disabled: true, ariaBusy: true, label: 'Deleting…' });
    expect(ACCEPTING_LABEL).toBe('Accepting…');
    expect(REJECTING_LABEL).toBe('Rejecting…');
  });
});

describe('reduceSaveContract (the async Save contract state)', () => {
  it('started → saving; the sheet is held', () => {
    expect(reduceSaveContract(idleSaveContract, { type: 'started' })).toEqual({ saving: true });
  });

  it('settled ok:true → saving released (the close follows via closesOnEvent)', () => {
    expect(reduceSaveContract({ saving: true }, { type: 'settled', ok: true })).toEqual({
      saving: false,
    });
  });

  it('settled ok:false → saving released too — the hold is the OPEN sheet, never a stuck spinner (retry is safe)', () => {
    expect(reduceSaveContract({ saving: true }, { type: 'settled', ok: false })).toEqual({
      saving: false,
    });
  });
});

describe('closesOnEvent (the close-only-on-success rule)', () => {
  it('in-flight never closes; settled-true closes; settled-false (a veto or failed save) holds', () => {
    expect(closesOnEvent({ type: 'started' })).toBe(false);
    expect(closesOnEvent({ type: 'settled', ok: true })).toBe(true);
    expect(closesOnEvent({ type: 'settled', ok: false })).toBe(false);
  });
});

describe('blockerLines (the delete dialog’s in-body blockers, from the #213 400 details)', () => {
  it('derives one capitalized-family line per detail, order preserved', () => {
    expect(
      blockerLines([
        { path: ['appointments'], message: 'referenced by 3 appointment(s)' },
        { path: ['photos'], message: 'contains 2 photo(s)' },
      ])
    ).toEqual([
      'Appointments — referenced by 3 appointment(s)',
      'Photos — contains 2 photo(s)',
    ]);
  });

  it('a detail with no path renders its message alone', () => {
    expect(blockerLines([{ message: 'used by 4 package inclusion(s)' }])).toEqual([
      'used by 4 package inclusion(s)',
    ]);
  });

  it('non-array details answer empty (the dialog body falls back to the message line)', () => {
    expect(blockerLines(undefined)).toEqual([]);
    expect(blockerLines({ nope: true })).toEqual([]);
  });

  it('malformed entries are skipped, never thrown', () => {
    expect(
      blockerLines([
        null,
        42,
        'text',
        { path: 'not-an-array', message: 'fine' },
        { path: ['appointments'] },
      ])
    ).toEqual(['fine']);
  });
});
```

- [ ] **Step 2: Write the failing tests (b)**

Create `apps/admin/src/lib/status-segment.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { STATUS_SEGMENTS, filterByStatusSegment } from './status-segment.js';

const rows = [
  { id: 'a', isActive: true },
  { id: 'b', isActive: false },
  { id: 'c', isActive: true },
];

describe('STATUS_SEGMENTS (the toolbar triple)', () => {
  it('is All / Active / Deactivated in order — the spec-pinned labels', () => {
    expect(STATUS_SEGMENTS).toEqual([
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'deactivated', label: 'Deactivated' },
    ]);
  });
});

describe('filterByStatusSegment', () => {
  it("segment 'all' returns every row as a COPY (never the caller's array — render-time derivation only)", () => {
    const all = filterByStatusSegment(rows, 'all');
    expect(all).toEqual(rows);
    expect(all).not.toBe(rows);
  });

  it("segment 'active' keeps only isActive rows; 'deactivated' keeps only !isActive", () => {
    expect(filterByStatusSegment(rows, 'active').map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterByStatusSegment(rows, 'deactivated').map((r) => r.id)).toEqual(['b']);
  });

  it('an empty list answers empty under every segment', () => {
    for (const segment of ['all', 'active', 'deactivated'] as const) {
      expect(filterByStatusSegment([], segment)).toEqual([]);
    }
  });
});
```

- [ ] **Step 3: Write the failing tests (c)**

Create `apps/admin/src/lib/submissions-state.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import {
  SUBMISSION_SEGMENTS,
  acceptEditStateFromSubmission,
  buildAcceptPayload,
  filterSubmissions,
  submittedOn,
  validateAcceptEdit,
} from './submissions-state.js';

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  quote: 'The photographer made our graduation shoot feel effortless.',
  person: 'Maria, batch 2026',
  status: 'pending' as const,
  createdAt: new Date('2026-10-14T08:30:00.000Z'),
  updatedAt: new Date('2026-10-14T08:30:00.000Z'),
};

describe('SUBMISSION_SEGMENTS (the queue\'s own segment)', () => {
  it('is Pending / Accepted / Rejected / All in order — pending leads because the queue IS the work', () => {
    expect(SUBMISSION_SEGMENTS).toEqual([
      { value: 'pending', label: 'Pending' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'all', label: 'All' },
    ]);
  });
});

describe('filterSubmissions (the tab\'s own status segment)', () => {
  const rows = [
    { ...base, id: '1', status: 'pending' as const },
    { ...base, id: '2', status: 'accepted' as const },
    { ...base, id: '3', status: 'rejected' as const },
    { ...base, id: '4', status: 'pending' as const },
  ];

  it('pending/accepted/rejected filter on status', () => {
    expect(filterSubmissions(rows, 'pending').map((r) => r.id)).toEqual(['1', '4']);
    expect(filterSubmissions(rows, 'accepted').map((r) => r.id)).toEqual(['2']);
    expect(filterSubmissions(rows, 'rejected').map((r) => r.id)).toEqual(['3']);
  });

  it("'all' returns the queue whole — retained rows stay spottable (repeat submitters)", () => {
    expect(filterSubmissions(rows, 'all')).toHaveLength(4);
  });
});

describe('acceptEditStateFromSubmission + validateAcceptEdit + buildAcceptPayload', () => {
  it('the edit state prefills the stored quote + person', () => {
    expect(acceptEditStateFromSubmission(base)).toEqual({ quote: base.quote, person: base.person });
  });

  it('valid edits validate clean and the payload carries the TRIMMED pair (the sheet always sends both)', () => {
    const state = { quote: `  ${base.quote}  `, person: ' Maria D. ' };
    expect(validateAcceptEdit(state)).toEqual({});
    expect(buildAcceptPayload(state)).toEqual({ quote: base.quote, person: 'Maria D.' });
  });

  it('out-of-bounds edits fail on the imported constants — quote under 20 / over 600, person under 2 / over 80', () => {
    expect(validateAcceptEdit({ quote: 'x'.repeat(19), person: 'Maria D.' }).quote).toBeDefined();
    expect(validateAcceptEdit({ quote: 'x'.repeat(601), person: 'Maria D.' }).quote).toBeDefined();
    expect(validateAcceptEdit({ quote: base.quote, person: 'x' }).person).toBeDefined();
    expect(
      validateAcceptEdit({ quote: base.quote, person: 'x'.repeat(81) }).person
    ).toBeDefined();
    // The min-error copy is the landing form's pinned pair, verbatim.
    expect(validateAcceptEdit({ quote: 'x'.repeat(19), person: 'Maria D.' }).quote).toBe(
      'Tell us a little more — at least 20 characters.'
    );
    expect(validateAcceptEdit({ quote: base.quote, person: 'x' }).person).toBe(
      'Your name needs at least 2 characters.'
    );
  });

  it('an empty trim fails validation (the API bounds apply to the sent text)', () => {
    expect(validateAcceptEdit({ quote: '   ', person: 'Maria D.' }).quote).toBeDefined();
  });
});

describe('submittedOn (the queue’s UTC date line)', () => {
  it('formats UTC-stable — pinned on full-ICU Node (never edit the expectation; fix the runtime instead)', () => {
    expect(submittedOn(base)).toBe('Oct 14, 2026');
    expect(submittedOn({ ...base, createdAt: new Date('2026-01-02T23:59:00.000Z') })).toBe(
      'Jan 2, 2026'
    );
  });
});
```

- [ ] **Step 4: Run red**

`pnpm --filter @sevendays/admin test -- --run src/save-contract.test.ts src/status-segment.test.ts src/submissions-state.test.ts` — all three FAIL (the modules do not exist). Record red in the evidence dir.

- [ ] **Step 5: Write the three modules**

(a) Create `apps/admin/src/lib/save-contract.ts` with exactly:

```ts
// The CMS interaction system's pure seams (M7 #218, spec § the CMS UX
// maturation system — #165's ruling): the async Save contract's state, the
// one pending vocabulary's mapper, and the delete dialog's blocker-line
// derivation. Plain data in, plain data out — components/cms/shared.tsx
// renders these; this module never imports React.
//
// The async Save contract (binding): onSave resolves true = success (the
// shell closes), false = hold (the sheet stays open, state intact, retry
// safe), throw = hold (swallowed by the shell). The close-only-on-success
// rule lives in closesOnEvent; the editorNonce/keepEditorOpen remount
// machinery it replaces is deleted, not extended.

/** The three spec-pinned busy labels (+ the two moderation extensions, TODO(owner-copy) — ratify at the variants round). */
export const SAVING_LABEL = 'Saving…';
export const UPLOADING_LABEL = 'Uploading…';
export const DELETING_LABEL = 'Deleting…';
export const ACCEPTING_LABEL = 'Accepting…';
export const REJECTING_LABEL = 'Rejecting…';

/**
 * The pending vocabulary mapper (spec § one pending vocabulary): pending =
 * disabled + aria-busy + the label swap. Icon-only buttons ignore the labels
 * and swap their icon for the spinner at the call site.
 */
export function pendingVocabulary(options: {
  pending: boolean;
  idleLabel: string;
  busyLabel: string;
}): { disabled: boolean; ariaBusy: boolean; label: string } {
  return {
    disabled: options.pending,
    ariaBusy: options.pending,
    label: options.pending ? options.busyLabel : options.idleLabel,
  };
}

/** The shell's save-cycle state: started → saving; settled → idle (either way — the hold is the open sheet, never a stuck spinner). */
export type SaveContractState = { saving: boolean };

export const idleSaveContract: SaveContractState = { saving: false };

export type SaveContractEvent = { type: 'started' } | { type: 'settled'; ok: boolean };

export function reduceSaveContract(
  _state: SaveContractState,
  event: SaveContractEvent
): SaveContractState {
  return { saving: event.type === 'started' };
}

/**
 * The close rule: ONLY a settled-true closes. In-flight holds (the sheet is
 * busy), settled-false holds (a validation veto or a failed save — the
 * state is intact and retry is safe).
 */
export function closesOnEvent(event: SaveContractEvent): boolean {
  return event.type === 'settled' && event.ok;
}

/**
 * Derives the delete dialog's in-body blocker lines from a guarded-delete
 * 400's details (the #213 contract: one { path, message } per blocking
 * family, e.g. ['appointments'] + 'referenced by 3 appointment(s)'). Each
 * line leads with the capitalized family: 'Appointments — referenced by 3
 * appointment(s)'. Unknown shapes answer empty — the dialog then shows only
 * the failure message.
 */
export function blockerLines(details: unknown): string[] {
  if (!Array.isArray(details)) {
    return [];
  }
  const lines: string[] = [];
  for (const entry of details) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const { path, message } = entry as { path?: unknown; message?: unknown };
    if (typeof message !== 'string' || message === '') {
      continue;
    }
    const family = Array.isArray(path) && typeof path[0] === 'string' ? path[0] : null;
    lines.push(family ? `${family.charAt(0).toUpperCase()}${family.slice(1)} — ${message}` : message);
  }
  return lines;
}
```

(b) Create `apps/admin/src/lib/status-segment.ts` with exactly:

```ts
// The All/Active/Deactivated segment's pure half (M7 #218, spec § retired
// rows + the Active filter): every CMS list toolbar gains the triple;
// default All per visit (component state, never persisted); the filtered
// view is a render-time derivation — query caches and mutations keep
// operating on the full lists, and rail/grid counts stay unfiltered.

export type StatusSegment = 'all' | 'active' | 'deactivated';

/** The ordered label triple — the spec-pinned copy. */
export const STATUS_SEGMENTS: ReadonlyArray<{ value: StatusSegment; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'deactivated', label: 'Deactivated' },
];

/** 'all' returns a COPY of the input (never the caller's array); the other two filter on isActive. */
export function filterByStatusSegment<T extends { isActive: boolean }>(
  rows: readonly T[],
  segment: StatusSegment
): T[] {
  if (segment === 'all') {
    return [...rows];
  }
  return rows.filter((row) => (segment === 'active' ? row.isActive : !row.isActive));
}
```

(c) Create `apps/admin/src/lib/submissions-state.ts` with exactly:

```ts
// The Submissions tab's pure seams (M7 #218 over #216's moderation
// endpoints): the tab's own status segment (pending-first — the queue IS
// the work), the accept-with-edit state machine (prefill → validate on the
// imported bounds → the trimmed payload), and the UTC-stable submitted-on
// line. The bounds constants are imported from @sevendays/types — never
// re-declared.
import {
  TESTIMONIAL_PERSON_MAX,
  TESTIMONIAL_PERSON_MIN,
  TESTIMONIAL_QUOTE_MAX,
  TESTIMONIAL_QUOTE_MIN,
  type AcceptTestimonialSubmissionInput,
  type TestimonialSubmission,
} from '@sevendays/types';

export type SubmissionSegment = 'pending' | 'accepted' | 'rejected' | 'all';

/** Pending leads — the moderation queue's default view; All closes the row (audit-trail spotting). */
export const SUBMISSION_SEGMENTS: ReadonlyArray<{ value: SubmissionSegment; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export function filterSubmissions<T extends { status: TestimonialSubmission['status'] }>(
  rows: readonly T[],
  segment: SubmissionSegment
): T[] {
  if (segment === 'all') {
    return [...rows];
  }
  return rows.filter((row) => row.status === segment);
}

/** The accept-with-edit sheet's field state — prefilled from the submission, edited in place. */
export type AcceptEditState = { quote: string; person: string };

export function acceptEditStateFromSubmission(row: TestimonialSubmission): AcceptEditState {
  return { quote: row.quote, person: row.person };
}

// The min-error copy is the landing form's pinned TODO(owner-copy) pair,
// verbatim (#216) — one product, one line. The max lines are this tab's
// TODO(owner-copy) proposals — ratify at the variants round.
const QUOTE_MIN_ERROR = 'Tell us a little more — at least 20 characters.';
const PERSON_MIN_ERROR = 'Your name needs at least 2 characters.';
const QUOTE_MAX_ERROR = 'That’s a little long — at most 600 characters.';
const PERSON_MAX_ERROR = 'That name is a little long — at most 80 characters.';

/** Validates the TRIMMED text against the wire bounds (the API re-verifies — a staff edit that breaks a bound is a 400, never a silent trim). */
export function validateAcceptEdit(state: AcceptEditState): {
  quote?: string;
  person?: string;
} {
  const errors: { quote?: string; person?: string } = {};
  const quote = state.quote.trim();
  const person = state.person.trim();
  if (quote.length < TESTIMONIAL_QUOTE_MIN) {
    errors.quote = QUOTE_MIN_ERROR;
  } else if (quote.length > TESTIMONIAL_QUOTE_MAX) {
    errors.quote = QUOTE_MAX_ERROR;
  }
  if (person.length < TESTIMONIAL_PERSON_MIN) {
    errors.person = PERSON_MIN_ERROR;
  } else if (person.length > TESTIMONIAL_PERSON_MAX) {
    errors.person = PERSON_MAX_ERROR;
  }
  return errors;
}

/** The accept payload always carries the trimmed pair — the sheet prefilled both, so both ride the request. */
export function buildAcceptPayload(state: AcceptEditState): AcceptTestimonialSubmissionInput {
  return { quote: state.quote.trim(), person: state.person.trim() };
}

/** UTC-stable date line (fixed locale + timeZone — SSR/hydration-safe; pinned on full-ICU Node). */
export function submittedOn(row: TestimonialSubmission): string {
  return row.createdAt.toLocaleDateString('en-PH', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
```

- [ ] **Step 6: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run` — **21 files / 217 tests** (18/195 + the 22 new its: 10 + 4 + 8). Then `pnpm --filter @sevendays/admin fix` (re-run — counts unchanged), `pnpm --filter @sevendays/admin typecheck`. Commit:

```bash
git add apps/admin/src/lib/save-contract.ts apps/admin/src/lib/save-contract.test.ts apps/admin/src/lib/status-segment.ts apps/admin/src/lib/status-segment.test.ts apps/admin/src/lib/submissions-state.ts apps/admin/src/lib/submissions-state.test.ts
git commit -m "feat(admin): the interaction-system lib seams - the save contract, the pending vocabulary, the status segment, the submissions state (#218)"
```

### Task 2: The delete + moderation server fns + the submissions query

Additive only — thirteen new server fns over the live #213/#216 wrappers plus one query factory. `saveAdminSiteSettings` (`admin.functions.ts:289-313`) is the canonical shape; every fn below copies it.

**Files:**
- Modify: `apps/admin/src/lib/admin.functions.ts` (append at end of file; extend the two existing import lists)
- Modify: `apps/admin/src/lib/cms-queries.ts`

**Interfaces:**
- Produces (what Tasks 5–7 consume): `AdminDeleteResult` (`{ ok: true } | { ok: false; status: number; message: string; details?: unknown }`); `removeAdminPackage` / `removeAdminBranch` / `removeAdminStudioService` / `removeAdminAddon` / `removeAdminPrintSize` / `removeAdminAttire` / `removeAdminGalleryCategory` / `removeAdminGalleryPhoto` / `removeAdminTestimonial` / `removeAdminTestimonialSubmission` (each `.mutate({ data: { id } })` → `AdminDeleteResult`); `fetchAdminTestimonialSubmissions` (GET server fn returning `TestimonialSubmission[]`); `acceptAdminTestimonialSubmission` / `rejectAdminTestimonialSubmission` (`{ data: { id } }` → `AdminMutationResult<TestimonialSubmission>`); `adminTestimonialSubmissionQueries.all()` (query key `['admin', 'testimonial-submissions']`).
- Consumes: the api-client groups already on `ApiClient.admin` (`servicePackages.remove({ param: { id } })` … `testimonialSubmissions.list()/accept(id, json)/reject(id)/remove(id)`); `@sevendays/types`' `TestimonialSubmission` + `acceptTestimonialSubmissionSchema`.

**Not here:** any API/api-client/types change (the wrappers are live); any component (Tasks 3+); any audit or rate-limit work (API-side, already live).

- [ ] **Step 1: admin.functions.ts — imports**

Extend the existing `@sevendays/types` type-import list with `TestimonialSubmission` (alphabetical, after `Testimonial`) and the schema-import list with `acceptTestimonialSubmissionSchema` (after `createTestimonialSchema`). No other import changes.

- [ ] **Step 2: admin.functions.ts — the delete result type + the nine removes + the four submissions fns**

Append at the end of the file, exactly:

```ts
// M7 #218: the guarded-delete server fns over the #213 remove() wrappers.
// A 204 has no data, so the delete result carries only ok — and !ok keeps
// the result-value channel's details (the blocked-delete 400's one
// { path, message } per blocking family) for the delete dialogs' in-body
// blockers (blockerLines in lib/save-contract.ts).
export type AdminDeleteResult =
  | { ok: true }
  | { ok: false; status: number; message: string; details?: unknown };

// The shared body for the result-valued action fns below: run the wrapper,
// map ApiClientError to the failure arm, rethrow anything else (not an API
// failure — serialization, session loss — loud). The failure arm unions
// with the action's own success return, so each fn's declared result type
// stays the plain result union — no casts.
type AdminClient = ReturnType<typeof getSessionScopedApiClient>;
type AdminActionFailure = { ok: false; status: number; message: string; details?: unknown };

async function runAdminAction<T>(
  spanName: string,
  action: (client: AdminClient) => Promise<T>
): Promise<T | AdminActionFailure> {
  return startSpan({ name: spanName }, async () => {
    const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
    try {
      return await action(client);
    } catch (error) {
      if (error instanceof ApiClientError) {
        return { ok: false, status: error.status, message: error.message, details: error.details };
      }
      throw error;
    }
  });
}

function adminDeleteFn(
  spanName: string,
  run: (client: AdminClient, id: string) => Promise<void>
) {
  return createServerFn({
    method: 'POST',
    // See presignAdminCoverUpload — output strictness waived for the result
    // value (details?: unknown rides through by design).
    strict: { output: false },
  })
    .validator(z.object({ id: z.uuid() }))
    .handler(async ({ data }): Promise<AdminDeleteResult> => {
      return runAdminAction(spanName, async (client) => {
        await run(client, data.id);
        return { ok: true as const };
      });
    });
}

export const removeAdminPackage = adminDeleteFn('DELETE /api/v1/admin/service-packages/:id', (client, id) => client.admin.servicePackages.remove({ param: { id } }));
export const removeAdminBranch = adminDeleteFn('DELETE /api/v1/admin/branches/:id', (client, id) => client.admin.branches.remove({ param: { id } }));
export const removeAdminStudioService = adminDeleteFn('DELETE /api/v1/admin/studio-services/:id', (client, id) => client.admin.studioServices.remove({ param: { id } }));
export const removeAdminAddon = adminDeleteFn('DELETE /api/v1/admin/addon-services/:id', (client, id) => client.admin.addons.remove({ param: { id } }));
export const removeAdminPrintSize = adminDeleteFn('DELETE /api/v1/admin/print-sizes/:id', (client, id) => client.admin.printSizes.remove({ param: { id } }));
export const removeAdminAttire = adminDeleteFn('DELETE /api/v1/admin/attires/:id', (client, id) => client.admin.attires.remove({ param: { id } }));
export const removeAdminGalleryCategory = adminDeleteFn('DELETE /api/v1/admin/gallery-categories/:id', (client, id) => client.admin.galleryCategories.remove({ param: { id } }));
export const removeAdminGalleryPhoto = adminDeleteFn('DELETE /api/v1/admin/gallery-photos/:id', (client, id) => client.admin.galleryPhotos.remove({ param: { id } }));
export const removeAdminTestimonial = adminDeleteFn('DELETE /api/v1/admin/testimonials/:id', (client, id) => client.admin.testimonials.remove({ param: { id } }));
export const removeAdminTestimonialSubmission = adminDeleteFn('DELETE /api/v1/admin/testimonial-submissions/:id', (client, id) => client.admin.testimonialSubmissions.remove(id));

// M7 #218: the Submissions tab's read + moderation fns over #216's
// endpoints (the media action-endpoint precedent — accept/reject are
// action POSTs, not full-object PUTs).
export const fetchAdminTestimonialSubmissions = createServerFn({ method: 'GET' }).handler(
  async () => {
    return startSpan({ name: 'GET /api/v1/admin/testimonial-submissions' }, async () => {
      return getSessionScopedApiClient(
        getRequestHeaders().get('cookie')
      ).admin.testimonialSubmissions.list();
    });
  }
);

export const acceptAdminTestimonialSubmission = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: acceptTestimonialSubmissionSchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<TestimonialSubmission>> => {
    return runAdminAction('POST /api/v1/admin/testimonial-submissions/:id/accept', async (client) => ({
      ok: true as const,
      data: await client.admin.testimonialSubmissions.accept(data.id, data.payload),
    }));
  });

export const rejectAdminTestimonialSubmission = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }): Promise<AdminMutationResult<TestimonialSubmission>> => {
    return runAdminAction('POST /api/v1/admin/testimonial-submissions/:id/reject', async (client) => ({
      ok: true as const,
      data: await client.admin.testimonialSubmissions.reject(data.id),
    }));
  });
```

**Design note (the helpers):** twelve fns share one validator, one strictness waiver, and one error-map — the helpers keep the #216-plan's per-fn boilerplate from being pasted twelve times. `runAdminAction`'s failure arm unions with the action's success return (no casts); `AdminDeleteResult` is exactly `{ ok: true } | AdminActionFailure`. If biome's formatter reflows the one-line fns, accept the rewrite.

- [ ] **Step 3: cms-queries.ts — the submissions factory**

Add to the imports (`fetchAdminTestimonialSubmissions` joins the `./admin.functions` list, alphabetical) and append after `adminTestimonialQueries`, exactly:

```ts
// M7 #218: the Submissions tab's queue — newest-first from the API (#216's list).
export const adminTestimonialSubmissionQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'testimonial-submissions'],
      queryFn: fetchAdminTestimonialSubmissions,
    }),
};
```

- [ ] **Step 4: Gates + commit**

`pnpm --filter @sevendays/admin fix` then `test -- --run` (**21 files / 217 unchanged**) then `typecheck`. Commit:

```bash
git add apps/admin/src/lib/admin.functions.ts apps/admin/src/lib/cms-queries.ts
git commit -m "feat(admin): the delete + moderation server fns - nine removes over the #213 wrappers, the submissions fetch/accept/reject/remove (#218)"
```

### Task 3: `shared.tsx` — the additive interaction compositions

Everything here is additive: new exports plus two optional-prop widenings plus the palette candidates on the two existing sites. `LightEntityEditor`'s contract does NOT change yet (Task 4 owns it, with the type wall).

**Files:**
- Modify: `apps/admin/src/components/cms/shared.tsx`

**Interfaces:**
- Produces (what Tasks 4–7 consume): `PendingSpinner()`; `SegmentedControl<T extends string>({ options: ReadonlyArray<{ value: T; label: string }>, value, onChange, ariaLabel })`; `StatusSegmented({ value, onChange })` (typed to `StatusSegment`, aria-label 'Status filter'); `GuardedConfirm({ title, description, confirmLabel, busyLabel, pending, blockers, open, onOpenChange, onConfirm })`; `DeleteGuardDialog({ name, mediaNote?, blockers, pending, open, onOpenChange, onDelete })`; `SubmissionStatusBadge({ status })`; `RowIconActions`/`RowActionsCluster` gain optional `onDelete?: () => void` (a `Trash2` destructive icon, rendered LAST — farthest from Edit); the `StatusBadge` dot + reactivate icon carry the dark-aware palette candidates.
- Consumes: Task 1's `STATUS_SEGMENTS`/`StatusSegment` + `DELETING_LABEL`; `@sevendays/types`' `TestimonialSubmissionStatus`; the existing `Badge` primitive (`@sevendays/ui/components/badge` — a new import for this file).

**Not here:** the async Save contract (Task 4); any screen wiring (Tasks 5–7); retiring the `TODO(token-ruling)` comments (Task 8's round).

- [ ] **Step 1: The imports + `PendingSpinner` + `SegmentedControl`/`StatusSegmented`**

Add to the lucide import: `LoaderCircle`, `Trash2`. Add imports: `Badge` from `@sevendays/ui/components/badge`; `type StatusSegment` + `STATUS_SEGMENTS` from `#/lib/status-segment`; `DELETING_LABEL` from `#/lib/save-contract`; `type TestimonialSubmissionStatus` from `@sevendays/types`. Then, after the `peso` helper, exactly:

```tsx
/** M7 #218: the pending vocabulary's spinner — LoaderCircle, animate-spin, currentColor, aria-hidden. Icon-only buttons render this IN PLACE of their icon; labeled buttons prefix it. */
export function PendingSpinner() {
  return <LoaderCircle aria-hidden='true' className='animate-spin' />;
}

/**
 * The segmented control (M7 #218) — the WindowToggle recipe (dashboard) as
 * pressed buttons: role=group + aria-label on an inline-flex bordered
 * container; the active segment rides the design system's own active stop
 * (--brand-primary-active, the tokens.css convention — white on #034356 is
 * 10.82:1); the inactive segments hover on accent. Local state at the call
 * site — no routes, no persistence.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role='group'
      aria-label={ariaLabel}
      className='border-input bg-background inline-flex overflow-hidden rounded-lg border'
    >
      {options.map(({ value: option, label }) => {
        const active = value === option;
        return (
          <button
            key={option}
            type='button'
            aria-pressed={active}
            className={
              active
                ? 'bg-brand-800 text-primary-foreground px-3 py-1.5 text-xs font-medium'
                : 'hover:bg-accent hover:text-accent-foreground px-3 py-1.5 text-xs'
            }
            onClick={() => onChange(option)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** The All/Active/Deactivated triple — the spec's retired-row filter, default All per visit at the call site. */
export function StatusSegmented({
  value,
  onChange,
}: {
  value: StatusSegment;
  onChange: (next: StatusSegment) => void;
}) {
  return (
    <SegmentedControl options={STATUS_SEGMENTS} value={value} onChange={onChange} ariaLabel='Status filter' />
  );
}
```

- [ ] **Step 2: `GuardedConfirm` + `DeleteGuardDialog`**

After `DeactivateConfirm`, exactly:

```tsx
/**
 * The guarded-action confirm (M7 #218): DeactivateConfirm's motion recipe
 * (visible latch + AnimatePresence exit + the mobile dock) on a
 * PENDING-GUARDED action — the confirm button goes disabled + spinner + the
 * busy label swap + aria-busy while the parent's mutation runs; the dialog
 * STAYS OPEN on failure with the blocking references rendered in-body
 * (never toast-and-close); the parent clears `open` on success. Cancel is
 * disabled while pending (a close mid-flight would orphan the result).
 */
export function GuardedConfirm({
  title,
  description,
  confirmLabel,
  busyLabel,
  pending,
  blockers,
  open,
  onOpenChange,
  onConfirm,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  pending: boolean;
  blockers: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(open);
  }, [open]);
  const variants = isMobile
    ? {
        initial: { opacity: 0, transform: 'translateY(100%)' },
        animate: { opacity: 1, transform: 'translateY(0)' },
        exit: { opacity: 0, transform: 'translateY(100%)' },
      }
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
      };
  return (
    <AlertDialog
      open={visible && open}
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
        } else {
          setVisible(false);
        }
      }}
    >
      <AnimatePresence onExitComplete={() => onOpenChange(false)}>
        {visible && (
          <AlertDialogPortal keepMounted>
            <AlertDialogOverlay
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              }
            />
            <AlertDialogContent
              render={
                <motion.div
                  initial={variants.initial}
                  animate={variants.animate}
                  exit={variants.exit}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              }
              className='top-auto bottom-0 left-0 translate-x-0 translate-y-0 rounded-b-none data-[size=default]:max-w-none max-sm:rounded-t-xl sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-b-[min(var(--radius-4xl),24px)]'
            >
              <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>{description}</AlertDialogDescription>
                {blockers.length > 0 ? (
                  <div className='text-destructive space-y-1 text-sm' role='alert'>
                    <p className='font-medium'>Blocked by:</p>
                    <ul className='list-disc space-y-0.5 pl-5'>
                      {blockers.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant='destructive'
                  disabled={pending}
                  aria-busy={pending}
                  onClick={onConfirm}
                >
                  {pending ? <PendingSpinner /> : null}
                  {pending ? busyLabel : confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogPortal>
        )}
      </AnimatePresence>
    </AlertDialog>
  );
}

/**
 * The delete confirm (M7 #218, spec § Confirmation UX): GuardedConfirm with
 * the delete copy — names the row, states the irreversible, and where the
 * entity carries media, `mediaNote` states the images go with it (audit
 * story 37). No typed-name gate (guarded deletes destroy no booking
 * history). Blockers arrive only after a blocked 400 — the dialog's first
 * open shows none.
 */
export function DeleteGuardDialog({
  name,
  mediaNote,
  blockers,
  pending,
  open,
  onOpenChange,
  onDelete,
}: {
  name: string;
  mediaNote?: string;
  blockers: string[];
  pending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <GuardedConfirm
      title={`Delete ${name}?`}
      description={
        <>
          {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items).
              Spans, not <p> — AlertDialogDescription renders its own <p>. */}
          <span className='block'>This permanently deletes it from the catalog.</span>
          {mediaNote ? <span className='block'>{mediaNote}</span> : null}
        </>
      }
      confirmLabel='Delete'
      busyLabel={DELETING_LABEL}
      pending={pending}
      blockers={blockers}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onDelete}
    />
  );
}
```

- [ ] **Step 3: `SubmissionStatusBadge` + the row-actions delete slot + the palette candidates**

(a) After `StatusBadge`, exactly:

```tsx
// The submissions queue's status palette (M7 #218): the audit viewer's
// badge discipline (outline Badge + hue family, audit-log-screen.tsx:57)
// on the three moderation states.
// TODO(token-ruling): status palette pending the owner's variants round —
// the classes are candidates, retunable at this ticket's Task 8.
const SUBMISSION_STATUS_META: Record<
  TestimonialSubmissionStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className:
      'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300',
  },
  accepted: {
    label: 'Accepted',
    className:
      'border-green-300 bg-green-50 text-green-800 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-300',
  },
  rejected: {
    label: 'Rejected',
    className:
      'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300',
  },
};

/** One moderation state — visible text, never color alone. */
export function SubmissionStatusBadge({ status }: { status: TestimonialSubmissionStatus }) {
  const meta = SUBMISSION_STATUS_META[status];
  return (
    <Badge variant='outline' className={meta.className}>
      {meta.label}
    </Badge>
  );
}
```

(b) `StatusBadge`'s dot span (line ~78) and the reactivate button's classes (line ~260) take the dark-aware candidates — the `TODO(token-ruling)` comments STAY until Task 8:

```tsx
        className={`size-2.5 rounded-full ${
          isActive ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-400 dark:bg-zinc-500'
        }`}
```

```tsx
              className='text-green-700 hover:bg-green-600/10 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-400/10 dark:hover:text-green-400'
```

(c) `RowIconActions` gains `onDelete?: () => void` — the Trash2 renders LAST, after the Power/PowerOff pair, same destructive styling as Deactivate:

```tsx
      {onDelete ? (
        <ActionTooltip
          label='Delete'
          button={
            <Button
              variant='ghost'
              size='icon-sm'
              type='button'
              aria-label='Delete'
              className='text-destructive hover:bg-destructive/10 hover:text-destructive'
              onClick={onDelete}
            >
              <Trash2 aria-hidden='true' />
            </Button>
          }
        />
      ) : null}
```

Add `onDelete?: () => void;` to `RowIconActions`' props type and to `RowActionsCluster`'s, threading it into the inner `<RowIconActions … />` call.

- [ ] **Step 4: Gates + commit**

`pnpm --filter @sevendays/admin fix` then `test -- --run` (21/217 unchanged) then `typecheck`. Commit:

```bash
git add apps/admin/src/components/cms/shared.tsx
git commit -m "feat(admin): the shared interaction compositions - SegmentedControl, StatusSegmented, the guarded confirm pair, the submissions badge, the row delete slot (#218)"
```

### Task 4: The async Save contract on all seven sheet surfaces — the nonce machinery deleted

One commit, forced by the type wall: `LightEntityEditor.onSave` becomes `() => Promise<boolean>`, and every call site converts in the same commit or the package does not typecheck. The `editorNonce`/`keepEditorOpen` machinery, the veto-throws, and the `onSuccess`/`onError` keep-open branches all die here.

**Files:**
- Modify: `apps/admin/src/components/cms/shared.tsx` (the `LightEntityEditor` block only)
- Modify: `apps/admin/src/components/testimonials/testimonials-screen.tsx`, `lookups/lookups-screen.tsx`, `addons/addons-screen.tsx`, `branches/branches-screen.tsx`, `studio-services/studio-services-screen.tsx`, `gallery/gallery-screen.tsx`

**Interfaces:**
- Produces: `LightEntityEditor`'s `onSave: () => Promise<boolean>` (resolve `true` = the shell closes; resolve `false` = hold; throw = hold, swallowed). The shell owns `saving` and renders the Save/Cancel pair under the vocabulary (`SAVING_LABEL` + `PendingSpinner` + `aria-busy`; both buttons disabled in flight).
- Consumes: Task 3's `PendingSpinner`; Task 1's `SAVING_LABEL`; react-query's `mutateAsync`.

**Not here:** delete wiring + segments (Task 5/6); the package editor (Task 6 — a full screen, not a sheet); the Submissions tab (Task 7); any change to the optimistic `flip`/`order` mutations or `DeactivateConfirm` (the action-class law's optimistic half — untouched).

- [ ] **Step 1: `shared.tsx` — the `LightEntityEditor` contract**

Replace the component's JSDoc "Veto contract" paragraph (the last paragraph of its doc block) with exactly:

```text
 * The async Save contract (M7 #218, replacing the M5 veto-throw channel):
 * onSave returns a promise — resolve true = success (the shell closes);
 * resolve false = hold (the sheet stays open, its field state intact,
 * retry safe); throw = hold (swallowed; the screen's inline errors + toast
 * are the UX). The shell owns the pending state: Save disabled + the
 * LoaderCircle spinner + the "Saving…" label swap + aria-busy in flight,
 * Cancel disabled alongside. The close is the shell's alone — a failed
 * save can never silently discard edits. The editorNonce remount machinery
 * this replaces is deleted, not extended.
```

Change the `onSave` prop type from `onSave: () => void;` to `onSave: () => Promise<boolean>;`, add `const [saving, setSaving] = useState(false);` beside the `visible` latch, add the handler and replace the footer, exactly:

```tsx
  // The async Save contract: the shell awaits onSave; ONLY a resolved-true
  // closes — a resolved-false (validation veto, failed save, matrix
  // failure) or a throw holds the sheet open over the intact state.
  async function handleSave() {
    if (saving) {
      return;
    }
    setSaving(true);
    let ok = false;
    try {
      ok = await onSave();
    } catch {
      ok = false; // unexpected: hold; the screen's toast owns the signal
    }
    setSaving(false);
    if (ok) {
      setVisible(false);
    }
  }
```

```tsx
            <SheetFooter>
              <Button variant='outline' type='button' disabled={saving} onClick={() => setVisible(false)}>
                Cancel
              </Button>
              <Button
                type='button'
                disabled={saving}
                aria-busy={saving}
                onClick={() => {
                  void handleSave();
                }}
              >
                {saving ? <PendingSpinner /> : null}
                {saving ? SAVING_LABEL : (saveLabel ?? 'Save changes')}
              </Button>
            </SheetFooter>
```

- [ ] **Step 2: testimonials-screen.tsx**

(a) Delete the `const [editorNonce, setEditorNonce] = useState(0);` line + its comment, the whole `keepEditorOpen` fn + its JSDoc, the `onSuccess`/`onError` blocks of `saveTestimonial` (the mutation keeps ONLY its `mutationFn`), the `throw new Error('testimonial-editor-validation-hold');` line + its comment, and `key={editorNonce}` on the `LightEntityEditor` usage. (b) Replace the comment above the `editing`/`editorOpen` state pair and the whole `handleEditorSave` with exactly:

```tsx
  // The editor's create/edit switch and its open flag are separate: the
  // async Save contract (#218) closes the shell ONLY on a resolved-true —
  // a held save (veto, failure) keeps the sheet open over the intact
  // parent-held state; onOpenChange(false) (Cancel, overlay, or the
  // post-success exit) clears both.
```

```tsx
  // Editor saves: NON-optimistic — the form state is the source of truth;
  // the async Save contract owns the flow: await the full-object PUT,
  // resolve true on ok (the shell closes), false on any hold (retry is
  // safe — the save is a full-object PUT). No unique fields on this
  // table, so no conflict mapping — every !ok surfaces as its message
  // toast.
  const saveTestimonial = useMutation({
    mutationFn: async (input: SaveTestimonialInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminTestimonialCreate({ data: buildTestimonialPayload(input.state) })
          : await saveAdminTestimonialUpdate({
              data: { id: input.row.id, payload: buildTestimonialPayload(input.state) },
            });
      return { input, result };
    },
  });

  async function handleEditorSave(): Promise<boolean> {
    if (!editing) {
      return false;
    }
    const errors = validateTestimonialState(editorState);
    if (errors.person || errors.quote) {
      setFieldErrors(errors);
      toast.error('Fix the highlighted fields.');
      return false; // the async contract's hold — no throw, no remount
    }
    setFieldErrors({});
    try {
      const { result } = await saveTestimonial.mutateAsync(
        editing.mode === 'create'
          ? { mode: 'create', state: editorState }
          : { mode: 'edit', row: editing.row, state: editorState }
      );
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
        toast.success('Saved.');
        return true;
      }
      toast.error(result.message);
      return false;
    } catch (error) {
      // Not an API failure (serialization, session loss) — loud toast, same hold.
      toast.error(error.message);
      return false;
    }
  }
```

(c) `onSave={handleEditorSave}` stays (its type is now the promise).

- [ ] **Step 3: lookups-screen.tsx**

Same deletions as Step 2 (`editorNonce`, `keepEditorOpen`, both saves' `onSuccess`/`onError`, both veto-throws + comments, both `key={editorNonce}`, the state-triple comment). Replace with the state comment from Step 2(b) and exactly:

```tsx
  // Editor saves: NON-optimistic; the async Save contract owns the flow
  // (#218). A conflict (duplicate code / name) marks the field inline; no
  // details → the message toast. One handler branches on the kind.
  const saveSize = useMutation({
    mutationFn: async (input: SaveSizeInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminPrintSizeCreate({ data: buildPrintSizePayload(input.state) })
          : await saveAdminPrintSizeUpdate({
              data: { id: input.row.id, payload: buildPrintSizePayload(input.state) },
            });
      return { input, result };
    },
  });

  const saveAttire = useMutation({
    mutationFn: async (input: SaveAttireInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminAttireCreate({ data: buildAttirePayload(input.state) })
          : await saveAdminAttireUpdate({
              data: { id: input.row.id, payload: buildAttirePayload(input.state) },
            });
      return { input, result };
    },
  });

  async function handleEditorSave(): Promise<boolean> {
    if (!editing) {
      return false;
    }
    if (editing.kind === 'size') {
      const errors = validatePrintSizeState(sizeState);
      if (errors.code || errors.description) {
        setSizeErrors(errors);
        toast.error('Fix the highlighted fields.');
        return false;
      }
      setSizeErrors({});
      try {
        const { result } = await saveSize.mutateAsync(
          editing.mode === 'create'
            ? { mode: 'create', state: sizeState }
            : { mode: 'edit', row: editing.row, state: sizeState }
        );
        if (result.ok) {
          queryClient.invalidateQueries({ queryKey: adminLookupQueries.printSizes().queryKey });
          toast.success('Saved.');
          return true;
        }
        const codeConflict = conflictFieldErrors(result.details).code;
        if (codeConflict) {
          setSizeErrors({ code: codeConflict });
        }
        if (!result.details) {
          toast.error(result.message);
        }
        return false;
      } catch (error) {
        toast.error(error.message);
        return false;
      }
    }
    const errors = validateAttireState(attireState);
    if (errors.name) {
      setAttireErrors(errors);
      toast.error('Fix the highlighted fields.');
      return false;
    }
    setAttireErrors({});
    try {
      const { result } = await saveAttire.mutateAsync(
        editing.mode === 'create'
          ? { mode: 'create', state: attireState }
          : { mode: 'edit', row: editing.row, state: attireState }
      );
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminLookupQueries.attires().queryKey });
        toast.success('Saved.');
        return true;
      }
      const nameConflict = conflictFieldErrors(result.details).name;
      if (nameConflict) {
        setAttireErrors({ name: nameConflict });
      }
      if (!result.details) {
        toast.error(result.message);
      }
      return false;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }
```

- [ ] **Step 4: addons-screen.tsx**

Same deletions (including the whole big `onSuccess` of `saveAddon` — its logic moves into the handler). The `SaveAddonOutcome` type and `mutationFn` stay verbatim; in `saveAddon`'s JSDoc, reword every `onSuccess` reference to "the async Save handler" (the behavior it describes moved there). Replace the state comment + handler with exactly:

```tsx
  // The editor's create/edit switch and its open flag are separate: the
  // async Save contract (#218) closes the shell ONLY on a resolved-true —
  // a held save keeps the sheet open over the intact parent-held state,
  // INCLUDING AQ-4's create→edit promotion after a matrix failure;
  // onOpenChange(false) clears both.
```

```tsx
  async function handleEditorSave(): Promise<boolean> {
    if (!editing) {
      return false;
    }
    const errors = validateAddonState(editorState);
    if (errors.name || errors.description || errors.price) {
      setFieldErrors(errors);
      toast.error('Fix the highlighted fields.');
      return false;
    }
    setFieldErrors({});
    const input: SaveAddonInput =
      editing.mode === 'create'
        ? { mode: 'create', services: editing.services, state: editorState }
        : { mode: 'edit', row: editing.row, services: editing.services, state: editorState };
    try {
      const outcome = await saveAddon.mutateAsync(input);
      if (outcome.kind === 'saved') {
        // The badges live on the services read — both lists invalidate.
        queryClient.invalidateQueries({ queryKey: adminAddonQueries.all().queryKey });
        queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
        toast.success('Saved.');
        return true;
      }
      if (outcome.kind === 'matrix-failed') {
        // The entity write landed (and possibly earlier fan-out PUTs); the
        // failing matrix PUT did not. The sheet HOLDS with the checks
        // intact — the retry's Save re-runs the chain. AQ-4's mode switch:
        // a create that already created promotes to edit-over-the-created-
        // row, so the retry is an UPDATE + fan-out, never a duplicate
        // create. Both lists invalidate — the entity half is real either
        // way, and the PUTs before the failure may have landed too.
        setEditing(
          outcome.input.mode === 'create'
            ? { mode: 'edit', row: outcome.created, services: outcome.input.services }
            : { mode: 'edit', row: outcome.input.row, services: outcome.input.services }
        );
        queryClient.invalidateQueries({ queryKey: adminAddonQueries.all().queryKey });
        queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
        toast.error(`Saved, but the ${outcome.failedServiceName} matrix failed: ${outcome.message}`);
        return false;
      }
      const nameConflict = conflictFieldErrors(outcome.result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      }
      if (!outcome.result.details) {
        toast.error(outcome.result.message);
      }
      return false;
    } catch (error) {
      // Bounded duplicate-POST window: a fast double-submit can fire the
      // create twice — the second lands on the unique-name constraint and
      // surfaces as its 400 conflict message, never a duplicate row.
      toast.error(error.message);
      return false;
    }
  }
```

- [ ] **Step 5: branches-screen.tsx**

Same deletions (`saveBranch`'s handlers die; `keepEditorOpen` dies — note `openCreate`/`openEdit` keep their cover-reset blocks untouched). State comment per Step 2(b), then exactly:

```tsx
  // Editor saves: NON-optimistic; the async Save contract owns the flow
  // (#218). A name conflict marks the Name Field; no details → the message
  // toast.
  const saveBranch = useMutation({
    mutationFn: async (input: SaveBranchInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminBranchCreate({ data: buildBranchCreatePayload(input.state) })
          : await saveAdminBranchUpdate({
              data: { id: input.row.id, payload: buildBranchUpdatePayload(input.state) },
            });
      return { input, result };
    },
  });

  async function handleEditorSave(): Promise<boolean> {
    if (!editing) {
      return false;
    }
    const errors = validateBranchState(editorState);
    if (errors.name || errors.address || errors.phone) {
      setFieldErrors(errors);
      toast.error('Fix the highlighted fields.');
      return false;
    }
    setFieldErrors({});
    try {
      const { result } = await saveBranch.mutateAsync(
        editing.mode === 'create'
          ? { mode: 'create', state: editorState }
          : { mode: 'edit', row: editing.row, state: editorState }
      );
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminBranchQueries.all().queryKey });
        toast.success('Saved.');
        return true;
      }
      const nameConflict = conflictFieldErrors(result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      }
      if (!result.details) {
        toast.error(result.message);
      }
      return false;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }
```

- [ ] **Step 6: studio-services-screen.tsx**

Same deletions. State comment per Step 4 (without `services`), then exactly:

```tsx
  async function handleEditorSave(): Promise<boolean> {
    if (!editing) {
      return false;
    }
    const errors = validateStudioServiceState(editorState);
    if (errors.name || errors.description || errors.price) {
      setFieldErrors(errors);
      toast.error('Fix the highlighted fields.');
      return false;
    }
    setFieldErrors({});
    const input: SaveStudioServiceInput =
      editing.mode === 'create'
        ? { mode: 'create', state: editorState }
        : { mode: 'edit', row: editing.row, state: editorState };
    try {
      const outcome = await saveStudioService.mutateAsync(input);
      if (outcome.kind === 'saved') {
        queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
        queryClient.invalidateQueries({ queryKey: adminBranchQueries.all().queryKey });
        toast.success('Saved.');
        return true;
      }
      if (outcome.kind === 'matrix-failed') {
        // The entity write landed; the branch matrix PUT failed. The sheet
        // HOLDS with the selections intact — the retry re-runs both PUTs.
        // AQ-4's mode switch: create promotes to the created row.
        setEditing(
          outcome.input.mode === 'create'
            ? { mode: 'edit', row: outcome.created }
            : { mode: 'edit', row: outcome.input.row }
        );
        queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
        toast.error(`Saved, but the branch matrix failed: ${outcome.message}`);
        return false;
      }
      const nameConflict = conflictFieldErrors(outcome.result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      }
      if (!outcome.result.details) {
        toast.error(outcome.result.message);
      }
      return false;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }
```

(`saveStudioService` keeps only its `mutationFn` + its own JSDoc block, with every `onSuccess` reference reworded to "the async Save handler" — the behavior it describes moved there.)

- [ ] **Step 7: gallery-screen.tsx (the photo sheet)**

Delete `editorNonce`, `keepEditorOpen`, `photoSave`'s `onSuccess`/`onError`, `key={editorNonce}`, and the state-pair comment. The sheet's `onSave` was an inline arrow — it becomes the named handler. Exactly:

```tsx
  // The photo editor: edit-only (photos are created by upload); the async
  // Save contract owns the flow (#218) — a held save keeps the sheet open
  // over the intact parent-held state; onOpenChange(false) clears both.
```

```tsx
  // Editor saves: NON-optimistic; await the full-object PUT, resolve true
  // on ok. No inline Field slot — every photo 400 is toast-carried.
  const photoSave = useMutation({
    mutationFn: async (input: { row: GalleryPhoto; state: PhotoEditorState }) => {
      return saveAdminGalleryPhotoUpdate({
        data: { id: input.row.id, payload: buildPhotoPayload(input.state) },
      });
    },
  });

  async function handleEditorSave(): Promise<boolean> {
    if (!editing) {
      return false;
    }
    try {
      const result = await photoSave.mutateAsync({ row: editing.row, state: editorState });
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminGalleryQueries.photos().queryKey });
        toast.success('Saved.');
        return true;
      }
      toast.error(result.message);
      return false;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }
```

And on the usage: `onSave={handleEditorSave}` (replacing the inline `() => photoSave.mutate(...)` arrow).

- [ ] **Step 8: The grep gate + gates + commit**

The nonce machinery's death, proven mechanically:

```bash
grep -rn "editorNonce\|keepEditorOpen" apps/admin/src; echo "exit=$?"
grep -rn "validation-hold" apps/admin/src; echo "exit=$?"
```

Expected (re-scoped, 2026-10-16 controller ruling after the live run): the `editorNonce\|keepEditorOpen` pattern cannot reach literal zero — this JSDoc's own pinned text plus save-contract.ts's module comment match it in prose. The gate PASSES when the only hits are comment prose and the FUNCTIONAL markers are all zero (`grep -rn "setEditorNonce\|key={editorNonce}\|keepEditorOpen(" apps/admin/src` → exit=1) and `validation-hold` is zero (exit=1). Record both outputs in the evidence dir. Then `pnpm --filter @sevendays/admin fix` → `test -- --run` (21/217 unchanged) → `typecheck` (the wall: green ONLY if all seven sites converted). Bare `catch (error)` blocks take the house idiom `error instanceof Error ? error.message : 'The save failed.'` (TS18046 under strict; the plan's fences predate the check). Commit:

```bash
git add apps/admin/src/components/cms/shared.tsx apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/components/lookups/lookups-screen.tsx apps/admin/src/components/addons/addons-screen.tsx apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/studio-services/studio-services-screen.tsx apps/admin/src/components/gallery/gallery-screen.tsx
git commit -m "feat(admin): the async Save contract on all seven sheet surfaces - close-only-on-success, the nonce machinery deleted (#218)"
```


### Task 5: Delete dialogs + the status segment on the five light-entity screens

The same wiring lands on testimonials, add-ons, branches, studio services, and both lookups sections: a `segment` state + `StatusSegmented` in the toolbar, a `deleteId`/`deleteBlockers` pair + a `removeRow` mutation + a `DeleteGuardDialog` mount, and the `onDelete` slot threaded into every row's actions. The filtered view is a render-time derivation — the mutations and caches keep operating on the FULL lists (`deleteRow` is found in the full array, never the filtered one).

**Files:**
- Modify: `apps/admin/src/components/testimonials/testimonials-screen.tsx`, `addons/addons-screen.tsx`, `branches/branches-screen.tsx`, `studio-services/studio-services-screen.tsx`, `lookups/lookups-screen.tsx`, `cms/bulk-bar.tsx`

**Interfaces:**
- Consumes: Task 2's `removeAdmin<Entity>` fns; Task 3's `StatusSegmented`/`DeleteGuardDialog` + the `onDelete` slot; Task 1's `filterByStatusSegment`/`StatusSegment` + `blockerLines`.
- Produces: six of the eight segment surfaces (testimonials, add-ons, branches, studio services, and both lookups sections) + six of the nine entity delete dialogs (the same six entities); the gallery grid + packages table are Task 6; the testimonials Submissions tab is Task 7 — this task does NOT touch the testimonials screen's tab structure.

**Not here:** the gallery grid/rail (Task 6); packages (Task 6); any change to `DeactivateConfirm` (optimistic, close-on-confirm, untouched); bulk-delete (not ruled — the bulk bar keeps Deactivate/Reactivate only); the submissions moderation verbs (Task 7).

- [ ] **Step 1: testimonials-screen.tsx**

Imports: `StatusSegmented`, `DeleteGuardDialog` join the `#/components/cms/shared` list; `StatusSegment`, `filterByStatusSegment` from `#/lib/status-segment`; `blockerLines` from `#/lib/save-contract`; `removeAdminTestimonial` joins the `#/lib/admin.functions` import; `reorderVisiblePhotos` joins the `#/lib/gallery-state` import (beside the existing `reorderIds`, which stays until Step (d) removes its last use — then delete it from the import). State + derived, after `confirmId`:

```tsx
  // The toolbar segment (#218): default All per visit, never persisted; the
  // filtered view is render-time only — the caches and mutations ride the
  // full list.
  const [segment, setSegment] = useState<StatusSegment>('all');
  // The delete dialog's target + its last blockers (empty until a blocked
  // 400 answers — testimonials are blocked by nothing, but the wiring is
  // the same everywhere).
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
```

```tsx
  // The pending-guarded delete (#218, the #213 route): busy confirm via the
  // dialog's `pending`; a blocked 400 keeps the dialog open with the
  // blockers in-body; success closes + invalidates.
  const removeRow = useMutation({
    mutationFn: async (row: Testimonial) => {
      return removeAdminTestimonial({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
        setDeleteId(null);
        setDeleteBlockers([]);
        toast.success('Deleted.');
        return;
      }
      setDeleteBlockers(blockerLines(result.details));
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
```

(a) After the queries, derive the rows: `const rows = filterByStatusSegment(testimonials ?? [], segment);` and `const deleteRow = testimonials?.find((row) => row.id === deleteId);` (full list). (b) `PageHeader`'s actions become:

```tsx
        actions={
          <>
            <StatusSegmented value={segment} onChange={setSegment} />
            <Button type='button' onClick={openCreate}>
              New testimonial
            </Button>
          </>
        }
```

(c) Both render maps (`testimonials.map`) switch to `rows.map`, and both action clusters gain `onDelete={() => setDeleteId(row.id)}`; `SortableContext`'s `items` switch to `rows.map((row) => row.id)`. (d) The drag's filtered-view law — replace `onDragEnd`'s body with exactly:

```tsx
  // A drop reorders the ONE rows array (array order is the display order),
  // then the order PUT fires with the FULL id list (TOTAL full-replace,
  // never a delta). Under a segment filter the slot-swap law applies (the
  // gallery precedent): invisible rows keep their slots, so a filtered
  // drag can never collide with positions held outside the filter.
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !testimonials) {
      return;
    }
    const globalIds = testimonials.map((row) => row.id);
    const reorderedIds = reorderVisiblePhotos(
      globalIds,
      rows.map((row) => row.id),
      String(active.id),
      String(over.id)
    );
    if (reorderedIds === globalIds) {
      return;
    }
    const byId = new Map(testimonials.map((row) => [row.id, row]));
    const reordered: Testimonial[] = [];
    for (const id of reorderedIds) {
      const row = byId.get(id);
      if (row !== undefined) {
        reordered.push(row);
      }
    }
    order.mutate(reordered);
  }
```

(e) Mount the dialog beside `DeactivateConfirm`:

```tsx
      {deleteRow ? (
        <DeleteGuardDialog
          name={deleteRow.person}
          blockers={deleteBlockers}
          pending={removeRow.isPending}
          open={deleteId === deleteRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteId(null);
              setDeleteBlockers([]);
            }
          }}
          onDelete={() => removeRow.mutate(deleteRow)}
        />
      ) : null}
```

- [ ] **Step 2: addons-screen.tsx**

Identical wiring with the addon names: `removeAdminAddon`; state trio; `const rows = filterByStatusSegment(addons ?? [], segment);` + `const deleteRow = addons?.find(...)`; PageHeader actions gain the segment; `toggleAll` selects the FILTERED rows — `setSelected(next ? new Set(rows.map((row) => row.id)) : new Set());`; every `addons.map` render loop switches to `rows.map` (both postures) and each `RowActionsCluster`/`RowIconActions` gains `onDelete={() => setDeleteId(row.id)}`; the mutation (exactly):

```tsx
  const removeRow = useMutation({
    mutationFn: async (row: AddonService) => {
      return removeAdminAddon({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminAddonQueries.all().queryKey });
        queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
        setDeleteId(null);
        setDeleteBlockers([]);
        toast.success('Deleted.');
        return;
      }
      setDeleteBlockers(blockerLines(result.details));
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
```

(both lists invalidate — the addon's service-matrix rows cascade with the delete, and the badges live on the services read). Dialog mount per Step 1(e) with `name={deleteRow.name}`. No `mediaNote`.

- [ ] **Step 3: branches-screen.tsx**

Same wiring: `removeAdminBranch`; the invalidation is `adminBranchQueries.all().queryKey` only; `toggleAll` over the filtered rows; renders switch to `rows.map`; dialog mount with `name={deleteRow.name}` and **`mediaNote='Its cover image goes with it.'`** (branches carry covers, M7 #214). The mutation body per Step 2's shape with the branch names.

- [ ] **Step 4: studio-services-screen.tsx**

Same wiring: `removeAdminStudioService`; invalidate `adminStudioServiceQueries.all().queryKey` + `adminBranchQueries.all().queryKey` (the branch matrix rows cascade); `toggleAll` over the filtered rows; renders switch to `rows.map`; dialog mount with `name={deleteRow.name}`. No `mediaNote`.

- [ ] **Step 5: lookups-screen.tsx (both sections)**

TWO independent wirings, one per section (the segment law covers both tabs). State (four variables, beside `confirmId`):

```tsx
  const [sizeSegment, setSizeSegment] = useState<StatusSegment>('all');
  const [attireSegment, setAttireSegment] = useState<StatusSegment>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
```

```tsx
  const removeSize = useMutation({
    mutationFn: async (row: PrintSize) => {
      return removeAdminPrintSize({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminLookupQueries.printSizes().queryKey });
        setDeleteId(null);
        setDeleteBlockers([]);
        toast.success('Deleted.');
        return;
      }
      setDeleteBlockers(blockerLines(result.details));
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeAttire = useMutation({
    mutationFn: async (row: Attire) => {
      return removeAdminAttire({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminLookupQueries.attires().queryKey });
        setDeleteId(null);
        setDeleteBlockers([]);
        toast.success('Deleted.');
        return;
      }
      setDeleteBlockers(blockerLines(result.details));
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
```

The sections take new props — `PrintSizesSection` gains `segment`, `onSegmentChange`, `onDelete`; `AttiresSection` the same. Each section's `CardAction` becomes:

```tsx
          <CardAction className='flex items-center gap-2'>
            <StatusSegmented value={segment} onChange={onSegmentChange} />
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              New print size
            </Button>
          </CardAction>
```

(attires: `New attire`, its own segment; the sections' new props are `segment: StatusSegment`, `onSegmentChange: (next: StatusSegment) => void`, `onDelete: (row: PrintSize | Attire) => void`). Inside each section the render derives `const rows = filterByStatusSegment(printSizes, segment);` (the prop is already `printSizes`/`attires`) and every `.map` + `RowActionsCluster`/`RowIconActions` switches to `rows` + gains `onDelete={() => onDelete(row)}`. The parent wires `segment={sizeSegment} onSegmentChange={setSizeSegment} onDelete={(row) => setDeleteId(row.id)}` (attires mirror) and mounts TWO dialogs (side by side with the two `DeactivateConfirm`s):

```tsx
      {confirmSize ? /* the existing DeactivateConfirm, unchanged */ : null}
      {deleteSize ? (
        <DeleteGuardDialog
          name={deleteSize.code}
          blockers={deleteBlockers}
          pending={removeSize.isPending}
          open={deleteId === deleteSize.id}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteId(null);
              setDeleteBlockers([]);
            }
          }}
          onDelete={() => removeSize.mutate(deleteSize)}
        />
      ) : null}
```

with `const deleteSize = printSizes?.find((row) => row.id === deleteId);` and `const deleteAttire = attires?.find((row) => row.id === deleteId);` beside the existing `confirmSize`/`confirmAttire` derives (attires mirror with `deleteAttire.name` + `removeAttire`). No `mediaNote` on either.

- [ ] **Step 6: bulk-bar.tsx — the palette candidates**

The reactivate button's `className='text-green-600'` (line ~143) becomes the AA-safe candidates; the `TODO(token-ruling)` comment STAYS until Task 8:

```tsx
            className='text-green-700 hover:text-green-700 dark:text-green-400 dark:hover:text-green-400'
```

- [ ] **Step 7: Gates + commit**

`pnpm --filter @sevendays/admin fix` → `test -- --run` (21/217 unchanged) → `typecheck`. Commit:

```bash
git add apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/components/addons/addons-screen.tsx apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/studio-services/studio-services-screen.tsx apps/admin/src/components/lookups/lookups-screen.tsx apps/admin/src/components/cms/bulk-bar.tsx
git commit -m "feat(admin): delete dialogs + the status segment on the five light-entity screens (#218)"
```

### Task 6: Gallery + packages — the grid/rail/table segments, the card/rail/row deletes, the editor vocabulary

The two non-uniform surfaces. Gallery: the grid toolbar gains the segment (composed AFTER the category filter — both filters narrow the view, the rail counts stay unfiltered), the photo card and the rail entry each gain a Trash2 action, and both entities get delete dialogs. Packages: the table gains the segment + row delete; the editor's Save button and both cover-upload buttons (package editor + branches sheet) upgrade to the full vocabulary.

**Files:**
- Modify: `apps/admin/src/components/gallery/gallery-screen.tsx`, `packages/packages-table.tsx`, `packages/package-editor.tsx`, `branches/branches-screen.tsx` (the cover button only)

**Interfaces:**
- Consumes: Task 2's `removeAdminGalleryPhoto`/`removeAdminGalleryCategory`/`removeAdminPackage`; Task 3's `StatusSegmented`/`DeleteGuardDialog`/`PendingSpinner`/`onDelete` slot; Task 1's `filterByStatusSegment`/`StatusSegment`/`blockerLines`/`SAVING_LABEL`/`UPLOADING_LABEL`.
- Produces: the last two of the eight segment surfaces (the gallery grid + the packages table); the last three of the nine entity delete dialogs (packages, gallery photos, gallery categories — completing testimonials/add-ons/branches/studio services/print sizes/attires from Task 5); the package editor's + both cover buttons' vocabulary.

**Not here:** the packages expanded row (#219 — the expand panel keeps today's description-only content); upload maturation (#220 — the tray, picker, and abort seam are untouched); the Submissions tab (Task 7).

- [ ] **Step 1: gallery-screen.tsx — the grid segment**

State beside `filter`:

```tsx
  // The grid's status segment (#218): composes AFTER the category filter;
  // the rail's counts stay unfiltered staff-truth totals.
  const [segment, setSegment] = useState<StatusSegment>('all');
```

The derived block becomes:

```tsx
  const inCategory = filter === 'all' ? photos : photos.filter((p) => p.categoryId === filter);
  const visiblePhotos = filterByStatusSegment(inCategory, segment);
```

(replacing the one-line `visiblePhotos`). The toolbar row (the bare `<h2>` at ~line 1197) becomes:

```tsx
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold tracking-tight'>{filterName}</h2>
            <StatusSegmented value={segment} onChange={setSegment} />
          </div>
```

- [ ] **Step 2: gallery-screen.tsx — the photo delete**

State + mutation beside `confirmId`:

```tsx
  const [photoDeleteId, setPhotoDeleteId] = useState<string | null>(null);
  const [photoDeleteBlockers, setPhotoDeleteBlockers] = useState<string[]>([]);
```

```tsx
  // The pending-guarded photo delete (#218): the image object goes with the
  // row per ADR-0019 §5 (the API's side); the dialog holds busy + stays
  // open on failure.
  const removePhoto = useMutation({
    mutationFn: async (row: GalleryPhoto) => {
      return removeAdminGalleryPhoto({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminGalleryQueries.photos().queryKey });
        setPhotoDeleteId(null);
        setPhotoDeleteBlockers([]);
        toast.success('Deleted.');
        return;
      }
      setPhotoDeleteBlockers(blockerLines(result.details));
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
```

`SortablePhotoCard` gains `onDelete: (id: string) => void` in its props + destructure, and its action cluster (top-right) gains the destructive Trash2 LAST, exactly:

```tsx
          <Button
            variant='ghost'
            size='icon-sm'
            type='button'
            aria-label='Delete'
            title='Delete'
            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
            onClick={(e) => {
              e.stopPropagation();
              onDelete(photo.id);
            }}
          >
            <Trash2 aria-hidden='true' />
          </Button>
```

(placed after the Deactivate/Reactivate pair; `Trash2` joins the lucide import). The call site passes `onDelete={setPhotoDeleteId}`, and the derive + mount land beside the existing `confirmPhoto`:

```tsx
  const deletePhoto = photos.find((p) => p.id === photoDeleteId);
```

```tsx
      {deletePhoto ? (
        <DeleteGuardDialog
          name={deletePhoto.title ?? 'Untitled photo'}
          mediaNote='Its image goes with it.'
          blockers={photoDeleteBlockers}
          pending={removePhoto.isPending}
          open={photoDeleteId === deletePhoto.id}
          onOpenChange={(open) => {
            if (!open) {
              setPhotoDeleteId(null);
              setPhotoDeleteBlockers([]);
            }
          }}
          onDelete={() => removePhoto.mutate(deletePhoto)}
        />
      ) : null}
```

- [ ] **Step 3: gallery-screen.tsx — the category delete (rail)**

Same shape: `categoryDeleteId`/`categoryDeleteBlockers` state; `removeCategory` mutation over `removeAdminGalleryCategory` invalidating `adminGalleryQueries.categories().queryKey` only (a deleted category holds no photos — the guard guarantees it); `const deleteCategory = categories.find((c) => c.id === categoryDeleteId);`; the rail entry's mini-actions (`SortableCategoryEntry`, desktop hover/mobile-visible cluster) gain the same Trash2 button wired `onDelete={() => onCategoryDelete(category.id)}` — a new prop threaded from `CategoryRail` → `setCategoryDeleteId` (the entry already takes `onDeactivate`/`onReactivate`; `onCategoryDelete` joins them, rendered after the Power/PowerOff pair); the dialog mounts with `name={deleteCategory.name}`, **no** `mediaNote` (categories carry no image).

- [ ] **Step 4: packages-table.tsx — the segment + the row delete**

State + derived + mutation inside `PackagesTable`:

```tsx
  // The toolbar segment (#218) + the pending-guarded delete (the #213
  // route; a package with any Appointment ever is blocked — the dialog
  // answers with the blockers in-body).
  const [segment, setSegment] = useState<StatusSegment>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  const rows = filterByStatusSegment(packages ?? [], segment);
  const deleteRow = packages?.find((row) => row.id === deleteId);

  const removeRow = useMutation({
    mutationFn: async (row: ServicePackageRead) => {
      return removeAdminPackage({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminPackageQueries.all().queryKey });
        setDeleteId(null);
        setDeleteBlockers([]);
        toast.success('Deleted.');
        return;
      }
      setDeleteBlockers(blockerLines(result.details));
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
```

The loaded-table branch renders a toolbar row above the Card:

```tsx
      <div className='flex justify-end'>
        <StatusSegmented value={segment} onChange={setSegment} />
      </div>
```

(the pending/error/empty postures render no segment — nothing to narrow). Both render maps switch `packages.map` → `rows.map`, and each `RowActionsCluster` gains `onDelete={() => setDeleteId(row.id)}`. The dialog mounts per Task 5's shape with `name={deleteRow.name}` + **`mediaNote='Its cover image goes with it.'`** (the cover key deletes with the row per ADR-0019 §5). Imports: `StatusSegmented`/`DeleteGuardDialog` from shared; `StatusSegment`/`filterByStatusSegment`; `blockerLines`; `removeAdminPackage`.

- [ ] **Step 5: package-editor.tsx — the vocabulary upgrades**

(a) The Save button (line ~724) becomes:

```tsx
          <Button type='button' disabled={savePending} aria-busy={savePending} onClick={saveChanges}>
            {savePending ? <PendingSpinner /> : null}
            {savePending ? SAVING_LABEL : 'Save changes'}
          </Button>
```

(b) The cover card's Upload button (line ~887) becomes:

```tsx
                <Button
                  variant='outline'
                  type='button'
                  disabled={uploading}
                  aria-busy={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <PendingSpinner /> : null}
                  {uploading ? UPLOADING_LABEL : 'Upload cover'}
                </Button>
```

(Remove cover keeps its plain `disabled={uploading}` — it is disabled-during, not the in-flight action.) Imports: `PendingSpinner` from `#/components/cms/shared`; `SAVING_LABEL`/`UPLOADING_LABEL` from `#/lib/save-contract`.

- [ ] **Step 6: branches-screen.tsx — the cover button's vocabulary**

The sheet's cover Upload button (line ~701, `disabled={coverUploading}`) gets the same treatment:

```tsx
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
```

(imports as Step 5; Remove cover stays plain-disabled).

- [ ] **Step 7: Gates + commit**

`pnpm --filter @sevendays/admin fix` → `test -- --run` (21/217 unchanged) → `typecheck`. Commit:

```bash
git add apps/admin/src/components/gallery/gallery-screen.tsx apps/admin/src/components/packages/packages-table.tsx apps/admin/src/components/packages/package-editor.tsx apps/admin/src/components/branches/branches-screen.tsx
git commit -m "feat(admin): gallery + packages - the grid/rail/table segments, card/rail/row deletes, the editor + cover pending vocabulary (#218)"
```

### Task 7: The Submissions tab (UI-bearing — skills + owner-reacted variants)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule) before composing. The Testimonials screen becomes two tabs — the published list (today's screen) and the Submissions queue (#216's moderation endpoints, first consumer). The queue: pending-first segment, per-row Accept (an edit-first sheet riding `LightEntityEditor`'s async contract)/Reject (a `GuardedConfirm`)/Delete (a `DeleteGuardDialog`), its own first-load skeleton, pending-guarded throughout.

**Files:**
- Create: `apps/admin/src/components/testimonials/submissions-tab.tsx`
- Modify: `apps/admin/src/components/testimonials/testimonials-screen.tsx`

**Interfaces:**
- Consumes: Task 2's `adminTestimonialSubmissionQueries` + `acceptAdminTestimonialSubmission`/`rejectAdminTestimonialSubmission`/`removeAdminTestimonialSubmission`; Task 3's `SegmentedControl`/`GuardedConfirm`/`DeleteGuardDialog`/`SubmissionStatusBadge`/`LightEntityEditor`/`PendingSpinner` + `QueryErrorState`/`QUERY_ERROR_LINE`/`EmptyState`; Task 1's `submissions-state` seams + `ACCEPTING_LABEL`/`REJECTING_LABEL`/`blockerLines`; `adminTestimonialQueries` (the accept invalidates the published list too).
- Produces: `SubmissionsTab()` — mounted by the testimonials screen under its `'submissions'` tab.

**Not here:** staff notifications (the queue IS the notification); a status query param on the API (client-side segment per #216's plan); Turnstile; any landing surface.

- [ ] **Step 1: Write `submissions-tab.tsx`**

Create `apps/admin/src/components/testimonials/submissions-tab.tsx` with exactly:

```tsx
// The Submissions tab (M7 #218 over #216's moderation endpoints): the
// pending queue on the Testimonials screen — a stop on an existing screen,
// not a new place to remember. Pending-guarded accept-with-edit (the
// accept sheet rides LightEntityEditor's async Save contract, saveLabel
// 'Accept' — busy 'Accepting…'), reject-retains (GuardedConfirm), and
// delete-any-status (DeleteGuardDialog — a submission references nothing,
// so blockers never arrive). The tab's own status segment defaults to
// Pending: the queue IS the work. The list renders newest-first as the API
// serves it; no reordering exists here.
import type { TestimonialSubmission } from '@sevendays/types';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Field, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import { Textarea } from '@sevendays/ui/components/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import {
  DeleteGuardDialog,
  EmptyState,
  GuardedConfirm,
  LightEntityEditor,
  QUERY_ERROR_LINE,
  QueryErrorState,
  SegmentedControl,
  SubmissionStatusBadge,
} from '#/components/cms/shared';
import {
  acceptAdminTestimonialSubmission,
  rejectAdminTestimonialSubmission,
  removeAdminTestimonialSubmission,
} from '#/lib/admin.functions';
import { adminTestimonialQueries, adminTestimonialSubmissionQueries } from '#/lib/cms-queries';
import {
  ACCEPTING_LABEL,
  REJECTING_LABEL,
  blockerLines,
} from '#/lib/save-contract';
import {
  SUBMISSION_SEGMENTS,
  acceptEditStateFromSubmission,
  buildAcceptPayload,
  filterSubmissions,
  submittedOn,
  validateAcceptEdit,
} from '#/lib/submissions-state';
import type { AcceptEditState, SubmissionSegment } from '#/lib/submissions-state';

/** The pending posture's fixed four rows — stable keys, never reordered. */
const PENDING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'];

export function SubmissionsTab() {
  const {
    data: submissions,
    isPending,
    isError,
    refetch,
  } = useQuery(adminTestimonialSubmissionQueries.all());
  const queryClient = useQueryClient();
  // Pending leads — the moderation queue's default view.
  const [segment, setSegment] = useState<SubmissionSegment>('pending');
  // The three actions' targets (one dialog/sheet at a time — uuid ids never
  // collide).
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  // The accept sheet's field state + inline errors (the async Save contract
  // holds the sheet open on a failed accept — state intact, retry safe).
  // The empty seed only holds between mounts — opening a row re-seeds.
  const [acceptState, setAcceptState] = useState<AcceptEditState>({ quote: '', person: '' });
  const [acceptErrors, setAcceptErrors] = useState<{ quote?: string; person?: string }>({});
  const quoteId = useId();
  const personId = useId();

  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: adminTestimonialSubmissionQueries.all().queryKey });
    queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
  };

  // Accept-with-edit: pending-guarded via the sheet's own contract (Save is
  // 'Accept', busy 'Accepting…'); success appends the Testimonial at the
  // end of render order (the API's transaction) and closes.
  const accept = useMutation({
    mutationFn: async (input: { row: TestimonialSubmission; state: AcceptEditState }) => {
      return acceptAdminTestimonialSubmission({
        data: { id: input.row.id, payload: buildAcceptPayload(input.state) },
      });
    },
  });

  // Reject-retains: pending-guarded confirm; the row stays as rejected.
  const reject = useMutation({
    mutationFn: async (row: TestimonialSubmission) => {
      return rejectAdminTestimonialSubmission({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      invalidateBoth();
      if (result.ok) {
        setRejectId(null);
        toast.success('Rejected.');
        return;
      }
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete-any-status: 204; a submission references nothing.
  const remove = useMutation({
    mutationFn: async (row: TestimonialSubmission) => {
      return removeAdminTestimonialSubmission({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      invalidateBoth();
      if (result.ok) {
        setDeleteId(null);
        setDeleteBlockers([]);
        toast.success('Deleted.');
        return;
      }
      setDeleteBlockers(blockerLines(result.details));
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  async function handleAccept(): Promise<boolean> {
    const row = submissions?.find((candidate) => candidate.id === acceptingId);
    if (!row) {
      return false;
    }
    const errors = validateAcceptEdit(acceptState);
    if (errors.quote || errors.person) {
      setAcceptErrors(errors);
      toast.error('Fix the highlighted fields.');
      return false;
    }
    setAcceptErrors({});
    try {
      const result = await accept.mutateAsync({ row, state: acceptState });
      if (result.ok) {
        invalidateBoth();
        toast.success('Accepted.');
        return true;
      }
      toast.error(result.message);
      return false;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The save failed.');
      return false;
    }
  }

  const rows = filterSubmissions(submissions ?? [], segment);
  const acceptingRow = submissions?.find((candidate) => candidate.id === acceptingId);
  const rejectRow = submissions?.find((candidate) => candidate.id === rejectId);
  const deleteRow = submissions?.find((candidate) => candidate.id === deleteId);

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items) */}
        <p className='text-muted-foreground text-sm'>
          Stories customers sent from the site. Accepting publishes them as testimonials.
        </p>
        <SegmentedControl
          options={SUBMISSION_SEGMENTS}
          value={segment}
          onChange={setSegment}
          ariaLabel='Submission status'
        />
      </div>

      {isError ? (
        <QueryErrorState
          line={QUERY_ERROR_LINE}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : isPending || !submissions ? (
        // Pending posture: skeleton rows echoing the queue's anatomy (quote
        // + person, badge, actions) — first load only.
        <Card className='rounded-lg'>
          <CardContent className='space-y-4'>
            {PENDING_ROW_KEYS.map((key) => (
              <div key={key} className='flex items-center gap-4 py-1'>
                <div className='flex-1 space-y-1.5'>
                  <Skeleton className='h-4 w-2/3' />
                  <Skeleton className='h-3 w-1/3' />
                </div>
                <Skeleton className='h-5 w-20' />
                <Skeleton className='h-8 w-48' />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        // TODO(owner-copy): unplanned strings awaiting the owner's ratification (#134 open items)
        <EmptyState
          line={
            submissions.length === 0
              ? 'No submissions yet.'
              : segment === 'pending'
                ? 'No pending submissions.'
                : segment === 'accepted'
                  ? 'No accepted submissions.'
                  : 'No rejected submissions.'
          }
        />
      ) : (
        <Card className='rounded-lg'>
          <CardContent className='space-y-4'>
            {rows.map((row) => (
              <div
                key={row.id}
                className='border-border flex flex-wrap items-start justify-between gap-3 border-b py-3 first:pt-0 last:border-b-0 last:pb-0'
              >
                <div className='min-w-0 max-w-2xl space-y-1'>
                  <p className='line-clamp-2 text-sm'>{row.quote}</p>
                  <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                    <span className='font-medium'>{row.person}</span>
                    <span aria-hidden='true'>·</span>
                    <span>{submittedOn(row)}</span>
                  </div>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <SubmissionStatusBadge status={row.status} />
                  {row.status === 'pending' ? (
                    <>
                      <Button
                        variant='outline'
                        size='sm'
                        type='button'
                        onClick={() => {
                          setAcceptState(acceptEditStateFromSubmission(row));
                          setAcceptErrors({});
                          setAcceptingId(row.id);
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        type='button'
                        className='text-destructive'
                        onClick={() => setRejectId(row.id)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    type='button'
                    aria-label='Delete'
                    className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                    onClick={() => setDeleteId(row.id)}
                  >
                    <Trash2 aria-hidden='true' />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {acceptingRow ? (
        <LightEntityEditor
          title='Accept submission'
          description='Fix or trim the words first if needed — accepting publishes it as a testimonial at the end of the list.'
          open={acceptingId === acceptingRow.id}
          onOpenChange={(next) => {
            if (!next) {
              setAcceptingId(null);
            }
          }}
          onSave={handleAccept}
          saveLabel='Accept'
        >
          <Field>
            <FieldLabel htmlFor={quoteId}>Quote</FieldLabel>
            <Textarea
              id={quoteId}
              rows={4}
              value={acceptState.quote}
              onChange={(e) => setAcceptState((prev) => ({ ...prev, quote: e.target.value }))}
            />
            {acceptErrors.quote ? (
              <p className='text-destructive text-xs'>{acceptErrors.quote}</p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={personId}>Person</FieldLabel>
            <Input
              id={personId}
              value={acceptState.person}
              onChange={(e) => setAcceptState((prev) => ({ ...prev, person: e.target.value }))}
            />
            {acceptErrors.person ? (
              <p className='text-destructive text-xs'>{acceptErrors.person}</p>
            ) : null}
          </Field>
        </LightEntityEditor>
      ) : null}

      {rejectRow ? (
        <GuardedConfirm
          title='Reject this submission?'
          description='The submission stays on record as rejected — nothing publishes, and the sender is never told.'
          confirmLabel='Reject'
          busyLabel={REJECTING_LABEL}
          pending={reject.isPending}
          blockers={[]}
          open={rejectId === rejectRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setRejectId(null);
            }
          }}
          onConfirm={() => reject.mutate(rejectRow)}
        />
      ) : null}

      {deleteRow ? (
        <DeleteGuardDialog
          name={deleteRow.person}
          blockers={deleteBlockers}
          pending={remove.isPending}
          open={deleteId === deleteRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteId(null);
              setDeleteBlockers([]);
            }
          }}
          onDelete={() => remove.mutate(deleteRow)}
        />
      ) : null}
    </div>
  );
}
```

Notes: (a) the `LightEntityEditor`'s busy Save label is `SAVING_LABEL` by contract — the sheet shows 'Saving…' over the 'Accept' label while in flight; `ACCEPTING_LABEL` is therefore consumed only by the owner-copy round (if the owner rules the accept-specific label, swap the shell to accept a `busyLabel` prop in the retune commit — do NOT widen the component speculatively now). (b) the accept sheet's `description` and the two confirm descriptions carry `TODO(owner-copy)` per the convention — the fenced strings are the proposals the round ratifies or retunes. (c) `PENDING_ROW_KEYS` is this file's own local (the other screens' constants are module-private to theirs).

- [ ] **Step 2: Wire the tab switch into `testimonials-screen.tsx`**

(a) Import `SubmissionsTab`. (b) Add state beside `expandedId`:

```tsx
  // The screen's two tabs (#218): the published list and the moderation
  // queue — local state, no routes (the queue is a stop on an existing
  // screen, not a new place to remember).
  const [tab, setTab] = useState<'testimonials' | 'submissions'>('testimonials');
```

(c) Below the `PageHeader`, render the switch (the `SegmentedControl` recipe over two options):

```tsx
      <SegmentedControl
        options={[
          { value: 'testimonials', label: 'Testimonials' },
          { value: 'submissions', label: 'Submissions' },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel='Testimonials sections'
      />
```

(d) The `PageHeader`'s `actions` render only on the testimonials tab — wrap the existing fragment: `actions={tab === 'testimonials' ? (<> …the segment + New button from Task 5… </>) : undefined}`. (e) Wrap the list block (the error/pending/empty/table chain) in `{tab === 'testimonials' ? ( … ) : <SubmissionsTab />}` — the sheet, the `DeactivateConfirm`, and the delete dialog from Task 5 stay mounted OUTSIDE the switch (their targets live on the published list; they can never be open while the submissions tab shows).

- [ ] **Step 3: Gates + commit**

`pnpm --filter @sevendays/admin fix` → `test -- --run` (21/217 unchanged) → `typecheck`. Commit:

```bash
git add apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/components/testimonials/submissions-tab.tsx
git commit -m "feat(admin): the Submissions tab - pending-guarded accept-with-edit, reject-retains, delete-any-status (#218)"
```

- [ ] **Step 4: The owner-reacted variants round (controller interaction)**

Run the admin dev server (`pnpm --filter @sevendays/admin dev`), seed a spread of states (at least: one pending + one accepted + one rejected submission via the public POST or directly against the compose DB; a mixed active/deactivated list on two screens), and capture BOTH themes (the topbar toggle) of: the Submissions tab (each segment), the accept sheet (idle + the inline-error state), the reject + delete confirms, the status segment on two toolbars (one table + the gallery grid), a delete dialog with blockers in-body (force one: attempt a delete on a history-bearing row, e.g. any branch — every seeded branch carries appointments), and the palette sites (status dots, reactivate icons, bulk bar). Save to the evidence dir, present to the owner, record the rulings. If any copy/class retunes, apply them in this task's follow-up commit (the `TODO(owner-copy)`/`TODO(token-ruling)` markers stay for Task 8's palette retirement — copy markers retire HERE as ruled).

### Task 8: The status palette settles + the loads verification sweep

The ticket's fourth AC: "the status palette owner-reacted via rendered variants, both themes." The palette surfaces rendered in Task 7's round; this task retires the markers as ruled and mechanically verifies the loads law.

**Files:**
- Modify (only if the round retunes): `apps/admin/src/components/cms/shared.tsx`, `cms/bulk-bar.tsx` (palette class strings; the `TODO(token-ruling)` comments)

**Interfaces:** none new — verification + string-level retunes only.

**Not here:** the six card-radius `TODO(token-ruling)` comments (a different ruling, not this ticket's); `scripts/measure-theme-pairs.mjs` (it gates tokens.css pairs — the palette rides tailwind palette classes, no script change); any packages/ui token additions (the palette stays app-side per the M3 ruling that flagged these sites).

- [ ] **Step 1: Retire the palette markers**

With the owner's Task-7-round rulings in hand: (a) apply any retuned class strings at the three palette sites (`shared.tsx`'s `StatusBadge` dot + reactivate icon, `bulk-bar.tsx`'s reactivate) and the `SUBMISSION_STATUS_META` table; (b) replace each of the three palette `TODO(token-ruling)` comments with exactly this shape (dated with the round's date):

```tsx
            // Status palette (owner-reacted 2026-10-XX, #218's variants round): the ruled families — never promote into packages/ui.
```

(c) if any candidate was swapped for a non-measured class on INTERACTIVE text (the reactivate buttons), re-measure before committing:

```bash
node -e "function lum(h){const c=h.replace('#','');const[r,g,b]=[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return .2126*r+.7152*g+.0722*b}console.log((([l1,l2])=>((l1+.05)/(l2+.05)).toFixed(2))([lum('#HEXFG'),lum('#HEXBG')].sort((a,b)=>b-a)))"
```

Expected: ≥ 4.5 against `#ffffff` (light leg) and `#1b1e22` (dark leg). The pre-measured candidates: `#15803d` 5.02 / `#4ade80` 9.60 ✓✓.

- [ ] **Step 2: The loads verification sweep (runnable, not prose)**

For each of the seven screens + the Submissions tab, verify in the running dev server: (a) first load renders the skeleton echoing the row anatomy; (b) after ANY save/flip/delete (which invalidates + refetches), the list does NOT flash the skeleton — `isPending` stays false while data exists; (c) the gallery thumb boxes are `bg-muted` with `loading='lazy'` and no per-card image skeleton appears; (d) the tray still speaks its own status copy. Record a per-screen ✓ line in the evidence dir. If any screen flashes, that is a defect to fix HERE (the only lawful cause would be a `data === undefined` reset somewhere — none exists on disk as of `8bed7f2`).

- [ ] **Step 3: Gates + commit**

`pnpm --filter @sevendays/admin fix` → `test -- --run` (21/217) → `typecheck`. Commit (skip if the round changed nothing — then fold Step 2's evidence into Task 9):

```bash
git add apps/admin/src/components/cms/shared.tsx apps/admin/src/components/cms/bulk-bar.tsx
git commit -m "chore(admin): the status palette settled - both themes, the TODO(token-ruling) markers retired (#218)"
```

### Task 9: Gates, docs rotation, PR, v1 pick, issue close, graphify

- [ ] **Step 1: The full check**

`pnpm check` (lint + format + typecheck + test across the repo — green; the only touched package is admin, everything else is floor-unchanged: types 17/167, api 31 files 422+3, api-client 5/45, landing 10/92, admin **21/217**).

- [ ] **Step 2: `docs/plan.md` — THREE boxes tick (pinned edits)**

(a) The interaction-system box (which carries no annotation yet) flips to `- [✅]` and gains this annotation appended at its line's end:

```text
 _(2026-10-XX, #218: the async Save contract live on all seven sheets + the Submissions tab (the editorNonce/keepEditorOpen machinery deleted, grep-proven), the pending vocabulary on every write/upload/delete affordance incl. the package editor + both cover buttons, delete dialogs with blockers in-body on all nine entities over the #213 routes, the All/Active/Deactivated segment on all eight list surfaces (the gallery grid included, default All per visit, counts unfiltered), the Submissions tab live over #216's endpoints (accept-with-edit / reject-retains / delete-any-status, pending-guarded), the status palette owner-reacted in both themes, and the loads law verified — first-load-only skeletons, muted media boxes, no refetch flash)_
```

(b) The guarded-DELETE box flips to `- [✅]`; its existing annotation (which ends "— the shared checkbox") gains, replacing that closing phrase: `the shared checkbox closed 2026-10-XX, #218: the CMS half landed — the delete dialogs on all nine screens, pending-guarded, blockers in-body.`

(c) The public-testimonial-form box flips to `- [✅]`; its existing annotation's closing clause "the box waits for #218's Submissions tab." becomes `the box closed 2026-10-XX, #218: the Submissions tab seated on the Testimonials screen.`

- [ ] **Step 3: `docs/progress.md` + `AGENTS.md`**

(a) progress.md gains a dated entry narrating: the contract + vocabulary + dialogs + segments + tab, the palette round's outcome, the grep gate, and the floors (admin 21/217). (b) AGENTS.md: in *Current status of `pnpm test`*, the admin sentence's floor becomes **"admin floor 21 files / 217 tests"** with the three new seam suites named (save-contract, status-segment, submissions-state); in the Engineering Rules block, the testimonial-form paragraph's "the Submissions tab rides #218" clause becomes "the Submissions tab is live (M7 #218: accept-with-edit/reject/delete pending-guarded on the Testimonials screen)"; append one sentence to that paragraph's end or the dark-mode paragraph's neighborhood recording the interaction system: "The CMS interaction system is live (M7 #218): the async sheet-Save contract (close-only-on-success) with the nonce machinery deleted, one pending vocabulary, guarded delete dialogs with in-body blockers on all nine entities, the All/Active/Deactivated segment on every list, and the status palette settled both themes."

- [ ] **Step 4: PR + squash merge**

Push `feat/218-cms-interaction-system`; open the PR against main titled `The CMS-wide interaction system — async Save, pending vocabulary, segments, delete dialogs, the Submissions tab (#218)`; body: the four ACs each answered with the evidence pointer (contract suite + grep gate; the law table; the nine dialogs; the segment list + the palette round). Squash-merge.

- [ ] **Step 5: The v1 pick (pre-ruled PICK clean)**

Per the spec's class ledger ("CMS UX system … **PICK clean** — Admin surfaces exist on both editions; the Submissions tab lands on both") and `docs/agents/v1-picks.md`: run the classifier over the squash commit — every code path this ticket touches is `apps/admin/**` (both editions carry the admin verbatim), so the expected verdict is **pick** with zero content-drops; the docs files (`docs/**`, `AGENTS.md`, `graphify-out/`) are main-only per the runbook and never pick. Append the ledger row (date, PR #, main SHA, `pick`, v1 SHA, the one-line summary: "#218 — M7 ticket 07, the CMS-wide interaction system: the async Save contract (nonce machinery deleted, grep-proven), the pending vocabulary, guarded delete dialogs with in-body blockers on all nine, the All/Active/Deactivated segment everywhere, the Submissions tab over #216, the palette settled both themes"). Commit the ledger on main.

- [ ] **Step 6: Issue close + graphify**

Close #218 with a comment mapping each AC to its evidence (the contract suite, the grep gate, the nine dialogs, the eight segments, the palette round). Then `graphify update .` and commit the graph churn (`chore(graphify): post-#218 graph update (code modified: the CMS interaction surface across admin)`).




