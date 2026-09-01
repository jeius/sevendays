import type { Database } from '@sevendays/db';
import { createDbClient } from '@sevendays/db';

/**
 * The API's db handle (ADR-0007): the pooled DATABASE_URL — Workers cannot
 * open raw TCP; prepare:false is required under transaction pooling.
 * Created fresh per request: workerd scopes I/O objects to the request that
 * created them, so a client memoized per isolate throws "Cannot perform I/O
 * on behalf of a different request" on every later call. Under Supavisor
 * transaction pooling (ADR-0007) per-request connections are the documented
 * pattern; request-scoped sockets are reclaimed when the request context
 * ends. Revisit with Hyperdrive only if volume demands it.
 */
export function createApiDb(connectionString: string): Database {
  if (!connectionString) {
    throw new TypeError(
      'DATABASE_URL is not set — the Worker needs the pooled connection secret per ADR-0007.'
    );
  }
  return createDbClient(connectionString);
}
