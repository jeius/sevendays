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

const sendMock = vi.fn();
vi.mock('resend', () => ({
  // `new Resend(...)` at the call site — vitest 4 rejects `new` on a vi.fn
  // whose implementation is an arrow; the named `function` impl returning
  // the mock instance is the constructor-shaped equivalent. (Named, so the
  // style fixer doesn't rewrite it back to an arrow.)
  Resend: vi.fn(function Resend() {
    return { emails: { send: sendMock } };
  }),
}));

// Hono throws on c.executionCtx unless the request carries an execution
// context (app.request's 4th argument) — the fake records waitUntil
// promises so a test can await the fire-and-forget send.
function fakeExecCtx() {
  const ctx = {
    promises: [] as Promise<unknown>[],
    waitUntil(promise: Promise<unknown>) {
      ctx.promises.push(promise);
    },
    passThroughOnException() {},
  };
  return ctx;
}

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

describe('GET /api/v1/branches', () => {
  it('returns real branch rows', async () => {
    const res = await app.request('/api/v1/branches', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; name: string }[];
    expect(body).toHaveLength(2);
    expect(body.map((b) => b.name).sort()).toEqual(['Test Branch A', 'Test Branch B']);
    expect(body.some((b) => b.id === ids.branchA)).toBe(true);
  });
});

describe('the branches read under the CMS (#138)', () => {
  it('excludes deactivated rows while active rows keep their full shape', async () => {
    // Deactivate through the real CMS path — the isActive flip via PUT.
    const { token } = await signUpSession(url, 'branches-flip@sevendays.test');
    const put = await app.request(
      `/api/v1/admin/branches/${ids.branchB}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch B',
          address: '2 Test St',
          phone: '+63 900 000 002',
          acceptsWalkIns: true,
          isActive: false,
        }),
      },
      testEnv(url)
    );
    expect(put.status).toBe(200);

    const res = await app.request('/api/v1/branches', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      name: string;
      phone: string;
      acceptsWalkIns: boolean;
    }[];
    expect(body).toHaveLength(1);
    expect(body[0]?.id).toBe(ids.branchA);
    // The walk-in badge / phone data survive for active branches — the
    // change is the filter, nothing else.
    expect(body[0]?.phone).toBe('+63 900 000 001');
    expect(body[0]?.acceptsWalkIns).toBe(false);
  });

  it('gated appointment reads still resolve appointments booked at a deactivated branch', async () => {
    // Book at branchA (package offering + one add-on — the add-on name
    // join is the read's only name resolution, itself filterless).
    const ctx = fakeExecCtx();
    const created = await app.request(
      '/api/v1/appointments',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          branchId: ids.branchA,
          servicePackageId: ids.packageCombined,
          studioServiceId: null,
          customerName: 'Flip Test Customer',
          customerEmail: 'flip-customer@sevendays.test',
          customerPhone: '+63 900 111 2222',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          addonServiceIds: [ids.addonMakeup],
        }),
      },
      testEnv(url),
      ctx
    );
    expect(created.status).toBe(201);
    await Promise.all(ctx.promises); // the scheduled send resolves before the test ends
    const booked = (await created.json()) as { id: string; branchId: string };

    // Deactivate branchA through the real CMS path.
    const { token } = await signUpSession(url, 'branches-appt@sevendays.test');
    const put = await app.request(
      `/api/v1/admin/branches/${ids.branchA}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Test Branch A',
          address: '1 Test St',
          phone: '+63 900 000 001',
          acceptsWalkIns: false,
          isActive: false,
        }),
      },
      testEnv(url)
    );
    expect(put.status).toBe(200);

    // The public branches read hides it…
    const publicBranches = await app.request('/api/v1/branches', undefined, testEnv(url));
    const publicBody = (await publicBranches.json()) as { id: string }[];
    expect(publicBody.some((b) => b.id === ids.branchA)).toBe(false);

    // …while the gated appointment reads keep resolving the record — the
    // history is untouched by any deactivation (spec: deactivated branch
    // names keep resolving in gated appointment reads).
    const list = await app.request(
      '/api/v1/appointments',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(list.status).toBe(200);
    const rows = (await list.json()) as {
      id: string;
      branchId: string;
      addonServices: { name: string }[];
    }[];
    const row = rows.find((r) => r.id === booked.id);
    expect(row).toBeDefined();
    expect(row?.branchId).toBe(ids.branchA);
    expect(row?.addonServices.map((a) => a.name)).toEqual(['Makeup']);

    const single = await app.request(
      `/api/v1/appointments/${booked.id}`,
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(single.status).toBe(200);
    expect(((await single.json()) as { branchId: string }).branchId).toBe(ids.branchA);
  });
});
