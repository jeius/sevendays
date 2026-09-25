import { frames, packageInclusionAttires, packageInclusions, servicePackages } from '@sevendays/db';
import { eq, inArray } from 'drizzle-orm';
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

const save = (overrides: Record<string, unknown> = {}) => ({
  name: 'Deluxe Package',
  description: 'The full graduation set.',
  priceCents: 150000,
  durationMinutes: null,
  isActive: true,
  isFeatured: false,
  frames: [{ id: 'frame-1' }],
  inclusions: [
    {
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: ids.printSize11x14,
      frameId: 'frame-1',
      attireIds: [ids.attireFilipiniana, ids.attireExecutive],
      description: 'The framed 11x14',
    },
    {
      kind: 'print',
      quantity: 4,
      printSizeId: ids.printSize2R,
      attireIds: [ids.attireToga],
      description: null,
    },
  ],
  ...overrides,
});

// The full-object PUT payload for the fixture package (its current fields).
const put = (overrides: Record<string, unknown> = {}) =>
  save({
    name: 'Combined Package',
    description: 'Framed picture with prints and privileges',
    priceCents: 150000,
    slug: 'combined-package',
    ...overrides,
  });

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

describe('package admin reads', () => {
  it('GET / lists ALL rows including the deactivated fixture, full composition, resolved null cover', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/service-packages',
      'admin-pkg-list@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      slug: string;
      isActive: boolean;
      coverImageUrl: string | null;
      coverImageKey?: string;
      inclusions: unknown[];
      frames: unknown[];
    }[];
    expect(body).toHaveLength(3);
    const retired = body.find((p) => p.slug === 'retired-package');
    expect(retired?.isActive).toBe(false);
    expect(retired?.inclusions).toHaveLength(0);
    const combined = body.find((p) => p.slug === 'combined-package');
    expect(combined?.inclusions).toHaveLength(4);
    expect(combined?.frames).toHaveLength(1);
    expect(combined?.coverImageUrl).toBeNull();
    expect('coverImageKey' in (combined ?? {})).toBe(false);
  });

  it('GET /:id returns the assembled read', async () => {
    const res = await authed(
      'GET',
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      'admin-pkg-get@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; slug: string };
    expect(body.id).toBe(ids.packageCombined);
    expect(body.slug).toBe('combined-package');
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/service-packages/00000000-0000-4000-8000-000000000000',
      'admin-pkg-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Package not found.' });
  });
});

describe('the atomic package save — create', () => {
  it('POST full save → 201; slug generated, frames renumbered, inclusions in array order, junctions in attire order', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-post@sevendays.test',
      save()
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      slug: string;
      coverImageUrl: string | null;
      frames: { id: string; frameNumber: number }[];
      inclusions: { kind: string; attires: { name: string }[] }[];
    };
    expect(body.slug).toBe('deluxe-package');
    expect(body.coverImageUrl).toBeNull();
    expect(body.frames).toHaveLength(1);
    expect(body.frames[0]?.frameNumber).toBe(1);
    expect(body.inclusions[0]?.kind).toBe('framed_picture');
    expect(body.inclusions[1]?.kind).toBe('print');
    expect(body.inclusions[0]?.attires.map((a) => a.name)).toEqual(['Filipiniana', 'Executive']);
  });

  it('POST name collision → 400 with the name field detail', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-dup@sevendays.test',
      save({ name: 'Combined Package' })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('POST a different name that slugs identically → 400 with the SLUG field detail (the OR pre-check names the field that clashed)', async () => {
    await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-slug-a@sevendays.test',
      save()
    );
    // 'deluxe package' is a distinct NAME but slugifies to the SAME
    // 'deluxe-package' — the pre-check's OR query finds the row and names
    // the slug (the true 23505 race is the same vocabulary through
    // guardUnique, unit-proven in admin-shared.test.ts).
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-slug-b@sevendays.test',
      save({ name: 'deluxe package' })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['slug'], message: 'already in use' }]);
  });

  it('POST with an unknown printSizeId → 400 AND nothing written (no partial junction writes)', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-badref@sevendays.test',
      save({
        inclusions: [
          {
            kind: 'print',
            quantity: 1,
            printSizeId: '00000000-0000-4000-8000-000000000000',
            attireIds: [ids.attireToga],
            description: null,
          },
        ],
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['inclusions']);
    expect(body.details[0]?.message).toContain('00000000-0000-4000-8000-000000000000');
    const [frameRows, inclusionRows] = await Promise.all([
      db.select({ id: frames.id }).from(frames),
      db.select({ id: packageInclusions.id }).from(packageInclusions),
    ]);
    expect(frameRows).toHaveLength(2); // the fixtures' only frames
    expect(inclusionRows).toHaveLength(5); // the fixtures' only inclusions
    const saved = await db
      .select({ id: servicePackages.id })
      .from(servicePackages)
      .where(eq(servicePackages.name, 'Deluxe Package'));
    expect(saved).toHaveLength(0);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/service-packages',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priceCents: -1 }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('the atomic package save — update', () => {
  it('PUT reorders frames and inclusions — array order becomes frameNumber/position, children rewritten', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      'admin-pkg-put@sevendays.test',
      put({
        frames: [{ id: 'fr-new-a' }, { id: 'fr-new-b' }],
        inclusions: [
          {
            kind: 'framed_picture',
            quantity: 1,
            printSizeId: ids.printSize11x14,
            frameId: 'fr-new-b',
            attireIds: [ids.attireExecutive, ids.attireFilipiniana],
            description: 'Moved frame',
          },
          {
            kind: 'framed_picture',
            quantity: 1,
            printSizeId: ids.printSize11x14,
            frameId: 'fr-new-a',
            attireIds: [ids.attireToga],
            description: null,
          },
          {
            kind: 'privilege',
            quantity: null,
            printSizeId: null,
            attireIds: [],
            description: 'High Resolution soft copies',
          },
        ],
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      frames: { frameNumber: number }[];
      inclusions: { kind: string; frameId: string | null; attires: { name: string }[] }[];
    };
    expect(body.frames.map((f) => f.frameNumber)).toEqual([1, 2]);
    expect(body.inclusions.map((i) => i.kind)).toEqual([
      'framed_picture',
      'framed_picture',
      'privilege',
    ]);
    expect(body.inclusions[0]?.attires.map((a) => a.name)).toEqual(['Executive', 'Filipiniana']);
    expect(body.inclusions[2]?.attires).toEqual([]);
    // children were REWRITTEN — the two framed inclusions ride fresh frame ids
    expect(body.inclusions[0]?.frameId).not.toBeNull();
    expect(body.inclusions[1]?.frameId).not.toBeNull();
    expect(body.inclusions[0]?.frameId).not.toBe(body.inclusions[1]?.frameId);
  });

  it('PUT slug taken by another row → 400 with the slug field detail', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'admin-pkg-slugtaken@sevendays.test',
      // The name is pinned back to the target's own: put()'s defaults are the
      // COMBINED fixture's fields, so the builder default would make this a
      // BOTH-clash PUT and the name pre-check would win. The case under test
      // is the pure slug clash.
      put({ name: 'Simple Package', slug: 'combined-package' })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['slug'], message: 'already in use' }]);
  });

  it('PUT slug failing the format → 400 with the slug field detail', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'admin-pkg-slugfmt@sevendays.test',
      put({ slug: 'Simple Package!' })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['slug']);
  });

  it('the old slug 404s publicly after a PUT rename — through the EXISTING public route', async () => {
    const created = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'admin-pkg-slugmove@sevendays.test',
      save({ name: 'Fresh Package' })
    );
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { id: string };
    const publicBefore = await app.request(
      '/api/v1/service-packages/fresh-package',
      undefined,
      testEnv(url)
    );
    expect(publicBefore.status).toBe(200);
    const renamed = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${createdBody.id}`,
      'admin-pkg-slugmove2@sevendays.test',
      save({ name: 'Fresh Package', slug: 'renamed-package' })
    );
    expect(renamed.status).toBe(200);
    const publicOld = await app.request(
      '/api/v1/service-packages/fresh-package',
      undefined,
      testEnv(url)
    );
    expect(publicOld.status).toBe(404);
    expect(await publicOld.json()).toEqual({ error: 'Package not found.' });
    const publicNew = await app.request(
      '/api/v1/service-packages/renamed-package',
      undefined,
      testEnv(url)
    );
    expect(publicNew.status).toBe(200);
  });

  it('PUT with an unknown reference → 400 AND the whole save rolled back (entity fields included)', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'admin-pkg-rollback@sevendays.test',
      put({
        name: 'Simple Package Renamed',
        slug: 'simple-package',
        inclusions: [
          {
            kind: 'print',
            quantity: 2,
            printSizeId: '00000000-0000-4000-8000-000000000000',
            attireIds: [ids.attireToga],
            description: null,
          },
        ],
      })
    );
    expect(res.status).toBe(400);
    const rows = await db
      .select({ name: servicePackages.name })
      .from(servicePackages)
      .where(eq(servicePackages.id, ids.packageSimple));
    expect(rows[0]?.name).toBe('Simple Package'); // the rename rolled back too
    const inclusions = await db
      .select({ id: packageInclusions.id })
      .from(packageInclusions)
      .where(eq(packageInclusions.servicePackageId, ids.packageSimple));
    expect(inclusions).toHaveLength(1); // the original inclusion survives
  });

  it('the old junction rows are gone after a rewrite (junction pairs match the payload)', async () => {
    await authed(
      'PUT',
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      'admin-pkg-junctions@sevendays.test',
      put({
        inclusions: [
          {
            kind: 'privilege',
            quantity: null,
            printSizeId: null,
            attireIds: [],
            description: 'High Resolution soft copies',
          },
        ],
        frames: [],
      })
    );
    const inclusionRows = await db
      .select({ id: packageInclusions.id })
      .from(packageInclusions)
      .where(eq(packageInclusions.servicePackageId, ids.packageCombined));
    expect(inclusionRows).toHaveLength(1);
    const junctions = await db
      .select({ id: packageInclusionAttires.id })
      .from(packageInclusionAttires)
      .where(
        inArray(
          packageInclusionAttires.inclusionId,
          inclusionRows.map((r) => r.id)
        )
      );
    // The cascaded rewrite left zero junction rows for the one remaining
    // (privilege) inclusion — the fixture's framed/print pairs are gone.
    expect(junctions).toHaveLength(0);
  });
});
