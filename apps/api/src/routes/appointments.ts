import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';
import type { Env } from '../env.js';
import type { CreateAppointmentResult } from '../services/appointments.js';
import { createAppointment } from '../services/appointments.js';
import { createApiDb } from '../services/db.js';
import { badRequest, internalError } from '../services/errors.js';
import { validated } from '../services/validator.js';

export const appointments = new Hono<{ Bindings: Env }>();

type CreateReason = Extract<CreateAppointmentResult, { ok: false }>['reason'];

const REASON_MESSAGES: Record<CreateReason, string> = {
  branch: 'Unknown branchId.',
  package: 'Unknown servicePackageId.',
  package_inactive: 'Service Package is inactive.',
  addon: 'Unknown addonServiceId.',
  addon_inactive: 'Add-on Service is inactive.',
};

appointments.post('/', validated(createAppointmentSchema, 'json'), async (c) => {
  const input = c.req.valid('json');
  try {
    const db = createApiDb(c.env.DATABASE_URL);
    const result = await createAppointment(db, input);
    if (!result.ok) {
      return badRequest(c, REASON_MESSAGES[result.reason]);
    }
    return c.json(result.record, 201);
  } catch {
    return internalError(c);
  }
});
