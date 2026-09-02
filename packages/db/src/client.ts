import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

/**
 * The one db client (ADR-0007): `prepare: false` is required under Supabase
 * transaction-mode pooling. Callers pass the URL their runtime owns — the
 * deployed Worker its pooled `DATABASE_URL` secret (per-request, ADR-0011),
 * test harnesses `TEST_DATABASE_URL` (compose/CI).
 *
 * Usage: `createDbClient(connectionString)`
 */
export function createDbClient(connectionString: string) {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDbClient>;
export * from './schema/index.js';
