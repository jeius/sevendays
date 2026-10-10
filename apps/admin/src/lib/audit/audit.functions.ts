// The Audit Log viewer's server functions (#188, ADR-0023): the reads are
// admin-side over packages/db — the api stays domain-pure, zero api
// routes, zero api files. The gate is the metrics seam's discipline PLUS
// the role law (ADR-0018): the audit record is person-level — owner-only
// by the standing rule — so the gate demands a session AND
// role === 'admin' (the BetterAuth plugin's literal for the owner;
// 'staff' and null both fail). Ordering inside each fn: dbUrl first (no
// db means no auth either — one curated not-configured state for both),
// then the gate (the only throw a fn permits), then the read inside
// try/catch → unavailable with one log-only line (the #155 law: the loud
// detail never rides the payload). Sentry span per the server-fn house
// rule (no-op when Sentry is uninitialized).
import { startSpan } from '@sentry/tanstackstart-react';
import { createDbClient, runAuditActors, runAuditLogPage } from '@sevendays/db';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { createAuth } from '../auth';
import { AUDIT_PAGE_SIZE, auditDateWindow, auditLogSearchSchema, pageWindow } from './filters';

export type AuditResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not-configured' | 'unavailable' };

function readDbUrl(): string | null {
  const value = process.env.DATABASE_URL;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

async function requireAuditSession(): Promise<void> {
  const session = await createAuth().api.getSession({
    headers: getRequestHeaders(),
  });
  if (!session || session.user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
}

export const fetchAuditLogPage = createServerFn({ method: 'GET' })
  .validator(auditLogSearchSchema)
  .handler(async ({ data }) => {
    return startSpan({ name: 'audit log page' }, async () => {
      const dbUrl = readDbUrl();
      if (dbUrl === null) {
        return { ok: false as const, reason: 'not-configured' as const };
      }
      await requireAuditSession();
      try {
        const window = auditDateWindow(data);
        // The offset rides the UNCLAMPED page: a stale high page reads an
        // empty window harmlessly, and pageWindow(total, …) in the
        // response tells the screen the clamped truth (it self-heals the
        // URL). All pagination math lives in the one tested seam.
        const offset = (data.page - 1) * AUDIT_PAGE_SIZE;
        const result = await runAuditLogPage(createDbClient(dbUrl), {
          limit: AUDIT_PAGE_SIZE,
          offset,
          entity: data.entity,
          action: data.action,
          actor: data.actor,
          occurredFromIso: window.start ?? undefined,
          occurredToExclusiveIso: window.endExclusive ?? undefined,
        });
        const display = pageWindow(result.total, data.page);
        return {
          ok: true as const,
          data: {
            rows: result.rows,
            total: result.total,
            page: display.page,
            totalPages: display.totalPages,
          },
        };
      } catch (error) {
        console.error(
          '[audit] Audit Log source unavailable:',
          error instanceof Error ? error.message : error
        );
        return { ok: false as const, reason: 'unavailable' as const };
      }
    });
  });

export const fetchAuditActors = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'audit log actors' }, async () => {
    const dbUrl = readDbUrl();
    if (dbUrl === null) {
      return { ok: false as const, reason: 'not-configured' as const };
    }
    await requireAuditSession();
    try {
      return { ok: true as const, data: await runAuditActors(createDbClient(dbUrl)) };
    } catch (error) {
      console.error(
        '[audit] Audit Log actor source unavailable:',
        error instanceof Error ? error.message : error
      );
      return { ok: false as const, reason: 'unavailable' as const };
    }
  });
});
