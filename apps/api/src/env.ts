import { z } from 'zod';

// The Worker's runtime env, Zod-parsed once per request (the binding object is
// per-request under workerd) — a missing or malformed var fails loudly here
// instead of surfacing as a mid-request failure. DATABASE_URL is the pooled
// Supabase connection (ADR-0007). The exported Env derives from the schema;
// the ambient generated global in worker-configuration.d.ts is no longer
// load-bearing anywhere.
export const envSchema = z.object({
  DATABASE_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: unknown): Env {
  return envSchema.parse(input);
}
