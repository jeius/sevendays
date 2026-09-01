import { index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { attires } from './attires.js';
import { packageInclusions } from './package-inclusions.js';

// Attire context per inclusion (ADR-0009 revision): replaces the single
// attire_id column and the combined-name attire rows. One row per
// (inclusion, attire) pair; combined contexts like Filipiniana/Executive are
// two rows in catalog attire order. Children of inclusions — cascade delete.
export const packageInclusionAttires = pgTable(
  'package_inclusion_attires',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inclusionId: uuid('inclusion_id')
      .notNull()
      .references(() => packageInclusions.id, { onDelete: 'cascade' }),
    attireId: uuid('attire_id')
      .notNull()
      .references(() => attires.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('package_inclusion_attires_pair_unique').on(table.inclusionId, table.attireId),
    index('package_inclusion_attires_attire_id_idx').on(table.attireId),
  ]
);
