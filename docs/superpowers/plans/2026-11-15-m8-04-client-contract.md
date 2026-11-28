# M8 ticket 04, The client Warm/Cold contract, implementation plan

**Goal:** The admin's client honors the ratified Warm/Cold Navigation contract. Every shared CMS query factory (`apps/admin/src/lib/cms-queries.ts`) carries the ruled **5-minute staleness**, within the window a screen revisit renders the cached rows instantly with **zero network requests** (Warm Navigation), past it a background refetch always follows (bounded staleness: nothing shown is more than five minutes behind; cross-staff edit lag up to that refetch is accepted). CMS routes gain **loader-time cache priming** so hover-intent navigation starts the fetch before the click: the router's `defaultPreload: 'intent'` (already live) runs route loaders on hover, and each CMS route's loader fires the screen's reads through a new fire-and-forget priming seam, `primeCmsQueries` + `cmsRoutePriming`, both beside the factories, via `queryClient.query()` (the non-deprecated fetch path in @tanstack/react-query 5.102.8; `ensureQueryData`/`fetchQuery`/`prefetchQuery` are all marked removed-next-major there). The priming never blocks a navigation: the Cold skeleton stays the screens' existing `isPending` vocabulary, and the priming fetch dedupes with the screen's own `useQuery`. Own-mutation invalidation, already wired across every CMS screen, all keyed through the factories, is preserved as an invariant and pinned (keys byte-stable; invalidation overrides staleness). Admin-local only, the api is untouched. Ticket #288 (spec § D4).

**Spec:** `docs/specs/2026-11-14-m8-admin-cms-latency-spec.md` (§ D4), ratified 2026-11-14 (grill #284). Inputs: the wayfinder map #279's client-contract verdict (distilled into spec § D4), the shell's site-settings priming precedent (`apps/admin/src/routes/_shell.tsx` loader, the in-repo pattern the spec names), and the #280 baseline (the exit gate's comparison target, never judged by this ticket). Executed against existing issue **#288**, no new execution issue.

**Architecture:** one library file rewritten in place (`cms-queries.ts`: the staleness law on all 12 factory options + the two priming exports), one new seam test (`cms-queries.test.ts`), nine CMS route files gaining a loader block, one progress bullet, this plan file. Touched files: `apps/admin/src/lib/cms-queries.ts`, `apps/admin/src/lib/cms-queries.test.ts` (new), `apps/admin/src/routes/_shell.packages.index.tsx`, `apps/admin/src/routes/_shell.packages.$packageId.edit.tsx`, `apps/admin/src/routes/_shell.packages.new.tsx`, `apps/admin/src/routes/_shell.branches.tsx`, `apps/admin/src/routes/_shell.studio-services.tsx`, `apps/admin/src/routes/_shell.add-ons.tsx`, `apps/admin/src/routes/_shell.lookups.tsx`, `apps/admin/src/routes/_shell.gallery.tsx`, `apps/admin/src/routes/_shell.testimonials.tsx`, `docs/progress.md`, this plan file. No api files, no api-client files, no `packages/types`, no db, no `router.tsx`, no `_shell.tsx`, no component files.

**Not UI-bearing (spec #94 amendment):** this ticket names no UI/UX skill set and renders no variants, the milestone's ruling is "touches only time, not pixels" (spec § user story 20). The route loaders run before any pixel exists and the staleness law is data-freshness only: zero visual delta, no new composition for the owner to react to. Cold screens' existing pending states are the skeleton vocabulary, **confirmed, not rebuilt** (every CMS screen already carries `isPending`/`isError` postures from `useQuery`; the ticket's "confirmed" is the grep inventory in Task 3's verification, not new work).

## Global Constraints

- Branch `m8/04-client-contract` off current `main` (at `ec99938` or later). Per-task commits with the subjects pinned per task, each ending `(#288)`, the one house exception is Task 7's ledger row, which follows the `docs(v1-picks): #288 ledger row - …` shape (the #285/#286/#287 precedent); the squash-merge appends the PR number.
- Gates: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check` green **35/35** with the floors byte-identical to the values this plan pins: **admin 30 files / 310** (the before-floor 29 files / 304, live-verified 2026-11-15, moves by exactly the 6 tests in `lib/cms-queries.test.ts`, enumerated in Task 2); **api 34 files (33 passed + 1 skipped) / 471 passed + 3 skipped**; types 18 files / 188; db 4 files (2 + 2 skipped) / 22 passed + 8 skipped; api-client 5 files / 45; landing 17 files / 134. A different moved count means the enumeration drifted: stop and reconcile against the test blocks, never by padding. (`pnpm build:packages` on a fresh clone before check, the shared client resolves the API's `AppType` from built `dist/`; this plan changes no route, so `AppType` is untouched, but the standard fresh-clone `pnpm --filter @sevendays/api build` still runs.)
- **Deploy through CI only.** The push to main fires `Deploy admin (sevendays-admin)` in the `Deploy teaser (main)` run, **that leg is the one this ticket's change rides**; the `Deploy api (sevendays-api)` leg also fires and must go green (it deploys unchanged code). **Never run any local bare `wrangler deploy`**, the #263/#264 lesson (it wipes the CI-passed `--var`s; the only restore is `gh run rerun <merge-run-id>`).
- **Live-probed pins (2026-11-14/15 @ `ec99938`, current `main` HEAD; read from the installed sources, not memory).** Do not "improve" any of these from memory; the pinned value is the probed value:
  - **`defaultPreload: 'intent'` + `defaultPreloadStaleTime: 0` are already live** (`apps/admin/src/router.tsx:26-28`, comment: "Let TanStack Query own cache freshness (router preload just fills cache)"), hovering a `<Link>` (the sidebar's nav items and the packages table's edit links are all `Link`s) already runs the target route's loaders today. The lever is therefore loaders, not router config: **`router.tsx` is untouched.** The global QueryClient default stays `staleTime: 60_000` + `refetchOnReconnect: false` (`router.tsx:13-18`), the Users tab's inline queries ride that default; untouched.
  - **CMS screens fetch in components via `useQuery(factory.xxx())`**, nine screens across `packages-table.tsx`, `package-editor.tsx` (`...adminPackageQueries.byId(packageId ?? '')` spread with `enabled: mode === 'edit'`, the factory is the key source), `branches-screen.tsx`, `studio-services-screen.tsx`, `addons-screen.tsx`, `lookups-screen.tsx` (×2), `gallery-screen.tsx` (×2), `testimonials-screen.tsx`, `submissions-tab.tsx`, `site-tab.tsx`, `admin-sidebar.tsx` (site-settings). No `useSuspenseQuery` anywhere; loaders never ran these reads, that is why cold data waits for the click today.
  - **Own-mutation invalidation is factory-keyed everywhere it exists** (grep inventory, 2026-11-15): every `invalidateQueries` call in the CMS screens passes `factory.xxx().queryKey` (packages-table ×2 + cancel/setQueryData/rollback in the optimistic flip; package-editor ×2; branches ×4; studio-services ×5; addons ×6; lookups ×6; gallery ×9; testimonials ×5; submissions-tab ×2), the ONLY hard-coded keys in the app are the Users tab's `['admin', 'users']` + its sessions query (out of factory scope, the accepted DB-direct residual). Adding `staleTime` to the factories cannot touch invalidation: `invalidateQueries` overrides staleness by design, and the keys are byte-stable (pinned by the new test).
  - **The fetch-path choice, `queryClient.query()`, never the deprecated trio.** Probed in the installed dist (`@tanstack/query-core` 5.102.8, the runtime `queryClient.js`): `ensureQueryData`, `fetchQuery`, and `prefetchQuery` ALL carry `@deprecated Use queryClient.query(options) instead … removed in the next major version`. The probed runtime semantics: `query()` → `retry` defaults to **false**; missing data or stale-per-options-staleTime → **awaited fetch**; fresh data → served from cache with **zero requests**; the fetch dedupes with any in-flight fetch for the same key and writes the cache (a subsequent `useQuery` joins it, no double read). The spike (see Self-review notes) proved all five behavior arms live against a real `QueryClient` with a fake-Date clock.
  - **The shell's `ensureQueryData` call is NOT behavior-identical to `query()`, do not "upgrade" it.** Probed runtime: `ensureQueryData(options)` fetches only when the cache is **missing**; with data present it serves it **even when stale** (a refetch happens only when the caller passes `revalidateIfStale: true`, and then background-only). Migrating the shell to `query()` would make a stale site-settings cache BLOCK the shell loader on a refetch, a regression. The behavior-neutral migration recipe, if ever wanted, is `queryClient.query({ …options, staleTime: 'static' })` (fetch-only-when-missing, the d.ts's own hint); recorded as a deferred minor for #289's closeout, not this ticket.
  - **The thunk design is the spike-proven one, zero casts.** A helper param typed as the factory options or TanStack's generic `QueryExecuteOptions` fails tsc: the concrete `queryOptions()` results type `select`/`staleTime`/`queryFn` against each factory's specific data, and those function types fail contravariance against the default-generic shape (root cause: the factories' mutable `string[]` query keys cannot widen to `QueryKey` under a fixed generic). Thunks move the call to the caller's side, where `queryClient.query(factory.all())` infers its own generics per call, everything self-consistent. `primeCmsQueries` therefore takes `ReadonlyArray<() => Promise<unknown>>` and owns ONLY the fire-and-forget + catch law.
  - **Fire-and-forget is load-bearing (the Cold skeleton contract):** a loader that awaits its priming would block the navigation on a cold read, no skeleton until data lands, violating spec user story 2. The loaders spawn the thunks and return immediately; the screen's `useQuery` dedupes onto the in-flight fetch and shows its existing `isPending` posture. Hover-started fetches are already in flight at click time, Cold Navigations shorten without any blocking.
  - **SSR posture is behavior-neutral:** loaders run server-side too; the unawaited thunks start fetches that the render-time `useQuery` calls join (same key, one fetch), so the dehydrate/hydrate flow keeps its shape. `refetchOnReconnect: false` (global) stays.
  - **Versions pinned:** `@tanstack/react-query` 5.102.8, `@tanstack/react-router` 1.170.41 (installed under node_modules/.pnpm, probed 2026-11-15).
  - **Boundary-test fixture shapes:** `metricsQueries.workers('7d')` takes `MetricsWindow` (`'24h' | '7d' | '30d'`); `auditQueries.page({ page: 1 })` takes `AuditLogSearch` (all other fields optional, `apps/admin/src/lib/audit/filters.ts` schema defaults).
- **No new secret, no wrangler config change, no env var, no api/api-client/types/db change**, the lever is client-side query configuration + route loaders.
- **The after-verification is HITL (Task 6):** the owner performs the devtools walk on the deployed teaser admin (never ask for credentials, never assume while the owner may be AFK). If the owner is unavailable after Task 5, post nothing, leave #288 open naming the pending check, and stop, do not self-serve the verification. The warm-render and hover-intent arms are TanStack Query/Router semantics by construction (spike-pinned); the walk is their operational evidence, exactly the #287 pattern.
- **AGENTS.md's admin floor line still reads 27/296** (the #286 deferred minor, the real floor is 29 files / 304 before this ticket, 30 files / 310 after). The floors in this plan pin ACTUAL values; the AGENTS.md line stays fenced out (Not here) per the #286/#287 ruling, its own update path sits with #289's closeout.
- **The M8 plan.md box for this ticket stays unticked** (`docs/plan.md` "The client Warm/Cold contract… (#288)"), all five M8 boxes flip at #289 (its body owns the milestone-close ritual); this ticket never touches `docs/plan.md`.

### Not here

- **No `router.tsx` edits**, `defaultPreload: 'intent'` / `defaultPreloadStaleTime: 0` / the global 60 s default are already correct; the lever is loaders (above).
- **No `_shell.tsx` edits**, the shell's awaited `ensureQueryData(siteSettingsQuery.all())` is the SSR brand posture (the site-settings read must land for the sidebar wordmark to render server-side) and its serve-stale semantics are correct for that job; the deprecated-call migration is fenced (the probed divergence + the `staleTime: 'static'` recipe ride #289's closeout as a deferred minor). The settings route needs no priming loader: site-settings is already shell-primed, and the Users tab's inline queries are the accepted DB-direct residual.
- **No api changes of any kind; no api-client changes; no `packages/types`, db, schema, or `AppType` change**, the read shapes and keys are existing behavior.
- **No Analytics dashboard or Audit Log work**, their tuned staleness (metrics 60 s/5 m/10 m; audit 30 s/5 m) is pinned untouched by the new boundary test; their routes get no priming loaders (spec D4 keeps them out of scope).
- **No appointments-route work**, the route is the v2 `StubScreen` with zero queries (spec out-of-scope ruling).
- **No component edits**, the screens' `useQuery` calls, pending/error vocabulary, and optimistic flows are existing behavior; zero `.tsx` component files appear in any diff.
- **No eviction/invalidation machinery**, TanStack Query owns freshness; `invalidateQueries` already overrides staleness (the invariant above); no cross-tab or cross-staff push exists (bounded staleness is the ruled trade).
- **No component/DOM tests** (house rule), the seam tests assert factory options objects and thunk calls only; the route loaders are verified by typecheck + the operational walk (route files pull the component graph; never imported from plain-node tests).
- **No new ADR**, spec § D4 is the canonical decision record; this ticket's durable record is the progress bullet (the charter allocated ADRs to #285/#286 only).
- **No `docs/plan.md` edits** (above), **no AGENTS.md edits** (the floor-line minor rides #289), **no `docs/architecture.md`/`docs/tech-stack.md` edits**, **no visual baselines, no e2e edits** (`e2e/visual/` is landing-only; `pnpm check` never grows an e2e leg, ADR-0022).
- `graphify update .` **is** needed at close (code symbols changed, Task 6).

---

### Task 1: branch + plan commit

**Files:**
- Commit: this plan file (the branch's first commit)

- [ ] **Step 1: branch + plan commit**

  ```bash
  git checkout main && git pull --ff-only && git checkout -b m8/04-client-contract
  git add docs/superpowers/plans/2026-11-15-m8-04-client-contract.md
  git commit -m "docs(m8): the M8 ticket 04 implementation plan (#288)"
  ```

### Task 2: the staleness law + the priming seam in cms-queries (TDD)

**Files:**
- Test: `apps/admin/src/lib/cms-queries.test.ts` (new)
- Edit: `apps/admin/src/lib/cms-queries.ts`

- [ ] **Step 1: write the failing tests**

Create `apps/admin/src/lib/cms-queries.test.ts` with this exact content:

```ts
// The CMS query-contract tests (M8 #288): the ruled 5-minute staleness on
// every shared CMS factory (spec D4's Warm/Cold contract), the
// invalidation contract (query keys byte-stable, the screens'
// own-mutation invalidation keys off these factories, and
// invalidateQueries overrides staleness), the out-of-scope tuned values
// (dashboard/audit) pinned untouched, and the loader-priming seam
// (fire-and-forget thunks through queryClient.query). Asserts OPTIONS
// objects and thunk calls only, the server fns are never invoked from a
// plain-node test (the RPC wrapper needs request context; module import
// is safe, spike-proven at metrics-queries.test.ts).
import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { auditQueries } from './audit/queries';
import {
  CMS_STALENESS_MS,
  adminAddonQueries,
  adminBranchQueries,
  adminGalleryQueries,
  adminLookupQueries,
  adminPackageQueries,
  adminStudioServiceQueries,
  adminTestimonialQueries,
  adminTestimonialSubmissionQueries,
  cmsRoutePriming,
  primeCmsQueries,
  siteSettingsQuery,
} from './cms-queries';
import { metricsQueries } from './metrics-queries';

const allCmsOptions = () => [
  adminPackageQueries.all(),
  adminPackageQueries.byId('00000000-0000-4000-8000-000000000001'),
  adminBranchQueries.all(),
  adminStudioServiceQueries.all(),
  adminAddonQueries.all(),
  adminLookupQueries.printSizes(),
  adminLookupQueries.attires(),
  adminGalleryQueries.categories(),
  adminGalleryQueries.photos(),
  adminTestimonialQueries.all(),
  adminTestimonialSubmissionQueries.all(),
  siteSettingsQuery.all(),
];

describe('the CMS staleness law (M8 #288, spec D4)', () => {
  it('every CMS list/detail factory stales at the ruled 5 minutes and revalidates on focus', () => {
    expect(CMS_STALENESS_MS).toBe(300_000);
    for (const option of allCmsOptions()) {
      expect(option.staleTime).toBe(CMS_STALENESS_MS);
      expect(option.refetchOnWindowFocus).toBe(true);
    }
  });

  it('the query keys are byte-stable, the screens own-mutation-invalidate through them', () => {
    expect(adminPackageQueries.all().queryKey).toEqual(['admin', 'service-packages']);
    expect(adminPackageQueries.byId('p1').queryKey).toEqual(['admin', 'service-packages', 'p1']);
    expect(adminBranchQueries.all().queryKey).toEqual(['admin', 'branches']);
    expect(adminStudioServiceQueries.all().queryKey).toEqual(['admin', 'studio-services']);
    expect(adminAddonQueries.all().queryKey).toEqual(['admin', 'addon-services']);
    expect(adminLookupQueries.printSizes().queryKey).toEqual(['admin', 'print-sizes']);
    expect(adminLookupQueries.attires().queryKey).toEqual(['admin', 'attires']);
    expect(adminGalleryQueries.categories().queryKey).toEqual(['admin', 'gallery-categories']);
    expect(adminGalleryQueries.photos().queryKey).toEqual(['admin', 'gallery-photos']);
    expect(adminTestimonialQueries.all().queryKey).toEqual(['admin', 'testimonials']);
    expect(adminTestimonialSubmissionQueries.all().queryKey).toEqual([
      'admin',
      'testimonial-submissions',
    ]);
    expect(siteSettingsQuery.all().queryKey).toEqual(['site-settings']);
  });

  it('the dashboard + audit tuned values stay untouched (out of scope, spec D4)', () => {
    expect(metricsQueries.workers('7d')).toMatchObject({ staleTime: 60_000 });
    expect(metricsQueries.dbProbes()).toMatchObject({ staleTime: 60_000 });
    expect(metricsQueries.content()).toMatchObject({ staleTime: 300_000 });
    expect(metricsQueries.traffic('7d')).toMatchObject({ staleTime: 300_000 });
    expect(metricsQueries.storage('7d')).toMatchObject({ staleTime: 600_000 });
    expect(auditQueries.page({ page: 1 })).toMatchObject({ staleTime: 30_000 });
    expect(auditQueries.actors()).toMatchObject({ staleTime: 300_000 });
  });
});

describe('primeCmsQueries, the loader-time priming seam (M8 #288)', () => {
  it('runs every thunk exactly once (fire-and-forget)', () => {
    const primes = [vi.fn(async () => undefined), vi.fn(async () => undefined)];
    primeCmsQueries(primes);
    expect(primes[0]).toHaveBeenCalledTimes(1);
    expect(primes[1]).toHaveBeenCalledTimes(1);
  });

  it('a rejected prime never escapes the helper, a failing read cannot fail a navigation', () => {
    const prime = vi.fn(async () => {
      throw new Error('boom');
    });
    expect(() => primeCmsQueries([prime])).not.toThrow();
  });

  it('the per-route priming lists carry exactly the factories each screen consumes', () => {
    const captured: Array<readonly unknown[]> = [];
    const queryClient = {
      query: (options: { queryKey: readonly unknown[] }) => {
        captured.push(options.queryKey);
        return Promise.resolve(undefined);
      },
    } as unknown as QueryClient;
    const keysFor = (build: (client: QueryClient) => Array<() => Promise<unknown>>) => {
      captured.length = 0;
      for (const thunk of build(queryClient)) void thunk();
      return [...captured];
    };

    expect(keysFor(cmsRoutePriming.packagesIndex)).toEqual([['admin', 'service-packages']]);
    expect(keysFor((client) => cmsRoutePriming.packageEdit(client, 'p1'))).toEqual([
      ['admin', 'service-packages', 'p1'],
      ['admin', 'print-sizes'],
      ['admin', 'attires'],
    ]);
    expect(keysFor(cmsRoutePriming.packageNew)).toEqual([
      ['admin', 'print-sizes'],
      ['admin', 'attires'],
    ]);
    expect(keysFor(cmsRoutePriming.branches)).toEqual([['admin', 'branches']]);
    expect(keysFor(cmsRoutePriming.studioServices)).toEqual([
      ['admin', 'studio-services'],
      ['admin', 'branches'],
    ]);
    expect(keysFor(cmsRoutePriming.addOns)).toEqual([
      ['admin', 'addon-services'],
      ['admin', 'studio-services'],
    ]);
    expect(keysFor(cmsRoutePriming.lookups)).toEqual([
      ['admin', 'print-sizes'],
      ['admin', 'attires'],
    ]);
    expect(keysFor(cmsRoutePriming.gallery)).toEqual([
      ['admin', 'gallery-photos'],
      ['admin', 'gallery-categories'],
    ]);
    expect(keysFor(cmsRoutePriming.testimonials)).toEqual([
      ['admin', 'testimonials'],
      ['admin', 'testimonial-submissions'],
    ]);
  });
});
```

- [ ] **Step 2: run the tests to verify they fail**

  ```bash
  pnpm --filter @sevendays/admin test src/lib/cms-queries.test.ts
  ```

  Expected: FAIL, the file cannot pass while `CMS_STALENESS_MS`, `primeCmsQueries`, and `cmsRoutePriming` are not exported (a missing-export resolution failure or `undefined` assertions, per vitest's transpile posture) and no factory carries `staleTime` yet. The exact failure shape doesn't matter; the file as a whole must be red.

- [ ] **Step 3: rewrite `apps/admin/src/lib/cms-queries.ts`**, this full file content, byte-verbatim (the factory bodies keep their shape; each gains `staleTime` + `refetchOnWindowFocus`; the two priming exports join at the bottom):

```ts
import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import {
  fetchAdminAddons,
  fetchAdminAttires,
  fetchAdminBranches,
  fetchAdminGalleryCategories,
  fetchAdminGalleryPhotos,
  fetchAdminPackage,
  fetchAdminPackages,
  fetchAdminPrintSizes,
  fetchAdminStudioServices,
  fetchAdminTestimonialSubmissions,
  fetchAdminTestimonials,
} from './admin.functions';
import { getSiteSettings } from './api.functions';

// Query key factories for the admin CMS (M5 #139), the branchQueries
// precedent, one factory per resource the ticket 05 screens consume.
//
// M8 #288 (the Warm/Cold contract, spec D4): every factory carries the
// ruled 5-minute staleness, within the window TanStack Query renders the
// cached rows instantly (Warm Navigation, zero network) and a background
// refetch always follows once stale (bounded staleness: nothing shown is
// more than five minutes behind; cross-staff edit lag up to that refetch
// is accepted). refetchOnWindowFocus is stated explicitly, the metrics/
// audit factories' posture. Own-mutation invalidation (the screens'
// invalidateQueries calls, all keyed through these factories) overrides
// staleness, a save refetches immediately regardless of the window; the
// query keys are byte-stable and pinned by cms-queries.test.ts.

export const CMS_STALENESS_MS = 300_000;

export const adminPackageQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'service-packages'],
      queryFn: fetchAdminPackages,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
  byId: (id: string) =>
    queryOptions({
      queryKey: ['admin', 'service-packages', id],
      queryFn: () => fetchAdminPackage({ data: { id } }),
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminBranchQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'branches'],
      queryFn: fetchAdminBranches,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminStudioServiceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'studio-services'],
      queryFn: fetchAdminStudioServices,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminAddonQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'addon-services'],
      queryFn: fetchAdminAddons,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminLookupQueries = {
  printSizes: () =>
    queryOptions({
      queryKey: ['admin', 'print-sizes'],
      queryFn: fetchAdminPrintSizes,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
  attires: () =>
    queryOptions({
      queryKey: ['admin', 'attires'],
      queryFn: fetchAdminAttires,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminGalleryQueries = {
  categories: () =>
    queryOptions({
      queryKey: ['admin', 'gallery-categories'],
      queryFn: fetchAdminGalleryCategories,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
  photos: () =>
    queryOptions({
      queryKey: ['admin', 'gallery-photos'],
      queryFn: fetchAdminGalleryPhotos,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

export const adminTestimonialQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'testimonials'],
      queryFn: fetchAdminTestimonials,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

// M7 #218: the Submissions tab's queue, newest-first from the API (#216's list).
export const adminTestimonialSubmissionQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'testimonial-submissions'],
      queryFn: fetchAdminTestimonialSubmissions,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

// M7 #215: the singleton's one query, the public read the Site tab loads.
export const siteSettingsQuery = {
  all: () =>
    queryOptions({
      queryKey: ['site-settings'],
      queryFn: getSiteSettings,
      staleTime: CMS_STALENESS_MS,
      refetchOnWindowFocus: true,
    }),
};

// The loader-time priming seam (M8 #288): CMS route loaders hand these
// thunks to primeCmsQueries so a hover-intent navigation, the router's
// defaultPreload: 'intent' already runs route loaders on hover, starts
// the screen's reads before the click. queryClient.query() is the
// non-deprecated fetch path in @tanstack/react-query 5.102.8
// (ensureQueryData/fetchQuery/prefetchQuery are all removed-next-major
// there): it fetches when the cache is missing or stale, serves fresh
// data with zero requests, and its in-flight fetch dedupes with the
// screen's own useQuery, priming never doubles a read.
//
// Fire-and-forget BY DESIGN: primeCmsQueries never awaits, so a loader
// can never block a navigation, the Cold skeleton stays the screens'
// existing isPending vocabulary (spec user story 2), and the
// hover-started fetch is already in flight when the click lands (Cold
// Navigations shorten, the skeleton contract holds). A rejected read is
// swallowed here; the component's own useQuery surfaces it (the existing
// error vocabulary).
export function primeCmsQueries(primes: ReadonlyArray<() => Promise<unknown>>): void {
  for (const prime of primes) {
    void prime().catch(() => undefined);
  }
}

// The per-route priming lists: exactly the cms-queries factories each CMS
// screen consumes (the editor routes add the lookups; the screens with
// cross-entity badges add the branches/services reads). Kept beside the
// factories so a factory edit and its route's priming can never drift:
// the seam test pins every list. Thunks, not pre-built options, so each
// queryClient.query() call infers its own generics from the concrete
// factory options (a shared generic param fails their contravariance).
// The settings route needs no entry (the shell loader primes
// site-settings); the dashboard/audit-log/users reads are out of scope
// (spec D4 keeps their tuned values).
export const cmsRoutePriming = {
  packagesIndex: (queryClient: QueryClient) => [
    () => queryClient.query(adminPackageQueries.all()),
  ],
  packageEdit: (queryClient: QueryClient, packageId: string) => [
    () => queryClient.query(adminPackageQueries.byId(packageId)),
    () => queryClient.query(adminLookupQueries.printSizes()),
    () => queryClient.query(adminLookupQueries.attires()),
  ],
  packageNew: (queryClient: QueryClient) => [
    () => queryClient.query(adminLookupQueries.printSizes()),
    () => queryClient.query(adminLookupQueries.attires()),
  ],
  branches: (queryClient: QueryClient) => [
    () => queryClient.query(adminBranchQueries.all()),
  ],
  studioServices: (queryClient: QueryClient) => [
    () => queryClient.query(adminStudioServiceQueries.all()),
    () => queryClient.query(adminBranchQueries.all()),
  ],
  addOns: (queryClient: QueryClient) => [
    () => queryClient.query(adminAddonQueries.all()),
    () => queryClient.query(adminStudioServiceQueries.all()),
  ],
  lookups: (queryClient: QueryClient) => [
    () => queryClient.query(adminLookupQueries.printSizes()),
    () => queryClient.query(adminLookupQueries.attires()),
  ],
  gallery: (queryClient: QueryClient) => [
    () => queryClient.query(adminGalleryQueries.photos()),
    () => queryClient.query(adminGalleryQueries.categories()),
  ],
  testimonials: (queryClient: QueryClient) => [
    () => queryClient.query(adminTestimonialQueries.all()),
    () => queryClient.query(adminTestimonialSubmissionQueries.all()),
  ],
};
```

- [ ] **Step 4: run the tests to verify they pass, then typecheck, then commit**

  ```bash
  pnpm --filter @sevendays/admin test src/lib/cms-queries.test.ts
  pnpm --filter @sevendays/admin typecheck
  git add apps/admin/src/lib/cms-queries.ts apps/admin/src/lib/cms-queries.test.ts
  git commit -m "feat(admin): the CMS staleness law + the loader-priming seam in cms-queries (#288)"
  ```

  Expected: 6 tests pass; typecheck clean (no consumers changed yet, the factories' new options flow straight into the existing `useQuery` sites).

---

### Task 3: the hover-intent priming loaders on the nine CMS routes

**Files (each edited in place, import + loader block, nothing else):**
- Edit: `apps/admin/src/routes/_shell.packages.index.tsx`
- Edit: `apps/admin/src/routes/_shell.packages.$packageId.edit.tsx`
- Edit: `apps/admin/src/routes/_shell.packages.new.tsx`
- Edit: `apps/admin/src/routes/_shell.branches.tsx`
- Edit: `apps/admin/src/routes/_shell.studio-services.tsx`
- Edit: `apps/admin/src/routes/_shell.add-ons.tsx`
- Edit: `apps/admin/src/routes/_shell.lookups.tsx`
- Edit: `apps/admin/src/routes/_shell.gallery.tsx`
- Edit: `apps/admin/src/routes/_shell.testimonials.tsx`

Every edit follows the same law: the loader is **synchronous and fire-and-forget** (it spawns thunks and returns, never `await`), and it carries the one-line comment pinning why. The `context.queryClient` and (on the edit route) `params.packageId` typings are spike-proven (see Self-review notes).

- [ ] **Step 1: `_shell.packages.index.tsx`** (content-anchored):

  ```tsx
  OLD:
  import { createFileRoute, Link } from '@tanstack/react-router';
  import { PageHeader } from '#/components/cms/shared';
  import { PackagesTable } from '#/components/packages/packages-table';

  export const Route = createFileRoute('/_shell/packages/')({
    head: () => ({ meta: [{ title: 'Packages | Sevendays Admin' }] }),
    component: PackagesPage,
  });

  NEW:
  import { createFileRoute, Link } from '@tanstack/react-router';
  import { PageHeader } from '#/components/cms/shared';
  import { PackagesTable } from '#/components/packages/packages-table';
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

  export const Route = createFileRoute('/_shell/packages/')({
    head: () => ({ meta: [{ title: 'Packages | Sevendays Admin' }] }),
    // M8 #288: hover-intent priming, fire-and-forget, never blocks
    // (the cms-queries seam carries the law).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.packagesIndex(queryClient));
    },
    component: PackagesPage,
  });
  ```

- [ ] **Step 2: `_shell.packages.$packageId.edit.tsx`** (the loader has the route's params, spike-proven typing):

  ```tsx
  OLD:
  import { createFileRoute } from '@tanstack/react-router';
  import { PackageEditor } from '#/components/packages/package-editor';

  export const Route = createFileRoute('/_shell/packages/$packageId/edit')({
    head: () => ({ meta: [{ title: 'Edit package | Sevendays Admin' }] }),
    component: EditPackagePage,
  });

  NEW:
  import { createFileRoute } from '@tanstack/react-router';
  import { PackageEditor } from '#/components/packages/package-editor';
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

  export const Route = createFileRoute('/_shell/packages/$packageId/edit')({
    head: () => ({ meta: [{ title: 'Edit package | Sevendays Admin' }] }),
    // M8 #288: hover-intent priming, the byId read + both lookups start
    // while the edit link is hovered (fire-and-forget, never blocks).
    loader: ({ context: { queryClient }, params }) => {
      primeCmsQueries(cmsRoutePriming.packageEdit(queryClient, params.packageId));
    },
    component: EditPackagePage,
  });
  ```

- [ ] **Step 3: `_shell.packages.new.tsx`** (create mode loads the lookups only, the editor's own comment pins that posture):

  ```tsx
  OLD:
  import { createFileRoute } from '@tanstack/react-router';
  import { PackageEditor } from '#/components/packages/package-editor';

  export const Route = createFileRoute('/_shell/packages/new')({
    head: () => ({ meta: [{ title: 'New package | Sevendays Admin' }] }),
    component: NewPackagePage,
  });

  NEW:
  import { createFileRoute } from '@tanstack/react-router';
  import { PackageEditor } from '#/components/packages/package-editor';
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

  export const Route = createFileRoute('/_shell/packages/new')({
    head: () => ({ meta: [{ title: 'New package | Sevendays Admin' }] }),
    // M8 #288: hover-intent priming, create mode loads the lookups only
    // (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.packageNew(queryClient));
    },
    component: NewPackagePage,
  });
  ```

- [ ] **Step 4: `_shell.branches.tsx`**:

  ```tsx
  OLD:
  import { createFileRoute } from '@tanstack/react-router';
  import { BranchesScreen } from '#/components/branches/branches-screen';

  export const Route = createFileRoute('/_shell/branches')({
    head: () => ({ meta: [{ title: 'Branches | Sevendays Admin' }] }),
    component: BranchesPage,
  });

  NEW:
  import { createFileRoute } from '@tanstack/react-router';
  import { BranchesScreen } from '#/components/branches/branches-screen';
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

  export const Route = createFileRoute('/_shell/branches')({
    head: () => ({ meta: [{ title: 'Branches | Sevendays Admin' }] }),
    // M8 #288: hover-intent priming, fire-and-forget, never blocks
    // (the cms-queries seam carries the law).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.branches(queryClient));
    },
    component: BranchesPage,
  });
  ```

- [ ] **Step 5: `_shell.studio-services.tsx`**:

  ```tsx
  OLD:
  import { createFileRoute } from '@tanstack/react-router';
  import { StudioServicesScreen } from '#/components/studio-services/studio-services-screen';

  export const Route = createFileRoute('/_shell/studio-services')({
    head: () => ({ meta: [{ title: 'Studio services | Sevendays Admin' }] }),
    component: StudioServicesPage,
  });

  NEW:
  import { createFileRoute } from '@tanstack/react-router';
  import { StudioServicesScreen } from '#/components/studio-services/studio-services-screen';
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

  export const Route = createFileRoute('/_shell/studio-services')({
    head: () => ({ meta: [{ title: 'Studio services | Sevendays Admin' }] }),
    // M8 #288: hover-intent priming, the screen's reads + the branch
    // badges (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.studioServices(queryClient));
    },
    component: StudioServicesPage,
  });
  ```

- [ ] **Step 6: `_shell.add-ons.tsx`**:

  ```tsx
  OLD:
  import { createFileRoute } from '@tanstack/react-router';
  import { AddonsScreen } from '#/components/addons/addons-screen';

  export const Route = createFileRoute('/_shell/add-ons')({
    head: () => ({ meta: [{ title: 'Add-ons | Sevendays Admin' }] }),
    component: AddOnsPage,
  });

  NEW:
  import { createFileRoute } from '@tanstack/react-router';
  import { AddonsScreen } from '#/components/addons/addons-screen';
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

  export const Route = createFileRoute('/_shell/add-ons')({
    head: () => ({ meta: [{ title: 'Add-ons | Sevendays Admin' }] }),
    // M8 #288: hover-intent priming, the screen's reads + the service
    // badges (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.addOns(queryClient));
    },
    component: AddOnsPage,
  });
  ```

- [ ] **Step 7: `_shell.lookups.tsx`**:

  ```tsx
  OLD:
  import { createFileRoute } from '@tanstack/react-router';
  import { PageHeader } from '#/components/cms/shared';
  import { LookupsScreen } from '#/components/lookups/lookups-screen';

  export const Route = createFileRoute('/_shell/lookups')({
    head: () => ({ meta: [{ title: 'Lookups | Sevendays Admin' }] }),
    component: LookupsPage,
  });

  NEW:
  import { createFileRoute } from '@tanstack/react-router';
  import { PageHeader } from '#/components/cms/shared';
  import { LookupsScreen } from '#/components/lookups/lookups-screen';
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

  export const Route = createFileRoute('/_shell/lookups')({
    head: () => ({ meta: [{ title: 'Lookups | Sevendays Admin' }] }),
    // M8 #288: hover-intent priming, both lookup lists
    // (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.lookups(queryClient));
    },
    component: LookupsPage,
  });
  ```

- [ ] **Step 8: `_shell.gallery.tsx`**:

  ```tsx
  OLD:
  import { createFileRoute } from '@tanstack/react-router';
  import { GalleryScreen } from '#/components/gallery/gallery-screen';

  export const Route = createFileRoute('/_shell/gallery')({
    head: () => ({ meta: [{ title: 'Gallery | Sevendays Admin' }] }),
    component: GalleryPage,
  });

  NEW:
  import { createFileRoute } from '@tanstack/react-router';
  import { GalleryScreen } from '#/components/gallery/gallery-screen';
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

  export const Route = createFileRoute('/_shell/gallery')({
    head: () => ({ meta: [{ title: 'Gallery | Sevendays Admin' }] }),
    // M8 #288: hover-intent priming, the photos + categories reads
    // (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.gallery(queryClient));
    },
    component: GalleryPage,
  });
  ```

  (The OLD string anchors on the route definition only, the file's long PageHeader body below it is untouched.)

- [ ] **Step 9: `_shell.testimonials.tsx`** (the screen hosts both the Testimonials rows and the Submissions tab):

  ```tsx
  OLD:
  import { createFileRoute } from '@tanstack/react-router';
  import { TestimonialsScreen } from '#/components/testimonials/testimonials-screen';

  export const Route = createFileRoute('/_shell/testimonials')({
    head: () => ({ meta: [{ title: 'Testimonials | Sevendays Admin' }] }),
    component: TestimonialsPage,
  });

  NEW:
  import { createFileRoute } from '@tanstack/react-router';
  import { TestimonialsScreen } from '#/components/testimonials/testimonials-screen';
  import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

  export const Route = createFileRoute('/_shell/testimonials')({
    head: () => ({ meta: [{ title: 'Testimonials | Sevendays Admin' }] }),
    // M8 #288: hover-intent priming, the testimonials rows + the
    // submissions queue (fire-and-forget, never blocks).
    loader: ({ context: { queryClient } }) => {
      primeCmsQueries(cmsRoutePriming.testimonials(queryClient));
    },
    component: TestimonialsPage,
  });
  ```

- [ ] **Step 10: typecheck + the admin suite, then commit**

  ```bash
  pnpm --filter @sevendays/admin typecheck && pnpm --filter @sevendays/admin test
  git add apps/admin/src/routes/_shell.packages.index.tsx \
    'apps/admin/src/routes/_shell.packages.$packageId.edit.tsx' \
    apps/admin/src/routes/_shell.packages.new.tsx \
    apps/admin/src/routes/_shell.branches.tsx \
    apps/admin/src/routes/_shell.studio-services.tsx \
    apps/admin/src/routes/_shell.add-ons.tsx \
    apps/admin/src/routes/_shell.lookups.tsx \
    apps/admin/src/routes/_shell.gallery.tsx \
    apps/admin/src/routes/_shell.testimonials.tsx
  git commit -m "feat(admin): hover-intent priming loaders on the CMS routes (#288)"
  ```

  Expected: typecheck clean; the suite still 30 files / 310 (no new tests, the loaders are wiring verified by the seam tests + Task 6's walk). `routeTree.gen.ts` must NOT change (loaders add no routes, if it shows in `git status`, stop and reconcile).

---

### Task 4: the progress bullet

**Files:**
- Edit: `docs/progress.md` (insert one What-Exists bullet)

- [ ] **Step 1: insert the bullet**, directly after the #287 bullet (the `- Gallery thumbnails are **versioned + immutable**…` line ends `…Admin-local only, the api is untouched.`) and before the blank line preceding `## Known Gaps / Not Yet Done` (must match exactly once; after the edit the file gains exactly the one bullet):

  ```text
  OLD: Admin-local only, the api is untouched.

  ## Known Gaps / Not Yet Done
  NEW: Admin-local only, the api is untouched.
  - The client **Warm/Cold contract is live** (2026-11-15, #288, spec D4): every shared CMS query factory in `apps/admin/src/lib/cms-queries.ts` carries the ruled 5-minute staleness (`CMS_STALENESS_MS` + explicit `refetchOnWindowFocus`, within the window a screen revisit renders the cached rows with zero network requests; past it a background refetch always follows, so nothing shown is more than five minutes behind), and the nine CMS routes' loaders prime their reads at hover-intent (`primeCmsQueries` + `cmsRoutePriming` beside the factories, fire-and-forget `queryClient.query()` thunks so a loader never blocks a navigation: the router's already-live `defaultPreload: 'intent'` starts the fetch on hover, the Cold skeleton stays the screens' existing `isPending` vocabulary, and the priming fetch dedupes with the screen's own `useQuery`). Own-mutation invalidation is preserved and pinned: every screen's `invalidateQueries` keys off the factories, whose query keys are byte-stable in `cms-queries.test.ts`, invalidation overrides staleness, so a save still refetches immediately. The Analytics dashboard + Audit Log keep their tuned staleness (pinned untouched); the Users tab's inline queries ride the global 60 s default (the accepted DB-direct residual). `queryClient.query()` is the non-deprecated fetch path in 5.102.8 (`ensureQueryData`/`fetchQuery`/`prefetchQuery` are removed-next-major there, the shell's `ensureQueryData` priming is the one fenced call; its behavior-neutral migration is `query({ …options, staleTime: 'static' })`, deferred to #289's closeout). Admin-local only, the api is untouched.

  ## Known Gaps / Not Yet Done
  ```

- [ ] **Step 2: commit** (the progress bullet, nothing else in the commit):

  ```bash
  git add docs/progress.md
  git commit -m "docs(m8): the Warm/Cold client contract progress bullet (#288)"
  ```

---

### Task 5: gates, push, PR, merge, watch the deploy

**Files:** none new.

- [ ] **Step 1: gates**, from the repo root (on a fresh clone, `pnpm build:packages` + `pnpm --filter @sevendays/api build` first):

  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/sevendays_test pnpm check
  ```

  Green 35/35 with the Global Constraints floors byte-identical, **admin 30 files / 310** (+6 cms-queries tests over the 29/304 before-floor); every other floor unchanged (api 34 files / 471+3sk, types 18/188, db 4 files / 22+8sk, api-client 5/45, landing 17/134).

- [ ] **Step 2: push + PR**:

  ```bash
  git push -u origin HEAD
  gh pr create --title "feat(admin): the client Warm/Cold contract, 5-minute CMS staleness + hover-intent priming (#288)" --body-file - <<'EOF'
  M8 ticket 04 (#288, spec D4): Warm Navigation renders instantly; Cold Navigations start earlier.

  - **5-minute staleness on the shared CMS query factories** (`apps/admin/src/lib/cms-queries.ts`): `CMS_STALENESS_MS` + explicit `refetchOnWindowFocus` on all 12 factory options, within the window a screen revisit renders cached rows with zero network requests; past it a background refetch always follows (bounded staleness: nothing shown is more than five minutes behind). The Analytics dashboard + Audit Log keep their tuned values (pinned untouched by the new boundary test).
  - **Hover-intent priming**: the nine CMS routes' loaders prime their reads through `primeCmsQueries` + `cmsRoutePriming`, fire-and-forget `queryClient.query()` thunks (the non-deprecated fetch path in 5.102.8; ensureQueryData/fetchQuery/prefetchQuery are removed-next-major there). The router's already-live `defaultPreload: 'intent'` runs loaders on hover, so the fetch starts before the click; a loader never blocks a navigation, the Cold skeleton stays the screens' existing `isPending` vocabulary, and the priming fetch dedupes with the screen's own `useQuery`.
  - **Own-mutation invalidation verified intact**: every screen's `invalidateQueries` keys off the factories, whose query keys are byte-stable (`cms-queries.test.ts`); invalidation overrides staleness, saves still refetch immediately. Zero component/DOM tests (house rule), 6 lib-seam tests; admin-local only, the api untouched, `AppType` unchanged.

  Floors: admin 30 files / 310 (+6 cms-queries tests).
  EOF
  ```

- [ ] **Step 3: CI check green on the PR, then squash-merge.** Record the merge SHA.

- [ ] **Step 4: watch the deploy**, `gh run list --branch main --limit 1`, verify the run's head SHA matches the merge SHA (the #271 lesson), then `gh run watch <run-id>` until the `Deploy teaser (main)` leg finishes. **Both legs must go green: `Deploy admin (sevendays-admin)` (this ticket's change) AND `Deploy api (sevendays-api)` (unchanged code, green is the expectation, never skipped).** Record the run id, the restore vehicle if anything var-shaped breaks later (`gh run rerun <run-id>`).

---

### Task 6: the deployed verification (HITL) + close + graphify

**Files:** none on disk until the graphify step (evidence lands on #288).

- [ ] **Step 1: the owner ask**, send this ask and wait (never assume while the owner may be AFK):

  > M8 ticket 04 needs one three-minute check on the deployed admin, screens should now render instantly when you revisit them within five minutes, and hovering a sidebar link should start its fetch before you click. Could you sign in at the teaser admin as usual and open devtools → Network tab (make sure the "Disable cache" checkbox at the top of the Network panel is UNTICKED), then: (1) HOVER over a sidebar item you haven't opened this session (say Branches), while still hovering, before clicking, tell me whether a request fires for its data (that's the intent priming; it should); (2) click it, let it load, then go to another tab (say Packages) and click BACK to Branches within a couple of minutes, the second visit should render instantly with NO new request for its list (that's Warm Navigation, zero network wait); (3) go do something else for five-plus minutes, come back to Branches again, it should render instantly from what it already has AND fire exactly ONE fresh request in the background that refreshes behind the rendered rows (that's the bounded staleness, nothing more than five minutes behind). A "fires on hover + zero on the warm revisit + one background refetch after five minutes" and you're done; the ticket closes on it.

  Decision table:
  - All three observed → the lever is live; post the evidence (Step 2) and close (Step 3).
  - No request fires on hover → first suspect the deploy posture: mouse hover only (keyboard/touch navigation does not hover-intent, use a mouse); if genuinely absent, suspect the route loaders didn't land (the var-wipe class: `gh run rerun <Task-5-run-id>`, then re-ask); a console error during navigation → reproduce locally (`pnpm --filter @sevendays/admin dev`, the :3000 serial posture, both apps never in parallel) and take the finding to the owner with evidence.
  - The warm revisit re-fires requests → the staleness didn't land (suspect the deploy miss first, same rerun vehicle; then check the deployed `cms-queries.ts` carries `staleTime`).
  - The bounded arm fires MORE than one request → count against the screen's factory list, not a flat one: branches = 1 read, but gallery = 2 (photos + categories), studio-services/add-ons/testimonials = 2 each, lookups = 2, the packages index = 1 (its edit link hover also fires the byId + lookups reads, by design). The walk's Branches choice is deliberately single-read.
  - Any screen breaks (blank/error) → the loader wiring is the new code on that path, reproduce locally, check the browser console, take the finding with evidence. The degradation posture is never correctness: the priming is additive to unchanged screens (`.catch` swallows prime failures; the screens' own fetch/error vocabulary is untouched).

- [ ] **Step 2: post the evidence to #288** (only after a yes; fill the `<…>` slots):

  ```bash
  gh issue comment 288 --body "Operational evidence (deploy run <run-id>):

  - Hover-intent priming live: hovering the Branches sidebar item (unvisited this session) fired its list request before any click (devtools Network, Disable cache unticked), the router's defaultPreload: 'intent' ran the route's new priming loader.
  - Warm Navigation live: returning to a visited screen within the window rendered instantly with ZERO requests for its reads (devtools-filtered), the factory staleness serves the cache.
  - Bounded staleness live: a revisit 5+ minutes later rendered instantly from cache and fired exactly ONE background request (the branches list, a deliberately single-read screen) that refreshed behind the rendered rows.
  - Own-mutation invalidation intact: the CMS screens' invalidateQueries calls all key off the cms-queries factories (grep inventory in the plan; no invalidation line moved in the diff), the factories' query keys are byte-stable (cms-queries.test.ts), and invalidation overrides staleness by TanStack Query semantics, a save still refetches immediately. The staleness/priming seam pins are green (6 tests); pnpm check 35/35.
  - Deferred minor recorded for #289's closeout: the shell's ensureQueryData priming is deprecated in 5.102.8 and NOT behavior-identical to query() (it serves stale cache without refetching), its behavior-neutral migration is query({ …options, staleTime: 'static' }); deliberately fenced from this ticket."
  ```

- [ ] **Step 3: graphify + close #288**:

  ```bash
  git checkout main && git pull --ff-only
  graphify update .
  git add graphify-out/
  git commit -m "chore(graphify): post-#288 graph update"
  git push origin main
  gh issue view 288 --json body -q .body > /tmp/m8-04-288-body.md
  # flip the five '- [ ]' acceptance lines to '- [✅]' (✅ emoji, never plain [x], the AGENTS.md rule)
  gh issue edit 288 --body-file /tmp/m8-04-288-body.md
  gh issue close 288 --reason completed
  ```

  All five boxes now hold: the 5-minute staleness with dashboard/audit untouched (Task 2 + the boundary test); the warm-navigation zero-wait (the walk's step 2); the hover-intent priming (the walk's step 1 + the loaders); the seam tests + intact invalidation (Task 2's pins + the inventory); `pnpm check` (Task 5). **Do not tick this ticket's plan.md M8 box**, all five flip at #289.

---

### Task 7: post-merge, the v1 pick + ledger row

**Files:**
- Edit: `docs/agents/v1-picks.md` (the ledger row, main-side, direct commit per the ledger precedent)

- [ ] **Step 1: triage per `docs/agents/v1-picks.md`**, `node scripts/v1-triage.mjs <merge-sha>` (the Task 5 merge SHA). Expected shape: **SPLIT**, v1-paths: `apps/admin/src/lib/cms-queries.ts`, `apps/admin/src/lib/cms-queries.test.ts`, and the nine route files (`_shell.packages.index.tsx`, `_shell.packages.$packageId.edit.tsx`, `_shell.packages.new.tsx`, `_shell.branches.tsx`, `_shell.studio-services.tsx`, `_shell.add-ons.tsx`, `_shell.lookups.tsx`, `_shell.gallery.tsx`, `_shell.testimonials.tsx`); main-only: `docs/progress.md`, this plan file (dropped). Record the classifier's actual output. Content pass expected clean: query-factory options + route loaders, zero booking-path strings, zero edition mechanics.

- [ ] **Step 2: execute the pick + locks** per the runbook, cherry-pick the squash commit onto `v1`, resolve the main-only paths as drops, then from the **main repo root**:

  ```bash
  pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5434/sevendays_test pnpm check
  node scripts/audit-v1-absence.mjs HEAD --repo <v1-worktree-path>   # main-root invocation, the in-worktree run MODULE_NOT_FOUNDs (the #286 lesson); expect exit 0 / PASS 0/18 over full history
  git push origin v1
  ```

  Watch the run **sha-verified** (the #271 lesson): `check` success, `Deploy v1 (private)` success, `Deploy teaser (main)` skipped. Superset check: the merge SHA reachable from origin/main. v1 floors on the check: **admin 30 files / 310** (identical to main's admin, the same six tests land; the CMS is edition-agnostic and v1's admin carries the #287 gallery-thumbs floor at 29/304) and **api 31 files (30 passed + 1 skipped) / 392 passed + 3 skipped** (v1's own floor).

- [ ] **Step 3: the ledger row**, one row appended to `docs/agents/v1-picks.md`, the #285/#286/#287 rows as the format template (the `<…>` cells are execution-filled):

  ```text
  | 2026-11-<d> | #<PR> | <merge-sha> | <class, expected split> | <v1-sha> | #288, M8 ticket 04: the client Warm/Cold contract (the shared CMS query factories carry the ruled 5-minute staleness, CMS_STALENESS_MS + explicit refetchOnWindowFocus on all 12 options, the Analytics dashboard + Audit Log tuned values pinned untouched by the boundary test; the nine CMS routes' loaders prime their reads at hover-intent through primeCmsQueries + cmsRoutePriming, fire-and-forget queryClient.query() thunks, the non-deprecated fetch path in 5.102.8, so a loader never blocks a navigation and the Cold skeleton stays the screens' existing isPending vocabulary; own-mutation invalidation preserved, every screen's invalidateQueries keys off the factories, whose query keys are byte-stable, invalidation overriding staleness; admin-local only, the api untouched, AppType unchanged). Classifier <actual class>, 11 v1-paths (cms-queries.ts + its test + the nine route loaders) + 2 main-only (docs/progress.md, the plan file, dropped). Content pass clean, query-factory options + route loaders, zero booking tokens, zero edition mechanics. Locks on <v1-sha>: frozen install/build:packages/api-build green; check 35/35 (TEST_DATABASE_URL :5434/sevendays_test); floors admin 30/310 (+6 cms-queries tests, identical to main) and api 31 files / 392+3sk (v1's own); absence audit PASS 0/18 over full history; superset ok (<merge-sha> reachable). Run <run-id>: check success · Deploy v1 (private) success · Deploy teaser (main) skipped. Main side: PR #<PR> squash-merged after CI green; the warm/hover/bounded-staleness walk evidence on #288 (the owner's devtools walk). |
  ```

  Commit:

  ```bash
  git add docs/agents/v1-picks.md
  git commit -m "docs(v1-picks): #288 ledger row - the M8 client-contract pick (admin-local, carries)"
  git push origin main
  ```

---

## Self-review notes for the executor

- **Pin inventory (all read/probed 2026-11-14/15 @ `ec99938`):** the router's `defaultPreload: 'intent'` + `defaultPreloadStaleTime: 0` + global `staleTime: 60_000` (`router.tsx:13-18,26-28`, untouched by this plan); the component-level `useQuery(factory.xxx())` consumption across the nine CMS screens + the sidebar (the grep inventory); the factory-keyed invalidation inventory (packages ×2 + the optimistic flip's cancel/set/rollback, editor ×2, branches ×4, studio-services ×5, addons ×6, lookups ×6, gallery ×9, testimonials ×5, submissions ×2, users-tab's `['admin','users']` the only hard-coded keys, out of scope); the `query()` vs `ensureQueryData` runtime semantics and the deprecated trio (read from the installed `queryClient.js` + `.d.ts` at query-core 5.102.8); the shell loader's awaited site-settings priming (the SSR brand posture, fenced); the boundary fixtures (`MetricsWindow` literals, `AuditLogSearch`'s `{ page: 1 }`); versions react-query 5.102.8 / react-router 1.170.41; the admin before-floor 29 files / 304 (live-run 2026-11-15).
- **The spike (run 2026-11-15, deleted before handoff, `git status` clean):** a scratch `lib/spike-priming.ts` + test exercised the real factories through the planned helper and loader shapes against `tsc --noEmit` + live vitest. It proved: (1) the thunk design typechecks with ZERO casts where an options-typed param fails contravariance (select/staleTime/queryFn carry factory-specific types; root cause the factories' mutable `string[]` keys vs `QueryKey`); (2) `query()`'s five behavior arms (missing→fetch, fresh→serve, stale→refetch, cache-write, retry-default-false) live against a real `QueryClient` with a fake-Date clock (`vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime`, Date only, react-query's own timers stay real); (3) `ensureQueryData` serves stale WITHOUT refetch, the divergence that fences the shell migration; (4) `context.queryClient` + `params.packageId` typing in both loader shapes. The plan's verbatim blocks are that spike's passing shape.
- **Test-count arithmetic:** the admin floor moves 304 → 310 by exactly the 6 tests enumerated in Task 2 (3 staleness/keys/boundary + 3 priming-seam). If `pnpm check` reports anything else, stop and reconcile against the test blocks, never pad. The AGENTS.md floor line (still 27/296, the #286 deferred minor) is NOT this ticket's to fix, it rides #289's closeout.
- **If line numbers shifted** (an intervening commit): every OLD string here is content-anchored, not line-anchored, they still apply; a ≠1 match means drift, stop and reconcile.
- **The two-stage close is the designed path:** Tasks 1–5 are agent-only; only Task 6 waits on the owner. If the owner is AFK after Task 5, the evidence comment is *not* posted yet, #288 stays **open** with the pending-check note, and work stops there, the ticket closes only with the walk observed (or an owner re-ruling on the failure mode).
- **Confound honesty:** #288 may merge before #289's exit-gate walk; the gate judges the milestone sum, never this ticket. This ticket's own evidence is the three walk arms (hover / warm-zero / bounded-one), not a wall-clock claim.
- **The staleness trade is the ruling, not a bug to fix:** cross-staff edit lag up to five minutes is owner-ratified (spec § D4); the walk's background-refetch arm is its visible proof. Anything proposing stronger freshness (polling, cross-tab sync) should be pointed at the spec, not humored with code.
- **No `router.tsx` change, no shell migration, no settings/appointments/dashboard loaders**, each is a deliberate non-feature with its reasoning pinned in Global Constraints + Not here; a reviewer proposing any should be pointed at the matching pin.
