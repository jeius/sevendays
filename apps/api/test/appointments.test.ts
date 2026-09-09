import { appointmentAddonServices, appointments as appointmentsTable } from '@sevendays/db';
import { createAppointmentSchema } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { createAppointment } from '../src/services/appointments.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const MISSING_UUID = 'f0000000-0000-4000-8000-000000000000';

// The intake floor (ticket 03) rejects at-or-before-now, so a hard-coded
// future date rots into a mass 400 failure the calendar day it passes.
// All future timestamps are now-relative; past-side tests mock the clock.
const futureDate = (days = 5) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const FUTURE_ISO = () => futureDate().toISOString();

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

const payload = (overrides: Record<string, unknown> = {}) => ({
  branchId: ids.branchA,
  servicePackageId: ids.packageCombined,
  customerName: 'Ana Reyes',
  customerEmail: 'ana@example.com',
  customerPhone: '+63 917 000 0000',
  scheduledAt: FUTURE_ISO(),
  addonServiceIds: [ids.addonMakeup],
  ...overrides,
});

const createViaApi = async (body: Record<string, unknown>) => {
  const res = await app.request(
    '/api/v1/appointments',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    },
    testEnv(url)
  );
  expect(res.status).toBe(201);
  return res.json();
};

describe('POST /api/v1/appointments', () => {
  it('persists with snapshots and embedded add-ons', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload()),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.bookedPriceCents).toBe(150000);
    expect(body.kind).toBe('scheduled');
    expect(body.status).toBe('pending');
    expect(body.addonServices).toEqual([
      { addonServiceId: ids.addonMakeup, name: 'Makeup', priceCents: 12000 },
    ]);
  });

  it('returns 201 with an empty add-on list', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ addonServiceIds: [] })),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    expect((await res.json()).addonServices).toEqual([]);
  });

  it('rejects an unknown branch with a per-entity 400', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ branchId: MISSING_UUID })),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Unknown branchId.');
  });

  it('rejects an inactive Service Package reference', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ servicePackageId: ids.packageRetired })),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/package/i);
  });

  it('rejects an inactive Add-on Service reference', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ addonServiceIds: [ids.addonRetired] })),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Add-on Service is inactive.');
  });

  it('rejects a duplicate add-on id', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ addonServiceIds: [ids.addonMakeup, ids.addonMakeup] })),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
  });

  it('rejects an invalid payload in the uniform error shape', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ customerEmail: 'not-an-email' })),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
    expect(body.error.length).toBeGreaterThan(0);
  });

  it('rejects a kind outside the enum', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ kind: 'emergency' })),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/appointments', () => {
  it('returns the created appointment, newest first', async () => {
    const first = await createViaApi(payload({ customerName: 'First' }));
    const second = await createViaApi(payload({ customerName: 'Second' }));
    const res = await app.request('/api/v1/appointments', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((a: { id: string }) => a.id)).toEqual([second.id, first.id]);
  });

  it('filters by branch', async () => {
    await createViaApi(payload({ branchId: ids.branchA }));
    await createViaApi(payload({ branchId: ids.branchB }));
    const res = await app.request(
      `/api/v1/appointments?branchId=${ids.branchA}`,
      undefined,
      testEnv(url)
    );
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].branchId).toBe(ids.branchA);
  });

  it('returns an empty list for an unknown branch', async () => {
    const res = await app.request(
      `/api/v1/appointments?branchId=${MISSING_UUID}`,
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('rejects a malformed branchId with 400', async () => {
    const res = await app.request(
      '/api/v1/appointments?branchId=not-a-uuid',
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe('string');
  });

  it('caps the list at 200', async () => {
    for (let i = 0; i < 201; i++) {
      await db.insert(appointmentsTable).values({
        branchId: ids.branchA,
        servicePackageId: ids.packageCombined,
        customerName: `Customer ${i}`,
        customerEmail: `customer${i}@example.com`,
        customerPhone: '+63 917 000 0000',
        scheduledAt: futureDate(),
        bookedPriceCents: 150000,
      });
    }
    const res = await app.request('/api/v1/appointments', undefined, testEnv(url));
    expect((await res.json()).length).toBe(200);
  });

  it('serves through the api-client-free public surface (no auth yet — Known Gap)', async () => {
    const res = await app.request('/api/v1/appointments', undefined, testEnv(url));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/appointments/:id', () => {
  it('returns a single appointment with stitched add-on entries (200)', async () => {
    const created = (await createViaApi(
      payload({
        addonServiceIds: [ids.addonMakeup, ids.addonHairstyle],
      })
    )) as { id: string };
    const res = await app.request(`/api/v1/appointments/${created.id}`, undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(created.id);
    expect(body.bookedPriceCents).toBe(150000);
    // Set-assert the entries: intake writes both junction rows in ONE insert,
    // so their createdAt ties and the stitch's orderBy gives no order
    // guarantee between them — the SHAPE is what's pinned, not entry order.
    expect(body.addonServices).toHaveLength(2);
    const byId = new Map(
      (body.addonServices as { addonServiceId: string; name: string; priceCents: number }[]).map(
        (e) => [e.addonServiceId, e]
      )
    );
    expect(byId.get(ids.addonMakeup)).toEqual({
      addonServiceId: ids.addonMakeup,
      name: 'Makeup',
      priceCents: 12000,
    });
    expect(byId.get(ids.addonHairstyle)).toEqual({
      addonServiceId: ids.addonHairstyle,
      name: 'Hairstyle',
      priceCents: 6000,
    });
  });

  it('returns 404 with the uniform envelope for an unknown id', async () => {
    const res = await app.request(`/api/v1/appointments/${MISSING_UUID}`, undefined, testEnv(url));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Appointment not found.');
  });

  it('rejects a non-uuid id with the uniform 400 envelope', async () => {
    const res = await app.request('/api/v1/appointments/not-a-uuid', undefined, testEnv(url));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
    expect(body.error.length).toBeGreaterThan(0);
  });

  it('returns the same shape as the list endpoint (single-get parity)', async () => {
    const created = (await createViaApi(payload())) as { id: string };
    const single = await (
      await app.request(`/api/v1/appointments/${created.id}`, undefined, testEnv(url))
    ).json();
    const listed = await (
      await app.request('/api/v1/appointments', undefined, testEnv(url))
    ).json();
    const fromList = (listed as { id: string }[]).find((a) => a.id === created.id);
    expect(fromList).toBeDefined();
    expect(Object.keys(single).sort()).toEqual(Object.keys(fromList).sort());
  });
});

// Seam 1 of the intake spec — the module's interface is the only place
// intake behavior is proven: rejection failures carry the module-owned
// message, and the happy path commits record + junction rows in one
// transaction. Complements the HTTP-level tests above (route = one call to
// badRequest with result.message).
describe('createAppointment module seam', () => {
  const moduleInput = (overrides: Record<string, unknown> = {}) =>
    createAppointmentSchema.parse(payload(overrides));

  it('carries the exact rejection message for all five reasons', async () => {
    await expect(createAppointment(db, moduleInput({ branchId: MISSING_UUID }))).resolves.toEqual({
      ok: false,
      reason: 'branch',
      message: 'Unknown branchId.',
    });
    await expect(
      createAppointment(db, moduleInput({ servicePackageId: MISSING_UUID }))
    ).resolves.toEqual({ ok: false, reason: 'package', message: 'Unknown servicePackageId.' });
    await expect(
      createAppointment(db, moduleInput({ servicePackageId: ids.packageRetired }))
    ).resolves.toEqual({
      ok: false,
      reason: 'package_inactive',
      message: 'Service Package is inactive.',
    });
    await expect(
      createAppointment(db, moduleInput({ addonServiceIds: [MISSING_UUID] }))
    ).resolves.toEqual({ ok: false, reason: 'addon', message: 'Unknown addonServiceId.' });
    await expect(
      createAppointment(db, moduleInput({ addonServiceIds: [ids.addonRetired] }))
    ).resolves.toEqual({
      ok: false,
      reason: 'addon_inactive',
      message: 'Add-on Service is inactive.',
    });
  });

  it('commits the record and its junction rows through one transaction', async () => {
    const result = await createAppointment(db, moduleInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrows for TS; the line above already failed otherwise
    expect(result.record.bookedPriceCents).toBe(150000);
    expect(result.record.addonServices).toEqual([
      { addonServiceId: ids.addonMakeup, name: 'Makeup', priceCents: 12000 },
    ]);
    const junction = await db
      .select({
        appointmentId: appointmentAddonServices.appointmentId,
        addonServiceId: appointmentAddonServices.addonServiceId,
      })
      .from(appointmentAddonServices)
      .where(eq(appointmentAddonServices.appointmentId, result.record.id));
    expect(junction).toHaveLength(1);
    expect(junction[0]?.addonServiceId).toBe(ids.addonMakeup);
  });
});

// The DB-enforced half of exactly-one (M2 ticket 02): the schema-level
// refine and the intake checks are client-side; these inserts go straight
// to the table and prove the appointments_offering_exactly_one CHECK
// rejects both-set and neither at the storage layer (spec user story 31).
describe('appointments offering CHECK (db-level)', () => {
  const baseValues = () => ({
    branchId: ids.branchA,
    customerName: 'Check Probe',
    customerEmail: 'check@example.com',
    customerPhone: '+63 917 000 0000',
    scheduledAt: futureDate(),
    bookedPriceCents: 150000,
  });

  // Drizzle wraps driver errors: the PG message (with the CHECK name) sits
  // on err.cause — unwrap before matching the constraint name.
  const constraintError = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (err) {
      const cause = (err as { cause?: unknown }).cause;
      expect((cause as Error | undefined)?.message).toMatch(/appointments_offering_exactly_one/);
      return;
    }
    throw new Error('insert should have been rejected by the exactly-one CHECK');
  };

  it('rejects an insert with both offering refs set', async () => {
    await constraintError(
      db
        .insert(appointmentsTable)
        .values({
          ...baseValues(),
          servicePackageId: ids.packageCombined,
          studioServiceId: ids.servicePortrait,
        })
        .returning({ id: appointmentsTable.id })
    );
  });

  it('rejects an insert with neither offering ref set', async () => {
    await constraintError(
      db.insert(appointmentsTable).values(baseValues()).returning({ id: appointmentsTable.id })
    );
  });
});

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
    await expect(createAppointment(db, moduleInput({ branchId: ids.branchB }))).resolves.toEqual({
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
      testEnv(url)
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
    expect(body.details[0]?.message).toContain(
      'Exactly one of servicePackageId and studioServiceId'
    );
  });

  it('rejects neither offering with the schema-level 400 (uniform envelope)', async () => {
    const res = await post(servicePayload({ studioServiceId: null }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request payload.');
    expect(body.details[0]?.message).toContain(
      'Exactly one of servicePackageId and studioServiceId'
    );
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
