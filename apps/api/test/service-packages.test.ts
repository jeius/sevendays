import type { ServicePackageWithInclusions } from '@sevendays/types';
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

describe('GET /api/v1/service-packages', () => {
  it('returns active packages with resolved inclusions, frames, and catalog-ordered attires', async () => {
    const res = await app.request('/api/v1/service-packages', undefined, {
      DATABASE_URL: url,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageWithInclusions[];

    expect(body).toHaveLength(2);
    const combined = body.find((p) => p.id === ids.packageCombined);
    const simple = body.find((p) => p.id === ids.packageSimple);
    expect(combined).toBeDefined();
    expect(simple).toBeDefined();
    expect(body.some((p) => p.id === ids.packageRetired)).toBe(false);

    const framed = combined?.inclusions.find((i) => i.kind === 'framed_picture');
    expect(framed).toBeDefined();
    expect(framed?.printSize?.code).toBe('11x14');
    expect(framed?.attires.map((a) => a.name)).toEqual(['Filipiniana', 'Executive']);

    const prints = combined?.inclusions.filter((i) => i.kind === 'print');
    expect(prints.length).toBeGreaterThan(0);
    for (const print of prints) {
      expect(print.attires.map((a) => a.name)).toEqual(['Toga']);
    }

    const privilege = combined?.inclusions.find((i) => i.kind === 'privilege');
    expect(privilege).toBeDefined();
    expect(privilege?.attires).toEqual([]);
    expect(privilege?.printSize).toBeNull();

    for (const p of [combined, simple]) {
      expect(p?.frames.map((f) => f.frameNumber)).toEqual([1]);
    }
  });
});
