import { createApiClient } from '@sevendays/api-client';

// Server-only (ADR-0006): the API base URL and the client embedding it must
// never reach a client bundle. The server functions in api.functions.ts are
// the only permitted importers of this module.
export function getApiUrl(): string {
  const url = process.env.API_URL;
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error(
      'API_URL is not set — the landing server cannot call the API. Set it in apps/landing/.env.local (dev) or Workers vars (prod). No fallback by design.'
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

// M7 #216: the submissions client forwards the visitor's IP. The API's
// rate limiter keys on CF-Connecting-IP (direct callers — unspoofable, it
// wins) else X-Client-IP. In production the landing calls over the API
// service binding (ADR-0016), where the edge header is absent: this fn
// re-sets it from the LANDING's own incoming request (set by our Worker,
// never by the browser — the browser never calls the API). The admin's
// fetchWithBearer precedent.
export function getApiClientForwardingIp(clientIp: string | null) {
  const underlying = serviceBindingFetch ?? fetch;
  const fetchWithClientIp: typeof fetch = async (input, init) => {
    if (!clientIp) return underlying(input, init);
    const headers = new Headers(init?.headers);
    headers.set('X-Client-IP', clientIp);
    return underlying(input, { ...init, headers });
  };
  return createApiClient({ baseUrl: getApiUrl(), fetch: fetchWithClientIp });
}
