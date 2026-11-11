# e2e — the browser-test foundation (ADR-0022, M6 #189)

Standalone `@playwright/test`, chromium-only, walking **deployed** environments — never local dev servers, never part of `pnpm check` (the root package is not a pnpm workspace member, so turbo's `test` task cannot see `test:e2e`; the PR gate stays `pnpm check` + `pnpm build`, browserless).

## Running

```bash
pnpm exec playwright install chromium   # once per machine (~150 MB)
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
E2E_ADMIN_URL=https://sevendays-admin.pahamajulius.workers.dev \
pnpm test:e2e
```

`E2E_BASE_URL` has no default on purpose: the config fails fast with a curated message when it is unset — a smoke run against the wrong target is worse than no run. The three URLs cover the six public legs; the authenticated leg additionally wants `E2E_SMOKE_STAFF_EMAIL` + `E2E_SMOKE_STAFF_PASSWORD` (the dev `smoke-staff` account, provisioned per `docs/staff-provisioning.md`, sealed in the GitHub environment) — without them that one leg fails with the same curated posture, never a silent skip. In CI all five values arrive from the workflow's GitHub environment (`.github/workflows/e2e.yml`).

## Taxonomy

- `smoke/` — the production smoke (#190, spec #182 § The verify gate): seven presence/status-level assertions over the deployed stack — api health, the landing home, the CMS-fed /about surface, a live media asset URL'd from the gallery payload, the booking page serving (never submitting), the admin sign-in page, and a real `smoke-staff` sign-in reaching the Analytics Dashboard. #189's one-probe foundation spec was this suite's doorway and is superseded (deleted when the seven landed).
- `visual/` — the redesign visual suite (#225, ADR-0022's flagship consumer): the 8 redesigned public surfaces × light + dark as 16 committed `expect.toHaveScreenshot` baselines — see the Visual regression section below.

## Visual regression (ADR-0022, #225)

`e2e/visual/redesign.spec.ts` seats the ADR-0022 flagship consumer: the 8 redesigned public surfaces (`/`, `/packages`, `/packages/<slug>`, `/services`, `/branches`, `/about`, `/share-your-story`, the global not-found) × light + dark = **16 committed baselines** in `e2e/visual/redesign.spec.ts-snapshots/`.

Mechanics that keep the baselines honest:

- **Both themes, pinned before load** — an init script seeds next-themes' default `theme` localStorage key (`light` | `dark`); the class-strategy provider (packages/ui seam, `attribute="class"`, `enableSystem` false) applies the class pre-paint. No toggle clicks, no system fallback.
- **The detail slug is never hardcoded** — the run derives `/packages/<slug>` from the LIVE `/api/v1/service-packages` payload, so the visual run wants `E2E_API_URL` set alongside `E2E_BASE_URL` (the `requiredEnv` contract, same as the smoke). An empty catalog is a red run with a named message, never a skip.
- **Data-present sentinels (#259)** — the images gate is vacuous on a page whose data never arrived (no images to wait for), so between the images gate and the decode gate each surface asserts its data-bearing DOM from a per-surface map in the spec: the featured strip + mosaic figures on home, the detail-linked plates (`a[href^='/packages/']`) on the packages index, the book CTA + the "What's included" h2 on the package detail, the service rows (`a[href^='/book?service=']`), the branch cards (`a[href^='/book?branch=']`), the portfolio grid + tab row + kind-words quotes (`figure blockquote`) on about, the form fields (`#story-quote` / `#story-person`) on share-your-story, and the ruled h1 + `header` chrome on the not-found. A missing seam fails the run loudly with the surface, the seam, and a page-state dump (title, readyState, scrollHeight, complete/total image counts, the body innerText head) — never a skip, never a retry (the beforeAll empty-catalog law's sibling: under `--update-snapshots` a silently-written empty baseline is a false green forever). The dump identifies the render path on the next occurrence — ruled empty-state copy vs the "Something went wrong." error boundary vs a partial HTML stream vs the Cloudflare throttle page, which the `error code: 1102` body marker attributes to worker resource limits, not a data race (#255's incident).
- **Motion is deterministic** — the config's `expect.toHaveScreenshot` block (`animations: 'disabled'`, `caret: 'hide'`, `maxDiffPixelRatio: 0.01`) freezes CSS motion only; the services marquee's JS transform loop is NOT CSS-freezable, so the home capture masks the marquee's STATIC outer section (`[data-strip='services']` — its bbox is layout-stable, so the mask covers the marquee area wherever the JS track sits inside it; masking the moving track itself would move the mask box per capture, the #225 home-dark flake). Every capture follows the **tall-viewport law (#255)** ordering: goto with `waitUntil: 'load'` (networkidle can hang on beacon-heavy pages) → lazy images forced eager (below-fold `loading="lazy"` images start loading regardless of viewport, BEFORE the page height is measured) → the images gate (`document.images` all `complete && naturalWidth > 0`, 30s — the image-led sections collapse while images are unresolved, so page height itself swings without it) → the data-present sentinels (#259 — each surface's data-bearing DOM asserted in-page per the bullet above; a data-less page has no images to wait for, so the images gate is vacuous without them) → the decode gate (`img.decode()` on every image — `complete` proves the bytes arrived, not that Chromium rasterized the frame; #241's about-light flake captured blank-but-complete photos) → **resize the viewport to the measured page height** (width unchanged; measured after the images gate because unresolved images swing it) → the post-resize assertion (the re-measured scroll height must not exceed the viewport — viewport-height-dependent content fails loudly with a curated message rather than capturing; the root app shell is the only `min-h-screen` consumer, so the shell stretch is a no-op at content height) → the reveal-complete wait (`[data-reveal]:not([data-shown])` reaches zero — the shared `Reveal` wrapper's inert hooks, fired by intersection now that everything is in-viewport; `animations: 'disabled'` fast-forwards any transition still running at capture) → a ≥1s settle (the worst-case reveal tail ≈ 270ms column delay + 700ms transition) → the capture. At page height the capture is an in-viewport raster — the beyond-viewport fullPage path that intermittently dropped mid-page bands (#255's Class A flake: blank plate rows, blank portfolio tiles, page height reserved) is gone by construction, and the old scroll walk retired with it (everything intersects at page height; eager-forcing starts the loads the walk used to trigger).

```bash
E2E_BASE_URL=<teaser> E2E_API_URL=<teaser-api> pnpm test:e2e -- e2e/visual            # compare
E2E_BASE_URL=<teaser> E2E_API_URL=<teaser-api> pnpm test:e2e -- --update-snapshots e2e/visual   # re-baseline on INTENT, then eyeball every PNG
```

Baselines are **advisory on the nightly** — CMS content edits surface as drift in the nightly log; re-baselining (`--update-snapshots`) is the owner's deliberate act, always followed by an eyeball pass over every PNG before committing (a masked-wrong or empty-content baseline is a false green forever). Chromium-only forever; no per-engine baselines; never PR-gating.

## Rulings that bind every suite here

- **Chromium-only** at landing; firefox/webkit are a later addition for smoke breadth only — never for visual baselines (per-engine snapshot matrices are the noise to avoid).
- **Never PR-gating** — CI is nightly + `workflow_dispatch` (`.github/workflows/e2e.yml`, cached browsers); local runs are the primary loop; commit-green and smoke-green stay separate verdicts.
- **Main-only, never picked to v1** — the CDP-harness class (`scripts/seed-v1/paths.txt`).
- **Read-only plus at most the sign-in act** (#190's posture) — the deployed environments hold the studio's real data.
