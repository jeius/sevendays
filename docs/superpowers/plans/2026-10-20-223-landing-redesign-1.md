# M7 Ticket 12 — The Landing Redesign I: Chrome, Home, States, Settings Consumption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Tasks 2, 3, and 4 are UI-bearing and load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule, spec #94 amendment): Task 2 composes the glass chrome + the banner + the global NotFound/Error, Task 3 the ruled home composition (mosaic, D2 plates, marquee/stepper, paginated testimonials, the skeleton grammar), Task 4 the whole-page empty states. **Task 5 renders the round for owner reaction in BOTH themes (light judged first) — the ticket's fourth AC — and is the only controller interaction inside the build**; everything else runs to the gates.

**Goal:** Build the landing redesign's first half on the #164-ruled direction — *"the proof is the page"* (ticket #223, spec § *The landing redesign*, mined from the throwaway prototype branch `prototype/164-landing-redesign` @ `b050334` per the M3 precedent: nothing merges, the build mines its values and rulings): **the chrome** — pass C "sticky ink bar" (ink at 90% + backdrop-blur, white/10 hairline, the hero tucks under it on home, the incumbent wordmark serif name + mono kicker desktop-only in header AND footer, the footer carrying the 3-branch contact truth read live from the API, the mobile menu animated on Base UI's native transition contract); **the branded global NotFound/Error** at `__root` (white body, no logo, ink serif headline, `min-h-full`; the two route-level `notFound()` overrides removed; dark NotFound returns the ink field); **home** — the ruled composition end to end (hero under the glass bar → the live-read mosaic gallery in the deterministic 2×2/2×1 rhythm with viewport reveals and no title-captions → featured packages as **D2 light split plates** (cover 60% untouched via the CoverPanel law + light panel: serif name, mono peso-or-nothing per the unpriced law, dotted inclusions, primary ticks between plates) → the full-bleed three-copy looping services marquee (hover-pause; mobile = the JS transform stepper, centered cards, 3.5s interval, drag-with-snap) → paginated testimonials (3/page, lead + side rail, page-change reveal) → the emphasis strip), one voice per section (kickers retire; serif headings carry); **the states** — the skeleton grammar as home's route pendingComponent (structure-only silhouettes + the brand-tinted sweep) and the ruled whole-page empty lines with Back-to-home CTAs, judgeable via the DEV-gated `?empty=1`; and **site-settings consumption stitched where this ticket lands the slots** — hero copy, the announcement banner, home section kickers, social links, the footer contact block, the wordmark/logo — code defaults when unset, on the landing chrome plus the one admin rider (the sidebar wordmark/logo — the plan.md box's "admin sidebar" clause). What does NOT change (map ruling 5): the petrol/ink oklch token layer, the wash+cards+bands atmosphere, the typeface trio, shadcn/Base-UI primitives, WCAG AA.

**Architecture:** Six tasks over three packages: (1) `apps/landing` + `packages/types` — the pure seams TDD (`lib/mosaic.ts` span rhythm, `lib/home-testimonials.ts` pagination, `lib/site-chrome.ts` banner/social/contact shaping, `lib/empty-override.ts` the DEV-gated judging param, `lib/featured.ts` gains `isFeatured` so the settings kicker can override the featured heading without touching the fallback switch) + the one types delta (`SITE_SETTINGS_DEFAULTS.kickerGallery` retires its stand-in suffix — the ruled gallery heading is "The work"); (2) the chrome — the settings read path (`getSiteSettings` server fn resolving through `resolveSiteSettings`, `siteSettingsQueries`, the root loader's never-throwing `allSettled` ensure of settings + branches), the header/footer/banner/mobile-nav compositions, the global NotFound/Error at `__root`, the two `notFoundComponent` overrides removed, the `.nav-panel` CSS, and the admin sidebar rider; (3) home — `Reveal` + `MosaicPhotoGrid` + `FeaturedPlates` (D2 alone; the losing variants stay on the prototype branch forever) + the `HomeImageLed` rewrite + `HomeSkeleton` + the marquee/reveal keyframes and the `.skeleton-grammar` sweep CSS + the `home-copy.ts` stand-in retirement; (4) the states — whole-page empties with Back-to-home CTAs on packages/branches + the `?empty=1` judging; (5) the owner-reacted variants round, both themes (the copy ratifier — every `TODO(owner-copy)` this plan carries settles there); (6) gates + docs rotation (both shared plan.md boxes get DATED NOT-TICKED annotations — they span #223+#224) + the PR + the v1 pick + `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs — lucide's `CalendarPlus`/`Phone`/`ChevronLeft`/`ChevronRight` all already imported by the codebase or the mined prototype, `Skeleton`/`Collapsible`/`Tooltip` on disk in `packages/ui` — 22 primitives, `data-slot='skeleton'` verified). TanStack Start + TanStack Router + TanStack Query over `@sevendays/api-client` (the site-settings wrapper `siteSettings.get()` exists since #215 — grep-verified in `packages/api-client/src/routes/site-settings.ts`); `setupRouterSsrQueryIntegration` wraps the whole tree incl. the shell in `QueryClientProvider` (`router.tsx:33` — useQuery inside `RootDocument` is sound), app-wide `staleTime: 60_000`. Tailwind v4 CSS-first; the sweep CSS rides the existing `--color-brand-300` bridge (`packages/ui/src/tokens.css:219`, verified). Dark mode is #217's production `.dark` block in `packages/ui` — this ticket adds NO tokens and NO app-local dark CSS; both themes render from one class set (`dark:` variants on the ruled NotFound ink field excepted — the ruled behavior). vitest 4.1.11 plain-node lib-seam tests on landing; `pnpm --filter @sevendays/landing build` (vite build — exists) joins Tasks 2–4's gates per the #218 execution ruling (route module graphs gain imports). pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#223 "M7 ticket 12: the landing redesign I — chrome, home, states, settings consumption"](https://github.com/jeius/sevendays/issues/223), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *The landing redesign* pins the ruled surfaces verbatim from the #164 resolution; § *Settings made real* pins "unset fields fall back to today's hardcoded defaults — the settings row is born-empty; defaults live in code" and "both apps consume via the SSR query pattern"; § *Testing Decisions* names "the ruled empty lines, the site-settings defaults seam" as landing lib-seam payload; § *v1-pick classes* pre-rules the payload **"PICK with transformed-surface conflicts"** — v1 keeps its booking-off direction inside the new structure). The four acceptance criteria, verbatim: Chrome + NotFound/Error + home per the ruled direction, both editions both themes · The skeleton grammar + empty lines live; empty states judgeable on a branch · Site-settings consumption with code defaults (both apps' chrome conventions) · Owner-reacted rendered variants per surface (light judged first, dark counterpart). Key recon facts (2026-10-20, main `63e2b71` — post-#221; every file below read whole this session, the prototype files read at `.worktrees/164-landing-redesign` @ `b050334`):

- **The prototype is the source of truth for every ruled value.** The verbatim record: `.scratch/2026-09-30-164-rulings.md` (all six rounds, every owner quote) + `.scratch/164-resolution.md`. This plan's fenced blocks are the prototype's code ADAPTED to main (edition law: the `?v`/`?p`/`?t` prototype machinery and `lib/prototype-standins.ts` NEVER merge — main renders its arm only; `pesoOrNull` → main's already-null-safe `peso()`; the D2 cover half swaps the prototype's raw `img` for the M5-ruled `CoverPanel` so a null cover renders the placeholder, per the spec's states bullet "the muted CoverPanel placeholder (today's, unchanged)"). The losing featured variants (A rate-card, B editorial index, C plate+lineup, D1 ink panel) and the parallax stay on the prototype branch — only D2 builds.
- **The chrome today:** static (non-sticky) `bg-brand-ink` header, `py-4`, mark `size-10`, kicker `sm:inline`, ThemeToggle (#217) between CTA and MobileNav; footer = wordmark + nav + outline CTA, NO branch truth, NO socials/contact; MobileNav = Base UI Collapsible, no animation. The ruled deltas: `sticky top-0 z-20 border-white/10 border-b bg-brand-ink/90 backdrop-blur-md`, `py-2.5`, mark `size-9`, kicker/footer kicker `md:inline` (desktop-only ruling), toggle `size-9` (keeps the bar at 56px = `py-2.5` + 36px mark — the `-mt-14` hero tuck matches it), the mobile panel animated via `.nav-panel` + data-attr styling on the Base UI collapsible (the library stamps `data-open`/`data-closed`/`data-starting-style` and keeps the panel mounted through exit — verified in the prototype's round-6 fix), the trigger rotating 90° through the Menu/X morph.
- **Home today is the #111 composition** (`components/home-image-led.tsx`): stand-in gallery (`GALLERY_STANDINS` masonry), `PackageCoverCard` featured grid, `ServiceImageCard` grid, `TESTIMONIALS_PLACEHOLDER` presented as real, kicker-over-heading pairs. ALL of it dies: the loader gains `galleryQueries.all()` + `testimonialQueries.all()` (the M5-ruled reads — live since #142), `MosaicPhotoGrid` renders the live gallery (captions OFF on home — ruled; captions render on about's wall, #224's), testimonials render the real rows paginated. `home-copy.ts` keeps only `HERO_PHOTO`/`HERO_PHOTO_ALT` (the copy moves to settings consumption; `HERO_BLURB`'s default already lives in `SITE_SETTINGS_DEFAULTS.homeDescription`). `home-cards.tsx` keeps `ServiceImageCard` + `serviceBackground` only — `PackageCoverCard`/`ChipCluster`/`packageChips`/`BookNow` are home-featured-only (grep-verified zero other importers) and die with the rewrite; the marquee reuses `ServiceImageCard` unchanged (its Book chip's icon treatment rides #224's service-cards ruling — fenced).
- **The CTA law, main arm, THIS ticket's sites only:** Book now CTAs carry `CalendarPlus` (header, mobile panel, hero); call affordances carry `Phone` (footer "Call or visit a branch", NotFound + Error ditto). The v1 arm (Call us solid primary, zero book words) is **pick-time transform on the v1 branch** — no runtime variant machinery merges (the class ledger's "PICK with transformed-surface conflicts"; `?v` previewed the shapes, the toggle never merges).
- **The settings path:** the api-client wrapper exists; the landing gets `getSiteSettings` (server fn, `startSpan`-wrapped, resolving through `resolveSiteSettings` — consumers never see nulls) + `siteSettingsQueries.all()`. The root route gains a loader: `Promise.allSettled` over the settings + branches ensures — **the chrome never throws** (a failed read renders defaults; the page's own loaders still own their error surfaces). `RootDocument` reads both via `useQuery` and passes `data ?? SITE_SETTINGS_DEFAULTS` / `data ?? []` down. The wordmark renders `brandName`/`brandTagline`/`logoImageUrl ?? '/photos/sd.png'`; the banner renders `bannerFor()`'s shape (off or untitled → nothing); the footer renders the branch truth (`branch.name`/`branch.phone` → `tel:`/`acceptsWalkIns` → "Walk-ins welcome"/"By appointment" — field names verified in `packages/types/src/branch.ts`), the socials (mono text labels, unset hides — lucide has no TikTok glyph; the round may rule brand SVGs later), and the contact block (`footerContactFor`). **One admin rider** (the plan.md box's "…in landing header/footer + admin sidebar" clause): `_shell.tsx` gains a guarded `siteSettingsQuery` ensure and `AdminSidebar`'s header block renders `brandName` + the logo chip (`logoImageUrl ? img : the 7d monogram`) over `resolveSiteSettings(raw ?? EMPTY_SITE_SETTINGS)` — the admin's existing `siteSettingsQuery`/`getSiteSettings` (`lib/cms-queries.ts:100`, `lib/api.functions.ts:19`) serve it. Document titles are NOT here — #224 owns `<title>`/meta per its AC.
- **The states:** home's skeleton composes fresh on the ruled grammar (the prototype's `skeletons.ts` has packages/detail/services/branches/about silhouettes — all #224 surfaces; home has none there — #223 owns the system CSS + the home silhouette + the pendingComponent wiring, #224 adds the per-surface skeletons with their surfaces). `pendingComponent` shows on client navigations only (first loads are server-rendered — the M5 freshness rule; TanStack shows it past `defaultPendingMs` while loaders run — the prototype's "devtools throttling while clicking between pages" is the judging method). Whole-page empty lines: packages keeps the M5 line + gains the Back-to-home outline CTA; branches GAINS an empty state (none exists today — `branches.map` renders nothing) with the prototype's line "Our branches are being set up — check back soon." + the CTA. The `?empty=1` judging aid is **DEV-gated** (`isEmptyJudgingParam(import.meta.env.DEV, useLocation().search)` — production answers false, so the aid never ships; raw URL read because route search validation strips unknown params). About's in-page empties stay untouched (#224). Home's in-page empties: the featured collapse law stands (`packages.length > 0` gates the section, unchanged); the gallery section renders the ruled "Portfolio coming soon." line when the live read has zero photos (the shared wall's law — conservative extension, unrated); zero services collapses the services section entirely (the featured-collapse precedent, unrated); zero testimonials renders the prototype's "Client words are on their way — check back soon."
- **Sibling fences (the tickets' own bodies; NOT here regardless of temptation):** **the catalog plates index, the D2 package detail + framed/prints/privileges spec sheet, image-backed service rows, branch cover strips + walk-in tooltips + variant-split CTAs, /share-your-story wearing the redesign, page titles/descriptions driving h1 + SEO meta, the unpriced law re-verification at those sites, the CTA-law sweep on those surfaces** — ALL #224; **/about's redesign** (mosaic portfolio wall with captions, quote wall, the settings story/title) — #224; **the per-surface skeletons for packages/detail/services/branches/about** — #224 (they echo #224 surfaces); **document `<title>`/meta consumption** — #224; **the M7 close-out box, the exit reflection scenario, visual regression** — #225; **any new token or `packages/ui` change** (ruled: none — the redesign re-weights the existing system); **any booking-surface file beyond the `booking.$id.tsx` `notFoundComponent` prop removal** (the wizard/confirmation are v2's and unchanged); **stand-in imagery or stand-in content of any kind** — the 18 StockSnap files and the stand-in seams live on the prototype branch only; main renders the live catalog as-is (the content gaps are owner-owned, recorded in the #164 resolution).
- **The `docs/plan.md` boxes (Task 6):** the redesign box (`docs/plan.md:174` — "- [ ] Landing — the redesign build…") and the consumption box (`docs/plan.md:175` — "- [ ] Both apps — site settings consumed…") BOTH span #223+#224 — each gets a DATED NOT-TICKED annotation naming what landed and what stays #224's (the #216/#221 shared-box precedent). Nothing ticks; the milestone Verify box stays #225's.
- **Baselines (live, run this session on main `63e2b71`):** types 18 files / 170 tests; landing 10 files / 92 tests; admin 26 files / 254 tests. After Task 1: landing **14 files / 115 tests** (+4 new files — `mosaic.test.ts` +4, `home-testimonials.test.ts` +4, `site-chrome.test.ts` +9, `empty-override.test.ts` +4, `featured.test.ts` +2); types stays 18/170 (in-place literal edits only); admin stays 26/254 (the rider adds no suite — the resolution it uses is types-tested). Tasks 2–5 add no suite counts (component-side). (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)

## Global Constraints

- **Branch & baseline:** `feat/223-landing-redesign-1` off main `63e2b71` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#223)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, grep-gate output, the round's captures and rulings) lands in gitignored `.superpowers/sdd/2026-10-20-223-landing-redesign-1/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs.** `@sevendays/types` resolves through its built `dist/` (its package exports point there — verified), so **Task 1 runs `pnpm --filter @sevendays/types build` after the default edit and before the landing suite** (the landing's seams import `EMPTY_SITE_SETTINGS` from the package at runtime — a stale dist would test the old default). Task 1 then runs `pnpm --filter @sevendays/landing fix` then `pnpm --filter @sevendays/types fix` BEFORE committing (accept the rewrites) → each package's `test -- --run` → `typecheck`. Tasks 2–4 run `pnpm --filter @sevendays/landing fix` → `test -- --run` → `typecheck` → **`build`** (the #218 execution ruling: the production build joins the per-task checks whenever a route's module graph gains an import — every one of these tasks adds one); Task 2 additionally runs the same four for `@sevendays/admin` (the rider touches `_shell.tsx` + `admin-sidebar.tsx`). Never stage `graphify-out/` churn. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file, `docs/plan.md`, and issue bodies alike). Run `graphify update .` at close (Task 6 — code was modified).
- **The edition law (binding):** main renders its arm only. NO `?v`/`?p`/`?t` machinery, no runtime variant reads, no `prototype-standins`, no stand-in imagery — none of the prototype's judging seams merge. The v1 arm (Call us solid primary, zero book words, hero call-forward) is a pick-time transform on the `v1` branch per the class ledger; this plan lands zero v1-conditional code.
- **The theme law (binding, #217's ramp):** every new surface uses semantic tokens + tailwind utilities only — no new tokens, no `packages/ui` change, no app-local `.dark` CSS; both themes render from the same classes with two ruled exceptions: NotFound's body (`bg-white dark:bg-brand-ink` — dark returns the ink field, the ruled behavior) and the text sweeps already carried in components (`dark:text-foreground` pairs on `text-brand-ink` lines — the #164 prototype's 12-file sweep pattern). The round verifies dark, never a second class set. If a retune lands interactive text on off-token palette classes, re-measure contrast first (≥ 4.5 for text — `scripts/measure-theme-pairs.mjs` is the harness; do not edit its recorded tables without re-running it).
- **The settings law (binding):** the chrome renders `resolveSiteSettings` output ONLY (the server fn resolves; components never see raw nulls); a missing or failed read renders `SITE_SETTINGS_DEFAULTS` (the never-broken law — a born-empty row and a dead API render the same chrome); the root loader NEVER throws (`Promise.allSettled` — a chrome read must not take down pages whose own loaders are healthy); defaults never ride the wire (#215's law — only `kickerGallery`'s default changes, in `packages/types`, same-commit with its pinned test edit).
- **The CTA law (binding, this ticket's sites):** every Book-now CTA this plan lands carries `CalendarPlus` (`size-4`, `aria-hidden`); every call affordance carries `Phone`. Footer/NotFound/Error CTAs keep outline weight. No other CTA changes (fenced to #224).
- **The CoverPanel law (binding):** every cover render site this plan lands (the D2 plate's photo half) uses `CoverPanel` — img on `coverImageUrl`, today's placeholder verbatim on null (M5's rule for home-featured surfaces; the prototype's raw `img` is corrected at the mining boundary).
- **The unpriced law (binding, #212):** `peso(priceCents)` already renders `null` → nothing; no redesigned site reintroduces a ₱0, a placeholder, or an inquire line. The D2 plate's mono price line renders nothing for unpriced rows.
- **The states law (binding):** skeletons are structure-only silhouettes on the shared Tier-1 `Skeleton` primitive, wired as `pendingComponent` (client navigations only — no suspense-fallback spinners anywhere); the sweep rides `.skeleton-grammar` (reduced-motion off). Whole-page empty lines carry the Back-to-home outline CTA; `?empty=1` answers false in production builds by construction. First loads stay server-rendered (the M5 freshness rule — no route gains `preloadStaleTime` games).
- **The copy law:** every string the executor must produce lands verbatim in this plan's fenced blocks. Unrated owner-facing copy carries the house `TODO(owner-copy)` marker per the on-disk convention — Task 5's round ratifies or retunes; markers retire as ruled; if copy retunes, the code changes in the same commit (no suite pins component-side strings; the ONE suite-pinned literal this ticket touches is `SITE_SETTINGS_DEFAULTS.kickerGallery` in `packages/types` — a retune there lands in the same commit as its test edit).
- **The motion law (from the rulings):** one motion grammar — the `Reveal` fade-and-rise (700ms ease-out, staggered per column, `prefers-reduced-motion` shows immediately), the marquee (45s linear, hover-pause, reduced-motion = manual on mobile / none on desktop), the stepper (3.5s interval, 500ms ease-out steps, reduced-motion = instant steps still on the interval — auto-scroll is the owner's explicit ask), the nav panel (200ms ease-out, reduced-motion instant), the testimonial page-change reveal (500ms, reduced-motion swaps to a plain fade via `motion-safe:`), the skeleton sweep (1.4s, reduced-motion off), the plate hover zoom (`duration-700 group-hover:scale-[1.02]`, reduced-motion none). Nothing else animates.
- **Scope fence (verbatim):** Task 1 edits only `packages/types/src/{site-settings.ts (one literal), site-settings.test.ts (one literal)}` + `apps/landing/src/lib/{mosaic.ts (new), mosaic.test.ts (new), home-testimonials.ts (new), home-testimonials.test.ts (new), site-chrome.ts (new), site-chrome.test.ts (new), empty-override.ts (new), empty-override.test.ts (new), featured.ts, featured.test.ts}`. Task 2 edits only `apps/landing/src/{lib/api.functions.ts, lib/queries.ts, components/site-header.tsx, components/site-footer.tsx, components/mobile-nav.tsx, components/announcement-banner.tsx (new), components/not-found.tsx (new), components/error-component.tsx (new), routes/__root.tsx, styles.css, routes/packages/$slug.tsx (prop removal), routes/booking.$id.tsx (prop removal)}` + `apps/admin/src/{routes/_shell.tsx, components/admin-sidebar.tsx}`. Task 3 edits only `apps/landing/src/{components/reveal.tsx (new), components/mosaic-photo-grid.tsx (new), components/featured-plates.tsx (new), components/home-image-led.tsx, components/home-cards.tsx, components/home-copy.ts, components/skeletons.tsx (new), routes/index.tsx, styles.css}`. Task 4 edits only `apps/landing/src/{routes/packages/index.tsx, routes/branches.tsx}`. Task 5 edits only copy/classes in the files Tasks 1–4 landed + writes evidence. Task 6 rotates `docs/plan.md`, `docs/progress.md`, `AGENTS.md`, `graphify-out/`, `docs/agents/v1-picks.md` (post-merge), and works the PR/pick/issues — nothing else. NOT here: everything in the header's sibling-fences bullet.

## File Structure

```text
packages/types/src/
  site-settings.ts             # modify (T1) — kickerGallery default 'The work — stand-in portfolio' → 'The work'
  site-settings.test.ts        # modify (T1) — the same literal in the DEFAULTS verbatim pin
apps/landing/src/lib/
  mosaic.ts                    # new (T1) — spanFor: the deterministic 2×2/2×1 rhythm
  mosaic.test.ts               # new (T1) — +4 its
  home-testimonials.ts         # new (T1) — paginateTestimonials (3/page, lead + side rail)
  home-testimonials.test.ts    # new (T1) — +4 its
  site-chrome.ts               # new (T1) — bannerFor / socialLinksFor / footerContactFor
  site-chrome.test.ts          # new (T1) — +9 its
  empty-override.ts            # new (T1) — isEmptyJudgingParam (DEV-gated ?empty=1)
  empty-override.test.ts       # new (T1) — +4 its
  featured.ts                  # modify (T1) — the selector's return gains isFeatured
  featured.test.ts             # modify (T1) — +2 its
  api.functions.ts             # modify (T2) — getSiteSettings (resolveSiteSettings at the boundary)
  queries.ts                   # modify (T2) — siteSettingsQueries
apps/landing/src/components/
  site-header.tsx              # modify (T2) — the sticky glass ink bar + settings wordmark
  site-footer.tsx              # modify (T2) — branch truth + socials + contact + settings wordmark
  mobile-nav.tsx               # modify (T2) — the animated panel + CalendarPlus CTA
  announcement-banner.tsx      # new (T2) — the settings banner (off/untitled → nothing)
  not-found.tsx                # new (T2) — the branded global 404
  error-component.tsx          # new (T2) — the branded error surface
  reveal.tsx                   # new (T3) — the shared viewport reveal
  mosaic-photo-grid.tsx        # new (T3) — the shared mosaic wall (captions optional)
  featured-plates.tsx          # new (T3) — D2 light split plates, alone
  home-image-led.tsx           # modify (T3) — the ruled home composition
  home-cards.tsx               # modify (T3) — keeps ServiceImageCard + serviceBackground only
  home-copy.ts                 # modify (T3) — keeps HERO_PHOTO/HERO_PHOTO_ALT only
  skeletons.tsx                # new (T3) — HomeSkeleton (the grammar's first silhouette)
apps/landing/src/routes/
  __root.tsx                   # modify (T2) — chrome loader + banner + global NotFound/Error
  packages/$slug.tsx           # modify (T2) — notFoundComponent override removed
  booking.$id.tsx              # modify (T2) — notFoundComponent override removed
  index.tsx                    # modify (T3) — the four-read loader + pendingComponent
  packages/index.tsx           # modify (T4) — Back-to-home CTA + ?empty judging
  branches.tsx                 # modify (T4) — the empty state + Back-to-home + ?empty judging
apps/landing/src/styles.css    # modify (T2+T3) — .nav-panel (T2); marquee/reveal keyframes + .skeleton-grammar sweep (T3)
apps/admin/src/
  routes/_shell.tsx            # modify (T2) — the guarded site-settings ensure
  components/admin-sidebar.tsx # modify (T2) — brandName + logo chip over resolveSiteSettings
docs/plan.md docs/progress.md AGENTS.md graphify-out/ docs/agents/v1-picks.md  # T6
```

---

### Task 1: The pure seams + the one types default (TDD)

Every composition Task 2–4 renders reads through these seams; they land first, suite-pinned. Nothing visual yet.

**Files:**
- Write (test-first): `apps/landing/src/lib/{mosaic,home-testimonials,site-chrome,empty-override}.test.ts`
- Write: `apps/landing/src/lib/{mosaic,home-testimonials,site-chrome,empty-override}.ts`
- Modify: `apps/landing/src/lib/{featured.ts, featured.test.ts}`, `packages/types/src/{site-settings.ts, site-settings.test.ts}`

**Interfaces:**
- Produces (what Tasks 2–4 consume): `spanFor(i: number): string` (grid-span classes); `TESTIMONIAL_PAGE_SIZE` + `paginateTestimonials(items: PublicTestimonial[], pageSize?): { id: string; items: PublicTestimonial[] }[]`; `bannerFor(settings: SiteSettings): { title: string; body: string | null } | null`, `socialLinksFor(settings: SiteSettings): SocialLink[]`, `footerContactFor(settings: SiteSettings): { email: string | null; phone: string | null } | null`; `isEmptyJudgingParam(dev: boolean, search: string): boolean`; `selectFeaturedPackages` returning `{ heading, isFeatured, packages }`.
- Consumes: `PublicTestimonial`, `SiteSettings` from `@sevendays/types`.

**Not here:** any component; any route; the banner/footer/header compositions (Task 2); pagination STATE (page clamping lives in the component — the seam is the pure chunking).

- [ ] **Step 1: Write the four failing test files**

`apps/landing/src/lib/mosaic.test.ts` (new file):

```ts
// The mosaic wall's deterministic span rhythm (#164 Round 2, owner-ruled:
// "some photos have 2x2 or 1x2 size") — every 7th tile runs large, every
// 7th+3 runs wide, singles around, repeating. Pinned so a future "tune the
// rhythm" edit moves the seam and the suite together.
import { describe, expect, it } from 'vitest';
import { spanFor } from './mosaic';

describe('spanFor (M7 #223 — the #164-ruled rhythm)', () => {
  it('every 7th tile runs 2×2 (i = 0, 7, 14 …)', () => {
    expect(spanFor(0)).toBe('col-span-2 row-span-2');
    expect(spanFor(7)).toBe('col-span-2 row-span-2');
    expect(spanFor(14)).toBe('col-span-2 row-span-2');
  });

  it('every 7th+3 tile runs 2×1 wide (i = 3, 10, 17 …)', () => {
    expect(spanFor(3)).toBe('col-span-2');
    expect(spanFor(10)).toBe('col-span-2');
  });

  it('everything else is a single', () => {
    expect(spanFor(1)).toBe('');
    expect(spanFor(2)).toBe('');
    expect(spanFor(4)).toBe('');
    expect(spanFor(6)).toBe('');
    expect(spanFor(9)).toBe('');
  });

  it('the rhythm is unbounded — large indices keep cycling (the wall never runs out of window)', () => {
    expect(spanFor(21)).toBe('col-span-2 row-span-2');
    expect(spanFor(24)).toBe('col-span-2');
    expect(spanFor(100)).toBe('');
  });
});
```

`apps/landing/src/lib/home-testimonials.test.ts` (new file):

```ts
// Home testimonial pagination (#164 Round 2, owner-ruled: 3 per page — a
// pull-quote lead + a 2-item side rail; non-looping, the UI disables the
// ends). The seam is the pure chunking; page STATE is the component's.
import type { PublicTestimonial } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { paginateTestimonials } from './home-testimonials';

let n = 0;
function t(): PublicTestimonial {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    quote: `Quote ${n}`,
    person: `Person ${n}`,
  };
}
```

*(The wire is the three-field `{ id, quote, person }` — `packages/types/src/testimonial.ts`'s `publicTestimonialSchema`, read whole this session; position/isActive never ride the public read.)*

```ts
describe('paginateTestimonials (M7 #223 — 3 per page, lead + side rail)', () => {
  it('zero testimonials → zero pages (the component renders the coming-soon line)', () => {
    expect(paginateTestimonials([])).toEqual([]);
  });

  it('exactly 3 → one full page', () => {
    const items = [t(), t(), t()];
    const pages = paginateTestimonials(items);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.items).toHaveLength(3);
  });

  it('4 → two pages of 3 + 1 (non-looping chunking, no padding)', () => {
    const items = [t(), t(), t(), t()];
    const pages = paginateTestimonials(items);
    expect(pages.map((p) => p.items.length)).toEqual([3, 1]);
  });

  it('7 → three pages; page ids derive from each page’s first item (the reveal keys on them)', () => {
    const items = Array.from({ length: 7 }, t);
    const pages = paginateTestimonials(items);
    expect(pages.map((p) => p.items.length)).toEqual([3, 3, 1]);
    expect(pages[0]?.id).toBe(items[0]?.id);
    expect(pages[1]?.id).toBe(items[3]?.id);
    expect(pages[2]?.id).toBe(items[6]?.id);
  });
});
```

`apps/landing/src/lib/site-chrome.test.ts` (new file):

```ts
// The chrome's site-settings consumption seams (M7 #223): pure shapers over
// the RESOLVED settings. The banner gates are the law: off or untitled
// renders NOTHING (never a broken strip); unset socials hide; the contact
// block renders only what the studio set. Fixtures here are hand-built
// resolved shapes (resolveSiteSettings is types-tested — #215).
import type { SiteSettings } from '@sevendays/types';
import { EMPTY_SITE_SETTINGS } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { bannerFor, footerContactFor, socialLinksFor } from './site-chrome';

const ON = {
  ...EMPTY_SITE_SETTINGS,
  bannerIsActive: true,
} as SiteSettings;

describe('bannerFor (M7 #223 — off or untitled renders nothing)', () => {
  it('inactive banner → null even when title/body are set', () => {
    expect(
      bannerFor({ ...ON, bannerIsActive: false, bannerTitle: 'News', bannerBody: 'Body' })
    ).toBeNull();
  });

  it('active + title + body → both ride', () => {
    expect(bannerFor({ ...ON, bannerTitle: 'News', bannerBody: 'Body' })).toEqual({
      title: 'News',
      body: 'Body',
    });
  });

  it('active + title, body unset → the title alone (body renders nothing)', () => {
    expect(bannerFor({ ...ON, bannerTitle: 'News', bannerBody: null })).toEqual({
      title: 'News',
      body: null,
    });
  });

  it('active but untitled → null (a body-only strip is a broken strip)', () => {
    expect(bannerFor({ ...ON, bannerTitle: null, bannerBody: 'Body' })).toBeNull();
  });
});

describe('socialLinksFor (M7 #223 — unset links hide, order fixed)', () => {
  it('nothing set → empty row (the footer renders no social line)', () => {
    expect(socialLinksFor(EMPTY_SITE_SETTINGS)).toEqual([]);
  });

  it('a subset renders in the fixed Instagram → Facebook → TikTok order with labels', () => {
    const links = socialLinksFor({
      ...EMPTY_SITE_SETTINGS,
      socialInstagram: 'https://instagram.com/sevendays',
      socialTiktok: 'https://tiktok.com/@sevendays',
    } as SiteSettings);
    expect(links).toEqual([
      { key: 'instagram', href: 'https://instagram.com/sevendays', label: 'Instagram' },
      { key: 'tiktok', href: 'https://tiktok.com/@sevendays', label: 'TikTok' },
    ]);
  });
});

describe('footerContactFor (M7 #223 — renders only what the studio set)', () => {
  it('nothing set → null (no contact block)', () => {
    expect(footerContactFor(EMPTY_SITE_SETTINGS)).toBeNull();
  });

  it('email only → the block with a null phone slot', () => {
    expect(footerContactFor({ ...EMPTY_SITE_SETTINGS, contactEmail: 'hello@sevendays.ph' } as SiteSettings)).toEqual({
      email: 'hello@sevendays.ph',
      phone: null,
    });
  });

  it('both set → the full block', () => {
    expect(
      footerContactFor({
        ...EMPTY_SITE_SETTINGS,
        contactEmail: 'hello@sevendays.ph',
        contactPhone: '+63 900 000 000',
      } as SiteSettings)
    ).toEqual({ email: 'hello@sevendays.ph', phone: '+63 900 000 000' });
  });
});
```

`apps/landing/src/lib/empty-override.test.ts` (new file):

```ts
// The empty-states judging aid (#164 Round 5's mechanism, built DEV-gated):
// ?empty=1 forces the ruled whole-page empty lines so the round judges them
// without emptying the live catalog. Production builds answer false by
// construction — the aid never ships.
import { describe, expect, it } from 'vitest';
import { isEmptyJudgingParam } from './empty-override';

describe('isEmptyJudgingParam (M7 #223 — DEV-gated)', () => {
  it('dev + ?empty=1 → true (the judging path)', () => {
    expect(isEmptyJudgingParam(true, '?empty=1')).toBe(true);
  });

  it('production + ?empty=1 → false (the aid never ships)', () => {
    expect(isEmptyJudgingParam(false, '?empty=1')).toBe(false);
  });

  it('dev without the param → false', () => {
    expect(isEmptyJudgingParam(true, '')).toBe(false);
    expect(isEmptyJudgingParam(true, '?other=1')).toBe(false);
  });

  it('dev + ?empty=0 → false (only the exact value arms it)', () => {
    expect(isEmptyJudgingParam(true, '?empty=0')).toBe(false);
  });
});
```

- [ ] **Step 2: Extend the failing featured test**

In `apps/landing/src/lib/featured.test.ts`, inside the existing top describe (after the fallback-path `it`), add:

```ts
  it('isFeatured flags the featured path so home can override its heading from settings (M7 #223)', () => {
    const flagged = selectFeaturedPackages([pkg(BASIC), pkg(C)]);
    expect(flagged.isFeatured).toBe(true);
  });

  it('isFeatured stays false on the fallback path (the fallback heading is code-ruled, not settings copy)', () => {
    const fallback = selectFeaturedPackages([pkg({ name: 'P1', priceCents: 1000 })]);
    expect(fallback.isFeatured).toBe(false);
  });
```

*(Place the two its beside their paths' existing its inside the file's describe blocks — the fixture vocabulary `pkg()`/`BASIC`/`C` is the file's own.)*

- [ ] **Step 3: Run red**

`pnpm --filter @sevendays/landing test -- --run` — the 4 new files' its fail (modules don't exist); the featured extension fails (`isFeatured` absent). Capture the red output to the evidence dir.

- [ ] **Step 4: Implement the seams**

`apps/landing/src/lib/mosaic.ts` (new file):

```ts
// The mosaic wall's deterministic span rhythm (#164 Round 2, owner-ruled):
// every 7th tile runs large (2×2), every 7th+3 runs wide (2×1), the rest
// are singles — over fixed row heights with dense packing, so the wall
// stays balanced while a few photos run large. Pure: the grid component
// maps indices through this and the seam pins the rhythm.
export function spanFor(i: number): string {
  return i % 7 === 0 ? 'col-span-2 row-span-2' : i % 7 === 3 ? 'col-span-2' : '';
}
```

`apps/landing/src/lib/home-testimonials.ts` (new file):

```ts
import type { PublicTestimonial } from '@sevendays/types';

// Home testimonial pagination (#164 Round 2, owner-ruled): 3 per page — a
// pull-quote lead + a 2-item side rail on every page. Non-looping (the UI
// disables the ends). Page ids derive from each page's first item: the
// page-change reveal keys on them, so every flip re-runs the animation.
export const TESTIMONIAL_PAGE_SIZE = 3;

export function paginateTestimonials(
  items: PublicTestimonial[],
  pageSize: number = TESTIMONIAL_PAGE_SIZE
): { id: string; items: PublicTestimonial[] }[] {
  const pages: { id: string; items: PublicTestimonial[] }[] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    const pageItems = items.slice(i, i + pageSize);
    pages.push({ id: pageItems[0]?.id ?? `page-${pages.length}`, items: pageItems });
  }
  return pages;
}
```

`apps/landing/src/lib/site-chrome.ts` (new file):

```ts
import type { SiteSettings } from '@sevendays/types';

// The chrome's site-settings consumption seams (M7 #223): pure shapers over
// the RESOLVED settings (the server fn applies resolveSiteSettings — these
// never see a raw null-default mix). Three laws live here: the banner
// renders NOTHING when off or untitled (never a broken strip); unset
// social links hide (the row collapses when all are unset); the contact
// block renders only what the studio actually set.

export function bannerFor(settings: SiteSettings): { title: string; body: string | null } | null {
  if (!settings.bannerIsActive) return null;
  if (!settings.bannerTitle) return null;
  return { title: settings.bannerTitle, body: settings.bannerBody };
}

export interface SocialLink {
  key: 'instagram' | 'facebook' | 'tiktok';
  href: string;
  label: string;
}

export function socialLinksFor(settings: SiteSettings): SocialLink[] {
  const links: SocialLink[] = [];
  if (settings.socialInstagram) {
    links.push({ key: 'instagram', href: settings.socialInstagram, label: 'Instagram' });
  }
  if (settings.socialFacebook) {
    links.push({ key: 'facebook', href: settings.socialFacebook, label: 'Facebook' });
  }
  if (settings.socialTiktok) {
    links.push({ key: 'tiktok', href: settings.socialTiktok, label: 'TikTok' });
  }
  return links;
}

export function footerContactFor(
  settings: SiteSettings
): { email: string | null; phone: string | null } | null {
  if (settings.contactEmail === null && settings.contactPhone === null) return null;
  return { email: settings.contactEmail, phone: settings.contactPhone };
}
```

`apps/landing/src/lib/empty-override.ts` (new file):

```ts
// The empty-states judging aid (#164 Round 5's mechanism, built DEV-gated
// for #223): `?empty=1` forces the ruled whole-page empty lines so the
// owner round judges them without emptying the live catalog. The URL is
// read RAW (route search validation strips unknown params); `dev` is the
// caller's `import.meta.env.DEV` so production builds answer false by
// construction — the aid never ships.
export function isEmptyJudgingParam(dev: boolean, search: string): boolean {
  if (!dev) return false;
  return new URLSearchParams(search).get('empty') === '1';
}
```

In `apps/landing/src/lib/featured.ts`: extend the return type of `selectFeaturedPackages` to `{ heading: string; isFeatured: boolean; packages: ServicePackageRead[] }` and the two returns — the featured path gains `isFeatured: true,`, the fallback path `isFeatured: false,`. The heading switch itself is UNTOUCHED (the M5-ruled behavior; home composes `isFeatured ? settings.kickerPackages : heading`).

- [ ] **Step 5: The types default delta (same-commit pair)**

In `packages/types/src/site-settings.ts`, in `SITE_SETTINGS_DEFAULTS`, replace the line

```ts
  kickerGallery: 'The work — stand-in portfolio',
```

with

```ts
  kickerGallery: 'The work',
```

In `packages/types/src/site-settings.test.ts` line 120, inside the `SITE_SETTINGS_DEFAULTS pins today's landing literals verbatim` `it`, replace the same literal `kickerGallery: 'The work — stand-in portfolio',` with `kickerGallery: 'The work',`. **These two edits land in the same commit.** (Why: the default IS the rendered-when-unset copy; the ruled home's gallery heading is "The work" — one voice per section — and the wall renders the real gallery now, so the stand-in suffix dies with the stand-ins. The other three kicker defaults already equal their ruled headings; `homeTitle`/`homeDescription` already equal the incumbent hero copy the prototype kept. Update the file's header comment's "the four kickers from home-copy's KICKERS" phrase to "the four kickers from the ruled one-voice section headings (#223)" — one line.)

- [ ] **Step 6: Green + gates + commit**

`pnpm --filter @sevendays/types build` FIRST (the landing consumes the package through its `dist/` — the new default must be in the build before the landing suite reads it), then `pnpm --filter @sevendays/landing test -- --run` — **14 files / 115 tests** (92 + 23). `pnpm --filter @sevendays/types test -- --run` — **18 files / 170 tests** (unchanged counts; the literal edit must keep the DEFAULTS pin green). Then `pnpm --filter @sevendays/landing fix` → `pnpm --filter @sevendays/types fix` → re-run both suites → `pnpm --filter @sevendays/landing typecheck` → `pnpm --filter @sevendays/types typecheck`. Commit:

```bash
git add packages/types/src/site-settings.ts packages/types/src/site-settings.test.ts apps/landing/src/lib/mosaic.ts apps/landing/src/lib/mosaic.test.ts apps/landing/src/lib/home-testimonials.ts apps/landing/src/lib/home-testimonials.test.ts apps/landing/src/lib/site-chrome.ts apps/landing/src/lib/site-chrome.test.ts apps/landing/src/lib/empty-override.ts apps/landing/src/lib/empty-override.test.ts apps/landing/src/lib/featured.ts apps/landing/src/lib/featured.test.ts
git commit -m "feat(landing): the redesign I seams - mosaic rhythm, testimonial pagination, chrome settings shapers, the DEV-gated empty judging, isFeatured (#223)"
```

### Task 2: The chrome — settings read path, glass bar, footer truth, banner, global NotFound/Error, the admin rider (UI-bearing)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule) before composing. The fenced compositions below are the #164-ruled values adapted to main (the skill set's pass retunes what Task 5's round rules; the ruled literals — `bg-brand-ink/90 backdrop-blur-md`, the white/10 hairline, `md:inline` kicker, `py-2.5`/`size-9` bar — are owner-ruled, not suggestions).

**Files:**
- Modify: `apps/landing/src/lib/api.functions.ts`, `apps/landing/src/lib/queries.ts`, `apps/landing/src/components/{site-header,site-footer,mobile-nav}.tsx`, `apps/landing/src/routes/__root.tsx`, `apps/landing/src/styles.css`, `apps/landing/src/routes/packages/$slug.tsx`, `apps/landing/src/routes/booking.$id.tsx`
- Write: `apps/landing/src/components/{announcement-banner,not-found,error-component}.tsx`
- Modify (the admin rider): `apps/admin/src/routes/_shell.tsx`, `apps/admin/src/components/admin-sidebar.tsx`

**Interfaces:**
- Produces: `getSiteSettings()` server fn (RESOLVED `SiteSettings`); `siteSettingsQueries.all()`; `SiteHeader({ settings })` / `SiteFooter({ settings, branches })` / `MobileNav({ links })` / `AnnouncementBanner({ settings })` / `NotFound` / `ErrorComponent({ error })`; the root's `notFoundComponent`/`errorComponent`; the admin sidebar's brand block.
- Consumes: Task 1's `bannerFor`/`socialLinksFor`/`footerContactFor`; `branchQueries.all()`; the api-client's `siteSettings.get()`; `NAV_LINKS`; the admin's existing `siteSettingsQuery` + `getSiteSettings`.

**Not here:** home (Task 3); the empty states (Task 4); document titles (#224); any `packages/ui` file; any booking-surface behavior beyond the `booking.$id.tsx` prop removal.

- [ ] **Step 1: The settings read path**

(a) In `apps/landing/src/lib/api.functions.ts`, add the server fn (after `getTestimonials`, before `createAppointment` — biome orders by its own fix pass; imports: `resolveSiteSettings` joins the `@sevendays/types` import):

```ts
/**
 * The resolved site-settings read (M7 #223 — the chrome + home copy
 * source). resolveSiteSettings applies at the boundary: consumers never
 * see the born-empty null mix — unset fields are today's defaults (#215's
 * one-fallback law, never per-app fallbacks).
 */
export const getSiteSettings = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/site-settings' }, async () => {
    return resolveSiteSettings(await getApiClient().siteSettings.get());
  });
});
```

(b) In `apps/landing/src/lib/queries.ts`, add beside the other chrome-adjacent queries:

```ts
export const siteSettingsQueries = {
  /** The singleton's resolved read (M7 #223) — the chrome's copy source. */
  all: () =>
    queryOptions({
      queryKey: ['site-settings'],
      queryFn: () => getSiteSettings(),
    }),
};
```

(with `getSiteSettings` joining the `./api.functions` import block).

- [ ] **Step 2: `components/site-header.tsx` — the sticky glass ink bar (full rewrite)**

```tsx
import type { SiteSettings } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { ThemeToggle } from '@sevendays/ui/components/theme-toggle';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarPlus } from 'lucide-react';
import { NAV_LINKS } from '../lib/nav';
import { MobileNav } from './mobile-nav';

// Site chrome — the ruled pass C "Sticky ink bar" (#164 Round 1, owner
// endorsed; built M7 #223): the ink band goes sticky and glassy — 90% ink
// + backdrop-blur so scrolling content reads softly beneath it, the
// white/10 hairline keeping the glass legible on bright photos. The
// incumbent wordmark (serif name + mono kicker) carries, desktop-only
// (md+); the brand consumes site settings (the logo chip when the studio
// sets one, the incumbent sd.png otherwise; name/tagline from the Site
// tab, code defaults when unset). Link treatment stays #111's ruled B
// (brand-200 rest 13.94:1, white hover/current, petrol tick). CTA law,
// main arm: Book now carries CalendarPlus — the v1 arm's Call-us swap is a
// pick-time transform, never in this codebase.
export function SiteHeader({ settings }: { settings: SiteSettings }) {
  return (
    <header className='sticky top-0 z-20 border-white/10 border-b bg-brand-ink/90 backdrop-blur-md'>
      {/* py-2.5 + the 36px mark = the 56px bar home's -mt-14 hero tuck matches. */}
      <div className='relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-2.5'>
        <Link
          to='/'
          className='flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
        >
          <span className='flex size-9 shrink-0 items-center overflow-hidden rounded-md border-line-soft/40'>
            <img src={settings.logoImageUrl ?? '/photos/sd.png'} alt='' aria-hidden='true' />
          </span>
          <span className='flex items-baseline gap-2.5'>
            <span className='font-bold font-serif text-xl text-white'>{settings.brandName}</span>
            <span className='hidden font-mono text-[10px] text-brand-300 uppercase tracking-[0.18em] md:inline'>
              {settings.brandTagline}
            </span>
          </span>
        </Link>
        <div className='flex items-center gap-4 md:gap-6'>
          <nav className='hidden items-center gap-6 md:flex' aria-label='Primary'>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className='inline-flex items-center gap-1.5 rounded-sm text-brand-200 text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring aria-[current=page]:font-medium aria-[current=page]:text-white'
              >
                <span
                  className='hidden size-1.5 rounded-full bg-primary aria-[current=page]:inline-block'
                  aria-hidden='true'
                />
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            to='/book'
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-brand-deep tracking-wide hover:bg-brand-primary-hover focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book now
          </Link>
          {/* The toggle rides the glass bar (#217's ruled placement), at
              size-9 so the bar keeps its 56px height. */}
          <ThemeToggle className='inline-flex size-9 rounded-md text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring' />
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: `components/mobile-nav.tsx` — the animated panel (full rewrite)**

```tsx
import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@sevendays/ui/components/collapsible';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarPlus, Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { NAV_LINKS } from '../lib/nav';

// Mobile chrome — panel B treatment (#111 ruled) wearing #164's ruled
// animation, rebuilt on Base UI's NATIVE transition contract (the Round-6
// fix: the library stamps data-open / data-closed / data-starting-style on
// the panel and keeps it mounted through the exit transition itself —
// .nav-panel in styles.css styles those states; custom mount/unmount state
// classes fought the library and lost). The trigger rotates 90° through
// the Menu/X morph; reduced motion = instant; the panel unmounts when
// closed again — no a11y residue. CTA law: Book now carries CalendarPlus.
// Hidden at md+ where the desktop nav lives.
export function MobileNav({ links }: { links: typeof NAV_LINKS }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className='md:hidden'>
      <CollapsibleTrigger
        aria-label='Menu'
        className={cn(
          'inline-flex size-10 items-center justify-center rounded-md text-white transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring motion-reduce:transition-none',
          open && 'rotate-90'
        )}
      >
        {open ? <X className='size-5' /> : <Menu className='size-5' />}
      </CollapsibleTrigger>
      <CollapsibleContent className='nav-panel absolute inset-x-0 top-full z-10 border-white/15 border-t bg-brand-ink'>
        <nav className='mx-auto max-w-5xl px-6 py-4' aria-label='Mobile'>
          {links.map((link, i) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className='flex items-center justify-between gap-4 border-white/10 border-b py-3 text-base text-brand-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring aria-[current=page]:font-medium aria-[current=page]:text-white'
            >
              {link.label}
              <span className='font-mono text-brand-300 text-xs'>
                {String(i + 1).padStart(2, '0')}
              </span>
            </Link>
          ))}
          <Link
            to='/book'
            onClick={() => setOpen(false)}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-4 w-full bg-brand-deep tracking-wide hover:bg-brand-primary-hover focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book now
          </Link>
        </nav>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

- [ ] **Step 4: `components/announcement-banner.tsx` (new) + the `.nav-panel` CSS**

```tsx
import type { SiteSettings } from '@sevendays/types';
import { bannerFor } from '../lib/site-chrome';

// The settings-driven announcement banner (M7 #223 — the #215 Site tab's
// banner fields worn by the landing chrome): a slim wash strip ABOVE the
// sticky bar, scrolling away with the page — quiet by the thesis. The gate
// law lives in bannerFor: off or untitled renders NOTHING (never a broken
// strip). Unrated composition (no prototype precedent — settings post-date
// the arc); the variants round ratifies.
export function AnnouncementBanner({ settings }: { settings: SiteSettings }) {
  const banner = bannerFor(settings);
  if (!banner) return null;
  return (
    <aside aria-label='Announcement' className='border-line-soft border-b bg-wash-b'>
      <div className='mx-auto max-w-5xl px-6 py-3'>
        <p className='text-foreground font-medium text-sm'>{banner.title}</p>
        {banner.body ? <p className='text-muted-foreground mt-0.5 text-sm'>{banner.body}</p> : null}
      </div>
    </aside>
  );
}
```

In `apps/landing/src/styles.css`, append at the file's end (after the existing `@layer base` block):

```css
/* #164 Round 4 scope rider (owner ruling), built M7 #223: the mobile menu
   panel animates on Base UI's native transition contract — the library
   stamps data-open / data-closed / data-starting-style / data-ending-style
   on the panel and keeps it mounted through the exit transition itself.
   Closed = lifted and transparent; opening drops it in; closing lifts it
   out. Reduced motion = instant. */
.nav-panel {
  transition:
    opacity 200ms ease-out,
    transform 200ms ease-out;
}

.nav-panel[data-closed],
.nav-panel[data-starting-style] {
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .nav-panel {
    transition: none;
  }
}
```

- [ ] **Step 5: `components/site-footer.tsx` — the contact truth (full rewrite)**

```tsx
import type { BranchRead, SiteSettings } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { Phone } from 'lucide-react';
import { NAV_LINKS } from '../lib/nav';
import { footerContactFor, socialLinksFor } from '../lib/site-chrome';

// Site chrome, the ink band — the page's one dark frame, wearing the ruled
// redesign (#164 Round 1; built M7 #223): the wordmark consumes the
// settings brand (name + mono kicker, md+), the footer carries the
// 3-branch contact truth read live from the API (tel: links + walk-in
// lines), the settings socials and brand contact block, and the outline
// call affordance (Phone icon — the CTA law; outline weight is the law on
// this surface). Deliberately NO booking CTA — the footer is identical
// pre/post v1-scrub (M3 ruling).
const LINK_ON_INK =
  'font-mono text-brand-300 text-xs uppercase tracking-[0.14em] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring';

export function SiteFooter({
  settings,
  branches,
}: {
  settings: SiteSettings;
  branches: BranchRead[];
}) {
  const socials = socialLinksFor(settings);
  const contact = footerContactFor(settings);

  return (
    <footer className='bg-brand-ink'>
      <div className='mx-auto max-w-5xl px-6 py-10'>
        <div className='flex flex-col justify-between gap-8 md:flex-row md:items-center'>
          <Link
            to='/'
            className='flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          >
            <span className='relative flex size-9 shrink-0 items-center overflow-hidden rounded-md border-line-soft/40'>
              <img src={settings.logoImageUrl ?? '/photos/sd.png'} alt='' aria-hidden='true' />
            </span>
            <span className='flex items-baseline gap-2.5'>
              <span className='font-bold font-serif text-xl text-white'>{settings.brandName}</span>
              {/* The Round-1 ruling: the header's kicker treatment in the
                  footer too — desktop-only (md+). */}
              <span className='hidden font-mono text-[10px] text-brand-300 uppercase tracking-[0.18em] md:inline'>
                {settings.brandTagline}
              </span>
            </span>
          </Link>
          <nav
            className='flex flex-col gap-2 md:flex-row md:items-center md:gap-6'
            aria-label='Footer'
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className='rounded-sm text-brand-200 text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring aria-[current=page]:font-medium aria-[current=page]:text-white'
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <Phone className='size-4' aria-hidden='true' />
            Call or visit a branch
          </Link>
        </div>
        {branches.length > 0 && (
          <div className='mt-8 grid gap-3 border-white/20 border-t pt-5 sm:grid-cols-3'>
            {branches.map((branch) => (
              <div key={branch.id}>
                <p className='text-white/90 text-sm'>{branch.name}</p>
                <a href={`tel:${branch.phone.replace(/\s/g, '')}`} className={LINK_ON_INK}>
                  {branch.phone}
                </a>
                <p className='text-white/60 text-xs'>
                  {branch.acceptsWalkIns ? 'Walk-ins welcome' : 'By appointment'}
                </p>
              </div>
            ))}
          </div>
        )}
        {(socials.length > 0 || contact !== null) && (
          <div className='mt-6 border-white/20 border-t pt-5'>
            <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
              {socials.map((social) => (
                <a key={social.key} href={social.href} className={LINK_ON_INK}>
                  {social.label}
                </a>
              ))}
              {contact?.email ? (
                <a href={`mailto:${contact.email}`} className={LINK_ON_INK}>
                  {contact.email}
                </a>
              ) : null}
              {contact?.phone ? (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className={LINK_ON_INK}>
                  {contact.phone}
                </a>
              ) : null}
            </div>
          </div>
        )}
        <div className='mt-6 border-white/20 border-t pt-4'>
          <p className='text-white/70 text-xs'>
            © 2026 {settings.brandName} {settings.brandTagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
```

*(Socials render as mono text labels — lucide carries no TikTok glyph and mixed icon/text rows read worse than one consistent register. Unrated; the round may rule brand SVGs.)*

- [ ] **Step 6: `components/not-found.tsx` + `components/error-component.tsx` (new)**

```tsx
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { Phone } from 'lucide-react';

// Branded global 404 (#164 Round 1, owner-ruled: white body, no logo — the
// earlier ink field left a light band above the footer on tall desktop
// viewports, so min-h-full makes the white own the page's full stretch
// between header and footer; dark returns the ink field — the ruled
// pre-light look). GLOBAL at __root (M7 #223): the two route-level
// notFound() overrides are gone — unknown routes AND unknown/inactive
// slugs/ids all wear this one surface. Copy is the prototype's DRAFT —
// TODO(owner-copy), the round ratifies.
export function NotFound() {
  return (
    <div className='min-h-full bg-white dark:bg-brand-ink'>
      <div className='mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-24 md:py-32'>
        {/* TODO(owner-copy): headline + body — the prototype drafts, the round ratifies. */}
        <h1 className='max-w-2xl font-bold font-serif text-4xl text-brand-ink md:text-5xl dark:text-foreground'>
          This page never developed.
        </h1>
        <p className='max-w-xl text-muted-foreground'>
          The page you're looking for doesn't exist or has moved. The rest of the studio is right
          where you left it.
        </p>
        <div className='flex flex-wrap gap-3'>
          <Link
            to='/'
            className={cn(
              buttonVariants(),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Back to home
          </Link>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <Phone className='size-4' aria-hidden='true' />
            Call or visit a branch
          </Link>
        </div>
      </div>
    </div>
  );
}
```

```tsx
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';

// Branded global error surface (#164 Round 1; the ink-field family member
// per #223 — ink + logo + a way forward). Dependency-free by contract:
// when this renders, the API may be the thing that failed, so no fetched
// content, no photos — ink, type, and the reload button only. The dev-only
// error line stays (import.meta.env.DEV never ships). Copy is the
// prototype's DRAFT — TODO(owner-copy), the round ratifies.
export function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className='bg-brand-ink'>
      <div className='mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-24 md:py-32'>
        <img src='/photos/sd.png' alt='' aria-hidden='true' className='size-12 rounded-md' />
        {/* TODO(owner-copy): headline + body — the prototype drafts, the round ratifies. */}
        <h1 className='max-w-2xl font-bold font-serif text-4xl text-white md:text-5xl'>
          Something went wrong.
        </h1>
        <p className='max-w-xl text-brand-200'>
          An unexpected error interrupted the page. Try again — or reach the studio directly and
          we'll take it from there.
        </p>
        <div className='flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className={cn(
              buttonVariants(),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Try again
          </button>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Call or visit a branch
          </Link>
        </div>
        {error instanceof Error && import.meta.env.DEV ? (
          <pre className='max-w-full overflow-auto rounded-md bg-white/5 p-4 text-white/60 text-xs'>
            {error.message}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: `routes/__root.tsx` — the chrome loader + the global wiring (full rewrite of the route def + RootDocument)**

The `head` block is UNCHANGED from today (document titles ride #224). Everything else:

```tsx
import { ThemeProvider } from '@sevendays/ui/components/theme-provider';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';

import { AnnouncementBanner } from '../components/announcement-banner';
import { ErrorComponent } from '../components/error-component';
import { NotFound } from '../components/not-found';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import PostHogProvider from '../integrations/posthog/provider';
import { branchQueries, siteSettingsQueries } from '../lib/queries';

import appCss from '../styles.css?url';

// The router context: carries the per-request QueryClient to every loader.
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // The chrome's reads (M7 #223): site settings + the branch truth the
  // footer carries, ensured once per entry (the root loader does not re-run
  // on client navigations — fresh per page load, the M5 freshness rule).
  // NEVER-THROWING by construction (allSettled): a dead settings/branches
  // read degrades the chrome to code defaults and an empty branch block;
  // pages whose own loaders are healthy never inherit a chrome failure —
  // and a failing page still renders its error surface inside a working
  // chrome.
  loader: async ({ context: { queryClient } }) => {
    await Promise.allSettled([
      queryClient.ensureQueryData(siteSettingsQueries.all()),
      queryClient.ensureQueryData(branchQueries.all()),
    ]);
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Sevendays Photography',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  // The branded global chrome (#164 Round 1; built #223): unknown routes
  // AND every notFound() thrown by a route without its own override land
  // on the one ruled surface.
  notFoundComponent: NotFound,
  errorComponent: ({ error }) => (
    <ErrorComponent error={error instanceof Error ? error : new Error(String(error))} />
  ),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  // The never-broken law (#215): a failed or missing read renders the
  // defaults — a born-empty row and a dead API render the same chrome.
  const { data: settings } = useQuery(siteSettingsQueries.all());
  const { data: branches } = useQuery(branchQueries.all());
  const resolved = settings ?? SITE_SETTINGS_DEFAULTS;

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute='class'
          defaultTheme='light'
          enableSystem={false}
          disableTransitionOnChange
        >
          <PostHogProvider>
            <div className='flex min-h-screen flex-col'>
              <AnnouncementBanner settings={resolved} />
              <SiteHeader settings={resolved} />
              <main className='flex-1'>{children}</main>
              <SiteFooter settings={resolved} branches={branches ?? []} />
            </div>
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          </PostHogProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Remove the two route-level `notFoundComponent` overrides**

(a) `apps/landing/src/routes/packages/$slug.tsx` — delete the whole `notFoundComponent: () => (…)` prop and its comment; the now-unused `buttonVariants`/`Link`/`cn` imports and the `PackageDetail` section wrapper stay only if still referenced (the detail component keeps `PackageCard` — biome's fix flags the dead imports; delete them). Replace the loader-catch comment with:

```ts
    // Unknown/inactive slug → the router's notFound() — the ROOT's global
    // NotFound answers (M7 #223; the route-level override is gone).
```

(b) `apps/landing/src/routes/booking.$id.tsx` — delete the `notFoundComponent: () => (…)` prop and its comment block the same way (the component body's own imports stay — the confirmation card uses them; only what the deleted block alone used goes). The `toNotFoundError` loader seam stays UNTOUCHED (it is the 404→notFound() mapping; only the rendering surface moved to the root).

- [ ] **Step 9: The admin rider — the sidebar brand block**

(a) `apps/admin/src/routes/_shell.tsx` — add a loader beside `beforeLoad` (import `siteSettingsQuery` from `#/lib/cms-queries`):

```ts
  // M7 #223 (the plan.md consumption box's "admin sidebar" clause): the
  // shell ensures the settings read so the sidebar's brand renders
  // server-side. Guarded — a failed read renders the default wordmark and
  // never blocks the session gate.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(siteSettingsQuery.all()).catch(() => undefined);
  },
```

(b) `apps/admin/src/components/admin-sidebar.tsx` — inside `AdminSidebar`, above the return (imports: `useQuery` from `@tanstack/react-query`; `EMPTY_SITE_SETTINGS` + `resolveSiteSettings` from `@sevendays/types`; `siteSettingsQuery` from `#/lib/cms-queries`):

```ts
  // M7 #223: the brand block consumes site settings — the studio's name
  // and logo (when set) ride the sidebar; the 7d monogram is the fallback.
  // The "Admin" kicker stays fixed — it names the tool, not the brand.
  const { data: rawSettings } = useQuery(siteSettingsQuery.all());
  const settings = resolveSiteSettings(rawSettings ?? EMPTY_SITE_SETTINGS);
```

and the `SidebarHeader` block becomes:

```tsx
      <SidebarHeader>
        <div className='flex items-center gap-3 px-2 py-2'>
          {settings.logoImageUrl ? (
            <span className='bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center overflow-hidden rounded-lg'>
              <img
                src={settings.logoImageUrl}
                alt=''
                aria-hidden='true'
                className='size-full object-cover'
              />
            </span>
          ) : (
            <span className='bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
              7d
            </span>
          )}
          <div className='group-data-[collapsible=icon]:hidden'>
            <p className='text-sm leading-tight font-semibold'>{settings.brandName}</p>
            <p className='text-sidebar-foreground/60 font-mono text-[0.65rem] tracking-widest uppercase'>
              Admin
            </p>
          </div>
        </div>
      </SidebarHeader>
```

- [ ] **Step 10: Gates + commit**

`pnpm --filter @sevendays/landing fix` → `test -- --run` (**14 files / 115 tests**, unchanged counts) → `typecheck` → `build`. Then `pnpm --filter @sevendays/admin fix` → `test -- --run` (**26 files / 254 tests**) → `typecheck` → `build`. Commit:

```bash
git add apps/landing/src/lib/api.functions.ts apps/landing/src/lib/queries.ts apps/landing/src/components/site-header.tsx apps/landing/src/components/site-footer.tsx apps/landing/src/components/mobile-nav.tsx apps/landing/src/components/announcement-banner.tsx apps/landing/src/components/not-found.tsx apps/landing/src/components/error-component.tsx apps/landing/src/routes/__root.tsx apps/landing/src/styles.css apps/landing/src/routes/packages/\$slug.tsx apps/landing/src/routes/booking.\$id.tsx apps/admin/src/routes/_shell.tsx apps/admin/src/components/admin-sidebar.tsx
git commit -m "feat(landing): the ruled chrome - sticky glass ink bar, the footer contact truth, the animated menu, the settings banner, the global NotFound/Error, the admin sidebar brand (#223)"
```

### Task 3: Home — the ruled composition + the skeleton grammar (UI-bearing)

**Load the installed UI/UX skill set at execution time** (same set as Task 2). The compositions below mine the prototype's Round-2-closed rulings verbatim (owner: "all goods", 2026-10-01), adapted: `pesoOrNull` → main's null-safe `peso`, the D2 cover half → `CoverPanel`, the variant branches deleted, the settings copy consumed, the pagination through Task 1's seam.

**Files:**
- Write: `apps/landing/src/components/{reveal,mosaic-photo-grid,featured-plates,skeletons}.tsx`
- Modify: `apps/landing/src/components/{home-image-led,home-cards,home-copy}.tsx`… (`home-copy.ts` is `.ts`), `apps/landing/src/routes/index.tsx`, `apps/landing/src/styles.css`

**Interfaces:**
- Produces: `Reveal({ children, delay?, className? })` (the shared viewport-reveal wrapper); `MosaicPhotoGrid({ photos, captions? })` (the shared wall — about's portfolio reuses it at #224); `FeaturedPlates({ heading, strip })` (the D2 section); `HomeImageLed({ settings, packages, services, gallery, testimonials })`; `HomeSkeleton`.
- Consumes: Task 1's `spanFor`/`paginateTestimonials`; Task 2's resolved `SiteSettings`; `ServiceImageCard` + `serviceBackground` from `home-cards.tsx`; `CoverPanel`; `HERO_PHOTO`/`HERO_PHOTO_ALT`.

**Not here:** captions ON (about's wall, #224); the catalog/service/branch surfaces (#224); any change to `ServiceImageCard` itself; the empty-state routes (Task 4); new tokens.

- [ ] **Step 1: `components/reveal.tsx` (new — the one motion grammar)**

```tsx
import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';

// The viewport reveal (#164 owner rulings, Rounds 2 + 3): fade-and-rise
// once when the element enters the viewport; staggered per column via
// `delay`; prefers-reduced-motion shows immediately. Lives in its own
// module so the home mosaic and the (#224) catalog index share the one
// motion grammar.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  /** Grid-span classes land here — the reveal div IS the grid child. */
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: `components/mosaic-photo-grid.tsx` (new — the shared wall)**

```tsx
import type { PublicGalleryPhoto } from '@sevendays/types';
import { cn } from 'cn';
import { spanFor } from '../lib/mosaic';
import { Reveal } from './reveal';

// The mosaic photo wall (#164 Round 2, owner-ruled): fixed row heights, the
// deterministic 2×2/2×1 span rhythm (Task 1's seam), dense packing, and the
// shared viewport reveal staggered per column. Shared by the home gallery
// strip now and (#224) the about portfolio — the two surfaces speak one
// wall. Home ruled title-captions OFF; about renders them when present.
const ROW_HEIGHTS = 'auto-rows-[9rem] md:auto-rows-[11rem]';

export function MosaicPhotoGrid({
  photos,
  captions = false,
}: {
  photos: PublicGalleryPhoto[];
  /** Captions render only when a photo carries one AND the surface asks. */
  captions?: boolean;
}) {
  return (
    <div className={cn('mt-8 grid grid-flow-dense grid-cols-2 gap-4 md:grid-cols-4', ROW_HEIGHTS)}>
      {photos.map((photo, i) => (
        <Reveal key={photo.id} delay={(i % 4) * 90} className={spanFor(i)}>
          <figure className='border-line-soft bg-card h-full overflow-hidden rounded-xl border shadow-sm'>
            <img
              src={photo.photoUrl}
              alt={photo.title ?? 'Studio gallery photograph'}
              className='h-full w-full object-cover'
              loading='lazy'
            />
            {captions && photo.caption ? (
              <figcaption className='text-muted-foreground px-3 pb-2 font-mono text-[11px]'>
                {photo.caption}
              </figcaption>
            ) : null}
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
```

*(Caption source is `photo.caption` — #214's ruled public-wire caption field; `title` stays the alt-text fallback, exactly as about's wall renders today.)*

- [ ] **Step 3: `components/featured-plates.tsx` (new — D2 alone)**

```tsx
import type { ResolvedPackageInclusion, ServicePackageRead } from '@sevendays/types';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { peso } from '../lib/format';
import { CoverPanel } from './cover-panel';

// The featured strip, OWNER-RULED D2 "light split plate" (#164 Round 2 —
// "I think I'll go with D2"): the cover is 60% of the plate at natural
// quality (no overlay touches it — the CoverPanel law renders the muted
// placeholder when a row has no cover), the light panel carries serif
// name, mono peso (nothing when unpriced — the #163 law), a subline, and
// dotted inclusion lines; short PRIMARY ticks separate the plates. The
// losing variants (rate card, editorial index, plate+lineup, ink panel,
// the retired parallax) stay on the prototype branch — nothing merges.

function subline(p: ServicePackageRead): string {
  const mins = p.durationMinutes;
  const incls = p.inclusions.length;
  return [mins != null ? `${mins} min` : null, `${incls} inclusion${incls === 1 ? '' : 's'}`]
    .filter(Boolean)
    .join(' · ');
}

/** The inclusion phrase — the InclusionsList format (the data composes the
 * line: kind/quantity/printSize/description/attires; there is no name). */
function inclusionLine(inc: ResolvedPackageInclusion): string {
  return [
    inc.quantity !== null ? `×${inc.quantity}` : null,
    inc.printSize ? inc.printSize.code : null,
    inc.description,
    inc.attires.length > 0 ? inc.attires.map((a) => a.name).join(', ') : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');
}

export function FeaturedPlates({
  heading,
  strip,
}: {
  heading: string;
  strip: ServicePackageRead[];
}) {
  return (
    <section className='mx-auto max-w-5xl px-6 pt-16' data-strip='featured'>
      {/* One voice per section (owner ruling): the serif heading alone. */}
      <h2 className='font-semibold font-serif text-3xl text-brand-ink dark:text-foreground'>
        {heading}
      </h2>
      <div className='pt-8 pb-16'>
        {strip.map((p, i) => {
          const flip = i % 2 === 1;
          const shown = p.inclusions.slice(0, 4);
          const more = p.inclusions.length - shown.length;
          return (
            <div key={p.id}>
              {i > 0 && (
                <div aria-hidden='true' className='flex justify-center py-8'>
                  <span className='bg-primary h-0.5 w-16 rounded-full' />
                </div>
              )}
              <Link
                to='/packages/$slug'
                params={{ slug: p.slug }}
                className='group border-line-soft bg-card grid overflow-hidden rounded-xl border shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring md:grid-cols-5'
              >
                <div
                  className={cn('relative min-h-56 md:col-span-3 md:min-h-[22rem]', flip && 'md:order-2')}
                >
                  <CoverPanel
                    name={p.name}
                    coverImageUrl={p.coverImageUrl}
                    className='absolute inset-0 size-full rounded-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100'
                  />
                </div>
                <div
                  className={cn(
                    'flex flex-col justify-center gap-1 p-6 md:col-span-2 md:p-8',
                    flip && 'md:order-1'
                  )}
                >
                  <h3 className='font-semibold font-serif text-2xl text-brand-ink dark:text-foreground'>
                    {p.name}
                  </h3>
                  {/* The unpriced law: peso(null) renders nothing — no
                      placeholder, no inquire line, the panel reflows. */}
                  <p className='font-mono text-brand-700 text-sm dark:text-brand-300'>
                    {peso(p.priceCents)}
                  </p>
                  <p className='text-muted-foreground text-sm'>{subline(p)}</p>
                  <ul className='mt-3 space-y-1.5'>
                    {shown.map((inc) => (
                      <li
                        key={inc.id}
                        className='text-foreground/85 flex items-center gap-2 text-sm'
                      >
                        <span className='bg-primary size-1 shrink-0 rounded-full' />
                        <span className='min-w-0'>{inclusionLine(inc)}</span>
                      </li>
                    ))}
                    {more > 0 && (
                      <li className='text-muted-foreground font-mono text-[11px]'>
                        +{more} more inclusion{more === 1 ? '' : 's'}
                      </li>
                    )}
                  </ul>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: `components/home-image-led.tsx` — the ruled composition (full rewrite)**

```tsx
import type {
  GalleryRead,
  PublicTestimonial,
  ServicePackageRead,
  SiteSettings,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { selectFeaturedPackages } from '../lib/featured';
import { paginateTestimonials } from '../lib/home-testimonials';
import { FeaturedPlates } from './featured-plates';
import { ServiceImageCard } from './home-cards';
import { HERO_PHOTO, HERO_PHOTO_ALT } from './home-copy';
import { MosaicPhotoGrid } from './mosaic-photo-grid';

// The ruled home composition (#164 Round 2, closed "all goods" 2026-10-01;
// built M7 #223), one voice per section (kickers retired; serif headings
// carry — the settings kicker fields drive the heading TEXT now, defaults
// in code). Slot map: 1 hero under the glass bar (-mt-14 — the photo reads
// through the bar) → 2 the LIVE mosaic gallery (no title-captions on home)
// → 3 featured as D2 light split plates → 4 the full-bleed 3-copy services
// marquee (desktop) / JS transform stepper (mobile) → 5 REAL testimonials,
// paginated 3/page with a page-change reveal → 6 the #92 emphasis strip.
// The copy consumes site settings end to end (hero title/blurb, eyebrow,
// the four section headings) — defaults when unset.
const SIDES_COUNT = 2;

export function HomeImageLed({
  settings,
  packages,
  services,
  gallery,
  testimonials,
}: {
  settings: SiteSettings;
  packages: ServicePackageRead[];
  services: StudioServiceWithBranches[];
  gallery: GalleryRead;
  testimonials: PublicTestimonial[];
}) {
  const selection = selectFeaturedPackages(packages);
  const featuredHeading = selection.isFeatured ? settings.kickerPackages : selection.heading;
  // Round 2 owner ruling: paginated testimonials — 3 per page (a
  // pull-quote lead + side rail on every page), non-looping.
  const pages = paginateTestimonials(testimonials);
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, Math.max(0, pages.length - 1));
  const current = pages[safePage]?.items ?? [];
  const lead = current[0];
  const sides = current.slice(1, SIDES_COUNT + 1);
  // OWNER-RULED: the services carousel on MOBILE is a JS transform stepper
  // — each card CENTERED in the viewport, one card per 3.5s interval, drag
  // with snap-to-nearest on release, wrapping seamlessly through the
  // identical loop copies. Scroll-snap + programmatic smooth scrolling
  // proved browser-fragile twice in the arc, so NO native scrolling is
  // involved: the track moves by transform, the container never scrolls.
  // DESKTOP keeps the pure CSS marquee — the md: animation overrides the
  // inline transform, and every stepper path early-returns at md. Reduced
  // motion = instant steps, still on the interval (auto-scroll is the
  // owner's explicit ask).
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const vIndex = useRef(0);
  const dragRef = useRef<{ startX: number; baseV: number; lastDx: number } | null>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    const track = trackRef.current;
    if (!carousel || !track) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

    const apply = (smooth: boolean) => {
      const first = track.children[0] as HTMLElement | undefined;
      if (!first) return;
      const cardW = first.offsetWidth;
      const centerOffset = Math.max(0, (carousel.clientWidth - (cardW - 16)) / 2);
      track.style.transition = smooth && !reduced ? 'transform 500ms ease-out' : 'none';
      track.style.transform = `translateX(${centerOffset - vIndex.current * cardW}px)`;
    };
    const count = services.length;

    const id = setInterval(() => {
      if (dragRef.current || isDesktop()) return;
      vIndex.current += 1;
      apply(true);
      if (vIndex.current >= count) {
        // Slid into the identical first loop copy — normalize silently
        // once the transition has settled (identical pixels, invisible).
        window.setTimeout(() => {
          vIndex.current -= count;
          apply(false);
        }, 540);
      }
    }, 3500);

    const onDown = (e: PointerEvent) => {
      if (isDesktop()) return;
      dragRef.current = { startX: e.clientX, baseV: vIndex.current, lastDx: 0 };
      carousel.setPointerCapture?.(e.pointerId);
      track.style.transition = 'none';
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const first = track.children[0] as HTMLElement | undefined;
      if (!first) return;
      const cardW = first.offsetWidth;
      const centerOffset = Math.max(0, (carousel.clientWidth - (cardW - 16)) / 2);
      d.lastDx = e.clientX - d.startX;
      track.style.transform = `translateX(${centerOffset - (d.baseV * cardW + d.lastDx)}px)`;
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      const first = track.children[0] as HTMLElement | undefined;
      if (!first) return;
      const cardW = first.offsetWidth;
      let v = Math.max(0, Math.round(d.baseV + d.lastDx / cardW));
      if (v >= count) v -= count;
      vIndex.current = v;
      apply(true);
    };
    const onResize = () => {
      if (!isDesktop()) apply(false);
    };

    carousel.addEventListener('pointerdown', onDown);
    carousel.addEventListener('pointermove', onMove);
    carousel.addEventListener('pointerup', onUp);
    carousel.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', onResize);
    apply(false);
    return () => {
      clearInterval(id);
      carousel.removeEventListener('pointerdown', onDown);
      carousel.removeEventListener('pointermove', onMove);
      carousel.removeEventListener('pointerup', onUp);
      carousel.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', onResize);
    };
    // The stepper owns the carousel's whole mobile behavior; the card list
    // is its only data dependency. The refs are never stale; apply/step
    // helpers close over them.
    // biome-ignore lint/correctness/useExhaustiveDependencies: the stepper reads refs (never stale) and services.length; apply/step helpers close over refs.
  }, [services.length]);

  return (
    <div>
      {/* 1 — Hero under the glass bar: the photo reads through the ruled
          chrome (-mt-14 = the 56px bar). Copy consumes settings (title,
          blurb, brand eyebrow) — the incumbent photo and CTAs stand. */}
      <section className='relative isolate overflow-hidden bg-brand-ink -mt-14'>
        <img
          src={HERO_PHOTO}
          alt={HERO_PHOTO_ALT}
          className='absolute inset-0 size-full object-cover opacity-55'
        />
        <div
          className='absolute inset-0 bg-gradient-to-r from-brand-ink via-brand-ink/80 to-brand-ink/20'
          aria-hidden='true'
        />
        <div className='relative mx-auto max-w-5xl px-6 py-24 md:py-36'>
          <p className='text-brand-300 font-mono text-xs font-bold uppercase tracking-[0.16em]'>
            {settings.brandName} {settings.brandTagline}
          </p>
          <h1 className='mt-4 max-w-2xl font-serif text-5xl font-bold text-white md:text-6xl'>
            {settings.homeTitle}
          </h1>
          <p className='mt-5 max-w-prose text-lg text-white/90'>{settings.homeDescription}</p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <Link
              to='/book'
              className={cn(
                buttonVariants({ size: 'lg' }),
                'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
              )}
            >
              <CalendarPlus className='size-4' aria-hidden='true' />
              Book now
            </Link>
            <Link
              to='/services'
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
              )}
            >
              Services
            </Link>
          </div>
        </div>
      </section>

      {/* 2 — Gallery: the LIVE read's mosaic wall — no title-captions on
          home (ruled; captions render on about's wall, #224). */}
      <section className='border-line-soft border-b' data-strip='gallery'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <h2 className='font-semibold font-serif text-3xl text-brand-ink dark:text-foreground'>
            {settings.kickerGallery}
          </h2>
          {gallery.photos.length > 0 ? (
            <MosaicPhotoGrid photos={gallery.photos} />
          ) : (
            // The shared wall's ruled line (about's placeholder law) — a
            // zero-photo read still reads as deliberate.
            <p className='text-muted-foreground mt-8'>Portfolio coming soon.</p>
          )}
          <Link
            to='/about'
            className='text-brand-700 hover:text-brand-800 mt-6 inline-block text-sm font-medium underline underline-offset-4 dark:text-brand-300 dark:hover:text-brand-200'
          >
            More of the work on About
          </Link>
        </div>
      </section>

      {/* 3 — Featured packages: the ruled D2 plates. The M5 empty-state
          rule stands: zero ACTIVE packages collapse the strip ENTIRELY. */}
      {packages.length > 0 && <FeaturedPlates heading={featuredHeading} strip={selection.packages} />}

      {/* 4 — Services: the full-bleed 3-copy marquee (desktop) — the track
          holds the list three times so -33.3333% is one copy-width (two
          full copies always remain behind the loop point on any screen);
          hover pauses; the edge mask fades the cards at the viewport. A
          zero-service read collapses the section (the featured-collapse
          precedent). */}
      {services.length > 0 && (
        <section className='border-line-soft border-y bg-wash-a' data-strip='services'>
          <div className='mx-auto max-w-5xl px-6 pt-16'>
            <h2 className='font-semibold font-serif text-3xl text-brand-ink dark:text-foreground'>
              {settings.kickerServices}
            </h2>
          </div>
          <div
            ref={carouselRef}
            className='group mt-8 touch-pan-y overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4rem,black_calc(100%_-_4rem),transparent)]'
          >
            <div
              ref={trackRef}
              className='flex w-max md:animate-[marquee_45s_linear_infinite] motion-reduce:md:animate-none group-hover:[animation-play-state:paused]'
            >
              {services.map((s) => (
                <div key={s.id} className='w-80 shrink-0 pr-4 md:w-96'>
                  <ServiceImageCard service={s} />
                </div>
              ))}
              {services.map((s) => (
                <div
                  key={`loop-1-${s.id}`}
                  aria-hidden='true'
                  className='w-80 shrink-0 pr-4 md:w-96'
                >
                  <ServiceImageCard service={s} />
                </div>
              ))}
              {services.map((s) => (
                <div
                  key={`loop-2-${s.id}`}
                  aria-hidden='true'
                  className='w-80 shrink-0 pr-4 md:w-96'
                >
                  <ServiceImageCard service={s} />
                </div>
              ))}
            </div>
          </div>
          <div className='mx-auto max-w-5xl px-6 pb-16'>
            <Link
              to='/services'
              className='text-brand-700 hover:text-brand-800 mt-6 inline-block text-sm font-medium underline underline-offset-4 dark:text-brand-300 dark:hover:text-brand-200'
            >
              View all services
            </Link>
          </div>
        </section>
      )}

      {/* 5 — Testimonials: REAL client words (the audit's stand-in gap
          closes), paginated with a page-change reveal. */}
      <section className='border-line-soft border-y bg-wash-b' data-strip='testimonials'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <h2 className='font-semibold font-serif text-3xl text-brand-ink dark:text-foreground'>
            {settings.kickerTestimonials}
          </h2>
          {lead ? (
            <>
              {/* The page content re-reveals on every page change (keyed by
                  page id; reduced motion swaps to a plain fade). */}
              <div
                key={pages[safePage]?.id ?? 'page-empty'}
                className='mt-8 grid gap-8 motion-safe:animate-[reveal_500ms_ease-out_both] md:grid-cols-5'
              >
                <figure className='md:col-span-3'>
                  <blockquote className='font-semibold font-serif text-3xl text-brand-ink leading-snug dark:text-foreground'>
                    “{lead.quote}”
                  </blockquote>
                  <figcaption className='mt-4'>
                    <p className='text-brand-700 font-mono text-xs font-bold uppercase tracking-wider dark:text-brand-400'>
                      {lead.person}
                    </p>
                  </figcaption>
                </figure>
                <div className='flex flex-col gap-6 md:col-span-2'>
                  {sides.map((t) => (
                    <figure key={t.id} className='border-line-soft border-l-2 pl-4'>
                      <blockquote className='text-brand-ink dark:text-foreground'>
                        {t.quote}
                      </blockquote>
                      <figcaption className='mt-2'>
                        <p className='text-brand-700 font-mono text-xs font-bold uppercase tracking-wider dark:text-brand-400'>
                          {t.person}
                        </p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
              {pages.length > 1 && (
                <div className='mt-8 flex items-center gap-4'>
                  <button
                    type='button'
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    aria-label='Previous testimonials'
                    className='border-line-soft bg-card text-brand-ink inline-flex size-9 items-center justify-center rounded-full border transition-opacity hover:bg-wash-a focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring disabled:opacity-40 dark:text-foreground'
                  >
                    <ChevronLeft className='size-4' aria-hidden='true' />
                  </button>
                  <div className='flex gap-2'>
                    {pages.map((p, i) => (
                      <button
                        key={p.id}
                        type='button'
                        onClick={() => setPage(i)}
                        aria-label={`Testimonials page ${i + 1}`}
                        aria-current={i === safePage ? 'true' : undefined}
                        className={cn(
                          'focus-visible:ring-brand-focus-ring size-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3',
                          i === safePage
                            ? 'bg-brand-ink'
                            : 'bg-brand-gray-cool hover:bg-brand-700'
                        )}
                      />
                    ))}
                  </div>
                  <button
                    type='button'
                    onClick={() => setPage(Math.min(pages.length - 1, safePage + 1))}
                    disabled={safePage === pages.length - 1}
                    aria-label='Next testimonials'
                    className='border-line-soft bg-card text-brand-ink inline-flex size-9 items-center justify-center rounded-full border transition-opacity hover:bg-wash-a focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring disabled:opacity-40 dark:text-foreground'
                  >
                    <ChevronRight className='size-4' aria-hidden='true' />
                  </button>
                </div>
              )}
              <Link
                to='/about'
                className='text-brand-700 hover:text-brand-800 mt-6 inline-block text-sm font-medium underline underline-offset-4 dark:text-brand-300 dark:hover:text-brand-200'
              >
                More kind words — and share your own
              </Link>
            </>
          ) : (
            // The ruled empty line — real rows arrive with the CMS.
            <p className='text-muted-foreground mt-6'>
              Client words are on their way — check back soon.
            </p>
          )}
        </div>
      </section>

      {/* 6 — Emphasis strip: the ratified #92 gray-light band. */}
      <section className='border-line-soft border-t bg-brand-gray-light' data-strip='call-visit'>
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='font-semibold font-serif text-brand-ink text-xl dark:text-foreground'>
              Not sure which session fits?
            </h2>
            <p className='text-brand-700 mt-1 text-sm dark:text-brand-400'>
              Call or visit a branch — we will help you choose.
            </p>
          </div>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Find a branch
          </Link>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: The supporting deltas**

(a) `apps/landing/src/components/home-cards.tsx` — DELETE `PackageCoverCard`, `ChipCluster`, `packageChips`, `privilegeLabel`, and the `BookNow` helper (home-featured-only; grep-verified zero other importers); KEEP `ServiceImageCard` + `serviceBackground` + the module's header comment trimmed to describe them. The `Popover` imports and `CoverPanel` import die with the deletions (biome's fix flags them).

(b) `apps/landing/src/components/home-copy.ts` — reduce to the two hero constants + a comment noting where copy lives now:

```ts
// Home copy (M7 #223): every word the home page renders now consumes site
// settings (hero title/blurb, the four section headings) — defaults in
// code at SITE_SETTINGS_DEFAULTS (#215); the stand-in gallery and the
// placeholder testimonials are RETIRED with the ruled redesign (the live
// reads render; content gaps are owner-owned per the #164 resolution).
export const HERO_PHOTO = '/photos/cover_photo.jpg';
export const HERO_PHOTO_ALT =
  'Photographer holding a Canon DSLR by the studio window — the studio’s own photo';
```

(c) `apps/landing/src/routes/index.tsx` (full rewrite):

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { HomeImageLed } from '../components/home-image-led';
import { HomeSkeleton } from '../components/skeletons';
import {
  galleryQueries,
  servicePackageQueries,
  siteSettingsQueries,
  studioServiceQueries,
  testimonialQueries,
} from '../lib/queries';

// Home wears the ruled #164 composition (built M7 #223): hero under the
// glass bar → the live mosaic gallery → D2 featured plates → the services
// marquee → REAL paginated testimonials → the emphasis strip. The loader
// ensures all four reads + the chrome's settings (the root loader already
// ensured settings; this ensure is idempotent cache-wise and keeps the
// route honest standalone).
export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(siteSettingsQueries.all()),
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(galleryQueries.all()),
      queryClient.ensureQueryData(testimonialQueries.all()),
    ]);
  },
  component: HomePage,
  // The skeleton grammar (#164 Round 5): client navigations only — first
  // loads are server-rendered (the M5 freshness rule); judge by throttling
  // in devtools while clicking between pages.
  pendingComponent: HomeSkeleton,
});

function HomePage() {
  const { data: settings } = useSuspenseQuery(siteSettingsQueries.all());
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: gallery } = useSuspenseQuery(galleryQueries.all());
  const { data: testimonials } = useSuspenseQuery(testimonialQueries.all());

  return (
    <HomeImageLed
      settings={settings}
      packages={packages}
      services={services}
      gallery={gallery}
      testimonials={testimonials}
    />
  );
}
```

(d) `apps/landing/src/components/skeletons.tsx` (new — the grammar's first silhouette):

```tsx
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { cn } from 'cn';
import { spanFor } from '../lib/mosaic';

// The skeleton grammar (#164 Round 5, owner-ruled: "emphasize the loading
// skeletons a little bit" → the brand-tinted sweep): structure-only
// silhouettes per surface on the shared Tier-1 skeleton primitive — no
// per-element spinners, first loads server-rendered; these render as route
// pendingComponents on client navigations. The .skeleton-grammar wrapper
// (styles.css) rides the sweep over every skeleton inside it. Home is
// #223's silhouette; the per-surface skeletons (#224's surfaces) join
// their surfaces at #224.
const SLOTS_8 = [1, 2, 3, 4, 5, 6, 7, 8];

export function HomeSkeleton() {
  return (
    <div className='skeleton-grammar'>
      <div className='mx-auto max-w-5xl px-6 py-24 md:py-36'>
        <Skeleton className='h-3.5 w-44' />
        <Skeleton className='mt-4 h-12 w-full max-w-2xl' />
        <Skeleton className='mt-5 h-5 w-full max-w-prose' />
        <Skeleton className='mt-8 h-11 w-36' />
      </div>
      <div className='mx-auto max-w-5xl px-6 py-16'>
        <Skeleton className='h-9 w-32' />
        <div className='mt-8 grid auto-rows-[9rem] grid-cols-2 gap-4 md:auto-rows-[11rem] md:grid-cols-4'>
          {SLOTS_8.map((slot) => (
            <Skeleton key={slot} className={cn('h-full w-full rounded-xl', spanFor(slot - 1))} />
          ))}
        </div>
      </div>
      <div className='mx-auto max-w-5xl px-6 pt-16'>
        <Skeleton className='h-9 w-48' />
        <Skeleton className='mt-8 h-56 w-full rounded-xl md:h-[22rem]' />
        <div className='flex justify-center py-8'>
          <Skeleton className='h-0.5 w-16 rounded-full' />
        </div>
        <Skeleton className='h-56 w-full rounded-xl md:h-[22rem]' />
      </div>
      <div className='border-line-soft border-y bg-wash-b px-6 py-16'>
        <div className='mx-auto max-w-5xl'>
          <Skeleton className='h-9 w-36' />
          <div className='mt-8 grid gap-8 md:grid-cols-5'>
            <Skeleton className='h-24 w-full md:col-span-3' />
            <div className='flex flex-col gap-6 md:col-span-2'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: The styles.css keyframes + the sweep**

Append to `apps/landing/src/styles.css` (after Task 2's `.nav-panel` block):

```css
/* #164 Round 2 (owner ruling), built M7 #223: the services marquee — the
   track holds the card list THREE times, so -33.3333% is one copy-width
   (a seamless loop that stays filled on any viewport: two full copies
   always remain behind the window, whatever the screen width). */
@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-33.3333%);
  }
}

/* #164 Round 2 (owner ruling), built M7 #223: the testimonial page-change
   reveal — a quick fade-and-rise, run per page via the keyed grid. */
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* #164 Round 5 (owner ruling), built M7 #223: emphasized skeletons — a
   brand-tinted sweep rides over the shared pulse inside .skeleton-grammar
   layouts. */
.skeleton-grammar [data-slot="skeleton"] {
  position: relative;
  overflow: hidden;
}

.skeleton-grammar [data-slot="skeleton"]::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    100deg,
    transparent 30%,
    color-mix(in oklab, var(--color-brand-300) 40%, transparent) 50%,
    transparent 70%
  );
  background-size: 200% 100%;
  animation: skeletonSweep 1.4s ease-in-out infinite;
}

@keyframes skeletonSweep {
  from {
    background-position: 180% 0;
  }
  to {
    background-position: -80% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-grammar [data-slot="skeleton"]::after {
    animation: none;
  }
}
```

- [ ] **Step 7: Gates + commit**

`pnpm --filter @sevendays/landing fix` → `test -- --run` (**14 files / 115 tests** — `featured.test.ts` may need its strip-selection it updated if it referenced `PackageCoverCard`-era helpers; reconcile, never loosen) → `typecheck` → `build`. Commit:

```bash
git add apps/landing/src/components/reveal.tsx apps/landing/src/components/mosaic-photo-grid.tsx apps/landing/src/components/featured-plates.tsx apps/landing/src/components/skeletons.tsx apps/landing/src/components/home-image-led.tsx apps/landing/src/components/home-cards.tsx apps/landing/src/components/home-copy.ts apps/landing/src/routes/index.tsx apps/landing/src/styles.css
git commit -m "feat(landing): the ruled home - hero under the glass bar, the live mosaic, D2 plates, the marquee + stepper, paginated real testimonials, the skeleton grammar (#223)"
```

### Task 4: The states — whole-page empty lines + Back-to-home CTAs + the DEV-gated judging (UI-bearing)

**Load the installed UI/UX skill set at execution time** (same set). These are the ruled Round-5 shapes: the whole-page empty lines gain their Back-to-home outline CTAs (owner: "Can you add a CTA to go back to home?"), and the `?empty=1` param makes them judgeable. The FILLED compositions of both routes stay exactly as they are — their redesign is #224's, fenced.

**Files:**
- Modify: `apps/landing/src/routes/packages/index.tsx`, `apps/landing/src/routes/branches.tsx`

**Interfaces:** consumes Task 1's `isEmptyJudgingParam`. Produces: nothing (route-local JSX).

**Not here:** about's in-page empties (#224 — they stay CTA-less per the ruling: "the about empties are in-page sections and stay CTA-less"); home's in-page empties (landed with the composition in Task 3); any change to the filled packages/branches surfaces (#224); any production-reachable override (the gate is `import.meta.env.DEV`-fed).

- [ ] **Step 1: `routes/packages/index.tsx` — the empty line gains its CTA + the judging gate**

Imports gain `buttonVariants` (`@sevendays/ui/components/button`), `Link` + `useLocation` (`@tanstack/react-router`), `cn` (`cn`), and `isEmptyJudgingParam` (`../../lib/empty-override`). The component becomes (the filled branch UNCHANGED from today):

```tsx
function PackagesPage() {
  // The ?empty=1 judging aid (M7 #223, #164 Round 5's mechanism): DEV-gated
  // — production builds answer false by construction, so the aid never
  // ships. The hooks run unconditionally (rules of hooks); the gate
  // renders after them.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().search);
  // The API serves only ACTIVE packages here; inactive are invisible
  // (landing CONTEXT.md: Deactivated (Service Package)).
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());

  if (isEmpty || packages.length === 0) {
    // The ruled whole-page empty line (#164 Round 5): the M5 line + the
    // Back-to-home outline CTA.
    return (
      <div className='mx-auto max-w-5xl px-6 py-12'>
        <h1 className='font-bold font-serif text-4xl text-foreground'>Packages</h1>
        {/* TODO(owner-copy): packages empty-state line — the round ratifies. */}
        <p className='text-muted-foreground mt-6'>
          No packages to show right now — check back soon.
        </p>
        <Link
          to='/'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          )}
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    /* …today's filled composition, unchanged — the plates index is #224's… */
  );
}
```

- [ ] **Step 2: `routes/branches.tsx` — the route GAINS an empty state + the judging gate**

Branches renders nothing today when the read is empty (`branches.map` over zero rows). Same imports as Step 1 (paths one level up: `../lib/empty-override`), and the component becomes (the filled branch UNCHANGED):

```tsx
function BranchesPage() {
  // The ?empty=1 judging aid (M7 #223) — DEV-gated, never ships.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().search);
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  if (isEmpty || branches.length === 0) {
    // The ruled no-branches line (#164 Round 5's copy) + the Back-to-home
    // outline CTA — a branchless read reads as deliberate, not broken.
    return (
      <div className='mx-auto max-w-5xl px-6 py-12'>
        <h1 className='font-bold font-serif text-4xl text-foreground'>Branches</h1>
        {/* TODO(owner-copy): the no-branches line — the round ratifies. */}
        <p className='text-muted-foreground mt-6'>
          Our branches are being set up — check back soon.
        </p>
        <Link
          to='/'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          )}
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    /* …today's filled composition, unchanged — the cover strips are #224's… */
  );
}
```

- [ ] **Step 3: Verify the gate is production-dead, then gates + commit**

Prove the aid never ships: `grep -rn "isEmptyJudgingParam" apps/landing/src/routes/` shows the two call sites, both feeding `import.meta.env.DEV` (the seam's own test pins the false answer). Then `pnpm --filter @sevendays/landing fix` → `test -- --run` (**14 files / 115 tests**) → `typecheck` → `build`. Commit:

```bash
git add apps/landing/src/routes/packages/index.tsx apps/landing/src/routes/branches.tsx
git commit -m "feat(landing): the ruled whole-page empty lines - Back-to-home CTAs + the DEV-gated empty judging (#223)"
```

### Task 5: The owner-reacted variants round, both themes (controller interaction)

The ticket's fourth AC: "Owner-reacted rendered variants per surface (light judged first, dark counterpart in the same round per #162)." The round is the design gate for every `TODO(owner-copy)` string this plan carries (NotFound/Error headline + body, the branches/packages empty lines, the banner composition) and the first live look at every composition Tasks 2–4 landed. The #164 rounds already ruled the direction — this round verifies the BUILD against those rulings and rules the genuinely new compositions (the banner, the settings-driven chrome, the HomeSkeleton).

**Files:**
- Modify (only if the round retunes): the files Tasks 1–4 landed (copy/classes)
- Write: the evidence dir `.superpowers/sdd/2026-10-20-223-landing-redesign-1/` (captures, the rulings)

**Interfaces:** none new — string/class-level retunes and evidence only.

**Not here:** re-litigating ruled values (the glass percentage, the span rhythm, D2, the marquee mechanics — #164 closed those; the round judges the build's fidelity and the new compositions only); the milestone-level Verify box (#225); any suite change beyond a copy-retune's same-commit test edit (`kickerGallery` default retunes edit `site-settings.test.ts` in the same commit).

- [ ] **Step 1: Seed the states and capture both themes**

Run the dev stack (`pnpm dev` — the API up; the landing on :3000, the admin on its port). Judging setup: through the ADMIN's Site tab (the dev owner account), SAVE a temporary announcement banner (title + body, active ON) — that is the banner's judging state; after the round, set it back (off) and save. Capture, in BOTH themes (the header toggle; light judged first per #162):

1. **Chrome** — the landing at rest (the glass bar over the hero), scrolled (sticky + blur over content, the wordmark desktop-only behavior at 390×844 vs desktop), the mobile menu opening/closing (the slide+fade, the trigger rotation), the footer whole (wordmark + kicker, the 3-branch contact truth live from the API, socials — temporarily set one social in the same Site-tab save if socials should judge populated, the contact block, the © line).
2. **The banner** — on (the temporary save) in both themes; then off (reverted) proving "off renders nothing."
3. **Home** — the full page desktop (hero under the glass bar, mosaic reveals on scroll, D2 plates with the petrol ticks, the marquee running + hover-pause, testimonials pagination with the page-change reveal, the emphasis strip) and at 390×844 (the stepper auto-advancing + drag-with-snap, the mosaic, the menu). Verify an UNPRICED row renders nothing where its price would be (if the dev catalog has none, toggle one row's Priced off in the CMS for the capture — the #212 law re-verified on the new surface, then revert).
4. **The skeleton grammar** — devtools network throttling (Slow 3G) while client-navigating to home (nav wordmark → /packages → Back to home): the HomeSkeleton with the brand-tinted sweep renders during the pending window.
5. **NotFound** — a bogus URL (`/nope`) light (white body, no logo) + dark (the ink field returns). **Error** — stop the API worker (`ctrl-c` the api process), reload a data page: the ink-field Error surface with Try again, inside the still-rendering chrome; restart the API after.
6. **The empty states** — `/packages?empty=1` and `/branches?empty=1` (the DEV gate answers true on the dev stack) in both themes.
7. **The admin rider** — the sidebar with the temporary brandName/logo save (the same Site-tab round), then reverted.

Save every capture to the evidence dir with a one-line narration of what it proves.

- [ ] **Step 2: The owner reacts; record + apply the rulings**

Present the captures (light first, dark in the same round). Record the rulings verbatim in the evidence dir. Then apply: (a) copy retunes edit the pinned strings in place and retire their `TODO(owner-copy)` markers (each replaced by the dated house note, or surviving verbatim where the owner defers); a `kickerGallery`-default retune lands in the SAME commit as its `site-settings.test.ts` edit; (b) composition retunes (the banner's band weight, the footer's socials register, the skeleton's density) edit the components in place; (c) if a retune lands interactive text on off-token palette classes, re-measure contrast first (≥ 4.5 for text — `scripts/measure-theme-pairs.mjs`; never edit its recorded tables without re-running).

- [ ] **Step 3: Cleanup + gates + commit**

Revert the judging saves (the banner off; any toggled unpriced row back; the socials/contact if set temporarily) THROUGH THE ADMIN — the reverted state is itself a final capture ("off renders nothing" twice). `pnpm --filter @sevendays/landing fix` → `test -- --run` → `typecheck` → `build`; if the types default retuned, also `pnpm --filter @sevendays/types test -- --run`. Commit (skip if the round changed nothing — fold the evidence into Task 6):

```bash
git add apps/landing/src packages/types/src
git commit -m "chore(landing): the redesign I variants round settled - copy and compositions as ruled, both themes (#223)"
```

### Task 6: Gates, docs rotation, PR, v1 pick, graphify

**Files:**
- Modify: `docs/plan.md`, `docs/progress.md`, `AGENTS.md`
- Post-merge: `docs/agents/v1-picks.md`, the #223 issue body, `graphify-out/`

**Interfaces:** none.

**Not here:** ticking either shared plan.md box (they span #223+#224 — annotations only, the #216/#221 shared-box precedent); the milestone Verify box (#225); the v1 cherry-pick EXECUTION (#225 executes the picks; this task lands the triage ledger row only, per the runbook).

- [ ] **Step 1: The full gate sweep**

`pnpm --filter @sevendays/landing fix` → `test -- --run` (**14 files / 115 tests**, or the Task 5-retuned counts) → `typecheck` → `build`; `pnpm --filter @sevendays/types test -- --run` + `typecheck` (**18 files / 170 tests**); `pnpm --filter @sevendays/admin test -- --run` + `typecheck` (**26 files / 254 tests**). Reconcile any drift before proceeding — never loosen assertions.

- [ ] **Step 2: `docs/plan.md` — two DATED NOT-TICKED annotations + one errata**

(a) The redesign box (`- [ ] Landing — the redesign build (#164's ruled direction…`) — append inside the line, after "the ruled empty lines":

```text
 _(2026-10-XX, #223: Part I landed — the ruled chrome (the sticky glass ink bar at 90% + blur, the hero tucked under it, the animated mobile menu on Base UI's native transition contract, the footer's live 3-branch contact truth), the branded global NotFound/Error at __root with both route-level notFound() overrides removed (dark NotFound = the ink field), the ruled home end to end (the live mosaic in the 2×2/2×1 rhythm with reveals, D2 light-split featured plates under the CoverPanel + unpriced laws, the full-bleed 3-copy marquee + the mobile JS stepper, paginated real testimonials with the page-change reveal, one-voice headings from the settings kickers), the skeleton grammar (home's pendingComponent + the brand-tinted sweep) and the whole-page empty lines with Back-to-home CTAs behind the DEV-gated ?empty=1; the catalog plates/detail spec sheet/services rows/branch strips + their per-surface skeletons, the CTA-law sweep on those surfaces, and the page-titles consumption stay #224's — the box ticks when both land.)_
```

(b) The consumption box (`- [ ] Both apps — site settings consumed: brand chrome…`) — append inside the line, after "stitched where the redesign lands the slots":

```text
 _(2026-10-XX, #223: the chrome half landed — the landing header/footer wordmark + logo chip, the announcement banner (off/untitled renders nothing), the footer socials + brand contact block, the hero copy and the home section kickers (the kickerGallery default re-pinned to the ruled "The work"), and the admin sidebar's brand block, all over resolveSiteSettings with code defaults and a never-throwing root loader; page titles/descriptions driving h1 + SEO meta + the About story stay #224's — the box ticks when both land.)_
```

(c) Errata in the ✅'d unpriced box's dated annotation: its "the redesign tickets #222/#223 re-verify the law on the new surfaces" names the wrong pair — correct to "#223/#224" (#222 is the sending-domain ticket; the re-verification sites are the redesign surfaces). One word-pair edit, no other change.

(Fill the XX with the actual date. Both annotations explicitly fence #224's remainder so no executor ticks early — the shared-checkbox discipline.)

- [ ] **Step 3: `docs/progress.md` + `AGENTS.md`**

(a) `docs/progress.md` — append the entry: the ticket, the date, what landed (chrome/home/states/consumption per the two annotations), the round's outcome (rulings applied, TODOs retired), the gate counts, the live-verification notes (throttled skeleton, bogus-URL NotFound, stopped-API Error, ?empty judging).

(b) `AGENTS.md` — two edits. First, the landing suite line in *Current status of `pnpm test`* gains the seam class: extend the landing sentence with "…(+ #223's five redesign-I seams — the mosaic rhythm, testimonial pagination, the chrome settings shapers, the DEV-gated empty judging, isFeatured — 14 files / 115 tests)". Second, the site-settings paragraph's closing clause "both apps' chrome consumption rides the redesign tickets" becomes "both apps' chrome consumption is live since the redesign ticket #223 (the landing chrome + admin sidebar; page titles + the About story ride #224)".

- [ ] **Step 4: The PR**

Push the branch, open the PR against main (title: `The landing redesign I — chrome, home, states, settings consumption (#223)`), body: the four ACs each with the evidence pointer (captures dir, gate output), the fenced sibling-fences list from this plan's header, and the note that both shared plan.md boxes carry DATED NOT-TICKED annotations. Squash-merge with `feat(landing): the redesign I — chrome, home, states, settings consumption (#223)`.

- [ ] **Step 5: Post-merge — the v1-pick ledger row, the issue, graphify**

(a) Per the runbook (`docs/agents/v1-picks.md`, main-only): triage the merged PR — the spec's class table pre-rules it **"PICK with transformed-surface conflicts"**. Land the ledger row recording: PICK, with the ruled v1 transforms at pick time (the header/mobile/hero Book-now CTAs become the solid-primary "Call us" with the Phone icon — zero book words; the footer/NotFound/Error CTAs keep outline weight; the banner/socials/contact/kickers/skeleton grammar/marquee/stepper/empties pick clean; the D2 plates and mosaic pick as-is) — then commit `docs(v1-picks): #226 ledger row - the #223 pick (redesign I: chrome + home + states + settings consumption; transforms fenced, locks + audit green)` (adjust the PR number to the actual one).

(b) Issue #223: tick all four AC boxes `- [✅]`, add the closing comment (what landed, the round's rulings, the #224 fence).

(c) `graphify update .` (code was modified) — commit the graph churn separately per the repo's habit (`chore(graphify): post-#223 graph update`), never staging unrelated files.

---

## Self-Review Checklist (for the executor's final pass)

- [ ] Every fenced code block compiled as-written or adapted with the named deltas (no placeholder prose left in code).
- [ ] The two plan.md boxes carry DATED NOT-TICKED annotations; neither is ticked; the milestone Verify box is untouched.
- [ ] `grep -rn "prototype-standins\|readPrototypeVariant\|?v=" apps/landing/src` returns nothing (the edition law — no variant machinery merged).
- [ ] `grep -rn "GALLERY_STANDINS\|TESTIMONIALS_PLACEHOLDER\|KICKERS" apps/landing/src` returns nothing (the stand-ins are dead).
- [ ] `grep -rn "notFoundComponent" apps/landing/src/routes/` returns only `__root.tsx`.
- [ ] Both themes captured for every round surface; the dark NotFound shows the ink field.
- [ ] Gate counts match the baselines (or the retuned reconciled numbers): types 18/170, landing 15/115, admin 26/254.


