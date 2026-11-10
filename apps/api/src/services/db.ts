import type { Database } from '@sevendays/db';
import { createDbClient } from '@sevendays/db';
import type { Env } from '../env.js';
import type { RequestLogger } from '../observability/logger.js';
import type { SessionData } from './auth.js';

// The API's request context (ADR-0011 + candidate D): the per-request db
// handle lives in Hono variables, set once by the acquisition middleware on
// /api/v1 and read by every route handler. Bindings are the Zod-validated
// Env from src/env.ts. `session` is set ONLY by requireSession (M4 ticket
// 04) — optional so ungated routes don't carry a lying type. `logger` is set
// by requestLogging at the ROOT (M6 #183) — required, because the middleware
// precedes every route including /health; requestId is set by the same root
// middleware (#185 — the audit rows read it).
export type ApiEnv = {
  Bindings: Env;
  Variables: { db: Database; session?: SessionData; logger: RequestLogger; requestId: string };
};

/**
 * The API's db handle (ADR-0007 + ADR-0024): the connection string is the
 * HYPERDRIVE binding's when present — Hyperdrive fronts the Supavisor
 * transaction pooler, so the dial is a local handoff instead of a full TLS
 * handshake per request (the free-plan CPU cliff, 2026-11-09) — else the
 * pooled DATABASE_URL fallback (vitest, the admin's vite dev, break-glass
 * rollback — the api's local dev boots on the emulated binding's Hyperdrive
 * local-connection var). prepare:false is required under transaction pooling
 * either way.
 * Created fresh per request: workerd scopes I/O objects to the request that
 * created them, so a client memoized per isolate throws "Cannot perform I/O
 * on behalf of a different request" on every later call. Hyperdrive changes
 * what the dial COSTS, not this law — the client is still per-request
 * (ADR-0011); request-scoped sockets are reclaimed when the request context
 * ends.
 *
 * Called once per request by the acquisition middleware (routes/v1.ts);
 * a missing source — neither binding nor URL — throws here and propagates
 * to the root onError as the uniform 500 (never the framework's plain-text
 * default). The schema keeps both sources optional, so this throw is the
 * live owner of the both-absent failure.
 */
export function createApiDb(connectionString: string | undefined): Database {
  if (!connectionString) {
    throw new TypeError(
      'No database source — set the HYPERDRIVE binding (production, ADR-0024) or DATABASE_URL (fallback, ADR-0007). Neither is present.'
    );
  }
  return createDbClient(connectionString);
}
