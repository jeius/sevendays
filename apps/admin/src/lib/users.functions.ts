// The Users tab's server fns (M7 #221, ADR-0018's pattern): every call
// rides the already-mounted admin() plugin SERVER-SIDE over the per-request
// instance (ADR-0011), the caller's session forwarded through the incoming
// request headers — the plugin's own role gate does the enforcement. The
// browser never gains admin client methods (authClient.admin does not
// exist; the client plugin is deliberately NOT added). Mutations resolve
// the result-value union (never throw across the RPC boundary — the #155
// ruling); lockout guards run HERE over a fresh listUsers read before the
// plugin call, with the refusal lines riding `blockers` for the in-body
// dialog law (#218).
import { startSpan } from '@sentry/tanstackstart-react';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { createAuth } from './auth';
import { type AdminUserSummary, banRefusal, deleteRefusal } from './users-guards';

export type UsersActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; blockers?: string[] };

const TEMP_PASSWORD_MIN = 12; // matches emailAndPassword.minPasswordLength

async function pluginErrorToResult(error: unknown): Promise<never> {
  // BetterAuth's APIError carries status/message; anything else rethrows —
  // not a user-management refusal (serialization, session loss) — loud.
  const { APIError } = await import('better-auth/api');
  if (error instanceof APIError) {
    return { ok: false, status: error.status, message: error.message } as never;
  }
  throw error;
}

// The plugin's user rows (UserWithRole) trimmed to the six fields the seams
// + UI consume — raw rows never leave the server fns.
type PluginUserRow = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  banned?: unknown;
  banReason?: unknown;
};

const toSummary = (u: PluginUserRow): AdminUserSummary => ({
  id: String(u.id),
  name: String(u.name ?? ''),
  email: String(u.email ?? ''),
  role: (u.role as string | null) ?? null,
  banned: (u.banned as boolean | null) ?? null,
  banReason: (u.banReason as string | null) ?? null,
});

const summariesFrom = (users: ReadonlyArray<PluginUserRow>): AdminUserSummary[] =>
  users.map(toSummary);

// One per-request instance per fn (ADR-0011): the guarded fns pass the SAME
// auth + headers into the session read, the list, and the action.
async function listSummaries(
  auth: ReturnType<typeof createAuth>,
  headers: Headers
): Promise<AdminUserSummary[]> {
  const result = await auth.api.listUsers({
    headers,
    query: { limit: 100, sortBy: 'createdAt', sortDirection: 'desc' },
  });
  return summariesFrom(result.users);
}

export const fetchAdminUsers = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'auth admin listUsers' }, async () => {
    const auth = createAuth();
    return listSummaries(auth, getRequestHeaders());
  });
});

export const createAdminUser = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(
    z.object({
      name: z.string().min(1).max(200),
      email: z.email(),
      password: z.string().min(TEMP_PASSWORD_MIN).max(128),
      role: z.enum(['admin', 'staff']),
    })
  )
  .handler(async ({ data }): Promise<UsersActionResult<AdminUserSummary>> => {
    return startSpan({ name: 'auth admin createUser' }, async () => {
      try {
        const result = await createAuth().api.createUser({
          headers: getRequestHeaders(),
          // ADR-0018's 'staff' rides the plugin's runtime schema (routes.mjs
          // createUserBodySchema: role: z.union([z.string(), ...]) — any
          // string); the .d.mts narrows to better-auth's 'user'|'admin'
          // defaults, hence the bridge.
          body: {
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role as unknown as 'user' | 'admin',
          },
        });
        return { ok: true, data: toSummary(result.user) };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const resetAdminUserPassword = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(
    z.object({ userId: z.string().min(1), newPassword: z.string().min(TEMP_PASSWORD_MIN).max(128) })
  )
  .handler(async ({ data }): Promise<UsersActionResult<{ userId: string }>> => {
    return startSpan({ name: 'auth admin setUserPassword' }, async () => {
      try {
        await createAuth().api.setUserPassword({
          headers: getRequestHeaders(),
          body: { userId: data.userId, newPassword: data.newPassword },
        });
        return { ok: true, data: { userId: data.userId } };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const banAdminUser = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<AdminUserSummary>> => {
    return startSpan({ name: 'auth admin banUser' }, async () => {
      try {
        const auth = createAuth();
        const headers = getRequestHeaders();
        // The actor is the signed-in caller — the self-guard reads the
        // session, never the target row.
        const session = await auth.api.getSession({ headers });
        if (!session) {
          return { ok: false, status: 401, message: 'No session.' };
        }
        const users = await listSummaries(auth, headers);
        const target = users.find((u) => u.id === data.userId);
        if (!target) {
          return { ok: false, status: 404, message: 'User not found.' };
        }
        const blockers = banRefusal(session.user.id, target, users);
        if (blockers.length > 0) {
          return { ok: false, status: 400, message: 'Blocked by the lockout guards.', blockers };
        }
        const result = await auth.api.banUser({
          headers,
          body: { userId: data.userId },
        });
        return { ok: true, data: toSummary(result.user) };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const unbanAdminUser = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<AdminUserSummary>> => {
    return startSpan({ name: 'auth admin unbanUser' }, async () => {
      try {
        const result = await createAuth().api.unbanUser({
          headers: getRequestHeaders(),
          body: { userId: data.userId },
        });
        return { ok: true, data: toSummary(result.user) };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const fetchAdminUserSessions = createServerFn({ method: 'GET' })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    return startSpan({ name: 'auth admin listUserSessions' }, async () => {
      const result = await createAuth().api.listUserSessions({
        headers: getRequestHeaders(),
        body: { userId: data.userId },
      });
      return result.sessions;
    });
  });

export const revokeAdminUserSession = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  // better-auth 1.7.5 revokes BY TOKEN (internalAdapter.deleteSession over
  // body.sessionToken) — the caller passes the token from the
  // fetchAdminUserSessions rows, never a session id.
  .validator(z.object({ sessionToken: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<{ sessionToken: string }>> => {
    return startSpan({ name: 'auth admin revokeUserSession' }, async () => {
      try {
        await createAuth().api.revokeUserSession({
          headers: getRequestHeaders(),
          body: { sessionToken: data.sessionToken },
        });
        return { ok: true, data: { sessionToken: data.sessionToken } };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const revokeAdminUserSessions = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<{ userId: string }>> => {
    return startSpan({ name: 'auth admin revokeUserSessions' }, async () => {
      try {
        await createAuth().api.revokeUserSessions({
          headers: getRequestHeaders(),
          body: { userId: data.userId },
        });
        return { ok: true, data: { userId: data.userId } };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });

export const removeAdminUser = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }): Promise<UsersActionResult<{ userId: string }>> => {
    return startSpan({ name: 'auth admin removeUser' }, async () => {
      try {
        const auth = createAuth();
        const headers = getRequestHeaders();
        const session = await auth.api.getSession({ headers });
        if (!session) {
          return { ok: false, status: 401, message: 'No session.' };
        }
        const users = await listSummaries(auth, headers);
        const target = users.find((u) => u.id === data.userId);
        if (!target) {
          return { ok: false, status: 404, message: 'User not found.' };
        }
        const blockers = deleteRefusal(session.user.id, target, users);
        if (blockers.length > 0) {
          return { ok: false, status: 400, message: 'Blocked by the lockout guards.', blockers };
        }
        await auth.api.removeUser({
          headers,
          body: { userId: data.userId },
        });
        return { ok: true, data: { userId: data.userId } };
      } catch (error) {
        return pluginErrorToResult(error);
      }
    });
  });
