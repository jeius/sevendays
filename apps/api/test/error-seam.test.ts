import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';

const url = process.env.TEST_DATABASE_URL as string;

// 404 half of the 404/405 ledger item: every unmounted path — top-level
// and under /api/v1 — returns the uniform JSON envelope, never Hono's
// bare plain-text default (which would degrade the M2 api-client to `unknown`).
describe('uniform 404 envelope', () => {
  it('returns uniform JSON 404 for an unknown path under /api/v1', async () => {
    const res = await app.request('/api/v1/unknown', undefined, { DATABASE_URL: url });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Not found.' });
  });

  it('returns uniform JSON 404 for a top-level unknown path', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found.' });
  });
});

// Health stays db-free (user story 5): the uptime probe never depends on the
// database, so a db outage is visible as 500s while monitoring sees the Worker up.
describe('GET /health', () => {
  it('stays 200 with no DATABASE_URL (db-independent)', async () => {
    const res = await app.request('/health', undefined, { DATABASE_URL: '' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

// 500 + log policy (closes "log-before-500" fully, user stories 2 + 6):
// every thrown error — from the acquisition middleware or a handler — reaches
// the root onError, which logs it once with the route and returns the uniform
// 500. Two distinct paths are proven over real Postgres via the in-app
// request style: a missing DATABASE_URL (middleware throws on acquisition) and
// a db error (handler's module call throws on a refused connection).
describe('uniform 500 envelope + logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns uniform 500 JSON when a handler/db error is thrown, and logs it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Refused port: postgres.js fails fast (~4-10ms, probe-verified); the
    // middleware creates the client fine, the handler's query throws.
    const res = await app.request('/api/v1/branches', undefined, {
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
    expect(spy.mock.calls.some((call) => String(call[0]).startsWith('[api]'))).toBe(true);
  });

  it('returns uniform 500 JSON when DATABASE_URL is missing (acquisition throws), and logs it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await app.request('/api/v1/branches', undefined, { DATABASE_URL: '' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
    expect(spy.mock.calls.some((call) => String(call[0]).includes('/api/v1/branches'))).toBe(true);
  });
});

// 405 deferral (spec Out of Scope): Hono has no built-in method-mismatch
// surface, so a GET-only route hit with POST returns 404 (not 405) today.
// Lock the current behavior so a future M2-pre-flight change can't silently
// regress it — 405 belongs beside that restructure, not here.
describe('method mismatch (405 deferred)', () => {
  it('returns 404 for POST on a GET-only route', async () => {
    const res = await app.request('/api/v1/branches', { method: 'POST' }, { DATABASE_URL: url });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found.' });
  });
});
