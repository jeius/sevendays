import type { PublicTestimonial } from '@sevendays/types';
import { publicTestimonialSchema } from '@sevendays/types';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

/** Testimonial wrappers: GET /api/v1/testimonials (the public read). */
export function testimonialsRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/testimonials — active testimonials in position order. */
    async list(): Promise<PublicTestimonial[]> {
      const res = await raw.api.v1.testimonials.$get();
      return unwrap(res, publicTestimonialSchema.array());
    },
  };
}
