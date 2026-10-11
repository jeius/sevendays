# The M6 deferred-minors sweep (#207) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pay down the mechanically-takeable half of the M6 deferred-minors ledger — five teaching-text/cosmetic corrections across six files (the stale Sentry import teaching, the "five"-over-ten env-example count, the e2e workflow's stale self-description, the never-landed $pageleave note, the widget-state tautology) and six green-on-arrival regression-pin tests over shipped behavior (the packages-side cover-commit `media_failure`, the actorId length assert, the audit row's three unpinned negatives, the actors-query no-placeholderData pin, the census catch arm) — with zero `src/` behavior changes.

**Architecture:** One branch, five tasks. Task 1 is text-only (comments, teaching rules, a YAML comment, an env-example count — no runtime byte changes). Tasks 2–4 are test-only additions/edits in three suites (api, types, admin) — every new test is a **green-on-arrival pin** (the behavior shipped in #183–#188; a RED pin means the contract moved and the worker STOPS and reports rather than "fixing" src). Task 5 is the house close-out: floors rotation, progress head entry, PR, squash-merge, v1 triage.

**Tech Stack:** vitest (the existing suites — no new dependencies, no manifest changes), Biome (`pnpm fix` per workspace), the compose-class throwaway Postgres container on `:5433` for the api suite (the #188/#191 pattern), `gh` CLI + `scripts/v1-triage.mjs` for the close.

**Spec:** GitHub issue #207 (`ready-for-agent`), parent spec #182 → `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` (follow-up debt, not a spec section). The ledger sources: the nine M6 SDD ledgers under `.superpowers/sdd/` (each item names its origin ticket in-line below). **Sibling fence:** #192 (M6 close-out) stays untouched — this plan ticks NO `docs/plan.md` M6 box, flips none of #192's five AC boxes, and executes no runbook step; #208 (the hardening pass — the ten latent-risk minors) is deliberately NOT begun here, its items stay unfixed. Order-free vs #192: this may land before or after the close-out.

## Recon state this plan starts from (verified live 2026-10-11, pre-plan)

- **Main is at `c2965d6`** (the #191 ledger-row commit). All nine M6 tickets closed; #192 (close-out) and #207/#208 (these follow-ups) open.
- **The two `.cursorrules` are byte-identical** (`diff` clean) and teach `import * as Sentry from '@sentry/tanstackstart-react'` + `Sentry.startSpan` (the fenced example ends at the pokemon fetch). The live house rule since #184 is the named import — eight real sites, all `import { startSpan } from '@sentry/tanstackstart-react'` (`apps/landing/src/lib/api.functions.ts:1`, `apps/admin/src/lib/{api,auth,admin}.functions.ts`, `apps/admin/src/lib/metrics/metrics.functions.ts:9`, `apps/admin/src/lib/audit/audit.functions.ts:13`, both `instrument.ts` use named `init`).
- **`apps/admin/.env.example`** says `# All five are optional-by-design:` at line 23 over a metrics-seam section that now documents **ten** names: `CF_ANALYTICS_READ_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_ANALYTICS_SCRIPT_API`, `CF_ANALYTICS_SCRIPT_LANDING`, `CF_ANALYTICS_SCRIPT_ADMIN`, `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` (#186's seven) + `CF_ANALYTICS_BUCKET`, `POSTHOG_LANDING_HOSTS`, `POSTHOG_API_HOST` (#187's three). All ten remain optional-by-design (missing = the curated not-configured state) — only the count word is stale.
- **`.github/workflows/e2e.yml:3`** reads `# The Playwright pre-flight's CI leg (M6 #189, ADR-0022): nightly + on-demand` — stale framing since #190 made this file the smoke's workflow too (its own line 8 already says "#190's seven production assertions run through this same workflow").
- **`apps/landing/src/integrations/posthog/provider.tsx:1-8`** is the provider's header comment ending `// Options grep-proven against` / `// the installed posthog-js 1.422.5 / @posthog/types 1.407.1.`; the `#187` ledger's $pageleave note ("the flip implicitly enables $pageleave — SDK default `capture_pageleave: 'if_capture_pageview'`") never landed anywhere — this comment is its ruled home ("worth a docs line"; the behavior itself stays exactly as shipped).
- **`apps/admin/src/components/dashboard/system-health.tsx`** passes `state={workersState}` bare at :51, :72, :84, :125 but carries `state={workersState === 'ready' ? 'ready' : workersState}` at :151 and :157 (the two `FrontendErrorWidget` calls) — a pure identity (#186's final review re-confirmed it as the ledgered harmless tautology; `resolveWidgetState` at :30 already returns the `WidgetState` union, so the bare form typechecks by the same file's own precedent).
- **`apps/api/test/application-log.test.ts:92`** carries `// routePath is '' when unmatched → raw path` — the plan-amended truth (the #183 plan's own corrected block, its line 636) is `// routePath is the wildcard /* when unmatched → the raw path stands in` (Hono 4.13.5 resolves 404s to the registering middleware's `/*` wildcard; the `''` claim was the disproven original inference). The actorId test at :131–143 lacks the `toHaveLength(1)` pin its sibling at :48–57 has (`const access = byEvt(lines, 'access'); expect(access).toHaveLength(1); const [line] = access; if (!line) throw …`).
- **`apps/api/test/admin-mutation-log.test.ts`** asserts `media_failure × commit` for gallery-photos (:259–276) but never for the package save's cover commit — `resolveCover` (`apps/api/src/services/admin-packages.ts:152–177`) runs `commitUpload` with `purpose: 'package-cover'`, and a non-staging key returns `{ ok: false, reason: 'foreign_key', message: 'Invalid staging key.', details: [{ path: ['key'], message: 'must be a tmp/<uuid>.jpg staging key minted by presign' }] }` (verified at `apps/api/src/services/media.ts:107–115` — the staging-key schema reject happens BEFORE any bucket I/O, so the test needs no bucket binding), which `resolveCover` re-paths to `coverImageKey` and resolves as the 400 conflict. The api's 400 body shape is flat `{ details: [{ path, message }] }` (the admin-packages precedents at :163–165, :186–188). The file's `packageSave(overrides)` helper (:45–71) spreads `...overrides` LAST — `packageSave({ coverImageKey: … })` is the shape. Per-call unique emails are the #185 lesson — the new test's email is unique in the file.
- **`packages/types/src/audit.test.ts`** (`auditLogRowSchema` describe) pins negatives only for `entityId` non-uuid and `actorEmail` empty (:73–83). The unpinned negatives: `id: z.uuid()` (:30), `requestId: z.string().min(1)` (:38), `occurredAt: z.coerce.date()` (:31) — `'not-a-timestamp'` coerces to an Invalid Date and fails. The `fullRow` fixture (:9–20) is the spread base.
- **`apps/admin/src/lib/audit/queries.test.ts`** pins the page query's positive `placeholderData: keepPreviousData` (:14–20) but the actors block (:34–44) has no negative — `auditQueries.actors()` (`queries.ts:38–44`) carries no `placeholderData` key, so `'placeholderData' in auditQueries.actors()` is `false`.
- **`apps/admin/src/lib/metrics/db-probes.test.ts`** pins only SQL literals; `collectContentCensus`'s catch arm (`db.ts:27–41`: one `console.error('[metrics] content census source unavailable:', …)` + `return { ok: false, reason: 'unavailable' }`) is untested. `SqlExec = (statement: string) => Promise<Record<string, unknown>[]>` (`packages/db/src/probes.ts:10`) — a zero-param async thrower is structurally assignable, no type import needed. The file imports `{ describe, expect, it }` from vitest (gains `vi`).
- **Floors on main (documented, re-pinned at Step 0):** api **27 files + 1 skipped (28) / 338 passed + 3 skipped** (AGENTS.md:36, re-verified 2026-10-11 by the #191 cycle); admin **17 files / 164 tests** (AGENTS.md:38); types **14 files / 118 tests** (#187's Task-8 rotation); api-client 5/33; landing 9/73. This plan moves them by exactly: **api +1 → 339+3s · types +3 → 121 · admin +2 → 17/166**. `pnpm check` stays 35/35.
- **The api suite needs the throwaway test DB on :5433** — `lactalink-test-db` (an unrelated project) holds `:5432`; the repo's own compose DB may be down. The #188/#191 pattern: run a `postgres:17` container on :5433, `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test`, the global-setup migrates + truncates itself. Types/admin suites are plain-node — no DB.
- **`docs/progress.md` is a head-log:** the newest entry sits directly under `# Progress` (line 3 is the 2026-10-11 #191 entry) — Task 5's entry inserts ABOVE it.
- **No new dependencies anywhere.** Every edit is to an existing file; the manifests and `pnpm-lock.yaml` are untouched.

## Global Constraints

- **Zero `src/` behavior changes (binding):** Task 1 touches comments/teaching text/a YAML comment/an env-example count word ONLY; Tasks 2–4 touch test files ONLY. The only non-test, non-comment runtime-adjacent edit is `system-health.tsx`'s identity-ternary removal — value- and type-identical by construction (both branches yield `workersState`). If any gate or test moves because runtime behavior changed, that is a defect — stop and report.
- **Green-on-arrival pins (binding):** every new test in Tasks 2–4 asserts behavior that already ships (#183–#188). Expected result at first run: PASS. A RED pin means the shipped contract differs from the ledger — the worker STOPS and reports the actual behavior; never edit `src/` to make a pin green, never weaken the pin.
- **Pinned replacement literals (verbatim):** the `.cursorrules` teaching block, the `All ten` line, the e2e.yml comment line, the provider comment extension, the bare `state={workersState}`, the corrected routePath comment, the actorId length-pin shape, the cover-commit test body (incl. `body.details` exactly `[{ path: ['coverImageKey'], message: 'must be a tmp/<uuid>.jpg staging key minted by presign' }]`), the three audit negatives, the actors no-placeholderData pin, the census catch-arm test — all fenced below; land content verbatim, then let Biome reflow formatting (`pnpm --filter <pkg> fix` on touched files before every commit; accept its rewrite, never reword strings).
- **Floors (Step-0 re-pin, then exact deltas):** api 27+1s/338+3s → **27+1s/339+3s** (Task 2); types 14/118 → **14/121** (Task 3); admin 17/164 → **17/166** (Task 4); api-client + landing unchanged; `pnpm check` **35/35** + `pnpm build` green before the PR. If a Step-0 baseline differs from the documented floor, record the actual and re-derive the delta before proceeding.
- **Per-call unique emails in new api tests** (the #185 lesson): `mut-pkg-cover-fk@sevendays.test` is unique in `admin-mutation-log.test.ts`.
- **The api test DB is the throwaway container, never the live Supabase, never `lactalink-test-db` on :5432.** Bring it up (Task 2 Step 0), tear it down (Task 5 Step 4). If a healthy `:5433` postgres already answers, reuse it and say so in the report.
- **Docs house rules:** the `docs/progress.md` entry lands at the HEAD of the log (above the 2026-10-11 #191 entry); AGENTS.md floor numbers updated in both spots (:36 api, :38 admin); repo-docs checklist ticks are `- [✅]` (none here — this ticket has no `docs/plan.md` box); GitHub issue checkboxes flip with `- [x]` at close-out; every squash-merged PR gets its v1 triage (`docs/agents/v1-picks.md`) — expected verdict **SPLIT** (test/text files pick where they exist on v1; docs main-only); `graphify update .` runs after the code lands but its churn is never committed by this plan (the pre-existing dirty `graphify-out/` state belongs to the owner's next graph commit; every `git add` names its files).
- **Scope fence ("not here"):** NO #192 close-out content (no plan.md M6 box, no exit-criteria text, no Known-Gaps rewrite beyond the dated head entry); NO #208 hardening item (the windowToRange family, the isFinite guards, the PII-floor tightening, the release-empty edge, the studio-service entityId convention, the nav copy-on-return, the h-full wrapper, the trailing-slash normalization all stay unfixed — the sweep's tests must not accidentally cover them); NO #188 variant/composition change (Variant A stands as merged); NO runtime code, NO dependency/manifest change, NO new files outside the two named test blocks' existing files, NO migration, NO env/secret anywhere.
- **Plan file target:** `docs/superpowers/plans/2026-10-11-207-m6-deferred-minors-sweep.md` (this file).

---

### Task 1: The teaching-text and cosmetic corrections

**Files:**
- Modify: `apps/admin/.cursorrules:9-22` (the Instrumentation section)
- Modify: `apps/landing/.cursorrules` (byte-identical file — same section)
- Modify: `apps/admin/.env.example:23`
- Modify: `.github/workflows/e2e.yml:3`
- Modify: `apps/landing/src/integrations/posthog/provider.tsx:8` (comment extension)
- Modify: `apps/admin/src/components/dashboard/system-health.tsx:151,157`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on (text-only). Tasks 2–4 proceed regardless of order after this lands.

- [ ] **Step 0: Cut the branch and re-pin the baseline**

```bash
cd /home/jeius/Projects/sevendays
git checkout main && git pull --ff-only
git log --oneline -1   # expect c2965d6 or later
git checkout -b feat/207-deferred-minors-sweep
pnpm install && pnpm build:packages
docker ps --format '{{.Names}} {{.Ports}}' | grep 5433 || docker run -d --name sevendays-test-sweep \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sevendays_test -p 5433:5432 postgres:17
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/types test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: api `27 passed | 1 skipped (28)` / `338 passed | 3 skipped (341)`; types `14 passed (14)` / `118 passed`; admin `17 passed (17)` / `164 passed`. (The container stays up for the whole branch — every later api run and every full `pnpm check` needs it; teardown is Task 5 Step 6. Never touch `lactalink-test-db` on `:5432`; never point at any Supabase URL.) If a floor moved, record the actual and re-derive the deltas in Global Constraints before continuing.

- [ ] **Step 1: Fix the Sentry teaching in BOTH `.cursorrules`**

The two files are byte-identical — apply the same replacement to each. Replace this block:

````
We want our server functions instrumented. So if you see a function name like `createServerFn`, you can instrument it with Sentry. You'll need to import `Sentry`:

```tsx
import * as Sentry from '@sentry/tanstackstart-react'
```

And then wrap the implementation of the server function with `Sentry.startSpan`, like so:

```tsx
Sentry.startSpan({ name: 'Requesting all the pokemon' }, async () => {
  // Some lengthy operation here
  await fetch('https://api.pokemon.com/data/')
})
```
````

with this block (content verbatim; the `import * as Sentry` form is the stale #184-era teaching — the live rule is the named import):

````
We want our server functions instrumented. So if you see a function name like `createServerFn`, you can instrument it with Sentry. You'll need to import `startSpan` (a named import — never `import * as Sentry`):

```tsx
import { startSpan } from '@sentry/tanstackstart-react'
```

And then wrap the implementation of the server function with `startSpan`, like so:

```tsx
startSpan({ name: 'Requesting all the pokemon' }, async () => {
  // Some lengthy operation here
  await fetch('https://api.pokemon.com/data/')
})
```
````

- [ ] **Step 2: Correct the env-example count**

In `apps/admin/.env.example`, replace the line:

```
# All five are optional-by-design: missing = that widget's curated
```

with:

```
# All ten are optional-by-design: missing = that widget's curated
```

(Ten names follow in the section: #186's seven + #187's three — count them with `grep -c '=$' apps/admin/.env.example` scoped to the metrics section if in doubt; the sentence's claim is about the metrics seam only, the four vars above it are out of scope.)

- [ ] **Step 3: Fix the e2e workflow's self-description**

In `.github/workflows/e2e.yml`, replace the line:

```
# The Playwright pre-flight's CI leg (M6 #189, ADR-0022): nightly + on-demand
```

with:

```
# The E2E workflow (M6 #189's foundation + #190's production smoke; ADR-0022):
```

(Line 4 onward — "against a deployed environment — NEVER PR-gating …" — is untouched; the trigger facts live in the `on:` block and the later sentences.)

- [ ] **Step 4: Land the $pageleave note in the provider comment**

In `apps/landing/src/integrations/posthog/provider.tsx`, the header comment currently ends:

```
// and the admin's own events never join it. Options grep-proven against
// the installed posthog-js 1.422.5 / @posthog/types 1.407.1.
```

Extend it to:

```
// and the admin's own events never join it. Options grep-proven against
// the installed posthog-js 1.422.5 / @posthog/types 1.407.1.
// #187 ledger note: the flip implicitly enables $pageleave too — the SDK
// default capture_pageleave 'if_capture_pageview' keys on pageviews being
// on. An event class beyond pageviews + web vitals, landing-scoped by the
// same host allowlist; mute explicitly with capture_pageleave: false if
// its volume ever matters.
```

(The behavior is unchanged — this is the ledgered "docs line" in its ruled home.)

- [ ] **Step 5: Drop the widget-state tautology**

In `apps/admin/src/components/dashboard/system-health.tsx`, replace BOTH occurrences (:151 and :157) of:

```tsx
          state={workersState === 'ready' ? 'ready' : workersState}
```

with:

```tsx
          state={workersState}
```

- [ ] **Step 6: Verify — nothing moved**

```bash
grep -n "import \* as Sentry from" apps/admin/.cursorrules apps/landing/.cursorrules   # expect no output — the scoped "from" anchor is required: the pinned prose line "(a named import — never `import * as Sentry`)" matches the unanchored pattern by design (controller ruling, #207 cycle)
grep -n "All ten are optional-by-design" apps/admin/.env.example                    # expect line 23
grep -n "pre-flight's CI leg" .github/workflows/e2e.yml                             # expect no output
grep -c "pageleave" apps/landing/src/integrations/posthog/provider.tsx              # expect 3
grep -c "workersState === 'ready'" apps/admin/src/components/dashboard/system-health.tsx  # expect 0
pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/landing fix
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test pnpm check 2>&1 | tail -3    # expect 35/35 successful, floors unchanged
```

- [ ] **Step 7: Commit**

```bash
git add apps/admin/.cursorrules apps/landing/.cursorrules apps/admin/.env.example .github/workflows/e2e.yml apps/landing/src/integrations/posthog/provider.tsx apps/admin/src/components/dashboard/system-health.tsx
git commit -m "chore: the M6 sweep's teaching-text corrections — Sentry named import, ten env names, the e2e workflow's name, the pageleave note, the widget-state tautology"
```

### Task 2: The api pins — the cover-commit media_failure, the actorId length, the corrected comment

**Files:**
- Modify: `apps/api/test/application-log.test.ts:92` (comment) and `:131-143` (the actorId test gains its length pin)
- Modify: `apps/api/test/admin-mutation-log.test.ts:196-209` (one new test appended after the atomic-save test, inside the same describe)

**Interfaces:**
- Consumes: the file's existing helpers — `captureLines()`, `byEvt()`, `authed()`, `mutations()`, `packageSave(overrides)` (spreads `...overrides` last), `testEnv`, `url` — all unchanged.
- Produces: the api floor **27+1s files / 339+3s tests** (exactly +1) — Task 5's AGENTS.md rotation pins this number.

- [ ] **Step 0: Re-pin the api baseline (the :5433 container is up from Task 1 Step 0)**

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: `27 passed | 1 skipped (28)` files / `338 passed | 3 skipped (341)` tests — the AGENTS.md floor. Never touch `lactalink-test-db` on `:5432`; never point at any Supabase URL. (The vitest "close timed out" line on green runs is known noise — not a gate failure.)

- [ ] **Step 1: Correct the stale routePath comment**

In `apps/api/test/application-log.test.ts`, replace the line:

```ts
    expect(line.route).toBe('/nope'); // routePath is '' when unmatched → raw path
```

with the #183 plan's corrected form (the amended plan block — Hono 4.13.5 resolves 404s to the registering middleware's `/*` wildcard; the `''` claim was the disproven original inference):

```ts
    expect(line.route).toBe('/nope'); // routePath is the wildcard /* when unmatched → the raw path stands in
```

- [ ] **Step 2: Add the actorId length pin**

In the same file, the session-gated-read test (`:131`) currently reads:

```ts
    expect(res.status).toBe(200);
    const [line] = byEvt(lines, 'access');
    if (!line) throw new Error('expected one access line');
    expect(line.actorId).toBe(userId);
```

Replace those four lines with the sibling shape from `:48-57`:

```ts
    expect(res.status).toBe(200);
    const access = byEvt(lines, 'access');
    expect(access).toHaveLength(1);
    const [line] = access;
    if (!line) throw new Error('expected one access line');
    expect(line.actorId).toBe(userId);
```

- [ ] **Step 3: Write the cover-commit media_failure pin (green-on-arrival)**

In `apps/api/test/admin-mutation-log.test.ts`, immediately after the `it('the atomic package save → exactly ONE line (request-grain, not per DB row)', …)` block (its closing `});` sits just before the gallery-category order test), append inside the same describe:

```ts
  it('the package save with a non-staging cover key → 400, one media_failure {op: commit, reason: foreign_key} re-pathed to coverImageKey, and NO mutation line', async () => {
    const lines = captureLines();
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'mut-pkg-cover-fk@sevendays.test',
      packageSave({ coverImageKey: 'gallery/00000000-0000-4000-8000-000000000000.jpg' })
    );
    expect(res.status).toBe(400);
    const parsed = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const media = parsed.filter((line) => line.evt === 'media_failure');
    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({ op: 'commit', reason: 'foreign_key' });
    expect(parsed.filter((line) => line.evt === 'admin_mutation')).toEqual([]);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([
      { path: ['coverImageKey'], message: 'must be a tmp/<uuid>.jpg staging key minted by presign' },
    ]);
  });
```

Why no bucket binding: the staging-key schema reject (`media.ts`'s `commitUpload`) fires before any `bucket.head` — a non-staging key answers `{ ok: false, reason: 'foreign_key', … }` with zero R2 I/O, then `resolveCover` re-paths the detail to `coverImageKey` and the save resolves as the 400 conflict before any transaction opens (hence zero mutation lines — the request-grain law).

- [ ] **Step 4: Run the two files — expect PASS (green-on-arrival)**

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm exec vitest run test/application-log.test.ts test/admin-mutation-log.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
```

(Run from `apps/api`.) Expected: both files pass; the new test passes on first run — it pins shipped behavior. A RED result means the contract moved: STOP and report the actual line shapes; never edit `src/` and never weaken the pin.

- [ ] **Step 5: Full api suite — the exact new floor**

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/api fix
```

Expected: `27 passed | 1 skipped (28)` files / **`339 passed | 3 skipped (342)`** tests — exactly +1. Anything else: a pre-existing test was disturbed — stop and report.

- [ ] **Step 6: Commit**

```bash
git add apps/api/test/application-log.test.ts apps/api/test/admin-mutation-log.test.ts
git commit -m "test(api): pin the packages-side cover-commit media_failure, the actorId length, and the corrected routePath comment"
```

### Task 3: The audit row's three unpinned negatives

**Files:**
- Modify: `packages/types/src/audit.test.ts:73-84` (three new `it` blocks appended inside `describe('auditLogRowSchema', …)`, after the nullable test)

**Interfaces:**
- Consumes: the file's `fullRow` fixture (:9-20) and `auditLogRowSchema` — unchanged.
- Produces: the types floor **14 files / 121 tests** (exactly +3) — Task 5's rotation pins this number.

- [ ] **Step 1: Write the three negative pins (green-on-arrival)**

Append inside the `auditLogRowSchema` describe, after the `it('entityId and summary are nullable …')` block:

```ts
  it('id must be a uuid (the row key the viewer paginates over)', () => {
    expect(auditLogRowSchema.safeParse({ ...fullRow, id: 'not-a-uuid' }).success).toBe(false);
  });

  it('requestId must be non-empty (the Application Log correlation key)', () => {
    expect(auditLogRowSchema.safeParse({ ...fullRow, requestId: '' }).success).toBe(false);
  });

  it('occurredAt must be coercible to a Date (the UTC day windows key on it)', () => {
    expect(auditLogRowSchema.safeParse({ ...fullRow, occurredAt: 'not-a-timestamp' }).success).toBe(false);
  });
```

(The #185 ledger named exactly these three unpinned negatives; `entityId` non-uuid and `actorEmail` empty already pin in the nullable test above. `'not-a-timestamp'` coerces to an Invalid Date and fails `z.coerce.date()`.)

- [ ] **Step 2: Run — expect PASS and the exact new floor**

```bash
pnpm --filter @sevendays/types test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/types fix
```

Expected: `14 passed (14)` files / **`121 passed`** tests — exactly +3. No DB needed (plain zod suite).

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/audit.test.ts
git commit -m "test(types): the audit row's three unpinned negatives — id, requestId, occurredAt"
```

### Task 4: The admin pins — the actors no-placeholderData and the census catch arm

**Files:**
- Modify: `apps/admin/src/lib/audit/queries.test.ts:44` (one new `it` appended after the actors-key-stability test, inside the describe)
- Modify: `apps/admin/src/lib/metrics/db-probes.test.ts:1` (imports gain `vi`) + a new describe appended at the file's end

**Interfaces:**
- Consumes: `auditQueries.actors()` (`queries.ts:38-44` — carries no `placeholderData` key) and `collectContentCensus` (imported already at `db-probes.test.ts:20`).
- Produces: the admin floor **17 files / 166 tests** (exactly +2) — Task 5's AGENTS.md rotation pins this number.

- [ ] **Step 1: Write the actors negative pin (green-on-arrival)**

In `apps/admin/src/lib/audit/queries.test.ts`, after the `it('the actors key is stable across calls (one cache entry)', …)` block, append inside the describe:

```ts
  it('the actors query carries NO placeholderData (only the page query keeps previous data)', () => {
    expect('placeholderData' in auditQueries.actors()).toBe(false);
  });
```

(The #188 ledger's verbatim-brief omission — the page query's positive `placeholderData: keepPreviousData` pin at :14-20 is the mirror; the law is that only the paginated query keeps previous data.)

- [ ] **Step 2: Write the census catch-arm pin (green-on-arrival)**

In `apps/admin/src/lib/metrics/db-probes.test.ts`, change the vitest import line from:

```ts
import { describe, expect, it } from 'vitest';
```

to:

```ts
import { describe, expect, it, vi } from 'vitest';
```

then append this describe at the end of the file:

```ts
describe('the result-union wrappers (a probe failure resolves unavailable, never throws)', () => {
  it('collectContentCensus logs one loud line and resolves { ok: false, reason: unavailable } when the exec throws', async () => {
    const loud = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const boom = async () => {
        throw new Error('census unreachable');
      };
      await expect(collectContentCensus(boom)).resolves.toEqual({ ok: false, reason: 'unavailable' });
      expect(loud).toHaveBeenCalledTimes(1);
      expect(loud.mock.calls[0]?.[0]).toBe('[metrics] content census source unavailable:');
    } finally {
      loud.mockRestore();
    }
  });
});
```

(The zero-param async thrower is structurally assignable to `SqlExec` — no type import needed; the try/finally restore is the #154 live-harness pattern; the #186 ledger named this catch arm untested.)

- [ ] **Step 3: Run — expect PASS and the exact new floor**

```bash
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/admin fix
```

Expected: `17 passed (17)` files / **`166 passed`** tests — exactly +2. No DB needed (plain-node lib-seam suite).

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/audit/queries.test.ts apps/admin/src/lib/metrics/db-probes.test.ts
git commit -m "test(admin): the actors query's no-placeholderData pin + the census catch-arm pin"
```

### Task 5: The rotation, the PR, the close

**Files:**
- Modify: `AGENTS.md:36` (api floor) and `AGENTS.md:38` (admin floor)
- Modify: `docs/progress.md:3` (head entry inserted above the 2026-10-11 #191 entry)
- No `docs/plan.md` edit — this ticket has NO M6 box (it is a follow-up, not a ticket-10 payload; #192 owns every M6 tick)

**Interfaces:**
- Consumes: the three new floors from Tasks 2–4 (api 27+1s/339+3s · types 14/121 · admin 17/166).
- Produces: the merged PR, the #207 close-out, the v1-pick ledger row.

- [ ] **Step 1: Full gates**

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test pnpm check 2>&1 | tail -3
pnpm build 2>&1 | tail -3
```

Expected: check **35/35** successful; build 7/7. The floors inside: api 339+3s, types 121, admin 166, api-client 5/33, landing 9/73.

- [ ] **Step 2: The AGENTS.md floor rotation**

In `AGENTS.md:36`, replace:

```
Floors: api 27 files passed + 1 skipped (28) / 338 passed + 3 skipped; api-client 5 files / 33 tests.
```

with:

```
Floors: api 27 files passed + 1 skipped (28) / 339 passed + 3 skipped (the #207 sweep's cover-commit pin); api-client 5 files / 33 tests.
```

In `AGENTS.md:38`, replace:

```
— admin floor 17 files / 164 tests (superseding the 14/140 the #201–#203 follow-ups had left the doc behind).
```

with:

```
— admin floor 17 files / 166 tests (the #207 sweep's actors-placeholderData + census catch-arm pins; superseding the 14/140 the #201–#203 follow-ups had left the doc behind).
```

(The types floor 14/121 is not carried in AGENTS.md — no edit for it.)

- [ ] **Step 3: The progress.md head entry**

Insert directly under `# Progress` (above the 2026-10-11 #191 entry):

```markdown
2026-10-11 — #207, the M6 deferred-minors sweep, landed: the mechanically-takeable half of the nine M6 SDD ledgers' deferred minors, zero `src/` behavior changes. The teaching-text corrections — both apps' `.cursorrules` now teach the named `startSpan` import (the live rule since #184, never `import * as Sentry`); the admin `.env.example` counts its ten optional metrics names (was "five", stale since #187); `e2e.yml` names itself the E2E workflow (#189's foundation + #190's smoke, not "the pre-flight's CI leg"); the landing provider's comment carries the #187-ledgered $pageleave note (the flip implicitly enables `$pageleave` — SDK default `capture_pageleave: 'if_capture_pageview'`); the dashboard's `system-health.tsx` drops the identity `workersState === 'ready' ? 'ready' : workersState` at both `FrontendErrorWidget` call sites. The regression pins, all green-on-arrival over shipped behavior: the package save's cover-commit `media_failure {op: commit, reason: foreign_key}` re-pathed to `coverImageKey` with zero mutation lines (#183 Task 4's brief-scoped gap); the actorId access-line `toHaveLength(1)` (#183 Task 1); the corrected routePath comment (the wildcard-`/*` truth, #183 Task 2's plan-amended form); the audit row's `id`/`requestId`/`occurredAt` negatives (#185); the actors query's no-`placeholderData` pin (#188); the census catch arm's one-loud-line + `{ok: false, reason: 'unavailable'}` resolution (#186). Floors: api 338+3s → 339+3s, types 118 → 121, admin 17/164 → 17/166; `pnpm check` 35/35, `pnpm build` green. The latent-risk half of the ledger is tracked in #208 (the hardening pass); the M6 close-out (#192) owns every plan.md box.
```

- [ ] **Step 4: Commit, push, PR**

```bash
git add AGENTS.md docs/progress.md
git commit -m "docs: the #207 sweep rotation — floors + the progress head entry"
pnpm exec graphify update .   # churn stays uncommitted (the owner's next graph commit)
git push -u origin feat/207-deferred-minors-sweep
```

Open the PR against `main` with the house body sections (Summary / AC→evidence / verification / deferred minors — none new / scope fence / Closes #207), then watch checks: `gh pr checks <n> --watch`. On green + MERGEABLE + CLEAN: squash-merge with subject = the PR title verbatim + ` (#<n>)`. Verify `state=MERGED`, ff local main.

- [ ] **Step 5: The v1 triage (expected SPLIT)**

The classifier takes the squash-merge commit on main (its usage: `node scripts/v1-triage.mjs <commit>`; exit 0 prints the verdict):

```bash
git pull --ff-only && node scripts/v1-triage.mjs "$(git rev-parse HEAD)" 2>&1 | tail -5
```

Expected verdict **SPLIT**: the test files and text files exist on v1 (picked via #183/#185/#186/#187/#188) and pick clean or resolve trivially; `docs/progress.md`/`AGENTS.md` hunks are main-only (the v1 branch keeps its own rewrite — content-drop per the runbook). Execute the pick per `docs/agents/v1-picks.md` (frozen install + check + build locks; the v1 floors move by the same +1/+3/+2 where the suites exist there), commit with Split provenance, push, watch the v1 run (check + Deploy v1 success, teaser skipped), and append the ledger row.

- [ ] **Step 6: Close #207 + teardown**

```bash
gh issue close 207 --comment "Sweep landed via #<PR> — floors api 339+3s / types 121 / admin 17-166; all five pins green-on-arrival; v1 triage SPLIT (row on main). The latent-risk half lives in #208."
docker rm -f sevendays-test-sweep 2>/dev/null || true
```

(The workspace's throwaway container goes; `lactalink-test-db` is never touched.)


