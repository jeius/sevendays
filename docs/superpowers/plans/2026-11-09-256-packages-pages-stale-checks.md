# Packages-Pages #223-Stale Checks Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **This ticket is NOT UI-bearing** — zero landing `src/` files change, so the UI/UX skill-set loading rule does not apply. The long-running stack (Task 1 Step 1) stays up through Task 5; every task's scenario run reuses it.

**Goal:** The nine #223-stale checks in the landing packages-pages verification scenario are rewritten against the owner-ruled current contracts (Link-plate DOM shapes, detail-first deep-linking, the uniform not-found, "What's included"), the deferred #254 param-parsed detail deep-link lands, and the script's re-derived `selectFeatured`/`peso` derivations sync to the lib laws they mirror — 8/17 today, 17/17 after, harness-only.

**Architecture:** Six tasks: (1) the derivation sync — `selectFeatured` mirrors `src/lib/featured.ts`'s ADR-0020 unpriced-first law, `peso` null-guards per `src/lib/format.ts`, the `bookParamValues` destructure lands, and the strip-ordered check renamed to the law it now enforces — no FAIL flips; (2) the home strip checks — plate-link counting, the detail-first ruling asserted BOTH ways (zero `/book?package=` on home + every plate parses to `/packages/<slug>`), the cover ⇔ observed over plates — three flips; (3) the /packages index checks — plate-link counting, priced-only cheapest + every-name full details, the cover ⇔ over plates — three flips; (4) the detail checks — "What's included" wording, page-wide cover alt, the param-parsed CTA, the uniform not-found copy — three flips + one passing check re-mechanized → **17/17**; (5) verification — final local proof, the deployed-teaser re-check (report-only), the repo gates, stack down + graphify; (6) docs, PR (the CONTEXT.md glossary entry rides it — owner fold-in ruling), the v1 ledger row (pure SKIP), issue close. One commit per task, the #254 pattern.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs), zero migrations, zero `packages/` changes, zero landing `src/` changes — ONE `.mjs` file (`apps/landing/scripts/verify/packages-pages.mjs`; `lib.mjs` is CONSUMED, never modified) plus main-only docs and the pre-existing `apps/landing/CONTEXT.md` glossary edit. Node's built-in WebSocket CDP harness (`lib.mjs`'s `connect()` + its #254-era `bookParamValues(param)` helper); Playwright 1.63.0's installed chromium as the CDP browser (`~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome` — probed this session; no system Chrome). `gh` CLI, GitHub Issues.

**Spec:** Implements ticket [#256 "packages-pages.mjs is #223-stale as a whole (9 FAILs at baseline: plate/card DOM shapes, uniform not-found, home package deep-links moved to detail)"](https://github.com/jeius/sevendays/issues/256) (labels `bug` + `ready-for-agent`), fenced out of #254 at execution (owner-ruled 2026-11-09: "Fence packages-pages out"), whose contract is the [agent brief](https://github.com/jeius/sevendays/issues/256#issuecomment-6733664561). The owner rulings, verbatim from the 2026-11-09 triage: **detail-first** — "Go with detail-first" (home featured plates and the /packages index link `/packages/<slug>`; no `/book?package=` outside the detail CTA; the services-vs-packages asymmetry is deliberate), plus the brief's four pinned judgment calls: the ruling asserted BOTH ways (zero `/book?package=` hrefs on home/index AND plates parse to the slug path), deep-links matched by PARSED param/path never exact href strings (reuse `bookParamValues`), cheapest derived over PRICED rows only (the #212 unpriced law), and the CoverPanel ⇔ clauses kept intact (the placeholder literal is byte-kept by design). The derivation sync is the brief's mirror-contract mandate: "the featured-selection and peso derivations stay RE-DERIVED in the script (not imported) … kept in sync with their landing lib counterparts by comment contract only." Key recon facts (2026-11-09, main `4b2f7cb`; every file below read whole this session):

- **The premise, evidence-pinned:** `packages-pages.mjs` scores exactly **8/17** on the local stack — the baseline is byte-preserved in #254's execution workspace at `.superpowers/sdd/2026-11-09-254-content-pages-stale-checks/baseline-packages-pages.txt` (still on disk this session). The nine FAILs, verbatim: `home: strip shows the expected featured cards — expected 4, got 0`; `home: strip cards deep-link /book?package=<id>`; `home: strip cards carry the cover rule (img ⇔ cover)`; `/packages: every active package renders — expected 11, got 0`; `/packages: full details (cheapest price + inclusions visible)`; `/packages: list cards carry the cover rule (lazy img ⇔ cover)`; `/packages/:slug renders by slug (name, price, inclusions)`; `detail: cover rule (placeholder ⇔ no cover)`; `unknown slug: uniform not-found (owner copy + browse link)`. The eight PASSes include `home: strip ordered price-ascending` (its OLD name — Task 1 renames it) and `detail: deep link targets the uuid` (passing via the exact-href form; Task 4 re-mechanizes it).
- **The three drift classes, statically verified this session:** (1) the strip plates (`featured-plates.tsx`) and index cards (`catalog-plates.tsx`) are each ONE `Link to='/packages/$slug'` — zero `<article>` on either surface (the count observes return 0, the cover observes return nulls); the detail hero (`package-detail.tsx`) dropped its `<article>` too. (2) Unknown slugs wear the global #223 NotFound — `not-found.tsx` renders "This page never developed." + "Back to home" / "Call or visit a branch" (the route-level notFound overrides are gone, M7 #223); the old check expects `Package not found.` + `Browse all packages`. (3) The sole `/book?package=` producer in landing src is the detail CTA (`package-detail.tsx`, `search={{ package: pkg.id }}`, label "Book this package", renders `a[href^="/book?package="]`) — home and /packages carry ZERO such hrefs by design.
- **The wording drift:** the detail spec-sheet heading is "What's included" (`package-detail.tsx`) — both the full-details and :slug-renders checks gate on the literal `'Inclusions'`, gone from both surfaces (the index plates carry name + peso-when-priced + description; no inclusions wording since #164 Round 3).
- **The derivation drift (silent — masked by today's all-priced live catalog):** the script's `selectFeatured` still sorts naive price-ascending, but `src/lib/featured.ts` has carried the ADR-0020 law since owner ruling 2026-10-12 — unpriced packages LEAD (name-ordered within the group), priced follow ascending (name tiebreak). The script's `peso` formats `null/100`; `src/lib/format.ts` returns `null` for the unpriced state (probed: the old form yields a phantom `₱0.00`, not NaN). Task 1 syncs both under the header's mirror contract.
- **The CoverPanel law is intact and byte-stable:** `coverImageUrl` present → `img` (`alt` = package name, `loading='lazy'`, `object-cover`); null → the initials placeholder carrying the literal "Cover photo coming soon" (kept verbatim so the CDP ⇔ assertion stays meaningful — the component's own comment). Only the CONTAINER selectors change (article → plate Link); every ⇔ clause survives as-is.
- **`bookParamValues(param)` semantics (the #254 seam, `lib.mjs`):** returns the DEDUPED values of `param` across every `a` whose parsed href has pathname `/book` — `[]` when none carry it (a param-less `/book` link contributes nothing; `/booking/<id>` links are pathname-filtered out). Probed in Node this session: `new URL('/packages/basic-package', origin).pathname.split('/packages/')[1]` → `'basic-package'`; the exact nav link `/packages` → `null` (and it never matches the `a[href^='/packages/']` prefix anyway).
- **The seed/catalyst facts:** `packageSeeds` = 15 entries, but the live CMS-owned catalog served 11 active at baseline; featured flags on Basic Package / A / B / C → strip length 4; `basic-package` priceCents 90000 → `₱900.00` (full-ICU Node probe — if a peso expectation ever differs, fix the RUNTIME, never edit the expectation). Every scenario expectation re-derives from the live `GET /api/v1/service-packages` payload; these numbers are context, not gates — the pinned baseline gate is.
- **The pinned-edit law is PRE-VERIFIED:** all 14 find/replace pairs below were applied to a file copy by machine this session against main `4b2f7cb` — each matches EXACTLY ONCE, and the assembled post-edit file passes `node --check` with exactly 17 `check()` call sites and is Biome-format-canonical (`biome format --stdin-file-path` output byte-identical; the `check --stdin-file-path` trailing "aren't fixed" exit-1 also fires on the pristine committed file — a stdin artifact, documented by #254).
- **The v1 disposition, pre-classified:** every path this ticket touches is main-only — `apps/landing/scripts/verify` (`scripts/seed-v1/paths.txt:24`), `apps/landing/CONTEXT.md` + the plan file + `docs/progress.md` (docs main-only per the #241/#254 precedent). Pure SKIP; the ledger row is appended on main (Task 6).

## Global Constraints

- **Branch:** `chore/256-packages-pages-stale-checks` off main `4b2f7cb` (confirm the only working-tree changes are the two pre-existing files below; if main has moved, branch off latest main — the pairs were verified against `4b2f7cb` and each carries the exactly-once guard). **Two files already sit modified/uncommitted in the tree from the 2026-11-09 triage:** `apps/landing/CONTEXT.md` (the "Detail-first (packages)" glossary entry — the owner's fold-into-PR ruling; it commits verbatim, Task 0) and `graphify-out/cache/last_query_stamp` (pre-existing graph dirt — NEVER commit it; graphify regenerates at close). The branch's first commit is the plan file + the CONTEXT.md entry.
- **The pinned-edit law:** every edit below is a find/replace pair whose find-block matches EXACTLY ONCE in its file (machine-verified at plan time against `4b2f7cb`). If any find matches ≠ 1 at execution, STOP — the file drifted; reconcile against main before editing. After every task's edits: `node --check apps/landing/scripts/verify/packages-pages.mjs`, then `pnpm --filter @sevendays/landing fix` (expected: rewrites NOTHING — the pinned blocks are Biome-format-canonical, probed; if `fix` rewrites anything, the edits drifted from this plan — stop and reconcile before committing).
- **The stack contract (Task 1 Step 1 brings it up; it stays up through Task 5):** three long-running processes — `pnpm --filter @sevendays/api dev` (port 8787; preexisting `packages/db/.env` provides the DB), `pnpm --filter @sevendays/landing dev` (port 3000; preexisting `apps/landing/.env.local` provides `API_URL`), and `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify-256 about:blank`. Scenarios run from the repo root — `node apps/landing/scripts/verify/packages-pages.mjs` (defaults `LANDING_VERIFY_URL=http://localhost:3000`, `API_VERIFY_URL=http://127.0.0.1:8787`, `CDP_HTTP=http://127.0.0.1:9222`). This is the same stack #254 used (2026-11-09, this machine). Scenario stdout lands in `.superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/` (gitignored) — one file per run, named in the steps.
- **The baseline gate:** the FIRST scenario run (Task 1 Step 1, before any edit) must reproduce the pinned baseline exactly — the nine FAIL lines named in the Spec and `8/17 checks passed` (cross-check: `.superpowers/sdd/2026-11-09-254-content-pages-stale-checks/baseline-packages-pages.txt`). Any other count — STOP: the stack or catalog drifted; reconcile before editing (never loosen an assertion to make a count match).
- **The harness laws:** the no-import rule (expectations re-derived from live API responses; owner-ratified copy byte-kept as literals) and the `text()` seam stays `document.body.innerText`. **`lib.mjs` is CONSUMED, never modified** — `bookParamValues` already exists from #254; this ticket adds nothing to the lib.
- **The floors:** the landing vitest suite is untouched — 16 files / 123 tests at every gate (`pnpm --filter @sevendays/landing test`; if the count differs, reconcile; do not loosen). No other suite is touched (api/api-client/admin floors unchanged). No `pnpm build` gate — zero application code changes; the repo gate is `pnpm check` green (Task 5).
- **The fences (NOT here, regardless of temptation):** landing `src/` — ZERO files change; the plates are correct and DETAIL-FIRST is the ruling (owner-ruled 2026-11-09), so if an assertion cannot be rewritten without a product change, STOP and report back on the issue; **`lib.mjs`, `content-pages.mjs`, `booking-wizard.mjs`, `confirmation-emails.mjs`, `cms-reflection.mjs`** — untouched, and the mutating scenarios are never run (cms-reflection mutates catalog rows); the e2e suite, visual baselines, and workflow (ADR-0022 — separate verdicts, zero overlap); `AGENTS.md` (no floor changes, no product rulings); the services cards' direct-book deep-links (a different, deliberate ruling).
- **Tick law:** `- [✅]` in this file and issue bodies alike, never plain `[x]`. Never commit secrets. `graphify update .` at close (code was modified) — its `graphify-out/` changes commit as their own `chore(graphify): post-#256 graph update` commit, the `1b9285a` pattern.

## File Structure

```text
apps/landing/scripts/verify/
  packages-pages.mjs   # the ONLY code file modified (T1 derivations ×4, T2 strip ×3, T3 index ×3, T4 detail ×4)
.superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/   # evidence (gitignored)
docs/superpowers/plans/2026-11-09-256-packages-pages-stale-checks.md   # this file (branch's first commit, with CONTEXT.md)
apps/landing/CONTEXT.md   # pre-existing glossary edit commits with the plan (T0 — the owner fold-in ruling)
docs/progress.md  docs/agents/v1-picks.md  graphify-out/   # T5/T6 (main-only)
```

---

### Task 0: Branch + first commit (plan + glossary)

**Files:**
- Create: the branch `chore/256-packages-pages-stale-checks` off `4b2f7cb`
- Commit: `docs/superpowers/plans/2026-11-09-256-packages-pages-stale-checks.md` (this file, already saved by the planner) + `apps/landing/CONTEXT.md` (the pre-existing "Detail-first (packages)" glossary entry — commits verbatim as it sits in the tree)

**Interfaces:** consumes nothing; produces the branch every later task commits to.

**Not here:** `graphify-out/cache/last_query_stamp` (pre-existing dirt — never staged); any script edit (Task 1 starts those).

- [✅] **Step 1: Branch and commit**

```bash
git checkout -b chore/256-packages-pages-stale-checks
git add docs/superpowers/plans/2026-11-09-256-packages-pages-stale-checks.md apps/landing/CONTEXT.md
git commit -m "docs: the #256 plan + the detail-first glossary entry (#256)"
```

Expected: the commit contains exactly two files; `git status` shows only the graphify cache stamp dirty afterward.

### Task 1: The derivation sync + the baseline gate

The script's two RE-DERIVED helpers mirror their landing lib counterparts again (the header's comment contract), the `bookParamValues` destructure lands ahead of its Task 2/Task 4 consumers, and the strip-ordered check is renamed to the law it now enforces. **No FAIL flips in this task** — today's live catalog is all-priced, so the synced sort orders identically; the gate is "same nine FAILs, same eight PASSes, one under its new name."

**Files:**
- Modify: `apps/landing/scripts/verify/packages-pages.mjs` (the destructure, `selectFeatured`, `peso`, the strip-ordered check name)

**Interfaces:**
- Consumes: `bookParamValues` on `connect()`'s returned page object (exists in `lib.mjs` since #254 — NOT modified here).
- Produces: `bookParamValues` in scope for Tasks 2 and 4; `peso(null) → null` semantics for Task 3's priced-only derivation and Task 4's null-guarded detail check.

**Not here:** any assertion rewrite (Tasks 2–4); any `lib.mjs` edit (fenced); the strip count/cover observes (Task 2 owns them).

- [✅] **Step 1: Bring up the stack + the baseline gate**

Three terminals, all long-running (they stay up through Task 5):

```bash
pnpm --filter @sevendays/api dev          # terminal 1 — wait for :8787 ready
pnpm --filter @sevendays/landing dev      # terminal 2 — wait for :3000 ready
~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify-256 about:blank   # terminal 3
```

Then, from the repo root:

```bash
mkdir -p .superpowers/sdd/2026-11-09-256-packages-pages-stale-checks
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/baseline-packages-pages.txt
```

Expected (the baseline gate — anything else, STOP and reconcile): exit 1 with exactly the nine FAIL lines named in the Spec (verbatim cross-check: `.superpowers/sdd/2026-11-09-254-content-pages-stale-checks/baseline-packages-pages.txt`), the eight PASS lines (including `PASS home: strip ordered price-ascending` — its OLD name), and `8/17 checks passed`. That exit 1 is the EXPECTED baseline, not a failure.

- [✅] **Step 2: The destructure**

Replace:

```js
  const page = await connect();
  const { go, text, evaluate, close } = page;
```

with:

```js
  const page = await connect();
  const { go, text, evaluate, bookParamValues, close } = page;
```

- [✅] **Step 3: `selectFeatured` synced to the ADR-0020 law**

Replace:

```js
function selectFeatured(packages) {
  const byPrice = (a, b) => a.priceCents - b.priceCents || a.name.localeCompare(b.name);
  const featured = packages.filter((p) => p.isFeatured).sort(byPrice);
  if (featured.length > 0) return featured;
  return [...packages].sort(byPrice).slice(0, 4);
}
```

with:

```js
function selectFeatured(packages) {
  // #256: synced to src/lib/featured.ts's law (ADR-0020 + owner ruling
  // 2026-10-12 — the mirror contract this header carries): unpriced
  // packages LEAD the strip (name-ordered within the group), priced
  // follow ascending (name tiebreak) — inquiry-priced reads as the
  // headliner, not the tail.
  const byPrice = (a, b) => {
    if (a.priceCents === null && b.priceCents === null) return a.name.localeCompare(b.name);
    if (a.priceCents === null) return -1;
    if (b.priceCents === null) return 1;
    return a.priceCents - b.priceCents || a.name.localeCompare(b.name);
  };
  const featured = packages.filter((p) => p.isFeatured).sort(byPrice);
  if (featured.length > 0) return featured;
  return [...packages].sort(byPrice).slice(0, 4);
}
```

- [✅] **Step 4: `peso` null-guarded**

Replace:

```js
const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
```

with:

```js
// #256: mirrors src/lib/format.ts — null is the unpriced state and
// returns null (the old form would format null/100 as ₱0.00).
const peso = (cents) =>
  cents === null
    ? null
    : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
```

- [✅] **Step 5: The strip-ordered check renamed to the law**

Replace:

```js
  check(
    'home: strip ordered price-ascending',
    positions.every((pos, i) => pos >= 0 && (i === 0 || positions[i - 1] < pos))
  );
```

with:

```js
  check(
    'home: strip ordered unpriced-first, then price-ascending (ADR-0020)',
    positions.every((pos, i) => pos >= 0 && (i === 0 || positions[i - 1] < pos))
  );
```

- [✅] **Step 6: Syntax + format + the no-flip gate**

```bash
node --check apps/landing/scripts/verify/packages-pages.mjs
pnpm --filter @sevendays/landing fix
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/task1-packages-pages.txt
```

Expected: clean `node --check`; `fix` rewrites nothing; STILL `8/17` with the SAME nine FAILs and eight PASSes — but `PASS home: strip ordered unpriced-first, then price-ascending (ADR-0020)` replaces the old-name line (the only name change).

- [✅] **Step 7: Commit**

```bash
git add apps/landing/scripts/verify/packages-pages.mjs
git commit -m "chore(landing): verify packages derivations synced to the lib laws (#256)"
```

### Task 2: The home strip checks — plate counting, detail-first both ways, the cover ⇔ over plates

The owner's detail-first ruling becomes the assertion. Three FAILs flip: the strip count (plates counted by their `/packages/` link prefix inside the featured section), the strip deep-link (zero `/book?package=` on home AND every plate's parsed href is the package's slug path), and the strip cover rule (the same img ⇔ cover / placeholder ⇔ null ⇔, observed over Link plates instead of articles). 8/17 → 11/17.

**Files:**
- Modify: `apps/landing/scripts/verify/packages-pages.mjs` (the strip count block, the strip deep-link block, the strip cover observe)

**Interfaces:**
- Consumes: `bookParamValues` (Task 1's destructure) and `strip` (the existing selection).
- Produces: nothing later tasks consume (Task 3's index observes are structurally identical but independently defined over the `/packages` page).

**Not here:** the strip-collapses check and the hero/CTA/heading checks (byte-stable, already passing); the index page (Task 3); the detail page (Task 4).

- [ ] **Step 1: The strip count over plate links**

Replace:

```js
  const homeCards = await evaluate(
    `document.querySelector("section[data-strip='featured']")?.querySelectorAll('article').length ?? 0`
  );
```

with:

```js
  // #256: the #164/#223 strip plates are whole-card Links into the
  // detail page — no <article> since. Count the plates by their
  // /packages/ link prefix inside the featured section (the trailing
  // slash keeps the nav's exact-/packages link out).
  const homeCards = await evaluate(
    `document.querySelector("section[data-strip='featured']")?.querySelectorAll("a[href^='/packages/']").length ?? 0`
  );
```

(The `check('home: strip shows the expected featured cards', …)` below it is byte-stable — the mechanism changed, the contract did not.)

- [ ] **Step 2: The detail-first deep-link check**

Replace:

```js
  const stripLinks = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?package="]')].map(a => a.getAttribute('href'))`
  );
  check(
    'home: strip cards deep-link /book?package=<id>',
    strip.every((p) => stripLinks.includes(`/book?package=${p.id}`))
  );
```

with:

```js
  // #256 (owner-ruled 2026-11-09): packages are DETAIL-FIRST — strip
  // plates link the package detail page, never /book directly (contrast
  // the services cards' direct-book deep-links). Asserted both ways:
  // zero /book package params on home, and every plate's parsed href is
  // the package's /packages/<slug> path.
  const stripBookPackageIds = await bookParamValues('package');
  const stripPlateSlugs = await evaluate(`(() => {
    const section = document.querySelector("section[data-strip='featured']");
    const slugs = [];
    for (const a of section?.querySelectorAll("a[href^='/packages/']") ?? []) {
      const url = new URL(a.getAttribute('href'), location.origin);
      slugs.push(url.pathname.split('/packages/')[1] ?? null);
    }
    return slugs;
  })()`);
  check(
    'home: strip plates are detail-first (no /book?package=; /packages/<slug> links)',
    stripBookPackageIds.length === 0 && strip.every((p) => stripPlateSlugs.includes(p.slug)),
    `slugs: ${JSON.stringify(stripPlateSlugs)}`
  );
```

- [ ] **Step 3: The strip cover observe over plates**

Replace:

```js
  const stripObserved = await evaluate(`(() => {
    const articles = [...document.querySelectorAll("section[data-strip='featured'] article")];
    const names = ${JSON.stringify(strip.map((p) => p.name))};
    return names.map((n) => {
      const a = articles.find((el) => el.querySelector('h3')?.textContent === n);
```

with:

```js
  // #256: same cover ⇔ rule, observed over the Link plates (the h3 and
  // the CoverPanel ride inside the plate Link).
  const stripObserved = await evaluate(`(() => {
    const plates = [...document.querySelectorAll("section[data-strip='featured'] a[href^='/packages/']")];
    const names = ${JSON.stringify(strip.map((p) => p.name))};
    return names.map((n) => {
      const a = plates.find((el) => el.querySelector('h3')?.textContent === n);
```

(The rest of the observe body — `hasImg` / `hasPlaceholder` — and the `check('home: strip cards carry the cover rule (img ⇔ cover)', …)` below it are byte-stable: the CoverPanel law is intact, only the container changed.)

- [ ] **Step 4: Syntax + format + the flip gate**

```bash
node --check apps/landing/scripts/verify/packages-pages.mjs
pnpm --filter @sevendays/landing fix
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/task2-packages-pages.txt
```

Expected: **`11/17`** — `PASS home: strip shows the expected featured cards — expected 4, got 4` (or the live strip length, matching itself), `PASS home: strip plates are detail-first (no /book?package=; /packages/<slug> links) — slugs: […]` (the four featured slugs), `PASS home: strip cards carry the cover rule (img ⇔ cover)`. The remaining six FAILs are exactly the index/detail/not-found checks (their pre-rewrite names).

- [ ] **Step 5: Commit**

```bash
git add apps/landing/scripts/verify/packages-pages.mjs
git commit -m "chore(landing): the featured-strip checks assert the Link plates, detail-first (#256)"
```

### Task 3: The /packages index checks — plate counting, priced-only full details, the cover ⇔ over plates

Three FAILs flip: the index count (plate links document-wide — the nav's exact `/packages` link never matches the trailing-slash prefix), the full-details check (cheapest derived over PRICED rows only per the #212 unpriced law + every package name visible — the index carries no inclusions wording since #164 Round 3), and the list cover rule (the lazy-img ⇔ observe over plates). 11/17 → 14/17.

**Files:**
- Modify: `apps/landing/scripts/verify/packages-pages.mjs` (the index count block, the full-details block, the list cover observe)

**Interfaces:**
- Consumes: `peso` with its Task 1 null-guard; `packages`/`listText` (existing).
- Produces: `priced`/`cheapest` (local to the full-details block; nothing later consumes them).

**Not here:** the empty-state ⇔ check (byte-stable, already passing); the detail page (Task 4); any seed/catalog mutation (read-only harness).

- [ ] **Step 1: The index count over plate links**

Replace:

```js
  const listCards = await evaluate(`document.querySelectorAll('article').length`);
```

with:

```js
  // #256: the index plates are whole-card Links (no <article> since
  // #164) — counted by the /packages/ link prefix; the nav's
  // exact-/packages link never matches the trailing-slash prefix.
  const listCards = await evaluate(`document.querySelectorAll("a[href^='/packages/']").length`);
```

- [ ] **Step 2: The full-details check, priced-safe**

Replace:

```js
  const cheapest = Math.min(...packages.map((p) => p.priceCents));
  check(
    '/packages: full details (cheapest price + inclusions visible)',
    listText.includes(peso(cheapest)) && listText.includes('Inclusions')
  );
```

with:

```js
  // #256: the plates carry name + peso (priced) + description — the
  // index carries no inclusions wording since #164 Round 3. Cheapest
  // derives over PRICED rows only (ADR-0020: unpriced rows render no
  // price — Math.min over nulls coerces to a phantom ₱0.00).
  const priced = packages.filter((p) => p.priceCents != null);
  const cheapest = Math.min(...priced.map((p) => p.priceCents));
  check(
    '/packages: full details (cheapest price + every name visible)',
    (priced.length === 0 || listText.includes(peso(cheapest))) &&
      packages.every((p) => listText.includes(p.name))
  );
```

- [ ] **Step 3: The list cover observe over plates**

Replace:

```js
  const listObserved = await evaluate(`(() => {
    const articles = [...document.querySelectorAll('article')];
    const names = ${JSON.stringify(packages.map((p) => p.name))};
    return names.map((n) => {
      const a = articles.find((el) => el.querySelector('h3')?.textContent === n);
```

with:

```js
  // #256: same lazy-img ⇔ cover rule, observed over the Link plates.
  const listObserved = await evaluate(`(() => {
    const plates = [...document.querySelectorAll("a[href^='/packages/']")];
    const names = ${JSON.stringify(packages.map((p) => p.name))};
    return names.map((n) => {
      const a = plates.find((el) => el.querySelector('h3')?.textContent === n);
```

(The observe's `loading`/`objectCover` clauses and the `check('/packages: list cards carry the cover rule (lazy img ⇔ cover)', …)` are byte-stable — CoverPanel still renders `loading='lazy'` + `object-cover`.)

- [ ] **Step 4: Syntax + format + the flip gate**

```bash
node --check apps/landing/scripts/verify/packages-pages.mjs
pnpm --filter @sevendays/landing fix
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/task3-packages-pages.txt
```

Expected: **`14/17`** — `PASS /packages: every active package renders` (count = the live active count, matching itself), `PASS /packages: full details (cheapest price + every name visible)`, `PASS /packages: list cards carry the cover rule (lazy img ⇔ cover)`. The remaining three FAILs are exactly `:slug renders` / `detail cover rule` / `unknown-slug not-found` (pre-rewrite names).

- [ ] **Step 5: Commit**

```bash
git add apps/landing/scripts/verify/packages-pages.mjs
git commit -m "chore(landing): the packages-index checks assert the Link plates (#256)"
```

### Task 4: The detail page + the uniform not-found — three flips and the deferred re-form

The last three FAILs flip, and #254's deferred param-parsed detail deep-link lands (its check already passes via the exact-href form — this re-mechanizes it, the `bookParamValues` seam, without flipping). The detail cover observe drops its dead `<article>` scoping; the :slug check gates on "What's included" with a null-guarded peso; the unknown-slug check asserts the #223 global uniform not-found. 14/17 → **17/17, exit 0**.

**Files:**
- Modify: `apps/landing/scripts/verify/packages-pages.mjs` (the :slug-renders block, the detail cover evaluate, the detail deep-link block, the unknown-slug check)

**Interfaces:**
- Consumes: `bookParamValues` (Task 1's destructure); `peso` null-guard (Task 1); `basic` (the existing seed-drift-guarded probe package).
- Produces: nothing — the scenario's terminal state.

**Not here:** the not-an-error-boundary check (byte-stable, already passing); the detail cover check's ⇔ clauses (byte-stable — only the evaluate selector changes); the teaser (Task 5).

- [ ] **Step 1: The :slug renders check — wording + null-guarded peso**

Replace:

```js
  check(
    '/packages/:slug renders by slug (name, price, inclusions)',
    detail.includes(basic.name) &&
      detail.includes(peso(basic.priceCents)) &&
      detail.includes('Inclusions')
  );
```

with:

```js
  // #256: the detail's spec-sheet heading is "What's included" since
  // the #164 Round-3 rewrite; peso null-guarded (the unpriced law — an
  // unpriced probe package renders no price line).
  const basicPrice = peso(basic.priceCents);
  check(
    '/packages/:slug renders by slug (name, price, inclusions)',
    detail.includes(basic.name) &&
      (basicPrice === null || detail.includes(basicPrice)) &&
      detail.includes("What's included")
  );
```

(The check NAME stays byte-stable — name, price, and the inclusions section are all still what it asserts.)

- [ ] **Step 2: The detail cover observe — page-wide alt match**

Replace:

```js
  const detailCover = await evaluate(
    `[...document.querySelectorAll('article img')].some(i => i.getAttribute('alt') === ${JSON.stringify(basic.name)})`
  );
```

with:

```js
  // #256: the detail hero dropped its <article> wrapper — the cover img
  // is the page's only alt=<name> image (the spec sheet renders none).
  const detailCover = await evaluate(
    `[...document.querySelectorAll('img')].some(i => i.getAttribute('alt') === ${JSON.stringify(basic.name)})`
  );
```

- [ ] **Step 3: The deferred param-parsed deep-link re-form**

Replace:

```js
  const detailLink = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?package="]')].map(a => a.getAttribute('href'))[0] ?? null`
  );
  check('detail: deep link targets the uuid', detailLink === `/book?package=${basic.id}`);
```

with:

```js
  // #254/#256: the deferred re-form — the deep-link assertion matches
  // the PARSED package param, never the exact href string (the router's
  // search serialization is not the contract). The detail CTA is the
  // page's sole /book?package= carrier.
  const detailPackageIds = await bookParamValues('package');
  check('detail: deep link targets the uuid', detailPackageIds.includes(basic.id));
```

- [ ] **Step 4: The uniform not-found**

Replace:

```js
  check(
    'unknown slug: uniform not-found (owner copy + browse link)',
    missing.includes('Package not found.') && missing.includes('Browse all packages')
  );
```

with:

```js
  // #256 (#223): unknown slugs wear the site-wide uniform NotFound —
  // the route-level notFound overrides are gone (M7 #223). Owner-ratified
  // copy, byte-kept literal.
  check(
    'unknown slug: uniform not-found (#223 global copy + back-to-home)',
    missing.includes('This page never developed.') && missing.includes('Back to home')
  );
```

- [ ] **Step 5: Syntax + format + the full-green gate**

```bash
node --check apps/landing/scripts/verify/packages-pages.mjs
pnpm --filter @sevendays/landing fix
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/task4-packages-pages.txt
```

Expected: **`17/17 checks passed`, exit 0** — the ticket's local end state. `PASS /packages/:slug renders by slug (name, price, inclusions)`, `PASS detail: cover rule (placeholder ⇔ no cover)`, `PASS detail: deep link targets the uuid` (via the parsed param), `PASS unknown slug: uniform not-found (#223 global copy + back-to-home)`, `PASS unknown slug: not an error boundary`.

- [ ] **Step 6: Commit**

```bash
git add apps/landing/scripts/verify/packages-pages.mjs
git commit -m "chore(landing): the detail checks re-formed — What's included, param-parsed CTA, uniform not-found (#256)"
```

### Task 5: Verification — the final proof, the teaser re-check, the repo gates, the stack down

The consolidated verification task (the #254 pattern): the local stack re-proves the whole scenario, the deployed teaser exercises the rewritten checks against drifted content (report-only — the local stack is the commit gate), the repo gates run, and the stack comes down. Nothing commits except graphify at the very end.

**Files:** none modified (evidence files only, gitignored).

**Interfaces:** consumes Tasks 1–4's commits; produces the evidence Task 6's PR body and close comment cite.

**Not here:** `content-pages.mjs` / `booking-wizard.mjs` / `cms-reflection.mjs` runs (fenced — this ticket changed nothing they consume); the e2e/visual suite (ADR-0022).

- [ ] **Step 1: packages-pages, final local proof**

```bash
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/final-packages-pages.txt
```

Expected: `17/17 checks passed` (exit 0).

- [ ] **Step 2: The deployed-teaser re-check (report-only)**

The pages didn't change in this ticket — the teaser serves them already — so this validates the REWRITTEN checks against the teaser's live state (its catalog may carry unpriced rows and saved covers, exercising the ADR-0020 sort and both cover arms; its serialization exercises the parsed-param checks). From the repo root, against the GitHub `teaser` environment's hosts (the #241-pinned values):

```bash
LANDING_VERIFY_URL=https://sevendays-landing.pahamajulius.workers.dev \
API_VERIFY_URL=https://sevendays-api.pahamajulius.workers.dev \
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/teaser-packages-pages.txt
```

Expected: `17/17` — but ANY failure here is a FINDING, not a blocker: record the failing check names + detail lines verbatim for the PR body (that environment truth is exactly what the parsed-param hardening was ruled for; the local run remains the gate). If the teaser is unreachable (network), record that instead.

- [ ] **Step 3: The repo gates**

```bash
pnpm check
```

Expected: green across the repo — the landing suite at its floor (16 files / 123 tests), lint/format/typecheck clean for the touched workspace (the `.mjs` edits are Biome-canonical and outside tsc's scope). If any gate count differs from the floors, reconcile before proceeding (never loosen).

- [ ] **Step 4: Stack down + graphify**

Stop the three long-running processes (the chrome by `pkill -f cdp-verify-256`; the two dev servers by their own control), then:

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#256 graph update"
```

(The graph update is the `1b9285a` pattern; if `graphify update .` reports no changes, skip the empty commit. The pre-existing `graphify-out/cache/last_query_stamp` dirt folds into this update.)

### Task 6: Docs, PR, the v1 ledger row, issue close

Pure main-only close-out. Every path in the PR is a v1-absent path, so the pick classifier's verdict is SKIP and the ledger row is appended on main — no v1 checkout, no cherry-pick.

**Files:**
- Modify: `docs/progress.md` (one dated entry, appended beside the 2026-11-09 #254 entry)
- Modify: `docs/agents/v1-picks.md` (one SKIP row, appended at the ledger tail)
- Create: the PR (squash-merge to main)

**Interfaces:** consumes Task 5's evidence files + the merged PR number/sha; produces the close comment on #256.

**Not here:** any v1 work (pure SKIP); `AGENTS.md` (no floor or ruling changes — the detail-first ruling lives in the glossary + the brief, both already recorded); filing any new ticket (none needed — #256 IS the fenced follow-up).

- [ ] **Step 1: The progress entry**

Append to `docs/progress.md`'s dated section (beside the 2026-11-09 #254 entry), filling bracketed values from the actual runs:

```markdown
- **2026-11-XX — the packages-pages #223-stale checks rewritten (#256) — harness-only, zero landing src.** The nine checks that went stale with the #223/#224 redesign (fenced out of #254 at execution) now assert the current contracts (owner-ruled 2026-11-09, detail-first confirmed in the triage brief): the strip/index plates counted and observed as whole-card Links (`a[href^='/packages/']` — no `<article>` since #164); the detail-first ruling asserted BOTH ways (zero `/book?package=` hrefs on home//packages via `bookParamValues`, every plate's parsed href the `/packages/<slug>` path); the cover ⇔ rules unchanged over the new containers (the CoverPanel placeholder literal byte-kept by design); the full-details checks priced-safe (cheapest over priced rows only — ADR-0020 — + every name on the index, "What's included" on the detail); the unknown-slug check on the #223 uniform NotFound copy; and the deferred #254 re-form landed (the detail CTA param-parsed, never an exact href). The re-derived `selectFeatured` synced to `src/lib/featured.ts`'s unpriced-first law and `peso` null-guarded per `src/lib/format.ts` (the header's mirror contract — both silent drifts masked by the all-priced catalog). packages-pages 8/17 → **17/17**; teaser re-check <result>; landing floor unchanged (16 files / 123 tests). The detail-first ruling joined the landing glossary (CONTEXT.md, "Detail-first (packages)").
```

- [ ] **Step 2: The PR**

```bash
git push -u origin chore/256-packages-pages-stale-checks
gh pr create --title "chore(landing): packages-pages #223-stale checks rewritten — plate DOM, detail-first, uniform not-found (#256)" --body-file - << 'EOF'
Implements #256 (brief: https://github.com/jeius/sevendays/issues/256#issuecomment-6733664561). Harness-only — zero landing `src/` files, zero lib changes.

- The nine #223-stale checks rewritten per the 2026-11-09 rulings: strip/index plates counted + cover-⇔-observed as whole-card Links (`a[href^='/packages/']`); **detail-first asserted both ways** — zero `/book?package=` hrefs on home and /packages (`bookParamValues`), every plate's parsed href the `/packages/<slug>` path; full details priced-safe (cheapest over priced rows only + every name; "What's included" on the detail); unknown slug on the #223 uniform NotFound ("This page never developed." + "Back to home").
- The deferred #254 re-form: the detail CTA deep-link matches the PARSED package param, never an exact href string.
- The derivation sync (the header's mirror contract): `selectFeatured` → `src/lib/featured.ts`'s ADR-0020 unpriced-first law; `peso` null-guarded per `src/lib/format.ts`.
- The detail-first ruling joined the landing glossary (`apps/landing/CONTEXT.md` — "Detail-first (packages)").
- packages-pages 8/17 → **17/17** (per-task flip evidence in `.superpowers/sdd/2026-11-09-256-packages-pages-stale-checks/`). Teaser re-check: <result — 17/17 or the recorded findings>. `pnpm check` green; landing floor unchanged (16 files / 123 tests).
EOF
```

Squash-merge to main. Record the merge's main sha + PR number.

- [ ] **Step 3: The v1 ledger row (SKIP, appended on main)**

On main, append one row to `docs/agents/v1-picks.md`'s ledger, filling bracketed values:

```markdown
| 2026-11-XX | #<PR> | `<main-sha>` | skip | — | #256 — the packages-pages #223-stale checks rewritten: harness-only (plate-link counting + cover ⇔ over Links, detail-first both ways, priced-safe full details, "What's included", the #223 uniform not-found, the deferred param-parsed detail CTA, the selectFeatured/peso derivation sync). Zero landing src, zero lib changes, zero suites (landing floor 16/123 held). All paths main-only (apps/landing/scripts/verify per paths.txt:24 + CONTEXT.md + the plan file + docs) — pure SKIP. Locks: pnpm check green; packages-pages 17/17 on the local stack; teaser re-check <result>. |
```

Commit as `docs(v1-picks): the #256 skip row (#256)` (the `4b2f7cb` pattern) and push to main.

- [ ] **Step 4: Close the issue**

```bash
gh issue close 256 --comment "Landed in #<PR> (main \`<main-sha>\`; pure v1 SKIP — every path main-only, the ledger row records it). AC1 packages-pages 17/17 local, exit 0 (task4/final evidence). AC2 no exact \`/book?package=\` href matching — the detail CTA is param-parsed via \`bookParamValues\`, the plate links path-parsed. AC3 detail-first asserted both ways: zero /book?package= hrefs on home and /packages, every plate parses to /packages/<slug>. AC4 the three cover ⇔ observes pass over the plate containers with the placeholder literal intact on the null arm. AC5 unknown slug asserts 'This page never developed.' + 'Back to home'; the not-an-error-boundary check still passes. AC6 the diff touches only packages-pages.mjs — zero landing src, zero lib changes. AC7 pnpm check green; progress.md updated. Plus the brief's mirror-contract mandate: selectFeatured synced to the ADR-0020 unpriced-first law, peso null-guarded. The detail-first ruling is recorded in the landing glossary (CONTEXT.md) and the 2026-11-09 triage brief."
```

- [ ] **Step 5: Final sweep**

Confirm: working tree clean (evidence stays gitignored under `.superpowers/`; the graphify stamp committed with the graph update); the branch deleted after merge; this plan file's boxes ticked `- [✅]` throughout.

