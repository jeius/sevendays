import type { InferRequestType } from 'hono/client';
import { expectTypeOf, it } from 'vitest';
import type { RpcClient } from './client.js';

// Type-level only: proves the type-imported AppType carries a live route
// surface. A route removed/renamed/unchained in apps/api changes the indexed
// access below and this suite stops compiling — the drift-kill working.
it('AppType exposes the /api/v1 route surface via RPC', () => {
  type CreateEndpoint = RpcClient['api']['v1']['appointments']['$post'];
  type CreateInput = InferRequestType<CreateEndpoint>['json'];
  expectTypeOf<CreateInput>().not.toBeNever();
  expectTypeOf<CreateInput>().not.toBeUnknown();
  expectTypeOf<CreateInput['branchId']>().toEqualTypeOf<string>();
  expectTypeOf<CreateInput['customerEmail']>().toEqualTypeOf<string>();
});
