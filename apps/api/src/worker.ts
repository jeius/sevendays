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
// runtime build never imports the scheme). The default honoIntegration is
// inert here — nothing invokes it without @sentry/hono's middleware, so the
// capture seam is the only capture path (verified against
// @sentry/cloudflare 10.72.0's integrations/hono.js).
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
  };
}, app);
