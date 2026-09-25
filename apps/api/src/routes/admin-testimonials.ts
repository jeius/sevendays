import {
  createTestimonialSchema,
  testimonialOrderSchema,
  updateTestimonialSchema,
} from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminTestimonial,
  getAdminTestimonial,
  listAdminTestimonials,
  setTestimonialOrder,
  updateAdminTestimonial,
} from '../services/admin-gallery.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. PUT
// /order is registered BEFORE /:id — static before param, so the order PUT
// can never be captured by the uuid-validated /:id route (an 'order' id
// would otherwise die in validatedParam as a 400).
export const adminTestimonials = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminTestimonials(c.get('db')));
  })
  .post('/', validatedJson(createTestimonialSchema), async (c) => {
    const result = await createAdminTestimonial(c.get('db'), c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put('/order', validatedJson(testimonialOrderSchema), async (c) => {
    const { testimonialIds } = c.req.valid('json');
    const result = await setTestimonialOrder(c.get('db'), testimonialIds);
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row);
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminTestimonial(c.get('db'), id);
    if (!row) {
      return notFound(c, 'Testimonial not found.');
    }
    return c.json(row);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateTestimonialSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminTestimonial(c.get('db'), id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Testimonial not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
