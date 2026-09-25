import { Hono } from 'hono';
import { requireSession } from '../services/auth.js';
import type { ApiEnv } from '../services/db.js';
import { adminBranches } from './admin-branches.js';
import { adminMedia } from './admin-media.js';
import { adminPrintSizes } from './admin-print-sizes.js';
import { galleryPhotos } from './gallery-photos.js';

// The gated admin sub-app (M5 § Route topology): ONE requireSession at this
// root, so the uniform 401 envelope precedes every child route's validation
// (the M4 ordering precedent). #136 seeded the root with the media routes;
// #137 extends this same sub-app with the entity routers — no re-mount, no
// second gate. Chained registration (ADR-0006 Hono RPC): see
// routes/branches.ts — a statement-style registration would silently drop
// the subtree from AppType.
export const admin = new Hono<ApiEnv>()
  .use('*', requireSession)
  .route('/media', adminMedia)
  .route('/branches', adminBranches)
  .route('/print-sizes', adminPrintSizes)
  .route('/gallery-photos', galleryPhotos);
