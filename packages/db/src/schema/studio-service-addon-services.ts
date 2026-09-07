import { index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { addonServices } from './addon-services.js';
import { studioServices } from './studio-services.js';

// Add-on applicability matrix (M2 ticket 01): a row MEANS the Add-on Service
// applies to that Studio Service's bookings. Package bookings ignore this
// matrix (uniform all-active-add-ons rule); service bookings accept only
// junction-linked add-ons (enforced API-side, ticket 03).
export const studioServiceAddonServices = pgTable(
  'studio_service_addon_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studioServiceId: uuid('studio_service_id')
      .notNull()
      .references(() => studioServices.id, { onDelete: 'cascade' }),
    addonServiceId: uuid('addon_service_id')
      .notNull()
      .references(() => addonServices.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('studio_service_addon_services_pair_unique').on(
      table.studioServiceId,
      table.addonServiceId
    ),
    index('studio_service_addon_services_addon_service_id_idx').on(table.addonServiceId),
  ]
);
