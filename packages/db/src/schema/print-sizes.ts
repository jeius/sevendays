import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Catalog size codes: 1x1, 2x2, 2R, 8R, 8x10, 11x14. The 8R/8x10 nominal
// duplicate stays two rows — the discrepancy is recorded in the description
// for client confirmation at seed review, never resolved by code.
export const printSizes = pgTable('print_sizes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
