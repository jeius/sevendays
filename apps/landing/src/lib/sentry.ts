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
  dataCollection: { userInfo: false; httpBodies: [] };
  initialScope: { tags: { app: 'landing' } };
}

const APP = 'landing' as const;

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
    dataCollection: { userInfo: false, httpBodies: [] },
    initialScope: { tags: { app: APP } },
  };
}
