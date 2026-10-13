import type { BranchRead } from '@sevendays/types';
import { branchReadSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Branch wrappers: GET /api/v1/branches (the only method today). */
export function branchesRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/branches — active branches, name-ordered, covers resolved (M7 #214). */
    async list(): Promise<BranchRead[]> {
      const res = await raw.api.v1.branches.$get();
      return unwrap(res, branchReadSchema.array());
    },
  };
}
