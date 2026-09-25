import {
  createGalleryPhotoSchema,
  galleryPhotoOrderSchema,
  updateGalleryPhotoSchema,
} from '@sevendays/types';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAdminGalleryPhoto,
  getAdminGalleryPhoto,
  listAdminGalleryPhotos,
  setGalleryPhotoOrder,
  updateAdminGalleryPhoto,
} from '../services/admin-gallery.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest, notFound } from '../services/errors.js';
import { servePhotoThumbnail } from '../services/media.js';
import { validatedJson, validatedParam } from '../services/validator.js';

// #136 seeded this router with the by-id thumbnail route only (keys stay
// server-side — the research's by-key sketch refined to by-id). #137's write
// model completes it: GET / (all rows incl. deactivated, photoUrl resolved),
// POST / (the staging key is commit-verified and promoted at persist), PUT
// /order, GET /:id, PUT /:id. Static paths are registered BEFORE /:id so the
// order PUT can never be captured by the uuid-validated /:id route (an
// 'order' id would otherwise die in validatedParam as a 400).
export const galleryPhotos = new Hono<ApiEnv>()
  .get('/', async (c) => {
    return c.json(await listAdminGalleryPhotos(c.get('db'), c.env));
  })
  .post('/', validatedJson(createGalleryPhotoSchema), async (c) => {
    const result = await createAdminGalleryPhoto(c.get('db'), c.env, c.req.valid('json'));
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row, 201);
  })
  .put('/order', validatedJson(galleryPhotoOrderSchema), async (c) => {
    const { photoIds } = c.req.valid('json');
    const result = await setGalleryPhotoOrder(c.get('db'), c.env, photoIds);
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    return c.json(result.row);
  })
  .get('/:id/thumb', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const db = c.get('db');
    const response = await servePhotoThumbnail(db, c.env, id);
    if (!response) {
      return notFound(c, 'Photo not found.');
    }
    return response;
  })
  .get('/:id', validatedParam(z.object({ id: z.uuid() })), async (c) => {
    const { id } = c.req.valid('param');
    const row = await getAdminGalleryPhoto(c.get('db'), c.env, id);
    if (!row) {
      return notFound(c, 'Photo not found.');
    }
    return c.json(row);
  })
  .put(
    '/:id',
    validatedParam(z.object({ id: z.uuid() })),
    validatedJson(updateGalleryPhotoSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await updateAdminGalleryPhoto(c.get('db'), c.env, id, c.req.valid('json'));
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return notFound(c, 'Photo not found.');
        }
        return badRequest(c, result.message, result.details);
      }
      return c.json(result.row);
    }
  );
