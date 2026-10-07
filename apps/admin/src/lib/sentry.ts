// The Sentry options seam (M6 #184, spec § Sentry): a pure builder so the
// errors-only posture is one asserted literal — frontends errors at 100%,
// traces OFF, no session replay (PostHog owns web vitals/audience), PII off
// (sendDefaultPii false + the scaffold's stricter dataCollection block).
// src/instrument.ts is the only consumer; the lib-seam suite owns the
// no-DSN no-op (null) and every pinned option.
export interface SentryFrontendInit {
  dsn: string;
  release?: string;
  environment: string;
  sampleRate: 1;
  tracesSampleRate: 0;
  sendDefaultPii: false;
  sendClientReports: false;
  dataCollection: { userInfo: false; httpBodies: [] };
  initialScope: { tags: { app: 'admin' } };
}

const APP = 'admin' as const;

export function buildSentryOptions(input: {
  dsn: string | undefined;
  release: string | undefined;
  environment: string | undefined;
}): SentryFrontendInit | null {
  if (!input.dsn) return null;
  return {
    dsn: input.dsn,
    environment: input.environment ?? 'dev',
    ...(input.release !== undefined ? { release: input.release } : {}),
    sampleRate: 1,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    // Client-report tracking (the default) crashes module load in workerd:
    // @sentry/node-core's interval needs Node Timer .unref() and
    // process.on('beforeExit') — neither exists in the CF runtime the
    // frontends SSR in (the #197-class teaser 500s; local dev 500s once a
    // DSN is set). Dropped-event diagnostics add nothing to the
    // errors-only posture.
    sendClientReports: false,
    dataCollection: { userInfo: false, httpBodies: [] },
    initialScope: { tags: { app: APP } },
  };
}
