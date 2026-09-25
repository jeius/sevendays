import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Atomic attires (ADR-0009 revision): one row per single attire value
// (Toga, Filipiniana, Executive, Uniform). Combined contexts like
// Filipiniana/Executive live in the package_inclusion_attires junction —
// one row per (inclusion, attire) pair — not as stored names.
export const attires = pgTable('attires', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  // Deactivation (M5): a deactivated attire trims from its inclusion's
  // attire list on public reads (the inclusion still renders, #138); admin
  // reads always assemble the full composition.
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
