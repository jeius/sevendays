import type { Database } from '@sevendays/db';
import { branches } from '@sevendays/db';
import { asc } from 'drizzle-orm';

export async function listBranches(db: Database) {
  return db.select().from(branches).orderBy(asc(branches.name));
}
