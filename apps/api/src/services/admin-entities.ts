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
  AuditAction,
  BranchRead,
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
import type { Env } from '../env.js';
import { logMediaFailure } from '../observability/events.js';
import type { RequestLogger } from '../observability/logger.js';
import {
  type AdminCreateResult,
  type AdminWriteFailure,
  type AdminWriteResult,
  conflict,
  guardUnique,
  invalidRefs,
} from './admin-shared.js';
import { type AuditActor, writeAuditRow } from './audit.js';
import { groupChildren } from './group-children.js';
import { commitUpload, resolveMediaUrl } from './media.js';

// Admin CRUD for the simple catalog entities (M5 #137): list/get/create/
// update per entity — full-object PUTs, deactivation as the isActive flip,
// no deletes. Each entity's unique column rides BOTH conflict mechanisms:
// a deterministic pre-check answers the common case, guardUnique maps the
// PG 23505 race through the same 400-with-field-details vocabulary. Routes
// stay thin — every business fact lives here. M6 #185: every write now
// opens a transaction whose LAST statement is its audit row — the row
// commits exactly when the write does (the spec's transaction-is-the-gate
// ruling).

type PrintSizeRow = typeof printSizes.$inferSelect;
type AttireRow = typeof attires.$inferSelect;
type AddonServiceRow = typeof addonServices.$inferSelect;

const BRANCH_UNIQUE: Record<string, string> = { branches_name_unique: 'name' };
const PRINT_SIZE_UNIQUE: Record<string, string> = { print_sizes_code_unique: 'code' };
const ATTIRE_UNIQUE: Record<string, string> = { attires_name_unique: 'name' };
const ADDON_UNIQUE: Record<string, string> = { addon_services_name_unique: 'name' };

// --- branches ---------------------------------------------------------------

type BranchEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>;

type Detail = { path: string[]; message: string };

function toBranchRead(row: typeof branches.$inferSelect, env: BranchEnv): BranchRead {
  const { coverImageKey, ...rest } = row;
  return { ...rest, coverImageUrl: resolveMediaUrl(env, coverImageKey) };
}

// The branch-cover commit (M7 #214, admin-packages.ts's resolveCover
// controller ruling): HEAD-verify through commitUpload ONLY when a key is
// present — presence-encoding makes "changed" structural (stored keys are
// immutable final keys, inputs are staging keys, and the staging-key regex
// rejects final keys, so a present string is always a new bind).
// undefined = unchanged, null = clear, string = bind/replace. A commit
// failure re-paths its details onto the payload field and resolves as the
// conflict failure (→ 400). Runs BEFORE the transaction — bucket I/O
// never holds a tx open.
async function resolveBranchCover(
  env: BranchEnv,
  key: string | null | undefined,
  log?: RequestLogger
): Promise<{ ok: true; finalKey: string | null | undefined } | AdminWriteFailure> {
  if (key === undefined) return { ok: true, finalKey: undefined };
  if (key === null) return { ok: true, finalKey: null };
  const commit = await commitUpload(env.MEDIA_BUCKET, {
    stagingKey: key,
    purpose: 'branch-cover',
  });
  if (!commit.ok) {
    // M6 #183: the cover-commit seam's typed failure (see admin-packages's
    // resolveCover — the route-level 'conflict' cannot name it).
    if (log) {
      logMediaFailure(log, { op: 'commit', reason: commit.reason });
    }
    return {
      ok: false,
      reason: 'conflict',
      message: commit.message,
      details: (commit.details ?? [{ path: ['key'], message: commit.message }]).map(
        (detail): Detail => ({ path: ['coverImageKey'], message: detail.message })
      ),
    };
  }
  return { ok: true, finalKey: commit.finalKey };
}

export async function listAdminBranches(db: Database, env: BranchEnv): Promise<BranchRead[]> {
  // Admin read: ALL rows including deactivated (spec § Route topology),
  // covers resolved — raw keys never leave.
  const rows = await db.select().from(branches).orderBy(asc(branches.name));
  return rows.map((row) => toBranchRead(row, env));
}

export async function getAdminBranch(
  db: Database,
  env: BranchEnv,
  id: string
): Promise<BranchRead | null> {
  const [row] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return row ? toBranchRead(row, env) : null;
}

export async function createAdminBranch(
  db: Database,
  env: BranchEnv,
  audit: AuditActor,
  input: CreateBranchInput,
  log?: RequestLogger
): Promise<AdminCreateResult<BranchRead>> {
  const cover = await resolveBranchCover(env, input.coverImageKey, log);
  if (!cover.ok) return cover;
  const result = await guardUnique(BRANCH_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .insert(branches)
        .values({ ...input, coverImageKey: cover.finalKey ?? null })
        .returning();
      if (!row) throw new Error('insert branches: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'branch',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
  if (!result.ok) return result;
  return { ok: true, row: toBranchRead(result.row, env) };
}

export async function updateAdminBranch(
  db: Database,
  env: BranchEnv,
  audit: AuditActor,
  id: string,
  input: UpdateBranchInput,
  log?: RequestLogger
): Promise<AdminWriteResult<BranchRead>> {
  const current = await getAdminBranchRow(db, id);
  if (!current) return { ok: false, reason: 'not_found' };
  if (input.name !== current.name) {
    const [clash] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.name, input.name), ne(branches.id, id)))
      .limit(1);
    if (clash) return conflict('name');
  }
  const cover = await resolveBranchCover(env, input.coverImageKey, log);
  if (!cover.ok) return cover;
  // M6 #185: deactivation is a RULING on the flip — only true→false is
  // 'deactivate'; reactivation and edits of deactivated rows are 'update'.
  const action: AuditAction =
    current.isActive && input.isActive === false ? 'deactivate' : 'update';
  // The cover tri-state composes the stored key: absent = keep the
  // current one, null = clear, string = the committed final key.
  const storedCover = cover.finalKey === undefined ? current.coverImageKey : cover.finalKey;
  const result = await guardUnique(BRANCH_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(branches)
        .set({
          name: input.name,
          address: input.address,
          phone: input.phone,
          acceptsWalkIns: input.acceptsWalkIns,
          isActive: input.isActive,
          coverImageKey: storedCover,
          updatedAt: new Date(),
        })
        .where(eq(branches.id, id))
        .returning();
      if (!row) throw new Error('update branches: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'branch',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
  if (!result.ok) return result;
  // After-commit bucket hygiene (#137's precedent): the replaced/cleared
  // cover's old object is deleted only AFTER the save committed — a
  // rolled-back save never deletes (the row still points at it).
  if (current.coverImageKey && storedCover !== current.coverImageKey) {
    await env.MEDIA_BUCKET.delete(current.coverImageKey);
  }
  return { ok: true, row: toBranchRead(result.row, env) };
}

/** The raw-row read the update composes against (covers resolve at the end). */
async function getAdminBranchRow(db: Database, id: string) {
  const [row] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return row ?? null;
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
  audit: AuditActor,
  input: CreatePrintSizeInput
): Promise<AdminCreateResult<PrintSizeRow>> {
  return guardUnique(PRINT_SIZE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(printSizes).values(input).returning();
      if (!row) throw new Error('insert print_sizes: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'print-size',
        entityId: row.id,
        action: 'create',
        summary: row.code,
      });
      return row;
    })
  );
}

export async function updateAdminPrintSize(
  db: Database,
  audit: AuditActor,
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
  const action: AuditAction =
    current.isActive && input.isActive === false ? 'deactivate' : 'update';
  return guardUnique(PRINT_SIZE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(printSizes)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(printSizes.id, id))
        .returning();
      if (!row) throw new Error('update print_sizes: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'print-size',
        entityId: id,
        action,
        summary: row.code,
      });
      return row;
    })
  );
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
  audit: AuditActor,
  input: CreateAttireInput
): Promise<AdminCreateResult<AttireRow>> {
  return guardUnique(ATTIRE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(attires).values(input).returning();
      if (!row) throw new Error('insert attires: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'attire',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
}

export async function updateAdminAttire(
  db: Database,
  audit: AuditActor,
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
  const action: AuditAction =
    current.isActive && input.isActive === false ? 'deactivate' : 'update';
  return guardUnique(ATTIRE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(attires)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(attires.id, id))
        .returning();
      if (!row) throw new Error('update attires: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'attire',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
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
  audit: AuditActor,
  input: CreateAddonServiceInput
): Promise<AdminCreateResult<AddonServiceRow>> {
  return guardUnique(ADDON_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(addonServices).values(input).returning();
      if (!row) throw new Error('insert addon_services: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'addon-service',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
}

export async function updateAdminAddonService(
  db: Database,
  audit: AuditActor,
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
  const action: AuditAction =
    current.isActive && input.isActive === false ? 'deactivate' : 'update';
  return guardUnique(ADDON_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(addonServices)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(addonServices.id, id))
        .returning();
      if (!row) throw new Error('update addon_services: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'addon-service',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
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
  audit: AuditActor,
  input: CreateStudioServiceInput
): Promise<AdminCreateResult<StudioServiceWithBranches>> {
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(studioServices).values(input).returning();
      if (!row) throw new Error('insert studio_services: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'studio-service',
        entityId: row.id,
        action: 'create',
        summary: row.name,
      });
      return row;
    })
  );
  if (!result.ok) return result;
  const [assembled] = await assembleAdminStudioServices(db, [result.row]);
  if (!assembled) throw new Error('studio service create: assembly lost the row');
  return { ok: true, row: assembled };
}

export async function updateAdminStudioService(
  db: Database,
  audit: AuditActor,
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
  const action: AuditAction =
    current.isActive && input.isActive === false ? 'deactivate' : 'update';
  const result = await guardUnique(STUDIO_SERVICE_UNIQUE, () =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(studioServices)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(studioServices.id, id))
        .returning();
      if (!row) throw new Error('update studio_services: no row returned');
      await writeAuditRow(tx, audit, {
        entity: 'studio-service',
        entityId: id,
        action,
        summary: row.name,
      });
      return row;
    })
  );
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
  audit: AuditActor,
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
    // M6 #185: ONE row per matrix REQUEST (request-grain) — the junction
    // churn is the write; the row records the save, not the row count.
    await writeAuditRow(tx, audit, {
      entity: 'studio-service',
      entityId: id,
      action: 'update',
      summary: service.name,
    });
  });
  const read = await getAdminStudioService(db, id);
  if (!read) throw new Error('matrix save: read-back found no service row');
  return { ok: true, row: read };
}

/** The add-on matrix — the branch matrix one junction over (same contract). */
export async function setStudioServiceAddonMatrix(
  db: Database,
  audit: AuditActor,
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
    // M6 #185: ONE row per matrix REQUEST (request-grain) — the junction
    // churn is the write; the row records the save, not the row count.
    await writeAuditRow(tx, audit, {
      entity: 'studio-service',
      entityId: id,
      action: 'update',
      summary: service.name,
    });
  });
  const read = await getAdminStudioService(db, id);
  if (!read) throw new Error('matrix save: read-back found no service row');
  return { ok: true, row: read };
}
