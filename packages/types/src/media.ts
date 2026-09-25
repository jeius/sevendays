import { z } from 'zod';

// Media presign vocabulary (M5 #136, ADR-0019). The client names a purpose
// and a content type; the server assigns the staging key — the client never
// supplies key text. Content-Type is signed into the upload URL (allHeaders:
// true at the signing site — see apps/api/src/services/media.ts), so type is
// enforced at presign. Size is NOT declarable here: a presigned PUT cannot
// carry a size condition, so the commit-time HEAD is the real gate.
export const MEDIA_CONTENT_TYPES = ['image/jpeg'] as const;

export const mediaPurposeSchema = z.enum(['package-cover', 'gallery-photo']);

export type MediaPurpose = z.infer<typeof mediaPurposeSchema>;

export const mediaPresignRequestSchema = z.object({
  purpose: mediaPurposeSchema,
  contentType: z.enum(MEDIA_CONTENT_TYPES),
});

export type MediaPresignRequest = z.infer<typeof mediaPresignRequestSchema>;

export const mediaPresignResponseSchema = z.object({
  key: z.string().min(1),
  uploadUrl: z.url(),
});

export type MediaPresignResponse = z.infer<typeof mediaPresignResponseSchema>;

// The only staging-key shape the commit endpoint accepts: what presign mints,
// and nothing else. Anchored (a `covers/…`-style final key can never ride the
// commit path — promoting and then DELETING an arbitrary object is the attack
// this closes): lowercase-hex uuid + the jpeg extension, `tmp/` prefix.
export const mediaStagingKeySchema = z
  .string()
  .regex(/^tmp\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/);

export type MediaStagingKey = z.infer<typeof mediaStagingKeySchema>;
