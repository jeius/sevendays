# Landing Surfaces onto the System, Both Variants Styled (M3 ticket #98) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** Every shipped landing surface is restructured and restyled onto the decided system with both variants' pieces on system-styled ground — the home hero band (two CTAs per edition), the `/services` neutral copy + closing strip, the CTA-less `/packages` index with exactly one detail affordance per variant, the restyled `/branches` + `/about`, `WalkInBadge` collapsed onto the shared `badge`, the package not-found wearing the system — with zero logic, URL, or `data-*`-seam changes: the lib-seam tests and the M2 CDP read-only regressions stay green unchanged.

**Architecture:** #97 already landed the atmosphere ground this ticket builds on — wash canvas, hairline-separated strips with one section rhythm, the ink-led chrome, the home `data-strip='call-visit'` emphasis strip, and `buttonVariants` on the chrome CTAs. This ticket rebuilds the surfaces above that ground: the hero zone becomes the ruled #92 composition (white hero card: eyebrow / heading / placeholder blurb slot / petrol primary + outline secondary), `PackageCard` grows a `cta` mode prop so the index goes CTA-less while the detail page carries the single "Book this package" affordance, `BranchCard` gains the system-styled `tel:` affordance, `WalkInBadge` becomes a thin wrapper over `@sevendays/ui/components/badge`, and the `neutral-*` island leftovers sweep to semantic tokens. Variant CTAs follow the #97 convention: main's pieces render; the v1 pieces are styled, documented in-code as pick-time scrub swaps, and never runtime-branched.

**Tech Stack:** TanStack Start (file routes), `@sevendays/ui` primitives (`button`, `badge`), Tailwind v4 semantic tokens, TanStack Router typed Links, pnpm + Turborepo, Biome, the M2 CDP read-only verify scripts.

**Spec:** Implements ticket [#98 "M3 ticket 04 — landing surfaces onto the system, both variants styled"](https://github.com/jeius/sevendays/issues/98) under spec [#94 (Milestone 3 — UI/UX Design System)](https://github.com/jeius/sevendays/issues/94), § "Landing refactor, surface by surface" (#60 rulings) + § "Landing — the existing nine" (#58). Key recon facts (2026-09-15; re-verified 2026-09-16 after rebasing the branch onto main `d6d507e`):

- **Sibling fences (shared roadmap — do not cross):** #97 landed (PR #105, squash `bd7a960`) and owns the chrome + wash ground — this ticket consumes it, never re-touches `site-header.tsx`, `site-footer.tsx`, `mobile-nav.tsx`, `lib/nav.ts`, or `__root.tsx`; #99 owns the booking flow — `book.tsx`, `booking.$id.tsx`, and the booking wizard's pill (`routes/book.tsx:118`, the third hand-rolled pill) are FENCED; #101 owns close-out (`/prototype-tokens` gallery — read-only for its mocked surfaces, deletion not ours). `docs/plan.md` line 100 is this ticket's checkbox alone (line 101 is #99's; line 103 #101's).
- **#97's explicit #98 markers (in-code, must be honored):** `routes/index.tsx:33` — "#98 rebuilds this zone as the ruled two-CTA hero band"; `routes/index.tsx:63` — "#98 sweeps to typed Links" (the `<a href='/services'>` renders the href the CDP check reads — TanStack `Link` renders the same `href`, so the sweep is seam-safe).
- **The CDP seam contract (from the #97 plan, re-verified against the committed scripts):** home keeps `section[data-strip='featured'|'services'|'branches']` with the strip `article`s inside; these page-wide literals are asserted and must survive byte-for-byte: `Our studio blurb is coming soon.`, `View all services` + `href='/services'`, both `WalkInBadge` texts (`Walk-ins welcome` / `No walk-ins`), every service name + branch address, and every service name + branch address. `/services`' add-on cross-reference line is the ONE ruled rewrite: the LINE changes per the #60 ruling, and `content-pages.mjs:102-104` asserts the ENTIRE old sentence verbatim — a neutral rewrite cannot contain it (it presupposes a booking), so the ruled resolution is pinned in Task 2: the copy changes and the script's single expectation follows it in the same commit (the only script edit of the ticket). New sections may be added (no absence-based checks); new seam values (`data-strip='call-visit'` on `/services`) are asserted by nothing.
- **The v1 scrub convention (established by #97, `mobile-nav.tsx:16-18`):** main renders the booking-present pieces; the v1 pieces are styled and recorded in-code as pick-time swaps ("the v1 scrub swaps X for Y at pick time — never a runtime branch"). The triage content pass (`docs/agents/v1-picks.md`) drops booking hunks; the hero swap note rides the same comment pattern.
- **Verified component state:** `PackageCard` renders one `Book now` → `/book?package=<id>` unconditionally (home strip + `/packages` index + detail all reuse it) — the `cta` mode prop is new; `BranchCard` has NO `tel:` affordance today; `WalkInBadge` and `ServiceCard`'s branch chips hand-roll the identical `rounded-full border px-2 py-0.5 text-xs` pill; the third pill lives in the FENCED wizard (`book.tsx:118`, #99 sweeps it — the ticket's "three" resolves as 2 here + 1 fenced, recorded as a plan ruling); `services.tsx`, `about.tsx`, `service-card.tsx`, `branch-card.tsx` still carry `text-neutral-700` island leftovers; the generated `badge` variant union contains `outline` (`packages/ui/src/components/badge.tsx` — arrived with #100's Tier-1 pull (`026040e`), which the original `5745d91` base predated; the branch is rebased onto `d6d507e` and the union is verified live there).
- **The hero value-source is the owner-ruled #92 composition mock** (`apps/landing/src/components/prototype/composition-mock.tsx`, `data-92-comp-body`): white hero card on the wash — mono uppercase petrol eyebrow, large heading, muted blurb, petrol primary + white-card outline secondary, `focus-visible` rings. Two adjudications (agent rulings, surfaced in the PR): **(1) headings stay sans** — the mock's `font-serif` yields to the #94 spec ruling "headings stay sans everywhere" (#97's landed chrome already renders sans); **(2) the blurb slot keeps the CDP-asserted placeholder** `Our studio blurb is coming soon.` with its `TODO(owner-copy)` marker — the mock's blurb prose names Makati/Quezon City/BGC while the real branches are Calamba/Iligan/Dipolog, proving mock blurb copy is placeholder, not ratified copy. The mock's CTA labels ("Book a session"/"View packages") yield to the ticket's ruled labels ("Book now"/"View services").
- **Parked / out of scope:** booking-flow UX (`book.tsx` + wizard, #99); real imagery (`CoverPanel` token-fit only — #97 already took it most of the way; dies in M5); the `/prototype-tokens` gallery (#101); any new tests (the AC is existing suites green unchanged); the hero CTA `tel:` href for v1 (the pick-time scrub wires it; main only styles and documents).

## Global Constraints

- **Branch & baseline:** `feat/98-landing-surfaces` in the worktree `/home/jeius/Projects/sevendays/.worktrees/98-landing-surfaces` (rebased onto main `d6d507e` — the original `5745d91` base predated #100's Tier-1 pull that Task 4's `badge` import needs; setup verified green 2026-09-16: `pnpm install` + `pnpm build:packages` + `pnpm --filter @sevendays/api build` + `pnpm check` 35/35). This plan file is the branch's first commit.
- **Zero logic/URL/seam changes:** no loader edits, no query edits, no route path changes, no `data-strip`/`data-*` value changes on existing seams (adding new seams is fine). The lib-seam tests (`apps/landing/src/lib/*.test.ts`) and the verify scripts (`apps/landing/scripts/verify/*.mjs`) are READ-ONLY — if one fails, the surface change broke a seam; fix the surface, never the test or script. Single ruled exception: Task 2's add-on-line rewrite — `content-pages.mjs` asserts the full old sentence and a neutral rewrite cannot contain it (spec user story 15: copy that never presupposes online booking), so that ONE expectation is updated to the new pinned copy in the same commit (Task 2 Step 2b). The updated check stays a real assertion pinning the new ruled copy; nothing else in any script or test changes.
- **Component names stand:** no consolidation, no renames across the nine (#58). `WalkInBadge` stays `WalkInBadge` (thin wrapper), `PackageCard`'s new `cta` prop is the only signature change, and every composed component stays landing-local PascalCase (ADR-0017 two-tier rule — no new shared primitives; `badge` + `button` come from `packages/ui`).
- **Tokens, not island colors:** the sweep replaces every `text-neutral-*`/hand-rolled pill in the touched files with semantic tokens (`text-muted-text`, `text-muted-foreground`, `text-brand-ink`) or the shared `badge`/`buttonVariants`. No new CSS, no new tokens, no `styles.css` edits (the token ground is #96's, live since the swap).
- **Variant discipline:** main renders booking-present only; v1 pieces are styled + documented as pick-time scrubs via the #97 comment convention — zero runtime edition branching anywhere.
- **Both-states-explicit rides along:** `WalkInBadge`'s visible `Walk-ins welcome` / `No walk-ins` texts are owner-ratified and CDP-asserted — the wrapper changes the styling vehicle, never the texts or the prop contract.
- **Gates (repo AGENTS.md):** `pnpm install` after manifest changes (none planned); `pnpm check` green before the PR; `graphify update .` after code changes; tick checkboxes with `- [✅]`; update `docs/progress.md` (Task 7 pins the entry).
- pnpm-only; `async`/`await`; Biome canonical form via `pnpm --filter @sevendays/landing fix` — never hand-formatting.

---

### Task 1: Home — the two-CTA hero band + typed-Links sweep

**Files:**
- Modify: `apps/landing/src/routes/index.tsx` (hero zone rebuild; typed Links sweep)

**Interfaces:**
- Consumes: `buttonVariants` from `@sevendays/ui/components/button` (already imported), `Link` from `@tanstack/react-router`, the `cn` package; the #97 ground (wash body, strip rhythm) — unchanged.
- Produces: the ruled hero band on `/` — full-width wash zone with the white hero card (eyebrow / heading / blurb slot / two CTAs); `View all services` becomes a typed `Link`; every existing seam value and asserted literal survives.

**Not here:** strips below the hero stay as #97 landed them (rhythm + seams); no `/services` copy changes (Task 2); no CTA label changes on `PackageCard` (Task 3).

- [ ] **Step 1: Seam guard — pin every asserted literal before touching the file**

```bash
grep -n "coming soon\|View all services\|data-strip\|href=" apps/landing/scripts/verify/content-pages.mjs apps/landing/scripts/verify/packages-pages.mjs | head -30
```

Record the output in the commit message. Anything these scripts assert on `/` (blurb text, `View all services`, strip sections + article counts, hrefs) is frozen through the rewrite. If the scripts assert the hero `h1` text `Sevendays Photography` (they are not expected to — record either way), the eyebrow keeps that exact string as its accessible text.

- [ ] **Step 2: Rebuild the hero zone**

Replace the first `<section>` and the blurb `<p>` (index.tsx lines 31–41) with exactly:

```tsx
      {/* Hero band — the ruled #92 composition (data-92-comp-body), sans
          headings per the #94 ruling. Blurb slot stays placeholder-marked;
          the literal is CDP-asserted (content-pages). Secondary CTA is
          system-styled; the v1 scrub swaps BOTH CTAs for "Call Us" +
          "Services" at pick time — never a runtime branch (the #97
          convention, mobile-nav.tsx). */}
      <section className='border-line-soft border-b'>
        <div className='mx-auto max-w-5xl px-6 py-12'>
          <div className='bg-card border-brand-gray-cool rounded-xl border p-8 shadow-sm'>
            <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
              Sevendays Photography
            </p>
            <h1 className='text-brand-ink mt-3 max-w-2xl font-bold text-4xl'>
              Three branches. One standard of light.
            </h1>
            {/* TODO(owner-copy): placeholder blurb — replaced when the client supplies copy. */}
            <p className='text-muted-text mt-3 max-w-prose'>
              Our studio blurb is coming soon.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <Link
                to='/book'
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
                )}
              >
                Book now
              </Link>
              <Link
                to='/services'
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
                )}
              >
                View services
              </Link>
            </div>
          </div>
        </div>
      </section>
```

(The h1 moves from the old first section into the hero card — one h1 per page survives; the eyebrow is a `<p>`. `size: 'lg'` keeps the hero CTAs the zone's dominant actions; `lg` is in the generated size union — verified live: `default`/`xs`/`sm`/`lg`/`icon`/`icon-xs`/`icon-sm`/`icon-lg`, and home's landed hero CTA already uses `size: 'lg'`.)

- [ ] **Step 3: Sweep the typed Links**

Replace the plain anchor (index.tsx:64) with exactly:

```tsx
        <Link to='/services' className='text-brand-700 mt-4 inline-block underline'>
          View all services
        </Link>
```

(TanStack `Link` renders `href='/services'` — the CDP check's selector keeps matching. The `text-brand-700` is the #92 link pair, 8.22:1 on white.)

- [ ] **Step 4: Format + typecheck + build**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing build
```

Expected: all green (typed `to='/services'` must pass the router's typed-Links check — `/services` is a registered route).

- [ ] **Step 5: Lib-seam tests stay green**

```bash
pnpm --filter @sevendays/landing test
```

Expected: green unchanged (the route's loader/queries are untouched).

- [ ] **Step 6: Commit**

```bash
git add apps/landing/src/routes/index.tsx
git commit -m "feat(landing): the ruled two-CTA hero band + typed-Links sweep on home (#98)

Hero per the #92 composition (white card, eyebrow, sans heading, placeholder
blurb slot, petrol primary + outline secondary); v1 CTA swap documented as a
pick-time scrub (#97 convention). <record: the Step 1 seam-guard output>"
```

---

### Task 2: /services — neutral add-on copy + the closing call-or-visit strip

**Files:**
- Modify: `apps/landing/src/routes/services.tsx`

**Interfaces:**
- Consumes: `buttonVariants`, `Link`, `cn`; the #97 emphasis-strip pattern (home's `data-strip='call-visit'` section) as the structural template.
- Produces: `/services` wearing the system — token-swept copy zone, the neutral add-on line, and the quiet closing strip funneling to `/branches`.

**Not here:** no `ServiceCard` changes (Task 4 owns its restyle + badge chips); no new tests.

- [ ] **Step 1: Seam guard — confirm the asserted add-on sentence**

```bash
grep -n "attach\|add-on\|Makeup" apps/landing/scripts/verify/content-pages.mjs
```

Pinned fact (verified against the committed script, `content-pages.mjs:100-105`): the check asserts the ENTIRE old sentence verbatim — `servicesText.includes('Looking for add-ons? Makeup, hairstyle, and more can attach to your booking.')`. A neutral rewrite cannot contain that sentence (it presupposes a booking — spec user story 15: "copy that never presupposes online booking"), so keeping the assertion untouched is impossible under the #60 ruling. Resolution (ruled in this plan, surfaced in the PR): the copy changes AND the script's single expectation follows it in the same commit (Step 2b) — the updated check stays a real assertion pinning the new ruled copy. If the guard grep shows the assertion moved or changed shape, re-pin Step 2b's edit to the actual lines before proceeding.

- [ ] **Step 2: Rewrite the page**

Replace `services.tsx`'s return block with exactly:

```tsx
  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='text-brand-ink font-bold text-4xl'>Services</h1>
        <p className='text-muted-foreground mt-2 max-w-prose'>
          Looking for add-ons? Makeup, hairstyle, and more are available with any session.
        </p>
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} branchNames={bookableBranchNames(s, branches)} />
          ))}
        </div>
      </section>
      {/* Closing call-or-visit strip (#60 ruling) — the #97 emphasis-strip
          pattern; new seam value, asserted by no script. Call-or-visit
          flavored: no booking presupposition on either edition. */}
      <section
        className='mt-12 border-t border-line-soft bg-brand-gray-light'
        data-strip='call-visit'
      >
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='text-brand-ink font-semibold text-xl'>
              Need a service at one of our branches?
            </h2>
            <p className='text-brand-700 mt-1 text-sm'>
              Call or visit a branch — we will confirm availability.
            </p>
          </div>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
            )}
          >
            Find a branch
          </Link>
        </div>
      </section>
    </div>
  );
```

Plus the import line after the existing imports:

```tsx
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
```

(The strip structure mirrors home's landed `data-strip='call-visit'` — one pattern, two surfaces. `Link`/`cn`/`buttonVariants` may partially duplicate existing imports; merge alphabetically.)

- [ ] **Step 2b: The script expectation follows the ruled copy**

In `apps/landing/scripts/verify/content-pages.mjs` (the add-on check, ~lines 100–105), replace exactly:

```js
  check(
    '/services: one-line add-on cross-reference visible',
    servicesText.includes(
      'Looking for add-ons? Makeup, hairstyle, and more can attach to your booking.'
    )
  );
```

with:

```js
  check(
    '/services: one-line add-on cross-reference visible',
    servicesText.includes(
      'Looking for add-ons? Makeup, hairstyle, and more are available with any session.'
    )
  );
```

This is the ticket's ONLY script edit (the Global Constraints' single ruled exception) — it lands in the same commit as the copy change and keeps the check a real assertion on the new ruled copy.

- [ ] **Step 3: Format, typecheck, tests, commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test
git add apps/landing/src/routes/services.tsx apps/landing/scripts/verify/content-pages.mjs
git commit -m "feat(landing): /services onto the system — neutral add-on line + closing call-or-visit strip (#98)

Add-on copy rewritten neutrally per the #60 ruling; content-pages.mjs's one
pinned expectation follows the ruled copy in the same commit (the ticket's
only script edit). <record: the Step 1 guard output>"
```

---

### Task 3: /packages — CTA-less index, the single detail affordance, the not-found

**Files:**
- Modify: `apps/landing/src/components/package-card.tsx` (the `cta` mode prop)
- Modify: `apps/landing/src/routes/packages/index.tsx` (CTA-less)
- Modify: `apps/landing/src/routes/packages/$slug.tsx` (detail affordance + not-found restyle)

**Interfaces:**
- Consumes: `buttonVariants`, `Link`; the existing `/book` prefill search param (`search={{ package: pkg.id }}` — zero flow change).
- Produces: `PackageCard({ pkg, cta }: { pkg: ServicePackageWithInclusions; cta?: 'card' | 'detail' })` — `undefined`/omitted renders NO CTA (index); `'card'` renders `Book now` (home strip — unchanged behavior); `'detail'` renders `Book this package` (the detail page's exactly-one primary affordance). All existing call sites keep compiling: home's `<PackageCard key={p.id} pkg={p} />` defaults to NO CTA — home's strip call site is UPDATED in this task to `cta='card'` so home keeps its funnel CTAs (the featured strip is a funnel entry, never ruled away; the index is the showcase).

**Not here:** the detail page gains no second affordance; the v1 "Call us" detail variant is a pick-time scrub swapping the single CTA (comment convention), not a second rendered affordance; no `InclusionsList`/`CoverPanel` changes (transients token-fit only — #97 already took them; nothing left this ticket).

- [ ] **Step 1: The `cta` prop in `PackageCard`**

Rewrite `package-card.tsx` with exactly:

```tsx
import type { ServicePackageWithInclusions } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { peso } from '../lib/format';
import { CoverPanel } from './cover-panel';
import { InclusionsList } from './inclusions-list';

// Full-detail package card (spec: /packages shows full details, no separate
// detail navigation needed from listings) — reused on the home strip and the
// detail page. The cta prop scopes the booking affordance per surface
// (#98): omitted = CTA-less (the /packages index is a showcase, not a
// funnel); 'card' = strip teaser ("Book now"); 'detail' = the detail page's
// exactly-one primary affordance ("Book this package"). The v1 scrub swaps
// the detail CTA for "Call us" → /branches at pick time — never a runtime
// branch (the #97 convention).
export function PackageCard({
  pkg,
  cta,
}: {
  pkg: ServicePackageWithInclusions;
  cta?: 'card' | 'detail';
}) {
  return (
    <article className='flex flex-col gap-3 rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <CoverPanel name={pkg.name} />
      <h3 className='text-brand-ink font-semibold text-xl'>{pkg.name}</h3>
      <p className='font-medium text-lg'>{peso(pkg.priceCents)}</p>
      <p className='text-muted-text'>{pkg.description}</p>
      <InclusionsList pkg={pkg} />
      {cta && (
        <Link
          to='/book'
          search={{ package: pkg.id }}
          className={cn(
            buttonVariants(),
            'focus-visible:ring-brand-focus-ring focus-visible:ring-3 self-start'
          )}
        >
          {cta === 'detail' ? 'Book this package' : 'Book now'}
        </Link>
      )}
    </article>
  );
}
```

- [ ] **Step 2: The index goes CTA-less; the strip keeps its funnel CTA**

In `apps/landing/src/routes/packages/index.tsx`, the grid call stays `<PackageCard key={p.id} pkg={p} />` — with the prop optional, the index is now CTA-less by default. Add no prop here. In `apps/landing/src/routes/index.tsx`, the home strip call becomes `<PackageCard key={p.id} pkg={p} cta='card' />`.

Then sweep the index page shell to the system (replace its return block):

```tsx
  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='text-brand-ink font-bold text-4xl'>Packages</h1>
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {packages.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>
    </div>
  );
```

- [ ] **Step 3: The detail affordance + the not-found**

In `apps/landing/src/routes/packages/$slug.tsx`:

`PackageDetail` becomes:

```tsx
function PackageDetail() {
  const pkg = Route.useLoaderData();

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <div className='mx-auto max-w-2xl'>
          <PackageCard pkg={pkg} cta='detail' />
        </div>
      </section>
    </div>
  );
}
```

And `notFoundComponent` becomes:

```tsx
  notFoundComponent: () => (
    <div className='mx-auto max-w-5xl px-6'>
      <div className='bg-card border-brand-gray-cool mt-16 flex flex-col items-center gap-4 rounded-xl border p-10 text-center shadow-sm'>
        <h1 className='text-brand-ink font-semibold text-2xl'>Package not found.</h1>
        <p className='text-muted-text text-sm'>
          The package you are looking for does not exist or is no longer offered.
        </p>
        <Link
          to='/packages'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
          )}
        >
          Browse all packages
        </Link>
      </div>
    </div>
  ),
```

with imports gaining `buttonVariants`, `Link`, `cn` (the plain anchor's dependency-free posture ends here — the page now uses the shared primitives per the AC; the literal `Package not found.` is CDP-asserted by `packages-pages.mjs` and survives verbatim).

- [ ] **Step 4: Format, typecheck, tests, build**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing build
```

Expected: all green. If `packages-pages.mjs`'s not-found check asserts the old plain-anchor `href='/packages'` via `<a`, note that TanStack `Link` renders the same `href` — the selector keeps matching (Task 6's live run proves it).

- [ ] **Step 5: Commit**

```bash
git add apps/landing/src/components/package-card.tsx apps/landing/src/routes/packages/index.tsx apps/landing/src/routes/packages/\$slug.tsx apps/landing/src/routes/index.tsx
git commit -m "feat(landing): /packages CTA-less index + the single detail affordance + system not-found (#98)

PackageCard cta prop (omitted=none / 'card' strip / 'detail'); v1 detail
scrub documented at pick time; not-found wears the system card."
```

---

### Task 4: /branches + the badge collapse — WalkInBadge onto the shared badge, ServiceCard swept

**Files:**
- Modify: `apps/landing/src/components/walk-in-badge.tsx` (thin wrapper over `badge`)
- Modify: `apps/landing/src/components/branch-card.tsx` (token sweep + the styled `tel:` affordance)
- Modify: `apps/landing/src/components/service-card.tsx` (chips → `badge`; token sweep)

**Interfaces:**
- Consumes: `@sevendays/ui/components/badge` (variant union includes `outline` — verified live), `buttonVariants`, `Link`, `cn`.
- Produces: `WalkInBadge({ acceptsWalkIns })` unchanged prop contract, now rendering `<Badge variant='outline'>`; `ServiceCard` chips as `<Badge variant='outline'>`; `BranchCard` with the system-styled `Call {branch}` `tel:` affordance (secondary, both editions — see the ruling below) + the booking CTA (main; v1 scrub drops it).

**Not here:** the wizard's pill (`book.tsx:118`) is #99's — fenced; `branch-strip-item.tsx` already uses `WalkInBadge` and needs no edit; no new shared primitives (the wrapper is landing-local per ADR-0017).

- [ ] **Step 1: `WalkInBadge` — the thin wrapper**

Rewrite `walk-in-badge.tsx` with exactly:

```tsx
import { Badge } from '@sevendays/ui/components/badge';

// Walk-in badge with BOTH states explicit (owner-ratified): customers on a
// booking-only branch must see the negative, not silence. Visible text so the
// CDP scenario can assert both states against the live seed. Thin wrapper
// over the shared badge primitive (#98) — the styling vehicle changes, the
// contract (prop + texts) does not.
export function WalkInBadge({ acceptsWalkIns }: { acceptsWalkIns: boolean }) {
  const label = acceptsWalkIns ? 'Walk-ins welcome' : 'No walk-ins';
  return <Badge variant='outline'>{label}</Badge>;
}
```

- [ ] **Step 2: `BranchCard` — token sweep + the `tel:` affordance**

Rewrite `branch-card.tsx` with exactly:

```tsx
import type { Branch } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { WalkInBadge } from './walk-in-badge';

// Full branch card (/branches): address, phone, walk-in badge, and the
// branch deep link — spec's /branches row verbatim. Branch phones are
// TODO(seed) placeholders and render verbatim until the client supplies
// real numbers. The Call {branch} tel: affordance (#98) is the v1 primary
// styled on system ground — rendered on BOTH editions as the quiet
// secondary (the number is useful on main too); the v1 scrub drops the
// booking CTA at pick time, leaving tel: primary — never a runtime branch
// (the #97 convention).
export function BranchCard({ branch }: { branch: Branch }) {
  return (
    <article className='flex flex-col gap-2 rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <h3 className='text-brand-ink font-semibold text-xl'>{branch.name}</h3>
      <p className='text-muted-text'>{branch.address}</p>
      <p className='text-muted-text'>{branch.phone}</p>
      <WalkInBadge acceptsWalkIns={branch.acceptsWalkIns} />
      <div className='mt-1 flex flex-wrap gap-2'>
        <a
          href={`tel:${branch.phone.replace(/\s+/g, '')}`}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
          )}
        >
          Call {branch.name}
        </a>
        <Link
          to='/book'
          search={{ branch: branch.id }}
          className={cn(
            buttonVariants(),
            'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
          )}
        >
          Book at this branch
        </Link>
      </div>
    </article>
  );
}
```

(Ruling recorded: the `tel:` affordance renders on both editions as the quiet secondary — a phone number is useful on main too — and becomes v1's primary when the scrub drops the booking CTA. The `card`-on-`outline` pairing mirrors the #92 emphasis-strip buttons. If `content-pages.mjs` asserts `Book at this branch`, it survives verbatim; the new `Call {name}` anchor is additive.)

- [ ] **Step 3: `ServiceCard` — chips onto `badge`, token sweep**

Rewrite `service-card.tsx` with exactly:

```tsx
import type { StudioServiceWithBranches } from '@sevendays/types';
import { Badge } from '@sevendays/ui/components/badge';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { peso } from '../lib/format';

// Studio Service card (/services): description + price + per-branch
// bookability chips + the add-on cross-reference rendered by the route
// (spec's /services row). Bookability names arrive pre-resolved — the
// component takes no branches prop (single call-site convention). Chips
// recomposed onto the shared badge (#98, the ruled per-surface call).
export function ServiceCard({
  service,
  branchNames,
}: {
  service: StudioServiceWithBranches;
  branchNames: string[];
}) {
  return (
    <article className='flex flex-col gap-2 rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <h3 className='text-brand-ink font-semibold text-xl'>{service.name}</h3>
      <p className='font-medium text-lg'>{peso(service.priceCents)}</p>
      <p className='text-muted-text'>{service.description}</p>
      <div className='flex flex-wrap gap-1'>
        {branchNames.map((name) => (
          <Badge key={name} variant='outline'>
            {name}
          </Badge>
        ))}
      </div>
      <Link
        to='/book'
        search={{ service: service.id }}
        className={cn(
          buttonVariants(),
          'focus-visible:ring-brand-focus-ring focus-visible:ring-3 self-start'
        )}
      >
        Book now
      </Link>
    </article>
  );
}
```

(The `teaser items keep the `a[href^="/book?service="]` deep-links` seam is a `ServiceTeaserItem` concern — untouched. `ServiceCard`'s own Link is already typed and keeps its `search`.)

- [ ] **Step 4: Format, typecheck, tests, commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test
git add apps/landing/src/components/walk-in-badge.tsx apps/landing/src/components/branch-card.tsx apps/landing/src/components/service-card.tsx
git commit -m "feat(landing): WalkInBadge onto the shared badge + BranchCard tel: affordance + ServiceCard sweep (#98)

Pill duplicates collapsed (2 of 3 here; the wizard's pill is #99's fence).
tel: rendered on both editions as quiet secondary — v1's primary post-scrub
(agent ruling, PR-surfaced). Both-states-explicit texts + prop untouched."
```

---

### Task 5: /about — skeleton polish, slots intact

**Files:**
- Modify: `apps/landing/src/routes/about.tsx`

**Interfaces:**
- Consumes: the #97 ground + strip rhythm (hairline-topped sections, `max-w-5xl`).
- Produces: `/about` skeleton-polished (hierarchy, spacing, rhythm on tokens); the portfolio grid (`data-portfolio-grid`) and testimonial slots survive as M5 drop-in slots; every `TODO(owner-copy)` marker survives.

**Not here:** no copy invention (all copy stays placeholder-marked); no portfolio/testimonial content.

- [ ] **Step 1: Rewrite the page shell**

Replace `about.tsx`'s `AboutPage` body with exactly:

```tsx
function AboutPage() {
  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='text-brand-ink font-bold text-4xl'>About</h1>
        {/* TODO(owner-copy): static studio story — replaced when the client supplies copy. */}
        <p className='text-muted-foreground mt-4 max-w-prose'>Our studio story is coming soon.</p>
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12'>
        <h2 className='text-brand-ink font-semibold text-2xl'>Testimonials</h2>
        {/* TODO(owner-copy): testimonial placeholders — client copy pending. M5 drop-in slot. */}
        <p className='text-muted-foreground mt-2'>What clients say is coming soon.</p>
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12 pb-12'>
        <h2 className='text-brand-ink font-semibold text-2xl'>Portfolio</h2>
        {/* Empty M5 drop-in slot: portfolio items render here when content lands. */}
        <div className='mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3' data-portfolio-grid />
      </section>
    </div>
  );
}
```

(One consistent rhythm with home's strips: `mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12`. Asserted literals — if `content-pages.mjs` reads any `/about` text, it survives; nothing here is expected to be asserted. `data-portfolio-grid` is the M5 contract — byte-for-byte.)

- [ ] **Step 2: Format, typecheck, tests, commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test
git add apps/landing/src/routes/about.tsx
git commit -m "feat(landing): /about skeleton polish on the strip rhythm (#98)

Slots + TODO(owner-copy) markers intact; data-portfolio-grid byte-for-byte."
```

---

### Task 6: Verification — CDP regressions + gates (controller-run, evidence-only)

**Files:**
- No source files created. Fixes, if a gate fails, land in the file the failure names — then the gate re-runs.
- Expected outcome: NO-COMMIT (all green).

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: the evidence pack — CDP read-only regressions over the live stack, the seam-guard greps, the full repo gate.

**Not here:** no test/script edits ever; booking-e2e/confirmation-emails are M2 live-suite scripts (not this ticket's read-only set — #97 ran booking-wizard only; this ticket runs the same three).

- [ ] **Step 1: Env + browser readiness (controller)**

Copy the gitignored env files from the main checkout (never commit them): `apps/landing/.env.local` (`API_URL`) and `apps/api/.dev.vars`. Resolve the headless Chrome binary per the #97 precedent — `google-chrome` if present, else the Playwright headless shell (`find ~/.cache/ms-playwright -name chrome-headless-shell -type f | head -1`, nested per-version dir — glob the cache root, never a remembered path). Verify port 9222 is not already held (`ss -tlnp`).

- [ ] **Step 2: Boot the three-terminal stack**

```bash
pnpm --filter @sevendays/api dev      # terminal 1 — port 8787, seeded catalog
pnpm --filter @sevendays/landing dev  # terminal 2 — port 3000; confirm from its log
<chrome-binary> --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify-98 about:blank  # terminal 3
```

Sandbox/WSL fallbacks per the SDD channel quirks: servers run as background tasks; grep each log for its actual port before probing.

- [ ] **Step 3: The read-only regressions**

```bash
node apps/landing/scripts/verify/content-pages.mjs    # strips, blurb, view-all, badges
node apps/landing/scripts/verify/packages-pages.mjs   # featured-strip articles + not-found
node apps/landing/scripts/verify/booking-wizard.mjs   # /book chrome-only read-only pass
```

Expected: every check `PASS`, exit 0 — the hero rebuild, the CTA-less index, the not-found card, and the tel: affordance moved no seam. Any FAIL: the surface broke a seam — fix the surface, never the script; re-run.

- [ ] **Step 4: The static gates**

```bash
grep -rn 'text-neutral-\|bg-neutral-' apps/landing/src/routes apps/landing/src/components --include='*.tsx' | grep -v prototype || echo "NO ISLAND COLORS IN SURFACES — OK"
grep -rn 'rounded-full border px-2 py-0.5' apps/landing/src/components --include='*.tsx' || echo "NO HAND-ROLLED PILLS IN COMPONENTS — OK"
grep -c 'data-portfolio-grid' apps/landing/src/routes/about.tsx
```

Expected: the island grep matches ONLY `book.tsx` lines (15 line matches — fenced to #99; the `NO ISLAND COLORS … OK` fallback must NOT fire, and any non-`book.tsx` match is a leftover this ticket missed); the pill grep prints `NO HAND-ROLLED PILLS IN COMPONENTS — OK` (its scope is `components/`, which excludes the fenced `routes/book.tsx` pill); `data-portfolio-grid` count 1.

- [ ] **Step 5: The repo gate**

```bash
pnpm check
```

Expected: green across all workspaces (35/35 turbo tasks at the #97 baseline).

- [ ] **Step 6: Evidence file + teardown**

Write `.superpowers/sdd/2026-09-15-98-landing-surfaces-both-variants/task-6-evidence.md` (per-gate results, check counts, any fallback that fired). Kill Chrome + both dev servers. If (and only if) a gate forced a fix: commit it under `fix(landing): …` with the gate named; otherwise no commit.

---

### Task 7: Docs, PR, handover

**Files:**
- Modify: `docs/progress.md` (header line + What-Exists entry), `docs/plan.md` (tick line 100), this plan file (✅ ticks)
- Refresh: `graphify-out/`

**Interfaces:**
- Consumes: Tasks 1–6 incl. the evidence pack.
- Produces: pushed branch + open PR closing #98; the owner merges (screenshots acceptance rides the PR per the spec's testing decision 5).

**Not here:** plan.md lines 99/101/103 (siblings); the v1-picks ledger (triager's at merge — landing surfaces are the known split class: content pass drops booking hunks; the #105 row's order-gating precedent applies).

- [ ] **Step 1: The progress.md entries**

Prepend to the `Last updated` header line: `2026-09-15 (#98 M3 ticket 04 — landing surfaces onto the system, both variants styled: the ruled two-CTA hero band, /services neutral add-on line + closing call-or-visit strip, CTA-less /packages index + the single "Book this package" detail affordance, BranchCard tel: affordance + token sweep, WalkInBadge + ServiceCard chips onto the shared badge, system not-found, /about skeleton polish — PR <NN>.. Prior 2026-09-15: ` (keeping the existing #100 entry as the new Prior). Add the What-Exists bullet after the ticket-06 bullet (pinned copy authored at execution — it records what landed, the cta-prop ruling, the tel: ruling, and the fenced wizard pill).

- [ ] **Step 2: Tick the roadmap checkbox**

`docs/plan.md` line 100 `- [ ] Landing surfaces onto the system, both variants styled …` → `- [✅]` with a dated annotation naming the ticket's landed facts (hero band, neutral copy + strip, CTA-less index, detail affordance, tel:, badge collapse, not-found, /about).

- [ ] **Step 3: Tick this plan + graphify + full check**

Tick every completed step (`- [✅]`), then:

```bash
graphify update .
pnpm check
```

- [ ] **Step 4: Commit, push, open the PR**

```bash
git add docs/ graphify-out
git commit -m "docs: #98 close-out — progress record, roadmap tick, plan ticks, graph refresh"
git push -u origin feat/98-landing-surfaces
gh pr create --base main --head feat/98-landing-surfaces \
  --title "feat(landing): #98 M3 ticket 04 — landing surfaces onto the system, both variants styled" \
  --body-file <staged body file>
```

Body sections: Summary · AC→evidence mapping (the ticket's 9 ACs) · execution rulings (hero sans-headings + placeholder blurb, tel:-on-both-editions, cta prop, third pill fenced to #99, the Task 2 add-on-line ruling — neutral copy + its single pinned script-expectation follow, the not-found supporting sentence as agent-authored copy) · verification (CDP counts + pnpm check) · deferred minors · scope fence · Closes #98 · standing v1-picks note (landing split class).

- [ ] **Step 5: The completion report — then STOP**

Evidence pack + AC mapping + state + flags to the owner. Then STOP.

---

## Self-Review

- **Spec coverage (ticket ACs):** AC 1 (hero band, two CTAs per variant, strip order + `data-strip` unchanged, one rhythm) → Task 1 (hero per the #92 composition; strips untouched below; Task 2/5 reuse the rhythm). AC 2 (closing strip + neutral add-on copy) → Task 2 (the neutral copy is pinned; the script's one full-sentence expectation follows it in the same commit — the ruled resolution, the ticket's only script edit). AC 3 (index CTA-less; detail one affordance per variant, wired as ruled) → Task 3 (`cta` prop; prefill param unchanged; v1 scrub documented). AC 4 (branches restyled + tel: on system ground; /about polished with slots) → Tasks 4–5. AC 5 (WalkInBadge thin wrapper; three pill implementations collapse) → Task 4 (two here; the wizard pill fenced to #99 — recorded as the plan's explicit resolution of the "three," surfaced in the PR). AC 6 (names stand; transients token-fit) → Global Constraints + #97 already took `CoverPanel`; this ticket adds nothing structural there. AC 7 (not-found wears the system) → Task 3 Step 3. AC 8 (lib-seam tests + CDP regressions green unchanged) → every task's test step + Task 6's live run; scripts/tests are read-only by constraint except Task 2's single pinned expectation follow (same URLs, same data seams — every re-derived assertion untouched). AC 9 (`pnpm check` green) → Tasks 4–6 + Task 7.
- **Sibling fences:** #97's files (`site-header/footer/mobile-nav/nav.ts/__root`) untouched by any task; #99's `book.tsx`/`booking.$id.tsx` untouched (the wizard pill explicitly deferred); #101's gallery untouched. Landing-local only + docs.
- **Placeholder scan:** every authored file is pinned verbatim; `<record: …>` directives name their source steps; the Task 2 copy and Task 7's progress bullet are the only execution-authored prose and both carry pinned structure + guard steps.
- **Type/signature consistency:** `PackageCard({ pkg, cta?: 'card' | 'detail' })` — all three call sites updated consistently (home `cta='card'`, index omitted, detail `cta='detail'`); `WalkInBadge({ acceptsWalkIns })` contract unchanged; `Badge variant='outline'` verified in the live union; `cn` + `buttonVariants` imports consistent across files; seam literals (`Our studio blurb is coming soon.`, `View all services`, `Walk-ins welcome`/`No walk-ins`, `Package not found.`, `data-strip` values, `data-portfolio-grid`) byte-identical to the pre-ticket state everywhere they must survive.
- **Claim strength vs. proof:** the CDP seam contract is re-verified against the committed scripts in this pass (the add-on sentence is a FULL-sentence assertion — pinned in Task 2 with its ruled resolution, not left for execution to discover; Task 1 Step 1's guard re-greps before the hero rewrite); the badge + button unions are live-verified on the rebased base; the CDP boot commands are the #97-proven shape with the browser-resolution fallback pinned; hero composition traces to the in-repo owner-ruled mock (`data-92-comp-body`) with the two type/copy adjudications reasoned in the recon and surfaced as PR rulings.

