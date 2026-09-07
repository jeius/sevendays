import type { StudioServiceWithBranches } from '@sevendays/types';
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

describe('GET /api/v1/studio-services', () => {
  it('returns active services with embedded bookable branch ids, ordered by name', async () => {
    const res = await app.request('/api/v1/studio-services', undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as StudioServiceWithBranches[];

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
  });
});
