import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { createAppointment, listAppointments } from '../services/appointments.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest } from '../services/errors.js';
import { validated } from '../services/validator.js';

export const appointments = new Hono<ApiEnv>();

appointments.get(
  '/',
  validated(z.object({ branchId: z.uuid().optional() }), 'query'),
  async (c) => {
    const { branchId } = c.req.valid('query');
    const db = c.get('db');
    const rows = await listAppointments(db, { branchId });
    return c.json(rows);
  }
);

appointments.post('/', validated(createAppointmentSchema, 'json'), async (c) => {
  const input = c.req.valid('json');
  const db = c.get('db');
  const result = await createAppointment(db, input);
  if (!result.ok) {
    return badRequest(c, result.message);
  }
  return c.json(result.record, 201);
});
