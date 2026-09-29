import type { Context } from 'hono';

/** The one error shape (Q4): every failure returns c.json({ error }, status). */
export function badRequest(c: Context, message: string, details?: unknown) {
  return c.json({ error: message, ...(details !== undefined ? { details } : {}) }, 400);
}

export function internalError(c: Context) {
  return c.json({ error: 'Internal server error.' }, 500);
}

/**
 * The leak-safe operator-detail channel (#155): a KNOWN deploy-time
 * misconfiguration answers a curated 503 line — stable, no env names, no
 * runbook paths — while the root onError's log keeps the loud detail.
 * Unknown throws keep the uniform 500.
 */
export function serviceUnavailable(c: Context, message: string) {
  return c.json({ error: message }, 503);
}

/**
 * The uniform 404 envelope: always c.json({ error }, 404), never a bare
 * c.notFound() (which would emit Hono's plain-text default). Default is the
 * root app's unmounted-path wording; mounted-path 404s pass the entity
 * wording ('Package not found.' / 'Appointment not found.' — per-entity,
 * matching the intake rejections' style).
 */
export function notFound(c: Context, message = 'Not found.') {
  return c.json({ error: message }, 404);
}
