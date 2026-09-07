import type { Context } from 'hono';

/** The one error shape (Q4): every failure returns c.json({ error }, status). */
export function badRequest(c: Context, message: string, details?: unknown) {
  return c.json({ error: message, ...(details !== undefined ? { details } : {}) }, 400);
}

export function internalError(c: Context) {
  return c.json({ error: 'Internal server error.' }, 500);
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
