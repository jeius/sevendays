import { describe, expect, it } from 'vitest';
import {
  mediaPresignRequestSchema,
  mediaPresignResponseSchema,
  mediaStagingKeySchema,
} from './media.js';

const STAGING_KEY = 'tmp/00000000-0000-4000-8000-000000000000.jpg';

describe('mediaPresignRequestSchema', () => {
  it('parses the spec-verbatim request { purpose, contentType }', () => {
    const result = mediaPresignRequestSchema.safeParse({
      purpose: 'gallery-photo',
      contentType: 'image/jpeg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unlisted purpose (400-with-details vocabulary at the route)', () => {
    expect(
      mediaPresignRequestSchema.safeParse({ purpose: 'avatar', contentType: 'image/jpeg' }).success
    ).toBe(false);
  });

  it('rejects a non-jpeg contentType (the M5 cap: image/jpeg only)', () => {
    expect(
      mediaPresignRequestSchema.safeParse({ purpose: 'gallery-photo', contentType: 'image/png' })
        .success
    ).toBe(false);
  });

  it('parse output carries exactly purpose + contentType — a smuggled sizeBytes is stripped (size is not declarable)', () => {
    const parsed = mediaPresignRequestSchema.parse({
      purpose: 'package-cover',
      contentType: 'image/jpeg',
      sizeBytes: 42,
    });
    expect(Object.keys(parsed).sort()).toEqual(['contentType', 'purpose']);
  });
});

describe('mediaPresignResponseSchema', () => {
  it('parses { key, uploadUrl } and rejects a relative uploadUrl', () => {
    expect(
      mediaPresignResponseSchema.safeParse({
        key: STAGING_KEY,
        uploadUrl: 'https://acct.r2.cloudflarestorage.com/sevendays-media/x?X-Amz-Signature=sig',
      }).success
    ).toBe(true);
    expect(
      mediaPresignResponseSchema.safeParse({ key: STAGING_KEY, uploadUrl: '/sevendays-media/x' })
        .success
    ).toBe(false);
  });
});

describe('mediaStagingKeySchema', () => {
  it('accepts a presign-minted staging key', () => {
    expect(mediaStagingKeySchema.safeParse(STAGING_KEY).success).toBe(true);
  });

  it('rejects final keys, traversal, and uppercase uuids (foreign-key commit gate)', () => {
    expect(
      mediaStagingKeySchema.safeParse('covers/00000000-0000-4000-8000-000000000000.jpg').success
    ).toBe(false);
    expect(
      mediaStagingKeySchema.safeParse('gallery/00000000-0000-4000-8000-000000000000.jpg').success
    ).toBe(false);
    expect(mediaStagingKeySchema.safeParse('tmp/../../covers/victim.jpg').success).toBe(false);
    expect(
      mediaStagingKeySchema.safeParse('tmp/00000000-0000-4000-8000-000000000000.JPG').success
    ).toBe(false);
    expect(mediaStagingKeySchema.safeParse('tmp/short.jpg').success).toBe(false);
  });
});
