import type { Context } from 'hono';
import type { ApiEnv } from '../services/db.js';
import type { RequestLogger, RootEnv } from './logger.js';

// The five event classes (M6 #183, spec § logging) — nothing else is ever
// logged. Every class carries an enumerated field schema (asserted by the
// suites); optional fields are spread only when present so the key set IS
// the schema. PII floor: no raw bodies, no email addresses, no IP, no
// User-Agent, no referrer — the email-failure `code` is classified
// (`resend:<error.name>` | `send_failed`) precisely to keep resend's
// free-text error messages (which may echo the recipient) out of the log.
//
// Levels: access / admin_mutation / email-attempt / email-sent at info;
// media_failure at warn; email-failed and error at error.

export type AdminMutationEntity =
  | 'branch'
  | 'print-size'
  | 'gallery-photo'
  | 'attire'
  | 'addon-service'
  | 'studio-service'
  | 'service-package'
  | 'gallery-category'
  | 'testimonial';

export type MediaFailureOp = 'presign' | 'commit' | 'thumbnail';

export type EmailPhase = 'attempt' | 'sent' | 'failed';

export function logAccess(
  log: RequestLogger,
  fields: {
    method: string;
    route: string;
    status: number;
    durationMs: number;
    actorId?: string;
  }
): void {
  log
    .withMetadata({
      evt: 'access',
      method: fields.method,
      route: fields.route,
      status: fields.status,
      durationMs: fields.durationMs,
      ...(fields.actorId !== undefined ? { actorId: fields.actorId } : {}),
    })
    .info('access');
}

/**
 * One line per committed CMS write (the write model's evidence class; the
 * durable twin is #185's Audit Log). Called at the route layer AFTER the
 * service result came back ok — a 400/401 path never reaches it. The
 * context supplies method, route pattern, and the verified actor; the
 * order PUTs pass entityId null (they mutate the family, not one row).
 */
export function logAdminMutation(
  c: Context<ApiEnv>,
  fields: { entity: AdminMutationEntity; entityId: string | null }
): void {
  c.get('logger')
    .withMetadata({
      evt: 'admin_mutation',
      method: c.req.method,
      route: c.req.routePath,
      entity: fields.entity,
      entityId: fields.entityId,
      actorId: c.get('session')?.user.id,
    })
    .info('admin mutation');
}

/**
 * Media failures only — successful presigns stay quiet (the
 * highest-frequency admin call; its success is uninteresting). op +
 * classified reason; thrown errors ride logError instead.
 */
export function logMediaFailure(
  log: RequestLogger,
  fields: { op: MediaFailureOp; reason: string }
): void {
  log.withMetadata({ evt: 'media_failure', op: fields.op, reason: fields.reason }).warn(
    'media failure'
  );
}

/** The confirmation email's attempt + Resend outcome (no customer PII). */
export function logEmail(
  log: RequestLogger,
  fields: { phase: EmailPhase; appointmentId: string; code?: string }
): void {
  const line = log.withMetadata({
    evt: 'email',
    phase: fields.phase,
    appointmentId: fields.appointmentId,
    ...(fields.code !== undefined ? { code: fields.code } : {}),
  });
  if (fields.phase === 'failed') {
    line.error('email failed');
  } else if (fields.phase === 'sent') {
    line.info('email sent');
  } else {
    line.info('email attempt');
  }
}

/**
 * The structured replacement for the root onError's console.error: one
 * error-class line per thrown error, with the request's method/route and
 * the error's name/message/stack. #184's Sentry capture rides this seam.
 */
export function logError(c: Context<RootEnv>, error: Error): void {
  c.get('logger')
    .withMetadata({
      evt: 'error',
      method: c.req.method,
      route: c.req.routePath || c.req.path,
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    })
    .error('unhandled error');
}
