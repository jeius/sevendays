import { z } from 'zod';

// The Worker's runtime env, Zod-parsed once per request (the binding object is
// per-request under workerd) — a missing or malformed var fails loudly here
// instead of surfacing as a mid-request failure. DATABASE_URL is the pooled
// Supabase connection (ADR-0007).
//
// Two OPTIONAL keys, each with a loud owner (fail-everything would be wrong):
// - BETTER_AUTH_SECRET (M4 ticket 04): the auth middleware owns the missing-
//   secret failure, so only gated routes care.
// - The R2 S3-token pair (M5 #136): the presign service owns the missing-
//   credential failure (MissingR2CredentialsError), so a deploy made before
//   the owner's token mint serves everything except presign — never a silent
//   fallback there either.
//
// MEDIA_BUCKET/IMAGES are REQUIRED bindings (they deploy with wrangler.toml
// once the sevendays-media bucket exists — docs/media-bucket-runbook.md), and
// CLOUDFLARE_ACCOUNT_ID/MEDIA_PUBLIC_BASE_URL are REQUIRED per-environment
// values (CI passes them at deploy; the DATABASE_URL posture applies). The
// z.custom object check makes a binding's absence a parse failure instead of
// a mid-route TypeError. The ambient generated global in
// worker-configuration.d.ts stays no longer load-bearing anywhere (the
// R2Bucket/ImagesBinding types come from @cloudflare/workers-types).
export const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  MEDIA_BUCKET: z.custom<R2Bucket>((v) => v !== null && typeof v === 'object'),
  IMAGES: z.custom<ImagesBinding>((v) => v !== null && typeof v === 'object'),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  MEDIA_PUBLIC_BASE_URL: z.url(),
  R2_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: unknown): Env {
  return envSchema.parse(input);
}
