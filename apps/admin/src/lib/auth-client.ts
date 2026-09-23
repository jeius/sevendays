// The browser-side auth client (M4 spec § The admin auth server, "Client"):
// createAuthClient() with no baseURL resolves same-origin /api/auth. The
// session cookie rides by client-side config: better-auth 1.7.5's client
// sets credentials: "include" itself (dist/client/config.mjs:39 — corrected
// at the #120 final review; the planning-time "zero overrides" claim was
// wrong for this half), and @better-fetch/fetch 1.3.2 adds no override.
// Module scope is correct for THIS object: a stateless fetch wrapper with
// no DB handle — the per-request rule (ADR-0011) binds the server
// instances, not the browser client. #120's login form (signIn) and the
// shell user card (signOut) are its only callers.
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({});
