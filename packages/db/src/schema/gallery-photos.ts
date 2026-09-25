import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { galleryCategories } from './gallery-categories.js';

// Gallery Photo (M5, ADR-0019): the row stores the R2 object key; reads
// resolve photoUrl at read time — raw keys never leave the API. The
// category FK is NULLABLE by ruling: an uncategorized photo is staff-only
// and absent from public reads. Deactivation is the reversible is_active
// flip; replacing a photo is a new immutable key + row update + old-key
// delete, never an in-place overwrite.
export const galleryPhotos = pgTable(
  'gallery_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    r2Key: text('r2_key').notNull(),
    title: text('title'),
    caption: text('caption'),
    categoryId: uuid('category_id').references(() => galleryCategories.id),
    position: integer('position').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('gallery_photos_r2_key_unique').on(table.r2Key),
    // FK lookup index (the M1.2 review ruling): public reads filter by
    // category; the admin category panel lists a category's photos.
    index('gallery_photos_category_id_idx').on(table.categoryId),
  ]
);
