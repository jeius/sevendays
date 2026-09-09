import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAppointment,
  getAppointmentWithAddons,
  listAppointments,
} from '../services/appointments.js';
import { scheduleConfirmationEmail } from '../services/confirmation-email.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { validatedJson, validatedParam, validatedQuery } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const appointments = new Hono<ApiEnv>()
  .get('/', validatedQuery(z.object({ branchId: z.uuid().optional() })), async (c) => {
    const { branchId } = c.req.valid('query');
    const db = c.get('db');
    const rows = await listAppointments(db, { branchId });
    return c.json(rows);
  })
  .get(
    '/:id',
    // z.uuid() is load-bearing (Global Constraints): an unvalidated non-uuid
    // would reach the uuid column and PG would reject it as 22P02 → an
    // unhandled 500. The validator turns that class into the uniform 400.
    validatedParam(z.object({ id: z.uuid() })),
    async (c) => {
      const { id } = c.req.valid('param');
      const db = c.get('db');
      const record = await getAppointmentWithAddons(db, id);
      if (!record) {
        return notFound(c, 'Appointment not found.');
      }
      return c.json(record);
    }
  )
  .post('/', validatedJson(createAppointmentSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const result = await createAppointment(db, input);
    if (!result.ok) {
      return badRequest(c, result.message);
    }
    // Fire-and-forget (issue #47): the booking is committed; the email is
    // scheduled past the response — its failure never fails the booking.
    scheduleConfirmationEmail(c.executionCtx, c.env, db, result.record);
    return c.json(result.record, 201);
  });
