import { Hono } from 'hono';
import { listBranches } from '../services/branches.js';
import type { ApiEnv } from '../services/db.js';

// Chained registration (ADR-0006 Hono RPC): the route lives in this app's
// type schema only because the expression is chained. Every registration in
// the /api/v1 tree must stay chained — a statement-style registration here
// silently drops the route from AppType and breaks the client package (its
// drift-kill suite is the regression guard).
export const branches = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listBranches(db));
});
