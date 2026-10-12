import type { Database } from '@sevendays/db';
import {
  addonServices,
  appointmentAddonServices,
  appointments,
  attires,
  branches,
  branchStudioServices,
  frames,
  galleryCategories,
  galleryPhotos,
  packageInclusionAttires,
  packageInclusions,
  printSizes,
  servicePackages,
  studioServiceAddonServices,
  studioServices,
  testimonials,
} from '@sevendays/db';
import { count, eq } from 'drizzle-orm';
import type { PhotoEnv } from './admin-gallery.js';
import type { SaveEnv } from './admin-packages.js';
import type { AdminDetail } from './admin-shared.js';
import { type AuditActor, writeAuditRow } from './audit.js';

// The guarded-DELETE service (M7 #213, reversing M5's delete-nowhere per the
// M7 spec § Guarded DELETE everywhere): ONE contract across the nine CMS
// entities — a row is truly deletable only while nothing references it. A
// blocked delete resolves as the 'blocked' failure the thin routes map to
// the house 400-with-field-details (owner-ratified copy, 2026-10-12:
// 'Blocked by existing references.' + one count-bearing detail per blocking
// family). "Any Appointment ever" means ANY status including cancelled and
// no_show — the guards count rows, never filter status. Children and matrix
// rows cascade INSIDE the transaction as explicit deletes (only
// package_inclusion_attires rides its DB-level ON DELETE CASCADE on
// inclusion_id); covers and photos are ADR-0019 §5 lifecycle events — the
// DB commit lands FIRST, the object delete after (the #137 cover-replace
// precedent), so a blocked or rolled-back delete never touches the bucket.
// Every committed delete writes its audit row (action 'delete') as the
// transaction's last statement — the #185 law carried to the new action.

export type AdminDeleteFailure = {
  ok: false;
  reason: 'blocked';
  message: string;
  details: AdminDetail[];
};

export type AdminDeleteResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | AdminDeleteFailure;

/** The blocked-delete failure — the owner-ratified message, one detail per blocking family. */
function blocked(details: AdminDetail[]): AdminDeleteFailure {
  return { ok: false, reason: 'blocked', message: 'Blocked by existing references.', details };
}

// --- testimonials (blocked by nothing) ---------------------------------------

export async function deleteAdminTestimonial(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  await db.transaction(async (tx) => {
    await tx.delete(testimonials).where(eq(testimonials.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'testimonial',
      entityId: id,
      action: 'delete',
      summary: current.person,
    });
  });
  return { ok: true };
}

// --- gallery photos (blocked by nothing; the R2 object deletes with the row) -

export async function deleteAdminGalleryPhoto(
  db: Database,
  env: PhotoEnv,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  await db.transaction(async (tx) => {
    await tx.delete(galleryPhotos).where(eq(galleryPhotos.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'gallery-photo',
      entityId: id,
      action: 'delete',
      summary: current.title ?? current.r2Key,
    });
  });
  // ADR-0019 §5 lifecycle event: the row committed first; the object goes now.
  await env.MEDIA_BUCKET.delete(current.r2Key);
  return { ok: true };
}

// --- gallery categories (blocked by any photo in the category) ---------------

export async function deleteAdminGalleryCategory(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db
    .select()
    .from(galleryCategories)
    .where(eq(galleryCategories.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [photoCount] = await db
    .select({ value: count() })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.categoryId, id));
  const photos = photoCount?.value ?? 0;
  if (photos > 0) {
    return blocked([{ path: ['photos'], message: `contains ${photos} photo(s)` }]);
  }
  await db.transaction(async (tx) => {
    await tx.delete(galleryCategories).where(eq(galleryCategories.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'gallery-category',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}

// --- print sizes (blocked by any inclusion resolving them) -------------------

export async function deleteAdminPrintSize(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(printSizes).where(eq(printSizes.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [inclusionCount] = await db
    .select({ value: count() })
    .from(packageInclusions)
    .where(eq(packageInclusions.printSizeId, id));
  const inclusions = inclusionCount?.value ?? 0;
  if (inclusions > 0) {
    return blocked([
      { path: ['inclusions'], message: `used by ${inclusions} package inclusion(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    await tx.delete(printSizes).where(eq(printSizes.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'print-size',
      entityId: id,
      action: 'delete',
      summary: current.code,
    });
  });
  return { ok: true };
}

// --- attires (blocked by any inclusion-attire) -------------------------------

export async function deleteAdminAttire(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(attires).where(eq(attires.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [junctionCount] = await db
    .select({ value: count() })
    .from(packageInclusionAttires)
    .where(eq(packageInclusionAttires.attireId, id));
  const junctions = junctionCount?.value ?? 0;
  if (junctions > 0) {
    return blocked([
      { path: ['inclusions'], message: `attached to ${junctions} package inclusion(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    await tx.delete(attires).where(eq(attires.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'attire',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}

// --- branches (blocked by any Appointment ever; matrix rows cascade) --------

export async function deleteAdminBranch(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [apptCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(eq(appointments.branchId, id));
  const blocking = apptCount?.value ?? 0;
  if (blocking > 0) {
    return blocked([
      { path: ['appointments'], message: `referenced by ${blocking} appointment(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    // branch_id carries no DB-level cascade — the explicit delete IS the cascade.
    await tx.delete(branchStudioServices).where(eq(branchStudioServices.branchId, id));
    await tx.delete(branches).where(eq(branches.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'branch',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}

// --- add-on services (blocked by any Appointment ever; matrix rows cascade) --

export async function deleteAdminAddonService(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db.select().from(addonServices).where(eq(addonServices.id, id)).limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [attachmentCount] = await db
    .select({ value: count() })
    .from(appointmentAddonServices)
    .where(eq(appointmentAddonServices.addonServiceId, id));
  const blocking = attachmentCount?.value ?? 0;
  if (blocking > 0) {
    return blocked([
      { path: ['appointments'], message: `referenced by ${blocking} appointment(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.addonServiceId, id));
    await tx.delete(addonServices).where(eq(addonServices.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'addon-service',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}

// --- studio services (blocked by any Appointment ever; both matrices cascade)-

export async function deleteAdminStudioService(
  db: Database,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db
    .select()
    .from(studioServices)
    .where(eq(studioServices.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [apptCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(eq(appointments.studioServiceId, id));
  const blocking = apptCount?.value ?? 0;
  if (blocking > 0) {
    return blocked([
      { path: ['appointments'], message: `referenced by ${blocking} appointment(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    // Both matrices' studio_service_id sides DO carry DB-level cascades —
    // the explicit deletes keep the transaction's writes observable and
    // uniform with every other entity here.
    await tx.delete(branchStudioServices).where(eq(branchStudioServices.studioServiceId, id));
    await tx
      .delete(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, id));
    await tx.delete(studioServices).where(eq(studioServices.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'studio-service',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  return { ok: true };
}

// --- service packages (blocked by any Appointment ever; children cascade; ----
// --- the cover object deletes after the commit) ------------------------------

export async function deleteAdminPackage(
  db: Database,
  env: SaveEnv,
  audit: AuditActor,
  id: string
): Promise<AdminDeleteResult> {
  const [current] = await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  const [apptCount] = await db
    .select({ value: count() })
    .from(appointments)
    .where(eq(appointments.servicePackageId, id));
  const blocking = apptCount?.value ?? 0;
  if (blocking > 0) {
    return blocked([
      { path: ['appointments'], message: `referenced by ${blocking} appointment(s)` },
    ]);
  }
  await db.transaction(async (tx) => {
    // Inclusions before frames (inclusions hold the frame FK — the atomic
    // save's own order); the inclusion-attire junctions ride the DB-level
    // ON DELETE CASCADE on inclusion_id.
    await tx.delete(packageInclusions).where(eq(packageInclusions.servicePackageId, id));
    await tx.delete(frames).where(eq(frames.servicePackageId, id));
    await tx.delete(servicePackages).where(eq(servicePackages.id, id));
    await writeAuditRow(tx, audit, {
      entity: 'service-package',
      entityId: id,
      action: 'delete',
      summary: current.name,
    });
  });
  // ADR-0019 §5 + the #137 precedent: the cover object goes only after the
  // row's commit — a blocked or rolled-back delete never touches the bucket.
  if (current.coverImageKey) {
    await env.MEDIA_BUCKET.delete(current.coverImageKey);
  }
  return { ok: true };
}
