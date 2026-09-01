import type { Database } from '@sevendays/db';
import { createDbClient } from '@sevendays/db';

let cached: Database | null = null;

/**
 * The API's db handle (ADR-0007): the pooled DATABASE_URL — Workers cannot
 * open raw TCP; prepare:false is required under transaction pooling.
 * Memoized per isolate; dev/tests re-create the worker per run, prod pools
 * isolates — postgres-js clients are safe to reuse across requests.
 */
export function createApiDb(connectionString: string): Database {
  if (!connectionString) {
    throw new TypeError(
      'DATABASE_URL is not set — the Worker needs the pooled connection secret per ADR-0007.'
    );
  }
  cached ??= createDbClient(connectionString);
  return cached;
}
