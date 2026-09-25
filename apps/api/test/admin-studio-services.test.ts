import { branchStudioServices, studioServiceAddonServices } from '@sevendays/db';
import { eq } from 'drizzle-orm';
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

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

describe('studio services admin CRUD', () => {
  it('GET / lists ALL rows including the deactivated fixture, links embedded', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/studio-services',
      'admin-services-list@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      name: string;
      isActive: boolean;
      bookableBranchIds: string[];
      applicableAddonServiceIds: string[];
    }[];
    expect(body).toHaveLength(3);
    const retired = body.find((s) => s.name === 'Retired Studio Service');
    expect(retired?.isActive).toBe(false);
    expect(retired?.bookableBranchIds).toEqual([ids.branchA]);
  });

  it('GET /:id returns the assembled read (links embedded regardless of add-on activity)', async () => {
    // serviceStudio carries a link to the RETIRED add-on — the admin read
    // shows it (the public read filters that link; this surface must not).
    const res = await authed(
      'GET',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'admin-services-get@sevendays.test'
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      applicableAddonServiceIds: string[];
      bookableBranchIds: string[];
    };
    expect(body.applicableAddonServiceIds).toEqual([ids.addonRetired]);
    expect(body.bookableBranchIds).toEqual([ids.branchA]);
  });

  it('GET /:id unknown → the per-entity 404', async () => {
    const res = await authed(
      'GET',
      '/api/v1/admin/studio-services/00000000-0000-4000-8000-000000000000',
      'admin-services-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Studio Service not found.' });
  });

  it('POST → 201 canonical read with empty link embeds (create carries no link fields)', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/studio-services',
      'admin-services-post@sevendays.test',
      {
        name: 'Photo Restoration',
        description: 'Restore old photographs.',
        priceCents: 45000,
      }
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      bookableBranchIds: string[];
      applicableAddonServiceIds: string[];
    };
    expect(typeof body.id).toBe('string');
    expect(body.bookableBranchIds).toEqual([]);
    expect(body.applicableAddonServiceIds).toEqual([]);
  });

  it('POST duplicate name → 400 with the name field detail', async () => {
    const res = await authed(
      'POST',
      '/api/v1/admin/studio-services',
      'admin-services-dup@sevendays.test',
      {
        name: 'Portraits & ID Photo',
        description: 'clash',
        priceCents: 1,
      }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('PUT flips isActive → 200', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'admin-services-put@sevendays.test',
      {
        name: 'Studio Portraits',
        description: 'Module-level service fixture.',
        priceCents: 70000,
        isActive: false,
      }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { isActive: boolean }).isActive).toBe(false);
  });

  it('PUT unknown id → 404', async () => {
    const res = await authed(
      'PUT',
      '/api/v1/admin/studio-services/00000000-0000-4000-8000-000000000000',
      'admin-services-put404@sevendays.test',
      { name: 'X', description: 'Y', priceCents: 1, isActive: true }
    );
    expect(res.status).toBe(404);
  });
});

describe('the branch matrix (PUT /:id/branches — full-replace, one transaction)', () => {
  it('full-replace round-trips: trim to one branch, then grow back — the diff rewrite', async () => {
    const first = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-a@sevendays.test',
      { branchIds: [ids.branchA] }
    );
    expect(first.status).toBe(200);
    expect(((await first.json()) as { bookableBranchIds: string[] }).bookableBranchIds).toEqual([
      ids.branchA,
    ]);

    const second = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-b@sevendays.test',
      { branchIds: [ids.branchB, ids.branchA] }
    );
    expect(second.status).toBe(200);
    const body = (await second.json()) as { bookableBranchIds: string[] };
    expect(body.bookableBranchIds.sort()).toEqual([ids.branchA, ids.branchB].sort());
  });

  it('an unknown branch id → 400 with the invalid detail AND the junction rows unchanged', async () => {
    const before = await db
      .select({ id: branchStudioServices.id })
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, ids.servicePortrait));
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-bad@sevendays.test',
      { branchIds: [ids.branchA, '00000000-0000-4000-8000-000000000000'] }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['branchIds']);
    const after = await db
      .select({ id: branchStudioServices.id })
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, ids.servicePortrait));
    expect(after).toHaveLength(before.length);
  });

  it('an empty payload removes every link (a service bookable nowhere is legal)', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-empty@sevendays.test',
      { branchIds: [] }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { bookableBranchIds: string[] }).bookableBranchIds).toEqual([]);
  });
});

describe('the add-on matrix (PUT /:id/addons — full-replace, one transaction)', () => {
  it('full-replace round-trips truthfully', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/addons`,
      'admin-matrix-addon-a@sevendays.test',
      { addonServiceIds: [ids.addonMakeup, ids.addonHairstyle] }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { applicableAddonServiceIds: string[] };
    expect(body.applicableAddonServiceIds.sort()).toEqual(
      [ids.addonMakeup, ids.addonHairstyle].sort()
    );
  });

  it('an unknown add-on id → 400 with the invalid detail AND the junction rows unchanged', async () => {
    const before = await db
      .select({ id: studioServiceAddonServices.id })
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, ids.servicePortrait));
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/addons`,
      'admin-matrix-addon-bad@sevendays.test',
      { addonServiceIds: ['00000000-0000-4000-8000-000000000000'] }
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: { path: string[]; message: string }[] };
    expect(body.details[0]?.path).toEqual(['addonServiceIds']);
    const after = await db
      .select({ id: studioServiceAddonServices.id })
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, ids.servicePortrait));
    expect(after).toHaveLength(before.length);
  });

  it('anonymous POST with a validation-bait body → the 401 envelope BEFORE validation', async () => {
    const res = await app.request(
      '/api/v1/admin/studio-services',
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
