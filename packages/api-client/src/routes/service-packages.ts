import type { ServicePackageWithInclusions } from '@sevendays/types';
import { servicePackageWithInclusionsSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Service Package wrappers: GET /api/v1/service-packages (the only method today). */
export function servicePackagesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/service-packages — active packages with resolved lookups. */
    async list(): Promise<ServicePackageWithInclusions[]> {
      const res = await raw.api.v1['service-packages'].$get();
      return unwrap(res, servicePackageWithInclusionsSchema.array());
    },
  };
}
