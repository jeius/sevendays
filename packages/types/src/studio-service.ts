import { z } from 'zod';

// Mirror of the studio_services row (M2 ticket 01). The M2 API read shape —
// StudioService plus embedded bookableBranchIds — extends THIS schema in
// ticket 04; define nothing per-route elsewhere.
export const studioServiceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type StudioService = z.infer<typeof studioServiceSchema>;

export const createStudioServiceSchema = studioServiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateStudioServiceInput = z.infer<typeof createStudioServiceSchema>;
