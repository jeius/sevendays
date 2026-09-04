import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { listActivePackagesWithInclusions } from '../services/service-packages.js';

export const servicePackages = new Hono<ApiEnv>();

servicePackages.get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActivePackagesWithInclusions(db));
});
