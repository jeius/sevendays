import { z } from 'zod';

export const frameSchema = z.object({
  id: z.uuid(),
  servicePackageId: z.uuid(),
  frameNumber: z.number().int().min(1),
});

export type PackageFrame = z.infer<typeof frameSchema>;
