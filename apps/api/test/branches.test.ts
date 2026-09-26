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
});
