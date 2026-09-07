# M2 Ticket 03 — Service-Path Intake + Typed Rejections + `past_datetime` Floor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `POST /api/v1/appointments` books a Studio Service — the service must be active and bookable at the chosen branch, service bookings accept only junction-linked add-ons (package bookings keep the uniform all-active rule), and an at-or-before-now `scheduledAt` rejects with the typed `past_datetime` reason — all inside the one intake transaction, with every new rejection carrying module-owned customer-presentable wording the untouched thin route forwards verbatim (GitHub issue #41, parent spec #37).

**Architecture:** The generalized `createAppointment` module (`apps/api/src/services/appointments.ts`) gains a service-path branch (unknown → inactive → bookable-at-branch resolution), a matrix check on the service path's add-ons, and a private instant-comparison floor — no route, schema, migration, or client change anywhere. The check order is owner-ratified: activity before bookability before matrix; `addon_inactive` wins over `addon_not_applicable`; the floor applies to both paths and rejects at-or-before-now (inclusive).

**Tech Stack:** Drizzle ORM ^0.45.2 (the two junction tables from migrations 0002–0004, `and` + `eq` + `inArray` only), Zod 4.5.1 (schemas untouched — shape-only by ruling), Vitest 4 with `vi.useFakeTimers({ toFake: ['Date'] })` for floor determinism, real-Postgres compose harness per ADR-0008.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (§ API surface — "POST generalized", "Past-date/time floor", "Typed rejections") + ticket `.scratch/m2-booking-flow-tickets/03.md` (= GitHub issue #41, parent #37). Blocked-by #2 (compose real-Postgres harness) landed in M1.4. The plan argues from the spec; executors read both.

## Global Constraints

- **Feature branch only:** all work on `feat/m2-03-service-path-intake`, branched from up-to-date `main`. Never commit directly to `main`; the owner pushes/merges/opens the PR.
- **No schema, migration, seed, types, or client change.** Everything rides migrations 0002–0004 (tickets 01–02): `branch_studio_services` and `studio_service_addon_services` already exist and are exported from the `@sevendays/db` schema barrel. Do NOT run `db:generate`; a generated-migration diff, or ANY edit under `packages/db`, `packages/types`, or `packages/api-client` (its loopback mock included), is a defect. `createAppointmentSchema` stays shape-only (spec user story 32) — the floor is intake validation, not shape validation.
- **The intake transaction stays the one write seam.** Every new check (service resolve, bookability, matrix, floor) joins the existing `db.transaction` — no second transaction, no check outside it (ADR-0005 posture; M3's capacity check joins the same way later).
- **Routes stay thin — `apps/api/src/routes/**` is untouched.** The POST route already forwards module wording verbatim via `badRequest(c, result.message)` (`apps/api/src/routes/appointments.ts:41-43`). Wording edits belong ONLY in `REJECTION_MESSAGES` (`apps/api/src/services/appointments.ts`); the error shape stays `apiErrorSchema` (`{ error, details? }`), unchanged.
- **Rejection wordings are pinned verbatim (owner-ratified 2026-09-08):** the FIVE existing strings are unchanged (suites assert them verbatim — any edit to them is a defect). New reasons and wordings:
  - `past_datetime` → `'Your chosen schedule is already in the past. Please pick a future date and time.'`
  - `service` → `'Unknown studioServiceId.'` (per-entity mirror of `'Unknown servicePackageId.'`)
  - `service_inactive` → `'Studio Service is inactive.'`
  - `service_not_bookable_at_branch` → `"That service isn't offered at the branch you picked."`
  - `addon_not_applicable` → `"That add-on doesn't apply to the service you picked."`
  The spec's `RejectionReason` contract names `past_datetime` / `service_not_bookable_at_branch` / `addon_not_applicable` exactly — those strings are load-bearing for the landing form's reason→copy mapping (ticket 05).
- **Check-order ruling (owner-ratified):** service path — unknown → inactive → bookable-at-branch; add-ons (both paths) — unknown → inactive, then SERVICE path only → matrix-applicable. A linked-but-inactive add-on on a service booking rejects `addon_inactive` (inactive stays inactive on every path; the matrix never rescues an inactive add-on). The floor applies to BOTH offering paths and is evaluated after the branch resolve, before offering resolution. Package bookings keep EXACTLY the five existing rules and never consult the matrix.
- **Floor semantics:** Asia/Manila framing with PH fixed at UTC+8 and no DST → "before now in Manila" IS "before now on the UTC instant" — a plain JS comparison `scheduledAt.getTime() <= Date.now()` → `past_datetime` (at-or-before-now rejects, inclusive). No timezone library; the comparison lives inline in the module and is NOT exported — floor tests mock the clock (`vi.useFakeTimers({ toFake: ['Date'] })` — Date only, so postgres.js timers run real), never a public seam.
- **No fixture asserts a real-clock boundary:** past/present floor behavior is provable ONLY with a mocked clock; future timestamps in fixtures are now-relative (`Date.now() + 5d`), never hard-coded dates. The existing `2026-09-10` literal in `apps/api/test/appointments.test.ts` (3 sites) rots into a mass 400 failure on 2026-09-10 once the floor ships — replace it in Task 1.
- **Fixture values are synthetic, not catalog** (existing helpers convention — `Test Branch A`, `Retired Add-on`); the `TODO(seed)` convention applies only to `packages/db/scripts/catalog.ts`, untouched — an executor must not invent catalog data anywhere in this plan.
- **`noUncheckedIndexedAccess` is on:** guard indexed destructures in `apps/api/src/services/**` (`const [row] = ...; if (!row) ...`), never `!`. In test files follow the existing guarded style the suites already use.
- **Biome-clean commits:** `pnpm exec biome check --write <touched files>` before each commit (project fix scripts call the `biome` bin). Task 2's gate runs `pnpm check` (lint + format + typecheck + test); if a format-only failure appears, `pnpm --filter @sevendays/api format` then re-run.
- **Compose for integration tests:** `docker compose up -d db` (postgres:17, `sevendays_test`); `apps/api`'s vitest global setup migrates via `@sevendays/db/migrate`; always pass env explicitly — `app.request(path, opts, { DATABASE_URL: url })`, never a bare `app.request(path)`.
- **Scope fence (siblings share roadmap checkboxes):** ticket 03 delivers the SERVICE-PATH WRITE SEAM + typed rejections + floor ONLY. Not here: the three read endpoints + client wrappers (#42, landed 2026-09-08), landing pages / booking form / confirmation page / Resend email (tickets 05–10), any client-side reason→copy mapping (ticket 05), any schema/migration/seed/types/client edit, slot/availability logic (M3), auth (M4), any GitHub issue edit. The api-client loopback mock is NOT extended: the client contract (envelope + existing wordings) is unchanged — new rejection reasons ride the same `apiErrorSchema` envelope and the form maps reasons to copy in ticket 05.
- **Shared roadmap checkboxes — explicit tick timing:** `docs/plan.md`'s M2 API checkbox (line 63) spans tickets 03 + 04; ticket 04 landed 2026-09-08, so THIS ticket's close-out (Task 3 only) ticks it with the ✅ emoji, plus the past-dates checkbox (line 64), which this ticket satisfies alone. No Task 1/2 executor may tick either. GitHub issue #41's acceptance-criteria boxes are the owner's — note the AC→task mapping in the PR description, never edit the issue.
- **Commit style:** unscoped conventional subjects, bullet bodies when wordy; one commit per task.

---

## File Structure

```
apps/api/src/services/appointments.ts   (mod) createAppointment: +service path (unknown/inactive/bookability), +matrix check on service add-ons, +floor; REJECTION_MESSAGES 5→10 reasons; no export changes
apps/api/test/appointments.test.ts      (mod) +14 tests (module seam 7 / HTTP seam 7); fixture dates now-relative; vi import
apps/api/test/helpers/fixtures.ts       (mod) + serviceStudio (active, branchA-only) + 1 bookability row + 2 applicability rows; FixtureIds.serviceStudio
apps/api/test/studio-services.test.ts   (mod) list count 1→2 + new service's row assertions (fixture ripple — an active service must appear on the read)
docs/progress.md                        (mod) ticket-03 landed bullet + last-updated line (Task 3 only)
docs/plan.md                            (mod) M2 API checkbox + past-dates checkbox ticked ✅ with dated notes (Task 3 only)
```

Blast radius (grep-verified pre-plan): the ONLY production `appointments` insert site is `apps/api/src/services/appointments.ts:116` (the module this plan edits); the other two insert sites in `apps/api/test/appointments.test.ts` (list-cap test, CHECK probe) bypass the module and are untouched behaviorally — only their fixture dates change. No suite outside `apps/api/test` POSTs appointments through the real API (the api-client loopback suite runs against the in-memory mock with a 2026-10-01 future date — unaffected, mock untouched). `packages/types` appointment tests parse shapes only (no floor) — unaffected.

Task map: 1 — service-path intake + matrix + floor with full test coverage (TDD, compose green); 2 — regression sweep + full `pnpm check` + `pnpm build`; 3 — close-out (progress.md, plan checkboxes, graphify, handoff).

---

### Task 1: Service-path intake + matrix + floor, with full test coverage (TDD)

**Files:**
- Modify: `apps/api/src/services/appointments.ts`
- Modify: `apps/api/test/appointments.test.ts`
- Modify: `apps/api/test/helpers/fixtures.ts`
- Modify: `apps/api/test/studio-services.test.ts`

**Interfaces:**
- Consumes: `branchStudioServices` + `studioServiceAddonServices` tables (already exported from `@sevendays/db` — no barrel edit); `CreateAppointmentInput` (`servicePackageId`/`studioServiceId` nullable with defaults null, `addonServiceIds` deduped by the create schema's refine — the length-compare matrix check below relies on it).
- Produces (Task 2's gate and the ticket-05 form consume these exact facts): `createAppointment(db, input)` keeps its exact signature and `CreateAppointmentResult` shape; `CreateReason` (module-internal) gains `service` | `service_inactive` | `service_not_bookable_at_branch` | `addon_not_applicable` | `past_datetime`. A service booking's 201 record: `servicePackageId` null, `studioServiceId` set, `bookedPriceCents` = the service's `priceCents` snapshot, add-on entries in the same `{ addonServiceId, name, priceCents }` shape. The route consumes nothing new — `badRequest(c, result.message)` already forwards.

**Not here:** no route edit (the forwarding exists), no schema/types/db/client edit, no mock edit, no `docs/plan.md` or `docs/progress.md` ticks (Task 3), no landing work.

- [ ] **Step 1: Cut the branch**

```bash
git checkout main && git pull --ff-only
git checkout -b feat/m2-03-service-path-intake
```

- [ ] **Step 2: Extend the fixtures** — `apps/api/test/helpers/fixtures.ts` (the red tests in Step 5 need these rows; loadFixtures runs inside every test via `beforeEach`).

Add to the `FixtureIds` type (after `serviceRetired: string;`):

```ts
  serviceStudio: string;
```

Add to the `await import('@sevendays/db')` destructure: `studioServiceAddonServices,` (after `studioServices,`).

Insert a new service block after the `serviceRetired` insert, REPLACING the block comment that currently reads "M2 ticket 02: one active Studio Service — the db-level exactly-one CHECK test needs a second offering to attempt a both-set insert. Ticket 03's plan adds the inactive service + applicability-matrix fixtures its rejection tests need; nothing else consumes rows here.":

```ts
  // M2 ticket 02: one active Studio Service — the db-level exactly-one CHECK
  // test needs a second offering to attempt a both-set insert.
  // M2 ticket 03 adds the applicability-matrix fixtures its rejection tests
  // need; the inactive service is the existing serviceRetired (reused).
```

Then, after the `serviceRetired` insert block, append:

```ts
  // M2 ticket 03: a second ACTIVE service, linked to branchA ONLY — the
  // bookability rejection needs an active service that is NOT bookable
  // everywhere (portrait is linked to both branches).
  const [serviceStudio] = await db
    .insert(studioServices)
    .values({
      name: 'Studio Portraits',
      description: 'Module-level service fixture.',
      priceCents: 70000,
      isActive: true,
    })
    .returning({ id: studioServices.id });
```

Extend the `branchStudioServices` values array with one row and update its comment:

```ts
  // Bookability rows (ticket 01's presence-row junction): portrait bookable
  // at BOTH branches; retired linked to branchA only (inactive — invisible
  // on reads even though its link exists); studio (ticket 03) linked to
  // branchA only — booking it at branchB is the service_not_bookable case.
  await db.insert(branchStudioServices).values([
    { studioServiceId: servicePortrait.id, branchId: branchA.id },
    { studioServiceId: servicePortrait.id, branchId: branchB.id },
    { studioServiceId: serviceRetired.id, branchId: branchA.id },
    { studioServiceId: serviceStudio.id, branchId: branchA.id },
  ]);
```

Immediately after, add the applicability matrix (new block):

```ts
  // Applicability matrix (ticket 01): Makeup applies to the portrait
  // service; the RETIRED add-on is linked to the studio service — a live
  // link on an inactive add-on proves activity-before-matrix (ticket 03).
  await db.insert(studioServiceAddonServices).values([
    { studioServiceId: servicePortrait.id, addonServiceId: addonMakeup.id },
    { studioServiceId: serviceStudio.id, addonServiceId: addonRetired.id },
  ]);
```

Add to the return object (after `serviceRetired: serviceRetired.id,`):

```ts
    serviceStudio: serviceStudio.id,
```

- [ ] **Step 3: Amend the sibling list test (fixture ripple)** — `apps/api/test/studio-services.test.ts`. The new ACTIVE service legitimately appears on the read (ordered by name: `'Portraits & ID Photo'` < `'Studio Portraits'`), so the pinned count changes. Replace the tail of the existing test (from `expect(body).toHaveLength(1);` through the `updatedAt` assertion) with:

```ts
    // Two active services now: portrait (both branches) + the ticket-03
    // module fixture (branchA only). The retired service stays invisible
    // despite its link — the active-only filter's whole point.
    expect(body).toHaveLength(2);
    const portrait = body[0];
    expect(portrait?.id).toBe(ids.servicePortrait);
    expect(portrait?.name).toBe('Portraits & ID Photo');
    expect(portrait?.priceCents).toBe(50000);
    expect(portrait?.isActive).toBe(true);
    expect(portrait?.bookableBranchIds).toHaveLength(2);
    expect(portrait?.bookableBranchIds).toContain(ids.branchA);
    expect(portrait?.bookableBranchIds).toContain(ids.branchB);
    // Row-mirror fields ride along (the client renders name + price + description).
    expect(portrait?.description).toBe('Studio portraits and ID photos.');
    expect(portrait?.createdAt).toBeDefined();
    expect(portrait?.updatedAt).toBeDefined();
    const studio = body[1];
    expect(studio?.id).toBe(ids.serviceStudio);
    expect(studio?.name).toBe('Studio Portraits');
    expect(studio?.bookableBranchIds).toEqual([ids.branchA]);
```

(This amendment has no red phase — the fixture in Step 2 already makes the current read return 2 rows, so the OLD assertion would fail; the amended one is verified green in Step 8's full run.)

- [ ] **Step 4: Make the existing fixture dates clock-proof** — `apps/api/test/appointments.test.ts`. The floor rejects at-or-before-now, so the hard-coded `2026-09-10` turns into a mass 400 failure on 2026-09-10 (Global Constraints). Add above the `payload` helper:

```ts
// The intake floor (ticket 03) rejects at-or-before-now, so a hard-coded
// future date rots into a mass 400 failure the calendar day it passes.
// All future timestamps are now-relative; past-side tests mock the clock.
const futureDate = (days = 5) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const FUTURE_ISO = () => futureDate().toISOString();
```

Replace in `payload`:

```ts
  scheduledAt: FUTURE_ISO(),
```

Replace in the list-cap test (the `db.insert(appointmentsTable).values({...})` block) and in the CHECK-probe `baseValues()`:

```ts
        scheduledAt: futureDate(),
```

(the CHECK-probe site has no trailing comma — `scheduledAt: futureDate(),` with the block's own indentation).

- [ ] **Step 5: Write the 14 failing tests** — `apps/api/test/appointments.test.ts`. Extend the vitest import to `import { beforeEach, describe, expect, it, vi } from 'vitest';`.

Append the module-seam describe after the existing `createAppointment module seam` describe:

```ts
// M2 ticket 03 — the service path at the module seam: same failure-variant
// contract as the package path, plus the floor (mocked clock, never a
// public export). Complements the HTTP-level tests below (route = one
// call to badRequest with result.message).
describe('createAppointment module seam — service path + floor (ticket 03)', () => {
  const moduleInput = (overrides: Record<string, unknown> = {}) =>
    createAppointmentSchema.parse(
      payload({
        servicePackageId: null,
        studioServiceId: ids.serviceStudio,
        addonServiceIds: [],
        ...overrides,
      })
    );

  it('rejects an inactive service with the service_inactive wording', async () => {
    await expect(
      createAppointment(db, moduleInput({ studioServiceId: ids.serviceRetired }))
    ).resolves.toEqual({
      ok: false,
      reason: 'service_inactive',
      message: 'Studio Service is inactive.',
    });
  });

  it('rejects an unknown-but-valid service uuid', async () => {
    await expect(
      createAppointment(db, moduleInput({ studioServiceId: MISSING_UUID }))
    ).resolves.toEqual({ ok: false, reason: 'service', message: 'Unknown studioServiceId.' });
  });

  it('rejects an active service outside the branch (not bookable there)', async () => {
    await expect(
      createAppointment(db, moduleInput({ branchId: ids.branchB }))
    ).resolves.toEqual({
      ok: false,
      reason: 'service_not_bookable_at_branch',
      message: "That service isn't offered at the branch you picked.",
    });
  });

  it('rejects a non-applicable add-on on a service booking', async () => {
    await expect(
      createAppointment(db, moduleInput({ addonServiceIds: [ids.addonMakeup] }))
    ).resolves.toEqual({
      ok: false,
      reason: 'addon_not_applicable',
      message: "That add-on doesn't apply to the service you picked.",
    });
  });

  it('rejects a linked-but-inactive add-on BEFORE the matrix (addon_inactive)', async () => {
    await expect(
      createAppointment(db, moduleInput({ addonServiceIds: [ids.addonRetired] }))
    ).resolves.toEqual({
      ok: false,
      reason: 'addon_inactive',
      message: 'Add-on Service is inactive.',
    });
  });

  it('rejects at-or-before-now and accepts one second after (mocked clock, no export)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-09-10T00:00:00.000Z'));
      // Typed rejections RESOLVE { ok: false } — never throw (the module's
      // failure-variant contract, same as the five package-path reasons).
      await expect(
        createAppointment(db, moduleInput({ scheduledAt: '2026-09-10T00:00:00.000Z' }))
      ).resolves.toEqual({
        ok: false,
        reason: 'past_datetime',
        message: 'Your chosen schedule is already in the past. Please pick a future date and time.',
      });
      await expect(
        createAppointment(db, moduleInput({ scheduledAt: '2026-09-10T00:00:01.000Z' }))
      ).resolves.toMatchObject({ ok: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('commits a service booking with the service-price snapshot', async () => {
    const result = await createAppointment(
      db,
      moduleInput({ studioServiceId: ids.servicePortrait })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrows for TS; the line above already failed otherwise
    expect(result.record.studioServiceId).toBe(ids.servicePortrait);
    expect(result.record.servicePackageId).toBeNull();
    expect(result.record.bookedPriceCents).toBe(50000);
    expect(result.record.addonServices).toEqual([]);
  });
});
```

Append the HTTP-seam describe after the `GET /api/v1/appointments/:id` describe:

```ts
// M2 ticket 03 — the service path through the HTTP seam. The thin route is
// already the forwarding layer (badRequest(c, result.message)); these pin
// the 201 record and the module-owned wordings arriving verbatim.
describe('POST /api/v1/appointments — service path (ticket 03)', () => {
  const servicePayload = (overrides: Record<string, unknown> = {}) => ({
    branchId: ids.branchA,
    servicePackageId: null,
    studioServiceId: ids.servicePortrait,
    customerName: 'Ana Reyes',
    customerEmail: 'ana@example.com',
    customerPhone: '+63 917 000 0000',
    scheduledAt: FUTURE_ISO(),
    addonServiceIds: [ids.addonMakeup],
    ...overrides,
  });

  const post = (body: Record<string, unknown>) =>
    app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      },
      { DATABASE_URL: url }
    );

  it('books a Studio Service: 201 with the service-price snapshot and the applicable add-on', async () => {
    const res = await post(servicePayload());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.studioServiceId).toBe(ids.servicePortrait);
    expect(body.servicePackageId).toBeNull();
    expect(body.bookedPriceCents).toBe(50000);
    expect(body.addonServices).toEqual([
      { addonServiceId: ids.addonMakeup, name: 'Makeup', priceCents: 12000 },
    ]);
  });

  it('rejects both offerings with the schema-level 400 (uniform envelope)', async () => {
    const res = await post(servicePayload({ servicePackageId: ids.packageCombined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request payload.');
    expect(body.details[0]?.message).toContain('Exactly one of servicePackageId and studioServiceId');
  });

  it('rejects neither offering with the schema-level 400 (uniform envelope)', async () => {
    const res = await post(servicePayload({ studioServiceId: null }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request payload.');
    expect(body.details[0]?.message).toContain('Exactly one of servicePackageId and studioServiceId');
  });

  it('rejects an inactive service: the route forwards the module-owned wording verbatim', async () => {
    const res = await post(servicePayload({ studioServiceId: ids.serviceRetired }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Studio Service is inactive.');
  });

  it('rejects a service not bookable at the branch', async () => {
    const res = await post(
      servicePayload({ studioServiceId: ids.serviceStudio, branchId: ids.branchB })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That service isn't offered at the branch you picked.");
  });

  it('rejects a non-applicable add-on on a service booking', async () => {
    const res = await post(
      servicePayload({ studioServiceId: ids.serviceStudio, addonServiceIds: [ids.addonMakeup] })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That add-on doesn't apply to the service you picked.");
  });

  it('rejects a past scheduledAt through the HTTP seam: 400 with the past_datetime message', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-09-10T00:00:00.000Z'));
      const res = await post(servicePayload({ scheduledAt: '2026-09-10T00:00:00.000Z' }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(
        'Your chosen schedule is already in the past. Please pick a future date and time.'
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 6: Run to verify the red/green split**

Run: `pnpm --filter @sevendays/api test -- appointments.test.ts`
Expected: the 12 new module/HTTP service-path tests FAIL against current code (service bookings fall into the package branch and resolve `{ ok: false, reason: 'package', message: 'Unknown servicePackageId.' }`; the floor tests fail because nothing rejects; the HTTP 201s return 400 instead). The 2 both/neither tests PASS already (ticket 02's schema refine landed them). All PRE-EXISTING tests PASS (their dates are now relative-future, and they bypass or predate the floor).

- [ ] **Step 7: Implement the module** — `apps/api/src/services/appointments.ts`.

Extend the `@sevendays/db` import with `branchStudioServices,` and `studioServiceAddonServices,`; extend the `drizzle-orm` import to `import { and, desc, eq, inArray } from 'drizzle-orm';`.

Replace the `REJECTION_MESSAGES` block and its comment:

```ts
/**
 * The ten intake rejections; wording is module-owned (route stays thin).
 * Ticket 03 adds the service-path cases + the past-datetime floor — the
 * five package-path wordings are UNCHANGED (suites assert them verbatim).
 */
const REJECTION_MESSAGES = {
  branch: 'Unknown branchId.',
  package: 'Unknown servicePackageId.',
  package_inactive: 'Service Package is inactive.',
  addon: 'Unknown addonServiceId.',
  addon_inactive: 'Add-on Service is inactive.',
  service: 'Unknown studioServiceId.',
  service_inactive: 'Studio Service is inactive.',
  service_not_bookable_at_branch: "That service isn't offered at the branch you picked.",
  addon_not_applicable: "That add-on doesn't apply to the service you picked.",
  past_datetime: 'Your chosen schedule is already in the past. Please pick a future date and time.',
} as const;
```

REPLACE the body of `createAppointment`'s transaction (from the `const [branchRow]` resolve through the insert) with — the junction inserts, record assembly, and return stay exactly as they are:

```ts
    const [branchRow] = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.id, input.branchId));
    if (!branchRow) return fail('branch');

    // The floor (ticket 03): at-or-before the current instant → the typed
    // 'past_datetime' rejection. PH is fixed UTC+8 with no DST, so "before
    // now in Asia/Manila" IS "before now on the UTC instant" — a plain
    // instant comparison, no tz arithmetic, and createAppointmentSchema
    // stays shape-only (spec ruling). Evaluated after the branch resolve
    // and before offering resolution — a rejected clock never reaches the
    // junction queries.
    if (input.scheduledAt.getTime() <= Date.now()) return fail('past_datetime');

    // Offering resolution (ticket 03): the generalized input carries
    // exactly one ref (the create schema's refine); which one dispatches
    // the path. Package path: unknown/inactive (unchanged). Service path:
    // unknown → inactive → bookable at THIS branch, all inside this same
    // transaction (the one write seam, ADR-0005).
    let offeringPriceCents: number;
    let serviceId: string | null = null;
    if (input.servicePackageId !== null) {
      const [packageRow] = await tx
        .select({
          id: servicePackages.id,
          isActive: servicePackages.isActive,
          priceCents: servicePackages.priceCents,
        })
        .from(servicePackages)
        .where(eq(servicePackages.id, input.servicePackageId));
      if (!packageRow) return fail('package');
      if (!packageRow.isActive) return fail('package_inactive');
      offeringPriceCents = packageRow.priceCents;
    } else {
      if (input.studioServiceId === null) return fail('service'); // refine-guaranteed; narrows for TS
      serviceId = input.studioServiceId;
      const [serviceRow] = await tx
        .select({
          id: studioServices.id,
          isActive: studioServices.isActive,
          priceCents: studioServices.priceCents,
        })
        .from(studioServices)
        .where(eq(studioServices.id, serviceId));
      if (!serviceRow) return fail('service');
      if (!serviceRow.isActive) return fail('service_inactive');
      const [bookable] = await tx
        .select({ id: branchStudioServices.id })
        .from(branchStudioServices)
        .where(
          and(
            eq(branchStudioServices.studioServiceId, serviceId),
            eq(branchStudioServices.branchId, input.branchId)
          )
        )
        .limit(1);
      if (!bookable) return fail('service_not_bookable_at_branch');
      offeringPriceCents = serviceRow.priceCents;
    }

    const addonRows =
      input.addonServiceIds.length > 0
        ? await tx
            .select({
              id: addonServices.id,
              name: addonServices.name,
              priceCents: addonServices.priceCents,
              isActive: addonServices.isActive,
            })
            .from(addonServices)
            .where(inArray(addonServices.id, input.addonServiceIds))
        : [];

    if (addonRows.length !== input.addonServiceIds.length) return fail('addon');
    if (addonRows.some((a) => !a.isActive)) return fail('addon_inactive');

    // Service bookings accept only matrix-linked add-ons (ticket 03); the
    // package path never consults the matrix (uniform all-active rule,
    // unchanged). Requested ids are deduped by the create schema, so the
    // linked subset's length against the requested length is a sound
    // membership check.
    if (serviceId !== null && addonRows.length > 0) {
      const linkedRows = await tx
        .select({ addonServiceId: studioServiceAddonServices.addonServiceId })
        .from(studioServiceAddonServices)
        .where(
          and(
            eq(studioServiceAddonServices.studioServiceId, serviceId),
            inArray(studioServiceAddonServices.addonServiceId, input.addonServiceIds)
          )
        );
      if (linkedRows.length !== addonRows.length) return fail('addon_not_applicable');
    }

    const [appointment] = await tx
      .insert(appointments)
      .values({ ...input, bookedPriceCents: offeringPriceCents, notes: input.notes ?? null })
      .returning(appointmentProjection);
```

Update the JSDoc above `createAppointment` to exactly:

```ts
/**
 * Resolve the referenced rows and persist the Appointment with booking-time
 * price snapshots (M1.4; ticket 03 generalizes the offering). One
 * transaction wraps reference resolution and both inserts (Appointment +
 * add-on junction rows), so a failure anywhere leaves nothing behind — and
 * M3's Slot capacity check-then-insert can later join this same transaction
 * (ADR-0005). The offering is exactly one of a Service Package or a Studio
 * Service (the create schema's refine dispatches the path): the service
 * path adds activity, bookability-at-branch, and add-on-matrix checks; the
 * past-datetime floor applies to both paths before offering resolution.
 * Reference resolution is validation: a rejection returns a typed failure
 * whose `message` is the caller-facing wording (module-owned; the route
 * forwards it verbatim). The client never supplies a price — snapshots
 * come from the resolved rows. ADR-0011 untouched: `db` is the per-request
 * handle; the transaction lives inside this one request (verified over the
 * live pooler — ADR-0007 amendment).
 */
```

- [ ] **Step 8: Run the full apps/api suite to green**

Run: `docker compose up -d db && pnpm --filter @sevendays/api test`
Expected: ALL files PASS — `appointments.test.ts` with the 14 new tests green, `studio-services.test.ts` green with the amended 2-row list, every other suite untouched-green.

- [ ] **Step 9: Typecheck, biome, commit**

```bash
pnpm --filter @sevendays/api typecheck
pnpm exec biome check --write apps/api/src/services/appointments.ts apps/api/test/appointments.test.ts apps/api/test/helpers/fixtures.ts apps/api/test/studio-services.test.ts
git add apps/api
git commit -m "feat(api): M2 ticket 03 — studio-service intake path, matrix add-on rule, past_datetime floor" -m "- service path joins the one intake transaction: unknown → inactive → bookable-at-branch
- service bookings accept only matrix-linked add-ons (addon_not_applicable); linked-but-inactive still rejects addon_inactive (activity before matrix — owner ruling)
- floor lives in the module, not the schema: instant comparison (PH fixed UTC+8), at-or-before-now rejects, typed past_datetime with owner-ratified wording
- REJECTION_MESSAGES 5→10 reasons, route untouched (verbatim forwarding); fixture dates now-relative (clock-proof)"
```

---

### Task 2: Regression sweep + full gate (no new code)

**Files:**
- Modify (only on a sweep collision): the affected `apps/api/test/*.test.ts` file (now-relative date pattern; none expected)

**Interfaces:**
- Consumes: Task 1's landed `createAppointment` (signature unchanged, `CreateAppointmentResult` shape unchanged, ten typed reasons).
- Produces: nothing — this task is the ticket-04-suite regression proof + the full-repo gate, and its evidence line for the final report.

**Not here:** no new tests beyond the sweep additions below, no docs edits (Task 3), no client/mock/types work.

- [ ] **Step 1: Sweep the ticket-04 suites for floor/fixture collisions** — the floor now applies to every POST through the intake. `packages/api-client/test/loopback.test.ts` runs against the in-memory mock (no floor — UNTOUCHED, pinned future date 2026-10-01 is fine). But the remaining `apps/api` suites could post future dates through the REAL intake: run first, read the result.

```bash
pnpm --filter @sevendays/api test
```

Expected: all test files green — 7 today (6 in `apps/api/test/` + `group-children.test.ts` in `src/services/`); this ticket adds none beyond Task 1's. If any suite POSTs an appointment with a past or too-close date through the real intake, it fails here — fix THAT suite's date to the `FUTURE_ISO()`/`futureDate()` pattern (the helper block above `payload` in `apps/api/test/appointments.test.ts` is the reference); do not weaken the floor. Ticket-04's suites (`studio-services.test.ts`, `service-packages.test.ts`, `branches.test.ts`) don't POST appointments — verified pre-plan.

- [ ] **Step 2: Full repo gate**

```bash
pnpm check
```

Expected: green (lint + format + typecheck + test across every workspace). Known-Gap carve-outs don't apply (no new packages were touched — `apps/api` only). If `pnpm format` fails in `apps/api`, `pnpm --filter @sevendays/api format` and re-run (Biome ordering vs the plan's hand layout can differ; the gate is the source of truth, not this plan's layout).

- [ ] **Step 3: Build gate**

```bash
pnpm build
```

Expected: green (no packaging changes — the api emits as before; this proves the module compiles standalone).

- [ ] **Step 4: Commit (empty commit is allowed only if nothing changed — skip silently otherwise)**

```bash
git status --porcelain
```

If (and only if) the sweep or the gates changed files, commit them:

```bash
git add -A && git commit -m "test(api): M2 ticket 03 — regression sweep green under the service-path floor" -m "- full pnpm check + pnpm build green
- any sibling suite collision fixed by now-relative dates, floor untouched"
```

---

### Task 3: Close-out — docs, checkboxes, graphify, handoff

**Files:**
- Modify: `docs/progress.md`
- Modify: `docs/plan.md`

**Interfaces:**
- Consumes: Tasks 1–2 landed and green.
- Produces: the shared M2 roadmap checkboxes ticked; progress.md tells the next session exactly what is and is not landed; the repo handed off clean (unpushed branch, no issue edits).

**Not here:** no code changes; no GitHub issue edits (owner's); no push/PR (owner's).

- [ ] **Step 1: Tick the two roadmap checkboxes** — `docs/plan.md`. Find (line 63):

```markdown
- [ ] API: `GET /api/v1/studio-services` (with embedded `bookableBranchIds`), `GET /api/v1/service-packages/:slug`, public `GET /api/v1/appointments/:id` (same posture as the list until M4 closes both); `POST /api/v1/appointments` generalized — exactly-one offering, service active + bookable-at-branch, add-on applicability on service bookings, all inside the existing intake transaction
```

Replace with (exact wording preserved, tick + dated note appended):

```markdown
- [✅] API: `GET /api/v1/studio-services` (with embedded `bookableBranchIds`), `GET /api/v1/service-packages/:slug`, public `GET /api/v1/appointments/:id` (same posture as the list until M4 closes both); `POST /api/v1/appointments` generalized — exactly-one offering, service active + bookable-at-branch, add-on applicability on service bookings, all inside the existing intake transaction _(2026-09-08: ticket 04 (#42) landed the three reads + client wrappers; ticket 03 (#41) landed the service-path intake + typed rejections + floor — service path joins the one intake transaction (unknown → inactive → bookable-at-branch), service bookings accept only matrix-linked add-ons (activity-before-matrix owner ruling), `past_datetime` floor in the intake module (schema stays shape-only), REJECTION_MESSAGES 5→10 with module-owned wordings; both tickets compose-proven, full gate green.)_
```

Find (line 64):

```markdown
- [ ] Form + API reject past dates/times — typed `past_datetime` rejection in the intake module (`createAppointmentSchema` stays shape-only); all external input validated with `packages/types` Zod schemas
```

Replace with:

```markdown
- [✅] Form + API reject past dates/times — typed `past_datetime` rejection in the intake module (`createAppointmentSchema` stays shape-only); all external input validated with `packages/types` Zod schemas _(2026-09-08: landed with ticket 03 (#41) — at-or-before-now instant comparison in the intake transaction, mocked-clock tests prove the boundary both sides; wording owner-ratified.)_
```

- [ ] **Step 2: Update `docs/progress.md`** — two edits.

Update the `_Last updated:` line (line 3) to:

```markdown
_Last updated: 2026-09-08 (M2 ticket 03 — service-path intake + typed rejections + `past_datetime` floor landed; the M2 API + past-dates checkboxes ticked. Prior 2026-09-07: docs-only — M2 booking-flow spec published (#37); prior 2026-09-08: M2 ticket 04 read endpoints.)_
```

Append to the "What Exists" list (after the ticket-02 bullet, keeping the numbered-candidate blocks above intact):

```markdown
- **M2 ticket 03 — service-path intake + typed rejections + `past_datetime` floor (#41 → .scratch/m2-booking-flow-tickets/03.md):** the generalized intake module books Studio Services inside the same transaction: service resolved unknown → `service`, inactive → `service_inactive`, absent bookability junction row for the chosen branch → `service_not_bookable_at_branch`; service bookings accept only matrix-linked add-ons (`addon_not_applicable`) — linked-but-inactive still rejects `addon_inactive` (activity-before-matrix, owner ruling); package bookings keep exactly the five original rules and never consult the matrix. Floor = instant comparison in the module (`scheduledAt` at-or-before now → `past_datetime`; PH fixed UTC+8, no tz arithmetic; `createAppointmentSchema` stays shape-only). `REJECTION_MESSAGES` 5→10 reasons; wordings owner-ratified 2026-09-08 (`'Your chosen schedule is already in the past. Please pick a future date and time.'`, `"That service isn't offered at the branch you picked."`, `"That add-on doesn't apply to the service you picked."`); routes untouched (thin, verbatim forwarding); error shape unchanged (`apiErrorSchema`). Fixture hygiene: all future timestamps now-relative (`FUTURE_ISO()`/`futureDate()`), the 2026-09-10 rot avoided; floor boundary proven with mocked clock (at-or-before-now rejects; one second after accepts) at both the module and HTTP seams. 14 new tests; `pnpm check` + `pnpm build` green. NOT landed: landing pages / booking form / confirmation page / Resend email (tickets 05–10); api-client mock intentionally NOT extended — the client contract is unchanged, the form maps reasons to copy in ticket 05. `docs/plan.md`'s M2 API + past-dates checkboxes ticked at close-out (ticket 04 had landed 2026-09-08).
```

- [ ] **Step 3: Keep the graph current** — `graphify update .` (AST-only, no API cost).

- [ ] **Step 4: Stop here — handoff.** Do NOT push, do NOT open a PR, do NOT tick GitHub issue #41's boxes (owner's — note the AC→task mapping in the PR description when the owner opens it: AC1 = Task 1's module+HTTP 201 tests, AC2 = the five rejection-test groups (both/neither, inactive service, not-bookable, non-applicable add-on, past `scheduledAt`), AC3 = Task 1's verbatim-forwarding tests + the untouched-route claim in the plan). The branch `feat/m2-03-service-path-intake` carries 2 commits; the owner pushes/merges. Do NOT create `.superpowers/sdd/` workspace here — that's the executing skill's job at dispatch time.

