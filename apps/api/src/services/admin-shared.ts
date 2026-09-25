// The admin write model's failure contract (M5 #137): the resolved-union
// precedent of services/appointments.ts and commitUpload, made uniform for
// every entity mutation — a service RESOLVES a typed failure and the thin
// route maps it (not_found → 404, conflict/invalid → 400 with field
// details). Status vocabulary {400, 401, 404, 500}; no 409 anywhere: every
// uniqueness collision — the deterministic pre-check AND the PG 23505 race
// backstop — resolves through `conflict` with the exact payload field named.

export type AdminDetail = { path: string[]; message: string };

export type AdminWriteFailure = {
  ok: false;
  reason: 'conflict' | 'invalid';
  message: string;
  details: AdminDetail[];
};

export type AdminCreateResult<T> = { ok: true; row: T } | AdminWriteFailure;

export type AdminWriteResult<T> =
  | { ok: true; row: T }
  | { ok: false; reason: 'not_found' }
  | AdminWriteFailure;

export function conflict(field: string): AdminWriteFailure {
  return {
    ok: false,
    reason: 'conflict',
    message: 'That value is already in use.',
    details: [{ path: [field], message: 'already in use' }],
  };
}

export function invalidRefs(message: string, details: AdminDetail[]): AdminWriteFailure {
  return { ok: false, reason: 'invalid', message, details };
}

/**
 * Map a failed write to the conflict failure when the driver rejected it as
 * a PG unique violation whose constraint is in the caller's map; null for
 * anything else (rethrow territory — the root onError owns the uniform 500).
 * Drizzle wraps driver errors: the PG message sits on err.cause (the
 * appointments CHECK precedent). The deterministic pre-check in each service
 * is the PRIMARY conflict path; this mapper is the race backstop that keeps
 * the 23505 inside the same 400-with-field-details vocabulary.
 */
export function uniqueViolation(
  error: unknown,
  constraints: Record<string, string>
): AdminWriteFailure | null {
  const cause = (error as { cause?: unknown })?.cause;
  const message = (cause as Error | undefined)?.message ?? '';
  const match = /duplicate key value violates unique constraint "([^"]+)"/.exec(message);
  const constraint = match?.[1];
  if (!constraint) return null;
  const field = constraints[constraint];
  if (!field) return null;
  return conflict(field);
}

/**
 * Run one write with the 23505 backstop armed: the write's unique clashes
 * resolve to the conflict failure, everything else propagates (the root
 * onError owns it). The write itself throws only on driver errors or the
 * no-row guard — validation happens BEFORE it.
 */
export async function guardUnique<T>(
  constraints: Record<string, string>,
  write: () => Promise<T>
): Promise<{ ok: true; row: T } | AdminWriteFailure> {
  try {
    return { ok: true, row: await write() };
  } catch (error) {
    const violation = uniqueViolation(error, constraints);
    if (violation) return violation;
    throw error;
  }
}

/**
 * Thrown INSIDE a transaction to force the rollback: drizzle commits when the
 * callback RESOLVES — a failure value returned mid-transaction would commit
 * the rows already written (the atomic-save trap). Caught by the save's
 * caller and mapped back into the same union. Not for the simple entities
 * (their checks run before any write); the atomic package save is the user.
 */
export class AdminSaveError extends Error {
  readonly failure: AdminWriteFailure;

  constructor(failure: AdminWriteFailure) {
    super(failure.message);
    this.name = 'AdminSaveError';
    this.failure = failure;
  }
}
