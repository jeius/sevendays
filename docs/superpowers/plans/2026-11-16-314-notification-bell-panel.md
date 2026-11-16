# M9 Ticket 1 — The Notification (bell badge, pending panel, confirm-guarded accept/reject) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Tasks 2, 3, and 4 are UI-bearing and load the installed UI/UX skill set at execution time** — per #314's Execution notes: `prototype` + `ui-ux-pro-max` (the house rule), plus `notification-design`, `design-system`, `tanstack-query-best-practices`, `dark-mode-design`, and `vitest` (Task 1). **The composition is pre-ruled, not open:** the anatomy is #304's ruled Variant C ported from `prototype/bell-panel-variants` (values and rulings, never the branch) and every new string is D5's ratified copy table — the skills inform judgment on the pinned renders, they do not re-compose. Task 5 carries TWO blocking owner interactions (the as-built variants reaction + the headed-login "go" gate) — never proceed past them unilaterally. Everything runs to the gates.

**Goal:** Ticket [#314](https://github.com/jeius/sevendays/issues/314) — the admin topbar's inert bell becomes the **Notification** (glossary term — avoid *inbox*, *alert*, *message*): a derived view over the pending-submissions queue (ADR-0028). The badge **is** the pending count (amber chip on `SUBMISSION_STATUS_META.pending`, capped `9+`, hidden at 0, the count riding the trigger's accessible name); the panel lists the submissions themselves — the quote, the person, the date — with inline confirm-guarded Accept/Reject so a submission can be judged where it's seen; the `Open Submissions` footer link rides every state and lands on the Submissions tab. An item leaves only by moderation: no dismiss, no mark-read, no notifications table, no per-staff read state — the absences are the model. `GuardedConfirm` gains `confirmVariant?: 'default' | 'destructive'` defaulting to `'destructive'` (every existing call site byte-identical; accept publishes = primary, reject destroys = destructive).

**Architecture:** Five tasks, admin-app-local only (zero api / db / types / api-client / packages-ui / landing files — the D11 soft ceiling): (1) the lib seams, TDD — a new `notification-state.ts` (the count → badge/aria-name/tooltip mapper, the letters-only initials rule, the confirm meta with the variant polarity, the pending wiring) + `submissions-state.ts` gains the tolerant `?tab=` deep-link schema; (2) the one production-file touch on `cms/shared.tsx` — the prototype's `confirmVariant` diff verbatim + exporting `SUBMISSION_STATUS_META` (the badge family rides the one source, no drift); (3) the Submissions-tab deep link — `validateSearch` on `/_shell/testimonials` (the audit-log precedent) + the screen's tab going URL-driven; (4) the `Notification` component (Variant C, ported) mounted in the topbar, reusing the tab's pending-guarded mutations over the unchanged shared query key; (5) gates, the owner's as-built variants reaction (blocking), the live walkthrough (the headed go-gate, both themes), docs rotation, PR, the v1 pick, issue closes, graphify.

**Tech Stack:** zero new dependencies (manifest untouched, `pnpm install` never runs — `cmdk`/`fuse.js` are #315's, NOT this ticket's), zero migrations, zero `packages/` changes. React Query v5 (`useQuery`/`useMutation`/`isPending`/`.variables` — the on-disk vocabulary). The shared primitives are installed: Base-UI `Popover`/`PopoverContent` (`align`/`side`/`sideOffset` + root `onOpenChange`), `Tooltip`/`TooltipProvider` (`side`, `delay={0}`), `Button` (`ButtonPrimitive.Props` — render-prop capable), `Skeleton`. The entire trigger/panel/confirm composition compiled clean on `prototype/bell-panel-variants` (typecheck 0, biome clean — the spec's Further Notes record) — **the prototype branch is this plan's type-inference spike**; nothing here needs a new one. TypeScript with `noUncheckedIndexedAccess` ON. vitest 4.1.11 plain-node lib-seam tests (`src/**/*.test.ts`, environment node, no component/DOM tests — the house law). pnpm + Turborepo, `gh` CLI, `graphify update .` at close.

**Spec:** Implements #314 (label `ready-for-agent`) against the ratified M9 spec `docs/specs/2026-11-16-m9-admin-notifications-search-spec.md` (**D1–D5 + § Testing Decisions**) and ADR-0028 `docs/adr/0028-derived-notifications-queue-in-chrome.md`. Primary source: local-only branch `prototype/bell-panel-variants` — **port values and rulings, never merge** (variants A/B are the losing anatomies; the prototype switcher/stubs die with the branch). Key recon facts (2026-11-16, main `e99971c`, tree clean apart from untracked `.claude/`; every file below read whole or at the cited lines this session):

- **The vocabulary law (binding, #218, on-disk):** pending = disabled + spinner + label swap + `aria-busy`; icon-only buttons take the spinner IN PLACE of the icon (no label swap). `PendingSpinner` + `ACCEPTING_LABEL = 'Accepting…'` / `REJECTING_LABEL = 'Rejecting…'` are exported from `#/components/cms/shared` (`shared.tsx:48-50`) and `#/lib/save-contract` (`save-contract.ts:17-18`) — reused, never re-declared.
- **`GuardedConfirm` today (`apps/admin/src/components/cms/shared.tsx:573-680`):** pending-guarded confirm — the confirm button goes `disabled` + `PendingSpinner` + busy-label swap + `aria-busy`; the dialog STAYS OPEN on failure; the parent clears `open` on success. The prototype's touch (35e5a0f) adds exactly: the `confirmVariant = 'destructive'` destructure default, the prop-type line + JSDoc, and `variant={confirmVariant}` replacing the hardcoded `variant='destructive'` on `AlertDialogAction` (`shared.tsx:665`). Port that diff verbatim.
- **The amber family (`shared.tsx:161-180`):** `SUBMISSION_STATUS_META.pending.className` is exactly `'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'` — today NOT exported. The prototype hardcopied it as `AMBER_BADGE`; production exports the const (one word) and reads `.pending.className` so the badge can never drift from the tab's badge.
- **The initials rule (#304, prototype `prototype-stubs.ts:100-107`):** letters-only (`\p{L}/u`) words, first two, uppercased — `'Maria & Paolo Dela Cruz' → 'MP'`. NOT the sidebar's word-based `initials` (`admin-sidebar.tsx:36-42`, which counts any word): submission persons carry commas, batches, ampersands.
- **The Submissions tab today (`apps/admin/src/components/testimonials/submissions-tab.tsx`):** reads `useQuery(adminTestimonialSubmissionQueries.all())`; its reject mutation is the contract to mirror — `onSuccess`: `invalidateBoth()` (the submissions key + the testimonials key) → ok closes the dialog + `toast.success('Rejected.')`, `!ok` keeps it + `toast.error(result.message)`; `onError` toasts. Its accept goes through the edit sheet; the **panel's accept is accept-as-is**: `acceptAdminTestimonialSubmission({ data: { id, payload: {} } })` — the accept schema's own clause ("absent keys keep the submission's stored text", `packages/types/src/testimonial-submission.ts:46-50`; `acceptTestimonialSubmissionSchema.parse({})` → `{}` is already test-pinned there). Pending-guard holds by construction: the panel lists only pending rows.
- **The query key (the #288 seam, `apps/admin/src/lib/cms-queries.ts:126-134`):** `['admin', 'testimonial-submissions']`, `staleTime: CMS_STALENESS_MS` (5 min), `refetchOnWindowFocus: true`. **The hoist is the mount, not a route edit:** the topbar renders on every `_shell` screen (`_shell.tsx:48-62` → `AdminTopbar`), so the `Notification`'s own `useQuery` at topbar scope IS shell scope — one shared cache entry with the tab by key, zero new fetch machinery, and the shell loader is NOT touched (a `queryClient.query()` await in the shell loader would tax every navigation when stale — rejected at plan time; the badge arriving with the client fetch matches "hidden at 0" visually).
- **The tab switch today (`testimonials-screen.tsx:225`):** `useState<'testimonials' | 'submissions'>('testimonials')` — "local state, no routes (#218)". The footer link must LAND on the Submissions tab (#314 AC), so the tab goes URL-driven via `validateSearch` on `/_shell/testimonials` — the audit-log precedent (`_shell.audit-log.tsx`: `validateSearch: auditLogSearchSchema`, a tolerant Zod schema in the feature lib, the route component passing `search` down; `audit-log-screen.tsx:129-138` drives state with `useNavigate`). The #218 ruling's substance holds (still one screen, no new route — the deep-link param aims into it); the screen's comment gets the amendment note. `routeTree.gen.ts` is COMMITTED (`git ls-files` confirms) — Task 3 regenerates it (`pnpm --filter @sevendays/admin generate-routes`) and the regen is committed.
- **The panel's unruled states resolve to on-disk vocabulary, zero new copy:** a failed read renders the owner-ratified `QueryErrorState` + `QUERY_ERROR_LINE` + `Retry` (`shared.tsx:202-231`, the #155 posture — the panel never fakes the empty line over a failed read; the badge stays hidden, unknown ≠ 0 visually, and the panel surfaces the failure when examined); the first-load pending renders 3 skeleton rows (the tab's posture, `submissions-tab.tsx:186-202`); the workbar count renders `null` while `submissions === undefined` (no lying 0).
- **Sibling fences (the M9 cuts, #314 is ticket 1 of 4):** NOT here, regardless of temptation: **Global Search** (the topbar Input, ⌘K, cmdk/fuse.js, the index, the dropdown) — #315 in full, the Input stays inert and untouched; **the below-sm sheet + the `?focus=` landing** — #316 (the `?focus=` param is THEIRS; this ticket's `?tab=` is a different param on one route, no collision); **the live-stack exit-gate walkthrough** (a public submission badges the bell from an unrelated screen, the full #216 flow, milestone closure) — #317; **the search Input's placeholder/aria** — untouched. The M9 roadmap box this ticket owns is the FIRST (`docs/plan.md` M9 section, `- [ ] Admin — the Notification (ADR-0028): …`) — it ticks in Task 5; the two Search boxes and the Verify box **stay unticked until #315/#316/#317 land** — #314 never ticks them.
- **The copy law (D5's ratified table — the spec IS the ratifying record, #305 "All looks good"):** every new string is pinned verbatim in Global Constraints; the reject dialog + the busy labels + the empty line are on-disk verbatim reuse. No `TODO(owner-copy)` markers ride this ticket — nothing is unplanned.
- **Baselines (live, run this session):** admin **30 files / 310 tests** (matches AGENTS.md's floor); after Task 1: **31 files / 325 tests** (+13 its in the new `notification-state.test.ts`, +2 its appended to `submissions-state.test.ts`; Tasks 2–4 add no suite). Types/api/api-client/landing/db untouched by this ticket — the diff proves the soft ceiling.
- **Local stack quirks (memory, binding for Task 5):** both frontends pin `:3000` + ws `:9229` (serial only — run admin + api together, never admin + landing); the api dev port is `8787` (`apps/api/wrangler.toml`); admin CMS reads need the local api (`API_URL` in `apps/admin/.env.local`); the public submission POST rides the edge rate limit (5 per 60s per IP — the walkthrough seeds 2, well inside).

## Global Constraints

- **Branch & baseline:** `feat/314-notification` off main `e99971c` (verify `git rev-parse --short main` at execution; if main moved, reconcile the anchored line numbers before starting — the file anchors below were read at that SHA). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#314)` squash style; every commit is pinned verbatim below. Evidence (red/green test output, grep gates, walkthrough narration + captures) lands in gitignored `.superpowers/sdd/2026-11-16-314-notification-bell-panel/`.
- **Gates (repo AGENTS.md duties):** **zero manifest changes — `pnpm-lock.yaml` untouched, `pnpm install` never runs.** Every task commits only with its checks green: `pnpm --filter @sevendays/admin fix` BEFORE committing (accept the rewrites; re-run the suite if it rewrote anything) → `test -- --run` → `typecheck`. Tasks 3 and 4 additionally run `pnpm --filter @sevendays/admin build` (the #218 execution ruling: the production build joins the checks whenever a route's module graph gains an import — Task 3 adds the zod edge into the testimonials route graph; Task 4 adds `notification.tsx` into EVERY route's graph via the topbar). Task 3 also runs `pnpm --filter @sevendays/admin generate-routes` and commits the `routeTree.gen.ts` regen. `pnpm build:packages` is NOT needed (no `@sevendays/api` dist change is consumed). Never stage `graphify-out/` churn (Task 5's update is its own commit). Never commit secrets. Tick checklist boxes with `- [✅]`, never plain `[x]` (this plan file, `docs/plan.md`, and issue bodies alike). Final gate: `pnpm check` green across the repo. **The soft-ceiling gate (D11):** before the PR, `git diff --stat main...HEAD -- apps/api apps/landing packages/ pnpm-lock.yaml` must be EMPTY — any api/schema/types/api-client/ui need discovered mid-flight is a re-ruling for the owner, not drift.
- **The copy law (owner-ratified verbatim, D5 at #305 — pin these, never re-draft, no TODO(owner-copy) markers):** bell accessible name `Notifications` at 0 · `Notifications, {n} pending submissions` at n > 0 (n UNCAPPED); bell tooltip (n > 0 only, `side='bottom'`) `{n} pending submissions`; panel header `Pending submissions` + the count; action hover hints `Accept` / `Reject`; panel footer `Open Submissions`; accept dialog title `Accept this submission?` + description `Accepting publishes it as a testimonial at the end of the list.`; reject dialog (the tab's, verbatim — already on disk at `submissions-tab.tsx:317-318`) title `Reject this submission?` + description `The submission stays on record as rejected — nothing publishes, and the sender is never told.`; empty line `No pending submissions.` (#216 on-disk); busy labels `Accepting…` / `Rejecting…` (the `save-contract` constants); confirm labels `Accept` / `Reject`; success toasts `Accepted.` / `Rejected.` (the tab's); failure surfaces the result message (never a new string). The panel error arm reuses `QUERY_ERROR_LINE` + `QueryErrorState` (owner-ratified #155) — zero new copy anywhere.
- **The anatomy law (Variant C, ruled at #304 — the prototype's values, ported not merged):** trigger = `TooltipTrigger render={<PopoverTrigger render={<Button variant='ghost' size='icon' className='relative ml-auto' …/>}>}` (Base UI chain, outermost first) with `Bell aria-hidden` and the amber badge chip `absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border px-1 text-[10px] leading-none font-semibold` + `SUBMISSION_STATUS_META.pending.className`; panel = `PopoverContent align='end' className='w-[400px] p-0'`, workbar header (`text-[11px] font-medium tracking-wide uppercase` muted title + `text-xs` count, `border-b px-4 py-2.5`), rows `max-h-[380px] overflow-y-auto` `flex items-start gap-3 border-b px-4 py-2.5 last:border-b-0` (initials avatar `bg-muted … size-8 rounded-full`, `line-clamp-2 text-sm` quote, `person · submittedOn` meta at `text-xs`), icon-only ✓/✗ (`Check` / `X` `aria-hidden`, reject in destructive text classes `text-destructive hover:bg-destructive/10 hover:text-destructive`), row hints `TooltipContent side='top'`, footer `border-t p-2` full-width `variant='link' size='sm'`. One `TooltipProvider` over the whole surface (hints flow through the popover's portal).
- **The aria law (D2):** the visual badge is `aria-hidden`; the count rides the trigger's accessible name — ONE atomic status, no competing live region; the tooltip renders only at n > 0; row action buttons carry `aria-label` `Accept`/`Reject` with `aria-busy` while acting; the dialog's `aria-busy` rides GuardedConfirm's own contract.
- **The derived-model law (ADR-0028, binding absences):** NO dismiss, NO mark-read, NO per-staff state, NO `notifications` table, NO `refetchInterval` polling (the 60-second escalation is a written-down v2 fence — `grep -c "refetchInterval" apps/admin/src/components/notification.tsx` is 0 forever until an owner ruling). An item leaves only by moderation. All staff see the same count (no gating beyond the shell's session gate — the panel rides `_shell`, matching the tab's audience).
- **The freshness law (D4):** the query is the #288 factory's unchanged options at topbar scope — same key, one shared cache entry with the Submissions tab, freshness from the seam's own contracts (window focus, staleness-bound refetch, the mutations' invalidation) + **refetch on panel-open** via the controlled popover's `onOpenChange(true)`. No loader edits, no prefetch, no polling.
- **The mutation law (D3, the tab's contract):** the panel's two mutations mirror `submissions-tab.tsx`'s reject verbatim in shape — `invalidateBoth()` first, ok closes the confirm + `toast.success`, `!ok` keeps the dialog + `toast.error(result.message)`, `onError` toasts; the accept payload is `{}` (accept-as-is per the schema's absent-keys clause). One confirm at a time; the dialog stays mounted through the act (the row object is tracked directly, never re-looked-up by id — the #304 ruling); while any act runs every row action disables and the acting row alone goes busy.
- **The theme law (#217):** the amber family's dark leg rides `SUBMISSION_STATUS_META` (already dual-theme); the panel composes semantic tokens only; both themes render from one markup — the walkthrough walks both, light judged first.
- **Type-inference provenance:** the trigger/panel/confirm composition's claims (Base UI render-prop chains through Popover/Tooltip/Button, `PopoverContent`'s `align`/`sideOffset`, `Tooltip`'s `side`) are proven by `prototype/bell-panel-variants` clearing typecheck + biome on this exact stack (the spec's Further Notes record); this plan's code blocks are that proven composition adapted to production imports. `@tanstack/react-query` 5.102.8: `useMutation`'s `.variables` (last mutate input), `isPending`, and `useQuery`'s `refetch` are the on-disk v5 vocabulary.

## File Structure

```text
apps/admin/src/lib/
  notification-state.ts            # new (T1) — bellStatus, initialsFromPerson, PANEL_CONFIRM_META, the pending wiring
  notification-state.test.ts       # new (T1) — 13 its
  submissions-state.ts             # modify (T1) — + testimonialsSearchSchema / TestimonialsTab / TestimonialsSearch / initialTab
  submissions-state.test.ts        # modify (T1) — +2 its
apps/admin/src/components/cms/
  shared.tsx                       # modify (T2) — GuardedConfirm's confirmVariant (prototype diff verbatim) + export SUBMISSION_STATUS_META
apps/admin/src/routes/
  _shell.testimonials.tsx          # modify (T3) — validateSearch + the search-passing page wrapper
  routeTree.gen.ts                 # regenerated (T3) — committed with the route change
apps/admin/src/components/testimonials/
  testimonials-screen.tsx          # modify (T3) — the URL-driven tab over initialTab + navigate
apps/admin/src/components/
  notification.tsx                 # new (T4) — the Notification (badge + panel + the two confirms)
  admin-topbar.tsx                 # modify (T4) — the inert bell becomes <Notification />
docs/progress.md AGENTS.md docs/plan.md this plan file   # T5
docs/agents/v1-picks.md graphify-out/                     # T5, post-merge on main
```

---

### Task 1: The lib seams — the badge mapper, the initials rule, the confirm meta, the pending wiring, the tab param (TDD)

The ticket's whole test surface, plus every pure value Tasks 3–4 consume. No component changes yet.

**Files:**
- New (test-first): `apps/admin/src/lib/notification-state.test.ts`
- New: `apps/admin/src/lib/notification-state.ts`
- Modify (test-first): `apps/admin/src/lib/submissions-state.test.ts`
- Modify: `apps/admin/src/lib/submissions-state.ts`

**Interfaces:**
- Produces (what Tasks 3–4 consume): from `#/lib/notification-state` — `bellStatus(count: number): { badge: string | null; ariaName: string; tooltip: string | null }`; `initialsFromPerson(person: string): string`; `type PanelConfirmKind = 'accept' | 'reject'`; `type PanelConfirm = { kind: PanelConfirmKind; row: TestimonialSubmission } | null`; `PANEL_CONFIRM_META: Record<PanelConfirmKind, { title; description; confirmLabel; busyLabel; confirmVariant: 'default' | 'destructive' }>`; `panelActingRowId(acceptPending: boolean, acceptRowId: string | null, rejectPending: boolean, rejectRowId: string | null): string | null`; `rowActionState(actingId: string | null, rowId: string): { disabled: boolean; busy: boolean }`; `confirmBusy(confirm: PanelConfirm, actingId: string | null): boolean`. From `#/lib/submissions-state` — `testimonialsSearchSchema` (tolerant Zod object), `type TestimonialsTab = 'testimonials' | 'submissions'`, `type TestimonialsSearch`, `initialTab(search: TestimonialsSearch): TestimonialsTab`.
- Consumes: `ACCEPTING_LABEL` / `REJECTING_LABEL` from `./save-contract` (single-sourced labels, never re-declared); `TestimonialSubmission` from `@sevendays/types`; `zod` 4 (the audit-log schema's exact tolerant pattern).

**Not here:** any component or route edit (Tasks 2–4); the search engine/seams (#315); any change to the existing `submissions-state.ts` members (segments, filters, accept-edit machinery, `submittedOn` — byte-identical); the `9+` cap anywhere but the badge (the name/tooltip carry n uncapped); new busy labels (the two constants are reused).

- [✅] **Step 1: Write the failing tests**

(a) New file `apps/admin/src/lib/notification-state.test.ts` — the whole file:

```ts
import { describe, expect, it } from 'vitest';
import {
  bellStatus,
  confirmBusy,
  initialsFromPerson,
  PANEL_CONFIRM_META,
  panelActingRowId,
  rowActionState,
} from './notification-state.js';
import { ACCEPTING_LABEL, REJECTING_LABEL } from './save-contract.js';

const row = (id: string) => ({
  id,
  quote: 'The photographer made our graduation shoot feel effortless.',
  person: 'Maria, batch 2026',
  status: 'pending' as const,
  createdAt: new Date('2026-11-16T08:30:00.000Z'),
  updatedAt: new Date('2026-11-16T08:30:00.000Z'),
});

describe('bellStatus (the count → badge / accessible-name / tooltip mapper, D2)', () => {
  it('0 reads as quiet: no badge, the bare name, no tooltip — never a zero', () => {
    expect(bellStatus(0)).toEqual({
      badge: null,
      ariaName: 'Notifications',
      tooltip: null,
    });
  });

  it('1–9 renders the count itself on the badge, the name, and the tooltip', () => {
    expect(bellStatus(1)).toEqual({
      badge: '1',
      ariaName: 'Notifications, 1 pending submissions',
      tooltip: '1 pending submissions',
    });
    expect(bellStatus(9).badge).toBe('9');
  });

  it('10+ caps the BADGE at 9+', () => {
    expect(bellStatus(10).badge).toBe('9+');
    expect(bellStatus(12).badge).toBe('9+');
  });

  it('the cap is visual-only — the accessible name carries the UNCAPPED count', () => {
    expect(bellStatus(12).ariaName).toBe('Notifications, 12 pending submissions');
  });

  it('the tooltip mirrors the name’s count, never the badge’s cap', () => {
    expect(bellStatus(12).tooltip).toBe('12 pending submissions');
    expect(bellStatus(0).tooltip).toBeNull();
  });
});

describe('initialsFromPerson (the letters-only initials rule, #304)', () => {
  it('letters-only words, first two, uppercased — ‘Maria & Paolo Dela Cruz’ → ‘MP’', () => {
    expect(initialsFromPerson('Maria & Paolo Dela Cruz')).toBe('MP');
  });

  it('a single word renders one initial; an empty person renders empty', () => {
    expect(initialsFromPerson('MARCOS')).toBe('M');
    expect(initialsFromPerson('')).toBe('');
  });

  it('digit and symbol words are skipped, not counted — ‘2026 batch — Team A’ → ‘BT’', () => {
    expect(initialsFromPerson('2026 batch — Team A')).toBe('BT');
  });
});

describe('PANEL_CONFIRM_META (the two confirms’ copy + the #304 polarity)', () => {
  it('accept: the D5 copy verbatim, the save-contract busy label, the PRIMARY fill', () => {
    expect(PANEL_CONFIRM_META.accept).toEqual({
      title: 'Accept this submission?',
      description: 'Accepting publishes it as a testimonial at the end of the list.',
      confirmLabel: 'Accept',
      busyLabel: ACCEPTING_LABEL,
      confirmVariant: 'default',
    });
    expect(ACCEPTING_LABEL).toBe('Accepting…');
  });

  it('reject: the tab’s dialog byte-identical, REJECTING_LABEL, destructive — GuardedConfirm’s own default', () => {
    expect(PANEL_CONFIRM_META.reject).toEqual({
      title: 'Reject this submission?',
      description:
        'The submission stays on record as rejected — nothing publishes, and the sender is never told.',
      confirmLabel: 'Reject',
      busyLabel: REJECTING_LABEL,
      confirmVariant: 'destructive',
    });
    expect(REJECTING_LABEL).toBe('Rejecting…');
  });
});

describe('the confirm-state machine (one dialog at a time, the pending wiring)', () => {
  it('panelActingRowId: idle → null; the pending mutation’s row while one runs', () => {
    expect(panelActingRowId(false, null, false, null)).toBeNull();
    expect(panelActingRowId(true, 'row-1', false, null)).toBe('row-1');
    expect(panelActingRowId(false, null, true, 'row-2')).toBe('row-2');
  });

  it('rowActionState: idle → nothing disabled; acting → every action disabled, busy ONLY on the acting row', () => {
    expect(rowActionState(null, 'row-1')).toEqual({ disabled: false, busy: false });
    expect(rowActionState('row-1', 'row-1')).toEqual({ disabled: true, busy: true });
    expect(rowActionState('row-1', 'row-2')).toEqual({ disabled: true, busy: false });
  });

  it('confirmBusy: the dialog is pending only while ITS row is the acting row; a null confirm is never busy', () => {
    const confirm = { kind: 'accept' as const, row: row('row-1') };
    expect(confirmBusy(confirm, 'row-1')).toBe(true);
    expect(confirmBusy(confirm, 'row-2')).toBe(false);
    expect(confirmBusy(confirm, null)).toBe(false);
    expect(confirmBusy(null, 'row-1')).toBe(false);
  });
});
```

(b) `apps/admin/src/lib/submissions-state.test.ts` — replace the value import from `./submissions-state.js` with (three new specifiers in Biome's case-insensitive order):

```ts
import {
  acceptEditStateFromSubmission,
  buildAcceptPayload,
  filterSubmissions,
  initialTab,
  SUBMISSION_SEGMENTS,
  submittedOn,
  testimonialsSearchSchema,
  validateAcceptEdit,
} from './submissions-state.js';
```

then append at the file's end:

```ts
describe('the tab deep-link param (M9 #314)', () => {
  it('absent stays absent, submissions kept, any other value dropped — tolerant, the audit-log posture', () => {
    expect(testimonialsSearchSchema.parse({})).toEqual({});
    expect(testimonialsSearchSchema.parse({ tab: 'submissions' })).toEqual({
      tab: 'submissions',
    });
    expect(testimonialsSearchSchema.parse({ tab: 'nope' })).toEqual({});
  });

  it('initialTab: absent (or dropped) → testimonials — the pre-#314 default; submissions → submissions', () => {
    expect(initialTab({})).toBe('testimonials');
    expect(initialTab(testimonialsSearchSchema.parse({ tab: 'nope' }))).toBe('testimonials');
    expect(initialTab({ tab: 'submissions' })).toBe('submissions');
  });
});
```

- [✅] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @sevendays/admin test -- --run notification-state submissions-state
```

Expected: FAIL — the new `notification-state.test.ts` fails at collection (`Failed to resolve import "./notification-state.js"` — the module does not exist yet, so none of its 13 its run); the two new `submissions-state.test.ts` its run and fail with `TypeError: testimonialsSearchSchema is not a function` / `initialTab is not a function` (vitest transforms without typechecking, so missing exports surface at call time). Every pre-existing it in both matched files still passes. Record the output in `.superpowers/sdd/2026-11-16-314-notification-bell-panel/task-1-red.txt`.

- [✅] **Step 3: Write the minimal implementation**

(a) New file `apps/admin/src/lib/notification-state.ts` — the whole file:

```ts
// The Notification's pure seams (M9 #314, ADR-0028): the count → badge /
// accessible-name / tooltip mapper (the D2 laws — the badge caps at 9+ and
// hides at 0; the count rides the trigger's name UNCAPPED), the panel
// rows' letters-only initials rule (the #304 prototype's, not the
// sidebar's word-based one), and the confirm-state machine — the two
// dialogs' copy (D5's ratified table verbatim) with the #304 polarity
// ruling (accept publishes = the primary fill, reject destroys =
// destructive) and the pending wiring (which row is acting, which dialog
// is busy). No React here — the component composes these; the plain-node
// suite pins them.
import type { TestimonialSubmission } from '@sevendays/types';
import { ACCEPTING_LABEL, REJECTING_LABEL } from './save-contract';

export type PanelConfirmKind = 'accept' | 'reject';

/**
 * One confirm at a time (the machine's law): a single nullable target,
 * not a map — a second dialog can never open beside the first because
 * there is no second slot. The row object is tracked directly (the #304
 * ruling): the dialog stays mounted over its row through the act, never
 * re-looked-up by id.
 */
export type PanelConfirm = { kind: PanelConfirmKind; row: TestimonialSubmission } | null;

/**
 * The count → chrome mapper (D2, ruled at #304): the badge is the pending
 * count as an amber chip, capped '9+' — a backlog never breaks the chrome
 * — and HIDDEN at 0 (a quiet queue reads as quiet, never as a zero). The
 * cap is visual-only: the accessible name and the tooltip carry the
 * UNCAPPED count as one atomic status — `Notifications, {n} pending
 * submissions` — the visual badge is aria-hidden, so the count is heard
 * exactly once.
 */
export function bellStatus(count: number): {
  badge: string | null;
  ariaName: string;
  tooltip: string | null;
} {
  return {
    badge: count > 0 ? (count > 9 ? '9+' : String(count)) : null,
    ariaName: count > 0 ? `Notifications, ${count} pending submissions` : 'Notifications',
    tooltip: count > 0 ? `${count} pending submissions` : null,
  };
}

/**
 * Words with letters only, first two, uppercased — the #304 prototype's
 * rule ('Maria & Paolo Dela Cruz' → 'MP': '&' is not a word, neither is
 * '2026'). NOT the sidebar's word-based initials: submission persons
 * carry commas, batches, and ampersands.
 */
export function initialsFromPerson(person: string): string {
  return person
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * The panel's two confirms — D5's ratified copy table verbatim (#305):
 * the reject dialog is the Submissions tab's GuardedConfirm
 * byte-identical; the accept dialog is the new ratified copy.
 * confirmVariant carries the #304 polarity ruling: accept PUBLISHES = the
 * primary fill ('default'), reject DESTROYS = 'destructive' — which is
 * GuardedConfirm's own default, so the reject dialog renders identically
 * with or without the prop; it rides for symmetry (one meta record, both
 * dialogs).
 */
export const PANEL_CONFIRM_META: Record<
  PanelConfirmKind,
  {
    title: string;
    description: string;
    confirmLabel: string;
    busyLabel: string;
    confirmVariant: 'default' | 'destructive';
  }
> = {
  accept: {
    title: 'Accept this submission?',
    description: 'Accepting publishes it as a testimonial at the end of the list.',
    confirmLabel: 'Accept',
    busyLabel: ACCEPTING_LABEL,
    confirmVariant: 'default',
  },
  reject: {
    title: 'Reject this submission?',
    description:
      'The submission stays on record as rejected — nothing publishes, and the sender is never told.',
    confirmLabel: 'Reject',
    busyLabel: REJECTING_LABEL,
    confirmVariant: 'destructive',
  },
};

/**
 * Which row is acting: the pending mutation's row id, else null. One act
 * at a time by construction — the confirm machine opens one dialog, and
 * only that dialog's confirm ever fires.
 */
export function panelActingRowId(
  acceptPending: boolean,
  acceptRowId: string | null,
  rejectPending: boolean,
  rejectRowId: string | null
): string | null {
  if (acceptPending) {
    return acceptRowId;
  }
  return rejectPending ? rejectRowId : null;
}

/**
 * A row's action wiring: while any act runs EVERY action disables (a
 * second confirm can never open mid-flight), and the acting row alone
 * goes busy — the spinner takes the icon's place, aria-busy carries the
 * state (#218's icon-only half).
 */
export function rowActionState(
  actingId: string | null,
  rowId: string
): { disabled: boolean; busy: boolean } {
  return { disabled: actingId !== null, busy: actingId === rowId };
}

/**
 * The open dialog's pending: true only while ITS row is the acting row —
 * the spinner + busy label + disabled Cancel ride the dialog through the
 * act (GuardedConfirm's own contract), and nothing else can busy it.
 */
export function confirmBusy(confirm: PanelConfirm, actingId: string | null): boolean {
  return confirm !== null && actingId === confirm.row.id;
}
```

(b) `apps/admin/src/lib/submissions-state.ts` — add the zod import after the `@sevendays/types` import block (Biome sorts the external `zod` after it):

```ts
import { z } from 'zod';
```

then append at the file's end (after `submittedOn`):

```ts
// The screen's two-tab deep link (M9 #314): the Notification panel's
// `Open Submissions` footer lands on the queue — a tolerant optional
// param on the testimonials route (the audit-log precedent), absent =
// the published list, exactly the pre-#314 default. #218's "local
// state, no routes" ruling is amended in spirit only: still one screen,
// no new route — the tab became the URL-driven segment so a link can
// aim at it.
export type TestimonialsTab = 'testimonials' | 'submissions';

export const testimonialsSearchSchema = z.object({
  tab: z.enum(['testimonials', 'submissions']).optional().catch(undefined),
});

export type TestimonialsSearch = z.infer<typeof testimonialsSearchSchema>;

/** Absent (or garbage, dropped by the catch) → the published list — the pre-#314 default, unchanged. */
export function initialTab(search: TestimonialsSearch): TestimonialsTab {
  return search.tab === 'submissions' ? 'submissions' : 'testimonials';
}
```

- [✅] **Step 4: Run the tests to verify they pass**

```bash
pnpm --filter @sevendays/admin test -- --run
```

Expected: PASS — the full admin suite runs (admin's `test` script is bare `vitest run`, so the full-suite floor IS the verification): **Test Files 31 passed (31) · Tests 325 passed (325)** (the 310 baseline + 13 + 2).

- [✅] **Step 5: Lint, format, typecheck**

```bash
pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/admin typecheck
```

Expected: both green (accept `fix`'s rewrites — import order especially; re-run the suite from Step 4 if it rewrote anything).

- [✅] **Step 6: Commit**

```bash
git add apps/admin/src/lib/notification-state.ts apps/admin/src/lib/notification-state.test.ts apps/admin/src/lib/submissions-state.ts apps/admin/src/lib/submissions-state.test.ts
git commit -m "feat(admin): the Notification lib seams + the Submissions tab deep-link param (#314)"
```

### Task 2: The `cms/shared.tsx` ports — `GuardedConfirm.confirmVariant` + the exported pending family

The spec's one production-file touch ("one defaulted prop ports into `GuardedConfirm`"), ported byte-identical from the prototype (commit `35e5a0f`), plus the one-word export the badge needs so the amber family can never drift from the tab's badge. No suite change — the polarity pins live in Task 1's `PANEL_CONFIRM_META` its; the byte-identical proof is this task's grep gates.

**Files:**
- Modify: `apps/admin/src/components/cms/shared.tsx` (the `SUBMISSION_STATUS_META` const at 161, `GuardedConfirm` at 573-680)

**Interfaces:**
- Produces (what Task 4 consumes): `GuardedConfirm`'s new optional prop `confirmVariant?: 'default' | 'destructive'` (destructure default `'destructive'`) applied as `variant={confirmVariant}` on the `AlertDialogAction`; the exported `SUBMISSION_STATUS_META` (unchanged shape).
- Consumes: nothing new — self-contained.

**Not here:** any behavior change to the existing 20+ `GuardedConfirm`/`DeleteGuardDialog`/`DeactivateConfirm` call sites (they pass no `confirmVariant` → the default preserves them byte-identically — the grep gate proves it); the delete dialog, deactivate confirm, or any other shared member; the amber string re-typed anywhere (Task 4 reads the const); `notification.tsx` (Task 4).

- [✅] **Step 1: Load the UI/UX skill set**

Per AGENTS.md, load `prototype` + `ui-ux-pro-max` (plus `design-system` as relevant) before editing. The rendered diff is pinned below verbatim — the skills inform judgment (the variant polarity's visual weight), not re-composition.

- [✅] **Step 2: Export `SUBMISSION_STATUS_META`**

In `apps/admin/src/components/cms/shared.tsx`, replace (line 161):

```tsx
const SUBMISSION_STATUS_META: Record<
```

with:

```tsx
/** Exported for the Notification's badge (M9 #314): the amber pending family rides the one source — no drift. */
export const SUBMISSION_STATUS_META: Record<
```

(The const body, the three statuses, and `SubmissionStatusBadge` are untouched.)

- [✅] **Step 3: The `confirmVariant` port (the prototype diff, verbatim)**

(a) In `GuardedConfirm`'s destructure (line 576-583), replace:

```tsx
export function GuardedConfirm({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  busyLabel,
  pending,
```

with:

```tsx
export function GuardedConfirm({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  busyLabel,
  confirmVariant = 'destructive',
  pending,
```

(b) In the props type (line 589-590), replace:

```tsx
  busyLabel: string;
  pending: boolean;
```

with:

```tsx
  busyLabel: string;
  /**
   * The confirm button's pair — 'destructive' everywhere except the
   * accept-publishes guard, which takes 'default' (the primary fill):
   * owner-ruled at the #304 prototype reaction, 2026-11-16. Every existing
   * call site is unchanged (destructive stays the default).
   */
  confirmVariant?: 'default' | 'destructive';
  pending: boolean;
```

(c) On the `AlertDialogAction` (line 664-669), replace:

```tsx
                <AlertDialogAction
                  variant='destructive'
                  disabled={pending}
```

with:

```tsx
                <AlertDialogAction
                  variant={confirmVariant}
                  disabled={pending}
```

- [✅] **Step 4: Grep gates — the port is additive and nothing else touches `confirmVariant`**

```bash
grep -c "confirmVariant" apps/admin/src/components/cms/shared.tsx
grep -rn "confirmVariant" apps/admin/src --include='*.tsx' | grep -v 'cms/shared.tsx'
grep -c "export const SUBMISSION_STATUS_META" apps/admin/src/components/cms/shared.tsx
```

Expected: `3` (the destructure default, the prop-type line, the `variant=` application — comments name it in prose only); **empty** (no `.tsx` call site passes the prop yet — Task 4's `notification.tsx` becomes the first, which IS the byte-identical proof for every existing call site); `1`. Save the output as `.superpowers/sdd/2026-11-16-314-notification-bell-panel/task-2-grep.txt`.

- [✅] **Step 5: Lint, format, test, typecheck**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test -- --run
pnpm --filter @sevendays/admin typecheck
```

Expected: all green; the suite stays at **Test Files 31 passed (31) · Tests 325 passed (325)** (no suite change in this task). No build — no route module graph gains an import (the export is consumed first in Task 4).

- [✅] **Step 6: Commit**

```bash
git add apps/admin/src/components/cms/shared.tsx
git commit -m "feat(admin): GuardedConfirm's confirmVariant + the exported pending status family (#314)"
```

### Task 3: The Submissions-tab deep link — `?tab=` on the testimonials route

The footer link's landing mechanism (AC: "lands on the Submissions tab"), built first so Task 4's `Link` typechecks against a registered search shape. The audit-log precedent verbatim in structure: a tolerant Zod schema in the feature lib (Task 1 landed it), `validateSearch` on the route, the route component passing `search` down, the screen driving its tab through `navigate`.

**Files:**
- Modify: `apps/admin/src/routes/_shell.testimonials.tsx` (header comment, imports, route options, the page wrapper)
- Modify: `apps/admin/src/components/testimonials/testimonials-screen.tsx` (header comment amendment, imports, the tab state block at 225)
- Regenerated + committed: `apps/admin/src/routeTree.gen.ts`

**Interfaces:**
- Consumes: `testimonialsSearchSchema`, `TestimonialsSearch`, `initialTab`, `TestimonialsTab` (Task 1, `#/lib/submissions-state`); `useNavigate` (`@tanstack/react-router` — the audit screen's own import).
- Produces: the route's registered search shape `/{?tab: 'testimonials' | 'submissions'}` — what Task 4's footer `Link to='/testimonials' search={{ tab: 'submissions' }}` typechecks against.

**Not here:** the footer link itself (Task 4 — this task lands the target it aims at); any change to the screen's lists, editor, DnD, segments, or the `SubmissionsTab` (only the tab switch mechanism changes); `?focus=` (#316's param, never referenced here); the route's loader/head/gating (byte-identical); the sidebar's Testimonials link (it aims at the bare route — absent param = the published list, unchanged).

- [✅] **Step 1: Load the UI/UX skill set**

Per AGENTS.md, load `prototype` + `ui-ux-pro-max` before editing. The behavior is pinned: the tab renders exactly as before, its switcher now writes the URL.

- [✅] **Step 2: The route — `validateSearch` + the passing wrapper**

In `apps/admin/src/routes/_shell.testimonials.tsx`:

(a) Replace the header comment's last paragraph (lines 4-7):

```tsx
// entry point. The screen owns its state (person-main rows + the
// grip-handle reorder + the editor wiring) and composes its own PageHeader
// (the `New testimonial` action toggles the screen's create state, so the
// header lives where the state lives) — the route only mounts it under the
// pinned head title.
```

with:

```tsx
// entry point. The screen owns its state (person-main rows + the
// grip-handle reorder + the editor wiring) and composes its own PageHeader
// (the `New testimonial` action toggles the screen's create state, so the
// header lives where the state lives) — the route only mounts it under the
// pinned head title. M9 #314: the tab deep link — the Notification
// panel's `Open Submissions` footer aims at ?tab=submissions (tolerant by
// construction, the audit-log posture: a stale or hand-edited value drops
// to the default, never fails a visit).
```

(b) Replace the import block + route + wrapper (lines 9-27) with:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { TestimonialsScreen } from '#/components/testimonials/testimonials-screen';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';
import { testimonialsSearchSchema } from '#/lib/submissions-state';

export const Route = createFileRoute('/_shell/testimonials')({
  head: () => ({ meta: [{ title: 'Testimonials | Sevendays Admin' }] }),
  validateSearch: testimonialsSearchSchema,
  // M8 #288: hover-intent priming — the testimonials rows + the
  // submissions queue (fire-and-forget, never blocks).
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.testimonials(queryClient));
  },
  component: TestimonialsPage,
});

function TestimonialsPage() {
  const search = Route.useSearch();
  return <TestimonialsScreen search={search} />;
}
```

- [✅] **Step 3: The screen — the URL-driven tab**

In `apps/admin/src/components/testimonials/testimonials-screen.tsx`:

(a) Amend the screen's tab comment + state (line 222-225). Replace:

```tsx
  // The screen's two tabs (#218): the published list and the moderation
  // queue — local state, no routes (the queue is a stop on an existing
  // screen, not a new place to remember).
  const [tab, setTab] = useState<'testimonials' | 'submissions'>('testimonials');
```

with:

```tsx
  // The screen's two tabs (#218): the published list and the moderation
  // queue — the queue is a stop on an existing screen, not a new place to
  // remember. M9 #314 amends the mechanism, not the ruling: the tab is
  // URL-driven (the audit-log precedent) so the Notification's `Open
  // Submissions` footer can aim at the queue; absent param = the published
  // list, exactly the pre-#314 default.
  const navigate = useNavigate();
  const tab = initialTab(search);
  const setTab = (next: TestimonialsTab) => {
    void navigate({ to: '/testimonials', search: next === 'testimonials' ? {} : { tab: next } });
  };
```

(b) The component signature (line 212). Replace:

```tsx
export function TestimonialsScreen() {
```

with:

```tsx
export function TestimonialsScreen({ search }: { search: TestimonialsSearch }) {
```

(c) Imports — add `useNavigate` to the TanStack import (none exists yet in this file; insert after the `@dnd-kit/utilities` import, before `@sevendays/types` — Biome sorts `@tanstack/...` after `@dnd-kit/...`):

```tsx
import { useNavigate } from '@tanstack/react-router';
```

and add the three specifiers to a new `#/lib/submissions-state` import (placed after `#/lib/save-contract` and before `#/lib/status-segment`, Biome's order):

```tsx
import { initialTab, type TestimonialsSearch, type TestimonialsTab } from '#/lib/submissions-state';
```

(The `SegmentedControl` call at line 492-500 is byte-identical — `value={tab} onChange={setTab}` now reads the derived tab and writes the URL. The `PageHeader` actions branch at 481 already branches on `tab` — unchanged.)

- [✅] **Step 4: Regenerate the route tree**

```bash
pnpm --filter @sevendays/admin generate-routes
```

Expected: `routeTree.gen.ts` regenerates with the testimonials route's search schema registered (the file is committed; the regen rides this task's commit). If the generator reports no change, verify `git status apps/admin/src/routeTree.gen.ts` — the validateSearch addition MUST be reflected (an unchanged gen file means the route edit didn't save).

- [✅] **Step 5: Grep gate — the wiring is complete and `useState` no longer holds the tab**

```bash
grep -n "initialTab\|validateSearch\|useNavigate" apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/routes/_shell.testimonials.tsx
grep -c "useState<'testimonials' | 'submissions'>" apps/admin/src/components/testimonials/testimonials-screen.tsx
```

Expected: the first grep shows `validateSearch` + the wrapper's `Route.useSearch()` in the route, `useNavigate` + `initialTab(search)` + the `setTab` navigate in the screen; the second is `0`. Save as `task-3-grep.txt`.

- [✅] **Step 6: Lint, format, test, typecheck, build**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test -- --run
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin build
```

Expected: all green; the suite stays at **Test Files 31 passed (31) · Tests 325 passed (325)**; the build succeeds with the route graph's new zod edge (the #218 execution ruling — a route's module graph gained an import).

- [✅] **Step 7: Commit**

```bash
git add apps/admin/src/routes/_shell.testimonials.tsx apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/routeTree.gen.ts
git commit -m "feat(admin): the Submissions tab deep link - ?tab= on the testimonials route (#314)"
```

### Task 4: The Notification — the derived bell + panel, live in the topbar

The composition: Variant C ported from `prototype/bell-panel-variants` (`variant-c-dense-list.tsx`, commits `85e75e1`→`35e5a0f`), the prototype's stub seams replaced by production ones — the #288 query at topbar scope, the tab's mutation contracts, `SUBMISSION_STATUS_META` for the badge, the Task 1 lib for every pure value. The inert bell button dies; the search Input is untouched (#315's).

**Files:**
- New: `apps/admin/src/components/notification.tsx`
- Modify: `apps/admin/src/components/admin-topbar.tsx` (header comment, imports, the bell mount at 24-26)

**Interfaces:**
- Consumes: `bellStatus`, `initialsFromPerson`, `PANEL_CONFIRM_META`, `panelActingRowId`, `rowActionState`, `confirmBusy`, `type PanelConfirm` (Task 1); `GuardedConfirm` + `confirmVariant` + `SUBMISSION_STATUS_META` + `PendingSpinner` + `QueryErrorState` + `QUERY_ERROR_LINE` (Task 2 / on disk); `adminTestimonialSubmissionQueries` + `adminTestimonialQueries` (on disk, unchanged); `acceptAdminTestimonialSubmission` / `rejectAdminTestimonialSubmission` (on disk — the panel's accept sends `payload: {}`); `filterSubmissions` + `submittedOn` (on disk); `Link to='/testimonials' search={{ tab: 'submissions' }}` (Task 3's registered shape).
- Produces: `Notification` — the topbar's bell mount; nothing else consumes it.

**Not here:** the search Input (inert, #315's); any change to the Submissions tab (its own contracts are untouched by D3); dismiss/mark-read/polling (ADR-0028's absences — `refetchInterval` never appears); a shell-loader prime (rejected at plan time — see the recon note); the `ml-auto` moving anywhere but the trigger's Button (the topbar's right-cluster layout is unchanged); edits to `packages/ui` (the popover/tooltip/button primitives are consumed as installed).

- [✅] **Step 1: Load the UI/UX skill set**

Per AGENTS.md and the ticket's Execution notes: `prototype` + `ui-ux-pro-max`, plus `notification-design`, `design-system`, `tanstack-query-best-practices`, and `dark-mode-design`. The render is pinned below — the skills inform judgment (focus order through the panel, the amber chip's dark leg, the query wiring), not re-composition.

- [✅] **Step 2: New file `apps/admin/src/components/notification.tsx`** — the whole file:

```tsx
// The Notification (M9 #314, ADR-0028): the admin chrome's derived view
// over the pending-submissions queue — the badge IS the pending count, the
// panel lists the submissions themselves with confirm-guarded Accept and
// Reject, and an item leaves only by moderation (no dismiss, no mark-read,
// no per-staff state — the derived ruling's absences ARE the model). The
// query is the #288 factory at topbar scope (the topbar renders on every
// shell screen): the same ['admin', 'testimonial-submissions'] key the
// Submissions tab reads — one shared cache entry, so badge and tab update
// together by construction; freshness rides the seam's own contracts
// (window focus, staleness-bound refetch, the moderation mutations) plus a
// refetch on panel-open (D4). Anatomy: Variant C per #304 (dense list +
// initials), ported from prototype/bell-panel-variants — values and
// rulings, never the branch; the accept dialog's confirm takes the primary
// fill (confirmVariant, the #304 owner reaction — accept publishes, it
// doesn't destroy).
import type { TestimonialSubmission } from '@sevendays/types';
import { Button } from '@sevendays/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@sevendays/ui/components/popover';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Bell, Check, X } from 'lucide-react';
import { useState } from 'react';
import {
  GuardedConfirm,
  PendingSpinner,
  QUERY_ERROR_LINE,
  QueryErrorState,
  SUBMISSION_STATUS_META,
} from '#/components/cms/shared';
import {
  acceptAdminTestimonialSubmission,
  rejectAdminTestimonialSubmission,
} from '#/lib/admin.functions';
import { adminTestimonialQueries, adminTestimonialSubmissionQueries } from '#/lib/cms-queries';
import {
  bellStatus,
  confirmBusy,
  initialsFromPerson,
  type PanelConfirm,
  PANEL_CONFIRM_META,
  panelActingRowId,
  rowActionState,
} from '#/lib/notification-state';
import { filterSubmissions, submittedOn } from '#/lib/submissions-state';

/** The first-load skeleton's fixed rows — stable keys, the tab's posture. */
const PENDING_SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3'];

export function Notification() {
  const {
    data: submissions,
    isPending,
    isError,
    refetch,
  } = useQuery(adminTestimonialSubmissionQueries.all());
  const queryClient = useQueryClient();
  // Controlled open — the refetch-on-open law (D4) rides onOpenChange:
  // what is examined is fresh. 60-second polling is the written-down v2
  // fence, NOT built (ADR-0028).
  const [open, setOpen] = useState(false);
  // One dialog at a time (the confirm-state machine's law).
  const [confirming, setConfirming] = useState<PanelConfirm>(null);

  // The tab's invalidation pair verbatim: badge, panel, and tab all ride
  // the submissions key; the testimonials list read joins so an accepted
  // row's published testimonial lands in one refetch.
  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: adminTestimonialSubmissionQueries.all().queryKey });
    queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
  };

  // Accept-as-is: the panel has no edit surface, so the payload carries
  // no keys — absent keys keep the submission's stored text (the accept
  // schema's own clause). Pending-guarded by construction (the panel
  // lists only pending rows); failure keeps the dialog + toasts (retry
  // safe, the #218 hold law).
  const accept = useMutation({
    mutationFn: (row: TestimonialSubmission) =>
      acceptAdminTestimonialSubmission({ data: { id: row.id, payload: {} } }),
    onSuccess: (result) => {
      invalidateBoth();
      if (result.ok) {
        setConfirming(null);
        toast.success('Accepted.');
        return;
      }
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Reject-retains: the tab's contract verbatim (strings, labels, toasts).
  const reject = useMutation({
    mutationFn: (row: TestimonialSubmission) =>
      rejectAdminTestimonialSubmission({ data: { id: row.id } }),
    onSuccess: (result) => {
      invalidateBoth();
      if (result.ok) {
        setConfirming(null);
        toast.success('Rejected.');
        return;
      }
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rows = filterSubmissions(submissions ?? [], 'pending');
  const count = rows.length;
  const status = bellStatus(count);
  const actingId = panelActingRowId(
    accept.isPending,
    accept.variables?.id ?? null,
    reject.isPending,
    reject.variables?.id ?? null
  );

  return (
    // One provider over the whole surface — the trigger's hint and the
    // rows' action hints (context flows through the popover's portal).
    <TooltipProvider>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            void refetch();
          }
        }}
      >
        <Tooltip>
          {/* The trigger composes both primitives on one element — the
              Base UI chain: TooltipTrigger → PopoverTrigger → Button
              (outermost first, the house render-prop idiom). The count
              rides the accessible name; the visual badge is aria-hidden —
              one atomic status, no competing live region (D2). */}
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon'
                    type='button'
                    className='relative ml-auto'
                    aria-label={status.ariaName}
                  />
                }
              >
                <Bell aria-hidden='true' />
                {status.badge !== null ? (
                  <span
                    aria-hidden='true'
                    className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border px-1 text-[10px] leading-none font-semibold ${SUBMISSION_STATUS_META.pending.className}`}
                  >
                    {status.badge}
                  </span>
                ) : null}
              </PopoverTrigger>
            }
          />
          {status.tooltip !== null ? (
            <TooltipContent side='bottom'>{status.tooltip}</TooltipContent>
          ) : null}
        </Tooltip>
        <PopoverContent align='end' className='w-[400px] p-0'>
          {/* The workbar header (D2): uppercase-muted title + the count.
              While the first read is in flight there is no number to show
              — the header renders without one rather than a lying 0. */}
          <div className='text-muted-foreground flex items-center justify-between border-b px-4 py-2.5'>
            <p className='text-[11px] font-medium tracking-wide uppercase'>Pending submissions</p>
            <p className='text-xs'>{submissions === undefined ? null : count}</p>
          </div>
          {isError ? (
            // The house failed-read posture (#155) — the panel never
            // fakes the empty line over a failed read; the footer
            // persists.
            <div className='px-4 py-6'>
              <QueryErrorState
                line={QUERY_ERROR_LINE}
                onRetry={() => {
                  void refetch();
                }}
              />
            </div>
          ) : isPending || !submissions ? (
            // First-load posture: skeleton rows echoing the dense row
            // anatomy — the tab's own posture, scaled to the panel.
            <div className='max-h-[380px] space-y-3.5 overflow-y-auto p-4'>
              {PENDING_SKELETON_KEYS.map((key) => (
                <div key={key} className='flex items-start gap-3'>
                  <Skeleton className='size-8 shrink-0 rounded-full' />
                  <div className='flex-1 space-y-1.5'>
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-3 w-1/3' />
                  </div>
                </div>
              ))}
            </div>
          ) : count === 0 ? (
            // On-disk copy: the tab's pending-segment empty line, verbatim
            // (#216).
            <p className='text-muted-foreground px-4 py-10 text-center text-sm'>
              No pending submissions.
            </p>
          ) : (
            <div className='max-h-[380px] overflow-y-auto'>
              {rows.map((row) => {
                const action = rowActionState(actingId, row.id);
                return (
                  <div
                    key={row.id}
                    className='flex items-start gap-3 border-b px-4 py-2.5 last:border-b-0'
                  >
                    <span className='bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium'>
                      {initialsFromPerson(row.person)}
                    </span>
                    <div className='min-w-0 flex-1 space-y-0.5'>
                      <p className='line-clamp-2 text-sm'>{row.quote}</p>
                      <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                        <span className='font-medium'>{row.person}</span>
                        <span aria-hidden='true'>·</span>
                        <span>{submittedOn(row)}</span>
                      </div>
                    </div>
                    <div className='flex shrink-0 gap-1'>
                      {/* Icon-only actions — the vocabulary law's icon
                          half: the spinner takes the icon's place,
                          aria-busy carries state; the hover hints name
                          them for sighted users, the aria-label stays the
                          accessible name. */}
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              type='button'
                              aria-label='Accept'
                              disabled={action.disabled}
                              aria-busy={action.busy}
                              onClick={() => setConfirming({ kind: 'accept', row })}
                            >
                              {action.busy ? <PendingSpinner /> : <Check aria-hidden='true' />}
                            </Button>
                          }
                        />
                        <TooltipContent side='top'>Accept</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              type='button'
                              aria-label='Reject'
                              className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                              disabled={action.disabled}
                              aria-busy={action.busy}
                              onClick={() => setConfirming({ kind: 'reject', row })}
                            >
                              {action.busy ? <PendingSpinner /> : <X aria-hidden='true' />}
                            </Button>
                          }
                        />
                        <TooltipContent side='top'>Reject</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* The footer rides EVERY state (D2): the full vocabulary —
              accept-with-edit, delete — stays one click away in the tab.
              The click closes the popover so the landing screen isn't
              overlaid. */}
          <div className='border-t p-2'>
            <Button
              variant='link'
              size='sm'
              type='button'
              className='w-full'
              render={
                <Link
                  to='/testimonials'
                  search={{ tab: 'submissions' }}
                  onClick={() => {
                    setOpen(false);
                  }}
                />
              }
            >
              Open Submissions
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {confirming ? (
        <GuardedConfirm
          title={PANEL_CONFIRM_META[confirming.kind].title}
          description={PANEL_CONFIRM_META[confirming.kind].description}
          confirmLabel={PANEL_CONFIRM_META[confirming.kind].confirmLabel}
          busyLabel={PANEL_CONFIRM_META[confirming.kind].busyLabel}
          confirmVariant={PANEL_CONFIRM_META[confirming.kind].confirmVariant}
          pending={confirmBusy(confirming, actingId)}
          blockers={[]}
          open={true}
          onOpenChange={(next) => {
            if (!next) {
              setConfirming(null);
            }
          }}
          onConfirm={() => {
            if (confirming.kind === 'accept') {
              accept.mutate(confirming.row);
            } else {
              reject.mutate(confirming.row);
            }
          }}
        />
      ) : null}
    </TooltipProvider>
  );
}
```

- [✅] **Step 3: The topbar mount**

Replace `apps/admin/src/components/admin-topbar.tsx` whole:

```tsx
// Admin-local Tier 2 (spec #94): the sticky top bar — sidebar collapse
// trigger, search, notifications (#59 variant A). The bell is live since
// M9 #314: the Notification, a derived view over the pending-submissions
// queue (ADR-0028). Search stays present but inert — Global Search is
// #315's ticket, not this one's; the IA is unchanged.

import { Input } from '@sevendays/ui/components/input';
import { Separator } from '@sevendays/ui/components/separator';
import { SidebarTrigger } from '@sevendays/ui/components/sidebar';
import { ThemeToggle } from '@sevendays/ui/components/theme-toggle';
import { Notification } from '#/components/notification';

export function AdminTopbar() {
  return (
    <header className='bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur'>
      <SidebarTrigger />
      <Separator orientation='vertical' className='h-4' />
      <Input
        type='search'
        placeholder='Search…'
        aria-label='Search'
        className='hidden w-56 sm:block'
      />
      <Notification />
      <ThemeToggle />
    </header>
  );
}
```

(The old inert `Button`/`Bell` imports die with the button; the Notification's trigger carries `relative ml-auto` internally — the right-cluster layout is byte-identical.)

- [✅] **Step 4: Grep gates — the AC laws are present in the render**

```bash
grep -c "aria-busy" apps/admin/src/components/notification.tsx
grep -c "refetchInterval" apps/admin/src/components/notification.tsx
grep -c "SUBMISSION_STATUS_META.pending.className" apps/admin/src/components/notification.tsx
grep -n "Open Submissions\|No pending submissions.\|Pending submissions" apps/admin/src/components/notification.tsx
grep -c "confirmVariant" apps/admin/src/components/notification.tsx
```

Expected: `2` (the two row action buttons — the dialog's `aria-busy` rides GuardedConfirm's own contract in `shared.tsx`); **`0`** (the polling fence holds — a nonzero count is a re-ruling, stop and report; dismiss/mark-read have no code form to grep for, which IS the absence proof — they appear only as the header comment's named absences and as no lib export); `1` (the badge chip's read — the import line carries the bare `SUBMISSION_STATUS_META` specifier); the three copy lines each hit exactly once; `1` (the dialog's `confirmVariant` — the FIRST `.tsx` call site passing it, making Task 2's byte-identical proof concrete). Save as `task-4-grep.txt`.

- [✅] **Step 5: Lint, format, test, typecheck, build**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test -- --run
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin build
```

Expected: all green; the suite stays at **Test Files 31 passed (31) · Tests 325 passed (325)**; the build succeeds with `notification.tsx` entering every route's graph via the topbar.

- [✅] **Step 6: Commit**

```bash
git add apps/admin/src/components/notification.tsx apps/admin/src/components/admin-topbar.tsx
git commit -m "feat(admin): the Notification - the derived bell + panel live in the topbar (#314)"
```

### Task 5: Gates, the owner's as-built variants reaction, the live walkthrough, docs rotation, PR, the v1 pick, issues, graphify

**Files:**
- Modify: `docs/progress.md` (one dated entry, newest first), `AGENTS.md` (two pinned find/replace edits), `docs/plan.md` (the FIRST M9 checkbox), this plan file (ticked boxes)
- Post-merge on main: `docs/agents/v1-picks.md` (one ledger row), `graphify-out/` (the graph update)

**Interfaces:** consumes the four code commits (Tasks 1–4); produces nothing code-facing.

**Not here:** any code change (a defect found by Step 2 or Step 3 goes back to its owning task's file with its own `fix(admin): … (#314)` commit, then this task re-runs from Step 1); the Search tickets' M9 roadmap boxes (#315/#316 own theirs — never tick them here); `docs/plan.md` beyond the one checkbox; the exit-gate walkthrough (#317's live-stack ceremony — Task 5's walkthrough is this ticket's own verification, not the milestone's).

- [✅] **Step 1: The full check + the soft-ceiling gate**

```bash
pnpm check
git diff --stat main...HEAD -- apps/api apps/landing packages/ pnpm-lock.yaml
```

Expected: `pnpm check` green across the repo; the diff-stat **empty** (D11 proven — zero api/landing/packages/manifest changes). Floors after this ticket: admin **31 files / 325 tests**; every other suite unchanged from AGENTS.md's recorded floors.

- [✅] **Step 2: The owner's as-built variants reaction (BLOCKING — the #94 amendment)**

The #94 amendment's round for this ticket: the as-built production render, both themes, light judged first. Mechanics: bring up the dev stack (`pnpm --filter @sevendays/api dev` + `pnpm --filter @sevendays/admin dev` — serial note: never admin + landing together, both pin `:3000`); seed two throwaway submissions via the public POST (curl to the local api — no landing needed):

```bash
curl -X POST http://localhost:8787/api/v1/testimonial-submissions \
  -H 'content-type: application/json' \
  -d '{"quote":"The photographer made our graduation shoot feel effortless from booking to final frames.","person":"Maria, batch 2026"}'
curl -X POST http://localhost:8787/api/v1/testimonial-submissions \
  -H 'content-type: application/json' \
  -d '{"quote":"They handled our whole family with patience and the photos came out beautiful.","person":"Paolo & Elena Dela Cruz"}'
```

Then capture with a throwaway HEADLESS Playwright script kept OUTSIDE the repo (scripted sign-in with the controller's dev staff account — the owner's local credentials, never written to the evidence dir, never committed): the eight states, light first — (1) the bell with the amber `2` badge, (2) the trigger tooltip `{n} pending submissions`, (3) the open panel (workbar + two dense rows), (4) the accept dialog, (5) the reject dialog, (6) the empty state (`No pending submissions.` + footer), (7) the error arm is optional to stage (stop the api, open the panel — capture only if trivial); then the dark counterparts of 1-6 via the topbar's theme toggle. Post the captures to #314 (`gh issue comment 314`) with the question: **the as-built Notification in both themes — accept as-rendered, or findings?** Then **BLOCK on the owner's answer** (the wait-for-owner rule — never assume while the owner may be AFK). Disposition per the house pattern: accept → proceed; findings → fix-batch commits on this branch (or follow-up issues if ruled out of scope), re-capture, re-ask. Record the verdict in `.superpowers/sdd/2026-11-16-314-notification-bell-panel/variants-verdict.md`.

- [✅] **Step 3: The live walkthrough (the headed go-gate, evidence for the PR)**

**Announce first, wait for the owner's "go" before firing any headed-browser login** (the #310 census rule — the timer flow ends "ready — say go", never auto-fires). With the go: drive a HEADED browser over the dev stack (the same seed from Step 2 still pending). Walk, in order, capturing each numbered state to the evidence dir (light first, then dark via the topbar toggle):

1. Sign in → land on `/` (the dashboard — an unrelated screen): the bell carries the amber badge `2`; the DOM's trigger `aria-label` is `Notifications, 2 pending submissions` (inspect — one atomic status); the badge span is `aria-hidden`.
2. Hover the bell: the tooltip reads `2 pending submissions` (side bottom).
3. Open the panel: a refetch fires (devtools network — the refetch-on-open law); the workbar reads `Pending submissions` + `2`; each row = initials avatar, the 2-line quote, `person · date`; the icon hovers hint `Accept` / `Reject`.
4. Accept row 1: the dialog shows the D5 copy and its confirm button in the **primary fill**; confirm → the button goes spinner + `Accepting…` + `aria-busy` (add an artificial ~2 s delay on `**/_serverFn/**` POSTs via the browser session to observe it); success → `Accepted.` toast, the dialog drops, the row leaves, the badge reads `1` — and `/testimonials` shows the new testimonial at the END of render order (the #216 flow).
5. Reject row 2: the dialog shows the tab's strings verbatim with the **destructive** confirm; confirm → `Rejecting…` → `Rejected.` toast, the row leaves the panel, the badge hides (0 = quiet), the trigger's `aria-label` reads bare `Notifications`.
6. Reopen the panel: `No pending submissions.` centered, the `Open Submissions` footer persisting; the Submissions tab shows the rejected row retained (All/Rejected segments).
7. From `/` (unrelated screen), open the panel → click `Open Submissions`: lands on `/testimonials?tab=submissions` with the **Submissions tab active**; the tab segment click back to Testimonials cleans the URL to `/testimonials`; a bare `/testimonials` visit opens on the published list (the pre-#314 default, unchanged).
8. Clean up: delete the accepted testimonial (the CMS Testimonials tab) and delete the rejected + accepted submission rows (the Submissions tab's delete-any-status) — leave the queue and the list as found.

Then dark theme: repeat 1-6 (the amber badge's dark leg, the primary accept confirm, the panel surfaces — the #217 law). Write `walkthrough.md` narrating each state's observed outcome. Any deviation is a defect — fix it in the owning task's file, re-run that task's gates, commit `fix(admin): … (#314)`, and restart this task from Step 1.

- [✅] **Step 4: `docs/progress.md` — the dated entry (newest first, pinned)**

Insert as the first entry under `# Progress` (replace `2026-11-XX` with the docs commit's date):

```markdown
- **2026-11-XX — M9 ticket 1, the Notification (#314) — build complete on `feat/314-notification`, PR pending.** The admin topbar's inert bell is live as the Notification (ADR-0028: a derived view over the pending-submissions queue): the badge is the pending count — an amber chip on the exported `SUBMISSION_STATUS_META.pending` family, capped `9+`, hidden at 0, the count riding the trigger's accessible name uncapped (`Notifications, {n} pending submissions`, the visual badge aria-hidden, the tooltip at n > 0 only); the panel is #304's ruled Variant C (400px popover, workbar header + count, divide-y dense rows with letters-only initials avatars, 2-line quote, person · submittedOn meta, icon-only ✓/✗ with hover hints through one hoisted TooltipProvider, the `Open Submissions` footer in every state) with the house's pending/error postures (skeleton rows on first load; `QueryErrorState` on a failed read — never a faked empty line); both actions confirm-guarded — the accept dialog is D5's ratified copy with its confirm in the PRIMARY fill via `GuardedConfirm`'s new `confirmVariant` prop (default `'destructive'`, every existing call site byte-identical), the reject dialog is the tab's verbatim — reusing the tab's pending-guarded mutation contracts over the unchanged shared `['admin', 'testimonial-submissions']` key (mounted at topbar scope = shell scope: badge and tab update together by construction; refetch on panel-open; no polling — ADR-0028's absences hold); the footer deep-links `?tab=submissions`, a new tolerant search param on the testimonials route (the audit-log precedent) with the screen's tab now URL-driven. Owner-reacted as-rendered both themes. Admin-only, zero new dependencies — zero api/types/landing/db/ui changes (the D11 soft ceiling proven by the diff); admin floor 31 files / 325 tests (+13 notification-seam its, +2 tab-param its).
```

- [✅] **Step 5: `AGENTS.md` + `docs/plan.md` — the pinned edits**

(a) In *Current status of `pnpm test`*, replace the admin floor head (occurs once — verified at plan time):

```text
admin floor 30 files / 310 tests (
```

with:

```text
admin floor 31 files / 325 tests (
```

and its tail:

```text
+ #288's six cms-queries seam pins — the 5-minute staleness on the shared factories + the loader-priming thunks)
```

with:

```text
+ #288's six cms-queries seam pins — the 5-minute staleness on the shared factories + the loader-priming thunks; + #314's thirteen notification-seam pins — the bellStatus cap/name law, the letters-only initials rule, the confirm meta with the variant polarity, the pending wiring — and the two tab-param pins)
```

(b) In the Engineering Rules status paragraph, append one sentence after the M7-closure run (the anchor occurs once — verified at plan time):

```text
the demo's 16 fix-batch findings + the branch-Maps request are the M7 post-flight (issue #239).
```

becomes:

```text
the demo's 16 fix-batch findings + the branch-Maps request are the M7 post-flight (issue #239). The Notification is live (M9 #314, ADR-0028): the topbar bell is a derived view over pending testimonial submissions — the badge is the pending count (amber chip on the exported SUBMISSION_STATUS_META.pending family, capped 9+, hidden at 0, riding the trigger's accessible name uncapped), the panel is the ruled Variant C anatomy with confirm-guarded Accept/Reject over the shared submissions query (accept-as-is publishes via `payload: {}`; refetch on panel-open; no dismiss/mark-read/polling — the absences are the model), GuardedConfirm gained `confirmVariant` (default destructive, accept takes the primary fill), and `Open Submissions` deep-links `?tab=submissions` (the testimonials tab now URL-driven).
```

(c) In `docs/plan.md`'s M9 section, tick ONLY this ticket's box — replace:

```text
- [ ] Admin — the Notification (ADR-0028): the derived bell + panel over pending submissions
```

with:

```text
- [✅] Admin — the Notification (ADR-0028): the derived bell + panel over pending submissions
```

(The two Global Search boxes and the Verify box stay unticked — they are #315/#316/#317's deliverables; #314 never ticks them.)

- [✅] **Step 6: The docs commit**

Tick this plan's executed boxes (`- [✅]`), then:

```bash
git add docs/progress.md AGENTS.md docs/plan.md docs/superpowers/plans/2026-11-16-314-notification-bell-panel.md
git commit -m "docs(m9): #314 lands the Notification - progress, AGENTS floor, the M9 roadmap tick (#314)"
```

- [✅] **Step 7: PR + squash merge**

Push `feat/314-notification`; open the PR against main titled `M9: the Notification — bell badge, pending panel, confirm-guarded accept/reject (#314)`; body: the fourteen ACs each answered with its evidence pointer — the badge/aria laws (walkthrough states 1-2 + `task-4-grep.txt`), Variant C panel (state 3 + the variants-verdict), refetch-on-open + empty + footer (states 3, 6, 7), `confirmVariant` (Task 2's grep gate + the byte-identical proof), the D5/tab dialogs (state 4-5), the mutation law (states 4-5), the pending vocabulary (states 4-5 with the delay trick), the absences (`task-4-grep.txt`'s zero count), the shared key (state 4's badge+tab update), the lib-seam suite (+15 its, floor 31/325), the owner reaction (Step 2's verdict), the soft ceiling (Step 1's empty diff-stat), `pnpm check` green + docs updated + the v1-pick triage (Step 8). Squash-merge.

- [✅] **Step 8: The v1 pick (per `docs/agents/v1-picks.md`)**

Run the path pass on the squash SHA:

```bash
node scripts/v1-triage.mjs <main-sha>
```

Expected: content-clean, admin-only and additive with zero new dependencies — the ticket's expected `PICK clean`; the classifier's output is the truth over this expectation (the #237 precedent). If the classifier rules SPLIT (the mechanical norm for admin-only tickets whose docs are main-only — the #234/#235 precedent: the plan file, `docs/progress.md`, `docs/plan.md` drop main-only; the `AGENTS.md` floor hunk rides the content pass), execute per the runbook's § Executing a PICK or § Executing a SPLIT as ruled, run § The locks (`pnpm check` + `pnpm build` green, the export audit exit 0), push, CI green. Append the ledger row on main, filling every bracketed value from the actual run:

```text
| <merge date> | #<PR> | `<main-sha>` | <pick\|split> | `<v1-sha or n/a>` | #314 — M9 ticket 1, the Notification: the derived bell + panel over pending submissions (ADR-0028) — bellStatus cap/name law, the letters-only initials rule, PANEL_CONFIRM_META with the variant polarity, the pending wiring, the tolerant ?tab= param, GuardedConfirm's confirmVariant (default destructive, accept primary), the exported SUBMISSION_STATUS_META, notification.tsx in the topbar. <PICK/SPLIT per classifier — n v1-paths + m main-only (the plan file, docs/progress.md, docs/plan.md)>. Locks: <check/build/audit results>; run <run-id> green |
```

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #<PR> ledger row - the #314 Notification pick"
```

- [✅] **Step 9: Issue closes + graphify**

Tick #314's fourteen AC boxes in its body, then close it with the AC → evidence mapping:

```bash
gh issue view 314 --json body --jq .Body | sed 's/^- \[ \]/- [✅]/' > /tmp/314-body.md
gh issue edit 314 --body-file /tmp/314-body.md
gh issue close 314 --comment "Landed in #<PR> (main <main-sha>, v1 <pick-sha-or-n/a>). The bell badges the pending count (amber chip, cap 9+, hidden at 0, the uncapped count on the trigger's accessible name — walkthrough states 1-2); the panel is Variant C with skeleton/error/empty postures and the persisting footer (states 3, 6); both actions confirm-guarded — accept in the primary fill via GuardedConfirm's confirmVariant (default destructive, existing call sites byte-identical — Task 2's grep gate), reject the tab's strings verbatim (states 4-5); the mutations ride the tab's contracts over the shared key, badge + tab updating together; the footer deep-links ?tab=submissions (state 7); the absences hold (no dismiss/mark-read/polling — task-4-grep zero count); the owner reacted to the as-built renders both themes (Step 2 verdict); admin floor 31 files / 325 tests (+13/+2); soft ceiling proven — the Step 1 diff-stat over apps/api apps/landing packages/ pnpm-lock.yaml is empty."
```

Then the graph (on main, after the ledger commit):

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#314 graph update"
```

(The M9 frontier after this ticket: #315 ∥ #316 remain `ready-for-agent`; #317 unblocks when all three land.)
