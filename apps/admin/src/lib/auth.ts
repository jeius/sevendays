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
export function createAuth(
  databaseUrl = process.env.DATABASE_URL,
  // M7 #221 (ADR-0021): the reset-email sender, INJECTED to preserve this
  // file's config purity (only better-auth subpaths + @sevendays/db may
  // appear in the import graph — the CLI loads it via jiti). The /api/auth
  // route passes the service-binding forward seam (lib/reset-email.ts);
  // auth.config.ts (the CLI shape) passes nothing and never sends. The
  // parameter is BetterAuth's own sendResetPassword callback data shape
  // (1.7.5, verified in dist: (data: { user, url, token }) => Promise<void>)
  // — the seam maps it onto the wire's flat { to, url, name } body.
  sendResetEmail?: (input: {
    user: { email: string; name: string };
    url: string;
    token: string;
  }) => Promise<void>
) {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set — the admin auth server cannot reach Postgres. Set it in apps/admin/.env.local (vite dev), apps/admin/.dev.vars (wrangler dev), or the Worker secret (prod). No fallback by design.'
    );
  }
  return betterAuth({
    database: drizzleAdapter(createDbClient(databaseUrl), { provider: 'pg' }),
    emailAndPassword: {
      enabled: true,
      // staff-only; provisioning is the Users tab (M7 #221) — the CLI stays
      // the bootstrap/break-glass path (docs/staff-provisioning.md, #222's
      // demotion)
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url, token }) => {
        if (!sendResetEmail) {
          // The CLI-shaped instance (auth.config.ts) — reset requests never
          // reach it; fail loud if they ever do.
          throw new Error('Reset emails are not wired on this instance (see lib/reset-email.ts).');
        }
        try {
          await sendResetEmail({ user, url, token });
        } catch (error) {
          // Anti-enumeration backstop: the seam resolves failures itself, but
          // a throw here would 500 the auth request and leak existence.
          console.error(
            '[reset-email] unexpected send error',
            error instanceof Error ? error.message : error
          );
        }
      },
    },
    plugins: [
      admin(), // role vocabulary + the createUser/create-admin provisioning path
      tanstackStartCookies(), // MUST be last (cookie-setting through TanStack Start)
    ],
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 }, // 7 days, refresh daily — spec-pinned
    rateLimit: { enabled: true, storage: 'database' }, // memory is per-isolate on Workers — ineffective
  });
}
