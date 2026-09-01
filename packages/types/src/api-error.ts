import { z } from 'zod';

// One uniform error shape for every API failure — 400s, unresolvable
// references, validation payloads, and 500s all carry it (M1.4 ruling,
// pulled forward from the M2 pre-flight so two shapes never coexist).
export const apiErrorSchema = z.object({
  error: z.string().min(1),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
