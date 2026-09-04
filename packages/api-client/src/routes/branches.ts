import type { Branch } from '@sevendays/types';
import { branchSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Branch wrappers: GET /api/v1/branches (the only method today). */
export function branchesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/branches — all branches, ordered by name. */
    async list(): Promise<Branch[]> {
      const res = await raw.api.v1.branches.$get();
      return unwrap(res, branchSchema.array());
    },
  };
}
