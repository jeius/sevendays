import { boolean, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

// Draft v1 schema. Adjust once real requirements (hours, geo, etc.) are confirmed.
export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    address: text('address').notNull(),
    phone: text('phone').notNull(),
    acceptsWalkIns: boolean('accepts_walk_ins').notNull().default(false),
    // Deactivation (M5): hidden from public reads (#138 makes them
    // active-only), reversible, never a delete — the same posture
    // service_packages has had since M1.
    isActive: boolean('is_active').notNull().default(true),
    // R2 object key for the cover image (M7 #214, the packages-covers
    // precedent / ADR-0019): resolved to coverImageUrl at read time — raw
    // keys never leave the API. Born nullable: the live branches carry no
    // covers yet.
    coverImageKey: text('cover_image_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Natural key: the seed upserts branches by name (re-runnable, ids stable).
  },
  (table) => [unique('branches_name_unique').on(table.name)]
);
