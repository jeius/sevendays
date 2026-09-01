import type { AddonService } from '@sevendays/types';
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

describe('GET /api/v1/addon-services', () => {
  it('returns active add-on services ordered by name', async () => {
    const res = await app.request('/api/v1/addon-services', undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as AddonService[];

    expect(body).toHaveLength(2);
    expect(body.map((a) => a.name)).toEqual(['Hairstyle', 'Makeup']);
    expect(body.some((a) => a.id === ids.addonRetired)).toBe(false);

    const makeup = body.find((a) => a.id === ids.addonMakeup);
    const hairstyle = body.find((a) => a.id === ids.addonHairstyle);
    expect(makeup).toMatchObject({
      description: 'On-site makeup service',
      priceCents: 12000,
      isActive: true,
    });
    expect(hairstyle).toMatchObject({
      description: 'On-site hairstyle service',
      priceCents: 6000,
      isActive: true,
    });
  });
});
