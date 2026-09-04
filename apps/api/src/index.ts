import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './env.js';
import { v1 } from './routes/v1.js';
import { internalError } from './services/errors.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', cors({ origin: '*' })); // TODO(M6): restrict once domains exist.

// All body/query validation goes through the validated() helper so failures
// carry the uniform { error, details } shape — never raw zValidator.
// See services/validator.ts.

// Uniform error envelope (candidate D / ADR-0006): every thrown error — from
// the versioned routes, the acquisition middleware (Task 2), or any future
// handler — lands here, is logged once (workerd-safe console.error, no new
// dependency) with the route that threw it, and returns the single 500 JSON
// shape. Replaces the per-route try/catch + silent swallow that let deploy
// blocker #2 ship invisible (M1.5). Health stays mounted outside v1, so a db
// outage is visible as 500s while uptime monitoring still sees the Worker up.
app.onError((error, c) => {
  console.error(`[api] ${c.req.method} ${c.req.path} failed:`, error);
  return internalError(c);
});

// Uniform 404 envelope (closes the 404 half of the 404/405 ledger item):
// every unmounted path — including under /api/v1 — returns the JSON shape,
// never Hono's bare plain-text default (which would degrade the M2 api-client's
// response inference to `unknown`).
app.notFound((c) => c.json({ error: 'Not found.' }, 404));

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/api/v1', v1);

export default app;
