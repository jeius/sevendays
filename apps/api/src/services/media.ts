import type { Database } from '@sevendays/db';
import { galleryPhotos } from '@sevendays/db';
import type { MediaPurpose } from '@sevendays/types';
import { mediaStagingKeySchema } from '@sevendays/types';
import { AwsClient } from 'aws4fetch';
import { eq } from 'drizzle-orm';
import type { Env } from '../env.js';

// The media seam (M5 #136, ADR-0019): presign mints a short-lived, type-
// enforced upload URL; commit is the trust-but-verify gate (binding HEAD →
// caps → promote to an immutable final key → delete staging → hand back the
// final key; miss or violation → delete the object and the typed 400 the
// route maps). Storage vs URLs: only object keys move here — resolving
// MEDIA_PUBLIC_BASE_URL into absolute URLs is the read assembly's job
// (#138), never this service's.

export const MEDIA_BUCKET_NAME = 'sevendays-media';
export const PRESIGN_EXPIRY_SECONDS = 900; // 15 min — one file PUT, minted per file on demand
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // the ADR-0019 cap (verified at commit; presign cannot carry a size condition)
export const THUMBNAIL_WIDTH_PX = 400; // the research-pinned admin-grid width
export const MAX_THUMBNAIL_INPUT_BYTES = 20 * 1024 * 1024; // the Images binding's documented input limit

const EXTENSIONS = { 'image/jpeg': 'jpg' } as const;

const FINAL_PREFIXES: Record<MediaPurpose, string> = {
  'package-cover': 'covers',
  'gallery-photo': 'gallery',
};

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Deploy-time misconfiguration (the BETTER_AUTH_SECRET posture): the route
 * does not catch this — the root onError logs it and answers the uniform
 * 500, so a Worker without the owner-minted token fails presign loudly
 * instead of silently handing out unsigned URLs. */
export class MissingR2CredentialsError extends Error {
  constructor() {
    super(
      'R2_S3_ACCESS_KEY_ID / R2_S3_SECRET_ACCESS_KEY are not set — the API cannot presign uploads. Set the Worker secrets per docs/media-bucket-runbook.md § Owner handoff (scoped R2 S3 token). No fallback by design.'
    );
    this.name = 'MissingR2CredentialsError';
  }
}

export type CommitUploadResult =
  | { ok: true; finalKey: string }
  | {
      ok: false;
      reason: 'foreign_key' | 'not_found' | 'cap_violation';
      message: string;
      details?: { path: string[]; message: string }[];
    };

/**
 * Mint a presigned PUT for one file (POST /api/v1/admin/media/presign,
 * session-gated). The key is server-assigned (`tmp/<uuid>.jpg` — the client
 * never supplies key text); the Content-Type is signed into the URL so a PUT
 * with a different type fails the signature. allHeaders is LOAD-BEARING:
 * aws4fetch's UNSIGNABLE_HEADERS set contains content-type, so signQuery
 * alone would emit `X-Amz-SignedHeaders: host` and type enforcement would
 * silently not exist (spiked 2026-09-26 against aws4fetch 1.0.20).
 */
export async function presignUpload(
  env: Pick<Env, 'R2_S3_ACCESS_KEY_ID' | 'R2_S3_SECRET_ACCESS_KEY' | 'CLOUDFLARE_ACCOUNT_ID'>,
  input: { purpose: MediaPurpose; contentType: 'image/jpeg' }
): Promise<{ key: string; uploadUrl: string }> {
  const accessKeyId = env.R2_S3_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new MissingR2CredentialsError();
  }
  const key = `tmp/${crypto.randomUUID()}.${EXTENSIONS[input.contentType]}`;
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto', // required by the signer, ignored by R2
  });
  const url = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${MEDIA_BUCKET_NAME}/${key}?X-Amz-Expires=${PRESIGN_EXPIRY_SECONDS}`;
  const signed = await client.sign(
    new Request(url, { method: 'PUT', headers: { 'content-type': input.contentType } }),
    { aws: { signQuery: true, allHeaders: true } }
  );
  return { key, uploadUrl: signed.url };
}

/**
 * The commit contract (trust-but-verify, closed): HEAD-verify the staging
 * object → enforce the caps (50 MiB, image/jpeg — the presigned PUT carried
 * no size condition, so this is the real gate) → promote to the immutable
 * final key via the binding (no S3 credentials involved) → delete the
 * staging key → hand the final key back for the caller to persist (#137).
 * Miss or violation deletes the object and answers the typed 400 shape. A
 * staging key that was never minted by presign (anything not tmp/<uuid>.jpg)
 * is refused WITHOUT deleting — the commit path must never be able to delete
 * an arbitrary (promoted) object.
 */
export async function commitUpload(
  bucket: R2Bucket,
  input: { stagingKey: string; purpose: MediaPurpose }
): Promise<CommitUploadResult> {
  const stagingKey = mediaStagingKeySchema.safeParse(input.stagingKey);
  if (!stagingKey.success) {
    return {
      ok: false,
      reason: 'foreign_key',
      message: 'Invalid staging key.',
      details: [
        { path: ['key'], message: 'must be a tmp/<uuid>.jpg staging key minted by presign' },
      ],
    };
  }
  const obj = await bucket.head(stagingKey.data);
  if (!obj) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'Upload not found — the PUT may have failed, expired, or been already committed.',
      details: [{ path: ['key'], message: 'no object at the staging key' }],
    };
  }
  const violations: { path: string[]; message: string }[] = [];
  if (obj.size > MAX_UPLOAD_BYTES) {
    violations.push({
      path: ['key'],
      message: `upload exceeds the 50 MiB cap (${obj.size} bytes)`,
    });
  }
  const contentType = obj.httpMetadata?.contentType ?? '';
  if (contentType !== 'image/jpeg') {
    violations.push({
      path: ['contentType'],
      message: `stored content type ${contentType || '(none)'} is not allowed`,
    });
  }
  if (violations.length > 0) {
    await bucket.delete(stagingKey.data);
    return {
      ok: false,
      reason: 'cap_violation',
      message: 'Upload failed the media caps and was deleted.',
      details: violations,
    };
  }
  const src = await bucket.get(stagingKey.data);
  if (!src) {
    // Vanished between head and get (strongly consistent binding — this is a
    // concurrent commit winning the race, or a manual delete). Nothing to
    // promote, nothing left to clean.
    return {
      ok: false,
      reason: 'not_found',
      message: 'Upload not found — the PUT may have failed, expired, or been already committed.',
      details: [{ path: ['key'], message: 'no object at the staging key' }],
    };
  }
  const finalKey = `${FINAL_PREFIXES[input.purpose]}/${crypto.randomUUID()}.jpg`;
  await bucket.put(finalKey, src.body, {
    httpMetadata: { contentType, cacheControl: IMMUTABLE_CACHE_CONTROL },
  });
  await bucket.delete(stagingKey.data);
  return { ok: true, finalKey };
}

/**
 * The gated by-id thumbnail (GET /api/v1/admin/gallery-photos/:id/thumb):
 * resolve the row → stream the object → transform via the Images binding
 * (no public read path involved). Over the binding's documented 20 MB input
 * limit, fall back to the ORIGINAL bytes with the stored content type (the
 * ADR-0019 cap trade, made explicit — full-size display in the admin grid).
 * Returns null for a missing row OR a missing object — the route answers
 * the per-entity 404 either way.
 */
export async function servePhotoThumbnail(
  db: Database,
  env: Pick<Env, 'MEDIA_BUCKET' | 'IMAGES'>,
  id: string
): Promise<Response | null> {
  const [row] = await db
    .select({ r2Key: galleryPhotos.r2Key })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.id, id))
    .limit(1);
  if (!row) return null;
  const obj = await env.MEDIA_BUCKET.get(row.r2Key);
  if (!obj) return null;
  if (obj.size > MAX_THUMBNAIL_INPUT_BYTES) {
    return new Response(obj.body, {
      headers: { 'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream' },
    });
  }
  const result = await env.IMAGES.input(obj.body)
    .transform({ width: THUMBNAIL_WIDTH_PX })
    .output({ format: 'image/webp' });
  return result.response();
}

/**
 * Read-time URL resolution (ADR-0019): the absolute public URL for an object
 * key, null passthrough for a null key. The ONLY place a key becomes a URL —
 * admin reads resolve here (#137); #138 reuses it for the public reads. Raw
 * keys never leave the API at any layer. (Added by #137 as the one fenced
 * extension to this seam; presign/commit/thumb are untouched.)
 */
export function resolveMediaUrl(
  env: Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>,
  key: string | null
): string | null {
  return key ? `${env.MEDIA_PUBLIC_BASE_URL}/${key}` : null;
}
