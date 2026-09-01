import { z } from 'zod';

export const attireSchema = z.object({
  id: z.uuid(),
  // Atomic attires (ADR-0009 revision): single values only (Toga,
  // Filipiniana, Executive, Uniform). Combined contexts are junction-composed
  // per inclusion, not stored names.
  name: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Attire = z.infer<typeof attireSchema>;

export const createAttireSchema = attireSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAttireInput = z.infer<typeof createAttireSchema>;
