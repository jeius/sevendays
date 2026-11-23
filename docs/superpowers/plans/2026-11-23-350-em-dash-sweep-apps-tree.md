# Plan: #350 — Handover polish: sweep the apps tree

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The em-dash sweep's second leg (spec #348 item 1, after #349's tool + packages/scripts/e2e): the whole `apps/` tree, em-dash-free. Every product-facing copy string and UI-visible em dash is hand-rewritten for natural prose (the home testimonials CTA label and the hero alt text among them), every rendered placeholder glyph (the em dash meaning "no value", e.g. the booking summary's empty scheduled time) becomes a proper placeholder, the api's email and error copy moves with its pins, and everything else (comments, docs-in-app, test titles, dev-facing strings) goes through the #349 sweep script's fix mode plus a fix-up pass until the scoped check is green.

**Architecture:** No new code. Five edit classes ride existing surfaces: (1) hand-rewritten copy strings in the landing, admin, and api, each with its pin/echo sites updated in the same task (the #349 Task-2 lockstep law); (2) placeholder-glyph tokens (`'—'` / `>—<`) replaced per spot; (3) the #349 sweep script's fix mode over `apps/` for the spaced dash; (4) a fix-up pass over the hand classes (line-end dashes, double-space dashes, comma artifacts); (5) the full gate + records. The sweep tool (`scripts/em-dash-sweep.mjs`, `pnpm em-dash`) already exists from #349; nothing about it changes.

**Tech Stack:** zero new dependencies; the #349 sweep script (check/fix modes); vitest floors unchanged everywhere (pins edit in place, no tests added or removed); pnpm + Turborepo; `gh` CLI.

**Spec:** [GitHub issue #350](https://github.com/jeius/sevendays/issues/350), authoritatively settled by its parent spec, [issue #348](https://github.com/jeius/sevendays/issues/348) (repo copy `docs/specs/2026-11-22-pre-handover-polish-spec.md`, item 1; note: that file is untracked at plan time). Method rulings live in the spec's Implementation Decisions (hybrid method, en-dash law, no-DB-pass ruling Q5, exclusions) and in the #349 plan's Global Constraints, which this plan inherits where they concern the tool.

## Branch law

- Branch **`em-dash-sweep-apps`** off current `main` (`573f608` at plan time, 2026-11-23; this plan's commit is the branch's first commit). All five tasks commit there; one PR to `main` titled `Handover polish: sweep the apps tree (#350)` (Closes #350).
- The sibling sweep tickets run on their own branches after this one: #351/#352 (docs), #353 (root files). #354 (the CI gate) lands **last**, after every sweep. This ticket's verdict is the **scoped** check (`check apps`), not the repo-wide one: until #351-#353 land, the unscoped check is expected to fail on the unswept trees.
- **Scope reconciliation (recorded so the owner sees it at PR review):** the ticket body says "both apps swept" and its AC says "both app trees", but the ticket's ~2.3k census matches **all three** app trees (landing 1641 + admin... landing+admin tracked = 1641, api = 630, total 2271), the #349 plan's scope fence explicitly hands "all remaining apps prose, UI copy, placeholder glyphs, and `apps/api/scripts/`" to #350, no other ticket covers `apps/api`, and the ticket AC itself says "(and api where its pins changed)", which only happens if api copy is rewritten. So this plan sweeps **`apps/**` = landing + admin + api**. The verdict command is `node scripts/em-dash-sweep.mjs check apps`.

## Controller pre-flight (live-run, record before Task 1)

- **Floors (must not move anywhere in this ticket; live-run each, 2026-11-23 numbers from the plan-time worktree):** landing 19 files / 152 passed; admin 34 files / 364 passed; types 18 files / 197 passed; api-client 5 files / 45 passed; db 4 files / 30 passed + 0 skipped **with `TEST_DATABASE_URL` set** (the with-var form; ruling #349-R4); api 34 files / 482 passed + 3 skipped (run with `TEST_DATABASE_URL` set; the suite boots a DB connection and fails without the var, proven at plan time). Any drift means something merged: reconcile before starting.
- **Dash census (re-run and record; drift means something merged):** `git ls-files apps | xargs grep -oP '—' | wc -l` → **2271 occurrences across 333 tracked files** (landing 98, admin 140, api 95; measured 2026-11-23 on main `573f608`). Class split: **2133** spaced (` — `, fix mode's share); **109** line-end (`—$`, hand class); **3** double-space (hand class: `apps/admin/src/components/global-search.tsx:269`, `apps/admin/src/components/notification.tsx:181`, `apps/landing/scripts/verify/cms-reflection.mjs:15`); **22** code-glyph tokens (18 quoted `'—'` + 4 `<span>—</span>` children; Tasks 1-2 replace them); **7** `'—'` quotes inside comments/JSDoc (hand-updated to quote the new placeholder).
- **En-dash inventory:** **23** en dashes across **17** tracked files under `apps/` (e.g. `apps/landing/src/components/booking/step-progress.tsx:7` `0–100`, the admin screens' range comments). They survive every task byte-identical; verify the file count after Task 4.
- **Test DB:** `docker start sevendays-test-db-5433` if down. The db and api suites run with `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test`. Port 5432 belongs to another project; never fall back.
- **The verify scripts' two copy checks:** `apps/landing/scripts/verify/booking-wizard.mjs:188` asserts `card?.includes('already passed in the Philippines')`, a dash-free fragment of `booking.ts:187`'s message: the rewrite in Task 1 keeps that substring, so the check survives with no edit. `apps/landing/scripts/verify/content-pages.mjs:185,194` compare the walk-in trigger's `aria-label` (`'Walk-ins welcome'` / `'By appointment'`), which Task 1 does not touch (only the tooltip sentence changes). No verify-script edit beyond the Task 1 echo and Task 4's log-separator fix-up.

## Scope fences

**In scope:** every tracked file under `apps/landing/`, `apps/admin/`, `apps/api/` (including the apps' `.cursorrules`, `.env.example` / `.dev.vars.example`, `wrangler.toml` / `wrangler.jsonc` comments, `styles.css` comments, `public/photos/README.md`, `scripts/verify/*.mjs`, `apps/api/scripts/**`); Tasks 1-3's named pin/echo edits (the #331 mechanical blast-radius law: lockstep string edits where a changed constant is quoted); `docs/progress.md` + graphify at the end.

**NOT here (siblings / out of scope):**

- **#351/#352 (docs), #353 (root files):** no `docs/**` file and no root file is touched. `AGENTS.md` floors are NOT edited (no test count moves; AGENTS.md is #353's tree).
- **#355-#358 (the code items):** the home CTA's `href` stays `/about` (only its label changes; the deep link is #355); the testimonials table's truncation is #357; the Site tab layout is #356; the hero feature is #358. This ticket changes copy characters only, never structure or behavior.
- **#354 (CI wiring):** no CI file changes here.
- **Live DB rows (Q5):** the sweep is files-only; seeded catalog text and settings rows keep their pre-sweep content until reseeded. No migration, no data pass.
- **En dashes:** preserved everywhere (23 across 17 files), by the tool's construction and the hand-class rules.
- **Git history:** tree-state only, no rewrite.
- **Vendored/generated:** `.agents/skills/**` and `graphify-out/**` are excluded by the tool's construction; no app file under them exists anyway.
- **Visual baselines (e2e/visual/):** outside `apps/` and already swept (#349); no baseline file changes. Rendered-copy changes may drift baselines post-deploy: the expected drift and the re-baseline procedure are Task 5's Step 6 (post-merge close-out, per the #346 contract).
- **The 12 drafted testimonials:** still outside the repo; their de-dashed delivery is a courtesy note at insertion time (spec), not this ticket.
- **No ADR:** the sweep invents no architecture (the #349 plan's ruling carries).
- **`pnpm-lock.yaml`, CI workflows, root configs:** no em dashes in scope files beyond the fence; untouched.

## Global Constraints

- **Method law (spec, #349-inherited):** product/visitor-visible strings and aria-label copy are hand-rewritten (never the scripted comma); rendered placeholder glyphs are replaced per spot; developer-facing strings, comments, docs-in-app prose, and test titles take fix mode + the fix-up pass. Pins and echoes update in the same task as the string they quote.
- **The editorial rewrite law for hand-rewritten copy** (apply consistently; every proposed string is pinned byte-exact in its task, so this law governs only an executor-discovered miss, and any such miss is added to the task's table before committing):
  - a dash that introduced an elaboration, definition, or list: **colon**;
  - two independent clauses where the second explains or instructs: **semicolon**;
  - genuinely two sentences: **period**;
  - a parenthetical or aside tail: **parentheses**; an integrated appositive: **comma pair**;
  - a coordinating `or`/`and` joining clauses: **comma** before the conjunction;
  - never a spaced hyphen (` - `); never a bare unspaced comma splice; the result must read naturally aloud.
- **The placeholder-glyph law:** the replacement is the hyphen `-` everywhere, with exactly two real-word exceptions (owner-ruled "picked per spot"; both flagged for ratification):
  - the booking summary's Schedule row (`apps/landing/src/components/booking/summary-rail.tsx:29`) becomes **`Not scheduled yet`**, with the `(PHT)` suffix riding only when a time exists (the worked edit is in Task 1);
  - the admin branches table's not-walk-in cell (`apps/admin/src/components/branches/branches-screen.tsx:551`) becomes **`By appointment`**, matching the landing tooltip's established negative-state copy.
- **The strings are PROPOSED, owner ratifies at the PR.** Every hand-rewritten string below is pinned byte-exact as the proposed rewrite; the owner's wording review happens at the PR (the #349 precedent: the copy question is not re-asked at plan time, the flag is disclosed in the Global Constraints, the progress entry, and the PR body). If the owner edits any string at review, re-run the owning task's gates and update that string's pins/echoes with the owner's wording before merge.
- **Floors do not move.** Every suite's file/test count is identical before and after (pins edit in place; nothing adds or removes a test). A count that differs at any gate means something else drifted: stop and reconcile.
- **fix mode rewrites exactly one shape** (space, U+2014, space → `, `), per #349. Unspaced dashes, line-end dashes, decorative separators, and the ` , `-class artifacts are hand classes (Task 4). En dashes are never touched.
- **Test DB:** db- and api-suite runs and the final `pnpm check` prefix `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test` (start the container first if down: `docker start sevendays-test-db-5433`).
- **Per-task gates:** the touched app's `test -- --run` AND `typecheck` both green before each task's commit. Final gate: `pnpm fix` then `TEST_DATABASE_URL=... pnpm check` green at the repo root. Do not commit code that fails it for the packages/apps touched.
- **Biome:** touched files pass `pnpm exec biome check <files>` per task; `pnpm lint:root` is pre-existing red at main and is NOT a gate (ruling #349-R3); sweep-shortened lines' format drift heals in Task 5's `pnpm fix`.
- Checklist ticks in `docs/*.md` use `- [✅]`, never plain `[x]`.
- Commits follow the repo's commit-work convention, each referencing #350. Prefixes: `chore(copy):` (Tasks 1-3), `chore(sweep):` (Task 4), `docs(progress):` + `chore(graphify):` (Task 5).
- Run from the repo root of the branch checkout. The sweep script reads `git ls-files` from cwd.
- **This plan's own prose is em-dash-free** (the house style going forward); its before-blocks necessarily quote em dashes: those are sweep-input evidence, byte-exact by law, and #352's doc sweep must not "fix" them (they are quoted identifiers under #351's citation law).

---

## Task 1 — the landing: product copy, placeholder glyphs, pins, echo

Product copy is hand-rewritten FIRST so Task 4's fix mode never touches it. Every changed string updates its quoting sites in the same commit: the landing pin suites and the one verify-script echo.

**Files:**
- Modify: `apps/landing/src/components/home-image-led.tsx` (2 strings)
- Modify: `apps/landing/src/components/home-copy.ts` (1 string, the hero alt)
- Modify: `apps/landing/src/routes/about.tsx`, `apps/landing/src/routes/services.tsx`, `apps/landing/src/routes/branches.tsx`, `apps/landing/src/routes/packages/index.tsx`, `apps/landing/src/routes/book.tsx` (5 files, 8 strings)
- Modify: `apps/landing/src/components/error-component.tsx`, `apps/landing/src/components/branch-card.tsx` (2 files, 3 strings)
- Modify: `apps/landing/src/lib/booking.ts` (2 strings + 4 glyph tokens), `apps/landing/src/lib/booking-read.ts` (4 glyph tokens + 2 JSDoc quotes), `apps/landing/src/lib/testimonial-form.ts` (2 strings)
- Modify: `apps/landing/src/components/booking/summary-rail.tsx` (1 glyph, the structural edit)
- Modify: `apps/landing/src/lib/booking-read.test.ts`, `apps/landing/src/lib/booking-contact.test.ts`, `apps/landing/src/lib/testimonial-form.test.ts` (pins)
- Modify: `apps/landing/scripts/verify/packages-pages.mjs` (echo)

**Interfaces:**
- Consumes: the pre-flight census; the #349 tool for Task 4.
- Produces: the landing's de-dashed copy and placeholders; `HERO_PHOTO_ALT`'s new wording is the default #358's `heroImageAlt` field adopts; the glyph `-` (and `Not scheduled yet`) vocabulary the booking surfaces render; pins that quote the new strings.

**The 19 copy strings (exact before → after; do not paraphrase):**

| Site | Before (verbatim) | After (verbatim) |
| --- | --- | --- |
| `home-image-led.tsx:372` | `More kind words — and share your own` | `More kind words, and share your own` |
| `home-image-led.tsx:378` | `Client words are on their way — check back soon.` | `Client words are on their way; check back soon.` |
| `home-copy.ts:8` (HERO_PHOTO_ALT) | `Photographer holding a Canon DSLR by the studio window — the studio’s own photo` | `Photographer holding a Canon DSLR by the studio window (the studio’s own photo)` |
| `about.tsx:165` | `Share a few words about your session — we'd love to hear it.` | `Share a few words about your session; we'd love to hear it.` |
| `services.tsx:74` | `Call or visit a branch — we will confirm availability.` | `Call or visit a branch; we will confirm availability.` |
| `branches.tsx:46` | `Our branches are being set up — check back soon.` | `Our branches are being set up; check back soon.` |
| `packages/index.tsx:53` | `No packages to show right now — check back soon.` | `No packages to show right now; check back soon.` |
| `error-component.tsx:22` | `An unexpected error interrupted the page. Try again — or reach the studio directly and we'll take it from there.` | `An unexpected error interrupted the page. Try again, or reach the studio directly and we'll take it from there.` |
| `book.tsx:56` | `'Last — your details'` | `'Last: your details'` |
| `book.tsx:172` | `Choose a branch first — services are bookable per branch.` | `Choose a branch first: services are bookable per branch.` |
| `book.tsx:241` | `Skip — no add-ons` | `Skip (no add-ons)` |
| `book.tsx:261` | `That time has already passed — pick a later slot.` | `That time has already passed; pick a later slot.` |
| `book.tsx:348` | `Notes (optional — tell the studio anything useful)` | `Notes (optional: tell the studio anything useful)` |
| `booking.ts:187` | `That date and time has already passed in the Philippines (PHT). Please pick a later slot — all times shown are Philippine time.` | `That date and time has already passed in the Philippines (PHT). Please pick a later slot; all times shown are Philippine time.` |
| `booking.ts:252` | `Please enter your email — your confirmation goes there.` | `Please enter your email; your confirmation goes there.` |
| `testimonial-form.ts:35` | `Tell us a little more — at least 20 characters.` | `Tell us a little more: at least 20 characters.` |
| `testimonial-form.ts:40` | `Your story didn't send — please try again.` | `Your story didn't send; please try again.` |
| `branch-card.tsx:153` | `Walk-ins welcome — come by anytime.` | `Walk-ins welcome: come by anytime.` |
| `branch-card.tsx:154` | `By appointment — call ahead or book online.` | `By appointment: call ahead or book online.` |

Note: `error-component.tsx` wraps the sentence across lines 22-23 (`...directly and` / `we'll take it from there.`); the dash sits on line 22 and the replacement keeps the existing wrap. The home-copy.ts and settings strings use typographic apostrophes (`’`) byte-exact; keep them.

- [ ] **Step 1: The 19 copy strings.** Apply the table above with exact old_string → new_string edits (the surrounding JSX/operators are untouched). After the edits, verify none of the old fragments remain anywhere:

```bash
git grep -n 'More kind words —\|on their way —\|window — the studio\|session — we\|branch — we will\|set up — check\|right now — check\|again — or reach\|Last — your\|first — services\|Skip — no\|passed — pick\|optional — tell\|slot — all times\|email — your confirmation\|more — at least\|send — please\|welcome — come by\|appointment — call ahead' -- apps/landing
```

Expected: hits only in the three not-yet-edited pin/echo files (`booking-contact.test.ts:43`, `testimonial-form.test.ts:19`, `packages-pages.mjs:208`), which Steps 3-4 update. Any other hit is a missed copy site: add it to the table, apply the editorial law, and record it for the owner flag before continuing.

- [ ] **Step 2: The landing placeholder glyphs.** Three files, per the glyph law:

`booking-read.ts` (the JSDoc quotes and the four fallback tokens move together):

Before (lines 30-33):
```ts
/** Branch display name joined from the branches read; '—' when unresolvable. */
export function branchNameFor(record: AppointmentWithAddons, branches: BranchRead[]): string {
  return branches.find((b) => b.id === record.branchId)?.name ?? '—';
}
```

After:
```ts
/** Branch display name joined from the branches read; '-' when unresolvable. */
export function branchNameFor(record: AppointmentWithAddons, branches: BranchRead[]): string {
  return branches.find((b) => b.id === record.branchId)?.name ?? '-';
}
```

Before (lines 40-54):
```ts
/**
 * Offering display name joined from the sibling reads; '—' when the
 * offering is unresolvable (e.g. a package deactivated after booking —
 * the lists are active-only). Exactly-one is a table CHECK, so one of the
 * two refs is always set.
 */
export function offeringNameFor(record: AppointmentWithAddons, catalog: ReadCatalog): string {
  if (record.servicePackageId) {
    return catalog.packages.find((p) => p.id === record.servicePackageId)?.name ?? '—';
  }
  if (record.studioServiceId) {
    return catalog.services.find((s) => s.id === record.studioServiceId)?.name ?? '—';
  }
  return '—';
}
```

After (the JSDoc's second-line dash is comment prose; Task 4's fix mode may comma it, but since this block is already open, clean it now to the final form):
```ts
/**
 * Offering display name joined from the sibling reads; '-' when the
 * offering is unresolvable (e.g. a package deactivated after booking,
 * because the lists are active-only). Exactly-one is a table CHECK, so one
 * of the two refs is always set.
 */
export function offeringNameFor(record: AppointmentWithAddons, catalog: ReadCatalog): string {
  if (record.servicePackageId) {
    return catalog.packages.find((p) => p.id === record.servicePackageId)?.name ?? '-';
  }
  if (record.studioServiceId) {
    return catalog.services.find((s) => s.id === record.studioServiceId)?.name ?? '-';
  }
  return '-';
}
```

`booking.ts` (lines 326-329, the same token swaps inside the `offeringName`/`branchName` derivations):

Before:
```ts
  const offeringName = offering
    ? offering.kind === 'package'
      ? (catalog.packages.find((p) => p.id === offering.id)?.name ?? '—')
      : (catalog.services.find((s) => s.id === offering.id)?.name ?? '—')
    : '—';
  const branchName = catalog.branches.find((b) => b.id === branchId)?.name ?? '—';
```

After:
```ts
  const offeringName = offering
    ? offering.kind === 'package'
      ? (catalog.packages.find((p) => p.id === offering.id)?.name ?? '-')
      : (catalog.services.find((s) => s.id === offering.id)?.name ?? '-')
    : '-';
  const branchName = catalog.branches.find((b) => b.id === branchId)?.name ?? '-';
```

`summary-rail.tsx` (the real-word exception; `(PHT)` rides only with a time):

Before (line 29):
```tsx
            {wizard.scheduledAt ? phDateTime(wizard.scheduledAt.toISOString()) : '—'} (PHT)
```

After:
```tsx
            {wizard.scheduledAt
              ? `${phDateTime(wizard.scheduledAt.toISOString())} (PHT)`
              : 'Not scheduled yet'}
```

(Identical render when scheduled; the empty case reads the real word without a dangling `(PHT)`. Biome may re-wrap the expression; `pnpm fix` in Task 5 heals any drift.)

- [ ] **Step 3: The landing pins.** In `booking-read.test.ts` (titles quote the glyph; assertions pin it):

Before (lines 170-173):
```ts
  it("falls back to '—' when the branch is unresolvable", () => {
    expect(
      branchNameFor(record({ branchId: '99999999-9999-4999-8999-999999999999' }), [B1, B2])
    ).toBe('—');
```

After:
```ts
  it("falls back to '-' when the branch is unresolvable", () => {
    expect(
      branchNameFor(record({ branchId: '99999999-9999-4999-8999-999999999999' }), [B1, B2])
    ).toBe('-');
```

Before (lines 191-192):
```ts
  it("falls back to '—' when the offering has left the active-only lists", () => {
    expect(offeringNameFor(record(), { packages: [], services: [] })).toBe('—');
```

After:
```ts
  it("falls back to '-' when the offering has left the active-only lists", () => {
    expect(offeringNameFor(record(), { packages: [], services: [] })).toBe('-');
```

In `booking-contact.test.ts` (line 43, the pinned zod message):

Before:
```ts
      email: 'Please enter your email — your confirmation goes there.',
```

After:
```ts
      email: 'Please enter your email; your confirmation goes there.',
```

In `testimonial-form.test.ts` (line 19, the pinned min-quote message):

Before:
```ts
      quote: 'Tell us a little more — at least 20 characters.',
```

After:
```ts
      quote: 'Tell us a little more: at least 20 characters.',
```

- [ ] **Step 4: The verify-script echo.** In `apps/landing/scripts/verify/packages-pages.mjs` (lines 207-209, the empty-state check quotes the rendered line byte-exact):

Before:
```js
    listText.includes('No packages to show right now — check back soon.') ===
      (packages.length === 0)
```

After:
```js
    listText.includes('No packages to show right now; check back soon.') ===
      (packages.length === 0)
```

- [ ] **Step 5: Gates.**

```bash
pnpm --filter @sevendays/landing test -- --run && pnpm --filter @sevendays/landing typecheck
pnpm exec biome check apps/landing/src/components/home-image-led.tsx apps/landing/src/components/home-copy.ts apps/landing/src/routes/about.tsx apps/landing/src/routes/services.tsx apps/landing/src/routes/branches.tsx apps/landing/src/routes/packages/index.tsx apps/landing/src/routes/book.tsx apps/landing/src/components/error-component.tsx apps/landing/src/components/branch-card.tsx apps/landing/src/lib/booking.ts apps/landing/src/lib/booking-read.ts apps/landing/src/lib/testimonial-form.ts apps/landing/src/components/booking/summary-rail.tsx apps/landing/src/lib/booking-read.test.ts apps/landing/src/lib/booking-contact.test.ts apps/landing/src/lib/testimonial-form.test.ts apps/landing/scripts/verify/packages-pages.mjs
```

Expected: landing 19 files / 152 passed (floors unmoved), typecheck green, biome clean on the touched files.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "chore(copy): the landing hand-rewrites, placeholder glyphs, and pins (#350)"` (`git status` first: only the named landing files staged, nothing else).

---

## Task 2 — the admin: product copy, placeholder glyphs, pins

Same law as Task 1, on the admin tree: staff-visible copy hand-rewritten, glyph tokens replaced per spot, the two lib pins updated in lockstep. One copy string lives in two source files (the rejection description: the submissions tab renders it, the notification-state module carries the confirm-dialog meta); both move together.

**Files:**
- Modify: `apps/admin/src/components/addons/addons-screen.tsx`, `apps/admin/src/components/packages/package-editor.tsx`, `apps/admin/src/components/studio-services/studio-services-screen.tsx` (the `No price` line ×3, the `Cover ready` line in editor + services screens, the editor's print-size glyph)
- Modify: `apps/admin/src/components/audit/audit-log-screen.tsx` (subline, empty state, summary glyph)
- Modify: `apps/admin/src/components/settings/settings-screen.tsx`, `apps/admin/src/components/settings/site-tab.tsx`, `apps/admin/src/components/settings/users-tab.tsx`, `apps/admin/src/components/settings/account-tab.tsx` (6 sites + 3 glyph tokens + 1 JSDoc)
- Modify: `apps/admin/src/components/testimonials/submissions-tab.tsx` (2 descriptions)
- Modify: `apps/admin/src/lib/notification-state.ts` (the rejection-description echo source)
- Modify: `apps/admin/src/lib/submissions-state.ts` (3 validation constants)
- Modify: `apps/admin/src/routes/login.tsx`, `apps/admin/src/routes/login_.reset.tsx`, `apps/admin/src/routes/_shell.appointments.tsx`, `apps/admin/src/routes/_shell.gallery.tsx` (4 sites)
- Modify: `apps/admin/src/components/dashboard/storage-media.tsx` (3 free-tier lines + 2 glyph tokens), `apps/admin/src/components/dashboard/format.ts` (4 glyph tokens)
- Modify: `apps/admin/src/components/charts/trend-chart.tsx`, `apps/admin/src/components/gallery/gallery-screen.tsx` (2 aria-labels)
- Modify: `apps/admin/src/components/branches/branches-screen.tsx` (`Cover ready` + the real-word glyph), `apps/admin/src/components/cms/relation-badges.tsx` (glyph)
- Modify: `apps/admin/src/lib/submissions-state.test.ts`, `apps/admin/src/lib/notification-state.test.ts` (pins)

**Interfaces:**
- Consumes: the pre-flight census.
- Produces: the admin's de-dashed copy and placeholders; the `-` glyph vocabulary in the dashboard formatters (`formatUtc`/`formatPercent`/`formatDurationMs`/`formatCls` return `'-'` for null); the `By appointment` real-word cell; pins quoting the new strings.

**The copy strings (exact before → after; do not paraphrase):**

| Site | Before (verbatim) | After (verbatim) |
| --- | --- | --- |
| `addons-screen.tsx:761`, `package-editor.tsx:846`, `studio-services-screen.tsx:817` (same string ×3) | `No price — bookable on inquiry.` | `No price: bookable on inquiry.` |
| `audit-log-screen.tsx:165` | `Who changed what, when — every CMS write, newest first.` | `Who changed what, when: every CMS write, newest first.` |
| `audit-log-screen.tsx:226` | `No audit rows yet — they start with the first CMS write.` | `No audit rows yet; they start with the first CMS write.` |
| `settings-screen.tsx:17` | `The site’s words and marks — editable without a deploy.` | `The site’s words and marks, editable without a deploy.` |
| `submissions-tab.tsx:279` | `Fix or trim the words first if needed — accepting publishes it as a testimonial at the end of the list.` | `Fix or trim the words first if needed; accepting publishes it as a testimonial at the end of the list.` |
| `submissions-tab.tsx:318` + `notification-state.ts:91` (same string ×2) | `The submission stays on record as rejected — nothing publishes, and the sender is never told.` | `The submission stays on record as rejected; nothing publishes, and the sender is never told.` |
| `login_.reset.tsx:124` | `Could not reset the password — the link may have expired. Request a new one.` | `Could not reset the password: the link may have expired. Request a new one.` |
| `_shell.appointments.tsx:13` | `The bookings worklist — list, branch/status filters, status updates. The full worklist arrives with v2.` | `The bookings worklist: list, branch/status filters, status updates. The full worklist arrives with v2.` |
| `_shell.gallery.tsx:34` | `The /about portfolio — upload in batches, organize by category.` | `The /about portfolio: upload in batches, organize by category.` |
| `login.tsx:132` | `The studio's appointments, catalog, and branches — behind one door.` | `The studio's appointments, catalog, and branches sit behind one door.` |
| `account-tab.tsx:190` | `Signs this account out of every session, on every device — including this one.` | `Signs this account out of every session, on every device, including this one.` |
| `users-tab.tsx:691` | `Owners hold user management and the Audit Log — grant only when the account should manage the team.` | `Owners hold user management and the Audit Log; grant only when the account should manage the team.` |
| `users-tab.tsx:706` and `users-tab.tsx:729` (same string ×2) | `At least 12 characters. Hand the password over in person — it is not emailed.` | `At least 12 characters. Hand the password over in person; it is not emailed.` |
| `package-editor.tsx:957`, `studio-services-screen.tsx:902`, `branches-screen.tsx:802` (same string ×3) | `Cover ready — save to bind it.` | `Cover ready: save to bind it.` |
| `site-tab.tsx:364` | `Logo ready — save to bind it.` | `Logo ready: save to bind it.` |
| `storage-media.tsx:45` | `Free tier: 10 GB-month storage — a cost signal, not a quota.` | `Free tier: 10 GB-month storage, a cost signal, not a quota.` |
| `storage-media.tsx:70` | `Free tier: 1M Class A ops / month — a cost signal, not a quota.` | `Free tier: 1M Class A ops / month, a cost signal, not a quota.` |
| `storage-media.tsx:86` | `Free tier: 10M Class B ops / month — a cost signal, not a quota.` | `Free tier: 10M Class B ops / month, a cost signal, not a quota.` |
| `trend-chart.tsx:42` (aria-label template) | `` `${ariaLabel} — latest ${String(data.at(-1)?.value ?? 0)}, peak ${String(Math.max(...data.map((datum) => datum.value)))}` `` | `` `${ariaLabel}: latest ${String(data.at(-1)?.value ?? 0)}, peak ${String(Math.max(...data.map((datum) => datum.value)))}` `` |
| `gallery-screen.tsx:750` (aria-label template) | `` `Categories — current filter: ${railFilterName}` `` | `` `Categories (current filter: ${railFilterName})` `` |
| `submissions-state.ts:48` | `Tell us a little more — at least 20 characters.` | `Tell us a little more: at least 20 characters.` |
| `submissions-state.ts:50` | `That’s a little long — at most 600 characters.` | `That’s a little long: at most 600 characters.` |
| `submissions-state.ts:51` | `That name is a little long — at most 80 characters.` | `That name is a little long: at most 80 characters.` |

The two aria-label rewrites keep every interpolation and class byte-identical; only the separator changes. The `settings-screen.tsx`, `submissions-state.ts:50`, and `home-copy.ts` strings use typographic apostrophes; keep them exact.

- [ ] **Step 1: The copy strings.** Apply the table above. After the edits, verify the old fragments are gone:

```bash
git grep -n 'price — bookable\|when — every CMS\|yet — they start\|marks — editable\|if needed — accepting\|rejected — nothing\|password — the link\|worklist — list\|portfolio — upload\|branches — behind one door\|device — including\|Log — grant\|in person — it is not\|ready — save to bind\|storage — a cost\|month — a cost\|ariaLabel} —\|Categories — current\|more — at least 20\|long — at most' -- apps/admin
```

Expected: hits only in the two not-yet-edited pin files (`submissions-state.test.ts:70`, `notification-state.test.ts:85`), which Step 3 updates. Any other hit is a missed copy site: add it to the table and apply the editorial law before continuing.

- [ ] **Step 2: The admin placeholder glyphs.** Per the glyph law (`-` default; the one real-word cell):

`format.ts` (lines 6, 22, 33, 39: `if (iso === null) return '—';` / `if (value === null) return '—';` ×3): every `return '—';` token becomes `return '-';` (4 sites).

`storage-media.tsx` (lines 33, 54: the ternary consequents `? '—'`): each becomes `? '-'`.

`users-tab.tsx`:
- line 93 JSDoc + line 95 return, moved together. Before:
```ts
/** The UA string trims to 48 chars + ellipsis; a missing one renders the em-dash. */
function userAgentLine(userAgent: string | null): string {
  if (userAgent === null || userAgent === '') {
    return '—';
  }
```
After:
```ts
/** The UA string trims to 48 chars + ellipsis; a missing one renders the hyphen placeholder. */
function userAgentLine(userAgent: string | null): string {
  if (userAgent === null || userAgent === '') {
    return '-';
  }
```
- line 480 (the self-row actions cell): `<span className='text-muted-foreground'>—</span>` → `<span className='text-muted-foreground'>-</span>`
- line 579: `{session.ipAddress ?? '—'}` → `{session.ipAddress ?? '-'}`

`audit-log-screen.tsx:253`: `{row.summary ?? <span className='text-muted-foreground'>—</span>}` → `{row.summary ?? <span className='text-muted-foreground'>-</span>}`

`branches-screen.tsx:551` (the real-word exception). Before:
```tsx
                              <span className='text-muted-foreground'>—</span>
```
After:
```tsx
                              <span className='text-muted-foreground'>By appointment</span>
```

`package-editor.tsx:203`: `?? '—'}` → `?? '-'}` (the print-size code fallback).

`relation-badges.tsx:18`: `return <span className='text-muted-foreground'>—</span>;` → `return <span className='text-muted-foreground'>-</span>;`

- [ ] **Step 3: The admin pins.** In `submissions-state.test.ts` (line 70, quoting the min-quote constant):

Before:
```ts
      'Tell us a little more — at least 20 characters.',
```

After:
```ts
      'Tell us a little more: at least 20 characters.',
```

In `notification-state.test.ts` (lines 84-85, quoting the rejection description):

Before:
```ts
      description:
        'The submission stays on record as rejected — nothing publishes, and the sender is never told.',
```

After:
```ts
      description:
        'The submission stays on record as rejected; nothing publishes, and the sender is never told.',
```

- [ ] **Step 4: Gates.**

```bash
pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck
pnpm exec biome check apps/admin/src/components/addons/addons-screen.tsx apps/admin/src/components/packages/package-editor.tsx apps/admin/src/components/studio-services/studio-services-screen.tsx apps/admin/src/components/audit/audit-log-screen.tsx apps/admin/src/components/settings/settings-screen.tsx apps/admin/src/components/settings/site-tab.tsx apps/admin/src/components/settings/users-tab.tsx apps/admin/src/components/settings/account-tab.tsx apps/admin/src/components/testimonials/submissions-tab.tsx apps/admin/src/lib/notification-state.ts apps/admin/src/lib/submissions-state.ts apps/admin/src/routes/login.tsx apps/admin/src/routes/login_.reset.tsx apps/admin/src/routes/_shell.appointments.tsx apps/admin/src/routes/_shell.gallery.tsx apps/admin/src/components/dashboard/storage-media.tsx apps/admin/src/components/dashboard/format.ts apps/admin/src/components/charts/trend-chart.tsx apps/admin/src/components/gallery/gallery-screen.tsx apps/admin/src/components/branches/branches-screen.tsx apps/admin/src/components/cms/relation-badges.tsx apps/admin/src/lib/submissions-state.test.ts apps/admin/src/lib/notification-state.test.ts
```

Expected: admin 34 files / 364 passed (floors unmoved), typecheck green, biome clean on the touched files.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "chore(copy): the admin hand-rewrites, placeholder glyphs, and pins (#350)"` (`git status` first: only the named admin files).

---

## Task 3 — the api: visitor and staff copy, the email template, the pins, the echo

The api's four product-facing strings: the public rate-limit message, the confirmation email's subject and body sentence (the only visitor-emailed copy in the repo), and the media commit's 409 detail. Their pins (api suites) and the verify-script echo move in lockstep. The api's developer-facing guard strings (`auth.ts:65`, `db.ts:37`, `media.ts:54`, `audit.ts:47`) stay for Task 4's fix mode + fix-up per the method law.

**Files:**
- Modify: `apps/api/src/routes/testimonial-submissions.ts` (1 string)
- Modify: `apps/api/src/services/confirmation-email.ts` (2 strings: body + subject)
- Modify: `apps/api/src/services/media.ts` (1 string ×2)
- Modify: `apps/api/test/testimonial-submissions.test.ts`, `apps/api/src/services/confirmation-email.test.ts`, `apps/api/test/appointments.test.ts`, `apps/api/test/admin-packages.test.ts` (pins)
- Modify: `apps/landing/scripts/verify/confirmation-emails.mjs` (echo)

**Interfaces:**
- Consumes: the pre-flight census.
- Produces: the api's de-dashed visitor/staff copy; the email subject/body forms the landing verify harness mirrors.

**The strings (exact before → after; do not paraphrase):**

| Site | Before (verbatim) | After (verbatim) |
| --- | --- | --- |
| `testimonial-submissions.ts:33` | `You're sending too fast — please wait a minute and try again.` | `You're sending too fast; please wait a minute and try again.` |
| `confirmation-email.ts:87` (the body sentence inside the template) | `is scheduled for ${when} — please keep an eye on this email for any changes.` | `is scheduled for ${when}. Please keep an eye on this email for any changes.` |
| `confirmation-email.ts:98` (the subject template) | `` `Booking scheduled: ${input.offeringName} — ${when}` `` | `` `Booking scheduled: ${input.offeringName}, ${when}` `` |
| `media.ts:137` and `media.ts:176` (same string ×2) | `Upload not found — the PUT may have failed, expired, or been already committed.` | `Upload not found: the PUT may have failed, expired, or been already committed.` |

- [ ] **Step 1: The four strings.** Apply the table (the email body edit touches only the sentence fragment inside the `<p>`; the surrounding template is untouched). Verify:

```bash
git grep -n 'fast — please\|} — please keep\|} — \${when}\|not found — the PUT\|Package — \|PHT) — please' -- apps/api apps/landing/scripts
```

Expected: hits only in the not-yet-edited pin/echo files (`testimonial-submissions.test.ts:93`, `confirmation-email.test.ts:43,53`, `appointments.test.ts:727`, `admin-packages.test.ts:556`, `confirmation-emails.mjs:111`), which Steps 2-3 update. Any other hit is a missed copy site: add it to the table and apply the editorial law before continuing.

- [ ] **Step 2: The api pins.** In `testimonial-submissions.test.ts` (line 93):

Before:
```ts
      error: "You're sending too fast — please wait a minute and try again.",
```

After:
```ts
      error: "You're sending too fast; please wait a minute and try again.",
```

In `confirmation-email.test.ts` (lines 42-44, the exact subject; lines 52-54, the body sentence):

Before:
```ts
    expect(buildConfirmationEmail(base()).subject).toBe(
      'Booking scheduled: Combined Package — Dec 25, 2026, 9:30 AM (PHT)'
    );
```

After:
```ts
    expect(buildConfirmationEmail(base()).subject).toBe(
      'Booking scheduled: Combined Package, Dec 25, 2026, 9:30 AM (PHT)'
    );
```

Before:
```ts
    expect(html).toContain(
      'Your Combined Package at Calamba Branch is scheduled for Dec 25, 2026, 9:30 AM (PHT) — please keep an eye on this email for any changes.'
    );
```

After:
```ts
    expect(html).toContain(
      'Your Combined Package at Calamba Branch is scheduled for Dec 25, 2026, 9:30 AM (PHT). Please keep an eye on this email for any changes.'
    );
```

In `appointments.test.ts` (line 727, the subject-prefix matcher):

Before:
```ts
        subject: expect.stringContaining('Booking scheduled: Combined Package — '),
```

After:
```ts
        subject: expect.stringContaining('Booking scheduled: Combined Package, '),
```

In `admin-packages.test.ts` (lines 555-557):

Before:
```ts
    expect(body.error).toBe(
      'Upload not found — the PUT may have failed, expired, or been already committed.'
    );
```

After:
```ts
    expect(body.error).toBe(
      'Upload not found: the PUT may have failed, expired, or been already committed.'
    );
```

- [ ] **Step 3: The verify-script echo.** In `apps/landing/scripts/verify/confirmation-emails.mjs` (line 111, the harness re-derives the subject per its no-import rule):

Before:
```js
      subject: `Booking scheduled: ${offeringName} — ${when}`,
```

After:
```js
      subject: `Booking scheduled: ${offeringName}, ${when}`,
```

- [ ] **Step 4: Gates.**

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test -- --run && pnpm --filter @sevendays/api typecheck
pnpm exec biome check apps/api/src/routes/testimonial-submissions.ts apps/api/src/services/confirmation-email.ts apps/api/src/services/media.ts apps/api/test/testimonial-submissions.test.ts apps/api/src/services/confirmation-email.test.ts apps/api/test/appointments.test.ts apps/api/test/admin-packages.test.ts apps/landing/scripts/verify/confirmation-emails.mjs
```

Expected: api 34 files / 482 passed + 3 skipped (floors unmoved), typecheck green, biome clean.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "chore(copy): the api strings, the email copy, and their pins (#350)"` (`git status` first: only the named api files + the one verify-script echo).

---

## Task 4 — the mechanical sweep + the fix-up pass

Tasks 1-3 removed every product copy dash, so fix mode's comma can only land on comments, dev-facing strings, and test titles. The hand classes it deliberately leaves get the fix-up pass until the scoped check is green.

**Files:** every remaining dash-carrying tracked file under `apps/` per the sweep tool's own leftover list (≈320 files / ≈2080 expected replacements at plan-time census). No doc, no root file, no packages file.

**Interfaces:**
- Consumes: Tasks 1-3's hand rewrites; the #349 tool unchanged.
- Produces: `node scripts/em-dash-sweep.mjs check apps` exit 0 — this ticket's acceptance verdict, and the same command #354 wires repo-wide once every sweep lands.

**Reconciliation ledger (from the 2026-11-23 census, 2271 total):** 2133 spaced occurrences (of which 3 are the double-space sites), 109 line-end lines, 25 quoted `'—'` tokens (18 code + 7 comment quotes), 4 `<span>—</span>` children. Tasks 1-3 hand-removed 53 spaced dashes (52 copy strings + 1 JSDoc line cleaned early in Task 1); Tasks 1-2 replaced 25 glyph tokens (18 code quotes + 4 spans + 3 comment quotes). Expected fix-mode result: **≈2080 replacements across ≈290 files**, then the leftover list (exit 1 is the contract, not a failure) naming the 109 line-end lines, the ` , `-class artifacts, and the 4 remaining comment glyph-quotes. Reconciliation law: fix-mode replacements + the 53 hand-removed spaced dashes + the 25 Task-1/2 glyph tokens + the 109 line-end lines + the 4 remaining comment quotes must account for all 2271 census occurrences (the 3 double-space sites ride inside the fix count). A big gap means the census drifted: reconcile before continuing.

- [ ] **Step 1: Run the batch.** From the repo root:

```bash
node scripts/em-dash-sweep.mjs fix apps
```

Expected: per-file `fixed N:` lines totalling ≈2080, then the leftover list and **exit 1** (leftovers need hands). Record the replacement total against the ledger above.

- [ ] **Step 2: Artifact greps + fix-ups, in order.**

(a) Comment-opener artifacts (`// — foo` / `* — foo` / `/* — foo` headers comma-ized):

```bash
git grep -nE '^//, |^\s*\*, |/\*, ' -- apps
```

Expected: the dash-decorated header lines. Fix: **drop the dash decoration entirely**; the line becomes plain comment prose.

(b) Space-comma artifacts (the 3 double-space sites + comment-continuation dashes that begin a line):

```bash
git grep -n ' , ' -- apps
```

Expected: 3+ sites. Worked examples. `apps/landing/scripts/verify/cms-reflection.mjs:15` (a usage header, double-space dash):

Before (post-fix-mode state):
```js
//   VERIFY_STAFF_EMAIL / VERIFY_STAFF_PASSWORD  , a provisioned staff row
```
After (usage/definition intro takes a colon):
```js
//   VERIFY_STAFF_EMAIL / VERIFY_STAFF_PASSWORD: a provisioned staff row
```

`apps/admin/src/components/global-search.tsx:269` and `apps/admin/src/components/notification.tsx:181` (JSX-comment continuation lines that began with the dash):

Before (post-fix-mode state):
```tsx
              , matching is the lib seam's; the dropdown's roving is the
```
After (drop the decoration; plain prose continuation):
```tsx
              matching is the lib seam's; the dropdown's roving is the
```

(c) Line-end dashes (109 lines):

```bash
git grep -nE '—$' -- apps
```

Fix each by merging with its continuation line, splitting with a period/colon, or a semicolon, per the editorial law. Worked examples. `apps/admin/src/components/addons/addons-screen.tsx:171`:

Before:
```ts
  // async Save contract (#218) closes the shell ONLY on a resolved-true —
```
After (merged with the continuation):
```ts
  // async Save contract (#218) closes the shell ONLY on a resolved-true;
```

`apps/landing/src/routes/__root.tsx:30`:

Before:
```ts
  // pages whose own loaders are healthy never inherit a chrome failure —
```
After:
```ts
  // pages whose own loaders are healthy never inherit a chrome failure;
```

(d) The remaining comment glyph-quotes (4 of the census's 7; Tasks 1-2 updated 3):

```bash
git grep -n "'—'" -- apps
```

Expected: only comment/JSDoc quotes remain. Each quotes the OLD placeholder: update it to quote the spot's NEW placeholder (`'-'`, or the real word) so the comment describes what the code renders. (If a hit is code, not a comment, it is a missed Task 1-2 glyph: apply the glyph law here instead.)

(e) Dev-facing string fix-ups. Fix mode comma-ized thrown/log strings where the dash introduced an explanation; upgrade those commas to colons (the #349 failure-string law). The known sites:

| Site | Post-fix-mode (splice-y comma) | Fix-up (colon) |
| --- | --- | --- |
| `apps/landing/src/lib/api.server.ts:10` | `API_URL is not set, the landing server cannot call the API.` | `API_URL is not set: the landing server cannot call the API.` |
| `apps/admin/src/lib/api.server.ts:11` | `API_URL is not set, the admin server cannot call the API.` | `API_URL is not set: the admin server cannot call the API.` |
| `apps/admin/src/lib/api.server.ts:74` | `No session cookie in the incoming request, the session-scoped API client cannot authenticate.` | `No session cookie in the incoming request: the session-scoped API client cannot authenticate.` |
| `apps/admin/src/lib/auth.ts:35` | `DATABASE_URL is not set, the admin auth server cannot reach Postgres.` | `DATABASE_URL is not set: the admin auth server cannot reach Postgres.` |
| `apps/api/src/services/audit.ts:47` | `auditActor: no session in context, the admin root gate must precede every audit write` | `auditActor: no session in context; the admin root gate must precede every audit write` |
| `apps/api/src/services/auth.ts:65` | `BETTER_AUTH_SECRET is not set, the API cannot verify sessions.` | `BETTER_AUTH_SECRET is not set: the API cannot verify sessions.` |
| `apps/api/src/services/db.ts:37` | `DATABASE_URL is not set, the Worker needs the pooled connection secret per ADR-0007.` | `DATABASE_URL is not set: the Worker needs the pooled connection secret per ADR-0007.` |
| `apps/api/src/services/media.ts:54` | `R2_S3_ACCESS_KEY_ID / R2_S3_SECRET_ACCESS_KEY are not set, the API cannot presign uploads.` | `R2_S3_ACCESS_KEY_ID / R2_S3_SECRET_ACCESS_KEY are not set: the API cannot presign uploads.` |
| the 6 verify-script PASS/FAIL separators (`booking-e2e.mjs:41`, `confirmation-emails.mjs:37`, `booking-wizard.mjs:16`, `content-pages.mjs:15`, `cms-reflection.mjs:42`, `packages-pages.mjs:14`) | `` ${detail ? `, ${detail}` : ''} `` | `` ${detail ? `: ${detail}` : ''} `` |
| `confirmation-emails.mjs:79` | `RESEND LIST UNAVAILABLE (HTTP ${err.status}), this account can't enumerate sends` | `RESEND LIST UNAVAILABLE (HTTP ${err.status}): this account can't enumerate sends` |
| `booking-e2e.mjs:36` | `E2E verification booking, safe to discard.` | `E2E verification booking: safe to discard.` |
| `cms-reflection.mjs:116` | `no active attire in the live catalog, cannot build the scratch inclusion` | `no active attire in the live catalog: cannot build the scratch inclusion` |

Also apply the colon upgrade anywhere else the diff shows a string literal whose comma splices (the diff skim in Step 4 catches stragglers). Test titles take the mechanical comma unless it splices (`booking.test.ts:391` `...totalCents — never a ₱0 stand-in` → `...totalCents, never a ₱0 stand-in` reads correctly as-is).

- [ ] **Step 3: The scoped check is green.**

```bash
node scripts/em-dash-sweep.mjs check apps
```

Expected: `EM DASH: clean, 0 hits (apps)`, exit 0. This is the ticket's acceptance verdict.

- [ ] **Step 4: The diff skim (no copy drifted).** `git diff` end to end. Every changed line must be a comment, a test title, a dev-facing string from Step 2(e)'s table, or a verify-script log line. Any changed line that renders to a visitor or staff member is a Task 1-3 escape: revert the mechanical comma on it and apply the editorial law by hand instead. Then confirm no hyphen replacement crept in:

```bash
git diff | grep -c ' - ' || true
```

Expected: no NEW ` - ` introductions beyond pre-existing spaced hyphens (spot-check: `git diff | grep ' - '` shows only lines that already carried one).

- [ ] **Step 5: En dashes preserved.**

```bash
git ls-files apps | xargs grep -lP '–' | wc -l
git ls-files apps | xargs grep -oP '–' | wc -l
```

Expected: exactly 17 files and exactly 23 occurrences, byte-identical to the pre-flight inventory.

- [ ] **Step 6: Gates.** The sweep touched comment/title text inside all three suites; re-run everything:

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm --filter @sevendays/api test -- --run && pnpm --filter @sevendays/api typecheck
pnpm --filter @sevendays/landing test -- --run && pnpm --filter @sevendays/landing typecheck
pnpm --filter @sevendays/admin test -- --run && pnpm --filter @sevendays/admin typecheck
```

Expected: api 34 files / 482 passed + 3 skipped; landing 19 files / 152; admin 34 files / 364. Floors unmoved.

- [ ] **Step 7: Commit.** `git add -A && git commit -m "chore(sweep): the apps tree em-dash-free (#350)"` (`git status` first: only `apps/**` files, no doc/root strays).

---

## Task 5 — the full gate + the records + the PR

**Files:**
- Modify: `docs/progress.md` (one entry, em-dash-free prose)
- Generated: `graphify-out/**` (via `graphify update .`)

- [ ] **Step 1: Heal formatting.** `pnpm fix` (turbo fix + `fix:root` biome write): the sweep shortened lines by one character per replacement; any biome format drift lands here, including the Task 1 summary-rail re-wrap.

- [ ] **Step 2: The full gate.** With the test container up:

```bash
docker start sevendays-test-db-5433 2>/dev/null || true
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
```

Expected: green across lint + format + typecheck + test for every workspace member, every floor identical to the pre-flight record: api 34 files / 482 passed + 3 skipped; types 18 files / 197; api-client 5 files / 45; landing 19 files / 152; admin 34 files / 364; db 4 files / 30 passed + 0 skipped (with-var). Any count drift: stop and reconcile (nothing in this plan adds or removes a test).

- [ ] **Step 3: The progress.md entry.** Append at the end of `docs/progress.md` (matching the house entry format; the heading deliberately carries no em dash):

```md
## 2026-11-23 #350: the apps tree de-dashed (landing + admin + api)

Handover polish item 1 (spec #348) second leg: the whole apps tree is em-dash-free (2271 occurrences across 333 tracked files at the 2026-11-23 census; the ticket's "both apps" body wording is reconciled to all three app trees per the #349 plan's scope fence and the ~2.3k census arithmetic, with apps/api included because no sibling covers it). Product copy was hand-rewritten, never mechanically comma-ized: 19 landing strings (the home testimonials CTA label, the hero alt text that #358's heroImageAlt default adopts, the booking wizard's step/error copy, the branch tooltips, the empty states), 28 admin sites (the tab descriptors, the audit/gallery empty states, the submissions confirm descriptions shared with the notification seam, the price/cover helper lines, the dashboard free-tier lines, and the two aria-labels), and 4 api strings (the public rate-limit 429 message, the confirmation email's subject and body, the media 409 detail), every one with its pin suite and verify-script echo updated in lockstep. Rendered placeholder glyphs became real placeholders: the hyphen `-` everywhere except the booking summary's Schedule row (`Not scheduled yet`, with `(PHT)` riding only when a time exists) and the admin branches table's not-walk-in cell (`By appointment`). Comments, test titles, and dev-facing strings took the #349 sweep tool's fix mode plus the fix-up pass (109 line-end dashes, 3 double-space artifacts, the dev-string colon upgrades). Floors unchanged across all six suites; en dashes preserved (23 across 17 files); live DB rows untouched (Q5); all proposed wordings flagged for the owner's ratification at the PR. The docs sweeps are #351/#352 and the root sweep #353; the CI gate wiring is #354, which lands last.
```

- [ ] **Step 4: Graphify.** `graphify update .` (AST-only, no API cost) for the swept apps sources.

- [ ] **Step 5: Commit + PR.**

```bash
git add docs/progress.md && git commit -m "docs(progress): the #350 apps-sweep line"
git add graphify-out && git commit -m "chore(graphify): graph update for #350"
git push -u origin em-dash-sweep-apps
gh pr create --title "Handover polish: sweep the apps tree (#350)" \
  --body-file <(cat <<'EOF'
Closes #350. Spec #348 item 1, second leg.

- The whole apps tree is em-dash-free: 2271 occurrences across 333 tracked files (landing + admin + api; the ticket body's "both apps" wording reconciled to all three trees per the #349 plan's scope fence and the census arithmetic). Verdict: `node scripts/em-dash-sweep.mjs check apps` exit 0.
- Product copy hand-rewritten (19 landing + 28 admin + 4 api strings) with pins + verify-script echoes in lockstep; placeholder glyphs replaced (`-`, plus `Not scheduled yet` on the booking summary's Schedule row and `By appointment` in the admin branches not-walk-in cell); comments/titles/dev strings via fix mode + the fix-up pass (109 line-end dashes, 3 double-space artifacts, dev-string colon upgrades).
- Booking summary's empty scheduled time now reads `Not scheduled yet` instead of the em-dash glyph (the ticket's named example); the hero alt text's new wording is what #358's `heroImageAlt` default adopts.

**Owner flag:** every hand-rewritten string is the PROPOSED wording pinned in the plan (docs/superpowers/plans/2026-11-23-350-em-dash-sweep-apps-tree.md), awaiting ratification here per the #349 precedent. Edit any string and the owning task's gates + pins/echoes re-run before merge.

Floors unchanged: api 34 files / 482+3sk, landing 19 / 152, admin 34 / 364, types 18 / 197, api-client 5 / 45, db 4 / 30 (with-var). En dashes preserved (23 across 17 files). Live DB rows untouched (Q5). Post-merge: the visual suite may drift on copy-bearing shots (expected: services; possibly home/about outside the masked regions) and is re-baselined per the #346 procedure.
EOF
)
```

The PR body carries the owner flag verbatim; #350 closes on merge per the house pattern, with the acceptance criteria ticked in the issue at close.

- [ ] **Step 6: Post-merge visual close-out.** After CI's deploy serves the branch's copy on the teaser: run the visual suite (`E2E_BASE_URL=<teaser> E2E_API_URL=<api> pnpm exec playwright test e2e/visual`); a red on copy-bearing shots is expected by construction (the CTA label, the services closing strip, the about share card, the free-tier/dashboard lines are outside the landing baselines; the booking summary is not baselined). Re-baseline any copy-class drift with the pinned procedure: `E2E_BASE_URL=<teaser> E2E_API_URL=<api> pnpm exec playwright test e2e/visual --update-snapshots`, commit the new PNGs, and confirm a dispatched/nightly run goes green. A layout-class red is NOT expected and is a real finding (the #346 contract): stop and diagnose instead of re-baselining it away.

---

## Self-review record (written after the final append, 2026-11-23)

- Placeholder sweep: no `<!-- APPEND:` anchors remain; no TODO/placeholder markers; every before/after block is a byte-exact read from the tree at plan time (recon probes 2026-11-23, main `573f608`).
- Step-checkbox count: Task 1 has 6, Task 2 has 5, Task 3 has 5, Task 4 has 7, Task 5 has 6 (29 total, all `- [ ] **Step`).
- Cross-task names: `scripts/em-dash-sweep.mjs`, `check`/`fix` modes, `em-dash-sweep-apps`, the editorial law's five punctuation moves, and the glyph law's three values (`-`, `Not scheduled yet`, `By appointment`) are spelled identically everywhere they appear; every pin/echo file named in a task's Files list appears in exactly one edit step, and each copy table row's fragments appear in that task's verification grep.
- Counts re-derived from live probes, not memory: 2271 occurrences / 333 files (git ls-files + grep, 2026-11-23); class split 2133 spaced (incl. 3 double-space) + 109 line-end + 25 quoted glyphs + 4 spans = 2271; 53 hand-removed spaced (52 copy + 1 JSDoc) + 25 Task-1/2 glyph tokens + ≈2080 fix replacements + 109 + 4 = 2271; en dashes 23 across 17 files; floors live-run at plan time in the worktree (landing 19/152, admin 34/364, types 18/197, api-client 5/45, db 4/30 with-var, api 482 passed + 3 skipped with-var; the api without-var boot failure was observed, hence the pre-flight's with-var law).
- Boundary check: no test mocks added or changed; every pin edit quotes the constant's real value through its real assertion (`toEqual`/`toBe`/`toContain`/`stringContaining` as found in the tree); the two verify-script checks that read changed copy are dispositioned explicitly (the booking-wizard fragment survives; the content-pages aria-labels are untouched).
- The unanswered-at-plan-time owner ratification is disclosed in three places (Global Constraints, the progress entry, the PR body) rather than silently assumed, per the #349 precedent.
- Scope-fence reconciliation: the "both apps" vs `apps/api` wording conflict is recorded in Branch law with the four facts that settle it (the #349 fence, the census arithmetic, the absence of another api ticket, the AC's own api clause).
