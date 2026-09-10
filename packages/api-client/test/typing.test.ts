import type { AddonService, Branch, ServicePackageWithInclusions } from '@sevendays/types';
import { expectTypeOf, it } from 'vitest';
import { createApiClient } from '../src/index.js';

const client = createApiClient({ baseUrl: 'http://localhost:4949/' });

// Type-level only — method REFERENCES (never invoked; expectTypeOf does not
// execute). The wrappers' return types flow from the API's AppType via RPC:
// the acceptance criterion "type-level inference assertions" plus the
// drift-kill visible at the wrapper level.
it('wrapper return types come from the shared schemas', () => {
  expectTypeOf(client.branches.list).returns.toEqualTypeOf<Promise<Branch[]>>();
  expectTypeOf(client.servicePackages.list).returns.toEqualTypeOf<
    Promise<ServicePackageWithInclusions[]>
  >();
  expectTypeOf(client.addonServices.list).returns.toEqualTypeOf<Promise<AddonService[]>>();
});
