import type {
  AddonService,
  AppointmentWithAddons,
  BranchRead,
  ServicePackageRead,
} from '@sevendays/types';
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
  expectTypeOf(client.appointments.list).returns.toEqualTypeOf<Promise<AppointmentWithAddons[]>>();
  expectTypeOf(client.appointments.create).returns.toEqualTypeOf<Promise<AppointmentWithAddons>>();
});

it('create input is the RPC-inferred zod input shape', () => {
  type CreateEndpoint = RpcClient['api']['v1']['appointments']['$post'];
  type CreateInput = InferRequestType<CreateEndpoint>['json'];
  expectTypeOf<CreateInput['branchId']>().toEqualTypeOf<string>();
  // scheduledAt is z.coerce.date() → the RPC input side admits any value
  // (coerce input is `unknown`); pin that a string is always acceptable.
  expectTypeOf<string>().toMatchTypeOf<CreateInput['scheduledAt']>();
});

it('delete wrappers resolve void with the param-id args (the 204 seam)', () => {
  expectTypeOf(client.admin.branches.remove).returns.toEqualTypeOf<Promise<void>>();
  type DeleteBranchEndpoint = RpcClient['api']['v1']['admin']['branches'][':id']['$delete'];
  type DeleteBranchArgs = InferRequestType<DeleteBranchEndpoint>;
  expectTypeOf<DeleteBranchArgs>().toEqualTypeOf<{ param: { id: string } }>();
});
