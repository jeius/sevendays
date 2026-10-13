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
  // R2 object key for the cover image (M7 #214): the ROW shape keeps the
  // key for read-time resolution; the wire never carries it — reads parse
  // branchReadSchema below (the servicePackageReadSchema precedent).
  coverImageKey: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Branch = z.infer<typeof branchSchema>;

// The canonical read shape (M7 #214, the servicePackageReadSchema
// precedent): the wire never carries the raw R2 object key — every read
// resolves coverImageUrl against MEDIA_PUBLIC_BASE_URL at read time.
// Admin reads (deactivated rows included) and the public read share this
// shape; trim rules are content-level, not shape-level.
export const branchReadSchema = branchSchema.omit({ coverImageKey: true }).extend({
  coverImageUrl: z.url().nullable(),
});

export type BranchRead = z.infer<typeof branchReadSchema>;

// Media-bind field (ADR-0019, the packages-covers precedent): a fresh
// STAGING key just uploaded via presign. Absent = no cover at create.
// Presence-encoded by design — reads never echo keys, so there is no
// full-object echo to make.
export const createBranchSchema = branchSchema
  .omit({ id: true, createdAt: true, updatedAt: true, coverImageKey: true })
  .extend({ coverImageKey: z.string().min(1).optional() });

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

// Full-object PUT (M5 § Mutation shapes) plus the cover's tri-state
// encoding (#137's update shape / ADR-0019): string = bind/replace via a
// fresh staging key, null = clear, absent = unchanged.
export const updateBranchSchema = createBranchSchema.extend({
  coverImageKey: z.string().min(1).nullable().optional(),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
