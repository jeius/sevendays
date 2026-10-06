import {
  auditLog,
  branches,
  branchStudioServices,
  studioServiceAddonServices,
} from '@sevendays/db';
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
    // The round-trip (#137 T9): the assembled admin GET still shows the
    // deactivated service — links embedded, isActive false.
    const after = await authed(
      'GET',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'admin-services-put-after@sevendays.test'
    );
    expect(after.status).toBe(200);
    expect(((await after.json()) as { isActive: boolean }).isActive).toBe(false);
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

  it('a DEACTIVATED branch id still links — the existence check is deactivation-blind by ruling', async () => {
    // #137 T4 minor: the admin composes from admin reads (deactivated rows
    // included); activity filtering is read-side, never write-side.
    const [ghost] = await db
      .insert(branches)
      .values({
        name: 'Ghost Branch',
        address: 'Nowhere St',
        phone: '+63 900 000 009',
        isActive: false,
      })
      .returning({ id: branches.id });
    if (!ghost) throw new Error('ghost branch insert returned no row');
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/branches`,
      'admin-matrix-branch-ghost@sevendays.test',
      { branchIds: [ghost.id] }
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { bookableBranchIds: string[] }).bookableBranchIds).toEqual([
      ghost.id,
    ]);
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

  it('a DEACTIVATED add-on id still links (deactivation-blind, same ruling)', async () => {
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${ids.servicePortrait}/addons`,
      'admin-matrix-addon-retired@sevendays.test',
      { addonServiceIds: [ids.addonRetired] }
    );
    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as { applicableAddonServiceIds: string[] }).applicableAddonServiceIds
    ).toEqual([ids.addonRetired]);
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

describe('audit rows (M6 #185 — one per committed mutation, tx-gated)', () => {
  const rows = async () => db.select().from(auditLog);

  it('POST → one create row with the service name; the actor is the caller', async () => {
    const res = await authed('POST', '/api/v1/admin/studio-services', 'audit-svc@sevendays.test', {
      name: 'Audit Service',
      description: 'For the audit row',
      priceCents: 1000,
    });
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      entity: 'studio-service',
      entityId: id,
      action: 'create',
      summary: 'Audit Service',
      actorEmail: 'audit-svc@sevendays.test',
    });
  });

  it('PUT flipping isActive → deactivate; a later same-state PUT (no flip) → update', async () => {
    const created = await authed(
      'POST',
      '/api/v1/admin/studio-services',
      'audit-svc-flip-a@sevendays.test',
      {
        name: 'Flip Service',
        description: 'd',
        priceCents: 2000,
      }
    );
    const { id } = (await created.json()) as { id: string };
    const body = { name: 'Flip Service', description: 'd', priceCents: 2000 };
    const off = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${id}`,
      'audit-svc-flip-b@sevendays.test',
      {
        ...body,
        isActive: false,
      }
    );
    expect(off.status).toBe(200);
    const stillOff = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${id}`,
      'audit-svc-flip-c@sevendays.test',
      {
        ...body,
        description: 'edited while off',
        isActive: false,
      }
    );
    expect(stillOff.status).toBe(200);
    const forSvc = (await rows()).filter((row) => row.entityId === id);
    expect(forSvc.filter((row) => row.action === 'create')).toHaveLength(1);
    expect(forSvc.filter((row) => row.action === 'deactivate')).toHaveLength(1);
    expect(forSvc.filter((row) => row.action === 'update')).toHaveLength(1);
  });

  it('the branch-matrix PUT → ONE update row (request-grain): entityId = the service, summary = its name; an unknown-branch 400 records nothing', async () => {
    const created = await authed(
      'POST',
      '/api/v1/admin/studio-services',
      'audit-matrix-a@sevendays.test',
      {
        name: 'Audit Matrix Service',
        description: 'd',
        priceCents: 3000,
      }
    );
    const { id } = (await created.json()) as { id: string };
    const ok = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${id}/branches`,
      'audit-matrix-b@sevendays.test',
      {
        branchIds: [ids.branchA],
      }
    );
    expect(ok.status).toBe(200);
    const bad = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${id}/branches`,
      'audit-matrix-c@sevendays.test',
      {
        branchIds: ['00000000-0000-4000-8000-0000000000ff'],
      }
    );
    expect(bad.status).toBe(400);
    const matrixRows = (await rows()).filter(
      (row) => row.entityId === id && row.action === 'update'
    );
    expect(matrixRows).toHaveLength(1);
    expect(matrixRows[0]).toMatchObject({
      entity: 'studio-service',
      summary: 'Audit Matrix Service',
    });
  });
});
