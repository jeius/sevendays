import { expectTypeOf, it } from 'vitest';
import type { RpcClient } from './client.js';

// Type-level only: proves the type-imported AppType carries a live route
// surface. A route removed/renamed/unchained in apps/api changes the indexed
// access below and this suite stops compiling — the drift-kill working.
it('AppType exposes the /api/v1 route surface via RPC', () => {
  type ListEndpoint = RpcClient['api']['v1']['branches']['$get'];
  expectTypeOf<ListEndpoint>().not.toBeNever();
  expectTypeOf<ListEndpoint>().not.toBeUnknown();
});
