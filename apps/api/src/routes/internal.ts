import { resetEmailSendSchema } from '@sevendays/types';
import { Hono } from 'hono';
import type { RootEnv } from '../observability/logger.js';
import { sendResetEmail } from '../services/reset-email.js';
import { validatedJson } from '../services/validator.js';

// The internal Worker-to-Worker surface (M7 #221, ADR-0021): mounted at the
// app root OUTSIDE /api/v1 — no versioned public contract, no db
// acquisition (the send path never touches Postgres), the shared-secret
// guard inside the handler. The root requestLogging + onError cover it like
// every other route.
export const internalRoutes = new Hono<RootEnv>().post(
  '/reset-email',
  validatedJson(resetEmailSendSchema),
  (c) => sendResetEmail(c, c.req.valid('json'))
);
