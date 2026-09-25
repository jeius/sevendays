import type { Database } from '@sevendays/db';
import { branches, printSizes } from '@sevendays/db';
import type {
  CreateBranchInput,
  CreatePrintSizeInput,
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

const BRANCH_UNIQUE: Record<string, string> = { branches_name_unique: 'name' };
const PRINT_SIZE_UNIQUE: Record<string, string> = { print_sizes_code_unique: 'code' };

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
