import {
  createStudioServiceSchema,
  studioServiceAddonMatrixSchema,
  studioServiceBranchMatrixSchema,
  updateStudioServiceSchema,
} from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminStudioService,
  getAdminStudioService,
  listAdminStudioServices,
  setStudioServiceAddonMatrix,
  setStudioServiceBranchMatrix,
  updateAdminStudioService,
} from '../services/admin-entities.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. The two
// matrix PUTs ride the same gate (routes/admin.ts's ONE requireSession); each
// answers the refreshed canonical read, so the editor state round-trips.
export const adminStudioServices = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminStudioServices(c.get('db')));
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminStudioService(c.get('db'), id);
    if (!row) {
      return notFound(c, 'Studio Service not found.');
    }
    return c.json(row);
  })
  .post('/', validatedJson(createStudioServiceSchema), async (c) => {
    const result = await createAdminStudioService(c.get('db'), c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateStudioServiceSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminStudioService(c.get('db'), id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Studio Service not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  )
  .put(
    '/:id/branches',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(studioServiceBranchMatrixSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { branchIds } = c.req.valid('json');
      const result = await setStudioServiceBranchMatrix(c.get('db'), id, branchIds);
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Studio Service not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  )
  .put(
    '/:id/addons',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(studioServiceAddonMatrixSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { addonServiceIds } = c.req.valid('json');
      const result = await setStudioServiceAddonMatrix(c.get('db'), id, addonServiceIds);
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Studio Service not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
