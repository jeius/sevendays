import { z } from 'zod';
import { attireSchema } from './attire.js';
import { frameSchema } from './frames.js';
import { packageInclusionKindSchema, packageInclusionSchema } from './inclusion.js';
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
  // Stable shareable identifier (M2 ticket 01): URL key for /packages/:slug.
  // Seed/server-assigned from the name — never rewritten on rename.
  slug: z.string().min(1),
  // Home-page featured strip flag; seed-controlled until the M5 CMS.
  isFeatured: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ServicePackage = z.infer<typeof servicePackageSchema>;

// The atomic package save (M5 § Mutation shapes): POST/PUT carries entity
// fields + coverImageKey + frames[] + inclusions[] in ONE payload — the
// inclusions editor is a screen, not a resource. Array order is the order:
// frameNumber = frames array order, inclusion position = array order
// (server-side, #137).
//
// Frame identity in the payload is a client-assigned string TOKEN: the
// editor echoes existing frame uuids from the read (resolvedFrameSchema.id)
// and mints fresh tokens for new frames; the server rewrites real frame
// rows. Tokens are strings, not uuids, by design.
export const packageSaveFrameSchema = z.object({
  id: z.string().min(1),
});

export type PackageSaveFrame = z.infer<typeof packageSaveFrameSchema>;

// One inclusion row inside the save. frameId references a frames[] token
// (framed_picture only — membership is enforced at the package level below,
// where the token set exists). attireIds is a required array: full-object,
// possibly empty (privileges with no grant; picture kinds need ≥1, enforced
// here where the path is the inclusion's own).
export const packageSaveInclusionSchema = z
  .object({
    kind: packageInclusionKindSchema,
    quantity: z.number().int().positive().nullable(),
    printSizeId: z.uuid().nullable(),
    frameId: z.string().min(1).nullable().optional(),
    attireIds: z.array(z.uuid()),
    description: z.string().min(1).nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'privilege') return;
    if (value.attireIds.length < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['attireIds'],
        message: `${value.kind} inclusions require at least one attire`,
      });
    }
  });

export type PackageSaveInclusionInput = z.infer<typeof packageSaveInclusionSchema>;

// Field shape shared by create and update. The package-level refinement is
// applied per shape below: zod 4 refuses to extend (or safeExtend-overwrite
// keys of) an already-refined object, so the refinement is applied LAST.
const packageSaveObjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  // The catalog specifies no durations and availability (ADR-0005) ignores
  // duration — nullable until the client supplies real values.
  durationMinutes: z.number().int().positive().nullable(),
  isActive: z.boolean().default(true),
  // Home-page featured strip flag; the CMS editor owns it from M5 on.
  isFeatured: z.boolean().default(false),
  // Media-bind field (ADR-0019): a fresh STAGING key just uploaded via
  // presign. Absent = no cover at create. Presence-encoded by design —
  // reads never echo keys, so there is no full-object echo to make.
  coverImageKey: z.string().min(1).optional(),
  frames: z.array(packageSaveFrameSchema),
  inclusions: z.array(packageSaveInclusionSchema),
});

// The frame rules (token uniqueness, framed_picture ⇒ known token, other
// kinds ⇒ no frameId) hold for both create and update; the two payload types
// differ only in slug/coverImageKey, which these rules ignore.
type PackageSaveRefinePayload = {
  frames: { id: string }[];
  inclusions: { kind: z.infer<typeof packageInclusionKindSchema>; frameId?: string | null }[];
};

const refinePackageSave = (pkg: PackageSaveRefinePayload, ctx: z.RefinementCtx): void => {
  const tokens = new Set(pkg.frames.map((frame) => frame.id));
  if (tokens.size !== pkg.frames.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['frames'],
      message: 'frame tokens must be unique',
    });
  }
  for (const [i, inclusion] of pkg.inclusions.entries()) {
    if (inclusion.kind === 'framed_picture') {
      if (!inclusion.frameId) {
        ctx.addIssue({
          code: 'custom',
          path: ['inclusions', i, 'frameId'],
          message: 'framed_picture inclusions require a frame token',
        });
      } else if (!tokens.has(inclusion.frameId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['inclusions', i, 'frameId'],
          message: 'frameId must reference a frames[] token',
        });
      }
    } else if (inclusion.frameId != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['inclusions', i, 'frameId'],
        message: 'only framed_picture inclusions carry a frameId',
      });
    }
  }
};

export const createServicePackageSchema = packageSaveObjectSchema.superRefine(refinePackageSave);

export type CreateServicePackageInput = z.infer<typeof createServicePackageSchema>;

// Full-object PUT plus the advanced fields: slug is server-generated at
// create (#137 calls slugifyName) and editable here behind the break-links
// warning; coverImageKey gains the null-clear case (string = bind/replace
// via a fresh staging key, null = clear, absent = unchanged).
export const updateServicePackageSchema = packageSaveObjectSchema
  .extend({
    slug: z.string().min(1),
    coverImageKey: z.string().min(1).nullable().optional(),
  })
  .superRefine(refinePackageSave);

export type UpdateServicePackageInput = z.infer<typeof updateServicePackageSchema>;

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

// The canonical read shape (M5, ADR-0019): the wire never carries the raw R2
// object key — every read resolves coverImageUrl against MEDIA_PUBLIC_BASE_URL
// at read time (#136/#137's wiring, #138's swap). Admin reads (deactivated
// rows included) and public reads share this shape; trim rules are
// content-level (#138), not shape-level.
export const servicePackageReadSchema = servicePackageSchema.omit({ coverImageKey: true }).extend({
  coverImageUrl: z.url().nullable(),
  inclusions: z.array(resolvedInclusionSchema),
  frames: z.array(resolvedFrameSchema),
});

export type ServicePackageRead = z.infer<typeof servicePackageReadSchema>;
