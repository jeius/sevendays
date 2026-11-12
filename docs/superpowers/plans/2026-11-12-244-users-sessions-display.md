# Users-Tab Sessions Display (Post-flight T4, #244) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Users tab's expanded sessions row shows active sessions only, paginates long lists, toggles from the whole row, and carries a legible expanded accent on dark.

**Architecture:** Two new pure seams in `apps/admin/src/lib/users-state.ts` (the expiry filter + the paginator) with lib-seam tests, then one component pass over `apps/admin/src/components/settings/users-tab.tsx` consuming them. The accent fix rides the existing `ExpandRow` pass-through `className` (users-tab-local, matching the tab's existing local-`dark:` status-palette precedent) — no `packages/ui` changes, no API changes.

**Tech Stack:** TanStack Start (admin), React 19, TanStack Query, Tailwind v4 + the `@sevendays/ui` semantic tokens, vitest (plain-node lib-seam suites).

**Spec:** GitHub issue #244 (child of #239, the M7 post-flight — items 11–14). Acceptance criteria: expired sessions never render; long lists paginate; row click toggles expansion (chevron still works); the expanded/selected accent is legible on dark; `pnpm check` green.

## Global Constraints

- Run everything from the repo root. Gates: `pnpm --filter @sevendays/admin test`, `pnpm --filter @sevendays/admin lint`, `pnpm --filter @sevendays/admin typecheck`; the whole-plan exit gate is `pnpm check`.
- Admin test floor before this plan: **26 files / 265 tests**. This plan adds 6 tests to `users-state.test.ts` (4 existing in that file stay green) → new floor **26 files / 271 tests**. `docs/progress.md` must carry the new floor.
- The session TOKEN never renders and never lands in UI copy (the #221 law): everything new composes `shapeSessionRows` output; the raw-rows-in-memory pattern (`sessionItems` mapping the token back for the revoke arg only) is untouched.
- Sessions copy owner-ratified 2026-10-19 stays verbatim: `Sessions`, `Revoke all sessions`, `Revoking…`, `Loading sessions…`, `Couldn’t load the sessions.`, `No active sessions.`, `Revoke`. New copy introduced here is pinned in Task 2 and labeled plan-ratified — the owner reacts to it in the PR review round per the #94 amendment.
- The dark accent root cause, probed live: dark `--muted` is `oklch(0.267 0.009 255.6)` (#23262a) vs dark `--card` `oklch(0.252 0.009 255.6)` (#1f2226) in `packages/ui/src/tokens.css` — `bg-muted/50` over the card is a ~1.5% lightness delta, invisible. The fix is a full-opacity wash plus a petrol start rail (Task 2), NOT a tokens.css change (the dark values are #164-ruled; the tab already owns local `dark:` classes for its status palette).
- Time-coupled tests use now-relative dates (`new Date(NOW_MS + ...)`) around a module-scope `NOW_MS` constant — never hard-coded calendar dates. No fake timers needed: both new seams take `now` / pure inputs explicitly.
- `ExpandRow` (`apps/admin/src/components/cms/shared.tsx:266`) spreads `ComponentProps<typeof TableRow>`, so `onClick` and `className` flow through to the `<tr>` — no shared-component edit is needed or allowed here.
- Do not commit anything that fails the gates. Commit style: conventional commits, one per task. On PR squash-merge, triage pick/skip/split for `v1` per `docs/agents/v1-picks.md` — this change is admin-only (booking-free branch carries the Users tab per #221's PICK), expected PICK, ledger row required.
- Fence (sibling boundary): this ticket does NOT touch any other #239 item — no gallery-manager UX (#243, landed), no branch Maps, none of the other post-flight findings. The Settings screen outside the Users tab's sessions row is out of scope.

---

### Task 1: The pure seams — `activeSessionRows` + `paginateSessions`

**Files:**
- Modify: `apps/admin/src/lib/users-state.ts`
- Test: `apps/admin/src/lib/users-state.test.ts`

**Interfaces:**
- Consumes: `AdminSessionRow` (already exported from `users-state.ts`) — `{ id: string; createdAt: Date; expiresAt: Date; ipAddress: string | null; userAgent: string | null }`.
- Produces (Task 2 consumes, exact signatures):
  - `export function activeSessionRows(sessions: readonly AdminSessionRow[], now: Date): AdminSessionRow[]`
  - `export const SESSIONS_PAGE_SIZE = 5;`
  - `export interface SessionPage { rows: AdminSessionRow[]; page: number; pageCount: number; total: number; rangeLabel: string; }`
  - `export function paginateSessions(sessions: readonly AdminSessionRow[], page: number): SessionPage`

Semantics: `activeSessionRows` keeps rows with `expiresAt > now` (strict — a session expiring this instant is gone). `paginateSessions` clamps `page` into `[1, pageCount]` (a stale high page after a revoke falls back to the last page; `page < 1` clamps to 1; an empty list yields `page: 1, pageCount: 1, rows: [], total: 0`), slices newest-first by `createdAt` descending (newest session first — the most recently signed-in device leads), and formats `rangeLabel` as `` `${start}–${end} of ${total}` `` (en dash, 1-based, e.g. `1–5 of 12`; an empty list yields `0 of 0`).

- [ ] **Step 1: Write the failing tests**

Append to `apps/admin/src/lib/users-state.test.ts` (keep the existing file header comment and imports; add `activeSessionRows` and `paginateSessions` to the import list from `./users-state`):

```ts
const NOW = new Date('2026-11-12T12:00:00Z');

function sessionRow(overrides: Partial<AdminSessionRow> & { id: string }): AdminSessionRow {
  return {
    createdAt: NOW,
    expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: null,
    userAgent: null,
    ...overrides,
  };
}

describe('activeSessionRows (#244)', () => {
  it('drops sessions at or past expiry, keeps strictly-future ones', () => {
    const rows = [
      sessionRow({ id: 'live', expiresAt: new Date(NOW.getTime() + 60_000) }),
      sessionRow({ id: 'now', expiresAt: NOW }),
      sessionRow({ id: 'past', expiresAt: new Date(NOW.getTime() - 60_000) }),
    ];
    expect(activeSessionRows(rows, NOW).map((r) => r.id)).toEqual(['live']);
  });

  it('passes an empty list through unchanged', () => {
    expect(activeSessionRows([], NOW)).toEqual([]);
  });
});

describe('paginateSessions (#244)', () => {
  // 7 rows, pageSize 5 → 2 pages. createdAt descends by index (sess-0 newest).
  const seven = Array.from({ length: 7 }, (_, i) =>
    sessionRow({ id: `sess-${i}`, createdAt: new Date(NOW.getTime() - i * 60_000) })
  );

  it('orders newest-first and slices the clamped page', () => {
    const first = paginateSessions(seven, 1);
    expect(first.rows.map((r) => r.id)).toEqual(['sess-0', 'sess-1', 'sess-2', 'sess-3', 'sess-4']);
    expect(first).toMatchObject({ page: 1, pageCount: 2, total: 7, rangeLabel: '1–5 of 7' });
    const second = paginateSessions(seven, 2);
    expect(second.rows.map((r) => r.id)).toEqual(['sess-5', 'sess-6']);
    expect(second.rangeLabel).toBe('6–7 of 7');
  });

  it('clamps a stale high page back to the last page and a low page to 1', () => {
    expect(paginateSessions(seven, 9).page).toBe(2);
    expect(paginateSessions(seven, 0).page).toBe(1);
  });

  it('an empty list yields page 1 of 1, no rows, and "0 of 0"', () => {
    const empty = paginateSessions([], 1);
    expect(empty).toMatchObject({ rows: [], page: 1, pageCount: 1, total: 0 });
    expect(empty.rangeLabel).toBe('0 of 0');
  });

  it('a single page hides nothing and labels the exact count', () => {
    const three = seven.slice(0, 3);
    expect(paginateSessions(three, 1).rangeLabel).toBe('1–3 of 3');
  });
});
```

`AdminSessionRow` must also be added to the type-only import at the top of the test file (it is already exported from `./users-state`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @sevendays/admin test -- src/lib/users-state.test.ts`
Expected: FAIL — `activeSessionRows` and `paginateSessions` are not exported (import errors / undefined is not a function).

- [ ] **Step 3: Implement the seams**

Append to `apps/admin/src/lib/users-state.ts` (below `shapeSessionRows`):

```ts
/**
 * The expanded sessions row lists ACTIVE sessions only (#244): a session at
 * or past its expiry instant is dropped before it can render. `now` is an
 * explicit arg so the seam stays pure and the tests stay clock-free.
 */
export function activeSessionRows(sessions: readonly AdminSessionRow[], now: Date): AdminSessionRow[] {
  return sessions.filter((session) => session.expiresAt > now);
}

/** Five session rows per expanded page — the owner-scale list (#244). */
export const SESSIONS_PAGE_SIZE = 5;

/** One page of the sessions list, newest session first. */
export interface SessionPage {
  rows: AdminSessionRow[];
  page: number;
  pageCount: number;
  total: number;
  /** "1–5 of 12" (en dash, 1-based); "0 of 0" when empty. */
  rangeLabel: string;
}

export function paginateSessions(sessions: readonly AdminSessionRow[], page: number): SessionPage {
  const ordered = [...sessions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const total = ordered.length;
  const pageCount = Math.max(1, Math.ceil(total / SESSIONS_PAGE_SIZE));
  const clamped = Math.min(Math.max(1, page), pageCount);
  const rows = ordered.slice((clamped - 1) * SESSIONS_PAGE_SIZE, clamped * SESSIONS_PAGE_SIZE);
  const start = total === 0 ? 0 : (clamped - 1) * SESSIONS_PAGE_SIZE + 1;
  const end = total === 0 ? 0 : (clamped - 1) * SESSIONS_PAGE_SIZE + rows.length;
  return { rows, page: clamped, pageCount, total, rangeLabel: `${start}–${end} of ${total}` };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @sevendays/admin test -- src/lib/users-state.test.ts`
Expected: PASS — 10 tests in this file (4 existing + 6 new).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/users-state.ts apps/admin/src/lib/users-state.test.ts
git commit -m "feat(admin): users sessions seams - active-only filter + paginator (#244)"
```

### Task 2: The component pass — filter, paginate, whole-row toggle, dark accent

**Files:**
- Modify: `apps/admin/src/components/settings/users-tab.tsx` (the `UsersTab` component, lines ~147–576 as of this plan; exact line numbers may drift — anchor on the quoted code)

**Interfaces:**
- Consumes: `activeSessionRows`, `paginateSessions`, `SessionPage`, `SESSIONS_PAGE_SIZE` from Task 1 (`#/lib/users-state`); existing `ExpandRow`/`ExpandPanel` from `#/components/cms/shared` (props spread through to `<tr>` — `onClick`/`className` need no shared-file edit).
- Produces: none (leaf UI task; no later task depends on new exports).
- Not here: no `packages/ui` change (the dark tokens are #164-ruled; local `dark:` classes follow the tab's existing status-palette precedent), no API/server-fn change, no new dependency.

- [ ] **Step 1: Wire the seams into the sessions query path**

In `UsersTab`, replace the current shaping block (lines ~173–178):

```tsx
const rawSessions = (sessionsQuery.data ?? []).map((session) => ({ ...session }));
const sessionRows = shapeSessionRows(rawSessions);
const sessionItems = sessionRows.map((session) => ({
  ...session,
  token: rawSessions.find((raw) => raw.id === session.id)?.token,
}));
```

with:

```tsx
const rawSessions = (sessionsQuery.data ?? []).map((session) => ({ ...session }));
// #244: the expanded view lists ACTIVE sessions only — expired rows are
// dropped before anything shapes them for render.
const activeRows = activeSessionRows(shapeSessionRows(rawSessions), new Date());
const sessionsPage = paginateSessions(activeRows, sessionPage);
// Token re-attachment for the revoke mutation arg only (#221 law: revokes go
// by token; the render reads these rows, the token never renders).
const sessionItems = sessionsPage.rows.map((session) => ({
  ...session,
  token: rawSessions.find((raw) => raw.id === session.id)?.token,
}));
```

Add to the import from `#/lib/users-state` (line ~74): `activeSessionRows`, `paginateSessions`. `shapeSessionRows` stays imported (still used above).

- [ ] **Step 2: Add the page state beside the expansion state**

Below `const [expandedId, setExpandedId] = useState<string | null>(null);` (line ~164) add:

```tsx
// #244: the sessions page resets whenever a different row expands (or the
// same one collapses) — paginateSessions' clamp covers a revoke shrinking
// the list mid-page.
const [sessionPage, setSessionPage] = useState(1);
```

Every site that changes `expandedId` also resets the page. Extract one handler above the return (after `openDelete`):

```tsx
function toggleExpanded(userId: string) {
  setExpandedId(expandedId === userId ? null : userId);
  setSessionPage(1);
}
```

- [ ] **Step 3: Whole-row toggle + the expanded accent**

On the `ExpandRow` (line ~414), route the click through the handler with interactive elements excluded, and add the accent. The chevron button keeps its own `onClick` (a button click is excluded from the row handler, so no double-toggle) and switches to the same handler for the page reset:

```tsx
<ExpandRow
  expanded={expanded}
  className={`cursor-pointer transition-colors ${
    expanded
      ? // #244: full-opacity accent + a petrol start rail — bg-muted/50 is
        // invisible on the dark card (#23262a over #1f2226). The rail is
        // --primary (the fixed brand point, legible both themes).
        'bg-accent/70 hover:bg-accent/70 shadow-[inset_2px_0_0_0_var(--primary)] dark:bg-accent dark:hover:bg-accent'
      : ''
  }`}
  onClick={(event) => {
    if ((event.target as HTMLElement).closest('button') !== null) {
      return; // chevron + row actions keep their own behavior
    }
    toggleExpanded(row.id);
  }}
>
```

and the chevron button's `onClick` (line ~424) becomes `onClick={() => toggleExpanded(row.id)}`.

- [ ] **Step 4: Paginate the list + the pager footer**

The empty-state check switches from `sessionItems.length === 0` to the active count (`activeRows.length === 0` — an all-expired list is empty, not page 1 of zero), and the `<ul>` maps `sessionItems` unchanged (it is now the current page). Below the `</ul>` (after line ~569), inside the same `space-y-3` div, add the pager — hidden entirely on a single page:

```tsx
{sessionsPage.pageCount > 1 ? (
  <div className='flex items-center justify-between gap-2 pt-1'>
    <span className='text-muted-foreground text-xs'>{sessionsPage.rangeLabel}</span>
    <div className='flex items-center gap-1'>
      <Button
        variant='outline'
        size='sm'
        type='button'
        disabled={sessionsBusy || sessionsPage.page <= 1}
        onClick={() => setSessionPage(sessionsPage.page - 1)}
      >
        Previous
      </Button>
      <Button
        variant='outline'
        size='sm'
        type='button'
        disabled={sessionsBusy || sessionsPage.page >= sessionsPage.pageCount}
        onClick={() => setSessionPage(sessionsPage.page + 1)}
      >
        Next
      </Button>
    </div>
  </div>
) : null}
```

(The `Previous`/`Next`/range-label copy is plan-ratified; the owner reacts in the PR review round.)

- [ ] **Step 5: Typecheck + lint the app**

Run: `pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin lint`
Expected: both green (biome may demand template-literal formatting — run `pnpm --filter @sevendays/admin lint -- --write` if it flags the className template, then re-run lint).

- [ ] **Step 6: Verify live on the dev stack, both themes**

Run: `pnpm --filter @sevendays/admin dev` and sign in as the owner at the Settings → Users tab. Verify each acceptance criterion:
1. Expired sessions never render — hard to fabricate live; the seam test in Task 1 is the proof (skip live).
2. Long lists paginate — sign in from several browsers/devices (or insert extra session rows via the DB console: `insert into session (id, token, user_id, expires_at, created_at, updated_at) values (...)` with future `expires_at` and distinct `created_at`) until > 5, expand the row, walk Previous/Next, confirm the range label and the newest-first order.
3. Row click toggles; clicking Reset/Ban/Delete/chevron does not toggle.
4. The expanded accent (wash + petrol start rail) is clearly visible on dark AND unobtrusive on light — toggle the theme in the topbar.

- [ ] **Step 7: Run the admin suite**

Run: `pnpm --filter @sevendays/admin test`
Expected: PASS — 26 files / 271 tests (Task 1's 6 new included; the users-row seam suite pins the display vocabulary, not the sessions list, so no existing pin breaks).

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/components/settings/users-tab.tsx
git commit -m "feat(admin): users sessions display - active-only, paginated, whole-row expand, dark accent (#244)"
```

### Task 3: Exit gates + docs

**Files:**
- Modify: `docs/progress.md` (top entry-list line + the admin floor line in the status section)
- Modify: `apps/admin/AGENTS.md` only if it restates the admin test floor (check with `grep -n "265" apps/admin/AGENTS.md docs/progress.md` first — update every hit to the new floor)

**Interfaces:** Consumes Tasks 1–2 landed on the branch. Produces: none.

- [ ] **Step 1: The whole-repo gate**

Run: `pnpm check`
Expected: green — lint + format + typecheck + test across all packages. Floors: admin 26 files / 271 tests; api, api-client, landing, db unchanged (nothing outside `apps/admin` was touched).

- [ ] **Step 2: Update `docs/progress.md`**

Add one entry at the top of the entry list (match the file's date-prefixed house style), stating: #244 landed on the branch — the Users tab's expanded sessions row now lists active sessions only (`activeSessionRows`), paginates at 5/page newest-first (`paginateSessions` + the Previous/Next pager), toggles from the whole row (button clicks excluded), and carries the expanded accent `bg-accent/70 dark:bg-accent` + the `--primary` inset start rail (the dark `bg-muted/50` invisibility root-caused to #23262a over #1f2226); admin floor 26 files / 271 tests (+6 in `users-state.test.ts`). Update the standing admin floor figure wherever `docs/progress.md` (and `apps/admin/AGENTS.md`, if it restates it) carries it.

- [ ] **Step 3: Refresh the knowledge graph**

Run: `graphify update .`
Expected: completes clean; dirty `graphify-out/` files are expected and get committed alongside.

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md apps/admin/AGENTS.md graphify-out/
git commit -m "docs: #244 progress entry + admin floor 271; graph refresh"
```

- [ ] **Step 5: PR + triage**

Open the PR to `main` (one PR for the branch; the three commits ride together). After squash-merge, run the v1-picks triage per `docs/agents/v1-picks.md` and write the ledger row — expected PICK (admin-only, the Users tab already rides v1 per #221). Close #244 and tick its acceptance boxes on the issue.

