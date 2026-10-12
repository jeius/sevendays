import {
  appointmentAddonServices,
  appointments as appointmentsTable,
  attires as attiresTable,
  auditLog,
  branchStudioServices,
  frames as framesTable,
  galleryCategories as galleryCategoriesTable,
  galleryPhotos as galleryPhotosTable,
  packageInclusions as inclusionsTable,
  packageInclusionAttires as junctionsTable,
  servicePackages as servicePackagesTable,
  studioServiceAddonServices,
  testimonials as testimonialsTable,
} from '@sevendays/db';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds, GalleryFixtureIds } from './helpers/fixtures.js';
import { loadFixtures, loadGalleryFixtures } from './helpers/fixtures.js';
import { stubCommitBucket } from './helpers/r2-stub.js';
import { truncateAll } from './helpers/truncate.js';

// The guarded-DELETE contract suite (M7 #213): per-entity guard answers,
// cascades, object-delete ordering, the 401-before-validation ordering, and
// the freed name/slug. Appointments are inserted directly (the #212
// direct-db-state precedent) — the guard reads rows, not API history.
const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;
let gids: GalleryFixtureIds;

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
  gids = await loadGalleryFixtures(db);
});

describe('guarded DELETE — testimonials + gallery photos (blocked by nothing)', () => {
  it('testimonial deletes clean — 204 with no body, row gone, the audit row lands', async () => {
    const [row] = await db
      .select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.id, gids.testimonialA))
      .limit(1);
    if (!row) throw new Error('delete suite: testimonial fixture missing');
    const res = await authed(
      'DELETE',
      `/api/v1/admin/testimonials/${gids.testimonialA}`,
      'delete-testimonial-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    const remaining = await authed(
      'GET',
      '/api/v1/admin/testimonials',
      'delete-testimonial-list@sevendays.test'
    );
    const remainingIds = ((await remaining.json()) as { id: string }[]).map((t) => t.id);
    expect(remainingIds).not.toContain(gids.testimonialA);
    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, 'testimonial'), eq(auditLog.entityId, gids.testimonialA)))
      .limit(1);
    expect(auditRow?.action).toBe('delete');
    expect(auditRow?.summary).toBe(row.person);
  });

  it('testimonial unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/testimonials/00000000-0000-4000-8000-000000000000',
      'delete-testimonial-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Testimonial not found.' });
  });

  it('photo deletes clean — the R2 object goes with the row, exactly once, after the commit', async () => {
    const stub = stubCommitBucket();
    const [row] = await db
      .select()
      .from(galleryPhotosTable)
      .where(eq(galleryPhotosTable.id, gids.photoA))
      .limit(1);
    if (!row) throw new Error('delete suite: photo fixture missing');
    const { token } = await signUpSession(url, 'delete-photo-ok@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${gids.photoA}`,
      { method: 'DELETE', headers: bearer(token) },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(204);
    expect(stub.deleteCalls).toEqual([row.r2Key]);
    const [gone] = await db
      .select()
      .from(galleryPhotosTable)
      .where(eq(galleryPhotosTable.id, gids.photoA))
      .limit(1);
    expect(gone).toBeUndefined();
  });

  it('photo unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000',
      'delete-photo-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Photo not found.' });
  });
});

describe('guarded DELETE — the reference-guarded lookups', () => {
  it('category with photos → 400 naming the blocking family + count; nothing deleted', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/gallery-categories/${gids.categoryA}`,
      'delete-cat-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['photos'], message: 'contains 1 photo(s)' }],
    });
    const [row] = await db
      .select()
      .from(galleryCategoriesTable)
      .where(eq(galleryCategoriesTable.id, gids.categoryA))
      .limit(1);
    expect(row?.id).toBe(gids.categoryA);
  });

  it('category with no photos deletes clean (the deactivated one) — 204 + audit row', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/gallery-categories/${gids.categoryRetired}`,
      'delete-cat-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.entity, 'gallery-category'), eq(auditLog.entityId, gids.categoryRetired))
      )
      .limit(1);
    expect(auditRow?.action).toBe('delete');
  });

  it('category unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/gallery-categories/00000000-0000-4000-8000-000000000000',
      'delete-cat-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Gallery category not found.' });
  });

  it('print size resolved by inclusions → 400 with the inclusion count (fixture truth: 2)', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/print-sizes/${ids.printSize2R}`,
      'delete-print-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['inclusions'], message: 'used by 2 package inclusion(s)' }],
    });
  });

  it('a fresh print size deletes clean — create via POST, then DELETE → 204', async () => {
    const created = await authed(
      'POST',
      '/api/v1/admin/print-sizes',
      'delete-print-ok@sevendays.test',
      {
        code: 'Z9',
        description: 'Transient size.',
      }
    );
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const res = await authed(
      'DELETE',
      `/api/v1/admin/print-sizes/${id}`,
      'delete-print-ok2@sevendays.test'
    );
    expect(res.status).toBe(204);
  });

  it('print size unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/print-sizes/00000000-0000-4000-8000-000000000000',
      'delete-print-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Print size not found.' });
  });

  it('attire attached to inclusions → 400 with the junction count (fixture truth: 3)', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/attires/${ids.attireToga}`,
      'delete-attire-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['inclusions'], message: 'attached to 3 package inclusion(s)' }],
    });
  });

  it('attire with no junctions deletes clean — 204, row gone (the untouched fixture attire)', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/attires/${ids.attireUniform}`,
      'delete-attire-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const [gone] = await db
      .select()
      .from(attiresTable)
      .where(eq(attiresTable.id, ids.attireUniform))
      .limit(1);
    expect(gone).toBeUndefined();
  });

  it('attire unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/attires/00000000-0000-4000-8000-000000000000',
      'delete-attire-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Attire not found.' });
  });
});

const insertAppointment = async (overrides: Record<string, unknown> = {}) => {
  const [row] = await db
    .insert(appointmentsTable)
    .values({
      branchId: ids.branchA,
      servicePackageId: ids.packageCombined,
      customerName: 'History Holder',
      customerEmail: 'history@sevendays.test',
      customerPhone: '+63 900 000 000',
      scheduledAt: new Date('2026-01-15T09:00:00.000Z'),
      ...overrides,
    })
    .returning({ id: appointmentsTable.id });
  if (!row) throw new Error('delete suite: appointment insert returned no row');
  return row.id;
};

describe('guarded DELETE — the appointment-bearing entities (any Appointment ever)', () => {
  it('branch with any appointment → 400 with the appointment count', async () => {
    await insertAppointment({ branchId: ids.branchB, servicePackageId: ids.packageCombined });
    const res = await authed(
      'DELETE',
      `/api/v1/admin/branches/${ids.branchB}`,
      'delete-branch-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['appointments'], message: 'referenced by 1 appointment(s)' }],
    });
  });

  it('a CANCELLED appointment still blocks — "any Appointment ever" is status-blind', async () => {
    await insertAppointment({
      branchId: ids.branchB,
      servicePackageId: ids.packageCombined,
      status: 'cancelled',
    });
    const res = await authed(
      'DELETE',
      `/api/v1/admin/branches/${ids.branchB}`,
      'delete-branch-cancelled@sevendays.test'
    );
    expect(res.status).toBe(400);
  });

  it("branch with no appointments deletes clean — its matrix rows cascade, its siblings' stay, the audit row lands", async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/branches/${ids.branchB}`,
      'delete-branch-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const bLinks = await db
      .select()
      .from(branchStudioServices)
      .where(eq(branchStudioServices.branchId, ids.branchB));
    expect(bLinks).toHaveLength(0);
    const aLinks = await db
      .select()
      .from(branchStudioServices)
      .where(eq(branchStudioServices.branchId, ids.branchA));
    expect(aLinks).toHaveLength(3);
    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, 'branch'), eq(auditLog.entityId, ids.branchB)))
      .limit(1);
    expect(auditRow?.action).toBe('delete');
  });

  it('branch unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/branches/00000000-0000-4000-8000-000000000000',
      'delete-branch-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Branch not found.' });
  });

  it('add-on attached to any appointment → 400 (the snapshot junction is history)', async () => {
    const appointmentId = await insertAppointment({ servicePackageId: ids.packageCombined });
    await db
      .insert(appointmentAddonServices)
      .values({ appointmentId, addonServiceId: ids.addonMakeup });
    const res = await authed(
      'DELETE',
      `/api/v1/admin/addon-services/${ids.addonMakeup}`,
      'delete-addon-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['appointments'], message: 'referenced by 1 appointment(s)' }],
    });
  });

  it('add-on with no history deletes clean — its applicability-matrix rows cascade', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/addon-services/${ids.addonRetired}`,
      'delete-addon-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const retiredLinks = await db
      .select()
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.addonServiceId, ids.addonRetired));
    expect(retiredLinks).toHaveLength(0);
    const makeupLinks = await db
      .select()
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.addonServiceId, ids.addonMakeup));
    expect(makeupLinks).toHaveLength(1);
  });

  it('add-on unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/addon-services/00000000-0000-4000-8000-000000000000',
      'delete-addon-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Add-on Service not found.' });
  });

  it('studio service with any appointment → 400', async () => {
    await insertAppointment({ servicePackageId: null, studioServiceId: ids.servicePortrait });
    const res = await authed(
      'DELETE',
      `/api/v1/admin/studio-services/${ids.servicePortrait}`,
      'delete-service-blocked@sevendays.test'
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['appointments'], message: 'referenced by 1 appointment(s)' }],
    });
  });

  it("studio service with no history deletes clean — BOTH matrices' rows cascade", async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/studio-services/${ids.serviceStudio}`,
      'delete-service-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const branchLinks = await db
      .select()
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, ids.serviceStudio));
    expect(branchLinks).toHaveLength(0);
    const addonLinks = await db
      .select()
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, ids.serviceStudio));
    expect(addonLinks).toHaveLength(0);
    const portraitBranchLinks = await db
      .select()
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, ids.servicePortrait));
    expect(portraitBranchLinks).toHaveLength(2);
  });

  it('studio service unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/studio-services/00000000-0000-4000-8000-000000000000',
      'delete-service-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Studio Service not found.' });
  });

  it('package with any appointment → 400 — and a blocked delete never touches the bucket', async () => {
    await db
      .update(servicePackagesTable)
      .set({ coverImageKey: 'covers/00000000-0000-4000-8000-0000000000c1.jpg' })
      .where(eq(servicePackagesTable.id, ids.packageCombined));
    await insertAppointment({ servicePackageId: ids.packageCombined });
    const stub = stubCommitBucket();
    const { token } = await signUpSession(url, 'delete-package-blocked@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/service-packages/${ids.packageCombined}`,
      { method: 'DELETE', headers: bearer(token) },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Blocked by existing references.',
      details: [{ path: ['appointments'], message: 'referenced by 1 appointment(s)' }],
    });
    expect(stub.deleteCalls).toEqual([]);
  });

  it('package with no history deletes clean — frames, inclusions, and their junctions all go', async () => {
    const [inclusion] = await db
      .select({ id: inclusionsTable.id })
      .from(inclusionsTable)
      .where(eq(inclusionsTable.servicePackageId, ids.packageSimple))
      .limit(1);
    if (!inclusion) throw new Error('delete suite: simple-package inclusion missing');
    const res = await authed(
      'DELETE',
      `/api/v1/admin/service-packages/${ids.packageSimple}`,
      'delete-package-ok@sevendays.test'
    );
    expect(res.status).toBe(204);
    const frames = await db
      .select()
      .from(framesTable)
      .where(eq(framesTable.servicePackageId, ids.packageSimple));
    expect(frames).toHaveLength(0);
    const inclusions = await db
      .select()
      .from(inclusionsTable)
      .where(eq(inclusionsTable.servicePackageId, ids.packageSimple));
    expect(inclusions).toHaveLength(0);
    // The junctions rode the DB-level ON DELETE CASCADE on inclusion_id.
    const junctions = await db
      .select()
      .from(junctionsTable)
      .where(eq(junctionsTable.inclusionId, inclusion.id));
    expect(junctions).toHaveLength(0);
    const combinedInclusions = await db
      .select()
      .from(inclusionsTable)
      .where(eq(inclusionsTable.servicePackageId, ids.packageCombined));
    expect(combinedInclusions).toHaveLength(4);
  });

  it("the cover object deletes only after the row's commit", async () => {
    await db
      .update(servicePackagesTable)
      .set({ coverImageKey: 'covers/00000000-0000-4000-8000-0000000000c2.jpg' })
      .where(eq(servicePackagesTable.id, ids.packageRetired));
    const stub = stubCommitBucket();
    const { token } = await signUpSession(url, 'delete-package-cover@sevendays.test');
    const res = await app.request(
      `/api/v1/admin/service-packages/${ids.packageRetired}`,
      { method: 'DELETE', headers: bearer(token) },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(204);
    expect(stub.deleteCalls).toEqual(['covers/00000000-0000-4000-8000-0000000000c2.jpg']);
  });

  it('delete frees the unique name + slug — a new row may take both', async () => {
    const res = await authed(
      'DELETE',
      `/api/v1/admin/service-packages/${ids.packageRetired}`,
      'delete-package-free@sevendays.test'
    );
    expect(res.status).toBe(204);
    const created = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'delete-package-free2@sevendays.test',
      {
        name: 'Retired Package',
        description: 'Back by popular demand.',
        priceCents: 100000,
        durationMinutes: null,
        isActive: true,
        isFeatured: false,
        frames: [],
        inclusions: [],
      }
    );
    expect(created.status).toBe(201);
    expect(((await created.json()) as { slug: string }).slug).toBe('retired-package');
  });

  it('package unknown id → the uniform per-entity 404', async () => {
    const res = await authed(
      'DELETE',
      '/api/v1/admin/service-packages/00000000-0000-4000-8000-000000000000',
      'delete-package-404@sevendays.test'
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Package not found.' });
  });
});

describe('guarded DELETE — the 401 gate precedes validation (appointment-bearing half)', () => {
  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (branches)', async () => {
    const res = await app.request(
      '/api/v1/admin/branches/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (addon-services)', async () => {
    const res = await app.request(
      '/api/v1/admin/addon-services/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (studio-services)', async () => {
    const res = await app.request(
      '/api/v1/admin/studio-services/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (service-packages)', async () => {
    const res = await app.request(
      '/api/v1/admin/service-packages/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});

describe('guarded DELETE — the 401 gate precedes validation (this half)', () => {
  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (testimonials)', async () => {
    const res = await app.request(
      '/api/v1/admin/testimonials/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (gallery-photos)', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-photos/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (gallery-categories)', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-categories/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (print-sizes)', async () => {
    const res = await app.request(
      '/api/v1/admin/print-sizes/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('anonymous DELETE with a non-uuid id → 401 BEFORE validation (attires)', async () => {
    const res = await app.request(
      '/api/v1/admin/attires/not-a-uuid',
      { method: 'DELETE' },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });
});
