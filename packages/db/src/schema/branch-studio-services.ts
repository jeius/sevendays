import { index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { branches } from './branches.js';
import { studioServices } from './studio-services.js';

// Presence-row junction (M2 ticket 01): a row MEANS the Studio Service is
// bookable at that Branch — no boolean column to drift. Seeded all-branches
// today; the M5 CMS edits rows directly. Children of the studio service —
// cascade delete keeps the seed's per-service rebuild trivial.
export const branchStudioServices = pgTable(
  'branch_studio_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    studioServiceId: uuid('studio_service_id')
      .notNull()
      .references(() => studioServices.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('branch_studio_services_pair_unique').on(table.studioServiceId, table.branchId),
    // FK lookup index (M1.2 review ruling): the booking form's branch step
    // reads bookable services by branch.
    index('branch_studio_services_branch_id_idx').on(table.branchId),
  ]
);
