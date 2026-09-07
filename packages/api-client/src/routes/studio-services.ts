import type { StudioServiceWithBranches } from '@sevendays/types';
import { studioServiceWithBranchesSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Studio Service wrappers: GET /api/v1/studio-services (the only method today). */
export function studioServicesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/studio-services — active services with bookableBranchIds. */
    async list(): Promise<StudioServiceWithBranches[]> {
      const res = await raw.api.v1['studio-services'].$get();
      return unwrap(res, studioServiceWithBranchesSchema.array());
    },
  };
}
