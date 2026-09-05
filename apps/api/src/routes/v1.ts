import { Hono } from 'hono';
import { parseEnv } from '../env.js';
import { type ApiEnv, createApiDb } from '../services/db.js';
import { addonServices } from './addon-services.js';
import { appointments } from './appointments.js';
import { branches } from './branches.js';
import { servicePackages } from './service-packages.js';

// Acquisition middleware (candidate D): runs for every /api/v1 request,
// creates the per-request db handle and stores it in context. A missing
// DATABASE_URL throws here and is caught by the root onError as the uniform
// 500 JSON — the acquisition-inside-the-try ruling, now structural instead
// of a per-route comment. MUST be registered before the route mounts so it
// composes with every handler.
export const acquireDb = async (c: import('hono').Context<ApiEnv>, next: () => Promise<void>) => {
  c.set('db', createApiDb(parseEnv(c.env).DATABASE_URL));
  await next();
};

// Chained registration (ADR-0006 Hono RPC): each .route() return value feeds
// the next — the sub-tree lands in v1's schema only through the chain.
export const v1 = new Hono<ApiEnv>()
  .use('*', acquireDb)
  .route('/branches', branches)
  .route('/appointments', appointments)
  .route('/service-packages', servicePackages)
  .route('/addon-services', addonServices);
