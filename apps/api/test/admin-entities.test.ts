import { attires, branches, printSizes } from '@sevendays/db';
import { beforeEach, describe, expect, it } from 'vitest';
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
