import { boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

// Draft v1 schema.
export const servicePackages = pgTable(
  'service_packages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    // Stable shareable identifier (M2 ticket 01): generated from the name at
    // insert; the seed's coalesce upsert never rewrites an existing slug, so
    // /packages/:slug URLs survive catalog renames. Nullable+UNIQUE in
    // migration 0002 (the live table is populated — the seed backfills),
    // NOT NULL in 0003.
    slug: text('slug').unique('service_packages_slug_unique'),
    // Home-page featured strip flag; owner-controlled via seed until the M5 CMS.
    isFeatured: boolean('is_featured').notNull().default(false),
    priceCents: integer('price_cents').notNull(),
    // The catalog specifies no durations; availability (ADR-0005) ignores
    // duration. Nullable until the client supplies real values.
    durationMinutes: integer('duration_minutes'),
    isActive: boolean('is_active').notNull().default(true),
    // R2 object key for the cover image; resolved to a URL at read time.
    coverImageKey: text('cover_image_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Natural key: the seed upserts packages by name (re-runnable, ids stable).
  },
  (table) => [unique('service_packages_name_unique').on(table.name)]
);
