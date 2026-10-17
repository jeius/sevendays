# M7 Ticket 09 — Upload UI Maturation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Task 2 is UI-bearing and loads the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule, spec #94 amendment): Task 2 composes the drop zone, the tray's Cancel affordance, and the leave-guard dialog. **Task 3 renders the round for owner reaction in BOTH themes and proves the leaving guard for BOTH navigation classes** (the ticket's second and third ACs). Task 3's round is the only controller interaction inside the build; everything else runs to the gates.

**Goal:** Big batches aren't hostage to one mistap (ticket #220, spec § *CMS UX maturation — the system*, the #165 pre-named upload ticket; absorbs #152's upload-cancellation item): **drag-and-drop onto the gallery grid** (the picker stays exactly as it is), a **whole-run Cancel for in-flight uploads** over the pool's new abort seam, and a **leaving-mid-upload confirmation** while uploads are unsettled — an in-app navigation block (router-blocker dialog, "Leave anyway") + the browser `beforeunload` class. Out of scope (ruled): pre-commit metadata editing (title-from-filename stands), per-card image skeletons. Theme-aware throughout; the #170 accept/cap quick win already landed.

**Architecture:** Four tasks, admin-only code (zero api / api-client / types / db / landing changes): (1) the lib seams, TDD — the pool's abort law in `lib/batch-photo-upload.ts` (`runBatchUpload` gains an optional `AbortSignal`; a new `{ phase: 'canceled' }` terminal status; **cancel settles every unsettled item canceled, never a retry — the pre-#220 pool classed the XHR abort-reject as `transient` and would have RETRIED a canceled upload, the trap this ticket closes**), the tray/leave-guard predicates (`hasUnsettledUploads` + `trayIsVisible`, same file), and the shared enqueue + file-drag gate in `lib/gallery-state.ts` (`batchItemsFromFiles` + `isFileDrag` — the picker and the drop zone route through ONE mapping so the two can never drift) — +11 its (admin floor 23 files / 229 tests → **23 files / 240 tests**); (2) the screen wiring — `gallery-screen.tsx` gains the drop zone with its armed overlay, per-run `AbortController`s + the tray Cancel button (Done disabled while unsettled — clearing mid-flight would orphan the pool and drop the leave-guard), and the guard itself (`useBlocker` with `withResolver: true` + the house `GuardedConfirm`, Leave-anyway aborts then proceeds); `cms/shared.tsx` gains one additive optional `cancelLabel` prop (default `'Cancel'`) so the leave dialog's stay-side reads "Stay"; (3) the owner-reacted variants round both themes + the live both-classes proof of the leaving guard; (4) gates + docs rotation — this ticket ticks exactly **one** `docs/plan.md` M7 box (its own), comments the #152 absorption, then the PR, the pre-ruled **PICK clean** v1 pick, the issue close, and `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes, zero migrations, zero api/types/api-client/landing work — `@tanstack/react-router` **1.170.41** (probed live against the installed dist this session: `useBlocker` is exported with the current `UseBlockerOpts` shape — `{ shouldBlockFn, enableBeforeUnload?: boolean | (() => boolean), disabled?, withResolver? }`; `withResolver: true` returns the `BlockerResolver` union `{ status: 'blocked'; proceed: () => void; reset: () => void } | { status: 'idle'; proceed: undefined; reset: undefined }`), `@tanstack/history` **1.162.1** (probed: the blocker's `enableBeforeUnload` is evaluated per event inside the history `beforeunload` listener — `e.preventDefault(); e.returnValue = ''` → the native browser prompt), lucide-react **1.37.0** (no new icons — `ImagePlus` is reused by the overlay), `GuardedConfirm` from `#/components/cms/shared` (the #218 motion-recipe confirm), vitest **4.1.11** plain-node (the admin lib-seam posture — no component/DOM tests; `vi.waitFor` available; the suite already constructs `File` in-node, and `AbortController`/`crypto.randomUUID` are Node 26 globals), pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#220 "M7 ticket 09: upload UI maturation — drag-and-drop, cancel, leave-confirm"](https://github.com/jeius/sevendays/issues/220), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *CMS UX maturation — the system* pins the ruling verbatim: "Upload UI (NI-4): drag-and-drop onto the grid (picker stays) · cancel for in-flight uploads (the abort seam exists) · a leaving-mid-upload confirmation while uploads are unsettled (in-app navigation block + `beforeunload`, with 'Leave anyway'). Out: pre-commit metadata editing (title-from-filename stands)"; User Story 49 is its acceptance — "drag-and-drop onto the gallery grid (the picker stays), a cancel button for in-flight uploads, and a leaving-mid-upload confirmation, so big batches aren't hostage to one mistap"; § *Testing Decisions* pins the admin lib-seam posture; § *v1-pick classes* pre-rules this payload **PICK clean** — the CMS UX system row: "interaction ticket, expanded row, upload UI — Admin surfaces exist on both editions"). The ticket's three acceptance criteria, verbatim: Drag-and-drop + cancel + leave-confirm wired; the picker unchanged · The leaving-guard proven for both navigation classes (in-app route + browser unload) · Owner-reacted rendered variants, both themes. Key recon facts (2026-10-17, main `c9c6852` — post-#219; every file below read this session):

- **The pool today (`lib/batch-photo-upload.ts`, read whole):** `runBatchUpload(items, deps)` drains a shared queue with `BATCH_CONCURRENCY = 4` workers; per item: first-attempt `preCheckFile` (type/`50 * 1024 * 1024` cap) → `presign` → `put` (progress → `uploading`) → `commit` (ok → `done`; 400 → `permanent`; else `transient`); only `transient` consumes one of `MAX_UPLOAD_ATTEMPTS = 2`. **No signal exists anywhere.** `putFileToPresignedUrl` (the injected XHR) already has `xhr.onabort = () => reject(new Error('Upload canceled.'))` — the "existing abort seam" the ticket names — but nothing ever calls `xhr.abort()`, and the pool maps that reject to **`transient` → auto-retry** (#152 pinned the abort-reject semantics via #143's seam tests; the retry-class map is the pool's one `PutUploadError`/else split at the put catch). Wiring a naive signal would make Cancel RE-UPLOAD — the abort law in Task 1 is the ticket's load-bearing change.
- **The screen today (`components/gallery/gallery-screen.tsx`, read whole, 1518 lines):** the hidden `<input id='gallery-upload-input'>` (JPG-only `accept`, #170) is opened by the route's `Upload photos` label (`routes/_shell.gallery.tsx` — the `label`/`htmlFor` pair, zero route logic) and by the empty state's button; `onFilesChosen` maps files → `BatchItem[]` inline (`crypto.randomUUID()`, `titleFromFileName`, `caption: null`, `categoryId: filter === 'all' ? null : filter` — AR-11) and calls `runThroughPool(items)`; `retryItem`/`retryFailed` start SEPARATE pool runs; `clearTray` (the tray's Done) clears unconditionally — even mid-flight, which would orphan the running pool and silently drop `hasUnsettled` (a pre-existing hazard this ticket's guard makes unacceptable — Task 2 disables Done while unsettled); `hasUnsettled`/`hasFailure`/`trayVisible` are inline derivations; the tray (`UploadTray`) shows per-row filename/Progress/status text with per-row `Retry` (transient only), `Retry failed`, `Done`. The grid is a dnd-kit `DndContext`/`SortableContext` over pointer/touch/keyboard sensors — **pointer-based, never an HTML5 drag, so `dataTransfer.types` never carries `'Files'` from it**: the drop zone and the sortable grid cannot interfere by construction (pinned as `isFileDrag` law).
- **`useBlocker` mechanics (probed in the installed `useBlocker.js`):** the object-opts form `{ shouldBlockFn, enableBeforeUnload, withResolver: true }` registers one `history.block`; on a router navigation where `shouldBlockFn` returns true, the resolver state flips to `{ status: 'blocked', proceed, reset }` and the navigation AWAITS the promise — `proceed()` resolves it false (navigate), `reset()` resolves it true (stay); `enableBeforeUnload` (boolean or fn) feeds the same registration's native `beforeunload` handling. The effect re-subscribes when `shouldBlockFn`/`enableBeforeUnload` identity changes — pass `useCallback`-stabilized fns keyed on `hasUnsettled` so it re-subscribes only when unsettled-ness flips, not per status tick.
- **The house dialog for the leave confirm:** `GuardedConfirm` (`cms/shared.tsx:573`, M7 #218) — DeactivateConfirm's motion recipe (visible latch + `AnimatePresence` exit + the mobile dock) over a pending-guarded confirm; props `{ title, description, confirmLabel, busyLabel, pending, blockers, open, onOpenChange, onConfirm }`; `AlertDialogCancel` is hardcoded `Cancel`. One additive optional `cancelLabel = 'Cancel'` prop (Task 2, pinned) lets the leave dialog's stay-side read `Stay` without touching any other call site. The leave dialog is never pending (`pending={false}` — leaving is instant); its confirm is destructive-weight by the existing `variant='destructive'`, which fits "Leave anyway" (it cancels uploads).
- **Sibling fences (spec § Sequencing; the tickets' own bodies; #218's plan fenced this ticket the same way):** NOT here, regardless of temptation: **pre-commit metadata editing** (title-from-filename + category-at-enqueue stand — ruled out in the spec); **per-card image skeletons** (muted box + lazy-load stands); **per-item cancel** (the ruled affordance is ONE cancel button for in-flight uploads — whole-run); **drop-on-rail-category assignment** (AR-11 rules category = the OPEN rail filter at enqueue; dropping onto a specific category tile to assign it is not ruled); **the cover path** (`lib/cover-upload.ts` untouched — #152's "cover + batch XHR paths" wording predates the M7 ruling, and the spec's ruled scope is the gallery grid/tray; a cover upload is a single-file sheet-internal action already carried by #218's `Uploading…` pending vocabulary); **#152's other items** (position race, the Zod `.default` fence, the API suite debt — this ticket absorbs ONLY the upload-cancellation item); **Settings tabs + forgot-password** — #221; **the Resend/sending-domain work** — #222; **the landing redesign** — #223/#224 (zero landing files); **any API/types/db change** — there is none to make.
- **The one `docs/plan.md` box this ticket ticks (Task 4):** `docs/plan.md:178` — `- [ ] Admin — upload UI maturation (#165): drag-and-drop onto the grid (picker stays), in-flight cancel over the abort seam, leaving-mid-upload confirmation (in-app navigation block + `beforeunload`); absorbs #152's upload-cancellation item` — flips to `- [✅]` with a dated annotation. Nothing else in the M7 block changes; the milestone-level "Verify: owner-accepted rendered variants" box stays unticked until the close-out ticket (#225) — this ticket's round is evidence toward it, not the tick. #152's checkbox is NOT ticked (its wording says "cover + batch XHR paths"; this ticket lands the batch half) — Task 4 leaves a dated comment on #152 instead.
- **Baselines (live, per AGENTS.md post-#219):** types 17 files / 167 tests; api 30 passed + 1 skipped files (31) / 422 passed + 3 skipped; api-client 5 files / 45 tests; **admin 23 files / 229 tests** (batch-photo-upload.test.ts holds 10 its, gallery-state.test.ts 9); landing 10 files / 92 tests; db 4 files. After Task 1: **admin 23 files / 240 tests** (+11 its: the abort law 6, the tray/guard predicates 3, the enqueue/file-drag gate 2 — no new FILES, both suites extend). Every other package's floor is untouched. (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)

## Global Constraints

- **Branch & baseline:** `feat/220-upload-ui-maturation` off main `c9c6852` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#220)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, grep-gate output, variants screenshots, the both-classes guard proofs, the owner's rulings) lands in gitignored `.superpowers/sdd/2026-10-17-220-upload-ui-maturation/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs** (react-router/history/lucide/GuardedConfirm all installed). Every task commits only with the checks green **for the packages it touched** (this ticket touches only `apps/admin` + docs): `pnpm --filter @sevendays/admin fix` BEFORE committing (accept its rewrites) → `test -- --run` → `typecheck`. Task 2 additionally runs `pnpm --filter @sevendays/admin build` (the #218 execution ruling: the production build is part of the per-task checks whenever the screen's module graph gains an import). Never stage `graphify-out/` churn (dirty graph files are expected, per AGENTS.md). Never commit secrets. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file, `docs/plan.md`, and issue bodies alike). Run `graphify update .` at close (Task 4 — code was modified).
- **The zero-API law (binding):** only `apps/admin/src/**` and docs files change. No route, no wrapper, no schema, no migration, no seed edit, no `packages/` source change. If a task seems to need one, stop — the wire is already right.
- **The cancel law (binding, the ticket's core semantics):** an abort (the `AbortSignal` passed to `runBatchUpload`) settles every unsettled item `{ phase: 'canceled' }` — **never a retry, never a failure**; no new network call starts after the abort (checks at attempt start and after every awaited hop); **nothing canceled is promoted** (an abort after the PUT still cancels — the staged object is the `tmp/` lifecycle GC's); **a commit already in flight completes and its verdict stands** (done stays done); the settlement guarantee extends — every item ends `done | failed | canceled` exactly once; the return grows `canceled: BatchItem[]` (existing `{ done, failed }` destructuring is unaffected). The signal reaches the wire through `BatchUploadDeps.put`'s new optional 4th param (`signal?: AbortSignal`) — existing 3-param stubs stay type-compatible.
- **The enqueue law (binding, AR-11):** ONE seam — `batchItemsFromFiles(files, categoryId)` in `gallery-state.ts` — maps files to staged items for BOTH the picker and the drop zone (category = the open rail filter resolved by the caller, `filter === 'all' ? null : filter`; title = file name minus its LAST extension; `caption: null`; fresh `crypto.randomUUID()` per item). Dropped non-JPG/oversized files ride the SAME courtesy pre-check the picker's `accept` approximates — the pool's `pre-check` failure row is the answer, never a drop-side filter.
- **The drag law (binding):** only drags whose `dataTransfer.types` include `'Files'` arm the zone (`isFileDrag`) — dnd-kit's pointer/touch/keyboard drags never start an HTML5 drag and text drags carry no `'Files'`, so the sortable grid and the drop zone cannot interfere by construction. `dragenter`/`dragleave` ride a depth counter (child elements churn the pair); `dragover` preventDefaults + `dropEffect = 'copy'`; drop resets the counter, disarms, and enqueues.
- **The leave-guard law (binding):** BOTH navigation classes consume ONE predicate — `hasUnsettledUploads(items, statuses)` (`undefined`/`queued`/`uploading`/`committing` are unsettled; `done`/`failed`/`canceled` are terminal). In-app: `useBlocker({ shouldBlockFn, enableBeforeUnload, withResolver: true })` + the house `GuardedConfirm` — open exactly when `blocker.status === 'blocked'`; **"Leave anyway" aborts every active run THEN proceeds** (leaving is never a leak); the stay side (`cancelLabel='Stay'`) resets. Browser: the same registration's `enableBeforeUnload` answers the native `beforeunload` prompt. `Done` is disabled while anything is unsettled — clearing mid-flight would orphan the running pool and silently drop the guard.
- **The picker law (binding):** the hidden input, its `id='gallery-upload-input'`, its JPG-only `accept`, the route's `label`/`htmlFor` pair, and the `JPG files up to 50 MiB.` cap line are untouched — the picker keeps working verbatim beside the drop zone (the ticket's "the picker unchanged" is an acceptance criterion, re-verified in Task 3).
- **Copy law:** every string the executor must produce lands verbatim in this plan's fenced blocks. New unrated staff-facing copy carries the house `TODO(owner-copy)` marker per the on-disk convention — here: `'Canceled'` (the tray status line), `'Cancel'` (the tray button), `'Drop photos to upload'` (the armed overlay), `'Leave while uploading?'` + `'Uploads are still in flight. Leaving now cancels the ones that haven't finished.'` + `'Leave anyway'` (spec-verbatim) + `'Stay'` (the dialog), and `'Leaving…'` (the never-rendered busyLabel — `pending` is always false). Task 3's owner round ratifies or retunes them; markers retire as ruled; if copy retunes, the code changes in the same commit (no suite pins these strings — they are component-side).
- **Theme law (binding, #217's ramp):** the overlay and tray additions use semantic tokens and tailwind utilities only (`border-primary`, `bg-background/80`, `text-foreground` …) — no new tokens, no `packages/ui` change. Both themes render from the same classes; the round verifies dark, never a second class set.
- **Scope fence (verbatim):** Task 1 edits only `apps/admin/src/lib/{batch-photo-upload.ts, batch-photo-upload.test.ts, gallery-state.ts, gallery-state.test.ts}`. Task 2 edits only `apps/admin/src/components/{cms/shared.tsx (the one additive optional prop), gallery/gallery-screen.tsx}`. Task 3 edits only the files Tasks 1–2 landed (copy/class retunes) + writes evidence. Task 4 rotates `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `docs/agents/v1-picks.md` (post-merge), `graphify-out/`, and works the PR/pick/issues — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
apps/admin/src/lib/
  batch-photo-upload.ts        # modify (T1) — signal param + the canceled class + the abort law; put gains signal; XHR abort wiring; the two predicates
  batch-photo-upload.test.ts   # modify (T1) — +9 its (the abort law 6, the tray/guard predicates 3)
  gallery-state.ts             # modify (T1) — batchItemsFromFiles (the shared enqueue) + isFileDrag (the file-drag gate)
  gallery-state.test.ts        # modify (T1) — +2 its
apps/admin/src/components/
  cms/shared.tsx               # modify (T2) — GuardedConfirm gains optional cancelLabel (default 'Cancel') — no other change
  gallery/gallery-screen.tsx   # modify (T2) — the drop zone + overlay, per-run controllers + Cancel, the leave guard + dialog, the tray vocabulary, Done-guarding
docs/plan.md docs/progress.md AGENTS.md graphify-out/ docs/agents/v1-picks.md  # T4
```

---

### Task 1: The lib seams (TDD) — the abort law, the predicates, the shared enqueue

Plain data in and out; the Task 2 screen renders what this task derives. The modules never import React. This task alone makes the ticket's first AC runnable ("cancel wired over the abort seam") and gives the guard its one predicate.

**Files:**
- Modify (test-first): `apps/admin/src/lib/batch-photo-upload.test.ts`, `apps/admin/src/lib/gallery-state.test.ts`
- Modify: `apps/admin/src/lib/batch-photo-upload.ts`, `apps/admin/src/lib/gallery-state.ts`

**Interfaces:**
- Produces (what Task 2 consumes): from `batch-photo-upload.ts` — `runBatchUpload(items: BatchItem[], deps: BatchUploadDeps, signal?: AbortSignal): Promise<{ done: BatchItem[]; failed: BatchItem[]; canceled: BatchItem[] }>` (the extended status machine gains `{ phase: 'canceled' }`); `BatchUploadDeps.put` gains `signal?: AbortSignal` as its 4th parameter; `putFileToPresignedUrl(file, uploadUrl, onProgress, signal?)`; `hasUnsettledUploads(items: BatchItem[], statuses: Map<string, BatchItemStatus>): boolean`; `trayIsVisible(items: BatchItem[], statuses: Map<string, BatchItemStatus>): boolean`. From `gallery-state.ts` — `batchItemsFromFiles(files: File[], categoryId: string | null): BatchItem[]` and `isFileDrag(types: readonly string[]): boolean`.
- Consumes: nothing new — `@sevendays/types` shapes and the module's own existing exports.

**Not here:** any component (Task 2); the leave guard's wiring (Task 2 — this task only builds the predicate it consumes); the cover path (`cover-upload.ts` untouched); pre-commit metadata editing; any API/wire change (zero-API law).

- [ ] **Step 1: Write the failing tests (a) — the abort law**

In `apps/admin/src/lib/batch-photo-upload.test.ts`, extend the import from `./batch-photo-upload` — `hasUnsettledUploads,` goes between `PutUploadError,` and `preCheckFile,`, `trayIsVisible,` after `runBatchUpload,` (biome's fix pass is the backstop) — then append this describe after the existing `runBatchUpload` describe:

```ts
describe('runBatchUpload — the abort seam (M7 #220: cancel settles canceled, never a retry)', () => {
  it('a PRE-ABORTED signal settles every item canceled with zero network calls', async () => {
    const d = deps();
    const controller = new AbortController();
    controller.abort();
    const one = item(1);
    const two = item(2);
    const result = await runBatchUpload([one, two], d, controller.signal);
    expect(result.done).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
    expect(result.canceled.map((i) => i.id)).toEqual([one.id, two.id]);
    expect(d.presign).not.toHaveBeenCalled();
    expect(d.put).not.toHaveBeenCalled();
    const phases = (d.onStatus as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1].phase);
    expect(phases).toEqual(['canceled', 'canceled']);
  });

  it('an abort while PRESIGN is in flight settles the item canceled — the PUT never fires, no retry presign', async () => {
    let releasePresign: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releasePresign = resolve;
    });
    const d = deps({
      presign: vi.fn(async () => {
        await gate;
        return { key: 'tmp/1.jpg', uploadUrl: 'https://r2/1' };
      }),
    });
    const controller = new AbortController();
    const one = item(1);
    const pending = runBatchUpload([one], d, controller.signal);
    await vi.waitFor(() => expect(d.presign).toHaveBeenCalledTimes(1));
    controller.abort();
    releasePresign();
    const result = await pending;
    expect(result.canceled.map((i) => i.id)).toEqual([one.id]);
    expect(d.put).not.toHaveBeenCalled();
    expect(d.presign).toHaveBeenCalledTimes(1); // the abort consumed no retry
  });

  it('an abort during the PUT settles canceled — the abort reject is NEVER a transient retry (the pre-#220 pool would have re-queued it)', async () => {
    const d = deps({
      put: vi.fn(
        (_file: File, _uploadUrl: string, _onProgress: unknown, signal?: AbortSignal) =>
          new Promise<void>((_, reject) => {
            signal?.addEventListener('abort', () => reject(new Error('Upload canceled.')));
          })
      ),
    });
    const controller = new AbortController();
    const one = item(1);
    const pending = runBatchUpload([one], d, controller.signal);
    await vi.waitFor(() => expect(d.put).toHaveBeenCalledTimes(1));
    controller.abort();
    const result = await pending;
    expect(result.canceled.map((i) => i.id)).toEqual([one.id]);
    expect(result.failed).toHaveLength(0);
    expect(d.presignCalls).toEqual(['p1']); // attempt 2 never presigned
    const last = (d.onStatus as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(last?.[1]).toEqual({ phase: 'canceled' });
  });

  it('an abort settles QUEUED items canceled too — never-run items make no network calls (the settlement guarantee extends)', async () => {
    const d = deps({
      put: vi.fn(
        (_file: File, _uploadUrl: string, _onProgress: unknown, signal?: AbortSignal) =>
          new Promise<void>((_, reject) => {
            signal?.addEventListener('abort', () => reject(new Error('Upload canceled.')));
          })
      ),
    });
    const controller = new AbortController();
    const six = [1, 2, 3, 4, 5, 6].map(item);
    const pending = runBatchUpload(six, d, controller.signal);
    await vi.waitFor(() => expect(d.put).toHaveBeenCalledTimes(4)); // BATCH_CONCURRENCY
    controller.abort();
    const result = await pending;
    expect(result.canceled.map((i) => i.id)).toEqual(six.map((i) => i.id));
    expect(result.done).toHaveLength(0);
    expect(d.presignCalls).toHaveLength(4); // items 5–6 never presigned
  });

  it('an abort while the COMMIT is in flight lets its verdict stand — done stays done, never canceled', async () => {
    let releaseCommit: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseCommit = resolve;
    });
    const d = deps({
      commit: vi.fn(async (): CommitResult => {
        await gate;
        return { ok: true, photo: { id: uuid(97) } as never };
      }),
    });
    const controller = new AbortController();
    const one = item(1);
    const pending = runBatchUpload([one], d, controller.signal);
    await vi.waitFor(() => expect(d.commit).toHaveBeenCalledTimes(1));
    controller.abort();
    releaseCommit();
    const result = await pending;
    expect(result.done).toHaveLength(1);
    expect(result.canceled).toHaveLength(0);
  });

  it('an abort AFTER the PUT resolves still cancels — a canceled item is never promoted (the staged object is the tmp/ GC’s)', async () => {
    let releasePut: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releasePut = resolve;
    });
    const d = deps({
      put: vi.fn((_file: File, _uploadUrl: string, _onProgress: unknown) => gate.then(() => undefined)),
    });
    const controller = new AbortController();
    const one = item(1);
    const pending = runBatchUpload([one], d, controller.signal);
    await vi.waitFor(() => expect(d.put).toHaveBeenCalledTimes(1));
    controller.abort();
    releasePut(); // the PUT resolves NORMALLY after the abort
    const result = await pending;
    expect(result.canceled.map((i) => i.id)).toEqual([one.id]);
    expect(d.commit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Write the failing tests (b) — the tray/guard predicates**

Append to the same file (below the new describe):

```ts
describe('the tray + leave-guard predicates (M7 #220)', () => {
  it('hasUnsettledUploads: enqueued(undefined)/queued/uploading/committing are unsettled; done/failed/canceled are terminal; an empty tray is settled', () => {
    const items = [1, 2, 3, 4, 5, 6].map(item);
    const statuses = new Map<string, BatchItemStatus>([
      [items[1].id, { phase: 'queued' }],
      [items[2].id, { phase: 'uploading', sent: 1, total: 2 }],
      [items[3].id, { phase: 'committing' }],
      [items[4].id, { phase: 'done', photo: { id: uuid(96) } as never }],
      [items[5].id, { phase: 'failed', kind: 'transient', message: 'x', attempts: 2 }],
    ]);
    // items[0] carries NO status yet — enqueued, the pool has not reported.
    expect(hasUnsettledUploads(items, statuses)).toBe(true);
    const terminal = new Map<string, BatchItemStatus>([
      [items[0].id, { phase: 'done', photo: { id: uuid(95) } as never }],
      [items[1].id, { phase: 'failed', kind: 'permanent', message: 'x', attempts: 1 }],
      [items[2].id, { phase: 'canceled' }],
    ]);
    expect(hasUnsettledUploads([items[0], items[1], items[2]], terminal)).toBe(false);
    expect(hasUnsettledUploads([], new Map())).toBe(false);
  });

  it('trayIsVisible holds the tray open on failures AND on canceled rows — a mid-batch cancel never silently swallows the story', () => {
    const one = item(1);
    const two = item(2);
    const onFailed = new Map<string, BatchItemStatus>([
      [one.id, { phase: 'done', photo: { id: uuid(94) } as never }],
      [two.id, { phase: 'failed', kind: 'transient', message: 'x', attempts: 2 }],
    ]);
    expect(trayIsVisible([one, two], onFailed)).toBe(true);
    const onCanceled = new Map<string, BatchItemStatus>([
      [one.id, { phase: 'done', photo: { id: uuid(93) } as never }],
      [two.id, { phase: 'canceled' }],
    ]);
    expect(trayIsVisible([one, two], onCanceled)).toBe(true);
  });

  it('trayIsVisible auto-hides the all-done tray and never shows an empty one', () => {
    const one = item(1);
    const allDone = new Map<string, BatchItemStatus>([
      [one.id, { phase: 'done', photo: { id: uuid(92) } as never }],
    ]);
    expect(trayIsVisible([one], allDone)).toBe(false);
    expect(trayIsVisible([], new Map())).toBe(false);
  });
});
```

The import block must also gain the `BatchItemStatus` TYPE (it rides the existing `import { type BatchItem, type BatchUploadDeps, … }` line as `type BatchItemStatus,` — biome's fix pass orders it).

- [ ] **Step 3: Write the failing tests (c) — the shared enqueue + the file-drag gate**

In `apps/admin/src/lib/gallery-state.test.ts`, extend the `./gallery-state` import with `batchItemsFromFiles` and `isFileDrag` (alphabetical placement), then append:

```ts
describe('batchItemsFromFiles + isFileDrag (M7 #220 — the shared enqueue + the file-drag gate)', () => {
  it('maps every file by the AR-11 enqueue law: title from file name, caption null, category passthrough, fresh unique ids, input order', () => {
    const a = new File(['a'], 'Graduation 2026.jpg', { type: 'image/jpeg' });
    const b = new File(['b'], 'studio.batch.2.jpg', { type: 'image/jpeg' });
    const categoryId = '00000000-0000-4000-8000-000000000009';
    const items = batchItemsFromFiles([a, b], categoryId);
    expect(items.map((i) => i.title)).toEqual(['Graduation 2026', 'studio.batch.2']);
    expect(items.every((i) => i.caption === null)).toBe(true);
    expect(items.every((i) => i.categoryId === categoryId)).toBe(true);
    expect(items.map((i) => i.file)).toEqual([a, b]);
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
    expect(batchItemsFromFiles([a], null).at(0)?.categoryId).toBeNull();
  });

  it('isFileDrag: only Files-carrying drags count — dnd-kit/text drags never arm the zone', () => {
    expect(isFileDrag(['Files'])).toBe(true);
    expect(isFileDrag(['Files', 'text/uri-list'])).toBe(true);
    expect(isFileDrag(['text/plain'])).toBe(false);
    expect(isFileDrag([])).toBe(false);
  });
});
```

- [ ] **Step 4: Run red**

`pnpm --filter @sevendays/admin test -- --run` — the 11 new its fail (`hasUnsettledUploads`/`trayIsVisible`/`batchItemsFromFiles`/`isFileDrag` don't exist; `result.canceled` is `undefined` in the abort-law its). Capture the red output to the evidence dir.

- [ ] **Step 5: Implement the abort law + predicates in `batch-photo-upload.ts`**

(a) Amend the file-header comment's tail — after the existing `…the component wires the cover-upload loop's browser-direct PUT.` sentence, append on a new line:

```ts
// M7 #220 adds the abort seam: an optional AbortSignal settles every
// unsettled item `canceled` — never a retry (the pre-#220 pool classed the
// XHR abort-reject `transient` and would have re-queued a canceled upload),
// no new network call starts after the abort, and a commit already in
// flight completes with its verdict standing. The tray/guard predicates
// below are the one vocabulary both the tray UI and the leaving guard read.
```

(b) Extend `BatchItemStatus` — replace:

```ts
export type BatchItemStatus =
  | { phase: 'queued' }
  | { phase: 'uploading'; sent: number; total: number }
  | { phase: 'committing' }
  | { phase: 'done'; photo: GalleryPhoto }
  | { phase: 'failed'; kind: BatchFailureKind; message: string; attempts: number };
```

with:

```ts
export type BatchItemStatus =
  | { phase: 'queued' }
  | { phase: 'uploading'; sent: number; total: number }
  | { phase: 'committing' }
  | { phase: 'done'; photo: GalleryPhoto }
  | { phase: 'failed'; kind: BatchFailureKind; message: string; attempts: number }
  | { phase: 'canceled' };
```

(c) In `BatchUploadDeps`, replace the `put` member with (the doc comment above the interface stays):

```ts
  put(
    file: File,
    uploadUrl: string,
    onProgress: (sent: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<void>;
```

(d) Replace the WHOLE `runBatchUpload` function (signature through its closing brace, including its doc comment) with:

```ts
/**
 * `#143 seam: the batch pool` — a shared queue index drained by
 * BATCH_CONCURRENCY workers (Promise.all of 4 worker loops).
 *
 * Per item: `queued` on dequeue; then at most MAX_UPLOAD_ATTEMPTS attempts —
 * the FIRST attempt runs `preCheckFile` (a `pre-check` failure settles
 * `failed` immediately, no network call); then `presign` (a throw is
 * `transient`); then `put` with progress events → `uploading` (an
 * error/abort reject is `transient`; a non-2xx status fails with
 * `Upload failed: <status>` and is `transient` unless the status is 400 —
 * a 400 PUT is `permanent`); then `commit` (ok → `done`; status 400 →
 * `permanent` with the API message; any other status → `transient`). After
 * a `transient` failure, if attempts remain, the item re-queues (attempt 2
 * presigns fresh — an expired URL never poisons the retry); else it
 * settles `failed`.
 *
 * M7 #220 — the abort seam: an optional `signal`. Once aborted, no new
 * network call starts (checked at attempt start and after every awaited
 * hop), in-flight PUTs abort through the injected signal, and every
 * unsettled item settles `{ phase: 'canceled' }` — cancel is a verdict,
 * never a failure class and never a retry. A commit already in flight
 * completes and its verdict stands; an abort after the PUT still cancels
 * (nothing canceled is promoted — the staged object is the tmp/ lifecycle
 * GC's). Settlement is guaranteed either way: every item ends `done`,
 * `failed`, or `canceled` exactly once, and `onStatus` has told the full
 * story. Continue-with-successes / retry-failures — never an
 * all-or-nothing barrier: only committed files become savable.
 */
export async function runBatchUpload(
  items: BatchItem[],
  deps: BatchUploadDeps,
  signal?: AbortSignal
): Promise<{ done: BatchItem[]; failed: BatchItem[]; canceled: BatchItem[] }> {
  const done: BatchItem[] = [];
  const failed: BatchItem[] = [];
  const canceled: BatchItem[] = [];
  // Settlement bookkeeping: every item ends done | failed | canceled
  // exactly once — the post-drain sweep reads this to settle never-run
  // items after an abort without double-settling retried entries.
  const settled = new Set<string>();
  const aborted = () => signal?.aborted === true;

  const settleCanceled = (item: BatchItem) => {
    if (settled.has(item.id)) {
      return;
    }
    settled.add(item.id);
    deps.onStatus(item.id, { phase: 'canceled' });
    canceled.push(item);
  };

  interface QueueEntry {
    item: BatchItem;
    attemptsUsed: number;
    preChecked: boolean;
  }

  const queue: QueueEntry[] = items.map((item) => ({
    item,
    attemptsUsed: 0,
    preChecked: false,
  }));
  let next = 0;

  const runAttempt = async (entry: QueueEntry): Promise<void> => {
    const { item } = entry;
    const attempt = entry.attemptsUsed + 1;

    const fail = (kind: BatchFailureKind, message: string) => {
      settled.add(item.id);
      deps.onStatus(item.id, { phase: 'failed', kind, message, attempts: attempt });
      failed.push(item);
    };

    // A `transient` failure: re-queue if attempts remain (the retry gets a
    // fresh presign), else settle `failed`. An ABORTED pool never
    // re-queues — cancel is a verdict, not a failure class (#220).
    const retryOrFail = (message: string) => {
      if (aborted()) {
        settleCanceled(item);
        return;
      }
      if (attempt < MAX_UPLOAD_ATTEMPTS) {
        queue.push({ item, attemptsUsed: attempt, preChecked: true });
      } else {
        fail('transient', message);
      }
    };

    if (aborted()) {
      // A canceled run never even claims "queued" — a pre-aborted pool
      // settles straight to canceled (the suite pins phases exactly).
      settleCanceled(item);
      return;
    }

    deps.onStatus(item.id, { phase: 'queued' });

    // (1) FIRST attempt only: the courtesy type/size gates, before any
    // network call. A retry never re-runs them — the file does not change.
    if (!entry.preChecked) {
      entry.preChecked = true;
      const problem = await preCheckFile(item.file);
      if (problem !== null) {
        fail('pre-check', problem);
        return;
      }
      if (aborted()) {
        settleCanceled(item);
        return;
      }
    }

    // (2) Presign — the server assigns the staging key; the client never
    // supplies key text (ADR-0019). A throw is `transient`; an abort that
    // landed mid-await stops the next hop.
    let stagingKey: string;
    let uploadUrl: string;
    try {
      const presigned = await deps.presign({
        purpose: 'gallery-photo',
        contentType: 'image/jpeg',
      });
      stagingKey = presigned.key;
      uploadUrl = presigned.uploadUrl;
    } catch (error) {
      retryOrFail(error instanceof Error ? error.message : 'Could not start the upload.');
      return;
    }
    if (aborted()) {
      settleCanceled(item);
      return;
    }

    // (3) The XHR PUT; progress events map to `uploading`. Non-2xx arrives
    // as a typed PutUploadError — 400 is `permanent`, the rest `transient`.
    // An `error`/`abort` reject is `transient` — UNLESS the pool was
    // aborted, when it settles `canceled` (never a retry).
    try {
      await deps.put(
        item.file,
        uploadUrl,
        (sent, total) => {
          deps.onStatus(item.id, { phase: 'uploading', sent, total });
        },
        signal
      );
    } catch (error) {
      if (aborted()) {
        settleCanceled(item);
      } else if (error instanceof PutUploadError) {
        if (error.status === 400) {
          fail('permanent', error.message);
        } else {
          retryOrFail(error.message);
        }
      } else {
        retryOrFail(error instanceof Error ? error.message : 'Upload failed: network error.');
      }
      return;
    }
    if (aborted()) {
      // The PUT finished, but the operator canceled — nothing canceled is
      // promoted; the staged object is the tmp/ lifecycle GC's.
      settleCanceled(item);
      return;
    }

    // (4) The commit — its own POST /admin/gallery-photos, the
    // verify/promote gate. An abort BEFORE it fires cancels (above); once
    // in flight, its verdict stands. ok → `done`; 400 → `permanent` with
    // the API message; anything else `transient`.
    deps.onStatus(item.id, { phase: 'committing' });
    try {
      const result = await deps.commit({
        r2Key: stagingKey,
        title: item.title,
        caption: item.caption,
        categoryId: item.categoryId,
      });
      if (result.ok) {
        settled.add(item.id);
        deps.onStatus(item.id, { phase: 'done', photo: result.photo });
        done.push(item);
      } else if (result.status === 400) {
        fail('permanent', result.message);
      } else {
        retryOrFail('Could not save the photo: ' + result.status);
      }
    } catch (error) {
      // The commit adapter answers in its result union; a throw is
      // "everything else" — `transient`, same as a presign throw.
      retryOrFail(error instanceof Error ? error.message : 'Could not save the photo.');
    }
  };

  const worker = async (): Promise<void> => {
    while (next < queue.length) {
      if (aborted()) {
        break; // an aborted pool stops dequeueing
      }
      const entry = queue[next];
      if (entry === undefined) break; // unreachable below queue.length
      next += 1;
      await runAttempt(entry);
    }
  };

  await Promise.all(Array.from({ length: BATCH_CONCURRENCY }, () => worker()));

  // The abort sweep: workers stopped before dequeueing every entry — each
  // never-run (or mid-retry-queue) item settles `canceled` now. Without an
  // abort this is a no-op (every item already settled).
  for (const entry of queue) {
    settleCanceled(entry.item);
  }

  return { done, failed, canceled };
}
```

(e) Replace the WHOLE `putFileToPresignedUrl` function with (its doc comment amended by its last sentence):

```ts
/**
 * The browser-direct XHR PUT — the `cover-upload.ts` step-3 port, verbatim
 * semantics: `PUT`, `Content-Type: image/jpeg`, `xhr.upload.onprogress`
 * (fetch has no upload progress — the spec's XHR ruling), 2xx resolves.
 * Unlike the cover loop it THROWS a typed `PutUploadError` on non-2xx and
 * rejects on `error`/`abort`, so the pool's retry-class map stays in one
 * place. M7 #220: the optional `signal` is the cancel wire — an already-
 * aborted signal rejects without sending; an abort mid-flight calls
 * `xhr.abort()`, whose `onabort` reject ('Upload canceled.') the pool
 * settles `canceled` (never a retry). The listener is `once`-style and
 * removed on every settle.
 *
 * `#143 seam: the injected PUT` — exported for the component's `deps.put`
 * wiring and for the suite's stubbing seam.
 */
export async function putFileToPresignedUrl(
  file: File,
  uploadUrl: string,
  onProgress: (sent: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Upload canceled.'));
      return;
    }
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort);
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'image/jpeg');
    xhr.upload.onprogress = (event) => {
      onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      signal?.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new PutUploadError(xhr.status));
      }
    };
    xhr.onerror = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Upload failed: network error.'));
    };
    xhr.onabort = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Upload canceled.'));
    };
    xhr.send(file);
  });
}
```

(f) Append the two predicates at the file's end:

```ts
/**
 * `#220 seam: the leave-guard predicate` — true while ANY item has not
 * reached a terminal status. `undefined` counts (enqueued; the pool has
 * not reported yet), as do queued/uploading/committing; done/failed/
 * canceled are terminal. BOTH navigation guards consume this one
 * predicate — the router blocker and the browser beforeunload — so the
 * two classes can never disagree about what "unsettled" means.
 */
export function hasUnsettledUploads(
  items: BatchItem[],
  statuses: Map<string, BatchItemStatus>
): boolean {
  return items.some((item) => {
    const status = statuses.get(item.id);
    if (status === undefined) {
      return true;
    }
    return (
      status.phase === 'queued' || status.phase === 'uploading' || status.phase === 'committing'
    );
  });
}

/**
 * `#220 seam: the tray's visibility law` — the tray renders while anything
 * is unsettled OR any row still needs staff eyes (a failure to retry, a
 * canceled row to acknowledge); an all-done tray hides itself. Canceled
 * rows hold the tray open: after a mid-batch cancel the operator still
 * sees what did NOT upload (Done clears).
 */
export function trayIsVisible(items: BatchItem[], statuses: Map<string, BatchItemStatus>): boolean {
  if (items.length === 0) {
    return false;
  }
  if (hasUnsettledUploads(items, statuses)) {
    return true;
  }
  return items.some((item) => {
    const phase = statuses.get(item.id)?.phase;
    return phase === 'failed' || phase === 'canceled';
  });
}
```

- [ ] **Step 6: Implement the enqueue + drag gate in `gallery-state.ts`**

(a) Extend the file-header comment's seam list — after `…and the upload title derivation.` replace that phrase with `…, the upload title derivation, and (M7 #220) the shared picker/drop enqueue + the file-drag gate.`

(b) Add the type import beside the existing `@sevendays/types` import:

```ts
import type { BatchItem } from './batch-photo-upload';
```

(c) Append at the file's end:

```ts
/**
 * `#220 seam: files → staged items` — the ONE enqueue law the picker and
 * the drop zone share (AR-11): category = the open rail filter captured AT
 * ENQUEUE (the caller resolves `'all'` → `null`), title = file name minus
 * its LAST extension (`titleFromFileName`), caption null (pre-commit
 * metadata editing is ruled out), ids fresh per item. Dropped non-JPG or
 * oversized files ride the SAME courtesy pre-check the picker's `accept`
 * approximates — the pool's `pre-check` failure row is the answer, never
 * a drop-side filter.
 */
export function batchItemsFromFiles(files: File[], categoryId: string | null): BatchItem[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    file,
    title: titleFromFileName(file.name),
    caption: null,
    categoryId,
  }));
}

/**
 * `#220 seam: the file-drag gate` — ONLY drags whose `dataTransfer.types`
 * carry `'Files'` arm the drop zone. dnd-kit's pointer/touch/keyboard
 * drags never start an HTML5 drag (no `dataTransfer` types at all), and
 * text/element drags carry no `'Files'` — so the sortable grid and the
 * drop zone cannot interfere by construction.
 */
export function isFileDrag(types: readonly string[]): boolean {
  return types.includes('Files');
}
```

- [ ] **Step 7: Green + gates + commit**

`pnpm --filter @sevendays/admin test -- --run` — **23 files / 240 tests passed** (229 + the 11 new; batch-photo-upload 10 → 19 its, gallery-state 9 → 11). Then `pnpm --filter @sevendays/admin fix` → re-run `test -- --run` → `typecheck`. Commit:

```bash
git add apps/admin/src/lib/batch-photo-upload.ts apps/admin/src/lib/batch-photo-upload.test.ts apps/admin/src/lib/gallery-state.ts apps/admin/src/lib/gallery-state.test.ts
git commit -m "feat(admin): the upload abort seam - cancel settles canceled, never a retry; the tray/guard predicates + the shared enqueue (#220)"
```

### Task 2: The screen wiring — drop zone, cancel, the leave guard (UI-bearing)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule) before composing. All state stays in `GalleryScreen` (the route keeps holding zero logic); no query changes; the rail, the editor, the dialogs' existing wiring, the sortable grid's sensors, and the hidden picker input are untouched.

**Files:**
- Modify: `apps/admin/src/components/cms/shared.tsx` (one additive optional prop — nothing else)
- Modify: `apps/admin/src/components/gallery/gallery-screen.tsx`

**Interfaces:**
- Consumes: Task 1's `hasUnsettledUploads`, `trayIsVisible`, `batchItemsFromFiles`, `isFileDrag`, and the `signal`-aware `runBatchUpload`/`putFileToPresignedUrl`; `useBlocker` from `@tanstack/react-router` **1.170.41** (probed — the object-opts form with `withResolver: true` returns the `BlockerResolver` union); `GuardedConfirm` from `#/components/cms/shared` (this task adds its `cancelLabel` prop); `ImagePlus` (already imported).
- Produces: the wired surfaces themselves — no new exports; later tasks touch only copy/classes.

**Not here:** any change to the hidden input's attributes or the route's label/`htmlFor` pair (the picker law); any editor change; any API surface (zero-API law); the variants round (Task 3 — the composition below is the first cut the round judges).

- [ ] **Step 1: `cms/shared.tsx` — GuardedConfirm's stay-side label**

(a) In `GuardedConfirm`'s destructure, after `confirmLabel,` add `cancelLabel = 'Cancel',`; in its props type, after `confirmLabel: string;` add:

```ts
  /** The stay-side label — 'Cancel' everywhere except the leaving-mid-upload guard (#220), where 'Stay' reads as the answer. */
  cancelLabel?: string;
```

(b) Replace its `<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>` with:

```tsx
              <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
```

No other line in the file changes; every existing call site keeps its default.

- [ ] **Step 2: `gallery-screen.tsx` — imports**

(a) The react import becomes:

```tsx
import { type ChangeEvent, type DragEvent, useCallback, useId, useRef, useState } from 'react';
```

(b) Add beside the other `@tanstack/…` imports:

```tsx
import { useBlocker } from '@tanstack/react-router';
```

(c) Extend the cms/shared import with `GuardedConfirm` (after `EmptyState,` — alphabetical order puts it between `EmptyState` and `LightEntityEditor`).

(d) Extend the batch-photo-upload imports:

```tsx
import type { BatchItem, BatchItemStatus } from '#/lib/batch-photo-upload';
import {
  hasUnsettledUploads,
  putFileToPresignedUrl,
  runBatchUpload,
  trayIsVisible,
} from '#/lib/batch-photo-upload';
```

(e) Extend the `#/lib/gallery-state` import with both new names — `batchItemsFromFiles,` as its FIRST name (before `buildCategoryOrderPayload,`) and `isFileDrag,` between `type PhotoEditorState,` and `photoStateFromRead,` (biome's fix pass orders both blocks).

- [ ] **Step 3: The tray vocabulary — Canceled line, Cancel button, Done-guarding**

(a) `trayStatusText` gains the canceled class — insert before the final `return`:

```tsx
  if (status.phase === 'canceled') {
    return 'Canceled';
  }
```

(b) `UploadTray`'s props gain `onCancel: () => void;` (after `onRetryFailed`), its destructure gains `onCancel,`, and inside the component (above `return`) add:

```tsx
  const unsettled = hasUnsettledUploads(items, statuses);
```

(c) Replace the tray header's action row:

```tsx
          <div className='flex items-center gap-2'>
            {transientFailures.length > 0 ? (
              <Button variant='outline' size='sm' type='button' onClick={onRetryFailed}>
                Retry failed
              </Button>
            ) : null}
            <Button variant='ghost' size='sm' type='button' onClick={onDone}>
              Done
            </Button>
          </div>
```

with:

```tsx
          <div className='flex items-center gap-2'>
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            {unsettled ? (
              <Button variant='outline' size='sm' type='button' onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            {transientFailures.length > 0 ? (
              <Button variant='outline' size='sm' type='button' onClick={onRetryFailed}>
                Retry failed
              </Button>
            ) : null}
            {/* Done clears only a SETTLED tray: clearing mid-flight would
                orphan the running pool and silently drop the leave-guard
                (hasUnsettled reads trayItems). Cancel is the way out. */}
            <Button variant='ghost' size='sm' type='button' disabled={unsettled} onClick={onDone}>
              Done
            </Button>
          </div>
```

(d) At the `UploadTray` call site, add `onCancel={cancelAllUploads}` (after `onRetryFailed={retryFailed}`).

- [ ] **Step 4: Per-run controllers + the shared enqueue**

(a) Above `async function presign(…)` (the upload-wiring section), add the controller set:

```tsx
  // The cancel wire (#220): one AbortController per pool RUN — the picker,
  // a drop, a per-row Retry, and Retry failed each start their own run;
  // Cancel aborts every live one. Settled runs remove themselves.
  const activeRuns = useRef(new Set<AbortController>());
```

(b) Replace `runThroughPool`'s body:

```tsx
  async function runThroughPool(items: BatchItem[]) {
    const controller = new AbortController();
    activeRuns.current.add(controller);
    try {
      const { done } = await runBatchUpload(
        items,
        {
          presign,
          put: putFileToPresignedUrl,
          commit,
          onStatus: (itemId, status) => {
            // The Task-6 review's throwing-onStatus minor, consumer side: this
            // tap is a pure setState + one invalidate — it cannot throw, so the
            // pool's settlement guarantee holds for this wiring.
            setTrayStatuses((prev) => {
              const next = new Map(prev);
              next.set(itemId, status);
              return next;
            });
            // Every done invalidates — the row becomes a real card ("only
            // committed files become savable", structurally).
            if (status.phase === 'done') {
              queryClient.invalidateQueries({ queryKey: adminGalleryQueries.photos().queryKey });
            }
          },
        },
        controller.signal
      );
      if (done.length > 0) {
        toast.success(`Uploaded ${done.length} photos.`);
      }
    } finally {
      activeRuns.current.delete(controller);
    }
  }

  function cancelAllUploads() {
    for (const controller of activeRuns.current) {
      controller.abort();
    }
  }
```

(c) Replace `onFilesChosen` with the shared enqueue + its thin picker adapter:

```tsx
  // The ONE enqueue path (#220): the picker and the drop zone both land
  // here, over the Task-1 seam, so the two can never drift (AR-11: the
  // category is the open rail filter at enqueue; title from file name;
  // caption null — pre-commit metadata editing is ruled out).
  function enqueueFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }
    const items = batchItemsFromFiles(files, filter === 'all' ? null : filter);
    setTrayItems((prev) => [...prev, ...items]);
    void runThroughPool(items);
  }

  function onFilesChosen(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow re-picking the same file
    enqueueFiles(files);
  }
```

- [ ] **Step 5: The drop zone + armed overlay**

(a) Add the drag state beside the tray state (after the `trayStatuses` useState):

```tsx
  // The drop zone (#220): armed only while a Files-carrying drag hovers the
  // grid column; the depth counter absorbs dragenter/dragleave churn from
  // child elements (every child fires the pair on the way in/out).
  const [dropArmed, setDropArmed] = useState(false);
  const dragDepth = useRef(0);
```

(b) Add the handlers after `enqueueFiles`:

```tsx
  function onFileDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event.dataTransfer.types)) {
      return;
    }
    event.preventDefault();
    dragDepth.current += 1;
    setDropArmed(true);
  }

  function onFileDragOver(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event.dataTransfer.types)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function onFileDragLeave() {
    if (dragDepth.current === 0) {
      return;
    }
    dragDepth.current -= 1;
    if (dragDepth.current === 0) {
      setDropArmed(false);
    }
  }

  function onFileDrop(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event.dataTransfer.types)) {
      return;
    }
    event.preventDefault();
    dragDepth.current = 0;
    setDropArmed(false);
    enqueueFiles(Array.from(event.dataTransfer.files));
  }
```

(c) Wrap the grid/empty-state ternary in the drop zone. Replace the opening `{visiblePhotos.length === 0 ? (` … through the closing `)}` of the ternary by wrapping:

```tsx
          {/* The drop zone (#220): the grid column — the ruled surface ("onto
              the gallery grid"), covering both the populated grid and the
              category empty state. Only Files-carrying drags arm it (the
              Task-1 gate); dnd-kit's pointer drags never do. */}
          <div
            className='relative'
            onDragEnter={onFileDragEnter}
            onDragOver={onFileDragOver}
            onDragLeave={onFileDragLeave}
            onDrop={onFileDrop}
          >
            {visiblePhotos.length === 0 ? (
              … the existing EmptyState ternary branches, unchanged …
            ) : (
              … the existing DndContext block, unchanged …
            )}
            {dropArmed ? (
              <div className='pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/80'>
                <p className='flex items-center gap-2 text-sm font-medium'>
                  <ImagePlus className='size-4' aria-hidden='true' />
                  {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
                  Drop photos to upload
                </p>
              </div>
            ) : null}
          </div>
```

(The `…` lines above mean: move the existing ternary and DndContext block inside verbatim — no edit to their internals. The DndContext stays INSIDE the wrapper; its pointer sensors never conflict with the HTML5 drag handlers.)

- [ ] **Step 6: The leave guard — blocker + dialog**

(a) Replace the tray-visibility derivations:

```tsx
  // The tray renders while ANY item is non-settled or a failure exists.
  const hasUnsettled = trayItems.some((item) => {
    const status = trayStatuses.get(item.id);
    return status === undefined || (status.phase !== 'done' && status.phase !== 'failed');
  });
  const hasFailure = trayItems.some((item) => trayStatuses.get(item.id)?.phase === 'failed');
  const trayVisible = trayItems.length > 0 && (hasUnsettled || hasFailure);
```

with:

```tsx
  // The leave-guard predicate (#220): ONE seam answers both the router
  // blocker and the browser beforeunload (they can never disagree), and
  // the tray's visibility law reads the same module. `undefined` counts
  // as unsettled — an item enqueued the pool has not reported yet.
  const hasUnsettled = hasUnsettledUploads(trayItems, trayStatuses);
  const trayVisible = trayIsVisible(trayItems, trayStatuses);

  // useBlocker (1.170.41, probed): the object-opts form with
  // withResolver:true registers ONE history block answering BOTH
  // navigation classes — a router navigation awaits the resolver (Stay
  // resets, Leave anyway proceeds), and enableBeforeUnload feeds the same
  // registration's native beforeunload prompt. The callbacks are
  // stabilized on hasUnsettled so the effect re-subscribes only when
  // unsettled-ness flips, never per status tick.
  const shouldBlockFn = useCallback(() => hasUnsettled, [hasUnsettled]);
  const shouldPromptBeforeUnload = useCallback(() => hasUnsettled, [hasUnsettled]);
  const blocker = useBlocker({
    shouldBlockFn,
    enableBeforeUnload: shouldPromptBeforeUnload,
    withResolver: true,
  });
```

(b) Render the leave dialog after the `deleteCategory` dialog block (the last child before `</section>`):

```tsx
      {/* The leaving-mid-upload guard (#220): GuardedConfirm over the
          router blocker. "Leave anyway" aborts every active run THEN
          proceeds — leaving is never a leak (nothing canceled is promoted;
          a commit already in flight completes and stands). The blocker's
          promise settles once: proceed() resolves synchronously from the
          confirm click, before Base UI's action-close can reach reset(),
          so the status guard in onOpenChange is belt-and-suspenders both
          ways. pending is always false — leaving is instant; 'Leaving…'
          never renders. */}
      <GuardedConfirm
        title='Leave while uploading?'
        description={
          <span className='block'>
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            Uploads are still in flight. Leaving now cancels the ones that haven't finished.
          </span>
        }
        confirmLabel='Leave anyway'
        busyLabel='Leaving…'
        cancelLabel='Stay'
        pending={false}
        blockers={[]}
        open={blocker.status === 'blocked'}
        onOpenChange={(next) => {
          if (!next && blocker.status === 'blocked') {
            blocker.reset?.();
          }
        }}
        onConfirm={() => {
          cancelAllUploads();
          blocker.proceed?.();
        }}
      />
```

- [ ] **Step 7: Gates + commit**

`pnpm --filter @sevendays/admin fix` → `test -- --run` (**23 files / 240 tests** unchanged — Task 2 adds no suite) → `typecheck` → `pnpm --filter @sevendays/admin build` (the #218 ruling: the production build joins the per-task checks when the screen's module graph gains an import). Commit:

```bash
git add apps/admin/src/components/cms/shared.tsx apps/admin/src/components/gallery/gallery-screen.tsx
git commit -m "feat(admin): upload maturation wired - drag-and-drop onto the grid, whole-run cancel, the both-classes leave guard (#220)"
```

### Task 3: The owner-reacted variants round + the both-classes leave-guard proof (controller interaction)

The ticket's second and third ACs: "The leaving-guard proven for both navigation classes (in-app route + browser unload)" and "Owner-reacted rendered variants, both themes." Light is judged first, the dark counterpart in the same round (#162's ruling). This round is the design gate for the five `TODO(owner-copy)` strings and the overlay's first-cut composition.

**Files:**
- Modify (only if the round retunes): `apps/admin/src/components/gallery/gallery-screen.tsx` (copy/classes), `apps/admin/src/components/cms/shared.tsx` (only if the stay-side label retunes)
- Write: the evidence dir `.superpowers/sdd/2026-10-17-220-upload-ui-maturation/` (captures, the guard-proof narration, the rulings)

**Interfaces:** none new — string/class-level retunes and evidence only.

**Not here:** the milestone-level "Verify: owner-accepted rendered variants" checkbox in `docs/plan.md` (that box is the close-out ticket's — this round is evidence toward it); any seam/suite change (no pinned string rides a suite); any other screen; any API surface.

- [ ] **Step 1: Seed the states and capture both themes**

Run the admin dev server (`pnpm --filter @sevendays/admin dev`). Prepare 4–6 real JPG files locally for batch drags. All states are produced through the UI itself — uploads are real (they ride the live dev stack's presign/PUT/commit); cleanup after the round deletes the uploaded photos through the CMS (the #213 guarded delete), and a canceled batch leaves zero rows by construction (nothing canceled is promoted). Capture, in BOTH themes (the topbar toggle):

1. **The armed drop zone** — drag the file selection over the grid (hold the hover): the dashed overlay + hint; capture on the populated grid AND on an empty category (its EmptyState is inside the zone).
2. **The tray mid-batch** — drop a batch of 5–6 JPGs: the tray with per-row progress, the **Cancel** button present, **Done** disabled while unsettled.
3. **Canceled rows** — drop another batch and hit **Cancel** mid-flight: rows flip to Canceled, no Retry on them, the tray stays (Done now enabled), no new cards appear for canceled rows.
4. **The leave dialog** — start another batch, then click a sidebar link (e.g. Packages) while unsettled: the "Leave while uploading?" dialog over the blocked navigation. Capture BOTH answers being exercised (see Step 2).
5. **The picker unchanged** — re-verify the header's `Upload photos` label + `JPG files up to 50 MiB.` line still open the same picker and enqueue the same tray.

Save every capture to the evidence dir.

- [ ] **Step 2: Prove the leaving guard for BOTH navigation classes (AC 2, narrated to the evidence dir)**

**In-app route (the blocker):** with an upload unsettled, click a sidebar link → the dialog blocks. (a) **Stay** → the dialog closes, navigation does NOT happen, uploads continue to done. (b) **Leave anyway** → navigation proceeds, the canceled rows settle (the run aborted), and NO photo row appears for the canceled items; re-entering Gallery shows the tray gone (it never persisted — state is per-visit) and the photos list carries only what had already committed. Narrate what you observed, with the count arithmetic (dropped N, committed M, canceled N−M, cards M).

**Browser unload (beforeunload):** with an upload unsettled, hit reload (or close the tab) → the NATIVE browser prompt appears (not themeable — narrate, don't screenshot if the environment can't). Choose Stay → the page and uploads continue. Then let everything settle (or cancel) and reload again → NO prompt (the guard keys on `hasUnsettled`, not on the tray ever having existed). Narrate both legs.

- [ ] **Step 3: The owner reacts; apply the rulings**

Present the captures (light first, dark in the same round). Record the rulings in the evidence dir. Then apply: (a) any copy retune edits `gallery-screen.tsx`'s pinned strings (the overlay hint, Cancel, Canceled, the dialog title/description/Stay) in place — the confirm label `Leave anyway` is spec-verbatim and changes only if the owner explicitly re-rules it; (b) any class retune edits the overlay/tray compositions (e.g. the overlay's weight, the ring vs dashed border); (c) the five `TODO(owner-copy)` markers retire as ruled — each replaced by a dated note in the house shape (`// (owner-reacted 2026-10-XX, #220's variants round): …`); a marker survives verbatim only where the owner explicitly defers. If a retune lands interactive text on tailwind palette classes (off-token), re-measure contrast first (≥ 4.5 for text, the #218 one-liner discipline); the composed classes are token-based by construction, so this only triggers on a deliberate off-token retune.

- [ ] **Step 4: Cleanup + gates + commit**

Delete the round's uploaded photos through the CMS (guarded delete, one per row — the list re-verifies empty). `pnpm --filter @sevendays/admin fix` → `test -- --run` (**23 files / 240 tests** — copy retunes touch no suite) → `typecheck`. Commit (skip if the round changed nothing — then fold Steps 1–2's evidence into Task 4):

```bash
git add apps/admin/src/components/gallery/gallery-screen.tsx apps/admin/src/components/cms/shared.tsx
git commit -m "chore(admin): the upload-maturation variants round settled - copy and overlay as ruled, both themes (#220)"
```

### Task 4: Gates, docs rotation, PR, v1 pick, issues, graphify

- [ ] **Step 1: The full check**

`pnpm check` (lint + format + typecheck + test across the repo — green; the only touched package is admin, everything else is floor-unchanged: types 17/167, api 31 files 422+3, api-client 5/45, landing 10/92, admin **23/240**).

- [ ] **Step 2: `docs/plan.md` — ONE box tick (pinned edit)**

`docs/plan.md:178` flips from `- [ ] Admin — upload UI maturation (#165): …` to `- [✅]` with this annotation appended at its line's end:

```text
 _(2026-10-XX, #220: drag-and-drop onto the grid and the picker both enqueue through one seam (AR-11); whole-run Cancel over the pool's new AbortSignal — every unsettled item settles canceled, never a retry, nothing canceled is promoted, a commit in flight stands; the leaving guard on both navigation classes — the router-blocker dialog (Leave anyway aborts then proceeds; Stay resets) + the native beforeunload — over one hasUnsettledUploads predicate; Done clears only a settled tray; both classes proven live on the dev stack; owner-reacted both themes)_
```

Nothing else in the M7 block changes — the milestone-level "Verify: owner-accepted rendered variants" box stays unticked (the close-out ticket's).

- [ ] **Step 3: `docs/progress.md` + `AGENTS.md`**

(a) progress.md gains a dated entry (newest first, the #219 entry's shape) narrating: the abort law (the pre-#220 retry trap it closes), the shared enqueue + file-drag gate, the tray vocabulary (Cancel, Canceled rows hold the tray, Done-guarding), the both-classes guard with its one predicate, the live proofs, the round's outcome, and the floors (admin 23/240). (b) AGENTS.md, two edits: in *Current status of `pnpm test`*, the admin sentence's floor clause `admin floor 23 files / 229 tests (…; + #219's two expanded-row seams — package-expanded-row, peso)` becomes `admin floor 23 files / 240 tests (…; + #219's two expanded-row seams — package-expanded-row, peso; + #220's upload-maturation seams — the abort law, the tray/guard predicates, the shared enqueue + file-drag gate)`; and in the Engineering Rules block, one sentence appended after the expanded-row sentence: `Upload UI maturation is live (M7 #220): drag-and-drop onto the gallery grid beside the unchanged picker, whole-run cancel over the pool's abort seam (canceled never retries, nothing canceled is promoted), and the leaving-mid-upload guard on both navigation classes (the router-blocker dialog + the native beforeunload) over one unsettled predicate — Done clears only a settled tray.`

- [ ] **Step 4: The docs commit**

```bash
git add docs/plan.md docs/progress.md AGENTS.md
git commit -m "docs(m7): #220 closes upload UI maturation - plan box, progress entry, AGENTS floors (#220)"
```

- [ ] **Step 5: PR + squash merge**

Push `feat/220-upload-ui-maturation`; open the PR against main titled `Upload UI maturation — drag-and-drop, in-flight cancel, the leave guard (#220)`; body: the three ACs each answered with its evidence pointer (the seam-suite output for AC 1 + the picker-unchanged capture; the Step-2 both-classes narration for AC 2; the both-themes captures + the owner's rulings for AC 3). Squash-merge.

- [ ] **Step 6: The v1 pick (pre-ruled PICK clean)**

Per the spec's class ledger (the CMS UX system row: "interaction ticket, expanded row, upload UI — **PICK clean** — Admin surfaces exist on both editions") and `docs/agents/v1-picks.md`: run `node scripts/v1-triage.mjs <main-sha>` — every code path this ticket touches is `apps/admin/**` (both editions carry the admin verbatim), so the expected verdict is **pick** with zero content-drops; the docs files (`docs/**`, `AGENTS.md`, `graphify-out/`) are main-only per the runbook and never pick. Execute the pick per the runbook (cherry-pick `-x`, `pnpm check` + `pnpm build` green, the export audit exit 0, push, CI green). Append the ledger row (date, PR #, main SHA, `pick`, v1 SHA, the one-line summary: "#220 — M7 ticket 09, upload UI maturation: drag-and-drop onto the grid, whole-run cancel over the abort seam (canceled never retries, nothing canceled is promoted), the both-classes leave guard"). Commit the ledger on main.

- [ ] **Step 7: Issue closes + graphify**

Close #220 with a comment mapping each AC to its evidence (the seam suite + picker capture; the both-classes narration; the both-themes round). On #152 (still open), leave the absorption comment — its upload-cancellation checkbox is NOT ticked (the item's wording says "cover + batch XHR paths"; this ticket landed the batch half; the cover path stays sheet-internal under #218's `Uploading…` pending — no cover cancel affordance is ruled; the timeout half was never ruled): one dated comment saying exactly that, linking #220. Then `graphify update .` and commit the graph churn (`chore(graphify): post-#220 graph update (code modified: the gallery upload surface across admin)`).
