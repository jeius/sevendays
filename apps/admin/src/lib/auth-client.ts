// The browser-side auth client (M4 spec § The admin auth server, "Client"):
// createAuthClient() with no baseURL resolves same-origin /api/auth, and
// neither @better-fetch/fetch (1.3.2) nor better-auth 1.7.5's client sets a
// credentials option (verified against both dists — zero hits), so the Fetch
// default (same-origin cookies) carries the session cookie both ways. Module
// scope is correct for THIS object: a stateless fetch wrapper with no DB
// handle — the per-request rule (ADR-0011) binds the server instances, not
// the browser client. #120's login form (signIn) and the shell user card
// (signOut) are its only callers.
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({});
