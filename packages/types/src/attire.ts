import { z } from 'zod';

export const attireSchema = z.object({
  id: z.uuid(),
  // Atomic attires (ADR-0009 revision): single values only (Toga,
  // Filipiniana, Executive, Uniform). Combined contexts are junction-composed
  // per inclusion, not stored names.
  name: z.string().min(1),
  // Deactivation (M5): a deactivated attire trims from its inclusion's
  // attire list on public reads (#138); the inclusion still renders.
  isActive: z.boolean().default(true),
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

// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateAttireSchema = createAttireSchema;

export type UpdateAttireInput = CreateAttireInput;
