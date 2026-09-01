import { Hono } from 'hono';
import type { Env } from '../env.js';
import { createApiDb } from '../services/db.js';
import { internalError } from '../services/errors.js';
import { listActivePackagesWithInclusions } from '../services/service-packages.js';

export const servicePackages = new Hono<{ Bindings: Env }>();

servicePackages.get('/', async (c) => {
  try {
    // Acquisition is inside the try: a missing DATABASE_URL must fail into
    // the uniform error shape (500 { error }), never Hono's plain-text
    // default handler (M1.4 review ruling, Task 3).
    const db = createApiDb(c.env.DATABASE_URL);
    return c.json(await listActivePackagesWithInclusions(db));
  } catch {
    return internalError(c);
  }
});
