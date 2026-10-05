import { mediaPresignRequestSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { logMediaFailure } from '../observability/events.js';
import type { ApiEnv } from '../services/db.js';
import { MissingR2CredentialsError, presignUpload } from '../services/media.js';
import { validatedJson } from '../services/validator.js';

// POST /presign (M5 #136, ADR-0019): purpose + contentType in → a server-
// assigned staging key + a type-enforced upload URL out. Size is not
// declarable (the schema has no such field); the commit is the size gate.
// Failure map: validator 400 (unsupported type, with field details) |
// MissingR2CredentialsError → the curated 503 via the root onError (#155:
// leak-safe detail channel — the loud message stays in the error event).
// Mounted behind the admin root's requireSession — see routes/admin.ts.
// M6 #183: presign FAILURES log a media_failure event (successful presigns
// stay quiet — the highest-frequency admin call); the throw still rides to
// onError for the curated 503 + the error event.
export const adminMedia = new Hono<ApiEnv>().post(
  '/presign',
  validatedJson(mediaPresignRequestSchema),
  async (c) => {
    try {
      return c.json(await presignUpload(c.env, c.req.valid('json')));
    } catch (error) {
      if (error instanceof MissingR2CredentialsError) {
        logMediaFailure(c.get('logger'), { op: 'presign', reason: 'missing_credentials' });
      }
      throw error;
    }
  }
);
