import { hc } from 'hono/client';
import type { AppType, CreateApiClientOptions, RpcClient } from './client.js';
import { addonServicesRoutes } from './routes/addon-services.js';
import { appointmentsRoutes } from './routes/appointments.js';
import { branchesRoutes } from './routes/branches.js';
import { servicePackagesRoutes } from './routes/service-packages.js';

/** The full client surface: raw RPC + one route-tree group per resource. */
export interface ApiClient {
  raw: RpcClient;
  branches: ReturnType<typeof branchesRoutes>;
  servicePackages: ReturnType<typeof servicePackagesRoutes>;
  addonServices: ReturnType<typeof addonServicesRoutes>;
  appointments: ReturnType<typeof appointmentsRoutes>;
}

/**
 * Build the shared API client (ADR-0006). Fails loudly when baseUrl is
 * missing — a misconfigured deployment never silently calls localhost.
 * The route groups are thin wrappers over `raw` (the pre-plan surface
 * ruling): each delegates to the RPC client so paths/params/types stay
 * inferred from AppType, and each runs its response through unwrap().
 */
export function createApiClient(options: CreateApiClientOptions): ApiClient {
  if (!options || typeof options.baseUrl !== 'string' || options.baseUrl.trim() === '') {
    throw new Error('createApiClient: baseUrl is required (an absolute http(s) URL)');
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(options.baseUrl);
  } catch {
    throw new Error('createApiClient: baseUrl must be an absolute http(s) URL');
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('createApiClient: baseUrl must be an absolute http(s) URL');
  }
  const raw: RpcClient = hc<AppType>(options.baseUrl, { fetch: options.fetch });
  return {
    raw,
    branches: branchesRoutes(raw),
    servicePackages: servicePackagesRoutes(raw),
    addonServices: addonServicesRoutes(raw),
    appointments: appointmentsRoutes(raw),
  };
}

export type { AppType, CreateApiClientOptions, RpcClient } from './client.js';
export { ApiClientError } from './error.js';
