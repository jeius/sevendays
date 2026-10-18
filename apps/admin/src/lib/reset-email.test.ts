// The reset-email forward seam (M7 #221, ADR-0021): BetterAuth's
// sendResetPassword on the admin Worker forwards { to, url, name } over the
// API service binding to Task 1's internal endpoint. The seam NEVER throws
// (anti-enumeration: a 500 from the auth route leaks account existence) —
// every failure resolves { sent: false } and the caller logs. The mocked
// boundary is the deps.fetch the seam actually calls.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeSendResetPassword, sendResetEmailOverApi } from './reset-email';

const input = {
  to: 'owner@sevendays.ph',
  url: 'https://admin.example.workers.dev/api/auth/reset-password/tok?callbackURL=%2Flogin%2Freset',
  name: 'Test Owner',
};

const deps = (fetchImpl: typeof fetch) => ({
  fetch: fetchImpl,
  baseUrl: 'http://api.test',
  token: 'shared-secret-token',
});

describe('sendResetEmailOverApi (M7 #221 — the never-throwing forward seam)', () => {
  it('POSTs the pinned URL with the shared-secret header and the exact body', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ status: true }), { status: 200 })
    );
    const result = await sendResetEmailOverApi(input, deps(fetchImpl));
    expect(result).toEqual({ sent: true, status: 200 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('http://api.test/internal/reset-email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': 'shared-secret-token',
      },
      body: JSON.stringify(input),
    });
  });

  it('resolves { sent: false, status } on the guarded failures (401) — never throws', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401 })
    );
    const result = await sendResetEmailOverApi(input, deps(fetchImpl));
    expect(result).toEqual({ sent: false, status: 401 });
  });

  it('resolves { sent: false } when fetch itself rejects (binding down) — never throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('binding unavailable');
    });
    const result = await sendResetEmailOverApi(input, deps(fetchImpl));
    expect(result).toEqual({ sent: false });
  });
});

describe('makeSendResetPassword (M7 #221 — the BetterAuth callback wrapper)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards { to, url, name } from BetterAuth params and swallows a failed send (logs, never throws)', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Email send failed.' }), { status: 502 })
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sendResetPassword = makeSendResetPassword(deps(fetchImpl));
    await expect(
      sendResetPassword({
        user: { email: 'owner@sevendays.ph', name: 'Test Owner' },
        url: input.url,
        token: 'tok',
      })
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
