# M3 Ticket 03 — Landing Chrome + Atmosphere: Ink Bands, SiteFooter, MobileNav, Wash Ground (#97) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** Frame every landing route with the owner-ruled #92 atmosphere: `SiteHeader` rebuilt ink-led (ink band, white text, petrol action color, desktop row structure unchanged), a new `SiteFooter` on all surfaces, and a new `MobileNav` (hamburger + Base UI collapsible disclosure panel with current-page semantics) — all mounted once as root chrome instead of eleven per-route renders. The home page sits on the petrol-wash ground: hairline-separated strips, white-card strip items, the deep-petrol media gradient on `CoverPanel`, and one gray-light emphasis strip closing the page. Every band CTA is `buttonVariants`-styled with a full-opacity brand focus ring. Zero logic, URL, or `data-*`-seam changes — the M2 CDP read-only regressions and the lib-seam tests stay green unchanged.

**Architecture:** Chrome moves to `__root.tsx` — `RootDocument` wraps the routed children in `SiteHeader` / `<main>` / `SiteFooter` inside a `min-h-screen` flex column. This is the only way the ink bands read full-bleed (today `<SiteHeader />` renders inside each page's `mx-auto max-w-5xl p-6` container — 9 files, 11 renders). A three-line `lib/nav.ts` (`NAV_LINKS`) feeds header, `MobileNav`, and footer so the four nav links exist exactly once. `MobileNav` composes the shared `collapsible` Tier-1 primitive (`shadcn add`-generated into `packages/ui` over Base UI — the disclosure semantics come from the primitive; the current-page semantics come free from TanStack Router's `Link`, which sets `data-status="active"` + `aria-current="page"` on the active link). Band CTAs are `Link`s styled with `buttonVariants()` — "the focus-visible treatment the body CTAs already have" is the Button primitive's ring, strengthened to full-opacity `ring-brand-focus-ring` on the dark bands (the default `ring-ring/30` at 30% opacity over ink is too weak; full opacity measures 7.15:1). Main ships booking-present CTAs only ("Book now"); there is NO runtime edition flag — the v1 variants ("Call us") are produced at pick time by the transformed-surface conflict policy, which is exactly why the footer carries no booking CTA at all.

**Tech Stack:** TanStack Start (file routes, root route `shellComponent`), TanStack Router `Link` (typed routes + automatic active-state attributes), Base UI (`@base-ui/react` ^1.8.0 — Collapsible Root/Trigger/Panel), shadcn CLI 4.21.0 (`base-rhea` style, routed into `packages/ui` per ADR-0017), Tailwind v4 CSS-first utilities over the #96 token layer (`bg-brand-ink`, `bg-wash-base`, `border-line-soft`, `ring-brand-focus-ring`, …), lucide-react (Menu/X), Biome, Vitest (existing suites only — no new tests, the milestone bar is invariants + visual acceptance).

**Spec:** Implements ticket [#97 "M3 ticket 03 — landing chrome + atmosphere: ink bands, SiteFooter, MobileNav, wash canvas"](https://github.com/jeius/sevendays/issues/97) under spec [#94 "Milestone 3 — UI/UX Design System (spec)"](https://github.com/jeius/sevendays/issues/94) (`docs/specs/2026-09-14-ui-ux-design-system-spec.md`). Composition reference: the #92 owner-approved mock, now live as the gallery reference `apps/landing/src/components/prototype/composition-mock.tsx` (landed by #96). Key spec facts this plan obeys:

- **Atmosphere (owner-ruled):** header + footer are ink-led bands (brand-ink background, white text, petrol as the header's action color); body is the petrol-wash canvas (already `--background` since #96) with white cards and cool hairline separators; gray-light is demoted to alternating emphasis strips; deep petrol is accent-only (media gradients, CTA labels on white).
- **Headings stay SANS everywhere on product surfaces (owner ruling).** The #92 mock's `font-serif` headings are the approved gallery specimen demonstration only — every real component this plan writes uses the default sans (Figtree). Do not copy `font-serif` out of the mock.
- **`SiteFooter`:** brand line, the four nav links, "Call or visit a branch" → `/branches`; **no booking CTA on either variant** — identical pre/post v1-scrub. The mock's footer tagline ("Photography studios in Makati, Quezon City, and BGC.") is invented #92 placeholder copy — the live seed's branches are Calamba / Iligan / Dipolog — so the footer ships NO city tagline; the owner can add copy at #101's screenshot acceptance.
- **`MobileNav`:** hamburger trigger + collapsible panel carrying the four nav links plus the variant CTA ("Book now" on main, "Call us" on v1), proper disclosure navigation (owner overrule of a simple link row) with current-page semantics.
- **Focus-visible normalization:** all band CTAs (header CTA, footer strips' CTAs, mobile panel CTA) get the treatment the body CTAs already have.
- **A11y bar:** Base UI/shadcn defaults plus keyboard and responsive passes — no formal audit, no new behavioral test suites.
- **v1 coverage:** the ruled booking-off pieces are styled by this milestone but swapped by the established scrub mechanism at pick time — never by runtime branching.

## Global Constraints

- **Work happens in the worktree `.worktrees/97-landing-chrome-atmosphere`** (branch `feat/97-landing-chrome-atmosphere`, cut from main `385712d`; this plan is committed there). Baseline verified 2026-09-15 in that worktree: `pnpm install`, `pnpm build:packages`, `pnpm --filter @sevendays/api build`, and full `pnpm check` all green. Re-verify the baseline before Task 1 if the branch sat idle.
- **Pinned tooling versions (probed live 2026-09-15):** shadcn CLI `4.21.0` (every invocation `pnpm dlx shadcn@4.21.0 …`, never `@latest`); `@tanstack/react-router` lockfile-resolved to `1.170.36` — its `Link` sets `data-status="active"` AND `aria-current="page"` on the active link automatically (`dist/esm/link.js:240-241`, verified in `node_modules`), so current-page styling is `aria-[current=page]:` variants and NO custom active-detection code; `@base-ui/react` `^1.8.0`; `lucide-react` `^1.37.0` (already a landing dependency — no package.json changes in this ticket).
- **New band contrast pairs (measured 2026-09-15 with the Task 5 script; every value must reproduce):**

  | Pair | Values | Ratio | Bar |
  |---|---|---|---|
  | white-on-ink | `#ffffff` on `#0e131a` | 18.64 | text 4.5 ✓ |
  | white/85-on-ink | `#dbdcdd` (85% white over ink) on `#0e131a` | 13.57 | text 4.5 ✓ |
  | white/70-on-ink | `#b7b8ba` (70% white over ink) on `#0e131a` | 9.39 | small text 4.5 ✓ |
  | ring-on-ink | `#69a9c2` (brand-400) on `#0e131a` | 7.15 | non-text 3.0 ✓ |
  | brand-700-on-gray-light | `#00566e` on `#dedede` | 6.11 | text 4.5 ✓ |
  | ink-on-wash | `#0e131a` on `#f1f8fb` | 17.36 | text (outline CTA label on its wash fill) ✓ |

  Existing #92 pairs that must still hold (re-run in Task 5): white-on-primary 5.65, ink-on-light 13.85, link-on-white 8.22, muted-on-wash 4.59.
- **Band-CTA pattern (used by Tasks 2 and 4's strip CTA):** a band CTA (header, footer, mobile panel, emphasis strip) is a `<Link>` whose className is `cn(buttonVariants({ … }), 'focus-visible:ring-3 focus-visible:ring-brand-focus-ring')` — `buttonVariants` imported from `@sevendays/ui/components/button`. The two override classes re-color the Button primitive's `focus-visible:ring-ring/30` to full-opacity brand-400 (`cn` is tailwind-merge-backed, so the later ring-color wins); everything else about the primitive's focus treatment is inherited. Body CTAs (the home hero zone — #98 rebuilds it) keep the Button primitive's default ring: that IS "the treatment the body CTAs already have" the spec references. Never wrap a `Button` inside a `Link` (invalid nesting) and never hand-roll a new focus treatment.
- **No token/CSS changes.** `packages/ui/src/tokens.css` and both apps' `styles.css` are complete from #96 and UNTOUCHED here — the utilities this plan needs (`bg-brand-ink`, `bg-brand-gray-light`, `bg-card`, `bg-wash-base`, `border-line-soft`, `ring-brand-focus-ring`, `text-white/85`, `aria-[current=page]:`) all exist on the current layer. If a value seems missing, stop — that is a spec deviation to raise, not a plan liberty. Landing's `styles.css` already carries `@source "../../../packages/ui/src"` (from #95), so classes referenced inside `packages/ui` are seen by the compiler.
- **CDP seam contract (verified against the committed scripts — these must survive byte-for-byte in behavior):** home keeps `section[data-strip='featured']` containing the featured `article`s (packages-pages counts them inside that section); home keeps the services/branches strips' `data-strip` values and ALL text the page-wide includes-checks read (`Our studio blurb is coming soon.`, `View all services` with `href='/services'`, walk-in badge texts via `WalkInBadge`, every service name / branch address); teaser items keep the `a[href^="/book?service="]` deep-links; `/services` keeps its add-on cross-reference line verbatim. New sections may be ADDED (none of the checks are absence-based) — the closing emphasis strip uses the NEW seam value `data-strip='call-visit'`, asserted by no M2 script.
- **Not here — sibling fences (each sibling owns its deliverable; do not land any of it in this ticket):**
  - #98 (surfaces, blocked by this ticket): the home full-width two-CTA hero band ("Book now"/"View services" per variant), `/services` closing strip + the neutral add-on-line rewrite, `/packages` index restructure, `/packages/:slug` per-variant affordance, `/branches` `BranchCard` + `tel:` CTA, `/about` skeleton polish, `WalkInBadge` → badge wrapper, `ServiceCard` chip recomposition, not-found system treatment, per-surface section rhythm. This ticket's strip-item edits are SURFACE-LEVEL ONLY (white-card ground + CTA re-skin + cover gradient) — no structural investment.
  - #99 (booking flow): `/book` and `/booking/:id` internals. This ticket touches `book.tsx` ONLY to remove its `<SiteHeader />` render and drop the now-harmful `min-h-screen` from its wrapper; the wizard, progress bar, layout grid, and every `data-step`/`data-back` seam are untouched.
  - #100 (admin shell): the Tier-1 pull-list. `collapsible` here is the one primitive this ticket needs, pulled early by its owning consumer (allowed — the list is generated on demand during the build).
  - #101 (close-out): `/prototype-tokens` deletion, owner per-surface screenshot acceptance, formal #92-table contrast re-verification, CDP evidence archive.
  - The home blurb copy, the `/services` add-on line, and `WalkInBadge` are owner-ratified + CDP-asserted — untouched.
- **No new tests, no test edits.** The AC is "lib-seam tests + CDP regressions stay green" — they prove the chrome change moved no logic. If one fails, the chrome change broke something; fix the chrome, never the test.
- **No runtime edition/variant logic.** Main ships "Book now"; nothing in the code knows v1 exists. The "Call us" variants materialize only in the v1 pick (Task 7).
- **Shared roadmap checkbox:** `docs/plan.md`'s Milestone 3 section has one checkbox per ticket. This ticket ticks EXACTLY the `- [ ] Landing atmosphere + chrome:` checkbox (to `- [✅]`) — the other M3 checkboxes belong to #95 (ticked), #96 (ticked), #98–#101 and stay unticked until their tickets land.
- pnpm-only, `async`/`await` style, single-quoted imports, 2-space indent (Biome enforces; run `pnpm --filter @sevendays/landing fix` / `pnpm --filter @sevendays/ui fix` after TSX edits).

## File Structure

- Create: `packages/ui/src/components/collapsible.tsx` — Tier-1 primitive, `shadcn add`-generated (Task 1 pins the content).
- Create: `apps/landing/src/lib/nav.ts` — the four nav links, shared by header/mobile/footer.
- Replace: `apps/landing/src/components/site-header.tsx` — ink-led rebuild, mounts `MobileNav`.
- Create: `apps/landing/src/components/mobile-nav.tsx` — hamburger + disclosure panel.
- Create: `apps/landing/src/components/site-footer.tsx` — ink-led footer band.
- Modify: `apps/landing/src/routes/__root.tsx` — root chrome mount (`SiteHeader` / `<main>` / `SiteFooter`).
- Modify (SiteHeader import + render removed, nothing else): `routes/index.tsx`, `routes/about.tsx`, `routes/branches.tsx`, `routes/services.tsx`, `routes/book.tsx` (also drops `min-h-screen`), `routes/booking.$id.tsx` (two renders), `routes/packages/index.tsx`, `routes/packages/$slug.tsx` (two renders), `routes/prototype-tokens.tsx`. Then `routes/index.tsx` is restructured onto the wash ground in Task 4.
- Modify (surface-level): `components/package-card.tsx`, `components/service-teaser-item.tsx`, `components/branch-strip-item.tsx`, `components/cover-panel.tsx`.
- Modify: `docs/progress.md`, `docs/plan.md`.
- NOT touched: `packages/ui/src/tokens.css`, `packages/ui/package.json`, both apps' `styles.css`, `components/service-card.tsx`, `components/branch-card.tsx`, `components/walk-in-badge.tsx`, `components/inclusions-list.tsx`, any `src/lib/*.ts` other than the new `nav.ts`, any test file, `routeTree.gen.ts` (no route added/removed — no regen expected; if a build touches it anyway, commit it).

---

### Task 1: The `collapsible` Tier-1 primitive

**Files:**
- Create: `packages/ui/src/components/collapsible.tsx`

**Interfaces:**
- Consumes: `@base-ui/react/collapsible` (already a `packages/ui` dependency at `^1.8.0`); the `#95` `components.json` wiring (landing's `ui` alias → `@sevendays/ui/components`) that routes CLI output into the package.
- Produces: `@sevendays/ui/components/collapsible` exporting `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` — thin wrappers over Base UI's `Collapsible.Root` / `.Trigger` / `.Panel` carrying `data-slot` attributes. Downstream: Task 2's `MobileNav` (disclosure semantics — `aria-expanded`/`aria-controls` — come from the Base UI primitive). Registry name verbatim (`collapsible`), ADR-0017 tiering intact.

- [ ] **Step 1: Generate the primitive with the pinned CLI version**

From `apps/landing` (the `#95` wiring routes it into `packages/ui`):

```bash
cd apps/landing && pnpm dlx shadcn@4.21.0 add collapsible
```

Expected output ends with `✔ Created 1 file: packages/ui/src/components/collapsible.tsx`. The CLI also prints `ℹ Updated 1 file: packages/ui/src/tokens.css` — spike-proven (2026-09-15) to be a no-op rewrite of identical content; verify with:

```bash
git status --short
```

Expected: exactly `?? packages/ui/src/components/collapsible.tsx` and nothing else. If `tokens.css` shows as modified, restore it (`git checkout -- packages/ui/src/tokens.css`) — the token layer is maintained directly and this ticket must not touch it.

- [ ] **Step 2: Confirm the generated file matches this content (after `fix` normalizes quotes)**

```bash
cd ../.. && pnpm --filter @sevendays/ui fix
```

`packages/ui/src/components/collapsible.tsx` must read exactly (the CLI emits double quotes; Biome normalizes to the repo style — same transformation `button.tsx` got in #95):

```tsx
import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot='collapsible-trigger' {...props} />
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot='collapsible-content' {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
```

If the CLI produced different structure (a registry drift), STOP and reconcile with the registry output before continuing — do not hand-edit beyond quote/style normalization.

- [ ] **Step 3: Typecheck the package**

```bash
pnpm --filter @sevendays/ui typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/collapsible.tsx
git commit -m "feat(ui): #97 collapsible Tier-1 primitive — shadcn add over Base UI

registry-verbatim, routed into packages/ui by the #95 wiring; MobileNav
(#97) composes it as the disclosure panel"
```

### Task 2: The chrome components — nav lib, ink-led SiteHeader, MobileNav, SiteFooter

**Files:**
- Create: `apps/landing/src/lib/nav.ts`
- Replace: `apps/landing/src/components/site-header.tsx`
- Create: `apps/landing/src/components/mobile-nav.tsx`
- Create: `apps/landing/src/components/site-footer.tsx`

**Interfaces:**
- Consumes: Task 1's `@sevendays/ui/components/collapsible`; `buttonVariants` from `@sevendays/ui/components/button`; `cn` from `cn`; `Menu`/`X` from `lucide-react` (installed); the #96 token utilities; TanStack Router `Link` (typed routes + automatic `aria-current="page"`/`data-status="active"` on the active link — no active-detection code anywhere).
- Produces: the app's entire chrome vocabulary. `NAV_LINKS` is the single source of the four nav links (order owner-ruled: Packages, Services, Branches, About). `MobileNav` takes the links as a prop (literal `to` union keeps `Link` typed). NOT rendered anywhere yet — Task 3 mounts the header/footer; the MobileNav renders inside the header. Downstream: #98 composes surfaces under this chrome; the v1 pick re-skins these files around call-forward CTAs.

- [ ] **Step 1: Create `apps/landing/src/lib/nav.ts` with exactly this content**

```ts
// The four primary nav links (M3 #97), shared by SiteHeader, MobileNav, and
// SiteFooter — one source so the chrome never disagrees with itself.
// `as const` keeps the `to` literals typed for TanStack Router's Link.
export const NAV_LINKS = [
  { to: '/packages', label: 'Packages' },
  { to: '/services', label: 'Services' },
  { to: '/branches', label: 'Branches' },
  { to: '/about', label: 'About' },
] as const;
```

- [ ] **Step 2: Replace `apps/landing/src/components/site-header.tsx` with exactly this content**

Desktop row structure unchanged from M2 (brand / four links / CTA — now typed `Link`s instead of plain anchors); the band is ink-led per the #92 composition. Sans brand text (the mock's serif is gallery-specimen-only).

```tsx
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@sevendays/ui/components/button';
import { cn } from 'cn';
import { NAV_LINKS } from '../lib/nav';
import { MobileNav } from './mobile-nav';

// Site chrome, ink-led band (M3 #97 / the #92 composition): ink background,
// white text, petrol as the action color. Desktop row structure unchanged
// from M2; mobile gets the MobileNav hamburger panel. Every interactive
// control carries the full-opacity brand focus ring — the band-CTA
// normalization the spec rules (7.15:1 non-text on ink).
export function SiteHeader() {
  return (
    <header className='bg-brand-ink'>
      <div className='mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4'>
        <Link
          to='/'
          className='focus-visible:ring-brand-focus-ring rounded-sm font-bold text-xl text-white focus-visible:ring-3 focus-visible:outline-none'
        >
          Sevendays Photography
        </Link>
        <div className='flex items-center gap-4 md:gap-6'>
          <nav className='hidden items-center gap-6 md:flex' aria-label='Primary'>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className='focus-visible:ring-brand-focus-ring rounded-sm text-sm text-white/85 transition-colors hover:text-white focus-visible:ring-3 focus-visible:outline-none aria-[current=page]:text-white'
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            to='/book'
            className={cn(
              buttonVariants(),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring',
            )}
          >
            Book now
          </Link>
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create `apps/landing/src/components/mobile-nav.tsx` with exactly this content**

```tsx
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@sevendays/ui/components/collapsible';
import { cn } from 'cn';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { NAV_LINKS } from '../lib/nav';

// Mobile chrome (M3 #97): hamburger trigger + collapsible panel — proper
// disclosure navigation over the shared Base UI collapsible (the primitive
// owns aria-expanded/aria-controls; TanStack Link owns aria-current on the
// current page). Carries the four nav links plus the variant CTA: "Book
// now" on main; the v1 scrub swaps it for "Call us" → /branches at pick
// time (never a runtime branch). Hidden at md+ where the desktop nav lives.
export function MobileNav({ links }: { links: typeof NAV_LINKS }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className='md:hidden'>
      <CollapsibleTrigger
        aria-label='Menu'
        className='focus-visible:ring-brand-focus-ring inline-flex size-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:outline-none'
      >
        {open ? <X className='size-5' /> : <Menu className='size-5' />}
      </CollapsibleTrigger>
      <CollapsibleContent className='border-t border-white/15'>
        <nav className='mx-auto flex max-w-5xl flex-col gap-1 px-6 py-4' aria-label='Mobile'>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className='focus-visible:ring-brand-focus-ring rounded-md px-3 py-2.5 text-base text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:outline-none aria-[current=page]:bg-white/10 aria-[current=page]:text-white'
            >
              {link.label}
            </Link>
          ))}
          <Link
            to='/book'
            onClick={() => setOpen(false)}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-3 w-full focus-visible:ring-3 focus-visible:ring-brand-focus-ring',
            )}
          >
            Book now
          </Link>
        </nav>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

Notes for the executor (already reflected above — do not deviate): the trigger's `aria-label` stays STATIC ("Menu"); open/closed state is conveyed by the primitive's `aria-expanded` and the swapped icon, which is why the component is controlled (`open`/`onOpenChange`) — the icon swap needs the state anyway. `size-10` is the 40px touch target. The trigger is a plain `CollapsibleTrigger` (not a shared `Button`) because the Button primitive's ghost hover paints light-muted fills that read wrong on ink.

- [ ] **Step 4: Create `apps/landing/src/components/site-footer.tsx` with exactly this content**

No booking CTA on purpose (identical pre/post v1-scrub); no city tagline (the #92 mock's "Makati, Quezon City, and BGC" was invented placeholder copy — the seed's branches are Calamba/Iligan/Dipolog; owner copy can arrive at #101's acceptance).

```tsx
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@sevendays/ui/components/button';
import { cn } from 'cn';
import { NAV_LINKS } from '../lib/nav';

// Site chrome, ink-led band mirroring the header (M3 #97 / the #92
// composition): brand line, the four nav links, and a "Call or visit a
// branch" affordance to /branches. Deliberately NO booking CTA — the
// footer is identical pre/post v1-scrub. The affordance uses the outline
// variant (wash fill + cool border + ink label — 17.36:1) with the band
// focus-ring override.
export function SiteFooter() {
  return (
    <footer className='bg-brand-ink'>
      <div className='mx-auto max-w-5xl px-6 py-10'>
        <div className='flex flex-col justify-between gap-8 md:flex-row md:items-center'>
          <div>
            <p className='font-bold text-xl text-white'>Sevendays Photography</p>
          </div>
          <nav
            className='flex flex-col gap-2 md:flex-row md:items-center md:gap-6'
            aria-label='Footer'
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className='focus-visible:ring-brand-focus-ring rounded-sm text-sm text-white/85 transition-colors hover:text-white focus-visible:ring-3 focus-visible:outline-none aria-[current=page]:text-white'
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring',
            )}
          >
            Call or visit a branch
          </Link>
        </div>
        <div className='mt-8 border-t border-white/20 pt-4'>
          <p className='text-xs text-white/70'>© 2026 Sevendays Photography</p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Lint-format and typecheck**

```bash
pnpm --filter @sevendays/landing fix && pnpm --filter @sevendays/landing typecheck
```

Expected: clean (Biome may reorder the `mobile-nav.tsx` import block — accept its ordering). NOTE: `site-header.tsx` and `site-footer.tsx` are not imported by any route yet — that is Task 3; typecheck still passes because the files are self-contained modules.

- [ ] **Step 6: Commit**

```bash
git add apps/landing/src/lib/nav.ts apps/landing/src/components/site-header.tsx apps/landing/src/components/mobile-nav.tsx apps/landing/src/components/site-footer.tsx
git commit -m "feat(landing): #97 chrome components — ink-led SiteHeader, MobileNav, SiteFooter

ink band + white text + petrol action color (desktop row unchanged);
MobileNav = Base UI collapsible disclosure panel with variant CTA;
footer: brand line, four links, call-or-visit affordance, NO booking CTA;
all band CTAs on buttonVariants with the full-opacity brand focus ring"
```

### Task 3: Chrome mounts at the root route — per-route SiteHeader renders die

**Files:**
- Modify: `apps/landing/src/routes/__root.tsx`
- Modify: `routes/index.tsx`, `routes/about.tsx`, `routes/branches.tsx`, `routes/services.tsx`, `routes/book.tsx`, `routes/booking.$id.tsx`, `routes/packages/index.tsx`, `routes/packages/$slug.tsx`, `routes/prototype-tokens.tsx`

**Interfaces:**
- Consumes: Task 2's `SiteHeader`/`SiteFooter`.
- Produces: every route framed by the chrome, exactly once, full-bleed — `RootDocument` gains a `min-h-screen` flex column: header band, `<main className='flex-1'>` (new landmark), routed children, footer band. Nested routes' `notFoundComponent`s render inside the route tree, so they inherit the chrome automatically. Downstream: Task 4's home ground composes inside `<main>`; #98/#99 restructure page content under the same frame.

Blast-radius facts (verified 2026-09-15): `SiteHeader` is rendered in 9 files / 11 spots — seven route files render it once inside their own `mx-auto max-w-5xl p-6` container, `packages/$slug.tsx` and `booking.$id.tsx` render it in BOTH their `notFoundComponent` and their component, and `prototype-tokens.tsx` (the gallery) renders it once. No other component imports `SiteHeader`. `book.tsx`'s wrapper is `mx-auto min-h-screen max-w-4xl p-6` — the `min-h-screen` must die with the per-page header or the footer lands a full viewport below the wizard on `/book`.

- [ ] **Step 1: Wire the chrome into `__root.tsx`**

Two edits. First, add the imports (Biome order shown — `../components/*` sorts before `../integrations/*`):

```tsx
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
```

Second, wrap the routed children inside `RootDocument`'s `PostHogProvider` — the body becomes:

```tsx
      <body>
        <PostHogProvider>
          <div className='flex min-h-screen flex-col'>
            <SiteHeader />
            <main className='flex-1'>{children}</main>
            <SiteFooter />
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
        <Scripts />
      </body>
```

(Everything else in the file — `head`, meta, the stylesheet link, `RouterContext` — stays byte-identical.)

- [ ] **Step 2: Remove the eleven per-route SiteHeader renders**

In each file below: delete the `import { SiteHeader } from '…';` line and every `      <SiteHeader />` JSX line. Change NOTHING else (wrappers, headings, spacing stay — #98 owns per-surface restructure):

| File | Renders removed |
|---|---|
| `routes/index.tsx` | 1 |
| `routes/about.tsx` | 1 |
| `routes/branches.tsx` | 1 |
| `routes/services.tsx` | 1 |
| `routes/packages/index.tsx` | 1 |
| `routes/packages/$slug.tsx` | 2 (component + `notFoundComponent`) |
| `routes/book.tsx` | 1 (+ wrapper `mx-auto min-h-screen max-w-4xl p-6` → `mx-auto max-w-4xl p-6`) |
| `routes/booking.$id.tsx` | 2 (component + `notFoundComponent`) |
| `routes/prototype-tokens.tsx` | 1 (the gallery's own render — root chrome now frames it; do NOT touch anything else in the gallery) |

- [ ] **Step 3: Prove the sweep mechanically**

```bash
grep -rn "SiteHeader" apps/landing/src/routes/   # expect ZERO output
grep -c "aria-label='Primary'" apps/landing/src/components/site-header.tsx   # expect 1
```

- [ ] **Step 4: Lint-format and typecheck**

```bash
pnpm --filter @sevendays/landing fix && pnpm --filter @sevendays/landing typecheck
```

Expected: clean. Unused-import errors would mean a render was missed — fix the removal, not the import.

- [ ] **Step 5: Render smoke — chrome once per page, on every page**

```bash
pnpm --filter @sevendays/landing dev   # note the printed port (3000 unless taken)
```

Then for each path `/`, `/packages`, `/services`, `/branches`, `/about`, `/book`, `/prototype-tokens`:

```bash
curl -s "http://localhost:<port><path>" > /tmp/97-page.html
grep -o '<header' /tmp/97-page.html | wc -l    # expect 1
grep -o '<footer' /tmp/97-page.html | wc -l    # expect 1
grep -o "data-slot='collapsible-trigger'" /tmp/97-page.html | wc -l   # expect 1
grep -o 'bg-brand-ink' /tmp/97-page.html | wc -l   # expect ≥2 (header + footer bands)
```

All seven pages must show all four expectations. (`/packages/<seed-slug>` and `/booking/<id>` share the page shell — the smoke covers the frame, not data.) Then stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/landing/src/routes/
git commit -m "feat(landing): #97 chrome mounts at the root route

SiteHeader/SiteFooter frame every route once via __root's flex column
(plus <main> landmark); 11 per-route header renders removed; book.tsx
drops its min-h-screen so the footer doesn't land a viewport below"
```

### Task 4: Home onto the wash ground + white-card strip items + the emphasis strip

**Files:**
- Modify: `apps/landing/src/routes/index.tsx`
- Modify: `apps/landing/src/components/package-card.tsx`, `service-teaser-item.tsx`, `branch-strip-item.tsx`, `cover-panel.tsx`

**Interfaces:**
- Consumes: the chrome from Tasks 2–3 (the page now composes inside `<main>`); `buttonVariants`; wash/hairline/emphasis utilities from the #96 layer.
- Produces: the atmosphere's demonstration surface — full-bleed zones with hairline separators, white-card strip items floating on the wash, `CoverPanel` on the deep-petrol media gradient, and ONE gray-light emphasis strip closing the page (the pattern #98 reuses per surface). `data-strip` seams `featured`/`services`/`branches` unchanged; the closing strip adds the NEW seam `data-strip='call-visit'` (asserted by no M2 script — the checks are presence-based, additions are safe).

Component fence (surface-level ONLY — structure is #98's): the strip items get the white-card ground (`bg-card border-brand-gray-cool rounded-xl shadow-sm`), their existing "Book now" links get the system CTA skin, and `CoverPanel` gets the gradient. Headings, grids, inclusions, badge internals, and the "View all services" anchor stay exactly as they are.

- [ ] **Step 1: Restructure `index.tsx`'s Home component onto the ground**

The imports gain (Biome order alongside the existing ones):

```tsx
import { buttonVariants } from '@sevendays/ui/components/button';
import { cn } from 'cn';
```

The whole `return` of `Home` becomes exactly (queries/`selectFeaturedPackages` lines above it unchanged):

```tsx
  return (
    <div>
      <section className='mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 pt-12'>
        <h1 className='font-bold text-5xl'>Sevendays Photography</h1>
        {/* CTA re-skinned onto the system button; #98 rebuilds this zone as the ruled two-CTA hero band. */}
        <Link to='/book' className={buttonVariants({ size: 'lg' })}>
          Book now
        </Link>
      </section>
      {/* TODO(owner-copy): placeholder blurb — replaced when the client supplies copy. */}
      <p className='mx-auto mt-8 max-w-5xl px-6 text-muted-foreground'>
        Our studio blurb is coming soon.
      </p>
      <section
        className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12'
        data-strip='featured'
      >
        <h2 className='font-semibold text-2xl'>{heading}</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {strip.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>
      <section
        className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12'
        data-strip='services'
      >
        <h2 className='font-semibold text-2xl'>Our services</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {services.map((s) => (
            <ServiceTeaserItem key={s.id} service={s} />
          ))}
        </div>
        {/* Plain anchor (renders the href the CDP check reads); #98 sweeps to typed Links. */}
        <a href='/services' className='mt-4 inline-block underline'>
          View all services
        </a>
      </section>
      <section
        className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12'
        data-strip='branches'
      >
        <h2 className='font-semibold text-2xl'>Our branches</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {branches.map((b) => (
            <BranchStripItem key={b.id} branch={b} />
          ))}
        </div>
      </section>
      {/* Emphasis strip — gray-light's one remaining job per the #92 composition: the closing call-or-visit band. New seam value; no M2 script asserts it. Copy is the owner-approved mock's. */}
      <section
        className='mt-12 border-t border-line-soft bg-brand-gray-light'
        data-strip='call-visit'
      >
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='text-brand-ink font-semibold text-xl'>Not sure which session fits?</h2>
            <p className='text-brand-700 mt-1 text-sm'>
              Call or visit a branch — we will help you choose.
            </p>
          </div>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring',
            )}
          >
            Find a branch
          </Link>
        </div>
      </section>
    </div>
  );
```

- [ ] **Step 2: White-card ground on the three strip items + gradient cover**

Four small edits, nothing else in these files:

`package-card.tsx` — the `article` className `'flex flex-col gap-3 rounded-lg border p-6'` becomes `'flex flex-col gap-3 rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'`; the "Book now" `Link` className `'rounded-md bg-neutral-900 px-4 py-2 text-center text-white'` becomes `{buttonVariants()}` (add the `import { buttonVariants } from '@sevendays/ui/components/button';` line); the description paragraph `text-neutral-700` becomes `text-muted-text` (amended pre-flight-plus: the Task 5 zero-grep requires the starter gray gone from touched files, and muted-text is the mock's card-copy token — 5.51:1 on the white card). The card renders on the home strip, `/packages`, and `/packages/:slug` — all three get the white card from this one edit.

`service-teaser-item.tsx` — the `article` className `'flex flex-col gap-2 rounded-lg border p-4'` becomes `'flex flex-col gap-2 rounded-xl border border-brand-gray-cool bg-card p-4 shadow-sm'`; its "Book now" `Link` className `'rounded-md bg-neutral-900 px-4 py-2 text-center text-white'` becomes `{buttonVariants()}` (same import added). The `/book?service=` deep-link `search` prop is UNTOUCHED.

`branch-strip-item.tsx` — the `article` className `'flex flex-col gap-2 rounded-lg border p-4'` becomes `'flex flex-col gap-2 rounded-xl border border-brand-gray-cool bg-card p-4 shadow-sm'`; the address paragraph `text-neutral-700` becomes `text-muted-text` (same Task 5 zero-grep consistency). `WalkInBadge` internals are untouched.

`cover-panel.tsx` — replace the comment block and the three classNames so the component reads exactly:

```tsx
// Placeholder cover panel (spec: initials block until R2 cover photos, M5).
// The placeholder line is VISIBLE text so the CDP check can assert it.
// #97: the deep-petrol media gradient is the atmosphere's accent lane
// (deep petrol = media gradients only) — dark stops (600→800→deep) keep
// the white text AA on every stop.
export function CoverPanel({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div className='flex h-40 flex-col items-center justify-center gap-1 rounded-lg bg-[linear-gradient(135deg,var(--brand-600),var(--brand-800),var(--brand-deep))]'>
      <span className='font-bold text-3xl text-white'>{initials}</span>
      <span className='text-white/85 text-xs'>Cover photo coming soon</span>
    </div>
  );
}
```

- [ ] **Step 3: Seam guards (the CDP contract, checked before anything runs)**

```bash
grep -c "data-strip='featured'\|data-strip='services'\|data-strip='branches'" apps/landing/src/routes/index.tsx   # expect 3
grep -c "Our studio blurb is coming soon." apps/landing/src/routes/index.tsx   # expect 1
grep -c "View all services" apps/landing/src/routes/index.tsx   # expect 1
grep -c 'href="/services"' apps/landing/src/routes/index.tsx   # expect 1 (the anchor keeps its plain href)
grep -c 'search={{ service: service.id }}' apps/landing/src/components/service-teaser-item.tsx   # expect 1
grep -c 'Walk-ins welcome' apps/landing/src/components/walk-in-badge.tsx   # expect 1 (file untouched)
```

- [ ] **Step 4: Lint-format, typecheck, build**

```bash
pnpm --filter @sevendays/landing fix && pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing build
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/landing/src/routes/index.tsx apps/landing/src/components/package-card.tsx apps/landing/src/components/service-teaser-item.tsx apps/landing/src/components/branch-strip-item.tsx apps/landing/src/components/cover-panel.tsx
git commit -m "feat(landing): #97 home on the wash ground — hairline strips, white cards, emphasis band

strips keep data-strip seams + copy; strip items get the white-card
surface and system CTAs; CoverPanel on the deep-petrol media gradient;
gray-light demoted to the closing call-or-visit emphasis strip"
```

### Task 5: Verification sweep (the ticket's ACs, made runnable)

**Files:** none modified — verification only. A failure here means an earlier task drifted; fix at the source, never in this task.

- [ ] **Step 1: The starter-neutral palette is gone from everything #97 touched**

```bash
grep -rn 'neutral-' \
  apps/landing/src/routes/index.tsx \
  apps/landing/src/components/site-header.tsx apps/landing/src/components/site-footer.tsx \
  apps/landing/src/components/mobile-nav.tsx apps/landing/src/lib/nav.ts \
  apps/landing/src/components/package-card.tsx apps/landing/src/components/service-teaser-item.tsx \
  apps/landing/src/components/branch-strip-item.tsx apps/landing/src/components/cover-panel.tsx
```

Expected: zero output. (`book.tsx` still carries `bg-neutral-200`/`bg-neutral-900` in the wizard progress bar — that is #99's, deliberately untouched; `routes/services.tsx`'s `text-neutral-700` and the other pages' grays are #98's per-surface pass.)

- [ ] **Step 2: Contrast pairs re-measured (band pairs + the #92 table)**

Write `/tmp/97-verify.mjs`:

```js
const sT = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const lum = (h) => { const [r, g, b] = hexToRgb(h).map(sT); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const la = lum(a), lb = lum(b); return ((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2); };
const blend = (fg, alpha, bg) => { const f = hexToRgb(fg).map(v => v * 255), b = hexToRgb(bg).map(v => v * 255); return '#' + f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join(''); };
const ink = '#0e131a';
console.log('--- #97 band pairs (new) ---');
console.log('white-on-ink      :', contrast('#ffffff', ink), '(expect 18.64, bar 4.5)');
console.log('white/85-on-ink   :', contrast(blend('#ffffff', 0.85, ink), ink), '(expect 13.57, bar 4.5)');
console.log('white/70-on-ink   :', contrast(blend('#ffffff', 0.70, ink), ink), '(expect 9.39, bar 4.5)');
console.log('ring-400-on-ink   :', contrast('#69a9c2', ink), '(expect 7.15, bar 3.0 non-text)');
console.log('b700-on-gray-light:', contrast('#00566e', '#dedede'), '(expect 6.11, bar 4.5)');
console.log('ink-on-wash       :', contrast(ink, '#f1f8fb'), '(expect 17.36)');
console.log('--- #92 table (unchanged values, must still hold) ---');
console.log('ink-on-light      :', contrast(ink, '#dedede'), '(expect 13.85)');
console.log('white-on-primary  :', contrast('#ffffff', '#06708e'), '(expect 5.65)');
console.log('link-on-white     :', contrast('#00566e', '#ffffff'), '(expect 8.22)');
console.log('muted-on-wash     :', contrast('#686969', '#d9eef6'), '(expect 4.59)');
```

Run `node /tmp/97-verify.mjs` — every line must match.

- [ ] **Step 3: Landing lib-seam tests pass unchanged (AC 6, first half)**

```bash
pnpm --filter @sevendays/landing test && git diff --name-only main -- apps/landing/src/lib
```

Expected: suite green; the diff names exactly one file — `apps/landing/src/lib/nav.ts` (this branch's only lib change; zero edits to any existing lib module or test).

- [ ] **Step 4: M2 CDP read-only regressions against the live stack (AC 6, second half)**

Boot the stack (M2 harness precedent — Chrome/Chromium must exist locally):

```bash
# Terminal 1 — the API (8787; seeded catalog, .dev.vars in place)
pnpm --filter @sevendays/api dev
# Terminal 2 — landing dev (3000; API_URL set in apps/landing/.env.local)
pnpm --filter @sevendays/landing dev
# Terminal 3 — headless Chrome on the CDP port
google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify about:blank
```

Then, from the repo root:

```bash
node apps/landing/scripts/verify/content-pages.mjs    # 16 checks — strips, blurb, view-all, badges
node apps/landing/scripts/verify/packages-pages.mjs   # featured-strip article count inside section[data-strip='featured'] + not-found
node apps/landing/scripts/verify/booking-wizard.mjs   # read-only; /book keeps its chrome change only
```

Expected: every check `PASS`, each script exit 0. Any FAIL here means a seam moved — fix the chrome/ground, never the script. Then tear down Chrome (kill the headless process) and the dev servers.

- [ ] **Step 5: The repo gate (AC 7)**

```bash
pnpm check
```

Expected: green (baseline was green at the same main state on 2026-09-15).

- [ ] **Step 6: Keyboard + responsive pass (AC 5 — informal bar, concrete checklist)**

Open the landing dev server in a real browser and work the checklist (the owner's formal screenshot acceptance is #101's; capture screenshots here for the PR):

1. Desktop (≥768px): desktop nav visible, no hamburger; header/footer are full-bleed ink bands.
2. Mobile (~375px): hamburger visible; click → panel expands with the four links + "Book now"; the trigger's `aria-expanded` flips (DevTools inspect); clicking a link navigates AND the panel closes.
3. Current-page semantics: on `/packages`, the Packages link renders `aria-current="page"` (TanStack sets it) and shows the active styling in desktop nav, mobile panel, and footer.
4. Keyboard: `Tab` through the header (brand → nav links → Book now → hamburger on mobile) — every stop shows the full-opacity brand ring; continue into page content and the footer (links + "Call or visit a branch") — rings visible there too.
5. Home: strips separated by cool hairlines; strip items read as white cards on the wash; the closing gray-light strip holds the call-or-visit affordance; `CoverPanel` shows the petrol gradient with readable white initials.

### Task 6: Docs — progress + roadmap checkbox + graphify

**Files:**
- Modify: `docs/progress.md`
- Modify: `docs/plan.md`

- [ ] **Step 1: Update `docs/progress.md`'s "Last updated" header**

Edit the header line: replace its opening `_Last updated: 2026-09-15 (#96 M3 token swap` with `_Last updated: 2026-09-15 (#97 M3 landing chrome + atmosphere — ink-led SiteHeader + new SiteFooter mounted as root chrome on every route, MobileNav disclosure panel over the shared `collapsible` primitive, home on the petrol-wash ground with white-card strips + the gray-light call-or-visit emphasis band; band CTAs normalized on buttonVariants with full-opacity brand rings; CDP read-only regressions green unchanged.. Prior 2026-09-15: #96 M3 token swap` — i.e. the new segment is prepended and the previous content (from `#96 M3 token swap` onward) is preserved byte-identical after `Prior 2026-09-15: `.

- [ ] **Step 2: Add the landed-state bullet to `docs/progress.md`'s "What Exists" list**

Insert this bullet next to the other M3 bullets (after the `packages/ui` bullet that documents #95/#96):

```markdown
- **M3 landing chrome + atmosphere (2026-09-15, #97):** every landing route is framed by the owner-ruled #92 atmosphere — `SiteHeader` rebuilt ink-led (ink band, white text, petrol action color, desktop row unchanged) and the new `SiteFooter` (brand line, four nav links, "Call or visit a branch" → `/branches`; deliberately NO booking CTA so it is identical pre/post v1-scrub, and no city tagline — the mock's was placeholder copy) mounted ONCE as root chrome in `__root.tsx` (`min-h-screen` flex column + `<main>` landmark; the 11 per-route `<SiteHeader />` renders are gone). `MobileNav` — hamburger trigger + Base UI collapsible panel over the new shared `collapsible` Tier-1 primitive — carries the four links plus the variant CTA ("Book now" on main; the v1 scrub swaps it per the conflict policy, never runtime logic); current-page semantics ride TanStack `Link`'s automatic `aria-current="page"`. Home sits on the petrol-wash ground: hairline-separated strips (`data-strip` seams unchanged), white-card strip items (`PackageCard`/`ServiceTeaserItem`/`BranchStripItem` surface-level only), `CoverPanel` on the deep-petrol media gradient, and the gray-light "Not sure which session fits?" emphasis strip closing the page (new seam `data-strip='call-visit'`). All band CTAs are `buttonVariants`-styled with the full-opacity brand-400 focus ring; headings stay sans (the #92 mock's serif is gallery-specimen-only). New band pairs measured: white-on-ink 18.64, white/85-on-ink 13.57, white/70-on-ink 9.39, ring-on-ink 7.15 (non-text), brand-700-on-gray-light 6.11, ink-on-wash 17.36. The blurb placeholder, "View all services", teaser `/book?service=` deep-links, and `WalkInBadge` copy untouched — content-pages/packages-pages/booking-wizard CDP regressions green unchanged; no new tests (milestone bar: invariants + visual acceptance).
```

- [ ] **Step 3: Tick the roadmap checkbox in `docs/plan.md`**

In the Milestone 3 section, change exactly the line beginning `- [ ] Landing atmosphere + chrome:` to `- [✅] Landing atmosphere + chrome:` (keep the rest of the line byte-identical). Every OTHER Milestone 3 checkbox stays as it is (#95/#96 already ✅; #98–#101's stay unticked).

- [ ] **Step 4: Refresh the knowledge graph + commit**

```bash
graphify update .
git add docs/progress.md docs/plan.md graphify-out
git commit -m "docs(#97): landing chrome + atmosphere landed — progress updated, M3 roadmap checkbox ticked"
```

(`graphify-out/` churn is expected per AGENTS.md; commit what the update touches. If it produces no tracked changes, commit the two docs files alone.)

### Task 7: PR, merge, v1 pick, ticket close

- [ ] **Step 1: Open the PR**

```bash
gh pr create --title "feat(ui): #97 M3 landing chrome + atmosphere — ink bands, SiteFooter, MobileNav, wash ground" --body-file <(cat <<'EOF'
## What

Closes #97 (M3 ticket 03). Every landing route is framed by the owner-ruled #92 atmosphere: `SiteHeader` rebuilt ink-led, new `SiteFooter` on all surfaces (no booking CTA — identical pre/post v1-scrub), new `MobileNav` (Base UI collapsible disclosure panel, current-page semantics via Link's aria-current) — mounted once as root chrome in `__root.tsx` (11 per-route header renders removed). Home sits on the petrol-wash ground: hairline-separated strips (seams unchanged), white-card strip items, deep-petrol cover gradient, and the gray-light call-or-visit emphasis strip. Band CTAs normalized on `buttonVariants` with the full-opacity brand focus ring.

## Verification (all runnable from the plan)

- New band contrast pairs measured: white-on-ink 18.64 · white/85-on-ink 13.57 · white/70-on-ink 9.39 · ring-on-ink 7.15 (non-text 3.0 bar) · brand-700-on-gray-light 6.11 · ink-on-wash 17.36; the #92 AA table re-measured unchanged (13.85 / 5.65 / 8.22 / 4.59)
- CDP read-only regressions green unchanged: content-pages 16/16, packages-pages, booking-wizard (strip seams, blurb, view-all link, teaser deep-links, badge texts all intact)
- Landing lib-seam tests green, zero test edits; `pnpm check` green
- Render smoke: exactly one `<header>`/`<footer>` per page across all seven routes; keyboard + responsive pass checklist walked (rings, hamburger panel, aria-expanded, aria-current)

## Screenshots

(home desktop, home mobile with panel open, an inner page with footer, /book with the wizard untouched)
EOF
)
```

Attach the Task 5 Step 6 screenshots, then squash-merge per repo convention.

- [ ] **Step 2: Triage the merge for v1 (standing discipline — ADR-0015)**

After the squash merge, from the main checkout:

```bash
node scripts/v1-triage.mjs <main-sha>
```

Expected shape (the SCRIPT decides, not this plan): every path is a landing/`packages/ui` v1-path (`site-footer.tsx`, `mobile-nav.tsx`, `nav.ts`, `collapsible.tsx` are new v1-path files; `book.tsx`/`booking.$id.tsx` edits touch booking-cluster files that are absent on `v1` → likely SPLIT with those dropped as `DU`), so the verdict is PICK or SPLIT — never SKIP. Conflict expectations for the pick, per `docs/agents/v1-picks.md` § Conflict policy ("Landing booking-off surfaces"): `site-header.tsx`, `package-card.tsx`, `service-teaser-item.tsx`, and `routes/index.tsx` are transformed surfaces — keep `v1`'s call-forward content (the header/panel CTA is "Call us" → `/branches` there; catalog cards carry no booking CTAs) and re-apply this PR's ink-band styling, structure, and copy around it; the footer and `MobileNav`'s structure apply as-is with the CTA swapped. `routes/index.tsx` on `v1` has no "Book now" hero CTA — re-apply the ground (hairlines, white cards, emphasis strip) around `v1`'s ruling. If a hunk's substance IS the booking CTA, drop it and record the split. Execute the printed verdict per the runbook (pick/split procedure in `~/Projects/sevendays-v1-seed`, the four locks, then the ledger row in `docs/agents/v1-picks.md` via its own main PR — itself a skip).

- [ ] **Step 3: Close the ticket**

All ACs are mechanically verified in Task 5 (header ink-led + focus rings; footer on every surface; MobileNav disclosure + current-page + variant CTA; wash ground with white cards/hairlines/emphasis strip/accent-only deep petrol; keyboard + responsive pass; regressions green; `pnpm check` green). Close #97 referencing the PR. Visual fine-tuning the owner wants lands as #98 feedback or #101's screenshot acceptance — this ticket's scope ends at the chrome + ground.

---

## Final Review (for the executor's last pass)

- `git status` clean; every task's commit present on `feat/97-landing-chrome-atmosphere`; `pnpm check` green after the final commit.
- Re-read the ticket's seven ACs against the Task 5 outputs — each one has a runnable proof above; any AC without a green proof is unfinished work, not a note in the PR body.
- The plan file itself: tick every completed step `- [✅]` (never `[x]`).
- Fence check before opening the PR: no hero band, no `/services` closing strip, no per-variant catalog affordances, no badge wrapper, no wizard internals — those are #98/#99's and their checkboxes in `docs/plan.md` must still be unticked.

