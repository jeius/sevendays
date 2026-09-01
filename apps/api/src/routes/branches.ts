import { Hono } from 'hono';
import type { Env } from '../env.js';
import { listBranches } from '../services/branches.js';
import { createApiDb } from '../services/db.js';
import { internalError } from '../services/errors.js';

export const branches = new Hono<{ Bindings: Env }>();

branches.get('/', async (c) => {
  try {
    // Acquisition is inside the try: a missing DATABASE_URL must fail into
    // the uniform error shape (500 { error }), never Hono's plain-text
    // default handler (M1.4 review ruling, Task 3).
    const db = createApiDb(c.env.DATABASE_URL);
    return c.json(await listBranches(db));
  } catch {
    return internalError(c);
  }
});
