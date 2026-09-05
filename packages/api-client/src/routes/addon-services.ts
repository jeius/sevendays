import type { AddonService } from '@sevendays/types';
import { addonServiceSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Add-on Service wrappers: GET /api/v1/addon-services (the only method today). */
export function addonServicesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/addon-services — active add-on services. */
    async list(): Promise<AddonService[]> {
      const res = await raw.api.v1['addon-services'].$get();
      return unwrap(res, addonServiceSchema.array());
    },
  };
}
