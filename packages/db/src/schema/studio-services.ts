import { boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

// Standalone studio offerings bookable in their own right (M2 ticket 01) —
// photo recovery, tarpaulin & bulletin printing, portraits & ID photo,
// picture framing. Distinct from service_packages (bundles Inclusions) and
// addon_services (attach to a booking). Per-branch bookability lives in
// branch_studio_services; add-on applicability in studio_service_addon_services.
export const studioServices = pgTable(
  'studio_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    priceCents: integer('price_cents').notNull(),
    // is_active gates the booking surface without deleting catalog history
    // (same posture as addon_services).
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Natural key: the seed upserts studio services by name (re-runnable, ids stable).
  },
  (table) => [unique('studio_services_name_unique').on(table.name)]
);
