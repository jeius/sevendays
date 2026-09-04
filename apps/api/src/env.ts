import { z } from 'zod';

// The Worker's runtime env, Zod-parsed once per request (the binding object is
// per-request under workerd) — a missing or malformed DATABASE_URL fails
// loudly here instead of surfacing as a mid-request db error. The exported
// Env derives from the schema; the ambient generated global in
// worker-configuration.d.ts is no longer load-bearing anywhere.
export const envSchema = z.object({
  DATABASE_URL: z.url().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: unknown): Env {
  return envSchema.parse(input);
}
