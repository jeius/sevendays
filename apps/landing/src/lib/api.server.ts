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

export function getApiClient() {
  return createApiClient({ baseUrl: getApiUrl() });
}
