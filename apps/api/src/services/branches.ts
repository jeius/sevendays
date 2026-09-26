import type { Database } from '@sevendays/db';
import { branches } from '@sevendays/db';
import { asc, eq } from 'drizzle-orm';

/**
 * The public branches read (M5 #138): ACTIVE rows only, name-ordered, the
 * shape unchanged (the row-level flip, never a shape change). Gated
 * appointment reads resolve deactivated branches independently — they never
 * join this read (the appointments projection carries branchId; the
 * landing's confirmation join degrades to its documented '—' fallback).
 */
export async function listBranches(db: Database) {
  return db.select().from(branches).where(eq(branches.isActive, true)).orderBy(asc(branches.name));
}
