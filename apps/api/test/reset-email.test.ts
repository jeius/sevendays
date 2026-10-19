// The internal reset-email send endpoint (M7 #221, ADR-0021): guarded by the
// INTERNAL_SEND_TOKEN shared secret (the ADR's "reachable only from the two
// frontend Workers" made enforceable — the API Worker serves a public
// workers.dev URL), synchronous/result-returning (unlike ADR-0014's
// waitUntil), and PII-floor-clean (classified codes only, never recipient
// text). The builder's copy is pinned here; the route's contract is pinned
// here; no db is involved or imported.

import { describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { EMAIL_FROM } from '../src/services/confirmation-email.js';
import { buildResetEmail } from '../src/services/reset-email.js';
import { testEnv } from './helpers/env.js';

// The Resend SDK is vi.mock'ed (the appointments/branches posture): no key,
// no network. `send` is a spy the route tests drive per-case.
const sendMock = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn(function Resend() {
    return { emails: { send: sendMock } };
  }),
}));

const URL_IN =
  'https://admin.example.workers.dev/api/auth/reset-password/tok123?callbackURL=%2Flogin%2Freset';
const BODY = JSON.stringify({ to: 'owner@sevendays.ph', url: URL_IN, name: 'Test Owner' });

const post = (env: Record<string, unknown>, body = BODY, token?: string) =>
  app.request(
    '/internal/reset-email',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { 'x-internal-token': token } : {}),
      },
      body,
    },
    env
  );

describe('buildResetEmail (M7 #221 — the pinned copy)', () => {
  it('renders the pinned subject, greeting, link, and expiry line; the name is HTML-escaped', () => {
    const email = buildResetEmail({
      to: 'owner@sevendays.ph',
      url: URL_IN,
      name: 'Owner & Co <studio>',
      from: EMAIL_FROM,
    });
    expect(email.subject).toBe('Reset your Sevendays Admin password');
    expect(email.from).toBe(EMAIL_FROM);
    expect(email.to).toBe('owner@sevendays.ph');
    expect(email.html).toContain('Hi Owner &amp; Co &lt;studio&gt;,');
    expect(email.html).toContain(`href="${URL_IN}"`);
    expect(email.html).toContain('This link expires in 1 hour.');
    expect(email.html).toContain('If you didn&rsquo;t request this, ignore this email');
  });

  it('uses the RESET_EMAIL_FROM override verbatim when provided', () => {
    const email = buildResetEmail({
      to: 'a@b.ph',
      url: URL_IN,
      name: 'A',
      from: 'Sevendays Photography <no-reply@sevendays.ph>',
    });
    expect(email.from).toBe('Sevendays Photography <no-reply@sevendays.ph>');
  });

  it('the URL is machine text and rides unescaped (the booking-URL precedent)', () => {
    const email = buildResetEmail({ to: 'a@b.ph', url: URL_IN, name: 'A', from: EMAIL_FROM });
    expect(email.html).toContain(`"${URL_IN}"`);
  });
});

describe('POST /internal/reset-email (M7 #221 — the guarded route)', () => {
  it('answers the curated 503 when INTERNAL_SEND_TOKEN is not provisioned', async () => {
    sendMock.mockClear();
    const res = await post(testEnv('postgres://stub:stub@localhost/db'));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Reset emails are not configured.' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('answers a uniform 401 when the header is missing or wrong', async () => {
    const env = {
      ...testEnv('postgres://stub:stub@localhost/db'),
      INTERNAL_SEND_TOKEN: 't'.repeat(40),
    };
    const noHeader = await post(env);
    expect(noHeader.status).toBe(401);
    expect(await noHeader.json()).toEqual({ error: 'Unauthorized.' });
    const wrong = await post(env, BODY, 'x'.repeat(40));
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual({ error: 'Unauthorized.' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid body with the house 400 (zod details through validatedJson)', async () => {
    const env = {
      ...testEnv('postgres://stub:stub@localhost/db'),
      INTERNAL_SEND_TOKEN: 't'.repeat(40),
    };
    const res = await post(env, JSON.stringify({ to: 'nope', url: 'nope' }), 't'.repeat(40));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details?: unknown };
    expect(body.error).toBeTruthy();
  });

  it('sends through the Resend seam and answers 200 { status: true } — payload pinned (from/to/subject, no idempotency key)', async () => {
    sendMock.mockClear();
    sendMock.mockResolvedValue({ data: { id: 're-1' }, error: null });
    const env = {
      ...testEnv('postgres://stub:stub@localhost/db'),
      INTERNAL_SEND_TOKEN: 't'.repeat(40),
      RESET_EMAIL_FROM: 'Sevendays Photography <no-reply@sevendays.ph>',
    };
    const res = await post(env, BODY, 't'.repeat(40));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [payload, options] = sendMock.mock.calls[0] as [
      { from: string; to: string; subject: string },
      Record<string, unknown> | undefined,
    ];
    expect(payload.from).toBe('Sevendays Photography <no-reply@sevendays.ph>');
    expect(payload.to).toBe('owner@sevendays.ph');
    expect(payload.subject).toBe('Reset your Sevendays Admin password');
    expect(options).toBeUndefined();
  });

  it('falls back to the sandbox EMAIL_FROM when RESET_EMAIL_FROM is unset', async () => {
    sendMock.mockClear();
    sendMock.mockResolvedValue({ data: { id: 're-2' }, error: null });
    const env = {
      ...testEnv('postgres://stub:stub@localhost/db'),
      INTERNAL_SEND_TOKEN: 't'.repeat(40),
    };
    await post(env, BODY, 't'.repeat(40));
    const [payload] = sendMock.mock.calls[0] as [{ from: string }];
    expect(payload.from).toBe(EMAIL_FROM);
  });

  it('a Resend rejection answers 502 with no free-text echo (the PII floor)', async () => {
    sendMock.mockClear();
    sendMock.mockResolvedValue({ data: null, error: { name: 'validation_error' } });
    const env = {
      ...testEnv('postgres://stub:stub@localhost/db'),
      INTERNAL_SEND_TOKEN: 't'.repeat(40),
    };
    const res = await post(env, BODY, 't'.repeat(40));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Email send failed.' });
  });
});
