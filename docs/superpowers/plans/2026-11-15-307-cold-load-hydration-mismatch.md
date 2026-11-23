# Ticket #307, Cold-load hydration mismatch, implementation plan

> **EXECUTION STOPPED, not reproducible (owner ruling 2026-11-15).** The cycle stopped at Task 2's evidence gate: two fresh local dev boots, 16 cold-load walks across 8 CMS routes, **zero race-class hydration messages** (machinery verified live, priming reads fired server-side at 1.4–1.8 s and stayed pending at the dehydrate snapshot, the designed streaming path). The #294 census's 4/4 was measured on the **deployed teaser** (its closing comment rode deploy runs 43680534774 + 43685882979; "prod-relevant on cold isolates"), an environment local dev boots cannot reproduce. The spike stands (the mismatch *vector* is library-real: settled-success entries hydrate synchronously on query-core 5.102.8); no fix code was written or merged. The lever evaluation + this plan are preserved for the follow-up investigation ticket; `scripts/probe-cold-hydration.mjs` (committed beside this plan) is its tool, `PROBE_BASE_URL` points it at any environment. The lever ruling comment: jeius/sevendays#307 issuecomment-6893467148. The census's incidental finding: #309 (dnd-kit `<div>` inside `<tbody>`, separate bug, filed).

**Goal:** A cold load of any CMS route stops hydrate-mismatching. Today the M8 loader-time priming (#288, spec D4) fires each screen's reads through **fire-and-forget** `queryClient.query()` thunks; when a prime settles between the SSR render and the dehydrate snapshot, the snapshot carries data the streamed HTML never rendered, the client's first render is the **loaded tree** against **skeleton HTML** (spike-proven: a settled-success entry hydrates with data synchronously on query-core 5.102.8), React logs `Hydration failed because the server rendered HTML didn't match the client`, and regenerates the whole tree client-side, a double render on every cold first-load per isolate plus one error into Sentry's errors-only capture each time. The fix keeps the ratified Warm/Cold contract's letter (a loader never blocks a **navigation**; hover-intent priming stays fire-and-forget client-side) and makes the SSR render and the client's first hydration render agree on cold loads. Ticket #307 (bug, ready-for-agent).

**Spec:** the #307 issue brief (the triage ask + Agent Brief in the issue body, it carries the mechanism trace, the candidate levers, the acceptance criteria, and the out-of-scope fences), plus `docs/specs/2026-11-14-m8-admin-cms-latency-spec.md` § D4 (the Warm/Cold contract the fix must not regress) and #288's plan (`docs/superpowers/plans/2026-11-15-m8-04-client-contract.md`), whose "SSR posture is behavior-neutral" Global Constraint this bug falsifies; the #307 record supersedes that claim. Executed against existing issue **#307**, no new execution issue.

**Architecture:** the picked lever is **client-only priming**, `primeCmsQueries` stays byte-identical (every existing seam pin survives untouched) and a new sibling seam `primeCmsQueriesForClient` carries the one new law (the server pass never primes; client-side it delegates fire-and-forget unchanged); the nine CMS route loaders swap to it (import + call-site + comment, one edit each). The screens' server-side `useQuery` then keeps the **pre-#288 streaming posture** (spike-proven race-free: a render-time fetch hydrates as a PENDING entry, skeleton-vs-skeleton, and its dehydrated promise streams the data in after first render, one read, no mismatch), which is the posture that ran M5→M8 through the owner demo without a mismatch report. Touched files: `apps/admin/src/lib/cms-queries.ts`, `apps/admin/src/lib/cms-queries.test.ts` (2 new tests), the nine route files `apps/admin/src/routes/_shell.branches.tsx`, `_shell.packages.index.tsx`, `_shell.packages.$packageId.edit.tsx`, `_shell.packages.new.tsx`, `_shell.studio-services.tsx`, `_shell.add-ons.tsx`, `_shell.lookups.tsx`, `_shell.gallery.tsx`, `_shell.testimonials.tsx`, `scripts/probe-cold-hydration.mjs` (new, the scripted probe), `docs/adr/0028-admin-ssr-priming-posture.md` (new), `docs/progress.md`, `AGENTS.md` (the admin floor line), this plan file. No `router.tsx`, no `_shell.tsx`, no api files, no api-client files, no `packages/types`, no db, no component files.

**Not UI-bearing (spec #94 amendment):** this ticket names no UI/UX skill set and renders no variants, zero pixels change. The Cold skeleton stays the screens' existing `isPending` vocabulary (confirmed, not rebuilt: every CMS screen already carries `isPending`/`isError` postures from `useQuery`, the same grep inventory #288's Task 3 used), and the fix changes only which pass starts a fetch. No new composition for the owner to react to.

## Global Constraints

- Branch `fix/307-cold-load-hydration-mismatch` off current `main` (at `849a4a3` or later). Per-task commits with the subjects pinned per task, each ending `(#307)`. The plan file rides the branch's first commit (the #285–#288 pattern).
- Gates: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green **35/35** with the floors byte-identical to the values this plan pins: **admin 30 files / 312** (the before-floor 30 files / 310, live-verified 2026-11-15, moves by exactly the 2 tests in `lib/cms-queries.test.ts`, enumerated in Task 3); **api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped**; types 18 files / 188; db 4 files (2 + 2 skipped) / 22 passed + 8 skipped; api-client 5 files / 45; landing 17 files / 134. A different moved count means the enumeration drifted: stop and reconcile against the test blocks, never by padding. (`pnpm build:packages` on a fresh clone, then `pnpm --filter @sevendays/api build`, before check, the shared client resolves the API's `AppType` from built `dist/`; this plan touches no route, so `AppType` is untouched, but the standard fresh-clone builds still run.)
- **Deploy through CI only.** The push to main fires `Deploy admin (sevendays-admin)` in the `Deploy teaser (main)` run, **that leg is the one this ticket's change rides**; the `Deploy api (sevendays-api)` leg also fires and must go green (it deploys unchanged code). **Never run any local bare `wrangler deploy`**, the #263/#264 lesson (it wipes the CI-passed `--var`s; the only restore is `gh run rerun <merge-run-id>`).
- **The lever pick, client-only priming, is the agent's delegated evaluation, recorded per the ticket's acceptance criterion, with an owner veto window (Task 1 posts it to #307; the PR does not merge until the owner has had the chance to rule).** The evaluation, on the spike + dist evidence:
  - **PICKED, client-only priming.** The server SSR pass never primes; the screens' server-side `useQuery` keeps the pre-#288 streaming posture. Why: (1) it eliminates the mismatch at the source, no server-side fetch starts early enough to settle in the race window; (2) zero TTFB cost, cold document loads keep streaming the skeleton immediately (the M8 exit gate just recorded a cold-median MISS on the episodic Supavisor connect tax; adding a read-chain wait to every cold document load would trade first-byte latency the owner fought hard over); (3) the Cold skeleton vocabulary is preserved exactly, the ticket's desired-behavior wording; (4) empirically precedented, the pre-#288 posture ran M5→M8 through the owner demo with zero mismatch reports; (5) minimal diff, the seam stays, one new sibling + nine one-line loader edits.
  - **EVALUATED, REJECTED, SSR awaited priming** (each loader awaits its primes server-side, fire-and-forget client-side; the shell's awaited site-settings prime is the in-repo precedent). Sound (loaded HTML ↔ loaded dehydrate ↔ loaded first render) and the better cold time-to-content, but every cold document load's TTFB grows by the route's read chain, serial after the shell's ~1 s settings await; the exit-gate walks measured 0.8–2.9 s per route on cold isolates (~3.5–4 s worst-case document wait), and it needs an awaited seam variant plus a server/client split in each of the nine loaders. **If the owner re-rules to this lever**, the re-shape is: replace `primeCmsQueriesForClient` with an awaited `settleCmsPrimes` (`await Promise.allSettled(primes.map((prime) => prime()))`) + each loader becomes `async` with the `typeof window === 'undefined'` split; Tasks 2/5–9 are unchanged, Task 3/4's code blocks swap.
  - **REJECTED, always-await** (await the primes on the client too): contract-violating, it blocks every hover-intent navigation on a cold read; the ticket rules it out unless the owner re-rules, and the re-rule would also invalidate the hover-prefetch gain D4 charters.
  - **REJECTED, dehydrate-filter-only** (exclude unsettled prime data from the snapshot): unsound, a prime settled by dehydrate time is a plain success entry, indistinguishable from legitimately rendered data (spike arm 1); no `shouldDehydrateQuery` filter can separate them, and forcing the render to skeleton too would mean never priming server-side anyway, which is the picked lever.
- **Live-probed pins (2026-11-15 @ current `main` `849a4a3`, read from the installed sources and the spike, not memory).** Do not "improve" any of these from memory; the pinned value is the probed value:
  - **The race machinery, read from the installed dist:** `@tanstack/router-ssr-query-core` 1.167.2's `setupCoreRouterSsrQueryIntegration` defaults `shouldDehydrateQuery` to `() => true` (every cache entry crosses, pending and errored included; plain `dehydrate()`'s success-only default does NOT apply), dehydrates after the initial pass into a **stream** (a cache subscription flushes later-settling queries mid-stream), and `@tanstack/query-core` 5.102.8's `dehydrateQuery` attaches the **in-flight promise** to pending entries; `hydrate()` restores a pending entry as pending (first render = skeleton) and calls `tryResolveSync(promise)`, whose `.then` only fires synchronously on the **wire serializer's** streaming promise, never on a native promise (spike arm 4).
  - **The mismatch vector, spike-proven (4/4 green, throwaway vitest in `apps/admin`, real `QueryClient` + `dehydrate`/`hydrate` with the integration's `() => true` filter):** (arm 1) a settled-success entry hydrates with data **synchronously**, the client's first render is the loaded tree, so any prime settling between the SSR render and the dehydrate snapshot mismatches against skeleton HTML; (arm 2) a pending entry hydrates **pending** and the data arrives via the streamed promise after first render, the race-free posture; (arm 3) a settled-error entry hydrates **error**, first render matches the server's error render; (arm 4) the sync-promise path is wire-only (in memory a settled promise still hydrates pending, riding `query.fetch({ initialPromise })`).
  - **The #288 constraint this supersedes:** #288's plan pinned "SSR posture is behavior-neutral: … the dehydrate/hydrate flow keeps its shape", falsified. The render-time `useQuery` does join the in-flight prime (one fetch), but the render shows PENDING while the prime's settle in the render→dehydrate window lands in the snapshot as settled success, the exact mismatch. #307's record replaces that claim.
  - **The shell's prime is awaited by construction** (`_shell.tsx` loader: `await queryClient.query({ ...siteSettingsQuery.all(), staleTime: 'static' }).catch(() => undefined)`, the #289 migration): it settles before render, so it never races, the shell is not part of this bug and is not touched.
  - **Versions pinned:** `@tanstack/react-query` 5.102.8, `@tanstack/query-core` 5.102.8, `@tanstack/react-router` 1.170.41, `@tanstack/react-start` 1.168.60, `@tanstack/react-router-ssr-query` 1.167.2, `@playwright/test` 1.63.0 (all probed in `pnpm-lock.yaml`/installed dists 2026-11-15).
  - **The nine loaders are the whole touch surface** (grep-verified 2026-11-15): all nine import `{ cmsRoutePriming, primeCmsQueries }` from `#/lib/cms-queries` and call `primeCmsQueries(cmsRoutePriming.<list>(queryClient))` (the edit route passes `params.packageId`); the shell primes site-settings itself; the settings route has no priming loader; Analytics/Audit/Users have none (spec D4). `cmsRoutePriming`'s lists and every factory option are pinned by `cms-queries.test.ts` and stay byte-identical.
  - **Plain-node vitest has no `window`**, the admin lib tests run in node, so the new seam's server branch (the no-op) is the directly-testable arm, and the client arm is tested through `vi.stubGlobal('window', {})` + `vi.unstubAllGlobals()` in a try/finally.
- **Local-stack facts for the probe (the #294/#306 walk posture):** the admin dev server pins **:3000** (never run the landing dev concurrently, both apps pin :3000, serial only); the api dev runs on **:8787** (`apps/api/wrangler.toml`) and must be up first, the admin's CMS reads need it; the admin's `.env.local` DB is the **live pooler**, the probe is read-only GETs (acceptable; the walks did the same, no isolation needed, never write). Login selectors: one card, two modes, `#login-email` + `#login-password` + the submit button exist only in the sign-in mode. Chromium prerequisite: `pnpm exec playwright install chromium` (cached if the e2e foundation ran).
- **No secret ever committed:** `ADMIN_EMAIL`/`ADMIN_PASSWORD` are supplied at probe invocation only (the Task-1 owner ask offers both options, env creds in the command line, or a 5-minute `--pause-for-login` interactive run). They never enter a file, a script default, or a commit.
- **The probe script is main-side tooling, outside every suite**, never part of `pnpm check`, never part of `test:e2e` (ADR-0022; commit-green and smoke-green stay separate verdicts). The v1 seed clone has no `scripts/` directory (verified 2026-11-15), so the script classifies main-only at the v1 triage.
- **AGENTS.md's admin floor line IS updated by this ticket** (30 files / 310 → 30 files / 312 + the #307 pin mention), the line is current since #289's closeout; no fencing this time.
- **The after-verification is HITL (Task 8):** the owner performs the devtools walk on the deployed teaser admin (never ask for credentials beyond the Task-1 ask, never assume while the owner may be AFK). If the owner is unavailable after Task 7, post nothing, leave #307 open naming the pending walk, and stop, do not self-serve the verification. The warm-render and hover-intent arms are TanStack Query/Router semantics by construction (spike-pinned); the walk is their operational evidence, exactly the #287/#288 pattern.
- **Warm/Cold contract re-verification (acceptance 3) is structural + operational:** the factories' options are byte-unchanged (the existing staleness/keys pins still pass, proof the Warm render path is untouched), the new seam pin proves the client-side delegation, and the Task-8 walk re-runs the #288 three arms on Branches (hover fires the read; warm revisit within 5 min renders with zero refetches; past 5 min exactly one background refetch).

### Not here

- **No `router.tsx` edits**, the integration wiring, `defaultPreload: 'intent'`, `defaultPreloadStaleTime: 0`, the global `staleTime: 60_000` + `refetchOnReconnect: false` stay; no `dehydrateOptions`/`shouldDehydrateQuery` configuration is added (the integration's `() => true` default is load-bearing for the pre-#288 streaming posture, pending entries must cross for the skeleton→data path).
- **No `_shell.tsx` edits**, the awaited site-settings prime is the SSR brand posture (M7 #223: the sidebar wordmark renders server-side) and settles before render by construction; it cannot race.
- **No api changes of any kind; no api-client changes; no `packages/types`, db, schema, or `AppType` change**, the read shapes, keys, and staleness are existing behavior.
- **No component edits**, the screens' `useQuery` calls, pending/error vocabulary, and optimistic flows are existing behavior; zero `src/components/**` files appear in any diff.
- **No Analytics dashboard, Audit Log, Users-tab, or appointments work**, outside the priming scope (spec D4); the Users tab's hardcoded `['admin', 'users']` keys stay the accepted DB-direct residual.
- **No component/DOM tests** (house rule), the seam tests assert thunk calls only; the route loaders are verified by typecheck + grep + the operational probe/walk.
- **No ADR-0025 amendment**, the read-cache ADR is unrelated (api-side edge caching); the SSR-posture ruling gets its own **ADR-0028** (next free number, `docs/adr/` ends at 0027, verified 2026-11-15; the ticket's acceptance names "an ADR amendment to ADR-0025's neighbor or the progress bullet per house convention", a new ADR is the house convention for a nontrivial architectural ruling, and this one has a rejected-alternatives record worth keeping).
- **No `docs/plan.md` edits**, #307 has no plan.md box (post-M8 bug ticket); the M8 boxes flipped at #289.
- **No visual baselines, no `e2e/` edits** (`e2e/visual/` is landing-only; the probe script lives in `scripts/`, not the Playwright suite).
- `graphify update .` **is** needed at close (code symbols change, Task 8).

---

### Task 1: branch + plan commit + the lever ruling posted to #307

**Files:**
- Commit: this plan file (the branch's first commit)

**Interfaces:**
- Produces: the ruling comment on #307 (the owner's veto window opens; Tasks 2–9 proceed and the PR in Task 7 does not merge until the owner has had the chance to rule, an AFK owner pauses only Task 8's walk, per the Global Constraints HITL rule).

- [ ] **Step 1: branch + plan commit**

  ```bash
  git checkout main && git pull --ff-only && git checkout -b fix/307-cold-load-hydration-mismatch
  git add docs/superpowers/plans/2026-11-15-307-cold-load-hydration-mismatch.md
  git commit -m "docs: the #307 cold-load hydration mismatch implementation plan (#307)"
  ```

- [ ] **Step 2: post the lever ruling to #307**

  Post one comment on #307 with `gh issue comment 307 --body-file /tmp/307-ruling.md` (write the file first; delete it after). The comment contains, in this order:
  1. The picked lever (**client-only priming**) with the five-point why, copied from the Global Constraints' lever block.
  2. The evaluated-and-rejected alternatives (SSR awaited priming with its TTFB trade; always-await; dehydrate-filter-only), one line each, so the owner can re-rule with the full record in view.
  3. The spike evidence in two sentences: a throwaway vitest in `apps/admin` proved on query-core 5.102.8 that a settled-success cache entry hydrates with data synchronously (the mismatch vector) while a pending entry hydrates as a skeleton and streams its data in after first render (the race-free posture the fix restores).
  4. The ask, stated as options: **(a)** supply dev-stack staff credentials for the probe (env-only, never committed), or **(b)** 5 minutes at the Task-2/6 probe runs for an interactive login walk, the script's headed mode (`PROBE_HEADED=1`, no `ADMIN_*` set): a visible browser opens `/login`, the owner signs in within `PROBE_LOGIN_TIMEOUT_MS` (default 180000 headed), and the walk continues unattended, or **(c)** a veto of the lever pick (the PR waits for the ruling either way).
  5. The blocking rule: **if neither (a) nor (b) has been answered, Task 2 blocks at its probe step and nothing after it runs**, the wait-for-owner-answers rule; the before-state must be evidenced before any fix code lands.

- [ ] **Step 3: nothing else in this task**, the ruling is posted; the veto window is open; Task 2 starts the moment the owner answers (a) or (b), or when the owner's prior standing instruction covers it.

### Task 2: the cold-load probe script + the BEFORE arm (the mismatch census)

**Files:**
- Create: `scripts/probe-cold-hydration.mjs`
- Test: none (main-side tooling, outside every suite by ADR-0022; its verification is the run itself)

**Interfaces:**
- Consumes: the local dev stack (api dev :8787, admin dev :3000), the owner-supplied `ADMIN_EMAIL`/`ADMIN_PASSWORD` (or the interactive pause).
- Produces: the BEFORE census (per-route hydration-class message counts + quoted texts) recorded in the cycle notes, the evidence comment in Task 8 quotes it; `scripts/probe-cold-hydration.mjs` is reused byte-identically by Task 6's AFTER arm.

- [ ] **Step 1: write the probe script**

  ```js
  // #307, the cold-load hydration-mismatch probe. Walks the admin's CMS
  // routes as fresh document loads (each page.goto is a new document: fresh
  // JS context, fresh query cache, the cold-load shape) and counts
  // browser-console RACE-class hydration messages per route (the DOM-nesting
  // class is counted separately, see the census-amendment note in the walk
  // loop). Main-side tooling only, never part of pnpm check or test:e2e
  // (ADR-0022).
  //
  // Usage:
  //   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/probe-cold-hydration.mjs
  //   (credentials are supplied at invocation, never committed;
  //    PROBE_BASE_URL defaults to http://localhost:3000; PROBE_ROUTES is a
  //    comma list defaulting to the eight parameterless CMS routes;
  //    PROBE_HEADED=1 opens a visible browser, leave ADMIN_* unset and sign
  //    in yourself within PROBE_LOGIN_TIMEOUT_MS, default 180000 headed)
  // Prereq: `pnpm exec playwright install chromium`; the local dev stack up
  // and freshly booted (api dev on :8787 first, then admin dev on :3000);
  // the BEFORE/AFTER arms compare boots, so restart the stack between arms.
  import { chromium } from '@playwright/test';

  const base = process.env.PROBE_BASE_URL ?? 'http://localhost:3000';
  const routes = (
    process.env.PROBE_ROUTES ??
    '/branches,/packages,/packages/new,/studio-services,/add-ons,/lookups,/gallery,/testimonials'
  ).split(',');
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const headed = process.env.PROBE_HEADED === '1';
  const loginTimeout = Number(process.env.PROBE_LOGIN_TIMEOUT_MS ?? (headed ? 180_000 : 30_000));
  if (!headed && (!email || !password)) {
    console.error(
      'ADMIN_EMAIL and ADMIN_PASSWORD are required headless (supplied at invocation, never committed), or run PROBE_HEADED=1 to sign in yourself.',
    );
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage();
  const hydrationByRoute = {};
  const nestingByRoute = {};
  let walked = 0;

  try {
    // Sign in through the real form, one card, two modes; the sign-in mode
    // carries #login-email/#login-password. Headless fills the fields; headed
    // waits for the owner. This also exercises the #306 guard: the submit
    // lands post-hydration, where it is inert.
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    if (email && password) {
      await page.fill('#login-email', email);
      await page.fill('#login-password', password);
      await page.press('#login-password', 'Enter');
    }
    await page.waitForSelector('[data-shell-main]', { timeout: loginTimeout });

    for (const route of routes) {
      const bucket = [];
      const nesting = [];
      const onConsole = (message) => {
        const text = message.text();
        // Two classes, counted separately (the #307 census amendment): the
        // RACE class is text/attribute mismatches, "Hydration failed …" /
        // "A tree hydrated but …". The DOM-nesting class ("<div> cannot be
        // a child of <tbody> … This will cause a hydration error.") is a
        // separate pre-existing bug (dnd-kit's Accessibility described-by
        // div inside the testimonials sortable tbody, filed apart) that
        // must neither mask nor fake either probe arm.
        if (/cannot be a child of/.test(text)) nesting.push(text);
        else if (/hydrat/i.test(text)) bucket.push(text);
      };
      page.on('console', onConsole);
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-shell-main]', { timeout: 30_000 });
      await page.waitForTimeout(1500); // hydration + any regeneration settles
      page.off('console', onConsole);
      hydrationByRoute[route] = bucket;
      nestingByRoute[route] = nesting;
      walked += 1;
      console.log(`${route}: ${bucket.length} race-class message(s), ${nesting.length} DOM-nesting message(s)`);
      for (const text of bucket) console.log(`    [race] ${text.slice(0, 300)}`);
      for (const text of nesting) console.log(`    [nesting] ${text.slice(0, 200)}`);
    }
  } finally {
    await browser.close();
  }

  const total = Object.values(hydrationByRoute).flat().length;
  const nestingTotal = Object.values(nestingByRoute).flat().length;
  console.log(JSON.stringify({ walked, total, nestingTotal, routes: hydrationByRoute, nesting: nestingByRoute }, null, 2));
  if (walked !== routes.length) process.exit(1);
  ```

- [ ] **Step 2: install chromium (cached if the e2e foundation ran)**

  Run: `pnpm exec playwright install chromium`
  Expected: no-op or a quick install (the 1.63.0 browser build).

- [ ] **Step 3: boot the stack fresh (the serial rule)**

  ```bash
  pnpm --filter @sevendays/api dev &
  # wait for :8787, poll /health until it answers before starting the admin:
  until curl -sf http://localhost:8787/health > /dev/null 2>&1; do sleep 1; done
  pnpm --filter @sevendays/admin dev &
  until curl -sf http://localhost:3000/ > /dev/null 2>&1; do sleep 1; done
  ```

  Run both dev servers in background shells (they stay up through Step 4 and are killed in Step 5, the landing dev must NOT run concurrently: both apps pin :3000).

- [ ] **Step 4: run the BEFORE arm**

  ```bash
  ADMIN_EMAIL=<from the Task-1 thread> ADMIN_PASSWORD=<same> node scripts/probe-cold-hydration.mjs
  ```

  Expected: the JSON verdict reports `total ≥ 1`, at least one probed route carries **race-class** console messages (`Hydration failed because the server rendered HTML didn't match the client` or React 19's `A tree hydrated but …` form, NOT the DOM-nesting class, which is counted separately and never counts toward `total`). The #294 census measured 4/4 cold loads erroring on this stack, so a **zero** race-class total here means the race did not reproduce this boot: check the stack really booted fresh (Step 3's servers are new processes) and the reads are hitting the live pooler (the api dev logs read events), re-boot once, and only then record the miss honestly, do not proceed to the fix on an unreproduced before-state. Record the full per-route JSON + the quoted message texts in the cycle notes (`.superpowers/sdd/2026-11-15-307-cold-load-hydration-mismatch/notes.md`, create the file if absent); this census is Task 8's evidence-comment BEFORE half.

- [ ] **Step 5: stop the dev servers + commit the script**

  Kill both background dev servers (free :3000, the serial rule). Then:

  ```bash
  git add scripts/probe-cold-hydration.mjs
  git commit -m "chore(scripts): the #307 cold-load hydration-mismatch probe (#307)"
  ```

---

### Task 3: the seam, `primeCmsQueriesForClient` (TDD)

**Files:**
- Modify: `apps/admin/src/lib/cms-queries.ts` (one new export after `primeCmsQueries`)
- Test: `apps/admin/src/lib/cms-queries.test.ts` (2 new tests, appended after the existing `primeCmsQueries` describe block)

**Interfaces:**
- Consumes: `primeCmsQueries(primes: ReadonlyArray<() => Promise<unknown>>): void`, byte-identical, untouched.
- Produces: `primeCmsQueriesForClient(primes: ReadonlyArray<() => Promise<unknown>>): void`, the nine loaders (Task 4) call exactly this signature; the admin floor moves 30 files / 310 → **30 files / 312** (exactly these 2 tests).

- [ ] **Step 1: write the failing tests**

  In `apps/admin/src/lib/cms-queries.test.ts`, first add the import (the named-import list is biome-sorted case-insensitively, `primeCmsQueriesForClient` slots between `primeCmsQueries` and `siteSettingsQuery`):

  ```ts
  import {
    adminAddonQueries,
    adminBranchQueries,
    adminGalleryQueries,
    adminLookupQueries,
    adminPackageQueries,
    adminStudioServiceQueries,
    adminTestimonialQueries,
    adminTestimonialSubmissionQueries,
    CMS_STALENESS_MS,
    cmsRoutePriming,
    primeCmsQueries,
    primeCmsQueriesForClient,
    siteSettingsQuery,
  } from './cms-queries';
  ```

  Then append the new describe block at file end (after the existing `primeCmsQueries` describe's closing `});`):

  ```ts
  describe('primeCmsQueriesForClient, the server pass never primes (#307)', () => {
    it('no-ops when window is undefined, the SSR pass never starts a prime', () => {
      // Plain-node runs with window undefined, this test IS the SSR posture.
      const prime = vi.fn(async () => undefined);
      primeCmsQueriesForClient([prime]);
      expect(prime).not.toHaveBeenCalled();
    });

    it('delegates fire-and-forget client-side, the hover-intent law is unchanged', () => {
      vi.stubGlobal('window', {});
      try {
        const primes = [vi.fn(async () => undefined), vi.fn(async () => undefined)];
        primeCmsQueriesForClient(primes);
        expect(primes[0]).toHaveBeenCalledTimes(1);
        expect(primes[1]).toHaveBeenCalledTimes(1);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
  ```

- [ ] **Step 2: run the tests to verify they fail**

  Run: `pnpm --filter @sevendays/admin exec vitest run src/lib/cms-queries.test.ts`
  Expected: FAIL, the suite errors on the missing export (`SyntaxError: ... does not provide an export named 'primeCmsQueriesForClient'` or the TS-equivalent resolution failure).

- [ ] **Step 3: write the implementation**

  In `apps/admin/src/lib/cms-queries.ts`, insert directly after the `primeCmsQueries` function's closing brace (before the `// The per-route priming lists:` comment block):

  ```ts
  // The #307 law: the server pass never primes. A prime fired on the server
  // can settle between the SSR render and the dehydrate snapshot, the
  // snapshot then carries settled-success data the streamed HTML never
  // rendered, and the client's first render hydrates the loaded tree against
  // skeleton HTML (spike-proven on query-core 5.102.8: settled entries
  // hydrate synchronously; pending entries hydrate as skeletons and stream
  // their data in after first render). The screens' server-side useQuery
  // keeps the pre-#288 streaming posture instead: the render-time fetch
  // hydrates pending (skeleton-vs-skeleton) and its dehydrated promise
  // delivers the data after first render, one read, no mismatch.
  // Client-side the fire-and-forget law is unchanged: the hover-intent
  // prime still starts the fetch before the click.
  export function primeCmsQueriesForClient(primes: ReadonlyArray<() => Promise<unknown>>): void {
    if (typeof window === 'undefined') return;
    primeCmsQueries(primes);
  }
  ```

  `primeCmsQueries` and every factory/`cmsRoutePriming` list above it stay byte-identical.

- [ ] **Step 4: run the tests to verify they pass + the floor**

  ```bash
  pnpm --filter @sevendays/admin exec vitest run src/lib/cms-queries.test.ts
  pnpm --filter @sevendays/admin exec vitest run --silent 2>&1 | tail -3
  ```

  Expected: the seam file passes (the 6 existing pins + the 2 new); the admin floor reads **30 files / 312 tests**, byte-identical except the +2.

- [ ] **Step 5: commit**

  ```bash
  git add apps/admin/src/lib/cms-queries.ts apps/admin/src/lib/cms-queries.test.ts
  git commit -m "feat(admin): the client-only priming seam (#307)"
  ```

### Task 4: the nine route loaders swap to the client-only seam

**Files:**
- Modify: `apps/admin/src/routes/_shell.branches.tsx`, `_shell.packages.index.tsx`, `_shell.packages.$packageId.edit.tsx`, `_shell.packages.new.tsx`, `_shell.studio-services.tsx`, `_shell.add-ons.tsx`, `_shell.lookups.tsx`, `_shell.gallery.tsx`, `_shell.testimonials.tsx`

**Interfaces:**
- Consumes: `primeCmsQueriesForClient(primes: ReadonlyArray<() => Promise<unknown>>): void` (Task 3).
- Produces: zero route-level `primeCmsQueries(` call sites (verified by the grep below); `cmsRoutePriming`'s lists untouched; every loader keeps its synchronous (non-async) shape, the client-side call is fire-and-forget as today, the server-side call is the seam's no-op.

- [ ] **Step 1: per-route edits (two per file, the import line, then the loader block)**

  Each file gets the same import edit (each file edited separately, so the identical old string is unique per file):

  ```ts
  // OLD (all nine files):
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';
  // NEW:
  import { cmsRoutePriming, primeCmsQueriesForClient } from '#/lib/cms-queries';
  ```

  Then the loader block, with each route's pinned flavor comment kept and the law clause appended. Exact old → new per route:

  **`_shell.branches.tsx`:**
  ```ts
  // OLD:
    // M8 #288: hover-intent priming, fire-and-forget, never blocks
    // (the cms-queries seam carries the law).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.branches(queryClient));
    },
  // NEW:
    // M8 #288: hover-intent priming, fire-and-forget, never blocks;
    // #307: client-only, the server pass never primes (both laws live
    // in the cms-queries seam).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueriesForClient(cmsRoutePriming.branches(queryClient));
    },
  ```

  **`_shell.packages.index.tsx`:**
  ```ts
  // OLD:
    // M8 #288: hover-intent priming, fire-and-forget, never blocks
    // (the cms-queries seam carries the law).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.packagesIndex(queryClient));
    },
  // NEW:
    // M8 #288: hover-intent priming, fire-and-forget, never blocks;
    // #307: client-only, the server pass never primes (both laws live
    // in the cms-queries seam).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueriesForClient(cmsRoutePriming.packagesIndex(queryClient));
    },
  ```

  **`_shell.packages.$packageId.edit.tsx`:**
  ```ts
  // OLD:
    // M8 #288: hover-intent priming, the byId read + both lookups start
    // while the edit link is hovered (fire-and-forget, never blocks).
    loader: ({ context: { queryClient }, params }) => {
      primeCmsQueries(cmsRoutePriming.packageEdit(queryClient, params.packageId));
    },
  // NEW:
    // M8 #288: hover-intent priming, the byId read + both lookups start
    // while the edit link is hovered (fire-and-forget, never blocks);
    // #307: client-only, the server pass never primes (both laws live
    // in the cms-queries seam).
    loader: ({ context: { queryClient }, params }) => {
      primeCmsQueriesForClient(cmsRoutePriming.packageEdit(queryClient, params.packageId));
    },
  ```

  **`_shell.packages.new.tsx`:**
  ```ts
  // OLD:
    // M8 #288: hover-intent priming, create mode loads the lookups only
    // (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.packageNew(queryClient));
    },
  // NEW:
    // M8 #288: hover-intent priming, create mode loads the lookups only
    // (fire-and-forget, never blocks); #307: client-only, the server
    // pass never primes (both laws live in the cms-queries seam).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueriesForClient(cmsRoutePriming.packageNew(queryClient));
    },
  ```

  **`_shell.studio-services.tsx`:**
  ```ts
  // OLD:
    // M8 #288: hover-intent priming, the screen's reads + the branch
    // badges (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.studioServices(queryClient));
    },
  // NEW:
    // M8 #288: hover-intent priming, the screen's reads + the branch
    // badges (fire-and-forget, never blocks); #307: client-only, the
    // server pass never primes (both laws live in the cms-queries seam).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueriesForClient(cmsRoutePriming.studioServices(queryClient));
    },
  ```

  **`_shell.add-ons.tsx`:**
  ```ts
  // OLD:
    // M8 #288: hover-intent priming, the screen's reads + the service
    // badges (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.addOns(queryClient));
    },
  // NEW:
    // M8 #288: hover-intent priming, the screen's reads + the service
    // badges (fire-and-forget, never blocks); #307: client-only, the
    // server pass never primes (both laws live in the cms-queries seam).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueriesForClient(cmsRoutePriming.addOns(queryClient));
    },
  ```

  **`_shell.lookups.tsx`:**
  ```ts
  // OLD:
    // M8 #288: hover-intent priming, both lookup lists
    // (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.lookups(queryClient));
    },
  // NEW:
    // M8 #288: hover-intent priming, both lookup lists (fire-and-forget,
    // never blocks); #307: client-only, the server pass never primes
    // (both laws live in the cms-queries seam).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueriesForClient(cmsRoutePriming.lookups(queryClient));
    },
  ```

  **`_shell.gallery.tsx`:**
  ```ts
  // OLD:
    // M8 #288: hover-intent priming, the photos + categories reads
    // (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.gallery(queryClient));
    },
  // NEW:
    // M8 #288: hover-intent priming, the photos + categories reads
    // (fire-and-forget, never blocks); #307: client-only, the server
    // pass never primes (both laws live in the cms-queries seam).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueriesForClient(cmsRoutePriming.gallery(queryClient));
    },
  ```

  **`_shell.testimonials.tsx`:**
  ```ts
  // OLD:
    // M8 #288: hover-intent priming, the testimonials rows + the
    // submissions queue (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.testimonials(queryClient));
    },
  // NEW:
    // M8 #288: hover-intent priming, the testimonials rows + the
    // submissions queue (fire-and-forget, never blocks); #307:
    // client-only, the server pass never primes (both laws live in
    // the cms-queries seam).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueriesForClient(cmsRoutePriming.testimonials(queryClient));
    },
  ```

- [ ] **Step 2: verify no route-level fire-and-forget call remains + typecheck**

  ```bash
  grep -rn "primeCmsQueries(" apps/admin/src/routes/ ; echo "exit=$?"
  pnpm --filter @sevendays/admin typecheck
  ```

  Expected: the grep finds **zero** matches (exit=1, the seam's internal call and the tests live outside `routes/`); typecheck green.

- [ ] **Step 3: the admin suite stays at its floor**

  Run: `pnpm --filter @sevendays/admin exec vitest run --silent 2>&1 | tail -3`
  Expected: **30 files / 312 tests** (no test touches the route files).

- [ ] **Step 4: commit**

  ```bash
  git add apps/admin/src/routes/_shell.branches.tsx apps/admin/src/routes/_shell.packages.index.tsx "apps/admin/src/routes/_shell.packages.\$packageId.edit.tsx" apps/admin/src/routes/_shell.packages.new.tsx apps/admin/src/routes/_shell.studio-services.tsx apps/admin/src/routes/_shell.add-ons.tsx apps/admin/src/routes/_shell.lookups.tsx apps/admin/src/routes/_shell.gallery.tsx apps/admin/src/routes/_shell.testimonials.tsx
  git commit -m "refactor(admin): the CMS loaders prime client-side only (#307)"
  ```

---

### Task 5: ADR-0028 + the progress bullet + the AGENTS.md floor line

**Files:**
- Create: `docs/adr/0028-admin-ssr-priming-posture.md`
- Modify: `docs/progress.md` (one new first dated bullet), `AGENTS.md` (the admin floor line, both edits exact strings below)

**Interfaces:**
- Produces: ADR-0028, the canonical record of the SSR-posture ruling (the fix site's comment in Task 3 points its law here implicitly; the ADR names the superseded #288 claim); the AGENTS.md admin floor line reads **30 files / 312**.

- [ ] **Step 1: write ADR-0028 verbatim**

  ```markdown
  # ADR-0028: Admin SSR priming posture, the server pass never primes

  ## Status

  Accepted (2026-11-15, #307)

  ## Context

  The M8 client contract (spec D4, #288) gave every CMS route loader-time cache priming through fire-and-forget `queryClient.query()` thunks (`primeCmsQueries` + `cmsRoutePriming`). Route loaders run on the server during SSR too, so a cold document load starts the screen's reads server-side before the render. #307 traced the resulting race: the SSR query integration (`@tanstack/router-ssr-query-core`) dehydrates the whole query cache, default filter `() => true`, including in-flight pending entries, which cross carrying their promise, after the render begins. A prime that settles between the SSR render and the dehydrate snapshot crosses as a **settled-success** entry; on the client, `hydrate()` restores it with data synchronously (spike-proven on query-core 5.102.8), so the first client render is the loaded tree while the streamed HTML rendered the pending skeleton → React logs the hydration mismatch and regenerates the whole tree client-side, a double render on every cold first-load per isolate plus one error into Sentry's errors-only capture. The #294 walk census measured 4/4 cold loads erroring, 0 warm loads; `main` carried the same race.

  The shell's own site-settings prime is awaited by construction (M7 #223 brand posture) and cannot race; the race is exclusively the nine fire-and-forget route primes.

  ## Decision

  **The server pass never primes (client-only priming).** `primeCmsQueriesForClient` guards the existing fire-and-forget seam on `typeof window === 'undefined'` and the nine CMS route loaders call it; the SSR pass runs no priming fetch at all. The screens' server-side `useQuery` keeps the **pre-#288 streaming posture**: the render-time fetch starts during render, hydrates as a PENDING entry (skeleton HTML ↔ skeleton first render), and its dehydrated promise streams the data into the client after first render, one read, no mismatch.

  Client-side behavior is byte-unchanged: hover-intent priming stays fire-and-forget through the same `primeCmsQueries` law, the Warm Navigation contract (5-minute staleness, zero requests within the window) is untouched, and `cmsRoutePriming`'s lists and the factories' options are pinned byte-identical by `cms-queries.test.ts`.

  ## Alternatives considered

  - **SSR awaited priming**, each loader awaits its primes server-side (fire-and-forget client-side; the shell's awaited prime is the precedent). Sound and content-first (loaded HTML ↔ loaded dehydrate ↔ loaded first render, zero client refetch), but every cold document load's TTFB grows by the route's read chain, serial after the shell's ~1 s settings await; the M8 exit-gate walks measured 0.8–2.9 s per route on cold isolates (~3.5–4 s worst-case document wait), adding to the episodic Supavisor connect tax the exit gate just recorded as a miss. Held as the alternative if a future owner ruling prefers content-first cold loads.
  - **Always-await**, awaiting on the client too: blocks every hover-intent navigation on a cold read; violates the ratified Warm/Cold contract's navigation law (spec D4). Rejected.
  - **Dehydrate-filter-only**, excluding "unsettled" prime data from the snapshot: unsound; a prime settled by dehydrate time is a plain success entry indistinguishable from legitimately rendered data (no `shouldDehydrateQuery` filter can separate them), and forcing the render to skeleton too would mean never priming server-side, which is this ADR's decision.

  ## Consequences

  - Cold document loads keep the pre-#288 shape: skeleton HTML immediately, data streaming in through the dehydrated promise, no hydration mismatch, no double render, no Sentry noise from the race.
  - The Cold skeleton (`isPending`) vocabulary is preserved everywhere it appears; the Warm/Cold contract's letter (a loader never blocks a navigation) holds unchanged.
  - `#288`'s plan constraint "SSR posture is behavior-neutral" is falsified by this record and superseded: the render-time join is real, but the prime's early start widened the settle window into the snapshot, the posture is only neutral when the fetch starts at render time.
  - The residual (pre-existing, accepted): a server-side render-time fetch that settled within the HTML transit window could in principle sync-hydrate (the wire serializer's streaming promise); reads take longer than transit in every observed environment, and this is the posture that ran M5→M8 without a mismatch report.
  ```

- [ ] **Step 2: the progress bullet**

  Insert as the new first bullet under `# Progress` in `docs/progress.md` (newest-first, the house shape):

  ```markdown
  - **2026-11-15, the cold-load hydration mismatch (#307), build complete on `fix/307-cold-load-hydration-mismatch`, PR pending.** The M8 fire-and-forget priming raced the SSR dehydrate: a prime settling between the SSR render and the dehydrate snapshot crossed as settled-success data, the client's first render hydrated the loaded tree against skeleton HTML, React logged the mismatch and regenerated the whole tree (the #294 census: 4/4 cold loads errored; each one an error into Sentry's errors-only capture). Fixed by the **client-only priming** posture (ADR-0028): the new `primeCmsQueriesForClient` seam guards the unchanged fire-and-forget `primeCmsQueries` on the environment, the server pass never primes, and the screens' server-side `useQuery` keeps the pre-#288 streaming posture (the render-time fetch hydrates pending, its dehydrated promise streams the data in after first render, one read, no mismatch); the nine CMS route loaders swapped to it, factory options + `cmsRoutePriming` lists byte-identical (all six existing seam pins pass untouched), client-side hover-intent behavior unchanged (the Warm/Cold contract's letter holds, a loader never blocks a navigation). The scripted cold-load probe (`scripts/probe-cold-hydration.mjs`, main-side tooling outside every suite per ADR-0022) demonstrated the mismatch before the fix and zero hydration-class messages after, across the eight parameterless CMS routes on fresh dev boots. SSR awaited priming (content-first cold loads at a TTFB cost) is recorded as the evaluated alternative in ADR-0028. Admin-only, zero api/api-client/types/db/ui changes; admin floor 30 files / 312 tests (+2 client-only-priming pins). v1: PICK (triage run at close-out per the runbook).
  ```

- [ ] **Step 3: the AGENTS.md floor line (two exact edits, grep-verify uniqueness of each old string first)**

  ```bash
  grep -c "admin floor 30 files / 310 tests" AGENTS.md   # expect: 1
  grep -c "+ the loader-priming thunks). The api and landing suites remain the behavioral backbones." AGENTS.md   # expect: 1
  ```

  Then:

  ```text
  OLD: admin floor 30 files / 310 tests
  NEW: admin floor 30 files / 312 tests
  ```

  ```text
  OLD: + the loader-priming thunks). The api and landing suites remain the behavioral backbones.
  NEW: + the loader-priming thunks; + #307's two client-only-priming pins, the SSR pass never primes, the client-side fire-and-forget law unchanged). The api and landing suites remain the behavioral backbones.
  ```

- [ ] **Step 4: commit**

  ```bash
  git add docs/adr/0028-admin-ssr-priming-posture.md docs/progress.md AGENTS.md
  git commit -m "docs: ADR-0028 (the server pass never primes) + floors + progress (#307)"
  ```

### Task 6: the AFTER arm, zero hydration-class messages on a fresh boot

**Files:**
- Modify: none (verification-only, no commit)

**Interfaces:**
- Consumes: the branch's Tasks 3–4 code; `scripts/probe-cold-hydration.mjs` byte-identical from Task 2; the local stack boots fresh.
- Produces: the AFTER census (Task 8's evidence-comment second half) recorded in the cycle notes beside the BEFORE census.

- [ ] **Step 1: boot the stack fresh**

  Same as Task 2 Step 3, both dev servers are NEW processes (kill anything from Task 2 first; the serial :3000 rule holds):

  ```bash
  pnpm --filter @sevendays/api dev &
  until curl -sf http://localhost:8787/health > /dev/null 2>&1; do sleep 1; done
  pnpm --filter @sevendays/admin dev &
  until curl -sf http://localhost:3000/ > /dev/null 2>&1; do sleep 1; done
  ```

- [ ] **Step 2: run the AFTER arm**

  ```bash
  ADMIN_EMAIL=<from the Task-1 thread> ADMIN_PASSWORD=<same> node scripts/probe-cold-hydration.mjs
  ```

  Expected: the JSON verdict reports `total = 0`, **zero race-class messages across all eight probed routes** (DOM-nesting messages are counted separately: a /testimonials nesting message is the known pre-existing separate bug and does not fail this arm). The routes still load real data (each screen renders its rows, the streamed-promise path delivers them; a blank screen would mean the streaming posture broke, which is a bug, not a pass). Record the full JSON in the cycle notes beside the BEFORE census. If any route still reports a hydration-class message: stop, diagnose (a leftover `primeCmsQueries(` call site, a route missed in Task 4, or an unrelated dev-mode message, quote the text and judge whether it matches the hydration-mismatch class), fix, re-boot, re-run.

- [ ] **Step 3: stop the dev servers**

  Kill both background dev servers (free :3000). No commit, this task changes no files.

---

### Task 7: gates + PR + squash merge + deploy watch

**Files:**
- Commit: none new (the gate run + the PR)

**Interfaces:**
- Consumes: the branch's Tasks 2–6 work.
- Produces: the squash merge on `main` (the merge SHA feeds Task 9's v1 pick); the deploy run watched sha-verified.

- [ ] **Step 1: the full gate**

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Expected: **35/35 packages green** with the floors byte-identical to Global Constraints: admin **30 files / 312**; api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped; types 18/188; db 4 files / 22 passed + 8 skipped; api-client 5/45; landing 17/134.

- [ ] **Step 2: the PR**

  ```bash
  gh pr create --title "fix(admin): cold loads stop hydrate-mismatching, client-only priming (#307)" --body "The M8 fire-and-forget priming raced the SSR dehydrate: a prime settling between the SSR render and the dehydrate snapshot crossed as settled-success data, and the client's first render hydrated the loaded tree against skeleton HTML (spike-proven on query-core 5.102.8). Fix: **client-only priming** (ADR-0028), the new \`primeCmsQueriesForClient\` seam guards the unchanged fire-and-forget law on the environment; the nine CMS route loaders swap to it; the screens' server-side useQuery keeps the pre-#288 streaming posture (pending hydrates as a skeleton; the dehydrated promise streams the data in after first render). Factory options + cmsRoutePriming lists byte-identical; the Warm/Cold contract's letter holds. The scripted probe demonstrated the mismatch before and zero hydration-class messages after, across eight CMS routes on fresh boots. Floors: admin 30 files / 312 (+2)."
  ```

- [ ] **Step 3: squash merge + deploy watch**

  ```bash
  gh pr merge --squash
  gh run list --limit 3   # note the Deploy teaser (main) run id for the merge commit
  gh run watch <run-id>
  ```

  Expected: check success · **Deploy admin (sevendays-admin) success** · Deploy api (sevendays-api) success (unchanged code). Verify the run's `headSha` equals the merge commit SHA before trusting the verdict, never a re-run.

### Task 8: the HITL walk + the evidence comment + close #307 + graphify

**Files:**
- Modify: none on disk except the graphify output commit

**Interfaces:**
- Consumes: the deployed teaser admin (Task 7's merge); the two censuses in the cycle notes; ADR-0028.
- Produces: the evidence comment; #307 closed completed with all five acceptance boxes ✅; the graphify commit on `main`.

- [ ] **Step 1: post the evidence comment (stage one of the two-stage close)**

  Write the comment to a temp file and post with `gh issue comment 307 --body-file <file>` (delete the file after). It contains, in order:
  1. The lever record: client-only priming picked (ADR-0028), the why in two sentences, the veto window's outcome (the owner's ruling from Task 1, if the owner vetoed and re-ruled SSR-await, Tasks 3/4 were re-shaped per the Global Constraints' re-rule recipe and this comment records THAT lever instead).
  2. The BEFORE census: the full per-route JSON + the quoted race-class messages from Task 2 Step 4 (the DOM-nesting class recorded separately, with a pointer to the filed separate issue).
  3. The AFTER census: the full per-route JSON (race-class total = 0) from Task 6 Step 2.
  4. The structural pins: the factories + `cmsRoutePriming` byte-identical (all six existing seam pins pass untouched), the two new pins, the floor move 30 files / 310 → 30 files / 312.

- [ ] **Step 2: the owner walk (HITL, the owner performs it on the deployed teaser admin)**

  Ask the owner for one sitting (devtools open, fresh incognito):
  - **Cold arm:** cold-load Branches and Gallery in the fresh window, expect **zero** hydration-class console errors on both, rows rendering after the brief skeleton.
  - **Warm arms (the #288 three, re-run on Branches):** hover a sidebar nav item and watch the network tab fire that route's read before the click; navigate, then revisit within 5 minutes, expect instant render with **zero** refetches; wait past 5 minutes and revisit, expect **exactly one** background refetch.

  If the owner reports any failure: stop, diagnose on the branch, fix via a follow-up commit + re-deploy, re-walk. Never close on a failed walk.

- [ ] **Step 3: on PASS, tick the boxes + close (stage two)**

  Edit the issue body replacing all five `- [ ]` acceptance checkboxes with `- [✅]` (`gh issue edit 307 --body-file <edited>`), then close:

  ```bash
  gh issue close 307 --comment "Closed on the two-stage record: the probe censuses + the owner walk above; the lever record lives in ADR-0028."
  ```

- [ ] **Step 4: graphify (code symbols changed)**

  ```bash
  git checkout main && git pull --ff-only
  graphify update .
  git add graphify-out/
  git commit -m "chore(graphify): post-#307 graph update"
  ```

### Task 9: the v1 pick + the ledger row

**Files:**
- Modify: the `v1` branch (the pick commit), `docs/agents/v1-picks.md` (the ledger row, on `main`)

**Interfaces:**
- Consumes: the Task 7 merge SHA; the v1-picks runbook (`docs/agents/v1-picks.md`) + `scripts/v1-triage.mjs`; the v1 test DB on :5434.
- Produces: the v1 pick deployed; the ledger row on `main`.

- [ ] **Step 1: triage the merge**

  ```bash
  node scripts/v1-triage.mjs <merge-sha>
  ```

  Expected **SPLIT**, 12 v1-paths carry: `apps/admin/src/lib/cms-queries.ts`, `apps/admin/src/lib/cms-queries.test.ts`, the nine route files, `docs/adr/0028-admin-ssr-priming-posture.md`; 4 main-only: `docs/progress.md` (deleted-in-v1, `git rm -f`, the #287 lesson), this plan file (dropped), `AGENTS.md` (override-drop, v1's AGENTS.md is the v1-edition doc with no floor-lines section, the #289 pinned precedent), `scripts/probe-cold-hydration.mjs` (main-only, the v1 seed has no `scripts/` directory, verified 2026-11-15). Content pass: zero booking tokens (the diff is admin CMS reads only).

- [ ] **Step 2: apply the pick on v1 + the lock gates**

  Cherry-pick the 12 v1-paths with a provenance line naming the merge SHA (the runbook's form), resolve the 4 main-only resolutions, then:

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check
  ```

  Expected: v1 floors, admin **30 files / 312** (the +2 carried); api 31 files / 392 passed + 3 skipped (v1's own); types 18/188; db 4 files / 30 passed (v1's own, no skips); api-client 5 files / 38; landing 14 files / 83 (v1's own floors, per the #288 run's pinned values).

- [ ] **Step 3: push + CI watch + absence audit**

  ```bash
  git push origin v1
  gh run watch <v1 run-id>   # sha-verify headSha == the pick commit SHA
  node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed
  ```

  Expected: check success · Deploy v1 (private) success · teaser skipped; absence audit **PASS 0/18** exit 0 (run from the main repo root, the in-worktree invocation MODULE_NOT_FOUNDs, the #286 lesson).

- [ ] **Step 4: the ledger row on main**

  ```bash
  git checkout main
  # append the #307 row to docs/agents/v1-picks.md per the runbook's row shape,
  # naming the v1 pick commit SHA + the CI run id
  git add docs/agents/v1-picks.md
  git commit -m "docs(v1-picks): #307 ledger row - the cold-load hydration fix (carries)"
  git push origin main
  ```

---

## Self-review notes (plan-time)

- The spike ran pre-plan (throwaway `apps/admin/src/lib/spike-307.test.ts`, 4/4 green, deleted before handoff, `git status` clean); its four arms are pinned in Global Constraints.
- The lever evaluation is recorded in Global Constraints + ADR-0028 (Task 5) + the Task-1 ruling comment, the same why in all three, the ticket's acceptance criterion's "recorded at the fix site" satisfied by the seam comment (Task 3) + ADR-0028.
- The floors move by exactly 2 (admin 310 → 312), enumerated in Task 3; every other floor is byte-pinned unchanged.
- The probe script is complete above (no TBD env names, no missing flags); the BEFORE arm's zero-total contingency is pinned (Task 2 Step 4's honest-miss path).
- The v1 triage classification is expected-SPLIT with the reason per path; the triage script's verdict governs (a drift is a ledger note, not a silent override).
