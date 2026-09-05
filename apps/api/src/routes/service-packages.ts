import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { listActivePackagesWithInclusions } from '../services/service-packages.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const servicePackages = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActivePackagesWithInclusions(db));
});
