import type { Database } from '@sevendays/db';
import {
  addonServices,
  attires,
  branches,
  branchStudioServices,
  printSizes,
  studioServiceAddonServices,
  studioServices,
} from '@sevendays/db';
import type {
  CreateAddonServiceInput,
  CreateAttireInput,
  CreateBranchInput,
  CreatePrintSizeInput,
  CreateStudioServiceInput,
  StudioServiceWithBranches,
  UpdateAddonServiceInput,
  UpdateAttireInput,
  UpdateBranchInput,
  UpdatePrintSizeInput,
  UpdateStudioServiceInput,
} from '@sevendays/types';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import {
  type AdminCreateResult,
  type AdminWriteResult,
  conflict,
  guardUnique,
  invalidRefs,
} from './admin-shared.js';
import { groupChildren } from './group-children.js';

// Admin CRUD for the simple catalog entities (M5 #137): list/get/create/
// update per entity — full-object PUTs, deactivation as the isActive flip,
// no deletes. Each entity's unique column rides BOTH conflict mechanisms:
// a deterministic pre-check answers the common case, guardUnique maps the
// PG 23505 race through the same 400-with-field-details vocabulary. Routes
// stay thin — every business fact lives here.

type BranchRow = typeof branches.$inferSelect;
type PrintSizeRow = typeof printSizes.$inferSelect;
type AttireRow = typeof attires.$inferSelect;
type AddonServiceRow = typeof addonServices.$inferSelect;

const BRANCH_UNIQUE: Record<string, string> = { branches_name_unique: 'name' };
const PRINT_SIZE_UNIQUE: Record<string, string> = { print_sizes_code_unique: 'code' };
const ATTIRE_UNIQUE: Record<string, string> = { attires_name_unique: 'name' };
const ADDON_UNIQUE: Record<string, string> = { addon_services_name_unique: 'name' };

// --- branches ---------------------------------------------------------------

export async function listAdminBranches(db: Database): Promise<BranchRow[]> {
  // Admin read: ALL rows including deactivated (spec § Route topology).
  return db.select().from(branches).orderBy(asc(branches.name));
}

export async function getAdminBranch(db: Database, id: string): Promise<BranchRow | null> {
  const [row] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return row ?? null;
}

export function createAdminBranch(
  db: Database,
  input: CreateBranchInput
): Promise<AdminCreateResult<BranchRow>> {
  return guardUnique(BRANCH_UNIQUE, async () => {
    const [row] = await db.insert(branches).values(input).returning();
    if (!row) throw new Error('insert branches: no row returned');
    return row;
  });
}

export async function updateAdminBranch(
  db: Database,
  id: string,
  input: UpdateBranchInput
): Promise<AdminWriteResult<BranchRow>> {
  const current = await getAdminBranch(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.name, input.name), ne(branches.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  return guardUnique(BRANCH_UNIQUE, async () => {
    const [row] = await db
      .update(branches)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    if (!row) throw new Error('update branches: no row returned');
    return row;
  });
}

// --- print sizes ------------------------------------------------------------

export async function listAdminPrintSizes(db: Database): Promise<PrintSizeRow[]> {
  return db.select().from(printSizes).orderBy(asc(printSizes.code));
}

export async function getAdminPrintSize(db: Database, id: string): Promise<PrintSizeRow | null> {
  const [row] = await db.select().from(printSizes).where(eq(printSizes.id, id)).limit(1);
  return row ?? null;
}

export function createAdminPrintSize(
  db: Database,
  input: CreatePrintSizeInput
): Promise<AdminCreateResult<PrintSizeRow>> {
  return guardUnique(PRINT_SIZE_UNIQUE, async () => {
    const [row] = await db.insert(printSizes).values(input).returning();
    if (!row) throw new Error('insert print_sizes: no row returned');
    return row;
  });
}

export async function updateAdminPrintSize(
  db: Database,
  id: string,
  input: UpdatePrintSizeInput
): Promise<AdminWriteResult<PrintSizeRow>> {
  const current = await getAdminPrintSize(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.code !== current.code) {
    const [clash] = await db
      .select({ id: printSizes.id })
      .from(printSizes)
      .where(and(eq(printSizes.code, input.code), ne(printSizes.id, id)))
      .limit(1);
    if (clash) return conflict('code');
  }
  return guardUnique(PRINT_SIZE_UNIQUE, async () => {
    const [row] = await db
      .update(printSizes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(printSizes.id, id))
      .returning();
    if (!row) throw new Error('update print_sizes: no row returned');
    return row;
  });
}

// --- attires ----------------------------------------------------------------

export async function listAdminAttires(db: Database): Promise<AttireRow[]> {
  return db.select().from(attires).orderBy(asc(attires.name));
}

export async function getAdminAttire(db: Database, id: string): Promise<AttireRow | null> {
  const [row] = await db.select().from(attires).where(eq(attires.id, id)).limit(1);
  return row ?? null;
}

export function createAdminAttire(
  db: Database,
  input: CreateAttireInput
): Promise<AdminCreateResult<AttireRow>> {
  return guardUnique(ATTIRE_UNIQUE, async () => {
    const [row] = await db.insert(attires).values(input).returning();
    if (!row) throw new Error('insert attires: no row returned');
    return row;
  });
}

export async function updateAdminAttire(
  db: Database,
  id: string,
  input: UpdateAttireInput
): Promise<AdminWriteResult<AttireRow>> {
  const current = await getAdminAttire(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: attires.id })
      .from(attires)
      .where(and(eq(attires.name, input.name), ne(attires.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  return guardUnique(ATTIRE_UNIQUE, async () => {
    const [row] = await db
      .update(attires)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(attires.id, id))
      .returning();
    if (!row) throw new Error('update attires: no row returned');
    return row;
  });
}

// --- add-on services --------------------------------------------------------

export async function listAdminAddonServices(db: Database): Promise<AddonServiceRow[]> {
  return db.select().from(addonServices).orderBy(asc(addonServices.name));
}

export async function getAdminAddonService(
  db: Database,
  id: string
): Promise<AddonServiceRow | null> {
  const [row] = await db.select().from(addonServices).where(eq(addonServices.id, id)).limit(1);
  return row ?? null;
}

export function createAdminAddonService(
  db: Database,
  input: CreateAddonServiceInput
): Promise<AdminCreateResult<AddonServiceRow>> {
  return guardUnique(ADDON_UNIQUE, async () => {
    const [row] = await db.insert(addonServices).values(input).returning();
    if (!row) throw new Error('insert addon_services: no row returned');
    return row;
  });
}

export async function updateAdminAddonService(
  db: Database,
  id: string,
  input: UpdateAddonServiceInput
): Promise<AdminWriteResult<AddonServiceRow>> {
  const current = await getAdminAddonService(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: addonServices.id })
      .from(addonServices)
      .where(and(eq(addonServices.name, input.name), ne(addonServices.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  return guardUnique(ADDON_UNIQUE, async () => {
    const [row] = await db
      .update(addonServices)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(addonServices.id, id))
      .returning();
    if (!row) throw new Error('update addon_services: no row returned');
    return row;
  });
}

// --- studio services + the two applicability matrices ----------------------

type StudioServiceRow = typeof studioServices.$inferSelect;

const STUDIO_SERVICE_UNIQUE: Record<string, string> = { studio_services_name_unique: 'name' };

/**
 * The admin assembly: the StudioServiceWithBranches shape with ALL links
 * embedded (bare ids) — assembled WITHOUT the public read's activity
 * filters: a live link on a deactivated add-on is a staff-visible fact
 * here (the booking form's matrix keeps its own filter). Batched
 * two-embed read (no N+1); junction order = the createdAt proxy + id
 * tiebreak (the public read's convention — membership is the fact).
 */
async function assembleAdminStudioServices(
  db: Database,
  serviceRows: StudioServiceRow[]
): Promise<StudioServiceWithBranches[]> {
  const serviceIds = serviceRows.map((s) => s.id);
  const linkRows = await db
    .select({
      studioServiceId: branchStudioServices.studioServiceId,
      branchId: branchStudioServices.branchId,
    })
    .from(branchStudioServices)
    .where(inArray(branchStudioServices.studioServiceId, serviceIds))
    .orderBy(asc(branchStudioServices.createdAt), asc(branchStudioServices.id));
  const addonRows = await db
    .select({
      studioServiceId: studioServiceAddonServices.studioServiceId,
      addonServiceId: studioServiceAddonServices.addonServiceId,
    })
    .from(studioServiceAddonServices)
    .where(inArray(studioServiceAddonServices.studioServiceId, serviceIds))
    .orderBy(asc(studioServiceAddonServices.createdAt), asc(studioServiceAddonServices.id));
  const branchesByService = groupChildren(linkRows, (row) => row.studioServiceId);
  const addonsByService = groupChildren(addonRows, (row) => row.studioServiceId);
  return serviceRows.map((s) => ({
    ...s,
    bookableBranchIds: branchesByService(s.id).map((l) => l.branchId),
    applicableAddonServiceIds: addonsByService(s.id).map((l) => l.addonServiceId),
  }));
}

export async function listAdminStudioServices(db: Database): Promise<StudioServiceWithBranches[]> {
  const serviceRows = await db.select().from(studioServices).orderBy(asc(studioServices.name));
  if (serviceRows.length === 0) return [];
  return assembleAdminStudioServices(db, serviceRows);
}

export async function getAdminStudioService(
  db: Database,
  id: string
): Promise<StudioServiceWithBranches | null> {
  const [row] = await db.select().from(studioServices).where(eq(studioServices.id, id)).limit(1);
  if (!row) return null;
  const [assembled] = await assembleAdminStudioServices(db, [row]);
  return assembled ?? null;
}

export async function createAdminStudioService(
  db: Database,
  input: CreateStudioServiceInput
): Promise<AdminCreateResult<StudioServiceWithBranches>> {
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, async () => {
    const [row] = await db.insert(studioServices).values(input).returning();
    if (!row) throw new Error('insert studio_services: no row returned');
    return row;
  });
  if (!result.ok) return result;
  const [assembled] = await assembleAdminStudioServices(db, [result.row]);
  if (!assembled) throw new Error('studio service create: assembly lost the row');
  return { ok: true, row: assembled };
}

export async function updateAdminStudioService(
  db: Database,
  id: string,
  input: UpdateStudioServiceInput
): Promise<AdminWriteResult<StudioServiceWithBranches>> {
  const [current] = await db
    .select()
    .from(studioServices)
    .where(eq(studioServices.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: studioServices.id })
      .from(studioServices)
      .where(and(eq(studioServices.name, input.name), ne(studioServices.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, async () => {
    const [row] = await db
      .update(studioServices)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(studioServices.id, id))
      .returning();
    if (!row) throw new Error('update studio_services: no row returned');
    return row;
  });
  if (!result.ok) return result;
  const [assembled] = await assembleAdminStudioServices(db, [result.row]);
  if (!assembled) throw new Error('studio service update: assembly lost the row');
  return { ok: true, row: assembled };
}

/**
 * The branch matrix (spec § Route topology): full-replace keyed by the
 * service — diff the payload against the existing rows and rewrite inside
 * ONE transaction (delete net-missing by row id, insert net-new).
 * Duplicate payload ids collapse (presence-row semantics). The existence
 * check is DEACTIVATION-BLIND by ruling: the admin composes from admin
 * reads, which include deactivated rows; activity filtering is read-side.
 */
export async function setStudioServiceBranchMatrix(
  db: Database,
  id: string,
  branchIds: string[]
): Promise<AdminWriteResult<StudioServiceWithBranches>> {
  const [service] = await db
    .select()
    .from(studioServices)
    .where(eq(studioServices.id, id))
    .limit(1);
  if (!service) return { ok: false, reason: 'not_found' };
  const known = await db
    .select({ id: branches.id })
    .from(branches)
    .where(inArray(branches.id, branchIds));
  const knownIds = new Set(known.map((b) => b.id));
  const unknown = [...new Set(branchIds)].filter((branchId) => !knownIds.has(branchId));
  if (unknown.length > 0) {
    return invalidRefs(
      'Unknown branch in branchIds.',
      unknown.map((branchId) => ({ path: ['branchIds'], message: `unknown id ${branchId}` }))
    );
  }
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: branchStudioServices.id, branchId: branchStudioServices.branchId })
      .from(branchStudioServices)
      .where(eq(branchStudioServices.studioServiceId, id));
    const existingIds = new Set(existing.map((l) => l.branchId));
    const payloadIds = new Set(branchIds);
    const toRemove = existing.filter((l) => !payloadIds.has(l.branchId)).map((l) => l.id);
    if (toRemove.length > 0) {
      await tx.delete(branchStudioServices).where(inArray(branchStudioServices.id, toRemove));
    }
    const toAdd = [...payloadIds].filter((branchId) => !existingIds.has(branchId));
    if (toAdd.length > 0) {
      await tx
        .insert(branchStudioServices)
        .values(toAdd.map((branchId) => ({ studioServiceId: id, branchId })));
    }
  });
  const read = await getAdminStudioService(db, id);
  if (!read) throw new Error('matrix save: read-back found no service row');
  return { ok: true, row: read };
}

/** The add-on matrix — the branch matrix one junction over (same contract). */
export async function setStudioServiceAddonMatrix(
  db: Database,
  id: string,
  addonServiceIds: string[]
): Promise<AdminWriteResult<StudioServiceWithBranches>> {
  const [service] = await db
    .select()
    .from(studioServices)
    .where(eq(studioServices.id, id))
    .limit(1);
  if (!service) return { ok: false, reason: 'not_found' };
  const known = await db
    .select({ id: addonServices.id })
    .from(addonServices)
    .where(inArray(addonServices.id, addonServiceIds));
  const knownIds = new Set(known.map((a) => a.id));
  const unknown = [...new Set(addonServiceIds)].filter((addonId) => !knownIds.has(addonId));
  if (unknown.length > 0) {
    return invalidRefs(
      'Unknown add-on in addonServiceIds.',
      unknown.map((addonId) => ({ path: ['addonServiceIds'], message: `unknown id ${addonId}` }))
    );
  }
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: studioServiceAddonServices.id,
        addonServiceId: studioServiceAddonServices.addonServiceId,
      })
      .from(studioServiceAddonServices)
      .where(eq(studioServiceAddonServices.studioServiceId, id));
    const existingIds = new Set(existing.map((l) => l.addonServiceId));
    const payloadIds = new Set(addonServiceIds);
    const toRemove = existing.filter((l) => !payloadIds.has(l.addonServiceId)).map((l) => l.id);
    if (toRemove.length > 0) {
      await tx
        .delete(studioServiceAddonServices)
        .where(inArray(studioServiceAddonServices.id, toRemove));
    }
    const toAdd = [...payloadIds].filter((addonId) => !existingIds.has(addonId));
    if (toAdd.length > 0) {
      await tx
        .insert(studioServiceAddonServices)
        .values(toAdd.map((addonId) => ({ studioServiceId: id, addonServiceId: addonId })));
    }
  });
  const read = await getAdminStudioService(db, id);
  if (!read) throw new Error('matrix save: read-back found no service row');
  return { ok: true, row: read };
}
