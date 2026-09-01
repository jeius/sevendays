import { appointments as appointmentsTable } from '@sevendays/db';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const MISSING_UUID = 'f0000000-0000-4000-8000-000000000000';

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
  scheduledAt: '2026-09-10T10:00:00.000Z',
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
    { DATABASE_URL: url }
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
      { DATABASE_URL: url }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.packagePriceCents).toBe(150000);
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
      { DATABASE_URL: url }
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
      { DATABASE_URL: url }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/branch/i);
  });

  it('rejects an inactive Service Package reference', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ servicePackageId: ids.packageRetired })),
        headers: { 'content-type': 'application/json' },
      },
      { DATABASE_URL: url }
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
      { DATABASE_URL: url }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/add-on/i);
  });

  it('rejects a duplicate add-on id', async () => {
    const res = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        body: JSON.stringify(payload({ addonServiceIds: [ids.addonMakeup, ids.addonMakeup] })),
        headers: { 'content-type': 'application/json' },
      },
      { DATABASE_URL: url }
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
      { DATABASE_URL: url }
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
      { DATABASE_URL: url }
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/appointments', () => {
  it('returns the created appointment, newest first', async () => {
    const first = await createViaApi(payload({ customerName: 'First' }));
    const second = await createViaApi(payload({ customerName: 'Second' }));
    const res = await app.request('/api/v1/appointments', undefined, { DATABASE_URL: url });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((a: { id: string }) => a.id)).toEqual([second.id, first.id]);
  });

  it('filters by branch', async () => {
    await createViaApi(payload({ branchId: ids.branchA }));
    await createViaApi(payload({ branchId: ids.branchB }));
    const res = await app.request(`/api/v1/appointments?branchId=${ids.branchA}`, undefined, {
      DATABASE_URL: url,
    });
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].branchId).toBe(ids.branchA);
  });

  it('returns an empty list for an unknown branch', async () => {
    const res = await app.request(`/api/v1/appointments?branchId=${MISSING_UUID}`, undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('rejects a malformed branchId with 400', async () => {
    const res = await app.request('/api/v1/appointments?branchId=not-a-uuid', undefined, {
      DATABASE_URL: url,
    });
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
        scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
        packagePriceCents: 150000,
      });
    }
    const res = await app.request('/api/v1/appointments', undefined, { DATABASE_URL: url });
    expect((await res.json()).length).toBe(200);
  });

  it('serves through the api-client-free public surface (no auth yet — Known Gap)', async () => {
    const res = await app.request('/api/v1/appointments', undefined, { DATABASE_URL: url });
    expect(res.status).toBe(200);
  });
});
