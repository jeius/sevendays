import { boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

// Paid per-booking extras (Makeup, Hairstyle) with flat per-service pricing —
// no per-package price variants. is_active gates the booking surface without
// deleting catalog history.
export const addonServices = pgTable(
  'addon_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    priceCents: integer('price_cents').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Natural key: the seed upserts add-on services by name.
  },
  (table) => [unique('addon_services_name_unique').on(table.name)]
);
