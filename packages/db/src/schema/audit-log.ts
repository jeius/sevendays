import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// The Audit Log (M6 #185, glossary — apps/api/CONTEXT.md ## Observability):
// the durable who/what/when of every committed CMS write — ONE row per
// mutation REQUEST (a matrix full-replace and the atomic package save are
// each one row), written INSIDE the mutation's own transaction so the row
// exists exactly when the write committed and never otherwise: failed
// validations resolve before any transaction opens, and a mid-transaction
// throw rolls the row back with the write. actorEmail is snapshotted at
// write (the durable "who" even after a staff email changes). No FKs by
// design — the record outlives both the actor and the row it names
// (entityId is polymorphic across the nine entity families, null for the
// family-level order PUTs). No before/after blobs (diffing is v2-if-ever).
// Retention unbounded: a 3-branch studio writes rows per week, not per
// minute (the spec's ruling — no prune job, no export in M6).
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    actorId: text('actor_id').notNull(),
    actorEmail: text('actor_email').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    action: text('action').notNull(),
    summary: text('summary'),
    requestId: text('request_id').notNull(),
  },
  (table) => [index('audit_log_occurred_at_idx').on(table.occurredAt)]
);
