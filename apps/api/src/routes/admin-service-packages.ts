import { createServicePackageSchema, updateServicePackageSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminPackage,
  getAdminPackage,
  listAdminPackages,
  updateAdminPackage,
} from '../services/admin-packages.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. The
// atomic save rides the gate (routes/admin.ts's ONE requireSession); POST
// generates the slug, PUT accepts the advanced slug field. Both return the
// canonical servicePackageRead shape (coverImageUrl resolved, no raw key).
export const adminServicePackages = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminPackages(c.get('db'), c.env));
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const read = await getAdminPackage(c.get('db'), c.env, id);
    if (!read) {
      return notFound(c, 'Package not found.');
    }
    return c.json(read);
  })
  .post('/', validatedJson(createServicePackageSchema), async (c) => {
    const result = await createAdminPackage(c.get('db'), c.env, c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateServicePackageSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminPackage(c.get('db'), c.env, id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Package not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
