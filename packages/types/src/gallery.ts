import { z } from 'zod';

// Gallery Category (M5, glossary): a staff-managed grouping of Gallery
// Photos — one tab of the about grid. Reordering is the collection order PUT
// ({ categoryIds }); position is server-assigned and never client-supplied,
// so create/update carry no position field.
export const galleryCategorySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  position: z.number().int().min(1),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type GalleryCategory = z.infer<typeof galleryCategorySchema>;

export const createGalleryCategorySchema = galleryCategorySchema.omit({
  id: true,
  position: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateGalleryCategoryInput = z.infer<typeof createGalleryCategorySchema>;

// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateGalleryCategorySchema = createGalleryCategorySchema;

export type UpdateGalleryCategoryInput = CreateGalleryCategoryInput;

// Gallery Photo (M5, ADR-0019): the row stores the R2 object key; the wire
// carries photoUrl only — raw keys never leave the API. This is the admin
// read (deactivated rows included); the public read below is the trimmed
// active-only assembly. categoryId null = uncategorized = staff-only.
export const galleryPhotoSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  caption: z.string().nullable(),
  categoryId: z.uuid().nullable(),
  position: z.number().int().min(1),
  isActive: z.boolean().default(true),
  photoUrl: z.url(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type GalleryPhoto = z.infer<typeof galleryPhotoSchema>;

// Spec-pinned create payload (§ The media pipeline): the staging key the
// client just uploaded, plus optional metadata. The commit endpoint verifies
// and promotes the key (#136/#137) — a final key never appears on an input.
export const createGalleryPhotoSchema = z.object({
  r2Key: z.string().min(1),
  title: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
});

export type CreateGalleryPhotoInput = z.infer<typeof createGalleryPhotoSchema>;

// Full-object metadata edit; r2Key is presence-encoded (ADR-0019): present
// only to REPLACE the photo through a fresh staging key (keys are immutable;
// replace = new key + row update + old-key delete). title/caption/categoryId
// are full-object — null clears, never "leave alone".
export const updateGalleryPhotoSchema = z.object({
  r2Key: z.string().min(1).optional(),
  title: z.string().nullable(),
  caption: z.string().nullable(),
  categoryId: z.uuid().nullable(),
  isActive: z.boolean(),
});

export type UpdateGalleryPhotoInput = z.infer<typeof updateGalleryPhotoSchema>;

// Collection order PUTs (M5 § Ordering): one full-replace per positioned
// collection — the server renumbers in one transaction (#137).
export const galleryCategoryOrderSchema = z.object({
  categoryIds: z.array(z.uuid()),
});

export type GalleryCategoryOrderInput = z.infer<typeof galleryCategoryOrderSchema>;

export const galleryPhotoOrderSchema = z.object({
  photoIds: z.array(z.uuid()),
});

export type GalleryPhotoOrderInput = z.infer<typeof galleryPhotoOrderSchema>;

// Public read (GET /api/v1/gallery, #138): one assembled payload — active
// categories (array order = tab order) and active categorized photos.
// Positions are server-side ordering; the payload carries no position
// fields, and uncategorized photos never appear here.
export const publicGalleryCategorySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const publicGalleryPhotoSchema = z.object({
  id: z.uuid(),
  photoUrl: z.url(),
  title: z.string().nullable(),
  categoryId: z.uuid(),
});

export const galleryReadSchema = z.object({
  categories: z.array(publicGalleryCategorySchema),
  photos: z.array(publicGalleryPhotoSchema),
});

export type PublicGalleryCategory = z.infer<typeof publicGalleryCategorySchema>;
export type PublicGalleryPhoto = z.infer<typeof publicGalleryPhotoSchema>;
export type GalleryRead = z.infer<typeof galleryReadSchema>;
