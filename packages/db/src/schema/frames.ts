import { index, integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { servicePackages } from './service-packages.js';

// One row per catalog Frame line within a package (ADR-0009 revision): frame
// identity so a multi-picture frame = N inclusions sharing one frame_id.
// Numbering: explicit "Frame 1/2/3" headings map as-is; unlabeled multi-line
// "Frame:" sections number in listed order (1..N); a single frame gets 1.
export const frames = pgTable(
  'frames',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    servicePackageId: uuid('service_package_id')
      .notNull()
      .references(() => servicePackages.id),
    frameNumber: integer('frame_number').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('frames_pair_unique').on(table.servicePackageId, table.frameNumber),
    index('frames_service_package_id_idx').on(table.servicePackageId),
  ]
);
