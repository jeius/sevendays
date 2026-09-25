import { describe, expect, it } from 'vitest';
import {
  commitUpload,
  MAX_UPLOAD_BYTES,
  MEDIA_BUCKET_NAME,
  MissingR2CredentialsError,
  presignUpload,
  resolveMediaUrl,
} from './media.js';

const CREDS = {
  R2_S3_ACCESS_KEY_ID: 'test-access-key-id',
  R2_S3_SECRET_ACCESS_KEY: 'test-secret-access-key',
  CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
};

// Binding-shaped stub over a Map — re-derived from the R2Bucket surface the
// service uses (head/get/put/delete only): head returns an R2Object-shaped
// metadata record, get returns it with a body, put records the FINAL key +
// options the service chose, delete records deletions. Assertions run
// against the recorded calls, so promote/delete semantics are pinned
// exactly (toHaveBeenCalledWith-equivalent, without a mock's looseness).
function stubBucket(initial: Record<string, { size: number; contentType: string }> = {}) {
  const objects = new Map(
    Object.entries(initial).map(([key, meta]) => [key, { ...meta, deleted: false }])
  );
  const putCalls: { key: string; value: unknown; options: unknown }[] = [];
  const deleteCalls: string[] = [];
  const bucket = {
    async head(key: string) {
      const obj = objects.get(key);
      if (!obj || obj.deleted) return null;
      return { key, size: obj.size, httpMetadata: { contentType: obj.contentType } };
    },
    async get(key: string) {
      const obj = objects.get(key);
      if (!obj || obj.deleted) return null;
      return {
        key,
        size: obj.size,
        httpMetadata: { contentType: obj.contentType },
        body: 'staging-bytes',
      };
    },
    async put(key: string, value: unknown, options: unknown) {
      putCalls.push({ key, value, options });
      objects.set(key, { size: 1, contentType: 'image/jpeg', deleted: false });
      return { key };
    },
    async delete(keys: string | string[]) {
      for (const key of [keys].flat()) {
        deleteCalls.push(key);
        const existing = objects.get(key);
        if (existing) objects.set(key, { ...existing, deleted: true });
      }
    },
  };
  return { bucket: bucket as unknown as R2Bucket, putCalls, deleteCalls };
}

describe('presignUpload', () => {
  it('mints a tmp/<uuid>.jpg key that passes the shared staging-key schema', async () => {
    const result = await presignUpload(CREDS, {
      purpose: 'gallery-photo',
      contentType: 'image/jpeg',
    });
    expect(result.key).toMatch(
      /^tmp\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/
    );
  });

  it('signs the Content-Type into the URL — allHeaders is load-bearing (X-Amz-SignedHeaders: content-type;host)', async () => {
    // Spike-pinned (2026-09-26, aws4fetch 1.0.20): `content-type` sits in the
    // lib's UNSIGNABLE_HEADERS set, so signQuery alone emits SignedHeaders:
    // host and a swapped Content-Type PUT would SUCCEED. The service must
    // pass allHeaders: true — this assertion is the regression lock on it.
    const { uploadUrl } = await presignUpload(CREDS, {
      purpose: 'package-cover',
      contentType: 'image/jpeg',
    });
    const url = new URL(uploadUrl);
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
  });

  it('targets the account S3 host, the sevendays-media bucket, and expires in 900s', async () => {
    const { uploadUrl } = await presignUpload(CREDS, {
      purpose: 'gallery-photo',
      contentType: 'image/jpeg',
    });
    const url = new URL(uploadUrl);
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe(`${CREDS.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`);
    expect(url.pathname.startsWith(`/${MEDIA_BUCKET_NAME}/tmp/`)).toBe(true);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
  });

  it('mints a fresh key per call (never hoard, never collide)', async () => {
    const first = await presignUpload(CREDS, {
      purpose: 'gallery-photo',
      contentType: 'image/jpeg',
    });
    const second = await presignUpload(CREDS, {
      purpose: 'gallery-photo',
      contentType: 'image/jpeg',
    });
    expect(first.key).not.toBe(second.key);
  });

  it('throws MissingR2CredentialsError when both S3 keys are missing (loud, typed — never a silent fallback)', async () => {
    const env = { CLOUDFLARE_ACCOUNT_ID: CREDS.CLOUDFLARE_ACCOUNT_ID };
    await expect(
      presignUpload(env, { purpose: 'gallery-photo', contentType: 'image/jpeg' })
    ).rejects.toBeInstanceOf(MissingR2CredentialsError);
  });

  it('throws when only one of the two S3 keys is present', async () => {
    const env = {
      CLOUDFLARE_ACCOUNT_ID: CREDS.CLOUDFLARE_ACCOUNT_ID,
      R2_S3_ACCESS_KEY_ID: CREDS.R2_S3_ACCESS_KEY_ID,
    };
    await expect(
      presignUpload(env, { purpose: 'gallery-photo', contentType: 'image/jpeg' })
    ).rejects.toBeInstanceOf(MissingR2CredentialsError);
  });
});

describe('commitUpload', () => {
  const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000000.jpg';

  it('promotes: get → put at the immutable final key (covers/) → delete staging → hands back the final key', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'package-cover',
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.finalKey).toMatch(
      /^covers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/
    );
    expect(stub.putCalls).toHaveLength(1);
    const putCall = stub.putCalls[0];
    if (!putCall) throw new Error('expected exactly one put call');
    expect(putCall.key).toBe(result.finalKey);
    expect(putCall.value).toBe('staging-bytes');
    expect(putCall.options).toEqual({
      httpMetadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    expect(stub.deleteCalls).toEqual([STAGING_KEY]);
  });

  it('gallery purpose promotes to gallery/ (purpose decides the final prefix)', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'gallery-photo',
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.finalKey).toMatch(/^gallery\//);
  });

  it('answers the typed 400 WITHOUT deleting on a foreign key (a client-supplied covers/… key must never delete a promoted object)', async () => {
    const FOREIGN = 'covers/00000000-0000-4000-8000-000000000000.jpg';
    const stub = stubBucket({ [FOREIGN]: { size: 1024, contentType: 'image/jpeg' } });
    const result = await commitUpload(stub.bucket, {
      stagingKey: FOREIGN,
      purpose: 'gallery-photo',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('foreign_key');
    expect(result.message).toBe('Invalid staging key.');
    expect(result.details).toEqual([
      { path: ['key'], message: 'must be a tmp/<uuid>.jpg staging key minted by presign' },
    ]);
    expect(stub.deleteCalls).toEqual([]);
  });

  it('answers not_found (no delete — nothing to clean) when the staging key is missing', async () => {
    const stub = stubBucket();
    const result = await commitUpload(stub.bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'gallery-photo',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not_found');
    expect(stub.deleteCalls).toEqual([]);
  });

  it('deletes an over-cap object and answers cap_violation with the key field detail (the 50 MiB cap)', async () => {
    const stub = stubBucket({
      [STAGING_KEY]: { size: MAX_UPLOAD_BYTES + 1, contentType: 'image/jpeg' },
    });
    const result = await commitUpload(stub.bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'gallery-photo',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('cap_violation');
    expect(result.details).toEqual([{ path: ['key'], message: expect.stringContaining('50 MiB') }]);
    expect(stub.deleteCalls).toEqual([STAGING_KEY]);
    expect(stub.putCalls).toEqual([]);
  });

  it('deletes a wrong-content-type object and answers cap_violation with the contentType field detail', async () => {
    const stub = stubBucket({ [STAGING_KEY]: { size: 1024, contentType: 'image/png' } });
    const result = await commitUpload(stub.bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'gallery-photo',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('cap_violation');
    expect(result.details).toEqual([
      { path: ['contentType'], message: expect.stringContaining('image/png') },
    ]);
    expect(stub.deleteCalls).toEqual([STAGING_KEY]);
    expect(stub.putCalls).toEqual([]);
  });

  it('answers not_found when the object vanishes between head and get (no put, no delete)', async () => {
    // Pins the head→get race: head passes, get returns null (a concurrent
    // commit won, or a manual delete). A plain object keeps the ordering
    // honest without a mock's call-count contract.
    const flaky = {
      async head(key: string) {
        return { key, size: 1024, httpMetadata: { contentType: 'image/jpeg' } };
      },
      async get() {
        return null;
      },
      async put(): Promise<{ key: string }> {
        throw new Error('put must not run');
      },
      async delete(): Promise<void> {},
    };
    const result = await commitUpload(flaky as unknown as R2Bucket, {
      stagingKey: STAGING_KEY,
      purpose: 'gallery-photo',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not_found');
  });
});

describe('resolveMediaUrl', () => {
  const env = { MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev' };

  it('resolves a key to the absolute public URL', () => {
    expect(resolveMediaUrl(env, 'covers/00000000-0000-4000-8000-000000000000.jpg')).toBe(
      'https://pub-test.r2.dev/covers/00000000-0000-4000-8000-000000000000.jpg'
    );
  });

  it('passes a null key through as null (no cover is a null URL, never a string)', () => {
    expect(resolveMediaUrl(env, null)).toBeNull();
  });

  it('is a plain join — no trailing-slash normalization beyond what the var carries', () => {
    expect(
      resolveMediaUrl({ MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev/' }, 'gallery/a.jpg')
    ).toBe('https://pub-test.r2.dev//gallery/a.jpg');
  });
});
