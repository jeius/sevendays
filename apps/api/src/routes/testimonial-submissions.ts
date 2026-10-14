import {
  createTestimonialSubmissionSchema,
  TESTIMONIAL_SUBMISSION_ACCEPTED,
} from '@sevendays/types';
import { Hono } from 'hono';
import type { ApiEnv } from '../services/db.js';
import { tooManyRequests } from '../services/errors.js';
import { createTestimonialSubmission } from '../services/testimonial-submissions.js';
import { validatedJson } from '../services/validator.js';

// The public testimonial submission POST (M7 #216 — the only public
// write surface). Abuse posture, in gate order:
// 1. the Workers Rate Limiting binding (its FIRST user — wrangler.toml
//    [[ratelimits]] RATE_LIMITER, 5 per 60s): every attempt consumes,
//    BEFORE validation, so junk pays too. The key is per-IP: the edge's
//    CF-Connecting-IP for direct callers (unspoofable — it wins even when
//    X-Client-IP is also set); X-Client-IP when the request rides the
//    landing's service binding (ADR-0016 — the edge header is absent
//    there; the landing's server fn sets it from ITS own edge header, a
//    header the browser cannot set on this path); 'unknown' in dev.
// 2. the honeypot: a filled 'website' field silently discards with the
//    SAME 201 body — success-shaped, indistinguishable by construction.
// 3. the length bounds (quote 20–600, person 2–80) — the schema's 400s.
// The answer is ALWAYS generic: the fixed message, no row echo.
// Chained registration (ADR-0006 Hono RPC) — see routes/branches.ts.
const rateLimitSubmissions = async (
  c: import('hono').Context<ApiEnv>,
  next: () => Promise<void>
) => {
  const key = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Client-IP') ?? 'unknown';
  const outcome = await c.env.RATE_LIMITER.limit({ key });
  if (!outcome.success) {
    return tooManyRequests(c, "You're sending too fast — please wait a minute and try again.");
  }
  await next();
};

export const testimonialSubmissionsRoutes = new Hono<ApiEnv>().post(
  '/',
  rateLimitSubmissions,
  validatedJson(createTestimonialSubmissionSchema),
  async (c) => {
    const input = c.req.valid('json');
    // The silent discard: a filled honeypot answers the success shape and
    // never reaches the database.
    if (input.website) {
      return c.json(TESTIMONIAL_SUBMISSION_ACCEPTED, 201);
    }
    await createTestimonialSubmission(c.get('db'), {
      quote: input.quote,
      person: input.person,
    });
    return c.json(TESTIMONIAL_SUBMISSION_ACCEPTED, 201);
  }
);
