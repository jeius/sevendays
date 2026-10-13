import type { AddonService, BranchRead, ServicePackageRead } from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import { expectTypeOf, it } from 'vitest';
import type { RpcClient } from '../src/client.js';
import { createApiClient } from '../src/index.js';

const client = createApiClient({ baseUrl: 'http://localhost:4949/' });

// Type-level only — method REFERENCES (never invoked; expectTypeOf does not
// execute). The wrappers' return types flow from the API's AppType via RPC:
// the acceptance criterion "type-level inference assertions" plus the
// drift-kill visible at the wrapper level.
it('wrapper return types come from the shared schemas', () => {
  expectTypeOf(client.branches.list).returns.toEqualTypeOf<Promise<BranchRead[]>>();
  expectTypeOf(client.servicePackages.list).returns.toEqualTypeOf<Promise<ServicePackageRead[]>>();
  expectTypeOf(client.addonServices.list).returns.toEqualTypeOf<Promise<AddonService[]>>();
});

it('delete wrappers resolve void with the param-id args (the 204 seam)', () => {
  expectTypeOf(client.admin.branches.remove).returns.toEqualTypeOf<Promise<void>>();
  type DeleteBranchEndpoint = RpcClient['api']['v1']['admin']['branches'][':id']['$delete'];
  type DeleteBranchArgs = InferRequestType<DeleteBranchEndpoint>;
  expectTypeOf<DeleteBranchArgs>().toEqualTypeOf<{ param: { id: string } }>();
});
