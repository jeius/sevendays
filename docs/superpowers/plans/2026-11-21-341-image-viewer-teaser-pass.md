# Plan: #341 — Image viewer: teaser variant pass + owner reaction

**Goal:** The #94 rendered-variants gate for the landing image viewer: one teaser pass — the three surfaces (the home wall open/close/zoom/navigate, the `/about` wall with the caption line, the package-detail cover zoom with no arrows), both themes, reduced-motion on, a keyboard-only walk, and a mobile viewport (pinch + swipe) — with the owner's explicit reactions to the two flagged decisions (the D8 chrome register, the D3 caption interpretation) plus the overall verdict, recorded on [#341](https://github.com/jeius/sevendays/issues/341) before the viewer is called done. **Zero code changes** — the pass verifies #339 + #340's landed work (branch `image-viewer` at `b38ecf5`, held unpushed for the owner's integration call) and closes out the viewer spec [#336](https://github.com/jeius/sevendays/issues/336) with its linking note.

**Spec:** [#341](https://github.com/jeius/sevendays/issues/341) (labeled `ready-for-agent`), authoritatively settled by its parent spec [#336](https://github.com/jeius/sevendays/issues/336), repo copy `docs/specs/2026-11-19-landing-image-viewer-spec.md` (the "Rendered-variants step" paragraph + D3/D7/D8). The code tickets #339 (spine) and #340 (cover zoom) are executed complete on the shared branch, all reviews ✅ — their PR/merge is the owner-initiated gate this pass waits under. The template is #338's executed plan (`docs/superpowers/plans/2026-11-21-338-create-button-polish-teaser-pass.md` — the same ticket shape, owner-blessed as the template for #334/#341).

**Execution mode:** controller-executed **interactive** (the sdd-execution carve-out — SDD is for code-change cycles; owner-gated passes with zero code diff run controller-executed, keeping its rigor: verified literals, verbatim bodies, evidence-cited closes). Steps use checkbox (`- [ ]`) syntax for tracking; the controller ends turns at the owner gates (the caption gate, the reaction ask).

**Controller pre-flight (2026-11-21, worktree HEAD `b38ecf5`) — every literal below probed live today:**

- The branch `image-viewer` at `.worktrees/image-viewer` carries #339+#340 (`b38ecf5`, clean, unpushed — the owner's integration call pending; the pass gates on the merge, Task 1 Step 1).
- Teaser landing `https://sevendays-landing.pahamajulius.workers.dev` (the deploy name in `ci.yml:158`, pinned by `POSTHOG_LANDING_HOSTS:sevendays-landing.pahamajulius.workers.dev`); teaser API `https://sevendays-api.pahamajulius.workers.dev`. The deploy job is `deploy-teaser` / **"Deploy teaser (main)"** (`ci.yml:73-76`, main-push only).
- Live data, probed via `GET /api/v1/gallery` and `GET /api/v1/service-packages`: **24 gallery photos, ZERO captions** (20 Graduation + 4 Sevendays category; every `caption: null`) — the owner ruled captions get populated before the walk (Task 1 Step 5); **11 packages — `package-a` carries a cover** (the zoom surface), **`package-d` is coverless** (the live inert-placeholder proof).
- The wall's DOM (read from the branch source the teaser will serve): each photo is `figure > button.block.h-full.w-full.cursor-zoom-in… > img` (`mosaic-photo-grid.tsx:38-49`); home anchors on `section[data-strip='gallery']` (`home-image-led.tsx:206`); `/about` anchors on `[data-gallery-tabs]` + `[data-portfolio-grid]` (`about.tsx:120,127-128`, `MosaicPhotoGrid photos captions`); the about figcaption renders the caption text (`mosaic-photo-grid.tsx:50-54`) — the rig locates the captioned photo by it.
- The viewer's DOM: chrome buttons carry the seam's labels — `aria-label='Previous photo'` / `'Next photo'` / `'Close photo viewer'` (`viewer.ts:59-63`); the counter renders `.yarl__counter` as `"currentIndex + 1 / total"` text, `aria-hidden` (read from the shipped `dist/plugins/counter/index.js`); the caption line is `.yarl__slide_description` (shipped `dist/plugins/captions/captions.css`); the zoom plugin transforms the slide **wrapper** — `transform: scale(${zoom}) translateX(…)` on `cssClass(CLASS_SLIDE_WRAPPER)` (shipped `dist/plugins/zoom/index.js`) — so the zoom assert reads the max computed scale over `.yarl__slide_wrapper`; the slide img is `.yarl__slide_image`; the library's scroll lock is the body class `yarl__no_scroll`; **swipe is pointer-event driven with no pointerType gate** (core dist: `onPointerDown/Move/Up/Cancel`, zero `pointerType` checks in the carousel path) — touch swipes synthesize cleanly via CDP `Input.dispatchTouchEvent` in a `hasTouch` context; zoom keyboard rides `+` / `-` / `0` (zoom dist).
- The detail cover's DOM (`package-detail.tsx:48-59`): a real `<button>` wraps the `CoverPanel` **only when covered**, classes `absolute inset-0 cursor-zoom-in rounded-none focus-visible:…ring-inset`; the coverless arm renders no button at all.
- Theme mechanism: `ThemeProvider attribute='class' defaultTheme='light' enableSystem={false}` (`__root.tsx:97-101`), no custom `storageKey` → next-themes' default — `localStorage.setItem('theme','dark')` + reload drives dark; assert `html.dark`.
- Reduced motion: `page.emulateMedia({ reducedMotion: 'reduce' })` + assert `matchMedia('(prefers-reduced-motion: reduce)').matches`.
- `@playwright/test` **1.63.0** resolves at the repo root (probed at #338, same tree; re-verify at execution); the pass is **headless** — the landing is public, there is no login, so the #310 headed-login rule has nothing to gate (and no headless credential mode exists anywhere in this rig); no `DISPLAY` needed.
- `.superpowers/` is gitignored (`.gitignore:39`) and exists — the pass's scratch root.
- Standing flag, NOT this ticket: the nightly E2E's ADR-0022 landing visual baselines (light) have failed 3 consecutive scheduled runs (latest `44845874350`, 2026-11-21T00:45Z; also `44651735229`, `44434041556`) — pre-existing landing-side baseline drift. Flagged to the owner in the pass comment (Task 3), triaged apart; nothing in this plan touches it.
- Node **v26.7.0** at the repo root — global `fetch` for the in-script gallery probe.
- **The rig's prologue is live-tested today**: the fenced script (Task 1 Step 3) was extracted byte-identically, `node --check`ed clean (457 lines), and fired once against the current zero-caption teaser — it exited 1 with the caption-gate message and wrote `capture-log.json` (probe recorded: 24 photos, 0 captioned) BEFORE any browser launch, exactly the gate branch's contract. The walk phases past the gate are pinned to the DOM facts above and re-proven at execution.

## Scope fences

**In scope:** the capture rig under gitignored `.superpowers/341-teaser-pass/` (script + PNGs + capture-log.json — nothing committed from it); the caption-population gate (owner words via their admin, API-probe confirmed); the headless capture pass; the owner's three reactions recorded on #341; the disposition (closes + the #336 closing note + `docs/progress.md` + this plan's execution ticks + graphify).

**NOT here (siblings / out of scope):**

- **Zero code changes.** The pass verifies landed work. Any fix the owner names in their reaction is a NEW ticket (via the triage discipline) — never an edit inside this pass, never a "quick" in-pass patch. The YARL skill rides along for *diagnosing* what a reaction demands, never for landing it here.
- **The push / PR / merge of `image-viewer`** — owner-initiated controller work at their call (the #340 handoff law's steps 1–2 + PR); this plan *gates on its completion* (Task 1 Step 1) but never executes it. The PR's v1 pick/ledger rides that merge ceremony (main-only, `docs/agents/v1-picks.md`) — not this plan's work.
- **The nightly E2E visual-baseline failures** — flagged in the pass comment only; their triage is its own ticket.
- **No `packages/` changes, no test changes, no floor movement, no `pnpm check` run** — the pass changes zero code, so the check gate has nothing to gate; the floors hold by absence (landing 18 files / 148 tests, the #340 floor).
- **#336 stays open until the owner's approve** — its closing note lands with the reaction (Task 3); never closed earlier, never on the capture alone.
- **No admin walk, no CMS edits by the controller** — the caption population is the owner's hands in their own admin (their wording, their data); the controller never invents catalog copy and never signs into anything.

## Owner rulings (recorded)

- **The pass is an owner-reaction gate over the ruled implementation, not a design exploration.** The spec's "URL-param-switchable throwaway variants" language (the #94 amendment's template phrase) resolves — per the #338 precedent and the ticket's own deployed-teaser surface, which serves exactly one implementation — to the **rendering matrix**: surfaces × themes × reduced-motion × keyboard-only × mobile viewport. The D8 register and D3 law are charting-ruled; this pass is where the owner's eye meets them. Any tuning the reaction demands becomes fix tickets, then a re-pass.
- **Captions get populated before the walk** (owner-ruled 2026-11-21, at this plan's clarify): the teaser gallery's zero-caption state would leave D3 provable only as a negative; the owner adds at least one caption (their wording) via the teaser admin's gallery editor, and the pass probes the public API to confirm before firing. The caption strings are owner content, never controller-invented.
- **The reaction answers the two flags separately, then the whole** — the D8 chrome register and the D3 caption interpretation each get an explicit verdict, plus the overall approve/fix-list (Task 3 Step 2's three-question ask).

## Global Constraints

- **Zero credentials, zero logins.** The landing is public; the rig reads it like any visitor. The #310 headed-login rule has no surface here — and no headless credential fallback exists anywhere in this rig, by construction.
- **All pass artifacts live under `.superpowers/341-teaser-pass/`** (gitignored, `.gitignore:39`) — outside every suite per ADR-0022; never `pnpm check`, never `test:e2e`. Nothing under `.superpowers/` is committed.
- **The teaser is CI-deployed only.** Never run a local/bare `wrangler deploy` against any environment (the #263/#264 lesson — a bare deploy wipes the CI-passed `--var`s).
- **Capture order: light first**, then `localStorage.theme='dark'` + reload (assert `html.dark`); reduced-motion via `emulateMedia` in light (isolating the motion variable); mobile in its own `hasTouch` context (light, 390×844).
- **Verbatim values:** the capture script (Task 1 Step 3) is landed verbatim — its locators and asserts are pinned to the pre-flight's verified DOM; the #341 comment body (Task 3 Step 3) is the pinned shape whose execution-derived slots (the date; the caption inventory; the owner's verdict words) are filled from the recorded facts, never paraphrased.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits reference #341, prefix `docs:` / `chore(graphify):` — this plan lands records only. The plan file itself commits on the `image-viewer` branch at write time (the sibling precedent — #339's `5edd547`, #340's `abd2e9c` — so it rides the push when the owner calls it); the post-merge records (progress, execution ticks) land on main per the #338 flow.

## UI skill audit (`ui-ux-pro-max` + `prototype` + `yet-another-react-lightbox`, run at plan time 2026-11-21)

Loaded per the ticket's named skill set (the #94-amendment discipline; the controller re-loads all three at execution time). The ux-domain searches (`"keyboard focus modal restore"`, `"scrim overlay contrast legibility"`) return the governing guidelines this pass renders visible for the owner:

- **Focus States (High):** "keyboard focus, including controls inside a modal, needs a visible indicator" — shot 04 frames the D8 brand ring (`outline: 3px solid var(--brand-focus-ring)` on `.yarl__button:focus-visible`, `styles.css`) reached by a real Tab, never a mouse-hover stand-in.
- **Focus Appearance / Focus Not Obscured (AA–AAA family):** the focused chrome control is shot unobscured in the immersive stage; the pass's keyboard walk also proves D7's hand-added focus-restore (activeElement back on the trigger).
- **Contrast Readability + Color Contrast:** the caption line is white-80 mono 11px on the near-black stage — legible or not is exactly what the owner judges across shots 06/09; the constant-stage claim is machine-checked (the backdrop value equal across themes) so the owner judges taste, not consistency.
- **Both themes tested before delivery, never inferred from one** — the skill's pre-delivery rule is literally this pass's design: light + dark per surface.
- **Reduced motion verified** — the skill's rule rides the `emulateMedia` leg (D7's spot-check of the zoom under reduce).
- **Touch targets + gesture alternatives:** the mobile shots frame the chrome at 390px; the keyboard walk proves the swipe/pinch alternatives (arrows, `+`/`-`) the skill's "dragging and swipe-only interactions have button/keyboard alternatives" rule demands.
- **`prototype`:** the rig is the throwaway artifact answering "does the rendered viewer pass the owner's eye" — gitignored by design; the issue record is the capture (the skill's capture rule adapted to a zero-code pass per the #338 precedent — no throwaway branch to preserve).
- **`yet-another-react-lightbox`:** the controlled-component laws, the counter/captions stylesheet classes, the pointer-event swipe model, and the `--yarl__*` restyle seam — the pass's asserts cite them; at reaction time the skill is the reference for naming what any "Adjust" verdict would change.

No library or design recommendation applies — the register, gesture set, and chrome are owner-settled and shipped; the pass judges rendering. The owner's reactions override anything this audit or the skills recommend (recorded in the reactions, Task 3).

---

## Task 1 — staging: deploy provenance + the rig + the caption gate (no browser)

**Files:**
- Create: `.superpowers/341-teaser-pass/capture.mjs` (gitignored scratch — never committed)
- Committed already at plan time (this file, on the `image-viewer` branch — rides the push)

**Interfaces:**
- Consumes: the merged-and-deployed teaser landing; `@playwright/test` 1.63.0 (root-resolvable); the public gallery API; the pre-flight's verified DOM.
- Produces: the rig + the caption-gate confirmation (Task 2 consumes both).

> **[AMENDED at execution 2026-11-21 — the environment ruling.]** The owner ordered **"Execute the plan. Hold the push after."** with the branch unpushed. The original Steps 1–2 (deploy provenance + the post-merge sync — inherited from the #338 template, whose code had already merged when its pass ran) contradict both this instruction and the parent spec's own law — #336's Further Notes: "the executor renders the throwaway variant pass … **The owner reacts to the D8 chrome register and the D3 caption interpretation before merge**." The original gate's anti-stale rationale ("react to the viewer, never a stale environment") is satisfied by the branch build itself: the pass runs against a **LOCAL serve of the branch tip** — the exact code that will merge — reading the same live DB the teaser serves. Never a remote deploy (the bare-deploy lesson stands); the push/PR stays held; the pass's record commits (progress, graphify, ticks) land on the branch and ride the eventual push. The ticket AC's "teaser walked" leg is satisfied pre-merge by the branch build; Task 3's comment records the deviation.

- [ ] **Step 1: Verify the branch-build provenance.** The pass reacts to the exact code that will merge — no push, no PR, no merge happens in this pass:

```bash
git rev-parse --short HEAD && git status --short && node -e "console.log(require('@playwright/test/package.json').version)"
```

Expected: HEAD `0b93b46` (the plan commit atop #339+#340's `b38ecf5` — the viewer implementation); worktree clean; the version prints `1.63.0`. If a newer commit has landed on the branch since, proceed — the capture-log records the actual tip.

- [ ] **Step 2: Point the local serve at the teaser api and boot it.** The worktree's `apps/landing/.env.local` carries `API_URL=http://127.0.0.1:8787` (a local api) — the pass needs the LIVE data (the owner's caption edits via the teaser admin must flow through), so swap the line for the pass and restore it after (Task 3 Step 5):

```bash
mkdir -p .superpowers/341-teaser-pass
cp apps/landing/.env.local .superpowers/341-teaser-pass/env.local.bak
sed -i 's|^API_URL=.*|API_URL=https://sevendays-api.pahamajulius.workers.dev|' apps/landing/.env.local
grep -n "^API_URL" apps/landing/.env.local
```

Expected: the backup saved under the gitignored scratch root; `API_URL=https://sevendays-api.pahamajulius.workers.dev`. Then boot (port 3000 verified free at pre-flight):

```bash
pnpm --filter @sevendays/landing dev
```

Wait for compile, then probe the three surfaces (dev HTML carries NUL bytes — `-a`; `-o | wc -l` counts occurrences on the one-line document):

```bash
curl -s http://localhost:3000/ | grep -a -o "cursor-zoom-in" | wc -l
curl -s http://localhost:3000/about | grep -a -o "data-portfolio-grid" | wc -l
curl -s http://localhost:3000/packages/package-a | grep -a -o "cursor-zoom-in" | wc -l
```

Expected: ≥ 24 / ≥ 1 / ≥ 1 — the serve renders the viewer's affordances on all three surfaces over the live data. A bottom-right devtools panel in dev shots is dev-only chrome (absent from the deployed site) — named to the owner at presentation, never part of the judged surface.

- [ ] **Step 3: Write the capture script verbatim** to `.superpowers/341-teaser-pass/capture.mjs`:

```js
// #341 — the landing image-viewer teaser pass. Walks the deployed teaser
// landing through the ruled rendering matrix: the three surfaces (home
// wall, /about wall with captions, package-detail cover zoom), both
// themes (light first, then localStorage theme=dark + reload), a
// keyboard-only walk (open / navigate / zoom / Esc / focus-restore), a
// reduced-motion leg, and a mobile hasTouch context (swipe + pinch via
// CDP touch synthesis). Thirteen PNGs + a capture-log with every assert.
// One-off acceptance tooling for ticket #341: lives in gitignored
// .superpowers/, outside every suite (ADR-0022 — never pnpm check, never
// test:e2e). The landing is public — zero credentials, zero logins; the
// #310 headed-login rule has no surface (and no credential mode exists
// here at all). Captions must already be populated (the owner ruling —
// the script re-probes the gallery and exits non-zero on zero captions).
//
// Usage: node .superpowers/341-teaser-pass/capture.mjs
// Prereq: the teaser serves the merged viewer (Task 1 Step 1);
// @playwright/test resolves at the repo root (1.63.0); headless.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base =
  process.env.CAPTURE_BASE_URL ?? 'https://sevendays-landing.pahamajulius.workers.dev';
const apiBase =
  process.env.CAPTURE_API_URL ?? 'https://sevendays-api.pahamajulius.workers.dev';
const outDir = resolve(process.env.CAPTURE_OUT_DIR ?? '.superpowers/341-teaser-pass');

mkdirSync(outDir, { recursive: true });
const log = {
  base,
  apiBase,
  startedAt: new Date().toISOString(),
  gallery: null,
  captionGate: null,
  shots: [],
  asserts: [],
  cacheFirstOpen: null,
  backdropLight: null,
  backdropDark: null,
  error: null,
  failures: 0,
};

function assert(name, ok, detail = '') {
  log.asserts.push({ name, ok, detail });
  if (!ok) log.failures += 1;
  console.log(`[${ok ? 'ok' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

const out = (name) => resolve(outDir, name);
const settle = (page) => page.waitForTimeout(1500); // hydration + reveal stagger (the probe's wait)

async function viewerReady(page) {
  await page.waitForSelector('.yarl__container', { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const img = document.querySelector('.yarl__slide_image');
      return img && img.complete && img.naturalWidth > 0;
    },
    undefined,
    { timeout: 30_000 },
  );
}

async function closed(page) {
  await page.waitForSelector('.yarl__container', { state: 'detached', timeout: 30_000 });
}

async function counterText(page) {
  return (await page.locator('.yarl__counter').textContent())
    .replace(/\s+/g, ' ')
    .trim();
}

// The zoom plugin transforms the slide WRAPPER (scale(${zoom}) translateX…),
// not the img — read the max computed scale across wrappers.
async function zoomScale(page) {
  return page.evaluate(() => {
    const scales = [...document.querySelectorAll('.yarl__slide_wrapper')].map((el) => {
      const t = getComputedStyle(el).transform;
      const m = t.match(/matrix\(([^)]+)\)/);
      if (!m) return 1;
      const a = Number.parseFloat(m[1].split(',')[0]);
      return Number.isFinite(a) ? a : 1;
    });
    return scales.length > 0 ? Math.max(...scales) : 0;
  });
}

async function backdropVar(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.yarl__container');
    return el ? getComputedStyle(el).getPropertyValue('--yarl__color_backdrop').trim() : null;
  });
}

async function shotElement(page, selector, name) {
  const file = out(`${name}.png`);
  await page.locator(selector).first().screenshot({ path: file });
  console.log(`[shot] ${name}.png`);
  log.shots.push({ name, file });
}

async function shotViewport(page, name) {
  const file = out(`${name}.png`);
  await page.screenshot({ path: file });
  console.log(`[shot] ${name}.png`);
  log.shots.push({ name, file });
}

// The caption gate (owner ruling 2026-11-21): captions must be populated
// before the walk — re-probe the public API, exit non-zero on zero captions.
const res = await fetch(`${apiBase}/api/v1/gallery`);
const gallery = await res.json();
const captioned = gallery.photos.filter((p) => p.caption);
log.gallery = { photos: gallery.photos.length, captioned: captioned.length };
log.captionGate = {
  probedAt: new Date().toISOString(),
  photos: gallery.photos.length,
  withCaption: captioned.length,
};
if (captioned.length === 0) {
  console.error(
    '[caption-gate] zero captions on the teaser gallery — the owner ruling requires at least one before the walk (Task 1 Step 5). Stop.',
  );
  writeFileSync(out('capture-log.json'), JSON.stringify(log, null, 2));
  process.exit(1);
}
const capPhoto = captioned[0];
console.log(`[caption-gate] ${captioned.length} captioned of ${gallery.photos.length}.`);

const browser = await chromium.launch({}); // headless — public surface, no login exists
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // ---- Phase A — light, desktop -------------------------------------------------
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.locator("section[data-strip='gallery']").scrollIntoViewIfNeeded();
  await settle(page);
  const wallButtons = page.locator("section[data-strip='gallery'] button.cursor-zoom-in");
  assert(
    'home wall: one zoom affordance per photo (the deploy serves the viewer)',
    (await wallButtons.count()) === gallery.photos.length,
    `${await wallButtons.count()} buttons / ${gallery.photos.length} photos`,
  );
  await shotElement(page, "section[data-strip='gallery']", '01-home-wall-light');

  await wallButtons.first().click();
  await viewerReady(page);
  log.cacheFirstOpen = await page.evaluate((src) => {
    const entry = performance.getEntriesByType('resource').find((r) => r.name === src);
    return entry ? { transferSize: entry.transferSize, cached: entry.transferSize === 0 } : null;
  }, await page.evaluate(() => document.querySelector('.yarl__slide_image')?.src));
  assert(
    'counter reads "1 / N" on open',
    (await counterText(page)) === `1 / ${gallery.photos.length}`,
    await counterText(page),
  );
  assert(
    'chrome labels: prev/next/close present (the seam labels)',
    (await page.locator("button[aria-label='Previous photo']").count()) === 1 &&
      (await page.locator("button[aria-label='Next photo']").count()) === 1 &&
      (await page.locator("button[aria-label='Close photo viewer']").count()) === 1,
  );
  assert(
    'home law: NO caption line in the viewer (D3)',
    (await page.locator('.yarl__slide_description').count()) === 0,
  );
  assert(
    'scroll lock on while open (the library body class)',
    await page.evaluate(() => document.body.classList.contains('yarl__no_scroll')),
  );
  log.backdropLight = await backdropVar(page);
  await shotViewport(page, '02-home-viewer-light');

  await page.click("button[aria-label='Next photo']");
  await viewerReady(page);
  assert(
    'next arrow navigates (counter 2 / N)',
    (await counterText(page)) === `2 / ${gallery.photos.length}`,
    await counterText(page),
  );

  await page.dblclick('.yarl__slide_image');
  await page.waitForTimeout(600);
  assert('double-click zooms (wrapper scale > 1)', (await zoomScale(page)) > 1.01, `scale=${await zoomScale(page)}`);
  await shotViewport(page, '03-home-viewer-zoom-light');

  await page.keyboard.press('Escape');
  await closed(page); // a timeout here aborts the walk as a recorded failure
  assert(
    'Esc closed the zoomed viewer; scroll lock off after close (D6)',
    !(await page.evaluate(() => document.body.classList.contains('yarl__no_scroll'))),
  );

  // Keyboard-only walk: focus the trigger, Enter opens, arrows navigate,
  // +/- zooms, Esc closes — and D7's hand-added focus-restore returns focus.
  const trigger = wallButtons.first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await viewerReady(page);
  await page.keyboard.press('ArrowRight');
  await viewerReady(page);
  assert(
    'keyboard: ArrowRight navigates',
    (await counterText(page)) === `2 / ${gallery.photos.length}`,
    await counterText(page),
  );
  await page.keyboard.press('+');
  await page.waitForTimeout(600);
  assert('keyboard: + zooms', (await zoomScale(page)) > 1.01, `scale=${await zoomScale(page)}`);
  await page.keyboard.press('Escape');
  await closed(page);
  assert(
    'focus restored to the trigger after close (D7)',
    await page.evaluate(() => {
      const btn = document.querySelector("section[data-strip='gallery'] button.cursor-zoom-in");
      return document.activeElement === btn;
    }),
  );

  // The D8 brand-ring shot: reopen by keyboard, Tab onto the chrome — the
  // focus-visible ring the owner judges.
  await trigger.focus();
  await page.keyboard.press('Enter');
  await viewerReady(page);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  assert(
    'Tab moves focus into the viewer chrome',
    await page.evaluate(() => {
      const container = document.querySelector('.yarl__container');
      return container !== null && container.contains(document.activeElement);
    }),
  );
  await shotViewport(page, '04-keyboard-focus-ring-light');
  await page.keyboard.press('Escape');
  await closed(page);

  // /about — the caption surface.
  await page.goto(`${base}/about`, { waitUntil: 'networkidle' });
  await page.locator('[data-portfolio-grid]').scrollIntoViewIfNeeded();
  await settle(page);
  const aboutSection = page.locator('section', { has: page.locator('[data-portfolio-grid]') });
  const aboutFile = out('05-about-wall-light.png');
  await aboutSection.first().screenshot({ path: aboutFile });
  console.log('[shot] 05-about-wall-light.png');
  log.shots.push({ name: '05-about-wall-light', file: aboutFile });

  const capFigure = page.locator('[data-portfolio-grid] figure', { hasText: capPhoto.caption });
  await capFigure.locator('button').click();
  await viewerReady(page);
  const desc = page.locator('.yarl__slide_description');
  assert(
    'about law: the caption line renders with the caption text (D3)',
    (await desc.count()) === 1 && (await desc.textContent()) === capPhoto.caption,
    `count=${await desc.count()}`,
  );
  await shotViewport(page, '06-about-viewer-caption-light');
  await page.keyboard.press('Escape');
  await closed(page);

  // The cover zoom — the lone-image variant (light).
  await page.goto(`${base}/packages/package-a`, { waitUntil: 'networkidle' });
  await settle(page);
  const coverBtn = page.locator('button.cursor-zoom-in');
  assert('covered detail: exactly one zoom affordance', (await coverBtn.count()) === 1);
  await coverBtn.first().click();
  await viewerReady(page);
  assert(
    'cover: NO prev/next arrows render (D4 render-slot hide)',
    (await page.locator("button[aria-label='Previous photo']").count()) === 0 &&
      (await page.locator("button[aria-label='Next photo']").count()) === 0,
  );
  assert('cover: NO counter (D4)', (await page.locator('.yarl__counter').count()) === 0);
  await shotViewport(page, '07-cover-viewer-light');
  await page.dblclick('.yarl__slide_image');
  await page.waitForTimeout(600);
  assert('cover: zooms (lone image, scale > 1)', (await zoomScale(page)) > 1.01, `scale=${await zoomScale(page)}`);
  await page.keyboard.press('Escape');
  await closed(page);

  // The coverless detail — the placeholder is inert (assert-only, no shot).
  await page.goto(`${base}/packages/package-d`, { waitUntil: 'networkidle' });
  await settle(page);
  assert(
    'coverless detail: NO zoom affordance (D4 placeholder inert)',
    (await page.locator('button.cursor-zoom-in').count()) === 0,
  );

  // ---- Phase B — dark, desktop (localStorage + reload) --------------------------
  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  assert(
    'dark applied (html.dark)',
    await page.evaluate(() => document.documentElement.classList.contains('dark')),
  );
  await page.locator("section[data-strip='gallery']").scrollIntoViewIfNeeded();
  await settle(page);
  await page.locator("section[data-strip='gallery'] button.cursor-zoom-in").first().click();
  await viewerReady(page);
  log.backdropDark = await backdropVar(page);
  assert(
    'the immersive stage is CONSTANT across themes (D8)',
    log.backdropLight !== null &&
      log.backdropDark !== null &&
      log.backdropLight === log.backdropDark,
    `light=${log.backdropLight} dark=${log.backdropDark}`,
  );
  await shotViewport(page, '08-home-viewer-dark');
  await page.keyboard.press('Escape');
  await closed(page);

  await page.goto(`${base}/about`, { waitUntil: 'networkidle' });
  await page.locator('[data-portfolio-grid]').scrollIntoViewIfNeeded();
  await settle(page);
  await page
    .locator('[data-portfolio-grid] figure', { hasText: capPhoto.caption })
    .locator('button')
    .click();
  await viewerReady(page);
  assert(
    'about dark: the caption line still renders (D3)',
    (await page.locator('.yarl__slide_description').count()) === 1,
  );
  await shotViewport(page, '09-about-viewer-caption-dark');
  await page.keyboard.press('Escape');
  await closed(page);

  await page.goto(`${base}/packages/package-a`, { waitUntil: 'networkidle' });
  await settle(page);
  await page.locator('button.cursor-zoom-in').first().click();
  await viewerReady(page);
  await shotViewport(page, '10-cover-viewer-dark');
  await page.keyboard.press('Escape');
  await closed(page);

  // ---- Phase C — reduced motion, light (isolating the motion variable) ----------
  await page.evaluate(() => localStorage.setItem('theme', 'light'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  assert(
    'reduced-motion emulated',
    await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
  );
  await page.locator("section[data-strip='gallery']").scrollIntoViewIfNeeded();
  await settle(page);
  await page.locator("section[data-strip='gallery'] button.cursor-zoom-in").first().click();
  await viewerReady(page);
  await page.dblclick('.yarl__slide_image');
  await page.waitForTimeout(600);
  assert(
    'zoom still engages under reduced motion (D7 spot-check)',
    (await zoomScale(page)) > 1.01,
    `scale=${await zoomScale(page)}`,
  );
  await shotViewport(page, '11-reduced-motion-viewer-light');
  await page.keyboard.press('Escape');
  await closed(page);

  await context.close();

  // ---- Phase D — mobile, hasTouch, light ----------------------------------------
  const mcontext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const mpage = await mcontext.newPage();
  await mpage.goto(`${base}/`, { waitUntil: 'networkidle' });
  await mpage.locator("section[data-strip='gallery']").scrollIntoViewIfNeeded();
  await settle(mpage);
  await shotElement(mpage, "section[data-strip='gallery']", '12-mobile-wall-light');

  await mpage.locator("section[data-strip='gallery'] button.cursor-zoom-in").first().tap();
  await viewerReady(mpage);
  await shotViewport(mpage, '13-mobile-viewer-light');

  // Swipe + pinch via CDP touch synthesis (the library's pointer-event
  // swipe has no pointerType gate; a hasTouch context makes these real
  // touch pointers).
  const cdp = await mcontext.newCDPSession(mpage);
  const box = await mpage.locator('.yarl__slide_image').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const beforeSwipe = await counterText(mpage);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cx + 60, y: cy }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: cx + 20, y: cy }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: cx - 40, y: cy }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mpage.waitForTimeout(700);
  const afterSwipe = await counterText(mpage);
  assert('mobile: touch swipe navigates', afterSwipe !== beforeSwipe, `${beforeSwipe} → ${afterSwipe}`);

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: cx - 30, y: cy },
      { x: cx + 30, y: cy },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: cx - 90, y: cy },
      { x: cx + 90, y: cy },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mpage.waitForTimeout(600);
  assert(
    'mobile: pinch zooms (wrapper scale > 1)',
    (await zoomScale(mpage)) > 1.01,
    `scale=${await zoomScale(mpage)}`,
  );
  await mcontext.close();
} catch (err) {
  // A mid-walk abort (a timed-out waitForSelector, a throw inside a
  // helper) must still land the log — the failure branch reads it.
  log.failures += 1;
  log.error = String(err?.stack ?? err);
  console.error('[error] the walk aborted:', err);
} finally {
  await browser.close();
}

log.finishedAt = new Date().toISOString();
writeFileSync(out('capture-log.json'), JSON.stringify(log, null, 2));
console.log(
  JSON.stringify(
    {
      shots: log.shots.length,
      captioned: log.captionGate.withCaption,
      backdropLight: log.backdropLight,
      backdropDark: log.backdropDark,
      cacheFirstOpen: log.cacheFirstOpen,
      failures: log.failures,
    },
    null,
    2,
  ),
);
process.exit(log.failures === 0 ? 0 : 1);
```

- [ ] **Step 4: Syntax gate.**

Run: `node --check .superpowers/341-teaser-pass/capture.mjs`
Expected: silent (exit 0).

- [ ] **Step 5: The caption gate (STOP here — end the turn).** The owner ruling: captions get populated before the walk. End the turn with this message and do NOT proceed until the owner's next message confirms:

> The #341 caption gate: the walk needs captioned photos (probed today: 24 photos, 0 captions). Add at least one caption — your wording — to a gallery photo in the teaser admin's gallery editor, and say **done**. The pass then probes the API to confirm before firing. (The local serve reads the same live DB via the teaser api — your caption flows straight into the captured surfaces.)

On the owner's "done", confirm the probe before ticking:

```bash
curl -s "https://sevendays-api.pahamajulius.workers.dev/api/v1/gallery" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('photos:',j.photos.length,'withCaption:',j.photos.filter(p=>p.caption).length)})"
```

Expected: `withCaption: 1` or more. **Zero captions after "done"** → the edge cache (60 s TTL, ADR-0025) may still hold the old payload — wait a minute and re-probe once; still zero → report and wait (never proceed on the unpopulated state; the ruling is the gate). This step's box is ticked only when the probe confirms ≥ 1.

**Not here:** no login automation of any kind (nothing to log into — the landing is public); no caption strings written by the controller (the owner's words are the content); no issue comments yet (Task 3 owns all issue writes); no capture firing (Task 2, and the rig needs no "go" — headless on a public URL, nothing gated).

## Task 2 — the headless capture pass

**Files:**
- Consumes: `.superpowers/341-teaser-pass/capture.mjs` (Task 1); the caption-gate confirmation (Task 1 Step 5).
- Produces: thirteen PNGs + `capture-log.json` under `.superpowers/341-teaser-pass/`.

- [ ] **Step 1: Fire.**

Run: `CAPTURE_BASE_URL=http://localhost:3000 node .superpowers/341-teaser-pass/capture.mjs`

(The environment ruling — the rig's built-in override points it at the local branch-build serve; `CAPTURE_API_URL` stays its default, the teaser api — the same live data the serve reads.)

Expected: the script probes the gallery (caption gate), then walks the phases headlessly — light desktop (home wall → viewer → zoom → keyboard walk + focus-ring → about wall + caption → cover + coverless), dark desktop (home/about/cover), reduced-motion, mobile (wall → viewer → swipe → pinch) — printing one `[ok]`/`[FAIL]` line per assert, thirteen `[shot]` lines, and a closing JSON verdict: `shots: 13`, `captioned: ≥1`, `failures: 0`, plus the backdrop pair (expected equal) and the `cacheFirstOpen` record. Exit 0.

- [ ] **Step 2: The failure branch.** Any `[FAIL]` line, a non-zero exit, or the caption gate tripping = **STOP and diagnose before presenting** — never present broken evidence. Diagnosis order: (a) the local serve (Task 1 Step 2 — a dead or stale serve fails the very first assert, `one zoom affordance per photo`); (b) the live data (photos/captions/packages re-probed — the counts are the script's own inputs); (c) the rig itself (locators against the merged tree's DOM — only after (a) and (b) are green). A diagnosed rig defect is fixed in the script and the WHOLE pass re-fires (one clean run, not stitched halves — the log and shots must come from a single execution). Never retake a shot to "improve" it — the pass records what the teaser serves; a retake is only for a FAILED assert, diagnosed first.

- [ ] **Step 3: Verify the artifacts before presenting.**

Run: `ls .superpowers/341-teaser-pass/ && cat .superpowers/341-teaser-pass/capture-log.json`

Expected: exactly thirteen PNGs (`01-home-wall-light.png` … `13-mobile-viewer-light.png`) + `capture-log.json`; every `asserts` entry has `ok: true`; `captionGate.withCaption ≥ 1`; `backdropLight === backdropDark`; `failures: 0`. The `cacheFirstOpen` entry is record-only (the D5 cache win observed, never a gate). Any red → Step 2's branch, not the reaction.

- [ ] **Step 4: Tick this task's boxes.** The pass is captured — the reaction gate (Task 3) is next.

**Not here:** no navigation beyond the named routes (`/`, `/about`, `/packages/package-a`, `/packages/package-d`); no theme beyond the two ruled (no system-theme probing — `enableSystem={false}`); no editor/admin surfaces anywhere (the landing only); no screenshots beyond the thirteen (asserts carry the rest).

## Task 3 — the owner reactions + disposition

**Files:**
- Consumes: the thirteen PNGs + `capture-log.json` (Task 2).
- Modify: `docs/progress.md` (append a dated section at file end — the house pattern); graphify output.
- Issue writes: #341 comment (+ close), #336 closing note (+ close) — approve path only.

- [ ] **Step 1: Present the thirteen PNGs in-session** (Read renders them), one line each naming surface, register, and the matrix leg it proves — in file order (01 the wall in context … 13 the mobile viewer). Do not editorialize the renderings; the owner judges. Name the two flagged decisions where their evidence lives: the D8 chrome register (shots 02/03/04/07/08/10/11/13 — the stage, chrome ink, counter, the brand focus ring, at both themes, under motion, at mobile) and the D3 caption interpretation (shots 05/06/09 — the about wall's figcaption beside the viewer's caption line, and shot 02's home carrying none). Offer the live walk: the teaser is public — the owner may also open it themselves before answering.

- [ ] **Step 2: Ask the reactions — AskUserQuestion, three questions in ONE call** (ask and block; never assume while the owner may be AFK):

1. "The viewer's chrome register — the immersive near-black stage in both themes, the white chrome ink, the mono caption line, the brand focus ring (D8): approve or adjust?" — options `Approve` / `Adjust`.
2. "The caption interpretation — captions follow the surface's law: the /about viewer shows the caption line, the home viewer shows none (D3): approve or adjust?" — options `Approve` / `Adjust`.
3. "The image viewer overall, as rendered on the teaser across the matrix: approve or fix-list?" — options `Approve` / `Fix-list`.

The owner's words ARE the record — quote them verbatim per question in Step 3's comment (the "Other" field carries nuance; quote it too). Any `Adjust` or `Fix-list` routes through Step 4b even if another question approved.

- [ ] **Step 3: Record on #341** — post this body verbatim (the angle-bracket slots fill from the recorded facts: the capture date; the branch tip from Task 1 Step 1; the caption inventory from the capture-log; the three verdicts quoted exactly):

```markdown
## Teaser variant pass — the landing image viewer (verifying #339 + #340's landed work)

**Provenance:** a LOCAL serve of the `image-viewer` branch tip `<tip>` — the exact code that will merge; the pass ran **pre-merge** per the owner's instruction ("execute; hold the push") + the spec's before-merge law (#336 Further Notes; the plan's environment ruling). Landing at `http://localhost:3000` (dev server, `API_URL` pointed at the teaser api for the pass), so every read is the live data the teaser serves — the same DB the caption edits wrote. Captured <date> — headless Chromium, zero credentials (nothing logged in), light first then `localStorage` dark (`html.dark` asserted), reduced-motion via `emulateMedia`, mobile via a `hasTouch` context (390×844). Tooling: `.superpowers/341-teaser-pass/capture.mjs` (gitignored, outside every suite per ADR-0022); thirteen PNGs + `capture-log.json`.

**The matrix (thirteen shots + the assert log):**

| Shot | Surface | Leg |
|---|---|---|
| 01 | home wall (the affordance in context) | light |
| 02–03 | home viewer open + zoomed | light |
| 04 | keyboard Tab onto the chrome — the brand focus ring | light |
| 05–06 | /about wall + the viewer's caption line | light |
| 07 | package-detail cover zoom — no arrows, no counter | light |
| 08–10 | home viewer, about caption, cover | dark |
| 11 | zoom under reduced motion | light, emulateMedia |
| 12–13 | mobile wall + viewer | light, hasTouch 390×844 |

**DOM-level proofs (capture-log.json):** one zoom affordance per wall photo (24/24); the counter reads `1 / 24` on open and advances on arrow/swipe; the seam's chrome labels present (Previous/Next/Close photo); **no caption line on home, the caption line with the caption text on /about (D3)**; Esc closes (from zoomed too), scroll lock on-while-open/off-after-close; **focus restored to the trigger after close (D7's hand-added law)**; Tab moves focus into the chrome; **the immersive stage constant across themes (D8 — backdrop var identical light/dark)**; the cover: no arrows, no counter, zooms; the coverless detail: no affordance at all (D4's placeholder-inert law); zoom engages under reduced motion; touch swipe navigates; pinch zooms. Caption inventory at capture: <N> captioned of <M> photos (populated before the walk per the owner ruling).

**Owner's reactions:** D8 chrome register — <verdict words, verbatim>. D3 caption interpretation — <verdict words, verbatim>. Overall — <verdict words, verbatim>.

**Flagged apart (not this ticket):** the nightly E2E's ADR-0022 landing visual baselines (light) have failed 3 consecutive scheduled runs (latest 44845874350, 2026-11-21T00:45Z) — landing-side baseline drift predating the viewer merge; needs its own triage.
```

- [ ] **Step 4a (Approve path — all three verdicts approve): close out.**

```bash
gh issue close 341 --reason completed --comment "The teaser variant pass is rendered and the owner's three reactions record above — the acceptance boxes hold: the three surfaces walked across both themes, reduced-motion, keyboard-only, and mobile (pinch + swipe) — walked on the branch build pre-merge (the owner holds the push; the same code serves the teaser when integration is called); the two flagged decisions (D8, D3) got explicit approves; every finding was none. The image viewer is accepted; #336's rendered-variants gate is satisfied."
gh issue close 336 --reason completed --comment "Closing note: the viewer spec's rendered-variants gate is satisfied by the #341 teaser pass (its comment carries the thirteen-shot matrix, the DOM-level proofs, and the owner's three reactions — D8 chrome register and D3 caption interpretation both approved). The implementation is #339 + #340 on the image-viewer branch; the pass verified it on the deployed teaser. The spec is done."
```

Then append the progress section verbatim at the end of `docs/progress.md`:

```markdown
## 2026-11-21 — #341: the image viewer accepted — the teaser variant pass + the owner's reactions

The #94 rendered-variants gate for the viewer spec (#336) is closed: one teaser pass walked the three surfaces — the home wall (open/close/zoom/navigate), the /about wall with its caption line, the package-detail cover zoom (no arrows, no counter) — across both themes, reduced-motion, a keyboard-only walk, and a mobile hasTouch viewport (swipe + pinch via CDP synthesis), thirteen PNGs + capture-log.json under gitignored .superpowers/341-teaser-pass/ (outside every suite per ADR-0022). The DOM proofs rode with the shots: the counter law, the seam's chrome labels, D3's caption line (about shows it with the caption text, home shows none), D7's hand-added focus-restore after close, D8's constant immersive stage (backdrop var identical across themes), D4's lone-image chrome (no arrows, no counter) and the coverless placeholder's inertness, zoom under reduced motion, touch swipe navigation, and pinch zoom. The captions were populated before the walk per the owner's ruling (the teaser gallery had zero). The owner's three reactions recorded on #341 — the D8 chrome register, the D3 caption interpretation, and the overall — all approve; #341 and #336 are closed. Zero code changes in this ticket — the pass verified #339 + #340's landed work; floors untouched (landing 18 files / 148 tests).
```

Then:

```bash
git add docs/progress.md
git commit -m "docs: #341 — progress section; the viewer accepted on the teaser pass"
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#341 graph update"
```

- [ ] **Step 4b (Adjust / Fix-list path): record + route, never fix.** Post the Step 3 comment with the verdicts quoted; keep #341 AND #336 open; skip the Step 4a closes and the approve-path progress text (the progress entry instead records the pass + the findings, drafted from the owner's recorded words — no invented text). Propose the follow-up path to the owner: each finding becomes its own fix ticket via the triage discipline (the YARL skill names what a chrome-tuning finding would change — the `--yarl__*` variables and the override block in `apps/landing/src/styles.css`); the re-pass after fixes re-runs Tasks 1–3.

- [ ] **Step 5: Self-review tick + environment restore.** `grep -c '<!-- APPEND' docs/superpowers/plans/2026-11-21-341-image-viewer-teaser-pass.md` → 0 (anchors consumed); amend this plan's checkboxes to reflect what actually ran (the #338 precedent — one `docs:` commit; the plan file rides the branch's eventual push). Restore the env swap byte-for-byte (`cp .superpowers/341-teaser-pass/env.local.bak apps/landing/.env.local`) and stop the background dev server. **The push/PR stays held — nothing is pushed in this pass.**

**Not here:** no v1 pick work (rides the code PR's merge ceremony, main-only); no AGENTS.md edit (floors don't move; zero code); no ADR (no architectural choice — acceptance tooling on the #310/#338 pattern); no fix implementation even for a one-line tuning (the fix-list is NEW tickets, always); no e2e/visual baseline work (the standing nightly flag is named in the comment, its triage is another ticket's).

---

## Self-review checklist (controller pass — run before handoff)

- [✅] **Placeholder scan:** no TBD/TODO/"as appropriate"/paraphrase requests — the capture script, the comment body, the close comments, and the progress section are verbatim; the only execution-derived slots (the date; the CI run id; the caption inventory; the owner's verdict words) are marked as such in the text. (Run 2026-11-21: exactly one grep hit — the Global Constraints bullet that NAMES the slots; self-referential.)
- [✅] **Step-checkbox count:** `grep -c '^- \[ \] \*\*Step'` on this file = **16 raw / 15 real** (Task 1: 5, Task 2: 4, Task 3: 6 — Steps 1, 2, 3, 4a, 4b, 5; the sixteenth raw hit is THIS checklist line, whose label starts "Step-checkbox"). Fenced script/comment blocks quote no `- [ ] **Step`-shaped lines. (Run 2026-11-21: first draft pinned 13 — an arithmetic slip the mechanical count caught; corrected at the source.)
- [✅] **Shot-name consistency:** the thirteen filenames named in Task 2 Step 3's expected-list, Task 3 Step 1's presentation order, and the comment body's matrix table all match the script's `shot*` calls exactly (01–13, the names as written in the script). (Run 2026-11-21: the extracted script's shot invocations counted = 13 — 15 grep hits = 13 calls + the two helper definitions.)
- [✅] **Cross-reference consistency:** the chrome-label asserts cite `viewer.ts:59-63`'s exact strings ('Previous photo' / 'Next photo' / 'Close photo viewer'); the counter assert's format matches the shipped counter component (`currentIndex + 1`, separator `/`, whitespace normalized); the caption locator (`figure` `hasText` the caption) matches the figcaption render; the cover asserts match `COVER_RENDER`'s render-slot hide (zero `button[aria-label=…]` — the buttons do not render at all); the zoom assert reads the slide **wrapper** (the shipped transform site), not the img. (Anchors re-read from the branch source + the shipped dist at plan time; the rig re-proves them at execution.)
- [✅] **Gate integrity:** the caption gate (Task 1 Step 5 → end of turn) and the reaction gate (Task 3 Step 2, ask-and-block) are both blocking; the script never fires before the caption probe confirms (it re-probes internally and exits 1 on zero captions); the plan never posts to an issue before the reactions record. (Live-proven 2026-11-21: fired once against the zero-caption teaser — exit 1, gate message, log written, no browser launched.)
- [✅] **Sibling fences:** the push/PR/merge (owner-initiated), the v1 pick, the nightly-baseline triage, every code change — all named in Scope fences with their owners; no fence doubles as a step.

