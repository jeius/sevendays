import { z } from 'zod';

// Mirror of the studio_services row (M2 ticket 01). The M2 API read shape:
// StudioService plus embedded bookableBranchIds and
// applicableAddonServiceIds (ticket 07), extends THIS schema in tickets
// 04/07; define nothing per-route elsewhere.
export const studioServiceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  // Null = unpriced (ADR-0020): inquiry-priced offerings are fully bookable;
  // no sentinel value. Nullable on reads AND writes alike.
  priceCents: z.number().int().nonnegative().nullable(),
  isActive: z.boolean().default(true),
  // R2 object key for the cover image (#331): the ROW shape keeps the key
  // for read-time resolution; the wire never carries it, reads parse the
  // canonical shape below (the branchReadSchema precedent, M7 #214).
  coverImageKey: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type StudioService = z.infer<typeof studioServiceSchema>;

export const createStudioServiceSchema = studioServiceSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    coverImageKey: true,
  })
  .extend({
    // Media-bind field (#331, ADR-0019, the branchWriteBase precedent): a
    // fresh STAGING key just uploaded via presign. Absent = no cover at
    // create; null is meaningless before a row exists (create rejects it).
    coverImageKey: z.string().min(1).optional(),
  });

export type CreateStudioServiceInput = z.infer<typeof createStudioServiceSchema>;

// Read shape for GET /api/v1/studio-services (M2 ticket 04; ticket 07 adds
// the applicability embed): active Studio Services with the branches they
// are bookable at and the ACTIVE add-ons that apply to them, embedded as
// bare ids, the booking form's branch step filters by membership, its
// add-ons step matrix-gates by the applicability ids, and the pages join
// names from the sibling reads. Extends the row mirror (a plain object
// schema, no refine, the zod v4 chain rule is not at play).
export const studioServiceWithBranchesSchema = studioServiceSchema
  .omit({ coverImageKey: true })
  .extend({
    bookableBranchIds: z.array(z.uuid()),
    applicableAddonServiceIds: z.array(z.uuid()),
    // #331: resolved against MEDIA_PUBLIC_BASE_URL at read time (the
    // branchReadSchema law), the wire carries the absolute URL, null
    // passthrough for a null key; the raw key never leaves the API.
    coverImageUrl: z.url().nullable(),
  });

export type StudioServiceWithBranches = z.infer<typeof studioServiceWithBranchesSchema>;

// Full-object PUT (M5 § Mutation shapes) plus the cover's tri-state
// encoding (#331, the updateBranchSchema law): string = bind/replace via a
// fresh staging key, null = clear, absent = unchanged.
export const updateStudioServiceSchema = createStudioServiceSchema.extend({
  coverImageKey: z.string().min(1).nullable().optional(),
});

export type UpdateStudioServiceInput = z.infer<typeof updateStudioServiceSchema>;

// Applicability matrix payloads (M5 § Route topology): full-replace PUTs
// keyed by the studio service, the server diffs and rewrites the junction
// rows in one transaction (#137).
export const studioServiceBranchMatrixSchema = z.object({
  branchIds: z.array(z.uuid()),
});

export type StudioServiceBranchMatrixInput = z.infer<typeof studioServiceBranchMatrixSchema>;

export const studioServiceAddonMatrixSchema = z.object({
  addonServiceIds: z.array(z.uuid()),
});

export type StudioServiceAddonMatrixInput = z.infer<typeof studioServiceAddonMatrixSchema>;
