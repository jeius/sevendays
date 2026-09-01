import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { branches } from './branches.js';
import { servicePackages } from './service-packages.js';

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
    servicePackageId: uuid('service_package_id')
      .notNull()
      .references(() => servicePackages.id),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    status: appointmentStatusEnum('status').notNull().default('pending'),
    kind: appointmentKindEnum('kind').notNull().default('scheduled'),
    // Booking-time snapshot of the package price — the quoted price survives
    // later catalog price changes. Server-written at booking (M1.4).
    packagePriceCents: integer('package_price_cents').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // FK lookup indexes (M1.2 review ruling): M1.4 lists by branch, joins package.
  },
  (table) => [
    index('appointments_branch_id_idx').on(table.branchId),
    index('appointments_service_package_id_idx').on(table.servicePackageId),
  ]
);
