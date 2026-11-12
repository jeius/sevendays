# Duplicate-Save Feedback via the Envelope-Unwrap Root Fix (Post-flight T5, #245) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A failed duplicate-name save on every admin catalog screen surfaces its mapped field error (and/or the #218 error toast) — the raw-ApiClientError-envelope degradation is unwrapped at the server-fn seam, once, for every path.

**Architecture:** One new pure seam — `envelopeDetails` in `apps/admin/src/lib/api-envelope.ts` — narrows `ApiClientError.details` (the parsed `apiErrorSchema` ENVELOPE `{ error, details? }`) to the inner `details` array. The seam consumes it in two places: `admin.functions.server.ts`'s `runAdminAction` (already unwraps inline — deduped onto the helper) and the **25 inline catch blocks** in `admin.functions.ts` that today return `details: error.details` RAW (the actual bug). Screens need one small law change on the four light-entity screens (`lookups` ×2, `branches`, `studio-services`, `addons`): toast when no field error mapped (the package editor's existing `handleSaveFailure` law), so the user is always notified even when the 400's details don't map. No API changes, no `packages/` changes, no new copy.

**Tech Stack:** TanStack Start (admin), Hono RPC client (`@sevendays/api-client`), vitest (plain-node lib-seam suites).

**Spec:** GitHub issue #245 (child of #239 item 7; retires #238's pinned P8). Acceptance criteria: the envelope unwrapped at the seam on every path; a duplicate-name save on Lookups shows the mapped error; the same class verified on the other affected screens; #238 P8 retired with a pointer; `pnpm check` green with the seam's suites pinning the unwrapped shape.

## Global Constraints

- Run everything from the repo root. Gates: `pnpm --filter @sevendays/admin test`, `pnpm --filter @sevendays/admin lint`, `pnpm --filter @sevendays/admin typecheck`; Task 2 additionally gates on `pnpm --filter @sevendays/admin build` (the 2026-10-16 ruling: any change touching `admin.functions.server.ts` references carries the production-build gate — import protection is the failure mode); the whole-plan exit gate is `pnpm check`.
- Admin test floor before this plan: **26 files / 271 tests**. This plan adds 5 tests in one NEW file (`src/lib/api-envelope.test.ts`) → new floor **27 files / 276 tests**. `docs/progress.md` and the root `AGENTS.md` admin-floor parenthetical must carry the new floor.
- The root cause, probed live at HEAD: `ApiClientError.details` is ALWAYS the parsed envelope — `packages/api-client/src/unwrap.ts:39` throws `ApiClientError(res.status, parsed)` where `parsed = apiErrorSchema.parse(body)` (`{ error, details? }` from `packages/types`), and the non-JSON arm throws `ApiClientError(status, { error: 'Non-JSON error response' })`. `runAdminAction` (`admin.functions.server.ts:24-30`) already unwraps `envelope?.details` (delete fns + testimonial-submission fns are CORRECT today); the 25 inline catches in `admin.functions.ts` return `details: error.details` RAW (every `saveAdmin*` fn + `presignAdminCoverUpload`). Screens call `conflictFieldErrors(result.details)` — which returns `{}` on a non-array — AND their `if (!result.details) toast.error(result.message)` guard sees the truthy envelope and skips the toast: total silence. That is the exact mechanism this plan deletes.
- `conflictFieldErrors`'s defensive contract (pinned in `package-editor-state.test.ts:365`) is UNTOUCHED: array-in → `Record<firstPathSegment, message>`; anything non-conforming → `{}`. This plan fixes what is PASSED to it, not the mapper.
- The #218 pending/error vocabulary is untouched: no sheet stays open on success-path changes, no new dialog states. The only screen-side change is the toast guard on the four light-entity screens switching from `!result.details` to the mapped-field condition — package-editor's `handleSaveFailure` (`package-editor.tsx:558-583`) already implements exactly this law (map what maps; toast otherwise); the four screens converge onto it.
- No owner-facing copy is introduced: every toast message rides the existing `result.message` / `outcome.result.message` channel; no new strings to ratify.
- `admin.functions.ts` is client-importable (it already imports `ApiClientError` from `@sevendays/api-client`); importing the NEW pure `#/lib/api-envelope` helper into it is safe. `admin.functions.server.ts` (server-only) imports it too — handler-body-only references to `./admin.functions.server` stay the rule (the 2026-10-16 ruling); this plan does not add any new import of that file anywhere.
- Do not commit anything that fails the gates. Commit style: conventional commits, one per task. On PR squash-merge, triage pick/skip/split for `v1` per `docs/agents/v1-picks.md` — this change is admin-only and booking-free, expected PICK, ledger row required.
- Fence (sibling boundary): this ticket does NOT touch any other #239 item (gallery UX #243 and users sessions #244 are landed; the branch-Maps request is its own ticket) and does NOT absorb any other #238 pin (P4–P7, P9–P14 stay pinned untouched — only P8 retires). The #239 roadmap checkbox for item 7 stays unticked until the owner's post-batch re-walk accepts the surfaces.

### Task 1: The pure seam — `envelopeDetails`

**Files:**
- Create: `apps/admin/src/lib/api-envelope.ts`
- Test: `apps/admin/src/lib/api-envelope.test.ts`

**Interfaces:**
- Consumes: nothing (pure narrowing over `unknown`).
- Produces (Tasks 2–3 consume, exact signature):
  - `export function envelopeDetails(errorDetails: unknown): unknown`

Semantics: given `ApiClientError.details` (ALWAYS the parsed `apiErrorSchema` envelope — see Global Constraints), return the envelope's inner `details`. An envelope without a `details` key (the curated-503 shape `{ error }`, the non-JSON stub `{ error: 'Non-JSON error response' }`) yields `undefined`. The function never validates the inner shape — that is `conflictFieldErrors`'s job downstream.

- [ ] **Step 1: Write the failing tests**

Create `apps/admin/src/lib/api-envelope.test.ts`:

```ts
// #245: the envelope-unwrap seam. ApiClientError.details is the parsed
// apiErrorSchema ENVELOPE ({ error, details? }); the result-value channel's
// consumers (conflictFieldErrors, fieldErrorsFromDetails, blockerLines) want
// the INNER details array. These tests pin the unwrapped shape the server fns
// must carry across the RPC boundary.
import { describe, expect, it } from 'vitest';
import { conflictFieldErrors } from './package-editor-state';
import { envelopeDetails } from './api-envelope';

const conflictEnvelope = {
  error: 'Validation failed',
  details: [{ path: ['name'], message: 'A studio service with this name already exists.' }],
};

describe('envelopeDetails (#245)', () => {
  it('returns the inner details array from a conflict envelope', () => {
    expect(envelopeDetails(conflictEnvelope)).toBe(conflictEnvelope.details);
  });

  it('yields undefined for an envelope with no details key (curated 503 / non-JSON stub)', () => {
    expect(envelopeDetails({ error: 'Media uploads are not configured.' })).toBeUndefined();
    expect(envelopeDetails({ error: 'Non-JSON error response' })).toBeUndefined();
  });

  it('yields undefined for non-object input (defensive — details? is optional on the wire)', () => {
    expect(envelopeDetails(undefined)).toBeUndefined();
    expect(envelopeDetails(null)).toBeUndefined();
    expect(envelopeDetails('nope')).toBeUndefined();
  });

  it('passes a details value of any shape through untouched (validation is conflictFieldErrors’ job)', () => {
    const inner = { anything: true };
    expect(envelopeDetails({ error: 'x', details: inner })).toBe(inner);
  });

  it('composes with conflictFieldErrors: the unwrapped envelope maps, the raw one does not', () => {
    expect(conflictFieldErrors(envelopeDetails(conflictEnvelope))).toEqual({
      name: 'A studio service with this name already exists.',
    });
    // The raw-envelope degradation this ticket retires — pinned so it cannot return:
    expect(conflictFieldErrors(conflictEnvelope)).toEqual({});
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @sevendays/admin test -- src/lib/api-envelope.test.ts`
Expected: FAIL — `./api-envelope` does not exist (unresolved import).

- [ ] **Step 3: Implement the seam**

Create `apps/admin/src/lib/api-envelope.ts`:

```ts
// #245: the envelope-unwrap seam, extracted so the server-fn error paths
// (runAdminAction + the inline catches in admin.functions.ts) share ONE
// implementation. ApiClientError.details is the parsed apiErrorSchema
// ENVELOPE ({ error, details? } — packages/types; unwrap.ts:39 pins that it
// is ALWAYS the envelope, with the non-JSON stub { error: 'Non-JSON error
// response' } as the only other shape); the result-value channel's consumers
// (conflictFieldErrors, fieldErrorsFromDetails, blockerLines in the delete
// dialogs) want the INNER details array.
/**
 * Narrows `ApiClientError.details` (the parsed error envelope) to the inner
 * `details`. An envelope without a `details` key (curated 503s, the non-JSON
 * stub) yields `undefined`. Never validates the inner shape — the mappers
 * downstream own that.
 */
export function envelopeDetails(errorDetails: unknown): unknown {
  if (typeof errorDetails !== 'object' || errorDetails === null) {
    return undefined;
  }
  return (errorDetails as { details?: unknown }).details;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @sevendays/admin test -- src/lib/api-envelope.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/api-envelope.ts apps/admin/src/lib/api-envelope.test.ts
git commit -m "feat(admin): envelopeDetails seam - the #245 envelope unwrap, pure + pinned"
```

### Task 2: The seam fix — every raw-envelope path unwrapped

**Files:**
- Modify: `apps/admin/src/lib/admin.functions.ts` (the 25 inline catch blocks)
- Modify: `apps/admin/src/lib/admin.functions.server.ts` (`runAdminAction` dedupes onto the helper)

**Interfaces:**
- Consumes: `envelopeDetails` from Task 1 (`./api-envelope`).
- Produces: the unchanged `AdminMutationResult` / `AdminDeleteResult` shapes — every `ok: false` arm's `details` is now the INNER array (or `undefined`), never the envelope.
- Not here: NO screen changes (Task 3), no API or `packages/` changes, no change to `fetchAdminPackage` (its catch carries no `details` — nothing to unwrap).

- [ ] **Step 1: Unwrap in `admin.functions.ts` — all 25 catch blocks, one edit**

In `apps/admin/src/lib/admin.functions.ts`, add the import beside the existing `ApiClientError` import (line ~9):

```ts
import { envelopeDetails } from './api-envelope';
```

Then apply ONE `replace_all` edit — every one of the 25 inline catches carries the byte-identical arm (verified at HEAD by count):

- old_string (replace_all): `            details: error.details,`
- new_string: `            details: envelopeDetails(error.details),`

The 25 sites are the inline catches of: `presignAdminCoverUpload`, `saveAdminPackageCreate`/`Update`, `saveAdminBranchCreate`/`Update`, `saveAdminSiteSettings`, `saveAdminStudioServiceCreate`/`Update`/`BranchMatrix`/`AddonMatrix`, `saveAdminAddonCreate`/`Update`, `saveAdminGalleryCategoryCreate`/`Update`/`Order`, `saveAdminGalleryPhotoCreate`/`Update`/`Order`, `saveAdminTestimonialCreate`/`Update`/`Order`, `saveAdminPrintSizeCreate`/`Update`, `saveAdminAttireCreate`/`Update`.

- [ ] **Step 2: Dedupe `runAdminAction` onto the helper**

In `apps/admin/src/lib/admin.functions.server.ts`, add the import (beside `./api.server`):

```ts
import { envelopeDetails } from './api-envelope';
```

and replace the inline unwrap (lines ~18-31) with:

```ts
      if (error instanceof ApiClientError) {
        // ApiClientError.details is the parsed error ENVELOPE; the
        // result-value channel's consumers (blockerLines in the delete
        // dialogs, conflictFieldErrors) want the INNER array. (Ruling
        // 2026-10-16, fix round 2; #245 extracted the unwrap to
        // lib/api-envelope.ts so every path shares it.)
        return {
          ok: false,
          status: error.status,
          message: error.message,
          details: envelopeDetails(error.details),
        };
      }
      throw error;
```

(No behavior change here — `envelopeDetails` returns `undefined` on non-objects where the old `envelope?.details` cast did the same; this is the one-source-of-truth edit only.)

- [ ] **Step 3: Gate — test, lint, typecheck, BUILD**

Run: `pnpm --filter @sevendays/admin test && pnpm --filter @sevendays/admin lint && pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin build`
Expected: all green. The build is the ruling's import-protection gate — `admin.functions.ts`'s new `./api-envelope` import is client-graph-safe (pure module), and no new reference to `./admin.functions.server` was added. Floor: 27 files / 276 tests (Task 1's file included).

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/admin.functions.ts apps/admin/src/lib/admin.functions.server.ts
git commit -m "fix(admin): unwrap the ApiClientError envelope at the seam - all 25 raw paths (#245)"
```

### Task 3: The mapped-or-toast law on the four light-entity screens

After Task 2, a duplicate-name 400 carries the inner array → `conflictFieldErrors` maps → the in-sheet field error shows. But these four screens' toast guard is `if (!result.details)` — a 400 whose details don't map to the screen's field would STILL be silent. Converge them onto the package editor's existing law (`handleSaveFailure`, `package-editor.tsx:558-583`): map what maps; toast when nothing did. The site tab already toasts unconditionally on `!ok` (`site-tab.tsx:184`) — untouched.

**Files:**
- Modify: `apps/admin/src/components/lookups/lookups-screen.tsx` (2 sites)
- Modify: `apps/admin/src/components/branches/branches-screen.tsx` (1 site)
- Modify: `apps/admin/src/components/studio-services/studio-services-screen.tsx` (1 site)
- Modify: `apps/admin/src/components/addons/addons-screen.tsx` (1 site)

**Interfaces:**
- Consumes: Task 2's unwrapped `result.details`; `conflictFieldErrors` (unchanged).
- Produces: none.
- Not here: no package-editor change (its law is already correct), no site-tab change, no `packages/ui` or API change, no new copy.

- [ ] **Step 1: Lookups — the print-size save arm (line ~362)**

Replace:

```ts
        const codeConflict = conflictFieldErrors(result.details).code;
        if (codeConflict) {
          setSizeErrors({ code: codeConflict });
        }
        if (!result.details) {
          toast.error(result.message);
        }
```

with:

```ts
        // #245: details is the unwrapped inner array — map what maps, toast
        // when nothing did (the package editor's handleSaveFailure law).
        const codeConflict = conflictFieldErrors(result.details).code;
        if (codeConflict) {
          setSizeErrors({ code: codeConflict });
        } else {
          toast.error(result.message);
        }
```

- [ ] **Step 2: Lookups — the attire save arm (line ~393)**

Same law; replace:

```ts
      const nameConflict = conflictFieldErrors(result.details).name;
      if (nameConflict) {
        setAttireErrors({ name: nameConflict });
      }
      if (!result.details) {
        toast.error(result.message);
      }
```

with:

```ts
      // #245: mapped-or-toast (see the size arm above).
      const nameConflict = conflictFieldErrors(result.details).name;
      if (nameConflict) {
        setAttireErrors({ name: nameConflict });
      } else {
        toast.error(result.message);
      }
```

- [ ] **Step 3: Branches (line ~263)**

Replace:

```ts
      const nameConflict = conflictFieldErrors(result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      }
      if (!result.details) {
        toast.error(result.message);
      }
```

with:

```ts
      // #245: mapped-or-toast — a 400 that maps shows its field error, any
      // other failure toasts.
      const nameConflict = conflictFieldErrors(result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      } else {
        toast.error(result.message);
      }
```

- [ ] **Step 4: Studio services (line ~315)**

Replace:

```ts
      const nameConflict = conflictFieldErrors(outcome.result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      }
      if (!outcome.result.details) {
        toast.error(outcome.result.message);
      }
```

with:

```ts
      // #245: mapped-or-toast (see package-editor's handleSaveFailure).
      const nameConflict = conflictFieldErrors(outcome.result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      } else {
        toast.error(outcome.result.message);
      }
```

- [ ] **Step 5: Addons (line ~438)**

Replace:

```ts
      const nameConflict = conflictFieldErrors(outcome.result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      }
      if (!outcome.result.details) {
        toast.error(outcome.result.message);
      }
```

with:

```ts
      // #245: mapped-or-toast (see package-editor's handleSaveFailure).
      const nameConflict = conflictFieldErrors(outcome.result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      } else {
        toast.error(outcome.result.message);
      }
```

(Note: the studio-services and addons blocks are textually identical at HEAD — the Edit tool's uniqueness requirement is satisfied per-file since each file holds exactly one such block; `lookups-screen.tsx` holds two, disambiguated by `setSizeErrors`/`setAttireErrors` + indentation in the old_string.)

- [ ] **Step 6: Verify live on the dev stack**

Run: `pnpm --filter @sevendays/admin dev`, sign in, and on the Lookups screen edit a print size to a duplicate `code` → Save: the in-sheet code field shows the mapped conflict message (e.g. `A print size with this code already exists.` — whatever the API's 400 carries), sheet holds. Repeat the duplicate-name check on: Attires (Lookups), Branches, Studio Services, Add-ons, and a Package (slug conflict in the advanced section). Also confirm the mapped-not-toasted law: a mapped conflict shows the field error WITHOUT a toast; sign out the session in another tab and Save (401, no details) → the toast fires. Owner-walks these surfaces at the post-batch re-walk (#239).

- [ ] **Step 7: Gate + commit**

Run: `pnpm --filter @sevendays/admin test && pnpm --filter @sevendays/admin lint && pnpm --filter @sevendays/admin typecheck`
Expected: green — 27 files / 276 tests (the screen files carry no lib-seam tests of their own; nothing pinned the old `!result.details` guard).

```bash
git add apps/admin/src/components/lookups/lookups-screen.tsx apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/studio-services/studio-services-screen.tsx apps/admin/src/components/addons/addons-screen.tsx
git commit -m "feat(admin): mapped-or-toast on the light-entity screens - duplicate saves always notify (#245)"
```

### Task 4: Exit gates + docs + issue hygiene

**Files:**
- Modify: `docs/progress.md` (top entry-list line + the standing admin floor)
- Modify: `AGENTS.md` (the root file's admin-floor parenthetical — `26 files / 271 tests` → `27 files / 276 tests`)

**Interfaces:** Consumes Tasks 1–3 landed on the branch. Produces: none.

- [ ] **Step 1: The whole-repo gate**

Run: `pnpm check`
Expected: green — lint + format + typecheck + test across all packages. Floors: admin 27 files / 276 tests; api, api-client, landing, db unchanged (nothing outside `apps/admin` was touched).

- [ ] **Step 2: Update `docs/progress.md`**

Add one entry at the top of the entry list (date-prefixed house style), stating: #245 landed on the branch — the duplicate-save silence root-caused to the 25 inline catches in `admin.functions.ts` returning the RAW ApiClientError envelope as `details` (mapping degraded to `{}` AND the truthy envelope suppressed the `!result.details` toast); fixed at the seam via the new pure `envelopeDetails` helper (`lib/api-envelope.ts`, 5 seam pins incl. the raw-envelope-degradation negative), `runAdminAction` deduped onto it, and the four light-entity screens converged onto package-editor's mapped-or-toast law (lookups ×2, branches, studio-services, addons); admin floor 27 files / 276 tests (+5 in `api-envelope.test.ts`). Update the standing admin floor figure wherever `docs/progress.md` carries it, and the root `AGENTS.md` admin-floor parenthetical (`26 files / 271 tests` → `27 files / 276 tests`).

- [ ] **Step 3: Refresh the knowledge graph**

Run: `graphify update .`
Expected: completes clean; dirty `graphify-out/` files are expected and get committed alongside.

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md AGENTS.md graphify-out/
git commit -m "docs: #245 progress entry + admin floor 276; graph refresh"
```

- [ ] **Step 5: PR + triage + issue hygiene**

Open the PR to `main` (one PR for the branch; the four commits ride together). After squash-merge:
1. Run the v1-picks triage per `docs/agents/v1-picks.md` and write the ledger row — expected PICK (admin-only, booking-free).
2. Close #245 and tick its acceptance boxes on the issue.
3. Retire #238's P8: comment on #238 —
   > P8 retired by #245 (the envelope-unwrap root fix): `envelopeDetails` at the seam unwraps every raw path (the 25 inline catches + `runAdminAction` deduped), and the four light-entity screens now map-or-toast. The #239 roadmap checkbox for item 7 stays unticked until the owner's post-batch re-walk.
   (P4–P7, P9–P14 stay pinned untouched.)

