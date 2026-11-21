# Plan: #340 — Image viewer: package-detail cover zoom — the lone-image variant

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A package with a real cover photo zooms on click from the package detail's cover half — a lone image: no prev/next arrows render, no counter. The initials placeholder stays inert. The cover variant rides the same `PhotoViewer` composition and lib seam as the mosaic walls.

**Architecture:** The seam gains `coverSlides` (the single-slide mapping: `src = coverImageUrl`, `alt = pkg.name`, never a description — and the D4 law itself as a mapping law: a null cover maps to zero slides, "the placeholder is not a photograph") plus the lone-image option constants (`COVER_CAROUSEL` with `finite: true`, `COVER_RENDER` hiding both arrows). `PhotoViewer` gains the optional `variant` prop (`'mosaic' | 'cover'`, default `'mosaic'` — the wall call site stays byte-identical); the cover branch swaps plugins to `[Zoom]` only and feeds the cover constants. `package-detail.tsx`'s cover half gains a real `<button>` around the `CoverPanel` **only when covered** — `CoverPanel` itself is untouched (its other three surfaces stay inert by construction). Focus restore, Esc/backdrop/× close, and the zoom gestures ride the already-landed laws.

**Tech Stack:** TanStack Start + React 19 + Tailwind v4 (landing), `yet-another-react-lightbox` 3.33.1 (already installed, landing app-local), vitest plain-node lib-seam tests. Zero new dependencies.

**Spec:** [GitHub issue #340](https://github.com/jeius/sevendays/issues/340), authoritatively settled by its parent spec — [issue #336](https://github.com/jeius/sevendays/issues/336), repo copy `docs/specs/2026-11-19-landing-image-viewer-spec.md` (§3.2; D4 + the cover side of D5). The rendered-variants gate is the sibling ticket #341 (teaser pass + owner reaction), NOT this plan. Library usage follows the user-level `yet-another-react-lightbox` skill (v3.x) — the finite carousel + the render-slot button hiding.

## The spec's shared worktree — this ticket's handoff law

The branch `image-viewer` at `.worktrees/image-viewer` carries #339 (landed at `3178d85`, cycle complete, all reviews ✅ — **unpushed; the owner's integration call is pending**). This plan executes here under the spec's one-worktree law, in this exact order:

1. **#339's PR squash-merges to main first** (owner-initiated — `git push -u origin image-viewer` + PR when they call it).
2. **The worktree syncs:** `git fetch origin && git reset --hard origin/main` (the squash-merge discipline — never merge main into the branch).
3. **This plan commits** (it is written UNTRACKED on purpose: an untracked file survives `reset --hard`; a committed one would be wiped by the reset or swept into #339's PR). Commit it as the first act of #340's SDD setup, exactly like #339's plan was.
4. #340 executes (SDD), PRs, merges; #341 (the owner gate) walks the deployed teaser after CI deploys main.

**Controller pre-flight (2026-11-21, worktree HEAD 3178d85):** every anchor below verified today in the worktree — landing baseline live-run **18 files / 143 tests** (the #339 floor); `package-detail.tsx` quoted verbatim (the cover half at `:31-37`, the grid's `overflow-hidden rounded-xl` at `:30` — the inset-ring reason); `CoverPanel` untouched (its consumer census = exactly 4 files: package-detail, featured-plates, branch-card, catalog-plates — only the first may gain the affordance); `ServicePackageRead` carries `name: string` + `coverImageUrl: string | null` (`packages/types/src/package.ts:193-199`); the YARL `Render` type is root-exported with `buttonPrev`/`buttonNext` optional members returning ReactNode (the skill's customization reference carries the exact single-slide recipe this plan pins: `carousel={{ finite: … }}` + `render={{ buttonPrev: () => null, buttonNext: () => null }}`); the four non-finite carousel keys are the shipped dist defaults (final-review-verified: `preload: 2, padding: "16px", spacing: "30%", imageFit: contain`); and the landed seam's type vocabulary is `DeepPartialValue<ControllerSettings, 'ref'>` / `DeepPartialValue<CarouselSettings, 'imageProps'>` (the #339 round-2 ruling — the new constants annotate identically).

## Scope fences

**In scope (landing only):** `src/lib/viewer.ts` (+5 seam pins in `viewer.test.ts`); `src/components/photo-viewer.tsx` (the `variant` prop + cover branch); `src/components/package-detail.tsx` (the affordance + the viewer instance); `docs/progress.md`; the AGENTS.md landing floor sentence; graphify.

**NOT here (siblings / out of scope):**

- **#341 — the rendered-variants pass.** The cover surface joins #341's walk (it already covers three surfaces; the cover zoom is the fourth — the ticket's three-surface list already names "package cover zoom"). This plan has no visual-pass step.
- **#339's integration.** The merge/PR/reset sequencing above is controller/owner work at setup, not plan content.
- **The other three `CoverPanel` surfaces** (catalog plates `catalog-plates.tsx:80`, home featured `featured-plates.tsx:61`, branch cards `branch-card.tsx:37`) — stay non-zoom, byte-identical (verify-only census in Task 2). Only the package-detail gains the affordance (spec Out of Scope, D4).
- **`cover-panel.tsx` itself** — zero changes. The component is shared; the affordance lives in the detail's composition, the placeholder stays inert by construction.
- **No new dependencies, no packages/ui / api / admin / packages changes, no e2e/visual changes** — the img box is byte-identical (the button is the positioning box; `CoverPanel`'s classes pass through verbatim), so the ADR-0022 baselines hold.
- **No v1 pick/ledger work in this branch** — post-merge, main-only per `docs/agents/v1-picks.md`.

## Owner rulings (settled at charting + the #328 pick, recorded in the spec)

- **The lone-image law**: `finite: true` + the render-slot arrow hide + no Counter — the ruled Standard set minus navigation, nothing more (D4).
- **The placeholder is not a photograph and does not zoom** (D4) — carried as the seam's null-cover mapping law.
- **The cover variant rides the same composition + seam** — one `PhotoViewer`, one alt law (`alt = pkg.name`), shared labels (D5's "the shared labels strings").

## Global Constraints

- **Verbatim values this plan introduces (use exactly; do not paraphrase):**
  - The seam additions: `coverSlides(pkg: { name: string; coverImageUrl: string | null }): Slide[]` (null cover → `[]`; covered → exactly one slide `{ src, alt: pkg.name }` — never `title`, never `description`); `COVER_CAROUSEL: DeepPartialValue<CarouselSettings, 'imageProps'>` = `{ finite: true, preload: 2, padding: '16px', spacing: '30%', imageFit: 'contain' }`; `COVER_RENDER: Render` = `{ buttonPrev: () => null, buttonNext: () => null }`.
  - The composition: `variant?: 'mosaic' | 'cover'` on `PhotoViewer` (default `'mosaic'`); cover branch = plugins `[Zoom]` only, `carousel={COVER_CAROUSEL}`, `render={COVER_RENDER}`, controller/labels unchanged from the seam.
  - The detail button's class vocabulary: `absolute inset-0 cursor-zoom-in rounded-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring focus-visible:ring-inset` (inset ring — the detail grid's `overflow-hidden` would clip an outset ring; `absolute` makes the button the positioning box so `CoverPanel`'s `absolute inset-0` classes anchor to IT).
  - Every before/after block in the tasks is written out in full — land it verbatim; `pnpm fix` (biome) is the arbiter if any block drifts.
- **Per-task gates:** `pnpm --filter @sevendays/landing test` AND `pnpm --filter @sevendays/landing typecheck` — both green before each task's commit. Final gate: `pnpm check` green at the repo root (Task 3 carries the shared-DB isolation recipe). Do not commit code that fails it for the packages/apps touched.
- **Floors:** landing starts at 18 files / 143 tests (live-confirmed 2026-11-21 at `3178d85`). Task 1 adds exactly FIVE tests to the existing `viewer.test.ts` (no new files) → **18 files / 148 tests** from Task 1 on; Tasks 2–3 add zero tests — the count may not move again. api / api-client / admin untouched — their floors may not move.
- **No component/DOM tests** (the spec's Testing Decisions + the house rule): open/zoom/navigate/close behavior is #341's rendered-variants gate.
- On a fresh clone only, run `pnpm install` then `pnpm build:packages` first (AGENTS.md).
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits follow the repo's commit-work convention, each referencing #340: `feat(landing): …` for Tasks 1–2, `docs:` + `chore(graphify):` for Task 3.
- **UI-bearing work (AGENTS.md): execution loads the installed UI/UX skill set — `ui-ux-pro-max` + `prototype`** — and consults the user-level `yet-another-react-lightbox` skill. The #94/#111 rendered-variants round is #341's teaser pass, not this plan's; the audit below gates the review instead.

## UI skill audit (`ui-ux-pro-max`, run against this plan 2026-11-21)

The ux-domain searches carry over from the #339 audit (Focus States, gesture conflicts, image optimization, scrim legibility, touch targets, reduced motion — all re-checked below for the cover surface specifically):

- **Affordance consistency:** the cover entry point reuses the wall button's exact interaction grammar (`cursor-zoom-in` + the inset brand-focus ring + content-based accessible name) — one grammar for both viewer entry points, no per-surface invention.
- **Focus States (High):** the trigger keeps the visible-focus treatment (`focus-visible:ring-3 ring-brand-focus-ring`, inset against the grid's `overflow-hidden`); the viewer chrome's focus ring is already landed (#339).
- **Touch targets:** the plate half is `min-h-64 / md:min-h-[26rem]` — hundreds of px, far above minimums; the zoom gestures (double-click/pinch) carry the keyboard `+`/`-` alternative (D7, already landed).
- **Honest states:** the coverless placeholder stays a non-interactive gradient — no fake affordance on a non-photograph (the skill's disabled-state-clarity rule, correctly inverted: never render a control that does nothing); the seam's `[]` law makes the inertness structural.
- **Image optimization:** same-URL cache win — the slide `src` IS the `coverImageUrl` the panel rendered (D5 posture, unchanged for the cover).
- **Reduced motion:** the library's native media rule already covers the cover variant (no new motion authored this ticket).
- **Anti-patterns:** none — the arrow-hide and counter-absence are the owner-settled Standard-set boundary (D4), not design discretion.

No trips. #341's owner reaction remains the visual gate (by design).

---

## Task 1 — The cover-slide seam extension (TDD)

**Files:**
- Modify: `apps/landing/src/lib/viewer.ts` (additive — the existing exports/lines are untouched except the two appended sections)
- Test: `apps/landing/src/lib/viewer.test.ts` (+5 tests appended)

**Interfaces:**
- Consumes: `Slide`, `CarouselSettings`, `DeepPartialValue`, `Render` (all root-exported type-only imports — `Render` joins the existing type import), `PublicGalleryPhoto` (existing).
- Produces (Task 2 consumes): `coverSlides(pkg: { name: string; coverImageUrl: string | null }): Slide[]`; `COVER_CAROUSEL: DeepPartialValue<CarouselSettings, 'imageProps'>`; `COVER_RENDER: Render` — plus the landed `GALLERY_ALT_FALLBACK`, `photoSlides`, `MOSAIC_CONTROLLER`, `MOSAIC_CAROUSEL`, `VIEWER_LABELS` untouched.

- [ ] **Step 1: Append the five failing tests to `apps/landing/src/lib/viewer.test.ts`** (inside the existing describe structure — a new `describe('coverSlides (the lone-image law, #336 D4/D5)')` block plus a second describe for the constants; full code below, placed after the existing `describe('the pinned option vocabulary (#336 D5/D6)')` block):

```ts
describe('coverSlides (the lone-image law, #336 D4/D5)', () => {
  it('a covered package maps to exactly one slide — src = coverImageUrl, alt = the package name, no title', () => {
    const slides = coverSlides({ name: 'The Wedding Package', coverImageUrl: 'https://pub-test.r2.dev/covers/pkg.jpg' });
    expect(slides).toHaveLength(1);
    expect(slides[0]?.src).toBe('https://pub-test.r2.dev/covers/pkg.jpg');
    expect(slides[0]?.alt).toBe('The Wedding Package');
    expect('title' in (slides[0] ?? {})).toBe(false);
  });

  it('a null cover maps to ZERO slides — the placeholder is not a photograph (D4)', () => {
    expect(coverSlides({ name: 'The Wedding Package', coverImageUrl: null })).toEqual([]);
  });

  it('the cover slide never carries a description (the lone image has no caption law)', () => {
    const slides = coverSlides({ name: 'The Wedding Package', coverImageUrl: 'https://pub-test.r2.dev/covers/pkg.jpg' });
    expect('description' in (slides[0] ?? {})).toBe(false);
  });
});

describe('the cover variant constants (#336 D4)', () => {
  it('COVER_CAROUSEL: the lone image cannot loop (finite true) on the shared defaults', () => {
    expect(COVER_CAROUSEL).toEqual({
      finite: true,
      preload: 2,
      padding: '16px',
      spacing: '30%',
      imageFit: 'contain',
    });
  });

  it('COVER_RENDER: both arrows render null — the library’s named hide (no arrows at all)', () => {
    expect(COVER_RENDER.buttonPrev?.()).toBe(null);
    expect(COVER_RENDER.buttonNext?.()).toBe(null);
  });
});
```

Also extend the import at the file's top — current line for exact match:

```ts
import {
  GALLERY_ALT_FALLBACK,
  MOSAIC_CAROUSEL,
  MOSAIC_CONTROLLER,
  photoSlides,
  VIEWER_LABELS,
} from './viewer';
```

Replace with:

```ts
import {
  COVER_CAROUSEL,
  COVER_RENDER,
  GALLERY_ALT_FALLBACK,
  MOSAIC_CAROUSEL,
  MOSAIC_CONTROLLER,
  VIEWER_LABELS,
  coverSlides,
  photoSlides,
} from './viewer';
```

- [ ] **Step 2: Run it and verify it FAILS.**

```bash
pnpm --filter @sevendays/landing exec vitest run src/lib/viewer.test.ts
```

Expected: FAIL — the new imports don't resolve (`coverSlides`/`COVER_CAROUSEL`/`COVER_RENDER` not exported yet; any resolution/named-export error naming them is the expected red).

- [ ] **Step 3: Implement the seam additions** — in `apps/landing/src/lib/viewer.ts`, extend the type import and append the two new sections. Current import block (post-biome, byte-exact):

```ts
import type {
  CarouselSettings,
  ControllerSettings,
  DeepPartialValue,
  Labels,
  Slide,
} from 'yet-another-react-lightbox';
```

Replace with:

```ts
import type {
  CarouselSettings,
  ControllerSettings,
  DeepPartialValue,
  Labels,
  Render,
  Slide,
} from 'yet-another-react-lightbox';
```

Then append at the file's end:

```ts

// The cover variant (#336 D4/D5): the package-detail cover zooms as a LONE
// image. The mapping carries D4's law itself — a null cover maps to ZERO
// slides (the initials placeholder is not a photograph and does not zoom),
// so the inertness is structural, not a render-site convention. The slide
// carries the package name as its alt (the CoverPanel img's own alt law —
// one source) and never a title or description: a lone image has no
// caption law, and the same-URL cache win rides here too (the slide src IS
// the coverImageUrl the panel already rendered).
export function coverSlides(pkg: { name: string; coverImageUrl: string | null }): Slide[] {
  if (!pkg.coverImageUrl) return [];
  return [{ src: pkg.coverImageUrl, alt: pkg.name }];
}

// The lone-image option vocabulary (D4): the single slide cannot loop, and
// the arrows are hidden by the library's named render slots (no arrows
// render at all). No Counter joins the cover variant's plugins — that
// lives in PhotoViewer's variant branch. The controller (Esc / backdrop /
// × close, pull-close off) and the labels are SHARED with the mosaic
// variant (D5's "the shared labels strings").
export const COVER_CAROUSEL: DeepPartialValue<CarouselSettings, 'imageProps'> = {
  finite: true,
  preload: 2,
  padding: '16px',
  spacing: '30%',
  imageFit: 'contain',
};

export const COVER_RENDER: Render = {
  buttonPrev: () => null,
  buttonNext: () => null,
};
```

- [ ] **Step 4: Run the suite file and verify it PASSES (14 tests — the 9 landed + 5 new).**

```bash
pnpm --filter @sevendays/landing exec vitest run src/lib/viewer.test.ts
```

Expected: PASS — 1 file, 14 tests.

- [ ] **Step 5: Full landing gates.**

```bash
pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing typecheck
```

Expected: `Test Files  18 passed (18)` / `Tests  148 passed (148)`; typecheck clean.

- [ ] **Step 6: Commit.**

```bash
git add apps/landing/src/lib/viewer.ts apps/landing/src/lib/viewer.test.ts
git commit -m "feat(landing): image viewer — the cover-slide seam + the lone-image constants (#340)"
```

---

## Task 2 — The `variant` prop + the package-detail wiring (the deliverable)

**Files:**
- Modify: `apps/landing/src/components/photo-viewer.tsx` (full-file replace — the current file is 73 lines; the before/after is below)
- Modify: `apps/landing/src/components/package-detail.tsx` (targeted blocks — imports, the component top, the cover half, the viewer instance)
- Verify-only: `apps/landing/src/components/mosaic-photo-grid.tsx` — **byte-identical** (the `variant` prop is optional with default `'mosaic'`, so the wall's call site compiles unchanged); `cover-panel.tsx` — **zero changes**; the CoverPanel consumer census stays exactly 4 files.

**Interfaces:**
- Consumes: `coverSlides`, `COVER_CAROUSEL`, `COVER_RENDER` (Task 1 — exact names); the landed `PhotoViewer({ slides, index, onClose })` signature (widened, never renamed).
- Produces: nothing downstream — #341 walks the rendered result.

No unit test in this task — by rule (lib-seam-only; behavior is #341's gate). Gates: typecheck + the unchanged 18/148 floor + biome + the byte-identity checks.

- [ ] **Step 1: Replace `apps/landing/src/components/photo-viewer.tsx` contents.** Current file verbatim (for exact match):

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Slide } from 'yet-another-react-lightbox';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import { MOSAIC_CAROUSEL, MOSAIC_CONTROLLER, VIEWER_LABELS } from '../lib/viewer';

// The viewer composition (#336 D2/D6/D7): one Lightbox over the seam's
// mosaic vocabulary. The two laws the library does NOT carry live here —
// the live-index track (a re-render while open must re-sync to the CURRENT
// slide, never snap the carousel back to the opening photo) and the
// focus-restore (the library moves focus IN on open but never back).
// #340 widens this with the lone-image cover variant; nothing here branches.

// Focus-restore capture must run BEFORE the library's focus-on-open —
// which registers as a PASSIVE effect in the shipped dist (verified
// 3.33.1: `React.useEffect(focusOnMount, …)` in the Controller), so every
// layout effect outruns it. SSR renders the closed viewer, where
// useLayoutEffect would warn — the isomorphic swap keeps the server on
// the passive hook (a no-op there: `index` is null before hydration).
const useRestoreEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function PhotoViewer({
  slides,
  index,
  onClose,
}: {
  /** The mapped slides (the lib seam) — pass a STABLE reference (memoized at the surface). */
  slides: Slide[];
  /** null = closed; a number opens AT that photo (the clicked one). */
  index: number | null;
  onClose: () => void;
}) {
  const open = index !== null;
  // D6: `live` tracks navigation (on.view) so the surface's `index` sets
  // only the OPENING slide; while open, the Lightbox re-syncs to `live`.
  const [live, setLive] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) setLive(null); // closing resets: reopening starts at the clicked photo (D6)
  }, [open]);

  // D7: capture the trigger on the open edge (before the library's passive
  // focus-on-open runs), restore it on the close edge — the only focus law
  // the spec adds by hand.
  useRestoreEffect(() => {
    if (open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus();
  }, [open]);

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={live ?? index ?? 0}
      on={{ view: ({ index: current }) => setLive(current) }}
      slides={slides}
      plugins={[Captions, Counter, Zoom]}
      carousel={MOSAIC_CAROUSEL}
      controller={MOSAIC_CONTROLLER}
      labels={VIEWER_LABELS}
    />
  );
}
```

- [ ] **Step 2: …with (the new file, verbatim):**

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Slide } from 'yet-another-react-lightbox';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import {
  COVER_CAROUSEL,
  COVER_RENDER,
  MOSAIC_CAROUSEL,
  MOSAIC_CONTROLLER,
  VIEWER_LABELS,
} from '../lib/viewer';

// The viewer composition (#336 D2/D6/D7): one Lightbox over the seam's
// option vocabulary, in two variants — the mosaic walls (arrows + counter +
// captions, the carousel loops) and (#340) the lone-image cover (zoom only,
// finite, no arrows, no counter — D4). The two laws the library does NOT
// carry live here for BOTH variants — the live-index track (a re-render
// while open must re-sync to the CURRENT slide, never snap the carousel
// back to the opening photo) and the focus-restore (the library moves
// focus IN on open but never back).

// Focus-restore capture must run BEFORE the library's focus-on-open —
// which registers as a PASSIVE effect in the shipped dist (verified
// 3.33.1: `React.useEffect(focusOnMount, …)` in the Controller), so every
// layout effect outruns it. SSR renders the closed viewer, where
// useLayoutEffect would warn — the isomorphic swap keeps the server on
// the passive hook (a no-op there: `index` is null before hydration).
const useRestoreEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function PhotoViewer({
  slides,
  index,
  onClose,
  variant = 'mosaic',
}: {
  /** The mapped slides (the lib seam) — pass a STABLE reference (memoized at the surface). */
  slides: Slide[];
  /** null = closed; a number opens AT that photo (the clicked one). */
  index: number | null;
  onClose: () => void;
  /** The mosaic walls (default) or the package-detail lone-image cover (D4). */
  variant?: 'mosaic' | 'cover';
}) {
  const open = index !== null;
  // D6: `live` tracks navigation (on.view) so the surface's `index` sets
  // only the OPENING slide; while open, the Lightbox re-syncs to `live`.
  // On the cover variant there is nothing to navigate — `live` stays null
  // and the single slide is the only view.
  const [live, setLive] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) setLive(null); // closing resets: reopening starts at the clicked photo (D6)
  }, [open]);

  // D7: capture the trigger on the open edge (before the library's passive
  // focus-on-open runs), restore it on the close edge — the only focus law
  // the spec adds by hand.
  useRestoreEffect(() => {
    if (open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus();
  }, [open]);

  // D4: the cover variant zooms a LONE image — plugins shrink to Zoom only
  // (no Counter, no Captions: a lone image has no caption law), the
  // carousel cannot loop, and the arrows are hidden by the render slots.
  // The controller and labels are shared (D5's "the shared labels strings").
  const cover = variant === 'cover';

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={live ?? index ?? 0}
      on={{ view: ({ index: current }) => setLive(current) }}
      slides={slides}
      plugins={cover ? [Zoom] : [Captions, Counter, Zoom]}
      carousel={cover ? COVER_CAROUSEL : MOSAIC_CAROUSEL}
      controller={MOSAIC_CONTROLLER}
      labels={VIEWER_LABELS}
      render={cover ? COVER_RENDER : undefined}
    />
  );
}
```

- [ ] **Step 3: Wire the package detail** — three targeted blocks in `apps/landing/src/components/package-detail.tsx`.

Block A — the imports. Current lines 1-8 (for exact match):

```tsx
import type { ResolvedPackageInclusion, ServicePackageRead } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowLeft, CalendarPlus } from 'lucide-react';
import { peso } from '../lib/format';
import { CoverPanel } from './cover-panel';
import { inclusionPhrase } from './inclusions-list';
```

Replace with:

```tsx
import type { ResolvedPackageInclusion, ServicePackageRead } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowLeft, CalendarPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { peso } from '../lib/format';
import { coverSlides } from '../lib/viewer';
import { CoverPanel } from './cover-panel';
import { PhotoViewer } from './photo-viewer';
import { inclusionPhrase } from './inclusions-list';
```

Block B — the component top. Current lines 18-20 (for exact match):

```tsx
export function PackageDetail({ pkg }: { pkg: ServicePackageRead }) {
  const price = peso(pkg.priceCents);

  return (
```

Replace with:

```tsx
export function PackageDetail({ pkg }: { pkg: ServicePackageRead }) {
  const price = peso(pkg.priceCents);
  // The cover zoom (#336 D4): the lone-image variant opens at the one
  // slide; a coverless package maps to zero slides (the seam's law) and
  // renders no affordance at all — the placeholder is inert.
  const [viewerOpen, setViewerOpen] = useState(false);
  // A stable slides reference (the library's documented pitfall — the
  // detail re-renders on query refetches while the viewer is open).
  const slides = useMemo(() => coverSlides(pkg), [pkg]);

  return (
```

Block C — the cover half. Current lines 31-37 (for exact match):

```tsx
        <div className='relative min-h-64 md:col-span-3 md:min-h-[26rem]'>
          <CoverPanel
            name={pkg.name}
            coverImageUrl={pkg.coverImageUrl}
            className='absolute inset-0 size-full rounded-none object-cover'
          />
        </div>
```

Replace with:

```tsx
        <div className='relative min-h-64 md:col-span-3 md:min-h-[26rem]'>
          {/* The zoom affordance exists ONLY when the row carries a photo —
              the initials placeholder is not a photograph and does not zoom
              (D4). The button is the positioning box (CoverPanel's absolute
              classes anchor to it); the ring is inset (the grid's
              overflow-hidden would clip an outset one); the accessible name
              is the img's alt = the package name (content-based). */}
          {pkg.coverImageUrl ? (
            <button
              type='button'
              onClick={() => setViewerOpen(true)}
              className='absolute inset-0 cursor-zoom-in rounded-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring focus-visible:ring-inset'
            >
              <CoverPanel
                name={pkg.name}
                coverImageUrl={pkg.coverImageUrl}
                className='absolute inset-0 size-full rounded-none object-cover'
              />
            </button>
          ) : (
            <CoverPanel
              name={pkg.name}
              coverImageUrl={pkg.coverImageUrl}
              className='absolute inset-0 size-full rounded-none object-cover'
            />
          )}
        </div>
```

Block D — the viewer instance, appended inside the outermost `div` after the grid plate closes. Current lines 59-64 (for exact match):

```tsx
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book this package
          </Link>
        </div>
      </div>
```

Replace with:

```tsx
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book this package
          </Link>
        </div>
      </div>
      <PhotoViewer
        variant='cover'
        slides={slides}
        index={viewerOpen ? 0 : null}
        onClose={() => setViewerOpen(false)}
      />
```

Landing law (why each piece is shaped this way): the button is `absolute inset-0` so it IS the plate box — `CoverPanel`'s own `absolute inset-0` classes then anchor to the button (absolute elements are positioned ancestors), keeping the img's rendered box byte-identical (the ADR-0022 baselines hold); the accessible name is content-based (the wrapped img's `alt={name}`) with no aria-label; `rounded-none` matches the plate's square corners; the viewer instance renders null while closed (no layout effect) and its portal mounts on `document.body`.

- [ ] **Step 4: The byte-identity checks (the fences, mechanically).**

```bash
git diff --stat HEAD -- apps/landing/src/components/mosaic-photo-grid.tsx apps/landing/src/components/cover-panel.tsx apps/landing/src/components/home-image-led.tsx apps/landing/src/routes/about.tsx apps/landing/src/components/catalog-plates.tsx apps/landing/src/components/featured-plates.tsx apps/landing/src/components/branch-card.tsx
```

Expected: EMPTY (all seven byte-identical — the wall, the shared panel, and every other CoverPanel surface).

```bash
grep -rn "CoverPanel" apps/landing/src --include='*.tsx' | grep -v 'cover-panel.tsx' | grep -c "import\|<CoverPanel"
```

Expected: `8` (the same four files, unchanged import+render counts).

- [ ] **Step 5: Gates.**

```bash
pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/components/photo-viewer.tsx src/components/package-detail.tsx
```

Expected: 18 files / 148 tests unchanged; typecheck clean; no remaining diagnostics.

- [ ] **Step 6: Commit.**

```bash
git add apps/landing/src/components/photo-viewer.tsx apps/landing/src/components/package-detail.tsx
git commit -m "feat(landing): the package-detail cover zooms — the lone-image variant (#340)"
```

---

## Task 3 — Docs, graphify, and the final gate

**Files:**
- Modify: `docs/progress.md` (one dated section at the tail)
- Modify: `AGENTS.md` (the landing floor sentence)
- Modify: `graphify-out/` (via `graphify update .`)

**Interfaces:**
- Consumes: everything landed in Tasks 1–2.
- Produces: the repo record; nothing code-side.

- [ ] **Step 1: Append the dated section to `docs/progress.md`** (at the file's tail, after the `## 2026-11-21 — #339:` section). Full text:

```markdown
## 2026-11-21 — #340: the package-detail cover zoom — the lone-image variant

A package with a real cover photo now zooms on click from the package detail's cover half — the ruled lone-image law end to end (spec #336 D4 + the cover side of D5; #341's owner gate walks it). The seam gained `coverSlides` — the single-slide mapping (src = coverImageUrl, alt = the package name — the CoverPanel img's own alt law, one source; never a title, never a description: a lone image has no caption law) carrying D4's inertness law structurally: a null cover maps to ZERO slides, so "the placeholder is not a photograph and does not zoom" is a pinned mapping fact (`viewer.test.ts` +5 pins → 14 in the file), not a render-site convention. The lone-image option constants joined the seam suite as pins: `COVER_CAROUSEL` (finite true — the single image cannot loop — on the shared dist defaults) and `COVER_RENDER` (both arrows render null — the library's named hide). `PhotoViewer` gained the optional `variant` prop (`'mosaic' | 'cover'`, default `'mosaic'` — the wall call site byte-identical): the cover branch shrinks plugins to Zoom only (no Counter, no Captions), feeds the cover constants, and keeps the shared controller (Esc/backdrop/×, pull-close off) and labels; the live-index track and the hand-added focus restore ride for both variants unchanged. The affordance lives in the detail's composition, not the shared `CoverPanel` (its catalog-plates / featured-plates / branch-card surfaces stay byte-identical and non-zoom): a real button wraps the plate ONLY when covered — the button is the positioning box (CoverPanel's absolute classes anchor to it, the img box byte-identical), `cursor-zoom-in`, the inset brand-focus ring (the grid's overflow-hidden would clip an outset one), accessible name = the package name. Same-URL cache win: the slide src IS the coverImageUrl the panel rendered. Landing floor unchanged in files (18) / 143→148 tests; api/api-client/admin untouched.
```

- [ ] **Step 2: Update the AGENTS.md landing floor sentence.** Current tail (for exact match):

```markdown
+ #339's nine viewer seam pins — the alt law, the captions law, the mosaic option vocabulary — 18 files / 143 tests).
```

Replace with:

```markdown
+ #339's nine viewer seam pins — the alt law, the captions law, the mosaic option vocabulary; + #340's five cover-variant seam pins — the single-slide mapping, the null-cover emptiness, the lone-image constants — 18 files / 148 tests).
```

- [ ] **Step 3: The scope censuses (gitignored build artifacts excluded — the #337 lesson; `coverage` per the #339 ruling).**

```bash
grep -rn "cursor-zoom-in" apps/ packages/ --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage
```

Expected: exactly TWO lines — the wall button (`mosaic-photo-grid.tsx`) and the detail cover button (`package-detail.tsx`). Any third site is a scope violation.

```bash
grep -rn "variant='cover'" apps/ packages/ --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage
```

Expected: exactly ONE line — the detail's `PhotoViewer` instance.

```bash
grep -rn "yet-another-react-lightbox" apps/ packages/ --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage
```

Expected: exactly the same four files as the #339 census (package.json, viewer.ts, photo-viewer.tsx, styles.css).

- [ ] **Step 4: The final repo gate.** `pnpm check` from the worktree root. **Shared-DB note:** if the sibling `service-covers` cycle is live (check `ps aux | grep vitest` for foreign worktree processes first), the api leg MUST NOT run against 5433 — isolate per the #339 lesson: `docker run -d --name sevendays-gate-db-54XX -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sevendays_test -p 54XX:5432 postgres:17` (a free port), run `TEST_DATABASE_URL='postgres://postgres:postgres@localhost:54XX/sevendays_test' pnpm check` (the harness's global-setup migrates the empty DB), `docker rm -f sevendays-gate-db-54XX` after. Never race 5433.

Expected: green — landing floor exactly 18 files / 148 tests; api / api-client / admin floors unmoved (api 482+3 IF the sibling's #331 branch has merged to main by then — record what actually runs; the floors this branch must hold are the MAIN-tree floors, not the sibling branch's).

- [ ] **Step 5: graphify.**

```bash
graphify update .
```

Expected: the graph picks up the cover seam additions; commit whatever it touches.

- [ ] **Step 6: Commit the docs + graph.**

```bash
git add docs/progress.md AGENTS.md graphify-out/
git commit -m "docs: #340 — the cover-zoom record; landing floor 18/148"
```

(If graphify's diff is large, split it into its own `chore(graphify): post-#340 graph update` commit — house precedent.)

- [ ] **Step 7: Controller close-out (outside the implementer's brief).** Whole-branch review — NOTE: the whole-branch diff now spans BOTH tickets' commits since the shared branch carries them; scope the review package from the #339 merge base (origin/main at reset time) to HEAD, with graphify-out excluded. PR to main (referencing `Closes #340`), CI green, then the v1 pick/ledger per `docs/agents/v1-picks.md` (main-only). #341 unblocks on this merge — the owner-reaction pass covers all four surfaces. Nothing here is "done done" until #341's owner reaction records.

---

## Self-review record (run 2026-11-21, before commit)

- **Spec coverage (§3.2 + D4 + the cover side of D5):** the single-slide mapping ✧ Task 1 (src/alt/never-title/never-description + the null-cover `[]` law); the lone-image constants ✧ Task 1 (finite + render-hide pins); the variant rides the same composition ✧ Task 2 (optional prop, default mosaic, shared controller/labels, both hand-added laws ride unchanged); the detail affordance only-when-covered ✧ Task 2 Block C (the conditional button; the placeholder branch verbatim); Esc/backdrop/× + focus restore ✧ inherited (MOSAIC_CONTROLLER + the landed useRestoreEffect); zoom gestures ✧ the Zoom plugin stays in both variants; no Counter ✧ the plugins branch; the other surfaces inert ✧ the fences + Task 2 Step 4's census. AC-by-AC (the ticket's 4): covered-zoom behavior ✧ Tasks 1–2 (runtime leg = #341 by rule); placeholder inert ✧ Task 1's mapping law + the conditional; cover seam pins + constants ✧ Task 1; `pnpm check` ✧ Task 3 Step 4.
- **Placeholder scan:** none — every string, class, constant, JSX block, and command is written out.
- **Type/signature consistency:** `coverSlides` / `COVER_CAROUSEL` / `COVER_RENDER` (Task 1) consumed verbatim in Task 2's imports + Lightbox props; the `variant` prop is consumed only in Task 2's own branch + the detail's `variant='cover'`; the floor chain 18/143 → 18/148 recounted from the Task 1 test blocks (3 coverSlides its + 2 constants its = 5); the Task 2 before-blocks were read byte-exact from the live files at HEAD `3178d85` (photo-viewer.tsx read in full post-biome; package-detail blocks quoted from the live file).
- **Fenced:** #341's owner gate, the other three CoverPanel surfaces, `cover-panel.tsx` itself, packages/ui, the api, e2e/visual baselines, v1-picks work — all named in Scope fences with their owners.
- **The handoff law:** this file is UNTRACKED by design — it survives the post-#339 `reset --hard` and is committed at #340's SDD setup (the plan's worktree section, step 3).

<!-- PLAN-END: no content after this line -->
