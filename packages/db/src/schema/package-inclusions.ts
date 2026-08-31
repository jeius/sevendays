import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { attires } from './attires.js';
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
export const packageInclusions = pgTable('package_inclusions', {
  id: uuid('id').primaryKey().defaultRandom(),
  servicePackageId: uuid('service_package_id')
    .notNull()
    .references(() => servicePackages.id),
  kind: packageInclusionKindEnum('kind').notNull(),
  quantity: integer('quantity'),
  printSizeId: uuid('print_size_id').references(() => printSizes.id),
  attireId: uuid('attire_id').references(() => attires.id),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
