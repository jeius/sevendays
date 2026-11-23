# Plan: #338, Create-button polish: teaser variant pass + owner reaction

**Goal:** The #94 rendered-variants gate for the create-button polish: one teaser screenshot pass, the three named buttons (a full-size PageHeader create button, a small outline CardAction create button, the renamed "New service" button), both themes, with the owner's reaction recorded on [#338](https://github.com/jeius/sevendays/issues/338) before the polish is called done. **Zero code changes**, the pass verifies #337's landed work (`5290979`, deployed to the teaser by CI run 44846008524) and closes out the polish spec [#335](https://github.com/jeius/sevendays/issues/335).

**Spec:** [#338](https://github.com/jeius/sevendays/issues/338) (labeled `ready-for-agent`), authoritatively settled by its parent spec [#335](https://github.com/jeius/sevendays/issues/335) (repo copy `docs/specs/2026-11-19-create-button-polish-spec.md`, the "Rendered-variants step" paragraph). The code ticket #337 is CLOSED (executed via SDD, merged as #342, squash `5290979`; acceptance evidence on the ticket). The v1 pick for #342 is already executed and ledgered (origin/v1 `f8cd854`, run 44846422237, `docs/agents/v1-picks.md:242`), nothing pick-work remains.

**Execution mode:** controller-executed **interactive** (superpowers:executing-plans discipline), NOT subagent-driven. The pass has two owner gates no subagent can pass: the headed-login "go" gate (the #310 census rule) and the reaction itself. Steps use checkbox (`- [ ]`) syntax for tracking; the controller ends turns at the gates.

**Controller pre-flight (2026-11-21, HEAD `5290979`), every literal below probed live today:**

- Teaser admin `https://sevendays-admin.pahamajulius.workers.dev`, `/` answers 307 → `/login?redirect=…` (the auth gate is live; probed 200 at `/login`-class redirect).
- `Deploy teaser (main)` → **success** on CI run 44846008524 (headSha `5290979`, push, 2026-11-21T00:46Z), the teaser carries the polish. The pass re-proves it at the DOM level (Task 2's asserts).
- ThemeToggle: `aria-label='Toggle theme'` ghost icon button in the admin topbar (`apps/admin/src/components/admin-topbar.tsx:21`); next-themes class strategy (M7 #217) → dark = `html.dark`.
- Button ancestry pinned from today's source: the PageHeader renders actions inside `<div className='flex items-center gap-2'>` under the PageHeader root row (`apps/admin/src/components/cms/shared.tsx:118-137`) → from a PageHeader button, `ancestor::div[2]` is the header row; the lookups print-sizes loaded posture renders the sm outline button inside `<CardAction className='flex items-center gap-2'>` under `<CardHeader>` (`apps/admin/src/components/lookups/lookups-screen.tsx:740-746`) → from that button, `ancestor::div[2]` is the CardHeader.
- The three routes' buttons: `/branches` → PageHeader `New branch` (EmptyState variant renders only when no rows, the live DB has branches, so the PageHeader button is the match); `/lookups` → print-sizes `New print size` (loaded posture on seeded data; if the empty posture ever renders, the CardAction sm button is still the DOM-earlier match, same register, same container shape); `/studio-services` → PageHeader `New service`.
- `@playwright/test` **1.63.0** resolves at the repo root (probed via `node -e` on its package.json); chromium-1243 + headless shell cached; WSLg `DISPLAY=:0` (all probed 2026-11-21).
- `.superpowers/` is gitignored (`.gitignore:39`) and exists, the pass's scratch root.
- Standing flag, NOT this ticket: the nightly E2E's ADR-0022 landing visual baselines (light) have failed 3 consecutive scheduled runs on `c643cc3` (latest 44845874350, 2026-11-21T00:45Z), landing-side baseline drift, admin-unrelated. Flagged to the owner in the pass comment (Task 3), triaged apart; nothing in this plan touches it.

## Scope fences

**In scope:** the capture rig under gitignored `.superpowers/338-teaser-pass/` (script + PNGs + capture-log.json, nothing committed from it); the headed capture pass; the owner's reaction recorded on #338; the disposition (closes + `docs/progress.md` + this plan file committed + graphify).

**NOT here (siblings / out of scope):**

- **Zero code changes.** The pass verifies landed work. Any fix the owner names in their reaction is a NEW ticket (via the triage discipline), never an edit inside this pass, never a "quick" in-pass patch.
- **The v1 pick**, already executed + ledgered (`f8cd854` / `docs/agents/v1-picks.md:242`); this plan does no pick work.
- **The nightly E2E visual-baseline failures**, flagged in the pass comment only; their triage is its own ticket.
- **No `packages/ui` changes, no test changes, no floor movement, no `pnpm check` run**, the pass changes zero code, so the check gate has nothing to gate; the floors hold by absence (admin 34 files / 360 tests).
- **#335 stays open until the owner's approve**, its rendered-variants gate closes only when the reaction records (Task 3); never closed earlier, never on the capture alone.
- **No headless credential fallback**, ever. The #310 rule: if the headed login times out, the pass stops and waits for the owner; `ADMIN_EMAIL`/`ADMIN_PASSWORD` headless mode is not entered without an explicit owner answer (the wait-for-owner-answers rule).

## Owner rulings (recorded)

- **The pass is an acceptance gate, not a design exploration** (spec #335's rendered-variants step, verbatim: "no **new** composition exists, the icon joins established, owner-accepted buttons at two registers … Per the #94 amendment the executor still renders the owner-reaction pass before merge"). Six shots, three buttons, both themes, no variants to explore.
- **Skill set for the pass: `prototype` + `ui-ux-pro-max`** (ticket-named). The executor loads both at execution time before the pass; owner rulings override skill recommendations, recorded.
- **The headed-login "go" gate** (the #310 census rule, standing): announce AND wait for the owner's explicit "go" before firing any headed-browser login; timer flows end with "ready, say go", never auto-fire.

## Global Constraints

- **Auth = headed interactive only.** Zero credentials read, stored, or passed, the owner signs in the visible Chromium within `CAPTURE_LOGIN_TIMEOUT_MS` (default 180000). A login timeout exits non-zero → stop and wait for the owner. The headed launch uses a fresh browser profile, the owner's own browser profile and theme are untouched.
- **All pass artifacts live under `.superpowers/338-teaser-pass/`** (gitignored), outside every suite per ADR-0022; never `pnpm check`, never `test:e2e`. Nothing under `.superpowers/` is committed.
- **The teaser is CI-deployed only.** Never run a local/bare `wrangler deploy` against any environment (the #263/#264 lesson, a bare deploy wipes the CI-passed `--var`s).
- **Capture order: light first** (the admin's default), then the topbar toggle → dark; the script asserts `html.dark` after the toggle and records it in capture-log.json.
- **Verbatim values:** the capture script (Task 1 Step 2) is landed verbatim, its locators and asserts are pinned to the pre-flight's verified ancestry; the #338 comment body (Task 3) is the pinned shape whose two execution-derived slots (the date; the owner's verdict words) are filled from the recorded facts, never paraphrased.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits reference #338, prefix `docs:` (this plan lands records only, the plan file, progress.md, graphify).

## UI skill audit (`ui-ux-pro-max`, run at plan time 2026-11-21)

Loaded per the #94-amendment discipline (plan time; the executor re-loads `prototype` + `ui-ux-pro-max` at execution time). The icons-domain search ("decorative icon aria hidden") returns `icon-context-accessibility`, the same governing guideline #337's plan audited against; this pass lets the OWNER verify its visible consequences on the deployed teaser:

- **Decorative semantics, seen:** the glyph sits beside visible text in every shot, the owner judges it reads as decoration, not a competing signal.
- **One visual family per surface:** lucide everywhere (the pinned trio vocabulary, ADR-0017), the shots let the owner confirm the Plus joins the row edits' lucide `SquarePen` family.
- **Consistent sizing/alignment as tokens:** the 16px glyph rides the primitive's law at both registers, the owner judges the h-8 full-size and h-7 sm-outline renderings side by side across the six shots.
- **Both themes tested before delivery, never inferred from one**, the skill's pre-delivery rule is literally this pass's design: light + dark per button.
- **Capture framing** (pre-delivery guidance applied to the shot list): each shot frames the button IN CONTEXT, the PageHeader row or the CardHeader strip, never a bare-button crop, so the owner judges alignment, spacing, and register the way the surface presents them; `deviceScaleFactor: 2` keeps the 16px glyph crisp.

No library or size recommendation applies, the family (lucide), sizing (the primitive's token law), and markup are owner-settled and shipped; the pass judges rendering, not design. The owner's reaction overrides anything this audit or the skill recommends (recorded in the reaction, Task 3).

---

## Task 1, staging: the capture rig + the plan record (no browser yet)

**Files:**
- Create: `.superpowers/338-teaser-pass/capture.mjs` (gitignored scratch, never committed)
- Commit: `docs/superpowers/plans/2026-11-21-338-create-button-polish-teaser-pass.md` (this file)

**Interfaces:**
- Consumes: the deployed teaser admin; `@playwright/test` 1.63.0 (root-resolvable); the pre-flight's verified ancestry.
- Produces: six PNGs + `capture-log.json` under `.superpowers/338-teaser-pass/` (Task 2 consumes them).

- [ ] **Step 1: Re-verify deploy provenance at execution time.**

Run:

```bash
gh run list --limit 5 --workflow=ci.yml --json databaseId,headSha,event,conclusion --jq '.[] | select(.event=="push") | [.databaseId, .headSha[0:7], .conclusion] | @tsv'
```

Expected: the newest main-push run's headSha is `5290979` (recorded: 44846008524, success, `Deploy teaser (main)` → success). If a NEWER main push has since redeployed the teaser, proceed, the capture-log records the actual latest SHA. If the newest main-push run PREDATES `5290979` or its deploy leg failed, STOP, the pass must verify the polish on the polish's deploy, not a stale environment; re-check CI first.

- [ ] **Step 2: Write the capture script verbatim** to `.superpowers/338-teaser-pass/capture.mjs`:

```js
// #338, the teaser create-button variant pass. Captures the three named
// create buttons from the deployed teaser admin, the branches PageHeader
// (full-size), the lookups print-sizes CardAction (small outline sm), the
// studio-services "New service" PageHeader (the rename), in both themes
// (light first, then the topbar Toggle → dark), six PNGs + a capture-log.
// One-off acceptance tooling for ticket #338: lives in gitignored
// .superpowers/, outside every suite (ADR-0022, never pnpm check, never
// test:e2e). Auth is headed interactive (the #310 census rule): no
// credentials are read, stored, or passed, the owner signs in the visible
// Chromium within CAPTURE_LOGIN_TIMEOUT_MS (default 180000); a timeout
// exits non-zero and the pass stops for the owner. Never a headless
// credential fallback.
//
// Usage (only after the owner's "go"):
//   DISPLAY=:0 node .superpowers/338-teaser-pass/capture.mjs
// Prereq: chromium cached (chromium-1243); @playwright/test resolves at
// the repo root (1.63.0).
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base =
  process.env.CAPTURE_BASE_URL ?? 'https://sevendays-admin.pahamajulius.workers.dev';
const outDir = resolve(process.env.CAPTURE_OUT_DIR ?? '.superpowers/338-teaser-pass');
const loginTimeout = Number(process.env.CAPTURE_LOGIN_TIMEOUT_MS ?? 180_000);

// Each shot anchors on the button TEXT (the acceptance subject), then
// frames its verified container: a PageHeader button's ancestor div[2] is
// the header row (button → actions row → PageHeader root,
// apps/admin/src/components/cms/shared.tsx:118); the lookups sm outline
// button's ancestor div[2] is the CardHeader (button → CardAction row →
// CardHeader, apps/admin/src/components/lookups/lookups-screen.tsx:740).
const shots = [
  { name: '01-branches-pageheader', route: '/branches', text: 'New branch' },
  { name: '02-lookups-cardaction', route: '/lookups', text: 'New print size' },
  {
    name: '03-studio-services-new-service',
    route: '/studio-services',
    text: 'New service',
  },
];

mkdirSync(outDir, { recursive: true });
const log = {
  base,
  startedAt: new Date().toISOString(),
  shots: [],
  darkApplied: false,
  renameAbsent: null,
};
let failures = 0;

const browser = await chromium.launch({ headless: false });
try {
  const page = await browser.newPage({
    deviceScaleFactor: 2,
    viewport: { width: 1440, height: 900 },
  });

  // Headed login, the owner signs the visible window (the #310 pattern,
  // scripts/probe-cold-hydration.mjs auth block). No credentials here.
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  console.log('[auth] waiting for your sign-in in the opened Chromium…');
  await page.waitForSelector('[data-shell-main]', { timeout: loginTimeout });
  console.log('[auth] signed in.');

  for (const theme of ['light', 'dark']) {
    for (const shot of shots) {
      await page.goto(`${base}${shot.route}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-shell-main]', { timeout: 30_000 });
      await page.waitForTimeout(1500); // hydration + data settle (the probe's wait)

      const btn = page.locator('button', { hasText: shot.text }).first();
      const count = await btn.count();
      if (count === 0) throw new Error(`button "${shot.text}" not found on ${shot.route}`);
      const iconFirst = await btn.evaluate(
        (el) => el.firstElementChild?.tagName === 'svg' && el.querySelector('svg[aria-hidden="true"]') !== null,
      );
      if (!iconFirst)
        throw new Error(
          `icon-first law broken on ${shot.route} (${shot.text}): first child is ${await btn.evaluate(
            (el) => el.firstElementChild?.tagName,
          )}`,
        );
      const region = btn.locator('xpath=ancestor::div[2]');

      const file = resolve(outDir, `${shot.name}-${theme}.png`);
      await region.screenshot({ path: file });
      console.log(`[shot] ${shot.name}-${theme}.png`);
      log.shots.push({ shot: shot.name, theme, route: shot.route, file, iconFirst, count });
    }
    if (theme === 'light') {
      await page.click("button[aria-label='Toggle theme']");
      await page.waitForFunction(
        () => document.documentElement.classList.contains('dark'),
        undefined,
        { timeout: 10_000 },
      );
      log.darkApplied = true;
      console.log('[theme] dark applied (html.dark).');
    }
  }

  // The rename proof on the deployed asset: the old label appears nowhere
  // in the studio-services DOM after hydration.
  await page.goto(`${base}/studio-services`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-shell-main]', { timeout: 30_000 });
  await page.waitForTimeout(1500);
  const html = await page.content();
  log.renameAbsent = !/new studio service/i.test(html);
  console.log(
    `[rename] "New studio service" ${log.renameAbsent ? 'absent' : 'STILL PRESENT'} on the teaser`,
  );
  if (!log.renameAbsent) failures += 1;
} finally {
  await browser.close();
}

log.finishedAt = new Date().toISOString();
writeFileSync(resolve(outDir, 'capture-log.json'), JSON.stringify(log, null, 2));
console.log(
  JSON.stringify(
    { shots: log.shots.length, darkApplied: log.darkApplied, renameAbsent: log.renameAbsent, failures },
    null,
    2,
  ),
);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 3: Syntax gate.**

Run: `node --check .superpowers/338-teaser-pass/capture.mjs`
Expected: silent (exit 0).

- [ ] **Step 4: Commit the plan record.**

```bash
git add docs/superpowers/plans/2026-11-21-338-create-button-polish-teaser-pass.md
git commit -m "docs: #338, the teaser variant-pass plan (capture rig staged)"
```

- [ ] **Step 5: The go-gate announcement (STOP here).** End the turn with this message and do NOT run the capture until the owner's next message says go:

> The #338 capture pass is staged, a Chromium window will open on your desktop for the teaser admin login (you sign in, ≤180 s; no credentials are shared or stored). Say **go** when ready.

This step's box is ticked only when the owner has said go.

**Not here:** no login automation of any kind (no filled fields, no stored credentials, the script's auth block waits, never types); no theme persistence cleanup needed (fresh browser profile, the owner's browser untouched); no issue comments yet (Task 3 owns all issue writes).

## Task 2, the headed capture pass (the go gate)

**Files:**
- Consumes: `.superpowers/338-teaser-pass/capture.mjs` (Task 1); the owner's "go".
- Produces: six PNGs + `capture-log.json` under `.superpowers/338-teaser-pass/`.

- [ ] **Step 1: Fire (ONLY after the owner's "go" in chat, never before).**

Run: `DISPLAY=:0 node .superpowers/338-teaser-pass/capture.mjs`
Expected: the script opens a visible Chromium on the teaser's `/login`; after the owner signs in it walks the three routes in light, toggles to dark, walks them again, runs the rename check, and exits 0 with the six `[shot]` lines, the `[theme]`/`[rename]` lines, and a JSON verdict: `shots: 6, darkApplied: true, renameAbsent: true, failures: 0`.

- [ ] **Step 2: The timeout branch.** Exit non-zero or a login timeout = the owner is away → stop, report, wait. This is the wait-for-owner-answers block, not a failure to retry around, never a headless credential fallback, never an unannounced second fire. Re-announce (Task 1 Step 5's message) and end the turn.

- [ ] **Step 3: Verify the artifacts before presenting.**

Run: `ls .superpowers/338-teaser-pass/ && cat .superpowers/338-teaser-pass/capture-log.json`
Expected: exactly six PNGs (`01-branches-pageheader-light.png` … `03-studio-services-new-service-dark.png`) + `capture-log.json`; every shot entry has `iconFirst: true`; `darkApplied: true`; `renameAbsent: true`; `failures: 0`. **If any assert failed, STOP and diagnose before presenting**, a failed assert means the teaser is not serving the polish (re-check Task 1 Step 1's provenance); never present broken evidence.

- [ ] **Step 4: Tick this task's boxes.** The pass is captured, the reaction gate (Task 3) is next.

**Not here:** no screenshot retakes to "improve" a shot (the pass records what the teaser serves, a retake is only for a FAILED assert, diagnosed first); no navigation beyond the three routes + the rename re-visit (the pass is scoped, not a walkthrough); no clicking into editors or sheets (the named buttons only).

## Task 3, the owner reaction + disposition

**Files:**
- Consumes: the six PNGs + `capture-log.json` (Task 2).
- Modify: `docs/progress.md` (append a dated section at file end, the house pattern); graphify output.
- Issue writes: #338 comment (+ close), #335 close, approve path only.

- [ ] **Step 1: Present the six PNGs in-session** (Read renders them), one line each naming surface, register, theme, in file order. Do not editorialize the renderings; the owner judges.

- [ ] **Step 2: Ask the reaction, AskUserQuestion, one question:** "The create-button polish, as rendered on the teaser, approve or fix-list?" Options: `Approve` / `Fix-list` (the owner's "Other" carries nuance). The owner's words ARE the record, quote them verbatim in Step 3's comment. Ask and block; never assume while the owner may be AFK.

- [ ] **Step 3: Record on #338**, post this body verbatim (the two angle-bracket slots fill from the recorded facts: the capture date; the owner's verdict words from Step 2, quoted exactly):

```markdown
## Teaser variant pass, the create-button polish (verifying #337's landed work)

**Provenance:** the teaser admin (`https://sevendays-admin.pahamajulius.workers.dev`) serving `5290979`, `Deploy teaser (main)` success on CI run 44846008524. Captured <date>, headed interactive login (no credentials shared, stored, or committed), light first, then the topbar Toggle → dark (`html.dark` asserted). Tooling: `.superpowers/338-teaser-pass/capture.mjs` (gitignored, outside every suite per ADR-0022); six PNGs + `capture-log.json`.

**The three named buttons, both themes (six shots):**

| Shot | Surface | Register |
|---|---|---|
| 01-branches-pageheader | /branches, PageHeader "New branch" | full-size default Button |
| 02-lookups-cardaction | /lookups, print-sizes CardAction "New print size" | small outline `size='sm'` |
| 03-studio-services-new-service | /studio-services, PageHeader "New service" | full-size + the rename |

**DOM-level proofs (capture-log.json):** `<Plus aria-hidden='true' />` as the button's first child asserted on all six captured buttons; `html.dark` asserted after the toggle; the case-insensitive "New studio service" census absent from the deployed studio-services DOM.

**Owner's reaction:** <the owner's verdict words, verbatim>

**Flagged apart (not this ticket):** the nightly E2E's ADR-0022 landing visual baselines (light) have failed 3 consecutive scheduled runs on `c643cc3` (latest 44845874350), landing-side baseline drift, unrelated to this admin-side polish; needs its own triage.
```

- [ ] **Step 4a (Approve path): close out.**

```bash
gh issue close 338 --reason completed --comment "The teaser variant pass is rendered and the owner's reaction records above, both acceptance boxes hold: the three named buttons captured on the teaser in both themes, the reaction recorded before the polish is called done. The create-button polish (#337) is accepted; #335's rendered-variants gate is satisfied."
gh issue close 335 --reason completed --comment "Accepted, the teaser variant pass on #338 recorded the owner's approve. The spec's census (21 sites), rename (five sites), boundary, and rendered-variants gate are all satisfied; the implementation is #342 (squash 5290979)."
```

Then append the progress section verbatim at the end of `docs/progress.md`:

```markdown
## 2026-11-21, #338: the create-button polish accepted, the teaser variant pass + the owner's reaction

The #94 rendered-variants gate for the polish spec (#335) is closed: one teaser screenshot pass captured the three named create buttons, the branches PageHeader "New branch" (full-size), the lookups print-sizes CardAction "New print size" (small outline sm), the studio-services PageHeader "New service" (the rename), in both themes from the deployed teaser (5290979, CI run 44846008524), six shots + capture-log.json under gitignored .superpowers/338-teaser-pass/ (outside every suite per ADR-0022). The DOM-level proofs rode with the shots: the icon-first law (`<Plus aria-hidden='true' />` as first child) asserted on all six buttons, html.dark asserted after the topbar toggle, and the case-insensitive "New studio service" census absent from the deployed studio-services DOM. The owner's reaction recorded on #338: approve, the polish is called done; #337 and #335 are closed. Zero code changes in this ticket, the pass verified landed work; floors untouched (admin 34 files / 360 tests).
```

Then:

```bash
git add docs/progress.md
git commit -m "docs: #338, progress section; the teaser pass accepted"
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#338 graph update"
```

- [ ] **Step 4b (Fix-list path): record + route, never fix.** Post the Step 3 comment with the fix-list quoted; keep #338 AND #335 open; skip the Step 4a closes and the approve-path progress text (the progress entry instead records the pass + the fix-list, drafted from the owner's recorded words, no invented text). Propose the follow-up path to the owner (the fix-list becomes its own ticket via the triage discipline; the re-pass then re-runs Tasks 1–3).

- [ ] **Step 5: Self-review tick.** `grep -c '<!-- APPEND' docs/superpowers/plans/2026-11-21-338-create-button-polish-teaser-pass.md` → 0; the plan's checkboxes reflect what actually ran.

**Not here:** no v1 pick (already ledgered); no AGENTS.md edit (floors don't move; no code); no ADR (no architectural choice, the pass is acceptance tooling on the #310 pattern); no fix implementation even for a one-line fix (the fix-list is a NEW ticket, always).

---

## Self-review checklist (controller pass, run before handoff)

- [✅] Placeholder scan: no TBD/TODO/"as appropriate"/paraphrased strings, the capture script and the comment body are verbatim; the only execution-derived slots (the capture date; the owner's verdict words) are marked as such in the text, not paraphrase requests. (Re-run at execution 2026-11-21: the only greps hits are this line and the Step-5 check command quoting the markers, both self-referential.)
- [✅] Step-checkbox count: `grep -c '^- \[ \] \*\*Step'` on this file = 15 (Task 1: 5, Task 2: 4, Task 3: 6, Steps 1, 2, 3, 4a, 4b, 5). Verify mechanically, fenced script/comment blocks and the checklist itself quote unticked `- [ ]`-shaped lines that inflate a raw grep. (Re-run at execution 2026-11-21: 15 exact. First draft pinned 11, the Task-3 4a/4b split was missed; corrected at the source before handoff.)
- [✅] Cross-reference consistency: the six expected filenames in Task 2 Step 3 match the script's `shots` array + the theme suffixes; the ancestry claim (ancestor div[2]) matches the pre-flight's pinned source lines; the comment body's CI run number matches the pre-flight. (Proven by the pass itself 2026-11-21: the script generated exactly the six pinned filenames, count 1 per route, and the posted comment carries run 44846008524, issuecomment-7054914110.)
- [✅] Gate integrity: the go-gate (Task 1 Step 5 → Task 2 Step 1) and the reaction gate (Task 3 Step 2) are both blocking end-of-turn steps, the plan never fires the browser or posts to the issue before its owner gate. (Held in execution 2026-11-21: the turn ended at the announcement until the owner's "go"; the reaction was an AskUserQuestion ask-and-block before any issue write.)

