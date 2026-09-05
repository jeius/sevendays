import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';

// Uniform-error validator hooks (Q4): Zod failures emit { error, details }
// with per-field details, not zValidator's default shape.
//
// Two functions, not one target-parameterized helper: zValidator's Target must
// be an exact literal for Hono RPC input inference. The old union signature
// (`validated(schema, 'json' | 'query')`) typed every endpoint's RPC input as
// { json: ..., query: ... } regardless of target — verified pre-plan
// (2026-09-04). The hook body is duplicated: zValidator's Hook generic cannot
// be referenced as a standalone typed const without losing inference.
export const validatedJson = <S extends ZodSchema>(schema: S) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid request payload.',
          details: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        400
      );
    }
  });

export const validatedQuery = <S extends ZodSchema>(schema: S) =>
  zValidator('query', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid request payload.',
          details: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        400
      );
    }
  });
