import { AwsClient } from 'aws4fetch';
import { describe, expect, it } from 'vitest';
import {
  commitUpload,
  MAX_UPLOAD_BYTES,
  MEDIA_BUCKET_NAME,
  presignUpload,
} from '../src/services/media.js';

// LIVE media round-trip (ticket #136 ACs 3 + 4) — NOT a CI gate: the file
// skips unless LIVE_MEDIA_VERIFY=1 AND the real R2 S3-token trio is in env
// (the packages/db TEST_DATABASE_URL-gated blocks are the house precedent).
// It runs the REAL presign + commit service code against the REAL bucket:
// presign → PUT (minted Content-Type) → commitUpload promotes + deletes
// staging; a swapped Content-Type PUT must fail the signature; an over-cap
// object must be deleted and answered 400-shaped. Invocation (controller /
// owner only — docs/media-bucket-runbook.md § Live round-trip verify):
//
//   cd apps/api && LIVE_MEDIA_VERIFY=1 \
//     R2_S3_ACCESS_KEY_ID=… R2_S3_SECRET_ACCESS_KEY=… CLOUDFLARE_ACCOUNT_ID=… \
//     pnpm test -- media-live

const LIVE =
  process.env.LIVE_MEDIA_VERIFY === '1' &&
  !!process.env.R2_S3_ACCESS_KEY_ID &&
  !!process.env.R2_S3_SECRET_ACCESS_KEY &&
  !!process.env.CLOUDFLARE_ACCOUNT_ID;

const liveDescribe = describe.runIf(LIVE);

// Read ONCE (the guard above guarantees presence — the `as string` narrowing
// is the house pattern; no non-null assertions, biome flags those).
const ACCESS_KEY_ID = process.env.R2_S3_ACCESS_KEY_ID as string;
const SECRET_ACCESS_KEY = process.env.R2_S3_SECRET_ACCESS_KEY as string;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID as string;

// A sigv4 adapter shaped as the R2Bucket the service expects — header-signed
// requests to the S3-compatible endpoint, so the REAL commitUpload code runs
// unchanged against the REAL bucket. aws4fetch signs s3 requests with
// UNSIGNED-PAYLOAD automatically (verified against the installed 1.0.20).
function liveBucket(): R2Bucket {
  const client = new AwsClient({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
  const base = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${MEDIA_BUCKET_NAME}`;
  const head = async (key: string) => {
    const res = await client.fetch(`${base}/${key}`, { method: 'HEAD' });
    if (!res.ok) return null;
    return {
      key,
      size: Number(res.headers.get('content-length') ?? '0'),
      httpMetadata: {
        contentType: res.headers.get('content-type') ?? undefined,
        cacheControl: res.headers.get('cache-control') ?? undefined,
      },
    };
  };
  return {
    head,
    async get(key: string) {
      const res = await client.fetch(`${base}/${key}`, { method: 'GET' });
      if (!res.ok || !res.body) return null;
      const meta = await head(key);
      if (!meta) return null;
      return { ...meta, body: res.body };
    },
    async put(key: string, value: unknown, options: unknown) {
      const httpMetadata =
        (options as { httpMetadata?: Record<string, string> })?.httpMetadata ?? {};
      const headers = new Headers();
      if (httpMetadata.contentType) headers.set('content-type', httpMetadata.contentType);
      if (httpMetadata.cacheControl) headers.set('cache-control', httpMetadata.cacheControl);
      const res = await client.fetch(`${base}/${key}`, {
        method: 'PUT',
        headers,
        body: value as ReadableStream,
      });
      if (!res.ok) throw new Error(`S3 PUT ${key} failed: ${res.status}`);
      return { key } as R2Object;
    },
    async delete(keys: string | string[]) {
      for (const key of [keys].flat()) {
        const res = await client.fetch(`${base}/${key}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`S3 DELETE ${key} failed: ${res.status}`);
      }
    },
  } as unknown as R2Bucket;
}

const env = () => ({
  R2_S3_ACCESS_KEY_ID: ACCESS_KEY_ID,
  R2_S3_SECRET_ACCESS_KEY: SECRET_ACCESS_KEY,
  CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
});

liveDescribe('live media round-trip (REAL bucket — controller/owner only)', () => {
  it('presign → PUT (minted Content-Type) → commitUpload HEAD-verifies, promotes, deletes staging', {
    timeout: 120_000,
  }, async () => {
    const bucket = liveBucket();
    const { key, uploadUrl } = await presignUpload(env(), {
      purpose: 'gallery-photo',
      contentType: 'image/jpeg',
    });
    const bytes = crypto.getRandomValues(new Uint8Array(1024));
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: bytes,
    });
    expect(put.status).toBe(200);
    expect(put.headers.get('etag')).toBeTruthy();
    const result = await commitUpload(bucket, { stagingKey: key, purpose: 'gallery-photo' });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}: ${result.message}`);
    expect(result.finalKey).toMatch(/^gallery\/[0-9a-f-]{36}\.jpg$/);
    const finalObj = await bucket.head(result.finalKey);
    expect(finalObj).not.toBeNull();
    expect(finalObj?.httpMetadata?.cacheControl).toContain('immutable');
    expect(await bucket.head(key)).toBeNull();
    // cleanup: the harness owns its object — never leave test rows in the shared bucket
    await bucket.delete(result.finalKey);
    expect(await bucket.head(result.finalKey)).toBeNull();
  });

  it('a PUT with a swapped Content-Type fails the signature (403) — type is enforced at presign', {
    timeout: 120_000,
  }, async () => {
    const bucket = liveBucket();
    const { key, uploadUrl } = await presignUpload(env(), {
      purpose: 'gallery-photo',
      contentType: 'image/jpeg',
    });
    const swapped = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: crypto.getRandomValues(new Uint8Array(64)),
    });
    expect(swapped.status).toBe(403);
    expect(await swapped.text()).toContain('SignatureDoesNotMatch');
    const result = await commitUpload(bucket, { stagingKey: key, purpose: 'gallery-photo' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not_found');
  });

  it('an object over the 50 MiB cap is deleted from the bucket and answered 400-shaped', {
    timeout: 180_000,
  }, async () => {
    const bucket = liveBucket();
    const { key, uploadUrl } = await presignUpload(env(), {
      purpose: 'gallery-photo',
      contentType: 'image/jpeg',
    });
    // The presigned PUT cannot carry a size condition — the over-cap object LANDS.
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: new Uint8Array(MAX_UPLOAD_BYTES + 1),
    });
    expect(put.status).toBe(200);
    const result = await commitUpload(bucket, { stagingKey: key, purpose: 'gallery-photo' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('cap_violation');
    expect(result.details?.[0]?.path).toEqual(['key']);
    expect(await bucket.head(key)).toBeNull();
  });
});
