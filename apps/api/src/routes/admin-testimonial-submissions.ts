import { acceptTestimonialSubmissionSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { logAdminMutation } from '../observability/events.js';
import { auditActor } from '../services/audit.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import {
  acceptTestimonialSubmission,
  deleteTestimonialSubmission,
  listAdminTestimonialSubmissions,
  rejectTestimonialSubmission,
} from '../services/testimonial-submissions.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// The moderation endpoints (M7 #216) behind the admin root's ONE
// requireSession (401 structurally precedes every validator here) —
// action endpoints per the media presign/commit precedent: list;
// accept-with-edit (optionally edited {quote, person}; the Testimonial
// appends at the end of render order); reject (retains the row); delete
// regardless of status. No notifications — the queue IS the notification
// (the Submissions tab renders it at M7 #218). The reject route carries
// no body validator: there is nothing to validate.
const idParam = validatedParam(z.object({ id: z.uuid() }));

export const adminTestimonialSubmissions = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminTestimonialSubmissions(c.get('db')));
  })
  .post('/:id/accept', idParam, validatedJson(acceptTestimonialSubmissionSchema), async (c) => {
    const { id } = c.req.valid('param');
    const result = await acceptTestimonialSubmission(
      c.get('db'),
      auditActor(c),
      id,
      c.req.valid('json')
    );
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return notFound(c, 'Testimonial submission not found.');
      }
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'testimonial-submission', entityId: id });
    return c.json(result.row);
  })
  .post('/:id/reject', idParam, async (c) => {
    const { id } = c.req.valid('param');
    const result = await rejectTestimonialSubmission(c.get('db'), auditActor(c), id);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return notFound(c, 'Testimonial submission not found.');
      }
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'testimonial-submission', entityId: id });
    return c.json(result.row);
  })
  .delete('/:id', idParam, async (c) => {
    const { id } = c.req.valid('param');
    const result = await deleteTestimonialSubmission(c.get('db'), auditActor(c), id);
    if (!result.ok) {
      return notFound(c, 'Testimonial submission not found.');
    }
    logAdminMutation(c, { entity: 'testimonial-submission', entityId: id });
    return c.body(null, 204);
  });
