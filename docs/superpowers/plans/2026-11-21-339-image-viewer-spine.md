# Plan: #339, Image viewer: viewer spine, the library, the seam, and the mosaic walls live

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking any photograph on the home gallery wall or the /about portfolio wall opens the landing's image viewer, yet-another-react-lightbox v3 with the ruled Standard set (prev/next + keyboard + swipe, counter, caption line where the surface's law carries it, double-click/pinch zoom + pan, Esc/backdrop/× close), correct in both themes.

**Architecture:** One pure lib seam (`src/lib/viewer.ts`) carries the slide mapping (the alt law, the captions law) and the pinned option vocabulary (controller/carousel/labels constants); one `PhotoViewer` composition (`src/components/photo-viewer.tsx`) owns the Lightbox plus the two laws the library does not carry (the live-index track, the hand-added focus restore); `MosaicPhotoGrid` gains a real `<button>` wrapping each img so both walls light up with unchanged call sites. The three library stylesheets land in `styles.css` by the @fontsource idiom, followed by one token override block (the near-black stage is the library default in both themes, the recorded token exception; the token-native parts are the mono caption register and the brand focus ring).

**Tech Stack:** TanStack Start + React 19 + Tailwind v4 (landing), `yet-another-react-lightbox` 3.33.1 (NEW, the only new dependency, landing app-local per ADR-0017), vitest plain-node lib-seam tests.

**Spec:** [GitHub issue #339](https://github.com/jeius/sevendays/issues/339), authoritatively settled by its parent spec, [issue #336](https://github.com/jeius/sevendays/issues/336), repo copy `docs/specs/2026-11-19-landing-image-viewer-spec.md` (D1 library/posture, D2 placement, D3 mosaic composition, D5 seam, D6 configuration, D7 a11y, D8 theming). The rendered-variants gate is the sibling ticket #341 (teaser pass + owner reaction), NOT this plan. Library usage follows the user-level `yet-another-react-lightbox` skill (v3.x).

## The spec's shared worktree (all three tickets, one home)

This branch, `image-viewer`, checked out at `.worktrees/image-viewer`, based on main `6fee36d`, is the **spec's** worktree, not just #339's. The handoff flow:

- **#339 (this plan)** executes here; its PR squash-merges to main.
- **#340 (cover zoom)** reuses this worktree: after #339's merge, run `git fetch origin && git reset --hard origin/main` here (the squash-merge discipline, never merge main into the branch), then write #340's plan and execute in place.
- **#341 (owner gate)** is zero-code, the controller-run teaser pass (the #338 precedent); it walks the deployed teaser, not this worktree.
- Worktree setup already done (2026-11-21): `pnpm install`, `pnpm build:packages` (the `@sevendays/config` dist is built, never committed), `apps/landing/.env.local` copied from the main checkout (gitignored; tests need nothing, only a dev boot does), landing baseline green **17 files / 134 tests**.

**Controller pre-flight (2026-11-21, base 6fee36d):** every anchor below was read and verified today, `mosaic-photo-grid.tsx` (43 lines, quoted in full in Task 3), the two call sites (`home-image-led.tsx:18` import + `:213` render; `about.tsx:8` import + `:128` render, both stay byte-identical), the two-consumer census (`grep -rn MosaicPhotoGrid apps/landing/src --include='*.tsx' | grep -v mosaic-photo-grid.tsx` returns exactly those two files), `styles.css:1-7` (the @import prologue), `packages/ui/src/tokens.css:86` (`--font-mono`) and `:42` (`--brand-focus-ring`), and the landing baseline was live-run in this worktree (17/134). Library probes (all against the shipped `3.33.1` dist on unpkg): registry latest is exactly **3.33.1**; the package `exports` map carries `./styles.css`, `./plugins/captions.css`, `./plugins/counter.css`, `./plugins/captions`, `./plugins/counter`, `./plugins/zoom`; the plugins default-export (`export { Captions as default }` / `export { Zoom as default }`); `Slide` and the settings types are exported from the root; `Labels` keys are `Previous?/Next?/Close?/Slide?`; the default stage backdrop is `#000` (`--yarl__container_background_color, var(--yarl__color_backdrop, #000)`); `.yarl__button { outline: none }` with `:focus-visible` a **color change only**; the shipped stylesheet carries `@media(prefers-reduced-motion){ … transition:unset; animation:unset }` natively; and the decisive focus fact, the library's focus-on-open registers as a **passive** effect (`React.useEffect(focusOnMount, …)` in the Controller), so every `useLayoutEffect` in the host outruns it (Task 2's capture pattern rests on this).

## Scope fences

**In scope (landing only):** the dependency; `src/lib/viewer.ts` + `src/lib/viewer.test.ts`; `src/components/photo-viewer.tsx`; the `mosaic-photo-grid.tsx` rewrite of the figure's interior; the `styles.css` imports + override block; `docs/progress.md`; the AGENTS.md landing floor sentence; graphify.

**NOT here (siblings / out of scope):**

- **#340, the cover variant.** The `variant` prop on `PhotoViewer`, the cover-slide seam (`{ src: pkg.coverImageUrl, alt: pkg.name }`), the lone-image option constants (`finite`, the `render.buttonPrev/buttonNext → null` hide, no-Counter), and every `package-detail.tsx`/`CoverPanel` touch. This plan's `PhotoViewer` ships mosaic-shaped with NO `variant` prop, #340 adds it. Landing the cover constants or the variant switch here would silently land #340's seam (its own AC pins those constants).
- **#341, the rendered-variants pass.** The two flagged owner reactions (the D8 chrome register, the D3 caption interpretation) live there; this plan implements both decisions as spec'd and stops.
- **The other `CoverPanel` surfaces** (packages plates, home featured strip, branch strip), stay non-zoom (spec Out of Scope).
- **`packages/ui`, the api, every other workspace**, zero changes; no other workspace may depend on the library (AC).
- **No lazy gate**, static import (D1); the named escalation (lazy-mount on open state) is decided at #341 if the chunk cost proves real, not here.
- **No image-dimension / `srcSet` work**, the same-URL cache win is the accepted posture (D5).
- **No e2e/visual changes**, the button wraps the img without touching its box, so the ADR-0022 baselines stay pixel-identical; those suites never join `pnpm check`.
- **No ADR**, the library, posture, and configuration are spec-ruled (#336 + the #328 pick); nothing architectural is decided in this plan.
- **No v1 pick/ledger work in this branch**, post-merge, main-only per `docs/agents/v1-picks.md`.

## Owner rulings (settled at charting + the #328 pick, recorded in the spec)

- **The library is yet-another-react-lightbox v3**, over PhotoSwipe, the hand-rolled dialog, react-photo-view, lightgallery, Fancybox (the #325 shortlist; the pick resolution on #328).
- **The Standard set, nothing more**, no thumbnail strip, no fullscreen chrome; the unruled plugins are never imported.
- **The immersive near-black stage in both themes**, the deliberate, recorded exception to token-riding (D8).
- **Captions follow the surface's law**, about shows when present, home never (D3's flagged interpretation; the owner reacts at #341).

## Global Constraints

- **Verbatim values this plan introduces (use exactly; do not paraphrase):**
  - The dependency line: `yet-another-react-lightbox` installed with `pnpm --filter @sevendays/landing add yet-another-react-lightbox@^3.33.1` (registry latest is exactly 3.33.1, the range resolves to it today; the resolved version MUST be `3.33.1`).
  - The alt fallback: `Studio gallery photograph`, exported as `GALLERY_ALT_FALLBACK` from the seam and used by BOTH the grid's img and the slide mapping (one alt law, D5).
  - The labels: `Previous: 'Previous photo'`, `Next: 'Next photo'`, `Close: 'Close photo viewer'`.
  - The option constants: `MOSAIC_CONTROLLER` / `MOSAIC_CAROUSEL` / `VIEWER_LABELS` exactly as written in Task 1 (backdrop-close ON is the explicit part, it defaults `false` upstream; both pull-closes pinned `false`).
  - The wall button's class vocabulary: `block h-full w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring focus-visible:ring-inset` (the inset ring is load-bearing, the figure's `overflow-hidden` would clip an outset ring).
  - The styles.css additions: the three `@import` lines and the override block exactly as written in Task 4 (CSS `@import`s use double quotes, matching the file's prologue).
  - Every before/after block in the tasks is written out in full, land it verbatim; `pnpm fix` (biome) is the arbiter if any block drifts.
- **Per-task gates:** `pnpm --filter @sevendays/landing test` AND `pnpm --filter @sevendays/landing typecheck`, both green before each task's commit (Task 4 adds the build gate). Final gate: `pnpm check` green at the repo root. Do not commit code that fails it for the packages/apps touched.
- **Floors:** landing starts at 17 files / 134 tests (live-confirmed in this worktree 2026-11-21). Task 1 adds exactly ONE file with exactly NINE tests → **18 files / 143 tests** from Task 1 on; Tasks 2–5 add zero tests, the count may not move again. api / api-client / admin untouched, their floors may not move.
- **No component/DOM tests** (the spec's Testing Decisions + the house rule): landing vitest stays lib-seam-only; open/zoom/navigate/close behavior is #341's rendered-variants gate.
- On a fresh clone only, run `pnpm install` then `pnpm build:packages` first (AGENTS.md), already done in this worktree.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits follow the repo's commit-work convention, each referencing #339: `feat(landing): …` for Tasks 1–4, `docs:` + `chore(graphify):` for Task 5.
- **UI-bearing work (AGENTS.md): execution loads the installed UI/UX skill set, `ui-ux-pro-max` + `prototype`**, and consults the user-level `yet-another-react-lightbox` skill for library usage. The #94/#111 rendered-variants round is #341's teaser pass, not this plan's; the audit below gates the review instead.

## UI skill audit (`ui-ux-pro-max`, run against this plan 2026-11-21)

The ux-domain searches ("keyboard focus modal escape", "image lightbox zoom gesture") returned the Focus States guideline as the verified top match, plus the gesture/image/scrim rule families. The plan passes them:

- **Focus States (High): "keyboard focus, including controls inside a modal, needs a visible indicator / don't remove focus outline without replacement."** Both ends comply: the wall's trigger button keeps the house `focus-visible:ring-3 ring-brand-focus-ring` treatment (inset, because the figure clips), and the viewer chrome gains `outline: 3px solid var(--brand-focus-ring)` on `:focus-visible`, the library ships a color change ALONE (verified in its stylesheet), which would not satisfy the guideline; the override block is the replacement the guideline demands, not decoration.
- **Gesture conflicts (Mobile):** swipe navigation lives INSIDE the lightbox overlay, never on main content, the wall keeps vertical scroll as the primary gesture; every gesture (swipe, pinch, double-click) has its button/keyboard alternative (D7's law), so no swipe-only path exists.
- **Image optimization:** `srcSet`/dimensions are deliberately absent, the same-URL cache win (D5's accepted trade-off; dimension work is spec-out-of-scope). The wall's `loading='lazy'` tiles stay.
- **Scrim/backdrop legibility:** the stage is the library's `#000` default with its white-tuned chrome (`hsla(0,0%,100%,.8)`) in BOTH themes, the recorded token exception; the caption ink is pinned to the same 0.8 white family so all viewer text is measured against the real (constant) backdrop, not the page theme.
- **Touch targets:** the chrome buttons carry the library's padding/icon defaults (8px padding + 32px icon ⇒ ≥40px targets); the wall tiles themselves are large targets; nothing shrinks.
- **Reduced motion:** the library's native `@media(prefers-reduced-motion)` rule (verified in the shipped stylesheet) unsets the portal fade, slide transitions, and spinner; the wall's existing Reveal already honors it.
- **Anti-patterns:** no emoji-as-icon (the chrome is the library's SVG set), no layout-shifting press states (color/filter only), the immersive dark stage is the owner-ruled recorded exception, an override of the skill's token-riding default, recorded per the #111 discipline.

No trips. The two flagged decisions the skill cannot settle (the D8 chrome register, the D3 caption interpretation) are exactly #341's owner-reaction items, by design, not omission.

---

## Task 1, The library install + the slide-mapping seam (TDD)

**Files:**
- Modify: `apps/landing/package.json` + root `pnpm-lock.yaml` (via pnpm add, never hand-edited)
- Create: `apps/landing/src/lib/viewer.ts`
- Test: `apps/landing/src/lib/viewer.test.ts`

**Interfaces:**
- Consumes: `PublicGalleryPhoto` from `@sevendays/types` (`{ id, photoUrl, title: string | null, caption: string | null, categoryId }`, `packages/types/src/gallery.ts:99-115`).
- Produces (Tasks 2–3 consume these; #340 will extend): `GALLERY_ALT_FALLBACK: string`; `photoSlides(photos: PublicGalleryPhoto[], opts?: { captions?: boolean }): Slide[]`; `MOSAIC_CONTROLLER: DeepPartialValue<ControllerSettings, 'ref'>`; `MOSAIC_CAROUSEL: DeepPartialValue<CarouselSettings, 'imageProps'>`; `VIEWER_LABELS: Labels`, all five type names are type-only root imports from `yet-another-react-lightbox` (erased at runtime, the plain-node vitest graph never loads the library). **Execution amendment (controller, 2026-11-21; two rounds):** `ControllerSettings`/`CarouselSettings` are the library's internal all-required resolved types (verified in the installed 3.33.1 `dist/types.d.ts`, 12 and 6 required fields; the deprecated `ref`/`focus`/`touchAction`/`aria` + `imageProps` the pinned literals never set), so the constants annotate with the library's OWN public branch shapes, `DeepPartialValue<ControllerSettings, 'ref'>` and `DeepPartialValue<CarouselSettings, 'imageProps'>`, both root-exported, with the pinned VALUES byte-unchanged. Round 1 (Task 1) ruled plain `DeepPartial<…>`; it compiled standalone but was falsified at Task 2's consumption site: `LightboxExternalProps` (`dist/types.d.ts:60`) deep-partializes `carousel`/`controller` while its third argument KEEPS `imageProps`/`ref` full (partializing them breaks assignability, `AriaRole`'s `string & {}` member and `RefObject.current` optionality), so the unexcluded `DeepPartial<…>` rejects at the props (TS2322 ×2). Round 2 re-ruled to the branch shapes the library itself yields. The seam also carries `import type {} from 'yet-another-react-lightbox/plugins/captions'`, a type-only import (erased at runtime) that activates the Captions plugin's slide-`description` module augmentation (on `GenericSlide` in 3.33.1) so the captions law typechecks in the plain-node graph without loading the plugin.

- [ ] **Step 1: Install the library (landing app-local).**

```bash
pnpm --filter @sevendays/landing add yet-another-react-lightbox@^3.33.1
```

Verify: `grep '"yet-another-react-lightbox"' apps/landing/package.json` shows `"yet-another-react-lightbox": "^3.33.1"` under `dependencies`, and `node -p "require('./apps/landing/node_modules/yet-another-react-lightbox/package.json').version"` prints `3.33.1` (the direct manifest read, the package's `exports` map does not expose `./package.json`, so `require('yet-another-react-lightbox/package.json')` errors `ERR_PACKAGE_PATH_NOT_EXPORTED`). No other workspace's package.json mentions the package (Task 5's census proves it repo-wide).

- [ ] **Step 2: Write the failing seam suite, `apps/landing/src/lib/viewer.test.ts` (the whole file).**

```ts
import type { PublicGalleryPhoto } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import {
  GALLERY_ALT_FALLBACK,
  MOSAIC_CAROUSEL,
  MOSAIC_CONTROLLER,
  VIEWER_LABELS,
  photoSlides,
} from './viewer';

let n = 0;
function photo(overrides: Partial<PublicGalleryPhoto> = {}): PublicGalleryPhoto {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    photoUrl: `https://pub-test.r2.dev/gallery/${String(n).padStart(12, '0')}.jpg`,
    title: `Photo ${n}`,
    caption: null,
    categoryId: '00000000-0000-4000-8000-000000000001',
    ...overrides,
  };
}

describe('photoSlides', () => {
  it('maps every photo to one slide, payload order and count preserved, src = photoUrl', () => {
    const photos = [photo(), photo(), photo()];
    const slides = photoSlides(photos);
    expect(slides).toHaveLength(3);
    expect(slides.map((s) => s.src)).toEqual(photos.map((p) => p.photoUrl));
  });

  it("title → alt verbatim (the wall's alt law); a null title falls back to 'Studio gallery photograph'", () => {
    const slides = photoSlides([photo({ title: 'The last frame' }), photo({ title: null })]);
    expect(slides[0]?.alt).toBe('The last frame');
    expect(slides[1]?.alt).toBe(GALLERY_ALT_FALLBACK);
    expect(GALLERY_ALT_FALLBACK).toBe('Studio gallery photograph');
  });

  it('empty photos → empty slides', () => {
    expect(photoSlides([])).toEqual([]);
  });

  it('captions: true + a non-null caption → description carries it', () => {
    const slides = photoSlides([photo({ caption: 'The first look, 2026' })], { captions: true });
    expect(slides[0]?.description).toBe('The first look, 2026');
  });

  it('captions: true + a null caption → description absent (the plugin renders no line)', () => {
    const slides = photoSlides([photo({ caption: null })], { captions: true });
    expect('description' in (slides[0] ?? {})).toBe(false);
  });

  it('captions: false → description never set, even when the photo carries one (the home law)', () => {
    const slides = photoSlides([photo({ caption: 'The first look, 2026' })]);
    expect('description' in (slides[0] ?? {})).toBe(false);
  });
});

describe('the pinned option vocabulary (#336 D5/D6)', () => {
  it('MOSAIC_CONTROLLER: backdrop-close ON (upstream defaults false, set explicitly), Esc ON, both pull-closes OFF', () => {
    expect(MOSAIC_CONTROLLER).toEqual({
      closeOnEscape: true,
      closeOnBackdropClick: true,
      closeOnPullUp: false,
      closeOnPullDown: false,
    });
  });

  it('MOSAIC_CAROUSEL: the wall loops (finite false) on the library defaults, preload 2, 16px padding, 30% spacing, contain', () => {
    expect(MOSAIC_CAROUSEL).toEqual({
      finite: false,
      preload: 2,
      padding: '16px',
      spacing: '30%',
      imageFit: 'contain',
    });
  });

  it('VIEWER_LABELS: the three chrome strings', () => {
    expect(VIEWER_LABELS).toEqual({
      Previous: 'Previous photo',
      Next: 'Next photo',
      Close: 'Close photo viewer',
    });
  });
});
```

- [ ] **Step 3: Run it and verify it FAILS.**

```bash
pnpm --filter @sevendays/landing exec vitest run src/lib/viewer.test.ts
```

Expected: FAIL, the not-yet-written module's import unresolvable (this stack emits it as `Cannot find module './viewer'`; any resolution error naming `./viewer` is the expected red).

- [ ] **Step 4: Write the seam, `apps/landing/src/lib/viewer.ts` (the whole file).**

```ts
import type { PublicGalleryPhoto } from '@sevendays/types';
import type { CarouselSettings, ControllerSettings, DeepPartialValue, Labels, Slide } from 'yet-another-react-lightbox';
// Type-only: loads the Captions plugin's SlideImage.description module
// augmentation into the type graph (erased at runtime, the plain-node
// vitest graph never loads the plugin; the captions law typechecks without it).
import type {} from 'yet-another-react-lightbox/plugins/captions';

// The landing image viewer's pure seam (#336 D5): the slide mapping and the
// pinned option vocabulary, in the gallery-tabs.ts lib-seam shape. The wall
// and the viewer share ONE alt law, the fallback constant below is the
// single source both the grid's img and the slides map through.
export const GALLERY_ALT_FALLBACK = 'Studio gallery photograph';

// The cache win (D5, pinned): the slide src is the SAME photoUrl the wall
// already rendered (photoUrl has no variants on the public wire), so the
// first viewer open is served from the browser cache, no second download
// of a "full-size" variant that doesn't exist. The accepted trade-off: the
// public gallery payload carries no image dimensions, so the library
// discovers them on load (its loading placeholder covers the gap).

export function photoSlides(
  photos: PublicGalleryPhoto[],
  { captions = false }: { captions?: boolean } = {}
): Slide[] {
  return photos.map((photo) => ({
    src: photo.photoUrl,
    alt: photo.title ?? GALLERY_ALT_FALLBACK,
    // D3: the caption follows the surface's law, mapped ONLY where the
    // surface asks AND the photo carries one; the key stays absent
    // otherwise (the plugin renders the line only when a slide has one).
    ...(captions && photo.caption ? { description: photo.caption } : {}),
  }));
}

// The mosaic variant's pinned option vocabulary (D6). #340's cover variant
// adds its own constants beside these; nothing here is a variant switch.
export const MOSAIC_CONTROLLER: DeepPartialValue<ControllerSettings, 'ref'> = {
  closeOnEscape: true, // the library default, set explicit to name the gesture
  closeOnBackdropClick: true, // ruled ON, defaults FALSE upstream (D6)
  closeOnPullUp: false, // pull-close stays out of the ruled gesture set
  closeOnPullDown: false,
};

export const MOSAIC_CAROUSEL: DeepPartialValue<CarouselSettings, 'imageProps'> = {
  finite: false, // the wall loops
  preload: 2,
  padding: '16px',
  spacing: '30%',
  imageFit: 'contain',
};

export const VIEWER_LABELS: Labels = {
  Previous: 'Previous photo',
  Next: 'Next photo',
  Close: 'Close photo viewer',
};
```

- [ ] **Step 5: Run the suite file and verify it PASSES (9 tests).**

```bash
pnpm --filter @sevendays/landing exec vitest run src/lib/viewer.test.ts
```

Expected: PASS, 1 file, 9 tests.

- [ ] **Step 6: Full landing gates.**

```bash
pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing typecheck
```

Expected: `Test Files  18 passed (18)` / `Tests  143 passed (143)`; typecheck clean.

- [ ] **Step 7: Commit.**

```bash
git add apps/landing/package.json pnpm-lock.yaml apps/landing/src/lib/viewer.ts apps/landing/src/lib/viewer.test.ts
git commit -m "feat(landing): image viewer, YARL app-local + the slide-mapping seam (#339)"
```

---

## Task 2, The PhotoViewer composition (the two hand-added laws + the mosaic wiring)

**Files:**
- Create: `apps/landing/src/components/photo-viewer.tsx`

**Interfaces:**
- Consumes: `MOSAIC_CAROUSEL`, `MOSAIC_CONTROLLER`, `VIEWER_LABELS` from `../lib/viewer` (Task 1, exact names above).
- Produces (Task 3 consumes; #340 will widen with a `variant` prop): `PhotoViewer({ slides, index, onClose })`, `slides: Slide[]` (a STABLE reference, memoized at the surface), `index: number | null` (`null` = closed; a number opens AT that slide), `onClose: () => void`.

No unit test in this task, by rule, not omission: the house keeps landing vitest to lib seams (the spec's Testing Decisions), and the open/navigate/close/focus behavior is #341's rendered-variants gate. This task's gate is typecheck + the unchanged floor + lint.

- [ ] **Step 1: Write `apps/landing/src/components/photo-viewer.tsx` (the whole file).**

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Slide } from 'yet-another-react-lightbox';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import { MOSAIC_CAROUSEL, MOSAIC_CONTROLLER, VIEWER_LABELS } from '../lib/viewer';

// The viewer composition (#336 D2/D6/D7): one Lightbox over the seam's
// mosaic vocabulary. The two laws the library does NOT carry live here:
// the live-index track (a re-render while open must re-sync to the CURRENT
// slide, never snap the carousel back to the opening photo) and the
// focus-restore (the library moves focus IN on open but never back).
// #340 widens this with the lone-image cover variant; nothing here branches.

// Focus-restore capture must run BEFORE the library's focus-on-open,
// which registers as a PASSIVE effect in the shipped dist (verified
// 3.33.1: `React.useEffect(focusOnMount, …)` in the Controller), so every
// layout effect outruns it. SSR renders the closed viewer, where
// useLayoutEffect would warn, the isomorphic swap keeps the server on
// the passive hook (a no-op there: `index` is null before hydration).
const useRestoreEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function PhotoViewer({
  slides,
  index,
  onClose,
}: {
  /** The mapped slides (the lib seam), pass a STABLE reference (memoized at the surface). */
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
  // focus-on-open runs), restore it on the close edge, the only focus law
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

- [ ] **Step 2: Typecheck.**

```bash
pnpm --filter @sevendays/landing typecheck
```

Expected: clean (this is the first file that feeds the constants into the library's prop types, the compile proof the settings annotations were checked against).

- [ ] **Step 3: Suite floor holds (the component is not yet consumed, zero runtime effect).**

```bash
pnpm --filter @sevendays/landing test
```

Expected: `Test Files  18 passed (18)` / `Tests  143 passed (143)`, unchanged from Task 1.

- [ ] **Step 4: Lint + format the file.**

```bash
pnpm --filter @sevendays/landing exec biome check --write src/components/photo-viewer.tsx
```

Expected: no remaining diagnostics (import order and quote style settle here; `pnpm fix` is the arbiter).

- [ ] **Step 5: Commit.**

```bash
git add apps/landing/src/components/photo-viewer.tsx
git commit -m "feat(landing): the PhotoViewer composition, live index + focus restore (#339)"
```

---

## Task 3, The mosaic wall gains the open affordance (both surfaces light up)

**Files:**
- Modify: `apps/landing/src/components/mosaic-photo-grid.tsx` (the whole file is 43 lines today; the full before/after is below)
- Verify-only: `apps/landing/src/components/home-image-led.tsx` (`:18` import, `:213` `<MosaicPhotoGrid photos={gallery.photos} />`) and `apps/landing/src/routes/about.tsx` (`:8` import, `:128` `<MosaicPhotoGrid photos={photos} captions />`), **byte-identical, untouched** (D2: both surfaces gain the viewer free with unchanged call sites).

**Interfaces:**
- Consumes: `PhotoViewer` (Task 2), `photoSlides` + `GALLERY_ALT_FALLBACK` (Task 1), `spanFor` (existing), `Reveal` (existing).
- Produces: nothing downstream, the wall's public props (`photos`, `captions`) are unchanged; the two call sites compile untouched.

- [ ] **Step 1: Replace the file's contents, current file verbatim (for exact match):**

```tsx
import type { PublicGalleryPhoto } from '@sevendays/types';
import { cn } from 'cn';
import { spanFor } from '../lib/mosaic';
import { Reveal } from './reveal';

// The mosaic photo wall (#164 Round 2, owner-ruled): fixed row heights, the
// deterministic 2×2/2×1 span rhythm (Task 1's seam), dense packing, and the
// shared viewport reveal staggered per column. Shared by the home gallery
// strip now and (#224) the about portfolio, the two surfaces speak one
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

- [ ] **Step 2: …with (the new file, verbatim):**

```tsx
import type { PublicGalleryPhoto } from '@sevendays/types';
import { cn } from 'cn';
import { useMemo, useState } from 'react';
import { spanFor } from '../lib/mosaic';
import { GALLERY_ALT_FALLBACK, photoSlides } from '../lib/viewer';
import { PhotoViewer } from './photo-viewer';
import { Reveal } from './reveal';

// The mosaic photo wall (#164 Round 2, owner-ruled): fixed row heights, the
// deterministic 2×2/2×1 span rhythm (Task 1's seam), dense packing, and the
// shared viewport reveal staggered per column. Shared by the home gallery
// strip now and (#224) the about portfolio, the two surfaces speak one
// wall. Home ruled title-captions OFF; about renders them when present.
// The image viewer (#336) lives here: each photo's button opens the shared
// PhotoViewer at that photo, both surfaces, unchanged call sites. The
// button's accessible name is the wrapped img's alt (the seam's one alt
// law); the figcaption stays OUTSIDE the button (phrasing-only content).
const ROW_HEIGHTS = 'auto-rows-[9rem] md:auto-rows-[11rem]';

export function MosaicPhotoGrid({
  photos,
  captions = false,
}: {
  photos: PublicGalleryPhoto[];
  /** Captions render only when a photo carries one AND the surface asks. */
  captions?: boolean;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  // An unstable slides reference would re-sync the carousel while open
  // (the library's documented pitfall), memoize over the payload.
  const slides = useMemo(() => photoSlides(photos, { captions }), [photos, captions]);

  return (
    <div className={cn('mt-8 grid grid-flow-dense grid-cols-2 gap-4 md:grid-cols-4', ROW_HEIGHTS)}>
      {photos.map((photo, i) => (
        <Reveal key={photo.id} delay={(i % 4) * 90} className={spanFor(i)}>
          <figure className='border-line-soft bg-card h-full overflow-hidden rounded-xl border shadow-sm'>
            <button
              type='button'
              onClick={() => setViewerIndex(i)}
              className='block h-full w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring focus-visible:ring-inset'
            >
              <img
                src={photo.photoUrl}
                alt={photo.title ?? GALLERY_ALT_FALLBACK}
                className='h-full w-full object-cover'
                loading='lazy'
              />
            </button>
            {captions && photo.caption ? (
              <figcaption className='text-muted-foreground px-3 pb-2 font-mono text-[11px]'>
                {photo.caption}
              </figcaption>
            ) : null}
          </figure>
        </Reveal>
      ))}
      <PhotoViewer slides={slides} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </div>
  );
}
```

Landing law (why each piece is shaped this way): the `Reveal` stagger, span rhythm, row heights, and both empty-state laws are untouched, the button replaces the bare img inside the existing figure and carries `h-full w-full` so the img's box is byte-identical (the ADR-0022 visual baselines stay pixel-identical); the focus ring is INSET because the figure's `overflow-hidden` would clip an outset ring; `cursor-zoom-in` is the ruled affordance; the closed `PhotoViewer` renders null (no grid cell is created) and its open portal mounts on `document.body`, never in the grid.

- [ ] **Step 3: Prove the call sites unchanged (the two-consumer census).**

```bash
grep -rn "MosaicPhotoGrid" apps/landing/src --include='*.tsx' | grep -v 'mosaic-photo-grid.tsx'
```

Expected: exactly four lines, the import + render in `home-image-led.tsx` (`:18`, `:213`) and the import + render in `about.tsx` (`:8`, `:128`), byte-identical to the pre-flight (the wall is still the only composition both surfaces speak).

- [ ] **Step 4: Gates.**

```bash
pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/components/mosaic-photo-grid.tsx
```

Expected: 18 files / 143 tests unchanged; typecheck clean; no remaining diagnostics.

- [ ] **Step 5: Commit.**

```bash
git add apps/landing/src/components/mosaic-photo-grid.tsx
git commit -m "feat(landing): both mosaic walls open the viewer, the button affordance (#339)"
```

---

## Task 4, The chrome: three stylesheets + the token override block

**Files:**
- Modify: `apps/landing/src/styles.css` (three `@import` lines join the prologue at `:7`; one override block appends at the file's end)

**Interfaces:**
- Consumes: the library's exported stylesheet subpaths (`yet-another-react-lightbox/styles.css`, `…/plugins/captions.css`, `…/plugins/counter.css`, all present in the package's `exports` map, verified in the pre-flight) and its slot classes/variables (`.yarl__root`, `.yarl__slide_description`, `.yarl__button`, verified in the shipped 3.33.1 stylesheets).
- Produces: nothing downstream, pure presentation; #341's pass verifies both themes.

- [ ] **Step 1: Extend the @import prologue.** The file's first seven lines today (for exact match):

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@sevendays/ui/tokens.css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/figtree";
@import "@fontsource-variable/roboto-slab";
@import "@fontsource-variable/geist-mono";
```

Add three lines directly after `@import "@fontsource-variable/geist-mono";` (the @fontsource idiom, D8):

```css
@import "yet-another-react-lightbox/styles.css";
@import "yet-another-react-lightbox/plugins/captions.css";
@import "yet-another-react-lightbox/plugins/counter.css";
```

(`@import` statements must precede all other rules, the prologue placement satisfies that; the existing `@source`/`@plugin` directives that follow are unaffected.)

- [ ] **Step 2: Append the override block at the end of the file (verbatim):**

```css
/* Landing image viewer (#336 D8, built M9 #339): the immersive near-black
   stage is the library's own default backdrop (#000 via
   --yarl__color_backdrop) in BOTH themes, the recorded deliberate token
   exception (photo viewing wants a constant dark stage; a light-mode
   viewer that flashed white would be the jarring surface). The chrome ink
   (buttons, counter) keeps the library's white registers. Token-native
   parts only, below: the caption line re-registered to the wall's mono
   vocabulary, and the brand focus ring on chrome focus-visible (the
   library ships a color change alone). Dark mode needs no casing, the
   portal is a body child, so the `.dark` block's variables resolve inside
   it. */
.yarl__root {
  --yarl__slide_description_color: rgba(255, 255, 255, 0.8);
}

.yarl__slide_description {
  font-family: var(--font-mono);
  font-size: 11px;
}

.yarl__button:focus-visible {
  outline: 3px solid var(--brand-focus-ring);
  outline-offset: -3px;
}
```

Why each declaration: the description color joins the chrome's 0.8-white ink family (the wall's `text-muted-foreground` would be illegible on the #000 stage in light theme, the caption must be theme-constant like its backdrop); `var(--font-mono)` + `11px` is the wall figcaption's exact register (`font-mono text-[11px]`, tokens at `packages/ui/src/tokens.css:86`); the outline beats the library's `.yarl__button { outline: none }` on specificity (`:focus-visible` = 0,2,0 vs 0,1,0) with a negative offset so the ring reads INSIDE the button, the ui-ux-pro-max Focus States guideline's "no outline-none without replacement", satisfied on the viewer chrome.

- [ ] **Step 3: Format gate.**

```bash
pnpm --filter @sevendays/landing exec biome check --write src/styles.css
```

Expected: no remaining diagnostics.

- [ ] **Step 4: Build gate (the only gate that resolves the @import paths through vite).**

```bash
pnpm --filter @sevendays/landing build
```

Expected: build succeeds (local builds need no secrets, the CI-only-secrets rule is about deploys). A `Cannot find module … .css` failure here means a typo'd specifier, fix against the exports map, never by copying files.

- [ ] **Step 5: Commit.**

```bash
git add apps/landing/src/styles.css
git commit -m "feat(landing): the viewer chrome, three stylesheets + the token override block (#339)"
```

---

## Task 5, Docs, graphify, and the final gate

**Files:**
- Modify: `docs/progress.md` (one dated section at the tail)
- Modify: `AGENTS.md` (the landing floor sentence)
- Modify: `graphify-out/` (via `graphify update .`)

**Interfaces:**
- Consumes: everything landed in Tasks 1–4.
- Produces: the repo record; nothing code-side.

- [ ] **Step 1: Append the dated section to `docs/progress.md`** (at the file's tail, after the `## 2026-11-21, #338:` section; date the heading with the landing day). Full text:

```markdown
## 2026-11-21, #339: the image viewer spine, the library, the seam, and both mosaic walls live

The landing's photographs are no longer dead ends: every photo on the home gallery strip and the /about portfolio wall now opens the site's image viewer (spec #336's spine, #340's cover zoom and #341's owner gate follow on the same worktree). The library is yet-another-react-lightbox 3.33.1, installed landing app-local per ADR-0017 (no other workspace depends on it), carrying the ruled Standard set: open on click; Esc / backdrop / × close (backdrop-close set explicitly, it defaults false upstream; pull-close stays off); prev/next arrows + keyboard + swipe; the counter; double-click / pinch zoom + pan; captions only where the surface's law carries them (about shows when present, home never, the flagged D3 interpretation the owner reacts to at #341). The pure seam is `apps/landing/src/lib/viewer.ts`, `photoSlides` (the alt law: title → alt, the `Studio gallery photograph` fallback, one source shared with the wall's img; the captions law: description mapped only when the surface asks AND the photo carries one) plus the pinned option vocabulary (controller, carousel, labels), pinned by nine seam tests (`src/lib/viewer.test.ts`). The composition is `PhotoViewer` (`src/components/photo-viewer.tsx`): the live-index track (a re-render while open re-syncs to the CURRENT slide, never snaps back to the opening photo) and the hand-added focus restore (capture the trigger in a layout effect that outruns the library's passive focus-on-open, restore on close, the library moves focus in but never back). `MosaicPhotoGrid` gains the affordance, a real button wrapping each img (accessible name = the img's alt; cursor-zoom-in; an inset focus ring, because the figure clips an outset one), the figcaption outside the button, so both walls light up with unchanged call sites (home-image-led.tsx + about.tsx byte-identical). The chrome lands in styles.css: the three library stylesheets by the @fontsource idiom + one override block, the immersive near-black stage rides the library default backdrop in both themes (the recorded token exception), the caption line re-registered to the wall's mono vocabulary (var(--font-mono), 11px, the chrome's 0.8 white), and the brand focus ring on chrome focus-visible. prefers-reduced-motion rides the library's native media rule. Cache law: the slide src IS the wall's photoUrl, the first open is served from the browser cache. Landing floor 17→18 files / 134→143 tests; api/api-client/admin untouched.
```

- [ ] **Step 2: Update the AGENTS.md landing floor sentence.** Current tail (for exact match):

```markdown
+ #224's two redesign-II seams, the page-head composition, the about story paragraphs, 17 files / 134 tests).
```

Replace with:

```markdown
+ #224's two redesign-II seams, the page-head composition, the about story paragraphs; + #339's nine viewer seam pins, the alt law, the captions law, the mosaic option vocabulary, 18 files / 143 tests).
```

- [ ] **Step 3: The scope census (both commands exclude gitignored build artifacts, the #337 lesson; `coverage` joined by the Task 5 execution ruling, the istanbul report embeds the source lines).**

```bash
grep -rn "yet-another-react-lightbox" apps/ packages/ --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage
```

Expected: exactly four files, `apps/landing/package.json`, `apps/landing/src/lib/viewer.ts`, `apps/landing/src/components/photo-viewer.tsx`, `apps/landing/src/styles.css`. Anything else is a scope violation (the library is landing-only, AC).

```bash
grep -rn "cursor-zoom-in" apps/ packages/ --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage
```

Expected: exactly one line, the wall button in `mosaic-photo-grid.tsx` (the affordance lives in the shared wall, nowhere else).

- [ ] **Step 4: The final repo gate.**

```bash
pnpm check
```

Expected: green, lint + format + typecheck + test across the repo; landing floor exactly 18 files / 143 tests; api / api-client / admin floors unmoved.

- [ ] **Step 5: graphify.**

```bash
graphify update .
```

Expected: the graph picks up the new seam + composition; commit whatever it touches.

- [ ] **Step 6: Commit the docs + graph.**

```bash
git add docs/progress.md AGENTS.md graphify-out/
git commit -m "docs: #339, the viewer spine record; landing floor 18/143"
```

(If graphify's diff is large, split it into its own `chore(graphify): post-#339 graph update` commit, house precedent.)

- [ ] **Step 7: Controller close-out (outside the implementer's brief).** Whole-branch review, PR to main (referencing `Closes #339`), CI green, then the v1 pick/ledger per `docs/agents/v1-picks.md` (main-only). #340 unblocks on this merge, its plan lands on this same worktree after the sync reset (see the worktree section above). Nothing here is "done done" until #341's owner reaction records.

---

## Self-review record (run 2026-11-21, before commit)

- **Spec coverage:** D1 install (Task 1 Step 1), D2 placement + unchanged call sites (Tasks 2–3 + the Step 3 census), D3 the button/captions law (Task 3 + the seam's captions tests), D5 the seam + cache comment (Task 1), D6 configuration incl. the index law (Tasks 1–2), D7 a11y incl. focus restore + reduced-motion-native (Tasks 2, 4; the audit section), D8 theming (Task 4). AC-by-AC: install ✧ Task 1; seam pins ✧ Task 1 (9 tests); option constants ✧ Task 1; both-walls behavior ✧ Tasks 2–3 (behavior gate = #341 by rule); captions law ✧ Tasks 1+3; stylesheets + both themes ✧ Task 4 (both-themes gate = #341); reduced-motion ✧ native (verified in the shipped stylesheet; spot-check at #341); `pnpm check` ✧ Task 5 Step 4.
- **Placeholder scan:** none, every string, class, constant, CSS declaration, and command is written out; the two flagged-decision texts live in #341 by design.
- **Type/signature consistency:** `photoSlides` / `GALLERY_ALT_FALLBACK` / `MOSAIC_CONTROLLER` / `MOSAIC_CAROUSEL` / `VIEWER_LABELS` (Task 1) are consumed under those exact names in Tasks 2–3; `PhotoViewer({ slides, index, onClose })` (Task 2) is instantiated verbatim in Task 3; the floors (17→18 files / 134→143) and the +9 test count are recounted from the Task 1 suite block (6 `photoSlides` its + 3 vocabulary its = 9).
- **Fenced:** #340's variant/cover constants, #341's owner gate, packages/ui, the api, e2e/visual baselines, v1-picks work, all named in Scope fences with their owners.

<!-- PLAN-END: no content after this line -->
