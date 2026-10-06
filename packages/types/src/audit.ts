import { z } from 'zod';

// The Audit Log row (M6 #185, spec § The Audit Log): the durable
// who/what/when of a committed CMS write. The action enum is the spec's
// pin (create | update | deactivate | reorder); the entity names are the
// nine admin-router segments (the same vocabulary the Application Log's
// admin_mutation events carry — one list, canonicalized here). This schema
// mirrors packages/db's audit_log table 1:1: the write side inserts rows
// that satisfy it, and the #188 viewer parses rows through it. No
// before/after fields exist anywhere in the contract (v2-if-ever).
export const auditActionSchema = z.enum(['create', 'update', 'deactivate', 'reorder']);

export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntitySchema = z.enum([
  'branch',
  'print-size',
  'gallery-photo',
  'attire',
  'addon-service',
  'studio-service',
  'service-package',
  'gallery-category',
  'testimonial',
]);

export type AuditEntity = z.infer<typeof auditEntitySchema>;

export const auditLogRowSchema = z.object({
  id: z.uuid(),
  occurredAt: z.coerce.date(),
  actorId: z.string().min(1),
  actorEmail: z.string().min(1),
  entity: auditEntitySchema,
  entityId: z.uuid().nullable(),
  action: auditActionSchema,
  summary: z.string().nullable(),
  requestId: z.string().min(1),
});

export type AuditLogRow = z.infer<typeof auditLogRowSchema>;
