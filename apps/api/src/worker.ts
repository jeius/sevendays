// The Sentry Worker entry (M6 #184, spec § Sentry — the api via the Workers
// SDK). src/index.ts stays SDK-free (its test graph and the AppType export
// are untouched); this file is the wrangler main and the ONLY
// @sentry/cloudflare import in the api: withSentry initializes per request
// (env bindings are per-request under workerd) and auto-instruments the
// request path (traces at 100% — v1 traffic is far under any cap), while the
// explicit capture seam (observability/capture.ts) owns WHAT is captured:
// every 5xx + the curated 503 + email-send failures, never 4xx. A missing
// SENTRY_DSN leaves Sentry disabled (the no-op-without-DSN posture both
// frontends share). The explicit <Env> generic is load-bearing: the default
// generic is cloudflare:workers' env TYPE (a type-only import — the SDK's
// runtime build never imports the scheme).
import { captureException, withSentry } from '@sentry/cloudflare';
import type { Env } from './env.js';
import app from './index.js';
import { setErrorCapture } from './observability/capture.js';

export default withSentry<Env>((env) => {
  setErrorCapture((error) => captureException(error));
  return {
    dsn: env.SENTRY_DSN,
    release: env.SENTRY_RELEASE,
    environment: env.ENVIRONMENT ?? 'dev',
    sampleRate: 1,
    tracesSampleRate: 1,
    sendDefaultPii: false,
    initialScope: { tags: { app: 'api' } },
    // The SDK's withSentry auto-instruments Hono's error handler at this
    // version (instrumentHonoErrorHandler lives in withSentry.js), which
    // would capture onError errors itself and make the seam's capture a
    // silent no-op (core's same-object guard drops the duplicate). The
    // filter removes that integration so the explicit capture seam IS the
    // only capture path — same mechanism the stubbed-client tests assert.
    integrations: (defaults) => defaults.filter((integration) => integration.name !== 'Hono'),
  };
}, app);
