import { attires, auditLog, branches, printSizes } from '@sevendays/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const authed = async (method: string, path: string, email: string, body?: unknown) => {
  const { token } = await signUpSession(url, email);
  return app.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(url)
  );
};

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

describe('branches admin CRUD', () => {
  it('GET / lists ALL rows including a deactivated one', async () => {
    await db.insert(branches).values({
      name: 'Ghost Branch',
      address: 'Nowhere St',
      phone: '+63 900 000 009',
      isActive: false,
    });
    const { token } = await signUpSession(url, 'admin-branches-list@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; name: string; isActive: boolean }[];
    expect(body).toHaveLength(3);
    const ghost = body.find((b) => b.name === 'Ghost Branch');
    expect(ghost?.isActive).toBe(false);
  });

  it('GET /:id returns the row', async () => {
    const { token } = await signUpSession(url, 'admin-branches-get@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; name: string };
    expect(body.id).toBe(ids.branchA);
    expect(body.name).toBe('Test Branch A');
  });

  it('GET /:id answers the per-entity 404 for an unknown id', async () => {
    const { token } = await signUpSession(url, 'admin-branches-404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches/00000000-0000-4000-8000-000000000000',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Branch not found.' });
  });

  it('POST → 201 canonical read; omitted defaulted fields exercise their defaults', async () => {
    const { token } = await signUpSession(url, 'admin-branches-post@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Fourth Branch',
          address: '4 New St',
          phone: '+63 900 000 004',
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      name: string;
      isActive: boolean;
      acceptsWalkIns: boolean;
    };
    expect(typeof body.id).toBe('string');
    expect(body.name).toBe('Fourth Branch');
    expect(body.isActive).toBe(true);
    expect(body.acceptsWalkIns).toBe(false);
  });

  it('POST duplicate name → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-branches-dup@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch A',
          address: '1 Test St',
          phone: '+63 900 000 001',
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('That value is already in use.');
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('PUT is full-object and flips isActive — deactivation through the entity PUT', async () => {
    const { token } = await signUpSession(url, 'admin-branches-put@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch A',
          address: '1 Test St',
          phone: '+63 900 000 001',
          acceptsWalkIns: true,
          isActive: false,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; isActive: boolean; acceptsWalkIns: boolean };
    expect(body.isActive).toBe(false);
    expect(body.acceptsWalkIns).toBe(true);
  });

  it('PUT unknown id → 404', async () => {
    const { token } = await signUpSession(url, 'admin-branches-put404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches/00000000-0000-4000-8000-000000000000',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'X', address: 'Y', phone: 'Z', isActive: true }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Branch not found.' });
  });

  it('PUT name taken by another row → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-branches-putdup@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch B',
          address: '1 Test St',
          phone: '+63 900 000 001',
          isActive: true,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('That value is already in use.');
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 42 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('print sizes admin CRUD', () => {
  it('GET / lists ALL rows including a deactivated one', async () => {
    await db.insert(printSizes).values({ code: 'A3', description: 'A3 print', isActive: false });
    const { token } = await signUpSession(url, 'admin-sizes-list@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/print-sizes',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: string; isActive: boolean }[];
    expect(body.map((s) => s.code)).toContain('A3');
    expect(body.find((s) => s.code === 'A3')?.isActive).toBe(false);
  });

  it('POST → 201 canonical read', async () => {
    const { token } = await signUpSession(url, 'admin-sizes-post@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/print-sizes',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ code: 'A4', description: 'A4 print' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; code: string; isActive: boolean };
    expect(body.code).toBe('A4');
    expect(body.isActive).toBe(true);
  });

  it('POST duplicate code → 400 with the code field detail', async () => {
    const { token } = await signUpSession(url, 'admin-sizes-dup@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/print-sizes',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ code: '2R', description: 'clash' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['code'], message: 'already in use' }]);
  });

  it('PUT flips isActive → 200', async () => {
    const { token } = await signUpSession(url, 'admin-sizes-put@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/print-sizes/${ids.printSize2R}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ code: '2R', description: '2R print (3.5x5 in)', isActive: false }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { isActive: boolean }).isActive).toBe(false);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const { token } = await signUpSession(url, 'admin-sizes-404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/print-sizes/00000000-0000-4000-8000-000000000000',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Print size not found.' });
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/print-sizes',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: null }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('attires admin CRUD', () => {
  it('GET / lists ALL rows including a deactivated one', async () => {
    await db.insert(attires).values({ name: 'Barong', isActive: false });
    const { token } = await signUpSession(url, 'admin-attires-list@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/attires',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; isActive: boolean }[];
    expect(body.map((a) => a.name)).toContain('Barong');
    expect(body.find((a) => a.name === 'Barong')?.isActive).toBe(false);
  });

  it('POST → 201 canonical read', async () => {
    const { token } = await signUpSession(url, 'admin-attires-post@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/attires',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'Americana' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; name: string; isActive: boolean };
    expect(body.name).toBe('Americana');
    expect(body.isActive).toBe(true);
  });

  it('POST duplicate name → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-attires-dup@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/attires',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'Toga' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('PUT flips isActive → 200', async () => {
    const { token } = await signUpSession(url, 'admin-attires-put@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/attires/${ids.attireToga}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'Toga', isActive: false }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { isActive: boolean }).isActive).toBe(false);
  });

  it('PUT name taken by another row → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-attires-putdup@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/attires/${ids.attireToga}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'Filipiniana', isActive: true }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('That value is already in use.');
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const { token } = await signUpSession(url, 'admin-attires-404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/attires/00000000-0000-4000-8000-000000000000',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Attire not found.' });
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/attires',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 42 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('add-on services admin CRUD', () => {
  it('GET / lists ALL rows including a deactivated one', async () => {
    const { token } = await signUpSession(url, 'admin-addons-list@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/addon-services',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; isActive: boolean }[];
    expect(body.map((s) => s.name)).toContain('Retired Add-on');
    expect(body.find((s) => s.name === 'Retired Add-on')?.isActive).toBe(false);
  });

  it('POST → 201 canonical read', async () => {
    const { token } = await signUpSession(url, 'admin-addons-post@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/addon-services',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Props Styling',
          description: 'On-set props',
          priceCents: 8000,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      name: string;
      priceCents: number;
      isActive: boolean;
    };
    expect(body.name).toBe('Props Styling');
    expect(body.priceCents).toBe(8000);
    expect(body.isActive).toBe(true);
  });

  it('POST duplicate name → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-addons-dup@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/addon-services',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ name: 'Makeup', description: 'x', priceCents: 1 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('PUT flips isActive → 200', async () => {
    const { token } = await signUpSession(url, 'admin-addons-put@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/addon-services/${ids.addonMakeup}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Makeup',
          description: 'On-site makeup service',
          priceCents: 12000,
          isActive: false,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { isActive: boolean }).isActive).toBe(false);
    // The round-trip (#137 T9): the admin GET still shows the deactivated
    // row — the public read trims, the admin read never does.
    const after = await app.request(
      `/api/v1/admin/addon-services/${ids.addonMakeup}`,
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(after.status).toBe(200);
    expect(((await after.json()) as { isActive: boolean }).isActive).toBe(false);
  });

  it('PUT name taken by another row → 400 with the name field detail', async () => {
    const { token } = await signUpSession(url, 'admin-addons-putdup@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/addon-services/${ids.addonMakeup}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Hairstyle',
          description: 'On-site makeup service',
          priceCents: 12000,
          isActive: true,
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('That value is already in use.');
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const { token } = await signUpSession(url, 'admin-addons-404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/addon-services/00000000-0000-4000-8000-000000000000',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Add-on Service not found.' });
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/addon-services',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priceCents: 'free' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('audit rows (M6 #185 — one per committed mutation, tx-gated)', () => {
  const rows = async () => db.select().from(auditLog);

  it('POST branches → exactly one row with the ruled fields; requestId = the served X-Request-Id AND the admin_mutation line (the Application Log correlation)', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(String(args[0]));
    });
    try {
      const { token, userId } = await signUpSession(url, 'audit-branch@sevendays.test');
      const res = await app.request(
        '/api/v1/admin/branches',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...bearer(token) },
          body: JSON.stringify({
            name: 'Audit Branch',
            address: '1 Audit St',
            phone: '+63 900 000 010',
          }),
        },
        testEnv(url)
      );
      expect(res.status).toBe(201);
      const created = (await res.json()) as { id: string };
      const all = await rows();
      expect(all).toHaveLength(1);
      const [row] = all;
      if (!row) throw new Error('expected one audit row');
      expect(row.entity).toBe('branch');
      expect(row.entityId).toBe(created.id);
      expect(row.action).toBe('create');
      expect(row.summary).toBe('Audit Branch');
      expect(row.actorId).toBe(userId);
      expect(row.actorEmail).toBe('audit-branch@sevendays.test');
      expect(row.requestId).toBe(res.headers.get('x-request-id'));
      expect(row.occurredAt).toBeInstanceOf(Date);
      const mutationLines = lines
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .filter((line) => line.evt === 'admin_mutation');
      expect(mutationLines).toHaveLength(1);
      expect(mutationLines[0]?.requestId).toBe(row.requestId);
    } finally {
      spy.mockRestore();
    }
  });

  it('PUT flipping isActive true→false records deactivate; a later reactivation records update', async () => {
    const created = await authed('POST', '/api/v1/admin/branches', 'audit-flip-a@sevendays.test', {
      name: 'Flip Branch',
      address: '2 Flip St',
      phone: '+63 900 000 011',
    });
    const { id } = (await created.json()) as { id: string };
    const body = {
      name: 'Flip Branch',
      address: '2 Flip St',
      phone: '+63 900 000 011',
    };
    const off = await authed('PUT', `/api/v1/admin/branches/${id}`, 'audit-flip-b@sevendays.test', {
      ...body,
      isActive: false,
    });
    expect(off.status).toBe(200);
    const afterOff = (await rows()).filter((row) => row.entityId === id);
    expect(afterOff.filter((row) => row.action === 'deactivate')).toHaveLength(1);
    const on = await authed('PUT', `/api/v1/admin/branches/${id}`, 'audit-flip-c@sevendays.test', {
      ...body,
      name: 'Flip Branch Renamed',
      isActive: true,
    });
    expect(on.status).toBe(200);
    const afterOn = (await rows()).filter((row) => row.entityId === id);
    expect(afterOn.filter((row) => row.action === 'deactivate')).toHaveLength(1);
    expect(afterOn.filter((row) => row.action === 'update')).toHaveLength(1);
  });

  it('failed writes record nothing: a 400 (duplicate name), a 404 (unknown id), and a 401 (anonymous) each leave the table empty', async () => {
    const dup = await authed('POST', '/api/v1/admin/branches', 'audit-dup-a@sevendays.test', {
      name: 'Test Branch A', // fixture name — the uniqueness collision
      address: 'X St',
      phone: '+63 900 000 000',
    });
    expect(dup.status).toBe(400);
    const missing = await authed(
      'PUT',
      '/api/v1/admin/branches/00000000-0000-4000-8000-000000000000',
      'audit-dup-b@sevendays.test',
      { name: 'Ghost', address: 'X St', phone: '+63 900 000 000' }
    );
    expect(missing.status).toBe(404);
    const anon = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Nope', address: 'X', phone: 'y' }),
      },
      testEnv(url)
    );
    expect(anon.status).toBe(401);
    expect(await rows()).toEqual([]);
  });

  it('print-size, attire, and add-on-service POSTs → one row each with the family summary (code or name)', async () => {
    const ps = await authed('POST', '/api/v1/admin/print-sizes', 'audit-ps@sevendays.test', {
      code: 'A4',
      description: 'Audit size',
    });
    const at = await authed('POST', '/api/v1/admin/attires', 'audit-at@sevendays.test', {
      name: 'Audit Barong',
    });
    const ad = await authed('POST', '/api/v1/admin/addon-services', 'audit-ad@sevendays.test', {
      name: 'Audit Spray',
      description: 'Hold that updo',
      priceCents: 3000,
    });
    expect([ps.status, at.status, ad.status]).toEqual([201, 201, 201]);
    const all = await rows();
    expect(all.map((row) => [row.entity, row.summary]).sort()).toEqual([
      ['addon-service', 'Audit Spray'],
      ['attire', 'Audit Barong'],
      ['print-size', 'A4'],
    ]);
    expect(all.every((row) => row.action === 'create')).toBe(true);
  });
});
