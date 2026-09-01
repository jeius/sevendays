import type { Context } from 'hono';

/** The one error shape (Q4): every failure returns c.json({ error }, status). */
export function badRequest(c: Context, message: string, details?: unknown) {
  return c.json({ error: message, ...(details !== undefined ? { details } : {}) }, 400);
}

export function internalError(c: Context) {
  return c.json({ error: 'Internal server error.' }, 500);
}
