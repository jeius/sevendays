import { session as sessionTable } from '@sevendays/db';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { acquireDb } from '../src/routes/v1.js';
import { requireSession } from '../src/services/auth.js';
import type { ApiEnv } from '../src/services/db.js';
import { signOutSession, signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

// The middleware's semantics are proven on a scratch app — acquireDb +
// requireSession + a probe route — because the gate is route-independent
// (M5 mounts CMS routes behind it). Deliberately free of booking-path
// strings so the v1 pick carries this file (the audit-token discipline);
// the gated-list application tests live in the dedicated suite.
const scratch = new Hono<ApiEnv>()
  .use('*', acquireDb)
  .get('/protected', requireSession, (c) => c.json({ userId: c.get('session')?.user.id ?? null }));

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

beforeEach(async () => {
  await truncateAll(db);
});

describe('requireSession (scratch app, real Postgres)', () => {
  it('returns the uniform 401 envelope with no Authorization header', async () => {
    const res = await scratch.request('/protected', undefined, testEnv(url));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('returns 401 for a garbage bare token', async () => {
    const res = await scratch.request(
      '/protected',
      { headers: bearer('not-a-real-token') },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Authentication required.');
  });

  it('returns 401 for a signed-form token whose signature fails verification', async () => {
    const res = await scratch.request(
      '/protected',
      { headers: bearer('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.c2lnbmF0dXJl') },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Authentication required.');
  });

  it('returns 401 for an expired session (expires_at moved to the past)', async () => {
    const { token } = await signUpSession(url, 'expired@sevendays.test');
    // The stored row carries the BARE token; the harvested value is signed
    // (#119's verbatim-storage finding) — strip to the token segment to hit
    // the row, keep presenting the signed form to the middleware.
    await db
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(sessionTable.token, token.split('.')[0] ?? ''));
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(401);
  });

  it('returns 401 after sign-out revokes the session', async () => {
    const { token } = await signUpSession(url, 'revoked@sevendays.test');
    await signOutSession(url, token);
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(401);
  });

  it('passes a real session through and sets it into context', async () => {
    const { token, userId } = await signUpSession(url, 'valid@sevendays.test');
    const res = await scratch.request('/protected', { headers: bearer(token) }, testEnv(url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId });
  });

  it('throws (500) when BETTER_AUTH_SECRET is missing — no silent allow', async () => {
    const { token } = await signUpSession(url, 'secretless@sevendays.test');
    const { BETTER_AUTH_SECRET: _omit, ...envWithoutSecret } = testEnv(url);
    const res = await scratch.request('/protected', { headers: bearer(token) }, envWithoutSecret);
    // The scratch app mounts no onError (the root app's uniform-500 envelope
    // is error-seam.test.ts's coverage) — the bare 500 proves the throw.
    expect(res.status).toBe(500);
  });
});
