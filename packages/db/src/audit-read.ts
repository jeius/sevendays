// The Audit Log viewer's read module (#188, ADR-0023 — the #186 probes
// precedent extended to dynamic queries): the filtered, newest-first,
// paginated reads over audit_log. This module exists because apps/admin
// owns no drizzle-orm dependency by ruling — the typed builder (and its
// safe parameter binding) lives here, beside the schema it reads; the
// admin passes the per-request client and structural params only. No
// joins anywhere: the row is self-describing by design (actorEmail
// snapshotted at write, summary inline — #185). Ordering is occurredAt
// DESC with id DESC as the tiebreaker (rows sharing a timestamp — e.g.
// written in one transaction — keep a stable order). The row's
// occurredAt field carries an ISO STRING (not a Date): the result
// crosses an RPC boundary where Dates do not survive, and the viewer's
// landed auditLogRowSchema coerces the string back — one shape, the
// AuditWireRow convention, no mapping anywhere.
import { and, asc, count, desc, eq, gte, lt, type SQL } from 'drizzle-orm';

import { auditLog, type Database } from './client.js';

export type AuditLogQueryParams = {
  limit: number;
  offset: number;
  entity?: string;
  action?: string;
  actor?: string;
  /** Inclusive ISO instant (a from-day's 00:00Z) or undefined. */
  occurredFromIso?: string;
  /** Exclusive ISO instant (the day after a to-day's 00:00Z) or undefined. */
  occurredToExclusiveIso?: string;
};

export type AuditLogRowData = {
  id: string;
  /** ISO string — the RPC-boundary convention (see the module comment). */
  occurredAt: string;
  actorId: string;
  actorEmail: string;
  entity: string;
  entityId: string | null;
  action: string;
  summary: string | null;
  requestId: string;
};

function buildConditions(params: AuditLogQueryParams): SQL | undefined {
  const conditions = [
    params.entity === undefined ? undefined : eq(auditLog.entity, params.entity),
    params.action === undefined ? undefined : eq(auditLog.action, params.action),
    params.actor === undefined ? undefined : eq(auditLog.actorEmail, params.actor),
    params.occurredFromIso === undefined
      ? undefined
      : gte(auditLog.occurredAt, new Date(params.occurredFromIso)),
    params.occurredToExclusiveIso === undefined
      ? undefined
      : lt(auditLog.occurredAt, new Date(params.occurredToExclusiveIso)),
  ].filter((condition) => condition !== undefined);
  return conditions.length === 0 ? undefined : and(...conditions);
}

export async function runAuditLogPage(
  db: Database,
  params: AuditLogQueryParams
): Promise<{ rows: AuditLogRowData[]; total: number }> {
  const where = buildConditions(params);
  const [totals, rows] = await Promise.all([
    db.select({ total: count() }).from(auditLog).where(where),
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
      .limit(params.limit)
      .offset(params.offset),
  ]);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      entity: row.entity,
      entityId: row.entityId,
      action: row.action,
      summary: row.summary,
      requestId: row.requestId,
    })),
    total: totals[0]?.total ?? 0,
  };
}

export async function runAuditActors(db: Database): Promise<string[]> {
  const rows = await db
    .selectDistinct({ actorEmail: auditLog.actorEmail })
    .from(auditLog)
    .orderBy(asc(auditLog.actorEmail));
  return rows.map((row) => row.actorEmail);
}
