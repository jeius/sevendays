# M2 Ticket 08 — Confirmation read-back `/booking/:id` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A customer who just booked can revisit `/booking/:id` and see their appointment as recorded, read from the public single-get snapshot: confirmation #, branch, offering, add-ons with snapshot prices, PHT schedule, Total row, "confirmation email sent to …", and "need to change? call the branch" (GitHub issue #46, parent spec #37). Unknown ids render a sensible not-found state. The wizard's post-booking redirect becomes typed navigation.

**Architecture:** This is a LANDING-ONLY ticket — every upstream piece already exists: `GET /api/v1/appointments/:id` + the `AppointmentWithAddons` schema + the `appointments.get(id)` client wrapper (ticket 04), and the `peso` / `phDateTime` shared helpers (ticket 07). The single-get carries bare `branchId` / offering refs — only the add-on entries embed name + snapshot price — so the page joins branch and offering NAMES from the sibling list reads (the established "pages join names from the sibling reads" pattern, ticket-07 precedent) with `—` fallbacks. The snapshot-price acceptance criterion is enforced structurally: `confirmationTotalCents(record)` takes ONLY the record — no catalog input exists through which a live price could leak into the read-back. New surface: a `getAppointment` server fn (Sentry span per `.cursorrules`), an `appointmentQueries.byId` query factory, the 404→not-found loader seam promoted to a shared `api-404.ts` (the `peso`/`phDateTime` promotion pattern — `package-slug.ts` keeps a re-export so `/packages/$slug` and its tests are untouched), a pure `booking-read.ts` lib, the `/booking/$id` route (the `/packages/$slug` route pattern verbatim), and the typed-navigation convert in `book.tsx` (retiring the ticket-07 convert-comment).

**Tech Stack:** TanStack Start/Router 1.170.x (file routes via `tsr generate`, loaders + `useSuspenseQuery` SSR pattern), @tanstack/react-query 5.102.x, `@sevendays/api-client` (Hono RPC + `unwrap()` gate — unchanged this ticket), Zod 4.5.1 shared schemas via `@sevendays/types`, Tailwind v4 (CSS-first, `packages/ui` tokens), Vitest 4 lib-seam suite, raw-CDP Node scenarios for page checks.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (§ Confirmation read-back, § Information architecture table row `/booking/:id`, § Testing Decisions) + ticket `.scratch/m2-booking-flow-tickets/08.md` (= GitHub issue #46, parent #37). The plan argues from the spec; executors read both. The prototype's `ConfirmationCard` (`prototype/booking-form-33` branch — `apps/landing/src/routes/prototype/booking.tsx`) is the owner-ratified layout artifact its § was distilled from; its `simulated` banner and trailing parenthetical implementation note die here — everything else is pinned verbatim below.

## Global Constraints

- **Feature branch only:** all work on `feat/m2-08-booking-confirmation`, branched from up-to-date `main`. Never commit directly to `main`; the owner pushes/merges.
- **Scope fence (siblings share the roadmap):** ticket 08 delivers the `/booking/:id` route, its server fn + query factory, the shared 404 seam promotion, the `booking-read.ts` lib, the typed-navigation convert in `book.tsx`, and the CDP harness extension. NOT here: the Resend email (#47 — ticket 09; the page's "email sent" line is pinned copy, not a send); the milestone end-to-end email verification (#48 — ticket 10); any API/types/api-client/db/seed/migration change (the single-get, wrapper, and schema all landed in ticket 04 — a ZERO-API-DIFF ticket); any new env var; any visual design pass (M2's bar is data-complete, visually-rough).
- **Acceptance-criterion 3 note (pre-landed by #45):** "`peso`/`phDateTime` promoted to shared landing helpers" was already delivered by ticket 07 (`apps/landing/src/lib/format.ts` + `format.test.ts`, pinned full-ICU outputs). This ticket only CONSUMES them — there is nothing to re-land, and no new format tests. Note the mapping in the PR description; don't re-promote.
- **`docs/plan.md`'s "Booking confirmation page `/booking/:id` …" checkbox (red-penciled Milestone 2 booking-flow block, the `- [ ]` line directly after the booking-form checkbox) is THIS ticket alone** — Task 5 ticks it with the ✅ emoji only after Tasks 1–4 are committed. The neighboring checkboxes — Resend integration and the Verify line — are siblings' (#47/#48): none may be touched. GitHub issue #46's acceptance boxes stay owner-ticked — note the criterion→task mapping in the PR description, don't edit the issue.
- **Copy is pinned, verbatim everywhere it appears.** From the owner-ratified prototype `ConfirmationCard`: the heading `Booking confirmed ✓`; the `<dl>` rows `Confirmation #` (value = the appointment id, `font-mono`) / `Branch` / `Booking` / `Add-on` (one row per entry: `{name} · {peso(priceCents)}`) / `Schedule` (`{phDateTime(scheduledAt)} (PHT)`) / `Total` (`border-t pt-2 font-semibold` row, `peso(confirmationTotalCents(record))`); the email line `A confirmation email was sent to {customerEmail}.`; the note `Need to change something? Call the branch.` There are NO contact rows, NO status row, and NO notes row on the page (the prototype has none; the email artifact's footer is email-only). **Veto-flag in the PR:** the heading was re-confirmed against the "scheduled, never confirmed" ruling — that ruling is explicitly email-scoped (spec: "the email to say my booking is scheduled — never confirmed"), and the clarify round of 2026-09-10 went unanswered, so the prototype-verbatim heading stands unless the owner extends the ruling at review. **Sequencing note (not a defect):** this ticket lands BEFORE #47, so the page truthfully renders the pinned email line before any email is actually sent — the spec pins the line unconditionally on the read-back, M2 is pre-production (no domains until M6), and the line becomes literally true the day ticket 09 lands.
- **Not-found state (the one invented copy — veto-flagged at PR review like ticket-06's blurb):** heading `Booking not found.` + plain-anchor link `Start a new booking` → `/book`, mirroring the owner-ratified `/packages/$slug` not-found shape (heading + one recovery link; plain anchor per its "dependency-free" comment ruling). The clarify round of 2026-09-10 went unanswered; the `$slug`-pattern default stands unless vetoed.
- **Snapshot rule (acceptance criterion 2):** every price on the page comes from the record — the offering price is `record.bookedPriceCents`, add-on rows render the embedded entries' `priceCents`, and the Total is `confirmationTotalCents(record)` whose signature takes ONLY the record (a later catalog price change cannot rewrite the read-back — there is no catalog price input). Only NAMES join from the sibling reads (branch + offering); a name that can't resolve (e.g. a package deactivated after booking — the lists are active-only) falls back to `—`, the wizard's established fallback. Add-on names/prices never fall back: the entries embed them at booking time.
- **Query posture (`appointmentQueries.byId`):** `retry: false` and NO `staleTime` override. Spec residual quoted: "confirmation-route caching = no special cache posture in M2 — server-function read per request, TanStack Query defaults." Default `staleTime` (0) keeps every visit a fresh server-function read; `retry: false` is NOT a cache posture — it only stops React Query's default 3-retry loop from re-firing a deterministic 404 (an unknown id can never succeed on retry). **Veto-flag in the PR** as the one interpretive call on the residual (the sibling `bySlug` factory encodes its 404 contract the same way, plus `staleTime: Infinity` which this ticket deliberately does NOT copy — revisit-must-refetch is the residual's explicit ruling).
- **Landing unit tests exist ONLY at the lib seam** (spec § Testing Decisions 5: no permanent page/unit harness in M2). This plan adds exactly one new test file (`src/lib/booking-read.test.ts`, 9 tests: 2 query-factory + 7 read-lib); the suite goes 47 → 56. No route-level vitest suites. The query-factory tests mock `./api.functions` and assert the mocked layer's ACTUAL input — the queryFn calls `getAppointment({ data: id })` (the `{ data }` envelope is added by the queryFn; the server fn's validator takes the bare string), so the assertion is `toHaveBeenCalledWith({ data: id })` (package-slug.test.ts pattern, ticket 05).
- **No API integration tests and no api-client loopback tests this ticket** — the API and client are untouched; `appointments.get`'s loopback coverage is ticket-04's. The page's rendering is verified by the Task 4 CDP scripts (the e2e drives real bookings; the wizard scenario gains one read-only unknown-id check).
- **CDP harness requirements (verification-only):** Chrome/Chromium with `--remote-debugging-port=9222`, `pnpm --filter @sevendays/api dev` (port 8787, seeded compose db), and the landing dev server (port 3000, `API_URL` set in `apps/landing/.env.local`). Scripts take URLs from `LANDING_VERIFY_URL` / `API_VERIFY_URL` (defaults `http://localhost:3000` / `http://127.0.0.1:8787`). Failures name the failing check and exit 1. Expectations are re-derived from the live API reads — never hard-coded names/prices/ids. `booking-wizard.mjs` stays READ-ONLY over the data (gains exactly one check: the unknown-id not-found, asserted by status + rendered text — the `packages-pages.mjs` "uniform not-found" precedent). `booking-e2e.mjs` MUTATES (writes two bookings) — ticket-07 precedent: it ran at build time against the compose stack and its rows persist by design (tiny volume; the studio reconciles manually until M3); run it once in Task 4 and say so in the commit body.
- **Versions pinned (resolved from the workspace lock 2026-09-10):** `@tanstack/react-router` 1.170.33 → `@tanstack/router-core` 1.171.28 (ticket-07 resolution, lock unchanged), `@tanstack/react-start` 1.168.50, `@tanstack/react-query` 5.102.8, `zod` 4.5.1. Pre-flight grep-proof for the one type claim this ticket makes: `navigate({ to, params })` — the installed `@tanstack/react-router/dist/esm/link.d.ts:11` documents "Options cover `to`, `params`, `search`, `hash`, `state`, `preload`"; the typed inference against the regenerated route tree is enforced by the Task 3 `typecheck` gate (the claim only becomes checkable once `/booking/$id` exists in `routeTree.gen.ts`). `createServerFn` handlers always receive the options object — `.validator((input: string) => input)` + `handler(async ({ data }) => ...)`, callers pass `{ data }` (ticket-05/07 ruling, start 1.170.x).
- **Typed-navigation convert:** ticket 07 left `book.tsx` navigating by href with the comment `// Typed navigate({ to: '/booking/$id' }) lands with ticket #46 — the route doesn't exist yet; navigate by fully-built href.` — Task 3 replaces that exact block with `navigate({ to: '/booking/$id', params: { id: result.appointmentId } })` and deletes the comment. This is the ONLY edit to `book.tsx`; the wizard's behavior must stay green (the Task 4 wizard regression run proves it).
- **Sentry spans on the new server function** (`apps/landing/.cursorrules`): wrap the handler body in `startSpan({ name: 'GET /api/v1/appointments/:id' }, ...)` (named import, per the repo Biome rule) exactly like the existing server fns.
- **`routeTree.gen.ts` is generated:** after creating the route file run `pnpm --filter @sevendays/landing generate-routes` — never hand-edited.
- **Biome-clean commits:** `pnpm exec biome check --write <files>` on every created/modified code file before committing (project `fix` scripts call the `biome` bin).
- **`noUncheckedIndexedAccess` is on:** index access in new code is guarded (`if (!row) ...`), never `!`.
- **Fresh-clone gates:** on a fresh clone run `pnpm install` → `pnpm build:packages` → `pnpm --filter @sevendays/api build` before any typecheck (the shared client resolves the API's `AppType` from built `dist/`; the vitest config entry is built, not source).
- **Commit style:** scoped conventional subjects (`feat(landing):`, `test(landing):`, `docs:`), bullet bodies when wordy; one commit per task.

---

## File Structure

```
apps/landing/src/lib/api-404.ts                  (new, Task 1) shared 404→not-found loader seam (promoted from package-slug.ts)
apps/landing/src/lib/package-slug.ts             (mod, Task 1) slims to a re-export of the promoted seam — $slug.tsx + its tests untouched
apps/landing/src/lib/api.functions.ts            (mod, Task 1) + getAppointment (Sentry span GET /api/v1/appointments/:id)
apps/landing/src/lib/queries.ts                  (mod, Task 1) + appointmentQueries.byId
apps/landing/src/lib/booking-read.test.ts        (new, Tasks 1–2) query-factory (2) + read-lib (7) seam tests — suite 47 → 56
apps/landing/src/lib/booking-read.ts             (new, Task 2) pure read-back joins + snapshot-only total
apps/landing/src/routes/booking.$id.tsx          (new, Task 3) /booking/:id read-back page ($slug pattern verbatim)
apps/landing/src/routeTree.gen.ts                (regen, Task 3) via pnpm --filter @sevendays/landing generate-routes — never hand-edited
apps/landing/src/routes/book.tsx                 (mod, Task 3) typed navigate convert (retires the ticket-07 convert-comment)
apps/landing/scripts/verify/booking-wizard.mjs   (mod, Task 4) + unknown-id not-found check (read-only; 14 → 15)
apps/landing/scripts/verify/booking-e2e.mjs      (mod, Task 4) 404-boundary check → read-back content assertions (6 → 7)
docs/plan.md                                     (mod, Task 5) booking-confirmation checkbox → - [✅]
docs/progress.md                                 (mod, Task 5) ticket-08 landed bullet + Last-updated line
```

Component rule (inherited from tickets 05–07): pages compose the shared components; only layout/heading/copy lives in routes; data only through `queries.ts` factories; behavior lives in pure libs tested at the lib seam. The confirmation card's markup stays in `booking.$id.tsx` (it is layout + pinned copy over the record); every computation (joins, fallbacks, total) lives in `booking-read.ts`.

---

### Task 1: Data layer — `getAppointment` server fn, `appointmentQueries.byId`, shared 404 seam (TDD)

**Files:**
- Create: `apps/landing/src/lib/api-404.ts`, `apps/landing/src/lib/booking-read.test.ts` (Task 1 writes the query-factory describe; Task 2 appends the read-lib describes)
- Modify: `apps/landing/src/lib/package-slug.ts`, `apps/landing/src/lib/api.functions.ts`, `apps/landing/src/lib/queries.ts`

**Interfaces:**
- Consumes: `getApiClient().appointments.get(args)` (ticket-04 wrapper; `GetAppointmentArgs` = `{ param: { id: string } }`, 404 rejects with `ApiClientError(404)` whose details carry `{ error: 'Appointment not found.' }`), `notFound` from `@tanstack/react-router`, `ApiClientError` from `@sevendays/api-client`.
- Produces (Tasks 2–3 consume these exact names):
  - `api.functions.ts`: `getAppointment` — server fn, validator takes the bare id string, Sentry span `GET /api/v1/appointments/:id`, callers pass `{ data: id }`.
  - `queries.ts`: `appointmentQueries.byId(id: string)` → `queryOptions({ queryKey: ['appointments', 'by-id', id], queryFn, retry: false })` (no `staleTime` override — Global Constraints posture).
  - `api-404.ts`: `toNotFoundError(err: unknown): unknown` — the shared loader seam; `package-slug.ts` re-exports it.

**Not here:** no route/component work (Task 3), no read-lib (Task 2 — the test file it lives in starts here with only the queries describe), no verify-script change (Task 4), no `packages/api-client` or API change (wrapper and endpoint exist).

- [ ] **Step 1: Write the failing query-factory tests** — create `apps/landing/src/lib/booking-read.test.ts`:

```ts
import { ApiClientError } from '@sevendays/api-client';
import type { AppointmentWithAddons } from '@sevendays/types';
import type { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppointment } from './api.functions';
import { appointmentQueries } from './queries';

// The ticket-08 read-back feature suite: query factory (Task 1) + the pure
// read lib (Task 2). The seam, not the network (package-slug.test.ts
// pattern): the server fn is mocked so these tests prove the query
// factory's contract without a Start runtime. Page rendering is the CDP
// scripts' job (spec § Testing Decisions 5).
vi.mock('./api.functions', () => ({
  getAppointment: vi.fn(),
}));

const mockedGet = vi.mocked(getAppointment);

type MinimalQueryContext = {
  client: QueryClient;
  queryKey: string[];
  signal: AbortSignal;
  meta: Record<string, unknown> | undefined;
  pageParam?: unknown;
  direction?: unknown;
};

describe('appointmentQueries.byId', () => {
  beforeEach(() => {
    mockedGet.mockClear();
  });

  it('happy path: returns the fetched record (bare id passed through as { data })', async () => {
    const rec = { id: '0c9dc0de-0000-4000-8000-000000000001' } as AppointmentWithAddons;
    mockedGet.mockResolvedValueOnce(rec);
    const queryFn = appointmentQueries.byId('0c9dc0de-0000-4000-8000-000000000001').queryFn;
    await expect(queryFn?.({} as MinimalQueryContext)).resolves.toBe(rec);
    expect(mockedGet).toHaveBeenCalledWith({ data: '0c9dc0de-0000-4000-8000-000000000001' });
  });

  it('404 posture: retry is false (a deterministic 404 is never retried) and staleTime stays default', async () => {
    const err = new ApiClientError(404, { error: 'Appointment not found.' });
    mockedGet.mockRejectedValue(err);
    const queryFn = appointmentQueries.byId('99999999-9999-4999-8999-999999999999').queryFn;
    await expect(queryFn?.({} as MinimalQueryContext)).rejects.toBe(err);
    const options = appointmentQueries.byId('99999999-9999-4999-8999-999999999999');
    expect(options.retry).toBe(false);
    expect(options.staleTime).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify the tests fail**

Run: `pnpm --filter @sevendays/landing test`
Expected: FAIL — `appointmentQueries` does not exist on `./queries` (the named import of a missing export fails the file's collection outright, or the property access throws on `undefined` — either is the expected RED). The 47 existing tests still pass.

- [ ] **Step 3: Promote the 404 seam** — create `apps/landing/src/lib/api-404.ts`:

```ts
import { ApiClientError } from '@sevendays/api-client';
import { notFound } from '@tanstack/react-router';

/**
 * Shared loader seam for detail routes reading a single resource through
 * the API (promoted from package-slug.ts, M2 ticket 08 — the same
 * promotion move as peso/phDateTime): unknown ids/slugs reject with
 * ApiClientError(404) — map exactly that to the router's not-found error
 * so the route's notFoundComponent renders; anything else (500, network,
 * Zod drift) propagates to the error boundary untouched.
 */
export function toNotFoundError(err: unknown): unknown {
  if (err instanceof ApiClientError && err.status === 404) {
    return notFound();
  }
  return err;
}
```

Then `apps/landing/src/lib/package-slug.ts` becomes exactly (the function, its doc comment, and the `ApiClientError`/`notFound` imports move; the re-export keeps `/packages/$slug` and `package-slug.test.ts` untouched and green):

```ts
export { toNotFoundError } from './api-404.js';
```

- [ ] **Step 4: Add the server fn and query factory** — in `apps/landing/src/lib/api.functions.ts`, append (keep everything already there untouched):

```ts
/**
 * Confirmation read-back (ticket 08). Callers pass the start-fn payload
 * ({ data: id }); the api-client RPC shape ({ param: { id } }) is wrapped
 * here. Unknown ids reject with ApiClientError(404) — the loader maps that
 * to the router's not-found via lib/api-404.ts.
 */
export const getAppointment = createServerFn()
  .validator((input: string) => input)
  .handler(async ({ data }) => {
    return startSpan({ name: 'GET /api/v1/appointments/:id' }, async () => {
      return getApiClient().appointments.get({ param: { id: data } });
    });
  });
```

In `apps/landing/src/lib/queries.ts`, add `getAppointment` to the existing import from `./api.functions` (the import block becomes `getAddonServices, getAppointment, getBranches, getServicePackageBySlug, getServicePackages, getStudioServices`) and append:

```ts
export const appointmentQueries = {
  /**
   * Confirmation read-back (ticket 08). Posture per the spec residual —
   * no special cache posture: the default staleTime keeps every visit a
   * fresh server-function read; `retry: false` only stops the default
   * retry loop from re-firing the deterministic 404 an unknown id
   * produces (retry is not caching — nothing here outlives the visit).
   */
  byId: (id: string) =>
    queryOptions({
      queryKey: ['appointments', 'by-id', id],
      queryFn: () => getAppointment({ data: id }),
      retry: false,
    }),
};
```

- [ ] **Step 5: Run the suite**

Run: `pnpm --filter @sevendays/landing test`
Expected: PASS (49 tests — 47 existing + 2 new; `package-slug.test.ts` green through the re-export).

- [ ] **Step 6: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/lib/api-404.ts src/lib/package-slug.ts src/lib/api.functions.ts src/lib/queries.ts src/lib/booking-read.test.ts
git add apps/landing/src/lib/api-404.ts apps/landing/src/lib/package-slug.ts apps/landing/src/lib/api.functions.ts apps/landing/src/lib/queries.ts apps/landing/src/lib/booking-read.test.ts
git commit -m "feat(landing): appointment read server fn + query factory, shared 404 seam"
```

(Body bullets: `getAppointment wraps the ticket-04 appointments.get RPC with a Sentry span (GET /api/v1/appointments/:id); appointmentQueries.byId — retry:false so a deterministic 404 is never retried, staleTime default per the no-cache-posture spec residual (veto-flagged). toNotFoundError promoted package-slug.ts → api-404.ts (the peso/phDateTime promotion pattern); package-slug re-exports so /packages/$slug and its tests are untouched. Landing suite 47 → 49.`)

---

### Task 2: The pure read-back lib — snapshot total + name joins (TDD)

**Files:**
- Create: `apps/landing/src/lib/booking-read.ts`
- Modify: `apps/landing/src/lib/booking-read.test.ts` (append the read-lib describes + fixture builders to the Task 1 file)

**Interfaces:**
- Consumes: `AppointmentWithAddons`, `Branch`, `ServicePackageWithInclusions`, `StudioServiceWithBranches` from `@sevendays/types`.
- Produces (Task 3 consumes these exact names):
  - `confirmationTotalCents(record: AppointmentWithAddons): number` — `bookedPriceCents + Σ addonServices[].priceCents`; the signature takes ONLY the record (the snapshot-price rule enforced by the type — no catalog parameter exists).
  - `branchNameFor(record: AppointmentWithAddons, branches: Branch[]): string` — name joined from the branches read; `—` when unresolvable.
  - `offeringNameFor(record: AppointmentWithAddons, catalog: { packages: ServicePackageWithInclusions[]; services: StudioServiceWithBranches[] }): string` — package name when `servicePackageId` is set, service name when `studioServiceId` is set; `—` when the offering has left the active-only lists.

**Not here:** no React (Task 3), no network (the lib receives already-fetched data), no format helpers (the route applies `peso`/`phDateTime` — Task 2 returns numbers/does no formatting).

- [ ] **Step 1: Append the failing read-lib tests** — in `apps/landing/src/lib/booking-read.test.ts`, extend the `@sevendays/types` import to `import type { AppointmentWithAddons, Branch, ServicePackageWithInclusions, StudioServiceWithBranches } from '@sevendays/types';`, add the import from the not-yet-existing module:

```ts
import {
  branchNameFor,
  confirmationTotalCents,
  offeringNameFor,
} from './booking-read';
```

(biome will sort it into place at Step 5), and append at the file tail:

```ts
// --- Fixtures (full literals, booking.test.ts pattern) ---------------------

const B1 = branch('11111111-1111-4111-8111-111111111111', 'Branch One');
const B2 = branch('22222222-2222-4222-8222-222222222222', 'Branch Two');
const PKG = pkg('44444444-4444-4444-8444-444444444444', 'Package A');
const SVC = service('33333333-3333-4333-8333-333333333333', 'Portraits & ID Photo');

function branch(id: string, name: string): Branch {
  return {
    id,
    name,
    address: 'test address',
    phone: '+63 900 000 000',
    acceptsWalkIns: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function pkg(id: string, name: string): ServicePackageWithInclusions {
  return {
    id,
    name,
    description: 'test package',
    priceCents: 90000,
    durationMinutes: null,
    isActive: true,
    coverImageKey: null,
    slug: `slug-${id.slice(-4)}`,
    isFeatured: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    inclusions: [],
    frames: [],
  };
}

function service(id: string, name: string): StudioServiceWithBranches {
  return {
    id,
    name,
    description: 'test service',
    priceCents: 150000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    bookableBranchIds: [],
    applicableAddonServiceIds: [],
  };
}

function record(overrides: Partial<AppointmentWithAddons> = {}): AppointmentWithAddons {
  return {
    id: '0c9dc0de-0000-4000-8000-000000000001',
    branchId: B1.id,
    servicePackageId: PKG.id,
    studioServiceId: null,
    customerName: 'Juana Dela Cruz',
    customerEmail: 'juana@example.com',
    customerPhone: '+63 917 000 0000',
    scheduledAt: new Date('2026-12-25T01:30:00.000Z'),
    status: 'pending',
    kind: 'scheduled',
    bookedPriceCents: 90000,
    notes: null,
    createdAt: new Date('2026-09-10T00:00:00Z'),
    updatedAt: new Date('2026-09-10T00:00:00Z'),
    addonServices: [],
    ...overrides,
  };
}

describe('confirmationTotalCents', () => {
  it('sums the offering snapshot and the add-on entries (seed-scale: ₱900 + ₱120 + ₱60 = ₱1,080)', () => {
    const rec = record({
      addonServices: [
        {
          addonServiceId: '55555555-5555-4555-8555-555555555555',
          name: 'Makeup',
          priceCents: 12000,
        },
        {
          addonServiceId: '66666666-6666-4666-8666-666666666666',
          name: 'Hairstyle',
          priceCents: 6000,
        },
      ],
    });
    expect(confirmationTotalCents(rec)).toBe(108000);
  });

  it('totals a service booking with no add-ons from the offering snapshot alone', () => {
    expect(
      confirmationTotalCents(
        record({ servicePackageId: null, studioServiceId: SVC.id, bookedPriceCents: 150000 })
      )
    ).toBe(150000);
  });
});

describe('branchNameFor', () => {
  it('resolves the branch name from the branches read', () => {
    expect(branchNameFor(record(), [B1, B2])).toBe('Branch One');
  });

  it("falls back to '—' when the branch is unresolvable", () => {
    expect(
      branchNameFor(record({ branchId: '99999999-9999-4999-8999-999999999999' }), [B1, B2])
    ).toBe('—');
  });
});

describe('offeringNameFor', () => {
  it('resolves a package booking from the packages read', () => {
    expect(offeringNameFor(record(), { packages: [PKG], services: [SVC] })).toBe('Package A');
  });

  it('resolves a service booking from the services read', () => {
    expect(
      offeringNameFor(record({ servicePackageId: null, studioServiceId: SVC.id }), {
        packages: [PKG],
        services: [SVC],
      })
    ).toBe('Portraits & ID Photo');
  });

  it("falls back to '—' when the offering has left the active-only lists", () => {
    expect(offeringNameFor(record(), { packages: [], services: [] })).toBe('—');
  });
});
```

- [ ] **Step 2: Run to verify the read-lib tests fail**

Run: `pnpm --filter @sevendays/landing test`
Expected: FAIL — `./booking-read` cannot be resolved (import error; the 49 existing tests still pass).

- [ ] **Step 3: Implement `booking-read.ts`** — create `apps/landing/src/lib/booking-read.ts`:

```ts
// Confirmation read-back joins (issue #46). The public single-get carries
// bare branch/offering refs — only the add-on entries embed name + booking-
// time price — so the page joins names from the sibling list reads (the
// pages-join-names pattern). Prices NEVER come from the catalog: the total
// sums only record-carried snapshot values, and no function here accepts a
// catalog price as input — the snapshot rule is enforced by the signatures,
// not by discipline.

import type {
  AppointmentWithAddons,
  Branch,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';

/** Total due, from the record only: offering snapshot + add-on entry snapshots. */
export function confirmationTotalCents(record: AppointmentWithAddons): number {
  return record.bookedPriceCents + record.addonServices.reduce((sum, a) => sum + a.priceCents, 0);
}

/** Branch display name joined from the branches read; '—' when unresolvable. */
export function branchNameFor(record: AppointmentWithAddons, branches: Branch[]): string {
  return branches.find((b) => b.id === record.branchId)?.name ?? '—';
}

export interface ReadCatalog {
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
}

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

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sevendays/landing test`
Expected: PASS (56 tests — 49 existing + 7 new).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/lib/booking-read.ts src/lib/booking-read.test.ts
git add apps/landing/src/lib/booking-read.ts apps/landing/src/lib/booking-read.test.ts
git commit -m "feat(landing): pure booking read-back lib — snapshot total, name joins"
```

(Body bullets: `confirmationTotalCents takes only the record — the snapshot-price criterion is enforced by the signature (no catalog input exists); branch/offering names join from the sibling reads with the wizard's — fallback. 7 lib-seam tests; suite 49 → 56.`)

---

### Task 3: `/booking/$id` route + typed-navigation convert

**Files:**
- Create: `apps/landing/src/routes/booking.$id.tsx`
- Modify: `apps/landing/src/routeTree.gen.ts` (via `pnpm --filter @sevendays/landing generate-routes` — never hand-edited), `apps/landing/src/routes/book.tsx` (the one typed-nav convert)

**Interfaces:**
- Consumes: `appointmentQueries.byId` / `branchQueries` / `servicePackageQueries` / `studioServiceQueries` (Task 1 + existing), `toNotFoundError` (Task 1), the Task 2 lib (`confirmationTotalCents`, `branchNameFor`, `offeringNameFor`), `peso` + `phDateTime` (`format.ts`, ticket 07), `SiteHeader`, the pinned copy in Global Constraints.
- Produces: the `/booking/$id` route — full snapshot read-back + uniform not-found — and typed wizard navigation to it (the ticket-07 convert-comment retired).

**Not here:** no email send or send-status logic (the pinned email line is static copy — #47 makes it literally true later), no CDP script change (Task 4), no docs (Task 5), no further `book.tsx` changes beyond the exact convert below.

- [ ] **Step 1: Create the route** — `apps/landing/src/routes/booking.$id.tsx`:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { SiteHeader } from '../components/site-header';
import { toNotFoundError } from '../lib/api-404';
import { branchNameFor, confirmationTotalCents, offeringNameFor } from '../lib/booking-read';
import { peso, phDateTime } from '../lib/format';
import {
  appointmentQueries,
  branchQueries,
  servicePackageQueries,
  studioServiceQueries,
} from '../lib/queries';

export const Route = createFileRoute('/booking/$id')({
  loader: async ({ params, context: { queryClient } }) => {
    // The appointment read gates the 404; the catalog reads feed the name
    // joins. Only the appointment's 404 maps to not-found — the catalog
    // reads are lists with no 404 path, so their failures pass through to
    // the error boundary untouched.
    const catalogPromise = Promise.all([
      queryClient.ensureQueryData(branchQueries.all()),
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
    ]);
    try {
      const record = await queryClient.ensureQueryData(appointmentQueries.byId(params.id));
      await catalogPromise;
      return record;
    } catch (err) {
      throw toNotFoundError(err);
    }
  },
  component: BookingConfirmation,
  // Unknown id → uniform not-found (copy veto-flagged at PR review).
  notFoundComponent: () => (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <div className='mt-16 flex flex-col items-center gap-4'>
        <h1 className='font-semibold text-2xl'>Booking not found.</h1>
        {/* Plain anchor: keeps the not-found page dependency-free. */}
        <a href='/book' className='underline'>
          Start a new booking
        </a>
      </div>
    </div>
  ),
});

function BookingConfirmation() {
  const record = Route.useLoaderData();
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <div className='mx-auto mt-8 max-w-lg rounded-xl border p-6'>
        <p className='font-semibold text-lg'>Booking confirmed ✓</p>
        <dl className='mt-4 space-y-2 text-sm'>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Confirmation #</dt>
            <dd className='font-mono'>{record.id}</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Branch</dt>
            <dd>{branchNameFor(record, branches)}</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Booking</dt>
            <dd>{offeringNameFor(record, { packages, services })}</dd>
          </div>
          {record.addonServices.map((a) => (
            <div key={a.addonServiceId} className='flex justify-between gap-4'>
              <dt className='text-muted-foreground'>Add-on</dt>
              <dd>
                {a.name} · {peso(a.priceCents)}
              </dd>
            </div>
          ))}
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Schedule</dt>
            <dd>{phDateTime(record.scheduledAt.toISOString())} (PHT)</dd>
          </div>
          <div className='flex justify-between gap-4 border-t pt-2 font-semibold'>
            <dt>Total</dt>
            <dd>{peso(confirmationTotalCents(record))}</dd>
          </div>
        </dl>
        <p className='mt-4 text-sm'>A confirmation email was sent to {record.customerEmail}.</p>
        <p className='mt-1 text-muted-foreground text-sm'>
          Need to change something? Call the branch.
        </p>
      </div>
    </div>
  );
}
```

(Prototype deltas, deliberate: the `simulated` banner and the trailing parenthetical implementation note die; add-on rows key on `a.addonServiceId` (stable, unique per the appointment↔add-on unique pair) instead of the prototype's `a.name`; `record.scheduledAt` is a `Date` after the client's Zod parse (`z.coerce.date()`), so the ISO string feeds `phDateTime` via `.toISOString()`.)

- [ ] **Step 2: Generate the route tree**

Run: `pnpm --filter @sevendays/landing generate-routes`
Expected: `routeTree.gen.ts` now declares `/booking/$id`. (Hand-editing it is forbidden.)

- [ ] **Step 3: Convert the wizard's redirect to typed navigation** — in `apps/landing/src/routes/book.tsx`, replace the exact block:

```tsx
      // Typed navigate({ to: '/booking/$id' }) lands with ticket #46 — the
      // route doesn't exist yet; navigate by fully-built href.
      navigate({ href: `/booking/${result.appointmentId}` });
```

with:

```tsx
      navigate({ to: '/booking/$id', params: { id: result.appointmentId } });
```

- [ ] **Step 4: Typecheck (the typed-navigation gate), test, lint**

Run: `pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test`
Expected: both PASS — the typecheck proves the `navigate({ to: '/booking/$id', params })` inference against the regenerated route tree (the pre-flight grep-proof's enforcement point); the suite stays 56.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @sevendays/landing exec biome check --write src/routes/booking.\$id.tsx src/routes/book.tsx
git add apps/landing/src/routes/booking.\$id.tsx apps/landing/src/routes/book.tsx apps/landing/src/routeTree.gen.ts
git commit -m "feat(landing): /booking/:id snapshot read-back + typed wizard navigation"
```

(Body bullets: `Confirmation read-back over the public single-get (#46): snapshot card per the prototype (confirmation #, branch, offering, add-on rows, PHT schedule, Total, email line, call-the-branch note); names join from the sibling reads, prices never leave the record. Unknown id → uniform not-found (copy veto-flagged). book.tsx navigates typed — the #46 convert-comment retired.`)

---

### Task 4: CDP harness — wizard unknown-id check + e2e read-back assertions

**Files:**
- Modify: `apps/landing/scripts/verify/booking-wizard.mjs` (14 → 15 checks), `apps/landing/scripts/verify/booking-e2e.mjs` (6 → 7 checks)

**Interfaces:**
- Consumes: the Task 3 route (SSR HTML carries the rendered card / not-found — the `packages-pages.mjs` "uniform not-found" text-assertion precedent), the e2e's existing two-booking flow and its fetched records.
- Produces: build-time proof of the not-found state + regression proof of the wizard; verify-grade content assertions of both bookings' read-back pages for the milestone run.

**Not here:** no new scenario file (the harness stays: `content-pages` / `packages-pages` / `booking-wizard` read-only + `booking-e2e` mutating), no lib.mjs change, no expectations hard-coded from the seed (everything re-derived from the live API reads).

- [ ] **Step 1: Add the unknown-id check to the wizard scenario** — in `apps/landing/scripts/verify/booking-wizard.mjs`, append after the last existing check (the rail-total check), before `close()`:

```js
  // 15 — ticket 08: the confirmation route exists; an unknown id renders
  // the uniform not-found (status + rendered text, packages-pages precedent).
  const missingRes = await fetch(`${LANDING}/booking/00000000-0000-4000-8000-000000000000`);
  const missingHtml = await missingRes.text();
  check(
    'book: unknown booking id renders the uniform not-found (heading + recovery link)',
    missingRes.status === 404 &&
      missingHtml.includes('Booking not found.') &&
      missingHtml.includes('Start a new booking')
  );
```

- [ ] **Step 2: Replace the e2e's 404-boundary check with read-back content assertions** — in `apps/landing/scripts/verify/booking-e2e.mjs`:

(a) add the peso helper next to the existing `phDate` helper (mirrors `format.ts` / the wizard script's helper — full-ICU Node; if a pinned rendering misses on the runner, the fix is a full-ICU Node environment, never editing the script's formatter):

```js
const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
```

(b) replace the exact block:

```js
  const confRes = await fetch(`${LANDING}${pkgPath}`);
  check('confirmation page 404s until #46 (the expected boundary)', confRes.status === 404);
```

with:

```js
  // Ticket 08: the read-back page is live — assert the rendered snapshot
  // (names joined from the sibling reads; prices from the record only).
  // React SSR splits interpolated text nodes with <!-- --> markers, so
  // strip them before plain-substring matching (live-run finding).
  const stripSsrMarkers = (html) => html.replace(/<!-- -->/g, '');
  const confHtml = stripSsrMarkers(await (await fetch(`${LANDING}${pkgPath}`)).text());
  const expectedTotal = peso(
    pkgRecord.bookedPriceCents + pkgRecord.addonServices.reduce((s, a) => s + a.priceCents, 0)
  );
  check(
    'package read-back renders the booked snapshot (heading, names, PHT schedule, snapshot total, email line)',
    confHtml.includes('Booking confirmed ✓') &&
      confHtml.includes(pkg.name) &&
      confHtml.includes(branch.name) &&
      confHtml.includes(addons[0].name) &&
      confHtml.includes(expectedTotal) &&
      confHtml.includes('(PHT)') &&
      confHtml.includes('A confirmation email was sent to e2e@example.com.') &&
      confHtml.includes('Need to change something? Call the branch.'),
    `expected total ${expectedTotal}`
  );
```

(c) append the service-booking read-back check after the existing service-snapshot check (before `close()`):

```js
  // Ticket 08: the service read-back — no add-on rows render when the
  // booking carries none (the page's 'Add-on' rows are the only source of
  // that string).
  const svcHtml = stripSsrMarkers(await (await fetch(`${LANDING}${svcPath}`)).text());
  check(
    'service read-back renders the booked snapshot with no add-on rows',
    svcHtml.includes('Booking confirmed ✓') &&
      svcHtml.includes(svc.name) &&
      svcHtml.includes(branch.name) &&
      !svcHtml.includes('Add-on') &&
      svcHtml.includes(peso(svcRecord.bookedPriceCents))
  );
```

(d) update the file-header comment: the closing line "then reads each back through the public single-get and asserts the server snapshot (bookedPriceCents, add-on entries, status)" becomes "then reads each back through the public single-get AND its /booking/:id page, asserting the server snapshot (bookedPriceCents, add-on entries, status) and the rendered read-back (ticket 08)".

- [ ] **Step 3: Bring up the stack and run both scripts**

```bash
# Terminal 1: pnpm --filter @sevendays/api dev        (port 8787, seeded compose db)
# Terminal 2: pnpm --filter @sevendays/landing dev    (port 3000, API_URL in .env.local)
# Terminal 3: Chrome with --remote-debugging-port=9222

node apps/landing/scripts/verify/booking-wizard.mjs
node apps/landing/scripts/verify/booking-e2e.mjs
```

Expected: wizard 15/15 (the 14 pre-existing checks prove the typed-nav convert regressed nothing); e2e 7/7 (the retired boundary check is replaced by the two read-back checks). The e2e writes two booking rows to the compose db by design (ticket-07 precedent — rows persist; tiny volume). Run the regression scripts too — `node apps/landing/scripts/verify/packages-pages.mjs` and `node apps/landing/scripts/verify/content-pages.mjs` — both green (the `$slug` re-export and the new route must not have moved the older pages).

- [ ] **Step 4: Commit**

```bash
pnpm exec biome check --write apps/landing/scripts/verify/booking-wizard.mjs apps/landing/scripts/verify/booking-e2e.mjs
git add apps/landing/scripts/verify/booking-wizard.mjs apps/landing/scripts/verify/booking-e2e.mjs
git commit -m "test(landing): confirmation read-back CDP checks — wizard not-found, e2e snapshot assertions"
```

(Body bullets: `booking-wizard.mjs 14 → 15 (read-only unknown-id not-found, status + text per the packages-pages precedent); booking-e2e.mjs 6 → 7 (the '404s until #46' boundary check replaced by rendered-snapshot assertions for both bookings — names/total/email line, add-on rows absent on the service booking). Live runs: wizard 15/15, e2e 7/7 (two rows written to the compose db by design), regressions green.`)

---

### Task 5: Docs — tick the checkbox, log the landing

**Files:**
- Modify: `docs/plan.md`, `docs/progress.md`

**Not here:** no code; no other plan.md checkboxes (Resend + Verify stay untouched — #47/#48); no edits to GitHub issue #46 (owner ticks its boxes; the PR description maps criteria→tasks).

- [ ] **Step 1: Tick this ticket's checkbox** — in `docs/plan.md`, the line

```
- [ ] Booking confirmation page `/booking/:id` — snapshot read-back fed by the public single-get (client `appointments.get(id)` + landing server fn)
```

becomes

```
- [✅] Booking confirmation page `/booking/:id` — snapshot read-back fed by the public single-get (client `appointments.get(id)` + landing server fn) _(2026-09-10: ticket 08 (#46) — `/booking/$id` over the existing single-get + `appointments.get` wrapper (zero-API-diff ticket); snapshot card per the prototype (confirmation #, branch, offering, add-on snapshot prices, PHT schedule, Total, email line, call-the-branch note); names join from the sibling reads, prices never leave the record; unknown id → uniform not-found; `toNotFoundError` promoted to shared `api-404.ts`; typed wizard navigation. Copy veto-flags ride the PR.)_
```

- [ ] **Step 2: Add the progress bullet** — in `docs/progress.md`, in the `## What Exists` section directly after the M2 ticket 07 bullet, insert:

```
- **M2 ticket 08 — confirmation read-back `/booking/:id` (#46 → .scratch/m2-booking-flow-tickets/08.md):** the post-booking page landed over the EXISTING public single-get + `appointments.get` wrapper (ticket 04) and the ticket-07 `peso`/`phDateTime` helpers — a zero-API-diff ticket. `/booking/$id` follows the `/packages/$slug` pattern verbatim (loader `ensureQueryData` + `toNotFoundError` → per-route `notFoundComponent`); the snapshot card renders confirmation # (mono id), branch, offering, add-on rows with booking-time prices, PHT schedule, Total, the pinned email line, and the call-the-branch note. Snapshot rule enforced structurally: `confirmationTotalCents(record)` takes only the record (no catalog price input); only NAMES join from the sibling reads (`branchNameFor` / `offeringNameFor`, `—` fallback when an offering has left the active-only lists). Data layer: `getAppointment` server fn (Sentry span) + `appointmentQueries.byId` (retry:false — deterministic 404 never retried; staleTime default per the no-cache-posture spec residual, veto-flagged); `toNotFoundError` promoted `package-slug.ts` → shared `api-404.ts` (re-export keeps `$slug` + tests untouched). `book.tsx` navigates typed (`{ to: '/booking/$id', params }`) — the ticket-07 convert-comment retired. Copy: heading `Booking confirmed ✓` is prototype-verbatim (the "scheduled, never confirmed" ruling is email-scoped; clarify went unanswered — veto-flagged); not-found copy `Booking not found.` + `Start a new booking` is invented (veto-flagged); the email line renders unconditionally before #47 (spec-pinned; pre-production). Tests: lib seam 47 → 56 (`booking-read.test.ts`: query factory ×2 + read lib ×7). CDP: `booking-wizard.mjs` 14 → 15 (read-only unknown-id not-found); `booking-e2e.mjs` 6 → 7 (boundary check replaced by rendered-snapshot assertions for both bookings); regressions green. Full `pnpm check` green. NOT landed: Resend email (#47 — the page's email line precedes it by design), milestone e2e-with-email verify (#48).
```

Also update the `_Last updated:_` line at the top of the file: prepend `2026-09-10: M2 ticket 08 — /booking/:id confirmation read-back.` to the parenthetical, demoting the current text to `Prior …` in the same pattern the line already uses.

- [ ] **Step 3: Full gate, then commit**

```bash
pnpm check
git add docs/plan.md docs/progress.md
git commit -m "docs: tick the /booking/:id checkbox — M2 ticket 08 landed"
```

Expected: `pnpm check` (lint + format + typecheck + test across the workspace) green — the AGENTS.md gate for every touched package.
