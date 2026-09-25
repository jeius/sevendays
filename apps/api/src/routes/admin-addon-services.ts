import { createAddonServiceSchema, updateAddonServiceSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminAddonService,
  getAdminAddonService,
  listAdminAddonServices,
  updateAdminAddonService,
} from '../services/admin-entities.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. Mounted
// behind routes/admin.ts's ONE requireSession: the uniform 401 envelope
// precedes every validator here (per-family proof: test/admin-entities.test.ts).
// validatedParam runs before validatedJson — path before body; both answer
// the uniform { error, details } 400.
export const adminAddonServices = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminAddonServices(c.get('db')));
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminAddonService(c.get('db'), id);
    if (!row) {
      return notFound(c, 'Add-on Service not found.');
    }
    return c.json(row);
  })
  .post('/', validatedJson(createAddonServiceSchema), async (c) => {
    const result = await createAdminAddonService(c.get('db'), c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateAddonServiceSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminAddonService(c.get('db'), id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Add-on Service not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
