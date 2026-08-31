import { z } from 'zod';

export const packageInclusionKindSchema = z.enum(['framed_picture', 'print', 'privilege']);

export type PackageInclusionKind = z.infer<typeof packageInclusionKindSchema>;

export const packageInclusionSchema = z.object({
  id: z.string().uuid(),
  kind: packageInclusionKindSchema,
  // Framed pictures and prints carry a count; privileges (wardrobe/accessory
  // usage, High-Resolution soft copies) are quantityless — null by design.
  quantity: z.number().int().positive().nullable(),
  // Structural finish rule (no finish column): framed_picture rows are
  // laminated, print rows are loose — the kind decides, not data.
  printSizeId: z.string().uuid().nullable(),
  attireId: z.string().uuid().nullable(),
  description: z.string().min(1).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PackageInclusion = z.infer<typeof packageInclusionSchema>;

export const createPackageInclusionSchema = packageInclusionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePackageInclusionInput = z.infer<typeof createPackageInclusionSchema>;
