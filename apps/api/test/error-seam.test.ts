import { describe, expect, it } from 'vitest';
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
