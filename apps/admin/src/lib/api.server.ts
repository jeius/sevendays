import { type ApiClient, createApiClient } from '@sevendays/api-client';

// Server-only (ADR-0006): the API base URL and the client embedding it must
// never reach a client bundle. The server functions in api.functions.ts are
// the only permitted importers of this module.
export function getApiUrl(): string {
  const url = process.env.API_URL;
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error(
      'API_URL is not set — the admin server cannot call the API. Set it in apps/admin/.env.local (dev) or Workers vars (prod). No fallback by design.'
    );
  }
  return url;
}

// Deployed routing (ADR-0016): Cloudflare rejects Worker→Worker subrequests
// over *.workers.dev (error 1042), so in PRODUCTION builds the API fetch
// routes through the `API` service binding instead of the public URL. The
// gate is import.meta.env.DEV: vite dev also runs workerd (the plugin wires
// the binding there, but its target is not in the dev session — an unresolved
// binding 503s every data route), so dev always takes the API_URL network
// path; vitest (plain Node) never resolves `cloudflare:workers`. The
// specifier is built at runtime so bundlers never try to resolve it
// statically, and the binding's fetch rides the client's custom-fetch seam
// (CreateApiClientOptions.fetch — the toLoopbackFetch precedent).
let serviceBindingFetch: typeof fetch | undefined;
if (!import.meta.env?.DEV) {
  try {
    const cf = (await import(/* @vite-ignore */ 'cloudflare' + ':workers')) as {
      env: Record<string, unknown>;
    };
    const binding = cf.env.API as { fetch: typeof fetch } | undefined;
    if (binding) serviceBindingFetch = binding.fetch.bind(binding);
  } catch {
    // Not on Workers — keep the API_URL network path.
  }
}

export function getApiClient() {
  return createApiClient({ baseUrl: getApiUrl(), fetch: serviceBindingFetch });
}

// Session-scoped client (M4 ticket 04, ADR-0004 + ADR-0016): server fns
// read the httpOnly session cookie from the INCOMING request server-side
// and forward it as Authorization: Bearer over the same transport every
// other admin→api call rides (the service-binding fetch in production, the
// API_URL network path in dev). The browser never holds the raw token, and
// no cookie header crosses apps — only the bearer credential does. The
// cookie value is forwarded VERBATIM (<token>.<signature>, possibly
// percent-encoded): the API's bearer plugin decodes and verifies the
// signature.
const SESSION_COOKIE_SUFFIX = 'session_token';

function extractSessionToken(cookieHeader: string | null): string {
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const name = part.slice(0, eq).trim();
      // Suffix-match, not equality: dev `better-auth.session_token`,
      // production `__Secure-better-auth.session_token` (session_data is a
      // different cookie — excluded by the exact suffix).
      if (name.endsWith(SESSION_COOKIE_SUFFIX)) {
        return part.slice(eq + 1).trim();
      }
    }
  }
  throw new Error(
    'No session cookie in the incoming request — the session-scoped API client cannot authenticate. The caller must run inside a signed-in request (the _shell gate guarantees it): pass getRequestHeaders().get("cookie"). No fallback by design.'
  );
}

export function getSessionScopedApiClient(cookieHeader: string | null): ApiClient {
  const token = extractSessionToken(cookieHeader);
  const underlying = serviceBindingFetch ?? fetch;
  const fetchWithBearer: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('authorization', `Bearer ${token}`);
    return underlying(input, { ...init, headers });
  };
  return createApiClient({ baseUrl: getApiUrl(), fetch: fetchWithBearer });
}
