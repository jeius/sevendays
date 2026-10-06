import { auditLog, type Database } from '@sevendays/db';
import type { AuditAction, AuditEntity } from '@sevendays/types';
import type { Context } from 'hono';
import type { ApiEnv } from './db.js';

// The Audit Log's write side (M6 #185, spec § The Audit Log): the durable
// who/what/when of every committed CMS write — ONE row per mutation
// REQUEST (a matrix full-replace and the atomic package save are each one
// row), written INSIDE the mutation's own transaction so the row exists
// exactly when the write committed and never otherwise: failed validations
// resolve before any transaction opens, and a mid-transaction throw rolls
// the row back with the write. The Application Log's admin_mutation event
// is the ephemeral twin (same requestId, emitted at the route); this table
// is the durable record — the standing split (#183).

/** The request-scoped facts every audit row carries (built at the route). */
export type AuditActor = {
  actorId: string;
  actorEmail: string;
  requestId: string;
};

/** One row's mutation facts (the service computes entity/action/summary). */
export type AuditWrite = {
  entity: AuditEntity;
  entityId: string | null;
  action: AuditAction;
  summary: string | null;
};

// The tx handle every audit insert rides, extracted from the db client's
// own transaction signature so it cannot drift (spike-proven 2026-10-06:
// the extraction yields the real drizzle transaction object — insert +
// returning infer against it, and a negative type control failed).
export type AuditTx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Build the AuditActor from the request context. Throws when the session
 * is absent — unreachable behind the admin root's requireSession
 * (routes/admin.ts), and a loud failure beats a silently anonymous row.
 * actorEmail is the snapshot source the spec names (BetterAuth's user row).
 */
export function auditActor(c: Context<ApiEnv>): AuditActor {
  const session = c.get('session');
  if (!session) {
    throw new Error(
      'auditActor: no session in context — the admin root gate must precede every audit write'
    );
  }
  return {
    actorId: session.user.id,
    actorEmail: session.user.email,
    requestId: c.get('requestId'),
  };
}

/**
 * The one insert every audit row rides — the LAST statement of the
 * mutation's transaction body, over that transaction's own tx handle
 * (never a fresh db handle: the row must commit or roll back WITH the
 * write it records).
 */
export async function writeAuditRow(
  tx: AuditTx,
  actor: AuditActor,
  entry: AuditWrite
): Promise<void> {
  await tx.insert(auditLog).values({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    summary: entry.summary,
    requestId: actor.requestId,
  });
}
