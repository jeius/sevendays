import { Hono } from 'hono';
import type { Env } from '../env.js';
import { listActiveAddonServices } from '../services/addon-services.js';
import { createApiDb } from '../services/db.js';
import { internalError } from '../services/errors.js';

export const addonServices = new Hono<{ Bindings: Env }>();

addonServices.get('/', async (c) => {
  try {
    const db = createApiDb(c.env.DATABASE_URL);
    return c.json(await listActiveAddonServices(db));
  } catch {
    return internalError(c);
  }
});
