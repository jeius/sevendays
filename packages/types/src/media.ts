import { z } from 'zod';

// Media presign vocabulary (M5 #136, ADR-0019). The client names a purpose
// and a content type; the server assigns the staging key — the client never
// supplies key text. Content-Type is signed into the upload URL (allHeaders:
// true at the signing site — see apps/api/src/services/media.ts), so type is
// enforced at presign. Size is NOT declarable here: a presigned PUT cannot
// carry a size condition, so the commit-time HEAD is the real gate.
// #246: content types are per-purpose — the brand logo accepts PNG (the
// owner ruling of 2026-11-13); every other purpose stays JPG-only (#170).
// The presign request schema below is a union: it validates the
// (purpose, contentType) PAIR, not the enum cross-product — a site-logo
// presign may carry either type, the rest only image/jpeg.
export const MEDIA_CONTENT_TYPES = ['image/jpeg'] as const;
export const SITE_LOGO_CONTENT_TYPES = ['image/jpeg', 'image/png'] as const;

export type MediaContentType = (typeof SITE_LOGO_CONTENT_TYPES)[number];

// #246: the single upload cap, owner-ruled 2026-11-13 (was 50 MiB, ADR-0019
// as written). Exported so the api commit gate and the admin courtesy
// pre-check read ONE number — they cannot drift.
export const MEDIA_UPLOAD_CAP_BYTES = 10 * 1024 * 1024;

// 'branch-cover' joined with M7 #214; 'site-logo' with M7 #215: the brand
// logo rides the same presign/commit pipeline under its own purpose (the
// brand/ prefix — a logo is not a cover).
export const mediaPurposeSchema = z.enum([
  'package-cover',
  'branch-cover',
  'site-logo',
  'gallery-photo',
]);

export type MediaPurpose = z.infer<typeof mediaPurposeSchema>;

export const mediaPresignRequestSchema = z
  .object({
    purpose: mediaPurposeSchema,
    contentType: z.enum(SITE_LOGO_CONTENT_TYPES),
  })
  .superRefine((val, ctx) => {
    // #246: the (purpose, contentType) PAIR is the rule — site-logo accepts
    // PNG (owner ruling 2026-11-13); every other purpose stays JPG-only
    // (#170). The custom issue rides at ['contentType'] so the route's
    // validator 400 keeps field-level details (the union shape lost them —
    // union failures carry path []).
    const allowed: readonly MediaContentType[] =
      val.purpose === 'site-logo' ? SITE_LOGO_CONTENT_TYPES : MEDIA_CONTENT_TYPES;
    if (!allowed.includes(val.contentType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['contentType'],
        message: `contentType '${val.contentType}' is not allowed for purpose '${val.purpose}' (allowed: ${allowed.join(', ')})`,
      });
    }
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
// this closes): lowercase-hex uuid + the jpeg/png extension, `tmp/` prefix
// (#246 added .png for the site-logo purpose).
export const mediaStagingKeySchema = z
  .string()
  .regex(/^tmp\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/);

export type MediaStagingKey = z.infer<typeof mediaStagingKeySchema>;
