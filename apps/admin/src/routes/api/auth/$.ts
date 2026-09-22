// BetterAuth's route surface (M4 spec § The admin auth server): the catch-all
// under /api/auth/* hands every request to auth.handler — BetterAuth's own
// router resolves the method+path (/ok, /sign-in/email, /sign-out, …). The
// instance is constructed PER REQUEST over a per-request db client (ADR-0011):
// the drizzle adapter captures the db it is given, so a module-scope instance
// would break every request after the first per isolate. tanstackStartCookies
// (the last plugin inside createAuth) sets the session cookie through
// TanStack Start's request context. #120's login form posts here; the session
// server-fns live in auth.functions.ts, not this file.
import { createFileRoute } from '@tanstack/react-router';

import { createAuth } from '#/lib/auth';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => createAuth().handler(request),
      POST: ({ request }) => createAuth().handler(request),
    },
  },
});
