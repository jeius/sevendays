import { z } from 'zod';

export const branchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  acceptsWalkIns: z.boolean().default(false),
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
