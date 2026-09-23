import type { Database } from '@sevendays/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { parseEnv } from '../env.js';
import type { ApiEnv } from './db.js';

// ADR-0004 made concrete (M4 ticket 04): the API answers "who is calling"
// by verifying the bearer token against the SAME tables the admin auth
// server writes — through BetterAuth's own session API, never a hand-rolled
// lookup: the presented value is `<token>.<signature>` (setSignedCookie)
// and the bearer plugin strips/verifies the signature against this
// instance's secret before the session read, so a raw `WHERE token = $1`
// against the presented value can never match (#119's live-verified
// finding; the secret must equal the admin issuer's — the ADR-0004 share).
export function createVerificationAuth(options: { database: Database; secret: string }) {
  return betterAuth({
    database: drizzleAdapter(options.database, { provider: 'pg' }),
    // Explicit, not env-auto-read: tests and the Worker both carry env
    // through c.env, never process.env on this path.
    secret: options.secret,
    plugins: [bearer()], // reads Authorization: Bearer; no cookies, no routes served
  });
}

type VerificationAuth = ReturnType<typeof createVerificationAuth>;

/** What a verified caller looks like (session + user, BetterAuth-inferred). */
export type SessionData = VerificationAuth['$Infer']['Session'];

// Module-owned copy (the REJECTION_MESSAGES class): the uniform 401 envelope.
// `details` omitted by design — there is exactly one reason.
export function authenticationRequired(c: import('hono').Context) {
  return c.json({ error: 'Authentication required.' }, 401);
}

/**
 * The session gate (M4 ticket 04): verifies the Authorization: Bearer token
 * through the verification instance and sets the session into context, or
 * returns the uniform 401 envelope. The instance is constructed per request
 * over the per-request db handle acquireDb already placed in context
 * (ADR-0011 — the drizzle adapter captures the db it is given). A missing
 * BETTER_AUTH_SECRET throws loudly (the createAuth posture): a deploy that
 * cannot verify anyone fails the gated route with the uniform 500, never a
 * silent allow.
 */
export const requireSession = async (
  c: import('hono').Context<ApiEnv>,
  next: () => Promise<void>
) => {
  const { BETTER_AUTH_SECRET } = parseEnv(c.env);
  if (!BETTER_AUTH_SECRET) {
    throw new Error(
      'BETTER_AUTH_SECRET is not set — the API cannot verify sessions. Set the Worker secret (ADR-0004, shared with the admin). No fallback by design.'
    );
  }
  const auth = createVerificationAuth({ database: c.get('db'), secret: BETTER_AUTH_SECRET });
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return authenticationRequired(c);
  }
  c.set('session', session);
  await next();
};
