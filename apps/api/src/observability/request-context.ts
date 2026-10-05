import type { MiddlewareHandler } from 'hono';
import { logAccess } from './events.js';
import { createRequestLogger, type RootEnv } from './logger.js';

// The requestId seam (M6 #183, spec § logging): one uuid minted per request,
// echoed as X-Request-Id on every response (quotable by any guest or staff
// member), and bound to the request-scoped child logger every event class
// emits through. The access line fires AFTER next() — Hono's compose runs
// onError at the deepest dispatch frame and sets context.res there, so this
// block sees the final status on success, 404, AND error paths (read from
// hono 4.13.5's dist/compose.js). /health is the one silent path: the header
// still rides the response, but no line is emitted (uptime-probe noise).
export const requestLogging: MiddlewareHandler<RootEnv> = async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('logger', createRequestLogger(requestId));
  c.header('x-request-id', requestId);
  const start = Date.now();
  await next();
  if (!c.res.headers.has('x-request-id')) {
    try {
      c.res.headers.set('x-request-id', requestId);
    } catch {
      // A raw Response with immutable headers (e.g. a fetched one) cannot be
      // mutated — the access line still carries the requestId.
    }
  }
  if (c.req.path !== '/health') {
    logAccess(c.get('logger'), {
      method: c.req.method,
      // routePath resolves to the registering middleware's wildcard (/* or
      // /api/v1/*) for 404s and middleware-thrown errors — it names nothing,
      // so the raw path stands in there; a matched route reports its pattern.
      route: c.req.routePath.includes('*') ? c.req.path : c.req.routePath,
      status: c.res.status,
      durationMs: Date.now() - start,
      actorId: c.get('session')?.user.id,
    });
  }
};
