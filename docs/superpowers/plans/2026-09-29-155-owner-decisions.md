# Owner-decision follow-ups — error postures, bulk counts, leak-safe 503, checkbox ruling (#155) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the four owner-ruled #155 items: admin screens answer a failed query with the ratified error line + Retry (and the package editor's 404 gets its own ruled line + back link) instead of skeleton-forever; the bulk deactivate confirm counts eligible rows; the API answers `MissingR2CredentialsError` with a leak-safe curated 503; and `packages/ui`'s checkbox renders the ruled indeterminate glyph — then record the rulings (frames + issue rotation + docs + v1 pick).

**Architecture:** Three small code fronts plus bookkeeping. Admin: a shared `QueryErrorState` composition in `cms/shared.tsx` wired as an `isError` sibling ahead of every screen's `isPending` branch (8 files incl. the editor's 404-vs-failure split on `ApiClientError.status`), and a tiny pure seam `bulk-counts.ts` (owner-ratified confirm-name formats, lib-seam tested) consumed by the three bulk screens. API: the root `onError` grows one typed arm — `MissingR2CredentialsError` → `serviceUnavailable(c, 'Media uploads are not configured.')` (503), everything else keeps the uniform 500; TDD'd by flipping the existing missing-creds test. UI: one deliberate `data-indeterminate:border-primary` class on the shared checkbox (the check-in-unfilled-box ruling; Base UI already renders the check for indeterminate). Evidence per the #111 discipline: rendered frames (gitignored) + the rulings posted to #155 for owner reaction.

**Tech Stack:** TanStack Start admin (React Query `isError`/`refetch` postures), Hono root `onError` envelope (`services/errors.ts`), `packages/ui` checkbox on `@base-ui/react` 1.8.0 (`data-indeterminate`), Vitest 4 (admin lib-seam suite + the api integration suite over the compose test DB), raw CDP frames harness (throwaway, gitignored), GitHub CLI + `scripts/v1-triage.mjs`.

**Spec:** GitHub issue #155 (split out of #152; full disposition table in `docs/superpowers/plans/2026-09-27-143-m5-09-closeout.md` Task 5). **Every copy string and design choice below is owner-ratified verbatim from the 2026-09-29 clarify session** (four standalone questions, one call — recorded in Global Constraints). Item provenance: #139 T5/T6 (query-error postures), #139 §4 (the owner flag the 503 answers — "Whether the loud message should survive to the client is your call"), #140 T4 (checkbox glyph), #140 T5 M3 (bulk-bar counts). Discipline refs: spec #94 amendment / ruling #111 (rendered variants the owner reacts to), ADR-0006 (the envelope), ADR-0017 (the primitive ruling), `docs/agents/v1-picks.md` (the pick).

## Recon state this plan starts from (verified live 2026-09-29, pre-plan)

- **Main is at `0676d89`** (the #154 v1-picks ledger commit). Milestone 5 is closed; #154 paid the api-suite debt. All files below verified read on this commit.
- **Baseline floors (pinned by the #154 plan, closed same day):** types **13 files / 112 tests**; api-client **5 / 33**; api **23 passed + 1 skipped (24) files / 290 passed + 3 skipped (281)**; landing **8 / 69**; admin **5 / 51**; `pnpm check` = **35/35**; `pnpm build` = **7/7**.
- **Item 1 — the skeleton-forever sites, verified in code.** Every list surface gates on `isPending || !data`: a failed query flips `isPending` false but leaves `data` undefined, so the `|| !data` arm holds the skeleton forever. Exact shapes:
  - `branches-screen.tsx:82` destructure / `:312` ternary `{isPending || !branches ? (`.
  - `addons-screen.tsx:135-139` (two query objects; `isPending = addonsQuery.isPending || servicesQuery.isPending`) / `:472`.
  - `studio-services-screen.tsx:127-131` (services + branches queries) / `:447`.
  - `testimonials-screen.tsx:203` / `:443`.
  - `lookups-screen.tsx:115-116` (two destructured queries) feeding `PrintSizesSection` (`:540`, `isPending` prop) and `AttiresSection` (`:776`, same) rendered at `:386`/`:394`.
  - `packages-table.tsx:56` / early return `:123`.
  - `gallery-screen.tsx:627-630` (categories + photos) / early return `:1078`.
  - `package-editor.tsx:271-276` (`packageQuery` disabled in create mode; two lookup queries) / the pending block at `:617-647` — on a 404 the read errors, `state` stays `null`, the skeleton holds: the editor-404 case #139 named. `useNavigate` is already in scope (`:560` pins the `void navigate({ to: … })` idiom); the file has NO `@sevendays/api-client` import today (adds one — `ApiClientError` is exported there; `admin.functions.ts:9` is the precedent).
- **Item 2 — the counts, verified in code.** The bulk bar lives in branches/addons/studio-services only (grep-verified). All three carry the identical block: `{/* AQ-3: … */} <DeactivateConfirm name={\`${selected.size} items\`}` (branches `:587-590`, addons `:789-792`, studio-services `:756-759`) — the raw selection count. The toast counts ELIGIBLE-only flips (`branches-screen.tsx:190-216`: targets are `selected.has(row.id) && row.isActive !== next`; success toast `` `Deactivated ${outcome.count} items.` ``). Reactivate fires from the bar with NO confirm dialog — only the deactivate confirm changes. The dialog title is `Deactivate {name}?` (`shared.tsx:379`).
- **Item 3 — the masking path, verified in code.** `apps/api/src/index.ts:23-26` — the root `onError` logs `` console.error(`[api] ${c.req.method} ${c.req.path} failed:`, error) `` then returns `internalError(c)` (the uniform `500 {"error":"Internal server error."}`). `apps/api/src/services/media.ts:32-43` — `MissingR2CredentialsError` carries the loud message (env var names + runbook path: exactly what must never reach the response); it is thrown ONLY by `presignUpload` when the `R2_S3_*` pair is absent. The pinning test: `apps/api/test/media-routes.test.ts:163-178` (500 + a console-spy assert that the `[api]` log line fired). `error-seam.test.ts:54/62` pin unknown-throws-500 — both stay green. `apiErrorSchema` (`packages/types/src/api-error.ts:6-9`) is `{ error, details? }` — untouched by the ratified option (no new envelope fields).
- **Item 4 — the glyph, verified in code + probed in the installed package.** `packages/ui/src/components/checkbox.tsx` renders `CheckIcon` only, styled by root `data-checked:` variants. `@base-ui/react` resolved at **1.8.0**: `indeterminate?: boolean` root prop (`checkbox/root/CheckboxRoot.d.ts:88`); `data-indeterminate` attribute (`checkbox/root/CheckboxRootDataAttributes.d.ts:12`); the Indicator renders when `checked || indeterminate` (`checkbox/indicator/CheckboxIndicator.js:31`); the `checked` attribute mapping returns EMPTY in the partial state (runtime-verified: `getCheckboxStateAttributesMapping.js`), so an indeterminate box carries only `data-indeterminate` over an unfilled background — **today a partial selection is already a check in an unfilled-but-unstyled gray box (incidental), and the ruling makes it deliberate: primary border, check stays**. The only indeterminate consumer is `BulkSelectHeader` (`cms/bulk-bar.tsx:29-34`, grep-verified); its JSDoc still says "a partial selection reads as a dash" (stale vs the ruling — rewritten in Task 5).
- **No component/DOM tests exist** in admin or ui (admin is lib-seam only, per #143) — the UI tasks gate on typecheck/lint + the Task 6 frames; the bulk-count seam is pure and gets lib-seam tests. `packages/ui/package.json` has no `test` script (build/lint/format/typecheck only) — `pnpm check` stays 35/35.
- **Copy conventions, verified:** no apostrophes exist in UI copy today; the two ratified lines carry the **typographic apostrophe U+2019** (`Couldn’t`, `doesn’t`) — pinned verbatim in Global Constraints. Import alias is `#/components/...` / `#/lib/...`. `shared.tsx` already imports `Button` (`:20`) and exports `EmptyState` (`:87-94`) — `QueryErrorState` composes both.
- **`docs/progress.md` structure:** `## What Exists` (`:60`) → `## Known Gaps / Not Yet Done` (`:209`) — the Task 6 entry appends at the What Exists tail. `docs/plan.md` has no #152/#155 checkbox (post-milestone debt; the issues own the tracking) — nothing ticks there.

## Global Constraints

- **Owner-ratified strings, VERBATIM (2026-09-29 clarify — one call, four standalone questions; never re-worded, never "fixed"):**
  1. **Query-error line:** `Couldn’t load this page.` — the apostrophe is **U+2019**, never the ASCII straight quote (biome's single-quote style would need escaping otherwise; do not normalize it).
  2. **Editor 404 line:** `This package doesn’t exist or was removed.` (U+2019) + a `Back to packages` button (`void navigate({ to: '/packages' })`, `variant='outline'`, NO Retry — retrying a 404 is a lie).
  3. **Retry button:** label `Retry`, `variant='outline'`, re-runs the failed query(ies) via `refetch()`.
  4. **Bulk confirm name:** every row eligible → `` `${n} items` ``; a split → `` `${m} of ${n} selected items` `` (title reads `Deactivate {name}?`). **Plural only, no singular branch** (a conscious keep — the bar's `{n} selected` matches). The success toast is UNCHANGED.
  5. **Leak-safe 503:** `MissingR2CredentialsError` → **503** `{"error":"Media uploads are not configured."}` exactly — no `code` field, no `details`, no env names, no runbook paths in the response; the loud class message stays **log-only**; every other throw keeps the uniform 500.
  6. **Checkbox ruling:** check-in-unfilled-box — the glyph stays `CheckIcon`; the indeterminate box gains `data-indeterminate:border-primary` (check + unfilled background unchanged). `aria-checked="mixed"` is Base UI's own and stays.
- **Scope fence ("not here"):** the position race, upload cancellation/timeout (AbortController), and the Zod `.default(true)` reactivation fence stay deferred on #152; no api-suite additions (#154 closed that); no M5.5 users page / M6 work; no new envelope fields; no packages/ui test infrastructure; no singular copy anywhere; no changes to `DeactivateConfirm`'s body/description copy.
- **Gates, per task:** the touched workspaces' `pnpm --filter <ws> typecheck` is a HARD gate (zero errors) before any commit; `pnpm --filter <ws> lint` + `format` clean on touched files (`pnpm --filter <ws> fix` sorts the new imports); the touched workspace's `pnpm --filter <ws> test` green. Full `pnpm check` (**35/35**, unchanged — no new workspace scripts) + `pnpm build` (**7/7**) before the PR (Task 7).
- **Baselines and counts:** admin **5 files / 51 tests** → expected **6 / 55** after Task 3 (+1 file, +4 tests — the only test additions in this plan). api stays **290 passed + 3 skipped / 24 files** (Task 4 MODIFIES one test, adds none). Landing/api-client/types untouched. **Count-reconciliation rule:** if execution merges or splits an `it`, the RUN OUTPUT is the truth — update the count quoted here and Task 6's docs text to the actual before committing.
- **Fresh-clone order (house):** `pnpm install && pnpm build:packages` before any typecheck — `@sevendays/config/vitest` is a built entry and the api-client resolves the API's `AppType` from the built `dist/`.
- **Never commit secrets.** Frames, scripts, and creds live only in gitignored `.superpowers/` (Task 6 uses `.superpowers/sdd/2026-09-29-155-owner-decisions/`); `VERIFY_STAFF_EMAIL`/`VERIFY_STAFF_PASSWORD` values are never printed or committed. Evidence records PASS/FAIL lines and email-as-name only.
- **The rendered-variant discipline (#111):** Task 6 captures the four frames and posts them + the rulings to #155 — the owner reacts at will; the ratified strings land regardless (they ARE the reaction's record, ratified in advance).
- **Docs house rules:** checklist ticks in `docs/*.md` are `- [✅]`, never `[x]`; GitHub issue checkboxes flip with `- [x]` (GitHub's own rendering — the ✅ rule is for repo docs only). `docs/progress.md` is main-only; every squash-merged PR gets its v1 triage (`docs/agents/v1-picks.md`). AGENTS.md edits stay edition-free (no v1/main naming) so the pick's content pass can take them clean.
- **Base-UI version pin:** `@base-ui/react` **1.8.0** (the facts in the recon section were probed against it).
- **No new dependencies.** No new files outside `apps/admin/src/lib/bulk-counts.ts` + `.test.ts` and the gitignored frames script.
- **Plan file target:** `docs/superpowers/plans/2026-09-29-155-owner-decisions.md` (this file).

---

### Task 1: `QueryErrorState` + the seven list surfaces' error posture

**Files:**
- Modify: `apps/admin/src/components/cms/shared.tsx` (two exported constants + one component, after `EmptyState`)
- Modify: `apps/admin/src/components/branches/branches-screen.tsx`
- Modify: `apps/admin/src/components/addons/addons-screen.tsx`
- Modify: `apps/admin/src/components/studio-services/studio-services-screen.tsx`
- Modify: `apps/admin/src/components/testimonials/testimonials-screen.tsx`
- Modify: `apps/admin/src/components/lookups/lookups-screen.tsx` (both queries, both render sites, both section components)
- Modify: `apps/admin/src/components/packages/packages-table.tsx`
- Modify: `apps/admin/src/components/gallery/gallery-screen.tsx`

**Interfaces:**
- Consumes: `EmptyState` and `Button` (already in `shared.tsx`); each screen's existing `useQuery` result (`isError`, `refetch` join the destructures).
- Produces: `QUERY_ERROR_LINE: string` and `PACKAGE_NOT_FOUND_LINE: string` (ratified copy constants — Task 2 consumes the latter), and `QueryErrorState({ line, onRetry?, children? })` — every consumer in this plan and any future screen.

- [ ] **Step 0: Cut the branch and re-pin the baseline**

```bash
cd /home/jeius/Projects/sevendays
git checkout main && git pull --ff-only
git log --oneline -1   # expect 0676d89 or later
git checkout -b feat/155-owner-decisions
pnpm install && pnpm build:packages
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests "
```

Expected: admin `5 passed (5)` files / `51 passed (51)` tests. If the floor moved, record the new floor in the PR body (Task 7) and re-derive Task 3's expected count from it.

- [ ] **Step 1: The ratified copy constants + `QueryErrorState` in `shared.tsx`**

Insert immediately after the `EmptyState` function's closing `}` (before the `Collapse` JSDoc), verbatim:

```tsx
/** Owner-ratified 2026-09-29 (#155): the admin list-screens' failed-read line. */
export const QUERY_ERROR_LINE = 'Couldn’t load this page.';

/** Owner-ratified 2026-09-29 (#155): the package editor's not-found line. */
export const PACKAGE_NOT_FOUND_LINE = 'This package doesn’t exist or was removed.';

/**
 * The query-error posture (#155 ruling): a failed read renders this — never
 * the skeleton-forever the `|| !data` pending arm would otherwise hold. The
 * line and the Retry affordance are owner-ratified copy; onRetry re-runs the
 * caller's failed query(ies). The not-found variant (the editor's 404) passes
 * NO onRetry and a child action instead — retrying a 404 is a lie.
 */
export function QueryErrorState({
  line,
  onRetry,
  children,
}: {
  line: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <EmptyState line={line}>
      <div className='flex items-center justify-center gap-2'>
        {onRetry ? (
          <Button variant='outline' type='button' onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        {children}
      </div>
    </EmptyState>
  );
}
```

Both constants use U+2019 (’) — copy them from this file, never retype as ASCII.

- [ ] **Step 2: Wire `branches-screen.tsx`**

Import: add `QueryErrorState` and `QUERY_ERROR_LINE` to the `#/components/cms/shared` block (biome sorts; `pnpm --filter @sevendays/admin fix` settles order). Destructure:

```ts
  const { data: branches, isPending, isError, refetch } = useQuery(adminBranchQueries.all());
```

The ternary at `:312` — insert the error arm ahead of the pending arm:

```tsx
      {isError ? (
        // Error posture (#155): a failed read answers the ruled line +
        // Retry — never the skeleton-forever (the pending arm's `|| !data`
        // would otherwise hold the skeleton on a failed query).
        <QueryErrorState line={QUERY_ERROR_LINE} onRetry={() => { void refetch(); }} />
      ) : isPending || !branches ? (
```

- [ ] **Step 3: Wire `addons-screen.tsx` and `studio-services-screen.tsx` (two-query screens)**

In each, after the existing `const isPending = …` line, add the error aggregate + retry-all:

```ts
  const isError = addonsQuery.isError || servicesQuery.isError;
  const refetchReads = () => {
    void addonsQuery.refetch();
    void servicesQuery.refetch();
  };
```

(studio-services: `servicesQuery.isError || branchesQuery.isError` and the two matching `refetch()` calls.) Then insert ahead of each screen's `{isPending || !addons ? (` / `{isPending || !services ? (`:

```tsx
      {isError ? (
        <QueryErrorState line={QUERY_ERROR_LINE} onRetry={refetchReads} />
      ) : isPending || !addons ? (
```

- [ ] **Step 4: Wire `testimonials-screen.tsx` and `packages-table.tsx` (single-query screens)**

testimonials — destructure `const { data: testimonials, isPending, isError, refetch } = useQuery(adminTestimonialQueries.all());` and insert ahead of `:443`'s ternary:

```tsx
      {isError ? (
        <QueryErrorState line={QUERY_ERROR_LINE} onRetry={() => { void refetch(); }} />
      ) : isPending || !testimonials ? (
```

packages-table — same destructure pattern at `:56`, then an early return ahead of `:123`:

```tsx
  if (isError) {
    return <QueryErrorState line={QUERY_ERROR_LINE} onRetry={() => { void refetch(); }} />;
  }

  if (isPending || !packages) {
```

- [ ] **Step 5: Wire `lookups-screen.tsx` (two queries → two section props)**

Destructures at `:115-116` become:

```ts
  const { data: printSizes, isPending: sizesPending, isError: sizesError, refetch: refetchSizes } =
    useQuery(adminLookupQueries.printSizes());
  const { data: attires, isPending: attiresPending, isError: attiresError, refetch: refetchAttires } =
    useQuery(adminLookupQueries.attires());
```

Render sites — `PrintSizesSection` gains `isError={sizesError}` and `onRetry={() => { void refetchSizes(); }}` after its `isPending={sizesPending}` line; `AttiresSection` gains `isError={attiresError}` and `onRetry={() => { void refetchAttires(); }}` after `isPending={attiresPending}`.

`PrintSizesSection` signature (`:540-554`) — add both props and their types:

```tsx
function PrintSizesSection({
  printSizes,
  isPending,
  isError,
  onRetry,
  expandedId,
  onToggle,
  onCreate,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  printSizes?: PrintSize[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  expandedId: string | null;
} & SizeSectionHandlers) {
```

Then insert ahead of its `if (isPending || !printSizes) {`:

```tsx
  if (isError) {
    // Error posture (#155) in the section's own card shell — the header
    // (and its create action) stay reachable while the read is failed.
    return (
      <Card className='rounded-lg'>
        <CardHeader>
          <CardTitle>Print sizes</CardTitle>
          <CardAction>
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              New print size
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <QueryErrorState line={QUERY_ERROR_LINE} onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

```

`AttiresSection` (`:776-790`) — the same two props in its destructure (between `isPending,` and `onCreate,`) and its type block (beside `isPending: boolean;`), then the same error branch ahead of its `if (isPending || !attires) {`, with `CardTitle` = `Attires` and the create button label `New attire` (byte-matching its own pending branch's header).

- [ ] **Step 6: Wire `gallery-screen.tsx`**

Destructures at `:627-630` gain `isError: categoriesError, refetch: refetchCategories` and `isError: photosError, refetch: refetchPhotos`. Insert ahead of the pending early return at `:1078`:

```tsx
  if (categoriesError || photosError) {
    // Error posture (#155): either read failed — Retry re-runs both.
    return (
      <section className='space-y-4'>
        <QueryErrorState
          line={QUERY_ERROR_LINE}
          onRetry={() => {
            void refetchCategories();
            void refetchPhotos();
          }}
        />
      </section>
    );
  }

```

- [ ] **Step 7: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test        # expect 5 files / 51 tests, unchanged
pnpm --filter @sevendays/admin typecheck   # HARD gate: 0 errors
pnpm --filter @sevendays/admin lint
git add apps/admin/src/components
git commit -m "feat(admin): query-error postures — the ruled line + Retry on every read surface (#155)"
```

**Not here:** the package editor (Task 2 owns its 404/failure split); the bulk confirm (Task 3); no `packages/ui` edits.

---

### Task 2: The package editor's 404 + failed-reads posture

**Files:**
- Modify: `apps/admin/src/components/packages/package-editor.tsx`

**Interfaces:**
- Consumes: Task 1's `QueryErrorState`, `QUERY_ERROR_LINE`, `PACKAGE_NOT_FOUND_LINE` (`#/components/cms/shared`); `ApiClientError` (`@sevendays/api-client`); the in-scope `navigate` (`useNavigate`, `:279`).
- Produces: nothing downstream — the editor's error postures are terminal UI.

- [ ] **Step 1: The imports**

Add the api-client import (the file has none today; biome sorts it with the workspace imports):

```ts
import { ApiClientError } from '@sevendays/api-client';
```

Extend the existing `#/components/cms/shared` import (`:71`, currently `import { StatusBadge } from '#/components/cms/shared';`) to:

```ts
import {
  PACKAGE_NOT_FOUND_LINE,
  QUERY_ERROR_LINE,
  QueryErrorState,
  StatusBadge,
} from '#/components/cms/shared';
```

- [ ] **Step 2: The error branches ahead of the pending block**

Insert immediately before the pending-posture comment block at `:615` (`// --- Pending posture: skeleton until the (create: two / edit: three)`), verbatim:

```tsx
  // --- Error postures (#155): a 404 on the edit read is the ruled
  // not-found line + Back (retrying a 404 is a lie); any OTHER failed read
  // (the package read failing non-404, or either lookup) is the standard
  // line + Retry over all failed queries. ---
  const notFound =
    mode === 'edit' &&
    packageQuery.isError &&
    packageQuery.error instanceof ApiClientError &&
    packageQuery.error.status === 404;
  const readFailed =
    printSizesQuery.isError ||
    attiresQuery.isError ||
    (mode === 'edit' && packageQuery.isError);

  if (notFound) {
    return (
      <QueryErrorState line={PACKAGE_NOT_FOUND_LINE}>
        <Button variant='outline' type='button' onClick={() => void navigate({ to: '/packages' })}>
          Back to packages
        </Button>
      </QueryErrorState>
    );
  }

  if (readFailed) {
    return (
      <QueryErrorState
        line={QUERY_ERROR_LINE}
        onRetry={() => {
          if (mode === 'edit') void packageQuery.refetch();
          void printSizesQuery.refetch();
          void attiresQuery.refetch();
        }}
      />
    );
  }

```

The `notFound` arm renders first: a 404 gets the back-link variant even when a lookup also failed — the not-found line is the truthful answer for the URL.

- [ ] **Step 3: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test        # expect 5 files / 51 tests, unchanged
pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin lint
git add apps/admin/src/components/packages/package-editor.tsx
git commit -m "feat(admin): package editor 404 + failed-read postures — the ruled lines (#155)"
```

**Not here:** no save-mutation error handling changes (the toasts own those); no packages-table changes (Task 1); create mode is untouched beyond `readFailed` (create has no package query).

---

### Task 3: The bulk confirm's eligible-aware count (TDD seam + three screens)

**Files:**
- Create: `apps/admin/src/lib/bulk-counts.ts`
- Test: `apps/admin/src/lib/bulk-counts.test.ts`
- Modify: `apps/admin/src/components/branches/branches-screen.tsx`
- Modify: `apps/admin/src/components/addons/addons-screen.tsx`
- Modify: `apps/admin/src/components/studio-services/studio-services-screen.tsx`

**Interfaces:**
- Consumes: nothing new (pure string formatting).
- Produces: `bulkConfirmName(selectedCount: number, eligibleCount: number): string` — the owner-ratified confirm-name formats, consumed by the three bulk screens' `DeactivateConfirm name` prop.

- [ ] **Step 1: Write the failing test — `apps/admin/src/lib/bulk-counts.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { bulkConfirmName } from './bulk-counts';

describe('bulkConfirmName (#155 owner-ratified formats)', () => {
  it('every selected row eligible: the plain count', () => {
    expect(bulkConfirmName(3, 3)).toBe('3 items');
  });

  it('a split: eligible of selected', () => {
    expect(bulkConfirmName(3, 2)).toBe('2 of 3 selected items');
  });

  it('none eligible: the honest zero split', () => {
    expect(bulkConfirmName(3, 0)).toBe('0 of 3 selected items');
  });

  it('plural only — a lone selection keeps the plural form (the bar’s `{n} selected` matches; no singular branch by ruling)', () => {
    expect(bulkConfirmName(1, 1)).toBe('1 items');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @sevendays/admin test`
Expected: FAIL — `Cannot find module './bulk-counts'` (or the resolver's equivalent) in the new file; the other 5 files' 51 tests green.

- [ ] **Step 3: Write the seam — `apps/admin/src/lib/bulk-counts.ts`**

```ts
/**
 * `#155 seam: bulk-confirm naming`. The bulk DeactivateConfirm's name
 * argument, owner-ratified 2026-09-29: when every selected row is
 * eligible the plain count reads; otherwise the eligible-of-selected
 * split — the confirm states what the action will actually do (the
 * success toast has always counted eligible-only flips). Plural only,
 * matching the bar’s `{n} selected`; no singular branch by ruling.
 */
export function bulkConfirmName(selectedCount: number, eligibleCount: number): string {
  return eligibleCount === selectedCount
    ? `${selectedCount} items`
    : `${eligibleCount} of ${selectedCount} selected items`;
}
```

- [ ] **Step 4: Run the suite to verify it passes**

Run: `pnpm --filter @sevendays/admin test`
Expected: **6 files passed (6) / 55 passed (55)** — the four new tests green. If the count differs, apply the count-reconciliation rule (Global Constraints) before committing.

- [ ] **Step 5: Wire the three bulk screens**

In each screen add the import `import { bulkConfirmName } from '#/lib/bulk-counts';`, then replace the identical bulk-confirm block. branches (`:587-590`) — from:

```tsx
      {/* AQ-3: the bulk confirm reuses the pinned dialog — the name argument
          carries the count, so the title reads `Deactivate 3 items?`. */}
      <DeactivateConfirm
        name={`${selected.size} items`}
```

to:

```tsx
      {/* AQ-3 + #155: the bulk confirm reuses the pinned dialog — the name
          argument is the eligible-aware count (owner-ratified): the title
          reads `Deactivate 3 items?` when every selected row will flip, and
          `Deactivate 2 of 3 selected items?` when some are already inactive
          (the toast has always counted eligible-only flips). */}
      <DeactivateConfirm
        name={bulkConfirmName(
          selected.size,
          (branches ?? []).filter((row) => selected.has(row.id) && row.isActive).length
        )}
```

addons (`:789-792`) and studio-services (`:756-759`) — the same comment + prop replacement with their own row lists: `(addons ?? []).filter(...)` and `(services ?? []).filter(...)` respectively (each mirrors its own `bulkFlip` targets predicate for `next === false`).

- [ ] **Step 6: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test        # expect 6 files / 55 tests
pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin lint
git add apps/admin/src/lib/bulk-counts.ts apps/admin/src/lib/bulk-counts.test.ts \
  apps/admin/src/components/branches/branches-screen.tsx \
  apps/admin/src/components/addons/addons-screen.tsx \
  apps/admin/src/components/studio-services/studio-services-screen.tsx
git commit -m "feat(admin): bulk deactivate confirm counts eligible rows — the ruled formats (#155)"
```

**Not here:** the reactivate path (no confirm dialog exists — the bar fires it directly); the toast copy (unchanged by ruling); `DeactivateConfirm`'s description body; lookups/testimonials/gallery (no bulk bar).

---

### Task 4: The leak-safe 503 — `MissingR2CredentialsError` answers a curated line (TDD flip)

**Files:**
- Modify: `apps/api/test/media-routes.test.ts` (flip the pinned test FIRST)
- Modify: `apps/api/src/services/errors.ts` (one helper)
- Modify: `apps/api/src/index.ts` (one typed arm in the root `onError`)
- Modify: `apps/api/src/services/media.ts` (the class JSDoc reword — its "answers the uniform 500" sentence is now false)

**Interfaces:**
- Consumes: `MissingR2CredentialsError` (`apps/api/src/services/media.ts:36-43`); the root `onError` (`apps/api/src/index.ts:23-26`).
- Produces: `serviceUnavailable(c: Context, message: string)` in `services/errors.ts` — the 503 envelope helper (status 503, the same `{ error }` shape, nothing else). No envelope/type surface changes anywhere (the ratified option adds no fields).

- [ ] **Step 1: Flip the test — `apps/api/test/media-routes.test.ts:163-178`**

Replace the test verbatim (title, the two expectations; the console spy and its assert stay — the loud log is the channel's other half):

```ts
  it('fails presign with the curated 503 + the loud log when the S3-token pair is absent (leak-safe detail, #155)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { token } = await signUpSession(url, 'presign-nocreds@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'gallery-photo', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      { ...testEnv(url), ...MEDIA_VARS }
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Media uploads are not configured.' });
    expect(spy.mock.calls.some((call) => String(call[0]).startsWith('[api]'))).toBe(true);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @sevendays/api test -- media-routes 2>&1 | tail -20`
Expected: FAIL — `expected 503, received 500` (and the body assertion against the curated line).

- [ ] **Step 3: The helper in `services/errors.ts`**

Add after `internalError`, verbatim:

```ts
/**
 * The leak-safe operator-detail channel (#155): a KNOWN deploy-time
 * misconfiguration answers a curated 503 line — stable, no env names, no
 * runbook paths — while the root onError's log keeps the loud detail.
 * Unknown throws keep the uniform 500.
 */
export function serviceUnavailable(c: Context, message: string) {
  return c.json({ error: message }, 503);
}
```

- [ ] **Step 4: The typed arm in the root `onError` — `apps/api/src/index.ts`**

Add the import beside `internalError`'s:

```ts
import { MissingR2CredentialsError } from './services/media.js';
import { internalError, serviceUnavailable } from './services/errors.js';
```

Replace the handler verbatim:

```ts
  .onError((error, c) => {
    console.error(`[api] ${c.req.method} ${c.req.path} failed:`, error);
    // Leak-safe detail channel (#155): the one deploy-time misconfiguration
    // operators must tell apart from generic infra failure answers a curated
    // 503 line; every other throw keeps the uniform 500. The loud detail
    // (secret names, runbook path) stays in the log above — never the
    // response.
    if (error instanceof MissingR2CredentialsError) {
      return serviceUnavailable(c, 'Media uploads are not configured.');
    }
    return internalError(c);
  })
```

- [ ] **Step 5: The `media.ts` class JSDoc reword**

The current doc says the route "does not catch this — the root onError logs it and answers the uniform 500". Replace the doc block verbatim:

```ts
/** Deploy-time misconfiguration (the BETTER_AUTH_SECRET posture): the route
 * does not catch this — the root onError logs the loud detail and answers
 * the curated 503 'Media uploads are not configured.' (#155's leak-safe
 * channel: operators distinguish missing tokens from generic infra failure;
 * env names never leave the Worker), so a Worker without the owner-minted
 * token fails presign loudly instead of silently handing out unsigned URLs. */
```

- [ ] **Step 6: Run the api suite + gates, then commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests "
# expect: 23 passed + 1 skipped (24) files / 290 passed + 3 skipped (281) tests — UNCHANGED (one test modified, none added)
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/api lint
git add apps/api/src/index.ts apps/api/src/services/errors.ts apps/api/src/services/media.ts \
  apps/api/test/media-routes.test.ts
git commit -m "feat(api): leak-safe 503 for missing media credentials — curated line, loud log (#155)"
```

`error-seam.test.ts:54/62` (unknown throws → uniform 500) must stay green — they are the channel's control group. The admin cover flow improves with no admin change: a creds-absent presign surfaces as `Upload failed: API 503: Media uploads are not configured.` (the ApiClientError message format the #139 evidence pinned).

**Not here:** no `code` field on the envelope (ratified out); no changes to `apiErrorSchema`/`packages/types`; no other typed errors folded in (this is the one operators flagged); the api-client is untouched.

---

### Task 5: The checkbox indeterminate ruling — the deliberate primary border

**Files:**
- Modify: `packages/ui/src/components/checkbox.tsx`
- Modify: `apps/admin/src/components/cms/bulk-bar.tsx` (the stale "dash" JSDoc)

**Interfaces:**
- Consumes: Base-UI 1.8.0's `data-indeterminate` root attribute (emitted alone in the partial state — the `checked` attribute mapping returns empty; recon-pinned into the installed runtime) and the Indicator's `checked || indeterminate` render rule.
- Produces: no API change — `Checkbox`'s props are untouched; the ruling is pure styling on the shared primitive.

- [ ] **Step 1: The ruling comment + the one class — `packages/ui/src/components/checkbox.tsx`**

Add the file-head comment above the imports, verbatim:

```tsx
// Indeterminate ruling (#155, ADR-0017): a partial selection renders the
// check in the UNFILLED box with a primary border — distinct from the
// filled full-check at a glance. Base UI 1.8.0's partial state emits ONLY
// `data-indeterminate` (the `checked` attribute mapping returns empty), so
// the box keeps its unfilled background, and the Indicator renders for
// checked OR indeterminate — the glyph needs no swap, only the deliberate
// border. `aria-checked="mixed"` is Base UI's own and stays.
```

In the Root's class string, insert `data-indeterminate:border-primary` between the border and fill classes — replace:

```
data-checked:border-primary data-checked:bg-primary
```

with:

```
data-checked:border-primary data-indeterminate:border-primary data-checked:bg-primary
```

(That exact two-class sequence is unique in the string — the other `data-checked:border-primary` occurrences carry prefixes and different neighbors.)

- [ ] **Step 2: The stale "dash" JSDoc in `bulk-bar.tsx` — replace the sentence**

Replace the `BulkSelectHeader` doc block's middle sentences, verbatim — from:

```tsx
 * The select-all header checkbox. `indeterminate` rides Base-UI's root prop
 * (present at @base-ui/react 1.8.0 — probed per the #140 plan): a partial
 * selection reads as a dash, not a lie. The next state is computed from the
 * counts, never from the event, so the toggle is authoritative against stale
 * checkbox state.
```

to:

```tsx
 * The select-all header checkbox. `indeterminate` rides Base-UI's root prop
 * (present at @base-ui/react 1.8.0 — probed per the #140 plan): a partial
 * selection reads as the ruled indeterminate glyph — the check in an
 * unfilled, primary-bordered box (#155) — never a full filled check. The
 * next state is computed from the counts, never from the event, so the
 * toggle is authoritative against stale checkbox state.
```

- [ ] **Step 3: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/ui typecheck && pnpm --filter @sevendays/ui lint && pnpm --filter @sevendays/ui fix
pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin test   # floors: 6 files / 55 tests
git add packages/ui/src/components/checkbox.tsx apps/admin/src/components/cms/bulk-bar.tsx
git commit -m "feat(ui): indeterminate checkbox ruling — check in the unfilled, primary-bordered box (#155)"
```

(`packages/ui` has no test script — typecheck + lint are its gates; the visual proof is Task 6's frames.)

**Not here:** no glyph swap to `MinusIcon` (ruled out); no `packages/ui` test infrastructure; no changes to `BulkSelectHeader`'s logic (the counts-based toggle was never in question); the editor `isActive` checkboxes (never indeterminate) are untouched.

---

### Task 6: The rendered-variant frames, the rulings record, and the docs rotation

**Files:**
- Create: `.superpowers/sdd/2026-09-29-155-owner-decisions/frames.mjs` (gitignored — never committed)
- Modify: `AGENTS.md` (the admin-suite sentence + the media-seam sentence)
- Modify: `docs/progress.md` (one dated entry at the What Exists tail)
- Modify (via `gh`): issues #155 and #152 checkbox bodies + the rulings comment

**Interfaces:**
- Consumes: Tasks 1-5's landed surfaces; `apps/landing/scripts/verify/lib.mjs` (`connect` → `{ send, evaluate, wait, go, text, close }`); a provisioned staff row (`VERIFY_STAFF_EMAIL`/`VERIFY_STAFF_PASSWORD` — `docs/staff-provisioning.md`; reuse the verify-agent row from the #139-#143 runs or re-provision per the runbook).
- Produces: the four frames (`list-error.png`, `editor-404.png`, `indeterminate-glyph.png`, `bulk-confirm-split.png`) + the rulings comment on #155 — the #111-discipline evidence for owner reaction.

- [ ] **Step 1: Write the frames script — `.superpowers/sdd/2026-09-29-155-owner-decisions/frames.mjs`**

Full file:

```js
// #155 rendered-variant frames (the #111 discipline): list-error, editor
// 404, indeterminate glyph, bulk-confirm split. Throwaway owner evidence —
// gitignored, never committed. Stack: headless Chrome :9222 (dedicated
// user-data-dir), admin :3000 (its dev script's port; landing NOT running),
// api :8787 (plain `wrangler dev` — no media leg, no bucket needed).
// Env: VERIFY_STAFF_EMAIL / VERIFY_STAFF_PASSWORD (docs/staff-provisioning.md).
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { connect } from '../../../apps/landing/scripts/verify/lib.mjs';

const ADMIN = process.env.ADMIN_VERIFY_URL ?? 'http://localhost:3000';
const email = process.env.VERIFY_STAFF_EMAIL;
const password = process.env.VERIFY_STAFF_PASSWORD;
if (!email || !password) {
  console.error('FAIL VERIFY_STAFF_EMAIL/VERIFY_STAFF_PASSWORD not set (docs/staff-provisioning.md)');
  process.exit(1);
}
const out = (name, data) => {
  writeFileSync(new URL(`./${name}`, import.meta.url), Buffer.from(data, 'base64'));
  console.log(`FRAME ${name}`);
};
const prompt = async (msg) => {
  process.stdout.write(`\n>>> ${msg}\n>>> press Enter when done: `);
  await createInterface({ input: process.stdin, output: process.stdout }).question('');
};
let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
  if (!cond) failures += 1;
};

const cdp = await connect(process.env.CDP_HTTP ?? 'http://127.0.0.1:9222');
try {
  // Sign in through the real /login form (React controlled inputs need the
  // native setter; a bare .value assignment never reaches state).
  await cdp.go(`${ADMIN}/login`);
  await cdp.evaluate(
    `(async () => {
      const set = (el, v) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const email = document.querySelector('input[type=email], input[name=email]');
      const pass = document.querySelector('input[type=password]');
      if (!email || !pass) throw new Error('login fields not found');
      set(email, ${JSON.stringify(email)});
      set(pass, ${JSON.stringify(password)});
      document.querySelector('button[type=submit]')?.click();
    })()`
  );
  await cdp.wait(2000);
  const afterLogin = await cdp.text();
  check('signed in (login form left behind)', !afterLogin.includes('Sign in'));

  // Frame 1 — list-error: load with the API UP, then the operator stops it,
  // then a client-side nav makes the read fail. The shell gate already ran
  // (parent loader not re-run between shell children) so the error state,
  // not a login bounce, is what renders.
  await cdp.go(`${ADMIN}/packages`);
  await cdp.wait(1500);
  await prompt('STOP the api worker now (Ctrl-C its terminal) — the admin + Chrome stay up');
  await cdp.evaluate(`document.querySelector('a[href="/branches"]')?.click()`);
  await cdp.wait(2000);
  const errText = await cdp.text();
  check('list-error line renders', errText.includes('Couldn’t load this page.'));
  check('Retry button renders', errText.includes('Retry'));
  out('list-error.png', (await cdp.send('Page.captureScreenshot', { format: 'png' })).data);

  // Frame 2 — editor 404 (API back up).
  await prompt('RESTART the api worker now, wait for it to be ready');
  await cdp.go(`${ADMIN}/packages/00000000-0000-4000-8000-00000000dead/edit`);
  await cdp.wait(2000);
  const nfText = await cdp.text();
  check('editor 404 line renders', nfText.includes('This package doesn’t exist or was removed.'));
  check('Back to packages renders', nfText.includes('Back to packages'));
  out('editor-404.png', (await cdp.send('Page.captureScreenshot', { format: 'png' })).data);

  // Frames 3+4 — on /branches: partial selection (glyph), then stage one
  // deactivation so select-all yields the eligible split (confirm captured,
  // CANCELLED — then the staged row is reactivated; net-zero catalog litter).
  await cdp.go(`${ADMIN}/branches`);
  await cdp.wait(1500);
  await cdp.evaluate(
    `[...document.querySelectorAll('button[aria-label]')]
      .find((b) => b.getAttribute('aria-label').startsWith('Select ') && b.getAttribute('aria-label') !== 'Select all')
      ?.click()`
  );
  await cdp.wait(500);
  out('indeterminate-glyph.png', (await cdp.send('Page.captureScreenshot', { format: 'png' })).data);
  check('partial selection (1 of n) staged', (await cdp.text()).includes('1 selected'));

  // Stage: deactivate the FIRST row via its row action + the dialog's own
  // Deactivate action (text-matched — the row icons carry aria-labels).
  await cdp.evaluate(
    `[...document.querySelectorAll('button[aria-label]')]
      .find((b) => /deactivate/i.test(b.getAttribute('aria-label')))?.click()`
  );
  await cdp.wait(500);
  await cdp.evaluate(
    `[...document.querySelectorAll('[role=dialog] button, [data-slot=alert-dialog-action]')]
      .find((b) => b.textContent.trim() === 'Deactivate')?.click()`
  );
  await cdp.wait(1500);
  // Select-all over the (now mixed) table → the split confirm.
  await cdp.evaluate(`document.querySelector('button[aria-label="Select all"]')?.click()`);
  await cdp.wait(500);
  await cdp.evaluate(
    `[...document.querySelectorAll('button')]
      .filter((b) => b.textContent.trim() === 'Deactivate')
      .find((b) => b.closest('.fixed'))?.click()`
  );
  await cdp.wait(500);
  const confirmText = await cdp.text();
  check('split confirm renders (eligible of selected)', /Deactivate \d+ of \d+ selected items\?/.test(confirmText));
  out('bulk-confirm-split.png', (await cdp.send('Page.captureScreenshot', { format: 'png' })).data);

  // Cancel the bulk dialog; restore the staged row (net-zero).
  await cdp.evaluate(
    `[...document.querySelectorAll('[role=dialog] button, [data-slot=alert-dialog-cancel]')]
      .find((b) => b.textContent.trim() === 'Cancel')?.click()`
  );
  await cdp.wait(500);
  await cdp.evaluate(
    `[...document.querySelectorAll('button[aria-label]')]
      .find((b) => /reactivate/i.test(b.getAttribute('aria-label')))?.click()`
  );
  await cdp.wait(1500);
  check('staged deactivation reverted (net-zero)', !(await cdp.text()).includes('Deactivated'));
} finally {
  await cdp.close();
}
console.log(failures === 0 ? 'FRAMES ALL PASS' : `FRAMES ${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
```

**Execution-note (selector probes allowed here):** the login-field, row-icon, and dialog-action selectors are generic scans on purpose; if a check FAILs on selectors (not on the ruled strings), fix the SELECTOR in this throwaway script — never the app. The ruled-string checks (`Couldn’t…`, `doesn’t…`, `… of … selected items?`) must pass as-written.

- [ ] **Step 2: Run the stack + the script**

Terminal A: `cd /home/jeius/Projects/sevendays/apps/api && pnpm dev` (wait for :8787 ready). Terminal B: `cd /home/jeius/Projects/sevendays/apps/admin && pnpm dev` (port 3000 — do NOT run landing). Terminal C: headless Chrome `--headless --remote-debugging-port=9222 --user-data-dir=/tmp/155-frames`. Then:

```bash
cd /home/jeius/Projects/sevendays
VERIFY_STAFF_EMAIL=<the provisioned row> VERIFY_STAFF_PASSWORD=<per the runbook> \
  node .superpowers/sdd/2026-09-29-155-owner-decisions/frames.mjs
```

Expected: `FRAMES ALL PASS` + the four PNGs beside the script. The script itself prompts at the stop/restart points (the list-error choreography). If the shell bounces to /login after stopping the API (the fallback risk), re-run with the API stopped BEFORE the initial /packages load and capture the branches error on first paint — record whichever posture actually rendered; never fake a frame.

- [ ] **Step 3: Post the rulings record + tick the tracking boxes**

Write `.superpowers/sdd/2026-09-29-155-owner-decisions/rulings.md` (gitignored source; the comment itself goes to GitHub):

```markdown
#155 rulings — owner-ratified 2026-09-29 (one clarify call, four standalone questions), landed + rendered:

1. **Query-error postures** — `Couldn’t load this page.` + **Retry** on every admin list surface; the editor’s 404: `This package doesn’t exist or was removed.` + **Back to packages** (no Retry — retrying a 404 is a lie). Frame: `list-error.png`, `editor-404.png`.
2. **Bulk-bar counts** — the deactivate confirm counts ELIGIBLE rows: `Deactivate 3 items?` (all eligible) / `Deactivate 2 of 3 selected items?` (split); the toast unchanged (always eligible-only). Frame: `bulk-confirm-split.png`.
3. **Leak-safe 503** — `MissingR2CredentialsError` → **503** `{"error":"Media uploads are not configured."}` (curated, no env names); the loud detail stays log-only; unknown throws keep the uniform 500. Proof: the flipped presign test (`media-routes.test.ts`); admin now surfaces `Upload failed: API 503: Media uploads are not configured.`
4. **Checkbox indeterminate glyph** — check-in-unfilled-box: the check stays, the partial box gains the primary border (`data-indeterminate:border-primary`, Base UI 1.8.0). Frame: `indeterminate-glyph.png`.

React at will — the strings above are the ratified record (they landed verbatim); the frames are the rendered evidence.
```

```bash
cd /home/jeius/Projects/sevendays
gh issue comment 155 --body-file .superpowers/sdd/2026-09-29-155-owner-decisions/rulings.md
gh issue view 155 --json body --jq .body > /tmp/155-body.md
sed -i 's/^- \[ \] \*\*Query-error postures\*\*/- [x] **Query-error postures**/; s/^- \[ \] \*\*Bulk-bar confirm-count/- [x] **Bulk-bar confirm-count/; s/^- \[ \] \*\*`internalError` 500 masks/- [x] **`internalError` 500 masks/; s/^- \[ \] \*\*Shared checkbox indeterminate glyph\*\*/- [x] **Shared checkbox indeterminate glyph**/' /tmp/155-body.md
gh issue edit 155 --body-file /tmp/155-body.md
gh issue view 152 --json body --jq .body > /tmp/152-body.md
sed -i 's/^- \[ \] Query-error postures/- [x] Query-error postures/; s/^- \[ \] Bulk-bar confirm-count/- [x] Bulk-bar confirm-count/; s/^- \[ \] internalError 500 masks/- [x] internalError 500 masks/; s/^- \[ \] Shared checkbox indeterminate glyph/- [x] Shared checkbox indeterminate glyph/' /tmp/152-body.md
gh issue edit 152 --body-file /tmp/152-body.md
```

(#152 keeps its other boxes open — only the four #155-mirrored lines flip.)

- [ ] **Step 4: The docs rotation**

`AGENTS.md`, the admin-suite sentence — extend it (old → new):

```markdown
- `apps/admin` runs a real vitest suite (since M5 ticket 09, #143): landing-style plain-node lib-seam tests over the pure seams (`src/lib/*.test.ts`) — no component/DOM tests, vitest as the only test dependency. The api and landing suites remain the behavioral backbones.
```

```markdown
- `apps/admin` runs a real vitest suite (since M5 ticket 09, #143): landing-style plain-node lib-seam tests over the pure seams (`src/lib/*.test.ts`, plus the `bulk-counts` confirm-naming seam from #155) — no component/DOM tests, vitest as the only test dependency. The api and landing suites remain the behavioral backbones.
```

`AGENTS.md`, the media-seam sentence in the engineering rules — append one clause after "thumbnails over the Images binding":

```markdown
 a missing-credentials presign answers the curated 503 `Media uploads are not configured.` (#155 — the leak-safe detail channel; the loud detail stays log-only)
```

`docs/progress.md` — append at the END of `## What Exists` (immediately before `## Known Gaps / Not Yet Done`), verbatim:

```markdown
- **The #155 owner-decision follow-ups landed (2026-09-29):** admin screens answer a failed query with the owner-ratified `Couldn’t load this page.` + Retry (the package editor’s 404: `This package doesn’t exist or was removed.` + Back to packages) — no more skeleton-forever; the bulk deactivate confirm counts eligible rows (`Deactivate 2 of 3 selected items?`); the API answers missing R2 credentials with the leak-safe curated 503 `Media uploads are not configured.` (loud detail stays server-log-only); the shared checkbox renders the ruled indeterminate glyph (check in the unfilled, primary-bordered box). Rulings recorded on issue #155; the rendered frames live in the gitignored SDD evidence workspace (the #139 evidence precedent), named in the #155 rulings comment.
```

- [ ] **Step 5: Gates + commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm fix && pnpm lint
git status --porcelain | grep -F 'superpowers/sdd' && echo 'FAIL: frames leaked into the tree' && exit 1
git add AGENTS.md docs/progress.md
git commit -m "docs: #155 close-out — rulings recorded, admin-suite + media-seam status rotated (#155)"
```

**Not here:** no `docs/plan.md` tick (post-milestone debt — the issues own the tracking); no ADR (no architectural decision — the ADR-0017/0006 records already govern, the rulings live on #155); the frames and `rulings.md` never leave `.superpowers/`.

---

### Task 7: Full gates, the PR, and the v1 pick

**Files:**
- Modify (bookkeeping): the PR + `docs/agents/v1-picks.md` ledger row

**Interfaces:**
- Consumes: Tasks 1-6 (all landed on `feat/155-owner-decisions`).
- Produces: the squash-merged PR, its v1 pick (expected SPLIT), and the ledger row.

- [ ] **Step 1: The full gates**

```bash
cd /home/jeius/Projects/sevendays
pnpm install && pnpm build:packages
pnpm check   # expect 35/35 tasks (admin suite now real at 6 files / 55 tests)
pnpm build   # expect 7/7
```

- [ ] **Step 2: The PR**

```bash
cd /home/jeius/Projects/sevendays
git push -u origin feat/155-owner-decisions
gh pr create --title "feat: owner-decision follow-ups — error postures, bulk counts, leak-safe 503, checkbox ruling (#155)" --body-file - <<'EOF'
Closes #155 (split from #152). All four rulings owner-ratified 2026-09-29 — verbatim record on the issue.

- **Query-error postures** — `QueryErrorState` (ruled line + Retry) wired as the `isError` sibling ahead of every admin list surface's pending arm (branches, add-ons, studio services, testimonials, lookups ×2, packages, gallery); the package editor's 404 → ruled not-found line + Back to packages.
- **Bulk counts** — `bulk-counts.ts` seam (+4 lib-seam tests): the deactivate confirm counts eligible rows; toast unchanged.
- **Leak-safe 503** — `MissingR2CredentialsError` → 503 `Media uploads are not configured.` (curated; loud detail stays log-only); unknown throws keep the uniform 500 (error-seam control group green).
- **Checkbox ruling** — `data-indeterminate:border-primary` on the shared primitive (check-in-unfilled-box); the stale "dash" comment rewritten.

Floors: admin 6 files / 55 tests (+4); api 290+3 / 24 files (one test flipped, none added); landing/api-client/types untouched; check 35/35; build 7/7. Frames (4) + rulings posted to #155 for owner reaction.
EOF
```

- [ ] **Step 3: Squash-merge + capture the SHA**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
git log --oneline -1   # record this SHA — the pick input
```

- [ ] **Step 4: The v1 pick — expected SPLIT**

Follow `docs/agents/v1-picks.md` exactly: `node scripts/v1-triage.mjs <sha>`; content-pass every v1-path hunk; execute in `~/Projects/sevendays-v1-seed`; lock (install / build:packages / api build green, `pnpm check` 35/35, `pnpm build` 7/7, export audit exit 0, push → run shows `check` + `Deploy v1 (private)` success + `Deploy teaser (main)` skipped). Expected verdict: **SPLIT** — the code hunks are v1-paths (`apps/admin/src/**` — v1 carries the admin CMS per the #148-#150 picks; `apps/api/src/**` + the flipped test; `packages/ui/src/components/checkbox.tsx`), while `AGENTS.md` + `docs/progress.md` + this plan file are main-only; the AGENTS.md hunks are edition-free by construction (content-pass should take them clean — if the auditor flags them, apply the established content-drop ruling and record it).

- [ ] **Step 5: The ledger row**

Append the row to `docs/agents/v1-picks.md` (one line per the table's shape: merged date, PR #, main SHA, verdict, v1 SHA, notes — the notes name the four items, the hunk classes, any pick wrinkles, and the locks). Commit the ledger row on main:

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(agents): v1-picks ledger — #155 owner-decision follow-ups split picked (#155)"
```

**Not here:** no v1 work beyond the pick; no release/deploy work (M6); #152 stays open with its remaining items (position race, upload cancellation, the Zod fence).

