import { z } from 'zod';

export const addonServiceSchema = z.object({
  id: z.uuid(),
  // Catalog: "Makeup", "Hairstyle" — flat per-service pricing, no
  // per-package price variants.
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AddonService = z.infer<typeof addonServiceSchema>;

export const createAddonServiceSchema = addonServiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAddonServiceInput = z.infer<typeof createAddonServiceSchema>;
