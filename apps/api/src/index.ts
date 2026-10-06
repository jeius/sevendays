import { Hono } from 'hono';
import { captureError } from './observability/capture.js';
import { logError } from './observability/events.js';
import type { RootEnv } from './observability/logger.js';
import { requestLogging } from './observability/request-context.js';
import { v1 } from './routes/v1.js';
import { internalError, serviceUnavailable } from './services/errors.js';
import { MissingR2CredentialsError } from './services/media.js';

const app = new Hono<RootEnv>()
  .use('*', requestLogging)
  // The CORS surface is CLOSED (M6 #183, ruling #176): the wildcard
  // middleware is dropped, not narrowed — no browser ever calls this api
  // (every frontend call is server-side over the API service binding,
  // ADR-0016; the browser never holds the bearer token), so browsers stay
  // default-denied, the true posture. If a browser-facing surface ever
  // appears (v2 embedding), CORS arrives WITH that surface. The one real
  // browser-CORS surface stays the R2 bucket's presign allowlist
  // (docs/media-bucket-runbook.md).

  // All body/query validation goes through the validated* helpers so failures
  // carry the uniform { error, details } shape — never raw zValidator.
  // See services/validator.ts.

  // Uniform error envelope (candidate D / ADR-0006): every thrown error — from
  // the versioned routes, the acquisition middleware, or any future handler —
  // lands here, emits ONE structured error event through the request's child
  // logger (name/message/stack + requestId — the wrangler-tail answer), and
  // returns the single 500 JSON shape. Health stays mounted outside v1, so a
  // db outage is visible as 500s while uptime monitoring still sees the Worker
  // up. #184's Sentry capture rides this same seam.
  .onError((error, c) => {
    logError(c, error);
    // Sentry capture (M6 #184): one call covers every 5xx AND the curated
    // 503 — MissingR2CredentialsError reaches onError before the branch
    // below answers 503 — while 4xx reaches onError never. Whether a client
    // is registered at all is the worker entry's call (no-op without
    // SENTRY_DSN).
    captureError(error);
    // Leak-safe detail channel (#155): the one deploy-time misconfiguration
    // operators must tell apart from generic infra failure answers a curated
    // 503 line; every other throw keeps the uniform 500. The loud detail
    // (secret names, runbook path) stays in the error event above — never
    // the response.
    if (error instanceof MissingR2CredentialsError) {
      return serviceUnavailable(c, 'Media uploads are not configured.');
    }
    return internalError(c);
  })

  // Uniform 404 envelope (closes the 404 half of the 404/405 ledger item):
  // every unmounted path — including under /api/v1 — returns the JSON shape,
  // never Hono's bare plain-text default (which would degrade the M2 api-client's
  // response inference to `unknown`).
  .notFound((c) => c.json({ error: 'Not found.' }, 404))

  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/api/v1', v1);

export default app;

// Hono RPC type-sharing (ADR-0006): the client package type-imports this —
// a route change here re-typechecks the client, which is the drift-kill
// working as intended. Types-only: erased at runtime.
export type AppType = typeof app;
