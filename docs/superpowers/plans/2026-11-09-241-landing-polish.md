# Post-flight T1 — Landing Polish: Strip Removal, Placeholder Gradient, Mobile Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per repo AGENTS.md, tick completed boxes with the ✅ emoji (`- [✅]`), never plain `[x]`. **Task 3 is UI-bearing and loads the installed UI/UX skill set at execution time** (`prototype` + `ui-ux-pro-max`, plus `ui-styling` as relevant — the AGENTS.md rule, spec #94 amendment). **Task 4 is the owner-ruled quick variants round — a blocking controller interaction**: the build lands on the branch, the frames are captured, and NOTHING merges until the owner reacts (per the standing wait-for-the-owner rule). Everything else runs to the gates.

**Goal:** The three step-1 demo rulings (#239 items 1–3) land on both editions: the home emphasis strip goes entirely, the CoverPanel placeholder re-grades from the muted ramp to brand ink → brand primary (petrol), and the theme toggle moves inside the MobileNav panel below md — followed by the owner-reacted variants round and the two-step regeneration of the 16 committed visual baselines.

**Architecture:** Five tasks: (1) the three code edits — all eight files one commit (one ruling, one revert unit: removing the strip strips a `/branches` affordance that only that one commit removes, splitting the edits across commits would let an intermediate state reach the variants round half-ruled); (2) a one-line fence — the `call-visit` selector in `content-pages.mjs` narrows to home (the services strip is #239's forever-fence, never touched again); (3) the owner-reacted variants round over a dry-run capture script (before/after frames + DOM assertions, both themes, both viewports); (4) the two-step teaser baseline regen absorbing the pre-existing content drift BEFORE the merge so the zero-diff isolates exactly the three rulings (all post-merge visual work on a `visual/241` branch that merges AFTER the code PR — never on main); (5) gates, docs rotation, PR, the SPLIT to v1, issue closes, graphify.

**Tech Stack:** zero new dependencies, zero manifest changes (`pnpm-lock.yaml` untouched, `pnpm install` never runs), zero migrations, zero `packages/` changes — landing-only code plus main-only script/e2e/docs files. Arbitrary Tailwind v4 values as the incumbent CoverPanel already uses (`bg-[linear-gradient(…)]`, `tracking-[0.16em]` — the on-disk precedent; `packages/ui` is untouched). The `ThemeToggle` from `@sevendays/ui/components/theme-toggle` (className-only API, probed this session: the Button's `cn(base, 'hidden size-9 … md:inline-flex')` merge keeps `hidden` and lets `md:inline-flex` win at md+). Playwright 1.63.0's chromium (the repo's pinned version — its computed-style serialization of the ruled gradient is pinned in Global Constraints; verified live). `next-themes` 0.4.6 default `theme` localStorage key. pnpm 11.24.0 (probed: `--` in `pnpm test:e2e -- <filter>` forwards BOTH arguments to playwright — the e2e README's literal form fails to filter — the pinned forms below are the verified ones). `gh` CLI, GitHub Issues.

**Spec:** Implements ticket [#241 "Post-flight T1 — landing polish: strip removal, placeholder gradient, mobile toggle (+ variants round + baseline regen) (#239)"](https://github.com/jeius/sevendays/issues/241) (label `ready-for-agent`), whose parent is [#239 "M7 post-flight — the demo fix batch (#1–16) + the branch-Maps feature (#225)"](https://github.com/jeius/sevendays/issues/239). The three ruled items, verbatim from #239: **(1)** "Remove the home emphasis strip — the *\"Not sure which session fits?\"* + Find-a-branch band goes entirely (both editions). (step 1)" · **(2)** "The CoverPanel placeholder gradient — re-grade the \"Cover photo coming soon\" placeholder from the muted ramp to **brand ink → brand primary (petrol)** — all CoverPanel surfaces (home featured, packages index, detail, branch strips). (step 1)" · **(3)** "Mobile: the ThemeToggle moves INSIDE the MobileNav panel — the header bar keeps the desktop toggle only. (step 1)". The process ruling, verbatim from #241: "build → a **quick rendered-variants round** (before/after frames of all three changes, both themes) → owner reaction → land → **regenerate the 16 committed visual baselines** (the strip + gradient change the teaser) → re-run the visual suite zero-diff." The six acceptance criteria, verbatim from #241: the strip is gone from home on both editions; the component retired if unreferenced · the placeholder renders the ruled ink→primary gradient on every CoverPanel surface · Mobile: the toggle is in the menu; desktop: unchanged in the bar · the variants round ran and the owner reacted · the 16 baselines regenerated; the visual suite zero-diff green · `pnpm check` + `pnpm build` green. Owner rulings (2026-11-09 clarify, this session): the placeholder's initials + "Cover photo coming soon" copy and tint ride UNCHANGED (only the gradient moves — AA holds: the incumbent ramp's lightest stop was already primary); the menu toggle is a hairline row under the CTA (mono THEME label left, the shared toggle right — its JSX comment and the capture script carry source copy "Theme"); the baseline regen runs TWO-STEP (the pre-existing teaser content drift is absorbed by a pre-merge regen on main, so the post-merge zero-diff isolates the ticket). Key recon facts (2026-11-09, main `afbc17d`, tree clean — post-#250; every file below read whole this session):

- **The strip's retirement ruling, pinned:** there is NO component to retire — the strip was never extracted; both instances are inline JSX sections. Home's (the ticket's target) is `home-image-led.tsx:384-404` (`data-strip='call-visit'`, the quoted copy, the Find-a-branch outline button). The OTHER instance — `services.tsx:64-87` ("Need a service at one of our branches?" + `Find a branch`, the #60/#97 ruling, `KEPT VERBATIM as landed` per its own comment) — is #241's forever-fence: same selector, different ruling, never touched by this ticket or a successor (removing it would need a fresh owner ruling; #239 scopes item 1 to "the home emphasis strip" and quotes only home's copy). The home slot-map comment (`home-image-led.tsx:27`) and `index.tsx:16-17`'s composition note both narrate the strip as slot 6 and both are edited alongside the removal; both compositions end at the testimonials section afterward.
- **The surfaces inventory (probed live on the teaser):** 11 packages, 9 coverless (2 featured + coverless); 3 branches, ALL coverless; 4 testimonials (2 pages — pagination renders); 8 gallery photos. So every CoverPanel surface renders live placeholders on the teaser today — the gradient is judgeable on home-featured, packages, detail, AND branches with zero catalog work (never mutate the catalog). `/share-your-story` + `/about` + the not-found carry no CoverPanel and no `call-visit` strip — their baselines regenerate (content drift) without carrying any #241 pixel.
- **The toggle's move, mechanically:** the bar's `<ThemeToggle>` (`site-header.tsx:70`) gains `hidden` + `md:inline-flex` (tailwind-merge: `hidden` in className overrides the Button's base `inline-flex`; probed — the merged class string keeps both; at md+ exactly one toggle is visible, below md none). The panel's row renders INSIDE `CollapsibleContent`, AFTER `</nav>`, OUTSIDE `<nav>` (a control, not navigation — the numbered rows stay exactly 01–04). The panel is `bg-brand-ink` in both themes, so the row rides the bar's exact tint classes. Toggling keeps the panel open (the collapse only follows its trigger or a link click). The ThemeToggle import sorts between `collapsible` and `Link` (`@sevendays/ui/components/theme-toggle` — Biome-verified canonical this session).
- **`content-pages.mjs` carries one strip-coupled assertion** (`apps/landing/scripts/verify/content-pages.mjs:63-71`): 'home: branches carried by footer + emphasis strip (variant D)' asserts `homeBranchLinks >= 2 && home.includes('Call or visit a branch')`. Post-removal the header nav + footer still carry `/branches` (count ≥ 2 holds) but the copy goes — the assertion would fail without this plan's rewrite. The file is `apps/landing/scripts/verify` — a main-only path (`scripts/seed-v1/paths.txt:24`), never on v1. The check's new form counts the selector, requires ZERO on home, and asserts the strip copy's absence.
- **`content-pages.mjs` is pre-existing stale (drifted at #223, last touched 2026-09-29)**: three of its checks already fail against the current build — `/services: one-line add-on cross-reference visible` (the copy left with #223's ruled services rewrite: "The ruled intro (#164 Round 3): the add-ons line is GONE"), `home: teaser items deep-link /book?service=` (home's service cards deep-link via `search={{ service }}` on `home-cards.tsx:30` — no literal `a[href^="/book?service="]` matches; re-derivable as `a[href^="/book"]` only with shape-guessing), and `home: ratified hero blurb visible` (the default rode `SITE_SETTINGS_DEFAULTS.homeDescription`, `packages/types/src/site-settings.ts:105` — copy still exists in code; the check fails only because the teaser's LIVE settings return the resolved object whose fields are all set, so `text()` misses nothing — the failure is the check's, not the copy's; it drifts with any site-copy save). The pre-existing failures are PINNED in Task 2's expected output (all three named) so the executor never mistakes them for this ticket's regression; the ONE assertion this ticket owns is the strip check; the #223-stale tail is fenced to a new ticket (never "fixed" here — each is an edit the owner has not ruled).
- **The baselines are already failing nightly — pre-existing, not #241's:** the 2026-11-08 nightly (run 42531939388, teaser) failed ALL 16 visual tests: +61px height drift on EVERY surface (every page gains a whole extra content row — a teaser content save; banner off, testimonials 4, gallery 8 — nothing #241 touches explains a uniform +61px), plus a genuine home layout shift (`home-light`: expected 1280×4318, received 1280×5023, ratio 0.46 — a taller home; the marquee mask holds, so it is content above/below the fold, not animation). The 2026-11-07 nightly succeeded. This is exactly the advisory-drift posture the e2e README documents ("CMS content edits surface as drift in the nightly log; the owner re-baselines on intent") — and the owner's 2026-11-09 two-step ruling makes THIS ticket the deliberate re-baseline: the pre-merge regen absorbs the drift on main, the post-merge regen records the three rulings.
- **The two-step regen mechanics (owner-ruled 2026-11-09):** the teaser serves BOTH editions' shared content — the pre-merge step captures today's teaser state once, on main, in a `visual/241-content-drift` branch (name it exactly — `git switch -c visual/241-content-drift` after confirming `git status` clean); the code PR merges; the teaser redeploys on main's merge push (ci.yml's `Deploy teaser (main)` job, no manual step); the post-merge step regenerates against the deployed teaser on the `visual/241` branch; the visual PR's diff is then exactly the ticket's pixels (strip gone, gradient, toggle). Baselines are `e2e/` — main-only (`scripts/seed-v1/paths.txt:32-34`), so the visual PR is a pure SKIP for v1 (record it in the same close-out ledger row as the split, one row per PR — the runbook's one-row-per-PR law). Playwright pins `toHaveScreenshot` names to the spec's own relative path (`redesign.spec.ts-snapshots/`), so BOTH regens run from the repo root against the DEPLOYED teaser via `E2E_BASE_URL`/`E2E_API_URL` (never a local server — ADR-0022) — command form pinned in Global Constraints (the README's literal `--` form forwards BOTH arguments and fails to filter; the corrected `--list`-verified forms are pinned). Determinism probed this session: the teaser's six read endpoints return byte-stable JSON across passes (fingerprint-identical two consecutive runs — the `?radius=`-style query-string image URLs are content-stable), chromium 1.63.0 is installed (`~/.cache/ms-playwright/chromium-1243/…` present), and the local suite runs green-callback with `E2E_BASE_URL=http://127.0.0.1:9` (16 listed in `e2e/visual`). An `--update-snapshots` regen writes ONLY when a capture differs (`--update-snapshots=changed` is the flag's default) — an unchanged surface's PNG stays byte-identical (the not-found's 2 baselines are the control: the regen must leave them untouched).
- **The v1 SPLIT (probed):** v1 drifts from main on exactly three of the eight code files — the booking-off CTA transform (`CalendarPlus`+`Book now` → `Phone`+`Call us`, `to='/branches'`) in `home-image-led.tsx`, `site-header.tsx`, `mobile-nav.tsx`, plus `package-detail.tsx`'s comment-block CTA prose; `cover-panel.tsx`, `featured-plates.tsx`, `branch-card.tsx`, `index.tsx` are byte-identical. A 3-way `git merge-file` of this plan's pinned edits onto v1's variants was SPIKED clean for 6 of 8 (v1's CTA transform survives, the ruling carries); the two exceptions get pinned v1 resolutions (below). `AGENTS.md` merges onto v1 with ONE conflict — the never-authorized v1 status section (v1's AGENTS.md has no floors section; the diff's whole tail is insert-after-context, context absent on v1): resolve by KEEPING V1'S CONTENT VERBATIM and applying ONLY the one-sentence toggle rewrite (`the shared sun/moon toggle in the landing header + the admin topbar` → `… in the landing header (inside the mobile menu panel below md — the M7 post-flight #241) + …`; that find-string occurs exactly once on v1 — probed) and DROPPING the CoverPanel-rule edit (that sentence does not exist on v1 — the content-drop class, #249's precedent). The other pinned v1 resolution: `package-detail.tsx`'s comment edit resolves to `// the ink→petrol placeholder when the row has no cover), a light panel carrying` on the line that on v1 reads `// the muted placeholder when the row has no cover), a light panel carrying` — v1's surrounding Call-us prose stays. After the cherry-pick: `pnpm check` + `pnpm build` + the export audit in the v1 checkout (`~/Projects/sevendays-v1-seed`, branch `v1`), push, watch the run — the locks: `check` success, `Deploy v1 (private)` success, `Deploy teaser (main)` skipped; live-curl the real v1 host (`sevendays-v1-landing.sevendays-studio.workers.dev` — landing 200, `/book` 404, site-settings 200; NEVER the deleted `pahamajulius` ghosts).
- **Sibling fences (the post-flight's own cuts):** NOT here, regardless of temptation: **the services closing strip** (#239 item 1 is home's only; services' is #60/#97's, kept verbatim) — fenced above; **gallery manager UX** — #243; **duplicate-save feedback** — #245; **site-logo PNG** — #246; **Socials SVG icons** — #247; **Users-tab display** — #244; **branch Maps** — #248; **the landing tests** — zero files change (no seam covers the strip/toggle/CoverPanel; the landing floor stays 16 files / 123 tests); **the tokens** — `--brand-ink`/`--brand-primary` already exist (`packages/ui/src/tokens.css:18-19`, fixed points, both themes); **`scripts/measure-theme-pairs.mjs`** — gates token PAIRS, not component gradients; no token changes, no run; **the e2e spec/config/workflow** — unchanged (the suite's structure already covers all three rulings: home baselines carry the strip + toggle, every surface carries the gradient); **the v1 baselines** — none exist (ADR-0022: teaser-only forever).
- **The dry-run residue:** this planning session's capture-script dry run wrote gitignored scratch under `.superpowers/sdd/_241-dryrun/` — clean it up (Task 3 Step 6) so the executor's evidence dir starts empty. The PLAN's capture script is reproduced verbatim in Task 3 (dry-run-proven against the live teaser in BEFORE mode: every assertion passed, 16 frames + the contact sheet rendered).

## Global Constraints

- **Branch & baseline:** `feat/241-landing-polish` off main `afbc17d` (plain checkout — single linear ticket, no worktree needed). This plan file is the branch's first commit. Commit messages follow the repo's `type(scope): … (#241)` squash style; every commit below is pinned verbatim. Evidence (capture frames, the owner's rulings, the regen runs' stdout, the eyeball checklist) lands in gitignored `.superpowers/sdd/2026-11-09-241-landing-polish/`.
- **Gates (repo AGENTS.md, verbatim duties):** **zero manifest changes — `pnpm-lock.yaml` is untouched and `pnpm install` never runs.** Task 1 commits only with the checks green for the packages it touched: `pnpm --filter @sevendays/landing fix` (accept the rewrites — every pinned edit was Biome-format-canonical at plan time, probed; if `fix` rewrites ANYTHING the edits drifted from this plan — stop and reconcile before committing) → `test -- --run` (expect `Test Files 16 passed (16) · Tests 123 passed (123)`) → `typecheck` → `build`. `pnpm build:packages` is NOT needed (no `@sevendays/api` dist change is consumed). Final gate: `pnpm check` green across the repo + `pnpm build` (7 workspaces). Never stage `graphify-out/` churn. Never commit secrets. Tick checklist boxes with `- [✅]`, never plain `[x]` (this plan file and issue bodies alike). Run `graphify update .` at close (Task 5 — code was modified). The e2e suite is NEVER part of `pnpm check` (ADR-0022) — the visual work runs as its own explicit steps (Task 4), never as a PR gate.
- **The pinned edit law:** every code edit in Task 1 is a find/replace pair whose find-string matches EXACTLY ONCE in its file (counted at plan time — the spike's mechanical precondition, and `fix`-canonical). If any find matches ≠ 1 at execution, STOP — the file drifted; reconcile against main before editing. The edits were 3-way-merge-spiked onto v1's variants (clean for 6 of 8; the two exceptions + AGENTS.md get the pinned resolutions in Task 5) — the spike proves the v1 SPLIT's shape, not a substitute for executing it.
- **The gradient law (owner-ruled 2026-11-08, #239 item 2):** the CoverPanel placeholder's gradient is EXACTLY `bg-[linear-gradient(135deg,var(--brand-ink),var(--brand-primary))]` — ink first (135deg origin corner), petrol second, two stops, no third. The text stays EXACTLY as on disk (owner-ruled 2026-11-09): the initials span (`font-bold text-3xl text-white`) and the caption (`text-white/85 text-xs`, `Cover photo coming soon`) ride unchanged — AA holds (the incumbent ramp's lightest stop was already primary #06708e; white on it 5.65:1 per tokens.css). Both stops are fixed brand points, identical in both themes. The pinned Chrome serialization (Playwright 1.63.0's chromium, probed this session — the capture script's assertion literal): `linear-gradient(135deg, oklch(0.185 0.0164 256.833), oklch(0.5076 0.09475 225.078))`.
- **The toggle law (owner-ruled 2026-11-08, #239 item 3 + the 2026-11-09 composition ruling):** below md the toggle renders ONLY inside the MobileNav panel; at md+ ONLY in the bar. The bar's keeps its exact tint classes and gains `hidden` + `md:inline-flex` (the leading `inline-flex` drops — tailwind-merge keeps `hidden`; at md+ `md:inline-flex` wins). The panel's row: a `border-white/10 border-t` hairline row inside `CollapsibleContent`, after `</nav>`, outside `<nav>`; the mono THEME label (source copy `Theme`, uppercase + `tracking-[0.16em]` — renders "THEME", the bar eyebrow's exact register) on `text-brand-300` left; the toggle right on the bar's exact tint classes (`inline-flex size-9 rounded-md text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring`). Toggling keeps the panel open. No other placement, no icon-swap, no label rewrite — anything else goes back to the variants round.
- **The strip law (owner-ruled 2026-11-08, #239 item 1):** home's `call-visit` section goes entirely (both editions); there is NO component to retire (never extracted — the retirement half of AC1 is satisfied by the sweep gate proving zero references to the copy/selector on home). The services closing strip (`services.tsx`) is fenced — its `data-strip='call-visit'` stays.
- **The fences:** the services closing strip (#60/#97's, KEPT VERBATIM); the `content-pages.mjs` #223-stale tail (three named pre-existing failures — pinned, never "fixed" here); the landing tests (zero change); the tokens; the e2e spec/config/workflow; `measure-theme-pairs.mjs`; every sibling ticket's files (#243–#248).
- **The visual-regen law (ADR-0022 + the owner's 2026-11-09 two-step ruling):** both regens run from the repo ROOT against the DEPLOYED teaser (`E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev` `E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev` — the GitHub `teaser` environment's probed values), NEVER a local dev server. Command forms (pnpm 11.24.0-probed: the README's literal `--` form forwards BOTH arguments and fails to filter): compare — `E2E_BASE_URL=<teaser> E2E_API_URL=<teaser-api> pnpm exec playwright test e2e/visual` · regen — `E2E_BASE_URL=<teaser> E2E_API_URL=<teaser-api> pnpm exec playwright test --update-snapshots=changed e2e/visual` (only-when-changed semantics; an unchanged surface's PNG stays byte-identical). After every regen: EYEBALL every changed PNG (the README's law — "a masked-wrong or empty-content baseline is a false green forever") and re-run the compare (expect 16 passed). The pre-merge regen runs on `visual/241-content-drift` (cut from main, NOT from the feature branch — it captures main's teaser state); the post-merge regen runs on `visual/241` (cut from the merged main). No `git checkout <sha> -- <baseline>` ever — a baseline must be born from a real capture against a deployment (the #225 law).
- **The v1 law:** the pick reproduces the PR's intent on v1's booking-off variants — v1's Call-us CTAs survive every hunk. The pinned v1 resolutions: (1) `package-detail.tsx` — the comment line resolves to `// the ink→petrol placeholder when the row has no cover), a light panel carrying` replacing v1's `// the muted placeholder when the row has no cover), a light panel carrying` (v1's surrounding Call-us prose stays); (2) `AGENTS.md` — keep v1's content verbatim through the conflicted tail, apply ONLY the toggle sentence rewrite (the one-sentence find/replace, occurring exactly once on v1), DROP the CoverPanel-rule edit (the sentence does not exist on v1 — content-drop, #249 precedent). The post-merge visual PR (`visual/241`) is a pure SKIP — `e2e/` is main-only; record it in the same close-out ledger row as the split (one row per PR is the runbook's law — the row names both PRs).
- **The floors (live, run this session):** landing 16 files / 123 tests; every other suite unchanged from AGENTS.md's recorded floors (this ticket touches none of them). Task 1 changes no suite — if any gate count differs at execution, reconcile before proceeding (do not loosen assertions).

## File Structure

```text
apps/landing/src/components/
  home-image-led.tsx        # modify (T1) — strip section + slot-map comment
  cover-panel.tsx           # modify (T1) — the ruled gradient + comment
  featured-plates.tsx       # modify (T1) — comment: "the muted placeholder" → "the ink→petrol placeholder"
  package-detail.tsx        # modify (T1) — comment (same reword, this file's phrasing)
  branch-card.tsx           # modify (T1) — comment (same reword, this file's phrasing)
  site-header.tsx           # modify (T1) — the bar's toggle goes md+ only
  mobile-nav.tsx            # modify (T1) — the ThemeToggle row inside the panel
apps/landing/src/routes/
  index.tsx                 # modify (T1) — composition note: the strip retired
apps/landing/scripts/verify/
  content-pages.mjs         # modify (T2) — the strip-coupled home check rewritten
.superpowers/sdd/2026-11-09-241-landing-polish/   # T3+ evidence (gitignored)
e2e/visual/redesign.spec.ts-snapshots/             # T4 — the two-step 16-PNG regen (committed)
docs/progress.md  AGENTS.md  docs/agents/v1-picks.md  graphify-out/   # T5
```

---

### Task 1: The three rulings in code — one commit, all eight files

One ruling, one revert unit. The home strip's `/branches` affordance dies with this commit — an intermediate state (strip gone, gradient old) must never reach the variants round or a deploy.

**Files:**
- Modify: `apps/landing/src/components/home-image-led.tsx` (the strip section 384-404 + the slot-map comment line 27)
- Modify: `apps/landing/src/components/cover-panel.tsx` (the comment 9-11 + the gradient class, line 34)
- Modify: `apps/landing/src/components/featured-plates.tsx` (comment, line 10)
- Modify: `apps/landing/src/components/package-detail.tsx` (comment, line 12)
- Modify: `apps/landing/src/components/branch-card.tsx` (comment, line 17)
- Modify: `apps/landing/src/components/site-header.tsx` (the toggle, lines 68-70)
- Modify: `apps/landing/src/components/mobile-nav.tsx` (imports, the panel row)
- Modify: `apps/landing/src/routes/index.tsx` (the composition note, lines 16-17)

**Interfaces:** consumes nothing new; produces nothing a later task consumes (Task 3's script asserts the rendered outcomes; Tasks 4-5 consume the commit).

**Not here:** the services closing strip (fenced); `content-pages.mjs` (Task 2); any test file (the landing suite pins none of these surfaces); any token (both stops exist); any e2e file.

- [ ] **Step 1: Load the UI/UX skill set**

Per AGENTS.md, load `prototype` + `ui-ux-pro-max` (plus `ui-styling` as relevant) before editing. The rendered shapes are pinned below — the skills inform judgment (disclosure semantics, focus order in the panel), not re-composition.

- [ ] **Step 2: The strip removal — `home-image-led.tsx`**

(a) Replace the slot-map comment's last line (line 27):

```tsx
// paginated 3/page with a page-change reveal → 6 the #92 emphasis strip.
```

with:

```tsx
// paginated 3/page with a page-change reveal — the page's last section
// (the #92 emphasis strip that closed it is retired: M7 post-flight #241).
```

(b) Delete the strip section (lines 383-404) — the file's tail becomes:

```tsx
      </section>
    </div>
  );
}
```

(The deleted block, for identification: the `{/* 6 — Emphasis strip: the ratified #92 gray-light band. */}` comment, the whole `<section … data-strip='call-visit'>…</section>`, and the blank line above the comment — the testimonials section's closing `</section>` now precedes `</div>` directly. `buttonVariants` and `cn` KEEP their imports — the hero and testimonial dots still use them.)

- [ ] **Step 3: The gradient — `cover-panel.tsx`**

(a) Replace the comment (lines 9-11):

```tsx
// #97: the deep-petrol media gradient is the atmosphere's accent lane
// (deep petrol = media gradients only) — dark stops (600→800→deep) keep
// the white text AA on every stop.
```

with:

```tsx
// The placeholder gradient runs brand ink → brand primary (petrol): the
// M7 post-flight #241 re-grade, owner-ruled 2026-11-08 (it replaced #97's
// muted 600→800→deep ramp). Both stops are fixed brand points, identical
// in both themes; the lightest stop (primary) is the incumbent's, so the
// white text keeps its AA (white on petrol 5.65:1 — tokens.css).
```

(b) Replace the gradient class (line 34):

```tsx
        'flex h-40 flex-col items-center justify-center gap-1 rounded-lg bg-[linear-gradient(135deg,var(--brand-600),var(--brand-800),var(--brand-deep))]',
```

with:

```tsx
        'flex h-40 flex-col items-center justify-center gap-1 rounded-lg bg-[linear-gradient(135deg,var(--brand-ink),var(--brand-primary))]',
```

- [ ] **Step 4: The three law-comment rewords — `featured-plates.tsx`, `package-detail.tsx`, `branch-card.tsx`**

(a) `featured-plates.tsx` line 10 — replace:

```tsx
// quality (no overlay touches it — the CoverPanel law renders the muted
```

with:

```tsx
// quality (no overlay touches it — the CoverPanel law renders the ink→petrol
```

(b) `package-detail.tsx` line 12 — replace:

```tsx
// the muted placeholder when the row has no cover), a light panel carrying
```

with:

```tsx
// the ink→petrol placeholder when the row has no cover), a light panel carrying
```

(c) `branch-card.tsx` line 17 — replace:

```tsx
// renders today's muted placeholder), the walk-in badge as an icon tooltip
```

with:

```tsx
// renders the ink→petrol placeholder), the walk-in badge as an icon tooltip
```

- [ ] **Step 5: The bar toggle goes md+ only — `site-header.tsx`**

Replace lines 68-70 (the comment + the toggle):

```tsx
          {/* The toggle rides the glass bar (#217's ruled placement), at
              size-9 so the bar keeps its 56px height. */}
          <ThemeToggle className='inline-flex size-9 rounded-md text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring' />
```

with:

```tsx
          {/* The toggle rides the glass bar at md+ (#217's ruled placement),
              at size-9 so the bar keeps its 56px height; below md it lives
              inside the MobileNav panel (the M7 post-flight #241). */}
          <ThemeToggle className='hidden size-9 rounded-md text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring md:inline-flex' />
```

(The leading `inline-flex` drops — tailwind-merge keeps `hidden` over the Button's base `inline-flex`; probed. The classes otherwise keep their on-disk order, `md:inline-flex` appended.)

- [ ] **Step 6: The panel's toggle row — `mobile-nav.tsx`**

(a) The import — insert after the `collapsible` import block (after line 6, `} from '@sevendays/ui/components/collapsible';`):

```tsx
import { ThemeToggle } from '@sevendays/ui/components/theme-toggle';
```

(Biome sorts it exactly here — between `collapsible` and `Link`; probed canonical.)

(b) The panel row — replace the file's tail:

```tsx
        </nav>
      </CollapsibleContent>
```

with:

```tsx
        </nav>
        {/* Below md the theme toggle lives HERE, not in the bar (the M7
            post-flight #241, owner-ruled 2026-11-09): its own hairline row
            under the CTA, outside <nav> (a control, not navigation) — the
            mono THEME label left, the shared toggle right on the bar's ink
            tint. Toggling keeps the panel open. */}
        <div className='mx-auto max-w-5xl px-6 pb-4'>
          <div className='flex items-center justify-between border-white/10 border-t pt-3'>
            <span className='font-mono text-brand-300 text-xs uppercase tracking-[0.16em]'>
              Theme
            </span>
            <ThemeToggle className='inline-flex size-9 rounded-md text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring' />
          </div>
        </div>
      </CollapsibleContent>
```

- [ ] **Step 7: The composition note — `index.tsx`**

Replace (lines 16-17):

```tsx
// glass bar → the live mosaic gallery → D2 featured plates → the services
// marquee → REAL paginated testimonials → the emphasis strip. The loader
```

with:

```tsx
// glass bar → the live mosaic gallery → D2 featured plates → the services
// marquee → REAL paginated testimonials (the closing emphasis strip
// retired by the M7 post-flight, #241). The loader
```

- [ ] **Step 8: Grep gate — the sweep**

```bash
grep -rc "Not sure which session fits" apps/landing/src | awk -F: '{s+=$2} END{print "strip copy:", s}'
grep -rn "data-strip='call-visit'" apps/landing/src
grep -rc "brand-600),var(--brand-800),var(--brand-deep)" apps/landing/src | awk -F: '{s+=$2} END{print "old gradient:", s}'
grep -rc "var(--brand-ink),var(--brand-primary)" apps/landing/src | awk -F: '{s+=$2} END{print "new gradient:", s}'
grep -c "md:inline-flex" apps/landing/src/components/site-header.tsx
grep -c "<ThemeToggle" apps/landing/src/components/mobile-nav.tsx
grep -rc "muted placeholder\|today's muted\|renders the muted$" apps/landing/src/components | awk -F: '{s+=$2} END{print "muted-placeholder phrases:", s}'
```

Expected: `strip copy: 0` · `data-strip='call-visit'` → exactly ONE hit, `apps/landing/src/routes/services.tsx` (the fence holds) · `old gradient: 0` · `new gradient: 1` · `md:inline-flex` → 1 · `<ThemeToggle` in mobile-nav → 1 · `muted-placeholder phrases: 0`. Save the output to `.superpowers/sdd/2026-11-09-241-landing-polish/task-1-grep.txt`. Any deviation: stop, reconcile.

- [ ] **Step 9: Lint, format, test, typecheck, build**

```bash
pnpm --filter @sevendays/landing fix
pnpm --filter @sevendays/landing test -- --run
pnpm --filter @sevendays/landing typecheck
pnpm --filter @sevendays/landing build
```

Expected: `fix` rewrites NOTHING (every pinned edit is format-canonical — probed at plan time; if it rewrites, the edits drifted — reconcile). Tests: `Test Files 16 passed (16) · Tests 123 passed (123)`. Typecheck + build green (`mobile-nav.tsx`'s module graph gains the `theme-toggle` edge — the build proves it bundles).

- [ ] **Step 10: Commit**

```bash
git add apps/landing/src/components/home-image-led.tsx apps/landing/src/components/cover-panel.tsx apps/landing/src/components/featured-plates.tsx apps/landing/src/components/package-detail.tsx apps/landing/src/components/branch-card.tsx apps/landing/src/components/site-header.tsx apps/landing/src/components/mobile-nav.tsx apps/landing/src/routes/index.tsx
git commit -m "feat(landing): the strip retired, the placeholder ink→petrol, the toggle in the mobile menu (#241)"
```

### Task 2: The `content-pages.mjs` strip-coupled check — rewritten, fenced

One assertion in the CDP script is coupled to the strip. The file also carries three PRE-EXISTING failures (drifted at #223, pinned below) — they stay exactly as they are.

**Files:**
- Modify: `apps/landing/scripts/verify/content-pages.mjs` (the home branches check, lines 59-71)

**Interfaces:** consumes Task 1's commit; produces nothing a later task consumes.

**Not here:** the three #223-stale checks (add-ons cross-reference, teaser deep-links, hero blurb — a NEW ticket owns them; never "fix" an unruled check inside this ticket); any other check in the file; the script's runner contract (CDP :9222, LANDING/API env — untouched).

- [ ] **Step 1: Rewrite the check**

Replace:

```js
  // Ruled edit (#101, this ticket's one script exception): the #111
  // variant D composition drops the branches body strip — footer +
  // emphasis carry branches (both asserted here); walk-in badges stay
  // fully covered by the /branches check below.
  const homeBranchLinks = await evaluate(
    `[...document.querySelectorAll("a[href='/branches']")].length`
  );
  check(
    'home: branches carried by footer + emphasis strip (variant D)',
    homeBranchLinks >= 2 && home.includes('Call or visit a branch')
  );
```

with:

```js
  // Ruled edit (#241, the M7 post-flight — #239 item 1): the home emphasis
  // strip is retired on both editions, so the chrome alone carries branches
  // (the header nav + the footer — both counted here) and the strip's
  // absence is asserted; walk-in badges stay fully covered by the /branches
  // check below.
  const homeBranchLinks = await evaluate(
    `[...document.querySelectorAll("a[href='/branches']")].length`
  );
  const homeCallVisitStrips = await evaluate(
    `document.querySelectorAll("[data-strip='call-visit']").length`
  );
  check(
    'home: branches carried by the chrome; the emphasis strip retired (#241)',
    homeBranchLinks >= 2 &&
      homeCallVisitStrips === 0 &&
      !home.includes('Not sure which session fits?')
  );
```

(The counter ALWAYS queries the selector — the strip's absence must be an assertion, never an assumption. Biome-clean over this file — probed at plan time.)

- [ ] **Step 2: Syntax + biome**

```bash
node --check apps/landing/scripts/verify/content-pages.mjs
pnpm --filter @sevendays/landing fix
```

Expected: both clean, `fix` rewrites nothing.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/scripts/verify/content-pages.mjs
git commit -m "chore(landing): content-pages carries the #241 strip retirement in its home check (#241)"
```

(The script's full green run belongs to Task 5's walkthrough, with the three pre-existing failures separately identified — never "fixed" here.)

### Task 3: The quick variants round — before/after frames + DOM assertions, owner reaction

The owner-ruled gate. A dry-run-proven capture script walks the stack read-only in BEFORE (main) and AFTER (the branch) modes — both themes, both viewports, 18 frames each + a contact sheet — with DOM assertions for every ruling. The script asserts; the owner reacts to the frames.

**Files:**
- Write: `.superpowers/sdd/2026-11-09-241-landing-polish/capture.mjs` (verbatim below — gitignored evidence)
- Write: the frames + `index.html` beside it (generated)
- Modify (only if the round rules a retune): the Task 1 files

**Interfaces:** consumes Task 1's commit (the AFTER mode); produces the owner's rulings (evidence) + any retune commits.

**Not here:** re-litigating the rulings themselves (the round judges the BUILD's fidelity + the genuinely new composition — the menu row); any catalog mutation (never toggle a cover or a flag to stage a state — the surfaces inventory already renders every placeholder live); the teaser (the round walks the LOCAL stack; baselines are Task 4's).

- [ ] **Step 1: Write the capture script**

Write `.superpowers/sdd/2026-11-09-241-landing-polish/capture.mjs` with EXACTLY this content (dry-run-proven against the live teaser this session — every BEFORE assertion passed, 16 frames + the sheet rendered):

```mjs
// The #241 variants-round capture — throwaway: it lives in the gitignored
// evidence dir and is never committed. It walks the LOCAL stack read-only
// (landing :3000 over api :8787), asserts the three rulings per label, and
// writes before/after frames + a contact sheet (index.html) beside itself.
// Usage: node capture.mjs <before|after>
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const LABEL = process.argv[2];
if (LABEL !== 'before' && LABEL !== 'after') {
  throw new Error('usage: node capture.mjs <before|after>');
}
const AFTER = LABEL === 'after';
const LANDING = process.env.LANDING_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://127.0.0.1:8787';
const HERE = new URL('.', import.meta.url).pathname;
const OUT = `${HERE}frames/${LABEL}`;
mkdirSync(OUT, { recursive: true });

// The ruled gradient as Chrome serializes it (probed 2026-11-09 on
// Playwright 1.63.0's chromium). Both stops are fixed brand points, so the
// string is identical in both themes.
const RULED_GRADIENT =
  'linear-gradient(135deg, oklch(0.185 0.0164 256.833), oklch(0.5076 0.09475 225.078))';
const CAPTION = 'Cover photo coming soon';
const FRAMES = [
  'home-tail',
  'home-featured',
  'packages',
  'detail',
  'branches',
  'mobile-bar',
  'mobile-menu',
  'mobile-menu-toggled',
  'desktop-bar',
];

const failures = [];
function expectThat(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} [${LABEL}] ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

const packages = await (await fetch(`${API}/api/v1/service-packages`)).json();
const coverless = packages.find((p) => !p.coverImageUrl);
if (!coverless) {
  throw new Error(
    'no coverless package in the catalog — the placeholder cannot be judged; stop and ask the owner (never mutate the catalog)'
  );
}
const branches = await (await fetch(`${API}/api/v1/branches`)).json();
if (!branches.some((b) => !b.coverImageUrl)) {
  throw new Error(
    'every branch carries a cover — the branch-strip placeholder cannot be judged; stop and ask the owner'
  );
}

// The visual suite's settle (e2e/visual/redesign.spec.ts): fire the one-shot
// reveals, force lazy images eager, wait for every image to decode, settle.
async function settle(page) {
  await page.evaluate(async () => {
    const scroller = document.scrollingElement ?? document.body;
    for (let y = 0; y < scroller.scrollHeight; y += 600) {
      scroller.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    scroller.scrollTo(0, 0);
  });
  await page.evaluate(() => {
    for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
  });
  await page.waitForFunction(
    () => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
    undefined,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(600);
}

// Every placeholder on the page — the caption span's parent IS the CoverPanel box.
function placeholderGradients(page) {
  return page.evaluate(
    (caption) =>
      [...document.querySelectorAll('span')]
        .filter((span) => span.textContent === caption)
        .map((span) => getComputedStyle(span.parentElement).backgroundImage),
    CAPTION
  );
}

function checkGradients(surface, gradients) {
  expectThat(`${surface}: renders a placeholder`, gradients.length > 0, `${gradients.length} found`);
  const ruled = gradients.filter((g) => g === RULED_GRADIENT).length;
  expectThat(
    `${surface}: every placeholder ${AFTER ? 'wears' : 'predates'} the ruled ink→primary gradient`,
    AFTER ? ruled === gradients.length : ruled === 0,
    gradients[0] ?? 'none'
  );
}

// Every theme toggle in the DOM: is it inside the MobileNav panel, is it visible.
function toggles(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('button[aria-label="Toggle theme"]')].map((button) => ({
      inPanel: button.closest('.nav-panel') !== null,
      visible: button.checkVisibility(),
    }))
  );
}

const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) {
    const shot = (frame) => `${OUT}/${theme}-${frame}.png`;
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    for (const context of [desktop, mobile]) {
      await context.addInitScript((t) => window.localStorage.setItem('theme', t), theme);
    }

    // Home (desktop): the strip region (testimonials → footer), the
    // featured plates, and the desktop bar.
    const page = await desktop.newPage();
    await page.goto(`${LANDING}/`, { waitUntil: 'load' });
    await settle(page);
    const strips = await page.locator("[data-strip='call-visit']").count();
    expectThat('home: the emphasis strip', strips === (AFTER ? 0 : 1), `${strips} on the page`);
    const tailTop = await page
      .locator("[data-strip='testimonials']")
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({
      path: shot('home-tail'),
      fullPage: true,
      clip: { x: 0, y: tailTop, width: 1280, height: pageHeight - tailTop },
    });
    checkGradients('home featured', await placeholderGradients(page));
    await page.locator("[data-strip='featured']").screenshot({ path: shot('home-featured') });
    const desktopToggles = await toggles(page);
    expectThat(
      'desktop: exactly one visible toggle, in the bar',
      desktopToggles.filter((t) => t.visible && !t.inPanel).length === 1 &&
        desktopToggles.filter((t) => t.visible).length === 1,
      JSON.stringify(desktopToggles)
    );
    await page.screenshot({ path: shot('desktop-bar'), clip: { x: 0, y: 0, width: 1280, height: 72 } });

    // The other three CoverPanel surfaces (desktop).
    for (const [surface, path] of [
      ['packages', '/packages'],
      ['detail', `/packages/${coverless.slug}`],
      ['branches', '/branches'],
    ]) {
      await page.goto(`${LANDING}${path}`, { waitUntil: 'load' });
      await settle(page);
      checkGradients(surface, await placeholderGradients(page));
      await page.getByText(CAPTION).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: shot(surface) });
    }
    await page.close();

    // Mobile: the bar with the menu closed, then the open panel.
    const m = await mobile.newPage();
    await m.goto(`${LANDING}/`, { waitUntil: 'load' });
    await m.waitForTimeout(600);
    const closed = await toggles(m);
    expectThat(
      `mobile, menu closed: the bar toggle is ${AFTER ? 'hidden' : 'visible'}`,
      closed.filter((t) => t.visible).length === (AFTER ? 0 : 1),
      JSON.stringify(closed)
    );
    await m.screenshot({ path: shot('mobile-bar') });
    await m.getByRole('button', { name: 'Menu' }).click();
    await m.locator('.nav-panel[data-open]').waitFor();
    await m.waitForTimeout(400);
    const open = await toggles(m);
    expectThat(
      `mobile, menu open: ${AFTER ? 'one visible toggle, inside the panel' : 'no toggle inside the panel'}`,
      AFTER
        ? open.filter((t) => t.visible).length === 1 && open.some((t) => t.visible && t.inPanel)
        : open.every((t) => !t.inPanel),
      JSON.stringify(open)
    );
    await m.screenshot({ path: shot('mobile-menu') });
    if (AFTER) {
      const label = await m.evaluate(() =>
        [...document.querySelectorAll('.nav-panel span')].some((s) => s.textContent === 'Theme')
      );
      expectThat('mobile, menu open: the THEME label renders (source copy "Theme")', label);
      const darkBefore = await m.evaluate(() => document.documentElement.classList.contains('dark'));
      await m.locator('.nav-panel button[aria-label="Toggle theme"]').click();
      await m.waitForTimeout(400);
      const darkAfter = await m.evaluate(() => document.documentElement.classList.contains('dark'));
      const stillOpen = await m.locator('.nav-panel[data-open]').count();
      expectThat(
        'mobile: the panel toggle flips the theme and the panel stays open',
        darkAfter !== darkBefore && stillOpen === 1,
        `dark ${darkBefore} → ${darkAfter}, open panels ${stillOpen}`
      );
      await m.screenshot({ path: shot('mobile-menu-toggled') });
    }
    await desktop.close();
    await mobile.close();
  }
} finally {
  await browser.close();
}

// The contact sheet: before | after per frame, light first.
const rows = ['light', 'dark'].flatMap((theme) =>
  FRAMES.map((frame) => {
    const file = `${theme}-${frame}.png`;
    const cell = (label) =>
      existsSync(`${HERE}frames/${label}/${file}`)
        ? `<img src="frames/${label}/${file}" alt="${label} ${theme} ${frame}">`
        : '<p>—</p>';
    return `<tr><th>${theme} · ${frame}</th><td>${cell('before')}</td><td>${cell('after')}</td></tr>`;
  })
);
writeFileSync(
  `${HERE}index.html`,
  `<!doctype html><meta charset="utf-8"><title>#241 variants round</title><style>body{font:14px system-ui;margin:16px}table{border-collapse:collapse;width:100%}th{text-align:left;vertical-align:top;padding:8px 4px;width:11rem}td{width:44%;vertical-align:top;padding:4px}img{max-width:100%;border:1px solid #ccc}</style><h1>#241 — before (main) | after (the branch), light first</h1><table><tr><th></th><th>before</th><th>after</th></tr>${rows.join('')}</table>`
);

if (failures.length > 0) {
  console.error(`\n${failures.length} assertion(s) FAILED: ${failures.join(' · ')}`);
  process.exitCode = 1;
} else {
  console.log(`\nall ${LABEL} assertions passed — frames in ${OUT}, sheet at ${HERE}index.html`);
}
```

- [ ] **Step 2: Capture BEFORE (current main) on the local stack**

Start the stack in one shell (`pnpm --filter @sevendays/api dev` + `pnpm --filter @sevendays/landing dev` — the landing serves :3000). From the repo root:

```bash
node .superpowers/sdd/2026-11-09-241-landing-polish/capture.mjs before | tee .superpowers/sdd/2026-11-09-241-landing-polish/before.txt
```

Expected: every assertion PASSes with `[before]` (the strip renders exactly once, every placeholder wears the OLD three-stop ramp, the bar toggle is visible with the panel carrying none). Keep the stack running.

- [ ] **Step 3: Capture AFTER (the branch)**

With the Task 1+2 commits checked out (the dev server hot-reloads), same shell:

```bash
node .superpowers/sdd/2026-11-09-241-landing-polish/capture.mjs after | tee .superpowers/sdd/2026-11-09-241-landing-polish/after.txt
```

Expected: every assertion PASSes with `[after]` — `home: the emphasis strip — 0 on the page`; every surface `every placeholder wears the ruled ink→primary gradient`; `desktop: exactly one visible toggle, in the bar`; `mobile, menu closed: the bar toggle is hidden`; `mobile, menu open: one visible toggle, inside the panel` + the THEME label + `flips the theme and the panel stays open`. 18 AFTER frames + the contact sheet (`index.html` — before | after side by side, light first).

- [ ] **Step 4: The owner reacts — BLOCKING (light first, both themes)**

Present the contact sheet + both txt logs to the owner. The round judges: the strip's absence on home (the testimonials section now closes the page); the ink→petrol placeholder on all four surfaces; the menu's THEME row (label register, hairline, placement) + the emptied mobile bar; the desktop bar unchanged. Record the rulings verbatim in `.superpowers/sdd/2026-11-09-241-landing-polish/rulings.md`, dated. **Nothing merges until the owner reacts** (the standing wait-for-the-owner rule — the ticket's fourth AC).

- [ ] **Step 5: Apply any retunes (or skip)**

If the owner rules a retune (copy, tint, spacing): edit the owning Task 1 file, re-run Step 3 (the assertions that named the retuned bit update in the same commit — the script and the code never disagree), re-run `pnpm --filter @sevendays/landing fix && pnpm --filter @sevendays/landing test -- --run && pnpm --filter @sevendays/landing typecheck`, commit `chore(landing): the #241 variants round settled — <the ruling> (#241)`. If the owner accepts as-built: no commit — the rulings.md note IS the record.

- [ ] **Step 6: Clean up the planning dry-run scratch**

```bash
rm -rf .superpowers/sdd/_241-dryrun
```

(The planning session's BEFORE-mode dry run against the teaser — gitignored, but the evidence dir should start clean.)

### Task 4: The two-step baseline regen (teaser, deployed — never PR-gated)

The owner's 2026-11-09 ruling: the pre-existing teaser content drift (the 2026-11-08 nightly failed ALL 16 with +61px height drift on every surface + the home layout shift) is absorbed by a PRE-merge regen on main, so the POST-merge zero-diff isolates exactly the three rulings. All visual work runs on visual branches that merge AFTER the code PR — never on main.

**Files:**
- Modify (committed on `visual/241-content-drift`, then regenerated on `visual/241`): `e2e/visual/redesign.spec.ts-snapshots/*.png` (16 baselines)

**Interfaces:** consumes Task 1-3 (merged) + the teaser deployment; produces the zero-diff green (Task 5's AC evidence).

**Not here:** the e2e spec, the config, or the workflow (unchanged — the suite's structure already covers all three rulings); v1 baselines (ADR-0022: teaser-only forever); any local-server capture (deployed only); `git checkout <sha> -- <png>` (a baseline is born from a real capture — the #225 law).

- [ ] **Step 1: The PRE-merge regen — `visual/241-content-drift` (absorbs the content drift)**

With main clean and checked out (`git status` clean, `git switch main`):

```bash
git switch -c visual/241-content-drift
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev pnpm exec playwright test --update-snapshots=changed e2e/visual
```

Expected: `16 passed` — `--update-snapshots=changed` writes ONLY the drifted PNGs. Then eyeball every changed PNG (the README's law), and re-run the compare:

```bash
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev pnpm exec playwright test e2e/visual
```

Expected: `16 passed`, zero diffs. Record the changed-PNG list + the eyeball verdict per PNG in `.superpowers/sdd/2026-11-09-241-landing-polish/regen-pre.txt` (`git status --short e2e/` gives the list). Commit + push + PR titled `visual: absorb the teaser content drift into the 16 baselines (pre-#241) (#241)`; squash-merge BEFORE the code PR (the code PR's teaser deploy must land on re-baselined ground). Do NOT regen while the code PR is mid-merge.

- [ ] **Step 2: The code PR merges; the teaser redeploys**

Return to `feat/241-landing-polish`, finish Task 5's Steps 1-6 (check, walkthrough, docs, PR) if not already done, and squash-merge the code PR. The merge push triggers ci.yml's `Deploy teaser (main)` job — watch it complete:

```bash
gh run list --branch main --limit 1 --json databaseId,conclusion --jq '.[0] | "\(.databaseId) \(.conclusion)"'
```

Expected: conclusion `success` (the deploy job inside it green — `gh run view <id> --json jobs --jq '.jobs[].conclusion'`). The teaser now serves the three rulings.

- [ ] **Step 3: The POST-merge regen — `visual/241` (records the rulings)**

```bash
git switch main && git pull --ff-only
git switch -c visual/241
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev pnpm exec playwright test --update-snapshots=changed e2e/visual
```

Expected: `16 passed`; the changed set is exactly the surfaces the rulings touch — `home-light/dark` (strip gone + featured gradient + bar), `packages-index-light/dark`, `package-detail-light/dark`, `branches-light/dark` (the gradient), plus any surface the earlier drift step left unchanged only if the ruling reaches it (the menu row is BELOW the 1280px desktop capture's md breakpoint — the desktop baselines do NOT show it; `not-found` and `about`/`share-your-story` must be byte-identical — the control). Eyeball every changed PNG, re-run the compare (expect `16 passed`, zero diffs), record both in `.superpowers/sdd/2026-11-09-241-landing-polish/regen-post.txt`. Commit + push + PR titled `visual: the #241 rulings re-baselined — strip, ink→petrol placeholder, desktop bar (#241)`; squash-merge.

- [ ] **Step 4: The zero-diff proof on merged main**

```bash
git switch main && git pull --ff-only
E2E_BASE_URL=https://sevendays-landing.pahamajulius.workers.dev E2E_API_URL=https://sevendays-api.pahamajulius.workers.dev pnpm exec playwright test e2e/visual
```

Expected: `16 passed` — the ticket's fifth AC, green on merged main. (The next nightly inherits it — advisory, never a gate.)

### Task 5: Gates, the live walkthrough, docs rotation, the v1 SPLIT, issues, graphify

Runs BEFORE the Task 4 Steps 2-4 cycle completes around it: Steps 1-6 finish the code PR; Task 4 Step 2 then waits on that merge; the ticket closes after both PRs are merged (Step 7 assumes the visual PR's number exists — run it last).

**Files:**
- Modify: `docs/progress.md` (one dated entry, newest first), `AGENTS.md` (two pinned find/replace edits), this plan file (ticked boxes)
- Post-merge on main: `docs/agents/v1-picks.md` (one ledger row), `graphify-out/` (the graph update)

**Interfaces:** consumes Tasks 1-4; produces nothing code-facing.

**Not here:** any code change (a defect found below goes back to its owning task's file with its own fix commit, then this task re-runs from Step 1); `docs/plan.md` (M7 is closed; the post-flight carries no roadmap box — #239's disposition cuts tickets, not plan.md boxes); the three #223-stale `content-pages.mjs` checks (a new ticket — file it in Step 9).

- [ ] **Step 1: The full check**

```bash
pnpm check && pnpm build
```

Expected: green across the repo (lint + format + typecheck + test, then the 7-workspace build). Floors: landing 16 files / 123 tests; every other suite at AGENTS.md's recorded floors (this ticket touches none of them).

- [ ] **Step 2: The live walkthrough (controller step — the local stack, both themes)**

With the stack up (Task 3's shells), walk and capture to `.superpowers/sdd/2026-11-09-241-landing-polish/walkthrough/`: (1) home — the testimonials section closes the page, no `call-visit` band, footer reached directly; (2) `/packages` + one coverless detail + `/branches` — the ink→petrol gradient on every placeholder, light AND dark; (3) 390px — bar holds logo + CTA + menu only; the open panel's THEME row toggles the theme, panel stays open; (4) 1280px — the bar's toggle works, the panel trigger is gone; (5) `/services` — the closing strip STILL renders (the fence). Then run the CDP script — `chromium --remote-debugging-port=9222` against the dev landing, then `node apps/landing/scripts/verify/content-pages.mjs` (the harness's contract: `CDP_HTTP` at `http://127.0.0.1:9222`, `LANDING_VERIFY_URL` defaulting to `http://localhost:3000`): expect the rewritten home check PASSING and exactly the three pinned pre-existing failures (`home: teaser items deep-link /book?service=`, `home: ratified hero blurb visible`, `/services: one-line add-on cross-reference visible`) — anything else failing is this ticket's regression. Write `walkthrough.md` narrating each state.

- [ ] **Step 3: `docs/progress.md` — the dated entry (newest first, pinned)**

Insert as the first entry under `# Progress` (replace `2026-11-XX` with the docs commit's date):

```markdown
- **2026-11-XX — M7 post-flight T1, the landing polish (#241) — build complete, variants round owner-reacted, baselines regenerated two-step.** The three step-1 demo rulings (#239 items 1-3) landed on both editions: the home emphasis strip retired entirely (no component existed to retire — both instances were inline; the services closing strip stays, fenced); the CoverPanel placeholder re-graded brand ink → brand primary on every surface (featured plates, packages index, detail, branch strips — the initials + caption unchanged, AA held); and the theme toggle moved inside the MobileNav panel below md (the hairline THEME row under the CTA; the desktop bar keeps it at md+). The owner-reacted variants round ran over a dry-run-proven capture script (18 before/after frames, both themes, both viewports, DOM assertions per ruling); the 16 visual baselines regenerated two-step per the owner's 2026-11-09 ruling — the pre-merge regen absorbed the pre-existing teaser content drift (the 2026-11-08 nightly had failed all 16), the post-merge zero-diff isolates exactly the three rulings. `content-pages.mjs`'s home check carries the retirement (its three #223-stale checks pinned, fenced to a new ticket). Landing-only code + main-only script/e2e/docs; zero test change (landing floor 16 files / 123 tests).
```

- [ ] **Step 4: `AGENTS.md` — two pinned find/replace edits**

(a) In the Engineering Rules status paragraph (the dark-mode sentence), replace:

```text
the shared sun/moon toggle in the landing header + the admin topbar
```

with:

```text
the shared sun/moon toggle in the landing header (inside the mobile menu panel below md — the M7 post-flight #241) + the admin topbar
```

(b) In the same paragraph (the public-read sentence), replace:

```text
the CoverPanel rule (img on coverImageUrl, today's placeholder verbatim on null)
```

with:

```text
the CoverPanel rule (img on coverImageUrl, the initials placeholder on null — its gradient re-graded brand ink → primary by the M7 post-flight #241)
```

(Each find string occurs exactly once in main's AGENTS.md — counted this session. These are the two edits the Task 5b v1 resolution partially drops.)

- [ ] **Step 5: The docs commit**

Tick this plan's executed boxes (`- [✅]`), then:

```bash
git add docs/progress.md AGENTS.md docs/superpowers/plans/2026-11-09-241-landing-polish.md
git commit -m "docs(post-flight): #241 lands the landing polish - progress + AGENTS toggle/placeholder notes (#241)"
```

- [ ] **Step 6: The code PR + squash merge**

Push `feat/241-landing-polish`; open the PR against main titled `Post-flight T1 — landing polish: strip removal, placeholder gradient, mobile toggle (#241)`; body: the six ACs each answered with its evidence pointer — (1) `task-1-grep.txt` (strip copy 0, the services fence hit, the toggle sweep) + both editions via the Task 5b split; (2) `after.txt` (all four surfaces' gradient assertions, both themes); (3) `after.txt` (the bar/panel toggle assertions + the flip-and-stay-open); (4) `rulings.md` + the frames; (5) `regen-pre.txt` + `regen-post.txt` + the Step-4 zero-diff (the visual PR is sequenced after this merge per Task 4); (6) `pnpm check && pnpm build` green. Squash-merge. (Then Task 4 Steps 2-4 complete the baseline cycle.)

- [ ] **Step 7: The v1 SPLIT (per `docs/agents/v1-picks.md`)**

Run the path pass on the squash SHA:

```bash
node scripts/v1-triage.mjs <main-sha>
```

Expected: **SPLIT** — v1-paths: the eight `apps/landing/src/**` files + `AGENTS.md`; main-only, dropped: `content-pages.mjs`, the 16 baselines (this code PR carries none — Task 4's visual PR is the pure-SKIP twin below), the plan file, `docs/progress.md`. Execute per § Executing a SPLIT in the v1 checkout (`~/Projects/sevendays-v1-seed`, branch `v1`): `git cherry-pick -n <main-sha>` → `git rm` the main-only paths → resolve the two pinned conflicts EXACTLY as Global Constraints pin them — (1) `package-detail.tsx`: keep v1's Call-us prose, land the comment line as `// the ink→petrol placeholder when the row has no cover), a light panel carrying` replacing v1's `// the muted placeholder when the row has no cover), a light panel carrying`; (2) `AGENTS.md`: keep v1's content verbatim through the conflicted never-authorized tail, apply ONLY the toggle-sentence rewrite (the find string occurs exactly once on v1), DROP the CoverPanel-rule edit (the sentence does not exist on v1 — the content-drop class, #249 precedent) → the SPLIT commit with its `Split:` line → `pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build` → `pnpm check && pnpm build` → `node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed` (exit 0) → push → watch the run (the locks: `check` success, `Deploy v1 (private)` success, `Deploy teaser (main)` skipped) → live-curl the REAL v1 (`https://sevendays-v1-landing.sevendays-studio.workers.dev`: landing 200, `/book` 404, site-settings 200 — never the deleted `pahamajulius` ghosts). The Task 4 visual PR is a pure SKIP (all `e2e/` — main-only): record BOTH PRs in the one close-out ledger row (one row per PR is the runbook's law — the row names both). Append it on main, filling every bracketed value from the actual run:

```text
| <merge date> | #<code-PR> | `<main-sha>` | split | `<v1-sha>` | #241 — M7 post-flight T1, the landing polish: the home emphasis strip retired (services' fenced, stays), the CoverPanel placeholder ink→petrol, the theme toggle inside the mobile menu below md. Classifier SPLIT — <n> v1-paths (8 landing files + AGENTS.md) + <m> main-only (content-pages.mjs, the plan file, docs/progress.md); the visual PR #<visual-PR> is a pure SKIP (all e2e/, main-only — the two-step 16-baseline regen: pre-merge drift absorption + post-merge rulings). Two pinned v1 resolutions (package-detail comment; AGENTS toggle-sentence-only). Locks: <check/build/audit results>; run <run-id> green; live curl on the real v1 host |
```

```bash
git add docs/agents/v1-picks.md
git commit -m "docs(v1-picks): #<code-PR> ledger row - the #241 split + the visual PR skip (#241)"
```

- [ ] **Step 8: Issue closes**

Tick #241's six AC boxes in its body, then close it with the AC → evidence mapping:

```bash
gh issue view 241 --json body --jq .body | sed 's/^- \[ \]/- [✅]/' > /tmp/241-body.md
gh issue edit 241 --body-file /tmp/241-body.md
gh issue close 241 --comment "Landed in #<code-PR> (main <main-sha>, v1 split <v1-sha>; the baselines in #<visual-PR>). AC1 strip gone on both editions (task-1-grep + the split; no component existed to retire — inline sections; the services closing strip fenced, stays). AC2 the ruled ink→primary gradient on every CoverPanel surface (after.txt, both themes, all four surfaces). AC3 the toggle in the menu below md, the bar at md+ (after.txt — incl. the flip-and-stay-open). AC4 the variants round ran and the owner reacted (rulings.md + the frames). AC5 the 16 baselines regenerated two-step, zero-diff green on main (regen-pre/regen-post + the Step-4 run). AC6 pnpm check + pnpm build green. The content-pages.mjs #223-stale tail is filed as #<new-issue>."
gh issue comment 239 --body "Items 1, 2, 3 landed with #241 (PR #<code-PR>, main <main-sha>): the strip retired, the placeholder ink→petrol, the mobile menu toggle — plus the batch's variants round and the two-step 16-baseline regen."
```

- [ ] **Step 9: The `content-pages.mjs` stale-tail ticket + graphify**

File the fenced follow-up (the three pinned pre-existing failures — never "fixed" inside #241):

```bash
gh issue create --title "content-pages.mjs carries three #223-stale checks (add-ons cross-reference, teaser deep-links, hero blurb)" --label needs-triage --body "Parent #241 (pinned, fenced there). Three checks in apps/landing/scripts/verify/content-pages.mjs have failed since the #223 redesign: '/services: one-line add-on cross-reference visible' (the add-ons copy left with the ruled services rewrite), 'home: teaser items deep-link /book?service=' (home's service cards deep-link via search={{ service }} on home-cards.tsx:30 — no literal a[href^=\"/book?service=\"] matches), and 'home: ratified hero blurb visible' (drifts with any site-copy save — the check needs the settings-aware rewrite). Each is an edit the owner has not ruled: this ticket clarifies the intended assertions with the owner, then rewrites them. NOT #241's scope — pinned in its walkthrough evidence."
```

Then the graph (on main, after the ledger commit):

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): post-#241 graph update"
```
