import type { ServicePackageWithInclusions } from '@sevendays/types';
import { servicePackageWithInclusionsSchema } from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

type BySlugEndpoint = RpcClient['api']['v1']['service-packages'][':slug']['$get'];

/**
 * The by-slug endpoint's declared input: `{ slug: string }` (the route
 * takes no param schema — slug is an opaque text key). Inferred, not
 * hand-typed, so the RPC surface remains the drift-kill.
 */
export type GetPackageBySlugArgs = InferRequestType<BySlugEndpoint>;

/** Service Package wrappers: list + by-slug under /api/v1/service-packages. */
export function servicePackagesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/service-packages — active packages with resolved lookups. */
    async list(): Promise<ServicePackageWithInclusions[]> {
      const res = await raw.api.v1['service-packages'].$get();
      return unwrap(res, servicePackageWithInclusionsSchema.array());
    },
    /** GET /api/v1/service-packages/:slug — one active package; 404 when unknown/inactive. */
    async bySlug(args: GetPackageBySlugArgs): Promise<ServicePackageWithInclusions> {
      const res = await raw.api.v1['service-packages'][':slug'].$get(args);
      return unwrap(res, servicePackageWithInclusionsSchema);
    },
  };
}
