import type { GalleryRead } from '@sevendays/types';
import { galleryReadSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Gallery wrappers: GET /api/v1/gallery (the assembled public read). */
export function galleryRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/gallery — active categories + active categorized photos, position-ordered. */
    async list(): Promise<GalleryRead> {
      const res = await raw.api.v1.gallery.$get();
      return unwrap(res, galleryReadSchema);
    },
  };
}
