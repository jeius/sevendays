# M9 Ticket 3, Search everywhere (the below-sm top sheet + the `?focus=` landing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Task 3 is UI-bearing and loads the installed UI/UX skill set at execution time**, per #316's Execution notes: `prototype` + `ui-ux-pro-max` (the house rule), plus `tanstack-router-best-practices` (the search-param deep link) and `design-system`; Task 1 also loads `vitest`. **The composition is pre-ruled, not open:** the sheet is D6's ruled posture ported from `prototype/search-ux-variants` (values and rulings, never the branch) and the landing is D10's uniform mechanism, the skills inform judgment on the pinned renders, they do not re-compose. Task 4 carries TWO blocking owner interactions (the as-built variants reaction, which also re-confirms this plan's three unanswered clarify rulings, and the headed-login "go" gate), never proceed past them unilaterally. Everything runs to the gates.

**Goal:** Ticket [#316](https://github.com/jeius/sevendays/issues/316), Global Search reaches the narrow viewport and lands results where the eye looks: (1) below `sm`, where the topbar Input is hidden by the house law, a magnifier-icon button in the topbar opens **the same results as a top sheet with its own input inside**, autofocused on open (`sm:hidden`-gated, same width law), reusing the core ticket's anatomy/groups/states and keyboard model unchanged, natively, because the sheet's input lives INSIDE the cmdk tree (no bridge); (2) one uniform **`?focus=<id>` deep-link law** honored by all four list screens (packages, branches, testimonials, gallery): the matched row scrolls into view and is highlighted; editors never auto-open (by construction, nothing navigates to an editor route).

**Architecture:** Four tasks, admin-app-local only (the D11 soft ceiling: zero api / db / types / api-client / packages-ui / landing files, and this time zero manifest changes too, no new dependencies). (1) The landing lib seam as TDD plain-node tests, a new `focus-landing.ts` (`focusSearchSchema` over a uuid-shaped tolerant param, `FOCUS_HIGHLIGHT_MS`, `FOCUS_ROW_CLASS`) plus the `focus` field joining `testimonialsSearchSchema` (the #314 `?tab=` precedent extended); (2) the landing wired on the four routes (`validateSearch` + `Route.useSearch()` + the `focus` prop) and four screens (a `useFocusLanding` hook scrolling + stamping `data-focused` imperatively; rows carry only a static `data-row-id` + the class constant, both postures where a screen renders two); (3) the below-sm sheet + magnifier in `global-search.tsx` (the results body extracted into a shared `GlobalSearchResults`, the `Command.Input`-inside-the-tree posture, the ⌘K rule's surface-picked arm); (4) gates, the owner's as-built variants reaction, the live walkthrough, docs rotation, PR, the v1 pick, issue close, graphify.

**Tech Stack:** zero new dependencies (everything composes installed pieces: cmdk@1.1.1 + fuse.js@7.5.0 from #315, the shared `Sheet` primitive from packages/ui, TanStack Router search-param validation with zod 4.5.1, `z.uuid()` is the house idiom, `packages/types` uses it throughout). React 19 (`useEffect`/`useRef`/`useState`). TypeScript with `noUncheckedIndexedAccess` ON. vitest 4.1.11 plain-node lib-seam tests (`src/**/*.test.ts`, environment node, no component/DOM tests, the house law). pnpm + Turborepo, `gh` CLI, `graphify update .` at close.

**Spec:** Implements #316 (label `ready-for-agent`) against the ratified M9 spec `docs/specs/2026-11-16-m9-admin-notifications-search-spec.md` (**D6's below-sm sheet half + D10's landing half + D11 + § Testing Decisions**), D6's core dropdown half and D10's emit half landed in #315; the exit-gate walkthrough + milestone closure are #317's, fenced below. Primary source: local-only branch `prototype/search-ux-variants` (commit `fd347b1`, variant B, whose popover content carries the narrow form's `Command.Input` + the magnifier `Button`; the production container is the ruled **Sheet**, per D6/ticket wording over the prototype's anchored popover), **port values and rulings, never merge**. Key recon facts (2026-11-17, main `4765021`, tree clean apart from untracked `.claude/` + graphify cache churn; every file below read whole or at the cited lines this session):

- **What #315 already owns (on disk, verified):** `apps/admin/src/lib/global-search.ts` exports `focusUrlFor(group, id)` → `` `${GROUP_ROUTES[group]}?focus=${id}` `` over `/packages` `/branches` `/testimonials` `/gallery`, the emit half is DONE and this ticket never touches it; `apps/admin/src/components/global-search.tsx` (263 lines) renders the dropdown (the bridge, the ⌘K rule, the kbd chip) with `land` navigating via `navigate({ href: hit.focusUrl })`. #315's plan-time spike proved href-string navigation typechecks against the installed react-router both with the param unregistered (as it is today) and after registration, nothing re-spikes.
- **The `?tab=` precedent (the tolerance posture):** `_shell.testimonials.tsx` registers `validateSearch: testimonialsSearchSchema` and its component does `const search = Route.useSearch(); return <TestimonialsScreen search={search} />`, the schema lives in `apps/admin/src/lib/submissions-state.ts:97` as `z.object({ tab: z.enum([...]).optional().catch(undefined) })`; garbage drops, never fails a visit (the audit-log posture, its own comment records it). The Notification's footer links via typed `Link to='/testimonials' search={{ tab: 'submissions' }}` and the screen navigates `search: {} | { tab: next }`, **adding an all-optional `focus` field keeps every one of these literals assignable** (optional keys accept subsets; no call site changes).
- **The typing probe (run this session, control-proven):** a throwaway file spreading `{ 'data-row-id': 'x', 'data-focused': 'true' }` onto `ExpandRow` (`ComponentProps<typeof TableRow>` passthrough, `apps/admin/src/components/cms/shared.tsx:267`) and `Card` (`ComponentProps<'div'>`, packages/ui) passed `tsc --noEmit` clean, zero errors, while a deliberately-injected error in the same file WAS reported (the control proving tsc ran). React 19's types accept `data-*` through function-component prop spreads; probe deleted after, tree restored.
- **The dual-posture duplicate law:** packages/branches/testimonials each render a desktop `<Table className='@max-[700px]:hidden'>` AND a mobile stacked `<div className='hidden flex-col @max-[700px]:flex'>`, both in the DOM, CSS hides one. So the landing CANNOT use `id=` (duplicate ids are invalid HTML and `getElementById` answers the hidden one). The mechanism: rows carry a **`data-row-id` attribute on both postures** (duplicate attributes are fine, not unique-constrained), the hook finds the first match whose `offsetParent !== null` (display:none subtrees answer null) and scrolls THAT one, and stamps `data-focused` on every match (only the visible one paints). The gallery renders ONE posture (a responsive grid, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` at `gallery-screen.tsx:1523`).
- **The defaults render everything:** all four screens' status segment defaults to `useState<StatusSegment>('all')` (packages-table.tsx:73, branches-screen.tsx:107, testimonials-screen.tsx:240, gallery-screen.tsx:797) and the gallery's category filter defaults to `'all'` (:794), a deactivated focused row RENDERS on a fresh `?focus=` landing with no segment coercion needed (#317's exit gate walks exactly this). A user-narrowed view hiding the row simply no-ops, tolerant, never coerces.
- **The row elements (exact anchors):** packages desktop `<ExpandRow expanded={expanded} className='group' onClick={...}>` (packages-table.tsx:232) + mobile `<div key={row.id} className='border-border border-b py-2 last:border-b-0'>` (:322); branches the same pair (:495, :569); testimonials renders through two dnd wrappers that ALREADY receive the row id, `SortableTestimonialRow` spreads onto `<ExpandRow ... className={isDragging ? 'group relative z-10 bg-card shadow-sm' : 'group'}>` (:140-145) and `SortableStackRow` onto its own `<div className={`border-border border-b py-2 last:border-b-0 ${...}`}>` (:189-194); gallery's `SortablePhotoCard` renders `<Card ref={setNodeRef} style={...} className={`group/card ... ${isDragging ? ... : ''} ${photo.isActive ? '' : 'opacity-60'}`} {...attributes} {...listeners} onClick={...}>` (:220-229), the dnd attributes/listeners coexist with `data-*` attrs.
- **The ready signals (data arrival, per screen):** `packages !== undefined` (packages-table.tsx:63 `const { data: packages, ... } = useQuery(adminPackageQueries.all())`), `branches !== undefined` (:98), `testimonials !== undefined` (:217-220), `photos !== undefined` (gallery-screen.tsx:789-790). The hook keys its effect on `[focus, ready]`, it fires when data arrives after the param, and does NOT re-fire on background refetches (ready stays true).
- **cmdk 1.1.1 (dist-grepped this session, `node_modules/.pnpm/cmdk@1.1.1*/…/dist/index.d.ts`):** `Command.Input` is exported, a `ForwardRefExoticComponent` over `InputHTMLAttributes` (so `autoFocus`, `placeholder`, `aria-label`, `className` ride) plus `onValueChange?: (search: string) => void` (:124-137). With the input INSIDE the `Command` tree, cmdk's native roving/selection handles ArrowDown/ArrowUp/Home/End/Enter from that input, the structural mirror of #315's outside-typing finding; **no bridge in the sheet**. `shouldFilter={false}` stays the only filter posture (D7, matching is the lib seam's, in both trees).
- **The Sheet primitive (`packages/ui/src/components/sheet.tsx`, consumed as-is):** Base UI Dialog under the hood, `Sheet` (Root: `open`/`onOpenChange`, the admin's editor sheets are controlled exactly so), `SheetContent` with `side='top'` (`data-[side=top]:inset-x-0 top-0 h-auto border-b` + a translate-y transition), `SheetClose` (render-prop Button pattern, the primitive's own X uses it), `SheetTitle` (Dialog Title, the a11y label; Base UI dialogs want one). The default `showCloseButton` X sits `absolute top-4 right-4`, wrong for a compact top sheet, so the sheet passes `showCloseButton={false}` and seats its own trailing close inside the input row. **Centering the width law:** `SheetContent side='top'` is `inset-x-0` (left-0 + right-0); adding `mx-auto w-[min(24rem,calc(100vw-1.5rem))]` overconstrains to the browser's auto-margin resolution, the sheet column centers and obeys the dropdown's exact width law.
- **The Tailwind v4 scan fact:** `apps/admin/src/styles.css` declares `@source "../../../packages/ui/src"` (ADDING the ui package), the admin's own `src/` (a `.ts` lib file's string constant included) is auto-scanned by v4's content detection, so `FOCUS_ROW_CLASS` generates its `data-[focused]:` utilities from `apps/admin/src/lib/focus-landing.ts` without any `@source` edit.
- **The prototype's narrow-form values (ported from `variant-b-dropdown.tsx`):** the magnifier `<Button variant='ghost' size='icon' type='button' aria-label='Search' className='sm:hidden'>` + `<Search aria-hidden='true' />`; the sheet's input row = a `border-b` wrapper over `<Command.Input value onValueChange onClick autoFocus placeholder='Search…' aria-label='Search' className='h-11 w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground'>`. NOT ported: the prototype's popover-as-sheet container (the production container is the Sheet primitive per the ruling), the `land` toast stub, the stub catalog, the engine switcher, `TODO(owner-copy)` markers.
- **The base rates + baselines (live, AGENTS.md + this session's runs):** admin suite **32 files / 344 passed**; after Task 1: **33 files / 352 tests** (+8 its in the new `focus-landing.test.ts`; Tasks 2-3 add no suite). Types/api/api-client/landing/db untouched by this ticket, the diff proves the soft ceiling, and this time `apps/admin/package.json` + `pnpm-lock.yaml` join the empty-diff gate (zero new deps).
- **Sibling fences (the M9 cuts, #316 is ticket 3 of 4):** NOT here, regardless of temptation: **the exit-gate walkthrough + milestone closure** (`docs/plan.md`'s Verify box + the M9 close), #317 in full; **any change to the emit side** (`focusUrlFor`, `SEARCH_COPY`, the engine weights/caps, #315's landed seams stay byte-identical); **the Notification** (#314, untouched); any appointments/users/audit-log search surface (v2 fences, D11/§ v2 Fences); segment/filter coercion on landing (the tolerant no-op is the ruled posture, the defaults already render deactivated rows); server-side search or new fetch machinery (the index law holds, the landing reads zero queries). The M9 roadmap box this ticket owns is the THIRD (`docs/plan.md:201`, `- [ ] Admin, Global Search, the narrow form + the deep link: …`), it ticks in Task 4; the Verify box **stays unticked until #317 lands**, #316 never ticks it.
- **The three plan-time rulings (unanswered clarify, pinned on the recommended options, re-confirmed at Task 4's blocking variants round before anything ships):** asked 2026-11-17 in one call (highlight law / URL lifecycle / sheet copy); the round went unanswered, so the plan pins the recommended options and Task 4 Step 2 surfaces all three for explicit owner confirm: (1) **highlight** = a primary tint (`bg-primary/10` + `ring-primary/30`) that fades after `FOCUS_HIGHLIGHT_MS = 1600` ms (the rows' own `transition-colors` plays the fade); (2) **URL law** = the param persists (the `?tab=` law, reload/share re-lands, zero extra navigation machinery); (3) **sheet copy** = reuse the on-disk values verbatim (placeholder `Search…`, aria-label `Search`, sr-only dialog title `Search`, close sr-only `Close`).
- **Local stack quirks (memory, binding for Task 4):** both frontends pin `:3000` + ws `:9229` (serial only, run admin + api together, never admin + landing); the api dev port is `8787`; admin CMS reads need the local api (`API_URL` in `apps/admin/.env.local`); the admin `.env.local` DB is the LIVE pooler, **the walkthrough mutates nothing** (navigation + search only), and no fixture rows are invented against it.

## Global Constraints

- **Branch & baseline:** `feat/316-narrow-form-focus-landing` off main `4765021` (verify `git rev-parse --short main` at execution; if main moved, reconcile the anchored line numbers before starting, the file anchors below were read at that SHA). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#316)` squash style; every commit is pinned verbatim below. Evidence (red/green test output, grep gates, variants captures, walkthrough narration) lands in gitignored `.superpowers/sdd/2026-11-17-316-narrow-form-focus-landing/`.
- **Gates (repo AGENTS.md duties):** every task commits only with its checks green: `pnpm --filter @sevendays/admin fix` BEFORE committing (accept the rewrites; re-run the suite if it rewrote anything) → `test -- --run` → `typecheck` → `build` (the #218 execution ruling: the production build joins the checks whenever a route's module graph gains an import, Task 2 adds `#/lib/focus-landing` + `#/components/use-focus-landing` to the four routes' graphs; Task 3's topbar graph already rides every route). `pnpm build:packages` is NOT needed. **Zero manifest changes this ticket:** `git diff main...HEAD -- apps/admin/package.json pnpm-lock.yaml` must be EMPTY, no `pnpm add` of any kind. Never stage `graphify-out/` churn (Task 4's update is its own commit). Never commit secrets. Tick checklist boxes with `- [✅]`, never plain `[x]` (this plan file, `docs/plan.md`, and issue bodies alike). Final gate: `pnpm check` green across the repo. **The soft-ceiling gate (D11):** before the PR, `git diff --stat main...HEAD -- apps/api apps/landing packages/ pnpm-lock.yaml` must be EMPTY, and `git diff main...HEAD -- apps/admin/package.json` empty too (any need discovered mid-flight is a re-ruling for the owner, not drift).
- **The copy law (owner-ratified + plan-time rulings, verbatim, pin these, never re-draft, no TODO(owner-copy) markers):** every #315 string stays one-sourced in `SEARCH_COPY` and is reused as-is by the sheet (hint `Type to search packages, branches, testimonials, gallery`; no-results `No results for “{q}.”`, period INSIDE the closing curly quote; overflow `+{N} more in {group}`; group headers `Packages` / `Branches` / `Testimonials` / `Gallery`; suffix `Deactivated`). The sheet's own surface reuses the on-disk values (plan-time ruling 3): placeholder `Search…`, `aria-label='Search'` (input + magnifier), sr-only dialog title `Search`, close sr-only `Close`. The magnifier's `aria-label='Search'` is the prototype's verbatim. No new customer-visible string enters production without Task 4 Step 2's confirm.
- **The landing law (D10, binding):** one uniform `?focus=<id>` mechanism across all four list screens, the row scrolls into view (`scrollIntoView({ block: 'center' })`) and is highlighted (`data-focused` + `FOCUS_ROW_CLASS`) for `FOCUS_HIGHLIGHT_MS = 1600` ms, then the rows' `transition-colors` fades it (plan-time ruling 1). The param is tolerant by construction: `focusSearchParam = z.uuid().optional().catch(undefined)`, absent, empty, non-uuid, or wrong-typed values drop to `undefined` and the visit never fails (the audit-log/`?tab=` posture); an unknown-but-well-formed id matches no row and no-ops. uuid-shape validation also keeps the row selector quote-safe by construction (a uuid's charset cannot break out of an attribute selector, no `CSS.escape` needed, which plain-node vitest lacks anyway). **The URL persists after landing** (plan-time ruling 2, the `?tab=` law; no `router.replace`, no stripping). **Editors never auto-open**, by construction: the landing navigates to the four list routes only, nothing touches `/packages/$packageId/edit` or opens a Sheet. **Without the param, the four screens behave exactly as before**, the hook early-returns on `focus === undefined`, the class constant paints nothing without the attribute, and the routes' all-optional schemas change no existing navigation.
- **The imperative-attr law (the mechanism's shape):** screens stamp only the static `data-row-id={row.id}` + `FOCUS_ROW_CLASS` on their row elements (BOTH postures where a screen renders desktop + stacked); `useFocusLanding` owns every dynamic bit, the visible-row lookup (`offsetParent !== null`), the scroll, the `data-focused` stamp on all matches, and the timed removal. React never renders `data-focused`, so re-renders never fight the fade. The hook is SSR-safe (effects never run server-side) and fires on `[focus, ready]`, once per focus value per data arrival, never on background refetches. No highlight state threads through the dnd row wrappers (`SortableTestimonialRow` / `SortableStackRow` already receive `id`).
- **The posture law (D6's narrow half, binding):** below `sm`, where the Input is hidden by the house law, the magnifier-icon button (`sm:hidden`, ghost icon, `Search` icon, `aria-label='Search'`, the prototype's verbatim values) opens the **same results as a top sheet with its own input inside**, autofocused on open (`Command.Input` + `autoFocus`, Base UI's dialog focus management lands on the first tabbable, which is that input). **Same width law** as the dropdown: `w-[min(24rem,calc(100vw-1.5rem))]`, centered on the top sheet via `inset-x-0` + `mx-auto`. The sheet reuses the core ticket's result anatomy, groups, states, and keyboard model UNCHANGED, the shared `GlobalSearchResults` body renders both surfaces, the same `query` state feeds both, and the input living INSIDE the cmdk tree makes the keyboard model native (arrows rove, Enter selects, **no bridge in the sheet**; Escape closes through the Sheet's Base UI dialog behavior). The magnifier's click stops propagation (it rides inside the popover's anchor div; the anchor's own click must never toggle the desktop dropdown below sm). **The ⌘K/Ctrl+K binding stays ONE rule, no platform sniffing** (D6), the rule's *surface* is posture-picked at the current viewport: `window.matchMedia('(min-width: 640px)')` (the Tailwind sm mirror) picks the dropdown + topbar Input at sm+, the sheet below sm. `shouldFilter={false}` on BOTH Command roots (D7, matching is the lib seam's, cmdk's built-in filter stays dead in production).
- **The theme law (#217):** the sheet and the highlight compose semantic tokens only (`bg-popover`/`text-popover-foreground` from the Sheet primitive; `bg-primary/10` + `ring-primary/30` + `text-muted-foreground` in the highlight + sheet input row), both themes render from one markup; the walkthrough walks both, light judged first.
- **The house test law (§ Testing Decisions):** the landing seam's suite is plain-node lib-seam tests over `src/lib/*.test.ts`, schema tolerance pins (param read), the constants (id matching rides the attribute law, pinned through `FOCUS_ROW_CLASS`), and the `?tab=` interplay, no component/DOM tests, no new test dependencies. Existing floors untouched: zero api / api-client / types / landing test changes, the no-API-work invariant made visible by the diff.

## File Structure

```text
apps/admin/src/lib/
  focus-landing.ts                         # new (T1), focusSearchSchema/focusSearchParam (tolerant uuid), FOCUS_HIGHLIGHT_MS, FOCUS_ROW_CLASS
  focus-landing.test.ts                    # new (T1), 8 its
  submissions-state.ts                     # modify (T1), testimonialsSearchSchema gains focus (the #314 schema extended)
  global-search.ts                         # untouched, #315's emit seam stays byte-identical
apps/admin/src/components/
  use-focus-landing.ts                     # new (T2), the imperative scroll + highlight hook
  packages/packages-table.tsx              # modify (T2), focus prop + hook + data-row-id/class on both postures
  branches/branches-screen.tsx             # modify (T2), same
  testimonials/testimonials-screen.tsx     # modify (T2), same (through the two dnd row wrappers)
  gallery/gallery-screen.tsx               # modify (T2), focus prop + hook + data-row-id/class on the card
  global-search.tsx                        # modify (T3), the shared GlobalSearchResults + the magnifier + the top sheet + the ⌘K surface arm
apps/admin/src/routes/
  _shell.packages.index.tsx                # modify (T2), validateSearch + focus pass-through
  _shell.branches.tsx                      # modify (T2), same
  _shell.gallery.tsx                       # modify (T2), same
  _shell.testimonials.tsx                  # untouched, its schema extends in T1; the screen already receives the whole search object
docs/progress.md AGENTS.md docs/plan.md this plan file   # T4
docs/agents/v1-picks.md graphify-out/                     # T4, post-merge on main
```

---

### Task 1: The landing lib seam, `focus-landing.ts` + the testimonials schema extension (TDD)

The landing's whole test surface plus every pure value Task 2 consumes. No component or route changes yet.

**Files:**
- New (test-first): `apps/admin/src/lib/focus-landing.test.ts`
- New: `apps/admin/src/lib/focus-landing.ts`
- Modify: `apps/admin/src/lib/submissions-state.ts:88-101` (the comment block + `testimonialsSearchSchema`)

**Interfaces:**
- Produces (what Task 2 consumes), all from `#/lib/focus-landing`: `FOCUS_HIGHLIGHT_MS = 1600` (a `number`); `FOCUS_ROW_CLASS` (a `string`, the pinned class law below); `focusSearchParam` (a zod schema: uuid-shaped, optional, catch-dropped); `focusSearchSchema = z.object({ focus: focusSearchParam })`; `type FocusSearch = z.infer<typeof focusSearchSchema>` → `{ focus?: string | undefined }`. And from `#/lib/submissions-state` (extended): `testimonialsSearchSchema` now parses `{ tab?, focus? }`; `TestimonialsSearch` widens accordingly (`initialTab` unchanged, absent tab still means the published list, where the focused row lives).
- Consumes: `z` from `zod` (4.5.1, `z.uuid()` is the house idiom, `packages/types` uses it throughout).

**Not here:** any component, hook, or route edit (Task 2); the sheet or magnifier (Task 3); any change to `global-search.ts` (#315's emit seam stays byte-identical, `focusUrlFor` already produces exactly what this seam parses); any timing/DOM behavior (the hook is Task 2); new busy labels or toasts (nothing here is async-visible).

- [✅] **Step 1: Write the failing tests**

New file `apps/admin/src/lib/focus-landing.test.ts`, the whole file:

```ts
import { describe, expect, it } from 'vitest';
import { testimonialsSearchSchema } from './submissions-state.js';
import { FOCUS_HIGHLIGHT_MS, FOCUS_ROW_CLASS, focusSearchSchema } from './focus-landing.js';

const UUID = '00000000-0000-4000-8000-000000000001';

describe('focusSearchSchema, the param read (D10, tolerant by construction)', () => {
  it('absent focus → dropped, normal navigation untouched', () => {
    expect(focusSearchSchema.parse({})).toEqual({});
  });

  it('a uuid passes through verbatim', () => {
    expect(focusSearchSchema.parse({ focus: UUID })).toEqual({ focus: UUID });
  });

  it('non-uuid garbage drops to undefined, never throws (the audit-log posture); the charset law also keeps the row selector quote-safe', () => {
    expect(focusSearchSchema.parse({ focus: 'x"]' })).toEqual({});
    expect(focusSearchSchema.parse({ focus: '' })).toEqual({});
    expect(focusSearchSchema.parse({ focus: 'not-a-uuid' })).toEqual({});
  });

  it('a non-string value drops too (catch, not throw)', () => {
    expect(focusSearchSchema.parse({ focus: 42 })).toEqual({});
  });
});

describe('the testimonials interplay (tab + focus compose on one route)', () => {
  it('tab and focus parse together', () => {
    expect(testimonialsSearchSchema.parse({ tab: 'submissions', focus: UUID })).toEqual({
      tab: 'submissions',
      focus: UUID,
    });
  });

  it('a focus-only visit keeps the #314 default (the published list, where the focused row lives)', () => {
    expect(testimonialsSearchSchema.parse({ focus: UUID })).toEqual({ focus: UUID });
    expect(testimonialsSearchSchema.parse({ focus: 'garbage' })).toEqual({});
  });
});

describe('the pinned constants (the plan-time rulings, 2026-11-17)', () => {
  it('FOCUS_HIGHLIGHT_MS, the ~1.6 s fade law', () => {
    expect(FOCUS_HIGHLIGHT_MS).toBe(1600);
  });

  it('FOCUS_ROW_CLASS, semantic tokens only, paints nothing without [data-focused]', () => {
    expect(FOCUS_ROW_CLASS).toBe(
      'transition-colors data-[focused]:bg-primary/10 data-[focused]:ring-1 data-[focused]:ring-primary/30'
    );
  });
});
```

- [✅] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @sevendays/admin test -- --run focus-landing
```

Expected: FAIL, the file fails at collection (`Failed to resolve import "./focus-landing.js"`, the module does not exist yet, so none of its 8 its run). Record the output in `.superpowers/sdd/2026-11-17-316-narrow-form-focus-landing/task-1-red.txt`.

- [✅] **Step 3: Write the minimal implementation**

New file `apps/admin/src/lib/focus-landing.ts`, the whole file:

```ts
// The ?focus= landing seam (M9 #316, D10's honoring half): the receiving
// side of the Global Search deep link, #315's focusUrlFor emits
// `/packages?focus=<id>`-shaped hrefs and THIS seam is the one uniform
// mechanism the four list screens honor them by. The param is tolerant by
// construction (the audit-log / ?tab= posture): absent, empty, non-uuid,
// or wrong-typed values drop to undefined and the visit never fails, an
// unknown-but-well-formed id simply matches no row (the landing no-ops,
// honest). uuid-shape validation also keeps the row selector quote-safe
// by construction: a uuid's charset cannot break out of an attribute
// selector. The highlight's look and duration are the plan-time rulings
// of 2026-11-17 (re-confirmed at the owner's variants round); the styles
// compose semantic tokens only (the #217 law) and ride as a class
// constant Tailwind v4's auto-scan picks up from this file (styles.css's
// @source adds only packages/ui, the admin's own src/ is auto-scanned).
import { z } from 'zod';

/**
 * The highlight duration (plan-time ruling 2026-11-17): the tint rides
 * the row this long, then the rows' own transition-colors plays the fade.
 */
export const FOCUS_HIGHLIGHT_MS = 1600;

/**
 * The highlight's look (plan-time ruling 2026-11-17): semantic tokens
 * only, and every utility is data-[focused]:-prefixed, the class paints
 * NOTHING without the attribute the hook stamps, so carrying it on every
 * row is free.
 */
export const FOCUS_ROW_CLASS =
  'transition-colors data-[focused]:bg-primary/10 data-[focused]:ring-1 data-[focused]:ring-primary/30';

/** The ?focus= param: optional + uuid-shaped + catch-dropped, garbage never fails a visit. */
export const focusSearchParam = z.uuid().optional().catch(undefined);

/** The search schema for the three single-param routes (packages index, branches, gallery). */
export const focusSearchSchema = z.object({ focus: focusSearchParam });

export type FocusSearch = z.infer<typeof focusSearchSchema>;
```

Then the schema extension in `apps/admin/src/lib/submissions-state.ts`, replace lines 88-99 (the comment block through the schema's closing `});`, NOT line 101's `export type TestimonialsSearch`, which follows and stays; the block occurs once):

```ts
// The screen's two-tab deep link (M9 #314): the Notification panel's
// `Open Submissions` footer lands on the queue, a tolerant optional
// param on the testimonials route (the audit-log precedent), absent =
// the published list, exactly the pre-#314 default. #218's "local
// state, no routes" ruling is amended in spirit only: still one screen,
// no new route, the tab became the URL-driven segment so a link can
// aim at it. M9 #316: the ?focus= landing param joins the same schema
// (the Global Search deep link's fourth surface, a focus-only visit
// still defaults to the published list, where the focused row lives).
export type TestimonialsTab = 'testimonials' | 'submissions';

export const testimonialsSearchSchema = z.object({
  tab: z.enum(['testimonials', 'submissions']).optional().catch(undefined),
  focus: focusSearchParam,
});
```

And add the import beside the existing `zod` import (top of file, after the `@sevendays/types` block):

```ts
import { focusSearchParam } from './focus-landing';
```

- [✅] **Step 4: Run the tests to verify they pass**

```bash
pnpm --filter @sevendays/admin test -- --run
```

Expected: PASS, the full admin suite runs (admin's `test` script is bare `vitest run`, so the full-suite floor IS the verification): **Test Files 33 passed (33) · Tests 352 passed (352)** (the 344 baseline + the 8 new its; the two existing tab-param pins in the suite still pass, the extended schema only adds an optional field).

- [✅] **Step 5: Lint, format, typecheck**

```bash
pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/admin typecheck
```

Expected: both green (accept `fix`'s rewrites, import order especially; re-run the suite from Step 4 if it rewrote anything).

- [✅] **Step 6: Commit**

```bash
git add apps/admin/src/lib/focus-landing.ts apps/admin/src/lib/focus-landing.test.ts apps/admin/src/lib/submissions-state.ts
git commit -m "feat(admin): the ?focus= landing seam - the tolerant param + the pinned highlight law (#316)"
```

### Task 2: The `?focus=` landing honored, the hook + the four routes + the four screens

The uniform mechanism goes live: the three single-param routes register `focusSearchSchema`, the testimonials route's already-registered schema now carries `focus` (Task 1), and each screen calls the hook and stamps its row elements. No sheet yet (Task 3); the landing is walkable from #315's dropdown the moment this task lands.

**Files:**
- New: `apps/admin/src/components/use-focus-landing.ts`
- Modify (whole-file replaces below): `apps/admin/src/routes/_shell.packages.index.tsx`, `apps/admin/src/routes/_shell.branches.tsx`, `apps/admin/src/routes/_shell.gallery.tsx` (`_shell.testimonials.tsx` is UNTOUCHED, its schema extended in Task 1, its component already passes the whole search object to the screen)
- Modify (pinned find/replace pairs below): `apps/admin/src/components/packages/packages-table.tsx`, `apps/admin/src/components/branches/branches-screen.tsx`, `apps/admin/src/components/testimonials/testimonials-screen.tsx`, `apps/admin/src/components/gallery/gallery-screen.tsx`

**Interfaces:**
- Consumes: `focusSearchSchema`, `FOCUS_ROW_CLASS` (Task 1, `#/lib/focus-landing`); `testimonialsSearchSchema`'s widened `TestimonialsSearch` (Task 1, `search.focus` now exists); the screens' existing `useQuery` data vars (`packages`, `branches`, `testimonials`, `photos`).
- Produces: `useFocusLanding(focus: string | undefined, ready: boolean): void` from `#/components/use-focus-landing`, scrolls the visible `[data-row-id=<focus>]` element into view, stamps `data-focused='true'` on every match for `FOCUS_HIGHLIGHT_MS`, removes it after (and on cleanup). Task 3 consumes nothing from this task; the landing is complete here.

**Not here:** the sheet or magnifier (Task 3); any change to `focusUrlFor`/`global-search.ts` (the emit side is #315's, byte-identical); any editor auto-open (by construction, nothing here navigates to `/packages/$packageId/edit` or opens a Sheet); segment or category-filter coercion on landing (the tolerant no-op is the ruled posture, the `'all'` defaults already render deactivated rows); any new query key, prefetch, or fetch machinery (the index law); `id=` on rows (the dual-posture duplicate law, `data-row-id` only); any highlight state threaded through the dnd wrappers (the hook is imperative).

- [✅] **Step 1: New file `apps/admin/src/components/use-focus-landing.ts`**, the whole file:

```ts
// The ?focus= landing hook (M9 #316, D10's honoring half): scrolls the
// focused row into view and stamps the data-focused attribute for
// FOCUS_HIGHLIGHT_MS, imperatively, the four screens only stamp
// data-row-id + FOCUS_ROW_CLASS on their row elements (BOTH postures
// where a screen renders a desktop table and a mobile stack; the gallery
// renders one grid), and this hook owns every dynamic bit, so no
// highlight state threads through the dnd row wrappers. React never
// renders data-focused, so re-renders never fight the fade. SSR-safe
// (effects never run server-side); tolerant by construction, an unknown
// id, a hidden row (the user narrowed the segment or category), or a
// not-yet-loaded list simply no-ops, never throws (the audit-log
// posture). `ready` is the screen's data-arrival flag: the effect waits
// for rows to exist, fires once per focus value per arrival, and does
// not re-fire on background refetches (ready stays true). The param
// itself arrived uuid-validated through focusSearchSchema, so the
// attribute selector below is quote-safe by construction.
import { useEffect } from 'react';
import { FOCUS_HIGHLIGHT_MS } from '#/lib/focus-landing';

/**
 * The first VISIBLE element carrying data-row-id, the folded
 * table/mobile-stack pair renders both subtrees and CSS hides one
 * (display:none subtrees answer a null offsetParent), so visibility, not
 * document order, picks the posture that actually scrolls.
 */
function visibleRow(id: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>(`[data-row-id="${id}"]`)).find(
      (el) => el.offsetParent !== null
    ) ?? null
  );
}

export function useFocusLanding(focus: string | undefined, ready: boolean): void {
  useEffect(() => {
    if (focus === undefined || !ready) return;
    const row = visibleRow(focus);
    if (row === null) return;
    row.scrollIntoView({ block: 'center' });
    // Stamp every match (both postures), only the visible one paints.
    const stamped = Array.from(document.querySelectorAll<HTMLElement>(`[data-row-id="${focus}"]`));
    for (const el of stamped) el.setAttribute('data-focused', 'true');
    const timer = window.setTimeout(() => {
      for (const el of stamped) el.removeAttribute('data-focused');
    }, FOCUS_HIGHLIGHT_MS);
    return () => {
      window.clearTimeout(timer);
      for (const el of stamped) el.removeAttribute('data-focused');
    };
  }, [focus, ready]);
}
```

- [✅] **Step 2: The three routes (whole-file replaces)**

`apps/admin/src/routes/_shell.packages.index.tsx`, the whole file:

```tsx
// The packages index (M5 #139): the gated shell's catalog entry point:
// PageHeader over the consolidated packages table (the #131 table ruling).
// The prototype's honesty caption does NOT port. Extracted from
// _shell.packages.tsx during Task 7's evidence run when the editor routes
// proved unmountable under a parent that rendered the table without an
// Outlet (the Task 5 plan structure, matched-but-never-rendered children).
// M9 #316: the ?focus= deep link, a Global Search result lands here with
// the matched row scrolled into view + highlighted (tolerant by
// construction: absent/garbage drops, an unknown id no-ops; the packages
// edit route stays one deliberate click away, the landing never opens it).
import { Button } from '@sevendays/ui/components/button';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PageHeader } from '#/components/cms/shared';
import { PackagesTable } from '#/components/packages/packages-table';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';
import { focusSearchSchema } from '#/lib/focus-landing';

export const Route = createFileRoute('/_shell/packages/')({
  head: () => ({ meta: [{ title: 'Packages | Sevendays Admin' }] }),
  validateSearch: focusSearchSchema,
  // M8 #288: hover-intent priming, fire-and-forget, never blocks
  // (the cms-queries seam carries the law).
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.packagesIndex(queryClient));
  },
  component: PackagesPage,
});

function PackagesPage() {
  const { focus } = Route.useSearch();
  return (
    <section className='space-y-4'>
      <PageHeader
        title='Packages'
        subline="Everything on the landing site's /packages page, editable in place."
        actions={<Button render={<Link to='/packages/new' />}>New package</Button>}
      />
      <PackagesTable focus={focus} />
    </section>
  );
}
```

`apps/admin/src/routes/_shell.branches.tsx`, the whole file:

```tsx
// The branches route (M5 #140): the gated shell's branches entry point.
// The screen owns its state (table + editor + bulk wiring) and composes its
// own PageHeader (the `New branch` action toggles the screen's create state,
// so the header lives where the state lives), the route only mounts it
// under the pinned head title. M9 #316: the ?focus= deep link, a Global
// Search result lands here with the matched row scrolled into view +
// highlighted (tolerant by construction: absent/garbage drops, an unknown
// id no-ops).
import { createFileRoute } from '@tanstack/react-router';
import { BranchesScreen } from '#/components/branches/branches-screen';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';
import { focusSearchSchema } from '#/lib/focus-landing';

export const Route = createFileRoute('/_shell/branches')({
  head: () => ({ meta: [{ title: 'Branches | Sevendays Admin' }] }),
  validateSearch: focusSearchSchema,
  // M8 #288: hover-intent priming, the cms-queries seam carries the law.
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.branches(queryClient));
  },
  component: BranchesPage,
});

function BranchesPage() {
  const { focus } = Route.useSearch();
  return <BranchesScreen focus={focus} />;
}
```

`apps/admin/src/routes/_shell.gallery.tsx`, the whole file:

```tsx
// The gallery route (M5 #141, Task 7): the gated shell's gallery entry
// point. The route mounts the pinned PageHeader + GalleryScreen, its
// `Upload photos` action is a label wired by htmlFor to the hidden file
// input that lives INSIDE the screen, so this file holds no logic beyond
// the render (the tray state is the screen's). M9 #316: the ?focus= deep
// link, a Global Search result lands here with the matched card scrolled
// into view + highlighted (tolerant by construction: absent/garbage drops,
// an unknown id no-ops).
import { Button } from '@sevendays/ui/components/button';
import { createFileRoute } from '@tanstack/react-router';
import { ImagePlus } from 'lucide-react';
import { PageHeader } from '#/components/cms/shared';
import { GalleryScreen } from '#/components/gallery/gallery-screen';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';
import { focusSearchSchema } from '#/lib/focus-landing';

export const Route = createFileRoute('/_shell/gallery')({
  head: () => ({ meta: [{ title: 'Gallery | Sevendays Admin' }] }),
  validateSearch: focusSearchSchema,
  // M8 #288: hover-intent priming, the photos + categories reads
  // (fire-and-forget, never blocks).
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.gallery(queryClient));
  },
  component: GalleryPage,
});

function GalleryPage() {
  const { focus } = Route.useSearch();
  return (
    <>
      <PageHeader
        title='Gallery'
        subline='The /about portfolio, upload in batches, organize by category.'
        actions={
          // The label/htmlFor pair opens the screen's hidden input, the id
          // is this file's one coupling point (zero route logic). The label
          // carries the button's render prop: Base UI merges the Button's
          // classes/props onto it. nativeButton={false} tells Base UI the
          // render target is not a native <button> (suppresses the dev-mode
          // console error and applies the full useButton keyboard state),
          // and tabIndex={0} gives the label its tab stop.
          <>
            <Button
              nativeButton={false}
              render={
                <label
                  htmlFor='gallery-upload-input'
                  className='cursor-pointer'
                  // biome-ignore lint/a11y/noNoninteractiveTabindex: this label is a Base UI <Button> render target (nativeButton={false}), an interactive control at runtime, so it needs its own tab stop
                  tabIndex={0}
                >
                  <ImagePlus aria-hidden='true' />
                  Upload photos
                </label>
              }
            />
            {/* #170 (ruling #165 Q7 f): the picker's constraint said up
                front, plain text-muted-foreground, so both themes carry
                it with no extra styling. The PageHeader's actions row
                (flex items-center gap-2) seats it beside the affordance;
                it renders in every screen state, the empty states
                included (the route always mounts the header above the
                screen). */}
            <p className='text-muted-foreground text-xs'>JPG files up to 10 MiB.</p>
          </>
        }
      />
      <GalleryScreen focus={focus} />
    </>
  );
}
```

- [✅] **Step 3: The four screens (pinned find/replace pairs)**

Every pair below occurs exactly once in its file at the anchored site (verified at plan time; match the on-disk indentation, anchors were read at main `4765021`).

**(a) `apps/admin/src/components/packages/packages-table.tsx`**, four edits:

(i) The signature (line 62):

```tsx
export function PackagesTable() {
```

becomes:

```tsx
export function PackagesTable({ focus }: { focus: string | undefined }) {
```

(ii) The hook call, insert immediately after the useQuery destructure (line 63, `const { data: packages, isPending, isError, refetch } = useQuery(adminPackageQueries.all());`):

```tsx
  // M9 #316: the ?focus= landing, scroll + highlight the matched row
  // (data-row-id below on both postures), once data has arrived.
  useFocusLanding(focus, packages !== undefined);
```

(iii) The desktop row (line ~232), the `className='group'` form:

```tsx
                      <ExpandRow
                        expanded={expanded}
                        className='group'
                        onClick={() => toggleExpanded(row.id)}
                      >
```

becomes:

```tsx
                      <ExpandRow
                        expanded={expanded}
                        className={`group ${FOCUS_ROW_CLASS}`}
                        data-row-id={row.id}
                        onClick={() => toggleExpanded(row.id)}
                      >
```

(iv) The mobile stacked row (line ~322):

```tsx
                <div key={row.id} className='border-border border-b py-2 last:border-b-0'>
```

becomes:

```tsx
                <div
                  key={row.id}
                  data-row-id={row.id}
                  className={`border-border border-b py-2 last:border-b-0 ${FOCUS_ROW_CLASS}`}
                >
```

(v) The imports, add beside the existing `#/` imports:

```tsx
import { useFocusLanding } from '#/components/use-focus-landing';
import { FOCUS_ROW_CLASS } from '#/lib/focus-landing';
```

**(b) `apps/admin/src/components/branches/branches-screen.tsx`**, the same five-edit shape:

(i) The signature (line 97): `export function BranchesScreen() {` → `export function BranchesScreen({ focus }: { focus: string | undefined }) {`

(ii) The hook call, insert immediately after the useQuery destructure (line 98):

```tsx
  // M9 #316: the ?focus= landing, scroll + highlight the matched row
  // (data-row-id below on both postures), once data has arrived.
  useFocusLanding(focus, branches !== undefined);
```

(iii) The desktop row (line ~495), the `className='group'` form (same shape as packages (iii), two spaces DEEPER indentation at this site) becomes the same `className={`group ${FOCUS_ROW_CLASS}`}` + `data-row-id={row.id}` form.

(iv) The mobile stacked row (line ~569), the same `<div key={row.id} className='border-border border-b py-2 last:border-b-0'>` form as packages (iv), same replacement.

(v) The imports, the same two lines as packages (v).

**(c) `apps/admin/src/components/testimonials/testimonials-screen.tsx`**, four edits (the signature is unchanged, the screen already receives `search`):

(i) The hook call, insert immediately after the useQuery destructure block (line ~220, `} = useQuery(adminTestimonialQueries.all());`):

```tsx
  // M9 #316: the ?focus= landing, scroll + highlight the matched row on
  // the published tab (a focus-only URL defaults there by the #314 law).
  useFocusLanding(search.focus, testimonials !== undefined);
```

(ii) `SortableTestimonialRow`'s ExpandRow (lines ~140-146):

```tsx
    <ExpandRow
      ref={setNodeRef}
      expanded={expanded}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'group relative z-10 bg-card shadow-sm' : 'group'}
      onClick={onClick}
    >
```

becomes:

```tsx
    <ExpandRow
      ref={setNodeRef}
      expanded={expanded}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-row-id={id}
      className={`${isDragging ? 'group relative z-10 bg-card shadow-sm' : 'group'} ${FOCUS_ROW_CLASS}`}
      onClick={onClick}
    >
```

(iii) `SortableStackRow`'s wrapper div (lines ~189-195):

```tsx
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-border border-b py-2 last:border-b-0 ${
        isDragging ? 'relative z-10 bg-card shadow-sm' : ''
      }`}
    >
```

becomes:

```tsx
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-row-id={id}
      className={`border-border border-b py-2 last:border-b-0 ${
        isDragging ? 'relative z-10 bg-card shadow-sm' : ''
      } ${FOCUS_ROW_CLASS}`}
    >
```

(iv) The imports, the same two lines as packages (v).

**(d) `apps/admin/src/components/gallery/gallery-screen.tsx`**, three edits (one posture, the responsive grid):

(i) The signature (line 778): `export function GalleryScreen() {` → `export function GalleryScreen({ focus }: { focus: string | undefined }) {`

(ii) The hook call, insert immediately after the photos useQuery destructure block (line ~790, `} = useQuery(adminGalleryQueries.photos());`):

```tsx
  // M9 #316: the ?focus= landing, scroll + highlight the matched card
  // (data-row-id on the grid card below), once photos have arrived.
  useFocusLanding(focus, photos !== undefined);
```

(iii) `SortablePhotoCard`'s Card (lines ~220-229):

```tsx
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group/card animate-in fade-in slide-in-from-bottom-2 relative cursor-grab gap-0 overflow-hidden rounded-lg py-0 duration-300 active:cursor-grabbing ${
        isDragging ? 'z-10 bg-card shadow-sm' : ''
      } ${photo.isActive ? '' : 'opacity-60'}`}
      {...attributes}
      {...listeners}
      onClick={() => onToggleSelect(photo.id)}
    >
```

becomes:

```tsx
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-row-id={photo.id}
      className={`group/card animate-in fade-in slide-in-from-bottom-2 relative cursor-grab gap-0 overflow-hidden rounded-lg py-0 duration-300 active:cursor-grabbing ${
        isDragging ? 'z-10 bg-card shadow-sm' : ''
      } ${photo.isActive ? '' : 'opacity-60'} ${FOCUS_ROW_CLASS}`}
      {...attributes}
      {...listeners}
      onClick={() => onToggleSelect(photo.id)}
    >
```

(iv) The imports, the same two lines as packages (v).

- [✅] **Step 4: Grep gates, the landing law is present, the fences hold**

```bash
grep -c "validateSearch" apps/admin/src/routes/_shell.packages.index.tsx apps/admin/src/routes/_shell.branches.tsx apps/admin/src/routes/_shell.gallery.tsx apps/admin/src/routes/_shell.testimonials.tsx
grep -c "data-row-id" apps/admin/src/components/packages/packages-table.tsx apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/components/gallery/gallery-screen.tsx
grep -c "FOCUS_ROW_CLASS" apps/admin/src/components/packages/packages-table.tsx apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/components/gallery/gallery-screen.tsx
grep -c "useFocusLanding" apps/admin/src/components/packages/packages-table.tsx apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/components/gallery/gallery-screen.tsx
grep -c "scrollIntoView" apps/admin/src/components/use-focus-landing.ts
grep -rn "packages/\$packageId/edit\|/packages/new" apps/admin/src/components/use-focus-landing.ts apps/admin/src/lib/focus-landing.ts
```

Expected: validateSearch → `1` in each of the four route files (testimonials' is #314's, unchanged); data-row-id → packages `3`, branches `3`, testimonials `2`, gallery `2` (each screen's stamped ELEMENTS, packages/branches/testimonials two postures, gallery one card, PLUS one comment literal in the packages/branches/gallery hook-call comments; testimonials' hook comment names no attribute); FOCUS_ROW_CLASS → packages `3`, branches `3`, testimonials `3`, gallery `2` (the import line + one per stamped element); useFocusLanding → `2` in each screen (the import + the call); scrollIntoView → `1`; the last grep → **no output** (the landing never names an editor route, the no-auto-open law, mechanically). Save as `.superpowers/sdd/2026-11-17-316-narrow-form-focus-landing/task-2-grep.txt`.

- [✅] **Step 5: Lint, format, test, typecheck, build**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test -- --run
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin build
```

Expected: all green; the suite stays at **Test Files 33 passed (33) · Tests 352 passed (352)** (no suite change in this task, the landing is component-side, walked live in Task 4); the build succeeds with the new imports in the four routes' graphs (the #218 execution ruling). The existing typed-search call sites (the Notification's `Link search={{ tab: 'submissions' }}`, the screen's `navigate({ to: '/testimonials', search: … })`, the sidebar's plain `to=` links) compile unchanged, the all-optional `focus` field accepts every existing literal (the recon note's assignability argument, now proven by this typecheck).

- [✅] **Step 6: Commit**

```bash
git add apps/admin/src/components/use-focus-landing.ts apps/admin/src/routes/_shell.packages.index.tsx apps/admin/src/routes/_shell.branches.tsx apps/admin/src/routes/_shell.gallery.tsx apps/admin/src/components/packages/packages-table.tsx apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/testimonials/testimonials-screen.tsx apps/admin/src/components/gallery/gallery-screen.tsx
git commit -m "feat(admin): the ?focus= landing honored by the four list screens (#316)"
```

### Task 3: The below-sm magnifier + top sheet, the narrow form of Global Search

The D6 narrow half: the results body extracts into a shared `GlobalSearchResults` (the prototype's `search-results-body.tsx` shape, ported onto #315's production seams), the magnifier button joins the topbar inside `GlobalSearch` (the topbar file itself is untouched, byte-identical neighbors), and the Sheet composes the shared body with its own `Command.Input` inside the cmdk tree. UI-bearing: load the skill set first.

**Files:**
- Modify (whole-file replace): `apps/admin/src/components/global-search.tsx` (263 lines → ~330; `admin-topbar.tsx` is NOT touched, `GlobalSearch` owns both postures)

**Interfaces:**
- Consumes: everything #315's file already consumed (unchanged); `Sheet`/`SheetClose`/`SheetContent`/`SheetTitle` (`@sevendays/ui/components/sheet`, side='top', `showCloseButton={false}`, the render-prop Close pattern); `Button` (`@sevendays/ui/components/button`); `Search` + `X` (lucide-react, joining the existing icon import); `type SearchGroup` + `type SearchDropdownState` from `#/lib/global-search` (new type imports for the shared body's props).
- Produces: `GlobalSearch`, same public name, same mount, now rendering both postures (the dropdown at sm+, the magnifier + sheet below sm). Nothing else consumes it.

**Not here:** any change to `#/lib/global-search.ts` (the emit side, the weights, `SEARCH_COPY`, #315 byte-identical); any new dependency or `packages/ui` edit (the Sheet primitive is consumed as installed); any `?focus=`/landing change (Task 2's); a second ⌘K binding or any platform sniffing on the binding (ONE rule, only the surface picks, by viewport); cmdk's built-in filter (`shouldFilter={false}` on both trees, the engine law); a kbd chip in the sheet (the chip belongs to the topbar Input's posture; the prototype's sheet row carries none); browse-all (the sidebar navigates); clearing the query on selection (it persists, both postures sharing one state); the Notification or any other topbar member.

- [✅] **Step 1: Load the UI/UX skill set**

Per AGENTS.md and the ticket's Execution notes: `prototype` + `ui-ux-pro-max`, plus `tanstack-router-best-practices` and `design-system`. The render is pinned below, the skills inform judgment (the sheet's elevation + overlay read in both themes, the input row's proportions, the highlight's contrast in dark), not re-composition.

- [✅] **Step 2: Replace `apps/admin/src/components/global-search.tsx` whole**, the new file:

```tsx
// The Global Search dropdown + its narrow form (M9 #315/#316, glossary,
// never "command palette" / "omnibar" / "quick find"): the topbar Input IS
// the typing surface; results drop from it in a non-modal anchored popover,
// the page visible around them, searching never blanks the working
// context. Below sm, where the Input is hidden by the house law, a
// magnifier-icon button in the topbar opens the SAME results as a top
// sheet with its own input inside (D6, #316), that input lives INSIDE the
// cmdk tree, so cmdk's native roving + selection need no bridge there (the
// structural mirror of the dropdown's outside-typing finding, D7), and
// Escape closes through the Sheet's Base UI dialog behavior. The engine is
// the hand-wired lib seam (#/lib/global-search, D7: fuse.js, identity >
// body, cmdk's built-in filter CANNOT serve the dropdown posture, it only
// filters items driven by its own Command.Input inside its tree, and the
// dropdown types into the topbar, outside it); cmdk runs here as the
// headless listbox core (shouldFilter={false} on BOTH trees) for keyboard
// roving + selection only. The index builds over useQueries on the five
// unchanged #288 factories at topbar (= shell) scope: same keys as the
// screens, full arrays with deactivated rows included, freshness inherited
// from the seam's own contracts, zero new fetch machinery. useDeferredValue
// keeps typing responsive; selection navigates via the seam's ?focus= href
// (the landing, scroll + highlight, is #316's useFocusLanding on the four
// list screens). Posture + anatomy ported from prototype/search-ux-variants
// variant B (#303's ruled pick), values and rulings, never the branch. The
// kbd chip's GLYPH is platform-picked (⌘K on Apple, Ctrl K elsewhere,
// owner-ruled 2026-11-17); the shortcut BINDING never sniffs: ⌘K and Ctrl+K,
// one rule (D6), only the rule's SURFACE is posture-picked, by viewport.
import { Button } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@sevendays/ui/components/popover';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@sevendays/ui/components/sheet';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Command } from 'cmdk';
import type { LucideIcon } from 'lucide-react';
import { ImageIcon, MapPin, Package, Quote, Search, X } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  adminBranchQueries,
  adminGalleryQueries,
  adminPackageQueries,
  adminTestimonialQueries,
} from '#/lib/cms-queries';
import {
  buildSearchIndex,
  runSearch,
  SEARCH_COPY,
  type SearchDropdownState,
  type SearchGroup,
  type SearchHit,
  searchDropdownState,
} from '#/lib/global-search';

/** The roving/selection keys forwarded into the cmdk tree by the bridge below. */
const ROVING_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter']);

/** The Tailwind sm breakpoint (640px), the ⌘K rule's surface picker. */
const SM_QUERY = '(min-width: 640px)';

const GROUP_ICONS: Record<SearchHit['group'], LucideIcon> = {
  packages: Package,
  branches: MapPin,
  testimonials: Quote,
  gallery: ImageIcon,
};

const KBD_CHIP =
  'pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground';

const GROUP_CLASS =
  '[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium';

export function GlobalSearch() {
  // The index source (D8): the #288 factories, UNCHANGED, useQueries reads
  // the five cached lists at topbar scope so a result can never disagree
  // with the screen it lands on; deactivated rows ride the same arrays the
  // lists render.
  const [packages, branches, testimonials, photos, categories] = useQueries({
    queries: [
      adminPackageQueries.all(),
      adminBranchQueries.all(),
      adminTestimonialQueries.all(),
      adminGalleryQueries.photos(),
      adminGalleryQueries.categories(),
    ],
  });

  const [open, setOpen] = useState(false);
  // The narrow form's surface (D6, #316): the top sheet below sm. It shares
  // the query state with the dropdown, one search, two postures.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Typing stays responsive: the Input tracks `query` immediately, the
  // deferred copy drives the (memoized) fuse pass (D7).
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const index = useMemo(
    () =>
      buildSearchIndex({
        packages: packages.data ?? [],
        branches: branches.data ?? [],
        testimonials: testimonials.data ?? [],
        photos: photos.data ?? [],
        categories: categories.data ?? [],
      }),
    [packages.data, branches.data, testimonials.data, photos.data, categories.data]
  );
  const groups = useMemo(() => runSearch(index, deferredQuery), [index, deferredQuery]);
  const state = searchDropdownState(deferredQuery, groups);

  // The chip's GLYPH alone is platform-picked (owner-ruled 2026-11-17);
  // mounted-gated so SSR markup and the first client render agree, no
  // hydration mismatch, the chip fills after mount.
  const [kbdGlyph, setKbdGlyph] = useState('');
  useEffect(() => {
    setKbdGlyph(/mac|iphone|ipad|ipod/i.test(navigator.platform) ? '⌘K' : 'Ctrl K');
  }, []);

  // ⌘K and Ctrl+K, ONE rule, no platform sniffing on the binding (D6).
  // Only the rule's SURFACE is posture-picked at the current viewport: the
  // dropdown + topbar Input at sm+, the sheet (its own input, autofocused
  // on open) below sm, the expert gesture works from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (window.matchMedia(SM_QUERY).matches) {
          inputRef.current?.focus();
          setOpen(true);
        } else {
          setSheetOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // The keyboard bridge (the DROPDOWN's, the sheet needs none, its input
  // lives inside its own cmdk tree): focus lives in the topbar Input,
  // OUTSIDE the popover's cmdk tree (cmdk 1.1.1 handles keys via onKeyDown
  // on its root div, dist-verified), so the roving/selection keys are
  // re-dispatched onto the Command root, where cmdk's own roving +
  // selection take over. Escape closes deterministically, in this posture
  // focus never enters the content, so the popover's own Escape arm cannot
  // be relied on.
  const onTypingKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (ROVING_KEYS.has(event.key)) {
      event.preventDefault();
      commandRef.current?.dispatchEvent(
        new KeyboardEvent('keydown', { key: event.key, bubbles: true })
      );
    }
  };

  // Selection lands on the entity's list screen via the seam's ?focus= href
  // (#316's useFocusLanding honors it on the four list screens). Whichever
  // posture selected, both close; the query persists, reopening resumes
  // where the eye was, nothing is cleared.
  const land = (hit: SearchHit) => {
    setOpen(false);
    setSheetOpen(false);
    void navigate({ href: hit.focusUrl });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        {/* The trigger is a passive anchor div wrapping the Input (Base UI has
            no Popover.Anchor part): the Input's clicks stop propagation so the
            typing surface never toggle-closes its own dropdown; focus and
            typing open it. nativeButton={false}, the anchor is a div, not a
            button (Base UI's own remedy for the non-button render prop).
            Below sm the Input stays hidden (the house law) and the magnifier
            (inside this same anchor) carries the narrow form instead. */}
        <PopoverTrigger
          nativeButton={false}
          render={<div className='flex min-w-0 items-center gap-1' />}
        >
          <div className='relative hidden min-w-0 sm:block'>
            <Input
              ref={inputRef}
              type='search'
              value={query}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onTypingKeyDown}
              placeholder='Search…'
              aria-label='Search'
              className='w-56 pr-10'
            />
            <kbd className={KBD_CHIP}>{kbdGlyph}</kbd>
          </div>
          {/* The narrow form's trigger (D6): below sm a magnifier-icon
              button opens the same results as a top sheet. Its click stops
              propagation, the button rides inside the popover's anchor
              div, and the anchor's own click must never toggle the
              (desktop) dropdown open below sm. */}
          <Button
            variant='ghost'
            size='icon'
            type='button'
            aria-label='Search'
            className='sm:hidden'
            onClick={(event) => {
              event.stopPropagation();
              setSheetOpen(true);
            }}
          >
            <Search aria-hidden='true' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          sideOffset={8}
          className='w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0'
        >
          {/* cmdk as the headless listbox core ONLY (D7): shouldFilter={false},
matching is the lib seam's; roving + selection are cmdk's. */}
          <Command ref={commandRef} shouldFilter={false} className='flex flex-col'>
            <GlobalSearchResults
              groups={groups}
              state={state}
              deferredQuery={deferredQuery}
              onSelect={land}
            />
          </Command>
        </PopoverContent>
      </Popover>

      {/* The narrow form (D6): the same results as a top sheet with its own
          input INSIDE the cmdk tree, focus starts there, so cmdk's native
          roving + selection need no bridge; Escape closes through the
          Sheet's Base UI dialog behavior. Same width law as the dropdown,
          centered (the top side is inset-x-0; mx-auto over the width
          resolves the overconstraint to a centered column). The overlay is
          the Sheet primitive's own (bg-black/30 + blur). */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side='top'
          showCloseButton={false}
          className='mx-auto w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0'
        >
          <SheetTitle className='sr-only'>Search</SheetTitle>
          <Command shouldFilter={false} className='flex flex-col'>
            <div className='flex items-center border-b'>
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder='Search…'
                aria-label='Search'
                autoFocus
                className='placeholder:text-muted-foreground h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none'
              />
              <SheetClose
                render={<Button variant='ghost' size='icon-sm' className='mr-1 shrink-0' />}
              >
                <X aria-hidden='true' />
                <span className='sr-only'>Close</span>
              </SheetClose>
            </div>
            <GlobalSearchResults
              groups={groups}
              state={state}
              deferredQuery={deferredQuery}
              onSelect={land}
            />
          </Command>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * The ruled-contract result body (D9), shared by BOTH postures, the #302
 * contract (grouping, caps, states, item anatomy) is identical across
 * them; only the chrome differs (the prototype's search-results-body
 * shape, ported onto the production seams). Renders inside a cmdk
 * <Command> tree; does no matching, the lib seam already did.
 */
function GlobalSearchResults({
  groups,
  state,
  deferredQuery,
  onSelect,
}: {
  groups: SearchGroup[];
  state: SearchDropdownState;
  deferredQuery: string;
  onSelect: (hit: SearchHit) => void;
}) {
  return (
    <Command.List className='max-h-[320px] overflow-y-auto p-2'>
      {state === 'hint' ? (
        <div className='px-4 py-10 text-center'>
          <p className='text-muted-foreground text-sm'>{SEARCH_COPY.hint}</p>
        </div>
      ) : state === 'empty' ? (
        <div className='px-4 py-10 text-center'>
          <p className='text-muted-foreground text-sm'>
            {SEARCH_COPY.noResults(deferredQuery)}
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <Command.Group key={group.key} heading={group.label} className={GROUP_CLASS}>
            {group.hits.map((hit) => (
              <SearchResultItem key={hit.id} hit={hit} onSelect={onSelect} />
            ))}
            {group.overflow > 0 ? (
              // An indicator, never a selectable item (D9).
              <div className='text-muted-foreground px-2 py-1.5 text-xs'>
                {SEARCH_COPY.overflow(group.overflow, group.label)}
              </div>
            ) : null}
          </Command.Group>
        ))
      )}
    </Command.List>
  );
}

function SearchResultItem({
  hit,
  onSelect,
}: {
  hit: SearchHit;
  onSelect: (hit: SearchHit) => void;
}) {
  const Icon = GROUP_ICONS[hit.group];
  return (
    <Command.Item
      value={hit.id}
      onSelect={() => onSelect(hit)}
      className='data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm'
    >
      <Icon aria-hidden='true' className='text-muted-foreground size-4 shrink-0' />
      <span className='min-w-0 flex-1'>
        <span className='flex items-baseline gap-1.5'>
          <span className='truncate'>{hit.primary}</span>
          {hit.deactivated ? (
            <span className='text-muted-foreground shrink-0 text-xs'>
              {SEARCH_COPY.deactivated}
            </span>
          ) : null}
        </span>
        {hit.secondary !== '' ? (
          <span className='text-muted-foreground block truncate text-xs'>{hit.secondary}</span>
        ) : null}
      </span>
      {hit.price !== '' ? (
        <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>{hit.price}</span>
      ) : null}
      {hit.group === 'gallery' && hit.thumbUrl !== null ? (
        // The muted thumb slot, the #287 versioned thumb renders into it
        // (D9). alt='': decorative, the identity line names the row.
        <img
          src={hit.thumbUrl}
          alt=''
          className='bg-muted size-7 shrink-0 rounded border object-cover'
        />
      ) : null}
    </Command.Item>
  );
}
```

- [✅] **Step 3: Grep gates, the posture laws are present, the fences hold**

```bash
grep -c "sm:hidden" apps/admin/src/components/global-search.tsx
grep -c "Command.Input" apps/admin/src/components/global-search.tsx
grep -c "matchMedia" apps/admin/src/components/global-search.tsx
grep -c "side='top'" apps/admin/src/components/global-search.tsx
grep -c "min(24rem,calc(100vw-1.5rem))" apps/admin/src/components/global-search.tsx
grep -c "shouldFilter={false}" apps/admin/src/components/global-search.tsx
grep -c "new KeyboardEvent" apps/admin/src/components/global-search.tsx
grep -c "autoFocus" apps/admin/src/components/global-search.tsx
grep -c "CommandDialog\|CommandInput\|defaultFilter\|refetchInterval\|prefetch" apps/admin/src/components/global-search.tsx
grep -n "SEARCH_COPY\." apps/admin/src/components/global-search.tsx
grep -c "adminPackageQueries.all()\|adminBranchQueries.all()\|adminTestimonialQueries.all()\|adminGalleryQueries.photos()\|adminGalleryQueries.categories()" apps/admin/src/components/global-search.tsx
```

Expected: `1` (the magnifier's class, the ONE literal; a second means something else crept below sm); `2` (the sheet's input + the header comment's mechanism mention); `1` (the surface picker, the binding itself stays the single `(event.metaKey || event.ctrlKey)` rule); `1` (the top sheet); `2` (the width law on both surfaces); `4` (both Command roots + two comment mentions, the header's "on BOTH trees" and the popover content's own core comment); `1` (the dropdown's bridge, exactly one, the sheet needs none); `1` (the sheet input's autofocus); **`0`** (no palette machinery, no polling, no prefetch, a nonzero count is a re-ruling, stop and report); the copy greps show every customer-visible string routed through `SEARCH_COPY` (hint, noResults, overflow, deactivated, four distinct member accesses); `5` (the five unchanged #288 factories, the index law). Save as `.superpowers/sdd/2026-11-17-316-narrow-form-focus-landing/task-3-grep.txt`.

- [✅] **Step 4: Lint, format, test, typecheck, build**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test -- --run
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin build
```

Expected: all green; the suite stays at **Test Files 33 passed (33) · Tests 352 passed (352)** (no suite change, the sheet is component-side, owner-reacted + walked in Task 4); the build succeeds (the topbar graph already rides every route; the Sheet primitive join is the only graph change).

- [✅] **Step 5: Commit**

```bash
git add apps/admin/src/components/global-search.tsx
git commit -m "feat(admin): the below-sm magnifier + top sheet - the narrow form of Global Search (#316)"
```

### Task 4: Gates, the owner's as-built variants reaction, the live walkthrough, docs rotation, PR, the v1 pick, issues, graphify

**Files:**
- Modify: `docs/progress.md` (one dated entry, newest first), `AGENTS.md` (three pinned find/replace edits), `docs/plan.md` (the THIRD M9 checkbox), this plan file (ticked boxes)
- Post-merge on main: `docs/agents/v1-picks.md` (one ledger row), `graphify-out/` (the graph update)

**Interfaces:** consumes the three code commits (Tasks 1–3); produces nothing code-facing.

**Not here:** any code change (a defect found by Step 2 or Step 3 goes back to its owning task's file with its own `fix(admin): … (#316)` commit, then this task re-runs from Step 1); #317's M9 roadmap box (the Verify box stays unticked, the exit-gate walkthrough + milestone closure are #317's ceremony; Task 4's walkthrough is THIS ticket's verification); `docs/plan.md` beyond the one checkbox; any mutation of dev-DB data (the admin `.env.local` DB is the LIVE pooler, this ticket's verification is read-only: navigation + search).

- [✅] **Step 1: The full check + the soft-ceiling gates**

```bash
pnpm check
git diff --stat main...HEAD -- apps/api apps/landing packages/ pnpm-lock.yaml
git diff main...HEAD -- apps/admin/package.json
```

Expected: `pnpm check` green across the repo; the first diff-stat **empty** (D11 proven, zero api/landing/packages/lockfile changes); the package.json diff **empty** (zero new dependencies, the strictest soft ceiling yet). Floors after this ticket: admin **33 files / 352 tests**; every other suite unchanged from AGENTS.md's recorded floors.

- [✅] **Step 2: The owner's as-built variants reaction (BLOCKING, the #94 amendment + the three plan-time rulings)**

The #94 amendment's round for this ticket: the as-built production render, both themes, light judged first, **the sheet is the reacted surface** (the ticket's AC names it), and the highlight lands in the same captures (it is #316's other new visual). Mechanics: bring up the dev stack (`pnpm --filter @sevendays/api dev` + `pnpm --filter @sevendays/admin dev`, serial note: never admin + landing together, both pin `:3000`); capture with a throwaway HEADLESS Playwright script kept OUTSIDE the repo (scripted sign-in with the controller's dev staff account, the owner's local credentials, never written to the evidence dir, never committed), emulating a **375×812 viewport** (below sm, the magnifier shows, the topbar Input hides). The states, light first, then the dark counterparts via a scripted `.dark` class toggle (the ThemeProvider's storage key, same as #315's round): (1) the topbar below sm with the magnifier visible + the Input gone; (2) the sheet OPEN from a magnifier click, the autofocused input (the capture's activeElement), the zero-query hint line, the centered width law, the overlay's dim; (3) a cross-group query's results in the sheet, the four fixed headers, item anatomy (icons, snippets, peso, thumbs); (4) a landing capture, Enter on a result, then the landed list screen mid-highlight (the tint visible on the matched row; screenshot within the 1.6 s window, a 1.2 s scripted delay after navigation) and the same screen after 2.5 s (the tint gone, the fade). Post the captures to #316 (`gh issue comment 316`) with the question: **the as-built narrow sheet + the focus landing in both themes, accept as-rendered, or findings?**, PLUS the three plan-time rulings surfaced for explicit confirm (they were pinned on the recommended options when the plan-time clarify round went unanswered): (a) the highlight = a primary tint fading after ~1.6 s, (b) `?focus=` persists in the URL (the `?tab=` law), (c) the sheet's input reuses `Search…` / `Search`. Then **BLOCK on the owner's answer** (the wait-for-owner rule, never assume while the owner may be AFK). Disposition per the house pattern: accept → proceed; findings → fix-batch commits on this branch (or follow-up issues if ruled out of scope), re-capture, re-ask; **a ruling overturned rewrites its pinned constant/law in the owning task's file** (e.g. `FOCUS_HIGHLIGHT_MS`, the persist law) as a `fix(admin): …` commit, the plan's pinned values bow to the owner, never the reverse. Record the verdict in `.superpowers/sdd/2026-11-17-316-narrow-form-focus-landing/variants-verdict.md`.

- [✅] **Step 3: The live walkthrough (the headed go-gate, evidence for the PR)**

**Announce first, wait for the owner's "go" before firing any headed-browser login** (the #310 census rule, the timer flow ends "ready, say go", never auto-fires). With the go: drive a HEADED browser over the dev stack (read-only, no data mutations; the whole walk is navigation + search + URL edits). Walk, in order, capturing each numbered state to the evidence dir:

1. **The landing, per entity (desktop):** from `/` (an unrelated screen), Ctrl+K → the dropdown opens on the hint; type a query matching a package → Enter → lands on `/packages` with `?focus=<uuid>` in the URL, the matched row scrolled to viewport center, the primary tint visible, fading within ~1.6 s (the rows' transition-colors playing the fade); **no editor auto-opened** (the packages edit route stays one deliberate click away, click nothing). Repeat for a branch (`/branches?focus=…`), a testimonial (`/testimonials?focus=…`, the published tab, the #314 default), and a gallery photo (`/gallery?focus=…`, the card scrolled + tinted).
2. **A deactivated row lands focused:** search a deactivated row's name (the `Deactivated` suffix visible in the dropdown) → Enter → the list lands with the row scrolled + highlighted (the `'all'` segment default renders it, no coercion anywhere).
3. **Without the param, the screens are unchanged:** navigate to `/packages`, `/branches`, `/testimonials`, `/gallery` plainly (sidebar), zero scroll, zero tint, byte-identical behavior to pre-#316.
4. **The persist law:** reload `/packages?focus=<uuid>` → the landing replays (scroll + tint). Hand-edit the URL to `?focus=garbage` → the schema drops it (the screen renders normal, no error); hand-edit to a well-formed but unknown uuid → the screen renders normal (the no-op).
5. **The mobile stacked posture:** narrow the window below the lists' 700px container fold (the table hides, the stacked rows show) → follow a `?focus=` link → the STACKED row receives the highlight (the hidden table row does not, the visible-row law).
6. **The below-sm sheet:** narrow below sm (640px, devtools responsive mode or a narrow window): the topbar shows the magnifier, the Input is gone; click the magnifier → the sheet opens with its input autofocused (type immediately, no click needed); type → the same anatomy (hint at zero query, the four fixed headers, cap-5 + the overflow tail if the catalog yields it, peso on package rows, thumbs on gallery rows, the `Deactivated` suffix).
7. **The sheet's keyboard model:** ArrowDown/ArrowUp rove (the `data-selected` highlight moves, cmdk native, NO bridge), Enter selects → navigates + the sheet closes; Escape closes; the X button closes.
8. **The ⌘K surface law:** below sm, press Ctrl+K → the SHEET opens (not the dropdown); widen past sm, press Ctrl+K → the dropdown opens + the topbar Input focuses (the one binding rule, surface-picked, note on the walkthrough that both arms ride the same `(event.metaKey || event.ctrlKey)` code path).
9. **The sheet's chrome:** the centered `w-[min(24rem,calc(100vw-1.5rem))]` column, the overlay's dim, the input row's bottom border, no kbd chip in the sheet (the chip belongs to the topbar posture).
10. **The sheet ⇄ dropdown share:** type a query in the sheet, Escape, widen past sm, Ctrl+K → the dropdown reopens on the same results (one query state, two postures).

Then dark theme: repeat 1, 2, 6, 7 (the tint's dark read, the sheet's dark elevation + overlay, the roving accent). Write `walkthrough.md` narrating each state's observed outcome. Any deviation is a defect, fix it in the owning task's file, re-run that task's gates, commit `fix(admin): … (#316)`, and restart this task from Step 1.

- [✅] **Step 4: `docs/progress.md`, the dated entry (newest first, pinned)**

Insert as the first entry under `# Progress` (replace `2026-11-XX` with the docs commit's date):

```markdown
- **2026-11-XX, M9 ticket 3, Search everywhere (#316), build complete on `feat/316-narrow-form-focus-landing`, PR pending.** Global Search reaches the narrow viewport and lands results where the eye looks. Below `sm`, where the topbar Input is hidden by the house law, a magnifier-icon button (the prototype's verbatim ghost icon, `aria-label='Search'`) opens the same results as a **top sheet with its own input inside** (D6): the shared `GlobalSearchResults` body (extracted from the dropdown, the prototype's ruled-contract shape) renders both surfaces over one query state and the five unchanged #288 factories; the sheet's `Command.Input` lives INSIDE its cmdk tree, so roving/Enter are cmdk-native, no bridge (the structural mirror of #315's outside-typing finding), Escape closes through the Sheet's Base UI dialog; `shouldFilter={false}` on both trees (the engine law); the same width law `w-[min(24rem,calc(100vw-1.5rem))]`, centered on the top side via `inset-x-0` + `mx-auto`; the ⌘K/Ctrl+K binding stays ONE rule with only its surface posture-picked by `matchMedia('(min-width: 640px)')`, dropdown + Input at sm+, sheet below. The **`?focus=` deep-link law** (D10) is honored by all four lists through one uniform mechanism: a tolerant uuid-shaped param (`focusSearchParam = z.uuid().optional().catch(undefined)`, the audit-log posture) registered on the packages/branches/gallery routes and joined to #314's `testimonialsSearchSchema`; the `useFocusLanding` hook scrolls the visible `[data-row-id]` row (the dual-posture law, desktop table + mobile stack both stamped, `offsetParent` picks the visible one) to viewport center and stamps `data-focused` for the ruled 1.6 s (a primary tint `bg-primary/10` + `ring-primary/30` fading on the rows' own transition-colors; the param persists per the `?tab=` law, the three plan-time rulings, pinned on the recommended options when the clarify round went unanswered and re-confirmed at the variants round). Editors never auto-open (by construction, the landing names list routes only); without the param the four screens behave exactly as before (the hook early-returns, the class paints nothing unattributed). Zero new dependencies, zero api/types/landing/db/ui/manifest changes (the D11 soft ceiling proven by the diff); admin floor 33 files / 352 tests (+8 focus-landing seam its: the param-read tolerance, the `?tab=` interplay, the pinned constants).
```

- [✅] **Step 5: `AGENTS.md` + `docs/plan.md`, the pinned edits**

(a) In *Current status of `pnpm test`*, replace the admin floor head (occurs once, verified at plan time):

```text
admin floor 32 files / 344 tests (
```

with:

```text
admin floor 33 files / 352 tests (
```

(b) In the same section, replace the #315 tail (occurs once, verified at plan time):

```text
and the D5 copy pins). The api and landing suites remain the behavioral backbones.
```

with:

```text
and the D5 copy pins; + #316's eight focus-landing seam pins, the tolerant uuid param read (absent/garbage/non-string dropped, never thrown), the tab+focus interplay on the testimonials route, and the pinned highlight constants). The api and landing suites remain the behavioral backbones.
```

(c) In the Engineering Rules status paragraph, extend the Global Search run (the anchor occurs once, verified at plan time; **mind the apostrophes: the on-disk sentence carries CURLY ones**, `seam’s` / `#316’s`, the #315 deferred minor, the anchor below is the on-disk byte form):

```text
and selection navigating via the seam’s `?focus=` href (the landing is #316’s).
```

becomes:

```text
and selection navigating via the seam’s `?focus=` href. The narrow form + the landing are live (M9 #316): below sm a magnifier button opens the same results as a top sheet with its own autofocused input (inside the cmdk tree, native keyboard, no bridge; the same width law, centered; the ⌘K surface posture-picked by viewport, the binding still one rule), and the `?focus=` deep link is honored by all four list screens, the matched row scrolled into view + highlighted (a primary tint fading after 1.6 s; the param persisting per the `?tab=` law), editors never auto-opened.
```

(d) In `docs/plan.md`'s M9 section, tick ONLY this ticket's box, replace:

```text
- [ ] Admin, Global Search, the narrow form + the deep link: below `sm` the magnifier button opens the same results as a top sheet with its own autofocused input; a result lands on its entity's list screen scrolled into view + highlighted via one uniform `?focus=<id>` mechanism across the four lists (editors never auto-open)
```

with the same line ticked:

```text
- [✅] Admin, Global Search, the narrow form + the deep link: below `sm` the magnifier button opens the same results as a top sheet with its own autofocused input; a result lands on its entity's list screen scrolled into view + highlighted via one uniform `?focus=<id>` mechanism across the four lists (editors never auto-open)
```

(The Verify box stays unticked, it is #317's deliverable; #316 never ticks it.)

- [✅] **Step 6: The docs commit**

Tick this plan's executed boxes (`- [✅]`), then:

```bash
git add docs/progress.md AGENTS.md docs/plan.md docs/superpowers/plans/2026-11-17-316-search-narrow-form-focus-landing.md
git commit -m "docs(m9): #316 lands the narrow form + the focus landing - progress, AGENTS floor, the M9 roadmap tick (#316)"
```

- [✅] **Step 7: PR + squash merge**

Push `feat/316-narrow-form-focus-landing`; open the PR against main titled `M9: Search everywhere, the below-sm top sheet + the ?focus= landing on the four lists (#316)`; body: the nine ACs each answered with its evidence pointer, the below-sm sheet (walkthrough states 6-9 + the sheet's pinned classes incl. the width law), the uniform `?focus=` mechanism on all four lists (states 1-2 + Task 2's grep gates + the four stamped row sites), never auto-opens (state 1 + the owning-task grep's empty editor-route result), theme-awareness (Step 2's both-theme captures + the dark repeats), without-the-param unchanged (state 3 + the hook's early-return law), the lib-seam suite (+8 its, floor 33/352), the owner-reacted sheet variants (Step 2's verdict incl. the three rulings re-confirmed), the soft ceiling (Step 1's empty diffs, zero manifest changes), `pnpm check` green + docs updated + the v1-pick triaged (Step 8). Squash-merge.

- [✅] **Step 8: The v1 pick (per `docs/agents/v1-picks.md`)**

Run the path pass on the squash SHA:

```bash
node scripts/v1-triage.mjs <main-sha>
```

Expected: admin-only and additive with **zero dependency changes**, the ticket's expected **`PICK clean`**. The classifier's output is the truth over this expectation (the #237 precedent). If the classifier rules SPLIT (the mechanical norm for admin-only tickets whose docs are main-only, the plan file, `docs/progress.md`, `docs/plan.md` drop main-only; the `AGENTS.md` floor hunks ride the content pass), execute per the runbook's § Executing a PICK or § Executing a SPLIT as ruled, run § The locks (`pnpm check` + `pnpm build` green, the export audit exit 0), push, CI green. Append the ledger row on main, filling every bracketed value from the actual run:

```text
| <merge date> | #<PR> | `<main-sha>` | <pick\|split> | `<v1-sha or n/a>` | #316, M9 ticket 3, Search everywhere: the below-sm magnifier + top sheet (the shared GlobalSearchResults body, Command.Input inside the cmdk tree, native keyboard, same width law centered, the ⌘K surface posture-picked) + the ?focus= landing honored by all four lists (focus-landing.ts: tolerant uuid param + FOCUS_HIGHLIGHT_MS/FOCUS_ROW_CLASS; use-focus-landing.ts: visible-row scroll + the imperative data-focused stamp; data-row-id on both postures; the testimonials schema extended). Zero new dependencies. <PICK/SPLIT per classifier>. Locks: <check/build/audit results>; run <run-id> green |
```

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #<PR> ledger row - the #316 narrow form + focus landing pick"
```

- [✅] **Step 9: Issue closes + graphify**

Tick #316's nine AC boxes in its body, then close it with the AC → evidence mapping (mind the jq case law, lowercase `.body`, and verify the intermediate file before the edit):

```bash
gh issue view 316 --json body --jq .body | sed 's/^- \[ \]/- [✅]/' > /tmp/316-body.md
# verify: the nine boxes read [✅] and the body is intact before editing
cat /tmp/316-body.md
gh issue edit 316 --body-file /tmp/316-body.md
gh issue close 316 --comment "Landed in #<PR> (main <main-sha>, v1 <pick-sha-or-n/a>). The below-sm sheet is live: the magnifier opens the same results as a top sheet with its own autofocused input inside the cmdk tree (native roving/Enter, no bridge; Escape + X through the Sheet), the same anatomy/groups/states/copy over the shared GlobalSearchResults body, the same width law centered, the ⌘K binding one rule with its surface posture-picked by viewport (walkthrough states 6-9). The ?focus= law is honored by all four lists through one uniform mechanism, the tolerant uuid param on the four routes (testimonials' schema extended beside #314's tab), the visible-row scroll + the 1.6 s primary-tint highlight on both postures (states 1-5), editors never auto-opened, the screens unchanged without the param (state 3), garbage + unknown ids tolerated (state 4). Both themes owner-reacted (Step 2 verdict, the three plan-time rulings confirmed: the fade, the persist, the reused copy). Zero new deps; zero api/types/landing/db/ui/manifest changes, the soft ceiling diff empty; admin floor 33 files / 352 tests (+8 seam its). #317 (the exit gate + M9 closure) is unblocked."
```

Then the graph (on main, after the ledger commit):

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#316 graph update"
```

(The M9 frontier after this ticket: #317 is next and last, `ready-for-agent`, its native edges satisfied.)
