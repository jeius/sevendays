import { describe, expect, it } from 'vitest';
import { createAuth } from './auth';

// The M8 #286 config pin (ADR-0027): the ruled 60-second session cookie
// cache, asserted through the instance's RESOLVED options ($context resolves
// CPU-only — the drizzle adapter reads local metadata, never the database;
// probed live 2026-11-14 against better-auth 1.7.5). The library default
// (300 s) is deliberately overridden to the owner-ruled bound; the lifetime
// pins and the tanstack-start-cookies-last rule are re-pinned beside it so
// this session-block edit cannot regress them. No HTTP is exercised here —
// the cookie-lands-from-sign-in check is operational (#286, Task 7), per the
// spec's testing decision.
const stubUrl = 'postgres://stub:stub@localhost:5432/sevendays_stub';

describe('the admin auth session config (the #286 cookie-cache pin)', () => {
  it('pins the ruled 60-second cookie cache — overriding the library 300 s default', async () => {
    const ctx = await createAuth(stubUrl).$context;
    expect(ctx.options.session?.cookieCache).toEqual({ enabled: true, maxAge: 60 });
  });

  it('keeps the session lifetime pins (7-day expiry, daily refresh)', async () => {
    const ctx = await createAuth(stubUrl).$context;
    expect(ctx.options.session?.expiresIn).toBe(60 * 60 * 24 * 7);
    expect(ctx.options.session?.updateAge).toBe(60 * 60 * 24);
  });

  it('keeps the plugin order — tanstack-start-cookies stays last', async () => {
    const ctx = await createAuth(stubUrl).$context;
    const ids = (ctx.options.plugins ?? []).map((plugin) => plugin.id);
    expect(ids[ids.length - 1]).toBe('tanstack-start-cookies');
    expect(ids).toContain('admin');
  });
});
