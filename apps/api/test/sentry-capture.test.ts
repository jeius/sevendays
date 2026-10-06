import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { resetErrorCapture, setErrorCapture } from '../src/observability/capture.js';
import { testEnv } from './helpers/env.js';

const url = process.env.TEST_DATABASE_URL as string;

// The stubbed-client contract (M6 #184, AC 4): what the worker entry's
// withSentry registration receives, asserted at the seams the AC names. The
// 5xx + curated-503 captures ride the root onError; 4xx reaches it never
// (validated* helpers and requireSession return, they do not throw) — and
// the no-op default is the deployed posture before the owner sets SENTRY_DSN.
afterEach(() => {
  resetErrorCapture();
  vi.restoreAllMocks();
});

describe('Sentry capture at the onError seam (M6 #184)', () => {
  it('captures the thrown error on a forced 5xx', async () => {
    const captured: unknown[] = [];
    setErrorCapture((error) => captured.push(error));
    // Same forced 5xx as error-seam.test.ts: full env + a refused port —
    // the handler's query throws, drizzle wraps it as DrizzleQueryError.
    const res = await app.request('/api/v1/branches', undefined, {
      ...testEnv(url),
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
    });
    expect(res.status).toBe(500);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeInstanceOf(Error);
    expect((captured[0] as Error).message).toMatch(/Failed query/);
  });

  it('captures nothing by default — the no-op-before-registration posture', async () => {
    // No setErrorCapture call: the default capture is a no-op, so the same
    // 500 runs clean without a registered client (a deploy without
    // SENTRY_DSN, or any test that never injected a stub).
    const res = await app.request('/api/v1/branches', undefined, {
      ...testEnv(url),
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
    });
    expect(res.status).toBe(500);
  });

  it('never captures a 404 (unmounted paths bypass onError)', async () => {
    const captured: unknown[] = [];
    setErrorCapture((error) => captured.push(error));
    const res = await app.request('/api/v1/unknown', undefined, testEnv(url));
    expect(res.status).toBe(404);
    expect(captured).toHaveLength(0);
  });
});
