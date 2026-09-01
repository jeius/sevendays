import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Atomic attires (ADR-0009 revision): one row per single attire value
// (Toga, Filipiniana, Executive, Uniform). Combined contexts like
// Filipiniana/Executive live in the package_inclusion_attires junction —
// one row per (inclusion, attire) pair — not as stored names.
export const attires = pgTable('attires', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
