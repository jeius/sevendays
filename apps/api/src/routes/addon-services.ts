import { Hono } from 'hono';
import { listActiveAddonServices } from '../services/addon-services.js';
import type { ApiEnv } from '../services/db.js';

export const addonServices = new Hono<ApiEnv>();

addonServices.get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActiveAddonServices(db));
});
