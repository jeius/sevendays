# E2E Visual Tall-Viewport Capture Implementation Plan (#255)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **This ticket is NOT UI-bearing** — the only landing `src/` change is two inert `data-*` attributes plus a comment (zero pixel impact, no composition work); the UI/UX skill-set loading rule does not apply. Long-running: nothing stays up between tasks except the Task 6 background loop; every Playwright run targets the DEPLOYED teaser (ADR-0022 — never a local server).

**Goal:** The visual suite's captures become deterministic under the owner-ruled tall-viewport law — capture at a page-height viewport so no reveal or raster race survives — with decode and reveal-complete gates, the scroll walk retired, all 16 baselines re-captured on intent, and ≥10 consecutive full-suite compare runs green against the teaser (16/16 each).

**Architecture:** Eight tasks: (1) the `Reveal` seam — `data-reveal`/`data-shown` hooks on the shared wrapper (inert, DOM-only); (2) the spec's settle-chain rewrite — load → eager-forcing → images gate → decode gate → measure + resize to page height → post-resize assertion → reveal-complete wait → settle ≥1s → capture, the walk removed (the full new spec body was pre-verified this session: Biome-clean, 16 tests listed, zero new tsc errors); (3) the e2e README mechanics section documents the new ordering; (4) the repo gates + the code PR + the teaser-redeploy probe (the hook must be LIVE before the reveal wait is non-vacuous); (5) the re-baseline — pre-regen compare → `--update-snapshots=changed` regen → dims check + eyeball → zero-diff → the visual PR; (6) the 10-run stability gate (background loop), then the visual PR merges and one on-main zero-diff; (7) the v1 SPLIT for the code PR (reveal.tsx is a v1-path; the e2e files are main-only) + the visual PR's SKIP row; (8) the close-out — progress entry, both ledger rows, issue close, graphify.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs), zero migrations, zero `packages/` changes. `@playwright/test` **1.63.0** (chromium **1243** — `~/.cache/ms-playwright/chromium-1243/`, installed and probed), Biome **2.5.11**, TypeScript (the differential tsc gate below — `@types/node` is deliberately NOT installed at the root; the spec's two pre-existing tsc errors are the baseline, never "fixed" here), `gh` CLI, GitHub Issues.

**Spec:** Implements ticket [#255 "e2e visual: the /about portfolio capture can render its lower tiles blank (flaky baseline capture)"](https://github.com/jeius/sevendays/issues/255) (labels `bug` + `ready-for-agent`), whose contract is the [agent brief](https://github.com/jeius/sevendays/issues/255#issuecomment-6739331267). The brief's desired behavior, verbatim- condensed: (1) "measure the document's scroll height **at the standard viewport**, then resize the viewport to exactly that height (width unchanged). The root app shell is the only `min-h-screen` consumer, so the shell stretch is a no-op at content height"; (2) "Assert post-resize that the scroll height ≤ viewport height; if the page grows … fail loudly with a curated message rather than capturing"; (3) "Everything is now in-viewport: reveals fire on intersection and lazy loading is moot. Wait for **reveal completion** and keep a settle ≥1s (worst-case reveal ≈ 270ms column delay + 700ms transition)"; (4) "Keep the images-loaded gate and add a **decode gate** (await every image's decode resolution)"; (5) "The scroll walk becomes redundant — remove it if that simplifies"; (6) "Capture as before (`fullPage: true`) … the home services marquee mask law is untouched". Key recon facts (2026-11-11, main `41559e3`, tree clean — post-#263; every file below read whole this session):

- **The Class A/Class B split and this ticket's boundary:** the triage reproduced the flake live (~120 captures) and the owner ruled the split — **#255 keeps capture determinism (Class A: mid-page content blank at capture, page height IDENTICAL to baseline — the band is reserved but unpainted)**; **#259 holds the data-arrival race (Class B: the page renders WITHOUT its data — captured height ≪ baseline height, e.g. 734 vs 2238)**. The fix (tall-viewport capture) "makes both mechanisms moot without proving either." Class B and its sentinels are FENCED here.
- **The brief's min-h-screen claim, verified:** `grep -rn 'min-h-screen|h-screen|100vh|100dvh|100svh' apps/landing/src` over tsx/ts/css hits exactly ONE consumer — `apps/landing/src/routes/__root.tsx:89` (`<div className='flex min-h-screen flex-col'>`, the root shell). Every other `min-h-*` is a fixed rem value (`min-h-64`, `min-h-56`, `min-h-[26rem]`, `min-h-[22rem]`). The resize is layout-safe by inspection.
- **The Reveal component (`apps/landing/src/components/reveal.tsx`, 55 lines):** `shown` state flipped by an IntersectionObserver (`threshold: 0.15`) or immediately under `prefers-reduced-motion: reduce`; the wrapper div is `transition-all duration-700 ease-out` with inline `transitionDelay: ${delay}ms`. Consumers and their max delays: `mosaic-photo-grid.tsx` `(i % 4) * 90` = 270ms (home + /about), `catalog-plates.tsx` / `services.tsx` / `branches.tsx` `(i % 2) * 90` = 90ms — worst case 270 + 700 = 970ms < the 1000ms settle, matching the brief's arithmetic. Reveal children mount regardless of `shown` (opacity-0, never unmounted) — no new images can appear after the resize. **v1's copy is byte-identical to main's** (diffed this session) — the Task 7 pick applies clean.
- **The spike evidence (this session, tree restored byte-identical after):** the full new spec body pinned in Task 2 was assembled and proven IN the consuming location — `biome check e2e/visual/redesign.spec.ts` **clean** (after two formatter wraps the plan adopts verbatim); `E2E_BASE_URL=http://127.0.0.1:9 pnpm exec playwright test --list e2e/visual` lists **"Total: 16 tests in 1 file"**; the differential tsc gate (pinned below) reports **exactly the 2 pre-existing errors** — `e2e/smoke/env.ts(11,17) TS2591 'process'` and the spec's own `img.loading` on `Element` (line 102 today, line 89 in the new file) — zero NEW errors. `page.setViewportSize` / `page.viewportSize()` verified present in `playwright-core@1.63.0/types/types.d.ts` (lines 4957+, 643).
- **No `pnpm check` gate covers `e2e/`:** the root package is not a workspace member — turbo's lint/typecheck/test cannot see it; Playwright strips types via esbuild without checking them. That is WHY the differential tsc + biome + `--list` gates below exist: without them a type error surfaces only mid-Task-6's 10-run loop, an expensive place to learn.
- **The two-step landing law (why Task 4 precedes Task 5):** the reveal-complete wait is only non-vacuous once the deployed teaser SERVES `data-reveal` — the hook rides `reveal.tsx`, which deploys with the LANDING, not the spec. So: code PR first (Task 4, squash-merge → ci.yml's `Deploy teaser (main)` job auto-redeploys), THEN the curl probe proves the hook live (SSR renders the attributes into the HTML — `curl -s <teaser>/services | grep -c 'data-reveal'` ≥ 1), THEN the regen (Task 5) — the #241 code-PR-then-visual-PR precedent.
- **The command forms (#241-probed, pnpm 11.24.0):** the README's literal `pnpm test:e2e -- e2e/visual` form forwards BOTH arguments and fails to filter — always `pnpm exec playwright test e2e/visual` (compare) and `pnpm exec playwright test --update-snapshots=changed e2e/visual` (regen — writes only byte-differing surfaces; an unchanged PNG stays byte-identical). Both from the repo root, both against the deployed teaser.
- **The baseline laws (ADR-0022 + #225 + #241):** baselines are born only from real captures against a deployment — NEVER `git checkout <sha> -- <baseline>` (restoring a baseline); copying an OLD baseline into the gitignored evidence dir for comparison (`git show HEAD:<path> > …`) is not that law and is how Task 5 eyeballs. Every changed PNG is eyeballed before commit ("a masked-wrong or empty-content baseline is a false green forever"). The compare's per-test failure output names both image dims — that is the Class A/Class B diagnostic.
- **The v1 disposition, pre-classified:** `e2e` + `.github/workflows/e2e.yml` are main-only (`scripts/seed-v1/paths.txt:32-34`); `apps/landing/src/components/reveal.tsx` is a v1-path (not in paths.txt; exists byte-identical on v1). So the code PR = SPLIT (1 v1-path hunk + main-only e2e/plan files; content pass clean — inert hooks carry no booking tokens, no edition mechanics), the visual PR = pure SKIP, one ledger row per PR (the runbook's law; the #251/#253 precedent).

## Global Constraints

- **Branch:** `fix/255-tall-viewport-captures` off main `41559e3` (confirm `git status` clean first; if main has moved, branch off latest main — every edit below is a whole-file pin or an exactly-once find/replace, so line numbers are not load-bearing). This plan file is the branch's first commit (`docs(plan): the #255 implementation plan`). Commit messages follow the repo's `type(scope): … (#255)` squash style; every commit below is pinned verbatim.
- **The pinned-edit law:** every find/replace pair below matched EXACTLY ONCE in its file at plan time (against `41559e3`). If any find matches ≠ 1 at execution, STOP — the file drifted; reconcile against main before editing.
- **The visual-run law:** every Playwright invocation runs from the repo root against the DEPLOYED teaser — `E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev` `E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev` (the GitHub `teaser` environment's values, #241-pinned) — NEVER a local dev server (ADR-0022). Command forms exactly as pinned above; local `retries: 0` (the config), so every compare verdict is a true first attempt.
- **The e2e-file gates (per touched file):** `pnpm exec biome check <file>` clean; the differential tsc — `pnpm exec tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler e2e/visual/redesign.spec.ts` — reports EXACTLY the 2 pre-existing errors (`env.ts(11,17) TS2591` + the spec's `img.loading` TS2339) and nothing more (the pair is the deliberate baseline — `@types/node` is intentionally absent from the root; do not "fix" either error in this ticket); `E2E_BASE_URL=http://127.0.0.1:9 pnpm exec playwright test --list e2e/visual` → "Total: 16 tests in 1 file".
- **The landing gates (Task 1):** `pnpm --filter @sevendays/landing fix` rewrites NOTHING (the pinned edit is Biome-canonical — probed this session), `pnpm --filter @sevendays/landing typecheck` green (probed on the spiked file), `pnpm --filter @sevendays/landing test` at its floor — **16 files / 123 tests** (reconcile if the count differs; never loosen). No other suite is touched.
- **The flake-signature law (diagnose every red compare by it):** **Class A** = received height EQUALS expected (the band is reserved) + a large pixel diff — blank mid-page bands; this is the bug being fixed; under the new chain it is a STOP-and-report. **Class B** = received height ≪ expected (e.g. 734 vs 2238) — the page rendered without its data; #259's fenced flake: record it as #259 evidence and re-run (Task 2 Step 1, Task 6); it never blocks this ticket and never counts as a chain failure. A failure whose error text is one of Task 2's curated messages (the tall-viewport law / the decode gate) = a chain bug: STOP.
- **The fences (NOT here, regardless of temptation):** **#259's data-present sentinels** (Class B's real fix — this ticket's reveal wait is deliberately allowed to pass vacuously on a data-less page); **the ADR-0022 fences** — chromium-only, never PR-gating, advisory baselines, nightly + dispatch, all unchanged; **`playwright.config.ts`** — the `expect.toHaveScreenshot` block (`animations: 'disabled'`, `caret: 'hide'`, `maxDiffPixelRatio: 0.01`) and everything else stay byte-identical; **the marquee mask law** — the home capture still masks the STATIC `[data-strip='services']` section, never the track; **`.github/workflows/e2e.yml`** — untouched; **Reveal's behavior** — the two attributes are inert hooks; the transition, delays, reduced-motion path, and every pixel stay identical; **the v1 baselines** — none exist (teaser-only forever); **`AGENTS.md`** (no floor changes, no rulings); every sibling ticket's files (#259, #260).
- **Evidence:** `.superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/` (gitignored) — one named file per run, named in the steps.
- **Tick law:** `- [✅]` in this file and issue bodies alike, never plain `[x]`. Never commit secrets. `graphify update .` at close (code was modified) — its `graphify-out/` changes commit as their own `chore(graphify): post-#255 graph update` commit (the `41559e3` pattern).

## File Structure

```text
apps/landing/src/components/reveal.tsx   # modify (T1) — data-reveal/data-shown hooks + seam comment
e2e/visual/redesign.spec.ts              # modify (T2) — whole-file pin: the tall-viewport settle chain
e2e/README.md                            # modify (T3) — the visual-mechanics bullet: the new ordering
e2e/visual/redesign.spec.ts-snapshots/   # regenerate (T5, on visual/255) — the 16 baselines
.superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/   # evidence (gitignored)
docs/progress.md  docs/agents/v1-picks.md  graphify-out/   # T8 (main-only)
```

---

### Task 1: The Reveal seam — `data-reveal` / `data-shown` on the shared wrapper

The brief's key interface, first and standalone: every Reveal wrapper carries a stable `data-reveal` attribute, and `data-shown` flips with the shown state — inert, DOM-only, zero pixel impact. The spec (Task 2) targets `[data-reveal]:not([data-shown])`; nothing else consumes the hooks yet. The landing suites are the gate: the attributes touch no lib seam, so the floor holds by construction.

**Files:**
- Modify: `apps/landing/src/components/reveal.tsx` (the file comment + the wrapper div's attributes)

**Interfaces:**
- Consumes: nothing new (main's code as-is).
- Produces: on every rendered Reveal wrapper — `data-reveal` (always present) and `data-shown='true'` (present iff the reveal has fired; absent while hidden). Task 2's reveal-complete wait selects `[data-reveal]:not([data-shown])`.

**Not here:** any change to the transition, delays, IntersectionObserver, or reduced-motion path (the hooks are observability only); any other component (the wait targets Reveal wrappers alone — the brief's "every reveal wrapper on the page" is exactly this component's instances); #259's sentinels.

- [✅] **Step 1: The two edits**

(a) Replace the file's leading comment block:

```tsx
// The viewport reveal (#164 owner rulings, Rounds 2 + 3): fade-and-rise
// once when the element enters the viewport; staggered per column via
// `delay`; prefers-reduced-motion shows immediately. Lives in its own
// module so the home mosaic and the (#224) catalog index share the one
// motion grammar.
```

with:

```tsx
// The viewport reveal (#164 owner rulings, Rounds 2 + 3): fade-and-rise
// once when the element enters the viewport; staggered per column via
// `delay`; prefers-reduced-motion shows immediately. Lives in its own
// module so the home mosaic and the (#224) catalog index share the one
// motion grammar.
// The e2e visual seam (#255): every wrapper carries `data-reveal`, and
// `data-shown` flips with the state — inert DOM hooks (zero pixel
// impact) that the visual spec's reveal-complete wait targets under the
// tall-viewport capture law (e2e/README.md).
```

(b) Replace:

```tsx
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
```

with:

```tsx
    <div
      ref={ref}
      data-reveal=''
      data-shown={shown ? 'true' : undefined}
      style={{ transitionDelay: `${delay}ms` }}
```

- [✅] **Step 2: The landing gates**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing typecheck
pnpm --filter @sevendays/landing test
```

Expected: `fix` rewrites NOTHING (probed this session on the spiked file); typecheck green; the suite reports its floor — 16 files / 123 tests. Any other count: reconcile before proceeding (never loosen).

- [✅] **Step 3: Commit**

```bash
git add apps/landing/src/components/reveal.tsx
git commit -m "chore(landing): the Reveal wrapper carries its data-reveal/data-shown e2e hooks (#255)"
```

### Task 2: The spec's tall-viewport settle chain

The ticket's core. The scroll walk retires (everything intersects at page height; the eager-forcing below already starts every lazy load regardless of viewport), the decode gate joins after the images gate, the viewport resizes to the measured page height with a loud post-resize assertion, the reveal-complete wait covers every `[data-reveal]` wrapper, and the settle doubles to 1000ms. The FULL new file is pinned below — it was assembled and machine-verified this session (Biome-clean including both formatter wraps; 16 tests listed; zero new tsc errors), so the edit is a whole-file replace, exactly-once by construction. The final settle chain, in the brief's ruled order: **load → eager-forcing → images gate → decode gate → measure + resize to page height → post-resize assertion → reveal-complete wait → settle ≥1s → capture**.

**Files:**
- Modify: `e2e/visual/redesign.spec.ts` (the test body; THEME_INIT, the marquee-mask block, SURFACES, and beforeAll are unchanged)

**Interfaces:**
- Consumes: Task 1's `data-reveal`/`data-shown` hooks (the wait selector); `page.setViewportSize`/`page.viewportSize()` (playwright-core 1.63.0, verified in types.d.ts).
- Produces: the deterministic capture chain Tasks 5–6 re-baseline and stability-test against; the two curated failure messages later tasks quote verbatim — `#255 tall-viewport law: the page grew with the taller viewport (…)` and `#255 decode gate: …`.

**Not here:** `playwright.config.ts` (byte-identical — the expect block, retries, workers all stay); the marquee mask logic (only its position in the flow moves — it stays immediately before the capture); #259's sentinels (a data-less page has no reveals and no images — the reveal wait passes vacuously BY DESIGN until #259 lands).

- [✅] **Step 1: The pre-change baseline gate (stack is the deployed teaser)**

```bash
mkdir -p .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
pnpm exec playwright test e2e/visual \
  | tee .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/baseline-pre-change.txt
```

Expected: **16 passed** (the #253 zero-diff state; #263 changed no served pixels — the catalog reads are content-identical through the cache). Diagnose any failure by the flake-signature law: a **Class A** instance (equal heights, blank-band diff) is the ticket's own premise — record it and re-run (≤3 attempts, each recorded as `baseline-pre-change-flake-N.txt`); a **Class B** instance (height ≪ baseline) is #259's — record as #259 evidence and re-run; genuine content drift (dims changed on specific surfaces with no blank-band signature) — record and proceed (Task 5's regen absorbs drift by law). If no clean 16/16 in 3 attempts, PROCEED anyway — the flake is the premise — with every instance recorded.

- [✅] **Step 2: The whole-file replace**

Overwrite `e2e/visual/redesign.spec.ts` with EXACTLY this content (the session-verified artifact):

```ts
import { expect, type Locator, test } from '@playwright/test';

import { requiredEnv } from '../smoke/env';

// ADR-0022's flagship consumer (#225): the redesigned public surfaces
// (the #223/#224 redesign), teaser edition, light + dark — 8 surfaces x
// 2 themes = 16 committed baselines. Baselines are advisory on the
// nightly — CMS content edits surface as drift in the nightly log; the
// owner re-baselines on intent (--update-snapshots). Never PR-gating.
//
// Theme is pinned BEFORE load: next-themes' class strategy reads the
// DEFAULT storageKey 'theme' from localStorage in its pre-paint script
// (packages/ui re-exports the provider seam; the landing mount passes
// attribute="class" and no storageKey — the 0.4.6 default key is
// 'theme', and enableSystem is false), so seeding localStorage is the
// deterministic class-setter. Verified against the live mount in
// apps/landing/src/routes/__root.tsx.
const THEME_INIT = (theme: 'light' | 'dark') => `window.localStorage.setItem('theme', '${theme}');`;

// The home services strip is masked at its STATIC outer section
// (`data-strip='services'`, apps/landing/src/components/
// home-image-led.tsx) — NEVER at the moving track: `animations:
// 'disabled'` only freezes CSS motion, so a translating track's bbox —
// and with it the mask box itself — would land differently per capture
// (the #225 home-dark finding: ratio 0.03 around the mask edges). The
// section's bbox is layout-stable, so the mask paints the whole marquee
// area regardless of where the track sits inside it — the mask ALONE is
// the deterministic fix. (A `reducedMotion: 'reduce'` emulation was
// tried and reverted in fix round 2: the redesign's IntersectionObserver
// reveals honor motion-reduce too, so every reveal-bearing surface
// rendered differently than its baseline.) The strip collapses entirely
// on a zero-service read, so the mask applies only when it resolves.
const MARQUEE_SECTION_MASK = "[data-strip='services']";

// The 8 redesigned public surfaces. The detail path derives its slug
// from the LIVE packages payload at run time — never a hardcoded slug
// (the read is a bare JSON array over /api/v1/service-packages; probed
// 2026-11-05). The not-found path is an unregistered route so the
// global NotFound surface renders (the ruled white/ink or ink field).
const SURFACES = [
  ['home', '/'],
  ['packages-index', '/packages'],
  ['package-detail', undefined],
  ['services', '/services'],
  ['branches', '/branches'],
  ['about', '/about'],
  ['share-your-story', '/share-your-story'],
  ['not-found', '/__m7_visual_not_found__'],
] as const;

test.describe('the redesigned landing — visual baselines', () => {
  let detailPath: string;

  test.beforeAll(async () => {
    const apiBase = requiredEnv('E2E_API_URL');
    const response = await fetch(`${apiBase}/api/v1/service-packages`);
    if (!response.ok) {
      throw new Error(
        `E2E_API_URL's /api/v1/service-packages answered ${response.status} — the detail surface derives its slug from the live packages payload`
      );
    }
    const body: unknown = await response.json();
    const list = Array.isArray(body)
      ? body
      : ((body as { packages?: unknown[]; data?: unknown[] }).packages ??
        (body as { data?: unknown[] }).data);
    const slug = (list as { slug?: string }[] | undefined)?.[0]?.slug;
    if (!slug) {
      throw new Error(
        'the live packages payload carries no slug — an empty catalog is a red visual run, not a skip'
      );
    }
    detailPath = `/packages/${slug}`;
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const [name, path] of SURFACES) {
      test(`${name} — ${theme}`, async ({ page }) => {
        await page.addInitScript(THEME_INIT(theme));
        await page.goto(path ?? detailPath, { waitUntil: 'load' });
        // Break the lazy-load loop: below-fold images are loading="lazy"
        // and only fetch when they intersect the viewport. Forcing every
        // image eager starts all loads regardless of viewport — the
        // page-height resize below would trigger them anyway, but eager
        // starts the loads BEFORE the page height is measured; a
        // genuinely broken image still fails the images gate below.
        await page.evaluate(() => {
          document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
            img.loading = 'eager';
          });
        });
        // Every <img> must be loaded before anything measures the page:
        // the image-led sections (mosaic, plates, service rows) collapse
        // while images are unresolved, so the PAGE HEIGHT itself swings
        // between captures ("expected …4318px, received …734px"). `load`
        // + this explicit gate is the robust pair — networkidle can hang
        // forever on beacon-heavy pages and never promised image decode.
        await page.waitForFunction(
          () => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
          undefined,
          { timeout: 30_000 }
        );
        // The decode gate (#255): `complete && naturalWidth > 0` proves
        // the bytes arrived, not that Chromium rasterized the frame —
        // #241's about-light flake captured blank photos whose images
        // were complete. decode() resolves only when the frame is ready
        // to paint; the images gate above already failed broken images,
        // so a rejection here is a capture-stopping anomaly.
        await page.evaluate(() =>
          Promise.all(
            Array.from(document.images, (img) =>
              img.decode().catch((reason: unknown) => {
                throw new Error(`#255 decode gate: ${img.currentSrc} — ${String(reason)}`);
              })
            )
          )
        );
        // The tall-viewport law (#255): capture at a page-height viewport
        // so no reveal or raster race survives — the beyond-viewport
        // fullPage rasterization path (the #255 Class A flake: blank
        // mid-page bands, blank portfolio tiles) is gone by construction.
        // The height is measured AFTER the images gate (unresolved images
        // swing it); the width is unchanged. The root app shell is the
        // only min-h-screen consumer (probed at plan time), so the shell
        // stretch is a no-op at content height — layout, footer position,
        // and every fixed-height section are preserved.
        const pageHeight = await page.evaluate(
          () => (document.scrollingElement ?? document.documentElement).scrollHeight
        );
        const viewport = page.viewportSize();
        if (!viewport) {
          throw new Error(
            '#255: no viewport size before the tall-viewport resize — harness anomaly'
          );
        }
        await page.setViewportSize({ width: viewport.width, height: pageHeight });
        // Let the resize's reflow settle before re-measuring.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
        );
        const settledHeight = await page.evaluate(
          () => (document.scrollingElement ?? document.documentElement).scrollHeight
        );
        if (settledHeight > pageHeight) {
          throw new Error(
            `#255 tall-viewport law: the page grew with the taller viewport (${settledHeight}px > ${pageHeight}px) — viewport-height-dependent content; investigate before capturing`
          );
        }
        // Everything is in-viewport at page height: reveals fire on
        // intersection and lazy loading is moot. The reveal-complete wait
        // targets the shared Reveal wrapper's data-reveal/data-shown hooks
        // (apps/landing/src/components/reveal.tsx) and covers every
        // reveal wrapper on the page; the config's animations:'disabled'
        // fast-forwards any transition still running at capture —
        // belt and braces under the tall viewport.
        await page.waitForFunction(
          () => document.querySelectorAll('[data-reveal]:not([data-shown])').length === 0,
          undefined,
          { timeout: 10_000 }
        );
        // The settle covers the worst-case reveal tail end to end
        // (≈270ms column delay + 700ms transition).
        await page.waitForTimeout(1000);
        let mask: Locator[] = [];
        if (name === 'home') {
          const marqueeSection = page.locator(MARQUEE_SECTION_MASK);
          if ((await marqueeSection.count()) > 0) {
            mask = [marqueeSection];
          }
        }
        await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
          fullPage: true,
          mask,
        });
      });
    }
  }
});
```

- [✅] **Step 3: The three e2e gates**

```bash
pnpm exec biome check e2e/visual/redesign.spec.ts
pnpm exec tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler e2e/visual/redesign.spec.ts
E2E_BASE_URL=http://127.0.0.1:9 pnpm exec playwright test --list e2e/visual
```

Expected: Biome "Checked 1 file … No fixes applied"; tsc prints EXACTLY the 2 pre-existing errors (`e2e/smoke/env.ts(11,17) TS2591` + `e2e/visual/redesign.spec.ts(89,17) TS2339` — anything more is a regression: STOP); the list ends "Total: 16 tests in 1 file".

- [✅] **Step 4: The pre-deploy smoke (report-only — the teaser does NOT serve the hook yet)**

One compare under the new chain against the OLD baselines + the OLD deployed bundle. The reveal wait passes vacuously (no `data-reveal` in the served HTML yet — expected); the resize/assertion/decode/settle all exercise for real. Pixel diffs vs the committed baselines are EXPECTED (the raster path changed) — this run proves the chain mechanics, not the baselines:

```bash
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
pnpm exec playwright test e2e/visual \
  | tee .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/smoke-pre-deploy.txt
```

Expected: EITHER 16 passed (path-invariant pixels) OR pixel-diff failures — both are valid evidence; record which surfaces differed and their ratios. STOP conditions (chain bugs, not evidence): any failure whose error is the curated `#255 tall-viewport law: the page grew…` message, any `#255 decode gate:` rejection, or a **Class A** signature (equal heights + blank-band diff — the beyond-viewport path is gone by construction, so its flake cannot legitimately recur here). A **Class B** failure (height ≪ baseline) is #259's — record as its evidence and re-run once for a clean mechanics proof.

- [✅] **Step 5: Commit**

```bash
git add e2e/visual/redesign.spec.ts
git commit -m "fix(e2e): the tall-viewport capture law — decode + reveal gates at a page-height viewport (#255)"
```

### Task 3: The e2e README — the mechanics section carries the new ordering

AC1's documentation half: the e2e README is the canonical mechanics doc (the brief: "no ADR change"). One bullet is rewritten — the ordering sentence and the tall-viewport law join the motion bullet; the regen command block below it is untouched.

**Files:**
- Modify: `e2e/README.md` (the "Motion is deterministic" bullet in § Visual regression)

**Interfaces:** consumes Task 2's chain (named in the same order); produces the doc AC1 cites at close.

**Not here:** the ADR (ADR-0022's fences are unchanged — no ADR edit); the README's other sections (Running, Taxonomy, the rulings list); the regen command block (byte-identical).

- [✅] **Step 1: The bullet rewrite**

Replace the bullet that begins `- **Motion is deterministic**` and ends `…then the settle.` (one paragraph, the § Visual regression mechanics list's third bullet) with:

```markdown
- **Motion is deterministic** — the config's `expect.toHaveScreenshot` block (`animations: 'disabled'`, `caret: 'hide'`, `maxDiffPixelRatio: 0.01`) freezes CSS motion only; the services marquee's JS transform loop is NOT CSS-freezable, so the home capture masks the marquee's STATIC outer section (`[data-strip='services']` — its bbox is layout-stable, so the mask covers the marquee area wherever the JS track sits inside it; masking the moving track itself would move the mask box per capture, the #225 home-dark flake). Every capture follows the **tall-viewport law (#255)** ordering: goto with `waitUntil: 'load'` (networkidle can hang on beacon-heavy pages) → lazy images forced eager (below-fold `loading="lazy"` images start loading regardless of viewport, BEFORE the page height is measured) → the images gate (`document.images` all `complete && naturalWidth > 0`, 30s — the image-led sections collapse while images are unresolved, so page height itself swings without it) → the decode gate (`img.decode()` on every image — `complete` proves the bytes arrived, not that Chromium rasterized the frame; #241's about-light flake captured blank-but-complete photos) → **resize the viewport to the measured page height** (width unchanged; measured after the images gate because unresolved images swing it) → the post-resize assertion (the re-measured scroll height must not exceed the viewport — viewport-height-dependent content fails loudly with a curated message rather than capturing; the root app shell is the only `min-h-screen` consumer, so the shell stretch is a no-op at content height) → the reveal-complete wait (`[data-reveal]:not([data-shown])` reaches zero — the shared `Reveal` wrapper's inert hooks, fired by intersection now that everything is in-viewport; `animations: 'disabled'` fast-forwards any transition still running at capture) → a ≥1s settle (the worst-case reveal tail ≈ 270ms column delay + 700ms transition) → the capture. At page height the capture is an in-viewport raster — the beyond-viewport fullPage path that intermittently dropped mid-page bands (#255's Class A flake: blank plate rows, blank portfolio tiles, page height reserved) is gone by construction, and the old scroll walk retired with it (everything intersects at page height; eager-forcing starts the loads the walk used to trigger).
```

- [✅] **Step 2: The eyeball + commit**

Read the section in full and confirm the bullet sits beside its two siblings (both themes / the detail slug) with the regen command block below unchanged. Then:

```bash
git add e2e/README.md
git commit -m "docs(e2e): the tall-viewport law and the decode/reveal gates in the visual mechanics (#255)"
```

### Task 4: The repo gates, the code PR, the teaser-redeploy probe

The landing/e2e code lands on main so the teaser serves the hook — Task 5's regen depends on it. The PR carries the plan file + Tasks 1–3's commits.

**Files:** none modified (the PR + evidence only).

**Interfaces:** consumes Tasks 1–3's commits; produces the merged main sha (the v1 pick's source, Task 7) + the live teaser serving `data-reveal` (Task 5's precondition).

**Not here:** any baseline regen (Task 5, on its own branch per the #241 law); the v1 pick (Task 7 — merge-time triage); `pnpm build` (not an AC here — zero runtime behavior change; CI's own build job is the deploy's lock).

- [✅] **Step 1: The repo gates**

```bash
pnpm check
```

Expected: green — the landing suite at its floor (16 files / 123 tests), lint/format/typecheck clean for the touched workspace; the api/api-client/admin floors untouched. Any count drift: reconcile before proceeding (never loosen).

- [✅] **Step 2: The PR**

```bash
git push -u origin fix/255-tall-viewport-captures
gh pr create --title "fix(e2e): deterministic visual captures — the tall-viewport law + decode/reveal gates (#255)" --body-file - << 'EOF'
Implements #255 (brief: https://github.com/jeius/sevendays/issues/255#issuecomment-6739331267). Class A capture determinism; Class B is fenced to #259.

- The tall-viewport law: after the images gate, the viewport resizes to the measured page height (width unchanged) with a loud post-resize assertion — the beyond-viewport fullPage rasterization path (the blank-band flake) is gone by construction; the scroll walk retired with it.
- The decode gate (`img.decode()` on every image) joins after the images gate — #241's about-light flake captured blank-but-complete photos.
- The reveal-complete wait over the shared Reveal wrapper's new inert `data-reveal`/`data-shown` hooks (belt and braces — fires by intersection at page height), then a ≥1s settle (worst-case reveal tail 270+700ms).
- The spec body was pre-verified: Biome-clean, 16 tests listed, zero new tsc errors (the 2 pre-existing e2e tsc errors are the deliberate baseline). Pre-deploy smoke vs the old baselines: <16 passed / the recorded diff classes>. `pnpm check` green; landing floor 16/123 held.
- The 16 baselines re-capture on intent in the follow-up visual PR once this merges and the teaser serves the hook (the reveal wait is vacuous until then — by design).
EOF
```

Squash-merge to main. Record the PR number + the merge sha (Task 7 cherry-picks it).

- [✅] **Step 3: The redeploy watch + the live-hook probe**

```bash
gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
```

Watch that run (`gh run watch <id> --exit-status`) — `Deploy teaser (main)` must succeed. Then prove the hook is live (SSR renders the attributes into the served HTML):

```bash
curl -s https://sevendays-landing.pahamajulius.workers.dev/services | grep -c 'data-reveal' \
  | tee .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/probe-data-reveal.txt
```

Expected: a count ≥ 1 (each service card is a Reveal wrapper). Zero: the deploy has not settled or the hook regressed — re-check the run, retry once after 60s; still zero: STOP and report on the issue.

### Task 5: The re-baseline — all 16, on intent, on `visual/255`

The baselines are born under the new capture path, against the deployed teaser serving the hook (Task 4's probe). The #241/#253 pattern: a `visual/` branch cut from MERGED main, the regen + eyeball + zero-diff there, then the PR. The eyeball is the law this ticket exists to protect — a regen passes by construction, so the eyeball is the only guard against a broken-baseline false green.

**Files:**
- Modify (committed on `visual/255`): `e2e/visual/redesign.spec.ts-snapshots/*.png` (the byte-differing subset of the 16)
- Create (evidence, gitignored): `old-<name>.png` copies, `dims-check.txt`, `eyeball-checklist.md`, `regen.txt`, `compare-post-regen.txt`

**Interfaces:**
- Consumes: merged main's spec (Task 2's chain) + the live teaser serving `data-reveal` (Task 4 Step 3).
- Produces: the visual PR's baseline set — what Task 6's 10-run gate compares against and what merges as the committed baselines; the eyeball verdicts Task 8's close comment cites.

**Not here:** the code (already on main — the branch carries ONLY baseline PNGs); `git checkout <sha> -- <baseline>` (NEVER — a baseline is born only from a real capture; `git show` into the EVIDENCE dir is the allowed comparison form); the 10-run gate (Task 6); v1 baselines (none exist).

- [✅] **Step 1: The branch + the pre-regen compare**

```bash
git switch main && git pull --ff-only origin main
git switch -c visual/255
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
pnpm exec playwright test e2e/visual \
  | tee .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/compare-pre-regen.txt
```

Expected: EITHER 16 passed (the committed baselines already hold within the 1% ratio under the new path — the regen then only rewrites byte-differing surfaces) OR pixel-diff failures on some surfaces (the raster path changed; the regen absorbs). Same STOP classes as Task 2 Step 4 (curated errors; Class A under the new chain); Class B → record as #259 evidence, re-run once for a clean mechanics record.

- [✅] **Step 2: The regen**

```bash
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
pnpm exec playwright test --update-snapshots=changed e2e/visual \
  | tee .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/regen.txt
git status --short e2e/ | tee .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/regen-changed-list.txt
```

Expected: the run reports 16 passed; the changed list names the byte-differing baselines (plausibly all 16 — an in-viewport raster need not be byte-identical to a beyond-viewport one — and plausibly fewer; an unchanged PNG stays byte-identical, which is itself evidence of path-invariance). **The zero-write edge:** if the changed list is EMPTY (compare was 16/16 and every PNG was byte-identical), there is nothing to commit — record that outcome in `regen.txt`'s margin, SKIP Steps 3–6's commit/PR (there is no visual PR; Task 6 runs its loop on main and Task 7 records no visual row; Task 8's close comment states the byte-identical outcome with the compare evidence). The `--update-snapshots=changed` flag is load-bearing: never bare `--update-snapshots` here.

- [✅] **Step 3: The dims check**

For every changed baseline (run from the repo root; `<name>` = e.g. `home-light-chromium-linux.png`):

```bash
cd /home/jeius/Projects/sevendays
for f in $(git status --short e2e/ | awk '{print $2}' | xargs -n1 basename); do
  git show "HEAD:e2e/visual/redesign.spec.ts-snapshots/$f" > ".superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/old-$f"
  echo "$f OLD: $(file -b ".superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/old-$f")" >> .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/dims-check.txt
  echo "$f NEW: $(file -b "e2e/visual/redesign.spec.ts-snapshots/$f")" >> .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/dims-check.txt
done
cat .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/dims-check.txt
```

Expected: every OLD/NEW pair reads `PNG image data, 1280 x <H>` with the SAME `<H>` per surface (the post-resize assertion already guarantees the height is content-driven; a baseline whose height changed means the capture path moved layout — STOP and reconcile before committing; never commit a height-changed baseline without an owner ruling).

- [✅] **Step 4: The eyeball (the README law — every changed PNG)**

For each changed baseline, open BOTH images (the evidence-dir `old-<name>.png` copy and the new `e2e/visual/redesign.spec.ts-snapshots/<name>` file) with the Read tool and compare them. Append one verdict line per PNG to `eyeball-checklist.md`:

```markdown
- <name>: CONTENT-IDENTICAL modulo capture path — no blank bands, no empty sections, every section populated (old <H>px = new <H>px)
```

A blank band, an empty section, a missing photo/plate row, or any content regression: **STOP — discard that capture** (restore nothing; report on the issue with the pair as evidence — the #253 discarded-write precedent). A section that differs ONLY in sub-pixel rasterization (antialiasing shifts within text/photo areas) is the expected "modulo the capture path" class: accept it.

- [✅] **Step 5: The zero-diff compare**

```bash
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
pnpm exec playwright test e2e/visual \
  | tee .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/compare-post-regen.txt
```

Expected: **16 passed**, zero diffs. A Class B instance → #259 evidence, re-run; anything else: STOP.

- [✅] **Step 6: Commit + push + the visual PR**

```bash
git add e2e/visual/redesign.spec.ts-snapshots
git commit -m "visual: the 16 baselines re-captured under the tall-viewport law (#255)"
git push -u origin visual/255
gh pr create --title "visual: the 16 baselines re-captured under the tall-viewport law (#255)" --body-file - << 'EOF'
#255's baseline half (the code landed in #<code-PR>; the teaser serves the hook). Re-captured on intent against the deployed teaser under the tall-viewport capture path: <N>/16 PNGs rewritten (byte-differing), <16-N>/16 byte-identical controls; every OLD/NEW dims pair equal (dims-check.txt); every changed PNG eyeballed CONTENT-IDENTICAL modulo the capture path (eyeball-checklist.md — no blank bands, no empty sections); compare 16/16 zero-diff post-regen. The 10-run stability gate's evidence joins before merge (the AC's ≥10 consecutive green full-suite runs).
EOF
```

Record the PR number. Do NOT merge yet — Task 6's gate lands first (the PR body promises it).

### Task 6: The 10-run stability gate, the merge, the on-main zero-diff

AC3: ≥10 consecutive full-suite compare runs green against the teaser (16/16 each) — the pre-fix rate was ~5 failures across 4 full-suite runs, so 10 clean runs is meaningful evidence. The loop runs SEQUENTIALLY (the flake lived in full-suite context, never in isolated runs) in the BACKGROUND (10 runs ≈ 20–60 min; the Bash timeout cap is 10 min) against the branch's on-disk baselines — byte-identical to what the visual PR merges.

**Files:** none modified (evidence only).

**Interfaces:** consumes Task 5's baselines-on-disk + the deployed teaser; produces `stability-run-01..10.txt` + `stability-summary.txt` — the AC3 evidence Task 8's close comment cites.

**Not here:** parallelization of the loop (sequential is the point); any spec/baseline edit mid-gate (a red run is diagnosed, never patched around); #259's sentinels (Class B is handled by the carve-out below, recorded, not fixed).

- [✅] **Step 1: The loop (run as a BACKGROUND task — `run_in_background: true`)**

> **Amendment (owner-ruled 2026-11-11 at execution):** the loop runs with a ~60s sleep BETWEEN runs. The pinned back-to-back shape collapsed the free-tier teaser landing worker into persistent CF Error 1102 ("Worker exceeded resource limits") at runs 06–20 of the first two loops — ~20 full suites ≈ 1500 sequential SSR page loads in ~35 min tipped the worker's CPU budget, twice, the second time NOT self-recovering at rest (full incident record in the SDD ledger). The gapped shape keeps AC3's substance — 10 CONSECUTIVE green full-suite runs, 16/16 each — while shedding the sustained-load pressure that induced the outage. The Class B carve-out below is unchanged.

```bash
cd /home/jeius/Projects/sevendays
S=.superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture
: > "$S/stability-summary.txt"
ok=0
for i in $(seq -w 1 10); do
  E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
  E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
  pnpm exec playwright test e2e/visual > "$S/stability-run-$i.txt" 2>&1
  if grep -q '16 passed' "$S/stability-run-$i.txt"; then
    ok=$((ok+1)); echo "run $i: 16 passed" >> "$S/stability-summary.txt"
  else
    echo "run $i: RED — diagnose by the flake-signature law before any re-run" >> "$S/stability-summary.txt"
  fi
done
echo "GREEN RUNS: $ok/10" >> "$S/stability-summary.txt"
```

The loop ALWAYS writes all ten run logs then the summary — a red run does not abort the loop; you diagnose from the logs.

- [✅] **Step 2: The verdict**

Read `stability-summary.txt`. **`GREEN RUNS: 10/10`** → AC3 met; proceed to Step 3. **A red run:** open its log and diagnose by the flake-signature law —
  - **Class B** (its log shows a received height ≪ expected): append `run N: Class B — recorded for #259, counter restarted` to the summary, then re-run Step 1 as a fresh loop sized to top the consecutive count back up to 10 (e.g. one Class B at run 7 leaves runs 8–10 as 3 consecutive green — one more 7-run loop completes 10; a Class B at run 1 restarts from zero with a full 10-run loop). Class B is #259's fenced flake — it never counts as this ticket's failure, but each instance is evidence: post it to #259 (`gh issue comment 259 --body "Class B recurrence under #255's gate: <test names + dims from the log>"`) at Task 8.
  - **Class A or a curated error** (equal heights + blank-band diff, or a `#255 tall-viewport law` / `#255 decode gate` message): the fix itself failed — STOP: comment the evidence on #255 and report back; do not merge the visual PR.
  - **Genuine drift** (specific surfaces, changed dims, populated content — a CMS edit mid-gate): the baselines are advisory; re-run Task 5's regen+eyeball for the drifted surfaces on `visual/255`, push to the open PR, restart the 10-run count.

- [✅] **Step 3: Merge the visual PR + the on-main zero-diff**

```bash
gh pr merge <visual-PR> --squash
git switch main && git pull --ff-only origin main
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
pnpm exec playwright test e2e/visual \
  | tee .superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/compare-on-main.txt
```

Expected: merged; the on-main compare reports **16 passed** (the #253 closing-proof pattern). Record the visual PR's merge sha. (If Task 5 took the zero-write edge, there is no visual PR — this compare on main IS the closing proof.)

### Task 7: The v1 SPLIT — the code PR's pick, the visual PR's skip

The runbook loop (`docs/agents/v1-picks.md`) for both PRs, one row per PR. Pre-classified at plan time: the code PR = **SPLIT** (reveal.tsx is a v1-path — not in `scripts/seed-v1/paths.txt`, byte-identical on v1 pre-change — plus three main-only paths: `e2e/visual/redesign.spec.ts`, `e2e/README.md`, the plan file); the visual PR = **pure SKIP** (all `e2e/`, main-only via `paths.txt:32`). The classifier confirms; content pass verifies the reveal hunk (inert hooks — no booking tokens, no edition mechanics).

**Files:** none in the main workspace (all work in `~/Projects/sevendays-v1-seed`).

**Interfaces:** consumes the two merge shas (Tasks 4 + 6); produces the v1 pick commit `<v1-sha>` + the provenance lines the superset check reads.

**Not here:** the visual PR as a pick (baselines are teaser-only forever — no v1 baselines exist); any v1-authored content; the ledger rows' commit (Task 8 lands them on main).

- [✅] **Step 1: The path pass (main workspace)**

```bash
node scripts/v1-triage.mjs <code-PR-merge-sha>
```

Expected verdict: **SPLIT** — v1-paths: `apps/landing/src/components/reveal.tsx`; MAIN-ONLY: `e2e/visual/redesign.spec.ts`, `e2e/README.md`, `docs/superpowers/plans/2026-11-11-255-visual-tall-viewport-capture.md`. Then the content pass: `git show <code-PR-merge-sha> -- apps/landing/src/components/reveal.tsx` — the hunk is two inert attributes + a comment; nothing trips the booking/edition/deployment rules. Any different verdict: STOP and reconcile against the runbook before executing.

- [✅] **Step 2: Execute the SPLIT (the runbook's recipe, verbatim)**

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1 && git fetch origin main
git cherry-pick -n <code-PR-merge-sha>    # exits 1 on the deleted-by-us main-only paths — expected
git status --short                        # M reveal.tsx · DU/A = the three main-only paths
git rm -qrf --ignore-unmatch -- e2e/visual/redesign.spec.ts e2e/README.md docs/superpowers/plans/2026-11-11-255-visual-tall-viewport-capture.md
git commit -F - <<EOF
$(git log -1 --format=%B <code-PR-merge-sha>)

(cherry picked from commit $(git rev-parse <code-PR-merge-sha>))
Split: main-only paths dropped — e2e/visual/redesign.spec.ts, e2e/README.md, docs/superpowers/plans/2026-11-11-255-visual-tall-viewport-capture.md
EOF
```

(The blank line after the `%B` line is load-bearing — the runbook's note.) The pick should apply CLEAN (v1's reveal.tsx is byte-identical to main's pre-change copy — probed at plan time); any conflict there: STOP and reconcile against the runbook's conflict policy.

- [✅] **Step 3: The locks**

```bash
cd ~/Projects/sevendays-v1-seed
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check && pnpm build
cd /home/jeius/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed
cd ~/Projects/sevendays-v1-seed && git push origin v1
gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch <run-id> --exit-status
gh run view <run-id> --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
```

Expected: install/build:packages/api-build green; `check` green at the v1 floors (the #264 row's observed: check 35/35, build 7/7 — reconcile any drift, never loosen); the absence audit **exit 0** (0/18 tokens); the pushed run shows `check: success` + `Deploy v1 (private): success` + `Deploy teaser (main): skipped`. Record `<v1-sha>` + the run id.

### Task 8: The close-out — progress, the ledger rows, #259 evidence, the issue, graphify

Pure main-only close-out. The docs commit pushes directly to main (the `cda981b` pattern).

**Files:**
- Modify: `docs/progress.md` (one dated entry, appended beside the #256 entry in "Notes for Future Sessions")
- Modify: `docs/agents/v1-picks.md` (two rows at the ledger tail: the code PR's SPLIT, the visual PR's SKIP)

**Interfaces:** consumes every task's evidence files + the three shas/PR numbers; produces the close comment on #255 (+ any #259 evidence comments).

**Not here:** `AGENTS.md` (no floor or ruling changes); reopening #259 (its evidence posts as comments only); any ADR.

- [✅] **Step 1: The progress entry**

Append to `docs/progress.md` in "Notes for Future Sessions", directly after the #256 entry, filling bracketed values from the actual runs:

```markdown
- **2026-11-XX — the e2e visual capture determinism fixed (#255) — the tall-viewport law.** The visual suite's captures became deterministic (the Class A flake — blank mid-page bands at identical page height, #241's about-light original plus three triage instances — is gone by construction): after the images gate the viewport resizes to the measured page height (width unchanged; the root app shell is the only min-h-screen consumer, probed) with a loud post-resize assertion, a decode gate (`img.decode()` — the blank-but-complete-photo class) and a reveal-complete wait over the shared Reveal wrapper's new inert `data-reveal`/`data-shown` hooks join the chain, the settle doubled to 1s (worst-case reveal 270+700ms), and the scroll walk retired (everything intersects at page height). The e2e README's mechanics bullet carries the ruled ordering; the 16 baselines re-captured on intent on `visual/255` (<N> rewritten, every OLD/NEW dims pair equal, all changed eyeballed content-identical modulo the capture path, zero-diff 16/16); the stability gate <10/10 consecutive green full-suite runs — <Class B instances, if any, recorded to #259 with the counter restarted each time>; landing floor unchanged (16 files / 123 tests — the hooks are inert). Class B (pages capturing without their data) stays fenced to #259.
```

- [✅] **Step 2: The two ledger rows**

Append both rows to `docs/agents/v1-picks.md`'s ledger tail (the visual row only if its PR exists — the zero-write edge records the code row alone and says so), then push:

```markdown
| 2026-11-XX | #<code-PR> | `<main-sha>` | split | `<v1-sha>` | #255 — the e2e visual capture determinism (the tall-viewport law + decode/reveal gates, the scroll walk retired) + the shared Reveal wrapper's inert data-reveal/data-shown hooks. Classifier SPLIT — 1 v1-path (reveal.tsx) + 3 main-only (e2e/visual/redesign.spec.ts, e2e/README.md, the plan file). v1's reveal.tsx byte-identical pre-change — applied clean, zero conflicts; content pass clean (inert DOM hooks, no booking tokens). Locks: install(frozen)/build:packages/api-build green, check + build green at the v1 floors, absence audit PASS 0/18; run <run-id> `check` + `Deploy v1 (private)` success, `Deploy teaser (main)` skipped. Baselines: the visual PR <#visual-PR or "the zero-write edge — every PNG byte-identical under the new path; no visual PR"> — its own row below. |
| 2026-11-XX | #<visual-PR> | `<main-sha>` | skip | — | #255's baseline half: <N>/16 PNGs re-captured under the tall-viewport law against the redeployed teaser (<16-N> byte-identical controls); every OLD/NEW dims pair equal; all changed PNGs eyeballed content-identical modulo the capture path; zero-diff 16/16 on the branch and on main; the 10-run stability gate <verdict>. All e2e/ — main-only (paths.txt:32); pure SKIP (ADR-0022: teaser-only baselines). |
```

```bash
git switch main && git pull --ff-only origin main
git add docs/progress.md docs/agents/v1-picks.md
git commit -m "docs(v1-picks): the #255 rows — the code SPLIT + the visual SKIP — and the progress entry (#255)"
git push origin main
```

- [✅] **Step 3: The #259 evidence (only if Class B instances were recorded)**

For each Class B instance caught by the gates (Tasks 2/5/6), post it where the split's triage will find it:

```bash
gh issue comment 259 --body "Class B recurrence observed under #255's gates (2026-11-XX): <test name(s)> — expected 1280×<H1>, received 1280×<H2> (data absent). Log: <the evidence file's failing block, quoted>. No sentinel existed to catch it (fenced by design in #255); the capture-determinism fix is unaffected."
```

Skip this step entirely if no Class B instance occurred.

- [✅] **Step 4: Close the issue**

```bash
gh issue close 255 --comment "Landed in #<code-PR> (main \`<main-sha>\`, v1 split \`<v1-sha>\`; the baselines in #<visual-PR or the zero-write note>). AC1 the settle chain is load → eager-forcing → images gate → decode gate → resize to measured page height → post-resize assertion → reveal-complete wait → settle ≥1s → capture, the walk retired, documented in e2e/README.md's mechanics bullet. AC2 all 16 baselines regenerated in one PR on intent and eyeballed complete per the README law (dims-check.txt: every OLD/NEW pair equal; eyeball-checklist.md: content-identical modulo the capture path, no blank bands, no empty sections). AC3 the stability gate: <10/10 or the Class-B-adjusted verdict> consecutive full-suite green runs against the teaser, 16/16 each (stability-summary.txt + the ten run logs). AC4 pnpm check green; the landing floor held (16 files / 123 tests — the hooks are inert). AC5 both ledger rows recorded (the code SPLIT + the visual SKIP). Class B stays fenced to #259 — <its evidence comments, if any, linked here>."
```

- [✅] **Step 5: Graphify + the final sweep**

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#255 graph update"
git push origin main
```

(If `graphify update .` reports no changes, skip the empty commit.) Final sweep: the main workspace's tree clean (all evidence stays gitignored under `.superpowers/`); both PR branches deleted after merge; this plan file's boxes ticked `- [✅]` throughout.



