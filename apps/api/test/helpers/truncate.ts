// biome-ignore lint/performance/noNamespaceImport: the truncate list must be derived from whatever the schema barrel exports, not hand-listed; tree-shaking is irrelevant in a test helper
import * as schema from '@sevendays/db';
import { is, sql } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import type { TestDb } from './db.js';

/**
 * The truncate list is derived, not hand-kept (candidate C spec): every
 * public table exported by packages/db's schema barrel — `is(v, PgTable)`
 * and default-schema only. A new table added by a future migration is
 * truncated automatically once the schema barrel exports it; the mirror
 * drift the integration-test ADR (0008) warned about is structurally
 * closed.
 */
export function publicTableNames(): string[] {
  const names: string[] = [];
  for (const value of Object.values(schema)) {
    if (is(value, PgTable)) {
      const config = getTableConfig(value);
      if (config.schema === undefined) {
        names.push(config.name);
      }
    }
  }
  return names.sort();
}

export async function truncateAll(db: TestDb): Promise<void> {
  // Identifiers are quoted because the derived list now contains Postgres
  // reserved words (BetterAuth's `user` table — 42601 unquoted).
  await db.execute(
    sql.raw(
      `TRUNCATE ${publicTableNames()
        .map((n) => `"${n}"`)
        .join(', ')} RESTART IDENTITY CASCADE`
    )
  );
}
