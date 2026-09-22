import { createDbClient } from '@sevendays/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

// ADR-0011: workerd scopes sockets to the request that created them, and the
// drizzle adapter CAPTURES the db instance it is given (the `database` option
// has no lazy-function form in 1.7) — so this factory must be called PER
// REQUEST (route handler, session server-fn), never hoisted to module scope.
// `betterAuth()` init does no I/O (drizzle schema validation reads local
// metadata), so per-request construction is CPU-only at staff-tool volume.
// `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` are read from env by BetterAuth
// itself — never duplicated here. Config purity: only better-auth subpaths
// and @sevendays/db may appear in this file's import graph — the CLI loads
// it via jiti outside any bundler (see auth.config.ts next to it).
export function createAuth(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set — the admin auth server cannot reach Postgres. Set it in apps/admin/.env.local (vite dev), apps/admin/.dev.vars (wrangler dev), or the Worker secret (prod). No fallback by design.'
    );
  }
  return betterAuth({
    database: drizzleAdapter(createDbClient(databaseUrl), { provider: 'pg' }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // staff-only; provisioning is the owner CLI (M4 ticket 02)
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    plugins: [
      admin(), // role vocabulary + the createUser/create-admin provisioning path
      tanstackStartCookies(), // MUST be last (cookie-setting through TanStack Start)
    ],
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 }, // 7 days, refresh daily — spec-pinned
    rateLimit: { enabled: true, storage: 'database' }, // memory is per-isolate on Workers — ineffective
  });
}
