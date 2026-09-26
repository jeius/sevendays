import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { listActiveTestimonials } from '../services/testimonials.js';

// Public testimonials read (no session — #138): active rows in position
// order; zero rows answer []. Chained registration (ADR-0006 Hono RPC) —
// see routes/branches.ts.
export const testimonials = new Hono<ApiEnv>().get('/', async (c) => {
  const db = c.get('db');
  return c.json(await listActiveTestimonials(db));
});
