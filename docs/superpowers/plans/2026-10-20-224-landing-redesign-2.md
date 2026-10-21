# M7 Ticket 13 — The Landing Redesign II: Catalog, Services, Branches, the Form Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Tasks 2, 3, and 4 are UI-bearing and load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule, spec #94 amendment): Task 2 composes the catalog plates index + the D2 package detail with its framed/prints/privileges spec sheet, Task 3 the image-backed service rows + the branch cover strips with their icon tooltips and variant-split CTAs, Task 4 the about page (story paragraphs, the captioned mosaic wall, the quote wall) + the form page's polish + the page-titles/head consumption. **Task 5 renders the round for owner reaction in BOTH themes (light judged first) — the ticket's fifth AC — and is the only controller interaction inside the build**; everything else runs to the gates.

**Goal:** Build the landing redesign's second half on the #164-ruled direction — part II, the catalog as prints (ticket #224, spec § *The landing redesign*, mining the throwaway prototype branch `prototype/164-landing-redesign` @ `b050334` per the M3 precedent: nothing merges, the build mines its values and rulings): **the catalog** — the packages index as OWNER-RULED index A "plates" (2-col cover plates, viewport reveals + hover lift, uniform 2-line clamps at a pinned floor, truncation-gated tooltips on desktop, mobile tap-to-expand in-flow — never a scrollview) and the package detail on the D2 split language (cover plate half + light panel: name, mono peso, duration, description, the one primary affordance) with the framed/prints/privileges spec sheet (framed pictures nested per frame, ADR-0009's structure made visible); **services** as image-backed split rows (themed backgrounds, the two-layer ink wash + bottom scrim, reveals, the 1.05 zoom, bottom-right CTAs, 1-line desktop / 2-line mobile descriptions on the shared truncation gate); **branches** as cover strips (#214's covers via the CoverPanel law) with walk-in badges as icon tooltips (Footprints/CalendarClock, hover desktop / tap mobile) and the ruled variant-split CTAs (main = icon-only call with the tooltip "Call {branch}" + primary "Book at this branch"; the v1 arm's single primary "Call {branch}" with zero book words is a pick-time transform, never runtime); **the CTA law swept on every surface this ticket touches** (Phone on call, CalendarPlus on book — including the home marquee's Book chip, fenced to this ticket by #223); **the form page** /share-your-story dressed in the milestone's pending vocabulary (the page already wears the ruled Round-4 composition since #216); **page titles/descriptions** from site settings driving each page's visible h1/sub-copy + `<title>`/meta description (brand suffix appended, one seam for all six head sites); **the About story** rendered as paragraphs (newlines = paragraphs); **the per-surface skeletons** (packages, detail, services, branches, about) wired as route pendingComponents; and **the unpriced law re-verified at every redesigned price render site**. What does NOT change (map ruling 5): the petrol/ink oklch token layer, the wash+cards+bands atmosphere, the typeface trio, shadcn/Base-UI primitives, WCAG AA.

**Architecture:** Six tasks over two packages: (1) `apps/landing` + `packages/types` — the pure seams TDD (`lib/page-head.ts` the title-suffix + description-gate seam, `lib/story-paragraphs.ts` the newline-splitting law) + the four ruled page-description defaults landing in `SITE_SETTINGS_DEFAULTS` with their same-commit test pins (packages/branches/services gain their Round-3/4-ratified intros; the About sub-copy is the ONE unrated draft, `TODO(owner-copy)`, ratified at the round); (2) the catalog — `lib/use-truncated.ts` (the measured truncation gate, hook-only, no suite — DOM measurement), `components/catalog-plates.tsx` (index A alone; the losing ledger variant stays on the prototype branch forever), `components/package-detail.tsx` (the split plate + spec sheet over the extracted `inclusionPhrase`), `components/inclusions-list.tsx` reduced to that shared phrase export (the old `InclusionsList` block + `components/package-card.tsx` die — grep-verified zero other importers), `featured-plates.tsx` deduped onto the shared phrase, the two skeletons, both packages routes; (3) services + branches — `service-card.tsx` recomposed image-backed, `branch-card.tsx` recomposed as cover strips with the branches-page-local `WalkInIndicator` (the booking wizard's text `WalkInBadge` deliberately untouched — M7 leaves v2 surfaces alone), the home Book-chip CalendarPlus rider in `home-cards.tsx`, the two skeletons, both routes; (4) about + the form + the head consumption — the about rewrite (settings title/description/story, `MosaicPhotoGrid captions`, the quote wall, the DEV-gated `?empty=1` judging), share-your-story's pending vocabulary, home's `<head>`; (5) the owner-reacted variants round, both themes (the aboutDescription draft + every `TODO(owner-copy)` settles there); (6) gates + docs rotation (**both shared plan.md boxes TICK — they span #223+#224 and both halves have now landed**) + the PR + the v1-pick triage row + `graphify update .`.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs — lucide's `CalendarPlus`/`Phone`/`ArrowLeft`/`Footprints`/`CalendarClock`/`LoaderCircle` all verified present in the installed lucide-react 1.37.0 `dist/lucide-react.d.ts` this session; `Tooltip`/`Badge`/`Skeleton` on disk in `packages/ui` — the tooltip at `@sevendays/ui/components/tooltip`, data-slot-verified). TanStack Start + TanStack Router + TanStack Query over `@sevendays/api-client`; the settings read path (`getSiteSettings` resolving through `resolveSiteSettings`, `siteSettingsQueries.all()`) is live since #223. **The head mechanics are proven at the installed versions** (react-router 1.170.x / router-core 1.171.34, read this session from `dist/esm/headContentUtils.js`): meta entries dedupe BY DEPTH with the deepest match's `title` and `name`-attributed entries winning, and `AnyRouteMatch['meta']` is `unknown` — so per-route `{ title }` + `{ name: 'description' }` entries ride cleanly over the root's title with no type gymnastics. Tailwind v4 CSS-first (`pointer-coarse:`/`pointer-fine:`/`line-clamp-*`/`columns-*` are stock v4 utilities — the prototype ran them on this same lockfile); **`apps/landing/src/styles.css` is UNTOUCHED by this plan** (the marquee/reveal keyframes, `.skeleton-grammar` sweep, and `.nav-panel` all landed with #223; every #224 surface rides utilities alone). Dark mode is #217's production `.dark` block — this ticket adds NO tokens and NO app-local dark CSS; both themes render from one class set (`dark:` pairs on `text-brand-ink`/`text-brand-700` lines per the #164 12-file sweep pattern). vitest 4.1.11 plain-node lib-seam tests on landing; `pnpm --filter @sevendays/landing build` (vite build) joins Tasks 2–4's gates per the #218 execution ruling (route module graphs gain imports). pnpm + Turborepo, `gh` CLI.

**Spec:** Implements ticket [#224 "M7 ticket 13: the landing redesign II — catalog, services, branches, the form page"](https://github.com/jeius/sevendays/issues/224), whose parent is the M7 spec `docs/specs/2026-10-02-m7-experience-cms-maturation-spec.md` (issue #172 — § *The landing redesign* pins the ruled surfaces verbatim from the #164 resolution; § *Settings made real* pins the page-titles/descriptions law "each driving the visible h1/sub-copy **and** the route's `<title>`/meta description (brand name appended)" and the About story as "plain multi-paragraph text (newlines = paragraphs)"; § *Unpriced catalogs* pins the rendering law; § *v1-pick classes* pre-rules the payload "PICK with transformed-surface conflicts"). The five acceptance criteria, verbatim: Catalog/services/branches surfaces per the ruled direction; captions + branch covers render · The variant CTAs + CTA law verified on both editions (v1: zero book words) · The unpriced law holds at every redesigned render site · Page titles/descriptions drive h1 + SEO meta · The form page wears the redesign; owner-reacted rendered variants per surface. Key recon facts (2026-10-20, main `b36e24d` — post-#223; every file below read whole this session, the prototype files read at `.worktrees/164-landing-redesign` @ `b050334`, the rulings read verbatim in `.scratch/2026-09-30-164-rulings.md`):

- **The prototype is the source of truth for every ruled value.** Rounds 3–5 ruled and CLOSED this ticket's surfaces: index A ("I love the index A"), the tooltip refinement chain (card overlay → description tooltip → truncation-gated), the spec sheet ("a proper separation of the inclusions"), the branches variant-split + icon-only call + tooltips ("add tooltip to 'Call' button icon and use the previous button text as tooltip content"), about (mosaic portfolio, quote wall, submissions CTA), the skeletons, the icon sweep, the v1-primary promotion. The ruled drafts, ratified at the Round-3/4 closes: the Packages intro ("From graduation portraits to family sessions — every package with its price, duration, and inclusions at a glance. Tap a package for the full details."), the Services intro ("Photo recovery, printing, portraits, and framing — studio services you can book at the branches listed on each card." — the add-ons line dies), the Branches intro ("Three studios, one standard of light. Walk-ins are welcome where flagged — everywhere else, call ahead or book online." — the v1 tail "…call ahead." is a pick-time transform). Mining boundary (the #223 precedent): `pesoOrNull` → main's already-null-safe `peso()`; the prototype's raw `img` covers → the M5-ruled `CoverPanel` (null renders today's placeholder verbatim); the `?v`/`readPrototypeVariant`/`prototype-standins` machinery NEVER merges.
- **The owner clarify call (2026-10-20, this session) went unanswered — the four recommended options are pinned as this plan's defaults, each ratifiable at Task 5's round:** (1) the About sub-copy lands the draft `'The studio behind the work — our story, our portfolio, and the people who sat for us.'` as `aboutDescription`'s default with `TODO(owner-copy)`; (2) the document-title suffix is `` `${pageTitle} | ${brandName} ${brandTagline}` `` — reproducing today's literal exactly at defaults; (3) the ruled walk-in icon badge is branches-page-local (the booking wizard's text `WalkInBadge` untouched — M7 leaves v2's booking surfaces alone); (4) the form's submit gains the milestone pending vocabulary (`Sending…` + `LoaderCircle` + `aria-busy`).
- **The surfaces today (all read whole):** `/packages` = the M5 `PackageCard` grid (full-detail cards, `InclusionsList`); `/packages/$slug` = `PackageCard cta='detail'` (the #223 plan already removed its `notFoundComponent`); `/services` = the M5 text `ServiceCard` grid + the add-ons intro + the call-visit strip (the strip KEEPS its landed theme-aware markup verbatim); `/branches` = the #214 cover card with text `WalkInBadge` and outline "Call {branch}" beside primary "Book at this branch"; `/about` = the M5 tabbed gallery + border-left testimonials + the #216 CTA (the #164 prototype reordered: story → **Portfolio** → **Kind words**, renamed "Testimonials" → "Kind words"); `/share-your-story` = #216's port of the ruled Round-4 composition (already the redesign's shape — this ticket's delta is the pending vocabulary). `package-card.tsx` + `InclusionsList` die (grep-verified: only the two packages routes import `PackageCard`; nothing else imports `InclusionsList`); `branch-strip-item.tsx`/`service-teaser-item.tsx` are dead files this plan does NOT touch (out of scope).
- **The head path:** every #224 route's loader returns `{ settings }` (or `{ pkg, settings }` on the detail) with the settings ensure `.catch(() => SITE_SETTINGS_DEFAULTS)` — the #215 never-broken law, page-local (the #223 root-loader posture); `head` composes through `pageMetaFor`. Components read settings from `Route.useLoaderData()` (one source, no second query). Home's route gains the same loader shape (its five-read loader already exists — the settings leg gains the catch + return) + its head. `/share-your-story`, `/book`, `/booking/$id` keep their hardcoded titles (not this ticket's surfaces — fenced).
- **The defaults blast radius (swept):** the four literals change in `packages/types/src/site-settings.ts` + the same-commit `site-settings.test.ts` DEFAULTS-pin edits + ONE assertion retraction there (`resolved.packagesDescription` leaves the nullable-by-design it — it now resolves to ruled copy, covered by the existing `toEqual(SITE_SETTINGS_DEFAULTS)` pin). The API suite's `fullSave` fixture carries `'Looking for add-ons?'` as an arbitrary SAVE value (not a defaults pin — verified `apps/api/test/site-settings.test.ts:28` context) and the api-client mock fixtures carry nulls: **no api/api-client/admin test edits**. The admin Site tab renders the page fields WITHOUT placeholders (`textField(field.key, field.label)` — verified) so no admin drift. Task 1 runs `pnpm --filter @sevendays/types build` before the landing suite (the landing resolves `@sevendays/types` through its built `dist/` — a stale dist would test the old defaults).
- **Sibling fences (the tickets' own bodies + the #223 plan's explicit hand-offs; NOT here regardless of temptation):** **the M7 close-out** — the milestone Verify box, the exit reflection scenario, visual regression, the v1 cherry-pick EXECUTION — ALL #225 (this plan lands the pick TRIAGE row only, per the runbook); **the #222 sending-domain ticket** — untouched; **any admin surface** (the admin sidebar/chrome landed #223; the Site tab's description fields gaining DEFAULTS placeholders is a noticed nicety that stays OUT — no ruling covers it); **any booking-surface file** (`book.tsx`, `booking.$id.tsx`, `components/booking/*` — the wizard's text `WalkInBadge` keeps rendering; v2's payload); **any new token or `packages/ui` change** (ruled: none); **any `styles.css` change** (everything rides utilities — the grammar landed with #223); **stand-in imagery or stand-in content of any kind** — main renders the live catalog as-is (the content gaps are owner-owned, recorded in the #164 resolution); **re-litigating ruled values** (the rounds closed them — Task 5 judges build fidelity + the genuinely new compositions only).
- **The `docs/plan.md` boxes (Task 6):** the redesign box (`docs/plan.md:174`) and the consumption box (`docs/plan.md:175`) BOTH span #223+#224 and carry #223's DATED NOT-TICKED annotations naming this ticket's remainder — **Task 6 TICKS BOTH** (`- [ ]` → `- [✅]`, each gaining its #224 dated annotation appended after the #223 one; "the box ticks when both land"). The milestone Verify box stays #225's, unticked.
- **Baselines (live, run this session on main `b36e24d`):** types 18 files / 170 tests; landing 14 files / 115 tests; admin 26 files / 254 tests. After Task 1: landing **16 files / 123 tests** (+2 new files — `page-head.test.ts` +4 its, `story-paragraphs.test.ts` +4 its); types stays 18/170 (in-place literal edits + the one retraction, net zero its); admin stays 26/254 (no admin edits). Tasks 2–5 add no suite counts (component-side). (Executor reconciles actuals; if any gate count differs, reconcile before proceeding — do not loosen assertions.)

## Global Constraints

- **Branch & baseline:** `feat/224-landing-redesign-2` off main `b36e24d` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#224)` squash style; every commit below is pinned verbatim. Evidence (test red/green output, grep-gate output, the round's captures and rulings) lands in gitignored `.superpowers/sdd/2026-10-20-224-landing-redesign-2/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs.** `@sevendays/types` resolves through its built `dist/`, so **Task 1 runs `pnpm --filter @sevendays/types test -- --run` first (the src-level pin), then `pnpm --filter @sevendays/types build`, then the landing suite** (the landing consumes the package through `dist/` — the new defaults must be in the build before the landing's page-head test reads them). Tasks 1–4 each run `pnpm --filter @sevendays/landing fix` (accept the rewrites) → `test -- --run` → `typecheck` → **`build`** (the #218 execution ruling: the production build joins the per-task checks whenever a route's module graph gains an import — every one of these tasks adds imports); Task 1 additionally runs `pnpm --filter @sevendays/types fix` → `test -- --run` → `typecheck` after the build. The admin and api suites are untouched by construction (Task 6 runs admin gates anyway as the final sweep; api is unaffected — only `SITE_SETTINGS_DEFAULTS` VALUES changed, and no api test pins them). Never stage `graphify-out/` churn. Tick checklist boxes with `- [✅]`, never `[x]` (this plan file, `docs/plan.md`, and issue bodies alike). Run `graphify update .` at close (Task 6 — code was modified).
- **The edition law (binding):** main renders its arm only. NO `?v`/`?p`/`?t` machinery, no runtime variant reads, no `prototype-standins`, no stand-in imagery — none of the prototype's judging seams merge. The v1 arm's transforms are pick-time edits on the `v1` branch per the class ledger ("PICK with transformed-surface conflicts"); this plan lands zero v1-conditional code, and Task 6's triage row fences the transforms now: the detail's "Book this package" → solid-primary "Call us" + Phone; the services card's "Book now" → solid-primary "Call us" + Phone; the branch cards → single solid-primary "Call {branch}" + Phone with ZERO book words; the home marquee's Book chip → call-forward; the branches intro tail "…or book online." → "…call ahead."; the walk-in tooltip's "By appointment — call ahead or book online." drops the book clause on v1; everything else (plates, spec sheet, skeletons, empties, about, the form, titles/meta) picks clean.
- **The theme law (binding, #217's ramp):** every new surface uses semantic tokens + tailwind utilities only — no new tokens, no `packages/ui` change, no app-local `.dark` CSS, no `styles.css` edit; both themes render from the same classes (`dark:text-foreground` pairs on `text-brand-ink` lines, `dark:text-brand-300` pairs on `text-brand-700` lines — the #164 sweep pattern; the ink-band surfaces keep their white/brand-300 registers as ruled). The round verifies dark, never a second class set. If a retune lands interactive text on off-token palette classes, re-measure contrast first (≥ 4.5 for text — `scripts/measure-theme-pairs.mjs` is the harness; do not edit its recorded tables without re-running it).
- **The settings law (binding):** pages render `resolveSiteSettings` output ONLY; a missing or failed read renders `SITE_SETTINGS_DEFAULTS` (the never-broken law — a born-empty row and a dead API render the same page); every loader's settings ensure carries `.catch(() => SITE_SETTINGS_DEFAULTS)` — a dead settings read must not take down a page whose own data loaders are healthy (the #223 root-loader posture, page-local); defaults never ride the wire (#215's law — only the four page-description defaults' VALUES change, in `packages/types`, same-commit with their pinned test edits).
- **The CTA law (binding, this ticket's sites):** every Book CTA this plan lands carries `CalendarPlus` (`size-4`, `aria-hidden` — the home marquee's chip takes `size-3.5` to fit its compact register); every call affordance carries `Phone`; the packages index is CTA-less (the M3 showcase law — the whole plate links to detail); the detail carries exactly one primary affordance; the call-visit strip and the whole-page empty CTAs keep their landed outline weight. The v1 arm's solid-primary "Call us" promotions are pick-time transforms, never runtime.
- **The CoverPanel law (binding):** every cover render site this plan lands (the plate's 4/3 half, the detail's split half, the branch strip's 16/9) uses `CoverPanel` — img on `coverImageUrl`, today's placeholder verbatim on null (M5's rule; the prototype's raw `img` is corrected at the mining boundary; `className` re-boxes both branches through `cn`'s tailwind-merge).
- **The unpriced law (binding, #212):** `peso(priceCents)` returns null for unpriced and JSX renders nothing — no redesigned site reintroduces a ₱0, a placeholder, or an inquire line. The plate's price line, the detail's price line, and the service row's price line all render nothing for unpriced rows; the round re-verifies at every site (toggle one row's Priced off in the CMS if the dev catalog has none, then revert).
- **The states law (binding):** the five per-surface skeletons are structure-only silhouettes on the shared Tier-1 `Skeleton` primitive inside `.skeleton-grammar` wrappers (the sweep CSS is #223's, already live), wired as `pendingComponent` (client navigations only — judge by devtools throttling while clicking between pages); first loads stay server-rendered (the M5 freshness rule). About's in-page empties stay CTA-less (the Round-5 ruling); `?empty=1` answers false in production builds by construction (`isEmptyJudgingParam`, DEV-gated, reading `useLocation().searchStr` — the #223 execution ruling: `.search` is the parsed object on the installed router-core; `.searchStr` is the raw string).
- **The copy law:** every string the executor must produce lands verbatim in this plan's fenced blocks. The ONE unrated owner-facing default this plan introduces is `aboutDescription`'s draft (marked `TODO(owner-copy)` at its pin) — Task 5's round ratifies or retunes; a retune of any pinned default lands in the SAME commit as its `site-settings.test.ts` edit (the #223 kickerGallery precedent). No suite pins component-side strings.
- **The motion law (from the rulings):** the `Reveal` fade-and-rise (700ms ease-out, staggered per column at `(i % 2) * 90`, `prefers-reduced-motion` shows immediately) on the plates/services/branches grids; the plate hover lift (`hover:-translate-y-1 hover:shadow-lg`, 300ms ease-out, `motion-reduce` flat); the cover zooms (`group-hover:scale-[1.02]` on the plates, `group-hover:scale-[1.05]` on the service rows, `duration-700`, `motion-reduce` none). Nothing else animates on these surfaces.
- **The truncation law (Round 3's refinement chain, binding):** descriptions clamp at 2 lines (1 on desktop for services) over a pinned min-height floor; the tooltip opens ONLY when the clamp actually truncates (`useTruncated` measures `scrollHeight > clientHeight + 1`, re-checking on resize and after fonts settle); coarse pointers tap-to-expand IN FLOW (the card grows — never an inner scrollview; the tap never navigates); keyboard users follow the link and read the full text on the detail page (the biome-ignore comments state the ruling).

## File Structure

```text
packages/types/src/
  site-settings.ts               # modify (T1) — the four page-description defaults + header-comment phrases
  site-settings.test.ts          # modify (T1) — the DEFAULTS pin literals + one assertion retraction (same-commit)
apps/landing/src/lib/
  page-head.ts                   # new (T1) — pageMetaFor: the brand-suffix title + the description gate
  page-head.test.ts              # new (T1) — +4 its
  story-paragraphs.ts            # new (T1) — storyParagraphs: newlines are paragraphs
  story-paragraphs.test.ts       # new (T1) — +4 its
  use-truncated.ts               # new (T2) — the measured truncation gate (hook, no suite — DOM)
  queries.ts                     # untouched (the settings path landed #223)
apps/landing/src/components/
  catalog-plates.tsx             # new (T2) — index A "the plates" alone
  package-detail.tsx             # new (T2) — the D2 split plate + the grouped spec sheet
  inclusions-list.tsx            # rewrite (T2) — reduces to the shared inclusionPhrase export
  package-card.tsx               # DELETE (T2) — died with the plates (zero other importers)
  featured-plates.tsx            # modify (T2) — dedupe onto the shared inclusionPhrase
  skeletons.tsx                  # modify (T2/T3/T4) — +Packages/PackageDetail (T2), +Services/Branches (T3), +About (T4)
  service-card.tsx               # rewrite (T3) — image-backed split row
  branch-card.tsx                # rewrite (T3) — cover strip + WalkInIndicator + variant-split CTAs (main arm)
  home-cards.tsx                 # modify (T3) — the marquee Book chip gains CalendarPlus (the #223 fence)
  mosaic-photo-grid.tsx          # untouched (captions support landed #223 — about turns it on)
  walk-in-badge.tsx              # untouched (the booking wizard's text badge — fenced)
apps/landing/src/routes/
  packages/index.tsx             # rewrite (T2) — settings intro + plates + skeleton + head
  packages/$slug.tsx             # rewrite (T2) — { pkg, settings } loader + PackageDetail + skeleton + head
  services.tsx                   # rewrite (T3) — settings intro + reveals + skeleton + head (strip verbatim)
  branches.tsx                   # rewrite (T3) — settings intro + reveals + skeleton + head
  about.tsx                      # rewrite (T4) — story/description/mosaic/quote wall + empty judging + skeleton + head
  share-your-story.tsx           # modify (T4) — the submit's pending vocabulary
  index.tsx                      # modify (T4) — the loader's settings return + home's head
  book.tsx / booking.$id.tsx / __root.tsx  # untouched (fenced)
docs/plan.md docs/progress.md AGENTS.md   # T6 (both shared boxes TICK)
docs/agents/v1-picks.md graphify-out/     # T6 post-merge
```

---

### Task 1: The pure seams + the four ruled page-description defaults (TDD)

Every head this ticket composes and the About story render read through these seams; the defaults land with them. Nothing visual yet.

**Files:**
- Write (test-first): `apps/landing/src/lib/{page-head,story-paragraphs}.test.ts`
- Write: `apps/landing/src/lib/{page-head,story-paragraphs}.ts`
- Modify: `packages/types/src/{site-settings.ts, site-settings.test.ts}`

**Interfaces:**
- Produces (what Tasks 2–4 consume): `type PageMetaEntry = { title: string } | { name: 'description'; content: string }`; `pageMetaFor(pageTitle: string | null, pageDescription: string | null, settings: SiteSettings): PageMetaEntry[]`; `storyParagraphs(story: string | null): string[]`.
- Consumes: `SiteSettings`, `EMPTY_SITE_SETTINGS`, `resolveSiteSettings` from `@sevendays/types`.

**Not here:** any component; any route; the head wiring (Tasks 2–4); the About composition; any admin/api edit (the blast-radius sweep proved none needed).

- [ ] **Step 1: Write the two failing test files**

`apps/landing/src/lib/page-head.test.ts` (new file):

```ts
// The page-head seam (M7 #224): every redesigned route's <title> composes
// the settings brand suffix, and the meta description renders only when the
// page carries one. Pinned so a future suffix retune moves the seam and the
// suite together. The dedup that makes this work is the router's own (the
// deepest match's title + name entries win — verified against the installed
// headContentUtils).
import type { SiteSettings } from '@sevendays/types';
import { EMPTY_SITE_SETTINGS, resolveSiteSettings } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { pageMetaFor } from './page-head';

describe('pageMetaFor (M7 #224 — the brand-suffix title + the description gate)', () => {
  it('composes the suffix from the resolved settings — defaults reproduce today’s literal exactly', () => {
    const resolved = resolveSiteSettings(EMPTY_SITE_SETTINGS);
    const meta = pageMetaFor(resolved.packagesTitle, resolved.packagesDescription, resolved);
    expect(meta).toEqual([
      { title: 'Packages | Sevendays Photography' },
      { name: 'description', content: resolved.packagesDescription },
    ]);
  });

  it('a custom brand follows the Site tab’s name + tagline through the suffix', () => {
    const rebranded: SiteSettings = {
      ...resolvedDefaults(),
      brandName: 'Northlight',
      brandTagline: 'Studio',
    };
    expect(pageMetaFor('Packages', null, rebranded)).toEqual([
      { title: 'Packages | Northlight Studio' },
    ]);
  });

  it('a null description renders the title entry alone (no empty meta tag)', () => {
    const resolved = resolvedDefaults();
    const meta = pageMetaFor(resolved.branchesTitle, null, resolved);
    expect(meta).toEqual([{ title: 'Branches | Sevendays Photography' }]);
  });

  it('a null page title renders NO entries — the root’s fallback title stands', () => {
    const resolved = resolvedDefaults();
    expect(pageMetaFor(null, resolved.servicesDescription, resolved)).toEqual([]);
  });
});

function resolvedDefaults(): SiteSettings {
  return resolveSiteSettings(EMPTY_SITE_SETTINGS);
}
```

*(The description assertion references `resolved.packagesDescription` rather than re-pinning the ruled literal — the literal's one pin lives in `packages/types/src/site-settings.test.ts`; a retune edits one place plus this suite's title literal only if the suffix itself changes.)*

`apps/landing/src/lib/story-paragraphs.test.ts` (new file):

```ts
// The About story seam (M7 #224): the Site tab stores the story as plain
// text and newlines mean paragraphs (the spec's ruling — rich text stays
// parked). Pinned so the splitting law (trim + drop empties) survives.
import { describe, expect, it } from 'vitest';
import { storyParagraphs } from './story-paragraphs';

describe('storyParagraphs (M7 #224 — newlines are paragraphs)', () => {
  it('a single-line story is one paragraph (today’s placeholder default)', () => {
    expect(storyParagraphs('Our studio story is coming soon.')).toEqual([
      'Our studio story is coming soon.',
    ]);
  });

  it('newlines split paragraphs; each paragraph trims', () => {
    expect(storyParagraphs('Line one.\n  Line two.  \nLine three.')).toEqual([
      'Line one.',
      'Line two.',
      'Line three.',
    ]);
  });

  it('blank lines between paragraphs drop (double newlines are spacing, not paragraphs)', () => {
    expect(storyParagraphs('Line one.\r\n\r\nLine two.')).toEqual(['Line one.', 'Line two.']);
  });

  it('a null or whitespace-only story renders no paragraphs', () => {
    expect(storyParagraphs(null)).toEqual([]);
    expect(storyParagraphs('  \n  \n')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run red**

`pnpm --filter @sevendays/landing test -- --run` — the 2 new files' 8 its fail (modules don't exist). Capture the red output to the evidence dir.

- [ ] **Step 3: Implement the seams**

`apps/landing/src/lib/page-head.ts` (new file):

```ts
import type { SiteSettings } from '@sevendays/types';

// The page-head seam (M7 #224): every redesigned route's <head> composes
// through here so the title suffix has one source. The suffix is
// `{pageTitle} | {brandName} {brandTagline}` — with today's defaults that
// reproduces the incumbent literals ("Packages | Sevendays Photography")
// exactly, and a brand edit follows through. A null page title renders NO
// entries (the root's fallback title stands); the meta description renders
// only when the page carries one. The router dedupes title/name entries by
// depth (deepest match wins — the installed headContentUtils), so these
// entries ride cleanly over the root's.
export type PageMetaEntry = { title: string } | { name: 'description'; content: string };

export function pageMetaFor(
  pageTitle: string | null,
  pageDescription: string | null,
  settings: SiteSettings
): PageMetaEntry[] {
  if (pageTitle === null) return [];
  const meta: PageMetaEntry[] = [
    { title: `${pageTitle} | ${settings.brandName} ${settings.brandTagline}` },
  ];
  if (pageDescription !== null) {
    meta.push({ name: 'description', content: pageDescription });
  }
  return meta;
}
```

`apps/landing/src/lib/story-paragraphs.ts` (new file):

```ts
// The About story seam (M7 #224, spec § Settings made real): the story is
// plain multi-paragraph text — newlines are paragraphs, rich text stays
// parked. Lines trim and empty lines drop, so spacing around paragraphs in
// the Site tab's textarea never renders stray paragraphs.
export function storyParagraphs(story: string | null): string[] {
  if (story === null) return [];
  return story
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
```

- [ ] **Step 4: The four defaults (same-commit pair with their pins)**

In `packages/types/src/site-settings.ts`, in `SITE_SETTINGS_DEFAULTS`, make these four replacements:

```ts
  packagesDescription: null,
```

becomes

```ts
  packagesDescription:
    'From graduation portraits to family sessions — every package with its price, duration, and inclusions at a glance. Tap a package for the full details.',
```

```ts
  branchesDescription: null,
```

becomes

```ts
  branchesDescription:
    'Three studios, one standard of light. Walk-ins are welcome where flagged — everywhere else, call ahead or book online.',
```

```ts
  servicesDescription:
    'Looking for add-ons? Makeup, hairstyle, and more are available with any session.',
```

becomes

```ts
  servicesDescription:
    'Photo recovery, printing, portraits, and framing — studio services you can book at the branches listed on each card.',
```

```ts
  aboutDescription: null,
```

becomes

```ts
  // TODO(owner-copy): the one unrated default this ticket introduces (the
  // #164 rounds never composed an About sub-copy) — the #224 variants round
  // ratifies or retunes; a retune lands with its test pin in the same commit.
  aboutDescription:
    'The studio behind the work — our story, our portfolio, and the people who sat for us.',
```

In the same file's header comment (the `SITE_SETTINGS_DEFAULTS` doc block), replace the phrase

```text
page titles + the services sub-copy from the routes'
// h1/sub-lines,
```

with

```text
the page titles + sub-copy from the ruled redesign intros
// (#224 — the #164 Round-3/4-ratified drafts; the About sub-copy is the one
// unrated draft, TODO(owner-copy) — the round ratifies),
```

and replace

```text
(the extras — socials, banner copy, brand contact — and the
// three page descriptions with no today-sub-copy):
```

with

```text
(the extras — socials, banner copy,
// brand contact):
```

*(Why these four: the default IS the rendered-when-unset copy — the ruled page intros become what a born-empty row renders, exactly as #223 re-pinned `kickerGallery` to "The work". The v1 arm's branches tail "…or book online." → "…call ahead." is a pick-time edit on the v1 branch, fenced in Global Constraints.)*

In `packages/types/src/site-settings.test.ts`, inside the `SITE_SETTINGS_DEFAULTS pins today's landing literals verbatim` it, make the same four literal replacements (lines 111–118 today): `packagesDescription: null,` → the ruled literal; `branchesDescription: null,` → the ruled literal; the two-line `servicesDescription: 'Looking for add-ons? Makeup, hairstyle, and more are available with any session.',` → the ruled literal; `aboutDescription: null,` → the draft literal. **These edits land in the same commit as the defaults.** Then, in the `nullable-by-design keys stay null on resolve (today renders nothing for them)` it, DELETE the line

```ts
    expect(resolved.packagesDescription).toBeNull();
```

*(the page descriptions left the nullable-by-design class — resolving the born-empty row now yields the ruled copy, which the existing `resolving the born-empty settings yields exactly the defaults` it pins via `toEqual(SITE_SETTINGS_DEFAULTS)`; the socials/banner/contact assertions stay).*

- [ ] **Step 5: Green + gates + commit**

`pnpm --filter @sevendays/types test -- --run` FIRST — **18 files / 170 tests** (counts unchanged; the literal edits must keep the DEFAULTS pin green). Then `pnpm --filter @sevendays/types build`, then `pnpm --filter @sevendays/landing test -- --run` — **16 files / 123 tests** (115 + 8). Then `pnpm --filter @sevendays/landing fix` → `pnpm --filter @sevendays/types fix` (accept the rewrites) → re-run both suites → `pnpm --filter @sevendays/landing typecheck` → `pnpm --filter @sevendays/types typecheck`. Commit:

```bash
git add packages/types/src/site-settings.ts packages/types/src/site-settings.test.ts apps/landing/src/lib/page-head.ts apps/landing/src/lib/page-head.test.ts apps/landing/src/lib/story-paragraphs.ts apps/landing/src/lib/story-paragraphs.test.ts
git commit -m "feat(landing): the redesign II seams - page-head composition, the about story paragraphs, the four ruled page-description defaults (#224)"
```

### Task 2: The catalog — plates index, the D2 detail + the spec sheet (UI-bearing)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — AGENTS.md rule) before composing. The fenced compositions below are the #164-ruled values adapted to main (the skill set's pass retunes what Task 5's round rules; the ruled literals — the clamp floors, the truncation gate, the spec sheet's grouping — are owner-ruled, not suggestions).

**Files:**
- Write: `apps/landing/src/lib/use-truncated.ts`, `apps/landing/src/components/{catalog-plates,package-detail}.tsx`
- Rewrite: `apps/landing/src/components/inclusions-list.tsx`
- Delete: `apps/landing/src/components/package-card.tsx`
- Modify: `apps/landing/src/components/{featured-plates,skeletons}.tsx`, `apps/landing/src/routes/packages/{index,$slug}.tsx`

**Interfaces:**
- Produces: `useTruncated<T>(): { ref: RefObject<T | null>; truncated: boolean }`; `CatalogPlates({ strip })`; `PackageDetail({ pkg })`; `inclusionPhrase(inclusion): string` (the shared phrase format); `PackagesSkeleton` / `PackageDetailSkeleton`.
- Consumes: Task 1's `pageMetaFor`; `peso` from `lib/format`; `CoverPanel`, `Reveal`, the Tier-1 `Tooltip`/`Skeleton`; `servicePackageQueries`, `siteSettingsQueries`; `toNotFoundError`.

**Not here:** services/branches/about (Tasks 3–4); any booking-surface file; any `styles.css`/`packages/ui` edit; the variants round (Task 5).

- [ ] **Step 1: `lib/use-truncated.ts` — the measured truncation gate (new, ported verbatim)**

```ts
import { useEffect, useRef, useState } from 'react';

/**
 * The truncation gate (#164 owner rulings): measures whether a clamped
 * element ACTUALLY overflows — the tooltip/expand affordances render only
 * when it does. Re-measures on every render pass (cheap: one layout read),
 * on window resize, and after fonts settle (a late font swap changes the
 * wrap). The ref goes on the clamped element.
 */
export function useTruncated<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  truncated: boolean;
} {
  const ref = useRef<T>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      setTruncated(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const fontTick = window.setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(fontTick);
      window.removeEventListener('resize', measure);
    };
  });

  return { ref, truncated };
}
```

*(No suite — this is DOM measurement behind a hook; the landing suite is plain-node lib-seam by discipline. The gate's LAW is pinned by the ruling comments + the round's live verification: a fitting description renders no tooltip and no help cursor.)*

- [ ] **Step 2: `components/inclusions-list.tsx` — reduce to the shared phrase (full rewrite)**

```tsx
import type { ResolvedPackageInclusion } from '@sevendays/types';

/** The inclusion phrase — the data composes the line (there is no name
 * field): ×qty · printSize · description · attires. Shared by the D2
 * featured plates (#223) and the package detail's grouped spec sheet
 * (#224). The old InclusionsList block died with the PackageCard (#224 —
 * the plates index and the D2 detail own the inclusions surfaces now). */
export function inclusionPhrase(inclusion: ResolvedPackageInclusion): string {
  const size = inclusion.printSize ? inclusion.printSize.code : null;
  const attires =
    inclusion.attires.length > 0 ? inclusion.attires.map((a) => a.name).join(', ') : null;
  const parts = [
    inclusion.quantity !== null ? `×${inclusion.quantity}` : null,
    size,
    inclusion.description,
    attires,
  ].filter((part): part is string => part !== null);
  return parts.join(' · ');
}
```

- [ ] **Step 3: Delete `components/package-card.tsx` + dedupe `featured-plates.tsx`**

(a) `git rm apps/landing/src/components/package-card.tsx` — the plates index and the D2 detail replace its two call sites (this task's route rewrites remove both imports; grep-verified zero other importers).

(b) In `apps/landing/src/components/featured-plates.tsx`: add `import { inclusionPhrase } from './inclusions-list';` after the `Link` import; DELETE the local `inclusionLine` function (the whole `/** The inclusion phrase — … */` block plus its body); change the single call site `{inclusionLine(inc)}` to `{inclusionPhrase(inc)}`. One phrase source now serves the D2 family — the format is byte-identical (both derived from the prototype's extraction).

- [ ] **Step 4: `components/catalog-plates.tsx` — index A "the plates" (new)**

```tsx
import type { ServicePackageRead } from '@sevendays/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { useState } from 'react';
import { peso } from '../lib/format';
import { useTruncated } from '../lib/use-truncated';
import { CoverPanel } from './cover-panel';
import { Reveal } from './reveal';

// The packages index, OWNER-RULED index A "the plates" (#164 Round 3 — "I
// love the index A"; the losing ledger variant stays on the prototype
// branch forever): a 2-column grid of cover-led compact plates — the D2
// image treatment scaled down. The catalog laws compose here: the index is
// a SHOWCASE (no booking CTA — M3), the whole plate clicks through to the
// detail, and an unpriced row renders NO price (the #163 law — peso(null)
// leaves the slot empty).
//
// The description treatment (Round 3's refinement chain, owner-ruled):
// clamped to two lines at a pinned two-line floor (uniform plate sizes);
// desktop reveals the FULL description in the shared Tier-1 tooltip — and
// ONLY when the text actually truncates (the measured gate: a fitting
// description gets no tooltip and no help cursor); mobile taps the
// description to expand IN PLACE (the plate grows in normal flow — never
// an inner scrollview; the tap never navigates).
export function CatalogPlates({ strip }: { strip: ServicePackageRead[] }) {
  return (
    <div className='grid gap-6 sm:grid-cols-2'>
      {strip.map((pkg, i) => (
        <Reveal key={pkg.id} delay={(i % 2) * 90}>
          <CatalogPlate pkg={pkg} />
        </Reveal>
      ))}
    </div>
  );
}

function CatalogPlate({ pkg }: { pkg: ServicePackageRead }) {
  const price = peso(pkg.priceCents);
  // Mobile tap-to-expand; desktop hover carries the reveal instead.
  const [expanded, setExpanded] = useState(false);
  const { ref: descRef, truncated } = useTruncated<HTMLParagraphElement>();
  // biome-ignore lint/a11y/useKeyWithClickEvents: the tap-to-expand affordance is coarse-pointer-only by ruling (touch); keyboard users follow the link and read the full description on the detail page — a key handler here would double-fire navigation.
  const description = (
    <p
      ref={descRef}
      onClick={(e) => {
        // Coarse pointers expand in place; fine pointers read the tooltip
        // (this handler is inert for them).
        if (window.matchMedia('(pointer: coarse)').matches) {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((v) => !v);
        }
      }}
      className={cn(
        'mt-1 min-h-10 w-full text-left text-muted-foreground text-sm leading-5',
        expanded ? '' : 'line-clamp-2',
        truncated
          ? 'pointer-coarse:cursor-pointer pointer-fine:cursor-help'
          : 'pointer-coarse:cursor-pointer'
      )}
    >
      {pkg.description}
    </p>
  );

  return (
    <Link
      to='/packages/$slug'
      params={{ slug: pkg.slug }}
      className='group block overflow-hidden rounded-xl border border-line-soft bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0'
    >
      <div className='relative aspect-[4/3] overflow-hidden'>
        <CoverPanel
          name={pkg.name}
          coverImageUrl={pkg.coverImageUrl}
          className='absolute inset-0 size-full rounded-none object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100'
        />
      </div>
      <div className='relative p-5'>
        <div className='flex items-baseline justify-between gap-3'>
          <h3 className='font-semibold font-serif text-brand-ink text-xl dark:text-foreground'>
            {pkg.name}
          </h3>
          {/* The unpriced law: nothing renders where the price would be. */}
          {price && <p className='font-mono text-brand-700 text-sm dark:text-brand-300'>{price}</p>}
        </div>
        <TooltipProvider>
          {truncated ? (
            <Tooltip>
              <TooltipTrigger render={description} />
              <TooltipContent className='max-w-72 break-words'>
                <p className='leading-5'>{pkg.description}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            description
          )}
        </TooltipProvider>
      </div>
    </Link>
  );
}
```

*(The description element is composed once and reused as the tooltip's `render` target or rendered bare — one clamp/onClick site, one biome-ignore, byte-identical behavior to the prototype's two-branch form.)*

- [ ] **Step 5: `components/package-detail.tsx` — the D2 split plate + the spec sheet (new)**

```tsx
import type { ResolvedPackageInclusion, ServicePackageRead } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowLeft, CalendarPlus } from 'lucide-react';
import { peso } from '../lib/format';
import { CoverPanel } from './cover-panel';
import { inclusionPhrase } from './inclusions-list';

// The package detail on the ruled D2 split language (#164 Round 3): the
// cover as a full plate half (untouched photo — the CoverPanel law renders
// the muted placeholder when the row has no cover), a light panel carrying
// name, peso, duration, description, and THE one primary affordance (main:
// "Book this package" with CalendarPlus — the CTA law; the v1 arm's
// solid-primary "Call us" + Phone is a pick-time transform on the v1
// branch, never in this codebase). The #163 law composes: an unpriced
// package renders NO price line and stays fully bookable.
export function PackageDetail({ pkg }: { pkg: ServicePackageRead }) {
  const price = peso(pkg.priceCents);

  return (
    <div className='mx-auto max-w-5xl px-6 pt-8 pb-16'>
      <Link
        to='/packages'
        className='inline-flex items-center gap-1.5 rounded-sm text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
      >
        <ArrowLeft className='size-4' aria-hidden='true' />
        All packages
      </Link>
      <div className='mt-6 grid overflow-hidden rounded-xl border border-line-soft bg-card shadow-sm md:grid-cols-5'>
        <div className='relative min-h-64 md:col-span-3 md:min-h-[26rem]'>
          <CoverPanel
            name={pkg.name}
            coverImageUrl={pkg.coverImageUrl}
            className='absolute inset-0 size-full rounded-none object-cover'
          />
        </div>
        <div className='flex flex-col justify-center gap-1 p-6 md:col-span-2 md:p-8'>
          <h1 className='font-bold font-serif text-2xl text-brand-ink md:text-3xl dark:text-foreground'>
            {pkg.name}
          </h1>
          {/* The unpriced law: nothing renders where the price would be. */}
          {price && (
            <p className='font-medium font-mono text-brand-700 text-lg dark:text-brand-300'>
              {price}
            </p>
          )}
          {pkg.durationMinutes != null && (
            <p className='text-muted-foreground text-sm'>{pkg.durationMinutes} minutes</p>
          )}
          <p className='mt-3 text-foreground/85 text-sm leading-relaxed'>{pkg.description}</p>
          <Link
            to='/book'
            search={{ package: pkg.id }}
            className={cn(
              buttonVariants(),
              'mt-5 self-start focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book this package
          </Link>
        </div>
      </div>
      <section className='mt-10'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink dark:text-foreground'>
          What's included
        </h2>
        <InclusionsGrouped pkg={pkg} />
      </section>
    </div>
  );
}

// The detail's spec sheet (#164 Round 3 owner ruling: "a proper separation
// of the inclusions by specifying the framed, prints, and privileges"):
// one column per kind — framed pictures nested per frame (ADR-0009's
// structure made visible), prints, privileges — with mono headers, counts,
// hairline rules, and the shared phrase format. Empty groups collapse; a
// package with no inclusions at all renders nothing (the plate above
// already carries the pitch).
function InclusionsGrouped({ pkg }: { pkg: ServicePackageRead }) {
  const framed = pkg.inclusions.filter((i) => i.kind === 'framed_picture');
  const prints = pkg.inclusions.filter((i) => i.kind === 'print');
  const privileges = pkg.inclusions.filter((i) => i.kind === 'privilege');
  if (pkg.inclusions.length === 0) return null;

  return (
    <div className='mt-6 grid gap-10 md:grid-cols-3 md:gap-8'>
      {framed.length > 0 && (
        <div>
          <GroupHeader label='Framed' count={framed.length} />
          <div className='mt-3 space-y-4'>
            {pkg.frames.map((frame) => {
              const inFrame = framed.filter((i) => i.frameId === frame.id);
              if (inFrame.length === 0) return null;
              return (
                <div key={frame.id}>
                  {pkg.frames.length > 1 && (
                    <p className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]'>
                      Frame {frame.frameNumber}
                    </p>
                  )}
                  <ul className='mt-1.5 space-y-1.5'>
                    {inFrame.map((i) => (
                      <InclusionRow key={i.id} inclusion={i} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {prints.length > 0 && (
        <div>
          <GroupHeader label='Prints' count={prints.length} />
          <ul className='mt-3 space-y-1.5'>
            {prints.map((i) => (
              <InclusionRow key={i.id} inclusion={i} />
            ))}
          </ul>
        </div>
      )}
      {privileges.length > 0 && (
        <div>
          <GroupHeader label='Privileges' count={privileges.length} />
          <ul className='mt-3 space-y-1.5'>
            {privileges.map((i) => (
              <InclusionRow key={i.id} inclusion={i} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className='flex items-baseline justify-between border-line-soft border-b pb-2'>
      <h3 className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em] dark:text-brand-300'>
        {label}
      </h3>
      <span className='font-mono text-muted-foreground text-xs'>{count}</span>
    </div>
  );
}

function InclusionRow({ inclusion }: { inclusion: ResolvedPackageInclusion }) {
  return (
    <li className='flex items-start gap-2.5 text-foreground/85 text-sm leading-relaxed'>
      <span className='bg-primary mt-2 size-1 shrink-0 rounded-full' aria-hidden='true' />
      <span className='min-w-0'>{inclusionPhrase(inclusion)}</span>
    </li>
  );
}
```

- [ ] **Step 6: `components/skeletons.tsx` — the two catalog silhouettes**

After the existing `const SLOTS_8 = [1, 2, 3, 4, 5, 6, 7, 8];` line, add:

```ts
const SLOTS_6 = [1, 2, 3, 4, 5, 6];
const SLOTS_3 = [1, 2, 3];
```

Then append at the file's end:

```tsx

/** The packages index (#164 Round 5, built #224): six plate silhouettes. */
export function PackagesSkeleton() {
  return (
    <div className='skeleton-grammar mx-auto max-w-5xl px-6 py-16'>
      <Skeleton className='h-9 w-44' />
      <div className='mt-8 grid gap-6 sm:grid-cols-2'>
        {SLOTS_6.map((slot) => (
          <div key={slot} className='overflow-hidden rounded-xl border border-line-soft'>
            <Skeleton className='aspect-[4/3] w-full rounded-none' />
            <div className='space-y-2 p-5'>
              <Skeleton className='h-5 w-2/3' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-4/5' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The package detail (#164 Round 5, built #224): plate half + panel half,
 * then the spec-sheet block. */
export function PackageDetailSkeleton() {
  return (
    <div className='skeleton-grammar mx-auto max-w-5xl px-6 pt-8 pb-16'>
      <Skeleton className='h-5 w-28' />
      <div className='mt-6 grid overflow-hidden rounded-xl border border-line-soft md:grid-cols-5'>
        <Skeleton className='min-h-64 w-full rounded-none md:col-span-3 md:min-h-[26rem]' />
        <div className='space-y-3 p-6 md:col-span-2 md:p-8'>
          <Skeleton className='h-8 w-3/4' />
          <Skeleton className='h-5 w-24' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-5/6' />
          <Skeleton className='h-10 w-40' />
        </div>
      </div>
      <div className='mt-10 grid gap-10 md:grid-cols-3 md:gap-8'>
        {SLOTS_3.map((slot) => (
          <div key={slot} className='space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-4/5' />
            <Skeleton className='h-4 w-3/5' />
          </div>
        ))}
      </div>
    </div>
  );
}
```

And update the file's header comment's closing sentence — replace

```text
 * #223's silhouette; the per-surface skeletons (#224's surfaces) join
 * their surfaces at #224.
```

with

```text
 * #223's silhouette; the per-surface skeletons join their surfaces with
 * #224 (the catalog pair here; services/branches/about in that task).
```

- [ ] **Step 7: `routes/packages/index.tsx` — the settings intro + the plates (full rewrite)**

```tsx
import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { cn } from 'cn';
import { CatalogPlates } from '../../components/catalog-plates';
import { PackagesSkeleton } from '../../components/skeletons';
import { isEmptyJudgingParam } from '../../lib/empty-override';
import { pageMetaFor } from '../../lib/page-head';
import { servicePackageQueries, siteSettingsQueries } from '../../lib/queries';

export const Route = createFileRoute('/packages/')({
  // The never-throwing settings ensure (#215's law — the #223 root-loader
  // posture, page-local): the intro + head degrade to code defaults; the
  // packages read owns its own failure surface.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(servicePackageQueries.all());
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    return { settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    return { meta: pageMetaFor(settings.packagesTitle, settings.packagesDescription, settings) };
  },
  component: PackagesPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only —
  // first loads are server-rendered (the M5 freshness rule); judge by
  // throttling in devtools while clicking between pages.
  pendingComponent: PackagesSkeleton,
});

function PackagesPage() {
  // The ?empty=1 judging aid (M7 #223): DEV-gated — production builds
  // answer false by construction, so the aid never ships. The hooks run
  // unconditionally (rules of hooks); the gate renders after them.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().searchStr);
  // The API serves only ACTIVE packages here; inactive are invisible
  // (landing CONTEXT.md: Deactivated (Service Package)).
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { settings } = Route.useLoaderData();

  if (isEmpty || packages.length === 0) {
    // The ruled whole-page empty line (#164 Round 5): the M5 line + the
    // Back-to-home outline CTA; the h1 rides the settings title.
    return (
      <div className='mx-auto max-w-5xl px-6 py-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.packagesTitle}
        </h1>
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
    <div>
      {/* The ruled intro (#164 Round 3): the Services-page shape — h1 +
          description from settings, defaults being the Round-3-ratified
          draft. */}
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.packagesTitle}
        </h1>
        {settings.packagesDescription && (
          <p className='mt-2 max-w-prose text-muted-foreground'>
            {settings.packagesDescription}
          </p>
        )}
      </section>
      <section className='mx-auto max-w-5xl px-6 pt-8 pb-16'>
        <CatalogPlates strip={packages} />
      </section>
    </div>
  );
}
```

- [ ] **Step 8: `routes/packages/$slug.tsx` — the detail route (full rewrite)**

```tsx
import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { createFileRoute } from '@tanstack/react-router';
import { PackageDetail } from '../../components/package-detail';
import { PackageDetailSkeleton } from '../../components/skeletons';
import { toNotFoundError } from '../../lib/package-slug';
import { pageMetaFor } from '../../lib/page-head';
import { servicePackageQueries, siteSettingsQueries } from '../../lib/queries';

export const Route = createFileRoute('/packages/$slug')({
  loader: async ({ params, context: { queryClient } }) => {
    // The never-throwing settings ensure (#215's law): a dead settings read
    // degrades the head to code defaults; the package read still owns its
    // own failure (the global NotFound below).
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    try {
      const pkg = await queryClient.ensureQueryData(servicePackageQueries.bySlug(params.slug));
      return { pkg, settings };
    } catch (err) {
      throw toNotFoundError(err);
    }
  },
  head: ({ loaderData }) => {
    const pkg = loaderData?.pkg;
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    // The detail's title is the package's own name and its description the
    // entity's (the spec's page-titles law governs the five pages; the
    // detail composes through the same seam for the brand suffix).
    return { meta: pageMetaFor(pkg?.name ?? null, pkg?.description ?? null, settings) };
  },
  component: PackageDetailPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only —
  // first loads are server-rendered (the M5 freshness rule).
  pendingComponent: PackageDetailSkeleton,
  // Unknown/inactive slug → the router's notFound() — the ROOT's global
  // NotFound answers (M7 #223; the route-level override is gone).
});

function PackageDetailPage() {
  const { pkg } = Route.useLoaderData();
  return <PackageDetail pkg={pkg} />;
}
```

- [ ] **Step 9: Gates + commit**

`pnpm --filter @sevendays/landing fix` → `test -- --run` (**16 files / 123 tests**, unchanged from Task 1 — no new suite files) → `typecheck` → `build`. Then verify the fence: `grep -rn "PackageCard\|InclusionsList" apps/landing/src` returns nothing (both died with this task). Commit:

```bash
git add apps/landing/src/lib/use-truncated.ts apps/landing/src/components/catalog-plates.tsx apps/landing/src/components/package-detail.tsx apps/landing/src/components/inclusions-list.tsx apps/landing/src/components/featured-plates.tsx apps/landing/src/components/skeletons.tsx apps/landing/src/routes/packages/index.tsx apps/landing/src/routes/packages/$slug.tsx
git rm apps/landing/src/components/package-card.tsx
git commit -m "feat(landing): the ruled catalog - plates index with truncation-gated tooltips, the D2 detail + the framed/prints/privileges spec sheet (#224)"
```

### Task 3: Services + branches — the image-backed rows, the cover strips, the CTA-law sweep (UI-bearing)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant) before composing. Same adaptation rules as Task 2.

**Files:**
- Rewrite: `apps/landing/src/components/{service-card,branch-card}.tsx`
- Modify: `apps/landing/src/components/{home-cards,skeletons}.tsx`, `apps/landing/src/routes/{services,branches}.tsx`

**Interfaces:**
- Produces: `ServiceCard({ service, branchNames })` (recomposed, same props); `BranchCard({ branch })` (recomposed, same props) + the branches-page-local `WalkInIndicator`; `ServicesSkeleton` / `BranchesSkeleton`; the home marquee's Book chip carrying `CalendarPlus`.
- Consumes: Task 1's `pageMetaFor`; Task 2's `useTruncated`; `serviceBackground` from `home-cards`; `CoverPanel`, `Reveal`, the Tier-1 `Tooltip`/`Badge`/`Skeleton`; `bookableBranchNames`; `branchQueries`, `studioServiceQueries`, `siteSettingsQueries`.

**Not here:** the booking wizard's text `WalkInBadge` (fenced — `book.tsx` untouched); about (Task 4); the services call-visit strip's markup (keeps its landed theme-aware form verbatim); any `styles.css` edit.

- [ ] **Step 1: `components/service-card.tsx` — the image-backed split row (full rewrite)**

```tsx
import type { StudioServiceWithBranches } from '@sevendays/types';
import { Badge } from '@sevendays/ui/components/badge';
import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { peso } from '../lib/format';
import { useTruncated } from '../lib/use-truncated';
import { serviceBackground } from './home-cards';

// The studio-service row (/services), OWNER-RULED Round 3: the cover image
// IS the card — full-bleed themed background (the serviceBackground mapping
// the home marquee shares), the two-layer ink wash + bottom scrim keeping
// every text zone at the measured white-on-ink AA pair (#111's law),
// content anchored bottom, and the CTA PINNED at the bottom-right corner.
// Bookability chips ride the scrim as outline-on-dark badges. The CTA obeys
// the law (main books with CalendarPlus; the v1 arm's solid-primary "Call
// us" + Phone is a pick-time transform on the v1 branch, never runtime);
// an unpriced service renders no price line (#163 via peso).
//
// The description behaves like the packages plates (owner ruling): TWO-line
// clamp + tap-to-expand on mobile (coarse pointers, in-flow growth, never a
// scrollview), ONE line on desktop with the full text in the shared Tier-1
// tooltip — which opens ONLY when the line actually truncates (the
// useTruncated gate).
export function ServiceCard({
  service,
  branchNames,
}: {
  service: StudioServiceWithBranches;
  branchNames: string[];
}) {
  const price = peso(service.priceCents);
  const [expanded, setExpanded] = useState(false);
  const { ref: descRef, truncated } = useTruncated<HTMLParagraphElement>();
  // biome-ignore lint/a11y/useKeyWithClickEvents: the tap-to-expand affordance is coarse-pointer-only by ruling (touch); keyboard users see the branch chips and the booking flow carries the full text — a key handler here would double-fire navigation.
  const description = (
    <p
      ref={descRef}
      onClick={(e) => {
        if (window.matchMedia('(pointer: coarse)').matches) {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((v) => !v);
        }
      }}
      className={cn(
        'mt-2 min-h-10 w-full text-left text-sm text-white/85 leading-5 md:min-h-5',
        expanded ? 'md:line-clamp-none' : 'line-clamp-2 md:line-clamp-1',
        truncated
          ? 'pointer-coarse:cursor-pointer pointer-fine:cursor-help'
          : 'pointer-coarse:cursor-pointer'
      )}
    >
      {service.description}
    </p>
  );

  return (
    <article className='group relative flex min-h-72 flex-col justify-end overflow-hidden rounded-xl shadow-sm'>
      <img
        src={serviceBackground(service.name)}
        alt=''
        aria-hidden='true'
        className='absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.05] motion-reduce:transition-none'
        loading='lazy'
      />
      <div className='absolute inset-0 bg-brand-ink/35' aria-hidden='true' />
      <div
        className='absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/60 to-brand-ink/10'
        aria-hidden='true'
      />
      <div className='relative flex flex-col gap-2 p-6'>
        <div className='flex flex-wrap items-baseline justify-between gap-x-3'>
          <h3 className='font-bold font-serif text-white text-xl'>{service.name}</h3>
          {/* The unpriced law: nothing renders where the price would be. */}
          {price && <p className='font-mono text-brand-300 text-sm'>{price}</p>}
        </div>
        <TooltipProvider>
          {truncated ? (
            <Tooltip>
              <TooltipTrigger render={description} />
              <TooltipContent className='max-w-72 break-words'>
                <p className='leading-5'>{service.description}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            description
          )}
        </TooltipProvider>
        <div className='mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-2'>
          <div className='flex min-w-0 flex-wrap gap-1'>
            {branchNames.map((name) => (
              <Badge
                key={name}
                variant='outline'
                className='border-white/40 bg-transparent text-white'
              >
                {name}
              </Badge>
            ))}
          </div>
          <Link
            to='/book'
            search={{ service: service.id }}
            className={cn(
              buttonVariants({ size: 'sm' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book now
          </Link>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: `components/branch-card.tsx` — the cover strip + variant-split CTAs (full rewrite)**

```tsx
import type { BranchRead } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarClock, CalendarPlus, Footprints, Phone } from 'lucide-react';
import { useState } from 'react';
import { CoverPanel } from './cover-panel';

// The branch card (/branches) on the ruled language (#164 Round 4): the
// #214 cover as a 16:9 strip atop the card (the CoverPanel law — null
// renders today's muted placeholder), the walk-in badge as an icon tooltip
// beside the name, the phone as a mono tel: link, CTAs under a hairline.
//
// The variant-split CTAs (OWNER-RULED): MAIN = the icon-only outline call
// (aria-labeled, its previous text as the tooltip content — hover/focus
// opens, touch taps through to the call, which is what the icon promises)
// beside the primary "Book at this branch" (CalendarPlus — the CTA law).
// The v1 arm — a single solid-primary "Call {branch}" with Phone, ZERO
// book words on the page — is a pick-time transform on the v1 branch,
// never a runtime branch in this codebase (the #97 convention).
export function BranchCard({ branch }: { branch: BranchRead }) {
  return (
    <article className='group flex flex-col overflow-hidden rounded-xl border border-line-soft bg-card shadow-sm'>
      <div className='relative aspect-[16/9]'>
        <CoverPanel
          name={branch.name}
          coverImageUrl={branch.coverImageUrl}
          className='absolute inset-0 size-full rounded-none object-cover'
        />
      </div>
      <div className='flex flex-1 flex-col gap-2 p-6'>
        <div className='flex items-start justify-between gap-3'>
          <h3 className='font-semibold font-serif text-brand-ink text-xl dark:text-foreground'>
            {branch.name}
          </h3>
          <WalkInIndicator acceptsWalkIns={branch.acceptsWalkIns} />
        </div>
        <p className='text-muted-foreground'>{branch.address}</p>
        <a
          href={`tel:${branch.phone.replace(/\s+/g, '')}`}
          className='w-fit rounded-sm font-mono text-brand-700 text-sm transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring dark:text-brand-300 dark:hover:text-brand-200'
        >
          {branch.phone}
        </a>
        <div className='mt-3 flex flex-wrap gap-2 border-line-soft border-t pt-4'>
          {/* OWNER-RULED: the icon-only call affordance carries its
              previous text as a tooltip — hover (fine pointers) or focus
              (keyboard) opens it; on touch the tap just calls, which is
              what the icon promises. */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                    aria-label={`Call ${branch.name}`}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'icon' }),
                      'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
                    )}
                  >
                    <Phone className='size-4' aria-hidden='true' />
                  </a>
                }
              />
              <TooltipContent>Call {branch.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link
            to='/book'
            search={{ branch: branch.id }}
            className={cn(
              buttonVariants(),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book at this branch
          </Link>
        </div>
      </div>
    </article>
  );
}

// The walk-in indicator, OWNER-RULED Round 4: the text badge recomposes as
// an ICON with the shared tooltip — hover opens on fine pointers, TAP
// toggles on coarse ones (a controlled Tooltip: Base UI's hover alone
// doesn't fire reliably on touch). Both state texts survive verbatim in
// the tooltip copy and the trigger's aria-label. Branches-page-local BY
// DESIGN: the booking wizard's step keeps the text WalkInBadge (M7 leaves
// v2's booking surfaces untouched — the divergence is deliberate, and the
// v1 pick drops the negative tooltip's "or book online" clause there).
function WalkInIndicator({ acceptsWalkIns }: { acceptsWalkIns: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          render={
            <button
              type='button'
              aria-label={acceptsWalkIns ? 'Walk-ins welcome' : 'By appointment'}
              onClick={() => setOpen((v) => !v)}
              className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring',
                acceptsWalkIns
                  ? 'bg-brand-700/10 text-brand-700'
                  : 'bg-brand-ink/5 text-muted-foreground'
              )}
            >
              {acceptsWalkIns ? (
                <Footprints className='size-4' aria-hidden='true' />
              ) : (
                <CalendarClock className='size-4' aria-hidden='true' />
              )}
            </button>
          }
        />
        <TooltipContent className='max-w-56'>
          <p>
            {acceptsWalkIns
              ? 'Walk-ins welcome — come by anytime.'
              : 'By appointment — call ahead or book online.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 3: `components/home-cards.tsx` — the marquee Book chip joins the CTA law (the #223 fence)**

Add `CalendarPlus` to the lucide import (the file has no lucide import today — add `import { CalendarPlus } from 'lucide-react';` after the `Link` import), then replace the chip's span:

```tsx
        <span className='shrink-0 rounded-md border border-white/40 bg-brand-ink/60 px-3 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-brand-ink/80'>
          Book
        </span>
```

with

```tsx
        {/* The CTA law reaches the marquee chip with #224 (fenced from
            #223): every book affordance carries CalendarPlus — size-3.5
            fits the chip's compact register. */}
        <span className='inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/40 bg-brand-ink/60 px-3 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-brand-ink/80'>
          <CalendarPlus className='size-3.5' aria-hidden='true' />
          Book
        </span>
```

- [ ] **Step 4: `components/skeletons.tsx` — the two silhouettes**

After the `SLOTS_3` line from Task 2, add:

```ts
const SLOTS_4 = [1, 2, 3, 4];
```

Append at the file's end:

```tsx

/** Services (#164 Round 5, built #224): five image-backed card silhouettes. */
export function ServicesSkeleton() {
  return (
    <div className='skeleton-grammar mx-auto max-w-5xl px-6 py-16'>
      <Skeleton className='h-9 w-36' />
      <div className='mt-8 grid gap-6 sm:grid-cols-2'>
        {SLOTS_4.map((slot) => (
          <Skeleton key={slot} className='h-72 w-full rounded-xl' />
        ))}
      </div>
    </div>
  );
}

/** Branches (#164 Round 5, built #224): three cover-card silhouettes. */
export function BranchesSkeleton() {
  return (
    <div className='skeleton-grammar mx-auto max-w-5xl px-6 py-16'>
      <Skeleton className='h-9 w-40' />
      <div className='mt-8 grid gap-6 sm:grid-cols-2'>
        {SLOTS_3.map((slot) => (
          <div key={slot} className='overflow-hidden rounded-xl border border-line-soft'>
            <Skeleton className='aspect-[16/9] w-full rounded-none' />
            <div className='space-y-2 p-6'>
              <Skeleton className='h-5 w-1/2' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-10 w-40' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `routes/services.tsx` — the ruled intro + reveals (full rewrite; the strip verbatim)**

```tsx
import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { Reveal } from '../components/reveal';
import { ServiceCard } from '../components/service-card';
import { ServicesSkeleton } from '../components/skeletons';
import { bookableBranchNames } from '../lib/bookable-branches';
import { pageMetaFor } from '../lib/page-head';
import { branchQueries, siteSettingsQueries, studioServiceQueries } from '../lib/queries';

export const Route = createFileRoute('/services')({
  loader: async ({ context: { queryClient } }) => {
    // The never-throwing settings ensure (#215's law, page-local).
    await Promise.all([
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(branchQueries.all()),
    ]);
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    return { settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    return { meta: pageMetaFor(settings.servicesTitle, settings.servicesDescription, settings) };
  },
  component: ServicesPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only.
  pendingComponent: ServicesSkeleton,
});

function ServicesPage() {
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { settings } = Route.useLoaderData();

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.servicesTitle}
        </h1>
        {/* The ruled intro (#164 Round 3): the add-ons line is GONE — the
            Services page carries Studio Services only (add-ons live inside
            the booking flow, per the landing CONTEXT); the ruled draft is
            the settings default. */}
        {settings.servicesDescription && (
          <p className='mt-2 max-w-prose text-muted-foreground'>
            {settings.servicesDescription}
          </p>
        )}
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {services.map((s, i) => (
            <Reveal key={s.id} delay={(i % 2) * 90}>
              <ServiceCard service={s} branchNames={bookableBranchNames(s, branches)} />
            </Reveal>
          ))}
        </div>
      </section>
      {/* Closing call-or-visit strip (#60 ruling) — the #97 emphasis-strip
          pattern, KEPT VERBATIM as landed (theme-aware pair included).
          Call-or-visit flavored: no booking presupposition on either
          edition. */}
      <section
        className='mt-12 border-line-soft border-t bg-brand-gray-light'
        data-strip='call-visit'
      >
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='font-semibold font-serif text-foreground text-xl'>
              Need a service at one of our branches?
            </h2>
            <p className='mt-1 text-brand-700 text-sm dark:text-brand-400'>
              Call or visit a branch — we will confirm availability.
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

- [ ] **Step 6: `routes/branches.tsx` — the ruled intro + reveals (full rewrite)**

```tsx
import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { cn } from 'cn';
import { BranchCard } from '../components/branch-card';
import { Reveal } from '../components/reveal';
import { BranchesSkeleton } from '../components/skeletons';
import { isEmptyJudgingParam } from '../lib/empty-override';
import { pageMetaFor } from '../lib/page-head';
import { branchQueries, siteSettingsQueries } from '../lib/queries';

export const Route = createFileRoute('/branches')({
  loader: async ({ context: { queryClient } }) => {
    // The never-throwing settings ensure (#215's law, page-local).
    await queryClient.ensureQueryData(branchQueries.all());
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    return { settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    return { meta: pageMetaFor(settings.branchesTitle, settings.branchesDescription, settings) };
  },
  component: BranchesPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only.
  pendingComponent: BranchesSkeleton,
});

function BranchesPage() {
  // The ?empty=1 judging aid (M7 #223) — DEV-gated, never ships.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().searchStr);
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { settings } = Route.useLoaderData();

  if (isEmpty || branches.length === 0) {
    // The ruled no-branches line (#164 Round 5's copy) + the Back-to-home
    // outline CTA — a branchless read reads as deliberate, not broken.
    return (
      <div className='mx-auto max-w-5xl px-6 py-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.branchesTitle}
        </h1>
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
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12 pb-16'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.branchesTitle}
        </h1>
        {/* The ruled intro (#164 Round 4, draft ratified at the round's
            close). The v1 arm's tail "…or book online." → "…call ahead."
            is a pick-time transform on the v1 branch — main renders the
            settings copy verbatim, no runtime variant machinery. */}
        {settings.branchesDescription && (
          <p className='mt-2 max-w-prose text-muted-foreground'>
            {settings.branchesDescription}
          </p>
        )}
        <div className='mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {branches.map((b, i) => (
            <Reveal key={b.id} delay={(i % 2) * 90}>
              <BranchCard branch={b} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Gates + commit**

`pnpm --filter @sevendays/landing fix` → `test -- --run` (**16 files / 123 tests**, unchanged) → `typecheck` → `build`. Verify the fence: `grep -n "WalkInBadge" apps/landing/src/routes/book.tsx apps/landing/src/components/branch-strip-item.tsx` still finds the text badge's uses (untouched), and `grep -rn "readPrototypeVariant\|prototype-standins\|?v=" apps/landing/src` returns nothing. Commit:

```bash
git add apps/landing/src/components/service-card.tsx apps/landing/src/components/branch-card.tsx apps/landing/src/components/home-cards.tsx apps/landing/src/components/skeletons.tsx apps/landing/src/routes/services.tsx apps/landing/src/routes/branches.tsx
git commit -m "feat(landing): the ruled services rows + branch strips - icon-tooltipped walk-in badges, the variant-split CTAs, the CTA-law sweep (#224)"
```

### Task 4: About, the form page's polish, and home's head (UI-bearing)

**Load the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant) before composing. About is a full rewrite on the Round-4-ruled composition; the form page's delta is deliberately small (it already wears the ruled shape since #216 — this ticket adds the milestone's pending vocabulary); home gains only its `<head>`.

**Files:**
- Rewrite: `apps/landing/src/routes/about.tsx`
- Modify: `apps/landing/src/routes/{share-your-story,index}.tsx`, `apps/landing/src/components/skeletons.tsx`

**Interfaces:**
- Produces: the ruled about composition (settings-driven title/description/story over `storyParagraphs`, the captioned `MosaicPhotoGrid`, the quote wall, the submissions CTA, `?empty=1` judging, `AboutSkeleton`); the form submit's pending vocabulary; home's settings-driven `<head>`.
- Consumes: Task 1's `pageMetaFor` + `storyParagraphs`; `MosaicPhotoGrid` (captions support landed #223); `gallery-tabs` helpers; `galleryQueries`, `testimonialQueries`, `siteSettingsQueries`; `isEmptyJudgingParam`; `LoaderCircle`.

**Not here:** the gallery wire or captions (live since #214); testimonial pagination (home-only, #223); any booking surface; the share-your-story title/meta (stays its hardcoded literal — not one of the five settings pages); the round (Task 5).

- [ ] **Step 1: `routes/about.tsx` — the ruled composition (full rewrite)**

```tsx
import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { cn } from 'cn';
import { PenLine } from 'lucide-react';
import { useState } from 'react';
import { MosaicPhotoGrid } from '../components/mosaic-photo-grid';
import { AboutSkeleton } from '../components/skeletons';
import { isEmptyJudgingParam } from '../lib/empty-override';
import {
  ALL_TAB_ID,
  deriveGalleryTabs,
  hasPortfolioPhotos,
  photosForTab,
} from '../lib/gallery-tabs';
import { pageMetaFor } from '../lib/page-head';
import { galleryQueries, siteSettingsQueries, testimonialQueries } from '../lib/queries';
import { storyParagraphs } from '../lib/story-paragraphs';

export const Route = createFileRoute('/about')({
  // SSR-prefetched like every route: a fresh page load renders current data
  // (the M5 "immediately" rule); default staleTime refetches per visit. The
  // settings ensure never throws (#215's law — the head + copy degrade to
  // code defaults).
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(galleryQueries.all()),
      queryClient.ensureQueryData(testimonialQueries.all()),
    ]);
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    return { settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    return { meta: pageMetaFor(settings.aboutTitle, settings.aboutDescription, settings) };
  },
  component: AboutPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only.
  pendingComponent: AboutSkeleton,
});

function AboutPage() {
  // The ?empty=1 judging aid (M7 #223): DEV-gated. The about empties are
  // in-page sections — the Round-5 ruling keeps them CTA-less.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().searchStr);
  const { settings } = Route.useLoaderData();
  const { data: gallery } = useSuspenseQuery(galleryQueries.all());
  const { data: testimonials } = useSuspenseQuery(testimonialQueries.all());
  const tabs = isEmpty ? [] : deriveGalleryTabs(gallery);
  const [selected, setSelected] = useState<string>(ALL_TAB_ID);
  // A refetch can empty the selected category mid-session; clamp to All.
  const activeId = tabs.some((tab) => tab.id === selected) ? selected : ALL_TAB_ID;
  const photos = photosForTab(gallery, activeId);
  // The spec's ruling: the story is plain multi-paragraph text — newlines
  // are paragraphs, rich text stays parked (the seam trims + drops
  // empties; the born-empty default renders the coming-soon line).
  const paragraphs = storyParagraphs(settings.aboutStory);

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.aboutTitle}
        </h1>
        {settings.aboutDescription && (
          <p className='mt-2 max-w-prose text-muted-foreground'>{settings.aboutDescription}</p>
        )}
        {paragraphs.length > 0 && (
          <div className='mt-4 max-w-prose space-y-3'>
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className='text-muted-foreground leading-relaxed'>
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* The portfolio — the artifact leads: the shared mosaic wall over
          the LIVE read (home + about speak one wall — #223 built it; the
          captions render here per the Round-4 ruling and #214's wire), All
          first, tabs derived (#142's behavior; the CDP-asserted seams
          data-gallery-tabs / data-portfolio-grid stand). */}
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink dark:text-foreground'>
          Portfolio
        </h2>
        {isEmpty || !hasPortfolioPhotos(gallery) ? (
          // Zero photos (or no photo-holding categories): the tab row hides
          // and the spec-verbatim placeholder renders. No grid, no tabs.
          <p className='mt-4 text-muted-foreground'>Portfolio coming soon.</p>
        ) : (
          <>
            {/* biome-ignore lint/a11y/useSemanticElements: AR4's ruled hand-rolled tab row — a fieldset would drag in form semantics; the group + aria-pressed buttons are the composition the CDP script asserts */}
            <div
              role='group'
              aria-label='Portfolio categories'
              data-gallery-tabs
              className='mt-4 flex flex-wrap gap-2'
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type='button'
                  aria-pressed={tab.id === activeId}
                  onClick={() => setSelected(tab.id)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring',
                    tab.id === activeId
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-line-soft bg-card text-foreground hover:bg-wash-a'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div data-portfolio-grid>
              <MosaicPhotoGrid photos={photos} captions />
            </div>
          </>
        )}
      </section>

      {/* Kind words — the full set as the quote wall (#164 Round 4): a
          two-column serif read with mono attributions, then the
          submissions CTA closing the page. */}
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12 pb-12'>
        <h2 className='font-semibold font-serif text-2xl text-brand-ink dark:text-foreground'>
          Kind words
        </h2>
        {isEmpty || testimonials.length === 0 ? (
          <p className='mt-2 text-muted-foreground'>What clients say is coming soon.</p>
        ) : (
          <div className='mt-6 columns-1 gap-6 md:columns-2 [&>figure]:mb-6 [&>figure]:break-inside-avoid'>
            {testimonials.map((t) => (
              <figure key={t.id} className='border-line-soft border-l-2 pl-4'>
                <blockquote className='font-serif text-brand-ink leading-relaxed dark:text-foreground'>
                  “{t.quote}”
                </blockquote>
                <figcaption className='mt-2 font-bold font-mono text-brand-700 text-xs uppercase tracking-wider dark:text-brand-300'>
                  {t.person}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {/* The submissions CTA (M7 #216, the #164 Round-4-ruled card): the
            only door to /share-your-story — v1's only public write surface. */}
        <div className='mt-10 flex flex-col items-start justify-between gap-4 rounded-xl border border-line-soft bg-card p-6 shadow-sm sm:flex-row sm:items-center'>
          <div>
            <h3 className='font-semibold font-serif text-brand-ink text-xl dark:text-foreground'>
              Shot with us recently?
            </h3>
            <p className='mt-1 text-muted-foreground text-sm'>
              Share a few words about your session — we'd love to hear it.
            </p>
          </div>
          <Link
            to='/share-your-story'
            className={cn(
              buttonVariants(),
              'shrink-0 focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <PenLine className='size-4' aria-hidden='true' />
            Share your story
          </Link>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: `components/skeletons.tsx` — the about silhouette**

Append at the file's end (the `SLOTS_8` const is already there from #223):

```tsx

/** About (#164 Round 5, built #224): the tab row + the mosaic wall
 * silhouette. */
export function AboutSkeleton() {
  return (
    <div className='skeleton-grammar mx-auto max-w-5xl px-6 py-16'>
      <Skeleton className='h-9 w-32' />
      <div className='mt-8 flex gap-2'>
        <Skeleton className='h-8 w-20 rounded-full' />
        <Skeleton className='h-8 w-24 rounded-full' />
        <Skeleton className='h-8 w-16 rounded-full' />
      </div>
      <div className='mt-6 grid grid-flow-dense auto-rows-[9rem] grid-cols-2 gap-4 md:auto-rows-[11rem] md:grid-cols-4'>
        {SLOTS_8.map((slot) => (
          <Skeleton key={slot} className='h-full w-full rounded-xl' />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `routes/share-your-story.tsx` — the submit's pending vocabulary**

(a) Extend the lucide import: `import { CheckCircle2, LoaderCircle } from 'lucide-react';`

(b) Replace the submit button block:

```tsx
          <button
            type='submit'
            disabled={!canSubmit}
            className={cn(buttonVariants(), 'self-start disabled:opacity-50')}
          >
            Send my story
          </button>
```

with

```tsx
          {/* The milestone's one pending vocabulary (#218's law, reached
              with #224): disabled in flight, the spinner in the label's
              place, the label swap, aria-busy always. */}
          <button
            type='submit'
            disabled={!canSubmit}
            aria-busy={sending}
            className={cn(buttonVariants(), 'self-start disabled:opacity-50')}
          >
            {sending ? <LoaderCircle className='size-4 animate-spin' aria-hidden='true' /> : null}
            {sending ? 'Sending…' : 'Send my story'}
          </button>
```

(c) In the page's header comment, replace the two wrapped lines (lines 34–35 today)

```text
// submit stays today's plain disabled vocabulary — #218's pending system
// covers this surface with the rest.
```

with

```text
// submit wears the milestone's one pending vocabulary since #224 (disabled
// + spinner + "Sending…" + aria-busy).
```

(Nothing else on the page changes — it already wears the ruled Round-4 composition since #216; the round may retune visuals.)

- [ ] **Step 4: `routes/index.tsx` — home's settings-driven head**

(a) Add to the imports: `SITE_SETTINGS_DEFAULTS` joining the `@sevendays/types` import (add the import line if absent — the file has none today), and `pageMetaFor` from `../lib/page-head`.

(b) Replace the loader:

```tsx
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(siteSettingsQueries.all()),
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(galleryQueries.all()),
      queryClient.ensureQueryData(testimonialQueries.all()),
    ]);
  },
```

with

```tsx
  loader: async ({ context: { queryClient } }) => {
    // The settings leg never throws (#215's law): home's <head> degrades to
    // code defaults, never to a thrown loader — the four data reads still
    // own their failure surface.
    const settings = queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    const [resolved] = await Promise.all([
      settings,
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(galleryQueries.all()),
      queryClient.ensureQueryData(testimonialQueries.all()),
    ]);
    return { settings: resolved };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    return { meta: pageMetaFor(settings.homeTitle, settings.homeDescription, settings) };
  },
```

(c) Update the loader's leading comment's parenthetical — replace

```text
(the root loader already
  // ensured settings; this ensure is idempotent cache-wise and keeps the
  // route honest standalone)
```

with

```text
(the root loader already
  // ensures settings; this leg adds the never-throwing catch + the
  // loaderData return home's head reads)
```

- [ ] **Step 5: Gates + commit**

`pnpm --filter @sevendays/landing fix` → `test -- --run` (**16 files / 123 tests**, unchanged) → `typecheck` → `build`. Fence check: `grep -rn "WalkInBadge" apps/landing/src/components/walk-in-badge.tsx apps/landing/src/routes/book.tsx` — both still the text badge, untouched. Commit:

```bash
git add apps/landing/src/routes/about.tsx apps/landing/src/routes/share-your-story.tsx apps/landing/src/routes/index.tsx apps/landing/src/components/skeletons.tsx
git commit -m "feat(landing): the ruled about - story paragraphs, the captioned mosaic wall, the quote wall; the form's pending vocabulary; page titles + meta (#224)"
```

### Task 5: The owner-reacted variants round, both themes (controller interaction)

The ticket's fifth AC: "The form page wears the redesign; owner-reacted rendered variants per surface." The round is the design gate for the ONE `TODO(owner-copy)` default this plan carries (the `aboutDescription` draft — a retune lands in the same commit as its `site-settings.test.ts` pin edit) and the first live look at every composition Tasks 2–4 landed. The #164 rounds already ruled the direction — this round verifies the BUILD against those rulings and rules the genuinely new compositions (the settings-driven intros/head, the about story+description rendering, the form's pending vocabulary).

**Files:**
- Modify (only if the round retunes): the files Tasks 1–4 landed (copy/classes)
- Write: the evidence dir `.superpowers/sdd/2026-10-20-224-landing-redesign-2/` (captures, the rulings)

**Interfaces:** none new — string/class-level retunes and evidence only.

**Not here:** re-litigating ruled values (the plates, the spec sheet, the tooltip chain, the icon sweep, the branch variant-split — #164 closed those; the round judges build fidelity + the new compositions only); the milestone Verify box (#225); any suite change beyond a copy-retune's same-commit test edit.

- [ ] **Step 1: Seed the states and capture both themes**

Run the dev stack (`pnpm dev`). Judging setup THROUGH THE ADMIN (the dev owner account): if the dev catalog has no long package description, elongate one via the CMS (the truncation gate needs a truncating row to judge); if no branch covers are set, upload one or two via the branch editor (the CoverPanel placeholder judges the null case regardless); optionally save a MULTI-PARAGRAPH About story + a custom `aboutDescription` through the Site tab (proving the settings drive), noting everything to revert. Capture, in BOTH themes (the header toggle; light judged first per #162):

1. **Catalog index** — /packages desktop (reveals on scroll, hover lift + zoom, uniform 2-line clamps, the truncation-gated tooltip opening ONLY on the long row) and at 390×844 (tap-to-expand growing the plate in flow — never an inner scroll).
2. **Package detail** — /packages/$slug (the split plate, the spec sheet's three groups with per-frame nesting, the back link, the one primary CTA) + an UNPRICED row (toggle one row's Priced off in the CMS if none — the #163 law re-verified on every new price site: plate, detail panel, service row; then revert).
3. **Services** — the image-backed rows (1-line desktop descriptions + tooltips, 2-line mobile + tap-to-expand, the 1.05 zoom, bottom-right CTAs, branch chips), the ruled intro, the strip.
4. **Branches** — the cover strips (cover + placeholder mix), the walk-in icon tooltips BOTH states (hover desktop, tap mobile), the icon-only call's tooltip, "Book at this branch", the ruled intro.
5. **About** — the story paragraphs (multi-paragraph if seeded), the description line, the captioned mosaic wall (captions when the CMS carries them), the quote wall, the submissions CTA; `/about?empty=1` for the in-page empties.
6. **The form** — /share-your-story at rest + the Sending… state (throttle the network to catch it).
7. **Head verification** — view-source on /packages, /packages/$slug, /services, /branches, /about, /: each `<title>` carries the brand suffix, the meta description renders from settings; with a temporary Site-tab title/description edit saved, reload and capture the drive, then revert.
8. **Skeletons** — devtools network throttling (Slow 3G) while client-navigating to each surface: the five silhouettes with the brand-tinted sweep.

Save every capture to the evidence dir with a one-line narration of what it proves.

- [ ] **Step 2: The owner reacts; record + apply the rulings**

Present the captures (light first, dark in the same round). Record the rulings verbatim in the evidence dir. Then apply: (a) copy retunes edit the pinned strings in place and retire the `TODO(owner-copy)` marker (replaced by the dated house note, or surviving verbatim where the owner defers); an `aboutDescription`-default retune lands in the SAME commit as its `site-settings.test.ts` pin edit; (b) composition retunes edit the components in place; (c) if a retune lands interactive text on off-token palette classes, re-measure contrast first (≥ 4.5 for text — `scripts/measure-theme-pairs.mjs`; never edit its recorded tables without re-running it).

- [ ] **Step 3: Cleanup + gates + commit**

Revert the judging saves THROUGH THE ADMIN (the elongated description, the toggled unpriced row, the branch covers if temporary, the story/description/title edits) — the reverted state is itself a final capture ("defaults render" twice). `pnpm --filter @sevendays/landing fix` → `test -- --run` → `typecheck` → `build`; if a types default retuned, also `pnpm --filter @sevendays/types build` + `test -- --run`. Commit (skip if the round changed nothing — fold the evidence into Task 6):

```bash
git add apps/landing/src packages/types/src
git commit -m "chore(landing): the redesign II variants round settled - copy and compositions as ruled, both themes (#224)"
```

### Task 6: Gates, docs rotation — both shared boxes TICK — PR, v1 pick, graphify

**Files:**
- Modify: `docs/plan.md`, `docs/progress.md`, `AGENTS.md`
- Post-merge: `docs/agents/v1-picks.md`, the #224 issue body, `graphify-out/`

**Interfaces:** none.

**Not here:** the milestone Verify box (#225's — stays unticked); the v1 cherry-pick EXECUTION (#225 executes the picks per the runbook; this task lands the triage ledger row only); any #222 surface.

- [ ] **Step 1: The full gate sweep**

`pnpm --filter @sevendays/landing fix` → `test -- --run` (**16 files / 123 tests**, or the Task 5-retuned counts) → `typecheck` → `build`; `pnpm --filter @sevendays/types test -- --run` + `typecheck` (**18 files / 170 tests**); `pnpm --filter @sevendays/admin test -- --run` + `typecheck` (**26 files / 254 tests** — no admin files changed; the sweep proves the types-defaults delta drifted nothing). Reconcile any drift before proceeding — never loosen assertions.

- [ ] **Step 2: `docs/plan.md` — BOTH shared boxes TICK with #224 annotations**

(a) The redesign box (`- [ ] Landing — the redesign build (#164's ruled direction…`) — change the leading `- [ ]` to `- [✅]`, and append inside the line, after the #223 annotation's closing `_`:

```text
 _(2026-10-XX, #224: Part II landed — the catalog as ruled index A plates (reveals + hover lift, uniform 2-line clamps with the truncation-gated tooltips on desktop and tap-to-expand in flow on mobile), the D2 package detail with the framed/prints/privileges spec sheet (framed nested per frame), the image-backed service rows (themed backgrounds, 1-line desktop / 2-line mobile descriptions on the shared useTruncated gate, 1.05 zoom, bottom-right CTAs), the branch cover strips with the icon-tooltipped walk-in badges and the variant-split CTAs (main: icon-only call with the tooltip + primary "Book at this branch"; v1: single "Call {branch}", zero book words — a pick-time transform), the CTA law swept on every surface incl. the home marquee chip, the per-surface skeletons (packages/detail/services/branches/about), and the unpriced law re-verified at every redesigned price site; owner-reacted both themes. Both halves landed — the box ticks.)_
```

(b) The consumption box (`- [ ] Both apps — site settings consumed: brand chrome…`) — change the leading `- [ ]` to `- [✅]`, and append inside the line, after the #223 annotation's closing `_`:

```text
 _(2026-10-XX, #224: the pages half landed — the five pages' titles/descriptions driving their visible h1/sub-copy AND their <title>/meta description (the brand-suffix seam, never-throwing page-local ensures; the ruled Round-3/4 intros became the code defaults, the About sub-copy the one round-ratified draft), the About story rendering as paragraphs (newlines = paragraphs), home's head, and the settings-driven empties' h1s; owner-reacted both themes. Both halves landed — the box ticks.)_
```

(Fill the XX with the actual date. The milestone Verify box below them stays #225's, unticked.)

- [ ] **Step 3: `docs/progress.md` + `AGENTS.md`**

(a) `docs/progress.md` — append the entry: the ticket, the date, what landed (per the two annotations), the round's outcome (rulings applied, the `TODO(owner-copy)` retired or deferred), the gate counts, and the live-verification notes (the truncation gate, the unpriced re-verification, the head drive via a temporary Site-tab save, the throttled skeletons).

(b) `AGENTS.md` — three edits. First, the landing suite line in *Current status of `pnpm test`*: extend the #223 clause with "…; + #224's two redesign-II seams — the page-head composition, the about story paragraphs — 16 files / 123 tests" (replacing the trailing "14 files / 115 tests"). Second, the site-settings parenthetical "both apps' chrome consumption is live since the redesign ticket #223 (the landing chrome + admin sidebar; page titles + the About story ride #224)" becomes "both apps' consumption is live since the redesign tickets #223/#224 (the landing chrome + admin sidebar; the five pages' titles/descriptions driving h1 + SEO meta, and the About story as paragraphs)". Third, the M5-ticket-08 landing-consumption sentence "the CoverPanel rule (img on coverImageUrl, today's placeholder verbatim on null) governs the packages list, detail, and home featured surfaces" becomes "…governs the packages list (plates), detail, home featured, and branch strip surfaces (the #164 redesign)".

- [ ] **Step 4: The PR**

Push the branch, open the PR against main (title: `The landing redesign II — catalog, services, branches, the form page (#224)`), body: the five ACs each with the evidence pointer (captures dir, gate output), the fenced sibling-fences list from this plan's header, and the note that both shared plan.md boxes now TICK with #224 annotations. Squash-merge with `feat(landing): the landing redesign II — catalog, services, branches, the form page (#224)`.

- [ ] **Step 5: Post-merge — the v1-pick ledger row, the issue, graphify**

(a) Per the runbook (`docs/agents/v1-picks.md`, main-only): triage the merged PR — the spec's class table pre-rules the payload "PICK with transformed-surface conflicts". Land the ledger row recording: SPLIT per class, with the transforms fenced now (Global Constraints' edition law lists them verbatim — the detail/services/branch-card/home-chip call-forward swaps, the branches intro tail, the walk-in tooltip's negative clause; the plates, spec sheet, skeletons, empties, about, the form, and the head/meta consumption pick clean; the four page-description defaults pick whole with their test pairs, v1 re-tuning only the branches tail). Commit `docs(v1-picks): #NNN ledger row - the #224 pick (redesign II: catalog + services + branches + the form page; transformed-surface fences recorded, execution at #225)` (adjust the PR number to the actual one).

(b) Issue #224: tick all five AC boxes `- [✅]`, add the closing comment (what landed, the round's rulings, the #225 hand-off).

(c) `graphify update .` (code was modified) — commit the graph churn separately per the repo's habit (`chore(graphify): post-#224 graph update`), never staging unrelated files.

---

## Self-Review Checklist (for the executor's final pass)

- [ ] Every fenced code block compiled as-written or adapted with the named deltas (no placeholder prose left in code).
- [ ] Both shared plan.md boxes are `- [✅]` with #224 annotations appended after the #223 ones; the milestone Verify box is untouched.
- [ ] `grep -rn "prototype-standins\|readPrototypeVariant\|pesoOrNull\|?v=" apps/landing/src` returns nothing (the edition law + the mining boundary — no variant machinery, no stand-in seams).
- [ ] `grep -rn "PackageCard\|InclusionsList" apps/landing/src` returns nothing (both died with the plates).
- [ ] `grep -rn "notFoundComponent" apps/landing/src/routes/` returns only `__root.tsx`; `book.tsx` and `components/booking/*` are untouched; `walk-in-badge.tsx` still renders the text badge.
- [ ] `grep -c "export function" apps/landing/src/components/skeletons.tsx` = 6 (Home + the five #224 silhouettes); every route that gained data also gained `pendingComponent`.
- [ ] The unpriced law verified live at the plate, the detail panel, and the service row (an unpriced row renders nothing where the price would be).
- [ ] The truncation gate verified live: a fitting description gets no tooltip and no help cursor; a truncating one opens the tooltip on desktop and tap-expands on mobile.
- [ ] Both themes captured for every round surface; the head drive proven via a temporary Site-tab save (then reverted).
- [ ] Gate counts match the baselines (or the retuned reconciled numbers): types 18/170, landing 16/123, admin 26/254.


