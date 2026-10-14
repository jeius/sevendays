import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { getSiteSettings } from '../services/site-settings.js';

// Public site-settings read (no session — M7 #215, the spec's read-chain
// ruling): the singleton wire, born-empty until the first save. Raw logo
// keys never leave. Chained registration (ADR-0006 Hono RPC) — see
// routes/branches.ts.
export const siteSettingsRoutes = new Hono<ApiEnv>().get('/', async (c) => {
  return c.json(await getSiteSettings(c.get('db'), c.env));
});
