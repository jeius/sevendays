import type { SiteSettings } from '@sevendays/types';
import { siteSettingsSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Site-settings wrappers: GET /api/v1/site-settings (the public singleton read, M7 #215). */
export function siteSettingsRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/site-settings — the singleton wire, born-empty until the first save; logoImageUrl resolved, raw keys never present. */
    async get(): Promise<SiteSettings> {
      const res = await raw.api.v1['site-settings'].$get();
      return unwrap(res, siteSettingsSchema);
    },
  };
}
