import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { createAppointment, listAppointments } from '../services/appointments.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest } from '../services/errors.js';
import { validatedJson, validatedQuery } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const appointments = new Hono<ApiEnv>()
  .get('/', validatedQuery(z.object({ branchId: z.uuid().optional() })), async (c) => {
    const { branchId } = c.req.valid('query');
    const db = c.get('db');
    const rows = await listAppointments(db, { branchId });
    return c.json(rows);
  })
  .post('/', validatedJson(createAppointmentSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const result = await createAppointment(db, input);
    if (!result.ok) {
      return badRequest(c, result.message);
    }
    return c.json(result.record, 201);
  });
