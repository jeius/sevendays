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

  it('parses the branch-cover purpose (M7 #214: branches join the covers pipeline)', () => {
    const parsed = mediaPresignRequestSchema.parse({
      purpose: 'branch-cover',
      contentType: 'image/jpeg',
    });
    expect(parsed.purpose).toBe('branch-cover');
  });

  it('parses the site-logo purpose (M7 #215: the brand logo rides the pipeline under its own purpose)', () => {
    const parsed = mediaPresignRequestSchema.parse({
      purpose: 'site-logo',
      contentType: 'image/jpeg',
    });
    expect(parsed.purpose).toBe('site-logo');
  });

  it('rejects a non-jpeg contentType for a JPG-only purpose (the #170 cap: gallery stays JPG-only)', () => {
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

  it('#246: site-logo parses with image/png', () => {
    expect(
      mediaPresignRequestSchema.safeParse({ purpose: 'site-logo', contentType: 'image/png' })
        .success
    ).toBe(true);
  });

  it('#246: site-logo still parses with image/jpeg', () => {
    expect(
      mediaPresignRequestSchema.safeParse({ purpose: 'site-logo', contentType: 'image/jpeg' })
        .success
    ).toBe(true);
  });

  it('#246: the parsed site-logo output carries exactly purpose + contentType (png)', () => {
    const parsed = mediaPresignRequestSchema.parse({
      purpose: 'site-logo',
      contentType: 'image/png',
    });
    expect(parsed).toEqual({ purpose: 'site-logo', contentType: 'image/png' });
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

  it('rejects final keys, traversal, uppercase uuids, and non-jpeg extensions (foreign-key commit gate)', () => {
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
    // #154 (the #136 T3 one-liner): a lowercase NON-JPEG extension is its own
    // reject case — the regex pins the extension, not just letter case.
    expect(
      mediaStagingKeySchema.safeParse('tmp/00000000-0000-4000-8000-000000000000.txt').success
    ).toBe(false);
    expect(mediaStagingKeySchema.safeParse('tmp/short.jpg').success).toBe(false);
  });

  it('#246: accepts a tmp/<uuid>.png staging key (the site-logo purpose)', () => {
    expect(
      mediaStagingKeySchema.safeParse('tmp/00000000-0000-4000-8000-000000000000.png').success
    ).toBe(true);
  });

  it('#246: still rejects an uppercase .PNG staging key', () => {
    expect(
      mediaStagingKeySchema.safeParse('tmp/00000000-0000-4000-8000-000000000000.PNG').success
    ).toBe(false);
  });
});
