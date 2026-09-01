import { describe, expect, it } from 'vitest';
import app from './index.js';

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('stays top-level (infra, not versioned)', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });
});

describe('versioning mount', () => {
  it('serves routes under /api/v1', async () => {
    const res = await app.request('/api/v1/branches');
    expect([200, 500]).toContain(res.status); // db-reachable or loud 500 — never 404
  });

  it('does not serve the unversioned legacy path', async () => {
    const res = await app.request('/api/branches');
    expect(res.status).toBe(404);
  });
});
