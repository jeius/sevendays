import type { TestimonialSubmissionAccepted } from '@sevendays/types';
import { testimonialSubmissionAcceptedSchema } from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

type CreateEndpoint = RpcClient['api']['v1']['testimonial-submissions']['$post'];

/** The RPC input as the route declares it (the honeypot rides optionally). */
export type CreateTestimonialSubmissionArgs = InferRequestType<CreateEndpoint>['json'];

/** Testimonial-submission wrappers: POST /api/v1/testimonial-submissions (the public write, M7 #216). */
export function testimonialSubmissionsRoutes(raw: RpcClient) {
  return {
    /** POST /api/v1/testimonial-submissions — 201 with the generic body (no row echo); 429 rejects with ApiClientError — the ruled line rides `details.error` (the `message` is prefixed `API <status>:`). */
    async create(json: CreateTestimonialSubmissionArgs): Promise<TestimonialSubmissionAccepted> {
      const res = await raw.api.v1['testimonial-submissions'].$post({ json });
      return unwrap(res, testimonialSubmissionAcceptedSchema);
    },
  };
}
