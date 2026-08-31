import { z } from 'zod';
import { packageInclusionSchema } from './inclusion.js';

export const servicePackageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  // The catalog specifies no durations and availability (ADR-0005) ignores
  // duration — nullable until the client supplies real values.
  durationMinutes: z.number().int().positive().nullable(),
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

// Read shape for GET /api/service-packages: the row plus its Inclusion rows
// (joined/structured — spec "API surface after M1").
export const servicePackageWithInclusionsSchema = servicePackageSchema.extend({
  inclusions: z.array(packageInclusionSchema),
});

export type ServicePackageWithInclusions = z.infer<typeof servicePackageWithInclusionsSchema>;
