# Research: the image-viewer (lightbox) library shortlist

- **Ticket:** jeius/sevendays#325 (map #324) — wayfinder research, AFK
- **Date:** 2026-11-19 (all freshness-sensitive numbers checked on this date)
- **Deliverable:** ranked shortlist with one recommendation for the owner to pick from (the pick itself is a separate HITL ticket)
- **Branch:** `research/image-viewer-libraries` (throwaway, never merged, no PR)

## Target surface

`apps/landing` — TanStack Start on a **Cloudflare Worker** (`@cloudflare/vite-plugin`), Vite SSR, **React 19.2**, Tailwind v4, no Node APIs at runtime (`apps/landing/package.json`). Consumers: the /about gallery grid (tabbed) and package-detail zoom. The shared design system (`packages/ui`) already ships a Base-UI-based Dialog primitive (`packages/ui/src/components/dialog.tsx` wraps `@base-ui/react@^1.8.0`), which is the zero-dependency baseline's foundation.

## Method and sources

Primary sources only: npm registry metadata (`npm view`, api.npmjs.org download counts), GitHub API (repo stats, release lists, contributors), vendor docs/license pages fetched directly, and — for SSR-safety and ARIA claims — **direct inspection of the shipped npm tarballs** (downloaded to `/tmp/lb-size`, greps over the actual `dist/` builds) plus Bundlephobia's computed min+gzip sizes. Every claim below cites its source; tarball-grep claims are labeled "verified in shipped dist".

Stale-advice check: several long-lived recommendations in older blog posts (e.g. PhotoSwipe as the default pick) are re-validated here against **current** release dates and issue health; where the picture changed (PhotoSwipe's release freeze, lightgallery's license move, Fancybox's commercial model), the current evidence wins.

## Criteria and weights

The ticket fixes the six criteria; the weights below are my judgment, argued:

| # | Criterion | Weight | Why this weight |
|---|-----------|-------:|-----------------|
| 1 | React 19 + TanStack Start SSR compatibility | **25%** | Gating: a module that touches `document`/`window` at import or during render breaks the Worker SSR build or hydration. Nothing else on the list matters if this fails. |
| 2 | Maintenance activity / stability | **20%** | The project is owner-operated across sessions; a rotting dependency becomes an emergency. Release cadence, issue health, install base, years active. |
| 3 | Accessibility | **20%** | Public marketing site; keyboard and mobile users; the repo already sets a bar by shipping Base UI's focus-trapped Dialog. Carousel/zoom a11y is subtle — hard to retrofit. |
| 4 | Bundle size | **15%** | Edge-deployed marketing site, and the lightbox can be lazy-mounted, so honest gzKB matters but is not decisive between 8 kB and 20 kB. |
| 5 | Feature fit (ruled set: double-click/pinch zoom + pan, keyboard nav, swipe, prev/next, counter, one caption line; NOT thumbnails/fullscreen/sharing) | **10%** | The ruled set is small; every viable candidate covers it. This criterion mainly rewards not shipping unused features and not hand-building the ruled ones. |
| 6 | License | **10% + gate** | Also a **gate**: a candidate that cannot be legally used on a proprietary commercial site at zero cost cannot be recommended regardless of its other scores. MIT/Apache pass; GPLv3-or-commercial and proprietary-paid fail the gate and rank below all passing candidates. |

## The candidates

### 1. yet-another-react-lightbox (YARL) — v3.33.1

- npm: https://www.npmjs.com/package/yet-another-react-lightbox · repo: https://github.com/igordanchenko/yet-another-react-lightbox · docs: https://yet-another-react-lightbox.com/
- **License:** MIT (npm `license` field; homepage footer "MIT © 2022 Igor Danchenko").
- **React 19 / SSR (criterion 1):** peer deps `react ^16.8 || ^17 || ^18 || ^19` (npm registry); homepage states "works with React 19, 18, 17, and 16.8.0+". Verified in shipped dist: **no top-level `window`/`document`/`navigator` access** — every access sits inside functions or `hasWindow()` guards; the root portal (with `role="dialog"`, `aria-modal`, `aria-label`) is created conditionally, so a closed lightbox renders nothing during SSR; the `"use client"` directive is inert under Vite SSR. Zero runtime dependencies (npm).
- **Maintenance (criterion 2):** created 2022-05; six releases in the last ~19 months — v3.31.0 (2026-04-10), v3.32.0 (2026-05-01), v3.32.1 (2026-07-08), v3.32.2 (2026-07-30), v3.33.0 (2026-10-30), v3.33.1 (2026-11-14) — repo pushed 2026-11-18, **1 open issue**, 1,337 stars, **1,073,394 weekly downloads** (GitHub API + api.npmjs.org, 2026-11-11→17). Caveat: one contributor — single-maintainer bus factor, currently extremely healthy.
- **Bundle (criterion 4):** Bundlephobia 12.2 kB gzip / 32.6 kB min for the main module (no tree-shaking): https://bundlephobia.com/package/yet-another-react-lightbox@3.33.1. The repo enforces CI budgets (`.size-limit.json` on `main`): core ≤12 kB, zoom ≤5.5 kB, counter ≤0.75 kB, captions ≤1.75 kB, `styles.css` ≤1.4 kB. Realistic cost for the ruled set (core + Zoom + Counter + Captions + one CSS file): **~15–19 kB gzip**.
- **Accessibility (criterion 3):** verified in shipped dist — root renders `role="dialog"`, `aria-modal: true`, `aria-label` (labelable via `labels`), focus is moved to the lightbox container on open (`containerRef.current?.focus()`), and `useKeyboardNavigation` handles **Escape** (closable via `closeOnEscape`, on by default) and **ArrowLeft/ArrowRight** (RTL-aware, throttled). Docs claim "supports keyboard, mouse, touchpad, and touchscreen navigation".
- **Feature fit (criterion 5):** plugin-per-feature architecture; the ruled set maps exactly to **Zoom** (double-click + pinch + pan), **Counter**, **Captions**, plus core carousel (swipe, prev/next arrows). Thumbnails/Fullscreen/Video/Share etc. exist but are simply not imported — nothing unused ships. CSS is one imported stylesheet.
- **Score:** SSR 5 · Maintenance 5 · Bundle 3.5 · A11y 4.5 · Feature 4.5 · License 5 → **4.63 weighted**

### 2. PhotoSwipe v5 + `react-photoswipe-gallery` — 5.4.4 / 4.1.2

- npm: https://www.npmjs.com/package/photoswipe · repo: https://github.com/dimsemenov/PhotoSwipe · docs: https://photoswipe.com/getting-started/
- wrapper npm: https://www.npmjs.com/package/react-photoswipe-gallery · repo: https://github.com/dromru/react-photoswipe-gallery
- **License:** MIT for both (npm `license` fields).
- **React 19 / SSR (criterion 1):** PhotoSwipe is framework-agnostic vanilla JS; verified in shipped dist that `photoswipe-lightbox.esm.js` has **no top-level DOM access** (all browser-global use sits inside functions). The docs' canonical pattern creates the lightbox instance from user code (`new PhotoSwipeLightbox({ pswpModule: () => import('photoswipe/dist/photoswipe.esm.js') })`), i.e. client-side wiring — SSR-safe when instantiated in effects/handlers, which the React wrapper does. The wrapper peers `react >= 16.8.0` (no explicit React 19 pin; no first-party SSR/React-19 claim in its README — SSR safety is by construction, not by certification).
- **Maintenance (criterion 2):** 25,309 stars, created 2011 — the most battle-tested codebase on this list, 844,731 weekly downloads. **But the release train stopped: last release v5.4.4 on 2024-05-24 (2.5+ years ago), repo last pushed 2025-12-04, 173 open issues.** The wrapper is actively maintained (v4.1.2 published 2026-06-15; 99,591 weekly downloads), so the React integration stays alive atop a stable-frozen core. Stable-frozen with a huge install base is workable — but it is not "active", and today's bug reports accumulate.
- **Bundle (criterion 4):** measured on the shipped minified files: `photoswipe-lightbox.esm.min.js` 4.5 kB gzip + `photoswipe.esm.min.js` 16.4 kB gzip ≈ **21 kB**, plus the wrapper 3.2 kB (Bundlephobia) ≈ **~24 kB + CSS**. Partially offsettable via the documented dynamic import (core only loads when first opened).
- **Accessibility (criterion 3):** verified in shipped core dist: `aria-roledescription` (x2), `aria-label`, focus management (three `.focus()` sites), 17 `aria` occurrences total — a real ARIA carousel pattern. Slightly less certifiable than YARL because the vanilla↔React bridge owns some focus behavior.
- **Feature fit (criterion 5):** zoom (pinch + double-tap + pan with momentum), swipe, arrows, counter, captions are all core/option features — and it is the strongest zoom engine in the field (14 years of touch hardening). Dynamic import gives free code-splitting.
- **Score:** SSR 4 · Maintenance 3 · Bundle 3 · A11y 4 · Feature 4 · License 5 → **3.75 weighted**

### 3. Hand-rolled baseline — compose over `packages/ui`'s Base UI Dialog (zero dependencies)

- Foundation in repo: `packages/ui/src/components/dialog.tsx` (shadcn-style wrapper over `@base-ui/react@^1.8.0` `Dialog`: Portal, Backdrop, Popup, Close) · Base UI Dialog docs: https://base-ui.com/react/components/dialog
- **What comes free:** modal focus trap, Escape-to-close, scroll lock, backdrop, ARIA dialog semantics, the repo's token system and theme, and a React-19/SSR-safe shell by construction (own code, portal at runtime only).
- **What must be hand-built (verified against the ruled set):** the multi-image **carousel** (prev/next, swipe with touch momentum, counter, preload), the **zoom engine** (double-click/tap toggle, pinch-to-zoom, pan with bounds clamping, momentum, iOS Safari gesture quirks — `pointercancel`, passive listeners), the caption line, and the WAI-ARIA APG carousel semantics layered over the dialog. The dialog primitive provides none of these; Base UI ships no carousel/zoom.
- **Bundle:** zero third-party bytes; realistically ~2–4 kB of own gzip for a minimal honest implementation. Best-in-field.
- **Maintenance (the honest cost):** every gesture bug, browser quirk, and future React/Router upgrade lands on this repo. The project's own discipline (vitest seam tests, `pnpm check` green, rendered variants per UI ticket) is the right discipline — and it multiplies the cost of owning a pinch-zoom engine. Scored 2/5.
- **Score:** SSR 5 · Maintenance 2 · Bundle 5 · A11y 3.5 (reaching 4.5 requires correctly implementing the APG carousel pattern — assumed work, not given) · Feature 2 · License 5 → **3.80 weighted**

### 4. `react-photo-view` — v1.2.7

- npm: https://www.npmjs.com/package/react-photo-view · repo: https://github.com/MinJieLiu/react-photo-view · docs: https://react-photo-view.vercel.app
- **License:** Apache-2.0 (npm; README).
- **React 19 / SSR (criterion 1):** peers `react >=16.8.0` (React 19 nominally fine). Verified in shipped dist, two real hazards for a Worker SSR render: the module reads `navigator` at top level (`"undefined" != typeof window && "ontouchstart" in window` and the `useLayoutEffect`/`useEffect` swap test `navigator && navigator.userAgent` — tolerable on workerd/Node 21+, but a bare top-level global read), and the portal component defaults its container to **`document.body`** while `PhotoProvider` renders the slider portal **unconditionally** — so a server render without a client-only mount throws on `document`. Usable only wrapped in a client-only mount/lazy import. Scored 2/5.
- **Maintenance (criterion 2):** 243,621 weekly downloads, 1,896 stars, 65 open issues; repo pushed 2026-01-30; **last npm publish 2025-01-05 (~11 months ago)** and GitHub releases have been unused since 2022 (publishes without release notes). Single maintainer, slow-cadence. Scored 3/5.
- **Bundle (criterion 4):** **7.7 kB gzip / 19.3 kB min all-in** (Bundlephobia: https://bundlephobia.com/package/react-photo-view@1.2.7) — the smallest package that ships the full ruled set including zoom.
- **Accessibility (criterion 3):** verified in shipped dist: **zero `aria-*` attributes** in the entire module build; only a bare `role="dialog"` on the portal; prev/next/close controls are `div`s with `onClick` (not buttons, not keyboard-reachable); the `<img>` carries a hardcoded `alt=""`. Keyboard nav (ArrowLeft/Right/Escape) exists, but the ARIA story is materially below the field. Scored 2/5.
- **Feature fit (criterion 5):** the strongest out-of-box fit — wheel/pinch/double-tap zoom + pan, swipe carousel, "1 / N" counter, arrows, even rotate — all built-in, nothing extra to configure.
- **Score:** SSR 2 · Maintenance 3 · Bundle 4.5 · A11y 2 · Feature 5 · License 5 → **3.18 weighted**

### 5. `lightgallery` — v3.0.0 — **fails the license gate**

- npm: https://www.npmjs.com/package/lightgallery · site: https://www.lightgalleryjs.com/
- **License:** npm license field is now `(GPL-3.0-only OR LicenseRef-Commercial)`. The site's terms: free under GPLv3 only if "your project is distributed under GPLv3-compatible terms"; proprietary use requires "a commercial license covers it: same code, no feature gates, one-time payment". For this proprietary site that means either open-sourcing the whole site or paying.
- **Maintenance (otherwise strong):** v3.0.0 released 2026-10-09, repo pushed 2026-11-04, 68 open issues, 7,064 stars, created 2014, 125,272 weekly downloads. Active — the license is the only disqualifier.
- **Bundle:** 18.8 kB gzip core (Bundlephobia), plugins per feature on top.
- **Score:** SSR 3 · Maintenance 4 · Bundle 2.5 · A11y 3 · Feature 4 · License 1 → **3.03 weighted, gated**

### 6. Fancybox (fancyapps) — v6.1.15 — **fails the license gate**

- Site: https://fancyapps.com/fancybox/ · license: https://fancyapps.com/license/
- **License (checked carefully, as the ticket asked):** fully proprietary. The license agreement states "Every installation regardless of the project type, location or legal form requires valid paid License" — **no free production tier**; "Use the Software in Open Source projects" is prohibited without written consent; the author "reserves the right to alter or terminate this agreement at any time". Tiers: Single-Use (per end product), Extended, Business (annual subscriptions for the multi-product tiers).
- **Also:** the historical OSS `fancyBox` GitHub repo (jQuery v3 era) is **archived** (since 2023-05, GitHub API) — the current product is closed-source; the `fancyapps/ui` repo functions as a changelog/issue tracker.
- **Otherwise respectable:** active development (v6.1.15 current), good feature and a11y story — but closed-source + paid-for-every-install + revocable license is not acceptable for this project's stack. Scored SSR 3 · Maintenance 3 · Bundle 3 · A11y 4 · Feature 5 · License 1 → **3.20 weighted, gated**

## Comparison table

Scores 1–5 per criterion; weighted by the table above (SSR 25% / Maintenance 20% / A11y 20% / Bundle 15% / License 10% / Feature 10%). **License is a gate**: candidates that cannot be used on a proprietary commercial site at zero cost rank below every passing candidate, whatever their raw score.

| Rank | Candidate | SSR/React19 | Maintenance | Bundle (gz) | A11y | Feature fit | License | Weighted | Verdict |
|---|---|---:|---:|---|---:|---|---|---:|---|
| **1** | **yet-another-react-lightbox 3.33.1** | 5 | 5 | ~15–19 kB | 4.5 | 4.5 | MIT | **4.63** | **Recommended** |
| 2 | PhotoSwipe 5.4.4 + react-photoswipe-gallery 4.1.2 | 4 | 3 | ~24 kB | 4 | 4 | MIT | **3.75** | Strong runner-up; best zoom engine |
| 3 | Hand-rolled over Base UI Dialog | 5 | 2 | ~2–4 kB (own) | 3.5 | 2 | n/a | **3.80**\* | Viable; costs live in the zoom engine |
| 4 | react-photo-view 1.2.7 | 2 | 3 | 7.7 kB | 2 | 5 | Apache-2.0 | 3.18 | Tiny + complete, but A11y and SSR-mount weak |
| 5 | lightgallery 3.0.0 | 3 | 4 | 18.8 kB core | 3 | 4 | GPLv3 OR commercial | 3.03 (gated) | Active, but license fails the gate |
| 6 | Fancybox 6.1.15 | 3 | 3 | ~n/a (closed) | 4 | 5 | Proprietary, paid | 3.20 (gated) | Disqualified: closed source, paid, revocable |

\* Hand-rolled's raw weighted score (3.80) edges PhotoSwipe (3.75) — a statistical tie. Ranked #3 deliberately: the tie is broken toward PhotoSwipe because the ruled **zoom** requirement (pinch + pan with momentum) is precisely the expensive-to-build-and-test piece PhotoSwipe ships with 14 years of touch hardening, while the hand-rolled path's A11y score (3.5) *assumes* the APG carousel pattern is implemented correctly. Sensitivity: if bundle size is weighted far higher (e.g. 25%) and feature-fit lower, the hand-rolled path overtakes — see the honest assessment below.

## Recommendation

**Adopt `yet-another-react-lightbox` (v3) for the landing's gallery lightbox and package-detail zoom.**

The argument, on the deciding criteria:

1. **It is the only candidate that is simultaneously React-first, React-19-official, SSR-clean by code inspection, and under active development.** TanStack Start on Workers leaves no room for `document`-at-import hazards (react-photo-view) or a React binding nobody certifies (PhotoSwipe wrapper). YARL renders nothing while closed, portals at runtime, and declares React 19 support officially.
2. **Maintenance is in a different league:** six releases in 19 months (latest 2026-11-14, repo pushed 2026-11-18), **one** open issue, 1.07M weekly downloads, CI-enforced size budgets. PhotoSwipe's core has had no release in 2.5 years; react-photo-view publishes yearly; the other two are license-gated.
3. **The plugin architecture matches the ruled set exactly** — import Zoom (double-click/pinch + pan), Counter, Captions, and nothing else ships. Thumbnails/fullscreen are explicitly out of scope and cost zero bytes here. The hand-rolled path would rebuild that exact set by hand; react-photo-view ships it but with zero ARIA.
4. **A11y is real, not aspirational:** verified `role="dialog"` + `aria-modal` + container focus + Escape/arrow keyboard nav in the shipped build — the closest thing in the field to the Base-UI Dialog bar this repo already upholds.
5. **MIT, zero runtime deps, ~15–19 kB gzip for the whole ruled set** — an honest cost for an edge site, further reducible by lazy-mounting the lightbox below the fold.

Residual risks to note for the implementation ticket: single-maintainer bus factor (mitigated by the small API surface and MIT license — forking is cheap); its visual style differs from tokens.css and will need the standard theming pass (`styles.css` is one file).

## The honest hand-rolled-baseline assessment

Scored on the same criteria, not dismissed (see table): it wins bundle size outright and is SSR-safe by construction, but ranks #3 because the ruled feature set hides the real cost.

**When it is the right call:**
- The feature set shrinks to "open image full-screen, next/prev, Escape, caption" — no pinch/pan zoom. That is a ~1-day composition over the existing Dialog primitive and it would beat every library here.
- The owner explicitly prioritizes zero third-party bytes and owning the code over feature completeness (then this becomes an ADR-worthy values decision, not an engineering one).
- The lightbox is a one-off single-image viewer (e.g. one package cover), not a gallery carousel.

**When it is not:**
- Once **pinch-zoom + pan with momentum** is required (it is, per the ruled set). That engine — transform math, bounds clamping, `pointercancel`, iOS Safari quirks, wheel handling — is exactly what PhotoSwipe spent 14 years hardening and YARL's Zoom plugin encapsulates. Rebuilding it in this repo means, per the project's own discipline: seam tests, `pnpm check` green, rendered variants, and future React/TanStack upgrades re-verified against hand-written gesture code.
- A11y parity (APG carousel semantics layered over the dialog) is required work, not free — the Dialog primitive gives the modal semantics, not the carousel ones.

## Evidence appendix (all checked 2026-11-19)

- npm registry metadata + licenses: `npm view` over yet-another-react-lightbox@3.33.1, photoswipe@5.4.4, react-photoswipe-gallery@4.1.2, react-photo-view@1.2.7, lightgallery@3.0.0
- Weekly downloads (2026-11-11 → 2026-11-17, api.npmjs.org): YARL 1,073,394 · photoswipe 844,731 · react-photo-view 243,621 · lightgallery 125,272 · react-photoswipe-gallery 99,591
- GitHub API (stars / open issues / last push / license / releases): igordanchenko/yet-another-react-lightbox (1,337 / 1 / 2026-11-18 / MIT / 6 releases in 19 months), dimsemenov/PhotoSwipe (25,309 / 173 / 2025-12-04 / MIT / last release 2024-05-24), sachinchoolur/lightGallery (7,064 / 68 / 2026-11-04 / GPL-3.0 / 3.0.0 on 2026-10-09), MinJieLiu/react-photo-view (1,896 / 65 / 2026-01-30 / Apache-2.0 / npm publish 2025-01-05), fancyapps/fancyBox (archived 2023-05)
- Shipped-dist inspection (npm tarballs in `/tmp/lb-size`, grep over `dist/`): YARL top-level-global check, `role="dialog"`/`aria-modal`/focus/keyboard handler, `.size-limit.json` budgets; PhotoSwipe lightbox/core top-level check + `aria-roledescription`/focus sites; react-photo-view top-level `navigator` read, `document.body` portal default, zero `aria-*` attributes
- Bundlephobia (min+gzip): [YARL](https://bundlephobia.com/package/yet-another-react-lightbox@3.33.1) 12.2 kB · [photoswipe](https://bundlephobia.com/package/photoswipe@5.4.4) 16.9 kB · [react-photo-view](https://bundlephobia.com/package/react-photo-view@1.2.7) 7.7 kB · [lightgallery](https://bundlephobia.com/package/lightgallery@3.0.0) 18.8 kB · react-photoswipe-gallery 3.2 kB; PhotoSwipe min-file sizes also measured directly (4.5 + 16.4 kB gzip)
- Vendor pages: [YARL docs](https://yet-another-react-lightbox.com/) · [PhotoSwipe getting-started](https://photoswipe.com/getting-started/) · [lightGallery terms](https://www.lightgalleryjs.com/) · [FancyApps license agreement](https://fancyapps.com/license/) · [Fancybox product page](https://fancyapps.com/fancybox/) · [Base UI Dialog](https://base-ui.com/react/components/dialog)
