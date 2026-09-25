import {
  attires,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
} from '@sevendays/db';
import type { ServicePackageRead } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
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
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];

    expect(body).toHaveLength(2);
    const combined = body.find((p) => p.id === ids.packageCombined);
    const simple = body.find((p) => p.id === ids.packageSimple);
    expect(combined).toBeDefined();
    expect(simple).toBeDefined();
    expect(body.some((p) => p.id === ids.packageRetired)).toBe(false);

    // M2 ticket 01: the wire shape carries the new catalog fields (the client
    // unwrap() requires slug — prove the API serves it before types ship).
    expect(simple?.slug).toBe('simple-package');
    expect(simple?.isFeatured).toBe(false);

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

describe('GET /api/v1/service-packages/:slug', () => {
  it('returns one active package with resolved inclusions and frames (200)', async () => {
    const res = await app.request(
      '/api/v1/service-packages/simple-package',
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead;

    expect(body.slug).toBe('simple-package');
    expect(body.id).toBe(ids.packageSimple);
    expect(body.isFeatured).toBe(false);
    expect(body.inclusions).toHaveLength(1);
    expect(body.inclusions[0]?.kind).toBe('print');
    expect(body.inclusions[0]?.printSize?.code).toBe('2R');
    expect(body.inclusions[0]?.attires.map((a) => a.name)).toEqual(['Toga']);
    expect(body.frames.map((f) => f.frameNumber)).toEqual([1]);
  });

  it('returns the uniform 404 envelope for an unknown slug', async () => {
    const res = await app.request(
      '/api/v1/service-packages/no-such-package',
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Package not found.');
  });

  it('returns 404 for an inactive package slug', async () => {
    const res = await app.request(
      '/api/v1/service-packages/retired-package',
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Package not found.');
  });
});

describe('public trim rules, position ordering, and resolved URLs (#138)', () => {
  it('a deactivated print size hides its referencing inclusion entirely', async () => {
    await db.update(printSizes).set({ isActive: false }).where(eq(printSizes.id, ids.printSize2x2));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const combined = body.find((p) => p.id === ids.packageCombined);
    expect(combined?.inclusions.map((i) => [i.kind, i.printSize?.code ?? null])).toEqual([
      ['framed_picture', '11x14'],
      ['print', '2R'],
      ['privilege', null],
    ]);
  });

  it('a deactivated attire trims from the list; the inclusion still renders', async () => {
    await db.update(attires).set({ isActive: false }).where(eq(attires.id, ids.attireToga));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const combined = body.find((p) => p.id === ids.packageCombined);
    const framed = combined?.inclusions.find((i) => i.kind === 'framed_picture');
    expect(framed?.attires.map((a) => a.name)).toEqual(['Filipiniana', 'Executive']);
    for (const print of combined?.inclusions.filter((i) => i.kind === 'print') ?? []) {
      expect(print.attires).toEqual([]);
    }
    // The privilege has no attires and no size — untouched by either rule.
    const privilege = combined?.inclusions.find((i) => i.kind === 'privilege');
    expect(privilege).toBeDefined();
    expect(privilege?.attires).toEqual([]);
  });

  it('a package whose inclusions all trim away still lists with inclusions: []', async () => {
    await db.update(printSizes).set({ isActive: false }).where(eq(printSizes.id, ids.printSize2R));
    await db.update(printSizes).set({ isActive: false }).where(eq(printSizes.id, ids.printSize2x2));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const simple = body.find((p) => p.id === ids.packageSimple);
    expect(simple).toBeDefined();
    expect(simple?.name).toBe('Simple Package');
    expect(simple?.priceCents).toBe(90000);
    expect(simple?.inclusions).toEqual([]);
    // Frames are not inclusions — the trim never touches them.
    expect(simple?.frames.map((f) => f.frameNumber)).toEqual([1]);
    // The combined package keeps its framed picture and its privilege.
    const combined = body.find((p) => p.id === ids.packageCombined);
    expect(combined?.inclusions.map((i) => i.kind)).toEqual(['framed_picture', 'privilege']);
  });

  it('inclusions order by (position, id), not by id', async () => {
    await db
      .update(packageInclusions)
      .set({ position: 1 })
      .where(eq(packageInclusions.id, ids.inclusionPrint2R));
    await db
      .update(packageInclusions)
      .set({ position: 2 })
      .where(eq(packageInclusions.id, ids.inclusionPrint2x2));
    await db
      .update(packageInclusions)
      .set({ position: 3 })
      .where(eq(packageInclusions.id, ids.inclusionFramed11x14));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const combined = body.find((p) => p.id === ids.packageCombined);
    // Insertion id order reads framed → 2R → 2x2; the swapped positions
    // must win.
    expect(combined?.inclusions.map((i) => i.printSize?.code ?? i.kind)).toEqual([
      '2R',
      '2x2',
      '11x14',
      'privilege',
    ]);
  });

  it('junction attires order by (position, id), not by created_at', async () => {
    // Fixtures insert Filipiniana first (strictly earlier created_at) at
    // position 1; swapping the POSITIONS must flip the read order — the
    // dead (created_at, id) key would keep Filipiniana first.
    await db
      .update(packageInclusionAttires)
      .set({ position: 2 })
      .where(eq(packageInclusionAttires.id, ids.junctionFramedFilipiniana));
    await db
      .update(packageInclusionAttires)
      .set({ position: 1 })
      .where(eq(packageInclusionAttires.id, ids.junctionFramedExecutive));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const framed = body
      .find((p) => p.id === ids.packageCombined)
      ?.inclusions.find((i) => i.kind === 'framed_picture');
    expect(framed?.attires.map((a) => a.name)).toEqual(['Executive', 'Filipiniana']);
  });

  it('coverImageUrl resolves against MEDIA_PUBLIC_BASE_URL and the raw key never appears', async () => {
    await db
      .update(servicePackages)
      .set({ coverImageKey: 'covers/01234567-0000-4000-8000-000000000001.jpg' })
      .where(eq(servicePackages.id, ids.packageCombined));
    const res = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead[];
    const combined = body.find((p) => p.id === ids.packageCombined);
    expect(combined).toBeDefined();
    expect(combined?.coverImageUrl).toBe(
      'https://pub-test.r2.dev/covers/01234567-0000-4000-8000-000000000001.jpg'
    );
    expect(body.find((p) => p.id === ids.packageSimple)?.coverImageUrl).toBeNull();
    expect(combined).not.toHaveProperty('coverImageKey');
  });

  it('the by-slug read applies the same trim and URL resolution', async () => {
    await db.update(printSizes).set({ isActive: false }).where(eq(printSizes.id, ids.printSize2R));
    await db
      .update(servicePackages)
      .set({ coverImageKey: 'covers/01234567-0000-4000-8000-000000000002.jpg' })
      .where(eq(servicePackages.id, ids.packageSimple));
    const res = await app.request(
      '/api/v1/service-packages/simple-package',
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as ServicePackageRead;
    // Simple's only inclusion referenced the deactivated 2R — the by-slug
    // read trims it away too (the all-trimmed package still renders).
    expect(body.inclusions).toEqual([]);
    expect(body.coverImageUrl).toBe(
      'https://pub-test.r2.dev/covers/01234567-0000-4000-8000-000000000002.jpg'
    );
  });
});
