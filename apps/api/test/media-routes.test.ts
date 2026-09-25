import { galleryPhotos } from '@sevendays/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const MEDIA_VARS = {
  CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
  MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
};

// The full presign-capable env: testEnv + the two plain values + the S3 pair.
// Tests that need the OPPOSITE (missing creds) spread testEnv + MEDIA_VARS only.
const withCreds = (extra: Record<string, unknown> = {}) => ({
  ...testEnv(url),
  ...MEDIA_VARS,
  R2_S3_ACCESS_KEY_ID: 'test-access-key-id',
  R2_S3_SECRET_ACCESS_KEY: 'test-secret-access-key',
  ...extra,
});

// Stub Images binding: records the transform chain in order, answers a
// marker webp. Assertions re-derive the chain from the service call site:
// input(stream) → transform({ width: 400 }) → output({ format: 'image/webp' }).
function stubImages(marker = 'WEBP-MARKER-BYTES') {
  const calls: Record<string, unknown>[] = [];
  const binding = {
    input(stream: ReadableStream<Uint8Array>) {
      calls.push({ input: stream });
      const transformer = {
        transform(t: unknown) {
          calls.push({ transform: t });
          return transformer;
        },
        async output(o: unknown) {
          calls.push({ output: o });
          return {
            response: () => new Response(marker, { headers: { 'content-type': 'image/webp' } }),
          };
        },
      };
      return transformer;
    },
  };
  return { binding: binding as unknown as ImagesBinding, calls };
}

// Stub R2 bucket for the thumb legs: get returns metadata + a one-chunk body
// (the service reads .size and streams .body — exactly what R2ObjectBody gives).
function stubMediaBucket(options: { size: number; body?: string }) {
  return {
    async get(key: string) {
      return {
        key,
        size: options.size,
        httpMetadata: { contentType: 'image/jpeg' },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(options.body ?? 'ORIGINAL-JPEG-BYTES'));
            controller.close();
          },
        }),
      };
    },
  } as unknown as R2Bucket;
}

async function insertPhoto(r2Key: string) {
  const [row] = await db.insert(galleryPhotos).values({ r2Key, position: 1 }).returning();
  if (!row) throw new Error('photo insert returned no row');
  return row;
}

beforeEach(async () => {
  await truncateAll(db);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/v1/admin/media/presign', () => {
  it('answers the uniform 401 envelope BEFORE validation for an anonymous caller with a VALID body', async () => {
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'gallery-photo', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('answers 401 — never the validator 400 — for an anonymous caller with an INVALID body (the M4 ordering)', async () => {
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'avatar', contentType: 'image/png' }),
        headers: { 'content-type': 'application/json' },
      },
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('answers 400 with field details for an authed caller over an unsupported type', async () => {
    const { token } = await signUpSession(url, 'presign-type@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'gallery-photo', contentType: 'image/png' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      withCreds()
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.error).toBe('Invalid request payload.');
    const detail = body.details[0];
    if (!detail) throw new Error('expected one validation detail');
    expect(detail.path).toEqual(['contentType']);
  });

  it('mints { key, uploadUrl } for an authed caller — key staging-shaped, URL type-signed on the account S3 host', async () => {
    const { token } = await signUpSession(url, 'presign-happy@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'package-cover', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      withCreds()
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { key: string; uploadUrl: string };
    expect(body.key).toMatch(/^tmp\//);
    const upload = new URL(body.uploadUrl);
    expect(upload.host).toBe(`${MEDIA_VARS.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`);
    expect(upload.searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
  });

  it('fails presign with the uniform 500 + log when the S3-token pair is absent (loud, never silent)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { token } = await signUpSession(url, 'presign-nocreds@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({ purpose: 'gallery-photo', contentType: 'image/jpeg' }),
        headers: { 'content-type': 'application/json', ...bearer(token) },
      },
      { ...testEnv(url), ...MEDIA_VARS }
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
    expect(spy.mock.calls.some((call) => String(call[0]).startsWith('[api]'))).toBe(true);
  });
});

describe('GET /api/v1/admin/gallery-photos/:id/thumb', () => {
  it('answers the uniform 401 envelope for an anonymous caller', async () => {
    const res = await app.request(
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000/thumb',
      undefined,
      testEnv(url)
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('answers the per-entity 404 for an unknown photo id (authed)', async () => {
    const { token } = await signUpSession(url, 'thumb-404@sevendays.test');
    const res = await app.request(
      '/api/v1/admin/gallery-photos/00000000-0000-4000-8000-000000000000/thumb',
      { headers: bearer(token) },
      withCreds()
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Photo not found.' });
  });

  it('answers the per-entity 404 when the row exists but the object is gone', async () => {
    const { token } = await signUpSession(url, 'thumb-gone@sevendays.test');
    const row = await insertPhoto('tmp/vanished.jpg');
    const emptyBucket = {
      async get() {
        return null;
      },
    } as unknown as R2Bucket;
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${row.id}/thumb`,
      { headers: bearer(token) },
      withCreds({ MEDIA_BUCKET: emptyBucket, IMAGES: stubImages().binding })
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Photo not found.' });
  });

  it('serves the transformed variant — width-capped webp from the Images binding (≤20 MB input)', async () => {
    const { token } = await signUpSession(url, 'thumb-webp@sevendays.test');
    const row = await insertPhoto('gallery/00000000-0000-4000-8000-000000000000.jpg');
    const bucket = stubMediaBucket({ size: 5 * 1024 * 1024 });
    const images = stubImages();
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${row.id}/thumb`,
      { headers: bearer(token) },
      withCreds({ MEDIA_BUCKET: bucket, IMAGES: images.binding })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect(await res.text()).toBe('WEBP-MARKER-BYTES');
    // The stub must have seen the exact chain the service builds.
    expect(images.calls.map((call) => Object.keys(call)[0])).toEqual([
      'input',
      'transform',
      'output',
    ]);
    const transformCall = images.calls[1];
    const outputCall = images.calls[2];
    if (!transformCall || !outputCall) throw new Error('expected the transform + output calls');
    expect(transformCall.transform).toEqual({ width: 400 });
    expect(outputCall.output).toEqual({ format: 'image/webp' });
  });

  it('falls back to the original bytes over 20 MB — the Images binding is never invoked', async () => {
    const { token } = await signUpSession(url, 'thumb-fallback@sevendays.test');
    const row = await insertPhoto('covers/00000000-0000-4000-8000-000000000000.jpg');
    const bucket = stubMediaBucket({ size: 20 * 1024 * 1024 + 1, body: 'HUGE-ORIGINAL' });
    const images = stubImages();
    const res = await app.request(
      `/api/v1/admin/gallery-photos/${row.id}/thumb`,
      { headers: bearer(token) },
      withCreds({ MEDIA_BUCKET: bucket, IMAGES: images.binding })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(await res.text()).toBe('HUGE-ORIGINAL');
    expect(images.calls).toEqual([]);
  });
});
