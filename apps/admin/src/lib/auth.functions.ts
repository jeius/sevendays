// Session checks (M4 spec § The admin auth server): TanStack Start server
// functions so the shell gate and login round-trip (#120) can ask "who is
// signed in" server-side. Per-request auth instance over a per-request db
// client (ADR-0011) — the same rule the /api/auth route follows; never a
// module-scope instance. Sentry span per the server-fn house rule (no-op
// when Sentry is uninitialized — dev without VITE_SENTRY_DSN).
import { startSpan } from '@sentry/tanstackstart-react';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { createAuth } from './auth';

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'auth getSession' }, async () => {
    const headers = getRequestHeaders();
    return createAuth().api.getSession({ headers });
  });
});

export const ensureSession = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'auth ensureSession' }, async () => {
    const headers = getRequestHeaders();
    const session = await createAuth().api.getSession({ headers });
    if (!session) {
      throw new Error('Unauthorized');
    }
    return session;
  });
});
