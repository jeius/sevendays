import { z } from 'zod';
import { attireSchema } from './attire.js';
import { frameSchema } from './frames.js';
import { packageInclusionSchema } from './inclusion.js';
import { printSizeSchema } from './print-size.js';

export const servicePackageSchema = z.object({
  id: z.uuid(),
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

// Resolved lookups (M1.4 Q1=B): the catalog read carries the lookup values,
// not bare uuids — one join away server-side, no second request for M2.
export const resolvedPrintSizeSchema = printSizeSchema.pick({
  id: true,
  code: true,
  description: true,
});

export const resolvedAttireSchema = attireSchema.pick({ id: true, name: true });

export const resolvedFrameSchema = frameSchema.pick({ id: true, frameNumber: true });

export type ResolvedPrintSize = z.infer<typeof resolvedPrintSizeSchema>;
export type ResolvedAttire = z.infer<typeof resolvedAttireSchema>;
export type ResolvedFrame = z.infer<typeof resolvedFrameSchema>;

export const resolvedInclusionSchema = packageInclusionSchema
  .omit({ printSizeId: true, attireIds: true })
  .extend({
    printSize: resolvedPrintSizeSchema.nullable(),
    attires: z.array(resolvedAttireSchema),
  });

export type ResolvedPackageInclusion = z.infer<typeof resolvedInclusionSchema>;

// Read shape for GET /api/service-packages (M1.4): active packages with
// resolved Inclusions and first-class Frames (forward-compatible with
// multi-picture frames).
export const servicePackageWithInclusionsSchema = servicePackageSchema.extend({
  inclusions: z.array(resolvedInclusionSchema),
  frames: z.array(resolvedFrameSchema),
});

export type ServicePackageWithInclusions = z.infer<typeof servicePackageWithInclusionsSchema>;
