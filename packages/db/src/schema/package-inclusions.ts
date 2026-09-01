import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { frames } from './frames.js';
import { printSizes } from './print-sizes.js';
import { servicePackages } from './service-packages.js';

export const packageInclusionKindEnum = pgEnum('package_inclusion_kind', [
  'framed_picture',
  'print',
  'privilege',
]);

// Per-Service-Package Inclusion rows. Privileges (wardrobe/accessory usage,
// High-Resolution soft copies) are quantityless rows with no lookup refs —
// seeded per package even though the catalog list is universal, so the CMS
// can edit them later rather than the model hard-coding them.
// No finish column: framed_picture rows are laminated, print rows are raw —
// structural, decided by kind.
// Attire context lives in package_inclusion_attires (ADR-0009 revision) —
// this table carries no attire reference.
export const packageInclusions = pgTable(
  'package_inclusions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    servicePackageId: uuid('service_package_id')
      .notNull()
      .references(() => servicePackages.id),
    kind: packageInclusionKindEnum('kind').notNull(),
    quantity: integer('quantity'),
    printSizeId: uuid('print_size_id').references(() => printSizes.id),
    // frameId (ADR-0009 revision): set on framed_picture rows only; prints
    // and privileges stay null.
    frameId: uuid('frame_id').references(() => frames.id),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // FK lookup indexes (M1.2 review ruling, folded into the first migration):
    // the with-inclusions read filters by package; lookups resolve print.
  },
  (table) => [
    index('package_inclusions_service_package_id_idx').on(table.servicePackageId),
    index('package_inclusions_print_size_id_idx').on(table.printSizeId),
    index('package_inclusions_frame_id_idx').on(table.frameId),
  ]
);
