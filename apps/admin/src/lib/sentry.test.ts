import { describe, expect, it } from 'vitest';
import { buildSentryOptions } from './sentry';

// The errors-only posture as one asserted literal (M6 #184, spec § Sentry):
// frontends errors at 100%, traces OFF, no replay, PII off. The no-DSN
// no-op is the AC's dev posture — Sentry.init is never called on null.
describe('buildSentryOptions (M6 #184)', () => {
  it('returns null when the DSN is missing — init is never called', () => {
    expect(
      buildSentryOptions({ dsn: undefined, release: 'abc123', environment: 'teaser' })
    ).toBeNull();
  });

  it('builds the exact errors-only options with the app tag and full env', () => {
    expect(
      buildSentryOptions({
        dsn: 'https://key@o0.ingest.sentry.io/0',
        release: 'abc123',
        environment: 'teaser',
      })
    ).toEqual({
      dsn: 'https://key@o0.ingest.sentry.io/0',
      release: 'abc123',
      environment: 'teaser',
      sampleRate: 1,
      tracesSampleRate: 0,
      sendDefaultPii: false,
      dataCollection: { userInfo: false, httpBodies: [] },
      initialScope: { tags: { app: 'admin' } },
    });
  });

  it("defaults the environment to 'dev' when unset (local dev)", () => {
    const options = buildSentryOptions({
      dsn: 'https://key@o0.ingest.sentry.io/0',
      release: undefined,
      environment: undefined,
    });
    expect(options?.environment).toBe('dev');
  });

  it('omits the release key entirely when unset (no empty-string release tag)', () => {
    const options = buildSentryOptions({
      dsn: 'https://key@o0.ingest.sentry.io/0',
      release: undefined,
      environment: 'dev',
    });
    expect(options && 'release' in options).toBe(false);
  });
});
