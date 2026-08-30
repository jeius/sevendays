import { zValidator } from '@hono/zod-validator';
import { createAppointmentSchema } from '@sevendays/types';
import { Hono } from 'hono';

// STUB: validates input and echoes it back; does not persist yet.
// Replace with @sevendays/db writes + Resend confirmation email once the DB
// and Resend API key are provisioned.
export const appointments = new Hono<{ Bindings: Env }>();

appointments.post('/', zValidator('json', createAppointmentSchema), (c) => {
  const input = c.req.valid('json');
  return c.json(
    {
      id: crypto.randomUUID(),
      status: 'pending',
      ...input,
    },
    201
  );
});
