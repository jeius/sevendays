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

import { getInternalFetchDeps } from '#/lib/api.server';
import { createAuth } from '#/lib/auth';
import { makeSendResetPassword } from '#/lib/reset-email';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      // M7 #221: the runtime instance wires the reset-email forward seam
      // (ADR-0021 — the admin Worker stays Resend-free; the send crosses
      // the API service binding). The CLI shape (auth.config.ts) stays
      // unwired by design.
      GET: ({ request }) =>
        createAuth(undefined, makeSendResetPassword(getInternalFetchDeps())).handler(request),
      POST: ({ request }) =>
        createAuth(undefined, makeSendResetPassword(getInternalFetchDeps())).handler(request),
    },
  },
});
