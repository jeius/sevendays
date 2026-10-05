import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { stubCommitBucket } from './helpers/r2-stub.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const captureLines = () => {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(String(args[0]));
  });
  return lines;
};

const mutations = (lines: string[]) =>
  lines
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((line) => line.evt === 'admin_mutation');

const authed = async (method: string, path: string, email: string, body?: unknown) => {
  const { token } = await signUpSession(url, email);
  return app.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(url)
  );
};

// The atomic-save body (admin-packages.test.ts's save() shape, fixture ids):
// frames/inclusions ride so the save exercises the full transaction.
const packageSave = (overrides: Record<string, unknown> = {}) => ({
  name: 'Deluxe Package',
  description: 'The full graduation set.',
  priceCents: 150000,
  durationMinutes: null,
  isActive: true,
  isFeatured: false,
  frames: [{ id: 'frame-1' }],
  inclusions: [
    {
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: ids.printSize11x14,
      frameId: 'frame-1',
      attireIds: [ids.attireFilipiniana, ids.attireExecutive],
      description: 'The framed 11x14',
    },
    {
      kind: 'print',
      quantity: 4,
      printSizeId: ids.printSize2R,
      attireIds: [ids.attireToga],
      description: null,
    },
  ],
  ...overrides,
});

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin_mutation events (M6 #183 — one per committed CMS write)', () => {
  it('POST branches → exactly one line: ruled keys, entity, entityId = the created row, actorId = the session owner', async () => {
    const lines = captureLines();
    // ONE session for both the POST and the actorId assertion — the event's
    // actor is whoever made the call.
    const { token, userId } = await signUpSession(url, 'mut-branch@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({
          name: 'Fifth Branch',
          address: '5 New St',
          phone: '+63 900 000 005',
        }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: string };
    const events = mutations(lines);
    expect(events).toHaveLength(1);
    const [line] = events;
    if (!line) throw new Error('expected one mutation line');
    expect(Object.keys(line).sort()).toEqual([
      'actorId',
      'entity',
      'entityId',
      'evt',
      'level',
      'method',
      'msg',
      'requestId',
      'route',
      'time',
    ]);
    expect(line.entity).toBe('branch');
    expect(line.entityId).toBe(created.id);
    expect(line.actorId).toBe(userId);
    expect(line.method).toBe('POST');
    expect(line.route).toBe('/api/v1/admin/branches');
  });

  it('PUT branches → the line carries the param id and the :id route pattern', async () => {
    const lines = captureLines();
    const created = await authed('POST', '/api/v1/admin/branches', 'mut-put-a@sevendays.test', {
      name: 'Sixth Branch',
      address: '6 New St',
      phone: '+63 900 000 006',
    });
    const { id } = (await created.json()) as { id: string };
    const res = await authed('PUT', `/api/v1/admin/branches/${id}`, 'mut-put-b@sevendays.test', {
      name: 'Sixth Branch',
      address: '6B St',
      phone: '+63 900 000 006',
      isActive: false,
    });
    expect(res.status).toBe(200);
    const putLines = mutations(lines).filter((line) => line.method === 'PUT');
    expect(putLines).toHaveLength(1);
    expect(putLines[0]?.entityId).toBe(id);
    expect(putLines[0]?.route).toBe('/api/v1/admin/branches/:id');
  });

  it("a 400 (duplicate name) emits NO mutation line — only the write model's successes record", async () => {
    const lines = captureLines();
    const res = await authed('POST', '/api/v1/admin/branches', 'mut-dup@sevendays.test', {
      name: 'Test Branch A', // fixture name — the uniqueness collision
      address: 'X St',
      phone: '+63 900 000 000',
    });
    expect(res.status).toBe(400);
    expect(mutations(lines)).toEqual([]);
  });

  it('a 401 (anonymous) emits NO mutation line', async () => {
    const lines = captureLines();
    const res = await app.request(
      '/api/v1/admin/branches',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Nope', address: 'X', phone: 'y' }),
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(mutations(lines)).toEqual([]);
  });

  it('the studio-service branch-matrix PUT → one line with the :id/branches pattern and the service id', async () => {
    const lines = captureLines();
    const created = await authed(
      'POST',
      '/api/v1/admin/studio-services',
      'mut-matrix-a@sevendays.test',
      { name: 'Photo Recovery', description: 'Recover old photos', priceCents: 5000 }
    );
    const { id } = (await created.json()) as { id: string };
    const res = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${id}/branches`,
      'mut-matrix-b@sevendays.test',
      { branchIds: [ids.branchA] }
    );
    expect(res.status).toBe(200);
    const matrixLines = mutations(lines).filter((line) => line.method === 'PUT');
    expect(matrixLines).toHaveLength(1);
    expect(matrixLines[0]?.entity).toBe('studio-service');
    expect(matrixLines[0]?.entityId).toBe(id);
    expect(matrixLines[0]?.route).toBe('/api/v1/admin/studio-services/:id/branches');
  });

  it('the atomic package save → exactly ONE line (request-grain, not per DB row)', async () => {
    const lines = captureLines();
    const res = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'mut-pkg@sevendays.test',
      packageSave()
    );
    expect(res.status).toBe(201);
    const events = mutations(lines);
    expect(events).toHaveLength(1);
    expect(events[0]?.entity).toBe('service-package');
  });

  it('the gallery-category order PUT → one line with entityId null (the family, not a row)', async () => {
    const lines = captureLines();
    const a = await authed('POST', '/api/v1/admin/gallery-categories', 'mut-cat-a@sevendays.test', {
      name: 'Ceremony',
    });
    const b = await authed('POST', '/api/v1/admin/gallery-categories', 'mut-cat-b@sevendays.test', {
      name: 'Reception',
    });
    const catA = ((await a.json()) as { id: string }).id;
    const catB = ((await b.json()) as { id: string }).id;
    const res = await authed(
      'PUT',
      '/api/v1/admin/gallery-categories/order',
      'mut-cat-order@sevendays.test',
      { categoryIds: [catB, catA] }
    );
    expect(res.status).toBe(200);
    const orderLines = mutations(lines).filter((line) => line.route?.endsWith('/order'));
    expect(orderLines).toHaveLength(1);
    expect(orderLines[0]?.entity).toBe('gallery-category');
    expect(orderLines[0]?.entityId).toBeNull();
  });

  it('every remaining entity family emits with its own entity name', async () => {
    const lines = captureLines();
    const ps = await authed('POST', '/api/v1/admin/print-sizes', 'mut-ps@sevendays.test', {
      code: '9x12',
      description: 'Nine by twelve',
    });
    const at = await authed('POST', '/api/v1/admin/attires', 'mut-at@sevendays.test', {
      name: 'Barong',
    });
    const ad = await authed('POST', '/api/v1/admin/addon-services', 'mut-ad@sevendays.test', {
      name: 'Hair Spray',
      description: 'Hold that updo',
      priceCents: 3000,
    });
    const te = await authed('POST', '/api/v1/admin/testimonials', 'mut-te@sevendays.test', {
      quote: 'Wonderful shoot!',
      person: 'Ana R.',
    });
    expect([ps.status, at.status, ad.status, te.status]).toEqual([201, 201, 201, 201]);
    const entities = mutations(lines)
      .map((line) => line.entity)
      .sort();
    expect(entities).toEqual(['addon-service', 'attire', 'print-size', 'testimonial']);
  });
});

describe('the gallery-photo commit seam (media_failure × commit + the photo mutation line)', () => {
  const STAGING = 'tmp/00000000-0000-4000-8000-000000000009.jpg';

  it('POST with a foreign key → 400, a media_failure {op: commit, reason: foreign_key}, and NO mutation line', async () => {
    const lines = captureLines();
    const res = await authed(
      'POST',
      '/api/v1/admin/gallery-photos',
      'mut-photo-fk@sevendays.test',
      { r2Key: 'gallery/00000000-0000-4000-8000-000000000000.jpg' }
    );
    expect(res.status).toBe(400);
    const parsed = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const media = parsed.filter((line) => line.evt === 'media_failure');
    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({ op: 'commit', reason: 'foreign_key' });
    expect(parsed.filter((line) => line.evt === 'admin_mutation')).toEqual([]);
  });

  it('POST with a staged object (stubbed bucket) → 201 and the gallery-photo mutation line', async () => {
    const lines = captureLines();
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'mut-photo-ok@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/gallery-photos',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: JSON.stringify({ r2Key: STAGING, title: 'Evt portrait', caption: null }),
      },
      { ...testEnv(url), MEDIA_BUCKET: stub.bucket }
    );
    expect(res.status).toBe(201);
    const events = mutations(lines);
    expect(events).toHaveLength(1);
    expect(events[0]?.entity).toBe('gallery-photo');
    expect(
      lines
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .filter((line) => line.evt === 'media_failure')
    ).toEqual([]);
  });
});
