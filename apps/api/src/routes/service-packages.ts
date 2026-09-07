import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { notFound } from '../services/errors.js';
import {
  getActivePackageWithInclusionsBySlug,
  listActivePackagesWithInclusions,
} from '../services/service-packages.js';

// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
export const servicePackages = new Hono<ApiEnv>()
  .get('/', async (c) => {
    const db = c.get('db');
    return c.json(await listActivePackagesWithInclusions(db));
  })
  // No param schema (Global Constraints): slug is an opaque text key — an
  // unknown slug is a plain service-level 404, and validating would add a
  // second error path for no benefit. The :id/:slug asymmetry is deliberate.
  .get('/:slug', async (c) => {
    const db = c.get('db');
    const pkg = await getActivePackageWithInclusionsBySlug(db, c.req.param('slug'));
    if (!pkg) {
      return notFound(c, 'Package not found.');
    }
    return c.json(pkg);
  });
