# The M6 hardening pass (#208) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kill the ten latent-risk deferred minors of the M6 ledger — the `windowToRange` straddle family dies as a class (ONE range per fetch in `cf.ts`/`r2.ts` + the Date-pinned fetch-contract tests), the three traffic munges route through the `numOrNull` guard, the api's PII floor grows a live discriminator, the empty-string `VITE_SENTRY_RELEASE` becomes unset, the studio-service update PUT aligns its expression to the eight sibling routers (the matrices stay param-id, documented), the nav taxonomy freezes read-only, and the inert `h-full` wrapper goes — with the e2e trailing-slash sensitivity re-ledgered wontfix by ruling at close-out.

**Architecture:** One branch, eight tasks. Tasks 1–3 are TDD where behavior moves (the single-range and guard tests land RED, the src fixes turn them green; the two fetch-contract tests additionally get the fake-`Date` pin — vitest 4.1.11, spike-proven pre-plan). Tasks 4–5 are green-on-arrival pins over shipped behavior (the PII floor's tightened discriminator, the studio-service update-PUT emission) — a RED pin there means the shipped contract moved: STOP and report, never edit `src/` to force green. Tasks 6–7 are the two small admin src hardenings (the freeze is TDD; the `h-full` deletion is test-less by nature — an inert class removal). Task 8 is the house close-out: floors rotation, progress head entry, PR, the per-item ruling comment on #208 (incl. item 10's wontfix line), v1 triage, teardown.

**Tech Stack:** vitest 4.1.11 (the existing suites — `vi.useFakeTimers({ toFake: ['Date'] })` / `vi.setSystemTime` / `vi.useRealTimers` verified live against the installed version pre-plan), Biome (`pnpm fix` per workspace), the compose-class throwaway Postgres container on `:5433` for the api suite (the #188/#191/#207 pattern), `gh` CLI + `scripts/v1-triage.mjs` for the close.

**Spec:** GitHub issue #208 (`ready-for-agent`), parent spec #182 → `docs/specs/2026-10-05-m6-production-hardening-observability-spec.md` (follow-up debt, not a spec section). The ledger sources: the M6 SDD ledgers under `.superpowers/sdd/` (each item names its origin ticket in-line below; the #187 ledger's lines 56/59 are the straddle family's primary text). **Sibling fence:** #207 (the mechanically-takeable half) landed as #209 — this plan builds on its floors, touches none of its content; #192 (M6 close-out) stays untouched — no `docs/plan.md` M6 box, no exit-criteria text; #208's own item 10 lands as a RULING LINE on the issue, not as code.

## Recon state this plan starts from (verified live 2026-10-11, pre-plan)

- **Main is at `a2ee12c`** (the #207 ledger-row commit; the sweep itself is `c4ceb19`/#209). #208 and #192 are the open M6 follow-ups. Line numbers below are as of this commit.
- **The straddle family, precisely.** `windowToRange(window, now = new Date())` (`apps/admin/src/lib/metrics/cf.ts:45-55`) truncates to the whole second (`Math.floor(now.getTime() / 1000) * 1000`), so any wall-clock second boundary between two reads shifts `since`/`until` by 1000 ms. Three live sites re-read the clock per document: `fetchOneSeries` calls it inside each of the THREE `Promise.all` arms (`cf.ts:148`, arms at `:195-199`), `fetchR2Dataset` inside each of the TWO arms (`r2.ts:178`, arms at `:216-225`), and the two fetch-contract TESTS recompute it at assertion time (`cf.test.ts:191-192`, `r2.test.ts:211-212`). `fetchTrafficMetrics` is the in-repo computed-once precedent (`posthog.ts:233` — one `windowToRange` before its four-arm `Promise.all`); **posthog.test.ts carries NO straddle** — its fetch-contract test asserts no timestamps (only `query.kind`/`name` via `toMatchObject`), so the ticket's "posthog/r2 suites" phrase resolves to `r2.test.ts` alone on the #187 side plus #186's `cf.test.ts`. Nothing to pin in posthog.test.ts; adding timestamp assertions there would be new coverage, not hardening (fenced out below).
- **The fake-timers cure is spike-proven on the installed vitest 4.1.11** (throwaway test in `apps/admin`, run green and deleted 2026-10-11): `vi.useFakeTimers({ toFake: ['Date'], now })` pins `windowToRange`'s no-arg `new Date()`; explicit-arg `new Date(iso)` still parses REAL dates under the fake (so `mungeWorkerSeries`'s `bucketStart` and `mungeR2Storage`'s `new Date(datetime)` are unaffected); `vi.setSystemTime` advances the fake clock mid-flight; `vi.useRealTimers()` restores. Arithmetic that matters for the RED runs: pinned `2026-10-06T12:34:56.789Z` + 1500 ms = `12:34:58.289` → floors to `12:34:58.000` (NOT 57.000 — the .789 remainder; the pre-plan spike caught exactly this expectation slip).
- **The three unguarded munges** (`posthog.ts`): `mungeTrafficSeries` (`:156-157`), `mungeWindowTotals` (`:168`), `mungeTopPages` (`:174`) all use bare `Number(row.x ?? 0)` — a non-finite raw (`'not-a-number'`, `{}`) munges to `NaN` today. The guarded precedent is `numOrNull` (`:142-146`, `Number.isFinite` → `null`), already routing `mungeVitals`' four aggregates. The ruled shape (AC 2): counts resolve **0** (a count is zero when unknown — the `?? 0` on missing already says so); vitals keep **null** (a measurement is absent, not zero). Types stay `number` — no downstream ripple into `TrafficPoint`/`TopPage`/the dashboard.
- **The PII floor** (`apps/api/test/appointments.test.ts:775-802`): the mocked Resend failure's free text is `'internal error'` — PII-free by construction, so the floor's `not.toContain('ana@example.com')` (`:799`) can never fail (the #184 ledger's "weakly discriminating"). The booking's `customerEmail` IS `'ana@example.com'` (fixture at `:77`/:590; the send's `to:` at `:720`). The captured error is `ResendRejectionError` (`confirmation-email.ts:123-130`), constructed at `:234` as `throw new ResendRejectionError(result.error.name)` — resend's free-text `message` is DISCARDED entirely; the classified message is exactly `` `resend rejected the send (${rejectionName})` ``. Tightening = make the mock's free text echo the recipient + positively pin the classified message: green-on-arrival with a live discriminator.
- **The release-empty edge** (both frontends): `buildSentryOptions` keys the release on `input.release !== undefined` (`apps/admin/src/lib/sentry.ts` + `apps/landing/src/lib/sentry.ts` — the two files are identical except the `app` tag), so a present-but-empty `VITE_SENTRY_RELEASE` yields `release: ''`. #184 had pinned this as design; #208's sketch rules the change: empty is unset. The falsy-check fix matches the file's own `if (!input.dsn) return null` idiom. Both `sentry.test.ts` files are also tag-identical; the existing "omits the release key entirely when unset (no empty-string release tag)" it (`:43-50`) pins `release: undefined` only — its name is aspirational until the empty-string case joins it.
- **The studio-service PUT convention** (`apps/api/src/routes/admin-studio-services.ts`): all eight sibling entity update-PUTs emit `entityId: result.row.id` (`admin-addon-services.ts:59`, `admin-attires.ts:54`, `admin-branches.ts:56`, `admin-print-sizes.ts:59`, `admin-gallery-categories.ts:76`, `admin-service-packages.ts:66`, `admin-testimonials.ts:72`, `gallery-photos.ts:94`); studio-services' update PUT is the lone `entityId: id` (param, `:64`). The two matrix PUTs also pass the param (`:82`, `:105`) — **brief-ruled by design** (#183's Task-3 brief pinned the matrix test asserting `entityId` = the service id; review-task3: "matrix PUTs take `id` from the validated param"). #185's audit rows agree on both sides: `updateAdminStudioService` and BOTH matrix fns write `writeAuditRow(… entityId: id …)` (`admin-entities.ts:441` + both matrix transactions) — so the mutation line and the durable row carry the same id, and the null convention (order PUTs, family-grain) must NOT extend here. `updateAdminStudioService` returns `{ ok: true, row: assembled }` where `assembled.id` === the param id (the `eq(id)` update's returning row) — the expression alignment is value-identical, zero observable change. The update PUT has NO existing test pin (only the branch-matrix PUT does, `admin-mutation-log.test.ts:173-194`); the seed catalog's studio services are `'Photo Recovery'`/`'Tarpaulin & Bulletin Printing'`/`'Portraits & ID Photo'`/`'Picture Framing'` (`packages/db/scripts/catalog.ts:551+`) — `'Retouching'` (the new pin's create) collides with nothing.
- **The nav taxonomy** (`apps/admin/src/lib/nav.ts`): `visibleNavGroups('admin')` returns the module-level `navGroups` array BY REFERENCE (`:82-84`), and the filtered path's fresh arrays still share the item objects. The only consumer is `admin-sidebar.tsx:59` (`const groups = visibleNavGroups(user.role)` — read-only render: `groups.map` → `group.items.map` → reads only). No mutation path exists today (the #188 ledger's own finding); the freeze makes that permanent and loud (ES modules run strict — mutation on frozen data throws) at zero per-call cost, where copy-on-return would allocate per call AND still share items unless deep-copied. The lucide icon values are shared singletons and stay unfrozen (not ours to freeze). **The full freeze edit + its pin were executed live pre-plan** (RED → GREEN → `tsc` clean, 2026-10-11, then reverted): `Object.freeze` on the items arrays returns `readonly NavItem[]`, which tsc refuses to assign to `NavGroup`'s mutable `items` — exactly ONE `as NavItem[]` cast reconciles it (pinned in Task 6 with a do-not-clean-up note).
- **The inert `h-full`** (`apps/admin/src/components/dashboard/system-health.tsx:55`): the primary card's wrapper `<div className='flex h-full flex-col justify-between gap-3'>` sits inside `WidgetFrame` → `CardContent` (`widget-frame.tsx:53`) → `Card` (`packages/ui/src/components/card.tsx`). Neither Card (`flex flex-col`, no height) nor CardContent (a bare `px-(--card-spacing)` div) establishes a height, so the percentage height resolves against an auto-height parent → auto: the class NEVER resolved, today or when a grid sibling grows taller (the #186 Task-5 ratification). Removal is visually a no-op by construction; the div only mounts when `workers.data?.ok` (the not-configured state renders the curated line instead), so even a dev-server check would show nothing without CF env vars. No variant needed (not a new composition — a dead-class deletion).
- **The trailing-slash sensitivity** (`e2e/smoke/production.spec.ts`): `${adminBaseUrl}/login` etc. double-slash on a trailing-slash value, and test 7's `url.origin === adminBaseUrl` wait (`:115`) can never match one — failure is loud RED. `e2e/README.md:9-11` documents slash-free values; the mappings take no user-supplied input (CI GitHub-environment vars). Resolution per the ticket's own sketch: **wontfix by ruling** — the ruling line lands in the close-out comment on #208; no code.
- **Floors on main (documented, re-pinned at Task 1 Step 0):** api **27 files + 1 skipped (28) / 339 passed + 3 skipped** (AGENTS.md:36, post-#209); admin **17 files / 166 tests** (AGENTS.md:38, post-#209); types 14/121; api-client 5/33; landing 9/73. `pnpm check` 35/35, `pnpm build` 7/7. This plan moves them by exactly: **api +1 → 340+3s · admin +7 → 17/173 · landing +1 → 9/74**; types and api-client unchanged.
- **The api suite needs the throwaway test DB on `:5433`** — `lactalink-test-db` (an unrelated project) holds `:5432`; the repo's own compose DB may be down. The #188/#191/#207 pattern: run a `postgres:17` container on :5433, `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test`, the global-setup migrates + truncates itself. Types/admin/landing suites are plain-node — no DB.
- **The working tree carries one pre-existing uncommitted edit**: `apps/admin/package.json` (dev port 3000→3001, an owner-local tweak). It stays uncommitted — every `git add` in this plan names its files; never `git add -A`.
- **`docs/progress.md` is a head-log:** the newest entry sits directly under `# Progress` (line 3 is the 2026-10-11 #207 entry) — Task 8's entry inserts ABOVE it.
- **No new dependencies anywhere.** Every edit is to an existing file; the manifests and `pnpm-lock.yaml` are untouched.

## Global Constraints

- **Exactly three ruled behavior changes (binding); everything else is runtime byte-identical.** (a) A non-finite count aggregate munges to 0 instead of NaN (Task 2); (b) an empty-string `VITE_SENTRY_RELEASE` omits the release key instead of `release: ''` (Task 3); (c) mutating the frozen nav taxonomy throws instead of silently corrupting module state (Task 6). The range hoists (Task 1) are value-identical under one clock read, the studio-service expression alignment (Task 5) is value-identical (`result.row.id === :id` by construction), the PII-floor edit (Task 4) changes a test's mock only, and the `h-full` deletion (Task 7) removes a class that never resolved. If any OTHER gate or test moves because runtime behavior changed, that is a defect — stop and report.
- **TDD where behavior moves (Tasks 1, 2, 3, 6):** the new test lands first, runs RED for the ruled reason (the exact RED shapes are pinned per step), then the src fix turns it green. **Green-on-arrival pins (Tasks 4, 5):** the tightened/new tests assert shipped behavior — expected PASS on first run; a RED pin means the shipped contract differs from the ledger — STOP and report the actual shapes; never edit `src/` to make a pin green, never weaken the pin.
- **The fake-timers vocabulary (spike-proven on vitest 4.1.11):** `vi.useFakeTimers({ toFake: ['Date'], now: <Date> })` — Date ONLY (the suite's own timers stay real); `vi.setSystemTime(<Date>)` to move the faked clock mid-flight; `vi.useRealTimers()` in a `finally`. Explicit-arg `new Date(iso)` stays real under the fake — only the no-arg `new Date()` (windowToRange's default param) is pinned. The `.789+1500→58.000` floor arithmetic is pinned in the Task 1 RED expectations; do not "correct" it to 57.000.
- **Pinned replacement literals (verbatim):** every fenced block below lands content-verbatim, then Biome reflows formatting (`pnpm --filter <pkg> fix` on touched files before every commit; accept its rewrite, never reword strings). The rule comment in `posthog.ts` (counts-0/vitals-null), the release-empty comment in both `sentry.ts`, the convention comment in `admin-studio-services.ts`, and the freeze comment in `nav.ts` are all fenced in full — no executor-authored prose.
- **Floors (Task 1 Step-0 re-pin, then exact deltas):** api 27+1s/339+3s → **27+1s/340+3s** (Task 5, +1); admin 17/166 → **17/173** (Task 1 +2, Task 2 +3, Task 3 +1, Task 6 +1); landing 9/73 → **9/74** (Task 3, +1); types + api-client unchanged; `pnpm check` **35/35** + `pnpm build` **7/7** before the PR. If a Step-0 baseline differs from the documented floor, record the actual and re-derive the deltas before proceeding.
- **Per-call unique emails in new api tests** (the #185 lesson): `mut-ss-a@sevendays.test` / `mut-ss-b@sevendays.test` are unique in `admin-mutation-log.test.ts`.
- **The api test DB is the throwaway container, never the live Supabase, never `lactalink-test-db` on :5432.** Bring it up (Task 1 Step 0), tear it down (Task 8 Step 7). If a healthy `:5433` postgres already answers, reuse it and say so in the report. (The vitest "close timed out" line on green api runs is known noise — not a gate failure.)
- **Docs house rules:** the `docs/progress.md` entry lands at the HEAD of the log (above the 2026-10-11 #207 entry); AGENTS.md floor numbers updated in both spots (:36 api, :38 admin); repo-docs checklist ticks are `- [✅]` (none here — no `docs/plan.md` box in this ticket); the close-out comment maps every AC to its evidence (the issue body's own boxes stay as-filed — the #207 close's practice); every squash-merged PR gets its v1 triage (`docs/agents/v1-picks.md`) — expected verdict **SPLIT** (the metrics/sentry/nav/system-health/appointments/studio-services files all exist on v1 via the #183/#184/#186/#187/#188 picks; docs hunks are main-only); `graphify update .` runs after the code lands but its churn is never committed by this plan (the pre-existing dirty `graphify-out/` state belongs to the owner's next graph commit; every `git add` names its files).
- **Scope fence ("not here"):** NO #192 close-out content (no plan.md M6 box, no exit-criteria text, no Known-Gaps rewrite beyond the dated head entry); NO timestamp assertions added to `posthog.test.ts` (its fetch-contract test asserts none — the straddle class never lived there; new assertions would be new coverage); NO trailing-slash normalization in `e2e/` (item 10 is the ruling line, not code); NO copy-on-return for nav (the freeze is the ruled mechanism; the filtered path's fresh arrays stay as-is); NO `h-full` wiring (removal only — wiring a height chain is a layout feature, not hardening); NO e2e walk in this ticket (`pnpm check` + `pnpm build` are the gates; smoke dispatch runs are the owner's); NO new dependency, manifest, migration, env/secret, api-client, or types change; NO `apps/admin/package.json` commit (the pre-existing port tweak stays uncommitted).
- **Plan file target:** `docs/superpowers/plans/2026-10-11-208-m6-hardening-pass.md` (this file).

---

### Task 1: The `windowToRange` straddle family dies — one range per fetch, `Date` pinned in the contract tests

**Files:**
- Modify: `apps/admin/src/lib/metrics/cf.ts:142-148` (`fetchOneSeries` gains a `range` param, drops its own `windowToRange` call) and `:185-209` (`fetchWorkerMetrics` computes the range once)
- Modify: `apps/admin/src/lib/metrics/r2.ts:171-188` (`fetchR2Dataset` gains a `range` param, drops `window` + its own call) and `:206-241` (`fetchStorageMetrics` computes the range once)
- Modify: `apps/admin/src/lib/metrics/cf.test.ts:154-194` (the fetch-contract test gains the fake-`Date` pin) + one new `it` appended in the same describe (the single-range pin)
- Modify: `apps/admin/src/lib/metrics/r2.test.ts:156-215` (same two edits)

**Interfaces:**
- Consumes: `windowToRange(window, now?)` — the export is UNCHANGED (signature and behavior); `vi.useFakeTimers`/`vi.setSystemTime`/`vi.useRealTimers` from vitest 4.1.11 (spike-proven).
- Produces: `fetchOneSeries(cf, scriptName, window, range, fetchImpl)` and `fetchR2Dataset(r2, query, dataset, range, fetchImpl)` — both module-PRIVATE (no test or sibling imports them; signatures change freely). The exported `fetchWorkerMetrics`/`fetchStorageMetrics` signatures are unchanged. Admin floor at this task's gate: **17 files / 168 tests** (+2).

- [ ] **Step 0: Cut the branch, bring up the test DB, re-pin every baseline**

```bash
cd /home/jeius/Projects/sevendays
git checkout main && git pull --ff-only
git log --oneline -1   # expect a2ee12c or later
git checkout -b feat/208-m6-hardening-pass
pnpm install && pnpm build:packages
docker ps --format '{{.Names}} {{.Ports}}' | grep 5433 || docker run -d --name sevendays-test-hardening \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sevendays_test -p 5433:5432 postgres:17
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/types test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/landing test 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: api `27 passed | 1 skipped (28)` / `339 passed | 3 skipped (342)`; types `14 passed (14)` / `121 passed`; admin `17 passed (17)` / `166 passed`; landing `9 passed (9)` / `73 passed`. (The container stays up for the whole branch — every later api run and the final `pnpm check` need it; teardown is Task 8 Step 7. Never touch `lactalink-test-db` on `:5432`; never point at any Supabase URL.) If a floor moved, record the actual and re-derive the deltas in Global Constraints before continuing.

- [ ] **Step 1: Write the failing single-range test in `cf.test.ts`**

Change the vitest import (line 6) from:

```ts
import { describe, expect, it } from 'vitest';
```

to:

```ts
import { describe, expect, it, vi } from 'vitest';
```

Then append this `it` INSIDE `describe('fetchWorkerMetrics', …)`, after the `it('posts the pinned document with bearer auth, one fetch per script, and munges each', …)` block:

```ts
  it('computes the range ONCE — all three scripts share it even when the wall clock crosses a second boundary mid-flight (#208)', async () => {
    const pinned = new Date('2026-10-06T12:34:56.789Z');
    const variables: Array<Record<string, unknown>> = [];
    let call = 0;
    const fetchImpl = async (_url: unknown, init: RequestInit) => {
      call += 1;
      const body = JSON.parse(String(init.body)) as { variables: Record<string, unknown> };
      variables.push(body.variables);
      // Walk the faked clock PAST a second boundary between arms: with
      // per-arm windowToRange calls the later documents carry shifted
      // ranges; one range computed before the Promise.all cannot move.
      vi.setSystemTime(new Date(pinned.getTime() + call * 1500));
      return {
        ok: true,
        json: async () => ({
          data: { viewer: { accounts: [{ workersInvocationsAdaptive: [] }] } },
        }),
      };
    };
    vi.useFakeTimers({ toFake: ['Date'], now: pinned });
    try {
      const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
      expect(result).toMatchObject({ ok: true });
      expect(variables).toHaveLength(3);
      const expected = windowToRange('7d', pinned);
      for (const vars of variables) {
        expect(vars.since).toBe(expected.since);
        expect(vars.until).toBe(expected.until);
      }
    } finally {
      vi.useRealTimers();
    }
  });
```

- [ ] **Step 2: Run it — expect RED for the straddle**

```bash
cd apps/admin && pnpm exec vitest run src/lib/metrics/cf.test.ts 2>&1 | grep -E "✓|×|passed|failed" | tail -12
```

Expected: **1 failed** — the second arm's `since` mismatches: `expected '2026-09-29T12:34:58.000Z' to be '2026-09-29T12:34:56.000Z'` (arm 1 reads the clock at the pinned `56.789` → until `56.000`; arm 2 reads it after one `+1500` advance — `58.289` → until `58.000`, since `58.000 − 7d`). The `.789` remainder is why +1500 ms floors to 58, not 57. Any other failure shape: stop and report.

- [ ] **Step 3: Fix `cf.ts` — compute the range once, share it across the three arms**

In `fetchOneSeries`, change the signature and the variables block (the rest of the function body is unchanged). Replace:

```ts
async function fetchOneSeries(
  cf: CfAnalyticsConfig,
  scriptName: string,
  window: MetricsWindow,
  fetchImpl: typeof fetch
): Promise<WorkerSeries> {
  const { since, until } = windowToRange(window);
```

with:

```ts
async function fetchOneSeries(
  cf: CfAnalyticsConfig,
  scriptName: string,
  window: MetricsWindow,
  range: { since: string; until: string },
  fetchImpl: typeof fetch
): Promise<WorkerSeries> {
```

and in its fetch body replace:

```ts
      variables: {
        accountTag: cf.accountId,
        scriptName,
        since,
        until,
      },
```

with:

```ts
      variables: {
        accountTag: cf.accountId,
        scriptName,
        ...range,
      },
```

Then in `fetchWorkerMetrics`, replace the `try` block's head:

```ts
  try {
    const [api, landing, admin] = await Promise.all([
      fetchOneSeries(cf, cf.scripts.api, window, fetchImpl),
      fetchOneSeries(cf, cf.scripts.landing, window, fetchImpl),
      fetchOneSeries(cf, cf.scripts.admin, window, fetchImpl),
    ]);
```

with:

```ts
  try {
    // #208: the range is computed ONCE and shared by all three scripts —
    // per-arm windowToRange calls could straddle a wall-clock second
    // boundary and send the documents' ranges 1s apart (the #187 ledger's
    // real-code straddle; posthog.ts's fetchTrafficMetrics is the
    // computed-once precedent).
    const range = windowToRange(window);
    const [api, landing, admin] = await Promise.all([
      fetchOneSeries(cf, cf.scripts.api, window, range, fetchImpl),
      fetchOneSeries(cf, cf.scripts.landing, window, range, fetchImpl),
      fetchOneSeries(cf, cf.scripts.admin, window, range, fetchImpl),
    ]);
```

- [ ] **Step 4: Run — expect GREEN (both its in the file)**

```bash
pnpm exec vitest run src/lib/metrics/cf.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: `1 passed` files / `15 passed` tests (the file's 14 + the new pin).

- [ ] **Step 5: Pin the cf fetch-contract test with the fake-`Date` pin**

In the SAME describe, wrap the existing `it('posts the pinned document with bearer auth, one fetch per script, and munges each', …)` body so the whole test runs under a pinned clock. The full replacement `it` (content verbatim — the inner assertions are unchanged; only the timer bracket is new):

```ts
  it('posts the pinned document with bearer auth, one fetch per script, and munges each', async () => {
    // #208: Date is pinned for the whole test — the assertion recomputes
    // windowToRange at assert time, and a wall-clock second boundary
    // between the impl's call and that recompute was the once-seen #187
    // flake. Under the pinned clock both reads are the same instant.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-06T12:34:56.789Z') });
    try {
      const calls: Array<{ url: unknown; init: RequestInit }> = [];
      const fetchImpl = async (url: unknown, init: RequestInit) => {
        calls.push({ url, init });
        return {
          ok: true,
          json: async () => ({
            data: {
              viewer: {
                accounts: [
                  {
                    workersInvocationsAdaptive: [
                      row('2026-10-06T11:00:00Z', { requests: 3, errors: 0 }, { p50: 0, p99: 0 }),
                    ],
                  },
                ],
              },
            },
          }),
        };
      };
      const result = await fetchWorkerMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
      expect(result).toMatchObject({ ok: true });
      if (!result.ok) throw new Error('unreachable');
      expect(result.data.api.scriptName).toBe('sevendays-api');
      expect(result.data.landing.scriptName).toBe('sevendays-landing');
      expect(result.data.admin.scriptName).toBe('sevendays-admin');
      expect(calls).toHaveLength(3);
      const first = calls[0];
      if (!first) throw new Error('unreachable');
      expect(first.url).toBe(CF_GRAPHQL_URL);
      expect(new Headers(first.init.headers).get('authorization')).toBe('Bearer cf-token');
      const body = JSON.parse(String(first.init.body));
      expect(body.query).toBe(WORKER_INVOCATIONS_QUERY);
      expect(body.variables).toEqual({
        accountTag: 'account-id',
        scriptName: 'sevendays-api',
        since: windowToRange('7d').since,
        until: windowToRange('7d').until,
      });
    } finally {
      vi.useRealTimers();
    }
  });
```

(The assertion's `windowToRange('7d')` recompute now reads the SAME pinned instant the impl read — deterministic forever.)

- [ ] **Step 6: Write the failing single-range test in `r2.test.ts`**

Change the vitest import (line 7) from:

```ts
import { describe, expect, it } from 'vitest';
```

to:

```ts
import { describe, expect, it, vi } from 'vitest';
```

Then append this `it` INSIDE `describe('fetchStorageMetrics', …)`, after the `it('posts both documents with bearer auth and the bucket-scoped variables, then munges the union', …)` block:

```ts
  it('computes the range ONCE — both documents share it even when the wall clock crosses a second boundary mid-flight (#208)', async () => {
    const pinned = new Date('2026-10-06T12:34:56.789Z');
    const variables: Array<Record<string, unknown>> = [];
    let call = 0;
    const fetchImpl = async (_url: unknown, init: RequestInit) => {
      call += 1;
      const body = JSON.parse(String(init.body)) as { variables: Record<string, unknown> };
      variables.push(body.variables);
      // Same probe as cf.test.ts: cross a second boundary between the two
      // documents' arms — per-arm windowToRange calls shift the second
      // document's range; one computed range cannot move.
      vi.setSystemTime(new Date(pinned.getTime() + call * 1500));
      return {
        ok: true,
        json: async () => ({
          data: { viewer: { accounts: [{ r2OperationsAdaptiveGroups: [] }] } },
        }),
      };
    };
    vi.useFakeTimers({ toFake: ['Date'], now: pinned });
    try {
      const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
      expect(result).toMatchObject({ ok: true });
      expect(variables).toHaveLength(2);
      const expected = windowToRange('7d', pinned);
      for (const vars of variables) {
        expect(vars.since).toBe(expected.since);
        expect(vars.until).toBe(expected.until);
      }
    } finally {
      vi.useRealTimers();
    }
  });
```

(The stub answers the ops shape for both calls; the storage arm's dataset key misses and `fetchR2Dataset` falls back to `[]` — the munges handle empty rows, so the result stays `ok: true`.)

- [ ] **Step 7: Run it — expect RED for the straddle**

```bash
pnpm exec vitest run src/lib/metrics/r2.test.ts 2>&1 | grep -E "✓|×|passed|failed" | tail -12
```

Expected: **1 failed** — the second document's `since` mismatches: `expected '2026-09-29T12:34:58.000Z' to be '2026-09-29T12:34:56.000Z'`.

- [ ] **Step 8: Fix `r2.ts` — compute the range once, share it across the two documents**

In `fetchR2Dataset`, replace the signature and the `windowToRange` line:

```ts
async function fetchR2Dataset<T>(
  r2: R2AnalyticsConfig,
  query: string,
  dataset: 'r2OperationsAdaptiveGroups' | 'r2StorageAdaptiveGroups',
  window: MetricsWindow,
  fetchImpl: typeof fetch
): Promise<T[]> {
  const { since, until } = windowToRange(window);
```

with:

```ts
async function fetchR2Dataset<T>(
  r2: R2AnalyticsConfig,
  query: string,
  dataset: 'r2OperationsAdaptiveGroups' | 'r2StorageAdaptiveGroups',
  range: { since: string; until: string },
  fetchImpl: typeof fetch
): Promise<T[]> {
```

and in its fetch body replace:

```ts
      variables: { accountTag: r2.accountId, bucketName: r2.bucket, since, until },
```

with:

```ts
      variables: { accountTag: r2.accountId, bucketName: r2.bucket, ...range },
```

(`window` was only ever used for the range — the param goes; the `MetricsWindow` type import at `r2.ts:12` is still used by `mungeR2Storage`/`storageBucketStart`, so the import stays.) Then in `fetchStorageMetrics`, replace the `try` block's head:

```ts
  try {
    const [opsRows, storageRows] = await Promise.all([
      fetchR2Dataset<R2OpsRow>(r2, R2_OPS_QUERY, 'r2OperationsAdaptiveGroups', window, fetchImpl),
      fetchR2Dataset<R2StorageRow>(
        r2,
        R2_STORAGE_QUERY,
        'r2StorageAdaptiveGroups',
        window,
        fetchImpl
      ),
    ]);
```

with:

```ts
  try {
    // #208: ONE range for both documents (the #187 ledger's real-code
    // straddle — per-arm windowToRange calls could straddle a second
    // boundary and send the two documents' ranges 1s apart).
    const range = windowToRange(window);
    const [opsRows, storageRows] = await Promise.all([
      fetchR2Dataset<R2OpsRow>(r2, R2_OPS_QUERY, 'r2OperationsAdaptiveGroups', range, fetchImpl),
      fetchR2Dataset<R2StorageRow>(
        r2,
        R2_STORAGE_QUERY,
        'r2StorageAdaptiveGroups',
        range,
        fetchImpl
      ),
    ]);
```

- [ ] **Step 9: Run — expect GREEN (both its in the file)**

```bash
pnpm exec vitest run src/lib/metrics/r2.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: `1 passed` files / `15 passed` tests (the file's 14 + the new pin).

- [ ] **Step 10: Pin the r2 fetch-contract test with the fake-`Date` pin**

In the same describe, replace the whole `it('posts both documents with bearer auth and the bucket-scoped variables, then munges the union', …)` block with (content verbatim — the inner assertions are unchanged; only the timer bracket is new):

```ts
  it('posts both documents with bearer auth and the bucket-scoped variables, then munges the union', async () => {
    // #208: Date is pinned — the variables assertion recomputes
    // windowToRange at assert time; the pinned clock makes the impl's
    // read and the recompute the same instant (the once-seen #187 flake).
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-06T12:34:56.789Z') });
    try {
      const calls: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }> = [];
      const fetchImpl = async (url: unknown, init: RequestInit) => {
        calls.push({ url: String(url), init, body: JSON.parse(String(init.body)) });
        const which = calls.length;
        return {
          ok: true,
          json: async () => ({
            data: {
              viewer: {
                accounts: [
                  which === 1
                    ? {
                        r2OperationsAdaptiveGroups: [
                          { dimensions: { actionType: 'PutObject' }, sum: { requests: 40 } },
                          { dimensions: { actionType: 'GetObject' }, sum: { requests: 900 } },
                        ],
                      }
                    : {
                        r2StorageAdaptiveGroups: [
                          {
                            dimensions: { datetime: '2026-10-06T11:00:00.000Z' },
                            max: {
                              objectCount: 12,
                              uploadCount: 0,
                              payloadSize: 1_000_000,
                              metadataSize: 1024,
                            },
                          },
                        ],
                      },
                ],
              },
            },
          }),
        };
      };
      const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
      expect(result).toEqual({
        ok: true,
        data: {
          trend: [
            { bucketStart: '2026-10-06T00:00:00.000Z', objectCount: 12, payloadSizeBytes: 1_000_000 },
          ],
          latestObjectCount: 12,
          latestPayloadSizeBytes: 1_000_000,
          ops: { classA: 40, classB: 900 },
        },
      });
      expect(calls).toHaveLength(2);
      expect(calls[0]?.url).toBe(CF_GRAPHQL_URL);
      expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe('Bearer cf-token');
      expect(calls[0]?.body.variables).toEqual({
        accountTag: 'account-id',
        bucketName: 'sevendays-media',
        since: windowToRange('7d').since,
        until: windowToRange('7d').until,
      });
      expect(calls[1]?.body.query).toBe(R2_STORAGE_QUERY);
    } finally {
      vi.useRealTimers();
    }
  });
```

- [ ] **Step 11: Full admin suite — the exact new floor — then commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/admin fix
```

Expected: `17 passed (17)` files / **`168 passed`** tests — exactly +2 (the two single-range pins; the two contract-test pins modify existing tests in place). Anything else: a pre-existing test was disturbed — stop and report.

```bash
git add apps/admin/src/lib/metrics/cf.ts apps/admin/src/lib/metrics/r2.ts apps/admin/src/lib/metrics/cf.test.ts apps/admin/src/lib/metrics/r2.test.ts
git commit -m "fix(admin): the windowToRange straddle family dies — one range per fetch, Date pinned in the contract tests"
```

### Task 2: The three count munges route through the `numOrNull` guard

**Files:**
- Modify: `apps/admin/src/lib/metrics/posthog.ts:142-176` (the `numOrNull` ruling comment + the three munges)
- Modify: `apps/admin/src/lib/metrics/posthog.test.ts` (three new `it`s appended inside `describe('the munging', …)`, after the `mungeTopPages` it)

**Interfaces:**
- Consumes: `numOrNull` (`posthog.ts:142-146`, module-private — stays private; the munges live in the same module).
- Produces: the munges' exported signatures and the `TrafficPoint`/`TopPage` types are UNCHANGED (counts stay `number`). Admin floor at this task's gate: **17 files / 171 tests** (+3).

- [ ] **Step 1: Write the three failing tests**

Append inside `describe('the munging', …)` in `posthog.test.ts`, after the `it('mungeTopPages keeps order and folds null paths to (no path)', …)` block:

```ts
  it('mungeTrafficSeries routes a non-finite aggregate through the guard → 0, never NaN (#208)', () => {
    expect(
      mungeTrafficSeries([{ day: '2026-10-06 00:00:00', pageviews: 'not-a-number', uniques: {} }])
    ).toEqual([{ bucketStart: '2026-10-06T00:00:00.000Z', pageviews: 0, uniques: 0 }]);
  });

  it('mungeWindowTotals routes a non-finite aggregate through the guard → 0, never NaN (#208)', () => {
    expect(mungeWindowTotals([{ pageviews: 'not-a-number', uniques: {} }])).toEqual({
      pageviews: 0,
      uniques: 0,
    });
  });

  it('mungeTopPages routes a non-finite aggregate through the guard → 0, never NaN (#208)', () => {
    expect(mungeTopPages([{ path: '/packages', pageviews: 'not-a-number' }])).toEqual([
      { path: '/packages', pageviews: 0 },
    ]);
  });
```

(`Number('not-a-number')` and `Number({})` are both `NaN` — the discriminators a live probe could ever surface.)

- [ ] **Step 2: Run them — expect RED ×3**

```bash
cd apps/admin && pnpm exec vitest run src/lib/metrics/posthog.test.ts 2>&1 | grep -E "✓|×|passed|failed" | tail -12
```

Expected: **3 failed** — each `toEqual` diffs `pageviews: NaN` (and/or `uniques: NaN`) against the expected `0` (`toEqual` does not treat NaN as 0). The document-builder and fetch-contract tests in the file stay green.

- [ ] **Step 3: Route the three munges through `numOrNull`**

In `posthog.ts`, first extend the guard's comment. Replace:

```ts
function numOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
```

with:

```ts
// #208: the count munges route through this guard too — a non-finite
// aggregate resolves to the ruled 0 (a count is zero when unknown; the
// ?? 0 on missing already said so); the vitals keep null (a measurement
// is absent, not zero).
function numOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
```

Then replace the three munges:

```ts
export function mungeTrafficSeries(rows: Record<string, unknown>[]): TrafficPoint[] {
  return rows
    .map((row) => ({
      bucketStart: normalizeHogqlTimestamp(row.day),
      pageviews: numOrNull(row.pageviews) ?? 0,
      uniques: numOrNull(row.uniques) ?? 0,
    }))
    .filter((point): point is TrafficPoint => point.bucketStart !== null)
    .sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
}

export function mungeWindowTotals(rows: Record<string, unknown>[]): {
  pageviews: number;
  uniques: number;
} {
  const row = rows[0] ?? {};
  return { pageviews: numOrNull(row.pageviews) ?? 0, uniques: numOrNull(row.uniques) ?? 0 };
}

export function mungeTopPages(rows: Record<string, unknown>[]): TopPage[] {
  return rows.map((row) => ({
    path: pathOrNull(row.path),
    pageviews: numOrNull(row.pageviews) ?? 0,
  }));
}
```

(`mungeVitals` is untouched — `numOrNull` without the `?? 0` is its existing, correct shape.)

- [ ] **Step 4: Run — expect GREEN, then the full admin suite at the exact floor**

```bash
pnpm exec vitest run src/lib/metrics/posthog.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/admin fix
```

Expected: the file `1 passed` / `22 passed` (its 19 + 3 — corrected post-execution: the file carried 19 pre-existing its, not 18); the suite `17 passed (17)` files / **`171 passed`** tests — exactly +3. The pre-existing munge tests stay green (`numOrNull('5')` is `5`; `numOrNull(12)` is `12`; the empty-totals case's `undefined` → `null` → `0`).

```bash
git add apps/admin/src/lib/metrics/posthog.ts apps/admin/src/lib/metrics/posthog.test.ts
git commit -m "fix(admin): the three count munges route through numOrNull — non-finite aggregates resolve to 0"
```

### Task 3: The empty-string release is unset — both frontends

**Files:**
- Modify: `apps/admin/src/lib/sentry.ts:31` (the release spread condition) + `apps/landing/src/lib/sentry.ts` (the identical line)
- Modify: `apps/admin/src/lib/sentry.test.ts` (one new `it` after the existing omit test) + `apps/landing/src/lib/sentry.test.ts` (the identical `it` — the two test files are tag-identical)

**Interfaces:**
- Consumes: `buildSentryOptions({ dsn, release?, environment? })` — signature UNCHANGED; `SentryFrontendInit` type UNCHANGED (`release?: string`).
- Produces: `release: ''` (present-but-empty) now omits the key — the ruled behavior change (b) of Global Constraints. Floors at this task's gate: admin **17/172** (+1), landing **9/74** (+1).

- [ ] **Step 1: Write the failing test in the admin suite**

Append inside `describe('buildSentryOptions (M6 #184)', …)` in `apps/admin/src/lib/sentry.test.ts`, after the `it('omits the release key entirely when unset (no empty-string release tag)', …)` block:

```ts
  it('treats an empty-string release as unset too — the key is omitted, never release: "" (#208)', () => {
    const options = buildSentryOptions({
      dsn: 'https://key@o0.ingest.sentry.io/0',
      release: '',
      environment: 'v1',
    });
    expect(options && 'release' in options).toBe(false);
  });
```

- [ ] **Step 2: Run it — expect RED**

```bash
cd apps/admin && pnpm exec vitest run src/lib/sentry.test.ts 2>&1 | grep -E "✓|×|passed|failed" | tail -8
```

Expected: **1 failed** — `expected true to be false` (the current `!== undefined` condition lets `''` through, so the key IS present).

- [ ] **Step 3: Fix the admin `sentry.ts`**

In `apps/admin/src/lib/sentry.ts`, replace:

```ts
    ...(input.release !== undefined ? { release: input.release } : {}),
```

with:

```ts
    // #208: an empty-string release is unset too — a CI var that renders
    // empty must not tag events with release: '' (the #184 ledger's edge).
    ...(input.release ? { release: input.release } : {}),
```

(The falsy check matches the file's own `if (!input.dsn) return null` idiom; `undefined` and `''` both omit, any non-empty string includes.)

- [ ] **Step 4: Run — expect GREEN (all five its in the file)**

```bash
pnpm exec vitest run src/lib/sentry.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: `1 passed` / `5 passed` (the file's 4 + the new pin; the undefined-omits and abc123-includes pins stay green).

- [ ] **Step 5: Mirror the test + fix to the landing app**

Apply the SAME two edits to the landing app — the new `it` appended at the same spot in `apps/landing/src/lib/sentry.test.ts`, and in `apps/landing/src/lib/sentry.ts` the same replacement of the `...(input.release !== undefined …)` line with the same comment + falsy-condition spread (the two `sentry.ts` files differ only in the `app` tag, which this edit does not touch).

```bash
cd ../landing && pnpm exec vitest run src/lib/sentry.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: `1 passed` / `5 passed`.

- [ ] **Step 6: Both suites at the exact floors — then commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/landing test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/admin fix && pnpm --filter @sevendays/landing fix
```

Expected: admin `17 passed (17)` / **`172 passed`** (+1); landing `9 passed (9)` / **`74 passed`** (+1).

```bash
git add apps/admin/src/lib/sentry.ts apps/admin/src/lib/sentry.test.ts apps/landing/src/lib/sentry.ts apps/landing/src/lib/sentry.test.ts
git commit -m "fix(admin,landing): an empty-string VITE_SENTRY_RELEASE is unset — the release key is omitted, never ''"
```

### Task 4: The PII floor discriminates — the mocked free text echoes the recipient

**Files:**
- Modify: `apps/api/test/appointments.test.ts:775-802` (the typed-Resend-failure capture test — its mock and its PII assertions tighten; NO src change)

**Interfaces:**
- Consumes: the test's existing helpers (`sendMock`, `fakeExecCtx`, `postBooking`, `setErrorCapture`, `ResendRejectionError`) — all unchanged.
- Produces: no api floor movement (a test modified in place, none added — the gate stays 27+1s files / 339+3s until Task 5). This is a **green-on-arrival pin-tightening**: the captured message is classified by construction (`confirmation-email.ts:234` discards resend's free text), so the strengthened test PASSES against shipped behavior — with a discriminator that can now actually fail.

- [ ] **Step 0: Re-pin the api baseline (the `:5433` container is up from Task 1 Step 0)**

```bash
cd /home/jeius/Projects/sevendays
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: `27 passed | 1 skipped (28)` files / `339 passed | 3 skipped (342)` tests — the AGENTS.md floor.

- [ ] **Step 1: Tighten the test — recipient-echoing mock + the classified-message pin**

In `apps/api/test/appointments.test.ts`, replace the whole `it('a typed Resend failure is captured at the send seam (M6 #184) — the original error, recipient-free; a successful send is not captured', …)` block with:

```ts
  it('a typed Resend failure is captured at the send seam (M6 #184) — the original error, recipient-free; a successful send is not captured', async () => {
    const captured: unknown[] = [];
    setErrorCapture((error) => captured.push(error));
    // Success leg first: the beforeEach default sendMock resolves ok — a
    // completed booking must never reach Sentry (failures only).
    const okCtx = fakeExecCtx();
    expect((await postBooking(okCtx)).status).toBe(201);
    await Promise.all(okCtx.promises);
    expect(captured).toHaveLength(0);
    // Failure leg: the SDK's real shape — it resolves { data: null, error },
    // and the send seam reifies it as ResendRejectionError. #208: the free
    // text now ECHOES THE RECIPIENT (resend's real failure messages can),
    // so the PII floor below actually discriminates — the #184 floor was
    // weak because a PII-free mock message could never fail it.
    sendMock.mockResolvedValue({
      data: null,
      error: {
        message: 'internal error sending to ana@example.com',
        statusCode: 500,
        name: 'internal_server_error',
      },
    });
    const failCtx = fakeExecCtx();
    const res = await postBooking(failCtx);
    expect(res.status).toBe(201); // booking stands — capture rides the catch
    await Promise.all(failCtx.promises);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeInstanceOf(ResendRejectionError);
    expect((captured[0] as ResendRejectionError).rejectionName).toBe('internal_server_error');
    // PII floor, now discriminating: the captured message is the CLASSIFIED
    // line (built from the rejection name alone) — resend's recipient-
    // echoing free text never rides the capture.
    expect((captured[0] as Error).message).toBe(
      'resend rejected the send (internal_server_error)'
    );
    expect((captured[0] as Error).message).not.toContain('ana@example.com');
  });
```

- [ ] **Step 2: Run the file — expect PASS (green-on-arrival)**

```bash
cd apps/api && TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm exec vitest run test/appointments.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: the file passes — the capture rides `ResendRejectionError` whose message is the classified literal (resend's `message` field is discarded at `confirmation-email.ts:234`). A RED result means the capture rides free text somewhere — STOP and report the actual captured message; never edit `src/` and never weaken the pin.

- [ ] **Step 3: Full api suite — floor unchanged — then commit**

```bash
cd /home/jeius/Projects/sevendays
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/api fix
```

Expected: `27 passed | 1 skipped (28)` files / `339 passed | 3 skipped (342)` tests — unchanged (a modified test, not a new one).

```bash
git add apps/api/test/appointments.test.ts
git commit -m "test(api): the PII floor discriminates — the mocked resend free text echoes the recipient, the capture pins the classified line"
```

### Task 5: The studio-service update PUT aligns to the sibling convention — and the convention is pinned

**Files:**
- Modify: `apps/api/test/admin-mutation-log.test.ts` (one new green-on-arrival `it` appended after the branch-matrix test)
- Modify: `apps/api/src/routes/admin-studio-services.ts:23-25` (the header comment extension) and `:64` (the expression alignment)

**Interfaces:**
- Consumes: the test file's existing helpers (`captureLines()`, `mutations()`, `authed()`, the fixture `ids`) — all unchanged; `updateAdminStudioService`'s `{ ok: true, row: assembled }` result (assembled carries `.id`).
- Produces: the api floor **27+1s files / 340+3s tests** (exactly +1) — Task 8's AGENTS.md rotation pins this number. The emitted log lines are byte-identical before and after the expression change (`result.row.id === :id` by construction — the `eq(id)` update's returning row).

- [ ] **Step 1: Write the green-on-arrival pin**

Append inside the `describe('admin_mutation events …')` in `admin-mutation-log.test.ts`, immediately after the `it('the studio-service branch-matrix PUT → one line with the :id/branches pattern and the service id', …)` block:

```ts
  it('the studio-service update PUT emits the updated row id — the sibling-routers convention, pinned (#208)', async () => {
    const lines = captureLines();
    const created = await authed(
      'POST',
      '/api/v1/admin/studio-services',
      'mut-ss-a@sevendays.test',
      { name: 'Retouching', description: 'Retouch and restore', priceCents: 6000 }
    );
    const { id } = (await created.json()) as { id: string };
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${id}`,
      'mut-ss-b@sevendays.test',
      {
        name: 'Retouching',
        description: 'Retouch, restore, and colorize',
        priceCents: 6500,
      }
    );
    expect(res.status).toBe(200);
    const updated = (await res.json()) as { id: string };
    expect(updated.id).toBe(id); // the eq(id) update returns the same row
    const putLines = mutations(lines).filter((line) => line.method === 'PUT');
    expect(putLines).toHaveLength(1);
    expect(putLines[0]?.entity).toBe('studio-service');
    expect(putLines[0]?.entityId).toBe(updated.id);
    expect(putLines[0]?.route).toBe('/api/v1/admin/studio-services/:id');
  });
```

(`'Retouching'` collides with no seeded studio service — the catalog seeds are `'Photo Recovery'`/`'Tarpaulin & Bulletin Printing'`/`'Portraits & ID Photo'`/`'Picture Framing'`; the emails are unique in the file per the #185 lesson.)

- [ ] **Step 2: Run the file — expect PASS (green-on-arrival, both before and after Step 3)**

```bash
cd apps/api && TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm exec vitest run test/admin-mutation-log.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
```

Expected: the file passes — the emitted `entityId` is the service id under EITHER expression (the value is identical). A RED pin means the emission contract moved — STOP and report.

- [ ] **Step 3: Align the expression + document the convention**

In `apps/api/src/routes/admin-studio-services.ts`, replace the header comment (lines 23-25):

```ts
// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. The two
// matrix PUTs ride the same gate (routes/admin.ts's ONE requireSession); each
// answers the refreshed canonical read, so the editor state round-trips.
```

with:

```ts
// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. The two
// matrix PUTs ride the same gate (routes/admin.ts's ONE requireSession); each
// answers the refreshed canonical read, so the editor state round-trips.
// #208: the entityId convention, documented — the update PUT emits
// result.row.id (the eight sibling routers' shape, #183's brief table);
// the two matrix PUTs emit the validated param id (the brief's own
// ruling — the mutation is keyed by the service, and #185's audit row
// carries the same id on every path, so the ephemeral line and the
// durable row never diverge; the order PUTs' null is the family-grain
// convention and does not extend here).
```

Then in the update PUT handler, replace (line 64):

```ts
      logAdminMutation(c, { entity: 'studio-service', entityId: id });
      return c.json(result.row);
    }
  )
  .put(
    '/:id/branches',
```

with:

```ts
      logAdminMutation(c, { entity: 'studio-service', entityId: result.row.id });
      return c.json(result.row);
    }
  )
  .put(
    '/:id/branches',
```

(The two matrix sites at `:82` and `:105` KEEP `entityId: id` — the brief-ruled param id; they are deliberately untouched.)

- [ ] **Step 4: Re-run the file + the full api suite — the exact new floor**

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm exec vitest run test/admin-mutation-log.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
cd /home/jeius/Projects/sevendays
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test \
  pnpm --filter @sevendays/api test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/api fix
```

Expected: the file passes (value-identical change); the suite `27 passed | 1 skipped (28)` files / **`340 passed | 3 skipped (343)`** tests — exactly +1.

```bash
git add apps/api/test/admin-mutation-log.test.ts apps/api/src/routes/admin-studio-services.ts
git commit -m "chore(api): the studio-service update PUT aligns to the sibling result.row.id convention; the matrix param-id ruling documented"
```

### Task 6: The nav taxonomy freezes read-only

**Files:**
- Modify: `apps/admin/src/lib/nav.ts:49-92` (the taxonomy literal becomes module-private, the export is the deep-frozen structure, `visibleNavGroups`'s return type widens to `readonly`)
- Modify: `apps/admin/src/lib/nav.test.ts` (one new `it` appended inside the describe)

**Interfaces:**
- Consumes: nothing new (the freeze is `Object.freeze`, three levels deep — the outer array, the group objects, the items arrays, the item objects; the lucide icon VALUES stay unfrozen — shared singletons).
- Produces: `navGroups: readonly NavGroup[]` and `visibleNavGroups(role): readonly NavGroup[]` — the only consumer (`admin-sidebar.tsx:59`) reads (renders) and compiles unchanged. Admin floor at this task's gate: **17 files / 173 tests** (+1). The ruled behavior change (c): mutation on the taxonomy now THROWS (ES modules run strict).

- [ ] **Step 1: Write the failing freeze pin**

Append inside `describe('visibleNavGroups (the ADR-0018 gate)', …)` in `nav.test.ts`:

```ts
  it('the taxonomy is frozen read-only — the admin path hands back the same array, and mutation throws (#208)', () => {
    expect(visibleNavGroups('admin')).toBe(navGroups); // the by-reference fast path
    expect(Object.isFrozen(navGroups)).toBe(true);
    for (const group of navGroups) {
      expect(Object.isFrozen(group)).toBe(true);
      expect(Object.isFrozen(group.items)).toBe(true);
      for (const item of group.items) {
        expect(Object.isFrozen(item)).toBe(true);
      }
    }
    const first = navGroups[0];
    if (!first) throw new Error('unreachable');
    const items = first.items as unknown as unknown[];
    expect(() => items.push({})).toThrow();
  });
```

- [ ] **Step 2: Run it — expect RED**

```bash
cd apps/admin && pnpm exec vitest run src/lib/nav.test.ts 2>&1 | grep -E "✓|×|passed|failed" | tail -8
```

Expected: **1 failed** — the `Object.isFrozen(navGroups)` assertion reads `false` (`expected false to be true` — the raw literal is not frozen today; the earlier `toBe(navGroups)` reference pin passes because the fast path already returns the same array).

- [ ] **Step 3: Freeze the taxonomy**

In `nav.ts`, replace the export + filter tail of the file (from the `// The ruled taxonomy (#59)` comment through the end) with:

```ts
// The ruled taxonomy (#59), icons carried from the prototype unchanged.
// Overview carries the Analytics dashboard (#186) and — owner-only — the
// Audit Log (#188, beside Analytics); Appointments stays the v2 teaser
// stub; Catalog and Studio carry the live CMS surfaces. #208: FROZEN
// read-only — visibleNavGroups('admin') hands this very array back by
// reference (and the filtered path's fresh arrays share the item
// objects), so a mutating caller would corrupt the module state every
// render reads; frozen data throws on mutation instead (modules run
// strict). No caller mutates today — the freeze makes that permanent
// and loud. The lucide icon values stay unfrozen: shared singletons,
// not ours to freeze.
const taxonomy: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Analytics', icon: Activity },
      { to: '/audit-log', label: 'Audit Log', icon: ScrollText, ownerOnly: true },
      { to: '/appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { to: '/packages', label: 'Packages', icon: Package },
      { to: '/add-ons', label: 'Add-ons', icon: PlusCircle },
      { to: '/studio-services', label: 'Studio services', icon: Wrench },
      { to: '/gallery', label: 'Gallery', icon: Images },
      { to: '/testimonials', label: 'Testimonials', icon: Quote },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { to: '/branches', label: 'Branches', icon: MapPin },
      { to: '/lookups', label: 'Lookups', icon: Tags },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const navGroups: readonly NavGroup[] = Object.freeze(
  taxonomy.map((group) =>
    Object.freeze({
      ...group,
      items: Object.freeze(group.items.map((item) => Object.freeze({ ...item }))) as NavItem[],
    })
  )
);

export function visibleNavGroups(role: string | null | undefined): readonly NavGroup[] {
  if (role === 'admin') {
    return navGroups;
  }
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.ownerOnly !== true),
    }))
    .filter((group) => group.items.length > 0);
}
```

(The taxonomy literal's content is unchanged — the three groups, their items, icons, and the `ownerOnly` flag copy verbatim from the current `navGroups` literal; only the binding moves to `const taxonomy` under the frozen export. The ONE `as NavItem[]` cast is load-bearing and spike-proven (2026-10-11): `Object.freeze` on the items array returns `readonly NavItem[]`, which tsc will not assign to `NavGroup`'s mutable `items` type — the cast reconciles the runtime freeze with the declared shape, and nothing else in the block compiles without it. Do not "clean it up.")

- [ ] **Step 4: Run the file + typecheck + the full admin suite at the exact floor**

```bash
pnpm exec vitest run src/lib/nav.test.ts 2>&1 | grep -E "Test Files|Tests " | tail -2
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/admin fix
```

Expected: the nav file `1 passed` / `5 passed` (its 4 + the freeze pin — the four existing read-only tests are untouched by the freeze); typecheck clean (the `readonly` ripple is internal to `nav.ts` — `admin-sidebar.tsx`'s reads compile unchanged); the suite `17 passed (17)` files / **`173 passed`** tests — exactly +1.

```bash
git add apps/admin/src/lib/nav.ts apps/admin/src/lib/nav.test.ts
git commit -m "fix(admin): the nav taxonomy is frozen read-only — mutation throws instead of corrupting the shared module state"
```

### Task 7: The inert `h-full` wrapper goes

**Files:**
- Modify: `apps/admin/src/components/dashboard/system-health.tsx:55` (one class removed)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing downstream — a visually-null deletion (the class never resolved: `CardContent` is a bare padded div, `Card` sets no height, so the percentage height fell back to auto; the wrapper div only mounts in the `workers.data?.ok` branch). No test exists or is added (no component/DOM tests in the admin suite by design).

- [ ] **Step 1: Remove the dead class**

In `system-health.tsx`, replace (line 55):

```tsx
            <div className='flex h-full flex-col justify-between gap-3'>
```

with:

```tsx
            <div className='flex flex-col justify-between gap-3'>
```

(The `flex`/`flex-col`/`gap-3` utilities and the `justify-between` stay — they govern the number-over-chart stacking at content height, exactly as rendered today.)

- [ ] **Step 2: Verify nothing moved — then commit**

```bash
cd /home/jeius/Projects/sevendays
pnpm --filter @sevendays/admin typecheck
pnpm --filter @sevendays/admin test 2>&1 | grep -E "Test Files|Tests " | tail -2
pnpm --filter @sevendays/admin fix
```

Expected: typecheck clean; the suite `17 passed (17)` / `173 passed` — unchanged from Task 6 (no test touched). No variant render is required: the class is mechanism-inert by recon (the pinned `card.tsx`/`widget-frame.tsx` evidence in the header), so its removal cannot change pixels.

```bash
git add apps/admin/src/components/dashboard/system-health.tsx
git commit -m "chore(admin): the mechanism-inert h-full leaves the primary card wrapper (never resolved against CardContent's auto height)"
```

### Task 8: The rotation, the PR, the ten rulings, the close

**Files:**
- Modify: `AGENTS.md:36` (api floor) and `AGENTS.md:38` (admin floor)
- Modify: `docs/progress.md:3` (head entry inserted above the 2026-10-11 #207 entry)
- No `docs/plan.md` edit — this ticket has NO M6 box (a follow-up, not a ticket-10 payload; #192 owns every M6 tick)

**Interfaces:**
- Consumes: the three moved floors from Tasks 1–6 (api 27+1s/340+3s · admin 17/173 · landing 9/74; types + api-client unchanged).
- Produces: the merged PR, the #208 close-out comment carrying all ten rulings (AC 3's per-item ledger), the v1-pick ledger row.

- [ ] **Step 1: Full gates**

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/sevendays_test pnpm check 2>&1 | tail -3
pnpm build 2>&1 | tail -3
```

Expected: check **35/35** successful; build **7/7**. The floors inside: api 340+3s, types 121, admin 173, api-client 5/33, landing 9/74.

- [ ] **Step 2: The AGENTS.md floor rotation**

In `AGENTS.md:36`, replace:

```
Floors: api 27 files passed + 1 skipped (28) / 339 passed + 3 skipped (the #207 sweep's cover-commit pin); api-client 5 files / 33 tests.
```

with:

```
Floors: api 27 files passed + 1 skipped (28) / 340 passed + 3 skipped (the #207 cover-commit + #208 update-PUT pins); api-client 5 files / 33 tests.
```

In `AGENTS.md:38`, replace:

```
— admin floor 17 files / 166 tests (the #207 sweep's actors-placeholderData + census catch-arm pins; superseding the 14/140 the #201–#203 follow-ups had left the doc behind).
```

with:

```
— admin floor 17 files / 173 tests (the #207 sweep's two + #208's seven hardening pins; superseding the 14/140 the #201–#203 follow-ups had left the doc behind).
```

(The landing 9/74 and types 14/121 floors are not carried in AGENTS.md — no edit for them.)

- [ ] **Step 3: The progress.md head entry**

Insert directly under `# Progress` (above the 2026-10-11 #207 entry):

```markdown
2026-10-11 — #208, the M6 hardening pass, landed: the latent-risk half of the nine M6 SDD ledgers' deferred minors, all ten resolved. The `windowToRange` straddle family died as a class — the range is computed ONCE per fetch and shared across the `Promise.all` arms (`cf.ts`'s three scripts, `r2.ts`'s two documents; `posthog.ts` was already the computed-once precedent), and both fetch-contract tests pin `Date` through the seam (`vi.useFakeTimers({ toFake: ['Date'] })` + `setSystemTime` mid-flight probes, spike-proven on vitest 4.1.11) — the once-seen #187 flake cannot recur; `posthog.test.ts` needed no pin (its fetch-contract test asserts no timestamps). The three traffic count munges (`mungeTrafficSeries`/`mungeWindowTotals`/`mungeTopPages`) route through the guarded `numOrNull` — a non-finite aggregate resolves to the ruled 0; the vitals keep null. The api's PII floor now discriminates: the mocked resend free text echoes the recipient, and the captured message is pinned to the classified `resend rejected the send (…)` line. An empty-string `VITE_SENTRY_RELEASE` is unset on both frontends (the release key omitted, never `''`). The studio-service update PUT aligns its expression to the eight siblings' `result.row.id` (value-identical) and the route documents the full `entityId` convention (the matrix PUTs keep the brief-ruled param id — #185's audit row carries the same id on every path; the order PUTs' null is family-grain and does not extend here). The nav taxonomy is frozen read-only (`visibleNavGroups('admin')` returns it by reference; mutation now throws). The dashboard primary card's mechanism-inert `h-full` is removed (never resolved against `CardContent`'s auto height). The e2e trailing-slash sensitivity is re-ledgered WONTFIX by ruling (the README documents slash-free values, failure is loud RED, and the mappings take no user-supplied values). Floors: api 339+3s → 340+3s, admin 17/166 → 17/173, landing 9/73 → 9/74; `pnpm check` 35/35, `pnpm build` 7/7. The M6 close-out (#192) owns every plan.md box.
```

- [ ] **Step 4: Commit, graphify, push, PR**

```bash
git add AGENTS.md docs/progress.md
git commit -m "docs: the #208 hardening-pass rotation — floors + the progress head entry"
pnpm exec graphify update .   # churn stays uncommitted (the owner's next graph commit)
git push -u origin feat/208-m6-hardening-pass
```

Open the PR against `main` with the house body sections (Summary / AC→evidence — all four AC bullets mapped to tasks / verification — the check+build gates and the per-task floors / deferred minors — none new / scope fence / Closes #208), then watch checks: `gh pr checks <n> --watch`. On green + MERGEABLE + CLEAN: squash-merge with subject = the PR title verbatim + ` (#<n>)`. Verify `state=MERGED`, ff local main.

- [ ] **Step 5: The v1 triage (expected SPLIT)**

The classifier takes the squash-merge commit on main (its usage: `node scripts/v1-triage.mjs <commit>`; exit 0 prints the verdict):

```bash
git pull --ff-only && node scripts/v1-triage.mjs "$(git rev-parse HEAD)" 2>&1 | tail -5
```

Expected verdict **SPLIT**: every touched code/test file exists on v1 (the metrics seam via #186/#187, both `sentry.ts`/`sentry.test.ts` via #184, `nav.ts` via #188, `system-health.tsx` via #186, `appointments.test.ts` + `admin-studio-services.ts` + `admin-mutation-log.test.ts` via #183/#184/#185) and picks clean or resolves trivially; the `AGENTS.md`/`docs/progress.md` hunks are main-only (the v1 branch keeps its own rewrite — content-drop per the runbook). Execute the pick per `docs/agents/v1-picks.md` (frozen install + check + build locks; the v1 floors move by the same +1 api / +7 admin / +1 landing where the suites exist there), commit with Split provenance, push, watch the v1 run (check + Deploy v1 success, teaser skipped), and append the ledger row.

- [ ] **Step 6: Close #208 with the ten rulings**

```bash
gh issue close 208 --body "Hardening pass landed via #<PR>. All ten resolved:
1–3. The windowToRange family dead as a class: one range per fetch shared across the arms (cf.ts ×3 scripts, r2.ts ×2 documents) + the Date pin in both fetch-contract tests (cf.test.ts, r2.test.ts — posthog.test.ts's fetch-contract test asserts no timestamps, nothing to pin there). The once-seen #187 flake cannot recur.
4. mungeTrafficSeries / mungeWindowTotals / mungeTopPages route through numOrNull — a non-finite aggregate resolves to 0 (counts are zero when unknown); the vitals keep null.
5. The PII floor discriminates: the mocked resend free text echoes the recipient; the captured message is pinned to the classified 'resend rejected the send (…)' line.
6. VITE_SENTRY_RELEASE='' is unset on both frontends — the release key is omitted, never release: ''.
7. Documented as-is + expression aligned: the update PUT emits result.row.id (the eight siblings' shape, value-identical); the matrix PUTs keep the #183-brief-ruled param id (#185's audit row carries the same id — the twins agree). The null convention (order PUTs, family-grain) does not extend here.
8. The nav taxonomy is frozen read-only — mutation throws; no caller mutates.
9. The inert h-full removed from the primary card wrapper (never resolved — CardContent carries no height chain).
10. WONTFIX by ruling: the \${adminBaseUrl} trailing-slash sensitivity stays — the README documents slash-free values, failure is loud RED, and the mappings take no user-supplied values; normalize only if they ever do.
Floors: api 339+3s → 340+3s, admin 17/166 → 17/173, landing 9/73 → 9/74; pnpm check 35/35 + pnpm build 7/7; v1 triage SPLIT (row on main)."
```

(AC 3's ledger: items 1–9 fixed per their sketches, item 10 re-ledgered wontfix with its one-line ruling.)

- [ ] **Step 7: Teardown**

```bash
docker rm -f sevendays-test-hardening 2>/dev/null || true
```

(The workspace's throwaway container goes; `lactalink-test-db` is never touched. The pre-existing dirty `apps/admin/package.json` port tweak and the `graphify-out/` churn remain for the owner.)
