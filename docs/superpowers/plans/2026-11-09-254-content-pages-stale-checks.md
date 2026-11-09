# Content-Pages #223-Stale Checks Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **This ticket is NOT UI-bearing** — zero landing `src/` files change, so the UI/UX skill-set loading rule does not apply. The long-running stack (Task 1 Step 1) stays up through Task 6; every task's scenario run reuses it.

**Goal:** The three #223-stale checks in the landing content-pages verification scenario are rewritten against the owner-ruled current contracts (add-ons absence, walk-in aria-labels, case-insensitive testimonials), and the environment-sensitive blurb + deep-link checks are hardened to follow the live site-settings wire and parsed `/book` query params instead of exact strings.

**Architecture:** Seven tasks: (1) the deep-link seam — one additive `bookParamValues(param)` helper in the shared CDP lib plus five call-site re-forms across both scenarios, one commit; (2) the hero blurb follows the live site-settings read; (3) the add-ons check inverts to guard the ruling's absence; (4) the walk-in check asserts the indicator's aria-label pair; (5) the testimonials check matches case-insensitively over the unchanged `innerText` seam — each ruling its own commit, each observed flipping its named check on the live stack; (6) the verification task — both scenarios green, the deployed-teaser re-check (report-only), the repo gates; (7) docs, PR, the v1 ledger row (pure SKIP), issue close, graphify.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs), zero migrations, zero `packages/` changes, zero landing `src/` changes — three `.mjs` files under `apps/landing/scripts/verify/` plus main-only docs. Node's built-in WebSocket CDP harness (`lib.mjs`'s `connect()`); Playwright 1.63.0's installed chromium as the CDP browser (`~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome` — probed this session; no system Chrome exists). `gh` CLI, GitHub Issues.

**Spec:** Implements ticket [#254 "content-pages.mjs carries three #223-stale checks (add-ons cross-reference, walk-in badges, about testimonials)"](https://github.com/jeius/sevendays/issues/254) (labels `bug` + `ready-for-agent`), whose parent is #241 and whose contract is the [agent brief](https://github.com/jeius/sevendays/issues/254#issuecomment-6731701934). The four owner rulings, verbatim from the 2026-11-09 triage: **(1)** add-ons — "Invert to absence … Byte-keep the ruled literal in the script as the guarded absence, same pattern as the #241 strip-retirement check"; **(2)** walk-ins — "The aria-label pair … the card's indicator trigger carries `acceptsWalkIns ? 'Walk-ins welcome' : 'By appointment'`. Keep the both-states requirement"; **(3)** testimonials — "Case-insensitive innerText … Keep the shared text seam (`innerText`) unchanged; match the person case-insensitively in the check. The coming-soon ⇔ zero equivalence stays as-is"; **(4)** teaser hardening — "the blurb against live site settings and loosen the href form": the hero-blurb expectation follows the public site-settings read (saved `homeDescription` wins, ratified default when null), and deep-link assertions match by parsed query param, never exact href string. Key recon facts (2026-11-09, main `1b9285a`, tree clean — post-#253; every file below read whole this session):

- **The premise, A/B-proven (the issue's own run, 2026-11-09):** `content-pages.mjs` scores exactly **17/20** on the local stack with exactly three FAILs — `/services: one-line add-on cross-reference visible` (the copy left with the #164 Round-3 ruled services rewrite: `services.tsx`'s own comment reads "the add-ons line is GONE"), `/branches: walk-in badges show both states (live seed has both)` (the badge recomposed into the icon `WalkInIndicator` in `branch-card.tsx`; its state text lives only in the trigger's `aria-label` pair `'Walk-ins welcome' : 'By appointment'` and the tooltip copy — neither reaches `textContent`, which is what the check reads), and `/about: testimonials render the payload (coming-soon ⇔ zero)` (the attribution renders `{t.person}` in an `uppercase` mono figcaption in `about.tsx`, and `lib.mjs`'s `text()` is `document.body.innerText`, which applies CSS `text-transform` — the match fails on casing whenever testimonials exist). The two checks #241's plan believed teaser-failing (`home: teaser items deep-link /book?service=`, `home: ratified hero blurb visible`) PASS on the local stack — they are environment-sensitive, not stale.
- **Every find/replace pair below was applied to file copies and machine-verified this session:** each old block matches EXACTLY ONCE in its file, and the assembled post-edit files pass `node --check` and are Biome-format-canonical (`biome check --stdin-file-path` output byte-identical to input for all three files; the trailing "aren't fixed" stdin-mode message also fires on the pristine committed files — it is a stdin artifact, not a finding). The three new in-page `evaluate` bodies were syntax-checked standalone, and the `new URL(href, location.origin)` semantics probed in Node: `/book?service=x` → pathname `/book`, param `x`; `/booking/x?service=y` → pathname `/booking/x` (excluded by the pathname filter); a param-less `/book` link contributes nothing.
- **The walk-in DOM, probed:** on `/branches` each branch renders one `article` whose `h3` is the branch name (no CSS transform on it — the existing name+address+phone check passes today), exactly one `button` carrying a walk-in `aria-label` (the call affordance is an `<a aria-label="Call …">`, the Book CTA an unlabeled `<Link>`) — so `button[aria-label='Walk-ins welcome'], button[aria-label='By appointment']` selects the indicator and nothing else. The seeded flags: Calamba/Iligan `acceptsWalkIns: false`, Dipolog `true` (the script header's own note).
- **The site-settings wire (M7 #215):** `GET /api/v1/site-settings` answers the singleton object with every content field `string | null` on the wire — `homeDescription` is `z.string().max(1000).nullable()`; defaults never ride the wire, consumers resolve through `resolveSiteSettings`. The seed writes NO `site_settings` row (probed — zero seed references), so the local stack serves the born-empty all-null singleton and the hardened blurb check exercises its null→default arm locally; the teaser's saved copy exercises the saved-value arm. The ratified default, byte-pinned from `SITE_SETTINGS_DEFAULTS.homeDescription`: `Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.`
- **The deep-link surfaces (all probed):** home's services strip = `ServiceImageCard` (`home-cards.tsx`, `to='/book' search={{ service: service.id }}`); `/services` = `service-card.tsx` (same form); `/branches` = the `Book at this branch` `Link` with `search={{ branch }}`; packages strip + detail = `search={{ package }}`. All render `a[href="/book?…"]` today (the checks pass locally) — the hardening decouples the ASSERTION from that serialization, which is what drifted on the deployed teaser. The packages home hero CTA (`href === '/book'`, no query) is serialization-immune and stays untouched. `booking-wizard.mjs` and `cms-reflection.mjs` assert no `/book` hrefs (probed) — untouched, unfenced, and NOT run by this ticket (see fences).
- **Check counts, pinned:** `content-pages.mjs` = 20 checks; `packages-pages.mjs` = 17 checks (all passing today). Three checks get NEW names in this ticket (the assertion semantics changed): `/services: one-line add-on cross-reference visible` → `/services: add-on cross-reference stays retired (#164 Round 3)`; `/branches: walk-in badges show both states (live seed has both)` → `/branches: walk-in indicators carry the aria-label state (live seed has both)`; `home: ratified hero blurb visible (#111 resolution; ruled edit #101)` → `home: hero blurb renders the live settings (ratified default ⇔ null)`. Every other check name is byte-stable.
- **The v1 disposition, pre-classified:** every path this ticket touches is main-only — `apps/landing/scripts/verify` is a v1-absent path (`scripts/seed-v1/paths.txt:24`), and the plan file + `docs/progress.md` are main-only per the #241/#252 precedent. Pure SKIP; the ledger row is appended on main (Task 7).

## Global Constraints

- **Branch:** `chore/254-content-pages-stale-checks` off main `1b9285a` (confirm `git status` clean first; if main has moved, branch off latest main — the pairs below were verified against `1b9285a` and each carries the exactly-once guard). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#254)` squash style; every commit below is pinned verbatim.
- **The pinned-edit law:** every edit below is a find/replace pair whose find-block matches EXACTLY ONCE in its file (machine-verified at plan time against `1b9285a`). If any find matches ≠ 1 at execution, STOP — the file drifted; reconcile against main before editing. After every task's edits: `node --check` both touched scripts, then `pnpm --filter @sevendays/landing fix` (expected: rewrites NOTHING — the pinned blocks are Biome-format-canonical, probed; if `fix` rewrites anything, the edits drifted from this plan — stop and reconcile before committing).
- **The stack contract (Task 1 Step 1 brings it up; it stays up through Task 6):** three long-running processes — `pnpm --filter @sevendays/api dev` (port 8787; preexisting `packages/db/.env` provides the DB), `pnpm --filter @sevendays/landing dev` (port 3000; preexisting `apps/landing/.env.local` provides `API_URL`), and `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-verify-254 about:blank`. Scenarios run from the repo root: `node apps/landing/scripts/verify/content-pages.mjs` / `node apps/landing/scripts/verify/packages-pages.mjs` (defaults `LANDING_VERIFY_URL=http://localhost:3000`, `API_VERIFY_URL=http://127.0.0.1:8787`, `CDP_HTTP=http://127.0.0.1:9222`). This is the same stack the #241 walkthrough and the issue's A/B run used (2026-11-09, this machine). Scenario stdout lands in `.superpowers/sdd/2026-11-09-254-content-pages-stale-checks/` (gitignored) — one file per run, named in the steps.
- **The baseline gate:** the FIRST content-pages run (before any edit) must print exactly `17/20 checks passed` with exactly the three named FAILs, and the first packages-pages run exactly `17/17 checks passed` (exit 0). Any other count — STOP: the stack or seed drifted; reconcile before editing (never loosen an assertion to make a count match).
- **The harness laws:** the no-import rule (expectations re-derived from live API responses; ratified copy byte-kept as literals) and the `text()` seam stays `document.body.innerText` (the casing fix lives in the check, not the lib — owner-ruled). `lib.mjs` changes are ADDITIVE only (`bookParamValues` joins the returned helpers; nothing existing is renamed or altered).
- **The floors:** the landing vitest suite is untouched — 16 files / 123 tests at every gate (`pnpm --filter @sevendays/landing test` — if the count differs, reconcile; do not loosen). No other suite is touched (api/api-client/admin floors unchanged). No `pnpm build` gate — zero application code changes; the repo gate is `pnpm check` green (Task 6).
- **The fences (NOT here, regardless of temptation):** landing `src/` — ZERO files change; the pages are correct, only the harness assertions change, and if an assertion cannot be rewritten without a product change, STOP and report back on the issue; `booking-wizard.mjs` + `cms-reflection.mjs` — untouched and NOT run (the lib change is additive; running cms-reflection mutates catalog rows for nothing); the e2e suite, visual baselines, and workflow (ADR-0022 — separate verdicts, zero overlap); `AGENTS.md` (no floor changes, no product rulings); every sibling ticket's files.
- **Tick law:** `- [✅]` in this file and issue bodies alike, never plain `[x]`. Never commit secrets. `graphify update .` at close (code was modified) — its `graphify-out/` changes commit as their own `chore(graphify): post-#254 graph update` commit, the `1b9285a` pattern.

## File Structure

```text
apps/landing/scripts/verify/
  lib.mjs             # modify (T1) — additive bookParamValues(param) helper
  content-pages.mjs   # modify (T1 deep-links ×3 + destructure, T2 blurb + fetch, T3 add-ons, T4 walk-ins, T5 testimonials)
  packages-pages.mjs  # modify (T1) — destructure + the two package deep-link assertions
.superpowers/sdd/2026-11-09-254-content-pages-stale-checks/   # evidence (gitignored)
docs/superpowers/plans/2026-11-09-254-content-pages-stale-checks.md   # this file (branch's first commit)
docs/progress.md  docs/agents/v1-picks.md  graphify-out/   # T7 (main-only)
```

---

### Task 1: The deep-link seam — `bookParamValues` + five param-parsed re-forms

Ruling 4's href half. One additive helper in the shared lib (the only lib change in the ticket), consumed at five assertion sites across both scenarios — `/branches`' re-form keeps its text anchor (`Book at this branch`) because the CTA copy is part of what that check asserts; the other four drop exact-string matching entirely. No check flips in this task: all five pass today and must still pass via the new mechanism — this task's gate is "same counts, same names, still green."

**Files:**
- Modify: `apps/landing/scripts/verify/lib.mjs` (the returned-helpers tail)
- Modify: `apps/landing/scripts/verify/content-pages.mjs` (destructure + home teaser + /services + /branches deep-link blocks)
- Modify: `apps/landing/scripts/verify/packages-pages.mjs` (destructure + strip + detail deep-link blocks)

**Interfaces:**
- Consumes: nothing new (Task 0 is main's code).
- Produces: `bookParamValues(param: string): Promise<string[]>` on `connect()`'s returned page object — the deduped values of `param` across every `a` whose parsed href has pathname `/book` (Task 2–5 don't consume it; both scenarios' destructures name it).

**Not here:** the blurb/settings fetch (Task 2); any stale-check rewrite (Tasks 3–5); the packages hero CTA (`href === '/book'`, no query — serialization-immune).

- [ ] **Step 1: Bring the stack up + the baseline gate**

Start the three long-running processes (Global Constraints' stack contract — background tasks/panes): the api dev, the landing dev, and the CDP chrome. Wait for `http://localhost:3000` and `http://127.0.0.1:8787/api/v1/branches` to answer. Then, from the repo root:

```bash
mkdir -p .superpowers/sdd/2026-11-09-254-content-pages-stale-checks
node apps/landing/scripts/verify/content-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/baseline-content-pages.txt
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/baseline-packages-pages.txt
```

Expected (the baseline gate — anything else, STOP): content-pages exits 1 with exactly three FAIL lines — `/services: one-line add-on cross-reference visible`, `/branches: walk-in badges show both states (live seed has both)`, `/about: testimonials render the payload (coming-soon ⇔ zero)` — and `17/20 checks passed`; packages-pages exits 0 with `17/17 checks passed`.

- [ ] **Step 2: `lib.mjs` — the additive helper**

Replace:

```js
  const text = () => evaluate('document.body.innerText');
  const close = () => ws.close();
  return { send, evaluate, wait, go, text, close };
```

with:

```js
  const text = () => evaluate('document.body.innerText');
  // The /book deep-link seam (#254): a link's deep-link target is its
  // PARSED query param, never an exact href string — exact matching
  // couples the check to the router's search serialization (environment-
  // sensitive on the deployed teaser). Pathname-filtered so /booking/<id>
  // links never qualify; only links carrying the param are collected.
  const bookParamValues = (param) =>
    evaluate(`(() => {
      const values = new Set();
      for (const a of document.querySelectorAll('a[href*="/book"]')) {
        const url = new URL(a.getAttribute('href'), location.origin);
        if (url.pathname !== '/book') continue;
        const value = url.searchParams.get(${JSON.stringify(param)});
        if (value) values.add(value);
      }
      return [...values];
    })()`);
  const close = () => ws.close();
  return { send, evaluate, wait, go, text, bookParamValues, close };
```

- [ ] **Step 3: `content-pages.mjs` — destructure + the three re-forms**

(a) Replace:

```js
  const { go, text, evaluate, wait, close } = page;
```

with:

```js
  const { go, text, evaluate, wait, bookParamValues, close } = page;
```

(b) Replace (home teaser):

```js
  const teaserLinks = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?service="]')].map(a => a.getAttribute('href'))`
  );
  check(
    'home: teaser items deep-link /book?service=<id>',
    services.every((s) => teaserLinks.includes(`/book?service=${s.id}`))
  );
```

with:

```js
  // #254: the deep-link assertion matches the PARSED service param, never
  // the exact href string — the router's search serialization is not the
  // contract (environment-sensitive on the deployed teaser).
  const teaserServiceIds = await bookParamValues('service');
  check(
    'home: teaser items deep-link /book?service=<id>',
    services.every((s) => teaserServiceIds.includes(s.id))
  );
```

(c) Replace (/services cards):

```js
  const svcLinks = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?service="]')].map(a => a.getAttribute('href'))`
  );
  check(
    '/services: cards deep-link /book?service=<id>',
    services.every((s) => svcLinks.includes(`/book?service=${s.id}`))
  );
```

with:

```js
  // #254: same param-parsed form as the home teaser check.
  const svcServiceIds = await bookParamValues('service');
  check(
    '/services: cards deep-link /book?service=<id>',
    services.every((s) => svcServiceIds.includes(s.id))
  );
```

(d) Replace (/branches, text-anchored):

```js
  const branchLinks = await evaluate(
    `[...document.querySelectorAll('a')].filter(a => a.textContent.trim() === 'Book at this branch').map(a => a.getAttribute('href'))`
  );
  check(
    '/branches: Book at this branch deep-links /book?branch=<id>',
    branches.every((b) => branchLinks.includes(`/book?branch=${b.id}`))
  );
```

with:

```js
  // #254: param-parsed form, text-anchored — the CTA's copy stays part of
  // the assertion; the href string does not.
  const branchLinkIds = await evaluate(`
    (() => {
      const ids = [];
      for (const a of document.querySelectorAll('a')) {
        if (a.textContent.trim() !== 'Book at this branch') continue;
        const url = new URL(a.getAttribute('href'), location.origin);
        if (url.pathname === '/book') ids.push(url.searchParams.get('branch'));
      }
      return ids;
    })()
  `);
  check(
    '/branches: Book at this branch deep-links /book?branch=<id>',
    branches.every((b) => branchLinkIds.includes(b.id))
  );
```

- [ ] **Step 4: `packages-pages.mjs` — destructure + the two re-forms**

(a) Replace:

```js
  const { go, text, evaluate, close } = page;
```

with:

```js
  const { go, text, evaluate, bookParamValues, close } = page;
```

(b) Replace (home featured strip):

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
  // #254: param-parsed, never the exact href string (the router's search
  // serialization is not the contract).
  const stripPackageIds = await bookParamValues('package');
  check(
    'home: strip cards deep-link /book?package=<id>',
    strip.every((p) => stripPackageIds.includes(p.id))
  );
```

(c) Replace (detail):

```js
  const detailLink = await evaluate(
    `[...document.querySelectorAll('a[href^="/book?package="]')].map(a => a.getAttribute('href'))[0] ?? null`
  );
  check('detail: deep link targets the uuid', detailLink === `/book?package=${basic.id}`);
```

with:

```js
  // #254: same param-parsed form as the strip check above.
  const detailPackageIds = await bookParamValues('package');
  check('detail: deep link targets the uuid', detailPackageIds.includes(basic.id));
```

- [ ] **Step 5: Syntax + format + the no-flip gate**

```bash
node --check apps/landing/scripts/verify/lib.mjs
node --check apps/landing/scripts/verify/content-pages.mjs
node --check apps/landing/scripts/verify/packages-pages.mjs
pnpm --filter @sevendays/landing fix
node apps/landing/scripts/verify/content-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/task1-content-pages.txt
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/task1-packages-pages.txt
```

Expected: three clean `node --check` runs; `fix` rewrites nothing; content-pages STILL `17/20` with the SAME three FAILs (same names — nothing flipped, the deep-link checks still PASS via the new mechanism); packages-pages STILL `17/17`.

- [ ] **Step 6: Commit**

```bash
git add apps/landing/scripts/verify/lib.mjs apps/landing/scripts/verify/content-pages.mjs apps/landing/scripts/verify/packages-pages.mjs
git commit -m "chore(landing): verify deep-links match parsed /book params, never href strings (#254)"
```

### Task 2: The hero blurb follows the live site-settings wire

Ruling 4's blurb half. The check's expectation derives from the public settings read: the saved `homeDescription` wins (a teaser site-copy save no longer fails the check); the ratified default governs only while the field is null. No check flips locally (the local singleton is born-empty — the null→default arm runs; the saved-value arm exercises on the teaser, Task 6).

**Files:**
- Modify: `apps/landing/scripts/verify/content-pages.mjs` (the fetch block + the guard + the blurb check)

**Interfaces:**
- Consumes: nothing from Task 1 (the fetch precedes `connect()`).
- Produces: `settings` (the parsed `GET /api/v1/site-settings` body) in scope for the whole scenario — Tasks 3–5 don't consume it; the guard protects it.

**Not here:** any other settings field (only `homeDescription` rides an expectation); the hero title or any chrome copy (outside the brief).

- [ ] **Step 1: The fetch + the guard**

Replace:

```js
  const [servicesRes, branchesRes, galleryRes, testimonialsRes] = await Promise.all([
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/branches`),
    fetch(`${API}/api/v1/gallery`),
    fetch(`${API}/api/v1/testimonials`),
  ]);
  const services = await servicesRes.json();
  const branches = await branchesRes.json();
  const gallery = await galleryRes.json();
  const testimonials = await testimonialsRes.json();
```

with:

```js
  const [servicesRes, branchesRes, galleryRes, testimonialsRes, settingsRes] = await Promise.all([
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/branches`),
    fetch(`${API}/api/v1/gallery`),
    fetch(`${API}/api/v1/testimonials`),
    fetch(`${API}/api/v1/site-settings`),
  ]);
  const services = await servicesRes.json();
  const branches = await branchesRes.json();
  const gallery = await galleryRes.json();
  const testimonials = await testimonialsRes.json();
  const settings = await settingsRes.json();
```

Then replace (the last guard in the block):

```js
  if (!Array.isArray(branches) || branches.length === 0) {
    throw new Error('seed drift: no branches from the live API');
  }
```

with:

```js
  if (!Array.isArray(branches) || branches.length === 0) {
    throw new Error('seed drift: no branches from the live API');
  }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('seed drift: site-settings read is not the singleton object');
  }
```

- [ ] **Step 2: The check**

Replace:

```js
  check(
    'home: ratified hero blurb visible (#111 resolution; ruled edit #101)',
    home.includes(
      'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.'
    )
  );
```

with:

```js
  // #254 (owner-ruled 2026-11-09): the hero blurb follows the live wire —
  // the saved homeDescription wins (a teaser site-copy save no longer
  // fails the check); the ratified default (#111 resolution; ruled edit
  // #101) governs only while the field is null (defaults never ride the
  // wire — #215).
  const expectedBlurb =
    settings.homeDescription ??
    'Portrait, family, and event photography from our Calamba, Dipolog, and Iligan studios — booked in minutes, delivered in seven days.';
  check(
    'home: hero blurb renders the live settings (ratified default ⇔ null)',
    home.includes(expectedBlurb)
  );
```

- [ ] **Step 3: Syntax + format + the no-flip gate**

```bash
node --check apps/landing/scripts/verify/content-pages.mjs
pnpm --filter @sevendays/landing fix
node apps/landing/scripts/verify/content-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/task2-content-pages.txt
```

Expected: `17/20` with the SAME three FAILs; the blurb check PASSES under its new name `home: hero blurb renders the live settings (ratified default ⇔ null)` (the born-empty local singleton exercises the null→default arm).

- [ ] **Step 4: Commit**

```bash
git add apps/landing/scripts/verify/content-pages.mjs
git commit -m "chore(landing): the hero-blurb check follows the live site settings (#254)"
```

### Task 3: The add-ons check inverts to guard the ruling's absence

Ruling 1. The ruled-gone cross-reference line stays byte-kept in the script as the guarded absence — the #241 strip-retirement pattern. This is the first flip: 17/20 → 18/20.

**Files:**
- Modify: `apps/landing/scripts/verify/content-pages.mjs` (the add-ons check, in the /services block)

**Interfaces:** consumes `servicesText` (unchanged, from the existing /services walk); produces nothing.

**Not here:** asserting the broader absence of the word "add-ons" (payload drift could false-fail it — the ruled literal alone is the guard, per the #241 precedent).

- [ ] **Step 1: The inversion**

Replace:

```js
  check(
    '/services: one-line add-on cross-reference visible',
    servicesText.includes(
      'Looking for add-ons? Makeup, hairstyle, and more are available with any session.'
    )
  );
```

with:

```js
  // #254 (owner-ruled 2026-11-09): the cross-reference left with the #164
  // Round-3 ruled services rewrite — the check inverts to guard the
  // ruling's absence, the literal byte-kept (the #241 strip-retirement
  // pattern).
  check(
    '/services: add-on cross-reference stays retired (#164 Round 3)',
    !servicesText.includes(
      'Looking for add-ons? Makeup, hairstyle, and more are available with any session.'
    )
  );
```

- [ ] **Step 2: Syntax + format + the flip gate**

```bash
node --check apps/landing/scripts/verify/content-pages.mjs
pnpm --filter @sevendays/landing fix
node apps/landing/scripts/verify/content-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/task3-content-pages.txt
```

Expected: `18/20` — `PASS /services: add-on cross-reference stays retired (#164 Round 3)`; the remaining FAILs are exactly the walk-in and testimonials checks (their pre-rewrite names).

- [ ] **Step 3: Commit**

```bash
git add apps/landing/scripts/verify/content-pages.mjs
git commit -m "chore(landing): the add-ons cross-reference check inverts to guard the ruling (#254)"
```

### Task 4: The walk-in check asserts the indicator's aria-label pair

Ruling 2. Per branch, re-derived from the live payload: the article's indicator trigger carries `acceptsWalkIns ? 'Walk-ins welcome' : 'By appointment'`; the both-states requirement stays (the seed carries both flags). Second flip: 18/20 → 19/20.

**Files:**
- Modify: `apps/landing/scripts/verify/content-pages.mjs` (the walk-in check, in the /branches block)

**Interfaces:** consumes `branches` + the `evaluate` helper (the `branchArticles` textContent map stays — the name+address+phone check still reads it); produces `walkInLabels` (local to the check).

**Not here:** the tooltip copy (portal-rendered only while open — the aria-label is the stable seam, owner-ruled); the booking wizard's text `WalkInBadge` (a different surface, deliberately divergent per its own comment).

- [ ] **Step 1: The rewrite**

Replace:

```js
  check(
    '/branches: walk-in badges show both states (live seed has both)',
    branchArticles.some(
      (t, i) => t !== null && branches[i].acceptsWalkIns && t.includes('Walk-ins welcome')
    ) &&
      branchArticles.some(
        (t, i) => t !== null && !branches[i].acceptsWalkIns && t.includes('No walk-ins')
      )
  );
```

with:

```js
  // #254 (owner-ruled 2026-11-09): the text badge recomposed into the
  // icon WalkInIndicator (#223 Round 4) — the state text lives in the
  // trigger's aria-label pair, never in textContent. The check asserts the
  // label per branch, re-derived from the live payload, and keeps the
  // both-states requirement (the seed carries both flags).
  const walkInLabels = await evaluate(`
    (() => {
      const articles = [...document.querySelectorAll('article')];
      const branches = ${JSON.stringify(branches)};
      return branches.map((b) => {
        const a = articles.find((el) => el.querySelector('h3')?.textContent === b.name);
        const indicator = a?.querySelector(
          "button[aria-label='Walk-ins welcome'], button[aria-label='By appointment']"
        );
        return indicator ? indicator.getAttribute('aria-label') : null;
      });
    })()
  `);
  check(
    '/branches: walk-in indicators carry the aria-label state (live seed has both)',
    walkInLabels.every(
      (label, i) => label === (branches[i].acceptsWalkIns ? 'Walk-ins welcome' : 'By appointment')
    ) &&
      branches.some((b) => b.acceptsWalkIns) &&
      branches.some((b) => !b.acceptsWalkIns),
    `labels: ${JSON.stringify(walkInLabels)}`
  );
```

- [ ] **Step 2: Syntax + format + the flip gate**

```bash
node --check apps/landing/scripts/verify/content-pages.mjs
pnpm --filter @sevendays/landing fix
node apps/landing/scripts/verify/content-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/task4-content-pages.txt
```

Expected: `19/20` — `PASS /branches: walk-in indicators carry the aria-label state (live seed has both) — labels: […]` (three labels, one `'Walk-ins welcome'` and two `'By appointment'` in branch order); the only remaining FAIL is the testimonials check (its pre-rewrite name).

- [ ] **Step 3: Commit**

```bash
git add apps/landing/scripts/verify/content-pages.mjs
git commit -m "chore(landing): the walk-in check asserts the indicator's aria-label pair (#254)"
```

### Task 5: The testimonials check matches case-insensitively

Ruling 3. The attribution's `uppercase` transform no longer defeats the match; the `text()` seam stays `innerText` (owner-ruled); the coming-soon ⇔ zero equivalence is untouched. Final flip: 19/20 → 20/20.

**Files:**
- Modify: `apps/landing/scripts/verify/content-pages.mjs` (the testimonials check, in the /about block)

**Interfaces:** consumes `about` (the existing `text()` read) + `testimonials`; produces nothing.

**Not here:** `lib.mjs`'s `text()` (stays `innerText` — the fix lives in the check); the empty-branch arm's literal (kept exact — that paragraph carries no transform).

- [ ] **Step 1: The casing fix**

Replace:

```js
  check(
    '/about: testimonials render the payload (coming-soon ⇔ zero)',
    testimonials.length === 0
      ? about.includes('What clients say is coming soon.')
      : testimonials.every((t) => about.includes(t.person)) &&
          !about.includes('What clients say is coming soon.')
  );
```

with:

```js
  // #254 (owner-ruled 2026-11-09): the attribution renders uppercase mono
  // and text() is innerText (CSS text-transform applied) — the person
  // matches case-insensitively over the unchanged seam; the ⇔ rule stays.
  const aboutLower = about.toLowerCase();
  check(
    '/about: testimonials render the payload (coming-soon ⇔ zero)',
    testimonials.length === 0
      ? about.includes('What clients say is coming soon.')
      : !aboutLower.includes('what clients say is coming soon.') &&
          testimonials.every((t) => aboutLower.includes(t.person.toLowerCase()))
  );
```

- [ ] **Step 2: Syntax + format + the full-green gate**

```bash
node --check apps/landing/scripts/verify/content-pages.mjs
pnpm --filter @sevendays/landing fix
node apps/landing/scripts/verify/content-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/task5-content-pages.txt
```

Expected: **`20/20 checks passed`**, exit 0 — the ticket's local end state.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/scripts/verify/content-pages.mjs
git commit -m "chore(landing): the testimonials check matches persons case-insensitively (#254)"
```

### Task 6: Verification — the teaser re-check, the repo gates, the stack down

The consolidated verification task (the #241 pattern): the local stack re-proves both scenarios, the deployed teaser exercises the hardened checks against drifted content (report-only — the local stack is the commit gate), and the repo gates run. Nothing commits except graphify at the very end.

**Files:** none modified (evidence files only, gitignored).

**Interfaces:** consumes Tasks 1–5's commits; produces the evidence Task 7's PR body and close comment cite.

**Not here:** `booking-wizard.mjs` / `cms-reflection.mjs` runs (fenced — additive lib change, nothing to prove); the e2e/visual suite (ADR-0022).

- [ ] **Step 1: Both scenarios, final local proof**

```bash
node apps/landing/scripts/verify/content-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/final-content-pages.txt
node apps/landing/scripts/verify/packages-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/final-packages-pages.txt
```

Expected: `20/20 checks passed` (exit 0) and `17/17 checks passed` (exit 0).

- [ ] **Step 2: The deployed-teaser re-check (report-only)**

The pages didn't change in this ticket — the teaser serves them already — so this validates the REWRITTEN checks against the teaser's drifted state (its saved site copy exercises the blurb's saved-value arm; its serialization exercises the param-parsed deep-links). From the repo root, against the GitHub `teaser` environment's hosts (the #241-pinned values):

```bash
LANDING_VERIFY_URL=https://sevendays-landing.pahamajulius.workers.dev \
API_VERIFY_URL=https://sevendays-api.pahamajulius.workers.dev \
node apps/landing/scripts/verify/content-pages.mjs | tee .superpowers/sdd/2026-11-09-254-content-pages-stale-checks/teaser-content-pages.txt
```

Expected: `20/20` — but ANY failure here is a FINDING, not a blocker: record the failing check names + detail lines verbatim for the PR body (that environment truth is exactly what this ticket's hardening was ruled for). If the teaser is unreachable (network), record that instead — the local run remains the gate. Optionally repeat with `packages-pages.mjs` (same env pair) — also report-only.

- [ ] **Step 3: The repo gates**

```bash
pnpm check
```

Expected: green across the repo — the landing suite at its floor (16 files / 123 tests), lint/format/typecheck clean for the touched workspace (the `.mjs` edits are Biome-canonical and outside tsc's scope). If any gate count differs from the floors, reconcile before proceeding (never loosen).

- [ ] **Step 4: Stack down + graphify**

Stop the three background processes (the chrome by `pkill -f cdp-verify-254`; the two dev servers by their own control), then:

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#254 graph update"
```

(The graph update is the `1b9285a` pattern; if `graphify update .` reports no changes, skip the empty commit.)

### Task 7: Docs, PR, the v1 ledger row, issue close

Pure main-only close-out. Every path in the PR is a v1-absent path, so the pick classifier's verdict is SKIP and the ledger row is appended on main — no v1 checkout, no cherry-pick.

**Files:**
- Modify: `docs/progress.md` (one dated entry, appended where the #241/#252–#253 entries sit)
- Modify: `docs/agents/v1-picks.md` (one SKIP row, appended at the ledger tail)
- Create: the PR (squash-merge to main)

**Interfaces:** consumes Task 6's evidence files + the merged PR number/sha; produces the close comment on #254.

**Not here:** any v1 work (pure SKIP); `AGENTS.md` (no floor or ruling changes); reopening the fenced siblings.

- [ ] **Step 1: The progress entry**

Append to `docs/progress.md`'s dated section (after the #241 close-out entry), filling bracketed values from the actual runs:

```markdown
- **2026-11-XX — the content-pages #223-stale checks rewritten (#254) — harness-only, zero landing src.** The three checks that went stale with the #223 redesign now assert the current contracts (owner-ruled 2026-11-09, in the triage brief): the /services add-ons cross-reference check INVERTED to guard the ruling's absence (the literal byte-kept, the #241 strip-retirement pattern); the /branches walk-in check asserts the icon WalkInIndicator's aria-label pair per live branch (both states still required); the /about testimonials check matches persons case-insensitively over the unchanged innerText seam (the attribution's uppercase transform no longer defeats it). The environment-sensitive pair hardened per the same ruling: the hero-blurb check follows the live site-settings wire (saved homeDescription wins, ratified default ⇔ null), and every /book deep-link assertion across content-pages + packages-pages matches the PARSED query param via a new additive `bookParamValues` helper in the verify lib — never an exact href string. content-pages 17/20 → 20/20, packages-pages 17/17 held; teaser re-check <result>; landing floor unchanged (16 files / 123 tests).
```

- [ ] **Step 2: The PR**

```bash
git push -u origin chore/254-content-pages-stale-checks
gh pr create --title "chore(landing): content-pages #223-stale checks rewritten + teaser-hardened blurb/deep-links (#254)" --body-file - << 'EOF'
Implements #254 (brief: https://github.com/jeius/sevendays/issues/254#issuecomment-6731701934). Harness-only — zero landing `src/` files.

- The three #223-stale checks rewritten per the 2026-11-09 rulings: add-ons → inverted absence (literal byte-kept); walk-ins → the WalkInIndicator aria-label pair, per live branch, both states required; testimonials → case-insensitive over the unchanged `innerText` seam.
- The teaser-sensitive pair hardened: the hero blurb follows `GET /api/v1/site-settings` (saved `homeDescription` wins, ratified default ⇔ null); every `/book` deep-link assertion matches parsed query params via the additive `bookParamValues` lib helper (content-pages ×3 + packages-pages ×2; `/branches` keeps its `Book at this branch` text anchor).
- content-pages 17/20 → **20/20**; packages-pages **17/17** held (per-task flip evidence in `.superpowers/sdd/2026-11-09-254-content-pages-stale-checks/`). Teaser re-check: <result — 20/20 or the recorded findings>. `pnpm check` green; landing floor unchanged (16 files / 123 tests).
EOF
```

Squash-merge to main. Record the merge's main sha + PR number.

- [ ] **Step 3: The v1 ledger row (SKIP, appended on main)**

On main, append one row to `docs/agents/v1-picks.md`'s ledger, filling bracketed values:

```markdown
| 2026-11-XX | #<PR> | `<main-sha>` | skip | — | #254 — the content-pages #223-stale checks rewritten + the teaser-hardened blurb/deep-links: harness-only (the add-ons inversion, the walk-in aria-label pair, case-insensitive testimonials, the settings-aware blurb, param-parsed /book deep-links via the additive bookParamValues lib helper). Zero landing src, zero suites (landing floor 16/123 held). All paths main-only (apps/landing/scripts/verify per paths.txt:24 + the plan file + docs) — pure SKIP. Locks: pnpm check green; content-pages 20/20 + packages-pages 17/17 on the local stack; teaser re-check <result>. |
```

Commit as `docs(v1-picks): the #254 skip row (#254)` (the `5f32dbf` pattern) and push to main.

- [ ] **Step 4: Close the issue**

```bash
gh issue close 254 --comment "Landed in #<PR> (main \`<main-sha>\`; pure v1 SKIP — every path main-only, the ledger row records it). AC1 content-pages 20/20 local (task5/final evidence). AC2 the add-ons check inverts over the byte-kept literal. AC3 the walk-in check asserts the aria-label pair per live branch, both states required (labels echoed in the check detail). AC4 case-insensitive persons over the unchanged innerText seam, the ⇔ rule kept. AC5 the blurb follows the live settings read (null→default arm proven locally; saved-value arm <teaser result>). AC6 all /book deep-link assertions param-parsed (content-pages ×3 incl. the text-anchored /branches, packages-pages ×2). AC7 packages-pages 17/17 held. AC8 every rewritten check carries its #254 ruling comment. AC9 teaser re-check run via the env overrides: <result/findings>. AC10 pnpm check green."
```

- [ ] **Step 5: Final sweep**

Confirm: working tree clean (evidence stays gitignored under `.superpowers/`); the branch deleted after merge; this plan file's boxes ticked `- [✅]` throughout.
