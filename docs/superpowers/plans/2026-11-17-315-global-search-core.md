# M9 Ticket 2 — Global Search core (the fuse.js engine seam + the inline dropdown) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Tasks 2 and 3 are UI-bearing and load the installed UI/UX skill set at execution time** — per #315's Execution notes: `prototype` + `ui-ux-pro-max` (the house rule), plus `ui-styling`, `tanstack-query-best-practices`, `dark-mode-design`, and `vitest` (Task 1). **The composition is pre-ruled, not open:** the posture + anatomy are #303's ruled Variant B ported from `prototype/search-ux-variants` (values and rulings, never the branch) and every new string is D5's ratified table plus the two 2026-11-17 owner rulings pinned in Global Constraints — the skills inform judgment on the pinned renders, they do not re-compose. Task 3 carries TWO blocking owner interactions (the as-built variants reaction + the headed-login "go" gate) — never proceed past them unilaterally. Everything runs to the gates.

**Goal:** Ticket [#315](https://github.com/jeius/sevendays/issues/315) — the admin topbar's inert search Input becomes the typing surface of **Global Search** (glossary term — avoid *command palette*, *omnibar*, *quick find*): results drop from the Input in a non-modal inline dropdown (⌘K and Ctrl+K both bound, one rule), filtered from the first character by a client-side **fuse.js** index built from the #288-cached admin list queries (all four CMS content entities + the gallery category-name join, deactivated rows included), with **cmdk as the headless listbox core** (`shouldFilter={false}`) for keyboard roving + selection only. Four fixed group headers capped at 5 with the `+N more in {group}` tail; the ratified item anatomy (muted entity icon, identity line + visible `Deactivated` suffix, one-line body snippet, peso on package rows — unpriced blank, the #287 versioned thumb on gallery rows); selection navigates to the entity's list screen via the seam's `?focus=` href (the landing — scroll + highlight — is #316's).

**Architecture:** Three tasks, admin-app-local only (the D11 soft ceiling: zero api / db / types / api-client / packages-ui / landing files — the one manifest change is the two ruled admin-local deps): (1) the deps land (`cmdk@^1.1.1` + `fuse.js@^7.5.0`, exactly the prototype's manifest entries) + the engine seam as TDD plain-node lib — a new `global-search.ts` (`buildSearchIndex` over cached-shaped arrays with the category-name join, `runSearch` with identity > body weights pinned as constants + the cap-5/overflow law, `focusUrlFor`, `searchDropdownState`, and `SEARCH_COPY` — every D5 string one-sourced); (2) the `GlobalSearch` component (Variant B ported, minus #316's narrow form) mounted in the topbar over `useQueries` on the five unchanged #288 factories, with `useDeferredValue`, the ⌘K/Ctrl+K rule, and the keyboard bridge that re-dispatches roving keys onto the cmdk root; (3) gates, the owner's as-built variants reaction (blocking), the live walkthrough (the headed go-gate, both themes), docs rotation, PR, the v1 pick, issue close, graphify.

**Tech Stack:** exactly TWO new dependencies, both admin-local (D7): `cmdk@^1.1.1` (resolved 1.1.1 — the headless listbox core) + `fuse.js@^7.5.0` (resolved 7.5.0 — the matcher); the manifest edit + lockfile entries are this ticket's ONLY manifest change. React Query v5 (`useQueries` over the unchanged #288 `queryOptions` factories). React 19 (`useDeferredValue`). TanStack Router (`navigate({ href })` — href-string navigation, spike-verified). The shared primitives are installed: Base-UI `Popover`/`PopoverTrigger`/`PopoverContent` (`align`/`sideOffset`) + `Input`. TypeScript with `noUncheckedIndexedAccess` ON. vitest 4.1.11 plain-node lib-seam tests (`src/**/*.test.ts`, environment node, no component/DOM tests — the house law). pnpm + Turborepo, `gh` CLI, `graphify update .` at close.

**Spec:** Implements #315 (label `ready-for-agent`) against the ratified M9 spec `docs/specs/2026-11-16-m9-admin-notifications-search-spec.md` (**D6 narrow form + D7 + D8 + D9 + the D10 emit half + D11 + § Testing Decisions**) — D6's below-sm sheet half and D10's landing half are #316's, fenced below. Primary source: local-only branch `prototype/search-ux-variants` (commits `bdd0f03` variant A — the losing palette, `fd347b1` variant B — the ruled pick, `c08519b` the switcher + topbar mount) — **port values and rulings, never merge**. Key recon facts (2026-11-17, main `0db74e4`, tree clean apart from untracked `.claude/`; every file below read whole or at the cited lines this session):

- **The five factories (#288 seam, `apps/admin/src/lib/cms-queries.ts` — consumed UNCHANGED):** `adminPackageQueries.all()` (`['admin', 'service-packages']`), `adminBranchQueries.all()` (`['admin', 'branches']`), `adminTestimonialQueries.all()` (`['admin', 'testimonials']`), `adminGalleryQueries.photos()` (`['admin', 'gallery-photos']`), `adminGalleryQueries.categories()` (`['admin', 'gallery-categories']`) — every one `staleTime: CMS_STALENESS_MS` (5 min) + `refetchOnWindowFocus: true`. The index reads them at topbar scope (the topbar renders on every `_shell` screen — the #314 hoist precedent): same keys as the screens, so **a result can never disagree with the screen it lands on**; freshness inherits the seam's own contracts (staleness window, window focus, the screens' own-mutation invalidation) — the search adds zero fetch machinery of its own.
- **The wire shapes (what the cached queries deliver, `packages/api-client` + `packages/types`):** packages → `ServicePackageRead[]` (ALL incl. deactivated; `name`, `description`, `priceCents: number | null`, `isActive`, `id` — fixtures parse through `servicePackageReadSchema`, which also requires `inclusions: []` / `frames: []` / `coverImageUrl`); branches → `BranchRead[]` (`branchReadSchema`: `name`, `address`, `phone`, `isActive`); testimonials → `Testimonial[]` (`person`, `quote`, `isActive`); photos → `GalleryPhoto[]` (`title: string | null`, `caption: string | null`, `categoryId: string | null`, `isActive`, `updatedAt: Date`); categories → `GalleryCategory[]` (`name`, `isActive`). **The nullables are the wire's truth** — the seam null-coalesces `title ?? ''` / `caption ?? ''` / a missing category join to `''`; a photo null in every indexed field simply matches nothing (honest).
- **The pesos + thumbs (on-disk libs, reused):** `peso(cents: number | null): string | null` (`apps/admin/src/lib/peso.ts` — `₱1,100.00` at 110000, `null` unpriced); `thumbUrl(photo: Pick<GalleryPhoto, 'id' | 'updatedAt'>): string` (`apps/admin/src/lib/gallery-thumbs.ts` — `/api/admin/gallery-photos/<id>/thumb?v=<updatedAt epoch ms>`, the #287 versioned URL). Never re-declared.
- **cmdk 1.1.1 (dist-inspected this session, `node_modules/.pnpm/cmdk@1.1.1*/…/dist/index.mjs`):** the root `Command` is a `ForwardRefExoticComponent` rendering `div[cmdk-root] tabIndex=-1` whose React `onKeyDown` switch drives ArrowDown/ArrowUp/Home/End/Enter roving + selection (`Command.Item onSelect`, `data-selected` styling, `cmdk-group-heading` attribute for the Group heading, `shouldFilter` prop). **The structural finding (D7, the prototype's): cmdk's key handling only fires for keydowns inside its tree — and this posture types into the topbar Input, OUTSIDE the popover portal.** The bridge is therefore explicit: the Input's `onKeyDown` re-dispatches the roving keys onto the Command root (`commandRef.current?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))`) — React's delegated listeners (attached at root + portal containers) fire the cmdk root's handler for a bubbling synthetic dispatch. React `KeyboardEvent` construction cannot set the legacy `keyCode`, so cmdk's IME guard (`keyCode === 229`) passes open — the dispatch flows. The live walkthrough (Task 3, Step 3) asserts the bridge on a real browser; a plain roving-state fallback inside the component is the named repair if the bridge fails there (a #315-scoped component change, not a re-ruling).
- **The navigate spike (run this session in the consuming package, then deleted — `git status` clean):** with `?focus=` NOT yet a registered search param (#316 owns `validateSearch` on the four routes), BOTH `navigate({ href: '/packages?focus=abc' })` AND `navigate({ to: '/packages', search: { focus: 'abc' } })` typecheck clean against `@tanstack/react-router` (latest, the installed resolution). **Pinned: href-string navigation** — the lib seam's `focusUrlFor` IS the URL, navigation consumes it directly, and #316's later `validateSearch` registration cannot drift the emit side.
- **The fuse probe (run this session against the installed fuse.js@7.5.0):** with keys `name` weight 2 / `description` weight 1, `threshold: 0.3`, `ignoreLocation: true`, `includeScore: true` — an identity match (`'Debut'` in `name`) scores `3.7e-11`, a body match (`'Debutantes…'` in `description`) scores `0.357`: identity ranks decisively first, and single-character patterns filter (no min-length gate). The ranking test pins this exact fixture shape.
- **The topbar today (`apps/admin/src/components/admin-topbar.tsx`, post-#314):** `<SidebarTrigger />` + `<Separator />` + the inert `Input type='search' placeholder='Search…' aria-label='Search' className='hidden w-56 sm:block'` + `<Notification />` + `<ThemeToggle />`. Task 2 replaces the raw Input with `<GlobalSearch />` (which owns the Input, `w-56`, and the ⌘K chip) — the layout is byte-identical otherwise.
- **The prototype's Variant B values (ported):** `Popover open/onOpenChange` controlled; `PopoverTrigger render={<div className='flex min-w-0 items-center gap-1' />}` wrapping the Input (Base UI has no `Popover.Anchor` part — the passive div is the anchor); **the Input's clicks stop propagation so the typing surface never toggle-closes its own dropdown**; `onFocus` + `onChange` open; `PopoverContent align='start' sideOffset={8} className='w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0'`; `Command shouldFilter={false} className='flex flex-col'`; `Command.List className='max-h-[320px] overflow-y-auto p-2'`; the kbd chip `'pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground'` + the Input's `pr-10`; the group-heading class `'[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium'`; the item `flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground` with icon `size-4 shrink-0 text-muted-foreground`, identity `truncate` + suffix `shrink-0 text-xs`, secondary `block truncate text-xs text-muted-foreground`, price `shrink-0 text-xs tabular-nums`, thumb slot `size-7 shrink-0 rounded`. **NOT ported (fenced to #316):** the below-sm `Command.Input` inside the content (`sm:hidden`), the magnifier `Button` (`sm:hidden`), the engine switcher, the stub catalog, the `land` toast stub, the prototype's `TODO(owner-copy)` markers (superseded by D5 + the 2026-11-17 rulings).
- **The base rates + baselines (live, run this session):** admin suite **31 files / 325 passed** (matches AGENTS.md's floor); after Task 1: **32 files / 344 tests** (+19 its in the new `global-search.test.ts`; Task 2 adds no suite). Types/api/api-client/landing/db untouched by this ticket — the diff proves the soft ceiling.
- **Sibling fences (the M9 cuts, #315 is ticket 2 of 4):** NOT here, regardless of temptation: **the below-sm magnifier button + top sheet** (its own autofocused input, the same results as a sheet) — #316 in full; **the `?focus=` LANDING** (scroll-into-view + highlight on the four list screens, the `validateSearch` registration, never auto-opening an editor) — #316 owns the honoring; this ticket only EMITS the href; **the live-stack exit-gate walkthrough + milestone closure** — #317; **the Notification** — landed (#314, untouched here). The M9 roadmap box this ticket owns is the SECOND (`docs/plan.md` M9 section, `- [ ] Admin — Global Search, the dropdown: …`) — it ticks in Task 3; the narrow-form box and the Verify box **stay unticked until #316/#317 land** — #315 never ticks them.
- **Local stack quirks (memory, binding for Task 3):** both frontends pin `:3000` + ws `:9229` (serial only — run admin + api together, never admin + landing); the api dev port is `8787` (`apps/api/wrangler.toml`); admin CMS reads need the local api (`API_URL` in `apps/admin/.env.local`); the admin `.env.local` DB is the LIVE pooler — **the walkthrough mutates nothing** (navigation + search only), and no fixture rows are invented against it.

## Global Constraints

- **Branch & baseline:** `feat/315-global-search` off main `0db74e4` (verify `git rev-parse --short main` at execution; if main moved, reconcile the anchored line numbers before starting — the file anchors below were read at that SHA). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#315)` squash style; every commit is pinned verbatim below. Evidence (red/green test output, grep gates, variants captures, walkthrough narration) lands in gitignored `.superpowers/sdd/2026-11-17-315-global-search-core/`.
- **Gates (repo AGENTS.md duties):** **the manifest changes exactly once, in Task 1 Step 1** (the churn-free transplant procedure is pinned there — this environment's pnpm re-resolves the admin manifest's floating `latest` tags on every full resolution, so `pnpm add` AND plain `pnpm install` both churn the lockfile; the 2026-11-17 execution ruling) — after which `apps/admin/package.json` diff shows exactly the two dependency lines and `pnpm-lock.yaml` is **30 added / 0 removed**: the two importer dep blocks + the `cmdk@1.1.1` + `fuse.js@7.5.0` entries in both the `packages:` and `snapshots:` sections — cmdk's radix transitive closure (compose-refs/dialog/id/primitive, all peer-suffixed `@types/react@19.2.18`/`react@19.2.8`) already exists in the pre-state lockfile; `pnpm install --frozen-lockfile` is the validation gate. Every task commits only with its checks green: `pnpm --filter @sevendays/admin fix` BEFORE committing (accept the rewrites; re-run the suite if it rewrote anything) → `test -- --run` → `typecheck`. Task 2 additionally runs `pnpm --filter @sevendays/admin build` (the #218 execution ruling: the production build joins the checks whenever a route's module graph gains an import — `global-search.tsx` enters EVERY route's graph via the topbar). `pnpm build:packages` is NOT needed (no `@sevendays/api` dist change is consumed). Never stage `graphify-out/` churn (Task 3's update is its own commit). Never commit secrets. Tick checklist boxes with `- [✅]`, never plain `[x]` (this plan file, `docs/plan.md`, and issue bodies alike). Final gate: `pnpm check` green across the repo. **The soft-ceiling gate (D11):** before the PR, `git diff --stat main...HEAD -- apps/api apps/landing packages/` must be EMPTY (any api/types/api-client/ui need discovered mid-flight is a re-ruling for the owner, not drift); `pnpm-lock.yaml` + `apps/admin/package.json` are this ticket's ruled exceptions and their diffs must contain exactly the two deps — `git diff main...HEAD -- apps/admin/package.json` shows two added lines, nothing else.
- **The copy law (owner-ratified verbatim — D5's table at #305, plus TWO owner rulings dated 2026-11-17, asked and answered at plan time; pin these, never re-draft, no TODO(owner-copy) markers):** zero-query hint `Type to search packages, branches, testimonials, gallery`; no-results `No results for “{q}.”` — **period INSIDE the closing curly quote** (owner-ruled 2026-11-17: the #303 as-rendered bytes over the spec table's markdown); overflow tail `+{N} more in {group}`; group headers `Packages` / `Branches` / `Testimonials` / `Gallery`; Deactivated suffix `Deactivated`; the topbar Input's placeholder `Search…` + `aria-label='Search'` (on-disk, unchanged). **The kbd chip glyph (owner-ruled 2026-11-17):** `⌘K` when `/mac|iphone|ipad|ipod/i.test(navigator.platform)`, else `Ctrl K` — the GLYPH alone sniffs platform, mounted-gated (empty until the effect runs, so SSR and first client render agree — no hydration mismatch); **the shortcut binding itself never sniffs** — one rule, `(event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'`. Every string lives one-sourced in `SEARCH_COPY` (the lib) — the component imports, never re-declares.
- **The engine law (D7, binding):** the matcher is the hand-wired lib seam — fuse.js per-entity indexes, keys exactly D8's field set, weights PINNED as exported constants (`SEARCH_IDENTITY_WEIGHT = 2`, `SEARCH_BODY_WEIGHT = 1` — identity > body), `threshold: 0.3`, `ignoreLocation: true`, `includeScore: true` (the prototype's proven tuning; the spec rules the exact numbers execution tuning pinned at the seam — these are they). Zero query answers `[]` (the hint line, never browse-all — the sidebar navigates); filtering from the first character (no min-length gate). **cmdk's built-in filter is dead in production** (`shouldFilter={false}` on the Command — matching is NEVER cmdk's; the documented zero-dep fallback stays documented in the spec, never loaded). `useDeferredValue` on the query keeps typing responsive. **Excluded from the index (D8):** slugs (only packages carry one), branch phone, frames/inclusions — the suite pins the slug + phone exclusions.
- **The index law (D8, binding):** built from the five #288 factories UNCHANGED over `useQueries` at topbar scope — full unpaginated arrays, deactivated rows INCLUDED (search mirrors the lists' All/Active/Deactivated vocabulary); the gallery category-name join is a free client-side `Map` over the separate cached categories query (a photo matches its category's name at body weight; the displayed secondary composes `category · caption` with empty parts skipped); freshness inherits the seam's contracts exactly — **zero new fetch machinery: no new query keys, no prefetch, no polling, no per-keystroke fetches.**
- **The posture law (D6's core half):** the topbar Input IS the typing surface; results drop in an anchored popover (`align='start'`, `sideOffset={8}`, `w-[min(24rem,calc(100vw-1.5rem))]`), **non-modal by construction** (Base UI Popover, no modal), the page visible around results, **no footer chrome**; the Input's clicks stop propagation (typing never toggle-closes), focus/typing opens; ⌘K and Ctrl+K both focus the Input + open the dropdown (one rule, no platform sniffing on the binding). Below `sm` the Input stays hidden by the house law and NOTHING ships for it (#316's magnifier + sheet are fenced). The full keyboard model — arrows roving, Enter selecting, Escape closing — flows through the explicit bridge onto the cmdk root (the recon note's mechanism), asserted live in Task 3.
- **The navigation law (D10's emit half):** selection navigates to the entity's list screen via the seam's `focusUrlFor(group, id)` href through `navigate({ href })` — `?focus=<id>` on `/packages` `/branches` `/testimonials` `/gallery`. The landing (scroll into view + highlight, the `validateSearch` registration, no-editor-auto-open) is #316's — this ticket registers NO search params and edits NO routes. The query text persists across a selection (reopening resumes; nothing is cleared).
- **The theme law (#217):** the dropdown composes semantic tokens only (`bg-accent`/`text-accent-foreground` roving, `text-muted-foreground` hierarchy, `bg-muted` chip/thumb slot) — both themes render from one markup; the walkthrough walks both, light judged first.
- **The house test law (§ Testing Decisions):** the seam suite is plain-node lib-seam tests over `src/lib/*.test.ts` — fixtures parse through the WIRE schemas (the `gallery-thumbs.test.ts` posture: what the seam consumes is exactly what the cached queries deliver, Date instances included); no component/DOM tests, no new test dependencies. Existing floors untouched: zero api / api-client / types / landing test changes — the no-API-work invariant made visible by the diff.

## File Structure

```text
apps/admin/package.json                    # modify (T1) — + cmdk ^1.1.1 + fuse.js ^7.5.0 (the only manifest change)
pnpm-lock.yaml                             # modified (T1) — exactly the two deps + cmdk's compose-refs transitive
apps/admin/src/lib/
  global-search.ts                         # new (T1) — SEARCH_COPY, buildSearchIndex (the join), runSearch (weights/cap/order), focusUrlFor, searchDropdownState, SearchHit/SearchGroup/SearchIndex types
  global-search.test.ts                    # new (T1) — 19 its
apps/admin/src/components/
  global-search.tsx                        # new (T2) — the GlobalSearch dropdown (Variant B ported) + the keyboard bridge
  admin-topbar.tsx                         # modify (T2) — the inert Input becomes <GlobalSearch />
docs/progress.md AGENTS.md docs/plan.md this plan file   # T3
docs/agents/v1-picks.md graphify-out/                     # T3, post-merge on main
```

---

### Task 1: The engine seam — the deps land + `global-search.ts` (TDD)

The ticket's whole test surface, plus every pure value Task 2 consumes. No component changes yet.

**Files:**
- Modify: `apps/admin/package.json` + `pnpm-lock.yaml` (the two deps — the ruled manifest change)
- New (test-first): `apps/admin/src/lib/global-search.test.ts`
- New: `apps/admin/src/lib/global-search.ts`

**Interfaces:**
- Produces (what Task 2 consumes), all from `#/lib/global-search`: `type SearchGroupKey = 'packages' | 'branches' | 'testimonials' | 'gallery'`; `SEARCH_GROUP_CAP = 5`; `SEARCH_IDENTITY_WEIGHT = 2`; `SEARCH_BODY_WEIGHT = 1`; `SEARCH_COPY: { hint: string; noResults: (query: string) => string; overflow: (n: number, label: string) => string; deactivated: string; groupLabels: Record<SearchGroupKey, string> }`; `interface SearchHit { id: string; group: SearchGroupKey; primary: string; secondary: string; deactivated: boolean; price: string; thumbUrl: string | null; focusUrl: string }`; `interface SearchGroup { key: SearchGroupKey; label: string; hits: SearchHit[]; overflow: number }`; `type SearchDropdownState = 'hint' | 'empty' | 'results'`; `interface SearchIndexInput { packages: ServicePackageRead[]; branches: BranchRead[]; testimonials: Testimonial[]; photos: GalleryPhoto[]; categories: GalleryCategory[] }`; `buildSearchIndex(input: SearchIndexInput): SearchIndex` (Fuse instances per entity, photos pre-joined with `categoryName`); `runSearch(index: SearchIndex, query: string): SearchGroup[]` (fixed group order, empty groups omitted, cap 5 + overflow); `focusUrlFor(group: SearchGroupKey, id: string): string`; `searchDropdownState(query: string, groups: SearchGroup[]): SearchDropdownState`.
- Consumes: `Fuse` from `fuse.js` (new dep); `thumbUrl` from `./gallery-thumbs` (the #287 versioned URL — gallery hits carry it at index build); `peso` from `./peso` (`null` unpriced → `''`); the five wire types from `@sevendays/types`.

**Not here:** any component or topbar edit (Task 2); the below-sm form, magnifier, or sheet (#316); any `validateSearch`/route edit (#316); the `?focus=` landing (#316); the engine switcher/cmdk-filter fallback from the prototype (dead — D7 documents it, production never loads it); new busy labels or toasts (nothing here is async-visible); `cmdk` imports in the LIB (it is the component's listbox core — the seam is pure fuse.js + pure functions).

- [ ] **Step 1: Land the two deps (the ruled manifest change — the churn-free path, the 2026-11-17 execution ruling)**

`pnpm add` re-resolves the admin manifest's floating ranges — the `@tanstack/*` `"latest"` tags churned ~25 unrelated lockfile entries (211+/199−) when trialed live — so the deps land by hand-edit + install instead: the lockfile freezes every existing entry and resolves ONLY the new packages.

(a) Hand-edit `apps/admin/package.json` — add exactly these two lines in pnpm's sort positions (`"cmdk"` after `"class-variance-authority"`, before `"cn"`; `"fuse.js"` after `"dotenv-cli"`, before `"lucide-react"`), byte-matching the prototype branch's manifest:

```json
    "cmdk": "^1.1.1",
    "fuse.js": "^7.5.0",
```

(b) Then land the lockfile entries WITHOUT a full resolution — this environment's pnpm (11.24.0) re-resolves the admin manifest's floating `latest` tags on EVERY full resolution (both `pnpm add` AND plain `pnpm install` churned ~25 unrelated entries when trialed live, the #315 execution ruling), so the entries are transplanted pnpm-authored bytes: (i) run a throwaway `pnpm install` (churn expected — its `git diff -U0 pnpm-lock.yaml` carries the ruled hunks), (ii) filter that diff to ONLY the importer dep blocks + the `cmdk@1.1.1`/`fuse.js@7.5.0` package and snapshot entries (the SDD workspace's `filter-lockfile-hunks.mjs` — an explicit allowlist, since new-VERSION keys of pre-existing packages are still churn), (iii) `git checkout -- pnpm-lock.yaml` to restore pre-state, (iv) `git apply --unidiff-zero` the minimal patch, (v) validate with `pnpm install --frozen-lockfile` — pnpm itself confirms the hand-applied lockfile matches the manifest and materializes node_modules; a frozen failure is a loud STOP.

Expected: `apps/admin/package.json` diff shows exactly those two added lines; the lockfile diff is **30 added / 0 removed** — the two importer dep blocks + the `cmdk@1.1.1` + `fuse.js@7.5.0` entries in BOTH the `packages:` and `snapshots:` sections (the radix transitive closure — compose-refs/dialog/id/primitive — already exists in the pre-state lockfile) — and NOTHING else. `pnpm install --frozen-lockfile` exits 0 and leaves the lockfile diff unchanged. Verify + save:

```bash
git diff apps/admin/package.json
pnpm --filter @sevendays/admin test -- --run
```

Expected: the diff shows exactly two added dependency lines; the suite stays green at **31 files / 325 passed** (the deps break nothing). Save the diff as `.superpowers/sdd/2026-11-17-315-global-search-core/task-1-deps.txt`.

- [ ] **Step 2: Write the failing tests**

New file `apps/admin/src/lib/global-search.test.ts` — the whole file:

```ts
import {
  branchReadSchema,
  galleryCategorySchema,
  galleryPhotoSchema,
  servicePackageReadSchema,
  testimonialSchema,
} from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { thumbUrl } from './gallery-thumbs.js';
import {
  buildSearchIndex,
  focusUrlFor,
  runSearch,
  searchDropdownState,
  SEARCH_BODY_WEIGHT,
  SEARCH_COPY,
  SEARCH_GROUP_CAP,
  SEARCH_IDENTITY_WEIGHT,
  type SearchIndexInput,
} from './global-search.js';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STAMP = '2026-11-17T00:00:00.000Z';

// Fixtures parse through the WIRE schemas (the gallery-thumbs posture):
// what the seam consumes is exactly what the cached #288 queries deliver —
// Date instances and nullables included.
const pkg = (n: number, overrides: Record<string, unknown> = {}) =>
  servicePackageReadSchema.parse({
    id: uuid(n),
    name: `Package ${n}`,
    description: `Description ${n}`,
    priceCents: 110000,
    durationMinutes: 60,
    isActive: true,
    coverImageUrl: null,
    slug: `package-${n}`,
    isFeatured: false,
    inclusions: [],
    frames: [],
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const branch = (n: number, overrides: Record<string, unknown> = {}) =>
  branchReadSchema.parse({
    id: uuid(n),
    name: `Branch ${n}`,
    address: `Address ${n}`,
    phone: '555-0100',
    acceptsWalkIns: false,
    isActive: true,
    coverImageUrl: null,
    latitude: null,
    longitude: null,
    googleMapsUrl: null,
    appleMapsUrl: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const testimonial = (n: number, overrides: Record<string, unknown> = {}) =>
  testimonialSchema.parse({
    id: uuid(n),
    quote: `Quote ${n}`,
    person: `Person ${n}`,
    position: n,
    isActive: true,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const photo = (n: number, overrides: Record<string, unknown> = {}) =>
  galleryPhotoSchema.parse({
    id: uuid(n),
    title: `Photo ${n}`,
    caption: null,
    categoryId: null,
    position: n,
    isActive: true,
    photoUrl: `https://pub-test.r2.dev/gallery/${n}.jpg`,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const category = (n: number, overrides: Record<string, unknown> = {}) =>
  galleryCategorySchema.parse({
    id: uuid(n),
    name: `Category ${n}`,
    position: n,
    isActive: true,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });

const makeIndex = (overrides: Partial<SearchIndexInput> = {}) =>
  buildSearchIndex({
    packages: [pkg(1)],
    branches: [branch(11)],
    testimonials: [testimonial(21)],
    photos: [photo(31)],
    categories: [category(41)],
    ...overrides,
  });

describe('the index + fields (D8)', () => {
  it('zero query answers [] — the hint line, never browse-all (#302)', () => {
    expect(runSearch(makeIndex(), '')).toEqual([]);
    expect(runSearch(makeIndex(), '   ')).toEqual([]);
  });

  it('filters from the first character — no min-length gate', () => {
    const index = makeIndex({ packages: [pkg(1, { name: 'Graduation Deluxe' })] });
    expect(runSearch(index, 'g')[0]?.hits[0]?.id).toBe(uuid(1));
  });

  it('packages: name + description match; the slug never does (D8 exclusions)', () => {
    const index = makeIndex({
      packages: [
        pkg(1, { name: 'Graduation Deluxe', description: 'Full studio coverage' }),
        pkg(2, { name: 'Standard', description: 'Includes a graduation cap keepsake', slug: 'zeta-hidden-token' }),
      ],
    });
    const ids = runSearch(index, 'graduation')[0]?.hits.map((hit) => hit.id) ?? [];
    expect(ids).toContain(uuid(1));
    expect(ids).toContain(uuid(2));
    expect(runSearch(index, 'hidden-token')).toEqual([]);
  });

  it('branches: name + address match; the phone never does (D8 exclusions)', () => {
    const index = makeIndex({
      branches: [branch(11, { name: 'SM North', address: 'Quezon City avenue', phone: '555-ZX9-PIPE' })],
    });
    expect(runSearch(index, 'north')[0]?.key).toBe('branches');
    expect(runSearch(index, 'quezon')[0]?.key).toBe('branches');
    expect(runSearch(index, 'pipe')).toEqual([]);
  });

  it('testimonials: person (identity) + quote (body)', () => {
    const index = makeIndex({
      testimonials: [testimonial(21, { person: 'Maria Santos', quote: 'Made our debut effortless' })],
    });
    expect(runSearch(index, 'maria')[0]?.key).toBe('testimonials');
    expect(runSearch(index, 'effortless')[0]?.key).toBe('testimonials');
  });

  it('gallery photos: title (identity) + caption (body)', () => {
    const index = makeIndex({ photos: [photo(31, { title: 'Golden hour', caption: 'The aisle walk' })] });
    expect(runSearch(index, 'golden')[0]?.key).toBe('gallery');
    expect(runSearch(index, 'aisle')[0]?.key).toBe('gallery');
  });

  it("the category-name join — a photo matches its category's name however it's captioned (D8)", () => {
    const index = makeIndex({
      photos: [photo(31, { title: 'Sunset pair', caption: 'The couple at dusk', categoryId: uuid(41) })],
      categories: [category(41, { name: 'Graduation' })],
    });
    const [gallery] = runSearch(index, 'graduation');
    expect(gallery?.key).toBe('gallery');
    expect(gallery?.hits[0]?.id).toBe(uuid(31));
  });

  it('the join displayed — gallery secondary is "category · caption", empty parts skipped', () => {
    const index = makeIndex({
      photos: [
        photo(31, { title: 'Sunset pair', caption: 'The couple at dusk', categoryId: uuid(41) }),
        photo(32, { title: 'Morning pair', caption: null, categoryId: uuid(41) }),
        photo(33, { title: 'Uncategorized pair', caption: 'Loose frame', categoryId: null }),
      ],
      categories: [category(41, { name: 'Graduation' })],
    });
    const byId = new Map(
      (runSearch(index, 'pair')[0]?.hits ?? []).map((hit) => [hit.id, hit.secondary])
    );
    expect(byId.get(uuid(31))).toBe('Graduation · The couple at dusk');
    expect(byId.get(uuid(32))).toBe('Graduation');
    expect(byId.get(uuid(33))).toBe('Loose frame');
  });

  it('nullable wire fields never throw — a null-title photo matches by caption, renders an empty identity', () => {
    const index = makeIndex({
      photos: [photo(31, { title: null, caption: 'Beach sunset', categoryId: uuid(41) })],
      categories: [category(41, { name: 'Destinations' })],
    });
    const [gallery] = runSearch(index, 'beach');
    expect(gallery?.hits[0]?.primary).toBe('');
    expect(gallery?.hits[0]?.secondary).toBe('Destinations · Beach sunset');
  });
});

describe('ranking + capping + order (D7/D9)', () => {
  it('identity > body — the pinned weights, an identity match outranks a body match', () => {
    expect(SEARCH_IDENTITY_WEIGHT).toBe(2);
    expect(SEARCH_BODY_WEIGHT).toBe(1);
    const index = makeIndex({
      packages: [
        pkg(1, { name: 'Debut', description: 'A classic studio session' }),
        pkg(2, { name: 'Standard', description: 'Debutantes love this classic package' }),
      ],
    });
    const [packagesGroup] = runSearch(index, 'debut');
    expect(packagesGroup?.key).toBe('packages');
    expect(packagesGroup?.hits[0]?.id).toBe(uuid(1));
    expect(packagesGroup?.hits[1]?.id).toBe(uuid(2));
  });

  it('five per group + the overflow count (D9)', () => {
    expect(SEARCH_GROUP_CAP).toBe(5);
    const index = makeIndex({
      packages: Array.from({ length: 7 }, (_, i) => pkg(10 + i, { name: `Graduation ${i + 1}` })),
    });
    const [group] = runSearch(index, 'graduation');
    expect(group?.hits).toHaveLength(5);
    expect(group?.overflow).toBe(2);
  });

  it('fixed group order — packages, branches, testimonials, gallery; empty groups omitted', () => {
    const index = makeIndex({
      packages: [pkg(1, { name: 'Alpha Pack' })],
      branches: [branch(11, { name: 'Alpha Mall', address: 'Somewhere' })],
      testimonials: [testimonial(21, { person: 'Alpha Santos', quote: 'Wonderful' })],
      photos: [photo(31, { title: 'Alpha Sunrise' })],
    });
    expect(runSearch(index, 'alpha').map((group) => group.key)).toEqual([
      'packages',
      'branches',
      'testimonials',
      'gallery',
    ]);
    expect(runSearch(index, 'mall').map((group) => group.key)).toEqual(['branches']);
  });
});

describe('hits + navigation + states (D9/D10)', () => {
  it('deactivated rows stay findable and are marked', () => {
    const index = makeIndex({
      packages: [pkg(1, { name: 'Debut Classic' }), pkg(2, { name: 'Debut Retired', isActive: false })],
    });
    const hits = runSearch(index, 'debut')[0]?.hits ?? [];
    expect(hits.map((hit) => hit.id)).toEqual([uuid(1), uuid(2)]);
    expect(hits[0]?.deactivated).toBe(false);
    expect(hits[1]?.deactivated).toBe(true);
  });

  it('peso on package rows — priced formats, unpriced stays blank (ADR-0020)', () => {
    const index = makeIndex({
      packages: [
        pkg(1, { name: 'Priced Session', priceCents: 110000 }),
        pkg(2, { name: 'Inquiry Session', priceCents: null }),
      ],
    });
    const byId = new Map(
      (runSearch(index, 'session')[0]?.hits ?? []).map((hit) => [hit.id, hit.price])
    );
    expect(byId.get(uuid(1))).toBe('₱1,100.00');
    expect(byId.get(uuid(2))).toBe('');
  });

  it('gallery rows carry the #287 versioned thumb; every other group carries null', () => {
    const index = makeIndex({
      packages: [pkg(1, { name: 'Alpha' })],
      photos: [photo(31, { title: 'Alpha shot' })],
    });
    const byGroup = new Map(
      runSearch(index, 'alpha').flatMap((group) => group.hits.map((hit) => [hit.group, hit]))
    );
    expect(byGroup.get('gallery')?.thumbUrl).toBe(thumbUrl(photo(31, { title: 'Alpha shot' })));
    expect(byGroup.get('packages')?.thumbUrl).toBeNull();
  });

  it('focusUrlFor — one uniform ?focus=<id> href per group (D10 emit; #316 honors)', () => {
    expect(focusUrlFor('packages', uuid(1))).toBe(`/packages?focus=${uuid(1)}`);
    expect(focusUrlFor('branches', uuid(2))).toBe(`/branches?focus=${uuid(2)}`);
    expect(focusUrlFor('testimonials', uuid(3))).toBe(`/testimonials?focus=${uuid(3)}`);
    expect(focusUrlFor('gallery', uuid(4))).toBe(`/gallery?focus=${uuid(4)}`);
  });

  it('searchDropdownState — hint at zero query, empty at no match, results otherwise', () => {
    expect(searchDropdownState('', [])).toBe('hint');
    expect(searchDropdownState('  ', [])).toBe('hint');
    expect(searchDropdownState('zzz', [])).toBe('empty');
    const stub = [{ key: 'packages' as const, label: 'Packages', hits: [], overflow: 0 }];
    expect(searchDropdownState('zzz', stub)).toBe('results');
  });
});

describe('the copy, verbatim (D5 at #305 + the 2026-11-17 owner rulings)', () => {
  it('hint, overflow tail, Deactivated suffix, group labels — one-sourced, byte-pinned', () => {
    expect(SEARCH_COPY.hint).toBe('Type to search packages, branches, testimonials, gallery');
    expect(SEARCH_COPY.overflow(2, 'Packages')).toBe('+2 more in Packages');
    expect(SEARCH_COPY.deactivated).toBe('Deactivated');
    expect(SEARCH_COPY.groupLabels).toEqual({
      packages: 'Packages',
      branches: 'Branches',
      testimonials: 'Testimonials',
      gallery: 'Gallery',
    });
  });

  it('the no-results line — period INSIDE the closing curly quote (owner-ruled 2026-11-17)', () => {
    expect(SEARCH_COPY.noResults('graduation')).toBe('No results for “graduation.”');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
pnpm --filter @sevendays/admin test -- --run global-search
```

Expected: FAIL — the file fails at collection (`Failed to resolve import "./global-search.js"` — the module does not exist yet, so none of its 19 its run). Record the output in `.superpowers/sdd/2026-11-17-315-global-search-core/task-1-red.txt`.

- [ ] **Step 4: Write the minimal implementation**

New file `apps/admin/src/lib/global-search.ts` — the whole file:

```ts
// The Global Search engine seam (M9 #315, D7/D8): a hand-wired fuse.js
// matcher over the #288-cached admin list arrays — identity fields weigh
// above body fields (weights pinned here, the spec's execution-tuning
// clause), the gallery photos join their category's name client-side (a
// free Map over the separate cached categories query, so "graduation"
// finds graduation photos however they're captioned), and results group
// under the four fixed headers capped at 5 with the "+N more" tail. cmdk's
// built-in filter cannot serve the inline-dropdown posture (it only
// filters items driven by its own Command.Input inside its tree, and the
// dropdown types into the topbar, outside it) — matching lives HERE and
// only here; the component's cmdk tree runs shouldFilter={false} as the
// headless listbox core. Every customer-visible string is one-sourced in
// SEARCH_COPY (D5's ratified table + the 2026-11-17 owner rulings). No
// React — the component composes this; the plain-node suite pins it.
import type {
  BranchRead,
  GalleryCategory,
  GalleryPhoto,
  ServicePackageRead,
  Testimonial,
} from '@sevendays/types';
import Fuse from 'fuse.js';
import { thumbUrl } from './gallery-thumbs';
import { peso } from './peso';

export type SearchGroupKey = 'packages' | 'branches' | 'testimonials' | 'gallery';

/** The ruled cap (D9): 5 per group; the rest answer as the overflow count. */
export const SEARCH_GROUP_CAP = 5;

/** The identity weight (names, persons, titles) — pinned, identity > body (#302). */
export const SEARCH_IDENTITY_WEIGHT = 2;

/** The body weight (descriptions, addresses, quotes, captions, the joined category name). */
export const SEARCH_BODY_WEIGHT = 1;

const FUSE_THRESHOLD = 0.3;

// D5's ratified copy table (one source; the component imports, never
// re-declares). The no-results period sits INSIDE the closing curly quote
// and the group labels are the ruled four — both owner-ruled, byte-pinned
// by the suite.
export const SEARCH_COPY = {
  hint: 'Type to search packages, branches, testimonials, gallery',
  noResults: (query: string) => `No results for “${query}.”`,
  overflow: (n: number, label: string) => `+${n} more in ${label}`,
  deactivated: 'Deactivated',
  groupLabels: {
    packages: 'Packages',
    branches: 'Branches',
    testimonials: 'Testimonials',
    gallery: 'Gallery',
  } satisfies Record<SearchGroupKey, string>,
} as const;

// Where a result lands (D10): the entity's list screen with the uniform
// ?focus=<id> param. THIS seam emits the href; #316's landing honors it
// (scroll into view + highlight) — nothing here reads or registers params.
const GROUP_ROUTES: Record<SearchGroupKey, string> = {
  packages: '/packages',
  branches: '/branches',
  testimonials: '/testimonials',
  gallery: '/gallery',
};

export function focusUrlFor(group: SearchGroupKey, id: string): string {
  return `${GROUP_ROUTES[group]}?focus=${id}`;
}

/** One rendered result row — everything the item anatomy needs (D9). */
export interface SearchHit {
  id: string;
  group: SearchGroupKey;
  /** Identity field — the primary line. */
  primary: string;
  /** Body field — the one-line secondary snippet ('' when none). */
  secondary: string;
  deactivated: boolean;
  /** Packages only — the peso-formatted price ('' when unpriced, ADR-0020). */
  price: string;
  /** Gallery only — the #287 versioned thumb URL; null elsewhere. */
  thumbUrl: string | null;
  focusUrl: string;
}

/** One group's capped slice + the "+N more" count. */
export interface SearchGroup {
  key: SearchGroupKey;
  label: string;
  hits: SearchHit[];
  overflow: number;
}

export type SearchDropdownState = 'hint' | 'empty' | 'results';

/** Zero query = the hint line, never browse-all (#302); no match = the muted line. */
export function searchDropdownState(
  query: string,
  groups: SearchGroup[]
): SearchDropdownState {
  if (query.trim() === '') return 'hint';
  return groups.length === 0 ? 'empty' : 'results';
}

/** The gallery photo with its category name joined (D8): body-weight search field + display half of the secondary line. */
export interface IndexedPhoto extends GalleryPhoto {
  categoryName: string;
}

export interface SearchIndex {
  packages: Fuse<ServicePackageRead>;
  branches: Fuse<BranchRead>;
  testimonials: Fuse<Testimonial>;
  photos: Fuse<IndexedPhoto>;
}

export interface SearchIndexInput {
  packages: ServicePackageRead[];
  branches: BranchRead[];
  testimonials: Testimonial[];
  photos: GalleryPhoto[];
  categories: GalleryCategory[];
}

const toPackageHit = (row: ServicePackageRead): SearchHit => ({
  id: row.id,
  group: 'packages',
  primary: row.name,
  secondary: row.description,
  deactivated: !row.isActive,
  price: peso(row.priceCents) ?? '',
  thumbUrl: null,
  focusUrl: focusUrlFor('packages', row.id),
});

const toBranchHit = (row: BranchRead): SearchHit => ({
  id: row.id,
  group: 'branches',
  primary: row.name,
  secondary: row.address,
  deactivated: !row.isActive,
  price: '',
  thumbUrl: null,
  focusUrl: focusUrlFor('branches', row.id),
});

const toTestimonialHit = (row: Testimonial): SearchHit => ({
  id: row.id,
  group: 'testimonials',
  primary: row.person,
  secondary: row.quote,
  deactivated: !row.isActive,
  price: '',
  thumbUrl: null,
  focusUrl: focusUrlFor('testimonials', row.id),
});

const toPhotoHit = (row: IndexedPhoto): SearchHit => ({
  id: row.id,
  group: 'gallery',
  // Null titles are the wire's truth: an empty identity renders honestly
  // (the secondary line carries the match); a photo null in every indexed
  // field simply matches nothing.
  primary: row.title ?? '',
  secondary: [row.categoryName, row.caption ?? ''].filter((part) => part !== '').join(' · '),
  deactivated: !row.isActive,
  price: '',
  thumbUrl: thumbUrl(row),
  focusUrl: focusUrlFor('gallery', row.id),
});

/**
 * Builds the four per-entity Fuse indexes over cached-shaped arrays (D8 —
 * the exact shapes the #288 factories deliver, deactivated rows included).
 * The category join is a free client-side Map: a missing or null
 * categoryId joins to '' (uncategorized photos search their own fields
 * only). Excluded everywhere: slugs, branch phone, frames/inclusions —
 * system identifiers and junction data, not search surface.
 */
export function buildSearchIndex(input: SearchIndexInput): SearchIndex {
  const categoriesById = new Map(input.categories.map((row) => [row.id, row.name]));
  const photos: IndexedPhoto[] = input.photos.map((row) => ({
    ...row,
    categoryName:
      (row.categoryId !== null ? categoriesById.get(row.categoryId) : undefined) ?? '',
  }));

  return {
    packages: new Fuse(input.packages, {
      keys: [
        { name: 'name', weight: SEARCH_IDENTITY_WEIGHT },
        { name: 'description', weight: SEARCH_BODY_WEIGHT },
      ],
      threshold: FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    }),
    branches: new Fuse(input.branches, {
      keys: [
        { name: 'name', weight: SEARCH_IDENTITY_WEIGHT },
        { name: 'address', weight: SEARCH_BODY_WEIGHT },
      ],
      threshold: FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    }),
    testimonials: new Fuse(input.testimonials, {
      keys: [
        { name: 'person', weight: SEARCH_IDENTITY_WEIGHT },
        { name: 'quote', weight: SEARCH_BODY_WEIGHT },
      ],
      threshold: FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    }),
    photos: new Fuse(photos, {
      keys: [
        { name: 'title', weight: SEARCH_IDENTITY_WEIGHT },
        { name: 'caption', weight: SEARCH_BODY_WEIGHT },
        { name: 'categoryName', weight: SEARCH_BODY_WEIGHT },
      ],
      threshold: FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    }),
  };
}

/**
 * One pass over the index: relevance-ordered per group (fuse's weighted
 * score), capped at SEARCH_GROUP_CAP with the remainder as overflow, the
 * four groups in FIXED order with empty groups omitted. Zero query answers
 * [] — the hint line, never browse-all.
 */
export function runSearch(index: SearchIndex, query: string): SearchGroup[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];

  const cap = (hits: SearchHit[]): Pick<SearchGroup, 'hits' | 'overflow'> =>
    hits.length > SEARCH_GROUP_CAP
      ? { hits: hits.slice(0, SEARCH_GROUP_CAP), overflow: hits.length - SEARCH_GROUP_CAP }
      : { hits, overflow: 0 };

  const groups: SearchGroup[] = [];
  const packagesCapped = cap(index.packages.search(needle).map((entry) => toPackageHit(entry.item)));
  if (packagesCapped.hits.length > 0)
    groups.push({ key: 'packages', label: SEARCH_COPY.groupLabels.packages, ...packagesCapped });
  const branchesCapped = cap(index.branches.search(needle).map((entry) => toBranchHit(entry.item)));
  if (branchesCapped.hits.length > 0)
    groups.push({ key: 'branches', label: SEARCH_COPY.groupLabels.branches, ...branchesCapped });
  const testimonialsCapped = cap(
    index.testimonials.search(needle).map((entry) => toTestimonialHit(entry.item))
  );
  if (testimonialsCapped.hits.length > 0)
    groups.push({
      key: 'testimonials',
      label: SEARCH_COPY.groupLabels.testimonials,
      ...testimonialsCapped,
    });
  const photosCapped = cap(index.photos.search(needle).map((entry) => toPhotoHit(entry.item)));
  if (photosCapped.hits.length > 0)
    groups.push({ key: 'gallery', label: SEARCH_COPY.groupLabels.gallery, ...photosCapped });
  return groups;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pnpm --filter @sevendays/admin test -- --run
```

Expected: PASS — the full admin suite runs (admin's `test` script is bare `vitest run`, so the full-suite floor IS the verification): **Test Files 32 passed (32) · Tests 344 passed (344)** (the 325 baseline + the 19 new its).

- [ ] **Step 6: Lint, format, typecheck**

```bash
pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/admin typecheck
```

Expected: both green (accept `fix`'s rewrites — import order especially; re-run the suite from Step 5 if it rewrote anything).

- [ ] **Step 7: Commit**

```bash
git add apps/admin/package.json pnpm-lock.yaml apps/admin/src/lib/global-search.ts apps/admin/src/lib/global-search.test.ts
git commit -m "feat(admin): the Global Search engine seam - fuse.js index + the cmdk/fuse.js deps (#315)"
```

### Task 2: The GlobalSearch dropdown — Variant B ported, live in the topbar

The composition: the prototype's `variant-b-dropdown.tsx` + `search-results-body.tsx` ported to production seams — the Task 1 lib for matching/copy/focus hrefs, the #288 factories over `useQueries` for the index source, `useDeferredValue` for typing responsiveness, the ⌘K/Ctrl+K rule, and the keyboard bridge onto the cmdk root. The prototype's narrow form (the `sm:hidden` `Command.Input` + the magnifier button) is **deliberately NOT ported** — #316 owns it; below `sm` this ticket renders only the hidden-by-house-law Input.

**Files:**
- New: `apps/admin/src/components/global-search.tsx`
- Modify: `apps/admin/src/components/admin-topbar.tsx` (whole-file replace — the header comment + the Input mount)

**Interfaces:**
- Consumes: `buildSearchIndex`, `runSearch`, `searchDropdownState`, `SEARCH_COPY`, `type SearchHit` (Task 1, `#/lib/global-search`); `adminPackageQueries` + `adminBranchQueries` + `adminTestimonialQueries` + `adminGalleryQueries` (on disk, unchanged — `#/lib/cms-queries`); `Popover`/`PopoverTrigger`/`PopoverContent` (`@sevendays/ui/components/popover`), `Input` (`@sevendays/ui/components/input`); `Command` from `cmdk` (1.1.1 — `Command.List`/`Command.Group`/`Command.Item` hang off it); `useQueries` (`@tanstack/react-query`), `useNavigate` (`@tanstack/react-router`), `useDeferredValue` (react).
- Produces: `GlobalSearch` — the topbar's search mount; nothing else consumes it.

**Not here:** the below-sm magnifier + sheet (#316 — `sm:hidden` never appears in this file); the `?focus=` landing / `validateSearch` / any route edit (#316); any mutation, prefetch, polling, or new query key (the index law); cmdk's `Command.Input`/`Command.Dialog`/`defaultFilter` (the palette machinery died with variant A; `shouldFilter={false}` is the only cmdk filter posture here); browse-all (the sidebar navigates); clearing the query on selection (the query persists by ruling); edits to `packages/ui` (the popover + input primitives are consumed as installed); the Notification or any other topbar member (byte-identical neighbors).

- [ ] **Step 1: Load the UI/UX skill set**

Per AGENTS.md and the ticket's Execution notes: `prototype` + `ui-ux-pro-max`, plus `ui-styling`, `tanstack-query-best-practices`, and `dark-mode-design`. The render is pinned below — the skills inform judgment (the dropdown's elevation/contrast legs, the roving highlight's theme read, the deferred typing feel), not re-composition.

- [ ] **Step 2: New file `apps/admin/src/components/global-search.tsx`** — the whole file:

```tsx
// The Global Search dropdown (M9 #315, glossary — never "command palette" /
// "omnibar" / "quick find"): the topbar Input IS the typing surface; results
// drop from it in a non-modal anchored popover, the page visible around them
// — searching never blanks the working context. The engine is the hand-wired
// lib seam (#/lib/global-search, D7: fuse.js, identity > body — cmdk's
// built-in filter CANNOT serve this posture, it only filters items driven by
// its own Command.Input inside its tree, and this posture types into the
// topbar, outside it); cmdk runs here as the headless listbox core
// (shouldFilter={false}) for keyboard roving + selection only. The index
// builds over useQueries on the five unchanged #288 factories at topbar
// (= shell) scope: same keys as the screens, full arrays with deactivated
// rows included, freshness inherited from the seam's own contracts — zero
// new fetch machinery. useDeferredValue keeps typing responsive; selection
// navigates via the seam's ?focus= href (the landing — scroll + highlight —
// is #316's). Below sm the Input stays hidden by the house law; the narrow
// form (magnifier + sheet) is #316's, not this ticket's. Posture + anatomy
// ported from prototype/search-ux-variants variant B (#303's ruled pick) —
// values and rulings, never the branch. The kbd chip's GLYPH is
// platform-picked (⌘K on Apple, Ctrl K elsewhere — owner-ruled 2026-11-17);
// the shortcut BINDING never sniffs: ⌘K and Ctrl+K, one rule (D6).
import { Input } from '@sevendays/ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@sevendays/ui/components/popover';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Command } from 'cmdk';
import type { LucideIcon } from 'lucide-react';
import { ImageIcon, MapPin, Package, Quote } from 'lucide-react';
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
  searchDropdownState,
  type SearchHit,
} from '#/lib/global-search';

/** The roving/selection keys forwarded into the cmdk tree by the bridge below. */
const ROVING_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter']);

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
  // The index source (D8): the #288 factories, UNCHANGED — useQueries reads
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
  // mounted-gated so SSR markup and the first client render agree — no
  // hydration mismatch, the chip fills after mount.
  const [kbdGlyph, setKbdGlyph] = useState('');
  useEffect(() => {
    setKbdGlyph(/mac|iphone|ipad|ipod/i.test(navigator.platform) ? '⌘K' : 'Ctrl K');
  }, []);

  // ⌘K and Ctrl+K, ONE rule — no platform sniffing on the binding (D6):
  // both focus the Input and open the dropdown.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // The keyboard bridge: focus lives in the topbar Input, OUTSIDE the cmdk
  // tree (cmdk 1.1.1 handles keys via onKeyDown on its root div — dist-
  // verified), so the roving/selection keys are re-dispatched onto the
  // Command root, where cmdk's own roving + selection take over. Escape
  // closes deterministically — in this posture focus never enters the
  // content, so the popover's own Escape arm cannot be relied on.
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
  // (the landing — scroll + highlight — is #316's). The query persists:
  // reopening resumes where the eye was; nothing is cleared.
  const land = (hit: SearchHit) => {
    setOpen(false);
    void navigate({ href: hit.focusUrl });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* The trigger is a passive anchor div wrapping the Input (Base UI has
          no Popover.Anchor part): the Input's clicks stop propagation so the
          typing surface never toggle-closes its own dropdown; focus and
          typing open it. Below sm the Input stays hidden (the house law) —
          the narrow form is #316's. */}
      <PopoverTrigger render={<div className='flex min-w-0 items-center gap-1' />}>
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
      </PopoverTrigger>
      <PopoverContent
        align='start'
        sideOffset={8}
        className='w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0'
      >
        {/* cmdk as the headless listbox core ONLY (D7): shouldFilter={false}
            — matching is the lib seam's; roving + selection are cmdk's. */}
        <Command ref={commandRef} shouldFilter={false} className='flex flex-col'>
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
                    <SearchResultItem key={hit.id} hit={hit} onSelect={land} />
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
        </Command>
      </PopoverContent>
    </Popover>
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
        // The muted thumb slot — the #287 versioned thumb renders into it
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

- [ ] **Step 3: The topbar mount**

Replace `apps/admin/src/components/admin-topbar.tsx` whole:

```tsx
// Admin-local Tier 2 (spec #94): the sticky top bar — sidebar collapse
// trigger, search, notifications (#59 variant A). The bell is live since
// M9 #314: the Notification, a derived view over the pending-submissions
// queue (ADR-0028). The Input is live since M9 #315: Global Search — the
// typing surface of the inline dropdown (fuse.js engine seam + cmdk
// headless); the IA is unchanged.

import { Separator } from '@sevendays/ui/components/separator';
import { SidebarTrigger } from '@sevendays/ui/components/sidebar';
import { ThemeToggle } from '@sevendays/ui/components/theme-toggle';
import { GlobalSearch } from '#/components/global-search';
import { Notification } from '#/components/notification';

export function AdminTopbar() {
  return (
    <header className='bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur'>
      <SidebarTrigger />
      <Separator orientation='vertical' className='h-4' />
      <GlobalSearch />
      <Notification />
      <ThemeToggle />
    </header>
  );
}
```

(The old inert `Input` import dies with the raw mount — `GlobalSearch` owns the Input, its `w-56`, and the ⌘K chip; the right-cluster layout is byte-identical: the Notification's trigger still carries `relative ml-auto` internally.)

- [ ] **Step 4: Grep gates — the AC laws are present, the fences hold**

```bash
grep -c "shouldFilter={false}" apps/admin/src/components/global-search.tsx
grep -c "metaKey || event.ctrlKey" apps/admin/src/components/global-search.tsx
grep -c "navigator.platform" apps/admin/src/components/global-search.tsx
grep -c "useDeferredValue" apps/admin/src/components/global-search.tsx
grep -c "new KeyboardEvent" apps/admin/src/components/global-search.tsx
grep -c "sm:hidden" apps/admin/src/components/global-search.tsx
grep -c "CommandDialog\|CommandInput\|defaultFilter\|refetchInterval\|prefetch" apps/admin/src/components/global-search.tsx
grep -n "SEARCH_COPY\." apps/admin/src/components/global-search.tsx
grep -c "adminPackageQueries.all()\|adminBranchQueries.all()\|adminTestimonialQueries.all()\|adminGalleryQueries.photos()\|adminGalleryQueries.categories()" apps/admin/src/components/global-search.tsx
```

Expected: `3` (the prop on `<Command>` once — line 181 in the pinned block — plus the two pinned comment mentions; the count includes prose, the SUBSTANTIVE gate is the single `Command ref={commandRef} shouldFilter` form); `1` (the ONE binding rule, no platform sniffing); `1` (the glyph-only sniff, mounted-gated); `3` (the import + the call + the header comment's prose mention); `1` (the keyboard bridge); **`0`** (the narrow form is #316's — a nonzero count is a fence break, stop and report); **`0`** (no palette machinery, no polling, no prefetch — a nonzero count is a re-ruling, stop and report); the copy greps show every customer-visible string routed through `SEARCH_COPY` (hint, noResults, overflow, deactivated — four distinct member accesses; `groupLabels` arrives via the seam's groups); `5` (the five unchanged #288 factories — the index law). Save as `.superpowers/sdd/2026-11-17-315-global-search-core/task-2-grep.txt`. (2026-11-17 execution note: the original `1`/`2` expectations miscounted the pinned comment blocks — corrected here, the substantive forms verified live by the controller.)

- [ ] **Step 5: Lint, format, test, typecheck, build**

```bash
pnpm --filter @sevendays/admin fix
pnpm --filter @sevendays/admin test -- --run
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin build
```

Expected: all green; the suite stays at **Test Files 32 passed (32) · Tests 344 passed (344)** (no suite change in this task); the build succeeds with `global-search.tsx` entering every route's graph via the topbar (the #218 execution ruling).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/components/global-search.tsx apps/admin/src/components/admin-topbar.tsx
git commit -m "feat(admin): the Global Search dropdown - Variant B ported, live in the topbar (#315)"
```

### Task 3: Gates, the owner's as-built variants reaction, the live walkthrough, docs rotation, PR, the v1 pick, issues, graphify

**Files:**
- Modify: `docs/progress.md` (one dated entry, newest first), `AGENTS.md` (two pinned find/replace edits), `docs/plan.md` (the SECOND M9 checkbox), this plan file (ticked boxes)
- Post-merge on main: `docs/agents/v1-picks.md` (one ledger row), `graphify-out/` (the graph update)

**Interfaces:** consumes the three code commits (Tasks 1–2); produces nothing code-facing.

**Not here:** any code change (a defect found by Step 2 or Step 3 goes back to its owning task's file with its own `fix(admin): … (#315)` commit, then this task re-runs from Step 1); #316's M9 roadmap box and #317's (never tick them here); `docs/plan.md` beyond the one checkbox; the milestone exit-gate walkthrough (#317's live-stack ceremony — Task 3's walkthrough is this ticket's own verification, not the milestone's); any mutation of dev-DB data (the admin `.env.local` DB is the LIVE pooler — this ticket's verification is read-only: navigation + search).

- [ ] **Step 1: The full check + the soft-ceiling gates**

```bash
pnpm check
git diff --stat main...HEAD -- apps/api apps/landing packages/
git diff main...HEAD -- apps/admin/package.json
```

Expected: `pnpm check` green across the repo; the first diff-stat **empty** (D11 proven — zero api/landing/packages changes); the package.json diff shows exactly the two added dependency lines (`cmdk`, `fuse.js`). Floors after this ticket: admin **32 files / 344 tests**; every other suite unchanged from AGENTS.md's recorded floors.

- [ ] **Step 2: The owner's as-built variants reaction (BLOCKING — the #94 amendment)**

The #94 amendment's round for this ticket: the as-built production render, both themes, light judged first. Mechanics: bring up the dev stack (`pnpm --filter @sevendays/api dev` + `pnpm --filter @sevendays/admin dev` — serial note: never admin + landing together, both pin `:3000`); capture with a throwaway HEADLESS Playwright script kept OUTSIDE the repo (scripted sign-in with the controller's dev staff account — the owner's local credentials, never written to the evidence dir, never committed). The states, light first, then the dark counterparts via the topbar's theme toggle: (1) Ctrl+K from an unrelated screen — focused Input, open dropdown, the zero-query hint line, the `Ctrl K` chip; (2) a cross-group query over the live catalog — the four fixed group headers in order, item anatomy visible (muted icons, snippets, peso on package rows, gallery thumbs in the muted slot); (3) a roving capture — ArrowDown twice, the `data-selected` highlight visible; (4) the no-results line for a gibberish query; (5) the overflow tail + the `Deactivated` suffix ONLY if the live catalog yields them (5+ same-keyword rows / a deactivated match) — if not, note their absence on the post (both are suite-pinned: the cap/overflow law and the deactivated marking; never mutate the live DB for a capture). Post the captures to #315 (`gh issue comment 315`) with the question: **the as-built Global Search dropdown in both themes — accept as-rendered, or findings?** Then **BLOCK on the owner's answer** (the wait-for-owner rule — never assume while the owner may be AFK). Disposition per the house pattern: accept → proceed; findings → fix-batch commits on this branch (or follow-up issues if ruled out of scope), re-capture, re-ask. Record the verdict in `.superpowers/sdd/2026-11-17-315-global-search-core/variants-verdict.md`.

- [ ] **Step 3: The live walkthrough (the headed go-gate, evidence for the PR)**

**Announce first, wait for the owner's "go" before firing any headed-browser login** (the #310 census rule — the timer flow ends "ready — say go", never auto-fires). With the go: drive a HEADED browser over the dev stack (read-only — no data mutations). Walk, in order, capturing each numbered state to the evidence dir (light first, then dark via the topbar toggle):

1. From `/` (an unrelated screen): press Ctrl+K — the Input focuses and the dropdown opens on the hint line `Type to search packages, branches, testimonials, gallery`; the chip reads `Ctrl K` (this Linux box); the page stays visible around the popover (non-modal — no overlay).
2. Type one character — results already filter (no min-length gate); keep typing a longer word over the full catalog — typing never stutters (`useDeferredValue`).
3. The join: search a live gallery category's name — gallery photos surface however they're captioned, secondaries reading `category · caption`, thumbs rendering (the #287 URLs — devtools network shows the versioned `?v=` fetches).
4. Anatomy: the four fixed headers in order (Packages / Branches / Testimonials / Gallery — only groups with matches render); peso on package rows (unpriced rows blank, ADR-0020); a deactivated match carries the visible `Deactivated` suffix (if the live catalog holds none, note it — the marking is suite-pinned; do not invent rows).
5. The keyboard model — THE bridge's live proof: ArrowDown/ArrowUp rove (the highlighted row moves — cmdk's `data-selected`); Enter on a package → lands on `/packages` with **`?focus=<uuid>` in the URL** (no scroll/highlight yet — that is #316's landing; and no editor auto-opened). Repeat Enter from another group (gallery → `/gallery?focus=…`).
6. Escape closes the dropdown; the Input keeps its query; Ctrl+K reopens on the same results.
7. No-results: a gibberish query renders the muted `No results for “{q}.”` — period inside the closing quote.
8. The binding rule: on this box only Ctrl K is physically assertable — note on the walkthrough that ⌘K rides the same single code path (`(event.metaKey || event.ctrlKey)`), no platform branch exists to walk.

Then dark theme: repeat 1-5 (the roving accent, the muted hierarchy, chip + thumbs in dark — the #217 law). Write `walkthrough.md` narrating each state's observed outcome. Any deviation is a defect — fix it in the owning task's file, re-run that task's gates, commit `fix(admin): … (#315)`, and restart this task from Step 1. If the keyboard bridge itself fails live (arrows dead), apply the named repair from the recon note — a plain roving-state fallback inside `global-search.tsx` — as a `fix(admin): …` commit and re-walk Step 5.

- [ ] **Step 4: `docs/progress.md` — the dated entry (newest first, pinned)**

Insert as the first entry under `# Progress` (replace `2026-11-XX` with the docs commit's date):

```markdown
- **2026-11-XX — M9 ticket 2, Global Search core (#315) — build complete on `feat/315-global-search`, PR pending.** The admin topbar's inert search Input is live as Global Search's typing surface: an inline non-modal dropdown (anchored `align='start'` + `sideOffset=8`, the ruled width law `w-[min(24rem,calc(100vw-1.5rem))]`, no footer chrome) where ⌘K and Ctrl+K — one binding rule, no platform sniffing; the kbd chip's glyph alone is platform-picked (`⌘K` on Apple, `Ctrl K` elsewhere, owner-ruled 2026-11-17, mounted-gated against hydration mismatch) — focus + open, and filtering starts at the first character over a hand-wired fuse.js seam (the new `global-search.ts`: identity 2× / body 1× weights pinned as constants, threshold 0.3 + `ignoreLocation`, the gallery photos joined to their category's name at body weight so "graduation" finds graduation photos however captioned, null title/caption/category honestly coalesced), with cmdk as the headless listbox core (`shouldFilter={false}`) for roving + selection only — the keyboard bridge re-dispatches arrows/Enter/Home/End from the topbar Input onto the cmdk root (focus lives outside the popover portal; the mechanism dist-verified at plan time and asserted live in the walkthrough), Escape closes deterministically. The index builds from the five unchanged #288 factories over `useQueries` at topbar scope — full arrays, deactivated rows findable + marked with the visible `Deactivated` suffix, zero new fetch machinery; four fixed group headers capped at 5 with the `+N more in {group}` tail; the ratified item anatomy (muted entity icons, identity line + suffix, one-line snippet — gallery `category · caption`, peso on package rows with unpriced blank, the #287 versioned thumb in the muted slot); selection navigates via the seam's `?focus=` href through `navigate({ href })` (href navigation spike-verified at plan time; the landing — scroll + highlight — is #316's). All copy one-sourced in `SEARCH_COPY` (D5's table + the two 2026-11-17 rulings — the no-results period sits inside the closing curly quote). Admin-only; the one manifest change is the two ruled deps (`cmdk@^1.1.1` + `fuse.js@^7.5.0`); zero api/types/landing/db/ui changes (the D11 soft ceiling proven by the diff); admin floor 32 files / 344 tests (+19 global-search seam its).
```

- [ ] **Step 5: `AGENTS.md` + `docs/plan.md` — the pinned edits**

(a) In *Current status of `pnpm test`*, replace the admin floor head (occurs once — verified at plan time):

```text
admin floor 31 files / 325 tests (
```

with:

```text
admin floor 32 files / 344 tests (
```

and its tail (occurs once — verified at plan time):

```text
— and the two tab-param pins). The api and landing suites remain the behavioral backbones.
```

with:

```text
— and the two tab-param pins; + #315's nineteen global-search seam pins — the D8 index fields + the category-name join (matched + displayed), the identity > body ranking on the pinned weights, the cap-5 + overflow tail, the fixed group order, the deactivated marking, the peso/thumb/focusUrl hit anatomy, the zero-query/no-results state selection — and the D5 copy pins). The api and landing suites remain the behavioral backbones.
```

(b) In the Engineering Rules status paragraph, append one sentence after the Notification run (the anchor occurs once — verified at plan time):

```text
and `Open Submissions` deep-links `?tab=submissions` (the testimonials tab now URL-driven).
```

becomes:

```text
and `Open Submissions` deep-links `?tab=submissions` (the testimonials tab now URL-driven). Global Search is live (M9 #315): the topbar Input is the typing surface of an inline dropdown — ⌘K/Ctrl+K bound as one rule (the kbd chip's glyph alone is platform-picked), a hand-wired fuse.js seam (identity > body, weights pinned as constants) with cmdk as the headless listbox core (`shouldFilter={false}`, keyboard bridged onto its root from the topbar Input), the index over the #288-cached five list queries at topbar scope (the gallery category-name join included; deactivated rows findable + marked), four fixed groups capped 5 + the `+N more` tail, and selection navigating via the seam's `?focus=` href (the landing is #316's).
```

(c) In `docs/plan.md`'s M9 section, tick ONLY this ticket's box — replace:

```text
- [ ] Admin — Global Search, the dropdown: the topbar Input as the typing surface (⌘K/Ctrl+K focuses + opens; non-modal anchored popover; no footer chrome) over the hand-wired engine seam — fuse.js (identity > body weighting) with cmdk as the headless listbox core (`shouldFilter={false}`), `cmdk` + `fuse.js` as admin-local deps; the index built from the #288-cached list queries (packages, branches, testimonials, gallery + the category-name join; deactivated rows included); four fixed group headers capped at 5 + the "+N more" tail, zero-query hint line, muted no-results line; the ratified item anatomy (entity icons, peso on packages — unpriced blank, the gallery thumb slot on #287 versioned thumbs)
```

with the same line ticked:

```text
- [✅] Admin — Global Search, the dropdown: the topbar Input as the typing surface (⌘K/Ctrl+K focuses + opens; non-modal anchored popover; no footer chrome) over the hand-wired engine seam — fuse.js (identity > body weighting) with cmdk as the headless listbox core (`shouldFilter={false}`), `cmdk` + `fuse.js` as admin-local deps; the index built from the #288-cached list queries (packages, branches, testimonials, gallery + the category-name join; deactivated rows included); four fixed group headers capped at 5 + the "+N more" tail, zero-query hint line, muted no-results line; the ratified item anatomy (entity icons, peso on packages — unpriced blank, the gallery thumb slot on #287 versioned thumbs)
```

(The narrow-form box and the Verify box stay unticked — they are #316/#317's deliverables; #315 never ticks them.)

- [ ] **Step 6: The docs commit**

Tick this plan's executed boxes (`- [✅]`), then:

```bash
git add docs/progress.md AGENTS.md docs/plan.md docs/superpowers/plans/2026-11-17-315-global-search-core.md
git commit -m "docs(m9): #315 lands the Global Search core - progress, AGENTS floor, the M9 roadmap tick (#315)"
```

- [ ] **Step 7: PR + squash merge**

Push `feat/315-global-search`; open the PR against main titled `M9: Global Search core — the fuse.js engine seam + the inline dropdown (#315)`; body: the fourteen ACs each answered with its evidence pointer — the inline dropdown posture + width law + no footer (walkthrough state 1 + the component's pinned classes), ⌘K/Ctrl+K one rule (states 1 + 8 + the task-2 grep's single `metaKey || event.ctrlKey`), hint/first-character/no-results/no-browse-all (states 1-2, 7 + the state-selection its), the hand-wired engine + `shouldFilter={false}` + `useDeferredValue` (Task 1's seam + state 2), the index over the #288 queries + the join (state 3 + the five-factory grep), four headers + cap/tail (Task 1 its + state 4 if staged), item anatomy incl. peso blank + thumbs (state 4 + the hit its), the full keyboard model (state 5 — the bridge's live proof), deactivated findable + identity > body (Task 1 its + state 4), the `?focus=` emit (state 5 URLs + `focusUrlFor` its), the deps admin-local + zero packages/* changes (Step 1's gates + the package.json diff), the lib-seam suite (+19 its, floor 32/344), the owner reaction (Step 2's verdict), `pnpm check` green + docs updated + the v1-pick triaged (Step 8). Squash-merge.

- [ ] **Step 8: The v1 pick (per `docs/agents/v1-picks.md`)**

Run the path pass on the squash SHA:

```bash
node scripts/v1-triage.mjs <main-sha>
```

Expected: admin-only and additive — the ticket's expected **`PICK clean`**, with the two new admin-local deps riding the pick (the spec's v1-pick posture names them). The classifier's output is the truth over this expectation (the #237 precedent). If the classifier rules SPLIT (the mechanical norm for admin-only tickets whose docs are main-only — the plan file, `docs/progress.md`, `docs/plan.md` drop main-only; the `AGENTS.md` floor hunk rides the content pass), execute per the runbook's § Executing a PICK or § Executing a SPLIT as ruled, run § The locks (`pnpm check` + `pnpm build` green, the export audit exit 0), push, CI green. Append the ledger row on main, filling every bracketed value from the actual run:

```text
| <merge date> | #<PR> | `<main-sha>` | <pick\|split> | `<v1-sha or n/a>` | #315 — M9 ticket 2, Global Search core: the fuse.js engine seam + the inline dropdown (cmdk headless) — buildSearchIndex with the gallery category-name join, runSearch (identity 2×/body 1× pinned, cap 5 + overflow, fixed order), focusUrlFor + searchDropdownState + SEARCH_COPY, global-search.tsx in the topbar (⌘K/Ctrl+K one rule, keyboard bridge, useDeferredValue); cmdk@^1.1.1 + fuse.js@^7.5.0 admin-local. <PICK/SPLIT per classifier — the two admin-local deps ride>. Locks: <check/build/audit results>; run <run-id> green |
```

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #<PR> ledger row - the #315 Global Search core pick"
```

- [ ] **Step 9: Issue closes + graphify**

Tick #315's fourteen AC boxes in its body, then close it with the AC → evidence mapping:

```bash
gh issue view 315 --json body --jq .Body | sed 's/^- \[ \]/- [✅]/' > /tmp/315-body.md
gh issue edit 315 --body-file /tmp/315-body.md
gh issue close 315 --comment "Landed in #<PR> (main <main-sha>, v1 <pick-sha-or-n/a>). The inline dropdown is live: ⌘K/Ctrl+K one binding rule (the chip's glyph platform-picked per the 2026-11-17 ruling), the hint at zero query, filtering from the first character, the muted no-results line (period inside, as ruled), no browse-all; the engine is the hand-wired seam — fuse.js identity 2×/body 1× pinned, cmdk `shouldFilter={false}` for roving + selection only, `useDeferredValue` (walkthrough states 1-2, 7-8 + the 19 seam its); the index rides the five unchanged #288 factories over useQueries at topbar scope with the category-name join, deactivated rows findable + marked, zero new fetches (state 3-4 + the five-factory grep); four fixed groups capped 5 + the tail; the ratified anatomy with peso-blank-unpriced + #287 thumbs; the full keyboard model proven live through the bridge (state 5); selection emits the `?focus=` href — the landing is #316's (state 5 URLs); cmdk + fuse.js landed admin-local, zero packages/api/schema/types/api-client changes — the soft ceiling diff is empty; admin floor 32 files / 344 tests; the owner reacted to the as-built renders both themes (Step 2 verdict)."
```

Then the graph (on main, after the ledger commit):

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#315 graph update"
```

(The M9 frontier after this ticket: #316 is next (`ready-for-agent`); #317 unblocks when #316 lands.)
