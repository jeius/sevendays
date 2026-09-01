import { z } from 'zod';

export const packageInclusionKindSchema = z.enum(['framed_picture', 'print', 'privilege']);

export type PackageInclusionKind = z.infer<typeof packageInclusionKindSchema>;

export const packageInclusionSchema = z.object({
  id: z.uuid(),
  kind: packageInclusionKindSchema,
  // Framed pictures and prints carry a count; privileges (wardrobe/accessory
  // usage, High-Resolution soft copies) are quantityless — null by design.
  quantity: z.number().int().positive().nullable(),
  // Structural finish rule (no finish column): framed_picture rows are
  // laminated, print rows are loose — the kind decides, not data.
  printSizeId: z.uuid().nullable(),
  // Attire context lives in the package_inclusion_attires junction (ADR-0009
  // revision): the read shape carries the resolved id array (0..N — the ≥1
  // rule for picture inclusions is kind-dependent and enforced on the create
  // shape, not here).
  attireIds: z.array(z.uuid()),
  // Frame identity (ADR-0009 revision): which catalog frame this framed
  // picture belongs to — null for prints and privileges. Required-nullable
  // on the row shape; optional+nullable on the create shape.
  frameId: z.uuid().nullable(),
  description: z.string().min(1).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PackageInclusion = z.infer<typeof packageInclusionSchema>;

export const createPackageInclusionSchema = packageInclusionSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    frameId: z.uuid().nullable().optional(),
    attireIds: z.array(z.uuid()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'privilege') return;
    const attireIds = value.attireIds;
    if (!attireIds || attireIds.length < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['attireIds'],
        message: `${value.kind} inclusions require at least one attire`,
      });
    }
  });

export type CreatePackageInclusionInput = z.infer<typeof createPackageInclusionSchema>;
