# M2 Ticket 07 — Booking Wizard `/book` (prototype variant C) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The guest booking flow lands on `/book` as one route with client-side steps, one question per screen (prototype variant C): branch → offering (Service Packages grid first, Studio Services bookable at that branch below) → conditional add-ons → date/time (PHT note, placeholder hour chips) → contact → POST → redirect to `/booking/:id` — with deep-link prefill/filtering, a sticky live-total rail, inline past-pick hints, and typed API rejection cards (GitHub issue #45, parent spec #37).

**Architecture:** The wizard's logic is a pure lib (`src/lib/booking.ts`): step transitions, deep-link prefill validation, branch filtering, add-on applicability, totals, the PH wall-clock → instant conversion, and API-rejection mapping are pure functions with lib-seam vitest tests; a thin `useBookingWizard` hook only wires them to React state (untested — the CDP scenario owns behavior). The add-ons step needs the applicability matrix client-side, which no read exposes yet — Task 1 extends `GET /api/v1/studio-services` with `applicableAddonServiceIds` (active-only) exactly mirroring the ticket-04 `bookableBranchIds` stitch. The route composes the four reads via the established queries/loader pattern; success navigates to `/booking/:id` by `href` string (that route is #46 — typed navigation lands there).

**Tech Stack:** TanStack Start/Router 1.170.x (file routes via `tsr generate`, `validateSearch` + `Route.useSearch`, loaders + `useSuspenseQuery` SSR pattern), @tanstack/react-query 5.102.x, `@sevendays/api-client` (Hono RPC + `unwrap()` gate), Zod 4.5.1 shared schemas via `@sevendays/types`, Tailwind v4 (CSS-first, `packages/ui` tokens), Vitest 4 lib-seam suite (mocked clock), raw-CDP Node scenarios for page checks.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (§ Booking form variant C rulings, § API surface, § Testing Decisions) + ticket `.scratch/m2-booking-flow-tickets/07.md` (= GitHub issue #45, parent #37). The plan argues from the spec; executors read both. The prototype (`prototype/booking-form-33` branch — `apps/landing/src/lib/prototype-booking-data.ts` + `apps/landing/src/routes/prototype/booking.tsx`) is the owner-ratified behavioral contract its § was distilled from; its stubs (Studio Service entities, name-keyed applicability map, simulated `past_datetime` floor, in-prototype confirmation card, `packagePriceCents`) all die here — everything is re-derived against the real schema.

## Global Constraints

- **Feature branch only:** all work on `feat/m2-07-booking-wizard`, branched from up-to-date `main`. Never commit directly to `main`; the owner pushes/merges.
- **Scope fence (siblings share the roadmap):** ticket 07 delivers the `/book` route + wizard, the pure booking lib, the studio-services applicability embed, the typed-Link sweep of the six `/book` anchors, and the CDP harness extension. NOT here: the `/booking/:id` page (#46 — success navigates by `href` string; the URL 404s until #46, which is the expected state); the Resend email (#47); real slot logic/availability (M3 per ADR-0005 — the hour chips are the placeholder grid); any visual design pass (M2's bar is data-complete, visually-rough); admin/CMS/auth; any seed, migration, or `packages/db` change; any new env var.
- **`docs/plan.md`'s "Booking form (prototype variant C — …)" checkbox (in the red-penciled Milestone 2 booking-flow block) is THIS ticket alone** — Task 6 ticks it with the ✅ emoji only after Tasks 1–5 are committed. The neighboring checkboxes — schema (ticked), confirmation page, Resend integration, end-to-end email verify — are siblings': none may be touched. GitHub issue #45's acceptance boxes stay owner-ticked — note the criterion→task mapping in the PR description, don't edit the issue.
- **Spec amendment carried by this plan (veto-flag in the PR):** `GET /api/v1/studio-services` gains `applicableAddonServiceIds` (active-only, junction-read). The spec's § API surface pinned the read with `bookableBranchIds` only, but the variant-C ruling ("add-ons step shows only when the offering has applicable add-ons — services matrix-gated") requires the matrix client-side, and the intake's `addon_not_applicable` rejection alone cannot render that conditional step. This mirrors the ticket-04 embed pattern one junction over; if the owner vetoes, the add-ons step cannot matrix-gate and the step's visibility rule goes back to clarify.
- **Copy is pinned (prototype = owner-ratified artifact from the wayfinder #33 rounds), verbatim everywhere it appears:** the five step questions `Where would you like to book?` / `What are you booking?` / `Any add-ons? (optional)` / `When? (Philippine time)` / `Last — your details`; the PHT note `All times are Philippine time (PHT, UTC+8). Bookings in the past are rejected.`; the past-pick hint `That time has already passed — pick a later slot.`; the add-ons affordances `Continue · {peso(total)}` and `Skip — no add-ons` (Skip shows only when nothing is selected); the empty-add-ons line `No add-ons apply to this booking.`; the offering-step section labels `Service Packages` and `Studio Services at {branchName}` plus the no-branch prompt `Choose a branch first — services are bookable per branch.`; the rail title `Your booking`; the confirm button `Confirm booking · {peso(total)}` with submitting state `Booking…`; the rejection card title `We couldn't complete that booking` with the mono `API reason: {message}` line; contact placeholders `Full name` / `Email` / `Phone (+63…)` / `Notes (optional — tell the studio anything useful)`. The only invented line is the `service_inactive` rejection copy — derived from the ratified `package_inactive` pattern as `That service isn't available right now. Please pick another one.` (veto-flagged at PR review, same mechanism as ticket-06's blurb).
- **The rejection contract is the prototype's, promoted:** friendly copy keyed by `RejectionReason` (`REJECTION_COPY`), with the reason derived from the API's module-owned wire message (`{ error: <message> }` — the typed reason does NOT ride the wire; the route forwards the message verbatim). The message→reason map matches the intake module's `REJECTION_MESSAGES` wordings (verbatim, below); unmatched messages fall to `unknown`. The card renders the friendly copy and the raw API message as the mono line.
- **The API owns the past-datetime floor; the form owns the hint.** Submit performs NO client-side clock check (the prototype's simulated floor dies): the inline hint renders the moment the picked instant is at or before now, and the API's typed `past_datetime` card covers the race. PHT framing needs no tz arithmetic — PH is fixed UTC+8, so the instant comparison is plain `getTime() <= now`.
- **`peso` is the existing `src/lib/format.ts` helper — reused, not redefined.** Pinned outputs on this repo's Node 26 toolchain (ICU-complete, probed live 2026-09-08): `peso(150000)` = `₱1,500.00`, `peso(12000)` = `₱120.00`, `peso(6000)` = `₱60.00`, `peso(90000)` = `₱900.00`. If a pinned literal fails on an executor's machine, the fix is a full-ICU Node environment — never edit the expectation.
- **`phDateTime` joins `format.ts` this ticket** (the wizard's rail/contact summary need it; #46's read-back reuses it). Implementation verbatim from the prototype: `new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })`. Pinned outputs (probed live 2026-09-09, Node v26.7.0, full ICU): `phDateTime('2026-12-25T09:30:00+08:00')` = `Dec 25, 2026, 9:30 AM` and `phDateTime('2026-01-05T18:00:00.000Z')` = `Jan 6, 2026, 2:00 AM` (the UTC-midnight rollover case — it proves the timezone conversion, not just formatting). Same full-ICU fix path as `peso`.
- **The placeholder slot grid is pinned:** `TIME_SLOTS` = `['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']` (hourly 09:00–18:00, from the prototype; ADR-0005's M3 availability replaces it). The date input's `min` is today's PH wall-clock date via the prototype's expression — extracted as the pure `phDateInputMin(now)` for testability.
- **Deep-link grammar is spec-pinned and shape-only:** `/book?branch=&package=&service=` — ids, all optional. `validateSearch` parses with `z.string().min(1).optional()` per param (NEVER uuid-strict — a malformed param must not error the route). Prefill validates ids against the reads and silently drops unknown ones (stale deep links prefill nothing — they never show a rejection card). A deep-linked service filters the branch step to its `bookableBranchIds` before anything is chosen; the wizard always STARTS at step 1 (deep links seed answers, not the step).
- **Client-side catalog values are forbidden** — every rendered name/price/id derives from the live reads (the ticket-05 review Critical is the precedent). The only constants this plan pins are the spec/prototype-owned ones above (`TIME_SLOTS`, copy, pinned format outputs).
- **Landing unit tests exist ONLY at the lib seam** (spec § Testing Decisions 5: no permanent page/unit harness in M2). This plan adds exactly one new test file (`src/lib/booking.test.ts`, 30 tests) plus extends `src/lib/format.test.ts` (+2); the suite goes 15 → 47. Page behavior is verified by the Task 5 CDP scenarios plus the milestone's end-to-end verification. Do not add route-level vitest suites. Mocked-clock pattern is the api suites' (prior art `apps/api/test/appointments.test.ts:464`): `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)` — Date only, so driver timers stay real; every new test derives dates relative to `now`, never hard-coded future dates.
- **API integration tests for Task 1** run in the compose harness (ADR-0008): `TEST_DATABASE_URL`, `truncateAll` + `loadFixtures` in `beforeEach` (prior art `apps/api/test/studio-services.test.ts`). The fixtures already carry the applicability rows this test needs — MakeUp→portrait service, retired add-on→studio service (the inactive link proves the active-only filter). No fixture changes.
- **Versions pinned (resolved from the workspace lock 2026-09-09):** `@tanstack/react-router` 1.170.33 → `@tanstack/router-core` 1.171.28, `@tanstack/react-start` 1.168.50, `zod` 4.5.1. Spiked against the installed types: `validateSearch` option (`router-core/dist/esm/route.d.ts:251`) and `navigate({ href })` (`link.d.ts:94` — "used instead of `to` to navigate to a fully built href"). `createServerFn` handlers always receive the options object — `.validator((input) => input)` + `handler(async ({ data }) => ...)`, callers pass `{ data }` (ticket-05 ruling, start 1.170.x).
- **Untyped navigation to the confirmation page:** `/booking/:id` doesn't exist until #46 — submit success calls `navigate({ href: \`/booking/${record.id}\` })` carrying the convert-comment (`Typed navigate({ to: '/booking/$id' }) lands with ticket #46.`), mirroring the plain-anchor ruling. Do NOT register a stub route.
- **Typed-Link sweep fence:** exactly six `/book` plain anchors convert (mechanically enumerated 2026-09-09): `src/routes/index.tsx:35` (hero), `src/components/site-header.tsx:25` (Book now), and the four template-literal anchors in `package-card.tsx`, `branch-card.tsx`, `service-card.tsx`, `service-teaser-item.tsx`. The nav's other plain anchors (`/packages` `/services` `/branches` `/about`) and the not-found page's `/packages` anchor (its "dependency-free" comment is a standing ruling) are NOT in scope.
- **Sentry spans on the new server function** (`.cursorrules`): wrap the handler body in `startSpan({ name: 'POST /api/v1/appointments' }, ...)` (named import, per the repo Biome rule) exactly like the existing server fns; `getAddonServices` gets `GET /api/v1/addon-services`.
- **Biome-clean commits:** `pnpm exec biome check --write <files>` on every created/modified code file before committing (project `fix` scripts call the `biome` bin; `apps/landing/biome.json` covers `scripts/**` too).
- **`noUncheckedIndexedAccess` is on:** index access in new code is guarded (`if (!row) ...`), never `!`.
- **CDP harness requirements (verification-only):** Chrome/Chromium with `--remote-debugging-port=9222`, `pnpm --filter @sevendays/api dev` (port 8787, seeded compose db), and the landing dev server (port 3000, `API_URL` set in `apps/landing/.env.local`). Scenarios are committed (owner ruling 2026-09-08: tickets 06–10 extend the same harness) and take URLs from `LANDING_VERIFY_URL` / `API_VERIFY_URL` (defaults `http://localhost:3000` / `http://127.0.0.1:8787`). Failures name the failing check and exit 1. Expectations are re-derived from the live API — never hard-coded. `booking-wizard.mjs` is READ-ONLY over the data (its submit check drives a past-date booking the API rejects — no row is written); `booking-e2e.mjs` (Task 6) WRITES bookings by design and runs at verification time only.
- **Commit style:** scoped conventional subjects (`feat(api):`, `feat(types):`, `feat(landing):`, `test(landing):`, `docs:`), bullet bodies when wordy; one commit per task. (Ticket-06's plan said "unscoped" while its own commits were scoped — fixed at source here; scoped is the house truth.)

---

## File Structure

```
packages/types/src/studio-service.ts               (mod, Task 1) + applicableAddonServiceIds on the read shape
packages/types/src/studio-service.test.ts          (mod, Task 1) read-shape embed tests
apps/api/src/services/studio-services.ts           (mod, Task 1) active-only applicability stitch
apps/api/test/studio-services.test.ts              (mod, Task 1) embed assertions over the HTTP seam
apps/landing/src/lib/api.functions.ts              (mod, Task 2) + getAddonServices, createAppointment
apps/landing/src/lib/queries.ts                    (mod, Task 2) + addonServiceQueries
apps/landing/src/lib/format.ts                     (mod, Task 2) + phDateTime
apps/landing/src/lib/format.test.ts                (mod, Task 2) phDateTime pinned outputs (3 → 5 tests)
apps/landing/src/lib/booking.ts                    (new, Task 3) pure wizard logic + thin useBookingWizard hook
apps/landing/src/lib/booking.test.ts               (new, Task 3) 22 lib-seam tests (mocked clock)
apps/landing/src/routes/book.tsx                   (new, Task 4) /book — variant C one-question-per-screen
apps/landing/src/components/booking/rejection-card.tsx (new, Task 4) typed rejection card
apps/landing/src/components/booking/summary-rail.tsx   (new, Task 4) sticky "Your booking" rail
apps/landing/src/routeTree.gen.ts                  (regen, Task 4) via pnpm generate-routes — never hand-edited
apps/landing/src/components/package-card.tsx       (mod, Task 4) typed Link sweep
apps/landing/src/components/branch-card.tsx        (mod, Task 4) typed Link sweep
apps/landing/src/components/service-card.tsx       (mod, Task 4) typed Link sweep
apps/landing/src/components/service-teaser-item.tsx (mod, Task 4) typed Link sweep
apps/landing/src/components/site-header.tsx        (mod, Task 4) Book-now typed Link
apps/landing/src/routes/index.tsx                  (mod, Task 4) hero typed Link
apps/landing/scripts/verify/lib.mjs                (mod, Task 5) ws.onclose hardening (ticket-05 minor)
apps/landing/scripts/verify/booking-wizard.mjs     (new, Task 5) 14-check read-only scenario
apps/landing/scripts/verify/booking-e2e.mjs        (new, Task 6) MUTATING two-booking end-to-end (verify-time)
docs/plan.md                                       (mod, Task 6) booking-form checkbox → - [✅]
docs/progress.md                                   (mod, Task 6) ticket-07 landed bullet
```

Component rule (inherited from ticket 05): pages compose the shared components; only layout/heading/copy lives in routes; data only through `queries.ts` factories. The wizard's step panels stay in `book.tsx` (they are layout + pinned copy over the lib's pure state); `booking.ts` carries every behavior.

---

### Task 1: Applicability on the studio-services read (types + API, TDD)

**Files:**
- Modify: `packages/types/src/studio-service.ts`, `packages/types/src/studio-service.test.ts`, `apps/api/src/services/studio-services.ts`, `apps/api/test/studio-services.test.ts`

**Interfaces:**
- Consumes: `studioServiceAddonServices` junction + `addonServices` table (`@sevendays/db`), `groupChildren(rows, keyFn)` (`apps/api/src/services/group-children.ts`), the fixture ids `servicePortrait` / `serviceStudio` / `addonMakeup` / `addonRetired` (`apps/api/test/helpers/fixtures.ts` — the applicability rows already exist there).
- Produces (Tasks 2–4 consume these exact names):
  - `@sevendays/types`: `StudioServiceWithBranches` gains `applicableAddonServiceIds: string[]` (active-only, ordered like the branch ids — junction createdAt proxy, id tiebreak).
  - API response `GET /api/v1/studio-services` carries the field; `packages/api-client` needs NO change (it parses through `studioServiceWithBranchesSchema`).

**Not here:** no route change (the handler forwards the service result verbatim), no api-client change, no landing change (Task 2), no seed/fixture change.

- [ ] **Step 1: Write the failing types test** — in `packages/types/src/studio-service.test.ts`, append inside the existing `describe('studioServiceWithBranchesSchema')` block:

```ts
  it('parses a read row with embedded applicable add-on ids', () => {
    const parsed = studioServiceWithBranchesSchema.parse({
      ...fullRow,
      bookableBranchIds: [UUID],
      applicableAddonServiceIds: [UUID, '00000000-0000-4000-8000-000000000001'],
    });
    expect(parsed.applicableAddonServiceIds).toEqual([
      UUID,
      '00000000-0000-4000-8000-000000000001',
    ]);
  });

  it('rejects a non-uuid applicable add-on id', () => {
    const result = studioServiceWithBranchesSchema.safeParse({
      ...fullRow,
      bookableBranchIds: [],
      applicableAddonServiceIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('requires the applicability field (the API always embeds it, possibly empty)', () => {
    const result = studioServiceWithBranchesSchema.safeParse({
      ...fullRow,
      bookableBranchIds: [],
    });
    expect(result.success).toBe(false);
  });
```

- [ ] **Step 2: Run to verify the types tests fail**

Run: `pnpm --filter @sevendays/types test`
Expected: FAIL — exactly which failing looks different per test, and that is the point: the parse-output test fails because `parsed.applicableAddonServiceIds` is `undefined` (the key exists but the schema strips it — a plain `safeParse(...).success` assertion here would pass in RED, so the test asserts OUTPUT); the non-uuid test fails the same way (stripped key → parse wrongly succeeds); the required-field test fails because a parse without the field currently succeeds.

- [ ] **Step 3: Extend the read schema** — in `packages/types/src/studio-service.ts`, replace:

```ts
export const studioServiceWithBranchesSchema = studioServiceSchema.extend({
  bookableBranchIds: z.array(z.uuid()),
});
```

with:

```ts
// Read shape for GET /api/v1/studio-services (M2 ticket 04; ticket 07 adds
// the applicability embed): active Studio Services with the branches they
// are bookable at and the ACTIVE add-ons that apply to them, embedded as
// bare ids — the booking form's branch step filters by membership, its
// add-ons step matrix-gates by the applicability ids, and the pages join
// names from the sibling reads. Extends the row mirror (a plain object
// schema, no refine — the zod v4 chain rule is not at play).
export const studioServiceWithBranchesSchema = studioServiceSchema.extend({
  bookableBranchIds: z.array(z.uuid()),
  applicableAddonServiceIds: z.array(z.uuid()),
});
```

(Also replace the comment above `studioServiceSchema` — it currently names only one embed — with:

```ts
// Mirror of the studio_services row (M2 ticket 01). The M2 API read shape —
// StudioService plus embedded bookableBranchIds and
// applicableAddonServiceIds (ticket 07) — extends THIS schema in tickets
// 04/07; define nothing per-route elsewhere.
```

The row mirror itself stays untouched.)

- [ ] **Step 4: Run the types tests again**

Run: `pnpm --filter @sevendays/types test`
Expected: PASS — the two safeParse tests now pass; the required-field test passes because the new key is mandatory. All pre-existing tests stay green.

- [ ] **Step 5: Write the failing API integration test** — in `apps/api/test/studio-services.test.ts`, append a second `it` inside the existing `describe`:

```ts
  it('embeds only ACTIVE applicable add-on ids per service', async () => {
    const res = await app.request('/api/v1/studio-services', undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as StudioServiceWithBranches[];

    const portrait = body.find((s) => s.id === ids.servicePortrait);
    const studio = body.find((s) => s.id === ids.serviceStudio);
    expect(portrait).toBeDefined();
    expect(studio).toBeDefined();

    // Fixtures link Makeup → portrait (active link, active add-on) and the
    // RETIRED add-on → studio (live link on an inactive add-on — the
    // activity filter's whole point, mirroring ticket-03's ruling).
    expect(portrait?.applicableAddonServiceIds).toEqual([ids.addonMakeup]);
    expect(studio?.applicableAddonServiceIds).toEqual([]);
  });
```

- [ ] **Step 6: Run to verify the API test fails**

Run: `pnpm --filter @sevendays/api exec vitest run test/studio-services.test.ts`
Expected: FAIL — `applicableAddonServiceIds` is `undefined` in the response (the stitch doesn't exist yet).

- [ ] **Step 7: Extend the service stitch** — in `apps/api/src/services/studio-services.ts`, replace the import block so it reads:

```ts
import type { Database } from '@sevendays/db';
import {
  addonServices,
  branchStudioServices,
  studioServiceAddonServices,
  studioServices,
} from '@sevendays/db';
import type { StudioServiceWithBranches } from '@sevendays/types';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { groupChildren } from './group-children.js';
```

then, after the existing `branchesByService` stitch, add the applicability stitch and extend the returned projection (the whole `return` becomes):

```ts
  // Applicability matrix (ticket 07): the ACTIVE add-ons that apply to each
  // service, same embed pattern as the branch links one junction over. The
  // innerJoin + isActive filter drops links to inactive add-ons — a live
  // link on a dead add-on must not surface in the booking form's matrix
  // (mirrors the intake's activity-before-matrix ruling, ticket 03). Order
  // follows the junction's createdAt proxy, id tiebreak, like the branch
  // ids — membership is the only consumer-facing fact.
  const applicabilityRows = await db
    .select({
      studioServiceId: studioServiceAddonServices.studioServiceId,
      addonServiceId: studioServiceAddonServices.addonServiceId,
    })
    .from(studioServiceAddonServices)
    .innerJoin(addonServices, eq(studioServiceAddonServices.addonServiceId, addonServices.id))
    .where(
      and(
        inArray(studioServiceAddonServices.studioServiceId, serviceIds),
        eq(addonServices.isActive, true)
      )
    );

  const addonsByService = groupChildren(applicabilityRows, (row) => row.studioServiceId);

  return serviceRows.map((s) => ({
    ...s,
    bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
    applicableAddonServiceIds: addonsByService(s.id).map((l) => l.addonServiceId),
  }));
```

Also extend the function's doc-comment first paragraph to name both embeds: `…with the branches each is bookable at and the active add-ons that apply to it (M2 ticket 04 / ticket 07)…`, keeping the existing ordering rationale intact.

- [ ] **Step 8: Run the API suite**

Run: `pnpm --filter @sevendays/api exec vitest run test/studio-services.test.ts`
Expected: PASS — both `it`s green. Then the whole api suite (the read shape changed; suites that POST appointments don't touch this read, but the gate proves it):

Run: `pnpm --filter @sevendays/api test`
Expected: PASS.

- [ ] **Step 9: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/types typecheck && pnpm --filter @sevendays/api typecheck
pnpm exec biome check --write packages/types/src/studio-service.ts packages/types/src/studio-service.test.ts apps/api/src/services/studio-services.ts apps/api/test/studio-services.test.ts
git add packages/types/src/studio-service.ts packages/types/src/studio-service.test.ts apps/api/src/services/studio-services.ts apps/api/test/studio-services.test.ts
git commit -m "feat(api): studio-services read embeds active applicable add-on ids"
```

(Body bullets: `types: StudioServiceWithBranches.applicableAddonServiceIds (active-only junction embed, ticket-04 bookableBranchIds pattern one junction over); service: innerJoin active add-ons, groupChildren stitch. Feeds the /book add-ons step's matrix gating (#45) — spec-amendment note rides the PR.`)

---

### Task 2: Landing data layer — addon-services + appointment server fns, `phDateTime`

**Files:**
- Modify: `apps/landing/src/lib/api.functions.ts`, `apps/landing/src/lib/queries.ts`, `apps/landing/src/lib/format.ts`, `apps/landing/src/lib/format.test.ts`, `packages/api-client/src/index.ts` (pre-flight correction, see below)

**Interfaces:**
- Consumes: `getApiClient().addonServices.list()` (M1.4 wrapper) and `getApiClient().appointments.create(json)` (ticket-04 wrapper, `unwrap()`-gated, throws `ApiClientError` on the 400 rejection envelope); `CreateAppointmentArgs` from `@sevendays/api-client`.
- Produces (Tasks 3–4 consume these exact names):
  - `api.functions.ts`: `getAddonServices(): Promise<AddonService[]>` (no-arg server fn, Sentry span `GET /api/v1/addon-services`).
  - `api.functions.ts`: `createAppointment(input: CreateAppointmentArgs): Promise<AppointmentWithAddons>` (server fn, Sentry span `POST /api/v1/appointments`; callers pass `{ data: input }` per the 1.170.x options-object contract).
  - `queries.ts`: `addonServiceQueries.all()` → `queryOptions({ queryKey: ['addon-services'], queryFn })`.
  - `format.ts`: `phDateTime(iso: string): string` (en-PH / Asia/Manila, medium date + short time — prototype verbatim).

**Not here:** no booking logic (Task 3), no route/component work (Task 4), no runtime client-package change — the wrappers exist. (Pre-flight correction 2026-09-09: `CreateAppointmentArgs` is defined in `packages/api-client/src/routes/appointments.ts` but was never re-exported from the package index, so the import below would fail typecheck — Step 5 adds that one-line type re-export.)

- [ ] **Step 1: Write the failing `phDateTime` tests** — in `apps/landing/src/lib/format.test.ts`, extend the import from `./format` to include `phDateTime` and append:

```ts
describe('phDateTime', () => {
  it('formats a PH wall-clock instant (pinned output, full-ICU Node)', () => {
    expect(phDateTime('2026-12-25T09:30:00+08:00')).toBe('Dec 25, 2026, 9:30 AM');
  });

  it('converts a UTC midnight instant into the PHT day (rollover pin)', () => {
    expect(phDateTime('2026-01-05T18:00:00.000Z')).toBe('Jan 6, 2026, 2:00 AM');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sevendays/landing test`
Expected: FAIL — `phDateTime` is not exported by `./format` (import error; the 15 existing tests still pass).

- [ ] **Step 3: Implement `phDateTime`** — `apps/landing/src/lib/format.ts` becomes:

```ts
// Money + schedule display for the landing site — promoted verbatim from the
// prototype (wayfinder #33, spec residual). Cent-denominated ints in, peso
// string out; ISO instants in, Philippine-wall-clock strings out.

export function peso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}

export function phDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sevendays/landing test`
Expected: PASS (17 tests — 15 existing + 2 new).

- [ ] **Step 5: Add the server functions and query factory** — extend `apps/landing/src/lib/api.functions.ts` (keep everything already there untouched; extend the type imports):

```ts
import { startSpan } from '@sentry/tanstackstart-react';
import { createServerFn } from '@tanstack/react-start';
import type { AppointmentWithAddons } from '@sevendays/types';
import type { CreateAppointmentArgs } from '@sevendays/api-client';
import { getApiClient } from './api.server';
```

and append:

```ts
export const getAddonServices = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/addon-services' }, async () => {
    return getApiClient().addonServices.list();
  });
});

/**
 * Guest booking POST. Callers pass the start-fn payload ({ data: input });
 * the api-client RPC shape ({ json }) is wrapped here. Rejections reject
 * with ApiClientError(400) whose details carry the API's module-owned
 * message — src/lib/booking.ts maps it to the typed rejection card.
 */
export const createAppointment = createServerFn()
  .validator((input: CreateAppointmentArgs) => input)
  .handler(async ({ data }): Promise<AppointmentWithAddons> => {
    return startSpan({ name: 'POST /api/v1/appointments' }, async () => {
      return getApiClient().appointments.create(data);
    });
  });
```

Then extend `apps/landing/src/lib/queries.ts` — add `getAddonServices` to the existing import from `./api.functions` and append:

```ts
export const addonServiceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['addon-services'],
      queryFn: () => getAddonServices(),
    }),
};
```

Also add the missing type re-export to `packages/api-client/src/index.ts` (pre-flight correction: `CreateAppointmentArgs` lives in `./routes/appointments.js` and was never re-exported from the package index). Alongside the existing `ApiClientError` / `toLoopbackFetch` re-exports, add:

```ts
export type { CreateAppointmentArgs } from './routes/appointments.js';
```

- [ ] **Step 6: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/api-client typecheck && pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/lib/api.functions.ts src/lib/queries.ts src/lib/format.ts src/lib/format.test.ts && pnpm --filter @sevendays/api-client exec biome check --write src/index.ts
git add packages/api-client/src/index.ts apps/landing/src/lib/api.functions.ts apps/landing/src/lib/queries.ts apps/landing/src/lib/format.ts apps/landing/src/lib/format.test.ts
git commit -m "feat(landing): addon-services + appointment server fns, phDateTime helper"
```

(Body bullets: `api-client: re-export the CreateAppointmentArgs type (pre-flight correction — never exported from the index). createAppointment wraps the ticket-04 RPC wrapper with a Sentry span; rejections surface as ApiClientError(400) for the booking lib to map (#45). phDateTime promoted verbatim from the prototype with pinned full-ICU outputs; lib-seam tests 15 → 17.`)

---

### Task 3: The pure booking lib (state machine, rejections, PHT math — TDD)

**Files:**
- Create: `apps/landing/src/lib/booking.ts`, `apps/landing/src/lib/booking.test.ts`

**Interfaces:**
- Consumes: `AddonService`, `Branch`, `ServicePackageWithInclusions`, `StudioServiceWithBranches` from `@sevendays/types`; `CreateAppointmentArgs` from `@sevendays/api-client`.
- Produces (Task 4 consumes these exact names) — every behavior of the wizard is one of these exports:
  - `TIME_SLOTS: string[]`, `phDateInputMin(now: Date): string`
  - `type Offering`, `type BookingSearchInit`, `type BookingCatalog`, `type BookingDetails`
  - `scheduledAtInstant(date: string, time: string): Date | null`, `isPastPick(scheduledAt: Date | null, now: Date): boolean`
  - `prefillFromSearch(init: BookingSearchInit, catalog: BookingCatalog): { branchId: string | null; offering: Offering }`
  - `branchFilterServiceId(offering: Offering, initService: string | undefined, catalog: BookingCatalog): string | null`
  - `branchChoicesFor(catalog: BookingCatalog, serviceId: string | null): Branch[]`
  - `applicableAddonsFor(offering: Offering, catalog: BookingCatalog): AddonService[]`
  - `offeringPriceCents(offering: Offering, catalog: BookingCatalog): number`, `addonTotalCents(addonIds: string[], catalog: BookingCatalog): number`, `totalCents(offering: Offering, addonIds: string[], catalog: BookingCatalog): number`
  - `stepAfterOfferingChosen(applicableCount: number): 3 | 4`, `stepBackFromDateTime(hasApplicableAddons: boolean): 2 | 3`
  - `type RejectionReason`, `REJECTION_COPY: Record<RejectionReason, string>`, `reasonForApiMessage(message: string): RejectionReason`, `rejectionFromApiClientError(err: unknown): { reason: RejectionReason; apiMessage: string }`
  - `buildCreatePayload(details: BookingDetails): CreateAppointmentArgs`
  - `useBookingWizard(init: BookingSearchInit, deps: { catalog: BookingCatalog; createAppointment: (args: CreateAppointmentArgs) => Promise<{ id: string }> })` — thin stateful shell, untested (CDP owns behavior); returns `{ step, branchId, branchChoices, setBranch, offering, chooseOffering, goNext, goBack, applicableAddons, addonIds, toggleAddon, selectedAddons, date, setDate, time, setTime, scheduledAt, isPast, offeringName, branchName, offeringPriceCents, totalCents, name, setName, email, setEmail, phone, setPhone, notes, setNotes, submitting, submit }` where `submit(): Promise<{ ok: true; appointmentId: string } | { ok: false; rejection: { reason: RejectionReason; apiMessage: string } }>`, `goNext()` advances linearly (guarding the empty-add-ons step for prefill flows) and `goBack()` returns from date/time via `stepBackFromDateTime`.

**Not here:** no React components (Task 4), no server-fn imports (the hook receives `createAppointment` as a dependency — the lib stays decoupled from the network), no client-side past-floor at submit (the API owns it; the hook exposes `isPast` for the hint only).

- [ ] **Step 1: Write the failing test file** — create `apps/landing/src/lib/booking.test.ts`:

```ts
import type {
  AddonService,
  Branch,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addonTotalCents,
  applicableAddonsFor,
  branchChoicesFor,
  branchFilterServiceId,
  buildCreatePayload,
  isPastPick,
  offeringPriceCents,
  phDateInputMin,
  prefillFromSearch,
  reasonForApiMessage,
  rejectionFromApiClientError,
  scheduledAtInstant,
  stepAfterOfferingChosen,
  stepBackFromDateTime,
  TIME_SLOTS,
  totalCents,
} from './booking';

// Deterministic clock for the time-coupled tests (api-suite pattern:
// toFake ['Date'] only, so driver timers stay real).
function useClock(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}
afterEach(() => {
  vi.useRealTimers();
});

function branch(id: string): Branch {
  return {
    id,
    name: `Branch ${id.slice(-4)}`,
    address: 'test address',
    phone: '+63 900 000 000',
    acceptsWalkIns: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function service(
  id: string,
  overrides: Partial<StudioServiceWithBranches> = {}
): StudioServiceWithBranches {
  return {
    id,
    name: `Service ${id.slice(-4)}`,
    description: 'test service',
    priceCents: 150000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    bookableBranchIds: [],
    applicableAddonServiceIds: [],
    ...overrides,
  };
}

function addon(id: string, priceCents: number): AddonService {
  return {
    id,
    name: `Addon ${id.slice(-4)}`,
    description: 'test add-on',
    priceCents,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function pkg(id: string, priceCents: number): ServicePackageWithInclusions {
  return {
    id,
    name: `Package ${id.slice(-4)}`,
    description: 'test package',
    priceCents,
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

const B1 = branch('11111111-1111-4111-8111-111111111111');
const B2 = branch('22222222-2222-4222-8222-222222222222');
const SVC = service('33333333-3333-4333-8333-333333333333', {
  bookableBranchIds: [B2.id],
  applicableAddonServiceIds: ['55555555-5555-4555-8555-555555555555'],
});
const ADDON_A = addon('55555555-5555-4555-8555-555555555555', 12000);
const ADDON_B = addon('66666666-6666-4666-8666-666666666666', 6000);
const PKG = pkg('44444444-4444-4444-8444-444444444444', 90000);

const CATALOG = {
  branches: [B1, B2],
  packages: [PKG],
  services: [SVC],
  addons: [ADDON_A, ADDON_B],
};

describe('TIME_SLOTS', () => {
  it('pins the placeholder hourly grid (ADR-0005; M3 replaces it)', () => {
    expect(TIME_SLOTS).toEqual([
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
    ]);
  });
});

describe('phDateInputMin', () => {
  it('returns today’s PH wall-clock date for a PH-morning now', () => {
    expect(phDateInputMin(new Date('2026-12-25T02:00:00.000Z'))).toBe('2026-12-25');
  });

  it('rolls a UTC-late now into the next PH day (rollover pin)', () => {
    expect(phDateInputMin(new Date('2026-12-31T16:30:00.000Z'))).toBe('2027-01-01');
  });
});

describe('scheduledAtInstant', () => {
  it('treats the PH wall-clock pick as a UTC+8 instant', () => {
    expect(scheduledAtInstant('2026-12-25', '09:30')?.toISOString()).toBe(
      '2026-12-25T01:30:00.000Z'
    );
  });

  it('returns null while date or time are unpicked', () => {
    expect(scheduledAtInstant('', '09:30')).toBeNull();
    expect(scheduledAtInstant('2026-12-25', '')).toBeNull();
  });
});

describe('isPastPick', () => {
  it('flags at-or-before now as past (the API floor is at-or-before too)', () => {
    useClock('2026-09-10T00:00:00.000Z');
    expect(isPastPick(new Date('2026-09-10T00:00:00.000Z'), new Date())).toBe(true);
    expect(isPastPick(new Date('2026-09-09T23:59:59.999Z'), new Date())).toBe(true);
  });

  it('does not flag a future pick', () => {
    useClock('2026-09-10T00:00:00.000Z');
    expect(isPastPick(new Date('2026-09-10T00:00:00.001Z'), new Date())).toBe(false);
    expect(isPastPick(null, new Date())).toBe(false);
  });
});

describe('prefillFromSearch', () => {
  it('keeps deep-linked branch and package ids that exist', () => {
    expect(prefillFromSearch({ branch: B1.id, package: PKG.id }, CATALOG)).toEqual({
      branchId: B1.id,
      offering: { kind: 'package', id: PKG.id },
    });
  });

  it('sets a service offering for a known deep-linked service', () => {
    expect(prefillFromSearch({ service: SVC.id }, CATALOG)).toEqual({
      branchId: null,
      offering: { kind: 'service', id: SVC.id },
    });
  });

  it('silently drops unknown ids (stale deep links prefill nothing)', () => {
    expect(
      prefillFromSearch(
        {
          branch: '99999999-9999-4999-8999-999999999999',
          package: '99999999-9999-4999-8999-999999999999',
          service: '99999999-9999-4999-8999-999999999999',
        },
        CATALOG
      )
    ).toEqual({ branchId: null, offering: null });
  });
});

describe('branchFilterServiceId', () => {
  it('prefers the chosen service offering', () => {
    const offering = { kind: 'service' as const, id: SVC.id };
    expect(branchFilterServiceId(offering, PKG.id, CATALOG)).toBe(SVC.id);
  });

  it('falls to a known deep-linked service before anything is chosen', () => {
    expect(branchFilterServiceId(null, SVC.id, CATALOG)).toBe(SVC.id);
  });

  it('is null with no offering and no (or an unknown) deep-linked service', () => {
    expect(branchFilterServiceId(null, undefined, CATALOG)).toBeNull();
    expect(branchFilterServiceId(null, '99999999-9999-4999-8999-999999999999', CATALOG)).toBeNull();
  });
});

describe('branchChoicesFor', () => {
  it('offers all branches with no service filter', () => {
    expect(branchChoicesFor(CATALOG, null)).toEqual([B1, B2]);
  });

  it('filters to the service’s bookable branches in branches-read order', () => {
    expect(branchChoicesFor(CATALOG, SVC.id)).toEqual([B2]);
  });

  it('falls back to all branches for an unknown service id', () => {
    expect(branchChoicesFor(CATALOG, '99999999-9999-4999-8999-999999999999')).toEqual([B1, B2]);
  });
});

describe('applicableAddonsFor', () => {
  it('offers the full active add-on list for a package (uniform rule)', () => {
    const offering = { kind: 'package' as const, id: PKG.id };
    expect(applicableAddonsFor(offering, CATALOG)).toEqual([ADDON_A, ADDON_B]);
  });

  it('matrix-gates a service booking to the embedded applicable ids', () => {
    const offering = { kind: 'service' as const, id: SVC.id };
    expect(applicableAddonsFor(offering, CATALOG)).toEqual([ADDON_A]);
  });

  it('offers nothing for a service with no applicable add-ons and for no offering', () => {
    const bare = service('77777777-7777-4777-8777-777777777777');
    const offering = { kind: 'service' as const, id: bare.id };
    expect(applicableAddonsFor(offering, CATALOG)).toEqual([]);
    expect(applicableAddonsFor(null, CATALOG)).toEqual([]);
  });
});

describe('totals', () => {
  it('sums the offering price and selected add-on prices (seed-scale check: ₱900 + ₱120 + ₱60 = ₱1,080)', () => {
    const offering = { kind: 'package' as const, id: PKG.id };
    expect(offeringPriceCents(offering, CATALOG)).toBe(90000);
    expect(addonTotalCents([ADDON_A.id, ADDON_B.id], CATALOG)).toBe(18000);
    expect(totalCents(offering, [ADDON_A.id, ADDON_B.id], CATALOG)).toBe(108000);
  });

  it('totals zero before an offering exists', () => {
    expect(totalCents(null, [], CATALOG)).toBe(0);
  });
});

describe('step transitions', () => {
  it('an offering WITH applicable add-ons advances to the add-ons step; without, straight to date/time', () => {
    expect(stepAfterOfferingChosen(2)).toBe(3);
    expect(stepAfterOfferingChosen(0)).toBe(4);
  });

  it('Back from date/time returns to add-ons only when they applied; otherwise to the offering step', () => {
    expect(stepBackFromDateTime(true)).toBe(3);
    expect(stepBackFromDateTime(false)).toBe(2);
  });
});

describe('reasonForApiMessage', () => {
  it('maps the intake module’s owned wordings to their reasons', () => {
    expect(reasonForApiMessage('Service Package is inactive.')).toBe('package_inactive');
    expect(reasonForApiMessage('Studio Service is inactive.')).toBe('service_inactive');
    expect(reasonForApiMessage("That service isn't offered at the branch you picked.")).toBe(
      'service_not_bookable_at_branch'
    );
    expect(reasonForApiMessage('Add-on Service is inactive.')).toBe('addon_inactive');
    expect(reasonForApiMessage("That add-on doesn't apply to the service you picked.")).toBe(
      'addon_not_applicable'
    );
    expect(
      reasonForApiMessage(
        'Your chosen schedule is already in the past. Please pick a future date and time.'
      )
    ).toBe('past_datetime');
  });

  it('falls through to unknown for unmatched messages (schema 400s, unknown ids)', () => {
    expect(reasonForApiMessage('Unknown branchId.')).toBe('unknown');
    expect(reasonForApiMessage('')).toBe('unknown');
  });
});

describe('rejectionFromApiClientError', () => {
  it('reads the envelope message off ApiClientError.details', () => {
    const err = Object.assign(new Error('API 400: Service Package is inactive.'), {
      name: 'ApiClientError',
      status: 400,
      details: { error: 'Service Package is inactive.' },
    });
    expect(rejectionFromApiClientError(err)).toEqual({
      reason: 'package_inactive',
      apiMessage: 'Service Package is inactive.',
    });
  });

  it('strips the "API <status>: " prefix when details are absent', () => {
    const err = new Error(
      'API 400: Your chosen schedule is already in the past. Please pick a future date and time.'
    );
    expect(rejectionFromApiClientError(err)).toEqual({
      reason: 'past_datetime',
      apiMessage: 'Your chosen schedule is already in the past. Please pick a future date and time.',
    });
  });

  it('degrades to the unknown card for foreign throwables', () => {
    expect(rejectionFromApiClientError(new TypeError('fetch failed'))).toEqual({
      reason: 'unknown',
      apiMessage: 'fetch failed',
    });
    expect(rejectionFromApiClientError('boom')).toEqual({ reason: 'unknown', apiMessage: '' });
  });
});

describe('buildCreatePayload', () => {
  it('maps a package booking to the create wire shape (no price ever)', () => {
    const payload = buildCreatePayload({
      branchId: B1.id,
      offering: { kind: 'package', id: PKG.id },
      addonIds: [ADDON_A.id],
      scheduledAt: new Date('2026-12-25T01:30:00.000Z'),
      name: 'Juana Dela Cruz',
      email: 'juana@example.com',
      phone: '+63 917 000 0000',
      notes: ' graduations ',
    });
    expect(payload).toEqual({
      branchId: B1.id,
      servicePackageId: PKG.id,
      studioServiceId: null,
      customerName: 'Juana Dela Cruz',
      customerEmail: 'juana@example.com',
      customerPhone: '+63 917 000 0000',
      scheduledAt: '2026-12-25T01:30:00.000Z',
      addonServiceIds: [ADDON_A.id],
      notes: ' graduations ',
    });
  });

  it('maps a service booking (exactly-one: the other ref null) and omits empty notes', () => {
    const payload = buildCreatePayload({
      branchId: B2.id,
      offering: { kind: 'service', id: SVC.id },
      addonIds: [],
      scheduledAt: new Date('2026-12-25T01:30:00.000Z'),
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      phone: '+63 917 000 0001',
      notes: '',
    });
    expect(payload.studioServiceId).toBe(SVC.id);
    expect(payload.servicePackageId).toBeNull();
    expect(payload.addonServiceIds).toEqual([]);
    expect(payload.notes).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sevendays/landing test`
Expected: FAIL — `./booking` cannot be resolved (import error; the 17 existing tests still pass).

- [ ] **Step 3: Implement `booking.ts`** — create `apps/landing/src/lib/booking.ts`:

```ts
// The booking wizard's brain (issue #45, prototype variant C re-derived
// against the real schema). Every behavior is a pure function so the lib
// seam can test it; useBookingWizard only wires React state to these.
// Prototype artifacts that die here: Studio Service stubs, the name-keyed
// applicability map (the API now embeds applicableAddonServiceIds), the
// simulated past-datetime floor (the API owns it — the form renders the
// hint and the typed rejection card), and packagePriceCents (renamed
// bookedPriceCents in ticket 02; nothing here reads a snapshot — the
// pre-submit rail keeps LIVE prices, spec ruling).

import type { CreateAppointmentArgs } from '@sevendays/api-client';
import type {
  AddonService,
  Branch,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { useMemo, useState } from 'react';

/** One wizard read snapshot — the four reads the route loader prefetches. */
export interface BookingCatalog {
  branches: Branch[];
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
  addons: AddonService[];
}

export type Offering = { kind: 'package'; id: string } | { kind: 'service'; id: string } | null;

/** Deep-link contract (IA #32): ids, all optional. */
export interface BookingSearchInit {
  branch?: string;
  package?: string;
  service?: string;
}

export interface BookingDetails {
  branchId: string;
  offering: NonNullable<Offering>;
  addonIds: string[];
  scheduledAt: Date;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

/** Placeholder hourly grid (prototype-verbatim; ADR-0005's M3 replaces it). */
export const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
] as const;

/** Today's PH wall-clock date for the date input's min (PH is UTC+8, no DST). */
export function phDateInputMin(now: Date): string {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

/** PH wall-clock pick → instant (prototype verbatim). */
export function scheduledAtInstant(date: string, time: string): Date | null {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00+08:00`);
}

/** At-or-before now is past — the same boundary the API's floor enforces. */
export function isPastPick(scheduledAt: Date | null, now: Date): boolean {
  return scheduledAt !== null && scheduledAt.getTime() <= now.getTime();
}

/** Deep-link prefill: ids validate against the reads; unknown drops silently. */
export function prefillFromSearch(
  init: BookingSearchInit,
  catalog: BookingCatalog
): { branchId: string | null; offering: Offering } {
  const branchId =
    init.branch && catalog.branches.some((b) => b.id === init.branch) ? init.branch : null;
  let offering: Offering = null;
  if (init.service && catalog.services.some((s) => s.id === init.service)) {
    offering = { kind: 'service', id: init.service };
  } else if (init.package && catalog.packages.some((p) => p.id === init.package)) {
    offering = { kind: 'package', id: init.package };
  }
  return { branchId, offering };
}

/**
 * The service whose bookability filters the branch step: the chosen service
 * offering wins; otherwise a known deep-linked service filters BEFORE
 * anything is chosen (spec ruling). Unknown ids filter nothing.
 */
export function branchFilterServiceId(
  offering: Offering,
  initService: string | undefined,
  catalog: BookingCatalog
): string | null {
  if (offering?.kind === 'service') return offering.id;
  if (initService && catalog.services.some((s) => s.id === initService)) return initService;
  return null;
}

export function branchChoicesFor(catalog: BookingCatalog, serviceId: string | null): Branch[] {
  if (!serviceId) return catalog.branches;
  const svc = catalog.services.find((s) => s.id === serviceId);
  if (!svc) return catalog.branches;
  return catalog.branches.filter((b) => svc.bookableBranchIds.includes(b.id));
}

/** Packages: uniform (all active add-ons). Services: the junction matrix. */
export function applicableAddonsFor(offering: Offering, catalog: BookingCatalog): AddonService[] {
  if (!offering) return [];
  if (offering.kind === 'package') return catalog.addons;
  const svc = catalog.services.find((s) => s.id === offering.id);
  if (!svc) return [];
  const applicable = new Set(svc.applicableAddonServiceIds);
  return catalog.addons.filter((a) => applicable.has(a.id));
}

export function offeringPriceCents(offering: Offering, catalog: BookingCatalog): number {
  if (!offering) return 0;
  if (offering.kind === 'package') {
    return catalog.packages.find((p) => p.id === offering.id)?.priceCents ?? 0;
  }
  return catalog.services.find((s) => s.id === offering.id)?.priceCents ?? 0;
}

export function addonTotalCents(addonIds: string[], catalog: BookingCatalog): number {
  return addonIds.reduce(
    (sum, id) => sum + (catalog.addons.find((a) => a.id === id)?.priceCents ?? 0),
    0
  );
}

export function totalCents(offering: Offering, addonIds: string[], catalog: BookingCatalog): number {
  return offeringPriceCents(offering, catalog) + addonTotalCents(addonIds, catalog);
}

/** Steps: 1 branch · 2 offering · 3 add-ons · 4 date/time · 5 contact. */
export function stepAfterOfferingChosen(applicableCount: number): 3 | 4 {
  return applicableCount > 0 ? 3 : 4;
}

export function stepBackFromDateTime(hasApplicableAddons: boolean): 2 | 3 {
  return hasApplicableAddons ? 3 : 2;
}

// ---------------------------------------------------------------------------
// Typed rejections (prototype contract): the wire carries only the API's
// module-owned message ({ error }); the reason is derived by matching that
// message. Wordings pinned from apps/api REJECTION_MESSAGES — suites assert
// them verbatim, so the match is stable.
// ---------------------------------------------------------------------------
export type RejectionReason =
  | 'past_datetime'
  | 'package_inactive'
  | 'service_inactive'
  | 'service_not_bookable_at_branch'
  | 'addon_inactive'
  | 'addon_not_applicable'
  | 'unknown';

export const REJECTION_COPY: Record<RejectionReason, string> = {
  past_datetime:
    'That date and time has already passed in the Philippines (PHT). Please pick a later slot — all times shown are Philippine time.',
  package_inactive: "That package isn't available right now. Please pick another one.",
  // Derived from the ratified package_inactive pattern (veto-flagged).
  service_inactive: "That service isn't available right now. Please pick another one.",
  service_not_bookable_at_branch:
    "That service isn't offered at the branch you picked. Please choose a different branch or service.",
  addon_inactive: "One of the add-ons isn't available right now. Please review your add-ons.",
  addon_not_applicable:
    "One of the add-ons doesn't apply to this booking. Please review your add-ons.",
  unknown: "We couldn't complete your booking. Please review your details or call the branch.",
};

const API_REASON_MAP: Array<[RegExp, RejectionReason]> = [
  [/Service Package is inactive/i, 'package_inactive'],
  [/Studio Service is inactive/i, 'service_inactive'],
  [/isn't offered at the branch/i, 'service_not_bookable_at_branch'],
  [/Add-on Service is inactive/i, 'addon_inactive'],
  [/doesn't apply to the service/i, 'addon_not_applicable'],
  [/already in the past/i, 'past_datetime'],
];

export function reasonForApiMessage(message: string): RejectionReason {
  for (const [re, reason] of API_REASON_MAP) {
    if (re.test(message)) return reason;
  }
  return 'unknown';
}

/** ApiClientError carries { error: message } in details and `API <status>: <error>` as .message. */
export function rejectionFromApiClientError(err: unknown): {
  reason: RejectionReason;
  apiMessage: string;
} {
  const details = (err as { details?: { error?: unknown } } | undefined)?.details;
  const fromDetails = typeof details?.error === 'string' ? details.error : undefined;
  const raw = (err as { message?: unknown } | undefined)?.message;
  const fromMessage = typeof raw === 'string' ? raw.replace(/^API \d+: /, '') : undefined;
  const apiMessage = fromDetails ?? fromMessage ?? '';
  return { reason: reasonForApiMessage(apiMessage), apiMessage };
}

/** Wizard state → the create wire shape (exactly-one; the server snapshots price). */
export function buildCreatePayload(details: BookingDetails): CreateAppointmentArgs {
  return {
    branchId: details.branchId,
    servicePackageId: details.offering.kind === 'package' ? details.offering.id : null,
    studioServiceId: details.offering.kind === 'service' ? details.offering.id : null,
    customerName: details.name,
    customerEmail: details.email,
    customerPhone: details.phone,
    scheduledAt: details.scheduledAt.toISOString(),
    addonServiceIds: details.addonIds,
    notes: details.notes ? details.notes : undefined,
  };
}

export type WizardSubmitResult =
  | { ok: true; appointmentId: string }
  | { ok: false; rejection: { reason: RejectionReason; apiMessage: string } };

/**
 * Thin stateful shell around the pure functions above — deliberately
 * untested (spec § Testing Decisions 5: the CDP scenario owns behavior).
 * The confirm button gates on branch + offering + schedule + the three
 * contact fields, so the submit guard is defensive only.
 */
export function useBookingWizard(
  init: BookingSearchInit,
  deps: {
    catalog: BookingCatalog;
    createAppointment: (args: CreateAppointmentArgs) => Promise<{ id: string }>;
  }
) {
  const { catalog } = deps;
  const [initial] = useState(() => prefillFromSearch(init, catalog));
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [branchId, setBranchIdState] = useState<string | null>(initial.branchId);
  const [offering, setOfferingState] = useState<Offering>(initial.offering);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filterServiceId = useMemo(
    () => branchFilterServiceId(offering, init.service, catalog),
    [offering, init.service, catalog]
  );
  const branchChoices = useMemo(
    () => branchChoicesFor(catalog, filterServiceId),
    [catalog, filterServiceId]
  );
  const applicableAddons = useMemo(
    () => applicableAddonsFor(offering, catalog),
    [offering, catalog]
  );
  const scheduledAt = useMemo(() => scheduledAtInstant(date, time), [date, time]);
  const isPast = isPastPick(scheduledAt, new Date());
  const offeringPrice = offeringPriceCents(offering, catalog);
  const total = totalCents(offering, addonIds, catalog);
  const selectedAddons = useMemo(
    () => catalog.addons.filter((a) => addonIds.includes(a.id)),
    [catalog.addons, addonIds]
  );
  const offeringName = offering
    ? offering.kind === 'package'
      ? (catalog.packages.find((p) => p.id === offering.id)?.name ?? '—')
      : (catalog.services.find((s) => s.id === offering.id)?.name ?? '—')
    : '—';
  const branchName = catalog.branches.find((b) => b.id === branchId)?.name ?? '—';

  /** A branch change that orphaned a service offering clears the offering. */
  function setBranch(id: string | null) {
    setBranchIdState(id);
    if (offering?.kind === 'service') {
      const svc = catalog.services.find((s) => s.id === offering.id);
      if (id === null || !svc?.bookableBranchIds.includes(id)) {
        setOfferingState(null);
        setAddonIds([]);
      }
    }
  }

  /** Variant C auto-advance: the add-ons step is skipped when nothing applies. */
  function chooseOffering(next: Offering) {
    setOfferingState(next);
    setAddonIds([]);
    setStep(stepAfterOfferingChosen(applicableAddonsFor(next, catalog).length));
  }

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  /** Linear advance; the add-ons skip stays guarded for prefill flows. */
  function goNext() {
    setStep((s) => (s === 2 && applicableAddons.length === 0 ? 4 : Math.min(s + 1, 5)));
  }

  /** Back from date/time returns to the offering step when add-ons never applied. */
  function goBack() {
    setStep((s) => {
      if (s === 4) return stepBackFromDateTime(applicableAddons.length > 0);
      return Math.max(s - 1, 1);
    });
  }

  async function submit(): Promise<WizardSubmitResult> {
    if (submitting || !branchId || !offering || !scheduledAt) {
      return { ok: false, rejection: { reason: 'unknown', apiMessage: '' } };
    }
    setSubmitting(true);
    try {
      const record = await deps.createAppointment(
        buildCreatePayload({ branchId, offering, addonIds, scheduledAt, name, email, phone, notes })
      );
      return { ok: true, appointmentId: record.id };
    } catch (err) {
      return { ok: false, rejection: rejectionFromApiClientError(err) };
    } finally {
      setSubmitting(false);
    }
  }

  return {
    step,
    branchId,
    branchChoices,
    setBranch,
    offering,
    chooseOffering,
    goNext,
    goBack,
    applicableAddons,
    addonIds,
    toggleAddon,
    selectedAddons,
    date,
    setDate,
    time,
    setTime,
    scheduledAt,
    isPast,
    offeringName,
    branchName,
    offeringPriceCents: offeringPrice,
    totalCents: total,
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    notes,
    setNotes,
    submitting,
    submit,
  };
}

export type BookingWizard = ReturnType<typeof useBookingWizard>;
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sevendays/landing test`
Expected: PASS (47 tests — 17 existing + 30 new).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing exec biome check --write src/lib/booking.ts src/lib/booking.test.ts
git add apps/landing/src/lib/booking.ts apps/landing/src/lib/booking.test.ts
git commit -m "feat(landing): pure booking wizard lib — steps, matrix gating, PHT math, typed rejections"
```

(Body bullets: `Variant C state machine re-derived against the real schema (applicableAddonServiceIds embed replaces the prototype's name-keyed stub map; bookedPriceCents era). Rejection mapping pins the intake module's owned wordings; API owns the past-datetime floor — the lib renders the hint only. 30 lib-seam tests; mocked clock toFake ['Date'] only.`)

---

### Task 4: `/book` route — variant C wizard, rail, rejection card, typed-Link sweep

**Files:**
- Create: `apps/landing/src/routes/book.tsx`, `apps/landing/src/components/booking/rejection-card.tsx`, `apps/landing/src/components/booking/summary-rail.tsx`
- Modify: `apps/landing/src/routeTree.gen.ts` (via `generate-routes` — never hand-edited), `apps/landing/src/components/package-card.tsx`, `apps/landing/src/components/branch-card.tsx`, `apps/landing/src/components/service-card.tsx`, `apps/landing/src/components/service-teaser-item.tsx`, `apps/landing/src/components/site-header.tsx`, `apps/landing/src/routes/index.tsx`

**Interfaces:**
- Consumes: the full Task 3 lib surface (`useBookingWizard`, `TIME_SLOTS`, `phDateInputMin`, `RejectionReason`), `peso` + `phDateTime` (Task 2), the four query factories, `createAppointment` (Task 2 server fn), the pinned copy in Global Constraints.
- Produces: the `/book` route (deep-link contract live), and every `/book` plain anchor converted to typed `Link`s — the ticket-05/06 convert-comments are retired.

**Not here:** no `/booking/:id` route (success navigates by `href`; the target 404s until #46 — expected), no email, no visual design pass, no CDP scenario (Task 5).

Selector contract for the Task 5 scenario (ship it in this task's markup): each step panel carries `data-step='<n>'`; the past-pick hint carries `data-past-hint`; the rail's `<aside>` carries `data-summary-rail`; the rejection card's root carries `data-rejection-card`; the Back button carries `data-back`; each offering button (package and service cards on step 2) carries `data-offering='<offering id>'`. Remaining buttons are found by their pinned unique copy or as the first/last button inside their `data-step` section.

- [ ] **Step 1: Create the rejection card** — `apps/landing/src/components/booking/rejection-card.tsx`:

```tsx
import { REJECTION_COPY, type RejectionReason } from '../../lib/booking';

// Typed rejection card (prototype verbatim): friendly copy keyed by the
// derived reason; the raw API message stays visible as the mono line so a
// support call has the facts.
export function RejectionCard({
  reason,
  apiMessage,
}: {
  reason: RejectionReason;
  apiMessage: string;
}) {
  return (
    <div role='alert' data-rejection-card className='mt-4 rounded-lg border border-destructive bg-destructive/10 p-4'>
      <p className='font-semibold text-destructive'>We couldn't complete that booking</p>
      <p className='mt-1 text-sm'>{REJECTION_COPY[reason]}</p>
      {apiMessage && (
        <p className='mt-2 font-mono text-muted-foreground text-xs'>API reason: {apiMessage}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the summary rail** — `apps/landing/src/components/booking/summary-rail.tsx`:

```tsx
import type { BookingWizard } from '../../lib/booking';
import { peso, phDateTime } from '../../lib/format';

// Sticky "Your booking" rail (variant C): live branch / offering / add-ons /
// schedule / total while the customer chooses. Pre-submit money stays LIVE
// (spec ruling — the money-free rule is email-only, #47).
export function SummaryRail({ wizard }: { wizard: BookingWizard }) {
  return (
    <aside data-summary-rail className='h-fit rounded-xl border p-4 md:sticky md:top-6'>
      <p className='font-semibold text-sm'>Your booking</p>
      <dl className='mt-3 space-y-2 text-sm'>
        <div className='flex justify-between gap-3'>
          <dt className='text-muted-foreground'>Branch</dt>
          <dd className='text-right'>{wizard.branchName}</dd>
        </div>
        <div className='flex justify-between gap-3'>
          <dt className='text-muted-foreground'>Booking</dt>
          <dd className='text-right'>{wizard.offeringName}</dd>
        </div>
        {wizard.selectedAddons.map((a) => (
          <div key={a.id} className='flex justify-between gap-3'>
            <dt className='text-muted-foreground'>Add-on</dt>
            <dd className='text-right'>
              {a.name} · {peso(a.priceCents)}
            </dd>
          </div>
        ))}
        <div className='flex justify-between gap-3'>
          <dt className='text-muted-foreground'>Schedule</dt>
          <dd className='text-right'>
            {wizard.scheduledAt ? phDateTime(wizard.scheduledAt.toISOString()) : '—'} (PHT)
          </dd>
        </div>
        <div className='flex justify-between gap-3 border-t pt-2 font-semibold'>
          <dt>Total</dt>
          <dd>{peso(wizard.totalCents)}</dd>
        </div>
      </dl>
    </aside>
  );
}
```

- [ ] **Step 3: Create the route** — `apps/landing/src/routes/book.tsx`:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { RejectionCard } from '../components/booking/rejection-card';
import { SummaryRail } from '../components/booking/summary-rail';
import { SiteHeader } from '../components/site-header';
import { createAppointment } from '../lib/api.functions';
import { phDateInputMin, TIME_SLOTS, useBookingWizard, type RejectionReason } from '../lib/booking';
import { peso } from '../lib/format';
import {
  addonServiceQueries,
  branchQueries,
  servicePackageQueries,
  studioServiceQueries,
} from '../lib/queries';

// Deep-link contract (IA #32): ids, all optional, SHAPE-ONLY — a malformed
// param must never error the route; prefillFromSearch drops unknown ids
// against the reads. 'package' is a deep-link grammar name, not a JS conflict.
const searchSchema = z.object({
  branch: z.string().min(1).optional(),
  package: z.string().min(1).optional(),
  service: z.string().min(1).optional(),
});

export const Route = createFileRoute('/book')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(branchQueries.all()),
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(addonServiceQueries.all()),
    ]);
  },
  component: BookPage,
});

// Pinned questions (prototype variant C, verbatim).
const QUESTIONS = [
  'Where would you like to book?',
  'What are you booking?',
  'Any add-ons? (optional)',
  'When? (Philippine time)',
  'Last — your details',
];

function BookPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: addons } = useSuspenseQuery(addonServiceQueries.all());

  const wizard = useBookingWizard(search, {
    catalog: { branches, packages, services, addons },
    createAppointment: (args) => createAppointment({ data: args }),
  });
  const [rejection, setRejection] = useState<{
    reason: RejectionReason;
    apiMessage: string;
  } | null>(null);

  async function handleSubmit() {
    setRejection(null);
    const result = await wizard.submit();
    if (result.ok) {
      // Typed navigate({ to: '/booking/$id' }) lands with ticket #46 — the
      // route doesn't exist yet; navigate by fully-built href.
      navigate({ href: `/booking/${result.appointmentId}` });
    } else {
      setRejection(result.rejection);
    }
  }

  const canConfirm =
    wizard.branchId !== null &&
    wizard.offering !== null &&
    wizard.scheduledAt !== null &&
    wizard.name.trim() !== '' &&
    wizard.email.trim() !== '' &&
    wizard.phone.trim() !== '';

  return (
    <div className='mx-auto min-h-screen max-w-4xl p-6'>
      <SiteHeader />
      <div className='mt-6 h-1.5 rounded-full bg-neutral-200'>
        <div
          className='h-full rounded-full bg-neutral-900 transition-all'
          style={{ width: `${(wizard.step / 5) * 100}%` }}
        />
      </div>
      <div className='mt-6 grid gap-8 md:grid-cols-[1fr_16rem]'>
        <div>
          {wizard.step > 1 && (
            <button
              type='button'
              data-back
              onClick={wizard.goBack}
              className='mb-4 text-neutral-500 text-sm underline'
            >
              ← Back
            </button>
          )}
          <h2 className='font-bold text-2xl'>{QUESTIONS[wizard.step - 1]}</h2>

          {wizard.step === 1 && (
            <section data-step='1' className='mt-5 grid gap-3 sm:grid-cols-2'>
              {wizard.branchChoices.map((b) => (
                <button
                  key={b.id}
                  type='button'
                  onClick={() => {
                    wizard.setBranch(b.id);
                    wizard.goNext();
                  }}
                  className={`rounded-xl border p-4 text-left ${
                    wizard.branchId === b.id ? 'border-neutral-900 ring-2 ring-neutral-900' : ''
                  }`}
                >
                  <span className='font-semibold'>{b.name}</span>
                  <span className='mt-1 block text-neutral-500 text-sm'>{b.address}</span>
                  <span className='mt-2 block'>
                    <span className='rounded-full border px-2 py-0.5 text-xs'>
                      {b.acceptsWalkIns ? 'Walk-ins welcome' : 'No walk-ins'}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          )}

          {wizard.step === 2 && (
            <section data-step='2' className='mt-5 space-y-6'>
              <div>
                <p className='font-medium text-neutral-500 text-sm'>Service Packages</p>
                <div className='mt-2 grid gap-3 sm:grid-cols-2'>
                  {packages.map((p) => (
                    <button
                      key={p.id}
                      type='button'
                      data-offering={p.id}
                      onClick={() => wizard.chooseOffering({ kind: 'package', id: p.id })}
                      className={`rounded-xl border p-4 text-left ${
                        wizard.offering?.kind === 'package' && wizard.offering.id === p.id
                          ? 'border-neutral-900 ring-2 ring-neutral-900'
                          : ''
                      }`}
                    >
                      <span className='font-semibold'>{p.name}</span>
                      <span className='mt-1 block font-semibold'>{peso(p.priceCents)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className='font-medium text-neutral-500 text-sm'>
                  Studio Services {wizard.branchId ? `at ${wizard.branchName}` : ''}
                </p>
                {!wizard.branchId ? (
                  <p className='mt-2 text-neutral-500 text-sm'>
                    Choose a branch first — services are bookable per branch.
                  </p>
                ) : (
                  <div className='mt-2 grid gap-3 sm:grid-cols-2'>
                    {services
                      .filter((s) => wizard.branchId !== null && s.bookableBranchIds.includes(wizard.branchId))
                      .map((s) => (
                        <button
                          key={s.id}
                          type='button'
                          data-offering={s.id}
                          onClick={() => wizard.chooseOffering({ kind: 'service', id: s.id })}
                          className={`rounded-xl border p-4 text-left ${
                            wizard.offering?.kind === 'service' && wizard.offering.id === s.id
                              ? 'border-neutral-900 ring-2 ring-neutral-900'
                              : ''
                          }`}
                        >
                          <span className='font-semibold'>{s.name}</span>
                          <span className='mt-1 block font-semibold'>{peso(s.priceCents)}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {wizard.step === 3 && (
            <section data-step='3' className='mt-5'>
              {wizard.applicableAddons.length === 0 ? (
                <p className='text-neutral-500'>No add-ons apply to this booking.</p>
              ) : (
                <div className='grid gap-3 sm:grid-cols-2'>
                  {wizard.applicableAddons.map((a) => (
                    <button
                      key={a.id}
                      type='button'
                      onClick={() => wizard.toggleAddon(a.id)}
                      className={`rounded-xl border p-4 text-left ${
                        wizard.addonIds.includes(a.id)
                          ? 'border-neutral-900 ring-2 ring-neutral-900'
                          : ''
                      }`}
                    >
                      <span className='font-semibold'>{a.name}</span>
                      <span className='mt-1 block text-neutral-500 text-sm'>{a.description}</span>
                      <span className='mt-1 block font-medium'>{peso(a.priceCents)}</span>
                    </button>
                  ))}
                </div>
              )}
              {wizard.addonIds.length > 0 ? (
                <button
                  type='button'
                  onClick={wizard.goNext}
                  className='mt-4 rounded-md bg-neutral-900 px-4 py-2 text-primary-foreground text-sm text-white'
                >
                  Continue · {peso(wizard.totalCents)}
                </button>
              ) : (
                <button
                  type='button'
                  onClick={wizard.goNext}
                  className='mt-4 text-neutral-500 text-sm underline'
                >
                  Skip — no add-ons
                </button>
              )}
            </section>
          )}

          {wizard.step === 4 && (
            <section data-step='4' className='mt-5'>
              <input
                type='date'
                className='rounded-md border px-3 py-2'
                value={wizard.date}
                min={phDateInputMin(new Date())}
                onChange={(e) => wizard.setDate(e.target.value)}
              />
              <div className='mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5'>
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    type='button'
                    onClick={() => wizard.setTime(t)}
                    className={`rounded-lg border px-2 py-2 text-sm ${
                      wizard.time === t ? 'border-neutral-900 bg-neutral-900 text-white' : ''
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className='mt-2 text-neutral-500 text-xs'>
                All times are Philippine time (PHT, UTC+8). Bookings in the past are rejected.
              </p>
              {wizard.isPast && (
                <p data-past-hint className='mt-2 text-destructive text-sm'>
                  That time has already passed — pick a later slot.
                </p>
              )}
              <button
                type='button'
                disabled={wizard.scheduledAt === null}
                onClick={wizard.goNext}
                className='mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50'
              >
                Continue
              </button>
            </section>
          )}

          {wizard.step === 5 && (
            <section data-step='5' className='mt-5 grid gap-3'>
              <input
                className='rounded-md border px-3 py-2'
                placeholder='Full name'
                value={wizard.name}
                onChange={(e) => wizard.setName(e.target.value)}
              />
              <input
                className='rounded-md border px-3 py-2'
                placeholder='Email'
                type='email'
                value={wizard.email}
                onChange={(e) => wizard.setEmail(e.target.value)}
              />
              <input
                className='rounded-md border px-3 py-2'
                placeholder='Phone (+63…)'
                value={wizard.phone}
                onChange={(e) => wizard.setPhone(e.target.value)}
              />
              <textarea
                className='rounded-md border px-3 py-2'
                placeholder='Notes (optional — tell the studio anything useful)'
                value={wizard.notes}
                onChange={(e) => wizard.setNotes(e.target.value)}
              />
              {rejection && <RejectionCard reason={rejection.reason} apiMessage={rejection.apiMessage} />}
              <button
                type='button'
                disabled={!canConfirm || wizard.submitting}
                onClick={handleSubmit}
                className='mt-1 rounded-md bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50'
              >
                {wizard.submitting ? 'Booking…' : `Confirm booking · ${peso(wizard.totalCents)}`}
              </button>
            </section>
          )}
        </div>

        <SummaryRail wizard={wizard} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Regenerate the route tree and sweep the plain anchors to typed Links** — run `pnpm --filter @sevendays/landing generate-routes` (`/book` enters the tree; committed file, biome-excluded). Then convert the six enumerated anchors — in each file add `Link` to the `@tanstack/react-router` import if absent, replace the anchor (every one carries the convert-comment "Plain anchor: /book arrives with ticket #45; convert to typed Links then." or sits at the enumerated line) with the typed Link, and delete the now-false comment:

  - `src/routes/index.tsx` hero: `<Link to='/book' className='rounded-md bg-neutral-900 px-6 py-3 text-center text-white text-xl'>Book now</Link>`
  - `src/components/site-header.tsx` Book now: `<Link to='/book' className='rounded-md bg-neutral-900 px-4 py-2 text-white'>Book now</Link>`
  - `src/components/package-card.tsx`: `<Link to='/book' search={{ package: pkg.id }} className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'>Book now</Link>`
  - `src/components/branch-card.tsx`: `<Link to='/book' search={{ branch: branch.id }} className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'>Book at this branch</Link>`
  - `src/components/service-card.tsx` and `src/components/service-teaser-item.tsx`: `<Link to='/book' search={{ service: service.id }} className='rounded-md bg-neutral-900 px-4 py-2 text-center text-white'>Book now</Link>`

  The `search` prop types come from the route's `validateSearch` (spiked: router-core 1.171.28). The nav's other plain anchors and the not-found page's `/packages` anchor stay untouched (standing ruling).

- [ ] **Step 5: Typecheck, lint, unit gate**

```bash
pnpm --filter @sevendays/landing generate-routes
pnpm --filter @sevendays/landing typecheck && pnpm --filter @sevendays/landing test && pnpm --filter @sevendays/landing exec biome check --write src/routes/book.tsx src/components/booking/ src/components/package-card.tsx src/components/branch-card.tsx src/components/service-card.tsx src/components/service-teaser-item.tsx src/components/site-header.tsx src/routes/index.tsx
```

Expected: clean — `/book` resolves in the regenerated tree, the typed Links typecheck against the search schema, 47 lib-seam tests stay green.

- [ ] **Step 6: Commit**

```bash
git add apps/landing/src/routes/book.tsx apps/landing/src/components/booking/ apps/landing/src/routeTree.gen.ts apps/landing/src/components/package-card.tsx apps/landing/src/components/branch-card.tsx apps/landing/src/components/service-card.tsx apps/landing/src/components/service-teaser-item.tsx apps/landing/src/components/site-header.tsx apps/landing/src/routes/index.tsx
git commit -m "feat(landing): /book booking wizard (variant C) + typed /book Links"
```

(Body bullets: `One question per screen over the pure booking lib: branch (deep-link filtered) → offering → conditional add-ons (Skip / Continue · total) → date/time (PHT note, past hint, placeholder grid) → contact; sticky live-total rail; typed rejection cards from the API's owned wordings; success navigates /booking/:id by href until #46. The six /book plain anchors become typed Links — ticket-05/06 convert-comments retired.`)

---

### Task 5: CDP harness — dead-socket hardening + booking-wizard scenario

**Files:**
- Modify: `apps/landing/scripts/verify/lib.mjs`
- Create: `apps/landing/scripts/verify/booking-wizard.mjs`

**Interfaces:**
- Consumes: live stack — seeded API (8787), landing dev server (3000), Chrome CDP (9222); `connect()` from `./lib.mjs`; `GET /api/v1/studio-services` (Task 1's `applicableAddonServiceIds`), `GET /api/v1/service-packages`, `GET /api/v1/addon-services`, `GET /api/v1/branches` for re-derived expectations. The route's selector contract from Task 4: `section[data-step='1'..'5']`, `[data-past-hint]`, `[data-summary-rail]`, `[data-rejection-card]`, `[data-back]`, `button[data-offering='<id>']`; remaining buttons as the first/last button inside their `data-step` section.
- Produces: `booking-wizard.mjs` — 14 checks, READ-ONLY over the data (its submit drives a past-date booking the API rejects — no row is written); `lib.mjs` turns a dead CDP socket into loud failures instead of a hang (ticket-05 deferred minor: "harden when #45 extends the harness").

**Not here:** no admin checks, no CI wiring, no happy-path booking writes (Task 6's mutating e2e script), no unit tests for the scenario.

- [ ] **Step 1: Harden `lib.mjs` against a dead socket** — in `apps/landing/scripts/verify/lib.mjs`, replace:

```js
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  function send(method, params = {}) {
    const msgId = ++id;
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return new Promise((res) => pending.set(msgId, res));
  }
```

with:

```js
  let id = 0;
  const pending = new Map();
  // A dead socket must fail LOUD (#45 hardens the harness, ticket-05
  // follow-up): reject pending sends and refuse new ones — never hang,
  // never resolve-with-nothing (which would false-PASS a check).
  ws.onclose = () => {
    for (const entry of pending.values()) entry.rej(new Error('CDP socket closed mid-call'));
    pending.clear();
  };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).res(msg);
      pending.delete(msg.id);
    }
  };
  function send(method, params = {}) {
    if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
      return Promise.reject(new Error('CDP socket closed'));
    }
    const msgId = ++id;
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return new Promise((res, rej) => pending.set(msgId, { res, rej }));
  }
```

- [ ] **Step 2: Create the scenario** — `apps/landing/scripts/verify/booking-wizard.mjs` (14 checks; every expectation re-derived from the live API — where the live seed makes a filtering check vacuous, the check still asserts equality with the re-derived set and says so in its detail):

```js
// Scripted CDP checks for the booking wizard /book (issue #45). READ-ONLY
// over the data: the one submit this scenario drives is a past-date booking
// the API REJECTS — no row is written (the happy path is Task 6's e2e
// script). Seeded-state notes: all four services bookable at all three
// branches, and only Portraits & ID Photo carries applicable add-ons —
// checks 6/7 lean on that (no-addons service ⇒ skip case is live-real;
// the matrix-equality check is vacuous-by-seed and says so).
import { connect } from './lib.mjs';

const LANDING = process.env.LANDING_VERIFY_URL ?? 'http://localhost:3000';
const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
// PH wall-clock YYYY-MM-DD offset by N days from now (en-CA emits ISO order).
const phDate = (days) =>
  new Date(Date.now() + days * 86400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

async function main() {
  const [svcRes, pkgRes, addonRes, branchRes] = await Promise.all([
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/service-packages`),
    fetch(`${API}/api/v1/addon-services`),
    fetch(`${API}/api/v1/branches`),
  ]);
  const services = await svcRes.json();
  const packages = await pkgRes.json();
  const addons = await addonRes.json();
  const branches = await branchRes.json();
  if (!services.length || !packages.length || !addons.length || !branches.length) {
    throw new Error('seed drift: wizard scenario needs non-empty catalog reads');
  }
  const addonNames = (svc) =>
    addons
      .filter((a) => svc.applicableAddonServiceIds.includes(a.id))
      .map((a) => a.name);
  const svcNoAddons = services.find((s) => s.applicableAddonServiceIds.length === 0);
  const pkgWithAddons = packages[0]; // package ⇒ uniform (all active add-ons)
  const totalAddonsForPackage = addons.length;

  const page = await connect();
  const { go, text, evaluate, close } = page;
  const q = (sel) => JSON.stringify(sel);
  const click = async (sel) =>
    evaluate(`document.querySelector(${q(sel)})?.click() ?? 'missing'`);
  const setInput = async (sel, value) =>
    evaluate(`
      (() => {
        const el = document.querySelector(${q(sel)});
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, ${q(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
  const stepText = (n) => evaluate(`document.querySelector("section[data-step='${n}']")?.innerText ?? null`);

  // 1 — branch step renders the live branches
  await go(`${LANDING}/book`);
  const step1 = await stepText(1);
  check(
    'book: branch step renders every live branch',
    step1 !== null && branches.every((b) => step1.includes(b.name))
  );

  // 2 — ?service= filters the branch step to the re-derived bookable set
  const svcForFilter = services[0];
  const expectedBranches = branches.filter((b) =>
    svcForFilter.bookableBranchIds.includes(b.id)
  );
  await go(`${LANDING}/book?service=${svcForFilter.id}`);
  const step1Filtered = await stepText(1);
  const vacuous = expectedBranches.length === branches.length;
  check(
    'book: ?service= branch step equals the re-derived bookable set',
    step1Filtered !== null &&
      expectedBranches.every((b) => step1Filtered.includes(b.name)),
    vacuous ? 'vacuous-by-seed: service bookable at every branch' : ''
  );

  // 3 — unknown deep-link ids drop silently (no error card, all branches)
  await go(`${LANDING}/book?branch=99999999-9999-4999-8999-999999999999&package=99999999-9999-4999-8999-999999999999`);
  const step1Clean = await stepText(1);
  const noCard = await evaluate(`document.querySelector('[data-rejection-card]') === null`);
  check(
    'book: stale deep-link ids drop silently',
    step1Clean !== null && branches.every((b) => step1Clean.includes(b.name)) && noCard
  );

  // 4 — branch pick auto-advances to the offering step (packages grid live)
  await go(`${LANDING}/book`);
  await click(`section[data-step='1'] button`);
  const step2 = await stepText(2);
  check(
    'book: branch pick auto-advances; packages grid renders live names',
    step2 !== null && packages.every((p) => step2.includes(p.name))
  );

  // 5 — offering step lists services bookable at the chosen branch
  const branchPicked = branches[0];
  const bookableHere = services.filter((s) => s.bookableBranchIds.includes(branchPicked.id));
  check(
    'book: offering step lists the re-derived services at the branch',
    bookableHere.every((s) => step2.includes(s.name)),
    `branch ${branchPicked.name}: ${bookableHere.length}/${services.length} bookable`
  );

  // 6 — a package lands on the add-ons step (uniform ⇒ live add-ons list)
  await click(`section[data-step='2'] button`);
  const step3 = await stepText(3);
  check(
    'book: package offering shows the add-ons step with every active add-on',
    step3 !== null && addons.every((a) => step3.includes(a.name))
  );

  // 7 — a service with no applicable add-ons skips straight to date/time
  await go(`${LANDING}/book?service=${svcNoAddons.id}`);
  await click(`section[data-step='1'] button`);
  await click(`section[data-step='2'] button`);
  const step4Direct = await stepText(4);
  const noStep3 = await evaluate(`document.querySelector("section[data-step='3']") === null`);
  check(
    'book: offering with no applicable add-ons skips to date/time',
    svcNoAddons.applicableAddonServiceIds.length === 0 && step4Direct !== null && noStep3,
    `service: ${svcNoAddons.name}`
  );

  // 8 — Back from date/time (skip case) returns to the OFFERING step
  await click('[data-back]');
  const step2Again = await stepText(2);
  check(
    'book: Back from date/time (skip case) returns to the offering step',
    step2Again !== null
  );

  // 9/10 — past pick shows the inline hint; future pick clears it
  await click(`section[data-step='2'] button[data-offering='${svcNoAddons.id}']`); // re-choose the no-addons service
  await setInput(`section[data-step='4'] input[type='date']`, phDate(-1));
  await click(`section[data-step='4'] button`); // first hour chip
  const hintPast = await evaluate(`document.querySelector('[data-past-hint]') !== null`);
  check('book: past pick shows the inline already-passed hint', hintPast);
  await setInput(`section[data-step='4'] input[type='date']`, phDate(1));
  await click(`section[data-step='4'] button`);
  const hintGone = await evaluate(`document.querySelector('[data-past-hint]') === null`);
  check('book: future pick clears the hint', hintGone);

  // 11 — Continue reaches the contact step
  await click(`section[data-step='4'] button:last-of-type`);
  const step5 = await stepText(5);
  check('book: date/time Continue reaches the contact step', step5 !== null);

  // 12 — contact gate: confirm disabled until the three fields are set
  const confirmSel = `section[data-step='5'] button[type='button']:last-of-type`;
  const disabledBefore = await evaluate(`document.querySelector(${q(confirmSel)})?.disabled ?? null`);
  await setInput(`section[data-step='5'] input[placeholder='Full name']`, 'Verify Bot');
  await setInput(`section[data-step='5'] input[placeholder='Email']`, 'verify@example.com');
  await setInput(`section[data-step='5'] input[placeholder='Phone (+63…)']`, '+63 917 000 0000');
  const disabledAfter = await evaluate(`document.querySelector(${q(confirmSel)})?.disabled ?? null`);
  check(
    'book: confirm gated on the three contact fields',
    disabledBefore === true && disabledAfter === false
  );

  // 13 — past-slot submit renders the typed rejection card (API 400; no row).
  // Back to date/time (wizard state persists — the fields stay filled), set
  // the past date, come back, confirm.
  await click('[data-back]');
  await setInput(`section[data-step='4'] input[type='date']`, phDate(-1));
  await click(`section[data-step='4'] button`);
  await click(`section[data-step='4'] button:last-of-type`);
  await click(confirmSel);
  await page.wait(1200);
  const card = await text();
  check(
    'book: past-slot submit renders the typed rejection card (friendly + API reason)',
    card.includes('already passed in the Philippines') && card.includes('API reason:')
  );

  // 14 — the rail shows branch/offering/total derived from live data
  const pkg = pkgWithAddons;
  await go(`${LANDING}/book?package=${pkg.id}`);
  await click(`section[data-step='1'] button`);
  await click(`section[data-step='2'] button`);
  await click(`section[data-step='3'] button`); // select first add-on
  const rail = await evaluate(`document.querySelector('[data-summary-rail]')?.innerText ?? null`);
  const expectedTotal = pkg.priceCents + addons[0].priceCents;
  check(
    'book: rail runs the live total (offering + selected add-on)',
    rail !== null &&
      rail.includes('Your booking') &&
      rail.includes(peso(expectedTotal)) &&
      rail.includes(addons[0].name),
    `expected total ${peso(expectedTotal)} (${pkg.name} + ${addons[0].name}); uniform package add-ons: ${totalAddonsForPackage}`
  );

  close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('SCENARIO ERROR:', e.message);
  process.exit(1);
});
```

The scenario ships exactly 14 `check(` calls — the self-review grep confirms it (14 named checks: branch step, filter, stale ids, auto-advance, services-at-branch, package add-ons, skip, back-to-offering, past hint, future clears, contact step, contact gate, rejection card, rail total).

- [ ] **Step 3: Bring up the stack and run ALL THREE scenarios**

```bash
# Terminal A: seeded API on 8787      pnpm --filter @sevendays/api dev
# Terminal B: landing dev on 3000     pnpm --filter @sevendays/landing dev
# Terminal C: Chrome --remote-debugging-port=9222
node apps/landing/scripts/verify/packages-pages.mjs   # ticket-05 regression
node apps/landing/scripts/verify/content-pages.mjs    # ticket-06 regression (typed Links keep the same hrefs)
node apps/landing/scripts/verify/booking-wizard.mjs   # new: 14/14 checks passed, exit 0
```

Expected: both regressions stay green; the new scenario reports `14/14 checks passed`, exit 0. (If a chip/step selector misses, fix the SELECTOR in this scenario — never the route's pinned copy.)

- [ ] **Step 4: Lint and commit**

```bash
pnpm --filter @sevendays/landing exec biome check --write scripts/verify/
git add apps/landing/scripts/verify/
git commit -m "test(landing): booking-wizard CDP scenario + dead-socket hardening"
```

(Body bullets: `14 read-only checks over /book (filter, skip, Back-from-date/time, past hint, typed rejection card, live rail total) — expectations re-derived from the live API; lib.mjs rejects on a dead CDP socket instead of hanging (ticket-05 follow-up).`)

---

### Task 6: Full gate + mutating e2e + docs + handoff

**Files:**
- Create: `apps/landing/scripts/verify/booking-e2e.mjs` (MUTATING — verify-time only)
- Modify: `docs/plan.md` (booking-form checkbox → `- [✅]`), `docs/progress.md` (ticket-07 bullet)

**Interfaces:**
- Consumes: Tasks 1–5 complete and committed; the live stack.

**Not here:** no GitHub issue edits (#45's acceptance boxes are the owner's — the mapping goes in the PR description), no PR (owner opens it), no ADR (the applicability embed applies the ticket-04 pattern one junction over — the spec amendment rides the PR description and the progress bullet; the wizard introduces no new architectural decision beyond the spec's own rulings).

- [ ] **Step 1: Repo-wide gate**

```bash
pnpm check && pnpm build
```

Expected: green — landing vitest (47), api suites (incl. the extended studio-services suite), types tests, biome, typecheck across all workspaces, clean `vite build` (SSR bundle includes `/book`). A dirty `routeTree.gen.ts` after `pnpm build` is tool regen — it must already be committed from Task 4; if the build regenerates drift, chore-commit it BETWEEN tasks with a truthful body, never folded into a task commit.

- [ ] **Step 2: Run the mutating end-to-end** — create `apps/landing/scripts/verify/booking-e2e.mjs`:

```js
// MUTATING end-to-end (issue #45 AC 1): drives two REAL bookings through
// /book — one package (with an add-on) and one studio service — against the
// live seeded stack, then reads each back through the public single-get and
// asserts the server snapshot (bookedPriceCents, add-on entries, status).
// Rows persist in the compose db by design (tiny volume; the studio
// reconciles manually until M3 availability). Run at verification time:
//   node apps/landing/scripts/verify/booking-e2e.mjs
import { connect } from './lib.mjs';

const LANDING = process.env.LANDING_VERIFY_URL ?? 'http://localhost:3000';
const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}
const phDate = (days) =>
  new Date(Date.now() + days * 86400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

async function main() {
  const [pkgRes, svcRes, addonRes, branchRes] = await Promise.all([
    fetch(`${API}/api/v1/service-packages`),
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/addon-services`),
    fetch(`${API}/api/v1/branches`),
  ]);
  const packages = await pkgRes.json();
  const services = await svcRes.json();
  const addons = await addonRes.json();
  const branches = await branchRes.json();
  const pkg = packages[0];
  const svc = services.find((s) => s.applicableAddonServiceIds.length === 0);
  const branch = branches[0];

  const page = await connect();
  const { go, evaluate, wait, close } = page;
  const q = (s) => JSON.stringify(s);
  const click = async (sel) => evaluate(`document.querySelector(${q(sel)})?.click() ?? 'missing'`);
  const setInput = async (sel, value) =>
    evaluate(`
      (() => {
        const el = document.querySelector(${q(sel)});
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, ${q(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
  async function fillContactAndConfirm() {
    await setInput(`section[data-step='5'] input[placeholder='Full name']`, 'E2E Booking');
    await setInput(`section[data-step='5'] input[placeholder='Email']`, 'e2e@example.com');
    await setInput(`section[data-step='5'] input[placeholder='Phone (+63…)']`, '+63 917 000 0000');
    await click(`section[data-step='5'] button[type='button']:last-of-type`);
    await wait(1500);
    return evaluate(`location.pathname`);
  }
  async function pickDate() {
    await setInput(`section[data-step='4'] input[type='date']`, phDate(2));
    await click(`section[data-step='4'] button`); // first chip
    await click(`section[data-step='4'] button:last-of-type`); // Continue
  }

  // Booking 1 — package + first add-on
  await go(`${LANDING}/book?package=${pkg.id}&branch=${branch.id}`);
  await click(`section[data-step='1'] button`); // branch (prefilled, confirm the pick)
  await click(`section[data-step='2'] button[data-offering='${pkg.id}']`); // the preselected package card
  await click(`section[data-step='3'] button`); // first add-on
  await click(`section[data-step='3'] button[type='button']:last-of-type`); // Continue · total
  await pickDate();
  const pkgPath = await fillContactAndConfirm();
  check(
    'package booking redirects to /booking/:id',
    /^\/booking\/[0-9a-f-]{36}$/.test(pkgPath),
    pkgPath
  );
  const pkgId = pkgPath?.split('/').pop();
  const pkgRes2 = await fetch(`${API}/api/v1/appointments/${pkgId}`);
  const pkgRecord = await pkgRes2.json();
  check(
    'package booking snapshot: pending, package ref, booking-time price',
    pkgRecord?.status === 'pending' &&
      pkgRecord?.servicePackageId === pkg.id &&
      pkgRecord?.studioServiceId === null &&
      pkgRecord?.bookedPriceCents === pkg.priceCents,
    `bookedPriceCents ${pkgRecord?.bookedPriceCents} vs live ${pkg.priceCents}`
  );
  check(
    'package booking carries the selected add-on with snapshot price',
    pkgRecord?.addonServices?.length === 1 &&
      pkgRecord.addonServices[0].addonServiceId === addons[0].id &&
      pkgRecord.addonServices[0].priceCents === addons[0].priceCents
  );
  const confRes = await fetch(`${LANDING}${pkgPath}`);
  check(
    'confirmation page 404s until #46 (the expected boundary)',
    confRes.status === 404
  );

  // Booking 2 — studio service (no applicable add-ons ⇒ skips the step)
  await go(`${LANDING}/book?service=${svc.id}&branch=${branch.id}`);
  await click(`section[data-step='1'] button`);
  await click(`section[data-step='2'] button[data-offering='${svc.id}']`);
  await pickDate();
  const svcPath = await fillContactAndConfirm();
  check(
    'service booking redirects to /booking/:id',
    /^\/booking\/[0-9a-f-]{36}$/.test(svcPath),
    svcPath
  );
  const svcId = svcPath?.split('/').pop();
  const svcRecord = await (await fetch(`${API}/api/v1/appointments/${svcId}`)).json();
  check(
    'service booking snapshot: service ref, exactly-one, snapshot price',
    svcRecord?.studioServiceId === svc.id &&
      svcRecord?.servicePackageId === null &&
      svcRecord?.bookedPriceCents === svc.priceCents &&
      svcRecord?.addonServices?.length === 0
  );

  close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('E2E ERROR:', e.message);
  process.exit(1);
});
```

Bring the stack up (Task 5's three terminals) and run: `node apps/landing/scripts/verify/booking-e2e.mjs`
Expected: `6/6 checks passed`, exit 0 — the confirmation-page URL itself 404s until #46 (expected; only the URL shape and the API record are asserted).

- [ ] **Step 3: Tick the `docs/plan.md` checkbox** — the booking-form checkbox is this ticket alone; change:

```markdown
- [ ] Booking form (prototype variant C — one question per screen, auto-advance): branch → offering (package, or a Studio Service bookable at that branch) → conditional add-ons (screen skipped when none apply, "Skip — no add-ons" otherwise) → date/time (PHT note, hour chips) → contact info (guest flow, no account; deep links `?branch=&package=&service=`)
```

to (✅ emoji per AGENTS.md, never plain `[x]`):

```markdown
- [✅] Booking form (prototype variant C — one question per screen, auto-advance): branch → offering (package, or a Studio Service bookable at that branch) → conditional add-ons (screen skipped when none apply, "Skip — no add-ons" otherwise) → date/time (PHT note, hour chips) → contact info (guest flow, no account; deep links `?branch=&package=&service=`)
```

- [ ] **Step 4: Update `docs/progress.md`** — add one bullet to the landed-work list, directly after the ticket-06 bullet:

```markdown
- **M2 ticket 07 — booking wizard `/book` (#45 → .scratch/m2-booking-flow-tickets/07.md):** the guest flow landed as one route with client-side steps (prototype variant C): branch → offering (packages grid + services bookable at the branch) → conditional add-ons (matrix-gated for services, uniform for packages; `Skip — no add-ons` / `Continue · total`) → date/time (date input + placeholder hour chips 09:00–18:00 per ADR-0005, persistent PHT note, inline `data-past-hint` on a past pick — the API owns the `past_datetime` floor, the form never client-checks the clock at submit) → contact → POST → `navigate({ href: '/booking/:id' })` (route is #46; URL 404s by design until then). Deep links `?branch=&package=&service=` prefill with unknown-id dropping; `?service=` filters the branch step. Logic is a pure lib (`src/lib/booking.ts` + thin `useBookingWizard`): prefill/branch-filter/applicability/totals/step transitions/PH wall-clock math (`phDateInputMin`, `scheduledAtInstant`, `isPastPick`) and typed-rejection mapping (`reasonForApiMessage` pins the intake module's wordings — the wire carries only `{ error: message }`; card renders `REJECTION_COPY` + the raw message). API: `GET /studio-services` now embeds `applicableAddonServiceIds` (active-only junction stitch, ticket-04 pattern) — SPEC AMENDMENT, veto-flagged in the PR (the spec's API list lacked applicability; the add-ons step cannot matrix-gate without it); `service_inactive` rejection copy derived from the ratified `package_inactive` pattern (veto-flagged). Landing data layer: `getAddonServices` + `addonServiceQueries` + `createAppointment` server fns (Sentry spans); `phDateTime` promoted verbatim with pinned full-ICU outputs. Typed-Link sweep: all six `/book` plain anchors → typed `Link`s (ticket-05/06 convert-comments retired). Tests: lib seam 15 → 47 (30 booking tests incl. mocked-clock `toFake:['Date']` prior art); api studio-services suite +1 embed test (fixtures already carried the matrix rows — inactive-link filtering proven); types +3. CDP: `booking-wizard.mjs` 14 read-only checks (the submit check drives a past-date booking the API rejects — no row written); `booking-e2e.mjs` MUTATING (two real bookings, snapshot read-back) run at verification time, 6/6; `lib.mjs` rejects on dead CDP sockets (ticket-05 follow-up). Full `pnpm check` + `pnpm build` green; `docs/plan.md` booking-form checkbox ticked ✅. NOT landed: `/booking/:id` page (#46), Resend email (#47), milestone e2e-with-email verify. Deferred minors: the wizard's step-1 walk-in pill is a third badge implementation (collapses at the visual pass with ticket-06's two); matrix-filter CDP checks are vacuous-by-seed (all services bookable everywhere; equality asserted with the detail note); `rejectionFromApiClientError`'s foreign-throwable path renders `err.message` in the card's API-reason line (may leak a fetch-error string — cosmetic).
```

- [ ] **Step 5: Commit the docs**

```bash
pnpm --filter @sevendays/landing exec biome check --write scripts/verify/booking-e2e.mjs
git add apps/landing/scripts/verify/booking-e2e.mjs docs/plan.md docs/progress.md
git commit -m "docs: M2 ticket 07 landed — booking wizard; booking-form checkbox ticked"
```

---

## Acceptance criteria mapping (for the PR description)

- `A real booking can be made end to end from /book for both a package and a studio service` → Tasks 2–4 (route + lib + server fns) + Task 6 (`booking-e2e.mjs` 6/6: both bookings redirect and read back with correct snapshots).
- `Deep-link params prefill and filter correctly (esp. ?service= branch filtering)` → Task 3 (`prefillFromSearch`, `branchFilterServiceId` — unit-tested incl. unknown-id dropping) + Task 5 (scenario checks 2–3 live).
- `Add-ons step conditional-visibility, Skip affordance, and Back-from-date/time behaviour match the rulings` → Task 1 (the matrix embed) + Task 3 (`applicableAddonsFor`, `stepAfterOfferingChosen`, `stepBackFromDateTime` — unit-tested) + Task 5 (checks 6–8 live: skip case is live-real under the seed).
- `Past slot shows the inline hint; API rejection reasons render as friendly copy cards` → Task 3 (`isPastPick`, `reasonForApiMessage`, `REJECTION_COPY` — unit-tested with the mocked clock) + Task 4 (hint markup, `RejectionCard`) + Task 5 (checks 9/10 hint, check 13 past-slot submit → typed card, no row written).
- `Submitting state on the confirm button; success redirects to /booking/:id` → Task 4 (`Booking…` submitting state, `canConfirm` gate, `navigate({ href })`) + Task 6 (both e2e bookings assert the `/booking/<uuid>` redirect).

