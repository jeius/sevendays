import { Hono } from 'hono';
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
  c.set('db', createApiDb(c.env.DATABASE_URL));
  await next();
};

export const v1 = new Hono<ApiEnv>();
v1.use('*', acquireDb);
v1.route('/branches', branches);
v1.route('/appointments', appointments);
v1.route('/service-packages', servicePackages);
v1.route('/addon-services', addonServices);
