import { z } from 'zod';

// #248: coordinate bounds + precision, owner-ruled 2026-11-13 — decimal
// degrees, at most 6 dp (~0.1 m — what a Google Maps query URL carries).
// String-based so a float like 14.1659812 can't slip through on a rounding
// artifact.
export function atMostSixDp(v: number): boolean {
  return /^-?\d+(\.\d{1,6})?$/.test(String(v));
}

const latitudeSchema = z
  .number()
  .refine(atMostSixDp, 'At most 6 decimal places.')
  .min(-90, 'Latitude must be between -90 and 90.')
  .max(90, 'Latitude must be between -90 and 90.');

const longitudeSchema = z
  .number()
  .refine(atMostSixDp, 'At most 6 decimal places.')
  .min(-180, 'Longitude must be between -180 and 180.')
  .max(180, 'Longitude must be between -180 and 180.');

const mapsLinkSchema = z.url().refine((v) => v.startsWith('https://'), 'Must be an https URL.');

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
  // Coordinates (M7 #248): nullable, both-or-neither enforced on the write
  // schemas; rows always carry both keys post-migration.
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  // Pasted Maps links (M7 #273): the button's source — coordinates (#248)
  // are set aside, dormant (kept in-tree for possible future revival).
  googleMapsUrl: mapsLinkSchema.nullable(),
  appleMapsUrl: mapsLinkSchema.nullable(),
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

// The shared plain write base (#248): a PLAIN object (no refinement) so the
// exported write schemas can each carry the coordinate-pair refinement — a
// refined ZodEffects cannot be .extend()ed, and update still extends the
// base for its cover tri-state.
const branchWriteBase = branchSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    coverImageKey: true,
    latitude: true,
    longitude: true,
  })
  .extend({
    // Media-bind field (ADR-0019, the packages-covers precedent): a fresh
    // STAGING key just uploaded via presign. Absent = no cover at create.
    // Presence-encoded by design — reads never echo keys, so there is no
    // full-object echo to make.
    coverImageKey: z.string().min(1).optional(),
    // #248: omitted = null (the acceptsWalkIns posture — a full-object PUT
    // that omits coordinates clears them; the admin always sends both).
    latitude: latitudeSchema.nullable().default(null),
    longitude: longitudeSchema.nullable().default(null),
    // #273: independently optional — no pair rule. Omitted = null.
    googleMapsUrl: mapsLinkSchema.nullable().default(null),
    appleMapsUrl: mapsLinkSchema.nullable().default(null),
  });

// Both-or-neither (#248, owner-ruled): a branch pin needs the full pair.
function withCoordinatePair<T extends z.ZodObject>(schema: T) {
  return schema.superRefine((value, ctx) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Branch coordinates must be set together.',
        path: ['latitude'],
      });
    }
  });
}

export const createBranchSchema = withCoordinatePair(branchWriteBase);

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

// Full-object PUT (M5 § Mutation shapes) plus the cover's tri-state
// encoding (#137's update shape / ADR-0019): string = bind/replace via a
// fresh staging key, null = clear, absent = unchanged.
export const updateBranchSchema = withCoordinatePair(
  branchWriteBase.extend({
    coverImageKey: z.string().min(1).nullable().optional(),
  })
);

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
