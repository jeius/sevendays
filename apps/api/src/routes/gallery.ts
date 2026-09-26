import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { getPublicGallery } from '../services/gallery.js';

// Public gallery read (no session — #138): the assembled { categories,
// photos } payload; the CMS-born-empty tables answer empty arrays (AR7).
// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const gallery = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await getPublicGallery(db, c.env));
});
