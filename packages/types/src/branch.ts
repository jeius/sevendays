import { z } from 'zod';

export const branchSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  acceptsWalkIns: z.boolean().default(false),
  // Deactivation (M5): hidden from public reads once #138 makes them
  // active-only; reversible, never a delete. Defaulted so pre-column
  // fixtures keep parsing.
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Branch = z.infer<typeof branchSchema>;

export const createBranchSchema = branchSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateBranchSchema = createBranchSchema;

export type UpdateBranchInput = CreateBranchInput;
