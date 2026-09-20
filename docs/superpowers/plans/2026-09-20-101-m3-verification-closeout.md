# M3 Verification + Close-Out (M3 ticket #101) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`.

**Goal:** The M3 exit gate, executed live on both variants: production home flips to the owner-endorsed variant D composition (this plan's Ruling A), inner-page h1/h2 adopt the ruled serif register (Ruling B), every prototype surface (`/prototype-tokens`, `/prototype-remediation`, `components/prototype/`, the dev switcher) is deleted, the M2 CDP read-only regressions + lib-seam suites + `pnpm check` run green on the final tree, the AA contrast pairs (the four #92 pairs + the #111 white-on-ink chrome family + muted-on-wash) are re-measured and recorded, the v1 pick backlog is drained (#110's pending SPLIT executed; #109/#112/#113 skip rows recorded), the owner accepts per-surface screenshots on main + the picked v1 deployment, and `docs/progress.md` / `docs/plan.md` close the milestone.

**Architecture:** This is a verification-and-close-out ticket with exactly two composition deltas, both restatements of already-recorded owner rulings: the variant D home is promoted from `components/prototype/` into production-named landing-local components (verbatim markup, renamed exports, trimmed to what D consumes), and the ruled content-pages.mjs edit (this ticket's ONE sanctioned script exception) re-pins the three home expectations the ruled composition moves (branches strip, walk-in badges, blurb literal). Everything else is evidence: the existing CDP scripts, lib-seam suites, static starter-theme greps, the #111 contrast tooling, and the v1-picks runbook procedures executed verbatim in the seed checkout. The owner screenshot gate is a hard STOP; the post-merge v1 pick of this ticket's own merge (carrying the flipped home + photos to the artifact) is the close-out loop's tail.

**Tech Stack:** TanStack Start (file routes), `@sevendays/ui` primitives (`button`, `popover`), Tailwind v4 semantic tokens, the raw-CDP verify scripts + `prototype-shot.mjs` / `prototype-contrast.mjs`, docker compose postgres:17, pnpm + Turborepo, Biome, the v1 seed checkout (`~/Projects/sevendays-v1-seed`), `gh` CLI.

**Spec:** Implements ticket [#101 "M3 ticket 07 — M3 verification + close-out"](https://github.com/jeius/sevendays/issues/101) under spec [#94 (Milestone 3 — UI/UX Design System)](https://github.com/jeius/sevendays/issues/94), bar = § Testing Decisions + § Quality bar, with the [#111 resolution comment](https://github.com/jeius/sevendays/issues/111) (variant D endorsement, Treatment B chrome, serif register, new AA pairs) and the [#94 spec amendment comment](https://github.com/jeius/sevendays/issues/94) (2026-09-16) as the composition authority. Key recon facts (2026-09-20, main `d775a2c`):

- **Sibling fences (all siblings closed — nothing else moves):** #95–#100 + #111 are landed; this ticket owns the milestone's last checkbox (`docs/plan.md` line 103) and nothing else in the M3 block. `packages/ui` gains nothing (ADR-0017 two-tier rule); the booking flow surfaces (`book.tsx`, `booking.$id.tsx`, `components/booking/`) are NOT touched (#99's frozen ground — only screenshotted); the admin app is NOT touched (its acceptance landed with #100's PR; the screenshot gate is landing-only per spec testing decision 5).
- **The two agent rulings this plan carries (both owner-veto-able at the Task 7 gate — the clarify call went unanswered, so they are argued from the record and flagged in the PR):**
  - **Ruling A — flip production home to variant D.** #111's AC defines this ticket's acceptance as "per-surface owner screenshots on both editions judged against these rulings", and the endorsed build target is variant D; the as-landed home is the #92-era composition that #111 superseded for home. The deferred flip ("needs its own script-edit ruling" — progress.md 2026-09-16) gets its ruling vehicle here: the ruled content-pages.mjs edit in Task 2. Deleting `prototype/` without the flip would destroy the endorsed composition unshipped.
  - **Ruling B — apply the serif register to inner-page h1/h2.** The #111 resolution rules "serif (Roboto Slab) stays at page h1/h2 and section headings"; the shipped inner pages are sans (a build gap, not a counter-ruling — the original "headings stay sans" was explicitly reversed as never owner-ruled). The change is class-only, zero seam/text impact. The booking flow surfaces stay sans (frozen-flow posture, flagged boundary).
- **The v1 state (live-read 2026-09-20):** v1 HEAD = `c2c1056` (#100's pick) in `~/Projects/sevendays-v1-seed` (clean). Backlog in main order: **#109** `d6d507e` docs → classifier SKIP (2 main-only paths); **#110** `8c89d63` (#98 + #111 riding) → SPLIT, 54 v1-paths + 18 main-only, **pick pending** (row exists, execution mapped there); **#112** `7d93829` docs → SKIP; **#113** `d775a2c` (#99) → SKIP (all 28 paths main-only — booking cluster + scripts/ + docs/graph). This ticket's own merge gets triaged + picked AFTER the owner merges (Task 9) — the flipped home reaches v1 only through that pick (nothing is ever authored on v1 directly).
- **Verified current state (live reads, 2026-09-20):** island grep over landing routes+components prints its OK fallback; no `--chart-` token definitions (the single `--chart-` grep hit is the tokens.css:8 comment documenting their absence); no font CDN anywhere; no `neutral-` in admin/ui; `font-serif` exists only in the chrome wordmarks + prototype components. Landing lib-seam suite = 7 files / 62 tests. `pnpm check` baseline = 35/35 turbo tasks. `components/prototype/` holds 11 files; `BranchStripItem`'s only consumer is `index.tsx` (orphaned by the flip — the file stays, a #58-ruled component). Content-pages.mjs home section = 6 checks at lines 41–69; exactly 3 trip on variant D (branches strip, walk-in badges, blurb literal); the teaser deep-link + View-all-services checks pass as-is (`PrototypeServiceImageCard` links `/book?service=<id>`; D keeps the strip-end link).
- **Tooling facts (read from the true sources):** `apps/landing/scripts/prototype-shot.mjs` — `node prototype-shot.mjs <url> <outfile.png> [width=1440] [height=2400] [fullPage=true] [waitMs=3500]`, `deviceScaleFactor 2`, `mobile: width < 500`, works against ANY url (local stack or the live v1 deployment). `apps/landing/scripts/prototype-contrast.mjs` — static-hex WCAG calculator over the canonical token values; prints the white-on-ink family (white/ink 18.64 · brand-200/ink 13.94 · white85/ink 13.57 · white70/ink 9.39 · white60/ink 7.19), CTA pairs (white/primary 5.65 · white/deep 10.90 · white/brand-700 8.22), and body pairs (brand-700/white 8.22 · muted/white · ink/white · ink/gray-light 13.85) — but NOT muted-on-wash (Task 5 pins the one-liner for `#686969` on `#d9eef6`, expect ≈4.59 AA per tokens.css:40). `apps/landing/package.json` has `generate-routes` (`tsr generate`). MobileNav's hamburger is `[aria-label='Menu']` (mobile-nav.tsx:26). `packages/db` seed scripts read `--env-file=.env` (`packages/db/.env`). `compose.yaml` at repo root = postgres:17, `sevendays_test`, localhost:5432, postgres/postgres.
- **The stack procedure (from #99's recorded evidence, `.superpowers/sdd/2026-09-20-99-booking-flow-componentized/task-5-evidence.md`):** no env files exist in this environment — the setup ruling is the fully-local compose stack: compose postgres + migrations + seed; `apps/api/.dev.vars` = compose `DATABASE_URL` + `RESEND_API_KEY=re_local_placeholder` (sends fail loudly — the M2-documented posture) + `LANDING_ORIGIN=http://localhost:3000`; `apps/landing/.env.local` = `API_URL=http://127.0.0.1:8787`; headless Chrome = the Playwright cache glob, CDP :9222. The #99 e2e's two booking rows persist in that disposable local db and may be reused; do NOT point anything at the live Supabase.
- **Parked / out of scope:** booking-flow UX + the mutating e2e as an AC (read-only trio is this ticket's bar; the local-stack e2e run in Task 7 is shot-minting + bonus evidence only); real availability; confirmation-email visuals; real photography (the Unsplash stand-ins + owner photos are ruled stand-ins until M5's R2); admin dashboard content; dark mode; a shared-composed tier; M6 hardening.

## Global Constraints

- **Branch & baseline:** `feat/101-m3-closeout` in the worktree `/home/jeius/Projects/sevendays/.worktrees/101-m3-closeout`, based on main `d775a2c`. Setup: `git worktree add .worktrees/101-m3-closeout -b feat/101-m3-closeout` from the main checkout, then in the worktree `pnpm install` + `pnpm build:packages` + `pnpm --filter @sevendays/api build` + `pnpm check` (expect green at the recorded baseline, 35/35 turbo tasks). This plan file is the branch's first commit (copy it from the main checkout). The v1 checkout `~/Projects/sevendays-v1-seed` is used exactly as the runbook directs; the main workspace NEVER checks `v1` out.
- **The ONE ruled script edit:** `apps/landing/scripts/verify/content-pages.mjs` gets exactly the three check replacements pinned in Task 2 (branches strip → footer+emphasis carriage, walk-in badges → gallery wall, blurb literal → the ratified hero blurb) — nothing else in `scripts/verify/` changes, ever. All other scripts stay byte-untouched: if any other check fails, the surface broke a seam — fix the surface, never the script. The check count stays 16.
- **Tests are byte-untouched:** the seven lib-seam files (`apps/landing/src/lib/*.test.ts`, 62 tests) get zero edits — "suites pass unchanged" is literally true. No new test files (nothing lib-level moves).
- **Copy pins — owner-ratified verbatim (#111 resolution, "Copy ratified as rendered on the branch"):** `HERO_BLURB` = `Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.`; `KICKERS` = gallery `The work — stand-in portfolio` / packages `Featured packages` / services `What we do` / testimonials `Kind words`; the six gallery stand-ins + captions; the three placeholder testimonials; `HERO_PHOTO = '/photos/cover_photo.jpg'` + its alt; the hero microcopy `Photo from the studio — more of our work arrives at M5.`; the emphasis strip literals (`Not sure which session fits?` / `Call or visit a branch — we will help you choose.` / `Find a branch`); the home h1 `Three branches. One standard of light.` All land byte-identical in Task 1's files; the ruled content-pages edit quotes the blurb literal exactly.
- **Component discipline (#58 / ADR-0017):** the promoted `home-image-led.tsx` / `home-cards.tsx` / `home-copy.ts` are landing-local Tier-2 files in `apps/landing/src/components/`; markup is the ratified variant D verbatim (renames + import-path fixes + trim to what D consumes only — zero class changes); no new shared primitives, no renames of existing components, no `packages/ui` edits. `BranchStripItem` stays in place (orphaned by the flip, a #58-ruled keeper — noted in the PR).
- **Frozen flow:** `book.tsx`, `booking.$id.tsx`, `components/booking/*`, `lib/booking.ts`, `lib/queries.ts`, `lib/api.functions.ts`, the API, and `packages/*` are untouched. The home loader's branches-prefetch drop (Task 2) is the single data-layer delta of the ruled composition — surfaced in the PR body, not silent.
- **v1 discipline (runbook `docs/agents/v1-picks.md`, verbatim procedures):** picks execute only in `~/Projects/sevendays-v1-seed` (`git switch v1 && git pull --ff-only origin v1` first); SPLIT mechanics per its "Executing a SPLIT" section (the load-bearing blank line in the `-F -` heredoc); locks = local `pnpm check` + `pnpm build` + export audit exit 0 + push + the CI run showing `check` + `Deploy v1 (private)` success and `Deploy teaser (main)` skipped + live curls (landing 200, `/book` 404, call-forward CTAs served, zero `Book now`). Time-box: one hour of conflict work per pick → stop, owner decides. Never weaken the audit or checks to land a pick.
- **UI-skills line (AGENTS.md, ruled #111):** this ticket names `prototype` + `ui-ux-pro-max`. No new composition vocabulary is authored — the composition is the ratified variant D verbatim and the serif register is a recorded ruling; the owner-react channel is this ticket's Task 7 screenshot gate itself (the #94 amendment satisfied by pointing at the #111 record).
- **Gates (repo AGENTS.md):** `pnpm check` green before the PR; `graphify update .` after code changes; tick checkboxes with `- [✅]`; update `docs/progress.md` (Task 8 pins the entry); pnpm-only; `async`/`await`; Biome canonical form via `pnpm --filter @sevendays/landing fix` — never hand-formatting. Evidence lands in `.superpowers/sdd/2026-09-20-101-m3-verification-closeout/` and screenshots in `.scratch/101-closeout-shots/` (both gitignored — evidence never bloats the PR).

---

### Task 1: Promote the endorsed composition — the three production files

**Files:**
- Create: `apps/landing/src/components/home-image-led.tsx`
- Create: `apps/landing/src/components/home-cards.tsx`
- Create: `apps/landing/src/components/home-copy.ts`

**Interfaces:**
- Consumes: `selectFeaturedPackages` from `../lib/featured`, `buttonVariants` + the `popover` primitive from `@sevendays/ui`, `peso` from `../lib/format`, types from `@sevendays/types`.
- Produces: `HomeImageLed({ packages, services })` (the variant D page body); `PackageCoverCard({ pkg })` + `ServiceImageCard({ service })` (the two ruled card treatments); `packageCover(id)` / `serviceBackground(name)` (stand-in media maps, M5-swap-marked); the ratified copy constants (`HERO_PHOTO`, `HERO_PHOTO_ALT`, `HERO_BLURB`, `KICKERS`, `GALLERY_STANDINS`, `TESTIMONIALS_PLACEHOLDER`). Task 2 wires `HomeImageLed` into `index.tsx`.

**Not here:** `index.tsx` is untouched (Task 2); `components/prototype/` is untouched (Task 4 deletes it — home-variant-a/b/c, the compare/chrome/gallery surfaces, AND the superseded originals of these three files still import `./card-system` + `./copy` until then, so they must survive this task); no script edits; no styling deltas.

- [ ] **Step 1: `home-copy.ts` — the ratified copy, production names**

Create `apps/landing/src/components/home-copy.ts` with exactly:

```ts
// Home copy (#111 remediation — ratified as rendered 2026-09-16, the
// resolution's draft-and-ratify satisfied by the owner's per-piece
// reactions). Gallery + testimonials are stand-in/placeholder content BY
// RULING until M5's real photography and client words arrive. The wizard's
// CDP-asserted literals are untouched by this file.

export const HERO_PHOTO = '/photos/cover_photo.jpg';
export const HERO_PHOTO_ALT =
  'Photographer holding a Canon DSLR by the studio window — the studio’s own photo';

export const HERO_BLURB =
  'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.';

export const KICKERS = {
  gallery: 'The work — stand-in portfolio',
  packages: 'Featured packages',
  services: 'What we do',
  testimonials: 'Kind words',
} as const;

// Stand-in gallery (M5 swaps in the owner's R2 photos). Captions ratified.
export const GALLERY_STANDINS = [
  { src: '/photos/gallery-01-portrait.jpg', caption: 'Portrait 01 · stand-in' },
  { src: '/photos/gallery-02-portrait.jpg', caption: 'Portrait 02 · stand-in' },
  { src: '/photos/gallery-03-wedding.jpg', caption: 'Wedding · stand-in' },
  { src: '/photos/gallery-04-family.jpg', caption: 'Family · stand-in' },
  { src: '/photos/gallery-05-still.jpg', caption: 'Still life · stand-in' },
  { src: '/photos/gallery-06-bts.jpg', caption: 'Behind the scenes · stand-in' },
] as const;

// CLEARLY-FAKE placeholder testimonials (owner ruling: render placeholders
// now, real content at M5). Names are placeholders by construction.
export const TESTIMONIALS_PLACEHOLDER = [
  {
    quote: 'The photos felt like us — easy, warm, and true to the day.',
    name: 'Placeholder name',
    context: 'Family session',
  },
  {
    quote: 'Booked in the morning, shot by lunch, prints within the week.',
    name: 'Placeholder name',
    context: 'Graduation portraits',
  },
  {
    quote: 'Our products finally look the way they deserve on the shelf.',
    name: 'Placeholder name',
    context: 'Commercial shoot',
  },
] as const;
```

(Every string is byte-identical to `components/prototype/copy.ts` — only names and comments change; `HERO_CAPTION_DRAFT` was variant-B-only and dies here.)

- [ ] **Step 2: `home-cards.tsx` — the two ruled card treatments, trimmed to what D consumes**

Create `apps/landing/src/components/home-cards.tsx` with exactly:

```tsx
import type {
  ResolvedPackageInclusion,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@sevendays/ui/components/popover';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { peso } from '../lib/format';

// The ruled card system (#111 Track 2, variant D build target): uniformity
// mechanics — 1-line titles, clamp-2 descriptions, fixed media heights,
// first-3 chips plus a "+K" chip opening a CLICK popover (mobile-safe).
// Card titles are SANS per the D reaction; serif stays at page h1/h2.

const CHIP = 'px-2.5 py-0.5 text-[11px]';

function ChipCluster({ chips }: { chips: string[] }) {
  const HEAD = 3;
  if (chips.length === 0) return null;
  const head = chips.slice(0, HEAD);
  const rest = chips.slice(HEAD);
  return (
    <div className='flex flex-wrap gap-1'>
      {head.map((chip) => (
        <span
          key={chip}
          className={cn(
            'inline-flex max-w-44 items-center truncate rounded-full bg-secondary font-medium text-secondary-foreground',
            CHIP
          )}
        >
          {chip}
        </span>
      ))}
      {rest.length > 0 && (
        <Popover>
          <PopoverTrigger
            className={cn(
              'inline-flex cursor-pointer items-center rounded-full border border-border bg-card font-medium text-foreground hover:bg-wash-base',
              CHIP
            )}
          >
            +{rest.length}
          </PopoverTrigger>
          <PopoverContent className='w-64 rounded-xl p-3'>
            <PopoverTitle className='font-mono text-[11px] text-muted-foreground uppercase tracking-wider'>
              The full list
            </PopoverTitle>
            <ul className='flex flex-col gap-1 text-foreground text-sm'>
              {chips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// Stand-in cover mapping (M5: R2 cover photos replace this wholesale).
// Seeded names are generic ("Basic Package", "Package A"…), so covers cycle
// deterministically per package instead of matching on keywords.
const COVERS = [
  '/photos/cover-portrait.jpg',
  '/photos/cover-event.jpg',
  '/photos/cover-commercial.jpg',
] as const;

export function packageCover(id: string): string {
  const hash = [...id].reduce((n, c) => n + c.charCodeAt(0), 0);
  return COVERS[hash % COVERS.length] ?? COVERS[0];
}

// The full-image service-card backgrounds (stand-ins; M5 swaps for the
// studio's own service shots).
export function serviceBackground(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('recover')) return '/photos/service-recovery.jpg';
  if (n.includes('fram')) return '/photos/service-framing.jpg';
  if (n.includes('id') || n.includes('portrait')) return '/photos/service-id.jpg';
  if (n.includes('print') || n.includes('tarp')) return '/photos/service-printing.jpg';
  return '/photos/cover-portrait.jpg';
}

// The ruled service treatment: the photo IS the card — full-image
// background, ink gradient for legibility, system mechanics kept (1-line
// title, fixed height, one affordance, deep link preserved).
export function ServiceImageCard({ service }: { service: StudioServiceWithBranches }) {
  return (
    <Link
      to='/book'
      search={{ service: service.id }}
      aria-label={`Book ${service.name} (₱${(service.priceCents / 100).toFixed(0)})`}
      className='group border-line-soft relative block h-64 overflow-hidden rounded-xl border shadow-sm focus-visible:ring-brand-focus-ring focus-visible:ring-3 focus-visible:outline-none'
    >
      <img
        src={serviceBackground(service.name)}
        alt=''
        aria-hidden='true'
        className='absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105'
        loading='lazy'
      />
      {/* Owner ruling (#111, variant D reaction): tints so the labels stay
          legible even when the photo's color matches the text. Two layers:
          a uniform ink wash dims the whole image, then a bottom-heavy ink
          scrim anchors the text zone — stacked worst case (pure-white
          photo) still leaves the label area ≈ ink, i.e. the measured
          white-on-ink 18.64:1 pair, never below AA in the text band. */}
      <div className='bg-brand-ink/35 absolute inset-0' aria-hidden='true' />
      <div
        className='from-brand-ink via-brand-ink/60 to-transparent absolute inset-0 bg-gradient-to-t'
        aria-hidden='true'
      />
      <div className='absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5'>
        <div className='min-w-0'>
          <h3 className='truncate text-xl font-semibold text-white'>{service.name}</h3>
          <p className='text-brand-200 mt-1 font-mono text-sm'>{peso(service.priceCents)}</p>
        </div>
        <span className='shrink-0 rounded-md border border-white/40 bg-brand-ink/60 px-3 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-brand-ink/80'>
          Book
        </span>
      </div>
    </Link>
  );
}

function BookNow({ id, kind }: { id: string; kind: 'package' | 'service' }) {
  return (
    <Link
      to='/book'
      search={kind === 'package' ? { package: id } : { service: id }}
      className={cn(
        buttonVariants({ size: 'sm' }),
        'mt-auto self-stretch text-center focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
      )}
    >
      Book now
    </Link>
  );
}

// The ruled package treatment (owner: "cover photos drive the cards"): the
// cover is the card's hero — edge-to-edge media with title + price
// overlaid on the same two-layer ink tint — while the text-heavy body
// (description, chips, +K popover, CTA) stays on white. Deliberately NOT
// full-image-with-all-text. Sans titles per D.
export function PackageCoverCard({ pkg }: { pkg: ServicePackageWithInclusions }) {
  return (
    // Hover (owner ask, D): one idea, layered — the card lifts while the
    // cover slowly zooms ("the photograph opens up"). Transforms only (no
    // layout shift), and both still under prefers-reduced-motion.
    <article className='group bg-card border-brand-gray-cool flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0'>
      <div className='border-line-soft relative h-56 shrink-0 overflow-hidden border-b'>
        <img
          src={packageCover(pkg.id)}
          alt={`Cover for ${pkg.name} — stand-in until R2 assets arrive`}
          className='absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100'
          loading='lazy'
        />
        <div className='bg-brand-ink/35 absolute inset-0' aria-hidden='true' />
        <div
          className='from-brand-ink via-brand-ink/55 to-transparent absolute inset-0 bg-gradient-to-t'
          aria-hidden='true'
        />
        <div className='absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5'>
          <div className='min-w-0'>
            <h3 className='truncate text-xl font-semibold text-white'>{pkg.name}</h3>
            <p className='text-brand-200 mt-1 font-mono text-sm'>{peso(pkg.priceCents)}</p>
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-3 p-5'>
        <p className='text-muted-text line-clamp-2 text-sm'>{pkg.description}</p>
        <ChipCluster chips={packageChips(pkg)} />
        <div className='mt-auto'>
          <BookNow id={pkg.id} kind='package' />
        </div>
      </div>
    </article>
  );
}

export function packageChips(pkg: ServicePackageWithInclusions): string[] {
  const framed = pkg.inclusions.filter((i) => i.kind === 'framed_picture');
  const prints = pkg.inclusions.filter((i) => i.kind === 'print');
  const privileges = pkg.inclusions.filter((i) => i.kind === 'privilege');
  const chips: string[] = [];
  const framedCount = framed.reduce((n, i) => n + (i.quantity ?? 1), 0);
  if (framedCount > 0) chips.push(`${framedCount} framed`);
  const printCount = prints.reduce((n, i) => n + (i.quantity ?? 1), 0);
  if (printCount > 0) chips.push(`${printCount} loose prints`);
  for (const p of privileges) {
    chips.push(privilegeLabel(p));
  }
  return chips;
}

function privilegeLabel(p: ResolvedPackageInclusion): string {
  if (p.attires.length > 0) {
    return `Attire: ${p.attires.map((a) => a.name).join(' & ')}`;
  }
  return p.description ?? 'Studio privilege';
}
```

(`demoOpen` and every export the compare/gallery surfaces used — `PrototypePackageCard`, `PrototypeServiceCard`, `PrototypeBranchCard`, `PrototypeStripItem`, `inclusionLines`, `CARD_GRID`, the density system, `MediaFrame`, `serviceIcon` — die with Task 4's deletion; the `d92` grid class inlines into Task 1 Step 3.)

- [ ] **Step 3: `home-image-led.tsx` — the variant D page body**

Create `apps/landing/src/components/home-image-led.tsx` with exactly:

```tsx
import type { ServicePackageWithInclusions, StudioServiceWithBranches } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { PackageCoverCard, ServiceImageCard } from './home-cards';
import {
  GALLERY_STANDINS,
  HERO_BLURB,
  HERO_PHOTO,
  HERO_PHOTO_ALT,
  KICKERS,
  TESTIMONIALS_PLACEHOLDER,
} from './home-copy';
import { selectFeaturedPackages } from '../lib/featured';

// The owner-endorsed home composition (#111 resolution, variant D — ruled
// flip #101). Slot map: 1 hero (full-bleed cinema, owner photo) → 2 gallery
// (masonry wall, stand-ins) → 3 featured packages (cover-driven cards, sans
// titles) → 4 services (full-image cards, ink gradients) → 5 testimonials
// (wash band, clearly placeholder) → 6 the ratified #92 gray-light emphasis
// band. The branches body strip is dropped BY RULING (footer + emphasis
// carry branches). Serif at h1/h2 per the register ruling; card titles sans.

export function HomeImageLed({
  packages,
  services,
}: {
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
}) {
  const { heading, packages: strip } = selectFeaturedPackages(packages);

  return (
    <div>
      {/* 1 — Hero: full-bleed cinema opening. */}
      <section className='bg-brand-ink relative isolate overflow-hidden'>
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
          <p className='text-brand-300 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            Sevendays Photography
          </p>
          <h1 className='mt-4 max-w-2xl font-serif text-5xl font-bold text-white md:text-6xl'>
            Three branches. One standard of light.
          </h1>
          <p className='mt-5 max-w-prose text-lg text-white/90'>{HERO_BLURB}</p>
          <div className='mt-8 flex flex-wrap gap-3'>
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
                'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-brand-focus-ring focus-visible:ring-3'
              )}
            >
              View services
            </Link>
          </div>
          <p className='text-white/60 mt-10 font-mono text-[11px]'>
            Photo from the studio — more of our work arrives at M5.
          </p>
        </div>
      </section>

      {/* 2 — Gallery: the masonry wall. */}
      <section className='border-line-soft border-b' data-strip='gallery'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            {KICKERS.gallery}
          </p>
          <h2 className='text-brand-ink mt-2 font-serif text-3xl font-semibold'>The work</h2>
          <div className='mt-8 columns-2 gap-4 md:columns-3 [&>figure]:mb-4'>
            {GALLERY_STANDINS.map((item) => (
              <figure
                key={item.src}
                className='border-line-soft bg-card break-inside-avoid overflow-hidden rounded-xl border shadow-sm'
              >
                <img
                  src={item.src}
                  alt={`${item.caption} — stand-in`}
                  className='w-full object-cover'
                  loading='lazy'
                />
                <figcaption className='text-muted-text mt-2 px-3 pb-2 font-mono text-[11px]'>
                  {item.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — Featured packages: cover-driven cards (owner ruling). */}
      <section className='mx-auto max-w-5xl px-6 py-16' data-strip='featured'>
        <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
          {KICKERS.packages}
        </p>
        <h2 className='text-brand-ink mt-2 font-serif text-3xl font-semibold'>{heading}</h2>
        <div className='mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {strip.map((p) => (
            <PackageCoverCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>

      {/* 4 — Services: full-image-background cards. */}
      <section className='border-line-soft bg-wash-a border-y' data-strip='services'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            {KICKERS.services}
          </p>
          <div className='mt-8 grid gap-4 md:grid-cols-2'>
            {services.map((s) => (
              <ServiceImageCard key={s.id} service={s} />
            ))}
          </div>
          <Link
            to='/services'
            className='text-brand-700 hover:text-brand-800 mt-6 inline-block text-sm font-medium underline underline-offset-4'
          >
            View all services
          </Link>
        </div>
      </section>

      {/* 5 — Testimonials: wash band + pull-quote hierarchy, CLEARLY
            placeholder. */}
      <section className='bg-wash-b border-line-soft border-y' data-strip='testimonials'>
        <div className='mx-auto max-w-5xl px-6 py-16'>
          <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            {KICKERS.testimonials}
          </p>
          <div className='mt-8 grid gap-8 md:grid-cols-5'>
            <figure className='md:col-span-3'>
              <blockquote className='text-brand-ink font-serif text-3xl leading-snug font-semibold'>
                “{TESTIMONIALS_PLACEHOLDER[0].quote}”
              </blockquote>
              <figcaption className='mt-4'>
                <p className='text-brand-700 font-mono text-xs font-bold tracking-wider uppercase'>
                  {TESTIMONIALS_PLACEHOLDER[0].name}
                </p>
                <p className='text-muted-text mt-1 text-sm'>
                  {TESTIMONIALS_PLACEHOLDER[0].context}
                </p>
              </figcaption>
            </figure>
            <div className='flex flex-col gap-6 md:col-span-2'>
              {TESTIMONIALS_PLACEHOLDER.slice(1).map((t) => (
                <figure key={t.context} className='border-line-soft border-l-2 pl-4'>
                  <blockquote className='text-brand-ink'>{t.quote}</blockquote>
                  <figcaption className='mt-2'>
                    <p className='text-brand-700 font-mono text-xs font-bold tracking-wider uppercase'>
                      {t.name}
                    </p>
                    <p className='text-muted-text mt-1 text-sm'>{t.context}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className='text-muted-text mt-6 font-mono text-[11px]'>
            PLACEHOLDER TESTIMONIALS — REAL CLIENT WORDS ARRIVE AT M5.
          </p>
        </div>
      </section>

      {/* 6 — Emphasis strip: the ratified #92 gray-light band. */}
      <section className='bg-brand-gray-light border-line-soft border-t' data-strip='call-visit'>
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='text-brand-ink font-serif text-xl font-semibold'>
              Not sure which session fits?
            </h2>
            <p className='text-brand-700 mt-1 text-sm'>
              Call or visit a branch — we will help you choose.
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
}
```

- [ ] **Step 4: Format + typecheck + tests + commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing build
git add apps/landing/src/components/home-image-led.tsx apps/landing/src/components/home-cards.tsx apps/landing/src/components/home-copy.ts
git commit -m "feat(landing): the #111-endorsed variant D composition as production files (#101)

home-image-led + home-cards + home-copy promoted from prototype/ verbatim
(renames, import paths, trim to D's consumers; zero class changes; copy
byte-identical — ratified 2026-09-16). Unwired until the next commit."
```

Expected: all green — the three files compile unwired, tests stay 7 files / 62 (nothing lib-level moved), the SSR build succeeds over the untouched routes.

---

### Task 2: The flip — `index.tsx` renders variant D + the ruled content-pages edit

**Files:**
- Modify: `apps/landing/src/routes/index.tsx` (full rewrite)
- Modify: `apps/landing/scripts/verify/content-pages.mjs:41-69` (the ticket's ONE ruled script edit — three checks)

**Interfaces:**
- Consumes: `HomeImageLed` (Task 1), `servicePackageQueries` / `studioServiceQueries` (unchanged factories).
- Produces: production `/` = the endorsed composition; a content-pages suite whose 16 checks pin the variant D home (branches via footer+emphasis, gallery wall, ratified blurb).

**Not here:** no other route or component changes (Task 3's serif is separate); the prototype routes still exist and still work until Task 4; no loader/query changes beyond dropping the now-unused branches prefetch (the ruled composition's single data delta — flag in the PR).

- [ ] **Step 1: Rewrite `index.tsx`**

Replace the ENTIRE file `apps/landing/src/routes/index.tsx` with exactly:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { HomeImageLed } from '../components/home-image-led';
import { servicePackageQueries, studioServiceQueries } from '../lib/queries';

// Home wears the owner-endorsed #111 variant D composition (ruled flip,
// #101): image-led hero → gallery → cover-driven packages → full-image
// services → placeholder testimonials → the #92 emphasis strip. The
// branches body strip is dropped by that ruling — footer + emphasis carry
// branches — and the loader's branch prefetch went with it (the ruled
// composition's only data-layer delta, surfaced in the PR).
export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
    ]);
  },
  component: HomePage,
});

function HomePage() {
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());

  return <HomeImageLed packages={packages} services={services} />;
}
```

(`BranchStripItem`, `PackageCard`, `ServiceTeaserItem`, `WalkInBadge`, the four variant imports, `DevOnlySwitcher`, `variantSearchSchema`, and `HomeCurrent` all leave this file. `BranchStripItem`/`ServiceTeaserItem` keep their files — #58-ruled keepers, `ServiceTeaserItem` still consumed by nothing else but cheap to keep; note both in the PR.)

- [ ] **Step 2: The ruled content-pages edit (three checks, count stays 16)**

In `apps/landing/scripts/verify/content-pages.mjs`, make exactly these three replacements.

(a) Replace the branches-strip check (lines 47–50) — note the new local name `homeBranchLinks` (`branchLinks` is declared later for /branches and must not collide):

```js
  check(
    'home: branches strip renders all branches',
    branches.every((b) => home.includes(b.address))
  );
```

with:

```js
  // Ruled edit (#101, this ticket's one script exception): the #111
  // variant D composition drops the branches body strip — footer +
  // emphasis carry branches (both asserted here); walk-in badges stay
  // fully covered by the /branches check below.
  const homeBranchLinks = await evaluate(
    `[...document.querySelectorAll("a[href='/branches']")].length`
  );
  check(
    'home: branches carried by footer + emphasis strip (variant D)',
    homeBranchLinks >= 2 && home.includes('Call or visit a branch')
  );
```

(b) Replace the walk-in-badges home check (lines 51–54):

```js
  check(
    'home: walk-in badges show both states (live seed has both)',
    home.includes('Walk-ins welcome') && home.includes('No walk-ins')
  );
```

with:

```js
  const galleryFigures = await evaluate(
    `document.querySelectorAll("[data-strip='gallery'] figure").length`
  );
  check('home: gallery wall renders (variant D stand-in strip)', galleryFigures >= 6);
```

(c) Replace the blurb check (lines 66–69):

```js
  check(
    'home: credibility blurb placeholder visible',
    home.includes('Our studio blurb is coming soon.')
  );
```

with:

```js
  check(
    'home: ratified hero blurb visible (#111 resolution; ruled edit #101)',
    home.includes(
      'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.'
    )
  );
```

- [ ] **Step 3: Format + typecheck + tests + build + commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing build
git add apps/landing/src/routes/index.tsx apps/landing/scripts/verify/content-pages.mjs
git commit -m "feat(landing): production home flips to the endorsed variant D composition (#101)

The ruled script edit rides this commit: content-pages' three home
expectations re-pinned to the ruled composition (branches via footer +
emphasis, gallery wall, ratified blurb) — 16 checks, same count. Branch
prefetch dropped with the branches strip (the composition's one data
delta). Ruling A carried to the Task 7 owner gate."
```

Expected: all green at build time; the CDP live run happens in Task 5 (needs the stack).

---

### Task 3: The serif register on inner pages (class-only)

**Files:**
- Modify: `apps/landing/src/routes/services.tsx:27,46`
- Modify: `apps/landing/src/routes/about.tsx:12,17,22`
- Modify: `apps/landing/src/routes/branches.tsx:20`
- Modify: `apps/landing/src/routes/packages/index.tsx:23`
- Modify: `apps/landing/src/routes/packages/$slug.tsx:24`

**Interfaces:**
- Consumes: the token layer's `font-serif` utility (Roboto Slab, self-hosted since #96).
- Produces: every content-page h1/h2 in Roboto Slab per the #111 register ruling; card/strip titles stay sans (in `PackageCard`, `ServiceCard`, `BranchCard` — untouched).

**Not here:** the booking flow surfaces (`book.tsx` question headings, `booking.$id.tsx`, `ConfirmationCard`) stay sans — frozen-flow posture, flagged boundary for the owner gate; home is already serif via Task 1; the chrome wordmarks are already serif.

- [ ] **Step 1: The eight heading edits**

| File:line | From | To |
|---|---|---|
| `services.tsx:27` | `className='font-bold text-4xl text-brand-ink'` | `className='font-bold font-serif text-4xl text-brand-ink'` |
| `services.tsx:46` | `className='font-semibold text-brand-ink text-xl'` | `className='font-semibold font-serif text-brand-ink text-xl'` |
| `about.tsx:12` | `className='font-bold text-4xl text-brand-ink'` | `className='font-bold font-serif text-4xl text-brand-ink'` |
| `about.tsx:17` | `className='font-semibold text-2xl text-brand-ink'` | `className='font-semibold font-serif text-2xl text-brand-ink'` |
| `about.tsx:22` | `className='font-semibold text-2xl text-brand-ink'` | `className='font-semibold font-serif text-2xl text-brand-ink'` |
| `branches.tsx:20` | `className='font-bold text-4xl text-brand-ink'` | `className='font-bold font-serif text-4xl text-brand-ink'` |
| `packages/index.tsx:23` | `className='font-bold text-4xl text-brand-ink'` | `className='font-bold font-serif text-4xl text-brand-ink'` |
| `packages/$slug.tsx:24` | `className='font-bold text-3xl text-brand-ink'` | `className='font-bold font-serif text-3xl text-brand-ink'` |

(Verify each line first: `grep -n '<h1\|<h2' apps/landing/src/routes/services.tsx apps/landing/src/routes/about.tsx apps/landing/src/routes/branches.tsx apps/landing/src/routes/packages/index.tsx apps/landing/src/routes/packages/\$slug.tsx` — the recon table is the expectation; if a line moved, re-locate by the quoted class string. innerText is untouched, so no CDP expectation moves.)

- [ ] **Step 2: Format + typecheck + tests + commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test
git add apps/landing/src/routes/services.tsx apps/landing/src/routes/about.tsx apps/landing/src/routes/branches.tsx apps/landing/src/routes/packages/
git commit -m "feat(landing): the #111 serif register on inner-page h1/h2 (#101)

Class-only (font-serif on page/section headings); card titles stay sans
per the register ruling; booking-flow headings stay sans (frozen-flow
boundary, flagged at the owner gate). Ruling B carried to the gate."
```

---

### Task 4: Delete the prototype surfaces

**Files:**
- Delete: `apps/landing/src/routes/prototype-tokens.tsx`
- Delete: `apps/landing/src/routes/prototype-remediation.tsx`
- Delete: `apps/landing/src/components/prototype/` (all 11 files — the 8 never-promoted ones plus the superseded originals of Task 1's three)
- Regenerate: `apps/landing/src/routeTree.gen.ts`

**Interfaces:**
- Consumes: Tasks 1–2 (production home no longer imports anything from `prototype/`).
- Produces: a tree with zero prototype routes/components — the AC's "`/prototype-tokens` gallery route is deleted" + the #99-plan fence's "`prototype/` is #101's".

**Not here:** `apps/landing/scripts/prototype-shot.mjs` + `prototype-contrast.mjs` survive until Task 8 (Tasks 5 and 7 still use them); `public/photos/` survives (production home consumes it); `packages/ui/popover.tsx` survives (production `home-cards.tsx` consumes it).

- [ ] **Step 1: Delete + regenerate**

```bash
git rm apps/landing/src/routes/prototype-tokens.tsx apps/landing/src/routes/prototype-remediation.tsx
git rm -r apps/landing/src/components/prototype/
pnpm --filter @sevendays/landing generate-routes
```

- [ ] **Step 2: Prove the tree is prototype-free**

```bash
ls apps/landing/src/components/prototype 2>&1   # expect: No such file or directory
grep -rn 'prototype' apps/landing/src/routeTree.gen.ts || echo "NO PROTOTYPE ROUTES IN TREE — OK"
grep -rln 'components/prototype' apps/landing/src || echo "NO PROTOTYPE IMPORTS — OK"
```

Expected: the ls fails; both greps print their OK fallback (the regenerated tree drops `PrototypeTokensRoute` / `PrototypeRemediationRoute`; nothing imports the dead directory).

- [ ] **Step 3: Format + full gates + commit**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing build
git add apps/landing/src/routeTree.gen.ts
git commit -m "feat(landing): the prototype surfaces die at milestone close-out (#101)

/prototype-tokens + /prototype-remediation routes, the 11-file
components/prototype/ directory (incl. the superseded originals of the
promoted files), and the routeTree entries — the spec's close-out duty.
Shot/contrast tooling and public/photos stay (still consumed)."
```

Expected: typecheck green over the shrunk import graph, tests 7 files / 62, SSR build green over the regenerated tree.

---

### Task 5: Main-side verification pack — stack, CDP trio, static gates, contrast

**Files:**
- No source files created. Fixes, if a gate fails, land in the file the failure names — then the gate re-runs.
- Evidence: `.superpowers/sdd/2026-09-20-101-m3-verification-closeout/task-5-evidence.md`
- Expected outcome: NO-COMMIT (all green).

**Interfaces:**
- Consumes: Tasks 1–4 (the final tree), the #99 stack procedure, the committed scripts.
- Produces: the evidence pack for ACs 1, 2, 3, and 8 — CDP trio green, lib-seam green unchanged, `pnpm check` green, starter theme provably gone, the AA pairs re-measured.

**Not here:** no script/test edits (Task 2 spent the one exception); the mutating e2e is NOT an AC here — it runs in Task 7 only to mint confirmation-page shots against the disposable local db; screenshots are Task 7.

- [ ] **Step 1: Boot the fully-local compose stack (the #99 procedure)**

```bash
docker compose up -d          # postgres:17, localhost:5432/sevendays_test (postgres/postgres)
printf 'DATABASE_MIGRATE_URL=postgres://postgres:postgres@localhost:5432/sevendays_test\n' > packages/db/.env
pnpm --filter @sevendays/db db:migrate && pnpm --filter @sevendays/db db:seed && pnpm --filter @sevendays/db db:verify-seed
```

Then the app env files (gitignored, never committed) — `apps/api/.dev.vars`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sevendays_test
RESEND_API_KEY=re_local_placeholder
LANDING_ORIGIN=http://localhost:3000
```

and `apps/landing/.env.local`:

```
API_URL=http://127.0.0.1:8787
```

Verify port 9222 is free (`ss -tlnp`), resolve the headless Chrome binary per the #97–#99 precedent (`google-chrome` if present, else `find ~/.cache/ms-playwright -name chrome-headless-shell -type f | head -1` — glob the cache root, never a remembered path), then boot the three terminals:

```bash
pnpm --filter @sevendays/api dev      # terminal 1 — 127.0.0.1:8787, seeded catalog
pnpm --filter @sevendays/landing dev  # terminal 2 — :3000; confirm from its log
<chrome-binary> --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify-101 about:blank  # terminal 3
```

(Servers as background tasks; grep each log for its actual port before probing — the SDD channel quirk.)

- [ ] **Step 2: The M2 CDP read-only regressions (AC 2)**

```bash
node apps/landing/scripts/verify/booking-wizard.mjs   # 15/15 — frozen flow untouched
node apps/landing/scripts/verify/content-pages.mjs    # 16/16 — incl. the 3 ruled-rewritten home checks
node apps/landing/scripts/verify/packages-pages.mjs   # 12/12 — sibling regression
```

Expected: every check PASS, exit 0. A FAIL in a non-ruled check means a surface broke a seam — fix the surface, never the script. The three ruled home checks failing means the composition drifted from the pinned variant D — fix the component, never the expectation.

- [ ] **Step 3: The lib-seam suites + the repo gate (AC 1)**

```bash
pnpm --filter @sevendays/landing test   # 7 files / 62 tests — byte-untouched
pnpm check                              # 35/35 turbo tasks
```

- [ ] **Step 4: The starter-theme static gates (AC 8)**

```bash
grep -rn 'text-neutral-\|bg-neutral-\|ring-neutral-' apps/landing/src apps/admin/src --include='*.tsx' || echo "NO ISLAND COLORS — OK"
grep -rin 'island' apps/landing/src apps/admin/src packages/ui/src || echo "NO ISLAND VOCABULARY — OK"
grep -rn -- '--chart-' packages/ui/src/tokens.css apps/landing/src/styles.css apps/admin/src || echo "NO CHART TOKENS — OK"
grep -rn 'fonts.googleapis\|fonts.gstatic\|@import url(http' apps/ packages/ --include='*.css' || echo "NO FONT CDN — OK"
grep -rln 'components/prototype' apps/landing/src || echo "NO PROTOTYPE IMPORTS — OK"
```

Expected: island + vocab + font-CDN greps print their OK fallbacks; the prototype grep prints `NO PROTOTYPE IMPORTS — OK` (the import-path check is the gate — the WORD "prototype" legitimately survives in historical comments: `lib/booking.ts` (M2 prototype-verbatim markers), `lib/format.ts:2`, `site-header.tsx:8` + `mobile-nav.tsx:14` (#111 prototype-band provenance), `confirmation-card.tsx:6`; live-verified 2026-09-20, none are starter-theme remnants). The chart grep prints exactly ONE hit — `packages/ui/src/tokens.css:8`, the comment documenting that no `--chart-*` tokens ship (a comment, not a token; record it as such in the evidence). If any other hit appears, that remnant is a fix in this ticket — remove it and re-run.

- [ ] **Step 5: Contrast re-verification (AC 3 — the four #92 pairs + the #111 chrome family + muted-on-wash)**

```bash
node apps/landing/scripts/prototype-contrast.mjs
node -e "
const hexToRgb=(h)=>{const s=h.replace('#','');return [0,2,4].map((i)=>parseInt(s.slice(i,i+2),16));};
const lum=(rgb)=>{const [r,g,b]=rgb.map((c)=>{const s=c/255;return s<=0.03928?s/12.92:((s+0.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
const ratio=(a,b)=>{const [l1,l2]=[lum(a),lum(b)].sort((x,y)=>y-x);return (l1+.05)/(l2+.05);};
console.log('muted #686969 on wash-base #f1f8fb:', ratio(hexToRgb('#686969'),hexToRgb('#f1f8fb')).toFixed(2));
console.log('muted #686969 on wash-a #e9f6fb:', ratio(hexToRgb('#686969'),hexToRgb('#e9f6fb')).toFixed(2));
console.log('muted #686969 on wash-b #d9eef6 (darkest):', ratio(hexToRgb('#686969'),hexToRgb('#d9eef6')).toFixed(2));
"
```

Expected: every pair ≥ 4.5 (AA). The load-bearing pins — ink/white ≈ 13.85+, white/primary 5.65, brand-700/white (link-on-white) 8.22, muted-on-wash-b ≈ 4.59 (tokens.css:40's recorded value), white/ink 18.64, brand-200/ink 13.94 (Treatment B nav links), white/deep 10.90 (Treatment B CTA). The two `F1 hijack — as-landed` rows print FAIL by design (they document the fixed bug's before-state) — record them as historical rows, not live pairs. Record ALL outputs verbatim in the evidence file.

- [ ] **Step 6: Evidence + teardown**

Write `.superpowers/sdd/2026-09-20-101-m3-verification-closeout/task-5-evidence.md` (topology, per-gate results with check counts 15/16/12, tests 7/62, `pnpm check` 35/35, every static-gate output incl. the one expected chart-comment hit, the full contrast table + the muted-on-wash lines). Kill Chrome + both dev servers; leave the compose db up (Task 7 reuses it). If (and only if) a gate forced a fix: commit it under `fix(landing): …` naming the gate; otherwise no commit.

---

### Task 6: Drain the v1 pick backlog — #110's pending SPLIT + the three skip rows

**Files:**
- No files in the main worktree. All git operations happen in `~/Projects/sevendays-v1-seed` (branch `v1`). The ledger rows themselves are edited on the #101 branch in Task 8.
- Evidence: `.superpowers/sdd/2026-09-20-101-m3-verification-closeout/task-6-evidence.md`

**Interfaces:**
- Consumes: main `8c89d63` (#110's squash), the runbook's SPLIT procedure + conflict policy, the #110 ledger row's pre-mapped conflict expectations.
- Produces: a `v1` HEAD carrying #110's styling (Treatment B chrome, F1 fix, defect-list polish, badge/popover/db-state hunks) with every booking/prototype hunk dropped; the run's locks green (CI `check` + `Deploy v1 (private)` success, `Deploy teaser (main)` skipped; audit exit 0; live curls pass); the recorded facts (v1 SHA, run id) for Task 8's ledger rows.

**Not here:** no triage or pick of THIS ticket's merge (Task 9, post-merge); no ledger edits yet (Task 8); the three SKIP verdicts (#109 `d6d507e`, #112 `7d93829`, #113 `d775a2c`) are already classifier-proven — they need rows only, no v1 commits; if the pick's conflict work passes one hour, STOP per the runbook's time-box and bring it to the owner (the fallback-trigger protocol).

- [ ] **Step 1: Pre-flight**

```bash
cd ~/Projects/sevendays-v1-seed
git status --short                 # expect clean
git switch v1 && git pull --ff-only origin v1
git fetch origin main
git log --oneline -1 v1            # expect c2c1056 (#100's pick)
node /home/jeius/Projects/sevendays/scripts/v1-triage.mjs 8c89d63   # re-confirm: SPLIT — 54 v1-path(s) + 18 main-only
```

- [ ] **Step 2: The SPLIT (runbook § Executing a SPLIT, verbatim)**

```bash
git cherry-pick -n 8c89d63         # exits 1 on "deleted by us" (DU) — expected
git status --short                 # A = new main-only file, DU = absent on v1, M = v1-path hunk
git rm -qrf --ignore-unmatch -- \
  docs/plan.md docs/progress.md \
  docs/superpowers/plans/2026-09-15-98-landing-surfaces-both-variants.md \
  graphify-out \
  apps/landing/scripts/verify/content-pages.mjs \
  apps/landing/scripts/prototype-shot.mjs \
  apps/landing/scripts/prototype-contrast.mjs \
  apps/landing/src/routes/prototype-tokens.tsx \
  apps/landing/src/routes/prototype-remediation.tsx \
  apps/landing/src/components/prototype \
  apps/landing/public/photos
```

(The graphify-out glob covers its whole footprint; `scripts/verify/content-pages.mjs` drops because `scripts/` is main-only on v1; the prototype surface + photos drop whole per the row's map — v1 has no consumer for them until this ticket's own pick. If `git status` shows additional `A`/`DU` paths beyond the row's 18 main-only list, `git rm` them the same way — the classifier output from Step 1 is the authoritative list.)

- [ ] **Step 3: Resolve the transformed surfaces per the row's conflict map**

The #110 ledger row pre-maps every conflict class — apply it exactly:

- `site-header.tsx` / `site-footer.tsx` / `mobile-nav.tsx` — apply Treatment B styling (brand-200 rest links, deep-petrol wide-tracked CTA, sd.png monogram, footer B register) around **v1's call-forward CTAs** ("Call us" → `/branches`); a hunk whose substance is the booking CTA drops.
- `index.tsx` — v1's as-landed home keeps its ruled call-forward two-CTA hero (Call Us + Services) and strip set; re-apply the ground hunks (rhythm/polish around v1's content); the "Book now" hero-CTA hunk drops (substance IS the booking CTA).
- `package-card.tsx` / `service-card.tsx` — surface/badge hunks apply; every CTA hunk drops (v1's catalog cards are CTA-less by ruling).
- `branch-card.tsx` — the `tel:` affordance + surface hunks apply (v1's primary per #60).
- `walk-in-badge.tsx`, `service-teaser-item.tsx` (focus ring; CTA-less per #105's pick), `services.tsx` / `about.tsx` / `branches.tsx` / `packages/*` rhythm hunks, `badge.tsx` + `popover.tsx` (packages/ui), `db-state.mjs`, `styles.css` (the F1 `@layer base` fix), `AGENTS.md` (client-safe UI bullet, the `87fe9e5` ruling class) — apply clean.
- `routeTree.gen.ts` — never resolved by hand: after the drops, `pnpm --filter @sevendays/landing generate-routes`.
- `popover.tsx`'s keep-or-drop is audit-neutral (the row leaves it to the executor) — KEEP it: #101's own pick lands `home-cards.tsx` consuming it next.

- [ ] **Step 4: Commit with provenance**

```bash
git commit -F - <<EOF
$(git log -1 --format=%B 8c89d63)

(cherry picked from commit $(git rev-parse 8c89d63))
Split: main-only paths dropped — docs/plan.md, docs/progress.md, docs/superpowers/plans/2026-09-15-98-landing-surfaces-both-variants.md, graphify-out/*, apps/landing/scripts/verify/content-pages.mjs, apps/landing/src/routes/prototype-*.tsx, apps/landing/src/components/prototype/*, apps/landing/public/photos/*
EOF
```

(The blank line after the `%B` line is load-bearing — the runbook's provenance-formatting trap. If a v1-path hunk was content-dropped in Step 3, `git restore --staged --worktree --source=HEAD -- <path>` BEFORE this commit and name it in the `Split:` line as `content-dropped: <path>`.)

- [ ] **Step 5: The locks (runbook § The locks, verbatim)**

```bash
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check && pnpm build
cd /home/jeius/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed   # expect exit 0
cd ~/Projects/sevendays-v1-seed && git push origin v1
gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId'     # then: gh run watch <id> --exit-status
gh run view <id> --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'      # check: success · Deploy v1 (private): success · Deploy teaser (main): skipped
```

If `pnpm install --frozen-lockfile` trips on the lockfile: take v1's lockfile (`git checkout v1 -- pnpm-lock.yaml` — pre-push, on the pick), `pnpm install`, commit the regenerated lockfile inside the pick; never hand-edit it. If `check` goes red for content reasons: `git revert` the pick on v1, push, re-triage — never force-push, never hot-fix on v1.

- [ ] **Step 6: The live curls + record**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/            # 200
curl -s -o /dev/null -w '%{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/book         # 404
curl -s https://sevendays-v1-landing.pahamajulius.workers.dev/ | grep -c 'Call Us\|Call us'                  # ≥ 1
curl -s https://sevendays-v1-landing.pahamajulius.workers.dev/ | grep -c 'Book now'                         # 0
```

Record in the evidence file: the v1 SHA of the pick, the CI run id + job conclusions, the audit exit code, the four curl results. Then write the three SKIP verdicts' facts for Task 8's rows (#109 `d6d507e`, #112 `7d93829`, #113 `d775a2c` — all classifier-proven all-main-only).

---

### Task 7: The screenshot pack, both variants — then the OWNER GATE (STOP)

**Files:**
- Create (gitignored): `.scratch/101-closeout-shots/main/*.png`, `.scratch/101-closeout-shots/main-mobile/*.png`, `.scratch/101-closeout-shots/v1/*.png`
- Create (gitignored): `/tmp/101-shot-flow.mjs` (the click-through shooter below — never committed)
- Evidence: `.superpowers/sdd/2026-09-20-101-m3-verification-closeout/task-7-evidence.md`

**Interfaces:**
- Consumes: the Task 5 stack (compose db still up; re-boot api/landing/Chrome if torn down), Task 6's deployed v1, `prototype-shot.mjs`.
- Produces: the per-surface pack the owner judges (AC 4) — desktop + the #111-mandated mobile viewport incl. the mobile-only chrome offenders.

**Not here:** no script/test edits; no live-Supabase writes (the e2e below writes only to the disposable local compose db); Task 8's docs.

- [ ] **Step 1: The click-through shooter (once, into /tmp)**

Write `/tmp/101-shot-flow.mjs` with exactly:

```js
// #101 close-out shooter: prototype-shot.mjs's pattern + step/menu clicks.
// Usage: node /tmp/101-shot-flow.mjs <url> <out.png> [clicks=0] [menu=false] [width=1440]
const CDP_HTTP = process.env.CDP_HTTP ?? 'http://127.0.0.1:9222';
const [url, out, clicks = '0', menu = 'false', w = '1440'] = process.argv.slice(2);

async function jsonHttp(path, opts) {
  const res = await fetch(`${CDP_HTTP}${path}`, opts);
  return res.json();
}
const page = await jsonHttp(`/json/new?${encodeURIComponent('about:blank')}`, {
  method: 'PUT',
});
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id).res(msg);
    pending.delete(msg.id);
  }
};
function send(method, params = {}) {
  const msgId = ++id;
  ws.send(JSON.stringify({ id: msgId, method, params }));
  return new Promise((res, rej) => pending.set(msgId, { res, rej }));
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.result?.exceptionDetails) {
    throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval failed');
  }
  return r.result?.result.value;
}

const width = Number(w);
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height: 2400,
  deviceScaleFactor: 2,
  mobile: width < 500,
});
await send('Page.navigate', { url });
await evaluate(
  `new Promise((res) => {
    if (document.readyState === 'complete') return res(1);
    const done = () => res(1);
    addEventListener('load', done);
    setTimeout(done, 12000);
  })`
);
await new Promise((r) => setTimeout(r, 3500));
if (menu === 'true') {
  await evaluate(`document.querySelector("[aria-label='Menu']")?.click()`);
  await new Promise((r) => setTimeout(r, 800));
}
// The wizard's proven advance path (booking-wizard.mjs's selectors):
// first branch card → first offering card → the step-3 Continue/Skip.
const ADVANCES = [
  `document.querySelector("section[data-step='1'] button")?.click()`,
  `document.querySelector("section[data-step='2'] button")?.click()`,
  `document.querySelector("section[data-step='3'] > button")?.click()`,
];
for (const click of ADVANCES.slice(0, Number(clicks))) {
  await evaluate(click);
  await new Promise((r) => setTimeout(r, 800));
}
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
});
const { writeFileSync } = await import('node:fs');
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log(`shot ${out} — title="${await evaluate('document.title')}"`);
ws.close();
```

- [ ] **Step 2: Main-variant desktop shots (local stack)**

```bash
L=http://localhost:3000; API=http://127.0.0.1:8787; S=.scratch/101-closeout-shots/main
SLUG=$(curl -s $API/api/v1/service-packages | node -e "let d='';process.stdin.on('data',(c)=>d+=c).on('end',()=>console.log(JSON.parse(d)[0].slug))")
node apps/landing/scripts/prototype-shot.mjs $L/                 $S/home.png
node apps/landing/scripts/prototype-shot.mjs $L/services         $S/services.png
node apps/landing/scripts/prototype-shot.mjs $L/packages         $S/packages.png
node apps/landing/scripts/prototype-shot.mjs $L/packages/$SLUG   $S/package-detail.png
node apps/landing/scripts/prototype-shot.mjs $L/about            $S/about.png
node apps/landing/scripts/prototype-shot.mjs $L/branches         $S/branches.png
node apps/landing/scripts/prototype-shot.mjs $L/book             $S/book-step-1.png
node /tmp/101-shot-flow.mjs $L/book $S/book-step-2.png 1
node /tmp/101-shot-flow.mjs $L/book $S/book-step-4.png 3
```

- [ ] **Step 3: Mint the confirmation rows + the confirmation/not-found shots (local db only)**

```bash
node apps/landing/scripts/verify/booking-e2e.mjs    # 7/7 — writes 2 rows to the DISPOSABLE local compose db
BID=$(curl -s "$API/api/v1/appointments" | node -e "let d='';process.stdin.on('data',(c)=>d+=c).on('end',()=>console.log(JSON.parse(d)[0].id))")
node apps/landing/scripts/prototype-shot.mjs $L/booking/$BID $S/booking-confirmation.png
node apps/landing/scripts/prototype-shot.mjs $L/booking/00000000-0000-0000-0000-000000000000 $S/booking-not-found.png
```

(The e2e is NOT this ticket's AC — it re-proves the frozen flow post-close-out and mints the confirmation shot's id. The Resend placeholder key fails loudly by design; the bookings stand. Record both booking ids in the evidence.)

- [ ] **Step 4: Mobile-viewport shots (390px — the #111 AC's mobile-only offenders)**

```bash
M=.scratch/101-closeout-shots/main-mobile
node apps/landing/scripts/prototype-shot.mjs $L/         $M/home.png      390 2400
node apps/landing/scripts/prototype-shot.mjs $L/services $M/services.png  390 2400
node apps/landing/scripts/prototype-shot.mjs $L/book     $M/book.png      390 2400
node /tmp/101-shot-flow.mjs $L/ $M/home-panel-open.png 0 true 390
```

- [ ] **Step 5: v1-variant shots (the picked deployment — AC 4's second half)**

```bash
V=https://sevendays-v1-landing.pahamajulius.workers.dev; SV=.scratch/101-closeout-shots/v1
node apps/landing/scripts/prototype-shot.mjs $V/               $SV/home.png
node apps/landing/scripts/prototype-shot.mjs $V/services       $SV/services.png
node apps/landing/scripts/prototype-shot.mjs $V/packages       $SV/packages.png
node apps/landing/scripts/prototype-shot.mjs $V/packages/$SLUG $SV/package-detail.png
node apps/landing/scripts/prototype-shot.mjs $V/about          $SV/about.png
node apps/landing/scripts/prototype-shot.mjs $V/branches       $SV/branches.png
node apps/landing/scripts/prototype-shot.mjs $V/               $SV/home-mobile.png 390 2400
```

(v1's home is its as-landed call-forward composition here — the variant D flip reaches v1 only through THIS ticket's own pick, Task 9. Say so in the evidence + the gate presentation; the post-pick v1 home shot lands in Task 9's addendum.)

- [ ] **Step 6: THE OWNER GATE — present and STOP**

Write the Task 7 evidence file (the shot inventory with per-file titles/body-length sanity from the shooters' output, the two booking ids, the v1-home caveat). Present to the owner: the pack + the Task 5/6 evidence + this ticket's two carried rulings and boundaries — **Ruling A** (production home = variant D, judged against the #111 resolution; the ruled 3-check script edit), **Ruling B** (serif inner-page h1/h2), the **booking-flow headings stay sans** boundary, the **orphaned `BranchStripItem`/`ServiceTeaserItem`** note, and the **v1-home-flip-deferred-to-Task-9** note. The owner accepts per-surface or names fixes — fixes loop back into Tasks 1–5 and the gate re-runs. **Do not proceed to Task 8 without the owner's acceptance on record.**

---

### Task 8: Docs, ledger, PR — after the owner's acceptance

**Files:**
- Modify: `docs/agents/v1-picks.md` (three new rows + #110's row updated), `docs/progress.md` (header + What-Exists entry), `docs/plan.md:103` (tick), this plan file (✅ ticks)
- Delete: `apps/landing/scripts/prototype-shot.mjs`, `apps/landing/scripts/prototype-contrast.mjs` (the throwaway tools — evidence already captured)
- Refresh: `graphify-out/`

**Interfaces:**
- Consumes: Tasks 1–7 incl. both evidence files + the owner's acceptance.
- Produces: the pushed branch + open PR closing #101; the owner merges.

**Not here:** `docs/plan.md`'s other M3 lines (already ticked); Task 9's row (post-merge); any Milestone 4+ checkboxes.

- [ ] **Step 1: The ledger rows**

In `docs/agents/v1-picks.md`'s ledger table: **insert** the #109 row BEFORE the existing #110 row, **update** #110's row in place, and **append** #112 + #113 after it (main order). Row shapes — fill every `<…>` from the Task 6 evidence:

```markdown
| 2026-09-16 | #109 | `d6d507e` | skip | — | docs-only: ledger row for #100 + audit token reshape — docs/agents/v1-picks.md + scripts/audit-v1-absence.mjs, both main-only (classifier) |
| 2026-09-16 | #110 | `8c89d63` | split | `<v1 sha>` | M3 ticket 04 + #111 remediation — **executed 2026-09-20 (#101's backlog drain)**: Treatment B chrome + F1 fix + defect-list polish + badge/popover/db-state/ui-bullet hunks picked; booking CTA hunks + the whole prototype/D surface + photos + scripts/docs dropped per the pre-mapped conflict expectations (row above). Locks: check <n>/<n> + build <n>/<n>, audit PASS 0/18; run <id> `check` + `Deploy v1 (private)` success, `Deploy teaser (main)` skipped; live: landing 200, `/book` 404, call-forward CTAs served, zero "Book now". Photos + variant D home deferred to #101's own pick |
| 2026-09-16 | #112 | `7d93829` | skip | — | docs-only: ledger row for #110 (pending) + progress #111 close-out — docs/agents/v1-picks.md + docs/progress.md, both main-only (classifier) |
| 2026-09-20 | #113 | `d775a2c` | skip | — | #99 booking-flow componentization — all 28 paths main-only (booking cluster + scripts/ + docs/graph; classifier). Mechanical skip; CDP/e2e evidence rode the ticket |
```

- [ ] **Step 2: progress.md + plan.md**

Prepend to `docs/progress.md`'s `Last updated` header: `2026-09-20 (#101 M3 close-out — M3 VERIFIED + CLOSED: production home flipped to the #111-endorsed variant D composition (Ruling A; content-pages' 3 home expectations re-pinned by the ticket's one ruled script edit), inner-page h1/h2 on the ruled serif register (Ruling B), every prototype surface deleted (/prototype-tokens, /prototype-remediation, components/prototype/, the dev switcher; shot/contrast tooling retired), the v1 backlog drained (#110's pending split executed with the pre-mapped conflict expectations; #109/#112/#113 skip rows recorded), CDP read-only trio 15/16/12 + lib-seam 7/62 unchanged + `pnpm check` 35/35 + the AA pairs re-measured (four #92 pairs + the #111 white-on-ink chrome family + muted-on-wash 4.59), owner per-surface screenshots accepted on main + the picked v1 deployment incl. mobile — PR <NN>.. Prior 2026-09-20: ` (the #99 entry becomes the Prior). Add the What-Exists bullet after #99's naming: the two rulings as agent rulings accepted at the gate, the branches-prefetch drop, the orphaned keepers, the Task 9 pick as the loop's tail.

Tick `docs/plan.md` line 103 (`grep -n "Verify: same URLs" docs/plan.md` to confirm the line first): `- [ ]` → `- [✅]` with a dated annotation naming: variant D flip + serif register (the two #101 rulings), CDP 15/16/12 + tests 7/62 + check 35/35, contrast pairs re-measured, both-variant owner screenshots incl. mobile, gallery deleted, v1 backlog drained.

- [ ] **Step 3: Retire the throwaway tools + graphify + full check**

```bash
git rm apps/landing/scripts/prototype-shot.mjs apps/landing/scripts/prototype-contrast.mjs
graphify update .
pnpm check
```

- [ ] **Step 4: Tick this plan + commit + push + open the PR**

```bash
# tick every completed step above with - [✅], then:
git add docs/ apps/landing/scripts/ graphify-out
git commit -m "docs: #101 close-out — ledger rows (backlog drained), progress record, roadmap tick, tool retirement, graph refresh"
git push -u origin feat/101-m3-closeout
gh pr create --base main --head feat/101-m3-closeout \
  --title "feat(landing): #101 M3 ticket 07 — M3 verification + close-out" \
  --body-file <staged body file>
```

Body sections: Summary · AC→evidence mapping (the ticket's 8 ACs against Tasks 4/5/6/7/8) · **the two agent rulings** (A: variant D flip + the ruled 3-check script edit, argued from #111's acceptance bar; B: serif register) + the boundaries (booking-flow headings sans; orphaned keepers; the branches-prefetch drop; v1 home flip deferred to the post-merge pick) · screenshots pointer (the accepted pack) · verification (CDP 15/16/12, e2e 7/7 local, tests 7/62 unchanged, check 35/35, static gates incl. the one expected chart-comment hit, contrast table) · the v1 ledger state · Closes #101.

- [ ] **Step 5: The completion report — then STOP for the owner's merge**

Evidence pack + AC mapping + rulings + flags to the owner. The owner merges the PR. Task 9 begins only after the merge.

---

### Task 9: Post-merge — pick THIS ticket's merge to v1 (the loop's tail)

**Files:**
- No files in the main worktree until the closing docs commit. All pick operations in `~/Projects/sevendays-v1-seed`.

**Interfaces:**
- Consumes: the merged #101 squash SHA on main (from the merge notification or `git log origin/main -1`), Tasks 1–4's diff (what the pick carries), the runbook.
- Produces: v1 wearing the flipped home (variant D + call-forward CTAs) + the serif inner pages + photos; the run's locks + the post-pick v1 home screenshot; the closing ledger row.

**Not here:** nothing else — this task is the standing discipline applied to this ticket's own merge; if its conflict work passes the one-hour time-box, stop and bring it to the owner.

- [ ] **Step 1: Triage + execute the SPLIT**

```bash
cd ~/Projects/sevendays-v1-seed && git switch v1 && git pull --ff-only origin v1 && git fetch origin main
node /home/jeius/Projects/sevendays/scripts/v1-triage.mjs <merge-sha>   # expect SPLIT: v1-paths = index.tsx + the three new home files + serif route hunks + photos/README + routeTree (regenerate)
git cherry-pick -n <merge-sha>                                            # DU exits expected
```

Drop the main-only paths (`git rm` per the classifier list — docs, graphify-out, `scripts/verify/content-pages.mjs`, the deleted prototype/`scripts/prototype-*` paths, the plan file). The scrub map for the transformed/new surfaces (conflict policy: keep v1's call-forward content, re-apply the composition):

- `index.tsx` + `home-image-led.tsx` — the composition applies whole; the hero CTAs scrub to v1's ruled pair: primary `Call Us` → `/branches`, secondary `Services` → `/services` (the #105/#110 pattern); the hero microcopy + blurb + kickers apply verbatim (no booking content).
- `home-cards.tsx` — `PackageCoverCard`'s `BookNow` drops (v1's catalog cards are CTA-less by ruling); `ServiceImageCard` keeps its image treatment with the affordance retargeted from `/book?service=` to `/services` (call-forward, single affordance); `packageChips`/`ChipCluster`/the popover apply clean.
- `home-copy.ts`, the serif h1/h2 hunks, `public/photos/` + its README — apply clean (booking-free; the photos' consumer arrives with this pick).
- `BranchStripItem`/`ServiceTeaserItem` deletions-if-any — there are none (the keepers stayed on main).

Commit with the `-F -` heredoc + provenance + `Split:` line, then the full lock sequence from Task 6 Step 5 (install/build:packages/api/check/build, audit, push, `gh run watch`, the job-conclusion triple, the four live curls).

- [ ] **Step 2: The post-pick v1 home shot + the closing row**

```bash
node apps/landing/scripts/prototype-shot.mjs https://sevendays-v1-landing.pahamajulius.workers.dev/ .scratch/101-closeout-shots/v1/home-variant-d.png
node apps/landing/scripts/prototype-shot.mjs https://sevendays-v1-landing.pahamajulius.workers.dev/ .scratch/101-closeout-shots/v1/home-variant-d-mobile.png 390 2400
```

(Shot from the MAIN checkout — the tool was retired from the branch but the merged main still carries it until… it doesn't: Task 8 Step 3 deleted it, and the merge carried the deletion. Recover it for this one shot with `git show <pre-deletion-sha>:apps/landing/scripts/prototype-shot.mjs > /tmp/prototype-shot.mjs` and run `node /tmp/prototype-shot.mjs …` — or drive one Page.captureScreenshot by hand; either way the PNG lands in `.scratch/101-closeout-shots/v1/`.)

Then, from the main checkout, land the closing ledger row (direct docs commit, the `87fe9e5` precedent — itself a skip-class row noted in its own Notes cell): the #101 PR row with the split SHA, the scrub map as executed, the locks, and the two shots' existence. Append the row to `docs/agents/v1-picks.md`, `graphify update .`, commit `docs(agents): v1-picks ledger row for #101 (split, picked as <sha>)`, push to main.

- [ ] **Step 3: The final completion report**

Both variants verified end-to-end (main local + v1 deployment incl. the flipped home), the ledger complete through #101, the milestone closed. Report + STOP.

---

## Self-Review

- **Spec coverage (the ticket's 8 ACs):** AC 1 (URLs/API calls/`data-*` verbatim, lib-seam + `pnpm check` green) → Tasks 2 (the single flagged loader delta + the ruled script edit), 5 Steps 2–3 — the wizard seam contract untouched by design (no booking-file edits anywhere). AC 2 (CDP read-only trio) → Task 5 Step 2 (15/16/12; the 16 includes the 3 ruled-rewritten home checks, count pinned). AC 3 (contrast re-verification) → Task 5 Step 5 (the four #92 pairs + the #111 chrome family + the muted-on-wash one-liner, expected values pinned from tokens.css + the #111 record). AC 4 (owner screenshots, both variants, vs the approved composition) → Tasks 1–2 make production the endorsed composition, Task 7 captures desktop + mobile + panel-open + confirmation/not-found on main and the picked v1 deployment, then the hard gate. AC 5 (every M3 merge triaged + ledger rows; v1 verified on the picked deployment) → Task 6 (#110 executed + the three skip rows proven), Task 8 Step 1 (rows landed), Task 9 (this ticket's own pick + closing row). AC 6 (`/prototype-tokens` deleted) → Task 4 (routes + directory + tree). AC 7 (progress.md + plan.md:103 `- [✅]`) → Task 8 Step 2. AC 8 (starter theme provably gone) → Task 5 Step 4's five greps + Task 4's purge (the single expected chart hit is the tokens.css:8 comment — pinned as such).
- **Sibling fences:** booking flow, admin, `packages/ui`, the API, and every lib file untouched; #99's six-step evidence trail remains the flow's record; the only shared-file edits are `index.tsx` (this ticket's ruled surface), the five serif route files, and the one ruled script.
- **Placeholder scan:** every created/rewritten file is pinned verbatim in full; `<merge-sha>`/`<v1 sha>`/`<id>`/`<n>/<n>`/`<NN>` directives name their evidence source (Task 6/9 records); the only execution-authored prose is Task 8's progress bullet + PR body, both structure-pinned; no TODO/TBD/"as appropriate" anywhere.
- **Type/signature consistency:** `HomeImageLed({ packages, services })` matches Task 2's call; `PackageCoverCard({ pkg })` / `ServiceImageCard({ service })` match Task 1 Step 3's usage; `home-copy.ts` exports exactly the six names Task 1 Step 3 imports; the content-pages replacements keep the file's `check`/`evaluate` helpers and avoid the `branchLinks` name collision (`homeBranchLinks`); the shooter's advance selectors are booking-wizard.mjs's proven three.
- **Claim strength vs. proof:** the triage verdicts are live classifier runs (2026-09-20), not predictions; the "3 checks trip on variant D" claim is derived from content-pages.mjs:41–69 against variant D's rendered structure (branches strip absent, badges absent, blurb replaced; deep-link + View-all checks verified against `PrototypeServiceImageCard`'s `/book?service=` Link and D's strip-end link); the v1 checkout state (HEAD `c2c1056`, clean) is a live read; the #110 conflict map is the ledger row's own pre-execution mapping, restated; the stack procedure is #99's recorded evidence; the contrast expectations are pinned to tokens.css comments + the #111 measured table — any drift the executor sees is investigated, never silently re-pinned.
- **Execution risks surfaced, not hidden:** the owner gate (Task 7 Step 6) can veto both rulings — the fix loop is named; the v1-home circularity (the flip reaches v1 only via this ticket's own post-merge pick) is sequenced explicitly (Tasks 7→9) rather than papered over; the e2e's local-db writes and the placeholder Resend posture are flagged at both use sites.

