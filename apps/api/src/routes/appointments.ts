import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env.js';
import { createAppointment, listAppointments } from '../services/appointments.js';
import { createApiDb } from '../services/db.js';
import { badRequest, internalError } from '../services/errors.js';
import { validated } from '../services/validator.js';

export const appointments = new Hono<{ Bindings: Env }>();

appointments.get(
  '/',
  validated(z.object({ branchId: z.uuid().optional() }), 'query'),
  async (c) => {
    const { branchId } = c.req.valid('query');
    try {
      const db = createApiDb(c.env.DATABASE_URL);
      const rows = await listAppointments(db, { branchId });
      return c.json(rows);
    } catch {
      return internalError(c);
    }
  }
);

appointments.post('/', validated(createAppointmentSchema, 'json'), async (c) => {
  const input = c.req.valid('json');
  try {
    const db = createApiDb(c.env.DATABASE_URL);
    const result = await createAppointment(db, input);
    if (!result.ok) {
      return badRequest(c, result.message);
    }
    return c.json(result.record, 201);
  } catch {
    return internalError(c);
  }
});
