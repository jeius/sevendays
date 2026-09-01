import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

describe('GET /api/v1/branches', () => {
  it('returns real branch rows', async () => {
    const res = await app.request('/api/v1/branches', undefined, { DATABASE_URL: url });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; name: string }[];
    expect(body).toHaveLength(2);
    expect(body.map((b) => b.name).sort()).toEqual(['Test Branch A', 'Test Branch B']);
    expect(body.some((b) => b.id === ids.branchA)).toBe(true);
  });
});
