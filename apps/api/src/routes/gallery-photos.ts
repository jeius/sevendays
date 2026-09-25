import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../services/db.js';
import { notFound } from '../services/errors.js';
import { servePhotoThumbnail } from '../services/media.js';
import { validatedParam } from '../services/validator.js';

// Ticket #136 seeds this router with the by-id thumbnail route only
// (keys stay server-side — the research's by-key sketch refined to by-id).
// #137's write model adds the entity CRUD here. z.uuid() is load-bearing
// (the appointments precedent): an unvalidated non-uuid would reach the uuid
// column and PG would reject it as 22P02 → an unhandled 500.
export const galleryPhotos = new Hono<ApiEnv>().get(
  '/:id/thumb',
  validatedParam(z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid('param');
    const db = c.get('db');
    const response = await servePhotoThumbnail(db, c.env, id);
    if (!response) {
      return notFound(c, 'Photo not found.');
    }
    return response;
  }
);
