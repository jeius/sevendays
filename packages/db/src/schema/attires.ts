import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// One row per catalog value, including the combined forms
// (Filipiniana/Executive, Filipiniana/Executive/Uniform, Executive/Uniform) —
// the unique constraint enforces "one row per value" structurally.
export const attires = pgTable('attires', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
