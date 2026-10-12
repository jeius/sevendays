import { index, integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { addonServices } from './addon-services.js';
import { appointments } from './appointments.js';

// Booking-time attachment of add-on services. price_cents snapshots the
// add-on's flat price at booking — later price edits don't rewrite history.
// Nullable since migration 0009 (ADR-0020): null = the add-on was unpriced
// at booking; priced entries keep their snapshot. The unique pair means an
// add-on attaches at most once per appointment; quantity lives in the
// inclusions model, not here.
export const appointmentAddonServices = pgTable(
  'appointment_addon_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id),
    addonServiceId: uuid('addon_service_id')
      .notNull()
      .references(() => addonServices.id),
    priceCents: integer('price_cents'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('appointment_addon_services_pair_unique').on(table.appointmentId, table.addonServiceId),
    index('appointment_addon_services_appointment_id_idx').on(table.appointmentId),
    index('appointment_addon_services_addon_service_id_idx').on(table.addonServiceId),
  ]
);
