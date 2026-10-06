import { createBranchSchema, updateBranchSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { logAdminMutation } from '../observability/events.js';
import {
  createAdminBranch,
  getAdminBranch,
  listAdminBranches,
  updateAdminBranch,
} from '../services/admin-entities.js';
import { auditActor } from '../services/audit.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts. Mounted
// behind routes/admin.ts's ONE requireSession: the uniform 401 envelope
// precedes every validator here (per-family proof: test/admin-entities.test.ts).
// validatedParam runs before validatedJson — path before body; both answer
// the uniform { error, details } 400. One admin_mutation event per committed
// write (M6 #183) — emitted only after result.ok, so 400/401 paths stay
// silent.
export const adminBranches = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminBranches(c.get('db')));
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminBranch(c.get('db'), id);
    if (!row) {
      return notFound(c, 'Branch not found.');
    }
    return c.json(row);
  })
  .post('/', validatedJson(createBranchSchema), async (c) => {
    const result = await createAdminBranch(c.get('db'), auditActor(c), c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'branch', entityId: result.row.id });
    return c.json(result.row, 201);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateBranchSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminBranch(c.get('db'), auditActor(c), id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Branch not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      logAdminMutation(c, { entity: 'branch', entityId: result.row.id });
      return c.json(result.row);
    }
  );
