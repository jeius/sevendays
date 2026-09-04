import { expectTypeOf, it } from 'vitest';
import type { AppType } from './index.js';

// Type-level only: proves AppType exists and is the Hono app type the RPC
// client will consume. A route change in index.ts changes this type.
it('AppType is exported and resolvable', () => {
  expectTypeOf<AppType>().not.toBeNever();
  expectTypeOf<AppType>().not.toBeUnknown();
  expectTypeOf<AppType>().not.toBeAny();
});
