import { auditLog, testimonialSubmissions } from '@sevendays/db';
import { TESTIMONIAL_SUBMISSION_ACCEPTED } from '@sevendays/types';
import { desc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { loadGalleryFixtures } from './helpers/fixtures.js';
import { stubRateLimiter } from './helpers/rate-limit-stub.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const jsonHeaders = { 'content-type': 'application/json' };

const VALID = {
  quote: 'The photographer made our graduation shoot feel effortless.',
  person: 'Maria, batch 2026',
};

const post = async (body: unknown, env: Record<string, unknown> = {}, headers = {}) =>
  app.request(
    '/api/v1/testimonial-submissions',
    { method: 'POST', headers: { ...jsonHeaders, ...headers }, body: JSON.stringify(body) },
    { ...testEnv(url), ...env }
  );

// The authed moderation call (the mutation-log suite's authed shape).
const authed = async (method: string, path: string, email: string, body?: unknown) => {
  const { token } = await signUpSession(url, email);
  return app.request(
    path,
    {
      method,
      headers: { ...jsonHeaders, ...bearer(token) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(url)
  );
};

beforeEach(async () => {
  await truncateAll(db); // submissions arrive through the public POST — no fixtures
});

describe('POST /api/v1/testimonial-submissions (the public write)', () => {
  it('a valid payload → 201 with the pinned generic body verbatim; the row lands pending; no echo fields on the wire', async () => {
    const res = await post(VALID);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ ...TESTIMONIAL_SUBMISSION_ACCEPTED });
    expect(Object.keys(body)).toEqual(['message']);
    const rows = await db.select().from(testimonialSubmissions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('pending');
    expect(rows[0]?.quote).toBe(VALID.quote);
  });

  it('the bounds reject: quote 19 → 400 details on quote; person 1 → 400 details on person', async () => {
    const shortQuote = await post({ ...VALID, quote: 'x'.repeat(19) });
    expect(shortQuote.status).toBe(400);
    expect(
      ((await shortQuote.json()) as { details: { path: string[] }[] }).details[0]?.path
    ).toEqual(['quote']);
    const shortPerson = await post({ ...VALID, person: 'x' });
    expect(shortPerson.status).toBe(400);
    expect(
      ((await shortPerson.json()) as { details: { path: string[] }[] }).details[0]?.path
    ).toEqual(['person']);
    const rows = await db.select().from(testimonialSubmissions);
    expect(rows).toHaveLength(0); // nothing inserted on a 400
  });

  it('a filled honeypot → the identical 201 body and NO row (the silent discard)', async () => {
    const res = await post({ ...VALID, website: 'https://spam.example' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ...TESTIMONIAL_SUBMISSION_ACCEPTED });
    expect(await db.select().from(testimonialSubmissions)).toHaveLength(0);
  });

  it('the rate-limited gate: a failing stub → 429 with the ruled line; the key derives from CF-Connecting-IP, then X-Client-IP', async () => {
    const stub = stubRateLimiter(0); // every attempt over-limit
    const first = await post(
      VALID,
      { RATE_LIMITER: stub.limiter },
      { 'CF-Connecting-IP': '203.0.113.9' }
    );
    expect(first.status).toBe(429);
    expect(await first.json()).toEqual({
      error: "You're sending too fast — please wait a minute and try again.",
    });
    // No edge header → the landing-forwarded X-Client-IP is the key; and
    // when BOTH exist the edge header wins (unspoofable, direct callers).
    await post(VALID, { RATE_LIMITER: stub.limiter }, { 'X-Client-IP': '198.51.100.7' });
    await post(
      VALID,
      { RATE_LIMITER: stub.limiter },
      { 'CF-Connecting-IP': '203.0.113.9', 'X-Client-IP': '198.51.100.7' }
    );
    expect(stub.calls).toEqual(['203.0.113.9', '198.51.100.7', '203.0.113.9']);
    expect(await db.select().from(testimonialSubmissions)).toHaveLength(0);
  });

  it('the limit precedes validation: a failing stub + a garbage body → 429, not 400', async () => {
    const stub = stubRateLimiter(0);
    const res = await post({ quote: 42 }, { RATE_LIMITER: stub.limiter });
    expect(res.status).toBe(429);
  });
});

describe('the admin moderation endpoints', () => {
  it('the list is newest-first with statuses', async () => {
    expect((await post({ ...VALID, person: 'First Sender' })).status).toBe(201);
    expect((await post({ ...VALID, person: 'Second Sender' })).status).toBe(201);
    const res = await authed(
      'GET',
      '/api/v1/admin/testimonial-submissions',
      'mod-list@sevendays.test'
    );
    expect(res.status).toBe(200);
    const rows = (await res.json()) as { person: string; status: string }[];
    expect(rows.map((r) => r.person)).toEqual(['Second Sender', 'First Sender']);
    expect(rows.every((r) => r.status === 'pending')).toBe(true);
  });

  it('accept as-is appends the Testimonial at nextTestimonialPosition (max+1), flips the row, writes the accept audit row, renders at the end of the public order', async () => {
    await loadGalleryFixtures(db); // 3 testimonials, positions 1..3 — the append lands at 4
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db
      .select()
      .from(testimonialSubmissions)
      .orderBy(desc(testimonialSubmissions.createdAt));
    if (!submission) throw new Error('expected a submission row');

    const res = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/accept`,
      'mod-accept@sevendays.test',
      {}
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('accepted');

    // Appended at the END of render order — the public read is the proof
    // (the fixtures render 2 active testimonials; the append lands at
    // position 4 and renders last — 3 public rows).
    const publicRes = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    const testimonials = (await publicRes.json()) as { quote: string; person: string }[];
    expect(testimonials).toHaveLength(3);
    expect(testimonials[2]?.person).toBe(VALID.person);

    const auditRows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entity, 'testimonial-submission'));
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.action).toBe('accept');
    expect(auditRows[0]?.entityId).toBe(submission.id);
    expect(auditRows[0]?.summary).toBe(VALID.person);
  });

  it('accept-with-edit carries the edited quote + person into the Testimonial', async () => {
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db.select().from(testimonialSubmissions);
    if (!submission) throw new Error('expected a submission row');
    const res = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/accept`,
      'mod-edit@sevendays.test',
      { quote: 'The photographer made our shoot feel effortless (edited).', person: 'Maria D.' }
    );
    expect(res.status).toBe(200);
    const publicRes = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    const testimonials = (await publicRes.json()) as { quote: string; person: string }[];
    expect(testimonials[testimonials.length - 1]?.quote).toBe(
      'The photographer made our shoot feel effortless (edited).'
    );
    expect(testimonials[testimonials.length - 1]?.person).toBe('Maria D.');
    // A bad edit is a 400, never a silent trim.
    expect((await post({ ...VALID, person: 'Third Sender' })).status).toBe(201);
    const [next] = await db
      .select()
      .from(testimonialSubmissions)
      .orderBy(desc(testimonialSubmissions.createdAt));
    const badEdit = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${next?.id}/accept`,
      'mod-edit-bad@sevendays.test',
      { quote: 'x'.repeat(19) }
    );
    expect(badEdit.status).toBe(400);
  });

  it('accept on a non-pending row → 400 with the status detail', async () => {
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db.select().from(testimonialSubmissions);
    if (!submission) throw new Error('expected a submission row');
    await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/reject`,
      'mod-reject-a@sevendays.test'
    );
    const res = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/accept`,
      'mod-reject-b@sevendays.test',
      {}
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('Only pending submissions can be accepted.');
    expect(body.details[0]?.path).toEqual(['status']);
    expect(body.details[0]?.message).toBe('submission is rejected');
  });

  it('reject retains the row as rejected + writes the reject audit row', async () => {
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db.select().from(testimonialSubmissions);
    if (!submission) throw new Error('expected a submission row');
    const res = await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/reject`,
      'mod-reject@sevendays.test'
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe('rejected');
    const rows = await db.select().from(testimonialSubmissions);
    expect(rows).toHaveLength(1); // retained — the audit trail
    const auditRows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entity, 'testimonial-submission'));
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.action).toBe('reject');
    // And nothing renders: the public read stays empty.
    const publicRes = await app.request('/api/v1/testimonials', undefined, testEnv(url));
    expect(await publicRes.json()).toEqual([]);
  });

  it('delete removes regardless of status (a rejected row) → 204 + the delete audit row', async () => {
    expect((await post(VALID)).status).toBe(201);
    const [submission] = await db.select().from(testimonialSubmissions);
    if (!submission) throw new Error('expected a submission row');
    await authed(
      'POST',
      `/api/v1/admin/testimonial-submissions/${submission.id}/reject`,
      'mod-del-a@sevendays.test'
    );
    const res = await authed(
      'DELETE',
      `/api/v1/admin/testimonial-submissions/${submission.id}`,
      'mod-del-b@sevendays.test'
    );
    expect(res.status).toBe(204);
    expect(await db.select().from(testimonialSubmissions)).toHaveLength(0);
    const auditRows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entity, 'testimonial-submission'));
    expect(auditRows.map((r) => r.action)).toEqual(['reject', 'delete']);
  });
});
