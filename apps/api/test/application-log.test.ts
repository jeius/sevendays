import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

// The Application Log seam: the sink writes one JSON string per event to
// console.log (Task 1's logger.ts) — capture exactly that, parse it, and
// assert against what `wrangler tail` would show.
const captureLines = () => {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(String(args[0]));
  });
  return lines;
};

const parse = (lines: string[]) =>
  lines
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((line): line is Record<string, unknown> => line !== null);

const byEvt = (lines: string[], evt: string) => parse(lines).filter((line) => line.evt === evt);

beforeEach(async () => {
  await truncateAll(db);
  await loadFixtures(db);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the access line + requestId contract (M6 #183)', () => {
  it('GET /api/v1/branches → exactly one access line with the ruled keys; requestId matches X-Request-Id; no actorId on a public route', async () => {
    const lines = captureLines();
    const res = await app.request('/api/v1/branches', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const requestId = res.headers.get('x-request-id');
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    const access = byEvt(lines, 'access');
    expect(access).toHaveLength(1);
    const [line] = access;
    if (!line) throw new Error('expected one access line');
    expect(Object.keys(line).sort()).toEqual([
      'durationMs',
      'evt',
      'level',
      'method',
      'msg',
      'requestId',
      'route',
      'status',
      'time',
    ]);
    expect(line.requestId).toBe(requestId);
    expect(line.method).toBe('GET');
    expect(line.route).toBe('/api/v1/branches');
    expect(line.status).toBe(200);
    expect(typeof line.durationMs).toBe('number');
    expect(parse(lines).every((parsed) => parsed.evt !== 'error')).toBe(true);
  });

  it('/health → NO access line (uptime-probe noise stays out), but the response still carries X-Request-Id', async () => {
    const lines = captureLines();
    const res = await app.request('/health', undefined, { DATABASE_URL: '' });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(parse(lines)).toEqual([]); // nothing at all — /health is silent
  });

  it('an unmounted path → an access line with status 404 and the raw path as route', async () => {
    const lines = captureLines();
    const res = await app.request('/nope', undefined, testEnv(url));
    expect(res.status).toBe(404);
    const [line] = byEvt(lines, 'access');
    if (!line) throw new Error('expected one access line');
    expect(line.status).toBe(404);
    expect(line.route).toBe('/nope'); // routePath is '' when unmatched → raw path
  });

  it('a thrown handler error → an access line at 500 PLUS one error line, both keyed to the response header; the error class carries name/message/stack', async () => {
    const lines = captureLines();
    // Refused port: the per-request client builds fine, the handler's query
    // throws (the error-seam precedent — postgres.js fails in ~4-10ms).
    const res = await app.request('/api/v1/branches', undefined, {
      ...testEnv(url),
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:1/sevendays_test',
    });
    expect(res.status).toBe(500);
    const requestId = res.headers.get('x-request-id');
    const [access] = byEvt(lines, 'access');
    const [error] = byEvt(lines, 'error');
    if (!access || !error) throw new Error('expected one access + one error line');
    expect(access.status).toBe(500);
    expect(access.requestId).toBe(requestId);
    expect(error.requestId).toBe(requestId);
    expect(Object.keys(error).sort()).toEqual([
      'evt',
      'level',
      'message',
      'method',
      'msg',
      'name',
      'requestId',
      'route',
      'stack',
      'time',
    ]);
    // drizzle-orm 0.45.2 wraps the driver failure as DrizzleQueryError —
    // message names the failing query, the raw cause rides .cause. The
    // wrapper's constructor never sets .name, so the emitted line's name
    // reads 'Error'; assert the wrapper-identifying message instead.
    expect(String(error.message)).toMatch(/Failed query/);
    expect(typeof error.stack).toBe('string');
  });

  it('a session-gated read → the access line carries actorId (the verified session), keyed to the token owner', async () => {
    const lines = captureLines();
    const { token, userId } = await signUpSession(url, 'access-actor@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/service-packages',
      { headers: bearer(token) },
      testEnv(url)
    );
    expect(res.status).toBe(200);
    const [line] = byEvt(lines, 'access');
    if (!line) throw new Error('expected one access line');
    expect(line.actorId).toBe(userId);
  });

  it('no ACAO header anywhere — the wildcard CORS middleware is gone (the closed surface, #176)', async () => {
    const ok = await app.request('/api/v1/branches', undefined, testEnv(url));
    const missing = await app.request('/nope', undefined, testEnv(url));
    for (const res of [ok, missing]) {
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    }
  });
});
