import { z } from 'zod';

// The Worker's runtime env, Zod-parsed once per request (the binding object is
// per-request under workerd) — a missing or malformed var fails loudly here
// instead of surfacing as a mid-request failure. DATABASE_URL is the pooled
// Supabase connection (ADR-0007). The email pair (issue #47) has no fallback
// by design — the API_URL posture: a deploy without either var fails every
// /api/v1 request (acquireDb parses the full schema) rather than silently
// dropping confirmation emails. BETTER_AUTH_SECRET (M4 ticket 04) is the one
// OPTIONAL key: requiring it here would fail every /api/v1 request on a
// Worker without the secret (the teaser until #122's puts) — instead the
// auth middleware owns the loud missing-secret failure, so only gated routes
// care. The exported Env derives from the schema; the ambient generated
// global in worker-configuration.d.ts is no longer load-bearing anywhere.
export const envSchema = z.object({
  DATABASE_URL: z.url(),
  RESEND_API_KEY: z.string().min(1),
  LANDING_ORIGIN: z.url(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: unknown): Env {
  return envSchema.parse(input);
}
