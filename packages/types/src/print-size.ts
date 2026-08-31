import { z } from 'zod';

export const printSizeSchema = z.object({
  id: z.uuid(),
  // Catalog size code: 1x1, 2x2, 2R, 8R, 8x10, 11x14.
  code: z.string().min(1),
  // Human-readable explanation. The 8R-vs-8x10 nominal duplicate (both appear
  // in docs/catalog.md) is recorded here for client confirmation at seed
  // review — deliberately not resolved by code.
  description: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PrintSize = z.infer<typeof printSizeSchema>;

export const createPrintSizeSchema = printSizeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePrintSizeInput = z.infer<typeof createPrintSizeSchema>;
