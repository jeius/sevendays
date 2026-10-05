import { PinoTransport } from '@loglayer/transport-pino';
import { LogLayer } from 'loglayer';
import { pino } from 'pino/browser';
import type { Env } from '../env.js';

// The Application Log's sink (M6 #183, spec § logging): LogLayer over pino's
// BROWSER build, one JSON string per event on console.log — the exact shape
// Workers Logs ingests when the [observability] block is enabled, and the
// seam the test suites spy. The explicit `pino/browser` subpath is
// load-bearing: the root entry resolves to the Node build (sonic-boom on
// fd 1, absent under workerd), while the browser entry is pure JS
// (quick-format-unescaped + @pinojs/redact, zero Node builtins — verified
// 2026-10-05) and resolves identically under wrangler's esbuild and vitest.
// The emitted line is { time, level, ...bindings, ...metadata, msg } —
// LogLayer's compiled metadata object is pino's merge-object.
export type RequestLogger = LogLayer;

export function buildAppLogger(): LogLayer {
  const p = pino({
    level: 'trace', // LogLayer filters per-transport; let every class through
    browser: { write: (o) => console.log(JSON.stringify(o)) },
  });
  return new LogLayer({ transport: new PinoTransport({ logger: p }) });
}

// One base instance per isolate; per-request children bind the requestId.
// child() first is LOAD-BEARING: withContext mutates the instance it is
// called on (contextManager.appendContext + return this), so calling it on
// the singleton would leak every prior request's id into the next line.
// child() clones the context manager into a fresh instance; the child's own
// withContext then stamps this request's id onto that child only.
const appLogger = buildAppLogger();

export function createRequestLogger(requestId: string): RequestLogger {
  return appLogger.child().withContext({ requestId });
}

// The root app's environment: the request logger (set by requestLogging) and
// a structural slice of the BetterAuth session for the access line's actorId
// — the real SessionData is { session, user } and the id lives at user.id;
// typing only the slice keeps this module free of a services/auth import
// cycle while staying structurally satisfied by the real session.
export type RootEnv = {
  Bindings: Env;
  Variables: { logger: RequestLogger; session?: { user: { id: string } } };
};
