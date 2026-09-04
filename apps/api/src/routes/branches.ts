import { Hono } from 'hono';
import { listBranches } from '../services/branches.js';
import type { ApiEnv } from '../services/db.js';

export const branches = new Hono<ApiEnv>();

branches.get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listBranches(db));
});
