import { Hono } from 'hono';
import type { Env } from '../env.js';
import { listBranches } from '../services/branches.js';
import { createApiDb } from '../services/db.js';
import { internalError } from '../services/errors.js';

export const branches = new Hono<{ Bindings: Env }>();

branches.get('/', async (c) => {
  const db = createApiDb(c.env.DATABASE_URL as string);
  try {
    return c.json(await listBranches(db));
  } catch {
    return internalError(c);
  }
});
