import type { Database } from '@sevendays/db';
import { addonServices, attires, branches, printSizes } from '@sevendays/db';
import type {
  CreateAddonServiceInput,
  CreateAttireInput,
  CreateBranchInput,
  CreatePrintSizeInput,
  UpdateAddonServiceInput,
  UpdateAttireInput,
  UpdateBranchInput,
  UpdatePrintSizeInput,
} from '@sevendays/types';
import { and, asc, eq, ne } from 'drizzle-orm';
import {
  type AdminCreateResult,
  type AdminWriteResult,
  conflict,
  guardUnique,
} from './admin-shared.js';

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
