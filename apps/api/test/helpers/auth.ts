import { createDbClient } from '@sevendays/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { TEST_AUTH_SECRET } from './env.js';

// The test-shaped auth issuer (M4 spec § Testing posture): sign-up ENABLED
// (the production instances refuse it), bearer() on so the harvest reads the
// set-auth-token response header, same secret as testEnv so the API's
// verification instance accepts what this instance issues (the bearer
// plugin HMAC-verifies against the instance's own secret — ADR-0004's
// shared-secret rule, mirrored at test scale). Built per call over its own
// db client — the ADR-0011 posture, mirrored in tests.
export function createTestAuth(databaseUrl: string) {
  return betterAuth({
    database: drizzleAdapter(createDbClient(databaseUrl), { provider: 'pg' }),
    secret: TEST_AUTH_SECRET,
    emailAndPassword: { enabled: true },
    plugins: [bearer()],
    rateLimit: { enabled: false }, // fixtures sign up repeatedly — the ~3/10s default would 429 the suite
  });
}

/**
 * Mint a real session through BetterAuth's own HTTP surface and harvest the
 * signed token from set-auth-token (the bearer plugin's after-hook mirrors
 * the set-cookie value there on sign-in/sign-up). The token is the
 * `<token>.<signature>` form — exactly what the admin seam forwards.
 */
export async function signUpSession(databaseUrl: string, email: string) {
  const auth = createTestAuth(databaseUrl);
  const res = await auth.handler(
    new Request('http://localhost:8787/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'test-password-123456', name: 'Test Staff' }),
    })
  );
  if (!res.ok) {
    throw new Error(`test sign-up failed: ${res.status} ${await res.text()}`);
  }
  const token = res.headers.get('set-auth-token');
  if (!token) {
    throw new Error('test sign-up response carried no set-auth-token header (bearer plugin)');
  }
  const body = (await res.json()) as { user?: { id?: string } };
  const userId = body.user?.id;
  if (!userId) {
    throw new Error('test sign-up response carried no user.id');
  }
  return { token, userId };
}

/** Revoke a session through BetterAuth's own sign-out server API. */
export async function signOutSession(databaseUrl: string, token: string) {
  const auth = createTestAuth(databaseUrl);
  await auth.api.signOut({ headers: new Headers({ authorization: `Bearer ${token}` }) });
}
