import { sql } from 'drizzle-orm';
import type { TestDb } from './db.js';

// Every public table in packages/db/src/schema (10 after 0000+0001). A new
// table added by a future migration must be added here too.
const TABLES = [
  'appointment_addon_services',
  'appointments',
  'package_inclusion_attires',
  'package_inclusions',
  'frames',
  'attires',
  'print_sizes',
  'service_packages',
  'addon_services',
  'branches',
] as const;

export async function truncateAll(db: TestDb): Promise<void> {
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`));
}
