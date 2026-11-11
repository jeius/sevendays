# E2E Visual Data-Present Sentinels Implementation Plan (#259)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **This ticket is NOT UI-bearing** — zero `apps/`/`packages/` changes; the sentinels assert the EXISTING rendered DOM from the spec side only (the brief's AC5: "Zero baseline changes (spec-side only)"). The UI/UX skill-set loading rule does not apply. Long-running: nothing stays up between tasks except the Task 4 background gate loop; every Playwright run targets the DEPLOYED teaser (ADR-0022 — never a local server).

**Goal:** Every one of the visual suite's 16 tests (8 surfaces × 2 themes) asserts its surface's data-bearing DOM before capture — a page whose data never arrived fails loudly with a named surface, a named seam, and a compact page-state dump, instead of capturing an empty page against its baseline (a nightly false-fail, or under `--update-snapshots` a silently-written empty baseline that is a false green forever).

**Architecture:** Seven tasks: (1) the spec — a per-surface `SENTINELS` map (surface name → self-contained in-page predicate returning null or the missing seam's name) + a `sentinelFailureMessage` helper (the page-state dump with the Cloudflare-1102 attribution line), evaluated between the images gate and the decode gate — the whole file pre-verified this session (Biome-clean, zero new tsc errors, 16 tests listed); (2) the mis-point demo (AC3) — one sentinel temporarily pointed at a nonexistent seam, the curated failure recorded for the PR body, reverted; (3) the e2e README — the sentinel-law bullet + the Motion chain's ordering amendment; (4) the repo gates + the ≥5-consecutive-green stability gate under the owner-ruled ~60s-gap shape, with the degraded-edge diagnosis table; (5) the PR (evidence quoted in the body) + squash-merge; (6) the v1 pick — pure SKIP (all paths main-only), classifier run for the record; (7) the close-out — progress entry, ledger row, the issue's AC walk, graphify.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs), zero migrations, zero `apps/`/`packages/` changes. `@playwright/test` **1.63.0** (chromium **1243**), Biome **2.5.11**, TypeScript (the differential tsc gate below — `@types/node` is deliberately NOT installed at the root; the 2 pre-existing tsc errors are the baseline, never "fixed" here), `gh` CLI, GitHub Issues.

**Spec:** Implements ticket [#259 "e2e visual: pages can capture WITHOUT their data — the image gate is vacuous when content never arrives (split from #255)"](https://github.com/jeius/sevendays/issues/259) (labels `bug` + `ready-for-agent`), whose contract is the [agent brief](https://github.com/jeius/sevendays/issues/259#issuecomment-6739323771) (2026-11-09) plus the [Class B recurrence comment](https://github.com/jeius/sevendays/issues/259#issuecomment-6796201399) (2026-11-11: the CF Error 1102 imposter with the same shell-height signature, the `error code: 1102` body marker, the ~60s-gap gate ruling). Key recon facts (2026-11-11, main `add5a04`, tree clean — post-#255/#263; every file below read whole this session):

- **The spike evidence (this session; the tree restored byte-identical after):** the full new spec body pinned in Task 1 was assembled and proven IN the consuming location — `pnpm exec biome check e2e/visual/redesign.spec.ts` **clean** (after one formatter wrap + one `useOptionalChain` fix the plan adopts verbatim); the differential tsc gate (pinned below) reports **EXACTLY the 2 pre-existing errors** — `e2e/smoke/env.ts(11,17) TS2591 'process'` + the spec's own `img.loading` on `Element` (at `200,17` in the new file — the insertion shifts it from 89; the pair is the gate, not the line number) — zero NEW errors; `E2E_BASE_URL=http://127.0.0.1:9 pnpm exec playwright test --list e2e/visual` lists **"Total: 16 tests in 1 file"**; and the live full-suite run against the teaser (after the degraded-edge window below passed) **passed 16/16**.
- **The seams, verified against the rendered source** (every predicate below read out of the component that renders it): home — `[data-strip='featured']` exists iff the packages read is non-empty (`featured-plates.tsx:33`, rendered only under `packages.length > 0` at `home-image-led.tsx:230`) and `[data-strip='gallery'] figure` holds the mosaic photos (`mosaic-photo-grid.tsx:25` — one `figure` per photo; the zero-photo empty line renders no figure); packages-index — `a[href^='/packages/']` is the repo's own plate convention (the #256 harness counts plates exactly so; `catalog-plates.tsx:75`) and NEVER matches chrome: `NAV_LINKS` (`apps/landing/src/lib/nav.ts`) emits exactly `/packages` with no trailing slash; package-detail — `a[href^='/book?package=']` (unique to the detail's CTA, `package-detail.tsx:52`) + the always-rendered `What's included` h2 (`package-detail.tsx:66` — `InclusionsGrouped` may collapse, the section h2 never does); services — `a[href^='/book?service=']` (`service-card.tsx:110`); branches — `a[href^='/book?branch=']` (`branch-card.tsx:75`); about — the CDP-asserted pair `[data-portfolio-grid]` + `[data-gallery-tabs]` (`about.tsx:104,127`) + kind words as `figure blockquote` (`about.tsx:146-147` — the mosaic's portfolio figures carry img+figcaption, never blockquote, so the selector isolates kind words); share-your-story — `#story-quote` + `#story-person` (`share-your-story.tsx:108,129`); not-found — the ruled h1 `This page never developed.` (`not-found.tsx:20`) + the root chrome's `<header>` (`site-header.tsx:26` — `__root.tsx` wraps every surface incl. NotFound in it).
- **The 1102 attribution, evidence-pinned:** #255's incident ledger records the CF throttle page's 503 body as literally `error code: 1102` (`.superpowers/sdd/2026-11-11-255-visual-tall-viewport-capture/progress.md`, entry 58). The dump tests the FULL body text for that marker (not the 200-char head — the marker rides the page footer) and appends the attribution line.
- **The degraded-edge window, observed live this session (2026-11-11):** the teaser answered 200s at 3.3s/7.9s/38s/203s across probes, and a first full compare ABORTED in `beforeAll` — the packages fetch exceeded the default 30s hook timeout (the API answered 200 in 38s on a direct probe). This is the same free-tier CPU-degradation class #255's incident recorded. Consequences baked into this plan: the beforeAll-timeout mode joins the diagnosis table (Task 4), the gate never reruns into a degraded edge, and Task 1's live compare carries the recorded-instance carve-out. After a ~90s rest the edge recovered and the SAME spiked file ran the full suite live: **16 passed (1.0m)** — every sentinel false-positive-free across all 8 surfaces × both themes, every compare zero-diff vs the committed baselines (the pixel-free proof, executed not just argued). The teaser otherwise serves the post-#255 bundle (4 `data-reveal` + 4 service cards on a fetched `/services`).
- **The baseline law (AC5):** #255 closed on the zero-write edge — every committed baseline is byte-identical under the tall-viewport capture path (the #251/#253 captures, proven path-invariant). This ticket touches no capture mechanics AFTER the sentinel block (the chain downstream of the insertion is byte-identical) and no baselines: the compare runs ARE the proof.
- **The v1 disposition, pre-classified:** every path this ticket touches is main-only — `e2e` + `.github/workflows/e2e.yml` per `scripts/seed-v1/paths.txt:32,34`, and the plan/docs files per the #265 row's own classification. The PR = pure **SKIP**; the classifier run (Task 6) is for the record; zero v1-workspace work.
- **No `pnpm check` gate covers `e2e/`:** the root package is not a workspace member — the differential tsc + biome + `--list` gates below exist because a type error would otherwise surface only mid-Task-4's gate loop, an expensive place to learn. `pnpm check` still runs once (Task 4) as the PR gate — everything it covers is untouched, so green is by construction, but the repo rule ("do not commit code that fails `pnpm check`") wants the run recorded.

## Global Constraints

- **Branch:** `fix/259-data-present-sentinels` off main `add5a04` (confirm `git status` clean first; if main has moved, branch off latest main AND verify `git diff add5a04..main -- e2e/visual/redesign.spec.ts e2e/README.md` is EMPTY — the whole-file pin below must not silently revert drift; a non-empty diff: STOP and reconcile). This plan file is the branch's first commit (`docs(plan): the #259 implementation plan`). Commit messages follow the repo's `type(scope): … (#259)` squash style; every commit below is pinned verbatim.
- **The pinned-edit law:** every find/replace pair below matched EXACTLY ONCE in its file at plan time (against `add5a04`). If any find matches ≠ 1 at execution, STOP — the file drifted; reconcile against main before editing.
- **The visual-run law:** every Playwright invocation runs from the repo root against the DEPLOYED teaser — `E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev` `E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev` (the GitHub `teaser` environment's values, #241-pinned) — NEVER a local dev server (ADR-0022). Command forms exactly `pnpm exec playwright test e2e/visual` (compare) and `pnpm exec playwright test e2e/visual -g '<pattern>'` (filtered) — the README's `pnpm test:e2e -- e2e/visual` form forwards BOTH arguments and fails to filter; local `retries: 0` (the config), so every verdict is a true first attempt.
- **The e2e-file gates (per touched file):** `pnpm exec biome check <file>` clean (zero diagnostics); the differential tsc — `pnpm exec tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler e2e/visual/redesign.spec.ts` — reports EXACTLY the 2 pre-existing errors (`e2e/smoke/env.ts(11,17) TS2591` + the spec's `img.loading` TS2339 — its line moves with the insertion, `200,17` at plan time) and nothing more (the pair is the deliberate baseline — `@types/node` is intentionally absent from the root; do not "fix" either error in this ticket); `E2E_BASE_URL=http://127.0.0.1:9 pnpm exec playwright test --list e2e/visual` → "Total: 16 tests in 1 file".
- **The zero-baseline law (AC5):** `--update-snapshots` NEVER runs in this ticket; `e2e/visual/redesign.spec.ts-snapshots/` stays byte-identical (`git status --short e2e/visual/redesign.spec.ts-snapshots/` empty at every commit). A pixel diff at compare time means content drift or a chain regression — diagnosed, never regenerated here.
- **The degraded-edge law (this session's lesson + #255's incident):** the teaser's free-tier worker degrades under sustained sequential SSR load — 200s at 30s+ latencies, CF Error 1102 throttle pages, beforeAll hook timeouts. EVERY red run is diagnosed against Task 4's table BEFORE any rerun; never rerun into a degraded edge (immediate reruns prolonged #255's incident); the stability gate's ~60s inter-run gap is mandatory (owner-ruled 2026-11-11); at-rest recovery waits are ≥15 min.
- **The fences (NOT here, regardless of temptation):** **any `apps/` or `packages/` change** (the sentinels assert the EXISTING DOM — no `data-sentinel` hooks, no component edits, no redeploy, no two-step deploy law, no landing suite gates); **the capture mechanics** — everything downstream of the inserted sentinel block (decode gate, tall-viewport resize, post-resize assertion, reveal wait, settle, mask, capture) stays byte-identical; **`playwright.config.ts`** byte-identical; **the marquee mask law**; **`.github/workflows/e2e.yml`**, the nightly schedule, the ADR-0022 fences (chromium-only, never PR-gating, advisory baselines); **the empty-state UX owner question** (retry/skeleton/graceful — fenced in the issue body, ruled separately; the sentinel is correct under either ruling); **the reliability investigation** (why fetches intermittently fail — the sentinel makes it visible, not absent); **`AGENTS.md`**; sibling tickets' files (#260 Hyperdrive, any future #222 work).
- **Evidence:** `.superpowers/sdd/2026-11-11-259-data-present-sentinels/` (gitignored) — one named file per run, named in the steps.
- **Tick law:** `- [✅]` in this file and issue bodies alike, never plain `[x]`. Never commit secrets. `graphify update .` at close (code was modified) — its `graphify-out/` changes commit as their own `chore(graphify): post-#259 graph update` commit (the `add5a04` pattern).

## File Structure

```text
e2e/visual/redesign.spec.ts   # modify (T1) — whole-file pin: the SENTINELS map + sentinelFailureMessage + the in-test evaluation
e2e/README.md                 # modify (T3) — the data-present sentinel bullet + the Motion chain amendment
.superpowers/sdd/2026-11-11-259-data-present-sentinels/   # evidence (gitignored)
docs/progress.md  docs/agents/v1-picks.md  graphify-out/   # T7 (main-only)
```

---

### Task 1: The spec — the per-surface sentinel map, the failure dump, the in-test evaluation

The ticket's core. A `SENTINELS` record keyed by surface name holds one self-contained in-page predicate per surface (Playwright serializes the function SOURCE into the page — closures over module bindings would throw at run time, so every predicate touches only `document`); each returns `null` (data present) or the missing seam's name. The test loop evaluates its surface's predicate between the images gate and the decode gate — before any measurement, so the dump's `scrollHeight` reads the standard-viewport height, which is exactly the Class B signature. `sentinelFailureMessage` builds the curated message with the page-state dump and the Cloudflare-1102 attribution line. The FULL new file is pinned below — assembled and machine-verified this session (Biome-clean; zero new tsc errors; 16 tests listed) — so the edit is a whole-file replace, exactly-once by construction.

**Files:**
- Modify: `e2e/visual/redesign.spec.ts` (the whole file; the delta vs main is: the `type Page` import, the `SENTINELS` map + its comment, the `sentinelFailureMessage` helper + its comment, and the 12-line sentinel block inside the test body — everything else byte-identical to main's `add5a04` copy)

**Interfaces:**
- Consumes: main's spec as-is (the #255 tall-viewport chain — untouched downstream of the insertion); the surfaces' rendered DOM (the seams table in the header).
- Produces: the sentinel law every later task cites — the map name `SENTINELS`, the helper `sentinelFailureMessage(name: string, missingSeam: string, page: Page): Promise<string>`, the failure-message prefix `#259 data-present sentinel: <surface> — <seam>.` followed by ` Page state: title=… readyState=… scrollHeight=…px images=<complete>/<total> complete body-head=…` (and, when the full body text matches `/error code: 1102/i`, the suffix ` — Cloudflare Error 1102 marker present: worker resource-limit throttling, not a data race`). Task 2's mis-point and Task 4's diagnosis table quote these verbatim.

**Not here:** any landing/package source change (the predicates assert existing DOM — adding `data-*` hooks would violate AC5's spec-side-only reading); any change to the chain downstream of the sentinel block (decode gate onward, byte-identical); `playwright.config.ts`; any sentinel on surfaces beyond the brief's eight; retry/skip logic (a red run is a red run).

- [ ] **Step 1: The whole-file replace**

Overwrite `e2e/visual/redesign.spec.ts` with EXACTLY this content (the session-verified artifact):

```ts
import { expect, type Locator, type Page, test } from '@playwright/test';

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

// The data-present sentinels (#259): per-surface predicates over the
// data-bearing DOM, evaluated in the page AFTER the images gate and
// BEFORE the decode gate. The images gate is vacuous on a page whose
// data never arrived — no images to wait for — so the Class B flake
// (an about captured at 734px against its 2238px baseline, a not-found
// at the bare 720px shell) sailed through to a capture. Each predicate
// returns null when its surface's data is present or names the missing
// seam when it is not; a missing seam fails loudly with the page-state
// dump below — never a skip, never a retry (the beforeAll empty-catalog
// law's sibling: a data-less capture is a red run, and under
// --update-snapshots a silently-written empty baseline is a false green
// forever). The functions are deliberately self-contained: Playwright
// serializes the function SOURCE into the page, so closures over module
// bindings would throw at run time. Selectors are the repo's own
// conventions (the #256 packages-pages harness counts plates as
// a[href^='/packages/']; nav links are exactly '/packages', so the
// trailing-slash prefix never matches chrome).
const SENTINELS: Record<(typeof SURFACES)[number][0], () => string | null> = {
  home: () => {
    if (!document.querySelector("[data-strip='featured']")) {
      return "the featured plates strip is absent ([data-strip='featured']) — the packages read never rendered";
    }
    return document.querySelector("[data-strip='gallery'] figure")
      ? null
      : "the gallery mosaic rendered no photo figures ([data-strip='gallery'] figure) — the gallery read never rendered";
  },
  'packages-index': () =>
    document.querySelector("a[href^='/packages/']")
      ? null
      : "the plates grid rendered no detail-linked plate (a[href^='/packages/']) — the packages read never rendered",
  'package-detail': () => {
    if (!document.querySelector("a[href^='/book?package=']")) {
      return "the book CTA is absent (a[href^='/book?package=']) — the package read never rendered";
    }
    return Array.from(document.querySelectorAll('h2')).some((h) =>
      h.textContent?.includes("What's included")
    )
      ? null
      : "the inclusions section is absent (the What's included h2) — the detail rendered without its spec sheet";
  },
  services: () =>
    document.querySelector("a[href^='/book?service=']")
      ? null
      : "the services grid rendered no service row (a[href^='/book?service=']) — the services read never rendered",
  branches: () =>
    document.querySelector("a[href^='/book?branch=']")
      ? null
      : "the branch strip rendered no branch card (a[href^='/book?branch=']) — the branches read never rendered",
  about: () => {
    if (!document.querySelector('[data-portfolio-grid]')) {
      return 'the portfolio grid is absent ([data-portfolio-grid]) — the gallery read never rendered';
    }
    if (!document.querySelector('[data-gallery-tabs]')) {
      return 'the gallery tab row is absent ([data-gallery-tabs]) — the gallery read never rendered';
    }
    return document.querySelector('figure blockquote')
      ? null
      : 'the kind-words wall rendered no quote (figure blockquote) — the testimonials read never rendered';
  },
  'share-your-story': () =>
    document.querySelector('#story-quote') && document.querySelector('#story-person')
      ? null
      : 'the form chrome is absent (#story-quote / #story-person) — the route rendered without its form',
  'not-found': () => {
    const h1 = document.querySelector('h1');
    if (!h1?.textContent?.includes('This page never developed.')) {
      return 'the ruled field copy is absent (the "This page never developed." h1)';
    }
    return document.querySelector('header')
      ? null
      : 'the site chrome is absent (header) — the shell rendered without the header';
  },
};

// The sentinel failure message: the surface, the missing seam, and a
// compact page-state dump — enough to identify the render path on the
// next occurrence (the ruled empty-state copy vs the "Something went
// wrong." error boundary vs a partial HTML stream vs the Cloudflare
// throttle page, whose evidence-pinned body marker 'error code: 1102'
// (#255's incident) gets its own attribution line so nightly logs name
// platform throttling instead of masking it as a data race).
async function sentinelFailureMessage(
  name: string,
  missingSeam: string,
  page: Page
): Promise<string> {
  const state = await page.evaluate(() => {
    const images = Array.from(document.images);
    const bodyText = document.body?.innerText ?? '';
    return {
      title: document.title,
      readyState: document.readyState,
      scrollHeight: (document.scrollingElement ?? document.documentElement).scrollHeight,
      completeImages: images.filter((img) => img.complete && img.naturalWidth > 0).length,
      totalImages: images.length,
      bodyHead: bodyText.replace(/\s+/g, ' ').trim().slice(0, 200),
      cf1102: /error code: 1102/i.test(bodyText),
    };
  });
  return (
    `#259 data-present sentinel: ${name} — ${missingSeam}. ` +
    `Page state: title=${JSON.stringify(state.title)} readyState=${state.readyState} ` +
    `scrollHeight=${state.scrollHeight}px ` +
    `images=${state.completeImages}/${state.totalImages} complete ` +
    `body-head=${JSON.stringify(state.bodyHead)}` +
    (state.cf1102
      ? ' — Cloudflare Error 1102 marker present: worker resource-limit throttling, not a data race'
      : '')
  );
}

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
        // The data-present sentinel (#259) sits between the images gate
        // and the decode gate: the images gate passes vacuously when the
        // data never arrived (no images to wait for), so each surface
        // asserts its data-bearing DOM here and fails loudly with the
        // page-state dump instead of capturing — before any measurement
        // (the dump's scrollHeight then reads the standard-viewport
        // height, which is exactly the Class B signature: a shell-height
        // page where the baseline expects content height).
        const missingSeam = await page.evaluate(SENTINELS[name]);
        if (missingSeam !== null) {
          throw new Error(await sentinelFailureMessage(name, missingSeam, page));
        }
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

- [ ] **Step 2: The three e2e gates**

```bash
pnpm exec biome check e2e/visual/redesign.spec.ts
pnpm exec tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler e2e/visual/redesign.spec.ts
E2E_BASE_URL=http://127.0.0.1:9 pnpm exec playwright test --list e2e/visual
```

Expected: Biome "Checked 1 file … No fixes applied" with zero diagnostics; tsc prints EXACTLY the 2 pre-existing errors (`e2e/smoke/env.ts(11,17): error TS2591` + `e2e/visual/redesign.spec.ts(200,17): error TS2339` — the img.loading line; anything more is a regression: STOP); the list ends "Total: 16 tests in 1 file".

- [ ] **Step 3: The live compare — the false-positive proof (stack is the deployed teaser)**

```bash
mkdir -p .superpowers/sdd/2026-11-11-259-data-present-sentinels
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
pnpm exec playwright test e2e/visual \
  | tee .superpowers/sdd/2026-11-11-259-data-present-sentinels/compare-t1.txt
```

Expected: **16 passed** — the sentinels are pixel-free (they assert and return; the chain downstream is byte-identical), so the committed baselines hold, and every surface's data-bearing DOM is present on the seeded teaser (no false positives — this run is the empirical proof of the seams table). Carve-outs, diagnosed per the degraded-edge law (a rerun only after the stated wait):
  - **A `#259 data-present sentinel:` failure** — STOP: a false positive against the seams table (or a live Class B). Read the dump: if `body-head` shows the `Something went wrong.` boundary, a loader threw (a live Class B, mechanism (a) — record it, wait ≥15 min, rerun); if the page looks populated, the predicate is wrong — reconcile against the component source before touching anything.
  - **A `beforeAll` hook timeout** — edge degradation (observed live at plan time: a 38s 200 from the API): wait ≥15 min, rerun (≤3 attempts, each recorded as `compare-t1-flake-N.txt`).
  - **A `#255` curated message or an equal-height blank-band diff** — a #255 regression under a byte-identical chain: impossible by construction — STOP and report.
  - **A pixel diff with populated content on both sides** — genuine drift: record; do NOT regenerate (the zero-baseline law); surface to the owner at the PR.
  If no clean 16/16 in 3 attempts: PROCEED (static gates green + the artifact pre-verified + Task 4's gate re-proves) with every instance recorded.

- [ ] **Step 4: Commit**

```bash
git status --short e2e/visual/redesign.spec.ts-snapshots/   # must be EMPTY (the zero-baseline law)
git add e2e/visual/redesign.spec.ts
git commit -m "fix(e2e): the data-present sentinels — every surface asserts its data before capture (#259)"
```

### Task 2: The mis-point demo — AC3's loud-fail path, proven without a live flake

The brief's AC3: "The loud-fail path is demonstrated without a live flake: locally mis-point one sentinel at a nonexistent seam, show the curated failure in the PR description, then revert the mis-point." The not-found sentinel is the cheapest victim (its page is fast and data-free), and the mis-point is one string. The sentinel work is COMMITTED (Task 1), so the revert is a plain `git restore` back to the committed state — the demo leaves zero trace in the tree, only the evidence file.

**Files:**
- Modify (temporarily, reverted in-step): `e2e/visual/redesign.spec.ts` (one string inside `SENTINELS['not-found']`)
- Create (evidence, gitignored): `.superpowers/sdd/2026-11-11-259-data-present-sentinels/mispoint-demo.txt`

**Interfaces:**
- Consumes: Task 1's committed sentinel map + failure machinery.
- Produces: `mispoint-demo.txt` — the curated failure output Task 5's PR body quotes verbatim (AC3's evidence).

**Not here:** any other sentinel (one surface proves the path — the machinery is shared by all eight); a commit (the mis-point never lands); a mis-point that would pass silently (the nonexistent marker guarantees the failure).

- [ ] **Step 1: The mis-point**

In `e2e/visual/redesign.spec.ts`, inside `SENTINELS['not-found']`, replace (exactly once):

```ts
    if (!h1?.textContent?.includes('This page never developed.')) {
```

with:

```ts
    if (!h1?.textContent?.includes('This page was never here.')) {
```

- [ ] **Step 2: Run the not-found pair, capture the curated failure**

```bash
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
pnpm exec playwright test e2e/visual -g 'not-found' \
  | tee .superpowers/sdd/2026-11-11-259-data-present-sentinels/mispoint-demo.txt
```

Expected: **2 failed** (`not-found — light`, `not-found — dark`), each failing fast (the sentinel fires before the decode gate/resize/capture) with the curated message:

```text
#259 data-present sentinel: not-found — the ruled field copy is absent (the "This page never developed." h1). Page state: title="Sevendays Photography" readyState=complete scrollHeight=836px images=<n>/<n> complete body-head="<the live page's first 200 chars>"
```

The `Page state` values are live-read (the h1 marker check is what failed; the rest of the page is healthy — `scrollHeight=836px` is the not-found baseline height at the standard viewport, `title` is the root head title, `images` counts the chrome's logo). NO Cloudflare attribution line (the healthy teaser). If either test PASSES, the mis-point did not take (wrong surface edited — the `-g` filter matched nothing edited): STOP, re-check the edit. A `beforeAll` timeout instead = edge degradation (Task 1 Step 3's carve-out; wait ≥15 min, rerun).

- [ ] **Step 3: Revert + confirm clean**

```bash
git restore e2e/visual/redesign.spec.ts
git status --short    # clean (the sentinel work is the committed state)
grep -c "This page was never here." e2e/visual/redesign.spec.ts || echo 'mis-point gone'
```

Expected: the tree is clean and the mis-point string is gone (the `grep -c` prints 0 and exits 1, so the `||` echo fires — either output confirms the revert).

### Task 3: The e2e README — the sentinel law joins the visual mechanics

AC6: "The e2e README's visual-mechanics section documents the sentinel law." Two exactly-once edits to § Visual regression's mechanics list: a new bullet between the detail-slug bullet and the Motion bullet carrying the law, and the Motion bullet's ordering chain amended so the pinned chain names the sentinel step (the chain is the canonical ordering — leaving it unamended would make it wrong).

**Files:**
- Modify: `e2e/README.md` (§ Visual regression, the mechanics list)

**Interfaces:**
- Consumes: Task 1's law (the map's shape, the dump's fields, the 1102 attribution).
- Produces: the doc AC6 cites at close; the ordering chain Task 4's diagnosis table aligns with.

**Not here:** the README's other sections (Running, Taxonomy, the rulings list, the regen command block — byte-identical); any ADR (ADR-0022's fences unchanged); the deferred regen-command-form fix from #255's final review (fenced there, stays fenced).

- [ ] **Step 1: Insert the sentinel bullet**

In `e2e/README.md`, replace (exactly once):

```markdown
An empty catalog is a red run with a named message, never a skip.
- **Motion is deterministic**
```

with:

```markdown
An empty catalog is a red run with a named message, never a skip.
- **Data-present sentinels (#259)** — the images gate is vacuous on a page whose data never arrived (no images to wait for), so between the images gate and the decode gate each surface asserts its data-bearing DOM from a per-surface map in the spec: the featured strip + mosaic figures on home, the detail-linked plates (`a[href^='/packages/']`) on the packages index, the book CTA + the "What's included" h2 on the package detail, the service rows (`a[href^='/book?service=']`), the branch cards (`a[href^='/book?branch=']`), the portfolio grid + tab row + kind-words quotes (`figure blockquote`) on about, the form fields (`#story-quote` / `#story-person`) on share-your-story, and the ruled h1 + `header` chrome on the not-found. A missing seam fails the run loudly with the surface, the seam, and a page-state dump (title, readyState, scrollHeight, complete/total image counts, the body innerText head) — never a skip, never a retry (the beforeAll empty-catalog law's sibling: under `--update-snapshots` a silently-written empty baseline is a false green forever). The dump identifies the render path on the next occurrence — ruled empty-state copy vs the "Something went wrong." error boundary vs a partial HTML stream vs the Cloudflare throttle page, which the `error code: 1102` body marker attributes to worker resource limits, not a data race (#255's incident).
- **Motion is deterministic**
```

- [ ] **Step 2: Amend the Motion bullet's ordering chain**

In `e2e/README.md`, replace (exactly once):

```markdown
so page height itself swings without it) → the decode gate
```

with:

```markdown
so page height itself swings without it) → the data-present sentinels (#259 — each surface's data-bearing DOM asserted in-page per the bullet above; a data-less page has no images to wait for, so the images gate is vacuous without them) → the decode gate
```

- [ ] **Step 3: The eyeball + commit**

Read § Visual regression in full and confirm: the sentinel bullet sits third in the mechanics list (after Both themes / the detail slug, before Motion), the Motion chain now reads `… → the images gate (…) → the data-present sentinels (#259 — …) → the decode gate (…) →`, and the regen command block below the list is unchanged. Then:

```bash
git add e2e/README.md
git commit -m "docs(e2e): the data-present sentinel law in the visual mechanics (#259)"
```

### Task 4: The repo gates + the 5-run stability gate (AC4)

AC4: "≥5 consecutive full-suite compare runs green against the teaser (16/16 each)." The loop runs SEQUENTIALLY in the BACKGROUND (5 runs + gaps ≈ 15–25 min; the Bash timeout cap is 10 min) under the owner-ruled ~60s-gap shape (the #255 incident amendment — the pinned back-to-back shape collapsed the free-tier teaser worker into CF 1102 twice). Every red run is diagnosed by the table below BEFORE any rerun — the table is the ticket's whole failure taxonomy made operational.

**Files:** none modified (evidence only).

**Interfaces:**
- Consumes: Task 1's spec (the sentinels live in every run) + the deployed teaser.
- Produces: `gate-run-01..05.txt` + `gate-summary.txt` — the AC4 evidence Task 5's PR body and Task 7's close comment cite.

**Not here:** parallelization (sequential is the point); any spec/baseline edit mid-gate (a red run is diagnosed, never patched around); reruns into a degraded edge (the degraded-edge law); a larger run count (five is the brief's AC; #255's 10-run gate already proved the chain — this gate proves the sentinels false-positive-free over sustained load).

- [ ] **Step 1: The repo gates**

```bash
pnpm check
```

Expected: green — nothing in the pnpm workspace changed (e2e/ + docs only), so every suite holds its AGENTS.md floor by construction; the run is recorded as the PR gate. Any failure: reconcile before proceeding (never loosen).

- [ ] **Step 2: The gapped loop (run as a BACKGROUND task — `run_in_background: true`)**

```bash
cd /home/jeius/Projects/sevendays
S=.superpowers/sdd/2026-11-11-259-data-present-sentinels
: > "$S/gate-summary.txt"
ok=0
for i in $(seq -w 1 5); do
  E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev \
  E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev \
  pnpm exec playwright test e2e/visual > "$S/gate-run-$i.txt" 2>&1
  if grep -q '16 passed' "$S/gate-run-$i.txt"; then
    ok=$((ok+1)); echo "run $i: 16 passed" >> "$S/gate-summary.txt"
  else
    echo "run $i: RED — diagnose by the table before any re-run" >> "$S/gate-summary.txt"
  fi
  [ "$i" = "05" ] || sleep 60
done
echo "GREEN RUNS: $ok/5" >> "$S/gate-summary.txt"
```

The loop ALWAYS writes all five run logs then the summary — a red run does not abort the loop; you diagnose from the logs.

- [ ] **Step 3: The verdict — the diagnosis table**

Read `gate-summary.txt`. **`GREEN RUNS: 5/5`** → AC4 met; proceed to Task 5. **A red run:** open its log and match it against the table — every row names the action; the count is CONSECUTIVE green, so any red restarts it:

  - **`#259 data-present sentinel: … Cloudflare Error 1102 marker present …`** — platform throttling (the sentinel catching the #255-incident class and ATTRIBUTING it, exactly what the recurrence comment asked for): post the run's failure block to #259 as evidence (`gh issue comment 259 --body "1102 recurrence caught + attributed by the sentinel under #259's gate: <the failure line>"`), wait ≥15 min at rest, restart the loop as a fresh 5-run count. Never rerun into the throttle (that prolonged #255's incident).
  - **`#259 data-present sentinel: …` WITHOUT the 1102 line** — a genuine Class B occurrence, caught loudly (the fix working as designed — and the diagnostic gold the issue's "Mechanism — unresolved, two hypotheses" section wants): record the full message (the dump's body-head resolves mechanism (a) `Something went wrong.` boundary vs empty-state copy vs (b) partial stream), post it to #259 as evidence, restart the 5-run count. If the SAME seam fires on the SAME surface twice with a populated-looking dump, suspect a predicate false positive: STOP, reconcile against the component source, report on the issue.
  - **`beforeAll` hook timeout** — the API packages fetch exceeded 30s (edge degradation; observed live at plan time): wait ≥15 min, restart the count. Three consecutive timeout-aborts: STOP and report on the issue with the logs (the owner may need the 1102 playbook — a CI deploy rerun or `wrangler run deploy`, NEVER a bare local `deploy`, which wipes CI-passed `--var`s).
  - **A `#255` curated message (`tall-viewport law` / `decode gate`) or an equal-height blank-band diff** — a #255 regression under a byte-identical chain: STOP, comment the evidence on #259 and #255, do not proceed to the PR.
  - **A pixel diff with populated content on both sides** — genuine drift (a CMS edit mid-gate): the baselines are advisory; do NOT regenerate here (the zero-baseline law) — surface to the owner at the PR and record the drift.
  - **Anything else** — STOP and report; never retry-loop an unclassified red.

### Task 5: The PR — the evidence quoted, then squash-merge

One PR carries the plan file + Tasks 1–3's commits. The body quotes the mis-point demo verbatim (AC3's "show the curated failure in the PR description") and the gate summary (AC4's evidence).

**Files:** none modified (the PR only).

**Interfaces:** consumes Tasks 1–4's commits + evidence files; produces the merged main sha (Task 6's classifier input + Task 7's ledger row).

**Not here:** a second PR (no baseline changes exist, so no visual PR — the zero-write shape is this ticket's ONLY shape); direct pushes to main (the docs commit lands in Task 7, after the merge, per the `9648847` pattern).

- [ ] **Step 1: The PR**

```bash
git push -u origin fix/259-data-present-sentinels
gh pr create --title "fix(e2e): the data-present sentinels — every visual surface asserts its data before capture (#259)" --body-file - << 'EOF'
Implements #259 (brief: the issue's agent comment). Class B — the data-arrival race — split from #255 (Class A, closed).

- A per-surface SENTINELS map (surface → self-contained in-page predicate over the data-bearing DOM) evaluated between the images gate and the decode gate: the images gate is vacuous when content never arrives (no images to wait for), so a data-less page sailed through to a capture — a nightly false-fail, or under --update-snapshots a silently-written empty baseline (a false green forever).
- The failure is loud and named: surface + missing seam + a page-state dump (title, readyState, scrollHeight, complete/total image counts, the body innerText head) — never a skip, never a retry. A Cloudflare `error code: 1102` body match appends the attribution line (worker resource-limit throttling, not a data race) so nightly logs name the #255-incident class on sight.
- AC3 — the loud-fail path demonstrated without a live flake (the mis-point demo, one string, reverted):
  <quote the first failing block from .superpowers/sdd/2026-11-11-259-data-present-sentinels/mispoint-demo.txt verbatim, fenced>
- AC4 — the stability gate under the owner-ruled ~60s-gap shape: <N>/5 consecutive green full-suite runs, 16/16 each (gate-summary.txt; <any red instances + their table rows, or "zero red runs">).
- Zero baseline changes (AC5): the sentinel block is assertion-only and upstream of every capture mechanic; the snapshots dir is untouched (git-status-empty at every commit); compare 16/16 green vs the committed baselines.
- The e2e README's visual-mechanics section carries the sentinel law (a new bullet) and the pinned ordering chain now names the sentinel step (AC6).
- pnpm check green (nothing in the pnpm workspace changed); the spec body pre-verified: Biome-clean, zero new tsc errors (the 2 pre-existing e2e tsc errors are the deliberate baseline), 16 tests listed.
EOF
```

Squash-merge to main. Record the PR number + the merge sha (Tasks 6–7 consume both).

### Task 6: The v1 pick — pure SKIP, classifier run for the record

The runbook loop (`docs/agents/v1-picks.md`) for the one PR. Pre-classified at plan time: every touched path is main-only — `e2e/` per `scripts/seed-v1/paths.txt:32` (the spec, the README, the evidence), the plan file + the T7 docs (the #265 row's own main-only classification of the same shapes). The classifier confirms; there is NO v1-workspace work (nothing to pick — SKIP means the row alone).

**Files:** none in any workspace (the classifier run + the record only; the ledger row itself lands in Task 7's docs commit).

**Interfaces:** consumes the merge sha (Task 5); produces the classifier verdict Task 7's ledger row cites.

**Not here:** any cherry-pick/commit in `~/Projects/sevendays-v1-seed`; v1 baselines (none exist — teaser-only forever); the ledger row's commit (Task 7 lands it on main).

- [ ] **Step 1: The path pass**

```bash
node scripts/v1-triage.mjs <merge-sha>
```

Expected verdict: **SKIP** — MAIN-ONLY: `e2e/visual/redesign.spec.ts`, `e2e/README.md`, `docs/superpowers/plans/2026-11-11-259-visual-data-present-sentinels.md`. Any different verdict: STOP and reconcile against the runbook before recording the row.

### Task 7: The close-out — progress, the ledger row, the issue, graphify

Pure main-only close-out. The docs commit pushes directly to main (the `9648847` pattern).

**Files:**
- Modify: `docs/progress.md` (one dated entry, appended directly after the #255 entry in "Notes for Future Sessions")
- Modify: `docs/agents/v1-picks.md` (one row at the ledger tail)

**Interfaces:** consumes every task's evidence + the PR number/merge sha; produces the close comment on #259 (the AC walk).

**Not here:** `AGENTS.md` (no floor or ruling changes); any ADR; reopening the fenced owner question (the empty-state UX ruling stays fenced — noted in the close comment, ruled separately); #260.

- [ ] **Step 1: The progress entry**

Append to `docs/progress.md` in "Notes for Future Sessions", directly after the #255 entry, filling bracketed values from the actual runs:

```markdown
- **2026-11-XX — the e2e visual data-present sentinels landed (#259).** The visual suite can no longer capture a page whose data never arrived: between the images gate and the decode gate every one of the 16 tests asserts its surface's data-bearing DOM from a per-surface SENTINELS map (the featured strip + mosaic figures on home, the detail-linked plates on the packages index, the book CTA + inclusions h2 on the detail, the service rows, the branch cards, the portfolio grid + tab row + kind-words quotes on about, the form fields on share-your-story, the ruled h1 + header chrome on the not-found) — the images gate is vacuous without images, the exact hole the Class B flake slipped through (an about at 734px vs its 2238px baseline; a not-found at the 720px shell). A missing seam fails loudly with the surface, the seam, and a page-state dump (title, readyState, scrollHeight, image counts, the body innerText head), with a Cloudflare `error code: 1102` body match appending the platform-throttling attribution line (the #255-incident imposter named on sight). Never a skip, never a retry; zero baseline changes (assertion-only, upstream of every capture mechanic — compare 16/16 green vs the committed baselines); the loud-fail path proven by the mis-point demo (one sentinel pointed at a nonexistent seam, 2 curated failures recorded, reverted — AC3); the stability gate <N>/5 consecutive green full-suite runs under the owner-ruled ~60s-gap shape (<any red instances + their table rows>). The e2e README's mechanics section carries the sentinel law and the amended ordering chain. Spec-side only — zero apps/packages changes. The empty-state UX owner question (retry vs skeleton vs graceful) stays fenced; the reliability investigation (why fetches intermittently fail) stays out of scope — the sentinel makes the next occurrence visible and attributable, not absent.
```

- [ ] **Step 2: The ledger row**

Append to `docs/agents/v1-picks.md`'s ledger tail, then push:

```markdown
| 2026-11-XX | #<PR> | `<main-sha>` | skip | — | #259 — the e2e visual data-present sentinels (the per-surface SENTINELS map + the page-state dump failure with the CF-1102 attribution line, evaluated between the images gate and the decode gate; the e2e README's sentinel-law bullet + ordering-chain amendment). Spec-side only: zero apps/packages changes, zero baseline changes (compare 16/16 green vs the committed baselines). Classifier SKIP — all paths main-only (e2e/ per paths.txt:32 + the plan file + docs). Locks: pnpm check green; the stability gate <N>/5 consecutive green under the ~60s-gap shape; the mis-point demo (AC3) quoted in the PR body. |
```

```bash
git switch main && git pull --ff-only origin main
git add docs/progress.md docs/agents/v1-picks.md
git commit -m "docs(v1-picks): the #259 skip row + the progress entry (#259)"
git push origin main
```

- [ ] **Step 3: Close the issue (the AC walk)**

```bash
gh issue close 259 --comment "Landed in #<PR> (main \`<main-sha>\`; pure SKIP — all paths main-only, the ledger row recorded). AC1 all 16 tests (8 surfaces × 2 themes) assert their data-present seam before capture via the shared SENTINELS map — the failure message names the surface and the missing seam. AC2 the failure output carries the page-state dump (title, readyState, scrollHeight, complete/total image counts, body innerText head) — plus the CF-1102 attribution line the recurrence comment asked for (\`error code: 1102\` → worker resource-limit throttling, not a data race). AC3 the loud-fail path demonstrated by the mis-point demo (one sentinel pointed at a nonexistent seam, both not-found tests failing with the curated message, reverted) — quoted verbatim in the PR body. AC4 the stability gate: <N>/5 consecutive green full-suite runs, 16/16 each, under the owner-ruled ~60s-gap shape (gate-summary.txt; <any red instances recorded>). AC5 zero baseline changes — assertion-only and upstream of every capture mechanic; the snapshots dir untouched; compare 16/16 green vs the committed baselines. AC6 the e2e README's visual-mechanics section documents the sentinel law (the new bullet) and the amended ordering chain. Fenced and untouched: the empty-state UX question (ruled separately) and the reliability investigation — the sentinel makes the next occurrence visible and attributable, not absent."
```

- [ ] **Step 4: Graphify + the final sweep**

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#259 graph update"
git push origin main
```

(If `graphify update .` reports no changes, skip the empty commit.) Final sweep: the main workspace's tree clean (all evidence stays gitignored under `.superpowers/`); the `fix/259-data-present-sentinels` branch deleted after merge (remote + local); this plan file's boxes ticked `- [✅]` throughout.
