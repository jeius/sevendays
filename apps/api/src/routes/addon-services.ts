import { Hono } from 'hono';
import { listActiveAddonServices } from '../services/addon-services.js';
import type { ApiEnv } from '../services/db.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const addonServices = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActiveAddonServices(db));
});
