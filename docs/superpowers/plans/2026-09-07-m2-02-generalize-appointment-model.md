# M2 Ticket 02 — Generalize the Appointment Model (schema, Zod, call sites) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The appointment model carries either offering — nullable `service_package_id`/`studio_service_id` with a table CHECK enforcing exactly-one, and the snapshot column renamed `package_price_cents` → `booked_price_cents` (`bookedPriceCents` in Drizzle/types) — mirrored by generalized Zod schemas in `packages/types`, with the existing package-only booking path green end to end (the expand half of expand–contract; GitHub issue #40, parent spec #37).

**Architecture:** One generated migration (`0004`) reshapes the zero-row `appointments` table — both offering refs nullable, a `CHECK` constraint whose SQL is the textual mirror of the Zod refine, and a column rename (no backfill needed at zero rows). The exactly-one rule is written ONCE per side and pinned on both: a shared check function + message constant in `packages/types` (used by all three schema refinements) and one named constraint in SQL. Call sites (intake projection, fixtures, api-client mock, M1.5 probe scripts) get exact edits; route handlers are untouched — the 400 path is already schema/refine-generic.

**Tech Stack:** Drizzle ORM ^0.45.2 (pg-core `check()`, drizzle-kit generate/migrate), Zod ^4.5.1 (v4 top-level `z.uuid()`; refine-terminal chain rule), tsx/postgres-js scripts, Vitest (unit + real-Postgres integration per ADR-0008), Supabase session-mode pooler for live ops, compose `postgres:17` for integration suites.

**Spec:** `docs/specs/2026-09-07-m2-booking-flow-spec.md` (§ Schema changes, § Solution) + ticket `.scratch/m2-booking-flow-tickets/02.md` (= GitHub issue #40, parent #37). The plan argues from the spec; executors read both.

## Global Constraints

- **Feature branch only:** all work on `feat/m2-02-generalize-appointment-model`, branched from up-to-date `main`. Never commit directly to `main`; the owner pushes/merges.
- **Migrations are generated, never hand-edited:** `pnpm --filter @sevendays/db db:generate` produces every file in `packages/db/migrations/**`; `db:migrate` applies them. This ticket generates exactly one: `0004_*.sql`.
- **Why a single migration:** the two-migration backfill exists for NOT NULL/UNIQUE columns on *populated* tables. `appointments` has zero production rows (spec: "the table is young with zero production rows, so the rename is free now and never again"), so nullable refs + CHECK + rename land together in one generated migration. No backfill, no probe, no flip.
- **Live-DB gates:** run `cd packages/db && node --env-file=.env scripts/check-env.mjs` and confirm `GATE: PASS` before every live operation (`db:migrate`). Never print a connection string or any `.env` value. Never write test rows to the live DB (it is zero-row by design; the CHECK is proven on compose).
- **Zod v4 refine-terminal rule (verified pre-plan against zod 4.5.1/4.4.3):** `.omit()` THROWS on a refined object schema (`".omit() cannot be used on object schemas containing refinements"`), and refinements survive `.omit()`/`.extend()` only when chained in the right order. Therefore: every derived schema chains from the UNrefined field basis and attaches the exactly-one refine LAST. Never `.extend()` or `.omit()` a schema that already carries a refine.
- **The exactly-one rule is written once per side:** `hasExactlyOneAppointmentOffering` + `EXACTLY_ONE_APPOINTMENT_MESSAGE` in `packages/types/src/appointment.ts` (all three Zod refinements call it), and SQL `(service_package_id is null) <> (studio_service_id is null)` in the `appointments_offering_exactly_one` CHECK. Changing one means changing both — they are mirrors by design.
- **TDD assertions on parsed OUTPUT, not on parse rejection where z.object strips keys:** a create payload carrying a server-written field still parses (unknown keys are stripped) — assert the parsed create output lacks the field. Both/neither-offering cases DO fail the refine — assert failure + the shared message.
- **Blast radius is exact, not "existing tests will need updates":** every `packagePriceCents`/`package_price_cents` site gets its edit spelled out in a task — `apps/api/src/services/appointments.ts` (projection + insert), `apps/api/test/appointments.test.ts` (3 assertions + cap-loop insert), `apps/api/test/helpers/fixtures.ts` (+studio-service fixtures), `packages/api-client/test/mock-api.ts` (fixture + record + `studioServiceId: null`), `packages/api-client/test/loopback.test.ts` (1 assertion), `packages/db/scripts/verify-appointment-row.mjs` + `.d.mts` (column list + push lines + interface), `packages/db/src/verify-appointment-row.test.ts` (4 expected-fixture renames + the failed-label grep), `packages/db/scripts/rehearsal-fixture.mjs` (insert + JSON key).
- **`pnpm build:packages` after every change to `packages/types` or `packages/db` `src/`** — consumers resolve workspace packages from `dist/`; a stale `dist/` looks like a missing export or stale type.
- **Biome-clean commits:** `pnpm exec biome check --write <files>` on every created/modified code file before committing (project `fix` scripts call the `biome` bin).
- **`noUncheckedIndexedAccess` is on:** guard destructures (`const [row] = ...; if (!row) throw ...`), never `!`. In `apps/api/test/helpers/fixtures.ts` follow the file's existing bare-`.id` destructure style (it compiles today); in `apps/api/src/services/**` keep the existing guard style.
- **Scope fence (siblings share roadmap checkboxes):** ticket 02 delivers the DATA MODEL only. Not here: service-path intake rejections (activity/bookability/junction/past-datetime — #41), the three new read endpoints + client wrappers (#42), any route-handler edit, any new client method, any mock endpoint beyond the field rename. The generalized create schema makes a service-only payload *parse* — the intake module still only resolves package bookings until #41.
- **`docs/plan.md`'s M2 schema checkbox stays unticked** — it spans tickets 01 + 02 and is satisfied only when #41/#42 land; tick it with the ✅ emoji then. GitHub issue #40's acceptance-criteria boxes are the owner's to tick — note the mapping in the PR description, don't edit the issue.
- **Commit style:** unscoped conventional subjects, bullet bodies when wordy; one commit per task.
- **Compose for integration tests:** `docker compose up -d db` (postgres:17, `sevendays_test`); `apps/api`'s vitest global setup migrates via `@sevendays/db/migrate` and truncates; `packages/db` live probes need `TEST_DATABASE_URL` exported explicitly (they `skipIf` without it).

---

## File Structure

```
packages/types/src/appointment.ts                (mod) nullable offering refs + exactly-one refine + bookedPriceCents; shared check fn + message
packages/types/src/appointment.test.ts           (mod) generalized row/create tests (file rewrite; prior-art tests carried over)
packages/types/src/appointment-read.test.ts      (mod) base fixture rename + service-only fixture + both/neither rejects
packages/db/src/schema/appointments.ts           (mod) nullable refs + studioServices FK + named CHECK + column rename
packages/db/migrations/0004_*.sql                (generated — read it, never edit it)
apps/api/src/services/appointments.ts            (mod) projection generalizes (14 fields, bookedPriceCents) + insert values rename
apps/api/test/helpers/fixtures.ts                (mod) +one active +one inactive Studio Service (applicability rows too)
apps/api/test/appointments.test.ts               (mod) 3 field-rename edits + new db-level CHECK describe (2 tests)
packages/api-client/test/mock-api.ts             (mod) fixture + POST record rename + studioServiceId: null
packages/api-client/test/loopback.test.ts        (mod) one assertion rename
packages/db/scripts/verify-appointment-row.mjs   (mod) probe column list + push lines generalize (nullable package ref)
packages/db/scripts/verify-appointment-row.d.mts (mod) probe expected-shape: bookedPriceCents, nullable servicePackageId, optional studioServiceId
packages/db/scripts/rehearsal-fixture.mjs        (mod) insert columns + JSON key rename
packages/db/src/verify-appointment-row.test.ts   (mod) probe-test expected fixtures renamed; failed-label grep matches bookedPriceCents
docs/progress.md                                 (mod) ticket-02 landed bullet
docs/adr/0012-exactly-one-booked-offering.md     (new) the two-sided exactly-one ruling
```

Task map: 1 — `packages/types` generalized schemas (TDD); 2 — Drizzle migration 0004 (CHECK via the verified pg-core `check()` API), live apply; 3 — `apps/api` blast radius (module, fixtures, suite renames + CHECK tests), compose green; 4 — api-client + db probe scripts + probe-test fixtures, client/db suites + repo typecheck green; 5 — full gate, progress.md, ADR-0012, handoff.

---

### Task 1: packages/types — generalized appointment schemas (TDD)

**Files:**
- Modify: `packages/types/src/appointment.ts`
- Modify: `packages/types/src/appointment.test.ts` (file rewrite)
- Modify: `packages/types/src/appointment-read.test.ts`

**Interfaces:**
- Consumes: zod v4 object methods — chain order per Global Constraints: plain basis → `omit`/`extend` → refine LAST.
- Produces (later tasks and #41/#42 consume these exact names):
  - `appointmentSchema` / `Appointment` — nullable `servicePackageId`/`studioServiceId`, `bookedPriceCents`, refine-enforced exactly-one.
  - `createAppointmentSchema` / `CreateAppointmentInput` — offering refs `.nullable().default(null)`, `addonServiceIds` default `[]` (duplicate-rejecting), server-written fields omitted, exactly-one refine.
  - `appointmentWithAddonsSchema` / `AppointmentWithAddons` — the read shape with embedded add-ons, same refine.
  - `hasExactlyOneAppointmentOffering(v: { servicePackageId: string | null; studioServiceId: string | null }): boolean` and `EXACTLY_ONE_APPOINTMENT_MESSAGE: string` — Task 2's SQL CHECK mirrors this formula; tests import the constant.

**Not here:** no intake-module logic (it is generalized for the package path in Task 3; the service path is #41), no schema-file edit (Task 2), no client methods (#42).

- [ ] **Step 1: Cut the branch**

```bash
git checkout -b feat/m2-02-generalize-appointment-model
```

- [ ] **Step 2: Rewrite `packages/types/src/appointment.test.ts`** with exactly:

```ts
import { describe, expect, it } from 'vitest';
import {
  EXACTLY_ONE_APPOINTMENT_MESSAGE,
  appointmentSchema,
  createAppointmentSchema,
} from './appointment.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const OTHER_UUID = '00000000-0000-4000-8000-000000000001';

const packageRow = {
  id: UUID,
  branchId: UUID,
  servicePackageId: UUID,
  studioServiceId: null,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
  status: 'pending',
  kind: 'scheduled',
  bookedPriceCents: 90000,
  notes: null,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

const serviceRow = { ...packageRow, servicePackageId: null, studioServiceId: UUID };

const baseCreate = {
  branchId: UUID,
  servicePackageId: UUID,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
};

// No servicePackageId key at all — exercises the default(null) fill.
const serviceOnlyCreate = {
  branchId: UUID,
  studioServiceId: UUID,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
};

// Neither key — both refs default null, so the refine must reject.
const neitherCreate = {
  branchId: UUID,
  customerName: 'Juan Dela Cruz',
  customerEmail: 'juan@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-05T10:00:00.000Z',
};

describe('appointmentSchema (generalized — M2 ticket 02)', () => {
  it('parses a package-only row (service ref null)', () => {
    const result = appointmentSchema.safeParse(packageRow);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.studioServiceId).toBeNull();
  });

  it('parses a service-only row (package ref null)', () => {
    const result = appointmentSchema.safeParse(serviceRow);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.servicePackageId).toBeNull();
  });

  it('rejects both offering refs set', () => {
    const result = appointmentSchema.safeParse({ ...packageRow, studioServiceId: OTHER_UUID });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(EXACTLY_ONE_APPOINTMENT_MESSAGE);
    }
  });

  it('rejects a row with neither offering set', () => {
    const result = appointmentSchema.safeParse({ ...packageRow, servicePackageId: null });
    expect(result.success).toBe(false);
  });

  it('defaults kind to scheduled when omitted', () => {
    const { kind: _kind, ...withoutKind } = packageRow;
    const result = appointmentSchema.safeParse(withoutKind);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kind).toBe('scheduled');
  });

  it('accepts walk_in and visitation kinds', () => {
    for (const kind of ['walk_in', 'visitation'] as const) {
      const result = appointmentSchema.safeParse({ ...packageRow, kind });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown kind', () => {
    const result = appointmentSchema.safeParse({ ...packageRow, kind: 'pickup' });
    expect(result.success).toBe(false);
  });
});

describe('createAppointmentSchema (generalized — M2 ticket 02)', () => {
  it('accepts package-only and defaults the service ref to null', () => {
    const result = createAppointmentSchema.safeParse(baseCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.studioServiceId).toBeNull();
      expect(result.data.addonServiceIds).toEqual([]);
    }
  });

  it('accepts service-only without naming the package ref (defaults null)', () => {
    const result = createAppointmentSchema.safeParse(serviceOnlyCreate);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.servicePackageId).toBeNull();
  });

  it('rejects both offering refs set', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      studioServiceId: OTHER_UUID,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(EXACTLY_ONE_APPOINTMENT_MESSAGE);
    }
  });

  it('rejects a payload naming neither offering (both default null)', () => {
    const result = createAppointmentSchema.safeParse(neitherCreate);
    expect(result.success).toBe(false);
  });

  it('defaults kind to scheduled', () => {
    const result = createAppointmentSchema.safeParse(baseCreate);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kind).toBe('scheduled');
  });

  it('accepts walk_in with an add-on reference (prior art)', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      kind: 'walk_in',
      addonServiceIds: [UUID],
    });
    expect(result.success).toBe(true);
  });

  it('rejects duplicate add-on service ids (prior art)', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      addonServiceIds: [UUID, UUID],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed add-on id (prior art)', () => {
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      addonServiceIds: ['nope'],
    });
    expect(result.success).toBe(false);
  });

  it('strips a client-supplied price snapshot (server-written, renamed)', () => {
    // z.object strips unknown keys — the contract is that the server-written
    // snapshot never appears in the parsed create output (assert on output,
    // not on a supposed rejection).
    const result = createAppointmentSchema.safeParse({
      ...baseCreate,
      bookedPriceCents: 90000,
    });
    expect(result.success).toBe(true);
    if (result.success) expect('bookedPriceCents' in result.data).toBe(false);
  });
});
```

- [ ] **Step 3: RED** — `pnpm --filter @sevendays/types test` → FAIL: the import of `EXACTLY_ONE_APPOINTMENT_MESSAGE` fails to resolve (file-level error), and once that exists, the generalized-row and both/neither tests fail against the still-narrow `appointmentSchema` (`studioServiceCents`-era fields absent, both-set still parsed). The strip test may pass pre-implementation (unknown keys strip either way) — the resolve failure + the both/neither failures are the RED signal.

- [ ] **Step 4: GREEN — rewrite `packages/types/src/appointment.ts`** with exactly:

```ts
import { z } from 'zod';

export const appointmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

// How the session happens — recorded, not validated against a booking flow
// (walk-in booking and visitation flows are deferred features).
export const appointmentKindSchema = z.enum(['scheduled', 'walk_in', 'visitation']);

export type AppointmentKind = z.infer<typeof appointmentKindSchema>;

// M2 ticket 02 — the appointment carries EITHER offering. One check function:
// the Zod refinements below and the SQL CHECK in migration 0004
// (appointments_offering_exactly_one) encode this exact formula, so the
// schemas and the table cannot drift apart. NULL means "not booked" — the
// pairs (set, set) and (null, null) both fail.
export const EXACTLY_ONE_APPOINTMENT_MESSAGE =
  'Exactly one of servicePackageId and studioServiceId must be set.';

export function hasExactlyOneAppointmentOffering(v: {
  servicePackageId: string | null;
  studioServiceId: string | null;
}): boolean {
  return (v.servicePackageId === null) !== (v.studioServiceId === null);
}

export const appointmentFieldsSchema = z.object({
  id: z.uuid(),
  branchId: z.uuid(),
  servicePackageId: z.uuid().nullable(),
  studioServiceId: z.uuid().nullable(),
  customerName: z.string().min(1),
  customerEmail: z.email(),
  customerPhone: z.string().min(1),
  scheduledAt: z.coerce.date(),
  status: appointmentStatusSchema.default('pending'),
  kind: appointmentKindSchema.default('scheduled'),
  // Booking-time snapshot of the booked offering's price — written by the
  // server, never supplied by the client. Renamed from packagePriceCents
  // (M2 ticket 02): it now snapshots either offering kind.
  bookedPriceCents: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// zod v4 chain rule (verified against 4.5.1): .omit() throws on a refined
// object, so every derived schema chains from the UNrefined field basis and
// attaches the exactly-one refine LAST — refinements ride the terminal link.
export const appointmentSchema = appointmentFieldsSchema.refine(
  hasExactlyOneAppointmentOffering,
  { error: EXACTLY_ONE_APPOINTMENT_MESSAGE }
);

export type Appointment = z.infer<typeof appointmentSchema>;

const createAppointmentFieldsSchema = appointmentFieldsSchema
  .omit({
    id: true,
    status: true,
    bookedPriceCents: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Exactly one of the two refs must be non-null (refine below); the
    // unspecified one defaults to null, so a package-only payload never
    // names the service ref and vice versa.
    servicePackageId: z.uuid().nullable().default(null),
    studioServiceId: z.uuid().nullable().default(null),
    // Resolved against addon_services and price-snapshotted by the server
    // at booking time (M1.4). Package bookings accept any active add-on
    // (uniform rule); service bookings get the junction rule in ticket 03.
    addonServiceIds: z
      .array(z.uuid())
      .refine((ids) => new Set(ids).size === ids.length, {
        error: 'Duplicate add-on service ids are not allowed.',
      })
      .default([]),
    notes: z.string().nullable().optional(),
  });

export const createAppointmentSchema = createAppointmentFieldsSchema.refine(
  hasExactlyOneAppointmentOffering,
  { error: EXACTLY_ONE_APPOINTMENT_MESSAGE }
);

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  id: z.uuid(),
  status: appointmentStatusSchema,
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
```

- [ ] **Step 5: Extend `packages/types/src/appointment-read.test.ts`** — replace the import block with:

```ts
import { EXACTLY_ONE_APPOINTMENT_MESSAGE } from './appointment.js';
import { appointmentWithAddonsSchema } from './appointment-read.js';
```

replace the existing `base` fixture's offering/price lines (it now reads):

```ts
const base = {
  id: UUID,
  branchId: UUID,
  servicePackageId: UUID,
  studioServiceId: null,
  customerName: 'Ana Reyes',
  customerEmail: 'ana@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: '2026-09-10T10:00:00.000Z',
  status: 'pending',
  kind: 'scheduled',
  bookedPriceCents: 90000,
  notes: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};
```

and append at the end of the file:

```ts
const serviceOnly = { ...base, servicePackageId: null, studioServiceId: UUID, bookedPriceCents: 50000 };

describe('appointmentWithAddonsSchema (generalized — M2 ticket 02)', () => {
  it('parses a service-only record with embedded add-ons', () => {
    const result = appointmentWithAddonsSchema.safeParse({
      ...serviceOnly,
      addonServices: [{ addonServiceId: UUID, name: 'Makeup', priceCents: 12000 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects both offering refs set', () => {
    const result = appointmentWithAddonsSchema.safeParse({
      ...base,
      studioServiceId: OTHER_UUID,
      addonServices: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(EXACTLY_ONE_APPOINTMENT_MESSAGE);
    }
  });

  it('rejects a record with neither offering set', () => {
    const result = appointmentWithAddonsSchema.safeParse({
      ...base,
      servicePackageId: null,
      addonServices: [],
    });
    expect(result.success).toBe(false);
  });
});
```

Note: this file needs `OTHER_UUID` too — declare it next to `UUID` at the top:

```ts
const UUID = '00000000-0000-4000-8000-000000000000';
const OTHER_UUID = '00000000-0000-4000-8000-000000000001';
```

- [ ] **Step 6: GREEN + rebuild** — `pnpm --filter @sevendays/types test` → PASS (12 new/kept appointment tests + the 3 new read-shape tests). Then:

```bash
pnpm build:packages && pnpm --filter @sevendays/types typecheck
```

Expected: green. **Consumers (`apps/api`, `packages/api-client`) now typecheck-fail** until Tasks 3–4 rename their call sites — that is the planned blast radius, not a defect. (Their suites still pass at this instant only because their `dist/`-facing code is typechecked separately; do not run consumer suites yet.)

- [ ] **Step 7: Commit**

```bash
pnpm exec biome check --write packages/types/src/appointment.ts packages/types/src/appointment.test.ts packages/types/src/appointment-read.test.ts
git add packages/types/src/appointment.ts packages/types/src/appointment.test.ts packages/types/src/appointment-read.test.ts
git commit -m "feat(types): generalized appointment schemas — nullable offering refs, exactly-one, bookedPriceCents" -m "- appointmentSchema/createAppointmentSchema/appointmentWithAddonsSchema carry either offering (exactly-one refine over a shared check fn + message)
- create refs nullable with default(null): a package-only payload never names the studio-service ref and vice versa
- packagePriceCents → bookedPriceCents on the read shape; create shape keeps omitting the server-written snapshot
- prior-art tests carried over (kind defaults, duplicate/malformed add-ons, strip-on-output snapshot)
- zod v4 chain rule verified pre-plan: refine is the terminal op — .omit() on a refined object throws (4.5.1)
- consumers typecheck-fail until the call-site wave (tasks 3-4) — planned blast radius"
```

---

### Task 2: Drizzle — nullable refs + exactly-one CHECK + rename (migration 0004)

**Files:**
- Modify: `packages/db/src/schema/appointments.ts`
- Generated: `packages/db/migrations/0004_*.sql` (+ `meta/_journal.json`, `meta/0004_snapshot.json`)

**Interfaces:**
- Consumes: `studioServices` (schema barrel — ticket 01's table, FK target).
- Produces: `appointments.servicePackageId: string | null`, `appointments.studioServiceId: string | null`, `appointments.bookedPriceCents: number`, and the DB constraint `appointments_offering_exactly_one` — the SQL mirror of Task 1's refine. Tasks 3–4 and #41/#42 consume these column names.

**Not here:** no `service_packages`/`studio_services` edits, no seed changes, no junction tables (ticket 01 owns them), no data backfill (zero rows).

- [ ] **Step 1: Rewrite `packages/db/src/schema/appointments.ts`** with exactly:

```ts
import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { branches } from './branches.js';
import { servicePackages } from './service-packages.js';
import { studioServices } from './studio-services.js';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

// How the session happens (scheduled, walk-in, visitation) — recorded only;
// the walk-in booking and visitation flows are deferred features.
export const appointmentKindEnum = pgEnum('appointment_kind', [
  'scheduled',
  'walk_in',
  'visitation',
]);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    // The appointment carries EITHER offering (M2 ticket 02): nullable refs
    // + the appointments_offering_exactly_one CHECK below. NULL means "not
    // booked" — the CHECK rejects both-set and neither alike, mirroring the
    // Zod refine in packages/types/src/appointment.ts (one formula, two
    // sides — changing one means changing both).
    servicePackageId: uuid('service_package_id').references(() => servicePackages.id),
    studioServiceId: uuid('studio_service_id').references(() => studioServices.id),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    status: appointmentStatusEnum('status').notNull().default('pending'),
    kind: appointmentKindEnum('kind').notNull().default('scheduled'),
    // Booking-time snapshot of the booked offering's price — the quoted
    // price survives later catalog price changes. Server-written at booking
    // (M1.4). Renamed from package_price_cents (M2 ticket 02): it now
    // snapshots either offering kind.
    bookedPriceCents: integer('booked_price_cents').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // FK lookup indexes (M1.2 review ruling): M1.4 lists by branch, joins
    // package; the studio-service side joins once ticket 04's reads need it.
  },
  (table) => [
    index('appointments_branch_id_idx').on(table.branchId),
    index('appointments_service_package_id_idx').on(table.servicePackageId),
    // Exactly one of the two offering refs is set. The SQL formula is the
    // literal mirror of hasExactlyOneAppointmentOffering in
    // packages/types/src/appointment.ts: (a is null) <> (b is null) is true
    // iff exactly one of the two is NULL.
    check('appointments_offering_exactly_one', sql`
      (appointments.service_package_id is null) <> (appointments.studio_service_id is null)
    `),
  ]
);
```

Note the import sources: `check` joins `drizzle-orm/pg-core` and `sql` is imported from the root barrel (both lines are in the block above). Export locations are split: dialect helpers only live in pg-core; the `sql` template tag only in the root barrel — wrong-source imports fail typecheck. The bare table-qualified column references (`appointments.service_package_id`) keep the constraint's SQL stable across drizzle-kit's aliasing.

- [ ] **Step 2: Generate migration 0004** (offline — no DB connection needed):

```bash
pnpm --filter @sevendays/db db:generate
```

Expected: drizzle-kit writes `0004_*.sql` (+ journal + snapshot). **Read the generated file** (reading is required; editing is forbidden) and confirm it contains, for `appointments` ONLY: `ALTER COLUMN "service_package_id" DROP NOT NULL`, `ADD COLUMN "studio_service_id" uuid`, `RENAME COLUMN "package_price_cents" TO "booked_price_cents"`, a `FOREIGN KEY ("studio_service_id") REFERENCES` on the studio-services table, and `ADD CONSTRAINT "appointments_offering_exactly_one" CHECK`. No other table may change; no `DROP COLUMN` may appear; no data statements (`UPDATE`/`DELETE`) may appear. Drizzle may express the drop-not-null or the FK in a slightly different textual form — judge the CONTENT, not the wording. If the generated SQL renames the column by dropping and re-adding it instead of `RENAME COLUMN` (drizzle-kit's rename detection can miss), that is acceptable at zero rows — but flag it in the commit body.

- [ ] **Step 3: Apply to the live DB**

```bash
cd packages/db && node --env-file=.env scripts/check-env.mjs   # expect GATE: PASS
cd ../.. && pnpm --filter @sevendays/db db:migrate
```

Expected: `0004_…` applied. Structural probe:

```bash
cd packages/db && node --env-file=.env scripts/db-state.mjs
```

Expected: table list unchanged (13 tables); `appointments` count stays 0. **Do not** seed, probe, or write any row to the live DB — the CHECK's behavior is proven on compose in Task 3, never by writing to the zero-row live table.

- [ ] **Step 4: Rebuild dists; confirm the blast radius is exactly Tasks 3–4**

```bash
pnpm build:packages
pnpm --filter @sevendays/db typecheck
```

Expected: db package typecheck GREEN (its own src is self-consistent; `verify-appointment-row.test.ts` still compiles — its `.d.mts` contract is renamed in Task 4).

```bash
pnpm --filter @sevendays/api typecheck; pnpm --filter @sevendays/api-client typecheck
```

Expected: FAIL with EXACTLY the planned call-site errors — `apps/api/src/services/appointments.ts` (the projection's `packagePriceCents` + the insert's `.values`), `apps/api/test/appointments.test.ts` (the cap-loop insert values + the module-seam `result.record.packagePriceCents` assertion — the `res.json()`-based assertions are untyped and compile fine; they are RUNTIME failures caught in Task 3's suite run), `packages/api-client/test/loopback.test.ts` (the `record.packagePriceCents` assertion on the typed `AppointmentWithAddons`). The mock's fixture/record fields in `packages/api-client/test/mock-api.ts` compile fine (inferred object literals) and fail only at Zod-parse time in Task 4's suite run — that is why they are renamed there. Any OTHER compile error means the schema edit broke something unplanned — stop and fix the cause before proceeding.

- [ ] **Step 5: Commit**

```bash
pnpm exec biome check --write packages/db/src/schema/appointments.ts
git add packages/db/src/schema/appointments.ts packages/db/migrations/
git commit -m "feat(db): generalize appointments — nullable offering refs, exactly-one CHECK, booked_price_cents rename (migration 0004)" -m "- service_package_id drops NOT NULL; nullable studio_service_id FK joins the table
- appointments_offering_exactly_one: (a is null) <> (b is null) — the SQL mirror of packages/types' hasExactlyOneAppointmentOffering
- package_price_cents renamed booked_price_cents in the same migration (zero production rows — the rename is free now, never again)
- single generated migration: the two-migration backfill exists for populated tables; appointments has none
- live apply gate-passed; db-state probe: 13 tables, appointments still 0 rows"
```

(Repo typecheck stays red in `apps/api`/`packages/api-client` until Tasks 3–4 — the planned call-site wave, consumed in dependency order. Each task's own touched packages pass their checks.)

---

### Task 3: apps/api — intake module + fixtures + integration suite on the renamed shape

**Files:**
- Modify: `apps/api/src/services/appointments.ts`
- Modify: `apps/api/test/helpers/fixtures.ts`
- Modify: `apps/api/test/appointments.test.ts`

**Interfaces:**
- Consumes: Task 1's `CreateAppointmentInput` (nullable offering refs, `bookedPriceCents` gone from the create shape) and Task 2's `appointments` columns (`studioServiceId`, `bookedPriceCents`).
- Produces: `createAppointment` / `listAppointments` on the generalized row shape (the 14-field projection, offering refs nullable, `bookedPriceCents`); `FixtureIds.servicePortrait` (one active Studio Service) for the CHECK test. The five typed rejections and their messages are UNCHANGED — #41 extends `REJECTION_MESSAGES`, not this task.

**Not here:** no service-path resolution (service-only payloads still take the package path and reject `Unknown servicePackageId.` until #41), no route-handler edit (the 400 path is schema-generic already), no new rejection reasons.

- [ ] **Step 1: Generalize `apps/api/src/services/appointments.ts`** — three edits:

(a) The projection — replace the `servicePackageId` line and the `packagePriceCents` line so the const reads (comment above it updated: "The one Appointment projection (13 columns)" becomes "The one Appointment projection (14 columns)"):

```ts
const appointmentProjection = {
  id: appointments.id,
  branchId: appointments.branchId,
  servicePackageId: appointments.servicePackageId,
  studioServiceId: appointments.studioServiceId,
  customerName: appointments.customerName,
  customerEmail: appointments.customerEmail,
  customerPhone: appointments.customerPhone,
  scheduledAt: appointments.scheduledAt,
  status: appointments.status,
  kind: appointments.kind,
  bookedPriceCents: appointments.bookedPriceCents,
  notes: appointments.notes,
  createdAt: appointments.createdAt,
  updatedAt: appointments.updatedAt,
} as const;
```

(b) The insert — replace the `.values(...)` line with:

```ts
      .values({ ...input, bookedPriceCents: packageRow.priceCents, notes: input.notes ?? null })
```

(c) A null-ref guard — directly above the `const [packageRow] = await tx` select, insert:

```ts
    // M2 ticket 02 interim: the generalized input admits a service-only
    // payload, but the package path still owns this write seam until
    // ticket 03 generalizes intake. A null package ref resolves to no row
    // → the typed 'package' rejection (400), never a 500.
    if (input.servicePackageId === null) return fail('package');
```

(The guard also fixes the type of `input.servicePackageId` from `string | null` to `string` for the `eq` below it.)

- [ ] **Step 2: Add one active Studio Service to `apps/api/test/helpers/fixtures.ts`** — four small edits:

(a) The dynamic-import destructure gains `studioServices` (alphabetical, after `servicePackages`):

```ts
  const {
    branches,
    printSizes,
    attires,
    addonServices,
    servicePackages,
    studioServices,
    frames,
    packageInclusions,
    packageInclusionAttires,
  } = await import('@sevendays/db');
```

(b) `FixtureIds` gains one line after `addonRetired`:

```ts
  addonRetired: string;
  servicePortrait: string;
```

(c) After the `addonRetired` insert block (before the packages), insert:

```ts
  // M2 ticket 02: one active Studio Service — the db-level exactly-one CHECK
  // test needs a second offering to attempt a both-set insert. Ticket 03's
  // plan adds the inactive service + applicability-matrix fixtures its
  // rejection tests need; nothing else consumes rows here.
  const [servicePortrait] = await db
    .insert(studioServices)
    .values({
      name: 'Portraits & ID Photo',
      description: 'Studio portraits and ID photos.',
      priceCents: 50000,
      isActive: true,
    })
    .returning({ id: studioServices.id });
```

(d) The return object gains `servicePortrait: servicePortrait.id,` after `addonRetired`.

- [ ] **Step 3: Rename the three field assertions + the cap-loop insert in `apps/api/test/appointments.test.ts`** — `packagePriceCents` → `bookedPriceCents` at:

- the POST persist test: `expect(body.bookedPriceCents).toBe(150000);`
- the cap-loop insert values: `bookedPriceCents: 150000,`
- the module-seam commit test: `expect(result.record.bookedPriceCents).toBe(150000);`

Nothing else in the file changes its behavior — every existing test posts a package-only payload, which the generalized schema still accepts identically.

- [ ] **Step 4: Add the db-level CHECK describe** — at the end of `apps/api/test/appointments.test.ts`, after the module-seam describe, append (imports: `appointments as appointmentsTable` is already imported at the top of the file):

```ts
// The DB-enforced half of exactly-one (M2 ticket 02): the schema-level
// refine and the intake checks are client-side; these inserts go straight
// to the table and prove the appointments_offering_exactly_one CHECK
// rejects both-set and neither at the storage layer (spec user story 31).
describe('appointments offering CHECK (db-level)', () => {
  const baseValues = {
    branchId: ids.branchA,
    customerName: 'Check Probe',
    customerEmail: 'check@example.com',
    customerPhone: '+63 917 000 0000',
    scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
    bookedPriceCents: 150000,
  };

  it('rejects an insert with both offering refs set', async () => {
    await expect(
      db
        .insert(appointmentsTable)
        .values({
          ...baseValues,
          servicePackageId: ids.packageCombined,
          studioServiceId: ids.servicePortrait,
        })
        .returning({ id: appointmentsTable.id })
    ).rejects.toThrow(/appointments_offering_exactly_one/);
  });

  it('rejects an insert with neither offering ref set', async () => {
    await expect(
      db
        .insert(appointmentsTable)
        .values(baseValues)
        .returning({ id: appointmentsTable.id })
    ).rejects.toThrow(/appointments_offering_exactly_one/);
  });
});
```

(These inserts sit inside the suite's truncate-between-tests cycle — failed inserts insert nothing; successful ones are truncated by the next `beforeEach`.)

- [ ] **Step 5: Typecheck + compose suites**

```bash
pnpm --filter @sevendays/api typecheck
docker compose up -d db        # wait for healthy: docker compose ps
pnpm --filter @sevendays/api test
```

Expected: typecheck green. All api suites green on compose — the appointments file gains 2 CHECK tests, every pre-existing test passes unchanged (package-only path is bit-identical: same 201 shapes with `bookedPriceCents` in place of `packagePriceCents`, same five typed rejections).

- [ ] **Step 6: Commit**

```bash
pnpm exec biome check --write apps/api/src/services/appointments.ts apps/api/test/helpers/fixtures.ts apps/api/test/appointments.test.ts
git add apps/api/src/services/appointments.ts apps/api/test/helpers/fixtures.ts apps/api/test/appointments.test.ts
git commit -m "feat(api): appointment intake + suites on the generalized row shape" -m "- projection gains studioServiceId, packagePriceCents → bookedPriceCents (14 fields)
- insert spreads the generalized input; null package ref guards to the typed 'package' rejection (400, not 500) until ticket 03 owns the service path
- fixtures gain one active Studio Service (Portraits & ID Photo) for the db-level CHECK test
- db-level exactly-one proven on compose: both-set and neither inserts rejected by appointments_offering_exactly_one
- package-only path bit-identical: same 201 shapes and five typed rejections under the renamed snapshot field"
```

---

### Task 4: api-client + M1.5 probe tooling — rename and nullable package ref

**Files:**
- Modify: `packages/api-client/test/mock-api.ts`
- Modify: `packages/api-client/test/loopback.test.ts`
- Modify: `packages/db/scripts/verify-appointment-row.mjs` + `verify-appointment-row.d.mts`
- Modify: `packages/db/src/verify-appointment-row.test.ts`
- Modify: `packages/db/scripts/rehearsal-fixture.mjs`

**Interfaces:**
- Consumes: Task 1's `AppointmentWithAddons` (`studioServiceId: string | null`, `bookedPriceCents`).
- Produces: client suites on the generalized shape; the M1.5 probe contract (`assertAppointmentRecord`'s expected shape) carries the new column set. Nothing downstream imports the probe scripts except their test.

**Not here:** no new client wrapper methods (#42), no new mock endpoints (a `GET /:id` mock is ticket 04's surface, not a rename), no intake logic.

- [ ] **Step 1: Update the api-client mock** — in `packages/api-client/test/mock-api.ts`, two edits:

(a) `APPOINTMENTS` fixture — add the null service ref directly below the `servicePackageId` line, and rename the snapshot field:

```ts
    servicePackageId: '44444444-4444-4444-8444-444444444444',
    studioServiceId: null,
```

```ts
    bookedPriceCents: 250000,
```

(b) The POST handler's record assembly — the same two changes inside `const record`:

```ts
        servicePackageId: input.servicePackageId,
        studioServiceId: input.studioServiceId,
```

```ts
        bookedPriceCents: 250000,
```

(Every other line of the record — the `addonServices` mapping included — stays as-is. The loopback `create` input stays package-only, so the mock's `input.servicePackageId` path is unchanged.)

- [ ] **Step 2: Rename the one field assertion in `packages/api-client/test/loopback.test.ts`** — in `appointments.create returns the created record with add-ons (201)`:

```ts
  expect(record.bookedPriceCents).toBe(250000); // server snapshot, not caller input
```

- [ ] **Step 3: Generalize `packages/db/scripts/verify-appointment-row.mjs`** — two edits:

(a) The probe select's column list:

```js
  const rows = await sql`
    select id, branch_id, service_package_id, studio_service_id, customer_name, customer_email,
           customer_phone, scheduled_at, status, kind, booked_price_cents,
           notes, created_at, updated_at
    from appointments
    where id = ${expected.id}`;
```

(b) The push lines — the `servicePackageId` and `packagePriceCents` pushes are replaced by:

```js
  if (expected.servicePackageId !== undefined) {
    push('servicePackageId', row.service_package_id, expected.servicePackageId);
  }
  if (expected.studioServiceId !== undefined) {
    push('studioServiceId', row.studio_service_id, expected.studioServiceId);
  }
  push('bookedPriceCents', row.booked_price_cents, expected.bookedPriceCents);
```

Why guarded: the probe asserts a shape callers may partially specify — package-only expectations (all of today's callers) omit `studioServiceId`, so an unguarded push would turn every old expectation into a null-vs-id mismatch. Same optional-push pattern the file already uses for `customerPhone`/`notes`. A service-only confirm run (ticket 03's end-to-end) supplies `servicePackageId: null` explicitly, which pushes and asserts the null. The label `bookedPriceCents` is what Step 5's failed-label grep matches.

- [ ] **Step 4: Update `packages/db/scripts/verify-appointment-row.d.mts`** — the expected-shape interface becomes (only these three members change; the rest of the file stays):

```ts
export interface AppointmentProbeExpected {
  id: string;
  branchId: string;
  servicePackageId?: string | null;
  studioServiceId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string | null;
  kind: string;
  status: string;
  bookedPriceCents: number;
  scheduledAt?: string;
  addonServices?: AppointmentProbeAddon[];
}
```

- [ ] **Step 5: Rename the probe test's expectations in `packages/db/src/verify-appointment-row.test.ts`** — four content-matched edits (line numbers are pre-edit):

- the confirm-mode expected object: `packagePriceCents: 150000,` → `bookedPriceCents: 150000,`
- the mismatch-mode expected object: `packagePriceCents: 999999,` → `bookedPriceCents: 999999,`
- the failed-label assertion: `expect(failedLabels).toContain('packagePriceCents')` → `expect(failedLabels).toContain('bookedPriceCents')`
- the missing-row expected object: `packagePriceCents: 0,` → `bookedPriceCents: 0,`

(Every expected object keeps supplying `servicePackageId` — still valid under the optional/nullable interface.)

- [ ] **Step 6: Update `packages/db/scripts/rehearsal-fixture.mjs`** — the appointment insert becomes:

```js
await sql`
  insert into appointments
    (branch_id, service_package_id, studio_service_id, customer_name, customer_email, customer_phone,
     scheduled_at, status, kind, booked_price_cents, notes)
  values (${branch.id}, ${pkg.id}, NULL, 'M1.5 Rehearsal', 'rehearsal@example.com', '+63 900 000 000',
          '2026-10-01 09:00:00+08', 'pending', 'scheduled', 99000, 'rehearsal')
  returning id`;
```

and the returned JSON's `packagePriceCents: 99000,` becomes `bookedPriceCents: 99000,`.

- [ ] **Step 7: Prove the rename is total** — from the repo root:

```bash
rg -n 'packagePriceCents|package_price_cents' -g '!docs/**' .
```

Expected: NO output (rg exits 1 — acceptable here; any hit outside `docs/` means the rename is incomplete: stop and finish it). `docs/progress.md`'s M1.5 history bullet and `docs/plan.md`'s M2 schema checkbox line keep the old name deliberately — history records what shipped; the box stays unticked per Global Constraints. (`rg` respects .gitignore, so node_modules/dist never appear.)

- [ ] **Step 8: Client + db suites + repo typecheck**

```bash
pnpm --filter @sevendays/api-client test && pnpm --filter @sevendays/api-client typecheck
docker compose up -d db   # if not still up from Task 3
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/sevendays_test pnpm --filter @sevendays/db test
pnpm --filter @sevendays/api typecheck && pnpm --filter @sevendays/db typecheck
```

Expected: all green — the client loopback suite on the renamed snapshot assertion; the db package's probe test runs LIVE against the compose db (compose.yaml's local `postgres:postgres` — not a secret) and passes with the renamed expectations; api + db typecheck green (repo-wide typecheck is now clean again).

- [ ] **Step 9: Commit**

```bash
pnpm exec biome check --write packages/api-client/test/mock-api.ts packages/api-client/test/loopback.test.ts packages/db/src/verify-appointment-row.test.ts packages/db/scripts/verify-appointment-row.mjs packages/db/scripts/verify-appointment-row.d.mts packages/db/scripts/rehearsal-fixture.mjs
git add packages/api-client/test/mock-api.ts packages/api-client/test/loopback.test.ts packages/db/src/verify-appointment-row.test.ts packages/db/scripts/verify-appointment-row.mjs packages/db/scripts/verify-appointment-row.d.mts packages/db/scripts/rehearsal-fixture.mjs
git commit -m "chore(client,db): appointment rename reaches the client mock and M1.5 probe tooling" -m "- mock fixture + POST record gain studioServiceId: null and bookedPriceCents; loopback snapshot assertion renamed
- verify-appointment-row probe: column list + guarded pushes (optional/nullable expected refs), .d.mts contract updated
- probe test expectations renamed; failed-label grep matches bookedPriceCents
- rehearsal fixture: NULL studio_service_id, booked_price_cents insert columns, JSON key renamed
- rename sweep: old name remains only in docs/progress.md (M1.5 history) + docs/plan.md (historical checkbox text)"
```

---

### Task 5: Full gate, progress.md, ADR-0012, handoff

**Files:**
- Modify: `docs/progress.md`
- Create: `docs/adr/0012-exactly-one-booked-offering.md`

**Interfaces:**
- Consumes: Tasks 1–4 complete and committed.

**Not here:** no `docs/plan.md` checkbox ticks (the M2 schema box spans tickets 01+02 and stays unticked until #41/#42), no GitHub issue edits, no PR (owner opens it).

- [ ] **Step 1: Repo-wide gate**

```bash
pnpm check && pnpm build
```

Expected: lint + format + typecheck + test green across all packages/apps; build green. (`pnpm test` includes the landing/admin no-op test scripts — fine, unchanged from ticket 01.)

- [ ] **Step 2: Live re-verify (post-everything sanity)**

```bash
cd packages/db && node --env-file=.env scripts/check-env.mjs   # expect GATE: PASS
cd ../.. && pnpm --filter @sevendays/db db:verify-seed
```

Expected: `VERIFY: PASSED` — ticket 01's seed assertions still hold after the appointments migration (the migration touches only `appointments`; this is the cheap proof nothing adjacent drifted).

- [ ] **Step 3: Write `docs/adr/0012-exactly-one-booked-offering.md`** with exactly:

```markdown
# ADR-0012: Exactly-one booked offering, enforced on both sides

**Status:** Accepted
**Date:** 2026-09-07

## Context

The appointment model generalized from package-only to either a Service Package or a Studio Service (M2 booking-flow spec). Two invariants must hold together: every appointment books exactly one offering, and every consumer — the API intake, the booking form's payloads, future CMS writers — sees the same rule. The `appointments` table is the last line of defense (a rejected insert is safer than a corrupted row), while the shared Zod schemas are the first (a rejected payload never reaches the DB).

## Decision

Exactly-one is encoded twice, deliberately, from one formula — `(service_package_id is null) <> (studio_service_id is null)`:

- **Zod side:** `hasExactlyOneAppointmentOffering` + `EXACTLY_ONE_APPOINTMENT_MESSAGE` in `packages/types/src/appointment.ts`; all three appointment schemas refine with them.
- **SQL side:** the named `appointments_offering_exactly_one` CHECK on `appointments` (migration 0004).

The two are textual mirrors; changing one means changing both (pinned in the schema comments on both sides). The snapshot column renamed `package_price_cents` → `booked_price_cents` in the same migration — zero production rows made the rename free, and it will never be free again.

## Alternatives Considered

- **DB-only enforcement** — rejected: wire payloads would fail late (500-class or post-insert errors) instead of at the schema seam where the client can map reasons to friendly copy.
- **Zod-only enforcement** — rejected: any writer that bypasses the schemas (script, future CMS code path, manual SQL) could corrupt the table; the spec's user story 31 asks for the database to enforce it.
- **Two subtypes instead of nullable refs** (a `package_bookings`/`service_bookings` split or a discriminated union at the storage level) — deferred: one row per appointment keeps the M1.4 intake transaction, list read, and junction stitching intact; the expand half of expand–contract ships now and the contract half never became necessary.

## Consequences

- Migration 0004 stays a single generated migration because the table was zero-row — a later change to this constraint on a populated table will need the populated-table two-step.
- The exactly-one formula lives in two places by intent; the comment on each side names the other. A drift between them is a review-visible defect, not a silent one.
- Zod v4 chain rule: refinements ride the terminal link of every schema chain (`.omit()` throws on refined objects) — `appointmentFieldsSchema` is the shared unrefined basis for that reason.

---
```

- [ ] **Step 4: Update `docs/progress.md`** — add one bullet to the landed-work list (match the sibling ticket-01 bullet's style; place it newest-adjacent):

```markdown
- **M2 ticket 02 — appointments generalized (#40 → .scratch/m2-booking-flow-tickets/02.md):** migration `0004` (single generated — the table is zero-row, so no backfill): `service_package_id` nullable, nullable `studio_service_id` FK, `appointments_offering_exactly_one` CHECK (`(a is null) <> (b is null)` — the SQL mirror of packages/types' `hasExactlyOneAppointmentOffering`, ADR-0012), `package_price_cents` renamed `booked_price_cents` (free now, never again). `packages/types`: nullable offering refs on all three appointment schemas with the exactly-one refine, create refs default null, `bookedPriceCents` on the read shape (create keeps omitting the server-written snapshot). Intake module generalized (projection 14 fields); package-only path bit-identical — same 201 shapes and five typed rejections; db-level CHECK proven on compose (both-set and neither inserts rejected). Rename sweep: old name survives only in docs history. Full `pnpm check` + `pnpm build` green; live `db:verify-seed` still PASSED. NOT landed: service-path intake rejections + `past_datetime` floor (#41), the three read endpoints + client wrappers (#42) — `docs/plan.md`'s M2 schema checkbox stays unticked until they land.
```

- [ ] **Step 5: Commit**

```bash
git add docs/progress.md docs/adr/0012-exactly-one-booked-offering.md
git commit -m "docs: M2 ticket 02 landed — generalized appointment model; ADR-0012 exactly-one"
```

- [ ] **Step 6: Stop here — handoff** (owner pushes/merges; #41 and #42 branch from this state). Do **not** tick `docs/plan.md`'s M2 schema checkbox (spans tickets 01+02+API work); do not open a PR unless asked. Issue #40's acceptance-criteria boxes map 1:1 to Tasks 2/1/3 — note that mapping in the PR description when the owner opens it.

---

## Self-Review (executed at plan-writing time — re-run after any edit)

1. **Spec coverage:** nullable refs + CHECK + rename (Task 2, migration 0004 + schema file); generalized create/read Zod with exactly-one + rename (Task 1); package-only path green end to end (Tasks 3–4: identical 201 shapes, five typed rejections unchanged, client + probe suites green). Acceptance criterion 1 ↔ Tasks 2–3, criterion 2 ↔ Task 1 (+ read-shape tests), criterion 3 ↔ Tasks 3–4.
2. **Placeholder scan:** no TBD/TODO-as-gap/deferred-language in steps; every code step carries full code or exact line-level edits.
3. **Type consistency:** `hasExactlyOneAppointmentOffering` / `EXACTLY_ONE_APPOINTMENT_MESSAGE` / `appointmentFieldsSchema` / `bookedPriceCents` / `studioServiceId` / `servicePortrait` — each name defined once and used identically downstream (grep-verified against this file).

