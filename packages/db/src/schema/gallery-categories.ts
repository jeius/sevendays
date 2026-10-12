import { boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

// Gallery Category (M5, glossary): a staff-managed grouping of Gallery
// Photos — one tab of the about grid, shown in a fixed order. Reordering is
// the collection order PUT ({ categoryIds }); position is server-assigned
// and never client-supplied. Deactivation is the reversible is_active flip;
// true deletion exists since M7 #213 (guarded DELETE) only while no photo
// references the category — the api's admin-delete service owns the guard.
export const galleryCategories = pgTable(
  'gallery_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Natural key: category names are the tab labels — unique by ruling.
  },
  (table) => [unique('gallery_categories_name_unique').on(table.name)]
);
