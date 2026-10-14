import { z } from 'zod';

// The Audit Log row (M6 #185, spec § The Audit Log): the durable
// who/what/when of a committed CMS write. The action enum is the spec's
// pin (create | update | deactivate | reorder | delete; 'accept'/'reject'
// joined with M7 #216 — the testimonial-submission moderation verbs); the
// entity names are the eleven admin-router segments (the same vocabulary the Application Log's
// admin_mutation events carry — one list, canonicalized here). This schema
// mirrors packages/db's audit_log table 1:1: the write side inserts rows
// that satisfy it, and the #188 viewer parses rows through it. No
// before/after fields exist anywhere in the contract (v2-if-ever).
// 'delete' joined with M7 #213 (guarded DELETE, owner-confirmed 2026-10-12):
// a committed delete is a committed admin mutation — one audit row, in the
// delete's own transaction. The db column is text; no migration rides this.
export const auditActionSchema = z.enum([
  'create',
  'update',
  'deactivate',
  'reorder',
  'delete',
  // M7 #216: the testimonial-submission moderation verbs — accept creates
  // the Testimonial inside the same committed request; reject retains.
  'accept',
  'reject',
]);

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
  // M7 #216: the moderation queue is a committed-admin-mutation family —
  // one row per accept/reject/delete, row-grain (entityId = submission id).
  'testimonial-submission',
  // M7 #215: the singleton site-settings save is a committed admin
  // mutation — one row per PUT (create on the first save, update after).
  'site-settings',
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
