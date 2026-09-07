import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { listActiveStudioServicesWithBranches } from '../services/studio-services.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const studioServices = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActiveStudioServicesWithBranches(db));
});
