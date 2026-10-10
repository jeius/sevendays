// The Audit Log viewer's pure seam (#188, spec § The Audit Log — Viewer):
// search-param normalization, UTC day windows, page math, the label maps,
// and the wire→row parse — every fn pure so the lib-seam suite pins the
// filter/pagination semantics the screen rides. The role law (ADR-0018)
// lives in the server fns and the route, never here. Rows parse through
// the landed auditLogRowSchema ("the #188 viewer parses rows through it").
import {
  type AuditAction,
  type AuditEntity,
  type AuditLogRow,
  auditActionSchema,
  auditEntitySchema,
  auditLogRowSchema,
} from '@sevendays/types';
import { z } from 'zod';

export const AUDIT_PAGE_SIZE = 20;

const DAY_MS = 86_400_000;

// Search params arrive as strings and may be stale or hand-edited: every
// field is tolerant — an invalid value drops to its default (the metrics
// env reader's posture), never a thrown validation. z.object semantics do
// the entity/action narrowing; .catch() is the drop.
const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
  .refine(isCalendarDay, 'not a calendar day')
  .optional()
  .catch(undefined);

export const auditLogSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  entity: auditEntitySchema.optional().catch(undefined),
  action: auditActionSchema.optional().catch(undefined),
  actor: z.string().min(1).optional().catch(undefined),
  from: dateParam,
  to: dateParam,
});

export type AuditLogSearch = z.infer<typeof auditLogSearchSchema>;

// A regex-valid but calendar-invalid day is not a day: 2026-13-99 passes
// the \d{2} slots and 2026-02-31 ROLLS OVER to March in V8 instead of
// parsing NaN — the round-trip check catches both, dropping the side to
// null (a half-open window, the tolerant posture of every field here).
function isCalendarDay(day: string): boolean {
  const parsed = new Date(`${day}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

function dayStartUtc(day: string): Date | null {
  return isCalendarDay(day) ? new Date(`${day}T00:00:00.000Z`) : null;
}

// UTC day boundaries by design (occurredAt is timestamptz and the screen
// displays UTC via formatUtc — the window matches the display): from →
// that day's 00:00Z inclusive; to → the NEXT day's 00:00Z exclusive (an
// inclusive day). from after to leaves start > end — an empty window
// (0 rows), not an error.
export function auditDateWindow(search: AuditLogSearch): {
  start: string | null;
  endExclusive: string | null;
} {
  const from = search.from === undefined ? null : dayStartUtc(search.from);
  const to = search.to === undefined ? null : dayStartUtc(search.to);
  return {
    start: from === null ? null : from.toISOString(),
    endExclusive: to === null ? null : new Date(to.getTime() + DAY_MS).toISOString(),
  };
}

// Page math over the filtered total: totalPages never below 1 (an empty
// log is page 1 of 1), page clamps into range (a stale ?page=99 after a
// filter narrows resolves to the last real page), offset is the SQL skip.
export function pageWindow(
  total: number,
  page: number
): {
  page: number;
  totalPages: number;
  offset: number;
  hasPrev: boolean;
  hasNext: boolean;
} {
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const clamped = Math.min(Math.max(1, page), totalPages);
  return {
    page: clamped,
    totalPages,
    offset: (clamped - 1) * AUDIT_PAGE_SIZE,
    hasPrev: clamped > 1,
    hasNext: clamped < totalPages,
  };
}

// Filter-option and cell copy — the nine entity families and four
// actions, human-labeled once (owner-ratifiable at the variants step).
export const AUDIT_ENTITY_LABELS: Record<AuditEntity, string> = {
  branch: 'Branches',
  'print-size': 'Print sizes',
  'gallery-photo': 'Gallery photos',
  attire: 'Attires',
  'addon-service': 'Add-ons',
  'studio-service': 'Studio services',
  'service-package': 'Packages',
  'gallery-category': 'Gallery categories',
  testimonial: 'Testimonials',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Create',
  update: 'Update',
  deactivate: 'Deactivate',
  reorder: 'Reorder',
};

export function hasActiveFilters(search: AuditLogSearch): boolean {
  return (
    search.entity !== undefined ||
    search.action !== undefined ||
    search.actor !== undefined ||
    search.from !== undefined ||
    search.to !== undefined
  );
}

// What the server fns serialize: occurredAt an ISO string (Dates do not
// survive the RPC boundary; the schema's coerce.date() restores them).
export type AuditWireRow = Omit<AuditLogRow, 'occurredAt'> & { occurredAt: string };

// The RPC boundary guard: parses wire rows back through the landed
// auditLogRowSchema. A malformed row is a server bug — the throw surfaces
// as the query's error state, never a silently dropped entry.
export function parseAuditWireRows(rows: unknown): AuditLogRow[] {
  return auditLogRowSchema.array().parse(rows);
}
