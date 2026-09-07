import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { branches } from './branches.js';
import { servicePackages } from './service-packages.js';
import { studioServices } from './studio-services.js';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

// How the session happens (scheduled, walk-in, visitation) — recorded only;
// the walk-in booking and visitation flows are deferred features.
export const appointmentKindEnum = pgEnum('appointment_kind', [
  'scheduled',
  'walk_in',
  'visitation',
]);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    // The appointment carries EITHER offering (M2 ticket 02): nullable refs
    // + the appointments_offering_exactly_one CHECK below. NULL means "not
    // booked" — the CHECK rejects both-set and neither alike, mirroring the
    // Zod refine in packages/types/src/appointment.ts (one formula, two
    // sides — changing one means changing both).
    servicePackageId: uuid('service_package_id').references(() => servicePackages.id),
    studioServiceId: uuid('studio_service_id').references(() => studioServices.id),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    status: appointmentStatusEnum('status').notNull().default('pending'),
    kind: appointmentKindEnum('kind').notNull().default('scheduled'),
    // Booking-time snapshot of the booked offering's price — the quoted
    // price survives later catalog price changes. Server-written at booking
    // (M1.4). Renamed from package_price_cents (M2 ticket 02): it now
    // snapshots either offering kind.
    bookedPriceCents: integer('booked_price_cents').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // FK lookup indexes (M1.2 review ruling): M1.4 lists by branch, joins
    // package; the studio-service side joins once ticket 04's reads need it.
  },
  (table) => [
    index('appointments_branch_id_idx').on(table.branchId),
    index('appointments_service_package_id_idx').on(table.servicePackageId),
    // Exactly one of the two offering refs is set. The SQL formula is the
    // literal mirror of hasExactlyOneAppointmentOffering in
    // packages/types/src/appointment.ts: (a is null) <> (b is null) is true
    // iff exactly one of the two is NULL.
    check(
      'appointments_offering_exactly_one',
      sql`
      (appointments.service_package_id is null) <> (appointments.studio_service_id is null)
    `
    ),
  ]
);
