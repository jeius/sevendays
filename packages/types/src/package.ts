import { z } from 'zod';

export const servicePackageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  isActive: z.boolean().default(true),
  coverImageKey: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ServicePackage = z.infer<typeof servicePackageSchema>;

export const createServicePackageSchema = servicePackageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateServicePackageInput = z.infer<typeof createServicePackageSchema>;
